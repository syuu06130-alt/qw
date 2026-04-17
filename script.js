/* =============================================
   NERO — 湾岸レーサー  ·  script.js
   WANGAN MIDNIGHT EDITION
   ============================================= */
'use strict';

// ================================================================
// §0  GLOBALS
// ================================================================
const ROAD_W  = 24;      // one-direction highway width (m)
const CAR_W   = 1.90;
const CAR_L   = 4.60;
const CAR_H   = 0.55;

const ENEMY_COLORS = [0xcc2200,0x0044cc,0xcc9900,0x226633,0x884488];

let bestScore = parseInt(localStorage.getItem('nero_best')||'0');
document.getElementById('hud-best').textContent = bestScore;
document.getElementById('go-best').textContent  = bestScore;

// ================================================================
// §1  RENDERER & SCENE
// ================================================================
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x010408);
document.body.insertBefore(renderer.domElement, document.getElementById('loading-screen'));

const scene = new THREE.Scene();
scene.fog   = new THREE.FogExp2(0x010408, 0.011);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 700);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// ================================================================
// §2  LIGHTING — 湾岸ナトリウム灯
// ================================================================
scene.add(new THREE.AmbientLight(0x04080e, 1.4));
scene.add(new THREE.HemisphereLight(0x060c1c, 0x020406, 0.4));

// Sodium lamp group that follows player
const sodiumGroup = new THREE.Group();
scene.add(sodiumGroup);
const SODIUM_Z_OFFSETS = [-40,-20,0,20,40];
SODIUM_Z_OFFSETS.forEach(zo => {
  const pl = new THREE.PointLight(0xffcc55, 3.2, 55);
  pl.position.set(0, 8, zo);
  sodiumGroup.add(pl);
});

// City glow from sides
const cityGlowL = new THREE.PointLight(0x1a4488, 2.2, 90);
const cityGlowR = new THREE.PointLight(0x112244, 1.8, 90);
cityGlowL.position.set(-(ROAD_W+18), 12, 0);
cityGlowR.position.set( (ROAD_W+18), 12, 0);
scene.add(cityGlowL); scene.add(cityGlowR);

// ================================================================
// §3  湾岸 HIGHWAY ENVIRONMENT
// ================================================================
const roadTiles  = [];
const TILE_LEN   = 60;
const TILE_COUNT = 16;

// Shared materials
const roadMat = new THREE.MeshStandardMaterial({
  color:0x0d1014, roughness:0.18, metalness:0.08  // wet dark asphalt
});
const shoulderMat = new THREE.MeshStandardMaterial({ color:0x161820, roughness:0.80 });
const concreteA   = new THREE.MeshLambertMaterial({ color:0xaaaabc });
const concreteB   = new THREE.MeshLambertMaterial({ color:0x888898 });
const concreteC   = new THREE.MeshLambertMaterial({ color:0x666672 });
const concreteDark= new THREE.MeshLambertMaterial({ color:0x444450 });
const metalMat    = new THREE.MeshPhongMaterial({ color:0x8899aa, shininess:55 });
const lampBodyMat = new THREE.MeshLambertMaterial({ color:0x444452 });
const lampGlowMat = new THREE.MeshBasicMaterial({ color:0xffdd88 });
const lineMat     = new THREE.MeshBasicMaterial({ color:0xffffff });
const yellowMat   = new THREE.MeshBasicMaterial({ color:0xffdd00 });
const signGreen   = new THREE.MeshLambertMaterial({ color:0x0f3d1a });
const signWhite   = new THREE.MeshBasicMaterial({ color:0xffffff });
const railMat     = new THREE.MeshPhongMaterial({ color:0xccddee, shininess:90 });

function buildHighway() {
  for (let i = 0; i < TILE_COUNT; i++) {
    const g = new THREE.Group();
    buildTile(g, i);
    g.position.z = i * TILE_LEN - TILE_LEN * (TILE_COUNT/2);
    scene.add(g);
    roadTiles.push(g);
  }
}

function buildTile(g, tileIdx) {
  const TL = TILE_LEN;

  // ── Road surface ──
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, TL), roadMat);
  road.rotation.x = -Math.PI/2; road.receiveShadow = true;
  g.add(road);

  // Hard shoulders
  [-1,1].forEach(s => {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, TL), shoulderMat);
    sh.rotation.x = -Math.PI/2;
    sh.position.set(s*(ROAD_W/2+1.4), 0.003, 0); g.add(sh);
  });

  // ── Lane markings ──
  // Yellow edge lines
  [-1,1].forEach(s => {
    const el = new THREE.Mesh(new THREE.PlaneGeometry(0.16, TL), yellowMat);
    el.rotation.x = -Math.PI/2;
    el.position.set(s*(ROAD_W/2-0.22), 0.007, 0); g.add(el);
  });
  // White dash centre & lanes
  for (let dz = -TL/2+3; dz < TL/2; dz += 10) {
    [0, -ROAD_W/3+0.4, ROAD_W/3-0.4].forEach(lx => {
      const dashLen = lx===0 ? 6 : 5;
      const dashW   = lx===0 ? 0.18 : 0.12;
      const d = new THREE.Mesh(new THREE.PlaneGeometry(dashW, dashLen), lineMat);
      d.rotation.x = -Math.PI/2;
      d.position.set(lx, 0.007, dz + dashLen/2); g.add(d);
    });
  }

  // ── Jersey barriers ──
  [-1,1].forEach(s => {
    const BX = s*(ROAD_W/2+2.3);
    for (let bz = -TL/2; bz < TL/2; bz += 4) {
      const bLen = 3.9;
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.60,0.28,bLen), concreteA);
      b1.position.set(BX,0.14,bz+bLen/2); g.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.40,0.32,bLen), concreteB);
      b2.position.set(BX,0.42+0.14,bz+bLen/2); g.add(b2);
      const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.22,bLen), concreteA);
      b3.position.set(BX,0.88,bz+bLen/2); g.add(b3);
    }
    // Steel guard rail on top
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.14,TL), railMat);
    rail.position.set(BX+s*0.14, 1.18, 0); g.add(rail);
    // Rail posts
    for (let rz = -TL/2+4; rz < TL/2; rz += 4) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.34,0.05), metalMat);
      post.position.set(BX+s*0.14, 1.0, rz); g.add(post);
    }
  });

  // ── Outer retaining walls ──
  [-1,1].forEach(s => {
    const WX = s*(ROAD_W/2+5.0);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.40,6.5,TL), concreteC);
    wall.position.set(WX,3.25,0); g.add(wall);
    // Panel joints
    for (let jy = 0.8; jy < 6.5; jy += 1.6) {
      const jt = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.05,TL),
        new THREE.MeshLambertMaterial({color:0x3a3a45}));
      jt.position.set(WX,jy,0); g.add(jt);
    }
    // Cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.58,0.15,TL), concreteB);
    cap.position.set(WX,6.58,0); g.add(cap);
  });

  // ── Elevated highway pillars (every tile) ──
  [-1,1].forEach(s => {
    for (let pz = -TL/2+10; pz < TL/2; pz += 20) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.0,7.2,0.8), concreteDark);
      col.position.set(s*(ROAD_W/2+7.5), -3.6, pz); g.add(col);
    }
  });

  // ── Overhead gantry (every 3rd tile) ──
  if (tileIdx % 3 === 0) addGantry(g, 0);
  if (tileIdx % 3 === 1) addGantry(g, -22);

  // ── Direction signs ──
  if (tileIdx % 5 === 2) addSign(g, -18);
  if (tileIdx % 5 === 0) addSign(g,  15);

  // ── City backdrop ──
  addCityBackdrop(g, tileIdx);
}

