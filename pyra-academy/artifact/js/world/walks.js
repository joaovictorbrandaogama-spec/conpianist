// Trechos jogáveis do prólogo: atravessar o portão e percorrer o corredor até a Sala Ômega.
import { V3 } from './kit.js';
import { world, getSet, setScene } from './engine.js';
import { startExplore } from './explore.js';

const WALKS = {
  gate: () => {
    const set = getSet('gate');
    return {
      scene: 'gate', spawn: new V3(0, 0, 10.5), yaw: Math.PI, camYaw: 0, camDist: 5.4, camPitch: 0.2, speed: 4.6,
      goal: { id: 'goal', label: 'Entrada da Academia', at: new V3(0, 3.2, -37.6), stand: new V3(0, 0, -33.4), reach: 2.4 },
      // o portão só deixa passar depois de abrir sozinho
      colliders: () => (set.gate < 0.72 ? [[-2.95, -0.45, 2.95, 0.45]] : []),
      tick: (pos) => { if (pos.z < 7.2) set.openGate(true); },
    };
  },
  hall: () => ({
    scene: 'hall', spawn: new V3(0, 0, 2.2), yaw: Math.PI, camYaw: 0, camDist: 3.7, camPitch: 0.17, speed: 4.1,
    goal: { id: 'goal', label: 'Sala Ômega', at: new V3(0, 2.3, -29.9), stand: new V3(0, 0, -28.2), reach: 1.7 },
  }),
};

/**
 * Inicia um trecho jogável.
 * @param {string} kind 'gate' | 'hall'
 * @param {object} o { pad, onFrame({ x, y, visible, distance, label }), onMoved }
 * @returns {{ done: Promise<void>, finish: () => void, setStick: (x: number, y: number) => void, go: () => void }}
 */
export function runWalk(kind, o) {
  let explore = null;
  let ended = false;
  let resolveDone;
  const done = new Promise((resolve) => { resolveDone = resolve; });
  const finish = () => {
    if (ended) return;
    ended = true;
    explore?.stop();
    resolveDone();
  };
  const spec = WALKS[kind]?.();
  if (!world.enabled || !spec) { finish(); return { done, finish, setStick() {}, go() {} }; }

  (async () => {
    await setScene(spec.scene, { shot: 'walk' });
    if (ended) return;
    explore = startExplore({
      pad: o.pad, targets: [spec.goal], spawn: spec.spawn, yaw: spec.yaw, camYaw: spec.camYaw, camDist: spec.camDist, camPitch: spec.camPitch,
      speed: spec.speed, colliders: spec.colliders, onMoved: o.onMoved,
      onInteract: finish,
      onFrame: ({ labels, pos }) => {
        spec.tick?.(pos);
        const label = labels[0];
        o.onFrame?.({ x: label.x, y: label.y, visible: label.visible, distance: label.distance, label: spec.goal.label });
        if (label.distance < spec.goal.reach) finish();
      },
    });
  })();

  return { done, finish, setStick: (x, y) => explore?.setStick(x, y), go: () => explore?.walkTo('goal') };
}
