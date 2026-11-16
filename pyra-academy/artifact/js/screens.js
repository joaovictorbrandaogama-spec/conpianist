// Telas do jogo: campus, missões, aula, exame, conselho (classes, ranking e anuário),
// galeria, dormitório, sala de informática e biblioteca.
import { $, $$, esc, fmt, icon, codeBlock, toast, sfx, countUp, sleep, ask } from './util.js';
import { go } from './nav.js';
import { chapters, lessons, lessonById, chapterByRival, casesOf, POINTS, SYSTEM, LEVEL_NAMES, MONTHS } from './content/index.js';
import { arcade } from './content/arcade.js';
import { codex } from './content/codex.js';
import { CAST, CLASS_MOTTO, studentsOf, avatar, portrait, PLAYER_LOOKS, lookAvatar, setPlayerLook } from './art/characters.js';
import {
  state, save, ranking, rank, classBoard, letterOf, playerLetter, snapshot, lessonMerit, lessonMax, lessonDone, requiredDone, quizDone,
  chapterLessonsDone, chapterUnlocked, duelUnlocked, duelFaced, duelWon, tryCompleteLesson, nextObjective, totals, resetAll,
  calendar, SHOP, buy, useItem, grantDeposit, pendingMonths,
} from './state.js';
import { bondRank as bond, bondBlocked, BONDS, MAX_RANK, slots, shopDiscount, duelBonusSeconds } from './life.js';
import { arcanaCard, hangout } from './agenda.js';
import { RULES, FILES, SCHOOL, CLASS_LORE } from './lore.js';
import { useListOnce } from './hub3d.js';
import { loreProgress } from './life.js';
import { createWorkbench, runner } from './editor.js';
import { mountScene, playScene } from './vn.js';
import { hubTalk, preDuel, postDuel, chapterIntro, ending, promotion, monthStart, prologue } from './story.js';
import { setTutorContext, openProject, toggleTutor, currentTutor } from './tutor.js';
import { CREATIVE } from './content/creative.js';

let cleanup = null;
export function leaveScreen() { cleanup?.(); cleanup = null; setTutorContext(null); }

const ordinal = (n) => `${n}º`;
const num = (value) => value.toLocaleString('pt-BR');
const prose = (text) => String(text).split(/\n{2,}/).map((p) => `<p>${fmt(p).replace(/\n/g, '<br>')}</p>`).join('');
const first = (name) => name.split(' ')[0];
const chip = (home) => `<span class="chip" style="--glow:${classBoard().find((row) => row.home === home)?.color || '#fff'}">${letterOf(home) || '—'}</span>`;
const stars = (level) => `<span class="bond" title="Vínculo nível ${level} de ${MAX_RANK}">${Array.from({ length: MAX_RANK }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</span>`;
const BOND_WORDS = ['Vocês ainda não se falaram.', 'Conhecidos.', 'Colegas.', 'Colegas próximos.', 'Aliados.', 'Aliados de verdade.', 'Confiança.', 'Confiança profunda.', 'Cumplicidade.', 'Quase família.', 'Vínculo máximo.'];

