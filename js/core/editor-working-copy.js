// Copia de trabajo del editor: permite editar una tierlist sin tocar los datos
// guardados hasta confirmar los cambios (para poder cancelar sin perder nada).

// ============ WORKING COPY (editor) ============
function openEditor(tlid){
  const tl=getTLfromProfile(tlid);
  if(!tl)return;
  unsubscribeCollab();
  S._viewerOwnTlId=null;
  S.cid=tlid;
  S.workingTL=JSON.parse(JSON.stringify(tl)); // deep copy
  S.hasUnsaved=false;
  // FIX (parpadeo del botón de guardar): en vez de arrancar siempre en null/false
  // y esperar a que syncFromSupabase() responda (lo que hacía que el botón
  // "Guardar" normal se viera un instante en una tierlist colaborativa, y
  // viceversa), arrancamos con el último valor conocido en caché (guardado la
  // última vez que syncFromSupabase resolvió para esta misma tierlist). En
  // cuanto la red responda se sobreescribe con el dato real de todos modos.
  S.workingRankingId=tl._rankingId||null;S.workingIsForeignCollab=false;S.workingIsCollaborative=!!tl._isCollaborative;
  S.page='editor';S.q='';S.poolPage=0;S.poolSort='default';S.poolSortDir='asc';
  setRoute('editor',tlid);
  syncFromSupabase();
}

// FIX (Ronda 25 — modo sin conexión): abre una tierlist PROPIA ya guardada
// en este dispositivo en modo Visor (solo lectura), sin tocar la red para
// nada — pensado para cuando no hay conexión y S.offline es true (ver
// TierlistsPage). Reutiliza el mismo Viewer() que ya existe para ver la
// tierlist de un amigo, así que aquí solo hace falta "traducir" la forma de
// una tierlist propia (tl.tiers) a la forma que Viewer() espera de un
// ranking remoto (tiers_data) — ver Viewer() en este mismo archivo... digo,
// en home.js.
// FIX (Ronda 26 — salía "?" en vez del nombre de cada tier, tipo "S"/"A"):
// una tierlist propia guarda cada fila como { id, label, color, chars }
// (mismo nombre de campo que usa el editor y que se sube a Supabase, ver
// saveEditorChanges más abajo) — aquí se estaba leyendo "t.name", un campo
// que nunca existió en esa fila, así que siempre salía undefined y el "?"
// de repuesto de Viewer(). Corregido a "t.label".
function openOfflineViewer(tlid){
  const tl=getTLfromProfile(tlid);
  if(!tl)return;
  const p=activeProfile();
  S.viewingRank={
    id:tl.id,
    user_id:p?p.id:null,
    // FIX (Ronda 25): "customChars" tiene que viajar aquí dentro de
    // "tierlists" porque Viewer() se lo pasa tal cual a getChar()/charImg()
    // como su "tl" (ver "const tlMeta = r.tierlists" en Viewer, en
    // home.js) — sin esto, cualquier personaje añadido a mano (Añadir uno/
    // Añadir varias, con su propia imagen) no se encontraría offline: no
    // está en el catálogo AC ni se puede pedir por red, solo vive en esta
    // tierlist en concreto.
    tierlists:{ title:tl.title, folder:tl.folder, cover_url:tl.cover_url, customChars:tl.customChars||[] },
    tiers_data:(tl.tiers||[]).map(t=>({ label:t.label, color:t.color, chars:t.chars||[] }))
  };
  S.viewingUser=p?{ name:p.name }:null;
  S._viewerOwnTlId=null; // sin conexión no se puede editar — no se ofrece el botón "Editar"
  S.page='viewer';
}

