# AnimeTier Maker — estructura del proyecto

Reestructuración 1:1 del `index.html` original (que tenía **todo** — CSS y
~3000 líneas de JS — metido inline). El comportamiento es exactamente el
mismo; solo ha cambiado **dónde vive** cada trozo de código.

## Cómo se hizo (para que confíes en que no se rompió nada)

El `<style>` y el `<script>` únicos se cortaron en los mismos puntos donde
ya había comentarios de sección en tu propio código (`// ==== NAV ====`,
`// ==== HOME ====`, `// ==== EDITOR ====`, etc.), y cada trozo se volcó a
un archivo, **sin tocar ni una línea de código**, solo cambiando el sitio
donde vive. Se verificó carácter a carácter que cada archivo nuevo coincide
exactamente con su porción original.

Los scripts se cargan como `<script>` normales (no `type="module"`), en el
mismo orden en que se ejecutaban dentro del `<script>` único original, así
que todos comparten el mismo scope global y funcionan exactamente igual
(las funciones se siguen llamando entre sí sin `import`/`export`).

## Estructura

```
index.html              Solo estructura (head + <div id="app">), sin lógica
css/
  style.css             Todo el CSS (antes inline en <style>)
js/
  data/                 Datos estáticos
    characters.js        AC_BASE — catálogo de personajes
    tierlists-seed.js     DT / DP — tierlist y pool de ejemplo
    aliases.js             Alias de búsqueda multiidioma
  core/                  Lógica central de la app
    storage.js             Acceso a localStorage
    state.js                Estado global (S) + copia editable del catálogo (AC)
    profile-helpers.js
    save.js                 Guardado + sincronización con Supabase + chats
    editor-working-copy.js
    char-helpers.js
    actions.js              Crear/editar/eliminar tierlists y personajes
    router.js                Enrutado por hash (#/...)
    render.js                Motor de renderizado principal
    supabase-auth.js         Configuración Supabase + login Google
  ui/                    Piezas de interfaz reutilizables
    toast.js, h-helper.js, drag.js
  views/                 Pantallas de la app
    nav.js, home.js, editor.js, modals.js
  features/
    export-png.js          Exportar tierlist como imagen
  services/
    anilist.js              Búsqueda contra la API de AniList
resources/               Imágenes estáticas (fondos, logos)
  waifus/                 ⚠️ VACÍA — ver nota abajo
manifest.json, sw.js, favicon.ico
```

## ⚠️ Importante — 2 cosas que tienes que hacer tú

1. **Carpeta `resources/waifus/`**: no se ha subido aquí porque tú ya la
   tienes en local con todas las fotos de personajes. Copia/pega dentro de
   `resources/waifus/` todo el contenido que ya tenías, con los mismos
   nombres de archivo, y funcionará igual que antes.

2. **Archivos que subiste y que NO se han usado**: `style.css`, `app.js` y
   `data.js` que me pasaste **no estaban enlazados en tu `index.html`
   original** (el HTML nunca los cargaba — todo el CSS/JS real vivía
   inline dentro del propio `index.html`). Parecen una versión antigua o
   un intento anterior de estructurar el proyecto, con una lógica de
   drag&drop distinta a la que realmente usa tu app. Por eso **no los he
   incluido** en la nueva estructura, para no crear conflictos ni archivos
   fantasma. Si contienen algo que quieras recuperar, dímelo y lo reviso.

## 🆕 Navegación por páginas reales (URLs)

Cada sección ahora tiene su propia URL navegable, con botón atrás/adelante
funcionando de verdad:

| Sección              | URL              |
|-----------------------|------------------|
| Principal              | `/`              |
| Mis Tierlists           | `/tierlists`      |
| Usuarios                | `/usuarios`        |
| Ajustes (tu perfil)      | `/ajustes`          |
| Editor de una tierlist    | `/editor/<id>`       |
| Perfil de otro usuario     | `/usuario/<id>`       |
| Modo observador              | `/ver`                 |

