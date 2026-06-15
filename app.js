// ============ CONFIG & STATE ============
let sbClient = null;
let userSession = null;
let currentUserProfile = null;
let AC = {}; // Se llena dinámicamente desde Supabase

let S = {
    page: 'home',
    profiles: JSON.parse(localStorage.getItem('at4_profiles')) || [],
    activeProfile: localStorage.getItem('at4_activeProfile'),
    allUsers: [],
    pendingRequests: [],
    modal: null, md: {},
    q: '', poolPage: 0,
    cid: null,
    workingTL: null,
    hasUnsaved: false
}; // This is the original S object, it will be replaced by the one in index.html

// The S object is now defined in index.html, so this block is effectively ignored.

// ============ HELPERS ============
function h(tag, a, ...ch) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) {
        if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'class') el.className = v;
        else el.setAttribute(k, v);
    }
    for (const c of ch.flat()) {
        if (c == null || c === false) continue;
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
}

function toast(msg, type = 'ok') {
    const el = h('div', { class: 'toast ' + type }, msg);
    document.getElementById('tw').appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function activeProfile() { return S.profiles.find(p => p.id === S.activeProfile); }

function saveLocal() {
    localStorage.setItem('at4_profiles', JSON.stringify(S.profiles));
    localStorage.setItem('at4_activeProfile', S.activeProfile || '');
}

// ============ SUPABASE LOGIC ============
async function handleAuthSession(session) {
    userSession = session;
    if (!session) { render(); return; }
    let { data: profile } = await sbClient.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (!profile) {
        const name = prompt("Nombre de usuario:") || "User_" + Math.random().toString(36).slice(-4);
        profile = { id: session.user.id, name, color: '#7c5cbf' };
        await sbClient.from('profiles').insert(profile);
    }
    currentUserProfile = profile;
    S.activeProfile = session.user.id;
    if (!S.profiles.find(p => p.id === profile.id)) S.profiles.push({ ...profile, tls: [] });
    saveLocal();
    render();
}

async function fetchAllUsers() {
    if (!sbClient) return; 
    const { data: profiles } = await sbClient.from('profiles').select('*').order('name');
    const { data: rankings } = await sbClient.from('user_rankings').select('user_id');
    const { data: friendships } = await sbClient.from('friendships').select('*');
    
    if (profiles) {
        S.allUsers = profiles.map(u => {
            const tlCount = (rankings || []).filter(r => r.user_id === u.id).length;
            const userFriends = (friendships || []).filter(f => f.status === 'accepted' && (f.user_id === u.id || f.friend_id === u.id));
            
            let relStatus = 'none', relId = null;
            if(userSession) {
                const rel = (friendships || []).find(f => 
                    (f.user_id === userSession.user.id && f.friend_id === u.id) || 
                    (f.friend_id === userSession.user.id && f.user_id === u.id)
                );
                if(rel) {
                    relId = rel.id;
                    if(rel.status === 'accepted') relStatus = 'accepted';
                    else if(rel.user_id === userSession.user.id) relStatus = 'pending_sent';
                    else relStatus = 'pending_received';
                }
            }
            return { ...u, tl_count: tlCount, friend_count: userFriends.length, relStatus, relId };
        });
        render();
    }
}

async function updateProfileField(field, value) {
    if (!userSession || !sbClient) return;
    const { error } = await sbClient.from('profiles').update({ [field]: value }).eq('id', userSession.user.id);
    if (!error) {
        if (currentUserProfile) currentUserProfile[field] = value;
        const localP = activeProfile();
        if (localP) localP[field] = value;
        saveLocal(); toast("Perfil actualizado ✓"); render();
    }
}

async function handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;
    await sbClient.auth.signOut();
    localStorage.removeItem('at4_activeProfile');
    localStorage.removeItem('at4_profiles');
    location.reload();
}

async function openEditor(id) {
    const p = activeProfile();
    const tl = p.tls.find(t => t.id === id);
    if (!tl) return;
    S.cid = id;
    S.workingTL = JSON.parse(JSON.stringify(tl));
    S.page = 'editor';
    toast("Sincronizando...", "info");
    const { data: chars } = await sbClient.from('characters').select('*').eq('tierlist_id', id);
    if (chars) chars.forEach(c => AC[c.id] = { id: c.id, name: c.name, anime: c.anime, file: c.image_url });
    render();
}

