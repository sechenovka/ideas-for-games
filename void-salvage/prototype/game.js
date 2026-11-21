// VOID SALVAGE — prototype v0.3
// Block-grid ship assembly + fleet selection + squad orders + pause.
// Blender-rendered sprites; turrets are two-layer (base + rotating barrel).
// Editor: place blocks -> pick up to 2 wingmen -> LAUNCH -> raid the station.
(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth, H = canvas.height = innerHeight;
addEventListener('resize', () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; });

// ---------- constants ----------
const TAU = Math.PI * 2;
const CS = 26;              // world cell size
const GRID = 9;             // editor grid GRID x GRID
const BUDGET = 16;          // scrap points for the editor
const MAX_WING = 2;         // max escort ships you can bring
const TYPES = {
  hull:   { cost: 1, hp: 45, color: '#4a6a9a', edge: '#6e92c8', name: 'HULL' },
  engine: { cost: 2, hp: 30, color: '#7a4a2a', edge: '#ff9d5c', name: 'ENGINE' },
  turret: { cost: 3, hp: 28, color: '#2a4a5e', edge: '#7fd4ff', name: 'GUN' },
};
const KEYS_ORDER = ['hull', 'engine', 'turret'];
// escort roster — pick up to MAX_WING
const ROSTER = [
  { name: 'SCOUT',   desc: 'fast, 1 gun',  color: '#9dff8a', g: [[4,3,'engine'],[4,4,'hull'],[4,5,'turret']] },
  { name: 'GUNSHIP', desc: '2 guns',       color: '#7fd4ff', g: [[4,3,'engine'],[4,4,'hull'],[3,4,'hull'],[5,4,'hull'],[4,5,'turret'],[3,5,'turret']] },
  { name: 'BULWARK', desc: 'armored',      color: '#ffcf6e', g: [[4,3,'engine'],[4,4,'hull'],[4,5,'turret'],[3,4,'hull'],[5,4,'hull'],[5,5,'hull'],[4,6,'hull']] },
];

// ---------- sprites (rendered via Blender MCP) ----------
const SPRITES = {};
for (const k of ['hull', 'hull_b', 'hull_c', 'engine', 'gun_base', 'gun_barrel', 'st_base', 'st_barrel']) {
  const img = new Image();
  img.src = 'assets/' + k + '.png';
  SPRITES[k] = img;
}
const HULL_VARIANTS = ['hull', 'hull_b', 'hull_c'];
const sprReady = s => s && s.complete && s.naturalWidth;

// ---------- helpers ----------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- state ----------
let mode = 'editor'; // 'editor' | 'flight'
let grid, selected = 'hull';
let allies = [], foes, station, bullets, particles, stars, planet;
const selection = new Set(); // ally ships under command
let rosterSel = new Set();   // chosen escort indices
let paused = false, autopilot = false, won = false, dead = false, time = 0;
let salvage = 0, debris = [], msg = null, reinforced = false;
const budget = () => BUDGET + salvage;
let cam = { x: 0, y: 0, zoom: 1 };   // free camera: wheel zoom, RMB/MMB drag pan, F re-center
let dragging = false, dragLast = null;
const autoBtn  = { x: 0, y: 0, w: 150, h: 38 };
const pauseBtn = { x: 0, y: 0, w: 120, h: 38 };
const allBtn   = { x: 0, y: 0, w: 140, h: 38 };
const launchBtn = { x: 0, y: 0, w: 170, h: 46 };
const palette = {};   // part key -> rect
const rosterRects = []; // i -> rect

const flagship = () => allies[0];

// ---------- input ----------
addEventListener('keydown', e => {
  if (mode !== 'flight') return;
  if (e.code === 'KeyP') autopilot = !autopilot;
  if (e.code === 'KeyA') selectAll();
  if (e.code === 'KeyR') mode = 'editor';
  if (e.code === 'KeyF') { const f = allies.find(s => s.alive); if (f) { cam.x = f.x; cam.y = f.y; } }
  if (e.code === 'Space') { paused = !paused; e.preventDefault(); }
});
addEventListener('mousedown', e => {
  if (mode === 'editor') { if (e.button === 0) editorClick(e.clientX, e.clientY); return; }
  if (e.button === 1 || e.button === 2) { dragging = true; dragLast = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
  if (e.button === 0) flightClick(e.clientX, e.clientY, e.shiftKey);
});
addEventListener('mousemove', e => {
  if (!dragging || mode !== 'flight') return;
  cam.x -= (e.clientX - dragLast.x) / cam.zoom;
  cam.y -= (e.clientY - dragLast.y) / cam.zoom;
  dragLast = { x: e.clientX, y: e.clientY };
});
addEventListener('mouseup', () => { dragging = false; });
addEventListener('wheel', e => {
  if (mode !== 'flight') return;
  const k = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const n = Math.max(0.4, Math.min(1.8, cam.zoom * k));
  // zoom toward cursor
  cam.x += ((e.clientX - W / 2) / cam.zoom) * (1 - cam.zoom / n);
  cam.y += ((e.clientY - H / 2) / cam.zoom) * (1 - cam.zoom / n);
  cam.zoom = n;
  e.preventDefault();
}, { passive: false });
addEventListener('contextmenu', e => e.preventDefault());

function selectAll() {
  selection.clear();
  for (const s of allies) if (s.alive) selection.add(s);
}
const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ---------- editor ----------
function starterGrid() {
  const g = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  const c = (GRID - 1) / 2;
  g[c][c - 2] = 'engine'; g[c][c - 1] = 'hull'; g[c][c] = 'hull'; g[c][c + 1] = 'turret';
  return g;
}

function gridCost() {
  let s = 0;
  for (const row of grid) for (const t of row) if (t) s += TYPES[t].cost;
  return s;
}

function hasNeighbor(r, c) {
  for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && grid[nr][nc]) return true;
  }
  return false;
}