Esto se implementó de forma centralizada: `render()` (en `js/core/render.js`)
llama automáticamente a `syncRouteWithState()` (en `js/core/router.js`) en
cada repintado, así que la URL siempre refleja la página actual sin tener
que tocar cada sitio del código que cambia de pantalla. El botón
atrás/adelante del navegador dispara `popstate`, que reconstruye el estado
a partir de la URL.

⚠️ **Para producción hace falta configurar el hosting** para que rutas como
`/tierlists` no den 404 al recargar la página (es una SPA: solo existe
`index.html` de verdad). Ya incluyo la configuración lista para los
proveedores más comunes:
- **Netlify** → `_redirects`
- **Vercel** → `vercel.json`
- **GitHub Pages** → `404.html` (copia de `index.html`, el truco clásico)

Si usas otro hosting (Apache, Nginx, Firebase Hosting...) dímelo y te paso
la configuración exacta.

## 🆕 Rediseño visual

Se añadió una capa cósmica ambiental 100% CSS (`#cosmic-fx` en `index.html`
+ el bloque "REDISEÑO PREMIUM" al final de `css/style.css`): campo de
estrellas parpadeantes, resplandores de color flotando de fondo, brillo en
el logo y las pestañas activas, tarjetas con borde degradado al pasar el
ratón, botones con más profundidad, scrollbar a juego con la paleta, y una
transición suave al cambiar de página. Todo es aditivo — ninguna clase que
usa el JS (drag&drop, editor, pool...) fue renombrada ni tocada en su
comportamiento.

De paso corregí dos bugs visuales que ya existían en el original:
- La fuente **Rajdhani** se usaba en 12 sitios del CSS pero nunca se
  cargaba desde Google Fonts (caía en la fuente del sistema sin que se
  notara). Ya está añadida al `<link>` de fuentes.
- La variable `--violet` se usaba en todo el chat (burbujas de mensajes,
  botón de enviar, etc.) pero nunca se definió en `:root`. Ya está
  definida.

## 🆕 Ronda 2 — parpadeo, tema, rediseño radical y funcionalidades

- **Bug de parpadeo arreglado**: la animación de "entrada de página" se
  disparaba en cada `render()` (casi cualquier clic), no solo al cambiar
  de sección. Ahora se compara la página anterior vs la nueva en
  `js/core/render.js` y solo anima cuando cambia de verdad.
- **Tema claro/oscuro**: botón en el nav (`js/ui/theme.js`), persistente en
  `localStorage`, sin parpadeo al cargar (se aplica en un script inline al
  principio de `<head>`, antes de que cargue nada más).
- **Rediseño radical** ("Grimorio Neón"): nueva paleta magenta/cian/oro,
  tarjetas con esquina cortada tipo carta coleccionable, hero con título
  gigante y efecto holográfico, cinta animada bajo el nav, nav con recorte
  diagonal. El editor/ranking se dejó **intacto**, tal como pediste.
- **Notificaciones**: se encontró y arregló un bug real — un listener de
  tiempo real apuntaba a tablas `friends` y `waifus` que no existen (nunca
  funcionó). Ahora usa las tablas reales y se añadió un sistema de
  notificaciones genérico (`js/core/notifications.js`) que también avisa de
  comentarios nuevos.
- **Comentarios**: solo visibles en modo Visor (`js/features/comments.js`),
  tal como pediste.
- **Logros**: calculados 100% en el navegador a partir de tus propios
  datos, sin depender de ninguna tabla nueva (`js/features/achievements.js`),
  visibles en Ajustes.
- **Chat**: revisado a fondo — el código cliente (`js/core/save.js`) ya
  estaba bien hecho. Si no funcionaba, casi seguro era porque faltaban las
  tablas en Supabase.

### ⚠️ Ejecuta `supabase-schema.sql`

**v2, corregido** tras ver tu esquema real: `tierlists.id` es de tipo
`TEXT` en tu base de datos (no `uuid`), así que las claves foráneas hacia
`tierlists(id)` ahora también son `TEXT`. El script es seguro de
re-ejecutar todas las veces que haga falta (usa `if not exists` y
`drop policy if exists`).

