// Sistema de arrastrar y soltar (drag & drop) con imagen flotante suave,
// compatible con ratón (PC) y táctil (móvil).

// ============ DRAG (smooth floating image) ============
let DG=null,DS=null,DGidx=-1,dragFloatEl=null;
let scrollDir=0,scrollInt=null;
let _md=false,_mdMoved=false,_mdX=0,_mdY=0,_mdImg='',_lastZoneKey='';
let _pointerId=null, _lpT=null, _heldEl=null, _touchLastY=0, _touchWaiting=false;
// FIX (Ronda 23 — "va to petao" / scroll "tosco"): variables para el
// scroll con inercia (momentum) tras un deslizón, y para agrupar los
// pointermove del drag ya armado en un único frame de pantalla (ver los
// FIX grandes junto a donde se usan, más abajo).
let _touchVelY=0, _touchLastT=0, _momentumRAF=null;
let _dragRAF=null, _pendingCX=0, _pendingCY=0;
// "Stepper" del hueco: si el ratón se mueve rápido y el índice de destino
// salta más de una posición de golpe, en vez de mover 2+ cartas a la vez
// en un solo fotograma (lo que se ve como si "se movieran juntas" sin
// separación entre ellas), recorremos el hueco UNA posición a la vez, cada
// pocos milisegundos, de modo que en cada paso solo se desplaza la carta
// justo contigua al hueco y se ve claramente el espacio abriéndose entre
// cada dos cartas según el hueco "viaja" hacia su destino final.
let _curTid=null,_curIdx=null,_targetTid=null,_targetIdx=null,_stepTimer=null;

function updateScroll(){if(scrollDir!==0)window.scrollBy(0,scrollDir*60);}
// FIX (Ronda 23 — "no puedo darle un deslizón y que avance mucho"): el
// scroll a mano de más abajo movía la página EXACTAMENTE lo que se movía
// el dedo y nada más, así que en cuanto se soltaba, se paraba en seco — un
// "deslizón" rápido (flick) no seguía avanzando ni se iba frenando poco a
// poco, como sí hace el scroll nativo del navegador. Esto reproduce ese
// mismo frenado suave: parte de la velocidad que llevaba el dedo justo
// antes de soltar (ver dónde se guarda _touchVelY, en el pointermove) y la
// va reduciendo fotograma a fotograma hasta que es imperceptible.
function _stopMomentumScroll(){ if(_momentumRAF){cancelAnimationFrame(_momentumRAF);_momentumRAF=null;} }
function _startMomentumScroll(v0){
 _stopMomentumScroll();
 let v=Math.max(-3,Math.min(3,v0)); // px/ms, con tope para deslizones anómalos
 let lastT=(typeof performance!=='undefined'?performance.now():Date.now());
 const FRICTION=0.998; // decae ~a la mitad cada ~350ms, similar al scroll nativo
 function step(){
 const now=(typeof performance!=='undefined'?performance.now():Date.now());
 const dt=now-lastT; lastT=now;
 const dx=v*dt;
 if(Math.abs(dx)>=0.5){
 window.scrollBy(0,dx);
 v*=Math.pow(FRICTION,dt);
 _momentumRAF=requestAnimationFrame(step);
 } else {
 _momentumRAF=null;
 }
 }
 _momentumRAF=requestAnimationFrame(step);
}
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
 // FIX (Ronda 23 — "al arrastrar personajes va to petao"): mover la carta
 // flotante con "style.left/top" obliga al navegador a recalcular el
 // LAYOUT en cada pointermove (puede disparar 60+ veces por segundo) antes
 // de poder pintar el siguiente fotograma — en un móvil de gama media/baja
 // eso se nota como tirones. "transform: translate3d(...)" en cambio solo
 // afecta a la fase de composición (la GPU mueve una capa ya pintada, sin
 // layout ni repintado), que es justo la técnica estándar para arrastrar
 // elementos con fluidez. El elemento sigue siendo position:fixed en 0,0
 // (ver .drag-float en css/style.css); aquí solo lo desplazamos.
 dragFloatEl.style.transform=`translate3d(${cx-51}px,${cy-81}px,0)`;
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
 el.style.transition='transform .16s cubic-bezier(0.2, 0, 0.2, 1)';
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
 // FIX (fluidez): a 90ms por paso, recorrer varias posiciones se sentía
 // lento/con retraso respecto a como se movía el ratón (antes saltaba
 // directo, pero eso era lo que hacía que 2+ cartas se movieran "en
 // bloque"). Bajar el intervalo mantiene el arreglo (el hueco se sigue
 // moviendo de una en una, nunca salta) pero encadena los pasos mucho
 // más rápido, así que para el ojo vuelve a sentirse tan fluido como
 // antes.
 },35);
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
 if(_dragRAF){cancelAnimationFrame(_dragRAF);_dragRAF=null;}
 removeFloat();lastZone=null;
 const ph=document.getElementById('drop-ph');if(ph)ph.remove();
 document.querySelectorAll('.is-dragging').forEach(el=>el.classList.remove('is-dragging'));
 document.querySelectorAll('.tc').forEach(el=>el.style.transform='');
 document.querySelectorAll('.dov').forEach(el=>el.classList.remove('dov'));
 // FIX (Ronda 21 — pulsación larga en móvil): si había un temporizador de
 // "mantener pulsado" pendiente, o una carta marcada visualmente como
 // "agarrada" (.drag-armed, ver dgPointerDown), hay que limpiarlos siempre
 // que se limpie el drag, venga de donde venga (soltar, cancelar, etc.).
 if(_lpT){clearTimeout(_lpT);_lpT=null;}
 if(_heldEl){_heldEl.classList.remove('drag-armed');_heldEl=null;}
 _touchWaiting=false;
}

