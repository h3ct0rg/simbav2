'use strict';
// ============================================================
//  Jefes. Comparten la arena (paredes que se cierran, cámara fija, barra de vida)
//  y la regla de oro: el jefe tiene un momento de VULNERABILIDAD y Simba gana
//  saltándole encima 3 veces. Al perder, el jefe huye (tono amable: nadie sale herido).
//
//  Mundo 1 · Bruto, el gran bulldog
//    AVISO (ladra) → EMBESTIDA → choca contra la pared → MAREADO (¡ahora!)
//    Fases 2 y 3: rebota una vez antes de marearse, y es más rápido.
//
//  Mundo 2 · Don Pinzas, el cangrejo gigante
//    CAMINA de lado → AVISO (alza las pinzas) → GOLPE: ondas de arena por el suelo
//    (hay que saltarlas) → tras el último golpe las pinzas se ATASCAN (¡ahora!)
//    Fases 2 y 3: más golpes seguidos, ondas más rápidas, menos tiempo atascado.
// ============================================================

let boss = null, arena = null, waves = [];

const BOSS_DEFS = {
  bruto: {
    name: 'BRUTO', w: 96, h: 66,
    phases: [ // por golpes recibidos: 0, 1, 2
      { speed: 250, tell: 0.95, stun: 2.4, bounces: 0 },
      { speed: 310, tell: 0.75, stun: 2.0, bounces: 1 },
      { speed: 370, tell: 0.55, stun: 1.6, bounces: 1 },
    ],
    vulnerable: 'stunned',
  },
  crab: {
    name: 'DON PINZAS', w: 108, h: 62,
    phases: [
      { walk: 1.4, tell: 0.9, slams: 1, wave: 200, stun: 2.6 },
      { walk: 1.1, tell: 0.7, slams: 2, wave: 245, stun: 2.2 },
      { walk: 0.9, tell: 0.55, slams: 3, wave: 285, stun: 1.8 },
    ],
    vulnerable: 'stuck',
  },
};

function setupBoss(area) {
  boss = null; arena = null; waves = [];
  if (!area.boss || !area.arena) return;
  arena = { left: area.arena.left, right: area.arena.right, active: false, done: false };
  boss = makeBoss(area.boss, LV.world.boss || 'bruto');
}
function makeBoss(spawn, type) {
  const def = BOSS_DEFS[type];
  return { type, def, spawn, x: spawn.c * TS + TS / 2 - def.w / 2, y: (spawn.r + 1) * TS - def.h, w: def.w, h: def.h,
    vx: 0, vy: 0, dir: -1, hp: 3, maxHp: 3, state: 'wait', t: 0, invuln: 0, flash: 0, animT: 0,
    bounces: 0, slams: 0, onGround: false, hitWall: 0 };
}
const bossPhase = () => boss.def.phases[Math.min(2, boss.maxHp - boss.hp)];
const bossCleared = () => !arena || arena.done;
const bossBarVisible = () => arena && arena.active && boss && boss.state !== 'gone';
function arenaCameraLock() {
  if (!arena || !arena.active || arena.done || AR !== MAIN) return null;
  return arena.left * TS + ((arena.right - arena.left + 1) * TS - VW) / 2;
}
function setArenaWall(col, solid) {
  for (let r = 0; r < MAIN.groundRow; r++) MAIN.grid[r][col] = solid ? SOLID : 0;
}
// Al morir durante la pelea, todo vuelve a empezar (el punto de control está justo antes)
function resetBossFight() {
  if (!arena || arena.done) return;
  setArenaWall(arena.left, false); setArenaWall(arena.right, false);
  arena.active = false; waves = [];
  boss = makeBoss(boss.spawn, boss.type);
}

function bossSet(st) { boss.state = st; boss.t = 0; }
function faceSimba() { boss.dir = player.x + player.w / 2 < boss.x + boss.w / 2 ? -1 : 1; }
const arenaMid = () => (arena.left + arena.right + 1) / 2 * TS;

function updateArena(dt) {
  if (!arena || AR !== MAIN) return;
  // Simba entra en la arena: se cierran las paredes y empieza la pelea
  if (!arena.active && !arena.done && player.x > (arena.left + 1.5) * TS) {
    arena.active = true;
    setArenaWall(arena.left, true); setArenaWall(arena.right, true);
    bossSet('intro'); faceSimba();
    flash(t('boss_name_' + boss.type), 2.2); shake = 6;
    boss.type === 'bruto' ? SFX.bark() : SFX.thud();
  }
  if (boss && boss.state !== 'wait' && boss.state !== 'gone') {
    boss.t += dt; boss.animT += dt;
    boss.invuln = Math.max(0, boss.invuln - dt);
    boss.flash = Math.max(0, boss.flash - dt * 3);
    if (boss.type === 'bruto') updateBruto(dt); else updateCrab(dt);
    boss.vy = Math.min(boss.vy + GRAV * dt, MAXFALL);
    moveX(boss, boss.vx * dt);
    moveY(boss, boss.vy * dt);
    bossCommonStates();
    bossContact();
  }
  updateWaves(dt);
}

