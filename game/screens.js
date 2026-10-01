'use strict';
// ============================================================
//  Pantallas: mapa de mundos, transición de nivel, nivel completado,
//  game over, resultados del mundo y diálogo del mensajero.
// ============================================================

// ---------- Mapa de mundos ----------
// 4 regiones (estaciones) de izquierda a derecha, 4 nodos por mundo.
const SEASON = {
  spring: { ground: '#7ccf6b', dark: '#4e9a45', tree: '#ffb7d5', trunk: '#7a4d2a', sky: '#bfefff' },
  summer: { ground: '#f2d16b', dark: '#d1a742', tree: '#53b84a', trunk: '#8a5a2b', sky: '#ffe9a8' },
  autumn: { ground: '#d98a3f', dark: '#a85f26', tree: '#e8582c', trunk: '#6b3f1f', sky: '#ffd2a8' },
  winter: { ground: '#e9f4ff', dark: '#b9d3ea', tree: '#2f6f5a', trunk: '#5a3b24', sky: '#dfeaf7' },
};
const NODE_DY = [0, -34, -6, -46];
const mapNodePos = i => {
  const w = Math.floor(i / LEVELS_PER_WORLD), k = i % LEVELS_PER_WORLD;
  return { x: w * 160 + 32 + k * 33, y: 262 + NODE_DY[k] };
};
const nodeLevel = i => {
  const w = WORLDS[Math.floor(i / LEVELS_PER_WORLD)];
  return w && w.levels[i % LEVELS_PER_WORLD];
};
const nodeUnlocked = i => !!nodeLevel(i) && i < SAVE.unlocked;
const map = { sel: 0, simX: 0, simY: 0, t: 0, flakes: [] };

function openMap(sel) {
  if (sel === undefined) sel = SAVE.mapSel || 0;
  // si el nivel elegido no existe todavía (mundo próximamente), quedarse en el último jugable
  let s = clamp(sel, 0, WORLDS.length * LEVELS_PER_WORLD - 1);
  while (s > 0 && !nodeUnlocked(s)) s--;
  map.sel = s; SAVE.mapSel = s; writeSave();
  const p = mapNodePos(s); map.simX = p.x; map.simY = p.y;
  state = 'map'; menuSel = 0;
}
function mapMove(dir) {
  let s = map.sel + dir;
  if (s < 0 || !nodeUnlocked(s)) { SFX.backSnd(); return; }
  map.sel = s; SAVE.mapSel = s; writeSave(); SFX.move();
}
function mapPlay() {
  const lv = nodeLevel(map.sel);
  if (!lv || !nodeUnlocked(map.sel)) return;
  SFX.select(); startLevel(lv.id);
}
function mapKey(code) {
  if (code === 'ArrowLeft' || code === 'KeyA') mapMove(-1);
  else if (code === 'ArrowRight' || code === 'KeyD') mapMove(1);
  else if (code === 'Enter' || code === 'Space') mapPlay();
  else if (code === 'Escape' || code === 'Backspace') openMainMenu();
}
function mapPointer(clientX, clientY) {
  const h = hitAt(toCanvas(clientX, clientY));
  if (!h) return;
  if (h.zone === 'play') return mapPlay();
  if (h.zone === 'back') return openMainMenu();
  if (h.zone === 'node') {
    if (!nodeUnlocked(h.idx)) { SFX.backSnd(); return; }
    if (h.idx === map.sel) mapPlay(); else { map.sel = h.idx; SAVE.mapSel = h.idx; writeSave(); SFX.move(); }
  }
}
function updateMap(dt) {
  map.t += dt;
  const p = mapNodePos(map.sel);
  map.simX = lerp(map.simX, p.x, Math.min(1, dt * 6));
  map.simY = lerp(map.simY, p.y, Math.min(1, dt * 6));
  // nieve en invierno / pétalos en primavera / hojas en otoño
  if (Math.random() < dt * 14) {
    const w = Math.floor(Math.random() * 4);
    map.flakes.push({ x: w * 160 + Math.random() * 160, y: 110, vy: 18 + Math.random() * 18, vx: (Math.random() - 0.5) * 14, w, life: 6 });
  }
  for (const f of map.flakes) { f.x += f.vx * dt + Math.sin(map.t * 2 + f.y * 0.05) * 0.3; f.y += f.vy * dt; f.life -= dt; }
  map.flakes = map.flakes.filter(f => f.life > 0 && f.y < VH && WORLDS[f.w].season !== 'summer');
}

