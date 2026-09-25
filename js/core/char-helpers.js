// Funciones auxiliares para trabajar con personajes (búsqueda, normalización, etc).

// ============ CHAR HELPERS ============
function getChar(id,tl){
  const t=tl||S.workingTL;
  if(t&&t.customChars){const cc=t.customChars.find(c=>c.id===id);if(cc)return cc;}
  return AC[id]||null;
}
function charImg(id,tl){
  const c=getChar(id,tl);if(!c)return '';
  if(c.imageData)return c.imageData;
  if(c.file){
    if(c.file.startsWith('data:') || c.file.startsWith('http'))return c.file;
    // Si es la tier de waifus base o no hay carpeta definida, usamos la ruta por defecto
    const folder = (tl && tl.folder && tl.id !== 'waifus_v1') ? tl.folder : 'waifus';
    return BUCKET_BASE + folder + '/' + c.file;
  }
  return '';
}

