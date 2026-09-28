// Guardado de perfiles y tierlists, sincronización con Supabase (plantillas globales,
// chats, grupos, mensajes) y utilidades de red asociadas.

// ============ SAVE ============
async function saveProfiles() {
  DB.s('profiles', S.profiles);
  DB.s('activeProfile', S.activeProfile);
}

// FIX (Ronda 29 — descarga solo lo que TÚ elijas, no todo automáticamente):
// las Rondas 26/27 descargaban solas, en segundo plano, las imágenes de
// TODAS tus tierlists cada vez que abrías la app o guardabas algo — pedido
// explícito del usuario: "a lo mejor no se quiere tener todas descargadas,
// solo las que me interesen". Se ha quitado esa descarga automática por
// completo: ahora NADA se descarga hasta que pulsas el botón "Descargar" en
// una tierlist concreta (ver downloadTierlistForOffline, más abajo) — si no
// la descargas, esa tierlist saldrá sin imágenes en el modo Visor sin
// conexión. Lo único que sigue pasando solo, sin descargar nada nuevo, es
// la limpieza de imágenes que ya no use ninguna tierlist (gcCharImageCache),
// porque eso solo borra, nunca añade.
//
// Recorre las tierlists indicadas (todas las propias, o solo una) y
// devuelve el conjunto de URLs de imagen (solo las que de verdad son una
// URL de red — un personaje "a mano" con la imagen ya guardada como
// base64 no necesita descargarse) de los personajes YA COLOCADOS en algún
// tier — nunca el catálogo/pool entero.
function collectTierImageUrls(tls){
  const urls = new Set();
  (tls||[]).forEach(tl=>{
    (tl.tiers||[]).forEach(t=>{
      (t.chars||[]).forEach(cid=>{
        const url = charImg(cid, tl);
        if(url && url.startsWith('http')) urls.add(url);
      });
    });
  });
  return urls;
}

// Descarga (en paralelo, por tandas) la lista de URLs dada y la mete en la
// caché de imágenes de personajes. "force=true" vuelve a pedir la imagen
// aunque ya estuviera en caché (traer la versión más reciente de verdad);
// si no (el caso normal), se salta las que ya están en caché — así una
// segunda descarga de la misma tierlist solo trae de verdad los personajes
// NUEVOS que hayas añadido, no vuelve a bajar los que ya tenías. "onProgress"
// (opcional) se llama con (hechas, total) según se van resolviendo, para
// poder mostrar el progreso en pantalla. Devuelve cuántas están ok en total,
// cuántas fallaron, y cuántas de esas "ok" eran de verdad NUEVAS (no ya
// estaban en caché).
async function downloadImagesToCache(urls, force, onProgress){
  const cache = await caches.open('at-char-imgs-v1');
  const list = Array.from(urls);
  let ok = 0, fail = 0, done = 0, downloaded = 0;
  const CONCURRENCY = 8;
  let next = 0;
  async function worker(){
    while(next < list.length){
      const url = list[next++];
      try{
        if(!force){
          const already = await cache.match(url);
          if(already){ ok++; done++; if(onProgress) onProgress(done, list.length); continue; }
        }
        const resp = await fetch(url, { mode:'cors', cache: force ? 'reload' : 'default' });
        if(resp && resp.ok){ await cache.put(url, resp.clone()); ok++; downloaded++; }
        else fail++;
      }catch(e){ fail++; /* una imagen suelta sin red/CORS no debe parar las demás */ }
      done++;
      if(onProgress) onProgress(done, list.length);
    }
  }
  await Promise.all(Array.from({length: Math.min(CONCURRENCY, list.length)}, worker));
  return { ok, fail, total: list.length, downloaded };
}

