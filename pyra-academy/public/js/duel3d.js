// Prova de Mérito em 3D: os dois duelistas nas bancadas da arena, o placar holográfico
// e as reações do rival enquanto o cronômetro corre.
import { world, setScene, setShot, getSet, shake } from './world/index.js';
import { getActor } from './world/cast3d.js';
import { burst } from './world/fx.js';

/**
 * @param {object} o { rivalId, rivalName, color, playerName, rematch }
 * @returns {null | { update, taunt, rivalDone, typed, result, stop }} null sem WebGL
 */
export function duelStage(o) {
  if (!world.enabled) return null;
  let alive = true;
  let set = null;
  let me = null;
  let rival = null;
  let last = {};
  let typeTimer = 0;
  let finished = false;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); };

  const paint = () => {
    if (!set) return;
    set.setBoard({
      title: o.rematch ? 'REVANCHE' : 'PROVA DE MÉRITO', clock: last.clock || '0:00', pct: last.pct || 0, danger: !!last.danger, label: last.label || '',
      rival: o.rivalName.toUpperCase(), you: (o.playerName || 'Você').toUpperCase(), color: o.color,
    });
    set.setMood(last.pct || 0);
  };

  (async () => {
    await setScene('arena', { shot: 'duel' });
    if (!alive || world.current?.name !== 'arena') return;
    set = getSet('arena');
    me = getActor('voce');
    rival = getActor(o.rivalId);
    [[me, set.stations[0]], [rival, set.stations[1]]].forEach(([actor, station]) => {
      actor.setDim(false);
      actor.walk = 0;
      actor.aura = 0.14;
      actor.lookAt(null);
      actor.setExpr('neutral');
      actor.place(station.pos.x, 0, station.pos.z, station.yaw);
      set.scene.add(actor.group);
    });
    me.setPose(null);
    rival.setPose('type');
    paint();
  })();

  return {
    /** Atualiza o placar: { clock: '3:20', pct: 0..1, danger, label } */
    update(data) { last = data; paint(); },
    taunt() {
      if (!rival || finished) return;
      rival.setPose(null);
      rival.setExpr('smirk');
      rival.setTalking(true);
      rival.bump();
      later(() => { rival.setTalking(false); if (!finished) { rival.setExpr('neutral'); rival.setPose('type'); } }, 2400);
    },
    /** O rival entregou primeiro. */
    rivalDone() {
      if (!rival) return;
      finished = true;
      rival.setPose(null);
      rival.setExpr('happy');
      rival.bump();
      shake(0.06);
      burst(set.stations[1].head, { count: 60, colors: [0xff5b6e, 0xff9aa6, 0xffffff], speed: 3 });
      me.setExpr('surprised');
      later(() => me.setExpr('neutral'), 1600);
    },
    /** A pessoa digitou no editor: o avatar digita junto por um instante. */
    typed() {
      if (!me || finished && !alive) return;
      me.setPose('type');
      clearTimeout(typeTimer);
      typeTimer = setTimeout(() => { if (alive && me) me.setPose(null); }, 900);
    },
    /** Código aprovado: comemoração (vitória) ou entrega honrosa. */
    result(won) {
      if (!me) return;
      finished = true;
      clearTimeout(typeTimer);
      me.setPose(null);
      me.setExpr(won ? 'happy' : 'smile');
      me.bump();
      rival.setPose(null);
      rival.setTalking(false);
      if (won) {
        rival.setExpr('surprised');
        burst(set.stations[0].head, { count: 190, speed: 5.2, life: 3 });
        later(() => burst(set.stations[0].head, { count: 110, speed: 4, colors: [0xffffff, 0xf3d999, 0x86ecb0] }), 420);
        shake(0.05);
      }
      setShot(won ? 'win' : 'lose');
    },
    stop() {
      alive = false;
      clearTimeout(typeTimer);
      timers.forEach(clearTimeout);
      set?.setBoard(null);
      set?.setMood(0);
      for (const actor of [me, rival]) {
        if (!actor) continue;
        actor.setPose(null);
        actor.setTalking(false);
        actor.aura = 0;
        actor.group.removeFromParent();
      }
    },
  };
}
