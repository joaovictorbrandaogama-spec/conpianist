// O campus em 3D: mapa caminhável com os prédios, a turma espalhada pelo pátio,
// minimapa e interação (entrar nos prédios, conversar com os alunos).
import * as THREE from 'three';
import { toon, part, label, createCharacter } from './models.js';
import { CAST, lookOf } from '../art/characters.js';
import { buildSchool, buildDorm, buildMall } from './interiors.js';

const TAU = Math.PI * 2;
const at = (object, x, y, z) => { object.position.set(x, y, z); return object; };

// Materiais que mudam entre tarde e noite (janelas e postes), preenchidos por buildCampus.
let WINDOWS = [];
let LAMPS = [];

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Prédios do campus: centro, tamanho (largura, altura, profundidade) e a porta (onde se entra).
export const SITES = {
  sala: { name: 'Sala de aula', x: 0, z: -30, w: 30, h: 9, d: 10, door: [0, -22.6], color: '#ff3355' },
  exames: { name: 'Prédio de Exames', x: 27, z: -17, w: 12, h: 8, d: 10, door: [27, -10], color: '#e8173f' },
  conselho: { name: 'Conselho Estudantil', x: -27, z: -17, w: 12, h: 8, d: 10, door: [-27, -10], color: '#ffc93c' },
  info: { name: 'Sala de Informática', x: 31, z: 6, w: 10, h: 7, d: 12, door: [24, 6], color: '#4fc8ff' },
  biblio: { name: 'Biblioteca', x: -31, z: 6, w: 10, h: 7, d: 12, door: [-24, 6], color: '#c98f6e' },
  lab404: { name: 'Laboratório 404', x: 26, z: 25, w: 9, h: 5, d: 8, door: [19.5, 25], color: '#ff9f6b' },
  galeria: { name: 'Galeria Jacarandá', x: -26, z: 25, w: 8, h: 5, d: 14, door: [-17, 25], color: '#5eea9a' },
  dorm: { name: 'Dormitório', x: 15, z: 39, w: 10, h: 14, d: 8, door: [15, 33], color: '#b9a2ff' },
};
const BOUNDS = { minX: -39, maxX: 39, minZ: -38, maxZ: 45.5 };
const GATE_Z = 47;

// ---------- texturas ----------
function windowTexture(cols, rows, wall, seed, lit = 0.55, glow = '#ffd98a') {
  const size = 512;
  const make = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const base = make();
  const emit = make();
  const g = base.getContext('2d');
  const e = emit.getContext('2d');
  const r = rng(seed);
  g.fillStyle = wall;
  g.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 16) {
    g.fillStyle = 'rgba(40,60,90,.05)'; g.fillRect(0, y, size, 1);
    for (let x = (y / 16) % 2 ? 0 : 24; x < size; x += 48) { g.fillStyle = 'rgba(40,60,90,.04)'; g.fillRect(x, y, 1, 16); }
  }
  for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(30,45,70,.06)'; g.fillRect(r() * size, r() * size, 2, 2); }
  e.fillStyle = '#000';
  e.fillRect(0, 0, size, size);
  const cw = size / cols;
  const ch = size / rows;
  for (let j = 0; j < rows; j++) {
    // Frisos, peitoris e montantes continuam nítidos sem multiplicar malhas.
    g.fillStyle = 'rgba(255,255,255,.26)';
    g.fillRect(0, j * ch + ch * 0.84, size, ch * 0.05);
    g.fillStyle = 'rgba(30,48,74,.16)';
    g.fillRect(0, j * ch + ch * 0.89, size, ch * 0.025);
    for (let i = 0; i < cols; i++) {
      const on = r() < lit;
      const x = i * cw + cw * 0.18;
      const y = j * ch + ch * 0.2;
      const w = cw * 0.64;
      const h = ch * 0.57;
      g.fillStyle = '#f4f7fb';
      g.fillRect(x - 2, y - 2, w + 4, h + 5);
      const glass = g.createLinearGradient(x, y, x + w, y + h);
      glass.addColorStop(0, '#9fd2f5');
      glass.addColorStop(0.48, '#4f8fc7');
      glass.addColorStop(1, '#27507e');
      g.fillStyle = glass;
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(208,232,247,.22)';
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x + w * 0.65, y); g.lineTo(x, y + h * 0.8); g.fill();
      if (on) {
        e.fillStyle = r() < 0.2 ? '#bedfff' : glow;
        e.fillRect(x, y, w, h);
        e.fillStyle = 'rgba(0,0,0,.25)';
        e.fillRect(x + w * 0.12, y, w * 0.18, h);
      }
      for (const ctx of [g, e]) {
        ctx.fillStyle = ctx === g ? '#e8eef5' : '#000';
        ctx.fillRect(x + w * 0.47, y, Math.max(1, w * 0.055), h);
        ctx.fillRect(x, y + h * 0.28, w, Math.max(1, h * 0.045));
      }
    }
  }
  const map = new THREE.CanvasTexture(base);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(emit);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

