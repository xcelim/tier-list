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
  // Chispitas ascendentes decorativas (puramente visuales)
  for(let i=0;i<6;i++){
    hdr.appendChild(h('div',{class:'hh-spark',style:{
      left:(10+Math.random()*80)+'%',
      animationDelay:(Math.random()*4)+'s',
      animationDuration:(3+Math.random()*2)+'s'
    }}));
  }
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
    // Borde cromático: truco de "doble clip-path". .mb-aura ocupa TODO el
    // panel con el mismo recorte diagonal que .menu-box y se rellena con
    // un degradado cónico girando; encima, .mb-bg tiene el MISMO recorte
    // pero un poco más pequeño (inset), y ahí es donde ahora viven el
    // icono de fondo y el degradado de color propio de cada panel (antes
    // en ::before/::after de .menu-box). Como .mb-bg es más pequeño, deja
    // ver un anillo fino de .mb-aura alrededor — un borde de verdad que
    // sigue la forma diagonal del panel, no un rectángulo que se recorta
    // a la mitad por las esquinas en ángulo.
    const aura = h('div', { class: 'mb-aura' });
    const bg = h('div', { class: 'mb-bg' });
    // FIX (Ronda 25 — modo sin conexión): "Usuarios" y "Perfil" necesitan
    // red de verdad (buscar/ver a otra gente, guardar cambios de perfil) —
    // sin conexión, entrar ahí solo llevaría a una pantalla rota o a un
    // guardado que fallara en silencio. "Tierlists" sigue disponible
    // siempre: ahí es donde se puede ver "Mis Tierlists" ya guardadas, en
    // modo Visor, sin conexión (ver TierlistsPage/openOfflineViewer).
    const blocked = S.offline && item.id !== 'tierlists';
    menu.appendChild(h('div', {
      class: `menu-box ${item.cls}` + (blocked ? ' mb-disabled' : ''),
      title: blocked ? 'No disponible sin conexión' : '',
      onclick: () => {
        if(blocked){ toast('No disponible sin conexión', 'info'); return; }
        S.page = item.id; render();
      }
    }, aura, bg, content));
  });

  w.appendChild(menu);
  if(S.offline){
    w.appendChild(h('div', {class:'offline-banner'}, '📴 Sin conexión — puedes ver tus tierlists guardadas en modo solo lectura. Usuarios, Perfil y chat no están disponibles ahora mismo.'));
  }
  w.appendChild(h('div', {class:'hh-footer'}, 'Hecho con pasión para verdaderos amantes del anime'));
  return w;
}

// ============ TARJETAS DE TIERLIST COMPARTIDAS ============
// Se usa exactamente esta misma tarjeta "ancha" (portada + info) tanto en
// "Mis Tierlists" como en el perfil propio y el de un amigo, para que sean
// idénticas en todas partes (mismo tamaño, misma foto de portada).
function buildTlWideCard(tl, opts) {
  opts = opts || {};
  const card = h('div', { class: 'tlc tlc-rich tlc-wide', onclick: opts.onclick });

  let coverId = null;
  for (const t of (tl.tiers || [])) { if (t.chars && t.chars.length) { coverId = t.chars[0]; break; } }
  if (!coverId && (tl.pool || []).length) coverId = tl.pool[0];
  const cover = h('div', { class: 'tlc-cover' });
  if (tl.cover_url) {
    cover.style.backgroundImage = `url('${tl.cover_url}')`;
  } else if (coverId) {
    try { cover.style.backgroundImage = `url('${charImg(coverId, tl)}')`; } catch (e) {}
  } else {
    cover.classList.add('tlc-cover-empty');
    cover.appendChild(h('i', { class: 'ti ti-stack-2' }));
  }
  card.appendChild(cover);

  // Botones flotantes arriba a la derecha, sobre la foto (portada / admin /
  // modo observador de tu propia tierlist)
  const topActions = h('div', { class: 'tlc-top-actions' });
  if (opts.editable) {
    topActions.appendChild(h('button', {
      class: 'tlc-cover-btn', title: 'Ver en modo observador',
      onclick: (e) => { e.stopPropagation(); openOwnViewer(tl); }
    }, h('i', { class: 'ti ti-eye' })));
    topActions.appendChild(h('button', {
      class: 'tlc-cover-btn', title: 'Cambiar portada',
      onclick: (e) => { e.stopPropagation(); pickTierlistCover(tl.id); }
    }, h('i', { class: 'ti ti-camera' })));
  }
  if (opts.editable && opts.profile && opts.profile.is_admin) {
    topActions.appendChild(h('button', { class: 'btn bg bsm', onclick: (e) => { e.stopPropagation(); dupTL(tl.id); }, title: 'Duplicar' }, '⧇'));
    topActions.appendChild(h('button', { class: 'btn bd bsm', onclick: (e) => { e.stopPropagation(); delTL(tl.id); }, title: 'Eliminar' }, '✕'));
  }
  if (topActions.children.length) card.appendChild(topActions);

  const body = h('div', { class: 'tlc-body' });
  const titleRow = h('div', { style:{display:'flex',alignItems:'center',gap:'6px',minWidth:0} });
  titleRow.appendChild(h('h3', {}, tl.title || 'Sin título'));
  if (tl._isCollaborative) {
    titleRow.appendChild(h('span', { class:'tlc-collab-badge', title:'Tierlist colaborativa: todos los que estén en ella pueden editarla' }, '👥'));
  }
  body.appendChild(titleRow);
  // Si tenemos el conteo REAL de tu propio ranking (o del conjunto, si es
  // colaborativa) lo usamos; si no, caemos al de la plantilla genérica.
  const tierCount = tl._myTierCount != null ? tl._myTierCount : (tl.tiers || []).length;
  const tot = tl._myCharCount != null ? tl._myCharCount : (tl.tiers || []).reduce((a, t) => a + (t.chars || []).length, 0) + (tl.pool || []).length;
  body.appendChild(h('div', { class: 'meta' },
    h('span', {}, h('i', { class: 'ti ti-layout-rows' }), ' ' + tierCount + ' tiers'),
    h('span', {}, h('i', { class: 'ti ti-users' }), ' ' + tot + ' chars')
  ));
  if (tl.updatedAt) {
    body.appendChild(h('div', { class: 'tlc-updated' }, 'Actualizada ' + timeAgo(new Date(tl.updatedAt).toISOString())));
  }
  card.appendChild(body);
  return card;
}

