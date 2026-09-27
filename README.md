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

## 🆕 Ronda 4 — bugs reales encontrados y arreglados

- **Comentarios/reacciones "cruzados" (el bug más grave de esta ronda)**:
  `tierlists` es la plantilla COMPARTIDA — tú y tu amigo rankeando la misma
  "Waifus" por defecto tenéis el MISMO `tierlist_id`. Guardar comentarios
  por ese id hacía que tu comentario en la tierlist de tu amigo apareciera
  también en la tuya. Arreglado: ahora se guardan por `ranking_id` (el id
  único de CADA ranking personal, tabla `user_rankings`), que sí es
  distinto para cada persona. **Hace falta volver a ejecutar el SQL**: esta
  vez recrea esas dos tablas desde cero (`drop table` + `create table`),
  así que cualquier comentario/reacción de prueba que hubieras metido se
  perderá — es una tabla nueva de hace minutos, no debería haber nada que
  perder.
- **Chat con recursión infinita, otra vez**: si te seguía dando ese error
  después del arreglo anterior, era casi seguro una política vieja con otro
  nombre que no se borraba. El SQL ahora borra TODAS las políticas de esas
  3 tablas (sea cual sea su nombre) antes de crear las correctas.
- **Reacciones "bloqueadas" en tierlists de amigos**: bug real en mi propio
  código — le pasaba `disabled: false` al helper de UI, y en HTML
  `disabled="false"` sigue deshabilitando el botón (es un atributo
  booleano, cuenta su sola presencia). Arreglado.
- **Marco de avatar no se marcaba al pulsar**: `updateProfileField`
  esperaba la respuesta del servidor antes de actualizar la pantalla, y si
  fallaba (columna nueva sin crear, etc.) no pasaba nada visible. Ahora se
  actualiza al instante y avisa si falla de verdad.
- **Avatar de la esquina sin reacción al pulsar**: añadido un respaldo por
  si el perfil local no se encontraba por el id exacto.
- **Arrastrar: salto feo al agarrar una carta**: la carta se sacaba del
  flujo (`width:0`) antes de que el hueco la sustituyera, así que las
  cartas de detrás ocupaban su sitio de golpe durante un frame y luego
  "saltaban" otra vez. Ahora el hueco se coloca en el mismo instante.
- Botón "Editor" del header eliminado (llevaba siempre a la misma tierlist).
- Perfil de otro usuario ahora muestra nivel, logros y estadísticas reales
  suyas (solo lectura).
- Barra de nivel más pequeña, paleta de la interfaz centrada.

### ⚠️ Pendiente para la próxima ronda
- Rediseño a fondo de la página "Mis Tierlists" (la pediste "con mucha más
  interfaz" — es un cambio grande, mejor hacerlo con calma en su propio
  mensaje que meterlo con prisa aquí).
- El "salto raro" al cruzar varias cartas rápido puede que mejore mucho
  con el arreglo de esta ronda, pero avísame si todavía se nota raro en
  algún caso concreto.

### ⚠️ Vuelve a ejecutar `supabase-schema.sql` (completo, de arriba a abajo)

## 🆕 Ronda 5 — más bugs reales + rediseño de Tierlists

- **Chat: "new row violates row-level security policy"**: la política de
  INSERT en `chats`/`chat_members` comprobaba `auth.uid() is not null`, que
  en teoría debería bastar pero estaba dando problemas. Cambiado a la forma
  correcta y más robusta de Supabase: `TO authenticated WITH CHECK (true)`
  (restringe por ROL en vez de por una comprobación dentro de la condición).
- **Salto al agarrar una carta (por fin, el motivo real)**: en el mismo
  instante en que se colocaba el hueco en su sitio original, el código
  seguía ejecutándose y volvía a calcular la posición con las coordenadas
  YA MOVIDAS del cursor (las que cruzaron el umbral de 5px para empezar a
  arrastrar), deshaciendo el arreglo al instante. Ahora se corta ahí y se
  espera al siguiente movimiento real del ratón.
- **Estadísticas/logros "falsos" en Ajustes**: el bug real era que Ajustes
  calculaba todo desde una copia local (`activeProfile().tls`) que puede
  quedar desactualizada, mientras que ver tu propio perfil desde Usuarios
  usa datos frescos de Supabase — por eso salían números distintos según
  por dónde entraras. Ahora Ajustes también pide tus rankings reales,
  con la misma consulta, así los dos caminos coinciden siempre.
- **Perfil de otro usuario**: añadido "Miembro desde".
- **Barra de nivel solapando con el icono de cámara**: el botón de cámara
  ahora es una etiqueta de texto aparte debajo de la barra, no puede
  solaparse con nada.
- **Rediseño de "Mis Tierlists"**: cabecera a juego con Usuarios, buscador
  + orden (recientes / nombre / nº de personajes), tarjetas con portada
  (la imagen de un personaje de esa tierlist), contador de tiers/personajes
  con iconos, fecha de última actualización.