export function skyTexture(stops = [[0, '#1f6fd1'], [0.42, '#4b9ff0'], [0.78, '#9fd3fa'], [1, '#e2f3ff']], { sun = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d');
  const gradient = g.createLinearGradient(0, 0, 0, 512);
  for (const [stop, color] of stops) gradient.addColorStop(stop, color);
  g.fillStyle = gradient;
  g.fillRect(0, 0, 512, 512);
  const night = new THREE.Color(stops[stops.length - 1][1]).getHSL({}).l < 0.3;
  const random = rng(204);
  if (night) {
    const moon = g.createRadialGradient(392, 118, 4, 392, 118, 70);
    moon.addColorStop(0, 'rgba(235,244,255,.55)');
    moon.addColorStop(1, 'rgba(235,244,255,0)');
    g.fillStyle = moon; g.fillRect(320, 46, 144, 144);
    g.fillStyle = '#eef5ff'; g.beginPath(); g.arc(392, 118, 17, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(160,180,210,.45)'; g.beginPath(); g.arc(386, 113, 4, 0, Math.PI * 2); g.arc(398, 124, 3, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 65; i++) {
      const x = random() * 512, y = random() * 300;
      g.fillStyle = `rgba(220,233,255,${0.2 + random() * 0.55})`;
      g.fillRect(x, y, i % 7 ? 1 : 2, i % 7 ? 1 : 2);
    }
  } else {
    // Nuvens pintadas no fundo, sem partículas ou texturas remotas.
    if (sun) {
      const glow = g.createRadialGradient(90, 120, 6, 90, 120, 120);
      glow.addColorStop(0, 'rgba(255,252,236,.9)');
      glow.addColorStop(0.18, 'rgba(255,250,230,.5)');
      glow.addColorStop(1, 'rgba(255,250,230,0)');
      g.fillStyle = glow; g.fillRect(0, 0, 220, 250);
    }
    // Cúmulos: grupos de bolhas brancas com base achatada e sombra azulada embaixo.
    for (let i = 0; i < 9; i++) {
      const cx = random() * 600 - 40, cy = 120 + random() * 210, width = 50 + random() * 70;
      for (let k = 0; k < 7; k++) {
        const x = cx + (k / 6 - 0.5) * width * 1.6, y = cy - Math.sin((k / 6) * Math.PI) * width * 0.32, rad = width * (0.28 + random() * 0.18);
        const puff = g.createRadialGradient(x, y, 1, x, y, rad);
        puff.addColorStop(0, 'rgba(255,255,255,.9)');
        puff.addColorStop(0.6, 'rgba(255,255,255,.45)');
        puff.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.translate(x, y); g.scale(1.25, 0.62); g.translate(-x, -y);
        g.fillStyle = puff; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore();
      }
      g.fillStyle = 'rgba(120,160,210,.10)';
      g.fillRect(cx - width * 0.8, cy + width * 0.06, width * 1.6, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function pavingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  const r = rng(79);
  g.fillStyle = '#93a0ad'; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
    const x = col * 85.33 + (row % 2 ? 42.66 : 0);
    const tone = 172 + Math.floor(r() * 16);
    g.fillStyle = `rgb(${tone - 4},${tone + 4},${tone + 12})`;
    g.fillRect(x + 1, row * 32 + 1, 83.33, 30);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x + 2, row * 32 + 1, 81, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Gramado cortado em faixas, com manchas suaves (repetido em tiles pelo chão).
function lawnTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  const r = rng(91);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#679f70' : '#79b380'; g.fillRect(0, i * 32, 256, 32); }
  for (let i = 0; i < 900; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() < 0.5 ? 'rgba(46,96,62,.16)' : 'rgba(214,246,206,.14)';
    g.fillRect(x, y, 1 + r() * 2, 2 + r() * 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Água do mar em volta da ilha: ondinhas claras sobre azul.
function seaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  const r = rng(53);
  g.fillStyle = '#2f86c9'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    const x = r() * 256, y = r() * 256, w = 6 + r() * 18;
    g.fillStyle = `rgba(214,240,255,${0.18 + r() * 0.3})`;
    g.fillRect(x, y, w, 1.5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Uma única geometria e chamada de desenho para cada conjunto de peças repetidas.
function instances(geometry, material, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach(({ p, s = [1, 1, 1], r = [0, 0, 0], color }, i) => {
    dummy.position.set(...p); dummy.scale.set(...s); dummy.rotation.set(...r); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (color !== undefined) mesh.setColorAt(i, new THREE.Color(color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function crestTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.translate(128, 118);
  g.scale(1.7, 1.7);
  g.lineJoin = g.lineCap = 'round';
  g.fillStyle = '#0b1a33';
  g.strokeStyle = '#3aa3ff';
  g.lineWidth = 6;
  const shield = new Path2D('M0-46 40-30V8C40 34 20 52 0 62-20 52-40 34-40 8V-30Z');
  g.fill(shield);
  g.stroke(shield);
  g.strokeStyle = '#f5f2ea';
  g.lineWidth = 8;
  g.stroke(new Path2D('M-12-20H8a14 14 0 0 1 0 28H-4V34'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------- peças do cenário ----------
function block(w, h, d, wall, seed, { cols = 6, rows = 3, lit = 0.55, glow, roof = 0x2a3f5e } = {}) {
  const tex = windowTexture(cols, rows, wall, seed, lit, glow);
  const side = toon(0xffffff, { map: tex.map, emissive: 0xffffff, emissiveMap: tex.emissiveMap, emissiveIntensity: 0.08 });
  WINDOWS.push(side);
  const top = toon(roof);
  const mesh = part(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side], 0);
  mesh.position.y = h / 2;
  const group = new THREE.Group();
  group.add(mesh);
  group.add(at(part(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5), top, 0), 0, h + 0.17, 0));
  const trim = [];
  for (const y of [0.25, h - 0.18]) trim.push({ p: [0, y, 0], s: [w + 0.12, 0.26, d + 0.12] });
  for (const x of [-w / 2 + 0.16, w / 2 - 0.16]) for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) {
    trim.push({ p: [x, h / 2, z], s: [0.32, h, 0.28] });
  }
  group.add(instances(new THREE.BoxGeometry(1, 1, 1), toon(0xf3f6fa), trim));
  group.add(at(part(new THREE.BoxGeometry(w + 0.36, 0.55, d + 0.36), toon(0x9aa8ba), 0.01), 0, 0.27, 0));
  return group;
}

function grove(spots, random) {
  const group = new THREE.Group();
  const trunks = [], crowns = [], branches = [];
  const leaf = [0x4f9e62, 0x6bbf78, 0x86d08f, 0x5aae70];
  const jacaranda = [0x8b9fdc, 0xa2b3e6, 0xb9c6ee, 0x95a8e0];
  spots.forEach(([x, z], index) => {
    const size = 0.9 + random() * 0.5;
    trunks.push({ p: [x, 1.25 * size, z], s: [size, size, size] });
    for (const side of [-1, 1]) branches.push({ p: [x + side * 0.38 * size, 2.1 * size, z], s: [0.13 * size, 1.1 * size, 0.13 * size], r: [0, 0, side * -0.5] });
    [[0, 3.4, 0, 1.65], [-1.05, 3, 0.3, 1.25], [1, 3.15, -0.3, 1.3], [0.15, 4.25, 0.12, 1.05], [-0.15, 3.4, 1.05, 1.15], [0.35, 3.5, -1, 1.15]].forEach(([px, py, pz, radius], i) => {
      const palette = index % 4 === 1 ? jacaranda : leaf;
      crowns.push({ p: [x + px * size, py * size, z + pz * size], s: [radius * size, radius * size * 0.75, radius * size], r: [0, index * 1.7 + i, 0], color: palette[i % palette.length] });
    });
  });
  const bark = toon(0x5d4a3c);
  group.add(instances(new THREE.CylinderGeometry(0.18, 0.29, 2.5, 7), bark, trunks));
  group.add(instances(new THREE.CylinderGeometry(0.7, 1, 1, 6), bark, branches));
  const crownMesh = instances(new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), crowns);
  group.add(crownMesh);
  const dummy = new THREE.Object3D();
  group.userData.sway = (t) => {
    crowns.forEach(({ p, s, r }, i) => {
      const k = Math.sin(t * 1.1 + p[0] * 0.3 + p[2] * 0.2) * 0.05 * s[0];
      dummy.position.set(p[0] + k, p[1], p[2] + k * 0.4);
      dummy.scale.set(...s);
      dummy.rotation.set(r[0], r[1], r[2] + k * 0.05);
      dummy.updateMatrix();
      crownMesh.setMatrixAt(i, dummy.matrix);
    });
    crownMesh.instanceMatrix.needsUpdate = true;
  };
  return group;
}

function lamp(x, z) {
  const group = new THREE.Group();
  const metal = toon(0x34445e);
  group.add(at(part(new THREE.CylinderGeometry(0.07, 0.11, 3.4, 8), metal, 0), 0, 1.7, 0));
  group.add(at(part(new THREE.CylinderGeometry(0.22, 0.3, 0.22, 8), metal, 0), 0, 0.11, 0));
  group.add(at(part(new THREE.ConeGeometry(0.46, 0.18, 8), metal, 0), 0, 3.78, 0));
  group.add(at(part(new THREE.CylinderGeometry(0.31, 0.2, 0.12, 8), metal, 0), 0, 3.23, 0));
  group.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe6a8 })), 0, 3.5, 0));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(2.8, 2.8, 1);
  halo.position.y = 3.5;
  group.add(halo);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffc56e, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.05;
  group.add(pool);
  halo.material.userData.nightOpacity = 0.42;
  pool.material.userData.nightOpacity = 0.28;
  LAMPS.push(halo.material, pool.material);
  group.position.set(x, 0, z);
  return group;
}

/** Monta o campus. Devolve o grupo, os obstáculos (caixas) e o que precisa de animação. */
let glowCache = null;
function glowTexture() {
  if (glowCache) return glowCache;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowCache = new THREE.CanvasTexture(canvas);
  return glowCache;
}

export function buildCampus() {
  WINDOWS = [];
  LAMPS = [];
  const group = new THREE.Group();
  const colliders = [];
  const animated = [];
  const dark = toon(0x26354f);
  const cream = toon(0xf5f2ea);
  const red = toon(0x2f6fc7);           // destaque da Academia (era carmim)
  const warm = new THREE.MeshBasicMaterial({ color: 0xdff1ff });

  // chão, praça e caminhos
  const lawn = lawnTexture();
  const groundGeometry = new THREE.CircleGeometry(78, 72);
  const groundUV = groundGeometry.attributes.uv;
  for (let i = 0; i < groundUV.count; i++) groundUV.setXY(i, groundUV.getX(i) * 40, groundUV.getY(i) * 40);
  const ground = new THREE.Mesh(groundGeometry, toon(0xffffff, { map: lawn }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 4;
  group.add(ground);
  const beach = new THREE.Mesh(new THREE.RingGeometry(77.5, 86, 72), toon(0xf1e7cf));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, -0.02, 4);
  group.add(beach);
  const seaMap = seaTexture();
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), toon(0xffffff, { map: seaMap }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.12;
  group.add(sea);
  animated.push((t) => { seaMap.offset.set(t * 0.004, t * 0.0025); });
  const foam = new THREE.Mesh(new THREE.RingGeometry(85.4, 87.6, 72), toon(0xffffff, { transparent: true, opacity: 0.4, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, -0.06, 4);
  group.add(foam);
  animated.push((t) => { foam.material.opacity = 0.28 + Math.sin(t * 0.9) * 0.14; foam.scale.setScalar(1 + Math.sin(t * 0.9) * 0.004); });
  // farol na praia (fora da cerca): torre branca com faixas azuis e luz que gira
  const lighthouse = new THREE.Group();
  lighthouse.add(at(part(new THREE.CylinderGeometry(1.1, 1.6, 9, 16), toon(0xf4f7fb), 0.02), 0, 4.5, 0));
  for (const y of [2.4, 5.4]) lighthouse.add(at(part(new THREE.CylinderGeometry(1.36 - y * 0.03, 1.42 - y * 0.03, 1, 16), toon(0x2f6fc7), 0), 0, y, 0));
  lighthouse.add(at(part(new THREE.CylinderGeometry(1.35, 1.35, 0.3, 16), toon(0x26354f), 0), 0, 9.1, 0));
  lighthouse.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.1, 12), new THREE.MeshBasicMaterial({ color: 0xfff3c4 })), 0, 9.8, 0));
  lighthouse.add(at(part(new THREE.ConeGeometry(1.0, 1.2, 12), toon(0x26354f), 0), 0, 10.9, 0));
  const fadeMap = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4; canvas.height = 128;
    const g = canvas.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#555555'); grad.addColorStop(1, '#000000');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(canvas);
  })();
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 26, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1c0, map: fadeMap, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 13;
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 9.8;
  beamPivot.add(beam);
  lighthouse.add(beamPivot);
  beam.material.userData.nightOpacity = 0.35;
  LAMPS.push(beam.material);
  // gaivotas circulando alto sobre o campus (uma chamada de desenho, batendo as asas)
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, -0.9, 0.18, 0, 0, 0, -0.12, 0, 0, 0.25, 0.9, 0.18, 0, 0, 0, -0.12], 3));
  wing.computeVertexNormals();
  const gulls = new THREE.InstancedMesh(wing, toon(0xf4f7fb, { side: THREE.DoubleSide }), 7);
  const gull = new THREE.Object3D();
  group.add(gulls);
  animated.push((t) => {
    for (let i = 0; i < 7; i++) {
      const a = t * 0.12 + i * 0.5, radius = 34 + (i % 3) * 6;
      gull.position.set(Math.cos(a) * radius, 22 + Math.sin(t * 0.7 + i) * 1.5 + i * 0.6, 4 + Math.sin(a) * radius);
      gull.rotation.set(0, -a, 0);
      gull.scale.set(1.4, 1.4 * (0.5 + Math.abs(Math.sin(t * 5 + i)) * 0.9), 1.4);
      gull.updateMatrix();
      gulls.setMatrixAt(i, gull.matrix);
    }
    gulls.instanceMatrix.needsUpdate = true;
  });
  lighthouse.position.set(-58, 0, -50);
  group.add(lighthouse);
  animated.push((t) => { beamPivot.rotation.y = t * 0.6; });
  // morros baixos no contorno da ilha (fora da cerca, só cenário)
  const hills = [];
  const hillRandom = rng(64);
  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * TAU + hillRandom() * 0.15;
    const radius = 60 + hillRandom() * 8;
    const x = Math.cos(angle) * radius, z = 4 + Math.sin(angle) * radius;
    if (z > 40 && Math.abs(x) < 26) continue;   // deixa a vista do portão aberta
    const size = 3.5 + hillRandom() * 4.5;
    hills.push({ p: [x, 0, z], s: [size * 1.6, size * (0.7 + hillRandom() * 0.5), size * 1.4], r: [0, hillRandom() * TAU, 0], color: [0x5e9e6c, 0x6fb07a, 0x4f8f63][i % 3] });
  }
  group.add(instances(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI / 2), toon(0xffffff), hills));
  const stone = pavingTexture();
  const plazaGeometry = new THREE.CircleGeometry(10, 64);
  const plazaUV = plazaGeometry.attributes.uv;
  for (let i = 0; i < plazaUV.count; i++) plazaUV.setXY(i, plazaUV.getX(i) * 7, plazaUV.getY(i) * 7);
  const plaza = new THREE.Mesh(plazaGeometry, toon(0xe6edf4, { map: stone }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.03;
  group.add(plaza);
  const ring = new THREE.Mesh(new THREE.RingGeometry(9.75, 10, 64), toon(0x3aa3ff));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);
  const paving = toon(0xe9eff5, { map: stone });
  const borders = [];
  const path = (x1, z1, x2, z2, width = 3) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const geometry = new THREE.PlaneGeometry(width, length);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 3, uv.getY(i) * length / 3);
    const strip = new THREE.Mesh(geometry, paving);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = Math.atan2(x2 - x1, z2 - z1);
    strip.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    group.add(strip);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    for (const side of [-1, 1]) borders.push({ p: [(x1 + x2) / 2 + Math.cos(angle) * width * 0.5 * side, 0.025, (z1 + z2) / 2 - Math.sin(angle) * width * 0.5 * side], s: [0.12, 0.025, length], r: [0, angle, 0] });
  };
  for (const site of Object.values(SITES)) path(0, 0, site.door[0], site.door[1]);
  path(0, 0, 0, GATE_Z + 6, 4);
  group.add(instances(new THREE.BoxGeometry(1, 1, 1), toon(0xf6f9fc), borders));

  // estátua do brasão no centro da praça
  const stoneMat = toon(0xdfe6ee);
  group.add(at(part(new THREE.CylinderGeometry(1.82, 1.88, 0.55, 24), stoneMat, 0.03), 0, 0.27, 0));
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.62, 32), toon(0x5cb8f2));   // iluminada: escurece à noite
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.5;
  group.add(water);
  group.add(at(part(new THREE.CylinderGeometry(0.42, 0.55, 1.5, 12), stoneMat, 0.03), 0, 0.95, 0));
  group.add(at(part(new THREE.CylinderGeometry(0.95, 0.5, 0.22, 16), stoneMat, 0.03), 0, 1.75, 0));
  const spray = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.32, 0.9, 10, 1, true), toon(0xd8f1ff, { transparent: true, opacity: 0.55, depthWrite: false }));
  spray.position.y = 2.25;
  group.add(spray);
  animated.push((t) => { spray.scale.y = 1 + Math.sin(t * 4) * 0.12; water.material.color.setHSL(0.56, 0.82, 0.64 + Math.sin(t * 1.3) * 0.03); });
  const crest = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: crestTexture(), transparent: true, side: THREE.DoubleSide }));
  crest.position.y = 3.5;
  group.add(crest);
  animated.push((t) => { crest.rotation.y = t * 0.5; });
  colliders.push({ minX: -1.9, maxX: 1.9, minZ: -1.9, maxZ: 1.9 });

  // sombra de contato: um retângulo de bordas suaves sob cada prédio (uma única chamada de desenho)
  const footprint = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d');
    g.filter = 'blur(14px)';
    g.fillStyle = '#000';
    g.fillRect(22, 22, 84, 84);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  })();
  const shades = Object.values(SITES).map((site) => ({ p: [site.x, 0.035, site.z], s: [site.w + 5, site.d + 5, 1], r: [-Math.PI / 2, 0, 0] }));
  group.add(instances(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: footprint, transparent: true, opacity: 0.3, depthWrite: false }), shades));

  // prédios
  const place = (key, mesh) => {
    const site = SITES[key];
    mesh.position.set(site.x, 0, site.z);
    group.add(mesh);
    colliders.push({ minX: site.x - site.w / 2, maxX: site.x + site.w / 2, minZ: site.z - site.d / 2, maxZ: site.z + site.d / 2 });
    const tag = label(site.name.toUpperCase(), { border: site.color });
    tag.position.set(site.x, site.h + 2.6, site.z);
    tag.scale.multiplyScalar(1.5);
    group.add(tag);
    // marca luminosa na porta
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 28), new THREE.MeshBasicMaterial({ color: site.color, transparent: true, opacity: 0.85 }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(site.door[0], 0.06, site.door[1]);
    group.add(mark);
    animated.push((t) => { mark.scale.setScalar(1 + Math.sin(t * 3 + site.x) * 0.12); });
  };

  // 1. prédio principal, com a torre do relógio
  const sala = block(30, 9, 10, '#e3e9f0', 5, { cols: 12, rows: 3 });
  sala.add(at(part(new THREE.BoxGeometry(30.6, 0.5, 10.6), red, 0), 0, 9.3, 0));
  sala.add(at(block(7, 17, 7, '#d9e2ec', 6, { cols: 3, rows: 6, lit: 0.45 }), 0, 0, 2.5));
  const roof = part(new THREE.ConeGeometry(5.6, 4.5, 4), red, 0.02);
  roof.rotation.y = Math.PI / 4;
  sala.add(at(roof, 0, 19.2, 2.5));
  const clock = new THREE.Mesh(new THREE.CircleGeometry(2.2, 28), new THREE.MeshBasicMaterial({ map: crestTexture() }));
  sala.add(at(clock, 0, 13.4, 6.02));
  // entrada: moldura, portas de vidro, marquise e degraus (o colisor da torre não muda)
  sala.add(at(part(new THREE.BoxGeometry(4.4, 5.4, 0.3), toon(0x1f3557), 0.02), 0, 2.7, 6.1));
  const glassDoor = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.5), new THREE.MeshBasicMaterial({ color: 0x8fc6ef }));
  sala.add(at(glassDoor, 0, 2.3, 6.27));
  sala.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4.5), new THREE.MeshBasicMaterial({ color: 0x1f3557 })), 0, 2.3, 6.28));
  sala.add(at(part(new THREE.BoxGeometry(6, 0.35, 1.9), red, 0.03), 0, 5.6, 6.9));
  sala.add(at(part(new THREE.BoxGeometry(5.4, 0.16, 0.9), toon(0xf3f6fa), 0), 0, 0.08, 6.6));
  sala.add(at(part(new THREE.BoxGeometry(4.6, 0.16, 0.6), toon(0xf3f6fa), 0), 0, 0.24, 6.4));
  place('sala', sala);
  colliders.push({ minX: -3.5, maxX: 3.5, minZ: -31, maxZ: -24 });   // a torre avança além da fachada

  // 2. prédio de exames
  const exames = block(12, 8, 10, '#8f9db0', 7, { cols: 5, rows: 3, lit: 0.3, glow: '#ff5a70' });
  for (const y of [2.2, 4.4, 6.6]) exames.add(at(new THREE.Mesh(new THREE.BoxGeometry(12.1, 0.18, 10.1), new THREE.MeshBasicMaterial({ color: 0xe8173f })), 0, y, 0));
  exames.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), new THREE.MeshBasicMaterial({ color: 0xff5a70 })), 0, 1.7, 5.03));
  place('exames', exames);

  // 3. conselho estudantil, com colunas
  const conselho = block(12, 8, 10, '#e7e4dc', 9, { cols: 5, rows: 2, lit: 0.6 });
  for (const x of [-4.5, -1.5, 1.5, 4.5]) conselho.add(at(part(new THREE.CylinderGeometry(0.45, 0.5, 8, 10), cream, 0.03), x, 4, 5.7));
  conselho.add(at(part(new THREE.BoxGeometry(13, 1, 2.4), toon(0xffc93c), 0.02), 0, 8.6, 5.4));
  conselho.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), warm), 0, 1.7, 5.03));
  place('conselho', conselho);

  // 4. sala de informática
  const info = block(10, 7, 12, '#a3b9c3', 11, { cols: 5, rows: 3, lit: 0.8, glow: '#4fc8ff' });
  const doorCyan = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.2), new THREE.MeshBasicMaterial({ color: 0x4fc8ff }));
  doorCyan.rotation.y = -Math.PI / 2;
  info.add(at(doorCyan, -5.03, 1.6, 0));
  place('info', info);

  // 5. biblioteca
  const biblio = block(10, 7, 12, '#c9c3ba', 13, { cols: 5, rows: 2, lit: 0.7 });
  const gable = part(new THREE.CylinderGeometry(0.01, 6.2, 3, 4, 1), toon(0x34506f), 0.02);
  gable.rotation.y = Math.PI / 4;
  gable.scale.z = 1.25;
  biblio.add(at(gable, 0, 8.6, 0));
  const doorWarm = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.2), warm);
  doorWarm.rotation.y = Math.PI / 2;
  biblio.add(at(doorWarm, 5.03, 1.6, 0));
  place('biblio', biblio);

  // 6. laboratório 404, com antena
  const lab = block(9, 5, 8, '#92aaa8', 15, { cols: 4, rows: 2, lit: 0.7, glow: '#3fd0c8' });
  lab.add(at(part(new THREE.CylinderGeometry(0.1, 0.1, 2, 6), dark, 0), 2, 6, -1));
  const dish = part(new THREE.SphereGeometry(1.3, 14, 8, 0, TAU, 0, Math.PI / 2.4), toon(0xf5f2ea, { side: THREE.DoubleSide }), 0);
  dish.rotation.set(Math.PI + 0.7, 0, 0.3);
  lab.add(at(dish, 2, 7.6, -1));
  const doorTeal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshBasicMaterial({ color: 0xff9f6b }));
  doorTeal.rotation.y = -Math.PI / 2;
  lab.add(at(doorTeal, -4.53, 1.5, 0));
  place('lab404', lab);

  // 7. galeria: três lojas com toldo
  const galeria = new THREE.Group();
  [[0xff3355, -4.7], [0xffc93c, 0], [0x4fc8ff, 4.7]].forEach(([color, z], i) => {
    const shop = block(7, 5, 4.5, '#e1e6ed', 21 + i, { cols: 3, rows: 2, lit: 0.9 });
    const awning = part(new THREE.BoxGeometry(1.6, 0.2, 4.3), toon(color), 0.02);
    awning.rotation.z = -0.35;
    shop.add(at(awning, 4.2, 3, 0));
    const front = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.MeshBasicMaterial({ color: 0xffe6ad }));
    front.rotation.y = Math.PI / 2;
    shop.add(at(front, 3.53, 1.3, 0));
    galeria.add(at(shop, 3.5, 0, z));
  });
  galeria.position.x = -3.5;
  const galeriaWrap = new THREE.Group();
  galeriaWrap.add(galeria);
  place('galeria', galeriaWrap);

  // 8. dormitório
  place('dorm', block(10, 14, 8, '#cbd8e8', 17, { cols: 5, rows: 6, lit: 0.45 }));

  const roofKit = [];
  const kr = rng(19);
  for (const site of Object.values(SITES)) {
    if (site.h > 12) continue;
    for (let i = 0; i < 3; i++) {
      const w = 0.9 + kr() * 1.2;
      roofKit.push({ p: [site.x + (kr() - 0.5) * (site.w - 3), site.h + 0.35 + 0.4, site.z + (kr() - 0.5) * (site.d - 3)], s: [w, 0.8, w * 0.8], color: [0xc9d2dc, 0xaeb9c6, 0xdfe6ee][i] });
    }
  }
  group.add(instances(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), roofKit));

  const bollards = [], bollardTops = [];
  for (const z of [16, 21, 26, 35]) for (const sx of [-1, 1]) {
    bollards.push({ p: [sx * 2.45, 0.35, z], s: [1, 1, 1] });
    bollardTops.push({ p: [sx * 2.45, 0.74, z], s: [1, 1, 1] });
    colliders.push({ minX: sx * 2.45 - 0.15, maxX: sx * 2.45 + 0.15, minZ: z - 0.15, maxZ: z + 0.15 });
  }
  group.add(instances(new THREE.CylinderGeometry(0.11, 0.13, 0.7, 8), dark, bollards));
  group.add(instances(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }), bollardTops));

  // portão, cerca e câmeras
  for (const s of [-1, 1]) {
    group.add(at(part(new THREE.BoxGeometry(1.6, 6, 1.6), dark, 0.02), s * 4.4, 3, GATE_Z));
    group.add(at(part(new THREE.BoxGeometry(2.1, 0.5, 2.1), red, 0.02), s * 4.4, 6.2, GATE_Z));
    const camera = part(new THREE.BoxGeometry(0.9, 0.45, 0.5), toon(0x20202c), 0.05);
    group.add(at(camera, s * 4.4, 6.9, GATE_Z - 0.4));
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a4a }));
    group.add(at(led, s * 4.4, 7.05, GATE_Z - 0.7));
    animated.push((t) => { led.visible = Math.sin(t * 5 + s) > 0; });
  }
  const sign = label('ACADEMIA PYRA', { border: '#f5f2ea', size: 72 });
  sign.position.set(0, 7.6, GATE_Z);
  sign.scale.multiplyScalar(1.7);
  group.add(sign);
  const wallStone = toon(0xe3e9f0);
  const spikes = [];
  const fence = (x1, z1, x2, z2) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    const rail = part(new THREE.BoxGeometry(0.32, 1.25, length), wallStone, 0);
    rail.rotation.y = angle;
    group.add(at(rail, (x1 + x2) / 2, 0.62, (z1 + z2) / 2));
    const count = Math.floor(length / 0.9);
    for (let i = 0; i <= count; i++) {
      const k = i / Math.max(count, 1);
      spikes.push({ p: [x1 + (x2 - x1) * k, 1.25 + 0.5, z1 + (z2 - z1) * k], s: [1, 1, 1] });
    }
  };
  fence(-40, GATE_Z, -5.2, GATE_Z);
  fence(5.2, GATE_Z, 40, GATE_Z);
  fence(-40, -39, -40, GATE_Z);
  fence(40, -39, 40, GATE_Z);
  fence(-40, -39, 40, -39);
  group.add(instances(new THREE.CylinderGeometry(0.03, 0.05, 1.0, 5), dark, spikes));
  group.add(instances(new THREE.ConeGeometry(0.09, 0.22, 5), dark, spikes.map(({ p }) => ({ p: [p[0], p[1] + 0.6, p[2]] }))));

  // canteiros com flores na frente dos prédios e cerca viva junto ao muro
  const beds = [], soil = [], blooms = [], hedges = [];
  const flowerColors = [0xffffff, 0x8fc6ff, 0x6f8df7, 0xfff1a6, 0xbfe3ff];
  const fr = rng(31);
  const bed = (x, z, w, d) => {
    beds.push({ p: [x, 0.12, z], s: [w, 0.24, d] });
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    soil.push({ p: [x, 0.25, z], s: [w - 0.24, 0.04, d - 0.24] });
    for (let i = 0; i < Math.round(w * d * 2.2); i++) blooms.push({ p: [x + (fr() - 0.5) * (w - 0.3), 0.34, z + (fr() - 0.5) * (d - 0.3)], s: [0.13, 0.13, 0.13], color: flowerColors[Math.floor(fr() * flowerColors.length)] });
  };
  for (const sx of [-1, 1]) { bed(sx * 9.5, -23.6, 6, 1.2); bed(sx * 4.6, 25, 3.4, 1.2); }
  for (const sx of [-1, 1]) bed(sx * 15.8, -0.8, 1.2, 3);   // entre os caminhos laterais, sem cobrir nenhum
  const hedgeLine = (x1, z1, x2, z2) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    hedges.push({ p: [(x1 + x2) / 2, 0.55, (z1 + z2) / 2], s: [0.9, 1.1, length], r: [0, Math.atan2(x2 - x1, z2 - z1), 0] });
  };
  hedgeLine(-39.2, -38, -39.2, 46); hedgeLine(39.2, -38, 39.2, 46); hedgeLine(-38.5, -38.3, 38.5, -38.3);
  group.add(instances(new THREE.BoxGeometry(1, 1, 1), toon(0xe2e8ef), beds));
  group.add(instances(new THREE.BoxGeometry(1, 1, 1), toon(0x4d6b45), soil));
  group.add(instances(new THREE.IcosahedronGeometry(1, 0), toon(0xffffff), blooms));
  group.add(instances(new THREE.BoxGeometry(1, 1, 1), toon(0x3f8a55), hedges));
  // arbustos baixos ao longo das fachadas (longe das portas) e tufos de grama espalhados
  const shrubs = [];
  const sr = rng(57);
  for (const site of Object.values(SITES)) {
    const front = site.door[1] > site.z + 1 ? 1 : site.door[1] < site.z - 1 ? -1 : 0;
    const sideX = site.door[0] > site.x + 1 ? 1 : site.door[0] < site.x - 1 ? -1 : 0;
    for (let i = 0; i < 9; i++) {
      const k = (i + 0.5) / 9 - 0.5;
      let x, z;
      if (front) { x = site.x + k * (site.w - 1); z = site.z + front * (site.d / 2 + 0.7); if (Math.abs(x - site.door[0]) < 3) continue; }
      else { x = site.x + sideX * (site.w / 2 + 0.7); z = site.z + k * (site.d - 1); if (Math.abs(z - site.door[1]) < 3) continue; }
      const size = 0.45 + sr() * 0.25;
      shrubs.push({ p: [x, size * 0.6, z], s: [size * 1.3, size, size * 1.3], r: [0, sr() * 6, 0], color: [0x3f8a55, 0x4f9e62, 0x5aae70][i % 3] });
    }
  }
  group.add(instances(new THREE.IcosahedronGeometry(1, 0), toon(0xffffff), shrubs));
  const tufts = [];
  for (let i = 0; i < 420; i++) {
    const x = (sr() - 0.5) * 76, z = -36 + sr() * 80;
    if (Math.abs(x) < 2.6 || Math.hypot(x, z) < 11) continue;   // fora do caminho central e da praça
    const onPath = Object.values(SITES).some(({ door: [dx, dz] }) => {
      const len2 = dx * dx + dz * dz;
      const k = Math.max(0, Math.min(1, (x * dx + z * dz) / len2));
      return Math.hypot(x - dx * k, z - dz * k) < 2.2;
    });
    if (onPath) continue;
    tufts.push({ p: [x, 0.09, z], s: [0.16, 0.18 + sr() * 0.12, 0.16], r: [0, sr() * 6, 0], color: sr() < 0.5 ? 0x5d9a66 : 0x8cc792 });
  }
  group.add(instances(new THREE.ConeGeometry(0.6, 1, 4), toon(0xffffff), tufts));

  // mastros com a bandeira da Academia, tremulando (pano com ondas na própria malha)
  const flagMap = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 160;
    const g = canvas.getContext('2d');
    g.fillStyle = '#2f6fc7'; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#f5f2ea'; g.fillRect(0, 64, 256, 32);
    g.translate(128, 80); g.scale(0.9, 0.9);
    g.fillStyle = '#0b1a33'; g.strokeStyle = '#f5f2ea'; g.lineWidth = 6;
    const shield = new Path2D('M0-46 40-30V8C40 34 20 52 0 62-20 52-40 34-40 8V-30Z');
    g.fill(shield); g.stroke(shield);
    g.lineWidth = 9; g.lineCap = g.lineJoin = 'round';
    g.stroke(new Path2D('M-12-20H8a14 14 0 0 1 0 28H-4V34'));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();
  for (const sx of [-1, 1]) {
    const x = sx * 6.5, z = -11;
    group.add(at(part(new THREE.CylinderGeometry(0.07, 0.1, 7, 8), toon(0xdfe6ee), 0.02), x, 3.5, z));
    group.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), toon(0xffc93c)), x, 7.05, z));
    const clothGeometry = new THREE.PlaneGeometry(2.4, 1.5, 12, 4);
    clothGeometry.translate(1.2, 0, 0);
    const base = clothGeometry.attributes.position.array.slice();
    const cloth = new THREE.Mesh(clothGeometry, toon(0xffffff, { map: flagMap, side: THREE.DoubleSide }));
    cloth.position.set(x, 6.1, z);
    cloth.rotation.y = sx < 0 ? 0 : Math.PI;
    group.add(cloth);
    animated.push((t) => {
      const pos = clothGeometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3];
        pos.setZ(i, Math.sin(bx * 2.4 - t * 4 + sx) * 0.12 * bx);
        pos.setY(i, base[i * 3 + 1] - bx * 0.05);
      }
      pos.needsUpdate = true;
    });
    colliders.push({ minX: x - 0.2, maxX: x + 0.2, minZ: z - 0.2, maxZ: z + 0.2 });
  }

  // árvores, postes e bancos
  const r = rng(77);
  const spots = [[-9, 14], [9, 14], [-13, -9], [13, -9], [-36, -6], [36, -6], [-36, 16], [36, 15], [-8, 30], [5, 28], [-36, 36], [34, 34], [-14, 42], [28, 42], [-18, -34], [19, -35], [-36, -30], [36, -32], [-12, 38], [-20, 8], [20, -3]];
  const trees = grove(spots, r);
  group.add(trees);
  animated.push(trees.userData.sway);
  for (const [x, z] of spots) colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45 });
  for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7], [-3.2, 30], [3.2, 30], [-3.2, 40], [3.2, 40]]) group.add(lamp(x, z));
  for (const [x, z, turn] of [[-12, 0, Math.PI / 2], [12, 0, -Math.PI / 2], [0, 12.5, 0]]) {
    const bench = new THREE.Group();
    const wood = toon(0x956c60);
    const slats = [];
    for (const offset of [-0.3, 0, 0.3]) slats.push({ p: [0, 0.55, offset], s: [3, 0.13, 0.24] });
    for (const height of [0.82, 1.08]) slats.push({ p: [0, height, -0.43], s: [3, 0.2, 0.12] });
    bench.add(instances(new THREE.BoxGeometry(1, 1, 1), wood, slats));
    bench.add(instances(new THREE.BoxGeometry(1, 1, 1), dark, [-1.1, 1.1].map((leg) => ({ p: [leg, 0.3, 0], s: [0.16, 0.6, 0.78] }))));
    bench.rotation.y = turn;
    group.add(at(bench, x, 0, z));
  }
  return { group, colliders, animated, windows: WINDOWS, lamps: LAMPS };
}

