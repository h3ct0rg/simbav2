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
// Posición de cada nivel dentro de su región (160 px de ancho): el camino serpentea
// y el nivel 4 (mamá + jefe) queda arriba, sobre la colina.
const NODE_LAYOUT = [[28, 300], [62, 244], [102, 290], [134, 214]];
const mapNodePos = i => {
  const w = Math.floor(i / LEVELS_PER_WORLD), k = i % LEVELS_PER_WORLD;
  return { x: w * 160 + NODE_LAYOUT[k][0], y: NODE_LAYOUT[k][1] };
};
const nodeLevel = i => {
  const w = WORLDS[Math.floor(i / LEVELS_PER_WORLD)];
  return w && w.levels[i % LEVELS_PER_WORLD];
};
const nodeUnlocked = i => !!nodeLevel(i) && i < SAVE.unlocked;
const FINAL_NODE = () => WORLDS.length * LEVELS_PER_WORLD - 1;
const nodeClosed = i => i === FINAL_NODE() && !!SAVE.gameDone; // juego terminado: el jefe final no se repite
const map = { sel: 0, simX: 0, simY: 0, t: 0, flakes: [], walk: null, pop: null, face: 1 };

// `from`: nivel desde el que llega Simba (al superar un nivel camina por el sendero hasta el siguiente)
function openMap(sel, from) {
  if (sel === undefined) sel = SAVE.mapSel || 0;
  // si el nivel elegido no existe todavía (mundo próximamente), quedarse en el último jugable
  let s = clamp(sel, 0, WORLDS.length * LEVELS_PER_WORLD - 1);
  while (s > 0 && !nodeUnlocked(s)) s--;
  map.sel = s; SAVE.mapSel = s; writeSave(true);
  const start = from !== undefined && from !== s ? from : s;
  const p = mapNodePos(start); map.simX = p.x; map.simY = p.y;
  map.walk = start !== s ? { a: start, b: s, t: -0.35 } : null; // pequeña pausa antes de echar a andar
  map.pop = null;
  state = 'map'; menuSel = 0;
}
// Punto del sendero entre el nivel i y el i+1 (misma curva que dibuja drawPath)
function pathPoint(i, u) {
  const a = mapNodePos(i), b = mapNodePos(i + 1), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 14;
  const v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * mx + u * u * b.x, y: v * v * a.y + 2 * v * u * my + u * u * b.y };
}
const WALK_SEG = 0.6; // segundos por tramo de sendero
function finishMapWalk() {
  const w = map.walk; if (!w) return;
  const p = mapNodePos(w.b); map.simX = p.x; map.simY = p.y;
  map.walk = null; map.pop = { idx: w.b, t: 0 };
  SFX.check();
}
function mapMove(dir) {
  if (map.walk) finishMapWalk();
  let s = map.sel + dir;
  if (s < 0 || !nodeUnlocked(s)) { SFX.backSnd(); return; }
  map.sel = s; SAVE.mapSel = s; writeSave(true); SFX.move();
}
function mapPlay() {
  if (map.walk) { finishMapWalk(); return; } // ENTER durante el paseo: lo salta
  const lv = nodeLevel(map.sel);
  if (!lv || !nodeUnlocked(map.sel)) return;
  if (nodeClosed(map.sel)) { SFX.backSnd(); return; }
  SFX.select(); startLevel(lv.id);
}
function mapKey(code) {
  if (code === 'ArrowLeft' || code === 'KeyA') mapMove(-1);
  else if (code === 'ArrowRight' || code === 'KeyD') mapMove(1);
  else if (code === 'Enter' || code === 'Space') mapPlay();
  else if (code === 'Escape' || code === 'Backspace') { writeSave(true); openSlots(); }
}
function mapPointer(clientX, clientY) {
  const h = hitAt(toCanvas(clientX, clientY));
  if (!h) return;
  if (h.zone === 'play') return mapPlay();
  if (h.zone === 'back') return openSlots();
  if (h.zone === 'node') {
    if (!nodeUnlocked(h.idx)) { SFX.backSnd(); return; }
    if (h.idx === map.sel) mapPlay(); else { map.sel = h.idx; SAVE.mapSel = h.idx; writeSave(true); SFX.move(); }
  }
}
function updateMap(dt) {
  map.t += dt;
  if (map.walk) { // camina por el sendero, tramo a tramo, hasta el nivel nuevo
    const w = map.walk, dir = Math.sign(w.b - w.a), n = Math.abs(w.b - w.a);
    w.t += dt;
    const prog = clamp(w.t / WALK_SEG, 0, n);
    if (prog >= n) finishMapWalk();
    else {
      const k = Math.floor(prog), u = prog - k;
      const i = dir > 0 ? w.a + k : w.a - k - 1, pt = pathPoint(i, dir > 0 ? u : 1 - u);
      map.face = dir; map.simX = pt.x; map.simY = pt.y;
    }
  } else {
    const p = mapNodePos(map.sel);
    if (Math.abs(map.simX - p.x) > 0.5) map.face = Math.sign(p.x - map.simX);
    map.simX = lerp(map.simX, p.x, Math.min(1, dt * 6));
    map.simY = lerp(map.simY, p.y, Math.min(1, dt * 6));
  }
  if (map.pop) { map.pop.t += dt; if (map.pop.t > 1.2) map.pop = null; }
  // nieve en invierno / pétalos en primavera / hojas en otoño
  if (Math.random() < dt * 14) {
    const w = Math.floor(Math.random() * 4);
    map.flakes.push({ x: w * 160 + Math.random() * 160, y: MAP_TOP, vy: 18 + Math.random() * 18, vx: (Math.random() - 0.5) * 14, w, life: 6 });
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

// Región del mapa con el arte del fondo de su mundo (recortado alrededor de su motivo principal)
const MAP_TOP = 108, MAP_BOT = 340;
const REGION_ART = {
  spring: { img: () => A.bg, focus: 0.5 },
  summer: { img: () => A.bgSummer, focus: 0.68 },  // la cascada
  autumn: { img: () => A.bgAutumn, focus: 0.52 },  // el sol sobre el lago
  winter: { img: () => A.bgWinter, focus: 0.5 },   // montañas nevadas al atardecer
};
function drawWinterRegion(x0) { // respaldo si no carga el fondo de invierno: montañas nevadas por código
  const g = ctx.createLinearGradient(0, MAP_TOP, 0, MAP_BOT);
  g.addColorStop(0, '#9cc6e8'); g.addColorStop(0.6, '#dcebf8'); g.addColorStop(1, '#f4f9ff');
  ctx.fillStyle = g; ctx.fillRect(x0, MAP_TOP, 160, MAP_BOT - MAP_TOP);
  const mount = (bx, by, w, h, c, cap) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(bx - w / 2, by); ctx.lineTo(bx, by - h); ctx.lineTo(bx + w / 2, by); ctx.fill();
    ctx.fillStyle = cap; ctx.beginPath(); ctx.moveTo(bx - w * 0.16, by - h * 0.68); ctx.lineTo(bx, by - h); ctx.lineTo(bx + w * 0.16, by - h * 0.68);
    ctx.lineTo(bx + w * 0.07, by - h * 0.6); ctx.lineTo(bx, by - h * 0.7); ctx.lineTo(bx - w * 0.07, by - h * 0.6); ctx.fill();
  };
  mount(x0 + 40, 250, 120, 110, '#8fa8c8', '#ffffff'); mount(x0 + 120, 250, 130, 130, '#7d98bd', '#ffffff');
  mount(x0 + 80, 262, 110, 80, '#a9bfdc', '#ffffff');
  ctx.fillStyle = '#f7fbff'; ctx.beginPath(); ctx.moveTo(x0, MAP_BOT);
  for (let x = 0; x <= 160; x += 8) ctx.lineTo(x0 + x, 258 - Math.sin((x + 40) / 24) * 8);
  ctx.lineTo(x0 + 160, MAP_BOT); ctx.fill();
  ctx.fillStyle = '#d6e6f5'; for (let i = 0; i < 6; i++) ctx.fillRect(x0 + 10 + i * 26, 300 + (i % 2) * 14, 14, 3);
  [[14, 290], [148, 270], [80, 332]].forEach(([dx, dy]) => drawTree(x0 + dx, dy, SEASON.winter, 'winter', 0.9));
}
function drawRegion(w, wi) {
  const x0 = wi * 160, art = REGION_ART[w.season];
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, MAP_TOP, 160, MAP_BOT - MAP_TOP); ctx.clip();
  const im = art && art.img();
  if (ok(im)) {
    const sc = (MAP_BOT - MAP_TOP) / im.naturalHeight, iw = im.naturalWidth * sc;
    ctx.drawImage(im, Math.round(x0 + 80 - art.focus * iw), MAP_TOP, Math.ceil(iw), MAP_BOT - MAP_TOP);
    if (w.season === 'summer' && SEASON_CFG.summer.waterfall) drawWaterfall(SEASON_CFG.summer.waterfall, Math.round(x0 + 80 - art.focus * iw), MAP_TOP, sc, Math.ceil(iw), false);
  } else if (w.season === 'winter') drawWinterRegion(x0);
  else { ctx.fillStyle = SEASON[w.season].ground; ctx.fillRect(x0, MAP_TOP, 160, MAP_BOT - MAP_TOP); }
  // bruma suave abajo: da contraste al camino y a los niveles
  const g = ctx.createLinearGradient(0, MAP_TOP + 90, 0, MAP_BOT);
  g.addColorStop(0, 'rgba(20,20,40,0)'); g.addColorStop(1, 'rgba(20,20,40,0.28)');
  ctx.fillStyle = g; ctx.fillRect(x0, MAP_TOP, 160, MAP_BOT - MAP_TOP);
  ctx.restore();
}
// Banderín con el nombre de la estación (texto siempre sobre fondo oscuro: se lee en cualquier región)
function drawBanner(cx, y, label, color, active) {
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  const w = Math.max(70, ctx.measureText(label).width + 24), x = cx - w / 2;
  ctx.fillStyle = '#1b1b2f';
  ctx.beginPath(); ctx.moveTo(x - 8, y - 2); ctx.lineTo(x, y + 6); ctx.lineTo(x - 8, y + 14); ctx.lineTo(x + 4, y + 14); ctx.lineTo(x + 4, y - 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w + 8, y - 2); ctx.lineTo(x + w, y + 6); ctx.lineTo(x + w + 8, y + 14); ctx.lineTo(x + w - 4, y + 14); ctx.lineTo(x + w - 4, y - 2); ctx.fill();
  pixRect(x - 2, y - 4, w + 4, 20, '#1b1b2f');
  pixRect(x, y - 2, w, 16, active ? color : '#3a3d7a');
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 3, y - 1, w - 6, 2);
  text(label, cx, y + 7, 8, '#ffffff');
}
function drawPill(cx, cy, w, h) { pixRect(cx - w / 2 - 1, cy - h / 2 - 1, w + 2, h + 2, '#1b1b2f'); pixRect(cx - w / 2, cy - h / 2, w, h, 'rgba(36,38,82,0.92)'); }

