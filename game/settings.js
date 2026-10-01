'use strict';
// ============================================================
//  Ajustes persistentes + textos en varios idiomas
// ============================================================

const SETTINGS_KEY = 'simba.settings.v1';
const SETTINGS_DEFAULT = {
  brightness: 100,   // %  (50-150)
  music: 60,         // %  (0-100)
  sfx: 80,           // %  (0-100)
  display: 'fit',    // 'fit' = ajustar a pantalla · 'pixel' = píxel perfecto (escala entera)
  lang: (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es',
};
const SETTINGS = loadSettings();

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return Object.assign({}, SETTINGS_DEFAULT, s);
  } catch (e) { return Object.assign({}, SETTINGS_DEFAULT); }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* modo privado: no persiste */ }
}

const I18N = {
  es: {
    subtitle: 'el camino a casa',
    play: 'JUGAR', settings: 'CONFIGURACIÓN', back: 'VOLVER',
    brightness: 'Brillo', music: 'Música', sfx: 'Efectos',
    display: 'Resolución', fullscreen: 'Pantalla completa', lang: 'Idioma',
    display_fit: 'Ajustar', display_pixel: 'Píxel perfecto',
    on: 'Sí', off: 'No', lang_name: 'Español',
    resume: 'CONTINUAR', restart: 'REINICIAR', mainmenu: 'MENÚ PRINCIPAL',
    pause: 'PAUSA',
    menu_hint_keys: '↑↓ elegir · ENTER aceptar',
    settings_hint_keys: '↑↓ elegir · < > cambiar · ESC volver',
    menu_hint_touch: 'Toca una opción',
    goal: 'Lleva a Simba hasta su mamá',
    controls_keys: '← → mover   ESPACIO saltar   P pausa',
    controls_touch: 'Joystick (izq.) mover · Botón (der.) saltar',
    checkpoint: '¡Punto de control!', careful: '¡Cuidado con los precipicios!',
    ohno: '¡OH NO!', nolives: 'Simba se quedó sin vidas',
    retry: 'para intentarlo de nuevo', again: 'para jugar otra vez',
    tap: 'Toca la pantalla', enter: 'ENTER', esc_menu: 'ESC menú',
    win: '¡LLEGASTE CON MAMÁ!', time: 'Tiempo', fish: 'Pescados', lives: 'Vidas restantes',
    res_hungry: 'Mamá aún tiene hambre... ¡vuelve por más!', res_happy: '¡Mamá está contenta!',
    res_full: '¡Mamá está bien alimentada!', delivered: 'Pescados entregados',
    jump_btn: 'SALTAR',
    rotate1: 'Para este juego necesitas poner tu móvil en horizontal',
    rotate2: 'Gíralo así para jugar con Simba',
  },
  en: {
    subtitle: 'the way home',
    play: 'PLAY', settings: 'SETTINGS', back: 'BACK',
    brightness: 'Brightness', music: 'Music', sfx: 'Sound FX',
    display: 'Resolution', fullscreen: 'Fullscreen', lang: 'Language',
    display_fit: 'Fit screen', display_pixel: 'Pixel perfect',
    on: 'On', off: 'Off', lang_name: 'English',
    resume: 'RESUME', restart: 'RESTART', mainmenu: 'MAIN MENU',
    pause: 'PAUSED',
    menu_hint_keys: '↑↓ select · ENTER confirm',
    settings_hint_keys: '↑↓ select · < > change · ESC back',
    menu_hint_touch: 'Tap an option',
    goal: 'Guide Simba back to his mom',
    controls_keys: '← → move   SPACE jump   P pause',
    controls_touch: 'Joystick (left) move · Button (right) jump',
    checkpoint: 'Checkpoint!', careful: 'Watch out for the pits!',
    ohno: 'OH NO!', nolives: 'Simba ran out of lives',
    retry: 'to try again', again: 'to play again',
    tap: 'Tap the screen', enter: 'ENTER', esc_menu: 'ESC menu',
    win: 'YOU MADE IT HOME!', time: 'Time', fish: 'Fish', lives: 'Lives left',
    res_hungry: 'Mom is still hungry... come back for more!', res_happy: 'Mom is happy!',
    res_full: 'Mom is well fed!', delivered: 'Fish delivered',
    jump_btn: 'JUMP',
    rotate1: 'This game needs your phone in landscape',
    rotate2: 'Turn it like this to play with Simba',
  },
};
const LANGS = Object.keys(I18N);
const t = key => (I18N[SETTINGS.lang] && I18N[SETTINGS.lang][key]) || I18N.es[key] || key;

// Textos que viven en el HTML (botón de salto, aviso de girar el móvil)
function applyHtmlTexts() {
  document.documentElement.lang = SETTINGS.lang;
  const set = (sel, key) => { const el = document.querySelector(sel); if (el) el.textContent = t(key); };
  set('#t-jump .label', 'jump_btn');
  set('#rotate .msg', 'rotate1');
  set('#rotate .sub', 'rotate2');
}
