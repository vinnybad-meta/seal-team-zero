import * as THREE from 'three';
import { part, joint, buildHelicopter, RNG } from './lib.js';

// Compound layout (meters). X east, Z south, Y up. Walls x[-16,16], z[-14,14].
export function buildWorld(scene, MATS) {
  const rng = new RNG(4242);
  const colliders = []; // {minX,maxX,minZ,maxZ,minY,maxY,gate?,wreck?,doorId?}
  const doors = [];
  const wallGroup = new THREE.Group(); scene.add(wallGroup);

  function box(minX, maxX, minZ, maxZ, minY, maxY, mat, parent, castShadow) {
    const w = maxX - minX, d = maxZ - minZ, h = maxY - minY;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    m.castShadow = !!castShadow; m.receiveShadow = true;
    (parent || wallGroup).add(m);
    return m;
  }
  function solid(minX, maxX, minZ, maxZ, minY, maxY, mat, opts) {
    opts = opts || {};
    const m = box(minX, maxX, minZ, maxZ, minY, maxY, mat, opts.parent, opts.shadow !== false);
    const c = { minX, maxX, minZ, maxZ, minY, maxY, mesh: m, tag: opts.tag || '' };
    colliders.push(c);
    return c;
  }

  // ----- Ground, fields, tree line, stars -----
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), MATS.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(33, 29), new THREE.MeshStandardMaterial({ color: 0x5a4f3a, roughness: 1 }));
  dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.02; dirt.receiveShadow = true; scene.add(dirt);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x1d3319, roughness: 1 });
  const trunkMat = MATS.wood;
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const r = rng.range(34, 62);
    const tx = Math.cos(a) * r, tz = Math.sin(a) * r;
    if (Math.abs(tx) < 20 && Math.abs(tz) < 18) continue;
    const tr = new THREE.Group(); tr.position.set(tx, 0, tz);
    part(tr, 0.3, 2.2, 0.3, trunkMat, 0, 1.1, 0);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(rng.range(1.6, 2.6), rng.range(3.4, 5.4), 7), treeMat);
    c1.position.y = 4.2; c1.castShadow = true; tr.add(c1);
    scene.add(tr);
  }
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 700; i++) {
    const a = rng.range(0, Math.PI * 2), e = rng.range(0.12, 1.4), r = 220;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcdd9ee, size: 0.9, sizeAttenuation: false, fog: false }));
  scene.add(stars);
  const glowTexC = document.createElement('canvas'); glowTexC.width = 256; glowTexC.height = 32;
  const gx = glowTexC.getContext('2d'); const grad = gx.createLinearGradient(0, 32, 0, 0);
  grad.addColorStop(0, 'rgba(70,90,130,0.55)'); grad.addColorStop(1, 'rgba(70,90,130,0)');
  gx.fillStyle = grad; gx.fillRect(0, 0, 256, 32);
  const glowTex = new THREE.CanvasTexture(glowTexC);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(300, 26), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false }));
    const a = i * Math.PI / 2;
    p.position.set(Math.sin(a) * 150, 9, Math.cos(a) * 150); p.rotation.y = a + Math.PI; scene.add(p);
  }

  // ----- Perimeter walls (3.6m) with south gate gap x[0.5,3.5] at z=14 -----
  const W = MATS.plaster;
  solid(-16.4, 0.5, 13.8, 14.2, 0, 3.6, W, { tag: 'wall' });
  solid(3.5, 16.4, 13.8, 14.2, 0, 3.6, W, { tag: 'wall' });
  solid(-16.4, 16.4, -14.2, -13.8, 0, 3.6, W, { tag: 'wall' });
  solid(-16.4, -15.8, -14.2, 14.2, 0, 3.6, W, { tag: 'wall' });
  solid(15.8, 16.4, -14.2, 14.2, 0, 3.6, W, { tag: 'wall' });
  // parapet caps
  box(-16.4, 16.4, 13.7, 14.3, 3.6, 3.85, MATS.concrete, wallGroup, true);
  box(-16.4, 16.4, -14.3, -13.7, 3.6, 3.85, MATS.concrete, wallGroup, true);
  // gate: two metal leaves (destroyed in O2)
  const gateGroup = new THREE.Group(); scene.add(gateGroup);
  const gateMat = MATS.metal.clone(); gateMat.color = new THREE.Color(0xc9d2d8);
  const gateLeafL = box(0.5, 2.0, 13.82, 14.05, 0, 3.0, gateMat, gateGroup, true);
  const gateLeafR = box(2.0, 3.5, 13.95, 14.18, 0, 3.0, gateMat, gateGroup, true);
  const gateCollider = { minX: 0.5, maxX: 3.5, minZ: 13.8, maxZ: 14.2, minY: 0, maxY: 3.0, mesh: gateLeafL, tag: 'gate' };
  colliders.push(gateCollider);

  // ----- Guest house x[-14,-7], z[-2,6], door east x=-7 z[1.4,2.6] -----
  const GH = { x0: -14, x1: -7, z0: -2, z1: 6 };
  solid(GH.x0, GH.x1, GH.z0 - 0.2, GH.z0, 0, 3.0, W, { tag: 'guest' });
  solid(GH.x0, GH.x1, GH.z1, GH.z1 + 0.2, 0, 3.0, W, { tag: 'guest' });
  solid(GH.x0 - 0.2, GH.x0, GH.z0, GH.z1, 0, 3.0, W, { tag: 'guest' });
  solid(GH.x1, GH.x1 + 0.2, GH.z0, 1.4, 0, 3.0, W, { tag: 'guest' });
  solid(GH.x1, GH.x1 + 0.2, 2.6, GH.z1, 0, 3.0, W, { tag: 'guest' });
  box(GH.x0 - 0.3, GH.x1 + 0.3, GH.z0 - 0.3, GH.z1 + 0.3, 3.0, 3.3, MATS.concrete, wallGroup, true); // roof
  box(GH.x0 - 0.35, GH.x1 + 0.35, GH.z0 - 0.35, GH.z0 - 0.28, 3.3, 3.75, MATS.concrete, wallGroup, true);
  box(GH.x0 - 0.35, GH.x1 + 0.35, GH.z1 + 0.28, GH.z1 + 0.35, 3.3, 3.75, MATS.concrete, wallGroup, true);

  // ----- Main house x[-6,10], z[-13,-4]; floors 0/3.2/6.4; shaft x[7.4,10] -----
  const MH = { x0: -6, x1: 10, z0: -13, z1: -4 };
  // exterior walls per floor height 0..9.6, south door gap x[-0.9,0.3]
  solid(MH.x0, MH.x1, MH.z0 - 0.2, MH.z0, 0, 9.6, W, { tag: 'house' });
  solid(MH.x0, -0.9, MH.z1, MH.z1 + 0.2, 0, 9.6, W, { tag: 'house' });
  solid(0.3, MH.x1, MH.z1, MH.z1 + 0.2, 0, 9.6, W, { tag: 'house' });
  solid(MH.x0 - 0.2, MH.x0, MH.z0, MH.z1, 0, 9.6, W, { tag: 'house' });
  solid(MH.x1, MH.x1 + 0.2, MH.z0, MH.z1, 0, 9.6, W, { tag: 'house' });
  // door lintel above south door
  box(-0.9, 0.3, MH.z1, MH.z1 + 0.2, 2.3, 9.6, W, wallGroup, true);
  // floor slabs + ceilings
  box(MH.x0, MH.x1, MH.z0, MH.z1, -0.25, 0, MATS.concrete, wallGroup, false);
  const slab2A = solid(MH.x0, 7.4, MH.z0, MH.z1, 3.2, 3.42, MATS.concrete, { tag: 'slab' });
  box(7.4, MH.x1, -9.0, -8.0, 3.2, 3.42, MATS.concrete, wallGroup, false); // landing F2 (no collider fn handles)
  const slab3A = solid(MH.x0, 7.4, MH.z0, MH.z1, 6.4, 6.62, MATS.concrete, { tag: 'slab' });
  box(7.4, MH.x1, -9.0, -4.0, 6.4, 6.62, MATS.concrete, wallGroup, false);
  box(7.4, MH.x1, -13.0, -12.5, 6.4, 6.62, MATS.concrete, wallGroup, false);
  box(MH.x0 - 0.3, MH.x1 + 0.3, MH.z0 - 0.3, MH.z1 + 0.3, 9.6, 9.9, MATS.concrete, wallGroup, true); // roof
  // parapets on roof
  box(MH.x0 - 0.3, MH.x1 + 0.3, MH.z0 - 0.32, MH.z0 - 0.24, 9.9, 10.4, MATS.concrete, wallGroup, true);
  box(MH.x0 - 0.3, MH.x1 + 0.3, MH.z1 + 0.24, MH.z1 + 0.32, 9.9, 10.4, MATS.concrete, wallGroup, true);
  // interior partition x=1 with door gap z[-7.4,-6.3] each floor
  for (let f = 0; f < 3; f++) {
    const y0 = f * 3.2;
    solid(0.9, 1.1, MH.z0, -7.4, y0, y0 + 3.2, W, { tag: 'partition' });
    solid(0.9, 1.1, -6.3, MH.z1, y0, y0 + 3.2, W, { tag: 'partition' });
    box(0.9, 1.1, -7.4, -6.3, y0 + 2.2, y0 + 3.2, W, wallGroup, false);
  }
  // shaft side wall x=7.4 with gaps: F2 landing z[-9,-8] (y 3.2..5.4 open), F3 arrival z[-13,-12.4]
  for (let f = 0; f < 3; f++) {
    const y0 = f * 3.2;
    if (f === 1) { solid(7.3, 7.5, MH.z0, -9.0, y0, y0 + 3.2, W, { tag: 'shaft' }); solid(7.3, 7.5, -8.0, MH.z1, y0, y0 + 3.2, W, { tag: 'shaft' }); }
    else if (f === 2) { solid(7.3, 7.5, -12.4, MH.z1, y0, y0 + 3.2, W, { tag: 'shaft' }); solid(7.3, 7.5, MH.z0, -13.0, y0, y0 + 3.2, W, { tag: 'shaft' }); box(7.3, 7.5, -13.0, -12.4, y0, y0 + 3.2, W, wallGroup, false); }
    else solid(7.3, 7.5, MH.z0, -4.9, y0, y0 + 3.2, W, { tag: 'shaft' }); // F1 stair entry gap z[-4.9,-4]
  }
  // under-flight barriers (keep feet on ramps, H17)
  solid(7.4, 10, -8.0, -6.5, 0, 1.2, MATS.concrete, { tag: 'understair' });
  solid(7.4, 10, -12.5, -10.8, 3.2, 4.4, MATS.concrete, { tag: 'understair' });
  // stair steps (visual) + railings
  const stepMat = MATS.concrete;
  for (let i = 0; i < 10; i++) {
    const zA = -4.6 - i * 0.36, yA = 0.16 + i * 0.32;
    box(7.6, 9.9, zA - 0.36, zA, yA - 0.16, yA, stepMat, wallGroup, false);
    const zB = -9.1 - i * 0.36, yB = 3.36 + i * 0.32;
    if (zB > -12.9) box(7.6, 9.9, zB - 0.36, zB, yB - 0.16, yB, stepMat, wallGroup, false);
  }
  box(7.55, 7.65, -8.2, -4.6, 1.0, 1.12, MATS.metal, wallGroup, false);
  box(7.55, 7.65, -12.6, -9.2, 4.2, 4.32, MATS.metal, wallGroup, false);
  box(7.55, 7.65, -9.2, -8.2, 4.2, 4.32, MATS.metal, wallGroup, false);
  // windows (glass, upper floors south) — visual only, walls stay solid
  for (const [wx, wy] of [[-4, 1.6], [4, 1.6], [-4, 4.8], [4, 4.8], [-4, 8.0], [4, 8.0]]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), MATS.glass);
    win.position.set(wx, wy, MH.z1 + 0.21); scene.add(win);
    box(wx - 0.7, wx + 0.7, MH.z1 + 0.18, MH.z1 + 0.22, wy - 0.6, wy - 0.52, MATS.wood, wallGroup, false);
  }

  // ----- Doors (swing on breach-entry) -----
  function makeDoor(x, z, yaw, id) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0, z); pivot.rotation.y = yaw; scene.add(pivot);
    const leaf = part(pivot, 1.15, 2.25, 0.07, MATS.wood, 0.57, 1.12, 0);
    const c = { minX: x - 0.7, maxX: x + 0.7, minZ: z - 0.35, maxZ: z + 0.35, minY: 0, maxY: 2.3, mesh: leaf, tag: 'door:' + id };
    // door colliders are floor-relative; game re-positions Y per floor doors
    colliders.push(c);
    const d = { id, pivot, leaf, collider: c, open01: 0, x, z, floorY: 0 };
    doors.push(d);
    return d;
  }
  const doorGuest = makeDoor(-6.9, 2.0, Math.PI / 2, 'guest');
  const doorMain = makeDoor(-0.9, -3.9, 0, 'main'); doorMain.collider.minY = 0;
  const doorF3 = makeDoor(1.0, -6.85, Math.PI / 2, 'hvt'); doorF3.floorY = 6.4;
  doorF3.collider.minY = 6.4; doorF3.collider.maxY = 8.7; doorF3.pivot.position.y = 6.4;

  // ----- Furniture (intel sits ON furniture) -----
  function furniture() {
    const F = new THREE.Group(); scene.add(F);
    const bed = (x, z, y, ry) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; F.add(g);
      part(g, 1.1, 0.28, 2.1, MATS.wood, 0, 0.2, 0); part(g, 1.05, 0.16, 1.95, MATS.clothLight, 0, 0.42, 0); part(g, 0.6, 0.12, 0.4, MATS.clothLight, 0, 0.5, -0.75); return g; };
    const table = (x, z, y, w, d) => { const g = new THREE.Group(); g.position.set(x, y, z); F.add(g);
      part(g, w || 1.5, 0.07, d || 0.9, MATS.wood, 0, 0.74, 0);
      [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]].forEach(([lx, lz]) => part(g, 0.08, 0.74, 0.08, MATS.wood, lx, 0.37, lz)); return g; };
    const chair = (x, z, y, ry) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; F.add(g);
      part(g, 0.45, 0.06, 0.45, MATS.wood, 0, 0.45, 0); part(g, 0.45, 0.6, 0.06, MATS.wood, 0, 0.78, -0.2); return g; };
    bed(-12.6, 4.6, 0, 0.2); table(-12.3, 2.2, 0); chair(-11.6, 2.2, 0, -1.2); chair(-13, 1.4, 0, 0.6);
    table(-8.2, 4.8, 0, 1.1, 0.7);
    bed(-4.4, -11.8, 0); table(4.8, -6.2, 0); chair(4.2, -6.2, 0, 1.4);
    part(F, 2.2, 0.9, 0.7, MATS.wood, 5.6, 0.45, -12.4); // kitchen counter F1
    bed(-4.4, -11.6, 3.2); table(-3.2, -6.4, 3.2); chair(-2.6, -6.4, 3.2, -1);
    part(F, 1.4, 0.78, 0.6, MATS.wood, 4.6, 3.59, -11.8); // F2 desk (laptop here)
    bed(0.2, -11.8, 6.4, 0.1); // HVT bed
    part(F, 1.3, 0.85, 0.55, MATS.wood, 5.2, 6.82, -12.2); // F3 dresser (drive here)
    table(-3.4, -7.6, 6.4); chair(-2.8, -7.6, 6.4, -1.2);
    // courtyard props
    part(F, 1.1, 1.1, 1.1, MATS.wood, -11, 0.55, -8); part(F, 1.0, 1.0, 1.0, MATS.wood, -9.8, 0.5, -7.6);
    const barrelM = new THREE.MeshStandardMaterial({ color: 0x3f5a3a, roughness: 0.6, metalness: 0.4 });
    [[8, 8], [9.2, 8.6], [-6, 10]].forEach(([bx, bz]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.95, 12), barrelM); b.position.set(bx, 0.48, bz); b.castShadow = true; F.add(b);
      colliders.push({ minX: bx - 0.34, maxX: bx + 0.34, minZ: bz - 0.34, maxZ: bz + 0.34, minY: 0, maxY: 0.95, mesh: b, tag: 'prop' }); });
  }
  furniture();
  // water tank NE corner inside walls
  const tank = new THREE.Group(); tank.position.set(13.2, 0, -10.5); scene.add(tank);
  const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 2.6, 14), MATS.metal);
  tankBody.position.y = 2.6; tankBody.castShadow = true; tank.add(tankBody);
  part(tank, 0.14, 1.4, 0.14, MATS.darkMetal, -0.8, 0.7, -0.8); part(tank, 0.14, 1.4, 0.14, MATS.darkMetal, 0.8, 0.7, -0.8);
  part(tank, 0.14, 1.4, 0.14, MATS.darkMetal, -0.8, 0.7, 0.8); part(tank, 0.14, 1.4, 0.14, MATS.darkMetal, 0.8, 0.7, 0.8);
  colliders.push({ minX: 11.9, maxX: 14.5, minZ: -11.8, maxZ: -9.2, minY: 0, maxY: 4, mesh: tankBody, tag: 'tank' });

  // ----- Wreck (hidden until impact beat, H11) + flyover helos -----
  const wreck = buildHelicopter(MATS, true);
  wreck.group.position.set(3.5, 0.55, 3.0); wreck.group.rotation.y = 0.7;
  wreck.group.visible = false; scene.add(wreck.group);
  const wreckCollider = { minX: 1.2, maxX: 5.8, minZ: 0.8, maxZ: 5.2, minY: 0, maxY: 2.2, mesh: wreck.group, tag: 'wreck', active: false };
  colliders.push(wreckCollider);
  const wreckFire = new THREE.PointLight(0xff7a33, 0, 17, 1.6);
  wreckFire.position.set(3.5, 1.3, 3); scene.add(wreckFire);
  const wreckGlow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff8a44 }));
  wreckGlow.position.set(3.5, 0.9, 3); wreckGlow.visible = false; scene.add(wreckGlow);
  const razor2 = buildHelicopter(MATS, false);
  razor2.group.position.set(2, 13, 24); razor2.group.rotation.y = Math.PI; scene.add(razor2.group);
  const razor1 = buildHelicopter(MATS, false);
  razor1.group.visible = false; scene.add(razor1.group);
  // wreck smoke column
  const smokeGeo = new THREE.BufferGeometry();
  const smokeN = 60, smokePos = new Float32Array(smokeN * 3), smokeSeed = [];
  for (let i = 0; i < smokeN; i++) { smokeSeed.push(rng.next()); smokePos[i * 3] = 3.5; smokePos[i * 3 + 1] = 1; smokePos[i * 3 + 2] = 3; }
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const smokeC = document.createElement('canvas'); smokeC.width = smokeC.height = 64;
  const sg = smokeC.getContext('2d'); const sgrad = sg.createRadialGradient(32, 32, 2, 32, 32, 30);
  sgrad.addColorStop(0, 'rgba(200,205,215,0.85)'); sgrad.addColorStop(1, 'rgba(200,205,215,0)');
  sg.fillStyle = sgrad; sg.fillRect(0, 0, 64, 64);
  const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({ color: 0x8a9098, size: 1.9, map: new THREE.CanvasTexture(smokeC), transparent: true, opacity: 0.42, depthWrite: false }));
  smoke.visible = false; scene.add(smoke);

  // ----- Intel + cache -----
  function laptop(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
    part(g, 0.34, 0.03, 0.24, MATS.black, 0, 0.02, 0);
    const scr = part(g, 0.34, 0.24, 0.02, MATS.black, 0, 0.14, -0.12); scr.rotation.x = -0.25;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }));
    glow.position.set(0, 0.14, -0.108); glow.rotation.x = -0.25; g.add(glow);
    return g;
  }
  const intelItems = [
    { id: 'laptop-guest', mesh: laptop(-12.3, 0.78, 2.2), pos: new THREE.Vector3(-12.3, 0, 2.2), taken: false },
    { id: 'laptop-f2', mesh: laptop(4.6, 4.0, -11.8), pos: new THREE.Vector3(4.6, 3.2, -11.8), taken: false },
    { id: 'drive-f3', mesh: laptop(5.2, 7.25, -12.2), pos: new THREE.Vector3(5.2, 6.4, -12.2), taken: false },
  ];
  intelItems[2].mesh.scale.setScalar(0.55);
  const cacheMesh = (() => { const g = new THREE.Group(); g.position.set(-13.2, 0, 4.9); scene.add(g);
    part(g, 0.7, 0.4, 0.5, new THREE.MeshStandardMaterial({ color: 0x2c4a2c, roughness: 0.7, metalness: 0.2 }), 0, 0.2, 0);
    part(g, 0.72, 0.08, 0.52, MATS.darkMetal, 0, 0.44, 0); return g; })();

  // ----- Interior bulb lights -----
  const bulbPos = [[-10.5, 2.6, 2], [-2, 2.6, -8], [4.5, 2.6, -9], [-2, 5.8, -8], [4, 5.8, -10], [1, 9.0, -10], [5, 9.0, -12]];
  const bulbs = [];
  for (const [bx, by, bz] of bulbPos) {
    const pl = new THREE.PointLight(0xffd9a8, 9, 11, 1.8); pl.position.set(bx, by, bz); scene.add(pl);
    const bm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), MATS.bulb); bm.position.set(bx, by + 0.15, bz); scene.add(bm);
    box(bx - 0.02, bx + 0.02, bz - 0.02, bz + 0.02, by + 0.15, by + 0.6, MATS.darkMetal, wallGroup, false);
    bulbs.push(pl);
  }

  // ----- Floor height (H17: feet exactly on floor) -----
  function floorHeightAt(x, z, curY) {
    if (x >= 7.4 && x <= 10.2 && z >= -12.9 && z <= -3.9) {
      if (z >= -4.5) return 0;
      if (z >= -8) return ((-4.5 - z) / 3.5) * 3.2;
      if (z >= -9) return 3.2;
      if (z >= -12.5) return 3.2 + ((-9 - z) / 3.5) * 3.2;
      return 6.4;
    }
    if (x >= -6.2 && x <= 10.2 && z >= -13.2 && z <= -3.8) {
      return Math.round((curY || 0) / 3.2) * 3.2;
    }
    return 0;
  }

  const minimapWalls = [
    [-16, -14, 16, -14], [16, -14, 16, 14], [16, 14, 3.5, 14], [0.5, 14, -16, 14], [-16, 14, -16, -14],
    [-14, -2, -7, -2], [-7, -2, -7, 6], [-7, 6, -14, 6], [-14, 6, -14, -2],
    [-6, -13, 10, -13], [10, -13, 10, -4], [10, -4, 0.3, -4], [-0.9, -4, -6, -4], [-6, -4, -6, -13],
    [1, -13, 1, -7.4], [1, -6.3, 1, -4],
  ];

  return {
    colliders, doors, gateGroup, gateCollider, wreck, wreckCollider, razor1, razor2, smoke, smokeSeed,
    intelItems, cacheMesh, cachePos: new THREE.Vector3(-13.2, 0, 4.9), cacheUsed: false,
    floorHeightAt, minimapWalls, bulbs, MH, GH,
    exfil: { x: 2, z: 24, r: 3.2 },
    wreckFire, wreckGlow,
    setGateDestroyed() {
      gateGroup.visible = false;
      const i = colliders.indexOf(gateCollider); if (i >= 0) colliders.splice(i, 1);
    },
    setWreckDestroyed() {
      wreck.group.visible = false; smoke.visible = false;
      const i = colliders.indexOf(wreckCollider); if (i >= 0) colliders.splice(i, 1);
    },
    updateFx(dt, t) {
      if (wreck.group.visible) { wreckFire.intensity = 11 + Math.sin(t * 11) * 2.5 + Math.sin(t * 23.7) * 1.8; wreckGlow.visible = true; }
      else { wreckFire.intensity = 0; wreckGlow.visible = false; }
      razor2.rotor.rotation.y += dt * 22; razor2.tailRotor.rotation.x += dt * 30;
      razor2.group.position.y = 13 + Math.sin(t * 0.9) * 0.35;
      if (razor1.group.visible) { razor1.rotor.rotation.y += dt * 22; razor1.tailRotor.rotation.x += dt * 30; }
      if (smoke.visible) {
        const p = smoke.geometry.attributes.position;
        for (let i = 0; i < smokeSeed.length; i++) {
          const s = smokeSeed[i];
          const yy = ((t * (0.5 + s * 0.5) + s * 9) % 9);
          p.array[i * 3] = 3.5 + Math.sin(t * 0.7 + s * 20) * (0.4 + yy * 0.22) + yy * 0.35;
          p.array[i * 3 + 1] = 1.6 + yy;
          p.array[i * 3 + 2] = 3 + Math.cos(t * 0.5 + s * 14) * (0.3 + yy * 0.18);
        }
        p.needsUpdate = true;
      }
    },
  };
}