function addGantry(g, zOff) {
  const H = 8.2;
  [-1,1].forEach(s => {
    // Column
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.22,H,0.22), metalMat);
    col.position.set(s*(ROAD_W/2+5.4), H/2, zOff); g.add(col);
    // Base plate
    const bp = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.14,0.6), concreteB);
    bp.position.set(s*(ROAD_W/2+5.4), 0.07, zOff); g.add(bp);
  });
  // Main beam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W+11.2,0.38,0.38), metalMat);
  beam.position.set(0,H,zOff); g.add(beam);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W+11.2,0.14,0.14), metalMat);
  brace.position.set(0,H-0.9,zOff); g.add(brace);

  // Pendant lamp fixtures
  const lampXs = [-ROAD_W/2+1.5, -ROAD_W/6, 0, ROAD_W/6, ROAD_W/2-1.5];
  lampXs.forEach(lx => {
    const wire = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.48,0.025), metalMat);
    wire.position.set(lx, H-0.22, zOff); g.add(wire);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.78,0.22,1.10), lampBodyMat);
    housing.position.set(lx, H-0.58, zOff); g.add(housing);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.84), lampGlowMat);
    face.rotation.x = Math.PI/2;
    face.position.set(lx, H-0.70, zOff); g.add(face);
  });
}

function addSign(g, zOff) {
  const H=8.0, SW=10.0, SH=2.2;
  // Posts
  [-SW/2+0.5, SW/2-0.5].forEach(sx => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16,H,0.16), metalMat);
    post.position.set(sx, H/2, zOff); g.add(post);
  });
  const span = new THREE.Mesh(new THREE.BoxGeometry(SW+1.2,0.22,0.22), metalMat);
  span.position.set(0,H,zOff); g.add(span);
  // Board
  const board = new THREE.Mesh(new THREE.BoxGeometry(SW,SH,0.12), signGreen);
  board.position.set(0, H+SH/2+0.14, zOff); g.add(board);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(SW+0.22,SH+0.22,0.10), signWhite);
  frame.position.set(0, H+SH/2+0.14, zOff-0.02); g.add(frame);
  // Arrow / text dots (decorative)
  const arrowMat = new THREE.MeshBasicMaterial({color:0xffffff});
  for (let rx=-3.5; rx<=3.5; rx+=1.2) {
    const dot = new THREE.Mesh(new THREE.PlaneGeometry(0.22,0.22), arrowMat);
    dot.position.set(rx, H+SH/2+0.14, zOff+0.08); g.add(dot);
  }
}

function addCityBackdrop(g, tileIdx) {
  const r = n => Math.abs(Math.sin(tileIdx*234.5+n*678.9));
  [-1,1].forEach(side => {
    for (let b=0; b<4; b++) {
      const bw = 8+r(b*3)*16;
      const bh = 18+r(b*3+1)*55;
      const bz = -TILE_LEN/2 + b*15 + r(b)*10;
      const bx = side*(ROAD_W/2+15+r(b*3+2)*22);
      const bldMat = new THREE.MeshLambertMaterial({
        color: side>0 ? 0x060c14 : 0x04080c
      });
      const build = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,6+r(b)*10), bldMat);
      build.position.set(bx, bh/2, bz); g.add(build);

      // Windows
      const rows = Math.floor(bh/3.5);
      const cols = Math.floor(bw/2.8);
      for (let wr=0; wr<rows; wr++) {
        for (let wc=0; wc<cols; wc++) {
          if (r(wr*100+wc+b*10000) > 0.52) {
            const lit = r(wr*200+wc) > 0.65;
            const wMat = new THREE.MeshBasicMaterial({
              color: lit ? 0xffcc44 : (side>0 ? 0x223366 : 0x113355)
            });
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9,1.0), wMat);
            win.rotation.y = -side*Math.PI/2;
            win.position.set(
              bx - side*(bw/2+0.01),
              wr*3.5+2.5,
              bz - bw/3+wc*2.8
            );
            g.add(win);
          }
        }
      }
    }
  });

  // One side: distant cranes / industrial structures
  if (tileIdx % 4 === 0) {
    const craneMat = new THREE.MeshLambertMaterial({color:0x0a1018});
    const cx = (ROAD_W/2+40);
    // Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2,50,2), craneMat);
    tower.position.set(cx, 25, 0); g.add(tower);
    // Jib
    const jib = new THREE.Mesh(new THREE.BoxGeometry(30,0.8,0.8), craneMat);
    jib.position.set(cx-8, 50, 0); g.add(jib);
  }
}

// ================================================================
// §4  LAMBORGHINI HURACÁN — FRONT AT +Z
//     (positive Z = forward, matches physics)
// ================================================================
const playerCar     = new THREE.Group();
const playerCarBody = new THREE.Group();
playerCar.add(playerCarBody);
scene.add(playerCar);
const wheelNodes = [];

