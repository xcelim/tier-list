// Estado global de la aplicación (S) y copia editable en memoria del
// catálogo de personajes (AC), usada por el editor para altas/bajas custom.


// Runtime editable copy of AC
// FIX (Ronda 35 — "en modo sin conexión faltan personajes que sí salen
// conectado"): AC solo se rellenaba en MEMORIA, leyendo la tabla
// "characters" de Supabase cada vez que se abría el editor o el modo Visor
// de una tierlist estando online (ver syncFromSupabase en save.js, y
// openViewer/openOwnViewer en nav.js). Si un personaje lo añadió otro
// colaborador (o tú mismo desde otro dispositivo), o si sencillamente no
// habías vuelto a abrir esa tierlist en esta sesión antes de perder la
// conexión, ese personaje nunca llegaba a estar en AC — y como AC vivía
// solo en memoria (nunca se guardaba en el dispositivo), cerrar y reabrir
// la app lo perdía incluso si en algún momento SÍ se había cargado. Sin él,
// openOfflineViewer() (que no puede pedir nada por red) no encontraba ese
// personaje (getChar devolvía null) y su tarjeta entera desaparecía del
// modo Visor sin conexión, aunque su POSICIÓN sí estuviera bien
// sincronizada (por eso el tier y el hueco eran correctos, pero faltaban
// fotos concretas). Ahora, además de vivir en memoria, AC arranca
// recuperando también lo último guardado en este dispositivo (ver
// rememberChars() más abajo), así que cualquier personaje visto alguna vez
// online en este dispositivo sigue disponible aunque se cierre la app.
let AC = Object.assign(JSON.parse(JSON.stringify(AC_BASE)), DB.l('charcache', {}));

// Recuerda en AC (memoria) Y en este dispositivo (localStorage) los
// personajes que se acaban de traer de la tabla "characters" de Supabase —
// usado desde save.js (syncFromSupabase) y nav.js (openViewer/
// openOwnViewer) cada vez que se cargan los personajes de una tierlist.
// Acepta tanto filas de Supabase ({id,name,anime,image_url}) como entradas
// ya con forma de AC ({id,name,anime,file}).
function rememberChars(list){
  if(!list || !list.length) return;
  const persisted = DB.l('charcache', {});
  list.forEach(c=>{
    if(!c || !c.id) return;
    const entry = { id:c.id, name:c.name, anime:c.anime, file:c.image_url||c.file, isRemote:true };
    AC[c.id] = entry;
    persisted[c.id] = entry;
  });
  DB.s('charcache', persisted);
}

// ============ STATE ============
let S={
  page:'home',
  prevPage: null,
  profiles:DB.l('profiles',null),
  activeProfile:DB.l('activeProfile',null),
  allUsers: [],
  viewingUser: null, // Usuario que estamos visitando
  viewingRank: null, // Ranking específico que estamos viendo
  userSearch: '',
  profileMenu:null, // null | profileId
  notifMenu: false,
  pendingRequests: [],
  appNotifications: [], // notificaciones genéricas (comentarios, etc.) — ver js/core/notifications.js
  comments: {}, // caché de comentarios por tierlist_id — ver js/features/comments.js
  reactions: {}, // caché de reacciones por tierlist_id — ver js/features/reactions.js
  commentDraft: '',
  modal:null,md:{},
  q:'',poolPage:0,
  etitle:false,
  cid:null,
  // Editor working copy (not saved until user clicks Save)
  workingTL:null,
  // Profile draft state
  profileDraft: null,
  profileUnsaved: false,
  chats: [],
  totalUnread: 0, // Nuevo: para el badge global
  chatModalPosition: { x: null, y: null }, // Nuevo: para la posición del modal arrastrable
  activeChat: null,
  _chatOptionsOpen: null, // id del chat cuyo menú de "..." está abierto (Ronda 12)
  messages: [],
  hasUnsaved:false,
  saveT:null,
  // Tierlists colaborativas: a qué fila real de user_rankings corresponde
  // la tierlist abierta ahora mismo, y si es una fila ajena compartida
  // contigo (colaborador) o una que sea colaborativa (aunque sea tuya).
  workingRankingId: null,
  workingIsForeignCollab: false,
  workingIsCollaborative: false,
  // FIX (Ronda 25 — modo sin conexión): true si el navegador ya sabe que no
  // hay red al cargar la página. navigator.onLine puede dar falsos
  // positivos (dice "true" aunque no haya internet real, solo detecta que
  // hay una interfaz de red activa) pero los falsos NEGATIVOS (decir
  // "false" habiendo conexión) son raros — así que sirve bien para el caso
  // que nos interesa: evitar disparar peticiones que sabemos que van a
  // fallar y bloquear a tiempo las pantallas que las necesitan.
  offline: (typeof navigator!=='undefined' && 'onLine' in navigator) ? !navigator.onLine : false,
};

if (!S.profiles) S.profiles = [];
if(!S.activeProfile) S.activeProfile=null;

// Mantener S.offline al día si cambia la conectividad DURANTE la sesión
// (por ejemplo, se corta el wifi a medio usar la app, o vuelve). No
// recarga datos por sí solo al recuperar conexión (para eso hay que
// recargar la página, como se pide) — solo actualiza el aviso/bloqueos
// para que no se queden pegados si la conexión cambia mientras se usa.
if(typeof window!=='undefined'){
  window.addEventListener('online', ()=>{ S.offline=false; if(typeof render==='function') render(); });
  // FIX (Ronda 30 — pedido explícito: "que cuando entras en modo sin
  // conexión automáticamente entra en modo visor si estabas editando, para
  // evitar problemas"): seguir en el editor sin conexión es peligroso —
  // cualquier guardado se quedaría solo en local, sin sincronizar con la
  // nube ni con el resto de tus dispositivos, y podría generar conflictos
  // al recuperar la conexión más tarde. Si la conexión se corta mientras
  // estás editando, se guarda automáticamente lo que tuvieras (nunca se
  // pierde) y se pasa solo al modo Visor de solo lectura de esa misma
  // tierlist, tal cual se había quedado.
  window.addEventListener('offline', ()=>{
    S.offline=true;
    if(S.page==='editor' && typeof switchToOfflineViewerFromEditor==='function') switchToOfflineViewerFromEditor();
    if(typeof render==='function') render();
  });
}

function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function sanFolder(n){return(n||'').replace(/[^a-zA-Z0-9_\- ]/g,'').trim().replace(/ +/g,'_').slice(0,40)||'tierlist'}