async function saveChanges() {
    if (!S.workingTL) return;
    const { error } = await sbClient.from('user_rankings').upsert({
        user_id: userSession.user.id,
        tierlist_id: S.cid,
        tiers_data: S.workingTL.tiers,
        pool_data: S.workingTL.pool
    });
    if (!error) {
        const p = activeProfile();
        const idx = p.tls.findIndex(t => t.id === S.cid);
        p.tls[idx] = JSON.parse(JSON.stringify(S.workingTL));
        saveLocal();
        S.hasUnsaved = false;
        toast("¡Guardado en la nube!");
        render();
    }
}

// ============ DRAG & DROP ============
let DG = null, DS = null;
function dgPointerDown(e, id, src) { DG = id; DS = src; }
function tdrop(e, tid) {
    e.preventDefault();
    const tl = S.workingTL;
    if (DS === 'pool') tl.pool = tl.pool.filter(x => x !== DG);
    else tl.tiers.find(t => t.id === DS).chars = tl.tiers.find(t => t.id === DS).chars.filter(x => x !== DG);
    tl.tiers.find(t => t.id === tid).chars.push(DG);
    S.hasUnsaved = true;
    render();
}

// ============ COMPONENTS ============
function Nav() {
    const n = h('nav', {});
    n.appendChild(h('span', { class: 'logo', onclick: () => { S.page = 'home'; render(); } }, 'AnimeTier'));
    const nr = h('div', { class: 'nav-right' });
    if (userSession) {
        n.appendChild(h('button', { class: 'ntab' + (S.page === 'users' ? ' on' : ''), onclick: () => { S.page = 'users'; render(); } }, 'Comunidad'));
        const p = currentUserProfile || { name: '...', color: '#888' };
        nr.appendChild(h('div', { class: 'profile-btn active', style: { background: p.color + '33', color: p.color }, onclick: () => { S.page = 'profile'; render(); } }, p.name.charAt(0).toUpperCase()));
    } else {
        nr.appendChild(h('button', { class: 'btn bp', onclick: () => sbClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } }) }, 'Entrar'));
    }
    n.appendChild(nr);
    return n;
}

function Home() {
    document.body.classList.add('bg-main');
    const w = h('div', { class: 'hh' }, h('h1', {}, 'AnimeTier'), h('p', {}, 'Crea y comparte tus rankings'));
    if (!userSession) return w;
    const grid = h('div', { class: 'menu-grid' });
    [{ id: 'tierlists', title: 'Tierlists', icon: '📊' }, { id: 'users', title: 'Comunidad', icon: '👥' }].forEach(item => {
        grid.appendChild(h('div', { class: 'menu-box', onclick: () => { S.page = item.id; render(); } }, h('span', { class: 'icon' }, item.icon), h('h2', {}, item.title)));
    });
    w.appendChild(grid);
    return w;
}

function TierlistsPage() {
    document.body.classList.remove('bg-main');
    const p = activeProfile();
    const w = h('div', { class: 'tlg' });
    w.appendChild(h('div', { class: 'nc', onclick: () => { S.modal = 'new-tl'; render(); } }, h('div', { class: 'plus' }, '+'), 'Nueva'));
    (p?.tls || []).forEach(tl => {
        w.appendChild(h('div', { class: 'tlc', onclick: () => openEditor(tl.id) }, h('h3', {}, tl.title)));
    });
    return w;
}