function buildLamborghini() {
  const paintBlack = new THREE.MeshPhongMaterial({
    color:0x040407, shininess:240, specular:0x4444aa
  });
  const paintGold = new THREE.MeshPhongMaterial({
    color:0xd4a017, shininess:260, specular:0xffe066
  });
  const carbon  = new THREE.MeshPhongMaterial({color:0x0b0b0e, shininess:30, specular:0x222222});
  const glass   = new THREE.MeshPhongMaterial({color:0x14202c, transparent:true, opacity:0.38, shininess:320, specular:0x8899bb});
  const chrome  = new THREE.MeshPhongMaterial({color:0xe0e0ee, shininess:500, specular:0xffffff});
  const headMat = new THREE.MeshBasicMaterial({color:0xffffff});
  const drlMat  = new THREE.MeshBasicMaterial({color:0xddeeff});
  const ambMat  = new THREE.MeshBasicMaterial({color:0xffaa00});
  const tailMat = new THREE.MeshBasicMaterial({color:0xff0d00});
  const tailDim = new THREE.MeshBasicMaterial({color:0x440200});
  const rubber  = new THREE.MeshPhongMaterial({color:0x060606, shininess:5});
  const rimMat  = new THREE.MeshPhongMaterial({color:0xbbbbbb, shininess:320, specular:0xffffff});
  const rimGold = new THREE.MeshPhongMaterial({color:0xd4a017, shininess:250});
  const intMat  = new THREE.MeshLambertMaterial({color:0x070709});
  const blkMat  = new THREE.MeshBasicMaterial({color:0x000000});

  function add(geo, mat, px, py, pz, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    if (rx!==undefined) m.rotation.x = rx;
    if (ry!==undefined) m.rotation.y = ry;
    if (rz!==undefined) m.rotation.z = rz;
    m.castShadow = true; playerCarBody.add(m); return m;
  }

  // ━━ BODY ━━ (front = +Z, rear = -Z)
  add(new THREE.BoxGeometry(CAR_W*0.98, 0.07, CAR_L), carbon, 0, 0.07, 0);
  add(new THREE.BoxGeometry(CAR_W*0.93, CAR_H, CAR_L*0.84), paintBlack, 0, 0.37, 0);

  // Rear haunches  (rear = negative Z)
  [-1,1].forEach(s => {
    add(new THREE.BoxGeometry(0.28,0.62,1.85), paintBlack, s*(CAR_W*0.49+0.12), 0.51, -0.28);
    add(new THREE.BoxGeometry(0.12,0.18,1.72), paintBlack, s*(CAR_W*0.53+0.04), 0.22, -0.28);
    add(new THREE.BoxGeometry(0.04,0.06,1.64), paintGold,  s*(CAR_W*0.50+0.16), 0.82, -0.28);
  });
  // Front fenders (front = +Z)
  [-1,1].forEach(s => {
    add(new THREE.BoxGeometry(0.22,0.50,1.28), paintBlack, s*(CAR_W*0.49+0.08), 0.44, CAR_L*0.26);
    add(new THREE.BoxGeometry(0.04,0.05,1.18), paintGold,  s*(CAR_W*0.50+0.14), 0.78, CAR_L*0.26);
  });

  // Hood (slopes up toward front +Z)
  add(new THREE.BoxGeometry(CAR_W*0.84, 0.09, CAR_L*0.44), paintBlack, 0, 0.68, CAR_L*0.18);
  add(new THREE.BoxGeometry(CAR_W*0.82, 0.22, 0.30), paintBlack, 0, 0.54, CAR_L*0.43, -0.50);
  add(new THREE.BoxGeometry(0.44, 0.07, CAR_L*0.28), carbon, 0, 0.73, CAR_L*0.10);
  for (let vs=0; vs<4; vs++) {
    add(new THREE.BoxGeometry(0.38,0.02,0.07), carbon, 0, 0.77, CAR_L*0.04+vs*0.12);
  }

  // Cabin
  add(new THREE.BoxGeometry(CAR_W*0.74,0.56,1.65), paintBlack, 0, 0.92, -0.02);
  add(new THREE.BoxGeometry(CAR_W*0.64,0.10,1.42), paintBlack, 0, 1.24, -0.04);
  add(new THREE.BoxGeometry(CAR_W*0.58,0.09,0.40), paintBlack, 0, 1.20, -CAR_L*0.22);

  // Glazing
  const ws = new THREE.Mesh(new THREE.BoxGeometry(CAR_W*0.68,0.52,0.08), glass);
  ws.position.set(0, 0.96, CAR_L*0.16); ws.rotation.x = 0.50; playerCarBody.add(ws);
  const rw = new THREE.Mesh(new THREE.BoxGeometry(CAR_W*0.54,0.42,0.08), glass);
  rw.position.set(0, 0.98, -CAR_L*0.13); rw.rotation.x = -0.30; playerCarBody.add(rw);
  [-1,1].forEach(s => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.38,1.28), glass);
    sw.position.set(s*CAR_W*0.40, 0.97, -0.01); playerCarBody.add(sw);
    // Door mirrors
    add(new THREE.BoxGeometry(0.06,0.08,0.26), carbon, s*(CAR_W*0.40+0.09), 1.20, CAR_L*0.12);
    add(new THREE.BoxGeometry(0.20,0.11,0.11), carbon, s*(CAR_W*0.40+0.16), 1.20, CAR_L*0.10);
  });

  // Side skirts + gold stripe
  [-1,1].forEach(s => {
    add(new THREE.BoxGeometry(0.06,0.22,CAR_L*0.76), carbon,   s*CAR_W*0.50, 0.17, -0.02);
    add(new THREE.BoxGeometry(0.04,0.04,CAR_L*0.66), paintGold,s*CAR_W*0.53, 0.30, -0.02);
    // Side air intake
    add(new THREE.BoxGeometry(0.16,0.28,0.42), carbon, s*(CAR_W*0.49+0.06), 0.30, -CAR_L*0.08);
    add(new THREE.BoxGeometry(0.12,0.22,0.36), blkMat, s*(CAR_W*0.49+0.10), 0.30, -CAR_L*0.08);
  });

  // ━━ FRONT (+Z face) ━━
  add(new THREE.BoxGeometry(CAR_W*1.08,0.06,0.30), carbon, 0, 0.09, CAR_L*0.444+0.15);
  add(new THREE.BoxGeometry(CAR_W*0.96,0.03,0.14), carbon, 0, 0.06, CAR_L*0.444+0.22);
  [-1,1].forEach(s => {
    add(new THREE.BoxGeometry(0.06,0.12,0.28), carbon, s*CAR_W*0.52, 0.09, CAR_L*0.444+0.01);
  });
  add(new THREE.BoxGeometry(CAR_W*0.90,0.26,0.09), carbon, 0, 0.24, CAR_L*0.445);
  // Centre intake
  add(new THREE.BoxGeometry(0.64,0.22,0.10), carbon, 0, 0.20, CAR_L*0.445);
  add(new THREE.BoxGeometry(0.58,0.16,0.07), blkMat,  0, 0.20, CAR_L*0.445+0.04);
  for (let ib=0; ib<3; ib++) {
    add(new THREE.BoxGeometry(0.56,0.025,0.04),
      new THREE.MeshLambertMaterial({color:0x1a1a20}), 0, 0.13+ib*0.06, CAR_L*0.445+0.03);
  }
  [-0.56,0.56].forEach(x => {
    add(new THREE.BoxGeometry(0.30,0.18,0.10), carbon, x, 0.20, CAR_L*0.445);
    add(new THREE.BoxGeometry(0.24,0.13,0.07), blkMat, x, 0.20, CAR_L*0.445+0.04);
  });
  // Headlights
  [-1,1].forEach(s => {
    add(new THREE.BoxGeometry(0.44,0.14,0.09), new THREE.MeshPhongMaterial({color:0x1a1a24,shininess:200}), s*0.62, 0.58, CAR_L*0.445);
    add(new THREE.BoxGeometry(0.40,0.04,0.08), drlMat, s*0.62, 0.65, CAR_L*0.445);
    add(new THREE.BoxGeometry(0.28,0.08,0.07), headMat,s*0.60, 0.58, CAR_L*0.445);
    add(new THREE.BoxGeometry(0.14,0.07,0.07), ambMat, s*0.60, 0.49, CAR_L*0.445);
    add(new THREE.BoxGeometry(0.36,0.025,0.07),drlMat, s*0.60, 0.54, CAR_L*0.444);
  });

  // ━━ REAR (-Z face) ━━
  add(new THREE.BoxGeometry(CAR_W*0.86,0.14,0.65), paintBlack, 0, 0.73, -CAR_L*0.36);
  add(new THREE.BoxGeometry(CAR_W*0.56,0.08,0.88), carbon,     0, 0.72, -CAR_L*0.20);
  for (let l=0; l<5; l++) {
    add(new THREE.BoxGeometry(CAR_W*0.50,0.03,0.08), carbon, 0, 0.77, -CAR_L*0.13-l*0.12);
  }
  // Diffuser
  add(new THREE.BoxGeometry(CAR_W*0.88,0.28,0.22), carbon, 0, 0.17, -CAR_L*0.444);
  for (let fi=-0.65; fi<=0.65; fi+=0.18) {
    add(new THREE.BoxGeometry(0.04,0.22,0.20), carbon, fi, 0.17, -CAR_L*0.444);
  }
  // Wing
  add(new THREE.BoxGeometry(CAR_W*1.14,0.07,0.32), carbon,     0, 1.08, -CAR_L*0.42);
  add(new THREE.BoxGeometry(CAR_W*1.10,0.04,0.28), paintBlack, 0, 1.12, -CAR_L*0.42);
  [-1,1].forEach(s => {
    add(new THREE.BoxGeometry(0.07,0.42,0.30), carbon, s*CAR_W*0.58, 0.89, -CAR_L*0.42);
    add(new THREE.BoxGeometry(0.065,0.40,0.07), chrome, s*0.52*CAR_W*0.5, 0.87, -CAR_L*0.42);
  });
  // Tail lights
  [-1,1].forEach(s => {
    add(new THREE.BoxGeometry(0.48,0.09,0.08), tailMat, s*0.62, 0.58, -CAR_L*0.444);
    add(new THREE.BoxGeometry(0.22,0.07,0.08), paintGold,s*0.62, 0.51, -CAR_L*0.444);
    add(new THREE.BoxGeometry(0.44,0.06,0.07), tailDim,  s*0.62, 0.44, -CAR_L*0.444);
  });
  add(new THREE.BoxGeometry(CAR_W*0.88,0.04,0.07), tailMat, 0, 0.59, -CAR_L*0.444);
  // Exhausts
  [-0.40,0.40].forEach(x => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.065,0.055,0.18,12), chrome);
    pipe.rotation.x = Math.PI/2; pipe.position.set(x,0.21,-CAR_L*0.445);
    playerCarBody.add(pipe);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.12,10), blkMat);
    inner.rotation.x = Math.PI/2; inner.position.set(x,0.21,-CAR_L*0.449);
    playerCarBody.add(inner);
  });

  // Interior
  [-1,1].forEach(s => {
    add(new THREE.BoxGeometry(0.34,0.12,0.54), intMat, s*0.24, 0.72, -0.05);
    add(new THREE.BoxGeometry(0.32,0.42,0.10), intMat, s*0.24, 0.92, -0.28);
  });
  add(new THREE.BoxGeometry(CAR_W*0.64,0.20,0.22), intMat, 0, 0.80, CAR_L*0.14);
  add(new THREE.BoxGeometry(0.22,0.12,0.60), intMat, 0, 0.72, -0.05);
  const steer = new THREE.Mesh(new THREE.TorusGeometry(0.10,0.014,6,16),
    new THREE.MeshPhongMaterial({color:0x0e0e12}));
  steer.rotation.x = 1.15; steer.position.set(-0.22,0.84,CAR_L*0.09);
  playerCarBody.add(steer);

  // ━━ WHEELS ━━
  // Front = +Z, Rear = -Z
  const wDefs = [
    {x:-CAR_W*0.52, z: CAR_L*0.33, front:true },
    {x: CAR_W*0.52, z: CAR_L*0.33, front:true },
    {x:-CAR_W*0.52, z:-CAR_L*0.31, front:false},
    {x: CAR_W*0.52, z:-CAR_L*0.31, front:false},
  ];
  wDefs.forEach(wd => {
    const pivot = new THREE.Group();
    pivot.position.set(wd.x, 0.30, wd.z);
    playerCarBody.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);

    const tireW = wd.front ? 0.22 : 0.27;
    const tireR = wd.front ? 0.30 : 0.31;

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(tireR,tireR,tireW,24), rubber);
    tire.rotation.z = Math.PI/2; spin.add(tire);

    // Tyre beads
    [-1,1].forEach(side => {
      const bead = new THREE.Mesh(new THREE.TorusGeometry(tireR-0.025,0.016,5,20),
        new THREE.MeshPhongMaterial({color:0x111111,shininess:4}));
      bead.rotation.y = Math.PI/2; bead.position.x = side*tireW*0.44; spin.add(bead);
    });

    // Rim barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(tireR-0.04,tireR-0.04,tireW-0.01,20),
      new THREE.MeshPhongMaterial({color:0x1a1a1e}));
    barrel.rotation.z = Math.PI/2; spin.add(barrel);
    // Rim face
    const face = new THREE.Mesh(new THREE.CylinderGeometry(tireR*0.72,tireR*0.72,tireW+0.01,12), rimMat);
    face.rotation.z = Math.PI/2; spin.add(face);
    // 10 spokes
    for (let sp=0; sp<10; sp++) {
      const spk = new THREE.Mesh(new THREE.BoxGeometry(0.038,0.18,tireW+0.01), rimMat);
      spk.rotation.z = Math.PI/2; spk.rotation.x = (sp/10)*Math.PI*2; spin.add(spk);
    }
    // Centre
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.066,0.066,tireW+0.02,10), chrome);
    hub.rotation.z = Math.PI/2; spin.add(hub);
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.038,tireW+0.03,6), rimGold);
    badge.rotation.z = Math.PI/2; spin.add(badge);
    // Brake caliper
    const cali = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.16,tireW-0.02), rimGold);
    cali.rotation.z = Math.PI/2; cali.position.y = tireR*0.50; spin.add(cali);
    // Disc
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(tireR*0.60,tireR*0.60,0.04,14),
      new THREE.MeshPhongMaterial({color:0x2a2a2e,shininess:40}));
    disc.rotation.z = Math.PI/2; spin.add(disc);

    wheelNodes.push({pivot, spin, front:wd.front});
  });
}

