'use strict';
// ============================================================
//  Progreso guardado en el navegador: 3 RANURAS de partida independientes.
//  Cada ranura se guarda sola (al completar un nivel, recoger una vida, perder una vida...).
//
//  Datos de una partida (SAVE):
//    lives       vidas actuales (3 al empezar, máximo 9)
//    unlocked    cuántos niveles están desbloqueados (en orden)
//    levels      { '1-1': { done, stars, fish } }  (fish = mejor marca)
//    oneups      vidas extra ya recogidas: cada una solo se recoge una vez
//    worldsDone  mundos terminados · mom: peso que alcanzó mamá en cada mundo (0..1)
//    playTime    segundos jugados · lastPlayed: fecha (ms) · mapSel: nodo elegido en el mapa
//  La configuración (brillo, volumen, idioma) es del dispositivo, no de la partida: ver settings.js
// ============================================================

const SLOT_COUNT = 3;
const START_LIVES = 3, MAX_LIVES = 9;
const slotKey = i => 'simba.slot.' + (i + 1);
const LEGACY_KEY = 'simba.save.v1'; // guardado de antes de las ranuras: pasa a la ranura 1

const newSaveData = () => ({ lives: START_LIVES, unlocked: 1, levels: {}, oneups: {}, mapSel: 0,
  worldsDone: {}, mom: {}, playTime: 0, lastPlayed: 0 });
const SAVE = newSaveData();   // partida en curso (se rellena al elegir una ranura)
let SAVE_SLOT = -1;           // ranura activa (-1 = ninguna, p. ej. en el menú principal)
let savedFlashT = 0;          // tiempo que se muestra el aviso "Guardado"

function migrateLegacySave() {
  try {
    const old = localStorage.getItem(LEGACY_KEY);
    if (old && !localStorage.getItem(slotKey(0))) localStorage.setItem(slotKey(0), old);
    if (old) localStorage.removeItem(LEGACY_KEY);
  } catch (e) { /* modo privado */ }
}
migrateLegacySave();

function readSlot(i) {
  try {
    const s = localStorage.getItem(slotKey(i));
    return s ? Object.assign(newSaveData(), JSON.parse(s)) : null;
  } catch (e) { return null; }
}
// Activa una ranura: carga su partida (o empieza una nueva si está vacía)
function selectSlot(i) {
  SAVE_SLOT = i;
  for (const k in SAVE) delete SAVE[k];
  Object.assign(SAVE, readSlot(i) || newSaveData());
  writeSave();
}
// Guarda la partida activa. `silent` = sin el aviso "Guardado" (cambios menores, como mover el cursor del mapa)
function writeSave(silent) {
  if (SAVE_SLOT < 0) return;
  SAVE.lastPlayed = Date.now();
  try { localStorage.setItem(slotKey(SAVE_SLOT), JSON.stringify(SAVE)); } catch (e) { /* modo privado */ }
  if (!silent) savedFlashT = 1.6;
}
function deleteSlot(i) {
  try { localStorage.removeItem(slotKey(i)); } catch (e) { }
  if (SAVE_SLOT === i) SAVE_SLOT = -1;
}

const levelStats = id => SAVE.levels[id] || { done: false, stars: 0, fish: 0 };
function recordLevel(id, stars, fish) {
  const s = levelStats(id);
  SAVE.levels[id] = { done: true, stars: Math.max(s.stars, stars), fish: Math.max(s.fish, fish) };
  const idx = ALL_LEVELS.findIndex(l => l.id === id);
  SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(ALL_LEVELS.length, idx + 2));
  writeSave();
  if (typeof statsLevelUp === 'function') statsLevelUp(); // estadísticas: nivel más avanzado
}
const totalStars = (data = SAVE) => Object.values(data.levels).reduce((s, l) => s + (l.stars || 0), 0);
