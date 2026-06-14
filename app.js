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
    modal: null, md: {},
    q: '', poolPage: 0,
    cid: null,
    workingTL: null,
    hasUnsaved: false
};

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
        const p = currentUserProfile || { name: '...', color: '#888' };
        nr.appendChild(h('div', { class: 'profile-btn active', style: { background: p.color + '33', color: p.color } }, p.name.charAt(0).toUpperCase()));
    } else {
        nr.appendChild(h('button', { class: 'btn bp', onclick: () => sbClient.auth.signInWithOAuth({ provider: 'google' }) }, 'Entrar'));
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
    else if (S.page === 'tierlists') main.appendChild(TierlistsPage());
    else if (S.page === 'editor') main.appendChild(Editor());
    app.appendChild(main);
    const m = ModalEl(); if (m) app.appendChild(m);
  if(window.lucide) lucide.createIcons();
}

window.onload = () => {
    sbClient = supabase.createClient(SB_URL, SB_KEY);
    sbClient.auth.onAuthStateChange((ev, session) => handleAuthSession(session));
    render();
};