function gridScreen() {
  const s = Math.min(46, Math.floor(Math.min(W, H) * 0.72 / GRID));
  return { x: W * 0.34 - s * GRID / 2, y: H / 2 - s * GRID / 2, s };
}

function editorClick(mx, my) {
  for (const k of KEYS_ORDER) {
    const r = palette[k];
    if (r && inRect(r, mx, my)) { selected = k; return; }
  }
  for (let i = 0; i < ROSTER.length; i++) {
    const r = rosterRects[i];
    if (r && inRect(r, mx, my)) {
      if (rosterSel.has(i)) rosterSel.delete(i);
      else if (rosterSel.size < MAX_WING) rosterSel.add(i);
      return;
    }
  }
  if (inRect(launchBtn, mx, my)) { if (canLaunch().ok) launch(); return; }
  const gs = gridScreen();
  const c = Math.floor((mx - gs.x) / gs.s), r = Math.floor((my - gs.y) / gs.s);
  if (c < 0 || c >= GRID || r < 0 || r >= GRID) return;
  if (grid[r][c]) {
    if (grid.flat().filter(Boolean).length > 1) grid[r][c] = null;
    return;
  }
  if (!hasNeighbor(r, c)) return;
  if (gridCost() + TYPES[selected].cost > budget()) return;
  grid[r][c] = selected;
}

function canLaunch() {
  const flat = grid.flat().filter(Boolean);
  const n = t => flat.filter(x => x === t).length;
  if (!n('hull')) return { ok: false, why: 'need HULL' };
  if (!n('engine')) return { ok: false, why: 'need ENGINE' };
  if (!n('turret')) return { ok: false, why: 'need GUN' };
  return { ok: true };
}

// ---------- ship building ----------
function blocksFromGrid(g) {
  const blocks = [], c = (GRID - 1) / 2;
  for (let r = 0; r < GRID; r++) for (let col = 0; col < GRID; col++) {
    const t = g[r][col];
    if (t) blocks.push({
      dx: (col - c) * CS, dy: (r - c) * CS, type: t,
      hp: TYPES[t].hp, maxHp: TYPES[t].hp, cd: rand(0, 0.5),
      variant: t === 'hull' ? HULL_VARIANTS[Math.floor(Math.random() * HULL_VARIANTS.length)] : t,
      aim: 0
    });
  }
  return blocks;
}

function gridFromList(list) {
  const g = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  for (const [r, c, t] of list) g[r][c] = t;
  return g;
}

function recount(s) {
  const eng = s.blocks.filter(b => b.type === 'engine').length;
  const mass = Math.max(1, s.blocks.length);
  s.thrust = eng * 220 / (mass * 0.5);
  s.turn = Math.max(1.0, 2.4 - mass * 0.08);
}

function makeShip(g, x, y, team, color, o = {}) {
  const s = {
    x, y, vx: 0, vy: 0, angle: o.angle ?? 0, va: 0,
    blocks: blocksFromGrid(g), team, color,
    thrust: 0, turn: 0, radius: 0, alive: true,
    order: null, thrusting: false, orb: Math.random() < 0.5 ? 1 : -1
  };
  recount(s);
  s.radius = Math.max(...s.blocks.map(b => Math.hypot(b.dx, b.dy))) + CS * 0.7;
  return s;
}

function bw(s, b) {
  const c = Math.cos(s.angle), sn = Math.sin(s.angle);
  return { x: s.x + b.dx * c - b.dy * sn, y: s.y + b.dx * sn + b.dy * c };
}