// Estados finales comunes: derrotado → huye por la izquierda → se abre el camino a mamá
function bossCommonStates() {
  const b = boss;
  if (b.state === 'defeated') {
    b.vx = 0;
    if (b.t > 1.4) {
      bossSet('flee'); b.dir = -1;
      setArenaWall(arena.left, false);
      flash(t('boss_beaten_' + b.type), 2.5);
    }
  } else if (b.state === 'flee') {
    b.vx = -300;
    if (b.x < (arena.left - 14) * TS) {
      bossSet('gone');
      setArenaWall(arena.right, false);
      arena.done = true; waves = [];
      SFX.check();
    }
  }
}

// Choque con Simba (misma regla para todos los jefes)
function bossContact() {
  const b = boss;
  if (state !== 'play' || ['defeated', 'flee', 'gone'].includes(b.state)) return;
  const p = player, hb = { x: b.x + 6, y: b.y + 6, w: b.w - 12, h: b.h - 6 };
  if (!overlap(p, hb)) return;
  const stomp = p.vy > 0 && p.prevBottom <= b.y + 18;
  const vulnerable = b.state === b.def.vulnerable;
  if (vulnerable && stomp && b.invuln <= 0) {
    b.hp--; b.invuln = 1; b.flash = 1; bossSet('hurt'); waves = [];
    p.vy = -560; p.sx = 0.8; p.sy = 1.2;
    SFX.bossHit(); shake = 7;
    puff(b.x + b.w / 2, b.y + 6, 22, '#ffffff', 110, 100, 0.6, 4);
  } else if (vulnerable || b.state === 'hurt') {
    p.x += (p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1) * 2; // vulnerable no hace daño: solo empuja
  } else if (stomp) {
    p.vy = -480; SFX.stomp(); // saltar encima cuando NO es vulnerable: rebote sin daño
  } else hurtPlayer(b.x + b.w / 2);
}

// ---------- Bruto ----------
function updateBruto(dt) {
  const b = boss, ph = bossPhase();
  switch (b.state) {
    case 'intro': b.vx = 0; if (b.t > 1.5) { bossSet('tell'); SFX.bark(); } break;
    case 'tell': // aviso: se agacha y ladra mirando a Simba
      b.vx = 0; faceSimba();
      if (b.t > ph.tell) { bossSet('charge'); b.bounces = ph.bounces; }
      break;
    case 'charge':
      b.vx = b.dir * ph.speed;
      if (Math.random() < dt * 20) puff(b.x + b.w / 2 - b.dir * 30, b.y + b.h, 1, '#e8dcc0', 30, 20, 0.35, 3);
      if (b.hitWall) {
        shake = 9; SFX.thud();
        puff(b.dir > 0 ? b.x + b.w : b.x, b.y + b.h / 2, 16, '#e8dcc0', 70, 70, 0.5, 4);
        if (b.bounces > 0) { b.bounces--; b.dir = -b.dir; bossSet('skid'); } else bossSet('stunned');
      }
      break;
    case 'skid': b.vx = b.dir * ph.speed * 0.3; if (b.t > 0.35) { bossSet('charge'); b.bounces = 0; } break;
    case 'stunned': b.vx = 0; if (b.t > ph.stun) bossSet('recover'); break;
    case 'hurt': b.vx = 0; if (b.t > 0.6) bossSet(b.hp <= 0 ? 'defeated' : 'recover'); break;
    case 'recover': b.vx = 0; if (b.t > 0.45) { bossSet('tell'); SFX.bark(); } break;
  }
}

