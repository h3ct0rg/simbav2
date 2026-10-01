'use strict';
// ============================================================
//  Menús: principal, configuración y pausa (dibujados en canvas)
//  Usa globales de game.js (ctx, A, text, drawFrame...) en tiempo de ejecución.
// ============================================================

let menuSel = 0, menuT = 0, settingsFrom = 'menu';
let hitRects = []; // zonas clicables del frame actual
const MENU_STATES = ['menu', 'settings', 'pause'];
const isMenuState = () => MENU_STATES.includes(state);

// ---------- Definición de los menús ----------
function mainItems() {
  return [
    { type: 'button', label: t('play'), act: () => { SFX.select(); openMap(); } },
    { type: 'button', label: t('settings'), act: () => openSettings('menu') },
  ];
}
function pauseItems() {
  return [
    { type: 'button', label: t('resume'), act: resumeGame },
    { type: 'button', label: t('restart'), act: () => { SFX.select(); restartLevel(); } },
    { type: 'button', label: t('map'), act: () => { SFX.select(); openMap(); } },
    { type: 'button', label: t('settings'), act: () => openSettings('pause') },
    { type: 'button', label: t('mainmenu'), act: openMainMenu },
  ];
}
const canFullscreen = () => !!(document.documentElement.requestFullscreen && document.fullscreenEnabled);
function settingsItems() {
  const items = [
    { type: 'slider', label: t('brightness'), key: 'brightness', min: 50, max: 150, step: 10 },
    { type: 'slider', label: t('music'), key: 'music', min: 0, max: 100, step: 10 },
    { type: 'slider', label: t('sfx'), key: 'sfx', min: 0, max: 100, step: 10 },
    { type: 'choice', label: t('display'), key: 'display', options: ['fit', 'pixel'], fmt: v => t('display_' + v) },
  ];
  if (canFullscreen()) items.push({ type: 'toggle', label: t('fullscreen'), get: () => !!document.fullscreenElement, set: setFullscreen });
  items.push({ type: 'choice', label: t('lang'), key: 'lang', options: LANGS, fmt: v => I18N[v].lang_name });
  items.push({ type: 'button', label: t('back'), act: closeSettings });
  return items;
}
function currentItems() {
  return state === 'menu' ? mainItems() : state === 'pause' ? pauseItems() : state === 'settings' ? settingsItems() : [];
}

// ---------- Acciones ----------
function openMainMenu() { state = 'menu'; menuSel = 0; SFX.backSnd(); applyVolumes(); }
function openSettings(from) { settingsFrom = from; state = 'settings'; menuSel = 0; SFX.select(); }
function closeSettings() { state = settingsFrom; menuSel = settingsFrom === 'pause' ? 3 : 1; SFX.backSnd(); }
function openPause() { if (state !== 'play') return; state = 'pause'; menuSel = 0; SFX.select(); applyVolumes(); }
function resumeGame() { state = 'play'; SFX.select(); applyVolumes(); }
function setFullscreen(on) {
  try {
    if (on && !document.fullscreenElement) document.documentElement.requestFullscreen().then(resize).catch(() => { });
    else if (!on && document.fullscreenElement) document.exitFullscreen().then(resize).catch(() => { });
  } catch (e) { }
}

function applySettings() {
  canvas.style.filter = SETTINGS.brightness === 100 ? '' : `brightness(${SETTINGS.brightness}%)`;
  resize();
  applyVolumes();
  applyHtmlTexts();
}

function changeItem(it, dir) {
  if (it.type === 'slider') {
    const v = clamp(SETTINGS[it.key] + dir * it.step, it.min, it.max);
    if (v === SETTINGS[it.key]) return;
    SETTINGS[it.key] = v;
  } else if (it.type === 'choice') {
    const i = it.options.indexOf(SETTINGS[it.key]);
    SETTINGS[it.key] = it.options[(i + dir + it.options.length) % it.options.length];
  } else if (it.type === 'toggle') {
    it.set(!it.get());
  } else return;
  saveSettings(); applySettings();
  SFX.tick(); // suena DESPUÉS de aplicar el volumen: se oye el nivel nuevo
}
function activate(it) {
  if (!it) return;
  if (it.type === 'button') it.act();
  else if (it.type !== 'slider') changeItem(it, 1);
}

