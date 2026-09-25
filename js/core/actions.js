// Acciones de usuario: crear, editar, eliminar, duplicar tierlists/personajes, etc.

// ============ ACTIONS ============
function resetRank(){
  if(!S.workingTL) return;
  if(!confirm('\xBFSeguro que quieres resetear tu ranking? Todos los personajes volver\xe1n a la pool.')) return;
  const tl=S.workingTL;
  tl.tiers.forEach(t=>{
    if(t.chars && t.chars.length){
      tl.pool.push(...t.chars);
      t.chars=[];
    }
  });
  markUnsaved();
}
function addTier(tl){
  const lbls=['G','H','Z','P','Q','R','T','U','V','W','X','Y','\u2605','EX','S+'];
  const used=new Set(tl.tiers.map(t=>t.label));const lbl=lbls.find(l=>!used.has(l))||'NEW';
  const cols=['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6','#1abc9c'];
  tl.tiers.push({id:uid(),label:lbl,color:cols[tl.tiers.length%cols.length],chars:[]});
  markUnsaved();
}
// Borrar recursivamente todos los archivos de una carpeta del bucket 'tierlists'
// Extrae el path relativo al bucket desde una image_url completa
function extractBucketPath(url) {
  if (!url) return null;
  const marker = '/tierlists/';
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
}

