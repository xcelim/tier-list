/**
 * Integración con Supabase y lógica de base de datos
 */
const sbClient = supabase.createClient(SB_URL, SB_KEY);
let userSession = null;
let currentUserProfile = null;
let isProcessingFriendship = false;

// Helpers de Perfil
function getProfile(id){ return S.profiles.find(p => p.id === (id || S.activeProfile)); }
function activeProfile(){ return getProfile(S.activeProfile); }
function getProfileTLs(){ const p = activeProfile(); return p ? p.tls : []; }
function getTLfromProfile(id){ return getProfileTLs().find(t => t.id === id); }
function getCurrentTL(){ return S.cid ? getTLfromProfile(S.cid) : null; }

async function saveProfiles() {
    DB.s('profiles', S.profiles);
    DB.s('activeProfile', S.activeProfile);
}

// Authentication
async function handleGoogleLogin() {
    const { error } = await sbClient.auth.signInWithOAuth({ provider: 'google' });
    if(error) toast("Error al iniciar sesión", "err");
}

async function handleLogout() {
    await sbClient.auth.signOut();
    userSession = null;
    currentUserProfile = null;
    S.activeProfile = null;
    S.profiles = [];
    S.page = 'home';
    saveProfiles();
    render();
}

async function handleDeleteAccount() {
    if(!confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es irreversible.')) return;
    // Esto idealmente requiere un Edge Function en Supabase por seguridad, 
    // pero simulamos el log out por ahora.
    await sbClient.auth.signOut();
    userSession = null;
    S.activeProfile = null;
    S.profiles = [];
    S.page = 'home';
    saveProfiles();
    render();
}

// Sincronización
async function fetchGlobalTemplates() {
    let allTemplates = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data: templates, error } = await sbClient.from('tierlists').select('*').range(from, from + step - 1);
        if (error || !templates || templates.length === 0) break;
        allTemplates = allTemplates.concat(templates);
        if (templates.length < step) break;
        from += step;
    }
    if (!allTemplates.length) return;
    const p = activeProfile();
    if (!p) return;

    const remoteIds = new Set(allTemplates.map(t => t.id));

    allTemplates.forEach(t => {
        if (S._dupInProgress === t.id) return;
        const localIdx = p.tls.findIndex(local => local.id === t.id);
        const tlData = {
            ...t,
            tiers: t.tiers_config,
            isRemoteTemplate: true,
            updatedAt: new Date(t.updated_at || t.created_at).getTime()
        };
        if (localIdx === -1) {
            p.tls.push(tlData);
        } else {
            p.tls[localIdx].title = t.title;
            p.tls[localIdx].tiers = t.tiers_config;
            p.tls[localIdx].folder = t.folder;
            p.tls[localIdx].updatedAt = tlData.updatedAt;
            p.tls[localIdx].isRemoteTemplate = true;
        }
    });

    p.tls = p.tls.filter(tl => {
        if (!tl.isRemoteTemplate && !remoteIds.has(tl.id)) return true;
        return remoteIds.has(tl.id);
    });

    saveProfiles();
    render();
}

async function syncFromSupabase() {
    if (!userSession || !S.cid || !S.workingTL) return;
    
    const { data: tlMeta } = await sbClient.from('tierlists').select('title, folder, tiers_config').eq('id', S.cid).maybeSingle();
    if (tlMeta) {
        S.workingTL.title = tlMeta.title;
        S.workingTL.folder = tlMeta.folder;
        S.workingTL.tiers = tlMeta.tiers_config.map(tc => ({ ...tc, chars: [] }));
    }

    AC = JSON.parse(JSON.stringify(AC_BASE));
    const sharedIds = new Set(Object.keys(AC_BASE));

    let allChars = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await sbClient.from('characters').select('*').eq('tierlist_id', S.cid).range(from, from + step - 1);
        if (error || !data || data.length === 0) break;
        allChars = allChars.concat(data);
        if (data.length < step) break;
        from += step;
    }

    allChars.forEach(c => {
        AC[c.id] = { id: c.id, name: c.name, anime: c.anime, file: c.image_url, isRemote: true };
        sharedIds.add(c.id);
    });

    const { data: myRank } = await sbClient.from('user_rankings').select('*').eq('user_id', userSession.user.id).eq('tierlist_id', S.cid).maybeSingle();
    
    if (S.workingTL) {
        const placedIds = new Set();
        if (myRank) {
            if (myRank.tiers_data && myRank.tiers_data.length > 0 && myRank.tiers_data[0].label) {
                S.workingTL.tiers = myRank.tiers_data;
            } else {
                myRank.tiers_data.forEach(rd => {
                    const t = S.workingTL.tiers.find(x => x.id === rd.id);
                    if (t) t.chars = rd.chars;
                });
            }
            S.workingTL.tiers.forEach(t => (t.chars || []).forEach(id => placedIds.add(id)));
        }

        S.workingTL.pool = Array.from(sharedIds).filter(id => !placedIds.has(id)).reverse();
        render();
    }
}

