// Guardado de perfiles y tierlists, sincronización con Supabase (plantillas globales,
// chats, grupos, mensajes) y utilidades de red asociadas.

// ============ SAVE ============
async function saveProfiles() {
  DB.s('profiles', S.profiles);
  DB.s('activeProfile', S.activeProfile);
}

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
    // Si dupTL está en curso para este ID, no tocar — lo añadirá él mismo al terminar
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
      // Sincronizar metadatos desde la nube (no sobreescribir pool/customChars locales)
      p.tls[localIdx].title     = t.title;
      p.tls[localIdx].tiers     = t.tiers_config;
      p.tls[localIdx].folder    = t.folder;
      p.tls[localIdx].updatedAt = tlData.updatedAt;
      p.tls[localIdx].isRemoteTemplate = true;
    }
  });

  // 2. Eliminar del local las que ya NO existen en Supabase
  // (alguien las borró desde otra cuenta)
  const before = p.tls.length;
  p.tls = p.tls.filter(tl => {
    // Mantener siempre tierlists que son creación local pura (sin id en Supabase)
    // Una tierlist "local pura" nunca debería existir en este flujo (todas se suben),
    // pero por seguridad: si no tiene isRemoteTemplate Y no está en remoteIds, la dejamos.
    if (!tl.isRemoteTemplate && !remoteIds.has(tl.id)) return true;
    // Si está marcada como remota pero ya no existe en Supabase → eliminar
    return remoteIds.has(tl.id);
  });

  saveProfiles();
  render();
}

async function syncFromSupabase() {
  if (!userSession || !S.cid || !S.workingTL) return;
  
  // 0. Sincronización Universal de Estructura: Refrescar niveles, nombres y colores desde la nube
  const { data: tlMeta } = await sbClient.from('tierlists').select('title, folder, tiers_config').eq('id', S.cid).maybeSingle();
  if (tlMeta) {
    S.workingTL.title = tlMeta.title;
    S.workingTL.folder = tlMeta.folder;
    // Reconstruimos la lista de niveles para que coincida con la nube, inicializando chars vacíos
    S.workingTL.tiers = tlMeta.tiers_config.map(tc => ({ ...tc, chars: [] }));
  }

  // Catálogo dinámico para esta tierlist
  AC = JSON.parse(JSON.stringify(AC_BASE));
  const sharedIds = new Set();
  Object.keys(AC_BASE).forEach(id => sharedIds.add(id));

  // 1. Cargar TODOS los personajes compartidos (Paginado para evitar límite de 1000)
  let allChars = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await sbClient
      .from('characters')
      .select('*')
      .eq('tierlist_id', S.cid)
      .range(from, from + step - 1);
    if (error || !data || data.length === 0) break;
    allChars = allChars.concat(data);
    if (data.length < step) break;
    from += step;
  }

  allChars.forEach(c => {
    AC[c.id] = { id: c.id, name: c.name, anime: c.anime, file: c.image_url, isRemote: true };
    sharedIds.add(c.id);
  });
  // Catálogo base integrado globalmente

  // 3. Cargar el ranking personal del usuario (donde ha puesto cada uno)
  const { data: myRank } = await sbClient.from('user_rankings').select('*').eq('user_id', userSession.user.id).eq('tierlist_id', S.cid).maybeSingle();
  
  if (S.workingTL) {
    const placedIds = new Set();
    if (myRank) {
      // Sincronización Universal: Si el ranking tiene estructura propia (niveles añadidos/renombrados), la usamos
      if (myRank.tiers_data && myRank.tiers_data.length > 0 && myRank.tiers_data[0].label) {
        S.workingTL.tiers = myRank.tiers_data;
      } else {
        // Fallback para rankings antiguos: solo rellenar personajes en niveles existentes
        myRank.tiers_data.forEach(rd => {
          const t = S.workingTL.tiers.find(x => x.id === rd.id);
          if (t) t.chars = rd.chars;
        });
      }
      // Registrar qué personajes ya están ubicados
      S.workingTL.tiers.forEach(t => (t.chars || []).forEach(id => placedIds.add(id)));
    }

    // 4. EL POOL COMPARTIDO DINÁMICO:
    // La pool son todos los personajes conocidos (sharedIds) que el usuario NO ha puesto en un tier (placedIds)
    S.workingTL.pool = Array.from(sharedIds).filter(id => !placedIds.has(id));
    
    // Ordenamos para que los últimos añadidos por la comunidad salgan primero
    S.workingTL.pool.reverse(); 

    render();
  }
}

