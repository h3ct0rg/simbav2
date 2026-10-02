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
//
//  Mundo 3 · Doña Bellota, la ardilla gigante (4 golpes)
//    Desde su RAMA lanza bellotas apuntando a Simba. Simba sube con los géiseres y al
//    caerle encima la tira al SUELO, MAREADA (¡ahora!). Luego vuelve a trepar.
//    Con 1 golpe restante sube a COMERSE UNA BELLOTA DORADA (2,5 s):
//      · si Simba la interrumpe saltándole encima → no se cura y queda aturdida
//      · si no → recupera la mitad de su vida y entra en la FASE FINAL
//        (lluvia de bellotas y viento más fuerte). Solo ocurre una vez por pelea.
//
//  Mundo 4 · El Lobo de las Nieves (jefe final, "segundo aliento" al estilo souls)
//    FASE 1 (4 golpes): AVISO (gruñe, se agacha) → EMBESTIDA sobre el hielo → choca contra
//    la pared → caen carámbanos del techo (con sombra de aviso) → ATURDIDO (¡ahora!)
//    Al llegar a 0 cae rendido... y AÚLLA: la pantalla se oscurece, empieza la ventisca
//    y su barra se rellena.
//    FASE 2 (3 golpes): alterna embestida y SALTO sobre Simba (marca en el suelo), ráfagas
//    de ventisca y lluvia de carámbanos. Si Simba pierde una vida, la pelea vuelve a la FASE 1.
//    Al vencerlo queda agotado: "Solo quería algo de comer..." → elección (ending.js).
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
  squirrel: {
    name: 'DOÑA BELLOTA', w: 84, h: 66, hp: 4, custom: true,
    phases: [ // por golpes recibidos: 0..3
      { throwGap: 1.4, stun: 2.6 },
      { throwGap: 1.15, stun: 2.3 },
      { throwGap: 0.95, stun: 2.0 },
      { throwGap: 0.85, stun: 1.8 },
    ],
    final: { throwGap: 0.7, stun: 1.8, rain: true },
    vulnerable: 'dizzy',
  },
  wolf: {
    name: 'LOBO DE LAS NIEVES', w: 100, h: 62, hp: 4, custom: true,
    phases: [ // fase 1, por golpes recibidos: 0..3
      { speed: 300, tell: 0.9, stun: 2.4, bounces: 0, drops: 3 },
      { speed: 330, tell: 0.8, stun: 2.2, bounces: 0, drops: 3 },
      { speed: 360, tell: 0.7, stun: 2.0, bounces: 1, drops: 4 },
      { speed: 380, tell: 0.65, stun: 1.9, bounces: 1, drops: 4 },
    ],
    second: [ // fase 2 ("segundo aliento"), por golpes recibidos: 0..2
      { speed: 400, tell: 0.65, stun: 1.8, bounces: 1, drops: 5, pounceStun: 1.5, rain: 2.0 },
      { speed: 420, tell: 0.6, stun: 1.7, bounces: 1, drops: 5, pounceStun: 1.4, rain: 1.7 },
      { speed: 440, tell: 0.55, stun: 1.6, bounces: 1, drops: 6, pounceStun: 1.3, rain: 1.45 },
    ],
    vulnerable: 'dazed',
  },
};

