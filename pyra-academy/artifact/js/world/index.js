// Fachada do mundo 3D para o resto do jogo.
import './set-gate.js';
import './set-school.js';
import './set-arena.js';
import { world, initWorld, setScene, setShot, setActivity, setQuality, setQualityAuto, getSet, on, onTick, shake, project, QUALITY } from './engine.js';

export { world, setScene, setShot, setActivity, setQuality, setQualityAuto, getSet, on, onTick, shake, project, QUALITY };

let started = false;
/** Liga o 3D uma única vez. Devolve true se o WebGL estiver disponível. */
export function startWorld() {
  if (started) return world.enabled;
  started = true;
  let ok = false;
  try { ok = initWorld(); } catch (error) { console.warn('Mundo 3D indisponível, usando cenários em SVG.', error); }
  if (!ok) document.body.classList.add('no-gl');
  return ok;
}
