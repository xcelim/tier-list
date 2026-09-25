// Todas las ventanas modales de la aplicación (crear tierlist, ajustes, login, etc).

// ============ MODALS ============
function ModalEl(){
  if(!S.modal)return null;
  const fns={'new-profile':MNewProfile,'edit-profile':MEditProfile,'new-tl':MNewTL,'color':MColor,'pick':MPick,'addchar':MAddChar,'editchar':MEditChar, 'crop-avatar':MCropAvatar, 'chat': MChat};
  const fn=fns[S.modal];
  if(!fn) return null;

  if(S.modal === 'chat') {
     return fn();
  }
  let _ovDown = false;
  const ov=h('div',{
    class:'ov',
    onmousedown: (e) => { if(e.target === ov) _ovDown = true; },
    onmouseup: (e) => { if(_ovDown && e.target === ov) { S.modal = null; render(); } _ovDown = false; }
  });
  ov.appendChild(fn());
  return ov;
}

// NEW PROFILE
function MNewProfile(){
  const m=h('div',{class:'modal'});m.appendChild(h('h2',{},'Nuevo Perfil'));
  let name='';const colors=['#9b7dd4','#f0b429','#55c87d','#e05555','#3498db','#e91e63','#1abc9c','#e67e22'];
  let selColor=colors[0];
  const ng=h('div',{class:'fg'});ng.appendChild(h('label',{},'Nombre'));
  const ni=h('input',{type:'text',placeholder:'Tu nombre o alias',maxlength:'20'});ni.oninput=e=>name=e.target.value;ng.appendChild(ni);m.appendChild(ng);
  const cg=h('div',{class:'fg'});cg.appendChild(h('label',{},'Color'));
  const cr=h('div',{class:'crow'});
  colors.forEach(c=>{const sw=h('div',{class:'csw'+(selColor===c?' sel':''),style:{background:c},onclick:()=>{selColor=c;cr.querySelectorAll('.csw').forEach(s=>s.classList.remove('sel'));sw.classList.add('sel');}});cr.appendChild(sw);});
  cg.appendChild(cr);m.appendChild(cg);
  const row=h('div',{style:{display:'flex',gap:'8px',marginTop:'14px'}});
  row.appendChild(h('button',{class:'btn bg',style:{flex:'1'},onclick:()=>{S.modal=null;render();}},'Cancelar'));
  row.appendChild(h('button',{class:'btn bp',style:{flex:'1'},onclick:()=>{
    if(!name.trim()){toast('Escribe un nombre','err');return;}
    const id='profile_'+uid();
    S.profiles.push({id,name:name.trim(),color:selColor,tls:[],createdAt:Date.now()});
    S.activeProfile=id;saveProfiles();S.modal=null;S.page='home';render();toast('Perfil creado \u2713');
  }},'Crear'));
  m.appendChild(row);setTimeout(()=>ni.focus(),40);return m;
}

// CROP AVATAR MODAL
function MCropAvatar() {
  const m = h('div', { class: 'modal', style: { maxWidth: '450px' } });
  m.appendChild(h('h2', {}, 'Ajustar foto de perfil'));
  const cropCont = h('div', { class: 'crop-container' });
  const img = h('img', { src: S.md.imageSrc });
  cropCont.appendChild(img);
  m.appendChild(cropCont);
  
  const row = h('div', { style: { display: 'flex', gap: '8px' } });
  row.appendChild(h('button', { class: 'btn bg', style: { flex: 1 }, onclick: () => { S.modal = null; render(); } }, 'Cancelar'));
  row.appendChild(h('button', { class: 'btn bp', style: { flex: 1 }, onclick: () => {
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    canvas.toBlob((blob) => {
      S.profileDraft.avatar_url = URL.createObjectURL(blob);
      S.profileDraft._newAvatarBlob = blob;
      S.profileUnsaved = true;
      S.modal = null;
      render();
    }, 'image/png');
  } }, 'Confirmar'));
  m.appendChild(row);

  let cropper;
  setTimeout(() => {
    cropper = new Cropper(img, { aspectRatio: 1, viewMode: 1, dragMode: 'move', guides: false, center: true, highlight: false, cropBoxMovable: false, cropBoxResizable: false, toggleDragModeOnDblclick: false });
  }, 50);
  return m;
}

// CHAT MODAL
function closeChatModal() {
  const el = document.querySelector('.chat-modal');
  if (!el) { S.modal = null; S.chatModalPosition = { x: null, y: null }; render(); return; }
  el.classList.add('closing');
  el.addEventListener('animationend', () => { S.modal = null; S.chatModalPosition = { x: null, y: null }; render(); }, { once: true });
}