function drawTree(x, y, s, season, scale = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(scale, scale);
  ctx.fillStyle = s.trunk; ctx.fillRect(-3, -14, 6, 14);
  if (season === 'winter') { // pino nevado
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = s.tree;
      ctx.beginPath(); ctx.moveTo(-14 + i * 3, -10 - i * 10); ctx.lineTo(14 - i * 3, -10 - i * 10); ctx.lineTo(0, -28 - i * 10); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-6 + i * 1.5, -20 - i * 10); ctx.lineTo(6 - i * 1.5, -20 - i * 10); ctx.lineTo(0, -28 - i * 10); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#1b1b2f';
    ctx.beginPath(); ctx.arc(0, -24, 15, 0, Math.PI * 2); ctx.arc(-10, -16, 10, 0, Math.PI * 2); ctx.arc(10, -16, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.tree;
    ctx.beginPath(); ctx.arc(0, -24, 13, 0, Math.PI * 2); ctx.arc(-10, -16, 8, 0, Math.PI * 2); ctx.arc(10, -16, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-4, -29, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawMap() {
  // cielo
  const sky = ctx.createLinearGradient(0, 0, 0, 200);
  sky.addColorStop(0, '#6ec6ff'); sky.addColorStop(1, '#d6f0ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  // regiones de cada estación
  WORLDS.forEach((w, wi) => {
    const s = SEASON[w.season], x0 = wi * 160;
    ctx.fillStyle = s.sky; ctx.globalAlpha = 0.45; ctx.fillRect(x0, 120, 160, 80); ctx.globalAlpha = 1;
    // colinas de la región
    ctx.fillStyle = s.dark;
    ctx.beginPath(); ctx.moveTo(x0, VH);
    for (let x = 0; x <= 160; x += 8) ctx.lineTo(x0 + x, 196 - Math.sin((x + wi * 50) / 26) * 10);
    ctx.lineTo(x0 + 160, VH); ctx.fill();
    ctx.fillStyle = s.ground; ctx.fillRect(x0, 206, 160, VH - 206);
    ctx.fillStyle = s.dark; ctx.fillRect(x0, 206, 160, 3);
    // decoración
    [[12, 244], [150, 238], [62, 326], [124, 334]].forEach(([dx, dy], i) => drawTree(x0 + dx, dy, s, w.season, i === 2 ? 0.8 : 1));
    if (w.season === 'summer') { // sol
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(x0 + 128, 150, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + map.t * 0.5; ctx.beginPath(); ctx.moveTo(x0 + 128 + Math.cos(a) * 20, 150 + Math.sin(a) * 20); ctx.lineTo(x0 + 128 + Math.cos(a) * 26, 150 + Math.sin(a) * 26); ctx.stroke(); }
    }
    if (w.season === 'spring') for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#ff8fb8' : '#fff3b0'; ctx.fillRect(x0 + ((i * 37) % 150) + 5, 300 + ((i * 23) % 50), 3, 3); }
  });
  // partículas de clima
  for (const f of map.flakes) {
    const se = WORLDS[f.w].season;
    ctx.fillStyle = se === 'winter' ? '#ffffff' : se === 'autumn' ? '#c8501f' : '#ffb7d5';
    ctx.fillRect(Math.round(f.x), Math.round(f.y), se === 'winter' ? 2 : 3, 2);
  }
  // camino entre nodos
  const N = WORLDS.length * LEVELS_PER_WORLD;
  for (let i = 0; i < N - 1; i++) {
    const a = mapNodePos(i), b = mapNodePos(i + 1);
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 7);
    for (let k = 1; k < steps; k++) {
      const x = lerp(a.x, b.x, k / steps), y = lerp(a.y, b.y, k / steps);
      ctx.fillStyle = i < SAVE.unlocked - 1 ? '#fff3b0' : 'rgba(40,30,60,0.35)';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
  }
  // nodos
  for (let i = 0; i < N; i++) {
    const p = mapNodePos(i), lv = nodeLevel(i), unlocked = nodeUnlocked(i), isBoss = i % LEVELS_PER_WORLD === 3;
    const st = lv ? levelStats(lv.id) : null, r = isBoss ? 12 : 9, sel = i === map.sel;
    ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = !unlocked ? '#8d8fa8' : st && st.done ? '#7cf2c4' : sel ? '#ff8fb8' : '#ffffff';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    if (!unlocked) { // candado
      ctx.fillStyle = '#4b4b6a'; ctx.fillRect(p.x - 4, p.y - 2, 8, 6);
      ctx.strokeStyle = '#4b4b6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y - 2, 3, Math.PI, 0); ctx.stroke();
    } else if (isBoss) drawHeart(p.x, p.y - 5, 1.1, '#ff6b9a'); // mamá espera aquí
    else text(String(i % LEVELS_PER_WORLD + 1), p.x + 1, p.y + 1, 7, '#1b1b2f');
    if (st && st.done) for (let k = 0; k < 3; k++) drawStar(p.x - 9 + k * 9, p.y + r + 8, 3.5, k < st.stars);
    hitRects.push({ x: p.x - 14, y: p.y - 14, w: 28, h: 28, idx: i, zone: 'node' });
  }
  // mundos próximamente
  WORLDS.forEach((w, wi) => {
    if (w.levels.length) return;
    ctx.fillStyle = 'rgba(40,40,80,0.22)'; ctx.fillRect(wi * 160, 118, 160, VH - 118); // velo suave: bloqueado pero con color
    text(t('soon'), wi * 160 + 80, 140, 7, '#ffffff');
  });
  // Simba sobre el nodo elegido
  const run = anim(A.hero, 'run'), idle = anim(A.hero, 'idle');
  const target = mapNodePos(map.sel), moving = Math.abs(map.simX - target.x) > 1.5;
  const f = moving && run ? frameAt(run, map.t, 12) : idle && frameAt(idle, map.t);
  const bob = moving ? Math.abs(Math.sin(map.t * 12)) * 2 : 0;
  drawFrame(f, map.simX, map.simY - 13 - bob, map.simX > target.x + 1, 0.5, 0.5); // de pie sobre el nodo
  // nombres de las estaciones
  WORLDS.forEach((w, wi) => text(w.name[SETTINGS.lang] || w.name.es, wi * 160 + 80, 126, 8, wi === Math.floor(map.sel / 4) ? '#ffffff' : '#e5e7eb'));

  // panel superior con el nivel elegido
  const lv = nodeLevel(map.sel), wd = WORLDS[Math.floor(map.sel / 4)];
  panel(14, 10, VW - 28, 92);
  drawLifeIcon(40, 34, 26); text('x' + SAVE.lives, 58, 35, 11, '#ffffff', 'left');
  drawStar(VW - 92, 33, 9, true); text(totalStars() + '/' + ALL_LEVELS.length * 3, VW - 78, 35, 9, '#ffd23f', 'left');
  if (lv) {
    text(t('world') + ' ' + lv.id + '  ·  ' + (wd.name[SETTINGS.lang] || wd.name.es).toUpperCase(), VW / 2, 30, 10, '#ffb3d1');
    text(lv.name[SETTINGS.lang] || lv.name.es, VW / 2, 52, 12, '#ffffff');
    const st = levelStats(lv.id);
    text(st.done ? `${t('best_fish')}: ${st.fish}/${levelFishTotal(lv)}` : (map.sel % 4 === 3 ? t('boss_level') : t('new_level')), VW / 2, 72, 8, '#fff3b0');
    button(VW / 2 - 60, 80, 120, 18, t('play'), true, map.sel);
    hitRects[hitRects.length - 1].zone = 'play';
  }
  ctx.fillStyle = 'rgba(15,15,35,0.55)'; ctx.fillRect(0, 340, VW, 20);
  text(IS_TOUCH ? t('map_hint_touch') : t('map_hint_keys'), VW / 2, 350, 7, '#ffffff');
}

// ---------- Transición: "MUNDO 1-2" + vidas ----------
function drawIntro() {
  const s = SEASON[LV.world.season];
  ctx.fillStyle = '#0d0d1a'; ctx.fillRect(0, 0, VW, VH);
  // franja con el color de la estación
  const g = ctx.createLinearGradient(0, 120, 0, 240);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, s.dark); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.35; ctx.fillStyle = g; ctx.fillRect(0, 100, VW, 160); ctx.globalAlpha = 1;
  const k = clamp(introT * 3, 0, 1); // entrada
  text(t('world') + ' ' + LV.id, VW / 2, 110 - (1 - k) * 20, 24, '#ffffff');
  text(LV.name[SETTINGS.lang] || LV.name.es, VW / 2, 146, 12, '#fff3b0');
  if (LV.index === 3) text(t('boss_level'), VW / 2, 170, 9, '#ff6b6b');
  // Simba x vidas
  const idle = anim(A.hero, 'idle');
  if (idle) drawFrame(frameAt(idle, introT), VW / 2 - 40, 262, false, 0.9, 0.9);
  text('x ' + SAVE.lives, VW / 2 + 22, 240, 16, '#ffffff', 'left');
  if (introT > 0.6) text(IS_TOUCH ? t('tap') : t('enter'), VW / 2, 320, 8, 'rgba(255,255,255,0.6)');
}

// ---------- Nivel completado ----------
function drawLevelClear() {
  const k = clamp(clearT * 3, 0, 1), c = clearInfo;
  overlay(0.45 * k);
  const pw = 400, ph = 196, px = VW / 2 - pw / 2, py = 70 - (1 - k) * 40;
  ctx.globalAlpha = k;
  panel(px, py, pw, ph);
  text(t('level_clear'), VW / 2, py + 26, 15, '#7cf2c4');
  text(LV.id + '  ' + (LV.name[SETTINGS.lang] || LV.name.es), VW / 2, py + 50, 9, '#ffffff');
  for (let i = 0; i < 3; i++) {
    const pop = i < c.stars ? 1 + Math.max(0, Math.sin(clamp(clearT * 4 - 1.5 - i, 0, Math.PI))) * 0.25 : 1;
    drawStar(VW / 2 + (i - 1) * 46, py + 84, 15 * pop, i < c.stars);
  }
  text(t('fish') + '  ' + c.fish + ' / ' + c.total, VW / 2, py + 118, 10, '#ffd23f');
  const m = Math.floor(c.time / 60), s = Math.floor(c.time % 60);
  text(t('time') + '  ' + m + ':' + String(s).padStart(2, '0') + (c.lifes ? '     +' + c.lifes + ' ' + t('lives_word') : ''), VW / 2, py + 140, 9, '#ffffff');
  if (clearT > 0.8 && Math.floor(clearT * 2) % 2 === 0) text(startHint() + ' ' + t('continue'), VW / 2, py + 172, 8, '#fff3b0');
  ctx.globalAlpha = 1;
}

// ---------- Game over ----------
function drawGameOver() {
  ctx.fillStyle = '#0d0d1a'; ctx.fillRect(0, 0, VW, VH);
  text(t('ohno'), VW / 2, 120, 28, '#ff6b6b');
  text(t('nolives'), VW / 2, 160, 11);
  text(t('gameover_tip'), VW / 2, 190, 8, '#c7cbe8');
  if (deadT > 0.8 && Math.floor(deadT * 2) % 2 === 0) text(startHint() + ' ' + t('continue'), VW / 2, 250, 9, '#fff3b0');
}

// ---------- Resultados del mundo (al alimentar a mamá) ----------
// Panel arriba para que mamá (abajo) se siga viendo bien alimentada
function drawResults() {
  const k = clamp((feed.doneT - 0.6) * 3, 0, 1);
  const ratio = feed.fed / feed.total;
  const pw = 440, ph = 182, px = VW / 2 - pw / 2, py = 18 - (1 - k) * 40;
  ctx.globalAlpha = k;
  panel(px, py, pw, ph);
  text(t('win'), VW / 2, py + 24, 16, '#ffb3d1');
  const msgKey = ratio >= 1 ? 'res_full' : ratio >= 0.34 ? 'res_happy' : 'res_hungry';
  text(t(msgKey), VW / 2, py + 50, 9, ratio >= 1 ? '#7cf2c4' : '#fff3b0');
  const stars = starsFor(ratio); // llegar = 1 · la mitad de los pescados del mundo = 2 · todos = 3
  for (let i = 0; i < 3; i++) {
    const pop = i < stars ? 1 + Math.max(0, Math.sin(clamp(feed.doneT * 4 - 3 - i, 0, Math.PI))) * 0.25 : 1;
    drawStar(VW / 2 + (i - 1) * 46, py + 84, 15 * pop, i < stars);
  }
  text(t('delivered') + '  ' + feed.fed + ' / ' + feed.total, VW / 2, py + 118, 10, '#ffd23f');
  text(t('world_fish_note'), VW / 2, py + 140, 7, '#c7cbe8');
  if (feed.doneT > 1.2 && Math.floor(feed.doneT * 2) % 2 === 0) text(startHint() + ' ' + t('continue'), VW / 2, py + 164, 8, '#fff3b0');
  ctx.globalAlpha = 1;
}

// ---------- Globo de diálogo del mensajero ----------
function drawTalk(cx, cy) {
  const k = MAIN.kitten;
  if (!k || !talk) return;
  const line = talk.lines[talk.i] || '';
  const shown = line.slice(0, Math.floor(talk.t * 40));
  const lines = wrapText(line, 8, 250);
  // se calcula con la frase completa para que el globo no cambie de tamaño al escribir
  let left = shown.length;
  const shownLines = lines.map(l => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; return s; });
  const bw = 270, bh = 20 + lines.length * 16;
  const bx = clamp(k.x - cx - bw / 2, 8, VW - bw - 8), by = k.y - cy - 70 - bh;
  pixRect(bx - 3, by - 3, bw + 6, bh + 6, '#1b1b2f');
  pixRect(bx, by, bw, bh, '#ffffff');
  ctx.fillStyle = '#1b1b2f'; // piquito hacia el gatito
  ctx.beginPath(); ctx.moveTo(k.x - cx - 8, by + bh + 2); ctx.lineTo(k.x - cx + 8, by + bh + 2); ctx.lineTo(k.x - cx, by + bh + 14); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(k.x - cx - 5, by + bh); ctx.lineTo(k.x - cx + 5, by + bh); ctx.lineTo(k.x - cx, by + bh + 9); ctx.fill();
  ctx.font = 'bold 8px "Press Start 2P", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1b1b2f';
  shownLines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 16 + i * 16));
  if (shown.length >= line.length && Math.floor(menuT * 2) % 2 === 0) {
    ctx.fillStyle = '#ff6b9a'; ctx.beginPath(); ctx.moveTo(bx + bw - 18, by + bh - 10); ctx.lineTo(bx + bw - 10, by + bh - 10); ctx.lineTo(bx + bw - 14, by + bh - 5); ctx.fill();
  }
}
