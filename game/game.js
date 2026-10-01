'use strict';
// ============================================================
//  Simba: El camino a casa — plataformas 2D en canvas puro
//  Sprites generados con PixelLab (ver ../sprites/manifest.js)
// ============================================================

const VW = 640, VH = 360, TS = 32;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VW; canvas.height = VH;

function resize() {
  let s = Math.min(innerWidth / VW, innerHeight / VH);
  // "Píxel perfecto": escala entera (x1, x2, x3…) para píxeles nítidos y uniformes
  if (SETTINGS.display === 'pixel' && s >= 1) s = Math.floor(s);
  canvas.style.width = Math.floor(VW * s) + 'px';
  canvas.style.height = Math.floor(VH * s) + 'px';
}
addEventListener('resize', resize); resize();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------- Assets ----------------
const S = window.SPRITES || {};
const BASE = window.SPRITES_BASE || '../sprites/';
function img(p) { const i = new Image(); i.src = BASE + p; return i; }
function ok(i) { return i && i.complete && i.naturalWidth > 0; }
function loadSet(def) {
  if (!def) return null;
  const out = { anims: {} };
  for (const k in def.anims) {
    const a = def.anims[k];
    out.anims[k] = { fps: a.fps || 10, frames: a.frames.map(img) };
  }
  return out;
}
const A = {
  hero: loadSet(S.hero),
  mother: loadSet(S.mother),
  dog: loadSet(S.dog),
  bat: S.bat ? img(S.bat) : null,
  motherThin: Array.isArray(S.mother_thin) ? S.mother_thin.map(img) : [], // de la más flaca a la menos
  rat: S.rat ? img(S.rat) : null,
  bg: S.bg ? img(S.bg) : null,
  tiles: S.tiles ? Object.fromEntries(Object.entries(S.tiles).map(([k, v]) => [k, img(v)])) : null,
};
function anim(set, name) { return set && set.anims[name] && set.anims[name].frames.length ? set.anims[name] : null; }

// Dibuja un frame con los pies en (x, y), centrado horizontalmente
function drawFrame(f, x, y, flip, sx = 1, sy = 1, alpha = 1) {
  if (!ok(f)) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(flip ? -sx : sx, sy);
  ctx.drawImage(f, -Math.round(f.naturalWidth / 2), -f.naturalHeight);
  ctx.restore();
  return true;
}

