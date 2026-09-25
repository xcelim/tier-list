// Copia de trabajo del editor: permite editar una tierlist sin tocar los datos
// guardados hasta confirmar los cambios (para poder cancelar sin perder nada).

// ============ WORKING COPY (editor) ============
function openEditor(tlid){
  const tl=getTLfromProfile(tlid);
  if(!tl)return;
  S.cid=tlid;
  S.workingTL=JSON.parse(JSON.stringify(tl)); // deep copy
  S.hasUnsaved=false;
  S.page='editor';S.q='';S.poolPage=0;S.poolSort='default';S.poolSortDir='asc';
  setRoute('editor',tlid);
  syncFromSupabase();
}
async function saveEditorChanges(){
  if(!S.workingTL||!S.cid)return;
  const p=activeProfile();if(!p)return;
  const idx=p.tls.findIndex(t=>t.id===S.cid);
  if(idx<0)return;

  S.workingTL.updatedAt=Date.now();
  p.tls[idx]=JSON.parse(JSON.stringify(S.workingTL));
  saveProfiles(); // Cache local

  if (userSession && sbClient) {
    toast('Sincronizando con la nube...', 'info');
    try {
      // 1. Actualizamos la plantilla comunitaria (ahora permitido para todos los logueados via RLS)
      await sbClient.from('tierlists').update({
        title: S.workingTL.title,
        tiers_config: S.workingTL.tiers.map(t => ({ id: t.id, label: t.label, color: t.color })),
        updated_at: new Date()
      }).eq('id', S.cid);

      // 2. Guardamos TU ranking personal con TU estructura (esto lo hace universal en tus dispositivos)
      await sbClient.from('user_rankings').upsert({
        user_id: userSession.user.id,
        tierlist_id: S.cid,
        tiers_data: S.workingTL.tiers.map(t => ({ id: t.id, label: t.label, color: t.color, chars: t.chars })),
        pool_data: S.workingTL.pool,
        updated_at: new Date()
      }, { onConflict: 'user_id, tierlist_id' });

      S.hasUnsaved=false;
      toast('\u2713 Sincronizado en todos tus dispositivos','ok');
    } catch(e) {
      console.error(e);
      toast('Error de red, se guard\xf3 solo en este navegador','err');
    }
  } else {
    S.hasUnsaved=false;
    toast('\u2713 Guardado','ok');
  }
  render();
}
function discardChanges(){
  S.workingTL=null;S.hasUnsaved=false;S.cid=null;S.page='home';setRoute('home');render();
}
function markUnsaved(){S.hasUnsaved=true;render();}

