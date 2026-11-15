// Elenco em 3D: personagens estilizados montados por código a partir dos mesmos
// parâmetros dos retratos em SVG (cores, cabelo, uniforme) e das mesmas 9 expressões.
import * as THREE from './three.js';
import { CAST, PLAYER } from '../art/characters.js';
import { V3, charMaterial, charLook, canvasTexture, halo, damp, clamp, rng } from './kit.js';
import { onTick, on, world } from './engine.js';

const BUILD = {
  vesper: { h: 1.74, bottom: 'skirt' }, caio: { h: 1.74, bottom: 'pants' }, yuki: { h: 1.56, bottom: 'skirt' },
  theo: { h: 1.8, bottom: 'pants' }, bianca: { h: 1.66, bottom: 'skirt' }, sora: { h: 1.7, bottom: 'pants' },
  kurisu: { h: 1.6, bottom: 'skirt' }, voce: { h: 1.77, bottom: 'pants', broad: true },
};
const REF = 1.66;      // altura de referência do modelo
const R = 0.188;       // raio da cabeça
const HIP_Y = 0.72;
const HEAD_Y = 1.438;

export const EXPR = {
  neutral: { brow: [0, 0], lid: 0, mouth: 'flat', pose: 'stand' },
  smile: { brow: [-2, 0], lid: 0, mouth: 'smile', pose: 'stand', tilt: 0.07 },
  smirk: { brow: [-1, -5], lid: 0.18, mouth: 'smirk', pose: 'hip', tilt: -0.08 },
  angry: { brow: [9, -5], lid: 0.12, mouth: 'frown', pose: 'hips', lean: 0.1 },
  cold: { brow: [3, 0], lid: 0.34, mouth: 'flat', pose: 'crossed', lean: -0.03 },
  surprised: { brow: [-9, -7], lid: 0, wide: true, mouth: 'open', pose: 'startled', lean: -0.08 },
  happy: { brow: [-3, -1], closed: true, mouth: 'grin', pose: 'cheer', tilt: 0.1 },
  flustered: { brow: [5, -3], lid: 0, mouth: 'wavy', blush: true, pose: 'fluster', turn: 0.32 },
  think: { brow: [-4, 3], lid: 0.22, mouth: 'side', pose: 'think', tilt: -0.1 },
};
// [ombro para frente(-)/trás(+), ombro para fora(+), cotovelo, torção para dentro(+)] — r = braço em -x, l = braço em +x
const POSE = {
  stand: { r: [0.04, 0.1, -0.12, 0], l: [0.04, 0.1, -0.12, 0] },
  hip: { r: [0.3, 0.62, -1.6, 0.7], l: [0.04, 0.1, -0.12, 0] },
  hips: { r: [0.3, 0.62, -1.6, 0.7], l: [0.3, 0.62, -1.6, 0.7] },
  crossed: { r: [-0.16, 0.06, -1.5, 1.3], l: [-0.04, 0.06, -1.62, 1.3] },
  startled: { r: [-0.35, 0.7, -0.6, 0], l: [-0.35, 0.7, -0.6, 0] },
  cheer: { r: [-0.35, 0.55, -2.15, -0.5], l: [0.04, 0.16, -0.3, 0] },
  fluster: { r: [-1.2, -0.22, -2.0, 0], l: [0.04, 0.14, -0.2, 0] },
  think: { r: [-0.9, -0.28, -2.2, 0], l: [-0.1, 0.06, -1.55, 1.25] },
  type: { r: [-0.72, 0.04, -1.1, 0], l: [-0.72, 0.04, -1.1, 0] },
  read: { r: [-0.95, -0.16, -1.55, 0], l: [-0.95, -0.16, -1.55, 0] },
};
const MOUTH = {
  flat: ['M188 297Q200 300 212 297'], smile: ['M184 293Q200 307 216 293'], smirk: ['M186 297Q204 304 218 290'],
  frown: ['M188 300Q200 292 212 300'], wavy: ['M186 297q4-6 8 0t8 0 8 0'], side: ['M192 298Q204 296 214 292'],
};

const hex = (value) => new THREE.Color(value);
const shadeHex = (value, amount) => '#' + hex(value).multiplyScalar(1 - amount).getHexString();
/** Mistura duas cores no espaço sRGB (o que o olho espera), devolvendo '#rrggbb'. */
function mixHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - k) + ((pb >> shift) & 255) * k).toString(16).padStart(2, '0');
  return '#' + ch(16) + ch(8) + ch(0);
}

