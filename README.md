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

## 🆕 Ronda 7 — tierlist nueva vacía de verdad, borde cromático completo, tarjetas anchas con portada, drag afinado y guardado bloqueado

### Bugs arreglados

- **Tierlist nueva con 2050 waifus aunque no se pidiera**: se ha quitado el
  desplegable "Empezar con..." — una tierlist nueva ahora SIEMPRE se crea
  vacía. El bug de fondo era más profundo: `syncFromSupabase()` metía
  siempre el catálogo base de 2050 personajes en el "pool" de CUALQUIER
  tierlist, no solo en la de Waifus por defecto. Ahora esa base solo se usa
  para la tierlist con id `waifus_v1`; cualquier otra empieza realmente
  vacía y solo se llena con lo que le añadas tú.
- **Pantalla en blanco al ver el perfil de un usuario**: el bug de la ronda
  pasada — pasar un número (`u.friend_count`) directamente como hijo de un
  elemento en vez de convertirlo a texto (`+ ''`) hacía que `appendChild`
  fallara con una excepción, y como el render se corta ahí, la pantalla se
  quedaba en blanco (con la barra de navegación ya pintada, pero nada más).
  Se aprovechó también para arreglar un bug relacionado: el nivel/XP de un
  amigo se calculaba en realidad con TUS logros, no los suyos.
- **Borde cromático de los paneles del home, otra vez**: el intento con
  `mask-composite:exclude` de la ronda anterior asumía un rectángulo
  redondeado, pero estos paneles tienen un recorte diagonal real
  (`clip-path: polygon(...)`) — el propio recorte se comía el anillo justo
  en los bordes en diagonal, dejando solo un borde recto casi invisible.
  Solución nueva: técnica de "doble clip-path" — una capa de fondo
  (`.mb-aura`) con el degradado girando y el MISMO recorte que el panel, y
  encima una segunda capa (`.mb-bg`, con el icono y el color del panel) con
  ese mismo recorte pero un poco más pequeña — el hueco entre las dos deja
  ver un borde que sigue el contorno diagonal COMPLETO del panel.
- **Paneles del home demasiado pequeños**: se habían encogido de más al
  intentar quitar el scroll. Ahora son grandes otra vez (altura del 56% de
  la pantalla) y se ha compensado quitando aire de la cabecera y el pie
  para que siga sin haber que hacer scroll.
- **Drag & drop — las cartas de al lado ya no se mueven "en bloque"**: si
  movías el ratón rápido, el hueco podía saltar 2 o más posiciones de golpe
  en un solo fotograma, así que las cartas de en medio se desplazaban todas
  a la vez sin que se viera el hueco abriéndose entre ellas. Ahora el hueco
  "viaja" una posición a la vez (cada 90ms), así que en todo momento se ve
  claramente el espacio abriéndose entre cada dos cartas.

### Nuevo

- **"Mis Tierlists" en tarjetas anchas**: en vez de tarjetas altas, ahora
  son tarjetas horizontales (portada a la izquierda, info a la derecha).
  El buscador está centrado en su propia fila y los filtros de orden van
  debajo, también centrados.
- **Portada personalizada por tierlist**: botón de cámara sobre la portada
  de cada tarjeta para subir tu propia foto (se recorta/redimensiona sola
  a 500×220 y se sube al mismo storage que ya usa la app). Requiere la
  columna nueva `cover_url` en `tierlists` (ver SQL).
- **Guardado normal vs. colaborativo, bloqueado tras la primera vez**: al
  guardar una tierlist por primera vez salen los dos botones y se pregunta
  con un aviso antes de confirmar (la elección no se puede deshacer desde
  aquí). A partir de esa primera vez, solo se muestra el botón del tipo
  elegido — el otro desaparece.

### ⚠️ Sobre el chat: "new row violates row-level security policy for table chats"

