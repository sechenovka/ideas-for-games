// VOID SALVAGE — physics prototype v0.1
// Goal: validate game feel. Manual flight by default, P or on-screen button = full AI autopilot.
(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth, H = canvas.height = innerHeight;
addEventListener('resize', () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; });

// ---------- input ----------
const keys = {};
let mouse = { x: 0, y: 0, down: false };
const autoBtn = { x: 0, y: 0, w: 150, h: 40 }; // positioned on resize/draw

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyP') toggleAutopilot();
  if (e.code === 'KeyR') reset();
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
addEventListener('mousedown', e => {
  mouse.down = true;
  if (e.clientX >= autoBtn.x && e.clientX <= autoBtn.x + autoBtn.w &&
      e.clientY >= autoBtn.y && e.clientY <= autoBtn.y + autoBtn.h) toggleAutopilot();
});
addEventListener('mouseup', () => mouse.down = false);

// ---------- helpers ----------
const TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- state ----------
let player, escort, station, foes, bullets, particles, stars, planet;
let autopilot = false, won = false, dead = false, time = 0;

function makeShip(x, y, team, o = {}) {
  return {
    x, y, vx: o.vx || 0, vy: o.vy || 0, angle: o.angle || 0, va: 0,
    hp: o.hp ?? 100, maxHp: o.hp ?? 100,
    thrust: o.thrust ?? 300, turn: o.turn ?? 4.2,
    cd: 0, fireRate: o.fireRate ?? 6, dmg: o.dmg ?? 12,
    radius: o.radius ?? 13, team, color: o.color || '#7fd4ff',
    alive: true, trail: 0
  };
}

function reset() {
  autopilot = false; won = false; dead = false; time = 0;
  player = makeShip(-900, 0, 'ally', { color: '#7fd4ff', hp: 120 });
  escort = makeShip(-1000, 110, 'ally', { color: '#9dff8a', hp: 80, thrust: 260, dmg: 8 });
  foes = [
    makeShip(1400, -400, 'foe', { color: '#ff8a7a', hp: 70, thrust: 280 }),
    makeShip(1600, 420, 'foe', { color: '#ff8a7a', hp: 70, thrust: 280 }),
    makeShip(2000, -250, 'foe', { color: '#ffb36e', hp: 90, thrust: 240, dmg: 16, radius: 17 })
  ];
  station = {
    x: 2400, y: 0, r: 80, coreHp: 350, coreMax: 350,
    turrets: [0, 1, 2, 3, 4, 5].map(i => ({
      a: i / 6 * TAU, hp: 55, maxHp: 55, cd: rand(0, 1.4), alive: true
    }))
  };
  planet = { x: 3100, y: 800, r: 420 };
  bullets = []; particles = [];
  stars = [];
  for (let i = 0; i < 500; i++)
    stars.push({ x: rand(-2500, 5000), y: rand(-2500, 2500), s: rand(0.4, 1.8), d: rand(0.2, 0.9) });
}

function toggleAutopilot() { autopilot = !autopilot; }

function explode(x, y, color, n = 24) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(40, 260);
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl: rand(0.3, 0.9), max: 0.9, color, r: rand(1.5, 3.5) });
  }
}

function turretPos(t) {
  return { x: station.x + Math.cos(t.a) * (station.r + 14), y: station.y + Math.sin(t.a) * (station.r + 14) };
}

