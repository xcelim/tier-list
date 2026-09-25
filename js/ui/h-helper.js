// Mini helper tipo "hyperscript": crea elementos DOM sin usar innerHTML,
// para poder construir toda la interfaz con funciones JS puras.

// ============ H HELPER ============
function h(tag,a,...ch){
  const el=document.createElement(tag);
  for(const[k,v]of Object.entries(a||{})){
    if(k==='style'&&typeof v==='object')Object.assign(el.style,v);
    else if(k.startsWith('on')&&typeof v==='function')el.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==='class')el.className=v;
    else if(k==='html')el.innerHTML=v;
    else el.setAttribute(k,v);
  }
  for(const c of ch.flat()){if(c==null||c===false)continue;el.appendChild(typeof c==='string'?document.createTextNode(c):c);}
  return el;
}