async function saveProfileChanges() {
  if (!userSession || !S.profileDraft) return;
  toast("Guardando perfil...", "info");
  
  let finalAvatarUrl = S.profileDraft.avatar_url;

  // 1. Si hay una nueva imagen (blob de recorte), subirla y borrar la anterior
  if (S.profileDraft._newAvatarBlob) {
    const path = `avatars/${userSession.user.id}_${Date.now()}.png`;
    
    // Borrar anterior si existía en storage
    const oldPath = extractBucketPath(currentUserProfile.avatar_url);
    if (oldPath && oldPath.includes('avatars/')) {
        await sbClient.storage.from('tierlists').remove([oldPath]);
    }

    const { error: upErr } = await sbClient.storage.from('tierlists').upload(path, S.profileDraft._newAvatarBlob);
    if (!upErr) {
      const { data: { publicUrl } } = sbClient.storage.from('tierlists').getPublicUrl(path);
      finalAvatarUrl = publicUrl;
    }
  }

  // 2. Update de campos en la base de datos
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
    saveProfiles(); toast("Perfil actualizado ✓"); render();
  } else {
    toast("Error al guardar: " + error.message, "err");
  }
}

async function fetchChats() {
  if (!userSession) return;
  // Traemos los chats donde el usuario es miembro, incluyendo la info del chat y de los otros miembros
  const { data, error } = await sbClient.from('chat_members')
    .select('last_read_at, chats(*, chat_members(user_id, profiles(name, avatar_url)))')
    .eq('user_id', userSession.user.id);
  
  if (!error) {
    let globalUnread = 0;
    S.chats = data.map(d => {
      const chat = d.chats;
      // Un chat no está leído si el last_message_at del chat es posterior al last_read_at del miembro
      const hasUnread = chat.last_message_at && (!d.last_read_at || new Date(chat.last_message_at) > new Date(d.last_read_at));
      
      if (hasUnread) globalUnread++;
      
      return {
        ...chat,
        has_unread: hasUnread,
        unread_count: hasUnread ? 1 : 0 // Supabase no da el conteo exacto fácil sin RPC, marcamos como 1 para mostrar el punto
      };
    });
    S.totalUnread = globalUnread;
    render();
  } else {
    console.warn('[chat] fetchChats:', error.message);
  }
}

