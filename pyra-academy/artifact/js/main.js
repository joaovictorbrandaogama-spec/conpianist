// Academia Pyra — inicialização, tela de título, barra superior e rotas.
import { $, esc, icon, sfx, countUp, reducedMotion, sleep, ask } from './util.js';
import { go, onRoute, currentRoute } from './nav.js';
import { state, save, merit, rank, onChange, playerLetter, calendar, totals, resetAll, setResetHandler } from './state.js';
import { mountScene, playScene, vnActive } from './vn.js';
import { prologue, kurisuIntro, monikaIntro } from './story.js';
import { portrait } from './art/characters.js';
import * as screens from './screens.js';
import { agenda } from './agenda.js';
import { showHub3D, hideHub3D } from './hub3d.js';
import { setTutorContext } from './tutor.js';
import { mountTutor, toggleTutor, currentTutor } from './tutor.js';
import { runner } from './editor.js';

const main = $('#main');
const NAV = [
  ['campus', 'map', 'Campus'],
  ['missoes', 'scroll', 'Missões'],
  ['agenda', 'calendar', 'Agenda'],
  ['conselho', 'trophy', 'Conselho'],
  ['lab', 'gamepad', 'Informática'],
  ['guia', 'book', 'Biblioteca'],
  ['loja', 'bag', 'Galeria'],
];
const VIEWS = {
  '': 'campus', campus: 'campus', sala: 'campus', missoes: 'missoes', aula: 'aula', prova: 'prova',
  conselho: 'conselho', ranking: 'conselho', lab: 'lab', guia: 'guia', loja: 'loja', dorm: 'dorm', agenda: 'agenda',
};

sfx.enabled = state.sound;

// ---------- barra superior ----------
function paintHud(active) {
  $('#nav').innerHTML = NAV.map(([id, ic, label]) => `<a href="#${id}" class="${id === active ? 'active' : ''}" ${id === active ? 'aria-current="page"' : ''} aria-label="${label}" title="${label}">${icon(ic)}<span>${label}</span></a>`).join('');
  $('#sound').innerHTML = icon(state.sound ? 'sound' : 'mute');
  $('#sound').setAttribute('aria-pressed', String(state.sound));
  refreshHud();
}
function refreshHud() {
  countUp($('#merit'), merit());
  countUp($('#pp'), state.pp);
  $('#rank').textContent = `${rank()}º`;
  const letter = playerLetter();
  $('#klass').textContent = letter;
  $('#hud-klass').dataset.letter = letter;
  $('#hud-class').textContent = `Turma ${letter} · 1º ano`;
  const cal = calendar();
  $('#hud-date').innerHTML = `<b>${String(cal.day).padStart(2, '0')}</b><span><strong>${cal.month.toUpperCase()}</strong><small>${cal.weekday} · ${cal.period}</small></span>`;
  document.body.dataset.term = state.theme || '';
}
onChange(refreshHud);

$('#sound').onclick = () => {
  state.sound = !state.sound;
  sfx.enabled = state.sound;
  save();
  $('#sound').innerHTML = icon(state.sound ? 'sound' : 'mute');
  sfx.play('click');
};
// Os dois botões abrem o mesmo painel; clicar na tutora que já está aberta fecha.
async function openTutorFor(who) {
  const flag = who === 'monika' ? 'metMonika' : 'metKurisu';
  if (!state.flags[flag]) {
    state.flags[flag] = true;
    save();
    await playScene(who === 'monika' ? monikaIntro() : kurisuIntro());
  }
  const open = !$('#tutor').hidden;
  toggleTutor(open && currentTutor() === who ? false : true, who);
}
$('#kurisu-btn').onclick = () => openTutorFor('kurisu');
$('#monika-btn').onclick = () => openTutorFor('monika');

// ---------- rotas ----------
let transition = 0;
async function route() {
  if (!state.started) return;
  const [name, arg] = currentRoute().split('/');
  const view = VIEWS[name] || 'campus';
  const mine = ++transition;
  const wipe = $('#wipe');
  screens.leaveScreen();
  if (!reducedMotion() && main.childElementCount) {
    wipe.className = 'wipe in';
    sfx.play('whoosh');
    await sleep(300);
    if (mine !== transition) return;
  }
  paintHud(view === 'aula' || view === 'prova' ? 'missoes' : view === 'dorm' ? 'campus' : view);
  document.body.dataset.view = view;
  document.documentElement.style.setProperty('--hud-h', `${$('#hud').offsetHeight || 64}px`);
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  if (view !== 'campus') hideHub3D();
  if (view === 'campus') {
    showHub3D(main, { repaint: () => route(), monthTurn: screens.monthTurn, setTutorContext }).then((ok) => {
      if (!ok && mine === transition && document.body.dataset.view === 'campus') screens.hub(main);
    });
  }
  else if (view === 'missoes') screens.missions(main);
  else if (view === 'aula') screens.lesson(main, arg);
  else if (view === 'prova') screens.duel(main, arg);
  else if (view === 'conselho') screens.rankingScreen(main, arg);
  else if (view === 'lab') screens.lab(main, arg);
  else if (view === 'guia') screens.guide(main, arg);
  else if (view === 'agenda') agenda(main, arg, { setTutorContext });
  else if (view === 'loja') screens.shop(main);
  else if (view === 'dorm') screens.dorm(main);
  wipe.className = 'wipe out';
  main.focus({ preventScroll: true });
}
onRoute(() => route());

