'use strict';
// ============================================================
//  Estadísticas de jugadores (Firebase Realtime Database, vía su API REST)
//
//  /simba/online/<id>   = hora del último "sigo aquí" (cada 30 s mientras el juego está abierto)
//  /simba/players/<id>  = { first, last, lvl }  (primera y última visita, nivel más avanzado)
//
//  · "Jugando ahora" = ids que avisaron en los últimos 70 s (al cerrar u ocultar la pestaña se borran).
//  · "Jugadores"     = ids distintos que abrieron el juego alguna vez (uno por navegador).
//  /simba/choices/give/<runId> · /simba/choices/keep/<runId> = true
//      elección con el lobo: UNA por partida (la primera). Se muestra al terminar el juego.
//  · El id es aleatorio y anónimo: no se guarda ningún dato personal.
//  · Si no hay conexión o Firebase falla, el juego sigue igual y el indicador no se muestra.
// ============================================================

const STATS_URL = 'https://spud-survival-default-rtdb.firebaseio.com/simba';
const STATS = { online: null, total: null, ok: false };
const ONLINE_WINDOW = 70 * 1000, HEARTBEAT_MS = 30 * 1000;

const PLAYER_ID = (() => {
  try {
    let id = localStorage.getItem('simba.playerId');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 24);
      localStorage.setItem('simba.playerId', id);
    }
    return id;
  } catch (e) { return 'anon' + Math.random().toString(36).slice(2, 12); } // modo privado: id temporal
})();
const SERVER_TS = { '.sv': 'timestamp' };
let serverNow = 0; // hora del servidor (la devuelve cada escritura): evita depender del reloj del móvil

async function statsFetch(path, opts = {}) {
  const r = await fetch(`${STATS_URL}/${path}.json${opts.query || ''}`, {
    method: opts.method || 'GET', body: opts.body ? JSON.stringify(opts.body) : undefined, keepalive: !!opts.keepalive,
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Nivel más avanzado alcanzado en cualquiera de las partidas de este navegador
function furthestLevelId() {
  let best = 0;
  for (let i = 0; i < SLOT_COUNT; i++) { const d = readSlot(i); if (d) best = Math.max(best, d.unlocked || 1); }
  const lv = ALL_LEVELS[Math.min(best, ALL_LEVELS.length) - 1];
  return lv ? lv.id : '1-1';
}

async function heartbeat() {
  serverNow = await statsFetch('online/' + PLAYER_ID, { method: 'PUT', body: SERVER_TS });
}
async function registerPlayer() {
  const data = { last: SERVER_TS, lvl: furthestLevelId() };
  let first = false;
  try { first = !localStorage.getItem('simba.registered'); } catch (e) { }
  if (first) data.first = SERVER_TS;
  await statsFetch('players/' + PLAYER_ID, { method: 'PATCH', body: data });
  try { localStorage.setItem('simba.registered', '1'); } catch (e) { }
}
async function refreshCounts() {
  const online = (await statsFetch('online')) || {};
  const now = serverNow || Date.now();
  let n = 0;
  const stale = [];
  for (const [id, ts] of Object.entries(online)) {
    if (now - ts < ONLINE_WINDOW) n++;
    else if (now - ts > 10 * 60 * 1000) stale.push(id); // restos de pestañas que no se cerraron bien
  }
  // limpieza: cada cliente borra unos pocos registros viejos que encuentre
  stale.slice(0, 5).forEach(id => statsFetch('online/' + id, { method: 'DELETE' }).catch(() => { }));
  const players = (await statsFetch('players', { query: '?shallow=true' })) || {};
  STATS.online = Math.max(1, n); STATS.total = Math.max(1, Object.keys(players).length); STATS.ok = true;
}
async function statsTick() {
  if (document.visibilityState === 'hidden') return;
  try { await heartbeat(); await refreshCounts(); } catch (e) { STATS.ok = false; }
}
function goOffline() { // al cerrar u ocultar la pestaña deja de contar como "jugando ahora"
  try { fetch(`${STATS_URL}/online/${PLAYER_ID}.json`, { method: 'DELETE', keepalive: true }); } catch (e) { }
}
// el nivel alcanzado se actualiza al completar niveles (lo llama recordLevel)
function statsLevelUp() { statsFetch('players/' + PLAYER_ID, { method: 'PATCH', body: { last: SERVER_TS, lvl: furthestLevelId() } }).catch(() => { }); }

// Elección con el lobo: se registra solo la primera de cada partida (las reglas impiden sobrescribirla)
function recordChoice(kind, runId) {
  if (!runId) return;
  statsFetch(`choices/${kind}/${runId}`, { method: 'PUT', body: true }).catch(() => { });
}
// Cuántas partidas eligieron cada opción. null si no hay conexión.
async function fetchChoiceStats() {
  try {
    const [g, k] = await Promise.all(['give', 'keep'].map(kind => statsFetch(`choices/${kind}`, { query: '?shallow=true' })));
    return { give: Object.keys(g || {}).length, keep: Object.keys(k || {}).length };
  } catch (e) { return null; }
}

// se arranca cuando ya cargaron todos los scripts (necesita los niveles y las partidas)
addEventListener('load', async function startStats() {
  try { await registerPlayer(); } catch (e) { }
  statsTick();
  setInterval(statsTick, HEARTBEAT_MS);
  addEventListener('pagehide', goOffline);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') goOffline(); else statsTick(); });
});

// Indicador discreto en el menú principal: "👥 3 jugando ahora · 128 jugadores"
function drawPlayerStats() {
  if (!STATS.ok) return;
  const label = `${STATS.online} ${t('stats_online')} · ${STATS.total} ${t('stats_total')}`;
  ctx.font = 'bold 7px "Press Start 2P", monospace';
  const w = ctx.measureText(label).width + 34, x = 10, y = 10;
  pixRect(x - 2, y - 2, w + 4, 20, '#1b1b2f'); pixRect(x, y, w, 16, 'rgba(36,38,82,0.85)');
  // dos cabecitas (la fuente no trae el emoji)
  const head = (hx, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(hx, y + 6, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(hx - 4, y + 10, 8, 4); };
  head(x + 15, '#8fa8d6'); head(x + 10, '#ffffff');
  // punto verde parpadeante = en vivo
  ctx.fillStyle = `rgba(124,242,196,${0.6 + Math.sin(menuT * 4) * 0.4})`; ctx.beginPath(); ctx.arc(x + 22, y + 8, 2, 0, Math.PI * 2); ctx.fill();
  text(label, x + 28, y + 9, 7, '#e5e7eb', 'left');
}