// ================================================================
// §5  PLAYER FOOT MODEL — faces +Z (forward)
// ================================================================
const playerFoot = new THREE.Group();
playerFoot.visible = false;
scene.add(playerFoot);

function buildPlayer() {
  const skinMat = new THREE.MeshLambertMaterial({color:0xd4926a});
  const suitMat = new THREE.MeshLambertMaterial({color:0x0a0a14});
  const gearMat = new THREE.MeshLambertMaterial({color:0x141418});
  const visMat  = new THREE.MeshBasicMaterial({color:0xd4a017, transparent:true, opacity:0.55});
  const goldMat = new THREE.MeshBasicMaterial({color:0xd4a017});

  function pa(geo, mat, px, py, pz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz); m.castShadow = true;
    playerFoot.add(m); return m;
  }
  // Helmet
  pa(new THREE.SphereGeometry(0.22,10,8), gearMat, 0, 1.78, 0);
  // Visor on +Z face
  pa(new THREE.PlaneGeometry(0.32,0.13), visMat, 0, 1.74, 0.21);
  pa(new THREE.BoxGeometry(0.22,0.08,0.22), gearMat, 0, 1.60, 0.06);
  pa(new THREE.CylinderGeometry(0.07,0.07,0.12,8), skinMat, 0, 1.57, 0);

  // Torso
  pa(new THREE.BoxGeometry(0.44,0.56,0.22), suitMat, 0, 1.22, 0);
  pa(new THREE.BoxGeometry(0.06,0.46,0.24), goldMat, 0, 1.22, 0);
  [-1,1].forEach(s => pa(new THREE.BoxGeometry(0.10,0.08,0.22), suitMat, s*0.25, 1.46, 0));

  // Arms
  [-1,1].forEach(s => {
    pa(new THREE.BoxGeometry(0.14,0.50,0.14), suitMat, s*0.31, 1.18, 0);
    pa(new THREE.SphereGeometry(0.08,6,5), skinMat, s*0.31, 0.92, 0);
    pa(new THREE.BoxGeometry(0.11,0.14,0.10), gearMat, s*0.31, 0.85, 0);
  });
  pa(new THREE.BoxGeometry(0.40,0.09,0.20), gearMat, 0, 0.93, 0);

  // Legs
  [-1,1].forEach(s => {
    pa(new THREE.BoxGeometry(0.17,0.54,0.17), suitMat, s*0.12, 0.68, 0);
    pa(new THREE.BoxGeometry(0.16,0.44,0.16), suitMat, s*0.12, 0.21, 0);
    // Boots point toward +Z (forward)
    pa(new THREE.BoxGeometry(0.17,0.10,0.30), gearMat, s*0.12, 0.05, 0.05);
  });
}

// ================================================================
// §6  ENEMY CARS — front at +Z (same direction as player)
// ================================================================
const enemies    = [];
const MAX_ENEMIES = 8;