// Onde cada personagem fica no campus.
export const SPOTS = {
  kurisu: [18, 21.5], samuel: [-21.5, 9.5], jonas: [21, 2.5], helena: [-23.5, -8.5], leonardo: [-30.5, -8.5], dario: [23, -8],
  yuki: [30.5, -8.5], sora: [10.5, -1.5], clara: [14, 16], theo: [16.5, 14.5], bianca: [-9, 17], iris: [-18.5, -5.5],
  augusto: [-6, -14], rui: [6, 12], elisa: [-6.5, 11], raquel: [-22.5, 4], vitoria: [-12, -3], hugo: [12, -6], otto: [-3, 20],
};
// À noite, o pátio esvazia: a maioria está no dormitório; alguns ficam pelo campus.
export const NIGHT_SPOTS = {
  kurisu: [18, 21.5], selma: [21.5, 26], sora: [10.5, -1.5], dario: [23, -8],
};
// Onde quem joga aparece ao sair de cada prédio.
const CAMPUS_SPAWNS = { sala: [0, -20.2, 0], dorm: [15, 30.8, Math.PI], galeria: [-14.8, 25, -Math.PI / 2], inicio: [0, 30, Math.PI] };

/**
 * Monta o campus em um contêiner.
 * @param {HTMLElement} container
 * @param {object} o
 * @param {'play'|'title'} o.mode
 * @param {HTMLCanvasElement} [o.minimap]
 * @param {(target: object|null) => void} [o.onPrompt]  alvo de interação mais próximo (ou null)
 * @param {(target: object) => void} [o.onInteract]
 */