function renderChatAvatarItem(c) {
  const members = (c.chat_members || []).filter(m => m.user_id !== userSession?.user?.id);
  if (!c.is_group) {
    const p = members[0]?.profiles;
    if (p?.avatar_url) return h('img', { src: p.avatar_url, class: 'chat-avatar-single' });
    const initEl = h('div', { class: 'chat-avatar-single', style: { background: '#1e2a5a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'bold', color:'var(--accent2)' } }, (p?.name||'?').charAt(0).toUpperCase());
    return initEl;
  }
  // Group
  const wrap = h('div', { class: 'group-avatars-container' });
  const show = members.slice(0, 2);
  show.forEach((m, i) => {
    const p = m.profiles;
    if (p?.avatar_url) {
      wrap.appendChild(h('img', { src: p.avatar_url, class: 'group-avatar-stacked' }));
    } else {
      wrap.appendChild(h('div', { class: 'group-avatar-stacked', style: { background:'#1e2a5a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'7px', fontWeight:'bold', color:'var(--accent2)' } }, (p?.name||'?').charAt(0).toUpperCase()));
    }
  });
  if (members.length > 2) {
    wrap.appendChild(h('div', { class: 'group-avatar-extra' }, '+' + (members.length - 2)));
  }
  return wrap;
}

function MChat() {
  // IMPORTANTE: Si no tenemos los usuarios cargados, los traemos para que el modal de grupo funcione
  if (S.allUsers.length === 0) fetchAllUsers();

  if (!S.chatModalPosition) S.chatModalPosition = { x: null, y: null };
  const hasPos = S.chatModalPosition.x !== null && S.chatModalPosition.y !== null;
  const m = h('div', {
    class: 'chat-modal',
    style: hasPos ? { left: S.chatModalPosition.x + 'px', top: S.chatModalPosition.y + 'px', right: 'auto', bottom: 'auto' } : {}
  });

  // ---- HEADER ----
  const activeChat = S.activeChat || (S.chats?.length > 0 ? S.chats[0] : null);
  const getTitle = (c) => {
    if (!c) return 'Mensajes';
    if (c.is_group) return c.name || 'Grupo';
    const other = (c.chat_members||[]).find(m => m.user_id !== userSession?.user?.id);
    return other?.profiles?.name || 'Usuario';
  };

  const headerLeft = h('div', { class: 'chat-header-left' });
  if (activeChat) {
    headerLeft.appendChild(renderChatAvatarItem(activeChat));
    headerLeft.appendChild(h('span', { class: 'chat-window-title' }, getTitle(activeChat)));
  } else {
    headerLeft.appendChild(h('span', { class: 'chat-window-title' }, 'Mensajes'));
  }

  const closeBtn = h('div', { class: 'chat-close-btn', onclick: closeChatModal });
  closeBtn.appendChild(h('i', { class: 'ti ti-x', style: { fontSize: '14px' } }));

  const header = h('div', { class: 'chat-window-header' });
  header.appendChild(headerLeft);
  header.appendChild(closeBtn);
  m.appendChild(header);

  // ---- DRAG ----
  let dragX, dragY, dragLeft, dragTop;
  header.onmousedown = (e) => {
    if (e.target.closest('.chat-close-btn')) return;
    e.preventDefault();
    dragX = e.clientX; dragY = e.clientY;
    dragLeft = m.offsetLeft; dragTop = m.offsetTop;
    const onMove = (mv) => {
      let nl = dragLeft + (mv.clientX - dragX);
      let nt = dragTop + (mv.clientY - dragY);
      nl = Math.max(0, Math.min(nl, window.innerWidth - m.offsetWidth));
      nt = Math.max(0, Math.min(nt, window.innerHeight - m.offsetHeight));
      m.style.left = nl + 'px'; m.style.top = nt + 'px';
      m.style.right = 'auto'; m.style.bottom = 'auto';
      S.chatModalPosition = { x: nl, y: nt };
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ---- BODY ----
  const body = h('div', { class: 'chat-container-body' });

  // Sidebar
  const sidebar = h('div', { class: 'chat-sidebar' });
  const list = h('div', { class: 'chat-list' });
  (S.chats || []).forEach(c => {
    const name = getTitle(c);
    const item = h('div', { 
      class: 'chat-item' + (S.activeChat?.id === c.id ? ' active' : ''), 
      onclick: () => openChat(c) 
    });
    item.appendChild(renderChatAvatarItem(c));
    const info = h('div', { class: 'chat-item-info' });
    info.appendChild(h('div', { class: 'chat-item-name' }, name));
    if (c.last_message_at) info.appendChild(h('div', { class: 'chat-item-last-msg' }, new Date(c.last_message_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})));
    item.appendChild(info);
    if (c.has_unread) item.appendChild(h('span', { class: 'chat-item-unread-badge' }, '●'));
    list.appendChild(item);
  });
  sidebar.appendChild(list);

  const grpBtn = h('button', { class: 'create-group-btn', onclick: () => abrirModalCrearGrupoRef() }, '+ Grupo');
  sidebar.appendChild(grpBtn);
  body.appendChild(sidebar);

  // Main
  const main = h('div', { class: 'chat-main' });
  if (S.activeChat) {
    const msgs = h('div', { class: 'chat-messages' });
    (S.messages || []).forEach(msg => {
      const isMe = msg.sender_id === userSession.user.id;
      const el = h('div', { class: 'msg ' + (isMe ? 'sent' : 'received') });
      if (S.activeChat.is_group && !isMe) {
        const senderName = (S.activeChat.chat_members||[]).find(cm => cm.user_id === msg.sender_id)?.profiles?.name || '...';
        el.appendChild(h('div', { class: 'chat-sender-name' }, senderName));
      }
      el.appendChild(h('span', {}, msg.content));
      if (msg.created_at) el.appendChild(h('small', { class: 'msg-info' }, new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})));
      msgs.appendChild(el);
    });
    if (!S.messages?.length) msgs.appendChild(h('div', { style: { color:'rgba(255,255,255,0.25)', fontSize:'10px', textAlign:'center', marginTop:'20px' } }, 'Inicio de la conversación'));
    setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 10);
    main.appendChild(msgs);

    const inpArea = h('div', { class: 'chat-input-area' });
    const ci = h('input', { class: 'chat-input', placeholder: 'Mensaje...' });
    const doSend = async () => { const v = ci.value.trim(); if (!v) return; ci.value = ''; await sendChatMessage(v); };
    ci.onkeydown = e => { if (e.key === 'Enter') doSend(); };
    inpArea.appendChild(ci);
    inpArea.appendChild(h('button', { class: 'chat-send-btn', onclick: doSend }, 'Ir'));
    main.appendChild(inpArea);
    setTimeout(() => ci.focus(), 50);
  } else {
    main.appendChild(h('div', { style: { flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.2)', fontSize:'10px' } }, 'Selecciona un chat'));
  }
  body.appendChild(main);
  m.appendChild(body);
  return m;
}

function abrirModalCrearGrupoRef() {
  // Aquí filtramos por relStatus === 'accepted', por eso es vital que fetchAllUsers() haya corrido
  const friends = (S.allUsers || []).filter(u => u.relStatus === 'accepted');
  const overlay = h('div', { class: 'group-creation-overlay', onclick: (e) => { if (e.target === overlay) overlay.remove(); } });
  const box = h('div', { class: 'group-creation-box' });
  box.appendChild(h('h4', { style: 'color:white; font-size:12px; margin-bottom:8px;' }, 'Nuevo grupo'));
  const nameInp = h('input', { type: 'text', placeholder: 'Nombre del grupo...', class: 'chat-input', style: 'width:100%; margin-bottom:8px;' });
  box.appendChild(nameInp);
  const list = h('div', { class: 'friend-selection-list' });
  if (friends.length === 0) {
    list.appendChild(h('div', { style: 'color:rgba(255,255,255,0.4); font-size:11px;' }, 'No tienes amigos aún'));
  }
  friends.forEach(f => {
    const item = h('label', { class: 'friend-select-item' });
    const cb = h('input', { type: 'checkbox', value: f.id });
    cb.dataset.avatar = f.avatar_url || '';
    item.appendChild(cb);
    if (f.avatar_url) item.appendChild(h('img', { src: f.avatar_url, style: 'width:18px;height:18px;border-radius:50%;object-fit:cover;' }));
    item.appendChild(h('span', {}, f.name));
    list.appendChild(item);
  });
  box.appendChild(list);
  const actions = h('div', { class: 'group-box-actions' });
  actions.appendChild(h('button', { class: 'btn-cancel', onclick: () => overlay.remove() }, 'Cancelar'));
  actions.appendChild(h('button', { class: 'btn-confirm', onclick: async () => {
    const gname = nameInp.value.trim() || 'Nuevo Grupo';
    const selected = Array.from(list.querySelectorAll('input:checked')).map(cb => cb.value);
    if (!selected.length) { toast('Selecciona al menos un amigo', 'err'); return; }
    await createGroup(gname, selected);
    overlay.remove();
  }}, 'Crear'));
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(() => nameInp.focus(), 50);
}

// EDIT PROFILE
function MEditProfile(){
  const p=getProfile(S.md.profileId);if(!p)return h('div',{class:'modal'},h('p',{},'Error'));
  const m=h('div',{class:'modal'});m.appendChild(h('h2',{},'Editar Perfil'));
  const colors=['#9b7dd4','#f0b429','#55c87d','#e05555','#3498db','#e91e63','#1abc9c','#e67e22'];
  let name=p.name,selColor=p.color;
  const ng=h('div',{class:'fg'});ng.appendChild(h('label',{},'Nombre'));
  const ni=h('input',{type:'text',value:p.name,maxlength:'20'});ni.oninput=e=>name=e.target.value;ng.appendChild(ni);m.appendChild(ng);
  const cg=h('div',{class:'fg'});cg.appendChild(h('label',{},'Color'));
  const cr=h('div',{class:'crow'});
  colors.forEach(c=>{const sw=h('div',{class:'csw'+(selColor===c?' sel':''),style:{background:c},onclick:()=>{selColor=c;cr.querySelectorAll('.csw').forEach(s=>s.classList.remove('sel'));sw.classList.add('sel');}});cr.appendChild(sw);});
  cg.appendChild(cr);m.appendChild(cg);
  const row=h('div',{style:{display:'flex',gap:'8px',marginTop:'14px'}});
  row.appendChild(h('button',{class:'btn bg',style:{flex:'1'},onclick:()=>{S.modal=null;render();}},'Cancelar'));
  row.appendChild(h('button',{class:'btn bp',style:{flex:'1'},onclick:()=>{
    p.name=name.trim()||p.name;p.color=selColor;saveProfiles();S.modal=null;render();toast('Perfil actualizado \u2713');
  }},'Guardar'));
  m.appendChild(row);return m;
}

// NEW TIERLIST
function MNewTL(){
  const m=h('div',{class:'modal'});m.appendChild(h('h2',{},'Nueva Tierlist'));
  let title='',folder='';
  const g1=h('div',{class:'fg'});g1.appendChild(h('label',{},'Título'));
  const inp=h('input',{type:'text',placeholder:'Ej: Mis Waifus Top'});
  const fi=h('input',{type:'text',placeholder:'nombre_carpeta'});
  // Aviso de nombre duplicado
  const dupWarn=h('div',{style:{fontSize:'11px',color:'var(--red)',marginTop:'4px',display:'none'}},'⚠ Ya existe una tierlist con ese nombre. Elige otro.');
  inp.oninput=e=>{
    title=e.target.value;fi.value=sanFolder(title);folder=fi.value;
    const p=activeProfile();
    const isDup=p&&p.tls.some(t=>t.title.trim().toLowerCase()===title.trim().toLowerCase());
    dupWarn.style.display=isDup?'block':'none';
    createBtn.disabled=isDup||!title.trim();
    createBtn.style.opacity=createBtn.disabled?'0.5':'1';
  };
  fi.oninput=e=>folder=e.target.value;
  g1.appendChild(inp);g1.appendChild(dupWarn);m.appendChild(g1);
  const g2=h('div',{class:'fg'});g2.appendChild(h('label',{},'Carpeta de imágenes'));g2.appendChild(fi);
  g2.appendChild(h('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'3px'}},'Crea esta carpeta junto al HTML para fotos propias'));
  m.appendChild(g2);
  const g3=h('div',{class:'fg'});g3.appendChild(h('label',{},'Empezar con'));
  const sel=h('select',{});
  sel.appendChild(h('option',{value:'waifus'},'Tierlist Waifus completa (2050 personajes)'));
  sel.appendChild(h('option',{value:'empty'},'Vacía'));
  g3.appendChild(sel);m.appendChild(g3);
  const row=h('div',{style:{display:'flex',gap:'8px',marginTop:'14px'}});
  row.appendChild(h('button',{class:'btn bg',style:{flex:'1'},onclick:()=>{S.modal=null;render();}},'Cancelar'));
  const createBtn=h('button',{class:'btn bp',style:{flex:'1'},onclick:()=>{
    if(!title.trim()){toast('Escribe un título','err');return;}
    const p=activeProfile(); if(!p) return;
    // Validación final de nombre duplicado
    const isDup=p.tls.some(t=>t.title.trim().toLowerCase()===title.trim().toLowerCase());
    if(isDup){toast('Ya existe una tierlist con ese nombre','err');return;}
    const id=uid();const fl=folder||sanFolder(title);
    const defT=[{id:uid(),label:'S',color:'#e74c3c',chars:[]},{id:uid(),label:'A',color:'#e67e22',chars:[]},{id:uid(),label:'B',color:'#f1c40f',chars:[]},{id:uid(),label:'C',color:'#2ecc71',chars:[]},{id:uid(),label:'D',color:'#3498db',chars:[]},{id:uid(),label:'F',color:'#636e72',chars:[]}];
    
    const newTL = {
      id, title: title.trim(), folder: fl,
      tiers: sel.value==='waifus' ? JSON.parse(JSON.stringify(DT)) : defT,
      pool: sel.value==='waifus' ? [...DP] : [],
      customChars: [], createdAt: Date.now(), updatedAt: Date.now(),
      isRemoteTemplate: true  // marcada como global desde el inicio
    };

    if (userSession) {
      // Crear la tierlist en la tabla tierlists
      sbClient.from('tierlists').insert({
        id, title: newTL.title, folder: fl,
        tiers_config: newTL.tiers,
        created_by: userSession.user.id
      }).then(async ({error}) => {
        if(error) { toast("Error guardando tierlist", "err"); return; }
        // Crear tabla propia para personajes de esta tierlist via RPC
        try {
          await sbClient.rpc('create_tierlist_chars_table', {tierlist_id: id});
        } catch(e) {
          console.log('RPC create_tierlist_chars_table no disponible, usando tabla characters compartida');
        }
        toast("Tierlist creada en la nube ✓");
      });
    }

    p.tls.push(newTL);
    saveProfiles();S.modal=null;openEditor(id);render();toast('Tierlist creada ✓');
  }},'Crear');
  row.appendChild(createBtn);
  m.appendChild(row);setTimeout(()=>inp.focus(),40);return m;
}

// COLOR
function MColor(){
  const{tier}=S.md;
  const m=h('div',{class:'modal'});m.appendChild(h('h2',{},'Color del Tier'));
  const COLS=['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6','#1abc9c','#e91e63','#ff5722','#607d8b','#ff4757','#ffd32a','#2ed573','#1e90ff','#fd79a8','#a29bfe','#00cec9','#fdcb6e','#d63031','#00b894','#6c5ce7','#fab1a0','#e17055','#74b9ff'];
  const cr=h('div',{class:'crow'});
  COLS.forEach(c=>{cr.appendChild(h('div',{class:'csw'+(tier.color===c?' sel':''),style:{background:c},onclick:()=>{tier.color=c;S.hasUnsaved=true;S.modal=null;render();}}));});
  m.appendChild(cr);
  const cg=h('div',{class:'fg',style:{marginTop:'10px'}});cg.appendChild(h('label',{},'Personalizado'));
  const ci=h('input',{type:'color',value:tier.color||'#888',style:{width:'56px',height:'34px',padding:'2px',cursor:'pointer'}});
  ci.oninput=e=>{tier.color=e.target.value;S.hasUnsaved=true;};
  cg.appendChild(ci);m.appendChild(cg);
  m.appendChild(h('button',{class:'btn bp',style:{width:'100%',marginTop:'10px'},onclick:()=>{S.modal=null;render();}},'Aplicar'));
  return m;
}

// PICK FROM CATALOGUE
function MPick(){
  const tl=S.workingTL;if(!tl)return h('div',{class:'modal'},h('p',{},'Error'));
  const m=h('div',{class:'modal'});
  m.appendChild(h('h2',{},'Cat\xe1logo \u2014 '+Object.keys(AC).length+' personajes'));
  const inU=new Set([...(tl.pool||[]),...(tl.tiers||[]).flatMap(t=>t.chars||[]),...(tl.customChars||[]).map(c=>c.id)]);
  let q='',catPage=0;const CSZ=60;
  const si=h('input',{type:'text',placeholder:'Buscar nombre, anime o t\xedtulo en cualquier idioma...',style:{width:'100%',marginBottom:'9px'}});
  m.appendChild(si);
  const ld=h('div',{style:{maxHeight:'360px',overflowY:'auto'}});m.appendChild(ld);
  function upd(reset){
    if(reset)catPage=0;ld.innerHTML='';
    const resolved=resolveAlias(q);
    const all=Object.values(AC).filter(c=>{
      if(!q)return true;
      const ql=q.toLowerCase();const rl=resolved.toLowerCase();
      return(c.name||'').toLowerCase().includes(ql)||(c.anime||'').toLowerCase().includes(ql)||(c.anime||'').toLowerCase().includes(rl);
    });
    const shown=all.slice(0,(catPage+1)*CSZ);
    if(!shown.length){ld.appendChild(h('div',{style:{color:'var(--text3)',padding:'16px',textAlign:'center'}},'Sin resultados'));return;}
    shown.forEach(c=>{
      const inside=inU.has(c.id);
      const row=h('div',{style:{display:'flex',alignItems:'center',gap:'7px',padding:'5px 4px',borderRadius:'5px',background:inside?'var(--accentbg)':'transparent',marginBottom:'2px'}});
      const im=h('img',{src:charImg(c.id, tl),alt:c.name,style:{width:'36px',height:'44px',objectFit:'cover',borderRadius:'4px',flexShrink:'0'}});
      im.onerror=()=>{im.src='https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(c.name)+'&size=36';};
      row.appendChild(im);
      const info=h('div',{style:{flex:'1',minWidth:'0'}});
      info.appendChild(h('div',{style:{fontWeight:'500',fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},c.name));
      info.appendChild(h('div',{style:{fontSize:'10px',color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},c.anime||''));
      row.appendChild(info);
      row.appendChild(h('button',{class:'btn bg bsm',title:'Editar',onclick:()=>{S.modal='editchar';S.md={charId:c.id,fromCat:true,onDone:()=>{S.modal='pick';render();}};render();}},'✏'));
      row.appendChild(h('button',{class:inside?'btn bd bsm':'btn bp bsm',onclick:()=>{
        if(inside){tl.pool=tl.pool.filter(x=>x!==c.id);tl.tiers.forEach(t=>{t.chars=t.chars.filter(x=>x!==c.id);});inU.delete(c.id);}
        else{tl.pool.push(c.id);inU.add(c.id);}
        S.hasUnsaved=true;upd(false);
      }},inside?'Quitar':'A\xf1adir'));
      ld.appendChild(row);
    });
    if(shown.length<all.length)ld.appendChild(h('div',{class:'load-more',onclick:()=>{catPage++;upd(false);}},`Ver m\xe1s \u2014 ${shown.length}/${all.length}`));
  }
  si.oninput=e=>{q=e.target.value.toLowerCase();upd(true);};upd(true);
  m.appendChild(h('button',{class:'btn bp',style:{width:'100%',marginTop:'10px'},onclick:()=>{S.modal=null;render();}},'Cerrar'));
  return m;
}

// ADD CUSTOM CHAR (con AniList)
function MAddChar(){
  const tl=S.workingTL;if(!tl)return h('div',{class:'modal'},h('p',{},'Error'));
  const m=h('div',{class:'modal'});
  m.appendChild(h('h2',{},'A\xf1adir waifu a "'+tl.title+'"'));
  let imgData=null,fileName='',charName='',animeName='',aniSearchT=null;

  // Image
  const ig=h('div',{class:'fg'});ig.appendChild(h('label',{},'Imagen (de tu PC)'));
  const uarea=h('div',{class:'uarea'});
  const uinp=h('input',{type:'file',accept:'image/*'});
  const utxt=h('p',{style:{margin:'0',pointerEvents:'none'}},'?? Haz clic para elegir imagen');
  const uprv=h('img',{class:'upreview'});
  uinp.onchange=e=>{
    const f=e.target.files[0];if(!f)return;fileName=f.name;
    const fr=new FileReader();
    fr.onload=ev=>{imgData=ev.target.result;uprv.src=imgData;uprv.style.display='block';utxt.textContent='\u2713 '+f.name;
      if(!charName){const n=f.name.replace(/\.(png|jpg|jpeg|gif|webp)$/i,'').replace(/[-_]/g,' ');ni.value=n;charName=n;}
    };fr.readAsDataURL(f);
  };
  uarea.appendChild(uinp);uarea.appendChild(utxt);uarea.appendChild(uprv);ig.appendChild(uarea);m.appendChild(ig);

  // Name
  const ng=h('div',{class:'fg'});ng.appendChild(h('label',{},'Nombre'));
  const ni=h('input',{type:'text',placeholder:'Ej: Rem', onmousedown: e => e.stopPropagation()});ni.oninput=e=>charName=e.target.value;ng.appendChild(ni);m.appendChild(ng);

  // Anime (AniList)
  const ag=h('div',{class:'fg'});ag.appendChild(h('label',{},'Anime (busca en cualquier idioma)'));
  const awrap=h('div',{class:'ac-wrap'});
  const ai=h('input',{type:'text',placeholder:'Ej: yofukashi no uta, Demon Slayer, naruto...', onmousedown: e => e.stopPropagation()});
  const acl=h('div',{class:'ac-list',style:{display:'none'}});
  let acFocus=-1,aniResults=[];

  async function doAniSearch(raw){
    const resolved=resolveAlias(raw);
    const query=resolved!==raw?resolved:raw;
    const results=await searchAniList(query);
    // also try original if different
    let extra=[];
    if(resolved!==raw){extra=await searchAniList(raw);}
    aniResults=[...results,...extra.filter(r=>!results.find(x=>x.id===r.id))].slice(0,12);
    renderAC();
  }
  function renderAC(){
    acl.innerHTML='';acFocus=-1;
    if(!aniResults.length){acl.style.display='none';return;}
    aniResults.forEach((a,i)=>{
      const disp=a.english&&a.english!==a.title?a.title+' / '+a.english:a.title;
      const it=h('div',{class:'ac-item',onclick:()=>{ai.value=a.title;animeName=a.title;acl.style.display='none';}});
      if(a.cover){const img=h('img',{src:a.cover,alt:''});it.appendChild(img);}
      const info=h('div',{class:'ac-item-info'});
      info.appendChild(h('div',{class:'ac-item-title'},disp));
      if(a.year)info.appendChild(h('div',{class:'ac-item-sub'},a.year+''));
      it.appendChild(info);it.dataset.idx=i;acl.appendChild(it);
    });
    acl.style.display='block';
  }
  ai.oninput=e=>{
      animeName=e.target.value; // Update animeName immediately
    clearTimeout(aniSearchT);
    if(e.target.value.length>=2){aniSearchT=setTimeout(()=>doAniSearch(e.target.value),350);}
    else{acl.style.display='none';}
  };
  ai.onkeydown=e=>{
    const items=acl.querySelectorAll('.ac-item');
    if(e.key==='ArrowDown'){acFocus=Math.min(acFocus+1,items.length-1);items.forEach((it,i)=>it.classList.toggle('focused',i===acFocus));e.preventDefault();}
    else if(e.key==='ArrowUp'){acFocus=Math.max(acFocus-1,0);items.forEach((it,i)=>it.classList.toggle('focused',i===acFocus));e.preventDefault();}
    else if(e.key==='Enter'&&acFocus>=0){const it=items[acFocus];if(it){ai.value=aniResults[acFocus]?.title||it.textContent;animeName=ai.value;acl.style.display='none';}}
    else if(e.key==='Escape')acl.style.display='none';
  };
  document.addEventListener('mousedown',e=>{if(!awrap.contains(e.target))acl.style.display='none';});
  awrap.appendChild(ai);awrap.appendChild(acl);ag.appendChild(awrap);m.appendChild(ag);

  m.appendChild(h('div',{style:{fontSize:'10px',color:'var(--text3)',padding:'6px 8px',background:'var(--bg3)',borderRadius:'5px',marginBottom:'12px'}},
    '?? Carpeta: ./'+tl.folder));
  const row=h('div',{style:{display:'flex',gap:'8px'}});
  row.appendChild(h('button',{class:'btn bg',style:{flex:'1'},onclick:()=>{S.modal=null;render();}},'Cancelar'));
  row.appendChild(h('button',{class:'btn bp',style:{flex:'1'},onclick:async ()=>{
    if(!charName.trim()){toast('Escribe el nombre','err');return;}
    if(!imgData){toast('Elige una imagen','err');return;}
    
    const cid='custom_'+uid();
    let cloudUrl = null;

    if(userSession) {
      try {
        toast("Subiendo imagen a la nube...", "info");
        // Convertir base64 a blob para la subida
        const blob = await (await fetch(imgData)).blob();
        const fileExt = fileName.split('.').pop() || 'png';
        const filePath = `${tl.folder}/${cid}.${fileExt}`;
        
        const { error: uploadErr } = await sbClient.storage.from('tierlists').upload(filePath, blob);
        if(uploadErr) throw uploadErr;

        const { data: { publicUrl } } = sbClient.storage.from('tierlists').getPublicUrl(filePath);
        cloudUrl = publicUrl;

        // Registrar en la tabla de personajes para que sea global
        // Insertar personaje en la tabla de characters de ESTA tierlist
        await sbClient.from('characters').insert({
          id: cid, tierlist_id: tl.id, name: charName.trim(), anime: animeName.trim()||'Custom', image_url: cloudUrl, created_by: userSession.user.id, added_at: new Date().toISOString()
        });
        // También intentar insertar en tabla específica si existe
        try {
          await sbClient.rpc('insert_char_in_tierlist_table', {tierlist_id: tl.id, char_id: cid, char_name: charName.trim(), anime_name: animeName.trim()||'Custom', img_url: cloudUrl});
        } catch(e) {}
      } catch(e) {
        console.error("Error en Storage:", e);
        toast("Error en nube, se guardar\xe1 solo local", "err");
      }
    }

    const cc={id:cid,name:charName.trim(),anime:animeName.trim()||'Custom',fileName,imageData:cloudUrl?null:imgData,file:cloudUrl,isCustom:true,added_at:new Date().toISOString()};
    if(!tl.customChars)tl.customChars=[];
    tl.customChars.push(cc);tl.pool.unshift(cid);
    S.hasUnsaved=true;S.modal=null;render();toast(charName+' a\xf1adida \u2713');
  }},'Guardar'));
  m.appendChild(row);return m;
}

// EDIT CHAR
function MEditChar(){
  const{charId,fromCat,onDone}=S.md;
  const tl=S.workingTL;
  const c=fromCat?AC[charId]:getChar(charId,tl);
  if(!c)return h('div',{class:'modal'},h('p',{},'No encontrado'));
  const m=h('div',{class:'modal'});m.appendChild(h('h2',{},'Editar personaje'));
  const ph=h('div',{style:{display:'flex',gap:'12px',alignItems:'center',marginBottom:'14px'}});
  const pi=h('img',{class:'char-edit-preview',src:fromCat?('./resources/waifus/'+(c.file||'')):(c.imageData||('./resources/waifus/'+(c.file||'')))});
  pi.onerror=()=>{pi.src='https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(c.name)+'&size=80';};
  ph.appendChild(pi);ph.appendChild(h('div',{},h('div',{style:{fontWeight:'600',fontSize:'14px'}},c.name),h('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}},c.anime||'')));
  m.appendChild(ph);
  let newName=c.name,newAnime=c.anime||'',aniSearchT2=null,aniRes2=[];
      const ng=h('div',{class:'fg'});ng.appendChild(h('label',{},'Nombre')); // Name input
      const ni=h('input',{type:'text',value:c.name, onmousedown:(e)=>e.stopPropagation()});ni.oninput=e=>newName=e.target.value;ng.appendChild(ni);m.appendChild(ng);
      const ag=h('div',{class:'fg'});ag.appendChild(h('label',{},'Anime')); // Anime input
      const awrap=h('div',{class:'ac-wrap'}); 
  const ai=h('input',{type:'text',value:c.anime||''});
  const acl=h('div',{class:'ac-list',style:{display:'none'}});
  let acF=-1;
  async function doSearch2(raw){
    const resolved=resolveAlias(raw);
    aniRes2=await searchAniList(resolved!==raw?resolved:raw);
    acl.innerHTML='';acF=-1;
    if(!aniRes2.length){acl.style.display='none';return;}
    aniRes2.forEach((a,i)=>{
      const it=h('div',{class:'ac-item',onclick:()=>{ai.value=a.title;newAnime=a.title;acl.style.display='none';}});
      if(a.cover){const img=h('img',{src:a.cover,alt:''});it.appendChild(img);}
      const info=h('div',{class:'ac-item-info'});
      info.appendChild(h('div',{class:'ac-item-title'},a.title));
      it.appendChild(info);acl.appendChild(it);
    });
    acl.style.display='block';
  }
    ai.oninput=e=>{newAnime=e.target.value;clearTimeout(aniSearchT2);if(e.target.value.length>=2)aniSearchT2=setTimeout(()=>doSearch2(e.target.value),350);else acl.style.display='none';}; // Anime input
    ai.onmousedown = (e) => e.stopPropagation(); // Prevent modal closing when interacting with this input
  awrap.appendChild(ai);awrap.appendChild(acl);ag.appendChild(awrap);m.appendChild(ag);
  const row=h('div',{style:{display:'flex',gap:'8px',marginTop:'14px'}});
  row.appendChild(h('button',{class:'btn bg',style:{flex:'1'},onclick:()=>{S.modal=null;if(onDone)onDone();else render();}},'Cancelar'));
  row.appendChild(h('button',{class:'btn bp',style:{flex:'1'},onclick:()=>{
    if(fromCat&&AC[charId]){AC[charId].name=newName.trim()||c.name;AC[charId].anime=newAnime.trim()||c.anime;}
    else{const cur=getChar(charId,tl);if(cur){cur.name=newName.trim()||c.name;cur.anime=newAnime.trim()||c.anime;}}
    S.hasUnsaved=true;toast('Guardado \u2713');if(onDone)onDone();else{S.modal=null;render();}
  }},'Guardar'));
  m.appendChild(row);setTimeout(()=>ni.focus(),40);return m;
}