function buildEnemyCar(colorHex) {
  const grp     = new THREE.Group();
  const bodyGrp = new THREE.Group();
  grp.add(bodyGrp);

  const paint = new THREE.MeshPhongMaterial({color:colorHex, shininess:110});
  const dark  = new THREE.MeshLambertMaterial({color:0x0e0e0e});
  const glass = new THREE.MeshPhongMaterial({color:0x1a3048, transparent:true, opacity:0.44});
  const wRub  = new THREE.MeshPhongMaterial({color:0x080808, shininess:5});
  const wRim  = new THREE.MeshPhongMaterial({color:0xbbbbbb, shininess:180});
  const hlMat = new THREE.MeshBasicMaterial({color:0xddeeff});
  const tlMat = new THREE.MeshBasicMaterial({color:0xff0d00});

  function b(w,h,d,mat,px,py,pz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
    m.position.set(px,py,pz); m.castShadow=true; bodyGrp.add(m);
  }
  b(1.72,0.43,3.85, paint, 0, 0.36, 0);
  b(1.56,0.54,1.72, paint, 0, 0.86, 0.1);
  b(1.38,0.09,1.52, paint, 0, 1.14, 0.1);
  b(0.06,0.19,3.65, dark, -0.90, 0.26, 0);
  b(0.06,0.19,3.65, dark,  0.90, 0.26, 0);

  // Windshield at front (+Z)
  const wsF = new THREE.Mesh(new THREE.BoxGeometry(1.30,0.44,0.07), glass);
  wsF.position.set(0, 0.88, 0.90); wsF.rotation.x = 0.25; bodyGrp.add(wsF);

  // Headlights: front = +Z
  [-0.60,0.60].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.09,0.06), hlMat);
    hl.position.set(x, 0.55, 1.93); bodyGrp.add(hl);
    // Taillights: rear = -Z (visible to player approaching from behind)
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.08,0.06), tlMat);
    tl.position.set(x, 0.54, -1.93); bodyGrp.add(tl);
  });
  // Tail light bar
  const tlBar = new THREE.Mesh(new THREE.BoxGeometry(1.52,0.04,0.06), tlMat);
  tlBar.position.set(0, 0.59, -1.93); bodyGrp.add(tlBar);

  // Wheels
  grp._wheels = [];
  [[-0.94, 1.28],[0.94, 1.28],[-0.94,-1.28],[0.94,-1.28]].forEach(([wx,wz]) => {
    const spin = new THREE.Group();
    spin.position.set(wx, 0.28, wz);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.21,16), wRub);
    t.rotation.z = Math.PI/2; spin.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.19,0.22,8), wRim);
    r.rotation.z = Math.PI/2; spin.add(r);
    bodyGrp.add(spin); grp._wheels.push(spin);
  });
  return grp;
}

function spawnEnemy() {
  if (enemies.length >= MAX_ENEMIES) return;
  const lane   = (Math.floor(Math.random()*3)-1)*(ROAD_W/3.5);
  const colorH = ENEMY_COLORS[Math.floor(Math.random()*ENEMY_COLORS.length)];
  const grp    = buildEnemyCar(colorH);
  // Spawn AHEAD of player (+Z = forward)
  grp.position.set(lane, 0, phys.position.z + 100 + Math.random()*200);
  grp._speed  = 18 + Math.random()*28; // 65-165 km/h traffic
  grp._lane   = lane;
  grp._lane_t = Math.random()*100;
  scene.add(grp);
  enemies.push(grp);
}

function updateEnemies(dt) {
  for (let i = enemies.length-1; i >= 0; i--) {
    const e = enemies[i];
    e._lane_t += dt;
    // Slight weave
    const targetX = e._lane + Math.sin(e._lane_t*0.35)*2.6;
    e.position.x += (targetX - e.position.x)*0.022;
    // Move forward (+Z)
    e.position.z += e._speed * dt;
    if (e._wheels) e._wheels.forEach(w => { w.rotation.x += (e._speed/0.28)*dt; });

    // Recycle when player has passed them (enemy is too far behind)
    if (e.position.z < phys.position.z - 80) {
      scene.remove(e); enemies.splice(i,1);
    }
  }
  if (gameState.playing && enemies.length < MAX_ENEMIES && Math.random() < 0.025) spawnEnemy();
}

// ================================================================
// §7  PHYSICS CONSTANTS
// ================================================================
const phys = {
  position: new THREE.Vector3(0,0,0),
  yaw:0, speed:0, steer:0,
  spinAngle:0, suspY:0, suspVY:0,
};

const C = {
  ACCEL:     18,       // base accel m/s²
  BRAKE:     50,       // braking
  FRICTION:  2.5,
  HANDBRAKE: 62,
  MAX_FWD:   88.89,    // 320 km/h in m/s
  MAX_REV:   14,       // ~50 km/h reverse
  WHEELBASE: 2.72,
  MAX_STEER: 0.46,
  STEER_IN:  2.6,
  STEER_OUT: 4.0,
  SPEED_UNDER: 0.024,  // steering reduction at speed
  WHEEL_R:   0.30,
  SPRING:    55,
  DAMP:      9,
  CAM_LAG:   5,
  CAM_DIST:  9,
  CAM_H:     4.0,
  WALK_SPEED: 4,
  WALK_STEER: 2.2,
};

// ================================================================
// §8  TRANSMISSION SYSTEM (AT / MT)
// ================================================================
// Gear max speeds in km/h
const GEAR_MAX_KMH = [0, 68, 118, 175, 238, 285, 320];
// Gear optimal min (below = lugging)
const GEAR_OPT_MIN = [0,  0,  38,  88, 140, 188, 238];

let transMode = 'AT'; // 'AT' or 'MT'
const trans = {
  gear: 1,
  rpm: 800,
  redlineRPM: 8500,
  idleRPM: 800,
};

function selectMode(mode) {
  transMode = mode;
  document.getElementById('btn-mode-at').classList.toggle('active', mode==='AT');
  document.getElementById('btn-mode-mt').classList.toggle('active', mode==='MT');
}

function calcRPM(gear, speedKMH) {
  const g = Math.max(1, Math.min(6, gear));
  const maxK = GEAR_MAX_KMH[g];
  const rpm = (speedKMH / maxK) * trans.redlineRPM;
  return Math.max(trans.idleRPM, Math.min(trans.redlineRPM, rpm));
}

function autoGear(speedKMH) {
  for (let g=1; g<=6; g++) {
    if (speedKMH < GEAR_MAX_KMH[g]) return g;
  }
  return 6;
}

function atTorqueFactor(speedKMH) {
  if (speedKMH <  70) return 1.25;
  if (speedKMH < 140) return 1.05;
  if (speedKMH < 220) return 0.80;
  if (speedKMH < 285) return 0.52;
  return 0.30;
}

function mtTorqueFactor(gear, speedKMH) {
  if (gear < 1 || gear > 6) return 0.4;
  const maxK = GEAR_MAX_KMH[gear];
  const minK = GEAR_OPT_MIN[gear];
  if (speedKMH >= maxK * 1.01) return 0;          // rev limiter
  if (speedKMH < minK * 0.35)  return 0.30;       // heavy lug
  if (speedKMH < minK)         return 0.30 + 0.70*(speedKMH/minK);
  const t = (speedKMH - minK) / (maxK - minK);
  return 1.15 - 0.25*t;
}

function shiftUp() {
  if (trans.gear < 6) { trans.gear++; updateGearButtons(); }
}
function shiftDown() {
  if (trans.gear > 1) { trans.gear--; updateGearButtons(); }
}

function updateGearButtons() {
  document.querySelectorAll('.gb').forEach(btn => {
    const g = parseInt(btn.dataset.g);
    btn.classList.toggle('active', g === trans.gear);
  });
}

// ================================================================
// §9  GAME STATE
// ================================================================
const gameState = {
  playing:false, inCar:true,
  score:0, health:100, elapsed:0,
};

// ================================================================
// §10  INPUT
// ================================================================
const K = {};
window.addEventListener('keydown', e => {
  K[e.code] = true;
  // MT gear keys (only in game)
  if (gameState.playing && transMode === 'MT') {
    if (e.code === 'KeyX') shiftUp();
    if (e.code === 'KeyZ') shiftDown();
    // Direct gear select: Digit1-Digit6
    const m = e.code.match(/^Digit([1-6])$/);
    if (m) { trans.gear = parseInt(m[1]); updateGearButtons(); }
  }
  e.preventDefault();
});
window.addEventListener('keyup', e => { K[e.code] = false; });

