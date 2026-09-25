// Páginas principales de la app: Home, Tierlists, Usuarios, Perfil de
// usuario visitado, Visor (modo observador) y Ajustes/Perfil propio.

// ============ HOME ============
function Home(){
  const w=h('div',{});

  // Header
  const hdr=h('div',{class:'hh'});
  hdr.appendChild(h('h1',{},'AnimeTier'));
  const hhDiamond = h('div',{class:'hh-diamond-sep'});
  hhDiamond.innerHTML = '<span class="diamond"></span>';
  hdr.appendChild(hhDiamond);
  hdr.appendChild(h('p',{},'Crea, compara y descubre los mejores rankings de anime'));
  w.appendChild(hdr);

  if(!userSession){
    w.appendChild(h('div',{class:'profile-notice'},
      h('h2',{},'Bienvenido'),
      h('p',{style:{color:'var(--text2)',fontSize:'14px'}},'Inicia sesión para empezar a rankear'),
      h('button', { class: 'btn bp', style: {marginTop: '20px'}, onclick: handleGoogleLogin }, 'Iniciar Sesión con Google')
    ));
    return w;
  }

  const ICONS = {
    tierlists: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    users: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    profile: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  };

  const menu = h('div', { class: 'menu-grid' });
  const items = [
    { id: 'tierlists', title: 'Tierlists', cls: 'mb-tierlists' },
    { id: 'users',     title: 'Usuarios',  cls: 'mb-users' },
    { id: 'profile',   title: 'Perfil',    cls: 'mb-profile' }
  ];

  items.forEach(item => {
    const iconEl = h('div', { class: 'mb-icon' });
    iconEl.innerHTML = ICONS[item.id];
    const sepEl = h('div', { class: 'mb-sep' });
    sepEl.innerHTML = '<span class="mb-diamond"></span>';
    const content = h('div', { class: 'mb-content' },
      iconEl,
      h('h2', {}, item.title),
      sepEl
    );
    menu.appendChild(h('div', { class: `menu-box ${item.cls}`, onclick: () => { S.page = item.id; render(); } }, content));
  });

  w.appendChild(menu);
  w.appendChild(h('div', {class:'hh-footer'}, 'Hecho con pasión para verdaderos amantes del anime'));
  return w;
}

function TierlistsPage() {
  const w=h('div',{});
  // Sincronización automática al entrar a la pantalla principal
  if (!S._ref) { S._ref = true; fetchGlobalTemplates().finally(() => setTimeout(() => S._ref = false, 5000)); }

  const p = activeProfile();
  if(!p) return w;
  const g=h('div',{class:'tlg'});
  g.appendChild(h('div',{class:'nc',onclick:()=>{S.modal='new-tl';S.md={};render();}},h('div',{class:'plus'},'+'),h('span',{style:{fontSize:'13px'}},'Nueva Tierlist')));
  [...(p.tls||[])].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).forEach(tl=>{
    const card=h('div',{class:'tlc',onclick:()=>{openEditor(tl.id);render();}});
    const ca=h('div',{class:'tlca'});
    if (p.is_admin) {
      ca.appendChild(h('button',{class:'btn bg bsm',onclick:(e)=>{e.stopPropagation();dupTL(tl.id);},'title':'Duplicar'},'⧇'));
      ca.appendChild(h('button',{class:'btn bd bsm',onclick:(e)=>{e.stopPropagation();delTL(tl.id);},'title':'Eliminar'},'✕'));
    }
    // ... resto de la lógica de card que ya tenías ...
    const tot=(tl.tiers||[]).reduce((a,t)=>a+(t.chars||[]).length,0)+(tl.pool||[]).length;
    card.appendChild(ca); card.appendChild(h('h3',{},tl.title||'Sin título'));
    card.appendChild(h('div',{class:'meta'},h('span',{},(tl.tiers||[]).length+' tiers'),h('span',{},tot+' chars')));
    g.appendChild(card);
  });
  w.appendChild(g); return w;
}

