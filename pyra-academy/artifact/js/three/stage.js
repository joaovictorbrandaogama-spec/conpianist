// Palco 3D da visual novel: um cenário por cena e os personagens em modelo 3D,
// com destaque para quem fala (avança, acende a faixa colorida; os outros escurecem).
import * as THREE from 'three';
import { toon, part, createCharacter } from './models.js';
import { skyTexture } from './world.js';
import { CAST } from '../art/characters.js';

const TAU = Math.PI * 2;
const at = (object, x, y, z) => { object.position.set(x, y, z); return object; };
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const plane = (w, h, material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);

function painted(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const MONO = '"JetBrains Mono", monospace';
const POSTER = 'Anton, Impact, "Arial Narrow", sans-serif';

// Small local textures give the sets depth without external assets or full-screen passes.
function surfaceTexture(wood = false) {
  const map = painted(256, 256, (g, w, h) => {
    g.fillStyle = wood ? '#dac5a7' : '#eeece5';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = wood ? '#b6a084' : '#c7c3bf';
    g.lineWidth = 2;
    for (let y = 0; y <= h; y += wood ? 32 : 128) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      const x = wood && (y / 32) % 2 ? 100 : 0;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (wood ? 32 : 128)); g.stroke();
    }
    if (!wood) { g.beginPath(); g.moveTo(128, 0); g.lineTo(128, h); g.stroke(); }
    else {
      g.strokeStyle = 'rgba(110,76,47,.12)'; g.lineWidth = 1;
      for (let y = 7; y < h; y += 11) {
        g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(60, y - 4, 170, y + 5, w, y); g.stroke();
      }
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(5, 5);
  return map;
}

function glowMap() {
  return painted(128, 128, (g, w, h) => {
    const radial = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    radial.addColorStop(0, 'rgba(255,255,255,.9)');
    radial.addColorStop(0.18, 'rgba(255,255,255,.35)');
    radial.addColorStop(0.52, 'rgba(255,255,255,.08)');
    radial.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = radial; g.fillRect(0, 0, w, h);
  });
}

// Dispose only resources owned by this set. The toon ramp and ink shell belong to models.js.
function disposeSet(group, background) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  group?.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      if (material.userData.sharedResource || material.side === THREE.BackSide) continue;
      materials.add(material);
      for (const key of ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap']) {
        if (material[key]) textures.add(material[key]);
      }
    }
  });
  if (background?.isTexture) textures.add(background);
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