async function saveProfileChanges() {
    if (!userSession || !S.profileDraft) return;
    toast("Guardando perfil...", "info");
    
    let finalAvatarUrl = S.profileDraft.avatar_url;
  
    if (S.profileDraft._newAvatarBlob) {
        const path = `avatars/${userSession.user.id}_${Date.now()}.png`;
        const oldPath = currentUserProfile.avatar_url ? currentUserProfile.avatar_url.split('/').pop() : null;
        if (oldPath && oldPath.includes('avatars/')) {
            await sbClient.storage.from('tierlists').remove([`avatars/${oldPath}`]);
        }
  
        const { error: upErr } = await sbClient.storage.from('tierlists').upload(path, S.profileDraft._newAvatarBlob);
        if (!upErr) {
            const { data: { publicUrl } } = sbClient.storage.from('tierlists').getPublicUrl(path);
            finalAvatarUrl = publicUrl;
        }
    }
  
    const updates = {
        name: S.profileDraft.name,
        color: S.profileDraft.color,
        avatar_url: finalAvatarUrl
    };
  
    const { error } = await sbClient.from('profiles').update(updates).eq('id', userSession.user.id);
    if (!error) {
        currentUserProfile = { ...currentUserProfile, ...updates };
        const localP = activeProfile();
        if (localP) Object.assign(localP, updates);
        S.profileUnsaved = false;
        S.profileDraft = null;
        saveProfiles(); 
        toast("Perfil actualizado ✓"); 
        render();
    } else {
        toast("Error al guardar: " + error.message, "err");
    }
}

async function fetchAllUsers() {
    if(!userSession) return;
    const { data: users, error } = await sbClient.from('profiles').select('*');
    if(!error && users) {
        const { data: rels } = await sbClient.from('friendships').select('*').or(`user_id.eq.${userSession.user.id},friend_id.eq.${userSession.user.id}`);
        
        S.allUsers = users.map(u => {
            let relStatus = 'none';
            let relId = null;
            if(rels) {
                const rel = rels.find(r => (r.user_id === userSession.user.id && r.friend_id === u.id) || (r.user_id === u.id && r.friend_id === userSession.user.id));
                if(rel) {
                    relId = rel.id;
                    if(rel.status === 'accepted') relStatus = 'accepted';
                    else if(rel.status === 'pending') relStatus = rel.user_id === userSession.user.id ? 'pending_sent' : 'pending_received';
                }
            }
            return { ...u, relStatus, relId };
        });
        render();
    }
}

async function fetchChats() {
    if (!userSession) return;
    const { data, error } = await sbClient.from('chat_members')
        .select('last_read_at, chats(*, chat_members(user_id, profiles(name, avatar_url)))')
        .eq('user_id', userSession.user.id);
    
    if (!error) {
        let globalUnread = 0;
        S.chats = data.map(d => {
            const chat = d.chats;
            const hasUnread = chat.last_message_at && (!d.last_read_at || new Date(chat.last_message_at) > new Date(d.last_read_at));
            if (hasUnread) globalUnread++;
            return { ...chat, has_unread: hasUnread, unread_count: hasUnread ? 1 : 0 };
        });
        S.totalUnread = globalUnread;
        render();
    }
}