function UsersPage() {
  if (S.allUsers.length === 0) fetchAllUsers();

  const w = h('div', { class: 'users-page' });

  // Header con título estilo referencia
  const hdr = h('div', { class: 'users-page-header' });
  hdr.appendChild(h('h1', { class: 'users-page-title' }, 'Usuarios'));
  const diam = h('div', { class: 'users-page-diamond' });
  diam.innerHTML = '<span class="up-diamond"></span>';
  hdr.appendChild(diam);
  hdr.appendChild(h('p', { class: 'users-page-sub' }, 'Descubre nuevos usuarios y amplía tu red de amigos.'));
  w.appendChild(hdr);

  // Buscador
  const swrap = h('div', { class: 'users-search-wrap' });
  const si = h('input', { placeholder: 'Buscar usuarios por nombre...' });
  si.value = S.userSearch || '';
  swrap.appendChild(si);
  w.appendChild(swrap);

  const grid = h('div', { class: 'user-grid' });

  const drawGrid = () => {
    grid.innerHTML = '';
    const filtered = S.allUsers.filter(u => u.name.toLowerCase().includes(S.userSearch || ''));

    filtered.forEach(u => {
      const card = h('div', { 
        class: 'user-card',
        onclick: () => {
          // Permitir ver si son amigos o si soy yo mismo
          if (u.relStatus === 'accepted' || u.id === userSession?.user.id) viewUser(u.id);
          else toast("Solo puedes ver perfiles de amigos", "info");
        }
      });

      // Avatar con anillo de glow
      const avWrap = h('div', { class: 'user-avatar-wrap' });
      avWrap.appendChild(h('div', { class: 'user-avatar-ring' }));
      avWrap.appendChild(h('div', { class: 'user-avatar-border' }));
      const av = h('img', { class: 'user-avatar', src: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}` });
      avWrap.appendChild(av);
      card.appendChild(avWrap);

      // Nombre sin @
      card.appendChild(h('span', { class: 'user-name' }, u.name));

      // Estadísticas Reales
      card.appendChild(h('div', { class: 'user-stats' }, `${u.tl_count || 0} tierlists · ${u.friend_count || 0} amigos`));

      // Botón de acción dinámico
      if(userSession && u.id !== userSession.user.id) {
        let btn;
        if(u.relStatus === 'none') {
          btn = h('button', { class: 'user-add-btn', onclick: (e) => { e.stopPropagation(); sendFriendRequest(u.id); } }, '+');
        } else if(u.relStatus === 'pending_sent') {
          btn = h('button', { class: 'user-add-btn pending', title: 'Cancelar solicitud', onclick: (e) => { e.stopPropagation(); removeFriend(u.relId, true); } }, '...');
        } else if(u.relStatus === 'pending_received') {
          btn = h('button', { class: 'user-add-btn pending', title: 'Ver solicitud recibida', onclick: (e) => { e.stopPropagation(); S.notifMenu = true; render(); } }, '!');
        } else if(u.relStatus === 'accepted') {
          btn = h('button', { class: 'user-add-btn remove', title: 'Eliminar amigo', onclick: (e) => { e.stopPropagation(); removeFriend(u.relId); } }, '✕');
        } else {
          btn = h('button', { class: 'user-add-btn pending', title: 'Tienes una solicitud de este usuario' }, '!');
        }
        if(btn) card.appendChild(btn);
      }
      grid.appendChild(card);
    });
  };

  si.oninput = (e) => { 
    S.userSearch = e.target.value.toLowerCase(); 
    drawGrid(); 
  };

  drawGrid();

  w.appendChild(grid);
  w.appendChild(h('div', { class: 'users-footer' }, '♡ Conecta, comparte y crea la mejor comunidad de anime.'));
  return w;
}

function UserViewPage() {
  const u = S.viewingUser;
  if(!u) return h('div', {}, 'Usuario no encontrado');
  
  const w = h('div', { class: 'users-page' });
  const hdr = h('div', { class: 'users-page-header' });
  hdr.appendChild(h('img', { 
    src: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`,
    style: {width:'100px', height:'100px', borderRadius:'50%', border:'3px solid var(--accent)', marginBottom:'15px'}
  }));
  hdr.appendChild(h('h1', { class: 'users-page-title' }, u.name));
  hdr.appendChild(h('p', { class: 'users-page-sub' }, `Viendo los rankings de tu amigo`));
  w.appendChild(hdr);

  const grid = h('div', { class: 'tlg' });
  if(u.rankings.length === 0) {
    grid.appendChild(h('div', {style:{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'var(--text3)'}}, 'Este usuario aún no ha guardado ningún ranking.'));
  } else {
    u.rankings.forEach(r => {
      const tl = r.tierlists || { title: 'Tierlist desconocida' };
      const card = h('div', { class: 'tlc', onclick: () => openViewer(r) });
      card.appendChild(h('h3', {}, tl.title));
      card.appendChild(h('div', { class: 'meta' }, h('span', {}, 'Ver ranking →')));
      grid.appendChild(card);
    });
  }
  w.appendChild(grid);
  return w;
}

function Viewer() {
  const r = S.viewingRank;
  const tlMeta = r.tierlists || {};
  const w = h('div', {});
  
  const tb = h('div', { class: 'etbar' });
  tb.appendChild(h('div', { class: 'etitle hf' }, `Observando: ${tlMeta.title || 'Ranking'}`));
  tb.appendChild(h('div', { style:{marginLeft:'auto', color:'var(--text3)', fontSize:'12px'} }, `Ranking de ${S.viewingUser?.name}`));
  w.appendChild(tb);

  const tw = h('div', { class: 'twrap' });
  const tiers = r.tiers_data || [];
  
  tiers.forEach(tier => {
    const row = h('div', { class: 'trow' });
    const lbl = h('div', { class: 'tlbl', style: { background: tier.color || '#888' } });
    lbl.appendChild(h('div', { class: 'tlbl-txt' }, tier.label || '?'));
    row.appendChild(lbl);

    const ce = h('div', { class: 'tchars' });
    (tier.chars || []).forEach(cid => {
      const c = getChar(cid, { folder: tlMeta.folder });
      if(!c) return;
      const el = h('div', { class: 'tc', style: { position: 'relative' } });
      const imgSrc = charImg(cid, { folder: tlMeta.folder });
      el.appendChild(h('img', { 
        src: imgSrc,
        onerror: (e) => e.target.src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(c.name)
      }));
      el.appendChild(h('div', { class: 'cn' }, c.name));
      ce.appendChild(el);
    });
    row.appendChild(ce);
    tw.appendChild(row);
  });
  w.appendChild(tw);
  return w;
}

function ProfilePage() {
  if (!userSession) return Home();
  
  // Inicializar borrador si no existe
  if (!S.profileDraft) {
    S.profileDraft = JSON.parse(JSON.stringify(currentUserProfile));
    S.profileUnsaved = false;
  }

  const p = S.profileDraft;
  if (S.allUsers.length === 0) fetchAllUsers();

  const markProfileDirty = () => {
    // Comparar con el original para ver si realmente ha cambiado
    const isChanged = p.name !== currentUserProfile.name || 
                     p.color !== currentUserProfile.color || 
                     p._newAvatarBlob;
    S.profileUnsaved = isChanged; render();
  };

  const w = h('div', {});

  // Fondo decorativo (estrellas + círculos)
  const stars = h('div', { id: 'stars' });
  for (let i = 0; i < 55; i++) {
    const size = Math.random() * 2.5 + 0.8;
    stars.appendChild(h('div', { class: 'star', style: {
      width: size+'px', height: size+'px',
      top: (Math.random()*100)+'%', left: (Math.random()*100)+'%',
      animationDelay: (Math.random()*5).toFixed(2)+'s',
      animationDuration: (2+Math.random()*3).toFixed(2)+'s'
    }}));
  }
  w.appendChild(stars);
  w.appendChild(h('div', { class: 'deco-circle', style:{width:'300px',height:'300px',top:'-80px',right:'-60px'} }));
  w.appendChild(h('div', { class: 'deco-circle', style:{width:'200px',height:'200px',bottom:'200px',left:'-80px'} }));
  w.appendChild(h('div', { class: 'deco-circle', style:{width:'150px',height:'150px',top:'40%',right:'-30px'} }));

  const content = h('div', { class: 'profile-content' });

  // Barra de cambios sin guardar
  if(S.profileUnsaved){
    const cb=h('div',{class:'confirm-bar'});
    cb.appendChild(h('span',{},'\u26A0\uFE0F Tienes cambios en tu perfil sin guardar'));
    cb.appendChild(h('button',{class:'btn btn-save',onclick:saveProfileChanges},'\u2713 Guardar cambios'));
    cb.appendChild(h('button',{class:'btn bd bsm',onclick:()=>{S.profileDraft=null; S.profileUnsaved=false; render();}},'Descartar'));
    content.appendChild(cb);
  }

  // Header
  content.appendChild(h('h1', { class: 'page-title' }, 'Perfil', h('span', { class: 'heart-icon' })));
  content.appendChild(h('p', { class: 'page-subtitle' },
    h('span', { class: 'diamond-sm' }),
    'Personaliza tu perfil y gestiona tu cuenta.',
    h('span', { class: 'diamond-sm' })
  ));

  // Profile card
  const card = h('div', { class: 'profile-card' });
  const top = h('div', { class: 'profile-top' });

  // Avatar
  const avWrap = h('div', { class: 'avatar-wrap' });
  const ring = h('div', { class: 'avatar-ring' });
  const inner = h('div', { class: 'avatar-inner' });
  inner.appendChild(h('img', {
    src: p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`,
    style: { width:'100%', height:'100%', objectFit:'cover' }
  }));
  ring.appendChild(inner);
  avWrap.appendChild(ring);
  const cameraInput = h('input', { type:'file', hidden:true, accept:'image/*', onchange: async (e) => {
    const file = e.target.files[0];
    if (!file) return; 
    const reader = new FileReader();
    reader.onload = (ev) => { S.modal = 'crop-avatar'; S.md = { imageSrc: ev.target.result }; render(); };
    reader.readAsDataURL(file);
  }});
  avWrap.appendChild(h('label', { class: 'camera-btn', title: 'Cambiar foto' }, h('i', { class: 'ti ti-camera' }), cameraInput));
  top.appendChild(avWrap);

  // Campos
  const right = h('div', { class: 'profile-right' });
  right.appendChild(h('div', { class: 'field-label' }, 'Nombre de usuario'));
  const nameInput = h('input', { class: 'field-input', type: 'text', value: p.name });
  right.appendChild(nameInput);
  nameInput.oninput = (e) => { p.name = e.target.value; markProfileDirty(); };
  right.appendChild(h('button', { class: 'save-btn', onclick: saveProfileChanges }, h('i', { class: 'ti ti-device-floppy' }), ' Guardar cambios'));
  top.appendChild(right);
  card.appendChild(top);

  // Selector de color
  const colors = [
    { cls: 'c1', val: '#5b7fe8', label: 'Azul eléctrico' },
    { cls: 'c2', val: '#9b59f5', label: 'Púrpura' },
    { cls: 'c3', val: '#60a5fa', label: 'Azul claro' },
    { cls: 'c4', val: '#22d3ee', label: 'Cian' },
    { cls: 'c5', val: '#34d399', label: 'Verde' },
    { cls: 'c6', val: '#fbbf24', label: 'Ámbar' },
    { cls: 'c7', val: '#f87171', label: 'Coral' }
  ];
  const colorsSection = h('div', { class: 'colors-section' });
  colorsSection.appendChild(h('div', { class: 'colors-label' }, 'Selecciona tu color favorito'));
  const colorsRow = h('div', { class: 'colors-row' });
  colors.forEach(c => {
    const active = (p.color || '').toLowerCase() === c.val.toLowerCase();
    const dot = h('button', { class: 'color-dot ' + c.cls + (active ? ' active' : ''), 'aria-label': c.label, onclick: (e) => {
      colorsRow.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      e.currentTarget.classList.add('active');
      p.color = c.val; markProfileDirty();
    }}, h('i', { class: 'ti ti-check' }));
    colorsRow.appendChild(dot);
  });
  colorsSection.appendChild(colorsRow);
  card.appendChild(colorsSection);
  content.appendChild(card);

  // Acciones
  const actionRow = h('div', { class: 'action-row' });
  actionRow.appendChild(h('button', { class: 'logout-btn', onclick: handleLogout }, h('i', { class: 'ti ti-logout' }), ' Cerrar sesión'));
  actionRow.appendChild(h('button', { class: 'delete-btn', onclick: handleDeleteAccount }, h('i', { class: 'ti ti-trash' }), ' Eliminar cuenta'));
  content.appendChild(actionRow);

  // Divisor
  content.appendChild(h('div', { class: 'divider-row' },
    h('div', { class: 'div-line' }), h('div', { class: 'div-diamond' }), h('div', { class: 'div-line' })
  ));

  // Amigos
  content.appendChild(h('h2', { class: 'friends-title' }, 'Amigos', h('span', { class: 'heart-icon' })));
  content.appendChild(h('p', { class: 'friends-subtitle' }, 'Aquí puedes ver a tus amigos y compartir tierlists juntos.'));

  const friends = (S.allUsers || []).filter(u => u.relStatus === 'accepted');
  if (friends.length === 0) {
    content.appendChild(h('div', { style: { textAlign:'center', color:'#5a78a8', fontSize:'13px', padding:'10px 0 20px' } }, 'Aún no tienes amigos añadidos. ¡Busca gente en Usuarios!'));
  } else {
    const grid = h('div', { class: 'friends-grid' });
    friends.forEach(f => {
      const fc = h('div', { class: 'user-card', onclick: () => viewUser(f.id) });
      const avWrap = h('div', { class: 'user-avatar-wrap' });
      avWrap.appendChild(h('div', { class: 'user-avatar-ring' }));
      avWrap.appendChild(h('div', { class: 'user-avatar-border' }));
      const av = h('img', { class: 'user-avatar', src: f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.name}` });
      avWrap.appendChild(av);
      fc.appendChild(avWrap);
      
      fc.appendChild(h('span', { class: 'user-name' }, f.name));
      fc.appendChild(h('div', { class: 'user-stats' }, `${f.tl_count || 0} tierlists · ${f.friend_count || 0} amigos`));

      const btns = h('div', { class: 'friend-btns' });
      btns.appendChild(h('button', { class: 'fb-add', title: 'Ver perfil', onclick: (e) => { e.stopPropagation(); viewUser(f.id); } }, h('i', { class: 'ti ti-eye' })));
      btns.appendChild(h('button', { class: 'fb-remove', title: 'Eliminar amigo', onclick: (e) => { e.stopPropagation(); removeFriend(f.relId); } }, h('i', { class: 'ti ti-minus' })));
      fc.appendChild(btns);
      grid.appendChild(fc);
    });
    content.appendChild(grid);
  }

  w.appendChild(content);
  return w;
}

