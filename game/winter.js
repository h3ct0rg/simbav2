'use strict';
// ============================================================
//  Mundo 4 · Invierno navideño
//
//  Mecánicas:  hielo resbaladizo (I) · hielo fino que cruje y se rompe (k)
//              carámbanos que tiemblan y caen (y) · muñecos de nieve que lanzan bolas (n)
//              pingüinos que se lanzan de panza (p)
//  Ambiente:   nieve en capas, aliento visible, pueblo con ventanas encendidas, árboles
//              con luces que titilan, faroles, guirnaldas y el trineo de Papá Noel.
//  (El Lobo de las Nieves está en boss.js; la elección y el final, en ending.js)
// ============================================================

// ---------- Hielo resbaladizo ----------
const ICE_ACCEL = 0.3, ICE_DECEL = 0.09; // fracción del agarre normal al acelerar / frenar
function onIce(e) {
  if (!e.onGround || !AR.ice || !AR.ice.size || e.onMover) return false;
  const r = Math.floor((e.y + e.h + 2) / TS);
  return [e.x + 4, e.x + e.w - 4].some(x => AR.ice.has(r * COLS + Math.floor(x / TS)));
}

// ---------- Construcción del área ----------
function buildWinter(a) {
  // hielo fino: casillas 'k' seguidas forman una placa
  const key = o => o.r * a.cols + o.c, cells = new Set(a.thin.map(key)), used = new Set();
  for (const k of a.thin) {
    if (used.has(key(k))) continue;
    let n = 0;
    while (cells.has(k.r * a.cols + k.c + n)) { used.add(k.r * a.cols + k.c + n); n++; }
    a.moverObjs.push({ axis: 'thin', x0: k.c * TS, y0: k.r * TS, x: k.c * TS, y: k.r * TS, w: n * TS, h: 14, amp: 0,
      t: 0, period: 1, dx: 0, dy: 0, thin: { st: 'ok', t: 0, stand: 0 }, solid: true });
  }
  a.icicleObjs = a.icicles.map(i => makeIcicle(i.c * TS + TS / 2, i.r * TS, false));
  // muñecos de nieve: quietos, lanzan bolas de nieve en arco
  for (const s of a.snowmen) a.enemies.push({ type: 'snowman', x: s.c * TS + 1, y: (s.r + 1) * TS - 40, w: 30, h: 40, vx: 0, vy: 0,
    alive: true, deadT: 0, animT: Math.random() * 3, throwT: 1.2 + Math.random(), facing: -1 });
  a.decor = LV.world.season === 'winter' && !a.isRoom ? placeDecor(a) : [];
}
const makeIcicle = (x, y, arenaOne) => ({ x, y0: y, y, st: 'hang', t: 0, vy: 0, arena: arenaOne, grow: 1 });