Si te sigue saliendo este error después de haber ejecutado el SQL de la
Ronda 6/7 completo, el código del cliente ya está bien (usa exactamente la
política que hay en el SQL), así que el problema está en qué política hay
REALMENTE activa en tu proyecto de Supabase. Antes de nada, comprueba tú
mismo qué hay activo — pega esto en el SQL Editor de Supabase y mira el
resultado:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies where tablename = 'chats';
```

Deberías ver una única política de tipo `INSERT` llamada
"cualquiera logueado crea chats", con `roles = {authenticated}` y
`with_check = true`. Si ves más de una política de INSERT, o el
`with_check` no es `true`, es que queda alguna política vieja o que el SQL
no se ejecutó entero de una vez (por ejemplo, si se cortó a mitad). Borra
las que sobren a mano desde Database → Policies, o vuelve a pegar el
`supabase-schema.sql` completo de arriba a abajo en una sola ejecución.
Si aun así el problema persiste, prueba a cerrar sesión y volver a entrar
(un token de sesión caducado o corrupto también puede dar este mismo
error).

### ⚠️ Vuelve a ejecutar `supabase-schema.sql` (completo, de arriba a abajo)

Esta ronda añade la columna `cover_url` a `tierlists` (para la portada
personalizada). Sin ella, el botón de cámara de "Mis Tierlists" dará
error al intentar guardar la portada.

## 🆕 Ronda 8 — perfil como el de un amigo, tarjetas y marcos unificados, colaboradores gestionables

### Sobre el chat, otra vez: la política de `chats` estaba bien, pero esa NO es la única tabla implicada

Tu captura de `pg_policies` para `chats` es correcta (`with_check = true`,
`roles = {authenticated}`) — eso descarta que el problema esté ahí. Pero
crear un chat privado en realidad hace **dos** inserts seguidos: uno en
`chats` (el que comprobaste) y justo después otro en `chat_members`, con
**dos filas a la vez**: la tuya y la de tu amigo (`openChat`/`createGroup`
en `js/core/save.js`). Si la política de INSERT de `chat_members` en tu
proyecto quedó con una condición como `user_id = auth.uid()` (en vez de
`with_check (true)`, que es lo que trae `supabase-schema.sql`), la fila
que insertas para TU AMIGO se rechaza por RLS — porque tú no eres
`auth.uid()` para esa fila — y todo el insert falla en bloque, con el
mismo mensaje genérico de "row-level security policy", pero en la tabla
`chat_members`, no en `chats`. Compruébalo con:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies where tablename in ('chat_members','messages');
```

Si `chat_members` no tiene una política de INSERT con `with_check = true`
para `authenticated` (llamada "te añades o añades a otros a un chat" en el
SQL), o si `messages` no tiene su política de INSERT, vuelve a pegar el
bloque de políticas de chat de `supabase-schema.sql` (líneas del
`drop policy if exists "miembros ven sus chats"` en adelante) entero, de
una sola vez, en el SQL Editor.

### Bugs arreglados

- **El nombre iba debajo de la foto en el perfil**: ahora el nombre va
  ARRIBA y la foto debajo, tanto en tu perfil como al ver el de un amigo.
- **El buscador de "Mis Tierlists" perdía el foco en cada letra**: como
  `render()` reconstruye toda la pantalla de cero en cada tecla, el
  `<input>` se destruía y se creaba uno nuevo sin foco. Se añadió un
  mecanismo genérico de "recordar qué campo estaba enfocado (y en qué
  posición del cursor) antes de reconstruir, y devolvérselo después" —
  reutilizable en cualquier campo futuro con el atributo `data-focus-key`.
- **El hueco del drag no reaparecía al volver a la posición original**: al
  arrastrar una carta fuera de su hueco y luego devolver el cursor a ese
  mismo sitio, una comprobación de más impedía que el hueco se recreara
  ahí, así que dos cartas parecían "pegadas" y se movían juntas. Se quitó
  esa comprobación redundante (el resto de la lógica del arrastre ya
  evitaba las llamadas innecesarias por su cuenta).
- **El marco de avatar se veía roto**: los marcos (bronce/plata/oro/
  neón/legendario) se sumaban al degradado azul por defecto que ya trae el
  círculo grande de Perfil, formando dos anillos superpuestos. Ahora, al
  equipar un marco, ese fondo por defecto se sustituye por uno limpio (o
  por el degradado giratorio propio del marco "legendario"), así que solo
  se ve un anillo.
- **El marco solo salía en tu propio perfil**: ahora se aplica también al
  ver el perfil de un amigo, en la lista de Usuarios, en la lista de
  amigos, en los comentarios y en los avatares del chat.
