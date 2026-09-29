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

## 🆕 Ronda 14 — repo conectado a GitHub directamente, avatar de comentarios sin marco, y posible causa real de la campana

Desde esta ronda los cambios se suben directamente al repositorio de GitHub
(`git push`), ya no hace falta bajar un zip y subirlo a mano.

- **Avatar de los comentarios sin marco**: el anillo de color del marco
  equipado (oro/plata/neón...) se veía anguloso/como un borde cuadrado a un
  tamaño tan pequeño (34px). Se ha quitado del todo en los comentarios —
  ahí solo sale el círculo limpio de la foto. El marco grande de verdad
  sigue viéndose en la pantalla de Perfil, que es donde tiene sentido.
- **Campana de notificaciones — posible causa real encontrada**: revisando
  tus capturas se ve que tienes **AdBlock** activo en Chrome. Muchas listas
  de filtros de bloqueadores de anuncios ocultan por nombre de clase CSS
  cualquier cosa que "suene" a notificación/popup — es un patrón muy común
  contra los típicos avisos de "activa las notificaciones" de las webs. Es
  muy posible que el menú de la campana se estuviera creando y funcionando
  perfectamente por dentro, pero el propio bloqueador lo escondiera sin
  dar ningún error en consola (por eso no se veía nada raro al mirar el
  código). Se han renombrado todas las clases CSS relacionadas
  (`notif-menu`, `notif-badge`, `notif-item`, etc.) a nombres propios
  (`at-alerts-panel`, `at-bell-badge`, `at-alert-row`...) que no deberían
  coincidir con esos filtros. De paso se añadió una línea en la consola
  (`[campana] abriendo/cerrando menú de notificaciones`) que confirma que
  el click se procesa — si sigue sin verse el menú después de esto, esa
  línea en consola (F12) dirá si el problema es del bloqueador (el log
  aparece pero no se ve el menú) o de otra cosa (el log ni aparece).

## 🆕 Ronda 15 — causa REAL de la campana encontrada y arreglada (era CSS, no JS ni AdBlock)

Con la línea de consola de la Ronda 14 se pudo confirmar (captura de pantalla
del propio usuario) que el `[campana] abriendo menú de notificaciones` /
`[campana] cerrando menú de notificaciones` alternaba perfectamente en cada
click. Eso demuestra al 100% que el JavaScript y el estado (`S.notifMenu`)
funcionan bien — el panel se estaba creando en el DOM en cada click, tal y
como debía. El problema tenía que ser, por tanto, puramente visual.

- **Causa real**: el panel `.at-alerts-panel` usaba `position:absolute`, que
  se posiciona en relación al ancestro con posición "sticky/relative/fixed"
  más cercano — en este caso el `<nav>`, que además tiene
  `backdrop-filter:blur(14px)`. Esa combinación (`position:sticky` +
  `backdrop-filter`) crea en algunos navegadores un nuevo "contexto de
  apilamiento" (stacking context) que puede hacer que elementos hijos
  posicionados de forma absoluta se rendericen de forma inconsistente,
  detrás de otras capas, o con recortes raros — sin dar ningún error, ya
  que no es un fallo de JavaScript sino puramente de composición visual del
  navegador.
- **Arreglo**: `.at-alerts-panel` ahora usa `position:fixed` (siempre
  relativo a la ventana del navegador, nunca depende de ningún ancestro) con
  coordenadas fijas (`top:56px;right:16px`) y un `z-index` mucho más alto
  (`9999` en vez de `400`), además de `max-height:70vh` y scroll propio para
  que quepa bien en pantallas pequeñas. Así el menú no puede volver a
  quedar invisible por ninguna interacción con el `<nav>`.
- Esto también descarta definitivamente la teoría de AdBlock de la Ronda
  14 como causa — las clases ya se habían renombrado y el bug seguía sin
  arreglarse, así que confirmaba que la causa era otra (esta de aquí).

## 🆕 Ronda 16 — al recargar la página se iba a `xcelim.github.io/` y daba 404

