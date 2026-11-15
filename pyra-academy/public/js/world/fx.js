// Efeitos de partículas disparados pelo jogo: confete de vitória e faíscas de Mérito.
import * as THREE from './three.js';
import { world, onTick, pointScale } from './engine.js';
import { glowTexture } from './kit.js';
import { reducedMotion } from '../util.js';

const live = new Set();

/**
 * Explosão de partículas coloridas que caem com gravidade.
 * @param {THREE.Vector3} at   ponto de origem (coordenadas do mundo)
 * @param {object} o           { count, colors, speed, life, size, gravity, up }
 */
export function burst(at, o = {}) {
  if (!world.enabled || !world.current || reducedMotion()) return;
  const count = Math.round((o.count || 120) * world.q.density);
  const colors = (o.colors || [0xf3d999, 0xd4af6a, 0xffffff, 0x7fd8ff, 0xff7ab8]).map((c) => new THREE.Color(c));
  const positions = new Float32Array(count * 3);
  const tints = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const speed = o.speed || 4.5;
  for (let i = 0; i < count; i++) {
    positions.set([at.x, at.y, at.z], i * 3);
    const a = Math.random() * Math.PI * 2;
    const lift = Math.random();
    const s = speed * (0.35 + Math.random() * 0.65);
    velocity.set([Math.cos(a) * s * (1 - lift * 0.5), s * (0.5 + lift) * (o.up ?? 1), Math.sin(a) * s * (1 - lift * 0.5)], i * 3);
    const c = colors[i % colors.length];
    tints.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(tints, 3));
  const material = new THREE.PointsMaterial({ size: (o.size || 0.16), map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
  material.color.multiplyScalar(1.6);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const scene = world.current.scene;
  scene.add(points);
  live.add({ points, velocity, age: 0, life: o.life || 2.4, gravity: o.gravity ?? 7.5, floor: o.floor ?? 0.02, scene });
}

onTick((dt) => {
  for (const item of live) {
    item.age += dt;
    const position = item.points.geometry.attributes.position;
    const array = position.array;
    for (let i = 0; i < array.length; i += 3) {
      item.velocity[i + 1] -= item.gravity * dt;
      array[i] += item.velocity[i] * dt;
      array[i + 1] += item.velocity[i + 1] * dt;
      array[i + 2] += item.velocity[i + 2] * dt;
      if (array[i + 1] < item.floor) { array[i + 1] = item.floor; item.velocity[i + 1] *= -0.3; item.velocity[i] *= 0.6; item.velocity[i + 2] *= 0.6; }
    }
    position.needsUpdate = true;
    item.points.material.opacity = Math.max(0, 1 - Math.pow(item.age / item.life, 2.5));
    if (item.age >= item.life || item.scene !== world.current?.scene) {
      item.points.removeFromParent();
      item.points.geometry.dispose();
      item.points.material.dispose();
      live.delete(item);
    }
  }
});

export { pointScale };
