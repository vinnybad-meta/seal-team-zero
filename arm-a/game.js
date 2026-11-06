import * as THREE from 'three';
import { RNG, clamp, lerp, distXZ, yawToward, turnToward, angleDelta, AudioEngine, buildMaterials, buildHumanRig, animateHuman, buildDogRig, animateDog, buildHelicopter, buildViewmodel } from './lib.js';
import { buildWorld } from './world.js';

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => { if (/pointer lock/i.test(e.message || '')) return; errBox.textContent = 'Error: ' + e.message; errBox.style.display = 'block'; });
window.addEventListener('unhandledrejection', (e) => { const m = (e.reason && e.reason.message) || String(e.reason || ''); if (/pointer lock/i.test(m)) return; errBox.textContent = 'Error: ' + m; errBox.style.display = 'block'; });

const seedParam = parseInt(new URLSearchParams(location.search).get('seed') || '11', 10);
const SEED = Number.isFinite(seedParam) ? seedParam : 11;

// ---------- Renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.Fog(0x05070d, 34, 130);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 600);
scene.add(camera);
const moon = new THREE.DirectionalLight(0x8fa8d0, 0.35);
moon.position.set(-24, 34, 12); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -34; moon.shadow.camera.right = 34; moon.shadow.camera.top = 34; moon.shadow.camera.bottom = -34;
moon.shadow.camera.far = 110; moon.shadow.bias = -0.0004;
scene.add(moon);
scene.add(new THREE.AmbientLight(0x2a3a55, 0.5));
const bounce = new THREE.DirectionalLight(0x4a5f8a, 0.2); // moonless sky bounce, keeps night readable
bounce.position.set(18, 20, -14); scene.add(bounce);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

const MATS = buildMaterials();
const audio = new AudioEngine();
const world = buildWorld(scene, MATS);

// ---------- Game state ----------
const WEAPONS = {
  hk416: { name: 'HK416', mag: 30, damage: 34, headMult: 2.5, alert: 8, reserveMax: 120, reload: 2.1, interval: 0.082, auto: true, spreadHip: 0.030, spreadAds: 0.005, kick: 0.011 },
  mp7: { name: 'MP7', mag: 40, damage: 26, headMult: 2.5, alert: 40, reserveMax: 160, reload: 2.1, interval: 0.068, auto: true, spreadHip: 0.042, spreadAds: 0.009, kick: 0.009 },
  p226: { name: 'P226', mag: 15, damage: 22, headMult: 2.5, alert: 40, reserveMax: 45, reload: 1.6, interval: 0.21, auto: false, spreadHip: 0.026, spreadAds: 0.005, kick: 0.013 },
};
const OBJECTIVES = [
  { id: 'O1', name: 'INSERTION', tx: 2, tz: 19 }, { id: 'O2', name: 'BREACH', tx: 2, tz: 14 },
  { id: 'O3', name: 'GUEST HOUSE', tx: -10.5, tz: 2 }, { id: 'O4', name: 'MAIN HOUSE FLOOR 1', tx: -1, tz: -8 },
  { id: 'O5', name: 'MAIN HOUSE FLOOR 2', tx: -1, tz: -8 }, { id: 'O6', name: 'HVT — GERONIMO', tx: 2, tz: -11 },
  { id: 'O7', name: 'INTEL (SSE)', tx: -12.3, tz: 2.2 }, { id: 'O8', name: 'DEMOLITION', tx: 3.5, tz: 3 },
  { id: 'O9', name: 'EXFIL', tx: 2, tz: 24 },
];
let G = null;
function freshState() {
  return {
    runId: 0, phase: 'menu', pausedFrom: null, time: 0, clock: 0, startedAt: 0,
    rng: new RNG(SEED * 7919 + 13), framesRendered: 0, teleportsUsed: 0,
    objIndex: 0, objectives: OBJECTIVES.map(o => ({ ...o, done: false })),
    events: [], stats: { shots: 0, hits: 0, kills: 0 },
    player: null, squad: [], dog: null, enemies: [], civilians: [], actors: [],
    keys: {}, mouseDown: false, ads: false, yaw: 0, pitch: 0,
    charges: [], frags: [], tracers: [], shells: [], puffs: [],
    armedCharge: null, intel: 0, geronimoCalled: false, cacheUsed: false,
    reloading: null, switching: 0, lastShotAt: -9, stepAt: 0, hurtAt: -9, hurtFrom: null,
    calloutThrottle: {}, introT: -1, introDone: false, rusherTriggered: false,
    nvg: false, flashlight: false, flashAlertAt: 0, barkAt: -9, wonAt: 0, grade: '',
    fireHeldAt: 0, touchMove: { x: 0, y: 0 }, lookTouch: null, stickTouch: null,
  };
}
G = freshState();

function logEvent(type, msg, extra) {
  G.events.push({ t: Math.round(G.clock * 10) / 10, type, msg, ...(extra || {}) });
  if (G.events.length > 500) G.events.shift();
}
function callout(speaker, text, throttleKey, throttleSec) {
  const key = throttleKey || text;
  const now = G.clock;
  if (G.calloutThrottle[key] && now - G.calloutThrottle[key] < (throttleSec || 6)) return;
  G.calloutThrottle[key] = now;
  audio.ensure(); audio.squelch();
  logEvent('callout', text, { speaker });
  const sub = document.getElementById('subtitle');
  sub.textContent = speaker + ': "' + text + '"'; sub.style.opacity = 1;
  clearTimeout(callout._t); callout._t = setTimeout(() => { sub.style.opacity = 0; }, 2600);
}
function banner(text) {
  const b = document.getElementById('banner');
  b.textContent = text; b.style.opacity = 1;
  clearTimeout(banner._t); banner._t = setTimeout(() => { b.style.opacity = 0; }, 3000);
  logEvent('banner', text);
}

// ---------- Name tags / markers ----------
function textSprite(text, color, scale) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 56;
  const x = c.getContext('2d');
  x.font = 'bold 30px monospace'; x.textAlign = 'center';
  x.fillStyle = 'rgba(0,10,0,0.55)'; x.fillRect(28, 6, 200, 42);
  x.fillStyle = color; x.fillText(text, 128, 38);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(0.72 * (scale || 1), 0.155 * (scale || 1), 1); s.renderOrder = 20;
  return s;
}
function diamondSprite() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  x.strokeStyle = '#ff2a2a'; x.lineWidth = 6; x.beginPath();
  x.moveTo(32, 4); x.lineTo(60, 32); x.lineTo(32, 60); x.lineTo(4, 32); x.closePath(); x.stroke();
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(0.42, 0.42, 1); s.renderOrder = 19;
  return s;
}

// ---------- Actors ----------
let actorSeq = 0;
function makeActor(kind, name, x, z, floorY, opts) {
  opts = opts || {};
  const isDog = kind === 'dog';
  const rig = isDog ? buildDogRig(MATS) : buildHumanRig(kind, MATS);
  const y = world.floorHeightAt(x, z, floorY);
  rig.group.position.set(x, y, z);
  scene.add(rig.group);
  const a = {
    id: (opts.id || kind + '-' + (actorSeq++)), kind, name: name || '', rig,
    pos: rig.group.position, yaw: opts.yaw || 0, hp: opts.hp || 100, maxHp: opts.hp || 100,
    alive: true, wounded: false, armed: !!opts.armed, state: 'PATROL',
    patrol: opts.patrol || null, patrolIdx: 0, post: new THREE.Vector3(x, y, z),
    targetPos: null, lastKnown: null, speedNow: 0, fireAt: 0, burstLeft: 0, burstAt: 0,
    mag: 18, reloadingUntil: 0, coverPos: null, searchIdx: 0, searchUntil: 0, stateAt: 0,
    alertFloor: y, deathAt: -1, accuracyPenaltyUntil: 0, floorY: y, isHvt: !!opts.isHvt,
    room: opts.room || '', fireTarget: null, holdPos: null, barkCheckAt: 0,
  };
  if (isDog) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), MATS.strobeMat.clone());
    st.position.set(0, 0.62, -0.1); rig.group.add(st); rig.dogStrobe = st;
  }
  if (name && (kind === 'operator' || isDog)) {
    const tag = textSprite(name, isDog ? '#ffd76a' : '#7fd4ff', isDog ? 0.8 : 1);
    tag.position.set(0, isDog ? 0.95 : 2.12, 0); rig.group.add(tag); a.tag = tag;
  }
  if (opts.armed && !isDog) { const d = diamondSprite(); d.position.set(0, 2.15, 0); d.visible = false; rig.group.add(d); a.diamond = d; }
  G.actors.push(a);
  return a;
}
const ROOM_CENTERS = [
  { x: -10.5, z: 2, y: 0 }, { x: 0, z: 4, y: 0 }, { x: -3, z: -8.5, y: 0 }, { x: 4.5, z: -8, y: 0 },
  { x: -3, z: -8.5, y: 3.2 }, { x: 4, z: -9, y: 3.2 }, { x: 0, z: -9, y: 6.4 }, { x: 8.6, z: -6, y: 0 },
];
const COVER_POINTS = [
  [-10.5, 0, -7, 0], [8.6, 0, 7.4, 0], [12, 0, -8.6, 0], [-5, 0, 5, 0], [2, 0, 6.8, 0], [-13, 0, 5, 0],
  [-5.2, 0, -5, 0], [-5, 3.2, -12, 3.2], [6, 3.2, -12.4, 3.2], [-5, 6.4, -12.3, 6.4], [6.4, 6.4, -6, 6.4],
].map(([x, y, z, fy]) => new THREE.Vector3(x, fy, z));

function spawnActors() {
  const r = new RNG(SEED * 31 + 7);
  const j = (v) => v + r.range(-0.5, 0.5);
  // Player
  G.player = {
    pos: new THREE.Vector3(2, 0, 19), vel: new THREE.Vector3(), hp: 100, floorY: 0,
    weapon: 'hk416', mags: { hk416: 30, mp7: 40, p226: 15 }, reserve: { hk416: 120, mp7: 160, p226: 45 },
    charges: 3, frags: 2, radius: 0.35,
  };
  G.player.pos.y = world.floorHeightAt(2, 19, 0);
  // Squad
  const squadDefs = [['ZERO-2', 0.6, 20.6], ['ZERO-3', 3.4, 20.9], ['ZERO-4', 2.0, 22.2]];
  G.squad = squadDefs.map(([n, x, z], i) => {
    const a = makeActor('operator', n, x, z, 0, { hp: 100, yaw: Math.PI });
    a.stackSlot = i; a.fireAt = 1 + i * 0.4; a.mag = 30;
    return a;
  });
  const dog = makeActor('dog', 'CAIRO', 1.1, 19.4, 0, { hp: 60 });
  dog.isDog = true; G.dog = dog;
  // Enemies (posts + seeded patrol jitter)
  const ed = [
    ['e-guest', 'hostile', -11, 3, 0, 'guest', [[-12, 1], [-9.4, 4.4]]],
    ['e-f1a', 'hostile', -3, -8, 0, 'f1', [[-4.5, -10.5], [-1.5, -6]]],
    ['e-f1b', 'hostile2', 5, -10, 0, 'f1', [[3.4, -11.6], [6, -6.4]]],
    ['e-f2a', 'hostile', -3, -8, 3.2, 'f2', [[-4.6, -11], [-1.6, -6.2]]],
    ['e-f2b', 'hostile2', 3, -11, 3.2, 'f2', [[2, -12], [5, -8]]],
    ['e-rusher', 'hostile', 6.6, -8.8, 3.2, 'f2', [[6.6, -8.8]]],
    ['hvt', 'hvt', -1.5, -11, 6.4, 'f3', [[-2.8, -11.6], [0, -10.6]]],
  ];
  G.enemies = ed.map(([id, kind, x, z, fy, room, patrol]) => {
    const a = makeActor(kind, '', j(x), j(z), fy, { id, armed: true, hp: 100, room, isHvt: id === 'hvt' });
    a.yaw = r.range(0, Math.PI * 2);
    a.patrol = patrol.map(([px, pz]) => new THREE.Vector3(j(px), fy, j(pz)));
    return a;
  });
  G.rusher = G.enemies.find(e => e.id === 'e-rusher');
  // Civilians (unarmed, light clothes)
  const cd = [['c-guest', 'civilianF', -13, 0.6, 0], ['c-f1', 'civilian', 6.4, -7.6, 0], ['c-f2', 'civilianF', -5, -12.2, 3.2], ['c-f3', 'civilianF', -4.2, -12, 6.4]];
  G.civilians = cd.map(([id, kind, x, z, fy]) => makeActor(kind, '', x, z, fy, { id, armed: false, hp: 100 }));
  G.civilians.forEach(c => { c.state = 'COWER'; });
}
spawnActors();

