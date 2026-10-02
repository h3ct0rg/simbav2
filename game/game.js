'use strict';
// ============================================================
//  Simba: El camino a casa — plataformas 2D en canvas puro
//  Sprites generados con PixelLab (ver ../sprites/manifest.js)
//
//  Archivos: settings.js (ajustes/idiomas) · save.js (progreso) · levels.js (mapas)
//            menu.js (menús) · screens.js (mapa, transiciones) · boss.js (jefes) · game.js (motor)
// ============================================================

const VW = 640, VH = 360, TS = 32;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VW; canvas.height = VH;

// Escala de dibujo interna. El juego se diseña a 640x360 "píxeles lógicos", pero el canvas
// se dibuja a la resolución REAL de la pantalla (× devicePixelRatio): texto, corazones,
// pescados y mapa salen nítidos, y los sprites se amplían por un factor ENTERO (RS), así
// todos sus píxeles miden lo mismo. Antes se estiraba una imagen de 640x360 por un factor
// no entero y todo se veía dentado y de baja calidad.
let RS = 1;
function resize() {
  let s = Math.min(innerWidth / VW, innerHeight / VH);
  const pixel = SETTINGS.display === 'pixel';
  if (pixel && s >= 1) s = Math.floor(s); // "Píxel perfecto": escala entera en pantalla
  const dpr = window.devicePixelRatio || 1;
  RS = Math.max(1, Math.ceil(s * dpr - 0.01));
  if (canvas.width !== VW * RS) { canvas.width = VW * RS; canvas.height = VH * RS; }
  canvas.style.width = Math.floor(VW * s) + 'px';
  canvas.style.height = Math.floor(VH * s) + 'px';
  // el canvas es igual o algo mayor que su tamaño en pantalla: un suavizado leve al reducir
  // da mejor resultado que el "vecino más cercano" (salvo en modo píxel perfecto, donde coincide)
  canvas.style.imageRendering = pixel && Math.abs(VW * RS - VW * s * dpr) < 1 ? 'pixelated' : 'auto';
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
const imgOrNull = p => (p ? img(p) : null);
const A = {
  hero: loadSet(S.hero),
  mother: loadSet(S.mother),
  dog: loadSet(S.dog),
  bruto: loadSet(S.bruto),
  kitten: loadSet(S.kitten),
  bat: imgOrNull(S.bat),
  rat: imgOrNull(S.rat),
  motherThin: Array.isArray(S.mother_thin) ? S.mother_thin.map(img) : [], // de la más flaca a la menos
  bg: imgOrNull(S.bg),
  bgSummer: imgOrNull(S.bg_summer),
  bgAutumn: imgOrNull(S.bg_autumn),
  squirrel: imgOrNull(S.squirrel), boar: imgOrNull(S.boar), hedgehog: imgOrNull(S.hedgehog), leafRaft: imgOrNull(S.leaf_raft),
  bossSquirrel: imgOrNull(S.boss_squirrel), bossSquirrelEat: loadSet(S.boss_squirrel_eat),
  crab: imgOrNull(S.crab), bee: imgOrNull(S.bee), urchin: imgOrNull(S.urchin), turtle: imgOrNull(S.turtle),
  mushroom: imgOrNull(S.mushroom), log: imgOrNull(S.log),
  bossCrab: loadSet(S.boss_crab), // idle (pinzas arriba) · slam (golpe, 8 frames) · stuck (pinzas clavadas)
  caveBg: imgOrNull(S.cave_bg),
  caveDoor: imgOrNull(S.cave_door),
  treeDoor: imgOrNull(S.tree_door),
  lifeIcon: imgOrNull(S.life_icon),
  tiles: S.tiles ? Object.fromEntries(Object.entries(S.tiles).map(([k, v]) => [k, img(v)])) : null,
  tilesSummer: S.tiles_summer ? Object.fromEntries(Object.entries(S.tiles_summer).map(([k, v]) => [k, img(v)])) : null,
  tilesAutumn: S.tiles_autumn ? Object.fromEntries(Object.entries(S.tiles_autumn).map(([k, v]) => [k, img(v)])) : null,
  // Mundo 4 (invierno navideño)
  tilesWinter: S.tiles_winter ? Object.fromEntries(Object.entries(S.tiles_winter).map(([k, v]) => [k, img(v)])) : null,
  bgWinter: imgOrNull(S.bg_winter), village: imgOrNull(S.village),
  xmasTree: imgOrNull(S.xmas_tree), candyCane: imgOrNull(S.candy_cane), gifts: imgOrNull(S.gifts), lamp: imgOrNull(S.lamp),
  thinIce: imgOrNull(S.thin_ice), icicle: imgOrNull(S.icicle),
  sleigh: imgOrNull(S.sleigh), sleighSet: loadSet(S.sleigh_fly),
  snowman: imgOrNull(S.snowman), snowmanSet: loadSet(S.snowman_throw), penguin: imgOrNull(S.penguin),
  elf: imgOrNull(S.elf), elfSet: loadSet(S.elf_wave),
  wolf: loadSet(S.wolf), cub: loadSet(S.cub),
  house: imgOrNull(S.house), interior: imgOrNull(S.interior), momLying: imgOrNull(S.mom_lying), heroLying: imgOrNull(S.hero_lying),
  motherWalk: loadSet(S.mother_walk), interiorWindow: imgOrNull(S.interior_window),
};

// ---------------- Estaciones ----------------
const AUTUMN_HORIZON = 200; // fila de la imagen de otoño donde la hierba toca la tierra
const WINTER_HORIZON = 194; // fila de la imagen de invierno donde la nieve del fondo toca el suelo
// Fondo, terreno, agua y ambiente de cada mundo. `horizon` = fila de la imagen de fondo
// donde la hierba toca la tierra (se alinea con el césped jugable).
const SEASON_CFG = {
  spring: { bg: () => A.bg, tiles: () => A.tiles, horizon: 214, water: false, ambient: 'petals',
    sky: ['#5fd3f5', '#a8ecf7'] },
  summer: { bg: () => A.bgSummer, tiles: () => A.tilesSummer || A.tiles, horizon: 212, water: true, ambient: 'sparkles',
    sky: ['#6fe2f7', '#b8f2f7'], waterfall: { x0: 258, x1: 286, y0: 86, y1: 170 } },
  autumn: { bg: () => A.bgAutumn, tiles: () => A.tilesAutumn || A.tiles, horizon: AUTUMN_HORIZON, water: true, ambient: 'leaves',
    sky: ['#f7b267', '#ffe0a8'], wind: true, sunrays: true },
  winter: { bg: () => A.bgWinter, tiles: () => A.tilesWinter || A.tiles, horizon: WINTER_HORIZON, water: true, ambient: 'snow',
    sky: ['#3b2a6b', '#c9a6e0'], village: true, haze: 'rgba(200,210,255,0.06)' },
};
const curSeason = () => (LV && !['menu', 'settings'].includes(state) ? LV.world.season : 'spring');
const seasonCfg = s => SEASON_CFG[s] || SEASON_CFG.spring;
function anim(set, name) { return set && set.anims[name] && set.anims[name].frames.length ? set.anims[name] : null; }
const frameAt = (an, t, fps) => an.frames[Math.floor(t * (fps || an.fps)) % an.frames.length];

// Dibuja un frame con los pies en (x, y), centrado horizontalmente
function drawFrame(f, x, y, flip, sx = 1, sy = 1, alpha = 1) {
  if (!ok(f)) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(flip ? -sx : sx, sy);
  // reducido (p. ej. Simba en el mapa) se suaviza: con "vecino más cercano" se perdían
  // filas y columnas de píxeles y el sprite se veía deformado
  if (Math.abs(sx) < 0.99) ctx.imageSmoothingEnabled = true;
  ctx.drawImage(f, -Math.round(f.naturalWidth / 2), -f.naturalHeight);
  ctx.restore();
  ctx.imageSmoothingEnabled = false;
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
// Verano: melodía tipo calipso, más rápida y con timbre más suave
const MELODY_SUMMER = [
  79, 0, 76, 79, 81, 79, 76, 0,    74, 76, 79, 0, 76, 74, 72, 0,
  79, 0, 76, 79, 84, 81, 79, 0,    81, 79, 76, 74, 72, 0, 0, 0,
  76, 79, 81, 0, 84, 0, 81, 79,    76, 79, 81, 84, 86, 0, 84, 0,
  81, 0, 79, 76, 79, 81, 79, 76,   74, 76, 72, 0, 72, 0, 0, 0,
];
const BASS_SUMMER = [
  48, 55, 52, 55,  53, 57, 60, 57,  55, 59, 62, 59,  48, 55, 48, 0,
  48, 55, 52, 55,  53, 57, 60, 57,  55, 59, 55, 50,  48, 52, 48, 0,
];
// Otoño: tono menor, más pausado y nostálgico
const MELODY_AUTUMN = [
  69, 0, 72, 76, 74, 72, 71, 0,    72, 74, 76, 0, 74, 72, 69, 0,
  67, 0, 71, 74, 72, 71, 69, 0,    71, 72, 74, 76, 72, 0, 0, 0,
  76, 0, 79, 81, 79, 76, 74, 0,    72, 74, 76, 79, 77, 76, 74, 0,
  72, 0, 71, 69, 71, 72, 71, 67,   69, 71, 69, 0, 69, 0, 0, 0,
];
const BASS_AUTUMN = [
  45, 52, 45, 52,  41, 48, 41, 48,  43, 50, 43, 50,  45, 52, 40, 0,
  45, 52, 45, 52,  41, 48, 41, 48,  43, 50, 47, 50,  45, 52, 45, 0,
];
// Invierno: "Jingle Bells" (tradicional, dominio público) con cascabeles
const MELODY_WINTER = [
  76, 0, 76, 0, 76, 0, 0, 0,   76, 0, 76, 0, 76, 0, 0, 0,   76, 0, 79, 0, 72, 0, 0, 74,   76, 0, 0, 0, 0, 0, 0, 0,
  77, 0, 77, 0, 77, 0, 0, 77,  77, 0, 76, 0, 76, 0, 76, 76, 76, 0, 74, 0, 74, 0, 76, 0,    74, 0, 0, 0, 79, 0, 0, 0,
  76, 0, 76, 0, 76, 0, 0, 0,   76, 0, 76, 0, 76, 0, 0, 0,   76, 0, 79, 0, 72, 0, 0, 74,   76, 0, 0, 0, 0, 0, 0, 0,
  77, 0, 77, 0, 77, 0, 0, 77,  77, 0, 76, 0, 76, 0, 76, 76, 79, 0, 79, 0, 77, 0, 74, 0,    72, 0, 0, 0, 0, 0, 0, 0,
];
const BASS_WINTER = [
  48, 55, 48, 55,  48, 55, 48, 55,  48, 55, 48, 55,  48, 55, 52, 55,
  53, 60, 53, 60,  48, 55, 48, 55,  50, 57, 50, 57,  43, 50, 43, 47,
  48, 55, 48, 55,  48, 55, 48, 55,  48, 55, 48, 55,  48, 55, 52, 55,
  53, 60, 53, 60,  48, 55, 48, 55,  43, 50, 43, 50,  48, 43, 48, 0,
];
// Pelea con el Lobo: ostinato en menor, tenso
const MELODY_WOLF = [
  69, 0, 72, 69, 76, 0, 74, 72,    71, 0, 74, 71, 77, 0, 76, 74,   69, 0, 72, 69, 76, 0, 79, 77,   76, 74, 72, 71, 69, 0, 64, 0,
];
const BASS_WOLF = [45, 45, 45, 45, 44, 44, 44, 44, 41, 41, 43, 43, 45, 40, 45, 0];
// Final en la casita: "Noche de paz" (Gruber, 1818, dominio público), en 6/8, suave
const MELODY_ENDING = [
  79, 0, 0, 81, 79, 0,  76, 0, 0, 0, 0, 0,  79, 0, 0, 81, 79, 0,  76, 0, 0, 0, 0, 0,
  86, 0, 86, 83, 0, 0,  0, 0, 0, 0, 0, 0,   84, 0, 84, 79, 0, 0,  0, 0, 0, 0, 0, 0,
  81, 0, 81, 84, 83, 81, 79, 81, 79, 76, 0, 0, 81, 0, 81, 84, 83, 81, 79, 81, 79, 76, 0, 0,
  86, 0, 86, 89, 86, 83, 84, 0, 0, 88, 0, 0, 84, 79, 76, 79, 77, 74, 72, 0, 0, 0, 0, 0,
];
const BASS_ENDING = [48, 55, 48, 55, 48, 55, 48, 55, 43, 50, 48, 55, 41, 48, 48, 55, 41, 48, 48, 55, 43, 50, 48, 55, 43, 48, 43, 48, 48, 43, 48, 0];
const MUSIC_CFG = {
  spring: { melody: MELODY, bass: BASS, bpm: 132, lead: 'square', transpose: 0 },
  summer: { melody: MELODY_SUMMER, bass: BASS_SUMMER, bpm: 146, lead: 'triangle', transpose: 2 },
  autumn: { melody: MELODY_AUTUMN, bass: BASS_AUTUMN, bpm: 118, lead: 'square', transpose: 0 },
  winter: { melody: MELODY_WINTER, bass: BASS_WINTER, bpm: 150, lead: 'square', transpose: 0, bells: true },
  wolf: { melody: MELODY_WOLF, bass: BASS_WOLF, bpm: 156, lead: 'sawtooth', transpose: 0 },
  ending: { melody: MELODY_ENDING, bass: BASS_ENDING, bpm: 96, lead: 'triangle', transpose: 0, bassEvery: 3, noHat: true, bells: true },
};
const musicCfg = () => {
  if (state === 'ending') return MUSIC_CFG.ending;
  const season = state === 'map' ? WORLDS[Math.floor(map.sel / LEVELS_PER_WORLD)].season : curSeason();
  if (season === 'winter' && boss && boss.type === 'wolf' && arena && arena.active && !arena.done && ['play', 'dying', 'pause'].includes(state)) return MUSIC_CFG.wolf;
  return MUSIC_CFG[season] || MUSIC_CFG.spring;
};
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
      const m = musicCfg(), BEAT = 60 / m.bpm / 2; // duración de una corchea
      const i = musicStep % m.melody.length;
      if (m.melody[i]) note(midi(m.melody[i] + m.transpose), musicNext, BEAT * 0.9, m.lead, m.lead === 'square' ? 0.05 : m.lead === 'sawtooth' ? 0.03 : 0.09);
      const be = m.bassEvery || 2;
      if (i % be === 0) {
        const b = m.bass[(i / be) % m.bass.length];
        if (b) note(midi(b + m.transpose), musicNext, BEAT * be * 0.9, 'triangle', 0.14);
      }
      if (i % 2 === 1 && !m.noHat) hat(musicNext, 0.035);
      // cascabeles: un tintineo agudo en cada tiempo fuerte
      if (m.bells && i % (be * 2) === 0) { note(2637, musicNext, 0.08, 'sine', 0.02); note(3136, musicNext + 0.03, 0.06, 'sine', 0.015); }
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
  die: () => [523, 440, 349, 262, 196].forEach((f, i) => beep(f, f * 0.97, 0.16, 'square', 0.05, i * 0.13)),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => beep(f, f, 0.2, 'triangle', 0.08, i * 0.15)),
  over: () => [392, 330, 262, 196].forEach((f, i) => beep(f, f * 0.98, 0.25, 'square', 0.05, i * 0.22)),
  oneup: () => [784, 988, 1175, 1568, 1319, 1568].forEach((f, i) => beep(f, f, 0.09, 'square', 0.05, i * 0.07)),
  door: () => { beep(260, 520, 0.18, 'triangle', 0.06); beep(390, 780, 0.18, 'triangle', 0.05, 0.08); },
  talk: () => beep(880 + Math.random() * 200, 700, 0.03, 'square', 0.025),
  bark: () => { beep(240, 120, 0.12, 'sawtooth', 0.07); beep(220, 110, 0.12, 'sawtooth', 0.07, 0.16); },
  thud: () => { beep(140, 40, 0.35, 'sawtooth', 0.09); beep(90, 30, 0.4, 'square', 0.06, 0.02); },
  bossHit: () => { beep(700, 200, 0.2, 'square', 0.08); beep(350, 90, 0.3, 'sawtooth', 0.06, 0.05); },
  nom: n => { const f = 420 + Math.min(n, 30) * 18; beep(f, f * 0.7, 0.08, 'square', 0.05); beep(f * 1.5, f * 1.2, 0.06, 'triangle', 0.04, 0.05); },
  grow: () => [659, 880, 1175].forEach((f, i) => beep(f, f, 0.1, 'triangle', 0.07, i * 0.07)),
  move: () => beep(660, 660, 0.05, 'square', 0.035),
  select: () => { beep(784, 784, 0.07, 'square', 0.05); beep(1175, 1175, 0.1, 'square', 0.05, 0.06); },
  tick: () => beep(523, 523, 0.04, 'triangle', 0.05),
  backSnd: () => beep(523, 330, 0.1, 'square', 0.04),
  boing: () => { beep(180, 720, 0.22, 'triangle', 0.09); beep(360, 1100, 0.18, 'sine', 0.05, 0.03); },
  splash: () => { beep(900, 120, 0.35, 'sawtooth', 0.04); beep(500, 80, 0.4, 'triangle', 0.05, 0.05); },
  prick: () => beep(1400, 500, 0.12, 'square', 0.06),
  squeak: () => { beep(1500, 1900, 0.06, 'square', 0.04); beep(1700, 1300, 0.06, 'square', 0.04, 0.07); },
  plop: () => { beep(420, 120, 0.25, 'sine', 0.08); beep(900, 300, 0.15, 'triangle', 0.04, 0.05); },
  geyser: () => beep(200, 900, 0.5, 'sawtooth', 0.03),
  wind: () => { beep(300, 500, 0.9, 'sine', 0.035); beep(320, 260, 0.9, 'triangle', 0.025, 0.2); },
  snort: () => { beep(160, 90, 0.18, 'sawtooth', 0.07); beep(180, 100, 0.15, 'sawtooth', 0.06, 0.2); },
};
Object.assign(SFX, WINTER_SFX); // sonidos del mundo 4 (winter.js)