// Sendero de tierra entre los niveles (más claro en lo ya recorrido)
function drawPath(N) {
  const seg = (i, width, style, dash) => {
    const a = mapNodePos(i), b = mapNodePos(i + 1), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 14;
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
  };
  ctx.lineCap = 'round';
  for (let i = 0; i < N - 1; i++) seg(i, 11, '#2a1d14');
  for (let i = 0; i < N - 1; i++) seg(i, 7, i < SAVE.unlocked - 1 ? '#d8b072' : '#7d7488');
  for (let i = 0; i < N - 1; i++) if (i < SAVE.unlocked - 1) seg(i, 2, 'rgba(255,240,200,0.7)', [3, 6]);
  ctx.setLineDash([]); ctx.lineCap = 'butt';
}

// Medallón de un nivel
function drawNode(i, p) {
  const lv = nodeLevel(i), unlocked = nodeUnlocked(i), isBoss = i % LEVELS_PER_WORLD === 3;
  const st = lv ? levelStats(lv.id) : null, done = st && st.done, sel = i === map.sel;
  const r = isBoss ? 14 : 11, y = p.y - (sel ? Math.abs(Math.sin(map.t * 4)) * 2 : 0);
  const season = SEASON[WORLDS[Math.floor(i / LEVELS_PER_WORLD)].season];
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + r - 1, r, 4, 0, 0, Math.PI * 2); ctx.fill(); // sombra
  if (sel) { // anillo pulsante del nivel elegido
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + Math.sin(map.t * 6) * 0.3})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(p.x, y, r + 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = !unlocked ? '#5c5f74' : done ? '#ffd23f' : '#e9edf7'; // aro: oro si está completado
  ctx.beginPath(); ctx.arc(p.x, y, r + 1, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(p.x - r * 0.35, y - r * 0.4, 1, p.x, y, r);
  if (!unlocked) { g.addColorStop(0, '#a3a6b8'); g.addColorStop(1, '#5d6075'); }
  else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, sel ? '#ff8fb8' : season.ground); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, y, r - 1, 0, Math.PI * 2); ctx.fill();
  if (!unlocked) { // candado
    ctx.fillStyle = '#2f3142'; ctx.fillRect(p.x - 5, y - 1, 10, 7);
    ctx.strokeStyle = '#2f3142'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, y - 1, 3.5, Math.PI, 0); ctx.stroke();
  } else if (nodeClosed(i)) drawHouseIcon(p.x, y); // Simba ya está en casa
  else if (isBoss) drawHeart(p.x, y - 6, 1.35, done ? '#ff6b9a' : '#ff9ec0'); // mamá espera aquí
  else {
    ctx.font = 'bold 9px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1b1b2f'; ctx.fillText(String(i % LEVELS_PER_WORLD + 1), p.x + 1, y + 1);
  }
  if (done) { // estrellas sobre una plaquita oscura
    drawPill(p.x, p.y + r + 10, 32, 11);
    for (let k = 0; k < 3; k++) drawStar(p.x - 9 + k * 9, p.y + r + 10, 3.5, k < st.stars);
  }
  hitRects.push({ x: p.x - 16, y: p.y - 16, w: 32, h: 32, idx: i, zone: 'node' });
}

