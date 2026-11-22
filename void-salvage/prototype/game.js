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
const MAX_WING = 2;         // base escort slots — station buildings add more
const TYPES = {
  hull:   { cost: 1, hp: 45, color: '#4a6a9a', edge: '#6e92c8', name: 'HULL' },
  armor:  { cost: 2, hp: 70, color: '#4a4e55', edge: '#9aa2ad', name: 'ARMOR' },
  engine: { cost: 2, hp: 30, color: '#7a4a2a', edge: '#ff9d5c', name: 'ENGINE' },
  turret: { cost: 3, hp: 28, color: '#2a4a5e', edge: '#7fd4ff', name: 'GUN' },
  rocket: { cost: 4, hp: 26, color: '#6e3a2a', edge: '#ff8a5c', name: 'ROCKET' },
  laser:  { cost: 5, hp: 24, color: '#3a2a4e', edge: '#ff5c9a', name: 'LASER' },
  ammo:   { cost: 2, hp: 16, color: '#4a3a1a', edge: '#ffd24a', name: 'AMMO' },
  marine: { cost: 3, hp: 25, color: '#1e3a2a', edge: '#5affa0', name: 'MARINE' },
  pd:     { cost: 3, hp: 22, color: '#2a3a4a', edge: '#8ad4ff', name: 'PD' },
  repair: { cost: 4, hp: 24, color: '#1e3a34', edge: '#5affc0', name: 'REPAIR' },
  mines:  { cost: 3, hp: 20, color: '#3a1e24', edge: '#ff6a4a', name: 'MINES' },
  battery:{ cost: 2, hp: 22, color: '#1e3a22', edge: '#6aff7a', name: 'CELL' },
  shield: { cost: 5, hp: 26, color: '#1e2a4a', edge: '#5ad4ff', name: 'SHIELD' },
  torp:   { cost: 6, hp: 24, color: '#3a2a30', edge: '#ff8a5c', name: 'TORP' },
  jam:    { cost: 4, hp: 20, color: '#241a3a', edge: '#b06aff', name: 'JAM' },
  trac:   { cost: 4, hp: 22, color: '#0f2a2a', edge: '#4affe0', name: 'TRAC' },
  rctr:   { cost: 6, hp: 18, color: '#3a2a10', edge: '#ffd27f', name: 'REACTOR' },
  rail:   { cost: 7, hp: 20, color: '#16222e', edge: '#8ae8ff', name: 'RAIL' },
  decoy:  { cost: 3, hp: 18, color: '#0f2028', edge: '#8ae8ff', name: 'DECOY' },
  cargo:  { cost: 1, hp: 30, color: '#6e5326', edge: '#ffcf6e', name: 'CARGO' },
  gyro:   { cost: 1, hp: 22, color: '#1e4a3a', edge: '#3ae8a8', name: 'GYRO' },
};
const KEYS_ORDER = ['hull', 'armor', 'engine', 'turret', 'rocket', 'laser', 'ammo', 'marine', 'pd', 'repair', 'mines', 'battery', 'shield', 'torp', 'jam', 'trac', 'rctr', 'rail', 'decoy', 'cargo', 'gyro'];
const BP = 10; // per-block pixel grid — blocks die pixel by pixel
const DEBRIS_COL = {
  hull: '#5a6f8f', hull_b: '#6f7351', hull_c: '#565b66', engine: '#8a5a30',
  turret: '#3d4f63', armor: '#6a7078', rocket: '#7a4a3a', cargo: '#a0762a',
  gyro: '#2a8a6a', laser: '#6a3a6e', ammo: '#a8842a',
  marine: '#2a8a50', pd: '#5a7a9a', repair: '#2a9a70', mines: '#8a3a3a',
  battery: '#3a9a4a', shield: '#4a7ab8', torp: '#a85a3a',
  jam: '#7a4ab8', trac: '#2aa08a', rctr: '#c89a3a', rail: '#4a9ac8', decoy: '#3a7a9a',
};
// escort roster — pick up to MAX_WING
const ROSTER = [
  { name: 'SCOUT',   desc: 'fast, 1 gun',  color: '#9dff8a', g: [[4,3,'engine'],[4,4,'hull'],[4,5,'turret']] },
  { name: 'GUNSHIP', desc: '2 guns',       color: '#7fd4ff', g: [[4,3,'engine'],[4,4,'hull'],[3,4,'hull'],[5,4,'hull'],[4,5,'turret'],[3,5,'turret']] },
  { name: 'BULWARK', desc: 'armored',      color: '#ffcf6e', g: [[4,3,'engine'],[4,4,'armor'],[4,5,'turret'],[3,4,'armor'],[5,4,'hull'],[5,5,'hull'],[4,6,'armor']] },
  { name: 'INTERCEPTOR', desc: '2 engines', color: '#8ad4ff', g: [[4,2,'engine'],[4,3,'engine'],[4,4,'hull'],[4,5,'turret']] },
  { name: 'LANCER',  desc: 'rocket pod',   color: '#ff8a5c', g: [[4,3,'engine'],[4,4,'hull'],[4,5,'rocket'],[3,4,'armor']] },
  { name: 'HAULER',  desc: 'cargo, 1 gun', color: '#d4b06a', g: [[4,3,'engine'],[4,4,'cargo'],[4,5,'turret'],[3,4,'hull'],[5,4,'cargo']] },
  { name: 'COLLECTOR', desc: 'gyro + cargo', color: '#3ae8a8', g: [[4,3,'engine'],[4,4,'gyro'],[4,5,'turret'],[3,4,'cargo'],[5,4,'cargo']] },
  { name: 'BEAMER',  desc: 'melting laser', color: '#ff5c9a', g: [[4,3,'engine'],[4,4,'hull'],[4,5,'laser'],[3,4,'hull'],[5,4,'hull']] },
  { name: 'CORSAIR', desc: 'boarding + PD', color: '#5affa0', g: [[4,3,'engine'],[4,4,'hull'],[4,5,'marine'],[3,4,'pd'],[5,4,'hull'],[4,6,'turret']] },
  { name: 'SAPPER',  desc: 'mines + repair', color: '#ff9d5c', g: [[4,3,'engine'],[4,4,'hull'],[4,5,'mines'],[3,4,'repair'],[5,4,'hull'],[4,6,'turret']] },
  { name: 'VOLT',    desc: 'laser + cells', color: '#6aff7a', g: [[4,3,'engine'],[4,4,'battery'],[4,5,'laser'],[3,4,'battery'],[5,4,'hull']] },
  { name: 'AEGIS',   desc: 'shield + torp', color: '#5ad4ff', g: [[4,3,'engine'],[4,4,'shield'],[4,5,'torp'],[3,4,'hull'],[5,4,'battery']] },
  { name: 'SPECTER', desc: 'jam + trac',    color: '#b06aff', g: [[4,3,'engine'],[4,4,'jam'],[4,5,'trac'],[3,4,'battery'],[5,4,'turret']] },
  { name: 'NOVA',    desc: 'reactor+laser', color: '#ffd27f', g: [[4,3,'engine'],[4,4,'rctr'],[4,5,'laser'],[3,4,'rctr'],[5,4,'battery']] },
  { name: 'PIKEMAN', desc: 'railgun sniper', color: '#8ae8ff', g: [[4,3,'engine'],[4,4,'rctr'],[4,5,'rail'],[3,4,'battery'],[5,4,'armor']] },
];

