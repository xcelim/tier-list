// Sistema de arrastrar y soltar (drag & drop) con imagen flotante suave,
// compatible con ratón (PC) y táctil (móvil).

// ============ DRAG (smooth floating image) ============
let DG=null,DS=null,DGidx=-1,dragFloatEl=null;
let scrollDir=0,scrollInt=null;
let _md=false,_mdMoved=false,_mdX=0,_mdY=0,_mdImg='',_lastZoneKey='';
let _pointerId=null, _lpT=null;

function updateScroll(){if(scrollDir!==0)window.scrollBy(0,scrollDir*60);}
function createFloat(imgSrc){
 removeFloat();
 dragFloatEl=document.createElement('div');
 dragFloatEl.className='drag-float';
 const im=document.createElement('img');im.src=imgSrc;
 dragFloatEl.appendChild(im);document.body.appendChild(dragFloatEl);
}
function removeFloat(){
 if(dragFloatEl){dragFloatEl.remove();dragFloatEl=null;}
 if(scrollInt){clearInterval(scrollInt);scrollInt=null;}
 scrollDir=0;
}
function _posFloat(cx,cy){
 if(!dragFloatEl)return;
 dragFloatEl.style.left=(cx-51)+'px';
 dragFloatEl.style.top=(cy-81)+'px';
 const th=100,wh=window.innerHeight;
 scrollDir=cy<th?-1:cy>wh-th?1:0;
 if(scrollDir&&!scrollInt)scrollInt=setInterval(updateScroll,16);
 else if(!scrollDir&&scrollInt){clearInterval(scrollInt);scrollInt=null;}
}
function _getDropZone(cx,cy){
 if(dragFloatEl)dragFloatEl.style.visibility='hidden';
 const el=document.elementFromPoint(cx,cy);
 if(dragFloatEl)dragFloatEl.style.visibility='';
 if(!el)return null;
 if(el.closest('#pdrop'))return{type:'pool'};
 const trow=el.closest('.trow');
 if(trow){
 const tid=trow.id.replace(/^t/,'');
 const ce=trow.querySelector('.tchars');
 if(!ce)return{type:'tier',tid,idx:0};
 const cards=Array.from(ce.querySelectorAll('.tc:not(.is-dragging)'));
 
 // 1. Si el cursor está directamente sobre el hueco (placeholder), mantenemos la posición para evitar rebotes o bloqueos
 if(el.id==='drop-ph'||el.closest('#drop-ph')){
 if(_lastZoneKey&&_lastZoneKey.startsWith('tier'+tid)){
 const prevIdx=parseInt(_lastZoneKey.replace('tier'+tid,''),10);
 if(!isNaN(prevIdx))return{type:'tier',tid,idx:prevIdx};
 }
 }
 
 // 2. Si el cursor está sobre una carta real, decidimos si va antes o después según su mitad exacta
 const hoveredCard=el.closest('.tc:not(.is-dragging)');
 if(hoveredCard){
 const cardIdx=cards.indexOf(hoveredCard);
 if(cardIdx!==-1){
 const r=hoveredCard.getBoundingClientRect();
 if(cx<r.left+r.width/2) return{type:'tier',tid,idx:cardIdx};
 else return{type:'tier',tid,idx:cardIdx+1};
 }
 }
 
 // 3. Fallback/Respaldo ultra preciso para cuando el cursor está en zonas vacías o márgenes de la fila
 let idx=cards.length;
 for(let i=0;i<cards.length;i++){
 const r=cards[i].getBoundingClientRect();
 if(cy<r.top){idx=i;break;}
 if(cy<r.bottom&&cx<r.left+r.width/2){idx=i;break;}
 }
 return{type:'tier',tid,idx};
 }
 return null;
}
function _updatePlaceholder(zone){
 // Limpiar highlights
 document.querySelectorAll('.trow.dov').forEach(e=>e.classList.remove('dov'));
 document.getElementById('pdrop')?.classList.remove('dov');
 
 if(!zone){const ph=document.getElementById('drop-ph');if(ph)ph.remove();return;}
 if(zone.type==='pool'){
 const ph=document.getElementById('drop-ph');if(ph)ph.remove();
 document.getElementById('pdrop')?.classList.add('dov');
 return;
 }
 if(zone.type==='tier'){
 document.getElementById('t'+zone.tid)?.classList.add('dov');
 const ce=document.getElementById('t'+zone.tid)?.querySelector('.tchars');
 if(!ce){const ph=document.getElementById('drop-ph');if(ph)ph.remove();return;}
 
 // Evitar calcular si estamos exactamente sobre la misma posición original
 if(DS===zone.tid && zone.idx===DGidx){
 const ph=document.getElementById('drop-ph');if(ph)ph.remove();
 return;
 }
 
 // 1. Capturar posiciones reales exclusivamente de las cartas visibles (no la que arrastramos)
 const freshCards=Array.from(ce.querySelectorAll('.tc')).filter(c => c.dataset.cid !== DG && !c.classList.contains('is-dragging'));
 const snapshots=freshCards.map(c=>({el:c,rect:c.getBoundingClientRect()}));
 
 // 2. Quitar placeholder viejo
 const oldph=document.getElementById('drop-ph');if(oldph)oldph.remove();
 
 // 3. Insertar nuevo placeholder
 const newph=document.createElement('div');
 newph.id='drop-ph';newph.className='drop-placeholder';
 
 if(zone.idx>=freshCards.length) ce.appendChild(newph);
 else ce.insertBefore(newph,freshCards[zone.idx]);
 
 // 4. FLIP: Animación suave sin saltos dobles
 snapshots.forEach(({el,rect:oldRect})=>{
 const newRect=el.getBoundingClientRect();
 const dx=oldRect.left-newRect.left;
 const dy=oldRect.top-newRect.top;
 if(dx||dy){
 el.style.transition='none';
 el.style.transform=`translate(${dx}px,${dy}px)`;
 el.offsetHeight; // Forzar reflow
 el.style.transition='transform .25s cubic-bezier(0.2, 0, 0.2, 1)';
 el.style.transform='';
 }
 });
 }
}
function _executeDrop(zone){
 if(!zone||!DG)return;
 const tl=S.workingTL;
 if(zone.type==='pool'){
 if(DS==='pool')return;
 const s=tl.tiers.find(t=>t.id===DS);
 if(s)s.chars=s.chars.filter(x=>x!==DG);
 if(!tl.pool.includes(DG))tl.pool.push(DG);
 markUnsaved();
 }else if(zone.type==='tier'){
 if(DS==='pool')tl.pool=tl.pool.filter(x=>x!==DG);
 else{const s=tl.tiers.find(t=>t.id===DS);if(s)s.chars=s.chars.filter(x=>x!==DG);}
 const dest=tl.tiers.find(t=>t.id===zone.tid);
 if(dest){
 dest.chars=dest.chars.filter(x=>x!==DG);
 if(typeof zone.idx==='number'&&zone.idx>=0)dest.chars.splice(zone.idx,0,DG);
 else dest.chars.push(DG);
 }
 markUnsaved();
 }
}
function _dragCleanup(){
 document.body.style.userSelect='';
 DG=null;DS=null;DGidx=-1;_md=false;_mdMoved=false;_lastZoneKey='';
 removeFloat();lastZone=null;
 const ph=document.getElementById('drop-ph');if(ph)ph.remove();
 document.querySelectorAll('.is-dragging').forEach(el=>el.classList.remove('is-dragging'));
 document.querySelectorAll('.tc').forEach(el=>el.style.transform='');
 document.querySelectorAll('.dov').forEach(el=>el.classList.remove('dov'));
}