async function openChat(chat) {
    if (chat.is_temp) {
        const { data: nc } = await sbClient.from('chats').insert({ is_group: false }).select().single();
        if (nc) {
            const m = [
                { chat_id: nc.id, user_id: userSession.user.id, last_read_at: new Date().toISOString() },
                { chat_id: nc.id, user_id: chat.friend_id }
            ];
            await sbClient.from('chat_members').insert(m);
            await fetchChats();
            const real = S.chats.find(c => c.id === nc.id);
            if (real) return openChat(real);
        }
        return;
    }
  
    S.activeChat = chat;
    S.messages = [];
    render();
    
    const { data, error } = await sbClient.from('messages')
        .select('*, profiles(name)')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });
      
    if (!error) {
        S.messages = data;
        render();
        setTimeout(() => {
            const container = document.querySelector('.chat-messages');
            if(container) container.scrollTop = container.scrollHeight;
        }, 50);
    }
    
    const now = new Date().toISOString();
    const idx = S.chats.findIndex(c => c.id === chat.id);
    if (idx !== -1) S.chats[idx].has_unread = false;
  
    await sbClient.from('chat_members').update({ last_read_at: now }).eq('chat_id', chat.id).eq('user_id', userSession.user.id);
    fetchChats();
  
    sbClient.channel(`chat:${chat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, 
        payload => {
            if (!S.messages.find(m => m.id === payload.new.id)) {
                S.messages.push({ ...payload.new, profiles: { name: currentUserProfile.name } });
                render();
            }
        }).subscribe();
}

async function sendChatMessage(content) {
    if (!content.trim() || !S.activeChat) return;
    const msg = { chat_id: S.activeChat.id, sender_id: userSession.user.id, content: content.trim() };
    const { data: newMsg, error } = await sbClient.from('messages').insert(msg).select().single();
    if (error) toast("Error al enviar", "err");
    else await sbClient.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', S.activeChat.id);
}

async function createGroup(name, friendIds) {
    if (!name || friendIds.length === 0) return;
    const { data: chat, error: cErr } = await sbClient.from('chats').insert({ name, is_group: true }).select().single();
    if (chat) {
        const members = [...friendIds, userSession.user.id].map(uid => ({
            chat_id: chat.id, user_id: uid, last_read_at: new Date().toISOString()
        }));
        await sbClient.from('chat_members').insert(members);
        toast("Grupo creado ✓");
        await fetchChats();
        const newChat = S.chats.find(c => c.id === chat.id);
        if (newChat) openChat(newChat);
        else S.activeChat = chat;
    }
}

async function fetchNotifications() {
    if (!userSession) return;
    try {
        const { data, error } = await sbClient.from('friendships')
            .select('id, user_id, sender:profiles!user_id(name)')
            .eq('friend_id', userSession.user.id)
            .eq('status', 'pending');
        if(error) throw error;
        S.pendingRequests = data || [];
        render();
    } catch(e) { console.error("Error notifs:", e); }
}

async function sendFriendRequest(targetUserId) {
    if(isProcessingFriendship) return;
    const targetUser = S.allUsers.find(u => u.id === targetUserId);
    const name = targetUser ? targetUser.name : 'este usuario';
    if(!confirm(`¿Quieres enviar una solicitud de amistad a ${name}?`)) return;
  
    isProcessingFriendship = true;
    const { error } = await sbClient.from('friendships').insert({ user_id: userSession.user.id, friend_id: targetUserId, status: 'pending' });
    if(!error) { toast('Solicitud enviada ✓'); await fetchAllUsers(); } 
    else toast('No se pudo enviar: ' + error.message, 'err');
    isProcessingFriendship = false;
}

async function respondFriendRequest(requestId, status) {
    if(isProcessingFriendship) return;
    isProcessingFriendship = true;
    try {
        let error;
        if(status === 'accepted') {
            const res = await sbClient.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
            error = res.error;
            if(!error) toast('¡Ahora sois amigos!');
        } else {
            const res = await sbClient.from('friendships').delete().eq('id', requestId);
            error = res.error;
            if(!error) toast('Solicitud rechazada');
        }
        if(error) throw error;
        await fetchNotifications();
        await fetchAllUsers();
    } catch(e) { console.error(e); }
    finally { isProcessingFriendship = false; render(); }
}

async function removeFriend(relId, isCancel = false) {
    if(isProcessingFriendship || !relId) return;
    const msg = isCancel ? '¿Seguro que quieres cancelar la solicitud enviada?' : '¿Seguro que quieres eliminar a este amigo?';
    if(!confirm(msg)) return;
  
    isProcessingFriendship = true;
    const { error } = await sbClient.from('friendships').delete().eq('id', relId);
    if(!error) { 
        toast(isCancel ? 'Solicitud cancelada' : 'Amigo eliminado'); 
        await fetchAllUsers(); 
        await fetchNotifications();
    } else toast('Error: ' + error.message, 'err');
    isProcessingFriendship = false;
    render();
}

async function viewUser(userId) {
    const u = S.allUsers.find(x => x.id === userId);
    if(!u) return;
    S.prevPage = S.page;
    S.viewingUser = { ...u, rankings: [] };
    S.page = 'user-view';
    render();
  
    toast("Cargando rankings de " + u.name + "...", "info");
    const { data, error } = await sbClient.from('user_rankings').select('*, tierlists(title, folder)').eq('user_id', userId);
    if(!error && data) {
        S.viewingUser.rankings = data;
        render();
    }
}