// ---------- sprites (rendered via Blender MCP) ----------
const SPRITES = {};
for (const k of ['hull', 'hull_b', 'hull_c', 'engine', 'gun_base', 'gun_barrel', 'st_base', 'st_barrel', 'asteroid_a', 'asteroid_b', 'asteroid_c', 'station_core', 'pb_core', 'armor', 'rocket', 'cargo', 'gyro', 'laser', 'ammo', 'marine', 'pd', 'repair', 'mines', 'battery', 'shield', 'torp', 'jam', 'trac', 'rctr', 'rail', 'decoy']) {
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
let mode = 'menu'; // 'menu' | 'base' | 'editor' | 'flight' | 'planet'
let design, selected = 'hull';   // design = freeform part list [{dx,dy,t}] in ship-local px
let mouse = { x: 0, y: 0 };

// ---------- profile / accounts / settings (localStorage) ----------
let profile = null; // {name, lvl, scrap, ore, fuel, steam}
let accounts;
try { accounts = JSON.parse(localStorage.getItem('vs_accounts') || '[]'); }
catch (_) { accounts = []; }
const SET = Object.assign({ fx: true, stars: true, grid: true },
  JSON.parse(localStorage.getItem('vs_settings') || '{}'));
const saveAccounts = () =>
  localStorage.setItem('vs_accounts', JSON.stringify(accounts));
const saveSettings = () =>
  localStorage.setItem('vs_settings', JSON.stringify(SET));

// ---------- i18n ----------
const L = {
  en: {
    scrap: 'scrap', ore: 'ore', fuel: 'fuel',
    m_tag: 'salvage  ·  build  ·  raid',
    m_steam: 'LOGIN VIA STEAM', m_new: 'NEW PILOT', m_saved: 'SAVED PILOTS',
    m_lvl: 'BASE LV', m_settings: 'SETTINGS', m_on: 'ON', m_off: 'OFF', m_lang: 'LANGUAGE',
    b_title: 'ORBITAL BASE', b_lvl: 'LEVEL',
    b_per_min: '/min', b_budget: 'build budget — base level + depots',
    b_cmd: 'COMMAND', b_shipyard: 'SHIPYARD — build & launch',
    b_contracts: 'CONTRACTS — CAMPAIGN', b_cleared: 'CLEARED', b_active: 'ACTIVE',
    b_menu: 'BACK TO MENU', b_grid: 'BASE GRID', b_construct: 'CONSTRUCT',
    b_raid: '!! PIRATE RAID INBOUND — DEFEND',
    b_raid_sub: 'your buildings will fight — lose and one is damaged',
    c_station: 'RAID THE STATION', c_belt: 'BELT SWEEP', c_hunt: 'ELITE HUNT',
    c_convoy: 'ESCORT DUTY', c_tow: 'SALVAGE RUN', c_defense: 'BASE DEFENSE',
    d_station: 'break the shield ring, kill the core, land on the planet',
    d_belt: 'clear 12 hostiles out of the rock field — dodging required',
    d_hunt: 'a pirate flagship and its escorts — bring real guns',
    d_convoy: 'a fat hauler is crossing the belt — get it home in one piece',
    d_tow: 'three dead hulks in the field — drag them to the beacon',
    d_defense: 'pirates inbound — hold the line',
    ed_back: '◄ BASE  (ESC)', ed_title: 'SHIPYARD',
    ed_hint: 'LMB weld  ·  RMB rip off  ·  E erase-mode  ·  MMB pan  ·  wheel zoom  ·  X mirror  ·  Z undo  ·  H recenter',
    ed_nose: 'NOSE', ed_parts: 'PARTS', ed_sel: 'selected',
    ed_build: 'BUILD', ed_erase: 'ERASE', ed_mirror: 'MIRROR (X)', ed_mirron: 'MIRROR: ON',
    ed_undo: 'UNDO (Z)', ed_clear: 'CLEAR', ed_fleet: 'FLEET',
    ed_launch: 'LAUNCH', ed_test: 'TEST RANGE',
    st_mass: 'mass', st_thrust: 'thrust', st_guns: 'guns', st_cost: 'cost', st_over: 'OVER BUDGET!',
    why_empty: 'EMPTY HULL', why_hull: 'NEED HULL', why_engine: 'NEED ENGINE',
    why_weapon: 'NEED A WEAPON', why_disconnected: 'HULL DISCONNECTED',
  },
  ru: {
    scrap: 'лома', ore: 'руды', fuel: 'топлива',
    m_tag: 'ломай  ·  строй  ·  громь',
    m_steam: 'ВОЙТИ ЧЕРЕЗ STEAM', m_new: 'НОВЫЙ ПИЛОТ', m_saved: 'СОХРАНЁННЫЕ ПИЛОТЫ',
    m_lvl: 'УР. БАЗЫ', m_settings: 'НАСТРОЙКИ', m_on: 'ВКЛ', m_off: 'ВЫКЛ', m_lang: 'ЯЗЫК',
    b_title: 'ОРБИТАЛЬНАЯ БАЗА', b_lvl: 'УРОВЕНЬ',
    b_per_min: '/мин', b_budget: 'бюджет постройки — уровень базы + склады',
    b_cmd: 'КОМАНДА', b_shipyard: 'ВЕРФЬ — сборка и вылет',
    b_contracts: 'КОНТРАКТЫ — КАМПАНИЯ', b_cleared: 'ПРОЙДЕНО', b_active: 'ВЫБРАН',
    b_menu: 'В МЕНЮ', b_grid: 'СЕТКА БАЗЫ', b_construct: 'ПОСТРОИТЬ',
    b_raid: '!! РЕЙД ПИРАТОВ — ОБОРОНА',
    b_raid_sub: 'твои постройки будут драться — проиграешь, одна пострадает',
    c_station: 'НАЛЁТ НА СТАНЦИЮ', c_belt: 'ЗАЧИСТКА ПОЯСА', c_hunt: 'ОХОТА НА ФЛАГМАН',
    c_convoy: 'ЭСКОРТ КОНВОЯ', c_tow: 'СПАСЕНИЕ ОБЛОМКОВ', c_defense: 'ОБОРОНА БАЗЫ',
    d_station: 'сними щитовое кольцо, убей ядро, садись на планету',
    d_belt: 'зачисти 12 бандитов в поле астероидов — придётся уворачиваться',
    d_hunt: 'пиратский флагман с эскортом — бери настоящие пушки',
    d_convoy: 'жирная баржа идёт через пояс — доведи её целой',
    d_tow: 'три мёртвых корпуса в поле — отбуксируй их на маяк',
    d_defense: 'пираты на подходе — держи оборону',
    ed_back: '◄ НА БАЗУ  (ESC)', ed_title: 'ВЕРФЬ',
    ed_hint: 'ЛКМ ставить  ·  ПКМ срывать  ·  E режим срыва  ·  СКМ сдвиг  ·  колесо зум  ·  X зеркало  ·  Z отмена  ·  H к центру',
    ed_nose: 'НОС', ed_parts: 'ДЕТАЛИ', ed_sel: 'выбрано',
    ed_build: 'СТРОИТЬ', ed_erase: 'СРЫВАТЬ', ed_mirror: 'ЗЕРКАЛО (X)', ed_mirron: 'ЗЕРКАЛО: ВКЛ',
    ed_undo: 'ОТМЕНА (Z)', ed_clear: 'СНЕСТИ', ed_fleet: 'ЭСКАДРА',
    ed_launch: 'ВЫЛЕТ', ed_test: 'ПОЛИГОН',
    st_mass: 'масса', st_thrust: 'тяга', st_guns: 'стволы', st_cost: 'цена', st_over: 'НЕ ХВАТАЕТ ЛОМА!',
    why_empty: 'ПУСТОЙ КОРПУС', why_hull: 'НУЖЕН HULL', why_engine: 'НУЖЕН ДВИГАТЕЛЬ',
    why_weapon: 'НУЖНО ОРУЖИЕ', why_disconnected: 'КОРПУС РАЗРВАН',
  },
};
const T = k => (L[SET.lang] || L.en)[k] || L.en[k] || k;
function saveProfile() {
  if (!profile) return;
  const i = accounts.findIndex(a => a.name === profile.name);
  if (i >= 0) accounts[i] = profile; else accounts.push(profile);
  saveAccounts();
}
// ship designs live in the profile — autosave on launch/leave, three
// named blueprint slots in the shipyard for keeping alternate builds
const deepCopy = o => JSON.parse(JSON.stringify(o));
function persistDesign() { if (profile) { profile.design = deepCopy(design); saveProfile(); } }
function loadProfileDesign() {
  design = (profile.design && profile.design.length) ? deepCopy(profile.design) : starterDesign();
}
let allies = [], foes, station, bullets, particles, stars, planet;
const selection = new Set(); // ally ships under command
let rosterSel = new Set();   // chosen escort indices
let paused = false, autopilot = false, won = false, dead = false, time = 0;
let mission = 'station', foesDown = 0, beltGoal = 0, elite = null, banked = false, mined = 0;
const CONTRACTS = {
  station: { name: 'RAID THE STATION', desc: 'break the shield ring, kill the core, land on the planet', accent: '#ff8a7a' },
  belt:    { name: 'BELT SWEEP', desc: 'clear 12 hostiles out of the rock field — dodging required', accent: '#8ad4ff' },
  hunt:    { name: 'ELITE HUNT', desc: 'a pirate flagship and its escorts — bring real guns', accent: '#ffcf6e' },
  convoy:  { name: 'ESCORT DUTY', desc: 'a fat hauler is crossing the belt — get it home in one piece', accent: '#9dff8a' },
  tow:     { name: 'SALVAGE RUN', desc: 'three dead hulks in the field — drag them to the beacon', accent: '#4affe0' },
  defense: { name: 'BASE DEFENSE', desc: 'pirates inbound — hold the line', accent: '#ff8a7a', hidden: true },
};
let salvage = 0, debris = [], mines = [], msg = null, reinforced = false;
let baseShip = null, defWave = 0, baseLost = false, raidWarn = false;
let hauler = null, haulerLost = false, towGot = 0;
// build capacity is the limiter — the workbench field itself is unbounded
const depotBonus = () => ((profile && profile.base) || []).reduce((n, b) => n + (b && b.t === 'depot' ? b.lvl * 3 : 0), 0);
const wingCap = () => MAX_WING + ((profile && profile.base) || []).reduce((n, b) => n + (b && b.t === 'station' ? b.lvl : 0), 0);
const budget = () => 10 + ((profile && profile.lvl) || 1) * 6 + depotBonus() + Math.floor(salvage);
// campaign: visible contracts finished — pirates remember your name
const CAMPAIGN_KEYS = ['station', 'belt', 'hunt', 'convoy', 'tow'];
const threat = () => CAMPAIGN_KEYS.filter(k => (profile && profile.done || {})[k]).length;

// ---------- base construction ----------
const BUILDINGS = {
  mine:    { name: 'MINE',    desc: 'ore/min',    rate: 6, res: 'ore',   accent: '#8ad4ff', cost: l => 30 * (l + 1) },
  smelter: { name: 'SMELTER', desc: 'scrap/min',  rate: 8, res: 'scrap', accent: '#ffcf6e', cost: l => 40 * (l + 1) },
  depot:   { name: 'DEPOT',   desc: '+3 budget',  rate: 0,              accent: '#9dff8a', cost: l => 35 * (l + 1) },
  turret:  { name: 'TURRET',  desc: 'defense',    rate: 0,              accent: '#ff8a7a', cost: l => 45 * (l + 1) },
  station: { name: 'STATION', desc: '+1 escort',  rate: 0,              accent: '#c8a2ff', cost: l => 70 * (l + 1) },
};
let baseSlot = -1;
// offline production: buildings work while you're away (8h cap)
function baseTick() {
  if (!profile) return;
  profile.base = profile.base || Array(12).fill(null);
  const now = Date.now(), mins = Math.min(480, Math.max(0, (now - (profile.lastSeen || now)) / 60000));
  if (mins > 0.05) {
    let got = 0;
    for (const b of profile.base) {
      if (!b) continue;
      const spec = BUILDINGS[b.t];
      if (spec.rate) { profile[spec.res] = (profile[spec.res] || 0) + Math.floor(spec.rate * b.lvl * mins); got = 1; }
    }
    if (got) saveProfile();
  }
  profile.lastSeen = now;
}
function refreshLvl() {
  profile.lvl = 1 + Math.floor(profile.base.reduce((n, b) => n + (b ? b.lvl : 0), 0) / 3);
  saveProfile();
}
let cam = { x: 0, y: 0, zoom: 1 };   // free camera: wheel zoom, RMB/MMB drag pan, F re-center
let dragging = false, dragLast = null;
let asteroids = [], pods = [], waveT = 45, roamerT = 12;
// ---------- planet mode ----------
const TIL = 30, PW = 52, PH = 34;     // tile size, map dims
// tile types: 0 air, 1 dirt, 2 rock, 3 ore, 4 fuel, 5 wall, 6 base-wall
const TILE_HP = { 1: 25, 2: 55, 3: 35, 4: 35, 5: 80, 6: 110 };
const TILE_COL = { 1: '#5e4630', 2: '#4a4f5a', 3: '#b06a2a', 4: '#2a8a6a', 5: '#6e92c8', 6: '#8a4a5e' };
let ptiles, rover, pguards, pturrets, pcore, pres, pdig, pBuildSel, pdebris, pwon, pdead, pbuilt, ptileDmg, pvehs, pdrones;
const autoBtn  = { x: 0, y: 0, w: 150, h: 38 };
const pauseBtn = { x: 0, y: 0, w: 120, h: 38 };
const allBtn   = { x: 0, y: 0, w: 140, h: 38 };
const launchBtn = { x: 0, y: 0, w: 170, h: 46 };
const testBtn = { x: 0, y: 0, w: 170, h: 46 };
const palette = {};   // part key -> rect
const rosterRects = []; // i -> rect
const bpRects = [];     // blueprint slots: {r, sr, i} — load zone + save chip

const flagship = () => allies[0];

// ---------- input ----------
addEventListener('keydown', e => {
  if (mode === 'editor') {
    if (e.code === 'Escape') { persistDesign(); mode = 'base'; return; }
    if (e.code === 'KeyZ') { if (undoStack.length) design = undoStack.pop(); return; }
    if (e.code === 'KeyX') { mirrorX = !mirrorX; return; }
    if (e.code === 'KeyE') { editTool = editTool === 'erase' ? 'build' : 'erase'; return; }
    if (e.code === 'KeyH') { ev.x = 0; ev.y = 0; ev.k = 1.7; return; }
    return;
  }
  if (mode === 'base' && e.code === 'Escape') { mode = 'menu'; return; }
  if (mode === 'planet') {
    if (e.code === 'KeyR') mode = 'editor';
    if (e.code === 'Enter' && pwon) {
      // bank the haul and head home — base level grows, budget grows
      if (profile) {
        profile.scrap = (profile.scrap || 0) + 15;
        profile.ore = (profile.ore || 0) + pres.ore;
        profile.fuel = (profile.fuel || 0) + pres.fuel;
        profile.lvl = (profile.lvl || 1) + 1;
        // the station raid counts toward the campaign board
        profile.done = profile.done || {};
        const first = !profile.done.station;
        profile.done.station = true;
        if (first && threat() >= CAMPAIGN_KEYS.length && !profile.campaignDone) {
          profile.campaignDone = true;
          profile.scrap += 200; profile.ore += 60; profile.lvl += 2;
        }
        saveProfile();
      }
      mode = 'base';
    }
    if (e.code === 'Space') { paused = !paused; e.preventDefault(); }
    if (e.code === 'Digit1') pBuildSel = 'wall';
    if (e.code === 'Digit2') pBuildSel = 'turret';
    if (e.code === 'Escape') pBuildSel = null;
    return;
  }
  if (mode !== 'flight') return;
  if (e.code === 'KeyP') autopilot = !autopilot;
  if (e.code === 'KeyA') selectAll();
  if (e.code === 'KeyM') for (const s of selection) if (s.alive) dropMine(s);
  if (e.code === 'KeyD') for (const s of selection) if (s.alive) launchDecoy(s);
  if (e.code === 'KeyR') mode = 'editor';
  if (e.code === 'Escape') { if (mined) { profile.ore = (profile.ore || 0) + mined; mined = 0; } saveProfile(); raidWarn = Math.random() < 0.4; mode = 'base'; }
  if (e.code === 'KeyL' && won && mission === 'station') initPlanet();
  if (e.code === 'KeyF') { const f = allies.find(s => s.alive); if (f) { cam.x = f.x; cam.y = f.y; } }
  if (e.code === 'Space') { paused = !paused; e.preventDefault(); }
});
addEventListener('mousedown', e => {
  if (mode === 'menu') { if (e.button === 0) menuClick(e.clientX, e.clientY); return; }
  if (mode === 'base') { if (e.button === 0) baseClick(e.clientX, e.clientY); return; }
  if (mode === 'editor') {
    if (e.button === 1) { editPanning = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
    if (e.button !== 0 && e.button !== 2) return;
    if (editorUIClick(e.clientX, e.clientY)) return; // buttons ate the click
    startEditDrag(e.clientX, e.clientY, e.button === 2);
    return;
  }
  if (mode === 'planet') {
    if (e.button === 1 || e.button === 2) { dragging = true; dragLast = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
    if (e.button === 0) planetClick(e.clientX, e.clientY);
    return;
  }
  if (e.button === 1 || e.button === 2) { dragging = true; dragLast = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
  if (e.button === 0) flightClick(e.clientX, e.clientY, e.shiftKey);
});
addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (mode === 'editor') {
    if (editPanning) {
      ev.x -= (e.clientX - editPanning.x) / ev.k;
      ev.y -= (e.clientY - editPanning.y) / ev.k;
      editPanning = { x: e.clientX, y: e.clientY };
      return;
    }
    if (editDrag) { editDragTo(e.clientX, e.clientY); return; }
  }
  if (!dragging || (mode !== 'flight' && mode !== 'planet')) return;
  cam.x -= (e.clientX - dragLast.x) / cam.zoom;
  cam.y -= (e.clientY - dragLast.y) / cam.zoom;
  dragLast = { x: e.clientX, y: e.clientY };
});
addEventListener('mouseup', () => { dragging = false; editDrag = null; editPanning = null; });
addEventListener('wheel', e => {
  if (mode === 'editor') {
    const n = Math.max(0.6, Math.min(3, ev.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    ev.x += ((e.clientX - edCenter().x) / ev.k) * (1 - ev.k / n);
    ev.y += ((e.clientY - edCenter().y) / ev.k) * (1 - ev.k / n);
    ev.k = n;
    e.preventDefault();
    return;
  }
  if (mode !== 'flight' && mode !== 'planet') return;
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
  for (const s of allies) if (s.alive && !s.isBase && !s.isCiv && !s.isDecoy) selection.add(s);
}
const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ---------- editor: freeform pixel assembly ----------
// design is a loose list of parts {dx,dy,t} in ship-local px. Parts must
// touch an existing part — snap flush to its edge, or nudge to a free offset.
function starterDesign() {
  return [{ dx: -2 * CS, dy: 0, t: 'engine' }, { dx: -CS, dy: 0, t: 'hull' }, { dx: 0, dy: 0, t: 'hull' }, { dx: CS, dy: 0, t: 'turret' }];
}

// convert a [row,col,type] layout to freeform coords (roster + foe defs stay grid-written)
function defDesign(list) {
  const c = (GRID - 1) / 2;
  return list.map(([r, col, t]) => ({ dx: (col - c) * CS, dy: (r - c) * CS, t }));
}

const designCost = () => design.reduce((s, p) => s + TYPES[p.t].cost, 0);

// ---------- editor workbench ----------
// FIXED grid — the design never auto-centers, parts stay exactly where you
// welded them. Snap is a plain CS grid anchored at world origin; MMB drags
// the camera, wheel zooms. LMB welds, RMB (or E-mode LMB) rips off.
const ev = { x: 0, y: 0, k: 1.7 };
const edCenter = () => ({ x: W * 0.30, y: H * 0.52 });
const edToWorld = (mx, my) => {
  const c = edCenter();
  return { x: ev.x + (mx - c.x) / ev.k, y: ev.y + (my - c.y) / ev.k };
};
const edToScreen = (dx, dy) => {
  const c = edCenter();
  return { x: c.x + (dx - ev.x) * ev.k, y: c.y + (dy - ev.y) * ev.k };
};

const GRID_LIM = 10; // build area: ±10 cells around origin
function snapPos(px, py) {
  const gx = Math.round(px / CS), gy = Math.round(py / CS);
  if (Math.abs(gx) > GRID_LIM || Math.abs(gy) > GRID_LIM) return null;
  return { dx: gx * CS, dy: gy * CS };
}

function designCenter() {
  if (!design.length) return { dx: 0, dy: 0 };
  let dx = 0, dy = 0;
  for (const p of design) { dx += p.dx; dy += p.dy; }
  return { dx: dx / design.length, dy: dy / design.length };
}

// ---------- editor drag-building ----------
let editDrag = null, editPanning = null, editTool = 'build', mirrorX = false, edBackRect = null;
const undoStack = [];
const pushUndo = () => { undoStack.push(deepCopy(design)); if (undoStack.length > 40) undoStack.shift(); };
const toolRects = [];

function partAt(px, py) {
  for (const p of design) if (Math.hypot(px - p.dx, py - p.dy) < CS * 0.55) return p;
  return null;
}
function eraseAt(px, py) {
  const p = partAt(px, py);
  if (p) design.splice(design.indexOf(p), 1);
}
// weld on the grid cell under the cursor; mirror mode lands a twin weld on
// the reflected cell across the fixed vertical centerline (dx = 0)
function tryPlace(px, py) {
  const sp = snapPos(px, py);
  if (!sp || partAt(sp.dx, sp.dy)) return false;
  if (designCost() + TYPES[selected].cost > budget()) return false;
  design.push({ dx: sp.dx, dy: sp.dy, t: selected });
  if (mirrorX) {
    const mdx = -sp.dx;
    if (mdx !== sp.dx && !partAt(mdx, sp.dy) && designCost() + TYPES[selected].cost <= budget())
      design.push({ dx: mdx, dy: sp.dy, t: selected });
  }
  return true;
}
function startEditDrag(mx, my, erase) {
  pushUndo();
  editDrag = (erase || editTool === 'erase') ? 'erase' : 'paint';
  const w = edToWorld(mx, my);
  if (editDrag === 'erase') eraseAt(w.x, w.y); else tryPlace(w.x, w.y);
}
function editDragTo(mx, my) {
  const w = edToWorld(mx, my);
  if (editDrag === 'erase') eraseAt(w.x, w.y); else tryPlace(w.x, w.y);
}

function editorUIClick(mx, my) {
  if (edBackRect && inRect(edBackRect, mx, my)) { persistDesign(); mode = 'base'; return true; }
  for (const k of KEYS_ORDER) {
    const r = palette[k];
    if (r && inRect(r, mx, my)) { selected = k; return true; }
  }
  for (let i = 0; i < ROSTER.length; i++) {
    const r = rosterRects[i];
    if (r && inRect(r, mx, my)) {
      if (rosterSel.has(i)) rosterSel.delete(i);
      else if (rosterSel.size < wingCap()) rosterSel.add(i);
      return true;
    }
  }
  if (inRect(launchBtn, mx, my)) { if (canLaunch().ok) launch(); return true; }
  if (inRect(testBtn, mx, my)) { if (canLaunch().ok) { mission = 'test'; launch(); } return true; }
  for (const tb of toolRects) if (inRect(tb.r, mx, my)) { tb.fn(); return true; }
  // blueprint slots: [S] saves the current build in, body loads it back
  for (const bp of bpRects) {
    if (inRect(bp.sr, mx, my)) {
      pushUndo();
      profile.bps = profile.bps || [null, null, null];
      profile.bps[bp.i] = deepCopy(design);
      saveProfile();
      return true;
    }
    if (inRect(bp.r, mx, my) && profile.bps && profile.bps[bp.i]) {
      pushUndo();
      design = deepCopy(profile.bps[bp.i]);
      return true;
    }
  }
  return false;
}

function canLaunch() {
  const n = t => design.filter(x => x.t === t).length;
  if (!design.length) return { ok: false, why: 'why_empty' };
  if (!n('hull')) return { ok: false, why: 'why_hull' };
  if (!n('engine')) return { ok: false, why: 'why_engine' };
  if (!n('turret') && !n('rocket') && !n('laser') && !n('torp') && !n('rail')) return { ok: false, why: 'why_weapon' };
  // hull must be one welded piece — no floating sections
  const seen = new Set([design[0]]), q = [design[0]];
  for (let i = 0; i < q.length; i++)
    for (const p of design)
      if (!seen.has(p) && Math.hypot(p.dx - q[i].dx, p.dy - q[i].dy) <= CS * 1.5) { seen.add(p); q.push(p); }
  if (seen.size < design.length) return { ok: false, why: 'why_disconnected' };
  return { ok: true };
}

// ---------- ship building ----------
function blocksFromList(list) {
  return list.map(({ dx, dy, t }) => ({
    dx, dy, type: t,
    hp: TYPES[t].hp, maxHp: TYPES[t].hp, cd: rand(0, 0.5),
    variant: t === 'hull' ? HULL_VARIANTS[Math.floor(Math.random() * HULL_VARIANTS.length)] : t,
    aim: 0,
    pix: new Uint8Array(BP * BP).fill(1), pixCount: BP * BP,
    barrels: t === 'turret' ? 1 : 0, heat: 0, charges: t === 'mines' ? 4 : (t === 'decoy' ? 2 : 0)
  }));
}

const gridFromList = defDesign; // foe/roster layouts are still written as [r,c,t]

function recount(s) {
  const eng = s.blocks.filter(b => b.type === 'engine').length;
  const gyro = s.blocks.filter(b => b.type === 'gyro').length;
  // armor plates ride heavier than normal blocks
  const mass = Math.max(1, s.blocks.reduce((m, b) => m + (b.type === 'armor' ? 1.5 : 1), 0));
  s.mass = mass;
  s.thrust = eng * 220 / (mass * 0.5);
  s.turn = Math.max(1.0, 2.4 - mass * 0.08 + gyro * 0.4);
  s.cargo = s.blocks.some(b => b.type === 'cargo');
  // energy budget: bare hull runs a trickle, each CELL adds a real tank
  const bat = s.blocks.filter(b => b.type === 'battery').length;
  const rct = s.blocks.filter(b => b.type === 'rctr').length;
  s.emax = 30 + bat * 60 + rct * 40;
  s.eregen = 3 + bat * 4 + rct * 10; // a reactor drinks for the whole grid
  if (s.energy === undefined || s.energy > s.emax) s.energy = s.emax;
  // shield pool: each emitter adds soak + regen
  const shd = s.blocks.filter(b => b.type === 'shield').length;
  s.shieldMax = shd * 80;
  s.shieldRegen = shd * 8;
  if (s.shield === undefined || s.shield > s.shieldMax) s.shield = s.shieldMax;
  // EW suite: jammers scramble enemy fire control, tractors grab hulls
  const jam = s.blocks.filter(b => b.type === 'jam').length;
  s.jamR = jam ? 380 + jam * 70 : 0;
  s.tracN = s.blocks.filter(b => b.type === 'trac').length;
  // atmosphere: 10 units of air per sealed compartment
  s.airMax = s.blocks.length * 10;
  if (s.air === undefined || s.air > s.airMax) s.air = s.airMax;
}

function makeShip(list, x, y, team, color, o = {}) {
  const s = {
    x, y, vx: 0, vy: 0, angle: o.angle ?? 0, va: 0,
    blocks: blocksFromList(list), team, color,
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
  persistDesign();
  saveProfile();
  mode = 'flight';
  autopilot = false; paused = false; won = false; dead = false; time = 0;
  debris = []; mines = []; msg = null; reinforced = false;
  foesDown = 0; beltGoal = 0; elite = null; banked = false; mined = 0;
  baseShip = null; defWave = 0; baseLost = false; hauler = null; haulerLost = false; towGot = 0;
  missionFaction = FACTIONS.sabres; // default doctrine, overridden per contract
  const flag = makeShip(design, -600, 0, 'ally', '#7fd4ff');
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

  const noStation = { x: 9e9, y: 9e9, r: 0, coreHp: 0, coreMax: 0, turrets: [] };
  asteroids = [];

  if (mission === 'belt') {
    station = noStation; planet = null;
    beltGoal = 12; waveT = 4;
    missionFaction = [FACTIONS.sabres, FACTIONS.iron, FACTIONS.cult][Math.floor(rand(0, 3))]; // the belt rotates gangs
    foes = [];
    for (let k = 0; k < 3; k++) spawnBeltFoe();
    pods = [{ x: 400, y: -300, hp: 40 }, { x: -200, y: 350, hp: 40 }, { x: 800, y: 200, hp: 40 }];
    for (let k = 0; k < 16; k++) {
      const a = rand(0, TAU), d = rand(200, 1100);
      asteroids.push(makeAsteroid(Math.cos(a) * d, Math.sin(a) * d, rand(24, 62)));
    }
    spawnRoamer(); spawnRoamer(); spawnRoamer();
    roamerT = 7; // the belt is a shooting gallery — rocks everywhere
  } else if (mission === 'hunt') {
    station = noStation; planet = null;
    elite = makeShip(gridFromList([
      [4,2,'engine'],[5,2,'engine'],[4,3,'armor'],[5,3,'armor'],
      [4,4,'hull'],[5,4,'hull'],[3,4,'armor'],[6,4,'armor'],
      [4,5,'turret'],[5,5,'turret'],[3,5,'rocket'],[6,5,'laser'],
      [4,6,'armor'],[5,6,'armor']
    ]), 1400, 0, 'foe', '#ffb36e');
    const e1 = makeShip(gridFromList([[4,3,'engine'],[4,4,'hull'],[4,5,'turret']]), 1500, -300, 'foe', '#ff8a7a');
    const e2 = makeShip(gridFromList([[4,3,'engine'],[4,4,'hull'],[4,5,'turret'],[5,4,'hull']]), 1500, 300, 'foe', '#ff8a7a');
    e1.role = e2.role = 'interceptor';
    elite.role = 'interceptor';
    foes = [elite, e1, e2];
    for (const f of foes) f.home = { x: f.x, y: f.y };
    pods = [{ x: 600, y: 420, hp: 40 }];
    const apos = [[-100, -300], [200, 200], [450, -150], [700, 100], [100, 500], [900, -450]];
    for (const [ax, ay] of apos) asteroids.push(makeAsteroid(ax + rand(-40, 40), ay + rand(-40, 40), rand(26, 58)));
    spawnRoamer();
    roamerT = 14;
  } else if (mission === 'station') { // the original raid contract
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
      turrets: [0, 1, 2, 3, 4, 5].map(j => ({ a: j / 6 * TAU, hp: 55, maxHp: 55, cd: rand(0, 1.4), alive: true, barrels: 2 }))
    };
    // cargo pods — shoot them open for loot
    pods = [{ x: 300, y: -260, hp: 40 }, { x: 600, y: 420, hp: 40 }, { x: 1100, y: -80, hp: 40 }];
    waveT = 45;
    planet = { x: 2400, y: 800, r: 420 };
    // asteroid field between spawn and the station — destructible cover
    const apos = [[-100, -300], [200, 200], [450, -150], [700, 100], [100, 500], [900, -450], [1200, 350], [1500, -500], [400, -550], [-300, 400]];
    for (const [ax, ay] of apos) asteroids.push(makeAsteroid(ax + rand(-40, 40), ay + rand(-40, 40), rand(26, 58)));
    spawnRoamer(); spawnRoamer(); // fast movers already on the map
    roamerT = 14;
  } else if (mission === 'defense') { // pirates raid YOUR base — the grid fights back
    station = noStation; planet = null; pods = [];
    // every building becomes a block cluster — turret buildings shoot
    const gl = [];
    (profile.base || []).forEach((b, i) => {
      if (!b) return;
      const gx = (i % 4) * 3, gy = Math.floor(i / 4) * 3;
      if (b.t === 'turret') {
        gl.push([gx, gy, 'turret'], [gx + 1, gy, 'armor'], [gx, gy + 1, 'ammo'], [gx + 1, gy + 1, 'armor']);
        for (let l = 1; l < Math.min(b.lvl, 3); l++) gl.push([gx + 2, gy + l - 1, 'turret']);
      } else if (b.t === 'mine') gl.push([gx, gy, 'armor'], [gx + 1, gy, 'armor'], [gx, gy + 1, 'armor'], [gx + 1, gy + 1, 'hull']);
      else if (b.t === 'smelter') gl.push([gx, gy, 'hull'], [gx + 1, gy, 'hull'], [gx, gy + 1, 'armor'], [gx + 1, gy + 1, 'hull']);
      else if (b.t === 'depot') gl.push([gx, gy, 'cargo'], [gx + 1, gy, 'hull'], [gx, gy + 1, 'hull'], [gx + 1, gy + 1, 'battery']);
      else if (b.t === 'station') gl.push([gx, gy, 'shield'], [gx + 1, gy, 'pd'], [gx, gy + 1, 'battery'], [gx + 1, gy + 1, 'hull']);
    });
    if (!gl.length) gl.push([0, 0, 'hull'], [1, 0, 'hull'], [0, 1, 'hull'], [1, 1, 'armor']); // bare pad
    baseShip = makeShip(gridFromList(gl), 1500, 0, 'ally', '#8aa0c8');
    baseShip.isBase = true;
    baseShip.order = { kind: 'move', x: 1500, y: 0 };
    allies.push(baseShip);
    // the fleet scrambles to the base, not its usual far spawn
    allies.forEach((s, i) => { if (s !== baseShip) { s.x = 850 - i * 60; s.y = -140 + i * 100; s.vx = s.vy = 0; } });
    cam.x = 1100; cam.y = 0;
    foes = []; waveT = 1.5; roamerT = 1e9;
    missionFaction = FACTIONS.iron; // the pact comes for your foundries
    for (let k = 0; k < 8; k++)
      asteroids.push(makeAsteroid(rand(-400, 1000), rand(-700, 700), rand(26, 54)));
  } else if (mission === 'convoy') { // shepherd a slow freighter across the belt
    station = noStation; planet = null; pods = [];
    hauler = makeShip(gridFromList([
      [4,2,'engine'],[4,3,'armor'],[5,3,'armor'],
      [4,4,'hull'],[5,4,'cargo'],[6,4,'cargo'],
      [4,5,'hull'],[5,5,'cargo'],[6,5,'hull'],
      [4,6,'armor'],[5,6,'armor']
    ]), -350, 0, 'ally', '#9dff8a');
    hauler.isCiv = true; // a civilian — doesn't take orders, just flies the route
    hauler.order = { kind: 'move', x: 2600, y: 0 };
    allies.push(hauler);
    foes = []; waveT = 3; roamerT = 9;
    missionFaction = FACTIONS.sabres; // sabres smell an easy payday
    for (let k = 0; k < 14; k++) {
      const ax = rand(200, 2200), ay = rand(-800, 800);
      asteroids.push(makeAsteroid(ax, ay, rand(24, 60)));
    }
    spawnRoamer(); spawnRoamer();
  } else if (mission === 'tow') { // dead hulks + a beacon — tractor them home
    station = noStation; planet = null; pods = [];
    const hulkDefs = [
      { d: [[4,3,'hull'],[4,4,'armor'],[3,4,'cargo'],[5,4,'hull'],[4,5,'hull']], x: 600, y: -320 },
      { d: [[4,3,'armor'],[4,4,'hull'],[3,4,'hull'],[5,4,'cargo'],[4,5,'armor'],[3,5,'hull']], x: 1350, y: 380 },
      { d: [[4,3,'hull'],[4,4,'cargo'],[3,4,'armor'],[5,4,'armor'],[4,5,'hull'],[5,5,'hull'],[3,5,'cargo']], x: 950, y: 700 },
    ];
    foes = hulkDefs.map(h => {
      const f = makeShip(gridFromList(h.d), h.x, h.y, 'foe', '#6a7a8a');
      f.role = 'dummy'; f.hulk = true; // dead driftwood — not a target
      return f;
    });
    waveT = 18; roamerT = 12;
    missionFaction = FACTIONS.cult; // cultists want the hulks too
    for (let k = 0; k < 10; k++)
      asteroids.push(makeAsteroid(rand(0, 1800), rand(-700, 800), rand(24, 55)));
    spawnRoamer();
  } else { // 'test' — firing range: dummies, no engines, no guns, no pay
    station = noStation; planet = null;
    foes = [
      makeShip(gridFromList([[4,4,'hull'],[3,4,'hull'],[5,4,'hull'],[4,3,'armor'],[4,5,'armor']]), -250, -220, 'foe', '#8a8f9a'),
      makeShip(gridFromList([[4,4,'armor'],[3,4,'hull'],[5,4,'hull'],[4,3,'hull'],[4,5,'armor'],[3,5,'hull'],[5,5,'hull']]), 350, 300, 'foe', '#8a8f9a'),
      makeShip(gridFromList([[4,4,'armor'],[3,4,'armor'],[5,4,'armor'],[4,3,'armor'],[4,5,'armor'],[3,5,'armor'],[5,5,'armor'],[3,3,'armor'],[5,3,'armor']]), 950, -250, 'foe', '#8a8f9a'),
    ];
    for (const f of foes) f.role = 'dummy';
    pods = [];
    const apos = [[-100, -300], [200, 200], [450, -150]];
    for (const [ax, ay] of apos) asteroids.push(makeAsteroid(ax, ay, rand(26, 40)));
    waveT = 1e9; roamerT = 1e9; // quiet range — it's practice
  }
  bullets = []; particles = [];
  stars = [];
  for (let j = 0; j < 500; j++)
    stars.push({ x: rand(-2500, 5000), y: rand(-2500, 2500), s: rand(0.4, 1.8), d: rand(0.2, 0.9) });
}

const BELT_DESIGNS = [
  [[4,3,'engine'],[4,4,'hull'],[4,5,'turret']],
  [[4,2,'engine'],[4,3,'engine'],[4,4,'hull'],[4,5,'turret']],
  [[4,3,'engine'],[4,4,'armor'],[4,5,'turret'],[3,4,'hull']],
  [[4,3,'engine'],[4,4,'hull'],[4,5,'rocket'],[3,4,'armor']],
];
// pirate doctrines — every wave leans on its own toys, not generic gunships
const FACTIONS = {
  sabres: { name: 'RED SABRES', color: '#ff8a7a', designs: BELT_DESIGNS },
  iron:   { name: 'IRON PACT', color: '#ffb36e', designs: [
    [[4,2,'engine'],[4,3,'armor'],[4,4,'armor'],[4,5,'turret'],[3,4,'armor'],[5,4,'armor'],[4,6,'shield']],
    [[4,2,'engine'],[4,3,'armor'],[4,4,'hull'],[4,5,'torp'],[3,4,'armor'],[5,4,'shield'],[4,6,'armor']],
    [[4,2,'engine'],[4,3,'armor'],[4,4,'armor'],[4,5,'rocket'],[3,4,'armor'],[5,4,'turret'],[4,6,'shield'],[3,5,'hull']],
    [[4,2,'engine'],[4,3,'armor'],[4,4,'rctr'],[4,5,'rail'],[3,4,'armor'],[5,4,'shield'],[4,6,'armor']],
  ]},
  cult:   { name: 'VOID CULT', color: '#b06aff', designs: [
    [[4,3,'engine'],[4,4,'hull'],[4,5,'jam'],[3,4,'hull'],[5,4,'mines'],[4,6,'hull']],
    [[4,3,'engine'],[4,4,'hull'],[4,5,'trac'],[3,4,'turret'],[5,4,'jam'],[4,6,'armor']],
    [[4,2,'engine'],[4,3,'engine'],[4,4,'hull'],[4,5,'laser'],[3,4,'pd'],[5,4,'jam'],[4,6,'hull']],
  ]},
};
let missionFaction = FACTIONS.sabres;
const factionDesign = () => missionFaction.designs[Math.floor(Math.random() * missionFaction.designs.length)];
function spawnBeltFoe() {
  const a = rand(0, TAU), d = rand(1200, 1500);
  const f = makeShip(gridFromList(factionDesign()), Math.cos(a) * d, Math.sin(a) * d, 'foe', missionFaction.color);
  f.role = 'interceptor';
  foes.push(f);
}

function makeAsteroid(x, y, r) {
  const spr = r > 48 ? 'asteroid_c' : (Math.random() < 0.5 ? 'asteroid_a' : 'asteroid_b');
  return { x, y, r, spr, vx: rand(-8, 8), vy: rand(-8, 8), rot: rand(0, TAU), va: rand(-0.2, 0.2), hp: Math.round(r * 1.6), roamer: false, dmg: [] };
}

// fast mover crossing the field — dodge it or eat pixel damage
function spawnRoamer() {
  const side = Math.floor(rand(0, 4));
  const x = side === 0 ? -900 : side === 1 ? 2800 : rand(-800, 2600);
  const y = side === 2 ? -1100 : side === 3 ? 1100 : rand(-900, 900);
  const tx = rand(200, 1600), ty = rand(-400, 400); // crosses the battle zone
  const a = Math.atan2(ty - y, tx - x), sp = rand(90, 190);
  const r = rand(16, 64);
  const ast = makeAsteroid(x, y, r);
  ast.vx = Math.cos(a) * sp; ast.vy = Math.sin(a) * sp;
  ast.va = rand(-1.2, 1.2); ast.roamer = true;
  asteroids.push(ast);
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
  for (const f of foes) if (f.alive && !f.hulk) { const d = dist(s, f); if (d < bd) { bd = d; best = f; } }
  for (const t of station.turrets) if (t.alive) { const d = dist(s, turretPos(t)); if (d < bd) { bd = d; best = turretPos(t); } }
  if (!best && station.turrets.every(t => !t.alive) && station.coreHp > 0 && dist(s, station) < 700) best = station;
  return best;
}

function nearestAlly(f) {
  let best = null, bd = 1e9;
  for (const s of allies) if (s.alive) {
    const d = dist(f, s);
    if (s.isDecoy && d < 420) return s; // a flare screams louder than any hull
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// is this ship's fire control being scrambled by an enemy jammer?
function isJammed(s) {
  const others = s.team === 'ally' ? foes : allies;
  for (const o of others)
    if (o.alive && o.jamR && dist(o, s) < o.jamR) return true;
  return false;
}

function autoFire(s, dt, forced) {
  const jammed = isJammed(s);
  for (const b of s.blocks) {
    if (b.type !== 'turret' && b.type !== 'rocket' && b.type !== 'laser' && b.type !== 'torp' && b.type !== 'rail' && b.type !== 'pd') continue;
    if (b.type === 'turret' && b.barrels <= 0) continue;
    b.cd -= dt * (jammed ? 0.45 : 1); // jammed fire control = half reload speed
    // point defense: shoots down enemy shells and rockets on approach —
    // it's the only answer to a missile swarm
    if (b.type === 'pd') {
      const p = bw(s, b);
      let bb = null, bd = 230;
      for (const bu of bullets) if (bu.team !== s.team) { const d2 = Math.hypot(bu.x - p.x, bu.y - p.y); if (d2 < bd) { bd = d2; bb = bu; } }
      if (bb) {
        b.aim = Math.atan2(bb.y - p.y, bb.x - p.x);
        if (b.cd <= 0 && s.energy >= 1) {
          b.cd = 0.5; s.energy -= 1;
          bb.ttl = 0;
          explode(bb.x, bb.y, '#8ad4ff', 6);
          particles.push({ x: p.x + Math.cos(b.aim) * 14, y: p.y + Math.sin(b.aim) * 14, vx: rand(-20, 20), vy: rand(-20, 20), ttl: 0.15, max: 0.15, color: '#8ad4ff', r: 4 });
        }
      }
      continue;
    }
    let t = null;
    if (forced && validTarget(forced)) t = targetPoint(forced);
    if (!t) t = s.team === 'ally' ? nearestFoe(s) : nearestAlly(s);
    if (!t) { b.aim = s.angle; continue; }
    const p = bw(s, b);
    b.aim = Math.atan2(t.y - p.y, t.x - p.x); // barrel tracks target
    if (jammed) b.aim += rand(-0.24, 0.24); // jammed targeting wobbles hard
    // firing arc: direct-fire weapons mounted near the edge can't shoot
    // through their own hull — only center mounts get the full circle
    if (b.type === 'turret' || b.type === 'laser' || b.type === 'rail') {
      const outR = Math.hypot(b.dx, b.dy);
      if (outR > CS * 0.6) {
        const outA = s.angle + Math.atan2(b.dy, b.dx);
        if (Math.abs(angDiff(outA, Math.atan2(t.y - p.y, t.x - p.x))) > 2.1) { b.aim = outA; continue; }
      }
    }
    // ammo rack next to the gun = faster feeding
    const feed = s.blocks.some(o => o.type === 'ammo' && Math.hypot(o.dx - b.dx, o.dy - b.dy) <= CS * 1.5) ? 0.7 : 1;
    // laser is a beam, not a bullet: it pours heat into the block under the
    // impact point. Past the melt threshold the metal slumps off as molten
    // drops — armor needs a much longer burn than bare hull
    if (b.type === 'laser') {
      const dd = dist(p, t);
      if (dd > 540 || s.energy <= 0) continue;
      s.energy -= 10 * dt; // beam is a power hog
      const ex = p.x + Math.cos(b.aim) * dd, ey = p.y + Math.sin(b.aim) * dd;
      (s.beams = s.beams || []).push({ x1: p.x, y1: p.y, x2: ex, y2: ey });
      const hitObj = t.blocks ? t : (forced && forced.blocks ? forced : null);
      if (hitObj) {
        let blk = null, bd = 1e9;
        for (const bl of hitObj.blocks) { const bp = bw(hitObj, bl), d2 = Math.hypot(ex - bp.x, ey - bp.y); if (d2 < bd) { bd = d2; blk = bl; } }
        if (blk && bd < CS * 1.4) {
          blk.heat += 950 * dt;
          const pt = blk.type === 'armor' ? 1600 : 750;
          if (blk.heat > pt) {
            blk.meltT = (blk.meltT || 0) + dt;
            if (blk.meltT > 0.16) { blk.meltT = 0; meltPixels(hitObj, blk, ex, ey, 2); }
          }
        }
      } else if (t === station || forced === station) {
        station.coreHp -= 40 * dt;
        if (station.coreHp <= 0 && station.turrets.every(x => !x.alive)) { won = true; explode(station.x, station.y, '#ffffff', 90); }
      }
      if (Math.random() < 0.5) particles.push({ x: ex, y: ey, vx: rand(-60, 60), vy: rand(-60, 60), ttl: 0.3, max: 0.3, color: '#ff5c9a', r: 3 });
      continue;
    }
    // torpedo: slow heavy slug that punches deep — 6s reload, eats 10 energy
    if (b.type === 'torp') {
      if (dist(p, t) > 850 || s.energy < 10) continue;
      s.energy -= 10;
      b.cd = 6;
      bullets.push({ x: p.x, y: p.y, vx: s.vx + Math.cos(b.aim) * 190, vy: s.vy + Math.sin(b.aim) * 190, ttl: 5.5, dmg: 0, team: s.team, splash: 0, torp: true });
      particles.push({ x: p.x + Math.cos(b.aim) * 16, y: p.y + Math.sin(b.aim) * 16, vx: rand(-15, 15), vy: rand(-15, 15), ttl: 0.3, max: 0.3, color: '#ff8a5c', r: 5 });
      continue;
    }
    // railgun: hypersonic slug, outranges everything, bores through hull
    if (b.type === 'rail') {
      if (dist(p, t) > 1200 || s.energy < 8) continue;
      s.energy -= 8;
      b.cd = 2.6 * feed;
      const a = b.aim;
      bullets.push({ x: p.x, y: p.y, vx: s.vx + Math.cos(a) * 1100, vy: s.vy + Math.sin(a) * 1100, ttl: 1.3, dmg: 18, team: s.team, splash: 0, rail: true, pierce: 5 });
      particles.push({ x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18, vx: -Math.cos(a) * 80 + rand(-20, 20), vy: -Math.sin(a) * 80 + rand(-20, 20), ttl: 0.4, max: 0.4, color: '#8ae8ff', r: 6 });
      continue;
    }
    if (b.cd > 0) continue;
    // rocket pods reach farther and burst on a wider circle
    if (b.type === 'rocket') {
      if (dist(p, t) > 900 || s.energy < 5) continue;
      s.energy -= 5;
      const tf = dist(p, t) / 280;
      const ax = t.x + (t.vx || 0) * tf - s.vx * tf;
      const ay = t.y + (t.vy || 0) * tf - s.vy * tf;
      const a = Math.atan2(ay - p.y, ax - p.x);
      b.cd = 2.4 * feed;
      bullets.push({ x: p.x, y: p.y, vx: s.vx + Math.cos(a) * 280, vy: s.vy + Math.sin(a) * 280, ttl: 3.4, dmg: 26, team: s.team, splash: 2, rocket: true });
      particles.push({ x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16, vx: -Math.cos(a) * 50 + rand(-15, 15), vy: -Math.sin(a) * 50 + rand(-15, 15), ttl: 0.35, max: 0.35, color: '#ffb36e', r: 5 });
      continue;
    }
    if (dist(p, t) > 640 || s.energy < 2) continue;
    s.energy -= 2;
    const tf = dist(p, t) / 400; // bullet flight time
    // aim where the target will be, minus our own drift — otherwise orbiting
    // ships throw every shot sideways past the target
    const ax = t.x + (t.vx || 0) * tf - s.vx * tf;
    const ay = t.y + (t.vy || 0) * tf - s.vy * tf;
    b.cd = 0.6 * feed;
    for (let i = 0; i < b.barrels; i++) {
      const a = Math.atan2(ay - p.y, ax - p.x) + (i === 0 ? -0.035 : 0.035) * Math.min(1, b.barrels - 1);
      bullets.push({ x: p.x, y: p.y, vx: s.vx + Math.cos(a) * 400, vy: s.vy + Math.sin(a) * 400, ttl: 2.0, dmg: 11, team: s.team, splash: 0 });
    }
    particles.push({ x: p.x + Math.cos(b.aim) * 14, y: p.y + Math.sin(b.aim) * 14, vx: rand(-20, 20), vy: rand(-20, 20), ttl: 0.12, max: 0.12, color: '#ffd27f', r: 4 });
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

// colored debris chunks — "детальки". Random shapes: single pixels, sticks,
// corners. dirA = ejection direction (outward cone so chunks can't tear off
// INTO their own ship); src = ship it came from, brief no-hit grace
function spawnChunk(x, y, color, n, dirA = null, src = null) {
  const shape = [[0, 0]];
  while (shape.length < n) {
    const [lx, ly] = shape[shape.length - 1];
    const [ox, oy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
    shape.push([lx + ox, ly + oy]);
  }
  const a = dirA === null ? rand(0, TAU) : dirA + rand(-1.1, 1.1);
  const sp = rand(70, 170);
  debris.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: rand(0, TAU), va: rand(-5, 5), shape, color, src, age: 0 });
}

function hitShip(s, b) {
  let blk = null, bd = CS * 0.9, bpos = null;
  for (const bl of s.blocks) {
    const p = bw(s, bl), d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < bd) { bd = d; blk = bl; bpos = p; }
  }
  if (!blk) return;
  b.ttl = 0;

  // torpedo hits like a shaped charge: deep hole in the struck block,
  // shock damage splashing the neighbors
  if (b.torp) {
    explode(b.x, b.y, '#ffd27f', 34);
    for (const bl of s.blocks.slice()) {
      const bp2 = bw(s, bl);
      if (Math.hypot(bp2.x - bpos.x, bp2.y - bpos.y) < CS * 2.2)
        erodeBlock(s, bl, b.x + rand(-6, 6), b.y + rand(-6, 6), bl === blk ? 20 : 8, 2.6);
    }
    return;
  }

  // railgun slug bores a narrow deep hole and keeps flying through the hull
  if (b.rail) {
    explode(b.x, b.y, '#8ae8ff', 10);
    erodeBlock(s, blk, b.x, b.y, 9, 1.1);
    if (--b.pierce <= 0) b.ttl = 0;
    else b.ttl = Math.max(b.ttl, 0.4);
    return;
  }

  erodeBlock(s, blk, b.x, b.y, 5 + Math.floor(rand(0, 5)) + (b.splash || 0) * 7, 1.6 + (b.splash || 0));

  // smart turret damage: chance to shoot the barrel/tower clean off
  if (s.blocks.includes(blk) && blk.type === 'turret' && blk.barrels > 0 && Math.random() < 0.16) {
    blk.barrels--;
    const outA = Math.atan2(bpos.y - s.y, bpos.x - s.x);
    spawnChunk(bpos.x, bpos.y, '#2a3a4a', 4, outA, s); // the barrel itself flies off — outward
    explode(bpos.x, bpos.y, '#7fd4ff', 10);
    if (blk.barrels === 0) blk.pixCount = 1; // turret head gone — block dies
    checkBlockDead(s, blk);
  }
}

// chew pixels out of a block around a world-space point
function erodeBlock(s, blk, wx0, wy0, want, rr = 1.6) {
  // shield soaks the hit first — 4 charge per pixel of bite
  if (s.shield > 0) {
    const soak = Math.min(s.shield, want * 4);
    s.shield -= soak; want -= Math.floor(soak / 4);
    explode(wx0, wy0, '#5ad4ff', 3);
    if (want <= 0) return;
  }
  const bpos = bw(s, blk);
  const c = Math.cos(s.angle), sn = Math.sin(s.angle);
  const lx = (wx0 - bpos.x) * c + (wy0 - bpos.y) * sn;
  const ly = -(wx0 - bpos.x) * sn + (wy0 - bpos.y) * c;
  const px = (lx / CS + 0.5) * BP, py = (ly / CS + 0.5) * BP;
  let removed = 0, tries = 0;
  const dcol = DEBRIS_COL[blk.variant || blk.type] || '#888';
  const outA = Math.atan2(bpos.y - s.y, bpos.x - s.x); // chunks eject OUTWARD, away from ship center
  explode(wx0, wy0, dcol, 4); // impact sparks in the block's own color
  while (removed < want && tries < 50) {
    tries++;
    const ax = Math.floor(px + rand(-rr, rr)), ay = Math.floor(py + rand(-rr, rr));
    if (ax < 0 || ay < 0 || ax >= BP || ay >= BP) continue;
    const i = ay * BP + ax;
    if (!blk.pix[i]) continue;
    blk.pix[i] = 0; blk.pixCount--; removed++;
    const wx = bpos.x + ((ax / BP - 0.5) * CS) * c - ((ay / BP - 0.5) * CS) * sn;
    const wy = bpos.y + ((ax / BP - 0.5) * CS) * sn + ((ay / BP - 0.5) * CS) * c;
    if (removed <= 2 || Math.random() < 0.5)
      spawnChunk(wx, wy, dcol, Math.random() < 0.65 ? 1 : (Math.random() < 0.7 ? 2 : 3), outA + rand(-0.3, 0.3), s);
    else
      particles.push({ x: wx, y: wy, vx: rand(-60, 60), vy: rand(-60, 60), ttl: 0.4, max: 0.4, color: dcol, r: 2.5 });
  }
  checkBlockDead(s, blk);
}

// laser melts instead of chipping: pixels slump off as slow glowing drops
function meltPixels(s, blk, wx0, wy0, want) {
  if (s.shield > 0) {
    const soak = Math.min(s.shield, want * 4);
    s.shield -= soak; want -= Math.floor(soak / 4);
    if (want <= 0) return;
  }
  const bpos = bw(s, blk);
  const c = Math.cos(s.angle), sn = Math.sin(s.angle);
  const lx = (wx0 - bpos.x) * c + (wy0 - bpos.y) * sn;
  const ly = -(wx0 - bpos.x) * sn + (wy0 - bpos.y) * c;
  const px = (lx / CS + 0.5) * BP, py = (ly / CS + 0.5) * BP;
  let removed = 0, tries = 0;
  const hot = ['#ffd27f', '#ff8a3a', '#ff5c2a'];
  while (removed < want && tries < 40) {
    tries++;
    const ax = Math.floor(px + rand(-2, 2)), ay = Math.floor(py + rand(-2, 2));
    if (ax < 0 || ay < 0 || ax >= BP || ay >= BP) continue;
    const i = ay * BP + ax;
    if (!blk.pix[i]) continue;
    blk.pix[i] = 0; blk.pixCount--; removed++;
    const wx = bpos.x + ((ax / BP - 0.5) * CS) * c - ((ay / BP - 0.5) * CS) * sn;
    const wy = bpos.y + ((ax / BP - 0.5) * CS) * sn + ((ay / BP - 0.5) * CS) * c;
    particles.push({ x: wx, y: wy, vx: rand(-25, 25), vy: rand(-25, 25), ttl: rand(0.5, 1.0), max: 1.0, color: hot[Math.floor(Math.random() * 3)], r: 2.5 });
  }
  checkBlockDead(s, blk);
}

function checkBlockDead(s, blk) {
  if (blk.pixCount > Math.floor(BP * BP * 0.2)) return;
  const bpos = bw(s, blk);
  s.blocks = s.blocks.filter(x => x !== blk);
  explode(bpos.x, bpos.y, s.color, 14);
  // the block's remains tear off as chunks — yours included, always outward
  const dcol = DEBRIS_COL[blk.variant || blk.type] || '#888';
  const outA = Math.atan2(bpos.y - s.y, bpos.x - s.x);
  for (let k = 0; k < 3; k++) spawnChunk(bpos.x + rand(-8, 8), bpos.y + rand(-8, 8), dcol, 2 + Math.floor(rand(0, 3)), outA + rand(-0.4, 0.4), s);
  if (blk.type === 'ammo') ammoBlast(s, bpos); // magazine goes up — chain cooking is real
  if (blk.type === 'rctr') ammoBlast(s, bpos, 3.4, 9); // reactor breach is worse
  splitCheck(s);
  recount(s);
  if (!s.blocks.length) { s.alive = false; selection.delete(s); explode(s.x, s.y, s.color, 50); if (s.team === 'foe' && !s.wreck) foesDown++; }
}

const pendingWrecks = [];

// mines: dispenser racks drop proximity charges (M key) — indiscriminate
// blast, arms after a second so you can't suicide-drop it on your own hull
function dropMine(s) {
  const b = s.blocks.find(x => x.type === 'mines' && (x.charges || 0) > 0);
  if (!b) return;
  b.charges--;
  mines.push({ x: s.x, y: s.y, vx: s.vx * 0.2, vy: s.vy * 0.2, team: s.team, arm: 1.0, ttl: 90 });
  msg = { text: `MINE OUT — ${b.charges} LEFT`, t: 1.2 };
}

// decoy flare: a one-block fake that screams on every enemy scope —
// pirates burn their volleys on it while you flank
function launchDecoy(s) {
  const b = s.blocks.find(x => x.type === 'decoy' && (x.charges || 0) > 0);
  if (!b) return;
  b.charges--;
  const dc = makeShip([{ dx: 0, dy: 0, t: 'hull' }], s.x - Math.cos(s.angle) * (s.radius + 30), s.y - Math.sin(s.angle) * (s.radius + 30), 'ally', '#8ae8ff');
  dc.isDecoy = true;
  dc.vx = s.vx * 0.5 - Math.cos(s.angle) * 70;
  dc.vy = s.vy * 0.5 - Math.sin(s.angle) * 70;
  dc.va = rand(-1.5, 1.5);
  dc.order = null;
  allies.push(dc);
  msg = { text: `DECOY FLARE OUT — ${b.charges} LEFT`, t: 1.4 };
}

function mineBlast(m) {
  explode(m.x, m.y, '#ff6a4a', 44);
  for (const sh of [...allies, ...foes]) {
    if (!sh.alive) continue;
    for (const bl of sh.blocks.slice()) {
      const bp = bw(sh, bl);
      if (Math.hypot(bp.x - m.x, bp.y - m.y) < CS * 2.6)
        erodeBlock(sh, bl, bp.x + rand(-8, 8), bp.y + rand(-8, 8), 6);
    }
  }
}

// a breached magazine cooks off — pixels chewed out of everything close,
// including your own hull. Keep ammo behind armor or don't mount it
function ammoBlast(s, pos, rr = 2.2, want = 4) {
  explode(pos.x, pos.y, '#ffd27f', 44);
  for (const sh of [...allies, ...foes]) {
    if (!sh.alive) continue;
    for (const bl of sh.blocks.slice()) {
      const bp = bw(sh, bl);
      if (Math.hypot(bp.x - pos.x, bp.y - pos.y) < CS * rr)
        erodeBlock(sh, bl, bp.x + rand(-6, 6), bp.y + rand(-6, 6), want);
    }
  }
}

// structural integrity: blocks only exist while welded to the hull. Cut the
// middle out and the severed piece drifts off as its own wreck — guns still
// hot, no orders, free salvage for whoever survives
function splitCheck(s) {
  if (s.blocks.length < 2) return;
  const seen = new Set(), comps = [];
  for (const seed of s.blocks) {
    if (seen.has(seed)) continue;
    const comp = [seed]; seen.add(seed);
    for (let i = 0; i < comp.length; i++) {
      const b = comp[i];
      for (const o of s.blocks) {
        if (!seen.has(o) && Math.hypot(o.dx - b.dx, o.dy - b.dy) <= CS * 1.5) { seen.add(o); comp.push(o); }
      }
    }
    comps.push(comp);
  }
  if (comps.length < 2) return;
  comps.sort((a, b) => b.length - a.length);
  let keep = comps[0];
  for (const c of comps) if (c.includes(s.blocks[0])) { keep = c; break; }
  for (const comp of comps) {
    if (comp === keep) continue;
    let cx = 0, cy = 0;
    for (const b of comp) { cx += b.dx; cy += b.dy; }
    cx /= comp.length; cy /= comp.length;
    const c = Math.cos(s.angle), sn = Math.sin(s.angle);
    const w = {
      x: s.x + cx * c - cy * sn, y: s.y + cx * sn + cy * c,
      vx: s.vx, vy: s.vy, angle: s.angle, va: s.va,
      blocks: comp.map(b => ({ ...b, dx: b.dx - cx, dy: b.dy - cy })),
      team: s.team, color: s.color,
      thrust: 0, turn: 0, radius: 0, alive: true,
      order: null, thrusting: false, orb: s.orb, wreck: true
    };
    recount(w);
    w.radius = Math.max(...w.blocks.map(b => Math.hypot(b.dx, b.dy))) + CS * 0.7;
    const ka = Math.atan2(w.y - s.y, w.x - s.x);
    w.vx += Math.cos(ka) * 60; w.vy += Math.sin(ka) * 60; // visibly tear away
    w.va += rand(-1.5, 1.5);
    pendingWrecks.push(w);
    explode(w.x, w.y, s.color, 12);
  }
  s.blocks = s.blocks.filter(b => keep.includes(b));
  s.radius = Math.max(...s.blocks.map(b => Math.hypot(b.dx, b.dy))) + CS * 0.7;
  if (s.team === 'ally') msg = { text: 'HULL SEVERED — SECTION ADRIFT', t: 2.5 };
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
        // twin nozzles = twin flames, one at each exhaust port
        for (const off of [-CS * 0.34, CS * 0.34]) {
          const p = bw(s, b);
          const ex = p.x - Math.cos(s.angle) * CS * 0.7 - Math.sin(s.angle) * off;
          const ey = p.y - Math.sin(s.angle) * CS * 0.7 + Math.cos(s.angle) * off;
          particles.push({ x: ex, y: ey, vx: -Math.cos(s.angle) * 60 + rand(-15, 15), vy: -Math.sin(s.angle) * 60 + rand(-15, 15), ttl: 0.3, max: 0.3, color: '#ff9d5c', r: 3 });
        }
      }
    s.beams = null; s.tracBeam = null;
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
    f.beams = null; f.tracBeam = null;
    autoFire(f, dt, null);
  }

  // tractor beams: latch onto the nearest enemy hull and drag it in —
  // boarding range, mine delivery, or just bullying a lighter ship
  for (const s of [...allies, ...foes]) {
    if (!s.alive || !s.tracN || s.energy < 6) continue;
    const others = s.team === 'ally' ? foes : allies;
    let bt = null, bd = 300;
    for (const o of others) if (o.alive && !o.isBase) { const d = dist(s, o); if (d < bd) { bd = d; bt = o; } }
    if (!bt) continue;
    s.energy -= 6 * dt;
    const d = dist(s, bt) || 1, pull = 110 * s.tracN;
    bt.vx += (s.x - bt.x) / d * pull * dt;
    bt.vy += (s.y - bt.y) / d * pull * dt;
    s.vx -= (s.x - bt.x) / d * pull * 0.4 * dt; // newton says the tug heaves too
    s.vy -= (s.y - bt.y) / d * pull * 0.4 * dt;
    s.tracBeam = { x: bt.x, y: bt.y };
  }

  // reinforcements when the shield ring falls
  if (mission === 'station' && !reinforced && station.turrets.every(t => !t.alive)) {
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
      for (let i = 0; i < t.barrels; i++) {
        const a = Math.atan2(tgt.y + tgt.vy * lead - pos.y, tgt.x + tgt.vx * lead - pos.x) + (i === 0 ? -0.04 : 0.04);
        bullets.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, ttl: 2.6, dmg: 13, team: 'foe', splash: 0 });
      }
    }
  }

  // asteroids drift; roamers keep flying in; ships take pixel damage on impact
  roamerT -= dt;
  if (roamerT <= 0) { roamerT = rand(9, 18); spawnRoamer(); }
  for (const a of asteroids) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.va * dt;
    if (a.roamer && (a.x < -1400 || a.x > 3400 || a.y < -1500 || a.y > 1500)) { a.dead = true; continue; }
    for (const s of [...allies, ...foes]) {
      if (!s.alive) continue;
      const d = dist(a, s), rr = a.r + s.radius * 0.7;
      if (d < rr && d > 0) {
        const nx = (s.x - a.x) / d, ny = (s.y - a.y) / d;
        const relV = Math.hypot(s.vx - a.vx, s.vy - a.vy);
        const closing = Math.max(0, -((s.vx - a.vx) * nx + (s.vy - a.vy) * ny));
        s.x = a.x + nx * rr; s.y = a.y + ny * rr;
        s.vx += nx * closing * 0.9; s.vy += ny * closing * 0.9;
        // rock hits hull: mass * impact speed -> pixel damage on the struck blocks
        if (relV > 50 && !a.cool) {
          a.cool = 0.3;
          const hits = Math.min(3, 1 + Math.floor((relV - 50) / 90) + Math.floor(a.r / 40));
          for (let k = 0; k < hits; k++) {
            let blk = null, bd = 1e9;
            for (const bl of s.blocks) { const p = bw(s, bl), dd = Math.hypot(a.x - p.x, a.y - p.y); if (dd < bd) { bd = dd; blk = bl; } }
            if (blk) erodeBlock(s, blk, a.x + rand(-10, 10), a.y + rand(-10, 10), 2 + Math.floor(rand(0, 3)));
          }
          explode(a.x, a.y, '#8a8f9a', 8);
          if (s === allies[0] || allies.includes(s)) msg = { text: 'ASTEROID IMPACT', t: 1.5 };
        }
      }
    }
    if (a.cool) a.cool -= dt;
  }
  asteroids = asteroids.filter(a => !a.dead);

  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt;
    if (b.ttl <= 0) continue;
    // bullets smack into asteroids — they work as cover and as minable rocks
    let hitRock = false;
    for (const a of asteroids) {
      if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
        a.hp -= b.dmg; b.ttl = 0; hitRock = true;
        explode(b.x, b.y, '#8a8f9a', 4);
        // visible crater on the rock + a stone chip flies off
        const ia = Math.atan2(b.y - a.y, b.x - a.x) - a.rot;
        a.dmg.push({ x: Math.cos(ia) * rand(0.2, 0.7) * a.r, y: Math.sin(ia) * rand(0.2, 0.7) * a.r, r: rand(3, 7) });
        if (Math.random() < 0.5) spawnChunk(b.x, b.y, '#5a6170', 1);
        if (a.hp <= 0) {
          a.dead = true; explode(a.x, a.y, '#8a8f9a', 30);
          mined += Math.round(a.r / 8); // shooting rocks apart is mining too
          for (let k = 0; k < 4; k++) spawnChunk(a.x + rand(-14, 14), a.y + rand(-14, 14), '#5a6170', 2 + Math.floor(rand(0, 3)));
        }
        break;
      }
    }
    if (hitRock) continue;
    if (b.team === 'foe') {
      for (const s of allies) if (s.alive && dist(b, s) < s.radius + 20) hitShip(s, b);
    } else {
      for (const f of foes) if (f.alive && dist(b, f) < f.radius + 20) hitShip(f, b);
      for (const t of station.turrets) {
        if (!t.alive) continue;
        const p = turretPos(t);
        if (Math.hypot(b.x - p.x, b.y - p.y) < 18) {
          t.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ffd27f', 6);
          if (t.barrels > 0 && Math.random() < 0.12) { // barrel shot off
            t.barrels--;
            spawnChunk(p.x, p.y, '#3a2a30', 4);
            if (t.barrels === 0) { t.alive = false; explode(p.x, p.y, '#ff8a7a', 30); }
          }
          if (t.alive && t.hp <= 0) { t.alive = false; explode(p.x, p.y, '#ff8a7a', 30); }
        }
      }
      for (const pod of pods) {
        if (pod.hp > 0 && Math.hypot(b.x - pod.x, b.y - pod.y) < 16) {
          pod.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ffcf6e', 5);
          if (pod.hp <= 0) {
            pod.dead = true; explode(pod.x, pod.y, '#ffcf6e', 30);
            for (let k = 0; k < 6; k++) spawnChunk(pod.x + rand(-14, 14), pod.y + rand(-14, 14), Math.random() < 0.5 ? '#ffcf6e' : '#5a6f8f', 2);
          }
        }
      }
      if (station.turrets.every(t => !t.alive) && station.coreHp > 0 && Math.hypot(b.x - station.x, b.y - station.y) < station.r) {
        station.coreHp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#c8a2ff', 8);
        if (station.coreHp <= 0) { won = true; explode(station.x, station.y, '#ffffff', 90); }
      }
    }
  }
  bullets = bullets.filter(b => b.ttl > 0);
  asteroids = asteroids.filter(a => !a.dead);
  pods = pods.filter(p => !p.dead);

  // attack waves while the station lives — pressure to keep pushing
  if (!won && station.coreHp > 0) {
    waveT -= dt;
    if (waveT <= 0 && foes.filter(f => f.alive).length < 6) {
      waveT = 50;
      const w = makeShip(gridFromList([[4,3,'engine'],[4,4,'hull'],[4,5,'turret'],[5,4,'hull']]), station.x + rand(-160, 160), station.y + rand(-260, 260), 'foe', '#ff8a7a');
      w.role = 'interceptor';
      foes.push(w);
      msg = { text: 'HOSTILE LAUNCHED FROM STATION', t: 3 };
    }
  }

  // belt sweep: hunters keep dropping in until the quota is cleared
  if (mission === 'belt' && !won) {
    waveT -= dt;
    if (waveT <= 0 && foes.filter(f => f.alive).length < 5 + Math.min(3, threat()) && foesDown < beltGoal) {
      waveT = 7;
      spawnBeltFoe();
      msg = { text: `HOSTILE INBOUND — ${foesDown}/${beltGoal} DOWN`, t: 2.5 };
    }
    if (foesDown >= beltGoal) won = true;
  }
  // elite hunt: contract is done when the flagship dies — or gets boarded
  if (mission === 'hunt' && !won && elite && (!elite.alive || elite.team === 'ally')) won = true;
  // convoy: hauler crawls to the far edge while pirates keep dropping in
  if (mission === 'convoy' && !won && !haulerLost) {
    if (hauler && !hauler.alive) {
      haulerLost = true; dead = true;
      msg = { text: 'CONVOY DESTROYED — CONTRACT FAILED', t: 5 };
    } else if (hauler && hauler.x > 2450) {
      won = true;
    } else {
      waveT -= dt;
      const alive = foes.filter(f => f.alive && !f.wreck).length;
      if (waveT <= 0 && alive < 4 + threat()) {
        waveT = 13;
        for (let k = 0; k < 2; k++) {
          const a = rand(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI);
          const f = makeShip(gridFromList(factionDesign()),
            hauler.x + Math.cos(a) * rand(700, 1000), hauler.y + Math.sin(a) * rand(700, 1000), 'foe', missionFaction.color);
          f.role = 'interceptor';
          foes.push(f);
        }
        msg = { text: `${missionFaction.name} RAIDERS — COVER THE HAULER`, t: 2.5 };
      }
    }
  }

  // salvage run: tractored hulks dissolve into scrap inside the beacon ring
  if (mission === 'tow' && !won) {
    for (const f of foes) {
      if (!f.alive || !f.hulk) continue;
      if (Math.hypot(f.x + 500, f.y - 200) < 160) {
        f.alive = false; towGot++;
        explode(f.x, f.y, '#4affe0', 30);
        msg = { text: `HULK RECOVERED ${towGot}/3`, t: 3 };
      }
    }
    if (towGot >= 3) won = true;
    waveT -= dt;
    const alive = foes.filter(f => f.alive && !f.hulk && !f.wreck).length;
    if (waveT <= 0 && alive < 3) {
      waveT = 22;
      const a = rand(0, TAU);
      const f = makeShip(gridFromList(factionDesign()),
        600 + Math.cos(a) * 900, Math.sin(a) * 900, 'foe', missionFaction.color);
      f.role = 'interceptor';
      foes.push(f);
      msg = { text: `${missionFaction.name} SCAVENGER INBOUND`, t: 2.5 };
    }
  }

  // test range: every dummy scrapped or husked (wrecks don't count)
  if (mission === 'test' && !won && foes.every(f => !f.alive || f.wreck)) won = true;

  // base defense: three waves at your installation — lose the base, lose a building
  if (mission === 'defense' && !won && !baseLost) {
    if (baseShip && !baseShip.alive) {
      baseLost = true; dead = true;
      const idxs = (profile.base || []).map((b, i) => b ? i : -1).filter(i => i >= 0);
      if (idxs.length) {
        const i = idxs[Math.floor(Math.random() * idxs.length)];
        profile.base[i].lvl--;
        if (profile.base[i].lvl <= 0) profile.base[i] = null;
        refreshLvl();
      }
      saveProfile();
      msg = { text: 'BASE OVERRUN — A BUILDING WAS DAMAGED', t: 5 };
    } else {
      const alive = foes.filter(f => f.alive && !f.wreck).length;
      if (!alive && defWave < 3) {
        defWave++;
        for (let k = 0; k < defWave + 1 + Math.floor(threat() / 2); k++) {
          const a = rand(-0.9, 0.9);
          const f = makeShip(gridFromList(factionDesign()),
            baseShip.x + Math.cos(a) * rand(900, 1300), baseShip.y + Math.sin(a) * rand(900, 1300), 'foe', missionFaction.color);
          f.role = 'interceptor';
          foes.push(f);
        }
        msg = { text: `${missionFaction.name} — WAVE ${defWave}/3`, t: 2.5 };
      }
      if (defWave >= 3 && !alive) won = true;
    }
  }

  // contract payout — banked once, straight into the profile
  if (won && !banked && (mission === 'belt' || mission === 'hunt' || mission === 'defense' || mission === 'convoy' || mission === 'tow')) {
    banked = true;
    const reward = mission === 'belt' ? { scrap: 60, ore: 15 }
      : mission === 'defense' ? { scrap: 50, ore: 20 }
      : mission === 'convoy' ? { scrap: 80, ore: 10 }
      : mission === 'tow' ? { scrap: 70, ore: 15 }
      : { scrap: 140, ore: 30 };
    profile.scrap = (profile.scrap || 0) + reward.scrap;
    profile.ore = (profile.ore || 0) + reward.ore + mined;
    // campaign progress: first clear of each contract counts toward the board
    profile.done = profile.done || {};
    const first = !profile.done[mission];
    profile.done[mission] = true;
    msg = { text: `CONTRACT PAID: +${reward.scrap} SCRAP  +${reward.ore + mined} ORE`, t: 5 };
    if (first && threat() >= CAMPAIGN_KEYS.length && !profile.campaignDone) {
      profile.campaignDone = true;
      profile.scrap += 200; profile.ore += 60; profile.lvl = (profile.lvl || 1) + 2;
      msg = { text: 'CAMPAIGN COMPLETE — +200 SCRAP +60 ORE +2 BASE LV', t: 6 };
    }
    saveProfile();
  }

  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.ttl -= dt; }
  particles = particles.filter(p => p.ttl > 0);

  // debris is not loot — it is SHRAPNEL. It stays forever and eats hull,
  // but bites small: only a real speed difference makes it dangerous.
  // Exception: a ship carrying CARGO blocks runs a collector arm — it picks
  // up drifting chunks at close range and banks them as salvage.
  for (const d of debris) {
    d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.va * dt; d.age += dt;
    d.vx *= (1 - 0.15 * dt); d.vy *= (1 - 0.15 * dt);
    for (const s of [...allies, ...foes]) {
      if (!s.alive) continue;
      if (d.src === s && d.age < 0.8) continue; // just-birthed chunk ignores its parent
      const relV = Math.hypot(s.vx - d.vx, s.vy - d.vy);
      // collector arm: cargo haulers vacuum debris — slowly, one chunk at a time
      if (s.team === 'ally' && s.cargo && relV < 60 && dist(s, d) < s.radius * 0.9) {
        d.dead = true;
        salvage += 0.2;
        particles.push({ x: d.x, y: d.y, vx: (s.x - d.x) * 3, vy: (s.y - d.y) * 3, ttl: 0.3, max: 0.3, color: '#9dff8a', r: 3 });
        continue;
      }
      if (dist(s, d) < s.radius * 0.8 && relV > 80) {
        let blk = null, bd = 1e9;
        for (const bl of s.blocks) { const p = bw(s, bl), dd = Math.hypot(d.x - p.x, d.y - p.y); if (dd < bd) { bd = dd; blk = bl; } }
        if (blk) {
          erodeBlock(s, blk, d.x, d.y, relV > 260 ? 2 : 1); // small bite — fast rams bite harder
          const kn = Math.atan2(d.y - s.y, d.x - s.x);
          d.vx = Math.cos(kn) * relV * 0.8; d.vy = Math.sin(kn) * relV * 0.8;
          d.src = s; d.age = 0; // ricochet can't instantly re-hit the same hull
          explode(d.x, d.y, d.color, 5);
        }
      }
    }
  }
  debris = debris.filter(d => !d.dead);
  if (debris.length > 420) debris.splice(0, debris.length - 420); // perf cap

  // dead in the water: a ship with no engines left bleeds off speed and stalls
  for (const s of [...allies, ...foes]) {
    if (!s.alive || s.blocks.some(b => b.type === 'engine')) continue;
    s.vx *= (1 - 1.4 * dt); s.vy *= (1 - 1.4 * dt); s.va *= (1 - 2 * dt);
    s.thrusting = false;
  }

  // heated blocks cool down — hold the beam on target or the metal re-freezes
  for (const s of [...allies, ...foes])
    for (const b of s.blocks) if (b.heat > 0) b.heat = Math.max(0, b.heat - 140 * dt);

  // energy trickles back from the cells
  for (const s of [...allies, ...foes])
    if (s.alive && s.energy < s.emax) s.energy = Math.min(s.emax, s.energy + s.eregen * dt);

  // shield bubble recharges
  for (const s of [...allies, ...foes])
    if (s.alive && s.shield < s.shieldMax) s.shield = Math.min(s.shieldMax, s.shield + s.shieldRegen * dt);

  // breached compartments vent atmosphere — every hole is a tiny thruster
  // that shoves the hull and spins it until the air runs out
  for (const s of [...allies, ...foes]) {
    if (!s.alive || s.air <= 0) continue;
    for (const b of s.blocks) {
      if (b.pixCount >= BP * BP * 0.6) continue; // only a real breach vents
      s.air -= 6 * dt;
      const p = bw(s, b);
      const d = Math.hypot(s.x - p.x, s.y - p.y) || 1;
      const dx = (s.x - p.x) / d, dy = (s.y - p.y) / d; // gas out → hull recoils away from the hole
      const acc = 90 / s.mass;
      s.vx += dx * acc * dt; s.vy += dy * acc * dt;
      s.va += ((p.x - s.x) * dy - (p.y - s.y) * dx) * acc * 0.015 * dt;
      if (Math.random() < dt * 8)
        particles.push({ x: p.x, y: p.y, vx: -dx * rand(50, 110), vy: -dy * rand(50, 110), ttl: 0.6, max: 0.6, color: '#cfe8ff', r: 2 });
      if (s === allies[0] && !s.vented) { s.vented = true; msg = { text: 'HULL BREACH — VENTING ATMOSPHERE', t: 3 }; }
    }
  }

  // repair drones weld dead pixels back — slow, most damaged block first
  for (const s of [...allies, ...foes]) {
    if (!s.alive) continue;
    for (const b of s.blocks) if (b.type === 'repair') {
      b.cd = (b.cd || 0) - dt;
      if (b.cd > 0) continue;
      let tgt = null, worst = BP * BP;
      for (const o of s.blocks) if (o.pixCount < worst) { worst = o.pixCount; tgt = o; }
      if (tgt) {
        const deadPx = [];
        for (let i = 0; i < BP * BP; i++) if (!tgt.pix[i]) deadPx.push(i);
        const i = deadPx[Math.floor(Math.random() * deadPx.length)];
        tgt.pix[i] = 1; tgt.pixCount++;
        b.cd = 0.9;
        const bp = bw(s, tgt);
        particles.push({ x: bp.x + rand(-8, 8), y: bp.y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-30, 30), ttl: 0.3, max: 0.3, color: '#5affc0', r: 2.5 });
      }
    }
  }

  // mines drift, arm, and pop anything of the wrong team in the bubble
  for (const m of mines) {
    m.x += m.vx * dt; m.y += m.vy * dt; m.arm -= dt; m.ttl -= dt;
    if (m.ttl <= 0) { m.dead = true; continue; }
    if (m.arm > 0) continue;
    for (const s of (m.team === 'ally' ? foes : allies)) {
      if (s.alive && dist(m, s) < s.radius + 30) { mineBlast(m); m.dead = true; break; }
    }
  }
  mines = mines.filter(m => !m.dead);

  if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }

  // boarding: a MARINE bay grapples any engine-dead foe in reach — 2.5s of
  // cutting through the hatch and the prize is yours. The bay empties out:
  // marines now live on the captured hull
  for (const s of allies) {
    if (!s.alive || !s.blocks.some(b => b.type === 'marine')) continue;
    for (const f of foes) {
      if (!f.alive || f.blocks.some(b => b.type === 'engine')) { f.boardT = 0; continue; }
      if (dist(s, f) > s.radius + f.radius + 40) { f.boardT = 0; continue; }
      f.boardT = (f.boardT || 0) + dt;
      if (Math.random() < 0.3)
        particles.push({ x: (s.x + f.x) / 2 + rand(-12, 12), y: (s.y + f.y) / 2 + rand(-12, 12), vx: rand(-20, 20), vy: rand(-20, 20), ttl: 0.3, max: 0.3, color: '#5affa0', r: 2.5 });
      if (f.boardT > 2.5) {
        const mb = s.blocks.find(b => b.type === 'marine');
        s.blocks = s.blocks.filter(b => b !== mb);
        const mp = bw(s, mb); explode(mp.x, mp.y, '#5affa0', 14);
        recount(s); splitCheck(s);
        f.team = 'ally'; f.role = null; f.boardT = 0;
        f.order = { kind: 'follow', t: allies[0], slot: allies.length };
        pendingWrecks.push(f);
        foes = foes.filter(x => x !== f);
        msg = { text: 'SHIP CAPTURED — MARINES ABOARD', t: 3 };
        break;
      }
    }
  }

  // severed sections join the battle as drifting wrecks
  if (pendingWrecks.length) {
    for (const w of pendingWrecks) (w.team === 'ally' ? allies : foes).push(w);
    pendingWrecks.length = 0;
  }

  if (!allies.some(s => s.alive)) dead = true;
  else if (!allies[0].alive) dead = true; // flagship lost = mission failed
}