// ---------- Hielo fino ----------
// Simba encima: a los 0,35 s cruje (tiembla y se agrieta) y a los 0,5 s más se rompe.
// Vuelve a formarse a los 3,5 s. Mantener el paso = cruzarlo sin problemas.
const THIN_STAND = 0.35, THIN_CRACK = 0.5, THIN_GONE = 3.5;
function updateThinIce(m, dt) {
  const T = m.thin, on = player.onMover === m;
  T.t += dt;
  if (T.st === 'ok') {
    m.y = m.y0;
    if (on) { T.stand += dt; if (T.stand > THIN_STAND) { T.st = 'crack'; T.t = 0; SFX.crack(); } }
    else T.stand = Math.max(0, T.stand - dt * 0.4);
  } else if (T.st === 'crack') {
    m.y = m.y0 + Math.sin(T.t * 70) * 1;
    if (T.t > THIN_CRACK) {
      T.st = 'gone'; T.t = 0; m.solid = false; SFX.shatter();
      for (let i = 0; i < m.w / 8; i++) particles.push({ x: m.x + Math.random() * m.w, y: m.y0 + 4, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60,
        life: 0.9, max: 0.9, color: Math.random() < 0.5 ? '#d9f4ff' : '#9fd6f0', size: 3 + Math.floor(Math.random() * 3), g: 900 });
    }
  } else if (T.st === 'gone') {
    m.y = m.y0;
    if (T.t > THIN_GONE) { T.st = 'grow'; T.t = 0; }
  } else if (T.st === 'grow') {
    if (T.t > 0.5) { T.st = 'ok'; T.t = 0; T.stand = 0; m.solid = true; }
  }
}
function drawThinIce(m, cx, cy) {
  const T = m.thin;
  if (T.st === 'gone') return;
  const x = Math.round(m.x - cx), y = Math.round(m.y - cy), alpha = T.st === 'grow' ? T.t / 0.5 : 1;
  ctx.globalAlpha = alpha;
  if (ok(A.thinIce)) {
    const im = A.thinIce, sc = m.w / im.naturalWidth;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(im, x, y - 2, m.w, Math.max(14, im.naturalHeight * sc));
    ctx.imageSmoothingEnabled = false;
  } else {
    ctx.fillStyle = 'rgba(160,220,245,0.85)'; ctx.fillRect(x, y, m.w, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x, y, m.w, 3);
  }
  // grietas: aparecen y crecen mientras Simba sigue encima
  const k = T.st === 'crack' ? 1 : T.stand / THIN_STAND;
  if (k > 0.15) {
    ctx.strokeStyle = 'rgba(20,50,90,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < m.w / TS; i++) {
      const bx = x + i * TS + 16;
      ctx.moveTo(bx, y + 1); ctx.lineTo(bx - 6 * k, y + 6 * k); ctx.lineTo(bx - 3 * k, y + 11 * k);
      ctx.moveTo(bx, y + 1); ctx.lineTo(bx + 7 * k, y + 5 * k); ctx.lineTo(bx + 12 * k, y + 4 * k);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------- Carámbanos ----------
// cuelgan → TIEMBLAN (aviso, con sombra en el suelo) → caen → se rompen → vuelven a crecer
const ICICLE_SHAKE = 0.5, ICICLE_LEN = 30, ICICLE_REGROW = 4;
const ARENA_ICICLE_REGROW = 10; // en la guarida del lobo tardan más en volver a crecer: menos carámbanos a la vez
function triggerIcicle(ic, shakeTime) {
  if (ic.st !== 'hang') return false;
  ic.st = 'shake'; ic.t = 0; ic.shakeTime = shakeTime || ICICLE_SHAKE; SFX.creak();
  return true;
}
function updateIcicles(dt) {
  const p = player;
  for (const ic of AR.icicleObjs || []) {
    ic.t += dt;
    if (ic.st === 'hang') {
      ic.grow = Math.min(1, ic.grow + dt * 2);
      const dx = Math.abs(p.x + p.w / 2 - ic.x);
      if (!ic.arena && ic.grow >= 1 && dx < 30 && p.y > ic.y0 && p.y - ic.y0 < 8 * TS && state === 'play') triggerIcicle(ic, ICICLE_SHAKE / (LV.diff > 1.7 ? 1.1 : 1));
    } else if (ic.st === 'shake') {
      if (ic.t > ic.shakeTime) { ic.st = 'fall'; ic.t = 0; ic.vy = 60; }
    } else if (ic.st === 'fall') {
      ic.vy = Math.min(ic.vy + GRAV * 0.9 * dt, 900); ic.y += ic.vy * dt;
      const tip = ic.y + ICICLE_LEN;
      if (state === 'play' && overlap(p, { x: ic.x - 6, y: ic.y + 6, w: 12, h: ICICLE_LEN - 6 })) { hurtPlayer(ic.x); shatterIcicle(ic); }
      else if (tile(Math.floor(ic.x / TS), Math.floor(tip / TS)) === SOLID || tip > ROWS * TS + 40) shatterIcicle(ic);
      else if (boss && boss.type === 'wolf' && ic.arena && overlap(boss, { x: ic.x - 6, y: ic.y, w: 12, h: ICICLE_LEN })) shatterIcicle(ic); // el lobo no se hace daño: lo esquiva
    } else if (ic.st === 'gone') {
      if (ic.t > (ic.arena ? ARENA_ICICLE_REGROW : ICICLE_REGROW)) { ic.st = 'hang'; ic.t = 0; ic.y = ic.y0; ic.grow = 0; }
    }
  }
}
function shatterIcicle(ic) {
  ic.st = 'gone'; ic.t = 0; SFX.shatter();
  const y = Math.min(ic.y + ICICLE_LEN, ROWS * TS);
  for (let i = 0; i < 9; i++) particles.push({ x: ic.x, y, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 90, life: 0.6, max: 0.6,
    color: i % 2 ? '#e6f8ff' : '#9fd6f0', size: 2 + (i % 3), g: 900 });
}
function drawIcicles(cx, cy) {
  for (const ic of AR.icicleObjs || []) {
    if (ic.st === 'gone') continue;
    const x = ic.x - cx, y = ic.y - cy;
    if (x < -40 || x > VW + 40) continue;
    const sh = ic.st === 'shake' ? Math.sin(ic.t * 80) * 1.5 : 0;
    // sombra en el suelo mientras tiembla o cae: indica dónde va a caer
    if (ic.st === 'shake' || ic.st === 'fall') {
      let gr = Math.floor((ic.y0 + ICICLE_LEN) / TS);
      while (gr < ROWS && tile(Math.floor(ic.x / TS), gr) !== SOLID) gr++;
      const k = ic.st === 'fall' ? 1 : ic.t / ic.shakeTime;
      ctx.fillStyle = `rgba(20,30,70,${0.2 + 0.25 * k})`;
      ctx.beginPath(); ctx.ellipse(Math.round(x), gr * TS - cy, 6 + 6 * k, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    const sc = 0.62 * ic.grow;
    if (sc <= 0.05) continue;
    if (ok(A.icicle)) {
      const im = A.icicle, w = im.naturalWidth * sc, h = im.naturalHeight * sc;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(im, Math.round(x - w / 2 + sh), Math.round(y), w, h);
      ctx.imageSmoothingEnabled = false;
    } else {
      ctx.fillStyle = '#bfe9ff';
      ctx.beginPath(); ctx.moveTo(x - 6 + sh, y); ctx.lineTo(x + 6 + sh, y); ctx.lineTo(x + sh, y + ICICLE_LEN * ic.grow); ctx.fill();
    }
  }
}

// ---------- Enemigos de invierno ----------
function updateSnowman(e, dt) {
  const p = player;
  e.facing = p.x < e.x ? -1 : 1;
  const dist = Math.abs(p.x - e.x);
  e.throwT -= dt;
  e.throwAnim = Math.max(0, (e.throwAnim || 0) - dt);
  if (e.throwT <= 0 && dist < 8.5 * TS && dist > 34 && Math.abs(p.y - e.y) < 5 * TS) {
    e.throwT = 2.3 / (LV.diff || 1) * 1.15; e.throwAnim = 0.5;
    throwAcorn(e.x + e.w / 2 + e.facing * 10, e.y + 10, p, 0.8);
    acorns[acorns.length - 1].snow = true; acorns[acorns.length - 1].r = 6;
    SFX.whoosh();
  }
}
// Pingüino: camina como un pato; si ve a Simba delante, se lanza de panza (más rápido sobre hielo)
function updatePenguin(e, dt) {
  const p = player;
  const ahead = (p.x - e.x) * Math.sign(e.vx || -1), sameLevel = Math.abs((p.y + p.h) - (e.y + e.h)) < TS;
  e.cool = Math.max(0, (e.cool || 0) - dt);
  if (!e.slide && e.cool <= 0 && ahead > 0 && ahead < 7 * TS && sameLevel) { e.slide = 0.01; SFX.squeak(); }
  if (e.slide) {
    e.slide += dt;
    const fast = onIce(e) ? 1.25 : 1;
    if (e.slide > 0.35) e.vx = Math.sign(e.vx || -1) * 270 * (LV.diff || 1) * 0.72 * fast; // tras un saltito, de panza
    else e.vx = Math.sign(e.vx || -1) * 1;
    if (Math.random() < dt * 30) puff(e.x + e.w / 2, e.y + e.h, 1, '#ffffff', 20, 15, 0.3, 2);
    if (e.slide > 2.6) { e.slide = 0; e.cool = 1.4; e.vx = Math.sign(e.vx) * e.speed; }
  }
  e.vy = Math.min(e.vy + GRAV * dt, MAXFALL);
  moveX(e, e.vx * dt);
  moveY(e, e.vy * dt);
  const front = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
  const ledge = e.onGround && tile(Math.floor(front / TS), Math.floor((e.y + e.h + 4) / TS)) === 0 && !thinIceAt(front, e.y + e.h + 4);
  if (e.hitWall || ledge) { e.vx = (e.hitWall ? -e.hitWall : -Math.sign(e.vx || 1)) * e.speed; e.slide = 0; e.cool = 0.9; }
  if (e.y > ROWS * TS + 100) e.alive = false;
}
const thinIceAt = (x, y) => (AR.moverObjs || []).some(m => m.thin && m.solid && x >= m.x && x <= m.x + m.w && Math.abs(y - m.y) < 10);
function drawWinterEnemy(e, fx, fy, sy, alpha) {
  if (e.type === 'snowman') {
    const thr = anim(A.snowmanSet, 'throw');
    let f = A.snowman;
    if (thr && e.throwAnim > 0) f = thr.frames[Math.min(thr.frames.length - 1, Math.floor((0.5 - e.throwAnim) / 0.5 * thr.frames.length))];
    const wob = e.alive ? 1 + Math.sin(e.animT * 2.5) * 0.015 : 1;
    if (drawFrame(f, fx, fy, e.facing > 0, 1, sy * wob, alpha)) return true;
    ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(fx, fy - 12, 12, 0, Math.PI * 2); ctx.arc(fx, fy - 30, 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    return true;
  }
  if (e.type === 'penguin') {
    const sliding = e.slide > 0.35;
    const rot = sliding || !e.alive ? 0 : Math.sin(e.animT * 10) * 0.12; // contoneo al caminar
    ctx.save(); ctx.translate(Math.round(fx), Math.round(fy)); ctx.rotate(rot); ctx.translate(-Math.round(fx), -Math.round(fy));
    const hop = e.slide && !sliding ? -Math.sin(e.slide / 0.35 * Math.PI) * 8 : 0;
    const okd = drawFrame(A.penguin, fx, fy + hop, e.vx > 0, 1, sy, alpha);
    ctx.restore();
    if (okd) return true;
    ctx.globalAlpha = alpha; ctx.fillStyle = '#20263a'; ctx.fillRect(Math.round(fx - 14), Math.round(fy - 24), 28, 24); ctx.globalAlpha = 1;
    return true;
  }
  return false;
}

// ---------- Decoración navideña (colocada automáticamente sobre el suelo) ----------
function seeded(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
function placeDecor(a) {
  const rnd = seeded(LV.id + 'decor'), out = [];
  const busy = new Set();
  const mark = (c, r = 2) => { for (let d = -r; d <= r; d++) busy.add(c + d); };
  for (const o of [a.spawn, a.messenger, a.mother, a.boss, ...a.checkpoints, ...a.doors].filter(Boolean)) mark(o.c, 2);
  for (const w of a.walkers) mark(w.c, 1);
  for (const s of a.snowmen) mark(s.c, 1);
  if (a.arena) for (let c = a.arena.left - 2; c <= a.arena.right + 2; c++) busy.add(c);
  const surface = c => { // fila del suelo en esa columna (null si hay hueco o algo encima)
    for (let r = 1; r < LV_ROWS; r++) if (a.grid[r][c] === T_SOLID) return a.grid[r - 1][c] === 0 && r >= a.groundRow - 1 ? r : null;
    return null;
  };
  const free = (c, n) => { for (let i = 0; i < n; i++) { const r = surface(c + i); if (r === null || r !== surface(c) || busy.has(c + i)) return false; } return true; };
  const KINDS = ['tree', 'tree', 'lamps', 'gifts', 'candy', 'tree', 'gifts', 'lamps', 'candy'];
  let c = 5 + Math.floor(rnd() * 4);
  while (c < a.cols - 6) {
    const kind = KINDS[Math.floor(rnd() * KINDS.length)];
    const need = kind === 'lamps' ? 6 : kind === 'tree' ? 2 : 1;
    if (free(c, need)) {
      const r = surface(c), y = r * TS;
      if (kind === 'lamps') { // dos faroles con una guirnalda de luces entre ellos
        out.push({ kind: 'lamp', x: c * TS + 16, y }, { kind: 'lamp', x: (c + 5) * TS + 16, y, garlandFrom: (c) * TS + 16 });
      } else out.push({ kind, x: c * TS + (kind === 'tree' ? 32 : 16), y, ph: rnd() * 6 });
      mark(c + need - 1, 1);
      c += need + 6 + Math.floor(rnd() * 7);
    } else c += 1;
  }
  return out;
}
function drawGarland(x0, x1, y, cx, cy) {
  const n = 12, sag = 16;
  ctx.strokeStyle = '#2d5a3a'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = lerp(x0, x1, u) - cx, yy = y - cy + Math.sin(u * Math.PI) * sag;
    i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
  }
  ctx.stroke();
  const COLS_ = ['#ff4d6d', '#ffd23f', '#5ad1ff', '#7cf27c', '#ff9ef0'];
  for (let i = 1; i < n; i++) {
    const u = i / n, x = lerp(x0, x1, u) - cx, yy = y - cy + Math.sin(u * Math.PI) * sag + 2;
    const on = (Math.floor(menuT * 2.5) + i) % 3 !== 0;
    const col = COLS_[i % COLS_.length];
    if (on) glowDot(x, yy, col, 5);
    ctx.fillStyle = on ? col : '#3b3b55'; ctx.fillRect(Math.round(x) - 1, Math.round(yy) - 1, 3, 3);
  }
}
function glowDot(x, y, col, r) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col + 'cc'); g.addColorStop(1, col + '00');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// Luces detectadas en un sprite (adornos del árbol, bombillas del pueblo): titilan a destiempo
function drawLights(lights, ox, oy, sc, t, strength = 1) {
  if (!lights) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < lights.length; i++) {
    const [lx, ly, col, n] = lights[i];
    const k = 0.5 + 0.5 * Math.sin(t * (2.2 + (i % 5) * 0.5) + i * 1.7);
    if (k < 0.35) continue;
    const r = (2.5 + Math.min(4, n * 0.4)) * sc * (0.7 + k * 0.6) * strength;
    glowDot(ox + lx * sc, oy + ly * sc, col, r);
  }
  ctx.restore();
}
function drawDecor(cx, cy, front) {
  if (!AR.decor) return;
  for (const d of AR.decor) {
    const x = d.x - cx, y = d.y - cy + 3;
    if (x < -80 || x > VW + 80) continue;
    if (d.kind === 'lamp') {
      if (d.garlandFrom !== undefined) drawGarland(d.garlandFrom, d.x, d.y - 66, cx, cy);
      const im = A.lamp, sc = 0.8;
      if (ok(im)) {
        drawFrame(im, x, y, false, sc, sc);
        const hy = y - im.naturalHeight * sc + 14 * sc;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const fl = 0.85 + Math.sin(menuT * 9 + d.x) * 0.05;
        const g = ctx.createRadialGradient(x, hy, 2, x, hy, 42);
        g.addColorStop(0, `rgba(255,214,140,${0.55 * fl})`); g.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 42, hy - 42, 84, 84);
        // charco de luz en la nieve
        ctx.fillStyle = 'rgba(255,220,150,0.16)'; ctx.beginPath(); ctx.ellipse(x, y - 2, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else if (d.kind === 'tree') {
      const im = A.xmasTree, sc = 0.9;
      if (drawFrame(im, x, y, false, sc, sc) && ok(im)) {
        drawLights(S.xmas_tree_lights, x - Math.round(im.naturalWidth / 2) * sc, y - im.naturalHeight * sc, sc, menuT + d.ph);
        // la estrella de la punta brilla
        const sy = y - im.naturalHeight * sc + 6;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        glowDot(x, sy, '#ffe680', 10 + Math.sin(menuT * 3 + d.ph) * 3);
        ctx.restore();
      }
    } else if (d.kind === 'gifts') drawFrame(A.gifts, x, y, false, 0.7, 0.7);
    else if (d.kind === 'candy') drawFrame(A.candyCane, x, y, (d.ph || 0) > 3, 0.75, 0.75);
  }
}

// ---------- Fondo de invierno: pueblo, humo, estrellas y trineo ----------
const VILLAGE_CHIMNEYS = [[58, 36], [118, 38], [166, 36], [247, 33], [316, 35], [347, 37]]; // en la imagen del pueblo
const VILLAGE_GAP = 220; // bosque entre pueblo y pueblo
function drawVillage(cx, groundY) {
  const im = A.village;
  if (!ok(im)) return;
  const sc = 0.58, w = im.naturalWidth * sc, h = im.naturalHeight * sc, span = w + VILLAGE_GAP;
  const px = cx * 0.36, y0 = Math.round(groundY - h - 2);
  ctx.save();
  for (let x = -(px % span) - span; x < VW + span; x += span) {
    const xr = Math.round(x);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(im, xr, y0, w, h);
    ctx.globalAlpha = 1;
    drawLights(S.village_lights, xr, y0, sc, menuT, 0.8);
    // humo de las chimeneas
    for (const [hx, hy] of VILLAGE_CHIMNEYS) {
      for (let k = 0; k < 4; k++) {
        const u = ((menuT * 0.35 + k / 4 + hx * 0.013) % 1);
        const sx = xr + hx * sc + Math.sin(u * 5 + hx) * 4 + u * 10, sy = y0 + hy * sc - u * 46;
        ctx.fillStyle = `rgba(235,235,245,${0.4 * (1 - u)})`;
        ctx.beginPath(); ctx.arc(sx, sy, 3 + u * 7, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}
function drawStarsTwinkle() {
  for (let i = 0; i < 26; i++) {
    const x = (i * 97.3) % VW, y = 8 + (i * 53.1) % 110;
    const k = 0.5 + 0.5 * Math.sin(menuT * (1.5 + (i % 4) * 0.6) + i);
    if (k < 0.55) continue;
    ctx.fillStyle = `rgba(255,255,240,${(k - 0.5) * 1.6})`;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    if (k > 0.9) { ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); }
  }
}
// Trineo de Papá Noel: cruza el cielo de vez en cuando, dejando una estela de brillos
const sleigh = { t: 8, x: 0, y: 0, active: false, trail: [] };
function updateSleigh(dt) {
  if (AR && AR.isRoom) { sleigh.active = false; sleigh.trail = []; return; }
  if (!sleigh.active) {
    sleigh.t -= dt;
    if (sleigh.t <= 0) { sleigh.active = true; sleigh.x = VW + 90; sleigh.y = 46 + Math.random() * 40; sleigh.ph = 0; SFX.jingle(); }
  } else {
    sleigh.ph += dt; sleigh.x -= 78 * dt;
    if (Math.random() < dt * 30) sleigh.trail.push({ x: sleigh.x + 46, y: sleigh.y + 20 + Math.sin(sleigh.ph * 2) * 6, life: 1.2 });
    if (sleigh.x < -220) { sleigh.active = false; sleigh.t = 28 + Math.random() * 18; }
  }
  for (const s of sleigh.trail) { s.life -= dt; s.y += 6 * dt; }
  sleigh.trail = sleigh.trail.filter(s => s.life > 0);
}
function drawSleigh() {
  for (const s of sleigh.trail) {
    const a = s.life / 1.2;
    ctx.fillStyle = `rgba(255,240,170,${a})`;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
  }
  if (!sleigh.active) return;
  const fly = anim(A.sleighSet, 'fly');
  const f = fly ? frameAt(fly, sleigh.ph, 10) : A.sleigh;
  const y = sleigh.y + Math.sin(sleigh.ph * 2) * 6;
  drawFrame(f, sleigh.x, y + 30, true, 0.62, 0.62, 0.95); // el sprite mira a la derecha: se espeja (vuela hacia la izquierda)
}

// ---------- Nieve en capas ----------
let snowCamX = 0;
function updateSnow(dt, blizzard) {
  const dcam = camX - snowCamX; snowCamX = camX;
  const target = blizzard ? 230 : 70;
  while (ambient.length < target) {
    const layer = Math.random() < 0.55 ? 0 : Math.random() < 0.8 ? 1 : 2; // lejos · medio · delante
    ambient.push({ k: 'snow', layer, x: Math.random() * (VW + 100) - 50, y: ambient.length < 10 ? Math.random() * VH : -8 - Math.random() * 40,
      vy: [16, 30, 58][layer] + Math.random() * 12, ph: Math.random() * 6, size: [1, 2, 4][layer], life: 30 });
  }
  const windX = (wind.strength || 0) * (wind.dir || 1) * 240 + (blizzard ? -200 : 0);
  for (const a of ambient) {
    const par = [0.25, 0.6, 1.25][a.layer];
    a.x += (windX * par + Math.sin(a.ph) * 8) * dt - dcam * par;
    a.y += a.vy * dt * (blizzard ? 1.4 : 1); a.ph += dt * 1.6;
    if (a.x < -60) a.x += VW + 110; else if (a.x > VW + 60) a.x -= VW + 110;
  }
  ambient = ambient.filter(a => a.y < VH + 8);
}
function drawSnow(front) {
  for (const a of ambient) {
    if (a.k !== 'snow' || (a.layer === 2) !== front) continue;
    ctx.fillStyle = a.layer === 0 ? 'rgba(235,242,255,0.6)' : a.layer === 1 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.75)';
    if (a.size <= 2) ctx.fillRect(Math.round(a.x), Math.round(a.y), a.size, a.size);
    else { ctx.beginPath(); ctx.arc(a.x, a.y, a.size / 2 + 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
}

// ---------- Aliento visible ----------
function updateBreath(dt) {
  if (LV.world.season !== 'winter' || AR.isRoom) return;
  const p = player;
  p.breathT = (p.breathT === undefined ? 1 : p.breathT) - dt * (Math.abs(p.vx) > 150 ? 1.6 : 1);
  if (p.breathT > 0) return;
  p.breathT = 1.3 + Math.random() * 0.5;
  const mx = p.x + p.w / 2 + p.facing * 15, my = p.y + 6;
  for (let i = 0; i < 3; i++) particles.push({ x: mx, y: my, vx: p.facing * (18 + Math.random() * 14) + p.vx * 0.3, vy: -6 - Math.random() * 8,
    life: 0.9, max: 0.9, color: 'rgba(255,255,255,0.75)', size: 2 + i, g: -12, soft: true });
}

// ---------- Sonidos de invierno (game.js los añade a SFX) ----------
const WINTER_SFX = {
  crack: () => { beep(1800, 900, 0.08, 'square', 0.04); beep(1200, 500, 0.12, 'sawtooth', 0.03, 0.05); },
  shatter: () => { beep(2400, 1200, 0.12, 'triangle', 0.05); beep(3000, 1500, 0.1, 'square', 0.025, 0.04); beep(1800, 700, 0.15, 'triangle', 0.04, 0.08); },
  creak: () => beep(900, 1300, 0.25, 'triangle', 0.025),
  whoosh: () => beep(500, 200, 0.18, 'sine', 0.05),
  jingle: () => [1568, 1760, 1568, 2093].forEach((f, i) => beep(f, f, 0.12, 'triangle', 0.025, i * 0.09)),
  howl: () => { beep(330, 520, 0.5, 'sawtooth', 0.04); beep(520, 440, 0.9, 'sawtooth', 0.05, 0.45); beep(260, 400, 1.2, 'sine', 0.05, 0.1); },
  growl: () => { beep(110, 80, 0.4, 'sawtooth', 0.06); },
  whimper: () => { beep(900, 600, 0.3, 'sine', 0.05); beep(800, 500, 0.4, 'sine', 0.045, 0.35); },
  achieve: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => beep(f, f, 0.14, 'triangle', 0.07, i * 0.1)),
};
