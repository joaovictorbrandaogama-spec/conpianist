// Telas do jogo: sala (hub), missões, aula, prova, ranking, laboratório e guia.
import { $, $$, esc, fmt, icon, codeBlock, toast, sfx, countUp } from './util.js';
import { chapters, lessons, lessonById, chapterByRival, casesOf, POINTS, LEVEL_NAMES } from './content/index.js';
import { arcade } from './content/arcade.js';
import { codex } from './content/codex.js';
import { CAST, avatar, portrait } from './art/characters.js';
import {
  state, save, merit, ranking, rank, lessonMerit, lessonMax, lessonDone, requiredDone, quizDone, chapterLessonsDone,
  chapterUnlocked, duelUnlocked, duelFaced, duelWon, tryCompleteLesson, nextObjective, totals, resetAll,
} from './state.js';
import { createWorkbench, runner } from './editor.js';
import { mountScene, playScene } from './vn.js';
import { hubTalk, preDuel, postDuel, chapterIntro, ending } from './story.js';
import { setTutorContext } from './tutor.js';

let cleanup = null;
export function leaveScreen() { cleanup?.(); cleanup = null; setTutorContext(null); }

const ordinal = (n) => `${n}º`;
const prose = (text) => String(text).split(/\n{2,}/).map((p) => `<p>${fmt(p).replace(/\n/g, '<br>')}</p>`).join('');
const go = (hash) => { location.hash = hash; };

/** Mostra a faixa de subida no ranking quando a posição melhora. */
export function celebrate(previousRank) {
  const now = rank();
  if (now >= previousRank) return;
  const rows = ranking();
  const passed = rows[now];
  const el = $('#rankup');
  el.innerHTML = `<div class="rankup-card"><small>SUBIU NO RANKING</small><strong>${ordinal(now)} lugar</strong><span>${passed ? `Você ultrapassou ${esc(passed.name)}.` : ''}</span></div>`;
  el.hidden = false;
  sfx.play('title');
  setTimeout(() => { el.hidden = true; }, 3200);
}

function award(points, label) {
  if (points > 0) { toast(`+${points} de Mérito · ${label}`, 'gold'); sfx.play('merit'); }
}