// Círculo de avatar grande (100px) con su marco equipado, reutilizado en la
// cabecera del perfil propio y del de un amigo, para que ambas pantallas
// se vean exactamente igual.
function avatarRingBig(person, sizePx) {
  sizePx = sizePx || 100;
  // FIX: el anillo (.avatar-ring) tiene un tamaño fijo por CSS (92x92 +
  // padding de 3px) para que el marco (borde/box-shadow) encaje justo a su
  // alrededor. Antes se metía una imagen de 100x100 DENTRO de un anillo de
  // 92x92 sin tocar su tamaño, así que la foto se salía del círculo y
  // rompía el ajuste del marco ("no se ajusta bien"). Ahora se fuerza el
  // tamaño del propio anillo por estilo en línea, y la imagen va en un
  // div interior que ocupa el 100% de ESE anillo (igual que en el modo
  // edición del perfil), así que ambos crecen o encogen juntos.
  const ring = h('div', {
    class: 'avatar-ring' + (typeof frameClassFor === 'function' ? ' ' + frameClassFor(person) : ''),
    style: { width: sizePx + 'px', height: sizePx + 'px' }
  });
  const inner = h('div', { class: 'avatar-inner' });
  inner.appendChild(h('img', {
    src: (person && person.avatar_url) || `https://api.dicebear.com/7.x/initials/svg?seed=${(person && person.name) || '?'}`,
    style: { width: '100%', height: '100%', objectFit: 'cover' }
  }));
  ring.appendChild(inner);
  return ring;
}

// Barra de paginación numerada. Devuelve null si no hace falta (todo cabe
// en una sola página) para que, tal y como se pidió, los números de
// página no aparezcan si no hay suficiente contenido para más de una.
function buildPagination(totalItems, pageSize, curPage, onChange) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;
  const bar = h('div', { class: 'tl-pagination' });
  bar.appendChild(h('button', {
    class: 'tl-page-btn tl-page-arrow', disabled: curPage === 0,
    onclick: () => onChange(Math.max(0, curPage - 1))
  }, h('i', { class: 'ti ti-chevron-left' })));
  for (let i = 0; i < totalPages; i++) {
    bar.appendChild(h('button', {
      class: 'tl-page-btn' + (i === curPage ? ' active' : ''),
      onclick: () => onChange(i)
    }, (i + 1) + ''));
  }
  bar.appendChild(h('button', {
    class: 'tl-page-btn tl-page-arrow', disabled: curPage >= totalPages - 1,
    onclick: () => onChange(Math.min(totalPages - 1, curPage + 1))
  }, h('i', { class: 'ti ti-chevron-right' })));
  return bar;
}

const TL_PAGE_SIZE = 8;

