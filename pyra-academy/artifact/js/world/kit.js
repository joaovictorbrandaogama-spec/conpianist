// Caixa de ferramentas do mundo 3D: materiais em cache, texturas desenhadas em canvas,
// lotes de geometria (um mesh por material) e pequenos objetos reutilizados pelos cenários.
import * as THREE from './three.js';

export const V3 = THREE.Vector3;
export const PAL = {
  ink: 0x070912, ink2: 0x0c1022, navy: 0x151a38, navy2: 0x1c2244, gold: 0xd4af6a, goldHi: 0xf3d999,
  ivory: 0xece7db, cyan: 0x7fd8ff, teal: 0x3fd0c8, violet: 0xb9a2ff, red: 0xff6b7d, green: 0x86ecb0, warm: 0xffd98a,
};
export const CREST_SHIELD = 'M0-46 40-30V8C40 34 20 52 0 62-20 52-40 34-40 8V-30Z';
export const CREST_P = 'M-12-20H8a14 14 0 0 1 0 28H-4V34';
export const FONT = { display: "'Cinzel', 'Times New Roman', serif", mono: "'JetBrains Mono', ui-monospace, monospace", ui: "'Manrope', system-ui, sans-serif" };

// ---------- materiais ----------
const cache = new Map();
/** Material fosco padrão, em cache por parâmetros. */
export function std(color, o = {}) {
  const key = `s${color}|${o.rough ?? 0.85}|${o.metal ?? 0}|${o.emissive ?? 0}|${o.ei ?? 1}|${o.side ?? 0}|${o.flat ? 1 : 0}`;
  if (!o.map && cache.has(key)) return cache.get(key);
  const material = new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, flatShading: !!o.flat,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide,
  });
  if (o.map) { material.map = o.map; if (o.emissiveMap) { material.emissiveMap = o.map; material.emissive.set(0xffffff); } } else cache.set(key, material);
  return material;
}
/** Material que emite luz própria (ignora a iluminação). k > 1 entra no bloom. */
export function lit(color, k = 1, o = {}) {
  const key = `l${color}|${k}|${o.side ?? 0}|${o.add ? 1 : 0}|${o.opacity ?? 1}|${o.fog === false ? 0 : 1}`;
  if (!o.map && cache.has(key)) return cache.get(key);
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: o.side ?? THREE.FrontSide, fog: o.fog !== false });
  if (o.map) material.map = o.map;
  if (o.add) { material.blending = THREE.AdditiveBlending; material.depthWrite = false; material.transparent = true; }
  if (o.opacity !== undefined && o.opacity < 1) { material.transparent = true; material.opacity = o.opacity; material.depthWrite = false; }
  if (o.transparent) material.transparent = true;
  if (!o.map) cache.set(key, material);
  return material;
}

let toonRamp;
/** Rampa de 4 tons para o sombreamento estilo anime. */
export function ramp() {
  if (toonRamp) return toonRamp;
  toonRamp = new THREE.DataTexture(new Uint8Array([105, 165, 225, 255]), 4, 1, THREE.RedFormat);
  toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.needsUpdate = true;
  return toonRamp;
}
export const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: ramp(), side: o.side ?? THREE.FrontSide, ...(o.map ? { map: o.map, transparent: true, alphaTest: o.alphaTest ?? 0 } : {}) });

// ---------- sombreamento de personagens (cel shading próprio, independente das luzes do cenário) ----------
export const charLook = {
  light: { value: new THREE.Vector3(-0.5, 0.62, 0.6).normalize() },
  shade: { value: new THREE.Color(0.66, 0.62, 0.82) },
  tint: { value: new THREE.Color(1, 1, 1) },
  rim: { value: new THREE.Color(0.3, 0.26, 0.42) },
};
const CHAR_VERT = `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
  void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const CHAR_FRAG = `uniform vec3 uColor, uShade, uTint, uRim, uLight; uniform sampler2D uMap; uniform float uUseMap, uAlphaTest, uDim;
  varying vec3 vN; varying vec3 vV; varying vec2 vUv;
  void main(){
    vec3 base = uColor;
    if (uUseMap > 0.5) { vec4 t = texture2D(uMap, vUv); if (t.a < uAlphaTest) discard; base *= t.rgb; }
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    float ndl = dot(n, uLight);
    float lit = smoothstep(-0.03, 0.05, ndl);
    vec3 col = base * mix(uShade, vec3(1.0), lit) * (0.93 + 0.1 * smoothstep(-0.5, 1.0, ndl));
    float fres = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 3.0);
    col += uRim * fres * smoothstep(-0.3, 0.6, n.y + 0.25);
    // personagens nunca passam do limiar do bloom: quem brilha é o cenário
    gl_FragColor = vec4(min(col * uTint, vec3(0.96)) * uDim, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
/** Material de personagem: dois tons com luz de contorno. dim é um uniforme compartilhado pelo ator. */
export function charMaterial(color, o = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: CHAR_VERT, fragmentShader: CHAR_FRAG, side: o.side ?? THREE.FrontSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uMap: { value: o.map || null }, uUseMap: { value: o.map ? 1 : 0 }, uAlphaTest: { value: o.alphaTest ?? 0 },
      uDim: o.dim || { value: 1 }, uShade: charLook.shade, uTint: charLook.tint, uRim: charLook.rim, uLight: charLook.light,
    },
  });
}