// FIX (Ronda 21) — "se queda congelado en medio de la pantalla": en móvil,
// si mientras se arrastra el navegador decide de todas formas tomar el
// gesto para sí (por el motivo que sea: multitáctil, gesto del sistema...),
// dispara "pointercancel" en vez de "pointerup". Como antes NUNCA se
// escuchaba ese evento, _dragCleanup() no se ejecutaba nunca en ese caso:
// la imagen flotante del personaje se quedaba clavada exactamente donde
// estaba el dedo en ese instante, sin posibilidad de soltarla en ningún
// sitio. Con este listener, cualquier cancelación del navegador limpia el
// drag igual que si se hubiera soltado (sin ejecutar el drop, ya que no
// sabemos dónde quería soltarlo el usuario).
document.addEventListener('pointercancel',e=>{
 if (_pointerId !== null && e.pointerId !== _pointerId) { return; }
 if (_pointerId !== null && e.target.hasPointerCapture && e.target.hasPointerCapture(_pointerId)) {
 try{ e.target.releasePointerCapture(_pointerId); }catch(err){}
 }
 _pointerId = null;
 _dragCleanup();
});

document.addEventListener('pointermove',e=>{
 if (_pointerId !== null && e.pointerId !== _pointerId) { return; }
 if(_touchWaiting && !_md){
 // FIX (Ronda 22 — pedido explícito): ".tc,.pc" ahora llevan
 // "touch-action:none" (ver el porqué en el FIX grande de más abajo, en
 // el pointerdown), así que mientras se espera la pulsación larga el
 // navegador YA NO puede hacer scroll nativo por su cuenta aquí — si nos
 // quedábamos de brazos cruzados como antes, deslizar el dedo sin
 // esperar los 400ms no scrolleaba NADA (el bug que se estaba reportando:
 // "no puedo moverlas porque detecta que estoy scrolleando"). Mientras se
 // decide si esto es pulsación larga o un gesto de scroll, replicamos el
 // scroll a mano con el desplazamiento vertical del dedo, así que deslizar
 // sin mantener pulsado sigue moviendo la página con total normalidad.
 //
 // FIX (Ronda 23 — "se frena si scrolleo encima de una waifu"): esto antes
 // estaba condicionado a "_lpT && !_md", pero _lpT se pone a null en
 // cuanto el dedo supera los 10px de movimiento (justo abajo) — y eso pasa
 // casi en el primer pointermove de cualquier deslizamiento real. En el
 // SIGUIENTE pointermove, la condición ya era falsa (_lpT es null) y _md
 // seguía sin armarse, así que el código caía directo al "if(!_md)return;"
 // de más abajo: nada de preventDefault, nada de scroll — el scroll se
 // congelaba después de un solo "tick". La condición de si seguimos
 // reenviando el scroll a mano ("estamos esperando, sin soltar el dedo, y
 // sin haber armado el drag todavía": _touchWaiting && !_md) tiene que ser
 // independiente de si el temporizador de pulsación larga sigue vivo o no
 // — si no, cancelar ese temporizador (que solo decide si se arma el
 // drag) apaga también el scroll manual, que es un bug aparte.
 if(e.cancelable) e.preventDefault();
 const _scrollAmt = _touchLastY - e.clientY;
 window.scrollBy(0, _scrollAmt);
 _touchLastY = e.clientY;
 // FIX (Ronda 23 — "se scrollea muy tosco, se va frenando"): antes, este
 // scroll a mano solo movía la página EXACTAMENTE lo que se movía el dedo,
 // sin ninguna inercia al soltar — un scroll nativo real, en cambio, sigue
 // deslizándose y frenando poco a poco tras un "deslizón" rápido. Sin esa
 // inercia, cualquier deslizamiento se sentía corto y "tosco" comparado con
 // el scroll normal del navegador. Aquí guardamos la velocidad reciente
 // (px por milisegundo) para poder lanzar ese mismo efecto de frenado
 // suave en cuanto se levante el dedo (ver el "pointerup" más abajo).
 const _nowT=(typeof performance!=='undefined'?performance.now():Date.now());
 const _dt=_nowT-_touchLastT;
 if(_dt>0) _touchVelY=_scrollAmt/_dt;
 _touchLastT=_nowT;
 if(_lpT && Math.sqrt((e.clientX-_mdX)**2+(e.clientY-_mdY)**2)>10){
 // El dedo se movió antes de que se cumpliera la pulsación larga: el
 // usuario quería hacer scroll normal de la página, no arrastrar. Se
 // cancela el temporizador de armado (el scroll de arriba ya se está
 // encargando de mover la página a mano) pero seguimos reenviando el
 // scroll a mano en cada pointermove siguiente hasta que suelte el dedo
 // (_touchWaiting sigue en true: no se toca aquí).
 clearTimeout(_lpT);
 _lpT=null;
 if(_heldEl){_heldEl.classList.remove('drag-armed');_heldEl=null;}
 }
 return; // seguimos esperando a que se cumpla el tiempo de pulsación larga (o a que suelte el dedo)
 }
 if(!_md)return;
 // FIX (Ronda 21): una vez el drag está "armado" (ratón: al instante;
 // táctil: tras la pulsación larga), hay que impedir que el navegador
 // decida por su cuenta que esto es un gesto de scroll — si no, el drag se
 // interrumpe a medias (ver el pointercancel de arriba) y el personaje se
 // queda flotando congelado sin poder soltarlo. preventDefault() en un
 // pointermove NO puede deshacer un scroll que ya empezó, pero si se llama
 // desde el primer movimiento tras armar el drag (que es justo lo que pasa
 // aquí, gracias al temporizador) evita que el navegador llegue a
 // iniciarlo. No se toca nada para ratón/lápiz — preventDefault() en un
 // pointermove de ratón no tiene ningún efecto sobre el scroll.
 if(e.pointerType!=='mouse' && e.cancelable) e.preventDefault();
 if(!_mdMoved){
 if(Math.sqrt((e.clientX-_mdX)**2+(e.clientY-_mdY)**2)<5)return;
 _mdMoved=true;
 if(_heldEl){_heldEl.classList.remove('drag-armed');_heldEl=null;}
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
 // FIX (Ronda 23 — "va to petao"): un dispositivo táctil puede disparar
 // "pointermove" más veces por segundo de las que la pantalla puede pintar
 // fotogramas — sin agrupar esas llamadas, _posFloat/_getDropZone/
 // _requestZone (que leen y escriben el DOM) se ejecutaban varias veces
 // entre un fotograma y el siguiente, trabajo desperdiciado que competía
 // por el mismo hilo principal y se notaba como tirones. Aquí guardamos
 // solo la ÚLTIMA posición conocida y pedimos UN único requestAnimationFrame
 // que la aplique — como mucho una actualización por fotograma, igual que
 // hace el propio navegador al pintar.
 _pendingCX=e.clientX;_pendingCY=e.clientY;
 if(_dragRAF===null){
 _dragRAF=requestAnimationFrame(()=>{
 _dragRAF=null;
 _posFloat(_pendingCX,_pendingCY);
 const zone=_getDropZone(_pendingCX,_pendingCY);
 _requestZone(zone);
 });
 }
},{passive:false}); // FIX (Ronda 21): "passive:false" es imprescindible para que el preventDefault() de arriba tenga efecto de verdad (si no, el navegador lo ignora y sigue haciendo scroll)

document.addEventListener('pointerup',e=>{
 if(_lpT){clearTimeout(_lpT); _lpT=null;}
 const _wasWaiting=_touchWaiting;
 _touchWaiting=false;
 if (_pointerId !== null && e.target.hasPointerCapture && e.target.hasPointerCapture(_pointerId)) {
 e.target.releasePointerCapture(_pointerId);
 }
 _pointerId = null;
 if(!_md || !_mdMoved){
 // FIX (Ronda 23 — "se scrollea muy tosco, se va frenando"): si soltamos
 // el dedo justo después de haber estado reenviando scroll a mano (un
 // deslizamiento normal, sin llegar a agarrar ninguna carta) y llevaba
 // velocidad reciente de verdad, seguimos el scroll con inercia — igual
 // que un "deslizón" nativo, en vez de frenar en seco al soltar.
 if(e.pointerType==='touch' && _wasWaiting){
 const _nowT=(typeof performance!=='undefined'?performance.now():Date.now());
 if(_nowT-_touchLastT<120 && Math.abs(_touchVelY)>0.02) _startMomentumScroll(_touchVelY);
 }
 _dragCleanup();return;
 }
 const zone=_getDropZone(e.clientX,e.clientY);
 // FIX (Ronda 23 — "cuando la suelto tarda unos segundos en colocarse"):
 // _executeDrop() marca la tierlist como no guardada, lo que dispara un
 // render() completo (reconstruye TODA la pantalla desde cero — ver el FIX
 // grande en js/core/render.js). En una tierlist con muchos personajes eso
 // puede tardar un poco, y hasta ahora la carta flotante y el hueco se
 // quedaban a la vista, congelados, durante ese rato — pareciendo que el
 // drag se "atascaba". Quitamos ya, ANTES de disparar ese render, todo
 // rastro visual del arrastre (la carta flotante, el hueco, los
 // resaltados), así que al soltar el dedo la carta desaparece al instante
 // de donde estaba — el resto de _dragCleanup() (más barato) limpia el
 // resto del estado justo después, sin que se note.
 removeFloat();
 const _ph=document.getElementById('drop-ph'); if(_ph)_ph.remove();
 document.querySelectorAll('.dov').forEach(el=>el.classList.remove('dov'));
 _stopStepper();
 _executeDrop(zone);
 _dragCleanup();
},{passive:true});

function dgPointerDown(e,id,src,idx,imgSrc){
 if(e.button!==0)return;
 _stopMomentumScroll(); // agarrar algo (o tocar de nuevo) corta cualquier inercia de scroll en marcha
 DG=id;DS=src;DGidx=idx;
 _mdX=e.clientX;_mdY=e.clientY;
 _touchLastY=e.clientY;
 _touchVelY=0;_touchLastT=(typeof performance!=='undefined'?performance.now():Date.now());
 _mdImg=imgSrc||'';
 _pointerId = e.pointerId; // <-- GUARDAR EL ID DEL PUNTERO CORRECTAMENTE
 _heldEl = e.currentTarget || e.target;
 if(e.target.setPointerCapture) { e.target.setPointerCapture(e.pointerId); }

 // FIX (Ronda 21 — pedido explícito): en móvil, antes el drag se armaba al
 // instante con solo tocar (igual que con el ratón), así que era imposible
 // hacer scroll pasando el dedo por encima de un personaje: el primer
 // toque siempre "ganaba" para el drag. Ahora, en táctil, hay que MANTENER
 // PULSADO un momento para "agarrar" la carta (con una vibración corta de
 // confirmación) — si el dedo se mueve antes de eso, se entiende que
 // querías hacer scroll y no se arma nada (ver el guard correspondiente en
 // el listener de pointermove, más arriba). El ratón/lápiz no cambia: sigue
 // armándose al instante, exactamente como siempre.
 //
 // FIX (Ronda 22 — pedido explícito): ".tc,.pc" tenían "touch-action:auto"
 // en el CSS, pensado para que el navegador pudiera scrollear con
 // normalidad mientras se esperaba la pulsación larga. El problema es que
 // "touch-action" se decide UNA SOLA VEZ, en el instante justo de este
 // pointerdown/touchstart — no se puede cambiar a mitad de gesto para que
 // el navegador "ceda" el control una vez armado el drag. Con
 // "touch-action:auto" bastaba con que el dedo temblara un pelín durante
 // esos 400ms de espera para que el navegador YA hubiera empezado un
 // scroll nativo por su cuenta — y una vez ha empezado, ningún
 // preventDefault() posterior (ni siquiera armando el drag después) puede
 // pararlo ni devolverle el control a nuestro código: de ahí el bug real
 // de "no puedo arrastrar porque detecta que estoy scrolleando" y el
 // personaje quedándose flotando sin soltarse. La solución de verdad es
 // fijar "touch-action:none" en el CSS desde el principio (el navegador
 // nunca intenta scrollear él solo al tocar una carta) y, mientras
 // esperamos a ver si es pulsación larga o solo querían deslizar,
 // replicar el scroll A MANO nosotros mismos (ver el pointermove de más
 // arriba) — así el control nunca se le escapa a nadie a mitad de gesto:
 // o lo llevamos nosotros de principio a fin (scroll manual mientras se
 // decide, o el drag ya armado), o no se mueve nada.
 if(e.pointerType==='mouse'){
 _md=true;_mdMoved=false;
 _touchWaiting=false;
 return;
 }
 _md=false;_mdMoved=false;
 _touchWaiting=true;
 if(_lpT) clearTimeout(_lpT);
 _lpT=setTimeout(()=>{
 _lpT=null;
 _md=true;
 _touchWaiting=false;
 if(navigator.vibrate) navigator.vibrate(35);
 if(_heldEl) _heldEl.classList.add('drag-armed');
 }, 400);
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

