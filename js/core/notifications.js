// Sistema de notificaciones genérico (más allá de las solicitudes de
// amistad, que ya se gestionaban aparte en nav.js con S.pendingRequests).
// Cubre cosas como "X ha comentado tu tierlist".
//
// Requiere la tabla "notifications" — está en supabase-schema.sql, en la
// raíz del proyecto. Si esa tabla no existe todavía en tu Supabase, estas
// funciones simplemente no traen nada (fallan en silencio), no rompen la
// app.

// FIX (Ronda 18): "quiet" (opcional) evita el render() interno — lo usa el
// click de la campana (js/views/nav.js) para esperar a que ESTA función Y
// fetchNotifications() (solicitudes de amistad) terminen las DOS antes de
// renderizar una sola vez. Antes cada una llamaba a su propio render() al
// terminar, y como no siempre resuelven en el mismo instante, el panel
// (que ahora vive fuera de <nav>, ver Ronda 17) se destruía y recreaba dos
// veces seguidas — un parpadeo visible, el mismo tipo de bug que hubo en su
// día con el chat por duplicar renders/suscripciones.
async function fetchAppNotifications(quiet) {
  if (!userSession || !sbClient) return;
  try {
    const { data, error } = await sbClient.from('notifications')
      .select('*, actor:profiles!actor_id(name, avatar_url)')
      .eq('user_id', userSession.user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    S.appNotifications = data || [];
    // FIX (Ronda 36 — pedido explícito: poder borrar las notificaciones,
    // "con una X o algo, o que se eliminen solas como más óptimo
    // consideres"): además del botón de borrar manual (ver
    // deleteNotification/deleteReadNotifications más abajo), de paso se
    // limpian solas en segundo plano las que ya llevan tiempo leídas — así
    // el panel no se llena para siempre de notificaciones viejas aunque
    // nunca se toque el botón de borrar a mano. Silencioso y sin bloquear:
    // si falla (o la tabla es antigua y no tiene estas columnas todavía),
    // no pasa nada, simplemente no se limpia esta vez.
    pruneOldReadNotifications();
    if (!quiet) render();
  } catch (e) {
    // Tabla todavía no creada u otro problema — no interrumpimos al usuario.
    console.warn('[notifications] no disponibles todavía:', e.message || e);
  }
}

// Borra UNA notificación (botón "✕" en cada fila del panel — ver nav.js).
// Se quita primero de la pantalla y luego se borra en la nube; si la
// petición de red fallara, no merece la pena devolverla a la lista (es solo
// una notificación, no un dato importante que se pueda perder de verdad).
async function deleteNotification(id) {
  S.appNotifications = (S.appNotifications || []).filter(n => n.id !== id);
  render();
  if (!sbClient) return;
  try { await sbClient.from('notifications').delete().eq('id', id); }
  catch (e) { console.warn('[notifications] no se pudo borrar:', e.message || e); }
}

// Borra de golpe todas las YA LEÍDAS (botón "Borrar leídas" del panel) — las
// no leídas se dejan, para no perder algo que todavía no se ha visto.
async function deleteReadNotifications() {
  if (!userSession || !sbClient) return;
  const idsToDelete = (S.appNotifications || []).filter(n => n.read).map(n => n.id);
  S.appNotifications = (S.appNotifications || []).filter(n => !n.read);
  render();
  if (!idsToDelete.length) return;
  try { await sbClient.from('notifications').delete().in('id', idsToDelete); }
  catch (e) { console.warn('[notifications] no se pudieron borrar las leídas:', e.message || e); }
}

// FIX (Ronda 36): limpieza automática — cualquier notificación ya leída con
// más de 30 días se borra sola, sin que el usuario tenga que acordarse de
// hacerlo. Se ejecuta en segundo plano cada vez que se abre el panel
// (fetchAppNotifications, arriba), nunca bloquea ni avisa si falla.
const NOTIF_AUTO_DELETE_READ_AFTER_DAYS = 30;
async function pruneOldReadNotifications() {
  if (!userSession || !sbClient) return;
  const cutoff = Date.now() - NOTIF_AUTO_DELETE_READ_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const stale = (S.appNotifications || []).filter(n => n.read && new Date(n.created_at).getTime() < cutoff);
  if (!stale.length) return;
  const staleIds = stale.map(n => n.id);
  S.appNotifications = (S.appNotifications || []).filter(n => !staleIds.includes(n.id));
  try { await sbClient.from('notifications').delete().in('id', staleIds); }
  catch (e) { console.warn('[notifications] no se pudo limpiar automáticamente:', e.message || e); }
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
