// Mini helper tipo "hyperscript": crea elementos DOM sin usar innerHTML,
// para poder construir toda la interfaz con funciones JS puras.

// ============ H HELPER ============
// FIX (Ronda 22) — BUG REAL detrás de "la selección múltiple no va" en
// Añadir varias (y, de paso, de los botones de paginación de tierlists que
// se quedaban deshabilitados para siempre): para atributos booleanos del
// DOM (checked, disabled, selected...), el HTML solo mira si el ATRIBUTO
// está presente o no — da igual el texto que lleve dentro. Como esta
// función hacía siempre "el.setAttribute(k, v)" para cualquier prop que no
// fuera style/onX/class/html, un "checked:false" se traducía en
// setAttribute('checked','false'), y esa cadena "false" NO vacía el
// atributo: el navegador lo ve presente igualmente y marca la casilla como
// seleccionada. Resultado: TODAS las casillas de "Añadir varias" salían
// marcadas de entrada (fuera cual fuera su valor real en JS), así que
// "Seleccionar todas" aparecía ya activada y la fila de "aplicar a las
// seleccionadas" nunca llegaba a mostrarse (se basa en contar cuántos
// items tienen _selected=true de verdad, que sí seguía en false por
// debajo del checkbox mal pintado) — de ahí que marcar/desmarcar pareciera
// no hacer nada. Mismo motivo exacto dejaba SIEMPRE deshabilitadas las
// flechas de paginación de Tierlists en cuanto se pintaban una vez con
// disabled:false. Para estas propiedades, hay que fijar la PROPIEDAD del
// elemento (el.checked=v) en vez del atributo, que sí entiende booleanos
// de verdad.
const H_BOOL_PROPS = new Set(['checked','disabled','selected','readOnly','required','multiple','autofocus','open','hidden']);
function h(tag,a,...ch){
  const el=document.createElement(tag);
  for(const[k,v]of Object.entries(a||{})){
    if(k==='style'&&typeof v==='object')Object.assign(el.style,v);
    else if(k.startsWith('on')&&typeof v==='function')el.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==='class')el.className=v;
    else if(k==='html')el.innerHTML=v;
    else if(H_BOOL_PROPS.has(k))el[k]=!!v;
    else el.setAttribute(k,v);
  }
  for(const c of ch.flat()){if(c==null||c===false)continue;el.appendChild(typeof c==='string'?document.createTextNode(c):c);}
  return el;
}

