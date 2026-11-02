import * as THREE from 'three';
import gsap from 'gsap';
import { CHAPTERS } from './chapters.js';

const HAND = '"Caveat", "Segoe Script", cursive';
const PW = 20, PH = 14; // desk size in world units
let K = 1;              // texture-size factor

// ---------- little things painted onto the desk (world units) ----------
function text(g, s, x, y, size, color, align = 'center') {
  g.save(); g.translate(x, y); g.scale(0.01, 0.01);
  g.font = `700 ${Math.round(size * 100)}px ${HAND}`; g.fillStyle = color; g.textAlign = align;
  g.fillText(s, 0, 0); g.restore();
}

function pencil(g, x, y, rot, len, color) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const w = 0.13, a = -len / 2, b = len / 2;
  g.shadowColor = 'rgba(30,15,5,0.4)'; g.shadowBlur = 10 * K; g.shadowOffsetX = 4 * K; g.shadowOffsetY = 7 * K;
  g.fillStyle = color; g.fillRect(a, -w / 2, len, w);
  g.shadowColor = 'transparent';
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(a, -w / 2, len, w * 0.28);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(a, w * 0.2, len, w * 0.3);
  g.fillStyle = '#b9bcc2'; g.fillRect(a - 0.16, -w / 2, 0.16, w);
  g.fillStyle = '#e58a8a'; g.fillRect(a - 0.32, -w / 2, 0.16, w);
  g.fillStyle = '#e8c9a0'; g.beginPath(); g.moveTo(b, -w / 2); g.lineTo(b + 0.3, 0); g.lineTo(b, w / 2); g.fill();
  g.fillStyle = '#33302c'; g.beginPath(); g.moveTo(b + 0.2, -0.03); g.lineTo(b + 0.3, 0); g.lineTo(b + 0.2, 0.03); g.fill();
  g.restore();
}

function stadium(g, cx, cy, w, h) {
  g.beginPath();
  g.moveTo(cx - w / 2, cy - h / 2 + w / 2); g.arc(cx, cy - h / 2 + w / 2, w / 2, Math.PI, 0);
  g.lineTo(cx + w / 2, cy + h / 2 - w / 2); g.arc(cx, cy + h / 2 - w / 2, w / 2, 0, Math.PI);
  g.closePath(); g.stroke();
}

function clip(g, x, y, rot, s) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.lineCap = 'round'; g.lineWidth = 0.05;
  g.shadowColor = 'rgba(30,15,5,0.35)'; g.shadowBlur = 5 * K; g.shadowOffsetX = 2 * K; g.shadowOffsetY = 4 * K;
  g.strokeStyle = '#9aa0a8'; stadium(g, 0, 0, 0.34, 0.9);
  g.shadowColor = 'transparent'; stadium(g, 0.02, 0.1, 0.2, 0.6);
  g.restore();
}

function sticky(g, x, y, rot, s, color, lines, fs, ink) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.shadowColor = 'rgba(30,15,5,0.4)'; g.shadowBlur = 12 * K; g.shadowOffsetX = 3 * K; g.shadowOffsetY = 7 * K;
  g.fillStyle = color; g.fillRect(-s / 2, -s / 2, s, s);
  g.shadowColor = 'transparent';
  const gr = g.createLinearGradient(0, -s / 2, 0, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0.1)');
  g.fillStyle = gr; g.fillRect(-s / 2, -s / 2, s, s);
  const y0 = -((lines.length - 1) * fs * 1.05) / 2 + fs * 0.3;
  lines.forEach((t, i) => text(g, t, 0, y0 + i * fs * 1.05, fs, ink));
  g.restore();
}

