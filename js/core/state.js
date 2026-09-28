// Estado global de la aplicación (S) y copia editable en memoria del
// catálogo de personajes (AC), usada por el editor para altas/bajas custom.


// Runtime editable copy of AC
let AC = JSON.parse(JSON.stringify(AC_BASE));

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
  window.addEventListener('offline', ()=>{ S.offline=true; if(typeof render==='function') render(); });
}

function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function sanFolder(n){return(n||'').replace(/[^a-zA-Z0-9_\- ]/g,'').trim().replace(/ +/g,'_').slice(0,40)||'tierlist'}