const boardTexture = () => painted(1024, 440, (g, w, h) => {
  g.fillStyle = '#123832';
  g.fillRect(0, 0, w, h);
  g.font = `34px ${MONO}`;
  [['def merito(voce):', 60], ['    while voce.aprende():', 110], ['        voce.pontos += 1', 160], ['    return voce.pontos', 210]].forEach(([line, y]) => { g.fillStyle = '#e9f5ec'; g.fillText(line, 50, y); });
  g.font = `52px ${POSTER}`;
  g.fillStyle = '#ff5a70';
  g.fillText('TUDO SE COMPRA COM PONTOS', 50, 350);
});
const classesTexture = (title = 'CLASSES') => painted(512, 560, (g, w, h) => {
  g.fillStyle = '#0b0b12';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f5f2ea';
  g.lineWidth = 10;
  g.strokeRect(5, 5, w - 10, h - 10);
  g.font = `60px ${POSTER}`;
  g.fillStyle = '#f5f2ea';
  g.textAlign = 'center';
  g.fillText(title, w / 2, 86);
  g.textAlign = 'left';
  [['A', 340, '#ffc93c'], ['B', 250, '#4fc8ff'], ['C', 160, '#5eea9a'], ['D', 16, '#ff3355']].forEach(([letter, bar, color], i) => {
    g.fillStyle = color;
    g.font = `72px ${POSTER}`;
    g.fillText(letter, 40, 200 + i * 100);
    g.fillRect(110, 148 + i * 100, bar, 56);
  });
});
const signTexture = (text, color = '#5cb2ff') => painted(1024, 220, (g, w, h) => {
  g.fillStyle = '#0b0b12';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f5f2ea';
  g.lineWidth = 10;
  g.strokeRect(5, 5, w - 10, h - 10);
  g.font = `130px ${POSTER}`;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 8);
});
const waveTexture = () => painted(1024, 520, (g, w, h) => {
  g.fillStyle = '#0a2230';
  g.fillRect(0, 0, w, h);
  g.font = `34px ${MONO}`;
  g.fillStyle = '#9fe8e2';
  g.fillText('>>> hipotese = "voce consegue"', 40, 70);
  g.fillText('>>> experimento(hipotese)', 40, 420);
  g.fillStyle = '#ff9f6b';
  g.fillText('True_', 40, 470);
  g.strokeStyle = '#3fd0c8';
  g.lineWidth = 7;
  g.beginPath();
  for (let i = 0; i <= 60; i++) g.lineTo(40 + i * 15.7, 230 + Math.sin(i / 2.2) * 60 * (0.4 + ((i * 37) % 10) / 10));
  g.stroke();
});
const booksTexture = (seed) => painted(512, 640, (g, w, h) => {
  const colors = ['#e8173f', '#ffc93c', '#4fc8ff', '#5eea9a', '#b9a2ff', '#f5f2ea', '#ff9f6b', '#7a2a3a', '#2f4a8a'];
  let s = seed;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  g.fillStyle = '#241820';
  g.fillRect(0, 0, w, h);
  for (let row = 0; row < 5; row++) {
    let x = 14;
    const base = (row + 1) * 128 - 12;
    while (x < w - 30) {
      const bw = 16 + r() * 22;
      const bh = 60 + r() * 44;
      g.fillStyle = colors[Math.floor(r() * colors.length)];
      g.fillRect(x, base - bh, bw, bh);
      x += bw + 4;
    }
    g.fillStyle = '#0e0a10';
    g.fillRect(0, base, w, 12);
  }
});
const nightTexture = () => painted(256, 256, (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#06102a');
  sky.addColorStop(1, '#1c3a70');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff5d6';
  g.beginPath();
  g.arc(190, 60, 26, 0, TAU);
  g.fill();
  g.fillStyle = '#14122e';
  for (let i = 0; i < 9; i++) g.fillRect(i * 30, 250 - 40 - ((i * 53) % 70), 26, 120);
  g.fillStyle = '#ffd98a';
  for (let i = 0; i < 40; i++) g.fillRect((i * 67) % 250, 170 + ((i * 29) % 80), 4, 5);
});
const meshTexture = () => painted(256, 256, (g, w, h) => {
  g.strokeStyle = 'rgba(11,11,18,.85)';
  g.lineWidth = 3;
  for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 256, 256); g.moveTo(i * 32 + 256, 0); g.lineTo(i * 32, 256); g.stroke(); }
});

// Sala básica: chão, parede do fundo e paredes laterais.
function room(g, { floor = 0x2a3a55, wall = 0x26344c, width = 18, depth = 9, height = 8, stripe = 0x3aa3ff } = {}) {
  const ground = plane(width + 8, depth + 8, toon(floor, { map: surfaceTexture(true) }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(at(ground, 0, 0, -depth / 2 + 3));
  g.add(at(plane(width, height, toon(wall)), 0, height / 2, -depth + 3));
  for (const s of [-1, 1]) {
    const side = plane(depth + 4, height, toon(wall));
    side.rotation.y = -s * Math.PI / 2;
    g.add(at(side, s * width / 2, height / 2, -depth / 2 + 3));
  }
  if (stripe !== null) g.add(at(plane(width, 0.12, basic(stripe)), 0, 0.07, -depth + 3.02));
  const trim = toon(new THREE.Color(wall).multiplyScalar(1.5));
  for (const y of [1.15, height - 0.35]) {
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(width, 0.09, 0.12), trim), 0, y, -depth + 3.08));
  }
  for (const x of [-width / 2 + 0.18, width / 2 - 0.18]) {
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.28, height, 0.18), trim), x, height / 2, -depth + 3.12));
  }
  return -depth + 3;   // z da parede do fundo
}
const desk = (x, z, color = 0xb79e7c) => {
  const group = new THREE.Group();
  group.add(at(part(new THREE.BoxGeometry(1.7, 0.1, 0.8), toon(color), 0.03), 0, 0.85, 0));
  group.add(at(part(new THREE.BoxGeometry(1.5, 0.8, 0.06), toon(0x2c3e5c), 0), 0, 0.42, 0.3));
  const metal = toon(0x7f8da3);
  for (const sx of [-0.72, 0.72]) {
    group.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.8, 0.6), metal), sx, 0.4, 0));
  }
  group.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.035, 0.68), toon(0xb49b80)), 0, 0.918, 0));
  group.position.set(x, 0, z);
  return group;
};