// ---------- Collision / LOS ----------
function collideCircle(pos, radius, feetY) {
  const height = 1.7;
  for (const c of world.colliders) {
    if (c.active === false) continue;
    if (c.tag === 'slab') continue; // floor slabs are stood ON, never pushed by
    if (feetY >= c.maxY || feetY + height <= c.minY) continue;
    const nx = clamp(pos.x, c.minX, c.maxX), nz = clamp(pos.z, c.minZ, c.maxZ);
    let dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 > radius * radius) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2), push = radius - d;
      pos.x += (dx / d) * push; pos.z += (dz / d) * push;
    } else {
      const pl = pos.x - c.minX, pr = c.maxX - pos.x, pn = pos.z - c.minZ, pf = c.maxZ - pos.z;
      const m = Math.min(pl, pr, pn, pf);
      if (m === pl) pos.x = c.minX - radius; else if (m === pr) pos.x = c.maxX + radius;
      else if (m === pn) pos.z = c.minZ - radius; else pos.z = c.maxZ + radius;
    }
  }
}
const _seg = new THREE.Vector3(), _box = new THREE.Box3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function hasLOS(ax, ay, az, bx, by, bz) {
  _v1.set(ax, ay, az); _v2.set(bx, by, bz);
  for (const c of world.colliders) {
    if (c.active === false) continue;
    if (c.tag === 'prop') continue;
    _box.min.set(c.minX, c.minY, c.minZ); _box.max.set(c.maxX, c.maxY, c.maxZ);
    if (_box.containsPoint(_v1) || _box.containsPoint(_v2)) continue;
    _seg.subVectors(_v2, _v1);
    const len = _seg.length(); if (len < 0.01) return true;
    const ray = new THREE.Ray(_v1, _seg.normalize());
    const hit = new THREE.Vector3();
    if (ray.intersectBox(_box, hit) && hit.distanceTo(_v1) < len - 0.3) return false;
  }
  return true;
}
function separation(self) {
  for (const o of G.actors) {
    if (o === self || !o.alive || o.wounded) continue;
    const dx = self.pos.x - o.pos.x, dz = self.pos.z - o.pos.z;
    const d2 = dx * dx + dz * dz, min = 0.62;
    if (d2 < min * min && d2 > 1e-6 && Math.abs(self.pos.y - o.pos.y) < 1.6) {
      const d = Math.sqrt(d2), push = (min - d) / 2;
      self.pos.x += (dx / d) * push; self.pos.z += (dz / d) * push;
    }
  }
  if (self !== G.dog && G.player && G.phase === 'playing') {
    const dx = self.pos.x - G.player.pos.x, dz = self.pos.z - G.player.pos.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 0.55 * 0.55 && d2 > 1e-6) { const d = Math.sqrt(d2); self.pos.x += (dx / d) * (0.55 - d); self.pos.z += (dz / d) * (0.55 - d); }
  }
}

// ---------- Viewmodel / lights / FX pools ----------
const vm = buildViewmodel(MATS);
vm.group.position.set(0.27, -0.235, -0.55);
camera.add(vm.group); vm.setWeapon('hk416');
const vmLight = new THREE.PointLight(0xbfd4ff, 0.55, 2.4, 1.8);
vmLight.position.set(0.15, 0.05, 0.15); camera.add(vmLight);
const muzzleLight = new THREE.PointLight(0xffc37a, 0, 9, 1.6); scene.add(muzzleLight);
const flashLightObj = new THREE.SpotLight(0xfff2cf, 0, 26, 0.42, 0.45, 0.8);
camera.add(flashLightObj); flashLightObj.position.set(0.1, -0.05, 0.1);
flashLightObj.target.position.set(0, -0.05, -6); camera.add(flashLightObj.target);
const exploLight = new THREE.PointLight(0xff9a3c, 0, 30, 1.4); scene.add(exploLight);
const flashSprite = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.4, 'rgba(255,180,80,0.8)'); g.addColorStop(1, 'rgba(255,120,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true }));
  s.scale.set(0.34, 0.34, 1); s.visible = false; scene.add(s); return s;
})();
const puffTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
function spawnPuff(x, y, z, color, n, spread, up) {
  for (let i = 0; i < (n || 6); i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: color || 0x9a8f78, transparent: true, opacity: 0.7, depthWrite: false }));
    m.position.set(x, y, z); const s0 = 0.14 + G.rng.next() * 0.16; m.scale.set(s0, s0, 1);
    scene.add(m);
    G.puffs.push({ mesh: m, vx: (G.rng.next() - 0.5) * (spread || 1.4), vy: G.rng.next() * (up || 1) + 0.4, vz: (G.rng.next() - 0.5) * (spread || 1.4), life: 0.9 });
  }
}
function spawnTracer(x1, y1, z1, x2, y2, z2, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color || 0xffd9a0, transparent: true, opacity: 0.95 }));
  scene.add(line); G.tracers.push({ line, life: 0.07 });
}
function spawnShell(from, right) {
  const m = new THREE.Mesh(shellGeo, shellMat);
  m.position.copy(from); scene.add(m);
  G.shells.push({ mesh: m, vx: right.x * 1.1 + (G.rng.next() - 0.5) * 0.4, vy: 1.5 + G.rng.next() * 0.5, vz: right.z * 1.1, life: 0.8, spin: G.rng.range(4, 10) });
}
const shellGeo = new THREE.BoxGeometry(0.018, 0.018, 0.045);
const shellMat = new THREE.MeshBasicMaterial({ color: 0xd8b25e });

// ---------- Input ----------
const canvas = renderer.domElement;
let pointerLocked = false;
function safeLock() {
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* headless/gesture-less: ignore */ }
}
canvas.addEventListener('click', () => { if (G.phase === 'playing' && !pointerLocked) safeLock(); });
document.addEventListener('pointerlockerror', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  if (!pointerLocked && G.phase === 'playing') pauseGame('lock');
});
let lastMouseX = null, lastMouseY = null;
document.addEventListener('mousemove', (e) => {
  // locked mouse-look; if lock is unavailable, drag-look (held button) still turns the player
  if (G.phase !== 'playing' || (!pointerLocked && !(e.buttons > 0))) { lastMouseX = e.clientX; lastMouseY = e.clientY; return; }
  // movementX from real mice; client-delta fallback for synthetic/CDP drags (delta is 0 there)
  const dx = e.movementX || (lastMouseX === null ? 0 : e.clientX - lastMouseX);
  const dy = e.movementY || (lastMouseY === null ? 0 : e.clientY - lastMouseY);
  lastMouseX = e.clientX; lastMouseY = e.clientY;
  G.yaw -= dx * 0.0021; G.pitch = clamp(G.pitch - dy * 0.0021, -1.35, 1.35);
});
canvas.addEventListener('mousedown', (e) => {
  audio.ensure();
  if (G.phase !== 'playing') return;
  if (e.button === 0 && !pointerLocked) { safeLock(); return; } // the (re)lock click never fires
  if (e.button === 0) { G.mouseDown = true; tryFire(); }
  if (e.button === 2) G.ads = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) G.mouseDown = false; if (e.button === 2) G.ads = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  G.keys[e.code] = true;
  if ((e.code === 'Escape' || e.code === 'KeyP') && G.phase === 'paused') { resumeGame(); return; }
  if ((e.code === 'Escape' || e.code === 'KeyP') && G.phase === 'playing') { pauseGame('esc'); return; }
  if ((e.code === 'Enter' || e.code === 'Space')) {
    if (G.phase === 'menu') { startMission(); return; }
    if (G.phase === 'paused') { resumeGame(); return; }
    if (G.phase === 'failed' || G.phase === 'won') { startMission(); return; }
  }
  if (G.phase !== 'playing') return;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Digit1') switchWeapon('hk416');
  if (e.code === 'Digit2') switchWeapon('mp7');
  if (e.code === 'Digit3') switchWeapon('p226');
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyN') toggleNVG();
  if (e.code === 'KeyF') toggleFlashlight();
  if (e.code === 'KeyG') throwFrag();
});
window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
// Touch: left stick + right-half drag look + FIRE button, tracked by identifier (H15)
const touchState = { stickId: null, lookId: null, lookX: 0, lookY: 0, fireId: null };
function bindTouch() {
  const ui = document.getElementById('touchUI');
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) ui.style.display = 'block';
  const stick = document.getElementById('stick'), knob = document.getElementById('stickKnob'), fireBtn = document.getElementById('fireBtn');
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); audio.ensure();
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth * 0.45 && touchState.stickId === null) { touchState.stickId = t.identifier; }
      else if (touchState.lookId === null) { touchState.lookId = t.identifier; touchState.lookX = t.clientX; touchState.lookY = t.clientY; }
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchState.stickId) {
        const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let dx = (t.clientX - cx) / 46, dy = (t.clientY - cy) / 46;
        const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
        G.touchMove.x = dx; G.touchMove.y = dy;
        knob.style.left = (35 + dx * 32) + 'px'; knob.style.top = (35 + dy * 32) + 'px';
      } else if (t.identifier === touchState.lookId && G.phase === 'playing') {
        G.yaw -= (t.clientX - touchState.lookX) * 0.006; G.pitch = clamp(G.pitch - (t.clientY - touchState.lookY) * 0.006, -1.35, 1.35);
        touchState.lookX = t.clientX; touchState.lookY = t.clientY;
      }
    }
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchState.stickId) { touchState.stickId = null; G.touchMove.x = 0; G.touchMove.y = 0; knob.style.left = '35px'; knob.style.top = '35px'; }
      if (t.identifier === touchState.lookId) touchState.lookId = null;
      if (t.identifier === touchState.fireId) { touchState.fireId = null; G.mouseDown = false; }
    }
  };
  canvas.addEventListener('touchend', endTouch); canvas.addEventListener('touchcancel', endTouch);
  fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); audio.ensure(); if (G.phase === 'playing') { touchState.fireId = e.changedTouches[0].identifier; G.mouseDown = true; tryFire(); } }, { passive: false });
  fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchState.fireId = null; G.mouseDown = false; }, { passive: false });
}
bindTouch();
function pauseGame(reason) {
  if (G.phase !== 'playing') return;
  G.phase = 'paused'; G.pausedFrom = 'playing';
  const ov = document.getElementById('pauseOverlay');
  ov.classList.remove('hidden'); ov.style.display = 'flex';
  logEvent('pause', reason || 'lock');
}
document.addEventListener('visibilitychange', () => { if (document.hidden && G.phase === 'playing') pauseGame('hidden'); });
function resumeGame() {
  if (G.phase !== 'paused') return;
  const ov = document.getElementById('pauseOverlay');
  ov.classList.add('hidden'); ov.style.display = 'none';
  G.phase = 'playing'; logEvent('resume', 'ok');
  if (!pointerLocked && !('ontouchstart' in window)) safeLock();
}
document.getElementById('resumeBtn').addEventListener('click', resumeGame);

