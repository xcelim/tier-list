// Mejora rápida de la lista de ideas: "Estadísticas personales", calculadas
// a partir de tus propias tierlists, sin depender de ninguna tabla nueva.
// (El "Personaje del día" que había aquí se quitó a petición del usuario.)
// No toca el editor/ranking.
function StatsSection() {
  const p = activeProfile();
  if (!p) return h('div', {});
  const tls = p.tls || [];
  const totalChars = totalCharsRanked(p);
  const totalTiers = tls.reduce((a, tl) => a + (tl.tiers || []).length, 0);
  const avgPerTl = tls.length ? Math.round(totalChars / tls.length) : 0;

  // Anime más rankeado (según el campo "anime" del catálogo)
  const animeCount = {};
  tls.forEach(tl => (tl.tiers || []).forEach(t => (t.chars || []).forEach(cid => {
    const c = AC[cid]; if (c && c.anime) animeCount[c.anime] = (animeCount[c.anime] || 0) + 1;
  })));
  const topAnime = Object.entries(animeCount).sort((a, b) => b[1] - a[1])[0];

  // Tier más usado (por etiqueta, ej. "S", "A"...) en todas tus tierlists
  const tierLabelCount = {};
  tls.forEach(tl => (tl.tiers || []).forEach(t => {
    const n = (t.chars || []).length;
    if (n > 0) tierLabelCount[t.label || '?'] = (tierLabelCount[t.label || '?'] || 0) + n;
  }));
  const topTier = Object.entries(tierLabelCount).sort((a, b) => b[1] - a[1])[0];

  const box = h('div', { class: 'stats-box' });
  box.appendChild(h('div', { class: 'comments-title' }, '📊 Estadísticas'));
  const grid = h('div', { class: 'stats-grid' });
  const stat = (val, label) => h('div', { class: 'stat-item' }, h('div', { class: 'stat-val' }, val + ''), h('div', { class: 'stat-label' }, label));
  grid.appendChild(stat(tls.length, 'Tierlists creadas'));
  grid.appendChild(stat(totalChars, 'Personajes rankeados'));
  grid.appendChild(stat(totalTiers, 'Tiers en total'));
  grid.appendChild(stat(avgPerTl, 'Media por tierlist'));
  box.appendChild(grid);
  if (topAnime) {
    box.appendChild(h('div', { class: 'stats-highlight' }, `Tu anime más rankeado: `, h('strong', {}, topAnime[0]), ` (${topAnime[1]} personajes)`));
  }
  if (topTier) {
    box.appendChild(h('div', { class: 'stats-highlight' }, `Tu tier favorito: `, h('strong', {}, topTier[0]), ` (${topTier[1]} personajes ahí)`));
  }
  if (p.created_at) {
    box.appendChild(h('div', { class: 'stats-highlight' }, `Miembro desde: `, h('strong', {}, new Date(p.created_at).toLocaleDateString())));
  }
  return box;
}