// ---------- estilhaços ao fundo ----------
function startShards() {
  const canvas = $('#dust');
  if (reducedMotion() || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  let width;
  let height;
  const resize = () => { width = canvas.width = innerWidth; height = canvas.height = innerHeight; };
  resize();
  addEventListener('resize', resize);
  const shards = Array.from({ length: 34 }, () => ({
    x: Math.random(), y: Math.random(), w: 6 + Math.random() * 16, h: 2 + Math.random() * 3,
    s: 0.015 + Math.random() * 0.04, p: Math.random() * 6.28, a: 0.08 + Math.random() * 0.3, red: Math.random() < 0.6,
  }));
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) {
      ctx.clearRect(0, 0, width, height);
      for (const m of shards) {
        m.y += m.s * dt;
        m.x -= m.s * dt * 0.5;
        m.p += dt;
        if (m.y > 1.03 || m.x < -0.03) { m.y = -0.03; m.x = Math.random() * 1.2; }
        ctx.save();
        ctx.translate(m.x * width, m.y * height);
        ctx.rotate(-0.5 + Math.sin(m.p) * 0.25);
        ctx.globalAlpha = m.a;
        ctx.fillStyle = m.red ? '#e8173f' : '#f5f2ea';
        ctx.fillRect(-m.w / 2, -m.h / 2, m.w, m.h);
        ctx.restore();
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
  const t = totals();
  title.innerHTML = `
    <div class="title-scene" id="title-scene"></div>
    <div class="title-shade"></div>
    <div class="title-cast" aria-hidden="true">${[['ayumi', 'cold'], ['samuel', 'neutral'], ['kiara', 'smile']].map(([id, expr], i) => `<div class="title-face" style="--i:${i}">${portrait(id, expr)}</div>`).join('')}</div>
    <div class="title-content">
      <p class="title-kicker">ILHA PYRA · FORMAÇÃO AVANÇADA</p>
      <h1 class="title-name" aria-label="Academia Pyra">${['ACADEMIA', 'PYRA'].map((word, w) => `<span class="word">${[...word].map((ch, i) => `<span style="--i:${w * 8 + i}">${ch}</span>`).join('')}</span>`).join(' ')}</h1>
      <p class="title-tag">Aprenda Python. Leve a Turma D até a A. <em>Não seja o último.</em></p>
      <div class="title-actions">
        ${returning ? `<button type="button" class="btn gold big" id="continue">Continuar como ${esc(state.name || 'D-40')}${icon('arrow')}</button><button type="button" class="btn ghost big" id="new-game">Novo jogo</button>` : `<button type="button" class="btn gold big" id="new-game">Atravessar o portão${icon('arrow')}</button>`}
      </div>
      ${state.migrated && !returning ? '<p class="title-note">Seu progresso da versão anterior foi mantido: aulas e exames continuam concluídos na nova escola.</p>' : ''}
      <p class="title-foot">Python real no navegador · ${t.lessons} aulas e ${t.exercises} exercícios · campus em 3D para explorar · 22 vínculos de arcano · duas tutoras · ${t.students} alunos com ficha, 4 turmas, 3 anos</p>
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
      state.migrated = false;
      if (picked.attitude) state.flags.attitude = picked.attitude;
      save();
      go('#campus');
    }
    document.body.classList.add('in-game');
    if (!fresh) go(currentRoute() || '#campus');
  };

  $('#continue')?.addEventListener('click', () => enter(false));
  $('#new-game').onclick = () => {
    if (returning) {
      ask('Começar um novo jogo apaga o progresso atual: aulas, Mérito, vínculos e rascunhos.', { ok: 'Apagar e recomeçar', title: 'Novo jogo', danger: true }).then((yes) => { if (yes) resetAll(); });
      return;
    }
    enter(true);
  };
}

// ---------- atalhos ----------
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('#tutor').hidden && !vnActive()) toggleTutor(false);
});

setResetHandler(() => {
  screens.leaveScreen();
  document.body.classList.remove('in-game');
  main.innerHTML = '';
  sfx.enabled = state.sound;
  mountTutor();
  toggleTutor(false);
  showTitle();
});

mountTutor();
startShards();
showTitle();
