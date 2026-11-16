// Motor da visual novel: cenário em camadas, personagens com faixa de destaque,
// caixa de diálogo com efeito de digitação, escolhas, cartões de título,
// avisos (extrato, telão), tela de confronto e perguntas a quem joga.
import { $, esc, sleep, sfx, reducedMotion } from './util.js';
import { CAST, portrait, PLAYER_LOOKS, lookAvatar, setPlayerLook } from './art/characters.js';
import { scene } from './art/scenes.js';
import { state, save, letterOf } from './state.js';
import { BONDS, ROMAN, MAX_RANK } from './life.js';

let active = null;

// Palco 3D (Three.js): um só, montado na primeira cena e reaproveitado nas seguintes.
// Sem WebGL, ou no modo 2D, as cenas usam os retratos 2D.
let stageModule = null;
let stageLoad = null;
let sharedStage = null;
let stageHost = null;
const want3d = () => state.graphics !== '2d';
function loadStage() {
  stageLoad ||= import('./three/stage.js').then((m) => import('./three/models.js').then(({ bodiesReady }) => Promise.race([bodiesReady, new Promise((resolve) => setTimeout(resolve, 8000))])).catch(() => {}).then(() => m)).then((module) => { stageModule = module; }).catch(() => { stageModule = null; });
  return stageLoad;
}
function getStage() {
  if (!want3d() || !stageModule) return null;
  if (sharedStage) return sharedStage;
  try {
    stageHost = document.createElement('div');
    stageHost.className = 'vn-stage';
    stageHost.id = 'vn-stage';
    sharedStage = stageModule.createStage(stageHost);
  } catch { sharedStage = null; stageHost = null; }
  return sharedStage;
}
loadStage();

/** Monta um cenário em um contêiner. */
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

// {nome} = nome de quem joga; {T} = letra atual da turma de quem joga; {T:c} = letra atual de outra turma.
export const fill = (text) => String(text)
  .replaceAll('{nome}', state.name || 'D-40')
  .replace(/\{T(?::([abcd]))?\}/g, (_, home) => letterOf(home || 'd'));

/**
 * Executa um roteiro. Devolve uma Promise resolvida com as escolhas feitas ({ chave: valor }).
 * @param {Array} script passos do roteiro
 */
export async function playScene(script) {
  if (want3d()) await loadStage();
  return runScene(script);
}