// ---------- rosto desenhado em canvas (mesmas medidas do retrato SVG) ----------
const FACE = 256;
const FS = FACE / 190;
function drawEye(ctx, cx, side, c, e, blink) {
  const inner = cx - side * 23;
  const outer = cx + side * 25;
  ctx.lineCap = ctx.lineJoin = 'round';
  const m = !!c.masc;
  ctx.strokeStyle = shadeHex(c.hair, c.style === 'messy' ? 0.45 : 0.25);
  ctx.lineWidth = m ? 7.5 : 5;
  ctx.lineCap = m ? 'butt' : 'round';
  ctx.beginPath();
  ctx.moveTo(inner, (m ? 205 : 207) + e.brow[0]);
  ctx.quadraticCurveTo(cx, (m ? 200 : 199) + (e.brow[0] + e.brow[1]) / 2 - (m ? 1 : 3), outer, (m ? 207 : 208) + e.brow[1]);
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#231a2c';
  if (e.closed || blink) {
    ctx.beginPath();
    if (e.closed) { ctx.moveTo(cx - 22, 242); ctx.quadraticCurveTo(cx, 224, cx + 22, 242); } else { ctx.moveTo(cx - 22, 240); ctx.quadraticCurveTo(cx, 251, cx + 22, 240); }
    ctx.stroke();
    return;
  }
  const ry = (e.wide ? 18 : 16) - (m ? 2.5 : 0);
  const iris = (e.wide ? 10.5 : 12.5) - (m ? 1 : 0);
  const lidY = 222 + (e.lid || 0) * 26;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, 240, 23, ry, 0, 0, 6.2832);
  ctx.clip();
  ctx.fillStyle = '#fdfbff';
  ctx.fillRect(cx - 30, 210, 60, 60);
  const g = ctx.createLinearGradient(0, 241 - iris - 3, 0, 241 + iris + 3);
  g.addColorStop(0, shadeHex(c.eye, 0.5));
  g.addColorStop(0.55, c.eye);
  g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, 241, iris, iris + 3, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#15101f';
  ctx.beginPath(); ctx.ellipse(cx, 242, iris * 0.48, iris * 0.62, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx - 5, 234, 4.6, 0, 6.2832); ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(cx + 5, 248, 2.2, 0, 6.2832); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.skin;
  ctx.fillRect(cx - 26, lidY - 30, 52, 30);
  ctx.fillStyle = 'rgba(42,31,51,.22)';
  ctx.fillRect(cx - 26, lidY, 52, 5);
  ctx.restore();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 25, e.lid ? lidY + 2 : 237);
  ctx.quadraticCurveTo(cx, e.lid ? lidY - 6 : 240 - ry - 9, cx + 25, e.lid ? lidY + 1 : 235);
  ctx.stroke();
  if (!m) {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(outer, e.lid ? lidY + 1 : 235);
    ctx.lineTo(outer + side * 7, (e.lid ? lidY + 1 : 235) - 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#7a5a5a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 15, 240 + ry);
  ctx.quadraticCurveTo(cx, 244 + ry, cx + 15, 239 + ry);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFace(ctx, w, h, c, e, blink, talk) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = c.skin;
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(FS, 0, 0, FS, w / 2 - 200 * FS, h / 2 - 238 * FS);
  // sombra do cabelo na testa e nas laterais
  const top = ctx.createLinearGradient(0, 138, 0, 196);
  top.addColorStop(0, c.shade);
  top.addColorStop(1, c.skin);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = top;
  ctx.fillRect(90, 130, 220, 66);
  ctx.globalAlpha = 1;
  if (e.blush) {
    ctx.fillStyle = 'rgba(255,107,125,.42)';
    for (const x of [150, 250]) { ctx.beginPath(); ctx.ellipse(x, 270, 20, 9, 0, 0, 6.2832); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,77,102,.6)';
    ctx.lineWidth = 2;
    for (const x of [138, 148, 240, 250]) { ctx.beginPath(); ctx.moveTo(x, 265); ctx.lineTo(x + 8, 273); ctx.stroke(); }
  } else {
    ctx.fillStyle = 'rgba(255,140,130,.14)';
    for (const x of [148, 252]) { ctx.beginPath(); ctx.ellipse(x, 272, 18, 9, 0, 0, 6.2832); ctx.fill(); }
  }
  drawEye(ctx, 160, -1, c, e, blink);
  drawEye(ctx, 240, 1, c, e, blink);
  ctx.strokeStyle = c.shade;
  ctx.lineWidth = 2.6;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.stroke(new Path2D('M201 262l-5 12 7 1'));
  // boca
  if (talk > 0 && e.mouth !== 'open') {
    ctx.fillStyle = '#6d2b34';
    ctx.beginPath(); ctx.ellipse(200, 298, 7 + talk * 2, 3 + talk * 6, 0, 0, 6.2832); ctx.fill();
  } else if (e.mouth === 'open') {
    ctx.fillStyle = '#6d2b34';
    ctx.beginPath(); ctx.ellipse(200, 298, 8, 10, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#d9707a';
    ctx.beginPath(); ctx.ellipse(200, 303, 5, 4, 0, 0, 6.2832); ctx.fill();
  } else if (e.mouth === 'grin') {
    const grin = new Path2D('M182 291Q200 314 218 291Z');
    ctx.fillStyle = '#fff';
    ctx.fill(grin);
    ctx.strokeStyle = '#7a3b3b';
    ctx.lineWidth = 2.5;
    ctx.stroke(grin);
  } else {
    ctx.strokeStyle = '#7a3b3b';
    ctx.lineWidth = 3;
    ctx.stroke(new Path2D(MOUTH[e.mouth][0]));
  }
  if (c.glasses) {
    ctx.strokeStyle = c.outfit === 'suit' ? '#d4af6a' : '#1b1e2c';
    ctx.fillStyle = 'rgba(180,210,255,.12)';
    ctx.lineWidth = 3.5;
    for (const x of [132, 210]) { ctx.beginPath(); ctx.roundRect(x, 220, 58, 42, 13); ctx.fill(); ctx.stroke(); }
    ctx.stroke(new Path2D('M190 238Q200 232 210 238M132 236 118 230M268 236 282 230'));
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 3;
    ctx.stroke(new Path2D('M140 228l14 0M218 228l14 0'));
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------- frente do uniforme (camisa, gravata, lapelas, brasão) ----------
function drawFront(ctx, w, h, c) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const coat = c.outfit === 'labcoat';
  const trim = '#d4af6a';
  // camisa em V
  ctx.fillStyle = coat ? '#2a2f45' : '#eef0f8';
  ctx.beginPath(); ctx.moveTo(cx - 34, 0); ctx.lineTo(cx + 34, 0); ctx.lineTo(cx, h * 0.62); ctx.closePath(); ctx.fill();
  // colarinho
  ctx.fillStyle = '#ffffff';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 34, 0); ctx.lineTo(cx + s * 12, 30); ctx.lineTo(cx, 12); ctx.lineTo(cx + s * 6, 0); ctx.closePath(); ctx.fill(); }
  if (c.outfit === 'suit') {
    ctx.fillStyle = c.tie;
    ctx.beginPath(); ctx.arc(cx, 34, 11, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = trim; ctx.lineWidth = 3; ctx.stroke();
  } else {
    ctx.fillStyle = c.tie;
    ctx.beginPath(); ctx.moveTo(cx - 9, 18); ctx.lineTo(cx + 9, 18); ctx.lineTo(cx + 13, 40); ctx.lineTo(cx, h * 0.6); ctx.lineTo(cx - 13, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shadeHex(c.tie, 0.3);
    ctx.fillRect(cx - 9, 18, 18, 14);
  }
  // lapelas com friso dourado
  ctx.strokeStyle = coat ? '#bdbab2' : trim;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    ctx.fillStyle = coat ? '#fbfaf7' : shadeHex(c.cloth2, -0.35);
    ctx.beginPath(); ctx.moveTo(cx + s * 34, 0); ctx.lineTo(cx + s * 60, 34); ctx.lineTo(cx + s * 30, 70); ctx.lineTo(cx + s * 44, 92); ctx.lineTo(cx, h * 0.72); ctx.lineTo(cx, h * 0.62); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(cx, h * 0.66); ctx.lineTo(cx, h); ctx.stroke();
  for (const y of [0.78, 0.9]) { ctx.fillStyle = coat ? '#bdbab2' : trim; ctx.beginPath(); ctx.arc(cx + 8, h * y, 4, 0, 6.2832); ctx.fill(); }
  if (coat) {
    ctx.fillStyle = '#c9c6bd'; ctx.fillRect(cx + 26, h * 0.6, 34, 5);
    ctx.fillStyle = '#4e6bd6'; ctx.fillRect(cx + 32, h * 0.52, 5, 16);
    ctx.fillStyle = '#d6564e'; ctx.fillRect(cx + 42, h * 0.52, 5, 16);
  } else {
    // brasão no peito
    ctx.save();
    ctx.translate(cx + 42, h * 0.5);
    ctx.scale(0.26, 0.26);
    ctx.fillStyle = '#0d1120'; ctx.strokeStyle = trim; ctx.lineWidth = 8; ctx.lineJoin = ctx.lineCap = 'round';
    const shield = new Path2D('M0-46 40-30V8C40 34 20 52 0 62-20 52-40 34-40 8V-30Z');
    ctx.fill(shield); ctx.stroke(shield);
    ctx.lineWidth = 11; ctx.stroke(new Path2D('M-12-20H8a14 14 0 0 1 0 28H-4V34'));
    ctx.restore();
  }
}

// ---------- cabelo ----------
const _up = new V3(0, 1, 0);
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const sph = (radius, theta, phi) => new V3(-radius * Math.cos(phi) * Math.sin(theta), radius * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta));
const FRONT = Math.PI / 2;

/** Mecha cônica presa à superfície da cabeça. lift: 0 = colada, 1+ = arrepiada. */
function tuft(list, theta, phi, length, width, lift = 0.15, flat = 0.55, swing = 0) {
  const p = sph(R * 1.0, theta, phi);
  const normal = p.clone().normalize();
  const down = sph(R, theta + 0.02, phi + swing * 0.02).sub(p).normalize();
  const dir = down.multiplyScalar(1).addScaledVector(normal, lift).normalize();
  const g = new THREE.ConeGeometry(width, length, 6);
  g.scale(1, 1, flat);
  _q.setFromUnitVectors(_up, dir);
  // gira a mecha para a face larga acompanhar a cabeça
  const base = p.clone().addScaledVector(normal, R * 0.045).addScaledVector(dir, length * 0.42);
  _m.compose(base, _q, new V3(1, 1, 1));
  g.applyMatrix4(_m);
  list.push(g);
}

function hairGeometry(style, seed) {
  const list = [];
  const r = rng(seed);
  const open = style === 'bob' || style === 'wavy' || style === 'long' ? 0.92 : 1.02;
  const reach = { bob: 0.74, wavy: 0.7, long: 0.7, bun: 0.6, messy: 0.66, male: 0.56 }[style] ?? 0.6;
  // casco de trás e calota do topo
  list.push(new THREE.SphereGeometry(R * 1.075, 28, 16, FRONT + open, Math.PI * 2 - open * 2, 0, Math.PI * reach));
  list.push(new THREE.SphereGeometry(R * 1.08, 28, 8, 0, Math.PI * 2, 0, Math.PI * 0.3));
  const fringe = (count, spread, length, width, jitter = 0, lift = 0.12, theta = 0.27) => {
    for (let i = 0; i < count; i++) {
      const k = count === 1 ? 0 : i / (count - 1) - 0.5;
      tuft(list, Math.PI * (theta + Math.abs(k) * 0.05), FRONT + k * spread * 2, length * (1 + (r() - 0.5) * jitter), width, lift, 0.5, k * 8);
    }
  };
  const ball = (radius, x, y, z, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(radius, 14, 10); g.scale(sx, sy, sz); g.translate(x, y, z); list.push(g); };

  if (style === 'bun') {
    ball(R * 0.5, 0, R * 1.05, -R * 0.45);
    fringe(5, 0.78, R * 0.62, R * 0.3, 0.2, 0.1);
    for (const s of [-1, 1]) tuft(list, Math.PI * 0.36, FRONT + s * 1.0, R * 0.95, R * 0.2, 0.08, 0.5);
  } else if (style === 'spiky') {
    for (let i = 0; i < 16; i++) tuft(list, Math.PI * (0.06 + r() * 0.3), r() * Math.PI * 2, R * (0.7 + r() * 0.5), R * 0.3, 1.2 + r(), 0.7);
    for (let i = 0; i < 5; i++) tuft(list, Math.PI * 0.2, FRONT + (i - 2) * 0.36, R * (0.6 + r() * 0.3), R * 0.24, 0.55, 0.6, (i - 2) * 6);
    fringe(5, 0.7, R * 0.5, R * 0.24, 0.5, 0.3);
  } else if (style === 'bob') {
    fringe(7, 0.8, R * 0.66, R * 0.24, 0.08, 0.1, 0.28);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) tuft(list, Math.PI * (0.42 + i * 0.07), FRONT + s * (0.98 + i * 0.1), R * 1.1, R * 0.3, 0.1, 0.6);
  } else if (style === 'side') {
    for (let i = 0; i < 5; i++) tuft(list, Math.PI * 0.26, FRONT + 0.75 - i * 0.36, R * (0.6 - i * 0.03), R * 0.3, 0.14, 0.5, -14);
    ball(R * 0.62, R * 0.12, R * 0.72, R * 0.1, 1.25, 0.6, 1.3);
    for (const s of [-1, 1]) tuft(list, Math.PI * 0.4, FRONT + s * 1.04, R * 0.6, R * 0.2, 0.08, 0.5);
  } else if (style === 'wavy' || style === 'long') {
    const wavy = style === 'wavy';
    fringe(wavy ? 5 : 7, 0.8, R * (wavy ? 0.7 : 0.64), R * 0.28, 0.15, 0.1, 0.27);
    const length = wavy ? 0.36 : 0.5;
    // massa de trás: dois elipsoides largos e achatados formam uma cortina contínua
    ball(R * 1.02, 0, -R * 0.35, -R * 0.44, wavy ? 1.22 : 1.1, 1.5, 0.52);
    ball(R * (wavy ? 0.98 : 0.86), 0, -R * 0.35 - length, -R * 0.56, wavy ? 1.24 : 1.08, 1.9, 0.46);
    // mechas da frente, uma de cada lado do rosto
    for (const s of [-1, 1]) {
      ball(R * 0.3, s * R * 0.98, -R * 0.5, R * 0.42, 0.85, 3.0, 0.85);
      if (wavy) ball(R * 0.27, s * R * 1.05, -R * 1.25, R * 0.5, 0.85, 2.4, 0.85);
      else ball(R * 0.24, s * R * 0.99, -R * 1.5, R * 0.5, 0.8, 2.6, 0.8);
    }
  } else if (style === 'male') {
    // curto e texturizado: franja jogada para o lado, laterais baixas
    for (let i = 0; i < 9; i++) tuft(list, Math.PI * (0.05 + r() * 0.16), r() * Math.PI * 2, R * (0.34 + r() * 0.16), R * 0.27, 0.75, 0.62);
    for (let i = 0; i < 6; i++) tuft(list, Math.PI * 0.22, FRONT + 0.62 - i * 0.25, R * (0.46 - i * 0.025), R * 0.27, 0.32, 0.55, -12);
    for (const s of [-1, 1]) tuft(list, Math.PI * 0.42, FRONT + s * 1.08, R * 0.34, R * 0.17, 0.05, 0.5);
  } else if (style === 'messy') {
    for (let i = 0; i < 12; i++) tuft(list, Math.PI * (0.1 + r() * 0.36), r() * Math.PI * 2, R * (0.5 + r() * 0.3), R * 0.26, 0.5 + r() * 0.5, 0.7);
    fringe(7, 0.82, R * 0.86, R * 0.22, 0.45, 0.14, 0.26);
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) tuft(list, Math.PI * (0.45 + i * 0.08), FRONT + s * (1.05 + i * 0.12), R * 0.9, R * 0.24, 0.16, 0.6);
  } else {
    fringe(5, 0.74, R * 0.56, R * 0.3, 0.3, 0.14);
    for (const s of [-1, 1]) tuft(list, Math.PI * 0.4, FRONT + s * 1.05, R * 0.55, R * 0.2, 0.1, 0.5);
  }
  const clean = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const name of Object.keys(n.attributes)) if (name !== 'position' && name !== 'normal') n.deleteAttribute(name); return n; });
  const merged = THREE.BufferGeometryUtils.mergeGeometries(clean, false);
  list.forEach((g) => g.dispose());
  return merged;
}