// =============================== SALA (HUB) ===============================
export function hub(main) {
  const rows = ranking();
  const me = rows.find((row) => row.you);
  const above = rows[me.rank - 2];
  const objective = nextObjective();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const objectiveCard = {
    lesson: () => ({ kicker: `PRÓXIMA MISSÃO · CAPÍTULO ${objective.chapter.n}`, title: objective.lesson.title, text: objective.lesson.summary, href: `#aula/${objective.lesson.id}`, cta: state.last === objective.lesson.id ? 'Continuar aula' : 'Começar aula', ic: 'scroll' }),
    duel: () => ({ kicker: 'PROVA DE MÉRITO LIBERADA', title: `Enfrente ${CAST[objective.chapter.rival].full}`, text: objective.chapter.duel.brief, href: `#prova/${objective.chapter.rival}`, cta: 'Ir para a arena', ic: 'sword' }),
    rematch: () => ({ kicker: 'REVANCHE DISPONÍVEL', title: `Revanche contra ${CAST[objective.chapter.rival].full}`, text: 'Você entregou certo, mas depois. Vença no relógio para tomar 100 de Mérito.', href: `#prova/${objective.chapter.rival}`, cta: 'Pedir revanche', ic: 'sword' }),
    bonus: () => ({ kicker: 'DESAFIOS BÔNUS', title: objective.lesson.title, text: 'Ainda há desafios bônus abertos. Cada um vale 50 de Mérito.', href: `#aula/${objective.lesson.id}`, cta: 'Ver desafios', ic: 'star' }),
    complete: () => ({ kicker: 'PERÍODO CONCLUÍDO', title: 'Você zerou a Academia Pyra', text: 'Todas as aulas, desafios e provas vencidos. O Laboratório e o Arcade continuam abertos para você criar.', href: '#lab', cta: 'Abrir o Laboratório', ic: 'flask' }),
  }[objective.type]();

  main.innerHTML = `
  <section class="hub">
    <div class="hub-scene" id="hub-scene"></div>
    <div class="hub-shade"></div>
    <div class="hub-ui">
      <header class="hub-head reveal">
        <p class="eyebrow">SALA ÔMEGA · VAGA 006</p>
        <h1>${greeting}, <em>${esc(state.name || 'Vaga 006')}</em>.</h1>
        <p class="hub-status">Você está em <strong>${ordinal(me.rank)} lugar</strong> com <strong>${me.merit.toLocaleString('pt-BR')}</strong> de Mérito.
        ${above ? `Faltam <strong>${(above.merit - me.merit + 1).toLocaleString('pt-BR')}</strong> para ultrapassar ${esc(above.name.split(' ')[0])}.` : 'Ninguém está acima de você.'}</p>
      </header>

      <a class="objective reveal" href="${objectiveCard.href}" style="--d:1">
        <span class="objective-ic">${icon(objectiveCard.ic)}</span>
        <span class="objective-body"><small>${objectiveCard.kicker}</small><strong>${esc(objectiveCard.title)}</strong><span>${esc(objectiveCard.text)}</span></span>
        <span class="btn gold">${objectiveCard.cta}${icon('arrow')}</span>
      </a>

      <div class="spots">
        ${[
    ['#missoes', 'scroll', 'Quadro de missões', `${totals().lessonsDone} de ${totals().lessons} aulas concluídas`],
    ['#ranking', 'trophy', 'Telão do ranking', `${ordinal(me.rank)} de 6 · ${totals().duelsWon} prova${totals().duelsWon === 1 ? '' : 's'} vencida${totals().duelsWon === 1 ? '' : 's'}`],
    ['#lab', 'gamepad', 'Laboratório e Arcade', `${arcade.length} jogos em Python para rodar e modificar`],
    ['#guia', 'book', 'Guia de consulta', `${codex.length} fichas rápidas de Python`],
  ].map(([href, ic, title, text], index) => `<a class="spot reveal" href="${href}" style="--d:${index + 2}"><span class="spot-ic">${icon(ic)}</span><strong>${title}</strong><small>${text}</small></a>`).join('')}
        <button type="button" class="spot spot-kurisu reveal" id="open-kurisu" style="--d:6"><span class="spot-face">${avatar('kurisu', 'smirk')}</span><strong>Laboratório 404</strong><small>Tire dúvidas com Makise Kurisu</small></button>
      </div>

      <div class="class-row reveal" style="--d:7">
        <p class="eyebrow">A TURMA — clique para conversar</p>
        <div class="class-list">
          ${['vesper', ...rows.filter((row) => !row.you).map((row) => row.id)].map((id) => {
    const row = rows.find((item) => item.id === id);
    return `<button type="button" class="mate" data-talk="${id}" style="--glow:${CAST[id].color}">
              <span class="mate-face">${avatar(id)}</span>
              <span class="mate-info"><strong>${esc(CAST[id].name)}</strong><small>${row ? `${ordinal(row.rank)} · ${row.merit.toLocaleString('pt-BR')}` : 'Orientadora'}</small></span>
            </button>`;
  }).join('')}
        </div>
      </div>
    </div>
    <div class="talk" id="talk" hidden></div>
  </section>`;
  mountScene($('#hub-scene'), 'classroom');
  $('#open-kurisu').onclick = () => $('#kurisu-btn').click();
  setTutorContext(() => ({ mode: 'sala de aula (sem exercício aberto)' }));

  let talkTimer;
  $$('[data-talk]', main).forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.talk;
      const [step] = hubTalk(id);
      if (!step) return;
      const el = $('#talk');
      el.style.setProperty('--glow', CAST[id].color);
      el.innerHTML = `<div class="talk-portrait">${portrait(id, step.expr)}</div><div class="talk-bubble"><strong>${esc(CAST[id].full)}</strong><small>${esc(CAST[id].role.split(' · ')[0])}</small><p>${esc(step.text)}</p></div>`;
      el.hidden = false;
      el.classList.remove('in');
      void el.offsetWidth;
      el.classList.add('in');
      sfx.play('click');
      clearTimeout(talkTimer);
      talkTimer = setTimeout(() => { el.hidden = true; }, 7000);
      el.onclick = () => { el.hidden = true; };
    };
  });
  cleanup = () => clearTimeout(talkTimer);
}