function runScene(script) {
  if (active) active.finish();
  const root = $('#vn');
  root.innerHTML = `
    <div class="vn-bg" id="vn-bg"></div>
    <div class="vn-tone"></div>
    <div class="vn-slash" id="vn-slash"></div>
    <div class="vn-chars" id="vn-chars"></div>
    <div class="vn-vignette"></div>
    <div class="vn-title" id="vn-title" hidden></div>
    <div class="vn-versus" id="vn-versus" hidden></div>
    <div class="vn-notice" id="vn-notice" hidden></div>
    <div class="vn-top"><button class="vn-skip" id="vn-skip" type="button">Pular cena ▸▸</button></div>
    <div class="vn-choices" id="vn-choices" hidden></div>
    <div class="vn-box" id="vn-box" hidden>
      <div class="vn-face" id="vn-face" hidden></div>
      <div class="vn-name" id="vn-name"></div>
      <p class="vn-text" id="vn-text" aria-live="polite"></p>
      <span class="vn-next" aria-hidden="true"></span>
    </div>`;
  root.hidden = false;
  root.classList.remove('vn-leaving');
  document.body.classList.add('vn-open');

  const stage = getStage();
  if (stage) {
    $('#vn-bg').after(stageHost);
    stage.clear();
    stage.setPaused(false);
  }
  root.classList.toggle('vn-3d', !!stage);

  const bg = $('#vn-bg');
  const chars = $('#vn-chars');
  const box = $('#vn-box');
  const slash = $('#vn-slash');
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
      if (active?.finish === finish) { stage?.clear(); stage?.setPaused(true); }
      // Só desmonta o palco se nenhuma outra cena assumiu nesse meio-tempo.
      if (active?.finish === finish) {
        active = null;
        root.hidden = true;
        root.classList.remove('vn-leaving');
        root.innerHTML = '';
        document.body.classList.remove('vn-open');
      }
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
    if (stage) {
      stage.setScene(name);
      bg.dataset.scene = name;
      sfx.play('whoosh');
      return;
    }
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
    if (stage) { stage.clear(); onStage.clear(); return; }
    for (const { el } of onStage.values()) { el.classList.add('leaving'); setTimeout(() => el.remove(), 320); }
    onStage.clear();
    slash.className = 'vn-slash';
  }

  function showChar(id, expr = 'neutral', pos) {
    let entry = onStage.get(id);
    if (stage) {
      if (!entry) {
        const taken = new Set([...onStage.values()].map((item) => item.pos));
        const slot = pos || (['center', 'left', 'right'].find((p) => !taken.has(p)) || 'center');
        for (const [otherId, other] of onStage) if (other.pos === slot) onStage.delete(otherId);
        entry = { pos: slot };
        onStage.set(id, entry);
      }
      stage.show(id, expr, entry.pos);
      return;
    }
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
    slash.className = 'vn-slash';
    void entry.el.offsetWidth;
    entry.el.classList.add('bump');
    slash.style.setProperty('--glow', CAST[id].color);
    slash.className = `vn-slash on pos-${entry.pos}`;
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
  const hold = async (ms) => {
    if (!skipping) await Promise.race([sleep(ms), new Promise((resolve) => { waiting = resolve; })]);
    waiting = null;
  };
  const fadeOut = async (el) => {
    el.classList.add('out');
    await sleep(skipping || reducedMotion() ? 0 : 320);
    el.hidden = true;
    el.classList.remove('out');
  };

  async function line(step) {
    const cast = CAST[step.who] || CAST.narr;
    box.hidden = false;
    box.className = `vn-box kind-${step.who === 'narr' ? 'narr' : step.who === 'voce' ? 'voce' : 'char'}`;
    box.style.setProperty('--glow', cast.color);
    const name = step.who === 'voce' ? (state.name || 'Você') : cast.name;
    $('#vn-name').textContent = name;
    $('#vn-name').hidden = !name;
    const face = $('#vn-face');
    if (stage && (cast.skin || step.who === 'voce')) {
      face.innerHTML = portrait(step.who, step.expr || 'neutral');
      face.style.setProperty('--glow', step.who === 'voce' ? 'var(--paper)' : cast.color);
      face.hidden = false;
      box.classList.add('with-face');
    } else { face.hidden = true; box.classList.remove('with-face'); }
    if (cast.skin) showChar(step.who, step.expr, step.pos);
    else if (stage) stage.hush();
    else { for (const other of onStage.values()) other.el.classList.add('dim'); slash.className = 'vn-slash'; }
    await type(fill(step.text));
    await waitClick();
  }

  async function titleCard(step) {
    const el = $('#vn-title');
    box.hidden = true;
    clearChars();
    el.className = `vn-title tone-${step.tone || 'red'}`;
    el.innerHTML = `<div class="vn-title-bar"></div><h2>${[...fill(step.title)].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</h2><p>${esc(fill(step.sub || ''))}</p>`;
    el.hidden = false;
    sfx.play('title');
    await hold(2600);
    await fadeOut(el);
  }

  async function noticeCard(step) {
    const el = $('#vn-notice');
    const data = step.notice;
    box.hidden = true;
    el.innerHTML = `<div class="notice-card"><small>${esc(fill(data.kicker))}</small><strong>${esc(fill(data.title))}</strong>
      <ul>${data.lines.map(([label, value], i) => `<li style="--i:${i}"><span>${esc(fill(label))}</span><b>${esc(fill(value))}</b></li>`).join('')}</ul>
      ${data.foot ? `<p>${esc(fill(data.foot))}</p>` : ''}<i>toque para continuar</i></div>`;
    el.hidden = false;
    sfx.play('merit');
    await waitClick();
    await fadeOut(el);
  }

  async function arcanaCard(step) {
    const el = $('#vn-notice');
    const { id, rank, perks = [] } = step.card;
    const cast = CAST[id];
    const bond = BONDS[id];
    box.hidden = true;
    clearChars();
    el.innerHTML = `<div class="rank-card" style="--glow:${cast.color}">
      <div class="rank-tarot"><span class="arcana-n">${ROMAN[bond.n]}</span><div class="rank-art">${portrait(id, rank >= 7 ? 'happy' : 'smile')}</div><span class="arcana-name">${esc(bond.arcana)}</span></div>
      <div class="rank-text"><small>VÍNCULO · ${esc(cast.full)}</small><strong>${rank >= MAX_RANK ? 'VÍNCULO MÁXIMO' : `NÍVEL ${rank}`}</strong>
      <span class="rank-pips">${Array.from({ length: MAX_RANK }, (_, i) => `<i class="${i < rank ? 'on' : ''}" style="--i:${i}"></i>`).join('')}</span>
      ${perks.map((text) => `<p>${esc(text)}</p>`).join('')}<i>toque para continuar</i></div></div>`;
    el.hidden = false;
    sfx.play('title');
    await waitClick();
    await fadeOut(el);
  }

  async function versus(step) {
    const el = $('#vn-versus');
    const rival = CAST[step.versus];
    box.hidden = true;
    clearChars();
    el.style.setProperty('--glow', rival.color);
    el.innerHTML = `<div class="vs-side vs-you"><div class="vs-face">${portrait('voce', 'neutral')}</div><div class="vs-tag"><small>MATRÍCULA D-40</small><strong>${esc(state.name || 'Você')}</strong></div></div>
      <div class="vs-side vs-rival"><div class="vs-face">${portrait(step.versus, 'smirk')}</div><div class="vs-tag"><small>${esc(rival.tag || rival.role)}</small><strong>${esc(rival.full)}</strong></div></div>
      <div class="vs-mark">VS</div>`;
    el.hidden = false;
    sfx.play('title');
    await hold(2800);
    await fadeOut(el);
  }

  function choose(step) {
    skipping = false;
    const el = $('#vn-choices');
    el.innerHTML = step.choice.map((option, index) => `<button type="button" class="vn-choice" data-index="${index}" style="--i:${index}"><span>${String.fromCharCode(65 + index)}</span><b>${esc(fill(option.text))}</b></button>`).join('');
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

  function askName(step) {
    $('#vn-text').innerHTML = `<label class="vn-ask"><span>${esc(step.prompt)}</span><span class="vn-ask-row"><input id="vn-input" type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Seu nome"><button type="button" id="vn-ok">Assinar</button></span></label>`;
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

  function askLook(step) {
    let chosen = state.look;
    $('#vn-text').innerHTML = `<div class="vn-ask"><span>${esc(step.prompt)}</span>
      <div class="look-row">${PLAYER_LOOKS.map((_, i) => `<button type="button" class="look ${i === chosen ? 'on' : ''}" data-look="${i}" aria-label="Aparência ${i + 1}">${lookAvatar(i)}</button>`).join('')}</div>
      <span class="vn-ask-row"><button type="button" id="vn-ok">Confirmar foto</button></span></div>`;
    return new Promise((resolve) => {
      $('.look-row', root).onclick = (event) => {
        const button = event.target.closest('[data-look]');
        if (!button) return;
        chosen = Number(button.dataset.look);
        root.querySelectorAll('.look').forEach((el) => el.classList.toggle('on', el === button));
        sfx.play('click');
      };
      $('#vn-ok').onclick = () => {
        state.look = chosen;
        setPlayerLook(chosen);
        save();
        sfx.play('ok');
        resolve();
      };
    });
  }

  function ask(step) {
    skipping = false;
    box.hidden = false;
    box.className = 'vn-box kind-voce asking';
    $('#vn-name').hidden = true;
    box.classList.remove('ready');
    slash.className = 'vn-slash';
    return step.ask === 'look' ? askLook(step) : askName(step);
  }

  (async () => {
    try {
      while (queue.length && !done) {
        const step = queue.shift();
        if (step.bg) setBg(step.bg);
        if (step.clear) clearChars();
        if (step.title) await titleCard(step);
        else if (step.notice) await noticeCard(step);
        else if (step.versus) await versus(step);
        else if (step.card) await arcanaCard(step);
        else if (step.choice) await choose(step);
        else if (step.ask) await ask(step);
        else if (step.text) await line(step);
      }
    } catch (error) {
      // Um passo com defeito não pode prender o jogo: registra e encerra a cena.
      console.error('[vn]', error);
    }
    finish();
  })();

  return finished;
}

export const vnActive = () => !!active;
