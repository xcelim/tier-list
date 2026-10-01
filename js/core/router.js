// Enrutado con URLs reales (History API) — cada sección tiene su propia ruta
// navegable (/, /tierlists, /usuarios, /ajustes, /editor/:id, /usuario/:id),
// el botón "atrás/adelante" del navegador funciona, y las URLs se pueden
// copiar/compartir o guardar como marcador.
//
// IMPORTANTE si despliegas en hosting estático (GitHub Pages, Netlify,
// Vercel...): como estas rutas no son archivos reales en el servidor, hace
// falta configurar un "SPA fallback" para que /tierlists (por ejemplo) sirva
// igualmente index.html en vez de dar 404 al recargar la página o entrar
// directo por esa URL. Mira los archivos incluidos:
//   - netlify: _redirects
//   - vercel:  vercel.json
//   - GitHub Pages: 404.html (truco clásico: 404.html = copia de index.html)

// ============ ROUTING (URLs reales vía History API) ============

// FIX (Ronda 16) — BUG REAL ENCONTRADO: el sitio se despliega en GitHub
// Pages bajo un subdirectorio (https://xcelim.github.io/tier-list/), NO en
// la raíz del dominio. Pero pathForPage()/getRouteFromPath() de aquí abajo
// estaban escritas asumiendo que la app vive en la raíz ("/", "/tierlists"…).
// Como setRoute() se llama automáticamente en CADA render(), la barra de
// direcciones se reescribía sola a "https://xcelim.github.io/" nada más
// cargar o navegar dentro de la app — perdiendo el "/tier-list" sin que se
// notara (sigue pareciendo que la app funciona, porque pushState no recarga
// la página). El problema salta al pulsar recargar (F5) en esa URL: el
// navegador SÍ pide esa URL de verdad al servidor, y como
// "https://xcelim.github.io/" no es ningún repositorio, GitHub Pages
// responde con su 404 genérico ("There isn't a GitHub Pages site here").
//
// BASE_PATH se calcula una sola vez, a partir de la URL con la que se cargó
// la página de verdad, quitándole cualquier ruta "conocida" de la app para
// quedarnos solo con el prefijo real del despliegue. Así funciona igual de
// bien en "/tier-list/" (GitHub Pages) que en la raíz de un dominio propio.
const BASE_PATH = (function(){
  let p = location.pathname.replace(/\/index\.html$/,'');
  p = p.replace(/\/(tierlists|usuarios|ajustes|ver|editor\/[^/]+|usuario\/[^/]+)\/?$/,'');
  if(!p.endsWith('/')) p += '/';
  return p;
})();

// Títulos de pestaña por sección
const ROUTE_TITLES = {
  home: 'AnimeTier',
  tierlists: 'AnimeTier – Mis Tierlists',
  users: 'AnimeTier – Usuarios',
  profile: 'AnimeTier – Ajustes',
  viewer: 'AnimeTier – Modo observador',
};

// Convierte page (+ un id opcional) en una ruta de URL limpia, siempre
// dentro de BASE_PATH (antes devolvía rutas absolutas desde la raíz).
function pathForPage(page, extra){
  switch(page){
    case 'home':      return BASE_PATH;
    case 'tierlists':  return BASE_PATH + 'tierlists';
    case 'users':      return BASE_PATH + 'usuarios';
    case 'profile':    return BASE_PATH + 'ajustes';
    case 'editor':     return extra ? BASE_PATH + 'editor/' + encodeURIComponent(extra) : BASE_PATH + 'tierlists';
    case 'user-view':  return extra ? BASE_PATH + 'usuario/' + encodeURIComponent(extra) : BASE_PATH + 'usuarios';
    case 'viewer':     return BASE_PATH + 'ver';
    default:           return BASE_PATH;
  }
}

// Lee la URL actual y la traduce a {page, id}
function getRouteFromPath(){
  // Compatibilidad con enlaces antiguos tipo #home / #editor/xxx
  if(location.hash && location.hash.includes('access_token')) return {page:'home',id:null};
  let path = location.pathname.replace(/\/index\.html$/,'');
  if(path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length);
  path = path.replace(/^\/+/,'').replace(/\/+$/,'');
  if(!path) return {page:'home',id:null};
  const parts = path.split('/').filter(Boolean);
  if(parts[0]==='tierlists') return {page:'tierlists',id:null};
  if(parts[0]==='usuarios')  return {page:'users',id:null};
  if(parts[0]==='ajustes')   return {page:'profile',id:null};
  if(parts[0]==='ver')       return {page:'viewer',id:null};
  if(parts[0]==='editor'  && parts[1]) return {page:'editor',  id:decodeURIComponent(parts[1])};
  if(parts[0]==='usuario' && parts[1]) return {page:'user-view',id:decodeURIComponent(parts[1])};
  return {page:'home',id:null};
}