function setupBoss(area) {
  boss = null; arena = null; waves = [];
  if (!area.boss || !area.arena) return;
  arena = { left: area.arena.left, right: area.arena.right, active: false, done: false };
  boss = makeBoss(area.boss, LV.world.boss || 'bruto');
  arena.orig = {}; // columnas originales de las paredes (la guarida del lobo tiene techo)
  for (const c of [arena.left, arena.right]) arena.orig[c] = area.grid.map(row => row[c]);
  if (boss.type === 'wolf') { // carámbanos colgando del techo de la guarida: caen cuando el lobo choca
    const ceil = c => { let r = 0; while (r < area.groundRow && area.grid[r][c] === SOLID) r++; return r; };
    for (let c = arena.left + 2; c <= arena.right - 2; c += 2) if (ceil(c) > 0) area.icicleObjs.push(makeIcicle(c * TS + TS / 2, ceil(c) * TS, true));
  }
}
function makeBoss(spawn, type) {
  const def = BOSS_DEFS[type];
  return { type, def, spawn, x: spawn.c * TS + TS / 2 - def.w / 2, y: (spawn.r + 1) * TS - def.h, w: def.w, h: def.h,
    vx: 0, vy: 0, dir: -1, hp: def.hp || 3, maxHp: def.hp || 3, state: 'wait', t: 0, invuln: 0, flash: 0, animT: 0,
    bounces: 0, slams: 0, onGround: false, hitWall: 0, canHeal: true, final: false, throwT: 1 };
}
const bossPhase = () => {
  const list = boss.second ? boss.def.second : boss.def.phases;
  return boss.final ? boss.def.final : list[clamp(boss.maxHp - boss.hp, 0, list.length - 1)];
};
const bossCleared = () => !arena || arena.done;
const bossBarVisible = () => arena && arena.active && !arena.done && boss && !['gone', 'choice', 'sit', 'leave', 'sadwalk'].includes(boss.state);
function arenaCameraLock() {
  if (!arena || !arena.active || arena.done || AR !== MAIN) return null;
  return arena.left * TS + ((arena.right - arena.left + 1) * TS - VW) / 2;
}
function setArenaWall(col, solid) {
  const orig = arena && arena.orig && arena.orig[col];
  for (let r = 0; r < MAIN.groundRow; r++) MAIN.grid[r][col] = solid ? SOLID : orig ? orig[r] : 0;
}
// Al morir durante la pelea, todo vuelve a empezar (el punto de control está justo antes)
function resetBossFight() {
  if (!arena || arena.done) return;
  setArenaWall(arena.left, false); setArenaWall(arena.right, false);
  arena.active = false; waves = []; acorns = [];
  boss = makeBoss(boss.spawn, boss.type); // el lobo vuelve a la FASE 1 con la vida llena
  for (const ic of MAIN.icicleObjs || []) if (ic.arena) { ic.st = 'hang'; ic.y = ic.y0; ic.grow = 1; }
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
    boss.type === 'bruto' ? SFX.bark() : boss.type === 'crab' ? SFX.thud() : boss.type === 'wolf' ? SFX.howl() : SFX.squeak();
  }
  if (boss && boss.state !== 'wait' && boss.state !== 'gone') {
    boss.t += dt; boss.animT += dt;
    boss.invuln = Math.max(0, boss.invuln - dt);
    boss.flash = Math.max(0, boss.flash - dt * 3);
    if (boss.type === 'wolf') updateWolfBoss(dt);
    else if (boss.def.custom) updateSquirrelBoss(dt); // física y contacto propios
    else {
      if (boss.type === 'bruto') updateBruto(dt); else updateCrab(dt);
      boss.vy = Math.min(boss.vy + GRAV * dt, MAXFALL);
      moveX(boss, boss.vx * dt);
      moveY(boss, boss.vy * dt);
      bossContact();
    }
    if (boss.type !== 'wolf') bossCommonStates(); // el lobo no huye: termina en la escena de la elección
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
    if (b.def.custom) { b.x += b.vx / 120; b.y = MAIN.groundRow * TS - b.h; }
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
    if (Math.random() < dt * 30) puff(w.x, w.y - 4, 1, w.snow ? '#ffffff' : '#f2d16b', 20, 30, 0.3, 3);
    // la onda tiene ~20 px de alto: basta con saltarla
    if (state === 'play' && overlap(player, { x: w.x - 12, y: w.y - 20, w: 24, h: 20 })) hurtPlayer(w.x);
  }
  waves = waves.filter(w => !w.dead);
}