// ---------- menu / base ----------
const menuRects = []; // [{r, fn}]
const baseRects = [];

function menuClick(mx, my) {
  for (const m of menuRects) if (inRect(m.r, mx, my)) { m.fn(); return; }
}

function baseClick(mx, my) {
  for (const m of baseRects) if (inRect(m.r, mx, my)) { m.fn(); return; }
}

function loginSteam() {
  profile = accounts.find(a => a.steam) ||
    { name: 'STEAM-PILOT', lvl: 1, scrap: 0, ore: 0, fuel: 0, steam: true };
  loadProfileDesign();
  saveProfile();
  mode = 'base';
}

function drawMenu() {
  ctx.fillStyle = '#04070f'; ctx.fillRect(0, 0, W, H);
  menuRects.length = 0;
  const cx = W / 2;
  // title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 42px monospace';
  ctx.fillText('VOID SALVAGE', cx, H * 0.2);
  ctx.fillStyle = '#5a6a8a'; ctx.font = '14px monospace';
  ctx.fillText(T('m_tag'), cx, H * 0.2 + 32);

  const btn = (y, w, h, label, accent, fn) => {
    const r = { x: cx - w / 2, y, w, h };
    menuRects.push({ r, fn });
    ctx.fillStyle = '#0b1220'; ctx.fillRect(r.x, r.y, w, h);
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, w, h);
    ctx.fillStyle = accent; ctx.font = 'bold 16px monospace';
    ctx.fillText(label, cx, y + h / 2 + 6);
    return r;
  };

  let y = H * 0.34;
  btn(y, 320, 52, T('m_steam'), '#7fd4ff', loginSteam); y += 68;
  btn(y, 320, 44, T('m_new'), '#9dff8a', () => {
    profile = { name: 'CMDR-' + Math.floor(rand(1000, 9999)), lvl: 1, scrap: 0, ore: 0, fuel: 0 };
    design = starterDesign();
    saveProfile();
    mode = 'base';
  });
  y += 70;

  // saved accounts
  const saved = accounts.filter(a => !a.steam);
  if (saved.length) {
    ctx.fillStyle = '#8aa0c8'; ctx.font = 'bold 14px monospace';
    ctx.fillText(T('m_saved'), cx, y); y += 14;
    for (const a of saved.slice(0, 4)) {
      y += 10;
      btn(y, 320, 40, `${a.name}   ·   ${T('m_lvl')} ${a.lvl}`, '#8aa0c8', () => { profile = a; loadProfileDesign(); mode = 'base'; });
      y += 50;
    }
  }

  // settings
  y += 16;
  ctx.fillStyle = '#8aa0c8'; ctx.font = 'bold 14px monospace';
  ctx.fillText(T('m_settings'), cx, y); y += 16;
  for (const k of ['fx', 'stars', 'grid']) {
    const on = SET[k];
    btn(y, 200, 34, `${k.toUpperCase()}  ${on ? T('m_on') : T('m_off')}`, on ? '#9dff8a' : '#5a6a8a', () => { SET[k] = !SET[k]; saveSettings(); });
    y += 44;
  }
  btn(y, 200, 34, `${T('m_lang')}  ${(SET.lang || 'en').toUpperCase()}`, '#ffcf6e', () => { SET.lang = SET.lang === 'ru' ? 'en' : 'ru'; saveSettings(); });
  ctx.textAlign = 'left';
}