// ---------------- Audio (sintetizado) ----------------
// Dos canales con volumen propio (Ajustes → Música / Efectos)
let AC = null, sfxBus = null, musicBus = null;
function unlockAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      sfxBus = AC.createGain(); sfxBus.connect(AC.destination);
      musicBus = AC.createGain(); musicBus.connect(AC.destination);
      applyVolumes();
      startMusic();
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
}
function applyVolumes() {
  if (!AC) return;
  const curve = v => Math.pow(v / 100, 1.6); // percepción más natural del volumen
  sfxBus.gain.setTargetAtTime(curve(SETTINGS.sfx) * 1.3, AC.currentTime, 0.02);
  // la música baja un poco en pausa para que se oigan los menús
  const duck = state === 'pause' ? 0.45 : 1;
  musicBus.gain.setTargetAtTime(curve(SETTINGS.music) * 0.55 * duck, AC.currentTime, 0.08);
}
function beep(f1, f2, dur, type = 'square', vol = 0.06, delay = 0) {
  if (!AC) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(sfxBus);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

// Música chiptune en bucle: melodía (cuadrada), bajo (triangular) y hi-hat (ruido)
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const MELODY = [ // corcheas; 0 = silencio
  76, 79, 84, 79, 81, 79, 76, 72,  74, 76, 77, 74, 76, 72, 74, 0,
  76, 79, 84, 79, 81, 84, 83, 81,  79, 76, 74, 76, 72, 0, 72, 0,
  81, 0, 81, 84, 83, 81, 79, 0,    77, 0, 77, 81, 79, 77, 76, 0,
  76, 79, 84, 79, 81, 79, 76, 74,  72, 74, 76, 79, 72, 0, 0, 0,
];
const BASS = [ // negras
  48, 55, 48, 55,  43, 50, 43, 50,  45, 52, 41, 48,  43, 50, 48, 0,
  48, 55, 48, 55,  43, 50, 43, 55,  41, 48, 41, 48,  43, 50, 48, 0,
];
const BEAT = 60 / 132 / 2; // duración de una corchea
let musicStep = 0, musicNext = 0, noiseBuf = null;
function note(freq, t0, dur, type, vol) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(musicBus);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function hat(t0, vol) {
  if (!noiseBuf) {
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.05, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  s.connect(f).connect(g).connect(musicBus); s.start(t0);
}
function startMusic() {
  musicNext = AC.currentTime + 0.1;
  setInterval(() => {
    if (!AC || AC.state !== 'running') return;
    while (musicNext < AC.currentTime + 0.25) { // programa notas con antelación (sin cortes)
      const i = musicStep % MELODY.length;
      if (MELODY[i]) note(midi(MELODY[i]), musicNext, BEAT * 0.9, 'square', 0.05);
      if (i % 2 === 0) {
        const b = BASS[(i / 2) % BASS.length];
        if (b) note(midi(b), musicNext, BEAT * 1.8, 'triangle', 0.14);
      }
      if (i % 2 === 1) hat(musicNext, 0.035);
      musicNext += BEAT; musicStep++;
    }
  }, 60);
}
const SFX = {
  jump: () => beep(330, 700, 0.13, 'square', 0.05),
  stomp: () => { beep(500, 120, 0.14, 'square', 0.07); beep(900, 400, 0.08, 'triangle', 0.05, 0.03); },
  hurt: () => beep(320, 70, 0.32, 'sawtooth', 0.06),
  fish: () => { beep(988, 988, 0.06, 'triangle', 0.06); beep(1319, 1319, 0.1, 'triangle', 0.06, 0.06); },
  check: () => [523, 659, 784].forEach((f, i) => beep(f, f, 0.12, 'triangle', 0.07, i * 0.09)),
  fall: () => beep(600, 60, 0.6, 'sine', 0.07),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => beep(f, f, 0.2, 'triangle', 0.08, i * 0.15)),
  over: () => [392, 330, 262, 196].forEach((f, i) => beep(f, f * 0.98, 0.25, 'square', 0.05, i * 0.22)),
  nom: n => { const f = 420 + Math.min(n, 23) * 22; beep(f, f * 0.7, 0.08, 'square', 0.05); beep(f * 1.5, f * 1.2, 0.06, 'triangle', 0.04, 0.05); },
  grow: () => [659, 880, 1175].forEach((f, i) => beep(f, f, 0.1, 'triangle', 0.07, i * 0.07)),
  move: () => beep(660, 660, 0.05, 'square', 0.035),
  select: () => { beep(784, 784, 0.07, 'square', 0.05); beep(1175, 1175, 0.1, 'square', 0.05, 0.06); },
  tick: () => beep(523, 523, 0.04, 'triangle', 0.05),
  backSnd: () => beep(523, 330, 0.1, 'square', 0.04),
};

// ---------------- Input ----------------
const keys = {};
const touch = { axis: 0, jump: false }; // axis: -1..1 del joystick virtual
// ?touch=1 fuerza los controles táctiles (útil para probar en PC)
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || /[?&]touch=1/.test(location.search);
if (IS_TOUCH) document.documentElement.classList.add('touch-mode');
const portraitBlocked = () => IS_TOUCH && innerHeight > innerWidth;
const JUMP_CODES = ['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyK'];
addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  unlockAudio();
  if (!keys[e.code]) {
    if (isMenuState()) menuKey(e.code); // en menús las teclas solo navegan
    else onPress(e.code);
  }
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const inLeft = () => keys.ArrowLeft || keys.KeyA || touch.axis < 0;
const inRight = () => keys.ArrowRight || keys.KeyD || touch.axis > 0;
const inJump = () => JUMP_CODES.some(c => keys[c]) || touch.jump;

function onPress(code) {
  if (JUMP_CODES.includes(code)) pressJump();
  if (code === 'Enter') pressStart();
  if (code === 'KeyR' && state === 'play') startGame();
  if ((code === 'KeyP' || code === 'Escape') && state === 'play') openPause();
  if (code === 'Escape' && (state === 'gameover' || state === 'win')) openMainMenu();
}
function pressJump() {
  if (state === 'play') player.jumpBuffer = 0.13;
  else pressStart();
}
function pressStart() {
  if ((state === 'gameover' && deadT > 0.6) || (state === 'win' && feed.phase === 'done' && feed.doneT > 1.2)) startGame();
}

// ---- Controles táctiles: joystick a la izquierda, salto a la derecha ----
function goFullscreen() {
  const el = document.documentElement;
  if (!IS_TOUCH || document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen()
    .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }))
    .catch(() => { });
}
const joy = document.getElementById('joy'), knob = document.getElementById('knob');
const JR = 46; // radio útil del joystick en px
let joyId = null, joyCx = 0, joyCy = 0;
function moveJoy(t) {
  let dx = t.clientX - joyCx, dy = t.clientY - joyCy;
  const d = Math.hypot(dx, dy);
  if (d > JR) { dx *= JR / d; dy *= JR / d; }
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  const ax = dx / JR;
  touch.axis = Math.abs(ax) < 0.22 ? 0 : ax; // zona muerta
}
function releaseJoy() {
  joyId = null; touch.axis = 0;
  knob.style.transform = 'translate(-50%, -50%)';
  joy.classList.remove('on');
}
if (joy) {
  joy.addEventListener('touchstart', e => {
    e.preventDefault(); unlockAudio(); goFullscreen();
    const t = e.changedTouches[0];
    const r = joy.getBoundingClientRect();
    joyId = t.identifier; joyCx = r.left + r.width / 2; joyCy = r.top + r.height / 2;
    joy.classList.add('on'); moveJoy(t);
  }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) if (t.identifier === joyId) { e.preventDefault(); moveJoy(t); }
  }, { passive: false });
  const endJoy = e => { for (const t of e.changedTouches) if (t.identifier === joyId) releaseJoy(); };
  addEventListener('touchend', endJoy);
  addEventListener('touchcancel', endJoy);
}
const jumpBtn = document.getElementById('t-jump');
if (jumpBtn) {
  jumpBtn.addEventListener('touchstart', e => {
    e.preventDefault(); unlockAudio(); goFullscreen();
    if (!touch.jump) pressJump();
    touch.jump = true; jumpBtn.classList.add('on');
  }, { passive: false });
  const off = e => { e.preventDefault(); touch.jump = false; jumpBtn.classList.remove('on'); };
  jumpBtn.addEventListener('touchend', off, { passive: false });
  jumpBtn.addEventListener('touchcancel', off, { passive: false });
}
const pauseBtn = document.getElementById('t-pause');
if (pauseBtn) pauseBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  if (state === 'play') openPause(); else if (state === 'pause') resumeGame();
}, { passive: false });
canvas.addEventListener('touchstart', e => {
  unlockAudio(); goFullscreen();
  if (state === 'play') return;
  e.preventDefault();
  const tc = e.changedTouches[0];
  if (isMenuState()) menuPointer(tc.clientX, tc.clientY); else pressStart();
}, { passive: false });
canvas.addEventListener('mousedown', e => {
  unlockAudio();
  if (isMenuState()) menuPointer(e.clientX, e.clientY);
  else if (state !== 'play') pressStart();
});
canvas.addEventListener('mousemove', e => {
  if (isMenuState()) menuHover(e.clientX, e.clientY);
  canvas.style.cursor = isMenuState() && hitAt(toCanvas(e.clientX, e.clientY)) ? 'pointer' : 'default';
});
// Si el móvil se gira a vertical en plena partida, se pausa
addEventListener('resize', () => { if (portraitBlocked() && state === 'play') openPause(); });
const startHint = () => (IS_TOUCH ? t('tap') : t('enter'));

// ---------------- Nivel ----------------
const COLS = 142, ROWS = 12, G = 9; // G = fila de la superficie del suelo
let grid;
const SOLID = 1, ONEWAY = 2;
function buildLevel() {
  grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  const ground = (a, b, top = G) => { for (let c = a; c <= b; c++) for (let r = top; r < ROWS; r++) grid[r][c] = SOLID; };
  const plat = (c, r, len) => { for (let i = 0; i < len; i++) grid[r][c + i] = ONEWAY; };

  // Zona 1: inicio tranquilo
  ground(0, 24);
  plat(9, 6, 3);
  // precipicio 25-27
  ground(28, 45);
  ground(34, 37, 7);           // escalón alto
  // precipicio 46-49
  ground(50, 70);
  plat(55, 6, 3);
  plat(60, 4, 3);
  // precipicio ancho 71-75 con plataforma de apoyo
  plat(72, 7, 2);
  ground(76, 100);
  ground(86, 88, 7);           // muro
  // precipicio 101-103
  ground(104, 108);            // islita
  // precipicio 109-112
  ground(113, COLS - 1);
  plat(122, 6, 4);
  ground(COLS - 3, COLS - 1, 6); // pared final
}
function tile(c, r) {
  if (c < 0 || c >= COLS) return SOLID;
  if (r < 0 || r >= ROWS) return 0;
  return grid[r][c];
}

