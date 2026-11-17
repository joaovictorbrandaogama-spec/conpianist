// Interiores caminháveis: prédio principal (corredor, Sala da Turma D, Clube de Código Criativo),
// dormitório (saguão e quarto 404-D) e Galeria Jacarandá. A câmera vem do sul: as paredes viradas
// para ela são baixas (corte de casa de bonecas), para quem joga nunca ficar escondido.
import * as THREE from 'three';
import { toon, part, label } from './models.js';

const at = (object, x, y, z) => { object.position.set(x, y, z); return object; };
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

function painted(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const POSTER = 'Anton, Impact, "Arial Narrow", sans-serif';
const MONO = '"JetBrains Mono", monospace';
const sign = (text, bg = '#0b0b12', fg = '#f5f2ea', w = 512) => painted(w, 128, (g, W, H) => {
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = fg; g.font = `64px ${POSTER}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, W / 2, H / 2 + 4);
});
const boardTexture = () => painted(1024, 440, (g, w, h) => {
  g.fillStyle = '#123828'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e9f5ec'; g.font = `38px ${MONO}`;
  ['for aula in ano_letivo:', '    turma_d.pontos += aula', '', '# Exame Especial: sexta-feira'].forEach((line, i) => g.fillText(line, 60, 80 + i * 54));
  g.fillStyle = '#ff5a70'; g.font = `56px ${POSTER}`; g.fillText('NÃO SEJA O ÚLTIMO', 60, 390);
});
const classesTexture = () => painted(512, 560, (g, w, h) => {
  g.fillStyle = '#0b0b12'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f5f2ea'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = '#f5f2ea'; g.font = `52px ${POSTER}`; g.fillText('SISTEMA S', 40, 80);
  [['A', '#ffc93c', 380], ['B', '#4fc8ff', 270], ['C', '#5eea9a', 170], ['D', '#ff3355', 40]].forEach(([l, c, len], i) => {
    g.fillStyle = c; g.font = `70px ${POSTER}`; g.fillText(l, 40, 190 + i * 100); g.fillRect(110, 140 + i * 100, len, 44);
  });
});
const windowTexture = (night) => painted(256, 256, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h);
  if (night) { grad.addColorStop(0, '#030816'); grad.addColorStop(1, '#14305e'); } else { grad.addColorStop(0, '#2b7bd8'); grad.addColorStop(0.6, '#7fc0f4'); grad.addColorStop(1, '#d8efff'); }
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  // Silhueta distante e reflexos: o vidro continua legível à noite.
  g.fillStyle = night ? '#0c1428' : '#7f9cbf';
  for (let i = 0; i < 11; i++) g.fillRect(i * 27 - 8, 178 - (i * 31 % 54), 22, 90);
  g.fillStyle = night ? '#ffd996' : '#eef7ff';
  for (let i = 0; i < 26; i++) g.fillRect((i * 47) % 250, 190 + (i * 19 % 58), 3, 5);
  g.fillStyle = 'rgba(234,241,255,.11)';
  g.beginPath(); g.moveTo(0, 32); g.lineTo(150, 0); g.lineTo(208, 0); g.lineTo(0, 102); g.fill();
  g.fillStyle = '#eef2f6'; g.fillRect(w / 2 - 4, 0, 8, h); g.fillRect(0, h / 2 - 4, w, 8);
  g.strokeStyle = '#8d9aab'; g.lineWidth = 10; g.strokeRect(2, 2, w - 4, h - 4);
});
const floorTexture = (a, b, n = 8, wood = false) => {
  const t = painted(256, 256, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    if (wood) {
      for (let row = 0; row < 8; row++) {
        g.fillStyle = row % 2 ? b : a;
        g.fillRect(0, row * 32, w, 32);
        g.strokeStyle = 'rgba(24,15,24,.23)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, row * 32); g.lineTo(w, row * 32); g.stroke();
        const joint = (row % 3) * 80 + 16;
        g.fillStyle = 'rgba(24,15,24,.23)'; g.fillRect(joint, row * 32, 2, 32);
        g.fillStyle = 'rgba(255,238,204,.045)'; g.fillRect(0, row * 32 + 9, w, 2);
      }
    } else {
      g.fillStyle = b; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
      g.strokeStyle = 'rgba(245,242,234,.12)'; g.lineWidth = 2;
      for (const v of [0, 128, 256]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, h); g.moveTo(0, v); g.lineTo(w, v); g.stroke(); }
      g.strokeStyle = 'rgba(15,15,30,.14)'; g.lineWidth = 2; g.strokeRect(5, 5, 118, 118); g.strokeRect(133, 133, 118, 118);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(n, n);
  return t;
};

const booksTexture = (seed = 0) => painted(256, 384, (g, w, h) => {
  const colors = ['#ab4050', '#dcc291', '#528c9e', '#739882', '#b6a6c9', '#eee2c9'];
  g.fillStyle = '#302832'; g.fillRect(0, 0, w, h);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 11; i++) {
      const bh = 50 + ((i * 13 + row * 17 + seed) % 29);
      const x = 10 + i * 22, y = row * 96 + 86 - bh;
      g.fillStyle = colors[(i + row + seed) % colors.length]; g.fillRect(x, y, 17, bh);
      g.fillStyle = 'rgba(255,244,212,.55)'; g.fillRect(x + 3, y + 8, 11, 2);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 13, y, 4, bh);
    }
    g.fillStyle = '#9e7960'; g.fillRect(0, row * 96 + 88, w, 8);
    g.fillStyle = '#c4a17a'; g.fillRect(0, row * 96 + 88, w, 2);
  }
});

// Pequenos detalhes repetidos em uma única chamada por cor, sem novas colisões.
function details(group, color, items) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(color), items.length);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  for (let i = 0; i < items.length; i++) {
    const [x, y, z, w, h, d] = items[i];
    matrix.compose(new THREE.Vector3(x, y, z), rotation, new THREE.Vector3(w, h, d));
    mesh.setMatrixAt(i, matrix);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

// Halo pintado local: brilho suave sem render targets ou passes de pós-processamento.
function lighting(group, night, fixtures) {
  const glowMap = painted(64, 64, (g) => {
    const fade = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    fade.addColorStop(0, 'rgba(255,241,203,.6)');
    fade.addColorStop(0.25, 'rgba(255,225,170,.18)');
    fade.addColorStop(1, 'rgba(255,225,170,0)');
    g.fillStyle = fade; g.fillRect(0, 0, 64, 64);
  });
  const glowMat = new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthWrite: false, opacity: night ? 0.7 : 0.28, blending: THREE.AdditiveBlending });
  const litMat = basic(night ? 0xffe2a8 : 0xf3f8ff, { toneMapped: false });
  const housingMat = toon(0x8d99a8);
  for (const [x, y, z] of fixtures) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.16, 0.22), housingMat);
    group.add(at(housing, x, y, z));
    group.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 0.24), litMat), x, y - 0.06, z + 0.02));
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(2.6, 1.2, 1);
    group.add(at(glow, x, y - 0.04, z + 0.14));
  }
  // Duas luzes no máximo; sem mapas de sombra adicionais.
  for (const fixture of [fixtures[0], fixtures[fixtures.length - 1]]) {
    if (!fixture) continue;
    const light = new THREE.PointLight(night ? 0xffd6a1 : 0xe8f2ff, night ? 3.2 : 1.2, 12, 2);
    group.add(at(light, fixture[0], fixture[1] - 0.3, fixture[2] + 0.65));
  }
}

/** Ajudantes de construção que registram as colisões. */
function kit(group, colliders) {
  const materials = new Map();
  const material = (color) => {
    if (!materials.has(color)) materials.set(color, toon(color));
    return materials.get(color);
  };
  const trim = material(0xc9d3de);
  const foot = material(0x4f5b6c);
  const wall = (x0, z0, x1, z1, h, mat, thick = 0.3) => {
    const w = Math.abs(x1 - x0) || thick;
    const d = Math.abs(z1 - z0) || thick;
    const mesh = part(new THREE.BoxGeometry(w, h, d), mat, 0.01);
    mesh.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    // Moldura e rodapé dentro do traçado do muro, inclusive nas paredes baixas.
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.06, d + 0.02), trim);
    group.add(at(cap, mesh.position.x, h - 0.03, mesh.position.z));
    const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.015, 0.18, d + 0.015), foot);
    group.add(at(base, mesh.position.x, 0.09, mesh.position.z));
    colliders.push({ minX: Math.min(x0, x1) - (x0 === x1 ? thick / 2 : 0), maxX: Math.max(x0, x1) + (x0 === x1 ? thick / 2 : 0), minZ: Math.min(z0, z1) - (z0 === z1 ? thick / 2 : 0), maxZ: Math.max(z0, z1) + (z0 === z1 ? thick / 2 : 0) });
    return mesh;
  };
  const box = (x, z, w, h, d, mat, y = 0, solid = true) => {
    const mesh = part(new THREE.BoxGeometry(w, h, d), mat, 0.03);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return mesh;
  };
  const floor = (x0, z0, x1, z1, map) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshLambertMaterial({ map, color: 0xffffff }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.position.set((x0 + x1) / 2, 0.01, (z0 + z1) / 2);
    group.add(mesh);
  };
  const plaque = (x, y, z, w, h, map, rotY = 0) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(0xffffff, { map }));
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    group.add(mesh);
    return mesh;
  };
  const tag = (text, x, y, z, color = '#3aa3ff') => {
    const sprite = label(text, { border: color, size: 40 });
    sprite.scale.multiplyScalar(0.5);
    sprite.userData.roomTag = true;   // o mundo esconde a placa quando o jogador chega perto
    sprite.position.set(x, y, z);
    group.add(sprite);
    return sprite;
  };
  const deskParts = new Map();
  const deskPart = (color, item) => {
    if (!deskParts.has(color)) deskParts.set(color, []);
    deskParts.get(color).push(item);
  };
  const desk = (x, z, top = 0x80604b) => {
    deskPart(0x34313e, [x, 0.785, z, 1.42, 0.1, 0.82]);
    deskPart(top, [x, 0.817, z, 1.4, 0.065, 0.8]);
    for (const sx of [-0.62, 0.62]) for (const sz of [-0.32, 0.32]) deskPart(0x34313e, [x + sx, 0.38, z + sz, 0.05, 0.76, 0.05]);
    deskPart(0x3c4a66, [x, 0.475, z + 0.69, 0.6, 0.09, 0.48]);
    deskPart(0x3c4a66, [x, 0.7, z + 0.91, 0.6, 0.44, 0.07]);
    for (const sx of [-0.23, 0.23]) for (const sz of [0.5, 0.88]) deskPart(0x34313e, [x + sx, 0.215, z + sz, 0.045, 0.43, 0.045]);
    deskPart(0x93806a, [x, 0.006, z + 0.28, 1.5, 0.01, 1.5]);   // sombra de contato no piso
    colliders.push({ minX: x - 0.7, maxX: x + 0.7, minZ: z - 0.4, maxZ: z + 0.95 });
  };
  const finish = () => { for (const [color, items] of deskParts) details(group, color, items); deskParts.clear(); };
  const plant = (x, z) => {
    box(x, z, 0.6, 0.5, 0.6, material(0x78604f), 0);
    box(x, z, 0.65, 0.08, 0.65, material(0xc4aa81), 0.43, false);
    const leaf = new THREE.SphereGeometry(1, 7, 5);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      const sprig = new THREE.Mesh(leaf, material(i % 2 ? 0x6caa7b : 0x3d8265));
      sprig.scale.set(0.18, 0.52, 0.12);
      sprig.rotation.set(Math.sin(a) * 0.45, a, Math.cos(a) * 0.45);
      group.add(at(sprig, x + Math.cos(a) * 0.18, 0.98, z + Math.sin(a) * 0.18));
    }
  };
  return { wall, box, floor, plaque, tag, desk, plant, finish };
}

const WALL = 3.2;
const LOW = 0.8;

// Cor do fundo dos interiores (usada pelo mundo) e do degradê em que a área externa some.
export const INTERIOR_BACKDROP = 0x0a1322;

// Lado de fora da parede frontal cortada. A câmera enxerga além dela, então em vez de um
// vazio preto há a calçada da saída, a grama do pátio e um degradê até o fundo da cena.
function apron(group, x0, x1, z, night) {
  const width = x1 - x0 + 14, cx = (x0 + x1) / 2, depth = 15;
  const lambert = (map) => new THREE.MeshLambertMaterial({ map, color: 0xffffff });
  const ground = (x, zc, w, d, material, y) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    group.add(at(mesh, x, y, zc));
    return mesh;
  };
  const stone = floorTexture(night ? '#38445e' : '#c6d0dc', night ? '#334058' : '#bac5d2', 1);
  stone.repeat.set(width / 2.4, 4 / 2.4);
  ground(cx, z + 2, width, 4, lambert(stone), 0.004);
  const walk = stone.clone();
  walk.repeat.set(3.6 / 2.4, (depth - 4) / 2.4);
  ground(0, z + 4 + (depth - 4) / 2, 3.6, depth - 4, lambert(walk), 0.006);
  const lawn = painted(8, 64, (g, w, h) => {
    g.fillStyle = night ? '#1f3d3a' : '#7cbc6d'; g.fillRect(0, 0, w, h);
    g.fillStyle = night ? '#1b3734' : '#72b064'; g.fillRect(0, 0, w, h / 2);
  });
  lawn.wrapS = lawn.wrapT = THREE.RepeatWrapping;
  lawn.repeat.set(1, (depth - 4) / 2.4);
  ground(cx, z + 4 + (depth - 4) / 2, width, depth - 4, lambert(lawn), 0.002);
  // meio-fio entre a calçada e a grama, aberto no caminho
  const curb = toon(night ? 0x4c5873 : 0xe6ecf2);
  for (const [a, b] of [[x0 - 7, -1.8], [1.8, x1 + 7]]) {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.1, 0.22), curb);
    group.add(at(piece, (a + b) / 2, 0.05, z + 4));
  }
  // sebes baixas dos dois lados do caminho
  const hedge = toon(night ? 0x24483f : 0x3f8a5c);
  for (const sx of [-1, 1]) {
    const bush = part(new THREE.BoxGeometry(5.5, 0.6, 0.9), hedge, 0.02);
    bush.castShadow = true;
    group.add(at(bush, sx * 5.2, 0.3, z + 5.4));
  }
  // degradê até a cor do fundo, por cima da grama
  const fadeMap = painted(4, 128, (g, w, h) => {
    const c = `#${INTERIOR_BACKDROP.toString(16).padStart(6, '0')}`;
    const fade = g.createLinearGradient(0, h, 0, 0);
    fade.addColorStop(0, c + '00');
    fade.addColorStop(0.55, c + (night ? 'b0' : '70'));
    fade.addColorStop(1, c + 'ff');
    g.fillStyle = fade; g.fillRect(0, 0, w, h);
  });
  const veil = basic(0xffffff, { map: fadeMap, transparent: true, depthWrite: false });
  ground(cx, z + 5 + (depth - 5) / 2, width + 0.2, depth - 5, veil, 0.7).renderOrder = 2;
}