// ---------- AI pilot: used for escort, foes, and player's autopilot ----------
function aiPilot(ship, targets, dt) {
  targets = targets.filter(t => t && (t.alive !== false) && (t.hp === undefined || t.hp > 0));
  if (!targets.length) { ship.va *= 0.9; return; }
  let tgt = targets[0], best = dist(ship, tgt);
  for (const t of targets) { const d = dist(ship, t); if (d < best) { best = d; tgt = t; } }

  // lead the target
  const bs = 620;
  const lead = (tgt.vx !== undefined) ? best / bs : 0;
  const aim = { x: (tgt.x || 0) + (tgt.vx || 0) * lead, y: (tgt.y || 0) + (tgt.vy || 0) * lead };

  let want = angTo(ship, aim);
  if (best < 150) want += Math.PI * 0.75; // too close — pull away while keeping guns near

  const d = angDiff(ship.angle, want);
  ship.va += (Math.sign(d) * ship.turn - ship.va * 3) * dt;

  const facing = Math.abs(d) < 1.1;
  if (facing && best > 160) { ship.vx += Math.cos(ship.angle) * ship.thrust * dt; ship.vy += Math.sin(ship.angle) * ship.thrust * dt; ship.trail = 1; }
  else if (best < 120) { ship.vx -= Math.cos(ship.angle) * ship.thrust * 0.6 * dt; ship.vy -= Math.sin(ship.angle) * ship.thrust * 0.6 * dt; }

  if (Math.abs(d) < 0.25 && best < 620) fire(ship, aim);
}

function fire(ship, aim) {
  if (ship.cd > 0) return;
  ship.cd = 1 / ship.fireRate;
  const a = aim ? angTo(ship, aim) : ship.angle;
  const sp = 620;
  bullets.push({
    x: ship.x + Math.cos(ship.angle) * ship.radius, y: ship.y + Math.sin(ship.angle) * ship.radius,
    vx: ship.vx + Math.cos(a) * sp, vy: ship.vy + Math.sin(a) * sp,
    ttl: 1.6, dmg: ship.dmg, team: ship.team
  });
  for (let i = 0; i < 3; i++)
    particles.push({ x: ship.x + Math.cos(a) * 16, y: ship.y + Math.sin(a) * 16, vx: rand(-30, 30), vy: rand(-30, 30), ttl: 0.15, max: 0.15, color: '#ffd27f', r: 2 });
}

