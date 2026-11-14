// Motor da visual novel: cenário em camadas, personagens, caixa de diálogo com
// efeito de digitação, escolhas, cartões de título e entrada de nome.
import { $, esc, sleep, sfx, reducedMotion } from './util.js';
import { CAST, portrait } from './art/characters.js';
import { scene } from './art/scenes.js';
import { state, save } from './state.js';

let active = null;

/** Liga o efeito de paralaxe de um contêiner de cenário ao ponteiro. */
export function mountScene(container, name) {
  container.innerHTML = scene(name);
  container.dataset.scene = name;
}

if (!window.__pyraParallax) {
  window.__pyraParallax = true;
  window.addEventListener('pointermove', (event) => {
    if (reducedMotion()) return;
    const x = (event.clientX / innerWidth - 0.5) * 2;
    const y = (event.clientY / innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty('--px', x.toFixed(3));
    document.documentElement.style.setProperty('--py', y.toFixed(3));
  }, { passive: true });
}

const fill = (text) => String(text).replaceAll('{nome}', state.name || 'Vaga 006');

/**
 * Executa um roteiro. Devolve uma Promise resolvida com as escolhas feitas ({ chave: valor }).
 * @param {Array} script passos do roteiro
 */
export function playScene(script) {
  if (active) active.finish();
  const root = $('#vn');
  root.innerHTML = `
    <div class="vn-bg" id="vn-bg"></div>
    <div class="vn-vignette"></div>
    <div class="vn-chars" id="vn-chars"></div>
    <div class="vn-title" id="vn-title" hidden></div>
    <div class="vn-top"><button class="vn-skip" id="vn-skip" type="button">Pular cena ▸▸</button></div>
    <div class="vn-choices" id="vn-choices" hidden></div>
    <div class="vn-box" id="vn-box" hidden>
      <div class="vn-name" id="vn-name"></div>
      <p class="vn-text" id="vn-text" aria-live="polite"></p>
      <span class="vn-next" aria-hidden="true">▼</span>
    </div>`;
  root.hidden = false;
  document.body.classList.add('vn-open');

  const bg = $('#vn-bg');
  const chars = $('#vn-chars');
  const box = $('#vn-box');
  const queue = [...script];
  const picked = {};
  const onStage = new Map(); // id -> { el, pos }
  let typing = null;
  let waiting = null;
  let skipping = false;
  let done = false;
  let resolveAll;
  const finished = new Promise((resolve) => { resolveAll = resolve; });

  const advance = () => {
    if (done) return;
    if (typing) { typing.finish(); return; }
    if (waiting) { const next = waiting; waiting = null; sfx.play('click'); next(); }
  };
  const onKey = (event) => {
    if (event.target.closest?.('input, textarea, button')) return;
    if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') { event.preventDefault(); advance(); }
  };
  const onClick = (event) => {
    if (event.target.closest('button, input, .vn-choices, .vn-ask')) return;
    advance();
  };
  root.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);

  function finish() {
    if (done) return;
    done = true;
    typing?.finish();
    root.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKey);
    root.classList.add('vn-leaving');
    setTimeout(() => {
      if (active?.finish === finish) active = null;
      root.hidden = true;
      root.classList.remove('vn-leaving');
      root.innerHTML = '';
      document.body.classList.remove('vn-open');
      resolveAll(picked);
    }, reducedMotion() ? 0 : 380);
  }
  active = { finish };

  $('#vn-skip').onclick = () => {
    // Pula falas e títulos, mas para em escolhas e perguntas: elas mudam o jogo.
    skipping = true;
    typing?.finish();
    if (waiting) { const next = waiting; waiting = null; next(); }
  };

  function setBg(name) {
    if (bg.dataset.scene === name) return;
    const old = bg.firstElementChild ? bg.cloneNode(true) : null;
    mountScene(bg, name);
    if (old && !reducedMotion()) {
      old.removeAttribute('id');
      old.classList.add('vn-bg-old');
      bg.before(old);
      setTimeout(() => old.remove(), 700);
    }
    sfx.play('whoosh');
  }

  function clearChars() {
    for (const { el } of onStage.values()) { el.classList.add('leaving'); setTimeout(() => el.remove(), 320); }
    onStage.clear();
  }

  function showChar(id, expr = 'neutral', pos) {
    let entry = onStage.get(id);
    if (!entry) {
      const taken = new Set([...onStage.values()].map((item) => item.pos));
      const slot = pos || (['center', 'left', 'right'].find((p) => !taken.has(p)) || 'center');
      for (const [otherId, other] of onStage) if (other.pos === slot) { other.el.remove(); onStage.delete(otherId); }
      const el = document.createElement('div');
      el.className = `vn-char pos-${slot} entering`;
      el.style.setProperty('--glow', CAST[id].color);
      chars.append(el);
      entry = { el, pos: slot, expr: null };
      onStage.set(id, entry);
      requestAnimationFrame(() => el.classList.remove('entering'));
    }
    if (entry.expr !== expr) { entry.el.innerHTML = portrait(id, expr); entry.expr = expr; }
    for (const [otherId, other] of onStage) other.el.classList.toggle('dim', otherId !== id);
    entry.el.classList.remove('bump');
    void entry.el.offsetWidth;
    entry.el.classList.add('bump');
  }

  function type(text) {
    const el = $('#vn-text');
    box.classList.remove('ready');
    if (skipping || reducedMotion()) { el.textContent = text; box.classList.add('ready'); return Promise.resolve(); }
    return new Promise((resolve) => {
      let index = 0;
      let timer;
      const end = () => { clearTimeout(timer); el.textContent = text; typing = null; box.classList.add('ready'); resolve(); };
      typing = { finish: end };
      const step = () => {
        index += 1;
        el.textContent = text.slice(0, index);
        if (index % 3 === 0) sfx.play('type');
        if (index >= text.length) { end(); return; }
        const ch = text[index - 1];
        timer = setTimeout(step, ch === '.' || ch === '!' || ch === '?' || ch === '…' ? 150 : ch === ',' ? 70 : 17);
      };
      step();
    });
  }

  const waitClick = () => new Promise((resolve) => { if (skipping) resolve(); else waiting = resolve; });

  async function line(step) {
    const cast = CAST[step.who] || CAST.narr;
    box.hidden = false;
    box.className = `vn-box kind-${step.who === 'narr' ? 'narr' : step.who === 'voce' ? 'voce' : 'char'}`;
    box.style.setProperty('--glow', cast.color);
    const name = step.who === 'voce' ? (state.name || 'Você') : cast.name;
    $('#vn-name').textContent = name;
    $('#vn-name').hidden = !name;
    if (cast.skin) showChar(step.who, step.expr, step.pos);
    else for (const other of onStage.values()) other.el.classList.add('dim');
    await type(fill(step.text));
    await waitClick();
  }

  async function titleCard(step) {
    const el = $('#vn-title');
    box.hidden = true;
    clearChars();
    el.innerHTML = `<div class="vn-title-line"></div><h2>${[...fill(step.title)].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</h2><p>${esc(fill(step.sub || ''))}</p><div class="vn-title-line"></div>`;
    el.hidden = false;
    sfx.play('title');
    if (!skipping) await Promise.race([sleep(2600), new Promise((resolve) => { waiting = resolve; })]);
    waiting = null;
    el.classList.add('out');
    await sleep(skipping || reducedMotion() ? 0 : 350);
    el.hidden = true;
    el.classList.remove('out');
  }

  function choose(step) {
    skipping = false;
    const el = $('#vn-choices');
    el.innerHTML = step.choice.map((option, index) => `<button type="button" class="vn-choice" data-index="${index}" style="--i:${index}"><span>${String.fromCharCode(65 + index)}</span>${esc(fill(option.text))}</button>`).join('');
    el.hidden = false;
    return new Promise((resolve) => {
      el.onclick = (event) => {
        const button = event.target.closest('.vn-choice');
        if (!button) return;
        const option = step.choice[Number(button.dataset.index)];
        sfx.play('click');
        el.hidden = true;
        el.innerHTML = '';
        Object.assign(picked, option.set || {});
        if (option.merit) { state.bonus += option.merit; save(); }
        if (option.then) queue.unshift(...option.then);
        resolve();
      };
      el.querySelector('button')?.focus({ preventScroll: true });
    });
  }

  function ask(step) {
    skipping = false;
    box.hidden = false;
    box.className = 'vn-box kind-voce';
    $('#vn-name').hidden = true;
    $('#vn-text').innerHTML = `<label class="vn-ask"><span>${esc(step.prompt)}</span><span class="vn-ask-row"><input id="vn-input" type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Seu nome"><button type="button" id="vn-ok">Assinar</button></span></label>`;
    box.classList.remove('ready');
    const input = $('#vn-input');
    input.value = state.name || '';
    setTimeout(() => input.focus({ preventScroll: true }), 60);
    return new Promise((resolve) => {
      const submit = () => {
        const value = input.value.trim().replace(/\s+/g, ' ').slice(0, 16);
        if (!value) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); input.focus(); return; }
        state.name = value;
        save();
        sfx.play('ok');
        resolve();
      };
      $('#vn-ok').onclick = submit;
      input.onkeydown = (event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } };
    });
  }

  (async () => {
    while (queue.length && !done) {
      const step = queue.shift();
      if (step.bg) setBg(step.bg);
      if (step.clear) clearChars();
      if (step.title) await titleCard(step);
      else if (step.choice) await choose(step);
      else if (step.ask) await ask(step);
      else if (step.text) await line(step);
    }
    finish();
  })();

  return finished;
}

export const vnActive = () => !!active;