// ---------- flight setup ----------
function launch() {
  mode = 'flight';
  autopilot = false; paused = false; won = false; dead = false; time = 0;
  debris = []; msg = null; reinforced = false;
  const flag = makeShip(grid, -600, 0, 'ally', '#7fd4ff');
  allies = [flag];
  cam.x = flag.x; cam.y = flag.y; cam.zoom = 1;
  let i = 0;
  for (const idx of rosterSel) {
    const r = ROSTER[idx];
    const w = makeShip(gridFromList(r.g), -720 - i * 90, 130 + i * 110, 'ally', r.color);
    w.order = { kind: 'follow', t: flag, slot: i + 1 };
    allies.push(w); i++;
  }
  selection.clear(); selection.add(flag); // only the flagship is under direct command at start
  foes = [
    makeShip(gridFromList([[4,3,'engine'],[4,4,'hull'],[4,5,'turret']]), 750, -380, 'foe', '#ff8a7a'),
    makeShip(gridFromList([[4,3,'engine'],[4,4,'hull'],[4,5,'turret'],[5,4,'hull']]), 950, 380, 'foe', '#ff8a7a'),
    makeShip(gridFromList([[4,2,'engine'],[4,3,'hull'],[4,4,'hull'],[4,5,'turret'],[3,4,'hull'],[5,4,'hull'],[3,5,'turret'],[5,5,'turret']]), 1250, -240, 'foe', '#ffb36e')
  ];
  for (const f of foes) f.home = { x: f.x, y: f.y };
  foes[0].role = 'interceptor'; // flies out to meet you
  foes[1].role = 'interceptor';
  station = {
    x: 1600, y: 0, r: 80, coreHp: 350, coreMax: 350,
    turrets: [0, 1, 2, 3, 4, 5].map(j => ({ a: j / 6 * TAU, hp: 55, maxHp: 55, cd: rand(0, 1.4), alive: true }))
  };
  planet = { x: 2400, y: 800, r: 420 };
  bullets = []; particles = [];
  stars = [];
  for (let j = 0; j < 500; j++)
    stars.push({ x: rand(-2500, 5000), y: rand(-2500, 2500), s: rand(0.4, 1.8), d: rand(0.2, 0.9) });
}

function turretPos(t) {
  return { x: station.x + Math.cos(t.a) * (station.r + 16), y: station.y + Math.sin(t.a) * (station.r + 16) };
}

function screenToWorld(mx, my) {
  return { x: (mx - W / 2) / cam.zoom + cam.x, y: (my - H / 2) / cam.zoom + cam.y };
}

function validTarget(t) {
  if (!t) return false;
  if (t === station) return station.coreHp > 0 && station.turrets.every(x => !x.alive);
  return t.alive !== false && (t.hp === undefined || t.hp > 0);
}
const targetPoint = t => t === station ? station : (t.a !== undefined ? turretPos(t) : t);

