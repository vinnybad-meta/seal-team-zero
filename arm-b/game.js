import * as THREE from 'three';
const errBox=document.getElementById('err');
window.addEventListener('error',e=>{errBox.textContent='Error: '+e.message;errBox.style.display='block';});
window.addEventListener('unhandledrejection',e=>{errBox.textContent='Error: '+e.reason;errBox.style.display='block';});
const params=new URLSearchParams(location.search);
const SEED=parseInt(params.get('seed')||'1',10)||1;
function mulberry(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rngWorld=mulberry(SEED*1013+7), rngAI=mulberry(SEED*9176+13), rngShot=mulberry(SEED*551+3);
const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x05070d);scene.fog=new THREE.Fog(0x05070d,35,140);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,0.1,500);
camera.position.set(-4,9,44);camera.lookAt(-4,1,0);
const moon=new THREE.DirectionalLight(0x8fa8d0,0.35);moon.position.set(25,38,32);moon.castShadow=true;
moon.shadow.mapSize.set(2048,2048);moon.shadow.camera.left=-55;moon.shadow.camera.right=55;moon.shadow.camera.top=55;moon.shadow.camera.bottom=-55;moon.shadow.camera.far=120;scene.add(moon);
scene.add(new THREE.AmbientLight(0x7d90ad,0.5));
const nvgLight=new THREE.AmbientLight(0x86ff9a,0);scene.add(nvgLight);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function makeCanvasTexture(w,h,paint,rx=1,ry=1){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);return t;}
function noisePaint(base,streak){return(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=`rgba(${20+rngWorld()*60|0},${20+rngWorld()*50|0},${15+rngWorld()*40|0},${rngWorld()*0.16})`;g.fillRect(rngWorld()*w,rngWorld()*h,2+rngWorld()*22,2+rngWorld()*8);}if(streak){g.strokeStyle=streak;for(let i=0;i<28;i++){g.beginPath();const y=rngWorld()*h;g.moveTo(0,y);g.lineTo(w,y+rngWorld()*8-4);g.stroke();}}};}
const texPlaster=makeCanvasTexture(256,256,noisePaint('#8a8272','rgba(60,50,40,.25)'),2,1);
const texConcrete=makeCanvasTexture(256,256,noisePaint('#6f6e68','rgba(40,40,40,.3)'),2,1);
const texWood=makeCanvasTexture(256,256,(g,w,h)=>{g.fillStyle='#6b4a2c';g.fillRect(0,0,w,h);for(let i=0;i<40;i++){g.strokeStyle=`rgba(40,22,8,${.2+rngWorld()*.3})`;g.beginPath();const y=rngWorld()*h;g.moveTo(0,y);g.bezierCurveTo(w*.3,y+4,w*.7,y-4,w,y);g.stroke();}},1,1);
const texMetal=makeCanvasTexture(256,256,noisePaint('#4a4d4f','rgba(20,20,20,.4)'),1,1);
const texScorch=makeCanvasTexture(256,256,(g,w,h)=>{g.fillStyle='#3a3a38';g.fillRect(0,0,w,h);for(let i=0;i<60;i++){g.fillStyle=`rgba(0,0,0,${.3+rngWorld()*.5})`;g.beginPath();g.arc(rngWorld()*w,rngWorld()*h,8+rngWorld()*36,0,7);g.fill();}},1,1);
const texCamo=makeCanvasTexture(256,256,(g,w,h)=>{g.fillStyle='#2c3a26';g.fillRect(0,0,w,h);['#3d5230','#1e2a1a','#55613c'].forEach(col=>{g.fillStyle=col;for(let i=0;i<16;i++){g.beginPath();g.ellipse(rngWorld()*w,rngWorld()*h,12+rngWorld()*28,6+rngWorld()*14,rngWorld()*3,0,7);g.fill();}});g.fillStyle='#c8d6b8';g.fillRect(12,80,44,18);g.fillStyle='#222';g.font='10px monospace';g.fillText('ZERO',16,93);},1,1);
const texShalwar=makeCanvasTexture(256,256,(g,w,h)=>{g.fillStyle='#b8a888';g.fillRect(0,0,w,h);for(let x=0;x<w;x+=14){g.fillStyle='rgba(90,70,40,.18)';g.fillRect(x,0,3,h);}},1,1);
const texCivil=makeCanvasTexture(256,256,(g,w,h)=>{g.fillStyle='#e8e2d4';g.fillRect(0,0,w,h);g.fillStyle='#c9b8a0';for(let i=0;i<20;i++)g.fillRect(rngWorld()*w,rngWorld()*h,18,4);},1,1);
const texDirt=makeCanvasTexture(512,512,(g,w,h)=>{g.fillStyle='#4a4436';g.fillRect(0,0,w,h);for(let i=0;i<2400;i++){g.fillStyle=`rgba(${50+rngWorld()*60|0},${46+rngWorld()*52|0},${28+rngWorld()*30|0},.5)`;g.fillRect(rngWorld()*w,rngWorld()*h,3+rngWorld()*16,3+rngWorld()*10);}for(let i=0;i<26;i++){g.fillStyle='rgba(100,105,70,.35)';g.beginPath();g.ellipse(rngWorld()*w,rngWorld()*h,20+rngWorld()*40,10+rngWorld()*20,0,0,7);g.fill();}},8,8);
const texFace=(tone)=>makeCanvasTexture(128,128,(g,w,h)=>{g.fillStyle=tone;g.fillRect(0,0,w,h);g.fillStyle='#181410';g.fillRect(28,52,16,7);g.fillRect(84,52,16,7);g.fillStyle='#5a4030';g.fillRect(58,66,10,20);g.fillStyle='rgba(90,40,30,.7)';g.fillRect(44,102,40,5);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,96,w,10);},1,1);
const MAT={
 plaster:new THREE.MeshStandardMaterial({map:texPlaster,roughness:.92,metalness:.02}),
 concrete:new THREE.MeshStandardMaterial({map:texConcrete,roughness:.95,metalness:.03}),
 wood:new THREE.MeshStandardMaterial({map:texWood,roughness:.8,metalness:0}),
 metal:new THREE.MeshStandardMaterial({map:texMetal,roughness:.45,metalness:.75}),
 scorch:new THREE.MeshStandardMaterial({map:texScorch,roughness:.7,metalness:.5}),
 camo:new THREE.MeshStandardMaterial({map:texCamo,roughness:.9,metalness:0}),
 shalwar:new THREE.MeshStandardMaterial({map:texShalwar,roughness:.95,metalness:0}),
 civil:new THREE.MeshStandardMaterial({map:texCivil,roughness:.95,metalness:0}),
 dark:new THREE.MeshStandardMaterial({color:0x1c201c,roughness:.6,metalness:.4}),
 glass:new THREE.MeshStandardMaterial({color:0x8fb8d8,roughness:.12,metalness:.4,transparent:true,opacity:.55}),
 dirt:new THREE.MeshStandardMaterial({map:texDirt,roughness:1,metalness:0}),
 leaf:new THREE.MeshStandardMaterial({color:0x24381e,roughness:1}),
 trunk:new THREE.MeshStandardMaterial({map:texWood,roughness:1}),
};
function joint(p,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;}
function part(p,w,h,d,mat,x=0,y=0,z=0,geo=null){const m=new THREE.Mesh(geo||new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;}
function cap(p,r,len,mat,x,y,z){const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,3,8),mat);m.position.set(x,y,z);m.castShadow=true;p.add(m);return m;}
// === GEOMETRY / COLLISION ===
const colliders=[],slabs=[]; // slabs {x1,x2,z1,z2,y}
const wallsGroup=new THREE.Group();scene.add(wallsGroup);
function addCollider(x1,x2,z1,z2,y1,y2,id){const c={x1,x2,z1,z2,y1,y2,id};colliders.push(c);return c;}
function removeCollider(c){const i=colliders.indexOf(c);if(i>=0)colliders.splice(i,1);}
function wall(x1,z1,x2,z2,h,y0,mat,id,thick=.34){const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),cx=(x1+x2)/2,cz=(z1+z2)/2;const m=part(wallsGroup,Math.abs(dx)<.01?thick:len,h,Math.abs(dz)<.01?thick:len,mat,cx,y0+h/2,cz);if(Math.abs(dx)>.01&&Math.abs(dz)>.01)m.rotation.y=-Math.atan2(dz,dx);const c=addCollider(Math.min(x1,x2)-thick/2,Math.max(x1,x2)+thick/2,Math.min(z1,z2)-thick/2,Math.max(z1,z2)+thick/2,y0,y0+h,id);return{m,c};}
function slab(x1,x2,z1,z2,y,mat,thick=.22){part(wallsGroup,x2-x1,thick,z2-z1,mat,(x1+x2)/2,y-thick/2,(z1+z2)/2);const s={x1,x2,z1,z2,y};slabs.push(s);addCollider(x1,x2,z1,z2,y-thick,y,'slab');return s;}
function boxProp(x,z,w,d,h,y0,mat,ry=0,id=null){const g=new THREE.Group();g.position.set(x,y0,z);g.rotation.y=ry;scene.add(g);part(g,w,h,d,mat,0,h/2,0);if(id)addCollider(x-w/2,x+w/2,z-d/2,z+d/2,y0,y0+h,id);return g;}
const HOUSE={x1:-12,x2:16,z1:-20,z2:4};
function inRect(x,z,r){return x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2;}
const R_F2A={x1:-12,x2:10,z1:-20,z2:4},R_F2B={x1:10,x2:16,z1:-18,z2:-16},R_F3A={x1:-12,x2:10,z1:-20,z2:4},R_F3B={x1:10,x2:16,z1:-6,z2:-4};
function floorY(x,z,refY){
  const cand=[0];
  if(inRect(x,z,R_F2A)||inRect(x,z,R_F2B))cand.push(3.2);
  if(inRect(x,z,R_F3A)||inRect(x,z,R_F3B))cand.push(6.4);
  if(x>=10&&x<=13&&z>=-16&&z<=-6)cand.push((-6-z)/10*3.2);
  if(x>=13&&x<=16&&z>=-16&&z<=-6)cand.push(3.2+(z+16)/10*3.2);
  let best=null;for(const y of cand)if(y<=refY+0.55&&(best===null||y>best))best=y;
  if(best===null)best=Math.min(...cand);return best;
}
function collide(px,pz,py,r=.38){
  for(let iter=0;iter<2;iter++)for(const c of colliders){
    if(py+1.6<c.y1||py>=c.y2-0.25)continue;
    if(c.id==='slab')continue;
    const nx=Math.max(c.x1,Math.min(px,c.x2)),nz=Math.max(c.z1,Math.min(pz,c.z2));
    const dx=px-nx,dz=pz-nz,d2=dx*dx+dz*dz;
    if(d2<r*r){if(d2<1e-6){px=c.x2+r;}else{const d=Math.sqrt(d2);px=nx+dx/d*r;pz=nz+dz/d*r;}}
  }return{x:px,z:pz};
}
function rayAABB(o,d,c){let tmin=0,tmax=200;const axes=[['x',c.x1,c.x2],['y',c.y1,c.y2],['z',c.z1,c.z2]];for(const[ax,lo,hi]of axes){const ov=o[ax],dv=d[ax];if(Math.abs(dv)<1e-8){if(ov<lo||ov>hi)return -1;}else{let t1=(lo-ov)/dv,t2=(hi-ov)/dv;if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return -1;}}return tmin;}
function rayWorld(o,d,maxD=120){let best=maxD;for(const c of colliders){const t=rayAABB(o,d,c);if(t>0.05&&t<best)best=t;}return best;}
function hasLOS(a,b){const d=new THREE.Vector3().subVectors(b,a);const dist=d.length();if(dist<0.5)return true;d.normalize();return rayWorld(a,d,dist)>=dist-0.4;}
// === COMPOUND BUILD ===
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),MAT.dirt);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const starsGeo=new THREE.BufferGeometry();{const pts=[];for(let i=0;i<700;i++){const th=rngWorld()*Math.PI*2,ph=rngWorld()*0.9;pts.push(Math.cos(th)*220,Math.cos(ph)*160+20,Math.sin(th)*220);}starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xaac4ff,size:.7,sizeAttenuation:false})));}
let gateMesh=null,gateCollider=null,wreckGroup=null,wreckCollider=null,razor2=null,flyHelo=null,crashHelo=null;
const doors=[];
function makeDoor(cx,cz,w,y0,alongX,mat){
  // frame jambs + lintel (visual)
  if(alongX){part(wallsGroup,.12,2.3,.3,MAT.wood,cx-w/2,y0+1.15,cz);part(wallsGroup,.12,2.3,.3,MAT.wood,cx+w/2,y0+1.15,cz);part(wallsGroup,w+.2,.18,.3,MAT.wood,cx,y0+2.3,cz);}
  else{part(wallsGroup,.3,2.3,.12,MAT.wood,cx,y0+1.15,cz-w/2);part(wallsGroup,.3,2.3,.12,MAT.wood,cx,y0+1.15,cz+w/2);part(wallsGroup,.3,.18,w+.2,MAT.wood,cx,y0+2.3,cz);}
  const pivot=new THREE.Group();pivot.position.set(alongX?cx-w/2:cx,y0,alongX?cz:cz-w/2);scene.add(pivot);
  const leaf=part(pivot,w,2.15,.09,mat||MAT.wood, alongX?w/2:0, 1.07, alongX?0:w/2);
  if(!alongX)leaf.rotation.y=Math.PI/2;
  const c=addCollider(alongX?cx-w/2:cx-.12,alongX?cx+w/2:cx+.12,alongX?cz-.12:cz-w/2,alongX?cz+.12:cz+w/2,y0,y0+2.15,'door');
  const door={pivot,c,open:0,target:0,cx,cz,y0};doors.push(door);return door;
}
function buildCompound(){
  // perimeter 3.6m walls, gate gap south x[-5.5,-2.5] z=20
  wall(-24,20,-5.5,20,3.6,0,MAT.plaster,'perim');wall(-2.5,20,24,20,3.6,0,MAT.plaster,'perim');
  wall(-24,-20,24,-20,3.6,0,MAT.plaster,'perim');wall(-24,-20,-24,20,3.6,0,MAT.plaster,'perim');wall(24,-20,24,20,3.6,0,MAT.plaster,'perim');
  for(const x of[-24,24])for(const z of[-20,20])boxProp(x,z,1,1,4.4,0,MAT.concrete,0,'tower');
  // gate: metal double door
  gateMesh=new THREE.Group();gateMesh.position.set(-4,0,20);scene.add(gateMesh);
  part(gateMesh,3,3,.18,MAT.metal,0,1.5,0);part(gateMesh,3,.3,.24,MAT.dark,0,2.9,0);
  gateCollider=addCollider(-5.5,-2.5,19.8,20.2,0,3,'gate');
  // guest house x[-22,-12] z[8,18], east door z[11.5,13.5]
  wall(-22,8,-12,8,3.2,0,MAT.plaster,'guest');wall(-22,18,-12,18,3.2,0,MAT.plaster,'guest');
  wall(-22,8,-22,18,3.2,0,MAT.plaster,'guest');wall(-12,8,-12,11.5,3.2,0,MAT.plaster,'guest');wall(-12,13.5,-12,18,3.2,0,MAT.plaster,'guest');
  slab(-22,-12,8,18,3.2,MAT.concrete);boxProp(-22,8,1,1,3.9,0,MAT.concrete);boxProp(-12,18,1,1,3.9,0,MAT.concrete);
  makeDoor(-12,12.5,2,0,false);
  // guest furniture: bed, table+cache, chairs
  boxProp(-20,10,2,.9,.55,0,MAT.wood,0,'furn');part(scene,1.8,.18,.8,new THREE.MeshStandardMaterial({color:0x8899aa,roughness:1}),-20,.62,10);
  boxProp(-17,15.5,1.6,.9,.75,0,MAT.wood,0,'furn');boxProp(-20.5,16.5,.5,.5,.5,0,MAT.wood,0,'furn');
  // main house outer walls per floor with south door x[1,3] z=4 and windows gaps ignored
  for(let f=0;f<3;f++){const y0=f*3.2;
    wall(HOUSE.x1,HOUSE.z2,1,HOUSE.z2,3.2,y0,MAT.plaster,'main');wall(3,HOUSE.z2,HOUSE.x2,HOUSE.z2,3.2,y0,MAT.plaster,'main');
    wall(HOUSE.x1,HOUSE.z1,HOUSE.x2,HOUSE.z1,3.2,y0,MAT.plaster,'main');
    wall(HOUSE.x1,HOUSE.z1,HOUSE.x1,HOUSE.z2,3.2,y0,MAT.plaster,'main');wall(HOUSE.x2,HOUSE.z1,HOUSE.x2,HOUSE.z2,3.2,y0,MAT.plaster,'main');
    // partitions Hz z=-4 doors x[1,3],[-8,-6]; Vt x=0 z[-20,-4] door z[-13,-11]
    wall(-12,-4, -8,-4,3.2,y0,MAT.plaster,'part');wall(-6,-4,1,-4,3.2,y0,MAT.plaster,'part');wall(3,-4,10,-4,3.2,y0,MAT.plaster,'part');
    wall(0,-20,0,-13,3.2,y0,MAT.plaster,'part');wall(0,-11,0,-4,3.2,y0,MAT.plaster,'part');
    // stairwell west x=10 z[-18,-4] doors: F1 none, F2 z[-17.5,-16], F3 z[-6,-4.5]
    if(f===0){wall(10,-18,10,-4,3.2,y0,MAT.plaster,'stair');}
    if(f===1){wall(10,-18,10,-17.5,3.2,y0,MAT.plaster,'stair');wall(10,-16,10,-4,3.2,y0,MAT.plaster,'stair');}
    if(f===2){wall(10,-18,10,-6,3.2,y0,MAT.plaster,'stair');wall(10,-4.5,10,-4,3.2,y0,MAT.plaster,'stair');}
    // stairwell south z=-4 x[10,16] door only F1 x[12,14]
    if(f===0){wall(10,-4,12,-4,3.2,y0,MAT.plaster,'stair');wall(14,-4,16,-4,3.2,y0,MAT.plaster,'stair');}
    else wall(10,-4,16,-4,3.2,y0,MAT.plaster,'stair');
  }
  slab(R_F2A.x1,R_F2A.x2,R_F2A.z1,R_F2A.z2,3.2,MAT.concrete);slab(R_F2B.x1,R_F2B.x2,R_F2B.z1,R_F2B.z2,3.2,MAT.concrete);
  slab(R_F3A.x1,R_F3A.x2,R_F3A.z1,R_F3A.z2,6.4,MAT.concrete);slab(R_F3B.x1,R_F3B.x2,R_F3B.z1,R_F3B.z2,6.4,MAT.concrete);
  slab(HOUSE.x1,HOUSE.x2,HOUSE.z1,HOUSE.z2,9.6,MAT.concrete);
  // parapets roof
  wall(HOUSE.x1,HOUSE.z1,HOUSE.x2,HOUSE.z1,.7,9.6,MAT.concrete,'roof');wall(HOUSE.x1,HOUSE.z2,HOUSE.x2,HOUSE.z2,.7,9.6,MAT.concrete,'roof');
  wall(HOUSE.x1,HOUSE.z1,HOUSE.x1,HOUSE.z2,.7,9.6,MAT.concrete,'roof');wall(HOUSE.x2,HOUSE.z1,HOUSE.x2,HOUSE.z2,.7,9.6,MAT.concrete,'roof');
  // stairs steps + railings
  for(let i=0;i<16;i++){const t=i/16;part(wallsGroup,3,.16,0.7,MAT.concrete,11.5,t*3.2+0.08,-6.3-t*9.4);part(wallsGroup,3,.16,0.7,MAT.concrete,14.5,3.2+t*3.2+0.08,-15.7+t*9.4);}
  wall(13,-16,13,-6,9.6,0,MAT.concrete,'stairdiv'); // divider between lanes
  wall(10,-6,13,-6,1,6.4,MAT.concrete,'rail'); // F3 foyer railing over Lane A bottom
  wall(10,-6,13,-6,1,3.2,MAT.concrete,'rail'); // F2-level guard over Lane A (west of landing approach)
  for(let f=0;f<3;f++){const y0=f*3.2; // interior doors
    makeDoor(2,-4,2,y0,true);makeDoor(-7,-4,2,y0,true);makeDoor(0,-12,2,y0,false);
  }
  makeDoor(2,4,2,0,true); // main entrance
  makeDoor(10,-16.7,1.5,3.2,false);makeDoor(10,-5.2,1.5,6.4,false);makeDoor(13,-4,2,0,true);
  // furniture per floor
  for(let f=0;f<3;f++){const y0=f*3.2;
    boxProp(-6,-1,3,1,.5,y0,MAT.wood,0,'furn');boxProp(6,1,1.6,.9,.75,y0,MAT.wood,0,'furn'); // S room sofa/table
    boxProp(-8,-16,2,.9,.55,y0,MAT.wood,0,'furn');boxProp(-3,-18,1.4,.8,.75,y0,MAT.wood,0,'furn'); // NW bed/desk
    boxProp(6,-16,2,.9,.55,y0,MAT.wood,0,'furn');boxProp(8,-18,1.4,.8,.75,y0,MAT.wood,0,'furn'); // NE bed/desk
    boxProp(-10,-6,.6,.6,.9,y0,MAT.wood,0,'furn');
  }
  // courtyard props, water tank, well, crates (cover)
  boxProp(18,-14,2.4,2.4,2.6,0,MAT.metal,0,'tank');const tank=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,2.4,12),MAT.metal);tank.position.set(18,4,-14);tank.castShadow=true;scene.add(tank);
  boxProp(-2,14,1.2,1.2,1.1,0,MAT.wood,0,'cover');boxProp(14,4,1.2,1.2,1.1,0,MAT.wood,0,'cover');boxProp(-14,-2,1.2,1.2,1.1,0,MAT.wood,0,'cover');
  boxProp(16,16,1.4,1,1,0,MAT.metal,.4,'cover');boxProp(-18,2,1.2,1.2,1.1,0,MAT.wood,0,'cover');
  // fields + tree line (seeded)
  for(let i=0;i<70;i++){const a=rngWorld()*Math.PI*2,r=34+rngWorld()*38,x=Math.cos(a)*r,z=Math.sin(a)*r;if(x>-28&&x<28&&z>-25&&z<25)continue;const tr=new THREE.Group();tr.position.set(x,0,z);scene.add(tr);part(tr,.35,2.4,.35,MAT.trunk,0,1.2,0);const cone=new THREE.Mesh(new THREE.ConeGeometry(1.6+rngWorld(),3.4,7),MAT.leaf);cone.position.y=4;cone.castShadow=true;tr.add(cone);}
  for(let i=0;i<24;i++){const x=-40+rngWorld()*80,z=26+rngWorld()*14;boxProp(x,z,2,.4,.5,0,MAT.leaf,rngWorld());}
}
function buildHelo(wrecked){
  const g=new THREE.Group();const mat=wrecked?MAT.scorch:MAT.metal;
  const body=part(g,2.2,1.9,5.2,mat,0,1.5,0);body.geometry=new THREE.CapsuleGeometry(1.05,3.4,4,10);body.rotation.x=Math.PI/2;
  part(g,1.4,1,1.6,MAT.glass,0,1.7,-2.6);
  const boom=part(g,.55,.6,3.8,mat,0,1.9,4.2);boom.rotation.x=wrecked?0.5:0.08;if(wrecked)boom.position.y=1.2;
  part(g,.18,1.4,.9,mat,0,2.4,6); // tail fin
  const rotor=joint(g,0,2.75,-0.3);part(rotor,9,.06,.42,MAT.dark,0,0,0);part(rotor,.42,.06,9,MAT.dark,0,0,0);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(4.6,24),new THREE.MeshBasicMaterial({color:0xaaaaaa,transparent:true,opacity:.13,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.y=2.78;g.add(disc);
  const tr=joint(g,0,2.3,6);part(tr,.06,1.5,.3,MAT.dark,0,0,0);
  part(g,.12,.12,4.4,MAT.dark,-1,0.25,0);part(g,.12,.12,4.4,MAT.dark,1,0.25,0);part(g,.12,.5,.12,MAT.dark,-1,.5,-1.4);part(g,.12,.5,.12,MAT.dark,1,.5,1.4);
  const navR=part(g,.16,.16,.16,new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff0000,emissiveIntensity:2}),-1.2,1.5,-1);
  const navG=part(g,.16,.16,.16,new THREE.MeshStandardMaterial({color:0x22ff22,emissive:0x00ff00,emissiveIntensity:2}),1.2,1.5,-1);
  g.userData={rotor,tr,disc};
  return g;
}
function buildStaticWorld(){
  buildCompound();
  wreckGroup=buildHelo(true);wreckGroup.position.set(8,0.1,12);wreckGroup.rotation.set(0.12,0.9,0.22);wreckGroup.visible=false;scene.add(wreckGroup);
  wreckCollider=addCollider(4.8,11.2,8.8,15.2,0,2.6,'wreck');
  razor2=buildHelo(false);razor2.position.set(32,15,28);scene.add(razor2);
  const exfilRing=new THREE.Mesh(new THREE.RingGeometry(3.4,4,32),new THREE.MeshBasicMaterial({color:0xffd75e,transparent:true,opacity:.8,side:THREE.DoubleSide}));exfilRing.rotation.x=-Math.PI/2;exfilRing.position.set(32,0.06,28);scene.add(exfilRing);
  const spot=new THREE.SpotLight(0xfff2c0,80,60,0.5,0.5);spot.position.set(32,15,28);spot.target.position.set(32,0,28);scene.add(spot,spot.target);
  // interior bulbs
  const bulbMat=new THREE.MeshStandardMaterial({color:0xffe9a8,emissive:0xffca66,emissiveIntensity:2.4});
  const bulbPos=[[-17,2.8,13],[2,2.8,0],[-6,2.8,-12],[6,2.8,-12],[2,6,0],[-6,6,-12],[6,6,-12],[2,9.2,0],[-6,9.2,-12],[6,9.2,-12],[13,2.8,-10],[13,9.2,-10]];
  for(const[x,y,z]of bulbPos){const b=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),bulbMat);b.position.set(x,y,z);scene.add(b);const pl=new THREE.PointLight(0xffc98a,16,13,1.6);pl.position.set(x,y-0.2,z);scene.add(pl);}
  // intel + cache visuals (meshes added later in reset)
}
// === RIGS ===
function makeGunMesh(kind){
  const g=new THREE.Group();const dm=MAT.dark;
  part(g,.09,.16,.62,dm,0,0,-0.2);part(g,.05,.05,.5,dm,0,.03,-0.62);
  if(kind==='hk')part(g,.07,.07,.28,new THREE.MeshStandardMaterial({color:0x222222,roughness:.4,metalness:.7}),0,.03,-0.95);
  part(g,.07,.22,.1,dm,0,-.16,-.18);
  const sight=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,6,14),dm);sight.position.set(0,.13,-.3);g.add(sight);
  return g;
}
function makeHuman(opts){
  const {mat,faceTone,armed=true,scale=1,operator=false,child=false}=opts;
  const s=child?0.62:scale;const root=new THREE.Group();
  const hips=joint(root,0,0.95*s,0);
  const torsoMat=operator?MAT.camo:mat;
  const torso=part(hips,.44*s,.58*s,.26*s,torsoMat,0,.28*s,0,new THREE.CapsuleGeometry(.21*s,.26*s,4,10));torso.scale.set(1.05,1,0.62);
  if(operator){part(hips,.4*s,.34*s,.08*s,MAT.dark,0,.3*s,.17*s);part(hips,.12*s,.1*s,.05*s,new THREE.MeshStandardMaterial({color:0x3a5f8a,emissive:0x2266ff,emissiveIntensity:1.6}),.14*s,.48*s,.18*s);}
  const headJ=joint(hips,0,.62*s,0);const head=new THREE.Mesh(new THREE.SphereGeometry(.14*s,12,10),new THREE.MeshStandardMaterial({map:texFace(faceTone),roughness:.65}));head.position.y=.1*s;head.castShadow=true;headJ.add(head);
  const facePlane=new THREE.Mesh(new THREE.PlaneGeometry(.19*s,.19*s),new THREE.MeshStandardMaterial({map:texFace(faceTone),roughness:.65}));facePlane.position.set(0,.1*s,-.135*s);facePlane.rotation.y=Math.PI;headJ.add(facePlane);
  if(operator){const helm=part(headJ,.3*s,.16*s,.3*s,MAT.camo,0,.18*s,0);part(headJ,.16*s,.08*s,.06*s,MAT.dark,0,.12*s,.16*s);}
  else if(opts.hvt){/* bare head */}
  else {part(headJ,.28*s,.1*s,.28*s,new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:1}),0,.17*s,0);}
  function arm(side){const sh=joint(hips,side*.27*s,.5*s,0);cap(sh,.055*s,.24*s,torsoMat,0,-.15*s,0);const el=joint(sh,0,-.3*s,0);cap(el,.05*s,.22*s,torsoMat,0,-.13*s,0);part(el,.07*s,.07*s,.07*s,new THREE.MeshStandardMaterial({map:texFace(faceTone),roughness:.7}),0,-.28*s,0);return{sh,el};}
  function leg(side){const hip=joint(root,side*.11*s,.95*s,0);cap(hip,.07*s,.32*s,mat,0,-.2*s,0);const knee=joint(hip,0,-.42*s,0);cap(knee,.06*s,.3*s,mat,0,-.18*s,0);part(knee,.09*s,.07*s,.22*s,MAT.dark,0,-.4*s,.04*s);return{hip,knee};}
  const aL=arm(-1),aR=arm(1),lL=leg(-1),lR=leg(1);
  let gun=null;if(armed){gun=makeGunMesh(operator?'hk':'ak');gun.position.set(.05*s,-.3*s,-.25*s);aR.el.add(gun);gun.rotation.x=-.4;}
  root.userData={hips,headJ,aL,aR,lL,lR,gun,scale:s};
  scene.add(root);return{root,parts:root.userData,walkPhase:0,flinchT:0,deathT:-1,reloading:false};
}
function makeDog(){
  const root=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color:0x6b5636,roughness:1});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.5,4,8),mat);body.rotation.z=Math.PI/2;body.position.y=.42;body.castShadow=true;root.add(body);
  const headJ=joint(root,.42,.52,0);const head=part(headJ,.22,.18,.3,mat,0,0,.05);part(headJ,.1,.08,.16,mat,0,-.03,.22);part(headJ,.05,.12,.03,mat,-.07,.12,-.02);part(headJ,.05,.12,.03,mat,.07,.12,-.02);
  const legs=[];for(const[x,z]of[[.28,.1],[.28,-.1],[-.28,.1],[-.28,-.1]]){const lj=joint(root,x,.38,z);cap(lj,.04,.26,mat,0,-.16,0);legs.push(lj);}
  const tail=joint(root,-.42,.52,0);cap(tail,.03,.24,mat,-.12,.06,0);tail.rotation.z=.8;
  root.userData={headJ,legs,tail};scene.add(root);return{root,parts:root.userData,walkPhase:0};
}
function makeTag(text,color){
  const c=document.createElement('canvas');c.width=256;c.height=56;const g=c.getContext('2d');g.fillStyle='rgba(0,20,10,.72)';g.fillRect(0,0,256,56);g.fillStyle=color;g.font='bold 30px monospace';g.textAlign='center';g.fillText(text,128,38);
  const t=new THREE.CanvasTexture(c);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true}));sp.scale.set(1.7,.37,1);return sp;
}
function makeDiamond(){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.11),new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff0000,emissiveIntensity:2}));return m;}
// === AUDIO (procedural) ===
let AC=null,heliGain=null;const audioLog=[];
function audioInit(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}}
function beep(freq,dur,type='square',vol=.15,slide=0){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=freq;if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),AC.currentTime+dur);g.gain.setValueAtTime(vol,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dur);o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+dur);}
function noiseBurst(dur,vol,filterFreq=1200){if(!AC)return;const len=AC.sampleRate*dur,buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=AC.createBufferSource();src.buffer=buf;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=filterFreq;const g=AC.createGain();g.gain.value=vol;src.connect(f).connect(g).connect(AC.destination);src.start();}
function playSound(id,vol=1){audioLog.push({t:G.clock,id});if(!AC||AC.state==='suspended')return;
  if(id==='hk'){noiseBurst(.09,.25*vol,2800);beep(180,.06,'square',.08*vol,-100);}
  else if(id==='mp7'){noiseBurst(.14,.5*vol,1800);beep(140,.09,'square',.14*vol,-60);}
  else if(id==='p226'){noiseBurst(.11,.4*vol,2000);}
  else if(id==='enemy'){noiseBurst(.12,.35*vol,1500);}
  else if(id==='explosion'){noiseBurst(.9,.9,500);beep(55,.7,'sine',.5,-20);}
  else if(id==='reload'){beep(700,.05,'square',.08);setTimeout(()=>beep(500,.05,'square',.08),180);}
  else if(id==='bark'){beep(420,.12,'sawtooth',.2,-180);setTimeout(()=>beep(380,.1,'sawtooth',.16,-140),160);}
  else if(id==='squelch'){beep(1200,.06,'square',.07);setTimeout(()=>beep(900,.05,'square',.05),80);}
  else if(id==='beepCharge'){beep(950,.07,'square',.12);}
  else if(id==='stinger'){noiseBurst(.6,.6,700);beep(70,.5,'sine',.4,-25);}
  else if(id==='footstep'){noiseBurst(.06,.06,600);}
  else if(id==='footstep-gravel'){noiseBurst(.07,.09,500);}
  else if(id==='footstep-concrete'){noiseBurst(.05,.05,900);}
  else if(id==='heli'){noiseBurst(.35,.12,300);beep(58,.3,'sine',.12);}
  else if(id==='wind'){noiseBurst(.8,.035,400);}
  else if(id==='door'){noiseBurst(.18,.12,400);}
}
// === STATE ===
const WEAPONS={
 hk:{name:'HK416',mag:30,dmg:34,alert:8,reload:2.1,rate:.085,auto:true,reserve:120},
 mp7:{name:'MP7',mag:40,dmg:26,alert:40,reload:2.1,rate:.065,auto:true,reserve:160},
 p226:{name:'P226',mag:15,dmg:22,alert:40,reload:1.6,rate:.24,auto:false,reserve:60},
};
const OBJ_DEFS=[['O1','INSERTION'],['O2','BREACH'],['O3','GUEST HOUSE'],['O4','MAIN HOUSE FLOOR 1'],['O5','MAIN HOUSE FLOOR 2'],['O6','HVT — GERONIMO'],['O7','INTEL (SSE) — 2 OF 3'],['O8','DEMOLITION'],['O9','EXFIL']];
let G=null;
function freshState(){
  return {phase:'start',paused:false,started:false,introT:-1,introDone:false,crashDone:false,won:false,failed:false,failReason:'',
  clock:0,frames:0,teleports:0,seed:SEED,yaw:0,pitch:0,keys:{},mouseDown:false,ads:false,sprinting:false,
  player:{x:-4,y:8,z:34,hp:100,weapon:'hk',mag:{hk:30,mp7:40,p226:15},reserve:{hk:120,mp7:160,p226:60},charges:3,frags:2,lastShot:-9,lastDamageT:-9,reload:null,reloadGen:0,drawUntil:0,walkPhase:0,moving:false,inside:false},
  recoil:0,
  objectives:OBJ_DEFS.map(([id,label])=>({id,label,done:false})),current:0,intel:0,cacheUsed:false,armedCharge:null,fuseAt:-1,gateDestroyed:false,wreckDestroyed:false,
  stats:{shots:0,hits:0,kills:0},events:[],calloutCD:{},nvg:false,flash:false,geronimoFired:false,ekiaFired:false,rusherTriggered:false,roomCleared:{},breachRoomUntil:0,
  enemies:[],squad:[],civilians:[],dog:null,intelItems:[],grenades:[],tracers:[],particles:[],shells:[],breadcrumbs:[],noiseEvents:[],checkFireCD:0,barkCD:0,enemyCoverLog:[],minimap:{player:true,squad:0,objective:false,redDots:0,exfil:false},targetId:'',audioStart:0,lockHad:false,simLockLoss:false,heliBed:false,footCD:0,dmgDirT:0,dmgDirAngle:0,hitmarkT:0};
}
function logEvent(type,text,extra={}){G.events.push({t:+G.clock.toFixed(2),type,text,...extra});}
function callout(speaker,text){const key=speaker+text;const now=G.clock;if(G.calloutCD[key]&&now-G.calloutCD[key]<4)return;G.calloutCD[key]=now;logEvent('callout',text,{speaker});playSound('squelch',.8);const el=$('callout');el.textContent=`${speaker}: “${text}”`;clearTimeout(callout._t);callout._t=setTimeout(()=>{if(el.textContent.includes(text))el.textContent='';},3600);}
function banner(text){const el=$('banner');el.textContent=text;clearTimeout(banner._t);banner._t=setTimeout(()=>el.textContent='',3200);logEvent('banner',text);}
function hint(text,ms=2200){const el=$('hint');el.textContent=text;clearTimeout(hint._t);hint._t=setTimeout(()=>el.textContent='',ms);}
// NAV GRAPH [x,z,yRef] — nodes in rooms, edges only through doors/openings
const NAV=[[-4,28,0],[-4,22,0],[-4,17,0],[-10,12,0],[-10.5,12.5,0],[-17,13,0],[0,10,0],[13,12,0],[2,6,0],[8,16,0],[8,26,0],[32,28,0],
[2,0,0],[2,-4,0],[-7,-4,0],[5,-12,0],[0,-12,0],[-6,-12,0],[13,-5,0],[11.5,-7,0],[12,-17,3.2],[8,-17,3.2],
[2,0,3.2],[2,-4,3.2],[-7,-4,3.2],[5,-12,3.2],[0,-12,3.2],[-6,-12,3.2],[14.5,-15,3.2],
[2,0,6.4],[2,-4,6.4],[-7,-4,6.4],[5,-12,6.4],[0,-12,6.4],[-6,-12,6.4],[13,-5,6.4],[13,-4,0],[10,-5.3,6.4],[13,5,0],[13,18,0],[14.5,-6.5,6.4]];
const NAV_EDGES=[[0,1],[1,2],[2,3],[2,6],[3,4],[4,5],[6,8],[8,38],[38,7],[9,39],[39,2],[39,7],[0,10],[10,11],[8,12],
[12,13],[12,14],[13,15],[15,16],[16,17],[14,17],
[22,23],[22,24],[23,25],[25,26],[26,27],[24,27],
[29,30],[29,31],[30,32],[32,33],[33,34],[31,34],
[12,36],[36,18],[18,19],[19,20],[20,21],[21,25],[20,28],[28,40],[40,35],[35,37],[37,32]];
function navPath(sx,sz,sy,tx,tz,ty){
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])+Math.abs((a[2]||0)-(b[2]||0))*4;
  let si=0,ti=0,sd=1e9,td=1e9;NAV.forEach((n,i)=>{const d=dist([sx,sz,sy],n);if(d<sd){sd=d;si=i;}const e=dist([tx,tz,ty],n);if(e<td){td=e;ti=i;}});
  const adj={};NAV_EDGES.forEach(([a,b])=>{(adj[a]=adj[a]||[]).push(b);(adj[b]=adj[b]||[]).push(a);});
  const prev={[si]:-1},q=[si];while(q.length){const cur=q.shift();if(cur===ti)break;for(const n of(adj[cur]||[]))if(!(n in prev)){prev[n]=cur;q.push(n);}}
  if(!(ti in prev))return[[tx,tz,ty]];const path=[];let c=ti;while(c!==-1){path.unshift(NAV[c]);c=prev[c];}path.push([tx,tz,ty]);return path;
}
const COVER=[[ -2,12.5,0],[13,5,0],[-15,-1,0],[15,15,0],[-20,16,0],[-9,1,0],[9,1,0],[-9,-9,0],[9,-9,0],[-9,3.2,1],[9,3.2,-9],[-1,3.2,-17],[1,6.4,-9],[-9,6.4,-5],[8,0,-17]];
// === VIEWMODEL / FX ===
let viewGun=null,vmGroup=null,muzzleLight=null,blastCircle=null,chargeMesh=null,smokePts=null;
function buildViewmodel(){
  vmGroup=new THREE.Group();camera.add(vmGroup);scene.add(camera);
  viewGun=new THREE.Group();viewGun.position.set(.28,-.28,-.55);vmGroup.add(viewGun);
  muzzleLight=new THREE.PointLight(0xffc266,0,6);muzzleLight.position.set(.28,-.2,-1.2);vmGroup.add(muzzleLight);
  blastCircle=new THREE.Mesh(new THREE.RingGeometry(5.7,6,40),new THREE.MeshBasicMaterial({color:0xff2222,transparent:true,opacity:.85,side:THREE.DoubleSide}));blastCircle.rotation.x=-Math.PI/2;blastCircle.visible=false;scene.add(blastCircle);
}
function rebuildViewGun(kind){
  while(viewGun.children.length)viewGun.remove(viewGun.children[0]);
  const dm=MAT.dark;part(viewGun,.11,.18,.7,dm,0,0,-.25);part(viewGun,.06,.06,.55,dm,0,.04,-.75);
  if(kind==='hk')part(viewGun,.08,.08,.3,new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.35,metalness:.7}),0,.04,-1.12);
  if(kind==='mp7'){/* bare */}
  if(kind==='p226'){while(viewGun.children.length)viewGun.remove(viewGun.children[0]);part(viewGun,.09,.16,.38,dm,0,0,-.18);part(viewGun,.05,.05,.2,dm,0,.05,-.42);}
  part(viewGun,.08,.24,.11,dm,0,-.18,-.25);
  const sight=new THREE.Mesh(new THREE.TorusGeometry(.06,.015,6,16),dm);sight.position.set(0,.14,-.35);viewGun.add(sight);
  part(viewGun,.07,.12,.16,new THREE.MeshStandardMaterial({map:texFace('#c9a186'),roughness:.7}),.02,-.12,-.05);
  part(viewGun,.07,.1,.14,new THREE.MeshStandardMaterial({map:texFace('#c9a186'),roughness:.7}),-.04,-.06,-.45);
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),new THREE.MeshBasicMaterial({color:0xffcc66,transparent:true,opacity:.95,side:THREE.DoubleSide}));flash.position.set(0,.04,kind==='hk'?-1.32:kind==='p226'?-.55:-1.05);flash.visible=false;viewGun.add(flash);viewGun.userData.flash=flash;
}
function spawnTracer(a,b,color=0xffd27a){const geo=new THREE.BufferGeometry().setFromPoints([a,b]);const m=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));scene.add(m);G.tracers.push({m,until:G.clock+.07});}
function spawnParticles(pos,n,color=0xccbb99,speed=2,life=.7,size=.12){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(size,5,5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85}));m.position.copy(pos);scene.add(m);const v=new THREE.Vector3((Math.random()*2-1)*speed,Math.random()*speed*.8,(Math.random()*2-1)*speed);G.particles.push({m,v,until:G.clock+life*Math.random()});}}
function explosionFx(pos){spawnParticles(pos,36,0xff8833,5,1,.22);spawnParticles(pos,28,0x554433,3,1.6,.3);const l=new THREE.PointLight(0xff7733,60,22);l.position.copy(pos).y+=1;scene.add(l);G.particles.push({m:l,v:new THREE.Vector3(),until:G.clock+.35,light:true});playSound('explosion');}
// === ENTITIES ===
function animateRig(ent,dt,speed,aimYaw,aimPitch){
  const p=ent.rig.parts;const moving=speed>0.15;
  if(ent.dead){if(ent.rig.deathT>=0&&ent.rig.deathT<.55){ent.rig.deathT+=dt;const k=Math.min(1,ent.rig.deathT/.5);ent.rig.root.rotation.x=-Math.PI/2*k*0.92;ent.rig.root.position.y=ent.y+0.12*k;}return;}
  ent.rig.walkPhase+=dt*(moving?speed*2.6:0);const ph=ent.rig.walkPhase;
  const sw=moving?Math.sin(ph)*.55:0;
  p.lL.hip.rotation.x=sw;p.lR.hip.rotation.x=-sw;p.lL.knee.rotation.x=Math.max(0,-sw)*.7;p.lR.knee.rotation.x=Math.max(0,sw)*.7;
  p.aL.sh.rotation.x=-sw*.7;p.aR.sh.rotation.x=sw*.7;
  if(ent.aiming||ent.kind==='enemy'||ent.kind==='squad'){p.aR.sh.rotation.x=1.25-(aimPitch||0)*.6;p.aL.sh.rotation.x=1.05-(aimPitch||0)*.6;p.aR.el.rotation.x=.25;p.aL.el.rotation.x=.5;}
  if(ent.rig.reloading){if(p.gun)p.gun.rotation.x=.9;}
  else if(p.gun)p.gun.rotation.x=(ent.aiming||ent.kind==='enemy'||ent.kind==='squad')?-1.35:-.4;
  const idle=moving?0:Math.sin(G.clock*1.7+ent.seedOff)*.03;p.hips.position.y=(ent.crouched?.62:.95)*p.scale+idle;
  if(ent.rig.flinchT>0){ent.rig.flinchT-=dt;ent.rig.root.position.x=ent.x+Math.sin(ent.rig.flinchT*40)*.05;ent.rig.root.position.z=ent.z+Math.cos(ent.rig.flinchT*37)*.05;}
}
function placeRig(ent){ent.rig.root.position.set(ent.rig.flinchT>0?ent.rig.root.position.x:ent.x,ent.y,ent.z);ent.rig.root.rotation.y=ent.yaw;}
function spawnEntities(){
  // squad
  const squadDefs=[['ZERO-2',-5.5,36],['ZERO-3',-2.5,36],['ZERO-4',-4,38]];
  G.squad=squadDefs.map(([name,x,z],i)=>{const rig=makeHuman({mat:MAT.camo,faceTone:'#c9a186',operator:true});const tag=makeTag(name,'#7fb7ff');tag.position.y=2.05;rig.root.add(tag);const strobe=part(rig.root,.09,.09,.09,new THREE.MeshStandardMaterial({color:0x2266ff,emissive:0x2266ff,emissiveIntensity:2}),.16,1.62,.14);
    return{kind:'squad',name,x,y:8,z,hp:100,yaw:0,rig,tag,strobe,alive:true,wounded:false,dead:false,mag:30,reloadEnd:0,lastShot:0,burstCD:0,seedOff:i*1.7,aiming:true,crumbIdx:0};});
  const drig=makeDog();const dtag=makeTag('CAIRO','#7fb7ff');dtag.position.y=.95;drig.root.add(dtag);
  G.dog={kind:'dog',name:'CAIRO',x:-3,y:8,z:35,hp:60,yaw:0,rig:drig,tag:dtag,alive:true,downed:false,dead:false,seedOff:4,barked:false,crumbIdx:0};
  const eDefs=[
    {id:'E1',zone:'guest',x:-18,z:11,y:0,patrol:[[-19,10],[-15,16],[-19,16]]},
    {id:'E2',zone:'F1S',x:6,z:0,y:0,patrol:[[-6,0],[8,0]]},
    {id:'E3',zone:'F1NE',x:7,z:-13,y:0,patrol:[[3,-9],[8,-16]]},
    {id:'E4',zone:'F2S',x:6,z:0,y:3.2,patrol:[[-6,0],[8,0]]},
    {id:'E5',zone:'F2NE',x:7,z:-12,y:3.2,patrol:[[5,-16],[9,-9]],rusher:true},
    {id:'E6',zone:'F2NW',x:-6,z:-13,y:3.2,patrol:[[-9,-9],[-3,-16]]},
    {id:'E7',zone:'F3NE',x:7,z:-14,y:6.4,patrol:[[4,-10],[9,-16]],hvt:true},
  ];
  const rngSpawn=mulberry(SEED*31337+5);
  G.enemies=eDefs.map((d,i)=>{const jx=(rngSpawn()-.5)*1.2,jz=(rngSpawn()-.5)*1.2;const rig=makeHuman({mat:MAT.shalwar,faceTone:'#a67c52',hvt:d.hvt});const diamond=makeDiamond();diamond.position.y=2.1;diamond.visible=false;rig.root.add(diamond);
    return{kind:'enemy',...d,x:d.x+jx,z:d.z+jz,yaw:rngSpawn()*6.28,hp:100,alive:true,dead:false,state:'PATROL',patrol:d.patrol.map(([x,z])=>[x+(rngSpawn()-.5),z+(rngSpawn()-.5)]),wpIdx:0,rig,diamond,mag:30,reloading:false,reloadEnd:0,lastShot:0,burst:0,burstAt:0,lastSeen:null,lastSeenT:-99,searchT:0,path:null,pathIdx:0,seedOff:i*2.3,aiming:false,strafeDir:1,strafeT:0,accPenaltyUntil:0,coverT:0};});
  const cDefs=[{id:'C1',x:-10.5,z:-18.5,y:0},{id:'C2',x:-10.5,z:-18.5,y:3.2},{id:'C3',x:-9.5,z:-19,y:3.2,child:true},{id:'C4',x:-10.5,z:-18.5,y:6.4}];
  G.civilians=cDefs.map((d,i)=>{const rig=makeHuman({mat:MAT.civil,faceTone:'#b98a5e',armed:false,child:d.child});return{kind:'civilian',...d,yaw:2,rig,alive:true,dead:false,hp:20,crouched:true,seedOff:i*3.1,corner:[d.x,d.z]};});
  const intelDefs=[{id:'I1',name:'Laptop',x:8,z:-17.5,y:7.35},{id:'I2',name:'Laptop',x:-3,z:-17.5,y:7.35},{id:'I3',name:'Drive cache',x:-10.5,z:-6,y:7.3}];
  G.intelItems=intelDefs.map(d=>{const m=new THREE.Group();m.position.set(d.x,d.y,d.z);scene.add(m);part(m,.42,.06,.3,MAT.dark,0,0,0);part(m,.42,.3,.03,new THREE.MeshStandardMaterial({color:0x9fd8ff,emissive:0x336688,emissiveIntensity:.8}),0,.16,-.13);return{...d,mesh:m,taken:false};});
  // cache crate visual
  const cache=new THREE.Group();cache.position.set(-20.5,0,16.5);scene.add(cache);part(cache,.8,.5,.6,new THREE.MeshStandardMaterial({color:0x35522e,roughness:.8}),0,.25,0);
  G.cachePos={x:-20.5,z:16.5,y:0};
  G._cacheMesh=cache;
}
let oldDisposables=[];
function resetMission(){
  for(const e of oldDisposables)scene.remove(e);
  oldDisposables=[];
  const teleports=G?G.teleports:0, frames=G?G.frames:0;
  G=freshState();G.teleports=teleports;G.frames=frames;
  rngAI=mulberry(SEED*9176+13);rngShot=mulberry(SEED*551+3);
  // gate / wreck restore
  if(gateMesh)gateMesh.visible=true;
  if(gateCollider&&!colliders.includes(gateCollider))colliders.push(gateCollider);
  if(wreckGroup){wreckGroup.visible=false;wreckGroup.position.set(8,0.1,12);wreckGroup.rotation.set(0.12,0.9,0.22);}
  if(wreckCollider&&!colliders.includes(wreckCollider))colliders.push(wreckCollider);
  for(const d of doors){d.open=0;d.target=0;d.pivot.rotation.y=0;if(!colliders.includes(d.c))colliders.push(d.c);}
  if(chargeMesh){scene.remove(chargeMesh);chargeMesh=null;}
  blastCircle.visible=false;
  spawnEntities();
  for(const arr of[G.squad,G.enemies,G.civilians])for(const e of arr){e.rig.root.position.set(e.x,e.y,e.z);e.rig.root.rotation.y=e.yaw;}
  G.dog.rig.root.position.set(G.dog.x,G.dog.y,G.dog.z);
  for(const arr of[G.squad,G.enemies,G.civilians])for(const e of arr)oldDisposables.push(e.rig.root);
  oldDisposables.push(G.dog.rig.root);for(const it of G.intelItems)oldDisposables.push(it.mesh);oldDisposables.push(G._cacheMesh);
  rebuildViewGun('hk');
  $('failScreen').classList.add('hidden');$('aarScreen').classList.add('hidden');$('pauseScreen').classList.add('hidden');$('startScreen').classList.remove('hidden');
  updateObjectivesHUD();
}
// === MISSION FLOW ===
function startMission(){
  audioInit();if(AC&&AC.state==='suspended')AC.resume();
  G.started=true;G.phase='intro';G.introT=0;$('startScreen').classList.add('hidden');
  logEvent('objective','Mission start — insertion');
  callout('ZERO-2','Razor 1 and 2 inbound. Fast-rope on my mark.');
  // fly helos
  if(!flyHelo){flyHelo=buildHelo(false);scene.add(flyHelo);}
  if(!crashHelo){crashHelo=buildHelo(false);scene.add(crashHelo);}
  flyHelo.visible=true;crashHelo.visible=true;flyHelo.position.set(-30,18,55);crashHelo.position.set(10,16,60);
  playSound('stinger',.4);
}
function completeObjective(idx){
  const o=G.objectives[idx];if(!o||o.done)return;o.done=true;G.current=idx+1;
  logEvent('objective-complete',o.id,{objective:o.id});banner(`${o.id} COMPLETE — ${o.label}`);playSound('squelch');
  callout('ZERO-2',`${o.id} complete. ${G.objectives[idx+1]?('Next: '+G.objectives[idx+1].label):'Mission complete.'}`);
  updateObjectivesHUD();
}
function checkObjectives(){
  if(G.won||G.failed)return;
  // sequential: only advance while current condition holds
  let guard=0;
  while(G.current<9&&guard++<9){
    const id=G.objectives[G.current].id;let ok=false;
    if(id==='O1')ok=G.introDone;
    else if(id==='O2')ok=G.gateDestroyed;
    else if(id==='O3')ok=G.enemies.filter(e=>e.zone==='guest').every(e=>e.dead);
    else if(id==='O4')ok=G.enemies.filter(e=>['F1S','F1NE'].includes(e.zone)).every(e=>e.dead);
    else if(id==='O5')ok=G.enemies.filter(e=>['F2S','F2NE','F2NW'].includes(e.zone)).every(e=>e.dead);
    else if(id==='O6')ok=G.enemies.find(e=>e.hvt)?.dead;
    else if(id==='O7')ok=G.intel>=2;
    else if(id==='O8')ok=G.wreckDestroyed;
    else if(id==='O9')ok=Math.hypot(G.player.x-32,G.player.z-28)<4&&G.introDone;
    if(!ok)break;
    if(id==='O6'&&!G.ekiaFired){G.ekiaFired=true;callout('ZERO-1','Geronimo EKIA');}
    completeObjective(G.current);
    if(id==='O9'){winMission();break;}
  }
}
function failMission(reason){
  if(G.won||G.failed)return;G.failed=true;G.failReason=reason;G.phase='failed';G.player.reloadGen++;
  logEvent('fail',reason,{violation:reason});$('failReason').textContent=reason;
  $('failScreen').classList.remove('hidden');$('aarScreen').classList.add('hidden');
  if(document.pointerLockElement)document.exitPointerLock();
}
function winMission(){
  if(G.won||G.failed)return;G.won=true;G.phase='won';G.player.reloadGen++;
  const t=G.clock,mm=String(Math.floor(t/60)).padStart(2,'0'),ss=String(Math.floor(t%60)).padStart(2,'0');
  const acc=G.stats.shots?Math.round(100*G.stats.hits/G.stats.shots):0;
  const grade=t<1500?'S':t<2100?'A':'B';
  G.grade=grade;G.aar={time:`${mm}:${ss}`,seconds:+t.toFixed(1),shots:G.stats.shots,hits:G.stats.hits,accuracy:acc,intel:G.intel,grade,objectives:G.objectives.filter(o=>o.done).length};
  logEvent('grade',grade,G.aar);logEvent('aar','After-action report',G.aar);
  $('aarText').textContent=`Time: ${mm}:${ss}\nShots fired: ${G.stats.shots}\nHits: ${G.stats.hits}\nAccuracy: ${acc}%\nObjectives: 9/9\nIntel collected: ${G.intel} / 3\nGrade: ${grade}  (S < 25:00 · A < 35:00 · B otherwise)`;
  $('aarScreen').classList.remove('hidden');$('failScreen').classList.add('hidden');
  if(document.pointerLockElement)document.exitPointerLock();
}
function updateObjectivesHUD(){
  const ul=$('objList');if(!ul||!G)return;ul.innerHTML=G.objectives.map((o,i)=>`<li class="${o.done?'done':i===G.current?'current':''}">${o.done?'☑':'☐'} ${o.id} ${o.label}</li>`).join('');
  const cur=G.objectives[G.current];$('objCurrent').textContent=cur?`▶ ${cur.id}: ${cur.label}`:'▶ All objectives complete';
}
// === DAMAGE ===
function damageCharacter(ent,dmg,byPlayer,head=false,sourceKind=null){
  if(ent.dead)return;
  if(ent.kind==='squad'&&byPlayer){checkFire();return;}
  if(ent.kind==='dog'&&byPlayer){checkFire();return;}
  ent.hp-=dmg;ent.rig.flinchT=.22;
  if(ent.kind==='enemy'){ent.accPenaltyUntil=G.clock+.35;if(byPlayer)G.stats.hits++;}
  if(ent.hp<=0){
    if(ent.kind==='civilian'){ent.dead=true;ent.alive=false;ent.rig.deathT=0;failMission('ROE VIOLATION — unarmed civilian killed');return;}
    if(ent.kind==='squad'){
      if(G.current<6){ent.hp=1;return;} // cannot die before O6 completes (current index <6 means O6 not done)
      ent.wounded=true;ent.alive=false;ent.dead=false;ent.hp=0;callout(ent.name,'I’m down!');return;
    }
    if(ent.kind==='dog'){ent.downed=true;ent.hp=0;ent.downedUntil=G.clock+8;callout('ZERO-2','Cairo is down!');return;}
    ent.dead=true;ent.alive=false;ent.rig.deathT=0;if(byPlayer)G.stats.kills++;if(sourceKind==='squad')G.squadKills=(G.squadKills||0)+1;
    if(ent.hvt){logEvent('hvt-down','HVT neutralized');if(!G.ekiaFired){G.ekiaFired=true;callout('ZERO-1','Geronimo EKIA');}}
    checkRoomClear(ent.zone);
  }
}
function checkFire(){
  if(G.clock-G.checkFireCD<2)return;G.checkFireCD=G.clock;callout('ZERO-2','Check fire!');logEvent('check-fire','Check fire!');
}
function checkRoomClear(zone){
  if(!zone||G.roomCleared[zone])return;
  const left=G.enemies.filter(e=>e.zone===zone&&!e.dead);
  if(left.length===0){G.roomCleared[zone]=true;callout('ZERO-2','Clear left!');logEvent('room-clear',zone);}
}
function applyPlayerDamage(n,fromPos){
  if(!G.started||G.won||G.failed||G.paused||!G.introDone)return;
  G.player.hp-=n;G.player.lastDamageT=G.clock;
  $('dmgVignette').style.opacity=.9;setTimeout(()=>$('dmgVignette').style.opacity=0,180);
  if(fromPos){const dx=fromPos.x-G.player.x,dz=fromPos.z-G.player.z;G.dmgDirAngle=Math.atan2(dx,dz);G.dmgDirT=G.clock;}
  if(G.player.hp<=0){G.player.hp=0;failMission('ZERO-1 KIA — you were killed in action');}
}
function addNoise(pos,radius,type){
  G.noiseEvents.push({x:pos.x,z:pos.z,y:pos.y||0,radius,type,t:G.clock});
  for(const e of G.enemies){if(e.dead||e.hvt)continue;const d=Math.hypot(e.x-pos.x,e.z-pos.z,((e.y||0)-(pos.y||0))*3);
    if(type==='explosion'){if(e.state!=='ATTACK')setSuspicious(e,pos);}
    else if(d<radius&&e.state==='PATROL')setSuspicious(e,pos);
    else if(d<radius&&e.state==='SUSPICIOUS')setSuspicious(e,pos);
  }
  for(const c of G.civilians){if(c.dead)continue;if(Math.hypot(c.x-pos.x,c.z-pos.z)<12){c.fleeT=G.clock+3;}}
}
function setSuspicious(e,pos){e.state='SUSPICIOUS';e.investigate={x:pos.x,z:pos.z,y:pos.y||0};e.path=navPath(e.x,e.z,e.y,pos.x,pos.z,pos.y||0);e.pathIdx=0;e.searchT=0;}
function alertAttack(e,pos){if(e.state!=='ATTACK')callout('ZERO-3','Contact!');e.state='ATTACK';e.lastSeen={x:pos.x,y:pos.y,z:pos.z};e.lastSeenT=G.clock;e.diamond.visible=true;}
// === AI ===
function faceToward(e,x,z){e.yaw=Math.atan2(-(x-e.x),-(z-e.z));}
function moveEnt(e,tx,tz,ty,speed,dt){
  const dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz);if(d<0.05)return 0;
  faceToward(e,tx,tz);
  const step=Math.min(d,speed*dt);
  const tries=[[dx/d*step,dz/d*step],[dx/d*step,0],[0,dz/d*step],[-dz/d*step*.7,dx/d*step*.7],[dz/d*step*.7,-dx/d*step*.7]];
  let best=null,bestScore=-1e9;
  for(const[mx,mz]of tries){
    let nx=e.x+mx,nz=e.z+mz;const fy=floorY(nx,nz,e.y);if(fy>e.y+0.6)continue;
    const c=collide(nx,nz,fy,0.38);nx=c.x;nz=c.z;
    const score=-Math.hypot(tx-nx,tz-nz)+Math.hypot(nx-e.x,nz-e.z)*0.1;
    if(score>bestScore){bestScore=score;best=[nx,nz];}
  }
  if(!best)return 0;
  const moved=Math.hypot(best[0]-e.x,best[1]-e.z);e.x=best[0];e.z=best[1];e.y=floorY(e.x,e.z,e.y);e.speed=moved/Math.max(dt,0.001);return moved;
}
function followPath(e,dt,speed){
  if(!e.path||e.pathIdx>=e.path.length)return true;
  const [tx,tz]=e.path[e.pathIdx];const before=Math.hypot(tx-e.x,tz-e.z);
  moveEnt(e,tx,tz,0,speed,dt);
  if(Math.hypot(tx-e.x,tz-e.z)<0.7)e.pathIdx++;
  return e.pathIdx>=e.path.length;
}
function shouldRepath(e,tx,tz){
  return !e.path||e.pathIdx>=e.path.length||!e.pathTarget||Math.hypot(e.pathTarget[0]-tx,e.pathTarget[1]-tz)>4;
}
function setPath(e,tx,tz,ty){e.path=navPath(e.x,e.z,e.y,tx,tz,ty);e.pathIdx=0;e.pathTarget=[tx,tz];}
function eyeOf(e){return new THREE.Vector3(e.x,e.y+1.5,e.z);}
function playerEye(){return new THREE.Vector3(G.player.x,G.player.y+1.62,G.player.z);}
function canSee(e,tx,ty,tz,distLimit=30){
  const a=eyeOf(e),b=new THREE.Vector3(tx,ty+1.3,tz);const d=a.distanceTo(b);if(d>distLimit)return false;
  // FOV unless ATTACK or close
  if(e.state!=='ATTACK'&&d>4){const fx=-Math.sin(e.yaw),fz=-Math.cos(e.yaw);const dot=(fx*(tx-e.x)+fz*(tz-e.z))/(d||1);if(dot<0.35)return false;}
  return hasLOS(a,b);
}
function enemyTarget(e){
  const cands=[{x:G.player.x,y:G.player.y,z:G.player.z,kind:'player'},...G.squad.filter(s=>!s.wounded),...(G.dog&&!G.dog.downed?[{x:G.dog.x,y:G.dog.y,z:G.dog.z,kind:'dog'}]:[])];
  let best=null,bd=1e9;for(const c of cands){if(canSee(e,c.x,c.y,c.z)){const d=Math.hypot(c.x-e.x,c.z-e.z);if(d<bd){bd=d;best=c;}}}
  return best;
}
function enemyShoot(e,target){
  if(G.clock<e.burstAt)return;
  if(e.reloading)return;
  if(e.mag<=0){e.reloading=true;e.reloadEnd=G.clock+2;e.rig.reloading=true;
    // seek cover breaking LOS
    let best=null,bs=1e9;for(const[cx,cz,cy]of COVER){if(Math.abs(cy-e.y)>1.8)continue;const d=Math.hypot(cx-e.x,cz-e.z);if(d<bs){const cov=new THREE.Vector3(cx,cy+1.3,cz);if(!hasLOS(cov,new THREE.Vector3(G.player.x,G.player.y+1.3,G.player.z))){best=[cx,cz,cy];bs=d;}}}
    e.coverPoint=best;G.enemyCoverLog.push({t:G.clock,enemy:e.id,cover:best});logEvent('enemy-cover',e.id);return;
  }
  if(G.clock<(e.nextShotT||0))return;
  e.nextShotT=G.clock+0.13;e.burstCount=(e.burstCount||0)+1;
  e.mag--;e.lastShot=G.clock;
  const o=eyeOf(e);const aim=new THREE.Vector3(target.x,target.y+1.1,target.z);
  const dist=o.distanceTo(aim);const d=aim.sub(o).normalize();
  const spread=0.08+dist*0.0012+(G.player.moving?0.02:0)+(G.clock<e.accPenaltyUntil?0.04:0);
  d.x+=(rngAI()+rngAI()-1)*spread;d.y+=(rngAI()+rngAI()-1)*spread*0.6;d.z+=(rngAI()+rngAI()-1)*spread;d.normalize();
  const dmg=target.kind==='player'?2:12;
  shootFrom(e,o,d,dmg,false);
  if(e.burstCount>=3){e.burstCount=0;e.burstAt=G.clock+1.3+rngAI()*0.8;
    if(e.mag<=15&&!e.reloading){e.reloading=true;e.reloadEnd=G.clock+2;e.rig.reloading=true;
      let best=null,bs=1e9;for(const[cx,cz,cy]of COVER){if(Math.abs(cy-e.y)>1.8)continue;const d=Math.hypot(cx-e.x,cz-e.z);if(d<bs){const cov=new THREE.Vector3(cx,cy+1.3,cz);if(!hasLOS(cov,new THREE.Vector3(G.player.x,G.player.y+1.3,G.player.z))){best=[cx,cz,cy];bs=d;}}}
      e.coverPoint=best;G.enemyCoverLog.push({t:G.clock,enemy:e.id,cover:best});logEvent('enemy-cover',e.id);}}
}
function updateEnemy(e,dt){
  if(e.dead)return;e.speed=0;
  if(e.reloading&&G.clock>=e.reloadEnd){e.reloading=false;e.rig.reloading=false;e.mag=30;}
  const target=enemyTarget(e);
  if(target&&G.introDone&&!G.won&&!G.failed){
    if(e.state!=='ATTACK'&&e.rusher&&G.rusherActive===e){/* still rush */}
    alertAttack(e,{x:target.x,y:target.y,z:target.z});e.targetKind=target.kind;
  }
  if(e.hvt&&target)alertAttack(e,{x:target.x,y:target.y,z:target.z});
  if(e.state==='PATROL'){
    e.diamond.visible=false;const [tx,tz]=e.patrol[e.wpIdx];
    if(moveEnt(e,tx,tz,e.y,1.15,dt)===0||Math.hypot(tx-e.x,tz-e.z)<0.6){e.wpIdx=(e.wpIdx+1)%e.patrol.length;}
    e.aiming=false;
  }else if(e.state==='SUSPICIOUS'){
    e.diamond.visible=false;e.aiming=false;
    if(followPath(e,dt,2.0)){e.searchT+=dt;if(e.searchT>2.5){e.state='SEARCH';e.searchStage=0;e.searchT=0;e.path=navPath(e.x,e.z,e.y,e.patrol[0][0],e.patrol[0][1],e.y);e.pathIdx=0;}}
  }else if(e.state==='SEARCH'){
    e.diamond.visible=false;
    if(G.clock-e.lastSeenT>16){e.state='PATROL';e.path=null;}
    else if(followPath(e,dt,1.8)){
      e.searchT+=dt;
      if(e.searchT>2.5){
        e.searchStage=(e.searchStage||0)+1;e.searchT=0;
        if(e.searchStage>=3){e.state='PATROL';e.path=navPath(e.x,e.z,e.y,e.patrol[0][0],e.patrol[0][1],e.y);e.pathIdx=0;}
        else { // sweep nearest nav rooms
          const near=NAV.map(n=>({n,d:Math.hypot(n[0]-e.x,n[1]-e.z)+Math.abs(n[2]-e.y)*4})).sort((a,b)=>a.d-b.d)[e.searchStage];
          if(near){e.path=navPath(e.x,e.z,e.y,near.n[0],near.n[1],near.n[2]);e.pathIdx=0;}
        }
      }
    }
  }else if(e.state==='ATTACK'){
    e.diamond.visible=true;e.aiming=true;
    const tgt=target||(e.lastSeen?{x:e.lastSeen.x,y:e.lastSeen.y,z:e.lastSeen.z,kind:'player'}:null);
    if(!tgt){e.state='SEARCH';}
    else{
      if(target)e.lastSeen={x:target.x,y:target.y,z:target.z},e.lastSeenT=G.clock;
      if(G.clock-e.lastSeenT>5&&!target){e.state='SEARCH';e.path=navPath(e.x,e.z,e.y,e.lastSeen.x,e.lastSeen.z,e.lastSeen.y);e.pathIdx=0;}
      const dist=Math.hypot(tgt.x-e.x,tgt.z-e.z);
      if(e.reloading&&e.coverPoint){moveEnt(e,e.coverPoint[0],e.coverPoint[1],e.coverPoint[2],2.8,dt);}
      else if(target){
        if(dist>13){ // advance via path if blocked
          if(!hasLOS(eyeOf(e),new THREE.Vector3(tgt.x,tgt.y+1.3,tgt.z))){if(shouldRepath(e,tgt.x,tgt.z))setPath(e,tgt.x,tgt.z,tgt.y);followPath(e,dt,2.6);}
          else moveEnt(e,tgt.x,tgt.z,tgt.y,2.4,dt);
        }else if(dist<5)moveEnt(e,e.x-(tgt.x-e.x),e.z-(tgt.z-e.z),e.y,1.8,dt);
        else { // strafe
          e.strafeT-=dt;if(e.strafeT<=0){e.strafeDir=rngAI()<.5?-1:1;e.strafeT=1+rngAI();}
          const px=-(tgt.z-e.z)/(dist||1)*e.strafeDir,pz=(tgt.x-e.x)/(dist||1)*e.strafeDir;
          moveEnt(e,e.x+px*2,e.z+pz*2,e.y,1.6,dt);faceToward(e,tgt.x,tgt.z);
        }
        enemyShoot(e,target);
      }else if(e.lastSeen){if(followPath(e,dt,2.2)&&Math.hypot(e.lastSeen.x-e.x,e.lastSeen.z-e.z)<1)e.state='SEARCH';}
    }
  }
  // rusher special: triggered separately, rushes stairs
  if(e.rusher&&G.rusherTriggered&&!e.rushDone&&e.state!=='ATTACK'){
    if(followPath(e,dt,3.0)){e.rushDone=true;if(e.lastSeen)alertAttack(e,e.lastSeen);}
  }
  animateRig(e,dt,e.speed||0,e.yaw,0);placeRig(e);e.y=floorY(e.x,e.z,e.y);e.rig.root.position.y=e.y;
}
function updateSquadMember(s,idx,dt){
  if(s.wounded){s.rig.root.rotation.x=-1.35;s.rig.root.position.set(s.x,s.y+0.12,s.z);return;}
  s.speed=0;
  // engage: alerted hostiles, or close ones only (player leads the clearing)
  let target=null,bd=24;for(const e of G.enemies){if(e.dead)continue;if(e.state!=='ATTACK'&&Math.hypot(e.x-s.x,e.z-s.z)>12)continue;const d=Math.hypot(e.x-s.x,e.z-s.z);if(d<bd&&hasLOS(eyeOf(s),new THREE.Vector3(e.x,e.y+1.2,e.z))){bd=d;target=e;}}
  const armed=G.armedCharge;
  if(G.fuseAt>0||armed){
    const c=armed||{x:8,z:12};const d=Math.hypot(s.x-c.x,s.z-c.z);
    if(d<7.5){moveEnt(s,c.x+(s.x-c.x)*2,c.z+(s.z-c.z)*2,s.y,3,dt);animateRig(s,dt,s.speed||0,s.yaw,0);placeRig(s);return;}
    // hold position
    if(target&&bd<20)squadShoot(s,target,dt);
    animateRig(s,dt,0,s.yaw,0);placeRig(s);s.strobe.material.emissiveIntensity=(Math.sin(G.clock*6)>0?2.4:.2);return;
  }
  // follow via nav to stack offset
  const fwd={x:-Math.sin(G.yaw),z:-Math.cos(G.yaw)};const off=[[-1.1,-1.4],[1.1,-1.6],[0,-2.8]][idx];
  const tx=G.player.x+fwd.x*off[1]+(-fwd.z)*off[0],tz=G.player.z+fwd.z*off[1]+(fwd.x)*off[0];
  const distP=Math.hypot(tx-s.x,tz-s.z);
  if(distP>1.2){
    const blocked=!hasLOS(new THREE.Vector3(s.x,s.y+1,s.z),new THREE.Vector3(tx,G.player.y+1,tz));
    if(distP>5||blocked){if(shouldRepath(s,tx,tz))setPath(s,tx,tz,G.player.y);followPath(s,dt,3.9);}
    else moveEnt(s,tx,tz,G.player.y,3.4,dt);
  }
  if(target)squadShoot(s,target,dt);
  animateRig(s,dt,s.speed||0,s.yaw,0);placeRig(s);s.y=floorY(s.x,s.z,s.y);s.rig.root.position.y=s.y;
  s.strobe.material.emissiveIntensity=(Math.sin(G.clock*6+idx)>0?2.4:.2);
}
function squadShoot(s,target,dt){
  faceToward(s,target.x,target.z);
  if(s.reloadEnd&&G.clock<s.reloadEnd){s.rig.reloading=true;return;}
  if(s.reloadEnd&&G.clock>=s.reloadEnd){s.mag=30;s.reloadEnd=0;s.rig.reloading=false;}
  if(G.clock-s.lastShot<0.38)return;
  if(s.mag<=0){s.reloadEnd=G.clock+2;s.rig.reloading=true;callout(s.name,'Reloading!');return;}
  s.mag--;s.lastShot=G.clock;
  const o=eyeOf(s);const aim=new THREE.Vector3(target.x,target.y+1.1,target.z);const dist=o.distanceTo(aim);const d=aim.sub(o).normalize();
  const spread=0.06+dist*0.0006;d.x+=(rngAI()+rngAI()-1)*spread;d.y+=(rngAI()+rngAI()-1)*spread*.6;d.z+=(rngAI()+rngAI()-1)*spread;d.normalize();
  shootFrom(s,o,d,10,false);
}
function updateDog(dt){
  const dog=G.dog;if(!dog)return;dog.speed=0;
  if(dog.downed){if(G.clock>(dog.downedUntil||0)){dog.downed=false;dog.hp=30;}else{dog.rig.root.position.set(dog.x,dog.y,dog.z);return;}}
  // bark
  let nd=1e9;for(const e of G.enemies)if(!e.dead)nd=Math.min(nd,Math.hypot(e.x-dog.x,e.z-dog.z));
  if(nd<15&&G.clock>G.barkCD&&G.introDone){G.barkCD=G.clock+5;playSound('bark');logEvent('bark','CAIRO bark — hostile within 15m',{dist:+nd.toFixed(1)});dog.barked=true;}
  let tx,tz;
  if(dog.breachTarget&&(G.armedCharge||G.fuseAt>0)){tx=dog.breachTarget.x;tz=dog.breachTarget.z;}
  else if(G.clock<G.breachRoomUntil&&dog.breachTarget){tx=dog.breachTarget.x;tz=dog.breachTarget.z;}
  else{const fwd={x:-Math.sin(G.yaw),z:-Math.cos(G.yaw)};tx=G.player.x+fwd.x*-0.5+1;tz=G.player.z+fwd.z*-0.5;}
  const d=Math.hypot(tx-dog.x,tz-dog.z);
  if(d>0.8){const blocked=!hasLOS(new THREE.Vector3(dog.x,dog.y+0.6,dog.z),new THREE.Vector3(tx,G.player.y+0.6,tz));
    if(d>5||blocked){if(shouldRepath(dog,tx,tz))setPath(dog,tx,tz,G.player.y);followPath(dog,dt,3.8);}
    else moveEnt(dog,tx,tz,G.player.y,3.4,dt);}
  // dog rig animate
  const p=dog.rig.parts;dog.rig.walkPhase=(dog.rig.walkPhase||0)+dt*(dog.speed?9:0);
  const ph=dog.rig.walkPhase;p.legs.forEach((l,i)=>l.rotation.x=Math.sin(ph+(i%2)*Math.PI)*.5*(dog.speed>.2?1:0));
  p.tail.rotation.y=Math.sin(G.clock*3)*.3;
  dog.rig.root.position.set(dog.x,dog.y+Math.abs(Math.sin(ph))*.03*(dog.speed>.2?1:0),dog.z);dog.rig.root.rotation.y=dog.yaw;
  // dog faces movement: root forward is +X in model, adjust
  dog.rig.root.rotation.y=dog.yaw+Math.PI/2;
  dog.y=floorY(dog.x,dog.z,dog.y);
}
function updateCivilian(c,dt){
  if(c.dead){animateRig(c,dt,0);placeRig(c);return;}
  c.crouched=true;
  if(c.fleeT&&G.clock<c.fleeT){moveEnt(c,c.corner[0],c.corner[1],c.y,2,dt);}
  animateRig(c,dt,c.speed||0);placeRig(c);c.y=floorY(c.x,c.z,c.y);c.rig.root.position.y=c.y;
}

