// Cenário 1 — o portão da Academia ao anoitecer: céu, lua, montanhas, a escola e o portão que abre sozinho.
import * as THREE from './three.js';
import { Batch, V3, PAL, FONT, std, lit, halo, plate, canvasTexture, crestTexture, skyDome, starField, motes, rng, damp } from './kit.js';
import { defineSet, pointScale } from './engine.js';

function ridge(seed, z, width, base, height, color) {
  const r = rng(seed);
  const points = [];
  const steps = 34;
  for (let i = 0; i <= steps; i++) points.push([(i / steps - 0.5) * width, base + (0.25 + r() * 0.75) * height * (0.6 + 0.4 * Math.sin(i * 0.9 + seed))]);
  const vertices = [];
  for (let i = 0; i < steps; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    vertices.push(x1, -8, z, x2, -8, z, x2, y2, z, x1, -8, z, x2, y2, z, x1, y1, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, fog: false }));
}

function prism(width, height, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

defineSet('gate', (q) => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1b1446, 0.0105);
  scene.add(skyDome([[0, '#e8875a'], [0.07, '#7a3478'], [0.26, '#1c1856'], [0.7, '#04051a']]));
  const stars = starField(Math.round(900 * q.density), 380, 11, { minY: 0.1 });
  scene.add(stars);

  // lua
  const moonAt = new V3(0.36, 0.4, -0.84).normalize().multiplyScalar(360);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(15, 40), lit(0xfff5d6, 1.5, { fog: false }));
  moon.position.copy(moonAt);
  moon.lookAt(0, 0, 0);
  const moonGlow = halo(0xfff2c8, 150, 0.5);
  moonGlow.position.copy(moonAt);
  scene.add(moon, moonGlow);
  scene.add(ridge(3, -230, 760, 0, 46, 0x2a1d58), ridge(8, -170, 640, 0, 26, 0x1a1338));

  const b = new Batch();
  const wall = std(0x0e1230, { rough: 0.9 });
  const wall2 = std(0x141a3e, { rough: 0.9 });
  const roof = std(0x0a0c20, { rough: 0.8 });
  const iron = std(0x0a0c18, { rough: 0.55, metal: 0.6 });
  const gold = std(PAL.gold, { rough: 0.35, metal: 0.8, emissive: PAL.gold, ei: 0.22 });
  const warm = lit(0xffd98a, 1.3);
  const cool = lit(0x9fd8ff, 1.15);
  const dark = lit(0x161c3c, 1);

  // chão, gramado e caminho
  b.quad(std(0x0a0d1e, { rough: 1 }), 700, 700, 0, 0, -60, -Math.PI / 2);
  b.quad(std(0x231d4a, { rough: 0.9 }), 6.4, 52, 0, 0.02, -10, -Math.PI / 2);
  b.quad(std(0x352c66, { rough: 0.7 }), 2.6, 52, 0, 0.03, -10, -Math.PI / 2);
  b.quad(std(0x231d4a, { rough: 0.9 }), 30, 9, 0, 0.02, -34, -Math.PI / 2);

  // prédio principal, torre do relógio e alas
  const Z = -44;
  b.box(wall, 62, 13, 12, 0, 6.5, Z);
  b.add(prism(64, 5.5, 13), roof, 0, 13, Z);
  b.box(wall2, 9.5, 27, 9.5, 0, 13.5, Z + 3);
  b.add(new THREE.ConeGeometry(7.6, 8, 4), roof, 0, 31, Z + 3, 0, Math.PI / 4);
  b.cyl(gold, 0.06, 0.06, 4.4, 0, 37, Z + 3, 6);
  b.add(new THREE.ConeGeometry(0.9, 0.7, 3), gold, 0.75, 38.6, Z + 3, 0, 0, -Math.PI / 2);
  for (const side of [-1, 1]) {
    b.box(wall2, 11, 16, 13, side * 34, 8, Z + 0.5);
    b.add(new THREE.ConeGeometry(9, 6, 4), roof, side * 34, 19, Z + 0.5, 0, Math.PI / 4);
  }
  b.box(gold, 62, 0.22, 0.25, 0, 0.5, Z + 6.1);
  b.box(gold, 62, 0.16, 0.25, 0, 12.9, Z + 6.1);

  // janelas (acesas em tons quentes e frios)
  const r = rng(5);
  const pane = (x, y, z, w, h, chance) => {
    const on = r() < chance;
    b.quad(on ? (r() < 0.25 ? cool : warm) : dark, w, h, x, y, z);
  };
  const face = Z + 6.03;
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) pane(side * (7.6 + i * 2.55), 2.4 + j * 2.75, face, 1.25, 1.75, 0.55);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) pane((i - 1) * 2.6, 13.2 + j * 3.1, Z + 7.78, 1.35, 2.1, 0.85);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) pane(side * 34 + (i - 1) * 3, 3 + j * 3.1, Z + 7.03, 1.2, 1.7, 0.5);

  // porta em arco
  b.quad(lit(0xffd98a, 1.8), 3.2, 4.4, 0, 2.2, face + 0.04);
  b.add(new THREE.CircleGeometry(1.6, 24, 0, Math.PI), lit(0xffd98a, 1.8), 0, 4.4, face + 0.04);
  b.box(wall, 0.14, 6, 0.1, 0, 3, face + 0.08);
  b.box(wall, 3.2, 0.14, 0.1, 0, 3.1, face + 0.08);
  b.add(new THREE.TorusGeometry(1.7, 0.1, 6, 24, Math.PI), gold, 0, 4.4, face + 0.06);
  for (const side of [-1, 1]) b.box(gold, 0.16, 4.4, 0.16, side * 1.7, 2.2, face + 0.08);
  for (let i = 0; i < 4; i++) b.box(std(0x1b2146, { rough: 0.8 }), 9 - i * 1.1, 0.22, 2.2 - i * 0.45, 0, 0.11 + i * 0.22, face + 1.2 - i * 0.22);

  // relógio da torre
  const clockZ = Z + 7.8;
  b.add(new THREE.CircleGeometry(2.1, 40), lit(0xfff0c2, 1.25), 0, 22, clockZ);
  b.add(new THREE.TorusGeometry(2.15, 0.16, 8, 40), gold, 0, 22, clockZ + 0.02);
  b.box(lit(0x1a1338, 1), 0.14, 1.5, 0.05, 0, 22.7, clockZ + 0.05);
  b.box(lit(0x1a1338, 1), 0.12, 1.1, 0.05, 0.44, 22.25, clockZ + 0.05, 0, 0, -1.05);

  // cerca, pilares e postes
  for (let x = -44; x <= 44; x += 1.15) {
    if (Math.abs(x) < 3.9) continue;
    b.box(iron, 0.1, 3.3, 0.1, x, 1.65, 0);
    b.cone(gold, 0.11, 0.34, x, 3.47, 0, 4);
  }
  for (const side of [-1, 1]) {
    b.box(iron, 40, 0.1, 0.12, side * 24, 0.5, 0);
    b.box(iron, 40, 0.1, 0.12, side * 24, 2.9, 0);
    const px = side * 3.5;
    b.box(std(0x171c3c, { rough: 0.8 }), 1.35, 5.3, 1.35, px, 2.65, 0);
    b.box(std(0x1f2650, { rough: 0.7 }), 1.75, 0.34, 1.75, px, 5.47, 0);
    b.box(gold, 1.42, 0.1, 1.42, px, 0.9, 0);
    b.box(gold, 1.42, 0.1, 1.42, px, 5.1, 0);
    b.ball(lit(0xffe6a8, 2.2), 0.4, px, 6.05, 0);
    for (const z of [-11, -23]) {
      b.cyl(iron, 0.06, 0.09, 4.4, side * 3.6, 2.2, z, 8);
      b.ball(lit(0xffe6a8, 2), 0.26, side * 3.6, 4.55, z);
    }
  }
  // árvores em silhueta
  const tr = rng(21);
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (7 + tr() * 36);
    const z = -4 - tr() * 30;
    const s = 0.8 + tr() * 0.9;
    b.cyl(std(0x0b0d1c), 0.18 * s, 0.24 * s, 1.6 * s, x, 0.8 * s, z, 6);
    b.cone(std(0x0d1430, { rough: 1, flat: true }), 1.7 * s, 3.2 * s, x, 3 * s, z, 7);
    b.cone(std(0x111a3c, { rough: 1, flat: true }), 1.2 * s, 2.6 * s, x, 4.6 * s, z, 7);
  }
  scene.add(b.build());

  // halos das lâmpadas
  for (const side of [-1, 1]) {
    const glow = halo(0xffd98a, 6.5, 0.5);
    glow.position.set(side * 3.5, 6.05, 0);
    scene.add(glow);
    for (const z of [-11, -23]) { const g = halo(0xffd98a, 4.2, 0.42); g.position.set(side * 3.6, 4.55, z); scene.add(g); }
    const crest = plate(crestTexture(), 0.86, 1.0, side * 3.5, 3.2, 0.69, 0, { glow: 1.25, transparent: true });
    scene.add(crest);
  }
  const doorGlow = halo(0xffc070, 26, 0.34);
  doorGlow.position.set(0, 3, face + 1);
  scene.add(doorGlow);

  // arco com o nome da escola
  const arc = new THREE.QuadraticBezierCurve3(new V3(-2.9, 5.2, 0), new V3(0, 8.1, 0), new V3(2.9, 5.2, 0));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(arc, 32, 0.075, 6), gold));
  const arc2 = new THREE.QuadraticBezierCurve3(new V3(-2.9, 4.6, 0), new V3(0, 7.3, 0), new V3(2.9, 4.6, 0));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(arc2, 32, 0.11, 6), iron));
  const sign = canvasTexture(1024, 160, (ctx, w, h) => {
    ctx.font = `700 78px ${FONT.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f3d999';
    ctx.shadowColor = '#d4af6a';
    ctx.shadowBlur = 18;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '16px';
    ctx.fillText('ACADEMIA PYRA', w / 2, h / 2 + 4);
  }, { fonts: true });
  scene.add(plate(sign, 4.3, 0.67, 0, 6.05, 0.02, 0, { glow: 1.5, transparent: true }));

  // folhas do portão (abrem girando nas dobradiças)
  const leaves = [];
  for (const side of [-1, 1]) {
    const leafBatch = new Batch();
    for (let i = 0; i < 9; i++) {
      const x = side * -(0.18 + i * 0.32);
      const tall = 4.1 + Math.sin((i / 8) * Math.PI * 0.5) * 0.9;
      leafBatch.box(iron, 0.07, tall, 0.07, x, tall / 2 + 0.1, 0);
      leafBatch.cone(gold, 0.09, 0.3, x, tall + 0.25, 0, 4);
    }
    leafBatch.box(iron, 2.8, 0.1, 0.1, side * -1.45, 0.45, 0);
    leafBatch.box(iron, 2.8, 0.1, 0.1, side * -1.45, 3.2, 0);
    leafBatch.add(new THREE.TorusGeometry(0.42, 0.045, 6, 20), gold, side * -1.45, 1.9, 0);
    const leaf = leafBatch.build();
    leaf.position.set(side * 2.83, 0, 0);
    leaf.userData.side = side;
    scene.add(leaf);
    leaves.push(leaf);
  }

  // luzes
  scene.add(new THREE.HemisphereLight(0x6468c8, 0x1c1238, 1.15));
  const moonLight = new THREE.DirectionalLight(0xbcc8ff, 1.5);
  moonLight.position.set(14, 22, -6);
  moonLight.target.position.set(0, 0, -8);
  moonLight.shadow.camera.left = -22; moonLight.shadow.camera.right = 22; moonLight.shadow.camera.top = 26; moonLight.shadow.camera.bottom = -26;
  moonLight.shadow.camera.far = 80;
  moonLight.shadow.bias = -0.0006;
  scene.add(moonLight, moonLight.target);
  for (const side of [-1, 1]) {
    const lamp = new THREE.PointLight(0xffd08a, 55, 20, 1.8);
    lamp.position.set(side * 3.5, 5.6, 1.2);
    scene.add(lamp);
  }
  const pathLight = new THREE.PointLight(0xffd08a, 70, 26, 1.7);
  pathLight.position.set(0, 4.2, -17);
  const doorLight = new THREE.PointLight(0xffc070, 260, 40, 1.6);
  doorLight.position.set(0, 3.5, face + 3.5);
  scene.add(pathLight, doorLight);

  const flies = motes(Math.round(90 * q.density), [-13, 0.3, -30, 13, 5.5, 9], 31, { color: 0xffe2a0, size: 34, rise: 0.05 });
  scene.add(flies);

  const set = {
    scene, bloom: [0.3, 0.5, 1.0], exposure: 1.1, shadowLights: [moonLight], gate: 0, gateTarget: 0,
    shots: {
      title: { pos: [2.2, 1.25, 15.5], look: [0, 7.4, -30], fov: 50, drift: [-2.4, 0.55, -6.5], driftTime: 46, sway: 1.2 },
      vn: { pos: [0.4, 1.7, 11], look: [0, 5.2, -24], fov: 52 },
      walk: { pos: [0, 2.4, 14], look: [0, 2.4, -20], fov: 55 },
    },
    floor: 0, spawn: new V3(0, 0, 9.5), spawnYaw: Math.PI,
    bounds: { minX: -8.5, maxX: 8.5, minZ: -36, maxZ: 13 },
    colliders: [
      [-44, -0.3, -2.9, 0.3], [2.9, -0.3, 44, 0.3], [-4.2, -0.7, -2.8, 0.7], [2.8, -0.7, 4.2, 0.7],
      [-3.8, -11.2, -3.4, -10.8], [3.4, -11.2, 3.8, -10.8], [-3.8, -23.2, -3.4, -22.8], [3.4, -23.2, 3.8, -22.8],
    ],
    openGate(open = true) { set.gateTarget = open ? 1 : 0; },
    enter() { set.gateTarget = 0; set.gate = 0; },
    update(dt, t) {
      const scale = pointScale();
      stars.userData.tick(t, scale);
      flies.userData.tick(t, scale);
      set.gate = damp(set.gate, set.gateTarget, 1.6, dt);
      for (const leaf of leaves) leaf.rotation.y = -leaf.userData.side * set.gate * 1.75;
      moonGlow.material.opacity = 0.46 + Math.sin(t * 0.4) * 0.05;
    },
  };
  return set;
});
