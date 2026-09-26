// Reacciones con emoji a una tierlist (distinto de comentar: es un solo
// toque, una reacción por persona, se puede cambiar). Solo aparece en modo
// Visor, junto a los comentarios. Requiere la tabla "tierlist_reactions".
//
// IMPORTANTE — igual que los comentarios: se guardan por "ranking_id" (el
// ranking personal de cada usuario), no por "tierlist_id" (la plantilla
// compartida). Guardarlas por tierlist_id hacía que una reacción en la
// tierlist de un amigo apareciera también en la tuya.

const REACTION_EMOJIS = ['🔥', '😍', '💀', '😂', '👑', '😭'];

async function fetchReactions(rankingId) {
  if (!sbClient || !rankingId) return;
  try {
    const { data, error } = await sbClient.from('tierlist_reactions')
      .select('emoji, user_id')
      .eq('ranking_id', rankingId);
    if (error) throw error;
    S.reactions[rankingId] = data || [];
  } catch (e) {
    S.reactions[rankingId] = null;
  }
  render();
}

async function toggleReaction(rankingId, emoji, ownerUserId) {
  if (!userSession || !sbClient) return;
  const list = S.reactions[rankingId] || [];
  const mine = list.find(r => r.user_id === userSession.user.id);

  if (mine && mine.emoji === emoji) {
    // Ya tenías esta misma reacción puesta → quitarla
    S.reactions[rankingId] = list.filter(r => r.user_id !== userSession.user.id);
    render();
    await sbClient.from('tierlist_reactions').delete().eq('ranking_id', rankingId).eq('user_id', userSession.user.id);
    return;
  }

  // Nueva reacción o cambiar de emoji
  S.reactions[rankingId] = [...list.filter(r => r.user_id !== userSession.user.id), { emoji, user_id: userSession.user.id }];
  render();

  const { error } = await sbClient.from('tierlist_reactions')
    .upsert({ ranking_id: rankingId, user_id: userSession.user.id, emoji }, { onConflict: 'ranking_id,user_id' });

  if (!error && !mine && ownerUserId) {
    createNotification(ownerUserId, 'reaction', { message: `ha reaccionado con ${emoji} a tu tierlist.` });
  }
}

function ReactionsBar(rankingId, ownerUserId) {
  const list = S.reactions[rankingId];
  if (list === undefined) { fetchReactions(rankingId); }

  const bar = h('div', { class: 'reactions-bar' });
  const counts = {};
  (list || []).forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
  const mine = userSession && (list || []).find(r => r.user_id === userSession.user.id);

  REACTION_EMOJIS.forEach(emoji => {
    const count = counts[emoji] || 0;
    const active = mine && mine.emoji === emoji;
    const props = {
      class: 'reaction-pill' + (active ? ' reaction-active' : ''),
      onclick: () => toggleReaction(rankingId, emoji, ownerUserId)
    };
    // OJO: el helper h() hace setAttribute('disabled', false) tal cual, y
    // en HTML "disabled" es un atributo booleano — su sola presencia (aunque
    // el valor sea la cadena "false") ya deshabilita el botón. Por eso las
    // reacciones salían siempre bloqueadas. Solución: solo añadir la clave
    // "disabled" cuando de verdad hace falta.
    if (!userSession) { props.disabled = true; props.title = 'Inicia sesión para reaccionar'; }
    bar.appendChild(h('button', props, h('span', {}, emoji), count > 0 ? h('span', { class: 'reaction-count' }, count + '') : null));
  });
  return bar;
}