// ---------------- Física ----------------
const GRAV = 1900, MAXFALL = 820, MAXV = 235, JUMP = 640;
function moveX(e, dx) {
  e.x += dx; e.hitWall = 0;
  const top = Math.floor(e.y / TS), bot = Math.floor((e.y + e.h - 0.01) / TS);
  if (dx > 0) {
    const c = Math.floor((e.x + e.w) / TS);
    for (let r = top; r <= bot; r++) if (tile(c, r) === SOLID) { e.x = c * TS - e.w; e.vx = 0; e.hitWall = 1; break; }
  } else if (dx < 0) {
    const c = Math.floor(e.x / TS);
    for (let r = top; r <= bot; r++) if (tile(c, r) === SOLID) { e.x = (c + 1) * TS; e.vx = 0; e.hitWall = -1; break; }
  }
}
function moveY(e, dy) {
  const prevBottom = e.y + e.h;
  e.y += dy; e.onGround = false;
  const l = Math.floor(e.x / TS), rr = Math.floor((e.x + e.w - 0.01) / TS);
  if (dy > 0) {
    const r = Math.floor((e.y + e.h) / TS);
    for (let c = l; c <= rr; c++) {
      const t = tile(c, r);
      if (t === SOLID || (t === ONEWAY && prevBottom <= r * TS + 0.5)) { e.y = r * TS - e.h; e.vy = 0; e.onGround = true; break; }
    }
  } else if (dy < 0) {
    const r = Math.floor(e.y / TS);
    for (let c = l; c <= rr; c++) if (tile(c, r) === SOLID) { e.y = (r + 1) * TS; e.vy = 0; break; }
  }
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------------- Entidades ----------------
let player, enemies, fishes, particles, checkpoint, mother;
// Alimentar a mamá: los pescados recogidos se le entregan al llegar a la meta
let feed;
const newFeed = () => ({ phase: 'walk', fed: 0, toSend: 0, w: 0, stage: 0, spawnT: 0, flying: [], bounce: 0, doneT: 0 });
const momStage = w => (w < 0.34 ? 0 : w < 0.75 ? 1 : 2); // 0 flaquita · 1 normal · 2 bien alimentada
// Apariencia visible (0..5): 4 grados de flaquita, luego normal y bien alimentada.
// Cada salto de apariencia se marca con un "puf", así el engorde se nota paso a paso.
const THIN_LOOKS = 4;
function momLook(w) {
  if (w < 0.34) return Math.min(THIN_LOOKS - 1, Math.floor(w / (0.34 / THIN_LOOKS)));
  return w < 0.75 ? THIN_LOOKS : THIN_LOOKS + 1;
}
let state = 'menu', hearts = 3, fishCount = 0, timeT = 0, shake = 0, winT = 0, deadT = 0, msgT = 0, msg = '';
let camX = 0, camY = 0;

function makePlayer(x, y) {
  return { x, y, w: 30, h: 26, vx: 0, vy: 0, onGround: false, facing: 1, coyote: 0, jumpBuffer: 0,
    invuln: 0, sx: 1, sy: 1, animT: 0, dustT: 0, prevBottom: 0 };
}
function walker(type, col, minC, maxC) {
  const big = type === 'dog';
  const w = big ? 38 : 28, h = big ? 28 : 18;
  return { type, x: col * TS, y: G * TS - h, w, h, vx: (big ? -62 : -105), vy: 0, minX: minC * TS, maxX: (maxC + 1) * TS,
    alive: true, deadT: 0, animT: Math.random() * 3, onGround: false };
}
function bat(col, row, rangeC) {
  return { type: 'bat', cx: col * TS, baseY: row * TS, range: rangeC * TS, x: col * TS, y: row * TS, w: 28, h: 20,
    vx: 0, alive: true, deadT: 0, animT: Math.random() * 6, speed: 1.1 };
}

function startGame() {
  buildLevel();
  player = makePlayer(3 * TS, G * TS - 26);
  hearts = 3; fishCount = 0; timeT = 0; winT = 0; shake = 0; msgT = 0;
  feed = newFeed();
  checkpoint = { x: 64 * TS, active: false, spawnX: 3 * TS, spawnY: G * TS - 26 };
  mother = { x: 134 * TS, y: G * TS, w: 50, h: 40, animT: 0 };
  enemies = [
    walker('rat', 18, 14, 24),
    walker('dog', 40, 38, 45),
    bat(60, 5, 6),
    walker('rat', 82, 77, 85),
    walker('dog', 94, 89, 100),
    bat(106, 6, 4),
    walker('dog', 124, 115, 131),
  ];
  fishes = [];
  const fish = (c, r) => fishes.push({ x: c * TS + 8, y: r * TS + 8, w: 16, h: 14, taken: false, t: Math.random() * 6 });
  [[5, 8], [7, 8], [10, 5], [11, 5], [26, 6], [35, 6], [36, 6], [47, 6], [48, 6], [56, 5], [61, 3], [62, 3],
   [72, 6], [73, 6], [80, 8], [87, 6], [102, 6], [106, 8], [110, 6], [111, 6], [123, 5], [124, 5], [125, 5]]
    .forEach(([c, r]) => fish(c, r));
  particles = [];
  camX = 0; camY = (ROWS * TS - VH);
  state = 'play';
}

// ---------------- Partículas ----------------
function puff(x, y, n, color, spread = 60, up = 40, life = 0.4, size = 3) {
  for (let i = 0; i < n; i++)
    particles.push({ x, y, vx: (Math.random() - 0.5) * spread * 2, vy: -Math.random() * up, life, max: life, color, size, g: 200 });
}
function heartBurst(x, y) {
  for (let i = 0; i < 2; i++)
    particles.push({ x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 1.6, max: 1.6, heart: true, g: -10 });
}

// ---------------- Update ----------------
function hurtPlayer(fromX) {
  if (player.invuln > 0) return;
  hearts--; shake = 8; SFX.hurt();
  player.invuln = 1.5;
  const away = player.x + player.w / 2 < fromX ? -1 : 1;
  player.vx = away * 260; player.vy = -330;
  puff(player.x + player.w / 2, player.y + player.h / 2, 10, '#ff6b6b', 90, 80);
  if (hearts <= 0) gameOver();
}
function gameOver() { state = 'gameover'; deadT = 0; SFX.over(); }
function respawn() {
  player.x = checkpoint.spawnX; player.y = checkpoint.spawnY;
  player.vx = 0; player.vy = 0; player.invuln = 1.5;
}

function updatePlayer(dt) {
  const p = player;
  p.prevBottom = p.y + p.h;
  const dir = (inRight() ? 1 : 0) - (inLeft() ? 1 : 0);
  const accel = p.onGround ? 2400 : 1600;
  if (dir) {
    // Giro rápido: frena extra al cambiar de sentido
    const turning = p.vx !== 0 && Math.sign(p.vx) !== dir;
    p.vx += dir * accel * dt * (turning ? 1.8 : 1);
    p.facing = dir;
  } else {
    const dec = (p.onGround ? 2600 : 700) * dt;
    p.vx = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec;
  }
  // Joystick analógico: inclinarlo poco = caminar, a fondo = correr
  const maxV = touch.axis ? MAXV * clamp(Math.abs(touch.axis) * 1.25, 0.45, 1) : MAXV;
  p.vx = clamp(p.vx, -maxV, maxV);

  p.coyote = p.onGround ? 0.1 : p.coyote - dt;
  p.jumpBuffer -= dt;
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = -JUMP; p.jumpBuffer = 0; p.coyote = 0; p.onGround = false;
    p.sx = 0.8; p.sy = 1.25;
    SFX.jump();
    puff(p.x + p.w / 2, p.y + p.h, 6, '#e8dcc0', 40, 20, 0.3);
  }
  // Salto variable: soltar el botón corta la subida; flotación suave en el ápice
  let g = GRAV;
  if (p.vy < 0 && !inJump()) g *= 2.6;
  else if (Math.abs(p.vy) < 70 && inJump()) g *= 0.55;
  else if (p.vy > 0) g *= 1.15;
  p.vy = Math.min(p.vy + g * dt, MAXFALL);

  const wasGround = p.onGround;
  moveX(p, p.vx * dt);
  moveY(p, p.vy * dt);
  if (!wasGround && p.onGround) {
    p.sx = 1.25; p.sy = 0.78;
    puff(p.x + p.w / 2, p.y + p.h, 8, '#e8dcc0', 70, 25, 0.35);
  }
  // Polvo al correr
  if (p.onGround && Math.abs(p.vx) > 150) {
    p.dustT -= dt;
    if (p.dustT <= 0) { p.dustT = 0.09; puff(p.x + p.w / 2 - p.facing * 10, p.y + p.h, 1, '#e8dcc0', 15, 15, 0.3, 2); }
  }
  p.sx = lerp(p.sx, 1, Math.min(1, dt * 12));
  p.sy = lerp(p.sy, 1, Math.min(1, dt * 12));
  p.invuln = Math.max(0, p.invuln - dt);
  p.animT += dt;

  // Caída al vacío
  if (p.y > ROWS * TS + 60) {
    hearts--; shake = 6; SFX.fall();
    if (hearts <= 0) gameOver(); else { respawn(); flash(t('careful')); }
  }
  // Checkpoint
  if (!checkpoint.active && p.x > checkpoint.x) {
    checkpoint.active = true;
    checkpoint.spawnX = checkpoint.x; checkpoint.spawnY = G * TS - p.h;
    SFX.check(); flash(t('checkpoint'));
    puff(checkpoint.x + 8, G * TS - 60, 16, '#7cf27c', 80, 80, 0.7);
  }
}

