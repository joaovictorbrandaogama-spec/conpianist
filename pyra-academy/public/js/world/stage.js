// Palco da visual novel em 3D: coloca os personagens diante da câmera nas posições
// esquerda / centro / direita, destaca quem fala e move a câmera de leve a cada fala.
import * as THREE from './three.js';
import { V3 } from './kit.js';
import { world, on, setShot, shake } from './engine.js';
import { getActor, hasModel } from './cast3d.js';

const DIST = 1.52;
const onStage = new Map(); // id -> { actor, slot, x }
const _up = new V3(0, 1, 0);

function layout() {
  const set = world.current;
  const shot = set?.shots?.vn;
  if (!shot) return null;
  const pos = new V3(...shot.pos);
  const look = new V3(...shot.look);
  const forward = look.clone().sub(pos);
  forward.y = 0;
  forward.normalize();
  const right = new V3().crossVectors(forward, _up).normalize();
  const halfWidth = Math.tan(THREE.MathUtils.degToRad(world.camera.fov) / 2) * DIST * world.camera.aspect;
  const spread = Math.min(0.86, halfWidth * 0.56);
  const center = pos.clone().addScaledVector(forward, DIST);
  center.y = set.floor || 0;
  return { shot, pos, look, forward, right, spread, center };
}

const offsetOf = (slot, spread) => (slot === 'left' ? -spread : slot === 'right' ? spread : 0);

function position(entry, L) {
  entry.x = offsetOf(entry.slot, L.spread);
  // quem fica nas laterais recua um pouco e vira para a câmera
  const depth = entry.slot === 'center' ? 0 : 0.16;
  const p = L.center.clone().addScaledVector(L.right, entry.x).addScaledVector(L.forward, depth);
  entry.actor.place(p.x, p.y, p.z, Math.atan2(L.pos.x - p.x, L.pos.z - p.z));
}

function frame(entry, L) {
  const lean = entry ? entry.x : 0;
  const pos = L.pos.clone().addScaledVector(L.right, lean * 0.1);
  const look = L.look.clone().addScaledVector(L.right, lean * 1.5);
  setShot({ pos, look, fov: L.shot.fov, center: 0.39, lambda: 2.2 });
}

function remove(id) {
  const entry = onStage.get(id);
  if (!entry) return;
  entry.actor.setTalking(false);
  entry.actor.group.removeFromParent();
  onStage.delete(id);
}

export const stage = {
  /** Mostra (ou atualiza) um personagem. Devolve false se não houver modelo 3D. */
  show(id, expr = 'neutral', pos) {
    if (!world.enabled || !hasModel(id)) return false;
    const L = layout();
    if (!L) return false;
    let entry = onStage.get(id);
    if (!entry) {
      const taken = new Set([...onStage.values()].map((item) => item.slot));
      const slot = pos || ['center', 'left', 'right'].find((name) => !taken.has(name)) || 'center';
      for (const [other, item] of [...onStage]) if (item.slot === slot) remove(other);
      const actor = getActor(id);
      actor.setPose(null);
      actor.walk = 0;
      actor.appear = 0;
      actor.aura = 0.16;
      actor.lookAt(world.camera.position);
      world.current.scene.add(actor.group);
      entry = { actor, slot, x: 0 };
      onStage.set(id, entry);
      position(entry, L);
    }
    const before = entry.actor.expr;
    entry.actor.setExpr(expr);
    entry.actor.bump();
    for (const [other, item] of onStage) item.actor.setDim(other !== id);
    frame(entry, L);
    if (expr !== before && (expr === 'surprised' || expr === 'angry')) shake(0.035);
    return true;
  },
  /** Ninguém em destaque (narração ou fala da pessoa jogadora). */
  rest() { for (const item of onStage.values()) item.actor.setDim(true); },
  talk(id, on) { onStage.get(id)?.actor.setTalking(on); },
  clear() { for (const id of [...onStage.keys()]) remove(id); },
  has: (id) => onStage.has(id),
  count: () => onStage.size,
};

on('scene', () => stage.clear());
addEventListener('resize', () => {
  const L = layout();
  if (!L) return;
  for (const entry of onStage.values()) position(entry, L);
});