// =============================== MISSÕES ===============================
export function missions(main) {
  main.innerHTML = `
  <section class="page">
    <header class="page-head reveal"><p class="eyebrow">QUADRO DE MISSÕES</p><h1>Cinco capítulos. Cinco rivais.</h1>
      <p>Conclua as aulas de um capítulo para liberar a Prova de Mérito contra o rival. Enfrentar a prova abre o capítulo seguinte.</p></header>
    <div class="chapters">
    ${chapters.map((chapter, index) => {
    const open = chapterUnlocked(chapter);
    const done = chapter.lessons.filter(lessonDone).length;
    const rival = CAST[chapter.rival];
    const duelOpen = duelUnlocked(chapter);
    const faced = duelFaced(chapter);
    const won = duelWon(chapter);
    return `<article class="chapter reveal ${open ? '' : 'locked'}" style="--d:${index + 1};--glow:${rival.color}">
        <header class="chapter-head">
          <span class="chapter-n">${String(chapter.n).padStart(2, '0')}</span>
          <div class="chapter-title"><h2>${esc(chapter.title)}</h2><p>${esc(chapter.blurb)}</p></div>
          <div class="chapter-rival"><span class="mate-face">${avatar(chapter.rival, won ? 'flustered' : 'smirk')}</span><small>Rival<br><strong>${esc(rival.name)}</strong></small></div>
        </header>
        <div class="progress"><span style="width:${(done / chapter.lessons.length) * 100}%"></span></div>
        ${open ? `<div class="lesson-list">
          ${chapter.lessons.map((lesson, i) => {
    const complete = lessonDone(lesson);
    const stars = lesson.exercises.filter((e) => state.ex[e.id]?.passed).length;
    return `<a class="lesson-row ${complete ? 'done' : ''}" href="#aula/${lesson.id}">
              <span class="lesson-n">${complete ? icon('check') : String(i + 1).padStart(2, '0')}</span>
              <span class="lesson-info"><strong>${esc(lesson.title)}</strong><small>${esc(lesson.summary)}</small></span>
              <span class="lesson-meta"><span class="pips">${lesson.exercises.map((e) => `<i class="${state.ex[e.id]?.passed ? 'on' : ''} ${e.level === 3 ? 'bonus' : ''}"></i>`).join('')}</span><small>${lessonMerit(lesson)}/${lessonMax(lesson)}</small></span>
              ${icon('arrow')}
            </a>`;
  }).join('')}
          <a class="lesson-row duel-row ${duelOpen ? '' : 'disabled'} ${won ? 'done' : ''}" ${duelOpen ? `href="#prova/${chapter.rival}"` : 'aria-disabled="true"'}>
            <span class="lesson-n">${won ? icon('check') : duelOpen ? icon('sword') : icon('lock')}</span>
            <span class="lesson-info"><strong>${esc(chapter.duel.title)}</strong><small>${won ? 'Vitória registrada. Você pode jogar de novo por diversão.' : faced ? 'Derrota honrosa. A revanche está aberta.' : duelOpen ? esc(chapter.duel.brief) : 'Conclua as aulas do capítulo para liberar a prova.'}</small></span>
            <span class="lesson-meta"><small>${won ? `+${POINTS.duelWin}` : `até +${POINTS.duelWin}`}</small></span>
            ${duelOpen ? icon('arrow') : ''}
          </a>
        </div>` : `<p class="chapter-lock">${icon('lock')} Enfrente a Prova de Mérito do capítulo ${chapter.n - 1} para liberar.</p>`}
      </article>`;
  }).join('')}
    </div>
  </section>`;
  setTutorContext(() => ({ mode: 'quadro de missões' }));
}

// =============================== AULA ===============================
function bodyBlock(block) {
  if (typeof block === 'string') return `<p>${fmt(block)}</p>`;
  if (block.code) return codeBlock(block.code);
  if (block.tip) return `<div class="note tip">${icon('bulb')}<p>${fmt(block.tip)}</p></div>`;
  if (block.warn) return `<div class="note warn">${icon('eye')}<p>${fmt(block.warn)}</p></div>`;
  if (block.list) return `<ul>${block.list.map((item) => `<li>${fmt(item)}</li>`).join('')}</ul>`;
  return '';
}

