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

// Títulos de pestaña por sección
const ROUTE_TITLES = {
  home: 'AnimeTier',
  tierlists: 'AnimeTier – Mis Tierlists',
  users: 'AnimeTier – Usuarios',
  profile: 'AnimeTier – Ajustes',
  viewer: 'AnimeTier – Modo observador',
};

// Convierte page (+ un id opcional) en una ruta de URL limpia
function pathForPage(page, extra){
  switch(page){
    case 'home':      return '/';
    case 'tierlists':  return '/tierlists';
    case 'users':      return '/usuarios';
    case 'profile':    return '/ajustes';
    case 'editor':     return extra ? '/editor/'+encodeURIComponent(extra) : '/tierlists';
    case 'user-view':  return extra ? '/usuario/'+encodeURIComponent(extra) : '/usuarios';
    case 'viewer':     return '/ver';
    default:           return '/';
  }
}

// Lee la URL actual y la traduce a {page, id}
function getRouteFromPath(){
  // Compatibilidad con enlaces antiguos tipo #home / #editor/xxx
  if(location.hash && location.hash.includes('access_token')) return {page:'home',id:null};
  let path = location.pathname.replace(/\/index\.html$/,'').replace(/\/+$/,'');
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
  const { error } = await sbClient.from('profiles').update({ [field]: value }).eq('id', userSession.user.id);
  if (!error) {
    if (currentUserProfile) currentUserProfile[field] = value;
    const localP = activeProfile();
    if (localP) localP[field] = value;
    saveProfiles(); toast("Perfil actualizado"); render();
  }
}