function TierlistsPage() {
  const w=h('div',{class:'tl-page'});
  // Sincronización automática al entrar a la pantalla principal — FIX
  // (Ronda 25): sin conexión esto solo sería una petición de red condenada
  // a fallar (ver fetchGlobalTemplates), así que se salta directamente; la
  // lista de abajo se sigue mostrando igual, con los datos ya guardados en
  // este dispositivo de la última vez que sí hubo conexión.
  if (!S._ref && !S.offline) { S._ref = true; fetchGlobalTemplates().finally(() => setTimeout(() => S._ref = false, 5000)); }

  const p = activeProfile();
  if(!p) return w;

  // --- Cabecera, a juego con la de Usuarios ---
  const hdr = h('div', { class: 'users-page-header' });
  hdr.appendChild(h('h1', { class: 'users-page-title' }, 'Mis Tierlists'));
  const diam = h('div', { class: 'users-page-diamond' });
  diam.innerHTML = '<span class="up-diamond"></span>';
  hdr.appendChild(diam);
  const allTls = p.tls || [];
  const totalCharsAll = allTls.reduce((s,tl)=>s+(tl.tiers||[]).reduce((a,t)=>a+(t.chars||[]).length,0)+(tl.pool||[]).length,0);
  hdr.appendChild(h('p', { class: 'users-page-sub' }, `${allTls.length} tierlist${allTls.length===1?'':'s'} · ${totalCharsAll} personajes en total`));
  w.appendChild(hdr);

  // --- Barra de búsqueda (centrada) + filtros DEBAJO (también centrados) ---
  if(!S._tlSearch) S._tlSearch = '';
  if(!S._tlSort) S._tlSort = 'recent';
  const toolbar = h('div', { class: 'tl-toolbar' });
  const swrap = h('div', { class: 'tl-search-wrap' });
  swrap.appendChild(h('i', { class: 'ti ti-search' }));
  swrap.appendChild(h('input', {
    class: 'tl-search-input', placeholder: 'Buscar una tierlist...', value: S._tlSearch,
    'data-focus-key': 'tl-search',
    oninput: (e) => { S._tlSearch = e.target.value; S._tlPage = 0; render(); }
  }));
  toolbar.appendChild(swrap);
  const sortWrap = h('div', { class: 'tl-sort-wrap' });
  [['recent','Recientes'],['name','Nombre'],['chars','Nº de personajes']].forEach(([id,label])=>{
    sortWrap.appendChild(h('button', {
      class: 'tl-sort-btn' + (S._tlSort===id ? ' active':''),
      onclick: () => { S._tlSort = id; render(); }
    }, label));
  });
  toolbar.appendChild(sortWrap);
  w.appendChild(toolbar);

  // --- Rejilla --- (tlg-wide: solo aquí se usan las tarjetas anchas
  // nuevas; el perfil de otro usuario sigue usando .tlg normal con las
  // tarjetas pequeñas de antes, para no romper esa pantalla)
  const g=h('div',{class:'tlg tlg-wide'});

  let list = [...allTls];
  if(S._tlSearch.trim()) list = list.filter(tl => (tl.title||'').toLowerCase().includes(S._tlSearch.trim().toLowerCase()));
  const charCountOf = tl => (tl.tiers||[]).reduce((a,t)=>a+(t.chars||[]).length,0)+(tl.pool||[]).length;
  if(S._tlSort==='name') list.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
  else if(S._tlSort==='chars') list.sort((a,b)=>charCountOf(b)-charCountOf(a));
  else list.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));

  if(list.length===0 && allTls.length>0){
    g.appendChild(h('div',{class:'nc'+(S.offline?' mb-disabled':''),onclick:()=>{ if(S.offline){ toast('No disponible sin conexión','info'); return; } S.modal='new-tl';S.md={};render();}},h('div',{class:'plus'},'+'),h('span',{style:{fontSize:'13px'}},'Nueva Tierlist')));
    g.appendChild(h('div', { class:'tl-empty-search' }, `Ninguna tierlist coincide con "${S._tlSearch}".`));
  } else {
    // Paginación: página 1 completa, página 2, etc. — sin scroll infinito.
    // La tarjeta de "Nueva Tierlist" solo se muestra en la primera página.
    if(!S._tlPage) S._tlPage = 0;
    const totalPages = Math.max(1, Math.ceil(list.length / TL_PAGE_SIZE));
    if(S._tlPage >= totalPages) S._tlPage = totalPages - 1;
    const start = S._tlPage * TL_PAGE_SIZE;
    const pageItems = list.slice(start, start + TL_PAGE_SIZE);

    if(S._tlPage === 0){
      g.appendChild(h('div',{class:'nc'+(S.offline?' mb-disabled':''),onclick:()=>{ if(S.offline){ toast('No disponible sin conexión','info'); return; } S.modal='new-tl';S.md={};render();}},h('div',{class:'plus'},'+'),h('span',{style:{fontSize:'13px'}},'Nueva Tierlist')));
    }
    pageItems.forEach(tl=>{
      // FIX (Ronda 25 — modo sin conexión): sin red no se puede editar
      // (guardar fallaría), pero sí se puede seguir VIENDO lo ya rankeado —
      // se abre en modo Visor de solo lectura en vez del editor normal.
      g.appendChild(buildTlWideCard(tl, { editable:true, profile:p, onclick:()=>{ if(S.offline){ openOfflineViewer(tl.id); } else { openEditor(tl.id); } render(); } }));
    });
    w.appendChild(g);
    const pager = buildPagination(list.length, TL_PAGE_SIZE, S._tlPage, (np)=>{ S._tlPage = np; render(); });
    if(pager) w.appendChild(pager);
    return w;
  }
  w.appendChild(g); return w;
}

