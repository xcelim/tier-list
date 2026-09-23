/**
 * Componentes de Interfaz de Usuario (UI)
 */

function toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.getElementById('tw').appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function h(tag, a, ...ch) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) {
        if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else el.setAttribute(k, v);
    }
    for (const c of ch.flat()) {
        if (c == null || c === false) continue;
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
}

function setRoute(r, param) {
    let p = '?p=' + r;
    if (param) p += '&id=' + param;
    window.history.pushState({ page: r, id: param }, '', p);
}

function getChar(id, tl) {
    const t = tl || S.workingTL;
    if (t && t.customChars) { const cc = t.customChars.find(c => c.id === id); if (cc) return cc; }
    return AC[id] || null;
}

function charImg(id, tl) {
    const c = getChar(id, tl); if (!c) return '';
    if (c.imageData) return c.imageData;
    if (c.file) {
        if (c.file.startsWith('data:') || c.file.startsWith('http')) return c.file;
        const folder = (tl && tl.folder && tl.id !== 'waifus_v1') ? tl.folder : 'waifus';
        return BUCKET_BASE + folder + '/' + c.file;
    }
    return '';
}

function openEditor(tlid) {
    const tl = getTLfromProfile(tlid);
    if (!tl) return;
    S.cid = tlid;
    S.workingTL = JSON.parse(JSON.stringify(tl));
    S.hasUnsaved = false;
    S.page = 'editor'; S.q = ''; S.poolPage = 0;
    setRoute('editor', tlid);
    syncFromSupabase();
    render();
}

function markUnsaved() {
    S.hasUnsaved = true;
    render();
}

function discardChanges() {
    S.workingTL = null; S.hasUnsaved = false; S.cid = null; S.page = 'home'; setRoute('home'); render();
}

async function saveEditorChanges() {
    if (!S.workingTL || !S.cid) return;
    const p = activeProfile(); if (!p) return;
    const idx = p.tls.findIndex(t => t.id === S.cid);
    if (idx < 0) return;
  
    S.workingTL.updatedAt = Date.now();
    p.tls[idx] = JSON.parse(JSON.stringify(S.workingTL));
    saveProfiles();
  
    if (userSession && sbClient) {
        toast('Sincronizando con la nube...', 'info');
        try {
            await sbClient.from('tierlists').update({
                title: S.workingTL.title,
                tiers_config: S.workingTL.tiers.map(t => ({ id: t.id, label: t.label, color: t.color })),
                updated_at: new Date()
            }).eq('id', S.cid);
  
            await sbClient.from('user_rankings').upsert({
                user_id: userSession.user.id,
                tierlist_id: S.cid,
                tiers_data: S.workingTL.tiers.map(t => ({ id: t.id, label: t.label, color: t.color, chars: t.chars })),
                pool_data: S.workingTL.pool,
                updated_at: new Date()
            }, { onConflict: 'user_id, tierlist_id' });
  
            S.hasUnsaved = false;
            toast('✓ Sincronizado', 'ok');
        } catch(e) {
            toast('Error de red', 'err');
        }
    } else {
        S.hasUnsaved = false;
        toast('✓ Guardado localmente', 'ok');
    }
    render();
}