function washi(g, x, y, rot, len, color) {
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = 0.85; g.fillStyle = color;
  const h = 0.28, e = 0.04;
  g.beginPath();
  g.moveTo(-len / 2, -h / 2); g.lineTo(len / 2, -h / 2);
  g.lineTo(len / 2 - e, -h / 4); g.lineTo(len / 2, 0); g.lineTo(len / 2 - e, h / 4); g.lineTo(len / 2, h / 2);
  g.lineTo(-len / 2, h / 2);
  g.lineTo(-len / 2 + e, h / 4); g.lineTo(-len / 2, 0); g.lineTo(-len / 2 + e, -h / 4);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = -len / 2 + 0.12; i < len / 2 - 0.08; i += 0.14) { g.beginPath(); g.arc(i, 0, 0.022, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

function ring(g, x, y, r) { // coffee-cup stain
  g.save(); g.lineCap = 'round';
  g.strokeStyle = 'rgba(70,35,10,0.22)'; g.lineWidth = 0.05;
  g.beginPath(); g.arc(x, y, r, 0.2, 5.9); g.stroke();
  g.strokeStyle = 'rgba(70,35,10,0.3)'; g.lineWidth = 0.018;
  g.beginPath(); g.arc(x + 0.01, y, r * 0.96, 0.3, 5.4); g.stroke();
  g.restore();
}

function deskTexture(ppu) {
  K = ppu / 128;
  const c = document.createElement('canvas');
  c.width = PW * ppu; c.height = PH * ppu;
  const g = c.getContext('2d');

  // wooden planks with grain and seams
  const planks = 6, ph = c.height / planks;
  for (let i = 0; i < planks; i++) {
    const y0 = i * ph;
    g.fillStyle = `hsl(${29 + Math.random() * 6},${42 + Math.random() * 8}%,${50 + Math.random() * 8}%)`;
    g.fillRect(0, y0, c.width, ph);
    for (let n = 0; n < 160; n++) {
      const x = Math.random() * c.width, y = y0 + Math.random() * ph, len = (200 + Math.random() * 900) * K;
      g.strokeStyle = Math.random() < 0.55 ? `rgba(80,48,20,${0.03 + Math.random() * 0.07})` : `rgba(255,232,190,${0.03 + Math.random() * 0.06})`;
      g.lineWidth = (0.6 + Math.random() * 2.2) * K;
      g.beginPath(); g.moveTo(x, y);
      g.bezierCurveTo(x + len * 0.3, y + (Math.random() - 0.5) * 8 * K, x + len * 0.7, y + (Math.random() - 0.5) * 8 * K, x + len, y + (Math.random() - 0.5) * 5 * K);
      g.stroke();
    }
    g.fillStyle = 'rgba(40,22,8,0.5)'; g.fillRect(0, y0, c.width, 3 * K);
    g.fillStyle = 'rgba(255,235,200,0.14)'; g.fillRect(0, y0 + 3 * K, c.width, 2 * K);
    g.fillStyle = 'rgba(40,22,8,0.35)'; g.fillRect(Math.random() * c.width, y0, 3 * K, ph);
  }
  const lg = g.createRadialGradient(c.width * 0.4, c.height * 0.35, 0, c.width * 0.4, c.height * 0.35, c.width * 0.6);
  lg.addColorStop(0, 'rgba(255,240,205,0.26)'); lg.addColorStop(1, 'rgba(255,240,205,0)');
  g.fillStyle = lg; g.fillRect(0, 0, c.width, c.height);
  const vg = g.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.35, c.width / 2, c.height / 2, c.width * 0.62);
  vg.addColorStop(0, 'rgba(30,15,5,0)'); vg.addColorStop(1, 'rgba(30,15,5,0.5)');
  g.fillStyle = vg; g.fillRect(0, 0, c.width, c.height);

  // things lying on the desk, drawn in world units (x right, z towards the viewer)
  g.setTransform(ppu, 0, 0, ppu, c.width / 2, c.height / 2);
  ring(g, -3.3, 1.9, 0.55); ring(g, 2.9, -2.2, 0.45);
  pencil(g, 3.3, 1.5, -0.45, 2.6, '#e9b23c');
  pencil(g, -2.1, -2.6, 0.7, 2.3, '#3f6fb5');
  sticky(g, -3.0, -1.0, -0.12, 1.3, '#f7d56b', ['thank you', 'for everything', 'akka ❤️'], 0.19, '#27346b');
  sticky(g, 3.1, -1.5, 0.1, 1.1, '#f4a6b0', ['You are my', 'Bangram ❤️'], 0.24, '#27346b');
  sticky(g, -3.7, 0.95, 0.06, 1.55, '#b9dfc8', ['If life gives me', 'a thousand reasons', 'to be grateful,', 'knowing you will', 'always be one', 'of them'], 0.15, '#27346b');
  washi(g, 3.1, -2.03, 0.1, 0.9, '#e98a6b');
  washi(g, -3.7, 0.12, 0.06, 0.8, '#8fb9a0');
  washi(g, 2.6, 2.6, 0.4, 1.4, '#e9b44c');
  clip(g, -2.55, -1.62, 0.3, 1.0);
  clip(g, -2.3, 2.3, 0.5, 1.2);
  clip(g, 2.5, -2.5, -0.8, 1.0);
  return c;
}

// ---------- desk + lights ----------
export function createAtmosphere(scene, q, reduced) {
  scene.background = new THREE.Color('#4a3520');

  const tex = new THREE.CanvasTexture(deskTexture(q.desk));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
  );
  table.position.y = -0.001;
  table.receiveShadow = true;
  scene.add(table);

  const hemi = new THREE.HemisphereLight(0xfff3e0, 0xa07a50, 0);
  const key = new THREE.DirectionalLight(0xfff0d6, 0);
  key.position.set(-3.5, 8, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(q.shadow, q.shadow);
  const sc = key.shadow.camera;
  sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 22;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(hemi, key, key.target);

  const BASE = { key: 2.3, hemi: 0.6, env: 0.5 };
  const S = { master: 0, bloom: 0 };
  const apply = () => {
    key.intensity = (BASE.key + S.bloom * 1.2) * S.master;
    hemi.intensity = BASE.hemi * S.master;
    scene.environmentIntensity = BASE.env * S.master;
  };
  apply();

  return {
    fadeIn: (d) => gsap.to(S, { master: 1, duration: d, ease: 'power2.inOut', onUpdate: apply }),
    pulse: () =>
      gsap.timeline({ onUpdate: apply })
        .to(S, { bloom: 1, duration: 0.6, ease: 'power2.out' })
        .to(S, { bloom: 0, duration: 1.8, ease: 'power2.inOut' }),
    mood(n) { // a very gentle change in light colour per chapter (n = chapter number, 0 = title)
      const c = CHAPTERS[n - 1];
      const col = new THREE.Color(c ? c.light : '#fff0d6');
      gsap.to(key.color, { r: col.r, g: col.g, b: col.b, duration: reduced ? 0.01 : 1.6 });
    },
  };
}