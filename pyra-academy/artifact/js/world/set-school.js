// Cenários internos: o corredor, a Sala Ômega e o Laboratório 404.
import * as THREE from './three.js';
import { Batch, V3, PAL, FONT, std, lit, halo, plate, beam, canvasTexture, crestTexture, drawCrest, motes, rng } from './kit.js';
import { defineSet, pointScale, world } from './engine.js';

const HALF = Math.PI / 2;

// ---------- texturas compartilhadas ----------
let sunsetTex;
const sunset = () => (sunsetTex ||= canvasTexture(256, 512, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2a1f6b');
  g.addColorStop(0.5, '#b2518f');
  g.addColorStop(0.82, '#ffb877');
  g.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.6, h * 0.72, 0, w * 0.6, h * 0.72, 150);
  sun.addColorStop(0, 'rgba(255,240,200,1)');
  sun.addColorStop(0.18, 'rgba(255,225,170,.9)');
  sun.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1a1338';
  ctx.beginPath();
  ctx.moveTo(0, h);
  [[0, 0.86], [0.2, 0.8], [0.4, 0.87], [0.62, 0.78], [0.8, 0.86], [1, 0.8]].forEach(([x, y]) => ctx.lineTo(x * w, y * h));
  ctx.lineTo(w, h);
  ctx.fill();
}));