const limb = (radius, length) => { const g = new THREE.CapsuleGeometry(radius, length, 4, 10); g.translate(0, -length / 2, 0); return g; };

// ---------- montagem ----------
class Actor {
  constructor(id) {
    const c = this.c = id === 'voce' ? PLAYER : CAST[id];
    const build = BUILD[id] || BUILD.voce;
    this.id = id;
    this.scale = build.h / REF;
    this.expr = 'neutral';
    this.pose = null;          // pose forçada (sentado, lendo, digitando); null = pose da expressão
    this.seated = false;
    this.talking = false;
    this.mouth = 0;
    this.blink = false;
    this.nextBlink = 1 + Math.random() * 4;
    this.uDim = { value: 1 };
    this.dimTarget = 1;
    this.aura = 0;
    this.phase = Math.random() * 6.28;
    this.walk = 0;            // 0 parado .. 1 andando
    this.stride = 0;
    this.hop = 0;
    this.appear = 1;
    this.lookTarget = null;
    this.headYaw = 0;
    this.headPitch = 0;
    this.faceKey = '';

    const mat = (color, o = {}) => charMaterial(color, { dim: this.uDim, ...o });
    const coat = c.outfit === 'labcoat';
    const skin = mat(c.skin);
    const cloth = mat(coat ? '#f2f1ee' : mixHex(c.cloth2, '#7f8fff', 0.2));
    const dark = mat(mixHex(c.cloth, '#6a78e0', 0.16));
    const hairMat = mat(c.hair);
    const shoe = mat('#141222');

    const root = this.group = new THREE.Group();
    root.name = `actor:${id}`;
    const body = this.body = new THREE.Group();
    body.scale.setScalar(this.scale);
    root.add(body);
    const hips = this.hips = new THREE.Group();
    hips.position.y = HIP_Y;
    body.add(hips);
    const torso = this.torso = new THREE.Group();
    hips.add(torso);

    // tronco
    const profile = (build.broad
      ? [[0.0, -0.06], [0.128, -0.055], [0.13, 0.0], [0.124, 0.06], [0.12, 0.17], [0.132, 0.27], [0.152, 0.37], [0.142, 0.43], [0.066, 0.47], [0.0, 0.475]]
      : [[0.0, -0.06], [0.132, -0.055], [0.136, 0.0], [0.124, 0.06], [0.106, 0.17], [0.112, 0.27], [0.13, 0.37], [0.122, 0.43], [0.06, 0.47], [0.0, 0.475]]).map(([x, y]) => new THREE.Vector2(x, y));
    const torsoMesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), cloth);
    torsoMesh.scale.z = 0.74;
    torso.add(torsoMesh);
    this.frontTex = canvasTexture(128, 160, (ctx, w, h) => drawFront(ctx, w, h, c), { anisotropy: 4 });
    const frontMat = mat(0xffffff, { map: this.frontTex, alphaTest: 0.4 });
    const front = new THREE.Mesh(new THREE.LatheGeometry(profile.slice(2, 9).map((p) => new THREE.Vector2(p.x * 1.03 + 0.002, p.y)), 14, -1.0, 2.0), frontMat);
    front.scale.z = 0.74;
    torso.add(front);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(build.broad ? 0.058 : 0.052, build.broad ? 0.064 : 0.058, 0.12, 12), skin);
    neck.position.y = 0.49;
    torso.add(neck);

    // saia, jaleco ou quadril
    if (build.bottom === 'skirt' || coat) {
      const hem = coat ? 0.34 : 0.25;
      const skirtProfile = [[0.08, 0.08], [0.128, -0.03], [coat ? 0.185 : 0.21, -hem]].map(([x, y]) => new THREE.Vector2(x, y));
      const skirt = new THREE.Mesh(new THREE.LatheGeometry(skirtProfile, 16), mat(coat ? '#e9e8e4' : mixHex(c.cloth, '#6a78e0', 0.2), { side: THREE.DoubleSide }));
      skirt.scale.z = 0.8;
      hips.add(skirt);
      this.skirt = skirt;
    } else {
      const seat = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), dark);
      seat.scale.set(1, 0.7, 0.74);
      seat.position.y = -0.06;
      hips.add(seat);
    }

    // cabeça
    const head = this.head = new THREE.Group();
    head.position.y = HEAD_Y - HIP_Y;
    torso.add(head);
    const shape = new THREE.Group();
    shape.scale.set(1, 1.06, 1.0);
    head.add(shape);
    shape.add(new THREE.Mesh(new THREE.SphereGeometry(R, 28, 20), skin));
    this.faceTex = canvasTexture(FACE, FACE, (ctx, w, h, e = EXPR.neutral, blink = false, talk = 0) => drawFace(ctx, w, h, c, e, blink, talk), { anisotropy: 4 });
    const faceMat = mat(0xffffff, { map: this.faceTex });
    shape.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 24, 16, FRONT - 0.95, 1.9, Math.PI * 0.22, Math.PI * 0.56), faceMat));
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 8, 8), skin); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * R * 0.98, -R * 0.05, 0); shape.add(ear); }
    const hair = new THREE.Mesh(hairGeometry(c.style, id.length * 17 + id.charCodeAt(0)), hairMat);
    shape.add(hair);
    const shineMat = mat(c.hairHi);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(R * 1.086, 20, 3, FRONT - 1.15, 2.3, Math.PI * 0.15, Math.PI * 0.045), shineMat);
    shape.add(shine);

    // braços e pernas
    const sleeve = cloth;
    this.arms = {};
    for (const [key, s] of [['r', -1], ['l', 1]]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(s * (build.broad ? 0.166 : 0.148), 0.395, 0);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(build.broad ? 0.056 : 0.05, 12, 10), sleeve);
      shoulder.add(cap, new THREE.Mesh(limb(0.042, 0.17), sleeve));
      const elbow = new THREE.Group();
      elbow.position.y = -0.2;
      elbow.add(new THREE.Mesh(limb(0.04, 0.15), sleeve));
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.03, 12), mat(coat ? '#d5d3cd' : c.tie));
      cuff.position.y = -0.165;
      elbow.add(cuff);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 10), skin);
      hand.position.y = -0.215;
      hand.scale.set(0.88, 1.12, 0.72);
      elbow.add(hand);
      shoulder.add(elbow);
      torso.add(shoulder);
      this.arms[key] = { shoulder, elbow, hand, side: s, cur: [0.04, 0.1, -0.12, 0] };
    }
    this.legs = {};
    const legMat = build.bottom === 'pants' ? dark : skin;
    const sock = build.bottom === 'pants' ? dark : mat('#1a1830');
    for (const [key, s] of [['r', -1], ['l', 1]]) {
      const hip = new THREE.Group();
      hip.position.set(s * 0.068, -0.03, 0);
      hip.add(new THREE.Mesh(limb(0.064, 0.22), legMat));
      const knee = new THREE.Group();
      knee.position.y = -0.33;
      knee.add(new THREE.Mesh(limb(0.052, 0.21), sock));
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), shoe);
      foot.scale.set(0.95, 0.6, 1.7);
      foot.position.set(0, -0.325, 0.04);
      knee.add(foot);
      hip.add(knee);
      hips.add(hip);
      this.legs[key] = { hip, knee };
    }

    root.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = false; } });
    // aura colorida atrás de quem fala e sombra de contato
    this.glow = halo(c.color, 2.3, 0);
    this.glow.position.set(0, 1.2 * this.scale, -0.35);
    root.add(this.glow);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.012;
    root.add(blob);
    this.blob = blob;
    this.refreshFace(true);
  }

  refreshFace(force) {
    const key = `${this.expr}|${this.blink ? 1 : 0}|${this.mouth.toFixed(1)}`;
    if (!force && key === this.faceKey) return;
    this.faceKey = key;
    this.faceTex.redraw(EXPR[this.expr] || EXPR.neutral, this.blink, this.mouth);
  }

  setExpr(name) {
    const next = EXPR[name] ? name : 'neutral';
    if (next !== this.expr) { this.expr = next; if (next === 'surprised') this.hop = 1; }
    this.refreshFace();
  }
  /** Pose fixa: 'type', 'read' ou null. seat = altura do assento quando sentado. */
  setPose(pose, seat) {
    this.pose = pose;
    this.seated = seat !== undefined && seat !== null;
    this.seatY = seat;
    if (pose === 'read' && !this.book) this.addBook();
    if (this.book) this.book.visible = pose === 'read';
  }
  addBook() {
    const book = this.book = new THREE.Group();
    const cover = charMaterial('#5a2f38', { dim: this.uDim });
    const pages = charMaterial('#f4efe4', { dim: this.uDim });
    for (const s of [-1, 1]) {
      const half = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.19, 0.016), cover);
      half.position.x = s * 0.066;
      half.rotation.y = s * -0.35;
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.012), pages);
      sheet.position.set(s * 0.064, 0, 0.012);
      sheet.rotation.y = s * -0.35;
      book.add(half, sheet);
    }
    book.position.set(0, 0.2, 0.27);
    book.rotation.x = -0.9;
    this.torso.add(book);
  }
  setTalking(on) { this.talking = !!on; if (!on) { this.mouth = 0; this.refreshFace(); } }
  setDim(dimmed) { this.dimTarget = dimmed ? 0.42 : 1; }
  bump() { this.hop = Math.max(this.hop, 0.45); }
  lookAt(target) { this.lookTarget = target; }
  place(x, y, z, yaw) { this.group.position.set(x, y, z); if (yaw !== undefined) this.group.rotation.y = yaw; }

  update(dt, t) {
    const e = EXPR[this.expr] || EXPR.neutral;
    const p = t + this.phase;
    // piscar e falar
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blink = !this.blink; this.nextBlink = this.blink ? 0.12 : 2.2 + Math.random() * 4; this.refreshFace(); }
    if (this.talking) {
      this.talkClock = (this.talkClock || 0) - dt;
      if (this.talkClock <= 0) { this.talkClock = 0.085 + Math.random() * 0.07; this.mouth = this.mouth > 0.1 ? 0 : 0.4 + Math.random() * 0.6; this.refreshFace(); }
    }
    // brilho (quem não fala escurece)
    this.uDim.value = damp(this.uDim.value, this.dimTarget, 7, dt);
    const auraTarget = this.talking ? 0.3 : this.aura;
    this.glow.material.opacity = damp(this.glow.material.opacity, auraTarget * this.uDim.value, 5, dt);

    // pose dos braços
    const pose = POSE[this.pose || (this.walk > 0.2 ? 'stand' : e.pose)] || POSE.stand;
    const typing = this.pose === 'type';
    this.stride += dt * 9.5 * this.walk;
    const swing = Math.sin(this.stride) * 0.65 * this.walk;
    for (const key of ['r', 'l']) {
      const arm = this.arms[key];
      const target = pose[key];
      for (let i = 0; i < 4; i++) arm.cur[i] = damp(arm.cur[i], target[i], 8, dt);
      const tap = typing ? Math.sin(p * 13 + (key === 'r' ? 0 : 2)) * 0.07 : 0;
      arm.shoulder.rotation.x = arm.cur[0] + (key === 'r' ? swing : -swing) + Math.sin(p * 1.6) * 0.012;
      arm.shoulder.rotation.z = arm.side * (arm.cur[1] + Math.sin(p * 1.6 + 1) * 0.012);
      arm.shoulder.rotation.y = -arm.side * arm.cur[3];
      arm.elbow.rotation.x = arm.cur[2] + tap - Math.abs(swing) * 0.5;
    }
    // pernas: sentado, andando ou em pé
    const sit = this.seated ? 1 : 0;
    this.sit = damp(this.sit ?? sit, sit, 8, dt);
    for (const key of ['r', 'l']) {
      const leg = this.legs[key];
      const s = key === 'r' ? -swing : swing;
      leg.hip.rotation.x = -1.5 * this.sit + s * 0.75;
      leg.knee.rotation.x = 1.5 * this.sit + Math.max(0, -s) * 0.9 + Math.abs(swing) * 0.25;
    }
    if (this.skirt) this.skirt.scale.set(1 + this.sit * 0.15, 1 - this.sit * 0.45, 0.8 + this.sit * 0.5);
    // corpo
    this.hop = Math.max(0, this.hop - dt * 3.2);
    const hop = Math.sin(Math.min(1, this.hop) * Math.PI) * 0.07;
    const bob = Math.abs(Math.sin(this.stride)) * 0.03 * this.walk;
    const base = this.seated ? (this.seatY + 0.064 * this.scale) / this.scale + 0.03 : HIP_Y;
    this.hips.position.y = damp(this.hips.position.y, base, 10, dt) + 0;
    this.body.position.y = hop + bob + (this.expr === 'happy' && !this.seated ? Math.abs(Math.sin(p * 5)) * 0.018 : 0) - (1 - this.appear) * 0.2;
    this.torso.scale.y = 1 + Math.sin(p * 1.6) * 0.012;
    this.torso.rotation.x = damp(this.torso.rotation.x, (e.lean || 0) + (this.seated ? 0.1 : 0) + this.walk * 0.07, 6, dt);
    this.torso.rotation.z = Math.sin(p * 0.7) * 0.012;
    // cabeça: acompanha um alvo e inclina conforme a expressão
    let yaw = (e.turn || 0) + Math.sin(p * 0.43) * 0.04;
    let pitch = Math.sin(p * 0.6 + 1) * 0.025 + (this.pose === 'read' ? 0.42 : 0) + (typing ? 0.2 : 0);
    if (this.lookTarget) {
      this.group.worldToLocal(_look.copy(this.lookTarget));
      const dy = _look.y - HEAD_Y * this.scale * (this.seated ? 0.72 : 1);
      yaw += clamp(Math.atan2(_look.x, _look.z), -1.1, 1.1);
      pitch += clamp(-Math.atan2(dy, Math.hypot(_look.x, _look.z)), -0.5, 0.5);
    }
    this.headYaw = damp(this.headYaw, yaw, 6, dt);
    this.headPitch = damp(this.headPitch, pitch, 6, dt);
    this.head.rotation.set(this.headPitch, this.headYaw, damp(this.head.rotation.z, e.tilt || 0, 6, dt));
    this.appear = Math.min(1, this.appear + dt * 3.4);
    this.body.scale.setScalar(this.scale * (0.93 + 0.07 * this.appear));
  }
}
const _look = new V3();