export function lesson(main, id) {
  const data = lessonById(id);
  if (!data) return go('#missoes');
  if (!chapterUnlocked(data.chapter)) { toast('Este capítulo ainda está trancado.'); return go('#missoes'); }
  state.last = id;
  save();
  const chapter = data.chapter;
  const index = chapter.lessons.findIndex((item) => item.id === id);
  const flat = lessons.findIndex((item) => item.id === id);
  const next = lessons[flat + 1];
  let current = Math.max(0, data.exercises.findIndex((e) => !state.ex[e.id]?.passed));
  let bench = null;
  const speaker = CAST[data.intro.who];

  main.innerHTML = `
  <section class="lesson">
    <header class="lesson-head reveal">
      <a class="link" href="#missoes">${icon('back')}Missões</a>
      <div><p class="eyebrow">CAPÍTULO ${chapter.n} · AULA ${index + 1} DE ${chapter.lessons.length} · ${data.minutes} MIN</p><h1>${esc(data.title)}</h1></div>
      <span class="lesson-score" id="lesson-score"></span>
    </header>
    <div class="lesson-grid">
      <article class="handout reveal" style="--d:1">
        <div class="briefing" style="--glow:${speaker.color}"><span class="mate-face">${avatar(data.intro.who)}</span><p><strong>${esc(speaker.name)}</strong>${esc(data.intro.text)}</p></div>
        ${data.sections.map((section, i) => `<section class="topic"><h2><span>${i + 1}</span>${esc(section.h)}</h2>${section.body.map(bodyBlock).join('')}</section>`).join('')}
        <section class="game-card">
          <p class="eyebrow">${icon('gamepad')} EXEMPLO DE JOGO</p>
          <h2>${esc(data.game.title)}</h2>
          <p>${fmt(data.game.text)}</p>
          ${codeBlock(data.game.code)}
          <div class="game-actions"><button type="button" class="btn ghost" id="game-run">${icon('play')}Rodar exemplo</button><button type="button" class="btn ghost" id="game-lab">${icon('flask')}Abrir no Laboratório</button></div>
          <pre class="game-out" id="game-out" hidden></pre>
        </section>
        <section class="topic two">
          <div><h3>Erros comuns</h3><ul class="pitfalls">${data.pitfalls.map((item) => `<li>${fmt(item)}</li>`).join('')}</ul></div>
          <div><h3>Em resumo</h3><ul class="recap">${data.recap.map((item) => `<li>${fmt(item)}</li>`).join('')}</ul></div>
        </section>
      </article>

      <div class="practice reveal" style="--d:2">
        <div class="tabs" role="tablist" id="ex-tabs"></div>
        <div class="exercise" id="exercise"></div>
        <section class="quiz" id="quiz"></section>
        <section class="finish" id="finish"></section>
      </div>
    </div>
  </section>`;

  const renderScore = () => {
    $('#lesson-score').innerHTML = `${icon('star')}<strong>${lessonMerit(data)}</strong> / ${lessonMax(data)}`;
    $('#ex-tabs').innerHTML = data.exercises.map((e, i) => `<button type="button" role="tab" aria-selected="${i === current}" class="tab ${i === current ? 'active' : ''} ${state.ex[e.id]?.passed ? 'done' : ''}" data-ex="${i}">${state.ex[e.id]?.passed ? icon('check') : `<b>${i + 1}</b>`}<span>${LEVEL_NAMES[e.level]}</span><small>+${POINTS[e.level]}</small></button>`).join('');
  };

  const renderFinish = () => {
    const complete = lessonDone(data);
    const need = [];
    if (!requiredDone(data)) need.push('resolver os exercícios 1 e 2');
    if (!quizDone(data)) need.push('acertar as perguntas');
    const chapterReady = chapterLessonsDone(chapter) && !duelFaced(chapter);
    $('#finish').className = `finish ${complete ? 'done' : ''}`;
    $('#finish').innerHTML = complete
      ? `<div><strong>${icon('check')} Aula concluída</strong><p>${chapterReady ? `Todas as aulas do capítulo prontas: a Prova de Mérito contra ${esc(CAST[chapter.rival].name)} está liberada.` : 'O desafio bônus continua valendo Mérito extra.'}</p></div>
         ${chapterReady ? `<a class="btn gold" href="#prova/${chapter.rival}">${icon('sword')}Ir para a prova</a>` : next && chapterUnlocked(next.chapter) ? `<a class="btn gold" href="#aula/${next.id}">Próxima aula${icon('arrow')}</a>` : `<a class="btn gold" href="#missoes">Ver missões${icon('arrow')}</a>`}`
      : `<div><strong>Para concluir a aula</strong><p>Falta ${need.join(' e ')}.</p></div>`;
  };

  const afterProgress = (previousRank) => {
    if (tryCompleteLesson(data)) {
      award(POINTS.lesson, 'aula concluída');
      if (chapterLessonsDone(chapter) && !duelFaced(chapter)) setTimeout(() => toast(`Prova de Mérito liberada: ${CAST[chapter.rival].full} está esperando.`, 'gold'), 1800);
    }
    renderScore();
    renderFinish();
    celebrate(previousRank);
  };

  function renderExercise() {
    const exercise = data.exercises[current];
    const record = state.ex[exercise.id] || {};
    $('#exercise').innerHTML = `
      <div class="ex-head"><p class="eyebrow">EXERCÍCIO ${current + 1} · ${LEVEL_NAMES[exercise.level].toUpperCase()}${exercise.level === 3 ? ' (OPCIONAL)' : ''}</p><h2>${esc(exercise.title)}</h2></div>
      <div class="ex-task">${prose(exercise.task)}</div>
      <div id="bench"></div>
      <div class="ex-help">
        <button type="button" class="link" id="hint-btn">${icon('bulb')}Pedir uma pista</button>
        <button type="button" class="link" id="ask-btn">${icon('chat')}Perguntar à Kurisu</button>
        <button type="button" class="link" id="solution-btn" ${record.tries >= 2 || record.passed ? '' : 'hidden'}>${icon('eye')}Ver uma solução</button>
      </div>
      <div class="hint" id="hint" hidden>${fmt(exercise.hint)}</div>
      <div class="solution" id="solution" hidden></div>`;
    bench = createWorkbench($('#bench'), {
      key: exercise.id, starter: exercise.starter, filename: `${exercise.id.replace(/-/g, '_')}.py`,
      cases: () => casesOf(exercise),
      onVerify: ({ passed }) => {
        const previousRank = rank();
        const entry = state.ex[exercise.id] ||= { tries: 0 };
        if (passed) {
          if (!entry.passed) {
            entry.passed = true;
            save();
            award(entry.half ? POINTS[exercise.level] / 2 : POINTS[exercise.level], exercise.title);
          }
          bench.setFeedback('good', exercise.level === 3 ? 'Desafio bônus vencido. Mérito extra registrado.' : 'Aprovado em todos os testes.');
          const following = data.exercises.findIndex((e, i) => i > current && !state.ex[e.id]?.passed);
          if (following > 0) setTimeout(() => { if ($('#exercise')) { current = following; renderScore(); renderExercise(); } }, 1600);
        } else {
          entry.tries = (entry.tries || 0) + 1;
          save();
          if (entry.tries >= 2) $('#solution-btn').hidden = false;
        }
        afterProgress(previousRank);
      },
    });
    $('#hint-btn').onclick = () => { const el = $('#hint'); el.hidden = !el.hidden; };
    $('#ask-btn').onclick = () => { if ($('#tutor').hidden) $('#kurisu-btn').click(); };
    $('#solution-btn').onclick = () => {
      const entry = state.ex[exercise.id] ||= { tries: 0 };
      const el = $('#solution');
      if (!el.hidden) { el.hidden = true; return; }
      if (!entry.passed && !entry.half && !confirm('Ver a solução reduz pela metade o Mérito deste exercício. Mostrar mesmo assim?')) return;
      if (!entry.passed) { entry.half = true; save(); }
      el.innerHTML = `<p>Leia, feche e tente reescrever com as suas palavras.</p>${codeBlock(exercise.solution)}`;
      el.hidden = false;
    };
  }

  function renderQuiz() {
    $('#quiz').innerHTML = `<p class="eyebrow">ANTES DE SEGUIR</p>${data.quiz.map((question, qi) => {
      const key = `${data.id}:${qi}`;
      return `<div class="question" data-q="${qi}"><h3>${prose(question.q)}</h3>
        <div class="options">${question.options.map((option, oi) => `<button type="button" class="option ${state.quiz[key] && oi === question.correct ? 'right' : ''}" data-o="${oi}"><b>${String.fromCharCode(65 + oi)}</b>${fmt(option)}</button>`).join('')}</div>
        <p class="why" ${state.quiz[key] ? '' : 'hidden'}>${fmt(question.why)}</p></div>`;
    }).join('')}`;
    $$('.question', main).forEach((box) => {
      const qi = Number(box.dataset.q);
      const question = data.quiz[qi];
      const key = `${data.id}:${qi}`;
      box.onclick = (event) => {
        const button = event.target.closest('.option');
        if (!button) return;
        const right = Number(button.dataset.o) === question.correct;
        $$('.option', box).forEach((el) => el.classList.remove('wrong'));
        const why = $('.why', box);
        if (right) {
          button.classList.add('right');
          why.hidden = false;
          why.innerHTML = fmt(question.why);
          sfx.play('ok');
          if (!state.quiz[key]) {
            const previousRank = rank();
            state.quiz[key] = true;
            save();
            award(POINTS.quiz, 'pergunta respondida');
            afterProgress(previousRank);
          }
        } else {
          button.classList.add('wrong');
          why.hidden = false;
          why.textContent = 'Ainda não. Releia o trecho da aula sobre isso e tente outra alternativa.';
          sfx.play('bad');
        }
      };
    });
  }

  $('#ex-tabs').onclick = (event) => {
    const tab = event.target.closest('[data-ex]');
    if (!tab) return;
    current = Number(tab.dataset.ex);
    renderScore();
    renderExercise();
  };

  $('#game-run').onclick = async () => {
    const out = $('#game-out');
    out.hidden = false;
    out.textContent = 'Executando…';
    try {
      const result = await runner.run(data.game.code, { inputs: data.game.inputs || [], seed: Math.floor(Math.random() * 1e9) });
      if (!out.isConnected) return;
      out.innerHTML = (result.parts || []).map(([kind, text]) => `<span class="t-${kind}">${esc(text)}</span>`).join('') + (result.error ? `<span class="t-err">${esc(result.error)}</span>` : '');
    } catch (error) { out.textContent = error.message; }
  };
  $('#game-lab').onclick = () => { state.drafts.lab = data.game.code; save(); go('#lab'); };

  renderScore();
  renderExercise();
  renderQuiz();
  renderFinish();
  setTutorContext(() => {
    const exercise = data.exercises[current];
    const snap = bench?.snapshot() || {};
    return { mode: 'aula', lesson: `${data.title} — ${data.summary}`, concept: data.recap.join(' '), exercise: exercise.title, task: exercise.task, hint: exercise.hint, code: snap.code, output: snap.output, error: snap.error };
  });
}

