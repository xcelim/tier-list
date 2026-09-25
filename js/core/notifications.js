// Sistema de notificaciones genérico (más allá de las solicitudes de
// amistad, que ya se gestionaban aparte en nav.js con S.pendingRequests).
// Cubre cosas como "X ha comentado tu tierlist".
//
// Requiere la tabla "notifications" — está en supabase-schema.sql, en la
// raíz del proyecto. Si esa tabla no existe todavía en tu Supabase, estas
// funciones simplemente no traen nada (fallan en silencio), no rompen la
// app.

async function fetchAppNotifications() {
  if (!userSession || !sbClient) return;
  try {
    const { data, error } = await sbClient.from('notifications')
      .select('*, actor:profiles!actor_id(name, avatar_url)')
      .eq('user_id', userSession.user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    S.appNotifications = data || [];
    render();
  } catch (e) {
    // Tabla todavía no creada u otro problema — no interrumpimos al usuario.
    console.warn('[notifications] no disponibles todavía:', e.message || e);
  }
}

async function markNotificationRead(id) {
  if (!sbClient) return;
  const n = (S.appNotifications || []).find(x => x.id === id);
  if (n) n.read = true;
  render();
  await sbClient.from('notifications').update({ read: true }).eq('id', id);
}

async function markAllNotificationsRead() {
  if (!userSession || !sbClient) return;
  (S.appNotifications || []).forEach(n => n.read = true);
  render();
  await sbClient.from('notifications').update({ read: true }).eq('user_id', userSession.user.id).eq('read', false);
}

// Crea una notificación para otro usuario (la usa, por ejemplo, el sistema
// de comentarios cuando alguien comenta tu tierlist).
async function createNotification(targetUserId, type, extra) {
  if (!sbClient || !userSession || targetUserId === userSession.user.id) return; // no te notificas a ti mismo
  try {
    await sbClient.from('notifications').insert({
      user_id: targetUserId,
      actor_id: userSession.user.id,
      type,
      tierlist_id: extra && extra.tierlistId || null,
      message: extra && extra.message || null
    });
  } catch (e) { /* silencioso: si la tabla no existe aún, no pasa nada */ }
}

function unreadAppNotifCount() {
  return (S.appNotifications || []).filter(n => !n.read).length;
}