const floorTexture = (base, line, repeat) => canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.012 + (i % 5) * 0.004})`; ctx.fillRect((i * 53) % w, (i * 97) % h, 60 + (i * 31) % 90, 2); }
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
}, { repeat });

/** Parede com janelas ao pôr do sol, fachos de luz e manchas claras no chão. */
function windowWall(b, scene, o) {
  const { x, facing, z0, z1, height, centers, width, sill, top, wall, frame } = o;
  const length = Math.abs(z1 - z0);
  const mid = (z0 + z1) / 2;
  const thick = 0.3;
  const wx = x - facing * thick / 2;
  b.box(wall, thick, sill, length, wx, sill / 2, mid);
  b.box(wall, thick, height - top, length, wx, (height + top) / 2, mid);
  const edges = [Math.max(z0, z1), ...[...centers].sort((p, n) => n - p).flatMap((c) => [c + width / 2, c - width / 2]), Math.min(z0, z1)];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i];
    const c = edges[i + 1];
    if (a - c > 0.01) b.box(wall, thick, top - sill, a - c, wx, (sill + top) / 2, (a + c) / 2);
  }
  const pane = lit(0xffffff, 1.32, { map: sunset() });
  for (const c of centers) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, top - sill), pane);
    glass.position.set(x - facing * 0.24, (sill + top) / 2, c);
    glass.rotation.y = facing * HALF;
    scene.add(glass);
    const fx = x + facing * 0.02;
    b.box(frame, 0.09, 0.09, width + 0.1, fx, sill, c);
    b.box(frame, 0.09, 0.09, width + 0.1, fx, top, c);
    b.box(frame, 0.09, top - sill, 0.09, fx, (sill + top) / 2, c - width / 2);
    b.box(frame, 0.09, top - sill, 0.09, fx, (sill + top) / 2, c + width / 2);
    b.box(frame, 0.06, top - sill, 0.06, fx, (sill + top) / 2, c);
    b.box(frame, 0.06, 0.06, width, fx, sill + (top - sill) * 0.56, c);
    const reach = o.reach ?? 5;
    const skew = o.skew ?? -1.2;
    scene.add(beam([x, top, c - width / 2], [x, top, c + width / 2], [x + facing * reach, 0.03, c - width / 2 + skew], [x + facing * reach, 0.03, c + width / 2 + skew], 0xffb877, o.beam ?? 0.2));
    scene.add(beam([x + facing * 0.4, 0.03, c - width / 2 + skew * 0.1], [x + facing * 0.4, 0.03, c + width / 2 + skew * 0.1], [x + facing * reach, 0.03, c - width / 2 + skew], [x + facing * reach, 0.03, c + width / 2 + skew], 0xffa860, (o.beam ?? 0.2) * 0.8));
  }
}

function sunLight(color, intensity, from, to, span) {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...from);
  light.target.position.set(...to);
  const c = light.shadow.camera;
  c.left = -span; c.right = span; c.top = span; c.bottom = -span; c.near = 0.5; c.far = 60;
  light.shadow.bias = -0.0008;
  light.shadow.normalBias = 0.03;
  return light;
}

// =============================== CORREDOR ===============================
const DOORS = [['CAIO MONTENEGRO', 600, '#ff7350'], ['YUKI ARASHI', 1000, '#79d6ff'], ['THEO LINDQVIST', 1450, '#86ecb0'], ['BIANCA FERRAZ', 1900, '#ff7ab8'], ['SORA KANZAKI', 2400, '#e7ddb8']];

defineSet('hall', (q) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090b1c);
  scene.fog = new THREE.Fog(0x10122c, 12, 56);
  const W = 2.7, H = 4.4, Z0 = 4.5, Z1 = -30;
  const L = Z0 - Z1;
  const mid = (Z0 + Z1) / 2;
  const b = new Batch();
  const wall = std(0x171c40, { rough: 0.9 });
  const wall2 = std(0x12163a, { rough: 0.9 });
  const gold = std(PAL.gold, { rough: 0.35, metal: 0.8, emissive: PAL.gold, ei: 0.25 });
  const doorMat = std(0x1a2148, { rough: 0.6 });
  const frameMat = std(0x2c3566, { rough: 0.6 });

  b.quad(std(0xffffff, { map: floorTexture('#161b40', 'rgba(120,130,210,.28)', [3, 19]), rough: 0.32, metal: 0.15 }), W * 2, L, 0, 0, mid, -HALF);
  b.quad(std(0x0f1330, { rough: 1 }), W * 2, L, 0, H, mid, HALF);
  b.box(wall2, 0.3, H, L, W + 0.15, H / 2, mid);
  b.box(wall2, W * 2 + 0.6, H, 0.3, 0, H / 2, Z1 - 0.15);
  b.box(wall2, W * 2 + 0.6, H, 0.3, 0, H / 2, Z0 + 0.15);
  const centers = [-1, -7, -13, -19, -25];
  windowWall(b, scene, { x: -W, facing: 1, z0: Z0, z1: Z1, height: H, centers, width: 2.9, sill: 0.75, top: 3.75, wall, frame: gold, reach: 4.6, skew: -1.6, beam: 0.26 });
  for (const side of [-1, 1]) b.box(gold, 0.05, 0.1, L, side * (W - 0.03), 0.1, mid);
  for (let z = 1; z > Z1; z -= 5.5) {
    b.box(lit(0xffe6ad, 2.3), 1.7, 0.05, 0.26, 0, H - 0.03, z);
    b.box(std(0x1b2046), 2.0, 0.1, 0.5, 0, H - 0.02, z);
  }
  // estandartes entre as janelas
  for (const z of [-4, -10, -16, -22]) {
    b.box(std(0x0d1130, { rough: 1 }), 0.05, 2.3, 1.0, -W + 0.04, 2.35, z);
    b.box(gold, 0.06, 0.06, 1.1, -W + 0.05, 3.5, z);
    scene.add(plate(crestTexture(), 0.72, 0.84, -W + 0.08, 2.5, z, HALF, { glow: 1.1, transparent: true }));
  }
  // portas com nome e número de Mérito
  const plates = [];
  DOORS.forEach(([name, merit, color], index) => {
    const z = -1.5 - index * 5;
    b.box(doorMat, 0.1, 2.5, 1.25, W - 0.03, 1.25, z);
    b.box(frameMat, 0.14, 2.62, 0.09, W - 0.03, 1.31, z - 0.67);
    b.box(frameMat, 0.14, 2.62, 0.09, W - 0.03, 1.31, z + 0.67);
    b.box(frameMat, 0.14, 0.09, 1.43, W - 0.03, 2.58, z);
    b.ball(gold, 0.05, W - 0.12, 1.2, z + 0.45);
    b.box(lit(new THREE.Color(color).getHex(), 1.6), 0.03, 0.05, 1.1, W - 0.1, 2.72, z);
    const texture = canvasTexture(384, 176, (ctx, w, h, value = merit) => {
      ctx.fillStyle = '#080b1c';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ece7db';
      ctx.font = `700 30px ${FONT.display}`;
      ctx.fillText(name, w / 2, 58);
      ctx.fillStyle = color;
      ctx.font = `700 64px ${FONT.mono}`;
      ctx.fillText(String(value), w / 2, 136);
    }, { fonts: true });
    texture.userData = { merit };
    plates.push(texture);
    scene.add(plate(texture, 0.8, 0.37, W - 0.1, 1.86, z, -HALF, { glow: 1.15 }));
  });
  // Laboratório 404 no fim do corredor
  const labZ = -26.5;
  b.box(std(0x1c1a2a, { rough: 0.6 }), 0.1, 2.5, 1.25, W - 0.03, 1.25, labZ);
  b.box(lit(0xff9f6b, 1.8), 0.04, 0.06, 1.35, W - 0.1, 2.62, labZ);
  const labSign = canvasTexture(384, 200, (ctx, w, h) => {
    ctx.fillStyle = '#111630';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9f6b';
    ctx.font = `700 92px ${FONT.mono}`;
    ctx.fillText('404', w / 2, 96);
    ctx.fillStyle = '#d4af6a';
    ctx.font = `700 24px ${FONT.display}`;
    ctx.fillText('LABORATÓRIO', w / 2, 138);
    ctx.fillStyle = '#8f9bc9';
    ctx.font = `20px ${FONT.mono}`;
    ctx.fillText('não perturbe (sério)', w / 2, 174);
  }, { fonts: true });
  scene.add(plate(labSign, 0.9, 0.47, W - 0.1, 1.75, labZ, -HALF, { glow: 1.2 }));

  // porta da Sala Ômega, ao fundo
  const end = Z1 + 0.02;
  b.quad(lit(0xffe6ad, 2.3), 1.9, 2.5, 0, 1.25, end);
  b.add(new THREE.CircleGeometry(0.95, 24, 0, Math.PI), lit(0xffe6ad, 2.3), 0, 2.5, end);
  b.box(wall2, 0.07, 3.4, 0.06, 0, 1.7, end + 0.03);
  b.add(new THREE.TorusGeometry(1.02, 0.07, 6, 24, Math.PI), gold, 0, 2.5, end + 0.04);
  for (const side of [-1, 1]) b.box(gold, 0.12, 2.5, 0.12, side * 1.02, 1.25, end + 0.04);
  const omega = canvasTexture(128, 128, (ctx) => {
    ctx.font = `700 100px ${FONT.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f3d999';
    ctx.shadowColor = '#d4af6a';
    ctx.shadowBlur = 14;
    ctx.fillText('Ω', 64, 66);
  }, { fonts: true });
  scene.add(plate(omega, 0.62, 0.62, 0, 3.92, end + 0.02, 0, { glow: 1.6, transparent: true }));
  scene.add(b.build());

  const doorGlow = halo(0xffd9a0, 9, 0.5);
  doorGlow.position.set(0, 1.9, end + 0.6);
  scene.add(doorGlow);

  scene.add(new THREE.HemisphereLight(0x8086e0, 0x1c1438, 1.0));
  const sun = sunLight(0xffb074, 2.9, [-11, 8.5, -8], [2, 0, -13], 20);
  scene.add(sun, sun.target);
  const doorLight = new THREE.PointLight(0xffd08a, 90, 20, 1.7);
  doorLight.position.set(0, 2.3, Z1 + 1.8);
  const fill = new THREE.PointLight(0xc8d0ff, 16, 16, 1.6);
  fill.position.set(0.6, 3.8, -4);
  const fill2 = fill.clone();
  fill2.position.set(0.6, 3.8, -18);
  scene.add(doorLight, fill, fill2);
  const dust = motes(Math.round(110 * q.density), [-W + 0.2, 0.2, Z1 + 1, W - 0.2, H - 0.3, Z0 - 1], 7, { size: 20, rise: 0.06 });
  scene.add(dust);

  let flick = 0;
  return {
    scene, bloom: [0.4, 0.6, 1.0], exposure: 1.08, shadowLights: [sun],
    shots: {
      vn: { pos: [0.35, 1.32, 2.6], look: [0, 1.5, -16], fov: 54 },
      walk: { pos: [0, 2.2, 4], look: [0, 1.6, -20], fov: 56 },
    },
    floor: 0, ceiling: H, spawn: new V3(0, 0, 2.6), spawnYaw: Math.PI,
    bounds: { minX: -W + 0.35, maxX: W - 0.35, minZ: Z1 + 0.5, maxZ: Z0 - 0.5 }, colliders: [],
    update(dt, t) {
      dust.userData.tick(t, pointScale());
      // «O número muda enquanto você olha.»
      flick += dt;
      if (flick > 0.5) {
        flick = 0;
        const texture = plates[Math.floor(Math.random() * plates.length)];
        texture.redraw(texture.userData.merit + Math.floor(Math.random() * 19) - 9);
      }
      doorGlow.material.opacity = 0.46 + Math.sin(t * 1.3) * 0.06;
    },
  };
});