// ---------- update ----------
function update(dt) {
  time += dt;

  // player control or autopilot
  if (player.alive) {
    if (autopilot) {
      const targets = foes.concat(station.turrets.filter(t => t.alive).map(t => ({ ...turretPos(t), hp: t.hp, _t: t })));
      if (station.turrets.every(t => !t.alive)) targets.push({ x: station.x, y: station.y, hp: 1 });
      aiPilot(player, targets, dt);
    } else {
      if (keys['KeyA'] || keys['ArrowLeft']) player.va -= player.turn * dt;
      if (keys['KeyD'] || keys['ArrowRight']) player.va += player.turn * dt;
      player.va *= 0.92;
      if (keys['KeyW'] || keys['ArrowUp']) { player.vx += Math.cos(player.angle) * player.thrust * dt; player.vy += Math.sin(player.angle) * player.thrust * dt; player.trail = 1; }
      if (keys['KeyS'] || keys['ArrowDown']) { player.vx *= (1 - 1.4 * dt); player.vy *= (1 - 1.4 * dt); }
      if (keys['Space']) fire(player, { x: player.x + Math.cos(player.angle) * 100, y: player.y + Math.sin(player.angle) * 100 });
    }
    player.angle += player.va * dt;
    player.x += player.vx * dt; player.y += player.vy * dt;
    player.cd -= dt; player.trail = 0;
    if (player.trail || keys['KeyW'] || keys['ArrowUp'] || autopilot)
      particles.push({ x: player.x - Math.cos(player.angle) * 12, y: player.y - Math.sin(player.angle) * 12, vx: rand(-20, 20) - player.vx * 0.2, vy: rand(-20, 20) - player.vy * 0.2, ttl: 0.25, max: 0.25, color: '#ff9d5c', r: 2.5 });
  }

  // escort AI follows and fights
  if (escort.alive) {
    const targets = foes.concat(station.turrets.filter(t => t.alive).map(t => ({ ...turretPos(t), hp: t.hp })));
    if (targets.length && dist(escort, player) < 1400) aiPilot(escort, targets, dt);
    else { // follow player
      const d = angDiff(escort.angle, angTo(escort, player));
      escort.va += (Math.sign(d) * escort.turn - escort.va * 3) * dt;
      if (dist(escort, player) > 250 && Math.abs(d) < 1.2) { escort.vx += Math.cos(escort.angle) * escort.thrust * dt; escort.vy += Math.sin(escort.angle) * escort.thrust * dt; }
    }
    escort.angle += escort.va * dt;
    escort.x += escort.vx * dt; escort.y += escort.vy * dt;
    escort.cd -= dt;
  }

  // foes AI
  for (const f of foes) {
    if (!f.alive) continue;
    aiPilot(f, [player, escort].filter(s => s.alive), dt);
    f.angle += f.va * dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.cd -= dt;
  }

  // turrets
  for (const t of station.turrets) {
    if (!t.alive) continue;
    t.cd -= dt;
    const pos = turretPos(t);
    const targets = [player, escort].filter(s => s.alive && dist(pos, s) < 750);
    if (targets.length && t.cd <= 0) {
      t.cd = 1.3;
      const tgt = targets[0];
      const lead = dist(pos, tgt) / 480;
      const a = Math.atan2(tgt.y + tgt.vy * lead - pos.y, tgt.x + tgt.vx * lead - pos.x);
      bullets.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, ttl: 2, dmg: 14, team: 'foe' });
    }
  }

  // bullets
  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt;
    if (b.team === 'foe') {
      for (const s of [player, escort]) {
        if (s.alive && Math.hypot(b.x - s.x, b.y - s.y) < s.radius + 3) {
          s.hp -= b.dmg; b.ttl = 0;
          explode(b.x, b.y, '#ffd27f', 6);
          if (s.hp <= 0) { s.alive = false; explode(s.x, s.y, s.color, 40); }
        }
      }
    } else {
      for (const f of foes) {
        if (f.alive && Math.hypot(b.x - f.x, b.y - f.y) < f.radius + 3) {
          f.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ffd27f', 6);
          if (f.hp <= 0) { f.alive = false; explode(f.x, f.y, f.color, 40); }
        }
      }
      for (const t of station.turrets) {
        if (!t.alive) continue;
        const p = turretPos(t);
        if (Math.hypot(b.x - p.x, b.y - p.y) < 16) {
          t.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ffd27f', 6);
          if (t.hp <= 0) { t.alive = false; explode(p.x, p.y, '#ff8a7a', 30); }
        }
      }
      const shielded = station.turrets.some(t => t.alive);
      if (!shielded && station.coreHp > 0 && Math.hypot(b.x - station.x, b.y - station.y) < station.r) {
        station.coreHp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#c8a2ff', 8);
        if (station.coreHp <= 0) { won = true; explode(station.x, station.y, '#ffffff', 90); }
      }
    }
  }
  bullets = bullets.filter(b => b.ttl > 0);

  // particles
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.ttl -= dt; }
  particles = particles.filter(p => p.ttl > 0);

  if (!player.alive && !dead) dead = true;
}

// ---------- draw ----------
function drawShip(s) {
  ctx.save();
  ctx.translate(s.x, s.y); ctx.rotate(s.angle);
  ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.fillStyle = '#0b1220';
  ctx.beginPath();
  ctx.moveTo(s.radius + 4, 0); ctx.lineTo(-s.radius, s.radius * 0.75); ctx.lineTo(-s.radius * 0.5, 0); ctx.lineTo(-s.radius, -s.radius * 0.75);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  // hp bar
  ctx.fillStyle = '#222'; ctx.fillRect(s.x - 16, s.y - s.radius - 12, 32, 4);
  ctx.fillStyle = s.color; ctx.fillRect(s.x - 16, s.y - s.radius - 12, 32 * Math.max(0, s.hp / s.maxHp), 4);
}

