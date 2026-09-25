// Notificaciones tipo 'toast' (mensajes flotantes temporales) en pantalla.

// ============ TOAST ============
function toast(msg,type='ok'){
  const el=document.createElement('div');el.className='toast '+type;el.textContent=msg;
  document.getElementById('tw').appendChild(el);setTimeout(()=>el.remove(),3000);
}

