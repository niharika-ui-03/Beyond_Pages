import * as THREE from 'three';
import { CHAPTERS, PALETTE as P } from './chapters.js';
import { TEXTS } from './content.js';

const HAND = '"Caveat", "Segoe Script", cursive';
const TYPE = '"Special Elite", "Courier New", monospace';
const SERIF = '"Cormorant Garamond", Georgia, serif';
const W = 1000, H = 1333; // design units; scaled to any texture size
const TOP = 150, BOT = H - 120, TW = 830, XR = 100, XL = 70; // text area (right page / left page start x)

const STY = {
  p: { font: `500 48px ${HAND}`, lh: 60, base: 44, gap: 34 },
  b: { font: `700 50px ${HAND}`, lh: 62, base: 45, gap: 34 },
  q: { font: `700 54px ${HAND}`, lh: 66, base: 48, gap: 14 },
  h: { font: `700 64px ${HAND}`, lh: 72, base: 56, gap: 16 },
};

function wrapLines(g, text, maxW) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (g.measureText(t).width > maxW && line) { out.push(line); line = word; }
    else line = t;
  }
  out.push(line);
  return out;
}
function wrap(g, text, x, y, maxW, lh) {
  for (const l of wrapLines(g, text, maxW)) { g.fillText(l, x, y); y += lh; }
  return y;
}

// ---------- turn the written text into blocks, then into pages ----------
function parse(src) {
  return src.trim().split(/\n\s*\n/).map((raw) => {
    const b = raw.trim();
    if (b === '---') return { t: 'hr' };
    if (b.startsWith('## ')) return { t: 'h', s: b.slice(3) };
    if (b.startsWith('@ ')) return { t: 'tag', s: b.slice(2) };
    if (b.startsWith('! ')) return { t: 'stamp', s: b.slice(2) };
    if (b.startsWith('> ')) return { t: 'q', s: b.slice(2) };
    if (b.startsWith('**') && b.endsWith('**')) return { t: 'b', s: b.slice(2, -2) };
    return { t: 'p', s: b.replace(/\*\*/g, '').replace(/\n/g, ' ') };
  });
}

function flow(g, blocks) {
  const out = [];
  let cur = [], y = TOP;
  const next = () => { if (cur.length) out.push(cur); cur = []; y = TOP; };
  for (const b of blocks) {
    const s = STY[b.t];
    if (s) {
      g.font = s.font;
      const ind = b.t === 'q' ? 30 : 0;
      const lines = wrapLines(g, b.s, TW - ind);
      if (b.t === 'h') {
        if (y > TOP) y += 22;
        if (y + s.lh * lines.length + 120 > BOT) next(); // keep a heading together with some text
      }
      for (const ln of lines) {
        if (y + s.lh > BOT) next();
        cur.push({ t: b.t, s: ln, y: y + s.base, x: ind });
        y += s.lh;
      }
      y += s.gap;
    } else if (b.t === 'tag') {
      if (y + 150 > BOT) next();
      if (y > TOP) y += 16;
      cur.push({ t: 'tag', s: b.s, y: y + 30 }); y += 70;
    } else if (b.t === 'stamp') {
      if (y + 190 > BOT) next();
      cur.push({ t: 'stamp', s: b.s, y: y + 95 }); y += 190;
    } else if (b.t === 'hr') {
      if (y > TOP && y + 100 <= BOT) { cur.push({ t: 'hr', y: y + 40 }); y += 90; }
    }
  }
  next();
  return out;
}

