// Motor do mundo 3D: renderizador, laço de animação, câmera com amortecimento,
// troca de cenários com fade, níveis de qualidade e pós-processamento (bloom).
import * as THREE from './three.js';
import { V3, damp, clamp, redrawFontTextures } from './kit.js';
import { reducedMotion, sleep } from '../util.js';
import { state, save } from '../state.js';

export const QUALITY = {
  low: { label: 'Baixa', dpr: 1, shadows: false, bloom: false, density: 0.4, shadowSize: 0 },
  medium: { label: 'Média', dpr: 1.5, shadows: true, bloom: true, density: 0.75, shadowSize: 1024 },
  high: { label: 'Alta', dpr: 2, shadows: true, bloom: true, density: 1, shadowSize: 2048 },
};
const ORDER = ['low', 'medium', 'high'];

const rig = {
  pos: new V3(0, 1.6, 6), look: new V3(0, 1.4, 0), fov: 50, center: 0.5,
  tPos: new V3(0, 1.6, 6), tLook: new V3(0, 1.4, 0), tFov: 50, tCenter: 0.5,
  lambda: 2.6, sway: 1, parallax: 1, shake: 0, drift: null, driftT: 0, free: false,
};

export const world = {
  enabled: false, renderer: null, camera: null, current: null, quality: 'medium', q: QUALITY.medium,
  time: 0, fps: 60, pointer: { x: 0, y: 0 }, rig, activity: 'full', width: 1, height: 1, software: false,
};

const builders = new Map();
const sets = new Map();
const tickers = new Set();
const listeners = new Map();
let renderer, camera, composer, renderPass, bloomPass, canvas;
let last = 0;
let accumulator = 0;
let switching = 0;
let slowWindows = 0;
let frames = 0;
let frameClock = 0;
let contextLost = false;

export const on = (event, fn) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); return () => listeners.get(event).delete(fn); };
const emit = (event, payload) => listeners.get(event)?.forEach((fn) => { try { fn(payload); } catch (error) { console.error(error); } });
export const onTick = (fn) => { tickers.add(fn); return () => tickers.delete(fn); };
export const defineSet = (name, builder) => builders.set(name, builder);

function pickInitialQuality(gl) {
  if (QUALITY[state.gfx]) return state.gfx;
  let name = '';
  try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; } catch { /* sem a extensão */ }
  world.software = /swiftshader|llvmpipe|software|basic render/i.test(name);
  if (world.software) return 'low';
  const small = Math.min(innerWidth, innerHeight) < 560 || matchMedia('(pointer: coarse)').matches;
  if (small || (navigator.hardwareConcurrency || 4) <= 4) return 'medium';
  return devicePixelRatio > 1.4 ? 'medium' : 'high';
}

/** Cria o renderizador. Devolve false quando não há WebGL: o jogo segue com os cenários em SVG. */
export function initWorld() {
  canvas = document.getElementById('world');
  if (!canvas || new URLSearchParams(location.search).get('gl') === '0') return false;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
  } catch {
    return false;
  }
  world.renderer = renderer;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x05060d, 1);
  camera = world.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);

  world.quality = pickInitialQuality(renderer.getContext());
  world.q = QUALITY[world.quality];
  world.enabled = true;
  document.body.classList.add('gl');

  addEventListener('resize', resize);
  addEventListener('pointermove', (event) => {
    world.pointer.x = (event.clientX / innerWidth - 0.5) * 2;
    world.pointer.y = (event.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); contextLost = true; });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; buildComposer(); resize(); });
  document.fonts?.ready.then(() => redrawFontTextures());

  buildComposer();
  resize();
  requestAnimationFrame(loop);
  return true;
}

function buildComposer() {
  composer?.dispose?.();
  composer = null;
  if (!world.q.bloom) return;
  composer = new THREE.EffectComposer(renderer);
  renderPass = new THREE.RenderPass(world.current?.scene || new THREE.Scene(), camera);
  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.6, 0.9);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(new THREE.OutputPass());
  applySetLook();
}

function resize() {
  if (!renderer) return;
  const width = world.width = Math.max(1, innerWidth);
  const height = world.height = Math.max(1, innerHeight);
  const scale = world.activity === 'idle' ? 0.7 : 1;
  const ratio = Math.min(devicePixelRatio || 1, world.q.dpr) * scale;
  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  composer?.setPixelRatio(ratio);
  composer?.setSize(width, height);
  camera.aspect = width / height;
  applyCenter(true);
}

