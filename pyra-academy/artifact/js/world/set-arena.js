// Cenário da arena das Provas de Mérito e o "vazio" usado nas cenas de abertura.
import * as THREE from './three.js';
import { Batch, V3, PAL, FONT, std, lit, halo, plate, canvasTexture, crestTexture, drawCrest, starField, motes } from './kit.js';
import { defineSet, pointScale } from './engine.js';

const HALF = Math.PI / 2;

function cone(color, opacity) {
  const texture = canvasTexture(8, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,.9)');
    g.addColorStop(0.7, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const geometry = new THREE.ConeGeometry(3.4, 17, 28, 1, true);
  geometry.translate(0, -8.5, 0);
  const material = new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 4;
  return mesh;
}

function boardDraw(ctx, w, h, d = {}) {
  ctx.fillStyle = '#060814';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d4af6a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#d4af6a';
  ctx.font = `700 40px ${FONT.display}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '12px';
  ctx.fillText(d.title || 'PROVA DE MÉRITO', w / 2, 62);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = d.danger ? '#ff6b7d' : '#ffffff';
  ctx.font = `700 150px ${FONT.mono}`;
  ctx.fillText(d.clock || '—:——', w / 2, 210);
  const color = d.color || '#ff6b7d';
  ctx.textAlign = 'left';
  ctx.font = `700 30px ${FONT.ui}`;
  ctx.fillStyle = '#f3d999';
  ctx.fillText(d.you || 'VOCÊ', 40, 268, w / 2 - 70);
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.fillText(d.rival || 'RIVAL', w - 40, 268, w / 2 - 70);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(40, 286, w - 80, 26);
  ctx.fillStyle = color;
  const pct = Math.max(0, Math.min(1, d.pct || 0));
  ctx.fillRect(w - 40 - (w - 80) * pct, 286, (w - 80) * pct, 26);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `700 22px ${FONT.mono}`;
  ctx.fillText(d.label || '', w / 2, 306);
}

defineSet('arena', (q) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060f);
  scene.fog = new THREE.Fog(0x0b0a22, 24, 90);
  const stars = starField(Math.round(700 * q.density), 300, 77, { minY: -0.35 });
  scene.add(stars);
  for (const [x, y, z, color, size] of [[-60, 40, -150, 0x4a2aa8, 190], [70, 20, -140, 0x8a2a6a, 160], [0, 70, -180, 0x2a3aa8, 220]]) {
    const cloud = halo(color, size, 0.3);
    cloud.position.set(x, y, z);
    scene.add(cloud);
  }

  const b = new Batch();
  const R = 11;
  const gold = std(PAL.gold, { rough: 0.35, metal: 0.8, emissive: PAL.gold, ei: 0.3 });
  const floor = canvasTexture(1024, 1024, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, '#1a1650');
    g.addColorStop(1, '#070818');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = 'rgba(86,96,200,.55)';
    ctx.lineWidth = 2;
    for (let r = 60; r < c; r += 62) { ctx.beginPath(); ctx.arc(c, c, r, 0, 6.2832); ctx.stroke(); }
    for (let i = 0; i < 32; i++) { const a = (i / 32) * 6.2832; ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * 60, c + Math.sin(a) * 60); ctx.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); ctx.stroke(); }
    ctx.strokeStyle = '#d4af6a';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(c, c, c - 10, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(c, c, 180, 0, 6.2832); ctx.stroke();
    ctx.globalAlpha = 0.55;
    drawCrest(ctx, c, c - 8, 2.1, { fill: 'rgba(11,15,30,.6)', width: 4 });
    ctx.globalAlpha = 1;
  });
  const top = new THREE.Mesh(new THREE.CircleGeometry(R, 72), std(0xffffff, { map: floor, rough: 0.35, metal: 0.25 }));
  top.rotation.x = -HALF;
  top.receiveShadow = true;
  scene.add(top);
  b.cyl(std(0x0c0e24, { rough: 0.6 }), R, R - 0.6, 0.9, 0, -0.46, 0, 72);
  b.add(new THREE.TorusGeometry(R, 0.07, 8, 96), lit(PAL.gold, 1.6), 0, 0.02, 0, HALF);
  // pilares luminosos em volta da arena
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.31;
    const x = Math.cos(a) * 13.5;
    const z = Math.sin(a) * 13.5;
    if (z > 9) continue;
    b.box(std(0x10122c, { rough: 0.5 }), 0.7, 9, 0.7, x, 4.5, z, -a);
    b.box(lit(i % 2 ? 0xff5b6e : PAL.gold, 1.8), 0.12, 8.2, 0.12, x - Math.cos(a) * 0.38, 4.6, z - Math.sin(a) * 0.38, -a);
  }
  // bancadas dos dois duelistas
  const stations = [];
  for (const side of [-1, 1]) {
    const x = side * 3.1;
    const tint = side < 0 ? PAL.gold : 0xff5b6e;
    b.cyl(std(0x151a3c, { rough: 0.5, metal: 0.3 }), 0.5, 0.62, 0.95, x, 0.475, 0.2, 20);
    b.cyl(lit(tint, 1.6), 0.64, 0.64, 0.03, x, 0.02, 0.2, 28);
    b.box(std(0x1e2550, { rough: 0.4 }), 1.25, 0.06, 0.62, x, 0.98, 0.2);
    b.add(new THREE.TorusGeometry(1.25, 0.03, 6, 48), lit(tint, 1.5), x, 0.03, 0.95, HALF);
    stations.push({ pos: new V3(x, 0, -0.5), yaw: -side * 0.2, head: new V3(x, 1.75, -0.5) });
  }
  scene.add(b.build());

  // brasão holográfico e placar
  const crest = plate(crestTexture(), 6.6, 7.7, 0, 6.6, -10.5, 0, { glow: 0.9, transparent: true, add: true });
  crest.material.opacity = 0.55;
  scene.add(crest);
  const crestGlow = halo(0x8a6aff, 22, 0.28);
  crestGlow.position.set(0, 6.4, -11);
  scene.add(crestGlow);
  const boardTex = canvasTexture(1024, 340, boardDraw, { fonts: true });
  const board = plate(boardTex, 3.9, 1.3, 0, 1.75, -3.6, 0, { glow: 1.3 });
  board.visible = false;
  scene.add(board);
  // telas holográficas sobre as bancadas
  const holo = canvasTexture(256, 160, (ctx, w, h, t = 0, speed = 1) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10,16,40,.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    const lines = Math.min(8, 1 + Math.floor((t * speed) % 9));
    for (let i = 0; i < lines; i++) { ctx.fillStyle = ['#f7c873', '#e9f5ec', '#8fd8ff', '#86ecb0'][i % 4]; ctx.fillRect(16 + (i % 3) * 14, 18 + i * 17, 60 + ((i * 53) % 120), 7); }
  }, { anisotropy: 2 });
  const screens = [-1, 1].map((side) => {
    const screen = plate(holo, 1.05, 0.66, side * 3.1, 2.42, -0.35, 0, { glow: 1.3, transparent: true });
    screen.rotation.x = 0.18;
    screen.material.color.set(side < 0 ? 0xf3d999 : 0xff8a98).multiplyScalar(1.3);
    scene.add(screen);
    return screen;
  });

  // holofotes
  const beamGold = cone(PAL.gold, 0.2);
  beamGold.position.set(-9, 16, -2);
  const beamRed = cone(0xff5b6e, 0.2);
  beamRed.position.set(9, 16, -2);
  scene.add(beamGold, beamRed);
  scene.add(new THREE.HemisphereLight(0x5a4fc0, 0x07081a, 0.95));
  const spotGold = new THREE.SpotLight(0xffe2a8, 900, 34, 0.42, 0.6, 1.5);
  spotGold.position.set(-9, 16, 3);
  spotGold.target.position.set(-3, 0, 0.6);
  spotGold.shadow.bias = -0.0008;
  const spotRed = new THREE.SpotLight(0xff7a8a, 800, 34, 0.42, 0.6, 1.5);
  spotRed.position.set(9, 16, 3);
  spotRed.target.position.set(3, 0, 0.6);
  const frontFill = new THREE.DirectionalLight(0xbfc8ff, 1.3);
  frontFill.position.set(0, 6, 12);
  scene.add(spotGold, spotGold.target, spotRed, spotRed.target, frontFill);
  const sparks = motes(Math.round(140 * q.density), [-13, 0.2, -13, 13, 11, 9], 3, { color: 0xb9a2ff, size: 22, rise: 0.25 });
  scene.add(sparks);

  let tick = 0;
  const set = {
    scene, bloom: [0.7, 0.7, 0.98], exposure: 1.1, shadowLights: [spotGold], stations, rivalSpeed: 1, mood: 0,
    shots: {
      vn: { pos: [0, 1.32, 5.6], look: [0, 1.7, -8], fov: 50 },
      duel: { pos: [0, 2.0, 6.6], look: [0, 1.7, -1], fov: 44, center: 0.37, sway: 1.5 },
      win: { pos: [-0.6, 1.7, 4.6], look: [-2.6, 1.55, -0.6], fov: 40, center: 0.33, lambda: 1.8 },
      lose: { pos: [0.6, 1.7, 4.6], look: [2.6, 1.55, -0.6], fov: 40, center: 0.33, lambda: 1.8 },
    },
    floor: 0,
    setBoard(data) { board.visible = !!data; if (data) boardTex.redraw(data); },
    setMood(value) { set.mood = value; },
    update(dt, t) {
      const scale = pointScale();
      stars.userData.tick(t, scale);
      sparks.userData.tick(t, scale);
      crest.position.y = 6.6 + Math.sin(t * 0.6) * 0.18;
      crest.material.opacity = 0.48 + Math.sin(t * 1.1) * 0.08;
      beamGold.rotation.z = -0.5 + Math.sin(t * 0.45) * 0.09;
      beamRed.rotation.z = 0.5 - Math.sin(t * 0.45 + 1.4) * 0.09;
      beamGold.rotation.x = beamRed.rotation.x = 0.12;
      beamRed.material.opacity = 0.2 + set.mood * 0.18;
      tick += dt;
      if (tick > 0.12) { tick = 0; holo.redraw(t, 3); }
      for (const screen of screens) screen.position.y = 2.42 + Math.sin(t * 1.4 + screen.position.x) * 0.025;
    },
  };
  return set;
});

defineSet('black', (q) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060d);
  const dust = motes(Math.round(90 * q.density), [-7, -3, -9, 7, 5, -1], 5, { size: 24, rise: 0.1 });
  scene.add(dust);
  const crest = plate(crestTexture(), 2.4, 2.8, 0, 1.6, -7, 0, { glow: 0.8, transparent: true, add: true });
  crest.material.opacity = 0.16;
  scene.add(crest);
  return {
    scene, bloom: [0.7, 0.7, 0.8],
    shots: { vn: { pos: [0, 1.4, 2], look: [0, 1.5, -6], fov: 50 } },
    floor: 0,
    update(dt, t) { dust.userData.tick(t, pointScale()); crest.material.opacity = 0.13 + Math.sin(t * 0.8) * 0.04; },
  };
});