// FIX (Ronda 28 — botón "Descargar" manual en el modo Visor de tus propias
// tierlists): único disparador de descargas desde la Ronda 29 (ver nota de
// arriba). Le da control explícito al usuario: "quiero estar seguro de
// que ESTA tierlist, tal y como se ve ahora mismo, está lista para verse
// sin conexión", con aviso claro de cuándo termina (toasts). El nombre, el
// color, el orden de los tiers y la posición de cada personaje YA se
// guardan solos en el dispositivo en cuanto se guarda algo en el editor
// (p.tls, ver saveEditorChanges) — no hace falta "descargarlos" aparte, ya
// están. Lo único que de verdad hay que forzar a traer son las imágenes.
// Al terminar, limpia además del almacén cualquier imagen que ya no use
// NINGUNA de tus tierlists (ver gcCharImageCache) — así una descarga nueva
// no se va acumulando sin límite sobre las anteriores, tal y como pidió el
// usuario ("sustituimos la anterior descarga").
// FIX (Ronda 30 — "esta tierlist todavía no tiene personajes colocados"
// pulsando Descargar con personajes de sobra colocados): además del bug de
// fondo en fetchGlobalTemplates (arreglado arriba), esta función leía SOLO
// de la copia local (p.tls) — que puede ir un paso por detrás de lo que
// ves en pantalla ahí mismo, en el propio modo Visor, si esa tierlist se
// abrió con datos recién traídos de Supabase (openOwnViewer, desde el
// botón del ojo en la tarjeta). Ahora, si el modo Visor te está mostrando
// una tierlist tuya (viewingRank), se descarga justo lo que ESO muestra —
// que es siempre lo más reciente — en vez de volver a leer de p.tls.
// FIX (Ronda 31 — pedido explícito: "a partir de la segunda vez no es
// óptimo, deben descargarse solo los cambios, no descargar todo de
// nuevo"): antes se forzaba a volver a traer TODAS las imágenes de la
// tierlist cada vez, aunque ya estuvieran guardadas de una descarga
// anterior — lento y de sobra en cuanto la tierlist tiene unos cuantos
// personajes. Ahora se salta las que ya están en caché (solo se
// descargan de verdad las que faltan: un personaje nuevo que hayas
// añadido) y, como ya hacía antes, se limpian al final las que sobren (un
// personaje que hayas quitado). Se guarda además el progreso en
// S._downloadProgress mientras dura, para mostrar "Descargando... (x/y)"
// en pantalla (ver Viewer() en home.js) en vez de un solo aviso que
// desaparece.
async function downloadTierlistForOffline(tlid){
  if (!('caches' in window)) { toast('Tu navegador no soporta guardar tierlists para verlas sin conexión', 'err'); return; }
  const localTl = getTLfromProfile(tlid);
  const shownIsThisTl = S.viewingRank && S._viewerOwnTlId === tlid;
  const title = (shownIsThisTl && S.viewingRank.tierlists && S.viewingRank.tierlists.title) || (localTl && localTl.title) || 'Esta tierlist';
  const tiersSource = shownIsThisTl ? (S.viewingRank.tiers_data || []) : (localTl ? (localTl.tiers || []) : null);
  if(tiersSource === null){ toast('No se encontró esa tierlist', 'err'); return; }
  const folder = (shownIsThisTl && S.viewingRank.tierlists && S.viewingRank.tierlists.folder) || (localTl && localTl.folder);
  const customChars = (shownIsThisTl && S.viewingRank.tierlists && S.viewingRank.tierlists.customChars) || (localTl && localTl.customChars) || [];
  const tlForUrls = { folder, customChars, tiers: tiersSource };
  const urls = collectTierImageUrls([tlForUrls]);
  if(!urls.size){ toast('Esta tierlist todavía no tiene personajes colocados', 'info'); return; }
  S._downloadProgress = { tlid, done: 0, total: urls.size };
  render();
  try{
    const { ok, fail, total, downloaded } = await downloadImagesToCache(urls, false, (done, tot) => {
      S._downloadProgress = { tlid, done, total: tot };
      render();
    });
    await gcCharImageCache();
    S._downloadProgress = null;
    if(fail){
      toast(`Descargado (${ok}/${total}) — ${fail} imagen${fail===1?'':'es'} no se pudo${fail===1?'':'ieron'} traer`, 'info');
    } else if(downloaded === 0){
      toast(`✓ "${title}" ya estaba al día (sin cambios que descargar)`, 'ok');
    } else {
      toast(`✓ "${title}" lista para verse sin conexión (${downloaded} imagen${downloaded===1?'':'es'} nueva${downloaded===1?'':'s'})`, 'ok');
    }
  }catch(e){
    console.error(e);
    S._downloadProgress = null;
    toast('Error al descargar: '+e.message, 'err');
  }
  render();
}

// Borra del almacén de imágenes cualquiera que ya no use NINGUNA de tus
// tierlists (normales o colaborativas) ahora mismo — por ejemplo, la de un
// personaje que quitaste de un tier o de una tierlist que borraste. Evita
// que la caché de imágenes crezca sin límite con el paso del tiempo.
async function gcCharImageCache(){
  if (!('caches' in window)) return;
  try{
    const p = activeProfile();
    if(!p) return;
    const needed = collectTierImageUrls(p.tls);
    const cache = await caches.open('at-char-imgs-v1');
    const keys = await cache.keys();
    await Promise.all(keys.map(req => needed.has(req.url) ? Promise.resolve() : cache.delete(req)));
  }catch(e){ console.warn('[gcCharImageCache]', e); }
}

