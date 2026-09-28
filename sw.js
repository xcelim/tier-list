// ============================================================================
// Service Worker de AnimeTier Maker
// Misma estrategia que el original (network-first con fallback a caché),
// solo se ha actualizado la lista ASSETS para incluir los nuevos archivos
// css/js/data ahora que el proyecto está separado en varios ficheros en vez
// de tenerlo todo inline dentro de index.html.
// ============================================================================

const CACHE_NAME = 'at-v22'; // v22: arreglado de verdad el parpadeo doble de la campana — el panel se destruía y recreaba en CADA render() de la app (no solo al llegar datos nuevos), y como tiene animación de entrada (slideDown), se repetía cada vez; ahora se reutiliza el mismo nodo del panel mientras esté abierto y solo se crea de cero al abrirlo
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
    // FIX (Ronda 12): index.html ahora pide los .js/.css con un "?v=" al
    // final (para forzar que el navegador y el hosting no sirvan una copia
    // vieja en caché cuando se sube una versión nueva — esto explica que
    // varios arreglos "no se notaran" en rondas anteriores pese a estar
    // bien subidos). Como la lista ASSETS de aquí abajo se guardó SIN esa
    // query, hay que decirle a caches.match que ignore la query al
    // comparar ("ignoreSearch"), si no, el fallback offline nunca
    // encontraría coincidencia y se quedaría sin nada que servir.
    fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
