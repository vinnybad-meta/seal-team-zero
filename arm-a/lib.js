import * as THREE from 'three';

// ---------- Seeded RNG (H7: no Math.random in gameplay paths) ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class RNG {
  constructor(seed) { this.f = mulberry32(seed); }
  next() { return this.f(); }
  range(a, b) { return a + (b - a) * this.f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length) % arr.length]; }
  chance(p) { return this.f() < p; }
}

// ---------- Math utils ----------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function distXZ(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
export function yawToward(fx, fz, tx, tz) { return Math.atan2(tx - fx, tz - fz); }
export function angleDelta(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
export function turnToward(cur, target, maxStep) { const d = angleDelta(target, cur); return cur + clamp(d, -maxStep, maxStep); }

// ---------- Procedural WebAudio (zero files) ----------
export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.played = []; this.noiseBuf = null;
    this.heliNodes = null;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = (w * 0.55 + last * 1.6) * 0.7; }
      return true;
    } catch (e) { return false; }
  }
  log(name) { this.played.push({ t: performance.now() / 1000, name }); if (this.played.length > 400) this.played.shift(); }
  env(gainNode, t0, peak, dur) {
    gainNode.gain.setValueAtTime(0.0001, t0);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  noise(peak, dur, freq, q, type) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    src.playbackRate.value = 0.7 + Math.random() * 0.5;
    const f = this.ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q || 0.8;
    const g = this.ctx.createGain(); this.env(g, t0, peak, dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }
  tone(freq, dur, peak, type, slideTo) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = this.ctx.createGain(); this.env(g, t0, peak, dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  vol(dist, maxDist) { return clamp(1 - dist / (maxDist || 90), 0.04, 1); }
  shot(kind, dist) {
    const v = this.vol(dist, 110);
    if (kind === 'hk416') { this.noise(0.5 * v, 0.16, 2600, 0.6); this.tone(170, 0.09, 0.3 * v, 'triangle', 60); this.log('shot:hk416'); }
    else if (kind === 'mp7') { this.noise(0.85 * v, 0.22, 1800, 0.5); this.tone(130, 0.13, 0.45 * v, 'square', 50); this.log('shot:mp7'); }
    else if (kind === 'p226') { this.noise(0.7 * v, 0.18, 2000, 0.5); this.tone(150, 0.1, 0.4 * v, 'square', 55); this.log('shot:p226'); }
    else { this.noise(0.65 * v, 0.2, 1500, 0.5); this.tone(120, 0.12, 0.4 * v, 'square', 48); this.log('shot:enemy'); }
  }
  squadShot(dist) { this.shot('hk416', dist); this.log('shot:squad'); }
  explosion(big) {
    this.noise(big ? 1.0 : 0.8, big ? 1.4 : 0.9, 420, 0.4);
    this.tone(64, big ? 1.1 : 0.7, 0.9, 'sine', 30);
    this.log(big ? 'explosion:big' : 'explosion:frag');
  }
  reload() { this.log('reload'); const s = (f, d) => setTimeout(() => this.tone(f, 0.05, 0.16, 'square'), d); s(900, 0); s(620, 260); s(1100, 520); }
  draw() { this.log('draw'); this.tone(700, 0.05, 0.12, 'square'); setTimeout(() => this.tone(980, 0.05, 0.12, 'square'), 110); }
  dryFire() { this.log('dry'); this.tone(1400, 0.04, 0.14, 'square'); }
  squelch() { this.log('squelch'); this.noise(0.14, 0.09, 3200, 2, 'bandpass'); setTimeout(() => this.noise(0.1, 0.07, 3000, 2, 'bandpass'), 130); }
  beep() { this.log('charge:beep'); this.tone(1250, 0.09, 0.2, 'square'); }
  beepFast() { this.log('charge:beepFast'); this.tone(1500, 0.06, 0.22, 'square'); }
  bark() { this.log('dog:bark'); this.tone(420, 0.11, 0.4, 'sawtooth', 240); setTimeout(() => this.tone(460, 0.1, 0.36, 'sawtooth', 230), 170); }
  stinger() { this.log('crash:stinger'); this.noise(0.9, 1.6, 700, 0.5); this.tone(52, 1.4, 0.8, 'sine', 26); this.tone(1240, 0.5, 0.12, 'sawtooth', 300); }
  hit() { this.log('hitmarker'); this.tone(2100, 0.045, 0.16, 'square'); }
  hurt() { this.log('player:hurt'); this.tone(210, 0.16, 0.3, 'sawtooth', 120); }
  footstep(inside) { this.noise(0.1, 0.07, inside ? 900 : 520, 0.7); }
  pickup() { this.log('pickup'); this.tone(880, 0.07, 0.15, 'sine'); setTimeout(() => this.tone(1320, 0.08, 0.15, 'sine'), 90); }
  heliStart() {
    if (!this.ensure() || this.heliNodes) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.24, t0 + 2.5);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 11;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.12;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58;
    const og = this.ctx.createGain(); og.gain.value = 0.05;
    o.connect(og); og.connect(this.master);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); lfo.start(t0); o.start(t0);
    this.heliNodes = { src, lfo, o, g, og };
    this.log('heli:bed');
  }
  heliStop() {
    if (!this.heliNodes) return;
    const t0 = this.ctx.currentTime, h = this.heliNodes;
    try {
      h.g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
      h.og.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
      h.src.stop(t0 + 1.8); h.lfo.stop(t0 + 1.8); h.o.stop(t0 + 1.8);
    } catch (e) { /* already stopped */ }
    this.heliNodes = null; this.log('heli:stop');
  }
  windStart() {
    if (!this.ensure() || this.windNodes) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true; src.playbackRate.value = 0.32;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
    const g = this.ctx.createGain(); g.gain.value = 0.035;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.windNodes = { src, g }; this.log('ambient:wind');
  }
}