function drawBase() {
  ctx.fillStyle = '#04070f'; ctx.fillRect(0, 0, W, H);
  baseRects.length = 0;
  profile.base = profile.base || Array(12).fill(null);
  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 30px monospace';
  ctx.fillText(T('b_title'), cx, H * 0.10);
  ctx.fillStyle = '#ffcf6e'; ctx.font = 'bold 18px monospace';
  ctx.fillText(`${T('b_lvl')} ${profile?.lvl ?? 1}`, cx, H * 0.10 + 34);
  const prod = { ore: 0, scrap: 0 };
  for (const b of profile.base) if (b && BUILDINGS[b.t].rate) prod[BUILDINGS[b.t].res] += BUILDINGS[b.t].rate * b.lvl;
  ctx.fillStyle = '#8aa0c8'; ctx.font = '14px monospace';
  ctx.fillText(`${T('scrap')} ${Math.floor(profile?.scrap ?? 0) + Math.floor(salvage)}   ${T('ore')} ${Math.floor(profile?.ore ?? 0)}   ${T('fuel')} ${profile?.fuel ?? 0}   —   +${prod.scrap} +${prod.ore} ${T('b_per_min')}`, cx, H * 0.10 + 60);
  ctx.fillText(`${T('b_budget')}: ${budget()}`, cx, H * 0.10 + 82);

  // ---- left column: command ----
  const lx = W * 0.5 - 540, lw = 430;
  let y = H * 0.24;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8aa0c8'; ctx.font = 'bold 15px monospace';
  ctx.fillText(T('b_cmd'), lx, y); y += 12;
  const lbtn = (label, accent, h, fn, sub) => {
    const r = { x: lx, y, w: lw, h };
    baseRects.push({ r, fn });
    ctx.fillStyle = '#0b1220'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = accent; ctx.font = 'bold 15px monospace';
    ctx.fillText(label, r.x + 16, r.y + (sub ? 20 : h / 2 + 5));
    if (sub) { ctx.fillStyle = '#5a6a8a'; ctx.font = '12px monospace'; ctx.fillText(sub, r.x + 16, r.y + 40); }
    y += h + 10;
  };
  lbtn(T('b_shipyard'), '#9dff8a', 46, () => { mode = 'editor'; });
  y += 8;
  ctx.fillStyle = '#8aa0c8'; ctx.font = 'bold 15px monospace';
  ctx.fillText(`${T('b_contracts')} ${threat()}/${CAMPAIGN_KEYS.length}`, lx, y); y += 10;
  for (const k of Object.keys(CONTRACTS)) {
    const c = CONTRACTS[k];
    if (c.hidden) continue;
    const sel = mission === k;
    const done = !!(profile.done || {})[k];
    const r = { x: lx, y, w: lw, h: 54 };
    baseRects.push({ r, fn: () => { mission = k; mode = 'editor'; } });
    ctx.fillStyle = sel ? '#141c2e' : '#0b1220';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = sel ? c.accent : '#1a2438'; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = c.accent; ctx.font = 'bold 13px monospace';
    ctx.fillText(`${T('c_' + k) !== 'c_' + k ? T('c_' + k) : c.name}${sel ? '  — ' + T('b_active') : ''}`, r.x + 16, y + 20);
    if (done) {
      ctx.fillStyle = '#9dff8a'; ctx.textAlign = 'right';
      ctx.fillText(T('b_cleared'), r.x + r.w - 14, y + 20);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#5a6a8a'; ctx.font = '11px monospace';
    ctx.fillText(T('d_' + k) !== 'd_' + k ? T('d_' + k) : c.desc, r.x + 16, y + 38);
    y += 62;
  }
  // pirates picked up your base on their scopes — fight or lose a building
  if (raidWarn) {
    const r = { x: lx, y, w: lw, h: 54 };
    baseRects.push({ r, fn: () => {
      raidWarn = false; mission = 'defense';
      if (canLaunch().ok) launch(); else mode = 'editor';
    } });
    const pulse = 0.55 + 0.35 * Math.sin(performance.now() / 160);
    ctx.fillStyle = `rgba(60,10,10,${pulse})`; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#ff8a7a'; ctx.font = 'bold 15px monospace';
    ctx.fillText(T('b_raid'), r.x + 16, y + 22);
    ctx.fillStyle = '#c8a09a'; ctx.font = '11px monospace';
    ctx.fillText(T('b_raid_sub'), r.x + 16, y + 40);
    y += 64;
  }
  lbtn(T('b_menu'), '#5a6a8a', 44, () => { mode = 'menu'; });

  // ---- right column: the base itself, 12 build slots ----
  const gx = W * 0.5 - 20, gy = H * 0.24, cw = 118, ch = 92, gap = 10;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8aa0c8'; ctx.font = 'bold 15px monospace';
  ctx.fillText(T('b_grid'), gx, gy - 14);
  for (let i = 0; i < 12; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const r = { x: gx + col * (cw + gap), y: gy + row * (ch + gap), w: cw, h: ch };
    const b = profile.base[i], sel = baseSlot === i;
    baseRects.push({ r, fn: () => { baseSlot = i; } });
    if (b) {
      const spec = BUILDINGS[b.t];
      ctx.fillStyle = '#101a2c'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = sel ? spec.accent : spec.accent + '55'; ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = spec.accent; ctx.font = 'bold 12px monospace';
      ctx.fillText(spec.name, r.x + 10, r.y + 22);
      ctx.fillStyle = '#8aa0c8'; ctx.font = '11px monospace';
      ctx.fillText(`LV ${b.lvl}`, r.x + 10, r.y + 42);
      ctx.fillStyle = '#5a6a8a';
      ctx.fillText(spec.rate ? `+${spec.rate * b.lvl}/min` : spec.desc, r.x + 10, r.y + 60);
    } else {
      ctx.strokeStyle = sel ? '#7fd4ff' : '#2a3a55';
      ctx.setLineDash([5, 5]); ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); ctx.setLineDash([]);
      ctx.fillStyle = sel ? '#7fd4ff' : '#2a3a55'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
      ctx.fillText('+', r.x + r.w / 2, r.y + r.h / 2 + 8); ctx.textAlign = 'left';
    }
  }

  // build / upgrade picker under the grid
  if (baseSlot >= 0) {
    const b = profile.base[baseSlot];
    const py = gy + 3 * (ch + gap) + 12;
    if (!b) {
      ctx.fillStyle = '#8aa0c8'; ctx.font = 'bold 13px monospace';
      ctx.fillText(T('b_construct'), gx, py - 4);
      let bx = gx, bi = 0;
      for (const k of Object.keys(BUILDINGS)) {
        const spec = BUILDINGS[k], cost = spec.cost(0), afford = (profile.scrap || 0) >= cost;
        const r = { x: bx, y: py + 6 + Math.floor(bi / 4) * 66, w: cw, h: 58 };
        baseRects.push({ r, fn: () => {
          if ((profile.scrap || 0) < cost) return;
          profile.scrap -= cost;
          profile.base[baseSlot] = { t: k, lvl: 1 };
          refreshLvl();
        } });
        ctx.fillStyle = afford ? '#0b1220' : '#080d16'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = afford ? spec.accent : '#1a2438'; ctx.lineWidth = 1; ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = afford ? spec.accent : '#3a4a6a'; ctx.font = 'bold 11px monospace';
        ctx.fillText(spec.name, r.x + 8, r.y + 16);
        ctx.fillStyle = '#5a6a8a'; ctx.font = '10px monospace';
        ctx.fillText(spec.desc, r.x + 8, r.y + 32);
        ctx.fillStyle = afford ? '#ffcf6e' : '#4a4a3a';
        ctx.fillText(`${cost} scrap`, r.x + 8, r.y + 48);
        bx += cw + gap;
        if (++bi % 4 === 0) bx = gx;
      }
    } else {
      const spec = BUILDINGS[b.t], cost = spec.cost(b.lvl), afford = (profile.scrap || 0) >= cost;
      const r = { x: gx, y: py + 6, w: 240, h: 58 };
      baseRects.push({ r, fn: () => {
        if ((profile.scrap || 0) < cost) return;
        profile.scrap -= cost; b.lvl++; refreshLvl();
      } });
      ctx.fillStyle = afford ? '#141c2e' : '#080d16'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = afford ? spec.accent : '#1a2438'; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = afford ? spec.accent : '#3a4a6a'; ctx.font = 'bold 13px monospace';
      ctx.fillText(`UPGRADE ${spec.name} → LV ${b.lvl + 1}`, r.x + 14, r.y + 24);
      ctx.fillStyle = afford ? '#ffcf6e' : '#4a4a3a'; ctx.font = '12px monospace';
      ctx.fillText(`${cost} scrap`, r.x + 14, r.y + 44);
    }
  }
}