- **Más decoración en el Home**: bordes cromáticos animados (efecto arcoíris
  girando) en los 3 paneles del menú, chispas ascendentes decorativas tras
  el título, resplandor pulsante en el separador.
- **404 al refrescar**: ese mensaje concreto de GitHub ("no hay una página
  de GitHub Pages aquí") significa que **GitHub Pages no está activado**
  en el repositorio — no es un fallo del código. Actívalo en tu repo:
  Settings → Pages → elige la rama/carpeta → Save. El archivo `404.html`
  que ya incluye el proyecto se encargará de que las rutas como
  `/tierlists` funcionen bien al recargar, en cuanto Pages esté activado.

### ⚠️ Sobre el SQL

Tienes razón en que el anterior dio errores de "ya existe" — era porque
tenías tablas de una versión previa con otra estructura. El de esta
ronda ya lo tienes corregido (nos pasaste exactamente lo que ejecutaste).
Solo hace falta volver a ejecutar la parte de arriba (política de `chats`)
si te sigue dando el error de "violates row-level security policy".

## 🆕 Ronda 6 — borde cromático de verdad, home sin scroll, stats de amigos y tierlists colaborativas

### Bugs arreglados

- **Borde cromático del home invisible / tapando el color de cada panel**:
  el intento de la ronda anterior ponía el aro cromático en `.mb-aura::after`
  con un fondo sólido simulando "recortar el centro". El problema es que
  `.menu-box::after` (el degradado de color propio de cada tarjeta —
  magenta/morado/dorado) se pinta SIEMPRE después, por orden de apilamiento,
  así que tapaba el aro entero y encima el color de fondo real de las 3
  tarjetas se veía sustituido por un tono plano falso. Arreglado usando la
  misma técnica que ya usan `.user-avatar-border` y `.tlc::before` en este
  mismo proyecto: `padding` + `mask-composite: exclude`, que deja transparente
  el centro de verdad (no un color inventado) y solo pinta el aro — así da
  igual el orden de las capas de al lado, nunca se tapan entre sí.
- **Drag & drop — "medir antes de ocultar"**: al agarrar un personaje, ahora
  se mide la posición de las cartas vecinas ANTES de aplicar la clase que
  colapsa la carta arrastrada, no después — si se mide después, el navegador
  ya aplicó el cambio de layout y "antes"/"después" salen iguales, así que
  el hueco aparecía de golpe sin animación (la sensación de bug que
  reportaste). Reaplicado tras el corte de contexto que perdió este arreglo.
- **Parpadeo del chat al abrir/interactuar**: reaplicado el flag que evita
  que la animación de apertura se repita en cada re-render mientras el chat
  ya está abierto (antes se abría dos veces seguidas y se "cerraba" al
  tocar cualquier cosa dentro).
- **Home con scroll**: cabecera, título y menú reducidos (padding superior,
  tamaño de letra del título, altura del menú diagonal y pie de página) para
  que quepa todo en una pantalla normal sin tener que hacer scroll.

### Nuevo

- **Perfil de un amigo con tus mismas estadísticas**: al ver el perfil de
  otra persona ahora salen también "Tu anime más rankeado", "Tu tier
  favorito" y "Miembro desde" — antes solo aparecían en tu propio Ajustes.
  Se reutiliza la misma función (`StatsSection`) en los dos sitios para
  garantizar que los números sean siempre los mismos.
- **Tierlists colaborativas**: al guardar una tierlist tienes dos botones,
  "Guardar" (como siempre, solo tuya) y "Guardar colaborativa" (elige con
  qué amigos compartirla). A partir de ese momento, esa tierlist deja de
  tener una fila por persona: pasa a ser UNA sola fila que edita cualquiera
  de los colaboradores, y cada vez que alguien la guarda, Supabase Realtime
  empuja el cambio a todos los que la tengan abierta en ese momento (con un
  aviso si tienes cambios sin guardar tuyos, para no pisártelos). Requiere
  ejecutar la sección nueva del SQL (ver más abajo).

### ⚠️ Vuelve a ejecutar `supabase-schema.sql` (completo, de arriba a abajo)

Esta ronda añade las columnas `is_collaborative` y `collaborators` a
`user_rankings`, sus políticas RLS (incluida la limpieza total de políticas
viejas de esa tabla, por si ya tenías alguna más restrictiva de antes), y
añade `user_rankings` a la publicación de Realtime. Sin volver a ejecutar
esto, el botón "Guardar colaborativa" dará un error de permisos.

## Producción

- Todo funciona con hosting 100% estático (GitHub Pages, Netlify, Vercel,
  etc.) — no hace falta build ni bundler, es JS/CSS plano.
- El Service Worker (`sw.js`) se actualizó (`at-v2`) para precachear los
  nuevos archivos `css/` y `js/`, así el modo offline sigue funcionando
  igual que antes (antes solo cacheaba `index.html`, que ya lo contenía
  todo; ahora hay que decirle explícitamente qué archivos cachear).
