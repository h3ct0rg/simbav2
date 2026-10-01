'use strict';
// ============================================================
//  Jefe del Mundo 1: Bruto, el gran bulldog
//
//  Ciclo: AVISO (ladra) → EMBESTIDA → choca contra la pared → MAREADO
//         → Simba le salta encima (golpe) → se recupera más rápido y furioso.
//  3 golpes. En las fases 2 y 3, la primera vez que choca rebota y vuelve a
//  embestir sin marearse, y tanto la embestida como el mareo son más exigentes.
//  Al perder huye por la izquierda (no se le hace daño de verdad: tono amable).
// ============================================================

let boss = null, arena = null;
const BOSS_PHASES = [ // por golpes recibidos: 0, 1, 2
  { speed: 250, tell: 0.95, stun: 2.4, bounces: 0 },
  { speed: 310, tell: 0.75, stun: 2.0, bounces: 1 },
  { speed: 370, tell: 0.55, stun: 1.6, bounces: 1 },
];

function setupBoss(area) {
  boss = null; arena = null;
  if (!area.boss || !area.arena) return;
  arena = { left: area.arena.left, right: area.arena.right, active: false, done: false };
  boss = makeBoss(area.boss);
}
function makeBoss(spawn) {
  const w = 96, h = 66; // ajustado al sprite de Bruto (~110x80 px visibles)
  return { spawn, x: spawn.c * TS + TS / 2 - w / 2, y: (spawn.r + 1) * TS - h, w, h, vx: 0, vy: 0, dir: -1,
    hp: 3, maxHp: 3, state: 'wait', t: 0, invuln: 0, flash: 0, animT: 0, bounces: 0, onGround: false, hitWall: 0 };
}
const bossPhase = () => BOSS_PHASES[Math.min(2, boss.maxHp - boss.hp)];
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
  arena.active = false;
  boss = makeBoss(boss.spawn);
}

function bossSet(st) { boss.state = st; boss.t = 0; }
function faceSimba() { boss.dir = player.x + player.w / 2 < boss.x + boss.w / 2 ? -1 : 1; }

function updateArena(dt) {
  if (!arena || AR !== MAIN) return;
  // Simba entra en la arena: se cierran las paredes y empieza la pelea
  if (!arena.active && !arena.done && player.x > (arena.left + 1.5) * TS) {
    arena.active = true;
    setArenaWall(arena.left, true); setArenaWall(arena.right, true);
    bossSet('intro'); faceSimba();
    flash(t('boss_name'), 2.2); SFX.bark(); shake = 6;
  }
  if (boss && boss.state !== 'wait' && boss.state !== 'gone') updateBoss(dt);
}

function updateBoss(dt) {
  const b = boss, ph = bossPhase();
  b.t += dt; b.animT += dt;
  b.invuln = Math.max(0, b.invuln - dt);
  b.flash = Math.max(0, b.flash - dt * 3);

  switch (b.state) {
    case 'intro': // ladra amenazante antes de la primera embestida
      b.vx = 0;
      if (b.t > 1.5) { bossSet('tell'); SFX.bark(); }
      break;
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
        if (b.bounces > 0) { b.bounces--; b.dir = -b.dir; bossSet('skid'); }
        else bossSet('stunned');
      }
      break;
    case 'skid': // rebota de la pared y vuelve a embestir enseguida
      b.vx = b.dir * ph.speed * 0.3;
      if (b.t > 0.35) { bossSet('charge'); b.bounces = 0; }
      break;
    case 'stunned': // ¡ahora! vulnerable
      b.vx = 0;
      if (b.t > ph.stun) { bossSet('recover'); }
      break;
    case 'hurt':
      b.vx = 0;
      if (b.t > 0.6) bossSet(b.hp <= 0 ? 'defeated' : 'recover');
      break;
    case 'recover':
      b.vx = 0;
      if (b.t > 0.45) { bossSet('tell'); SFX.bark(); }
      break;
    case 'defeated': // mareado del todo, luego huye por la izquierda
      b.vx = 0;
      if (b.t > 1.4) {
        bossSet('flee'); b.dir = -1;
        setArenaWall(arena.left, false);
        flash(t('boss_beaten'), 2.5);
      }
      break;
    case 'flee':
      b.vx = -300;
      if (b.x < (arena.left - 14) * TS) {
        bossSet('gone');
        setArenaWall(arena.right, false); // se abre el camino hacia mamá
        arena.done = true;
        SFX.check();
      }
      break;
  }
  b.vy = Math.min(b.vy + GRAV * dt, MAXFALL);
  moveX(b, b.vx * dt);
  moveY(b, b.vy * dt);

  // Choque con Simba
  if (state !== 'play' || b.state === 'defeated' || b.state === 'flee' || b.state === 'gone') return;
  const p = player, hb = { x: b.x + 6, y: b.y + 6, w: b.w - 12, h: b.h - 6 };
  if (!overlap(p, hb)) return;
  const stomp = p.vy > 0 && p.prevBottom <= b.y + 18;
  if (b.state === 'stunned' && stomp && b.invuln <= 0) {
    b.hp--; b.invuln = 1; b.flash = 1; bossSet('hurt');
    p.vy = -560; p.sx = 0.8; p.sy = 1.2;
    SFX.bossHit(); shake = 7;
    puff(b.x + b.w / 2, b.y + 6, 22, '#ffffff', 110, 100, 0.6, 4);
  } else if (b.state === 'stunned' || b.state === 'hurt') {
    // mareado no hace daño: Simba solo lo empuja un poco
    p.x += (p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1) * 2;
  } else if (stomp) {
    // saltar sobre su lomo cuando NO está mareado: rebote sin daño para nadie
    p.vy = -480; SFX.stomp();
  } else hurtPlayer(b.x + b.w / 2);
}