// Reading order: pages[0] is the title (right). Odd index = left page, even = right page.
// Sheet k: front = pages[2k], back = pages[2k+1]. Every chapter heading lands on a left page.
export function buildPlan() {
  const g = document.createElement('canvas').getContext('2d');
  const pages = [{ kind: 'title', ch: 0 }];
  CHAPTERS.forEach((c) => {
    if (pages.length % 2 === 0) pages.push({ kind: 'blank', ch: c.n - 1 });
    pages.push({ kind: 'heading', ch: c.n });
    flow(g, parse(TEXTS[c.n])).forEach((items, i) => pages.push({ kind: 'text', ch: c.n, items, first: i === 0 }));
  });
  if (pages.length % 2 === 0) pages.push({ kind: 'blank', ch: 10 });
  pages.forEach((p, i) => { p.i = i; });
  const N = (pages.length + 1) / 2;
  const spreadCh = [];
  for (let s = 0; s < N; s++) spreadCh[s] = pages[2 * s]?.ch || pages[2 * s - 1]?.ch || 0;
  return { pages, N, spreadCh };
}

// ---------- drawing ----------
function paper(g, side, tint) {
  g.fillStyle = tint; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { // paper fibres
    g.fillStyle = Math.random() < 0.5 ? `rgba(120,90,50,${Math.random() * 0.06})` : `rgba(255,255,255,${Math.random() * 0.12})`;
    g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  const right = side === 'right'; // shading next to the spine
  const gr = g.createLinearGradient(right ? 0 : W, 0, right ? 170 : W - 170, 0);
  gr.addColorStop(0, 'rgba(80,50,20,0.34)'); gr.addColorStop(1, 'rgba(80,50,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const ev = g.createRadialGradient(W / 2, H / 2, W * 0.4, W / 2, H / 2, H * 0.75);
  ev.addColorStop(0, 'rgba(120,90,50,0)'); ev.addColorStop(1, 'rgba(120,90,50,0.16)');
  g.fillStyle = ev; g.fillRect(0, 0, W, H);
}

function tape(g, x, y, rot, color) {
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = 0.82; g.fillStyle = color;
  g.fillRect(-90, -28, 180, 56); g.restore();
}

function stamp(g, text, x, y, rot, color, size = 60) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.font = `${size}px ${TYPE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + 50;
  g.strokeStyle = g.fillStyle = color; g.globalAlpha = 0.85; g.lineWidth = 7;
  g.strokeRect(-w / 2, -size * 0.75, w, size * 1.5); g.fillText(text, 0, 0);
  g.restore();
}

function foot(g, n) {
  g.fillStyle = '#8a7a5c'; g.font = `500 34px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(`\u2014 ${n} \u2014`, W / 2, H - 40);
}

function sketch(g, color, draw) { // hand-drawn look: drawn twice with a slight offset
  g.save(); g.strokeStyle = g.fillStyle = color; g.lineCap = g.lineJoin = 'round';
  g.lineWidth = 7; g.globalAlpha = 0.9; draw();
  g.translate(2.5, -2); g.lineWidth = 4; g.globalAlpha = 0.45; draw();
  g.restore();
}
const circle = (g, x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); fill ? g.fill() : g.stroke(); };

