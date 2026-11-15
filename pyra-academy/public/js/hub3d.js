// Sala Ômega explorável: a versão 3D da sala (hub). A pessoa anda pela sala, conversa
// com a turma nas carteiras e usa os objetos (quadro, telão, fliperama, estante, porta do Lab 404).
import { $, $$, esc, icon, sfx, reducedMotion } from './util.js';
import { CAST } from './art/characters.js';
import { state, ranking, totals } from './state.js';
import { hubTalk } from './story.js';
import { vnActive } from './vn.js';
import { world, setScene, getSet } from './world/index.js';
import { getActor } from './world/cast3d.js';
import { startExplore } from './world/explore.js';
import { V3 } from './world/kit.js';

const SEAT_Y = 0.485;
const RIVALS = ['caio', 'yuki', 'theo', 'bianca', 'sora'];
const ICONS = { missoes: 'scroll', ranking: 'trophy', 'lab/arcade': 'gamepad', lab: 'flask', guia: 'book', kurisu: 'chat', desk: 'code' };
const memory = { pos: null, yaw: 0, camYaw: 0, helped: false };

/**
 * @param {HTMLElement} main
 * @param {object} o  { card, greeting, statusHtml, go, openKurisu }
 * @returns {() => void} limpeza ao sair da tela
 */