function flightClick(mx, my, shift) {
  if (inRect(autoBtn, mx, my)) { autopilot = !autopilot; return; }
  if (inRect(pauseBtn, mx, my)) { paused = !paused; return; }
  if (inRect(allBtn, mx, my)) { selectAll(); return; }
  const p = screenToWorld(mx, my);

  // click own ship -> select it (shift adds to selection)
  for (const s of allies) {
    if (s.alive && dist(p, s) < s.radius + 10) {
      if (shift) { selection.has(s) ? selection.delete(s) : selection.add(s); }
      else { selection.clear(); selection.add(s); }
      if (!selection.size) selection.add(s);
      return;
    }
  }
  if (!selection.size) return;

  // click hostile -> attack order for all selected
  let tgt = null;
  for (const t of station.turrets)
    if (t.alive && dist(p, turretPos(t)) < 28) { tgt = t; break; }
  if (!tgt) for (const f of foes)
    if (f.alive && dist(p, f) < f.radius + 16) { tgt = f; break; }
  if (!tgt && validTarget(station) && dist(p, station) < station.r + 16) tgt = station;

  if (tgt) {
    for (const s of selection) s.order = { kind: 'attack', t: tgt };
    return;
  }
  // move order — spread ships around the click point
  let i = 0;
  for (const s of selection) {
    const a = i / Math.max(1, selection.size) * TAU;
    const r = selection.size > 1 ? 70 : 0;
    s.order = { kind: 'move', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    i++;
  }
}

// ---------- flight logic ----------
function steerTo(s, pt, dt, hold) {
  const d = dist(s, pt);
  const dirx = (pt.x - s.x) / (d || 1), diry = (pt.y - s.y) / (d || 1);
  const dA = angDiff(s.angle, angleTo(s, pt));
  s.va += (Math.sign(dA) * s.turn - s.va * 3) * dt;
  // desired speed: full burn far away, ease off, zero at the point
  const des = d <= hold ? 0 : Math.min(280, (d - hold) * 1.4 + 30);
  const toward = s.vx * dirx + s.vy * diry;
  const latX = s.vx - dirx * toward, latY = s.vy - diry * toward;
  let th = false;
  if (des > 0 && Math.abs(dA) < 0.8 && toward < des) {
    s.vx += Math.cos(s.angle) * s.thrust * dt;
    s.vy += Math.sin(s.angle) * s.thrust * dt;
    th = true;
  }
  // maneuvering jets: kill lateral drift + overspeed so we actually arrive
  s.vx -= latX * 1.6 * dt; s.vy -= latY * 1.6 * dt;
  if (toward > des) { s.vx *= (1 - 1.8 * dt); s.vy *= (1 - 1.8 * dt); }
  return th;
}

// orbit attack: circle the target at gun range instead of ramming it
function attackPoint(s, t) {
  const p = targetPoint(t);
  const a = angleTo(p, s) + s.orb * 0.4;
  return { x: p.x + Math.cos(a) * 340, y: p.y + Math.sin(a) * 340 };
}

function followPoint(s) {
  const t = s.order.t, k = s.order.slot || 1;
  const a = t.angle + Math.PI + (k % 2 ? 1 : -1) * 0.6 * Math.ceil(k / 2);
  return { x: t.x + Math.cos(a) * 150, y: t.y + Math.sin(a) * 150 };
}

function nearestFoe(s) {
  let best = null, bd = 620;
  for (const f of foes) if (f.alive) { const d = dist(s, f); if (d < bd) { bd = d; best = f; } }
  for (const t of station.turrets) if (t.alive) { const d = dist(s, turretPos(t)); if (d < bd) { bd = d; best = turretPos(t); } }
  if (!best && station.turrets.every(t => !t.alive) && station.coreHp > 0 && dist(s, station) < 700) best = station;
  return best;
}

function nearestAlly(f) {
  let best = null, bd = 1e9;
  for (const s of allies) if (s.alive) { const d = dist(f, s); if (d < bd) { bd = d; best = s; } }
  return best;
}

function autoFire(s, dt, forced) {
  for (const b of s.blocks) {
    if (b.type !== 'turret') continue;
    b.cd -= dt;
    let t = null;
    if (forced && validTarget(forced)) t = targetPoint(forced);
    if (!t) t = s.team === 'ally' ? nearestFoe(s) : nearestAlly(s);
    if (!t) { b.aim = s.angle; continue; }
    const p = bw(s, b);
    b.aim = Math.atan2(t.y - p.y, t.x - p.x); // barrel tracks target
    if (b.cd > 0) continue;
    if (dist(p, t) > 640) continue;
    const lead = (t.vx !== undefined) ? dist(p, t) / 400 : 0;
    const ax = t.x + (t.vx || 0) * lead, ay = t.y + (t.vy || 0) * lead;
    b.cd = 0.6;
    const a = Math.atan2(ay - p.y, ax - p.x);
    bullets.push({ x: p.x, y: p.y, vx: s.vx + Math.cos(a) * 400, vy: s.vy + Math.sin(a) * 400, ttl: 2.0, dmg: 11, team: s.team });
    particles.push({ x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14, vx: rand(-20, 20), vy: rand(-20, 20), ttl: 0.12, max: 0.12, color: '#ffd27f', r: 4 });
  }
}

function shipBrain(s, dt) {
  const o = s.order;
  let thrusting = false;
  if (o && o.kind === 'attack' && validTarget(o.t)) {
    thrusting = steerTo(s, attackPoint(s, o.t), dt, 40);
  } else if (o && o.kind === 'move') {
    thrusting = steerTo(s, o, dt, 24);
    if (dist(s, o) < 30) s.order = null;
  } else if (o && o.kind === 'follow') {
    if (!o.t || !o.t.alive) {
      s.order = null; // leader down — released
    } else {
      const nf = nearestFoe(s);
      if (nf && dist(s, nf) < 430 && dist(s, o.t) < 850)
        thrusting = steerTo(s, attackPoint(s, nf), dt, 40);
      else
        thrusting = steerTo(s, followPoint(s), dt, 50);
    }
  }
  if (!s.order) { s.vx *= (1 - 0.8 * dt); s.vy *= (1 - 0.8 * dt); } // idle: stop drifting
  s.thrusting = thrusting;
}

function allyBrain(s, dt) { // autopilot
  const t = nearestFoe(s);
  if (t) s.thrusting = steerTo(s, attackPoint(s, t === station ? station : t), dt, 60);
}

function explode(x, y, color, n = 24) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(40, 240);
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl: rand(0.3, 0.9), max: 0.9, color, r: rand(1.5, 3.5) });
  }
}

function hitShip(s, b) {
  let blk = null, bd = CS * 0.9;
  for (const bl of s.blocks) {
    const p = bw(s, bl), d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < bd) { bd = d; blk = bl; }
  }
  if (!blk) return;
  blk.hp -= b.dmg; b.ttl = 0;
  explode(b.x, b.y, '#ffd27f', 5);
  if (blk.hp <= 0) {
    const p = bw(s, blk);
    s.blocks = s.blocks.filter(x => x !== blk);
    explode(p.x, p.y, s.color, 14);
    // destroyed parts drop as salvageable debris
    debris.push({ x: p.x, y: p.y, vx: rand(-40, 40), vy: rand(-40, 40), a: rand(0, TAU), va: rand(-2, 2), v: TYPES[blk.type].cost, t: blk.type });
    recount(s);
    if (!s.blocks.length) { s.alive = false; selection.delete(s); explode(s.x, s.y, s.color, 50); }
  }
}

