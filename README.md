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

## Producción

- Todo funciona con hosting 100% estático (GitHub Pages, Netlify, Vercel,
  etc.) — no hace falta build ni bundler, es JS/CSS plano.
- El Service Worker (`sw.js`) se actualizó (`at-v2`) para precachear los
  nuevos archivos `css/` y `js/`, así el modo offline sigue funcionando
  igual que antes (antes solo cacheaba `index.html`, que ya lo contenía
  todo; ahora hay que decirle explícitamente qué archivos cachear).