// ---------- Canvas textures ----------
export function makeCanvasTexture(w, h, paint, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}
function noiseOver(ctx, w, h, rng, n, alpha, dark) {
  for (let i = 0; i < n; i++) {
    const v = rng.int(0, 60);
    ctx.fillStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(${180 + v},${180 + v},${170 + v},${alpha})`;
    ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(2, 26), rng.range(2, 26));
  }
}
export function buildMaterials() {
  const rng = new RNG(1337);
  const plaster = makeCanvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#c4b699'; x.fillRect(0, 0, w, h);
    noiseOver(x, w, h, rng, 900, 0.05, true); noiseOver(x, w, h, rng, 380, 0.045, false);
    for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(88,74,52,0.10)'; const gx = rng.range(0, w); x.fillRect(gx, rng.range(0, h * 0.4), rng.range(1, 3), rng.range(30, 120)); }
  }, true);
  plaster.repeat.set(2, 1);
  const concrete = makeCanvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#8d8d88'; x.fillRect(0, 0, w, h);
    noiseOver(x, w, h, rng, 650, 0.12, true); noiseOver(x, w, h, rng, 240, 0.07, false);
  }, true);
  concrete.repeat.set(3, 1);
  const wood = makeCanvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#7a5a36'; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { x.fillStyle = `rgba(40,24,10,${0.1 + rng.next() * 0.22})`; x.fillRect(0, y, w, 1); }
    for (let i = 0; i < 8; i++) { x.strokeStyle = 'rgba(50,32,14,0.5)'; x.beginPath(); const y0 = rng.range(0, h); x.moveTo(0, y0); x.bezierCurveTo(w * 0.3, y0 + 6, w * 0.7, y0 - 6, w, y0); x.stroke(); }
  }, true);
  const metal = makeCanvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#5d6468'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(255,255,255,${rng.next() * 0.05})`; x.fillRect(rng.range(0, w), 0, 1, h); }
    noiseOver(x, w, h, rng, 120, 0.14, true);
  }, true);
  const scorch = makeCanvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#4a4d4a'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, 130);
    g.addColorStop(0, 'rgba(5,5,5,0.95)'); g.addColorStop(0.55, 'rgba(20,16,12,0.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    noiseOver(x, w, h, rng, 200, 0.2, true);
  }, true);
  const camo = makeCanvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#2e4030'; x.fillRect(0, 0, w, h);
    const cols = ['#22301f', '#3d5238', '#57704a', '#1c2818'];
    for (let i = 0; i < 90; i++) { x.fillStyle = cols[i % 4]; x.beginPath(); x.ellipse(rng.range(0, w), rng.range(0, h), rng.range(10, 42), rng.range(6, 20), rng.range(0, 3), 0, 7); x.fill(); }
    x.fillStyle = 'rgba(210,220,200,0.85)'; x.fillRect(14, 20, 30, 16);
    x.fillStyle = '#16240f'; x.font = 'bold 10px monospace'; x.fillText('Z-0', 20, 32);
  }, true);
  const groundTex = makeCanvasTexture(512, 512, (x, w, h) => {
    x.fillStyle = '#4c4636'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = rng.int(-26, 30); x.fillStyle = `rgba(${96 + v},${88 + v},${64 + v},0.5)`; x.fillRect(rng.range(0, w), rng.range(0, h), rng.range(2, 9), rng.range(2, 9)); }
    for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(52,64,34,0.55)'; x.beginPath(); x.ellipse(rng.range(0, w), rng.range(0, h), rng.range(14, 60), rng.range(10, 34), rng.range(0, 3), 0, 7); x.fill(); }
  }, true);
  groundTex.repeat.set(10, 10);
  const faceTex = (skin, hostileEyes) => makeCanvasTexture(128, 128, (x, w, h) => {
    x.fillStyle = skin; x.fillRect(0, 0, w, h);
    noiseOver(x, w, h, rng, 90, 0.06, true);
    x.fillStyle = '#fff'; x.fillRect(30, 52, 20, 11); x.fillRect(78, 52, 20, 11);
    x.fillStyle = hostileEyes ? '#3a0d0d' : '#1c1c22'; x.fillRect(36, 55, 8, 6); x.fillRect(84, 55, 8, 6);
    x.fillStyle = 'rgba(90,50,40,0.55)'; x.fillRect(60, 66, 7, 16);
    x.fillStyle = 'rgba(70,30,26,0.8)'; x.fillRect(46, 98, 36, 6);
    x.fillStyle = 'rgba(60,40,30,0.5)'; x.fillRect(24, 40, 80, 7);
  });
  const tunic = makeCanvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#c9bfa5'; x.fillRect(0, 0, w, h);
    noiseOver(x, w, h, rng, 300, 0.09, true);
    x.fillStyle = 'rgba(120,100,70,0.5)'; x.fillRect(0, 120, w, 10);
  }, true);
  const clothLight = makeCanvasTexture(128, 128, (x, w, h) => { x.fillStyle = '#e8e2d2'; x.fillRect(0, 0, w, h); noiseOver(x, w, h, rng, 160, 0.07, true); }, true);
  const M = (map, rough, metal2, color) => new THREE.MeshStandardMaterial({ map: map || null, color: color || 0xffffff, roughness: rough, metalness: metal2 || 0 });
  return {
    plaster: M(plaster, 0.94, 0), concrete: M(concrete, 0.9, 0.02), wood: M(wood, 0.8, 0),
    metal: M(metal, 0.42, 0.75), darkMetal: M(metal, 0.5, 0.7, 0x8a9296), scorch: M(scorch, 0.85, 0.25),
    camo: M(camo, 0.92, 0), ground: M(groundTex, 1, 0), tunic: M(tunic, 0.95, 0), clothLight: M(clothLight, 0.95, 0),
    faceOp: faceTex('#c89878', false), faceHostile: faceTex('#a87c58', true), faceCiv: faceTex('#d9b48c', false),
    skinOp: M(null, 0.65, 0, 0xc89878), skinMid: M(null, 0.65, 0, 0xa87c58), skinLight: M(null, 0.65, 0, 0xd9b48c),
    black: M(null, 0.6, 0.25, 0x14161a), rubber: M(null, 0.95, 0, 0x23211f), glass: new THREE.MeshPhysicalMaterial({ color: 0x9fc4d8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.55 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb45e, emissiveIntensity: 2.4, roughness: 0.4 }),
    strobeMat: new THREE.MeshStandardMaterial({ color: 0x223366, emissive: 0x2266ff, emissiveIntensity: 3 }),
    redMat: new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2.2 }),
  };
}