const DOODLES = {
  magnifier(g, x, y) {
    circle(g, x - 25, y - 25, 90);
    g.beginPath(); g.arc(x - 25, y - 25, 62, 3.6, 4.6); g.stroke();
    g.beginPath(); g.moveTo(x + 40, y + 40); g.lineTo(x + 125, y + 125); g.stroke();
  },
  scales(g, x, y) {
    g.beginPath();
    g.moveTo(x, y - 110); g.lineTo(x, y + 105);
    g.moveTo(x - 60, y + 105); g.lineTo(x + 60, y + 105);
    g.moveTo(x - 125, y - 80); g.lineTo(x + 125, y - 70);
    g.stroke();
    for (const [px, py] of [[x - 125, y - 80], [x + 125, y - 70]]) {
      g.beginPath(); g.moveTo(px, py); g.lineTo(px - 45, py + 85); g.moveTo(px, py); g.lineTo(px + 45, py + 85); g.stroke();
      g.beginPath(); g.arc(px, py + 85, 45, 0, Math.PI); g.stroke();
    }
  },
  eye(g, x, y) {
    g.beginPath(); g.moveTo(x - 125, y); g.quadraticCurveTo(x, y - 105, x + 125, y); g.quadraticCurveTo(x, y + 105, x - 125, y); g.stroke();
    circle(g, x, y, 38); circle(g, x, y, 13, true);
  },
  warning(g, x, y) {
    g.beginPath(); g.moveTo(x, y - 115); g.lineTo(x + 110, y + 80); g.lineTo(x - 110, y + 80); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x, y + 25); g.stroke();
    circle(g, x, y + 55, 7, true);
  },
  arrows(g, x, y) {
    for (const [d, yy] of [[1, -45], [-1, 45]]) {
      g.beginPath();
      g.moveTo(x - 115 * d, y + yy); g.lineTo(x + 115 * d, y + yy);
      g.moveTo(x + 115 * d, y + yy); g.lineTo(x + 85 * d, y + yy - 26);
      g.moveTo(x + 115 * d, y + yy); g.lineTo(x + 85 * d, y + yy + 26);
      g.stroke();
    }
  },
  face(g, x, y) { // a perfectly straight mouth
    circle(g, x, y, 105); circle(g, x - 36, y - 22, 8, true); circle(g, x + 36, y - 22, 8, true);
    g.beginPath(); g.moveTo(x - 42, y + 42); g.lineTo(x + 42, y + 42); g.stroke();
  },
  speech(g, x, y) {
    g.beginPath(); g.ellipse(x, y - 10, 130, 85, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(x - 45, y + 68); g.lineTo(x - 85, y + 125); g.lineTo(x + 5, y + 76); g.stroke();
    g.font = `700 110px ${HAND}`; g.textAlign = 'center'; g.fillText('?!', x, y + 25);
  },
  envelope(g, x, y) {
    g.strokeRect(x - 120, y - 80, 240, 160);
    g.beginPath(); g.moveTo(x - 120, y - 80); g.lineTo(x, y + 10); g.lineTo(x + 120, y - 80); g.stroke();
  },
  pencil(g, x, y) { // an unfinished line trails off behind it
    g.save(); g.translate(x, y); g.rotate(-0.6);
    g.strokeRect(-110, -16, 190, 32);
    g.beginPath(); g.moveTo(80, -16); g.lineTo(125, 0); g.lineTo(80, 16); g.stroke();
    g.setLineDash([10, 16]); g.beginPath(); g.moveTo(-130, 0); g.lineTo(-330, 0); g.stroke();
    g.restore();
  },
  none() {},
};

function heading(g, c) { // LEFT page: chapter number + heading
  g.textBaseline = 'alphabetic';
  if (c.n === 9) { // completely plain, nothing decorative
    g.textAlign = 'center'; g.fillStyle = '#8a7f6e'; g.font = `34px ${TYPE}`;
    g.fillText('CHAPTER 09', W / 2, 520);
    g.fillStyle = P.ink; g.font = `600 92px ${SERIF}`;
    wrap(g, c.title, W / 2, 640, 800, 104);
    return;
  }
  tape(g, 800, 62, 0.14, P.tapes[(c.n + 1) % 3]);
  g.textAlign = 'left';
  g.fillStyle = c.accent; g.font = `34px ${TYPE}`; g.fillText(c.tag, 70, 100);
  g.globalAlpha = 0.5; g.fillRect(70, 124, 860, 3); g.fillRect(70, 134, 860, 1.5); g.globalAlpha = 1;
  g.fillStyle = '#6b6258'; g.font = `30px ${TYPE}`; g.fillText('CHAPTER', 76, 200);
  g.fillStyle = P.ink; g.font = `700 330px ${HAND}`; g.fillText(String(c.n).padStart(2, '0'), 56, 470);
  g.font = `700 112px ${HAND}`;
  wrap(g, c.title, 70, 640, 860, 120);
  g.textAlign = 'center';
  sketch(g, c.accent, () => DOODLES[c.doodle](g, 500, 1130));
}