// =============================== SALA ÔMEGA ===============================
export const SEATS = {
  caio: [-4.2, 1.0], yuki: [0, 1.0], theo: [4.2, 1.0],
  sora: [-4.2, 3.7], voce: [0, 3.7], bianca: [4.2, 3.7],
};

function boardDraw(ctx, w, h, info) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#16423c');
  g.addColorStop(1, '#0b2623');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.03)';
  for (let i = 0; i < 26; i++) ctx.fillRect((i * 173) % w, (i * 71) % h, 220, 14);
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 38px ${FONT.mono}`;
  const code = [['def', ' merito(voce):'], ['    while', ' voce.aprende():'], ['        voce.pontos += ', '1', true], ['    return', ' voce.pontos']];
  code.forEach(([a, c, number], i) => {
    const y = 96 + i * 58;
    const indent = a.match(/^ */)[0];
    let x = 56 + ctx.measureText(indent).width;
    const word = a.trimStart();
    ctx.fillStyle = number ? '#e9f5ec' : '#f7c873';
    ctx.fillText(word, x, y);
    x += ctx.measureText(word).width;
    ctx.fillStyle = number ? '#8fd8ff' : '#e9f5ec';
    ctx.fillText(c, x, y);
  });
  ctx.strokeStyle = 'rgba(233,245,236,.4)';
  ctx.setLineDash([10, 16]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(56, 346);
  ctx.lineTo(700, 346);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f7c873';
  ctx.font = `700 40px ${FONT.display}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
  ctx.fillText('MÉRITO É A ÚNICA MOEDA', 56, 426);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  // painel da missão atual, à direita
  const px = 880;
  ctx.fillStyle = 'rgba(8,24,22,.55)';
  ctx.fillRect(px, 40, w - px - 44, h - 80);
  ctx.strokeStyle = '#f7c873';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, 40, w - px - 44, h - 80);
  ctx.fillStyle = '#f7c873';
  ctx.font = `700 26px ${FONT.ui}`;
  ctx.fillText(info?.kicker || 'QUADRO DE MISSÕES', px + 28, 92);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 44px ${FONT.display}`;
  const words = String(info?.title || 'Cinco capítulos. Cinco rivais.').split(' ');
  let line = '';
  let y = 156;
  for (const word of words) {
    if (ctx.measureText(line + word).width > w - px - 100 && line) { ctx.fillText(line.trim(), px + 28, y); line = ''; y += 54; }
    line += word + ' ';
  }
  ctx.fillText(line.trim(), px + 28, y);
  ctx.fillStyle = '#bfe3d8';
  ctx.font = `500 26px ${FONT.ui}`;
  ctx.fillText(info?.progress || 'Aproxime-se para ver as missões', px + 28, h - 76);
}

function rankingDraw(ctx, w, h, rows, pulse = 0) {
  ctx.fillStyle = '#070a18';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#39457f';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4af6a';
  ctx.font = `700 44px ${FONT.display}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
  ctx.fillText('RANKING', w / 2, 70);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const list = rows?.length ? rows : [2400, 1900, 1450, 1000, 600, 0].map((merit, i) => ({ rank: i + 1, name: ['Sora', 'Bianca', 'Theo', 'Yuki', 'Caio', 'Você'][i], merit, color: '#5a6ad0', you: i === 5 }));
  const top = Math.max(...list.map((row) => row.merit), 1);
  list.forEach((row, i) => {
    const y = 112 + i * 86;
    ctx.fillStyle = row.you ? 'rgba(212,175,106,.16)' : 'rgba(255,255,255,.03)';
    ctx.fillRect(22, y, w - 44, 72);
    ctx.textAlign = 'left';
    ctx.fillStyle = row.you ? '#f3d999' : '#8f9bc9';
    ctx.font = `700 34px ${FONT.mono}`;
    ctx.fillText(`${row.rank}º`, 36, y + 34);
    ctx.fillStyle = row.you ? '#f3d999' : '#ece7db';
    ctx.font = `700 28px ${FONT.ui}`;
    ctx.fillText(String(row.name).split(' ')[0], 104, y + 32, w - 260);
    ctx.textAlign = 'right';
    ctx.font = `700 28px ${FONT.mono}`;
    ctx.fillText(row.merit.toLocaleString('pt-BR'), w - 36, y + 32);
    const width = Math.max(8, (w - 150) * (row.merit / top));
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(pulse * 2 + i);
    ctx.fillStyle = row.you ? '#d4af6a' : row.color;
    ctx.fillRect(104, y + 46, width, 12);
    ctx.globalAlpha = 1;
  });
}