async function fetchGlobalTemplates() {
  let allTemplates = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data: templates, error } = await sbClient.from('tierlists').select('*').range(from, from + step - 1);
    if (error || !templates || templates.length === 0) break;
    allTemplates = allTemplates.concat(templates);
    if (templates.length < step) break;
    from += step;
  }
  if (!allTemplates.length) return;
  const p = activeProfile();
  if (!p) return;

  const remoteIds = new Set(allTemplates.map(t => t.id));

  // De paso, traemos TU propio progreso en cada una de estas tierlists (tu
  // ranking personal, o el conjunto si es colaborativa y estás dentro) —
  // así las tarjetas pueden mostrar el número de tiers/personajes REAL (el
  // tuyo) en vez del genérico de la plantilla vacía, y un distintivo de
  // "colaborativa" cuando corresponda. Esto es solo para lo que se
  // MUESTRA en la tarjeta (campos con "_" delante): nunca tocamos
  // tl.tiers/tl.pool aquí, así que no hay riesgo de pisar cambios sin
  // guardar en el editor.
  const myRankByTlId = new Map();
  if (userSession) {
    const uid = userSession.user.id;
    try {
      const { data: myRankRows } = await sbClient.from('user_rankings')
        .select('id, tierlist_id, tiers_data, pool_data, is_collaborative, collaborators, user_id')
        .or(`user_id.eq.${uid},collaborators.cs.{${uid}}`);
      (myRankRows || []).forEach(r => {
        // Si hay dos filas para la misma tierlist (no debería pasar), nos
        // quedamos con la tuya propia antes que con una ajena.
        const existing = myRankByTlId.get(r.tierlist_id);
        if (!existing || r.user_id === uid) myRankByTlId.set(r.tierlist_id, r);
      });
    } catch (e) { console.warn('[fetchGlobalTemplates] user_rankings:', e); }
  }

  // FIX (Ronda 30 — "esta tierlist todavía no tiene personajes colocados"
  // al pulsar Descargar, con personajes de sobra colocados): a pesar de lo
  // que decía el comentario de arriba ("nunca tocamos tl.tiers... así que
  // no hay riesgo de pisar cambios sin guardar"), las dos líneas de abajo
  // SÍ lo hacían: "tiers_config" es solo la ESTRUCTURA compartida de la
  // tierlist (id/nombre/color de cada tier, ver saveEditorChanges) — NUNCA
  // incluye qué personajes tiene colocados cada uno, eso vive aparte en
  // "user_rankings.tiers_data". Como fetchGlobalTemplates se llama en CADA
  // inicio de sesión, esto borraba de golpe los personajes ya colocados de
  // la copia local (p.tls) de cualquier tierlist, dejándolos vacíos hasta
  // la próxima vez que se guardase desde el editor — y de ahí que
  // "Descargar" (que lee de p.tls) no encontrara ningún personaje. Ahora se
  // combina bien: si ya hay tu ranking guardado en Supabase (myRank, más de
  // fiar porque viaja entre tus dispositivos), se usa esa estructura
  // completa tal cual; si no, se actualiza el nombre/color de cada tier
  // desde la plantilla remota pero CONSERVANDO los personajes que ya
  // tuvieras en la copia local, en vez de borrarlos.
  function tiersWithChars(t, myRank, existingLocalTiers){
    if (myRank && myRank.tiers_data && myRank.tiers_data.length && myRank.tiers_data[0].label) {
      return myRank.tiers_data;
    }
    const localByIdx = new Map((existingLocalTiers||[]).map(x=>[x.id, x]));
    return (t.tiers_config||[]).map(rc => {
      const existing = localByIdx.get(rc.id);
      return { id: rc.id, label: rc.label, color: rc.color, chars: existing ? (existing.chars||[]) : [] };
    });
  }

  allTemplates.forEach(t => {
    // Si dupTL está en curso para este ID, no tocar — lo añadirá él mismo al terminar
    if (S._dupInProgress === t.id) return;

    const localIdx = p.tls.findIndex(local => local.id === t.id);
    const myRank = myRankByTlId.get(t.id);
    const mergedTiers = tiersWithChars(t, myRank, localIdx !== -1 ? p.tls[localIdx].tiers : null);
    const tlData = {
      ...t,
      tiers: mergedTiers,
      isRemoteTemplate: true,
      updatedAt: new Date(t.updated_at || t.created_at).getTime()
    };
    if (myRank) {
      tlData._rankingId = myRank.id;
      tlData._isCollaborative = !!myRank.is_collaborative;
      tlData._myTierCount = (myRank.tiers_data || t.tiers_config || []).length;
      tlData._myCharCount = (myRank.tiers_data || []).reduce((a, tr) => a + (tr.chars || []).length, 0) + (myRank.pool_data || []).length;
    }
    if (localIdx === -1) {
      p.tls.push(tlData);
    } else {
      // Sincronizar metadatos desde la nube (no sobreescribir pool/customChars locales)
      p.tls[localIdx].title     = t.title;
      p.tls[localIdx].tiers     = mergedTiers;
      p.tls[localIdx].folder    = t.folder;
      p.tls[localIdx].cover_url = t.cover_url;
      p.tls[localIdx].updatedAt = tlData.updatedAt;
      p.tls[localIdx].isRemoteTemplate = true;
      p.tls[localIdx]._rankingId = tlData._rankingId ?? p.tls[localIdx]._rankingId ?? null;
      p.tls[localIdx]._isCollaborative = tlData._isCollaborative ?? false;
      p.tls[localIdx]._myTierCount = tlData._myTierCount;
      p.tls[localIdx]._myCharCount = tlData._myCharCount;
    }
  });

  // 2. Eliminar del local las que ya NO existen en Supabase
  // (alguien las borró desde otra cuenta)
  const before = p.tls.length;
  p.tls = p.tls.filter(tl => {
    // Mantener siempre tierlists que son creación local pura (sin id en Supabase)
    // Una tierlist "local pura" nunca debería existir en este flujo (todas se suben),
    // pero por seguridad: si no tiene isRemoteTemplate Y no está en remoteIds, la dejamos.
    if (!tl.isRemoteTemplate && !remoteIds.has(tl.id)) return true;
    // Si está marcada como remota pero ya no existe en Supabase → eliminar
    return remoteIds.has(tl.id);
  });

  saveProfiles();
  render();
}

