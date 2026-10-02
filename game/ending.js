'use strict';
// ============================================================
//  1) La elección con el Lobo de las Nieves (al vencerlo en 4-4)
//     El lobo queda agotado: "Solo quería algo de comer...".
//     · DAR la mitad de los pescados → llegan sus 2 cachorros, comparten y se van juntos.
//       Mamá recibe menos pescados (menos estrellas), pero se desbloquea el logro
//       "Corazón generoso" y la familia de lobos aparece en la ventana del final.
//     · NO DAR → el lobo se aleja solo, triste.
//  2) El final: Simba y mamá corren a una casita navideña, entran por la puerta
//     (transición de fuera a dentro) y se echan, calentitos, bajo el gran árbol. Créditos.
// ============================================================

// ---------- 1) La elección ----------
let choice = null;
function worldFishBank() { // pescados que Simba lleva para mamá: este nivel + la mejor marca de los otros 3
  const others = LV.world.levels.filter(l => l.id !== LV.id);
  return fishCount + others.reduce((s, l) => s + levelStats(l.id).fish, 0);
}
function startWolfChoice() {
  state = 'choice'; player.vx = 0; msgT = 0;
  boss.state = 'choice'; boss.lieT = 9; boss.vx = 0;
  boss.y = MAIN.groundRow * TS - boss.h;
  acorns = []; waves = [];
  for (const ic of MAIN.icicleObjs || []) if (ic.arena && ic.st !== 'hang') { ic.st = 'hang'; ic.y = ic.y0; ic.grow = 1; }
  const bank = worldFishBank();
  choice = { phase: 'walk', t: 0, sel: 0, bank, give: Math.floor(bank / 2), flying: [], cubs: [], sent: 0, landed: 0, ach: 0, hearts: 0 };
}
function choiceOptions() { return [{ id: 'give', disabled: choice.give <= 0 }, { id: 'keep' }]; }
function choiceKey(code) {
  if (!choice || choice.phase !== 'ask') return;
  if (['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA'].includes(code)) { choice.sel = 0; SFX.move(); }
  else if (['ArrowDown', 'KeyS', 'ArrowRight', 'KeyD'].includes(code)) { choice.sel = 1; SFX.move(); }
  else if (['Enter', 'Space', 'KeyZ', 'KeyK'].includes(code)) pickChoice(choice.sel);
}
function choicePointer(clientX, clientY) {
  const h = hitAt(toCanvas(clientX, clientY));
  if (h && h.zone === 'choice' && choice && choice.phase === 'ask') { choice.sel = h.idx; pickChoice(h.idx); }
}
function pickChoice(i) {
  const opt = choiceOptions()[i];
  if (opt.disabled) { SFX.backSnd(); return; }
  SFX.select();
  // solo la PRIMERA elección de la partida cuenta (y queda fija)
  if (!SAVE.choice) { SAVE.choice = opt.id; recordChoice(opt.id, SAVE.runId); writeSave(); }
  applyChoice(opt.id);
}
function applyChoice(id) {
  choice.t = 0;
  if (id === 'give') { choice.phase = 'give'; choice.gave = true; }
  else { choice.phase = 'keep'; choice.gave = false; boss.state = 'sadwalk'; boss.dir = -1; boss.animT = 0; flash(t('wolf_alone'), 3); SFX.whimper(); }
}
const wolfMouth = () => ({ x: boss.x + boss.w / 2 + boss.dir * 30, y: boss.y + 18 });
function updateChoice(dt) {
  const C = choice, b = boss, p = player;
  C.t += dt; b.animT += dt;
  b.dark = lerp(b.dark || 0, 0, Math.min(1, dt * 1.5)); // amaina la ventisca: vuelve la luz
  // Simba se acerca al lobo y se queda mirándolo
  const want = b.x + b.w / 2 - (p.x + p.w / 2) > 0 ? b.x - 70 - p.w : b.x + b.w + 70;
  if (C.phase === 'walk' || C.phase === 'sad') {
    const d = want - p.x;
    p.vx = Math.abs(d) > 4 ? Math.sign(d) * 110 : 0;
    p.facing = Math.sign(b.x - p.x) || 1;
  } else p.vx = 0;
  p.vy = Math.min(p.vy + GRAV * dt, MAXFALL);
  moveX(p, p.vx * dt); moveY(p, p.vy * dt);
  p.animT += dt;
  b.dir = p.x < b.x ? -1 : 1;

  if (C.phase === 'walk' && (Math.abs(want - p.x) <= 4 || C.t > 2.5)) { C.phase = 'sad'; C.t = 0; SFX.whimper(); }
  else if (C.phase === 'sad' && C.t > 1 + t('wolf_hungry').length / 22 + 1) {
    if (SAVE.choice) { flash(t('choice_locked'), 2.6); applyChoice(SAVE.choice); } // esta partida ya decidió: se repite
    else { C.phase = 'ask'; C.t = 0; C.sel = C.give > 0 ? 0 : 1; }
  }
  else if (C.phase === 'give') { // los pescados vuelan de Simba al lobo
    const visual = Math.min(C.give, 24);
    if (C.sent < visual && C.t > C.sent * Math.min(0.18, 3 / visual)) {
      C.sent++;
      const m = wolfMouth();
      C.flying.push({ x0: p.x + p.w / 2, y0: p.y + 4, x1: m.x, y1: m.y, t: 0, dur: 0.5 });
    }
    if (C.sent >= visual && !C.flying.length) {
      C.phase = 'thank'; C.t = 0; b.state = 'sit'; SFX.grow(); flash(t('wolf_thanks'), 2.2);
      heartBurst(b.x + b.w / 2, b.y - 10); heartBurst(b.x + b.w / 2, b.y - 10);
    }
  } else if (C.phase === 'thank' && C.t > 1.6) { // llegan sus dos cachorros por la izquierda
    C.phase = 'cubs'; C.t = 0;
    setArenaWall(arena.left, false);
    const x0 = (arena.left - 3) * TS;
    C.cubs = [0, 1].map(i => ({ x: x0 - i * 46, y: MAIN.groundRow * TS, vx: 150, animT: i * 0.3, stop: b.x - 46 - i * 34 }));
    SFX.squeak();
  } else if (C.phase === 'cubs') {
    b.dir = -1;
    let all = true;
    for (const c of C.cubs) { if (c.x < c.stop) { c.x = Math.min(c.stop, c.x + c.vx * dt); all = false; } c.animT += dt; }
    if (all) { C.phase = 'share'; C.t = 0; C.shared = 0; }
  } else if (C.phase === 'share') { // el lobo reparte los pescados entre sus cachorros
    b.dir = -1;
    if (C.shared < 6 && C.t > C.shared * 0.3) {
      const c = C.cubs[C.shared % 2], m = wolfMouth();
      C.flying.push({ x0: m.x, y0: m.y, x1: c.x, y1: c.y - 18, t: 0, dur: 0.45 });
      C.shared++;
    }
    if (Math.random() < dt * 3) heartBurst(C.cubs[0].x + 20, C.cubs[0].y - 30);
    if (C.t > 0.6 && !C.ach && !(SAVE.achievements || {}).generous) { C.ach = 0.001; SFX.achieve(); SAVE.achievements = Object.assign(SAVE.achievements || {}, { generous: true }); writeSave(); }
    if (C.t > 3.2) { C.phase = 'leave'; C.t = 0; b.state = 'leave'; }
  } else if (C.phase === 'leave') { // se van los tres juntos
    b.dir = -1; b.x -= 150 * dt;
    for (const c of C.cubs) { c.x -= 150 * dt; c.animT += dt; }
    if (b.x < (arena.left - 14) * TS) finishChoice();
  } else if (C.phase === 'keep') { // se levanta y se aleja despacio, solo
    b.dir = -1; b.x -= 46 * dt;
    if (C.t > 0.6) setArenaWall(arena.left, false);
    if (b.x < (arena.left - 10) * TS) finishChoice();
  }
  if (C.ach) C.ach += dt;
  for (const f of C.flying) {
    f.t += dt;
    if (f.t >= f.dur) { f.done = true; SFX.nom(C.landed++); puff(f.x1, f.y1, 4, '#ffd23f', 30, 30, 0.3, 2); }
  }
  C.flying = C.flying.filter(f => !f.done);
  updateParticles(dt);
  updateAmbient(dt, curSeason());
  updateCamera(dt);
}
function finishChoice() {
  const C = choice;
  wolfGift = C.gave ? C.give : 0;
  SAVE.wolfFed = SAVE.choice === 'give'; // decide si la familia de lobos aparece en la ventana del final
  writeSave();
  boss.state = 'gone';
  setArenaWall(arena.left, false); setArenaWall(arena.right, false);
  arena.done = true; waves = [];
  choice = null; state = 'play'; SFX.check();
}
function drawChoice() {
  const C = choice, cx = Math.round(camX), cy = Math.round(camY);
  if (!C) return;
  // cachorros
  for (const c of C.cubs) {
    const run = anim(A.cub, 'run'), idle = anim(A.cub, 'idle');
    const moving = C.phase === 'cubs' && c.x < c.stop || C.phase === 'leave';
    const f = moving && run ? frameAt(run, c.animT, 12) : idle ? idle.frames[0] : null;
    const goingLeft = C.phase === 'leave';
    groundShadow(c.x - cx, c.y - cy - 1, 14);
    if (!drawFrame(f, c.x - cx, c.y - cy + 2, goingLeft, 1, 1)) {
      ctx.fillStyle = '#c9d4e0'; ctx.fillRect(Math.round(c.x - cx - 14), Math.round(c.y - cy - 20), 28, 20);
    }
  }
  for (const f of C.flying) { // pescados en arco
    const u = clamp(f.t / f.dur, 0, 1);
    drawFish({ x: lerp(f.x0, f.x1, u) - 8, y: lerp(f.y0, f.y1, u) - Math.sin(u * Math.PI) * 40 - 7, t: 0, taken: false }, cx, cy);
  }
  // globo de diálogo del lobo
  if (C.phase === 'sad' || C.phase === 'ask') {
    const line = t('wolf_hungry'), shown = line.slice(0, Math.floor((C.phase === 'ask' ? 99 : C.t) * 22));
    const bw = 280, bh = 30, bx = clamp(boss.x + boss.w / 2 - cx - bw / 2, 8, VW - bw - 8), by = boss.y - cy - 40;
    pixRect(bx - 3, by - 3, bw + 6, bh + 6, '#1b1b2f'); pixRect(bx, by, bw, bh, '#ffffff');
    const tx = boss.x + boss.w / 2 - cx;
    ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.moveTo(tx - 8, by + bh + 2); ctx.lineTo(tx + 8, by + bh + 2); ctx.lineTo(tx, by + bh + 13); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(tx - 5, by + bh); ctx.lineTo(tx + 5, by + bh); ctx.lineTo(tx, by + bh + 8); ctx.fill();
    ctx.font = 'bold 8px "Press Start 2P", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1b1b2f';
    ctx.fillText(shown, bx + 12, by + bh / 2 + 1);
    // lagrimita
    const ty = boss.y - cy + 16 + (C.t * 30) % 14;
    ctx.fillStyle = '#8fd3ff'; ctx.fillRect(Math.round(tx + boss.dir * 26), Math.round(ty), 2, 3);
  }
  if (C.phase === 'ask') { // las dos opciones
    const pw = 420, ph = 108, px = VW / 2 - pw / 2, py = 40; // arriba: el lobo y Simba se siguen viendo
    panel(px, py, pw, ph);
    text(t('choice_title'), VW / 2, py + 16, 9, '#ffb3d1');
    choiceOptions().forEach((o, i) => {
      const y = py + 32 + i * 34, sel = C.sel === i, x = px + 24, w = pw - 48, h = 24;
      pixRect(x - 3, y - 3, w + 6, h + 6, '#1b1b2f');
      pixRect(x, y, w, h, o.disabled ? '#3a3a4a' : sel ? '#ff8fb8' : '#3a3d7a');
      const label = o.id === 'give' ? `${t('choice_give')} (${C.give})` : t('choice_keep');
      text(label, VW / 2 + (o.id === 'give' ? 12 : 0), y + h / 2 + 1, 8, o.disabled ? '#8a8aa0' : '#ffffff');
      if (o.id === 'give') drawFish({ x: x + 6, y: y + h / 2 - 7, t: 0, taken: false }, 0, 0);
      hitRects.push({ x: x - 3, y: y - 3, w: w + 6, h: h + 6, idx: i, zone: 'choice' });
    });
    text(C.give > 0 ? t('choice_give_note') : t('choice_none'), VW / 2, py + ph - 8, 6, '#c7cbe8');
  }
  if (C.ach) drawAchievement(C.ach);
}
// Cartel de logro que baja desde arriba
function drawAchievement(t0) {
  const k = clamp(t0 * 3, 0, 1) * clamp((5 - t0) * 2, 0, 1);
  if (k <= 0) return;
  const w = 250, h = 40, x = VW / 2 - w / 2, y = -h + k * (h + 52);
  panel(x, y, w, h);
  drawHeart(x + 24, y + 12, 1.8, '#ff6b9a');
  text(t('ach_title'), x + 48, y + 13, 8, '#ffd23f', 'left');
  text(t('ach_generous'), x + 48, y + 28, 9, '#ffffff', 'left');
}

