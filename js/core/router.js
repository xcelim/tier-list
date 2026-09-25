// Enrutado basado en hash (#/ruta) compatible con GitHub Pages / hosting estático.

// ============ ROUTING (hash-based para GitHub Pages) ============
function getRouteFromHash(){
  // Ignorar si el hash es del OAuth de Supabase (contiene access_token)
  if(location.hash.includes('access_token'))return{page:'home',tlId:null};
  const hash=location.hash.replace('#','').replace(/^\//,'');
  if(!hash||hash==='home')return{page:'home',tlId:null};
  // Formato: editor/<id>
  const m=hash.match(/^editor\/(.+)$/);
  if(m)return{page:'editor',tlId:decodeURIComponent(m[1])};
  return{page:'home',tlId:null};
}
function setRoute(page,tlId){
  if(page==='home'){
    history.pushState(null,'',location.pathname+'#home');
    document.title='AnimeTier';
  } else if(page==='editor'&&tlId){
    history.pushState(null,'',location.pathname+'#editor/'+encodeURIComponent(tlId));
    const p=activeProfile();
    const tl=p&&p.tls.find(t=>t.id===tlId);
    if(tl) document.title='AnimeTier – '+tl.title;
  }
}
window.addEventListener('popstate',()=>{
  const{page,tlId}=getRouteFromHash();
  if(page==='editor'&&tlId){
    const p=activeProfile();
    const tl=p&&p.tls.find(t=>t.id===tlId);
    if(tl){S.page='editor';S.cid=tlId;S.workingTL=JSON.parse(JSON.stringify(tl));S.hasUnsaved=false;}
    else{S.page='home';S.cid=null;S.workingTL=null;}
  }else{S.page='home';S.cid=null;S.workingTL=null;}
  render();
});

async function fetchAllUsers() {
  if (!sbClient) return; 
  const { data: profiles } = await sbClient.from('profiles').select('*').order('name');
  const { data: rankings } = await sbClient.from('user_rankings').select('user_id');
  const { data: friendships } = await sbClient.from('friendships').select('*');
  
  if (profiles) {
    S.allUsers = profiles.map(u => {
      const tlCount = (rankings || []).filter(r => r.user_id === u.id).length;
      const userFriends = (friendships || []).filter(f => f.status === 'accepted' && (f.user_id === u.id || f.friend_id === u.id));
      
      let relStatus = 'none', relId = null;
      if(userSession) {
        const rel = (friendships || []).find(f => 
          (f.user_id === userSession.user.id && f.friend_id === u.id) || 
          (f.friend_id === userSession.user.id && f.user_id === u.id)
        );
        if(rel) {
          relId = rel.id;
          if(rel.status === 'accepted') relStatus = 'accepted';
          else if(rel.user_id === userSession.user.id) relStatus = 'pending_sent';
          else relStatus = 'pending_received';
        }
      }
      return { ...u, tl_count: tlCount, friend_count: userFriends.length, relStatus, relId };
    });
    render();
  }
}

async function updateProfileField(field, value) {
  if (!userSession || !sbClient) return;
  const { error } = await sbClient.from('profiles').update({ [field]: value }).eq('id', userSession.user.id);
  if (!error) {
    if (currentUserProfile) currentUserProfile[field] = value;
    const localP = activeProfile();
    if (localP) localP[field] = value;
    saveProfiles(); toast("Perfil actualizado"); render();
  }
}