// Qué "extra" (id) le corresponde a la página actual según el estado vivo
function routeExtraFor(page){
  if(page==='editor')    return S.cid;
  if(page==='user-view') return S.viewingUser && S.viewingUser.id;
  return null;
}

// Actualiza la URL de la barra de direcciones para que coincida con S.page.
// Si la ruta ya es la correcta no hace nada (evita ensuciar el historial).
function setRoute(page, extra){
  const path = pathForPage(page, extra);
  if(location.pathname !== path){
    history.pushState({page,extra:extra||null}, '', path);
  }
  if(page==='editor' && extra){
    const p = activeProfile();
    const tl = p && p.tls.find(t=>t.id===extra);
    document.title = tl ? 'AnimeTier – '+tl.title : 'AnimeTier';
  } else {
    document.title = ROUTE_TITLES[page] || 'AnimeTier';
  }
}

// Sincroniza la URL con el estado actual; se llama automáticamente en cada
// render(), así que NINGÚN sitio del código necesita acordarse de llamar a
// setRoute() manualmente cada vez que cambia S.page.
function syncRouteWithState(){
  setRoute(S.page, routeExtraFor(S.page));
}

// Aplica lo que diga la URL actual sobre el estado (usado al pulsar
// atrás/adelante, y reutilizado también en la carga inicial de la página).
function applyRouteFromLocation(){
  // FIX (Ronda 46): navegar con atrás/adelante del navegador puede sacarte
  // del editor o del modo Visor sin pasar por ningún botón de la app (que
  // es donde normalmente se corta la suscripción en tiempo real) -- se
  // corta aquí también, de forma general, por si acaso.
  if(typeof unsubscribeCollab==='function') unsubscribeCollab();
  const {page,id} = getRouteFromPath();

  if(page==='editor' && id){
    const p = activeProfile();
    const tl = p && p.tls.find(t=>t.id===id);
    if(tl){ S.page='editor'; S.cid=id; S.workingTL=JSON.parse(JSON.stringify(tl)); S.hasUnsaved=false; }
    else  { S.page='home';   S.cid=null; S.workingTL=null; }

  }else if(page==='user-view' && id){
    if(userSession && typeof viewUser==='function'){ viewUser(id); return; } // viewUser ya hace S.page + render()
    S.page = userSession ? 'users' : 'home';

  }else if(page==='tierlists' || page==='users' || page==='profile'){
    S.page = userSession ? page : 'home';

  }else if(page==='viewer'){
    // El modo observador depende de datos que solo existen en memoria
    // durante la sesión (no son recargables desde la URL sin más contexto),
    // así que si se llega aquí por recarga directa volvemos al listado.
    S.page = userSession ? 'tierlists' : 'home';

  }else{
    S.page='home'; S.cid=null; S.workingTL=null;
  }
}

window.addEventListener('popstate', () => {
  applyRouteFromLocation();
  render();
});

async function fetchAllUsers() {
  if (!sbClient) return; 
  const { data: profiles } = await sbClient.from('profiles').select('*').order('name');
  const { data: rankings } = await sbClient.from('user_rankings').select('user_id');
  const { data: friendships } = await sbClient.from('friendships').select('*');
  
  if (profiles) {
    S.allUsers = profiles.map(u => {
      const tlCount = (rankings || []).filter(r => r.user_id === u.id).length;
      const userFriends = (friendships || []).filter(f => f.status === 'accepted' && (f.user_id === u.id || f.friend_id === u.id));
      
      let relStatus = 'none', relId = null;
      if(userSession) {
        const rel = (friendships || []).find(f => 
          (f.user_id === userSession.user.id && f.friend_id === u.id) || 
          (f.friend_id === userSession.user.id && f.user_id === u.id)
        );
        if(rel) {
          relId = rel.id;
          if(rel.status === 'accepted') relStatus = 'accepted';
          else if(rel.user_id === userSession.user.id) relStatus = 'pending_sent';
          else relStatus = 'pending_received';
        }
      }
      return { ...u, tl_count: tlCount, friend_count: userFriends.length, relStatus, relId };
    });
    render();
  }
}

async function updateProfileField(field, value) {
  if (!userSession || !sbClient) return;

  // FIX: antes esto esperaba la respuesta del servidor para actualizar la
  // pantalla, y si fallaba (por ejemplo si la columna todavía no existe en
  // Supabase) no pasaba NADA — ni error ni cambio visual, parecía que el
  // clic no hacía nada. Ahora se actualiza al instante y se avisa si falla.
  if (currentUserProfile) currentUserProfile[field] = value;
  const localP = activeProfile();
  if (localP) localP[field] = value;
  render();

  const { error } = await sbClient.from('profiles').update({ [field]: value }).eq('id', userSession.user.id);
  if (!error) {
    saveProfiles(); toast("Perfil actualizado");
  } else {
    toast("No se pudo guardar: " + error.message, "err");
  }
}