async function syncFromSupabase() {
  if (!userSession || !S.cid || !S.workingTL) return;
  
  // 0. Sincronización Universal de Estructura: Refrescar niveles, nombres y colores desde la nube
  const { data: tlMeta } = await sbClient.from('tierlists').select('title, folder, tiers_config').eq('id', S.cid).maybeSingle();
  if (tlMeta) {
    S.workingTL.title = tlMeta.title;
    S.workingTL.folder = tlMeta.folder;
    // Reconstruimos la lista de niveles para que coincida con la nube, inicializando chars vacíos
    S.workingTL.tiers = tlMeta.tiers_config.map(tc => ({ ...tc, chars: [] }));
  }

  // Catálogo dinámico para esta tierlist.
  // FIX: esto antes metía SIEMPRE los ~2050 personajes de AC_BASE (el
  // catálogo base de "Waifus") en el pool de CUALQUIER tierlist, incluida
  // una recién creada y vacía — por eso una tierlist nueva aparecía llena
  // de golpe aunque se hubiera pedido vacía. AC_BASE solo pertenece a la
  // tierlist por defecto ('waifus_v1'); cualquier otra tierlist empieza
  // con el catálogo vacío y solo se rellena con los personajes que se le
  // hayan añadido a ELLA (tabla "characters", filtrada por tierlist_id).
  // AC (el catálogo de "qué personaje es cada id") sí mantiene siempre la
  // base completa disponible para look-ups (nombres/imágenes que se puedan
  // necesitar en otras pantallas), pero "sharedIds" — que es lo que decide
  // qué aparece en el POOL de ESTA tierlist — solo incluye la base completa
  // cuando de verdad estamos editando la tierlist por defecto.
  const isDefaultWaifusTL = (S.cid === 'waifus_v1');
  AC = JSON.parse(JSON.stringify(AC_BASE));
  const sharedIds = new Set();
  if (isDefaultWaifusTL) Object.keys(AC_BASE).forEach(id => sharedIds.add(id));

  // 1. Cargar TODOS los personajes compartidos (Paginado para evitar límite de 1000)
  let allChars = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await sbClient
      .from('characters')
      .select('*')
      .eq('tierlist_id', S.cid)
      .range(from, from + step - 1);
    if (error || !data || data.length === 0) break;
    allChars = allChars.concat(data);
    if (data.length < step) break;
    from += step;
  }

  allChars.forEach(c => {
    AC[c.id] = { id: c.id, name: c.name, anime: c.anime, file: c.image_url, isRemote: true };
    sharedIds.add(c.id);
  });
  // Catálogo base integrado globalmente

  // 3. Cargar el ranking de esta tierlist: puede ser el TUYO propio, o —
  // si un amigo te ha compartido esta misma tierlist como colaborativa —
  // la fila COMPARTIDA de tu amigo (una sola fila, editada entre varios).
  // Por eso ya no filtramos solo por "user_id = tú": traemos también
  // cualquier fila colaborativa en la que aparezcas en "collaborators".
  const uid = userSession.user.id;
  const { data: rankRows } = await sbClient.from('user_rankings').select('*')
    .eq('tierlist_id', S.cid)
    .or(`user_id.eq.${uid},collaborators.cs.{${uid}}`);
  const myRank = (rankRows || []).find(r => r.user_id === uid)
    || (rankRows || []).find(r => r.is_collaborative && (r.collaborators || []).includes(uid))
    || null;

  // Guardamos qué fila es esta y si la editas como colaborador "ajeno"
  // (no eres el dueño), para que saveEditorChanges sepa si tiene que
  // hacer UPDATE por id en vez de upsert por user_id+tierlist_id.
  S.workingRankingId = myRank ? myRank.id : null;
  S.workingIsForeignCollab = !!(myRank && myRank.user_id !== uid);
  S.workingIsCollaborative = !!(myRank && myRank.is_collaborative);

  // Guardamos este resultado en caché local sobre la propia tierlist, para
  // que la PRÓXIMA vez que se abra (openEditor) sepamos de antemano si es
  // colaborativa antes incluso de que responda Supabase — así el botón de
  // guardado correcto sale desde el primer render y no "parpadea" el botón
  // equivocado mientras se espera la respuesta de la red (ver openEditor).
  {
    const _p = activeProfile();
    const _tl = _p && _p.tls.find(t => t.id === S.cid);
    if (_tl) { _tl._rankingId = S.workingRankingId; _tl._isCollaborative = S.workingIsCollaborative; }
  }

  if (S.workingTL) {
    const placedIds = new Set();
    if (myRank) {
      // Sincronización Universal: Si el ranking tiene estructura propia (niveles añadidos/renombrados), la usamos
      if (myRank.tiers_data && myRank.tiers_data.length > 0 && myRank.tiers_data[0].label) {
        S.workingTL.tiers = myRank.tiers_data;
      } else {
        // Fallback para rankings antiguos: solo rellenar personajes en niveles existentes
        myRank.tiers_data.forEach(rd => {
          const t = S.workingTL.tiers.find(x => x.id === rd.id);
          if (t) t.chars = rd.chars;
        });
      }
      // Registrar qué personajes ya están ubicados
      S.workingTL.tiers.forEach(t => (t.chars || []).forEach(id => placedIds.add(id)));
    }

    // 4. EL POOL COMPARTIDO DINÁMICO:
    // La pool son todos los personajes conocidos (sharedIds) que el usuario NO ha puesto en un tier (placedIds)
    S.workingTL.pool = Array.from(sharedIds).filter(id => !placedIds.has(id));
    
    // Ordenamos para que los últimos añadidos por la comunidad salgan primero
    S.workingTL.pool.reverse();

    if(typeof subscribeCollabIfNeeded==='function') subscribeCollabIfNeeded();
    render();
  }
}

