// Integración con la API pública de AniList para buscar animes/personajes.

// ============ ANILIST SEARCH ============
async function searchAniList(query){
  if(!query||query.length<2)return[];
  const q=`query($s:String){Page(perPage:12){media(search:$s,type:ANIME){id title{romaji english native}coverImage{medium}startDate{year}}}}`;
  try{
    const r=await fetch('https://graphql.anilist.co',{method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({query:q,variables:{s:query}})});
    const d=await r.json();
    return(d.data?.Page?.media||[]).map(m=>({
      id:m.id,
      title:m.title.romaji||m.title.english||m.title.native||'',
      english:m.title.english||'',
      native:m.title.native||'',
      cover:m.coverImage?.medium||'',
      year:m.startDate?.year||''
    }));
  }catch(e){return[];}
}

// Resolve alias
function resolveAlias(q){
  const low=q.toLowerCase().trim();
  if(ALIASES[low])return ALIASES[low];
  // partial alias match
  for(const[k,v]of Object.entries(ALIASES)){if(low.includes(k)||k.includes(low))return v;}
  return q;
}