function update(dt) {
  time += dt;

  for (const s of allies) {
    if (!s.alive) continue;
    if (autopilot) allyBrain(s, dt);
    else shipBrain(s, dt);
    s.angle += s.va * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.thrusting)
      for (const b of s.blocks) if (b.type === 'engine') {
        const p = bw(s, b);
        particles.push({ x: p.x - Math.cos(s.angle) * CS * 0.7, y: p.y - Math.sin(s.angle) * CS * 0.7, vx: -Math.cos(s.angle) * 60 + rand(-15, 15), vy: -Math.sin(s.angle) * 60 + rand(-15, 15), ttl: 0.3, max: 0.3, color: '#ff9d5c', r: 3 });
      }
    autoFire(s, dt, s.order && s.order.kind === 'attack' ? s.order.t : null);
  }

  for (const f of foes) {
    if (!f.alive) continue;
    // interceptors chase you anywhere; guards stay near the station
    const t = nearestAlly(f);
    const engage = t && (f.role === 'interceptor' || dist(t, station) < 950 || dist(f, t) < 700);
    if (engage) {
      if (dist(f, t) < 480) f.thrusting = steerTo(f, attackPoint(f, t), dt, 60);
      else f.thrusting = steerTo(f, t, dt, 60);
    } else {
      f.thrusting = steerTo(f, f.home || station, dt, 80);
    }
    f.angle += f.va * dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    autoFire(f, dt, null);
  }

  // reinforcements when the shield ring falls
  if (!reinforced && station.turrets.every(t => !t.alive)) {
    reinforced = true;
    msg = { text: 'SHIELD DOWN — REINFORCEMENTS INBOUND', t: 4 };
    const r1 = makeShip(gridFromList([[4,3,'engine'],[4,4,'hull'],[4,5,'turret'],[5,4,'hull']]), station.x + 200, -300, 'foe', '#ff8a7a');
    const r2 = makeShip(gridFromList([[4,3,'engine'],[4,4,'hull'],[4,5,'turret'],[3,4,'hull']]), station.x + 200, 300, 'foe', '#ff8a7a');
    r1.role = r2.role = 'interceptor';
    foes.push(r1, r2);
  }

  for (const t of station.turrets) {
    if (!t.alive) continue;
    t.cd -= dt;
    const pos = turretPos(t);
    const targets = allies.filter(s => s.alive && dist(pos, s) < 750);
    if (targets.length && t.cd <= 0) {
      t.cd = 1.6;
      const tgt = targets[0];
      const lead = dist(pos, tgt) / 320;
      const a = Math.atan2(tgt.y + tgt.vy * lead - pos.y, tgt.x + tgt.vx * lead - pos.x);
      bullets.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, ttl: 2.6, dmg: 13, team: 'foe' });
    }
  }

  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt;
    if (b.ttl <= 0) continue;
    if (b.team === 'foe') {
      for (const s of allies) if (s.alive && dist(b, s) < s.radius + 20) hitShip(s, b);
    } else {
      for (const f of foes) if (f.alive && dist(b, f) < f.radius + 20) hitShip(f, b);
      for (const t of station.turrets) {
        if (!t.alive) continue;
        const p = turretPos(t);
        if (Math.hypot(b.x - p.x, b.y - p.y) < 18) {
          t.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ffd27f', 6);
          if (t.hp <= 0) { t.alive = false; explode(p.x, p.y, '#ff8a7a', 30); }
        }
      }
      if (station.turrets.every(t => !t.alive) && station.coreHp > 0 && Math.hypot(b.x - station.x, b.y - station.y) < station.r) {
        station.coreHp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#c8a2ff', 8);
        if (station.coreHp <= 0) { won = true; explode(station.x, station.y, '#ffffff', 90); }
      }
    }
  }
  bullets = bullets.filter(b => b.ttl > 0);

  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.ttl -= dt; }
  particles = particles.filter(p => p.ttl > 0);

  // salvage pickups
  for (const d of debris) {
    d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.va * dt;
    d.vx *= (1 - 0.4 * dt); d.vy *= (1 - 0.4 * dt);
    for (const s of allies) {
      if (s.alive && dist(s, d) < s.radius + 30) {
        salvage += d.v; d.got = true;
        explode(d.x, d.y, '#ffcf6e', 6);
        break;
      }
    }
  }
  debris = debris.filter(d => !d.got);

  // dead in the water: a ship with no engines left bleeds off speed and stalls
  for (const s of [...allies, ...foes]) {
    if (!s.alive || s.blocks.some(b => b.type === 'engine')) continue;
    s.vx *= (1 - 1.4 * dt); s.vy *= (1 - 1.4 * dt); s.va *= (1 - 2 * dt);
    s.thrusting = false;
  }

  if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }

  if (!allies.some(s => s.alive)) dead = true;
  else if (!allies[0].alive) dead = true; // flagship lost = mission failed
}