// =============================== PROVA (DUELO) ===============================
export async function duel(main, rivalId) {
  const chapter = chapterByRival(rivalId);
  if (!chapter) return go('#missoes');
  if (!duelUnlocked(chapter)) { toast('Conclua as aulas do capítulo para liberar esta prova.'); return go('#missoes'); }
  const spec = chapter.duel;
  const rival = CAST[rivalId];
  const already = state.duels[rivalId];
  const rematch = !!already;
  let alive = true;
  cleanup = () => { alive = false; };

  main.innerHTML = '<section class="page"><p class="eyebrow">ARENA</p></section>';
  const picked = await playScene(preDuel(chapter, rematch));
  if (!alive) return;

  const total = spec.seconds;
  let elapsed = 0;
  let rivalDone = false;
  let finished = false;
  let tauntIndex = -1;

  main.innerHTML = `
  <section class="duel" style="--glow:${rival.color}">
    <div class="duel-scene" id="duel-scene"></div>
    <div class="duel-ui">
      <header class="versus reveal">
        <div class="fighter you"><span class="mate-face">${avatar('voce')}</span><div><small>VAGA 006</small><strong>${esc(state.name || 'Você')}</strong></div></div>
        <div class="clock"><small>${rematch ? 'REVANCHE' : 'PROVA DE MÉRITO'}</small><strong id="clock">0:00</strong></div>
        <div class="fighter rival"><div><small>${esc(rival.role.split(' · ')[0])}</small><strong>${esc(rival.full)}</strong></div><span class="mate-face">${avatar(rivalId, 'smirk')}</span></div>
        <div class="race"><span id="race-bar"></span><i id="race-label">${esc(rival.name)}: 0%</i></div>
        <p class="taunt" id="taunt" hidden></p>
      </header>
      <div class="duel-grid">
        <article class="duel-task reveal" style="--d:1">
          <p class="eyebrow">${icon('sword')} O DESAFIO</p>
          <h1>${esc(spec.title)}</h1>
          ${prose(spec.task)}
          <div class="ex-help"><button type="button" class="link" id="duel-hint">${icon('bulb')}Pedir pista (o rival avança 45 s)</button><button type="button" class="link" id="duel-quit">${icon('back')}Abandonar a prova</button></div>
          <div class="hint" id="hint" hidden>${fmt(spec.hint)}</div>
        </article>
        <div class="reveal" style="--d:2"><div id="bench"></div></div>
      </div>
    </div>
  </section>`;
  mountScene($('#duel-scene'), 'arena');

  const clock = $('#clock');
  const bar = $('#race-bar');
  const label = $('#race-label');
  const tick = () => {
    if (finished) return;
    const left = Math.max(0, total - elapsed);
    clock.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    const pct = Math.min(100, (elapsed / total) * 100);
    bar.style.width = pct + '%';
    label.textContent = rivalDone ? `${rival.name} entregou.` : `${rival.name}: ${Math.floor(pct)}%`;
    clock.classList.toggle('danger', left <= 60 && !rivalDone);
    const due = Math.floor((pct / 100) * (spec.taunts.length + 1)) - 1;
    if (due > tauntIndex && due < spec.taunts.length && !rivalDone) {
      tauntIndex = due;
      const el = $('#taunt');
      el.textContent = `“${spec.taunts[due]}”`;
      el.hidden = false;
      el.classList.remove('in');
      void el.offsetWidth;
      el.classList.add('in');
      sfx.play('type');
    }
    if (elapsed >= total && !rivalDone) {
      rivalDone = true;
      const el = $('#taunt');
      el.textContent = `${rival.name} entregou primeiro. Termine a sua solução para garantir o Mérito de honra.`;
      el.hidden = false;
      el.classList.add('late');
      $('.duel', main)?.classList.add('lost');
      sfx.play('bad');
    }
  };
  const timer = setInterval(() => { if (!document.hidden) { elapsed += 1; tick(); } }, 1000);
  tick();
  cleanup = () => { alive = false; clearInterval(timer); };

  const bench = createWorkbench($('#bench'), {
    key: `duel-${rivalId}`, starter: spec.starter, filename: `prova_${rivalId}.py`, verifyLabel: 'Entregar',
    cases: () => casesOf(spec),
    onVerify: async ({ passed }) => {
      if (!passed || finished) return;
      finished = true;
      clearInterval(timer);
      const won = !rivalDone;
      const previousRank = rank();
      const firstWin = won && already?.result !== 'win';
      const firstTime = !already;
      if (firstTime) state.duels[rivalId] = { result: won ? 'win' : 'honra', bet: picked.bet ? (won ? 1 : -1) : 0 };
      else if (won) state.duels[rivalId].result = 'win';
      save();
      await new Promise((resolve) => setTimeout(resolve, 900));
      if (!alive) return;
      await playScene(postDuel(chapter, won, firstWin));
      const nextChapter = chapters[chapter.n];
      if (firstTime && nextChapter) await playScene(chapterIntro(nextChapter));
      if (!nextChapter && (firstTime || (firstWin && rank() === 1))) await playScene(ending(rank() === 1));
      celebrate(previousRank);
      go('#missoes');
    },
  });
  $('#duel-hint').onclick = () => {
    const el = $('#hint');
    if (el.hidden) { el.hidden = false; if (!rivalDone) { elapsed = Math.min(total, elapsed + 45); tick(); } $('#duel-hint').disabled = true; }
  };
  $('#duel-quit').onclick = () => { if (confirm('Abandonar a prova? Nada será registrado e você pode voltar depois.')) go('#missoes'); };
  setTutorContext(() => {
    const snap = bench.snapshot();
    return { mode: 'duelo', lesson: `Prova de Mérito contra ${rival.full}`, exercise: spec.title, task: spec.task, code: snap.code, output: snap.output, error: snap.error };
  });
}