function applyCenter(force) {
  // Desloca o ponto de fuga na vertical para a ação ficar acima das caixas de texto.
  const shift = Math.round((0.5 - rig.center) * world.height);
  if (!force && shift === applyCenter.last) return;
  applyCenter.last = shift;
  if (shift) camera.setViewOffset(world.width, world.height, 0, shift, world.width, world.height);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

function applySetLook() {
  const set = world.current;
  if (!set) return;
  renderer.shadowMap.enabled = world.q.shadows;
  renderer.toneMappingExposure = set.exposure ?? 1.05;
  for (const light of set.shadowLights || []) {
    light.castShadow = world.q.shadows;
    if (world.q.shadows && light.shadow.mapSize.x !== world.q.shadowSize) {
      light.shadow.mapSize.set(world.q.shadowSize, world.q.shadowSize);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
  }
  if (set.shadowState !== world.q.shadows) {
    // Ligar ou desligar sombras exige recompilar os materiais deste cenário (uma vez só).
    if (set.shadowState !== undefined) set.scene.traverse((object) => { if (object.material) object.material.needsUpdate = true; });
    set.shadowState = world.q.shadows;
  }
  if (renderPass) renderPass.scene = set.scene;
  if (bloomPass) {
    const [strength, radius, threshold] = set.bloom || [0.55, 0.6, 0.9];
    bloomPass.strength = strength;
    bloomPass.radius = radius;
    bloomPass.threshold = threshold;
  }
  set.applyQuality?.(world.q);
}

export function setQuality(name, persist = true) {
  if (!world.enabled || !QUALITY[name]) return;
  world.quality = name;
  world.q = QUALITY[name];
  if (persist) { state.gfx = name; save(); }
  buildComposer();
  applySetLook();
  resize();
  emit('quality', name);
}
/** 'auto' devolve a escolha ao jogo (com redução automática se o quadro cair). */
export function setQualityAuto() {
  state.gfx = 'auto';
  save();
  slowWindows = 0;
  setQuality(pickInitialQuality(renderer.getContext()), false);
}

/** 'full' = jogo em primeiro plano; 'idle' = atrás de uma página de estudo (mais leve). */
export function setActivity(mode) {
  if (!world.enabled || world.activity === mode) return;
  world.activity = mode;
  resize();
}

export function getSet(name) {
  if (!sets.has(name)) {
    let set;
    try {
      set = (builders.get(name) || builders.get('black'))(world.q);
    } catch (error) {
      // Um cenário com defeito não derruba o jogo: cai no "vazio" e a história continua.
      console.error(`O cenário "${name}" não pôde ser montado.`, error);
      set = name === 'black' ? { scene: new THREE.Scene(), shots: { vn: { pos: [0, 1.4, 2], look: [0, 1.5, -6], fov: 50 } }, floor: 0 } : { ...getSet('black') };
    }
    set.name = name;
    sets.set(name, set);
  }
  return sets.get(name);
}

const toV3 = (value, target) => (Array.isArray(value) ? target.set(value[0], value[1], value[2]) : target.copy(value));

/** Aponta a câmera para um plano (nome do cenário ou objeto { pos, look, fov, center, drift }). */
export function setShot(shot, o = {}) {
  if (!world.enabled) return;
  const spec = typeof shot === 'string' ? (world.current?.shots?.[shot] || world.current?.shots?.vn) : shot;
  if (!spec) return;
  toV3(spec.pos, rig.tPos);
  toV3(spec.look, rig.tLook);
  rig.tFov = spec.fov ?? 50;
  rig.tCenter = o.center ?? spec.center ?? 0.5;
  rig.lambda = o.lambda ?? spec.lambda ?? 2.6;
  rig.sway = spec.sway ?? 1;
  rig.parallax = spec.parallax ?? 1;
  rig.drift = spec.drift ? { from: rig.tPos.clone(), by: new V3(...spec.drift), time: spec.driftTime || 30 } : null;
  rig.driftT = 0;
  rig.free = false;
  if (o.cut || reducedMotion()) {
    rig.pos.copy(rig.tPos);
    rig.look.copy(rig.tLook);
    rig.fov = rig.tFov;
    rig.center = rig.tCenter;
  }
}

/** Troca de cenário com fade. Resolve quando o novo cenário já está visível. */
export async function setScene(name, o = {}) {
  if (!world.enabled) return;
  const token = ++switching;
  if (world.current?.name === name) {
    if (o.shot) setShot(o.shot, { cut: o.cut, center: o.center });
    canvas.style.opacity = 1;
    return;
  }
  if (world.current && !o.instant && !reducedMotion()) {
    canvas.style.opacity = 0;
    await sleep(240);
    if (token !== switching) return;
  }
  const previous = world.current;
  const set = getSet(name);
  previous?.leave?.();
  world.current = set;
  emit('scene', { name, set, previous });
  applySetLook();
  set.enter?.();
  setShot(o.shot || 'vn', { cut: true, center: o.center });
  canvas.style.opacity = 1;
}

export function shake(amount = 0.05) { if (!reducedMotion()) rig.shake = Math.max(rig.shake, amount); }

const _v = new V3();
const _right = new V3();
const _up = new V3();
/** Converte um ponto do mundo em pixels da tela. */
export function project(point, out = {}) {
  _v.copy(point).project(camera);
  out.x = (_v.x * 0.5 + 0.5) * world.width;
  out.y = (-_v.y * 0.5 + 0.5) * world.height;
  out.visible = _v.z < 1 && _v.z > -1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1;
  return out;
}

const raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
export function pick(clientX, clientY, objects, recursive = true) {
  _ndc.set((clientX / world.width) * 2 - 1, -(clientY / world.height) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  return raycaster.intersectObjects(objects, recursive);
}
export function rayToFloor(clientX, clientY, y = 0, out = new V3()) {
  _ndc.set((clientX / world.width) * 2 - 1, -(clientY / world.height) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  const { origin, direction } = raycaster.ray;
  if (Math.abs(direction.y) < 1e-4) return null;
  const distance = (y - origin.y) / direction.y;
  if (distance < 0 || distance > 200) return null;
  return out.copy(direction).multiplyScalar(distance).add(origin);
}

function updateRig(dt, t) {
  const calm = reducedMotion();
  if (rig.drift && !calm) {
    rig.driftT = Math.min(1, rig.driftT + dt / rig.drift.time);
    const k = 1 - Math.pow(1 - rig.driftT, 2.2);
    rig.tPos.copy(rig.drift.from).addScaledVector(rig.drift.by, k);
  }
  const lambda = rig.lambda;
  rig.pos.set(damp(rig.pos.x, rig.tPos.x, lambda, dt), damp(rig.pos.y, rig.tPos.y, lambda, dt), damp(rig.pos.z, rig.tPos.z, lambda, dt));
  rig.look.set(damp(rig.look.x, rig.tLook.x, lambda, dt), damp(rig.look.y, rig.tLook.y, lambda, dt), damp(rig.look.z, rig.tLook.z, lambda, dt));
  rig.center = damp(rig.center, rig.tCenter, 4, dt);
  rig.fov = Math.abs(rig.fov - rig.tFov) > 0.01 ? damp(rig.fov, rig.tFov, 3, dt) : rig.tFov;
  // Em telas estreitas (celular em pé) o campo de visão vertical cresce para não cortar a cena.
  const widen = clamp(1.45 / camera.aspect, 1, 1.9);
  const fov = widen > 1 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(rig.fov) / 2) * widen)) : rig.fov;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  applyCenter(false);

  camera.position.copy(rig.pos);
  camera.lookAt(rig.look);
  if (!calm && !rig.free) {
    _right.setFromMatrixColumn(camera.matrixWorld, 0);
    _up.setFromMatrixColumn(camera.matrixWorld, 1);
    const sx = world.pointer.x * 0.14 * rig.parallax + Math.sin(t * 0.23) * 0.035 * rig.sway;
    const sy = -world.pointer.y * 0.08 * rig.parallax + Math.sin(t * 0.31 + 1) * 0.022 * rig.sway;
    camera.position.addScaledVector(_right, sx).addScaledVector(_up, sy);
    camera.lookAt(rig.look);
  }
  if (rig.shake > 0.0005) {
    camera.position.x += (Math.random() - 0.5) * rig.shake;
    camera.position.y += (Math.random() - 0.5) * rig.shake;
    rig.shake *= Math.exp(-9 * dt);
  }
  camera.updateMatrixWorld();
}

function watchFrameRate(dt) {
  frames += 1;
  frameClock += dt;
  if (frameClock < 2) return;
  world.fps = frames / frameClock;
  frames = 0;
  frameClock = 0;
  if (state.gfx !== 'auto' && state.gfx) return;
  if (world.activity !== 'full') { slowWindows = 0; return; }
  slowWindows = world.fps < 32 ? slowWindows + 1 : 0;
  const index = ORDER.indexOf(world.quality);
  if (slowWindows >= 2 && index > 0) { slowWindows = 0; setQuality(ORDER[index - 1], false); emit('autoQuality', world.quality); }
}

function loop(now) {
  requestAnimationFrame(loop);
  const elapsed = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  if (document.hidden || contextLost || !world.current || world.activity === 'paused') return;
  // Atrás das páginas de estudo o mundo roda a ~20 quadros por segundo para poupar o editor.
  accumulator += elapsed;
  const step = world.activity === 'idle' ? 1 / 20 : 0;
  if (accumulator < step) return;
  const dt = Math.min(0.1, accumulator);
  accumulator = 0;
  world.time += dt;
  const t = world.time;

  for (const fn of tickers) fn(dt, t);
  world.current.update?.(dt, t);
  updateRig(dt, t);
  if (composer) composer.render(dt);
  else renderer.render(world.current.scene, camera);
  emit('frame', dt);
  watchFrameRate(elapsed);
}

/** Tamanho dos pontos (partículas) proporcional à altura da tela. */
export const pointScale = () => (world.height / 900) * (renderer?.getPixelRatio() || 1);
