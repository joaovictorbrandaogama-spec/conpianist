// Personagens procedurais: silhueta anime, mechas curvas e uniforme de alfaiataria.
// As partes rígidas são reunidas por material; só braços/pernas mantêm pivôs próprios.
import * as THREE from 'three';

const INK = 0x17131f;
const INK_CSS = '#17131f';
const TAU = Math.PI * 2;

let ramp = null;
function gradient() {
  if (!ramp) {
    ramp = new THREE.DataTexture(new Uint8Array([105, 175, 222, 255]), 4, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
    ramp.userData = { sharedResource: true };
  }
  return ramp;
}
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradient(), ...extra });
const outlineMaterial = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
outlineMaterial.userData.sharedResource = true;

/** Malha com contorno (casca invertida levemente maior). */
export function part(geometry, material, outline = 0.05) {
  const mesh = new THREE.Mesh(geometry, material);
  if (outline) {
    const shell = new THREE.Mesh(geometry, outlineMaterial);
    shell.scale.setScalar(1 + outline);
    mesh.add(shell);
  }
  return mesh;
}
const at = (object, x, y, z) => { object.position.set(x, y, z); return object; };

/** Placa de texto que sempre encara a câmera. */
export function label(text, { fg = '#f5f2ea', bg = '#0a1426', border = '#3aa3ff', size = 64 } = {}) {
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  const font = `${size}px Anton, Impact, "Arial Narrow", sans-serif`;
  g.font = font;
  const width = Math.ceil(g.measureText(text).width) + 56;
  canvas.width = width;
  canvas.height = size + 40;
  g.fillStyle = border;
  g.fillRect(0, 0, width, canvas.height);
  g.fillStyle = bg;
  g.fillRect(6, 6, width - 12, canvas.height - 12);
  g.font = font;
  g.fillStyle = fg;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText(text, width / 2, canvas.height / 2 + 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set((width / canvas.height) * 1.5, 1.5, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// ---------- rosto ----------
const EXPR = {
  neutral: { brow: [0, 0], lid: 0, mouth: 'flat' },
  smile: { brow: [-2, 0], lid: 0, mouth: 'smile' },
  smirk: { brow: [-1, -5], lid: 0.2, mouth: 'smirk' },
  angry: { brow: [10, -6], lid: 0.14, mouth: 'frown' },
  cold: { brow: [4, 0], lid: 0.36, mouth: 'flat' },
  surprised: { brow: [-9, -7], lid: 0, wide: true, mouth: 'open' },
  happy: { brow: [-3, -1], closed: true, mouth: 'grin' },
  flustered: { brow: [5, -3], lid: 0, mouth: 'wavy', blush: true },
  think: { brow: [-4, 3], lid: 0.24, mouth: 'side' },
};

function drawEye(g, x, y, s, c, e) {
  const rx = 27;
  const ry = (c.fem ? 31 : 26) + (e.wide ? 5 : 0);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = c.hairLo;
  g.lineWidth = c.fem ? 5 : 7;
  g.beginPath();
  g.moveTo(x - s * 26, y - ry - 15 + e.brow[0] * 1.3);
  g.quadraticCurveTo(x + s * 2, y - ry - 25 + (e.brow[0] + e.brow[1]) * 0.65, x + s * 30, y - ry - 17 + e.brow[1] * 1.3);
  g.stroke();
  if (e.closed) {
    g.strokeStyle = INK_CSS;
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(x - 26, y + 8);
    g.quadraticCurveTo(x, y - 20, x + 26, y + 8);
    g.stroke();
    return;
  }
  const lidY = y - ry + (e.lid || 0) * ry * 1.5;
  g.save();
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.clip();
  g.fillStyle = '#fbfaff';
  g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  const iris = g.createLinearGradient(0, y - ry, 0, y + ry);
  iris.addColorStop(0, '#1a1424');
  iris.addColorStop(0.5, c.eye);
  iris.addColorStop(1, c.hairLight ? '#f4e6bf' : '#bddfe4');
  const ir = e.wide ? 15 : 19;
  g.fillStyle = iris;
  g.beginPath();
  g.ellipse(x + s, y + 3, ir, ir + 6, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#120e1a';
  g.beginPath();
  g.ellipse(x + s, y + 4, ir * 0.45, ir * 0.62, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(x - 7, y - 9, 6, 0, TAU);
  g.fill();
  g.beginPath();
  g.arc(x + 8, y + 13, 3, 0, TAU);
  g.fill();
  if (e.lid) {
    g.fillStyle = c.skin;
    g.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, lidY - (y - ry) + 2);
  }
  g.fillStyle = 'rgba(26,20,36,.22)';
  g.fillRect(x - rx, lidY, rx * 2, 7);
  g.restore();
  g.strokeStyle = INK_CSS;
  g.lineWidth = c.fem ? 8 : 6.5;
  g.beginPath();
  if (e.lid) {
    g.moveTo(x - rx - 1, lidY + 5);
    g.quadraticCurveTo(x, lidY - 7, x + rx + 1, lidY + 3);
  } else {
    g.ellipse(x, y, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96);
  }
  g.stroke();
  g.beginPath();
  g.moveTo(x + s * rx, e.lid ? lidY + 3 : y - 5);
  g.lineTo(x + s * (rx + 9), (e.lid ? lidY + 3 : y - 5) - 8);
  g.stroke();
  g.globalAlpha = 0.4;
  g.lineWidth = 2.5;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, Math.PI * 0.2, Math.PI * 0.8);
  g.stroke();
  g.globalAlpha = 1;
}

function drawMouth(g, x, y, kind) {
  g.strokeStyle = '#8a3b45';
  g.lineWidth = 4.5;
  g.lineCap = 'round';
  g.beginPath();
  if (kind === 'smile') { g.moveTo(x - 18, y - 4); g.quadraticCurveTo(x, y + 14, x + 18, y - 4); }
  else if (kind === 'smirk') { g.moveTo(x - 16, y); g.quadraticCurveTo(x + 4, y + 9, x + 20, y - 8); }
  else if (kind === 'frown') { g.moveTo(x - 14, y + 5); g.quadraticCurveTo(x, y - 8, x + 14, y + 5); }
  else if (kind === 'side') { g.moveTo(x - 8, y + 2); g.quadraticCurveTo(x + 4, y, x + 16, y - 6); }
  else if (kind === 'wavy') { g.moveTo(x - 16, y); g.quadraticCurveTo(x - 10, y - 8, x - 5, y); g.quadraticCurveTo(x, y + 8, x + 5, y); g.quadraticCurveTo(x + 10, y - 8, x + 16, y); }
  else if (kind === 'open') {
    g.fillStyle = '#6d2b34';
    g.ellipse(x, y + 2, 10, 13, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#d9707a';
    g.beginPath();
    g.ellipse(x, y + 8, 6, 5, 0, 0, TAU);
    g.fill();
    return;
  } else if (kind === 'grin') {
    g.moveTo(x - 22, y - 6);
    g.quadraticCurveTo(x, y + 26, x + 22, y - 6);
    g.closePath();
    g.fillStyle = '#fff';
    g.fill();
    g.strokeStyle = INK_CSS;
    g.lineWidth = 3.5;
  } else { g.moveTo(x - 14, y); g.quadraticCurveTo(x, y + 3, x + 14, y); }
  g.stroke();
}

function drawFace(canvas, c, expression) {
  const e = EXPR[expression] || EXPR.neutral;
  const g = canvas.getContext('2d');
  g.setTransform(canvas.width / 1024, 0, 0, canvas.height / 512, 0, 0);
  const cx = 256;
  const cy = 268;
  g.globalAlpha = 1;
  g.fillStyle = c.skin;
  g.fillRect(0, 0, 1024, 512);
  g.fillStyle = c.shade;
  g.globalAlpha = 0.45;
  g.fillRect(cx - 200, cy - 160, 400, 72);
  g.globalAlpha = e.blush ? 0.5 : 0.14;
  g.fillStyle = '#ff6b7d';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 100, cy + 54, 30, 14, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  const has = (name) => c.acc?.includes(name);
  if (has('freckles')) {
    g.fillStyle = 'rgba(168,90,58,.6)';
    for (const [dx, dy] of [[-90, 44], [-76, 52], [-62, 43], [62, 43], [76, 52], [90, 44]]) { g.beginPath(); g.arc(cx + dx, cy + dy, 3, 0, TAU); g.fill(); }
  }
  for (const s of [-1, 1]) drawEye(g, cx + s * 66, cy + 6, s, c, e);
  g.strokeStyle = c.shade;
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(cx + 2, cy + 36);
  g.lineTo(cx - 5, cy + 50);
  g.lineTo(cx + 4, cy + 52);
  g.stroke();
  drawMouth(g, cx, cy + 86, e.mouth);
  if (has('mole')) { g.fillStyle = '#3a2530'; g.beginPath(); g.arc(cx + 96, cy + 34, 3.5, 0, TAU); g.fill(); }
  if (has('scar')) { g.strokeStyle = '#8a2030'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + 44, cy - 62); g.lineTo(cx + 78, cy - 18); g.moveTo(cx + 52, cy - 44); g.lineTo(cx + 68, cy - 52); g.stroke(); }
  if (has('bandage')) { g.fillStyle = '#f3e2c4'; g.strokeStyle = INK_CSS; g.lineWidth = 3; g.beginPath(); g.roundRect(cx + 62, cy + 40, 52, 20, 8); g.fill(); g.stroke(); }
  if (c.glasses) {
    g.strokeStyle = c.outfit === 'suit' ? '#d4af6a' : INK_CSS;
    g.lineWidth = 5;
    g.fillStyle = 'rgba(190,220,255,.16)';
    for (const s of [-1, 1]) { g.beginPath(); g.roundRect(cx + s * 66 - 42, cy - 30, 84, 66, 18); g.fill(); g.stroke(); }
    g.beginPath();
    g.moveTo(cx - 24, cy);
    g.quadraticCurveTo(cx, cy - 8, cx + 24, cy);
    g.stroke();
  }
}

// ---------- geometria procedural ----------
const R = 0.4;
const HEAD_S = 0.46;
const HEAD_Y = 1.675;
const ball = (radius, width = 14, height = 10) => new THREE.SphereGeometry(radius, width, height);
const mesh = (geometry, material) => new THREE.Mesh(geometry, material);
const motionPreference = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

// Reúne malhas estáticas sem dependências de addons. Cada personagem possui os
// próprios recursos: setDim/dispose nunca afetam o personagem ao lado.
function combine(group, thickness = 0.004) {
  const batches = new Map();
  const outlines = [];
  for (const child of [...group.children]) {
    if (!child.isMesh) continue;
    child.updateMatrix();
    const source = child.geometry;
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    geometry.applyMatrix4(child.matrix);
    const list = batches.get(child.material) || [];
    list.push(geometry);
    batches.set(child.material, list);
    source.dispose();
    group.remove(child);
  }
  for (const [material, pieces] of batches) {
    const geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const size = name === 'uv' ? 2 : 3;
      const count = pieces.reduce((sum, item) => sum + item.attributes.position.count, 0);
      const values = new Float32Array(count * size);
      let offset = 0;
      for (const piece of pieces) {
        const data = piece.getAttribute(name);
        if (data) values.set(data.array, offset);
        offset += piece.attributes.position.count * size;
      }
      geometry.setAttribute(name, new THREE.BufferAttribute(values, size));
    }
    for (const piece of pieces) piece.dispose();
    geometry.computeBoundingSphere();
    const surface = mesh(geometry, material);
    if (thickness) {
      // Extrusão ao longo das normais mantém a espessura estável nas mechas,
      // lapelas e sapatos, sem ampliar a parte inteira em torno do centro.
      const positions = geometry.attributes.position;
      const normals = geometry.attributes.normal;
      const shellPositions = new Float32Array(positions.array.length);
      for (let i = 0; i < positions.count; i++) {
        shellPositions[i * 3] = positions.getX(i) + normals.getX(i) * thickness;
        shellPositions[i * 3 + 1] = positions.getY(i) + normals.getY(i) * thickness;
        shellPositions[i * 3 + 2] = positions.getZ(i) + normals.getZ(i) * thickness;
      }
      outlines.push(shellPositions);
    }
    group.add(surface);
  }
  if (outlines.length) {
    // Todas as cascas usam a mesma tinta. Um único desenho por pivô preserva
    // a extrusão e a animação, sem uma chamada extra por cor do uniforme.
    const positions = new Float32Array(outlines.reduce((sum, values) => sum + values.length, 0));
    let offset = 0;
    for (const values of outlines) { positions.set(values, offset); offset += values.length; }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    group.add(mesh(geometry, outlineMaterial));
  }
  return group;
}

function panel(points, z, material) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return at(mesh(new THREE.ShapeGeometry(shape), material), 0, 0, z);
}

// Superfície fechada de secções elípticas, usada em roupa, membros e mãos.
function loft(rings, sides = 12, pleats = false) {
  const positions = [], indices = [], uvs = [];
  rings.forEach(([y, rx, rz], j) => {
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * TAU;
      const fold = pleats && i % 2 ? 0.93 : 1;
      positions.push(Math.sin(a) * rx * fold, y, Math.cos(a) * rz * fold);
      uvs.push(i / sides, j / (rings.length - 1));
      if (j && i < sides) {
        const b = j * (sides + 1) + i, a0 = b - sides - 1;
        indices.push(a0, a0 + 1, b, b, a0 + 1, b + 1);
      }
    }
  });
  const bottom = positions.length / 3;
  positions.push(0, rings[0][0], 0, 0, rings[rings.length - 1][0], 0);
  uvs.push(0.5, 0.5, 0.5, 0.5);
  for (let i = 0; i < sides; i++) {
    const top = (rings.length - 1) * (sides + 1);
    indices.push(bottom, i + 1, i, bottom + 1, top + i, top + i + 1);
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}

// Mecha com nervura central, secção elíptica e ponta afilada, ao longo de uma curva.
function lock(points, width, depth = width * 0.35, steps = 7) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const positions = [], indices = [], uvs = [];
  const sides = 6;
  for (let j = 0; j <= steps; j++) {
    const t = j / steps;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const axis = Math.abs(tangent.z) > 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const across = new THREE.Vector3().crossVectors(tangent, axis).normalize();
    const normal = new THREE.Vector3().crossVectors(across, tangent).normalize();
    const taper = Math.max(0.025, Math.sin((0.24 + 0.76 * t) * Math.PI) ** 0.7);
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * TAU;
      const point = center.clone().addScaledVector(across, Math.cos(a) * width * taper)
        .addScaledVector(normal, Math.sin(a) * depth * taper);
      positions.push(point.x, point.y, point.z);
      uvs.push(i / sides, t);
      if (j && i < sides) {
        const b = j * (sides + 1) + i, a0 = b - sides - 1;
        indices.push(a0, b, a0 + 1, b, b + 1, a0 + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ---------- cabelo ----------
function buildHair(c) {
  const group = new THREE.Group();
  const hair = toon(c.hair);
  const dark = toon(c.hairLo);
  const highlight = toon(new THREE.Color(c.hair).lerp(new THREE.Color(c.hairHi), 0.35));
  const tie = toon(c.tie);
  const style = c.style;
  const longish = ['long', 'hime', 'wavy'].includes(style);
  const addLock = (points, width, material = hair, depth) => group.add(mesh(lock(points, width, depth), material));
  const cap = mesh(new THREE.SphereGeometry(R + 0.025, 22, 13, 0.39 * TAU, 0.72 * TAU, 0, Math.PI * 0.72), dark);
  cap.scale.set(1, 1.04, 0.94);
  group.add(cap);
  const crown = mesh(new THREE.SphereGeometry(R + 0.038, 22, 8, 0, TAU, 0, Math.PI * 0.32), hair);
  crown.scale.z = 0.96;
  group.add(crown);

  // Múltiplas mechas varrem o topo em vez de formar um capacete de cones.
  const fringeCount = { fade: 3, short: 5, slick: 5, curly: 5, hime: 7, bangs: 7 }[style] || 7;
  for (let i = 0; i < fringeCount; i++) {
    const f = i / (fringeCount - 1) * 2 - 1;
    const x = f * 0.31;
    const sweep = ['side', 'slick'].includes(style) ? 0.12 : f * 0.025;
    const endY = { fade: 0.2, short: 0.12, slick: 0.23, spiky: 0.1, hime: 0.09, bangs: 0.06, curly: 0.16 }[style] ?? (0.045 + Math.abs(f) * 0.035 + (i % 2) * 0.045);
    addLock([[x * 0.65 - sweep, 0.37, 0.11], [x - sweep * 0.4, 0.28, 0.34],
      [x + sweep * 0.4, 0.17, 0.405 - Math.abs(f) * 0.065], [x + sweep, endY, 0.405 - Math.abs(f) * 0.085]],
      style === 'slick' ? 0.08 : 0.087, i % 3 === 1 ? highlight : hair, 0.027);
  }

  for (const side of [-1, 1]) {
    const end = longish ? -0.84 : style === 'bob' || style === 'hime' ? -0.49 : ['fade', 'short', 'slick', 'spiky'].includes(style) ? -0.04 : -0.28;
    addLock([[side * 0.24, 0.31, 0.1], [side * 0.39, 0.12, 0.07], [side * 0.395, -0.1, 0.13],
      [side * (longish ? 0.33 : 0.34), end, 0.13]], longish ? 0.085 : 0.07);
    if (!['fade', 'short', 'slick'].includes(style)) addLock([[side * 0.27, 0.25, -0.14],
      [side * 0.41, 0.02, -0.1], [side * 0.43, end * 0.62, -0.035], [side * 0.37, end - 0.055, 0.03]], 0.075, dark);
  }

  if (longish || style === 'bob' || style === 'bangs') {
    const length = longish ? 1.2 : style === 'bob' ? 0.56 : 0.38;
    for (let i = 0; i < 7; i++) {
      const f = i / 6 * 2 - 1;
      const wave = style === 'wavy' ? Math.sin(i * 2.3) * 0.1 : 0;
      addLock([[f * 0.26, 0.22, -0.29], [f * 0.36, -0.13, -0.34],
        [f * 0.36 + wave, -length * 0.66, -0.3], [f * 0.32 - wave, -length, -0.24]],
        0.095, i % 3 === 1 ? highlight : hair, 0.05);
    }
  }
  if (style === 'spiky' || style === 'messy') {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU;
      const radius = style === 'spiky' ? 0.58 : 0.5;
      const x = Math.sin(a), z = Math.cos(a);
      addLock([[x * 0.22, 0.26, z * 0.22], [x * 0.35, 0.38, z * 0.31],
        [x * radius, 0.44 + (i % 2) * 0.08, z * radius * 0.7]], 0.1, i % 3 ? hair : highlight, 0.045);
    }
  }
  if (style === 'curly') {
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU;
      const puff = mesh(ball(0.13, 10, 7), i % 3 === 1 ? highlight : hair);
      puff.scale.set(1, 0.95, 0.8);
      group.add(at(puff, Math.sin(a) * 0.37, 0.21 + (i % 2) * 0.12, Math.cos(a) * 0.36 - 0.025));
    }
    group.add(at(mesh(ball(0.17, 12, 8), hair), 0, 0.42, -0.03));
  }
  if (style === 'bun') {
    const bun = mesh(ball(0.18, 16, 10), hair);
    bun.scale.set(1.05, 0.85, 0.9);
    group.add(at(bun, 0, 0.44, -0.22));
    for (let i = -1; i <= 1; i++) addLock([[i * 0.08, 0.49, -0.09], [i * 0.14, 0.57, -0.22], [i * 0.08, 0.44, -0.36]], 0.045, highlight, 0.014);
  }
  if (style === 'ponytail' || style === 'twintails') {
    const sides = style === 'twintails' ? [-1, 1] : [0];
    for (const side of sides) {
      const x = side * 0.4, z = side ? -0.08 : -0.4;
      group.add(at(mesh(ball(0.064, 10, 6), tie), x, 0.14, z));
      for (let i = -1; i <= 1; i++) addLock([[x + i * 0.035, 0.13, z],
        [x + side * 0.17 + i * 0.055, -0.12, z - 0.16],
        [x + side * 0.2 + i * 0.055, -0.6, z - 0.15],
        [x + side * 0.12 + i * 0.03, -0.94 + Math.abs(i) * 0.09, z - 0.05]], 0.077, i ? hair : highlight, 0.045);
    }
  }
  if (style === 'braid') {
    addLock([[0.27, 0.16, -0.12], [0.37, -0.17, 0.02], [0.37, -0.81, 0.14]], 0.09, dark);
    for (let i = 0; i < 6; i++) {
      const braid = mesh(ball(0.07 - i * 0.004, 10, 7), i % 2 ? highlight : hair);
      braid.scale.set(0.85, 1.1, 0.75);
      braid.rotation.z = i % 2 ? 0.45 : -0.45;
      group.add(at(braid, 0.37 + (i % 2 ? 0.025 : -0.025), -0.23 - i * 0.105, 0.08 + i * 0.012));
    }
    group.add(at(mesh(ball(0.043, 8, 6), tie), 0.37, -0.85, 0.16));
  }
  if (c.acc?.includes('bow')) {
    const ribbon = toon(0xf6f0e3);
    for (const side of [-1, 1]) {
      const wing = mesh(loft([[-0.1, 0.11, 0.035], [0.06, 0.025, 0.025]], 4), ribbon);
      wing.rotation.z = side * Math.PI / 2;
      group.add(at(wing, side * 0.11, 0.29, -0.41));
    }
    group.add(at(mesh(ball(0.045, 8, 6), ribbon), 0, 0.29, -0.41));
  }
  if (c.acc?.includes('hairpin')) {
    for (let i = 0; i < 2; i++) {
      const pin = mesh(new THREE.BoxGeometry(0.13, 0.018, 0.02), tie);
      pin.rotation.set(0, -0.5, 0.45);
      group.add(at(pin, -0.26, 0.19 + i * 0.045, 0.33));
    }
  }
  if (c.acc?.includes('earring')) {
    const gold = toon(0xe5bf6e);
    for (const side of [-1, 1]) group.add(at(mesh(new THREE.TorusGeometry(0.034, 0.01, 5, 10), gold), side * 0.39, -0.15, 0.03));
  }
  if (!group.children.some(child => child.material === tie)) tie.dispose();
  return combine(group, 0.006);
}

// ---------- corpo e uniforme ----------
function buildBody(c) {
  const body = new THREE.Group();
  const skin = toon(c.skin);
  const skinShade = toon(c.shade);
  const white = toon(0xf4f0e8);
  const colors = { labcoat: ['#e8e7e1', '#fffaf0'], council: ['#e0d8cb', '#f7f0df'], suit: [c.cloth, c.cloth2], blazer: [c.cloth, c.cloth2] };
  const [shadowColor, mainColor] = colors[c.outfit] || colors.blazer;
  const cloth = toon(mainColor);
  const clothShade = toon(shadowColor);
  const trim = toon(c.outfit === 'council' ? '#d4af6a' : c.trim);
  const tie = toon(c.tie);
  const gold = toon(0xd6b46b);
  const lower = toon(c.outfit === 'labcoat' ? '#2a2f45' : c.outfit === 'suit' ? '#1c1b2b' : '#20212d');
  const shoe = toon(0x171622);
  const sole = toon(0x0c0d14);
  const mat = { skin, skinShade, white, cloth, clothShade, trim, tie, gold, lower, shoe, sole };
  const skirt = c.fem && c.outfit !== 'labcoat';

  body.add(mesh(loft([[0.91, 0.17, 0.105], [1.02, 0.15, 0.095], [1.18, 0.165, 0.10],
    [1.37, 0.205, 0.105], [1.43, 0.14, 0.077]], 12), cloth));
  body.add(at(mesh(new THREE.CylinderGeometry(0.055, 0.063, 0.14, 10), skin), 0, 1.46, 0));
  // Camisa triangular, colarinho, lapelas com debrum e gravata com ponta.
  body.add(panel([[-0.085, 1.425], [0.085, 1.425], [0.038, 1.17], [-0.038, 1.17]], 0.11, white));
  for (const side of [-1, 1]) {
    body.add(panel([[side * 0.078, 1.435], [side * 0.155, 1.37], [side * 0.095, 1.285],
      [side * 0.115, 1.265], [side * 0.025, 1.12], [side * 0.05, 1.30]], 0.12, trim));
    body.add(panel([[side * 0.08, 1.42], [side * 0.14, 1.368], [side * 0.082, 1.285],
      [side * 0.10, 1.263], [side * 0.031, 1.145], [side * 0.063, 1.30]], 0.123, clothShade));
    body.add(panel([[side * 0.015, 1.43], [side * 0.07, 1.43], [side * 0.047, 1.355]], 0.13, white));
    body.add(at(mesh(new THREE.BoxGeometry(0.066, 0.009, 0.008), trim), side * 0.105, 1.04, 0.101));
  }
  if (c.fem && c.outfit !== 'labcoat') {
    for (const side of [-1, 1]) body.add(panel([[side * 0.012, 1.374], [side * 0.075, 1.4],
      [side * 0.067, 1.338]], 0.139, tie));
    body.add(at(mesh(ball(0.018, 8, 6), tie), 0, 1.371, 0.142));
    body.add(panel([[-0.011, 1.36], [-0.025, 1.30], [0, 1.315], [0.025, 1.30], [0.011, 1.36]], 0.133, tie));
  } else {
    body.add(panel([[-0.021, 1.389], [0.021, 1.389], [0.015, 1.355], [0, 1.343], [-0.015, 1.355]], 0.14, tie));
    body.add(panel([[-0.012, 1.35], [0.012, 1.35], [0.025, 1.195], [0, 1.17], [-0.025, 1.195]], 0.135, tie));
  }
  for (const y of [1.1, 1.015, 0.95]) body.add(at(mesh(ball(0.01, 8, 6), gold), 0.012, y, 0.109));
  body.add(panel([[0.095, 1.33], [0.135, 1.33], [0.133, 1.295], [0.115, 1.282], [0.097, 1.295]], 0.117, gold));
  body.add(panel([[0.103, 1.323], [0.127, 1.323], [0.125, 1.298], [0.115, 1.291], [0.105, 1.298]], 0.12, tie));

  if (c.outfit === 'labcoat' || c.outfit === 'council') {
    body.add(mesh(loft([[0.68, 0.225, 0.135], [0.91, 0.17, 0.107]], 12), cloth));
    body.add(at(mesh(new THREE.BoxGeometry(0.008, 0.23, 0.006), clothShade), 0, 0.795, 0.132));
    for (const side of [-1, 1]) body.add(at(mesh(new THREE.BoxGeometry(0.07, 0.01, 0.006), trim), side * 0.12, 0.83, 0.116));
  }
  if (skirt) body.add(mesh(loft([[0.72, 0.235, 0.145], [0.91, 0.17, 0.105], [0.96, 0.16, 0.10]], 24, true), lower));
  else body.add(mesh(loft([[0.83, 0.145, 0.09], [0.98, 0.157, 0.10]], 12), lower));

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.084, 0.94, 0);
    if (skirt) {
      leg.add(mesh(loft([[-0.57, 0.042, 0.046], [-0.43, 0.05, 0.054], [-0.18, 0.06, 0.061], [0, 0.067, 0.066]], 10), skin));
      leg.add(mesh(loft([[-0.84, 0.038, 0.041], [-0.56, 0.045, 0.049]], 10), lower));
      leg.add(mesh(loft([[-0.58, 0.046, 0.05], [-0.55, 0.046, 0.05]], 10), sole));
    } else {
      leg.add(mesh(loft([[-0.84, 0.046, 0.049], [-0.47, 0.057, 0.06], [-0.38, 0.056, 0.058], [0, 0.075, 0.075]], 10), lower));
    }
    const foot = mesh(ball(1, 12, 8), shoe);
    foot.scale.set(0.058, 0.046, 0.112);
    leg.add(at(foot, 0, -0.867, 0.045));
    const outsole = mesh(new THREE.BoxGeometry(0.111, 0.025, 0.18), sole);
    leg.add(at(outsole, 0, -0.908, 0.04));
    const strap = mesh(new THREE.BoxGeometry(0.088, 0.013, 0.026), skirt ? lower : shoe);
    leg.add(at(strap, 0, -0.825, 0.06));
    body.add(combine(leg, 0.0025));
    legs.push(leg);
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.205, 1.375, 0);
    arm.rotation.z = side * 0.08;
    arm.add(mesh(loft([[-0.405, 0.045, 0.047], [-0.24, 0.052, 0.055], [-0.18, 0.054, 0.057], [-0.025, 0.073, 0.073], [0.025, 0.042, 0.049]], 10), cloth));
    arm.add(mesh(loft([[-0.419, 0.044, 0.045], [-0.397, 0.047, 0.048]], 10), trim));
    arm.add(mesh(loft([[-0.51, 0.029, 0.023], [-0.47, 0.038, 0.026], [-0.424, 0.031, 0.027]], 10), skin));
    const thumb = mesh(new THREE.CapsuleGeometry(0.012, 0.03, 2, 6), skin);
    thumb.rotation.z = side * -0.5;
    arm.add(at(thumb, side * -0.033, -0.452, 0.018));
    for (const y of [-0.364, -0.388]) arm.add(at(mesh(ball(0.006, 6, 5), gold), side * 0.044, y, 0.012));
    body.add(combine(arm, 0.0025));
    arms.push(arm);
  }
  if (c.acc?.includes('headphones')) {
    const ring = mesh(new THREE.TorusGeometry(0.083, 0.016, 6, 16), lower);
    ring.rotation.x = Math.PI / 2.2;
    body.add(at(ring, 0, 1.445, 0.025));
    for (const side of [-1, 1]) body.add(at(mesh(new THREE.BoxGeometry(0.035, 0.06, 0.045), tie), side * 0.082, 1.415, 0.045));
  }
  combine(body, 0.003);
  // Alguns trajes não usam todas as cores; descarte materiais nunca associados.
  const used = new Set();
  body.traverse(object => { if (object.isMesh) used.add(object.material); });
  for (const material of Object.values(mat)) if (!used.has(material)) material.dispose();
  return { body, legs, arms };
}

