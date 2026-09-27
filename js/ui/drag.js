// Sistema de arrastrar y soltar (drag & drop) con imagen flotante suave,
// compatible con ratón (PC) y táctil (móvil).

// ============ DRAG (smooth floating image) ============
let DG=null,DS=null,DGidx=-1,dragFloatEl=null;
let scrollDir=0,scrollInt=null;
let _md=false,_mdMoved=false,_mdX=0,_mdY=0,_mdImg='',_lastZoneKey='';
let _pointerId=null, _lpT=null;
// "Stepper" del hueco: si el ratón se mueve rápido y el índice de destino
// salta más de una posición de golpe, en vez de mover 2+ cartas a la vez
// en un solo fotograma (lo que se ve como si "se movieran juntas" sin
// separación entre ellas), recorremos el hueco UNA posición a la vez, cada
// pocos milisegundos, de modo que en cada paso solo se desplaza la carta
// justo contigua al hueco y se ve claramente el espacio abriéndose entre
// cada dos cartas según el hueco "viaja" hacia su destino final.
let _curTid=null,_curIdx=null,_targetTid=null,_targetIdx=null,_stepTimer=null;

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
 
 // 1. Si el cursor está directamente sobre el hueco (placeholder), mantenemos
 // la posición OBJETIVO (no la posición donde el hueco esté ahora mismo a
 // medio "viaje" con el stepper) — si no, mientras el ratón está encima del
 // hueco que todavía se está desplazando paso a paso, esto congelaría el
 // avance en la posición intermedia actual en vez de dejarlo llegar a su
 // destino real.
 if(el.id==='drop-ph'||el.closest('#drop-ph')){
 if(_targetTid===tid && _targetIdx!=null) return{type:'tier',tid,idx:_targetIdx};
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
function _updatePlaceholder(zone, preSnapshots){
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

 // NOTA: aquí antes había una comprobación de "no recalcular si el hueco
 // ya está en esa posición" basada en si EXISTÍA algún #drop-ph en el DOM
 // (sin importar en qué posición). El bug era que, si arrastrabas la carta
 // lejos y volvías exactamente a la casilla original, esa comprobación se
 // cumplía igual (sí había un hueco... pero en otro sitio) y la función se
 // salía sin mover nada — el hueco se quedaba clavado y las cartas de en
 // medio nunca volvían a su sitio ("vuelvo al hueco original y no se
 // recrea"). Se ha quitado: quien llama a _updatePlaceholder (_requestZone
 // y el stepper de abajo) ya se encarga de no llamarla salvo que el hueco
 // realmente tenga que moverse a una posición nueva, así que esta función
 // siempre puede confiar en que, si la llaman, es porque toca moverse.

 let snapshots, freshCards;

 if(preSnapshots){
 // EL FIX DE VERDAD: estas posiciones se midieron ANTES de que la carta
 // arrastrada se ocultara (.is-dragging la colapsa a width:0). Si en vez
 // de esto medimos aquí (después de ocultarla), el navegador ya habría
 // aplicado ese cambio de layout en el momento de leer
 // getBoundingClientRect() más abajo — así que "antes" y "después"
 // saldrían iguales, no habría nada que animar, y el salto ya habría
 // ocurrido sin animación. Por eso hay que medir ANTES de tocar nada y
 // pasar el resultado aquí.
 snapshots = preSnapshots;
 freshCards = preSnapshots.map(s=>s.el);
 } else {
 // 1. Asentar instantáneamente cualquier carta que todavía tuviera una
 // animación anterior a medias (pasa cuando se arrastra rápido y se
 // cruzan varias cartas en menos de lo que dura la animación, 250ms).
 const allCards=Array.from(ce.querySelectorAll('.tc'));
 let neededReflow=false;
 allCards.forEach(c=>{
 if(c.style.transform){ c.style.transition='none'; c.style.transform=''; neededReflow=true; }
 });
 if(neededReflow && allCards.length) allCards[0].offsetHeight; // forzar reflow una sola vez

 // 2. Capturar posiciones reales exclusivamente de las cartas visibles (no la que arrastramos)
 freshCards=allCards.filter(c => c.dataset.cid !== DG && !c.classList.contains('is-dragging'));
 snapshots=freshCards.map(c=>({el:c,rect:c.getBoundingClientRect()}));
 }

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
function _stopStepper(){ if(_stepTimer){clearInterval(_stepTimer);_stepTimer=null;} }
function _startStepper(){
 if(_stepTimer)return; // ya en marcha, dejamos que siga
 _stepTimer=setInterval(()=>{
 if(_targetTid===null || _curTid!==_targetTid){_stopStepper();return;}
 if(_curIdx===_targetIdx){_stopStepper();return;}
 _curIdx += (_curIdx<_targetIdx?1:-1);
 const z={type:'tier',tid:_curTid,idx:_curIdx};
 _lastZoneKey='tier'+_curTid+_curIdx;
 _updatePlaceholder(z);
 },90);
}
// Punto de entrada único para "pedir" que el hueco vaya a una zona nueva.
// En vez de saltar directo al índice calculado por la posición del cursor
// (lo que puede mover 2+ cartas de golpe si el ratón se movió rápido entre
// dos eventos), guardamos ese índice como "objetivo" y dejamos que
// _startStepper lo alcance recorriendo una posición a la vez.
function _requestZone(zone){
 if(!zone){
 _targetTid=null;_targetIdx=null;_stopStepper();
 if(_curTid!==null||_lastZoneKey){_curTid=null;_curIdx=null;_lastZoneKey='';_updatePlaceholder(null);}
 return;
 }
 if(zone.type==='pool'){
 _targetTid=null;_targetIdx=null;_stopStepper();
 if(_lastZoneKey!=='pool'){_curTid='pool';_curIdx=null;_lastZoneKey='pool';_updatePlaceholder(zone);}
 return;
 }
 // zone.type==='tier'
 _targetTid=zone.tid;_targetIdx=zone.idx;
 if(_curTid!==zone.tid){
 // Cambiar de fila/tier: no tiene sentido "recorrer" casillas de otra
 // fila, así que aquí sí saltamos directo a la posición inicial en la
 // fila nueva, y desde ahí el stepper continúa paso a paso.
 _curTid=zone.tid;_curIdx=zone.idx;
 _lastZoneKey='tier'+zone.tid+zone.idx;
 _updatePlaceholder(zone);
 return;
 }
 if(_curIdx===null)_curIdx=zone.idx;
 _startStepper();
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
 _stopStepper();_curTid=null;_curIdx=null;_targetTid=null;_targetIdx=null;
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

 // EL FIX DE VERDAD (por fin): medimos la posición de las cartas vecinas
 // ANTES de tocar nada. Si medimos después de añadir "is-dragging" (que
 // colapsa la carta arrastrada a width:0 al instante), el navegador ya
 // habrá aplicado ese cambio de layout en cuanto se lea
 // getBoundingClientRect() — así que "antes" y "después" saldrían
 // iguales y el salto ya habría pasado sin ninguna animación que lo
 // suavizara. Por eso el orden aquí importa: medir → luego ocultar.
 let preSnapshots = null;
 if(DS !== 'pool'){
 const ceForInitial = document.getElementById('t'+DS)?.querySelector('.tchars');
 if(ceForInitial){
 preSnapshots = Array.from(ceForInitial.querySelectorAll('.tc'))
 .filter(c => c.dataset.cid !== DG)
 .map(c => ({ el:c, rect:c.getBoundingClientRect() }));
 }
 }

 createFloat(_mdImg);
 _posFloat(e.clientX,e.clientY);
 document.querySelectorAll('.tc,.pc').forEach(el=>{
 if(el.dataset.cid===DG)el.classList.add('is-dragging');
 });
 const initialZone = DS==='pool' ? {type:'pool'} : {type:'tier', tid:DS, idx:DGidx};
 _lastZoneKey = initialZone.type+(initialZone.tid||'')+(initialZone.idx??'');
 _curTid = DS==='pool' ? 'pool' : DS;
 _curIdx = DS==='pool' ? null : DGidx;
 _targetTid = _curTid; _targetIdx = _curIdx;
 _updatePlaceholder(initialZone, preSnapshots);
 // Sin este "return", el mismo evento seguía ejecutándose y volvía a
 // calcular la zona con la posición YA MOVIDA del cursor (la que cruzó el
 // umbral de 5px), deshaciendo el hueco recién puesto al instante.
 // Esperamos al siguiente movimiento real del ratón.
 return;
 }
 _posFloat(e.clientX,e.clientY);
 const zone=_getDropZone(e.clientX,e.clientY);
 _requestZone(zone);
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