async function saveProfileChanges() {
  if (!userSession || !S.profileDraft) return;
  toast("Guardando perfil...", "info");
  
  let finalAvatarUrl = S.profileDraft.avatar_url;

  // 1. Si hay una nueva imagen (blob de recorte), subirla y borrar la anterior
  if (S.profileDraft._newAvatarBlob) {
    const path = `avatars/${userSession.user.id}_${Date.now()}.png`;
    
    // Borrar anterior si existía en storage
    const oldPath = extractBucketPath(currentUserProfile.avatar_url);
    if (oldPath && oldPath.includes('avatars/')) {
        await sbClient.storage.from('tierlists').remove([oldPath]);
    }

    const { error: upErr } = await sbClient.storage.from('tierlists').upload(path, S.profileDraft._newAvatarBlob);
    if (!upErr) {
      const { data: { publicUrl } } = sbClient.storage.from('tierlists').getPublicUrl(path);
      finalAvatarUrl = publicUrl;
    }
  }

  // 2. Update de campos en la base de datos
  // FIX (Ronda 18): "avatar_frame" faltaba aquí — el marco elegido en
  // AvatarFramePicker ahora solo se guarda en el borrador (S.profileDraft,
  // para poder previsualizarlo antes de aplicarlo de verdad, ver
  // js/features/levels.js), así que hay que incluirlo también aquí para que
  // "Guardar cambios" lo persista en Supabase.
  const updates = {
    name: S.profileDraft.name,
    color: S.profileDraft.color,
    avatar_url: finalAvatarUrl,
    avatar_frame: S.profileDraft.avatar_frame
  };

  const { error } = await sbClient.from('profiles').update(updates).eq('id', userSession.user.id);
  if (!error) {
    currentUserProfile = { ...currentUserProfile, ...updates };
    const localP = activeProfile();
    if (localP) Object.assign(localP, updates);
    S.profileUnsaved = false;
    S.profileDraft = null;
    saveProfiles(); toast("Perfil actualizado ✓"); render();
  } else {
    toast("Error al guardar: " + error.message, "err");
  }
}

async function fetchChats() {
  if (!userSession) return;
  // Traemos los chats donde el usuario es miembro, incluyendo la info del chat y de los otros miembros.
  // FIX (Ronda 12): pedimos también "last_read_at" de CADA miembro (no solo
  // el tuyo) — antes solo se traía para calcular tu propio "no leído", pero
  // hace falta el de los DEMÁS para poder pintar los ticks de "leído" estilo
  // WhatsApp (un mensaje tuyo está "leído" cuando el last_read_at del otro
  // es posterior a la hora en que lo enviaste).
  const { data, error } = await sbClient.from('chat_members')
    .select('last_read_at, chats(*, chat_members(user_id, last_read_at, profiles(name, avatar_url, avatar_frame)))')
    .eq('user_id', userSession.user.id);

  if (!error) {
    let globalUnread = 0;
    S.chats = data.map(d => {
      const chat = d.chats;
      // Un chat no está leído si el last_message_at del chat es posterior al last_read_at del miembro
      const hasUnread = chat.last_message_at && (!d.last_read_at || new Date(chat.last_message_at) > new Date(d.last_read_at));

      if (hasUnread) globalUnread++;

      return {
        ...chat,
        has_unread: hasUnread,
        unread_count: hasUnread ? 1 : 0 // Supabase no da el conteo exacto fácil sin RPC, marcamos como 1 para mostrar el punto
      };
    });
    S.totalUnread = globalUnread;
    // FIX: S.activeChat es una referencia al objeto de chat que se estaba
    // usando ANTES de este refetch — como aquí arriba se reemplaza
    // S.chats entero por objetos nuevos, si no re-enganchamos S.activeChat
    // al objeto nuevo correspondiente, se queda "congelado" con datos
    // viejos (importante para que los ticks de leído se actualicen).
    if (S.activeChat) {
      const updated = S.chats.find(c => c.id === S.activeChat.id);
      if (updated) S.activeChat = updated;
    }
    render();
  } else {
    console.warn('[chat] fetchChats:', error.message);
  }
}