// =============================== RANKING ===============================
export function rankingScreen(main) {
  const rows = ranking();
  const top = Math.max(...rows.map((row) => row.merit), 1);
  const t = totals();
  main.innerHTML = `
  <section class="page narrow">
    <header class="page-head reveal"><p class="eyebrow">TELÃO DA SALA ÔMEGA</p><h1>Ranking de Mérito</h1><p>Atualizado em tempo real. No fim do período, o último lugar é desligado.</p></header>
    <ol class="board">
      ${rows.map((row, index) => `<li class="board-row reveal ${row.you ? 'you' : ''}" style="--d:${index + 1};--glow:${row.color}">
        <span class="board-rank">${row.rank}</span>
        <span class="mate-face">${avatar(row.id)}</span>
        <span class="board-name"><strong>${esc(row.name)}</strong><small>${row.you ? 'Vaga 006 · você' : esc(CAST[row.id].role.split(' · ')[0])}${!row.you && state.duels[row.id]?.result === 'win' ? ' · derrotado por você' : ''}</small></span>
        <span class="board-bar"><i style="--w:${(row.merit / top) * 100}%"></i></span>
        <span class="board-merit" data-merit="${row.merit}">0</span>
      </li>`).join('')}
    </ol>
    <div class="stats reveal" style="--d:8">
      <div><strong>${t.lessonsDone}<small>/${t.lessons}</small></strong><span>aulas concluídas</span></div>
      <div><strong>${t.exercisesDone}<small>/${t.exercises}</small></strong><span>exercícios resolvidos</span></div>
      <div><strong>${t.duelsWon}<small>/${chapters.length}</small></strong><span>provas vencidas</span></div>
    </div>
    <details class="settings reveal" style="--d:9"><summary>${icon('gear')} Ajustes do jogo</summary>
      <label class="switch"><input type="checkbox" id="free-mode" ${state.freeMode ? 'checked' : ''}><span>Modo livre: abrir todos os capítulos e provas agora</span></label>
      <div class="settings-row"><button type="button" class="btn ghost" id="replay-intro">Rever o prólogo</button><button type="button" class="btn ghost danger" id="reset-all">Apagar progresso e recomeçar</button></div>
      <p class="fine">O progresso fica salvo apenas neste navegador.</p>
    </details>
  </section>`;
  $$('.board-merit', main).forEach((el) => countUp(el, Number(el.dataset.merit), 1100));
  $('#free-mode').onchange = (event) => { state.freeMode = event.target.checked; save(); toast(state.freeMode ? 'Modo livre ativado: tudo aberto.' : 'Modo livre desativado.'); };
  $('#reset-all').onclick = () => { if (confirm('Apagar todo o progresso, o nome e os rascunhos de código? Isso não pode ser desfeito.')) resetAll(); };
  $('#replay-intro').onclick = async () => { const { prologue } = await import('./story.js'); await playScene(prologue()); };
  setTutorContext(() => ({ mode: 'telão do ranking' }));
}