export function createWorld(container, { mode = 'play', minimap = null, onPrompt = () => {}, onInteract = () => {}, onSlow = () => {}, onArea = () => {}, period = 'aft' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pixelRatio = Math.min(devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.domElement.className = 'world-canvas';
  container.append(renderer.domElement);
  const fade = document.createElement('div');
  fade.className = 'world-fade';
  container.append(fade);

  const scene = new THREE.Scene();
  const skies = {
    aft: skyTexture(undefined, { sun: true }),
    night: skyTexture([[0, '#020611'], [0.5, '#071736'], [0.85, '#123064'], [1, '#22477e']]),
  };
  scene.fog = new THREE.Fog(0xcfe8fb, 70, 200);
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4f6f5c, 2.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
  sun.position.set(-30, 26, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -58;
  sun.shadow.camera.right = sun.shadow.camera.top = 58;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 170;
  sun.shadow.normalBias = 0.08;
  sun.shadow.bias = -0.0002;
  // Cenário estático: uma captura por área/período. Os personagens usam contato local.
  sun.shadow.autoUpdate = false;
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 400);

  const title = mode === 'title';
  let currentPeriod = period;

  // ---------- áreas ----------
  const campus = buildCampus();
  const prepareShadows = (group) => group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const opaque = materials.every((material) => !material.transparent && material.side !== THREE.BackSide);
    mesh.castShadow = opaque;
    mesh.receiveShadow = opaque;
  });
  prepareShadows(campus.group);
  const AREAS = {
    campus: { ...campus, bounds: BOUNDS, sites: true, camera: { h: 7.2, d: 10.5 } },
  };
  const BUILDERS = { escola: buildSchool, dorm: buildDorm, galeria: buildMall };
  const built = new Map();   // "area:periodo" -> área montada (janelas mudam à noite)
  function areaFor(name) {
    if (name === 'campus') return AREAS.campus;
    const key = `${name}:${currentPeriod}`;
    if (!built.has(key)) {
      const area = BUILDERS[name](currentPeriod === 'night');
      prepareShadows(area.group);
      // marcas no chão: portas em branco, pontos de interação em dourado
      area.marks = [];
      for (const spot of [...area.doors.map((d) => ({ ...d, door: true })), ...area.hotspots]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(spot.r * 0.55, spot.r * 0.72, 28), new THREE.MeshBasicMaterial({ color: spot.door ? 0xf5f2ea : 0xffc93c, transparent: true, opacity: 0.75 }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(spot.x, 0.04, spot.z);
        area.group.add(ring);
        area.marks.push(ring);
      }
      built.set(key, area);
    }
    return built.get(key);
  }
  let areaName = 'campus';
  let area = AREAS.campus;
  scene.add(area.group);

  // ---------- período do dia e luz ----------
  function applyLight() {
    const night = currentPeriod === 'night';
    if (area.sites) {
      scene.background = night ? skies.night : skies.aft;
      scene.fog = new THREE.Fog(night ? 0x0d1a36 : 0xcfe8fb, night ? 55 : 110, night ? 160 : 290);
      hemi.color.set(night ? 0x8fb0ee : 0xd2eaff);
      hemi.groundColor.set(night ? 0x1f2b40 : 0x5c7f68);
      hemi.intensity = night ? 1.15 : 1.5;
      sun.color.set(night ? 0xb1c7ff : 0xfff3e0);
      sun.intensity = night ? 0.85 : 2.45;
      sun.position.set(night ? 28 : -35, night ? 58 : 55, night ? -26 : 30);
      for (const m of campus.windows) m.emissiveIntensity = night ? 1.55 : 0.06;
      for (const m of campus.lamps) m.opacity = night ? m.userData.nightOpacity ?? 0.4 : 0;
    } else {
      // dentro dos prédios a luz é sempre de lâmpada; só as janelas mudam
      scene.background = new THREE.Color(0x07060c);
      scene.fog = null;
      hemi.color.set(0xeef5ff);
      hemi.groundColor.set(0x2c3444);
      hemi.intensity = 1.8;
      sun.color.set(0xf4f7ff);
      sun.intensity = 1.35;
      sun.position.set(-6, 14, 10);
    }
    sun.shadow.needsUpdate = true;
  }

  // ---------- personagens ----------
  const cache = new Map();
  let npcs = [];
  function modelFor(id) {
    if (cache.has(id)) return cache.get(id);
    const model = createCharacter(CAST[id], 'neutral', { detail: 'low' });
    const tag = label(CAST[id].name, { border: CAST[id].color, size: 40 });
    tag.position.y = 2.25;
    tag.scale.multiplyScalar(0.42);
    tag.visible = false;
    model.group.add(tag);
    const entry = { id, model, tag };
    cache.set(id, entry);
    return entry;
  }
  /** Quem está na área agora: { id: [x, z, virado?] }. */
  function setNpcs(spots) {
    for (const n of npcs) scene.remove(n.model.group);
    npcs = [];
    for (const [id, [x, z, turn]] of Object.entries(spots)) {
      if (!CAST[id]?.skin) continue;
      const entry = modelFor(id);
      entry.model.group.position.set(x, 0, z);
      const home = title ? 0 : turn ?? Math.atan2(-x, -z);
      entry.model.group.rotation.y = home;
      scene.add(entry.model.group);
      npcs.push({ id, x, z, model: entry.model, tag: title ? null : entry.tag, home });
    }
  }
  const presence = () => (area.sites ? (currentPeriod === 'night' ? NIGHT_SPOTS : SPOTS) : area.spots[currentPeriod] || {});

  let player = null;
  const pos = new THREE.Vector3(0, 0, 30);
  let facing = Math.PI;
  function setPlayerLook() {
    if (title) return;
    if (player) { scene.remove(player.group); player.dispose(); }
    player = createCharacter(lookOf('voce'));
    player.group.position.copy(pos);
    scene.add(player.group);
  }

  function setPeriod(next) {
    const changed = next !== currentPeriod;
    currentPeriod = next;
    if (changed && !area.sites) { const spawnless = { x: pos.x, z: pos.z }; swapArea(areaName); pos.set(spawnless.x, 0, spawnless.z); }
    applyLight();
    if (!title) setNpcs(presence());
  }

  // ---------- controles ----------
  const keys = new Set();
  let target = null;
  let near = null;
  let paused = false;
  let moving3 = false;   // transição entre áreas em andamento
  const busy = () => paused || moving3 || document.body.classList.contains('vn-open') || !document.getElementById('modal')?.hidden
    || document.body.classList.contains('tutor-open') || document.body.classList.contains('hub-card-open');
  const typing = (event) => event.target.closest?.('input, textarea, select, [contenteditable], button, a');
  const onKeyDown = (event) => {
    if (busy() || typing(event) || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) { keys.add(key); if (key.startsWith('arrow')) event.preventDefault(); }
    if ((key === 'e' || key === 'enter' || key === ' ') && near) { event.preventDefault(); onInteract(near); }
  };
  const onKeyUp = (event) => keys.delete(event.key.toLowerCase());
  const onBlur = () => keys.clear();
  const raycaster = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const onPointer = (event) => {
    if (title || busy()) return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(ground, hit)) return;
    const npc = npcs.find((n) => Math.hypot(n.x - hit.x, n.z - hit.z) < 1.4);
    if (npc) { target = { x: npc.x, z: npc.z, stop: 1.6, then: { type: 'npc', id: npc.id } }; return; }
    if (area.sites) {
      for (const [key, site] of Object.entries(SITES)) {
        const inside = Math.abs(hit.x - site.x) < site.w / 2 + 1 && Math.abs(hit.z - site.z) < site.d / 2 + 1;
        if (inside || Math.hypot(site.door[0] - hit.x, site.door[1] - hit.z) < 2.2) { target = { x: site.door[0], z: site.door[1], stop: 0.7, then: { type: 'place', key } }; return; }
      }
      if (Math.hypot(hit.x, hit.z - GATE_Z) < 4) { target = { x: 0, z: GATE_Z - 3, stop: 0.7, then: { type: 'place', key: 'portao' } }; return; }
    } else {
      for (const door of area.doors) if (Math.hypot(door.x - hit.x, door.z - hit.z) < door.r + 0.4) { target = { x: door.x, z: door.z - 0.6, stop: 0.5, then: { type: 'door', to: door.to, spawn: door.spawn } }; return; }
      for (const spot of area.hotspots) if (Math.hypot(spot.x - hit.x, spot.z - hit.z) < spot.r + 0.3) { target = { x: spot.x, z: spot.z, stop: spot.r * 0.7, then: { type: 'spot', key: spot.key, area: areaName } }; return; }
    }
    const b = area.bounds;
    target = { x: THREE.MathUtils.clamp(hit.x, b.minX, b.maxX), z: THREE.MathUtils.clamp(hit.z, b.minZ, b.maxZ), stop: 0.3 };
  };
  if (!title) {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    renderer.domElement.addEventListener('pointerdown', onPointer);
  }

  const blocked = (x, z) => {
    const b = area.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return true;
    for (const c of area.colliders) if (x > c.minX - 0.4 && x < c.maxX + 0.4 && z > c.minZ - 0.4 && z < c.maxZ + 0.4) return true;
    const reach = area.sites ? 0.75 : 0.4;
    for (const n of npcs) {
      const next = Math.hypot(n.x - x, n.z - z);
      if (next < reach && next < Math.hypot(n.x - pos.x, n.z - pos.z)) return true;
    }
    return false;
  };

  // ---------- troca de área ----------
  function swapArea(name) {
    scene.remove(area.group);
    areaName = name;
    area = areaFor(name);
    scene.add(area.group);
    applyLight();
  }
  function placeAt(spawn) {
    const [x, z, turn] = spawn;
    pos.set(x, 0, z);
    facing = turn ?? facing;
    target = null;
    keys.clear();
    camera.position.set(pos.x, area.camera.h, pos.z + area.camera.d);
  }
  /** Entra numa área ('campus', 'escola', 'dorm', 'galeria') pelo ponto de chegada indicado. */
  async function enterArea(name, spawnKey) {
    if (moving3) return;
    moving3 = true;
    fade.classList.add('on');
    await new Promise((resolve) => setTimeout(resolve, motionPreference.matches ? 0 : 260));
    swapArea(name);
    const spawn = name === 'campus' ? CAMPUS_SPAWNS[spawnKey] || CAMPUS_SPAWNS.inicio : area.spawns[spawnKey] || area.spawns.entrada;
    placeAt(spawn);
    setNpcs(presence());
    near = null;
    onPrompt(null);
    onArea(name);
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 60)));
    fade.classList.remove('on');
    moving3 = false;
  }

  function resize() {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 600 ? 58 : 46;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // ---------- minimapa ----------
  const mini = minimap?.getContext('2d');
  function drawMinimap() {
    if (!mini) return;
    const size = minimap.width;
    mini.clearRect(0, 0, size, size);
    mini.fillStyle = 'rgba(9,9,14,.86)';
    mini.fillRect(0, 0, size, size);
    if (area.sites) {
      const scale = size / 92;
      const px = (x) => (x + 46) * scale;
      const pz = (z) => (z + 44) * scale;
      mini.fillStyle = '#4b4668';
      mini.beginPath();
      mini.arc(px(0), pz(0), 10 * scale, 0, TAU);
      mini.fill();
      for (const site of Object.values(SITES)) { mini.fillStyle = site.color; mini.fillRect(px(site.x - site.w / 2), pz(site.z - site.d / 2), site.w * scale, site.d * scale); }
      for (const n of npcs) { mini.fillStyle = CAST[n.id].color; mini.fillRect(px(n.x) - 2, pz(n.z) - 2, 4, 4); }
      drawArrow(px(pos.x), pz(pos.z));
      return;
    }
    const b = area.bounds;
    const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 2;
    const scale = size / span;
    const ox = (size - (b.maxX - b.minX) * scale) / 2;
    const oz = (size - (b.maxZ - b.minZ) * scale) / 2;
    const px = (x) => ox + (x - b.minX) * scale;
    const pz = (z) => oz + (z - b.minZ) * scale;
    mini.fillStyle = 'rgba(255,255,255,.08)';
    mini.fillRect(px(b.minX), pz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    mini.fillStyle = '#4b4668';
    for (const c of area.colliders) mini.fillRect(px(c.minX), pz(c.minZ), Math.max(1.5, (c.maxX - c.minX) * scale), Math.max(1.5, (c.maxZ - c.minZ) * scale));
    mini.fillStyle = '#ffc93c';
    for (const h of area.hotspots) { mini.beginPath(); mini.arc(px(h.x), pz(h.z), 3, 0, TAU); mini.fill(); }
    mini.fillStyle = '#f5f2ea';
    for (const d of area.doors) mini.fillRect(px(d.x) - 5, pz(d.z) - 2, 10, 4);
    for (const n of npcs) { mini.fillStyle = CAST[n.id].color; mini.fillRect(px(n.x) - 2, pz(n.z) - 2, 4, 4); }
    drawArrow(px(pos.x), pz(pos.z));
  }
  function drawArrow(x, z) {
    mini.save();
    mini.translate(x, z);
    mini.rotate(-facing + Math.PI);
    mini.fillStyle = '#fff';
    mini.strokeStyle = '#3aa3ff';
    mini.lineWidth = 2;
    mini.beginPath();
    mini.moveTo(0, -7);
    mini.lineTo(5, 6);
    mini.lineTo(-5, 6);
    mini.closePath();
    mini.fill();
    mini.stroke();
    mini.restore();
  }

  // ---------- laço principal ----------
  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  const camWant = new THREE.Vector3();
  let frame = 0;
  let raf = 0;
  let alive = true;
  let slowTime = 0;
  let sampleFrames = 0;
  let sampleTime = 0;
  let downgrades = 0;
  function watchSpeed(dt) {
    sampleFrames += 1;
    sampleTime += dt;
    if (sampleTime < 3) return;
    const fps = sampleFrames / sampleTime;
    sampleFrames = 0;
    sampleTime = 0;
    if (fps < 20) slowTime += 1; else slowTime = 0;
    if (slowTime >= 2) {
      slowTime = 0;
      if (downgrades < 2) { downgrades += 1; pixelRatio = Math.max(0.5, pixelRatio * 0.6); renderer.setPixelRatio(pixelRatio); resize(); }
      else onSlow(fps);
    }
  }
  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    const raw = clock.getDelta();
    const dt = Math.min(0.05, raw);
    if (paused || document.hidden || (!title && document.body.classList.contains('vn-open'))) return;
    const t = motionPreference.matches ? 0 : clock.elapsedTime;
    if (area.sites) for (const fn of campus.animated) fn(t);
    else for (const ring of area.marks) ring.scale.setScalar(1 + Math.sin(t * 3 + ring.position.x) * 0.1);
    if (frame > 30) watchSpeed(Math.min(raw, 0.5));

    if (title) {
      const sway = Math.sin(t * 0.12) * 9;
      camera.position.set(sway, 3.4 + Math.sin(t * 0.2) * 0.4, 60);
      camera.lookAt(sway * 0.3, 4.2, 30);
      for (const n of npcs) n.model.update(dt, false);
    } else {
      const frozen = busy();
      let dx = frozen ? 0 : (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      let dz = frozen ? 0 : (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      if (dx || dz) target = null;
      else if (target && !frozen) {
        dx = target.x - pos.x;
        dz = target.z - pos.z;
        if (Math.hypot(dx, dz) <= target.stop) {
          const then = target.then;
          target = null;
          dx = dz = 0;
          if (then) onInteract(then);
        }
      }
      const moving = !!(dx || dz);
      if (moving) {
        const length = Math.hypot(dx, dz);
        const speed = (keys.has('shift') ? 10 : area.sites ? 6.5 : 5) * dt;
        const stepX = (dx / length) * speed;
        const stepZ = (dz / length) * speed;
        const before = pos.x + pos.z;
        if (!blocked(pos.x + stepX, pos.z)) pos.x += stepX;
        if (!blocked(pos.x, pos.z + stepZ)) pos.z += stepZ;
        if (target && Math.abs(pos.x + pos.z - before) < 1e-5) target = null;
        const want = Math.atan2(dx, dz);
        facing += Math.atan2(Math.sin(want - facing), Math.cos(want - facing)) * Math.min(1, dt * 12);
      }
      player.group.position.copy(pos);
      player.group.rotation.y = facing;
      player.update(dt, moving);

      let best = null;
      let bestDistance = Infinity;
      for (const n of npcs) {
        const distance = Math.hypot(n.x - pos.x, n.z - pos.z);
        n.model.update(dt, false);
        if (n.tag) n.tag.visible = distance < (area.sites ? 10 : 7);
        const want = distance < 5 ? Math.atan2(pos.x - n.x, pos.z - n.z) : n.home;
        n.model.group.rotation.y += Math.atan2(Math.sin(want - n.model.group.rotation.y), Math.cos(want - n.model.group.rotation.y)) * Math.min(1, dt * 5);
        if (distance < 2.3 && distance < bestDistance) { best = { type: 'npc', id: n.id }; bestDistance = distance; }
      }
      if (area.sites) {
        for (const [key, site] of Object.entries(SITES)) {
          const distance = Math.hypot(site.door[0] - pos.x, site.door[1] - pos.z);
          if (distance < 2.6 && distance < bestDistance) { best = { type: 'place', key }; bestDistance = distance; }
        }
        const gate = Math.hypot(pos.x, pos.z - (GATE_Z - 3));
        if (gate < 2.8 && gate < bestDistance) best = { type: 'place', key: 'portao' };
      } else {
        for (const spot of area.hotspots) {
          const distance = Math.hypot(spot.x - pos.x, spot.z - pos.z);
          if (distance < spot.r && distance < bestDistance) { best = { type: 'spot', key: spot.key, area: areaName, label: spot.label }; bestDistance = distance; }
        }
        for (const door of area.doors) {
          const distance = Math.hypot(door.x - pos.x, door.z - pos.z);
          if (distance < door.r && distance < bestDistance) { best = { type: 'door', to: door.to, spawn: door.spawn, label: door.label }; bestDistance = distance; }
        }
      }
      const id = (x) => x && `${x.type}:${x.id || x.key || x.to}`;
      if (id(best) !== id(near)) { near = best; onPrompt(near); }

      look.set(pos.x, 1.4, pos.z - 1.4);
      camWant.set(pos.x, area.camera.h, pos.z + area.camera.d);
      camera.position.lerp(camWant, Math.min(1, dt * 4));
      camera.lookAt(look);
      if (frame % 5 === 0) drawMinimap();
    }
    frame += 1;
    renderer.render(scene, camera);
  }

  // estado inicial
  applyLight();
  setNpcs(title ? { bianca: [-2.3, 51.5], sora: [0, 52.2], vesper: [2.3, 51.5] } : presence());
  setPlayerLook();
  camera.position.set(pos.x, area.camera.h, pos.z + area.camera.d);
  tick();

  return {
    setPaused(value) { paused = value; if (value) keys.clear(); else clock.getDelta(); },
    setPeriod,
    setPlayerLook,
    enterArea,
    areaName: () => areaName,
    where: () => ({ x: pos.x, z: pos.z }),
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      for (const { model } of cache.values()) model.dispose();
      player?.dispose();
      // Mapas de janela, pavimento e geometria pertencem a esta instância do mundo.
      // A rampa toon, o contorno e o halo procedural podem servir a outro renderer.
      const geometries = new Set(), materials = new Set(), textures = new Set();
      for (const builtArea of [campus, ...built.values()]) builtArea.group.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (!object.material) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material.side === THREE.BackSide) continue;
          materials.add(material);
          for (const texture of [material.map, material.emissiveMap]) if (texture && texture !== glowCache) textures.add(texture);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      for (const sky of Object.values(skies)) sky.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      fade.remove();
    },
  };
}