// ---------- draw: editor ----------
function drawEditor() {
  ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
  const gs = gridScreen();

  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 20px monospace';
  ctx.fillText('SHIPYARD — assemble your bucket', gs.x, gs.y - 46);
  ctx.fillStyle = '#5a6a8a'; ctx.font = '13px monospace';
  ctx.fillText('click palette, click grid to place  •  click a block to remove  •  blocks must touch', gs.x, gs.y - 24);

  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    const x = gs.x + c * gs.s, y = gs.y + r * gs.s;
    const t = grid[r][c];
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(x + 1, y + 1, gs.s - 2, gs.s - 2);
    if (t) {
      const spr = t === 'turret' ? SPRITES.gun_base : SPRITES[t];
      if (sprReady(spr)) ctx.drawImage(spr, x + 1, y + 1, gs.s - 2, gs.s - 2);
      else { ctx.fillStyle = TYPES[t].color; ctx.fillRect(x + 1, y + 1, gs.s - 2, gs.s - 2); }
      if (t === 'turret' && sprReady(SPRITES.gun_barrel)) ctx.drawImage(SPRITES.gun_barrel, x + 1, y + 1, gs.s - 2, gs.s - 2);
    }
    ctx.strokeStyle = t ? TYPES[t].edge : '#1a2438';
    ctx.lineWidth = t ? 2 : 1;
    ctx.strokeRect(x + 1, y + 1, gs.s - 2, gs.s - 2);
  }

  // palette
  const px = W * 0.66, pw = 150;
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 15px monospace';
  ctx.fillText('PARTS', px, gs.y - 10);
  KEYS_ORDER.forEach((k, i) => {
    const r = { x: px, y: gs.y + i * 64, w: pw, h: 54 };
    palette[k] = r;
    const T = TYPES[k], sel = selected === k;
    ctx.fillStyle = sel ? '#141c2e' : '#0b1220';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = sel ? T.edge : '#1a2438'; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    const spr = k === 'turret' ? SPRITES.gun_base : SPRITES[k];
    if (sprReady(spr)) ctx.drawImage(spr, r.x + 8, r.y + 11, 32, 32);
    else { ctx.fillStyle = T.color; ctx.fillRect(r.x + 10, r.y + 14, 24, 24); }
    ctx.fillStyle = T.edge; ctx.font = 'bold 13px monospace';
    ctx.fillText(T.name, r.x + 46, r.y + 26);
    ctx.fillStyle = '#5a6a8a'; ctx.font = '12px monospace';
    ctx.fillText(`${T.cost} scrap`, r.x + 46, r.y + 44);
  });

  // wingmen roster
  const ry0 = gs.y + KEYS_ORDER.length * 64 + 30;
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 15px monospace';
  ctx.fillText(`FLEET  (${rosterSel.size}/${MAX_WING})`, px, ry0 - 10);
  ROSTER.forEach((r, i) => {
    const rc = { x: px, y: ry0 + i * 76, w: pw + 60, h: 66 };
    rosterRects[i] = rc;
    const sel = rosterSel.has(i);
    ctx.fillStyle = sel ? '#14261c' : '#0b1220';
    ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    ctx.strokeStyle = sel ? '#9dff8a' : '#1a2438'; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(rc.x, rc.y, rc.w, rc.h);
    // mini layout preview
    for (const [rr, cc, t] of r.g) {
      const mx = rc.x + 8 + (cc - 1) * 11, my = rc.y + 10 + (rr - 2) * 11;
      ctx.fillStyle = TYPES[t].color;
      ctx.fillRect(mx, my, 9, 9);
    }
    ctx.fillStyle = sel ? '#9dff8a' : '#8aa0c8'; ctx.font = 'bold 13px monospace';
    ctx.fillText(r.name, rc.x + 60, rc.y + 26);
    ctx.fillStyle = '#5a6a8a'; ctx.font = '12px monospace';
    ctx.fillText(r.desc, rc.x + 60, rc.y + 44);
  });

  // stats
  const flat = grid.flat().filter(Boolean);
  const n = t => flat.filter(x => x === t).length;
  const mass = flat.length, eng = n('engine');
  const sy = gs.y + GRID * gs.s + 30;
  ctx.fillStyle = '#8aa0c8'; ctx.font = '14px monospace';
  ctx.fillText(`mass ${mass}   thrust ${eng ? Math.round(eng * 220 / (mass * 0.5)) : 0}   guns ${n('turret')}   scrap ${gridCost()}/${budget()}${salvage ? '  (+' + salvage + ' salvaged)' : ''}`, gs.x, sy);

  const chk = canLaunch();
  launchBtn.x = px; launchBtn.y = sy - 34;
  ctx.fillStyle = chk.ok ? '#1d3a24' : '#141c2e';
  ctx.strokeStyle = chk.ok ? '#9dff8a' : '#4a5a7a'; ctx.lineWidth = 2;
  ctx.fillRect(launchBtn.x, launchBtn.y, launchBtn.w, launchBtn.h);
  ctx.strokeRect(launchBtn.x, launchBtn.y, launchBtn.w, launchBtn.h);
  ctx.fillStyle = chk.ok ? '#9dff8a' : '#5a6a8a';
  ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
  ctx.fillText(chk.ok ? 'LAUNCH' : chk.why, launchBtn.x + launchBtn.w / 2, launchBtn.y + 29);
  ctx.textAlign = 'left';
}