function drawHouseIcon(x, y) {
  ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x, y - 9); ctx.lineTo(x + 9, y); ctx.fill();
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(x - 7, y - 1); ctx.lineTo(x, y - 7); ctx.lineTo(x + 7, y - 1); ctx.fill();
  ctx.fillStyle = '#1b1b2f'; ctx.fillRect(x - 7, y - 1, 14, 9);
  ctx.fillStyle = '#e8c48a'; ctx.fillRect(x - 6, y, 12, 7);
  ctx.fillStyle = '#ffd25a'; ctx.fillRect(x - 4, y + 1, 3, 3); // ventana encendida
  ctx.fillStyle = '#7a4d2a'; ctx.fillRect(x + 1, y + 2, 3, 5);
}
// Insignia "Corazón generoso": solo en el mapa de la partida que compartió con el lobo
function drawGenerousBadge(x, y) {
  const pulse = 1 + Math.sin(map.t * 3) * 0.06;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 18);
  g.addColorStop(0, 'rgba(255,170,200,0.55)'); g.addColorStop(1, 'rgba(255,170,200,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 18, y - 18, 36, 36);
  ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y, 10.5, 0, Math.PI * 2); ctx.fill(); // aro dorado
  ctx.fillStyle = '#5a2340'; ctx.beginPath(); ctx.arc(x, y, 8.5, 0, Math.PI * 2); ctx.fill();
  drawHeart(x, y - 5 * pulse, 1.25 * pulse, '#ff6b9a');
  if (Math.sin(map.t * 2.2) > 0.85) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + 5), Math.round(y - 8), 2, 2); } // destello
}

