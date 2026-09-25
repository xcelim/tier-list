// Configuración de Supabase, login con Google y funciones de autenticación.

const SB_URL = 'https://texqcwfxzoeghyrcqwob.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleHFjd2Z4em9lZ2h5cmNxd29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTQzMjEsImV4cCI6MjA5NjMzMDMyMX0.4zt5T9bY96o5yzLpVtl724tlghSrKE2CxBBnlVVlR9Q';
const BUCKET_BASE = 'https://texqcwfxzoeghyrcqwob.supabase.co/storage/v1/object/public/tierlists/';
async function handleGoogleLogin() {
  if(!sbClient) return toast("Conectando con el servidor...", "info");
  await sbClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
}

async function handleLogout() {
  if(!sbClient) return;
  // Limpiar estado en memoria ANTES de signOut para evitar race condition con onAuthStateChange
  currentUserProfile = null;
  isFetchingProfile = false;
  await sbClient.auth.signOut();
  userSession = null;
  S.activeProfile = null;
  S.profiles = [];
  S.page = 'home';
  S.cid = null;
  S.workingTL = null;
  S.modal = null;
  // Limpiar localStorage
  localStorage.removeItem('at4_profiles');
  localStorage.removeItem('at4_activeProfile');
  history.replaceState(null,'',location.pathname);
  render();
}

async function handleDeleteAccount() {
  if(!confirm('¿Seguro que quieres eliminar tu cuenta? Se borrarán tus rankings personales y tu perfil, pero las tierlists y personajes creados se mantendrán para la comunidad.')) return;
  if(!sbClient || !userSession) return;
  const uid = userSession.user.id;
  isDeletingAccount = true;
  try {
    toast('Desvinculando datos públicos y eliminando cuenta...','info');

    currentUserProfile = null;
    isFetchingProfile = false;

    // 1. Borrar rankings personales (vinculados al usuario)
    await sbClient.from('user_rankings').delete().eq('user_id', uid);

    // 3. Borrar perfil de la tabla public.profiles
    await sbClient.from('profiles').delete().eq('id', uid);

    // 4. Borrar el usuario de Supabase Auth (Pestaña Authentication)
    // Invocamos la función RPC que tiene permisos de administrador
    const { error: authErr } = await sbClient.rpc('delete_user_account');
    if (authErr) console.error("Error en Auth:", authErr);

    // 5. Limpiar localStorage por completo
    localStorage.removeItem('at4_profiles');
    localStorage.removeItem('at4_activeProfile');
    localStorage.removeItem('at4_deleted_tls');

    // 6. Reset de variables y sesión
    userSession = null;
    S.activeProfile = null;
    S.profiles = [];
    S.page = 'home';
    S.cid = null;
    S.workingTL = null;
    S.modal = null;
    history.replaceState(null,'',location.pathname);
    isDeletingAccount = false;
    
    render();
    toast('Cuenta eliminada con éxito.');
    // Recarga forzada para limpiar cualquier estado persistente del SDK de Supabase
    setTimeout(() => location.reload(), 1000);
  } catch(e) {
    isDeletingAccount = false;
    console.error('Error eliminando cuenta:',e);
    toast('Error al eliminar la cuenta: '+e.message,'err');
  }
}

// Forzar recarga de imágenes caídas por scroll veloz
document.addEventListener('error', function (e) {
  if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
    const img = e.target;
    // En tu index.html real las imágenes usan la clase "cimg", no "char-img" (Corregido aquí)
    if (img.classList.contains('cimg') && !img.dataset.retried) {
      img.dataset.retried = 'true';
      const currentSrc = img.src;
      img.src = '';
      setTimeout(() => { img.src = currentSrc; }, 200);
    }
  }
}, true);

function initSupabase() {
  if (!window.supabase) return setTimeout(initSupabase, 100);
  sbClient = window.supabase.createClient(SB_URL, SB_KEY);

  sbClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      handleAuthSession(session);
      // Activar la escucha en tiempo real de Supabase discretamente de fondo
      if (typeof setupRealtimeListeners === 'function') setupRealtimeListeners();
    } else {
      render();
    }
  });

  sbClient.auth.onAuthStateChange(async (ev, session) => {
    if (session) {
      handleAuthSession(session);
      if (typeof setupRealtimeListeners === 'function') setupRealtimeListeners();
    } else {
      // Mantenemos intacto tu código original de limpieza profunda al cerrar sesión
      userSession = null;
      currentUserProfile = null;
      S.activeProfile = null;
      S.profiles = [];
      S.page = 'home';
      S.cid = null;
      S.workingTL = null;
      S.modal = null;
      history.replaceState(null, '', location.pathname);
      saveProfiles();
      render();
    }
  });
}

// Guarda la ruta con la que se ha entrado a la página (p.ej. alguien entra
// directo por /tierlists o /editor/abc123) para aplicarla en cuanto
// sepamos si hay sesión iniciada (ver S._pendingTlId / S._pendingRoute en
// render.js -> handleAuthSession).
(function capturarRutaInicial(){
  if(typeof getRouteFromPath!=='function') return;
  const {page,id} = getRouteFromPath();
  if(page==='editor' && id){ S._pendingTlId = id; }
  else if(page==='user-view' && id){ S._pendingRoute = {page,id}; }
  else if(page==='tierlists' || page==='users' || page==='profile'){ S._pendingRoute = {page}; }
  // 'home' y 'viewer' no necesitan nada especial: S.page ya empieza en 'home'.
})();

initSupabase();
// Render inicial con soporte de routing
(function initApp(){  // <--- OJO: En tu archivo puede venir simplemente como (function(){
  // Registro de Service Worker para soporte PWA (App Móvil)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();

  sbClient.auth.onAuthStateChange(async (ev, session) => {
    if (session) {
      handleAuthSession(session);
      setupRealtimeListeners();
    } else {
      // ... tu código de limpieza de sesión actual ...
      userSession = null;
      render();
    }
  });

// Escucha en tiempo real las solicitudes de amistad entrantes para
// refrescar la campanita de notificaciones sin que el usuario tenga que
// recargar la página.
// (Antes esto apuntaba a una tabla "friends" y a un elemento #notif-badge
// que no existen en el proyecto — nunca llegó a funcionar. Se corrige aquí
// para usar la tabla real, "friendships", y el sistema de notificaciones
// que ya existe: fetchNotifications() + S.pendingRequests, en nav.js).
function setupRealtimeListeners() {
  if (!sbClient || !userSession) return;

  sbClient
    .channel('cambios-sociales')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, (payload) => {
      const row = payload.new || payload.old;
      if (row && (row.friend_id === userSession.user.id || row.user_id === userSession.user.id)) {
        if (typeof fetchNotifications === 'function') fetchNotifications();
      }
    })
    .subscribe();

  // Notificaciones genéricas (comentarios en tus tierlists, etc. — ver
  // js/core/notifications.js). Si la tabla "notifications" todavía no
  // existe en tu proyecto de Supabase, esta suscripción simplemente no
  // recibe nada; no rompe nada más.
  sbClient
    .channel('notificaciones-app')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userSession.user.id}` }, () => {
      if (typeof fetchAppNotifications === 'function') fetchAppNotifications();
    })
    .subscribe();
}
render();