// ---------- draw: flight ----------
function drawShip(s) {
  // selection ring
  if (selection.has(s)) {
    ctx.strokeStyle = 'rgba(157,255,138,0.7)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius + 6, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const b of s.blocks) {
    const p = bw(s, b), T = TYPES[b.type];
    const fade = Math.max(0.35, b.hp / b.maxHp);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(s.angle);
    ctx.globalAlpha = fade;
    const spr = b.type === 'turret' ? SPRITES.gun_base : SPRITES[b.variant || b.type];
    if (sprReady(spr)) ctx.drawImage(spr, -CS / 2, -CS / 2, CS, CS);
    else {
      ctx.fillStyle = T.color; ctx.fillRect(-CS / 2 + 1, -CS / 2 + 1, CS - 2, CS - 2);
      ctx.strokeStyle = T.edge; ctx.strokeRect(-CS / 2 + 1, -CS / 2 + 1, CS - 2, CS - 2);
    }
    ctx.restore();
    // rotating barrel — world-space aim
    if (b.type === 'turret') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(b.aim);
      ctx.globalAlpha = fade;
      if (sprReady(SPRITES.gun_barrel)) ctx.drawImage(SPRITES.gun_barrel, -CS / 2, -CS / 2, CS, CS);
      ctx.restore();
    }
    ctx.strokeStyle = s.color; ctx.globalAlpha = 1; ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(s.angle);
    ctx.strokeRect(-CS / 2 + 0.5, -CS / 2 + 0.5, CS - 1, CS - 1);
    ctx.restore();
  }
}

function drawOrderMarker(s) {
  const o = s.order;
  if (!o) return;
  if (o.kind === 'move') {
    ctx.strokeStyle = 'rgba(127,212,255,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(o.x, o.y, 10 + 3 * Math.sin(time * 5), 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(127,212,255,0.15)';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(o.x, o.y); ctx.stroke();
  } else if (o.kind === 'attack' && validTarget(o.t)) {
    const tp = targetPoint(o.t);
    ctx.strokeStyle = '#ff6e5c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tp.x, tp.y, 20 + 4 * Math.sin(time * 7), 0, TAU); ctx.stroke();
  }
}

