import * as THREE from 'three';
import gsap from 'gsap';
import { pageTexture, buildPlan } from './pages.js';
import { PALETTE as P } from './chapters.js';

export const DIM = { W: 2.4, D: 3.2, OV: 0.08, CT: 0.07 };
const { W, D, OV, CT } = DIM;
export const COVER_W = W + OV;
export const COVER_D = D + OV * 2;
const STACK = 0.55;
const SEG = 28;
const CURL = 1.2;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => t * t * (3 - 2 * t);

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function texture(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function grain(g, w, h, cell, alpha, op = 'source-over') {
  const sw = Math.ceil(w / cell), sh = Math.ceil(h / cell);
  const [c, cg] = canvas(sw, sh);
  const img = cg.createImageData(sw, sh);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  cg.putImageData(img, 0, 0);
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = op;
  g.imageSmoothingEnabled = true;
  g.drawImage(c, 0, 0, w, h);
  g.restore();
}

function coverCanvas(mode, w, ornate) {
  const h = Math.round((w * COVER_D) / COVER_W);
  const [c, g] = canvas(w, h);
  g.fillStyle = mode === 'color' ? P.cloth : '#808080';
  g.fillRect(0, 0, w, h);
  grain(g, w, h, 3, 0.35, 'overlay');
  g.fillStyle = mode === 'color' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.18)';
  for (let i = 0; i < w; i += 4) g.fillRect(i, 0, 1.5, h);
  for (let i = 0; i < h; i += 4) g.fillRect(0, i, w, 1.5);
  if (!ornate) return c;

  const color = mode === 'color';
  const m = w * 0.06;
  g.strokeStyle = color ? P.stitch : '#ffffff';
  g.lineWidth = w * 0.006;
  g.setLineDash([w * 0.025, w * 0.016]);
  g.strokeRect(m, m, w - 2 * m, h - 2 * m);
  g.setLineDash([]);

  g.save();
  g.translate(w / 2, h * 0.45);
  g.rotate(-0.02);
  g.fillStyle = color ? P.label : '#b0b0b0';
  g.fillRect(-w * 0.34, -h * 0.17, w * 0.68, h * 0.34);
  if (color) {
    g.globalAlpha = 0.85; g.fillStyle = P.tapes[0];
    g.fillRect(-w * 0.1, -h * 0.19, w * 0.2, h * 0.04);
    g.globalAlpha = 1;
    g.fillStyle = P.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${w * 0.14}px "Caveat", cursive`;
    g.fillText('Beyond', 0, -h * 0.07); g.fillText('Pages', 0, h * 0.03);
    g.font = `${w * 0.04}px "Special Elite", monospace`;
    g.fillStyle = P.typeInk; g.fillText('ten chapters, one subject', 0, h * 0.125);
    g.save(); g.translate(w * 0.2, h * 0.14); g.rotate(0.14);
    g.strokeStyle = g.fillStyle = P.red; g.lineWidth = w * 0.004;
    g.font = `${w * 0.034}px "Special Elite", monospace`;
    g.strokeRect(-w * 0.085, -h * 0.014, w * 0.17, h * 0.028); g.fillText('PRIVATE', 0, 0);
    g.restore();
  }
  g.restore();
  return c;
}

function edgeTexture() {
  const [c, g] = canvas(8, 128);
  for (let y = 0; y < 128; y++) {
    const v = 214 + Math.random() * 30 - (y % 4 === 0 ? 28 : 0);
    g.fillStyle = `rgb(${v},${v - 8},${v - 24})`;
    g.fillRect(0, y, 8, 1);
  }
  return texture(c);
}

function endpaperTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(46,60,114,0.2)'; g.lineWidth = 1.5;
  for (let i = -256; i <= 512; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
    g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
  }
  return texture(c);
}

function makeSheet(frontMat, backMat, N, ST) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((SEG + 1) * 6);
  const uv = new Float32Array((SEG + 1) * 4);
  const idx = [];
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    uv.set([t, 1, t, 0], i * 4);
    if (i < SEG) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mesh = new THREE.Group();
  for (const m of [frontMat, backMat]) {
    const part = new THREE.Mesh(geo, m);
    part.frustumCulled = false;
    part.castShadow = part.receiveShadow = true;
    mesh.add(part);
  }
  return { mesh, geo, pos: geo.attributes.position, N, ST };
}

function bend(s, k, p) {
  const { N, ST } = s;
  const base = p * Math.PI;
  const lag = CURL * Math.sin(base) * (1 - 1.4 * p);
  const yR = CT + (N - k) * ST, yL = CT + (k + 1) * ST;
  const yB = lerp(yR, yL, smooth(clamp01((p - 0.2) / 0.6)));
  const dl = W / SEG;
  const a = s.pos.array;
  for (let j = 0; j < 2; j++) {
    const kk = lag * (j === 0 ? 0.7 : 1.3);
    let x = 0, y = 0;
    for (let i = 0; i <= SEG; i++) {
      if (i > 0) {
        const phi = base - kk * Math.pow((i - 0.5) / SEG, 1.4);
        x += Math.cos(phi) * dl; y += Math.sin(phi) * dl;
      }
      const o = i * 6 + j * 3;
      a[o] = x; a[o + 1] = yB + y; a[o + 2] = j ? D / 2 : -D / 2;
    }
  }
  s.pos.needsUpdate = true;
  s.geo.computeVertexNormals();
}

function halfCylinder(r, len, mat) {
  const g = new THREE.CylinderGeometry(r, r, len, 28, 1, true, Math.PI, Math.PI);
  g.rotateX(Math.PI / 2);
  g.translate(0, r, 0);
  return new THREE.Mesh(g, mat);
}

export function createBook(q) {
  const plan = buildPlan();
  const N = plan.N;
  const ST = STACK / N;
  const H = CT * 2 + STACK;
  const SPINE_R = H / 2;
  const closedX = -(COVER_W - SPINE_R * 0.45) / 2;
  const closedY = CT + STACK + CT / 2 + 0.002;

  const root = new THREE.Group();
  root.position.x = closedX;

  const coverMat = new THREE.MeshStandardMaterial({
    map: texture(coverCanvas('color', q.tex, true)),
    bumpMap: texture(coverCanvas('bump', q.tex, true), false), bumpScale: 4,
    metalness: 0, roughness: 0.9,
  });
  const plainBump = texture(coverCanvas('bump', 512, false), false);
  plainBump.wrapS = plainBump.wrapT = THREE.RepeatWrapping;
  const cloth = new THREE.MeshStandardMaterial({ color: P.cloth, roughness: 0.9, bumpMap: plainBump, bumpScale: 3 });
  const band = new THREE.MeshStandardMaterial({ color: P.stitch, roughness: 0.8 });
  const endpaper = new THREE.MeshStandardMaterial({ map: endpaperTexture(), roughness: 0.85 });

  const boardGeo = new THREE.BoxGeometry(COVER_W, CT, COVER_D);
  const back = new THREE.Mesh(boardGeo, [cloth, cloth, endpaper, cloth, cloth, cloth]);
  back.position.set(COVER_W / 2, CT / 2, 0);

  const cover = new THREE.Group();
  const front = new THREE.Mesh(boardGeo, [cloth, cloth, coverMat, endpaper, cloth, cloth]);
  front.position.x = COVER_W / 2;
  cover.add(front);

  const spine = new THREE.Group();
  spine.scale.x = 0.45;
  spine.add(halfCylinder(SPINE_R, COVER_D, cloth));
  for (const z of [-1.25, -0.95, 0.95, 1.25]) {
    const b = halfCylinder(SPINE_R + 0.008, 0.045, band);
    b.position.z = z;
    spine.add(b);
  }

  const edgeTex = edgeTexture();
  edgeTex.wrapS = edgeTex.wrapT = THREE.RepeatWrapping;
  const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95 });
  const plain = new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 0.95 });
  const blockMats = [edgeMat, plain, plain, plain, edgeMat, edgeMat];
  const bw = W - 0.012, bd = D - 0.012;
  const rBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0), blockMats);
  const lBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(-0.5, 0.5, 0), blockMats);
  rBlock.position.set(0, CT, 0);
  lBlock.position.set(0, CT, 0);

  const PAPER = 0xf3ead6;
  const sheets = [], mats = [], loaded = new Array(N).fill(false);
  for (let k = 0; k < N; k++) {
    const fm = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.92 });
    const bm = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.92, side: THREE.BackSide });
    const s = makeSheet(fm, bm, N, ST);
    bend(s, k, 0);
    sheets.push(s); mats.push({ fm, bm });
    root.add(s.mesh);
  }
  const setMap = (m, tex) => {
    if (m.map) m.map.dispose();
    m.map = tex; m.color.set(tex ? 0xffffff : PAPER); m.needsUpdate = true;
  };

  let turned = 0;
  let busy = false;

  function ensure() {
    for (let k = 0; k < N; k++) {
      const near = k >= turned - 3 && k <= turned + 3;
      if (near && !loaded[k]) {
        setMap(mats[k].fm, pageTexture(plan.pages[2 * k], q.page));
        const bt = pageTexture(plan.pages[2 * k + 1], q.page);
        bt.wrapS = THREE.RepeatWrapping; bt.repeat.x = -1; bt.offset.x = 1;
        setMap(mats[k].bm, bt);
        loaded[k] = true;
      } else if (!near && loaded[k]) {
        setMap(mats[k].fm, null); setMap(mats[k].bm, null);
        loaded[k] = false;
      }
    }
  }

  root.add(back, cover, spine, rBlock, lBlock);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const prog = { cover: 0 };

  function layout() {
    const hR = (N - turned) * ST - 0.002;
    const hL = turned * ST - 0.002;
    rBlock.visible = hR > 0.01;
    lBlock.visible = hL > 0.01;
    rBlock.scale.set(bw, Math.max(hR, 0.001), bd);
    lBlock.scale.set(bw, Math.max(hL, 0.001), bd);
  }
  function setCover(p) {
    const e = smooth(p);
    cover.rotation.z = p * Math.PI;
    cover.position.y = lerp(closedY, CT / 2, e);
    spine.scale.y = lerp(1, 0.1, e);
    root.position.x = lerp(closedX, 0, e);
  }
  layout();
  setCover(0);
  ensure();

  function open(speed = 1) {
    busy = true;
    return gsap.to(prog, {
      cover: 1, duration: 2.6 / speed, ease: 'power2.inOut',
      onUpdate: () => setCover(prog.cover), onComplete: () => { busy = false; },
    });
  }

  function grab(dir) {
    if (busy || prog.cover < 0.99) return null;
    const k = dir > 0 ? turned : turned - 1;
    if (k < 0 || k > N - 2) return null;
    busy = true;
    turned += dir;
    layout();
    const from = dir > 0 ? 0 : 1, to = 1 - from;
    const o = { p: from };
    const apply = () => bend(sheets[k], k, o.p);
    return {
      set(t) { o.p = lerp(from, to, clamp01(t)); apply(); },
      release(complete, speed = 1) {
        return new Promise((resolve) => {
          const target = complete ? to : from;
          const dist = Math.abs(target - o.p);
          gsap.to(o, {
            p: target, duration: Math.max(0.25, 1.2 * dist) / speed, ease: 'power2.out', onUpdate: apply,
            onComplete: () => {
              if (!complete) { turned -= dir; layout(); }
              busy = false;
              setTimeout(ensure, 60);
              resolve(complete);
            },
          });
        });
      },
    };
  }

  return {
    root, open, grab,
    chapterAt: (s) => plan.spreadCh[s] || 0,
    gateAt: (s) => { const p = plan.pages[2 * s + 1]; return p && p.kind === 'heading' && p.ch >= 2 ? p.ch - 1 : 0; },
    get spread() { return turned; },
    get isOpen() { return prog.cover > 0.99; },
    get busy() { return busy; },
  };
}