// ---------- Don Pinzas ----------
function updateCrab(dt) {
  const b = boss, ph = bossPhase();
  switch (b.state) {
    case 'intro': b.vx = 0; if (b.t > 1.5) { bossSet('walk'); pickCrabTarget(); } break;
    case 'walk': // camina de lado hacia un punto de la arena
      b.vx = Math.sign(b.targetX - (b.x + b.w / 2)) * 120;
      if (Math.abs(b.targetX - (b.x + b.w / 2)) < 8 || b.t > ph.walk) { b.vx = 0; bossSet('tell'); b.slams = ph.slams; faceSimba(); }
      break;
    case 'tell': // alza las pinzas: aviso del golpe
      b.vx = 0;
      if (b.t > ph.tell) { b.slams--; bossSet('slam'); b.impact = false; }
      break;
    case 'slam': // las pinzas bajan (animación) y al tocar la arena salen las ondas
      b.vx = 0;
      if (!b.impact && b.t >= CRAB_IMPACT) { b.impact = true; crabImpact(); }
      if (b.t > CRAB_IMPACT + 0.45) {
        if (b.slams > 0) { bossSet('tell'); b.t = ph.tell * 0.45; b.raise = 0.25; } // los golpes seguidos avisan menos
        else { bossSet('stuck'); beep(300, 180, 0.3, 'square', 0.05); }            // crujido: pinzas atascadas
      }
      break;
    case 'stuck': b.vx = 0; if (b.t > ph.stun) bossSet('recover'); break; // ¡ahora!
    case 'hurt': b.vx = 0; if (b.t > 0.6) bossSet(b.hp <= 0 ? 'defeated' : 'recover'); break;
    case 'recover': b.vx = 0; if (b.t > 0.5) { bossSet('walk'); pickCrabTarget(); } break;
  }
  b.raise = Math.max(0, (b.raise || 0) - 1 / 120);
}
function pickCrabTarget() {
  // se coloca a un lado de la arena, intentando quedar lejos de Simba
  const left = (arena.left + 3.5) * TS, right = (arena.right - 2.5) * TS;
  const px = player.x + player.w / 2;
  boss.targetX = px > arenaMid() ? left + Math.random() * TS * 2 : right - Math.random() * TS * 2;
}
const CRAB_IMPACT = 0.24; // s desde que empieza a bajar las pinzas hasta que tocan la arena
function crabImpact() {
  const b = boss, ph = bossPhase();
  shake = 9; SFX.thud();
  const gy = b.y + b.h;
  puff(b.x + b.w / 2, gy, 20, '#f2d16b', 120, 50, 0.5, 4);
  // dos ondas de arena que recorren el suelo hacia los lados: hay que saltarlas
  waves.push({ x: b.x - 10, y: gy, dir: -1, speed: ph.wave, t: 0 });
  waves.push({ x: b.x + b.w + 10, y: gy, dir: 1, speed: ph.wave, t: 0 });
}
function updateWaves(dt) {
  for (const w of waves) {
    w.t += dt; w.x += w.dir * w.speed * dt;
    if (w.x < (arena.left + 1) * TS || w.x > arena.right * TS) w.dead = true;
    if (Math.random() < dt * 30) puff(w.x, w.y - 4, 1, '#f2d16b', 20, 30, 0.3, 3);
    // la onda tiene ~20 px de alto: basta con saltarla
    if (state === 'play' && overlap(player, { x: w.x - 12, y: w.y - 20, w: 24, h: 20 })) hurtPlayer(w.x);
  }
  waves = waves.filter(w => !w.dead);
}