function drawMap() {
  const sky = ctx.createLinearGradient(0, 0, 0, MAP_TOP);
  sky.addColorStop(0, '#2b2d5c'); sky.addColorStop(1, '#4b4f8f');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  WORLDS.forEach((w, wi) => drawRegion(w, wi));
  // separadores entre regiones: sombra suave + filo claro
  for (let k = 1; k < WORLDS.length; k++) {
    const x = k * 160, g = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 10, MAP_TOP, 20, MAP_BOT - MAP_TOP);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, MAP_TOP, 1, MAP_BOT - MAP_TOP);
  }
  // partículas de clima
  for (const f of map.flakes) {
    const se = WORLDS[f.w].season;
    if (f.y < MAP_TOP) continue;
    ctx.fillStyle = se === 'winter' ? '#ffffff' : se === 'autumn' ? '#e8792b' : '#ffd1e3';
    ctx.fillRect(Math.round(f.x), Math.round(f.y), se === 'winter' ? 2 : 3, 2);
  }
  const N = WORLDS.length * LEVELS_PER_WORLD;
  drawPath(N);
  for (let i = 0; i < N; i++) drawNode(i, mapNodePos(i));
  // mundos bloqueados o próximamente: velo y placa
  WORLDS.forEach((w, wi) => {
    const firstLocked = !nodeUnlocked(wi * LEVELS_PER_WORLD);
    if (!w.levels.length || firstLocked) { ctx.fillStyle = 'rgba(25,25,55,0.32)'; ctx.fillRect(wi * 160, MAP_TOP, 160, MAP_BOT - MAP_TOP); }
    if (!w.levels.length) { drawPill(wi * 160 + 80, 160, 118, 18); text(t('soon'), wi * 160 + 80, 161, 7, '#ffffff'); }
  });
  // Simba sobre el nivel elegido
  const run = anim(A.hero, 'run'), idle = anim(A.hero, 'idle');
  const target = mapNodePos(map.sel), moving = !!map.walk || Math.abs(map.simX - target.x) > 1.5;
  const f = moving && run ? frameAt(run, map.t, 12) : idle && frameAt(idle, map.t);
  const bob = moving ? Math.abs(Math.sin(map.t * 12)) * 2 : 0, rr = map.sel % 4 === 3 && !map.walk ? 14 : 11;
  groundShadow(map.simX, map.simY - rr - 1, 11);
  drawFrame(f, map.simX, map.simY - rr - 2 - bob, map.face < 0, 0.55, 0.55);
  if (map.pop) { // destello al llegar al nivel nuevo
    const p = mapNodePos(map.pop.idx), k = map.pop.t / 1.2;
    ctx.strokeStyle = `rgba(255,243,176,${1 - k})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 14 + k * 26, 0, Math.PI * 2); ctx.stroke();
    for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3 + k * 2; drawStar(p.x + Math.cos(a) * (16 + k * 22), p.y + Math.sin(a) * (16 + k * 22), 3.5 * (1 - k) + 0.5, true); }
  }
  // banderines con el nombre de cada estación
  const curW = Math.floor(map.sel / 4);
  WORLDS.forEach((w, wi) => drawBanner(wi * 160 + 80, MAP_TOP + 10, (w.name[SETTINGS.lang] || w.name.es).toUpperCase(), SEASON[w.season].dark, wi === curW));
  WORLDS.forEach((w, wi) => { if ((SAVE.goldHearts || {})[w.id]) drawHeart(wi * 160 + 146, MAP_TOP + 30, 1.1, '#ffd23f'); }); // corazón dorado encontrado

  // panel superior con el nivel elegido
  const lv = nodeLevel(map.sel), wd = WORLDS[curW];
  panel(14, 8, VW - 28, 88);
  drawLifeIcon(40, 32, 26); text('x' + SAVE.lives, 58, 33, 11, '#ffffff', 'left');
  drawHeart(40, 50, 1.5, '#ffd23f'); text(goldHeartCount() + '/' + WORLDS.length, 58, 59, 9, '#ffd23f', 'left'); // corazones dorados
  drawStar(VW - 92, 31, 9, true); text(totalStars() + '/' + ALL_LEVELS.length * 3, VW - 78, 33, 9, '#ffd23f', 'left');
  if (SAVE.choice === 'give') drawGenerousBadge(VW - 50, 62);
  if (lv) {
    text(t('world') + ' ' + lv.id + '  ·  ' + (wd.name[SETTINGS.lang] || wd.name.es).toUpperCase(), VW / 2, 27, 10, '#ffb3d1');
    text(lv.name[SETTINGS.lang] || lv.name.es, VW / 2, 48, 12, '#ffffff');
    const st = levelStats(lv.id);
    if (nodeClosed(map.sel)) text(t('final_done'), VW / 2, 72, 9, '#7cf2c4'); // sin botón JUGAR
    else {
      text(st.done ? `${t('best_fish')}: ${st.fish}/${levelFishTotal(lv)}` : (map.sel % 4 === 3 ? t('boss_level') : t('new_level')), VW / 2, 67, 8, '#fff3b0');
      button(VW / 2 - 60, 76, 120, 16, t('play'), true, map.sel);
      hitRects[hitRects.length - 1].zone = 'play';
    }
  }
  ctx.fillStyle = 'rgba(15,15,35,0.75)'; ctx.fillRect(0, MAP_BOT, VW, VH - MAP_BOT);
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