// ---------------- Input ----------------
const keys = {};
const touch = { axis: 0, axisY: 0, jump: false }; // ejes -1..1 del joystick virtual
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
  if (state === 'map') { mapKey(code); return; }
  if (state === 'choice') { choiceKey(code); return; }
  if (JUMP_CODES.includes(code)) pressJump();
  if (code === 'Enter') pressStart();
  if ((code === 'ArrowDown' || code === 'KeyS') && state === 'play') tryDoor();
  if ((code === 'KeyP' || code === 'Escape') && state === 'play') openPause();
  if (code === 'Escape' && (state === 'gameover' || state === 'clear')) pressStart();
}
function pressJump() {
  if (state === 'play') player.jumpBuffer = 0.13;
  else pressStart();
}
// "Aceptar" en cualquier pantalla que no sea un menú
function pressStart() {
  if (state === 'intro' && introT > 0.4) state = 'play';
  else if (state === 'talk') advanceTalk();
  else if (state === 'clear' && clearT > 0.8) finishClear();
  else if (state === 'win' && feed.phase === 'done' && feed.doneT > 1.2) finishWorld();
  else if (state === 'gameover' && deadT > 0.8) gameOverContinue();
  else if (state === 'ending') endingPress();
  else if (state === 'map') mapPlay();
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
let JR = 46; // radio útil del joystick en px (se ajusta al tamaño real del joystick)
let joyId = null, joyCx = 0, joyCy = 0, joyDown = false;
function moveJoy(t) {
  let dx = t.clientX - joyCx, dy = t.clientY - joyCy;
  const d = Math.hypot(dx, dy);
  if (d > JR) { dx *= JR / d; dy *= JR / d; }
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  const ax = dx / JR, ay = dy / JR;
  touch.axis = Math.abs(ax) < 0.22 ? 0 : ax; // zona muerta
  touch.axisY = ay;
  // joystick hacia abajo = entrar por una puerta secreta
  const down = ay > 0.6 && Math.abs(ax) < 0.6;
  if (down && !joyDown && state === 'play') tryDoor();
  joyDown = down;
}
function releaseJoy() {
  joyId = null; touch.axis = 0; touch.axisY = 0; joyDown = false;
  knob.style.transform = 'translate(-50%, -50%)';
  joy.classList.remove('on');
}
if (joy) {
  joy.addEventListener('touchstart', e => {
    e.preventDefault(); unlockAudio(); goFullscreen();
    const t = e.changedTouches[0];
    const r = joy.getBoundingClientRect();
    joyId = t.identifier; joyCx = r.left + r.width / 2; joyCy = r.top + r.height / 2;
    JR = r.width * 0.36; // el joystick cambia de tamaño según la pantalla
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
  if (slotPointerDown(tc.clientX, tc.clientY)) return;
  if (isMenuState()) menuPointer(tc.clientX, tc.clientY);
  else if (state === 'map') mapPointer(tc.clientX, tc.clientY);
  else if (state === 'choice') choicePointer(tc.clientX, tc.clientY);
  else pressStart();
}, { passive: false });
function slotPointerDown(cx_, cy_) {
  const h = hitAt(toCanvas(cx_, cy_));
  if (state === 'slots' && h && h.zone === 'delete') { menuSel = h.idx; slotHoldStart(h.idx); return true; }
  return false;
}
addEventListener('mouseup', () => { if (slotHold && !slotHold.key) slotHoldEnd(); });
addEventListener('touchend', () => { if (slotHold && !slotHold.key) slotHoldEnd(); });
canvas.addEventListener('mousedown', e => {
  unlockAudio();
  if (slotPointerDown(e.clientX, e.clientY)) return;
  if (isMenuState()) menuPointer(e.clientX, e.clientY);
  else if (state === 'map') mapPointer(e.clientX, e.clientY);
  else if (state === 'choice') choicePointer(e.clientX, e.clientY);
  else if (state !== 'play') pressStart();
});
canvas.addEventListener('mousemove', e => {
  if (isMenuState()) menuHover(e.clientX, e.clientY);
  const clickable = (isMenuState() || state === 'map' || state === 'choice') && hitAt(toCanvas(e.clientX, e.clientY));
  canvas.style.cursor = clickable ? 'pointer' : 'default';
});
// Si el móvil se gira a vertical en plena partida, se pausa
addEventListener('resize', () => { if (portraitBlocked() && state === 'play') openPause(); });
const startHint = () => (IS_TOUCH ? t('tap') : t('enter'));

// ---------------- Áreas (nivel principal y salas secretas) ----------------
const SOLID = T_SOLID, ONEWAY = T_ONEWAY;
let LV = null;        // definición del nivel actual (levels.js)
let MAIN = null;      // área principal en juego
let ROOMS = {};       // salas secretas en juego, por id
let AR = null;        // área actual (MAIN o una sala)
let grid, COLS, ROWS = LV_ROWS, G = 9;
function setArea(a) {
  AR = a; grid = a.grid; COLS = a.cols; ROWS = a.rows; G = a.groundRow;
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
      if (t === SOLID || (t === ONEWAY && prevBottom <= r * TS + 0.5 && !(e.dropT > 0))) { e.y = r * TS - e.h; e.vy = 0; e.onGround = true; break; }
    }
  } else if (dy < 0) {
    const r = Math.floor(e.y / TS);
    for (let c = l; c <= rr; c++) if (tile(c, r) === SOLID) { e.y = (r + 1) * TS; e.vy = 0; break; }
  }
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------------- Estado del juego ----------------
let player, particles, checkpoint, mother;
let state = 'menu', hearts = 3, fishCount = 0, timeT = 0, shake = 0, deadT = 0, msgT = 0, msg = '';
let introT = 0, clearT = 0, dieT = 0, doorT = 0, doorTo = null, talk = null, clearInfo = null;
let lifesFound = 0, autosaveT = 0;
let wolfGift = 0; // pescados que Simba compartió con el lobo (se restan de los de mamá)
// Salud: 3 corazones + 1 por cada corazón dorado encontrado (máx. 7).
// Cada 20 pescados se llena la barra de pescado y cura 1 corazón; con la salud llena queda
// guardada (brillando) y cura en cuanto Simba recibe un golpe.
const BASE_HEARTS = 3, FISH_PER_HEART = 20;
const maxHearts = () => Math.min(7, BASE_HEARTS + goldHeartCount());
let fishMeter = 0, healT = 0, heartPop = null, goldPop = null;
function healHeart() {
  if (hearts <= 0 || hearts >= maxHearts() || fishMeter < FISH_PER_HEART) return;
  hearts++; fishMeter = 0;
  heartPop = { i: hearts - 1, t: 0 };
  SFX.grow();
  puff(player.x + player.w / 2, player.y, 14, '#ff9ec0', 60, 70, 0.6, 3);
  heartBurst(player.x + player.w / 2, player.y - 6);
}
let camX = 0, camY = 0;

// Alimentar a mamá (nivel 4): se le entregan los pescados de TODO el mundo
// (la mejor marca de cada nivel anterior + los de este nivel)
let feed;
const newFeed = () => ({ phase: 'walk', bank: 0, total: 1, fed: 0, toSend: 0, w: 0, stage: 0, spawnT: 0, flying: [], bounce: 0, doneT: 0 });
const momStage = w => (w < 0.34 ? 0 : w < 0.75 ? 1 : 2); // 0 flaquita · 1 normal · 2 bien alimentada
// Apariencia visible (0..5): 4 grados de flaquita, luego normal y bien alimentada.
const THIN_LOOKS = 4;
function momLook(w) {
  if (w < 0.34) return Math.min(THIN_LOOKS - 1, Math.floor(w / (0.34 / THIN_LOOKS)));
  return w < 0.75 ? THIN_LOOKS : THIN_LOOKS + 1;
}
const lookW = look => (look < THIN_LOOKS ? look * 0.34 / THIN_LOOKS : look === THIN_LOOKS ? 0.34 : 0.75);

function makePlayer(x, y) {
  return { x, y, w: 30, h: 26, vx: 0, vy: 0, onGround: false, facing: 1, coyote: 0, jumpBuffer: 0,
    invuln: 0, sx: 1, sy: 1, animT: 0, dustT: 0, prevBottom: 0 };
}
const WALK_SPEED = { dog: 62, rat: 105, crab: 80, boar: 55, penguin: 48 };
const WALKER_SIZE = { dog: [38, 28], rat: [28, 18], crab: [30, 22], boar: [40, 30], penguin: [30, 26] };

// Construye el estado jugable de un área a partir de su mapa
function buildArea(rows, isRoom, roomId, style) {
  const a = parseArea(rows, isRoom);
  a.roomId = roomId; a.style = style;
  const d = LV.diff || 1;
  a.enemies = [
    ...a.walkers.map(w => {
      const [ww, hh] = WALKER_SIZE[w.type];
      return { type: w.type, x: w.c * TS + (TS - ww) / 2, y: (w.r + 1) * TS - hh, w: ww, h: hh, vx: -WALK_SPEED[w.type] * d,
        speed: WALK_SPEED[w.type] * d, vy: 0, alive: true, deadT: 0, animT: Math.random() * 3, onGround: false };
    }),
    ...a.bats.map(b => ({ type: b.type, cx: b.c * TS, baseY: b.r * TS, range: (b.type === 'bee' ? 3 : 4) * TS, x: b.c * TS, y: b.r * TS,
      w: b.type === 'bee' ? 26 : 28, h: b.type === 'bee' ? 22 : 20,
      vx: 0, alive: true, deadT: 0, animT: Math.random() * 6, speed: (b.type === 'bee' ? 0.9 : 1.1) * d })),
  ];
  // ardillas: quietas, lanzan bellotas cuando Simba se acerca
  for (const q of a.squirrels) a.enemies.push({ type: 'squirrel', x: q.c * TS + 4, y: (q.r + 1) * TS - 30, w: 24, h: 30, vx: 0, vy: 0,
    alive: true, deadT: 0, animT: Math.random() * 3, throwT: 1 + Math.random(), facing: -1 });
  // hojas gigantes que se hunden (se tratan como plataformas flotantes)
  for (const l of a.leaves) a.movers.push({ axis: 'leaf', c: l.c, r: l.r });
  // géiseres: chorro periódico (desfasados entre sí)
  a.geyserObjs = a.geysers.map((g, i) => ({ x: g.c * TS + TS / 2, y: (g.r + 1) * TS, t: (i * 1.3) % 3.4, active: false }));
  // erizos: pinchan siempre (no se pueden pisar)
  a.urchinObjs = a.urchins.map(u => ({ x: u.c * TS + 3, y: (u.r + 1) * TS - 24, w: 26, h: 24, t: Math.random() * 6 }));
  // hongos saltarines
  a.mushroomObjs = a.mushrooms.map(m => ({ x: m.c * TS + 1, y: (m.r + 1) * TS - 22, w: 30, h: 22, squash: 0 }));
  // troncos que se mueven: 'x' recorre el hueco libre a sus lados (hasta 3 casillas), 'y' sube hasta 3 filas
  a.moverObjs = a.movers.map(m => {
    const free = dir => { let n = 0; while (n < 3) { const c = dir < 0 ? m.c - 1 - n : m.c + 3 + n; if (c < 0 || c >= a.cols || a.grid[m.r][c]) break; n++; } return n; };
    const amp = m.axis === 'x' ? Math.min(free(-1), free(1)) * TS : m.axis === 'leaf' ? 0 : 3 * TS;
    return { axis: m.axis, x0: m.c * TS, y0: m.r * TS, x: m.c * TS, y: m.r * TS, w: 3 * TS, h: 14, amp,
      t: Math.random() * 6, period: m.axis === 'x' ? 2.6 + amp / TS * 0.6 : 3.4, dx: 0, dy: 0,
      leaf: m.axis === 'leaf' ? { st: 'float', t: 0, stand: 0 } : null, solid: true };
  });
  a.fishes = a.fish.map(f => ({ x: f.c * TS + 8, y: f.r * TS + 8, w: 16, h: 14, taken: false, t: Math.random() * 6 }));
  // vidas extra: cada una tiene una clave única y, una vez recogida, no vuelve a aparecer
  a.oneups = a.lifes.map(l => ({ key: `${LV.id}:${roomId || 'main'}:${l.c},${l.r}`, x: l.c * TS + 4, y: l.r * TS + 4, w: 24, h: 24, t: Math.random() * 6 }))
    .filter(o => !SAVE.oneups[o.key]);
  a.doorObjs = a.doors.map(dr => ({ id: dr.id, x: dr.c * TS, y: (dr.r + 1) * TS, style: (LV.rooms[dr.id] || {}).style || 'cave', sparkT: Math.random() * 2 }));
  if (a.exit) a.exitObj = { x: a.exit.c * TS, y: (a.exit.r + 1) * TS };
  buildWinter(a); // hielo fino, carámbanos, muñecos de nieve y decoración navideña
  // corazón dorado del mundo: en la sala sorteada para esta partida, junto a la vida escondida
  if (isRoom && goldSpotHere(roomId) && !(SAVE.goldHearts || {})[LV.world.id]) {
    const l = a.lifes[0] || a.fish[0] || { c: 3, r: a.groundRow - 2 };
    const free = c => c > 0 && c < a.cols - 1 && !a.grid[l.r][c];
    const c = free(l.c - 1) ? l.c - 1 : free(l.c + 1) ? l.c + 1 : l.c;
    a.goldHeart = { x: c * TS + 2, y: l.r * TS + 2, w: 28, h: 28, t: Math.random() * 6, taken: false };
  }
  return a;
}

// Empieza (o reinicia) un nivel
function startLevel(id) {
  LV = levelById(id);
  MAIN = buildArea(LV.map, false, null, null);
  ROOMS = {};
  for (const rid in LV.rooms || {}) ROOMS[rid] = buildArea(LV.rooms[rid].map, true, rid, LV.rooms[rid].style);
  setArea(MAIN);
  const sp = MAIN.spawn || { c: 2, r: G - 1 };
  player = makePlayer(sp.c * TS, (sp.r + 1) * TS - 26);
  hearts = maxHearts(); fishCount = 0; timeT = 0; shake = 0; msgT = 0; lifesFound = 0;
  fishMeter = 0; healT = 0; heartPop = null; goldPop = null;
  particles = [];
  feed = newFeed();
  // varios puntos de control por nivel: se reaparece en el último que se cruzó
  checkpoint = { spawnX: player.x, spawnY: player.y,
    flags: MAIN.checkpoints.map(c => ({ x: c.c * TS, y: (c.r + 1) * TS, active: false })) };
  acorns = []; wind = { t: 5, dir: 1, phase: 'calm', strength: 0 };
  wolfGift = 0; ambient = []; sleigh.active = false; sleigh.t = 6 + Math.random() * 6;
  mother = MAIN.mother ? { x: MAIN.mother.c * TS, y: (MAIN.mother.r + 1) * TS, w: 50, h: 40, animT: 0 } : null;
  MAIN.kitten = MAIN.messenger ? { x: MAIN.messenger.c * TS + 16, y: (MAIN.messenger.r + 1) * TS, animT: 0 } : null;
  setupBoss(MAIN);
  snapCamera();
  introT = 0; state = 'intro';
  if (LV.id === '1-1') flash(IS_TOUCH ? t('tip_touch') : t('tip_keys'), 4);
}
const restartLevel = () => startLevel(LV.id);
const goldSpotHere = roomId => !!(SAVE.goldSpots && SAVE.goldSpots[LV.world.id] === LV.id + ':' + roomId);
const goldHeartRoom = roomId => goldSpotHere(roomId) && !(SAVE.goldHearts || {})[LV.world.id];
function collectGoldHeart(gh) {
  gh.taken = true;
  SAVE.goldHearts = Object.assign(SAVE.goldHearts || {}, { [LV.world.id]: true });
  writeSave();
  hearts = Math.min(maxHearts(), hearts + 1); // el corazón nuevo llega lleno
  goldPop = { t: 0 }; heartPop = { i: maxHearts() - 1, t: 0 };
  SFX.oneup(); SFX.achieve(); shake = 4;
  flash(t('gold_heart'), 3);
  puff(gh.x + 14, gh.y + 14, 30, '#ffd23f', 120, 120, 0.9, 4);
  for (let i = 0; i < 3; i++) heartBurst(gh.x + 14, gh.y);
}
function drawGoldHeart(gh, cx, cy) {
  if (!gh || gh.taken) return;
  const x = gh.x + 14 - cx, y = gh.y + 10 - cy + Math.sin(gh.t * 2.5) * 3;
  const g = ctx.createRadialGradient(x, y + 4, 2, x, y + 4, 34);
  g.addColorStop(0, `rgba(255,220,110,${0.6 + Math.sin(gh.t * 4) * 0.15})`); g.addColorStop(1, 'rgba(255,220,110,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 34, y - 30, 68, 68);
  ctx.strokeStyle = 'rgba(255,240,170,0.55)'; ctx.lineWidth = 1.5; // rayos girando
  for (let i = 0; i < 6; i++) { const a = gh.t * 0.8 + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 14, y + 4 + Math.sin(a) * 14); ctx.lineTo(x + Math.cos(a) * 24, y + 4 + Math.sin(a) * 24); ctx.stroke(); }
  const s = 2.1 * (1 + Math.sin(gh.t * 5) * 0.05);
  drawHeart(x, y - 4 * s / 2, s, '#ffd23f');
  ctx.fillStyle = '#fff7c2'; ctx.fillRect(Math.round(x - 5), Math.round(y - 1), 3, 3); // brillo
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
function updateParticles(dt) {
  for (const q of particles) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  particles = particles.filter(q => q.life > 0);
}

// ---------------- Vida, daño y muerte ----------------
function hurtPlayer(fromX) {
  if (player.invuln > 0 || state !== 'play') return;
  hearts--; shake = 8; SFX.hurt();
  if (hearts > 0 && fishMeter >= FISH_PER_HEART) healT = 1; // la reserva de pescado cura enseguida
  player.invuln = 1.5;
  const away = player.x + player.w / 2 < fromX ? -1 : 1;
  player.vx = away * 260; player.vy = -330;
  puff(player.x + player.w / 2, player.y + player.h / 2, 10, '#ff6b6b', 90, 80);
  if (hearts <= 0) die();
}
// Simba pierde una vida: pequeño salto hacia arriba y cae fuera de la pantalla
function die(fell) {
  if (state !== 'play') return;
  state = 'dying'; dieT = 0; hearts = 0;
  SFX.die();
  player.vx = 0; player.vy = fell ? 0 : -460;
}
function loseLife() {
  SAVE.lives = Math.max(0, SAVE.lives - 1); writeSave();
  if (SAVE.lives <= 0) { state = 'gameover'; deadT = 0; SFX.over(); return; }
  respawn();
  introT = 0; state = 'intro';
}
function respawn() {
  setArea(MAIN);
  player.x = checkpoint.spawnX; player.y = checkpoint.spawnY;
  player.vx = 0; player.vy = 0; player.invuln = 1.5; player.facing = 1; player.splashed = false; player.onMover = null;
  acorns = [];
  hearts = maxHearts(); healT = 0;
  resetBossFight();
  snapCamera();
}
function gameOverContinue() {
  SAVE.lives = START_LIVES; writeSave();
  openMap();
}

// ---------------- Puertas secretas ----------------
function doorUnderPlayer() {
  const px = player.x + player.w / 2, feet = player.y + player.h;
  const near = d => Math.abs(px - (d.x + TS / 2)) < 22 && Math.abs(feet - d.y) < 10;
  if (AR.isRoom) return AR.exitObj && near(AR.exitObj) ? { exit: true } : null;
  return AR.doorObjs.find(near) || null;
}
function tryDoor() {
  if (!player.onGround) return;
  const d = doorUnderPlayer();
  if (!d) { // sin puerta: si está sobre un tablón (o tronco/hoja), lo atraviesa hacia abajo
    const p = player, feetRow = Math.floor((p.y + p.h + 2) / TS);
    const onPlank = [p.x + 4, p.x + p.w - 4].some(x => tile(Math.floor(x / TS), feetRow) === ONEWAY);
    if (onPlank || p.onMover) { p.dropT = 0.22; p.onGround = false; p.onMover = null; p.y += 2; }
    return;
  }
  doorTo = d; doorT = 0; state = 'door'; SFX.door();
}
function updateDoor(dt) {
  const prev = doorT; doorT += dt;
  if (prev < 0.3 && doorT >= 0.3) { // a mitad del fundido se cambia de área
    if (doorTo.exit) {
      const back = AR.roomId; setArea(MAIN);
      const d = MAIN.doorObjs.find(o => o.id === back);
      player.x = d.x + TS / 2 - player.w / 2; player.y = d.y - player.h;
    } else {
      const room = ROOMS[doorTo.id];
      setArea(room);
      const sp = room.spawn || room.exit;
      player.x = sp.c * TS + TS / 2 - player.w / 2; player.y = (sp.r + 1) * TS - player.h;
    }
    player.vx = 0; player.vy = 0;
    snapCamera();
  }
  if (doorT >= 0.6) state = 'play';
}

// ---------------- Update ----------------
// Troncos: se mueven y arrastran a Simba si está encima
function updateMovers(dt) {
  for (const m of AR.moverObjs) {
    const px = m.x, py = m.y;
    m.t += dt;
    const ph = m.t * Math.PI * 2 / m.period;
    if (m.leaf) updateLeaf(m, dt);
    else if (m.thin) updateThinIce(m, dt);
    else if (m.axis === 'x') m.x = m.x0 + Math.sin(ph) * m.amp;
    else m.y = m.y0 - (1 - Math.cos(ph)) / 2 * m.amp;
    m.dx = m.x - px; m.dy = m.y - py;
    if (player.onMover === m && state === 'play') { moveX(player, m.dx); player.y += m.dy; }
  }
}
// Hoja gigante: si Simba se queda encima ~0,8 s empieza a temblar y luego se hunde;
// reaparece flotando a los 2,4 s. El temblor y el oscurecimiento avisan antes de hundirse.
const LEAF_STAND = 0.8, LEAF_SHAKE = 0.55, LEAF_UNDER = 2.4;
function updateLeaf(m, dt) {
  const L = m.leaf, on = player.onMover === m;
  L.t += dt;
  if (L.st === 'float') { m.y = m.y0 + Math.sin(m.t * 2.5) * 1.5; if (on) { L.stand += dt; if (L.stand > LEAF_STAND) { L.st = 'shake'; L.t = 0; } } else L.stand = Math.max(0, L.stand - dt * 0.5); }
  else if (L.st === 'shake') { m.y = m.y0 + Math.sin(L.t * 60) * 1.2; if (L.t > LEAF_SHAKE) { L.st = 'sink'; L.t = 0; SFX.plop(); puff(m.x + m.w / 2, m.y0 + 4, 18, '#bff3ff', 90, 110, 0.6, 4); } }
  else if (L.st === 'sink') { m.y = m.y0 + L.t * 90; m.solid = L.t < 0.12; if (L.t > 0.45) { L.st = 'under'; L.t = 0; } }
  else if (L.st === 'under') { m.solid = false; m.y = m.y0 + 40; if (L.t > LEAF_UNDER) { L.st = 'rise'; L.t = 0; } }
  else if (L.st === 'rise') { m.y = m.y0 + 40 - L.t / 0.4 * 40; if (L.t > 0.4) { L.st = 'float'; L.t = 0; L.stand = 0; m.solid = true; m.y = m.y0; puff(m.x + m.w / 2, m.y0 + 4, 6, '#bff3ff', 40, 40, 0.4, 3); } }
}
function landOnMovers(p) {
  p.onMover = null;
  if (p.vy < 0 || p.dropT > 0) return;
  for (const m of AR.moverObjs) {
    if (!m.solid) continue;
    if (p.x + p.w > m.x + 4 && p.x < m.x + m.w - 4 && p.prevBottom <= m.y + 6 && p.y + p.h >= m.y) {
      p.y = m.y - p.h; p.vy = 0; p.onGround = true; p.onMover = m;
    }
  }
}
// Hongos: rebote enorme (más aún manteniendo el salto)
function bounceMushrooms(p) {
  for (const mu of AR.mushroomObjs) {
    mu.squash = Math.max(0, mu.squash - 0.06);
    // funciona como trampolín: basta con tocar el sombrero sin estar subiendo (también caminando)
    if (p.vy >= 0 && overlap(p, { x: mu.x + 3, y: mu.y, w: mu.w - 6, h: 12 })) {
      p.y = mu.y - p.h; p.vy = inJump() ? -1040 : -920; p.onGround = false; p.coyote = 0; p.jumpBuffer = 0;
      p.spring = 0.7; // el impulso del hongo no se corta al soltar el botón
      p.sx = 0.75; p.sy = 1.3; mu.squash = 1;
      SFX.boing(); puff(mu.x + mu.w / 2, mu.y, 10, '#ff8fb8', 60, 50, 0.4);
    }
  }
}
// Géiseres: reposo 1,6 s → burbujas (aviso) 0,7 s → chorro 1,1 s que lanza a Simba
const GEYSER_IDLE = 1.6, GEYSER_WARN = 0.7, GEYSER_JET = 1.1, GEYSER_H = 4.6 * TS;
function updateGeysers(dt, p) {
  for (const g of AR.geyserObjs) {
    g.t = (g.t + dt) % (GEYSER_IDLE + GEYSER_WARN + GEYSER_JET);
    const wasActive = g.active;
    g.warn = g.t > GEYSER_IDLE && g.t <= GEYSER_IDLE + GEYSER_WARN;
    g.active = g.t > GEYSER_IDLE + GEYSER_WARN;
    if (g.active && !wasActive && Math.abs(g.x - (camX + VW / 2)) < VW) SFX.geyser();
    if (g.warn && Math.random() < dt * 25) puff(g.x + (Math.random() - 0.5) * 16, g.y - 4, 1, '#d6f6ff', 10, 40, 0.4, 3);
    if (g.active && overlap(p, { x: g.x - 14, y: g.y - GEYSER_H, w: 28, h: GEYSER_H })) {
      p.vy = Math.min(p.vy, -680); p.spring = 0.35; p.onGround = false; p.coyote = 0;
    }
  }
}
// Viento de otoño: cada 6-9 s una ráfaga de 2,5 s empuja a Simba. Avisa 1 s antes (hojas + sonido + flecha).
let wind = { t: 4, dir: 1, phase: 'calm', strength: 0 };
function updateWind(dt, p) {
  const cfg = seasonCfg(curSeason());
  const blizzard = blizzardOn();
  if ((!cfg.wind && !blizzard) || AR.isRoom) { wind.strength = 0; return; }
  wind.t -= dt;
  const bossBoost = blizzard ? 1.45 : boss && boss.final && arena && arena.active ? 1.6 : 1;
  if (wind.phase === 'calm' && wind.t <= 0) { wind.phase = 'warn'; wind.t = 1; wind.dir = Math.random() < 0.5 ? -1 : 1; SFX.wind(); }
  else if (wind.phase === 'warn' && wind.t <= 0) { wind.phase = 'gust'; wind.t = 2.5; }
  else if (wind.phase === 'gust' && wind.t <= 0) { wind.phase = 'calm'; wind.t = 6 + Math.random() * 3; }
  const target = wind.phase === 'gust' ? 1 : wind.phase === 'warn' ? 0.25 : 0;
  wind.strength = lerp(wind.strength, target, Math.min(1, dt * 4));
  if (state === 'play' && wind.strength > 0.05) moveX(p, wind.dir * 50 * bossBoost * wind.strength * dt); // se puede contrarrestar caminando
}

// Erizos: pinchan aunque se les salte encima (rebote hacia arriba para escapar)
function touchUrchins(p) {
  for (const u of AR.urchinObjs) {
    u.t += 1 / 120;
    if (p.invuln <= 0 && overlap(p, { x: u.x + 4, y: u.y + 6, w: u.w - 8, h: u.h - 6 })) {
      SFX.prick();
      const fromAbove = p.vy > 0 && p.prevBottom <= u.y + 12;
      hurtPlayer(u.x + u.w / 2);
      if (fromAbove) p.vy = -520;
    }
  }
}

function updatePlayer(dt) {
  const p = player;
  p.prevBottom = p.y + p.h;
  const dir = (inRight() ? 1 : 0) - (inLeft() ? 1 : 0);
  const ice = onIce(p); // en el hielo cuesta arrancar y aún más frenar
  const accel = p.onGround ? 2400 * (ice ? ICE_ACCEL : 1) : 1600;
  if (dir) {
    const turning = p.vx !== 0 && Math.sign(p.vx) !== dir; // giro rápido
    p.vx += dir * accel * dt * (turning && !ice ? 1.8 : 1);
    p.facing = dir;
  } else {
    const dec = (p.onGround ? 2600 * (ice ? ICE_DECEL : 1) : 700) * dt;
    p.vx = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec;
  }
  // Joystick analógico: inclinarlo poco = caminar, a fondo = correr
  const maxV = touch.axis ? MAXV * clamp(Math.abs(touch.axis) * 1.25, 0.45, 1) : MAXV;
  p.vx = clamp(p.vx, -maxV, maxV);
  if (ice && Math.abs(p.vx) > 120 && Math.random() < dt * 20) puff(p.x + p.w / 2, p.y + p.h, 1, '#e6f8ff', 25, 10, 0.3, 2); // destellos de hielo

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
  p.spring = Math.max(0, (p.spring || 0) - dt);
  p.dropT = Math.max(0, (p.dropT || 0) - dt);
  if (p.vy < 0 && !inJump() && p.spring <= 0) g *= 2.6;
  else if (Math.abs(p.vy) < 70 && inJump()) g *= 0.55;
  else if (p.vy > 0) g *= 1.15;
  p.vy = Math.min(p.vy + g * dt, MAXFALL);

  const wasGround = p.onGround;
  moveX(p, p.vx * dt);
  moveY(p, p.vy * dt);
  landOnMovers(p);
  bounceMushrooms(p);
  touchUrchins(p);
  updateGeysers(dt, p);
  updateWind(dt, p);
  if (state !== 'play') return;
  // salpicadura al caer al agua (verano)
  if (seasonCfg(curSeason()).water && !p.splashed && p.y + p.h > G * TS + 18 && tile(Math.floor((p.x + p.w / 2) / TS), G) === 0) {
    p.splashed = true; SFX.splash();
    puff(p.x + p.w / 2, G * TS + 18, 22, '#bff3ff', 80, 140, 0.6, 4);
  }
  if (!wasGround && p.onGround) {
    p.sx = 1.25; p.sy = 0.78;
    puff(p.x + p.w / 2, p.y + p.h, 8, '#e8dcc0', 70, 25, 0.35);
  }
  if (p.onGround && Math.abs(p.vx) > 150) { // polvo al correr
    p.dustT -= dt;
    if (p.dustT <= 0) { p.dustT = 0.09; puff(p.x + p.w / 2 - p.facing * 10, p.y + p.h, 1, '#e8dcc0', 15, 15, 0.3, 2); }
  }
  p.sx = lerp(p.sx, 1, Math.min(1, dt * 12));
  p.sy = lerp(p.sy, 1, Math.min(1, dt * 12));
  p.invuln = Math.max(0, p.invuln - dt);
  p.animT += dt;
  updateBreath(dt);

  if (p.y > ROWS * TS + 40) { SFX.fall(); die(true); return; } // precipicio: se pierde una vida
  if (!AR.isRoom) for (const f of checkpoint.flags) {
    if (f.active || p.x <= f.x) continue;
    f.active = true;
    checkpoint.spawnX = f.x; checkpoint.spawnY = f.y - p.h;
    SFX.check(); flash(t('checkpoint'));
    puff(f.x + 8, f.y - 60, 16, '#7cf27c', 80, 80, 0.7);
  }
}

function updateEnemies(dt) {
  const p = player;
  for (const e of AR.enemies) {
    e.animT += dt;
    if (!e.alive) { e.deadT += dt; continue; }
    if (e.type === 'squirrel') { // quieta: mira a Simba y le lanza bellotas si está cerca
      e.facing = p.x < e.x ? -1 : 1;
      const dist = Math.abs(p.x - e.x);
      e.throwT -= dt;
      if (e.throwT <= 0 && dist < 8 * TS && dist > 30 && Math.abs(p.y - e.y) < 5 * TS) {
        e.throwT = 2.4 / (LV.diff || 1); e.throwAnim = 0.25;
        throwAcorn(e.x + e.w / 2, e.y + 4, p, 0.85); SFX.squeak();
      }
    } else if (e.type === 'snowman') updateSnowman(e, dt);
    else if (e.type === 'penguin') updatePenguin(e, dt);
    else if (e.type === 'boar') { // camina despacio; si ve a Simba delante, embiste
      const ahead = (p.x - e.x) * Math.sign(e.vx || -1), sameLevel = Math.abs((p.y + p.h) - (e.y + e.h)) < TS;
      if (!e.charge && (e.cool || 0) <= 0 && ahead > 0 && ahead < 6 * TS && sameLevel) { e.charge = 0.15; SFX.snort(); }
      e.cool = Math.max(0, (e.cool || 0) - dt);
      if (e.charge) {
        e.charge += dt;
        if (e.charge > 0.5) e.vx = Math.sign(e.vx || -1) * 250 * (LV.diff || 1) * 0.8; else e.vx = Math.sign(e.vx || -1) * 1; // resopla y arranca
        if (Math.random() < dt * 25) puff(e.x + e.w / 2, e.y + e.h, 1, '#e8dcc0', 20, 15, 0.3, 3);
        if (e.charge > 2.4) { e.charge = 0; e.cool = 1.2; e.vx = Math.sign(e.vx) * e.speed; }
      }
      e.vy = Math.min(e.vy + GRAV * dt, MAXFALL);
      moveX(e, e.vx * dt);
      moveY(e, e.vy * dt);
      const front = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      const ledge = e.onGround && tile(Math.floor(front / TS), Math.floor((e.y + e.h + 4) / TS)) === 0;
      if (e.hitWall || ledge) { e.vx = (e.hitWall ? -e.hitWall : -Math.sign(e.vx || 1)) * e.speed; e.charge = 0; e.cool = 0.8; }
    } else if (e.type === 'bat' || e.type === 'bee') {
      const nx = e.cx + Math.sin(e.animT * e.speed) * e.range;
      e.vx = (nx - e.x) / dt; e.x = nx;
      e.y = e.type === 'bee' ? e.baseY + Math.sin(e.animT * 2.2) * 26 : e.baseY + Math.sin(e.animT * 3.2) * 14;
    } else {
      e.vy = Math.min(e.vy + GRAV * dt, MAXFALL);
      moveX(e, e.vx * dt);
      moveY(e, e.vy * dt);
      const front = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      const ledge = e.onGround && tile(Math.floor(front / TS), Math.floor((e.y + e.h + 4) / TS)) === 0;
      if (e.hitWall || ledge) e.vx = e.hitWall ? -e.hitWall * e.speed : -Math.sign(e.vx || 1) * e.speed;
      if (e.y > ROWS * TS + 100) e.alive = false;
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
  for (const f of AR.fishes) {
    f.t += dt;
    if (!f.taken && overlap(player, f)) {
      f.taken = true; fishCount++; SFX.fish();
      if (fishMeter < FISH_PER_HEART && ++fishMeter >= FISH_PER_HEART) {
        if (hearts < maxHearts()) healT = Math.max(healT, 0.3); else SFX.check(); // reserva lista
      }
      puff(f.x + 8, f.y + 7, 8, '#ffd23f', 50, 60, 0.4);
    }
  }
  for (const o of AR.oneups) {
    o.t += dt;
    if (!o.taken && overlap(player, o)) {
      o.taken = true; lifesFound++;
      SAVE.lives = Math.min(MAX_LIVES, SAVE.lives + 1);
      SAVE.oneups[o.key] = true; writeSave();
      SFX.oneup(); flash(t('oneup'));
      puff(o.x + 12, o.y + 12, 20, '#fff3b0', 90, 90, 0.7);
    }
  }
  for (const d of AR.doorObjs || []) { // destellos sutiles que delatan la entrada secreta
    d.sparkT -= dt;
    const gold = goldHeartRoom(d.id); // la sala del corazón dorado brilla en dorado
    if (d.sparkT <= 0) { d.sparkT = (gold ? 0.3 : 0.5) + Math.random() * (gold ? 0.6 : 1.2); particles.push({ x: d.x + 6 + Math.random() * 20, y: d.y - 10 - Math.random() * 30, vx: 0, vy: -12, life: 0.9, max: 0.9, color: gold ? '#ffd23f' : '#fff7c2', size: gold ? 3 : 2, g: 0 }); }
  }
  const gh = AR.goldHeart;
  if (gh && !gh.taken) {
    gh.t += dt;
    if (overlap(player, gh) && state === 'play') collectGoldHeart(gh);
  }
  if (healT > 0) { healT -= dt; if (healT <= 0) healHeart(); }
  if (heartPop) { heartPop.t += dt; if (heartPop.t > 0.6) heartPop = null; }
  if (goldPop) { goldPop.t += dt; if (goldPop.t > 2) goldPop = null; }
  updateParticles(dt);
  if (mother) mother.animT += dt;
  if (AR.kitten) AR.kitten.animT += dt;

  if (state === 'play' && !AR.isRoom) {
    // Meta de los niveles 1-3: el gatito mensajero
    const k = MAIN.kitten;
    if (k && player.onGround && Math.abs(player.x + player.w / 2 - k.x) < 56) startTalk();
    // Meta del nivel 4: mamá (solo cuando el jefe ya no está)
    if (mother && bossCleared() && player.x + player.w > mother.x - 34) {
      state = 'win'; SFX.check(); player.vx = 0;
      startFeeding();
    }
  }
  msgT = Math.max(0, msgT - dt);
}

function updateCamera(dt) {
  const p = player;
  let lo = 0, hi = COLS * TS - VW;
  const lock = arenaCameraLock();
  if (lock !== null) lo = hi = lock;
  const tx = clamp(p.x + p.w / 2 - VW / 2 + p.facing * 50, lo, hi);
  const ty = clamp(p.y - VH * 0.55, 0, ROWS * TS - VH);
  camX = lerp(camX, tx, Math.min(1, dt * (lock !== null ? 3 : 5)));
  camY = lerp(camY, ty, Math.min(1, dt * 4));
}
function snapCamera() {
  camX = clamp(player.x + player.w / 2 - VW / 2, 0, Math.max(0, COLS * TS - VW));
  camY = clamp(player.y - VH * 0.55, 0, ROWS * TS - VH);
}

function flash(text, dur = 1.8) { msg = text; msgT = dur; }

// ---------------- Mensajero y fin de nivel ----------------
function startTalk() {
  state = 'talk'; player.vx = 0;
  const lines = (LV.say && (LV.say[SETTINGS.lang] || LV.say.es)) || [];
  talk = { lines, i: 0, t: 0 };
}
function advanceTalk() {
  const cur = talk.lines[talk.i] || '';
  if (talk.t * 40 < cur.length) { talk.t = 999; return; } // primero completa la frase
  talk.i++; talk.t = 0;
  if (talk.i >= talk.lines.length) completeLevel();
}
const levelTotalFish = () => levelFishTotal(LV);
const starsFor = ratio => 1 + (ratio >= 0.5 ? 1 : 0) + (ratio >= 1 ? 1 : 0);
function completeLevel() {
  const total = levelTotalFish();
  const stars = starsFor(fishCount / total);
  recordLevel(LV.id, stars, fishCount);
  clearInfo = { stars, fish: fishCount, total, lifes: lifesFound, time: timeT };
  state = 'clear'; clearT = 0; SFX.win();
}
// al superar un nivel, Simba camina en el mapa desde ese nivel hasta el siguiente
const levelNodeIndex = lv => lv.index + WORLDS.indexOf(lv.world) * LEVELS_PER_WORLD;
function finishClear() { openMap(levelNodeIndex(LV) + 1, levelNodeIndex(LV)); }

// ---------------- Alimentar a mamá (fin de mundo) ----------------
function startFeeding() {
  const w = LV.world;
  const others = w.levels.filter(l => l.id !== LV.id);
  feed.bank = Math.max(0, fishCount + others.reduce((s, l) => s + levelStats(l.id).fish, 0) - wolfGift); // menos los que se compartieron con el lobo
  feed.total = w.levels.reduce((s, l) => s + levelFishTotal(l), 0);
}
function finishWorld() {
  const ratio = feed.fed / feed.total;
  recordLevel(LV.id, starsFor(ratio), fishCount);
  SAVE.worldsDone = Object.assign(SAVE.worldsDone || {}, { [LV.world.id]: true });
  SAVE.mom = Object.assign(SAVE.mom || {}, { [LV.world.id]: Math.max((SAVE.mom || {})[LV.world.id] || 0, ratio) });
  writeSave();
  if (LV.world === WORLDS[WORLDS.length - 1]) { startEnding(); return; } // último mundo: ¡a casa!
  openMap(levelNodeIndex(LV) + 1, levelNodeIndex(LV)); // al mundo siguiente (si ya existe)
}
const momMouth = () => ({ x: mother.x + mother.w / 2 - 20, y: mother.y - 26 });
function updateFeeding(dt, arrived) {
  const F = feed;
  F.bounce = Math.max(0, F.bounce - dt * 4);
  F.w = lerp(F.w, F.fed / F.total, Math.min(1, dt * 5)); // el peso sube suave, no a saltos
  const look = momLook(F.w);
  if (look > F.stage) { // cambio de apariencia: nube "puf", destellos y sonido
    const big = momStage(F.w) !== momStage(lookW(F.stage));
    F.stage = look; SFX.grow();
    const cx = mother.x + mother.w / 2, cy = mother.y - 20;
    puff(cx, cy, big ? 30 : 16, '#ffffff', big ? 70 : 45, big ? 60 : 40, big ? 0.55 : 0.4, big ? 6 : 4);
    puff(cx, cy - 10, big ? 14 : 6, '#fff3b0', 90, 90, 0.7, 3);
    F.flash = big ? 1 : 0.5;
  }
  F.flash = Math.max(0, (F.flash || 0) - dt * 3);
  if (F.phase === 'walk' && arrived) {
    F.phase = F.bank > 0 ? 'feed' : 'done';
    F.toSend = F.bank; F.spawnT = 0.35;
  }
  if (F.phase === 'feed') {
    F.spawnT -= dt;
    if (F.toSend > 0 && F.spawnT <= 0) {
      F.toSend--;
      const m = momMouth();
      F.flying.push({ x0: player.x + player.w / 2 + 8, y0: player.y + 2, x1: m.x, y1: m.y, t: 0, dur: 0.45 });
      F.spawnT = clamp(5 / F.bank, 0.035, 0.3); // la entrega dura como mucho ~5 s
      if (F.bank < 40 || F.toSend % 2 === 0) beep(700, 900, 0.05, 'triangle', 0.03);
    }
    if (F.toSend === 0 && F.flying.length === 0 && Math.abs(F.w - F.fed / F.total) < 0.01) {
      F.phase = 'done'; F.doneT = 0; SFX.win();
    }
  }
  for (const f of F.flying) {
    f.t += dt;
    if (f.t >= f.dur) {
      f.done = true; F.fed++; F.bounce = 1;
      if (F.bank < 40 || F.fed % 2 === 0) SFX.nom(F.fed);
      const m = momMouth();
      puff(m.x, m.y, 5, '#ffd23f', 40, 40, 0.35, 2);
      if (Math.random() < 0.3) heartBurst(m.x + 10, m.y - 10);
    }
  }
  F.flying = F.flying.filter(f => !f.done);
  if (F.phase === 'done') {
    F.doneT += dt;
    if (Math.random() < dt * (2 + F.w * 5)) heartBurst((player.x + mother.x) / 2 + 10, mother.y - 50);
  }
}

// ---------------- Bucle de estados ----------------
function update(dt) {
  shake = Math.max(0, shake - dt * 30); // el temblor decae en cualquier estado
  if (state === 'play') {
    timeT += dt;
    updateAmbient(dt, curSeason());
    updateMovers(dt);
    updatePlayer(dt);
    updateIcicles(dt);
    updateAcorns(dt);
    if (state === 'play') updateEnemies(dt);
    updateArena(dt);
    updateWorld(dt);
    updateCamera(dt);
  } else if (state === 'intro') {
    introT += dt;
    if (introT > 2.4) state = 'play';
  } else if (state === 'dying') {
    dieT += dt;
    if (dieT > 0.35) { player.vy = Math.min(player.vy + GRAV * dt, MAXFALL * 1.4); player.y += player.vy * dt; }
    updateParticles(dt);
    if (dieT > 1.6) loseLife();
  } else if (state === 'door') {
    updateDoor(dt); updateParticles(dt);
  } else if (state === 'talk') {
    const prevChars = Math.floor(talk.t * 40);
    talk.t += dt;
    if (Math.floor(talk.t * 40) > prevChars && talk.t * 40 < (talk.lines[talk.i] || '').length && prevChars % 3 === 0) SFX.talk();
    player.vy = Math.min(player.vy + GRAV * dt, MAXFALL); moveY(player, player.vy * dt);
    player.animT += dt;
    updateParticles(dt);
    if (AR.kitten) AR.kitten.animT += dt;
  } else if (state === 'clear') {
    clearT += dt; updateParticles(dt);
  } else if (state === 'win') {
    // Simba camina solo hasta su mamá y le entrega los pescados
    const p = player, target = mother.x - 40 - p.w;
    p.facing = 1;
    p.vx = p.x < target ? 120 : 0;
    p.vy = Math.min(p.vy + GRAV * dt, MAXFALL);
    moveX(p, p.vx * dt); moveY(p, p.vy * dt);
    p.animT += dt;
    updateFeeding(dt, p.x >= target - 1);
    for (const e of AR.enemies) if (!e.alive) e.deadT += dt;
    updateWorld(dt);
    updateCamera(dt);
  } else if (state === 'choice') {
    updateChoice(dt);
  } else if (state === 'ending') {
    updateEnding(dt);
  } else if (state === 'gameover') {
    deadT += dt; updateParticles(dt);
  } else if (state === 'map') {
    updateMap(dt);
  } else if (state === 'slots') {
    updateSlots(dt);
  }
  savedFlashT = Math.max(0, savedFlashT - dt);
  if (SAVE_SLOT >= 0 && !['menu', 'slots', 'settings', 'pause'].includes(state)) {
    SAVE.playTime = (SAVE.playTime || 0) + dt;
    autosaveT += dt; if (autosaveT > 20) { autosaveT = 0; writeSave(true); }
  }
}

// ---------------- Render ----------------
// El fondo se ancla al suelo: la BASE de su pradera (fila BG_HORIZON de la imagen)
// coincide con el césped jugable; así sus colinas se leen como paisaje lejano.
const BG_SINK = 3; // px: la base queda apenas por debajo, tapada por las matas del césped
function drawBackground(cx, groundY, season = 'spring') {
  const cfg = seasonCfg(season), bg = cfg.bg();
  const sky = ctx.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, cfg.sky[0]); sky.addColorStop(1, cfg.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  if (ok(bg)) {
    const s = VH / bg.naturalHeight;
    const w = bg.naturalWidth * s, h = VH;
    const y0 = Math.round(groundY + BG_SINK - cfg.horizon * s);
    // copias alternadas en espejo: los bordes siempre casan y no se ve la costura
    const px = cx * 0.25, i0 = Math.floor(px / w);
    for (let i = i0, x = i0 * w - px; x < VW; i++, x += w) {
      const xr = Math.round(x), wr = Math.ceil(w) + 1, mirror = i % 2 !== 0;
      if (!mirror) ctx.drawImage(bg, xr, y0, wr, h);
      else { ctx.save(); ctx.translate(xr + wr, y0); ctx.scale(-1, 1); ctx.drawImage(bg, 0, 0, wr, h); ctx.restore(); }
      if (cfg.waterfall) drawWaterfall(cfg.waterfall, xr, y0, s, wr, mirror);
    }
  }
  if (cfg.village) { // invierno: estrellas que titilan, el trineo y el pueblo con sus luces
    drawStarsTwinkle();
    if (state !== 'menu') drawSleigh();
    drawVillage(cx, groundY);
  }
  ctx.fillStyle = cfg.haze || 'rgba(214,240,255,0.1)'; // bruma atmosférica leve (separa fondo y primer plano sin apagar los colores)
  ctx.fillRect(0, 0, VW, VH);
}
// Cascada animada sobre la imagen de fondo: hilos de agua cayendo y espuma en la base
function drawWaterfall(wf, xr, y0, s, wr, mirror) {
  const X = ix => (mirror ? xr + wr - ix * s : xr + ix * s);
  const xa = Math.min(X(wf.x0), X(wf.x1)), xb = Math.max(X(wf.x0), X(wf.x1));
  if (xb < -20 || xa > VW + 20) return;
  const top = y0 + wf.y0 * s, bot = y0 + wf.y1 * s, hgt = bot - top, wid = xb - xa;
  ctx.save();
  ctx.beginPath(); ctx.rect(xa, top, wid, hgt); ctx.clip();
  for (let k = 0; k < 14; k++) {
    const x = xa + ((k * 37) % 100) / 100 * wid;
    const y = top + ((menuT * 110 + k * 53) % (hgt + 30)) - 20;
    ctx.fillStyle = k % 3 ? 'rgba(255,255,255,0.55)' : 'rgba(190,240,255,0.7)';
    ctx.fillRect(Math.round(x), Math.round(y), 2, 12 + (k % 4) * 4);
  }
  ctx.restore();
  // espuma y bruma donde cae el agua
  for (let k = 0; k < 9; k++) {
    const a = menuT * 3 + k * 1.7;
    const r = 4 + (Math.sin(a) + 1) * 3;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.sin(a * 1.3) * 0.15})`;
    ctx.beginPath(); ctx.arc(xa + (k / 8) * wid, bot - 2 + Math.sin(a) * 2, r, 0, Math.PI * 2); ctx.fill();
  }
}

// Partículas de ambiente según la estación (pétalos en primavera, destellos de sol en verano)
let ambient = [];
function updateAmbient(dt, season) {
  const kind = seasonCfg(season).ambient;
  if (AR && AR.isRoom) { ambient = []; return; }
  if (kind === 'snow') { updateSnow(dt, blizzardOn()); updateSleigh(dt); return; }
  if (kind === 'leaves') {
    const COLORS = ['#e8792b', '#c94a1d', '#f2b134', '#a8501f'];
    if (ambient.length < 46 && Math.random() < dt * (14 + wind.strength * 30)) {
      const front = Math.random() < 0.2;
      ambient.push({ k: 'leaf', front, x: Math.random() * (VW + 200) - 100, y: -10, vx: -10 + Math.random() * 20, vy: (front ? 40 : 22) + Math.random() * 20,
        life: 14, ph: Math.random() * 6, rot: Math.random() * 6, size: front ? 5 : 3, color: COLORS[Math.floor(Math.random() * 4)] });
    }
    for (const a of ambient) {
      a.x += (a.vx + wind.dir * wind.strength * (a.front ? 260 : 160)) * dt + Math.sin(a.ph) * 0.6;
      a.y += a.vy * dt; a.ph += dt * 2; a.rot += dt * (2 + wind.strength * 6); a.life -= dt;
    }
    ambient = ambient.filter(a => a.life > 0 && a.y < VH + 10 && a.x > -120 && a.x < VW + 120);
    return;
  }
  if (ambient.length < 18 && Math.random() < dt * 6)
    ambient.push(kind === 'petals'
      ? { k: kind, x: Math.random() * VW, y: -6, vx: 10 + Math.random() * 20, vy: 18 + Math.random() * 16, life: 12, ph: Math.random() * 6 }
      : { k: kind, x: Math.random() * VW, y: 40 + Math.random() * 220, vx: 0, vy: -4, life: 1.6, ph: Math.random() * 6 });
  for (const a of ambient) { a.x += a.vx * dt + Math.sin(a.ph + a.y * 0.05) * 0.3; a.y += a.vy * dt; a.life -= dt; a.ph += dt; }
  ambient = ambient.filter(a => a.life > 0 && a.y < VH + 10);
}
function drawLeafParticle(a) {
  ctx.save(); ctx.translate(Math.round(a.x), Math.round(a.y)); ctx.rotate(a.rot);
  ctx.fillStyle = a.color; ctx.beginPath(); ctx.ellipse(0, 0, a.size, a.size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(80,30,10,0.5)'; ctx.fillRect(-a.size, -0.5, a.size * 2, 1);
  ctx.restore();
}
function drawAmbient(front = true) {
  if (seasonCfg(curSeason()).ambient === 'snow') return drawSnow(front);
  for (const a of ambient) {
    if (a.k === 'leaf') { if (a.front === front) drawLeafParticle(a); continue; }
    if (!front) continue;
    if (a.k === 'petals') { ctx.fillStyle = 'rgba(255,183,213,0.9)'; ctx.fillRect(Math.round(a.x), Math.round(a.y), 3, 2); }
    else {
      const al = Math.sin(clamp(a.life / 1.6, 0, 1) * Math.PI);
      ctx.fillStyle = `rgba(255,248,200,${al * 0.9})`;
      ctx.fillRect(Math.round(a.x) - 2, Math.round(a.y), 5, 1); ctx.fillRect(Math.round(a.x), Math.round(a.y) - 2, 1, 5);
    }
  }
}

// Fondo de las salas secretas (cueva o interior del árbol)
function drawRoomBackground(cx) {
  ctx.fillStyle = '#120c22'; ctx.fillRect(0, 0, VW, VH);
  if (ok(A.caveBg)) {
    const s = Math.max(VW / A.caveBg.naturalWidth, VH / A.caveBg.naturalHeight) * 1.08;
    const w = A.caveBg.naturalWidth * s, h = A.caveBg.naturalHeight * s;
    ctx.drawImage(A.caveBg, Math.round(-(w - VW) / 2 - cx * 0.08), Math.round(VH - h), w, h);
  }
  // el interior del árbol se tiñe de madera cálida
  ctx.fillStyle = AR.style === 'tree' ? 'rgba(120,70,30,0.35)' : 'rgba(20,10,40,0.25)';
  ctx.fillRect(0, 0, VW, VH);
}

// Abismo bajo el nivel del suelo: la hierba del fondo se ve completa en los precipicios
function drawAbyss(cy) {
  if (seasonCfg(curSeason()).water) return drawWater(cy);
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

// Agua en los precipicios (verano): superficie con olas animadas y fondo profundo
function drawWater(cy, cave) {
  const top = G * TS - cy + 18;
  const g = ctx.createLinearGradient(0, top, 0, VH);
  if (cave) { g.addColorStop(0, '#2a6f9a'); g.addColorStop(0.4, '#123c5c'); g.addColorStop(1, '#06182a'); }
  else if (curSeason() === 'autumn') { g.addColorStop(0, '#5aa7c9'); g.addColorStop(0.35, '#2d6f93'); g.addColorStop(1, '#14344f'); }
  else if (curSeason() === 'winter') { g.addColorStop(0, '#6fb6d6'); g.addColorStop(0.3, '#285f86'); g.addColorStop(1, '#0c2140'); } // agua helada
  else { g.addColorStop(0, '#3fd0e0'); g.addColorStop(0.35, '#1c8fb0'); g.addColorStop(1, '#0b4a6b'); }
  ctx.fillStyle = g; ctx.fillRect(0, top, VW, VH - top);
  ctx.fillStyle = curSeason() === 'winter' ? 'rgba(225,245,255,0.85)' : 'rgba(255,255,255,0.75)';
  for (let x = 0; x < VW; x += 4) {
    const y = top + Math.sin(x / 18 + menuT * 3) * 2;
    ctx.fillRect(x, Math.round(y), 4, 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let k = 0; k < 10; k++) ctx.fillRect(((k * 71 + menuT * 20) % VW), top + 10 + (k * 13) % 40, 10, 1);
}

function drawTiles(cx, cy) {
  const c0 = Math.floor(cx / TS), c1 = Math.ceil((cx + VW) / TS);
  const r0 = Math.floor(cy / TS), r1 = Math.ceil((cy + VH) / TS);
  const T = seasonCfg(curSeason()).tiles();
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
  if (AR.ice && AR.ice.size) drawIceSheen(c0, c1, r0, r1, cx, cy);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const t = tile(c, r), x = c * TS - cx, y = r * TS - cy;
    if (t === SOLID && !useWang) {
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x, y, TS, TS);
      if (tile(c, r - 1) !== SOLID) { ctx.fillStyle = '#4caf50'; ctx.fillRect(x, y, TS, 9); }
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

// Superficie de hielo: capa translúcida azulada con brillos que recorren el borde
function drawIceSheen(c0, c1, r0, r1, cx, cy) {
  for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++) for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
    if (!AR.ice.has(r * COLS + c) || tile(c, r - 1) === SOLID) continue;
    const x = c * TS - cx, y = r * TS - cy - 4;
    ctx.fillStyle = 'rgba(170,225,255,0.55)'; ctx.fillRect(x, y, TS, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x, y, TS, 2);
    ctx.fillStyle = 'rgba(90,160,210,0.5)'; ctx.fillRect(x, y + 6, TS, 1);
    const g = (menuT * 40 + c * 37) % 90;
    if (g < TS) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x + g, y + 2, 4, 2); }
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

// Icono de vida (cabecita de Simba). Se usa en el HUD, el mapa y las vidas escondidas.
function drawLifeIcon(x, y, size = 24) {
  if (ok(A.lifeIcon)) {
    ctx.imageSmoothingEnabled = size < A.lifeIcon.naturalWidth; // reducido: suave, no pixelado irregular
    ctx.drawImage(A.lifeIcon, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    ctx.imageSmoothingEnabled = false;
    return;
  }
  const s = size / 24;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s, s);
  ctx.fillStyle = '#1b1b2f';
  ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-8, -12); ctx.lineTo(-2, -7); ctx.lineTo(2, -7); ctx.lineTo(8, -12); ctx.lineTo(10, -2); ctx.arc(0, 1, 10.5, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(-7.5, -10); ctx.lineTo(-2, -6); ctx.lineTo(2, -6); ctx.lineTo(7.5, -10); ctx.lineTo(9, -2); ctx.arc(0, 1, 9, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#ffb3c8'; ctx.fillRect(-7, -8, 2, 3); ctx.fillRect(5, -8, 2, 3);
  ctx.fillStyle = '#2b6cff'; ctx.fillRect(-5, -1, 3, 3); ctx.fillRect(2, -1, 3, 3);
  ctx.fillStyle = '#ff8fb0'; ctx.fillRect(-1, 3, 2, 2);
  ctx.restore();
}
function drawOneup(o, cx, cy) {
  if (o.taken) return;
  const x = o.x + 12 - cx, y = o.y + 12 - cy + Math.sin(o.t * 3) * 3;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 20);
  g.addColorStop(0, `rgba(255,240,170,${0.55 + Math.sin(o.t * 5) * 0.15})`); g.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 20, y - 20, 40, 40);
  drawLifeIcon(x, y, 24);
}

function drawDoor(d, cx, cy) {
  const im = d.style === 'tree' ? A.treeDoor : A.caveDoor;
  const x = d.x + TS / 2 - cx, y = d.y - cy + 4;
  if (d.style !== 'tree' && ok(im)) {
    // el arco del sprite es hueco: se rellena con la oscuridad de la cueva
    const w = im.naturalWidth * 0.5, h = im.naturalHeight * 0.74;
    const g = ctx.createLinearGradient(0, y - h, 0, y);
    g.addColorStop(0, '#05030b'); g.addColorStop(1, '#1a1430');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y - h + w / 2, w / 2, w / 2, 0, Math.PI, 0); ctx.lineTo(x + w / 2, y - 4); ctx.lineTo(x - w / 2, y - 4); ctx.fill();
  }
  if (!drawFrame(im, x, y, false)) {
    ctx.fillStyle = d.style === 'tree' ? '#6b4423' : '#6b6f7a';
    ctx.fillRect(Math.round(x - 26), Math.round(y - 60), 52, 60);
    ctx.fillStyle = '#0d0a14'; ctx.beginPath(); ctx.ellipse(x, y - 14, 13, 18, 0, Math.PI, 0); ctx.fillRect(x - 13, y - 14, 26, 14); ctx.fill();
  }
}
function drawExitDoor(cx, cy) {
  if (!AR.exitObj) return;
  const x = AR.exitObj.x + TS / 2 - cx, y = AR.exitObj.y - cy;
  // portal de luz hacia el exterior
  const g = ctx.createRadialGradient(x, y - 22, 2, x, y - 22, 30);
  g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(1, 'rgba(255,250,210,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 32, y - 56, 64, 56);
  ctx.fillStyle = '#fff7c9'; ctx.beginPath(); ctx.ellipse(x, y - 16, 12, 17, 0, Math.PI, 0); ctx.fillRect(x - 12, y - 16, 24, 16); ctx.fill();
}
// Flechita "↓" sobre Simba cuando puede entrar por una puerta
function drawDoorPrompt(cx, cy) {
  if (state !== 'play' || !player.onGround || !doorUnderPlayer()) return;
  const x = player.x + player.w / 2 - cx, y = player.y - cy - 26 + Math.sin(timeT * 6) * 3;
  ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.moveTo(x - 9, y - 4); ctx.lineTo(x + 9, y - 4); ctx.lineTo(x, y + 8); ctx.fill();
  ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.moveTo(x - 6, y - 2); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x, y + 5); ctx.fill();
  ctx.fillRect(x - 2, y - 10, 4, 8);
}

function drawCheckpoint(cx, cy) {
  if (AR.isRoom) return;
  for (const f of checkpoint.flags) drawFlag(f, cx, cy);
}
function drawFlag(checkpoint, cx, cy) {
  const x = Math.round(checkpoint.x - cx), y = checkpoint.y - cy;
  if (x < -40 || x > VW + 40) return;
  ctx.fillStyle = '#5b5b5b'; ctx.fillRect(x, y - 64, 4, 64);
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x - 3, y - 4, 10, 4);
  const wave = Math.sin(timeT * 6) * 2;
  ctx.fillStyle = checkpoint.active ? '#4ade80' : '#d1d5db';
  ctx.beginPath(); ctx.moveTo(x + 4, y - 62); ctx.lineTo(x + 30, y - 54 + wave); ctx.lineTo(x + 4, y - 44); ctx.fill();
  ctx.fillStyle = checkpoint.active ? '#166534' : '#6b7280'; // huellita
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
  if (state === 'dying') {
    f = jump ? jump.frames[4 % jump.frames.length] : null;
    drawFrame(f, fx, fy, flip, 1, -1); // Simba "de espaldas" mientras cae
    return;
  }
  if (!p.onGround && state === 'play') {
    if (jump) {
      const n = jump.frames.length; // frame según la velocidad vertical (subida → ápice → caída)
      const t = clamp((p.vy + JUMP) / (2 * JUMP), 0, 1);
      f = jump.frames[Math.round(lerp(Math.min(3, n - 1), Math.min(5, n - 1), t))];
    } else if (run) f = run.frames[1 % run.frames.length];
  } else if (Math.abs(p.vx) > 12 && run) {
    f = frameAt(run, p.animT, 6 + Math.abs(p.vx) / MAXV * 8);
  } else if (idle) {
    f = frameAt(idle, p.animT);
  } else if (run) f = run.frames[0];

  if (p.onGround || state === 'win') groundShadow(fx, fy - 2, 22 * p.sx);
  if (!drawFrame(f, fx, fy, flip, p.sx, p.sy)) {
    ctx.save(); ctx.translate(Math.round(fx), Math.round(fy)); ctx.scale(p.sx, p.sy);
    ctx.fillStyle = '#fff'; ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
    ctx.restore();
  }
}

function drawEnemy(e, cx, cy) {
  let alpha = 1, sy = 1;
  if (!e.alive) { if (e.deadT > 0.5) return; alpha = 1 - e.deadT / 0.5; sy = 0.35; }
  const fx = e.x + e.w / 2 - cx, fy = e.y + e.h - cy + (e.type === 'bat' ? 6 : 1);
  if (fx < -80 || fx > VW + 80) return;
  if (drawWinterEnemy(e, fx, fy, sy, alpha)) return;
  if (e.type === 'dog') {
    const w = anim(A.dog, 'walk');
    if (w && drawFrame(frameAt(w, e.animT), fx, fy, e.vx < 0, 1, sy, alpha)) return;
  } else if (e.type === 'rat') {
    const bob = e.alive ? Math.abs(Math.sin(e.animT * 14)) * 2 : 0;
    // El sprite de la rata mira a la izquierda: se espeja al ir a la derecha
    if (drawFrame(A.rat, fx, fy - bob, e.vx > 0, 1, sy * (1 - bob * 0.02), alpha)) return;
  } else if (e.type === 'bat') {
    const flap = e.alive ? 1 + Math.sin(e.animT * 18) * 0.12 : 1;
    if (drawFrame(A.bat, fx, fy, e.vx > 0, 1, sy * flap, alpha)) return;
  } else if (e.type === 'bee') {
    const buzz = e.alive ? Math.sin(e.animT * 40) * 1 : 0; // zumbido
    if (drawFrame(A.bee, fx, fy + buzz, e.vx > 0, 1, sy, alpha)) return;
  } else if (e.type === 'squirrel') {
    e.throwAnim = Math.max(0, (e.throwAnim || 0) - 1 / 60);
    const sq = e.throwAnim > 0 ? 0.9 : 1 + Math.sin(e.animT * 3) * 0.02;
    if (drawFrame(A.squirrel, fx, fy, e.facing > 0, 2 - sq, sq * sy, alpha)) return;
  } else if (e.type === 'boar') {
    const bob = e.alive ? Math.abs(Math.sin(e.animT * (e.charge > 0.5 ? 18 : 8))) * 2 : 0;
    if (drawFrame(A.boar, fx, fy - bob, e.vx > 0, 1, sy, alpha)) return;
  } else if (e.type === 'crab') {
    const bob = e.alive ? Math.abs(Math.sin(e.animT * 16)) * 2 : 0; // patitas rápidas
    if (drawFrame(A.crab, fx, fy - bob, false, 1, sy, alpha)) return;
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = { dog: '#8b5a2b', bat: '#7b3fa0', bee: '#f2c641', crab: '#d64933', squirrel: '#c0582b', boar: '#6b4a2f' }[e.type] || '#777';
  ctx.fillRect(Math.round(fx - e.w / 2), Math.round(fy - e.h * sy), e.w, e.h * sy);
  ctx.globalAlpha = 1;
}

function drawMushroom(mu, cx, cy) {
  const x = mu.x + mu.w / 2 - cx, y = mu.y + mu.h - cy + 2;
  const sq = mu.squash, sx = 1 + sq * 0.25, sy = 1 - sq * 0.3;
  if (drawFrame(A.mushroom, x, y, false, sx, sy)) return;
  ctx.fillStyle = '#f5f0e6'; ctx.fillRect(Math.round(x - 5), Math.round(y - 12 * sy), 10, 12 * sy);
  ctx.fillStyle = '#e53950'; ctx.beginPath(); ctx.ellipse(x, y - 12 * sy, 16 * sx, 10 * sy, 0, Math.PI, 0); ctx.fill();
}
function drawUrchin(u, cx, cy) {
  const x = u.x + u.w / 2 - cx, y = u.y + u.h - cy + 2, pulse = 1 + Math.sin(u.t * 4) * 0.04;
  if (drawFrame(A.urchin, x, y, false, pulse, pulse)) return;
  ctx.fillStyle = '#7b3fa0'; ctx.beginPath(); ctx.arc(x, y - 12, 12, 0, Math.PI * 2); ctx.fill();
}
function drawGeyser(g, cx, cy) {
  const x = g.x - cx, y = g.y - cy;
  if (x < -40 || x > VW + 40) return;
  ctx.fillStyle = '#4a3a30'; ctx.beginPath(); ctx.ellipse(x, y - 2, 15, 5, 0, 0, Math.PI * 2); ctx.fill(); // boca de roca
  ctx.fillStyle = '#1d3a4a'; ctx.beginPath(); ctx.ellipse(x, y - 3, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (!g.active) return;
  const k = clamp((g.t - GEYSER_IDLE - GEYSER_WARN) / 0.15, 0, 1), h = GEYSER_H * k;
  const grd = ctx.createLinearGradient(0, y - h, 0, y);
  grd.addColorStop(0, 'rgba(230,250,255,0.95)'); grd.addColorStop(1, 'rgba(120,210,240,0.85)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.moveTo(x - 9, y);
  for (let yy = 0; yy <= h; yy += 8) ctx.lineTo(x - 9 - Math.sin(yy * 0.2 + menuT * 20) * 3 - yy * 0.02, y - yy);
  for (let yy = h; yy >= 0; yy -= 8) ctx.lineTo(x + 9 + Math.sin(yy * 0.2 + menuT * 20 + 1) * 3 + yy * 0.02, y - yy);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 6; i++) { const a = menuT * 9 + i; ctx.beginPath(); ctx.arc(x + Math.sin(a) * 12, y - h + Math.cos(a * 1.3) * 6, 4, 0, Math.PI * 2); ctx.fill(); }
}
function drawMover(m, cx, cy) {
  if (m.leaf) return drawLeafRaft(m, cx, cy);
  if (m.thin) return drawThinIce(m, cx, cy);
  const x = m.x + m.w / 2 - cx, y = m.y - cy + 20 + Math.sin(m.t * 3) * 1; // flota un poco
  if (drawFrame(A.log, x, y, false)) return;
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(Math.round(m.x - cx), Math.round(m.y - cy), m.w, m.h);
  ctx.fillStyle = '#c98a45'; ctx.fillRect(Math.round(m.x - cx), Math.round(m.y - cy), m.w, 3);
}

function drawLeafRaft(m, cx, cy) {
  const L = m.leaf, x = m.x + m.w / 2 - cx, y = m.y - cy + 18;
  if (L.st === 'under') return;
  const warn = L.st === 'shake' || (L.st === 'float' && L.stand > LEAF_STAND * 0.5);
  const alpha = L.st === 'sink' ? 1 - L.t / 0.45 : L.st === 'rise' ? L.t / 0.4 : 1;
  if (!drawFrame(A.leafRaft, x, y, false, 1, 1, alpha)) {
    ctx.globalAlpha = alpha; ctx.fillStyle = '#e8792b'; ctx.beginPath(); ctx.ellipse(x, y - 6, m.w / 2, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (warn) { ctx.fillStyle = 'rgba(60,20,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y - 7, m.w / 2 - 4, 6, 0, 0, Math.PI * 2); ctx.fill(); } // se oscurece: va a hundirse
}
// Rayos de sol dorado (otoño)
function drawSunrays() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 150 + Math.sin(menuT * 0.3 + i) * 20;
    const g = ctx.createLinearGradient(x, 0, x - 160, VH);
    g.addColorStop(0, 'rgba(255,220,140,0.16)'); g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 18, 0); ctx.lineTo(x + 18, 0); ctx.lineTo(x - 140, VH); ctx.lineTo(x - 210, VH); ctx.fill();
  }
  ctx.restore();
}
// Flecha que avisa de una ráfaga de viento
function drawWindHint() {
  if (wind.phase === 'calm' || AR.isRoom || !seasonCfg(curSeason()).wind) return;
  const a = wind.phase === 'warn' ? 0.5 + Math.sin(menuT * 18) * 0.5 : 0.8;
  const x = wind.dir > 0 ? VW - 40 : 40, y = 70;
  ctx.globalAlpha = a; ctx.fillStyle = '#fff3d6';
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 9 * wind.dir;
    ctx.beginPath(); ctx.moveTo(x + ox + wind.dir * 8, y); ctx.lineTo(x + ox - wind.dir * 4, y - 8); ctx.lineTo(x + ox - wind.dir * 4, y + 8); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Gatito mensajero: sentado, con un "!" encima hasta que Simba llega
function drawKitten(cx, cy) {
  const k = AR.kitten;
  if (!k) return;
  const fx = k.x - cx, fy = k.y - cy + 2;
  const sit = anim(A.kitten, 'sit') || anim(A.kitten, 'idle');
  groundShadow(fx, fy - 2, 14);
  if (LV.world.messenger === 'elf') {
    const wave = anim(A.elfSet, 'wave');
    const f = wave ? frameAt(wave, k.animT, 7) : A.elf;
    if (!drawFrame(f, fx, fy, false)) { ctx.fillStyle = '#3aa655'; ctx.fillRect(Math.round(fx - 10), Math.round(fy - 30), 20, 30); }
  } else if (LV.world.messenger === 'hedgehog') {
    if (!drawFrame(A.hedgehog, fx, fy, false)) { ctx.fillStyle = '#8a6a4a'; ctx.fillRect(Math.round(fx - 14), Math.round(fy - 18), 28, 18); }
  } else if (LV.world.messenger === 'turtle') {
    if (!drawFrame(A.turtle, fx, fy + Math.abs(Math.sin(k.animT * 2)) * -1, false)) { ctx.fillStyle = '#4caf50'; ctx.fillRect(Math.round(fx - 16), Math.round(fy - 20), 32, 20); }
  } else if (!(sit && drawFrame(frameAt(sit, k.animT, 5), fx, fy, true))) {
    ctx.fillStyle = '#f2a65a'; ctx.fillRect(Math.round(fx - 12), Math.round(fy - 22), 24, 22);
  }
  if (state === 'play') {
    const y = fy - 52 + Math.sin(timeT * 4) * 3;
    pixRect(fx - 9, y - 11, 18, 22, '#1b1b2f'); pixRect(fx - 7, y - 9, 14, 18, '#ffffff');
    text('!', fx + 1, y + 1, 10, '#ff6b9a');
  }
}

function drawMother(cx, cy) {
  if (!mother || AR.isRoom) return;
  const fx = mother.x + mother.w / 2 - cx, fy = mother.y - cy + 1;
  if (fx < -100 || fx > VW + 100) return;
  // Peso 0..1 (pescados entregados / total del mundo)
  const w = feed.w, idle = anim(A.mother, 'idle');
  let f, sx, sy = 1;
  const look = momLook(w);
  if (look < THIN_LOOKS && ok(A.motherThin[look])) {
    f = A.motherThin[look];                         // flaquita: cintura metida, patas largas
    sx = 1;
    sy = 1 + Math.sin(mother.animT * 2.4) * 0.012;  // respiración suave
  } else {
    f = idle ? frameAt(idle, mother.animT) : null;
    if (look === THIN_LOOKS) sx = lerp(0.92, 1.04, (w - 0.34) / 0.41);                                  // normal
    else { const k = clamp((w - 0.75) / 0.25, 0, 1); sx = lerp(1.06, 1.2, k); sy = lerp(1, 1.06, k); } // llenita
  }
  const b = feed.bounce; // rebote al tragar cada pescado
  groundShadow(fx, fy - 2, 24 * sx);
  if (!drawFrame(f, fx, fy, true, sx * (1 + b * 0.12), sy * (1 - b * 0.1))) {
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(Math.round(fx - 25), Math.round(fy - 40), 50, 40);
  }
  if (feed.flash > 0) { // halo de luz cuando cambia de aspecto
    const g = ctx.createRadialGradient(fx, fy - 22, 4, fx, fy - 22, 46);
    g.addColorStop(0, `rgba(255,250,220,${0.75 * feed.flash})`); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g; ctx.fillRect(fx - 50, fy - 72, 100, 100);
  }
  for (const q of feed.flying) { // pescados volando de Simba a mamá (en arco)
    const u = clamp(q.t / q.dur, 0, 1);
    const x = lerp(q.x0, q.x1, u), y = lerp(q.y0, q.y1, u) - Math.sin(u * Math.PI) * 42;
    drawFish({ x: x - 8, y: y - 7, t: 0, taken: false }, cx, cy);
  }
  if (state === 'win' && feed.phase !== 'walk' && feed.bank > 0) { // contador sobre mamá
    drawFish({ x: fx - 30 + cx, y: fy - 78 + cy, t: 0, taken: false }, cx, cy);
    text(feed.fed + '/' + feed.total, fx - 6, fy - 70, 9, '#ffd23f', 'left');
  }
  if (state === 'play' && bossCleared()) drawHeart(Math.round(fx), Math.round(fy - 62 + Math.sin(timeT * 3) * 3), 1.6, '#ff6b9a');
}

function drawParticles(cx, cy) {
  for (const q of particles) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.heart) { ctx.globalAlpha = a; drawHeart(q.x - cx, q.y - cy, 1.3, '#ff6b9a'); ctx.globalAlpha = 1; continue; }
    if (q.soft) { // vaho: nubecitas redondas que crecen y se desvanecen
      ctx.globalAlpha = a * 0.7; ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(q.x - cx, q.y - cy, q.size * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.fill();
      continue;
    }
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
// Parte un texto en líneas que caben en `maxW` píxeles (con la fuente ya fijada)
function wrapText(str, size, maxW) {
  ctx.font = `bold ${size}px "Press Start 2P", monospace`;
  const words = str.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawHUD() {
  const mh = maxHearts();
  for (let i = 0; i < mh; i++) { // salud (los corazones extra, de los dorados, llevan borde dorado)
    const pop = heartPop && heartPop.i === i ? 1 + Math.sin(heartPop.t / 0.6 * Math.PI) * 0.45 : 1;
    if (i >= BASE_HEARTS) drawHeart(18 + i * 22, 12 - 2.4 * pop, 2.15 * pop, '#ffd23f');
    drawHeart(18 + i * 22, 12, 1.6 * pop, i < hearts ? '#ff4d6d' : '#4b4b5a');
  }
  drawFishMeter(8, 32);
  const lx = 30 + mh * 22;
  drawLifeIcon(lx, 18, 22);                                                                     // vidas
  text('x' + SAVE.lives, lx + 14, 19, 10, '#ffffff', 'left');
  if (goldPop) { // el corazón dorado sube y se suma a la barra de salud
    const k = clamp(goldPop.t / 1.2, 0, 1), tx = 18 + (mh - 1) * 22, ty = 12;
    const x = lerp(VW / 2, tx, k * k), y = lerp(VH / 2 - 30, ty, k * k), s = lerp(5, 1.9, k);
    ctx.globalAlpha = 1 - clamp((goldPop.t - 1.4) / 0.6, 0, 1);
    drawHeart(x, y, s, '#ffd23f');
    ctx.globalAlpha = 1;
  }
  drawFish({ x: VW - 120 - 8, y: 14 - 7, t: 0, taken: false }, 0, 0);
  text('x' + fishCount + '/' + levelTotalFish(), VW - 104, 15, 10, '#ffd23f', 'left');
  const m = Math.floor(timeT / 60), s = Math.floor(timeT % 60);
  text(LV.id + '   ' + m + ':' + String(s).padStart(2, '0'), VW / 2, 15, 10);
  if (bossBarVisible()) drawBossBar();
  else if (!AR.isRoom) { // barra de progreso hacia la meta
    const goal = MAIN.kitten ? MAIN.kitten.x : mother ? mother.x : COLS * TS;
    const prog = clamp(player.x / goal, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(VW / 2 - 60, 28, 120, 5);
    ctx.fillStyle = '#ff6b9a'; ctx.fillRect(VW / 2 - 60, 28, 120 * prog, 5);
  }
  if (msgT > 0) { ctx.globalAlpha = Math.min(1, msgT * 2); text(msg, VW / 2, 70, 11, '#fff3b0'); ctx.globalAlpha = 1; }
}

// Barra de pescado: se llena con 20 pescados y cura 1 corazón. Llena = reserva (brilla).
function drawFishMeter(x, y) {
  const w = 66, k = fishMeter / FISH_PER_HEART, full = fishMeter >= FISH_PER_HEART;
  ctx.save(); ctx.translate(x + 6, y + 3); ctx.scale(0.6, 0.6);
  drawFish({ x: -8, y: -7, t: 0, taken: false }, 0, 0);
  ctx.restore();
  const bx = x + 16;
  ctx.fillStyle = '#1b1b2f'; ctx.fillRect(bx - 1, y - 1, w + 2, 7);
  ctx.fillStyle = '#2c2e5c'; ctx.fillRect(bx, y, w, 5);
  ctx.fillStyle = full ? `rgba(255,${200 + Math.sin(menuT * 8) * 40},90,1)` : '#ffb703';
  ctx.fillRect(bx, y, Math.round(w * k), 5);
  if (full) { // reserva lista: brillo y corazoncito
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(bx + w, y + 2, 1, bx + w, y + 2, 14);
    g.addColorStop(0, 'rgba(255,170,200,0.7)'); g.addColorStop(1, 'rgba(255,170,200,0)');
    ctx.fillStyle = g; ctx.fillRect(bx + w - 14, y - 12, 28, 28);
    ctx.restore();
    drawHeart(bx + w + 8, y - 2, 0.9 + Math.sin(menuT * 6) * 0.08, '#ff6b9a');
  }
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

function drawGameScene() {
  const shaking = shake > 0 && (state === 'play' || state === 'dying');
  const sx = shaking ? (Math.random() - 0.5) * shake : 0;
  const sy = shaking ? (Math.random() - 0.5) * shake : 0;
  const cx = Math.round(camX + sx), cy = Math.round(camY + sy);
  const cfgS = seasonCfg(curSeason());
  if (AR.isRoom) { drawRoomBackground(cx); if (cfgS.water) drawWater(cy, true); }
  else {
    drawBackground(cx, G * TS - cy, curSeason());
    if (cfgS.sunrays) drawSunrays();
    drawAmbient(false); // hojas lejanas, detrás del escenario
    drawAbyss(cy);
  }
  for (const m of AR.moverObjs) drawMover(m, cx, cy);
  drawTiles(cx, cy);
  drawDecor(cx, cy);
  drawIcicles(cx, cy);
  if (AR.isRoom) { ctx.fillStyle = AR.style === 'tree' ? 'rgba(60,30,10,0.4)' : 'rgba(20,16,60,0.45)'; ctx.fillRect(0, 0, VW, VH); } // penumbra de la sala
  drawCheckpoint(cx, cy);
  for (const d of AR.doorObjs || []) drawDoor(d, cx, cy);
  drawExitDoor(cx, cy);
  for (const f of AR.fishes) drawFish(f, cx, cy);
  for (const o of AR.oneups) drawOneup(o, cx, cy);
  drawGoldHeart(AR.goldHeart, cx, cy);
  for (const mu of AR.mushroomObjs) drawMushroom(mu, cx, cy);
  for (const u of AR.urchinObjs) drawUrchin(u, cx, cy);
  for (const g of AR.geyserObjs) drawGeyser(g, cx, cy);
  drawKitten(cx, cy);
  drawMother(cx, cy);
  if (!AR.isRoom) drawBoss(cx, cy);
  for (const e of AR.enemies) drawEnemy(e, cx, cy);
  drawPlayer(cx, cy);
  drawAcorns(cx, cy);
  drawParticles(cx, cy);
  drawWolfDarkness();
  drawAmbient(true);
  drawWindHint();
  drawDoorPrompt(cx, cy);
  drawHUD();
  if (state === 'talk') drawTalk(cx, cy);
  if (state === 'door') overlay(clamp(1 - Math.abs(doorT - 0.3) / 0.3, 0, 1)); // fundido a negro
}

function render(dt) {
  ctx.setTransform(RS, 0, 0, RS, 0, 0); // todo se dibuja en coordenadas lógicas de 640x360
  ctx.imageSmoothingEnabled = false;
  hitRects = [];
  // Menú principal (y ajustes abiertos desde él): escena animada propia
  if (state === 'menu' || state === 'slots' || (state === 'settings' && settingsFrom === 'menu')) {
    drawMenuScene(dt);
    if (state === 'menu') drawMainMenu();
    else if (state === 'slots') { overlay(0.3); drawSlots(); }
    else { overlay(0.25); drawSettings(); }
    return;
  }
  if (state === 'map' || (state === 'settings' && settingsFrom === 'map')) { drawMap(); if (state === 'settings') { overlay(0.5); drawSettings(); } drawSavedBadge(); return; }
  if (state === 'intro') { drawIntro(); return; }
  if (state === 'gameover') { drawGameOver(); return; }
  if (state === 'ending') { drawEnding(); return; }
  drawGameScene();
  if (state === 'pause') drawPauseMenu();
  if (state === 'settings') { overlay(0.55); drawSettings(); }
  if (state === 'clear') drawLevelClear();
  if (state === 'win' && feed.phase === 'done' && feed.doneT > 0.6) drawResults();
  if (state === 'choice') drawChoice();
  drawSavedBadge();
}
function drawSavedBadge() {
  if (savedFlashT <= 0 || SAVE_SLOT < 0) return;
  ctx.globalAlpha = Math.min(1, savedFlashT * 2);
  const x = VW - 96, y = VH - 22;
  pixRect(x - 2, y - 2, 88, 18, '#1b1b2f'); pixRect(x, y, 84, 14, 'rgba(36,38,82,0.92)');
  ctx.strokeStyle = '#7cf2c4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 7, y + 7); ctx.lineTo(x + 10, y + 10); ctx.lineTo(x + 16, y + 4); ctx.stroke();
  text(t('saved'), x + 22, y + 8, 7, '#7cf2c4', 'left');
  ctx.globalAlpha = 1;
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
startLevel(ALL_LEVELS[0].id); state = 'menu'; // prepara un nivel detrás del menú
applySettings();
requestAnimationFrame(frame);