// ---------- Dibujo ----------
function drawBoss(cx, cy) {
  if (!boss || boss.state === 'gone') return;
  const b = boss;
  const fx = b.x + b.w / 2 - cx, fy = b.y + b.h - cy + 2;
  if (fx < -160 || fx > VW + 160) return;
  const blink = b.flash > 0 && Math.floor(b.flash * 14) % 2 === 0;
  const dizzy = b.state === b.def.vulnerable || b.state === 'defeated' || b.state === 'hurt';
  groundShadow(fx, fy - 2, b.w * 0.55);
  let rot = dizzy ? Math.sin(b.animT * 7) * 0.07 : 0;
  ctx.save();
  ctx.translate(Math.round(fx), Math.round(fy)); ctx.rotate(rot); ctx.translate(-Math.round(fx), -Math.round(fy));
  if (b.type === 'bruto') drawBrutoSprite(b, fx, fy, blink);
  else drawCrabSprite(b, fx, fy, blink);
  ctx.restore();
  if (dizzy) { // estrellitas girando sobre la cabeza
    const hx = fx + (b.type === 'bruto' ? b.dir * 34 : 0), hy = fy - b.h - 16;
    for (let i = 0; i < 3; i++) {
      const a = b.animT * 5 + i * Math.PI * 2 / 3;
      drawStar(hx + Math.cos(a) * 20, hy + Math.sin(a) * 6, 5, true);
    }
  }
  const warn = b.state === 'tell';
  if (warn) text('!', fx + (b.type === 'bruto' ? b.dir * 10 : 0), fy - b.h - 30 + Math.sin(b.t * 30) * 2, 16, '#ff6b6b');
  for (const w of waves) drawWave(w, cx, cy);
}
function drawBrutoSprite(b, fx, fy, blink) {
  const charge = anim(A.bruto, 'charge'), bark = anim(A.bruto, 'bark'), idle = anim(A.bruto, 'idle');
  let f = null, sx = 1, sy = 1;
  const st = b.state;
  if (st === 'charge' || st === 'skid' || st === 'flee') f = charge && frameAt(charge, b.animT, 14);
  else if (st === 'intro' || st === 'tell') {
    f = bark ? frameAt(bark, b.animT, 10) : idle && idle.frames[0];
    if (st === 'tell') { sy = 0.94; sx = 1.04; } // se agacha antes de embestir
  } else f = (idle || charge) && (idle || charge).frames[0];
  if (!drawFrame(f, fx, fy, b.dir < 0, sx, sy, blink ? 0.35 : 1)) {
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(Math.round(fx - b.w / 2), Math.round(fy - b.h), b.w, b.h);
  }
}
function drawCrabSprite(b, fx, fy, blink) {
  const st = b.state, set = A.bossCrab;
  const idle = anim(set, 'idle'), slam = anim(set, 'slam'), stuck = anim(set, 'stuck');
  let f = idle && idle.frames[0];
  if (st === 'slam' && slam) { // las pinzas bajan con la animación generada
    const n = slam.frames.length;
    f = slam.frames[Math.min(n - 1, Math.floor(b.t / CRAB_IMPACT * (n - 1)))];
  } else if (['stuck', 'hurt', 'defeated'].includes(st) && stuck) f = stuck.frames[0];
  else if (st === 'recover' && slam) { // vuelve a alzar las pinzas (animación al revés)
    const n = slam.frames.length;
    f = slam.frames[Math.max(0, n - 1 - Math.floor(b.t / 0.4 * (n - 1)))];
  } else if (st === 'tell' && b.raise > 0 && slam) { // entre golpes seguidos: sube las pinzas rápido
    const n = slam.frames.length;
    f = slam.frames[Math.max(0, Math.floor(b.raise / 0.25 * (n - 1)))];
  }
  // caminar de lado: vaivén; aviso: tiembla con las pinzas en alto
  const bob = st === 'walk' || st === 'flee' ? Math.abs(Math.sin(b.animT * 14)) * 3 : 0;
  const shiver = st === 'tell' ? Math.sin(b.t * 60) * 1.5 : 0;
  if (!drawFrame(f, fx + shiver, fy - bob, false, 1, 1, blink ? 0.35 : 1)) {
    ctx.fillStyle = '#d64933'; ctx.beginPath(); ctx.ellipse(fx, fy - b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (['stuck', 'hurt', 'defeated'].includes(st)) { // montoncitos de arena sobre las pinzas clavadas
    ctx.fillStyle = '#e8c45c';
    for (const dx of [-30, 30]) { ctx.beginPath(); ctx.ellipse(fx + dx, fy - 3, 14, 6, 0, Math.PI, 0); ctx.fill(); }
  }
}
function drawWave(w, cx, cy) {
  const x = w.x - cx, y = w.y - cy;
  const h = 18 + Math.sin(w.t * 20) * 2;
  ctx.fillStyle = '#1b1b2f';
  ctx.beginPath(); ctx.moveTo(x - 15, y + 1); ctx.quadraticCurveTo(x - w.dir * 4, y - h - 4, x + 15, y + 1); ctx.fill();
  ctx.fillStyle = '#f2d16b';
  ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.quadraticCurveTo(x - w.dir * 4, y - h, x + 12, y); ctx.fill();
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(Math.round(x - w.dir * 4 - 2), Math.round(y - h + 4), 4, 3);
}

function drawBossBar() {
  const b = boss, w = 150, x = VW / 2 - w / 2, y = 30;
  text(b.def.name, VW / 2, y + 3, 8, '#ffb3d1');
  ctx.fillStyle = '#1b1b2f'; ctx.fillRect(x - 2, y + 10, w + 4, 10);
  ctx.fillStyle = '#3a2030'; ctx.fillRect(x, y + 12, w, 6);
  const seg = w / b.maxHp;
  for (let i = 0; i < b.hp; i++) { ctx.fillStyle = '#ff4d6d'; ctx.fillRect(x + i * seg + 1, y + 12, seg - 2, 6); }
}