// =============================== LABORATÓRIO ===============================
const LAB_STARTER = `# Laboratório livre: escreva, rode, quebre e conserte.
# Aqui o input() funciona de verdade: digite a resposta no terminal.

nome = input("Como devo chamar você? ")
print(f"Olá, {nome}! O laboratório é todo seu.")
`;

export function lab(main, gameId) {
  main.innerHTML = `
  <section class="page wide">
    <header class="page-head reveal"><p class="eyebrow">LABORATÓRIO LIVRE</p><h1>Experimente sem medo.</h1><p>Python de verdade rodando no seu navegador. Nada aqui vale nota: é o lugar de testar ideias e desmontar jogos para ver como funcionam.</p></header>
    <div class="lab-grid">
      <div class="reveal" style="--d:1"><div id="bench"></div></div>
      <aside class="arcade reveal" style="--d:2">
        <p class="eyebrow">${icon('gamepad')} ARCADE — JOGOS EM PYTHON</p>
        <p class="fine">Carregue um jogo, jogue no terminal e depois encare o desafio de modificá-lo.</p>
        ${arcade.map((game) => `<button type="button" class="game" data-game="${game.id}"><strong>${esc(game.title)}</strong><small>${esc(game.tag)} · ${esc(game.level)}</small><span>${esc(game.text)}</span></button>`).join('')}
      </aside>
    </div>
  </section>`;
  const bench = createWorkbench($('#bench'), { key: 'lab', starter: LAB_STARTER, filename: 'laboratorio.py', interactive: true });
  const loadGame = (id, ask) => {
    const game = arcade.find((item) => item.id === id);
    if (!game) return;
    const code = bench.getCode();
    if (ask && code.trim() && code !== LAB_STARTER && !arcade.some((item) => item.code === code) && !confirm(`Carregar “${game.title}” substitui o código que está no editor. Continuar?`)) return;
    bench.setCode(game.code);
    $$('.game', main).forEach((el) => el.classList.toggle('active', el.dataset.game === id));
    toast(`${game.title} carregado. Clique em Executar e jogue no terminal.`);
    $('#bench').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $$('.game', main).forEach((button) => { button.onclick = () => loadGame(button.dataset.game, true); });
  if (gameId) loadGame(gameId, false);
  setTutorContext(() => { const snap = bench.snapshot(); return { mode: 'laboratório livre', code: snap.code, output: snap.output, error: snap.error }; });
}

// =============================== GUIA ===============================
export function guide(main) {
  main.innerHTML = `
  <section class="page">
    <header class="page-head reveal"><p class="eyebrow">GUIA DE CONSULTA</p><h1>Tudo o que você já viu, em uma página.</h1>
      <label class="search"><span class="sr-only">Buscar no guia</span><input type="search" id="guide-search" placeholder="Buscar: lista, while, f-string…" autocomplete="off"></label></header>
    <div class="cards" id="guide-cards"></div>
  </section>`;
  const paint = (term) => {
    const q = term.trim().toLowerCase();
    const found = codex.filter((entry) => !q || [entry.term, entry.category, entry.text, entry.code, ...entry.keys].join(' ').toLowerCase().includes(q));
    $('#guide-cards').innerHTML = found.length
      ? found.map((entry, index) => `<article class="card reveal" style="--d:${Math.min(index, 8)}"><small>${esc(entry.category)}</small><h2>${esc(entry.term)}</h2><p>${esc(entry.text)}</p>${codeBlock(entry.code)}</article>`).join('')
      : '<p class="empty">Nada encontrado. Tente outra palavra ou pergunte à Kurisu.</p>';
  };
  paint('');
  $('#guide-search').oninput = (event) => paint(event.target.value);
  setTutorContext(() => ({ mode: 'guia de consulta' }));
}