// ---------- 2) El final ----------
// Coordenadas dentro de las imágenes generadas (house 150x139 recortada, interior 400x224)
const HOUSE_SCALE = 1.7, HOUSE_X = 470, HOUSE_GROUND = 312;
const HOUSE_DOOR = { x: 75, y: 128, w: 28, h: 50 }; // puerta: centro abajo, ancho y alto (en la imagen)
const HOUSE_CHIMNEY = { x: 115, y: 6 };             // boca de la chimenea
const HOUSE_BASE = 7;                               // px de nieve bajo la línea del suelo
const houseRect = () => {
  const w = ok(A.house) ? A.house.naturalWidth : 150, h = ok(A.house) ? A.house.naturalHeight : 139;
  return { x: HOUSE_X - w / 2 * HOUSE_SCALE, y: HOUSE_GROUND - (h - HOUSE_BASE) * HOUSE_SCALE, w: w * HOUSE_SCALE, h: h * HOUSE_SCALE };
};
const INTERIOR = {
  fire: { x: 74, y: 140, w: 42, h: 40 },     // hueco de la chimenea (fuego)
  star: { x: 289, y: 22 },                   // estrella de la punta del árbol
  tree: { x: 218, y: 18, w: 135, h: 165 },   // zona de las luces del árbol
  window: { x: 168, y: 34, w: 74, h: 98 },   // ventana (nieve y la familia de lobos)
  floor: 207,                                // altura del suelo
  spot: 262,                                 // donde se echan, bajo el árbol
};
let ending = null;
function startEnding() {
  state = 'ending'; ambient = [];
  ending = { phase: 'outside', t: 0, simX: -40, momX: -116, enterK: 0, white: 0, credY: VH + 20, flakes: [], stats: undefined };
  SAVE.gameDone = true; writeSave(); // en esta partida el jefe final ya no se puede repetir
  const E = ending;
  fetchChoiceStats().then(s => { E.stats = s; }); // lo que eligieron los demás (se ve al final)
  SFX.jingle();
}
function endingPress() {
  if (!ending) return;
  if (ending.phase === 'lie' && ending.t > 2) { ending.phase = 'credits'; ending.t = 0; }
  else if (ending.phase === 'credits') ending.fast = true;
  else if (ending.phase === 'end' && ending.t > 0.8) { ending = null; openMap(levelNodeIndex(LV), levelNodeIndex(LV)); }
}
const houseDoorScreen = () => { const r = houseRect(); return { x: r.x + HOUSE_DOOR.x * HOUSE_SCALE, y: r.y + HOUSE_DOOR.y * HOUSE_SCALE }; };
function updateEnding(dt) {
  const E = ending;
  E.t += dt;
  // nieve suave en toda la escena
  if (E.flakes.length < 90) E.flakes.push({ x: Math.random() * VW, y: -6, vy: 14 + Math.random() * 26, ph: Math.random() * 6, s: Math.random() < 0.2 ? 3 : Math.random() < 0.5 ? 2 : 1 });
  for (const f of E.flakes) { f.y += f.vy * dt; f.ph += dt * 1.5; f.x += Math.sin(f.ph) * 10 * dt; }
  E.flakes = E.flakes.filter(f => f.y < VH + 6);
  const door = houseDoorScreen();
  if (E.phase === 'outside') {
    E.simX = Math.min(door.x, E.simX + 85 * dt);
    E.momX = Math.min(door.x, E.momX + 85 * dt);
    if (E.simX >= door.x - 1 && E.momX >= door.x - 40) E.enterK = Math.min(1, E.enterK + dt * 1.6); // la puerta se abre
    if (E.momX >= door.x - 1) { E.phase = 'zoom'; E.t = 0; SFX.door(); }
  } else if (E.phase === 'zoom') { // la cámara entra por la puerta: luz cálida que llena la pantalla
    E.white = clamp(E.t / 1.3, 0, 1);
    if (E.t > 1.5) { E.phase = 'inside'; E.t = 0; E.simX = 20; E.momX = -30; }
  } else if (E.phase === 'inside') {
    E.white = clamp(1 - E.t / 0.8, 0, 1);
    const spot = endSpot();
    E.simX = Math.min(spot.sim, E.simX + 85 * dt);
    E.momX = Math.min(spot.mom, E.momX + 85 * dt);
    if (E.simX >= spot.sim && E.momX >= spot.mom && E.t > 1.5) { E.phase = 'lie'; E.t = 0; SFX.grow(); }
  } else if (E.phase === 'lie') {
    if (Math.random() < dt * 1.2) E.heart = 1;
    if (E.t > 7) { E.phase = 'credits'; E.t = 0; }
  } else if (E.phase === 'credits') {
    E.credY -= dt * (E.fast ? 120 : 26);
    if (E.credY < -creditLines().length * 18 - 20) { E.phase = 'end'; E.t = 0; }
  }
  if (E.heart) { E.heart = 0; E.hearts = (E.hearts || []).concat([{ x: endSpot().sim + 10 + Math.random() * 40, y: INTERIOR_FLOOR() - 40, t: 0 }]); }
  for (const h of E.hearts || []) h.t += dt;
  if (E.hearts) E.hearts = E.hearts.filter(h => h.t < 2);
}
const INTERIOR_SCALE = () => Math.max(VW / 400, VH / 224);
const INTERIOR_OX = () => Math.round((VW - 400 * INTERIOR_SCALE()) / 2);
const INTERIOR_OY = () => Math.round((VH - 224 * INTERIOR_SCALE()) / 2);
const INTERIOR_FLOOR = () => INTERIOR_OY() + INTERIOR.floor * INTERIOR_SCALE();
const endSpot = () => { const sc = INTERIOR_SCALE(), x = INTERIOR_OX() + INTERIOR.spot * sc; return { sim: x - 34, mom: x + 30 }; };