// ---------- faixa de conquista ----------
let bandTimer;
function showBand(kicker, title, text, tone = 'red') {
  const el = $('#rankup');
  el.className = `rankup tone-${tone}`;
  el.innerHTML = `<div class="rankup-card"><small>${esc(kicker)}</small><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
  el.hidden = false;
  sfx.play('title');
  clearTimeout(bandTimer);
  bandTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

const MILESTONES = [30, 20, 10, 5, 3, 2, 1];
/** Compara com a foto anterior: promoção de classe, marco do ranking ou subida simples. */
export async function celebrate(previous) {
  const now = snapshot();
  if (now.letter < previous.letter) {
    const key = `promo:${now.letter}`;
    if (state.flags[key]) {
      showBand('PROMOÇÃO DE CLASSE', `Turma ${now.letter}`, 'A sua turma trocou de letra no Sistema S.', 'gold');
    } else {
      // Primeira vez nesta letra: a turma inteira comemora em cena.
      state.flags[key] = true;
      save();
      await playScene(promotion(now.letter));
    }
    return;
  }
  if (now.rank >= previous.rank) return;
  const passed = ranking()[now.rank];
  if (MILESTONES.some((mark) => previous.rank > mark && now.rank <= mark)) {
    showBand('SUBIU NO RANKING', `${ordinal(now.rank)} lugar`, passed ? `Você ultrapassou ${passed.name}.` : '', 'red');
  } else {
    setTimeout(() => toast(`Ranking: ${ordinal(now.rank)} lugar${passed ? ` · você ultrapassou ${first(passed.name)}` : ''}`, 'gold'), 1700);
  }
}

function award(points, label) {
  if (points > 0) { toast(`+${points} de Mérito · ${label}`, 'gold'); sfx.play('merit'); }
}

// ---------- virada de mês ----------
let turning = false;
/**
 * Dia 1º: para cada mês que já virou, o depósito cai e o novo capítulo é apresentado.
 * Roda ao chegar ao campus ou ao quadro de missões, então nada se perde se a aba fechar depois de um exame.
 */
export async function monthTurn(repaint) {
  if (turning) return;
  const months = pendingMonths();
  if (!months.length) return;
  turning = true;
  try {
    for (const chapter of months) {
      await playScene([...monthStart(chapter, grantDeposit(chapter)), ...chapterIntro(chapter)]);
    }
  } finally {
    turning = false;
  }
  repaint();
}

// ---------- conversa rápida ----------
let talkTimer;
function speak(id) {
  const [step] = hubTalk(id);
  const el = $('#talk');
  if (!step || !el) return;
  const cast = CAST[id];
  el.style.setProperty('--glow', cast.color);
  el.innerHTML = `<div class="talk-portrait">${portrait(id, step.expr)}</div>
    <div class="talk-bubble"><div class="talk-name"><strong>${esc(cast.full)}</strong><small>${esc(cast.tag || cast.role)}</small>${stars(bond(id))}</div><p>${esc(step.text)}</p></div>`;
  el.hidden = false;
  el.classList.remove('in');
  void el.offsetWidth;
  el.classList.add('in');
  sfx.play('click');
  clearTimeout(talkTimer);
  talkTimer = setTimeout(() => { el.hidden = true; }, 8000);
  el.onclick = () => { el.hidden = true; };
}

// =============================== CAMPUS ===============================
export function hub(main) {
  const rows = ranking();
  const me = rows.find((row) => row.you);
  const above = rows[me.rank - 2];
  const board = classBoard();
  const mine = board.find((row) => row.you);
  const classAbove = board[board.indexOf(mine) - 1];
  const objective = nextObjective();
  const t = totals();
  const cal = calendar();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const openExam = chapters.find((chapter) => duelUnlocked(chapter) && !duelWon(chapter));
  const free = slots();

  const objectiveCard = {
    lesson: () => ({ kicker: `PRÓXIMA MISSÃO · CAPÍTULO ${objective.chapter.n}`, title: objective.lesson.title, text: objective.lesson.summary, href: `#aula/${objective.lesson.id}`, cta: state.last === objective.lesson.id ? 'Continuar aula' : 'Começar aula', ic: 'scroll' }),
    duel: () => ({ kicker: 'EXAME ESPECIAL LIBERADO', title: `Enfrente ${CAST[objective.chapter.rival].full}`, text: objective.chapter.duel.brief, href: `#prova/${objective.chapter.rival}`, cta: 'Ir para o exame', ic: 'sword' }),
    rematch: () => ({ kicker: 'REVANCHE DISPONÍVEL', title: `Revanche contra ${CAST[objective.chapter.rival].full}`, text: `Você entregou certo, mas depois. Vença no relógio para somar ${SYSTEM.examWinCP} Pontos de Classe.`, href: `#prova/${objective.chapter.rival}`, cta: 'Pedir revanche', ic: 'sword' }),
    bonus: () => ({ kicker: 'DESAFIOS BÔNUS', title: objective.lesson.title, text: 'Ainda há desafios bônus abertos. Cada um vale 50 de Mérito.', href: `#aula/${objective.lesson.id}`, cta: 'Ver desafios', ic: 'star' }),
    complete: () => ({ kicker: 'ANO LETIVO CONCLUÍDO', title: 'Você zerou a Academia Pyra', text: 'Todas as aulas, desafios e exames vencidos. A Sala de Informática continua aberta para você criar.', href: '#lab', cta: 'Abrir o laboratório', ic: 'flask' }),
  }[objective.type]();

  const places = [
    { href: '#missoes', ic: 'scroll', scene: 'classroom', name: `Sala da Turma ${mine.letter}`, text: `Quadro de missões · ${t.lessonsDone} de ${t.lessons} aulas`, who: ['vesper', 'ayumi', 'caio'] },
    { href: openExam ? `#prova/${openExam.rival}` : '#missoes', ic: 'sword', scene: 'arena', name: 'Prédio de Exames', text: openExam ? `Exame aberto contra ${CAST[openExam.rival].full}` : 'Conclua as aulas do mês para liberar o exame', who: openExam ? [openExam.rival] : [], hot: !!openExam },
    { href: '#agenda', ic: 'calendar', scene: 'rooftop', name: 'Agenda e vínculos', text: `${free.aft} tardes e ${free.night} noites livres`, who: ['samuel', 'kiara', 'ayumi'], hot: free.aft + free.night > 0 },
    { href: '#conselho', ic: 'trophy', scene: 'council', name: 'Conselho Estudantil', text: `Sistema S · você em ${ordinal(me.rank)} de ${t.students}`, who: ['helena'] },
    { href: '#lab', ic: 'gamepad', scene: 'complab', name: 'Sala de Informática', text: `Laboratório livre e ${arcade.length} jogos em Python`, who: ['icaro', 'jonas'] },
    { href: '#guia', ic: 'book', scene: 'library', name: 'Biblioteca', text: `${codex.length} fichas, o regulamento e os arquivos`, who: ['zila', 'raquel'] },
    { action: 'kurisu', ic: 'flask', scene: 'lab', name: 'Laboratório 404', text: 'Tire dúvidas com Makise Kurisu', who: ['kurisu'] },
    { action: 'monika', ic: 'star', scene: 'classroom', name: 'Clube de Código Criativo', text: 'Projetos criativos guiados pela Monika', who: ['monika'] },
    { href: '#loja', ic: 'bag', scene: 'mall', name: 'Galeria Jacarandá', text: `Saldo: ${num(state.pp)} pp · tudo se compra com pontos`, who: ['lara', 'bia'] },
    { href: '#dorm', ic: 'bed', scene: 'dorm', name: 'Dormitório', text: 'ID estudantil, ajustes e memórias', who: [] },
  ];

  main.innerHTML = `
  <section class="hub">
    <div class="hub-scene" id="hub-scene"></div>
    <div class="hub-shade"></div>
    <div class="hub-ui">
      <header class="hub-head reveal">
        <div class="datecard" aria-label="Data no jogo"><b>${String(cal.day).padStart(2, '0')}</b><span><strong>${cal.month.toUpperCase()}</strong><small>${cal.weekday} · ${cal.period}</small></span></div>
        <div class="hub-hello">
          <p class="eyebrow">TURMA ${mine.letter} · MATRÍCULA D-40</p>
          <h1>${greeting}, <em>${esc(state.name || 'D-40')}</em>.</h1>
          <p class="hub-status">Você está em <strong>${ordinal(me.rank)} lugar</strong> de ${t.students}, com <strong>${num(me.merit)}</strong> de Mérito.
          ${above ? `Faltam <strong>${num(above.merit - me.merit + 1)}</strong> para ultrapassar ${esc(first(above.name))}.` : 'Ninguém está acima de você.'}
          ${classAbove ? `A sua turma tem <strong>${num(mine.cp)} CP</strong>: faltam <strong>${num(classAbove.cp - mine.cp + 1)}</strong> para virar a Turma ${classAbove.letter}.` : `A sua turma lidera o Sistema S com <strong>${num(mine.cp)} CP</strong>.`}</p>
        </div>
      </header>

      <a class="objective reveal" href="${objectiveCard.href}" style="--d:1">
        <span class="objective-ic">${icon(objectiveCard.ic)}</span>
        <span class="objective-body"><small>${objectiveCard.kicker}</small><strong>${esc(objectiveCard.title)}</strong><span>${esc(objectiveCard.text)}</span></span>
        <span class="btn gold">${objectiveCard.cta}${icon('arrow')}</span>
      </a>

      <a class="freetime reveal" href="#agenda" style="--d:2">
        <span class="freetime-ic">${icon('calendar')}</span>
        <span class="freetime-body"><small>TEMPO LIVRE</small><strong>${free.aft} ${free.aft === 1 ? 'tarde' : 'tardes'} e ${free.night} ${free.night === 1 ? 'noite' : 'noites'}</strong><span>${free.aft + free.night ? 'Estude, treine, faça um bico ou passe tempo com alguém. Cada aula concluída libera mais tempo.' : 'Conclua uma aula para liberar mais tempo livre.'}</span></span>
        ${icon('arrow')}
      </a>

      <div class="hub-grid">
        <nav class="places" aria-label="Lugares do campus">
          <p class="eyebrow">${icon('map')} MAPA DO CAMPUS</p>
          <button type="button" class="btn gold explore3d" id="explore3d">${icon('map')}Andar pelo campus em 3D</button>
          ${places.map((place, index) => `<${place.href ? `a href="${place.href}"` : 'button type="button"'} class="place reveal ${place.hot ? 'hot' : ''}" data-place="${index}" style="--d:${index + 2}">
            <span class="place-n">${String(index + 1).padStart(2, '0')}</span>
            <span class="place-ic">${icon(place.ic)}</span>
            <span class="place-body"><strong>${esc(place.name)}</strong><small>${esc(place.text)}</small></span>
            ${icon('arrow')}
          </${place.href ? 'a' : 'button'}>`).join('')}
        </nav>

        <aside class="hub-side reveal" style="--d:4">
          <div class="place-view">
            <div class="place-scene" id="place-scene"></div>
            <div class="place-cap"><small>NO CAMPUS</small><strong id="place-name"></strong><div class="place-who" id="place-who"></div></div>
          </div>
          <div class="class-card" style="--glow:${mine.color}">
            <div class="class-card-head">
              <b>${mine.letter}</b>
              <div><p class="eyebrow">SUA TURMA</p><strong>${num(mine.cp)} Pontos de Classe</strong><small>${ordinal(board.indexOf(mine) + 1)} de 4 turmas · depósito de ${num(mine.cp * SYSTEM.ppPerCP)} pp por aluno</small></div>
            </div>
            <p class="fine">Toque em alguém da turma para conversar.</p>
            <div class="class-list">
              ${['vesper', ...studentsOf('d')].map((id) => {
    const row = rows.find((item) => item.id === id);
    return `<button type="button" class="mate" data-talk="${id}" style="--glow:${CAST[id].color}">
                <span class="mate-face">${avatar(id)}</span>
                <span class="mate-info"><strong>${esc(CAST[id].name)}</strong><small>${row ? `${ordinal(row.rank)} · ${num(row.merit)}` : 'Orientadora'}</small></span>
              </button>`;
  }).join('')}
            </div>
          </div>
        </aside>
      </div>
    </div>
    <div class="talk" id="talk" hidden></div>
  </section>`;
  mountScene($('#hub-scene'), 'gate');
  setTutorContext(() => ({ mode: 'campus (sem exercício aberto)' }));

  let shown = -1;
  const preview = (index) => {
    if (index === shown) return;
    shown = index;
    const place = places[index];
    mountScene($('#place-scene'), place.scene);
    $('#place-name').textContent = place.name;
    $('#place-who').innerHTML = place.who.map((id) => `<span class="mate-face" style="--glow:${CAST[id].color}" title="${esc(CAST[id].full)}">${avatar(id)}</span>`).join('');
    $$('.place', main).forEach((el) => el.classList.toggle('active', Number(el.dataset.place) === index));
  };
  preview(Math.max(0, places.findIndex((place) => place.href === objectiveCard.href.replace(/^(#aula).*/, '#missoes'))));
  $$('.place', main).forEach((el) => {
    const index = Number(el.dataset.place);
    el.addEventListener('pointerenter', () => preview(index));
    el.addEventListener('focus', () => preview(index));
    if (places[index].action === 'kurisu') el.onclick = () => $('#kurisu-btn').click();
    if (places[index].action === 'monika') el.onclick = () => $('#monika-btn').click();
  });
  $$('[data-talk]', main).forEach((button) => { button.onclick = () => speak(button.dataset.talk); });
  $('#explore3d').onclick = () => {
    if (state.graphics === '2d') { state.graphics = '3d'; save(); }
    useListOnce(false);
    go('#campus');
  };
  let here = true;
  cleanup = () => { here = false; clearTimeout(talkTimer); };
  monthTurn(() => { if (here) hub(main); });
}

// =============================== MISSÕES ===============================
export function missions(main) {
  main.innerHTML = `
  <section class="page">
    <header class="page-head reveal"><p class="eyebrow">QUADRO DE MISSÕES · SALA DA TURMA ${playerLetter()}</p><h1>Seis meses. Seis exames.</h1>
      <p>Cada capítulo é um mês do ano letivo. Conclua as aulas para liberar o Exame Especial; enfrentar o exame abre o mês seguinte — e traz o depósito do dia 1º. Cada aula concluída vale <strong>+${SYSTEM.lessonCP} Pontos de Classe</strong> para a turma.</p></header>
    <div class="chapters">
    ${chapters.map((chapter, index) => {
    const open = chapterUnlocked(chapter);
    const done = chapter.lessons.filter(lessonDone).length;
    const rival = CAST[chapter.rival];
    const duelOpen = duelUnlocked(chapter);
    const faced = duelFaced(chapter);
    const won = duelWon(chapter);
    const rivalClass = 'abcd'.includes(rival.home) ? `Turma ${letterOf(rival.home)}` : 'Conselho';
    return `<article class="chapter reveal ${open ? '' : 'locked'}" style="--d:${index + 1};--glow:${rival.color}">
        <header class="chapter-head">
          <span class="chapter-n">${String(chapter.n).padStart(2, '0')}</span>
          <div class="chapter-title"><small>${MONTHS[index].toUpperCase()}</small><h2>${esc(chapter.title)}</h2><p>${esc(chapter.blurb)}</p></div>
          <div class="chapter-rival"><span class="mate-face">${avatar(chapter.rival, won ? 'flustered' : 'smirk')}</span><small>${rivalClass}<br><strong>${esc(rival.name)}</strong></small></div>
        </header>
        <div class="progress"><span style="width:${(done / chapter.lessons.length) * 100}%"></span></div>
        ${open ? `<div class="lesson-list">
          ${chapter.lessons.map((lesson, i) => {
    const complete = lessonDone(lesson);
    return `<a class="lesson-row ${complete ? 'done' : ''}" href="#aula/${lesson.id}">
              <span class="lesson-n">${complete ? icon('check') : String(i + 1).padStart(2, '0')}</span>
              <span class="lesson-info"><strong>${esc(lesson.title)}</strong><small>${esc(lesson.summary)}</small></span>
              <span class="lesson-meta"><span class="pips">${lesson.exercises.map((e) => `<i class="${state.ex[e.id]?.passed ? 'on' : ''} ${e.level === 3 ? 'bonus' : ''}"></i>`).join('')}</span><small>${lessonMerit(lesson)}/${lessonMax(lesson)}</small></span>
              ${icon('arrow')}
            </a>`;
  }).join('')}
          <a class="lesson-row duel-row ${duelOpen ? '' : 'disabled'} ${won ? 'done' : ''}" ${duelOpen ? `href="#prova/${chapter.rival}"` : 'aria-disabled="true"'}>
            <span class="lesson-n">${won ? icon('check') : duelOpen ? icon('sword') : icon('lock')}</span>
            <span class="lesson-info"><strong>${esc(chapter.duel.title)}</strong><small>${won ? 'Vitória registrada. Você pode refazer por diversão.' : faced ? 'Entrega tardia. A revanche está aberta.' : duelOpen ? esc(chapter.duel.brief) : 'Conclua as aulas do capítulo para liberar o exame.'}</small></span>
            <span class="lesson-meta"><small>${won ? `+${POINTS.duelWin}` : `até +${POINTS.duelWin}`}</small><small>+${SYSTEM.examWinCP} CP</small></span>
            ${duelOpen ? icon('arrow') : ''}
          </a>
        </div>` : `<p class="chapter-lock">${icon('lock')} Enfrente o Exame Especial do capítulo ${chapter.n - 1} para liberar.</p>`}
      </article>`;
  }).join('')}
    </div>
  </section>`;
  setTutorContext(() => ({ mode: 'quadro de missões' }));
  let here = true;
  cleanup = () => { here = false; };
  monthTurn(() => { if (here) missions(main); });
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
          <p class="eyebrow">${icon('gamepad')} EXEMPLO PRÁTICO</p>
          <h2>${esc(data.game.title)}</h2>
          <p>${fmt(data.game.text)}</p>
          ${codeBlock(data.game.code)}
          <div class="game-actions"><button type="button" class="btn ghost" id="game-run">${icon('play')}Rodar exemplo</button><button type="button" class="btn ghost" id="game-lab">${icon('flask')}Abrir no laboratório</button></div>
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
      ? `<div><strong>${icon('check')} Aula concluída · +${SYSTEM.lessonCP} CP para a turma</strong><p>${chapterReady ? `Todas as aulas do mês prontas: o Exame Especial contra ${esc(CAST[chapter.rival].name)} está liberado.` : 'O desafio bônus continua valendo Mérito extra.'}</p></div>
         ${chapterReady ? `<a class="btn gold" href="#prova/${chapter.rival}">${icon('sword')}Ir para o exame</a>` : next && chapterUnlocked(next.chapter) ? `<a class="btn gold" href="#aula/${next.id}">Próxima aula${icon('arrow')}</a>` : `<a class="btn gold" href="#missoes">Ver missões${icon('arrow')}</a>`}`
      : `<div><strong>Para concluir a aula</strong><p>Falta ${need.join(' e ')}. Concluir vale +${POINTS.lesson} de Mérito e +${SYSTEM.lessonCP} Pontos de Classe.</p></div>`;
  };

  const afterProgress = (previous) => {
    if (tryCompleteLesson(data)) {
      award(POINTS.lesson, `aula concluída · +${SYSTEM.lessonCP} CP para a turma`);
      if (chapterLessonsDone(chapter) && !duelFaced(chapter)) setTimeout(() => toast(`Exame Especial liberado: ${CAST[chapter.rival].full} está esperando.`, 'gold'), 3400);
    }
    renderScore();
    renderFinish();
    celebrate(previous);
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
        const previous = snapshot();
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
        afterProgress(previous);
      },
    });
    $('#hint-btn').onclick = () => { const el = $('#hint'); el.hidden = !el.hidden; };
    $('#ask-btn').onclick = () => { if ($('#tutor').hidden) $('#kurisu-btn').click(); };
    $('#solution-btn').onclick = async () => {
      const entry = state.ex[exercise.id] ||= { tries: 0 };
      const el = $('#solution');
      if (!el.hidden) { el.hidden = true; return; }
      if (!entry.passed && !entry.half && !entry.paid) {
        // Tudo se compra com pontos: um gabarito da Galeria evita o corte de Mérito.
        if (state.items.gabarito > 0 && await ask(`Usar um Gabarito comentado? Você tem ${state.items.gabarito}. O Mérito deste exercício continua inteiro.`, { ok: 'Usar gabarito', cancel: 'Agora não', title: 'Galeria' })) {
          useItem('gabarito');
          entry.paid = true;
          save();
          toast('Gabarito comentado usado. Mérito preservado.');
        } else {
          if (!await ask('Ver a solução reduz pela metade o Mérito deste exercício. Na Galeria, um Gabarito comentado evita o corte.', { ok: 'Mostrar mesmo assim', title: 'Ver solução' })) return;
          entry.half = true;
          save();
        }
      }
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
            const previous = snapshot();
            state.quiz[key] = true;
            save();
            award(POINTS.quiz, 'pergunta respondida');
            afterProgress(previous);
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

// =============================== EXAME ESPECIAL ===============================
export async function duel(main, rivalId) {
  const chapter = chapterByRival(rivalId);
  if (!chapter) return go('#missoes');
  if (!duelUnlocked(chapter)) { toast('Conclua as aulas do capítulo para liberar este exame.'); return go('#missoes'); }
  const spec = chapter.duel;
  const rival = CAST[rivalId];
  const already = state.duels[rivalId];
  const rematch = !!already;
  let alive = true;
  cleanup = () => { alive = false; };

  main.innerHTML = '<section class="page"><p class="eyebrow">PRÉDIO DE EXAMES</p></section>';
  const picked = await playScene(preDuel(chapter, rematch));
  if (!alive) return;

  let total = spec.seconds + duelBonusSeconds();
  let elapsed = 0;
  let rivalDone = false;
  let finished = false;
  let tauntIndex = -1;
  const hasPista = state.items.pista > 0;

  main.innerHTML = `
  <section class="duel" style="--glow:${rival.color}">
    <div class="duel-scene" id="duel-scene"></div>
    <div class="duel-ui">
      <header class="versus reveal">
        <div class="fighter you"><span class="mate-face">${avatar('voce')}</span><div><small>TURMA ${playerLetter()} · D-40</small><strong>${esc(state.name || 'Você')}</strong></div></div>
        <div class="clock"><small>${rematch ? 'REVANCHE' : 'EXAME ESPECIAL'}</small><strong id="clock">0:00</strong></div>
        <div class="fighter rival"><div><small>${esc(rival.tag || rival.role)}</small><strong>${esc(rival.full)}</strong></div><span class="mate-face">${avatar(rivalId, 'smirk')}</span></div>
        <div class="race"><span id="race-bar"></span><i id="race-label">${esc(rival.name)}: 0%</i></div>
        <p class="taunt" id="taunt" hidden></p>
      </header>
      <div class="duel-grid">
        <article class="duel-task reveal" style="--d:1">
          <p class="eyebrow">${icon('sword')} O DESAFIO</p>
          <h1>${esc(spec.title)}</h1>
          ${prose(spec.task)}
          <div class="ex-help">
            <button type="button" class="link" id="duel-hint">${icon('bulb')}${hasPista ? `Usar Pista limpa (você tem ${state.items.pista})` : 'Pedir pista (o adversário avança 45 s)'}</button>
            <button type="button" class="link" id="duel-minute" ${state.items.minuto > 0 ? '' : 'hidden'}>${icon('clock')}Usar Minuto extra (você tem ${state.items.minuto})</button>
            <button type="button" class="link" id="duel-quit">${icon('back')}Abandonar o exame</button>
          </div>
          <div class="hint" id="hint" hidden>${fmt(spec.hint)}</div>
        </article>
        <div class="reveal" style="--d:2"><div id="bench"></div></div>
      </div>
    </div>
  </section>`;
  mountScene($('#duel-scene'), rivalId === 'helena' ? 'council' : 'arena');

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
    key: `duel-${rivalId}`, starter: spec.starter, filename: `exame_${rivalId}.py`, verifyLabel: 'Entregar',
    cases: () => casesOf(spec),
    onVerify: async ({ passed }) => {
      if (!passed || finished) return;
      finished = true;
      clearInterval(timer);
      const won = !rivalDone;
      const previous = snapshot();
      const firstWin = won && already?.result !== 'win';
      const firstTime = !already;
      if (firstTime) state.duels[rivalId] = { result: won ? 'win' : 'honra', bet: picked.bet ? (won ? 1 : -1) : 0 };
      else if (won) state.duels[rivalId].result = 'win';
      save();
      await sleep(900);
      if (!alive) return;
      await playScene(postDuel(chapter, won, firstWin));
      await celebrate(previous);
      if (!chapters[chapter.n] && (firstTime || (firstWin && rank() === 1))) await playScene(ending(rank() === 1));
      // De volta ao quadro de missões, o mês vira: depósito do dia 1º e abertura do próximo capítulo.
      go('#missoes');
    },
  });
  $('#duel-hint').onclick = () => {
    const el = $('#hint');
    if (!el.hidden) return;
    el.hidden = false;
    $('#duel-hint').disabled = true;
    if (hasPista && useItem('pista')) { toast('Pista limpa usada: o adversário não ganhou tempo.'); return; }
    if (!rivalDone) { elapsed = Math.min(total, elapsed + 45); tick(); }
  };
  $('#duel-minute').onclick = () => {
    if (rivalDone || finished || !useItem('minuto')) return;
    total += 60;
    $('#duel-minute').disabled = true;
    toast('Minuto extra: a entrega do adversário atrasou 60 segundos.', 'gold');
    tick();
  };
  $('#duel-quit').onclick = async () => { if (await ask('Abandonar o exame? Nada será registrado e você pode voltar depois.', { ok: 'Abandonar', title: 'Exame Especial', danger: true })) go('#missoes'); };
  setTutorContext(() => {
    const snap = bench.snapshot();
    return { mode: 'duelo', lesson: `Exame Especial contra ${rival.full}`, exercise: spec.title, task: spec.task, code: snap.code, output: snap.output, error: snap.error };
  });
}

// =============================== CONSELHO ESTUDANTIL ===============================
const COUNCIL_TABS = [['classes', 'Classes'], ['individual', 'Ranking individual'], ['anuario', 'Anuário']];

function leadersOf(home) {
  const [a, b] = studentsOf(home).sort((x, y) => CAST[y].merit - CAST[x].merit);
  return `${CAST[a].name} e ${CAST[b].name}`;
}

function profile(id) {
  const rows = ranking();
  const row = rows.find((item) => item.id === id);
  const you = id === 'voce';
  const cast = you ? { full: state.name || 'Você', tag: 'Matrícula D-40', bio: 'Chegou no segundo mês do ano letivo, para ocupar a vaga do primeiro expulso. Nunca tinha escrito uma linha de código.', quote: '(Ainda dá tempo de subir.)', color: '#f5f2ea', home: 'd' } : CAST[id];
  const level = you ? 0 : bond(id);
  const el = $('#profile');
  el.style.setProperty('--glow', cast.color);
  el.innerHTML = `<div class="profile-card" role="dialog" aria-label="Ficha de ${esc(cast.full)}">
    <button type="button" class="icon-btn profile-close" aria-label="Fechar ficha">${icon('x')}</button>
    <div class="profile-art">${portrait(id, you ? 'neutral' : 'smile')}</div>
    <div class="profile-body">
      <p class="eyebrow">${chip(cast.home)} TURMA ${letterOf(cast.home)} · ${ordinal(row.rank)} LUGAR</p>
      <h2>${esc(cast.full)}</h2>
      <p class="profile-tag">${esc(cast.tag)} · ${num(row.merit)} de Mérito</p>
      <p>${esc(cast.bio)}</p>
      <blockquote id="profile-quote">“${esc(cast.quote)}”</blockquote>
      ${you ? '' : `<div class="profile-bond"><span>VÍNCULO</span>${stars(level)}<small>${BOND_WORDS[level]}</small></div>
      <div class="profile-actions"><button type="button" class="btn ghost" id="profile-talk">${icon('chat')}Conversar</button>
      ${BONDS[id] ? `<button type="button" class="btn gold" id="profile-hang" ${slots()[BONDS[id].when] && !bondBlocked(id) ? '' : 'disabled'}>${icon('heart')}Passar ${BONDS[id].when === 'aft' ? 'a tarde' : 'a noite'} junto</button>` : ''}</div>
      ${BONDS[id] ? `<div class="profile-arcana">${arcanaCard(id)}</div>` : ''}`}
    </div></div>`;
  el.hidden = false;
  const close = () => { el.hidden = true; };
  el.onclick = (event) => { if (event.target === el || event.target.closest('.profile-close')) close(); };
  const hang = $('#profile-hang');
  if (hang) hang.onclick = async () => { el.hidden = true; if (await hangout(id, BONDS[id].when)) profile(id); };
  const talk = $('#profile-talk');
  if (talk) talk.onclick = () => {
    const [step] = hubTalk(id);
    $('#profile-quote').textContent = `“${step.text}”`;
    $('.profile-art', el).innerHTML = portrait(id, step.expr);
    $('.profile-bond', el).innerHTML = `<span>VÍNCULO</span>${stars(bond(id))}<small>${BOND_WORDS[bond(id)]}</small>`;
    sfx.play('click');
  };
}

export function rankingScreen(main, tabName) {
  const tab = COUNCIL_TABS.some(([id]) => id === tabName) ? tabName : 'classes';
  const rows = ranking();
  const board = classBoard();
  const top = Math.max(...rows.map((row) => row.merit), 1);
  const topCP = Math.max(...board.map((row) => row.cp), 1);
  const me = rows.find((row) => row.you);

  const classesTab = () => `
    <ol class="sboard">
      ${board.map((row, index) => `<li class="sboard-row reveal ${row.you ? 'you' : ''}" style="--d:${index + 1};--glow:${row.color}">
        <b class="sboard-letter">${row.letter}</b>
        <span class="sboard-name"><strong>Turma ${row.letter}${row.you ? ' · a sua turma' : ''}</strong><small>${row.you ? `Começou maio com zero. ${row.letter === 'D' ? CLASS_MOTTO.d : 'Não é mais a turma dos defeituosos.'}` : `Turma de ${leadersOf(row.home)}. ${CLASS_MOTTO[row.home]}`}</small></span>
        <span class="sboard-bar"><i style="--w:${Math.max(1.5, (row.cp / topCP) * 100)}%"></i></span>
        <span class="sboard-cp"><b data-count="${row.cp}">0</b><small>CP</small></span>
        <span class="sboard-pp">${num(row.cp * SYSTEM.ppPerCP)} pp<small>por aluno / mês</small></span>
      </li>`).join('')}
    </ol>
    <div class="rules reveal" style="--d:6">
      <article><b>01</b><h3>Pontos de Classe</h3><p>Sobem com aulas concluídas (<strong>+${SYSTEM.lessonCP}</strong>) e Exames Especiais (<strong>+${SYSTEM.examWinCP}</strong> para quem vence, <strong>−${SYSTEM.examStealCP}</strong> para a turma derrotada).</p></article>
      <article><b>02</b><h3>Depósito mensal</h3><p>No dia 1º, cada aluno recebe os Pontos de Classe da turma × ${SYSTEM.ppPerCP} em pontos privados. Com eles se compra tudo na Galeria.</p></article>
      <article><b>03</b><h3>Troca de letras</h3><p>As turmas são ordenadas pelos pontos. Quem ultrapassa a turma de cima fica com a letra dela. Só a Turma A se forma com privilégios.</p></article>
      <article><b>04</b><h3>Expulsão</h3><p>O Mérito individual é público. No fim do ano, o último lugar do ranking é expulso. Sem recurso.</p></article>
    </div>`;

  const individualTab = () => `
    <div class="filters" id="filters">${[['', 'Todas'], ...board.map((row) => [row.home, `Turma ${row.letter}`])].map(([home, label], i) => `<button type="button" class="filter ${i === 0 ? 'active' : ''}" data-home="${home}">${label}</button>`).join('')}
      <button type="button" class="filter jump" id="jump-me">${icon('arrow')}Minha posição (${ordinal(me.rank)})</button></div>
    <ol class="board">
      ${rows.map((row, index) => `<li class="board-row reveal ${row.you ? 'you' : ''}" data-home="${row.home}" data-student="${row.id}" style="--d:${Math.min(index, 12)};--glow:${row.color}">
        <span class="board-rank">${row.rank}</span>
        <span class="mate-face">${avatar(row.id)}</span>
        <span class="board-name"><strong>${esc(row.name)}</strong><small>${chip(row.home)} ${row.you ? 'Matrícula D-40 · você' : esc(CAST[row.id].tag)}${!row.you && state.duels[row.id]?.result === 'win' ? ' · derrotado por você' : ''}</small></span>
        <span class="board-bar"><i style="--w:${(row.merit / top) * 100}%"></i></span>
        <span class="board-merit" data-count="${row.merit}">0</span>
      </li>`).join('')}
    </ol>
    <p class="fine">No fim do ano letivo, quem estiver em ${ordinal(rows.length)} lugar é expulso. Seus colegas de turma ganham Mérito quando você conclui aulas: é o grupo de estudos funcionando.</p>`;

  const yearbookTab = () => board.map((row, index) => `
    <section class="klass reveal" style="--d:${index + 1};--glow:${row.color}">
      <header class="klass-head"><b>${row.letter}</b><div><h2>Turma ${row.letter}${row.you ? ' · a sua turma' : ''}</h2><p>${row.you && row.letter !== 'D' ? 'A turma que começou o ano com zero.' : CLASS_MOTTO[row.home]} · ${num(row.cp)} CP</p><p class="klass-lore">${esc(CLASS_LORE[row.home])}</p></div></header>
      <div class="students">
        ${[...studentsOf(row.home), ...(row.you ? ['voce'] : [])].map((id) => {
    const entry = rows.find((item) => item.id === id);
    const cast = id === 'voce' ? { name: state.name || 'Você', tag: 'Matrícula D-40' } : CAST[id];
    return `<button type="button" class="student ${id === 'voce' ? 'you' : ''}" data-student="${id}">
          <span class="student-face">${avatar(id)}</span>
          <strong>${esc(cast.name)}</strong><small>${esc(cast.tag)}</small>
          <span class="student-meta"><b>${ordinal(entry.rank)}</b>${id === 'voce' ? '' : stars(bond(id))}</span>
        </button>`;
  }).join('')}
      </div>
    </section>`).join('');

  main.innerHTML = `
  <section class="page ${tab === 'anuario' ? '' : 'narrow'}">
    <header class="page-head reveal"><p class="eyebrow">CONSELHO ESTUDANTIL · TELÃO DO SISTEMA S</p><h1>${{ classes: 'Ranking de classes', individual: 'Ranking de Mérito', anuario: 'Anuário do 1º ano' }[tab]}</h1>
      <p>${{ classes: 'Quatro turmas, um placar. Atualizado em tempo real — e visível para o campus inteiro.', individual: `Os ${rows.length} alunos do 1º ano com ficha no Conselho, do topo ao último lugar.`, anuario: 'Cento e sessenta alunos no 1º ano; estes são os que têm ficha no Conselho. Toque em alguém para abrir a ficha, conversar ou passar tempo junto.' }[tab]}</p></header>
    <nav class="subtabs reveal" aria-label="Seções do Conselho">${COUNCIL_TABS.map(([id, label]) => `<a href="#conselho/${id}" class="${id === tab ? 'active' : ''}" ${id === tab ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    ${{ classes: classesTab, individual: individualTab, anuario: yearbookTab }[tab]()}
    <div class="profile" id="profile" hidden></div>
  </section>`;

  $$('[data-count]', main).forEach((el) => countUp(el, Number(el.dataset.count), 1100));
  if (tab === 'individual') {
    $('#filters').onclick = (event) => {
      const button = event.target.closest('[data-home]');
      if (!button) return;
      $$('.filter', main).forEach((el) => el.classList.toggle('active', el === button));
      $$('.board-row', main).forEach((el) => { el.hidden = !!button.dataset.home && el.dataset.home !== button.dataset.home; });
    };
    $('#jump-me').onclick = () => $('.board-row.you', main)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $$('[data-student]', main).forEach((el) => { el.onclick = () => profile(el.dataset.student); });
  setTutorContext(() => ({ mode: 'conselho estudantil (ranking de classes e de alunos)' }));
}

// =============================== GALERIA ===============================
export function shop(main) {
  const paint = () => {
    const off = shopDiscount();
    const deposits = chapters.filter((chapter) => state.deposits[chapter.id] !== undefined);
    main.innerHTML = `
    <section class="page">
      <header class="page-head reveal"><p class="eyebrow">GALERIA JACARANDÁ</p><h1>Tudo se compra com pontos.</h1>
        <p>Pontos privados caem no dia 1º de cada mês: os Pontos de Classe da sua turma × ${SYSTEM.ppPerCP}. Turma melhor, depósito maior.${off ? ` A Lara conseguiu <strong>${Math.round(off * 100)}% de desconto</strong> para você.` : ''} Bicos na Galeria também rendem pontos.</p></header>
      <div class="wallet reveal" style="--d:1"><span>${icon('coin')}SALDO</span><b>${num(state.pp)}</b><small>pp</small>
        <span class="wallet-items">${[['gabarito', 'Gabaritos'], ['pista', 'Pistas limpas'], ['minuto', 'Minutos extras']].map(([id, label]) => `<i>${label}: <strong>${state.items[id]}</strong></i>`).join('')}</span></div>
      <div class="shop">
        ${SHOP.map((item, index) => {
    const price = item.kind === 'locked' ? item.price : Math.round(item.price * (1 - off));
    const owned = item.kind === 'theme' && state.themes.includes(item.theme);
    const using = owned && state.theme === item.theme;
    const missing = price - state.pp;
    let action;
    if (item.kind === 'locked') action = `<button type="button" class="btn ghost" disabled>${icon('lock')}Faltam ${num(missing)} pp</button>`;
    else if (owned) action = `<button type="button" class="btn ghost" data-theme="${using ? '' : item.theme}">${using ? 'Voltar ao padrão' : 'Usar este tema'}</button>`;
    else if (missing > 0) action = `<button type="button" class="btn ghost" disabled>Faltam ${num(missing)} pp</button>`;
    else action = `<button type="button" class="btn gold" data-buy="${item.id}">Comprar</button>`;
    return `<article class="item reveal ${item.kind}" style="--d:${index + 2}">
          <span class="item-ic">${icon(item.ic)}</span>
          <h2>${esc(item.name)}</h2><p>${esc(item.text)}</p>
          <div class="item-foot"><b>${price < item.price ? `<s>${num(item.price)}</s> ` : ''}${num(price)} <small>pp</small></b>${owned ? `<em>${using ? 'em uso' : 'comprado'}</em>` : item.kind === 'token' && state.items[item.id] ? `<em>você tem ${state.items[item.id]}</em>` : ''}${action}</div>
        </article>`;
  }).join('')}
      </div>
      <div class="statement reveal" style="--d:9"><p class="eyebrow">EXTRATO</p>
        ${deposits.length ? `<ul>${deposits.map((chapter) => `<li><span>Dia 1º de ${MONTHS[chapter.n - 1].toLowerCase()} · depósito mensal</span><b>+${num(state.deposits[chapter.id])} pp</b></li>`).join('')}</ul>` : '<p class="fine">Nenhum depósito ainda. A Turma D começou maio com zero Pontos de Classe — o primeiro depósito cai quando o mês virar, depois do exame do capítulo 1.</p>'}
      </div>
    </section>`;
    $$('[data-buy]', main).forEach((button) => { button.onclick = () => {
      const item = SHOP.find((entry) => entry.id === button.dataset.buy);
      const off2 = shopDiscount();
      if (!buy(item.id, off2)) return;
      sfx.play('merit');
      toast(`${item.name} comprado por ${num(Math.round(item.price * (1 - off2)))} pp.`, 'gold');
      paint();
    }; });
    $$('[data-theme]', main).forEach((button) => { button.onclick = () => { state.theme = button.dataset.theme; save(); paint(); }; });
  };
  paint();
  setTutorContext(() => ({ mode: 'galeria do campus (loja de pontos privados)' }));
}

// =============================== DORMITÓRIO ===============================
export function dorm(main) {
  const t = totals();
  const me = ranking().find((row) => row.you);
  const cal = calendar();
  main.innerHTML = `
  <section class="page narrow">
    <header class="page-head reveal"><p class="eyebrow">DORMITÓRIO · QUARTO 404-D</p><h1>Seu canto no campus.</h1><p>ID estudantil, estatísticas do ano e ajustes do jogo.</p></header>
    <div class="idcard reveal" style="--d:1">
      <div class="idcard-photo">${avatar('voce')}</div>
      <div class="idcard-body">
        <small>ACADEMIA PYRA · ID ESTUDANTIL</small>
        <strong>${esc(state.name || 'Sem nome')}</strong>
        <dl><div><dt>Matrícula</dt><dd>D-40</dd></div><div><dt>Turma</dt><dd>${playerLetter()}</dd></div><div><dt>Ranking</dt><dd>${ordinal(me.rank)} / ${t.students}</dd></div><div><dt>Mérito</dt><dd>${num(me.merit)}</dd></div><div><dt>Saldo</dt><dd>${num(state.pp)} pp</dd></div><div><dt>Data</dt><dd>${cal.day} de ${cal.month.toLowerCase()}</dd></div></dl>
      </div>
      <span class="idcard-code" aria-hidden="true"></span>
    </div>
    <div class="stats reveal" style="--d:2">
      <div><strong>${t.lessonsDone}<small>/${t.lessons}</small></strong><span>aulas concluídas</span></div>
      <div><strong>${t.exercisesDone}<small>/${t.exercises}</small></strong><span>exercícios resolvidos</span></div>
      <div><strong>${t.duelsWon}<small>/${chapters.length}</small></strong><span>exames vencidos</span></div>
    </div>
    <div class="settings reveal" style="--d:3">
      <p class="eyebrow">${icon('users')} FOTO DO ID</p>
      <div class="look-row" id="looks">${PLAYER_LOOKS.map((_, i) => `<button type="button" class="look ${i === state.look ? 'on' : ''}" data-look="${i}" aria-label="Aparência ${i + 1}">${lookAvatar(i)}</button>`).join('')}</div>
    </div>
    <div class="settings reveal" style="--d:4">
      <p class="eyebrow">${icon('gear')} AJUSTES</p>
      <label class="switch"><input type="checkbox" id="gfx-3d" ${state.graphics === '2d' ? '' : 'checked'}><span>Campus e diálogos em 3D (desligue se o jogo estiver lento)</span></label>
      <label class="switch"><input type="checkbox" id="free-mode" ${state.freeMode ? 'checked' : ''}><span>Modo livre: abrir todos os capítulos e exames agora</span></label>
      <div class="settings-row"><button type="button" class="btn ghost" id="replay-intro">Rever o prólogo</button><button type="button" class="btn ghost danger" id="reset-all">Apagar progresso e recomeçar</button></div>
      <p class="fine">O progresso fica salvo apenas neste navegador.</p>
      <p class="fine">Escola, alunos e história são originais. Kurisu (Steins;Gate) e Monika (Doki Doki Literature Club) aparecem como homenagem de fã, com retratos desenhados para este jogo.</p>
    </div>
  </section>`;
  $('#looks').onclick = (event) => {
    const button = event.target.closest('[data-look]');
    if (!button) return;
    state.look = Number(button.dataset.look);
    setPlayerLook(state.look);
    save();
    sfx.play('click');
    dorm(main);
  };
  $('#gfx-3d').onchange = (event) => { state.graphics = event.target.checked ? '3d' : '2d'; save(); toast(event.target.checked ? 'Modo 3D ligado.' : 'Modo 2D: campus em lista e diálogos com retratos.'); };
  $('#free-mode').onchange = (event) => { state.freeMode = event.target.checked; save(); toast(state.freeMode ? 'Modo livre ativado: tudo aberto.' : 'Modo livre desativado.'); };
  $('#reset-all').onclick = async () => { if (await ask('Apagar todo o progresso, o nome e os rascunhos de código? Isso não pode ser desfeito.', { ok: 'Apagar tudo', title: 'Recomeçar', danger: true })) resetAll(); };
  // Rever a cena não repete perguntas nem bônus de Mérito.
  $('#replay-intro').onclick = () => playScene(prologue().filter((step) => !step.ask).map((step) => (step.choice ? { choice: step.choice.map(({ merit: _merit, set: _set, ...option }) => option) } : step)));
  setTutorContext(() => ({ mode: 'dormitório (ajustes)' }));
}

// =============================== SALA DE INFORMÁTICA ===============================
const LAB_STARTER = `# Laboratório livre: escreva, rode, quebre e conserte.
# Aqui o input() funciona de verdade: digite a resposta no terminal.

nome = input("Como devo chamar você? ")
print(f"Olá, {nome}! O laboratório é todo seu.")
`;

export function lab(main, gameId) {
  main.innerHTML = `
  <section class="page wide">
    <header class="page-head reveal"><p class="eyebrow">SALA DE INFORMÁTICA · LABORATÓRIO LIVRE</p><h1>Experimente sem medo.</h1><p>Python de verdade rodando no seu navegador. Nada aqui vale nota: é o lugar de testar ideias e desmontar jogos para ver como funcionam.</p></header>
    <div class="lab-grid">
      <div class="reveal" style="--d:1"><div id="bench"></div></div>
      <aside class="arcade reveal" style="--d:2">
        <div class="club-box">
          <div class="club-head"><span class="mate-face" style="--glow:${CAST.monika.color}">${avatar('monika', 'smile')}</span><div><p class="eyebrow">${icon('star')} CLUBE DE CÓDIGO CRIATIVO</p><p class="fine">A Monika abre o projeto aqui no editor e te guia passo a passo pelo painel.</p></div></div>
          ${CREATIVE.map((p) => `<button type="button" class="game club" data-project="${p.id}"><strong>${esc(p.title)}</strong><small>${esc(p.level)}</small><span>${esc(p.text)}</span></button>`).join('')}
        </div>
        <p class="eyebrow">${icon('gamepad')} ARCADE — JOGOS EM PYTHON</p>
        <p class="fine">Carregue um jogo, jogue no terminal e depois encare o desafio de modificá-lo.</p>
        ${arcade.map((game) => `<button type="button" class="game" data-game="${game.id}"><strong>${esc(game.title)}</strong><small>${esc(game.tag)} · ${esc(game.level)}</small><span>${esc(game.text)}</span></button>`).join('')}
      </aside>
    </div>
  </section>`;
  const bench = createWorkbench($('#bench'), { key: 'lab', starter: LAB_STARTER, filename: 'laboratorio.py', interactive: true });
  const loadGame = async (id, confirmFirst) => {
    const game = arcade.find((item) => item.id === id);
    if (!game) return;
    const code = bench.getCode();
    if (confirmFirst && code.trim() && code !== LAB_STARTER && !arcade.some((item) => item.code === code) && !await ask(`Carregar “${game.title}” substitui o código que está no editor.`, { ok: 'Carregar jogo', title: 'Arcade' })) return;
    bench.setCode(game.code);
    $$('.game', main).forEach((el) => el.classList.toggle('active', el.dataset.game === id));
    toast(`${game.title} carregado. Clique em Executar e jogue no terminal.`);
    $('#bench').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $$('.game[data-game]', main).forEach((button) => { button.onclick = () => loadGame(button.dataset.game, true); });
  $$('[data-project]', main).forEach((button) => { button.onclick = async () => {
    const code = bench.getCode();
    if (code.trim() && code !== LAB_STARTER && !arcade.some((item) => item.code === code) && !CREATIVE.some((item) => item.code === code)
      && !await ask('Abrir o projeto substitui o código que está no editor.', { ok: 'Abrir projeto', title: 'Clube de Código Criativo' })) return;
    if (!state.flags.metMonika) $('#monika-btn').click();
    else if ($('#tutor').hidden || currentTutor() !== 'monika') toggleTutor(true, 'monika');
    openProject(button.dataset.project);
  }; });
  if (gameId) loadGame(gameId, false);
  setTutorContext(() => { const snap = bench.snapshot(); return { mode: 'laboratório livre (clube: pode mostrar código completo)', code: snap.code, output: snap.output, error: snap.error }; });
}

// =============================== BIBLIOTECA ===============================
const LIBRARY_TABS = [['guia', 'Guia de Python'], ['regulamento', 'Regulamento'], ['arquivos', 'Arquivos']];
export function guide(main, tabName) {
  const tab = LIBRARY_TABS.some(([id]) => id === tabName) ? tabName : 'guia';
  const p = loreProgress();
  const head = {
    guia: ['BIBLIOTECA · GUIA DE CONSULTA', 'Tudo o que você já viu, em uma página.'],
    regulamento: ['BIBLIOTECA · REGULAMENTO INTERNO', 'Dezoito artigos. A maioria leu cinco.'],
    arquivos: ['BIBLIOTECA · ARQUIVOS', 'O que a escola não conta no primeiro dia.'],
  }[tab];
  main.innerHTML = `
  <section class="page">
    <header class="page-head reveal"><p class="eyebrow">${head[0]}</p><h1>${head[1]}</h1>
      ${tab === 'guia' ? '<label class="search"><span class="sr-only">Buscar no guia</span><input type="search" id="guide-search" placeholder="Buscar: lista, while, f-string, try…" autocomplete="off"></label>' : ''}
      ${tab === 'regulamento' ? `<p>${esc(SCHOOL.name)}. Fundado em ${SCHOOL.founded}. ${SCHOOL.students} alunos em três anos, ${SCHOOL.perClass} por turma.</p>` : ''}
      ${tab === 'arquivos' ? `<p>Fragmentos encontrados ao longo do ano: atas, fichas, relatórios. Alguns só se abrem quando alguém confia em você. ${FILES.filter((f) => f.unlock(p)).length} de ${FILES.length} abertos.</p>` : ''}</header>
    <nav class="subtabs reveal" aria-label="Seções da biblioteca">${LIBRARY_TABS.map(([id, label]) => `<a href="#guia/${id}" class="${id === tab ? 'active' : ''}">${label}</a>`).join('')}</nav>
    ${tab === 'guia' ? '<div class="cards" id="guide-cards"></div>' : ''}
    ${tab === 'regulamento' ? `<ol class="rules-list">${RULES.map((rule, i) => `<li class="rule reveal" style="--d:${Math.min(i, 10)}"><b>Art. ${rule.n}</b><div><h2>${esc(rule.title)}</h2><p>${esc(rule.text)}</p></div></li>`).join('')}</ol>` : ''}
    ${tab === 'arquivos' ? `<div class="files">${FILES.map((file, i) => {
    const open = file.unlock(p);
    return `<article class="file reveal ${open ? '' : 'sealed'}" style="--d:${Math.min(i, 10)}"><small>${esc(file.tag)}</small><h2>${open ? esc(file.title) : 'Arquivo lacrado'}</h2>
        <p>${open ? esc(file.text) : `${icon('lock')} ${esc(file.hint)}`}</p></article>`;
  }).join('')}</div>` : ''}
  </section>`;
  if (tab === 'guia') {
    const paint = (term) => {
      const q = term.trim().toLowerCase();
      const found = codex.filter((entry) => !q || [entry.term, entry.category, entry.text, entry.code, ...entry.keys].join(' ').toLowerCase().includes(q));
      $('#guide-cards').innerHTML = found.length
        ? found.map((entry, index) => `<article class="card reveal" style="--d:${Math.min(index, 8)}"><small>${esc(entry.category)}</small><h2>${esc(entry.term)}</h2><p>${esc(entry.text)}</p>${codeBlock(entry.code)}</article>`).join('')
        : '<p class="empty">Nada encontrado. Tente outra palavra ou pergunte à Kurisu.</p>';
    };
    paint('');
    $('#guide-search').oninput = (event) => paint(event.target.value);
  }
  setTutorContext(() => ({ mode: `biblioteca (${tab})` }));
}
