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

// Nueva función para gestionar datos en directo sin interrumpir al usuario
function setupRealtimeListeners() {
  if (!sbClient || !userSession) return;

  // 1. Escuchar solicitudes de amistad entrantes o actualizaciones de notificaciones
  sbClient
    .channel('cambios-sociales')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friends' }, (payload) => {
      // Si la solicitud es para el usuario actual, refrescamos el contador/lista discretamente
      if (payload.new && (payload.new.friend_id === userSession.user.id || payload.new.user_id === userSession.user.id)) {
        // Ejecuta tu función existente para buscar amigos/notificaciones del servidor de fondo
        loadSocialDataSilently(); 
      }
    })
    .subscribe();

  // 2. Escuchar cuando se agrega una nueva Waifu/Personaje al sistema global
  sbClient
    .channel('cambios-waifus')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waifus' }, (payload) => {
      // Añadimos la waifu a los datos locales cargados en memoria de fondo
      if (payload.new && window.ALL_CHARACTERS) {
        // Evitar duplicados
        if (!window.ALL_CHARACTERS.some(c => c.id === payload.new.id)) {
          window.ALL_CHARACTERS.push(payload.new);
          
          // Si el usuario está en la vista home/pool, actualizamos la lista visual
          // SIN tocar 'S.workingTL' (que es donde guarda lo que edita en su tier)
          if (S.page === 'home' || S.page === 'pool') {
            // Un renderizado parcial o actualización selectiva de la pool en el DOM
            updatePoolVisualsSilently();
          }
        }
      }
    })
    .subscribe();
}

// Funciones auxiliares para actualizar el DOM "sin romper nada"
async function loadSocialDataSilently() {
  // Aquí pones tu lógica actual de fetching de amigos (ej. sbClient.from('friends').select(...))
  // Al terminar, solo actualizas la burbuja de notificaciones del menú, no toda la pantalla.
  const { data } = await sbClient.from('friends').select('*').eq('friend_id', userSession.user.id).eq('status', 'pending');
  const notifBadge = document.getElementById('notif-badge');
  if (notifBadge) {
    notifBadge.innerText = data ? data.length : 0;
    notifBadge.style.display = data && data.length > 0 ? 'block' : 'none';
  }
}

function updatePoolVisualsSilently() {
  const poolEl = document.querySelector('.character-pool-content');
  if (!poolEl) return;
  // En vez de limpiar y redibujar todo rompiendo el drag, puedes inyectar solo las nuevas cartas que falten
  // o hacer un render local enfocado únicamente en la pool.
}
render();