// === SHOOTING ===
function rayCharHit(o,d,maxD,includePlayer=false,excludeEnt=null){
  let best=null,bestT=maxD;
  const chars=[...G.enemies,...G.squad,...G.civilians,G.dog].filter(e=>e&&e!==excludeEnt&&!e.dead&&e.alive!==false);
  if(includePlayer)chars.push({kind:'player',x:G.player.x,y:G.player.y,z:G.player.z,rig:{parts:{scale:1}}});
  for(const e of chars){
    const s=(e.crouched?0.85:1)*(e.parts?.scale||e.rig?.parts?.scale||1);
    const spheres=e.kind==='dog'?[[0.42,0.32,'body']]:[[0.38*s,0.33*s,'body'],[0.68*s,0.34*s,'body'],[0.98*s,0.34*s,'body'],[1.24*s,0.32*s,'body'],[1.5*s,0.17*s,'head']];
    for(const[cy,r,partName]of spheres){
      const c=new THREE.Vector3(e.x,e.y+cy,e.z);const oc=new THREE.Vector3().subVectors(c,o);const tca=oc.dot(d);if(tca<0)continue;const d2=oc.lengthSq()-tca*tca;if(d2<r*r&&tca<bestT){bestT=tca;best={ent:e,head:partName==='head',dist:tca,point:o.clone().addScaledVector(d,tca)};}
    }
  }
  return best;
}
function shootFrom(shooter,o,d,dmg,byPlayer){
  const wallT=rayWorld(o,d,120);
  const hit=rayCharHit(o,d,wallT,!byPlayer,typeof shooter==='object'?shooter:null);
  const end=hit?hit.point:o.clone().addScaledVector(d,wallT);
  spawnTracer(o.clone().addScaledVector(d,1.2),end,byPlayer?0xffd27a:0xff8866);
  const shooterKind=typeof shooter==='string'?shooter:shooter?.kind;
  if(shooterKind==='enemy')playSound('enemy',Math.max(.15,1-(o.distanceTo(new THREE.Vector3(G.player.x,G.player.y,G.player.z))/45)));
  if(shooterKind==='squad')playSound('hk',.5);
  if(hit){
    if(hit.ent.kind==='player'){applyPlayerDamage(dmg,o);}
    else if(byPlayer){if(hit.ent.kind==='enemy')G.hitmarkT=G.clock;damageCharacter(hit.ent,dmg*(hit.head?2.5:1),true,hit.head);}
    else if(shooterKind==='squad'){if(hit.ent.kind==='enemy')damageCharacter(hit.ent,dmg,false,hit.head,'squad');}
    else if(shooterKind==='enemy'){if(hit.ent.kind==='squad'||hit.ent.kind==='dog')damageCharacter(hit.ent,dmg,false,hit.head);}
    spawnParticles(hit.point,4,0xbb9977,1,.4,.06);
    return{hit:true,ent:hit.ent,head:hit.head};
  }
  if(wallT<120)spawnParticles(end,3,0x998866,1,.35,.05);
  return{hit:false};
}
function playerShoot(){
  const p=G.player;if(!G.introDone||G.paused||G.failed||G.won||G.phase==='start')return;
  if(G.clock<p.drawUntil||p.reload)return;
  if(G.sprinting&&p.moving)return;
  const wk=WEAPONS[p.weapon];if(G.clock-p.lastShot<wk.rate)return;
  if(p.mag[p.weapon]<=0){hint('Mag empty — R to reload');p.lastShot=G.clock;return;}
  p.mag[p.weapon]--;p.lastShot=G.clock;G.stats.shots++;
  playSound(p.weapon==='hk'?'hk':p.weapon==='mp7'?'mp7':'p226');
  const spread=(G.ads?0.004:0.018)*(p.moving?1.6:1);
  const d=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(G.pitch,G.yaw,0,'YXZ'));
  d.x+=(rngShot()-.5)*2*spread;d.y+=(rngShot()-.5)*2*spread;d.z+=(rngShot()-.5)*2*spread;d.normalize();
  const o=new THREE.Vector3(p.x,p.y+1.62,p.z);
  shootFrom('player',o,d,wk.dmg,true);
  addNoise({x:p.x,z:p.z,y:p.y},wk.alert,'shot');
  muzzleLight.intensity=8;if(viewGun.userData.flash){viewGun.userData.flash.visible=true;viewGun.userData.flash.rotation.z=Math.random()*3;}setTimeout(()=>{muzzleLight.intensity=0;if(viewGun.userData.flash)viewGun.userData.flash.visible=false;},45);
  // shell (cosmetic)
  const sh=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.04),new THREE.MeshStandardMaterial({color:0xccaa44,metalness:.8,roughness:.3}));sh.position.copy(o);scene.add(sh);G.shells.push({m:sh,v:new THREE.Vector3(.6,1,.2),until:G.clock+1});
  camera.position.y+=0.012; // kick handled in loop via recoil var
  G.recoil=(G.recoil||0)+0.006;
}
function startReload(){
  const p=G.player;if(p.reload||!G.introDone)return;const w=p.weapon;const wk=WEAPONS[w];
  if(p.mag[w]>=wk.mag||p.reserve[w]<=0)return;
  const gen=++p.reloadGen;p.reload={weapon:w,end:G.clock+wk.reload,gen};playSound('reload');
}
function finishReloadIfDue(){
  const p=G.player;if(!p.reload)return;if(G.clock<p.reload.end)return;
  const{weapon:w,gen}=p.reload;p.reload=null;if(gen!==p.reloadGen)return;if(G.failed||G.won)return;
  const wk=WEAPONS[w];const need=wk.mag-p.mag[w];const take=Math.min(need,p.reserve[w]);p.mag[w]+=take;p.reserve[w]-=take;
}
function switchWeapon(w){
  const p=G.player;if(!WEAPONS[w]||p.weapon===w)return;p.reload=null;p.reloadGen++;p.weapon=w;p.drawUntil=G.clock+.6;rebuildViewGun(w);
}
function explodeAt(pos,radius,dmg){
  explosionFx(pos);addNoise(pos,999,'explosion');
  const all=[{kind:'player',x:G.player.x,y:G.player.y,z:G.player.z},...G.enemies,...G.squad,...G.civilians,G.dog];
  for(const e of all){const d=Math.hypot(e.x-pos.x,e.z-pos.z,( (e.y||0)-pos.y)*0.7);if(d>=radius)continue;
    if(e.kind==='player')applyPlayerDamage(dmg,pos);
    else if(e.dead||e.alive===false)continue;
    else damageCharacter(e,dmg,false);
  }
  // civilians blast also kills -> damageCharacter handles fail (blast dmg>hp)
}
function plantCharge(target,pos){
  const p=G.player;
  if(p.charges<=0){hint('No breaching charges left — find the ammo cache');return false;}
  if(G.armedCharge){hint('Charge already armed — stand clear and press E to detonate');return false;}
  p.charges--;
  G.armedCharge={target,x:pos.x,z:pos.z,y:pos.y};
  blastCircle.position.set(pos.x,pos.y+0.07,pos.z);blastCircle.visible=true;
  chargeMesh=new THREE.Group();chargeMesh.position.set(pos.x,pos.y+0.15,pos.z);scene.add(chargeMesh);part(chargeMesh,.4,.18,.3,MAT.dark,0,0,0);part(chargeMesh,.08,.08,.08,new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff0000,emissiveIntensity:2}),0,.13,0);
  hint('Charge armed — stand clear of the red circle, press E to detonate');callout('ZERO-2','Charge armed. Stand clear!');
  logEvent('charge-plant',target);
  // dog runs past charge (H9)
  if(G.dog&&!G.dog.downed){G.dog.breachTarget={x:pos.x+(pos.x<0?-3: -0),z:pos.z-4,y:pos.y};G.breachRoomUntil=G.clock+6;}
  return true;
}
function detonateArmed(){
  if(!G.armedCharge)return;G.fuseAt=G.clock+3;hint('Detonating in 3 seconds — stand clear!');playSound('beepCharge');
  logEvent('charge-detonate-start',G.armedCharge.target);
}
function doDetonation(){
  const c=G.armedCharge;G.armedCharge=null;G.fuseAt=-1;blastCircle.visible=false;if(chargeMesh){scene.remove(chargeMesh);chargeMesh=null;}
  const pos=new THREE.Vector3(c.x,c.y+0.4,c.z);
  if(c.target==='gate'){
    // kill inside 6m first, then destroy
    explodeAt(pos,6,200);
    if(G.failed)return;
    G.gateDestroyed=true;if(gateMesh)gateMesh.visible=false;if(gateCollider)removeCollider(gateCollider);
    spawnParticles(pos,30,0x887766,4,1.2,.25);
  }else if(c.target==='wreck'){
    explodeAt(pos,6,200);if(G.failed)return;
    G.wreckDestroyed=true;if(wreckGroup){wreckGroup.rotation.z=0.5;wreckGroup.position.y=-0.4;}
    if(wreckCollider)removeCollider(wreckCollider);
  }
  checkObjectives();
}
function throwFrag(){
  const p=G.player;if(p.frags<=0||!G.introDone)return;p.frags--;
  const d=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(G.pitch,G.yaw,0,'YXZ'));
  const m=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshStandardMaterial({color:0x2c3a26,roughness:.6,metalness:.3}));m.position.set(p.x,p.y+1.5,p.z);scene.add(m);
  G.grenades.push({m,v:d.multiplyScalar(13).add(new THREE.Vector3(0,3.5,0)),fuse:G.clock+4,y:p.y});
  logEvent('frag','Frag thrown');
}
function interact(){
  const p=G.player;if(!G.introDone||G.paused||G.failed||G.won)return;
  // fuse trigger takes precedence when armed and not near another interactable
  const nearIntel=G.intelItems.find(i=>!i.taken&&Math.hypot(i.x-p.x,i.z-p.z)<1.8&&Math.abs(i.y-(p.y+1))<2.2);
  const nearCache=Math.hypot(G.cachePos.x-p.x,G.cachePos.z-p.z)<2&&Math.abs(p.y-G.cachePos.y)<2;
  const nearDoor=doors.find(d=>Math.hypot(d.cx-p.x,d.cz-p.z)<1.8&&Math.abs(d.y0-p.y)<2);
  if(G.armedCharge&&!nearIntel&&!nearCache){detonateArmed();return;}
  if(G.fuseAt>0)return;
  if(nearIntel){nearIntel.taken=true;nearIntel.mesh.visible=false;G.intel++;callout('ZERO-1',`Intel secured (${G.intel}/3)`);logEvent('intel',nearIntel.name,{count:G.intel});checkObjectives();return;}
  if(nearCache){
    const full=p.reserve.hk>=120&&p.reserve.mp7>=160&&p.reserve.p226>=60&&p.charges>=3&&p.frags>=2&&Object.values(p.mag).every((v,i)=>v>=Object.values(WEAPONS)[i].mag);
    if(G.cacheUsed){hint('Ammo cache already used');return;}
    if(full){hint('Everything already full — cache not needed');return;}
    G.cacheUsed=true;p.reserve={hk:120,mp7:160,p226:60};p.charges=3;p.frags=2;hint('Ammo, charges and frags restored');callout('ZERO-2','Ammo cache used — topped off');logEvent('cache','Ammo cache used');return;
  }
  // charge targets
  const gateDist=Math.hypot(-4-p.x,20-p.z);
  if(!G.gateDestroyed&&gateDist<3.2&&Math.abs(p.y)<2){plantCharge('gate',{x:-4,y:0,z:20});return;}
  const wreckDist=Math.hypot(8-p.x,12-p.z);
  if(!G.wreckDestroyed&&wreckDist<4.2){
    if(G.current!==7){hint('Destroy the wreck after SSE (O8)');return;}
    plantCharge('wreck',{x:8,y:0,z:12});return;
  }
  if(nearDoor){nearDoor.target=nearDoor.target>0.5?0:1.4;playSound('door');return;}
  // invalid plant attempt: no target - refused, no charge spent
  logEvent('interact-none','No valid target');hint('Nothing to interact with here (charges need the gate or the wreck)');
}
// === INPUT ===
const touchState={stickId:null,lookId:null,stickVec:{x:0,y:0},lookLast:null,fire:false};
function setPaused(v,force=false){
  if(!G.started||G.won||G.failed)return;
  if(v&&!G.introDone&&!force)return; // intro pause only via force (lock loss during intro ignored)
  G.paused=v;$('pauseScreen').classList.toggle('hidden',!v);logEvent(v?'pause':'resume','Sim '+(v?'paused':'resumed'));
}
function bindInput(){
  addEventListener('keydown',e=>{
    if(e.repeat)return;G.keys[e.code]=true;
    if(!G.started||G.paused||G.failed||G.won)return;
    if(e.code==='KeyE')interact();
    else if(e.code==='KeyR')startReload();
    else if(e.code==='KeyN'){G.nvg=!G.nvg;$('nvgOverlay').style.display=G.nvg?'block':'none';logEvent('nvg',G.nvg?'on':'off');}
    else if(e.code==='KeyF'){G.flash=!G.flash;logEvent('flashlight',G.flash?'on':'off');if(G.flash){const inHouse=(x,z)=>x>HOUSE.x1&&x<HOUSE.x2&&z>HOUSE.z1&&z<HOUSE.z2;const inGuest=(x,z)=>x>-22&&x<-12&&z>8&&z<18;const bld=inHouse(G.player.x,G.player.z)?'house':inGuest(G.player.x,G.player.z)?'guest':null;if(bld)for(const en of G.enemies)if(!en.dead&&Math.abs(en.y-G.player.y)<1.6&&(bld==='house'?inHouse(en.x,en.z):inGuest(en.x,en.z)))alertAttack(en,{x:G.player.x,y:G.player.y,z:G.player.z});}}
    else if(e.code==='KeyG')throwFrag();
    else if(e.code==='Digit1')switchWeapon('hk');else if(e.code==='Digit2')switchWeapon('mp7');else if(e.code==='Digit3')switchWeapon('p226');
  });
  addEventListener('keyup',e=>{G.keys[e.code]=false;});
  addEventListener('mousemove',e=>{if(document.pointerLockElement&&G.started&&!G.paused){G.yaw-=e.movementX*0.0022;G.pitch=Math.max(-1.35,Math.min(1.35,G.pitch-e.movementY*0.0022));}});
  renderer.domElement.addEventListener('mousedown',e=>{
    if(!G.started||G.failed||G.won)return;
    if(!document.pointerLockElement&&G.introDone){renderer.domElement.requestPointerLock?.();return;}
    if(e.button===0){G.mouseDown=true;playerShoot();}
    if(e.button===2)G.ads=true;
  });
  addEventListener('mouseup',e=>{if(e.button===0)G.mouseDown=false;if(e.button===2)G.ads=false;});
  addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('pointerlockchange',()=>{
    const locked=!!document.pointerLockElement;
    if(locked)G.lockHad=true;
    else if(G.lockHad&&G.started&&G.introDone&&!G.won&&!G.failed&&G.phase==='playing')setPaused(true,true);
  });
  $('startBtn').addEventListener('click',()=>{startMission();});
  $('resumeBtn').addEventListener('click',()=>{setPaused(false);renderer.domElement.requestPointerLock?.();});
  $('failRestartBtn').addEventListener('click',()=>{resetMission();startMission();});
  $('aarRestartBtn').addEventListener('click',()=>{resetMission();startMission();});
  // touch
  const isTouch=('ontouchstart'in window);if(isTouch)$('touchUI').classList.remove('hidden');
  const touchEl=renderer.domElement;
  touchEl.addEventListener('touchstart',e=>{for(const t of e.changedTouches){if(t.clientX<innerWidth*0.45&&t.clientY>innerHeight*0.45&&touchState.stickId===null)touchState.stickId=t.identifier;else if(touchState.lookId===null){touchState.lookId=t.identifier;touchState.lookLast={x:t.clientX,y:t.clientY};}}},{passive:false});
  touchEl.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier===touchState.stickId){const dx=t.clientX-70,dy=t.clientY-(innerHeight-125);touchState.stickVec={x:Math.max(-1,Math.min(1,dx/45)),y:Math.max(-1,Math.min(1,dy/45))};$('stickKnob').style.transform=`translate(${dx*.5}px,${dy*.5}px)`;}else if(t.identifier===touchState.lookId&&touchState.lookLast){G.yaw-=(t.clientX-touchState.lookLast.x)*0.005;G.pitch=Math.max(-1.35,Math.min(1.35,G.pitch-(t.clientY-touchState.lookLast.y)*0.005));touchState.lookLast={x:t.clientX,y:t.clientY};}}},{passive:false});
  const endTouch=e=>{for(const t of e.changedTouches){if(t.identifier===touchState.stickId){touchState.stickId=null;touchState.stickVec={x:0,y:0};}if(t.identifier===touchState.lookId){touchState.lookId=null;touchState.lookLast=null;}}};
  touchEl.addEventListener('touchend',endTouch);touchEl.addEventListener('touchcancel',endTouch);
  $('fireBtn').addEventListener('touchstart',e=>{e.preventDefault();touchState.fire=true;G.mouseDown=true;playerShoot();},{passive:false});
  $('fireBtn').addEventListener('touchend',()=>{touchState.fire=false;G.mouseDown=false;});
  $('touchE').addEventListener('touchstart',e=>{e.preventDefault();interact();},{passive:false});
  $('touchNVG').addEventListener('touchstart',e=>{e.preventDefault();G.keys['KeyN']=true;dispatchEvent(new KeyboardEvent('keydown',{code:'KeyN'}));},{passive:false});
}
// === HUD / MINIMAP ===
function objectiveTarget(){
  const cur=G.objectives[G.current]?.id;
  const hvt=G.enemies.find(e=>e.hvt);
  switch(cur){case'O1':return{x:-4,z:34};case'O2':return{x:-4,z:20};case'O3':return{x:-17,z:13};case'O4':return{x:2,z:0};case'O5':return{x:2,z:0};case'O6':return{x:hvt?.x||7,z:hvt?.z||-14};case'O7':{const it=G.intelItems.find(i=>!i.taken);return it?{x:it.x,z:it.z}:{x:8,z:-17};}case'O8':return{x:8,z:12};case'O9':return{x:32,z:28};default:return{x:32,z:28};}
}
function drawMinimap(){
  const cv=$('minimap'),ctx=cv.getContext('2d');ctx.fillStyle='#061206';ctx.fillRect(0,0,180,150);
  const mx=x=>(x+32)/68*180,mz=z=>(z+30)/68*150;
  ctx.strokeStyle='#5a6b4a';ctx.lineWidth=2;
  for(const c of colliders){if(!['perim','main','guest','stair','part','gate'].includes(c.id))continue;if(c.y1>0.1&&c.id!=='gate')continue;ctx.strokeRect(mx(c.x1),mz(c.z1),Math.max(2,mx(c.x2)-mx(c.x1)),Math.max(2,mz(c.z2)-mz(c.z1)));}
  const ot=objectiveTarget();ctx.fillStyle='#ffd75e';ctx.beginPath();const ox=mx(ot.x),oz=mz(ot.z);for(let i=0;i<5;i++){const a=-Math.PI/2+i*4*Math.PI/5;ctx[i?'lineTo':'moveTo'](ox+Math.cos(a)*6,oz+Math.sin(a)*6);}ctx.fill();
  if(G.current>=8){ctx.strokeStyle='#ffd75e';ctx.beginPath();ctx.arc(mx(32),mz(28),10,0,7);ctx.stroke();}
  let red=0;for(const e of G.enemies){if(e.dead||e.state!=='ATTACK')continue;red++;ctx.fillStyle='#ff3333';ctx.fillRect(mx(e.x)-2,mz(e.z)-2,4,4);}
  ctx.fillStyle='#4dff6a';for(const s of G.squad){if(s.wounded)continue;ctx.beginPath();ctx.arc(mx(s.x),mz(s.z),3,0,7);ctx.fill();}
  if(G.dog&&!G.dog.downed){ctx.beginPath();ctx.arc(mx(G.dog.x),mz(G.dog.z),2,0,7);ctx.fill();}
  // player arrow
  ctx.save();ctx.translate(mx(G.player.x),mz(G.player.z));ctx.rotate(Math.atan2(-Math.sin(G.yaw),-Math.cos(G.yaw))+Math.PI);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.restore();
  G.minimap={player:true,squad:G.squad.filter(s=>!s.wounded).length,objective:!!ot,redDots:red,exfil:G.current>=8};
}
function updateHUD(){
  const p=G.player;
  $('healthFill').style.width=Math.max(0,p.hp)+'%';$('healthFill').style.background=p.hp>50?'#4caf50':p.hp>25?'#d8a022':'#c22';$('healthText').textContent=Math.ceil(p.hp);
  $('weaponName').textContent=WEAPONS[p.weapon].name+(p.reload?' — RELOADING':'')+(G.clock<p.drawUntil?' — DRAWING':'');
  $('ammoText').textContent=`${p.mag[p.weapon]} / ${p.reserve[p.weapon]}`;
  $('equipText').textContent=`Charges ${p.charges} · Frags ${p.frags} · Intel ${G.intel}/3`;
  $('nvgText').textContent=`NVG ${G.nvg?'ON':'OFF'} · LIGHT ${G.flash?'ON':'OFF'}`;
  const t=G.clock;$('timer').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  $('squadStatus').textContent=G.squad.map(s=>`${s.name}: ${s.wounded?'DOWN':Math.ceil(s.hp)}`).join(' · ')+` · CAIRO: ${G.dog?.downed?'DOWN':Math.ceil(G.dog?.hp||0)}`;
  $('hitmarker').style.opacity=(G.clock-G.hitmarkT<0.12)?1:0;
  $('targetId').textContent=G.targetId||'';
  const dd=$('dmgDir');if(G.clock-G.dmgDirT<0.9){dd.style.opacity=1;dd.style.transform=`translateX(-50%) rotate(${((G.dmgDirAngle-G.yaw)*180/Math.PI).toFixed(0)}deg)`;}else dd.style.opacity=0;
  $('blastWarn').textContent=G.fuseAt>0?'⚠ DETONATING — STAND CLEAR':(G.armedCharge?'⚠ CHARGE ARMED — STAND CLEAR (E TO DETONATE)':'');
  // compass
  const deg=(( -G.yaw*180/Math.PI)%360+360)%360;const dirs=['N','NE','E','SE','S','SW','W','NW'];$('compassTape').textContent=`${dirs[Math.round(deg/45)%8]} ${Math.round(deg)}°`;
  // NVG whiteout in lit interiors
  if(G.nvg){const inside=(p.x>HOUSE.x1&&p.x<HOUSE.x2&&p.z>HOUSE.z1&&p.z<HOUSE.z2)||(p.x>-22&&p.x<-12&&p.z>8&&p.z<18);$('nvgOverlay').classList.toggle('whiteout',inside);}
  drawMinimap();
}
// === SNAPSHOT / DEBUG ===
function snapEnt(e){return{x:+e.x.toFixed(2),y:+e.y.toFixed(2),z:+e.z.toFixed(2),floorY:+floorY(e.x,e.z,e.y).toFixed(2),hp:e.hp,alive:!e.dead&&e.alive!==false,dead:!!e.dead};}
function buildSnapshot(){
  const p=G.player;
  window.__game={
    phase:G.phase,paused:G.paused,started:G.started,introDone:G.introDone,crashDone:G.crashDone,seed:SEED,
    objectives:G.objectives.map((o,i)=>({id:o.id,label:o.label,done:o.done,active:i===G.current})),currentObjective:G.objectives[G.current]?.id||null,current:G.current,
    player:{pos:{x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2)},floorY:+floorY(p.x,p.z,p.y).toFixed(2),hp:p.hp,weapon:p.weapon,mag:{...p.mag},reserve:{...p.reserve},ammo:{weapon:p.weapon,mag:p.mag[p.weapon],reserve:p.reserve[p.weapon]},charges:p.charges,frags:p.frags,yaw:+G.yaw.toFixed(3),pitch:+G.pitch.toFixed(3),reloading:!!p.reload,reloadWeapon:p.reload?.weapon||null,sprinting:G.sprinting},
    squad:G.squad.map(s=>({name:s.name,pos:{x:+s.x.toFixed(2),y:+s.y.toFixed(2),z:+s.z.toFixed(2)},floorY:+floorY(s.x,s.z,s.y).toFixed(2),hp:s.hp,wounded:s.wounded,mag:s.mag,...snapEnt(s)})),
    dog:G.dog?{name:'CAIRO',pos:{x:+G.dog.x.toFixed(2),y:+G.dog.y.toFixed(2),z:+G.dog.z.toFixed(2)},floorY:+floorY(G.dog.x,G.dog.z,G.dog.y).toFixed(2),hp:G.dog.hp,downed:G.dog.downed,barked:G.dog.barked}:null,
    enemies:G.enemies.map(e=>({id:e.id,pos:{x:+e.x.toFixed(2),y:+e.y.toFixed(2),z:+e.z.toFixed(2)},floorY:+floorY(e.x,e.z,e.y).toFixed(2),state:e.state,armed:true,hp:e.hp,alive:!e.dead,dead:e.dead,zone:e.zone,hvt:!!e.hvt,reloading:e.reloading,mag:e.mag,targetKind:e.targetKind||null,lastSeenT:e.lastSeenT})),
    civilians:G.civilians.map(c=>({id:c.id,pos:{x:+c.x.toFixed(2),y:+c.y.toFixed(2),z:+c.z.toFixed(2)},floorY:+floorY(c.x,c.z,c.y).toFixed(2),hp:c.hp,alive:!c.dead,armed:false})),
    alertLevel:G.enemies.some(e=>!e.dead&&e.state==='ATTACK')?3:G.enemies.some(e=>!e.dead&&e.state==='SEARCH')?2:G.enemies.some(e=>!e.dead&&e.state==='SUSPICIOUS')?1:0,
    intel:G.intel,intelItems:G.intelItems.map(i=>({id:i.id,pos:{x:i.x,y:i.y,z:i.z},taken:i.taken})),
    clock:+G.clock.toFixed(2),stats:{...G.stats},framesRendered:G.frames,teleportsUsed:G.teleports,events:G.events.slice(-600),
    won:G.won,failed:G.failed,failReason:G.failReason,grade:G.grade||null,aar:G.aar||null,cacheUsed:G.cacheUsed,
    armedCharge:G.armedCharge,fuseAt:G.fuseAt,gateDestroyed:G.gateDestroyed,wreckDestroyed:G.wreckDestroyed,wreckVisible:wreckGroup?.visible||false,
    geronimoFired:G.geronimoFired,ekiaFired:G.ekiaFired,nvg:G.nvg,flashlight:G.flash,minimap:{...G.minimap},targetId:G.targetId,
    enemyCoverLog:G.enemyCoverLog.slice(-10),audio:audioLog.slice(-80),audioIds:[...new Set(audioLog.map(a=>a.id))],squadKills:G.squadKills||0,
  };
}
// === MAIN LOOP ===
let flashLight=null,smokeTimer=0;
function setupLights(){flashLight=new THREE.SpotLight(0xfff6d8,0,18,0.55,0.45);flashLight.position.set(.2,-.15,-.4);const tgt=new THREE.Object3D();tgt.position.set(0,0,-6);vmGroup.add(tgt);flashLight.target=tgt;vmGroup.add(flashLight);}
function updateIntro(dt){
  G.introT+=dt;const t=G.introT;
  if(t<7&&G.clock-(G.heliCD||0)>0.45){G.heliCD=G.clock;playSound('heli',.9);}
  if(flyHelo){flyHelo.position.set(-25+t*7,17,50-t*9);flyHelo.rotation.y=2.6;flyHelo.userData.rotor.rotation.y+=dt*28;flyHelo.userData.tr.rotation.x+=dt*30;flyHelo.visible=t<7;}
  if(crashHelo&&!G.crashDone){
    const k=Math.min(1,t/5.2);crashHelo.position.set(14-6*k,16-13.5*k*k,55-43*k);crashHelo.rotation.set(k*.5,2.8,k*.4);crashHelo.userData.rotor.rotation.y+=dt*28;
    if(t>1&&t<5)spawnParticles(new THREE.Vector3(crashHelo.position.x,0.3,crashHelo.position.z),1,0x776655,2,.6,.18);
    if(t>=5.2){G.crashDone=true;crashHelo.visible=false;wreckGroup.visible=true;playSound('stinger');explosionFx(new THREE.Vector3(8,0.8,12));logEvent('crash','RAZOR-1 crashed in courtyard');callout('ZERO-2','Razor 1 is down! We are on the ground, move!');}
  }
  const dk=Math.max(0,Math.min(1,(t-0.4)/3.8));G.player.y=8*(1-dk);
  for(const s of G.squad)s.y=G.player.y;if(G.dog)G.dog.y=G.player.y;
  if(t>=5.4&&G.crashDone&&G.player.y<=0.01){G.player.y=0;for(const s of G.squad)s.y=0;if(G.dog)G.dog.y=0;G.introDone=true;G.phase='playing';checkObjectives();}
}
function updatePlayer(dt){
  const p=G.player;
  if(!G.introDone){ // locked during flyover
    camera.position.set(p.x,p.y+1.62,p.z);camera.rotation.set(G.pitch,G.yaw,0,'YXZ');return;
  }
  if(G.failed||G.won){camera.position.set(p.x,p.y+1.62,p.z);camera.rotation.order='YXZ';camera.rotation.set(G.pitch,G.yaw,0);return;}
  let ix=0,iz=0;
  if(G.keys['KeyW']||G.keys['ArrowUp'])iz-=1;if(G.keys['KeyS']||G.keys['ArrowDown'])iz+=1;
  if(G.keys['KeyA']||G.keys['ArrowLeft'])ix-=1;if(G.keys['KeyD']||G.keys['ArrowRight'])ix+=1;
  ix+=touchState.stickVec.x;iz+=touchState.stickVec.y;
  const len=Math.hypot(ix,iz);p.moving=len>0.11;
  G.sprinting=(G.keys['ShiftLeft']||G.keys['ShiftRight'])&&iz<-0.1;
  if(G.sprinting&&p.reload){p.reload=null;p.reloadGen++;}
  const speed=G.sprinting?5.4:3.4;
  if(p.moving){
    ix/=Math.max(1,len);iz/=Math.max(1,len);
    const sin=Math.sin(G.yaw),cos=Math.cos(G.yaw);
    const wx=(ix*cos-iz*sin),wz=(ix*sin+iz*cos); // local to world: forward -Z
    // forward vector (-sin,-cos), right (cos,-sin)
    const fwdX=-sin,fwdZ=-cos,rightX=cos,rightZ=-sin;
    const mx=(rightX*ix+fwdX*-iz),mz=(rightZ*ix+fwdZ*-iz);
    let nx=p.x+mx*speed*dt,nz=p.z+mz*speed*dt;
    const fy=floorY(nx,nz,p.y);
    if(fy<=p.y+0.55){
      let c=collide(nx,nz,fy);
      if(Math.hypot(c.x-p.x,c.z-p.z)<speed*dt*0.3){const cx=collide(nx,p.z,fy),cz=collide(p.x,nz,fy);c=Math.hypot(cx.x-p.x,cx.z-p.z)>Math.hypot(cz.x-p.x,cz.z-p.z)?cx:cz;}
      p.x=c.x;p.z=c.z;
      const fy2=floorY(p.x,p.z,p.y);if(fy2<=p.y+0.55){if(fy2<p.y-0.01)p.y=Math.max(fy2,p.y-9*dt);else p.y=fy2;}
    }
    p.walkPhase+=dt*speed*2.2;
    if(G.clock-G.footCD>(G.sprinting?0.28:0.38)){G.footCD=G.clock;playSound(p.inside?'footstep-concrete':'footstep-gravel',.6);}
  }else p.y=floorY(p.x,p.z,p.y);
  // breadcrumbs
  const bc=G.breadcrumbs;const last=bc[bc.length-1];if(!last||Math.hypot(p.x-last[0],p.z-last[1])>0.6)bc.push([p.x,p.z,p.y]);
  if(G.mouseDown&&WEAPONS[p.weapon].auto)playerShoot();
  finishReloadIfDue();
  // camera
  const bob=p.moving?Math.sin(p.walkPhase)*0.045:0;
  G.recoil=Math.max(0,(G.recoil||0)-dt*0.04);
  camera.position.set(p.x,p.y+1.62+bob,p.z);
  camera.rotation.order='YXZ';camera.rotation.set(G.pitch+(G.recoil||0),G.yaw,0);
  const targetFov=G.ads?48:(G.nvg?56:70);camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*10);camera.updateProjectionMatrix();
  viewGun.position.set(G.ads?0:0.28,G.ads?-0.22:-0.28,-0.55);viewGun.rotation.x=p.reload?0.7:0;
  flashLight.intensity=G.flash?55:0;nvgLight.intensity=G.nvg?0.5:0;
  // target ID
  const dir=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(G.pitch,G.yaw,0,'YXZ'));const o=playerEye();
  const wallT=rayWorld(o,dir,22);const hit=rayCharHit(o,dir,wallT,false);
  G.targetId=(hit&&(hit.ent.kind==='squad'||hit.ent.kind==='dog'))?hit.ent.name:'';
  // Geronimo frustum+LOS (H14, no objective gate)
  const hvt=G.enemies.find(e=>e.hvt);
  if(hvt&&!hvt.dead&&!G.geronimoFired){
    const hv=new THREE.Vector3(hvt.x,hvt.y+1.3,hvt.z);const proj=hv.clone().project(camera);
    if(proj.z<1&&Math.abs(proj.x)<0.95&&Math.abs(proj.y)<0.95&&hasLOS(o,hv)&&o.distanceTo(hv)<40){G.geronimoFired=true;callout('ZERO-1','Geronimo, Geronimo, Geronimo');logEvent('geronimo','Geronimo, Geronimo, Geronimo');alertAttack(hvt,{x:p.x,y:p.y,z:p.z});}
  }
  // rusher trigger
  if(!G.rusherTriggered&&p.y>2&&p.x>HOUSE.x1&&p.x<HOUSE.x2&&p.z>HOUSE.z1&&p.z<HOUSE.z2){
    G.rusherTriggered=true;const r=G.enemies.find(e=>e.rusher);if(r&&!r.dead){r.path=navPath(r.x,r.z,r.y,11.5,-5,0);r.pathIdx=0;r.lastSeen={x:p.x,y:p.y,z:p.z};logEvent('rusher','Stair rusher triggered');}
  }
  p.inside=(p.x>HOUSE.x1&&p.x<HOUSE.x2&&p.z>HOUSE.z1&&p.z<HOUSE.z2)||(p.x>-22&&p.x<-12&&p.z>8&&p.z<18);
}
function separation(){
  const chars=[...G.enemies,...G.squad,...G.civilians,G.dog].filter(e=>e&&!e.dead);
  const all=[{x:G.player.x,z:G.player.z,isPlayer:true},...chars];
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
    const a=all[i],b=all[j];const dx=b.x-a.x,dz=b.z-a.z;const d=Math.hypot(dx,dz);
    if(d<0.55&&d>0.001){const push=(0.55-d)/2;const ux=dx/d,uz=dz/d;
      if(!a.isPlayer){a.x-=ux*push;a.z-=uz*push;}if(!b.isPlayer){b.x+=ux*push;b.z+=uz*push;}
      // player not pushed (player collision handles)
    }
  }
}
const clockT=new THREE.Clock();
function tick(){
  requestAnimationFrame(tick);
  const rawDt=Math.min(.05,clockT.getDelta());
  if(!G){renderer.render(scene,camera);return;}
  if(G.paused){renderer.render(scene,camera);G.frames++;buildSnapshot();return;}
  const dt=G.started?rawDt:0;
  if(G.started&&!G.won&&!G.failed)G.clock+=dt;
  if(G.started&&G.clock-(G.windCD||0)>4){G.windCD=G.clock;playSound('wind',.7);}
  if(G.started){
    if(G.phase==='intro')updateIntro(dt);
    // rotors always
    if(razor2){razor2.userData.rotor.rotation.y+=rawDt*25;razor2.position.y=15+Math.sin(G.clock*0.7)*0.4;}
    if(wreckGroup&&wreckGroup.visible&&!G.wreckDestroyed){smokeTimer-=rawDt;if(smokeTimer<=0){smokeTimer=.18;spawnParticles(new THREE.Vector3(8,1.5,12),1,0x222222,0.5,2.4,.35);}}
    updatePlayer(rawDt);
    if(G.introDone&&!G.won&&!G.failed){
      for(const e of G.enemies)updateEnemy(e,rawDt);
      G.squad.forEach((s,i)=>updateSquadMember(s,i,rawDt));
      updateDog(rawDt);for(const c of G.civilians)updateCivilian(c,rawDt);
      separation();
      // doors
      for(const d of doors){let near=false;const chars=[G.player,...G.squad,...G.enemies,...G.civilians,G.dog];for(const ch of chars){if(ch&&Math.hypot(ch.x-d.cx,ch.z-d.cz)<1.5&&Math.abs((ch.y||0)-d.y0)<2){near=true;break;}}
        d.target=near?1.35:0;d.open+=(d.target-d.open)*Math.min(1,rawDt*5);d.pivot.rotation.y=d.open;
        const idx=colliders.indexOf(d.c);if(d.open>0.7&&idx>=0)colliders.splice(idx,1);else if(d.open<=0.7&&idx<0)colliders.push(d.c);}
      // grenades
      for(let i=G.grenades.length-1;i>=0;i--){const gr=G.grenades[i];gr.v.y-=9.8*rawDt;gr.m.position.addScaledVector(gr.v,rawDt);
        const fy=floorY(gr.m.position.x,gr.m.position.z,gr.m.position.y+0.5);if(gr.m.position.y<fy+0.09){gr.m.position.y=fy+0.09;gr.v.y*=-0.35;gr.v.x*=0.7;gr.v.z*=0.7;}
        const cc=collide(gr.m.position.x,gr.m.position.z,gr.m.position.y,0.1);gr.m.position.x=cc.x;gr.m.position.z=cc.z;
        if(G.clock>=gr.fuse){explodeAt(gr.m.position.clone(),7,150);scene.remove(gr.m);G.grenades.splice(i,1);if(G.failed)break;}}
      // fuse
      if(G.fuseAt>0){playSound('beepCharge',.3);if(G.clock>=G.fuseAt)doDetonation();}
      // dog downed recovery timer set on blast handled via downedUntil in damage? set here
      checkObjectives();
    }
    // fx cleanup
    for(let i=G.tracers.length-1;i>=0;i--)if(G.clock>G.tracers[i].until){scene.remove(G.tracers[i].m);G.tracers.splice(i,1);}
    for(let i=G.particles.length-1;i>=0;i--){const pt=G.particles[i];if(G.clock>pt.until){scene.remove(pt.m);G.particles.splice(i,1);}else{if(pt.light)pt.m.intensity*=0.82;else{pt.m.position.addScaledVector(pt.v,rawDt);pt.v.y-=2*rawDt;}}}
    for(let i=G.shells.length-1;i>=0;i--){const sh=G.shells[i];if(G.clock>sh.until){scene.remove(sh.m);G.shells.splice(i,1);}else{sh.m.position.addScaledVector(sh.v,rawDt);sh.v.y-=5*rawDt;}}
    // dead enemies animate collapse
    for(const e of[...G.enemies,...G.civilians])if(e.dead) {animateRig(e,rawDt,0);placeRig(e);}
  }
  updateHUD();renderer.render(scene,camera);G.frames++;buildSnapshot();
}
window.__debug={
  teleport(x,y,z){G.teleports++;G.player.x=x;G.player.y=y;G.player.z=z;G.player.y=floorY(x,z,y);G.breadcrumbs=[[x,z,G.player.y]];buildSnapshot();},
  lookAt(x,y,z){const p=G.player;const dx=x-p.x,dy=y-(p.y+1.62),dz=z-p.z;G.yaw=Math.atan2(-dx,-dz);G.pitch=Math.max(-1.35,Math.min(1.35,Math.atan2(dy,Math.hypot(dx,dz))));},
  fire(){playerShoot();},
  press(code,ms){return new Promise(res=>{dispatchEvent(new KeyboardEvent('keydown',{code}));setTimeout(()=>{dispatchEvent(new KeyboardEvent('keyup',{code}));res();},ms);});},
  damage(n){applyPlayerDamage(n,null);},
  restart(){resetMission();startMission();},
  lockLoss(){setPaused(true,true);},
  resume(){setPaused(false);},
  start(){startMission();},
};
// boot
$('seedLine').textContent='Seed: '+SEED+' (?seed=<n> for replay)';
buildStaticWorld();buildViewmodel();setupLights();G=freshState();resetMission();bindInput();
if(params.get('autostart')==='1'){/* driver clicks real button instead */}
tick();









