// ============================================================================
// Service Worker de AnimeTier Maker
// Misma estrategia que el original (network-first con fallback a caché),
// solo se ha actualizado la lista ASSETS para incluir los nuevos archivos
// css/js/data ahora que el proyecto está separado en varios ficheros en vez
// de tenerlo todo inline dentro de index.html.
// ============================================================================

const CACHE_NAME = 'at-v27'; // v27: modo sin conexion -- "Mis Tierlists" se puede ver en modo Visor (solo lectura) sin internet usando los datos ya guardados en el dispositivo, Usuarios/Perfil/chat/notificaciones se ocultan mientras no haya conexion para evitar fallos (acceder a Perfil a cambiar algo, etc.), aviso "Sin conexion" en la barra de navegacion, y las imagenes de personajes ya vistas una vez se guardan para poder verlas de nuevo sin conexion; ademas: viewer en movil ya no bloquea el scroll al tocar una carta (el touch-action:none del editor se aplicaba tambien sin querer al modo Visor, que no tiene ningun JS de arrastre que lo compense)
// FIX (Ronda 25 — modo sin conexión): caché aparte para las imágenes de
// personajes (ver el "fetch" más abajo). Deliberadamente NO lleva el mismo
// número de versión que CACHE_NAME -- si lo llevara, subir una versión
// nueva de la app borraría (en el "activate" de más abajo) todas las
// imágenes ya guardadas para verlas sin conexión, sin ninguna necesidad.
const IMG_CACHE_NAME = 'at-char-imgs-v1';
const IMG_HOST = 'texqcwfxzoeghyrcqwob.supabase.co';
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
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).then(() => {
      // FIX (Ronda 25 — modo sin conexión): el SDK de Supabase se carga
      // desde un CDN externo (otro origen), no incluido arriba en ASSETS a
      // propósito: cache.addAll() es "todo o nada" — si UNA sola URL falla
      // (por ejemplo, el CDN no responde justo en ese instante), ninguna de
      // las demás se guarda, y se perdería el precacheo de toda la app por
      // culpa de un recurso externo que ni siquiera es nuestro. Por eso
      // esta se cachea aparte, "a mejor esfuerzo": si falla, no pasa nada
      // grave (ver la nota en supabase-auth.js sobre por qué normalmente
      // sigue disponible igual, vía la caché HTTP normal del navegador) —
      // si funciona, queda garantizada sin conexión.
      return cache.add('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2').catch(()=>{});
    }))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      // FIX (Ronda 25): IMG_CACHE_NAME es una caché aparte y NO cambia de
      // nombre en cada versión (a propósito, para no perder las imágenes ya
      // guardadas offline solo por subir una versión nueva de la app) — hay
      // que respetarla aquí igual que a CACHE_NAME, si no, este propio
      // "activate" la borraría nada más instalarse.
      keys.filter(k => k !== CACHE_NAME && k !== IMG_CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

// FIX (Ronda 25 — modo sin conexión, "ver mis tierlists ya rankeadas sin
// conexión"): las imágenes de los personajes NO viven en este proyecto —
// se sirven desde el bucket de Supabase Storage (ver BUCKET_BASE en
// supabase-auth.js), así que nunca estaban en el precacheo de ASSETS de
// arriba. Sin esto, "ver una tierlist sin conexión" habría mostrado los
// huecos/nombres pero ninguna imagen real la primera vez que se probara.
// Estrategia "cache-first, revalida en segundo plano" (stale-while-
// revalidate) solo para esas imágenes: la primera vez que se ve un
// personaje (con conexión) se guarda aquí; las siguientes veces se sirve
// al instante desde esta caché (haya o no conexión) y, si SÍ hay conexión,
// de paso se actualiza por si acaso cambió. Así, cualquier tierlist que ya
// se haya abierto una vez con conexión queda disponible sin conexión.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && url.hostname === IMG_HOST && url.pathname.includes('/storage/v1/object/public/')) {
    e.respondWith(
      caches.open(IMG_CACHE_NAME).then(async cache => {
        const cached = await cache.match(e.request);
        const networkFetch = fetch(e.request).then(resp => {
          if (resp && resp.ok) cache.put(e.request, resp.clone());
          return resp;
        }).catch(() => null);
        return cached || (await networkFetch) || Response.error();
      })
    );
    return;
  }
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
