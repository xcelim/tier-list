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