// ---------- Teclado ----------
function menuKey(code) {
  const items = currentItems();
  if (!items.length) return false;
  const up = code === 'ArrowUp' || code === 'KeyW', down = code === 'ArrowDown' || code === 'KeyS';
  if (up || down) { menuSel = (menuSel + (down ? 1 : -1) + items.length) % items.length; SFX.move(); return true; }
  if (code === 'ArrowLeft' || code === 'KeyA') { changeItem(items[menuSel], -1); return true; }
  if (code === 'ArrowRight' || code === 'KeyD') { changeItem(items[menuSel], 1); return true; }
  if (code === 'Enter' || code === 'Space') { activate(items[menuSel]); return true; }
  if (code === 'Escape' || code === 'Backspace' || code === 'KeyP') {
    if (state === 'settings') closeSettings();
    else if (state === 'pause') resumeGame();
    return true;
  }
  return true; // en menús nada más llega al juego
}

// ---------- Ratón / táctil ----------
function toCanvas(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left) * VW / r.width, y: (clientY - r.top) * VH / r.height };
}
function hitAt(p) { for (let i = hitRects.length - 1; i >= 0; i--) { const h = hitRects[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
function menuHover(clientX, clientY) {
  const h = hitAt(toCanvas(clientX, clientY));
  if (h && h.idx !== menuSel) { menuSel = h.idx; SFX.move(); }
}
function menuPointer(clientX, clientY) {
  const p = toCanvas(clientX, clientY);
  const h = hitAt(p);
  if (!h) return;
  const items = currentItems();
  const it = items[h.idx];
  menuSel = h.idx;
  if (h.zone === 'left') changeItem(it, -1);
  else if (h.zone === 'right') changeItem(it, 1);
  else if (h.zone === 'bar' && it.type === 'slider') {
    const f = clamp((p.x - h.x) / h.w, 0, 1);
    const v = Math.round((it.min + f * (it.max - it.min)) / it.step) * it.step;
    if (v !== SETTINGS[it.key]) { SETTINGS[it.key] = v; saveSettings(); applySettings(); SFX.tick(); }
  } else activate(it);
}

// ---------- Dibujo: piezas ----------
function pixRect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4); }
function panel(x, y, w, h) {
  pixRect(x - 3, y - 3, w + 6, h + 6, '#1b1b2f');
  pixRect(x, y, w, h, 'rgba(36,38,82,0.94)');
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 4, y + 3, w - 8, 3);
  // remaches de las esquinas
  ctx.fillStyle = '#7aa7d6';
  [[x + 6, y + 6], [x + w - 9, y + 6], [x + 6, y + h - 9], [x + w - 9, y + h - 9]].forEach(([a, b]) => ctx.fillRect(a, b, 3, 3));
}
function button(x, y, w, h, label, sel, idx) {
  const lift = sel ? Math.round(Math.sin(menuT * 6) * 1.5) - 1 : 0;
  y += lift;
  pixRect(x - 3, y - 3, w + 6, h + 6, '#1b1b2f');
  pixRect(x, y, w, h, sel ? '#ff8fb8' : '#3a3d7a');
  ctx.fillStyle = sel ? '#ffd1e3' : '#5a5fa8'; ctx.fillRect(x + 3, y + 2, w - 6, 3);   // brillo superior
  ctx.fillStyle = sel ? '#d9668f' : '#2a2c5c'; ctx.fillRect(x + 3, y + h - 5, w - 6, 3); // sombra inferior
  text(label, x + w / 2, y + h / 2 + 1, 12, '#ffffff');
  if (sel) { // pescaditos señalando la opción
    const bob = Math.sin(menuT * 8) * 2;
    drawFish({ x: x - 30 + bob, y: y + h / 2 - 7, t: 0, taken: false }, 0, 0);
    ctx.save(); ctx.translate(x + w + 30 - bob + 8, 0); ctx.scale(-1, 1);
    drawFish({ x: -8, y: y + h / 2 - 7, t: 0, taken: false }, 0, 0);
    ctx.restore();
  }
  hitRects.push({ x: x - 4, y: y - 4, w: w + 8, h: h + 8, idx, zone: 'row' });
}
function arrow(x, y, dir, active) {
  ctx.fillStyle = active ? '#ffb3d1' : '#8f95d6';
  ctx.beginPath();
  if (dir < 0) { ctx.moveTo(x + 6, y - 7); ctx.lineTo(x - 4, y); ctx.lineTo(x + 6, y + 7); }
  else { ctx.moveTo(x - 6, y - 7); ctx.lineTo(x + 4, y); ctx.lineTo(x - 6, y + 7); }
  ctx.fill();
}