// ---------- texturas em canvas ----------
const fontTextures = [];
export function canvasTexture(width, height, draw, o = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = o.anisotropy ?? 8;
  if (o.repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(o.repeat[0], o.repeat[1]); }
  texture.redraw = (...args) => { ctx.clearRect(0, 0, width, height); draw(ctx, width, height, ...args); texture.needsUpdate = true; };
  texture.redraw();
  if (o.fonts) fontTextures.push(texture);
  return texture;
}
/** Redesenha as texturas com texto quando as fontes da página terminam de carregar. */
export function redrawFontTextures() { for (const texture of fontTextures) texture.redraw(); }

export function drawCrest(ctx, x, y, scale, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = ctx.lineCap = 'round';
  const shield = new Path2D(CREST_SHIELD);
  if (o.fill !== null) { ctx.fillStyle = o.fill || '#0b0f1e'; ctx.fill(shield); }
  ctx.strokeStyle = o.stroke || '#d4af6a';
  ctx.lineWidth = o.width || 5;
  ctx.stroke(shield);
  ctx.lineWidth = (o.width || 5) * 1.6;
  ctx.stroke(new Path2D(CREST_P));
  ctx.restore();
}

let crestTex;
export function crestTexture() {
  return (crestTex ||= canvasTexture(256, 300, (ctx) => drawCrest(ctx, 128, 138, 2.1, { width: 4 })));
}

let glowTex;
export function glowTexture() {
  return (glowTex ||= canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }));
}
/** Halo aditivo sempre voltado para a câmera (lâmpadas, lua, aura de personagens). */
export function halo(color, size, opacity = 0.6) {
  const material = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

/** Placa com textura (texto, telas). Devolve o mesh já posicionado. */
export function plate(texture, width, height, x, y, z, ry = 0, o = {}) {
  const material = o.glow
    ? lit(0xffffff, o.glow, { map: texture, transparent: o.transparent, add: o.add })
    : std(0xffffff, { map: texture, rough: o.rough ?? 0.7 });
  if (o.transparent && !o.glow) material.transparent = true;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  return mesh;
}

// ---------- lotes de geometria ----------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new V3();
const _s = new V3();

/** Junta dezenas de peças em um único mesh por material: menos chamadas de desenho. */
export class Batch {
  constructor() { this.buckets = new Map(); }
  add(geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.clearGroups();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
    if (geometry !== g && !geometry.userData.keep) geometry.dispose();
    return this;
  }
  box(material, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), material, x, y, z, rx, ry, rz); }
  cyl(material, rTop, rBottom, h, x, y, z, seg = 12, rx = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, seg), material, x, y, z, rx, 0, rz); }
  ball(material, r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 14) { return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0)), material, x, y, z, 0, 0, 0, sx, sy, sz); }
  cone(material, r, h, x, y, z, seg = 8, rx = 0, rz = 0) { return this.add(new THREE.ConeGeometry(r, h, seg), material, x, y, z, rx, 0, rz); }
  quad(material, w, h, x, y, z, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.PlaneGeometry(w, h), material, x, y, z, rx, ry, rz); }
  build(o = {}) {
    const group = new THREE.Group();
    for (const [material, list] of this.buckets) {
      const merged = THREE.BufferGeometryUtils.mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, material);
      const unlit = material.isMeshBasicMaterial;
      mesh.castShadow = !unlit && o.cast !== false;
      mesh.receiveShadow = !unlit && o.receive !== false;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}