function Nav() {
    const n = h('nav', {});
    n.appendChild(h('span', { class: 'logo', onclick: () => {
        if (S.page === 'viewer' || S.page === 'user-view') {
            S.page = S.prevPage || 'users'; render(); return;
        }
        if (S.hasUnsaved && !confirm('¿Salir sin guardar cambios?')) return;
        S.workingTL = null; S.hasUnsaved = false; S.page = 'home'; setRoute('home'); render();
    }}, 'AnimeTier'));
    
    if (userSession) {
        n.appendChild(h('button', { class: 'ntab' + (S.page === 'home' ? ' on' : ''), onclick: () => {
            if (S.hasUnsaved && !confirm('¿Descartar cambios?')) return;
            S.workingTL = null; S.hasUnsaved = false; S.page = 'home'; setRoute('home'); render();
        }}, 'Mis Tierlists'));
        
        if (S.cid) n.appendChild(h('button', { class: 'ntab' + (S.page === 'editor' ? ' on' : ''), onclick: () => {
            if (S.page !== 'editor') { openEditor(S.cid); render(); }
        }}, 'Editor'));
    }
    
    const nr = h('div', { class: 'nav-right' });
    if (userSession) {
        const notifBtn = h('div', { class: 'nav-notif', onclick: (e) => { 
            e.stopPropagation(); S.notifMenu = !S.notifMenu; S.profileMenu = null; 
            if(S.notifMenu) fetchNotifications(); render(); 
        }},
            h('span', { style: { fontSize: '18px' } }, '🔔'),
            S.pendingRequests.length > 0 ? h('div', { class: 'notif-badge' }, S.pendingRequests.length + '') : null
        );
        nr.appendChild(notifBtn);
        
        const p = currentUserProfile || { name: '...', color: '#888' };
        const btnContent = p.avatar_url 
            ? h('img', { src: p.avatar_url, style: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' } }) 
            : p.name.charAt(0).toUpperCase();
        
        const btn = h('div', { class: 'profile-btn active', style: { background: p.color + '33', color: p.color }, onclick: (e) => { 
            e.stopPropagation(); S.profileMenu = userSession.user.id; S.notifMenu = false; render(); 
        }}, btnContent);
        nr.appendChild(btn);
    } else {
        nr.appendChild(h('div', { class: 'profile-btn', style: { background: 'var(--bg3)', color: 'var(--text2)' }, onclick: handleGoogleLogin, title: 'Iniciar Sesión' }, '👤'));
    }
    n.appendChild(nr);
  
    if (S.profileMenu) {
        const p = getProfile(S.profileMenu) || currentUserProfile;
        if (p) {
            const pm = h('div', { class: 'profile-menu' });
            pm.appendChild(h('div', { class: 'pm-header' }, h('div', { class: 'pm-name' }, p.name), h('div', { class: 'pm-sub' }, 'Perfil Activo')));
            pm.appendChild(h('div', { class: 'pm-item', onclick: () => { S.page = 'profile'; S.profileMenu = null; render(); } }, '✎ Editar perfil'));
            pm.appendChild(h('div', { class: 'pm-item', onclick: () => { S.profileMenu = null; handleLogout(); } }, '🚪 Cerrar sesión'));
            document.addEventListener('click', () => { S.profileMenu = null; render(); }, { once: true });
            n.appendChild(pm);
        }
    }
    return n;
}

function Home() {
    const w = h('div', {});
    const hdr = h('div', { class: 'hh' });
    hdr.appendChild(h('h1', {}, 'AnimeTier'));
    const hhDiamond = h('div', { class: 'hh-diamond-sep' });
    hhDiamond.innerHTML = '<span class="diamond"></span>';
    hdr.appendChild(hhDiamond);
    hdr.appendChild(h('p', {}, 'Crea, compara y descubre los mejores rankings de anime'));
    w.appendChild(hdr);
  
    if (!userSession) {
        w.appendChild(h('div', { class: 'profile-notice' },
            h('h2', {}, 'Bienvenido'),
            h('p', { style: { color: 'var(--text2)', fontSize: '14px' } }, 'Inicia sesión para empezar a rankear'),
            h('button', { class: 'btn bp', style: { marginTop: '20px' }, onclick: handleGoogleLogin }, 'Iniciar Sesión con Google')
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
        { id: 'users', title: 'Usuarios', cls: 'mb-users' },
        { id: 'profile', title: 'Perfil', cls: 'mb-profile' }
    ];
  
    items.forEach(item => {
        const iconEl = h('div', { class: 'mb-icon' });
        iconEl.innerHTML = ICONS[item.id];
        const sepEl = h('div', { class: 'mb-sep' });
        sepEl.innerHTML = '<span class="mb-diamond"></span>';
        const content = h('div', { class: 'mb-content' }, iconEl, h('h2', {}, item.title), sepEl);
        menu.appendChild(h('div', { class: `menu-box ${item.cls}`, onclick: () => { S.page = item.id; render(); } }, content));
    });
  
    w.appendChild(menu);
    return w;
}

function TierlistsPage() {
    const w = h('div', {});
    const p = activeProfile();
    if (!p) return w;
    const g = h('div', { class: 'tlg' });
    g.appendChild(h('div', { class: 'nc', onclick: () => { alert("Funcionalidad de crear nueva tierlist"); } }, h('div', { class: 'plus' }, '+'), h('span', { style: { fontSize: '13px' } }, 'Nueva Tierlist')));
    
    [...(p.tls || [])].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).forEach(tl => {
        const card = h('div', { class: 'tlc', onclick: () => { openEditor(tl.id); } });
        const tot = (tl.tiers || []).reduce((a, t) => a + (t.chars || []).length, 0) + (tl.pool || []).length;
        card.appendChild(h('h3', {}, tl.title || 'Sin título'));
        card.appendChild(h('div', { class: 'meta' }, h('span', {}, (tl.tiers || []).length + ' tiers'), h('span', {}, tot + ' chars')));
        g.appendChild(card);
    });
    w.appendChild(g); return w;
}

function UsersPage() {
    if (S.allUsers.length === 0) fetchAllUsers();
    const w = h('div', { class: 'users-page' });
    const hdr = h('div', { class: 'users-page-header' });
    hdr.appendChild(h('h1', { class: 'users-page-title' }, 'Usuarios'));
    w.appendChild(hdr);
  
    const grid = h('div', { class: 'user-grid' });
    S.allUsers.forEach(u => {
        const card = h('div', { class: 'user-card', onclick: () => {
            if (u.relStatus === 'accepted' || u.id === userSession?.user.id) viewUser(u.id);
            else toast("Solo puedes ver perfiles de amigos", "info");
        }});
        const avWrap = h('div', { class: 'user-avatar-wrap' });
        avWrap.appendChild(h('div', { class: 'user-avatar-ring' }));
        avWrap.appendChild(h('img', { class: 'user-avatar', src: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}` }));
        card.appendChild(avWrap);
        card.appendChild(h('span', { class: 'user-name' }, u.name));
        grid.appendChild(card);
    });
  
    w.appendChild(grid);
    return w;
}

function ProfilePage() {
    const p = currentUserProfile;
    if (!p) return h('div', {}, 'Cargando perfil...');
    const w = h('div', { class: 'profile-content' });
    w.appendChild(h('h1', { class: 'page-title' }, 'Perfil'));
    w.appendChild(h('button', { class: 'logout-btn', onclick: handleLogout }, 'Cerrar sesión'));
    return w;
}

function Editor() {
    const tl = S.workingTL;
    if (!tl) return h('div', { style: { padding: '40px', color: 'var(--text3)' } }, 'Error: sin tierlist activa');
    
    const w = h('div', {});
    
    if (S.hasUnsaved) {
        const cb = h('div', { class: 'confirm-bar' });
        cb.appendChild(h('span', {}, '⚠️ Cambios sin guardar'));
        cb.appendChild(h('button', { class: 'btn btn-save', onclick: saveEditorChanges }, '✓ Guardar'));
        cb.appendChild(h('button', { class: 'btn bd bsm', onclick: discardChanges }, 'Descartar'));
        w.appendChild(cb);
    }
  
    const tb = h('div', { class: 'etbar' });
    const etitle = h('div', { class: 'etitle' }, h('span', {}, tl.title || 'Sin Título'));
    tb.appendChild(etitle);
    w.appendChild(tb);
  
    const tw = h('div', { class: 'twrap' });
    (tl.tiers || []).forEach((t, tidx) => {
        const row = h('div', { class: 'trow', id: 't' + t.id, onpointerup: e => tdrop(e, t.id), onpointerenter: e => tover(e, t.id) });
        
        const lbl = h('div', { class: 'tlbl', style: { background: t.color } });
        lbl.appendChild(h('div', { class: 'tlbl-txt' }, t.label));
        row.appendChild(lbl);
  
        const ce = h('div', { class: 'tchars' });
        (t.chars || []).forEach((cid, cidx) => {
            const c = getChar(cid, tl);
            if (!c) return;
            const el = h('div', { class: 'tc', 'data-cid': cid, onpointerdown: e => dgPointerDown(e, cid, t.id, cidx, charImg(cid, tl)) });
            el.appendChild(h('img', { src: charImg(cid, tl) }));
            el.appendChild(h('div', { class: 'cn' }, c.name));
            ce.appendChild(el);
        });
        row.appendChild(ce);
        tw.appendChild(row);
    });
    w.appendChild(tw);
  
    const pw = h('div', { class: 'pool', id: 'pdrop', onpointerup: pdrop, onpointerenter: pover });
    const phdr = h('div', { class: 'pool-hdr' }, h('h3', {}, 'Pool de Personajes'));
    pw.appendChild(phdr);
    
    const pchars = h('div', { class: 'pchars' });
    (tl.pool || []).forEach((cid, idx) => {
        const c = getChar(cid, tl);
        if (!c) return;
        const el = h('div', { class: 'pc', 'data-cid': cid, onpointerdown: e => dgPointerDown(e, cid, 'pool', idx, charImg(cid, tl)) });
        el.appendChild(h('img', { src: charImg(cid, tl) }));
        el.appendChild(h('div', { class: 'cn' }, c.name));
        pchars.appendChild(el);
    });
    pw.appendChild(pchars);
    w.appendChild(pw);
  
    return w;
}

function UserViewPage() { return h('div', {}, 'Visualizando usuario...'); }
function Viewer() { return h('div', {}, 'Visualizando tierlist...'); }

// ============ RENDER PRINCIPAL ============
function render() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
  
    app.appendChild(Nav());
    const m = h('main', {});
  
    if (S.page === 'home') m.appendChild(Home());
    else if (S.page === 'tierlists') m.appendChild(TierlistsPage());
    else if (S.page === 'users') m.appendChild(UsersPage());
    else if (S.page === 'user-view') m.appendChild(UserViewPage());
    else if (S.page === 'viewer') m.appendChild(Viewer());
    else if (S.page === 'profile') m.appendChild(ProfilePage());
    else if (S.page === 'editor') m.appendChild(Editor());
  
    app.appendChild(m);
}