// ---------- Weapons ----------
function eyePos() { const p = G.player; return new THREE.Vector3(p.pos.x, p.pos.y + 1.62, p.pos.z); }
function viewDir() { return new THREE.Vector3(-Math.sin(G.yaw) * Math.cos(G.pitch), Math.sin(G.pitch), -Math.cos(G.yaw) * Math.cos(G.pitch)); }
function isSprinting() { return !!(G.keys['ShiftLeft'] || G.keys['ShiftRight']) && (G.keys['KeyW'] || G.keys['ArrowUp']) && !G.ads; }
function hint(text, ms) {
  const h = document.getElementById('interactHint');
  h.textContent = text; h.style.display = 'block'; h.dataset.prompt = 'hold';
  window._hintHoldUntil = performance.now() + (ms || 2200);
  clearTimeout(hint._t); hint._t = setTimeout(() => { h.style.display = 'none'; h.dataset.prompt = ''; }, ms || 2200);
}
function startReload() {
  const p = G.player; if (G.phase !== 'playing' || G.reloading || G.switching > 0) return;
  const w = WEAPONS[p.weapon];
  if (p.mags[p.weapon] >= w.mag || p.reserve[p.weapon] <= 0) return;
  if (isSprinting()) return;
  G.reloading = { weapon: p.weapon, endAt: G.clock + w.reload, token: G.runId }; // capture weapon at press (H5)
  audio.reload(); logEvent('reload', p.weapon);
}
function finishReload() {
  const r = G.reloading; if (!r) return;
  G.reloading = null;
  if (r.token !== G.runId || G.phase !== 'playing' || G.player.hp <= 0) return; // invalidated (H5)
  const p = G.player, w = WEAPONS[r.weapon];
  const need = w.mag - p.mags[r.weapon], take = Math.min(need, p.reserve[r.weapon]);
  p.mags[r.weapon] += take; p.reserve[r.weapon] -= take;
  logEvent('reloadDone', r.weapon + ':' + p.mags[r.weapon]);
}
function switchWeapon(key) {
  const p = G.player; if (G.phase !== 'playing' || p.weapon === key || G.switching > 0) return;
  G.reloading = null; G.switching = 0.6; G.switchTo = key;
  audio.draw(); logEvent('switch', key);
}
const nvgLight = new THREE.PointLight(0x86ff9e, 0, 9, 1.7);
camera.add(nvgLight); nvgLight.position.set(0, 0.05, -0.4);
function toggleNVG() {
  G.nvg = !G.nvg; logEvent('nvg', G.nvg ? 'on' : 'off');
  nvgLight.intensity = G.nvg ? 1.5 : 0; // IR illuminator: NVG sees interiors (brief: sees far in darkness)
  document.getElementById('nvgTag').textContent = G.nvg ? 'NVG ON' : 'NVG OFF';
  document.getElementById('nvgGrade').style.opacity = G.nvg ? 1 : 0;
  renderer.toneMappingExposure = G.nvg ? 2.0 : 1.32;
  audio.ensure(); audio.tone && audio.tone(1800, 0.05, 0.1, 'square');
}
function toggleFlashlight() {
  G.flashlight = !G.flashlight;
  flashLightObj.intensity = G.flashlight ? 34 : 0;
  logEvent('flashlight', G.flashlight ? 'on' : 'off');
  if (G.flashlight) noiseEvent(G.player.pos.x, G.player.pos.z, 2, 'flashlight');
}
function noiseEvent(x, z, radius, kind) {
  // kind: gunfire | explosion | flashlight — alert propagation
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const d = distXZ(x, z, e.pos.x, e.pos.z);
    if (kind === 'explosion') {
      if (e.state !== 'ATTACK') { e.state = 'SUSPICIOUS'; e.lastKnown = new THREE.Vector3(x, e.pos.y, z); e.stateAt = G.clock; e.targetPos = null; }
    } else if (kind === 'flashlight') {
      if (Math.abs(e.floorY - G.player.floorY) < 0.6 && d < 20 && e.state === 'PATROL') { e.state = 'SUSPICIOUS'; e.lastKnown = G.player.pos.clone(); e.stateAt = G.clock; }
    } else if (d <= radius && e.state === 'PATROL') {
      e.state = 'SUSPICIOUS'; e.lastKnown = new THREE.Vector3(x, e.pos.y, z); e.stateAt = G.clock; e.targetPos = null;
    }
  }
  if (kind !== 'flashlight') logEvent('noise', kind + '@' + Math.round(x) + ',' + Math.round(z) + ' r' + radius);
}
function tryFire() {
  if (G.phase !== 'playing' || !G.player || G.player.hp <= 0) return;
  const p = G.player, w = WEAPONS[p.weapon];
  if (G.reloading || G.switching > 0 || isSprinting()) return;
  if (G.clock - G.lastShotAt < w.interval) return;
  if (p.mags[p.weapon] <= 0) { audio.dryFire(); G.lastShotAt = G.clock; hint('RELOAD [R]'); return; }
  G.lastShotAt = G.clock;
  p.mags[p.weapon]--; G.stats.shots++;
  audio.shot(p.weapon, 0);
  const eye = eyePos(), dir = viewDir();
  const spread = G.ads ? w.spreadAds : w.spreadHip;
  dir.x += (G.rng.next() - 0.5) * 2 * spread; dir.y += (G.rng.next() - 0.5) * 2 * spread; dir.z += (G.rng.next() - 0.5) * 2 * spread; dir.normalize();
  G.pitch += w.kick * (G.ads ? 0.55 : 1); // camera kick
  // muzzle FX
  vm.group.updateMatrixWorld();
  const gunWorld = new THREE.Vector3(); vm.guns[p.weapon].getWorldPosition(gunWorld);
  const muzzle = gunWorld.clone().add(new THREE.Vector3(dir.x * 0.4, dir.y * 0.4 + 0.05, dir.z * 0.4));
  flashSprite.position.copy(muzzle); flashSprite.visible = true; flashSprite.material.rotation = G.rng.next() * 3;
  setTimeout(() => { flashSprite.visible = false; }, 75);
  muzzleLight.position.copy(muzzle); muzzleLight.intensity = 14; setTimeout(() => { muzzleLight.intensity = 0; }, 90);
  G.vmKick = 1;
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  spawnShell(eye.clone().add(new THREE.Vector3(right.x * 0.2, -0.12, right.z * 0.2)), right);
  // hitscan: nearest actor or wall
  let bestT = 90, bestActor = null, bestHead = false, bestPoint = eye.clone().add(dir.clone().multiplyScalar(90));
  const ray = new THREE.Ray(eye, dir);
  for (const c of world.colliders) {
    if (c.active === false) continue;
    _box.min.set(c.minX, c.minY, c.minZ); _box.max.set(c.maxX, c.maxY, c.maxZ);
    const hit = new THREE.Vector3();
    if (ray.intersectBox(_box, hit)) { const t = hit.distanceTo(eye); if (t < bestT) { bestT = t; bestPoint = hit.clone(); bestActor = null; } }
  }
  for (const a of [...G.enemies, ...G.civilians, ...G.squad, G.dog]) {
    if (!a || !a.alive || a.wounded) continue;
    // torso sphere + head sphere
    const torsoC = new THREE.Vector3(a.pos.x, a.pos.y + (a.isDog ? 0.42 : 1.25), a.pos.z);
    const headC = new THREE.Vector3(a.pos.x, a.pos.y + (a.isDog ? 0.55 : 1.72), a.pos.z);
    const rT = a.isDog ? 0.38 : 0.42, rH = a.isDog ? 0.2 : 0.19;
    for (const [c, r, isHead] of [[torsoC, rT, false], [headC, rH, true]]) {
      const oc = new THREE.Vector3().subVectors(c, eye);
      const tca = oc.dot(dir); if (tca < 0) continue;
      const d2 = oc.lengthSq() - tca * tca;
      if (d2 < r * r) { const t = tca - Math.sqrt(r * r - d2); if (t < bestT) { bestT = t; bestActor = a; bestHead = isHead; bestPoint = eye.clone().add(dir.clone().multiplyScalar(t)); } }
    }
  }
  spawnTracer(muzzle.x, muzzle.y, muzzle.z, bestPoint.x, bestPoint.y, bestPoint.z, 0xffe2a8);
  noiseEvent(p.pos.x, p.pos.z, w.alert, 'gunfire');
  if (bestActor) {
    G.stats.hits++;
    audio.hit(); showHitmarker(bestHead);
    damageActor(bestActor, bestHead ? w.damage * w.headMult : w.damage, 'player', bestPoint);
  } else if (bestT < 90) {
    spawnPuff(bestPoint.x, bestPoint.y, bestPoint.z, 0x8f8672, 4, 0.8, 0.6);
  }
}
function showHitmarker(head) {
  const h = document.getElementById('hitmarker');
  h.style.opacity = 1; h.style.color = head ? '#ff5a4a' : '#fff';
  clearTimeout(showHitmarker._t); showHitmarker._t = setTimeout(() => { h.style.opacity = 0; }, 130);
}
// ---------- Damage ----------
function damageActor(a, dmg, source, point) {
  if (!a || !a.alive || G.phase === 'won' || G.phase === 'failed') return;
  const isFriendly = a.kind === 'operator' || a.isDog;
  if (source === 'player' && isFriendly) {
    callout(a.name || 'CAIRO', 'Check fire!', 'checkfire', 3);
    logEvent('friendlyFire', a.name || 'dog');
    return; // zero damage, never fails (ROE)
  }
  const isCivilian = a.kind.startsWith('civilian');
  if (isCivilian) {
    a.hp -= dmg;
    if (a.hp > 0 && source === 'player') { callout('ZERO-2', 'Check fire — civilian!', 'civwarn', 5); logEvent('civWarn', a.id); }
    // All explosions in this mission are player ordnance, so blast kills fail too.
    if (a.hp <= 0 && (source === 'player' || source === 'explosion')) { killActor(a); failMission('ROE VIOLATION — unarmed civilian killed.'); }
    else if (a.hp <= 0) killActor(a);
    return;
  }
  if (a.kind === 'operator' || a.isDog) {
    // Squad wound rules: cannot die before O6 completes; after that they go down (wounded).
    a.hp -= dmg;
    if (a.hp <= 0) {
      if (a.isDog) { a.wounded = true; a.hp = 10; logEvent('dogDown', 'CAIRO down'); callout('ZERO-2', 'Cairo is down!', 'dogdown', 30); }
      else if (!G.objectives[5].done) { a.hp = 18; }
      else if (!a.wounded) { a.wounded = true; a.hp = 12; callout(a.name, "I'm hit — I'm down!", 'down' + a.name, 30); logEvent('squadDown', a.name); }
    }
    return;
  }
  a.hp -= dmg;
  a.rig.flinchT = 0.22; // visible flinch + accuracy penalty (H10)
  a.accuracyPenaltyUntil = G.clock + 0.9;
  if (point) spawnPuff(point.x, point.y, point.z, 0xb9a888, 5, 0.9, 0.7);
  if (a.hp <= 0) { killActor(a, source); return; }
  if (G.enemies.includes(a) && a.state !== 'ATTACK') {
    a.state = 'ATTACK'; a.stateAt = G.clock; a.lastKnown = G.player.pos.clone();
  }
}
function killActor(a, source) {
  a.alive = false; a.deathAt = G.clock; a.state = 'DEAD';
  if (a.diamond) a.diamond.visible = false;
  if (G.enemies.includes(a)) {
    G.stats.kills++;
    logEvent('kill', a.id);
    if (a.isHvt) logEvent('hvtDown', 'GERONIMO EKIA');
  }
  logEvent('death', a.name || a.id);
}
function damagePlayer(n, fromPos) {
  const p = G.player;
  if (!p || G.phase !== 'playing' || p.hp <= 0) return;
  p.hp -= n; G.hurtAt = G.clock; G.hurtFrom = fromPos ? fromPos.clone() : null;
  audio.hurt();
  const v = document.getElementById('vignette'); v.style.opacity = 0.95;
  setTimeout(() => { v.style.opacity = 0.25; }, 120);
  logEvent('playerDamage', '' + Math.round(n) + ' -> hp ' + Math.round(p.hp));
  if (p.hp <= 0) { p.hp = 0; failMission('KIA — you were neutralized by hostile fire.'); }
}
function failMission(reason) {
  if (G.phase === 'won' || G.phase === 'failed') return; // H8: exclusive + final
  G.phase = 'failed'; G.reloading = null;
  document.getElementById('interactHint').style.display = 'none';
  document.getElementById('banner').style.opacity = 0;
  document.getElementById('subtitle').style.opacity = 0;
  updateHUD(); // final truthful numbers under the overlay (no stale HP)
  document.getElementById('failReason').textContent = reason;
  document.getElementById('aarOverlay').classList.add('hidden');
  document.getElementById('failOverlay').classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
  logEvent('failed', reason);
  audio.squelch();
}
// ---------- Charges & frags ----------
const CHARGE_TARGETS = [
  { id: 'gate', x: 2, z: 14.0, label: 'GATE' },
  { id: 'wreck', x: 3.5, z: 3.2, label: 'WRECK' },
];
function nearestChargeTarget() {
  const p = G.player;
  for (const t of CHARGE_TARGETS) {
    if (t.id === 'gate' && world.gateCollider.mesh === null) continue;
    if (distXZ(p.pos.x, p.pos.z, t.x, t.z) < 2.9) {
      if (t.id === 'gate' && !world.colliders.includes(world.gateCollider)) continue;
      if (t.id === 'wreck' && !world.wreck.group.visible) continue;
      if (t.id === 'wreck' && !world.colliders.includes(world.wreckCollider)) continue;
      return t;
    }
  }
  return null;
}
function plantCharge(target) {
  const p = G.player;
  if (p.charges <= 0) { hint('NO CHARGES LEFT'); return; }
  if (G.armedCharge) { hint('CHARGE ALREADY ARMED'); return; }
  p.charges--;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.24), MATS.black);
  const fy = world.floorHeightAt(target.x, target.z, p.pos.y);
  mesh.position.set(target.x, fy + 0.12, target.z); scene.add(mesh);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.65, 6, 48), new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(target.x, fy + 0.07, target.z); scene.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(6, 40), new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.set(target.x, fy + 0.05, target.z); scene.add(disc);
  const blinker = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), MATS.redMat);
  blinker.position.set(target.x, fy + 0.26, target.z); scene.add(blinker);
  G.armedCharge = { target: target.id, x: target.x, z: target.z, fy, mesh, ring, disc, blinker, detonateAt: G.clock + 3, beepAt: G.clock };
  audio.beep(); logEvent('charge', 'planted:' + target.id);
  callout('ZERO-2', 'Charge set — clear the blast!', 'chargeset', 2);
  // Squad holds OUTSIDE blast radius at gate/door waypoint (H9).
  // Dog: at the wreck he runs PAST the charge; at the gate the closed leaves block
  // him, so he holds south with the stack and pours through first once it blows.
  for (const s of G.squad) { s.holdPos = new THREE.Vector3(target.x + (s.stackSlot - 1) * 1.6, 0, target.z + (target.id === 'gate' ? 8.5 : -7.5)); s.holdPos.y = world.floorHeightAt(s.holdPos.x, s.holdPos.z, 0); }
  if (G.dog && G.dog.alive) { G.dog.holdPos = new THREE.Vector3(target.x - 3.5, 0, target.z + (target.id === 'gate' ? 7.5 : -7.5)); }
}
function detonateCharge() {
  const c = G.armedCharge; if (!c) return;
  G.armedCharge = null;
  scene.remove(c.mesh); scene.remove(c.ring); if (c.disc) scene.remove(c.disc); scene.remove(c.blinker);
  explodeAt(c.x, c.fy + 0.5, c.z, 6, 220, true);
  if (c.target === 'gate') { world.setGateDestroyed(); logEvent('objectiveGate', 'gate destroyed'); if (G.dog && G.dog.alive && !G.dog.wounded) { G.dog.holdPos = new THREE.Vector3(0, 0, 6); setTimeout(() => { if (G.dog) G.dog.holdPos = null; }, 3500); } }
  if (c.target === 'wreck') { world.setWreckDestroyed(); logEvent('objectiveWreck', 'wreck destroyed'); G.wreckDemolished = true; }
  logEvent('charge', 'detonated:' + c.target);
  for (const s of G.squad) s.holdPos = null;
  if (G.dog) G.dog.holdPos = null;
}
function throwFrag() {
  const p = G.player;
  if (G.phase !== 'playing' || p.frags <= 0) { if (p.frags <= 0) hint('NO FRAGS'); return; }
  p.frags--;
  const eye = eyePos(), dir = viewDir();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), MATS.black);
  mesh.position.copy(eye); scene.add(mesh);
  G.fragsList.push({ mesh, vx: dir.x * 13, vy: dir.y * 13 + 3.2, vz: dir.z * 13, fuseAt: G.clock + 4 });
  logEvent('frag', 'thrown');
}
G.fragsList = [];
function explodeAt(x, y, z, radius, dmg, big) {
  audio.explosion(big);
  noiseEvent(x, z, 999, 'explosion');
  exploLight.position.set(x, y + 1.2, z); exploLight.intensity = big ? 260 : 150;
  setTimeout(() => { exploLight.intensity = 0; }, 220);
  flashSprite.position.set(x, y + 0.6, z); flashSprite.scale.set(2.6, 2.6, 1); flashSprite.visible = true;
  setTimeout(() => { flashSprite.visible = false; flashSprite.scale.set(0.34, 0.34, 1); }, 130);
  spawnPuff(x, y + 0.5, z, 0x6a5c48, big ? 22 : 12, big ? 5 : 3, 2.6);
  spawnPuff(x, y + 1, z, 0x3a352c, big ? 14 : 8, big ? 3.4 : 2.2, 3.4);
  const targets = [...G.enemies, ...G.civilians, ...G.squad];
  if (G.dog) targets.push(G.dog);
  for (const a of targets) {
    if (!a.alive || a.wounded) continue;
    const d = Math.hypot(a.pos.x - x, a.pos.z - z, (a.pos.y + 1) - y);
    if (d <= radius) damageActor(a, dmg, 'explosion');
  }
  const pd = Math.hypot(G.player.pos.x - x, G.player.pos.z - z);
  if (pd <= radius && G.phase === 'playing') {
    // player blast falls off with distance (point-blank is still lethal; stand-clear is survivable)
    const mult = clamp(1.15 - pd / radius, 0.22, 1);
    damagePlayer(dmg * 0.6 * mult, new THREE.Vector3(x, y, z));
  }
  logEvent('explosion', '@' + Math.round(x) + ',' + Math.round(z) + ' r' + radius);
}
// ---------- Interact (E) ----------
function interact() {
  if (G.phase !== 'playing') return;
  const p = G.player;
  // ammo cache (guest house, one use; H6 refuse rules)
  if (distXZ(p.pos.x, p.pos.z, world.cachePos.x, world.cachePos.z) < 1.9 && Math.abs(p.pos.y) < 0.6) {
    if (G.cacheUsed) { hint('CACHE EMPTY — already used'); return; }
    const wFull = Object.keys(WEAPONS).every(k => p.reserve[k] >= WEAPONS[k].reserveMax && p.mags[k] >= WEAPONS[k].mag);
    if (wFull && p.charges >= 3 && p.frags >= 2) { hint('ALREADY FULL — cache refused'); logEvent('cache', 'refused-full'); return; }
    for (const k of Object.keys(WEAPONS)) { p.reserve[k] = WEAPONS[k].reserveMax; p.mags[k] = WEAPONS[k].mag; }
    p.charges = 3; p.frags = 2; G.cacheUsed = true; world.cacheUsed = true;
    audio.pickup(); logEvent('cache', 'refilled'); hint('AMMO + CHARGES + FRAGS REFILLED'); return;
  }
  // intel
  for (const it of world.intelItems) {
    if (!it.taken && distXZ(p.pos.x, p.pos.z, it.pos.x, it.pos.z) < 1.5 && Math.abs(p.pos.y - it.pos.y) < 1.2) {
      it.taken = true; it.mesh.visible = false; G.intel++;
      audio.pickup(); logEvent('intel', it.id + ' (' + G.intel + '/3)');
      callout('ZERO-2', 'Intel secured. ' + G.intel + ' of 3.', 'intel' + G.intel, 2);
      hint('INTEL COLLECTED ' + G.intel + '/3 — need 2');
      return;
    }
  }
  // charge plant
  const ct = nearestChargeTarget();
  if (ct) { plantCharge(ct); return; }
  // near a target but too far: say so instead of a flat refusal (no charge spent, H6)
  const near = CHARGE_TARGETS.find(t => distXZ(p.pos.x, p.pos.z, t.x, t.z) < 6);
  if (near) { hint('MOVE CLOSER TO THE ' + near.label + ' TO PLANT'); logEvent('plantRefused', 'too-far:' + near.id); return; }
  hint('NO VALID TARGET — charges need the gate or the wreck');
  logEvent('plantRefused', 'no-target');
}
// ---------- AI ----------
function moveActor(a, tx, tz, speed, dt, faceX, faceZ) {
  const dx = tx - a.pos.x, dz = tz - a.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.12) { a.speedNow = 0; return true; }
  const targetYaw = yawToward(a.pos.x, a.pos.z, faceX !== undefined ? faceX : tx, faceZ !== undefined ? faceZ : tz);
  a.yaw = turnToward(a.yaw, targetYaw, dt * 7);
  const step = Math.min(d, speed * dt);
  a.pos.x += (dx / d) * step; a.pos.z += (dz / d) * step;
  a.speedNow = speed;
  collideCircle(a.pos, a.isDog ? 0.3 : 0.35, a.pos.y);
  separation(a);
  a.pos.y = world.floorHeightAt(a.pos.x, a.pos.z, a.pos.y);
  a.floorY = a.pos.y;
  return d <= Math.max(0.3, speed * dt);
}
function actorEye(a) { return new THREE.Vector3(a.pos.x, a.pos.y + (a.isDog ? 0.5 : 1.52), a.pos.z); }
function playerChest() { const p = G.player; return new THREE.Vector3(p.pos.x, p.pos.y + 1.3, p.pos.z); }
function canSee(a, targetPos, eyeY) {
  const eye = actorEye(a);
  const d = eye.distanceTo(targetPos);
  if (d > 46) return false;
  // facing cone (wide when close)
  const toT = Math.atan2(targetPos.x - a.pos.x, targetPos.z - a.pos.z);
  if (d > 5 && Math.abs(angleDelta(toT, a.yaw)) > 1.9) return false;
  return hasLOS(eye.x, eye.y, eye.z, targetPos.x, (eyeY || targetPos.y), targetPos.z);
}
function enemyShoot(e, targetActor) {
  const from = new THREE.Vector3(e.pos.x + Math.sin(e.yaw) * 0.4, e.pos.y + 1.42, e.pos.z + Math.cos(e.yaw) * 0.4);
  let tp, isPlayerTarget = !targetActor;
  if (isPlayerTarget) tp = playerChest(); else tp = new THREE.Vector3(targetActor.pos.x, targetActor.pos.y + 1.25, targetActor.pos.z);
  const dist = from.distanceTo(tp);
  audio.shot('enemy', dist); // every tracer has a matching gunshot (H10)
  let chance = clamp(0.27 - dist * 0.0045, 0.05, 0.30);
  if (G.clock < e.accuracyPenaltyUntil) chance *= 0.45; // flinch penalty
  if (isPlayerTarget && isSprinting()) chance -= 0.07;
  if (isPlayerTarget && (G.player.speedNow || 0) > 1) chance -= 0.07; // moving target is harder to hit
  const hitRoll = G.rng.next() < chance;
  const end = tp.clone();
  if (!hitRoll) { end.x += (G.rng.next() - 0.5) * 2.4; end.y += (G.rng.next() - 0.3) * 1.2; end.z += (G.rng.next() - 0.5) * 2.4; }
  spawnTracer(from.x, from.y, from.z, end.x, end.y, end.z, 0xff9a7a);
  flashSprite.position.copy(from); flashSprite.visible = true; setTimeout(() => { flashSprite.visible = false; }, 40);
  if (hitRoll) {
    if (isPlayerTarget) damagePlayer(G.rng.int(6, 10), e.pos);
    else if (targetActor.kind === 'operator') {
      if (G.objectives[5].done) { // squad can be wounded only after O6 (SQUAD rules)
        targetActor.hp -= G.rng.int(10, 16);
        if (targetActor.hp <= 0 && !targetActor.wounded) {
          targetActor.wounded = true; targetActor.hp = 12;
          callout(targetActor.name, "I'm hit — I'm down!", 'down' + targetActor.name, 30);
          logEvent('squadDown', targetActor.name);
        }
      }
    }
  }
}
function squadShoot(s, e) {
  const from = new THREE.Vector3(s.pos.x + Math.sin(s.yaw) * 0.4, s.pos.y + 1.42, s.pos.z + Math.cos(s.yaw) * 0.4);
  const tp = new THREE.Vector3(e.pos.x + (G.rng.next() - 0.5) * 0.3, e.pos.y + 1.2, e.pos.z + (G.rng.next() - 0.5) * 0.3);
  const dist = from.distanceTo(tp);
  audio.squadShot(dist);
  spawnTracer(from.x, from.y, from.z, tp.x, tp.y, tp.z, 0xcfe8ff);
  if (G.rng.next() < clamp(0.36 - dist * 0.005, 0.08, 0.36)) damageActor(e, 30, 'squad', tp);
  s.mag--;
  if (s.mag <= 0) { s.reloadingUntil = G.clock + 2.1; callout(s.name, 'Reloading!', 'rl' + s.name, 20); }
}
function updateEnemy(e, dt) {
  if (!e.alive) return;
  const p = G.player;
  // perception
  e._percAt = (e._percAt || 0) - dt;
  let sees = false;
  if (e._percAt <= 0) {
    e._percAt = 0.14;
    sees = p.hp > 0 && canSee(e, playerChest());
    e._sees = sees;
    if (sees) {
      if (e.state !== 'ATTACK') { e.state = 'ATTACK'; e.stateAt = G.clock; e.fireAt = Math.max(e.fireAt, G.clock + G.rng.range(0.45, 0.85)); callout('ZERO-2', 'Contact!', 'contact', 9); logEvent('contact', e.id); }
      e.lastKnown = p.pos.clone(); e._lastSeenAt = G.clock;
    }
  } else sees = e._sees;
  if (e.diamond) e.diamond.visible = e.state === 'ATTACK';
  const distP = distXZ(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
  // rusher: storms the stairs toward the stack when player reaches floor 2
  if (e.id === 'e-rusher' && !G.rusherTriggered && p.pos.y > 2.4) {
    G.rusherTriggered = true; e.state = 'ATTACK'; e.lastKnown = p.pos.clone();
    callout('ZERO-3', 'Contact — second floor, he\'s rushing the stairs!', 'rusher', 30);
    logEvent('rusher', 'triggered');
  }
  const reloading = G.clock < e.reloadingUntil;
  if (e.state === 'PATROL') {
    if (!e.patrol || !e.patrol.length) { e.speedNow = 0; return; }
    const wp = e.patrol[e.patrolIdx % e.patrol.length];
    if (moveActor(e, wp.x, wp.z, 1.1, dt)) { e.patrolIdx++; }
  } else if (e.state === 'SUSPICIOUS') {
    const lk = e.lastKnown || e.post;
    if (moveActor(e, lk.x, lk.z, 2.0, dt)) {
      e.yaw += dt * 1.4; // look around
      if (G.clock - e.stateAt > 4) { e.state = 'SEARCH'; e.stateAt = G.clock; e.searchIdx = 0; }
    }
    if (G.clock - e.stateAt > 14) { e.state = 'SEARCH'; e.stateAt = G.clock; e.searchIdx = 0; }
  } else if (e.state === 'SEARCH') {
    const rooms = ROOM_CENTERS.filter(rc => Math.abs(rc.y - e.floorY) < 1.8)
      .sort((a, b) => distXZ(e.pos.x, e.pos.z, a.x, a.z) - distXZ(e.pos.x, e.pos.z, b.x, b.z)).slice(0, 3);
    const rc = rooms[e.searchIdx % Math.max(1, rooms.length)];
    if (!rc || moveActor(e, rc.x, rc.z, 1.8, dt)) { e.searchIdx++; }
    if (G.clock - e.stateAt > 22) { e.state = 'PATROL'; e.stateAt = G.clock; }
  } else if (e.state === 'ATTACK') {
    const target = e.lastKnown || p.pos;
    if (reloading) {
      if (!e.coverPos) {
        const cands = COVER_POINTS.filter(c => Math.abs(c.y - e.floorY) < 0.6)
          .sort((a, b) => a.distanceTo(e.pos) - b.distanceTo(e.pos));
        e.coverPos = cands.find(c => !hasLOS(c.x, c.y + 1.3, c.z, p.pos.x, p.pos.y + 1.3, p.pos.z)) || cands[0] || null;
      }
      if (e.coverPos) moveActor(e, e.coverPos.x, e.coverPos.z, 2.7, dt, p.pos.x, p.pos.z);
    } else if (sees || distP < 3) {
      e.yaw = turnToward(e.yaw, yawToward(e.pos.x, e.pos.z, p.pos.x, p.pos.z), dt * 9);
      e._strafeAt = (e._strafeAt || 0) - dt;
      if (e._strafeAt <= 0) { e._strafeAt = G.rng.range(1.2, 2.4); e._strafeDir = G.rng.chance(0.5) ? 1 : -1; }
      if (distP > 15) moveActor(e, p.pos.x, p.pos.z, 2.5, dt, p.pos.x, p.pos.z);
      else {
        const sx = e.pos.x + Math.cos(e.yaw) * e._strafeDir * 2.2, sz = e.pos.z - Math.sin(e.yaw) * e._strafeDir * 2.2;
        moveActor(e, sx, sz, 1.6, dt, p.pos.x, p.pos.z);
      }
      // fire bursts
      if (G.clock >= e.fireAt && distP < 44) { e.burstLeft = 3; e.burstAt = G.clock; e.fireAt = G.clock + G.rng.range(1.0, 1.8); }
    } else {
      // advance on last known; lost sight -> SEARCH after a while
      moveActor(e, target.x, target.z, 2.5, dt);
      if (G.clock - (e._lastSeenAt || 0) > 9) { e.state = 'SEARCH'; e.stateAt = G.clock; e.searchIdx = 0; }
    }
    if (e.burstLeft > 0 && G.clock >= e.burstAt) {
      e.burstAt = G.clock + 0.13; e.burstLeft--;
      if (e.mag <= 0) { e.reloadingUntil = G.clock + 2.2; e.coverPos = null; e.burstLeft = 0; }
      else {
        // mostly shoot the player; sometimes engage the nearest squad operator instead
        let tgt = null;
        if (G.rng.chance(0.3)) { const ss = G.squad.filter(s => s.alive && !s.wounded); if (ss.length) tgt = ss.reduce((a, b) => (a.pos.distanceTo(e.pos) < b.pos.distanceTo(e.pos) ? a : b)); }
        enemyShoot(e, tgt); e.mag--;
        if (e.mag <= 0) { e.reloadingUntil = G.clock + 2.2; e.coverPos = null; }
      }
    }
  }
  if (!reloading && e.mag < 18 && G.clock >= e.reloadingUntil && e.state === 'ATTACK' && e.mag <= 0) e.mag = 18;
  if (G.clock >= e.reloadingUntil && e.mag <= 0) e.mag = 18;
}
function updateSquad(s, dt) {
  if (!s.alive || s.wounded) { s.speedNow = 0; return; }
  if (s.mag <= 0 && G.clock >= s.reloadingUntil) s.mag = 30;
  const p = G.player;
  // combat: nearest visible hostile
  let foe = null, foeD = 33;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const d = s.pos.distanceTo(e.pos);
    if (e.isHvt && e.state === 'PATROL') continue; // GERONIMO is the player's target until he engages
    if (e.state === 'PATROL' && d > 12) continue; // hold fire on unalerted hostiles at range
    if (d < foeD && canSee(s, new THREE.Vector3(e.pos.x, e.pos.y + 1.2, e.pos.z))) { foe = e; foeD = d; }
  }
  let dest;
  if (s.holdPos) dest = s.holdPos;
  else {
    const fwd = new THREE.Vector3(-Math.sin(G.yaw), 0, -Math.cos(G.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const slots = [[-0.95, -1.6], [0.95, -1.7], [0, -2.8]];
    const [ox, oz] = slots[s.stackSlot % 3];
    dest = new THREE.Vector3(p.pos.x + right.x * ox + fwd.x * oz, 0, p.pos.z + right.z * ox + fwd.z * oz);
    dest.y = world.floorHeightAt(dest.x, dest.z, p.pos.y);
  }
  const dDest = distXZ(s.pos.x, s.pos.z, dest.x, dest.z);
  if (dDest > 0.55) moveActor(s, dest.x, dest.z, dDest > 4 ? 6.4 : 3.4, dt, foe ? foe.pos.x : undefined, foe ? foe.pos.z : undefined);
  else { s.speedNow = 0; if (foe) s.yaw = turnToward(s.yaw, yawToward(s.pos.x, s.pos.z, foe.pos.x, foe.pos.z), dt * 8); }
  if (foe && G.clock >= s.fireAt && G.clock >= s.reloadingUntil) {
    s.fireAt = G.clock + G.rng.range(0.5, 1.0);
    squadShoot(s, foe);
  }
  s.aimingNow = !!foe;
}
function updateDog(d, dt) {
  if (!d.alive || d.wounded) { d.speedNow = 0; return; }
  const p = G.player;
  // bark: hostile within 15m of the dog, and only then
  if (G.clock - (d._barkCheckAt || 0) > 0.5) {
    d._barkCheckAt = G.clock;
    const near = G.enemies.some(e => e.alive && d.pos.distanceTo(e.pos) < 15);
    if (near && G.clock - G.barkAt > 4) { G.barkAt = G.clock; audio.ensure(); audio.bark(); logEvent('bark', 'CAIRO alert'); }
  }
  let dest;
  if (d.holdPos) dest = d.holdPos;
  else {
    const fwd = new THREE.Vector3(-Math.sin(G.yaw), 0, -Math.cos(G.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    dest = new THREE.Vector3(p.pos.x + right.x * 1.1 + fwd.x * 0.7, 0, p.pos.z + right.z * 1.1 + fwd.z * 0.7);
  }
  const dd = distXZ(d.pos.x, d.pos.z, dest.x, dest.z);
  if (dd > 0.5) moveActor(d, dest.x, dest.z, dd > 5 ? 7 : 3.6, dt);
  else d.speedNow = 0;
}
function updateCivilian(c, dt) {
  if (!c.alive) return;
  const threat = G.enemies.find(e => e.alive && e.state === 'ATTACK' && c.pos.distanceTo(e.pos) < 9);
  if (threat) {
    const away = new THREE.Vector3(c.pos.x + (c.pos.x - threat.pos.x), 0, c.pos.z + (c.pos.z - threat.pos.z));
    moveActor(c, away.x, away.z, 3.1, dt);
    c.state = 'FLEE';
  } else c.state = 'COWER';
}

// ---------- Objectives ----------
function roomClear(room) { return G.enemies.filter(e => e.room === room).every(e => !e.alive); }
function objectiveMet(i) {
  const p = G.player;
  switch (i) {
    case 0: return G.introDone;
    case 1: return !world.colliders.includes(world.gateCollider);
    case 2: return roomClear('guest');
    case 3: return roomClear('f1');
    case 4: return roomClear('f2');
    case 5: { const h = G.enemies.find(e => e.isHvt); return !!h && !h.alive; }
    case 6: return G.intel >= 2;
    case 7: return !!G.wreckDemolished;
    case 8: return distXZ(p.pos.x, p.pos.z, world.exfil.x, world.exfil.z) < world.exfil.r && Math.abs(p.pos.y) < 0.6;
  }
  return false;
}
function checkObjectives() {
  if (G.phase !== 'playing' && G.phase !== 'intro') return;
  // Geronimo first-sight callout: first frustum + LOS contact, NO objective gate (H14)
  const hvt = G.enemies.find(e => e.isHvt);
  if (hvt && hvt.alive && !G.geronimoCalled && G.phase === 'playing') {
    const eye = eyePos(), to = new THREE.Vector3(hvt.pos.x - eye.x, (hvt.pos.y + 1.4) - eye.y, hvt.pos.z - eye.z);
    const d = to.length();
    if (d < 46) {
      const ang = to.normalize().angleTo(viewDir());
      if (ang < 0.78 && hasLOS(eye.x, eye.y, eye.z, hvt.pos.x, hvt.pos.y + 1.4, hvt.pos.z)) {
        G.geronimoCalled = true;
        callout('ZERO-4', 'Geronimo, Geronimo, Geronimo', 'geronimo', 999);
        logEvent('geronimo', 'GERONIMO contact');
      }
    }
  }
  let guard = 0;
  while (G.objIndex < 9 && objectiveMet(G.objIndex) && guard++ < 9) {
    const o = G.objectives[G.objIndex];
    o.done = true;
    audio.ensure(); audio.squelch();
    banner(o.id + ' COMPLETE — ' + o.name);
    logEvent('objective', o.id + ' ' + o.name);
    if (o.id === 'O3') callout('ZERO-3', 'Clear left! Guest house clear.', 'clear3', 60);
    if (o.id === 'O4') callout('ZERO-3', 'Clear left! Ground floor clear.', 'clear4', 60);
    if (o.id === 'O5') callout('ZERO-3', 'Clear left! Second floor clear.', 'clear5', 60);
    if (o.id === 'O6') callout('ZERO-4', 'Geronimo EKIA', 'ekia', 999);
    if (o.id === 'O2') callout('ZERO-2', 'Gate blown. Moving.', 'gate2', 60);
    if (o.id === 'O8') callout('ZERO-2', 'Wreck destroyed. Move to exfil.', 'wreck8', 60);
    G.objIndex++;
  }
  if (G.objIndex >= 9 && G.phase === 'playing') winMission();
}
function fmtTime(s) { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); }
function winMission() {
  if (G.phase === 'won' || G.phase === 'failed') return;
  G.phase = 'won'; G.wonAt = G.clock; G.reloading = null;
  document.getElementById('interactHint').style.display = 'none';
  G.grade = G.clock < 1500 ? 'S' : G.clock < 2100 ? 'A' : 'B';
  const acc = G.stats.shots ? Math.round(100 * G.stats.hits / G.stats.shots) : 0;
  document.getElementById('aarBody').innerHTML =
    'TIME ' + fmtTime(G.clock) + ' (raid clock 01:00 + ' + fmtTime(G.clock) + ')<br>' +
    'SHOTS ' + G.stats.shots + ' · HITS ' + G.stats.hits + ' · ACCURACY ' + acc + '%<br>' +
    'KILLS ' + G.stats.kills + ' · INTEL ' + G.intel + '/3 · OBJECTIVES 9/9<br>' +
    'SQUAD ' + G.squad.map(s => s.name + (s.wounded ? ' WOUNDED' : ' OK')).join(' · ') + '<br>' +
    '<span style="font-size:30px;color:#ffd76a">GRADE ' + G.grade + '</span>';
  document.getElementById('failOverlay').classList.add('hidden');
  document.getElementById('aarOverlay').classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
  audio.squelch(); logEvent('grade', G.grade); logEvent('won', 'mission complete ' + fmtTime(G.clock));
  banner('MISSION COMPLETE');
}

// ---------- Intro set-piece (H11) ----------
function updateIntro(dt) {
  G.introT += dt;
  const t = G.introT, r1 = world.razor1, r2 = world.razor2;
  r1.group.visible = true; r2.group.visible = true;
  if (t < 5) {
    const k = t / 5;
    r1.group.position.set(lerp(-34, -4, k), lerp(19, 11, k), lerp(52, 10, k));
    r1.group.rotation.y = Math.atan2(-4 - (-34), 10 - 52) + Math.PI;
    r2.group.position.set(lerp(34, 2, k), lerp(17, 13, k), lerp(46, 24, k));
  } else if (t < 8) {
    const k = (t - 5) / 3;
    r1.group.position.set(lerp(-4, 3.5, k), lerp(11, 2.2, k * k), lerp(10, 3, k));
    r1.group.rotation.z = k * 0.85; r1.group.rotation.y += dt * (1 + k * 4);
    if (k > 0.55 && Math.floor(t * 8) % 2 === 0) spawnPuff(r1.group.position.x, r1.group.position.y, r1.group.position.z, 0x8f8672, 2, 1.6, 0.4);
  } else if (!G.introCrashed) {
    G.introCrashed = true;
    r1.group.visible = false;
    world.wreck.group.visible = true; world.wreckCollider.active = true; world.smoke.visible = true;
    audio.stinger(); audio.heliStop();
    spawnPuff(3.5, 1, 3, 0x7a6c54, 30, 6, 2.2);
    logEvent('crash', 'RAZOR-1 down in courtyard');
    callout('ZERO-2', 'Razor 1 is down! We are on the ground — move!', 'crash', 99);
  }
  // camera tracks RAZOR-1 until boots down; player has NO agency (H11)
  const tp = r1.group.visible ? r1.group.position : new THREE.Vector3(3.5, 1.5, 3);
  const eye = eyePos();
  const dx = tp.x - eye.x, dy = tp.y - eye.y, dz = tp.z - eye.z;
  G.yaw = Math.atan2(-dx, -dz); G.pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.4, 0.6);
  if (t >= 9.5 && !G.introDone) {
    G.introDone = true; G.phase = 'playing';
    G.yaw = 0; G.pitch = 0; // face the gate (north, -Z)
    banner('INSERTION COMPLETE — BREACH THE GATE');
    logEvent('intro', 'boots on ground');
  }
}

// ---------- Player / doors / charges / frags update ----------
function updatePlayer(dt) {
  const p = G.player;
  if (G.reloading && isSprinting()) { G.reloading = null; logEvent('reloadCancel', 'sprint'); }
  if (G.reloading && G.clock >= G.reloading.endAt) finishReload();
  if (G.switching > 0) {
    G.switching -= dt;
    if (G.switching <= 0 && G.switchTo) { p.weapon = G.switchTo; G.switchTo = null; vm.setWeapon(p.weapon); }
  }
  let ix = 0, iz = 0;
  if (G.keys['KeyW'] || G.keys['ArrowUp']) iz -= 1;
  if (G.keys['KeyS'] || G.keys['ArrowDown']) iz += 1;
  if (G.keys['KeyA'] || G.keys['ArrowLeft']) ix -= 1;
  if (G.keys['KeyD'] || G.keys['ArrowRight']) ix += 1;
  ix += G.touchMove.x; iz += G.touchMove.y;
  const mLen = Math.hypot(ix, iz); if (mLen > 1) { ix /= mLen; iz /= mLen; }
  const sprint = isSprinting();
  const speed = sprint ? 6.8 : G.ads ? 2.2 : 4.2;
  // Camera basis: forward = (-sinYaw, -cosYaw), right = (cosYaw, -sinYaw)
  const fX = -Math.sin(G.yaw), fZ = -Math.cos(G.yaw);
  const rX = Math.cos(G.yaw), rZ = -Math.sin(G.yaw);
  const mx = rX * ix + fX * (-iz), mz = rZ * ix + fZ * (-iz);
  const ml = Math.hypot(mx, mz);
  p.speedNow = ml > 0.01 ? speed * Math.min(1, ml) : 0;
  if (ml > 0.01) {
    p.pos.x += (mx / ml) * Math.min(1, ml) * speed * dt;
    p.pos.z += (mz / ml) * Math.min(1, ml) * speed * dt;
    G._stepAcc = (G._stepAcc || 0) + speed * dt;
    if (G._stepAcc > 2.3) { G._stepAcc = 0; const inside = (p.pos.x > -14 && p.pos.x < 10 && p.pos.z > -13 && p.pos.z < 6); audio.footstep(inside); }
  }
  collideCircle(p.pos, p.radius, p.pos.y);
  p.pos.y = world.floorHeightAt(p.pos.x, p.pos.z, p.pos.y);
  p.floorY = p.pos.y;
  // continuous auto fire while held
  if (G.mouseDown) tryFire();
  // doors
  for (const d of world.doors) {
    const near = [...G.actors, null].some(a => {
      const px = a ? a.pos.x : p.pos.x, pz = a ? a.pos.z : p.pos.z;
      return Math.hypot(px - d.x, pz - (d.z + (d.id === 'guest' ? 0 : 0))) < 1.45 && Math.abs((a ? a.pos.y : p.pos.y) - d.floorY) < 1.4;
    });
    const wasOpen = d.open01 > 0.5;
    d.open01 = clamp(d.open01 + ((near ? 1 : 0) - d.open01) * Math.min(1, dt * (near ? 7 : 2.2)) + (near ? dt * 2.5 : 0), 0, 1);
    if (near && d.open01 < 1) d.open01 = Math.min(1, d.open01 + dt * 3.2);
    d.pivot.rotation.y = (d.id === 'guest' || d.id === 'hvt' ? Math.PI / 2 : 0) + d.open01 * 1.85;
    d.collider.active = d.open01 < 0.55;
    if (!wasOpen && d.open01 >= 0.5 && G.dog && G.dog.alive && !G.dog.wounded && !G.dog.holdPos) {
      // dog first through each breached room door (SQUAD)
      const through = new THREE.Vector3(d.x + Math.sin(G.yaw) * -2, 0, d.z + Math.cos(G.yaw) * -2);
      G.dog.holdPos = through; setTimeout(() => { if (G.dog) G.dog.holdPos = null; }, 2600);
      logEvent('dogEntry', d.id);
    }
  }
  // armed charge beeps + detonation
  const c = G.armedCharge;
  if (c) {
    const remain = c.detonateAt - G.clock;
    const pDist = Math.hypot(G.player.pos.x - c.x, G.player.pos.z - c.z);
    if (pDist < 6.4) hint('⚠ YOU ARE IN THE BLAST RADIUS — GET CLEAR (6 m)', 300);
    c.ring.material.opacity = 0.65 + Math.sin(G.clock * 9) * 0.3;
    c.blinker.visible = Math.sin(G.clock * (remain < 1 ? 26 : 10)) > 0;
    if (G.clock >= c.beepAt) { if (remain < 1.1) audio.beepFast(); else audio.beep(); c.beepAt = G.clock + (remain < 1.1 ? 0.18 : 0.5); }
    if (remain <= 0) detonateCharge();
  }
  // frags (bounce off current floor slab, never through it — H12)
  for (let i = G.fragsList.length - 1; i >= 0; i--) {
    const f = G.fragsList[i], m = f.mesh;
    f.vy -= 9.8 * dt;
    m.position.x += f.vx * dt; m.position.y += f.vy * dt; m.position.z += f.vz * dt;
    const fy = world.floorHeightAt(m.position.x, m.position.z, m.position.y - 1);
    if (m.position.y < fy + 0.1 && f.vy < 0) { m.position.y = fy + 0.1; f.vy *= -0.38; f.vx *= 0.65; f.vz *= 0.65; }
    if (G.clock >= f.fuseAt) { explodeAt(m.position.x, m.position.y, m.position.z, 7, 160, false); scene.remove(m); G.fragsList.splice(i, 1); }
  }
  // flashlight alerts the floor (periodic)
  if (G.flashlight && G.clock - G.flashAlertAt > 1) { G.flashAlertAt = G.clock; noiseEvent(p.pos.x, p.pos.z, 2, 'flashlight'); }
  // interact prompt
  updateInteractPrompt();
}
let _promptAt = 0;
function updateInteractPrompt() {
  if (window._hintHoldUntil && performance.now() < window._hintHoldUntil) return;
  if (G.clock - _promptAt < 0.15) return;
  _promptAt = G.clock;
  const p = G.player, h = document.getElementById('interactHint');
  let txt = '';
  if (distXZ(p.pos.x, p.pos.z, world.cachePos.x, world.cachePos.z) < 1.9 && Math.abs(p.pos.y) < 0.6) txt = '[E] AMMO CACHE' + (G.cacheUsed ? ' (USED)' : '');
  else if (world.intelItems.some(it => !it.taken && distXZ(p.pos.x, p.pos.z, it.pos.x, it.pos.z) < 1.5 && Math.abs(p.pos.y - it.pos.y) < 1.2)) txt = '[E] COLLECT INTEL';
  else { const ct = nearestChargeTarget(); if (ct) txt = '[E] PLANT CHARGE — ' + ct.label + ' (stand clear!)'; }
  if (txt) { h.textContent = txt; h.style.display = 'block'; }
  else if (h.dataset.prompt !== 'hold') h.style.display = 'none';
}

// ---------- HUD ----------
const mmCtx = document.getElementById('minimap').getContext('2d');
const cpCtx = document.getElementById('compassCv').getContext('2d');
let _objHtml = '';
function updateHUD() {
  const p = G.player; if (!p) return;
  const objHtml = G.objectives.map((o, i) =>
    '<div class="' + (o.done ? 'obj-done' : i === G.objIndex ? 'obj-active' : '') + '">' + (o.done ? '☑' : i === G.objIndex ? '▸' : '☐') + ' ' + o.id + ' ' + o.name + '</div>').join('');
  if (objHtml !== _objHtml) { _objHtml = objHtml; document.getElementById('objectives').innerHTML = '<b>OBJECTIVES</b><br>' + objHtml; }
  const w = WEAPONS[p.weapon];
  document.getElementById('weaponName').textContent = w.name + (G.reloading ? ' — RELOADING' : G.switching > 0 ? ' — DRAWING' : '');
  document.getElementById('ammo').textContent = p.mags[p.weapon] + ' / ' + p.reserve[p.weapon];
  document.getElementById('gear').textContent = 'CHG ' + p.charges + ' · FRAG ' + p.frags + ' · INTEL ' + G.intel + '/3';
  document.getElementById('healthBar').style.width = clamp(p.hp, 0, 100) + '%';
  document.getElementById('healthBar').style.background = p.hp < 30 ? '#e03131' : 'linear-gradient(90deg,#2f9e44,#69db7c)';
  document.getElementById('healthTxt').textContent = Math.ceil(p.hp);
  const raidSec = 3600 + Math.floor(G.clock);
  document.getElementById('clock').textContent = '01:' + String(Math.floor((raidSec % 3600) / 60)).padStart(2, '0') + ':' + String(raidSec % 60).padStart(2, '0') + ' · T+' + fmtTime(G.clock);
  document.getElementById('squadStatus').innerHTML = G.squad.map(s => s.name + ' ' + (s.wounded ? '<span style="color:#ff8a7a">DOWN</span>' : Math.round(s.hp) + ' HP')).join('<br>') + '<br>CAIRO ' + (G.dog && G.dog.wounded ? '<span style="color:#ff8a7a">DOWN</span>' : 'OK');
  // damage direction
  const dd = document.getElementById('dmgDir');
  if (G.hurtFrom && G.clock - G.hurtAt < 1.4) {
    const ang = Math.atan2(G.hurtFrom.x - p.pos.x, -(G.hurtFrom.z - p.pos.z)) - G.yaw;
    dd.innerHTML = '<div style="position:absolute;left:-14px;top:-64px;font-size:30px;color:#ff4a3a;transform:rotate(' + (-ang) + 'rad)">▲</div>';
  } else dd.innerHTML = '';
  drawCompass(); drawMinimap();
  // crosshair target ID: friendlies named, hostiles silent (H18)
  let tid = '';
  const eye = eyePos(), dir = viewDir();
  for (const a of [...G.squad, G.dog]) {
    if (!a || !a.alive) continue;
    const tc = new THREE.Vector3(a.pos.x, a.pos.y + 1.3, a.pos.z);
    const to = tc.sub(eye); const d = to.length();
    if (d < 26 && to.normalize().angleTo(dir) < 0.06 && hasLOS(eye.x, eye.y, eye.z, a.pos.x, a.pos.y + 1.3, a.pos.z)) { tid = a.name; break; }
  }
  document.getElementById('targetId').textContent = tid;
}
function drawCompass() {
  const c = cpCtx; c.clearRect(0, 0, 360, 28);
  c.fillStyle = 'rgba(120,255,150,0.9)'; c.font = 'bold 13px monospace'; c.textAlign = 'center';
  const fX = -Math.sin(G.yaw), fZ = -Math.cos(G.yaw);
  const bearing = (Math.atan2(fX, -fZ) * 180 / Math.PI + 360) % 360;
  const pts = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  for (const [label, deg] of pts) {
    let off = deg - bearing; while (off > 180) off -= 360; while (off < -180) off += 360;
    const x = 180 + off * 2.2;
    if (x > -10 && x < 370) c.fillText(label, x, 19);
  }
  c.fillStyle = '#ffd76a'; c.fillText('▼', 180, 10);
}
function drawMinimap() {
  const c = mmCtx, S = 180, range = 27;
  const px = (x) => (x + range) / (range * 2) * S, pz = (z) => (z + range) / (range * 2) * S;
  c.fillStyle = '#04140a'; c.fillRect(0, 0, S, S);
  c.strokeStyle = 'rgba(140,255,160,0.55)'; c.lineWidth = 1.4;
  for (const [x1, z1, x2, z2] of world.minimapWalls) { c.beginPath(); c.moveTo(px(x1), pz(z1)); c.lineTo(px(x2), pz(z2)); c.stroke(); }
  c.strokeStyle = '#ffd76a'; c.beginPath(); c.arc(px(world.exfil.x), pz(world.exfil.z), world.exfil.r / (range * 2) * S, 0, 7); c.stroke();
  const cur = G.objectives[G.objIndex];
  if (cur) { c.fillStyle = '#ffd76a'; c.font = '13px monospace'; c.fillText('★', px(cur.tx) - 5, pz(cur.tz) + 5); }
  for (const e of G.enemies) { // red dots for ATTACK-state hostiles ONLY
    if (!e.alive || e.state !== 'ATTACK') continue;
    c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(px(e.pos.x), pz(e.pos.z), 3, 0, 7); c.fill();
  }
  for (const s of G.squad) { if (s.alive) { c.fillStyle = '#d9ffd9'; c.beginPath(); c.arc(px(s.pos.x), pz(s.pos.z), 3.4, 0, 7); c.fill(); c.fillStyle = '#2f9e44'; c.beginPath(); c.arc(px(s.pos.x), pz(s.pos.z), 2.4, 0, 7); c.fill(); } }
  if (G.dog && G.dog.alive) { c.fillStyle = '#ffd76a'; c.beginPath(); c.arc(px(G.dog.pos.x), pz(G.dog.pos.z), 2.2, 0, 7); c.fill(); }
  const p = G.player;
  c.save(); c.translate(px(p.pos.x), pz(p.pos.z));
  c.rotate(Math.atan2(-Math.sin(G.yaw), Math.cos(G.yaw)) + Math.PI);
  c.fillStyle = '#bfffc4'; c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 5); c.lineTo(0, 2.4); c.lineTo(-4, 5); c.closePath(); c.fill();
  c.restore();
}

// ---------- Animation / FX tick ----------
function animateActors(dt) {
  const t = G.clock;
  for (const a of G.actors) {
    const rig = a.rig;
    rig.group.rotation.y = a.yaw;
    if (a.isDog) { if (rig.dogStrobe) rig.dogStrobe.material.emissiveIntensity = (t % 1.1) < 0.1 ? 4 : 0.25; if (a.alive && !a.wounded) animateDog(rig, dt, a.speedNow || 0); continue; }
    const dead01 = !a.alive ? clamp((t - a.deathAt) / 0.5, 0, 1) : a.wounded ? 1 : -1;
    const aiming = a.alive && (a.state === 'ATTACK' || a.aimingNow);
    animateHuman(rig, dt, {
      speed: a.speedNow || 0, aiming, cowering: a.kind.startsWith('civilian') && a.state === 'COWER',
      reloading: t < a.reloadingUntil, dead01,
      aimPitch: 0,
    });
    if (rig.strobe) rig.strobe.material.emissiveIntensity = (t % 1.1) < 0.1 ? 4 : 0.25; // BLUE strobe blink
  }
  // player camera + viewmodel
  const p = G.player;
  const targetFov = G.ads ? 46 : G.nvg ? 60 : 72;
  camera.fov = lerp(camera.fov, targetFov, Math.min(1, dt * 11)); camera.updateProjectionMatrix();
  const bob = (G.mouseDown || true) && (G.keys['KeyW'] || G.keys['KeyA'] || G.keys['KeyS'] || G.keys['KeyD']) ? Math.sin(t * 9) * 0.018 : 0;
  camera.position.set(p.pos.x, p.pos.y + 1.62 + bob, p.pos.z);
  camera.rotation.order = 'YXZ'; camera.rotation.y = G.yaw; camera.rotation.x = G.pitch; camera.rotation.z = 0;
  const adsK = G.ads ? 1 : 0;
  G.vmKick = Math.max(0, (G.vmKick || 0) - dt * 9);
  vm.group.position.x = lerp(vm.group.position.x, adsK ? 0 : 0.27, Math.min(1, dt * 12));
  vm.group.position.y = lerp(vm.group.position.y, adsK ? -0.148 : -0.235, Math.min(1, dt * 12));
  vm.group.position.z = lerp(vm.group.position.z, adsK ? -0.42 : -0.55, Math.min(1, dt * 12)) + G.vmKick * 0.045;
  if (G.reloading) vm.group.rotation.x = 0.55; else if (G.switching > 0) vm.group.rotation.x = -0.7; else vm.group.rotation.x = 0;
  // NVG animated noise via grade flicker
  if (G.nvg) document.getElementById('nvgGrade').style.opacity = 0.85 + Math.sin(t * 31) * 0.08 + Math.sin(t * 7.3) * 0.05;
  // FX pools
  for (let i = G.tracers.length - 1; i >= 0; i--) { const tr = G.tracers[i]; tr.life -= dt; tr.line.material.opacity = Math.max(0, tr.life / 0.07); if (tr.life <= 0) { scene.remove(tr.line); tr.line.geometry.dispose(); G.tracers.splice(i, 1); } }
  for (let i = G.shells.length - 1; i >= 0; i--) { const s = G.shells[i]; s.life -= dt; s.vy -= 6 * dt; s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt; s.mesh.rotation.x += s.spin * dt; if (s.life <= 0) { scene.remove(s.mesh); G.shells.splice(i, 1); } }
  for (let i = G.puffs.length - 1; i >= 0; i--) { const pf = G.puffs[i]; pf.life -= dt; pf.mesh.position.x += pf.vx * dt; pf.mesh.position.y += pf.vy * dt; pf.mesh.position.z += pf.vz * dt; pf.vy *= 0.92; pf.mesh.material.opacity = Math.max(0, pf.life * 0.75); const sc = pf.mesh.scale.x + dt * 0.9; pf.mesh.scale.set(sc, sc, 1); if (pf.life <= 0) { scene.remove(pf.mesh); G.puffs.splice(i, 1); } }
}

// ---------- Mission flow ----------
function startMission() {
  audio.ensure(); audio.windStart();
  // remove old actor rigs
  for (const a of G.actors) scene.remove(a.rig.group);
  for (const f of G.fragsList) scene.remove(f.mesh);
  for (const tr of G.tracers) scene.remove(tr.line);
  for (const s of G.shells) scene.remove(s.mesh);
  for (const pf of G.puffs) scene.remove(pf.mesh);
  if (G.armedCharge) { scene.remove(G.armedCharge.mesh); scene.remove(G.armedCharge.ring); if (G.armedCharge.disc) scene.remove(G.armedCharge.disc); scene.remove(G.armedCharge.blinker); }
  const keepFrames = G.framesRendered, keepTel = G.teleportsUsed;
  G = freshState(); G.framesRendered = keepFrames; G.teleportsUsed = keepTel;
  G.fragsList = []; G.introT = 0; G.phase = 'intro';
  actorSeq = 0; spawnActors();
  // world reset
  if (!world.colliders.includes(world.gateCollider)) world.colliders.push(world.gateCollider);
  world.gateGroup.visible = true;
  world.wreck.group.visible = false; world.wreckCollider.active = false; world.smoke.visible = false;
  if (!world.colliders.includes(world.wreckCollider)) world.colliders.push(world.wreckCollider);
  for (const it of world.intelItems) { it.taken = false; it.mesh.visible = true; }
  world.cacheUsed = false;
  for (const d of world.doors) { d.open01 = 0; d.collider.active = true; }
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('failOverlay').classList.add('hidden');
  document.getElementById('aarOverlay').classList.add('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');
  document.getElementById('vignette').style.opacity = 0;
  vm.setWeapon('hk416');
  flashLightObj.intensity = 0; nvgLight.intensity = 0;
  renderer.toneMappingExposure = 1.32;
  document.getElementById('nvgGrade').style.opacity = 0;
  document.getElementById('nvgTag').textContent = 'NVG OFF';
  audio.heliStart();
  logEvent('start', 'insertion seed ' + SEED);
}
document.getElementById('startBtn').addEventListener('click', startMission);
document.getElementById('failRestartBtn').addEventListener('click', startMission);
document.getElementById('aarRestartBtn').addEventListener('click', startMission);

// ---------- Debug hooks ----------
let frameCount = 0, teleportCount = 0;
function snapPos(v) { return { x: Math.round(v.x * 100) / 100, y: Math.round(v.y * 100) / 100, z: Math.round(v.z * 100) / 100 }; }
function snapshot() {
  const p = G.player;
  const alertRank = { PATROL: 0, SUSPICIOUS: 1, SEARCH: 1, ATTACK: 2, DEAD: 0 };
  const alertLevel = G.enemies.reduce((m, e) => Math.max(m, alertRank[e.state] || 0), 0);
  return {
    seed: SEED, phase: G.phase, paused: G.phase === 'paused', clock: Math.round(G.clock * 10) / 10,
    framesRendered: frameCount, teleportsUsed: teleportCount,
    objectives: G.objectives.map((o, i) => ({ id: o.id, name: o.name, done: o.done, active: i === G.objIndex })),
    objIndex: G.objIndex,
    player: p ? { pos: snapPos(p.pos), hp: Math.round(p.hp), weapon: p.weapon, mag: p.mags[p.weapon], ammo: { mag: p.mags[p.weapon], reserve: p.reserve[p.weapon] }, reserve: { ...p.reserve }, mags: { ...p.mags }, charges: p.charges, frags: p.frags, nvg: G.nvg, flashlight: G.flashlight, reloading: !!G.reloading, floorY: Math.round(world.floorHeightAt(p.pos.x, p.pos.z, p.pos.y) * 100) / 100, yaw: G.yaw, pitch: G.pitch } : null,
    squad: G.squad.map(s => ({ name: s.name, pos: snapPos(s.pos), hp: Math.round(s.hp), wounded: s.wounded, alive: s.alive, floorY: Math.round(world.floorHeightAt(s.pos.x, s.pos.z, s.pos.y) * 100) / 100 })),
    dog: G.dog ? { name: 'CAIRO', pos: snapPos(G.dog.pos), hp: Math.round(G.dog.hp), wounded: G.dog.wounded, alive: G.dog.alive, floorY: Math.round(world.floorHeightAt(G.dog.pos.x, G.dog.pos.z, G.dog.pos.y) * 100) / 100 } : null,
    enemies: G.enemies.map(e => ({ id: e.id, pos: snapPos(e.pos), state: e.state, armed: e.armed, hp: Math.round(e.hp), alive: e.alive, floorY: Math.round(world.floorHeightAt(e.pos.x, e.pos.z, e.pos.y) * 100) / 100, room: e.room })),
    civilians: G.civilians.map(c => ({ id: c.id, pos: snapPos(c.pos), hp: Math.round(c.hp), alive: c.alive, armed: false, floorY: Math.round(world.floorHeightAt(c.pos.x, c.pos.z, c.pos.y) * 100) / 100 })),
    alertLevel: ['PATROL', 'SUSPICIOUS', 'ATTACK'][alertLevel],
    intel: G.intel, stats: { shots: G.stats.shots, hits: G.stats.hits, kills: G.stats.kills, accuracy: G.stats.shots ? Math.round(1000 * G.stats.hits / G.stats.shots) / 10 : 0, time: Math.round(G.clock * 10) / 10 },
    grade: G.grade || '', geronimoCalled: G.geronimoCalled, cacheUsed: G.cacheUsed,
    armedCharge: G.armedCharge ? { target: G.armedCharge.target, x: G.armedCharge.x, z: G.armedCharge.z, detonateAt: G.armedCharge.detonateAt } : null,
    events: G.events.slice(-220), sounds: audio.played.slice(-120),
  };
}
Object.defineProperty(window, '__game', { get: snapshot, configurable: true });
window.__debug = {
  teleport(x, y, z) {
    teleportCount++; G.teleportsUsed = teleportCount;
    G.player.pos.set(x, y, z);
    G.player.pos.y = world.floorHeightAt(x, z, y);
    G.player.floorY = G.player.pos.y;
    return true;
  },
  lookAt(x, y, z) {
    const eye = eyePos();
    const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
    G.yaw = Math.atan2(-dx, -dz);
    G.pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -1.35, 1.35);
    return true;
  },
  fire() { tryFire(); return true; },
  async press(code, ms) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise(r => setTimeout(r, ms || 120));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    return true;
  },
  damage(n) { damagePlayer(n, null); return true; },
  restart() { startMission(); return true; },
  start() { startMission(); return true; },
  lockLost() { pauseGame('lock'); return true; },
  resume() { resumeGame(); return true; },
};