// =============================== PRÉDIO PRINCIPAL ===============================
// Mancha de sol no chão, ao lado de uma janela (só de dia). Bordas suaves, mistura aditiva.
let sunMap = null;
function sunPatch(group, x, z, w, d, turn = 0, opacity = 0.2) {
  sunMap ||= painted(128, 128, (g, W, H) => { g.filter = 'blur(10px)'; g.fillStyle = '#fff'; g.fillRect(18, 18, W - 36, H - 36); });
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: sunMap, color: 0xfff4dc, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  patch.rotation.set(-Math.PI / 2, 0, turn);
  patch.position.set(x, 0.025, z);
  group.add(patch);
}

// Cartaz de parede com material iluminado (escurece à noite, ao contrário das placas).
function poster(group, x, y, z, w, h, draw, turn) {
  const map = painted(128, Math.round(128 * h / w), draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon(0xffffff, { map }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = turn;
  group.add(mesh);
}
const posterArt = {
  python: (g, w, h) => { g.fillStyle = '#1d3f73'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffc93c'; g.fillRect(12, 14, w - 24, 26); g.fillStyle = '#1d3f73'; g.font = 'bold 18px sans-serif'; g.fillText('PYTHON', 22, 34); g.fillStyle = '#9fd2f5'; for (let i = 0; i < 6; i++) g.fillRect(14, 58 + i * 16, 30 + (i * 37) % 70, 6); },
  agenda: (g, w, h) => { g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f6fc7'; g.fillRect(0, 0, w, 24); for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { g.fillStyle = (r + c) % 3 ? '#dfe6ee' : '#ffc93c'; g.fillRect(8 + c * 23, 34 + r * 22, 19, 17); } },
  mapa: (g, w, h) => { g.fillStyle = '#cfe8fb'; g.fillRect(0, 0, w, h); g.fillStyle = '#74ad7c'; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.38, h * 0.34, 0, 0, 6.3); g.fill(); g.fillStyle = '#e3e9f0'; for (const [px, py] of [[50, 40], [80, 50], [60, 80], [40, 70]]) g.fillRect(px, py, 12, 9); },
  ranking: (g, w, h) => { g.fillStyle = '#0d1728'; g.fillRect(0, 0, w, h); [['#ffc93c', 96], ['#4fc8ff', 74], ['#5eea9a', 52], ['#ff3355', 10]].forEach(([c, len], i) => { g.fillStyle = c; g.fillRect(14, 22 + i * 26, len, 14); }); },
};

export function buildSchool(night = false) {
  const group = new THREE.Group();
  const colliders = [];
  const { wall, box, floor, plaque, tag, desk, plant, finish } = kit(group, colliders);
  const wallMat = toon(0xe8eef4);
  const trimMat = toon(0x24497f);
  const lowMat = toon(0x2e5a97);

  floor(-22, 0, 22, 6, floorTexture('#5a6b82', '#506076', 16));
  floor(-18, -14, -2, 0, floorTexture('#a08b70', '#937e64', 8, true));
  floor(2, -12, 16, 0, floorTexture('#2e5a48', '#27503f', 6));
  apron(group, -22, 22, 6, night);

  // corredor: parede sul baixa com a saída no meio; fundos com janelas
  wall(-22, 6, -1.8, 6, LOW, lowMat);
  wall(1.8, 6, 22, 6, LOW, lowMat);
  wall(-22, 0, -22, 6, WALL, wallMat);
  wall(22, 0, 22, 6, WALL, wallMat);
  // parede entre corredor e salas: baixa, com as duas portas
  wall(-22, 0, -11.6, 0, LOW, lowMat);
  wall(-8.4, 0, 8.4, 0, LOW, lowMat);
  wall(11.6, 0, 22, 0, LOW, lowMat);
  // Sala da Turma D
  wall(-18, -14, -2, -14, WALL, wallMat);
  wall(-18, -14, -18, 0, WALL, wallMat);
  wall(-2, -14, -2, 0, WALL, wallMat);
  plaque(-10, 2.1, -13.82, 7, 3, boardTexture());
  plaque(-4.2, 2.2, -13.82, 2, 2.2, classesTexture());
  plaque(-17.82, 2.2, -8, 3.4, 2.2, windowTexture(night), Math.PI / 2);
  plaque(-17.82, 2.2, -3.5, 3.4, 2.2, windowTexture(night), Math.PI / 2);
  if (!night) for (const z of [-8, -3.5]) sunPatch(group, -15.2, z + 0.6, 5, 3.2, 0.25);
  poster(group, -2.17, 2.3, -10.5, 1.6, 2.1, posterArt.python, -Math.PI / 2);
  poster(group, -2.17, 2.3, -7.4, 1.8, 1.6, posterArt.agenda, -Math.PI / 2);
  poster(group, -2.17, 2.3, -4.2, 1.6, 1.6, posterArt.ranking, -Math.PI / 2);
  box(-10, -12.2, 3, 0.95, 1, toon(0x2a1f2a));
  for (const z of [-10, -7, -4]) for (const x of [-15, -11.8, -8.6, -5.4]) desk(x, z);
  tag('SALA DA TURMA D', -10, 1.7, -0.2, '#ff3355');
  // Clube de Código Criativo
  wall(2, -12, 16, -12, WALL, wallMat);
  wall(2, -12, 2, 0, WALL, wallMat);
  // vitrine de troféus na parede maciça entre a Sala D e o clube, virada para o corredor
  box(0, 0.16, 3.3, 2.1, 0.3, toon(0x3b2a26), 0.92, false);
  plaque(0, 1.97, 0.32, 3.1, 1.9, painted(320, 196, (g, w, h) => {
    g.fillStyle = '#3b2a26'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16233a'; g.fillRect(10, 10, w - 20, h - 48);
    g.fillStyle = 'rgba(190,225,255,.16)'; g.beginPath(); g.moveTo(10, 10); g.lineTo(120, 10); g.lineTo(40, h - 38); g.lineTo(10, h - 38); g.fill();
    for (const y of [70, 140]) { g.fillStyle = '#c4a17a'; g.fillRect(10, y, w - 20, 5); }
    const cup = (x, y, s, c) => {
      g.fillStyle = c;
      g.beginPath(); g.moveTo(x - 12 * s, y - 34 * s); g.lineTo(x + 12 * s, y - 34 * s); g.lineTo(x + 7 * s, y - 16 * s); g.lineTo(x - 7 * s, y - 16 * s); g.fill();
      g.fillRect(x - 2 * s, y - 16 * s, 4 * s, 9 * s); g.fillRect(x - 8 * s, y - 7 * s, 16 * s, 7 * s);
    };
    cup(60, 70, 1.3, '#ffc93c'); cup(160, 70, 1.6, '#ffd75e'); cup(260, 70, 1.2, '#c9d3de');
    for (const [x, c] of [[50, '#ffc93c'], [90, '#c9d3de'], [130, '#d68a54']]) { g.fillStyle = '#2f6fc7'; g.fillRect(x - 3, 92, 6, 22); g.fillStyle = c; g.beginPath(); g.arc(x, 122, 10, 0, 6.3); g.fill(); }
    cup(220, 140, 1.1, '#d68a54'); cup(270, 140, 1.0, '#ffc93c');
    g.fillStyle = '#ffc93c'; g.font = 'bold 22px Anton, Impact, sans-serif'; g.textAlign = 'center';
    g.fillText('MÉRITO · ACADEMIA PYRA', w / 2, h - 13);
  }));
  wall(16, -12, 16, 0, WALL, wallMat);
  plaque(9, 2.4, -11.82, 6, 1.4, sign('CLUBE DE CÓDIGO CRIATIVO', '#0b1a12', '#5fd39a', 1024));
  plaque(15.82, 2.2, -6, 3.6, 2.2, windowTexture(night), -Math.PI / 2);
  if (!night) sunPatch(group, 13.3, -5.4, 5, 3.4, -0.25);
  poster(group, 2.17, 2.3, -9.6, 1.6, 2.1, posterArt.python, Math.PI / 2);
  poster(group, 2.17, 2.3, -6.2, 1.8, 1.6, posterArt.mapa, Math.PI / 2);
  for (const x of [4, 6.2, 11.8, 14]) box(x, -11.3, 2, 2.6, 0.8, toon(0x4a3326));
  for (const [x, z] of [[5, -6], [13, -6]]) {
    box(x, z, 2.4, 0.08, 1.2, toon(0xf1ece0), 0.76, false);
    box(x, z, 2.2, 0.76, 1, toon(0x2a2a3a), 0);
    box(x - 0.5, z - 0.2, 0.7, 0.5, 0.06, toon(0x0b0b12), 0.84, false);
    plaque(x - 0.5, 1.09, z - 0.16, 0.6, 0.4, painted(64, 48, (g) => { g.fillStyle = '#062a18'; g.fillRect(0, 0, 64, 48); g.fillStyle = '#5fd39a'; g.fillRect(6, 8, 40, 4); g.fillRect(6, 18, 28, 4); g.fillRect(6, 28, 44, 4); }));
  }
  box(9, -9.6, 2.2, 0.85, 1.1, toon(0x3a2a26));
  plant(3, -1.2);
  plant(15, -1.2);
  tag('CLUBE', 10, 1.7, -0.2, '#5fd39a');
  // volumes maciços entre as salas e nas pontas do prédio
  const mass = toon(0xc7cfd9);
  box(0, -7, 4.3, WALL, 14, mass);
  box(-20, -7, 4.3, WALL, 14, mass);
  box(19, -6, 6.3, WALL, 12, mass);
  // corredor: armários e mural
  for (const x of [-21.2, -20.0, -18.8, 17.8, 19.0, 20.2]) box(x, 0.45, 1.1, 2.2, 0.5, toon(0x3a4a6a));
  plaque(-21.82, 2, 3, 3, 2, classesTexture(), Math.PI / 2);
  plaque(21.82, 2, 3, 3, 2, windowTexture(night), -Math.PI / 2);
  if (!night) sunPatch(group, 19.6, 3.4, 4.4, 2.8, -0.25);
  box(0, 6, 3.6, 0.04, 0.2, trimMat, LOW, false);

  finish();

  // Detalhes de superfície preservam os corredores e os pontos de interação.
  const lockerMap = painted(128, 256, (g, w, h) => {
    g.fillStyle = '#65768c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a5a9b0'; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#334256'; for (let i = 0; i < 4; i++) g.fillRect(28, 24 + i * 10, 72, 3);
    g.fillStyle = '#e3d9bb'; g.fillRect(91, 118, 8, 34);
    g.fillStyle = '#334256'; g.fillRect(93, 133, 4, 5);
    g.fillStyle = '#d1c7b5'; g.fillRect(42, 75, 44, 14);
  });
  for (const x of [-21.2, -20.0, -18.8, 17.8, 19.0, 20.2]) plaque(x, 1.1, 0.709, 1.03, 2.12, lockerMap);
  for (const [i, x] of [4, 6.2, 11.8, 14].entries()) plaque(x, 1.35, -10.889, 1.85, 2.42, booksTexture(i));
  const notebooks = [], pages = [];
  for (const z of [-10, -7, -4]) for (const x of [-15, -11.8, -8.6, -5.4]) {
    notebooks.push([x + 0.23, 0.854, z, 0.43, 0.025, 0.3]);
    pages.push([x + 0.23, 0.873, z, 0.39, 0.012, 0.27]);
  }
  details(group, 0x3f67a8, notebooks);
  details(group, 0xf0e4c9, pages);
  details(group, 0xbda985, [[-10, 0.58, -13.67, 7.25, 0.08, 0.3], [-13.58, 2.1, -13.78, 0.08, 3.1, 0.08], [-6.42, 2.1, -13.78, 0.08, 3.1, 0.08]]);
  details(group, 0xe7dec7, [[5, 0.87, -5.57, 0.72, 0.04, 0.24], [13, 0.87, -5.57, 0.72, 0.04, 0.24]]);
  lighting(group, night, [[-10, 2.98, -13.58], [9, 2.98, -11.58], [-19.5, 2.7, 0.85], [19, 2.7, 0.85]]);

  return {
    group, colliders,
    bounds: { minX: -21.6, maxX: 21.6, minZ: -13.6, maxZ: 7.2 },
    spawns: { entrada: [0, 4.6, Math.PI], salaD: [-10, -1.4, Math.PI], clube: [10, -1.4, Math.PI] },
    doors: [{ x: 0, z: 6.9, r: 1.7, to: 'campus', spawn: 'sala', label: 'Sair para o pátio' }],
    hotspots: [
      { key: 'quadro', x: -10, z: -11, r: 1.8, label: 'Quadro de missões' },
      { key: 'carteira', x: -5.4, z: -2.6, r: 1.3, label: 'Sua carteira' },
      { key: 'telao', x: -4.2, z: -12.6, r: 1.4, label: 'Telão do Sistema S' },
      { key: 'pc-clube', x: 5, z: -4.6, r: 1.5, label: 'PC do clube' },
      { key: 'mural', x: -20.6, z: 3, r: 1.6, label: 'Mural do Sistema S' },
    ],
    spots: {
      aft: { vesper: [-12.9, -11.5, 0.3], ayumi: [-16.7, -8, 0.6], caio: [-6.6, -12.4, 0], davi: [-3.3, -11.8, -0.4], nina: [-3.3, -9, -0.5], lucas: [-3.3, -6, -0.5], italo: [-16.7, -4.8, 0.6], monika: [9, -8.4, 0], valentim: [14, 3, -0.6], bernardo: [-17, 3.2, 0.5], kiara: [5, 3.4, 0] },
      night: { monika: [9, -8.4, 0], vesper: [-12.9, -11.5, 0.3] },
    },
    camera: { h: 7.2, d: 7.4 },
  };
}

// =============================== DORMITÓRIO ===============================
export function buildDorm(night = false) {
  const group = new THREE.Group();
  const colliders = [];
  const { wall, box, floor, plaque, tag, plant } = kit(group, colliders);
  const wallMat = toon(0x2b3b58);
  const lowMat = toon(0x3a5687);
  floor(-12, -10, 12, 0, floorTexture('#344462', '#2e3c57', 10));
  floor(12, -10, 22, -2, floorTexture('#80634f', '#745944', 5, true));
  apron(group, -12, 22, 0, night);
  wall(-12, 0, -1.8, 0, LOW, lowMat);
  wall(1.8, 0, 12, 0, LOW, lowMat);
  wall(-12, -10, 12, -10, WALL, wallMat);
  wall(-12, -10, -12, 0, WALL, wallMat);
  wall(12, -2, 12, 0, WALL, wallMat);
  wall(12, -10, 12, -7.6, WALL, wallMat);
  wall(12, -4.4, 12, -2, WALL, wallMat);
  // quarto 404-D
  wall(12, -10, 22, -10, WALL, wallMat);
  wall(22, -10, 22, -2, WALL, wallMat);
  wall(12, -2, 22, -2, LOW, lowMat);
  for (const x of [-7, 0, 7]) plaque(x, 2.2, -9.82, 3, 2, windowTexture(night));
  if (!night) for (const x of [-7, 0, 7]) sunPatch(group, x + 0.6, -7.6, 2.8, 4.4, 0.25, 0.16);
  plaque(17, 2.2, -9.82, 2.4, 1.8, windowTexture(night));
  // saguão: sofás, TV, máquina de bebidas, balcão
  box(0, -9.4, 4, 2, 0.4, toon(0x0b0b12), 0.6);
  plaque(0, 1.6, -9.18, 3.6, 1.6, painted(256, 128, (g, w, h) => { g.fillStyle = '#101830'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffc93c'; g.font = `40px ${POSTER}`; g.fillText('SISTEMA S', 20, 60); g.fillStyle = '#ff3355'; g.fillRect(20, 80, 140, 20); }));
  box(-2.4, -5.6, 2.6, 0.7, 1, toon(0x2f5d9e));
  box(2.4, -5.6, 2.6, 0.7, 1, toon(0x2f5d9e));
  box(0, -3.6, 2, 0.45, 1, toon(0x3a2626));
  box(10.6, -9, 1.4, 2.2, 0.9, toon(0x4fc8ff));
  box(-9, -2.6, 3.6, 1.1, 1, toon(0x3a2a26));
  plant(-11, -9);
  plant(11, -1);
  // quarto: cama, escrivaninha, estante
  box(20.4, -7, 2.6, 0.55, 3.6, toon(0xf1ece0));
  box(20.4, -8.4, 2.6, 0.3, 0.8, toon(0xffffff), 0.55, false);
  box(14.2, -9.2, 2.2, 0.8, 1, toon(0x3a2a26));
  box(13.7, -9.3, 0.7, 0.5, 0.06, toon(0x0b0b12), 0.8, false);
  box(16.8, -9.5, 1.2, 2.2, 0.6, toon(0x4a3326));
  tag('QUARTO 404-D', 17, 1.6, -1.6, '#f5f2ea');

  const sofaDetails = [], cushions = [];
  for (const x of [-2.4, 2.4]) {
    sofaDetails.push([x, 0.92, -5.99, 2.6, 0.64, 0.19]);
    for (const side of [-1, 1]) sofaDetails.push([x + side * 1.18, 0.6, -5.6, 0.22, 0.55, 1]);
    for (const side of [-1, 1]) cushions.push([x + side * 0.56, 0.735, -5.55, 1.05, 0.09, 0.78]);
  }
  details(group, 0x2e5488, sofaDetails);
  details(group, 0x7fb3e8, cushions);
  details(group, 0x3b679f, [[20.4, 0.587, -6.3, 2.52, 0.074, 2.08]]);
  details(group, 0xd5afaa, [[20.4, 0.634, -7.17, 2.52, 0.025, 0.28], [20.4, 0.634, -5.48, 2.52, 0.025, 0.1]]);
  plaque(16.8, 1.14, -9.187, 1.08, 2.04, booksTexture(3));
  plaque(13.7, 1.05, -9.259, 0.61, 0.39, painted(128, 80, (g, w, h) => {
    g.fillStyle = '#142b33'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#71c6b1' : '#d4b47a'; g.fillRect(12 + (i % 2) * 9, 12 + i * 11, 64 + (i * 17 % 32), 3); }
  }));
  plaque(10.6, 1.14, -8.539, 1.25, 1.96, painted(192, 288, (g, w, h) => {
    g.fillStyle = '#e6d9c1'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#152c3d'; g.fillRect(12, 36, 126, 172);
    const colors = ['#da6770', '#d8bb75', '#76b8ad'];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
      g.fillStyle = colors[(row + col) % 3]; g.fillRect(22 + col * 28, 49 + row * 51, 16, 34);
      g.fillStyle = '#f5ead0'; g.fillRect(22 + col * 28, 51 + row * 51, 16, 3);
    }
    g.fillStyle = '#324a54'; g.fillRect(151, 71, 22, 70); g.fillRect(32, 232, 104, 28);
    g.fillStyle = '#8fd2b4'; g.fillRect(155, 76, 14, 18);
    g.fillStyle = '#766558'; g.fillRect(151, 167, 24, 6);
  }));
  // Tapete plano no saguão, sem criar qualquer obstáculo.
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), basic(0xffffff, { map: painted(256, 128, (g, w, h) => {
    g.fillStyle = '#2f4566'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#9fc4ea'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16);
    g.strokeStyle = '#5c7aa3'; g.lineWidth = 1; g.strokeRect(13, 13, w - 26, h - 26);
  }) }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.016, -4.5); rug.receiveShadow = true; group.add(rug);
  lighting(group, night, [[-7, 2.8, -9.57], [7, 2.8, -9.57], [17.1, 2.8, -9.57]]);
  return {
    group, colliders,
    bounds: { minX: -11.6, maxX: 21.6, minZ: -9.6, maxZ: 1.2 },
    spawns: { entrada: [0, -1.4, Math.PI], quarto: [15, -4, Math.PI] },
    doors: [{ x: 0, z: 0.9, r: 1.7, to: 'campus', spawn: 'dorm', label: 'Sair para o pátio' }],
    hotspots: [
      { key: 'cama', x: 18.6, z: -6, r: 1.6, label: 'Sua cama' },
      { key: 'escrivaninha', x: 14.2, z: -8, r: 1.4, label: 'Escrivaninha' },
      { key: 'avisos', x: -9, z: -1.6, r: 1.6, label: 'Balcão e quadro de avisos' },
      { key: 'maquina', x: 10.6, z: -7.9, r: 1.3, label: 'Máquina de bebidas' },
    ],
    spots: {
      aft: { icaro: [0, -5.1, 0], maya: [8, -3, -0.5] },
      night: { kiara: [-2.4, -4.4, 0.2], samuel: [6, -8.6, 0], icaro: [2.4, -4.4, -0.2], maya: [9, -3, -0.5], valentim: [-6, -6, 0.5] },
    },
    camera: { h: 7.2, d: 7.4 },
  };
}

// =============================== GALERIA JACARANDÁ ===============================
export function buildMall(night = false) {
  const group = new THREE.Group();
  const colliders = [];
  const { wall, box, floor, plaque, tag, plant } = kit(group, colliders);
  const wallMat = toon(0x2c3f5e);
  const lowMat = toon(0x2a5a6a);
  floor(-18, -10, 18, 0, floorTexture('#dfe6ee', '#cfd8e3', 12));
  apron(group, -18, 18, 0, night);
  wall(-18, 0, -1.8, 0, LOW, lowMat);
  wall(1.8, 0, 18, 0, LOW, lowMat);
  wall(-18, -10, 18, -10, WALL + 0.8, wallMat);
  wall(-18, -10, -18, 0, WALL, wallMat);
  wall(18, -10, 18, 0, WALL, wallMat);
  const shops = [['CONVENIÊNCIA', -12, '#5eea9a'], ['LANCHONETE', -4, '#ffc93c'], ['LIVRARIA', 4, '#c98f6e'], ['ELETRÔNICOS', 12, '#4fc8ff']];
  for (const [name, x, color] of shops) {
    plaque(x, 1.4, -9.8, 5.4, 2.6, painted(256, 128, (g, w, h) => { g.fillStyle = night ? '#141420' : '#ffe6ad'; g.fillRect(0, 0, w, h); g.fillStyle = '#0b0b12'; g.fillRect(0, h - 20, w, 20); }));
    plaque(x, 3.3, -9.79, 5.4, 0.9, sign(name, '#0b0b12', color, 1024));
    const awning = part(new THREE.BoxGeometry(5.6, 0.18, 1.2), toon(new THREE.Color(color).getHex()), 0.02);
    awning.rotation.x = 0.35;
    awning.position.set(x, 2.8, -9.2);
    group.add(awning);
  }
  box(-4, -8.2, 3.4, 1, 0.8, toon(0x3a2a26));
  box(-15.6, -7, 1, 1.6, 2.4, toon(0x5eea9a));
  // fonte, bancos e plantas
  const basin = part(new THREE.CylinderGeometry(1.6, 1.8, 0.6, 20), toon(0xf1ece0), 0.02);
  basin.position.set(0, 0.3, -5);
  group.add(basin);
  group.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.05, 20), basic(0x4fc8ff)), 0, 0.58, -5));
  colliders.push({ minX: -1.8, maxX: 1.8, minZ: -6.8, maxZ: -3.2 });
  for (const x of [-9, 9]) box(x, -3, 2.6, 0.5, 0.8, toon(0x8e5a3a));
  for (const x of [-16.6, 16.6]) plant(x, -1.2);

  // Vitrines, molduras e assentos seguem dentro dos volumes já existentes.
  const frames = [], slats = [], shelfEdges = [];
  for (const [name, x] of shops) {
    frames.push([x - 2.66, 1.4, -9.72, 0.08, 2.64, 0.08], [x + 2.66, 1.4, -9.72, 0.08, 2.64, 0.08], [x, 1.4, -9.72, 0.07, 2.6, 0.08], [x, 0.13, -9.72, 5.4, 0.07, 0.08]);
    if (name === 'LIVRARIA') plaque(x, 1.45, -9.71, 4.9, 2.3, booksTexture(7));
    else plaque(x, 1.4, -9.73, 5.1, 2.35, painted(384, 192, (g, w, h) => {
      g.fillStyle = night ? '#25313a' : '#877862'; g.fillRect(0, 0, w, h);
      const shades = ['#d49c87', '#a1c6b3', '#e1c796', '#8aa9c5'];
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 10; i++) {
          g.fillStyle = shades[(i + row) % 4];
          g.fillRect(14 + i * 36, 25 + row * 82 + (i % 3) * 5, 23, 43 - (i % 3) * 5);
        }
        g.fillStyle = '#d1b68c'; g.fillRect(0, 72 + row * 82, w, 5);
      }
      g.fillStyle = 'rgba(255,244,221,.09)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(210, 0); g.lineTo(80, h); g.lineTo(0, h); g.fill();
    }));
  }
  for (const x of [-9, 9]) {
    for (let i = 0; i < 4; i++) slats.push([x, 0.53, -3.3 + i * 0.2, 2.6, 0.06, 0.15]);
    shelfEdges.push([x - 0.95, 0.22, -3, 0.18, 0.44, 0.7], [x + 0.95, 0.22, -3, 0.18, 0.44, 0.7]);
  }
  details(group, 0xd1b790, frames);
  details(group, 0xba855a, slats);
  details(group, 0x3b3943, shelfEdges);
  const rippleMat = basic(0xd9f5ed, { transparent: true, opacity: 0.48, depthWrite: false });
  for (const r of [0.42, 0.8, 1.18]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.025, 36), rippleMat);
    ring.rotation.x = -Math.PI / 2; group.add(at(ring, 0, 0.612, -5));
  }
  for (const x of [-16.6, 16.6]) plant(x, -1.2);   // cantos da frente, longe da entrada
  lighting(group, night, shops.map(([, x]) => [x, 3.86, -9.54]));
  return {
    group, colliders,
    bounds: { minX: -17.6, maxX: 17.6, minZ: -9.6, maxZ: 1.2 },
    spawns: { entrada: [0, -1.4, Math.PI] },
    doors: [{ x: 0, z: 0.9, r: 1.7, to: 'campus', spawn: 'galeria', label: 'Sair para o pátio' }],
    hotspots: [
      { key: 'conveniencia', x: -12, z: -8.4, r: 1.8, label: 'Loja de conveniência' },
      { key: 'lanchonete', x: -4, z: -7.2, r: 1.6, label: 'Balcão da lanchonete' },
      { key: 'livraria', x: 4, z: -8.4, r: 1.8, label: 'Livraria' },
      { key: 'eletronicos', x: 12, z: -8.4, r: 1.8, label: 'Eletrônicos' },
      { key: 'gratis', x: -14.6, z: -7, r: 1.3, label: 'Prateleira de itens gratuitos' },
    ],
    spots: {
      aft: { dulce: [-4, -9.1, 0], lara: [-8, -5, 0.4], bia: [-6.4, -2.6, 0.2], fabio: [13.2, -4.6, -0.4], jade: [7, -5.4, -0.2], mateus: [10.6, -2.6, -0.5] },
      night: { dulce: [-4, -9.1, 0] },
    },
    camera: { h: 7.2, d: 7.4 },
  };
}