function creditLines() {
  const es = SETTINGS.lang !== 'en';
  const stars = totalStars(), max = ALL_LEVELS.length * 3, gen = SAVE.achievements && SAVE.achievements.generous;
  return [
    ['SIMBA', 20, '#ffffff'], [es ? 'el camino a casa' : 'the way home', 10, '#ffb3d1'], ['', 10],
    [es ? 'Una aventura en cuatro estaciones' : 'An adventure in four seasons', 8, '#fff3b0'], ['', 8],
    [es ? 'MÚSICA' : 'MUSIC', 8, '#7cf2c4'], [es ? 'Villancicos tradicionales en chiptune' : 'Traditional carols in chiptune', 8, '#ffffff'],
    ['Jingle Bells · ' + (es ? 'Noche de paz' : 'Silent Night'), 7, '#c7cbe8'], ['', 8],
    [es ? 'DESARROLLADO POR' : 'DEVELOPED BY', 8, '#7cf2c4'], ['Just Hector', 10, '#ffffff'], ['', 8],
    [es ? 'PROTAGONISTAS' : 'STARRING', 8, '#7cf2c4'], ['Simba · ' + (es ? 'Mamá' : 'Mom'), 8, '#ffffff'],
    ['Bruto · Don Pinzas · Doña Bellota', 7, '#c7cbe8'], [es ? 'y el Lobo de las Nieves' : 'and the Snow Wolf', 7, '#c7cbe8'], ['', 10],
    [(es ? 'Estrellas: ' : 'Stars: ') + stars + ' / ' + max, 9, '#ffd23f'],
    gen ? [(es ? 'Logro: ' : 'Achievement: ') + t('ach_generous'), 8, '#ff9ec0'] : ['', 8], ['', 12],
    [es ? '¡Gracias por jugar!' : 'Thanks for playing!', 11, '#ffffff'],
  ];
}

