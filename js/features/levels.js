// Niveles de cuenta y marcos de avatar especiales.
// El nivel se calcula 100% en el cliente a partir de actividad real (no es
// decorativo/falso): tierlists creadas, personajes rankeados y logros
// desbloqueados. Los marcos se desbloquean por nivel y se guardan en
// profiles.avatar_frame (columna añadida en supabase-schema.sql).

const FRAME_DEFS = [
  { id:'none',      name:'Sin marco',     minLevel:1,  css:'' },
  { id:'bronze',     name:'Bronce',        minLevel:2,  css:'frame-bronze' },
  { id:'silver',     name:'Plata',         minLevel:5,  css:'frame-silver' },
  { id:'gold',       name:'Oro',           minLevel:9,  css:'frame-gold' },
  { id:'neon',       name:'Neón',          minLevel:14, css:'frame-neon' },
  { id:'legendary',  name:'Legendario',    minLevel:20, css:'frame-legendary' },
];

function computeXP(p){
  const achCount = (typeof computeAchievements==='function') ? computeAchievements().filter(a=>a.unlocked).length : 0;
  return (p.tls||[]).length * 15 + totalCharsRanked(p) + achCount * 25;
}

// Curva de nivel simple: cada nivel requiere un poco más de XP que el anterior
function computeLevel(xp){
  return Math.max(1, Math.floor(Math.sqrt(xp / 8)) + 1);
}
function xpForLevel(level){ return Math.pow(level - 1, 2) * 8; }

function unlockedFrames(level){
  return FRAME_DEFS.filter(f => level >= f.minLevel);
}

function LevelBadge(level, xp){
  const nextLevelXp = xpForLevel(level + 1);
  const thisLevelXp = xpForLevel(level);
  const progress = Math.min(100, Math.round(((xp - thisLevelXp) / Math.max(1, nextLevelXp - thisLevelXp)) * 100));
  const box = h('div', { class:'level-badge' });
  box.appendChild(h('div', { class:'level-num' }, 'Nv. ' + level));
  const bar = h('div', { class:'level-bar' });
  bar.appendChild(h('div', { class:'level-bar-fill', style:{ width: progress + '%' } }));
  box.appendChild(bar);
  box.appendChild(h('div', { class:'level-xp' }, `${xp} XP · próximo nivel: ${nextLevelXp} XP`));
  return box;
}

function AvatarFramePicker(p, level){
  const box = h('div', { class:'frame-picker' });
  box.appendChild(h('div', { class:'comments-title' }, '🖼️ Marco de avatar'));
  const grid = h('div', { class:'frame-grid' });
  FRAME_DEFS.forEach(f => {
    const unlocked = level >= f.minLevel;
    const equipped = (p.avatar_frame || 'none') === f.id;
    const item = h('div', {
      class: 'frame-option' + (unlocked ? '' : ' frame-locked') + (equipped ? ' frame-equipped' : ''),
      onclick: () => { if (unlocked && typeof updateProfileField==='function') updateProfileField('avatar_frame', f.id); }
    });
    const preview = h('div', { class: 'frame-preview ' + f.css });
    preview.appendChild(h('img', { src: p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}` }));
    item.appendChild(preview);
    item.appendChild(h('div', { class:'frame-name' }, f.name));
    item.appendChild(h('div', { class:'frame-req' }, unlocked ? (equipped ? 'Equipado' : 'Disponible') : `Nivel ${f.minLevel}`));
    grid.appendChild(item);
  });
  box.appendChild(grid);
  return box;
}

function frameClassFor(p){
  const f = FRAME_DEFS.find(x => x.id === (p && p.avatar_frame));
  return f ? f.css : '';
}
