// Dos mejoras rápidas de la lista de 20 ideas:
//  - "Personaje del día": destacado en la Home, cambia una vez al día
//    (semilla determinista por fecha, así todo el mundo ve el mismo).
//  - "Estadísticas personales": resumen calculado a partir de tus propias
//    tierlists, sin depender de ninguna tabla nueva.
// Ninguna de las dos toca el editor/ranking.

function CharacterOfTheDay() {
  const ids = Object.keys(AC || {});
  if (!ids.length) return null;
  // Semilla determinista por día (AAAA-MM-DD) para que sea "el mismo" todo el día
  const seed = new Date().toISOString().slice(0, 10).split('-').reduce((a, n) => a + parseInt(n, 10), 0);
  const pick = AC[ids[seed % ids.length]];
  if (!pick) return null;

  const box = h('div', { class: 'cotd-box' });
  box.appendChild(h('div', { class: 'cotd-label' }, '✦ Personaje del día ✦'));
  const card = h('div', { class: 'cotd-card' });
  card.appendChild(h('img', { class: 'cotd-img', src: charImg(ids[seed % ids.length]) }));
  const info = h('div', { class: 'cotd-info' });
  info.appendChild(h('div', { class: 'cotd-name' }, pick.name || 'Desconocido'));
  if (pick.anime) info.appendChild(h('div', { class: 'cotd-anime' }, pick.anime));
  card.appendChild(info);
  box.appendChild(card);
  return box;
}

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
  return box;
}