// Gear buttons pointer
document.querySelectorAll('.gb').forEach(btn => {
  btn.style.pointerEvents = 'auto';
  btn.addEventListener('click', () => {
    if (gameState.playing && transMode === 'MT') {
      trans.gear = parseInt(btn.dataset.g);
      updateGearButtons();
    }
  });
});

// Mobile touch controls
const touchData = {fwd:false, rev:false, left:false, right:false, hb:false};

function buildTouchControls() {
  const ui = document.createElement('div');
  ui.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;height:200px;z-index:500;' +
    'pointer-events:none;display:flex;justify-content:space-between;' +
    'align-items:flex-end;padding:12px 16px;';
  ui.innerHTML = `
    <div style="pointer-events:auto;display:grid;
      grid-template-columns:58px 58px 58px;
      grid-template-rows:58px 58px;gap:5px;">
      <div></div>
      <button id="t-fwd"   style="${touchBtnStyle()}">▲</button><div></div>
      <button id="t-left"  style="${touchBtnStyle()}">◄</button>
      <button id="t-rev"   style="${touchBtnStyle()}">▼</button>
      <button id="t-right" style="${touchBtnStyle()}">►</button>
    </div>
    <button id="t-hb" style="pointer-events:auto;background:rgba(212,160,23,.2);
      border:1px solid rgba(212,160,23,.4);color:#d4a017;font-family:monospace;
      font-size:11px;padding:14px 22px;border-radius:8px;letter-spacing:2px;
      touch-action:none;">HB</button>`;
  document.body.appendChild(ui);

  function bind(id,key) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { touchData[key]=true;  e.preventDefault(); }, {passive:false});
    el.addEventListener('touchend',   e => { touchData[key]=false; e.preventDefault(); }, {passive:false});
  }
  bind('t-fwd','fwd'); bind('t-rev','rev');
  bind('t-left','left'); bind('t-right','right'); bind('t-hb','hb');
}

function touchBtnStyle() {
  return 'background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.17);' +
    'color:#fff;font-size:20px;border-radius:8px;touch-action:none;cursor:pointer;';
}

function getInput() {
  return {
    fwd:   K.ArrowUp    || K.KeyW || touchData.fwd,
    rev:   K.ArrowDown  || K.KeyS || touchData.rev,
    left:  K.ArrowLeft  || K.KeyA || touchData.left,
    right: K.ArrowRight || K.KeyD || touchData.right,
    hb:    K.Space               || touchData.hb,
    e:     K.KeyE,
  };
}

// ================================================================
// §11  ROAD TILE RECYCLING
// ================================================================
function updateRoad() {
  const pz = phys.position.z;
  const totalLen = TILE_COUNT * TILE_LEN;
  roadTiles.forEach(tile => {
    if (tile.position.z < pz - TILE_LEN*2)             tile.position.z += totalLen;
    if (tile.position.z > pz + TILE_LEN*(TILE_COUNT-2)) tile.position.z -= totalLen;
  });
  sodiumGroup.position.z = pz;
  cityGlowL.position.z   = pz;
  cityGlowR.position.z   = pz;
}

// ================================================================
// §12  PHYSICS UPDATE
//      W = forward (+Z), S = brake/reverse
// ================================================================
function stepCarPhysics(dt, inp) {
  // Steering
  const tgtSteer = inp.left ? -C.MAX_STEER : inp.right ? C.MAX_STEER : 0;
  const sRate    = (inp.left||inp.right) ? C.STEER_IN : C.STEER_OUT;
  phys.steer    += (tgtSteer - phys.steer) * Math.min(sRate*dt, 1);

  const kmh = Math.abs(phys.speed) * 3.6;

  // Torque factor
  const tf = transMode === 'AT'
    ? atTorqueFactor(kmh)
    : mtTorqueFactor(trans.gear, kmh);

  // Acceleration
  let accel = 0;
  if (inp.fwd) {
    // W = accelerate forward
    accel = phys.speed >= 0 ? C.ACCEL*tf : C.BRAKE;
  } else if (inp.rev) {
    // S = brake / slow reverse
    accel = phys.speed > 0.5 ? -C.BRAKE : -C.ACCEL*0.50;
  }

  if (inp.hb) {
    const hb = C.HANDBRAKE*dt;
    phys.speed = phys.speed>0 ? Math.max(0,phys.speed-hb) : Math.min(0,phys.speed+hb);
  }

  phys.speed += accel*dt;

  // Rolling friction
  if (!inp.fwd && !inp.rev && !inp.hb) {
    const f = C.FRICTION*dt;
    phys.speed = Math.abs(phys.speed)<f ? 0 : phys.speed - Math.sign(phys.speed)*f;
  }

  // MT rev limiter per-gear
  if (transMode === 'MT' && phys.speed > 0) {
    const maxMS = GEAR_MAX_KMH[trans.gear] / 3.6;
    if (phys.speed > maxMS) phys.speed = maxMS;
  }

  phys.speed = THREE.MathUtils.clamp(phys.speed, -C.MAX_REV, C.MAX_FWD);

  // AT auto-shift
  if (transMode === 'AT') {
    trans.gear = autoGear(Math.abs(phys.speed)*3.6);
  }

  // Bicycle model steering
  const effSteer = phys.steer / (1 + Math.abs(phys.speed)*C.SPEED_UNDER);
  const yawRate  = (phys.speed / C.WHEELBASE) * Math.tan(effSteer);
  phys.yaw      += yawRate*dt;

  // Position update — W = forward = +Z direction
  phys.position.x += Math.sin(phys.yaw) * phys.speed * dt;
  phys.position.z += Math.cos(phys.yaw) * phys.speed * dt;

  // Road boundary
  const maxX = ROAD_W/2 - 1.2;
  if (Math.abs(phys.position.x) > maxX) {
    phys.position.x = Math.sign(phys.position.x)*maxX;
    phys.speed *= 0.5;
  }

  // Suspension
  const springF = (0 - phys.suspY)*C.SPRING;
  const dampF   = phys.suspVY*C.DAMP;
  phys.suspVY  += (springF - dampF)*dt;
  phys.suspY   += phys.suspVY*dt;

  phys.spinAngle += (phys.speed / C.WHEEL_R) * dt;

  // RPM
  trans.rpm = calcRPM(trans.gear, Math.abs(phys.speed)*3.6);
}

const walkState = {x:0, z:0, yaw:0};
function stepWalkPhysics(dt, inp) {
  if (inp.left)  walkState.yaw += C.WALK_STEER*dt;
  if (inp.right) walkState.yaw -= C.WALK_STEER*dt;
  if (inp.fwd) {
    walkState.x += Math.sin(walkState.yaw)*C.WALK_SPEED*dt;
    walkState.z += Math.cos(walkState.yaw)*C.WALK_SPEED*dt;
  }
  if (inp.rev) {
    walkState.x -= Math.sin(walkState.yaw)*C.WALK_SPEED*0.6*dt;
    walkState.z -= Math.cos(walkState.yaw)*C.WALK_SPEED*0.6*dt;
  }
  walkState.x = THREE.MathUtils.clamp(walkState.x, -(ROAD_W/2+8), ROAD_W/2+8);
}

// ================================================================
// §13  COLLISION DETECTION
// ================================================================
const _box1 = new THREE.Box3(), _box2 = new THREE.Box3();
const playerBoxSize = new THREE.Vector3(CAR_W, CAR_H, CAR_L);

