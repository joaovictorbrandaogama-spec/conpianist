// Exploração em terceira pessoa: a pessoa jogadora anda pelo cenário (teclado, clique ou toque),
// a câmera acompanha e os pontos de interação respondem à proximidade.
import { V3, damp, clamp } from './kit.js';
import { world, onTick, project, rayToFloor } from './engine.js';
import { getActor } from './cast3d.js';
import { reducedMotion, sfx } from '../util.js';

const WALK_SPEED = 3.1;
const RADIUS = 0.3;
const REACH = 1.75;
const KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const angleDelta = (from, to) => { let d = (to - from) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const typing = (event) => !!event.target.closest?.('input, textarea, select, [contenteditable]');

/**
 * @param {object} o
 * @param {HTMLElement} o.pad           área que recebe arrastar/clicar
 * @param {Array} o.targets             [{ id, at: V3, stand: V3, label, hint, npc?: Actor }]
 * @param {(id: string) => void} o.onInteract
 * @param {(info: { near: object|null, labels: Array }) => void} [o.onFrame]
 * @param {() => boolean} [o.blocked]   true enquanto algo (diálogo, tutora) pede o teclado
 */
export function startExplore(o) {
  const set = world.current;
  const rig = world.rig;
  const player = getActor('voce');
  const pos = (o.spawn || set.spawn || new V3()).clone();
  let yaw = o.yaw ?? set.spawnYaw ?? Math.PI;
  let camYaw = o.camYaw ?? yaw + Math.PI;
  let camPitch = o.camPitch ?? 0.36;
  let camDist = o.camDist ?? 4.6;
  let speed = 0;
  let goal = null;          // { point: V3, target, stuck, detour, clock }
  let near = null;
  let focus = null;         // conversa: câmera aproxima de um personagem
  let moved = false;
  let stepClock = 0;
  let lift = 0;
  let alive = true;
  const held = new Set();
  const stick = { x: 0, y: 0 };
  const targets = o.targets || [];
  const bounds = o.bounds || set.bounds;
  const colliders = [...(set.colliders || [])];
  const dynamic = typeof o.colliders === 'function' ? o.colliders : null;
  const SPEED = o.speed || WALK_SPEED;
  const labels = targets.map((target) => ({ id: target.id, x: 0, y: 0, visible: false, distance: 99, target }));

  player.setPose(null);
  player.setExpr('neutral');
  player.setDim(false);
  player.lookAt(null);
  player.aura = 0;
  player.place(pos.x, set.floor || 0, pos.z, yaw);
  set.scene.add(player.group);
  rig.free = true;
  rig.sway = 0;
  rig.parallax = 0;
  rig.drift = null;
  rig.tCenter = 0.5;
  rig.tFov = 58;

  // ---------- entrada ----------
  const onKeyDown = (event) => {
    if (typing(event) || o.blocked?.() || event.ctrlKey || event.metaKey || event.altKey) return;
    if (KEYS[event.code]) { held.add(event.code); goal = null; event.preventDefault(); return; }
    if ((event.code === 'KeyE' || event.code === 'Enter' || event.code === 'Space') && near) { event.preventDefault(); interact(near); }
  };
  const onKeyUp = (event) => held.delete(event.code);
  const onBlur = () => held.clear();
  let drag = null;
  const onDown = (event) => {
    if (o.blocked?.()) return;
    drag = { x: event.clientX, y: event.clientY, moved: false, id: event.pointerId };
    o.pad.setPointerCapture?.(event.pointerId);
  };
  const onMove = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return;
    drag.moved = true;
    camYaw -= dx * 0.006;
    camPitch = clamp(camPitch + dy * 0.004, 0.06, 1.05);
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const onUp = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const wasDrag = drag.moved;
    drag = null;
    if (wasDrag || o.blocked?.()) return;
    // clique: primeiro tenta um ponto de interação, depois o chão
    let best = null;
    for (const label of labels) {
      if (!label.visible) continue;
      const d = Math.hypot(label.x - event.clientX, label.y - event.clientY);
      if (d < 74 && (!best || d < best.d)) best = { d, target: label.target };
    }
    if (best) { walkTo(best.target); return; }
    const point = rayToFloor(event.clientX, event.clientY, set.floor || 0);
    if (point) { goal = { point: clampPoint(point), target: null, stuck: 0, detour: 0, clock: 0 }; o.onGoal?.(goal.point); }
  };
  const onWheel = (event) => { camDist = clamp(camDist + event.deltaY * 0.004, 2.4, 6.5); event.preventDefault(); };
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', onBlur);
  o.pad.addEventListener('pointerdown', onDown);
  o.pad.addEventListener('pointermove', onMove);
  o.pad.addEventListener('pointerup', onUp);
  o.pad.addEventListener('pointercancel', onUp);
  o.pad.addEventListener('wheel', onWheel, { passive: false });

  function clampPoint(point) {
    point.x = clamp(point.x, bounds.minX, bounds.maxX);
    point.z = clamp(point.z, bounds.minZ, bounds.maxZ);
    return point;
  }
  function walkTo(target) {
    const d = Math.hypot(target.stand.x - pos.x, target.stand.z - pos.z);
    if (d < 0.5) { interact(target); return; }
    goal = { point: target.stand.clone(), target, stuck: 0, detour: 0, clock: 0 };
    o.onGoal?.(goal.point);
  }
  function interact(target) {
    goal = null;
    held.clear();
    // vira para o que está sendo usado
    yaw = Math.atan2(target.at.x - pos.x, target.at.z - pos.z);
    sfx.play('click');
    o.onInteract?.(target.id, target);
  }

  function collide() {
    pos.x = clamp(pos.x, bounds.minX, bounds.maxX);
    pos.z = clamp(pos.z, bounds.minZ, bounds.maxZ);
    for (const [minX, minZ, maxX, maxZ] of dynamic ? [...colliders, ...dynamic()] : colliders) {
      const a = minX - RADIUS, b = maxX + RADIUS, c = minZ - RADIUS, d = maxZ + RADIUS;
      if (pos.x <= a || pos.x >= b || pos.z <= c || pos.z >= d) continue;
      const push = [pos.x - a, b - pos.x, pos.z - c, d - pos.z];
      const least = push.indexOf(Math.min(...push));
      if (least === 0) pos.x = a; else if (least === 1) pos.x = b; else if (least === 2) pos.z = c; else pos.z = d;
    }
  }

  const playerHead = new V3();
  const _cam = new V3();
  const _head = new V3();
  const _tmp = new V3();
  const untick = onTick((dt) => {
    if (!alive) return;
    const blocked = !!o.blocked?.();
    if (blocked || world.current !== set) { held.clear(); player.walk = 0; return; }
    // direção pedida (relativa à câmera)
    let ix = stick.x;
    let iz = stick.y;
    if (!blocked) for (const code of held) { ix += KEYS[code][0]; iz += KEYS[code][1]; }
    let mx = 0;
    let mz = 0;
    const length = Math.hypot(ix, iz);
    if (length > 0.08 && !blocked) {
      goal = null;
      const k = Math.min(1, length) / length;
      const sin = Math.sin(camYaw);
      const cos = Math.cos(camYaw);
      // câmera olha para (-sin, -cos); "frente" da pessoa é iz negativo
      mx = (ix * cos + iz * sin) * k;
      mz = (-ix * sin + iz * cos) * k;
      if (!drag) camYaw -= ix * k * 1.15 * dt;
    } else if (goal && !blocked) {
      const dx = goal.point.x - pos.x;
      const dz = goal.point.z - pos.z;
      const distance = Math.hypot(dx, dz);
      goal.clock += dt;
      if (distance < 0.22 || goal.clock > 9) {
        const target = goal.target;
        goal = null;
        if (target) interact(target);
      } else {
        mx = dx / distance;
        mz = dz / distance;
        if (goal.detour) { const side = goal.detour > 0 ? 1 : -1; const tx = -mz * side; const tz = mx * side; mx = mx * 0.25 + tx; mz = mz * 0.25 + tz; goal.detour -= side * dt; if (Math.abs(goal.detour) < dt * 1.5) goal.detour = 0; }
      }
    }
    const before = _tmp.copy(pos);
    const wanted = Math.hypot(mx, mz);
    if (wanted > 0.01) {
      pos.x += mx * SPEED * dt;
      pos.z += mz * SPEED * dt;
      yaw += angleDelta(yaw, Math.atan2(mx, mz)) * Math.min(1, dt * 11);
    }
    collide();
    const real = Math.hypot(pos.x - before.x, pos.z - before.z) / Math.max(dt, 1e-4);
    speed = damp(speed, real, 12, dt);
    if (goal && wanted > 0.01) {
      // preso em um móvel: contorna pelo lado, e desiste se não houver saída
      goal.stuck = real < 0.5 ? goal.stuck + dt : 0;
      if (goal.stuck > 0.3 && !goal.detour) { goal.detour = (goal.flip = !goal.flip) ? 0.75 : -0.75; goal.stuck = 0; goal.tries = (goal.tries || 0) + 1; }
      if ((goal.tries || 0) > 5) { const target = goal.target; goal = null; if (target && Math.hypot(target.stand.x - pos.x, target.stand.z - pos.z) < 4) interact(target); }
    }
    player.walk = clamp(speed / SPEED, 0, 1);
    if (player.walk > 0.3) {
      if (!moved) { moved = true; o.onMoved?.(); }
      stepClock -= dt;
      if (stepClock <= 0) { stepClock = 1.02 / SPEED; sfx.play('step'); }
    }
    player.place(pos.x, set.floor || 0, pos.z, yaw);

    // alvo mais próximo
    playerHead.set(pos.x, 1.45, pos.z);
    let best = null;
    for (const label of labels) {
      const target = label.target;
      const d = Math.hypot(target.stand.x - pos.x, target.stand.z - pos.z);
      label.distance = d;
      if (d < (target.reach || REACH) && (!best || d < best.d)) best = { d, target };
      if (target.npc) target.npc.lookAt(d < 3.4 ? playerHead : null);
    }
    near = blocked ? null : best?.target || null;

    // câmera
    _head.set(pos.x, 1.3, pos.z);
    let distance = camDist;
    let pitch = camPitch;
    let lookAt = _head;
    if (focus) {
      lookAt = _tmp.copy(_head).lerp(focus.at, 0.62);
      distance = Math.max(2.3, Math.hypot(focus.at.x - pos.x, focus.at.z - pos.z) * 0.9 + 1.5);
      pitch = 0.2;
    }
    // a câmera recua até a parede mais próxima; perto da parede ela sobe para não perder a visão
    const margin = 0.3;
    const fit = (angle) => {
      const dx = Math.sin(camYaw) * Math.cos(angle);
      const dy = Math.sin(angle);
      const dz = Math.cos(camYaw) * Math.cos(angle);
      let room = distance;
      if (dx > 1e-4) room = Math.min(room, (bounds.maxX + margin - lookAt.x) / dx); else if (dx < -1e-4) room = Math.min(room, (bounds.minX - margin - lookAt.x) / dx);
      if (dz > 1e-4) room = Math.min(room, (bounds.maxZ + margin - lookAt.z) / dz); else if (dz < -1e-4) room = Math.min(room, (bounds.minZ - margin - lookAt.z) / dz);
      if (dy > 1e-4) room = Math.min(room, ((set.ceiling ?? 30) - 0.35 - lookAt.y) / dy);
      return [Math.max(0.9, room), dx, dy, dz];
    };
    let [room] = fit(pitch);
    lift = damp(lift, clamp(1 - room / distance, 0, 1) * 0.75, 5, dt);
    const [reach, dx, dy, dz] = fit(Math.min(1.25, pitch + lift));
    _cam.set(lookAt.x + dx * reach, lookAt.y + dy * reach, lookAt.z + dz * reach);
    rig.tPos.copy(_cam);
    rig.tLook.copy(lookAt);
    rig.lambda = reducedMotion() ? 30 : focus ? 4 : 9;
    rig.free = true;

    // rótulos na tela
    if (o.onFrame) {
      for (const label of labels) {
        project(label.target.tag || label.target.at, label);
      }
      o.onFrame({ near, labels, pos, goal: goal?.point || null });
    }
  });

  return {
    player,
    get position() { return pos; },
    get near() { return near; },
    get camYaw() { return camYaw; },
    setStick(x, y) { stick.x = x; stick.y = y; },
    interactNear() { if (near) interact(near); },
    walkTo(id) { const target = targets.find((item) => item.id === id); if (target) walkTo(target); },
    /** Aproxima a câmera de um ponto (conversa) ou devolve o controle com null. */
    focus(at) { focus = at ? { at: at.clone() } : null; if (at) yaw = Math.atan2(at.x - pos.x, at.z - pos.z); },
    faceCamera() { yaw = camYaw; },
    stop() {
      if (!alive) return;
      alive = false;
      untick();
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      removeEventListener('blur', onBlur);
      o.pad.removeEventListener('pointerdown', onDown);
      o.pad.removeEventListener('pointermove', onMove);
      o.pad.removeEventListener('pointerup', onUp);
      o.pad.removeEventListener('pointercancel', onUp);
      o.pad.removeEventListener('wheel', onWheel);
      for (const target of targets) target.npc?.lookAt(null);
      player.walk = 0;
      player.group.removeFromParent();
      rig.free = false;
      rig.sway = 1;
      rig.parallax = 1;
    },
  };
}
