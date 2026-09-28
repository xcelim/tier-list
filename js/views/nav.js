// Barra de navegación / menú principal de la aplicación.

// ============ NAV ============

// FIX (Ronda 17) — BUG REAL de la campana, take 2: cambiar .at-alerts-panel
// a position:fixed (Ronda 15) NO fue suficiente, porque el panel se seguía
// añadiendo DENTRO de <nav> (n.appendChild(nm) más abajo), y <nav> tiene
// backdrop-filter — que, igual que transform/filter/perspective, crea un
// "containing block" TAMBIÉN para los descendientes position:fixed (no solo
// para position:absolute). O sea: el panel seguía posicionándose en
// relación a <nav>, nunca llegó a escapar de verdad a la ventana. La
// solución real es sacarlo del todo del árbol de <nav> y colgarlo
// directamente de <body>, que no tiene ningún filter/transform. Como
// render() solo destruye y reconstruye el contenido de #app (no el de
// <body> entero), hay que quitar/añadir este panel a mano en cada llamada a
// Nav() para que no se quede duplicado ni huérfano.
let _notifPanelEl = null;

function Nav(){
  if(_notifPanelEl){ _notifPanelEl.remove(); _notifPanelEl = null; }
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
  }
  const nr=h('div',{class:'nav-right'});
  nr.appendChild(h('button',{
    class:'theme-toggle', title:'Cambiar tema claro/oscuro',
    onclick:(e)=>{ e.stopPropagation(); toggleTheme(); }
  }, currentTheme()==='dark' ? '☀️' : '🌙'));
  if(userSession) {
    const notifBtn = h('div', { 
      class: 'at-bell', 
      onclick: (e) => {
        e.stopPropagation();
        S.notifMenu = !S.notifMenu; S.profileMenu = null;
        // DIAGNÓSTICO (por si el bloqueador de anuncios sigue sin dejarlo
        // ver, aunque las clases ya no se llaman "notif-*"): esto confirma
        // en la consola que el click SÍ se procesó y el estado cambió.
        console.log('[campana]', S.notifMenu ? 'abriendo' : 'cerrando', 'menú de notificaciones');
        if(S.notifMenu){ fetchNotifications(); if(typeof fetchAppNotifications==='function') fetchAppNotifications(); } // Actualizar al abrir
        render();
      }
    },
      h('span', {style:{fontSize:'18px'}}, '🔔'),
      (S.pendingRequests.length + (typeof unreadAppNotifCount==='function'?unreadAppNotifCount():0)) > 0
        ? h('div', { class: 'at-bell-badge' }, (S.pendingRequests.length + unreadAppNotifCount()) + '') : null
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
    // FIX: antes, pulsar el avatar solo abría un menú desplegable (con
    // "Editar perfil" y "Cerrar sesión" dentro) en vez de llevarte
    // directamente a tu perfil, que es lo que se espera al pulsar tu propio
    // icono. Ahora lleva directo a la página de Perfil (que ya tiene su
    // propio botón de "Cerrar sesión" al final), sin menú intermedio.
    const btn = h('div', { class: 'profile-btn active' + (typeof frameClassFor==='function' ? ' '+frameClassFor(p) : ''), style: { background: p.color + '33', color: p.color }, title: 'Mi perfil', onclick: (e) => {
      e.stopPropagation();
      S.notifMenu = false;
      if(S.hasUnsaved && !confirm('¿Salir sin guardar cambios?')) return;
      S.workingTL = null; S.hasUnsaved = false;
      S.page = 'profile'; setRoute('profile'); render();
    } }, btnContent);
    nr.appendChild(btn);
  } else {
    nr.appendChild(h('div', { class: 'profile-btn', style: { background: 'var(--bg3)', color: 'var(--text2)' }, onclick: handleGoogleLogin, title: 'Iniciar Sesión con Google' }, '👤'));
  }
  n.appendChild(nr);

  if(userSession && S.notifMenu) {
    const nm = h('div', { class: 'at-alerts-panel' }, h('div', { class: 'at-alerts-title' }, 'Notificaciones', h('span', {style:{cursor:'pointer'}, onclick:(e)=>{e.stopPropagation();S.notifMenu=false;render();}}, '✕')));
    if(S.pendingRequests.length === 0) {
      nm.appendChild(h('div', { class: 'at-alerts-empty' }, 'No tienes solicitudes pendientes.'));
    } else {
      S.pendingRequests.forEach(req => {
        const item = h('div', { class: 'at-alert-row' });
        const senderName = req.sender?.name || 'Un usuario';
        item.appendChild(h('div', { class: 'at-alert-msg' }, h('strong', {}, senderName), ' ha solicitado ser tu amigo.'));
        const acts = h('div', { class: 'at-alert-actions' });
        acts.appendChild(h('button', { class: 'btn bp bsm at-alert-btn', onclick: () => respondFriendRequest(req.id, 'accepted') }, '✓ Aceptar'));
        acts.appendChild(h('button', { class: 'btn bd bsm at-alert-btn', onclick: () => respondFriendRequest(req.id, 'rejected') }, '✕'));
        item.appendChild(acts);
        nm.appendChild(item);
      });
    }
    // Notificaciones genéricas (comentarios en tus tierlists, etc.)
    const appNotifs = S.appNotifications || [];
    if(appNotifs.length){
      nm.appendChild(h('div',{class:'at-alert-sep'},'Actividad'));
      appNotifs.slice(0,12).forEach(nf=>{
        const actorName = nf.actor?.name || 'Alguien';
        const label = nf.type==='comment' ? ' ha comentado tu tierlist.'
                    : nf.type==='friend_accept' ? ' ha aceptado tu solicitud de amistad.'
                    : (nf.message || ' ha interactuado con tu contenido.');
        nm.appendChild(h('div',{
          class:'at-alert-row'+(nf.read?'':' at-alert-unread'),
          onclick:()=>{ if(!nf.read) markNotificationRead(nf.id); if(nf.tierlist_id){ openEditor(nf.tierlist_id); render(); } }
        }, h('div',{class:'at-alert-msg'}, h('strong',{},actorName), label)));
      });
      if(appNotifs.some(n=>!n.read)){
        nm.appendChild(h('button',{class:'btn bg bsm',style:{width:'100%',marginTop:'6px'},onclick:(e)=>{e.stopPropagation();markAllNotificationsRead();}},'Marcar todo como leído'));
      }
    }
    // FIX: antes se registraba un listener nuevo de "click fuera para
    // cerrar" en CADA render mientras el menú estaba abierto (y como
    // fetchNotifications()/fetchAppNotifications() también llaman a
    // render() al terminar, se acumulaban varios listeners de golpe). Con
    // muchos acumulados, cualquier click DENTRO del propio menú (que
    // burbujea hasta document) disparaba todos a la vez, así que el botón
    // en algunos casos "no hacía nada" visible o el menú se comportaba de
    // forma rara. Ahora solo hay un listener vivo como máximo: se guarda
    // la referencia y se quita el anterior antes de poner uno nuevo.
    if (typeof _closeNotifMenuHandler === 'function') {
      document.removeEventListener('click', _closeNotifMenuHandler);
    }
    _closeNotifMenuHandler = () => { S.notifMenu = false; render(); };
    document.addEventListener('click', _closeNotifMenuHandler, { once: true });
    // FIX (Ronda 17): document.body en vez de n (dentro de <nav>) — ver
    // comentario grande al principio de este archivo.
    _notifPanelEl = nm;
    document.body.appendChild(nm);
  }
  return n;
}

