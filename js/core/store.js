/**
 * Almacenamiento local (LocalStorage DB) y Estado Global de la App (S)
 */
const DB = {
  s(k, v) { try { localStorage.setItem('at4_' + k, JSON.stringify(v)); } catch (e) {} },
  l(k, d) { try { const v = localStorage.getItem('at4_' + k); return v != null ? JSON.parse(v) : d; } catch (e) { return d; } },
  del(k) { try { localStorage.removeItem('at4_' + k); } catch (e) {} }
};

let S = {
  page: 'home',
  prevPage: null,
  profiles: DB.l('profiles', null),
  activeProfile: DB.l('activeProfile', null),
  allUsers: [],
  viewingUser: null,
  viewingRank: null,
  userSearch: '',
  profileMenu: null,
  notifMenu: false,
  pendingRequests: [],
  modal: null,
  md: {},
  q: '',
  poolPage: 0,
  etitle: false,
  cid: null,
  workingTL: null,
  profileDraft: null,
  profileUnsaved: false,
  chats: [],
  totalUnread: 0,
  chatModalPosition: { x: null, y: null },
  activeChat: null,
  messages: [],
  hasUnsaved: false,
  saveT: null,
};

if (!S.profiles) S.profiles = [];
if (!S.activeProfile) S.activeProfile = null;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function sanFolder(n) {
  return (n || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/ +/g, '_').slice(0, 40) || 'tierlist';
}