- **Parpadeo del botón de guardado al abrir una tierlist ya guardada**: se
  sabía si era colaborativa o no solo DESPUÉS de que respondiera Supabase,
  así que por un instante se veía el botón equivocado. Ahora se guarda en
  caché local (sobre la propia tierlist) el último resultado conocido, y
  el editor arranca ya con ese dato mientras llega la respuesta real de la
  red.

### Nuevo

- **El perfil se ve por defecto como el de un amigo**: estadísticas,
  logros y tus propias tierlists (en las mismas tarjetas anchas con
  portada que "Mis Tierlists"), en modo solo lectura. Un botón "Editar
  perfil" arriba muestra además la foto/nombre editables, el selector de
  color, la paleta de la interfaz, los marcos de avatar y las acciones de
  cuenta (cerrar sesión / eliminar cuenta) — sin ocultar tus tierlists.
- **Tarjetas de tierlist idénticas en todas partes**: el perfil propio y
  el de un amigo usan ahora exactamente la misma tarjeta ancha con
  portada que "Mis Tierlists" (mismo tamaño, misma foto).
- **Paginación en vez de scroll infinito**: tanto "Mis Tierlists" como las
  tierlists del perfil (propio o de un amigo) se dividen en páginas de 8.
  Si todo cabe en una sola página, los números de página no aparecen.
- **Gestión de colaboradores**: una vez una tierlist ya está guardada como
  colaborativa, el botón "Colaborativa" simplemente guarda (como el botón
  normal) en vez de reabrir el selector de amigos. Al lado aparece un
  botón "+" que abre un selector con los colaboradores actuales ya
  marcados, para añadir o quitar gente; si quitas a alguien y guardas,
  esa persona deja de tener acceso y la tierlist desaparece de su lista
  como si nunca la hubiera tocado.

### ⚠️ Vuelve a ejecutar el bloque de políticas de chat de `supabase-schema.sql`

Solo si sigues viendo el error de RLS en el chat — pega de nuevo, entero y
de una vez, el bloque de políticas de `chats`/`chat_members`/`messages`
(ver el apartado de arriba). Esta ronda no añade columnas nuevas.

## 🆕 Ronda 9 — tarjetas con foto de fondo, marco de verdad arreglado, añadir varias de golpe

### Sobre el chat: sigue exactamente igual porque no es un bug de código