export function hub3d(main, o) {
  const rows = ranking();
  const t = totals();
  const touch = matchMedia('(pointer: coarse)').matches;
  main.innerHTML = `
  <section class="hub3d">
    <div class="hub-pad" id="hub-pad" aria-hidden="true"></div>
    <div class="hub-labels" id="hub-labels" aria-hidden="true"></div>
    <header class="hub-card hub-status reveal">
      <p class="eyebrow">SALA ÔMEGA · VAGA 006</p>
      <h1>${o.greeting}, <em>${esc(state.name || 'Vaga 006')}</em>.</h1>
      <p>${o.statusHtml}</p>
    </header>
    <a class="hub-card hub-objective reveal" href="${o.card.href}" style="--d:1">
      <span class="objective-ic">${icon(o.card.ic)}</span>
      <span class="objective-body"><small>${o.card.kicker}</small><strong>${esc(o.card.title)}</strong><span class="btn gold">${o.card.cta}${icon('arrow')}</span></span>
    </a>
    <button type="button" class="hub-prompt" id="hub-prompt" hidden></button>
    <p class="sr-only" id="hub-live" aria-live="polite"></p>
    <p class="hub-help" id="hub-help" ${memory.helped ? 'hidden' : ''}>${touch ? 'Use o direcional para andar · arraste para olhar · toque em um lugar para ir até lá' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou setas para andar · arraste para olhar · clique em um lugar para ir até lá · <kbd>E</kbd> interage'}</p>
    <details class="hub-quick" id="hub-quick">
      <summary>${icon('users')}<span>Lugares e turma</span></summary>
      <div class="hub-quick-list">
        <p class="eyebrow">IR DIRETO</p>
        <a href="#missoes">${icon('scroll')}Quadro de missões<small>${t.lessonsDone} de ${t.lessons} aulas</small></a>
        <a href="#ranking">${icon('trophy')}Telão do ranking<small>${rows.find((row) => row.you).rank}º de 6</small></a>
        <a href="#lab">${icon('gamepad')}Laboratório e Arcade<small>${o.arcadeCount} jogos</small></a>
        <a href="#guia">${icon('book')}Guia de consulta<small>${o.codexCount} fichas</small></a>
        <button type="button" data-spot="kurisu">${icon('chat')}Laboratório 404<small>Makise Kurisu</small></button>
        <p class="eyebrow">CONVERSAR</p>
        ${['vesper', ...rows.filter((row) => !row.you).map((row) => row.id)].map((id) => {
    const row = rows.find((item) => item.id === id);
    return `<button type="button" data-talk="${id}" style="--glow:${CAST[id].color}"><i></i>${esc(CAST[id].name)}<small>${row ? `${row.rank}º · ${row.merit.toLocaleString('pt-BR')}` : 'Orientadora'}</small></button>`;
  }).join('')}
      </div>
    </details>
    ${touch ? '<div class="hub-stick" id="hub-stick" aria-hidden="true"><i></i></div>' : ''}
    <div class="talk gl" id="talk" hidden></div>
  </section>`;

  let alive = true;
  let explore = null;
  let talkTimer = 0;
  let typeTimer = 0;
  let speaker = null;
  const npcs = [];
  const prompt = $('#hub-prompt');
  const labelHost = $('#hub-labels');
  const labelEls = new Map();

  const endTalk = () => {
    clearTimeout(talkTimer);
    clearInterval(typeTimer);
    const el = $('#talk');
    if (el) el.hidden = true;
    if (speaker) {
      speaker.actor.setTalking(false);
      speaker.actor.setExpr('neutral');
      speaker.actor.setPose(speaker.pose, speaker.seat);
      speaker = null;
    }
    explore?.focus(null);
    if (explore?.near && prompt) prompt.hidden = false;
  };

  function talk(id, target) {
    const [step] = hubTalk(id);
    if (!step) return;
    endTalk();
    const npc = npcs.find((item) => item.id === id);
    if (npc) {
      speaker = npc;
      npc.actor.setPose(null, npc.seat);
      npc.actor.setExpr(step.expr);
      npc.actor.setTalking(true);
      npc.actor.bump();
      explore?.focus(target.at);
    }
    const el = $('#talk');
    el.style.setProperty('--glow', CAST[id].color);
    el.innerHTML = `<div class="talk-bubble"><strong>${esc(CAST[id].full)}</strong><small>${esc(CAST[id].role.split(' · ')[0])}</small><p></p></div>`;
    el.hidden = false;
    el.classList.remove('in');
    void el.offsetWidth;
    el.classList.add('in');
    const line = el.querySelector('p');
    const text = step.text;
    let index = 0;
    const done = () => { clearInterval(typeTimer); line.textContent = text; npc?.actor.setTalking(false); };
    if (reducedMotion()) done();
    else typeTimer = setInterval(() => { index += 2; line.textContent = text.slice(0, index); if (index % 6 === 0) sfx.play('type'); if (index >= text.length) done(); }, 28);
    talkTimer = setTimeout(endTalk, 2600 + text.length * 55);
    el.onclick = endTalk;
    prompt.hidden = true;
  }

  const actions = {
    missoes: () => o.go('#missoes'), ranking: () => o.go('#ranking'), 'lab/arcade': () => o.go('#lab'), lab: () => o.go('#lab'),
    guia: () => o.go('#guia'), kurisu: () => o.openKurisu(), desk: () => o.go(o.card.href),
  };
  const onInteract = (id, target) => {
    if (id.startsWith('talk:')) talk(id.slice(5), target);
    else actions[id]?.();
  };

  (async () => {
    await setScene('classroom', { shot: 'wide' });
    if (!alive || world.current?.name !== 'classroom') return;
    const set = getSet('classroom');
    set.setRanking(rows);
    set.setBoard({ kicker: o.card.kicker, title: o.card.title, progress: `${t.lessonsDone} de ${t.lessons} aulas · ${t.exercisesDone} de ${t.exercises} exercícios` });

    // a turma nas carteiras e a orientadora à frente
    const targets = set.hotspots.map((spot) => ({ ...spot, goal: spot.id === o.goalSpot }));
    for (const id of RIVALS) {
      const [x, z] = set.seats[id];
      const actor = getActor(id);
      const pose = id === 'sora' ? 'read' : 'type';
      actor.setExpr('neutral');
      actor.setDim(false);
      actor.setPose(pose, SEAT_Y);
      actor.aura = 0;
      actor.place(x, 0, z + 0.72, Math.PI);
      set.scene.add(actor.group);
      npcs.push({ id, actor, pose, seat: SEAT_Y });
      const side = x > 2 ? -1 : 1;
      targets.push({ id: `talk:${id}`, label: CAST[id].name, hint: 'Conversar', at: new V3(x, 1.22, z + 0.72), tag: new V3(x, 1.62, z + 0.72), stand: new V3(x + side * 1.15, 0, z + 0.95), npc: actor, color: CAST[id].color });
    }
    const vesper = getActor('vesper');
    vesper.setExpr('neutral');
    vesper.setDim(false);
    vesper.setPose(null);
    vesper.aura = 0;
    vesper.place(2.9, 0, -4.15, 0);
    set.scene.add(vesper.group);
    npcs.push({ id: 'vesper', actor: vesper, pose: null, seat: null });
    targets.push({ id: 'talk:vesper', label: CAST.vesper.name, hint: 'Conversar', at: new V3(2.9, 1.5, -4.15), tag: new V3(2.9, 1.98, -4.15), stand: new V3(2.9, 0, -2.75), npc: vesper, color: CAST.vesper.color });

    for (const target of targets) {
      const el = document.createElement('div');
      el.className = `hub-label ${target.npc ? 'npc' : 'spot'} ${target.goal ? 'goal' : ''}`;
      if (target.color) el.style.setProperty('--glow', target.color);
      el.innerHTML = `<i>${target.npc ? '' : icon(ICONS[target.id] || 'code')}</i><span>${esc(target.label)}</span>`;
      labelHost.append(el);
      labelEls.set(target.id, el);
    }

    let lastNear;
    explore = startExplore({
      pad: $('#hub-pad'), targets, onInteract,
      spawn: memory.pos, yaw: memory.pos ? memory.yaw : undefined, camYaw: memory.pos ? memory.camYaw : undefined,
      blocked: () => vnActive(),
      onMoved: () => { memory.helped = true; $('#hub-help')?.classList.add('gone'); },
      onFrame: ({ near, labels }) => {
        for (const label of labels) {
          const el = labelEls.get(label.id);
          const show = label.visible && label.distance < 13;
          el.style.transform = show ? `translate(${label.x.toFixed(1)}px, ${label.y.toFixed(1)}px)` : 'translate(-999px, -999px)';
          el.classList.toggle('close', label.distance < 5.2);
          el.classList.toggle('near', near === label.target);
          el.classList.toggle('speaking', speaker?.actor === label.target.npc);
        }
        if (near !== lastNear) {
          lastNear = near;
          prompt.hidden = !near || !!speaker;
          if (near) prompt.innerHTML = `<kbd>${touch ? 'Toque' : 'E'}</kbd><span><strong>${esc(near.hint)}</strong><small>${esc(near.label)}</small></span>`;
          const live = $('#hub-live');
          if (live) live.textContent = near ? `${near.label}: ${near.hint}. Pressione E para interagir.` : '';
        }
      },
    });
  })();

  prompt.onclick = () => explore?.interactNear();
  const onEscape = (event) => { if (event.key === 'Escape' && $('#hub-quick')?.open) { $('#hub-quick').open = false; $('#hub-quick summary').focus(); } };
  addEventListener('keydown', onEscape);
  $$('[data-talk]', main).forEach((button) => { button.onclick = () => { $('#hub-quick').open = false; explore?.walkTo(`talk:${button.dataset.talk}`); }; });
  $$('[data-spot]', main).forEach((button) => { button.onclick = () => { $('#hub-quick').open = false; actions[button.dataset.spot]?.(); }; });

  // direcional de toque
  const stickEl = $('#hub-stick');
  if (stickEl) {
    const knob = stickEl.firstElementChild;
    let active = null;
    const move = (event) => {
      if (active !== event.pointerId) return;
      const box = stickEl.getBoundingClientRect();
      let x = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      let y = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
      const length = Math.hypot(x, y);
      if (length > 1) { x /= length; y /= length; }
      knob.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
      explore?.setStick(x, y);
    };
    const release = (event) => { if (active !== event.pointerId) return; active = null; knob.style.transform = ''; explore?.setStick(0, 0); };
    stickEl.addEventListener('pointerdown', (event) => { active = event.pointerId; stickEl.setPointerCapture(event.pointerId); move(event); });
    stickEl.addEventListener('pointermove', move);
    stickEl.addEventListener('pointerup', release);
    stickEl.addEventListener('pointercancel', release);
  }

  return () => {
    alive = false;
    removeEventListener('keydown', onEscape);
    endTalk();
    if (explore) {
      memory.pos = explore.position.clone();
      memory.yaw = explore.player.group.rotation.y;
      memory.camYaw = explore.camYaw;
      explore.stop();
    }
    for (const npc of npcs) { npc.actor.lookAt(null); npc.actor.group.removeFromParent(); }
  };
}