function draw() {
  if (mode === 'editor') { drawEditor(); return; }
  ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const vhw = W / 2 / cam.zoom, vhh = H / 2 / cam.zoom; // visible half-extents
  ctx.strokeStyle = 'rgba(40,60,100,0.16)'; ctx.lineWidth = 1 / cam.zoom;
  const step = 90, x0 = Math.floor((cam.x - vhw) / step) * step, y0 = Math.floor((cam.y - vhh) / step) * step;
  for (let x = x0; x < cam.x + vhw + step; x += step) { ctx.beginPath(); ctx.moveTo(x, cam.y - vhh); ctx.lineTo(x, cam.y + vhh); ctx.stroke(); }
  for (let y = y0; y < cam.y + vhh + step; y += step) { ctx.beginPath(); ctx.moveTo(cam.x - vhw, y); ctx.lineTo(cam.x + vhw, y); ctx.stroke(); }

  ctx.fillStyle = '#3a4a66';
  for (const st of stars) {
    const sx = st.x + cam.x * (1 - st.d), sy = st.y + cam.y * (1 - st.d);
    ctx.globalAlpha = st.d; ctx.fillRect(sx, sy, st.s, st.s);
  }
  ctx.globalAlpha = 1;

  const g = ctx.createRadialGradient(planet.x - 150, planet.y - 150, 50, planet.x, planet.y, planet.r);
  g.addColorStop(0, '#2a4a6e'); g.addColorStop(1, '#0a1524');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(planet.x, planet.y, planet.r, 0, TAU); ctx.fill();

  // station
  ctx.save();
  ctx.translate(station.x, station.y);
  const shielded = station.turrets.some(t => t.alive);
  ctx.strokeStyle = shielded ? '#6e5aff' : '#c8a2ff'; ctx.lineWidth = 3; ctx.fillStyle = '#0d1426';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; i ? ctx.lineTo(Math.cos(a) * station.r, Math.sin(a) * station.r) : ctx.moveTo(Math.cos(a) * station.r, Math.sin(a) * station.r); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (shielded) { ctx.strokeStyle = 'rgba(110,90,255,0.35)'; ctx.beginPath(); ctx.arc(0, 0, station.r + 34, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = '#c8a2ff'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
  ctx.restore();

  for (const t of station.turrets) {
    if (!t.alive) continue;
    const p = turretPos(t);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (sprReady(SPRITES.st_base)) ctx.drawImage(SPRITES.st_base, -20, -20, 40, 40);
    else { ctx.fillStyle = '#5e2a2a'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill(); }
    ctx.restore();
    let aimA = t.a;
    const tg = allies.filter(s => s.alive).sort((a, b) => dist(p, a) - dist(p, b))[0];
    if (tg) aimA = angleTo(p, tg);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(aimA);
    if (sprReady(SPRITES.st_barrel)) ctx.drawImage(SPRITES.st_barrel, -20, -20, 40, 40);
    else { ctx.fillStyle = '#ff8a7a'; ctx.fillRect(0, -2, 16, 4); }
    ctx.restore();
    ctx.fillStyle = '#222'; ctx.fillRect(p.x - 10, p.y - 17, 20, 3);
    ctx.fillStyle = '#ff8a7a'; ctx.fillRect(p.x - 10, p.y - 17, 20 * t.hp / t.maxHp, 3);
  }

  for (const d of debris) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a);
    ctx.fillStyle = '#b06a2a'; ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = '#ffcf6e'; ctx.lineWidth = 1.5; ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();
  }

  for (const s of [...allies, ...foes]) if (s.alive) drawShip(s);
  for (const s of allies) if (s.alive && !autopilot) drawOrderMarker(s);

  for (const b of bullets) {
    ctx.strokeStyle = b.team === 'foe' ? 'rgba(255,110,92,0.4)' : 'rgba(127,212,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = b.team === 'foe' ? '#ff6e5c' : '#7fd4ff';
    ctx.fillRect(b.x - 2.5, b.y - 2.5, 5, 5);
  }

  for (const p of particles) {
    ctx.globalAlpha = p.ttl / p.max;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ---------- HUD ----------
  const flag = flagship();
  if (flag) {
    const nh = flag.blocks.filter(b => b.type === 'hull').length;
    const ne = flag.blocks.filter(b => b.type === 'engine').length;
    const ng = flag.blocks.filter(b => b.type === 'turret').length;
    ctx.fillStyle = '#7fd4ff'; ctx.font = '14px monospace';
    ctx.fillText(`FLAGSHIP  hull:${nh}  eng:${ne}  guns:${ng}`, 16, 24);
  }
  let hy = 44;
  for (let i = 1; i < allies.length; i++) {
    const s = allies[i];
    ctx.fillStyle = s.alive ? s.color : '#5a6a8a';
    ctx.fillText(`${s.alive ? (selection.has(s) ? '>' : ' ') + 'WING' + i + ' ' + s.blocks.length + ' blk' : ' WING' + i + ' LOST'}`, 16, hy);
    hy += 20;
  }
  ctx.fillStyle = '#9dff8a';
  ctx.fillText(`SELECTED ${selection.size}/${allies.filter(s => s.alive).length}`, 16, hy + 4);
  ctx.fillStyle = '#ffcf6e';
  ctx.fillText(`SALVAGE +${salvage} (next build: ${budget()} scrap)`, 16, hy + 24);

  const tLeft = station.turrets.filter(t => t.alive).length;
  ctx.fillStyle = '#ff8a7a'; ctx.textAlign = 'right';
  ctx.fillText(`STATION  TURRETS ${tLeft}/6`, W - 16, 24);
  ctx.fillStyle = '#222'; ctx.fillRect(W - 176, 30, 160, 8);
  ctx.fillStyle = '#c8a2ff'; ctx.fillRect(W - 176, 30, 160 * Math.max(0, station.coreHp / station.coreMax), 8);
  ctx.textAlign = 'left';

  // buttons row
  allBtn.x = W - allBtn.w - 16; allBtn.y = H - allBtn.h - 16;
  autoBtn.x = allBtn.x - autoBtn.w - 10; autoBtn.y = allBtn.y;
  pauseBtn.x = autoBtn.x - pauseBtn.w - 10; pauseBtn.y = allBtn.y;

  const btn = (r, label, on, onColor, offColor) => {
    ctx.fillStyle = on ? '#1d3a24' : '#141c2e';
    ctx.strokeStyle = on ? '#9dff8a' : '#4a5a7a'; ctx.lineWidth = 2;
    ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = on ? '#9dff8a' : '#8aa0c8';
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, r.x + r.w / 2, r.y + 24);
    ctx.textAlign = 'left';
  };
  btn(allBtn, 'ALL (A)', selection.size === allies.filter(s => s.alive).length);
  btn(autoBtn, autopilot ? 'AI: ON (P)' : 'AUTOPILOT (P)', autopilot);
  btn(pauseBtn, paused ? 'RESUME' : 'PAUSE', paused);

  ctx.fillStyle = '#5a6a8a'; ctx.font = '12px monospace';
  ctx.fillText('LMB ship: select (shift=+)   LMB: move/attack   RMB drag: pan   wheel: zoom   F: flagship   A: all   Space: pause   P: AI   R: shipyard', 16, H - 16);

  if (msg) {
    ctx.fillStyle = '#ff8a7a'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
    ctx.fillText(msg.text, W / 2, 60);
    ctx.textAlign = 'left';
  }
  if (paused) {
    ctx.fillStyle = 'rgba(5,7,13,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.font = '16px monospace'; ctx.fillStyle = '#8aa0c8';
    ctx.fillText('Space or RESUME to continue', W / 2, H / 2 + 36);
    ctx.textAlign = 'left';
  }
  if (won) { ctx.fillStyle = '#9dff8a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText('STATION DESTROYED — SALVAGE SECURED  (R: rebuild)', W / 2, H / 2); ctx.textAlign = 'left'; }
  if (dead) { ctx.fillStyle = '#ff8a7a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText('FLAGSHIP LOST — press R to rebuild', W / 2, H / 2); ctx.textAlign = 'left'; }
}

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (mode === 'flight' && !paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

grid = starterGrid();
requestAnimationFrame(loop);
})();