function ProfilePage() {
    const p = currentUserProfile || { name: '...', color: '#5b7fe8' };
    const w = h('div', { class: 'profile-content' });

    // Decoración de fondo (Estrellas)
    const stars = h('div', { id: 'stars' });
    for (let i = 0; i < 55; i++) {
        const s = h('div', { class: 'star' });
        const size = Math.random() * 2.5 + 0.8;
        Object.assign(s.style, { width: size + 'px', height: size + 'px', top: Math.random() * 100 + '%', left: Math.random() * 100 + '%', animationDelay: (Math.random() * 5).toFixed(2) + 's', animationDuration: (2 + Math.random() * 3).toFixed(2) + 's' });
        stars.appendChild(s);
    }
    w.appendChild(stars);

    // Header
    w.appendChild(h('h1', { class: 'page-title' }, 'Perfil', h('span', { class: 'heart-icon' })));
    w.appendChild(h('p', { class: 'page-subtitle' }, h('span', { class: 'diamond-sm' }), 'Personaliza tu perfil y gestiona tu cuenta.', h('span', { class: 'diamond-sm' })));

    // Tarjeta de Perfil
    const card = h('div', { class: 'profile-card' });
    const pTop = h('div', { class: 'profile-top' });

    // Avatar con lógica de subida
    const fileInp = h('input', { type: 'file', hidden: true, accept: 'image/*', onchange: async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!confirm("¿Quieres cambiar tu foto de perfil?")) return;

        toast("Subiendo imagen...", "info");
        const path = `profile/${userSession.user.id}_${Date.now()}.png`;
        
        // Borrar anterior si existe
        if (p.avatar_url && p.avatar_url.includes('/profile/')) {
            const oldPath = p.avatar_url.split('/tierlists/')[1];
            if (oldPath) await sbClient.storage.from('tierlists').remove([oldPath]);
        }

        const { error } = await sbClient.storage.from('tierlists').upload(path, file);
        if (!error) {
            const { data: { publicUrl } } = sbClient.storage.from('tierlists').getPublicUrl(path);
            updateProfileField('avatar_url', publicUrl);
        } else {
            toast("Error al subir: " + error.message, "err");
        }
    }});

    const avWrap = h('div', { class: 'avatar-wrap' });
    const avInner = h('div', { class: 'avatar-inner' });
    avInner.appendChild(h('img', { 
        src: p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`,
        style: { width: '100%', height: '100%', objectFit: 'cover' }
    }));
    avWrap.appendChild(h('div', { class: 'avatar-ring' }, avInner));
    avWrap.appendChild(h('div', { class: 'camera-btn', onclick: () => fileInp.click() }, h('i', { class: 'ti ti-camera' })));
    avWrap.appendChild(fileInp);
    pTop.appendChild(avWrap);

    // Campos de texto
    const pRight = h('div', { class: 'profile-right' });
    pRight.appendChild(h('div', { class: 'field-label' }, 'Nombre de usuario'));
    const nameInp = h('input', { class: 'field-input', type: 'text', value: p.name });
    pRight.appendChild(nameInp);
    pRight.appendChild(h('button', { class: 'save-btn', onclick: () => {
        if(confirm("¿Guardar cambios en el nombre?")) updateProfileField('name', nameInp.value);
    } }, h('i', { class: 'ti ti-device-floppy' }), 'Guardar cambios'));
    pTop.appendChild(pRight);
    card.appendChild(pTop);

    // Selector de colores
    const colorsRow = h('div', { class: 'colors-row' });
    ['#5b7fe8', '#9b59f5', '#60a5fa', '#22d3ee', '#34d399', '#fbbf24', '#f87171'].forEach(c => {
        const dot = h('button', { 
            class: 'color-dot' + (p.color === c ? ' active' : ''), 
            style: { background: c },
            onclick: () => { if(confirm("¿Cambiar color de perfil?")) updateProfileField('color', c); }
        }, h('i', { class: 'ti ti-check' }));
        colorsRow.appendChild(dot);
    });
    card.appendChild(h('div', { class: 'colors-section' }, h('div', { class: 'colors-label' }, 'Selecciona tu color favorito'), colorsRow));
    w.appendChild(card);

    // Acciones de cuenta
    const acts = h('div', { class: 'action-row' });
    acts.appendChild(h('button', { class: 'logout-btn', onclick: handleLogout }, h('i', { class: 'ti ti-logout' }), 'Cerrar sesión'));
    acts.appendChild(h('button', { class: 'delete-btn', onclick: () => {
        if(confirm("¿ESTÁS SEGURO? Esta acción eliminará permanentemente tu cuenta y rankings personales.")) {
            // Aquí llamarías a una función RPC de borrado si la tienes, o borrarías tablas.
            toast("Función de borrado total en desarrollo", "info");
        }
    } }, h('i', { class: 'ti ti-trash' }), 'Eliminar cuenta'));
    w.appendChild(acts);

    // Sección Amigos
    w.appendChild(h('div', { class: 'divider-row' }, h('div', { class: 'div-line' }), h('div', { class: 'div-diamond' }), h('div', { class: 'div-line' })));
    w.appendChild(h('h2', { class: 'friends-title' }, 'Amigos', h('span', { class: 'heart-icon' })));
    w.appendChild(h('p', { class: 'friends-subtitle' }, 'Aquí puedes ver a tus amigos y compartir tierlists juntos.'));

    const friendsGrid = h('div', { class: 'friends-grid' });
    const friends = S.allUsers.filter(u => u.relStatus === 'accepted');
    
    if (friends.length === 0) {
        friendsGrid.appendChild(h('div', { style: { color: 'var(--text3)', padding: '20px' } }, 'Aún no tienes amigos agregados.'));
    } else {
        friends.forEach(f => {
            const fCard = h('div', { class: 'user-card', style: { width: '180px !important' } });
            const avW = h('div', { class: 'user-avatar-wrap', style: { width: '80px !important', height: '80px !important' } });
            avW.appendChild(h('div', { class: 'user-avatar-ring' }));
            avW.appendChild(h('img', { class: 'user-avatar', src: f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.name}` }));
            fCard.appendChild(avW);
            fCard.appendChild(h('span', { class: 'user-name' }, f.name));
            fCard.appendChild(h('div', { class: 'user-stats' }, `${f.tl_count} tierlists`));
            friendsGrid.appendChild(fCard);
        });
    }
    w.appendChild(friendsGrid);

    return w;
}

