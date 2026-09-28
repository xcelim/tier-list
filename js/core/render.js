// Motor de renderizado principal: decide qué vista mostrar según la ruta/estado actual.

// ============ RENDER ============
let __lastRenderedPage = null; // para detectar cambios REALES de página (evita el "parpadeo")
function render(){
  // Mantiene la URL de la barra de direcciones sincronizada con S.page,
  // sin que cada sitio que cambia de página tenga que acordarse de hacerlo.
  if(typeof syncRouteWithState==='function') syncRouteWithState();

  const app=document.getElementById('app');

  // FIX: como render() reconstruye TODO el DOM desde cero en cada llamada
  // (app.innerHTML=''), cualquier <input> pierde el foco en cuanto escribes
  // una letra — oninput llama a render(), que destruye el input y crea uno
  // nuevo, así que el navegador ya no tiene nada enfocado (el buscador de
  // tierlists obligaba a hacer clic en cada letra). Para arreglarlo sin
  // reescribir todo el motor de render a un virtual-dom: antes de destruir
  // el DOM, guardamos qué campo estaba enfocado (por su atributo
  // data-focus-key, que hay que poner en cualquier <input>/<textarea> cuyo
  // oninput dispare un render) y su posición del cursor; después de
  // reconstruir, buscamos un elemento con la MISMA data-focus-key y le
  // devolvemos el foco y la posición del cursor exactos.
  let __focusKey=null,__focusSelStart=null,__focusSelEnd=null;
  const __active=document.activeElement;
  if(__active && __active.dataset && __active.dataset.focusKey){
    __focusKey=__active.dataset.focusKey;
    try{__focusSelStart=__active.selectionStart;__focusSelEnd=__active.selectionEnd;}catch(e){}
  }

  app.innerHTML='';

  // Forzar el fondo siempre en todas las pantallas
  document.body.classList.add('bg-main');

  app.appendChild(Nav());
  const main=document.createElement('main');
  // Solo animamos la entrada cuando de verdad cambiamos de sección, no en
  // cada render() (que se dispara con casi cualquier interacción).
  if(S.page !== __lastRenderedPage){ main.classList.add('page-turn'); __lastRenderedPage = S.page; }
  if(S.page==='home')main.appendChild(Home());
  else if(S.page==='tierlists')main.appendChild(TierlistsPage());
  else if(S.page==='users')main.appendChild(UsersPage());
  else if(S.page==='user-view')main.appendChild(UserViewPage());
  else if(S.page==='viewer')main.appendChild(Viewer());
  else if(S.page==='profile')main.appendChild(ProfilePage());
  else if(S.page==='editor')main.appendChild(Editor());
  app.appendChild(main);
  const mo=ModalEl();if(mo)app.appendChild(mo);

  // Devolver el foco (ver el FIX explicado arriba)
  if(__focusKey){
    const el=app.querySelector(`[data-focus-key="${__focusKey}"]`);
    if(el){
      el.focus();
      if(__focusSelStart!=null && el.setSelectionRange){
        try{el.setSelectionRange(__focusSelStart,__focusSelEnd);}catch(e){}
      }
    }
  }
}

// FIX (Ronda 17) — "el marco cromático se reinicia cada vez que hago algo":
// es un efecto secundario real (no algo nuevo, pasaba siempre) de que
// render() destruye y reconstruye TODO el DOM en cada llamada (ver el FIX
// de arriba sobre el foco perdido): cualquier avatar con marco animado
// (.frame-legendary, el aura de .mb-aura) es un elemento NUEVO cada vez que
// se pulsa cualquier cosa que llame a render() — no solo la campana — así
// que su animación CSS (una rotación infinita) vuelve a arrancar desde el
// principio cada vez, y se ve como si el marco "se reiniciara" en vez de
// girar de forma continua. Arreglo sin tocar el motor de renderizado:
// mantenemos dos variables CSS con la fase actual (según el reloj real) de
// cada animación, y en el CSS (.frame-legendary / .mb-aura::before en
// style.css) se usan como "animation-delay" negativo — así, cualquier marco
// recién creado arranca ya en el punto de giro que le corresponde según la
// hora real, en vez de siempre en el mismo sitio, y el efecto parece
// continuo aunque el elemento se esté recreando por debajo.
(function syncFrameAnimEpochs(){
  const root = document.documentElement.style;
  setInterval(() => {
    const now = Date.now() / 1000;
    root.setProperty('--legendary-epoch', (now % 3).toFixed(3));
    root.setProperty('--chromatic-epoch', (now % 14).toFixed(3));
  }, 200);
})();