function drawEnding() {
  const E = ending;
  if (!E) return;
  if (E.phase === 'outside' || E.phase === 'zoom') drawEndOutside(E);
  else drawEndInside(E);
  for (const f of E.flakes) if (E.phase === 'outside' || E.phase === 'zoom') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s); }
  if (E.white > 0) { ctx.fillStyle = `rgba(255,236,190,${E.white})`; ctx.fillRect(0, 0, VW, VH); }
  if (E.phase === 'credits' || E.phase === 'end') drawCredits(E);
}
function drawEndOutside(E) {
  const door = houseDoorScreen();
  ctx.save();
  if (E.phase === 'zoom') { // se acerca a la puerta
    const u = Math.pow(clamp(E.t / 1.3, 0, 1), 2), z = 1 + u * 5;
    ctx.translate(lerp(door.x, VW / 2, u), lerp(door.y - 30, VH / 2, u)); ctx.scale(z, z); ctx.translate(-door.x, -(door.y - 30));
  }
  // cielo y montañas
  const bg = A.bgWinter;
  ctx.fillStyle = '#2a2050'; ctx.fillRect(0, 0, VW, VH);
  if (ok(bg)) { const s = VH / bg.naturalHeight; ctx.drawImage(bg, Math.round((VW - bg.naturalWidth * s) / 2), 0, Math.ceil(bg.naturalWidth * s), VH); }
  drawStarsTwinkle();
  drawVillage(0, HOUSE_GROUND - 6);
  // suelo nevado
  const g = ctx.createLinearGradient(0, HOUSE_GROUND - 6, 0, VH);
  g.addColorStop(0, '#f4f8ff'); g.addColorStop(1, '#b9c9e8');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, VH);
  for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, HOUSE_GROUND - 4 + Math.sin(x / 40) * 3);
  ctx.lineTo(VW, VH); ctx.fill();
  // decoración: árbol y faroles junto al camino
  drawFrame(A.xmasTree, 120, HOUSE_GROUND + 2, false, 1, 1);
  if (ok(A.xmasTree)) drawLights(S.xmas_tree_lights, 120 - Math.round(A.xmasTree.naturalWidth / 2), HOUSE_GROUND + 2 - A.xmasTree.naturalHeight, 1, menuT);
  drawFrame(A.lamp, 300, HOUSE_GROUND + 2, false, 0.9, 0.9);
  if (ok(A.lamp)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(300, HOUSE_GROUND - A.lamp.naturalHeight * 0.9 + 12, '#ffd68c', 24); ctx.restore(); }
  drawFrame(A.gifts, 200, HOUSE_GROUND + 2, false, 0.8, 0.8);
  // la casita
  const hr = houseRect(), hx = hr.x, hy = hr.y;
  if (ok(A.house)) {
    ctx.imageSmoothingEnabled = true; // escala no entera: suave
    ctx.drawImage(A.house, Math.round(hx), Math.round(hy), Math.round(hr.w), Math.round(hr.h));
    ctx.imageSmoothingEnabled = false;
    drawLights(S.house_lights, hx, hy, HOUSE_SCALE, menuT);
  } else { ctx.fillStyle = '#8a4b2a'; ctx.fillRect(hx + 20, hy + 80, 200, 160); }
  // humo de la chimenea
  for (let k = 0; k < 6; k++) {
    const u = (menuT * 0.3 + k / 6) % 1;
    const sx = hx + HOUSE_CHIMNEY.x * HOUSE_SCALE + Math.sin(u * 6 + k) * 5 + u * 18, sy = hy + HOUSE_CHIMNEY.y * HOUSE_SCALE - u * 80;
    ctx.fillStyle = `rgba(230,230,240,${0.55 * (1 - u)})`;
    ctx.beginPath(); ctx.arc(sx, sy, 4 + u * 12, 0, Math.PI * 2); ctx.fill();
  }
  // la puerta se abre: luz cálida que sale de dentro
  if (E.enterK > 0 || E.phase === 'zoom') {
    const k = E.phase === 'zoom' ? 1 : E.enterK, dw = HOUSE_DOOR.w * HOUSE_SCALE, dh = HOUSE_DOOR.h * HOUSE_SCALE;
    ctx.fillStyle = `rgba(255,214,140,${0.9 * k})`; ctx.fillRect(Math.round(door.x - dw / 2), Math.round(door.y - dh), Math.round(dw * k), Math.round(dh));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(door.x, door.y - dh / 2, '#ffcf7a', 60 * k); ctx.restore();
  }
  // Simba y mamá corriendo hacia la casa
  const fade = x => clamp((door.x - x) / 30, 0, 1); // al cruzar la puerta se desvanecen
  drawEndMom(E.momX, HOUSE_GROUND + 2, 'run', fade(E.momX) * (E.phase === 'zoom' ? 0 : 1));
  drawEndSimba(E.simX, HOUSE_GROUND + 2, 'run', fade(E.simX) * (E.phase === 'zoom' ? 0 : 1));
  ctx.restore();
}
function drawEndSimba(x, y, mode, alpha = 1) {
  if (alpha <= 0.01) return;
  const run = anim(A.hero, 'run'), lying = anim(A.hero, 'lying'), idle = anim(A.hero, 'idle');
  groundShadow(x, y - 2, 20);
  if (mode === 'lie' && ok(A.heroLying)) { // echado: respira despacio
    drawFrame(A.heroLying, x, y + 2, false, 0.9, 0.9 * (1 + Math.sin(menuT * 2) * 0.015), alpha);
    return;
  }
  const f = mode === 'run' && run ? frameAt(run, menuT, 9) : mode === 'lie' && lying ? frameAt(lying, menuT, 5) : idle && frameAt(idle, menuT);
  drawFrame(f, x, y, false, 1, 1, alpha);
}
function drawEndMom(x, y, mode, alpha = 1) {
  if (alpha <= 0.01) return;
  const idle = anim(A.mother, 'idle');
  groundShadow(x, y - 2, 24);
  if (mode === 'lie' && ok(A.momLying)) { drawFrame(A.momLying, x, y + 2, false, 0.85, 0.85, alpha); return; }
  const walk = anim(A.motherWalk, 'walk');
  const f = mode === 'run' && walk ? frameAt(walk, menuT, 14) : idle ? frameAt(idle, menuT) : null; // camina (animación generada)
  drawFrame(f, x, y, false, 1, 1, alpha);
}
function drawEndInside(E) {
  const sc = INTERIOR_SCALE(), ox = INTERIOR_OX(), oy = INTERIOR_OY();
  const I = INTERIOR, X = v => ox + v * sc, Y = v => oy + v * sc;
  ctx.fillStyle = '#2a1408'; ctx.fillRect(0, 0, VW, VH);
  if (ok(A.interior)) ctx.drawImage(A.interior, ox, oy, Math.ceil(400 * sc), Math.ceil(224 * sc));
  // nieve tras la ventana (y la familia de lobos, si Simba fue generoso)
  drawWindowView(X, Y, sc);
  // luz cálida del fuego (parpadea) y llamas
  const f = I.fire, fl = 0.85 + Math.sin(menuT * 11) * 0.06 + Math.sin(menuT * 23) * 0.04;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fg = ctx.createRadialGradient(X(f.x + f.w / 2), Y(f.y + f.h / 2), 4, X(f.x + f.w / 2), Y(f.y + f.h / 2), 260);
  fg.addColorStop(0, `rgba(255,150,60,${0.35 * fl})`); fg.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
  drawFlames(X(f.x), Y(f.y), f.w * sc, f.h * sc);
  // luces del árbol y la estrella
  const tr = I.tree;
  drawLights((S.interior_lights || []).filter(([lx, ly]) => lx > tr.x && lx < tr.x + tr.w && ly > tr.y && ly < tr.y + tr.h), ox, oy, sc, menuT, 0.75);
  const sx = X(I.star.x), sy = Y(I.star.y);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glowDot(sx, sy, '#ffe680', 22 + Math.sin(menuT * 2.5) * 5);
  ctx.strokeStyle = `rgba(255,240,170,${0.35 + Math.sin(menuT * 3) * 0.15})`; ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) { const a = menuT * 0.6 + i * Math.PI / 4, r = 14 + (i % 2) * 10; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); ctx.stroke(); }
  ctx.restore();
  // Simba y mamá
  const floor = INTERIOR_FLOOR(), lying = E.phase !== 'inside';
  drawEndMom(E.momX, floor, lying ? 'lie' : 'run');
  drawEndSimba(E.simX, floor, lying ? 'lie' : 'run');
  if (lying) {
    for (const h of E.hearts || []) { ctx.globalAlpha = 1 - h.t / 2; drawHeart(h.x, h.y - h.t * 24, 1.3, '#ff6b9a'); ctx.globalAlpha = 1; }
    for (let i = 0; i < 3; i++) { // z z z
      const u = (menuT * 0.4 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(u * Math.PI);
      text('z', E.momX + 26 + u * 22, floor - 56 - u * 30, 7 + i * 2, '#e8ecff');
      ctx.globalAlpha = 1;
    }
    if (E.phase === 'lie') { ctx.globalAlpha = clamp(E.t - 0.5, 0, 1); text(t('end_home'), VW / 2, 34, 14, '#fff3b0'); ctx.globalAlpha = 1; }
  }
}
function drawFlames(x, y, w, h) {
  for (let i = 0; i < 7; i++) {
    const u = i / 6, fx = x + w * (0.15 + u * 0.7), hh = h * (0.55 + 0.45 * Math.abs(Math.sin(menuT * (6 + i) + i * 2)));
    const cols = ['#ff5a1f', '#ff9a2e', '#ffd25a'];
    for (let k = 0; k < 3; k++) {
      const s = 1 - k * 0.3;
      ctx.fillStyle = cols[k];
      ctx.beginPath();
      ctx.moveTo(fx - 6 * s, y + h);
      ctx.quadraticCurveTo(fx - 7 * s, y + h - hh * s * 0.5, fx + Math.sin(menuT * 9 + i) * 3, y + h - hh * s);
      ctx.quadraticCurveTo(fx + 7 * s, y + h - hh * s * 0.5, fx + 6 * s, y + h);
      ctx.fill();
    }
  }
}
// La familia de lobos mira desde FUERA: de frente, con tinte nocturno, detrás del marco
// de la ventana y de la nieve del alféizar, y empañando el vidrio con su aliento.
const tintCache = new Map();
function nightTint(im) {
  if (!ok(im)) return null;
  if (!tintCache.has(im)) {
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(38,58,128,0.5)'; g.fillRect(0, 0, c.width, c.height);
    tintCache.set(im, c);
  }
  return tintCache.get(im);
}
function drawOutside(im, x, feetY, sc) { // dibuja anclado por los pies
  const c = nightTint(im);
  if (!c) return null;
  const w = c.width * sc, h = c.height * sc;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, Math.round(x - w / 2), Math.round(feetY - h), w, h);
  ctx.imageSmoothingEnabled = false;
  return { top: feetY - h, h };
}
const WINDOW_GLASS = { x: 165, y: 31, w: 75, h: 100 }; // vidrio de la ventana del salón (en la imagen)
function drawWindowView(X, Y, sc) {
  const g = WINDOW_GLASS;
  ctx.save(); ctx.beginPath(); ctx.rect(X(g.x), Y(g.y), g.w * sc, g.h * sc); ctx.clip();
  const snow = k => { // copos al otro lado del vidrio
    const fx = X(g.x) + ((k * 41 + menuT * 6) % (g.w * sc)), fy = Y(g.y) + ((k * 29 + menuT * 22) % (g.h * sc));
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(Math.round(fx), Math.round(fy), 2, 2);
  };
  for (let k = 0; k < 10; k++) snow(k);
  if (SAVE.wolfFed) {
    const wolf = anim(A.wolf, 'front'), cub = anim(A.cub, 'front');
    const fog = [];
    if (wolf) { const r = drawOutside(wolf.frames[0], X(182), Y(133) + Math.sin(menuT * 1.2) * 1, 0.62); if (r) fog.push([X(182), r.top + r.h * 0.3]); }
    if (cub) [[216, 0], [232, 1.7]].forEach(([cx, ph]) => {
      const bob = Math.max(0, Math.sin(menuT * 1.8 + ph)) * 5; // se asoman y se esconden
      const r = drawOutside(cub.frames[0], X(cx), Y(131) - bob, 0.8);
      if (r) fog.push([X(cx), r.top + r.h * 0.42]);
    });
    for (const [i, [fx, fy]] of fog.entries()) { // vaho en el vidrio
      const k = 0.5 + 0.5 * Math.sin(menuT * 1.6 + i * 2);
      ctx.fillStyle = `rgba(220,235,255,${0.1 + 0.12 * k})`;
      ctx.beginPath(); ctx.ellipse(fx, fy, 6 + k * 3, 4 + k * 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (let k = 10; k < 18; k++) snow(k);
  // reflejo del vidrio
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (const off of [10, 46]) {
    ctx.beginPath(); ctx.moveTo(X(g.x + off), Y(g.y)); ctx.lineTo(X(g.x + off + 12), Y(g.y));
    ctx.lineTo(X(g.x + off - 30), Y(g.y + g.h)); ctx.lineTo(X(g.x + off - 42), Y(g.y + g.h)); ctx.fill();
  }
  ctx.restore();
  // marco, cruceta y nieve del alféizar POR DELANTE de los lobos
  const box = S.interior_window_box;
  if (box && ok(A.interiorWindow)) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(A.interiorWindow, X(box[0]), Y(box[1]), (box[2] - box[0]) * sc, (box[3] - box[1]) * sc);
    ctx.imageSmoothingEnabled = false;
  }
  if (SAVE.wolfFed && Math.sin(menuT * 1.3) > 0.9) drawHeart(X(g.x + g.w / 2), Y(g.y + 20), 1, '#ff9ec0');
}
function drawCredits(E) {
  ctx.fillStyle = `rgba(10,8,24,${E.phase === 'end' ? 0.7 : 0.55})`; ctx.fillRect(0, 0, VW, VH);
  if (E.phase === 'credits') {
    let y = E.credY;
    for (const [s, size, col] of creditLines()) { if (s && y > -20 && y < VH + 20) text(s, VW / 2, y, size, col); y += size + 10; }
  } else {
    text(t('end_the_end'), VW / 2, 54, 26, '#ffffff');
    drawAfterScore(E);
    if (E.t > 0.8 && Math.floor(E.t * 2) % 2 === 0) text(t('end_press'), VW / 2, 336, 8, '#c7cbe8');
  }
}
// "After score": qué eligió esta partida y qué eligieron los demás (una elección por partida)
function drawAfterScore(E) {
  const pw = 440, ph = 210, px = VW / 2 - pw / 2, py = 92, k = clamp(E.t * 2.5, 0, 1);
  ctx.globalAlpha = k;
  panel(px, py, pw, ph);
  text(t('score_title'), VW / 2, py + 20, 10, '#ffb3d1');
  const gave = SAVE.choice === 'give';
  if (gave) drawHeart(px + 34, py + 42, 1.6, '#ff6b9a');
  text(t(gave ? 'score_you_give' : 'score_you_keep'), VW / 2, py + 48, 8, gave ? '#ffd1e3' : '#c7cbe8');
  const S = E.stats;
  if (S === undefined) text(t('score_loading'), VW / 2, py + 110, 8, '#c7cbe8');
  else if (!S || S.give + S.keep === 0) text(t('score_offline'), VW / 2, py + 110, 8, '#c7cbe8');
  else {
    const total = S.give + S.keep, grow = clamp((E.t - 0.4) / 1.2, 0, 1);
    [['give', S.give, '#ff6b9a', 'score_gave'], ['keep', S.keep, '#7d8bd6', 'score_kept']].forEach(([id, n, col, key], i) => {
      const y = py + 78 + i * 46, bx = px + 30, bw = pw - 60, pct = Math.round(n / total * 100);
      text(t(key), bx, y, 8, SAVE.choice === id ? '#ffffff' : '#c7cbe8', 'left');
      text(pct + '%', bx + bw, y, 10, '#ffffff', 'right');
      ctx.fillStyle = '#1b1b2f'; ctx.fillRect(bx - 2, y + 10, bw + 4, 16);
      ctx.fillStyle = '#2c2e5c'; ctx.fillRect(bx, y + 12, bw, 12);
      ctx.fillStyle = col; ctx.fillRect(bx, y + 12, Math.round(bw * n / total * grow), 12);
      if (SAVE.choice === id) { ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2; ctx.strokeRect(bx - 3, y + 9, bw + 6, 18); } // tu elección
    });
    text(t('score_total').replace('{n}', total), VW / 2, py + ph - 18, 7, '#c7cbe8');
  }
  ctx.globalAlpha = 1;
}