function updateEnemies(dt) {
  const p = player;
  for (const e of enemies) {
    e.animT += dt;
    if (!e.alive) { e.deadT += dt; continue; }
    if (e.type === 'bat') {
      const ox = Math.sin(e.animT * e.speed) * e.range;
      const nx = e.cx + ox;
      e.vx = (nx - e.x) / dt;
      e.x = nx;
      e.y = e.baseY + Math.sin(e.animT * 3.2) * 14;
    } else {
      e.vy = Math.min(e.vy + GRAV * dt, MAXFALL);
      moveX(e, e.vx * dt);
      moveY(e, e.vy * dt);
      const front = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      const ledge = e.onGround && tile(Math.floor(front / TS), Math.floor((e.y + e.h + 4) / TS)) === 0;
      if (e.hitWall || ledge || (e.vx < 0 && e.x <= e.minX) || (e.vx > 0 && e.x + e.w >= e.maxX)) {
        const sp = e.type === 'dog' ? 62 : 105;
        e.vx = e.hitWall ? -e.hitWall * sp : (e.vx > 0 ? -sp : sp);
        if (e.vx === 0) e.vx = sp;
      }
    }
    // Colisión con el jugador (hitbox algo más indulgente)
    const hb = { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 4 };
    if (state === 'play' && overlap(p, hb)) {
      const stomp = p.vy > 0 && p.prevBottom <= e.y + 12;
      if (stomp) {
        e.alive = false; e.deadT = 0;
        p.vy = inJump() ? -580 : -400; p.sx = 0.8; p.sy = 1.2;
        SFX.stomp(); shake = 3;
        puff(e.x + e.w / 2, e.y + e.h / 2, 14, '#ffffff', 100, 90, 0.5);
      } else hurtPlayer(e.x + e.w / 2);
    }
  }
}

function updateWorld(dt) {
  for (const f of fishes) {
    f.t += dt;
    if (!f.taken && overlap(player, f)) {
      f.taken = true; fishCount++; SFX.fish();
      puff(f.x + 8, f.y + 7, 8, '#ffd23f', 50, 60, 0.4);
    }
  }
  for (const q of particles) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  particles = particles.filter(q => q.life > 0);
  mother.animT += dt;

  // Meta: llegar con mamá
  if (state === 'play' && player.x + player.w > mother.x - 34) {
    state = 'win'; winT = 0; SFX.check();
    player.vx = 0;
  }
  msgT = Math.max(0, msgT - dt);
}

