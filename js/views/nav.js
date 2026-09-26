// Barra de navegación / menú principal de la aplicación.

// ============ NAV ============
function Nav(){
  const n=h('nav',{});
  n.appendChild(h('span',{class:'logo',onclick:()=>{
    if(S.page === 'viewer' || S.page === 'user-view') {
       S.page = S.prevPage || 'users'; 
       render(); 
       return;
    }
    if(S.hasUnsaved && !confirm('¿Salir sin guardar cambios?'))return;
    S.workingTL=null;S.hasUnsaved=false;S.page='home';setRoute('home');render();
  }},'AnimeTier'));
  if(userSession){
    n.appendChild(h('button',{class:'ntab'+(S.page==='home'?' on':''),onclick:()=>{
      if(S.hasUnsaved&&!confirm('¿Descartar cambios?'))return;
      S.workingTL=null;S.hasUnsaved=false;S.page='home';setRoute('home');render();
    }},'Mis Tierlists'));
    if(S.cid) n.appendChild(h('button',{class:'ntab'+(S.page==='editor'?' on':''),onclick:()=>{
      if(S.page!=='editor'){openEditor(S.cid);render();}
    }},'Editor'));
  }
  const nr=h('div',{class:'nav-right'});
  nr.appendChild(h('button',{
    class:'theme-toggle', title:'Cambiar tema claro/oscuro',
    onclick:(e)=>{ e.stopPropagation(); toggleTheme(); }
  }, currentTheme()==='dark' ? '☀️' : '🌙'));
  if(userSession) {
    const notifBtn = h('div', { 
      class: 'nav-notif', 
      onclick: (e) => { 
        e.stopPropagation(); 
        S.notifMenu = !S.notifMenu; S.profileMenu = null; 
        if(S.notifMenu){ fetchNotifications(); if(typeof fetchAppNotifications==='function') fetchAppNotifications(); } // Actualizar al abrir
        render(); 
      } 
    },
      h('span', {style:{fontSize:'18px'}}, '🔔'),
      (S.pendingRequests.length + (typeof unreadAppNotifCount==='function'?unreadAppNotifCount():0)) > 0
        ? h('div', { class: 'notif-badge' }, (S.pendingRequests.length + unreadAppNotifCount()) + '') : null
    );
    nr.appendChild(notifBtn);
    
    const chatBtn = h('button', { class: 'btn bg bsm', style:{padding:'8px', marginLeft:'4px', position:'relative'}, onclick: (e) => {
        e.stopPropagation();
        if(S.modal === 'chat') { closeChatModal(); }
        else {
          if(!S.chatModalPosition) S.chatModalPosition = { x: null, y: null };
          else { S.chatModalPosition.x = null; S.chatModalPosition.y = null; }
          S.modal = 'chat';
          render();
          fetchChats();
        }
    } }, 
      h('i', { class: 'ti ti-messages', style:{fontSize:'18px'} })
    );
    if (S.totalUnread > 0) chatBtn.appendChild(h('span', { class: 'chat-button-badge' }, S.totalUnread > 99 ? '+99' : S.totalUnread.toString()));
    nr.appendChild(chatBtn);

    const p = currentUserProfile || { name: '...', color: '#888' };
    const btnContent = p.avatar_url 
      ? h('img', { src: p.avatar_url, style: { width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' } }) 
      : p.name.charAt(0).toUpperCase();
    const btn = h('div', { class: 'profile-btn active' + (typeof frameClassFor==='function' ? ' '+frameClassFor(p) : ''), style: { background: p.color + '33', color: p.color }, onclick: (e) => { e.stopPropagation(); S.profileMenu = userSession.user.id; S.notifMenu = false; render(); } }, btnContent); // Mantener el perfil
    nr.appendChild(btn);
  } else {
    nr.appendChild(h('div', { class: 'profile-btn', style: { background: 'var(--bg3)', color: 'var(--text2)' }, onclick: handleGoogleLogin, title: 'Iniciar Sesión con Google' }, '👤'));
  }
  n.appendChild(nr);

  if(S.profileMenu){
    const p=getProfile(S.profileMenu);
    if(p){
      const pm=h('div',{class:'profile-menu'});
      pm.appendChild(h('div',{class:'pm-header'},h('div',{class:'pm-name'},p.name),h('div',{class:'pm-sub'},(p.tls||[]).length+' tierlists')));
      pm.appendChild(h('div',{class:'pm-item',onclick:()=>{S.page='profile'; S.profileMenu=null; render();}},'\u270F Editar perfil'));
      pm.appendChild(h('div',{class:'pm-item',onclick:()=>{S.profileMenu=null;handleLogout();}},'🚪 Cerrar sesión'));
      document.addEventListener('click',()=>{S.profileMenu=null;render();},{once:true});
      n.appendChild(pm);
    }
  }

  if(userSession && S.notifMenu) {
    const nm = h('div', { class: 'notif-menu' }, h('div', { class: 'notif-title' }, 'Notificaciones', h('span', {style:{cursor:'pointer'}, onclick:()=>S.notifMenu=false}, '✕')));
    if(S.pendingRequests.length === 0) {
      nm.appendChild(h('div', { class: 'notif-empty' }, 'No tienes solicitudes pendientes.'));
    } else {
      S.pendingRequests.forEach(req => {
        const item = h('div', { class: 'notif-item' });
        const senderName = req.sender?.name || 'Un usuario';
        item.appendChild(h('div', { class: 'notif-msg' }, h('strong', {}, senderName), ' ha solicitado ser tu amigo.'));
        const acts = h('div', { class: 'notif-actions' });
        acts.appendChild(h('button', { class: 'btn bp bsm btn-notif', onclick: () => respondFriendRequest(req.id, 'accepted') }, '✓ Aceptar'));
        acts.appendChild(h('button', { class: 'btn bd bsm btn-notif', onclick: () => respondFriendRequest(req.id, 'rejected') }, '✕'));
        item.appendChild(acts);
        nm.appendChild(item);
      });
    }
    // Notificaciones genéricas (comentarios en tus tierlists, etc.)
    const appNotifs = S.appNotifications || [];
    if(appNotifs.length){
      nm.appendChild(h('div',{class:'notif-sep'},'Actividad'));
      appNotifs.slice(0,12).forEach(nf=>{
        const actorName = nf.actor?.name || 'Alguien';
        const label = nf.type==='comment' ? ' ha comentado tu tierlist.'
                    : nf.type==='friend_accept' ? ' ha aceptado tu solicitud de amistad.'
                    : (nf.message || ' ha interactuado con tu contenido.');
        nm.appendChild(h('div',{
          class:'notif-item'+(nf.read?'':' notif-unread'),
          onclick:()=>{ if(!nf.read) markNotificationRead(nf.id); if(nf.tierlist_id){ openEditor(nf.tierlist_id); render(); } }
        }, h('div',{class:'notif-msg'}, h('strong',{},actorName), label)));
      });
      if(appNotifs.some(n=>!n.read)){
        nm.appendChild(h('button',{class:'btn bg bsm',style:{width:'100%',marginTop:'6px'},onclick:(e)=>{e.stopPropagation();markAllNotificationsRead();}},'Marcar todo como leído'));
      }
    }
    document.addEventListener('click',()=>{S.notifMenu=false;render();},{once:true});
    n.appendChild(nm);
  }
  return n;
}

let isProcessingFriendship = false;

async function fetchNotifications() {
  if (!userSession) return;
  try {
    // Traemos el ID de la relación y el nombre del perfil del 'user_id' (el que envió)
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
  const { error } = await sbClient.from('friendships')
    .insert({ user_id: userSession.user.id, friend_id: targetUserId, status: 'pending' });
  
  if(!error) { 
    toast('Solicitud enviada ✓'); 
    await fetchAllUsers(); 
  } else { 
    toast('No se pudo enviar: ' + error.message, 'err'); 
  }
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
    if(S.page === 'users') await fetchAllUsers();
  } catch(e) { console.error(e); }
  finally { isProcessingFriendship = false; render(); }
}

async function removeFriend(relId, isCancel = false) {
  if(isProcessingFriendship || !relId) return;
  if(!isCancel && !confirm('¿Seguro que quieres eliminar a este amigo?')) return;
  

  const msg = isCancel ? '¿Seguro que quieres cancelar la solicitud enviada?' : '¿Seguro que quieres eliminar a este amigo?';
  if(!confirm(msg)) return;

  isProcessingFriendship = true;
  const { error } = await sbClient.from('friendships').delete().eq('id', relId);
  
  if(!error) { 
    toast(isCancel ? 'Solicitud cancelada' : 'Amigo eliminado'); 
    await fetchAllUsers(); 
    await fetchNotifications();
  } else {
    toast('Error: ' + error.message, 'err');
  }
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
  // Traer los rankings del usuario junto con el título de la tierlist
  const { data, error } = await sbClient
    .from('user_rankings')
    .select('*, tierlists(title, folder)')
    .eq('user_id', userId);

  if(!error && data) {
    S.viewingUser.rankings = data;
    render();
  }
}

async function openViewer(rankData) {
  toast("Cargando modo observador...", "info");
  S.viewingRank = rankData;
  // Cargamos los personajes necesarios para esa tierlist
  const { data: chars } = await sbClient.from('characters').select('*').eq('tierlist_id', rankData.tierlist_id);
  if (chars) {
    chars.forEach(c => AC[c.id] = { id: c.id, name: c.name, anime: c.anime, file: c.image_url });
  }
  S.page = 'viewer';
  render();
}