// Antes de un insert que depende de RLS (auth.uid() = ... / to authenticated),
// nos aseguramos de que el token de sesión sigue siendo válido. Si ha
// caducado (o casi), lo refrescamos primero — si no, Supabase puede tratar
// la petición como si NO estuvieras autenticado y el INSERT se rechaza por
// RLS con el mismo mensaje genérico de "row-level security policy",
// aunque la política en sí esté perfectamente bien escrita.
async function ensureFreshSession() {
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return false;
    const expiresAt = (session.expires_at || 0) * 1000;
    if (expiresAt - Date.now() < 60000) {
      const { data, error } = await sbClient.auth.refreshSession();
      if (error || !data?.session) return false;
    }
    return true;
  } catch (e) { console.error('[ensureFreshSession]', e); return false; }
}

// DIAGNÓSTICO temporal para el error de RLS en "chats": la política en
// Supabase está confirmada correcta (with_check=true, roles={authenticated}),
// así que si el insert sigue fallando, lo único que queda por comprobar es
// si la petición REALMENTE viaja como rol "authenticated" — es decir, qué
// dice el propio token de la sesión. Esto se imprime en la consola del
// navegador (F12 → Consola) justo antes de crear un chat.
async function debugAuthContext(label){
  try{
    const { data: { session } } = await sbClient.auth.getSession();
    if(!session){ console.warn('[chat-debug]', label, '— NO HAY SESIÓN (auth.getSession() devolvió null)'); return; }
    let roleClaim = null, expLeft = null;
    try{
      const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      roleClaim = payload.role;
      expLeft = Math.round(payload.exp - Date.now()/1000) + 's';
    }catch(e){}
    console.log('[chat-debug]', label, {
      user_id: session.user?.id,
      role_claim_en_el_token: roleClaim,   // esto DEBE decir "authenticated" — si dice "anon" o null, ahí está el problema
      token_caduca_en: expLeft
    });
  }catch(e){ console.error('[chat-debug] error leyendo la sesión:', e); }
}