- **Causa real**: el router (`js/core/router.js`) generaba rutas absolutas
  pensadas para vivir en la **raíz** de un dominio (`/`, `/tierlists`,
  `/ajustes`...), pero el sitio se despliega en GitHub Pages bajo el
  subdirectorio del repositorio (`https://xcelim.github.io/tier-list/`). Como
  la URL se sincroniza automáticamente en cada `render()`, la barra de
  direcciones se reescribía sola a `https://xcelim.github.io/` (perdiendo el
  `/tier-list`) sin que se notara nada raro, porque cambiar la URL con
  `history.pushState` no recarga la página. El problema saltaba al pulsar
  recargar (F5) estando en esa URL: ahí el navegador sí pide esa dirección
  de verdad al servidor, y como `https://xcelim.github.io/` no es ningún
  repositorio tuyo, GitHub Pages responde con su 404 genérico ("There isn't
  a GitHub Pages site here").
- **Arreglo**: el router ahora calcula un `BASE_PATH` (el prefijo real de
  despliegue, `/tier-list/`) una sola vez a partir de la URL con la que se
  cargó la página, y lo usa en todas las rutas que genera y que lee. Ya no
  depende de estar en la raíz del dominio.
- **De paso**: `404.html` era una copia manual (y ya desactualizada) de
  `index.html` con rutas relativas, que además se rompía en rutas internas
  profundas (p.ej. `/tier-list/editor/abc123`). Se ha sustituido por el
  truco estándar de "SPA fallback" para GitHub Pages: `404.html` ahora solo
  redirige al `index.html` real codificando la ruta pedida, e `index.html`
  la decodifica y restaura antes de arrancar nada. Así el `index.html` que
  se sirve siempre está al día (mismos ficheros, misma versión de caché) y
  entrar directo (o recargar) en cualquier ruta interna de la app también
  funciona.

## 🆕 Ronda 17 — campana arreglada de verdad, parpadeo al recargar en páginas internas, y marcos que "se reiniciaban"

- **Campana de notificaciones — causa real (take 2)**: el cambio de la
  Ronda 15 (`position:fixed` en vez de `absolute`) no fue suficiente. El
  panel se seguía añadiendo como hijo de `<nav>`, y `<nav>` tiene
  `backdrop-filter` — que, igual que `transform`/`filter`/`perspective`,
  crea un "containing block" **también** para los descendientes
  `position:fixed` (no solo para `position:absolute`, como se pensaba). Es
  decir: el panel nunca llegó a escapar de verdad de `<nav>`, así que seguía
  posicionándose (mal, o invisible) en relación a él. Arreglo de verdad:
  el panel ahora se cuelga directamente de `<body>` (que no tiene ningún
  `filter`/`transform`), fuera del todo del árbol de `<nav>`, así que
  `position:fixed` funciona tal cual se espera.
- **Parpadeo Home → página real al recargar en `/usuarios`, `/tierlists` o
  `/ajustes`**: antes, la ruta de la URL se guardaba para aplicarse solo
  DESPUÉS de confirmar la sesión de Supabase (que es asíncrono y tarda un
  instante) — mientras tanto, el primer render() pintaba Home siempre, por
  eso se veía el salto. Ahora esa ruta se aplica de forma optimista nada
  más leer la URL, antes de saber si hay sesión, así el primer render ya
  sale bien; si al final resulta que no había sesión iniciada, se deshace
  automáticamente.
- **Los marcos animados (legendario, aura cromática) parecían "reiniciarse"
  con cualquier click**: esto no era nuevo ni un efecto secundario de los
  cambios anteriores — pasa siempre, porque `render()` destruye y
  reconstruye TODO el DOM en cada llamada (cualquier botón lo dispara), así
  que un avatar con marco es un elemento nuevo cada vez y su animación CSS
  (un giro infinito) vuelve a arrancar desde el principio. Se notaba más al
  abrir/cerrar notificaciones porque se estaba comparando el antes/después
  rápido. Arreglo sin tocar el motor de render: dos variables CSS se
  mantienen sincronizadas con la fase actual de cada animación según el
  reloj real, y se usan como `animation-delay` negativo — así un marco
  recién creado arranca ya en el punto de giro que le toca, y el efecto se
  ve continuo aunque el elemento se esté recreando por debajo.

## 🆕 Ronda 18 — probado con 2 cuentas: campana con parpadeo doble, fuga de tierlists ajenas, marco perdido en comentarios y selector de marco sin vista previa

- **Campana con "parpadeo doble"**: al abrir el panel, `fetchNotifications()`
  (solicitudes de amistad) y `fetchAppNotifications()` (actividad) se
  disparaban en paralelo, y cada una llamaba a su propio `render()` en
  cuanto terminaba — como no siempre resuelven en el mismo instante, el
  panel (que ahora vive fuera de `<nav>`, ver Ronda 17) se destruía y volvía
  a crearse dos veces seguidas, un parpadeo visible (el mismo tipo de bug
  que hubo con el chat por duplicar renders). Ahora ambas aceptan un
  parámetro `quiet` para no renderizar ellas solas, y el click de la
  campana espera (`Promise.all`) a que las dos terminen antes de
  renderizar una única vez.
- **Ver el perfil de otro usuario (no como amigo) mostraba tierlists que él
  nunca ha guardado**: la consulta de `viewUser()` traía, además de sus
  propios rankings, cualquier tierlist donde ese usuario fuera simplemente
  COLABORADOR de una tierlist de OTRA persona (con la idea de mostrar
  tierlists compartidas) — así que en el perfil de la cuenta B aparecían
  tierlists que en realidad son tuyos (tú las creaste, él solo colabora),
  como si él las hubiera guardado. Se ha quitado esa parte: ahora solo
  salen los rankings que esa persona ha guardado de verdad, igual que ya
  funcionaba bien en la vista de "perfil de un amigo".
- **El marco de avatar volvió a los comentarios**: en la Ronda 14 se había
  quitado del todo porque se veía como un borde cuadrado — pero eso pasaba
  porque entonces la foto todavía no se recortaba en un círculo de verdad.
  Ahora que el recorte circular funciona bien, se ha vuelto a añadir sin
  ese problema.
- **El selector de marco en Perfil no se previsualizaba, había que "Guardar
  cambios" para verlo**: la causa real era que el selector aplicaba el
  cambio DIRECTAMENTE en Supabase al momento (bien guardado, pero la
  vista previa en pantalla usa una copia aparte — `S.profileDraft` — para
  poder deshacer cambios de nombre/color con "Descartar", y esa copia
  nunca se enteraba del cambio hasta que "Guardar cambios" la tiraba y
  creaba una nueva ya actualizada). Ahora el marco se comporta exactamente
  igual que el nombre o el color: se previsualiza al clicar (actualiza el
  borrador en memoria) y solo se aplica de verdad al pulsar "Guardar
  cambios" (que ahora sí incluye `avatar_frame` en el update a Supabase).

## 🆕 Ronda 19 — corregido: la fuga de tierlists SÍ era otra cosa, y el marco de la esquina nunca se veía

- **La "fuga" de tierlists en el perfil de otro usuario no era el filtro de
  colaboradores** (la Ronda 18 se equivocó ahí): si A guarda una tierlist y
  añade a B como colaborador, DEBE salirle a los dos, tanto en "Usuarios"
  como viendo su perfil "como amigo" — se ha devuelto ese criterio. La
  causa real era una **condición de carrera** en `viewUser()`: al navegar
  rápido de un perfil a otro (p.ej. verte a ti mismo en la lista de
  "Usuarios" y entrar enseguida al perfil de otra cuenta), la respuesta de
  la petición del perfil ANTERIOR podía llegar tarde y pisar los datos del
  perfil que se está viendo ahora — así que tierlists tuyas podían acabar
  apareciendo en el perfil de otra persona sin que él tuviera nada que ver.
  Ahora, si la respuesta llega cuando ya se está viendo OTRO perfil
  distinto, se descarta en vez de aplicarse.
- **El avatar de la esquina (arriba a la derecha, en la barra de
  navegación) nunca mostraba el marco equipado, fuera cual fuera**: la
  causa era un conflicto de especificidad en CSS. Ese círculo lleva las
  clases `profile-btn active`, y la regla `.profile-btn.active` (dos
  clases) tiene MÁS especificidad que `.frame-gold`/`.frame-neon`/etc. (una
  clase) — así que siempre ganaba ella para la propiedad `box-shadow`
  (que es la que dibuja el aro de color del marco), sin importar el orden
  en la hoja de estilos ni qué marco tuvieras puesto. Se han añadido
  reglas de tres clases (`.profile-btn.active.frame-XXX`) que sí ganan de
  verdad y dejan que el marco equipado se vea en la esquina, igual que en
  el resto de la app.

## 🆕 Ronda 20 — la campana seguía parpadeando dos veces (causa real, take 3)

- Esperar a que las dos peticiones terminaran antes de renderizar (Ronda 18)
  ayudó pero no lo arregló del todo. La causa de fondo: al principio de
  `Nav()` había un `if(_notifPanelEl){ _notifPanelEl.remove(); ... }` que
  destruía y recreaba el nodo del panel en **cada** `render()` de la app
  mientras estuviera abierto — no solo al llegar datos nuevos, sino con
  cualquier interacción en cualquier otra parte de la app (la app entera se
  vuelve a renderizar con casi cualquier click, ver el FIX sobre el foco en
  `render.js`). Como `.at-alerts-panel` tiene una animación de entrada
  (`slideDown`), recrear el nodo hacía que esa animación se repitiera cada
  vez que un render() de cualquier tipo ocurría con el panel abierto — de
  ahí el "aparece dos veces". Ahora, si el panel ya existe y sigue en el
  DOM, se reutiliza el mismo nodo (solo se reemplazan sus hijos); el nodo
  solo se crea e inserta de cero la primera vez que se abre, así la
  animación de entrada juega una única vez por apertura.

## 🆕 Ronda 21 — móvil a fondo (sin tocar el comportamiento de escritorio)

Copia de seguridad tomada antes de empezar (rama `backup-before-mobile-round21`
en el repo remoto + tarball local), por si hacía falta restaurar.

- **Ningún efecto `:hover` con movimiento se queda "pegado" al tocar en
  móvil**: en una pantalla táctil no existe un puntero "encima" en reposo —
  el navegador activa `:hover` con el primer toque y no lo quita hasta que
  tocas otra cosa, así que cualquier tarjeta/botón con `transform` en su
  regla `:hover` se quedaba visualmente desplazado/rotado/agrandado después
  de tocarlo una vez. Esto era la causa de "los bordes cromáticos se mueven
  raro" en las tarjetas de Inicio, y pasaba también (en menor medida) en
  tarjetas de tierlist, tarjetas de usuario, botones, el interruptor de
  tema, el avatar de perfil, las reacciones, etc. Se han revisado TODAS las
  reglas `:hover` del CSS que mueven algo (`transform`) y se han envuelto en
  `@media (hover:hover) and (pointer:fine)`, que solo es verdad en
  dispositivos con un puntero real tipo ratón. En escritorio no cambia
  absolutamente nada (mismas reglas, mismo comportamiento); en táctil esas
  reglas directamente no existen, así que no hay nada que se pueda quedar
  "pegado".
- **`html{overflow-x:hidden}`** añadido junto al ya existente
  `body{overflow-x:hidden}`, para que ningún resto de desplazamiento lateral
  pueda colarse en un móvil que use `<html>` como elemento de scroll en vez
  de `<body>`.
- **Arrastrar y soltar personajes en el editor, rehecho para táctil**:
  - Antes, tocar una carta para hacer scroll por la página empezaba un
    "drag" al instante (igual que con el ratón), así que era imposible
    desplazarse por una tierlist larga sin mover personajes sin querer.
    Ahora, en pantallas táctiles, hay que **mantener pulsado un momento**
    (con una vibración corta de confirmación y la carta iluminándose) antes
    de que se "agarre" de verdad; si el dedo se mueve antes de eso, se
    entiende que querías hacer scroll y no se arma ningún arrastre. El
    ratón no cambia: se sigue agarrando al instante, como siempre.
  - Una vez agarrada, se bloquea el scroll del navegador solo durante ese
    gesto concreto (con `preventDefault` en el primer movimiento tras
    armarse, y no antes), para que el propio navegador no le "robe" el
    gesto al drag a medio camino.
  - **Arreglado "se queda congelado en medio de la pantalla"**: si el
    navegador cancelaba el gesto por su cuenta (`pointercancel`, típico en
    móvil ante un gesto del sistema o multitáctil), antes nunca se escuchaba
    ese evento y el personaje flotante se quedaba clavado donde estaba el
    dedo, sin poder soltarlo en ningún sitio. Ahora ese evento limpia el
    arrastre igual que si se hubiera soltado.
- El botón de eliminar carta de una tierlist (antes solo visible al pasar
  el ratón por encima) y los botones de acción de las tarjetas de tierlist
  (`.tlca`, editar/eliminar) ahora se quedan siempre visibles en pantallas
  táctiles, ya que ahí no existe forma de "pasar el ratón por encima" para
  revelarlos.

## 🆕 Ronda 22 — bug real de "Añadir varias" + últimos retoques móviles

- **BUG REAL encontrado**: el helper `h()` (el que construye toda la
  interfaz sin `innerHTML`) hacía siempre `el.setAttribute(k, v)` para
  cualquier propiedad que no fuera `style`/`onX`/`class`/`html` — incluido
  `checked` y `disabled`. El problema es que estos son atributos
  booleanos de verdad: al HTML le da igual el texto que lleve el atributo,
  solo mira si ESTÁ presente o no. Así que `checked:false` se traducía en
  `setAttribute('checked','false')`, y esa cadena "false" no vacía nada:
  el navegador ve el atributo presente igual y marca la casilla. Por eso,
  en "Añadir varias", **todas las casillas salían marcadas desde el
  principio pasara lo que pasara en el código**, "Seleccionar todas" se
  veía ya activada, y la fila para aplicar nombre/anime a las
  seleccionadas de golpe nunca llegaba a aparecer (se basa en contar
  cuántas tienen `_selected=true` de verdad, que seguía en `false` por
  debajo del checkbox mal pintado — de ahí que marcar o desmarcar pareciera
  no hacer nada). Exactamente el mismo motivo dejaba **las flechas de
  paginación de Tierlists deshabilitadas para siempre** en cuanto se
  pintaban una vez con `disabled:false`. Arreglado en el propio helper:
  ahora estas propiedades se fijan como propiedad real del elemento
  (`el.checked = v`), no como atributo de texto.
- Con eso arreglado, el flujo de "Añadir varias" ya funciona como se pedía:
  las casillas empiezan sin marcar, y al marcar varias aparece una fila
  para escribir un nombre y/o anime que se aplica a todas las
  seleccionadas de golpe con un botón.
- Al escribir el anime en "Añadir varias" ahora sale el mismo desplegable
  con la portada del anime que ya había al añadir una waifu sola (antes
  usaba un `<datalist>` nativo del navegador, que solo puede mostrar texto
  plano, sin imagen, así que costaba más distinguir animes con títulos
  parecidos). Ese desplegable cuelga de `<body>` (como el panel de
  notificaciones) para no quedar recortado por el scroll de la lista de
  filas, y se limpia solo al cerrar el modal para no dejar nada huérfano.
- El título del home ya no se ve "cortado" por la franja roja en móvil: esa
  franja tenía una posición fija en píxeles pensada para el tamaño de letra
  de escritorio; en pantallas donde la letra se hace más pequeña
  (`font-size:min(9vw,60px)`) se comía media palabra. Ahora escala con la
  misma fórmula que la letra, así que recorta siempre el mismo trocito
  relativo del título, en cualquier tamaño de pantalla (en escritorio no
  cambia nada).
- Arreglado el menú de inicio (Tierlists/Usuarios/Perfil) saliéndose ~40px
  por cada lado de la pantalla en móvil: la versión de escritorio fija un
  margen negativo con `!important`, y la regla pensada para anularlo en
  móvil no llevaba también `!important`, así que perdía siempre pese a
  venir después — el motivo real del "se ve fatal, corta por los lados".
- Nav más compacto en pantallas muy estrechas (≤360px, tipo iPhone SE):
  antes el logo + pestaña + los 4 iconos de la derecha no cabían en una
  fila y el avatar se salía sin poder tocarlo.
- Arreglado el drag de personajes que se quedaba "atascado" en cuanto
  aparecía cualquier indicio de scroll: `.tc`/`.pc` tenían
  `touch-action:auto`, pensado para poder scrollear con normalidad
  mientras se espera la pulsación larga — pero `touch-action` se fija UNA
  SOLA VEZ al tocar y no se puede cambiar a mitad de gesto. Si el dedo
  temblaba lo más mínimo durante esos 400ms de espera, el navegador podía
  arrancar un scroll nativo por su cuenta, y una vez arrancado ningún
  `preventDefault()` posterior lo paraba ni se lo devolvía al drag — de ahí
  "no puedo moverlas porque detecta que estoy scrolleando" y el personaje
  quedándose congelado. Ahora `touch-action:none` desde el principio (el
  navegador nunca scrollea él solo aquí) y, mientras se decide si es
  pulsación larga o solo querían deslizar, el scroll se replica a mano; una
  vez agarrada la carta, solo se scrollea llevándola al borde de arriba o
  abajo de la pantalla (auto-scroll ya existente), nunca deslizando sin
  más con la carta agarrada.

## 🆕 Ronda 23 — arreglo real del bloqueo de scroll al arrastrar en móvil

- **BUG REAL encontrado**: el arreglo de Ronda 22 para poder scrollear
  mientras se espera la pulsación larga (`touch-action:none` + replicar el
  scroll a mano) tenía un fallo escondido: el código que reenvía el scroll
  estaba condicionado a `if(_lpT && !_md)` — es decir, "solo mientras el
  temporizador de pulsación larga siga vivo". El problema es que ESE MISMO
  bloque de código cancela ese temporizador (`_lpT = null`) en cuanto el
  dedo se mueve más de 10px desde donde empezó a tocar — algo que pasa casi
  en el primer movimiento de cualquier deslizamiento real para hacer
  scroll. En el SIGUIENTE `pointermove`, la condición `_lpT && !_md` ya era
  falsa (porque `_lpT` acababa de quedar a `null`), así que el código caía
  directo a `if(!_md)return;` sin hacer nada: ni `preventDefault()`, ni
  scroll manual. Resultado: el scroll avanzaba un solo "tick" y luego se
  congelaba en seco durante el resto del gesto (hasta soltar el dedo) — el
  "no puedo scrollear porque se frena si scrolleo encima de una waifu"
  reportado, confirmado con un test automatizado que mostraba el scroll
  parándose después de 20px de los 100px de movimiento simulados.
- **Arreglo**: ahora hay una variable nueva, `_touchWaiting`, que solo
  significa "el dedo sigue tocando y todavía no se ha agarmado ninguna
  carta" — completamente independiente de si el temporizador de pulsación
  larga (`_lpT`) sigue vivo o ya se canceló. El reenvío manual del scroll
  se hace mientras `_touchWaiting` sea verdad, así que cancelar el
  temporizador de pulsación larga (que solo decide si se arma el drag) ya
  no apaga también el scroll. Verificado con un test automatizado que
  simula 5 movimientos de deslizamiento seguidos: antes solo el primero
  movía la página (20px de 100px esperados), ahora los 5 la mueven
  correctamente (100px de 100px).
- Puede scrollearse desde cualquier punto de la pantalla en todo momento
  salvo cuando ya se ha agarrado una carta de verdad (tras completarse la
  pulsación larga), que es el comportamiento pedido.

## 🆕 Ronda 24 — vídeo real en el móvil: nav cortado, borde raro, drag a tirones y scroll tosco

Con un vídeo grabado directamente del móvil se confirmaron 4 problemas más,
todos con causa real encontrada y arreglada:

- **Avatar/perfil cortado en el borde derecho del nav**: el vídeo lo mostró
  clarísimo — el círculo del avatar aparecía partido por la mitad justo en
  el borde de la pantalla. La Ronda 22 solo compactaba el nav por debajo de
  360px, asumiendo que la inmensa mayoría de móviles estaba por encima —
  pero de hecho la mayoría de Android actuales miden entre 360 y 430px
  (CSS px), justo donde el logo + "Mis Tierlists" + tema + campana + chat +
  avatar no cabían en una fila y el avatar se salía. Arreglado: el umbral
  de compactado se amplía a 480px, y además `<nav>` ahora puede deslizarse
  en horizontal (`overflow-x:auto`, oculto visualmente) como red de
  seguridad — si algún dispositivo concreto (fuente distinta, texto del
  sistema más grande, etc.) todavía no cupiera entero, el avatar sigue
  siendo alcanzable deslizando en vez de quedar cortado e imposible de
  tocar, que es lo que pasaba antes.
- **Borde cromático "raro" en los paneles del home en móvil** (correcto en
  escritorio): el anillo animado usaba `inset:-60%`, un porcentaje que se
  calcula distinto para cada eje (ancho para izquierda/derecha, alto para
  arriba/abajo). En escritorio los paneles son altos y estrechos
  (~cuadrados), así que salía casi un círculo perfecto y el degradado
  giraba de forma uniforme. En móvil los paneles son muy anchos y bajos
  (100% del ancho, 150px de alto) — el mismo cálculo generaba una elipse
  muy achatada, y al girar se veía "correr" rápido por los bordes cortos y
  casi no moverse por los largos: el "movimiento raro" reportado. Arreglo:
  ahora es un cuadrado de verdad (mismo tamaño en ambos ejes, en `vmax`)
  centrado en el panel, así que gira como un círculo perfecto sea cual sea
  la forma del panel — verificado comparando capturas del anillo en varios
  instantes, ahora rota de forma uniforme por los 4 lados.
- **Arrastrar personajes "va to petao" (a tirones)**: la carta flotante se
  movía cambiando `style.left/top` en cada `pointermove`, lo que obliga al
  navegador a recalcular el layout antes de poder pintar — en un móvil de
  gama media/baja se nota como tirones. Cambiado a
  `transform:translate3d(...)`, que solo mueve una capa ya compuesta (GPU),
  sin layout ni repintado — la técnica estándar para arrastrar con
  fluidez. Además, ahora los `pointermove` del drag ya armado se agrupan en
  un único `requestAnimationFrame` por fotograma en vez de procesar cada
  evento por separado (el táctil puede disparar más eventos por segundo de
  los que la pantalla pinta fotogramas).
- **Al soltar la carta, tardaba unos segundos en colocarse**: el drop
  dispara un `render()` completo (reconstruye toda la pantalla — el motor
  de renderizado rehace todo el DOM en cada cambio), que en una tierlist
  con muchos personajes puede tardar un poco: la carta flotante y el hueco
  se quedaban a la vista, congelados, mientras tanto. Ahora se quita toda
  huella visual del arrastre (carta flotante, hueco, resaltados) ANTES de
  disparar ese render, así que la carta desaparece al instante al soltar
  el dedo en vez de quedarse "atascada" en el aire.
- **De regalo, se scrollea "muy tosco" al deslizar sobre una carta**: el
  scroll a mano de Ronda 23 movía la página exactamente lo que se movía el
  dedo y nada más — al soltar, se frenaba en seco, sin la inercia que sí
  tiene el scroll nativo tras un "deslizón" rápido. Ahora se guarda la
  velocidad del dedo justo antes de soltar y se sigue deslizando con un
  frenado suave, igual que el scroll normal del navegador.

## 🆕 Ronda 25 — el Visor en móvil ya no bloquea el scroll + modo sin conexión

- **En el Visor (ver una tierlist como observador) no se podía scrollear si
  se pulsaba encima de un personaje, en móvil**: la clase CSS `.tc` (carta
  de personaje) llevaba `touch-action:none` porque en el Editor esa misma
  clase se usa para las cartas arrastrables, y el JS del drag necesita
  desactivar el scroll táctil nativo para poder moverlas él mismo a mano.
  El Visor reutiliza esa clase para sus cartas de solo lectura, pero no
  tiene ningún JS de arrastre que compense — así que el scroll se quedaba
  bloqueado sin motivo en cuanto el dedo tocaba una carta. Arreglado con
  una clase nueva, `tc-view`, solo para las cartas del Visor, que fuerza
  `touch-action:auto` — el scroll vuelve a funcionar tocando en cualquier
  parte de la pantalla, incluidas las cartas.
- **Modo sin conexión**: si no hay internet al abrir la página (o se pierde
  la conexión durante la sesión), la app ya no se queda a medias intentando
  hablar con el servidor. En su lugar:
  - El nav muestra un aviso "📴 Sin conexión" en vez de la campana, el
    chat y el avatar de perfil (todas esas cosas necesitan red de verdad).
  - En el Home, solo el bloque "Tierlists" queda disponible; "Usuarios" y
    "Perfil" se ven en gris y avisan de que no están disponibles sin
    conexión si se pulsan (entrar ahí llevaría a una pantalla rota o a un
    guardado que fallaría en silencio).
  - Se pueden ver las tierlists propias que ya estaban guardadas en el
    dispositivo, en modo Visor de solo lectura (reutilizando el mismo
    Visor que ya existía para ver tierlists de otras personas), incluyendo
    los personajes personalizados. Reacciones y comentarios se ocultan
    (necesitan red).
  - El Service Worker ahora también guarda en caché las imágenes de
    personajes ya vistas una vez (en una caché aparte que sobrevive a
    futuras actualizaciones de versión), para que sigan viéndose sin
    conexión.
  - En cuanto vuelve la conexión (o se recarga la página con conexión), la
    app vuelve a funcionar con total normalidad — no hay que hacer nada
    manualmente.

## 🆕 Ronda 26 — el modo sin conexión no mostraba ni el nombre del tier ni las waifus

Probando la Ronda 25 en el móvil de verdad, salía "?" en cada tier en vez de
"S"/"A"/"B"... y ninguna imagen de personaje se veía (huecos en negro). Dos
bugs distintos, los dos con causa real:

- **"?" en vez del nombre del tier**: al traducir una tierlist propia al
  formato que espera el Visor, se leía el nombre del tier de un campo que
  nunca existió (`t.name`) en vez del que de verdad se usa en todas partes
  del código — al guardar, al subir a Supabase, al sincronizar — que es
  `t.label`. Con el campo equivocado, siempre salía `undefined` y el "?" de
  repuesto. Corregido a leer `t.label`.
- **Ninguna waifu se veía**: las imágenes de los personajes se piden a
  Supabase Storage cuando hacen falta, y el Service Worker solo las guarda
  en caché la PRIMERA vez que de verdad se piden con conexión (ver Ronda
  25). Si nunca se había abierto esa tierlist en concreto con red desde que
  se implementó esto, sus imágenes sencillamente no estaban en la caché
  todavía — de ahí el hueco en blanco. Arreglado adelantando el trabajo, tal
  y como se pidió ("descarga en el móvil las tierlists de modo observar, no
  creo que ocupen mucho"): mientras haya conexión, justo después de cargar
  tus tierlists y cada vez que guardas una, la app descarga en segundo plano
  las imágenes de los personajes que ya tengas colocados en tus propias
  tierlists (no el catálogo entero, solo lo que de verdad puede verse en el
  Visor) y las guarda en la misma caché que usa el modo sin conexión. Así,
  la próxima vez que abras el Visor sin conexión, las imágenes ya están
  ahí aunque sea la primera vez que ves esa tierlist en modo observador ese
  día.

## 🆕 Ronda 27 — la descarga por adelantado tardaba más de "unos segundos"

Con varios personajes colocados y conexión de móvil normal, la descarga por
adelantado de imágenes de la Ronda 26 podía tardar de sobra más que "unos
segundos" en terminar, porque pedía las imágenes UNA A UNA, en fila,
esperando a que cada una terminase antes de pedir la siguiente. Cambiado a
pedirlas en paralelo (varias tandas de 8 a la vez), bastante más rápido en
total sin saturar la conexión.

También se confirma que los nombres personalizados de los tiers (cuando
renombras "S"/"A"/etc. a lo que quieras con el botón ✏) ya salían bien
arreglados desde la Ronda 26: se guardan en el mismo campo (`label`) que se
arregló entonces, así que cualquier nombre que le hayas puesto a un tier
sale tal cual en el modo Visor sin conexión.

## 🆕 Ronda 28 — botón "Descargar" manual en el modo Visor

Pedido explícito: poder forzar la descarga de una tierlist concreta para
verla sin conexión, con control y aviso de cuándo termina, en vez de fiarse
solo de la descarga automática en segundo plano (Ronda 26/27).

- Nuevo botón "⬇ Descargar" en el modo Visor (observador), que solo
  aparece cuando estás viendo una tierlist **tuya** — normal o
  colaborativa, en cualquiera de las dos participes — y hay conexión de
  verdad (sin red no hay nada que traer). Nunca aparece viendo la tierlist
  de otra persona.
- Al pulsarlo, descarga de verdad las imágenes de todos los personajes
  colocados en esa tierlist (forzando a traerlas de la red aunque ya
  estuvieran en caché, por si la imagen de algún personaje cambió), y avisa
  con un mensaje cuando termina ("✓ [nombre] lista para verse sin
  conexión (N imágenes)"). El botón se queda como "Descargando..." mientras
  tanto.
- El nombre, color y orden de cada tier, y la posición de cada personaje,
  no hace falta "descargarlos" aparte — ya se guardan solos en el
  dispositivo en cuanto guardas algo en el editor. Descargar solo se ocupa
  de lo único que de verdad requiere red: las imágenes.
- Como pidió el usuario ("no vamos a descargar siempre lo mismo, sustituye
  la anterior"): al terminar, se limpia del almacén de imágenes cualquiera
  que ya no use NINGUNA de tus tierlists ahora mismo (por ejemplo la de un
  personaje que quitaste de un tier) — así la descarga no se va acumulando
  sin límite. Esta misma limpieza se aplica también tras la descarga
  automática en segundo plano al abrir la app, no solo al pulsar el botón.
  Una imagen que SÍ siga usando otra de tus tierlists nunca se borra.

## 🆕 Ronda 29 — la descarga para sin conexión ya es 100% a tu elección

Pedido explícito tras preguntar por el funcionamiento del botón "Descargar":
"a lo mejor no se quiere tener todas descargadas, solo las que me
interesen". Hasta ahora, aunque no pulsaras "Descargar", la app igualmente
bajaba sola, en segundo plano, las imágenes de TODAS tus tierlists cada vez
que abrías la app o guardabas algo (Rondas 26/27) — el botón solo lo
forzaba al momento, no era el único disparador.

Quitada esa descarga automática por completo. Ahora:

- **Nada se descarga** hasta que pulsas "Descargar" en una tierlist
  concreta, desde el modo Visor. Si no la descargas, esa tierlist saldrá
  sin imágenes de personajes al verla sin conexión.
- La limpieza de imágenes sobrantes (las de un personaje que ya no está
  colocado en ninguna de tus tierlists) sigue pasando sola al abrir la
  app, sin que haga falta pulsar nada — pero esto nunca descarga nada
  nuevo, solo borra lo que ya no hace falta, así que no contradice el
  "solo lo que me interesa".

## 🆕 Ronda 30 — "Descargar" decía que no había personajes (sí los había) + pasar solo al Visor si se corta la conexión editando

- **Bug real de fondo, encontrado al investigar por qué "Descargar" decía
  "esta tierlist todavía no tiene personajes colocados"**: cada vez que se
  abría la app (o se refrescaban las plantillas), `fetchGlobalTemplates`
  sobreescribía la copia local de CUALQUIER tierlist con la estructura
  compartida de la nube (`tiers_config`, que solo trae el nombre/color de
  cada tier) — pero esa estructura NUNCA incluye qué personajes hay
  colocados en cada uno, eso vive aparte, en tu ranking personal. El
  resultado: la copia guardada en el dispositivo se quedaba con los tiers
  vacíos casi todo el rato, hasta la próxima vez que se guardara desde el
  editor. Como "Descargar" (y el modo Visor sin conexión) leen de esa copia
  local, por eso parecía que la tierlist no tenía nada. Arreglado
  combinando bien las dos fuentes: si ya hay un ranking tuyo guardado en la
  nube, se usa esa estructura completa (viaja entre tus dispositivos); si
  no, se actualiza el nombre/color de cada tier pero SIN borrar los
  personajes que ya tuvieras guardados localmente. De paso, "Descargar"
  ahora también usa directamente lo que se ve en pantalla en ese momento en
  el modo Visor, por si acaso, en vez de depender solo de la copia local.
- **Si se corta la conexión mientras estás en el editor, ahora pasa solo al
  modo Visor** de esa misma tierlist (pedido explícito, "para evitar
  problemas"): seguir editando sin red es arriesgado, porque el guardado
  con la nube fallaría y podría generar conflictos al recuperar la conexión
  en otro dispositivo más tarde. En el momento en que el navegador detecta
  que se ha quedado sin conexión, se guarda automáticamente lo que
  tuvieras en el editor (nunca se pierde, se queda en este dispositivo) y
  se pasa al modo Visor de solo lectura, tal cual se había quedado en
  pantalla.

## 🆕 Ronda 31 — "Descargar" ya solo trae los cambios, no todo de nuevo

Pedido explícito: "a partir de la segunda vez no es óptimo, deben
descargarse solo los cambios — si se elimina una se quita, si se añade una
se añade, no se descarga todo de nuevo".

- El botón "Descargar" forzaba a volver a traer TODAS las imágenes de la
  tierlist cada vez que se pulsaba, aunque ya estuvieran guardadas de una
  descarga anterior sin haber cambiado nada. Ahora se salta las que ya
  están en la caché (solo se pide de verdad la imagen de un personaje
  NUEVO que hayas colocado desde la última descarga) y, como ya hacía
  antes, limpia al terminar las que sobren (la de un personaje que hayas
  quitado). Si no colocaste nada nuevo, avisa de que "ya estaba al día" sin
  descargar nada.
- Mientras dura, ahora se ve "⬇ Descargando imágenes... (x/y)" justo debajo
  de la barra de arriba del modo Visor (y el propio botón "Descargar" se
  queda con el mismo contador y deshabilitado), en vez de un solo aviso que
  aparece y desaparece.

## 🆕 Ronda 32 — el contador de "Descargando..." mostraba el total, no lo nuevo

Pedido explícito tras ver "Descargando 236" en una segunda descarga: "se
siguen descargando todas". Por dentro, la Ronda 31 SÍ se saltaba de verdad
las imágenes ya en caché (0 peticiones de red de más, verificado) — pero el
contador de progreso mostraba el TOTAL de personajes de la tierlist entera,
no cuántos hacía falta traer de verdad, así que en pantalla parecía que se
estaba descargando todo de nuevo aunque no fuera así.

Arreglado: ahora se comprueba primero, sin descargar nada, cuántas
imágenes faltan de verdad (comparando con lo que ya hay en caché), y el
contador — y el propio botón — solo cuentan esas. Si no hace falta traer
ninguna, avisa directamente de que "ya estaba al día" sin mostrar ningún
progreso.

## 🆕 Ronda 33 — "modo visor" mostraba cambios sin guardar (y por eso "Descargar" pedía de más)

Pedido explícito: "cuando muevo una foto y le doy a modo visor se queda la
foto en esa posición aunque no haya guardado, mal ahí, si refresco se
corrige pero eso está mal".

- **Causa real**: el botón del ojo DENTRO del editor pasaba directamente la
  copia de TRABAJO (`S.workingTL`, con cualquier cambio todavía sin
  guardar) al modo Visor — así que mover una carta y pulsar el ojo mostraba
  esa posición como si estuviera guardada de verdad, aunque no lo estuviera.
  Solo un refresco de página (que de paso DESCARTA el cambio sin guardar)
  volvía a dejarlo consistente con lo realmente guardado — de ahí que
  "se corrigiera" al refrescar, pero perdiendo el cambio en el proceso.
- **Arreglado**: ese botón ahora muestra siempre lo REALMENTE guardado (en
  este dispositivo, o en la nube si hay algo más reciente), exactamente
  igual que el botón del ojo de la tarjeta en "Mis Tierlists" — sin
  necesidad de refrescar nada para que sea consistente.
- **De paso, arregla también** el reporte de "descargando 81" (el total
  entero) al haber cambiado solo una posición: al mostrar siempre el estado
  guardado, "Descargar" compara contra lo que de verdad ya tienes cacheado
  y detecta correctamente que no hace falta traer nada nuevo cuando solo se
  reordenó una carta entre tiers ya existentes, sin añadir ni quitar
  ningún personaje.

## 🆕 Ronda 34 — cerrar y reabrir la app hacía que "Descargar" volviera a bajar TODAS las fotos

Pedido explícito: "Si descargo dos veces seguidas o salgo de esa ruta,
vuelvo y descargo incluso cambiando cosas va bien, pero cada vez que cierro
la app y la abro y le doy a descargar me descarga 81 fotos".

- **Lo raro del síntoma**: dentro de una misma sesión (sin cerrar la app)
  todo funcionaba perfecto — descargar dos veces seguidas, cambiar cosas,
  navegar a otra pantalla y volver... siempre detectaba bien los cambios
  reales. El problema aparecía SOLO al cerrar la app (o la pestaña) y
  volver a abrirla.
- **Causa real**: cada vez que se iniciaba sesión, justo después de traer
  las plantillas y tu ranking desde Supabase (`fetchGlobalTemplates`), se
  lanzaba también en segundo plano una limpieza del almacén de imágenes
  offline (`gcCharImageCache`) que borra cualquier imagen que "ya no haga
  falta" según lo que hay guardado en este dispositivo en ese momento. El
  problema es que esa limpieza depende de una respuesta de red (plantillas +
  tu ranking en la nube) que se pide justo al abrir la app — si esa
  respuesta tardaba, llegaba incompleta, o la fusión con lo local no
  terminaba de estar lista en ese instante exacto, la limpieza podía borrar
  por error imágenes que sí hacían falta, momentos antes de que le diera
  tiempo a pulsar "Descargar". Por eso parecía que la app "no se acordaba de
  nada" cada vez que se reabría, aunque dentro de la misma sesión todo
  funcionara bien.
- **Arreglado**: esa limpieza automática al iniciar sesión queda quitada
  del todo. Ahora `gcCharImageCache` SOLO se ejecuta como parte de pulsar
  "Descargar" en una tierlist — una acción que el propio usuario ha pedido a
  propósito — nunca sola en segundo plano al abrir la app. Así, las
  imágenes ya descargadas sobreviven a cerrar y reabrir la app, y
  "Descargar" vuelve a comparar solo contra lo que de verdad falta.

## 🆕 Ronda 35 — faltaban personajes enteros en el modo sin conexión (los añadidos por un colaborador, o desde otro dispositivo)

Pedido explícito, con capturas comparando el modo Visor conectado vs. sin
conexión: "mira las que salen en sin conexión y las que salen con conexión,
faltan".

- **Causa real**: el catálogo de "qué personaje es cada uno" (su nombre y
  su foto) para cualquier personaje que NO viniera en la base de datos
  incluida en la propia app (por ejemplo, cualquiera añadido después desde
  AniList o por un colaborador) se guardaba SOLO EN MEMORIA, y solo se
  traía de la nube al abrir el editor o el botón del ojo de esa tierlist
  estando online — nunca se guardaba en el dispositivo. Si esa tierlist se
  había editado desde OTRO dispositivo (o por un colaborador), o
  simplemente no se había vuelto a abrir en la sesión actual antes de
  perder la conexión, ese catálogo no estaba disponible, y como tampoco
  sobrevivía a cerrar la app, se perdía siempre que se reabría. El modo sin
  conexión no puede pedir nada por red, así que esos personajes no se
  encontraban y su tarjeta entera desaparecía — aunque su POSICIÓN (en qué
  tier estaba) sí seguía bien sincronizada, porque eso viaja por un camino
  distinto (ver Rondas 30/31).
- **Arreglado**: ahora, cada vez que la app trae de la nube los datos de un
  personaje (al abrir un editor, un modo Visor, o sincronizar plantillas),
  esa información se guarda también en este dispositivo (nueva función
  `rememberChars`), no solo en memoria. Así, cualquier personaje que se
  haya visto alguna vez conectado en este dispositivo sigue disponible sin
  conexión, aunque se cierre y reabra la app o se haya añadido desde otro
  sitio.

## 🆕 Ronda 36 — notificaciones que se pueden borrar (a mano o solas)

Pedido explícito: "las notificaciones estaría bien que puedas eliminarlas
con X o algo, o que se eliminen solas como más óptimo consideres".

- **Borrado manual, uno a uno**: cada notificación de la sección "Actividad"
  (comentarios, aceptaciones de amistad, etc.) tiene ahora su propia "✕" a
  la derecha para borrarla al instante, sin tener que abrirla primero.
- **Borrado manual, en bloque**: junto a "Marcar leído" aparece un botón
  "Borrar leídas" que quita de golpe todas las ya leídas (las que aún no
  se han visto se respetan, para no perder algo nuevo por accidente).
- **Borrado solo, automático**: de paso, cualquier notificación que YA esté
  leída y tenga más de 30 días se borra sola en segundo plano cada vez que
  se abre el panel de la campana — así el panel no se llena para siempre de
  cosas viejas aunque nunca se toque un botón de borrar. Solo afecta a las
  ya leídas y antiguas; nunca borra nada sin leer.

## 🆕 Ronda 37 — el botón "Borrar leídas" ahora sale arriba, y el borrado ya funciona de verdad

Feedback explícito: "el botón de borrar leídas que salga arriba, y por
cierto cuando le doy se borran pero si cierro y vuelvo a abrir notis
vuelven a salir".

- **Posición del botón**: "Marcar leído" y "Borrar leídas" salían DESPUÉS
  de toda la lista de notificaciones, así que con varias había que bajar
  hasta el final para encontrarlos. Ahora van justo debajo de "Actividad",
  antes de la lista.
- **El borrado no era de verdad**: faltaba la política de seguridad (RLS)
  de `DELETE` en la tabla `notifications` — sin ella, Supabase bloquea
  CUALQUIER borrado por defecto (no hay política = no hay permiso). El
  botón sí quitaba la notificación de la pantalla al momento (por eso
  "parecía" funcionar), pero la petición para borrarla de verdad en la nube
  fallaba en silencio, así que seguía existiendo ahí y volvía a aparecer en
  cuanto se recargaban (al reabrir el panel, o al cerrar y abrir la app).
  Añadida la política que faltaba en `supabase-schema.sql`.

### ⚠️ Vuelve a ejecutar `supabase-schema.sql` (solo hace falta la parte nueva, pero ejecutarlo entero no rompe nada)

## 🆕 Ronda 38 — el marco de plata (y el resto) salía cortado en los comentarios

Pedido explícito, con captura comparando un avatar sin marco (círculo
perfecto) contra el propio con marco de plata (cortado): "fíjate el XC es
un círculo perfecto, en cambio el mío de mi perfil de plata está como
cortado".

- **Causa real**: el div que envuelve el avatar en cada comentario tenía a
  la vez dos cosas en el MISMO elemento: `overflow:hidden` (para recortar
  la foto en un círculo perfecto, incluso en Safari) y el marco equipado
  (`frame-plata`/`frame-oro`/etc., que se dibuja con `box-shadow`). El
  problema es que `overflow:hidden` recorta TODO lo que se sale de ese
  elemento, incluido su propio `box-shadow` — así que el aro de color del
  marco, que debe sobresalir un poco alrededor del círculo, se recortaba
  por los lados en vez de rodearlo entero.
- **Arreglado**: separado en dos capas, igual que ya se hacía en el círculo
  grande de Perfil (`.avatar-ring` + `.avatar-inner`): el marco ahora va en
  el div de fuera (que ya no recorta nada), y el recorte de la foto a
  círculo pasa a un nuevo div de dentro (que no lleva marco). Así ninguno
  de los dos estropea al otro.

## 🆕 Ronda 39 — el marco seguía cortado en más sitios (perfil, chats, compartir, Usuarios)

Feedback explícito con nueva captura: "sigue igual tío, no es un círculo
perfecto, se corta".

- El arreglo de la Ronda 38 solo tocó el avatar de los COMENTARIOS. El
  mismo problema de fondo (la foto, con `border-radius`+`object-fit`
  directamente debajo del marco, sin una capa de `overflow:hidden` propia
  y separada) seguía presente en:
  - Tu propio avatar arriba a la derecha (botón de perfil, junto a la
    campana).
  - La lista de chats (tanto conversaciones individuales como el aviso de
    "amigos" — de paso, esta última tampoco mostraba el marco del amigo en
    absoluto, ahora sí).
  - El selector de amigos al compartir/gestionar una tierlist colaborativa.
  - Las tarjetas de "Usuarios" y "Amigos" (el círculo con nombre debajo).
- **Arreglados los cuatro** con el mismo patrón de dos capas ya usado en
  comentarios: una capa de fuera con el marco (sin recortar nada) y una de
  dentro que recorta la foto en círculo (sin marco).

## 🆕 Ronda 40 — el círculo del avatar seguía con un trocito cuadrado asomando (fallo de recorte en Android)

Feedback explícito, con captura ampliada mostrando un trocito oscuro y
cuadrado justo detrás de la esquina superior izquierda del círculo: "donde
ves tú ahí un aro perfecto, si por el lado izquierdo se ve cortado y por
arriba también".

- Las Rondas 38/39 separaron bien el marco (box-shadow) del recorte de la
  foto en dos capas — probado en Chromium de escritorio, donde el círculo
  ya salía perfecto. El fallo que persistía es más sutil y específico de
  ciertos navegadores/WebViews de Android: cuando un div con
  `overflow:hidden` + `border-radius:50%` tiene, justo al lado, un hermano
  con `box-shadow` (el marco), ese navegador en concreto a veces NO crea una
  capa de recorte "de verdad" para el primero, y deja pasar una esquina de
  la foto rectangular de dentro.
- **Arreglado**: se fuerza una capa de composición propia (con `transform`)
  en cada uno de esos divs de recorte, más una máscara de respaldo — el
  arreglo estándar para este fallo concreto de renderizado. No cambia nada
  en los navegadores que ya iban bien (comprobado); hace el recorte robusto
  también en los que fallaban.

## 🆕 Ronda 41 — pestañas: varios rankings dentro de la misma tierlist

Pedido explícito: "estaria bien que dentro de un tier puedas añadir
categorias en forma de pestañas... tengo la tierlist animes de temporada,
pero quiero rankear los animes, sus op y sus ed con la misma tierlist,
entonces le doy al + y me sale un cuadro preguntando nombre de la
pestaña... esto aplica para las colaborativas, si se crea una pestaña se
crea para el otro, las colab lo comparten todo".

- **Nuevo botón "+ Pestaña"** en el header del editor de cualquier
  tierlist: pide un nombre (aceptar/cancelar, igual que al renombrar un
  tier) y crea una pestaña nueva — un ranking completo aparte, con las
  mismas filas (S/A/B/...) pero sin ningún personaje colocado todavía —
  dentro de la MISMA tierlist. Así, por ejemplo, "Animes de temporada"
  puede tener una pestaña para los animes, otra para sus openings y otra
  para sus endings, las tres usando el mismo catálogo de personajes/waifus.
- Todas las pestañas comparten el catálogo: un personaje que esté en el
  pool (sin colocar) en una pestaña sigue disponible en las demás; lo único
  que cambia de una pestaña a otra es en qué tier tienes colocado cada uno
  (o si no lo has colocado en esa pestaña en concreto).
- Para cambiar de pestaña o borrar una (si hay más de una), sale una fila
  de pestañas justo debajo del título de la tierlist, tanto en el editor
  como en el modo Visor (👁) — en el Visor solo para mirar, sin poder
  crear/borrar.
- **Colaborativas**: al guardar, las pestañas se suben junto con el resto
  de la tierlist, así que cualquier colaborador que la abra ve exactamente
  las mismas pestañas que tú, con sus mismos nombres y contenido.
- **Modo sin conexión**: si descargas una tierlist con varias pestañas para
  verla sin conexión, se descargan las imágenes de los personajes de TODAS
  las pestañas, no solo de la que tuvieras abierta al pulsar "Descargar".
- ⚠️ **Tienes que volver a ejecutar `supabase-schema.sql`** en tu proyecto
  de Supabase (SQL Editor → pega el archivo entero → Run): añade dos
  columnas nuevas (`tabs`, `active_tab_id`) a la tabla `user_rankings`. Sin
  esto, las pestañas seguirán funcionando en tu propio dispositivo pero no
  se guardarán en la nube ni se compartirán con tus colaboradores.

## 🆕 Ronda 41b — los comentarios y reacciones salían iguales en todas las pestañas

Feedback explícito nada más probar las pestañas: "el comentario si que debe
verse solo en la pestaña, lo mismo con las reacciones".

- **Causa**: los comentarios y reacciones se guardaban solo por
  `ranking_id` (la fila de `user_rankings`), y ahora esa misma fila puede
  contener varias pestañas — así que un comentario escrito en "OPs" salía
  también al ver "Principal", y viceversa.
- **Arreglado**: se añade una columna `tab_id` a `tierlist_comments` y
  `tierlist_reactions` — cada comentario/reacción queda atado también a la
  pestaña concreta desde la que se escribió. Las tierlists de antes de esta
  ronda (con una sola pestaña) usan `'default'` y siguen funcionando igual
  que siempre.
- ⚠️ **Vuelve a ejecutar `supabase-schema.sql` otra vez** (el mismo paso de
  la Ronda 41, ahora con esta columna añadida). Esta vez el archivo ya NO
  borra tus comentarios/reacciones existentes al re-ejecutarlo (antes sí lo
  hacía, por error de una ronda muy anterior a esta) — se quedan tal cual,
  solo se les asigna `'default'` como pestaña.

## 🆕 Ronda 41c — "Descargar" con pestañas volvía a bajar todo siempre, no solo los cambios

Feedback explícito: "siempre descarga todo, esté en la pestaña que esté,
descarga las 14 fotos que hay... y siempre descarga todo, no solo los
cambios. Recuerda que debe descargar todas las pestañas, pero solo los
cambios" (visto en una tierlist colaborativa).

- **Causa**: al terminar de descargar, la app limpia del almacén cualquier
  imagen que ya no haga falta (`gcCharImageCache`), mirando SOLO tu copia
  local del dispositivo (la que se guarda al editar/guardar). Si tu copia
  local todavía no conocía una pestaña —por ejemplo, la creó un
  colaborador y tú solo la habías visto en modo Visor, sin volver a abrir
  el editor en ESE dispositivo—, esa limpieza borraba sin querer las
  imágenes que se ACABABAN de descargar para ella. Así, la siguiente vez
  que pulsabas "Descargar", tocaba volver a bajarlas todas, una y otra vez.
- **Arreglado**: antes de limpiar el almacén, se guarda en tu copia local
  la versión de las pestañas que se está viendo en ese momento (la más
  reciente), así la limpieza ya sabe que esas imágenes hacen falta y no las
  borra. Comprobado que sigue funcionando igual que siempre en una tierlist
  normal sin pestañas.

## 🆕 Ronda 41d — el SQL daba error al volver a pegarlo ("relation already exists")

Error explícito al re-ejecutar `supabase-schema.sql`: `ERROR: 42P07:
relation "idx_reactions_ranking" already exists`.

- **Causa**: ese índice se creaba sin `if not exists` (a diferencia de
  todos los demás del archivo). No daba problema mientras la tabla
  `tierlist_reactions` se borraba y recreaba entera cada vez (como pasaba
  antes de la Ronda 41b), pero desde que esa ronda dejó de borrarla —
  justamente para no perder tus comentarios/reacciones— volver a pegar el
  archivo se quedaba a medias justo en esa línea, aunque todo lo de más
  arriba (las columnas `tab_id` nuevas, etc.) sí llegara a aplicarse bien.
- **Arreglado**: el índice ahora lleva `if not exists`, como el resto.
  Puedes volver a pegar `supabase-schema.sql` entero sin miedo.

## 🆕 Ronda 41e — reordenar pestañas, y siempre entrar por la primera

Pedido explícito: "poder elegir el orden de las pestañas: en plan mover de
izq a der y vice versa" y "si entro a esa tierlist, siempre se debe entrar
en la primera pestaña, la principal que es la de la izq del todo".

- En el editor, cada pestaña lleva ahora dos flechitas (‹ ›) para moverla
  una posición a la izquierda o a la derecha — se desactivan solas en los
  extremos (la primera no puede ir más a la izquierda, la última no más a
  la derecha).
- La pestaña que quede más a la izquierda es, a todos los efectos, la
  "Principal": cada vez que entras a esa tierlist (desde el editor o desde
  el modo Visor, tuyo o de un amigo, con conexión o sin ella), se abre
  siempre esa primera pestaña — nunca la que hubieras dejado activa la
  última vez. Cambiar de pestaña sigue funcionando igual mientras te quedas
  dentro; lo único que cambia es el punto de partida cada vez que entras.

## Producción

- Todo funciona con hosting 100% estático (GitHub Pages, Netlify, Vercel,
  etc.) — no hace falta build ni bundler, es JS/CSS plano.
- El Service Worker (`sw.js`) se actualizó (`at-v2`) para precachear los
  nuevos archivos `css/` y `js/`, así el modo offline sigue funcionando
  igual que antes (antes solo cacheaba `index.html`, que ya lo contenía
  todo; ahora hay que decirle explícitamente qué archivos cachear).
