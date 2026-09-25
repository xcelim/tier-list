// Helpers para gestionar el perfil activo (usuario actualmente logueado/local).

// ============ PROFILE HELPERS ============
function getProfile(id){return S.profiles.find(p=>p.id===(id||S.activeProfile))}
function activeProfile(){return getProfile(S.activeProfile)}
function getProfileTLs(){const p=activeProfile();return p?p.tls:[];}
function getTLfromProfile(id){return getProfileTLs().find(t=>t.id===id)}
function getCurrentTL(){return S.cid?getTLfromProfile(S.cid):null}