/** Gerador pseudoaleatório determinístico: os cenários saem sempre iguais. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Cúpula de céu com degradê vertical (cores de baixo para cima). */
export function skyDome(stops, radius = 400) {
  const colors = stops.map(([, c]) => new THREE.Color(c));
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { c0: { value: colors[0] }, c1: { value: colors[1] }, c2: { value: colors[2] }, c3: { value: colors[3] }, p: { value: new THREE.Vector3(stops[1][0], stops[2][0], stops[3][0]) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 c0, c1, c2, c3; uniform vec3 p;
      void main(){ float h = clamp(vDir.y, 0.0, 1.0);
        vec3 c = mix(c0, c1, smoothstep(0.0, p.x, h)); c = mix(c, c2, smoothstep(p.x, p.y, h)); c = mix(c, c3, smoothstep(p.y, p.z, h));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

/** Campo de estrelas que cintilam (um único draw call). */
export function starField(count, radius, seed, o = {}) {
  const r = rng(seed);
  const positions = new Float32Array(count * 3);
  const phase = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const azimuth = r() * Math.PI * 2;
    const y = (o.minY ?? 0.08) + r() * (1 - (o.minY ?? 0.08));
    const flat = Math.sqrt(1 - y * y);
    positions.set([Math.cos(azimuth) * flat * radius, y * radius, Math.sin(azimuth) * flat * radius], i * 3);
    phase.set([r() * 6.28, r() < 0.08 ? 2.6 : 0.8 + r() * 1.3], i * 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phase, 2));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uColor: { value: new THREE.Color(o.color ?? 0xffffff) } },
    vertexShader: `attribute vec2 phase; uniform float uTime, uScale; varying float vA;
      void main(){ vA = 0.55 + 0.45 * sin(uTime * (0.6 + phase.y * 0.5) + phase.x);
        gl_PointSize = phase.y * 1.7 * uScale; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * 1.6, smoothstep(0.5, 0.05, d) * vA); }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData.tick = (t, scale) => { material.uniforms.uTime.value = t; material.uniforms.uScale.value = scale; };
  return points;
}

/** Partículas flutuantes (poeira dourada, vaga-lumes) dentro de uma caixa. */
export function motes(count, box, seed, o = {}) {
  const r = rng(seed);
  const positions = new Float32Array(count * 3);
  const phase = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([box[0] + r() * (box[3] - box[0]), box[1] + r() * (box[4] - box[1]), box[2] + r() * (box[5] - box[2])], i * 3);
    phase.set([r() * 6.28, 0.4 + r() * 1.2, 0.5 + r()], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phase, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uColor: { value: new THREE.Color(o.color ?? 0xe9c98a) }, uSize: { value: o.size ?? 26 }, uRise: { value: o.rise ?? 0.12 }, uSpan: { value: box[4] - box[1] }, uBase: { value: box[1] } },
    vertexShader: `attribute vec3 phase; uniform float uTime, uScale, uSize, uRise, uSpan, uBase; varying float vA;
      void main(){ vec3 q = position;
        q.y = uBase + mod(q.y - uBase + uTime * uRise * phase.y, uSpan);
        q.x += sin(uTime * 0.5 * phase.y + phase.x) * 0.25; q.z += cos(uTime * 0.4 * phase.y + phase.x * 1.7) * 0.25;
        vec4 mv = modelViewMatrix * vec4(q, 1.0);
        float edge = smoothstep(0.0, 0.12, (q.y - uBase) / uSpan) * smoothstep(1.0, 0.85, (q.y - uBase) / uSpan);
        vA = (0.45 + 0.55 * sin(uTime * 1.3 * phase.y + phase.x * 3.0)) * edge;
        gl_PointSize = uSize * phase.z * uScale / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * 1.4, smoothstep(0.5, 0.0, d) * vA); }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData.tick = (t, scale) => { material.uniforms.uTime.value = t; material.uniforms.uScale.value = scale; };
  return points;
}

/** Facho de luz volumétrico falso: um quadrilátero aditivo com degradê (a, b = borda de cima; c, d = borda de baixo). */
let shaftTex;
export function beam(a, b, c, d, color, opacity = 0.25) {
  shaftTex ||= canvasTexture(64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    const side = ctx.createLinearGradient(0, 0, 64, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.28, 'rgba(0,0,0,0)'); side.addColorStop(0.72, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, 64, 256);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...b, ...d, ...c], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0], 2));
  const material = new THREE.MeshBasicMaterial({ map: shaftTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 5;
  return mesh;
}

export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const ease = (t) => t * t * (3 - 2 * t);