// FIX (Ronda 30 — pedido explícito: pasar solo al modo Visor si se pierde
// la conexión mientras se está editando, "para evitar problemas"): seguir
// editando sin conexión es peligroso — cualquier guardado se quedaría solo
// en este dispositivo (la parte de sincronizar con la nube fallaría), con
// riesgo de conflicto al recuperar la conexión en otro dispositivo. Esto lo
// llama el listener del evento "offline" (ver state.js) en el momento en
// que el navegador detecta que se ha perdido la conexión y S.page es
// 'editor': guarda YA en este dispositivo lo que hubiera en el editor
// (nunca se pierde el trabajo, aunque la sincronización con la nube no se
// intente porque ya sabemos que no hay red) y pasa a openOfflineViewer()
// con esa misma tierlist, tal cual se había quedado en pantalla.
function switchToOfflineViewerFromEditor(){
  if(!S.workingTL || !S.cid) return;
  const tlid = S.cid;
  const p = activeProfile();
  if(p){
    const idx = p.tls.findIndex(t=>t.id===tlid);
    S.workingTL.updatedAt = Date.now();
    if(idx>=0) p.tls[idx] = JSON.parse(JSON.stringify(S.workingTL));
    else p.tls.push(JSON.parse(JSON.stringify(S.workingTL))); // tierlist nueva, aún sin guardar nunca
    saveProfiles();
  }
  unsubscribeCollab();
  S.workingTL=null; S.hasUnsaved=false; S.cid=null;
  S.workingRankingId=null; S.workingIsForeignCollab=false; S.workingIsCollaborative=false;
  openOfflineViewer(tlid);
}

// Puertas de confirmación para el primer guardado: la elección entre
// "normal" y "colaborativa" se queda fija a partir de la primera vez que
// se guarda (a partir de ahí solo se muestra el botón del tipo elegido),
// así que antes de esa primera vez se avisa de que es una decisión que no
// se puede deshacer desde aquí.
function confirmAndSaveNormal(neverSaved){
  if(neverSaved){
    if(!confirm('¿Guardar esta tierlist en modo NORMAL (solo tuya)?\n\nUna vez la guardes así, ya no podrás convertirla en colaborativa después: la opción "Guardar colaborativa" desaparecerá.'))return;
  }
  saveEditorChanges();
}
function confirmAndOpenCollabPicker(neverSaved){
  if(neverSaved){
    if(!confirm('¿Guardar esta tierlist como COLABORATIVA?\n\nElegirás con qué amigos compartirla y, a partir de ahí, esta tierlist será conjunta: la opción de guardarla en modo normal (solo tuya) desaparecerá.'))return;
  }
  openCollabPicker();
}

// Guarda los cambios. Si esta tierlist es colaborativa y la fila es de un
// amigo (t\u00fa eres colaborador, no due\u00f1o), se ACTUALIZA esa misma fila por su
// "id" en vez de crear/actualizar tu propia fila \u2014 as\u00ed los cambios de
// cualquier colaborador van todos al mismo sitio y son de verdad conjuntos.
async function saveEditorChanges(){
  if(!S.workingTL||!S.cid)return;
  const p=activeProfile();if(!p)return;
  const idx=p.tls.findIndex(t=>t.id===S.cid);
  if(idx<0)return;

  S.workingTL.updatedAt=Date.now();
  p.tls[idx]=JSON.parse(JSON.stringify(S.workingTL));
  saveProfiles(); // Cache local

  if (userSession && sbClient) {
    toast('Sincronizando con la nube...', 'info');
    try {
      // 1. Actualizamos la plantilla comunitaria (ahora permitido para todos los logueados via RLS)
      await sbClient.from('tierlists').update({
        title: S.workingTL.title,
        tiers_config: S.workingTL.tiers.map(t => ({ id: t.id, label: t.label, color: t.color })),
        updated_at: new Date()
      }).eq('id', S.cid);

      const tiersData = S.workingTL.tiers.map(t => ({ id: t.id, label: t.label, color: t.color, chars: t.chars }));

      if (S.workingIsForeignCollab && S.workingRankingId) {
        // 2a. Eres colaborador de la tierlist de un amigo: se actualiza SU
        // fila por id (no se toca is_collaborative/collaborators, que son
        // de tu amigo, ya que aqu\u00ed no se env\u00edan esos campos).
        await sbClient.from('user_rankings').update({
          tiers_data: tiersData,
          pool_data: S.workingTL.pool,
          updated_at: new Date()
        }).eq('id', S.workingRankingId);
      } else {
        // 2b. Guardamos TU ranking personal con TU estructura (esto lo hace universal en tus dispositivos)
        const { data: savedRow } = await sbClient.from('user_rankings').upsert({
          user_id: userSession.user.id,
          tierlist_id: S.cid,
          tiers_data: tiersData,
          pool_data: S.workingTL.pool,
          updated_at: new Date()
        }, { onConflict: 'user_id, tierlist_id' }).select().maybeSingle();
        // Guardamos el id de la fila recién creada/actualizada: hace falta
        // para que, nada más guardar por primera vez (sin necesidad de
        // salir y volver a entrar al editor), el botón de guardado se
        // "bloquee" ya en modo normal y "Guardar colaborativa" desaparezca.
        if (savedRow) { S.workingRankingId = savedRow.id; S.workingIsCollaborative = !!savedRow.is_collaborative; }
      }

      S.hasUnsaved=false;
      toast(S.workingIsCollaborative ? '\u2713 Guardado y compartido con tus colaboradores' : '\u2713 Sincronizado en todos tus dispositivos','ok');
    } catch(e) {
      console.error(e);
      toast('Error de red, se guard\xf3 solo en este navegador','err');
    }
  } else {
    S.hasUnsaved=false;
    toast('\u2713 Guardado','ok');
  }
  render();
}