function checkCollisions() {
  _box1.setFromCenterAndSize(
    new THREE.Vector3(phys.position.x, phys.suspY+CAR_H/2, phys.position.z),
    playerBoxSize
  );
  for (let i=enemies.length-1; i>=0; i--) {
    const e = enemies[i];
    _box2.setFromCenterAndSize(
      new THREE.Vector3(e.position.x, CAR_H/2, e.position.z),
      new THREE.Vector3(1.85,0.92,4.0)
    );
    if (_box1.intersectsBox(_box2)) {
      const relSpd = Math.abs(phys.speed - e._speed);
      applyDamage(relSpd * 1.6);
      phys.speed *= -0.25;
      showDamageFlash();
      e.position.z -= 3.5;
    }
  }
}

function applyDamage(dmg) {
  gameState.health = Math.max(0, gameState.health - dmg);
  const fill = document.getElementById('hud-dmg-fill');
  fill.style.width = gameState.health+'%';
  fill.style.background = gameState.health>60 ? '#2ecc71'
    : gameState.health>30 ? '#f39c12' : '#e74c3c';
  if (gameState.health <= 0) triggerGameOver();
}

function showDamageFlash() {
  const el = document.getElementById('damage-flash');
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 120);
}

// ================================================================
// §14  VISUAL SYNC
// ================================================================
function syncCarMesh() {
  playerCar.position.set(phys.position.x, phys.suspY, phys.position.z);
  playerCar.rotation.y = phys.yaw;

  const pitch = THREE.MathUtils.clamp(phys.suspVY*0.02, -0.07, 0.07);
  playerCarBody.rotation.x = THREE.MathUtils.lerp(playerCarBody.rotation.x, pitch, 0.1);

  wheelNodes.forEach(w => {
    if (w.front) w.pivot.rotation.y = phys.steer;
    w.spin.rotation.x = phys.spinAngle;
  });
}

// ================================================================
// §15  CAMERA
// ================================================================
const camPos  = new THREE.Vector3(0, 6, 12);
const camLook = new THREE.Vector3();
const camWalk = new THREE.Vector3();