// ---------- draw: editor ----------
function drawEditor() {
  ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
  const c = edCenter(), ds = CS * ev.k;
  // right panel starts right of the build field
  const px = Math.max(W * 0.62, c.x + (GRID_LIM + 1) * ds + 30);
  const pw = W - px - 16;

  // ---------- header: back + title ----------
  edBackRect = { x: 16, y: 14, w: 190, h: 36 };
  ctx.fillStyle = '#0b1220'; ctx.fillRect(edBackRect.x, edBackRect.y, edBackRect.w, edBackRect.h);
  ctx.strokeStyle = '#8aa0c8'; ctx.lineWidth = 1.5; ctx.strokeRect(edBackRect.x, edBackRect.y, edBackRect.w, edBackRect.h);
  ctx.fillStyle = '#8aa0c8'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
  ctx.fillText(T('ed_back'), edBackRect.x + edBackRect.w / 2, edBackRect.y + 23);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 20px monospace';
  ctx.fillText(`${T('ed_title')} — ${T('c_' + mission) !== 'c_' + mission ? T('c_' + mission) : ((CONTRACTS[mission] || {}).name || T('ed_test'))}`, 220, 38);
  ctx.fillStyle = '#5a6a8a'; ctx.font = '12px monospace';
  ctx.fillText(T('ed_hint'), 220, 58);

  // ---------- workbench: fixed grid around world origin ----------
  const x0 = c.x + (-GRID_LIM - 0.5 - ev.x) * ev.k, x1 = c.x + (GRID_LIM + 0.5 - ev.x) * ev.k;
  const y0 = c.y + (-GRID_LIM - 0.5 - ev.y) * ev.k, y1 = c.y + (GRID_LIM + 0.5 - ev.y) * ev.k;
  ctx.fillStyle = '#0b1220'; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  ctx.strokeStyle = '#1a2438'; ctx.lineWidth = 1.5;
  ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  // cell lines — aligned with the real snap grid
  ctx.strokeStyle = 'rgba(60,80,120,0.18)'; ctx.lineWidth = 1;
  for (let g = -GRID_LIM; g <= GRID_LIM + 1; g++) {
    const sx = c.x + (g - 0.5 - ev.x) * ev.k, sy = c.y + (g - 0.5 - ev.y) * ev.k;
    ctx.beginPath(); ctx.moveTo(sx, Math.min(y0, y1)); ctx.lineTo(sx, Math.max(y0, y1)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(Math.min(x0, x1), sy); ctx.lineTo(Math.max(x0, x1), sy); ctx.stroke();
  }
  // axes through origin — brighter, dy=0 line is also the mirror axis
  const ox = c.x - ev.x * ev.k, oy = c.y - ev.y * ev.k;
  ctx.strokeStyle = mirrorX ? 'rgba(200,162,255,0.55)' : 'rgba(127,212,255,0.3)'; ctx.lineWidth = 1.5;
  if (mirrorX) ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(ox, Math.min(y0, y1)); ctx.lineTo(ox, Math.max(y0, y1)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(127,212,255,0.2)';
  ctx.beginPath(); ctx.moveTo(Math.min(x0, x1), oy); ctx.lineTo(Math.max(x0, x1), oy); ctx.stroke();
  if (mirrorX) { ctx.fillStyle = '#c8a2ff'; ctx.font = 'bold 11px monospace'; ctx.fillText('MIRROR', ox + 8, Math.min(y0, y1) + 16); }
  // nose marker — ships fly toward +dx (right on screen, engines go left)
  ctx.fillStyle = 'rgba(127,212,255,0.5)'; ctx.font = 'bold 11px monospace';
  ctx.fillText(T('ed_nose') + ' ►', ox + 8, oy - 10);

  const drawPart = (dx, dy, t, ghost) => {
    const s = edToScreen(dx, dy);
    ctx.globalAlpha = ghost ? 0.45 : 1;
    const spr = t === 'turret' ? SPRITES.gun_base : SPRITES[t];
    if (sprReady(spr)) ctx.drawImage(spr, s.x - ds / 2, s.y - ds / 2, ds, ds);
    else { ctx.fillStyle = TYPES[t].color; ctx.fillRect(s.x - ds / 2, s.y - ds / 2, ds, ds); }
    if (t === 'turret' && sprReady(SPRITES.gun_barrel)) ctx.drawImage(SPRITES.gun_barrel, s.x - ds / 2, s.y - ds / 2, ds, ds);
    ctx.globalAlpha = 1;
  };
  for (const p of design) drawPart(p.dx, p.dy, p.t, false);

  // ghost preview — red frame on an existing part (rip-off), else weld ghost
  {
    const w = edToWorld(mouse.x, mouse.y), hp2 = partAt(w.x, w.y);
    if (hp2) {
      const s = edToScreen(hp2.dx, hp2.dy);
      ctx.strokeStyle = 'rgba(255,110,92,0.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(s.x - ds / 2, s.y - ds / 2, ds, ds);
      ctx.beginPath(); ctx.moveTo(s.x - 7, s.y - 7); ctx.lineTo(s.x + 7, s.y + 7);
      ctx.moveTo(s.x + 7, s.y - 7); ctx.lineTo(s.x - 7, s.y + 7); ctx.stroke();
    } else {
      const sp = snapPos(w.x, w.y), afford = designCost() + TYPES[selected].cost <= budget();
      if (sp) {
        if (!afford) {
          const s = edToScreen(sp.dx, sp.dy);
          ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff6e5c';
          ctx.fillRect(s.x - ds / 2, s.y - ds / 2, ds, ds); ctx.globalAlpha = 1;
        } else {
          drawPart(sp.dx, sp.dy, selected, true);
          const mdx = -sp.dx;
          if (mirrorX && mdx !== sp.dx && !partAt(mdx, sp.dy)) drawPart(mdx, sp.dy, selected, true);
        }
      }
    }
  }

  // ---------- right panel ----------
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 15px monospace';
  ctx.fillText(T('ed_parts'), px, 34);

  // parts palette — compact icon tiles, as many columns as fit
  const tw = 60, th = 62, cols = Math.max(2, Math.floor(pw / (tw + 6)));
  KEYS_ORDER.forEach((k, i) => {
    const r = { x: px + (i % cols) * (tw + 6), y: 46 + Math.floor(i / cols) * (th + 6), w: tw, h: th };
    palette[k] = r;
    const T2 = TYPES[k], sel = selected === k;
    ctx.fillStyle = sel ? '#141c2e' : '#0b1220';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = sel ? T2.edge : '#1a2438'; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    const spr = k === 'turret' ? SPRITES.gun_base : SPRITES[k];
    if (sprReady(spr)) ctx.drawImage(spr, r.x + tw / 2 - 15, r.y + 5, 30, 30);
    else { ctx.fillStyle = T2.color; ctx.fillRect(r.x + tw / 2 - 12, r.y + 8, 24, 24); }
    ctx.fillStyle = T2.edge; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText(T2.name, r.x + tw / 2, r.y + th - 17);
    ctx.fillStyle = '#5a6a8a'; ctx.font = '9px monospace';
    ctx.fillText(T2.cost + ' ' + T('scrap'), r.x + tw / 2, r.y + th - 6);
  });
  ctx.textAlign = 'left';

  // selected part name line
  const py0 = 46 + Math.ceil(KEYS_ORDER.length / cols) * (th + 6) + 8;
  ctx.fillStyle = TYPES[selected].edge; ctx.font = 'bold 13px monospace';
  ctx.fillText(`▸ ${TYPES[selected].name} — ${TYPES[selected].cost} ${T('scrap')}   ${T('ed_sel')}`, px, py0);

  // tools row — build/erase toggle, mirror, undo, clear
  toolRects.length = 0;
  const ty = py0 + 10, tbw = Math.floor((pw - 18) / 4);
  const toolDefs = [
    { label: () => editTool === 'erase' ? T('ed_erase') : T('ed_build'), accent: editTool === 'erase' ? '#ff8a7a' : '#9dff8a', fn: () => { editTool = editTool === 'erase' ? 'build' : 'erase'; } },
    { label: () => mirrorX ? T('ed_mirron') : T('ed_mirror'), accent: '#c8a2ff', fn: () => { mirrorX = !mirrorX; } },
    { label: T('ed_undo'), accent: '#8ad4ff', fn: () => { if (undoStack.length) design = undoStack.pop(); } },
    { label: T('ed_clear'), accent: '#ff8a7a', fn: () => { pushUndo(); design = []; } },
  ];
  toolDefs.forEach((t, i) => {
    const r = { x: px + i * (tbw + 6), y: ty, w: tbw, h: 30 };
    toolRects.push({ r, fn: t.fn });
    ctx.fillStyle = '#0b1220'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = t.accent; ctx.lineWidth = 1.5; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = t.accent; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(typeof t.label === 'function' ? t.label() : t.label, r.x + r.w / 2, r.y + 19);
  });
  ctx.textAlign = 'left';

  // blueprint slots
  profile.bps = profile.bps || [null, null, null];
  bpRects.length = 0;
  const bw2 = Math.floor((pw - 12) / 3), by = ty + 40;
  for (let i = 0; i < 3; i++) {
    const r = { x: px + i * (bw2 + 6), y: by, w: bw2 - 24, h: 30 };
    const sr = { x: r.x + r.w, y: by, w: 24, h: 30 };
    bpRects.push({ r, sr, i });
    const full = profile.bps[i];
    ctx.fillStyle = full ? '#141c2e' : '#0b1220';
    ctx.strokeStyle = full ? '#8ad4ff' : '#3a4a6a'; ctx.lineWidth = 1.5;
    ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = full ? '#8ad4ff' : '#4a5a7a';
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(full ? `BP${i + 1} · ${full.length}p` : `BP${i + 1}`, r.x + r.w / 2, r.y + 19);
    ctx.fillStyle = '#1d3a24'; ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
    ctx.strokeStyle = '#9dff8a'; ctx.strokeRect(sr.x, sr.y, sr.w, sr.h);
    ctx.fillStyle = '#9dff8a'; ctx.fillText('S', sr.x + 12, sr.y + 20);
  }
  ctx.textAlign = 'left';

  // fleet roster — compact chips under the blueprint row
  const ry0 = by + 48;
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 12px monospace';
  ctx.fillText(`${T('ed_fleet')} (${rosterSel.size}/${wingCap()})`, px, ry0 - 8);
  const rw = Math.floor((pw - 12) / 3);
  ROSTER.forEach((r, i) => {
    const rc = { x: px + (i % 3) * (rw + 6), y: ry0 + Math.floor(i / 3) * 28, w: rw, h: 24 };
    rosterRects[i] = rc;
    const sel = rosterSel.has(i);
    ctx.fillStyle = sel ? '#14261c' : '#0b1220';
    ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    ctx.strokeStyle = sel ? '#9dff8a' : '#1a2438'; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(rc.x, rc.y, rc.w, rc.h);
    for (const [rr, cc, t] of r.g.slice(0, 6)) {
      const mx = rc.x + 3 + (cc - 1) * 5, my = rc.y + 4 + (rr - 2) * 5;
      const spr = t === 'turret' ? SPRITES.gun_base : SPRITES[t];
      if (sprReady(spr)) ctx.drawImage(spr, mx, my, 4, 4);
      else { ctx.fillStyle = TYPES[t].color; ctx.fillRect(mx, my, 4, 4); }
    }
    ctx.fillStyle = sel ? '#9dff8a' : '#8aa0c8'; ctx.font = 'bold 9px monospace';
    ctx.fillText(r.name, rc.x + 34, rc.y + 16);
  });

  // ---------- bottom pinned: stats + launch ----------
  const n = t => design.filter(x => x.t === t).length;
  const mass = design.length, eng = n('engine');
  ctx.fillStyle = '#8aa0c8'; ctx.font = '13px monospace';
  ctx.fillText(`${T('st_mass')} ${mass}   ${T('st_thrust')} ${eng ? Math.round(eng * 220 / (mass * 0.5)) : 0}   ${T('st_guns')} ${n('turret') + n('rail') + n('rocket')}   ${T('st_cost')} ${designCost()}/${Math.floor(budget())} ${T('scrap')}${salvage ? '  (+' + salvage.toFixed(1) + ')' : ''}`, px, H - 108);
  if (designCost() > budget()) { ctx.fillStyle = '#ff6e5c'; ctx.fillText(T('st_over'), px, H - 90); }

  const chk = canLaunch();
  const ly = H - 56;
  launchBtn.x = px; launchBtn.y = ly; launchBtn.w = Math.floor(pw * 0.52); launchBtn.h = 44;
  testBtn.x = launchBtn.x + launchBtn.w + 8; testBtn.y = ly; testBtn.w = pw - launchBtn.w - 8; testBtn.h = 44;
  ctx.fillStyle = chk.ok ? '#1d3a24' : '#141c2e';
  ctx.strokeStyle = chk.ok ? '#9dff8a' : '#4a5a7a'; ctx.lineWidth = 2;
  ctx.fillRect(launchBtn.x, launchBtn.y, launchBtn.w, launchBtn.h);
  ctx.strokeRect(launchBtn.x, launchBtn.y, launchBtn.w, launchBtn.h);
  ctx.fillStyle = chk.ok ? '#9dff8a' : '#5a6a8a';
  ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
  ctx.fillText(chk.ok ? T('ed_launch') : T(chk.why), launchBtn.x + launchBtn.w / 2, launchBtn.y + 28);
  ctx.fillStyle = chk.ok ? '#12222e' : '#141c2e';
  ctx.strokeStyle = chk.ok ? '#8ad4ff' : '#4a5a7a'; ctx.lineWidth = 2;
  ctx.fillRect(testBtn.x, testBtn.y, testBtn.w, testBtn.h);
  ctx.strokeRect(testBtn.x, testBtn.y, testBtn.w, testBtn.h);
  ctx.fillStyle = chk.ok ? '#8ad4ff' : '#5a6a8a';
  ctx.fillText(T('ed_test'), testBtn.x + testBtn.w / 2, testBtn.y + 28);
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
  // decoy flare — hologram shimmer so you know it's fake
  if (s.isDecoy) {
    const a = 0.25 + 0.2 * Math.sin(time * 9);
    ctx.strokeStyle = `rgba(138,232,255,${a})`; ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius + 10, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  // live shield bubble — faint cyan skin while the pool holds
  if (s.shield > 1) {
    ctx.strokeStyle = `rgba(90,212,255,${0.14 + 0.06 * Math.sin(time * 3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius + 12, 0, TAU); ctx.stroke();
  }
  for (const b of s.blocks) {
    const p = bw(s, b), T = TYPES[b.type];
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(s.angle);
    const spr = b.type === 'turret' ? SPRITES.gun_base : SPRITES[b.variant || b.type];
    if (sprReady(spr)) ctx.drawImage(spr, -CS / 2, -CS / 2, CS, CS);
    else {
      ctx.fillStyle = T.color; ctx.fillRect(-CS / 2 + 1, -CS / 2 + 1, CS - 2, CS - 2);
      ctx.strokeStyle = T.edge; ctx.strokeRect(-CS / 2 + 1, -CS / 2 + 1, CS - 2, CS - 2);
    }
    // pixel damage — shot-out pixels read as real holes in the sprite
    if (b.pix) {
      ctx.fillStyle = '#04060b';
      const ps = CS / BP;
      for (let i = 0; i < BP * BP; i++) if (!b.pix[i]) {
        ctx.fillRect((i % BP) * ps - CS / 2, Math.floor(i / BP) * ps - CS / 2, ps + 0.6, ps + 0.6);
      }
    }
    // laser heat — a block glows orange-hot as it approaches the melt point
    if (b.heat > 80) {
      const a = Math.min(0.6, b.heat / 1800);
      ctx.fillStyle = `rgba(255,${Math.floor(160 - a * 140)},30,${a})`;
      ctx.fillRect(-CS / 2, -CS / 2, CS, CS);
    }
    ctx.restore();
    // firing-arc wedge on selected ships — shows why edge mounts matter
    if (selection.has(s) && (b.type === 'turret' || b.type === 'laser')) {
      const outR = Math.hypot(b.dx, b.dy);
      if (outR > CS * 0.6) {
        const outA = s.angle + Math.atan2(b.dy, b.dx);
        ctx.strokeStyle = 'rgba(127,212,255,0.18)'; ctx.lineWidth = 1;
        for (const off of [-2.1, 2.1]) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(outA + off) * 34, p.y + Math.sin(outA + off) * 34); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, 34, outA - 2.1, outA + 2.1); ctx.stroke();
      }
    }
    // rotating single barrel — head loss kills the block outright
    if (b.type === 'turret' && b.barrels > 0) {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(b.aim);
      if (sprReady(SPRITES.gun_barrel)) ctx.drawImage(SPRITES.gun_barrel, -CS / 2, -CS / 2, CS, CS);
      ctx.restore();
    }
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
  if (mode === 'menu') { drawMenu(); return; }
  if (mode === 'base') { drawBase(); return; }
  if (mode === 'editor') { drawEditor(); return; }
  if (mode === 'planet') { pDraw(); return; }
  ctx.fillStyle = '#080d16'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const vhw = W / 2 / cam.zoom, vhh = H / 2 / cam.zoom; // visible half-extents
  ctx.strokeStyle = 'rgba(40,60,100,0.16)'; ctx.lineWidth = 1 / cam.zoom;
  const step = 90, x0 = Math.floor((cam.x - vhw) / step) * step, y0 = Math.floor((cam.y - vhh) / step) * step;
  for (let x = x0; x < cam.x + vhw + step; x += step) { ctx.beginPath(); ctx.moveTo(x, cam.y - vhh); ctx.lineTo(x, cam.y + vhh); ctx.stroke(); }
  for (let y = y0; y < cam.y + vhh + step; y += step) { ctx.beginPath(); ctx.moveTo(cam.x - vhw, y); ctx.lineTo(cam.x + vhw, y); ctx.stroke(); }

  ctx.fillStyle = '#7a8ab8';
  for (const st of stars) {
    const sx = st.x + cam.x * (1 - st.d), sy = st.y + cam.y * (1 - st.d);
    ctx.globalAlpha = st.d; ctx.fillRect(sx, sy, st.s, st.s);
  }
  ctx.globalAlpha = 1;

  if (planet) {
    const g = ctx.createRadialGradient(planet.x - 150, planet.y - 150, 50, planet.x, planet.y, planet.r);
    g.addColorStop(0, '#2a4a6e'); g.addColorStop(1, '#0a1524');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(planet.x, planet.y, planet.r, 0, TAU); ctx.fill();
  }

  // asteroids (Blender-rendered rocks)
  for (const a of asteroids) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
    const spr = SPRITES[a.spr || 'asteroid_a'];
    const d = a.r * 2.6;
    if (sprReady(spr)) ctx.drawImage(spr, -d / 2, -d / 2, d, d);
    else { ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.arc(0, 0, a.r, 0, TAU); ctx.fill(); }
    // impact craters — the rock keeps its scars
    ctx.fillStyle = 'rgba(10,12,18,0.8)';
    for (const cr of a.dmg) { ctx.beginPath(); ctx.arc(cr.x, cr.y, cr.r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // station — Blender-rendered hub, slowly rotating
  if (station.r > 0) {
  ctx.save();
  ctx.translate(station.x, station.y);
  const shielded = station.turrets.some(t => t.alive);
  if (shielded) { ctx.strokeStyle = 'rgba(110,90,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, station.r + 34, 0, TAU); ctx.stroke(); }
  ctx.rotate(time * 0.08);
  const sd = station.r * 2.6;
  if (sprReady(SPRITES.station_core)) ctx.drawImage(SPRITES.station_core, -sd / 2, -sd / 2, sd, sd);
  else { ctx.fillStyle = '#0d1426'; ctx.beginPath(); ctx.arc(0, 0, station.r, 0, TAU); ctx.fill(); }
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
  }

  for (const d of debris) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a);
    ctx.fillStyle = d.color || '#b06a2a';
    for (const [dx, dy] of d.shape || [[0, 0]]) ctx.fillRect(dx * 5 - 2.5, dy * 5 - 2.5, 5, 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    for (const [dx, dy] of d.shape || [[0, 0]]) ctx.strokeRect(dx * 5 - 2.5, dy * 5 - 2.5, 5, 5);
    ctx.restore();
  }

  // mines — spiky dots, blink once armed
  for (const m of mines) {
    ctx.save(); ctx.translate(m.x, m.y);
    const armed = m.arm <= 0, blink = !armed || (time * 4 | 0) % 2;
    ctx.fillStyle = armed ? '#ff6a4a' : '#8a5a4a';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffb0a0'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke();
    }
    if (blink) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // cargo pods
  for (const pod of pods) {
    ctx.save(); ctx.translate(pod.x, pod.y); ctx.rotate(0.3);
    ctx.fillStyle = '#3a2f1a'; ctx.strokeStyle = '#ffcf6e'; ctx.lineWidth = 2;
    ctx.fillRect(-10, -10, 20, 20); ctx.strokeRect(-10, -10, 20, 20);
    ctx.fillStyle = '#ffcf6e'; ctx.fillRect(-10, -3, 20, 6);
    ctx.restore();
  }

  for (const s of [...allies, ...foes]) if (s.alive) drawShip(s);

  // laser beams — fat magenta core, white-hot center line, impact flash
  for (const s of [...allies, ...foes]) {
    if (!s.alive || !s.beams) continue;
    for (const bm of s.beams) {
      ctx.strokeStyle = 'rgba(255,92,154,0.45)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bm.x1, bm.y1); ctx.lineTo(bm.x2, bm.y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,244,0.95)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bm.x1, bm.y1); ctx.lineTo(bm.x2, bm.y2); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bm.x2, bm.y2, 3.2, 0, TAU); ctx.fill();
    }
  }

  // tractor beams — thick teal tether with a flickering grab end
  for (const s of [...allies, ...foes]) {
    if (!s.alive || !s.tracBeam) continue;
    const tb = s.tracBeam;
    ctx.strokeStyle = 'rgba(74,255,224,0.4)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tb.x, tb.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,255,246,0.9)'; ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 6]); ctx.lineDashOffset = -time * 60;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tb.x, tb.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4affe0';
    ctx.beginPath(); ctx.arc(tb.x, tb.y, 4, 0, TAU); ctx.fill();
  }

  // jammed ships get violet static arcs — your fire control is screaming
  for (const s of [...allies, ...foes]) {
    if (!s.alive || !isJammed(s)) continue;
    ctx.strokeStyle = 'rgba(176,106,255,0.5)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const a = rand(0, TAU);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.radius + 8 + rand(0, 8), a, a + rand(0.4, 1.1)); ctx.stroke();
    }
  }
  // salvage beacon — pulsing teal ring where hulks get recycled
  if (mission === 'tow') {
    const pulse = 0.5 + 0.3 * Math.sin(time * 4);
    ctx.strokeStyle = `rgba(74,255,224,${pulse})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-500, 200, 160, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(74,255,224,0.25)';
    ctx.beginPath(); ctx.arc(-500, 200, 140, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#4affe0'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SALVAGE BEACON', -500, 200 - 176);
    ctx.textAlign = 'left';
  }
  for (const s of allies) if (s.alive && !autopilot) drawOrderMarker(s);

  for (const b of bullets) {
    if (b.rail) {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.strokeStyle = 'rgba(138,232,255,0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = '#dffaff'; ctx.fillRect(-2, -2, 5, 4);
      ctx.restore();
      continue;
    }
    if (b.torp) {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = 'rgba(255,120,80,0.4)';
      ctx.fillRect(-30, -3, 24, 6);
      ctx.fillStyle = '#e8d8b0';
      ctx.fillRect(-8, -4.5, 16, 9);
      ctx.fillStyle = '#ff5a3a';
      ctx.fillRect(6, -3, 5, 6);
      ctx.restore();
      continue;
    }
    if (b.rocket) {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = 'rgba(255,179,110,0.5)';
      ctx.fillRect(-22, -2.5, 18, 5); // exhaust trail
      ctx.fillStyle = '#ffd9a8';
      ctx.fillRect(-6, -3.5, 12, 7);
      ctx.fillStyle = '#ff8a5c';
      ctx.fillRect(4, -2.5, 5, 5);
      ctx.restore();
      continue;
    }
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
    // energy bar — weapons go quiet when the tank runs dry
    ctx.fillStyle = '#222'; ctx.fillRect(16, 30, 160, 6);
    ctx.fillStyle = '#6aff7a'; ctx.fillRect(16, 30, 160 * Math.max(0, (flag.energy || 0) / flag.emax), 6);
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
  ctx.fillText(`SALVAGE +${salvage.toFixed(1)} (next build: ${Math.floor(budget())} scrap)   MINED +${mined}`, 16, hy + 24);

  ctx.fillStyle = '#ff8a7a'; ctx.textAlign = 'right';
  if (mission === 'station') {
    const tLeft = station.turrets.filter(t => t.alive).length;
    ctx.fillText(`STATION  TURRETS ${tLeft}/6`, W - 16, 24);
    ctx.fillStyle = '#222'; ctx.fillRect(W - 176, 30, 160, 8);
    ctx.fillStyle = '#c8a2ff'; ctx.fillRect(W - 176, 30, 160 * Math.max(0, station.coreHp / station.coreMax), 8);
  } else if (mission === 'belt') {
    ctx.fillText(`BELT SWEEP  ${missionFaction.name}  KILLS ${foesDown}/${beltGoal}`, W - 16, 24);
  } else if (mission === 'hunt') {
    ctx.fillText(`ELITE HUNT  ${elite && elite.alive ? 'FLAGSHIP ACTIVE' : 'FLAGSHIP DOWN'}`, W - 16, 24);
  } else if (mission === 'defense') {
    const hp = baseShip ? baseShip.blocks.length : 0;
    ctx.fillText(`BASE DEFENSE  WAVE ${defWave}/3  BASE HULL ${hp}`, W - 16, 24);
  } else if (mission === 'convoy') {
    const left = hauler ? Math.max(0, Math.round((2450 - hauler.x) / 10)) : 0;
    ctx.fillText(`ESCORT  ${hauler && hauler.alive ? left + 'm TO DOCK' : 'HAULER LOST'}`, W - 16, 24);
  } else if (mission === 'tow') {
    ctx.fillText(`SALVAGE RUN  HULKS ${towGot}/3`, W - 16, 24);
  } else {
    ctx.fillText(`TEST RANGE  TARGETS LEFT ${foes.filter(f => f.alive && !f.wreck).length}`, W - 16, 24);
  }
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
  ctx.fillText('LMB ship: select (shift=+)   LMB: move/attack   M: mines   D: decoy   RMB drag: pan   wheel: zoom   F: flagship   A: all   Space: pause   P: AI   R: shipyard', 16, H - 16);

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
  if (won) {
    const txt = mission === 'station'
      ? 'STATION DESTROYED — L: LAND ON PLANET   R: rebuild   ESC: base'
      : mission === 'test'
        ? 'TEST COMPLETE — R: retest   ESC: base'
        : mission === 'defense'
          ? 'BASE HELD — R: patrol   ESC: base'
          : 'CONTRACT COMPLETE — R: fly again   ESC: base';
    ctx.fillStyle = '#9dff8a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center';
    ctx.fillText(txt, W / 2, H / 2); ctx.textAlign = 'left';
  }
  if (dead) {
    ctx.fillStyle = '#ff8a7a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center';
    ctx.fillText(baseLost ? 'BASE OVERRUN — press R to regroup' : haulerLost ? 'CONVOY DESTROYED — press R to retry' : 'FLAGSHIP LOST — press R to rebuild', W / 2, H / 2);
    ctx.textAlign = 'left';
  }
}

// ==================== PLANET MODE ====================
// Top-down tile world (Terraria/CW-style): dig terrain, mine ore+fuel,
// raid the enemy base (destructible walls), build your own walls/turrets.

const tileAt = (c, r) => (c < 0 || r < 0 || c >= PW || r >= PH) ? 2 : ptiles[r][c];
const solidPx = (x, y) => tileAt(Math.floor(x / TIL), Math.floor(y / TIL)) !== 0;
const tpos = o => ({ x: o.tx * TIL + TIL / 2, y: o.ty * TIL + TIL / 2 });

function initPlanet() {
  mode = 'planet';
  paused = false; pwon = false; pdead = false; pdig = null; pBuildSel = null; msg = null;
  pres = pres || { ore: 10, fuel: 5 };
  ptileDmg = {};
  ptiles = Array.from({ length: PH }, () => Array(PW).fill(0));
  const surf = 8;
  for (let y = surf; y < PH; y++) for (let x = 0; x < PW; x++)
    ptiles[y][x] = Math.random() < 0.10 ? 2 : 1;
  for (let y = Math.floor(PH * 0.72); y < PH; y++) for (let x = 0; x < PW; x++)
    if (Math.random() < 0.45) ptiles[y][x] = 2;
  // caverns via random walks
  for (let i = 0; i < 16; i++) {
    let x = Math.floor(rand(4, PW - 8)), y = surf + Math.floor(rand(2, PH - surf - 4));
    for (let s = 0; s < 24; s++) {
      ptiles[y][x] = 0;
      x = Math.max(1, Math.min(PW - 2, x + Math.floor(rand(-1, 2))));
      y = Math.max(surf + 1, Math.min(PH - 2, y + Math.floor(rand(-1, 2))));
    }
  }
  // ore / fuel veins
  for (let i = 0; i < 24; i++) {
    const t = Math.random() < 0.6 ? 3 : 4;
    let x = Math.floor(rand(3, PW - 3)), y = Math.floor(rand(surf + 2, PH - 2));
    for (let k = 0; k < 6; k++) {
      if (ptiles[y] && (ptiles[y][x] === 1 || ptiles[y][x] === 2)) ptiles[y][x] = t;
      x = Math.max(1, Math.min(PW - 2, x + Math.floor(rand(-1, 2))));
      y = Math.max(surf + 1, Math.min(PH - 1, y + Math.floor(rand(-1, 2))));
    }
  }
  // enemy base — walled bunker carved into the ground, door on the left
  const bx = PW - 19, by = surf - 1, bw = 16, bh = 9;
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) ptiles[y][x] = 0;
  for (let x = bx; x < bx + bw; x++) { ptiles[by][x] = 6; ptiles[by + bh - 1][x] = 6; }
  for (let y = by; y < by + bh; y++) { ptiles[y][bx] = 6; ptiles[y][bx + bw - 1] = 6; }
  ptiles[by + 4][bx] = 0; // breach / door
  pturrets = [
    { tx: bx + 3, ty: by + 1, hp: 60, maxHp: 60, cd: rand(0, 1), alive: true },
    { tx: bx + 10, ty: by + 1, hp: 60, maxHp: 60, cd: rand(0, 1), alive: true },
    { tx: bx + 7, ty: by + bh - 2, hp: 60, maxHp: 60, cd: rand(0, 1), alive: true },
  ];
  pcore = { tx: bx + 12, ty: by + 4, hp: 150, maxHp: 150, alive: true };
  pguards = [mkGuard(bx + 5, by + 5), mkGuard(bx + 11, by + 6), mkGuard(bx + 2, by + 2)];
  // armored patrols roll the surface — the base isn't guarded by infantry alone
  pvehs = [
    { x: (bx - 6) * TIL, y: 0, dir: -1, hp: 70, maxHp: 70, cd: rand(0, 1), alive: true },
    { x: (bx - 14) * TIL, y: 0, dir: -1, hp: 70, maxHp: 70, cd: rand(0, 1), alive: true },
    { x: PW * TIL * 0.5, y: 0, dir: -1, hp: 60, maxHp: 60, cd: rand(0, 1), alive: true },
  ];
  pdrones = [];
  pbuilt = [];
  rover = { x: 3 * TIL, y: (surf - 0.5) * TIL, vx: 0, vy: 0, angle: 0, hp: 140, maxHp: 140, cd: 0, order: null, target: null, alive: true };
  bullets = []; particles = []; pdebris = [];
  cam.x = rover.x; cam.y = rover.y; cam.zoom = 1;
  msg = { text: 'LANDER DOWN — dig in, break the base, grab the loot', t: 5 };
}

function mkGuard(tx, ty) {
  return { x: tx * TIL + TIL / 2, y: ty * TIL + TIL / 2, vx: 0, vy: 0, angle: 0, hp: 45, maxHp: 45, cd: rand(0, 1), alive: true };
}

const PB = [
  { key: 'wall', cost: 4, name: 'WALL' },
  { key: 'turret', cost: 12, name: 'TURRET' },
  { key: 'drone', cost: 20, name: 'DRONE' },
];
// surface level under a column — vehicles ride the terrain, not the sky
function groundYAt(x) {
  const c = Math.max(0, Math.min(PW - 1, Math.floor(x / TIL)));
  for (let r = 0; r < PH; r++) if (ptiles[r][c] !== 0) return r * TIL;
  return PH * TIL;
}
const pbtnRects = [];

function planetClick(mx, my) {
  // build palette
  for (let i = 0; i < PB.length; i++) {
    const r = pbtnRects[i];
    if (r && inRect(r, mx, my)) { pBuildSel = pBuildSel === PB[i].key ? null : PB[i].key; return; }
  }
  const p = screenToWorld(mx, my);
  const c = Math.floor(p.x / TIL), r = Math.floor(p.y / TIL);
  const inRng = Math.hypot(p.x - rover.x, p.y - rover.y) / TIL;

  // build placement
  if (pBuildSel) {
    const spec = PB.find(b => b.key === pBuildSel);
    if (spec.key === 'drone') {
      if (inRng < 8 && pres.ore >= spec.cost) {
        pres.ore -= spec.cost;
        pdrones.push({ x: rover.x + rand(-40, 40), y: rover.y - 60, angle: 0, hp: 50, maxHp: 50, cd: 0, alive: true });
      }
      return;
    }
    if (tileAt(c, r) === 0 && inRng < 8 && pres.ore >= spec.cost) {
      pres.ore -= spec.cost;
      if (spec.key === 'wall') ptiles[r][c] = 5;
      else pbuilt.push({ c, r, hp: 40, cd: 0, alive: true });
    }
    return;
  }
  // target enemies
  for (const t of pturrets) if (t.alive && dist(p, tpos(t)) < 24) { rover.target = t; return; }
  for (const g of pguards) if (g.alive && dist(p, g) < 22) { rover.target = g; return; }
  for (const v of pvehs) if (v.alive && dist(p, v) < 24) { rover.target = v; return; }
  if (pcore.alive && dist(p, tpos(pcore)) < 30) { rover.target = pcore; return; }
  // dig
  if (tileAt(c, r) !== 0 && inRng < 4) { pdig = { c, r, t: TILE_HP[tileAt(c, r)] / 45, max: TILE_HP[tileAt(c, r)] / 45 }; rover.target = null; return; }
  // move
  if (tileAt(c, r) === 0) { rover.order = p; rover.target = null; }
}

function pUpdate(dt) {
  time += dt;
  if (!rover.alive) { pdead = true; return; }

  if (rover.order) {
    const d = dist(rover, rover.order);
    if (d < 10) rover.order = null;
    else {
      const sp = 150, a = angleTo(rover, rover.order);
      const nx = rover.x + Math.cos(a) * sp * dt, ny = rover.y + Math.sin(a) * sp * dt;
      const rr = 11;
      if (!solidPx(nx - rr, rover.y - rr) && !solidPx(nx + rr, rover.y - rr) && !solidPx(nx - rr, rover.y + rr) && !solidPx(nx + rr, rover.y + rr)) rover.x = nx;
      if (!solidPx(rover.x - rr, ny - rr) && !solidPx(rover.x + rr, ny - rr) && !solidPx(rover.x - rr, ny + rr) && !solidPx(rover.x + rr, ny + rr)) rover.y = ny;
      rover.angle = a;
    }
  }

  if (pdig) {
    const cx = pdig.c * TIL + TIL / 2, cy = pdig.r * TIL + TIL / 2;
    if (Math.hypot(cx - rover.x, cy - rover.y) / TIL > 4.2) { pdig = null; }
    else {
      rover.angle = Math.atan2(cy - rover.y, cx - rover.x);
      pdig.t -= dt;
      if (pdig.t <= 0) {
        const t = ptiles[pdig.r][pdig.c];
        ptiles[pdig.r][pdig.c] = 0;
        explode(cx, cy, TILE_COL[t] || '#888', 8);
        if (t === 3) pdebris.push({ x: cx, y: cy, vx: rand(-25, 25), vy: rand(-25, 25), k: 'ore', v: 2 });
        if (t === 4) pdebris.push({ x: cx, y: cy, vx: rand(-25, 25), vy: rand(-25, 25), k: 'fuel', v: 2 });
        pdig = null;
      }
    }
  }

  rover.cd -= dt;
  if (rover.target && rover.target.alive !== false && rover.target.hp > 0) {
    const tp = rover.target.tx !== undefined ? tpos(rover.target) : rover.target;
    rover.angle = angleTo(rover, tp);
    if (rover.cd <= 0 && dist(rover, tp) < 360) {
      rover.cd = 0.45;
      bullets.push({ x: rover.x, y: rover.y, vx: Math.cos(rover.angle) * 400, vy: Math.sin(rover.angle) * 400, ttl: 1.2, dmg: 9, team: 'ally' });
      particles.push({ x: rover.x + Math.cos(rover.angle) * 14, y: rover.y + Math.sin(rover.angle) * 14, vx: rand(-15, 15), vy: rand(-15, 15), ttl: 0.1, max: 0.1, color: '#ffd27f', r: 3 });
    }
  } else rover.target = null;

  for (const t of pturrets) {
    if (!t.alive) continue; t.cd -= dt;
    const p = tpos(t);
    if (dist(p, rover) < 400 && t.cd <= 0) {
      t.cd = 1.2;
      const a = angleTo(p, rover);
      bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, ttl: 1.8, dmg: 10, team: 'foe' });
    }
  }

  for (const g of pguards) {
    if (!g.alive) continue;
    const d = dist(g, rover);
    if (d < 320 && d > 0) {
      const a = angleTo(g, rover);
      const nx = g.x + Math.cos(a) * 100 * dt, ny = g.y + Math.sin(a) * 100 * dt;
      if (!solidPx(nx, g.y)) g.x = nx;
      if (!solidPx(g.x, ny)) g.y = ny;
      g.angle = a;
    }
    g.cd -= dt;
    if (d < 300 && g.cd <= 0) {
      g.cd = 0.9;
      const a = angleTo(g, rover);
      bullets.push({ x: g.x, y: g.y, vx: Math.cos(a) * 290, vy: Math.sin(a) * 290, ttl: 1.6, dmg: 8, team: 'foe' });
    }
  }

  // patrol vehicles roll the ground — they chase the lander when it's close
  for (const v of pvehs) {
    if (!v.alive) continue;
    const d = dist(v, rover);
    v.cd -= dt;
    if (d < 380) {
      // engage: close to ~240px then stand and shoot
      if (d > 240) v.x += Math.sign(rover.x - v.x) * 85 * dt;
      const a = angleTo(v, rover);
      v.angle = a;
      if (v.cd <= 0) {
        v.cd = 1.1;
        bullets.push({ x: v.x, y: v.y - 6, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, ttl: 1.6, dmg: 9, team: 'foe' });
      }
    } else {
      // patrol: cruise the surface, turn at holes and walls
      const ahead = v.x + v.dir * 30;
      const gyHere = groundYAt(v.x), gyAhead = groundYAt(ahead);
      if (Math.abs(gyAhead - gyHere) > TIL * 1.2 || ahead < TIL || ahead > PW * TIL - TIL) v.dir *= -1;
      else v.x += v.dir * 45 * dt;
      v.angle = v.dir > 0 ? 0 : Math.PI;
    }
    v.y = groundYAt(v.x) - 9;
  }

  // allied drones shadow the lander and shoot whatever's closest
  for (const g of pdrones) {
    if (!g.alive) continue;
    const anchor = { x: rover.x - Math.cos(rover.angle) * 60, y: rover.y - 50 };
    const dd = dist(g, anchor);
    if (dd > 26) {
      const a = angleTo(g, anchor);
      const nx = g.x + Math.cos(a) * Math.min(220, dd * 4) * dt, ny = g.y + Math.sin(a) * Math.min(220, dd * 4) * dt;
      if (!solidPx(nx, g.y)) g.x = nx;
      if (!solidPx(g.x, ny)) g.y = ny;
    }
    g.cd -= dt;
    let best = null, bd = 340;
    for (const e of pguards) if (e.alive && dist(g, e) < bd) { bd = dist(g, e); best = e; }
    for (const e of pvehs) if (e.alive && dist(g, e) < bd) { bd = dist(g, e); best = e; }
    for (const e of pturrets) if (e.alive && dist(g, tpos(e)) < bd) { bd = dist(g, tpos(e)); best = tpos(e); }
    if (best && g.cd <= 0) {
      g.cd = 0.8;
      const a = angleTo(g, best);
      g.angle = a;
      bullets.push({ x: g.x, y: g.y, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, ttl: 1.2, dmg: 7, team: 'ally' });
    }
  }

  // player-built turrets defend you
  for (const t of pbuilt) {
    if (!t.alive) continue; t.cd -= dt;
    const p = { x: t.c * TIL + TIL / 2, y: t.r * TIL + TIL / 2 };
    let best = null, bd = 380;
    for (const g of pguards) if (g.alive && dist(p, g) < bd) { bd = dist(p, g); best = g; }
    for (const e of pvehs) if (e.alive && dist(p, e) < bd) { bd = dist(p, e); best = e; }
    for (const e of pturrets) if (e.alive && dist(p, tpos(e)) < bd) { bd = dist(p, tpos(e)); best = tpos(e); }
    if (best && t.cd <= 0) {
      t.cd = 0.7;
      const a = angleTo(p, best);
      bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, ttl: 1.3, dmg: 8, team: 'ally' });
    }
  }

  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt;
    if (b.ttl <= 0) continue;
    if (solidPx(b.x, b.y)) {
      const c = Math.floor(b.x / TIL), r = Math.floor(b.y / TIL), t = ptiles[r][c];
      b.ttl = 0; explode(b.x, b.y, TILE_COL[t] || '#888', 4);
      // bullets chip through walls; dirt/rock just absorb
      if (t === 5 || t === 6) {
        const k = r * PW + c;
        ptileDmg[k] = (ptileDmg[k] || 0) + b.dmg;
        if (ptileDmg[k] >= TILE_HP[t]) { ptiles[r][c] = 0; delete ptileDmg[k]; explode(c * TIL + TIL / 2, r * TIL + TIL / 2, TILE_COL[t], 12); }
      }
      continue;
    }
    if (b.team === 'foe') {
      if (dist(b, rover) < 13) {
        rover.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ff8a7a', 6);
        if (rover.hp <= 0) { rover.alive = false; explode(rover.x, rover.y, '#7fd4ff', 40); }
      }
      for (const t of pbuilt) {
        if (!t.alive) continue;
        const p = { x: t.c * TIL + TIL / 2, y: t.r * TIL + TIL / 2 };
        if (dist(b, p) < 14) { t.hp -= b.dmg; b.ttl = 0; if (t.hp <= 0) { t.alive = false; explode(p.x, p.y, '#7fd4ff', 18); } }
      }
      for (const g of pdrones) {
        if (!g.alive) continue;
        if (dist(b, g) < 12) { g.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#7fd4ff', 5); if (g.hp <= 0) { g.alive = false; explode(g.x, g.y, '#7fd4ff', 20); } }
      }
    } else {
      for (const t of pturrets) if (t.alive && dist(b, tpos(t)) < 15) {
        t.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ffd27f', 5);
        if (t.hp <= 0) { t.alive = false; explode(b.x, b.y, '#ff8a7a', 24); }
      }
      for (const g of pguards) if (g.alive && dist(b, g) < 13) {
        g.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ffd27f', 5);
        if (g.hp <= 0) { g.alive = false; explode(g.x, g.y, '#ff8a7a', 24); }
      }
      for (const v of pvehs) if (v.alive && dist(b, v) < 16) {
        v.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#ffb36e', 6);
        if (v.hp <= 0) { v.alive = false; explode(v.x, v.y, '#ffb36e', 30); }
      }
      if (pcore.alive && dist(b, tpos(pcore)) < 20) {
        pcore.hp -= b.dmg; b.ttl = 0; explode(b.x, b.y, '#c8a2ff', 6);
        if (pcore.hp <= 0) {
          pcore.alive = false; pwon = true;
          salvage += 15; pres.ore += 20; pres.fuel += 10;
          explode(b.x, b.y, '#ffffff', 60);
        }
      }
    }
  }
  bullets = bullets.filter(b => b.ttl > 0);

  for (const d of pdebris) {
    d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= (1 - 2 * dt); d.vy *= (1 - 2 * dt);
    if (dist(d, rover) < 26) { d.got = true; pres[d.k] += d.v; explode(d.x, d.y, '#ffcf6e', 4); }
  }
  pdebris = pdebris.filter(d => !d.got);

  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.ttl -= dt; }
  particles = particles.filter(p => p.ttl > 0);
  if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
}