function UsersPage() {
  // FIX (Ronda 25 — modo sin conexión): red de seguridad además del bloqueo
  // en el menú del Home (por si se llega aquí de otra forma, como el botón
  // "atrás" del navegador o una URL directa a /usuarios). Sin esto,
  // fetchAllUsers() de la línea de abajo intentaría una petición de red que
  // sabemos que va a fallar, dejando la pantalla vacía sin explicación.
  if (S.offline) { S.page = 'home'; if(typeof setRoute==='function') setRoute('home'); return Home(); }
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
      // FIX (Ronda 39 — marco cortado): la foto (con border-radius+
      // object-fit) va en un div interior con overflow:hidden aparte
      // (user-avatar-clip), separado del marco (user-avatar-frame, sin
      // overflow) — mismo motivo que en comentarios/chat/nav.
      const uFrame = typeof frameClassFor==='function' ? frameClassFor(u) : '';
      const avFrame = h('div', { class: 'user-avatar-frame' + (uFrame?(' '+uFrame):'') },
        h('div', { class: 'user-avatar-clip' },
          h('img', { class: 'user-avatar', src: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}` }))
      );
      avWrap.appendChild(avFrame);
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

  // El nombre va ARRIBA y la foto debajo (igual en el perfil propio).
  hdr.appendChild(h('h1', { class: 'users-page-title' }, u.name));
  const avWrap = h('div', { class:'avatar-wrap', style:{display:'inline-block', margin:'8px 0'} });
  avWrap.appendChild(avatarRingBig(u, 100));
  hdr.appendChild(avWrap);
  hdr.appendChild(h('p', { class: 'users-page-sub' }, `Perfil de ${u.name}`));

  // Pseudo-perfil de solo lectura para reutilizar los mismos cálculos de
  // nivel/logros que en tu propio Ajustes, pero con los datos de esta otra
  // persona (misma forma de datos: tiers_data tiene la misma estructura
  // que tl.tiers).
  const pseudoProfile = {
    tls: (u.rankings || []).map(r => ({ tiers: r.tiers_data || [] })),
    created_at: u.created_at,
    _friendCount: u.friend_count,
    _hasCommented: undefined // desconocido para otra persona, no se penaliza ni se acierta de más
  };

  if(typeof computeXP==='function' && typeof LevelBadge==='function'){
    const xp = computeXP(pseudoProfile); const lvl = computeLevel(xp);
    const centered = h('div', { style:{display:'flex', justifyContent:'center'} }, LevelBadge(lvl, xp));
    hdr.appendChild(centered);
  }
  w.appendChild(hdr);

  // Estadísticas reales de esta persona — se reutiliza StatsSection, la
  // misma función que usa tu propio Ajustes, para que salgan exactamente
  // los mismos datos (anime más rankeado, tier favorito, miembro desde...)
  // también al ver el perfil de un amigo, no solo el tuyo.
  if(typeof StatsSection==='function'){
    const statsWrap = h('div', { style:{maxWidth:'600px', margin:'0 auto'} });
    statsWrap.appendChild(StatsSection(pseudoProfile));
    // Amigos no lo calcula StatsSection (es un dato social, no de tierlists),
    // así que se añade aparte, igual que antes.
    statsWrap.appendChild(h('div', { class:'stats-highlight', style:{textAlign:'center'} }, `Amigos: `, h('strong', {}, (u.friend_count ?? 0) + '')));
    w.appendChild(statsWrap);
  }

  if(typeof AchievementsSection==='function'){
    const achWrap = h('div', { style:{maxWidth:'900px', margin:'0 auto 30px'} });
    achWrap.appendChild(AchievementsSection(pseudoProfile, true));
    w.appendChild(achWrap);
  }

  w.appendChild(h('div', { class: 'divider-row', style:{maxWidth:'900px', margin:'0 auto 24px'} },
    h('div', { class: 'div-line' }), h('div', { class: 'div-diamond' }), h('div', { class: 'div-line' })
  ));

  const grid = h('div', { class: 'tlg tlg-wide' });
  if(u.rankings.length === 0) {
    grid.appendChild(h('div', {style:{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'var(--text3)'}}, 'Este usuario aún no ha guardado ningún ranking.'));
    w.appendChild(grid);
  } else {
    if(!S._uvPage) S._uvPage = 0;
    const totalPages = Math.max(1, Math.ceil(u.rankings.length / TL_PAGE_SIZE));
    if(S._uvPage >= totalPages) S._uvPage = totalPages - 1;
    const start = S._uvPage * TL_PAGE_SIZE;
    u.rankings.slice(start, start + TL_PAGE_SIZE).forEach(r => {
      const tlMeta = r.tierlists || { title: 'Tierlist desconocida' };
      // Mismo objeto "tl-like" que usan las tarjetas de "Mis Tierlists",
      // para que salgan exactamente iguales (misma portada, mismo tamaño).
      const tlLike = { title: tlMeta.title, cover_url: tlMeta.cover_url, tiers: r.tiers_data || [], pool: [], updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : null, folder: tlMeta.folder, _isCollaborative: !!r.is_collaborative };
      grid.appendChild(buildTlWideCard(tlLike, { editable:false, onclick:()=>openViewer(r) }));
    });
    w.appendChild(grid);
    const pager = buildPagination(u.rankings.length, TL_PAGE_SIZE, S._uvPage, (np)=>{ S._uvPage = np; render(); });
    if(pager) w.appendChild(pager);
  }
  return w;
}

function Viewer() {
  const r = S.viewingRank;
  const tlMeta = r.tierlists || {};
  const w = h('div', {});
  // FIX (Ronda 31): declarado aquí arriba (no dentro del "if" de más abajo)
  // porque tanto el botón "Descargar" como la línea de progreso de debajo
  // de la barra necesitan leerlo.
  const dp = (S._viewerOwnTlId && S._downloadProgress && S._downloadProgress.tlid === S._viewerOwnTlId) ? S._downloadProgress : null;

  const tb = h('div', { class: 'etbar' });
  tb.appendChild(h('div', { class: 'etitle hf' }, `Observando: ${tlMeta.title || 'Ranking'}`));
  // Si estás viendo TU PROPIA tierlist en modo observador (viniste desde el
  // botón del ojo en una tarjeta, o desde el editor), aquí sale el botón
  // para volver a entrar en modo edición.
  if(S._viewerOwnTlId){
    // FIX (Ronda 28 — botón "Descargar" manual): solo tiene sentido en TUS
    // PROPIAS tierlists (normales o colaborativas en las que participas —
    // eso es justo lo que significa S._viewerOwnTlId aquí, ver openOwnViewer/
    // viewCurrentEditorAsViewer en nav.js) y con conexión de verdad (sin
    // red no hay nada que descargar). El nombre/color/orden de cada tier y
    // la posición de cada personaje ya se guardan solos en el dispositivo
    // en cuanto guardas en el editor — lo único que hay que forzar a
    // descargar de verdad son las imágenes (ver downloadTierlistForOffline
    // en save.js), así que el botón se limita a eso y a avisar cuándo
    // termina.
    // FIX (Ronda 31): downloadTierlistForOffline() llama a render() varias
    // veces mientras descarga (para actualizar el progreso), lo que
    // reconstruye este botón de cero cada vez — por eso ya NO se manipula
    // el botón a mano (guardar una referencia y cambiarle el texto no
    // sirve si el propio botón se sustituye por uno nuevo en cada render).
    // En su lugar, su texto y su estado "deshabilitado" salen directamente
    // de S._downloadProgress, que es lo mismo que lee la línea de progreso
    // de más abajo.
    if(!S.offline){
      tb.appendChild(h('button', {
        class:'btn bsm', style:{marginLeft:'auto'}, disabled: !!dp,
        onclick: ()=>{ downloadTierlistForOffline(S._viewerOwnTlId); }
      }, h('i',{class: dp ? 'ti ti-loader-2' : 'ti ti-download'}), dp ? ` Descargando... (${dp.done}/${dp.total})` : ' Descargar'));
    }
    tb.appendChild(h('button', {
      class:'btn bp bsm', style:{marginLeft: S.offline ? 'auto' : '8px'}, disabled: !!dp,
      onclick:()=>{ const id=S._viewerOwnTlId; S._viewerOwnTlId=null; openEditor(id); }
    }, h('i',{class:'ti ti-pencil'}), ' Editar'));
  } else {
    tb.appendChild(h('div', { style:{marginLeft:'auto', color:'var(--text3)', fontSize:'12px'} }, `Ranking de ${S.viewingUser?.name}`));
  }
  w.appendChild(tb);
  if(dp){
    // Pedido explícito: mostrar "Descargando..." debajo de la barra de
    // arriba, con el progreso, mientras dura.
    w.appendChild(h('div', { class:'offline-banner', style:{marginBottom:'12px'} },
      `⬇ Descargando imágenes... (${dp.done}/${dp.total})`));
  }

  // FIX (Ronda 41 — pedido explícito: pestañas para varios rankings dentro
  // de la misma tierlist, ej. "Animes de temporada" + sus OPs + sus EDs):
  // si esta tierlist tiene más de una pestaña, aquí se elige cuál se está
  // viendo (r.activeTabId, transitorio — solo cambia lo que se MUESTRA en
  // el modo Visor, de solo lectura). r.tabs siempre trae al menos una
  // entrada (openViewer/openOwnViewer/openOfflineViewer la rellenan con la
  // única pestaña "Principal" si esta tierlist todavía no usa pestañas).
  const tabs = r.tabs || [];
  if(tabs.length > 1){
    const tabBar = h('div', { class: 'tab-bar', style:{marginBottom:'14px'} });
    tabs.forEach(t=>{
      tabBar.appendChild(h('div', {
        class: 'tab-pill' + (t.id===r.activeTabId ? ' active' : ''),
        onclick: ()=>{ if(t.id!==r.activeTabId){ r.activeTabId=t.id; render(); } }
      }, t.name));
    });
    w.appendChild(tabBar);
  }
  const activeTab = tabs.find(t=>t.id===r.activeTabId);

  const tw = h('div', { class: 'twrap' });
  const tiers = (activeTab ? activeTab.tiers : r.tiers_data) || [];

  tiers.forEach(tier => {
    const row = h('div', { class: 'trow' });
    const lbl = h('div', { class: 'tlbl', style: { background: tier.color || '#888' } });
    lbl.appendChild(h('div', { class: 'tlbl-txt' }, tier.label || '?'));
    row.appendChild(lbl);

    const ce = h('div', { class: 'tchars' });
    (tier.chars || []).forEach(cid => {
      // FIX (Ronda 25 — personajes añadidos a mano no salían en el modo
      // Visor sin conexión): antes solo se pasaba "{folder: tlMeta.folder}"
      // a getChar()/charImg(), descartando el resto de tlMeta — incluido
      // "customChars" (los personajes con imagen propia, añadidos a mano
      // con "Añadir uno"/"Añadir varias", que SOLO existen dentro de esa
      // tierlist en concreto, no en el catálogo AC ni se pueden pedir por
      // red sin conexión). Pasando tlMeta entero, getChar() los encuentra
      // igual que ya hace en el editor.
      const c = getChar(cid, tlMeta);
      if(!c) return;
      // FIX (Ronda 25 — "no deja scrollear si pulsas encima de un
      // personaje" en modo Visor): esta tarjeta comparte la clase ".tc" con
      // la del editor SOLO por estética (mismo tamaño/aspecto), pero aquí
      // NUNCA se le añade un "pointerdown" que arrastre nada (el modo Visor
      // es de solo lectura). El CSS de ".tc" fija "touch-action:none" para
      // que el editor pueda replicar el scroll a mano mientras decide si
      // hay pulsación larga (ver drag.js) — pero como aquí no hay NINGÚN
      // JS escuchando ese gesto, "touch-action:none" solo servía para que
      // el navegador bloquease su propio scroll nativo sin que nadie lo
      // sustituyera, dejando la pantalla congelada al tocar una carta. La
      // clase extra ".tc-view" (ver su CSS) devuelve el scroll nativo
      // normal solo en este modo de solo lectura.
      const el = h('div', { class: 'tc tc-view', style: { position: 'relative' } });
      const imgSrc = charImg(cid, tlMeta);
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

  // Reacciones + Comentarios — SOLO en este modo (Visor), tal y como se pidió.
  // OJO: se usan por r.id (el ranking personal, único), NO por
  // r.tierlist_id (la plantilla compartida) — ver nota en reactions.js/comments.js.
  // FIX (Ronda 25 — modo sin conexión): ambas cosas necesitan red de
  // verdad; sin conexión, en vez de disparar peticiones condenadas a
  // fallar (o quedarse "Cargando..." colgadas para siempre), se muestra un
  // aviso claro y ya está.
  if(S.offline){
    w.appendChild(h('div', {class:'offline-banner'}, '📴 Reacciones y comentarios no disponibles sin conexión.'));
  } else {
    const ownerId = r.user_id || (S.viewingUser && S.viewingUser.id);
    if(typeof ReactionsBar==='function' && r.id){
      w.appendChild(ReactionsBar(r.id, ownerId));
    }
    if(typeof CommentsSection==='function' && r.id){
      w.appendChild(CommentsSection(r.id, ownerId));
    }
  }

  return w;
}

function ProfilePage() {
  if (!userSession) return Home();
  // FIX (Ronda 25 — modo sin conexión, pedido explícito): "Perfil" permite
  // cambiar nombre/color/marco y guardar, todo lo cual necesita red de
  // verdad — intentarlo sin conexión fallaría en silencio o a medias. Red
  // de seguridad además del bloqueo en el menú del Home, por si se llega
  // aquí de otra forma (botón "atrás", URL directa a /ajustes...).
  if (S.offline) { S.page = 'home'; if(typeof setRoute==='function') setRoute('home'); return Home(); }
  if(typeof refreshAchievementData==='function' && !S._achRef){ S._achRef=true; refreshAchievementData().finally(()=>setTimeout(()=>S._achRef=false,4000)); }
  // Igual que en "Mis Tierlists": refresca las plantillas (y tu progreso en
  // cada una) al entrar al perfil, para que una tierlist colaborativa que
  // te acaban de compartir aparezca aquí sin tener que pasar antes por
  // "Mis Tierlists". Comparte el mismo cooldown de 5s (S._ref) para no
  // duplicar peticiones si ya se acaba de refrescar.
  if (!S._ref) { S._ref = true; fetchGlobalTemplates().finally(() => setTimeout(() => S._ref = false, 5000)); }

  // Inicializar borrador si no existe
  if (!S.profileDraft) {
    S.profileDraft = JSON.parse(JSON.stringify(currentUserProfile));
    S.profileUnsaved = false;
  }

  const p = S.profileDraft;
  if (S.allUsers.length === 0) fetchAllUsers();

  const markProfileDirty = () => {
    // Comparar con el original para ver si realmente ha cambiado.
    // FIX (Ronda 18): se añade avatar_frame a la comparación — si no, elegir
    // un marco y LUEGO tocar el nombre/color (sin cambiarlo de verdad)
    // podía dejar S.profileUnsaved en false y esconder la barra de "cambios
    // sin guardar" aunque el marco elegido siguiera pendiente de guardar.
    const isChanged = p.name !== currentUserProfile.name ||
                     p.color !== currentUserProfile.color ||
                     p.avatar_frame !== currentUserProfile.avatar_frame ||
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
    cb.appendChild(h('span',{},'⚠️ Tienes cambios en tu perfil sin guardar'));
    cb.appendChild(h('button',{class:'btn btn-save',onclick:saveProfileChanges},'✓ Guardar cambios'));
    cb.appendChild(h('button',{class:'btn bd bsm',onclick:()=>{S.profileDraft=null; S.profileUnsaved=false; render();}},'Descartar'));
    content.appendChild(cb);
  }

  // Botón de modo: por defecto el perfil se ve tal cual lo vería un amigo
  // (solo lectura); al pulsar "Editar perfil" aparece además todo lo de
  // personalización (foto, nombre, colores, paleta, marcos, cuenta).
  const modeRow = h('div', { style:{display:'flex',justifyContent:'center',margin:'0 0 10px'} });
  modeRow.appendChild(h('button', {
    class: 'btn ' + (S._profileEditMode ? 'bd' : 'bp'),
    onclick: () => { S._profileEditMode = !S._profileEditMode; render(); }
  }, S._profileEditMode ? h('i',{class:'ti ti-eye'}) : h('i',{class:'ti ti-pencil'}),
     S._profileEditMode ? ' Salir de edición' : ' Editar perfil'));
  content.appendChild(modeRow);

  // Cabecera: el nombre va ARRIBA y la foto debajo, igual que al ver el
  // perfil de un amigo.
  content.appendChild(h('h1', { class: 'page-title', style:{textAlign:'center'} }, p.name, h('span', { class: 'heart-icon' })));

  const avWrap = h('div', { class: 'avatar-wrap', style:{display:'flex',flexDirection:'column',alignItems:'center',margin:'0 auto 14px'} });
  if(S._profileEditMode){
    // En modo edición, el mismo círculo permite cambiar la foto.
    const ring = h('div', { class: 'avatar-ring' + (typeof frameClassFor==='function' ? ' '+frameClassFor(p) : '') });
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
    avWrap.appendChild(h('label', { class: 'camera-btn-inline', style:{marginTop:'6px'} }, h('i', { class: 'ti ti-camera' }), ' Cambiar foto', cameraInput));
  } else {
    avWrap.appendChild(avatarRingBig(p, 100));
  }
  content.appendChild(avWrap);

  if(typeof computeXP==='function' && typeof LevelBadge==='function'){
    const xp = computeXP(typeof ownRealProfile==='function' ? ownRealProfile() : p); const lvl = computeLevel(xp);
    content.appendChild(h('div', { style:{display:'flex',justifyContent:'center',marginBottom:'14px'} }, LevelBadge(lvl, xp)));
  }

  // Todo lo de personalización: SOLO en modo edición.
  if(S._profileEditMode){
    const card = h('div', { class: 'profile-card' });

    const right = h('div', { class: 'profile-right', style:{width:'100%'} });
    right.appendChild(h('div', { class: 'field-label' }, 'Nombre de usuario'));
    const nameInput = h('input', { class: 'field-input', type: 'text', value: p.name });
    right.appendChild(nameInput);
    nameInput.oninput = (e) => { p.name = e.target.value; markProfileDirty(); };
    right.appendChild(h('button', { class: 'save-btn', onclick: saveProfileChanges }, h('i', { class: 'ti ti-device-floppy' }), ' Guardar cambios'));
    card.appendChild(right);

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

    // Paleta de la app (personalización general) — cambia el look completo
    if(typeof ACCENT_PRESETS==='object'){
      const accentSection = h('div', { class: 'colors-section' });
      accentSection.appendChild(h('div', { class: 'colors-label' }, '🎨 Paleta de la interfaz'));
      const accentRow = h('div', { class: 'accent-row' });
      Object.entries(ACCENT_PRESETS).forEach(([id, preset]) => {
        const active = currentAccent() === id;
        accentRow.appendChild(h('button', {
          class: 'accent-swatch' + (active ? ' active' : ''),
          style: { background: `linear-gradient(135deg, ${preset.magenta}, ${preset.gold})` },
          title: preset.name,
          onclick: () => setAccent(id)
        }));
      });
      accentSection.appendChild(accentRow);
      card.appendChild(accentSection);
    }

    content.appendChild(card);

    // Marcos de avatar (desbloqueables por nivel)
    if(typeof AvatarFramePicker==='function' && typeof computeXP==='function'){
      const xp2 = computeXP(typeof ownRealProfile==='function' ? ownRealProfile() : p); const lvl2 = computeLevel(xp2);
      content.appendChild(AvatarFramePicker(p, lvl2));
    }

    // Acciones de cuenta
    const actionRow = h('div', { class: 'action-row' });
    actionRow.appendChild(h('button', { class: 'logout-btn', onclick: handleLogout }, h('i', { class: 'ti ti-logout' }), ' Cerrar sesión'));
    actionRow.appendChild(h('button', { class: 'delete-btn', onclick: handleDeleteAccount }, h('i', { class: 'ti ti-trash' }), ' Eliminar cuenta'));
    content.appendChild(actionRow);

    content.appendChild(h('div', { class: 'divider-row' },
      h('div', { class: 'div-line' }), h('div', { class: 'div-diamond' }), h('div', { class: 'div-line' })
    ));
  }

  // A partir de aquí, contenido de solo lectura (idéntico a ver el perfil
  // de un amigo): estadísticas, logros y tus tierlists — SIEMPRE visible,
  // también en modo edición, tal y como se pidió.
  if(typeof StatsSection==='function'){
    const statsWrap = h('div', { style:{maxWidth:'600px', margin:'0 auto'} });
    statsWrap.appendChild(StatsSection(typeof ownRealProfile==='function' ? ownRealProfile() : p));
    content.appendChild(statsWrap);
    content.appendChild(h('div', { class: 'divider-row' },
      h('div', { class: 'div-line' }), h('div', { class: 'div-diamond' }), h('div', { class: 'div-line' })
    ));
  }

  if(typeof AchievementsSection==='function'){
    const achWrap = h('div', { style:{maxWidth:'900px', margin:'0 auto 10px'} });
    achWrap.appendChild(AchievementsSection(typeof ownRealProfile==='function' ? ownRealProfile() : p));
    content.appendChild(achWrap);
    content.appendChild(h('div', { class: 'divider-row' },
      h('div', { class: 'div-line' }), h('div', { class: 'div-diamond' }), h('div', { class: 'div-line' })
    ));
  }

  // Mis tierlists — mismas tarjetas anchas (con portada) que en "Mis
  // Tierlists", con paginación si hace falta.
  content.appendChild(h('h2', { class: 'friends-title', style:{textAlign:'center'} }, 'Mis Tierlists', h('span', { class: 'heart-icon' })));
  // FIX: "p" es S.profileDraft, una copia de currentUserProfile — la fila
  // de la tabla "profiles" de Supabase (id, name, avatar_url, color...).
  // Las tierlists NO viven ahí, viven en el perfil LOCAL (S.profiles, el
  // mismo que usa activeProfile()), así que "p.tls" siempre era undefined
  // aquí y por eso el perfil decía "no tienes tierlists" aunque sí las
  // hubiera (se veían bien en la pantalla "Mis Tierlists", que sí usa
  // activeProfile()).
  const realP = (typeof activeProfile === 'function' ? activeProfile() : null) || p;
  const allTls = realP.tls || [];
  const tlGrid = h('div', { class: 'tlg tlg-wide' });
  if(allTls.length === 0){
    tlGrid.appendChild(h('div', { style:{gridColumn:'1/-1', textAlign:'center', padding:'30px', color:'var(--text3)'} }, 'Todavía no has creado ninguna tierlist.'));
    content.appendChild(tlGrid);
  } else {
    if(!S._profTlPage) S._profTlPage = 0;
    const totalPages = Math.max(1, Math.ceil(allTls.length / TL_PAGE_SIZE));
    if(S._profTlPage >= totalPages) S._profTlPage = totalPages - 1;
    const start = S._profTlPage * TL_PAGE_SIZE;
    allTls.slice(start, start + TL_PAGE_SIZE).forEach(tl => {
      tlGrid.appendChild(buildTlWideCard(tl, { editable:true, profile:realP, onclick:()=>{openEditor(tl.id);render();} }));
    });
    content.appendChild(tlGrid);
    const pager = buildPagination(allTls.length, TL_PAGE_SIZE, S._profTlPage, (np)=>{ S._profTlPage = np; render(); });
    if(pager) content.appendChild(pager);
  }

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
      const avWrap2 = h('div', { class: 'user-avatar-wrap' });
      avWrap2.appendChild(h('div', { class: 'user-avatar-ring' }));
      avWrap2.appendChild(h('div', { class: 'user-avatar-border' }));
      // FIX (Ronda 39 — marco cortado): ver el mismo comentario más arriba,
      // en el grid de "Usuarios".
      const fFrame = typeof frameClassFor==='function' ? frameClassFor(f) : '';
      const avFrame2 = h('div', { class: 'user-avatar-frame' + (fFrame?(' '+fFrame):'') },
        h('div', { class: 'user-avatar-clip' },
          h('img', { class: 'user-avatar', src: f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.name}` }))
      );
      avWrap2.appendChild(avFrame2);
      fc.appendChild(avWrap2);
      
      fc.appendChild(h('span', { class: 'user-name' }, f.name));
      fc.appendChild(h('div', { class: 'user-stats' }, `${f.tl_count || 0} tierlists · ${f.friend_count || 0} amigos`));

      const btns = h('div', { class: 'friend-btns' });
      btns.appendChild(h('button', { class: 'fb-add', title: 'Ver perfil', onclick: (e) => { e.stopPropagation(); viewUser(f.id); } }, h('i', { class: 'ti ti-eye' })));
      if(S._profileEditMode) btns.appendChild(h('button', { class: 'fb-remove', title: 'Eliminar amigo', onclick: (e) => { e.stopPropagation(); removeFriend(f.relId); } }, h('i', { class: 'ti ti-minus' })));
      fc.appendChild(btns);
      grid.appendChild(fc);
    });
    content.appendChild(grid);
  }

  w.appendChild(content);
  return w;
}