// Cada cenário pode tingir os personagens (pôr do sol no corredor, neon no laboratório…).
const LOOKS = {
  gate: { tint: [0.86, 0.88, 1.08], rim: [0.5, 0.42, 0.3], shade: [0.6, 0.6, 0.86] },
  hall: { tint: [1.06, 0.98, 0.95], rim: [0.55, 0.36, 0.22], shade: [0.68, 0.6, 0.8] },
  classroom: { tint: [1.03, 1.0, 1.0], rim: [0.42, 0.32, 0.3], shade: [0.68, 0.63, 0.83] },
  lab: { tint: [0.93, 1.03, 1.05], rim: [0.14, 0.48, 0.46], shade: [0.6, 0.7, 0.82] },
  arena: { tint: [1.0, 0.97, 1.06], rim: [0.46, 0.34, 0.6], shade: [0.62, 0.58, 0.86] },
};
on('scene', ({ name }) => {
  const look = LOOKS[name] || LOOKS.classroom;
  charLook.tint.value.setRGB(...look.tint);
  charLook.rim.value.setRGB(...look.rim);
  charLook.shade.value.setRGB(...look.shade);
});

const actors = new Map();
export function getActor(id) {
  if (!actors.has(id)) actors.set(id, new Actor(id));
  return actors.get(id);
}
export const hasModel = (id) => id === 'voce' || !!CAST[id]?.skin;

onTick((dt, t) => {
  if (!world.current) return;
  for (const actor of actors.values()) if (actor.group.parent) actor.update(dt, t);
});
