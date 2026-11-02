import './style.css';
import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createBook, COVER_W, COVER_D, DIM } from './book.js';
import { createAtmosphere } from './effects.js';
import { CHAPTERS } from './chapters.js';
import { bindUI } from './interactions.js';
import { QUESTIONS, NO_REPLIES, NO_UNLOCKS } from './questions.js';

// Progress is kept only in memory, so every visit starts from Question 1.
const unlocked = new Set();
const save = () => {};

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const small = coarse || innerWidth < 760;
const Q = small
  ? { dpr: 1.5, shadow: 1024, tex: 512, page: 1024, desk: 80 }
  : { dpr: 2, shadow: 2048, tex: 1024, page: 1280, desk: 128 };

let renderer, scene, camera, canvas, book, atm;
let view = 'far';
let half = 1;
let idle = false, opening = false, panning = false;
let drag = null;
let par = 0;
const rig = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 };
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

const ui = bindUI({ onOpen: () => openBook(), onStep: (dir) => step(dir) });

boot();

async function boot() {
  try {
    await Promise.race([
      Promise.all(['700 48px "Cormorant Garamond"', '700 48px Caveat', '28px "Special Elite"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
  } catch {}
  try {
    init();
  } catch (err) {
    console.error(err);
    ui.showError('This browser could not build the 3D book.');
  }
}

const GATE_SHIFT = 0;
const DEBUG_GATE = false;

function gate(dir) {
  if (dir <= 0) return 0;
  const q = book.gateAt(book.spread + GATE_SHIFT);
  if (DEBUG_GATE) console.log('[gate] spread', book.spread, 'chapter', book.chapterAt(book.spread), 'gateAt', q, 'unlocked', [...unlocked]);
  return q && !unlocked.has(q) ? q : 0;
}

function askQuestion(q) {
  let tries = 0;
  ui.ask(q, QUESTIONS[q - 1], (choice) => {
    if (choice === 'yes' || NO_UNLOCKS) {
      unlocked.add(q); save(); atm.pulse();
      setTimeout(() => step(1), 350);
      return { ok: true };
    }
    return { ok: false, msg: NO_REPLIES[tries++ % NO_REPLIES.length] };
  });
}

const isSingle = () => camera.aspect < 0.72;

function init() {
  canvas = document.getElementById('stage');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 80);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  atm = createAtmosphere(scene, Q, reduced);
  book = createBook(Q);
  scene.add(book.root);

  Object.assign(rig, poseFor('far'));
  book.root.rotation.y = -0.7;
  atm.fadeIn(reduced ? 0.2 : 3);
  ui.hideLoader();
  view = 'closed';
  const d = reduced ? 0.01 : 3.4;
  gsap.to(rig, { ...poseFor('closed'), duration: d, ease: 'power3.out' });
  gsap.to(book.root.rotation, {
    y: 0, duration: d, ease: 'power3.out',
    onComplete: () => { idle = true; ui.showOpen(); canvas.style.cursor = 'pointer'; },
  });

  addEventListener('resize', onResize);
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  let last = performance.now(), time = 0;
  renderer.setAnimationLoop((now) => {
    const t = now ?? performance.now();
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t; time += dt;

    if (idle && !opening && !reduced && view === 'closed') {
      book.root.position.y = Math.sin(time * 0.9) * 0.02;
      book.root.rotation.y = Math.sin(time * 0.35) * 0.035;
    }
    const want = view === 'closed' && !reduced && !coarse ? 1 : 0;
    par += (want - par) * Math.min(1, dt * 2);
    const k = Math.min(1, dt * 3);
    pointer.sx += (pointer.x - pointer.sx) * k;
    pointer.sy += (pointer.y - pointer.sy) * k;
    camera.position.set(rig.px + pointer.sx * 0.4 * par, rig.py - pointer.sy * 0.15 * par, rig.pz);
    camera.lookAt(rig.tx, rig.ty, rig.tz);

    renderer.render(scene, camera);
  });
}

function poseFor(name) {
  const aspect = camera.aspect;
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const fit = (w, h) => Math.max(w / (2 * tanH * aspect), h / (2 * tanH)) * 1.06;
  let el = 50, w = COVER_W + 0.8, h = 4.0, tx = 0, mul = 1;
  const ty = 0.2;
  if (name === 'open') {
    el = 72;
    if (isSingle()) { w = DIM.W + 0.5; h = COVER_D + 0.4; tx = half ? DIM.W / 2 : -DIM.W / 2; }
    else { w = COVER_W * 2 + 0.1; h = COVER_D + 0.1; }
  }
  if (name === 'far') mul = 1.45;
  const d = fit(w, h) * mul;
  const r = THREE.MathUtils.degToRad(el);
  return { px: tx, py: ty + Math.sin(r) * d, pz: Math.cos(r) * d, tx, ty, tz: 0 };
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  gsap.killTweensOf(rig);
  panning = false;
  Object.assign(rig, poseFor(view));
}

async function openBook() {
  if (!book || opening || view !== 'closed') return;
  opening = true;
  ui.hideOpen();
  canvas.style.cursor = 'default';
  view = 'open';
  half = 1;
  gsap.to(rig, { ...poseFor('open'), duration: reduced ? 0.01 : 2.8, ease: 'power2.inOut', overwrite: true });
  gsap.to(book.root.rotation, { y: 0, duration: 0.6 });
  gsap.to(book.root.position, { y: 0, duration: 0.6 });
  atm.pulse();
  await book.open(reduced ? 8 : 1);
  canvas.style.cursor = 'grab';
  ui.announce('The book is open. Title page.');
  ui.showHint();
}

function panTo(h) {
  half = h;
  panning = true;
  const p = poseFor('open');
  return new Promise((res) =>
    gsap.to(rig, {
      px: p.px, tx: p.tx, duration: reduced ? 0.01 : 0.8, ease: 'power2.inOut', overwrite: 'auto',
      onComplete: () => { panning = false; res(); },
    })
  );
}

async function afterTurn(dir) {
  ui.hideHint();
  const n = book.chapterAt(book.spread);
  atm.mood(n);
  ui.announce(n ? `Chapter ${n}: ${CHAPTERS[n - 1].title}` : 'Title page');
  if (isSingle()) await panTo(dir > 0 ? 0 : 1);
}

async function step(dir) {
  if (ui.asking || view !== 'open' || !book || !book.isOpen || book.busy || panning || drag) return;
  if (isSingle()) {
    if (dir > 0 && half === 0) return panTo(1);
    if (dir < 0 && half === 1) return book.spread > 0 ? panTo(0) : undefined;
  }
  const g = gate(dir);
  if (g) return askQuestion(g);
  const h = book.grab(dir);
  if (!h) return;
  const done = await h.release(true, reduced ? 4 : 1);
  if (done) await afterTurn(dir);
}

function onDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (view === 'closed') { if (idle) openBook(); return; }
  if (view !== 'open' || !book.isOpen || book.busy || panning) return;
  canvas.setPointerCapture(e.pointerId);
  const now = performance.now();
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: now, lx: e.clientX, lt: now, v: 0, mode: null, dir: 0, h: null, t: 0 };
}

function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0, now = performance.now();
  drag.v = drag.v * 0.6 + ((e.clientX - drag.lx) / Math.max(now - drag.lt, 1)) * 0.4;
  drag.lx = e.clientX; drag.lt = now;

  if (!drag.mode) {
    if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { drag.mode = 'none'; return; }
    if (Math.abs(dx) < 10) return;
    drag.dir = dx < 0 ? 1 : -1;
    if (isSingle() && ((drag.dir > 0 && half === 0) || (drag.dir < 0 && half === 1))) {
      drag.mode = drag.dir < 0 && book.spread === 0 ? 'none' : 'pan';
    } else if (gate(drag.dir)) {
      drag.mode = 'none';
      askQuestion(gate(drag.dir));
    } else {
      drag.h = book.grab(drag.dir);
      drag.mode = drag.h ? 'turn' : 'none';
    }
  }
  if (drag.mode === 'turn') {
    const span = isSingle() ? innerWidth * 0.8 : innerWidth * 0.4;
    drag.t = Math.min(1, Math.max(0, (drag.dir > 0 ? -dx : dx) / span));
    drag.h.set(drag.t);
  }
}

async function onUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  canvas.style.cursor = 'grab';
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if (d.mode === 'turn') {
    const pv = d.dir > 0 ? -d.v : d.v;
    const complete = pv > 0.35 || (d.t > 0.4 && pv > -0.35);
    const done = await d.h.release(complete, reduced ? 4 : 1);
    if (done) await afterTurn(d.dir);
  } else if (d.mode === 'pan') {
    if (Math.abs(dx) > 40) panTo(d.dir > 0 ? 1 : 0);
  } else if (!d.mode && Math.hypot(dx, dy) < 10 && performance.now() - d.t0 < 500) {
    step(e.clientX > innerWidth / 2 ? 1 : -1);
  }
}