function desk(b, x, z, mats) {
  b.box(mats.top, 1.5, 0.07, 0.78, x, 0.755, z);
  b.box(mats.edge, 1.5, 0.03, 0.03, x, 0.76, z - 0.39);
  b.box(mats.leg, 0.06, 0.72, 0.7, x - 0.68, 0.36, z);
  b.box(mats.leg, 0.06, 0.72, 0.7, x + 0.68, 0.36, z);
  b.box(mats.leg, 1.34, 0.42, 0.04, x, 0.5, z - 0.33);
  // cadeira
  const cz = z + 0.72;
  b.box(mats.chair, 0.46, 0.05, 0.44, x, 0.46, cz);
  b.box(mats.chair, 0.46, 0.5, 0.05, x, 0.78, cz + 0.22, 0, -0.1);
  for (const [dx, dz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) b.cyl(mats.leg, 0.02, 0.02, 0.46, x + dx, 0.23, cz + dz, 6);
  // notebook
  b.box(mats.leg, 0.46, 0.02, 0.32, x, 0.8, z + 0.08);
  b.box(mats.leg, 0.46, 0.3, 0.02, x, 0.95, z - 0.1, 0, -0.18);
}

defineSet('classroom', (q) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c1e);
  scene.fog = new THREE.Fog(0x0c1026, 16, 46);
  const W = 8, D = 6.5, H = 4.6;
  const b = new Batch();
  const wall = std(0x171c40, { rough: 0.92 });
  const wall2 = std(0x12173a, { rough: 0.92 });
  const gold = std(PAL.gold, { rough: 0.35, metal: 0.8, emissive: PAL.gold, ei: 0.25 });
  const wood = std(0x2c2016, { rough: 0.7 });

  b.quad(std(0xffffff, { map: floorTexture('#181d44', 'rgba(110,120,200,.22)', [8, 6.5]), rough: 0.42, metal: 0.1 }), W * 2, D * 2, 0, 0, 0, -HALF);
  b.quad(std(0x0e1230, { rough: 1 }), W * 2, D * 2, 0, H, 0, HALF);
  b.box(wall2, W * 2 + 0.6, H, 0.3, 0, H / 2, -D - 0.15);
  b.box(wall2, W * 2 + 0.6, H, 0.3, 0, H / 2, D + 0.15);
  b.box(wall, 0.3, H, D * 2, W + 0.15, H / 2, 0);
  windowWall(b, scene, { x: -W, facing: 1, z0: D, z1: -D, height: H, centers: [-3.6, 0.2, 4], width: 2.5, sill: 0.85, top: 3.95, wall, frame: gold, reach: 6.5, skew: -1.1, beam: 0.17 });
  for (const z of [-D + 0.03, D - 0.03]) b.box(gold, W * 2, 0.08, 0.05, 0, 0.09, z);
  b.box(gold, 0.05, 0.08, D * 2, W - 0.03, 0.09, 0);
  b.quad(lit(PAL.gold, 0.5), W * 2, 0.06, 0, 0.012, -3.9, -HALF);
  for (const x of [-4, 0, 4]) for (const z of [-3, 2]) {
    b.box(lit(0xe8ecff, 1.7), 1.9, 0.04, 0.7, x, H - 0.03, z);
    b.box(std(0x1b2046), 2.1, 0.08, 0.9, x, H - 0.01, z);
  }

  // quadro de missões (lousa)
  const board = canvasTexture(2048, 512, boardDraw, { fonts: true });
  b.box(wood, 8.1, 2.35, 0.12, 0, 2.55, -D + 0.06);
  for (const y of [1.4, 3.7]) b.box(gold, 8.16, 0.05, 0.14, 0, y, -D + 0.07);
  for (const x of [-4.06, 4.06]) b.box(gold, 0.05, 2.35, 0.14, x, 2.55, -D + 0.07);
  b.box(wood, 7.8, 0.06, 0.16, 0, 1.36, -D + 0.16);
  b.box(lit(0xffffff, 0.9), 0.22, 0.035, 0.035, -2.2, 1.41, -D + 0.18);
  b.box(lit(0xf7c873, 0.9), 0.16, 0.035, 0.035, -1.85, 1.41, -D + 0.18);
  scene.add(plate(board, 7.8, 1.95, 0, 2.56, -D + 0.13, 0, { glow: 0.92 }));

  // telão do ranking
  const rankTex = canvasTexture(512, 640, rankingDraw, { fonts: true });
  b.box(std(0x0a0d20, { rough: 0.4, metal: 0.4 }), 2.5, 3.05, 0.14, 6.05, 2.5, -D + 0.07);
  scene.add(plate(rankTex, 2.34, 2.9, 6.05, 2.5, -D + 0.15, 0, { glow: 1.25 }));

  // estandarte com o brasão
  b.box(std(0x0d1130, { rough: 1 }), 1.5, 2.6, 0.05, -6.1, 2.6, -D + 0.04);
  b.box(gold, 1.6, 0.07, 0.07, -6.1, 3.92, -D + 0.05);
  scene.add(plate(crestTexture(), 1.05, 1.23, -6.1, 2.7, -D + 0.08, 0, { glow: 1.15, transparent: true }));

  // mesa da orientadora
  b.box(std(0x232a55, { rough: 0.6 }), 3.6, 0.1, 0.95, 0, 1.0, -5.0);
  b.box(std(0x141936, { rough: 0.7 }), 3.4, 0.95, 0.8, 0, 0.475, -5.0);
  b.box(lit(PAL.gold, 0.9), 3.4, 0.05, 0.02, 0, 0.9, -4.59);

  // carteiras
  const mats = { top: std(0x1e2550, { rough: 0.5 }), edge: gold, leg: std(0x0c1024, { rough: 0.6, metal: 0.3 }), chair: std(0x10152e, { rough: 0.7 }) };
  for (const [x, z] of Object.values(SEATS)) desk(b, x, z, mats);
  const screenTex = canvasTexture(128, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0b1830';
    ctx.fillRect(0, 0, w, h);
    const colors = ['#86ecb0', '#7fd8ff', '#f7c873', '#bfc6e8'];
    for (let i = 0; i < 9; i++) { ctx.fillStyle = colors[i % 4]; ctx.fillRect(8 + (i % 3) * 8, 8 + i * 9, 26 + ((i * 37) % 60), 4); }
  });
  for (const [x, z] of Object.values(SEATS)) {
    const screen = plate(screenTex, 0.42, 0.26, x, 0.955, z - 0.085, 0, { glow: 1.1 });
    screen.rotation.x = -0.18;
    scene.add(screen);
  }

  // porta do Laboratório 404 (parede direita)
  const dz = -3.6;
  b.box(std(0x1c1a2a, { rough: 0.6 }), 0.1, 2.6, 1.35, W - 0.03, 1.3, dz);
  for (const s of [-1, 1]) b.box(std(0x2c3566), 0.14, 2.72, 0.09, W - 0.03, 1.36, dz + s * 0.72);
  b.box(std(0x2c3566), 0.14, 0.09, 1.53, W - 0.03, 2.68, dz);
  b.box(lit(0x3fd0c8, 1.7), 0.03, 0.9, 0.34, W - 0.09, 1.75, dz);
  b.ball(gold, 0.05, W - 0.12, 1.2, dz + 0.5);
  const labSign = canvasTexture(384, 128, (ctx, w, h) => {
    ctx.fillStyle = '#111630';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff9f6b';
    ctx.font = `700 60px ${FONT.mono}`;
    ctx.fillText('LAB 404', w / 2, h / 2 + 4);
  }, { fonts: true });
  scene.add(plate(labSign, 1.25, 0.42, W - 0.09, 3.05, dz, -HALF, { glow: 1.5 }));

  // estante do guia
  const shelfZ = 2.2;
  b.box(wood, 0.5, 3.1, 3.3, W - 0.26, 1.55, shelfZ);
  const br = rng(9);
  const bookColors = [0xff9f6b, 0x6f86e0, 0x86ecb0, 0xd4af6a, 0xb9a2ff, 0xff7ab8, 0x7fd8ff];
  for (let row = 0; row < 5; row++) {
    b.box(std(0x1a120a), 0.46, 0.05, 3.2, W - 0.3, 0.32 + row * 0.6, shelfZ);
    let z = shelfZ - 1.5;
    while (z < shelfZ + 1.45) {
      const width = 0.06 + br() * 0.1;
      const tall = 0.3 + br() * 0.2;
      b.box(std(bookColors[Math.floor(br() * bookColors.length)], { rough: 0.7 }), 0.3, tall, width, W - 0.42, 0.36 + row * 0.6 + tall / 2, z + width / 2);
      z += width + 0.012 + (br() < 0.12 ? 0.18 : 0);
    }
  }

  // fliperama e terminal do laboratório (parede do fundo)
  const cab = std(0x241a52, { rough: 0.5 });
  const ax = 4.7;
  b.box(cab, 1.15, 1.0, 0.95, ax, 0.5, D - 0.5);
  b.box(cab, 1.15, 1.15, 0.6, ax, 1.55, D - 0.33);
  b.box(cab, 1.15, 0.3, 0.9, ax, 2.25, D - 0.47);
  b.box(std(0x0c1024), 1.05, 0.08, 0.5, ax, 1.03, D - 0.85, 0, 0.25);
  b.box(lit(PAL.gold, 1.3), 0.04, 2.3, 0.04, ax - 0.59, 1.2, D - 0.96);
  b.box(lit(PAL.gold, 1.3), 0.04, 2.3, 0.04, ax + 0.59, 1.2, D - 0.96);
  for (const [dx, color] of [[-0.3, 0xff6b7d], [-0.12, 0x7fd8ff], [0.06, 0x86ecb0]]) b.cyl(lit(color, 1.8), 0.045, 0.045, 0.04, ax + dx + 0.2, 1.1, D - 0.86, 10);
  b.cyl(std(0x0c1024), 0.02, 0.02, 0.16, ax - 0.3, 1.15, D - 0.86, 6);
  b.ball(lit(0xff6b7d, 1.6), 0.05, ax - 0.3, 1.25, D - 0.86);
  const arcadeTex = canvasTexture(256, 224, (ctx, w, h, t = 0) => {
    ctx.fillStyle = '#080a1c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3d999';
    ctx.font = `700 34px ${FONT.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText('ARCADE', w / 2, 44);
    ctx.fillStyle = '#86ecb0';
    ctx.font = `700 15px ${FONT.mono}`;
    ctx.fillText('7 JOGOS EM PYTHON', w / 2, 68);
    for (let i = 0; i < 7; i++) {
      const phase = t * 3 - i * 0.55;
      ctx.fillStyle = i === 0 ? '#ffffff' : `rgba(127,216,255,${1 - i * 0.12})`;
      ctx.fillRect(Math.round((128 + Math.cos(phase) * 84) / 12) * 12, Math.round((142 + Math.sin(phase * 2) * 42) / 12) * 12, 11, 11);
    }
    ctx.fillStyle = '#ff6b7d';
    ctx.fillRect(Math.round((128 + Math.cos(t * 0.7 + 2) * 70) / 12) * 12, Math.round((142 + Math.sin(t * 0.9) * 40) / 12) * 12, 11, 11);
    if (Math.floor(t * 2) % 2) { ctx.fillStyle = '#f3d999'; ctx.font = `700 14px ${FONT.mono}`; ctx.fillText('PRESSIONE E', w / 2, 212); }
  }, { fonts: true, anisotropy: 2 });
  const arcadeScreen = plate(arcadeTex, 0.95, 0.83, ax, 1.58, D - 0.645, Math.PI, { glow: 1.5 });
  scene.add(arcadeScreen);
  const marquee = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#d4af6a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a1204';
    ctx.font = `900 40px ${FONT.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PYRA·CADE', w / 2, h / 2 + 3);
  }, { fonts: true });
  scene.add(plate(marquee, 1.05, 0.26, ax, 2.25, D - 0.93, Math.PI, { glow: 1.4 }));

  const tx = -4.7;
  b.box(std(0x1e2550, { rough: 0.5 }), 2.4, 0.08, 0.9, tx, 0.9, D - 0.5);
  for (const s of [-1, 1]) b.box(std(0x0c1024), 0.08, 0.9, 0.8, tx + s * 1.1, 0.45, D - 0.5);
  b.box(std(0x0a0d20, { rough: 0.4 }), 1.7, 1.05, 0.08, tx, 1.62, D - 0.3);
  b.box(std(0x0a0d20), 0.14, 0.2, 0.14, tx, 1.0, D - 0.3);
  b.box(std(0x0c1024), 0.9, 0.03, 0.28, tx, 0.955, D - 0.75);
  const termTex = canvasTexture(512, 300, (ctx, w, h) => {
    ctx.fillStyle = '#081420';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `500 22px ${FONT.mono}`;
    const lines = [['#7f8fb8', '# laboratório livre'], ['#f7c873', 'import random'], ['#e9f5ec', 'vida = 100'], ['#f7c873', 'while vida > 0:'], ['#e9f5ec', '    dano = random.randint(5, 25)'], ['#e9f5ec', '    vida -= dano'], ['#86ecb0', '    print(f"Vida: {vida}")'], ['#ff9f6b', '>>> _']];
    lines.forEach(([color, text], i) => { ctx.fillStyle = color; ctx.fillText(text, 22, 40 + i * 33); });
  }, { fonts: true });
  scene.add(plate(termTex, 1.58, 0.93, tx, 1.62, D - 0.345, Math.PI, { glow: 1.25 }));
  scene.add(b.build());

  // luzes
  scene.add(new THREE.HemisphereLight(0x8a90e6, 0x1c1436, 1.05));
  const sun = sunLight(0xffb877, 3.0, [-15, 9, 2.5], [1, 0, 0.5], 12);
  scene.add(sun, sun.target);
  const front = new THREE.PointLight(0xdfe4ff, 34, 16, 1.6);
  front.position.set(0, 4.1, -3.2);
  const back = new THREE.PointLight(0xdfe4ff, 26, 16, 1.6);
  back.position.set(0, 4.1, 3);
  const screenLight = new THREE.PointLight(0x5570ff, 12, 7, 1.8);
  screenLight.position.set(6, 2.4, -5.2);
  const arcadeLight = new THREE.PointLight(0x9a7cff, 9, 6, 1.8);
  arcadeLight.position.set(ax, 1.6, D - 1.6);
  scene.add(front, back, screenLight, arcadeLight);
  const dust = motes(Math.round(120 * q.density), [-W + 0.3, 0.2, -D + 0.5, 2, H - 0.4, D - 0.5], 17, { size: 18, rise: 0.05 });
  scene.add(dust);

  let rows = null;
  let tick = 0;
  return {
    scene, bloom: [0.5, 0.6, 1.0], exposure: 1.08, shadowLights: [sun],
    shots: {
      vn: { pos: [0, 1.32, -0.95], look: [0, 1.5, -6.5], fov: 50 },
      page: { pos: [1.2, 2.3, 5.4], look: [-0.4, 1.7, -6.5], fov: 50, sway: 2.2 },
      wide: { pos: [5.6, 3.3, 5.6], look: [-1.5, 1.1, -3], fov: 55 },
      board: { pos: [0, 2.2, -1.6], look: [0, 2.5, -6.5], fov: 46 },
      rank: { pos: [5.3, 2.3, -1.9], look: [6.05, 2.5, -6.5], fov: 50, center: 0.4 },
    },
    floor: 0, ceiling: H, spawn: new V3(2.1, 0, 2.6), spawnYaw: Math.PI, seats: SEATS,
    bounds: { minX: -W + 0.45, maxX: W - 0.45, minZ: -D + 0.45, maxZ: D - 0.45 },
    colliders: [
      ...Object.values(SEATS).map(([x, z]) => [x - 0.82, z - 0.45, x + 0.82, z + 1.0]),
      [-1.9, -5.55, 1.9, -4.45], [ax - 0.7, D - 1.1, ax + 0.7, D], [tx - 1.3, D - 1.05, tx + 1.3, D], [W - 0.6, shelfZ - 1.75, W, shelfZ + 1.75],
    ],
    hotspots: [
      { id: 'missoes', label: 'Quadro de missões', hint: 'Ver missões', at: new V3(0, 2.6, -D + 0.2), stand: new V3(0, 0, -3.3), shot: 'board' },
      { id: 'ranking', label: 'Telão do ranking', hint: 'Ver ranking', at: new V3(6.05, 2.5, -D + 0.2), stand: new V3(5.4, 0, -4.4), shot: 'rank' },
      { id: 'lab/arcade', label: 'Fliperama', hint: 'Jogar no Arcade', at: new V3(ax, 1.9, D - 0.9), stand: new V3(ax, 0, D - 1.75) },
      { id: 'lab', label: 'Terminal livre', hint: 'Abrir o Laboratório', at: new V3(tx, 1.7, D - 0.4), stand: new V3(tx, 0, D - 1.7) },
      { id: 'guia', label: 'Estante de consulta', hint: 'Abrir o Guia', at: new V3(W - 0.5, 1.9, shelfZ), stand: new V3(W - 1.4, 0, shelfZ) },
      { id: 'kurisu', label: 'Laboratório 404', hint: 'Bater na porta', at: new V3(W - 0.1, 1.8, dz), stand: new V3(W - 1.2, 0, dz) },
      { id: 'desk', label: 'Sua carteira', hint: 'Sentar e estudar', at: new V3(0, 1.15, 3.7), stand: new V3(1.15, 0, 4.4) },
    ],
    setBoard(info) { board.redraw(info); },
    setRanking(list) { rows = list; rankTex.redraw(rows, 0); },
    update(dt, t) {
      dust.userData.tick(t, pointScale());
      // as telas animadas só são redesenhadas com a sala em primeiro plano (atrás das aulas elas ficam paradas)
      tick += dt;
      if (tick > 0.14 && world.activity === 'full') { tick = 0; arcadeTex.redraw(t); if (rows) rankTex.redraw(rows, t); }
    },
  };
});