// === GLOBALS SUPABASE ===
let userSession = null;
let currentUserProfile = null;
let isFetchingProfile = false;
let isDeletingAccount = false;

async function handleAuthSession(session) {
  if (isDeletingAccount) return;
  userSession = session;
  // Solo saltamos el fetch si ya tenemos el perfil cargado Y hay sesión activa
  // Si currentUserProfile fue borrado o hay cuenta nueva, siempre re-fetching
  if (isFetchingProfile || (currentUserProfile && currentUserProfile.id === session.user.id && S.activeProfile)) {
    render();
    return;
  }

  isFetchingProfile = true;
  try {
    let { data: profile } = await sbClient.from('profiles').select('*').eq('id', session.user.id).maybeSingle();

    if (!profile) {
      let username = "";
      while (true) {
        username = prompt("¡Bienvenido! Elige un nombre de usuario único (Cualquier otra acción cancelará el inicio de sesión):");
        if (username === null) { 
          await handleLogout(); 
          return; 
        }
        username = username.trim();
        if (!username) continue;
        
        // Comprobación de unicidad en la base de datos
        const { data: taken } = await sbClient.from('profiles').select('name').eq('name', username).maybeSingle();
        if (taken) {
          alert("Este nombre de usuario ya existe. Por favor, elige otro.");
          continue;
        }
        break;
      }
      profile = { id: session.user.id, name: username, color: '#7c5cbf' };
      const { error: insErr } = await sbClient.from('profiles').insert(profile);
      if (insErr) { toast("Error al crear perfil", "err"); await handleLogout(); return; }
    }

    currentUserProfile = profile;
    S.activeProfile = session.user.id;

    if (!S.profiles) S.profiles = [];
    let localP = S.profiles.find(x => x.id === S.activeProfile);
    
    if (!localP) {
      const oldProfiles = JSON.parse(localStorage.getItem('at4_profiles') || localStorage.getItem('at3_profiles') || '[]');
      const oldY = oldProfiles.find(x => x.name === 'Y' || x.id === 'profile_Y');
      localP = { ...profile, tls: oldY ? oldY.tls : [] };
      S.profiles.push(localP);
      if(oldY) toast("¡Tierlist de Waifus migrada con éxito!", "info");
    } else {
      // Sincronizar datos del perfil desde Supabase (is_admin, nombre, etc)
      localP.is_admin = profile.is_admin;
      localP.name = profile.name;
      localP.color = profile.color;
    }

    S.profiles = S.profiles.filter(x => x.id === S.activeProfile);
    saveProfiles();
    fetchGlobalTemplates();
    // Si hay una ruta pendiente (URL con hash al cargar), abrir el editor correspondiente
    await fetchAllUsers(); // Vital para que salgan los amigos en el chat
    fetchChats(); // Cargar chats al iniciar sesión
    fetchNotifications(); // Cargar notificaciones al iniciar sesión
    if(typeof fetchAppNotifications==='function') fetchAppNotifications();
    if(S._pendingTlId){
      const pendingTl=S.profiles.find(p=>p.id===S.activeProfile)?.tls.find(t=>t.id===S._pendingTlId);
      if(pendingTl){S.cid=S._pendingTlId;S.workingTL=JSON.parse(JSON.stringify(pendingTl));S.hasUnsaved=false;S.page='editor';}
      S._pendingTlId=null;
    }
    // Ruta pendiente al entrar directamente por una URL como /tierlists,
    // /usuarios, /ajustes o /usuario/:id antes de saber si había sesión.
    if(S._pendingRoute){
      const pr=S._pendingRoute; S._pendingRoute=null;
      if(pr.page==='user-view' && pr.id && typeof viewUser==='function'){ viewUser(pr.id); }
      else if(pr.page==='tierlists'||pr.page==='users'||pr.page==='profile'){ S.page=pr.page; }
    }
    if (S.cid) syncFromSupabase();
  } finally {
    isFetchingProfile = false;
    render();
  }
}

// === INICIALIZACIÓN SUPABASE ===
