// Academia Pyra — inicialização, tela de título, barra superior e rotas.
import { $, esc, icon, sfx, countUp, reducedMotion, sleep } from './util.js';
import { state, save, merit, rank, onChange } from './state.js';
import { mountScene, playScene, vnActive } from './vn.js';
import { prologue, kurisuIntro } from './story.js';
import * as screens from './screens.js';
import { mountTutor, toggleTutor } from './tutor.js';
import { runner } from './editor.js';

const main = $('#main');
const NAV = [
  ['sala', 'home', 'Sala'],
  ['missoes', 'scroll', 'Missões'],
  ['ranking', 'trophy', 'Ranking'],
  ['lab', 'gamepad', 'Laboratório'],
  ['guia', 'book', 'Guia'],
];

sfx.enabled = state.sound;

// ---------- barra superior ----------
function paintHud(active) {
  $('#nav').innerHTML = NAV.map(([id, ic, label]) => `<a href="#${id}" class="${id === active ? 'active' : ''}" ${id === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('');
  $('#sound').innerHTML = icon(state.sound ? 'sound' : 'mute');
  $('#sound').setAttribute('aria-pressed', String(state.sound));
  refreshHud();
}
function refreshHud() {
  countUp($('#merit'), merit());
  $('#rank').textContent = `${rank()}º`;
}
onChange(refreshHud);

$('#sound').onclick = () => {
  state.sound = !state.sound;
  sfx.enabled = state.sound;
  save();
  $('#sound').innerHTML = icon(state.sound ? 'sound' : 'mute');
  sfx.play('click');
};
$('#kurisu-btn').onclick = async () => {
  if (!state.flags.metKurisu) {
    state.flags.metKurisu = true;
    save();
    await playScene(kurisuIntro());
  }
  toggleTutor();
};

// ---------- rotas ----------
let transition = 0;
async function route() {
  if (!state.started) return;
  const [name, arg] = location.hash.replace(/^#/, '').split('/');
  const view = { '': 'sala', sala: 'sala', missoes: 'missoes', aula: 'aula', prova: 'prova', ranking: 'ranking', lab: 'lab', guia: 'guia' }[name] || 'sala';
  const mine = ++transition;
  const wipe = $('#wipe');
  screens.leaveScreen();
  if (!reducedMotion() && main.childElementCount) {
    wipe.className = 'wipe in';
    sfx.play('whoosh');
    await sleep(260);
    if (mine !== transition) return;
  }
  paintHud(view === 'aula' || view === 'prova' ? 'missoes' : view);
  document.body.dataset.view = view;
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  if (view === 'sala') screens.hub(main);
  else if (view === 'missoes') screens.missions(main);
  else if (view === 'aula') screens.lesson(main, arg);
  else if (view === 'prova') screens.duel(main, arg);
  else if (view === 'ranking') screens.rankingScreen(main);
  else if (view === 'lab') screens.lab(main, arg);
  else if (view === 'guia') screens.guide(main);
  wipe.className = 'wipe out';
  main.focus({ preventScroll: true });
}
window.addEventListener('hashchange', route);

// ---------- partículas douradas ----------
function startDust() {
  const canvas = $('#dust');
  if (reducedMotion() || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  const resize = () => { width = canvas.width = innerWidth; height = canvas.height = innerHeight; };
  resize();
  addEventListener('resize', resize);
  const motes = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, s: 0.02 + Math.random() * 0.05, p: Math.random() * 6.28, a: 0.15 + Math.random() * 0.5 }));
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) {
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
        m.y -= m.s * dt;
        m.p += dt;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        const x = (m.x + Math.sin(m.p) * 0.01) * width;
        ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(m.p * 1.7));
        ctx.fillStyle = '#e9c98a';
        ctx.beginPath();
        ctx.arc(x, m.y * height, m.r, 0, 6.2832);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- tela de título ----------
function showTitle() {
  const title = $('#title');
  const returning = state.started;
  title.innerHTML = `
    <div class="title-scene" id="title-scene"></div>
    <div class="title-shade"></div>
    <div class="title-content">
      <svg class="crest" viewBox="-60 -60 120 140" aria-hidden="true">
        <path class="crest-shield" d="M0-46 40-30V8C40 34 20 52 0 62-20 52-40 34-40 8V-30Z"/>
        <path class="crest-p" d="M-12-20H8a14 14 0 0 1 0 28H-4V34"/>
      </svg>
      <p class="title-kicker">INSTITUTO PARA MENTES EXCEPCIONAIS</p>
      <h1 class="title-name" aria-label="Academia Pyra">${['ACADEMIA', 'PYRA'].map((word, w) => `<span class="word">${[...word].map((ch, i) => `<span style="--i:${w * 8 + i}">${ch}</span>`).join('')}</span>`).join(' ')}</h1>
      <p class="title-tag">Aprenda Python. Suba no ranking. <em>Não seja o último.</em></p>
      <div class="title-actions">
        ${returning ? `<button type="button" class="btn gold big" id="continue">Continuar como ${esc(state.name || 'Vaga 006')}${icon('arrow')}</button><button type="button" class="btn ghost big" id="new-game">Novo jogo</button>` : `<button type="button" class="btn gold big" id="new-game">Atravessar o portão${icon('arrow')}</button>`}
      </div>
      <p class="title-foot">Visual novel de programação · Python real no navegador · 17 aulas, 51 exercícios, 5 rivais</p>
    </div>`;
  mountScene($('#title-scene'), 'gate');
  title.hidden = false;

  const enter = async (fresh) => {
    sfx.play('title');
    runner.warm();
    title.classList.add('leaving');
    await sleep(reducedMotion() ? 0 : 600);
    title.hidden = true;
    title.classList.remove('leaving');
    title.innerHTML = '';
    if (fresh) {
      const picked = await playScene(prologue());
      state.started = true;
      if (picked.attitude) state.flags.attitude = picked.attitude;
      save();
      location.hash = '#sala';
    }
    document.body.classList.add('in-game');
    route();
  };

  $('#continue')?.addEventListener('click', () => enter(false));
  $('#new-game').onclick = () => {
    if (returning) {
      if (!confirm('Começar um novo jogo apaga o progresso atual. Continuar?')) return;
      try { localStorage.removeItem('pyra.academy.v2'); } catch { /* sem armazenamento */ }
      location.hash = '';
      location.reload();
      return;
    }
    enter(true);
  };
}

// ---------- atalhos ----------
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('#tutor').hidden && !vnActive()) toggleTutor(false);
});

mountTutor();
startDust();
showTitle();