// ---------- Doña Bellota ----------
const branchY = () => { // altura de la rama (tablón más alto dentro de la arena)
  for (let r = 1; r < MAIN.groundRow; r++) for (let c = arena.left + 1; c < arena.right; c++) if (MAIN.grid[r][c] === ONEWAY) return r * TS;
  return (MAIN.groundRow - 5) * TS;
};
const branchSpan = () => {
  const y = branchY() / TS; let a = null, z = null;
  for (let c = arena.left + 1; c < arena.right; c++) if (MAIN.grid[y][c] === ONEWAY) { if (a === null) a = c; z = c; }
  return { x0: a * TS, x1: (z + 1) * TS };
};
function squirrelJump(toBranch) { // arco de salto entre el suelo y la rama
  const b = boss, sp = branchSpan();
  // al caer, rueda hacia el lado izquierdo de la rama (no queda debajo): Simba puede saltarle encima desde arriba
  const fallX = clamp(sp.x0 - b.w - TS * 0.3, (arena.left + 1) * TS, sp.x0 - b.w);
  b.jump = { x0: b.x, y0: b.y, x1: toBranch ? (sp.x0 + sp.x1) / 2 - b.w / 2 : fallX,
    y1: (toBranch ? branchY() : MAIN.groundRow * TS) - b.h, t: 0, dur: toBranch ? 0.9 : 0.55 };
}
function updateSquirrelBoss(dt) {
  const b = boss, ph = bossPhase(), p = player;
  const onBranchY = branchY() - b.h, groundY = MAIN.groundRow * TS - b.h;
  b.dir = p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1;
  if (b.jump) { // en el aire: trepando o cayendo
    const j = b.jump; j.t += dt; const u = clamp(j.t / j.dur, 0, 1);
    b.x = lerp(j.x0, j.x1, u); b.y = lerp(j.y0, j.y1, u) - Math.sin(u * Math.PI) * (j.y1 < j.y0 ? 60 : 20);
    if (u >= 1) b.jump = null;
    return;
  }
  switch (b.state) {
    case 'intro': b.y = onBranchY; if (b.t > 1.5) bossSet('perch'); break;
    case 'perch': // lanza bellotas desde la rama
      b.y = onBranchY;
      b.throwT -= dt;
      if (b.throwT <= 0) { b.throwT = ph.throwGap; throwAcorn(b.x + b.w / 2 + b.dir * 20, b.y + 18, p, 0.95); b.throwAnim = 0.25; SFX.squeak(); }
      if (ph.rain && Math.random() < dt * 1.6) { // fase final: lluvia de bellotas desde las ramas altas
        const x = (arena.left + 2 + Math.random() * (arena.right - arena.left - 3)) * TS;
        acorns.push({ x, y: -10, vx: 0, vy: 60, r: 6, boss: true });
      }
      break;
    case 'eat': // se come la bellota dorada: ¡interrúmpela!
      b.y = onBranchY;
      if (Math.floor(b.t * 6) !== Math.floor((b.t - dt) * 6)) puff(b.x + b.w / 2, b.y + 20, 2, '#ffe066', 30, 30, 0.5, 3);
      if (b.t > 2.5) {
        b.hp = Math.min(b.maxHp, b.hp + Math.floor(b.maxHp / 2)); // recupera la mitad de su vida
        b.canHeal = false; b.final = true; b.flash = 1;
        flash(t('boss_healed_squirrel'), 2.4); SFX.grow(); shake = 6;
        puff(b.x + b.w / 2, b.y + b.h / 2, 30, '#ffe066', 100, 100, 0.8, 4);
        bossSet('perch'); b.throwT = 0.8;
      }
      break;
    case 'dizzy': // ¡ahora!
      b.y = groundY;
      if (b.t > ph.stun + (b.longStun ? 1.2 : 0)) { b.longStun = false; bossSet('climb'); squirrelJump(true); }
      break;
    case 'hurt':
      b.y = groundY;
      if (b.t > 0.6) {
        if (b.hp <= 0) bossSet('defeated');
        else if (b.hp === 1 && b.canHeal) { bossSet('climbHeal'); squirrelJump(true); }
        else { bossSet('climb'); squirrelJump(true); }
      }
      break;
    case 'climb': bossSet('perch'); b.throwT = 0.9; break;
    case 'climbHeal': bossSet('eat'); flash(t('boss_eating_squirrel'), 2.2); beep(880, 1320, 0.3, 'triangle', 0.06); break;
    case 'fall': bossSet('dizzy'); shake = 6; SFX.thud(); puff(b.x + b.w / 2, b.y + b.h, 16, '#e8b46a', 80, 50, 0.5, 4); break;
    case 'defeated': b.y = groundY; break;
  }
  squirrelContact();
}
// Simba le cae encima en la rama: la tira al suelo (y si estaba comiendo, la interrumpe)
function knockSquirrelDown(interrupted) {
  const b = boss;
  if (interrupted) { b.canHeal = false; b.longStun = true; flash(t('boss_interrupted_squirrel'), 2.2); b.flash = 1; }
  bossSet('fall'); squirrelJump(false);
  player.vy = -520; SFX.stomp(); shake = 4;
}
function squirrelContact() {
  const b = boss, p = player;
  if (state !== 'play' || b.jump || ['defeated', 'flee', 'gone', 'fall'].includes(b.state)) return;
  // Simba aterriza en la rama cerca de ella: la rama se sacude y la tira al suelo
  // (si estaba comiendo la bellota dorada, se interrumpe la curación)
  const onBranch = p.onGround && Math.abs(p.y + p.h - branchY()) < 2;
  if (onBranch && !b.branchLock && Math.abs(p.x + p.w / 2 - (b.x + b.w / 2)) < 3 * TS && (b.state === 'perch' || b.state === 'eat')) {
    knockSquirrelDown(b.state === 'eat');
    puff(p.x + p.w / 2, branchY(), 14, '#c98a45', 90, 40, 0.5, 3); // astillas de la rama
    return;
  }
  const hb = { x: b.x + 8, y: b.y + 6, w: b.w - 16, h: b.h - 6 };
  if (!overlap(p, hb)) return;
  const stomp = p.vy > 0 && p.prevBottom <= b.y + 18;
  if (b.state === 'dizzy' && stomp && b.invuln <= 0) { // golpe
    b.hp--; b.invuln = 1; b.flash = 1; bossSet('hurt'); acorns = acorns.filter(a => !a.boss);
    p.vy = -560; p.sx = 0.8; p.sy = 1.2; SFX.bossHit(); shake = 7;
    puff(b.x + b.w / 2, b.y + 6, 22, '#ffffff', 110, 100, 0.6, 4);
  } else if (b.state === 'dizzy' || b.state === 'hurt') {
    p.x += (p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1) * 2;
  } else if ((b.state === 'perch' || b.state === 'intro') && stomp) knockSquirrelDown(false);
  else if (b.state === 'eat' && stomp) knockSquirrelDown(true);
  else hurtPlayer(b.x + b.w / 2);
}