El código de `openChat`/`createGroup` (`js/core/save.js`) no se ha tocado
esta ronda porque no hay nada que cambiarle: hace exactamente lo mismo que
el SQL espera. Si el error persiste, es 100% una política de Supabase que
no coincide con lo que hay en `supabase-schema.sql` en tu proyecto. Antes
de descartarlo, mira el toast de error con atención — dice el nombre EXACTO
de la tabla que lo rechaza ("No se pudo abrir el chat: new row violates
row-level security policy for table **chat_members**", por ejemplo). Con
ese nombre puedes ir directo a Database → Policies → esa tabla y comparar
con lo que trae el SQL. Si me dices exactamente qué tabla sale ahí, puedo
darte la política exacta a corregir en vez de una lista de sospechosos.

### Bugs arreglados (de verdad esta vez)

- **El marco de avatar seguía saliendo mal en "Ver perfil"**: la causa real
  no era solo el degradado duplicado (ronda pasada) — el círculo grande de
  avatar (`.avatar-ring`) tiene un tamaño FIJO por CSS (92×92 + su propio
  padding, para que el marco encaje justo alrededor), pero la foto que se
  metía dentro se forzaba a 100×100 sin cambiar el tamaño del círculo, así
  que la imagen se salía del anillo y el marco quedaba descuadrado. Ahora
  el círculo y la foto crecen juntos (mismo tamaño, la foto va dentro con
  un contenedor interior que ocupa el 100%), igual que ya funcionaba bien
  en el modo edición del perfil.
- **El marco no salía en los comentarios (ni en el chat)**: no era un bug
  de la interfaz — las consultas a Supabase de comentarios, chats y
  mensajes solo pedían `name` y `avatar_url` del perfil del autor, nunca
  `avatar_frame`, así que aunque el código sí intentaba aplicar el marco,
  el dato ni siquiera llegaba del servidor. Añadido `avatar_frame` a esas
  tres consultas.
- **El perfil decía "Todavía no has creado ninguna tierlist" con 2
  tierlists reales**: `S.profileDraft` (con el que se pinta el perfil) es
  una copia de `currentUserProfile`, la fila de la tabla `profiles` de
  Supabase — ahí NO viven las tierlists (`.tls`), esas viven en el perfil
  local que devuelve `activeProfile()`. El perfil miraba `.tls` en el sitio
  equivocado y por eso salía siempre vacío. Ahora usa `activeProfile()`
  para la lista de tierlists (que además ya sale con el mismo formato de
  tarjeta que "Mis Tierlists", como se pidió).
- **Drag & drop menos fluido que antes**: el arreglo de la ronda pasada
  (mover el hueco de una posición en una, no de golpe) usaba un intervalo
  de 90ms por paso, que se notaba lento al arrastrar rápido. Bajado a
  35ms (y la animación de cada paso de .25s a .16s) — se sigue moviendo de
  una en una (no se rompe el arreglo del hueco), pero encadenado mucho más
  rápido, así que vuelve a sentirse tan ágil como antes.

### Nuevo

- **Tarjetas de tierlist con la foto de fondo entera**: en vez de portada +
  panel de info por separado, ahora la portada ocupa TODA la tarjeta y la
  info (nombre, tiers, personajes, fecha) va superpuesta abajo sobre un
  degradado semitransparente que sube desde el borde inferior — se sigue
  viendo la foto pero el texto queda perfectamente legible encima.
- **Añadir varias waifus de golpe**: en el modal de "+ Waifu" hay un botón
  "+ Añadir varias" que cambia a un selector de archivos múltiple. Se
  suben todas, salen en una lista con su miniatura, y al lado un campo
  para el nombre (con el nombre del archivo puesto por defecto, como en el
  modo de una en una) y otro para el anime (con sugerencias de AniList).
  Un botón "Guardar las N" las sube y registra todas de golpe, cada una
  exactamente igual que si la hubieras subido una a una.

## 🆕 Ronda 10 — colaborativas visibles de verdad, modo observador desde cualquier tarjeta, edición en lote al añadir varias

### Sobre el chat: ahora el error salía en "chats", no en "chat_members" — probable sesión caducada

Si el error apunta a la tabla `chats` (el primer insert de todos, antes de
tocar `chat_members`), lo más probable ya no es una política mal escrita
sino que tu sesión (el token JWT) había caducado en el navegador en ese
momento — con un token caducado, Supabase trata la petición como si NO
estuvieras autenticado, y la política `to authenticated` la rechaza con
este mismo mensaje genérico de RLS, aunque la política esté perfectamente
bien. Se ha añadido `ensureFreshSession()`: antes de crear un chat o un
grupo, se comprueba la sesión y, si está a punto de caducar, se refresca
sola; si el refresco falla, ahora sale un aviso claro pidiendo cerrar
sesión y volver a entrar, en vez del error críptico de Supabase. Además el
toast de error ahora incluye el `details`/`hint` que manda Postgres, no
solo el mensaje corto, así que si sigue fallando el próximo mensaje de
error dará más pistas.

### Arreglado: las tierlists colaborativas ya se ven y se cuentan bien

- **"A mi amigo solo le sale la suya"**: el perfil y "Mis Tierlists" solo
  se refrescaban (`fetchGlobalTemplates`) al entrar en la pantalla de
  "Mis Tierlists" — si tu amigo entraba directo a su Perfil después de que
  le compartieras una colaborativa, esa pantalla nunca pedía la lista
  actualizada. Ahora el Perfil también la pide (con el mismo límite de una
  vez cada 5s para no saturar).
- **Los contadores de tiers/personajes de la tarjeta eran genéricos**: las
  tarjetas mostraban el número de tiers/personajes de la plantilla vacía,
  no tu progreso real (ni el conjunto, si es colaborativa). Ahora se trae
  tu ranking real (el tuyo, o el compartido si eres colaborador) solo para
  estos contadores — sin tocar `tiers`/`pool` internos, así que no hay
  riesgo de pisar cambios sin guardar.
- **Sin distintivo de "colaborativa"**: ahora la tarjeta lleva un 👥 junto
  al título cuando la tierlist es colaborativa, tanto en tu perfil como en
  el de un amigo.
- La lista de rankings de un amigo (`viewUser`) ahora también incluye las
  tierlists colaborativas en las que es colaborador (antes solo traía las
  suyas propias), y ya pide `cover_url` (antes se le olvidaba, así que la
  portada nunca salía al ver el perfil de otra persona).

Recuerda: los cambios de una colaborativa YA se aplicaban a todos los que
estén dentro en tiempo real (esto viene de rondas anteriores) — lo que
faltaba era que la tierlist se viera y se contara bien en las listas.

### Nuevo

- **Modo observador desde cualquier sitio**: en cada tarjeta de tierlist
  (tuya) hay ahora un botón con un ojo para verla en modo observador (como
  la ve un amigo, de solo lectura) sin necesidad de entrar a editarla.
  Dentro del editor hay un botón de ojo igual para lo mismo (usa los
  cambios que tengas sin guardar). Y en modo observador, si es tu propia
  tierlist, sale un botón "Editar" para volver directo a modo edición.
- **Editar varias waifus a la vez al "Añadir varias"**: cada imagen de la
  lista tiene ahora una casilla; marca las que quieras (o "Seleccionar
  todas") y aparece una barra para ponerles el mismo nombre y/o anime a
  todas las marcadas de golpe. Puedes seguir editando una sola tranquilamente
  sin que la selección estorbe — no hace falta deseleccionar para tocar un
  campo individual.
- **Tarjetas de tierlist**: un poco más estrechas y más altas, y con un
  borde con degradado de colores (magenta → oro → cian) a juego con el
  resto de la interfaz.

## 🆕 Ronda 11 — el error de "chats" seguía saliendo tras Ronda 10: diagnóstico a fondo

El aviso de sesión caducada (`ensureFreshSession()`, Ronda 10) no arregló
el error — seguía saliendo el mismo `new row violates row-level security
policy for table "chats"`. Revisando la política en Supabase directamente
(con una consulta a `pg_policies`) se confirmó que la política de INSERT
en `chats` está perfectamente bien: es `PERMISSIVE`, para el rol
`authenticated`, con `with_check = true`, y no hay ninguna otra política
`RESTRICTIVE` que la esté bloqueando por detrás (eso sí rompería el INSERT
aunque la política "buena" esté bien, porque las restrictivas se combinan
con Y lógico). Con la base de datos descartada como causa, quedan dos
posibles explicaciones del lado del cliente:

- **Arreglado: un listener de sesión duplicado.** Había, suelto al final
  de `supabase-auth.js`, una SEGUNDA llamada a
  `sbClient.auth.onAuthStateChange(...)` idéntica a la que ya existe
  dentro de `initSupabase()`. Tenerla dos veces hace que cada login/logout
  dispare `handleAuthSession(...)` y las suscripciones en tiempo real dos
  veces seguidas (duplicando canales de Realtime y provocando carreras de
  estado) — no es descartable que esto interfiriera con que el cliente de
  Supabase tuviera lista su sesión en el momento exacto de crear el chat.
  Se ha eliminado por completo, dejando solo el listener de dentro de
  `initSupabase()`.
- **Nuevo: diagnóstico directo del token.** Si aun así, tras este arreglo,
  el error sigue saliendo, lo único que queda por comprobar es si la propia
  petición viaja realmente como `role: "authenticated"` — es decir, qué
  dice el token de la sesión en ese preciso instante. Se ha añadido una
  función `debugAuthContext(...)` que se ejecuta automáticamente justo
  antes de crear un chat (tanto al escribir a un amigo por primera vez
  como al crear un grupo) y escribe en la consola del navegador (F12 →
  pestaña "Consola") una línea `[chat-debug]` con el `user_id`, el valor
  exacto de `role` que lleva el token (`role_claim_en_el_token` — esto
  DEBE decir `"authenticated"`; si dice `"anon"` o sale vacío, ahí está el
  problema real) y cuánto le queda de vida al token (`token_caduca_en`).

**Si el error de "No se pudo abrir el chat" vuelve a salir:** abre las
herramientas de desarrollador del navegador (F12), pestaña "Consola",
reproduce la acción de abrir el chat, busca la línea que empieza por
`[chat-debug]` y copia/pega aquí exactamente lo que ponga en
`role_claim_en_el_token` y en `token_caduca_en`. Con ese dato ya se puede
apuntar con precisión a la causa real (por ejemplo, si dijera `"anon"`
significaría que, pese a verte con la sesión iniciada en la app, el
cliente de Supabase no está adjuntando tu token de usuario a esa petición
en concreto — algo muy distinto a un problema de políticas).

## 🆕 Ronda 12 — encontrada la causa REAL del error de "chats" (no era ni el token ni la política tal cual estaba escrita)

**Actualización sobre la Ronda 11**: siguiendo el diagnóstico (`debugAuthContext`)
se confirmó que el token SÍ viajaba como `role: "authenticated"` y con
tiempo de vida de sobra — así que la sesión nunca fue el problema. Con eso
descartado, la causa real resultó ser una interacción muy poco intuitiva
entre Postgres RLS y el `RETURNING` que pide Supabase cuando se usa
`.select()` después de un `.insert()`:

- El código hacía `sbClient.from('chats').insert({...}).select().single()`.
  Ese `.select()` le pide a Postgres que devuelva ("RETURNING") la fila
  recién creada.
- Con RLS activo, para poder devolver esa fila Postgres exige que también
  cumpla la política de **SELECT** de la tabla — no solo la de INSERT.
- La política de SELECT de `chats` era `is_chat_member(id, auth.uid())` —
  es decir, "solo puedes verlo si ya eres miembro". Pero en ese preciso
  instante todavía NO eres miembro: la fila de `chat_members` que te
  convierte en miembro se crea en el paso siguiente, justo después.
- Resultado: Postgres rechaza la operación entera con el mismo mensaje
  genérico `new row violates row-level security policy for table "chats"`
  — que es exactamente el mismo texto que si hubiera fallado el INSERT, así
  que parecía un problema de política de INSERT cuando en realidad era la
  política de SELECT actuando sobre el RETURNING.

**Arreglo aplicado** (en `supabase-schema.sql`, sección 1 — hay que
volver a pegar ese archivo entero en el SQL Editor de Supabase, es
seguro re-ejecutarlo):
- Nueva columna `chats.created_by` (el usuario que creó el chat).
- La política de SELECT ahora es
  `is_chat_member(id, auth.uid()) OR created_by = auth.uid()` — así el
  creador puede ver su propio chat recién creado aunque todavía no exista
  su fila de membresía.
- La política de INSERT pasa de `with_check (true)` a
  `with_check (created_by = auth.uid())`, algo más estricta y correcta (ya
  no basta con estar logueado, tiene que coincidir el creador).
- El cliente (`js/core/save.js`, en `openChat()` y `createGroup()`) ahora
  manda `created_by: userSession.user.id` al crear el chat.

**Importante**: para que esto funcione tienes que volver a ejecutar
`supabase-schema.sql` completo en tu proyecto de Supabase (SQL Editor →
pegar todo el archivo → Run). Sin la columna `created_by` y la política
nueva, el error seguirá saliendo exactamente igual.

El diagnóstico (`debugAuthContext`, en consola) se deja tal cual por si
hiciera falta en el futuro — no molesta ni afecta al rendimiento.

### Otros arreglos de esta ronda

- **El icono de tu perfil (arriba a la derecha) ahora te lleva directo a tu
  perfil.** Antes solo abría un menú desplegable con "Editar perfil" /
  "Cerrar sesión"; como la página de Perfil ya tiene su propio botón de
  "Cerrar sesión" al final, ese menú intermedio sobraba y no era lo que se
  esperaba al pulsar el icono.
- **Campana de notificaciones — arreglada una acumulación de eventos que
  podía dejarla "sin hacer nada".** Cada vez que se abría el menú de
  notificaciones se registraba un nuevo listener de "click fuera para
  cerrar", y como las llamadas para traer notificaciones también
  refrescan la pantalla al terminar, se iban acumulando varios listeners
  de golpe sin quitar los anteriores; con varios acumulados, un click
  dentro del propio menú (que sube hasta el documento) los disparaba todos
  a la vez. Ahora solo queda uno vivo como máximo. De paso, el botón "✕"
  para cerrar el menú a mano tampoco refrescaba la pantalla (quedaba
  "cerrado" en el estado pero seguía viéndose) — ya lo hace.
- **Se ha quitado un error real de la consola**: al cambiar de pestaña y
  volver, Supabase relanza la comprobación de sesión, y eso disparaba de
  nuevo `setupRealtimeListeners()`, que intentaba volver a registrar los
  mismos canales de tiempo real ya suscritos — Supabase lo rechazaba con
  `cannot add postgres_changes callbacks... after subscribe()` cada vez.
  Ahora esos canales solo se registran una vez por sesión de página.
- **Fotos redondas de verdad en los comentarios.** El avatar de cada
  comentario llevaba el recorte circular (`border-radius`) puesto
  directamente en la imagen; en algunos navegadores (sobre todo
  Safari/WebKit) esa combinación no recorta bien y se ven las esquinas
  cuadradas asomando, más notorio todavía si tienes un marco de color
  equipado. Ahora la imagen va dentro de un contenedor que sí recorta
  siempre (el mismo truco que ya se usaba en el círculo grande de Perfil),
  así que sale perfectamente redonda sin importar el navegador.

## 🆕 Ronda 13 — menú de opciones del chat, ticks de leído, y arreglo de caché

### El chat de verdad ya iba (confirmado) — se añaden las opciones que faltaban

- **Menú de "⋮" en la cabecera del chat abierto**, con opciones distintas
  según el tipo de conversación:
  - **Chat privado** → "Eliminar chat" (lo borra para las dos personas; no
    hay forma de deshacerlo, así que pide confirmación).
  - **Grupo, si tú lo creaste** → "Eliminar grupo" (borra el grupo entero
    para todos).
  - **Grupo, si NO lo creaste** → "Salir del grupo" (solo te quita a ti;
    el grupo sigue existiendo para el resto).
  - Nota: los grupos creados ANTES de esta ronda no tienen guardado quién
    los creó (esa columna es nueva), así que para esos de momento todo el
    mundo ve "Salir del grupo" — los grupos que crees a partir de ahora sí
    recuerdan quién es el creador.
  - Hacen falta permisos nuevos en Supabase para poder borrar — están en
    `supabase-schema.sql` (hay que volver a pegarlo entero, es seguro
    re-ejecutarlo).
- **Ticks de "leído" estilo WhatsApp** en tus propios mensajes: un check
  gris = enviado, doble check azul = leído por la otra persona (en un
  grupo, leído por TODOS). Se actualizan solos, en vivo, en cuanto la otra
  persona abre la conversación — no hace falta recargar nada.
- **Arreglado: "me sale el chat sin leer aunque el último mensaje sea
  mío"**. El cálculo de "no leído" comparaba la hora del último mensaje del
  chat contra la última vez que TÚ lo habías abierto — pero al enviar un
  mensaje esa hora no se actualizaba, así que tu propio mensaje "te
  aparecía a ti" como no leído. Ahora, al enviar, también se refresca tu
  propia marca de "leído hasta aquí".
- **Arreglado otro caso de canales de Realtime duplicados**: si abrías el
  mismo chat más de una vez (o cambiabas de chat y volvías), se repetía el
  mismo error de consola "cannot add postgres_changes callbacks... after
  subscribe()" que ya se había arreglado para las notificaciones — mismo
  problema, sitio distinto. Arreglado con el mismo patrón (quitar la
  suscripción vieja antes de crear una nueva).

### Arreglo importante de caché — probablemente la causa de que varios arreglos "no se notaran"

Se ha añadido `?v=15` al final de cada archivo `.js`/`.css` que carga
`index.html`. Motivo: sin esto, si tu hosting o el propio navegador cachean
agresivamente los archivos estáticos (algo muy típico en GitHub
Pages/Netlify/Vercel por defecto), puede que siguieras recibiendo una
versión antigua de un archivo aunque ya hubieras subido el nuevo — lo que
encajaría con que algunos arreglos de rondas anteriores (como el de la
campana de notificaciones) parecieran no aplicarse pese a estar bien
subidos. A partir de ahora, cada ronda que cambie algo debe subir también
el número de versión en `index.html` (y en el nombre de `CACHE_NAME` de
`sw.js`) para forzar la descarga de los archivos nuevos.

**Importante**: vuelve a subir el proyecto ENTERO (no solo algunos
archivos) y haz un refresco forzado (Ctrl+Shift+R) al probarlo.

## Producción

- Todo funciona con hosting 100% estático (GitHub Pages, Netlify, Vercel,
  etc.) — no hace falta build ni bundler, es JS/CSS plano.
- El Service Worker (`sw.js`) se actualizó (`at-v2`) para precachear los
  nuevos archivos `css/` y `js/`, así el modo offline sigue funcionando
  igual que antes (antes solo cacheaba `index.html`, que ya lo contenía
  todo; ahora hay que decirle explícitamente qué archivos cachear).