// ---------- Dibujo ----------
function drawBoss(cx, cy) {
  if (!boss || boss.state === 'gone') return;
  const b = boss;
  const fx = b.x + b.w / 2 - cx, fy = b.y + b.h - cy + 2;
  if (fx < -140 || fx > VW + 140) return;
  const charge = anim(A.bruto, 'charge'), bark = anim(A.bruto, 'bark'), idle = anim(A.bruto, 'idle');
  let f = null, rot = 0, sx = 1, sy = 1;
  const st = b.state;
  if (st === 'charge' || st === 'skid' || st === 'flee') f = charge && frameAt(charge, b.animT, 14);
  else if (st === 'intro' || st === 'tell') {
    f = bark ? frameAt(bark, b.animT, 10) : idle && idle.frames[0];
    if (st === 'tell') { sy = 0.94; sx = 1.04; } // se agacha antes de embestir
  } else {
    f = (idle || charge) && (idle || charge).frames[0];
    if (st === 'stunned' || st === 'defeated' || st === 'hurt') rot = Math.sin(b.animT * 7) * 0.07; // tambaleo
  }
  groundShadow(fx, fy - 2, 50);
  const blink = b.flash > 0 && Math.floor(b.flash * 14) % 2 === 0;
  ctx.save();
  ctx.translate(Math.round(fx), Math.round(fy)); ctx.rotate(rot); ctx.translate(-Math.round(fx), -Math.round(fy));
  if (!drawFrame(f, fx, fy, b.dir < 0, sx, sy, blink ? 0.35 : 1)) {
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(Math.round(fx - b.w / 2), Math.round(fy - b.h), b.w, b.h);
  }
  ctx.restore();
  // estrellitas girando sobre la cabeza cuando está mareado
  if (st === 'stunned' || st === 'defeated' || st === 'hurt') {
    const hx = fx + b.dir * 34, hy = fy - b.h - 16;
    for (let i = 0; i < 3; i++) {
      const a = b.animT * 5 + i * Math.PI * 2 / 3;
      drawStar(hx + Math.cos(a) * 20, hy + Math.sin(a) * 6, 5, true);
    }
  }
  // "!" de aviso antes de embestir
  if (st === 'tell') text('!', fx + b.dir * 10, fy - b.h - 30 + Math.sin(b.t * 30) * 2, 16, '#ff6b6b');
}

function drawBossBar() {
  const b = boss, w = 150, x = VW / 2 - w / 2, y = 30;
  text('BRUTO', VW / 2, y + 3, 8, '#ffb3d1');
  ctx.fillStyle = '#1b1b2f'; ctx.fillRect(x - 2, y + 10, w + 4, 10);
  ctx.fillStyle = '#3a2030'; ctx.fillRect(x, y + 12, w, 6);
  const seg = w / b.maxHp;
  for (let i = 0; i < b.hp; i++) { ctx.fillStyle = '#ff4d6d'; ctx.fillRect(x + i * seg + 1, y + 12, seg - 2, 6); }
}
