// Alternador de tema claro/oscuro.
// El tema se guarda en localStorage (misma capa DB que el resto de la app)
// y se aplica como atributo data-theme en <html>. El "flash" del tema
// incorrecto al cargar la página se evita con un script inline muy al
// principio de <head> en index.html, que aplica el tema guardado antes de
// que se pinte nada.

function currentTheme(){
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function toggleTheme(){
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try{ DB.s('theme', next); }catch(e){}
  render();
}

// --- Paleta de acento (personalización general) ---
// Como casi todo el rediseño usa las variables --neon-magenta/--neon-cyan/
// --neon-gold, cambiar la paleta aquí cambia TODA la app de golpe: nav,
// título, tarjetas, botones, marcos de nivel... sin tocar ninguna otra regla.
const ACCENT_PRESETS = {
  persona:  { name:'Persona (rojo)',  magenta:'#ff0a2e', cyan:'#ffffff', gold:'#ffcf40' },
  genshin:  { name:'Genshin (oro)',   magenta:'#d4af37', cyan:'#8ec9ff', gold:'#fff2c8' },
  cyber:    { name:'Cyber (cian)',    magenta:'#00e5ff', cyan:'#ff2ea6', gold:'#f0f0f0' },
  sakura:   { name:'Sakura (rosa)',   magenta:'#ff6fae', cyan:'#ffffff', gold:'#ffd166' },
  toxic:    { name:'Tóxico (verde)',  magenta:'#39ff14', cyan:'#0affef', gold:'#e8ff59' },
};

function currentAccent(){
  return document.documentElement.getAttribute('data-accent') || 'persona';
}

function applyAccent(id){
  const p = ACCENT_PRESETS[id]; if(!p) return;
  document.documentElement.setAttribute('data-accent', id);
  document.documentElement.style.setProperty('--neon-magenta', p.magenta);
  document.documentElement.style.setProperty('--neon-cyan', p.cyan);
  document.documentElement.style.setProperty('--neon-gold', p.gold);
}

function setAccent(id){
  applyAccent(id);
  try{ DB.s('accent', id); }catch(e){}
  render();
}