Tus tablas de chat (`chats`, `chat_members`, `messages`) **ya existían**,
así que lo más probable es que el chat no funcionara por falta de
**políticas RLS**: si activaste seguridad a nivel de fila en esas tablas
pero nunca añadiste políticas, Supabase deniega todo por defecto — sin
ningún error visible en el cliente, simplemente el chat aparece vacío o no
deja enviar mensajes. El script añade esas políticas.

Cópialo en Supabase → SQL Editor → pégalo → Run.

## 🆕 Ronda 3 — bugs de verdad arreglados + niveles, marcos, reacciones, menú diagonal

### Bugs encontrados y arreglados
- **Chat (el bug gordo)**: tu política de seguridad en `chat_members` se
  consultaba a sí misma dentro de su propia condición → "recursión
  infinita" → Postgres rechazaba la consulta → ni los chats privados ni
  los grupos cargaban nunca, sin ningún error visible. Se arregló con una
  función `security definer` (`is_chat_member`) que rompe el bucle. Ejecuta
  el `supabase-schema.sql` actualizado.
- **Chat (mensajes mudos)**: `sendChatMessage` insertaba el mensaje en la
  base de datos pero nunca lo mostraba en pantalla — dependía 100% de que
  Realtime estuviera activado en Supabase. Ahora se añade al instante,
  sin depender de nada más.
- **Arrastrar y soltar**: al mover una carta rápido y cruzar varias en
  menos de 250ms, se medía la posición de una carta a mitad de una
  animación anterior → cálculo mal → dos cartas superpuestas un instante.
  Arreglado asentando instantáneamente cualquier transformación a medias
  antes de medir de nuevo.
- **Logro "Creador de mundos"**: comprobaba una propiedad (`custom`) que
  no existía en ningún sitio del código — no se podía desbloquear nunca.
  Ahora comprueba los campos reales (`imageData` / `isRemote`).
- **Logros "Mariposa social" / "Voz de la comunidad"**: dependían de datos
  que solo se cargaban si ya habías visitado otra pantalla antes. Ahora se
  piden en cuanto entras en Ajustes.

### Nuevo
- **Menú diagonal a pantalla completa**: las 3 opciones (Tierlists,
  Usuarios, Perfil) ahora son franjas diagonales que ocupan toda la
  pantalla, estilo selección de videojuego japonés. En móvil se apilan
  horizontalmente para seguir siendo legibles. El editor/ranking sigue
  intacto.
- **Niveles de cuenta**: calculados de verdad a partir de tu actividad
  (tierlists, personajes rankeados, logros), con barra de progreso.
- **Marcos de avatar**: 6 marcos que se desbloquean por nivel (bronce →
  legendario), seleccionables en Ajustes.
- **Reacciones con emoji**: en modo Visor, junto a los comentarios — una
  reacción por persona, se puede cambiar. Requiere la tabla
  `tierlist_reactions` (en el SQL).
- **Paleta de la interfaz**: 5 esquemas de color (Persona, Genshin, Cyber,
  Sakura, Tóxico) seleccionables en Ajustes — cambian toda la app de golpe.
- **Estadísticas ampliadas**: ahora incluyen tier favorito y fecha de
  registro, todo calculado de datos reales tuyos.
- Se quitó "Personaje del día" a petición tuya.

### ⚠️ Vuelve a ejecutar `supabase-schema.sql`
Esta versión añade la función `is_chat_member` (arregla el chat de raíz),
la columna `avatar_frame` en `profiles`, y la tabla `tierlist_reactions`.
Es seguro volver a ejecutarlo entero.

## Producción

- Todo funciona con hosting 100% estático (GitHub Pages, Netlify, Vercel,
  etc.) — no hace falta build ni bundler, es JS/CSS plano.
- El Service Worker (`sw.js`) se actualizó (`at-v2`) para precachear los
  nuevos archivos `css/` y `js/`, así el modo offline sigue funcionando
  igual que antes (antes solo cacheaba `index.html`, que ya lo contenía
  todo; ahora hay que decirle explícitamente qué archivos cachear).