document.addEventListener('pointermove',e=>{
 if (_pointerId !== null && e.pointerId !== _pointerId) { return; }
 if(_lpT && !_md){
 if(Math.sqrt((e.clientX-_mdX)**2+(e.clientY-_mdY)**2)>10){
 clearTimeout(_lpT);
 _lpT=null;
 }
 }
 if(!_md)return;
 if(!_mdMoved){
 if(Math.sqrt((e.clientX-_mdX)**2+(e.clientY-_mdY)**2)<5)return;
 _mdMoved=true;
 document.body.style.userSelect='none';
 createFloat(_mdImg);
 _posFloat(e.clientX,e.clientY);
 document.querySelectorAll('.tc,.pc').forEach(el=>{
 if(el.dataset.cid===DG)el.classList.add('is-dragging');
 });
 }
 _posFloat(e.clientX,e.clientY);
 const zone=_getDropZone(e.clientX,e.clientY);
 const key=zone?(zone.type+(zone.tid||'')+(zone.idx??'')):'';
 if(key!==_lastZoneKey){_lastZoneKey=key;_updatePlaceholder(zone);}
});

document.addEventListener('pointerup',e=>{
 if(_lpT){clearTimeout(_lpT); _lpT=null;}
 if (_pointerId !== null && e.target.hasPointerCapture && e.target.hasPointerCapture(_pointerId)) {
 e.target.releasePointerCapture(_pointerId);
 }
 _pointerId = null;
 if(!_md || !_mdMoved){_dragCleanup();return;}
 const zone=_getDropZone(e.clientX,e.clientY);
 _executeDrop(zone);
 _dragCleanup();
},{passive:true});

function dgPointerDown(e,id,src,idx,imgSrc){
 if(e.button!==0)return;
 DG=id;DS=src;DGidx=idx;
 _md=true;_mdMoved=false;
 _mdX=e.clientX;_mdY=e.clientY;
 _mdImg=imgSrc||'';
 _pointerId = e.pointerId; // <-- GUARDAR EL ID DEL PUNTERO CORRECTAMENTE
 if(e.target.setPointerCapture) { e.target.setPointerCapture(e.pointerId); }
}

function dgstart(e){e.preventDefault();}
function dgend(){}
function tover(e){e.preventDefault();}
function tdrop(e){e.preventDefault();}
function pover(e){e.preventDefault();}
function pdrop(e){e.preventDefault();}

function tover(e,tid){
  e.preventDefault();
  document.querySelectorAll('.trow.dov').forEach(el=>el.classList.remove('dov'));
  document.getElementById('t'+tid)?.classList.add('dov');
}
function tdrop(e,tid,toIdx){
  e.preventDefault();if(!DG)return;
  const tl=S.workingTL;
  if(DS==='pool')tl.pool=tl.pool.filter(x=>x!==DG);
  else{const s=tl.tiers.find(t=>t.id===DS);if(s)s.chars=s.chars.filter(x=>x!==DG);}
  const dest=tl.tiers.find(t=>t.id===tid);
  if(dest){
    dest.chars=dest.chars.filter(x=>x!==DG);
    if(typeof toIdx==='number'&&toIdx>=0)dest.chars.splice(toIdx,0,DG);
    else dest.chars.push(DG);
  }
  markUnsaved();
}
function pover(e){e.preventDefault();document.getElementById('pdrop')?.classList.add('dov');}
function pdrop(e){
  e.preventDefault();if(!DG||DS==='pool')return;
  const tl=S.workingTL;
  const s=tl.tiers.find(t=>t.id===DS);
  if(s)s.chars=s.chars.filter(x=>x!==DG);
  if(!tl.pool.includes(DG))tl.pool.push(DG);
  markUnsaved();
}

