// Comentarios en una tierlist — SOLO se muestran en modo Visor (Viewer),
// tal y como se pidió. Requiere la tabla "tierlist_comments" (incluida en
// supabase-schema.sql, en la raíz del proyecto).
//
// IMPORTANTE — se guardan por "ranking_id" (el ranking personal de cada
// usuario, id único de la tabla user_rankings), NO por "tierlist_id" (la
// plantilla compartida, que es la MISMA para todo el mundo que use, por
// ejemplo, la tierlist "Waifus" por defecto). Guardarlos por tierlist_id
// hacía que un comentario en la tierlist de un amigo apareciera también en
// la tuya, porque ambos comparten la misma plantilla — ese era el bug.

async function fetchComments(rankingId) {
  if (!sbClient || !rankingId) return;
  try {
    const { data, error } = await sbClient.from('tierlist_comments')
      .select('*, author:profiles!user_id(name, avatar_url)')
      .eq('ranking_id', rankingId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    S.comments[rankingId] = data || [];
  } catch (e) {
    S.comments[rankingId] = null; // null = "no disponible" (distinto de [] = "sin comentarios todavía")
    console.warn('[comments] no disponibles todavía:', e.message || e);
  }
  render();
}

async function postComment(rankingId, ownerUserId) {
  const text = (S.commentDraft || '').trim();
  if (!text || !userSession || !sbClient) return;
  if (text.length > 500) { toast('Máximo 500 caracteres', 'err'); return; }

  const { data, error } = await sbClient.from('tierlist_comments')
    .insert({ ranking_id: rankingId, user_id: userSession.user.id, content: text })
    .select('*, author:profiles!user_id(name, avatar_url)')
    .single();

  if (error) { toast('No se pudo publicar el comentario: ' + error.message, 'err'); return; }

  if (!Array.isArray(S.comments[rankingId])) S.comments[rankingId] = [];
  S.comments[rankingId].push(data);
  S.commentDraft = '';
  render();

  if (ownerUserId) {
    createNotification(ownerUserId, 'comment', { message: 'ha comentado tu tierlist.' });
  }
}

async function deleteComment(commentId, rankingId) {
  if (!sbClient) return;
  if (Array.isArray(S.comments[rankingId])) {
    S.comments[rankingId] = S.comments[rankingId].filter(c => c.id !== commentId);
    render();
  }
  await sbClient.from('tierlist_comments').delete().eq('id', commentId);
}

// Construye el bloque de comentarios (lista + caja de texto) para pegar al
// final de Viewer(). No se usa en ningún otro sitio de la app.
function CommentsSection(rankingId, ownerUserId) {
  const box = h('div', { class: 'comments-box' });
  box.appendChild(h('div', { class: 'comments-title' }, '💬 Comentarios'));

  const list = S.comments[rankingId];

  if (list === undefined) {
    // Todavía no se ha pedido — la disparamos una vez y mostramos "cargando"
    fetchComments(rankingId);
    box.appendChild(h('div', { class: 'comments-empty' }, 'Cargando comentarios...'));
  } else if (list === null) {
    box.appendChild(h('div', { class: 'comments-empty' }, 'Los comentarios no están disponibles todavía en este proyecto.'));
  } else if (list.length === 0) {
    box.appendChild(h('div', { class: 'comments-empty' }, 'Sé el primero en comentar esta tierlist.'));
  } else {
    const listEl = h('div', { class: 'comments-list' });
    list.forEach(c => {
      const mine = userSession && c.user_id === userSession.user.id;
      const item = h('div', { class: 'comment-item' });
      item.appendChild(h('img', {
        class: 'comment-avatar',
        src: c.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.author?.name || '?')}`
      }));
      const body = h('div', { class: 'comment-body' });
      body.appendChild(h('div', { class: 'comment-head' },
        h('strong', {}, c.author?.name || 'Usuario'),
        h('span', { class: 'comment-time' }, timeAgo(c.created_at))
      ));
      body.appendChild(h('div', { class: 'comment-text' }, c.content));
      item.appendChild(body);
      if (mine) {
        item.appendChild(h('button', {
          class: 'comment-del', title: 'Eliminar',
          onclick: () => deleteComment(c.id, rankingId)
        }, '✕'));
      }
      listEl.appendChild(item);
    });
    box.appendChild(listEl);
  }

  if (userSession) {
    const composer = h('div', { class: 'comment-composer' });
    composer.appendChild(h('textarea', {
      class: 'comment-input', placeholder: 'Escribe un comentario...', maxlength: 500,
      value: S.commentDraft || '',
      oninput: (e) => { S.commentDraft = e.target.value; }
    }));
    composer.appendChild(h('button', {
      class: 'btn bp bsm', onclick: () => postComment(rankingId, ownerUserId)
    }, 'Comentar'));
    box.appendChild(composer);
  } else {
    box.appendChild(h('div', { class: 'comments-empty' }, 'Inicia sesión para comentar.'));
  }

  return box;
}

// Pequeño helper de fecha relativa ("hace 3 min") — self-contained, sin
// dependencias, así que no puede romper nada de lo ya existente.
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'hace instantes';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}