let sunMap = null;
const sunPool = (x, z, w, d, turn = 0, opacity = 0.22) => {
  sunMap ||= painted(128, 128, (c, W, H) => { c.filter = 'blur(10px)'; c.fillStyle = '#fff'; c.fillRect(18, 18, W - 36, H - 36); });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basic(0xfff4dc, { map: sunMap, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pool.rotation.set(-Math.PI / 2, 0, turn);
  pool.position.set(x, 0.03, z);
  return pool;
};

const SETS = {
  classroom(g) {
    const back = room(g, { floor: 0x9a8668, wall: 0xdfe7f0, stripe: 0x2f6fc7 });
    g.add(at(part(new THREE.BoxGeometry(8.4, 3.8, 0.12), toon(0x14141f), 0.01), 0, 3.3, back + 0.08));
    g.add(at(plane(8, 3.4, basic(0xffffff, { map: boardTexture() })), 0, 3.3, back + 0.16));
    g.add(at(plane(2.6, 2.9, basic(0xffffff, { map: classesTexture() })), 6.6, 3.4, back + 0.05));
    const sky = skyTexture([[0, '#2b7bd8'], [0.6, '#7fc0f4'], [1, '#d8efff']]);
    for (const z of [-0.6, -3.4]) {
      const win = plane(2.2, 3.6, basic(0xffffff, { map: sky }));
      win.rotation.y = Math.PI / 2;
      g.add(at(win, -8.95, 3.4, z));
    }
    for (const z of [-2.2, -4]) for (const x of [-5.4, -1.8, 1.8, 5.4]) g.add(desk(x, z));
    for (const z of [-0.6, -3.4]) g.add(sunPool(-6.6, z + 0.5, 4.6, 2.4, 0.3));
    return { background: 0xcfe6fa };
  },
  hall(g) {
    const floor = plane(7, 34, toon(0x8e9bad));
    floor.rotation.x = -Math.PI / 2;
    g.add(at(floor, 0, 0, -13));
    const ceiling = plane(7, 34, toon(0xe9eef4));
    ceiling.rotation.x = Math.PI / 2;
    g.add(at(ceiling, 0, 6, -13));
    const sky = skyTexture([[0, '#2b7bd8'], [0.6, '#7fc0f4'], [1, '#d8efff']]);
    for (const s of [-1, 1]) {
      const wall = plane(34, 6, toon(s < 0 ? 0xdde5ee : 0xd2dbe6));
      wall.rotation.y = -s * Math.PI / 2;
      g.add(at(wall, s * 3.5, 3, -13));
      g.add(at(plane(0.1, 34, basic(0x2f6fc7)).rotateX(-Math.PI / 2), s * 3.3, 0.02, -13));
    }
    ['#ff3355', '#5eea9a', '#4fc8ff', '#ffc93c'].forEach((color, i) => {
      const win = plane(2.4, 3, basic(0xffffff, { map: sky }));
      win.rotation.y = Math.PI / 2;
      g.add(at(win, -3.45, 3.2, -3 - i * 5));
      const door = plane(1.8, 3.6, toon(0x2a3a55));
      door.rotation.y = -Math.PI / 2;
      g.add(at(door, 3.45, 1.8, -3 - i * 5));
      const tag = plane(1.8, 0.4, basic(color));
      tag.rotation.y = -Math.PI / 2;
      g.add(at(tag, 3.44, 4, -3 - i * 5));
      const strip = plane(2.4, 0.3, basic(0xf2f8ff));
      strip.rotation.x = Math.PI / 2;
      g.add(at(strip, 0, 5.98, -2 - i * 6));
    });
    g.add(at(plane(3, 4.4, basic(0xdff1ff)), 0, 2.2, -29.9));
    // vasos com plantas entre as portas
    for (const z of [-5.5, -10.5, -15.5]) {
      g.add(at(part(new THREE.CylinderGeometry(0.32, 0.25, 0.6, 10), toon(0xe9eef4), 0.03), 2.9, 0.3, z));
      g.add(at(part(new THREE.IcosahedronGeometry(0.55, 0), toon(0x4f9e62), 0.03), 2.9, 1.05, z));
    }
    return { background: 0xdfe9f3, fog: [0xdfe9f3, 26, 70] };
  },
  lab(g) {
    const back = room(g, { floor: 0x1d2e40, wall: 0x0f1c26, stripe: 0x3fd0c8 });
    g.add(at(part(new THREE.BoxGeometry(7.4, 4, 0.12), toon(0x3fd0c8), 0), 0, 3.5, back + 0.08));
    g.add(at(plane(7.1, 3.7, basic(0xffffff, { map: waveTexture() })), 0, 3.5, back + 0.16));
    g.add(at(plane(3.6, 4.6, basic(0xffffff, { map: booksTexture(42) })), -6.4, 2.6, back + 0.06));
    g.add(at(plane(2.6, 0.9, basic(0xffffff, { map: signTexture('404', '#ff9f6b') })), 6.2, 5.2, back + 0.06));
    g.add(at(part(new THREE.BoxGeometry(12, 0.2, 1.6), toon(0x24364f), 0.01), 0, 1, back + 1.8));
    g.add(at(part(new THREE.BoxGeometry(12, 1, 0.1), toon(0x14141f), 0), 0, 0.5, back + 2.5));
    return { background: 0x08111c };
  },
  arena(g) {
    const arenaTiles = surfaceTexture(); arenaTiles.wrapS = arenaTiles.wrapT = THREE.RepeatWrapping; arenaTiles.repeat.set(10, 10);
    const floor = plane(60, 60, toon(0x2a3e60, { map: arenaTiles }));
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);
    const grid = new THREE.GridHelper(60, 40, 0x2f7fd0, 0x1b3d6e);
    grid.position.y = 0.02;
    g.add(grid);
    g.add(at(plane(9, 1.9, basic(0xffffff, { map: signTexture('EXAME ESPECIAL') })), 0, 6.2, -9));
    for (const [x, color] of [[-7, 0xf5f8ff], [7, 0x3aa3ff]]) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(4.5, 16, 20, 1, true), basic(color, { transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      g.add(at(beam, x, 8, -9));
    }
    return { background: 0x08142a, fog: [0x08142a, 12, 40] };
  },
  council(g) {
    const back = room(g, { floor: 0x24324a, wall: 0x1c2a40, stripe: 0xffc93c });
    g.add(at(part(new THREE.BoxGeometry(7.6, 4.4, 0.12), toon(0xf5f2ea), 0), 0, 3.7, back + 0.08));
    g.add(at(plane(7.3, 4.1, basic(0xffffff, { map: classesTexture('SISTEMA S') })), 0, 3.7, back + 0.16));
    for (const s of [-1, 1]) g.add(at(plane(1.6, 5, toon(0x2f5d9e)), s * 6.4, 4, back + 0.06));
    g.add(at(part(new THREE.BoxGeometry(12, 0.2, 1.8), toon(0x2a3448), 0.01), 0, 1, back + 2.2));
    g.add(at(plane(12, 0.1, basic(0xffc93c)), 0, 0.95, back + 3.11));
    return { background: 0x0b121e };
  },
  dorm(g) {
    const back = room(g, { floor: 0x26344c, wall: 0x1a2638 });
    g.add(at(plane(4.2, 3.6, basic(0xffffff, { map: nightTexture() })), -1.5, 3.5, back + 0.05));
    for (const s of [-1, 1]) g.add(at(part(new THREE.BoxGeometry(0.9, 4.2, 0.2), toon(0x2f5d9e), 0.02), -1.5 + s * 2.6, 3.5, back + 0.2));
    g.add(at(part(new THREE.BoxGeometry(4.4, 0.2, 1.4), toon(0x2c3a50), 0.02), 5.4, 1, back + 1.2));
    g.add(at(plane(1.5, 0.9, basic(0x5eea9a)), 5, 1.7, back + 1));
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), basic(0xffc93c)), 6.8, 1.8, back + 1.2));
    g.add(at(part(new THREE.BoxGeometry(4.6, 0.7, 2.2), toon(0xf5f2ea), 0.02), -6, 0.5, back + 1.4));
    g.add(at(part(new THREE.BoxGeometry(2.6, 0.72, 2.22), toon(0x3b6fb0), 0), -5, 0.5, back + 1.4));
    return { background: 0x0c1220 };
  },
  library(g) {
    const back = room(g, { floor: 0x3a3a44, wall: 0x1c2636 });
    const sky = skyTexture([[0, '#2b7bd8'], [0.6, '#7fc0f4'], [1, '#d8efff']]);
    for (const x of [-6.6, 6.6]) g.add(at(plane(4.4, 5.6, basic(0xffffff, { map: booksTexture(x > 0 ? 9 : 4) })), x, 3, back + 0.06));
    for (const x of [-2.2, 0, 2.2]) g.add(at(plane(1.5, 4.6, basic(0xffffff, { map: sky })), x, 3.3, back + 0.05));
    for (const x of [-2.2, 0, 2.2]) g.add(sunPool(x + 0.4, back + 3, 1.6, 4.2, 0.18, 0.2));
    g.add(at(part(new THREE.BoxGeometry(11, 0.2, 1.6), toon(0x2e3a4c), 0.01), 0, 1, back + 2));
    for (const x of [-3.4, 3.4]) g.add(at(part(new THREE.ConeGeometry(0.45, 0.4, 12), toon(0x2fa66a), 0.05), x, 1.7, back + 2));
    return { background: 0x101624 };
  },
  rooftop(g) {
    const roofTiles = surfaceTexture(); roofTiles.wrapS = roofTiles.wrapT = THREE.RepeatWrapping; roofTiles.repeat.set(8, 6);
    const floor = plane(40, 30, toon(0x9aa6b8, { map: roofTiles }));
    floor.rotation.x = -Math.PI / 2;
    g.add(at(floor, 0, 0, -8));
    const mesh = meshTexture();
    mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
    mesh.repeat.set(14, 2);
    g.add(at(plane(40, 4, basic(0xffffff, { map: mesh, transparent: true })), 0, 2, -7));
    g.add(at(plane(40, 0.2, basic(0x0b0b12)), 0, 4, -6.98));
    for (let i = 0; i < 16; i++) g.add(at(plane(3, 4 + ((i * 37) % 9), basic(i % 2 ? 0x7f9fc6 : 0x6a8bb5)), -24 + i * 3.2, 0, -30));
    g.add(at(part(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 14), toon(0xd5dde7), 0.02), 7.5, 3, -5));
    return { background: skyTexture([[0, '#1d6bd0'], [0.5, '#56a8f0'], [0.85, '#a9d9fb'], [1, '#e6f5ff']]) };
  },
  mall(g) {
    const mallTiles = surfaceTexture(); mallTiles.wrapS = mallTiles.wrapT = THREE.RepeatWrapping; mallTiles.repeat.set(8, 5);
    const floor = plane(40, 24, toon(0x3d4f6e, { map: mallTiles }));
    floor.rotation.x = -Math.PI / 2;
    g.add(at(floor, 0, 0, -5));
    [['CAFÉ', 0xff3355, '#ff3355'], ['MERCADO', 0xffc93c, '#ffc93c'], ['GAMES', 0x4fc8ff, '#4fc8ff']].forEach(([name, color, css], i) => {
      const x = (i - 1) * 6.4;
      g.add(at(part(new THREE.BoxGeometry(6, 6, 2), toon(0x1e2c44), 0.01), x, 3, -7.5));
      g.add(at(plane(4.8, 2.6, basic(0xffe6ad)), x, 1.9, -6.48));
      const awning = part(new THREE.BoxGeometry(5.8, 0.2, 1.4), toon(color), 0.02);
      awning.rotation.x = 0.35;
      g.add(at(awning, x, 3.7, -6));
      g.add(at(plane(4.6, 1, basic(0xffffff, { map: signTexture(name, css) })), x, 5.1, -6.48));
    });
    for (let i = 0; i < 17; i++) g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), basic([0xffc93c, 0xff3355, 0x4fc8ff, 0xf5f2ea][i % 4])), -9.6 + i * 1.2, 6.6 - Math.sin((i / 16) * Math.PI) * 0.8, -5.6));
    return { background: skyTexture([[0, '#040b22'], [1, '#1d3f73']]) };
  },
  // Diante do portão: o campus de verdade ao fundo.
  gate(g) {
    const stripes = painted(64, 64, (c, w, h) => { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#679f70' : '#79b380'; c.fillRect(0, i * 16, w, 16); } });
    stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping; stripes.repeat.set(1, 14);
    const ground = plane(80, 80, toon(0xffffff, { map: stripes }));
    ground.rotation.x = -Math.PI / 2;
    g.add(at(ground, 0, 0, -20));
    const path = plane(4, 60, toon(0xd9e1ea));
    path.rotation.x = -Math.PI / 2;
    g.add(at(path, 0, 0.02, -24));
    for (const s of [-1, 1]) g.add(at(part(new THREE.BoxGeometry(0.7, 0.9, 24), toon(0x3f8a55), 0.03), s * 3, 0.45, -28));
    const dark = toon(0x2a3a55);
    const red = toon(0x2f6fc7);
    for (const s of [-1, 1]) {
      g.add(at(part(new THREE.BoxGeometry(1.4, 6, 1.4), dark, 0.02), s * 4.6, 3, -11));
      g.add(at(part(new THREE.BoxGeometry(1.9, 0.45, 1.9), red, 0.02), s * 4.6, 6.2, -11));
      g.add(at(part(new THREE.BoxGeometry(14, 2, 0.25), dark, 0), s * 12, 1, -11));
      for (const z of [-17, -24, -31]) {
        const trunk = part(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6), toon(0x5d4a3c), 0.04);
        g.add(at(trunk, s * 5.5, 1.2, z));
        g.add(at(part(new THREE.IcosahedronGeometry(1.6, 1), toon(z === -24 ? 0x8fa8f2 : 0x5fae6e), 0.03), s * 5.5, 3.4, z));
      }
    }
    g.add(at(plane(8, 1.4, basic(0xffffff, { map: signTexture('ACADEMIA PYRA', '#f5f2ea') })), 0, 7.1, -11));
    for (const [x, w, h] of [[-12, 8, 9], [0, 14, 12], [12, 8, 9]]) {
      g.add(at(part(new THREE.BoxGeometry(w, h, 5), toon(0xdbe3ec), 0.01), x, h / 2, -40));
    }
    return { background: skyTexture(), fog: [0xcfe8fb, 24, 80] };
  },
  black() { return { background: 0x07070c }; },
};