// ---------- Articulated rigs (MODEL BAR: never stacked-box statues) ----------
export function joint(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
}
export function part(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function headMesh(MATS, face) {
  const side = new THREE.MeshStandardMaterial({ map: face, roughness: 0.65 });
  const mats = [MATS.skinMid, MATS.skinMid, MATS.skinMid, MATS.skinMid, side, MATS.skinMid];
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.27, 0.25), mats);
  m.castShadow = true;
  return m;
}
export function buildHumanRig(kind, MATS) {
  // kind: operator | hostile | hostile2 | civilian | civilianF | hvt
  const g = new THREE.Group();
  const isOp = kind === 'operator', isHvt = kind === 'hvt', isCiv = kind.startsWith('civilian');
  const cloth = isOp ? MATS.camo : (isCiv || isHvt) ? MATS.clothLight : MATS.tunic;
  const skin = isOp ? MATS.skinOp : isCiv ? MATS.skinLight : MATS.skinMid;
  const face = isOp ? MATS.faceOp : isCiv ? MATS.faceCiv : MATS.faceHostile;
  const torso = part(g, 0.44, 0.62, 0.26, cloth, 0, 1.27, 0);
  if (isOp) { part(torso, 0.4, 0.42, 0.1, MATS.black, 0, 0.02, 0.15); part(torso, 0.34, 0.3, 0.06, MATS.camo, 0, 0, -0.15); }
  if (!isOp && !isCiv && !isHvt) part(torso, 0.46, 0.34, 0.28, MATS.tunic, 0, -0.42, 0); // long tunic skirt
  if (isHvt) part(torso, 0.3, 0.2, 0.05, MATS.clothLight, 0, 0.1, 0.14);
  const headJ = joint(g, 0, 1.6, 0);
  const head = headMesh(MATS, face); head.position.set(0, 0.14, 0); headJ.add(head);
  if (isOp) {
    part(headJ, 0.3, 0.14, 0.31, MATS.camo, 0, 0.3, 0); // FAST helmet
    part(headJ, 0.1, 0.09, 0.1, MATS.black, 0, 0.3, 0.17); // NVG mount
    part(headJ, 0.16, 0.1, 0.06, MATS.black, 0, 0.22, 0.2); // NVG tube
  } else if (!isCiv && !isHvt) {
    part(headJ, 0.28, 0.1, 0.28, MATS.clothLight, 0, 0.3, 0); // cap / turban wrap
  }
  const mkArm = (sideSign) => {
    const sh = joint(g, 0.27 * sideSign, 1.52, 0);
    part(sh, 0.13, 0.36, 0.14, cloth, 0, -0.17, 0);
    const el = joint(sh, 0, -0.35, 0);
    part(el, 0.11, 0.33, 0.12, cloth, 0, -0.15, 0);
    part(el, 0.1, 0.1, 0.1, skin, 0, -0.33, 0.01); // hand
    return { sh, el };
  };
  const mkLeg = (sideSign) => {
    const hip = joint(g, 0.12 * sideSign, 0.98, 0);
    part(hip, 0.17, 0.48, 0.19, cloth, 0, -0.24, 0);
    const knee = joint(hip, 0, -0.48, 0);
    part(knee, 0.15, 0.46, 0.17, cloth, 0, -0.22, 0);
    part(knee, 0.15, 0.08, 0.26, MATS.rubber, 0, -0.46, 0.05); // boot
    return { hip, knee };
  };
  const armL = mkArm(-1), armR = mkArm(1), legL = mkLeg(-1), legR = mkLeg(1);
  let gun = null;
  if (!isCiv) {
    gun = new THREE.Group();
    part(gun, 0.07, 0.13, 0.62, MATS.black, 0, 0, 0.18);
    part(gun, 0.05, 0.16, 0.1, MATS.darkMetal, 0, -0.1, 0.1); // mag
    part(gun, 0.03, 0.03, 0.22, MATS.darkMetal, 0, 0.05, 0.55); // barrel
    part(gun, 0.09, 0.07, 0.09, MATS.black, 0, 0.12, 0.05); // sight
    gun.position.set(0.16, 1.38, 0.22);
    g.add(gun);
  }
  let strobe = null;
  if (isOp) {
    strobe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), MATS.strobeMat.clone());
    strobe.position.set(-0.2, 1.78, -0.05); g.add(strobe);
  }
  const rig = { group: g, headJ, torso, armL, armR, legL, legR, gun, strobe, kind, walkPhase: 0, flinchT: 0, deathT: -1, swaySeed: (buildHumanRig._n = (buildHumanRig._n || 0) + 1.37) % 10 };
  g.userData.rig = rig;
  return rig;
}
export function animateHuman(rig, dt, o) {
  // o: {speed, aimPitch, aiming, cowering, reloading, dead01}
  const t = performance.now() / 1000;
  if (o.dead01 >= 0) {
    const d = Math.min(1, o.dead01);
    rig.group.rotation.x = -1.52 * d;
    rig.legL.hip.rotation.x = 0.12 * d; rig.legR.hip.rotation.x = -0.08 * d;
    rig.armL.sh.rotation.x = -0.4 * d; rig.armR.sh.rotation.x = 0.3 * d;
    return;
  }
  rig.group.rotation.x = 0;
  const sp = o.speed || 0;
  rig.walkPhase += dt * (2.2 + sp * 2.6);
  const sw = Math.sin(rig.walkPhase), cw = Math.cos(rig.walkPhase);
  const amp = clamp(sp * 0.24, 0, 0.62);
  rig.legL.hip.rotation.x = sw * amp; rig.legR.hip.rotation.x = -sw * amp;
  rig.legL.knee.rotation.x = Math.max(0, -cw) * amp * 0.9 + 0.04;
  rig.legR.knee.rotation.x = Math.max(0, cw) * amp * 0.9 + 0.04;
  const idle = Math.sin(t * 1.7 + rig.swaySeed) * 0.02;
  rig.torso.rotation.z = idle; rig.headJ.rotation.z = idle * 0.7;
  rig.headJ.rotation.y = Math.sin(t * 0.43 + rig.swaySeed * 2) * (o.aiming ? 0.03 : 0.14);
  if (o.cowering) {
    rig.torso.rotation.x = 0.55; rig.headJ.rotation.x = 0.4;
    rig.armL.sh.rotation.x = -2.6; rig.armR.sh.rotation.x = -2.6;
    rig.armL.el.rotation.x = -0.7; rig.armR.el.rotation.x = -0.7;
    rig.legL.hip.rotation.x = -1.5; rig.legR.hip.rotation.x = -1.5;
    rig.legL.knee.rotation.x = 1.6; rig.legR.knee.rotation.x = 1.6;
    return;
  }
  if (o.aiming) {
    rig.armR.sh.rotation.x = -1.32 + (o.aimPitch || 0);
    rig.armR.el.rotation.x = -0.18;
    rig.armL.sh.rotation.x = -1.05 + (o.aimPitch || 0) * 0.8;
    rig.armL.sh.rotation.z = 0.55; rig.armL.el.rotation.x = -0.85;
    if (rig.gun) { rig.gun.rotation.x = -(o.aimPitch || 0); rig.gun.position.y = 1.44; }
  } else {
    rig.armL.sh.rotation.x = -sw * amp * 0.7 - 0.12; rig.armR.sh.rotation.x = sw * amp * 0.7 - 0.12;
    rig.armL.el.rotation.x = -0.35; rig.armR.el.rotation.x = -0.5;
    rig.armL.sh.rotation.z = 0.1; rig.armR.sh.rotation.z = -0.1;
    if (rig.gun) { rig.gun.rotation.x = 0.5; rig.gun.position.y = 1.3; }
  }
  if (o.reloading) { rig.armR.sh.rotation.x = -0.6; rig.armR.el.rotation.x = -1.3; if (rig.gun) rig.gun.rotation.x = 0.7; }
  if (rig.flinchT > 0) {
    rig.flinchT -= dt;
    const f = Math.max(0, rig.flinchT) * 5;
    rig.torso.rotation.x = -0.16 * f; rig.headJ.rotation.x = 0.2 * f;
    rig.group.position.x += Math.sin(t * 70) * 0.008 * f;
  } else { rig.torso.rotation.x = 0; rig.headJ.rotation.x = 0; }
}
export function buildDogRig(MATS) {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x6b5636, roughness: 0.95 });
  const body = part(g, 0.26, 0.3, 0.68, coat, 0, 0.42, 0);
  part(body, 0.2, 0.1, 0.5, MATS.black, 0, 0.18, 0); // harness
  const headJ = joint(g, 0, 0.52, 0.4);
  part(headJ, 0.2, 0.2, 0.24, coat, 0, 0, 0.06);
  part(headJ, 0.11, 0.1, 0.18, coat, 0, -0.04, 0.24); // muzzle
  part(headJ, 0.05, 0.14, 0.03, coat, -0.08, 0.16, 0); part(headJ, 0.05, 0.14, 0.03, coat, 0.08, 0.16, 0); // ears
  const legs = [];
  [[-0.09, 0.26], [0.09, 0.26], [-0.09, -0.26], [0.09, -0.26]].forEach(([lx, lz]) => {
    const hip = joint(g, lx, 0.34, lz);
    part(hip, 0.08, 0.34, 0.09, coat, 0, -0.17, 0);
    legs.push(hip);
  });
  const tail = joint(g, 0, 0.52, -0.36);
  part(tail, 0.05, 0.05, 0.3, coat, 0, 0.05, -0.14);
  return { group: g, headJ, legs, tail, phase: 0 };
}
export function animateDog(rig, dt, speed) {
  rig.phase += dt * (4 + speed * 5);
  const a = Math.sin(rig.phase) * clamp(speed * 0.3, 0.08, 0.5);
  rig.legs[0].rotation.x = a; rig.legs[3].rotation.x = a;
  rig.legs[1].rotation.x = -a; rig.legs[2].rotation.x = -a;
  rig.tail.rotation.y = Math.sin(rig.phase * 0.7) * 0.4;
  rig.headJ.rotation.x = 0.08 + Math.sin(rig.phase * 0.5) * 0.04;
  rig.headJ.position.y = 0.52 + Math.abs(Math.sin(rig.phase)) * 0.02; // <=2cm bob, feet stay planted (H17)
}
export function buildHelicopter(MATS, wrecked) {
  const g = new THREE.Group();
  const bodyMat = wrecked ? MATS.scorch : MATS.darkMetal;
  const body = new THREE.Group(); g.add(body);
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.05, 5.2, 4, 10), bodyMat);
  hull.rotation.z = Math.PI / 2; hull.castShadow = true; body.add(hull);
  hull.scale.set(1, 1, 0.82);
  part(body, 1.7, 1.1, 2.0, MATS.glass, 0, 0.25, 2.9); // cockpit glass
  part(body, 0.5, 0.5, 6.4, bodyMat, 0, 0.55, -5.4); // tail boom
  part(body, 0.16, 1.5, 0.5, bodyMat, 0, 0.8, -8.4); // tail fin
  part(body, 2.6, 0.14, 0.5, MATS.black, 0, -1.05, 0.4); // skid cross
  part(body, 0.14, 0.14, 4.6, MATS.black, -1.15, -1.25, 0.4); part(body, 0.14, 0.14, 4.6, MATS.black, 1.15, -1.25, 0.4);
  const rotor = joint(body, 0, 1.35, 0.4);
  part(rotor, 11.5, 0.05, 0.34, MATS.black, 0, 0, 0); part(rotor, 0.34, 0.05, 11.5, MATS.black, 0, 0, 0);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.8, 32), new THREE.MeshBasicMaterial({ color: 0xaac4dd, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; rotor.add(disc);
  const tailRotor = joint(body, 0.3, 0.8, -8.4);
  part(tailRotor, 0.05, 1.7, 0.2, MATS.black, 0, 0, 0);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3333 }));
  navR.position.set(-1.1, 0.2, 1.2); body.add(navR);
  const navG = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0x33ff66 }));
  navG.position.set(1.1, 0.2, 1.2); body.add(navG);
  if (wrecked) {
    body.rotation.z = 0.32; body.rotation.x = 0.1; body.position.y = -0.35;
    body.children[2].rotation.y = 0.7; // bent tail boom
    disc.visible = false; // no blur disc on a wreck: rotors are stopped and bent
    rotor.rotation.y = 0.7; rotor.rotation.z = 0.12;
  }
  return { group: g, rotor, tailRotor, disc, body };
}
export function buildViewmodel(MATS) {
  // Returns {group, muzzles:{key:Vector3 offset}, setWeapon(key)} — per-weapon viewmodels (H12)
  const g = new THREE.Group();
  const mkGun = (key) => {
    const gun = new THREE.Group();
    part(gun, 0.075, 0.13, 0.55, MATS.darkMetal, 0, 0, 0);
    part(gun, 0.05, 0.05, 0.4, MATS.black, 0, 0.085, 0.02); // top rail
    part(gun, 0.06, 0.2, 0.11, MATS.black, 0, -0.13, -0.05); // magazine
    part(gun, 0.05, 0.12, 0.05, MATS.black, 0, -0.1, 0.18); // foregrip
    part(gun, 0.09, 0.07, 0.1, MATS.black, 0, 0.12, 0.08); // sight housing
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.007, 8, 20), MATS.black);
    ring.position.set(0, 0.135, 0.08); gun.add(ring);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), MATS.redMat);
    dot.position.set(0, 0.135, 0.1); gun.add(dot);
    if (key === 'hk416') {
      part(gun, 0.045, 0.045, 0.34, MATS.darkMetal, 0, 0.02, 0.4); // barrel
      const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.24, 12), MATS.black);
      sup.rotation.x = Math.PI / 2; sup.position.set(0, 0.02, 0.62); sup.castShadow = true; gun.add(sup); // suppressor HK416 ONLY
    } else if (key === 'mp7') {
      part(gun, 0.04, 0.04, 0.2, MATS.darkMetal, 0, 0.02, 0.34); // bare muzzle
      gun.scale.setScalar(0.82);
    } else {
      part(gun, 0.035, 0.035, 0.14, MATS.darkMetal, 0, 0.03, 0.32); // bare pistol muzzle
      gun.scale.setScalar(0.7); gun.position.y = -0.03;
    }
    part(gun, 0.07, 0.09, 0.07, MATS.skinOp, -0.07, -0.1, 0.12); // support hand
    part(gun, 0.07, 0.09, 0.07, MATS.skinOp, 0.02, -0.12, -0.2); // grip hand
    gun.visible = false; g.add(gun);
    return gun;
  };
  const guns = { hk416: mkGun('hk416'), mp7: mkGun('mp7'), p226: mkGun('p226') };
  return {
    group: g, guns,
    setWeapon(key) { for (const k in guns) guns[k].visible = k === key; },
    muzzleLocal(key) { return key === 'hk416' ? new THREE.Vector3(0, 0.02, 0.74) : key === 'mp7' ? new THREE.Vector3(0, 0.02, 0.46) : new THREE.Vector3(0, 0.03, 0.42); },
  };
}