// =============================== LABORATÓRIO 404 ===============================
defineSet('lab', (q) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);
  scene.fog = new THREE.Fog(0x061018, 9, 30);
  const W = 5.2, D = 4.2, H = 3.8;
  const b = new Batch();
  const wall = std(0x0e1428, { rough: 0.9 });
  const metal = std(0x141a34, { rough: 0.45, metal: 0.5 });
  const teal = lit(PAL.teal, 1.8);

  b.quad(std(0xffffff, { map: floorTexture('#0c1122', 'rgba(63,208,200,.3)', [6, 5]), rough: 0.3, metal: 0.3 }), W * 2, D * 2, 0, 0, 0, -HALF);
  b.quad(std(0x0a0d1c, { rough: 1 }), W * 2, D * 2, 0, H, 0, HALF);
  b.box(wall, W * 2 + 0.6, H, 0.3, 0, H / 2, -D - 0.15);
  b.box(wall, W * 2 + 0.6, H, 0.3, 0, H / 2, D + 0.15);
  for (const s of [-1, 1]) b.box(wall, 0.3, H, D * 2, s * (W + 0.15), H / 2, 0);
  b.box(teal, W * 2, 0.04, 0.04, 0, 0.06, -D + 0.03);
  b.box(teal, W * 2, 0.04, 0.04, 0, H - 0.06, -D + 0.03);
  for (const x of [-3, 0, 3]) b.cyl(metal, 0.07, 0.07, D * 2, x, H - 0.16, 0, 8, HALF);

  // monitor principal com a onda cerebral
  const mx = 0.7;
  b.box(std(0x0a1622, { rough: 0.4, metal: 0.4 }), 5.1, 2.75, 0.14, mx, 2.15, -D + 0.07);
  b.box(teal, 5.16, 0.04, 0.16, mx, 0.76, -D + 0.07);
  b.box(teal, 5.16, 0.04, 0.16, mx, 3.54, -D + 0.07);
  const wr = rng(42);
  const amps = Array.from({ length: 60 }, () => 0.4 + wr());
  const monitor = canvasTexture(1024, 540, (ctx, w, h, t = 0) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d2b3a');
    g.addColorStop(1, '#071421');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(63,208,200,.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 54) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.font = `500 32px ${FONT.mono}`;
    ctx.fillStyle = '#9fe8e2';
    ctx.fillText('>>> hipotese = "voce consegue"', 44, 78);
    ctx.fillText('>>> experimento(hipotese)', 44, 420);
    ctx.fillStyle = '#ff9f6b';
    ctx.fillText(`True${Math.floor(t * 2) % 2 ? '_' : ''}`, 44, 476);
    ctx.strokeStyle = '#3fd0c8';
    ctx.lineWidth = 6;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.shadowColor = '#3fd0c8';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    for (let i = 0; i < 60; i++) {
      const x = 44 + i * 15.9;
      const y = 250 + Math.sin(i / 2.2 + t * 2.4) * 62 * amps[i] * (0.7 + 0.3 * Math.sin(t * 0.8 + i * 0.3));
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, { fonts: true });
  scene.add(plate(monitor, 4.9, 2.56, mx, 2.15, -D + 0.15, 0, { glow: 1.35 }));

  // estante com livros, frascos e instrumentos
  const sx = -3.75;
  b.box(metal, 2.2, 3.2, 0.5, sx, 1.6, -D + 0.28);
  const colors = [0xff9f6b, 0x6f86e0, 0x86ecb0, 0xd4af6a];
  const sr = rng(4);
  for (let row = 0; row < 4; row++) {
    b.box(std(0x27306a), 2.1, 0.05, 0.5, sx, 0.5 + row * 0.75, -D + 0.3);
    for (let i = 0; i < 8; i++) {
      if (row === 3 && i > 4) continue;
      const tall = 0.36 + sr() * 0.2;
      b.box(std(colors[(i + row) % 4], { rough: 0.7 }), 0.16, tall, 0.3, sx - 0.86 + i * 0.245, 0.53 + row * 0.75 + tall / 2, -D + 0.42);
    }
  }
  b.ball(lit(PAL.teal, 1.6, { opacity: 0.85 }), 0.16, sx + 0.6, 2.98, -D + 0.44);
  b.cyl(metal, 0.05, 0.05, 0.16, sx + 0.6, 3.18, -D + 0.44, 8);
  b.ball(lit(0xff9f6b, 1.6, { opacity: 0.85 }), 0.12, sx + 0.9, 2.94, -D + 0.44);

  // placa do laboratório
  const sign = canvasTexture(512, 340, (ctx, w, h) => {
    ctx.fillStyle = '#111630';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#27306a';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9f6b';
    ctx.font = `700 130px ${FONT.mono}`;
    ctx.fillText('404', w / 2, 150);
    ctx.fillStyle = '#d4af6a';
    ctx.font = `700 36px ${FONT.display}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.fillText('LABORATÓRIO', w / 2, 222);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = '#8f9bc9';
    ctx.font = `28px ${FONT.mono}`;
    ctx.fillText('não perturbe (sério)', w / 2, 290);
  }, { fonts: true });
  scene.add(plate(sign, 1.7, 1.13, W - 0.02, 2.5, -1.4, -HALF, { glow: 1.15 }));

  // bancada, monitor pequeno, caneca e luminária
  b.box(std(0x1b2146, { rough: 0.45 }), 6.4, 0.09, 1.25, mx, 0.92, -2.35);
  b.box(std(0x10142c), 6.4, 0.14, 0.06, mx, 0.82, -1.75);
  for (const x of [mx - 3, mx + 3]) b.box(std(0x10142c), 0.1, 0.9, 1.1, x, 0.45, -2.35);
  b.box(std(0x0d1126, { rough: 0.4 }), 0.95, 0.62, 0.06, mx - 2.1, 1.38, -2.6, 0.35);
  b.box(std(0x0d1126), 0.1, 0.16, 0.1, mx - 2.1, 1.02, -2.6);
  const small = canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#10283a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#86ecb0';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    [[30, 44, 150], [30, 80, 220], [30, 116, 110]].forEach(([x, y, x2]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y); ctx.stroke(); });
  });
  const smallScreen = plate(small, 0.86, 0.53, mx - 2.085, 1.38, -2.565, 0.35, { glow: 1.2 });
  scene.add(smallScreen);
  b.cyl(std(0x7a1f2a, { rough: 0.5 }), 0.075, 0.065, 0.18, mx + 1.9, 1.06, -2.2, 14);
  b.cyl(std(0xc9ccd9), 0.08, 0.08, 0.02, mx + 1.9, 1.16, -2.2, 14);
  b.box(std(0x0c1024), 0.8, 0.03, 0.26, mx + 0.2, 0.98, -2.0);
  b.cyl(metal, 0.03, 0.05, 0.6, mx + 2.7, 1.26, -2.6, 8);
  b.cone(lit(0xffd9a0, 2.2), 0.14, 0.2, mx + 2.62, 1.56, -2.5, 10, 0.5);
  b.box(lit(0xfff8e8, 0.55), 0.3, 0.004, 0.22, mx + 1.0, 0.972, -2.3, 0.2);
  // servidor com luzes
  b.box(metal, 0.9, 2.4, 0.8, W - 0.5, 1.2, 2.2);
  for (let i = 0; i < 9; i++) b.box(lit([0x86ecb0, 0x3fd0c8, 0xff9f6b][i % 3], 2), 0.03, 0.04, 0.12, W - 0.96, 0.5 + i * 0.2, 2.0 + (i % 2) * 0.3);
  scene.add(b.build());

  scene.add(new THREE.HemisphereLight(0x3fd0c8, 0x070912, 0.7));
  const key = new THREE.SpotLight(0xdff6ff, 60, 14, 0.9, 0.6, 1.4);
  key.position.set(0.7, 3.6, 2.8);
  key.target.position.set(0.7, 1.2, -0.8);
  key.shadow.bias = -0.0008;
  scene.add(key, key.target);
  const screenLight = new THREE.PointLight(0x3fd0c8, 40, 12, 1.6);
  screenLight.position.set(mx, 2.2, -3.1);
  const lamp = new THREE.PointLight(0xffc98a, 9, 5, 1.8);
  lamp.position.set(mx + 2.5, 1.5, -2.3);
  scene.add(screenLight, lamp);
  const screenGlow = halo(PAL.teal, 9, 0.2);
  screenGlow.position.set(mx, 2.15, -D + 0.6);
  scene.add(screenGlow);
  const dust = motes(Math.round(60 * q.density), [-W + 0.3, 0.2, -D + 0.4, W - 0.3, H - 0.3, D - 0.4], 44, { color: 0x8ff0e8, size: 16, rise: 0.04 });
  scene.add(dust);

  let tick = 0;
  return {
    scene, bloom: [0.6, 0.65, 1.0], exposure: 1.05, shadowLights: [key],
    shots: { vn: { pos: [0.7, 1.32, 1.9], look: [0.7, 1.5, -4.2], fov: 50 } },
    floor: 0,
    update(dt, t) {
      dust.userData.tick(t, pointScale());
      tick += dt;
      if (tick > 0.08) { tick = 0; monitor.redraw(t); }
      screenLight.intensity = 38 + Math.sin(t * 2.4) * 5;
    },
  };
});