function dressSet(group, name) {
  if (name === 'black') return;
  const metal = toon(0x393344);
  const brass = toon(0xbca47b);
  const box = (x, y, z, w, h, d, material = metal) => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    group.add(at(object, x, y, z));
    return object;
  };
  let haloTexture = null;
  const halo = (x, y, z, color, size, opacity = 0.28) => {
    haloTexture ||= glowMap();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTexture, color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    sprite.scale.set(size, size, 1);
    group.add(at(sprite, x, y, z));
  };
  const windowFrame = (x, y, z, w, h) => {
    for (const side of [-1, 1]) {
      box(x + side * w / 2, y, z, 0.07, h + 0.1, 0.06);
      box(x, y + side * h / 2, z, w, 0.07, 0.06);
    }
    box(x, y, z, 0.045, h, 0.06);
  };

  // luz suave na parede do fundo dos cenários internos escuros: separa o elenco do fundo
  if (['council', 'dorm', 'lab', 'library', 'mall', 'arena'].includes(name)) {
    halo(0, 4.6, -5.6, { council: 0xffe7a8, dorm: 0x9fc4ff, lab: 0x7fe6dc, library: 0xbcd0ff, mall: 0xbcd8ff, arena: 0x8fc4ff }[name], 12, 0.14);
    halo(0, 0.6, -2.5, 0xbcd8ff, 9, 0.08);
  }

  if (name === 'classroom') {
    box(0, 1.52, -5.72, 8.5, 0.07, 0.32, brass);
    for (const x of [-6.4, 6.4]) {
      box(x, 6.3, -5.78, 2.7, 0.08, 0.12, basic(0xf2f8ff));
      halo(x, 6.25, -5.5, 0xe6f2ff, 3.4, 0.18);
    }
    const clock = painted(128, 128, (g, w, h) => {
      g.fillStyle = '#f3ead8'; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, TAU); g.fill();
      g.strokeStyle = '#302a38'; g.lineWidth = 6; g.stroke();
      for (let i = 0; i < 12; i++) {
        const angle = i * TAU / 12;
        g.beginPath(); g.moveTo(64 + Math.sin(angle) * 45, 64 - Math.cos(angle) * 45);
        g.lineTo(64 + Math.sin(angle) * 51, 64 - Math.cos(angle) * 51); g.stroke();
      }
      g.beginPath(); g.moveTo(64, 30); g.lineTo(64, 64); g.lineTo(90, 78); g.stroke();
    });
    group.add(at(plane(0.8, 0.8, basic(0xffffff, { map: clock, transparent: true })), -6.6, 5.3, -5.8));
  } else if (name === 'hall') {
    for (let i = 0; i < 5; i++) {
      const z = -2 - i * 6;
      for (const x of [-3.35, 3.35]) box(x, 2.8, z, 0.12, 5.6, 0.18, brass);
      halo(0, 5.85, z, 0xe9f4ff, 3, 0.22);
    }
  } else if (name === 'lab') {
    for (let i = 0; i < 5; i++) {
      const x = 2.8 + i * 0.55;
      box(x, 1.45, -4.1, 0.28, 0.7 + (i % 2) * 0.18, 0.28, toon(i % 2 ? 0x76cbbf : 0xf2b893));
      box(x, 1.1, -4.1, 0.4, 0.08, 0.4);
    }
    box(0, 5.65, -5.75, 7.3, 0.04, 0.1, basic(0x75e1d2));
    halo(0, 3.4, -5.6, 0x63c8ce, 7, 0.12);
  } else if (name === 'council') {
    for (const x of [-8, 8]) {
      box(x, 3.2, -5.7, 0.45, 6.4, 0.5, brass);
      box(x, 0.16, -5.7, 0.8, 0.32, 0.8, brass);
      box(x, 6.4, -5.7, 0.8, 0.25, 0.8, brass);
    }
    for (const x of [-6.4, 6.4]) halo(x, 5.5, -5.6, 0xffce7d, 3, 0.18);
  } else if (name === 'dorm') {
    windowFrame(-1.5, 3.5, -5.86, 4.2, 3.6);
    box(-6, 1, -5.55, 4.6, 1.2, 0.18, toon(0x583a4b));
    box(-7.3, 0.94, -4.6, 1.3, 0.2, 1.5, toon(0xffe8d7));
    halo(6.8, 1.8, -4.7, 0xffc074, 2.6, 0.45);
    box(6.8, 1.35, -4.8, 0.055, 0.6, 0.055, brass);
  } else if (name === 'library') {
    for (const x of [-6.6, 6.6]) {
      windowFrame(x, 3, -5.84, 4.4, 5.6);
      for (let row = 0; row < 5; row++) box(x, 0.35 + row * 1.12, -5.72, 4.5, 0.09, 0.28, brass);
    }
    for (const x of [-2.2, 0, 2.2]) windowFrame(x, 3.3, -5.88, 1.5, 4.6);
    for (const x of [-3.4, 3.4]) {
      box(x, 1.35, -4, 0.05, 0.55, 0.05, brass);
      halo(x, 1.5, -3.9, 0xffdb98, 1.7, 0.3);
    }
  } else if (name === 'rooftop') {
    for (let i = -5; i <= 5; i++) box(i * 3.5, 0.013, -8, 0.025, 0.012, 24, metal);
    for (let i = 0; i < 11; i++) box(-19 + i * 3.8, 2, -6.95, 0.07, 4, 0.07);
  } else if (name === 'mall') {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 6.4;
      windowFrame(x, 1.9, -6.42, 4.8, 2.6);
      halo(x, 2.5, -6.1, [0xffaf9a, 0xffd68a, 0x99cfff][i], 5, 0.2);
    }
    for (let i = 0; i < 9; i++) halo(-9.6 + i * 2.4, 6.6 - Math.sin(i / 8 * Math.PI) * 0.8, -5.5, 0xffd89b, 1.1, 0.4);
  } else if (name === 'gate') {
    const windowGeometry = new THREE.PlaneGeometry(0.65, 0.9);
    const windows = new THREE.InstancedMesh(windowGeometry, basic(0xd7b1b0), 108);
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (const [cx, width, height] of [[-12, 8, 9], [0, 14, 12], [12, 8, 9]]) {
      for (let y = 2; y < height - 1; y += 2) for (let x = -width / 2 + 1; x < width / 2 - 0.5; x += 1.8) {
        matrix.makeTranslation(cx + x, y, -37.46);
        windows.setMatrixAt(index++, matrix);
      }
      box(cx, height - 0.15, -37.4, width + 0.2, 0.2, 0.25, brass);
    }
    windows.count = index;
    group.add(windows);
    for (const x of [-4.6, 4.6]) halo(x, 6.35, -10.9, 0xffc98e, 2.2, 0.3);
  } else if (name === 'arena') {
    for (const x of [-7, 7]) halo(x, 7.6, -8.9, x < 0 ? 0xc4dcff : 0x5aa8ff, 6, 0.3);
  }

  group.traverse((object) => {
    if (!object.isMesh || object.material?.side === THREE.BackSide) return;
    object.receiveShadow = true;
    // Only the nearby cast casts shadows; distant set dressing stays inexpensive.
    object.castShadow = false;
  });
  // Some sets don't use both accent materials.
  const used = new Set();
  group.traverse((object) => { if (object.material) used.add(object.material); });
  if (!used.has(metal)) metal.dispose();
  if (!used.has(brass)) brass.dispose();
}

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'world-canvas';
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07070c);
  const fill = new THREE.HemisphereLight(0xdcecff, 0x3e4a5e, 1.65);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xfff8ef, 2.8);
  key.position.set(-5, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 0.5, far: 40 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.025;
  key.target.position.set(0, 0, -1);
  const rim = new THREE.DirectionalLight(0x9fd3ff, 1.25);
  rim.position.set(4, 4, -6);
  scene.add(key, key.target, rim);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.3, 300);

  let set = null;
  let setName = null;
  let animated = [];
  const chars = new Map();    // id -> { model, pos, dim, bump }
  let speaker = null;
  const band = plane(1.7, 9, basic(0xffffff, { transparent: true, opacity: 0, depthWrite: false }));
  band.rotation.z = -0.16;
  band.position.set(0, 3, -0.9);
  scene.add(band);
  let bandOpacity = 0;
  let camX = 0;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  const changeMotion = (event) => { reducedMotion = event.matches; };
  motionPreference.addEventListener('change', changeMotion);

  const spread = () => Math.min(2.1, 1.25 * camera.aspect);
  const slotX = (pos) => ({ left: -1, center: 0, right: 1 }[pos] || 0) * spread();

  function resize() {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const clock = new THREE.Clock();
  let raf = 0;
  let alive = true;
  let paused = false;
  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, clock.getDelta());
    if (document.hidden || paused) return;
    const t = clock.elapsedTime;
    if (!reducedMotion) for (const fn of animated) fn(t);
    for (const [id, entry] of chars) {
      const speaking = id === speaker;
      const group = entry.model.group;
      const ease = reducedMotion ? 1 : Math.min(1, dt * 7);
      group.position.x += (slotX(entry.pos) - group.position.x) * ease;
      group.position.z += ((speaking ? 0.35 : speaker ? -0.45 : 0) - group.position.z) * ease;
      entry.bump = reducedMotion ? 0 : Math.max(0, entry.bump - dt * 2.6);
      group.position.y += ((Math.sin(entry.bump * Math.PI) * 0.07) - group.position.y) * (reducedMotion ? 1 : Math.min(1, dt * 14));
      const want = speaking || !speaker ? 0 : 0.5;
      if (Math.abs(want - entry.dim) > 0.01) { entry.dim += (want - entry.dim) * ease; entry.model.setDim(entry.dim); }
      entry.model.update(reducedMotion ? 0 : dt, false);
    }
    const lit = speaker && chars.has(speaker);
    bandOpacity += ((lit ? 0.2 : 0) - bandOpacity) * Math.min(1, dt * 8);
    band.material.opacity = bandOpacity;
    if (lit) band.position.x += (slotX(chars.get(speaker).pos) - band.position.x) * (reducedMotion ? 1 : Math.min(1, dt * 10));
    const focus = !reducedMotion && speaker && chars.has(speaker) ? slotX(chars.get(speaker).pos) * 0.35 : 0;
    camX += (focus - camX) * Math.min(1, dt * 2.5);
    if (reducedMotion) camX = 0;
    camera.position.set(camX + (reducedMotion ? 0 : Math.sin(t * 0.25) * 0.045), 1.75, 6.6);
    camera.lookAt(camX * 0.6, 1.05, 0);
    renderer.render(scene, camera);
  }
  tick();

  return {
    /** Troca o cenário. */
    setScene(name) {
      if (name === setName) return;
      setName = name;
      if (set) scene.remove(set);
      disposeSet(set, scene.background);
      set = new THREE.Group();
      const info = (SETS[name] || SETS.black)(set) || {};
      dressSet(set, SETS[name] ? name : 'black');
      scene.add(set);
      scene.background = info.background?.isTexture ? info.background : new THREE.Color(info.background ?? 0x07070c);
      scene.fog = info.fog ? new THREE.Fog(...info.fog) : null;
      animated = info.animated || [];
      const cool = ['dorm', 'lab', 'arena'].includes(name);
      fill.color.set(cool ? 0xc4d6ff : 0xdcecff);
      key.color.set(cool ? 0xe3ebff : 0xfff6ea);
      rim.color.set(name === 'arena' ? 0x6fb8ff : cool ? 0x8fb0f0 : 0x9fd3ff);
    },
    /** Coloca (ou atualiza) um personagem em uma posição e marca quem fala. */
    show(id, expression, pos) {
      let entry = chars.get(id);
      if (!entry) {
        for (const [other, item] of chars) if (item.pos === pos) { scene.remove(item.model.group); item.model.dispose(); chars.delete(other); }
        const model = createCharacter(CAST[id], expression);
        model.group.traverse((object) => {
          if (object.isMesh && !object.material?.transparent && object.material?.side !== THREE.BackSide) {
            object.castShadow = true;
            object.receiveShadow = false;
          }
        });
        model.group.position.set(slotX(pos) + (reducedMotion ? 0 : pos === 'right' ? 0.8 : -0.8), reducedMotion ? 0 : -0.25, 0);
        model.group.rotation.y = { left: 0.3, right: -0.3 }[pos] || 0;
        scene.add(model.group);
        entry = { model, pos, dim: 0, bump: 0 };
        chars.set(id, entry);
      }
      entry.model.setExpression(expression);
      entry.bump = reducedMotion ? 0 : 1;
      speaker = id;
      band.material.color.set(CAST[id].color);
    },
    /** Ninguém em destaque (narração ou fala de quem joga). */
    hush() { speaker = null; },
    setPaused(value) { paused = value; if (!value) clock.getDelta(); },
    clear() {
      for (const item of chars.values()) { scene.remove(item.model.group); item.model.dispose(); }
      chars.clear();
      speaker = null;
    },
    dispose() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      motionPreference.removeEventListener('change', changeMotion);
      for (const item of chars.values()) item.model.dispose();
      chars.clear();
      disposeSet(set, scene.background);
      band.geometry.dispose();
      band.material.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
