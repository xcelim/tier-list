// Pequeña capa de acceso a localStorage (persistencia local del navegador).

// ============ STORAGE ============
const DB={
  s(k,v){try{localStorage.setItem('at4_'+k,JSON.stringify(v))}catch(e){}},
  l(k,d){try{const v=localStorage.getItem('at4_'+k);return v!=null?JSON.parse(v):d}catch(e){return d}},
  del(k){try{localStorage.removeItem('at4_'+k)}catch(e){}}
};