// ---------- Main loop ----------
const clockT = new THREE.Clock();
function simulate(dt) {
  if (G.phase === 'intro') { G.clock += dt; updateIntro(dt); world.updateFx(dt, G.clock); }
  else if (G.phase === 'playing') {
    G.clock += dt;
    updatePlayer(dt);
    for (const e of G.enemies) updateEnemy(e, dt);
    for (const s of G.squad) updateSquad(s, dt);
    if (G.dog) updateDog(G.dog, dt);
    for (const c of G.civilians) updateCivilian(c, dt);
    world.updateFx(dt, G.clock);
    checkObjectives();
  }
}
function tick() {
  requestAnimationFrame(tick);
  // Substep the sim (<=50ms steps) so game time tracks real time even on
  // slow software renderers; rendering happens once per frame.
  let remain = Math.min(clockT.getDelta(), 0.5);
  const dt = remain;
  try {
    while (remain > 0.0001) { const step = Math.min(0.05, remain); simulate(step); remain -= step; }
    if (G.phase === 'playing' || G.phase === 'intro' || G.phase === 'menu') {
      animateActors(dt);
      updateHUD();
    } else if (G.player) {
      camera.position.set(G.player.pos.x, G.player.pos.y + 1.62, G.player.pos.z);
      camera.rotation.order = 'YXZ'; camera.rotation.y = G.yaw; camera.rotation.x = G.pitch;
    }
    if (G.phase === 'menu' && G.player) {
      // menu orbit over the compound
      const t = performance.now() / 1000;
      camera.position.set(Math.sin(t * 0.07) * 26, 15, Math.cos(t * 0.07) * 26);
      camera.lookAt(0, 1, 0);
    }
    renderer.render(scene, camera);
    frameCount++; G.framesRendered = frameCount;
  } catch (err) {
    errBox.textContent = 'Error: ' + err.message; errBox.style.display = 'block';
    console.error(err);
  }
}
tick();





