// ============================================================================
// Service Worker de AnimeTier Maker
// Misma estrategia que el original (network-first con fallback a caché),
// solo se ha actualizado la lista ASSETS para incluir los nuevos archivos
// css/js/data ahora que el proyecto está separado en varios ficheros en vez
// de tenerlo todo inline dentro de index.html.
// ============================================================================

const CACHE_NAME = 'at-v12'; // v12: tarjetas de tierlist más estrechas/altas con borde degradado, distintivo de colaborativa + contador real de tiers/personajes, botón de modo observador en tarjetas y editor con botón de vuelta a edición, seleccionar varias waifus para poner nombre/anime a todas de golpe al añadir varias, refresco de plantillas también en el perfil (para que una colaborativa recién compartida aparezca sin pasar por Mis Tierlists), reintento de sesión caducada antes de crear un chat
const ASSETS = [
  './',
  './index.html',
  './favicon.ico',
  './manifest.json',

  './css/style.css',

  './js/data/characters.js',
  './js/data/tierlists-seed.js',
  './js/data/aliases.js',

  './js/core/storage.js',
  './js/core/state.js',
  './js/core/profile-helpers.js',
  './js/core/save.js',
  './js/core/editor-working-copy.js',

  './js/ui/toast.js',
  './js/ui/theme.js',
  './js/core/char-helpers.js',
  './js/services/anilist.js',
  './js/ui/h-helper.js',
  './js/ui/drag.js',

  './js/views/nav.js',
  './js/views/home.js',
  './js/views/editor.js',
  './js/views/modals.js',

  './js/features/export-png.js',
  './js/features/comments.js',
  './js/features/achievements.js',
  './js/features/extras.js',
  './js/features/levels.js',
  './js/features/reactions.js',
  './js/core/notifications.js',
  './js/core/actions.js',
  './js/core/router.js',
  './js/core/render.js',
  './js/core/supabase-auth.js',

  './resources/homebkg.png',
  './resources/tierlistlogo.png',
  './resources/userslogo.png',
  './resources/profilelogo.png',
  './resources/userbkg.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