let _closeNotifMenuHandler = null;

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
  // OR incluye también las tierlists colaborativas en las que este usuario
  // es colaborador (no dueño) — antes solo se traían las suyas propias, así
  // que una tierlist compartida con él no aparecía aquí aunque sí pudiera
  // editarla.
  const { data, error } = await sbClient
    .from('user_rankings')
    .select('*, tierlists(title, folder, cover_url)')
    .or(`user_id.eq.${userId},collaborators.cs.{${userId}}`);

  if(!error && data) {
    S.viewingUser.rankings = data;
    render();
  }
}

async function openViewer(rankData) {
  toast("Cargando modo observador...", "info");
  S.viewingRank = rankData;
  S._viewerOwnTlId = null; // esto es el ranking de OTRA persona, no el tuyo
  // Cargamos los personajes necesarios para esa tierlist
  const { data: chars } = await sbClient.from('characters').select('*').eq('tierlist_id', rankData.tierlist_id);
  if (chars) {
    chars.forEach(c => AC[c.id] = { id: c.id, name: c.name, anime: c.anime, file: c.image_url });
  }
  S.page = 'viewer';
  render();
}

// Modo observador de TU PROPIA tierlist — desde la tarjeta (botón del ojo)
// o desde dentro del editor. Trae tu ranking real (el tuyo, o el conjunto
// si es colaborativa) para que el modo observador no muestre la plantilla
// vacía.
async function openOwnViewer(tl){
  if(!userSession){ toast('Inicia sesión para usar el modo observador','err'); return; }
  toast('Cargando modo observador...', 'info');
  const uid = userSession.user.id;
  let tiersData = tl.tiers || [];
  let rankingId = tl._rankingId || null;
  try{
    const { data } = await sbClient.from('user_rankings').select('*')
      .eq('tierlist_id', tl.id)
      .or(`user_id.eq.${uid},collaborators.cs.{${uid}}`)
      .limit(1).maybeSingle();
    if(data){ tiersData = data.tiers_data || tiersData; rankingId = data.id; }
  }catch(e){ console.error(e); }

  const { data: chars } = await sbClient.from('characters').select('*').eq('tierlist_id', tl.id);
  if (chars) chars.forEach(c => AC[c.id] = { id: c.id, name: c.name, anime: c.anime, file: c.image_url });

  const p = activeProfile();
  S.viewingUser = { id: uid, name: (p && p.name) || currentUserProfile?.name };
  S.viewingRank = { id: rankingId, user_id: uid, tiers_data: tiersData, tierlists: { title: tl.title, folder: tl.folder, cover_url: tl.cover_url } };
  S._viewerOwnTlId = tl.id;
  S.page = 'viewer';
  setRoute && setRoute('viewer', tl.id);
  render();
}

// Igual, pero desde DENTRO del editor: usa los datos que hay en memoria
// (S.workingTL) en vez de volver a pedirlos a Supabase, así el modo
// observador refleja también los cambios que aún no has guardado.
function viewCurrentEditorAsViewer(){
  if(!S.workingTL || !S.cid) return;
  const uid = userSession?.user?.id;
  S.viewingUser = { id: uid, name: currentUserProfile?.name };
  S.viewingRank = {
    id: S.workingRankingId || null, user_id: uid,
    tiers_data: S.workingTL.tiers,
    tierlists: { title: S.workingTL.title, folder: S.workingTL.folder, cover_url: S.workingTL.cover_url }
  };
  S._viewerOwnTlId = S.cid;
  S.page = 'viewer';
  render();
}

