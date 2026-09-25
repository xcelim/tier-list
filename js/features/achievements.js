// Sistema de logros — se calcula 100% en el cliente a partir de los datos
// que ya existen en el perfil local (S.profiles), así que no depende de
// ninguna tabla nueva de Supabase ni puede romper nada si algo de red falla.

const ACHIEVEMENT_DEFS = [
  { id:'first_tl',    icon:'📋', title:'Primer paso',        desc:'Crea tu primera tierlist.',
    check:(p)=> (p.tls||[]).length >= 1 },
  { id:'five_tl',     icon:'🗂️', title:'Coleccionista',      desc:'Crea 5 tierlists.',
    check:(p)=> (p.tls||[]).length >= 5 },
  { id:'ten_tl',      icon:'👑', title:'Archivista supremo',  desc:'Crea 10 tierlists.',
    check:(p)=> (p.tls||[]).length >= 10 },
  { id:'fifty_chars', icon:'⭐', title:'Ojo entrenado',       desc:'Rankea 50 personajes en total.',
    check:(p)=> totalCharsRanked(p) >= 50 },
  { id:'k_chars',     icon:'💎', title:'Juez implacable',     desc:'Rankea 1.000 personajes en total.',
    check:(p)=> totalCharsRanked(p) >= 1000 },
  { id:'s_tier_full', icon:'🏆', title:'El podio de oro',     desc:'Llena un tier S (o el primero de la lista) con al menos 5 personajes.',
    check:(p)=> (p.tls||[]).some(tl => (tl.tiers||[])[0] && (tl.tiers[0].chars||[]).length >= 5) },
  { id:'custom_char', icon:'🎨', title:'Creador de mundos',   desc:'Añade un personaje personalizado (fuera del catálogo).',
    check:(p)=> Object.keys(AC||{}).some(id => AC[id]?.custom) },
  { id:'complete_seven', icon:'🔥', title:'Racha de fuego',   desc:'Ten 7 tierlists distintas con al menos un personaje rankeado.',
    check:(p)=> (p.tls||[]).filter(tl => (tl.tiers||[]).some(t=>(t.chars||[]).length>0)).length >= 7 },
  { id:'social_butterfly', icon:'🦋', title:'Mariposa social', desc:'Ten al menos 3 amigos aceptados.',
    check:(p)=> (S.allUsers||[]).find(u=>u.id===userSession?.user?.id)?.friend_count >= 3 },
  { id:'commentator', icon:'💬', title:'Voz de la comunidad', desc:'Publica tu primer comentario en una tierlist.',
    check:(p)=> Object.values(S.comments||{}).some(list => Array.isArray(list) && list.some(c=>c.user_id===userSession?.user?.id)) },
];

function totalCharsRanked(p){
  return (p.tls||[]).reduce((sum,tl)=> sum + (tl.tiers||[]).reduce((a,t)=>a+(t.chars||[]).length,0), 0);
}

function computeAchievements(){
  const p = activeProfile();
  if(!p) return ACHIEVEMENT_DEFS.map(def=>({def, unlocked:false}));
  return ACHIEVEMENT_DEFS.map(def => ({ def, unlocked: !!def.check(p) }));
}

// Construye la rejilla de logros para pegar en Ajustes (ProfilePage).
function AchievementsSection(){
  const list = computeAchievements();
  const unlockedCount = list.filter(a=>a.unlocked).length;

  const box = h('div', { class:'ach-box' });
  box.appendChild(h('div', { class:'ach-header' },
    h('div', { class:'comments-title' }, '🏅 Logros'),
    h('div', { class:'ach-count' }, `${unlockedCount} / ${list.length}`)
  ));
  const grid = h('div', { class:'ach-grid' });
  list.forEach(({def, unlocked}) => {
    grid.appendChild(h('div', { class:'ach-badge' + (unlocked ? ' unlocked' : ' locked'), title: def.desc },
      h('div', { class:'ach-icon' }, def.icon),
      h('div', { class:'ach-title' }, def.title),
      h('div', { class:'ach-desc' }, def.desc)
    ));
  });
  box.appendChild(grid);
  return box;
}