function stepCamera(dt) {
  const lag = Math.min(C.CAM_LAG*dt, 1);

  if (gameState.inCar) {
    const spd  = Math.abs(phys.speed);
    const dist = C.CAM_DIST + spd*0.12;
    const hgt  = C.CAM_H   + spd*0.04;
    // Camera behind car (-Z from car = behind since car faces +Z)
    const tPos = new THREE.Vector3(
      phys.position.x - Math.sin(phys.yaw)*dist,
      phys.suspY + hgt,
      phys.position.z - Math.cos(phys.yaw)*dist
    );
    camPos.lerp(tPos, lag);
    const ahead = 3 + spd*0.08;
    const tLook = new THREE.Vector3(
      phys.position.x + Math.sin(phys.yaw)*ahead,
      phys.suspY + 1.0,
      phys.position.z + Math.cos(phys.yaw)*ahead
    );
    camLook.lerp(tLook, lag*1.5);
  } else {
    const tPos = new THREE.Vector3(
      walkState.x - Math.sin(walkState.yaw)*4,
      3.5,
      walkState.z - Math.cos(walkState.yaw)*4
    );
    camWalk.lerp(tPos, lag);
    camPos.copy(camWalk);
    camLook.set(walkState.x, 1.5, walkState.z);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

// ================================================================
// §16  HUD UPDATE
// ================================================================
let _lastScoreTick = 0;
let _shiftHintTimer = 0;
const speedoCtx  = document.getElementById('speedo-canvas').getContext('2d');
const minimapCtx = document.getElementById('minimap-canvas').getContext('2d');

function updateHUD(dt) {
  if (!gameState.playing) return;
  const kmh = Math.abs(phys.speed)*3.6;

  // Score
  if (gameState.inCar) {
    gameState.elapsed  += dt;
    _lastScoreTick     += dt;
    if (_lastScoreTick > 0.1) {
      gameState.score += Math.floor(kmh*0.04+0.5);
      _lastScoreTick = 0;
    }
  }

  document.getElementById('hud-score').textContent = gameState.score;
  const min = Math.floor(gameState.elapsed/60);
  const sec = Math.floor(gameState.elapsed%60).toString().padStart(2,'0');
  document.getElementById('hud-time').textContent = `${min}:${sec}`;

  drawSpeedo(kmh);

  // Gear display
  const gearEl = document.getElementById('speedo-gear');
  const displayGear = transMode==='AT' ? autoGear(kmh) : trans.gear;
  if (phys.speed < -0.5)    { gearEl.textContent='R'; gearEl.style.color='#ff7700'; }
  else if (kmh < 1)          { gearEl.textContent='N'; gearEl.style.color='#cccc00'; }
  else                       { gearEl.textContent=displayGear; gearEl.style.color='#d4a017'; }

  // MT Shift up hint
  if (transMode==='MT' && trans.gear < 6) {
    const maxMS = GEAR_MAX_KMH[trans.gear]/3.6;
    const needShift = phys.speed > maxMS*0.94;
    const shiftEl = document.getElementById('shift-hint');
    if (needShift) {
      shiftEl.classList.remove('hidden');
      _shiftHintTimer = 0.5;
    } else {
      _shiftHintTimer -= dt;
      if (_shiftHintTimer <= 0) shiftEl.classList.add('hidden');
    }
  }

  // Drive status
  const st  = document.getElementById('hud-status');
  const inp = getInput();
  if (inp.hb && Math.abs(phys.speed)>1)  st.textContent='HANDBRAKE';
  else if (phys.speed < -0.5)             st.textContent='REVERSE';
  else if (Math.abs(phys.speed) < 0.5)    st.textContent='STOPPED';
  else                                    st.textContent='DRIVE';

  // Enter/exit hints
  if (!gameState.inCar) {
    const dist = Math.hypot(walkState.x-phys.position.x, walkState.z-phys.position.z);
    document.getElementById('enter-hint').classList.toggle('hidden', dist>6);
    document.getElementById('exit-hint').classList.add('hidden');
  } else {
    document.getElementById('exit-hint').classList.remove('hidden');
    document.getElementById('enter-hint').classList.add('hidden');
  }

  drawMinimap();
}

function drawSpeedo(kmh) {
  const w=160, h=160, cx=80, cy=80, r=68;
  speedoCtx.clearRect(0,0,w,h);

  // RPM arc (inner, thinner)
  const rpmRatio = (trans.rpm - trans.idleRPM) / (trans.redlineRPM - trans.idleRPM);
  const rpmSA = Math.PI*0.75;
  const rpmEA = rpmSA + Math.PI*1.5*rpmRatio;
  const rpmCol = trans.rpm > 7500 ? '#ff3322' : trans.rpm > 6000 ? '#ff9922' : '#888';
  speedoCtx.beginPath();
  speedoCtx.arc(cx, cy, r-14, rpmSA, rpmSA+Math.PI*1.5);
  speedoCtx.strokeStyle = 'rgba(255,255,255,.04)';
  speedoCtx.lineWidth = 5; speedoCtx.stroke();
  if (rpmRatio > 0) {
    speedoCtx.beginPath();
    speedoCtx.arc(cx, cy, r-14, rpmSA, rpmEA);
    speedoCtx.strokeStyle = rpmCol;
    speedoCtx.lineWidth = 5; speedoCtx.lineCap='round'; speedoCtx.stroke();
  }

  // Speed arc (outer)
  const startA = Math.PI*0.75;
  const endA   = startA + Math.PI*1.5 * Math.min(kmh/320, 1);
  const col    = kmh > 240 ? '#e74c3c' : kmh > 160 ? '#f39c12' : '#00c4ff';
  speedoCtx.beginPath();
  speedoCtx.arc(cx, cy, r, 0, Math.PI*2);
  speedoCtx.strokeStyle = 'rgba(255,255,255,.05)';
  speedoCtx.lineWidth = 8; speedoCtx.stroke();
  if (kmh > 0.5) {
    speedoCtx.beginPath();
    speedoCtx.arc(cx, cy, r, startA, endA);
    speedoCtx.strokeStyle = col;
    speedoCtx.lineWidth = 7; speedoCtx.lineCap='round'; speedoCtx.stroke();
  }

  // Tick marks  (0-320, every 40 km/h)
  for (let v=0; v<=320; v+=40) {
    const a = startA + Math.PI*1.5*(v/320);
    const iR = v%80===0 ? r-16 : r-11;
    speedoCtx.beginPath();
    speedoCtx.moveTo(cx+iR*Math.cos(a), cy+iR*Math.sin(a));
    speedoCtx.lineTo(cx+r*Math.cos(a),  cy+r*Math.sin(a));
    speedoCtx.strokeStyle = v%80===0 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.15)';
    speedoCtx.lineWidth = v%80===0 ? 1.8 : 1.2; speedoCtx.stroke();
  }

  // Needle
  const na = startA + Math.PI*1.5*Math.min(kmh/320, 1);
  speedoCtx.beginPath();
  speedoCtx.moveTo(cx, cy);
  speedoCtx.lineTo(cx+(r-18)*Math.cos(na), cy+(r-18)*Math.sin(na));
  speedoCtx.strokeStyle = '#fff'; speedoCtx.lineWidth=1.6; speedoCtx.stroke();

  document.getElementById('speedo-num').textContent = Math.round(kmh);
}

function drawMinimap() {
  const W=120, H=120;
  minimapCtx.clearRect(0,0,W,H);
  minimapCtx.fillStyle='rgba(2,4,14,.92)'; minimapCtx.fillRect(0,0,W,H);
  const rp = (ROAD_W/180)*W*3;
  minimapCtx.fillStyle='rgba(24,30,50,1)';
  minimapCtx.fillRect(W/2-rp/2, 0, rp, H);

  const scale=0.8, cx=W/2, cz=H/2;
  minimapCtx.fillStyle='#d4a017';
  minimapCtx.beginPath(); minimapCtx.arc(cx,cz,4,0,Math.PI*2); minimapCtx.fill();
  minimapCtx.save(); minimapCtx.translate(cx,cz); minimapCtx.rotate(-phys.yaw);
  minimapCtx.fillStyle='#00c4ff'; minimapCtx.fillRect(-1,-9,2,7);
  minimapCtx.restore();

  enemies.forEach(e => {
    const dx=(e.position.x-phys.position.x)*scale;
    const dz=(e.position.z-phys.position.z)*scale;
    const ex=cx+dx, ey=cz+dz;
    if (ex>0&&ex<W&&ey>0&&ey<H) {
      minimapCtx.fillStyle='#e74c3c';
      minimapCtx.fillRect(ex-2,ey-3,4,6);
    }
  });
}

// ================================================================
// §17  ENTER / EXIT CAR
// ================================================================
function enterCar() {
  gameState.inCar = true;
  playerCar.visible = true; playerFoot.visible = false;
  phys.position.x = walkState.x; phys.position.z = walkState.z;
}
function exitCar() {
  gameState.inCar = false; phys.speed = 0;
  walkState.x   = phys.position.x - Math.sin(phys.yaw)*2.5;
  walkState.z   = phys.position.z - Math.cos(phys.yaw)*2.5;
  walkState.yaw = phys.yaw;
  playerFoot.visible = true; playerCar.visible = true;
}

// ================================================================
// §18  GAME FLOW
// ================================================================
function startGame() {
  gameState.playing = true; gameState.inCar = true;
  gameState.score = 0; gameState.health = 100; gameState.elapsed = 0;

  phys.position.set(0,0,0);
  phys.yaw=0; phys.speed=0; phys.steer=0;
  walkState.x=0; walkState.z=0; walkState.yaw=0;

  trans.gear = 1; trans.rpm = trans.idleRPM;
  if (transMode==='MT') updateGearButtons();

  document.getElementById('hud-dmg-fill').style.width = '100%';
  document.getElementById('hud-dmg-fill').style.background = '#2ecc71';
  playerCar.visible=true; playerFoot.visible=false;

  // Show/hide MT gear panel
  const gearPanel = document.getElementById('gear-panel');
  const ctrlMT    = document.getElementById('ctrl-mt-rows');
  if (transMode === 'MT') {
    gearPanel.classList.remove('hidden');
    ctrlMT.classList.remove('hidden');
    updateGearButtons();
  } else {
    gearPanel.classList.add('hidden');
    ctrlMT.classList.add('hidden');
  }
  document.getElementById('mode-badge').textContent = transMode;

  enemies.forEach(e => scene.remove(e)); enemies.length=0;
  for (let i=0; i<5; i++) spawnEnemy();

  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
}

function triggerGameOver() {
  gameState.playing = false;
  if (gameState.score > bestScore) {
    bestScore = gameState.score;
    localStorage.setItem('nero_best', bestScore);
  }
  document.getElementById('go-score').textContent = gameState.score;
  document.getElementById('go-best').textContent  = bestScore;
  document.getElementById('hud-best').textContent = bestScore;
  document.getElementById('gameover-screen').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
}

// ================================================================
// §19  MAIN LOOP
// ================================================================
let lastT=0, prevE=false;

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min((ts-lastT)/1000, 0.05);
  lastT = ts;
  if (dt<=0) return;

  if (gameState.playing) {
    const inp = getInput();

    // Enter / exit car
    const eNow = inp.e;
    if (eNow && !prevE) {
      if (gameState.inCar) exitCar();
      else {
        const d = Math.hypot(walkState.x-phys.position.x, walkState.z-phys.position.z);
        if (d < 6) enterCar();
      }
    }
    prevE = eNow;

    if (gameState.inCar) {
      stepCarPhysics(dt, inp);
      syncCarMesh();
      checkCollisions();
    } else {
      stepWalkPhysics(dt, inp);
      playerFoot.position.set(walkState.x, 0, walkState.z);
      // Foot faces forward direction (+Z = front of body)
      playerFoot.rotation.y = walkState.yaw;
    }

    updateEnemies(dt);
    updateRoad();
    updateHUD(dt);
    stepCamera(dt);
  }

  renderer.render(scene, camera);
}

// ================================================================
// §20  INIT
// ================================================================
function init() {
  const bar = document.getElementById('loading-bar');
  const pct = document.getElementById('loading-pct');

  const steps = [
    ['湾岸ハイウェイを建設中...',   buildHighway],
    ['ランボルギーニを構築中...',    buildLamborghini],
    ['ドライバーを配置中...',       buildPlayer],
    ['トラフィックを配置中...',     () => { for(let i=0;i<5;i++) spawnEnemy(); }],
    ['タッチコントロール構築中...',  buildTouchControls],
  ];

  let i=0;
  function doStep() {
    if (i >= steps.length) {
      bar.style.width='100%'; pct.textContent='100%';
      setTimeout(() => {
        const ls = document.getElementById('loading-screen');
        ls.style.opacity='0';
        setTimeout(() => {
          ls.remove();
          document.getElementById('title-screen').classList.remove('hidden');
        }, 600);
      }, 200);
      return;
    }
    const p = Math.round((i/steps.length)*100);
    bar.style.width=p+'%'; pct.textContent=p+'%';
    steps[i][1](); i++;
    setTimeout(doStep, 90);
  }
  doStep();

  camPos.set(0, C.CAM_H+3, C.CAM_DIST+3);
  camera.position.copy(camPos);
  camera.lookAt(0,0,0);

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-retry').addEventListener('click', startGame);

  requestAnimationFrame(ts => { lastT=ts; loop(ts); });
}

init();