function draw() {
  const cam = player.alive ? player : escort;
  ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 - cam.x, H / 2 - cam.y);

  // stars (parallax-ish via depth factor)
  ctx.fillStyle = '#3a4a66';
  for (const st of stars) {
    const sx = st.x + cam.x * (1 - st.d), sy = st.y + cam.y * (1 - st.d);
    ctx.globalAlpha = st.d; ctx.fillRect(sx, sy, st.s, st.s);
  }
  ctx.globalAlpha = 1;

  // planet (decor)
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
  ctx.fillStyle = '#c8a2ff';
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
  ctx.restore();

  // turrets
  for (const t of station.turrets) {
    if (!t.alive) continue;
    const p = turretPos(t);
    ctx.fillStyle = '#ff8a7a'; ctx.fillRect(p.x - 7, p.y - 7, 14, 14);
    ctx.fillStyle = '#222'; ctx.fillRect(p.x - 10, p.y - 14, 20, 3);
    ctx.fillStyle = '#ff8a7a'; ctx.fillRect(p.x - 10, p.y - 14, 20 * t.hp / t.maxHp, 3);
  }

  for (const s of [escort, player, ...foes]) if (s.alive) drawShip(s);

  // bullets
  for (const b of bullets) {
    ctx.fillStyle = b.team === 'foe' ? '#ff6e5c' : '#7fd4ff';
    ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
  }

  // particles
  for (const p of particles) {
    ctx.globalAlpha = p.ttl / p.max;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ---------- HUD ----------
  ctx.fillStyle = '#7fd4ff'; ctx.font = '14px monospace';
  ctx.fillText(`HULL ${Math.max(0, Math.round(player.hp))}/${player.maxHp}`, 16, 24);
  ctx.fillStyle = '#222'; ctx.fillRect(16, 30, 160, 8);
  ctx.fillStyle = '#7fd4ff'; ctx.fillRect(16, 30, 160 * Math.max(0, player.hp / player.maxHp), 8);
  ctx.fillStyle = '#9dff8a';
  ctx.fillText(`WINGMAN ${escort.alive ? Math.round(escort.hp) + '%' : 'LOST'}`, 16, 56);

  const tLeft = station.turrets.filter(t => t.alive).length;
  ctx.fillStyle = '#ff8a7a'; ctx.textAlign = 'right';
  ctx.fillText(`STATION  TURRETS ${tLeft}/6`, W - 16, 24);
  ctx.fillStyle = '#222'; ctx.fillRect(W - 176, 30, 160, 8);
  ctx.fillStyle = '#c8a2ff'; ctx.fillRect(W - 176, 30, 160 * Math.max(0, station.coreHp / station.coreMax), 8);
  ctx.textAlign = 'left';

  // autopilot button
  autoBtn.x = W - autoBtn.w - 16; autoBtn.y = H - autoBtn.h - 16;
  ctx.fillStyle = autopilot ? '#1d3a24' : '#141c2e';
  ctx.strokeStyle = autopilot ? '#9dff8a' : '#4a5a7a';
  ctx.lineWidth = 2;
  ctx.fillRect(autoBtn.x, autoBtn.y, autoBtn.w, autoBtn.h);
  ctx.strokeRect(autoBtn.x, autoBtn.y, autoBtn.w, autoBtn.h);
  ctx.fillStyle = autopilot ? '#9dff8a' : '#8aa0c8';
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  ctx.fillText(autopilot ? 'AI: ON (P)' : 'AUTOPILOT (P)', autoBtn.x + autoBtn.w / 2, autoBtn.y + 25);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#5a6a8a'; ctx.font = '12px monospace';
  ctx.fillText('W thrust  A/D turn  S brake  SPACE fire  P autopilot  R restart', 16, H - 16);

  if (won) { ctx.fillStyle = '#9dff8a'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center'; ctx.fillText('STATION DESTROYED — SALVAGE SECURED', W / 2, H / 2); ctx.textAlign = 'left'; }
  if (dead) { ctx.fillStyle = '#ff8a7a'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center'; ctx.fillText('FLAGSHIP LOST — press R', W / 2, H / 2); ctx.textAlign = 'left'; }
}

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);
})();