async function openChat(chat) {
  if (chat.is_temp) {
    if (!(await ensureFreshSession())) {
      toast('Tu sesión ha caducado — cierra sesión y vuelve a entrar para poder chatear', 'err');
      return;
    }
    // Crear el chat real en la base de datos al primer contacto
    await debugAuthContext('antes de crear chat (openChat)');
    // FIX (Ronda 11, causa real del error de RLS en "chats"): hay que
    // mandar created_by para que la política de SELECT te deje "ver" la
    // fila que acabas de insertar (con el .select().single() de aquí abajo)
    // ANTES de que exista tu fila en chat_members — si no, Postgres
    // rechaza el propio INSERT con "violates row-level security policy"
    // al intentar el RETURNING, aunque el INSERT en sí sea válido.
    const { data: nc, error: chatErr } = await sbClient.from('chats').insert({ is_group: false, created_by: userSession.user.id }).select().single();
    if (chatErr || !nc) {
      const detail = [chatErr?.message, chatErr?.details, chatErr?.hint].filter(Boolean).join(' — ');
      toast("No se pudo abrir el chat: " + (detail || 'error desconocido'), "err");
      console.error('[openChat] insert chats:', chatErr);
      return;
    }
    const m = [
      { chat_id: nc.id, user_id: userSession.user.id, last_read_at: new Date().toISOString() },
      { chat_id: nc.id, user_id: chat.friend_id }
    ];
    const { error: memErr } = await sbClient.from('chat_members').insert(m);
    if (memErr) { toast("No se pudo abrir el chat: " + memErr.message, "err"); return; }
    await fetchChats();
    const real = S.chats.find(c => c.id === nc.id);
    if (real) return openChat(real);
    toast("El chat se creó pero no se pudo abrir, inténtalo de nuevo", "err");
    return;
  }

  S.activeChat = chat;
  S.messages = [];
  render();
  
  const { data, error } = await sbClient.from('messages')
    .select('*, profiles(name, avatar_url, avatar_frame)')
    .eq('chat_id', chat.id)
    .order('created_at', { ascending: true });
    
  if (!error) {
    S.messages = data;
    render();
    const container = document.querySelector('.chat-messages');
    if(container) setTimeout(() => container.scrollTop = container.scrollHeight, 50);
  }
  
  // Marcar como leído en la base de datos
  const now = new Date().toISOString();
  const idx = S.chats.findIndex(c => c.id === chat.id);
  if (idx !== -1) S.chats[idx].has_unread = false;

  await sbClient.from('chat_members')
    .update({ last_read_at: now })
    .eq('chat_id', chat.id)
    .eq('user_id', userSession.user.id);
  fetchChats(); // Refrescar para actualizar el badge de no leídos

  // FIX (Ronda 12): antes, cada vez que se abría un chat (incluso el MISMO
  // chat otra vez) se llamaba a sbClient.channel(`chat:${chat.id}`) sin
  // quitar la suscripción anterior. Como Supabase reutiliza el canal si ya
  // existe uno con ese nombre, la segunda vez fallaba igual que el bug de
  // "cannot add postgres_changes callbacks... after subscribe()" que ya se
  // arregló para las notificaciones. Ahora se quita cualquier suscripción
  // de chat anterior antes de crear las nuevas.
  if (_activeChatChannel) { sbClient.removeChannel(_activeChatChannel); _activeChatChannel = null; }
  if (_activeMembersChannel) { sbClient.removeChannel(_activeMembersChannel); _activeMembersChannel = null; }

  // Suscribirse a nuevos mensajes en tiempo real
  _activeChatChannel = sbClient.channel(`chat:${chat.id}:${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
    payload => {
      if (!S.messages.find(m => m.id === payload.new.id)) {
        S.messages.push({ ...payload.new, profiles: { name: currentUserProfile.name } }); // Asumimos que el perfil del sender es el nuestro
        render();
      }
    }).subscribe();

  // NUEVO (Ronda 12): ticks de "leído" estilo WhatsApp. Nos suscribimos a
  // cambios en chat_members de ESTE chat — cuando la otra persona abre la
  // conversación, su last_read_at se actualiza (ver más arriba), y aquí
  // reflejamos ese cambio al momento en S.activeChat.chat_members para que
  // el tick de tus mensajes pase de "enviado" a "leído" sin recargar nada.
  _activeMembersChannel = sbClient.channel(`chat-members:${chat.id}:${Date.now()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chat.id}` },
    payload => {
      if (!S.activeChat || S.activeChat.id !== chat.id) return;
      const members = S.activeChat.chat_members || [];
      const m = members.find(mm => mm.user_id === payload.new.user_id);
      if (m) { m.last_read_at = payload.new.last_read_at; render(); }
    }).subscribe();
}

// Referencias a los canales de tiempo real del chat abierto actualmente,
// para poder quitarlos antes de suscribirse a otros (ver openChat arriba).
let _activeChatChannel = null;
let _activeMembersChannel = null;

async function sendChatMessage(content) {
  if (!content.trim() || !S.activeChat) return;
  const msg = {
    chat_id: S.activeChat.id,
    sender_id: userSession.user.id,
    content: content.trim()
  };
  const { data: newMsg, error } = await sbClient.from('messages').insert(msg).select().single();
  if (error) { toast("Error al enviar: " + (error.message || 'inténtalo de nuevo'), "err"); return; }

  // FIX: antes esto dependía 100% de que Realtime estuviera activado en
  // Supabase para que el mensaje apareciera en pantalla (si no lo estaba,
  // el mensaje se guardaba en la base de datos pero el chat se quedaba
  // "mudo" — parecía que no funcionaba). Ahora lo añadimos aquí mismo,
  // al instante, sin depender de nada más.
  if (!S.messages.find(m => m.id === newMsg.id)) {
    S.messages.push({ ...newMsg, profiles: { name: currentUserProfile?.name || 'Tú' } });
    render();
    const container = document.querySelector('.chat-messages');
    if (container) setTimeout(() => container.scrollTop = container.scrollHeight, 30);
  }

  // Actualizar last_message_at en el chat (para ordenar/mostrar hora, no crítico)
  const nowIso = new Date().toISOString();
  await sbClient.from('chats').update({ last_message_at: nowIso }).eq('id', S.activeChat.id);

  // FIX (Ronda 12): "cuando envío un mensaje me sale el chat sin leer a
  // veces". Esto pasaba porque fetchChats() marca un chat como "no leído"
  // comparando chats.last_message_at (que se acaba de actualizar arriba,
  // con TU mensaje) contra TU PROPIO last_read_at en chat_members — que
  // seguía teniendo la hora de la última vez que abriste el chat, ANTES de
  // enviar este mensaje. Al mandar un mensaje obviamente lo "has leído" (lo
  // acabas de escribir tú), así que hay que refrescar también tu propio
  // last_read_at aquí, no solo al abrir el chat.
  await sbClient.from('chat_members')
    .update({ last_read_at: nowIso })
    .eq('chat_id', S.activeChat.id)
    .eq('user_id', userSession.user.id);
  const myMember = (S.activeChat.chat_members || []).find(m => m.user_id === userSession.user.id);
  if (myMember) myMember.last_read_at = nowIso;
  const idxSelf = S.chats.findIndex(c => c.id === S.activeChat.id);
  if (idxSelf !== -1) { S.chats[idxSelf].has_unread = false; S.chats[idxSelf].last_message_at = nowIso; }
}

// NUEVO (Ronda 12): estado de "leído" de un mensaje propio, estilo
// WhatsApp. Un chat privado está "leído" si el otro miembro tiene un
// last_read_at posterior a cuándo se envió el mensaje; un grupo se marca
// "leído" solo cuando TODOS los demás miembros ya lo han leído (igual que
// hace WhatsApp con el doble check azul en grupos).
function chatMsgReadState(msg, chat) {
  if (!chat || !Array.isArray(chat.chat_members)) return 'sent';
  const others = chat.chat_members.filter(m => m.user_id !== msg.sender_id);
  if (!others.length) return 'sent';
  const msgTime = new Date(msg.created_at).getTime();
  const allRead = others.every(m => m.last_read_at && new Date(m.last_read_at).getTime() >= msgTime);
  return allRead ? 'read' : 'sent';
}

// NUEVO (Ronda 12): opciones del menú de "..." dentro de un chat.
async function deleteChat(chatId) {
  if (!confirm('¿Seguro que quieres eliminar esta conversación? Se borrará para todos los participantes y no se puede deshacer.')) return;
  const { error } = await sbClient.from('chats').delete().eq('id', chatId);
  if (error) { toast('No se pudo eliminar la conversación: ' + error.message, 'err'); return; }
  if (_activeChatChannel) { sbClient.removeChannel(_activeChatChannel); _activeChatChannel = null; }
  if (_activeMembersChannel) { sbClient.removeChannel(_activeMembersChannel); _activeMembersChannel = null; }
  if (S.activeChat?.id === chatId) { S.activeChat = null; S.messages = []; }
  toast('Conversación eliminada');
  render();
  await fetchChats();
}

async function leaveGroup(chatId) {
  if (!confirm('¿Seguro que quieres salir de este grupo? Podrás volver a entrar solo si alguien vuelve a añadirte.')) return;
  const { error } = await sbClient.from('chat_members').delete().eq('chat_id', chatId).eq('user_id', userSession.user.id);
  if (error) { toast('No se pudo salir del grupo: ' + error.message, 'err'); return; }
  if (_activeChatChannel) { sbClient.removeChannel(_activeChatChannel); _activeChatChannel = null; }
  if (_activeMembersChannel) { sbClient.removeChannel(_activeMembersChannel); _activeMembersChannel = null; }
  if (S.activeChat?.id === chatId) { S.activeChat = null; S.messages = []; }
  toast('Has salido del grupo');
  render();
  await fetchChats();
}

async function createGroup(name, friendIds) {
  if (!name || friendIds.length === 0) return;
  if (!(await ensureFreshSession())) {
    toast('Tu sesión ha caducado — cierra sesión y vuelve a entrar para poder crear el grupo', 'err');
    return;
  }

  await debugAuthContext('antes de crear chat (createGroup)');
  const { data: chat, error: cErr } = await sbClient.from('chats')
    .insert({ name, is_group: true, created_by: userSession.user.id }).select().single();

  if (cErr || !chat) {
    const detail = [cErr?.message, cErr?.details, cErr?.hint].filter(Boolean).join(' — ');
    toast("No se pudo crear el grupo: " + (detail || 'error desconocido'), "err");
    console.error('[createGroup] insert chats:', cErr);
    return;
  }

  const members = [...friendIds, userSession.user.id].map(uid => ({
    chat_id: chat.id,
    user_id: uid,
    last_read_at: new Date().toISOString()
  }));
  const { error: memErr } = await sbClient.from('chat_members').insert(members);
  if (memErr) { toast("Grupo creado pero no se pudieron añadir los miembros: " + memErr.message, "err"); return; }

  toast("Grupo creado ✓");

  // Refrescar lista y abrir el nuevo chat
  await fetchChats();
  const newChat = S.chats.find(c => c.id === chat.id);
  if (newChat) openChat(newChat);
  else S.activeChat = chat;
}

function renderChatAvatars(chat) {
  const members = chat.chat_members.filter(m => m.user_id !== userSession?.user.id);
  
  if (!chat.is_group || members.length === 0) { // Handle single friend chat or empty group
    const other = members[0]?.profiles || { name: 'Usuario', avatar_url: null };
    return h('img', {
        src: other.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${other.name}`,
        class: 'chat-avatar-single'
    });
  }
  
  const wrap = h('div', { class: 'group-avatars-container' });
  if (members.length <= 2) {
      members.slice(0,2).forEach((m, idx) => { // Limit to 2 for stacked
          const img = h('img', {
              src: m.profiles.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.profiles.name}`,
              class: 'group-avatar-stacked',
              style: { left: (idx * 8) + 'px', zIndex: 3 - idx } // Adjusted left offset
          });
          wrap.appendChild(img);
      });
  } else {
      wrap.appendChild(h('img', { src: members[0].profiles.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${members[0].profiles.name}`, class: 'group-avatar-stacked', style: { left: '0px', zIndex: 3 } })); // First avatar
      wrap.appendChild(h('img', { src: members[1].profiles.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${members[1].profiles.name}`, class: 'group-avatar-stacked', style: { left: '8px', zIndex: 2 } })); // Second avatar, adjusted left
      wrap.appendChild(h('div', { class: 'group-avatar-extra' }, '+' + (members.length - 2))); // Extra count
  }
  return wrap;
}