// ---------- El Lobo de las Nieves ----------
const blizzardOn = () => !!(boss && boss.type === 'wolf' && boss.second && arena && arena.active && !arena.done && !['defeated', 'choice'].includes(boss.state));
function wolfPhys(dt) {
  const b = boss;
  b.vy = Math.min(b.vy + GRAV * dt, MAXFALL);
  moveX(b, b.vx * dt); moveY(b, b.vy * dt);
}
// caen carámbanos del techo: los más cercanos a Simba primero, con un poco de azar
function dropIcicles(n, shakeTime) {
  const px = player.x + player.w / 2;
  const list = (MAIN.icicleObjs || []).filter(ic => ic.arena && ic.st === 'hang')
    .sort((a, c) => Math.abs(a.x - px) + Math.random() * 120 - (Math.abs(c.x - px) + Math.random() * 120));
  list.slice(0, n).forEach((ic, i) => { triggerIcicle(ic, (shakeTime || 0.6) + i * 0.12); });
}
function wolfLand() { // aterrizaje del salto: nieve y ondas por el suelo
  const b = boss;
  shake = 8; SFX.thud();
  puff(b.x + b.w / 2, b.y + b.h, 26, '#ffffff', 130, 70, 0.6, 4);
  waves.push({ x: b.x - 6, y: b.y + b.h, dir: -1, speed: 230, t: 0, snow: true });
  waves.push({ x: b.x + b.w + 6, y: b.y + b.h, dir: 1, speed: 230, t: 0, snow: true });
}
function updateWolfBoss(dt) {
  const b = boss, ph = bossPhase(), p = player;
  b.dark = lerp(b.dark || 0, b.second || b.state === 'rise' ? 1 : 0, Math.min(1, dt * (b.state === 'rise' ? 1.2 : 3)));
  switch (b.state) {
    case 'intro': b.vx = 0; if (b.t > 1.8) { bossSet('tell'); SFX.growl(); } break;
    case 'tell': // AVISO: se agacha y gruñe mirando a Simba
      b.vx = 0; faceSimba();
      if (b.t > ph.tell) {
        if (b.second && b.nextPounce) { bossSet('crouch'); b.target = clamp(p.x + p.w / 2, (arena.left + 2) * TS, arena.right * TS - TS); }
        else { bossSet('charge'); b.bounces = ph.bounces; }
        b.nextPounce = !b.nextPounce;
      }
      break;
    case 'charge': // embestida: sobre el hielo no puede frenar
      b.vx = b.dir * ph.speed;
      if (Math.random() < dt * 30) puff(b.x + b.w / 2 - b.dir * 30, b.y + b.h, 1, '#e6f8ff', 30, 20, 0.35, 3);
      if (b.hitWall) {
        shake = 10; SFX.thud();
        puff(b.dir > 0 ? b.x + b.w : b.x, b.y + b.h / 2, 18, '#ffffff', 80, 80, 0.5, 4);
        dropIcicles(ph.drops);
        if (b.bounces > 0) { b.bounces--; b.dir = -b.dir; bossSet('skid'); } else { bossSet('dazed'); b.stunFor = ph.stun; }
      }
      break;
    case 'skid': b.vx = b.dir * ph.speed * 0.3; if (b.t > 0.4) { bossSet('charge'); b.bounces = 0; } break;
    case 'crouch': b.vx = 0; // fase 2: marca el sitio y salta
      if (b.t > 0.55) {
        bossSet('pounce'); SFX.growl();
        b.jump = { x0: b.x, y0: b.y, x1: clamp(b.target - b.w / 2, (arena.left + 1) * TS, arena.right * TS - b.w), y1: b.y, t: 0, dur: 0.85 };
        b.dir = b.jump.x1 > b.x ? 1 : -1;
      }
      break;
    case 'pounce': {
      const j = b.jump; j.t += dt; const u = clamp(j.t / j.dur, 0, 1);
      b.x = lerp(j.x0, j.x1, u); b.y = j.y0 - Math.sin(u * Math.PI) * 120;
      if (u >= 1) { b.y = j.y0; b.jump = null; wolfLand(); bossSet('dazed'); b.stunFor = ph.pounceStun; }
      break;
    }
    case 'dazed': b.vx = 0; if (b.t > b.stunFor) bossSet('recover'); break; // ¡ahora!
    case 'hurt': b.vx = 0;
      if (b.t > 0.6) {
        if (b.hp > 0) bossSet('recover');
        else if (!b.second) { bossSet('down'); SFX.whimper(); }
        else { bossSet('defeated'); SFX.whimper(); }
      }
      break;
    case 'recover': b.vx = 0; if (b.t > 0.45) { bossSet('tell'); SFX.growl(); } break;
    case 'down': b.vx = 0; // cae rendido... ¿se acabó?
      if (b.t > 1.8) { bossSet('rise'); SFX.howl(); shake = 6; flash(t('boss_second_wolf'), 2.8); }
      break;
    case 'rise': // SEGUNDO ALIENTO: aúlla, oscurece, ventisca y la barra se rellena
      b.vx = 0;
      b.refill = clamp(b.t / 2.2, 0, 1);
      if (b.t > 2.4) {
        b.second = true; b.maxHp = b.def.second.length; b.hp = b.maxHp; b.refill = 0; b.flash = 1;
        b.nextPounce = false; b.rainT = 1.5; wind.t = 1.5;
        bossSet('tell'); SFX.growl();
      }
      break;
    case 'defeated': // agotado: empieza la escena de la elección
      b.vx = 0;
      if (b.t > 1.3 && state === 'play') startWolfChoice();
      break;
  }
  if (b.second && ['tell', 'charge', 'skid', 'crouch', 'pounce', 'dazed', 'recover'].includes(b.state)) { // lluvia de carámbanos
    b.rainT -= dt;
    if (b.rainT <= 0) { b.rainT = ph.rain; dropIcicles(1, 0.55); }
  }
  if (b.state !== 'pounce' && b.state !== 'choice') wolfPhys(dt);
  wolfContact();
}
function wolfContact() {
  const b = boss, p = player;
  if (state !== 'play' || ['down', 'rise', 'defeated', 'choice', 'gone'].includes(b.state)) {
    if (overlap(p, b) && state === 'play') p.x += (p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1) * 2; // no hace daño: solo empuja
    return;
  }
  bossContact();
}
function drawWolfDarkness() {
  if (!boss || boss.type !== 'wolf' || AR !== MAIN || !(boss.dark > 0.01) || (arena && arena.done)) return;
  const k = boss.dark;
  ctx.fillStyle = `rgba(8,12,40,${0.5 * k})`; ctx.fillRect(0, 0, VW, VH);
  const g = ctx.createRadialGradient(VW / 2, VH / 2, 120, VW / 2, VH / 2, 380);
  g.addColorStop(0, 'rgba(0,0,20,0)'); g.addColorStop(1, `rgba(0,0,20,${0.55 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (boss.state === 'rise') { // ojos que brillan en la oscuridad
    const ex = boss.x + boss.w / 2 + boss.dir * 30 - camX, ey = boss.y + 14 - camY;
    glowDot(ex, ey, '#8fe3ff', 10 + Math.sin(boss.t * 12) * 3);
  }
}
const WOLF_SCALE = 0.72; // el sprite generado es grande (172 px): se dibuja reducido
function drawWolfSprite(b, fx, fy, blink) {
  const run = anim(A.wolf, 'run'), howl = anim(A.wolf, 'howl'), sad = anim(A.wolf, 'sad'), idle = anim(A.wolf, 'idle');
  let f = idle && idle.frames[0], sx = 1, sy = 1;
  const st = b.state;
  if (st === 'charge' || st === 'skid' || st === 'flee' || st === 'leave') f = run && frameAt(run, b.animT, 14);
  else if (st === 'sadwalk') { f = run && frameAt(run, b.animT, 5); sy = 0.94; } // se aleja despacio, cabizbajo
  else if (st === 'sit') f = idle && idle.frames[0];
  else if (st === 'pounce') f = run && run.frames[2 % run.frames.length];
  else if (st === 'intro' || st === 'rise') f = howl ? howl.frames[Math.min(howl.frames.length - 1, Math.floor(b.t * 4) % (howl.frames.length + 3))] : f;
  else if (st === 'down' || st === 'defeated' || st === 'choice') {
    f = sad ? sad.frames[Math.min(sad.frames.length - 1, Math.floor((b.lieT !== undefined ? b.lieT : b.t) * 5))] : f;
    if (!sad) { sy = 0.7; sx = 1.1; }
  } else if (st === 'tell' || st === 'crouch') { sy = 0.9; sx = 1.05; f = idle && idle.frames[0]; }
  if (!drawFrame(f, fx, fy, b.dir < 0, sx * WOLF_SCALE, sy * WOLF_SCALE, blink ? 0.35 : 1)) {
    ctx.fillStyle = '#dfe8f2'; ctx.fillRect(Math.round(fx - b.w / 2), Math.round(fy - b.h * sy), b.w, b.h * sy);
  }
  if (st === 'crouch' || st === 'pounce') { // marca donde va a caer
    const tx = (b.jump ? b.jump.x1 + b.w / 2 : b.target) - camX, ty = MAIN.groundRow * TS - camY;
    ctx.strokeStyle = `rgba(255,90,90,${0.6 + Math.sin(menuT * 20) * 0.3})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(tx, ty - 2, 26, 6, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

// ---------- Bellotas (ardillas enemigas y Doña Bellota) ----------
let acorns = [];
// Lanza una bellota en arco que cae cerca de Simba en `T` segundos
function throwAcorn(x, y, target, T) {
  const tx = target.x + target.w / 2 + target.vx * T * 0.4, ty = target.y + target.h / 2;
  const g = 900;
  acorns.push({ x, y, vx: (tx - x) / T, vy: (ty - y - 0.5 * g * T * T) / T, r: 5, g });
}
function updateAcorns(dt) {
  for (const a of acorns) {
    a.vy += (a.g || 900) * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.rot = (a.rot || 0) + dt * 10;
    if (tile(Math.floor(a.x / TS), Math.floor((a.y + a.r) / TS)) === SOLID || a.y > ROWS * TS + 20) {
      a.dead = true; puff(a.x, a.y, a.snow ? 10 : 6, a.snow ? '#ffffff' : '#8b5a2b', 50, 50, 0.35, 3);
    }
    if (!a.dead && state === 'play' && overlap(player, { x: a.x - a.r, y: a.y - a.r, w: a.r * 2, h: a.r * 2 })) {
      a.dead = true; hurtPlayer(a.x); puff(a.x, a.y, a.snow ? 10 : 6, a.snow ? '#ffffff' : '#8b5a2b', 50, 50, 0.35, 3);
    }
  }
  acorns = acorns.filter(a => !a.dead);
}
function drawAcorns(cx, cy) {
  for (const a of acorns) {
    const x = Math.round(a.x - cx), y = Math.round(a.y - cy);
    if (a.snow) { // bola de nieve
      ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(x, y, a.r + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, a.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9e2f5'; ctx.fillRect(x - 2, y + 1, 4, 2);
      continue;
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(a.rot || 0);
    ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.ellipse(0, 1, a.r + 2, a.r + 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b5652b'; ctx.beginPath(); ctx.ellipse(0, 1, a.r, a.r + 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b3f1f'; ctx.fillRect(-a.r, -a.r, a.r * 2, 4); // sombrerito
    ctx.restore();
  }
}

// ---------- Dibujo ----------
function drawBoss(cx, cy) {
  if (!boss || boss.state === 'gone') return;
  const b = boss;
  const fx = b.x + b.w / 2 - cx, fy = b.y + b.h - cy + 2;
  if (fx < -160 || fx > VW + 160) return;
  const blink = b.flash > 0 && Math.floor(b.flash * 14) % 2 === 0;
  const dizzy = b.state === b.def.vulnerable || (b.state === 'defeated' && b.type !== 'wolf') || b.state === 'hurt';
  groundShadow(fx, fy - 2 + (b.type === 'wolf' ? MAIN.groundRow * TS - (b.y + b.h) : 0), b.w * 0.55);
  let rot = dizzy && b.type !== 'wolf' ? Math.sin(b.animT * 7) * 0.07 : 0;
  ctx.save();
  ctx.translate(Math.round(fx), Math.round(fy)); ctx.rotate(rot); ctx.translate(-Math.round(fx), -Math.round(fy));
  if (b.type === 'bruto') drawBrutoSprite(b, fx, fy, blink);
  else if (b.type === 'crab') drawCrabSprite(b, fx, fy, blink);
  else if (b.type === 'wolf') drawWolfSprite(b, fx, fy, blink);
  else drawSquirrelSprite(b, fx, fy, blink);
  ctx.restore();
  if (dizzy) { // estrellitas girando sobre la cabeza
    const hx = fx + (b.type === 'bruto' ? b.dir * 34 : b.type === 'squirrel' ? b.dir * 10 : b.type === 'wolf' ? b.dir * 28 : 0), hy = fy - b.h - 16;
    for (let i = 0; i < 3; i++) {
      const a = b.animT * 5 + i * Math.PI * 2 / 3;
      drawStar(hx + Math.cos(a) * 20, hy + Math.sin(a) * 6, 5, true);
    }
  }
  const warn = b.state === 'tell';
  if (warn || b.state === 'crouch') text('!', fx + (b.type === 'bruto' || b.type === 'wolf' ? b.dir * 10 : 0), fy - b.h - 30 + Math.sin(b.t * 30) * 2, 16, '#ff6b6b');
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
function drawSquirrelSprite(b, fx, fy, blink) {
  const eat = anim(A.bossSquirrelEat, 'eat');
  let f = A.bossSquirrel, sx = 1, sy = 1;
  if (b.state === 'eat' && eat) {
    f = frameAt(eat, b.t, 6);
    // halo dorado mientras se cura
    const g = ctx.createRadialGradient(fx, fy - b.h / 2, 6, fx, fy - b.h / 2, 70);
    g.addColorStop(0, `rgba(255,230,120,${0.45 + Math.sin(b.t * 10) * 0.15})`); g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g; ctx.fillRect(fx - 70, fy - b.h - 40, 140, 140);
  }
  b.throwAnim = Math.max(0, (b.throwAnim || 0) - 1 / 60);
  if (b.throwAnim > 0) { sx = 1.08; sy = 0.92; }
  if (!drawFrame(f, fx, fy, b.dir > 0, sx, sy, blink ? 0.35 : 1)) {
    ctx.fillStyle = '#c0582b'; ctx.fillRect(Math.round(fx - b.w / 2), Math.round(fy - b.h), b.w, b.h);
  }
}
function drawWave(w, cx, cy) {
  const x = w.x - cx, y = w.y - cy;
  const h = 18 + Math.sin(w.t * 20) * 2;
  ctx.fillStyle = '#1b1b2f';
  ctx.beginPath(); ctx.moveTo(x - 15, y + 1); ctx.quadraticCurveTo(x - w.dir * 4, y - h - 4, x + 15, y + 1); ctx.fill();
  ctx.fillStyle = w.snow ? '#eef7ff' : '#f2d16b';
  ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.quadraticCurveTo(x - w.dir * 4, y - h, x + 12, y); ctx.fill();
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(Math.round(x - w.dir * 4 - 2), Math.round(y - h + 4), 4, 3);
}

function drawBossBar() {
  const b = boss, w = 150, x = VW / 2 - w / 2, y = 30;
  text(b.def.name, VW / 2, y + 3, 8, '#ffb3d1');
  ctx.fillStyle = '#1b1b2f'; ctx.fillRect(x - 2, y + 10, w + 4, 10);
  ctx.fillStyle = '#3a2030'; ctx.fillRect(x, y + 12, w, 6);
  if (b.state === 'rise') { // segundo aliento: la barra se rellena (en azul hielo)
    const n = b.def.second.length, seg2 = w / n;
    for (let i = 0; i < Math.floor(b.refill * n + 0.001); i++) { ctx.fillStyle = '#8fe3ff'; ctx.fillRect(x + i * seg2 + 1, y + 12, seg2 - 2, 6); }
    return;
  }
  const seg = w / b.maxHp;
  for (let i = 0; i < b.hp; i++) { ctx.fillStyle = b.second ? '#8fe3ff' : '#ff4d6d'; ctx.fillRect(x + i * seg + 1, y + 12, seg - 2, 6); }
}