function pDraw() {
  const vhw = W / 2 / cam.zoom, vhh = H / 2 / cam.zoom;
  ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);

  // sky strip above the surface
  ctx.fillStyle = '#14233d';
  ctx.fillRect(0, -TIL * 4, PW * TIL, TIL * 12);

  // tiles
  const c0 = Math.max(0, Math.floor((cam.x - vhw) / TIL)), c1 = Math.min(PW, Math.ceil((cam.x + vhw) / TIL));
  const r0 = Math.max(0, Math.floor((cam.y - vhh) / TIL)), r1 = Math.min(PH, Math.ceil((cam.y + vhh) / TIL));
  for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
    const t = ptiles[r][c];
    if (!t) continue;
    ctx.fillStyle = TILE_COL[t];
    ctx.fillRect(c * TIL, r * TIL, TIL, TIL);
    // top edge highlight like CW columns
    if (r > 0 && ptiles[r - 1][c] === 0) { ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(c * TIL, r * TIL, TIL, 3); }
    if (t === 3) { ctx.fillStyle = '#ff9d3a'; ctx.fillRect(c * TIL + 9, r * TIL + 9, 12, 12); }
    if (t === 4) { ctx.fillStyle = '#3ae8a8'; ctx.fillRect(c * TIL + 9, r * TIL + 9, 12, 12); }
    if (t >= 5) { ctx.strokeStyle = '#1a2438'; ctx.lineWidth = 2; ctx.strokeRect(c * TIL + 1, r * TIL + 1, TIL - 2, TIL - 2); }
    if (r + 1 < PH && ptiles[r + 1][c] !== 0) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(c * TIL, r * TIL + TIL - 4, TIL, 4); }
    // pixel damage specks — chipped tiles show destroyed pixels
    const dmgK = r * PW + c;
    const dmgAmt = ptileDmg[dmgK] || (pdig && pdig.c === c && pdig.r === r ? TILE_HP[t] * (1 - pdig.t / pdig.max) : 0);
    if (dmgAmt) {
      const ns = Math.min(16, Math.ceil(dmgAmt / TILE_HP[t] * 16));
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < ns; i++) {
        const sx = ((c * 13 + i * 7) % (TIL - 6)) + 3, sy = ((r * 11 + i * 5) % (TIL - 6)) + 3;
        ctx.fillRect(c * TIL + sx, r * TIL + sy, 4, 4);
      }
    }
  }

  // enemy base turrets (Blender sprites, barrels track rover)
  for (const t of pturrets) {
    if (!t.alive) continue;
    const p = tpos(t);
    ctx.save(); ctx.translate(p.x, p.y);
    if (sprReady(SPRITES.st_base)) ctx.drawImage(SPRITES.st_base, -TIL * 0.75, -TIL * 0.75, TIL * 1.5, TIL * 1.5);
    ctx.restore();
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angleTo(p, rover));
    if (sprReady(SPRITES.st_barrel)) ctx.drawImage(SPRITES.st_barrel, -TIL * 0.75, -TIL * 0.75, TIL * 1.5, TIL * 1.5);
    ctx.restore();
    ctx.fillStyle = '#222'; ctx.fillRect(p.x - 12, p.y - 20, 24, 3);
    ctx.fillStyle = '#ff8a7a'; ctx.fillRect(p.x - 12, p.y - 20, 24 * t.hp / t.maxHp, 3);
  }

  // base core — Blender-rendered bunker
  if (pcore.alive) {
    const p = tpos(pcore);
    ctx.save(); ctx.translate(p.x, p.y);
    if (sprReady(SPRITES.pb_core)) ctx.drawImage(SPRITES.pb_core, -26, -26, 52, 52);
    else { ctx.fillStyle = '#2a1a4a'; ctx.fillRect(-16, -16, 32, 32); }
    ctx.restore();
    ctx.fillStyle = '#222'; ctx.fillRect(p.x - 16, p.y - 30, 32, 4);
    ctx.fillStyle = '#c8a2ff'; ctx.fillRect(p.x - 16, p.y - 30, 32 * pcore.hp / pcore.maxHp, 4);
  }

  // guards
  for (const g of pguards) {
    if (!g.alive) continue;
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.angle);
    ctx.fillStyle = '#5e2a2a'; ctx.strokeStyle = '#ff8a7a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8a7a'; ctx.fillRect(6, -2, 8, 4);
    ctx.restore();
  }

  // patrol vehicles — little armored cars riding the surface
  for (const v of pvehs) {
    if (!v.alive) continue;
    ctx.save(); ctx.translate(v.x, v.y);
    ctx.fillStyle = '#3a2a1a'; ctx.strokeStyle = '#ffb36e'; ctx.lineWidth = 1.5;
    ctx.fillRect(-16, -10, 32, 12); ctx.strokeRect(-16, -10, 32, 12);
    ctx.fillStyle = '#1a120a'; ctx.fillRect(-16, 2, 32, 5); // treads
    ctx.save(); ctx.rotate(v.angle || 0);
    ctx.fillStyle = '#ffb36e'; ctx.fillRect(4, -4, 16, 5); // gun barrel
    ctx.restore();
    ctx.fillStyle = '#222'; ctx.fillRect(-16, -18, 32, 3);
    ctx.fillStyle = '#ffb36e'; ctx.fillRect(-16, -18, 32 * v.hp / v.maxHp, 3);
    ctx.restore();
  }

  // allied drones — hovering quads that shadow the lander
  for (const g of pdrones) {
    if (!g.alive) continue;
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.angle || 0);
    ctx.fillStyle = '#12303a'; ctx.strokeStyle = '#7fd4ff'; ctx.lineWidth = 1.5;
    ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16);
    ctx.fillStyle = '#7fd4ff'; ctx.fillRect(4, -2, 10, 4);
    ctx.restore();
    for (const [ox, oy] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) {
      ctx.strokeStyle = 'rgba(127,212,255,0.6)';
      ctx.beginPath(); ctx.arc(g.x + ox, g.y + oy, 3, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = '#222'; ctx.fillRect(g.x - 10, g.y - 18, 20, 3);
    ctx.fillStyle = '#7fd4ff'; ctx.fillRect(g.x - 10, g.y - 18, 20 * g.hp / g.maxHp, 3);
  }

  // player-built turrets
  for (const t of pbuilt) {
    if (!t.alive) continue;
    const p = { x: t.c * TIL + TIL / 2, y: t.r * TIL + TIL / 2 };
    ctx.save(); ctx.translate(p.x, p.y);
    if (sprReady(SPRITES.gun_base)) ctx.drawImage(SPRITES.gun_base, -13, -13, 26, 26);
    else { ctx.fillStyle = '#2a4a5e'; ctx.fillRect(-10, -10, 20, 20); }
    ctx.restore();
  }

  // debris pickups
  for (const d of pdebris) {
    ctx.fillStyle = d.k === 'ore' ? '#ff9d3a' : '#3ae8a8';
    ctx.fillRect(d.x - 4, d.y - 4, 8, 8);
    ctx.strokeStyle = '#ffffff55'; ctx.strokeRect(d.x - 4, d.y - 4, 8, 8);
  }

  // dig indicator
  if (pdig) {
    ctx.strokeStyle = '#ffcf6e'; ctx.lineWidth = 2;
    ctx.strokeRect(pdig.c * TIL + 2, pdig.r * TIL + 2, TIL - 4, TIL - 4);
    ctx.fillStyle = '#ffcf6e';
    ctx.fillRect(pdig.c * TIL + 4, pdig.r * TIL - 8, (TIL - 8) * (1 - pdig.t / pdig.max), 4);
  }

  // rover
  if (rover.alive) {
    ctx.save(); ctx.translate(rover.x, rover.y); ctx.rotate(rover.angle);
    ctx.fillStyle = '#1e2a3a'; ctx.strokeStyle = '#7fd4ff'; ctx.lineWidth = 2;
    ctx.fillRect(-13, -10, 26, 20); ctx.strokeRect(-13, -10, 26, 20);
    ctx.fillStyle = '#0d1426'; ctx.fillRect(-13, -13, 26, 5); ctx.fillRect(-13, 8, 26, 5); // treads
    ctx.fillStyle = '#7fd4ff'; ctx.fillRect(0, -3, 18, 6); // gun
    ctx.fillStyle = '#ffcf6e'; ctx.fillRect(-6, -5, 8, 10); // cab
    ctx.restore();
  }

  for (const b of bullets) {
    if (b.rocket) {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = 'rgba(255,179,110,0.5)';
      ctx.fillRect(-22, -2.5, 18, 5); // exhaust trail
      ctx.fillStyle = '#ffd9a8';
      ctx.fillRect(-6, -3.5, 12, 7);
      ctx.fillStyle = '#ff8a5c';
      ctx.fillRect(4, -2.5, 5, 5);
      ctx.restore();
      continue;
    }
    ctx.strokeStyle = b.team === 'foe' ? 'rgba(255,110,92,0.4)' : 'rgba(127,212,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = b.team === 'foe' ? '#ff6e5c' : '#7fd4ff';
    ctx.fillRect(b.x - 2.5, b.y - 2.5, 5, 5);
  }
  for (const p of particles) {
    ctx.globalAlpha = p.ttl / p.max; ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ---------- HUD ----------
  ctx.fillStyle = '#7fd4ff'; ctx.font = '14px monospace';
  ctx.fillText(`LANDER  HP ${Math.max(0, Math.round(rover.hp))}/${rover.maxHp}`, 16, 24);
  ctx.fillStyle = '#ff9d3a'; ctx.fillText(`ORE ${pres.ore}`, 16, 44);
  ctx.fillStyle = '#3ae8a8'; ctx.fillText(`FUEL ${pres.fuel}`, 16, 64);
  ctx.fillStyle = '#ffcf6e'; ctx.fillText(`SALVAGE +${salvage}`, 16, 84);

  ctx.fillStyle = '#ff8a7a'; ctx.textAlign = 'right';
  ctx.fillText(`BASE  TURRETS ${pturrets.filter(t => t.alive).length}/3  CORE ${pcore.alive ? Math.round(pcore.hp) : 'DOWN'}`, W - 16, 24);
  ctx.textAlign = 'left';

  // build palette
  let bx = 16;
  PB.forEach((b, i) => {
    const r = { x: bx, y: H - 60, w: 110, h: 42 };
    pbtnRects[i] = r; bx += 120;
    const sel = pBuildSel === b.key, afford = pres.ore >= b.cost;
    ctx.fillStyle = sel ? '#14261c' : '#0b1220'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = sel ? '#9dff8a' : '#1a2438'; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = afford ? '#8aa0c8' : '#4a5a7a'; ctx.font = 'bold 13px monospace';
    ctx.fillText(`${b.name} (${i + 1})`, r.x + 10, r.y + 18);
    ctx.fillStyle = '#ff9d3a'; ctx.font = '12px monospace';
    ctx.fillText(`${b.cost} ore`, r.x + 10, r.y + 34);
  });

  ctx.fillStyle = '#5a6a8a'; ctx.font = '12px monospace';
  ctx.fillText('LMB ground: move   LMB tile: dig   LMB enemy: target   1/2: build   RMB drag: pan   wheel: zoom   R: shipyard', 16, H - 68 + 78);

  if (msg) { ctx.fillStyle = '#ffcf6e'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.fillText(msg.text, W / 2, 60); ctx.textAlign = 'left'; }
  if (paused) {
    ctx.fillStyle = 'rgba(5,7,13,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2); ctx.textAlign = 'left';
  }
  if (pwon) { ctx.fillStyle = '#9dff8a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText('BASE CRUSHED — LOOT SECURED   (ENTER: home base · R: shipyard)', W / 2, H / 2); ctx.textAlign = 'left'; }
  if (pdead) { ctx.fillStyle = '#ff8a7a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText('LANDER LOST — press R to rebuild', W / 2, H / 2); ctx.textAlign = 'left'; }
}

// ---------- loop ----------
let last = performance.now(), lastMode = mode;
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (mode === 'base' && lastMode !== 'base') baseTick(); // accrue on arrival
  lastMode = mode;
  if (mode === 'flight' && !paused) update(dt);
  if (mode === 'planet' && !paused) pUpdate(dt);
  draw();
  requestAnimationFrame(loop);
}

design = starterDesign();
requestAnimationFrame(loop);
})();
