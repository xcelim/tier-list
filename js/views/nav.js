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
  // FIX (Ronda 25 — modo sin conexión, pedido explícito: "evita fallos como
  // acceder al perfil a cambiar cosas y tal si hacemos esto"): la campana,
  // el chat y el avatar de perfil llevan todos a pantallas o acciones que
  // necesitan red de verdad (notificaciones, mensajes, editar el perfil...)
  // — mostrarlos sin conexión solo invita a tocarlos y encontrarse con un
  // fallo silencioso. En vez de eso, mientras no haya conexión se ocultan
  // los tres y se deja un aviso claro en su lugar; en cuanto vuelva la
  // conexión (o se recargue la página con ella ya vuelta) reaparecen
  // exactamente igual que siempre.
  if(userSession && S.offline) {
    nr.appendChild(h('div', { class:'offline-badge', title:'Sin conexión — solo puedes ver tus tierlists ya guardadas' }, '📴 Sin conexión'));
  } else if(userSession) {
    const notifBtn = h('div', {
      class: 'at-bell',
      onclick: (e) => {
        e.stopPropagation();
        S.notifMenu = !S.notifMenu; S.profileMenu = null;
        if(S.notifMenu){
          // FIX (Ronda 18): antes fetchNotifications() y
          // fetchAppNotifications() llamaban CADA UNA a su propio render()
          // en cuanto terminaban — y como no siempre resuelven en el mismo
          // instante, el panel (que vive fuera de <nav>, ver Ronda 17) se
          // destruía y volvía a crearse dos veces seguidas: un parpadeo
          // visible, muy parecido al bug que hubo con el chat por duplicar
          // renders. Ahora se les pasa "true" (modo silencioso, no
          // renderizan ellas solas) y se espera a que las DOS terminen para
          // renderizar una única vez con los datos ya completos.
          Promise.all([
            fetchNotifications(true),
            typeof fetchAppNotifications==='function' ? fetchAppNotifications(true) : Promise.resolve()
          ]).then(render);
        }
        render(); // abre el panel al instante (con los datos que ya hubiera)
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
    // FIX (Ronda 39 — pedido explícito, con captura: "el mío de mi perfil de
    // plata está como cortado"): antes la foto era una <img> con
    // border-radius+object-fit directamente encima de .profile-btn (que
    // además lleva el marco equipado, dibujado con box-shadow) — en varios
    // navegadores/WebViews esa combinación no recorta la imagen en un
    // círculo perfecto y se ve "a medias", con una esquina cuadrada
    // asomando por detrás. Mismo arreglo que en los comentarios (Ronda 38):
    // la foto va ahora en un div interior aparte con overflow:hidden
    // (profile-btn-clip) que SÍ recorta siempre, dejando el marco intacto
    // en el elemento de fuera.
    const btnContent = p.avatar_url
      ? h('div', { class: 'profile-btn-clip' }, h('img', { src: p.avatar_url }))
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
      // FIX (Ronda 37 — pedido explícito: "el botón de borrar leídas que
      // salga arriba"): antes estos botones iban DESPUÉS de la lista
      // entera, así que con unas cuantas notificaciones había que bajar
      // hasta el final para encontrarlos. Ahora van justo debajo del
      // separador "Actividad", antes de las filas.
      const notifActions = h('div',{style:{display:'flex',gap:'6px',marginBottom:'8px'}});
      if(appNotifs.some(n=>!n.read)){
        notifActions.appendChild(h('button',{class:'btn bg bsm',style:{flex:'1'},onclick:(e)=>{e.stopPropagation();markAllNotificationsRead();}},'Marcar leído'));
      }
      if(appNotifs.some(n=>n.read)){
        notifActions.appendChild(h('button',{class:'btn bg bsm',style:{flex:'1'},onclick:(e)=>{e.stopPropagation();deleteReadNotifications();}},'Borrar leídas'));
      }
      if(notifActions.children.length) nm.appendChild(notifActions);
      appNotifs.slice(0,12).forEach(nf=>{
        const actorName = nf.actor?.name || 'Alguien';
        const label = nf.type==='comment' ? ' ha comentado tu tierlist.'
                    : nf.type==='friend_accept' ? ' ha aceptado tu solicitud de amistad.'
                    : (nf.message || ' ha interactuado con tu contenido.');
        // FIX (Ronda 36 — pedido explícito: poder borrar las notificaciones
        // "con una X o algo"): la fila entera pasa a ser flex (mensaje a la
        // izquierda, X a la derecha) solo para esta fila de "Actividad" —
        // las de solicitud de amistad, más arriba, siguen con su layout de
        // siempre (mensaje arriba, botones Aceptar/Rechazar debajo).
        const row = h('div',{
          class:'at-alert-row'+(nf.read?'':' at-alert-unread'),
          style:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',cursor:'pointer'},
          onclick:()=>{ if(!nf.read) markNotificationRead(nf.id); if(nf.tierlist_id){ openEditor(nf.tierlist_id); render(); } }
        }, h('div',{class:'at-alert-msg',style:{marginBottom:'0'}}, h('strong',{},actorName), label));
        row.appendChild(h('span',{
          title:'Borrar notificación',
          style:{cursor:'pointer',color:'var(--text3)',flexShrink:'0',padding:'0 2px'},
          onclick:(e)=>{ e.stopPropagation(); deleteNotification(nf.id); }
        }, '✕'));
        nm.appendChild(row);
      });
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
    // FIX (Ronda 20) — "las notis siguen saliendo dos veces con parpadeo":
    // esto seguía pasando incluso después de esperar a los dos fetches
    // (Ronda 18) porque, ANTES de este fix, el código de arriba del todo de
    // esta función ("if(_notifPanelEl){ _notifPanelEl.remove(); ... }")
    // destruía y recreaba el nodo del panel en TODAS Y CADA UNA de las
    // llamadas a render() de la app mientras el panel estuviera abierto —
    // no solo cuando llegaban datos nuevos, sino con CUALQUIER interacción
    // en cualquier otra parte de la app (la app entera se re-renderiza en
    // casi cualquier click). Como .at-alerts-panel tiene una animación de
    // entrada (slideDown), recrear el nodo hacía que esa animación se
    // repitiera cada vez — de ahí el "aparece dos veces". Ahora, si el
    // panel YA existe y sigue en el DOM, se REUTILIZA el mismo nodo (solo
    // se reemplaza su contenido); el nodo solo se crea/inserta de cero la
    // primera vez que se abre, así la animación de entrada juega una única
    // vez por apertura, no en cada render().
    if (_notifPanelEl && _notifPanelEl.isConnected) {
      _notifPanelEl.replaceChildren(...nm.childNodes);
    } else {
      _notifPanelEl = nm;
      // FIX (Ronda 17): document.body en vez de n (dentro de <nav>) — ver
      // comentario grande al principio de este archivo.
      document.body.appendChild(nm);
    }
  } else if (_notifPanelEl) {
    _notifPanelEl.remove();
    _notifPanelEl = null;
  }
  return n;
}

let _closeNotifMenuHandler = null;

let isProcessingFriendship = false;

// FIX (Ronda 18): "quiet" opcional — ver el comentario en fetchAppNotifications
// (js/core/notifications.js), es la misma solución para el mismo problema.
async function fetchNotifications(quiet) {
  if (!userSession) return;
  try {
    // Traemos el ID de la relación y el nombre del perfil del 'user_id' (el que envió)
    const { data, error } = await sbClient.from('friendships')
      .select('id, user_id, sender:profiles!user_id(name)')
      .eq('friend_id', userSession.user.id)
      .eq('status', 'pending');

    if(error) throw error;
    S.pendingRequests = data || [];
    if(!quiet) render();
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
  // FIX (Ronda 18, corregido tras aclaración): esto SÍ debe incluir (vía el
  // OR de abajo) las tierlists donde este usuario es colaborador de una
  // tierlist de OTRA persona — si A guarda una tierlist y añade a B como
  // colaborador, debe salirle a LOS DOS (tanto en "Usuarios" como en
  // "amigo"), pero a nadie más. La ronda anterior quitó esto por error,
  // pensando que ahí estaba el bug — pero el bug real era otro (ver el
  // guard de más abajo): una condición de carrera. Al navegar rápido de un
  // perfil a otro (p.ej. verte a ti mismo en "Usuarios" y luego entrar al
  // perfil de otra cuenta antes de que la primera petición terminase), la
  // respuesta de la petición VIEJA podía llegar tarde y pisar los datos del
  // perfil que se está viendo ahora — así que unas tierlists tuyas podían
  // acabar apareciendo en el perfil de otra persona. Por eso "prueba" y
  // "Animes Temporada 2026" (tuyas) se colaban en el perfil ajeno.
  const { data, error } = await sbClient
    .from('user_rankings')
    .select('*, tierlists(title, folder, cover_url)')
    .or(`user_id.eq.${userId},collaborators.cs.{${userId}}`);

  // FIX (Ronda 19) — condición de carrera real: si mientras se esperaba esta
  // respuesta ya se navegó a OTRO perfil (o se salió de la vista), S.viewingUser
  // ya no es "u"/"userId" — en ese caso esta respuesta está desactualizada y
  // NO debe aplicarse, o pisaría los datos del perfil que se ve ahora mismo.
  if (!S.viewingUser || S.viewingUser.id !== userId) return;

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
  // FIX (Ronda 35 — personajes que faltaban en el modo Visor sin conexión):
  // rememberChars() (ver state.js) guarda esto también en el dispositivo,
  // no solo en memoria, para que sobreviva a cerrar la app.
  if (chars) rememberChars(chars);
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
  // FIX (Ronda 35 — personajes que faltaban en el modo Visor sin conexión):
  // rememberChars() (ver state.js) guarda esto también en el dispositivo,
  // no solo en memoria, para que sobreviva a cerrar la app.
  if (chars) rememberChars(chars);

  const p = activeProfile();
  S.viewingUser = { id: uid, name: (p && p.name) || currentUserProfile?.name };
  // FIX (Ronda 33): se añade "customChars" aquí (antes faltaba) para que un
  // personaje añadido a mano (con su propia imagen) se encuentre igual que
  // ya hace el modo Visor sin conexión — ver Viewer()/getChar() en home.js.
  S.viewingRank = { id: rankingId, user_id: uid, tiers_data: tiersData, tierlists: { title: tl.title, folder: tl.folder, cover_url: tl.cover_url, customChars: tl.customChars||[] } };
  S._viewerOwnTlId = tl.id;
  S.page = 'viewer';
  setRoute && setRoute('viewer', tl.id);
  render();
}

// FIX (Ronda 33 — pedido explícito: "cuando muevo una foto y le doy a modo
// visor se queda la foto en esa posición aunque no haya guardado, mal ahí,
// si refresco se corrige pero eso está mal"): esta función, desde el botón
// del ojo DENTRO del editor, pasaba directamente S.workingTL — la copia de
// TRABAJO, con cualquier cambio sin guardar todavía. Eso hacía que mover una
// carta y pulsar el ojo mostrara esa posición aunque no se hubiera guardado
// de verdad, y solo un refresco (que de paso DESCARTA el cambio sin
// guardar) lo "corregía". El modo Visor debe reflejar lo GUARDADO, no un
// borrador — igual que el botón del ojo de la tarjeta en "Mis Tierlists" —
// así que ahora reutiliza openOwnViewer(), que trae el ranking realmente
// guardado (de este dispositivo, o de la nube si hay otro más reciente).
function viewCurrentEditorAsViewer(){
  if(!S.workingTL || !S.cid) return;
  const savedTl = getTLfromProfile(S.cid) || S.workingTL;
  openOwnViewer(savedTl);
}