// Logo "SIMBA" con letras que ondulan
function drawLogo(cx, cy) {
  const word = 'SIMBA', size = 44, gap = 46;
  ctx.font = `bold ${size}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const x0 = cx - (word.length - 1) * gap / 2;
  for (let i = 0; i < word.length; i++) {
    const x = x0 + i * gap, y = cy + Math.sin(menuT * 3 + i * 0.7) * 4;
    ctx.fillStyle = '#1b1b2f';
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [3, 3], [4, 5]]) ctx.fillText(word[i], x + dx, y + dy);
    const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#bfe3ff'); g.addColorStop(1, '#6fa8ff');
    ctx.fillStyle = g; ctx.fillText(word[i], x, y);
  }
  text(t('subtitle'), cx, cy + 42, 12, '#fff3b0');
  drawHeart(cx + ctx.measureText(t('subtitle')).width / 2 + 16, cy + 36 + Math.sin(menuT * 4) * 2, 1.4, '#ff6b9a');
}

// ---------- Escena animada del menú ----------
const MENU_GY = 304;          // superficie del suelo
const MOM_X = 470;            // posición de mamá
const menuScene = { x: -70, dir: 1, phase: 'run', t: 0, hearts: [] };
function updateMenuScene(dt) {
  const s = menuScene;
  s.t += dt;
  if (s.phase === 'run') {
    s.x += s.dir * 150 * dt;
    if (s.dir > 0 && s.x >= MOM_X - 70) { s.x = MOM_X - 70; s.phase = 'love'; s.t = 0; }
    if (s.dir < 0 && s.x < -80) { s.dir = 1; s.x = -80; }
  } else if (s.phase === 'love') {
    if (Math.random() < dt * 5) s.hearts.push({ x: (s.x + MOM_X) / 2 + (Math.random() - 0.5) * 30, y: MENU_GY - 40, vy: -35 - Math.random() * 25, life: 1.5 });
    if (s.t > 3) { s.phase = 'run'; s.dir = -1; } // vuelve a salir corriendo y la escena se repite
  }
  for (const h of s.hearts) { h.y += h.vy * dt; h.life -= dt; }
  s.hearts = s.hearts.filter(h => h.life > 0);
}
function drawGroundStrip() {
  const T = A.tiles;
  if (T && ok(T.wang_12) && ok(T.wang_0)) {
    for (let x = -16; x < VW + 32; x += TS) {
      ctx.drawImage(T.wang_12, x, MENU_GY - TS / 2, TS, TS);
      for (let y = MENU_GY + TS / 2; y < VH; y += TS) ctx.drawImage(T.wang_0, x, y, TS, TS);
    }
  } else {
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, MENU_GY, VW, VH - MENU_GY);
    ctx.fillStyle = '#4caf50'; ctx.fillRect(0, MENU_GY, VW, 9);
  }
}
function drawMenuScene(dt) {
  updateMenuScene(dt);
  drawBackground(menuT * 25, MENU_GY);
  // murciélago cruzando el cielo
  const bx = ((menuT * 70) % (VW + 200)) - 100;
  if (ok(A.bat)) drawFrame(A.bat, bx, 70 + Math.sin(menuT * 2.5) * 18, true, 0.8, 0.8 * (1 + Math.sin(menuT * 18) * 0.12));
  drawGroundStrip();
  // mamá (mira a la izquierda) y Simba
  const mom = anim(A.mother, 'idle');
  if (mom) drawFrame(mom.frames[Math.floor(menuT * mom.fps) % mom.frames.length], MOM_X, MENU_GY + 2, true);
  const s = menuScene;
  const run = anim(A.hero, 'run'), idle = anim(A.hero, 'idle');
  const set = s.phase === 'run' ? run : idle;
  groundShadow(s.x, MENU_GY, 22);
  if (set) drawFrame(set.frames[Math.floor(menuT * (s.phase === 'run' ? 13 : set.fps)) % set.frames.length], s.x, MENU_GY + 2, s.dir < 0);
  for (const h of s.hearts) { ctx.globalAlpha = clamp(h.life, 0, 1); drawHeart(h.x, h.y, 1.3, '#ff6b9a'); }
  ctx.globalAlpha = 1;
  // viñeta suave para que el texto destaque
  const g = ctx.createRadialGradient(VW / 2, VH / 2, 120, VW / 2, VH / 2, 420);
  g.addColorStop(0, 'rgba(10,10,30,0)'); g.addColorStop(1, 'rgba(10,10,30,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

// ---------- Pantallas ----------
function drawMainMenu() {
  drawLogo(VW / 2, 66);
  const items = mainItems(), w = 240, h = 36;
  items.forEach((it, i) => button(VW / 2 - w / 2, 158 + i * 50, w, h, it.label, i === menuSel, i));
  text(IS_TOUCH ? t('menu_hint_touch') : t('menu_hint_keys'), VW / 2, 346, 8, '#e5e7eb');
}

function drawSettings() {
  const items = settingsItems();
  menuSel = clamp(menuSel, 0, items.length - 1);
  const px = 110, pw = VW - 220, py = 22, rowH = 30;
  const ph = 62 + items.length * rowH;
  panel(px, py, pw, ph);
  text(t('settings'), VW / 2, py + 24, 14, '#ffb3d1');
  const cxCtl = px + pw - 105; // centro de la columna de controles
  items.forEach((it, i) => {
    const y = py + 58 + i * rowH, sel = i === menuSel;
    if (sel) { ctx.fillStyle = 'rgba(255,143,184,0.16)'; ctx.fillRect(px + 8, y - 12, pw - 16, 24); }
    if (it.type === 'button') {
      button(VW / 2 - 70, y - 10, 140, 22, it.label, sel, i);
      return;
    }
    if (sel) drawFish({ x: px + 14 + Math.sin(menuT * 8) * 2, y: y - 7, t: 0, taken: false }, 0, 0);
    text(it.label, px + 38, y + 1, 9, sel ? '#ffffff' : '#c7cbe8', 'left');
    hitRects.push({ x: px + 8, y: y - 12, w: pw - 120, h: 24, idx: i, zone: 'row' });
    arrow(cxCtl - 74, y, -1, sel);
    arrow(cxCtl + 74, y, 1, sel);
    hitRects.push({ x: cxCtl - 90, y: y - 13, w: 26, h: 26, idx: i, zone: 'left' });
    hitRects.push({ x: cxCtl + 64, y: y - 13, w: 26, h: 26, idx: i, zone: 'right' });
    if (it.type === 'slider') {
      const bw = 110, bx = cxCtl - bw / 2, f = (SETTINGS[it.key] - it.min) / (it.max - it.min);
      ctx.fillStyle = '#1b1b2f'; ctx.fillRect(bx - 2, y - 6, bw + 4, 12);
      ctx.fillStyle = '#2a2c5c'; ctx.fillRect(bx, y - 4, bw, 8);
      // segmentos estilo retro
      const segs = Math.round((it.max - it.min) / it.step);
      for (let k = 0; k < segs; k++) {
        if (k / segs >= f - 1e-6) break;
        ctx.fillStyle = it.key === 'brightness' ? '#ffd23f' : '#7cf2c4';
        ctx.fillRect(bx + 1 + k * bw / segs, y - 3, bw / segs - 2, 6);
      }
      text(SETTINGS[it.key] + '%', cxCtl, y - 15, 7, '#ffffff');
      hitRects.push({ x: bx, y: y - 12, w: bw, h: 24, idx: i, zone: 'bar' });
    } else {
      const val = it.type === 'toggle' ? (it.get() ? t('on') : t('off')) : it.fmt(SETTINGS[it.key]);
      text(val, cxCtl, y + 1, 9, sel ? '#fff3b0' : '#ffffff');
      hitRects.push({ x: cxCtl - 64, y: y - 12, w: 128, h: 24, idx: i, zone: 'right' });
    }
  });
  text(IS_TOUCH ? t('menu_hint_touch') : t('settings_hint_keys'), VW / 2, py + ph + 18, 8, '#e5e7eb');
}

function drawPauseMenu() {
  overlay(0.55);
  const items = pauseItems(), w = 230, h = 30;
  const pw = 290, ph = 70 + items.length * 42, px = VW / 2 - pw / 2, py = VH / 2 - ph / 2;
  panel(px, py, pw, ph);
  text(t('pause'), VW / 2, py + 28, 18, '#bfe3ff');
  items.forEach((it, i) => button(VW / 2 - w / 2, py + 56 + i * 42, w, h, it.label, i === menuSel, i));
}