// Abre el selector de amigos para compartir esta tierlist como colaborativa.
function openCollabPicker(){
  if(!S.workingTL||!S.cid){toast('Abre primero una tierlist','err');return;}
  if(!userSession){toast('Inicia sesi\u00f3n para usar tierlists colaborativas','err');return;}
  S.modal='collab-save';S.md={selected:new Set()};render();
}

// Guarda (igual que "Guardar") pero adem\u00e1s marca la fila como colaborativa
// y comparte con los amigos elegidos: a partir de ahora, cualquiera de
// ellos que abra esta misma tierlist edita y guarda sobre esta MISMA fila,
// y cada guardado (tuyo o de ellos) llega a todos en tiempo real.
async function saveEditorChangesCollab(friendIds){
  if(!S.workingTL||!S.cid||!userSession||!sbClient)return;
  if(!friendIds||friendIds.length===0){toast('Elige al menos un amigo','err');return;}

  const p=activeProfile();if(!p)return;
  const idx=p.tls.findIndex(t=>t.id===S.cid);
  if(idx<0)return;
  S.workingTL.updatedAt=Date.now();
  p.tls[idx]=JSON.parse(JSON.stringify(S.workingTL));
  saveProfiles();

  toast('Compartiendo tierlist colaborativa...', 'info');
  try{
    await sbClient.from('tierlists').update({
      title: S.workingTL.title,
      tiers_config: S.workingTL.tiers.map(t => ({ id: t.id, label: t.label, color: t.color })),
      updated_at: new Date()
    }).eq('id', S.cid);

    const tiersData = S.workingTL.tiers.map(t => ({ id: t.id, label: t.label, color: t.color, chars: t.chars }));

    // Si ya eras colaborador ajeno de esta fila, no puedes "hacerla tuya" \u2014
    // solo el due\u00f1o original puede compartirla. En ese caso simplemente se
    // a\u00f1aden m\u00e1s colaboradores a la fila existente.
    if(S.workingIsForeignCollab && S.workingRankingId){
      const { data: existing } = await sbClient.from('user_rankings').select('collaborators').eq('id', S.workingRankingId).maybeSingle();
      const merged = Array.from(new Set([...(existing?.collaborators||[]), ...friendIds]));
      await sbClient.from('user_rankings').update({
        tiers_data: tiersData, pool_data: S.workingTL.pool, updated_at: new Date(),
        is_collaborative: true, collaborators: merged
      }).eq('id', S.workingRankingId);
    } else {
      const { data: row } = await sbClient.from('user_rankings').upsert({
        user_id: userSession.user.id,
        tierlist_id: S.cid,
        tiers_data: tiersData,
        pool_data: S.workingTL.pool,
        updated_at: new Date(),
        is_collaborative: true,
        collaborators: friendIds
      }, { onConflict: 'user_id, tierlist_id' }).select().maybeSingle();
      if(row){ S.workingRankingId = row.id; }
    }
    S.workingIsCollaborative = true;
    S.hasUnsaved = false;

    // Notificamos a cada colaborador para que sepan que ya pueden entrar
    await Promise.all(friendIds.map(fid => sbClient.from('notifications').insert({
      user_id: fid,
      actor_id: userSession.user.id,
      type: 'collab_invite',
      tierlist_id: S.cid,
      message: `${currentUserProfile?.name || 'Alguien'} te ha invitado a editar "${S.workingTL.title}" en conjunto`
    })));

    S.modal=null;
    subscribeCollabIfNeeded();
    toast('\u2713 Tierlist colaborativa guardada y compartida','ok');
  }catch(e){
    console.error(e);
    toast('No se pudo compartir la tierlist: '+e.message,'err');
  }
  render();
}