async function openChat(chat) {
  if (chat.is_temp) {
    // Crear el chat real en la base de datos al primer contacto
    const { data: nc, error: chatErr } = await sbClient.from('chats').insert({ is_group: false }).select().single();
    if (chatErr || !nc) { toast("No se pudo abrir el chat: " + (chatErr?.message || 'error desconocido'), "err"); return; }
    const m = [
      { chat_id: nc.id, user_id: userSession.user.id, last_read_at: new Date().toISOString() },
      { chat_id: nc.id, user_id: chat.friend_id }
    ];
    const { error: memErr } = await sbClient.from('chat_members').insert(m);
    if (memErr) { toast("No se pudo abrir el chat: " + memErr.message, "err"); return; }
    await fetchChats();
    const real = S.chats.find(c => c.id === nc.id);
    if (real) return openChat(real);
    toast("El chat se creó pero no se pudo abrir, inténtalo de nuevo", "err");
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
    const container = document.querySelector('.chat-messages');
    if(container) setTimeout(() => container.scrollTop = container.scrollHeight, 50);
  }
  
  // Marcar como leído en la base de datos
  const now = new Date().toISOString();
  const idx = S.chats.findIndex(c => c.id === chat.id);
  if (idx !== -1) S.chats[idx].has_unread = false;

  await sbClient.from('chat_members')
    .update({ last_read_at: now })
    .eq('chat_id', chat.id)
    .eq('user_id', userSession.user.id);
  fetchChats(); // Refrescar para actualizar el badge de no leídos

  // Suscribirse a nuevos mensajes en tiempo real
  sbClient.channel(`chat:${chat.id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, 
    payload => {
      if (!S.messages.find(m => m.id === payload.new.id)) {
        S.messages.push({ ...payload.new, profiles: { name: currentUserProfile.name } }); // Asumimos que el perfil del sender es el nuestro
        render();
      }
    }).subscribe();
}

async function sendChatMessage(content) {
  if (!content.trim() || !S.activeChat) return;
  const msg = {
    chat_id: S.activeChat.id,
    sender_id: userSession.user.id,
    content: content.trim()
  };
  const { data: newMsg, error } = await sbClient.from('messages').insert(msg).select().single();
  if (error) { toast("Error al enviar: " + (error.message || 'inténtalo de nuevo'), "err"); return; }

  // FIX: antes esto dependía 100% de que Realtime estuviera activado en
  // Supabase para que el mensaje apareciera en pantalla (si no lo estaba,
  // el mensaje se guardaba en la base de datos pero el chat se quedaba
  // "mudo" — parecía que no funcionaba). Ahora lo añadimos aquí mismo,
  // al instante, sin depender de nada más.
  if (!S.messages.find(m => m.id === newMsg.id)) {
    S.messages.push({ ...newMsg, profiles: { name: currentUserProfile?.name || 'Tú' } });
    render();
    const container = document.querySelector('.chat-messages');
    if (container) setTimeout(() => container.scrollTop = container.scrollHeight, 30);
  }

  // Actualizar last_message_at en el chat (para ordenar/mostrar hora, no crítico)
  await sbClient.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', S.activeChat.id);
}

async function createGroup(name, friendIds) {
  if (!name || friendIds.length === 0) return;

  const { data: chat, error: cErr } = await sbClient.from('chats')
    .insert({ name, is_group: true }).select().single();

  if (cErr || !chat) { toast("No se pudo crear el grupo: " + (cErr?.message || 'error desconocido'), "err"); return; }

  const members = [...friendIds, userSession.user.id].map(uid => ({
    chat_id: chat.id,
    user_id: uid,
    last_read_at: new Date().toISOString()
  }));
  const { error: memErr } = await sbClient.from('chat_members').insert(members);
  if (memErr) { toast("Grupo creado pero no se pudieron añadir los miembros: " + memErr.message, "err"); return; }

  toast("Grupo creado ✓");

  // Refrescar lista y abrir el nuevo chat
  await fetchChats();
  const newChat = S.chats.find(c => c.id === chat.id);
  if (newChat) openChat(newChat);
  else S.activeChat = chat;
}

function renderChatAvatars(chat) {
  const members = chat.chat_members.filter(m => m.user_id !== userSession?.user.id);
  
  if (!chat.is_group || members.length === 0) { // Handle single friend chat or empty group
    const other = members[0]?.profiles || { name: 'Usuario', avatar_url: null };
    return h('img', {
        src: other.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${other.name}`,
        class: 'chat-avatar-single'
    });
  }
  
  const wrap = h('div', { class: 'group-avatars-container' });
  if (members.length <= 2) {
      members.slice(0,2).forEach((m, idx) => { // Limit to 2 for stacked
          const img = h('img', {
              src: m.profiles.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.profiles.name}`,
              class: 'group-avatar-stacked',
              style: { left: (idx * 8) + 'px', zIndex: 3 - idx } // Adjusted left offset
          });
          wrap.appendChild(img);
      });
  } else {
      wrap.appendChild(h('img', { src: members[0].profiles.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${members[0].profiles.name}`, class: 'group-avatar-stacked', style: { left: '0px', zIndex: 3 } })); // First avatar
      wrap.appendChild(h('img', { src: members[1].profiles.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${members[1].profiles.name}`, class: 'group-avatar-stacked', style: { left: '8px', zIndex: 2 } })); // Second avatar, adjusted left
      wrap.appendChild(h('div', { class: 'group-avatar-extra' }, '+' + (members.length - 2))); // Extra count
  }
  return wrap;
}