// Borra todos los archivos del bucket asociados a una tierlist
// Estrategia: usar las URLs de la tabla characters (no depende de list() con RLS)
// + un list() final de limpieza para lo que quede (ej: .emptyKeep, placeholders)
async function deleteBucketFolder(bucketFolder, tierlistId) {
  const paths = new Set();

  // 1. Recoger paths desde la tabla characters (funciona aunque list() esté bloqueado por RLS)
  if (tierlistId && sbClient) {
    let from = 0;
    const step = 1000;
    while (true) {
      const { data: chars, error } = await sbClient.from('characters')
        .select('image_url')
        .eq('tierlist_id', tierlistId)
        .range(from, from + step - 1);
      if (error || !chars || chars.length === 0) break;
      chars.forEach(c => {
        const p = extractBucketPath(c.image_url);
        if (p) paths.add(p);
      });
      if (chars.length < step) break;
      from += step;
    }
  }

  // 2. Intentar list() también (funciona si RLS lo permite, o si el bucket es público)
  try {
    let offset = 0;
    while (true) {
      const { data: items } = await sbClient.storage.from('tierlists').list(bucketFolder, { limit: 1000, offset });
      if (!items || items.length === 0) break;
      items.forEach(item => {
        if (item.id !== null && item.metadata !== null) {
          paths.add(`${bucketFolder}/${item.name}`);
        }
      });
      if (items.length < 1000) break;
      offset += items.length;
    }
  } catch(_) {}

  // Añadir placeholders típicos de Supabase Storage
  paths.add(`${bucketFolder}/.emptyKeep`);
  paths.add(`${bucketFolder}/.folder`);
  paths.add(`${bucketFolder}/.gitkeep`);

  // 3. Borrar todo en lotes de 100 (límite de Supabase por llamada a remove)
  const allPaths = [...paths];
  const totalDel = allPaths.length;
  let doneDel = 0;
  const BATCH = 100;
  for (let i = 0; i < allPaths.length; i += BATCH) {
    const batch = allPaths.slice(i, i + BATCH);
    try {
      await sbClient.storage.from('tierlists').remove(batch);
    } catch(e) { console.warn('Error en lote remove:', e.message); }
    doneDel += batch.length;
    if (totalDel > 0) toast(`Borrando archivos... ${doneDel}/${totalDel}`, 'info');
  }
}
async function delTL(id){
  if(!confirm('¿Eliminar esta tierlist para TODOS los usuarios? Esta acción no se puede deshacer.'))return;
  const p=activeProfile();if(!p)return;
  const tl=p.tls.find(t=>t.id===id);

  if(!userSession || !sbClient){
    // Sin sesión: solo borrar local
    p.tls = p.tls.filter(t=>t.id!==id);
    if(S.cid===id){S.cid=null;S.workingTL=null;S.hasUnsaved=false;setRoute('home');}
    saveProfiles(); render(); toast('Eliminada localmente');
    return;
  }

  toast('Eliminando...','info');

  try{
    const folder = (tl && tl.folder) ? tl.folder : sanFolder(tl ? tl.title : id);

    // 1. Borrar la fila de tierlists en Supabase (primero, para que otros usuarios la vean desaparecer)
    const { error: tlErr } = await sbClient.from('tierlists').delete().eq('id', id);
    if (tlErr) throw new Error('Error borrando tierlist: ' + tlErr.message);

    // 2. Borrar todos los rankings de todos los usuarios para esta tierlist
    await sbClient.from('user_rankings').delete().eq('tierlist_id', id);

    // 3. Borrar personajes de la tabla characters
    await sbClient.from('characters').delete().eq('tierlist_id', id);

    // 4. Borrar carpeta completa del bucket via Edge Function (server-side, sin límites del browser)
    toast('Borrando imágenes del servidor…', 'info');
    const fnRes = await fetch(SB_URL + '/functions/v1/delete-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SB_KEY },
      body: JSON.stringify({ folder })
    });
    const fnData = await fnRes.json();
    if (!fnRes.ok) {
      console.warn('Edge Function delete-folder error:', fnData);
      // No es fatal — la tierlist ya fue borrada de la DB
      toast('Tierlist eliminada. Imágenes: ' + (fnData.error || fnRes.status), 'err');
    } else {
      toast('Tierlist eliminada: ' + fnData.deleted + ' imágenes borradas ✓');
    }

    // 5. Eliminar del local de TODOS los perfiles cargados
    S.profiles.forEach(prof => {
      prof.tls = (prof.tls||[]).filter(t => t.id !== id);
    });
    if (S.cid === id) { S.cid=null; S.workingTL=null; S.hasUnsaved=false; setRoute('home'); }
    saveProfiles();
    render();

  }catch(e){
    console.error('Error borrando tierlist:', e);
    toast('Error al eliminar: ' + e.message, 'err');
  }
}
async function dupTL(id){
  const p = activeProfile(); if (!p) return;
  const tl = p.tls.find(t => t.id === id); if (!tl) return;

  let newTitle = "";
  while (true) {
    newTitle = prompt("Nombre para la copia de la tierlist:", "Copia de " + tl.title);
    if (newTitle === null) return;
    newTitle = newTitle.trim();
    if (!newTitle) continue;
    if (p.tls.some(t => t.title.toLowerCase() === newTitle.toLowerCase())) {
      alert("Ya existe una tierlist con ese nombre. Elige otro.");
      continue;
    }
    break;
  }

  const newId   = uid();
  const oldFolder = tl.folder || sanFolder(tl.title) || tl.id;
  const newFolder = sanFolder(newTitle);

  const copy = JSON.parse(JSON.stringify(tl));
  copy.id          = newId;
  copy.title       = newTitle;
  copy.folder      = newFolder;
  copy.isRemoteTemplate = true;
  copy.updatedAt   = Date.now();
  copy.createdAt   = Date.now();

  if (!userSession || !sbClient) {
    p.tls.push(copy); saveProfiles(); render();
    toast("Tierlist duplicada localmente ✓");
    return;
  }

  // Bloquear fetchGlobalTemplates para que no añada la copia antes de que nosotros lo hagamos
  S._dupInProgress = newId;
  toast("Duplicando tierlist…", "info");

  try {
    // ── 1. Crear tierlist en Supabase ────────────────────────────────────────
    const { error: tlErr } = await sbClient.from('tierlists').insert({
      id: newId, title: newTitle, folder: newFolder,
      tiers_config: copy.tiers.map(t => ({ id: t.id, label: t.label, color: t.color })),
      created_by: userSession.user.id
    });
    if (tlErr) throw new Error("Error creando tierlist: " + tlErr.message);

    // ── 2. Clonar personajes (paginado) ──────────────────────────────────────
    let allChars = [], offset = 0;
    while (true) {
      const { data: batch, error: bErr } = await sbClient
        .from('characters').select('*')
        .eq('tierlist_id', id).range(offset, offset + 999);
      if (bErr || !batch || !batch.length) break;
      allChars = allChars.concat(batch);
      if (batch.length < 1000) break;
      offset += 1000;
    }

    const idMap = {};
    if (allChars.length > 0) {
      const newChars = allChars.map(c => {
        const nid = 'c_' + uid();
        idMap[c.id] = nid;
        // IMPORTANTE: la image_url debe apuntar a la nueva carpeta,
        // que es exactamente donde copy-folder va a dejar los archivos
        return {
          ...c, id: nid, tierlist_id: newId, created_by: userSession.user.id,
          image_url: c.image_url
            ? c.image_url.replace('/' + oldFolder + '/', '/' + newFolder + '/')
            : null
        };
      });
      // Insertar en lotes de 500
      for (let i = 0; i < newChars.length; i += 500) {
        const { error: cErr } = await sbClient.from('characters').insert(newChars.slice(i, i + 500));
        if (cErr) throw new Error("Error clonando personajes: " + cErr.message);
      }
      // Actualizar IDs en la copia local
      copy.pool = copy.pool.map(cid => idMap[cid] || cid);
      copy.tiers.forEach(t => { t.chars = t.chars.map(cid => idMap[cid] || cid); });
      if (copy.customChars) copy.customChars.forEach(cc => {
        if (idMap[cc.id]) {
          cc.id = idMap[cc.id];
          if (cc.file) cc.file = cc.file.replace('/' + oldFolder + '/', '/' + newFolder + '/');
        }
      });
    }

    // ── 3. Clonar ranking personal si existe ────────────────────────────────
    const { data: myRank } = await sbClient.from('user_rankings').select('*')
      .eq('user_id', userSession.user.id).eq('tierlist_id', id).maybeSingle();
    if (myRank) {
      await sbClient.from('user_rankings').insert({
        user_id: userSession.user.id, tierlist_id: newId,
        tiers_data: (myRank.tiers_data || []).map(t => ({
          ...t, chars: (t.chars || []).map(cid => idMap[cid] || cid)
        })),
        pool_data: (myRank.pool_data || []).map(cid => idMap[cid] || cid),
        updated_at: new Date().toISOString()
      });
    }

    // ── 4. Copiar imágenes server-side via Edge Function ─────────────────────
    // La función usa service_role → copia directamente en el bucket sin pasar
    // los archivos por el navegador. 2000 imágenes en segundos.
    toast("Copiando imágenes en el servidor…", "info");
    const fnRes = await fetch(SB_URL + '/functions/v1/copy-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SB_KEY },
      body: JSON.stringify({ srcFolder: oldFolder, dstFolder: newFolder })
    });
    const fnData = await fnRes.json();
    if (!fnRes.ok) {
      console.warn("Edge Function copy-folder error:", fnData);
      toast("Tierlist clonada (imágenes no copiadas: " + (fnData.error || fnRes.status) + ")", "err");
    } else {
      toast("Imágenes copiadas: " + fnData.copied + " ✓", "info");
    }

    // ── 5. Añadir al perfil local — UNA SOLA VEZ ────────────────────────────
    // Verificar que fetchGlobalTemplates no la haya añadido mientras esperábamos
    if (!p.tls.find(t => t.id === newId)) {
      p.tls.push(copy);
    } else {
      // Ya fue añadida por fetchGlobalTemplates: actualizar con la copia local (tiene pool/ranks)
      const idx = p.tls.findIndex(t => t.id === newId);
      p.tls[idx] = copy;
    }
    saveProfiles();
    render();
    toast("¡Tierlist duplicada con éxito! ✓");

  } catch (e) {
    console.error(e);
    toast("Error en la duplicación: " + e.message, "err");
  } finally {
    S._dupInProgress = null;
  }
}