// Abre el selector, pero en modo "gestionar": ya está guardada como
// colaborativa, así que en vez de crear la fila desde cero, se cargan los
// colaboradores actuales (para que salgan pre-marcados) y se permite tanto
// añadir como QUITAR gente.
async function openManageCollaboratorsPicker(){
  if(!S.workingRankingId||!sbClient){toast('Guarda primero la tierlist','err');return;}
  if(S.allUsers.length===0) await fetchAllUsers();
  let current=[];
  try{
    const { data: existing } = await sbClient.from('user_rankings').select('collaborators').eq('id', S.workingRankingId).maybeSingle();
    current = existing?.collaborators || [];
  }catch(e){ console.error(e); }
  S.modal='collab-save';
  S.md={ selected:new Set(current), manage:true, _prevCollaborators:current };
  render();
}

// Guarda la lista de colaboradores TAL CUAL se ha dejado en el modal
// (reemplaza, no fusiona) — así quitar a alguien de verdad le retira el
// acceso: al dejar de estar en "collaborators" (y no ser el dueño), esa
// tierlist deja de aparecerle en su lista, como si nunca la hubiera tocado.
async function saveManagedCollaborators(friendIds){
  if(!S.workingRankingId||!sbClient)return;
  const prev = S.md?._prevCollaborators || [];
  try{
    await sbClient.from('user_rankings').update({ collaborators: friendIds }).eq('id', S.workingRankingId);
    const added = friendIds.filter(id=>!prev.includes(id));
    if(added.length){
      await Promise.all(added.map(fid=>sbClient.from('notifications').insert({
        user_id: fid,
        actor_id: userSession.user.id,
        type: 'collab_invite',
        tierlist_id: S.cid,
        message: `${currentUserProfile?.name || 'Alguien'} te ha invitado a editar "${S.workingTL?.title||''}" en conjunto`
      })));
    }
    S.modal=null;
    toast('✓ Colaboradores actualizados','ok');
  }catch(e){
    console.error(e);
    toast('No se pudo actualizar: '+e.message,'err');
  }
  render();
}

// ---- Tiempo real para tierlists colaborativas ----
let _collabChannel=null;
function unsubscribeCollab(){
  if(_collabChannel && sbClient){ try{ sbClient.removeChannel(_collabChannel); }catch(e){} }
  _collabChannel=null;
}
function subscribeCollabIfNeeded(){
  unsubscribeCollab();
  if(!S.workingIsCollaborative || !S.workingRankingId || !sbClient) return;
  _collabChannel = sbClient.channel('collab-ranking-'+S.workingRankingId)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'user_rankings', filter:'id=eq.'+S.workingRankingId }, (payload) => {
      handleCollabRealtimeUpdate(payload);
    })
    .subscribe();
}
function handleCollabRealtimeUpdate(payload){
  if(!S.workingTL || S.page!=='editor' || !payload?.new) return;
  const row = payload.new;
  if(row.id !== S.workingRankingId) return;
  if(S.hasUnsaved){
    // No pisamos tus cambios sin guardar: solo avisamos.
    toast('Un colaborador ha actualizado esta tierlist. Guarda o descarta tus cambios para ver los suyos.', 'info');
    return;
  }
  if(row.tiers_data && row.tiers_data.length) S.workingTL.tiers = row.tiers_data;
  if(row.pool_data) S.workingTL.pool = row.pool_data;
  toast('\u2713 Actualizado en tiempo real por un colaborador','ok');
  render();
}

function discardChanges(){
  unsubscribeCollab();
  S.workingTL=null;S.hasUnsaved=false;S.cid=null;
  S.workingRankingId=null;S.workingIsForeignCollab=false;S.workingIsCollaborative=false;
  S.page='home';setRoute('home');render();
}
function markUnsaved(){S.hasUnsaved=true;render();}