function updateCamera(dt) {
  const p = player;
  const tx = clamp(p.x + p.w / 2 - VW / 2 + p.facing * 50, 0, COLS * TS - VW);
  const ty = clamp(p.y - VH * 0.55, 0, ROWS * TS - VH);
  camX = lerp(camX, tx, Math.min(1, dt * 5));
  camY = lerp(camY, ty, Math.min(1, dt * 4));
}

function flash(t) { msg = t; msgT = 1.8; }

function update(dt) {
  // El temblor decae en cualquier estado (antes quedaba congelado en game over / pausa)
  shake = Math.max(0, shake - dt * 30);
  if (state === 'play') {
    timeT += dt;
    updatePlayer(dt);
    updateEnemies(dt);
    updateWorld(dt);
    updateCamera(dt);
  } else if (state === 'win') {
    winT += dt;
    // El gatito camina solo hasta su mamá
    const p = player;
    const target = mother.x - 40 - p.w;
    p.facing = 1;
    p.vx = p.x < target ? 120 : 0;
    p.vy = Math.min(p.vy + GRAV * dt, MAXFALL);
    moveX(p, p.vx * dt); moveY(p, p.vy * dt);
    p.animT += dt;
    updateFeeding(dt, p.x >= target - 1);
    for (const e of enemies) if (!e.alive) e.deadT += dt; // los pisados se terminan de desvanecer
    updateWorld(dt);
    updateCamera(dt);
  } else if (state === 'gameover') {
    deadT += dt;
    for (const q of particles) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    particles = particles.filter(q => q.life > 0);
  }
}

// Boca de mamá (mira a la izquierda) y punto de salida de los pescados desde Simba
// peso mínimo de cada apariencia (para saber si un salto cambia de etapa)
const lookW = look => (look < THIN_LOOKS ? look * 0.34 / THIN_LOOKS : look === THIN_LOOKS ? 0.34 : 0.75);
const momMouth = () => ({ x: mother.x + mother.w / 2 - 20, y: mother.y - 26 });
function updateFeeding(dt, arrived) {
  const F = feed, total = fishes.length;
  F.bounce = Math.max(0, F.bounce - dt * 4);
  F.w = lerp(F.w, F.fed / total, Math.min(1, dt * 5)); // el peso sube suave, no a saltos
  const look = momLook(F.w);
  if (look > F.stage) { // cambio de apariencia: nube "puf", destellos y sonido
    const big = momStage(F.w) !== momStage(lookW(F.stage)); // de etapa (flaca→normal→llenita)
    F.stage = look; SFX.grow();
    const cx = mother.x + mother.w / 2, cy = mother.y - 20;
    puff(cx, cy, big ? 30 : 16, '#ffffff', big ? 70 : 45, big ? 60 : 40, big ? 0.55 : 0.4, big ? 6 : 4);
    puff(cx, cy - 10, big ? 14 : 6, '#fff3b0', 90, 90, 0.7, 3);
    F.flash = big ? 1 : 0.5;
  }
  F.flash = Math.max(0, (F.flash || 0) - dt * 3);
  if (F.phase === 'walk' && arrived) {
    F.phase = fishCount > 0 ? 'feed' : 'done';
    F.toSend = fishCount; F.spawnT = 0.35;
  }
  if (F.phase === 'feed') {
    F.spawnT -= dt;
    if (F.toSend > 0 && F.spawnT <= 0) {
      F.toSend--;
      const m = momMouth();
      F.flying.push({ x0: player.x + player.w / 2 + 8, y0: player.y + 2, x1: m.x, y1: m.y, t: 0, dur: 0.45 });
      F.spawnT = clamp(2.4 / fishCount, 0.11, 0.3); // con muchos pescados la entrega acelera
      beep(700, 900, 0.05, 'triangle', 0.03);
    }
    if (F.toSend === 0 && F.flying.length === 0 && Math.abs(F.w - F.fed / total) < 0.01) {
      F.phase = 'done'; F.doneT = 0; SFX.win();
    }
  }
  for (const f of F.flying) {
    f.t += dt;
    if (f.t >= f.dur) {
      f.done = true; F.fed++; F.bounce = 1; SFX.nom(F.fed);
      const m = momMouth();
      puff(m.x, m.y, 5, '#ffd23f', 40, 40, 0.35, 2);
      if (Math.random() < 0.4) heartBurst(m.x + 10, m.y - 10);
    }
  }
  F.flying = F.flying.filter(f => !f.done);
  if (F.phase === 'done') {
    F.doneT += dt;
    if (Math.random() < dt * (2 + F.w * 5)) heartBurst((player.x + mother.x) / 2 + 10, mother.y - 50);
  }
}

// ---------------- Render ----------------
// El fondo se ancla al suelo: la BASE de su pradera (fila BG_HORIZON de la imagen,
// donde la hierba con flores se junta con la tierra) coincide con el césped jugable.
// Así hierba y flores del fondo crecen a la misma altura que el suelo del nivel.
const BG_HORIZON = 214;
const BG_SINK = 3; // px: la base queda apenas por debajo, tapada por las matas del césped
function drawBackground(cx, groundY) {
  const sky = ctx.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, '#5fd3f5'); sky.addColorStop(1, '#a8ecf7');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  if (ok(A.bg)) {
    const s = VH / A.bg.naturalHeight;
    const w = A.bg.naturalWidth * s, h = VH;
    const y0 = Math.round(groundY + BG_SINK - BG_HORIZON * s);
    // copias alternadas en espejo: los bordes siempre casan y no se ve la costura
    const px = cx * 0.25, i0 = Math.floor(px / w);
    for (let i = i0, x = i0 * w - px; x < VW; i++, x += w) {
      const xr = Math.round(x), wr = Math.ceil(w) + 1;
      if (i % 2 === 0) ctx.drawImage(A.bg, xr, y0, wr, h);
      else { ctx.save(); ctx.translate(xr + wr, y0); ctx.scale(-1, 1); ctx.drawImage(A.bg, 0, 0, wr, h); ctx.restore(); }
    }
  }
  // Bruma atmosférica: aclara y desatura el fondo para separarlo del primer plano
  ctx.fillStyle = 'rgba(214,240,255,0.22)';
  ctx.fillRect(0, 0, VW, VH);
}

