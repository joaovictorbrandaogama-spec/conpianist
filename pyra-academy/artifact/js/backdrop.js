// Fundo 3D de cada tela do jogo e o "momento do ranking" (a câmera vai ao telão quando a posição sobe).
import { world, setScene, setShot, setActivity, getSet } from './world/index.js';
import { burst } from './world/fx.js';
import { V3 } from './world/kit.js';
import { reducedMotion } from './util.js';

const SHOTS = { sala: 'wide', missoes: 'board', ranking: 'rank' };
let view = 'sala';
let moment = 0;

/** Registra a tela atual sem mexer na câmera (usado enquanto uma cena da história está aberta). */
export function setBackdropView(next) { view = next; }

/** Compõe o cenário e o plano de câmera da tela atual. */
export function applyBackdrop(next) {
  if (next) view = next;
  if (!world.enabled || moment) return;
  if (view === 'prova') { setScene('arena', { shot: 'duel' }); setActivity('full'); return; }
  setScene('classroom', { shot: SHOTS[view] || 'page' });
  setActivity(view === 'sala' ? 'full' : 'idle');
}

/** Mantém o telão 3D em dia com o ranking. */
export function syncRanking(rows) {
  if (!world.enabled || world.current?.name !== 'classroom') return;
  getSet('classroom').setRanking(rows);
}

/**
 * Subiu no ranking: por alguns segundos a interface some e a câmera mostra o telão da sala.
 * @returns {boolean} true se o momento 3D aconteceu
 */
export function rankMoment(rows, duration = 3400) {
  if (!world.enabled || reducedMotion()) return false;
  const mine = ++moment;
  document.body.classList.add('rank-moment');
  setActivity('full');
  (async () => {
    await setScene('classroom', { shot: 'rank' });
    if (mine !== moment) return;
    setShot('rank', { cut: true, center: 0.36 });
    getSet('classroom').setRanking(rows);
    burst(new V3(6.05, 3.1, -5.2), { count: 170, speed: 3.6, life: 2.8, up: 0.8 });
    setTimeout(() => { if (mine === moment) burst(new V3(6.05, 2.4, -5.4), { count: 90, speed: 2.8, colors: [0xffffff, 0xf3d999] }); }, 500);
  })();
  const end = () => {
    if (mine !== moment) return;
    moment = 0;
    document.body.classList.remove('rank-moment');
    removeEventListener('pointerdown', end);
    applyBackdrop();
  };
  setTimeout(end, duration);
  setTimeout(() => addEventListener('pointerdown', end, { once: true }), 600);
  return true;
}