function Editor() {
    const tl = S.workingTL;
    const w = h('div', {});
    const tb = h('div', { class: 'etbar' }, h('h2', { class: 'hf' }, tl.title), h('button', { class: 'btn bp', onclick: saveChanges }, 'Guardar'));
    w.appendChild(tb);
    const tw = h('div', { class: 'twrap' });
    tl.tiers.forEach(tier => {
        const row = h('div', { class: 'trow', ondragover: e => e.preventDefault(), ondrop: e => tdrop(e, tier.id) });
        row.appendChild(h('div', { class: 'tlbl', style: { background: tier.color } }, tier.label));
        const ce = h('div', { class: 'tchars' });
        tier.chars.forEach(cid => {
            const c = AC[cid] || { name: '?' };
            const el = h('div', { class: 'tc', draggable: true, ondragstart: e => dgPointerDown(e, cid, tier.id) }, h('img', { src: c.file }), h('div', { class: 'cn' }, c.name));
            ce.appendChild(el);
        });
        row.appendChild(ce);
        tw.appendChild(row);
    });
    w.appendChild(tw);
    const pool = h('div', { class: 'pool', ondragover: e => e.preventDefault(), ondrop: e => {
        tl.pool.push(DG);
        tl.tiers.find(t => t.id === DS).chars = tl.tiers.find(t => t.id === DS).chars.filter(x => x !== DG);
        render();
    } });
    const pc = h('div', { class: 'pchars' });
    tl.pool.forEach(cid => {
        const c = AC[cid] || { name: '?' };
        pc.appendChild(h('div', { class: 'pc', draggable: true, ondragstart: e => dgPointerDown(e, cid, 'pool') }, h('img', { src: c.file }), h('div', { class: 'cn' }, c.name)));
    });
    pool.appendChild(pc);
    w.appendChild(pool);
    return w;
}

function ModalEl() {
    if (!S.modal) return null;
    const ov = h('div', { class: 'ov', onclick: e => { if (e.target === ov) { S.modal = null; render(); } } });
    const m = h('div', { class: 'modal' });
    if (S.modal === 'new-tl') {
        m.appendChild(h('h2', {}, 'Nueva Tierlist'));
        const inp = h('input', { placeholder: 'Título...' });
        m.appendChild(inp);
        m.appendChild(h('button', { class: 'btn bp', style: { marginTop: '10px', width: '100%' }, onclick: async () => {
            const id = Math.random().toString(36).slice(2);
            await sbClient.from('tierlists').insert({ id, title: inp.value, created_by: userSession.user.id, tiers_config: DEFAULT_TIERS });
            activeProfile().tls.push({ id, title: inp.value, tiers: DEFAULT_TIERS, pool: [] });
            saveLocal(); S.modal = null; openEditor(id);
        } }, 'Crear'));
    }
    ov.appendChild(m);
    return ov;
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(Nav());
    const main = h('main', {});
    if (S.page === 'home') main.appendChild(Home());
    else if (S.page === 'profile') main.appendChild(ProfilePage());
    else if (S.page === 'tierlists') main.appendChild(TierlistsPage());
    else if (S.page === 'users') main.appendChild(UsersPage());
    else if (S.page === 'editor') main.appendChild(Editor());
    app.appendChild(main);
    const m = ModalEl(); if (m) app.appendChild(m);
    
    if (S.page === 'profile' || S.page === 'users') { if(S.allUsers.length === 0) fetchAllUsers(); }
    if(window.lucide) lucide.createIcons();
}

window.onload = () => {
    sbClient = supabase.createClient(SB_URL, SB_KEY);
    sbClient.auth.onAuthStateChange((ev, session) => handleAuthSession(session));
    render();
};