// Reacciones con emoji a una tierlist (distinto de comentar: es un solo
// toque, una reacción por persona, se puede cambiar). Solo aparece en modo
// Visor, junto a los comentarios. Requiere la tabla "tierlist_reactions".

const REACTION_EMOJIS = ['🔥', '😍', '💀', '😂', '👑', '😭'];

async function fetchReactions(tierlistId) {
  if (!sbClient || !tierlistId) return;
  try {
    const { data, error } = await sbClient.from('tierlist_reactions')
      .select('emoji, user_id')
      .eq('tierlist_id', tierlistId);
    if (error) throw error;
    S.reactions[tierlistId] = data || [];
  } catch (e) {
    S.reactions[tierlistId] = null;
  }
  render();
}

async function toggleReaction(tierlistId, emoji, ownerUserId) {
  if (!userSession || !sbClient) return;
  const list = S.reactions[tierlistId] || [];
  const mine = list.find(r => r.user_id === userSession.user.id);

  if (mine && mine.emoji === emoji) {
    // Ya tenías esta misma reacción puesta → quitarla
    S.reactions[tierlistId] = list.filter(r => r.user_id !== userSession.user.id);
    render();
    await sbClient.from('tierlist_reactions').delete().eq('tierlist_id', tierlistId).eq('user_id', userSession.user.id);
    return;
  }

  // Nueva reacción o cambiar de emoji
  S.reactions[tierlistId] = [...list.filter(r => r.user_id !== userSession.user.id), { emoji, user_id: userSession.user.id }];
  render();

  const { error } = await sbClient.from('tierlist_reactions')
    .upsert({ tierlist_id: tierlistId, user_id: userSession.user.id, emoji }, { onConflict: 'tierlist_id,user_id' });

  if (!error && !mine && ownerUserId) {
    createNotification(ownerUserId, 'reaction', { tierlistId, message: `ha reaccionado con ${emoji} a tu tierlist.` });
  }
}

function ReactionsBar(tierlistId, ownerUserId) {
  const list = S.reactions[tierlistId];
  if (list === undefined) { fetchReactions(tierlistId); }

  const bar = h('div', { class: 'reactions-bar' });
  const counts = {};
  (list || []).forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
  const mine = userSession && (list || []).find(r => r.user_id === userSession.user.id);

  REACTION_EMOJIS.forEach(emoji => {
    const count = counts[emoji] || 0;
    const active = mine && mine.emoji === emoji;
    bar.appendChild(h('button', {
      class: 'reaction-pill' + (active ? ' reaction-active' : ''),
      disabled: !userSession,
      title: userSession ? '' : 'Inicia sesión para reaccionar',
      onclick: () => toggleReaction(tierlistId, emoji, ownerUserId)
    }, h('span', {}, emoji), count > 0 ? h('span', { class: 'reaction-count' }, count + '') : null));
  });
  return bar;
}
