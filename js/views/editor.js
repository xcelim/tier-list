// Vista del editor de tierlists: construcción de filas, tiers y pool de personajes.

// ============ EDITOR ============
function Editor(){
  const tl=S.workingTL;
  if(!tl)return h('div',{style:{padding:'40px',color:'var(--text3)'}},'Error: sin tierlist activa');
  // FIX (Ronda 41 — pestañas): por si S.workingTL viniera de antes de esta
  // ronda (o de un guardado colaborativo sin pestañas todavía), nos
  // aseguramos aquí también de que exista al menos "Principal".
  if(typeof ensureTabsInit==='function') ensureTabsInit(tl);
  const w=h('div',{});
  // \u00BFYa se ha guardado esta tierlist alguna vez? (S.workingRankingId solo
  // existe si ya hay una fila en Supabase para ella). La PRIMERA vez que
  // se guarda se elige el tipo (normal o colaborativa) y esa elecci\u00F3n se
  // queda fija: a partir de ah\u00ED solo se muestra el bot\u00F3n del tipo elegido,
  // el otro desaparece \u2014 as\u00ED que hay que preguntar antes de confirmar la
  // primera vez, porque no se puede deshacer desde aqu\u00ED.
  const neverSaved = !S.workingRankingId;
  const showNormalBtn = neverSaved || !S.workingIsCollaborative;
  const showCollabBtn = !!userSession && (neverSaved || S.workingIsCollaborative);
  // Unsaved warning bar
  if(S.hasUnsaved){
    const cb=h('div',{class:'confirm-bar'});
    cb.appendChild(h('span',{},'\u26A0\uFE0F Cambios sin guardar'));
    if(showNormalBtn) cb.appendChild(h('button',{class:'btn btn-save',onclick:()=>confirmAndSaveNormal(neverSaved)},'\u2713 Guardar'));
    if(showCollabBtn) cb.appendChild(h('button',{class:'btn bg bsm',onclick:()=>{
      if(S.workingIsCollaborative && !neverSaved) saveEditorChanges();
      else confirmAndOpenCollabPicker(neverSaved);
    }}, S.workingIsCollaborative && !neverSaved ? '\u2713 Guardar' : '\u{1F465} Guardar colaborativa'));
    if(S.workingIsCollaborative && !neverSaved) cb.appendChild(h('button',{class:'btn bg bsm',title:'A\u00f1adir o quitar colaboradores',onclick:openManageCollaboratorsPicker},'+'));
    cb.appendChild(h('button',{class:'btn bd bsm',onclick:()=>{if(confirm('\xBFDescartar todos los cambios?'))discardChanges();}},'Descartar'));
    w.appendChild(cb);
  }
  // Title bar
  const tb=h('div',{class:'etbar'});
  if(S.etitle){
    const inp=h('input',{value:tl.title||'',class:'etitle'});
    inp.oninput=e=>{tl.title=e.target.value;S.hasUnsaved=true;};
    inp.onblur=()=>{S.etitle=false;render();};
    inp.onkeydown=e=>{if(e.key==='Enter'){S.etitle=false;render();}};
    tb.appendChild(inp);setTimeout(()=>inp.focus(),10);
  }else{
    tb.appendChild(h('div',{class:'etitle hf',title:'Clic para renombrar',onclick:()=>{S.etitle=true;render();}},tl.title||'Sin t\xedtulo'));
  }
  const badges=h('div',{style:{display:'flex',gap:'8px',alignItems:'center'}});
  badges.appendChild(h('span',{id:'saved-badge',class:'saved-badge'},'✓ Guardado'));
  if(S.hasUnsaved) badges.appendChild(h('span',{class:'unsaved-badge'},'● Sin guardar'));
  tb.appendChild(badges);
  const ea=h('div',{class:'eacts'});
  if(showNormalBtn) ea.appendChild(h('button',{class:'btn btn-save',onclick:()=>confirmAndSaveNormal(neverSaved)},'\u2713 Guardar'));
  if(showCollabBtn) ea.appendChild(h('button',{class:'btn bg',onclick:()=>{
    if(S.workingIsCollaborative && !neverSaved) saveEditorChanges();
    else confirmAndOpenCollabPicker(neverSaved);
  },title: S.workingIsCollaborative && !neverSaved ? 'Guardar los cambios (compartidos con tus colaboradores)' : 'Compartir esta tierlist con amigos para editarla en conjunto'}, S.workingIsCollaborative && !neverSaved ? '\u2713 Guardar' : '\u{1F465} Colaborativa'));
  if(S.workingIsCollaborative && !neverSaved) ea.appendChild(h('button',{class:'btn bg bsm',title:'A\u00f1adir o quitar colaboradores',onclick:openManageCollaboratorsPicker},'+'));
  if(S.workingIsCollaborative) badges.appendChild(h('span',{class:'saved-badge',style:{background:'var(--neon-cyan,#3ec6ff)'}},'\u{1F465} Colaborativa'));
  ea.appendChild(h('button',{class:'btn bg',title:'Ver esta tierlist en modo observador',onclick:viewCurrentEditorAsViewer},h('i',{class:'ti ti-eye'})));
  ea.appendChild(h('button',{class:'btn bd',onclick:resetRank},'Reset Rank'));
  // FIX (Ronda 41 \u2014 pedido expl\u00edcito: "un boton en el header mismo qu sea
  // un +, te crea otra pesta\u00f1a con la tierlist vacia y le das un nombre"):
  // esta pesta\u00f1a nueva es un ranking aparte (sus propios tiers, vac\u00edos)
  // dentro de la MISMA tierlist -- ideal para, por ejemplo, tener "Animes
  // de temporada", sus OPs y sus EDs con el mismo cat\u00e1logo de personajes.
  ea.appendChild(h('button',{class:'btn bg',title:'A\u00f1adir una pesta\u00f1a nueva (otro ranking dentro de esta misma tierlist)',onclick:addTab},'+ Pesta\xf1a'));
  ea.appendChild(h('button',{class:'btn bg',onclick:()=>{S.modal='addchar';S.md={};render();}},'+ Waifu'));
  ea.appendChild(h('button',{class:'btn bg',onclick:()=>{S.modal='pick';S.md={};render();}},'+ Cat\xe1logo'));
  ea.appendChild(h('button',{class:'btn bg',onclick:expPNG},'\u2193 PNG'));
  tb.appendChild(ea);w.appendChild(tb);
  // FIX (Ronda 41 \u2014 pesta\u00f1as): barra de pesta\u00f1as, solo si hay m\u00e1s de una
  // (si solo existe "Principal" no hace falta ocupar sitio en pantalla).
  if(tl.tabs && tl.tabs.length>1){
    const tabBar=h('div',{class:'tab-bar',style:{margin:'0 0 14px'}});
    tl.tabs.forEach((t,ti)=>{
      const pill=h('div',{
        class:'tab-pill'+(t.id===tl.activeTabId?' active':''),
        title:t.name,
        onclick:()=>{ if(t.id!==tl.activeTabId) switchTab(t.id); }
      });
      // FIX (Ronda 41e \u2014 pedido expl\u00edcito: "poder elegir el orden de las
      // pesta\u00f1as: en plan mover de izq a der y vice versa"): flechitas para
      // reordenar, deshabilitadas en los extremos (la primera no puede ir
      // m\u00e1s a la izquierda, la \u00faltima no puede ir m\u00e1s a la derecha). Al
      // entrar de nuevo a la tierlist siempre se abre la PRIMERA pesta\u00f1a
      // (ver openEditor y compa\u00f1\u00eda), as\u00ed que mover una pesta\u00f1a al principio
      // es lo que la convierte en la "Principal" a partir de ahora.
      pill.appendChild(h('span',{
        class:'tab-pill-move'+(ti===0?' disabled':''),
        title:'Mover a la izquierda',
        onclick:(e)=>{ e.stopPropagation(); if(ti>0) moveTab(t.id,-1); }
      },'\u2039'));
      pill.appendChild(h('span',{class:'tab-pill-label'}, t.name));
      pill.appendChild(h('span',{
        class:'tab-pill-move'+(ti===tl.tabs.length-1?' disabled':''),
        title:'Mover a la derecha',
        onclick:(e)=>{ e.stopPropagation(); if(ti<tl.tabs.length-1) moveTab(t.id,1); }
      },'\u203a'));
      pill.appendChild(h('span',{
        class:'tab-pill-close',
        title:'Borrar esta pesta\xf1a',
        onclick:(e)=>{ e.stopPropagation(); deleteTab(t.id); }
      },'\u2715'));
      tabBar.appendChild(pill);
    });
    w.appendChild(tabBar);
  }
  // Tiers
  const tw=h('div',{class:'twrap'});
  (tl.tiers||[]).forEach((tier,ti)=>{
    const row=h('div',{class:'trow',id:'t'+tier.id});
    row.ondragover=e=>{e.preventDefault();document.querySelectorAll('.trow.dov').forEach(el=>el.classList.remove('dov'));row.classList.add('dov');};
    row.ondragleave=e=>{if(!row.contains(e.relatedTarget))row.classList.remove('dov');};
    row.ondrop=e=>tdrop(e,tier.id);
    const lbl=h('div',{class:'tlbl',style:{background:tier.color||'#888'}});
    lbl.appendChild(h('div',{class:'tlbl-txt'},tier.label||'?'));
    const oo=h('div',{class:'topts'});
    oo.appendChild(h('button',{title:'Renombrar',onclick:()=>{const n=prompt('Nuevo nombre (máx 25 caracteres):',tier.label);if(n!==null&&n.trim()){tier.label=n.trim().slice(0,25);markUnsaved();}}},'✏'));
    oo.appendChild(h('button',{title:'Color',onclick:()=>{S.modal='color';S.md={tier};render();}},'??'));
    oo.appendChild(h('button',{title:'Subir',onclick:()=>{if(ti>0){[tl.tiers[ti],tl.tiers[ti-1]]=[tl.tiers[ti-1],tl.tiers[ti]];markUnsaved();}}},'▲'));
    oo.appendChild(h('button',{title:'Bajar',onclick:()=>{if(ti<tl.tiers.length-1){[tl.tiers[ti],tl.tiers[ti+1]]=[tl.tiers[ti+1],tl.tiers[ti]];markUnsaved();}}},'▼'));
    oo.appendChild(h('button',{title:'Eliminar',style:{color:'var(--red)'},onclick:()=>{if(confirm('\xBFEliminar tier?')){tl.pool=[...tl.pool,...tier.chars];tl.tiers=tl.tiers.filter(t=>t.id!==tier.id);markUnsaved();}}},'✕'));
    lbl.appendChild(oo);
    const ce=h('div',{class:'tchars'});
    ce.ondragover = e => {
      e.preventDefault();
      
      // Capturamos posiciones iniciales para la animación (FLIP)
      const children = Array.from(ce.children);
      const positions = children.map(c => c.getBoundingClientRect());

      const cards = Array.from(ce.querySelectorAll('.tc:not(.is-dragging):not(.drop-placeholder)'));
      let targetIdx = cards.length;

      for(let i=0; i<cards.length; i++){
        const r = cards[i].getBoundingClientRect();
        if (e.clientY < r.top) { targetIdx = i; break; }
        if (e.clientY < r.bottom && e.clientX < r.left + r.width / 2) { targetIdx = i; break; }
      }

      const zone = tier.id + '_' + targetIdx;
      if(lastZone === zone) return;
      lastZone = zone;

      let ph = document.getElementById('drop-ph');
      if(ph) ph.remove();

      if(DS !== tier.id || targetIdx !== DGidx) {
        ph = h('div', {id: 'drop-ph', class: 'drop-placeholder'});
        if(targetIdx >= cards.length) ce.appendChild(ph);
        else ce.insertBefore(ph, cards[targetIdx]);
      }

      // Aplicamos la magia de la animación
      const newChildren = Array.from(ce.children);
      newChildren.forEach(child => {
        if(child.classList.contains('is-dragging')) return;
        const oldIdx = children.indexOf(child);
        if(oldIdx === -1) return; // Es el nuevo placeholder
        
        const oldRect = positions[oldIdx];
        const newRect = child.getBoundingClientRect();
        
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;
        
        if(dx !== 0 || dy !== 0) {
          child.style.transition = 'none';
          child.style.transform = `translate(${dx}px, ${dy}px)`;
          child.offsetHeight; // Forzamos reflow
          child.style.transition = ''; // Restauramos la transición del CSS
          child.style.transform = '';
        }
      });
    };
    ce.ondragleave = e => { 
      if(!ce.contains(e.relatedTarget)) { 
        const ph=document.getElementById('drop-ph'); if(ph) ph.remove(); 
        lastZone=null; 
      } 
    };
    ce.ondrop = e => {
      e.preventDefault(); e.stopPropagation();
      if(!DG) return;
      const ph = document.getElementById('drop-ph');
      // Obtenemos el índice del placeholder ignorando la carta que estamos arrastrando
      let dropIdx = ph && ph.parentNode === ce ? Array.from(ce.children).filter(x=>!x.classList.contains('is-dragging')).indexOf(ph) : -1;
      if(ph) ph.remove();
      if(dropIdx === -1) {
        // Fallback por si el drop ocurre fuera del área del placeholder
        const cards = Array.from(ce.querySelectorAll('.tc:not(.is-dragging)'));
        dropIdx = cards.length;
        for(let i=0; i<cards.length; i++){
          const r = cards[i].getBoundingClientRect();
          if (e.clientY < r.top) { dropIdx = i; break; }
          if (e.clientY < r.bottom && e.clientX < r.left + r.width / 2) { dropIdx = i; break; }
        }
      }
      tdrop(e, tier.id, dropIdx);
    };

    (tier.chars||[]).forEach((cid,ci)=>{
      const c=getChar(cid,tl);if(!c)return;
      const el=h('div',{class:'tc',style:{position:'relative'}});
      el.dataset.cid=cid;
      el.title=(c.name||cid)+' \u2014 '+(c.anime||'');
      const imgSrcVal=charImg(cid,tl);
      el.appendChild(h('img',{src:imgSrcVal,onerror:(e)=>e.target.src='https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(c.name||cid)}));
      el.appendChild(h('div',{class:'cn'},c.name||cid));
      el.appendChild(h('button',{class:'del-btn',title:'Eliminar permanentemente',onclick:(e)=>{e.stopPropagation();deleteCustomChar(cid,tl);}},'✕'));
      el.addEventListener('pointerdown',e=>dgPointerDown(e,cid,tier.id,ci,imgSrcVal));
      el.ondblclick=()=>{tier.chars=tier.chars.filter(x=>x!==cid);if(!tl.pool.includes(cid))tl.pool.unshift(cid);markUnsaved();};
      ce.appendChild(el);
    });
    row.appendChild(lbl);row.appendChild(ce);tw.appendChild(row);
  });
  tw.appendChild(h('div',{class:'addtbtn',onclick:()=>addTier(tl)},'＋ A\xf1adir tier'));
  w.appendChild(tw);
  // Pool
  const ps=h('div',{class:'pool',id:'pdrop'});
  ps.ondragover=pover;ps.ondrop=pdrop;
  ps.ondragleave=e=>{if(!ps.contains(e.relatedTarget))ps.classList.remove('dov');};
  const ph=h('div',{class:'pool-hdr'});
  ph.appendChild(h('h3',{},'Pool'));
  ph.appendChild(h('span',{class:'badge'},(tl.pool||[]).length+''));
  const sw=h('div',{class:'sw',style:{flex:'1',minWidth:'150px'}});
  const si=h('input',{type:'text',placeholder:'Buscar...',value:S.q});
  si.oninput=e=>{S.q=e.target.value;S.poolPage=0;updPool(pc,tl);};
  sw.appendChild(si);ph.appendChild(sw);
  // Sort controls
  const sortWrap=h('div',{class:'pool-sort-wrap'});
  const sortSel=h('select',{class:'pool-sort-sel',title:'Ordenar por'});
  [['default','Sin ordenar'],['added','Fecha añadido'],['name','Nombre (A-Z)'],['anime','Anime (A-Z)'],['rating','Rareza/Custom primero']].forEach(([v,lbl])=>{
    const op=h('option',{value:v},lbl);
    if(S.poolSort===v)op.selected=true;
    sortSel.appendChild(op);
  });
  sortSel.onchange=e=>{S.poolSort=e.target.value;S.poolPage=0;updPool(pc,tl);};
  sortWrap.appendChild(sortSel);
  const dirBtn=h('button',{class:'pool-sort-dir',title:'Invertir orden',onclick:()=>{S.poolSortDir=S.poolSortDir==='asc'?'desc':'asc';S.poolPage=0;updPool(pc,tl);}},S.poolSortDir==='asc'?'↑':'↓');
  sortWrap.appendChild(dirBtn);
  ph.appendChild(sortWrap);
  ps.appendChild(ph);
  const pc=h('div',{class:'pchars'});
  updPool(pc,tl);ps.appendChild(pc);w.appendChild(ps);
  return w;
}

const PAGE=200;
async function deleteCustomChar(cid,tl){
  if(!confirm('¿Eliminar este personaje permanentemente? Se borrará de la cloud si fue subido.'))return;
  // Borrar de Supabase si hay sesión
  if(userSession&&sbClient){
    try{
      const cc=(tl.customChars||[]).find(c=>c.id===cid);
      if(cc&&cc.file&&cc.file.startsWith('http')){
        const marker='/tierlists/';
        const idx=cc.file.indexOf(marker);
        if(idx>=0){
          const path=cc.file.slice(idx+marker.length);
          await sbClient.storage.from('tierlists').remove([path]);
        }
      }
      // Borrar solo de la tabla de personajes de ESTA tierlist
      await sbClient.from('characters').delete().eq('id',cid).eq('tierlist_id',tl.id);
    }catch(e){console.error('Error borrando personaje de Supabase:',e);}
  }
  // Quitar de local
  tl.customChars=(tl.customChars||[]).filter(c=>c.id!==cid);
  tl.pool=(tl.pool||[]).filter(x=>x!==cid);
  tl.tiers.forEach(t=>{t.chars=(t.chars||[]).filter(x=>x!==cid);});
  S.hasUnsaved=true;
  const cont=document.querySelector('.pchars');
  if(cont)updPool(cont,tl);
  else render();
  toast('Personaje eliminado');
}

function updPool(cont,tl){
  // Sync direction button text
  const dirBtnEl=document.querySelector('.pool-sort-dir');
  if(dirBtnEl)dirBtnEl.textContent=S.poolSortDir==='asc'?'↑':'↓';
  cont.innerHTML='';
  let chars=tl.pool||[];
  if(S.q){const q=S.q.toLowerCase();chars=chars.filter(cid=>{const c=getChar(cid,tl);return c&&((c.name||'').toLowerCase().includes(q)||(c.anime||'').toLowerCase().includes(q));});}
  // Sorting
  if(S.poolSort&&S.poolSort!=='default'){
    const dir=S.poolSortDir==='desc'?-1:1;
    chars=[...chars].sort((a,b)=>{
      const ca=getChar(a,tl),cb=getChar(b,tl);
      if(!ca&&!cb)return 0;if(!ca)return 1;if(!cb)return -1;
      if(S.poolSort==='added'){
        const da=ca.added_at?new Date(ca.added_at).getTime():null;
        const db2=cb.added_at?new Date(cb.added_at).getTime():null;
        // Sin fecha van al final siempre (independiente del dir)
        if(da===null&&db2===null)return 0;
        if(da===null)return 1;
        if(db2===null)return -1;
        return (da-db2)*dir;
      }
      if(S.poolSort==='name'){
        return (ca.name||'').localeCompare(cb.name||'','es',{sensitivity:'base'})*dir;
      }
      if(S.poolSort==='anime'){
        const cmp=(ca.anime||'').localeCompare(cb.anime||'','es',{sensitivity:'base'});
        if(cmp!==0)return cmp*dir;
        return (ca.name||'').localeCompare(cb.name||'','es',{sensitivity:'base'})*dir;
      }
      if(S.poolSort==='rating'){
        // Custom primero, luego resto
        const ac=ca.isCustom?0:1,bc2=cb.isCustom?0:1;
        if(ac!==bc2)return (ac-bc2)*dir;
        return (ca.name||'').localeCompare(cb.name||'','es',{sensitivity:'base'});
      }
      return 0;
    });
  }
  if(!chars.length){cont.appendChild(h('div',{class:'pempty'},S.q?'Sin resultados':'Pool vacío'));return;}
  const shown=chars.slice(0,(S.poolPage+1)*PAGE);
  shown.forEach(cid=>{
    const c=getChar(cid,tl);if(!c)return;
    const el=h('div',{class:'pc',style:{position:'relative'}});el.dataset.cid=cid;
    el.title=(c.name||cid)+' \u2014 '+(c.anime||'');
    const im=h('img',{src:charImg(cid,tl),alt:c.name||cid,loading:'lazy'});
    im.onerror=()=>{im.src='https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(c.name||cid)+'&size=66';};
    el.appendChild(im);el.appendChild(h('div',{class:'cn'},c.name||cid));
    el.appendChild(h('button',{class:'del-btn',title:'Eliminar permanentemente',onclick:(e)=>{e.stopPropagation();deleteCustomChar(cid,tl);}},'✕'));
    const imgSrcVal=charImg(cid,tl);
    el.addEventListener('pointerdown',e=>dgPointerDown(e,cid,'pool',-1,imgSrcVal));
    cont.appendChild(el);
  });
  if(shown.length<chars.length){
    cont.appendChild(h('div',{class:'load-more',onclick:()=>{S.poolPage++;updPool(cont,tl);}},
      `Ver más \u2014 ${shown.length}/${chars.length}`));
  }
}