/** Personagem de pé (~1,9 m), olhando para +Z; contrato público preservado. */
export function createCharacter(c, expression = 'neutral') {
  const group = new THREE.Group();
  const { body, legs, arms } = buildBody(c);
  group.add(body);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  drawFace(canvas, c, expression);
  const face = new THREE.CanvasTexture(canvas);
  face.colorSpace = THREE.SRGBColorSpace;
  face.anisotropy = 4;
  const head = new THREE.Group();
  head.scale.setScalar(HEAD_S);
  head.position.y = HEAD_Y;
  const geometry = new THREE.SphereGeometry(R, 28, 20);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i) / R;
    const jaw = y < -0.05 ? 0.7 + 0.3 * (y + 1) / 0.95 : 1;
    positions.setXYZ(i, positions.getX(i) * jaw * 0.94, positions.getY(i) * 1.07, positions.getZ(i) * 0.91);
  }
  geometry.computeVertexNormals();
  head.add(mesh(geometry, toon(0xffffff, { map: face })));
  const earMaterial = toon(c.skin);
  for (const side of [-1, 1]) {
    const ear = mesh(ball(0.07, 10, 7), earMaterial);
    ear.scale.set(0.5, 1, 0.6);
    head.add(at(ear, side * 0.365, -0.065, 0));
  }
  combine(head, 0.006);
  head.add(buildHair(c));
  group.add(head);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext('2d');
  const fade = shadowContext.createRadialGradient(32, 32, 3, 32, 32, 31);
  fade.addColorStop(0, 'rgba(12,10,25,0.38)');
  fade.addColorStop(0.45, 'rgba(12,10,25,0.2)');
  fade.addColorStop(1, 'rgba(12,10,25,0)');
  shadowContext.fillStyle = fade;
  shadowContext.fillRect(0, 0, 64, 64);
  const shadowMap = new THREE.CanvasTexture(shadowCanvas);
  const shadow = mesh(new THREE.PlaneGeometry(0.69, 0.49), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  const tints = [];
  const tintMaterials = new Set();
  group.traverse(object => {
    if (object.isMesh && object.material !== outlineMaterial && object !== shadow && !tintMaterials.has(object.material)) {
      tintMaterials.add(object.material);
      tints.push({ material: object.material, base: object.material.color.clone() });
    }
  });
  let current = expression;
  let phase = Math.random() * TAU;
  let stride = 0;
  let disposed = false;
  return {
    group, head,
    setExpression(next) {
      if (next === current || disposed) return;
      current = next;
      drawFace(canvas, c, next);
      face.needsUpdate = true;
    },
    setDim(amount) {
      const factor = Number.isFinite(amount) ? Math.max(0, 1 - amount) : 1;
      for (const { material, base } of tints) material.color.copy(base).multiplyScalar(factor);
    },
    update(dt, moving = false) {
      if (disposed) return;
      dt = Math.min(0.1, Math.max(0, dt));
      const reduced = motionPreference?.matches;
      phase += dt * (moving ? 10 : 1.7);
      stride += ((moving ? 1 : 0) - stride) * Math.min(1, dt * 10);
      const swing = Math.sin(phase) * (reduced ? 0.16 : 0.42) * stride;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.7;
      arms[1].rotation.x = swing * 0.7;
      body.position.y = reduced ? 0 : Math.abs(Math.sin(phase)) * 0.012 * stride;
      head.position.y = HEAD_Y + body.position.y + (reduced ? 0 : Math.sin(phase) * 0.003 * (1 - stride));
      head.rotation.z = reduced ? 0 : Math.sin(phase * 0.5) * 0.01 * (1 - stride);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set(), materials = new Set();
      group.traverse(object => {
        if (!object.isMesh) return;
        geometries.add(object.geometry);
        if (object.material !== outlineMaterial) materials.add(object.material);
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      face.dispose();
      shadowMap.dispose();
    },
  };
}