// Abismo oscuro bajo el nivel del suelo: hace que los precipicios se lean como tales
// Abismo bajo el nivel del suelo: la hierba y flores del fondo se ven completas en los
// precipicios (su base está a la altura del suelo) y justo debajo empieza la oscuridad.
function drawAbyss(cy) {
  const fadeStart = G * TS - cy + BG_SINK, fadeEnd = fadeStart + 16;
  const g = ctx.createLinearGradient(0, fadeStart, 0, fadeEnd);
  g.addColorStop(0, 'rgba(12,8,28,0.35)');
  g.addColorStop(0.5, 'rgba(12,8,28,0.85)');
  g.addColorStop(1, '#07050f');
  ctx.fillStyle = g;
  ctx.fillRect(0, fadeStart, VW, fadeEnd - fadeStart);
  ctx.fillStyle = '#07050f';
  ctx.fillRect(0, fadeEnd, VW, VH - fadeEnd);
}

function drawTiles(cx, cy) {
  const c0 = Math.floor(cx / TS), c1 = Math.ceil((cx + VW) / TS);
  const r0 = Math.floor(cy / TS), r1 = Math.ceil((cy + VH) / TS);
  const T = A.tiles;
  const useWang = T && ok(T.wang_0);
  if (useWang) {
    // Rejilla dual: cada tile Wang se dibuja en un vértice y sus 4 esquinas
    // son las 4 celdas que lo rodean (bit = esquina vacía: SE=1, SW=2, NE=4, NW=8)
    const solidAt = (c, r) => {
      c = clamp(c, 0, COLS - 1);
      if (r >= ROWS) r = ROWS - 1;
      return r >= 0 && grid[r][c] === SOLID;
    };
    for (let r = r0; r <= r1 + 1; r++) for (let c = c0; c <= c1 + 1; c++) {
      const n = (solidAt(c, r) ? 0 : 1) | (solidAt(c - 1, r) ? 0 : 2) | (solidAt(c, r - 1) ? 0 : 4) | (solidAt(c - 1, r - 1) ? 0 : 8);
      if (n === 15) continue;
      const im = T['wang_' + n];
      if (ok(im)) ctx.drawImage(im, c * TS - TS / 2 - cx, r * TS - TS / 2 - cy, TS, TS);
    }
  }
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const t = tile(c, r);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const x = c * TS - cx, y = r * TS - cy;
    if (t === SOLID) {
      if (useWang) continue;
      const top = tile(c, r - 1) !== SOLID;
      {
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = '#7a4d22'; ctx.fillRect(x + 4, y + 10, 6, 4); ctx.fillRect(x + 20, y + 22, 5, 4);
        if (top) { ctx.fillStyle = '#4caf50'; ctx.fillRect(x, y, TS, 9); ctx.fillStyle = '#7ed957'; ctx.fillRect(x, y, TS, 3); }
      }
    } else if (t === ONEWAY) {
      // Tablón de madera (se atraviesa desde abajo)
      ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x, y, TS, 12);
      ctx.fillStyle = '#a0672e'; ctx.fillRect(x, y, TS, 9);
      ctx.fillStyle = '#c98a45'; ctx.fillRect(x, y, TS, 3);
      ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x + TS - 2, y + 2, 2, 7);
      if (tile(c - 1, r) !== ONEWAY) { ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x + 4, y + 12, 3, 6); }
      if (tile(c + 1, r) !== ONEWAY) { ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x + TS - 7, y + 12, 3, 6); }
    }
  }
}

function drawFish(f, cx, cy) {
  if (f.taken) return;
  const x = f.x - cx + 8, y = f.y - cy + 7 + Math.sin(f.t * 4) * 2;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = '#1b1b2f';
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-12, -6); ctx.lineTo(-12, 6); ctx.fill();
  ctx.fillStyle = '#ffb703';
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-11, -5); ctx.lineTo(-11, 5); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.fillRect(-2, -3, 5, 2);
  ctx.fillStyle = '#1b1b2f'; ctx.fillRect(3, -2, 2, 2);
  ctx.restore();
}

function drawHeart(x, y, s, fill) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 3); ctx.bezierCurveTo(0, 0, -5, -1, -5, 2.5); ctx.bezierCurveTo(-5, 5, -2, 7, 0, 9);
  ctx.bezierCurveTo(2, 7, 5, 5, 5, 2.5); ctx.bezierCurveTo(5, -1, 0, 0, 0, 3);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 1 / s * 1.5; ctx.strokeStyle = '#2a0f14'; ctx.stroke();
  ctx.restore();
}

function drawCheckpoint(cx, cy) {
  const x = Math.round(checkpoint.x - cx), y = G * TS - cy;
  ctx.fillStyle = '#5b5b5b'; ctx.fillRect(x, y - 64, 4, 64);
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x - 3, y - 4, 10, 4);
  const wave = Math.sin(timeT * 6) * 2;
  ctx.fillStyle = checkpoint.active ? '#4ade80' : '#d1d5db';
  ctx.beginPath(); ctx.moveTo(x + 4, y - 62); ctx.lineTo(x + 30, y - 54 + wave); ctx.lineTo(x + 4, y - 44); ctx.fill();
  // huellita
  ctx.fillStyle = checkpoint.active ? '#166534' : '#6b7280';
  ctx.beginPath(); ctx.arc(x + 13, y - 52, 3, 0, Math.PI * 2); ctx.fill();
  [[-3, -5], [2, -6], [6, -3]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + 13 + dx, y - 52 + dy, 1.3, 0, Math.PI * 2); ctx.fill(); });
}

