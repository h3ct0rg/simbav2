'use strict';
// ============================================================
//  Progreso guardado en el navegador
//    lives     vidas actuales (3 al empezar, máximo 9)
//    unlocked  cuántos niveles están desbloqueados (en orden)
//    levels    { '1-1': { done, stars, fish } }  (fish = mejor marca)
//    oneups    vidas extra ya recogidas: cada una solo se recoge una vez
// ============================================================

const SAVE_KEY = 'simba.save.v1';
const START_LIVES = 3, MAX_LIVES = 9;
const SAVE = loadSave();

function loadSave() {
  const def = { lives: START_LIVES, unlocked: 1, levels: {}, oneups: {}, mapSel: 0 };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch (e) { return def; }
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* modo privado */ }
}
function resetSave() {
  Object.assign(SAVE, { lives: START_LIVES, unlocked: 1, levels: {}, oneups: {}, mapSel: 0 });
  writeSave();
}

const levelStats = id => SAVE.levels[id] || { done: false, stars: 0, fish: 0 };
function recordLevel(id, stars, fish) {
  const s = levelStats(id);
  SAVE.levels[id] = { done: true, stars: Math.max(s.stars, stars), fish: Math.max(s.fish, fish) };
  const idx = ALL_LEVELS.findIndex(l => l.id === id);
  SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(ALL_LEVELS.length, idx + 2));
  writeSave();
}
const totalStars = () => Object.values(SAVE.levels).reduce((s, l) => s + (l.stars || 0), 0);