function titleLeaf(g) {
  tape(g, 500, 60, -0.03, P.tapes[0]);
  g.textAlign = 'center'; g.fillStyle = P.ink; g.font = `700 230px ${HAND}`;
  g.fillText('Beyond', W / 2, 470); g.fillText('Pages', W / 2, 690);
  g.fillStyle = P.typeInk; g.font = `34px ${TYPE}`; g.fillText('a book in ten chapters', W / 2, 790);
  stamp(g, 'PRIVATE', 500, 970, -0.06, P.red, 56);
  g.fillStyle = P.typeInk; g.font = `30px ${TYPE}`; g.fillText('Read in order.', W / 2, 1140);
}

function textPage(g, pg, ch) {
  const left = pg.i % 2 === 1;
  const x0 = left ? XL : XR;
  const plain = ch.n === 9; // Chapter 9: no tape, no stamps, nothing decorative
  if (!plain && pg.first) tape(g, 790, 52, 0.1, P.tapes[ch.n % 3]);
  else if (!plain && pg.i % 6 === 0) tape(g, left ? 200 : 800, 48, left ? -0.08 : 0.08, P.tapes[(ch.n + 1) % 3]);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  for (const it of pg.items) {
    const x = x0 + (it.x || 0);
    if (it.t === 'p' || it.t === 'b') {
      g.font = STY[it.t].font; g.fillStyle = P.ink; g.fillText(it.s, x, it.y);
    } else if (it.t === 'q') {
      g.font = STY.q.font; g.fillStyle = ch.accent; g.fillText(it.s, x, it.y);
      g.globalAlpha = 0.55; g.fillRect(x0 + 6, it.y - 42, 5, 56); g.globalAlpha = 1;
    } else if (it.t === 'h') {
      g.font = STY.h.font; g.fillStyle = ch.accent; g.fillText(it.s, x, it.y);
      g.globalAlpha = 0.4; g.fillRect(x, it.y + 12, Math.min(g.measureText(it.s).width, TW), 3); g.globalAlpha = 1;
    } else if (it.t === 'tag') {
      g.font = `30px ${TYPE}`; g.fillStyle = ch.accent;
      const t = it.s.toUpperCase();
      g.fillText(t, x0, it.y);
      g.globalAlpha = 0.5; g.fillRect(x0, it.y + 10, g.measureText(t).width, 3); g.globalAlpha = 1;
    } else if (it.t === 'stamp' && !plain) {
      stamp(g, it.s, left ? W / 2 - 30 : W / 2 + 40, it.y, -0.08 + (pg.i % 3) * 0.05, P.red, 52);
      g.textAlign = 'left';
    } else if (it.t === 'hr') {
      g.fillStyle = ch.accent; g.globalAlpha = 0.6;
      for (const dx of [-60, 0, 60]) { g.beginPath(); g.moveTo(W / 2 + dx, it.y - 9); g.lineTo(W / 2 + dx + 9, it.y); g.lineTo(W / 2 + dx, it.y + 9); g.lineTo(W / 2 + dx - 9, it.y); g.closePath(); g.fill(); }
      g.globalAlpha = 1;
    }
  }
  foot(g, pg.i);
}

export function pageTexture(pg, size) {
  pg = pg || { kind: 'blank', i: 1, ch: 0 };
  const c = document.createElement('canvas');
  c.width = size; c.height = Math.round((size * H) / W);
  const g = c.getContext('2d');
  g.scale(size / W, size / W);
  const ch = CHAPTERS[pg.ch - 1];
  const side = pg.i % 2 === 1 ? 'left' : 'right';
  paper(g, side, pg.kind === 'title' || !ch ? P.paper : ch.tint);
  if (pg.kind === 'title') titleLeaf(g);
  else if (pg.kind === 'heading') heading(g, ch);
  else if (pg.kind === 'text') textPage(g, pg, ch);
  else if (pg.kind === 'blank' && pg.i > 0) foot(g, pg.i);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}