function groundShadow(x, y, rx) {
  ctx.fillStyle = 'rgba(30,40,30,0.28)';
  ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, 3.5, 0, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer(cx, cy) {
  const p = player;
  if (p.invuln > 0 && state === 'play' && Math.floor(p.invuln * 12) % 2 === 0) return;
  const fx = p.x + p.w / 2 - cx, fy = p.y + p.h - cy + 2; // +2: patas hundidas en el césped
  const flip = p.facing < 0;
  let f = null;
  const run = anim(A.hero, 'run'), jump = anim(A.hero, 'jump'), idle = anim(A.hero, 'idle');
  if (!p.onGround && state === 'play') {
    if (jump) {
      // Frame según la velocidad vertical (subida → ápice → caída)
      const n = jump.frames.length;
      const t = clamp((p.vy + JUMP) / (2 * JUMP), 0, 1);
      const i0 = Math.min(3, n - 1), i1 = Math.min(5, n - 1); // frames: 3 impulso, 4 ápice, 5 caída
      f = jump.frames[Math.round(lerp(i0, i1, t))];
    } else if (run) f = run.frames[1 % run.frames.length];
  } else if (Math.abs(p.vx) > 12 && run) {
    const fps = 6 + Math.abs(p.vx) / MAXV * 8;
    f = run.frames[Math.floor(p.animT * fps) % run.frames.length];
  } else if (idle) {
    f = idle.frames[Math.floor(p.animT * idle.fps) % idle.frames.length];
  } else if (run) f = run.frames[0];

  // Sombra de contacto: ancla visualmente a Simba al suelo
  if (p.onGround || state === 'win') groundShadow(fx, fy - 2, 22 * p.sx);
  if (!drawFrame(f, fx, fy, flip, p.sx, p.sy)) {
    // Respaldo si no cargan los sprites
    ctx.save(); ctx.translate(Math.round(fx), Math.round(fy)); ctx.scale(p.sx, p.sy);
    ctx.fillStyle = '#fff'; ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
    ctx.fillStyle = '#2b6cff'; ctx.fillRect(p.facing > 0 ? 6 : -10, -p.h + 6, 4, 4);
    ctx.restore();
  }
}

function drawEnemy(e, cx, cy) {
  let alpha = 1, sy = 1;
  if (!e.alive) { if (e.deadT > 0.5) return; alpha = 1 - e.deadT / 0.5; sy = 0.35; }
  const fx = e.x + e.w / 2 - cx, fy = e.y + e.h - cy + (e.type === 'bat' ? 6 : 1);
  if (e.type === 'dog') {
    const w = anim(A.dog, 'walk');
    const f = w ? w.frames[Math.floor(e.animT * w.fps) % w.frames.length] : null;
    if (drawFrame(f, fx, fy, e.vx < 0, 1, sy, alpha)) return;
  } else if (e.type === 'rat') {
    const bob = e.alive ? Math.abs(Math.sin(e.animT * 14)) * 2 : 0;
    // El sprite de la rata mira a la izquierda: se espeja al ir a la derecha
    if (drawFrame(A.rat, fx, fy - bob, e.vx > 0, 1, sy * (1 - bob * 0.02), alpha)) return;
  } else if (e.type === 'bat') {
    const flap = e.alive ? 1 + Math.sin(e.animT * 18) * 0.12 : 1;
    if (drawFrame(A.bat, fx, fy, e.vx > 0, 1, sy * flap, alpha)) return;
  }
  // Respaldo
  ctx.globalAlpha = alpha;
  ctx.fillStyle = e.type === 'dog' ? '#8b5a2b' : e.type === 'bat' ? '#7b3fa0' : '#777';
  ctx.fillRect(Math.round(fx - e.w / 2), Math.round(fy - e.h * sy), e.w, e.h * sy);
  ctx.globalAlpha = 1;
}

function drawMother(cx, cy) {
  const fx = mother.x + mother.w / 2 - cx, fy = mother.y - cy + 1;
  // Peso 0..1 (pescados entregados / total):
  //   etapa flaquita -> sprite delgado, estrechado y ensanchándose poco a poco
  //   después        -> sprite peludo con idle, de 86% a 110% de ancho
  const w = feed.w, idle = anim(A.mother, 'idle');
  let f, sx, sy = 1;
  const look = momLook(w);
  if (look < THIN_LOOKS && ok(A.motherThin[look])) {
    f = A.motherThin[look];                       // flaquita: cintura metida, patas largas
    sx = 1;
    sy = 1 + Math.sin(mother.animT * 2.4) * 0.012; // respiración suave
  } else {
    f = idle ? idle.frames[Math.floor(mother.animT * idle.fps) % idle.frames.length] : null;
    if (look === THIN_LOOKS) { sx = lerp(0.92, 1.04, (w - 0.34) / 0.41); }          // normal
    else { const k = clamp((w - 0.75) / 0.25, 0, 1); sx = lerp(1.06, 1.2, k); sy = lerp(1, 1.06, k); } // llenita
  }
  // rebote al tragar cada pescado
  const b = feed.bounce;
  groundShadow(fx, fy - 2, 24 * sx);
  if (!drawFrame(f, fx, fy, true, sx * (1 + b * 0.12), sy * (1 - b * 0.1))) {
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(Math.round(fx - 25), Math.round(fy - 40), 50, 40);
  }
  if (feed.flash > 0) { // halo de luz cuando cambia de aspecto
    const g = ctx.createRadialGradient(fx, fy - 22, 4, fx, fy - 22, 46);
    g.addColorStop(0, `rgba(255,250,220,${0.75 * feed.flash})`); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g; ctx.fillRect(fx - 50, fy - 72, 100, 100);
  }
  // pescados volando de Simba a mamá (en arco)
  for (const q of feed.flying) {
    const u = clamp(q.t / q.dur, 0, 1);
    const x = lerp(q.x0, q.x1, u), y = lerp(q.y0, q.y1, u) - Math.sin(u * Math.PI) * 42;
    drawFish({ x: x - 8, y: y - 7, t: 0, taken: false }, cx, cy);
  }
  // contador de pescados entregados sobre mamá
  if (state === 'win' && feed.phase !== 'walk' && fishCount > 0) {
    drawFish({ x: fx - 30 + cx, y: fy - 78 + cy, t: 0, taken: false }, cx, cy);
    text(feed.fed + '/' + fishes.length, fx - 6, fy - 70, 9, '#ffd23f', 'left');
  }
  // Corazoncito flotando sobre mamá como indicador de meta
  if (state === 'play') drawHeart(Math.round(fx), Math.round(fy - 62 + Math.sin(timeT * 3) * 3), 1.6, '#ff6b9a');
}

function drawParticles(cx, cy) {
  for (const q of particles) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.heart) { ctx.globalAlpha = a; drawHeart(q.x - cx, q.y - cy, 1.3, '#ff6b9a'); ctx.globalAlpha = 1; continue; }
    ctx.globalAlpha = a; ctx.fillStyle = q.color;
    ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.size, q.size);
  }
  ctx.globalAlpha = 1;
}

function text(t, x, y, size, color = '#fff', align = 'center') {
  // Press Start 2P no trae mayúsculas acentuadas: se usan sin tilde (estilo retro)
  t = String(t).replace(/[ÁÉÍÓÚ]/g, c => ({ Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' })[c]);
  ctx.font = `bold ${size}px "Press Start 2P", monospace`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1b1b2f';
  ctx.fillText(t, x + 2, y + 2);
  ctx.fillStyle = color; ctx.fillText(t, x, y);
}

function drawHUD() {
  for (let i = 0; i < 3; i++) drawHeart(18 + i * 22, 12, 1.6, i < hearts ? '#ff4d6d' : '#4b4b5a');
  // pez del HUD
  drawFish({ x: VW - 120 - 8, y: 14 - 7, t: 0, taken: false }, 0, 0);
  text('x' + fishCount + '/' + fishes.length, VW - 104, 15, 10, '#ffd23f', 'left');
  const m = Math.floor(timeT / 60), s = Math.floor(timeT % 60);
  text(m + ':' + String(s).padStart(2, '0'), VW / 2, 15, 10);
  // Barra de progreso hacia mamá
  const prog = clamp(player.x / mother.x, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(VW / 2 - 60, 28, 120, 5);
  ctx.fillStyle = '#ff6b9a'; ctx.fillRect(VW / 2 - 60, 28, 120 * prog, 5);
  if (msgT > 0) { ctx.globalAlpha = Math.min(1, msgT * 2); text(msg, VW / 2, 70, 12, '#fff3b0'); ctx.globalAlpha = 1; }
}

function overlay(alpha) { ctx.fillStyle = `rgba(10,10,30,${alpha})`; ctx.fillRect(0, 0, VW, VH); }

function drawStar(x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.lineWidth = 3; ctx.strokeStyle = '#1b1b2f'; ctx.stroke();
  ctx.fillStyle = filled ? '#ffd23f' : '#4b4b6a'; ctx.fill();
}
// Resultados: panel arriba para que mamá (abajo) se siga viendo bien alimentada
function drawResults(hint2) {
  const k = clamp((feed.doneT - 0.6) * 3, 0, 1); // entrada animada
  const ratio = feed.fed / fishes.length;
  const pw = 440, ph = 182, px = VW / 2 - pw / 2, py = 18 - (1 - k) * 40;
  ctx.globalAlpha = k;
  panel(px, py, pw, ph);
  text(t('win'), VW / 2, py + 24, 16, '#ffb3d1');
  const msgKey = ratio >= 1 ? 'res_full' : ratio >= 0.34 ? 'res_happy' : 'res_hungry';
  text(t(msgKey), VW / 2, py + 50, 9, ratio >= 1 ? '#7cf2c4' : '#fff3b0');
  // estrellas: llegar = 1 · la mitad de los pescados = 2 · todos = 3
  const stars = 1 + (ratio >= 0.5 ? 1 : 0) + (ratio >= 1 ? 1 : 0);
  for (let i = 0; i < 3; i++) {
    const pop = i < stars ? 1 + Math.max(0, Math.sin(clamp(feed.doneT * 4 - 3 - i, 0, Math.PI))) * 0.25 : 1;
    drawStar(VW / 2 + (i - 1) * 46, py + 84, 15 * pop, i < stars);
  }
  const m = Math.floor(timeT / 60), s = Math.floor(timeT % 60);
  text(t('delivered') + '  ' + feed.fed + ' / ' + fishes.length, VW / 2, py + 118, 10, '#ffd23f');
  text(t('time') + '  ' + m + ':' + String(s).padStart(2, '0') + '     ' + t('lives') + '  ' + hearts, VW / 2, py + 140, 9, '#ffffff');
  if (feed.doneT > 1.2 && Math.floor(feed.doneT * 2) % 2 === 0) text(startHint() + ' ' + t('again') + hint2, VW / 2, py + 164, 8, '#fff3b0');
  ctx.globalAlpha = 1;
}

function drawGameScene() {
  const shaking = shake > 0 && state === 'play';
  const sx = shaking ? (Math.random() - 0.5) * shake : 0;
  const sy = shaking ? (Math.random() - 0.5) * shake : 0;
  const cx = Math.round(camX + sx), cy = Math.round(camY + sy);
  drawBackground(cx, G * TS - cy);
  drawAbyss(cy);
  drawTiles(cx, cy);
  drawCheckpoint(cx, cy);
  for (const f of fishes) drawFish(f, cx, cy);
  drawMother(cx, cy);
  for (const e of enemies) drawEnemy(e, cx, cy);
  drawPlayer(cx, cy);
  drawParticles(cx, cy);
  drawHUD();
}

function render(dt) {
  ctx.imageSmoothingEnabled = false;
  hitRects = [];
  // Menú principal (y ajustes abiertos desde él): escena animada propia
  if (state === 'menu' || (state === 'settings' && settingsFrom === 'menu')) {
    drawMenuScene(dt);
    if (state === 'menu') drawMainMenu(); else { overlay(0.25); drawSettings(); }
    return;
  }
  drawGameScene();
  if (state === 'pause') drawPauseMenu();
  if (state === 'settings') { overlay(0.55); drawSettings(); }
  const hint2 = IS_TOUCH ? '' : '   ·   ' + t('esc_menu');
  if (state === 'gameover') {
    overlay(Math.min(0.6, deadT));
    text(t('ohno'), VW / 2, VH / 2 - 30, 28, '#ff6b6b');
    text(t('nolives'), VW / 2, VH / 2 + 5, 11);
    if (deadT > 0.8 && Math.floor(deadT * 2) % 2 === 0) text(startHint() + ' ' + t('retry') + hint2, VW / 2, VH / 2 + 45, 9, '#fff3b0');
  }
  if (state === 'win' && feed.phase === 'done' && feed.doneT > 0.6) drawResults(hint2);
}

// ---------------- Loop ----------------
// Cada frame se simula exactamente su dt, partido en subpasos de ≤1/120 s:
// el movimiento en pantalla es uniforme (sin tirones) y la física sigue estable.
let last = performance.now();
const STEP = 1 / 120;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const blocked = portraitBlocked();
  if (!blocked) {
    menuT += dt;
    const steps = Math.max(1, Math.ceil(dt / STEP - 0.01));
    for (let i = 0; i < steps; i++) update(dt / steps);
  }
  // los controles táctiles solo se muestran durante la partida
  document.documentElement.classList.toggle('playing', state === 'play');
  render(blocked ? 0 : dt);
  requestAnimationFrame(frame);
}
buildLevel();
startGame(); state = 'menu'; // prepara el nivel detrás del menú
applySettings();
requestAnimationFrame(frame);
