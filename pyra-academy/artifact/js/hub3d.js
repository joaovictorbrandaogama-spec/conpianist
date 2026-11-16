// O campus em 3D é a tela principal: o mundo é montado uma vez e fica vivo atrás das outras telas.
// Por cima dele, um painel com data, período e tempo livre; conversas, encontros e atividades
// acontecem andando até as pessoas e as portas. Sem WebGL (ou no modo 2D), o campus em lista assume.
import { $, $$, esc, icon, toast, sfx } from './util.js';
import { state, save, calendar, nextObjective, chapterUnlocked, duelUnlocked, duelWon } from './state.js';
import { chapters, SYSTEM } from './content/index.js';
import { CAST, portrait, avatar } from './art/characters.js';
import { BONDS, ROMAN, MAX_RANK, bondRank, bondOpen, bondBlocked, slots, ACTIVITIES, PERIOD } from './life.js';
import { hangout, doActivity } from './agenda.js';
import { hubTalk } from './story.js';
import { go } from './nav.js';

let world = null;
let layer = null;
let building = null;
let failed = false;
let shown = false;
let slowWarned = false;
let hudRoot = null;     // painel atual (dentro de <main>)
let onRepaint = null;

export const graphicsMode = () => (state.graphics === '2d' ? '2d' : '3d');
export const hub3dWanted = () => !failed && graphicsMode() === '3d' && !sessionList;
let sessionList = false;   // "ver em lista" nesta visita
export function useListOnce(value) { sessionList = value; }

/** Período em que o campus está: o escolhido, se ainda houver tempo livre nele. */
export function currentPeriod() {
  const free = slots();
  const want = state.period === 'night' ? 'night' : 'aft';
  if (free[want] > 0) return want;
  const other = want === 'aft' ? 'night' : 'aft';
  return free[other] > 0 ? other : want;
}

// Nome de cada área, para o painel.
const AREA_NAMES = { campus: 'Pátio', escola: 'Prédio principal', dorm: 'Dormitório', galeria: 'Galeria Jacarandá' };
// Portas do pátio que levam para dentro de um prédio caminhável.
const AREA_OF = { sala: 'escola', dorm: 'dorm', galeria: 'galeria' };
let areaNow = 'campus';

function setHudHeight() {
  const hud = document.getElementById('hud');
  document.documentElement.style.setProperty('--hud-h', `${hud?.offsetHeight || 64}px`);
}

async function ensureWorld() {
  if (world || failed) return world;
  if (building) return building;
  building = (async () => {
    layer = document.createElement('div');
    layer.className = 'world3d';
    layer.innerHTML = '<div class="world3d-host"></div><canvas class="world3d-mini" width="180" height="180" aria-hidden="true"></canvas><div class="world3d-loading"><span>Montando o campus…</span></div>';
    document.body.prepend(layer);
    try {
      const { createWorld } = await import('./three/world.js');
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
      const period = currentPeriod();
      world = createWorld($('.world3d-host', layer), {
        mode: 'play', minimap: $('.world3d-mini', layer), period,
        onPrompt: (target) => prompt(target),
        onInteract: (target) => interact(target),
        onArea: (name) => { areaNow = name; const el = hudRoot && $('#h3-area', hudRoot); if (el) el.textContent = AREA_NAMES[name] || name; },
        onSlow: () => {
          if (slowWarned) return;
          slowWarned = true;
          toast('O campus 3D está lento nesta máquina. No Dormitório dá para trocar para o modo 2D.');
        },
      });
      lastPeriod = period;
      lastLook = state.look;
      $('.world3d-loading', layer)?.remove();
      return world;
    } catch (error) {
      console.warn('[campus 3d]', error);
      failed = true;
      layer?.remove();
      layer = null;
      world = null;
      return null;
    } finally {
      building = null;
    }
  })();
  return building;
}

let lastPeriod = null;
let lastLook = null;
async function applyPeriod() {
  const period = currentPeriod();
  if (!world || period === lastPeriod) return;
  lastPeriod = period;
  world.setPeriod(period);
}

/** Esconde o mundo (outra tela abriu). Ele continua montado, só pausado. */
export function hideHub3D() {
  shown = false;
  hudRoot = null;
  document.body.classList.remove('in-world', 'hub-card-open');
  if (layer) layer.hidden = true;
  world?.setPaused(true);
}

/** Mostra o campus 3D com o painel dentro de `main`. Devolve false se o 3D não estiver disponível. */
export async function showHub3D(main, { repaint, monthTurn, setTutorContext } = {}) {
  if (!hub3dWanted()) { hideHub3D(); return false; }
  onRepaint = repaint;
  shown = true;
  setHudHeight();
  document.body.classList.add('in-world');
  paintHud(main);
  if (layer) layer.hidden = false;
  const ready = await ensureWorld();
  if (!shown) return true;
  if (!ready) { document.body.classList.remove('in-world'); return false; }
  layer.hidden = false;
  if (lastLook !== state.look) { lastLook = state.look; world.setPlayerLook(); }
  await applyPeriod();
  world.setPaused(false);
  setTutorContext?.(() => ({ mode: 'campus em 3D (sem exercício aberto)' }));
  monthTurn?.(() => { if (shown) paintHud(main); });
  return true;
}

export function rebuildPlayer() { world?.setPlayerLook(); }

// ---------- painel ----------
function objectiveOf() {
  const o = nextObjective();
  if (o.type === 'lesson') return { kicker: `CAPÍTULO ${o.chapter.n} · PRÓXIMA AULA`, title: o.lesson.title, href: `#aula/${o.lesson.id}` };
  if (o.type === 'duel') return { kicker: 'EXAME ESPECIAL LIBERADO', title: `Enfrente ${CAST[o.chapter.rival].full}`, href: `#prova/${o.chapter.rival}` };
  if (o.type === 'rematch') return { kicker: 'REVANCHE DISPONÍVEL', title: CAST[o.chapter.rival].full, href: `#prova/${o.chapter.rival}` };
  if (o.type === 'bonus') return { kicker: 'DESAFIOS BÔNUS', title: o.lesson.title, href: `#aula/${o.lesson.id}` };
  return { kicker: 'ANO CONCLUÍDO', title: 'Laboratório livre', href: '#lab' };
}

function paintHud(main) {
  const cal = calendar();
  const free = slots();
  const period = currentPeriod();
  const obj = objectiveOf();
  main.innerHTML = `
  <section class="hub3d" data-period="${period}">
    <div class="h3-date">
      <b>${String(cal.day).padStart(2, '0')}</b>
      <span><strong>${cal.month.toUpperCase()}</strong><small>${cal.weekday}</small></span>
      <em>${period === 'night' ? `${icon('bed')} NOITE` : `${icon('clock')} DEPOIS DA AULA`}</em>
      <i class="h3-area" id="h3-area">${esc(AREA_NAMES[areaNow] || '')}</i>
    </div>
    <div class="h3-time">
      <span class="${period === 'aft' ? 'on' : ''}">${icon('clock')}<b>${free.aft}</b> ${free.aft === 1 ? 'tarde' : 'tardes'}</span>
      <span class="${period === 'night' ? 'on' : ''}">${icon('bed')}<b>${free.night}</b> ${free.night === 1 ? 'noite' : 'noites'}</span>
      <button type="button" class="h3-switch" id="h3-switch" ${free[period === 'aft' ? 'night' : 'aft'] ? '' : 'disabled'}>${period === 'aft' ? 'Esperar anoitecer' : 'Voltar para a tarde'}</button>
    </div>
    <a class="h3-objective" href="${obj.href}"><small>${esc(obj.kicker)}</small><strong>${esc(obj.title)}</strong>${icon('arrow')}</a>
    <div class="h3-prompt" id="h3-prompt" hidden></div>
    <div class="h3-actions">
      <button type="button" class="btn ghost" id="h3-travel">${icon('map')}Ir para…</button>
      <a class="btn ghost" href="#agenda">${icon('calendar')}Agenda</a>
      <button type="button" class="btn ghost" id="h3-list">${icon('scroll')}Campus em lista</button>
    </div>
    <p class="h3-help">WASD ou setas para andar · Shift corre · E para conversar ou entrar · toque no chão para ir até lá</p>
    <div class="h3-card" id="h3-card" hidden></div>
  </section>`;
  hudRoot = $('.hub3d', main);
  $('#h3-switch').onclick = async () => {
    state.period = period === 'aft' ? 'night' : 'aft';
    save();
    sfx.play('whoosh');
    await applyPeriod();
    toast(currentPeriod() === 'night' ? 'Anoiteceu. O pátio esvazia; o dormitório e o Laboratório 404 ficam movimentados.' : 'De volta ao fim de tarde.');
    paintHud(main);
  };
  $('#h3-travel').onclick = () => travelCard();
  $('#h3-list').onclick = () => { useListOnce(true); onRepaint?.(); };
}

function prompt(target) {
  const el = hudRoot && $('#h3-prompt', hudRoot);
  if (!el) return;
  if (!target) { el.hidden = true; return; }
  const label = target.type === 'npc' ? `Falar com ${CAST[target.id]?.name || ''}` : target.label ? target.label : `Entrar: ${PLACES[target.key]?.name || ''}`;
  el.innerHTML = `<kbd>E</kbd>${esc(label)}`;
  el.hidden = false;
  el.onclick = () => interact(target);
}

// ---------- cartões de interação ----------
function openCard(html, glow = '#f5f2ea') {
  const card = hudRoot && $('#h3-card', hudRoot);
  if (!card) return null;
  card.style.setProperty('--glow', glow);
  card.innerHTML = `<div class="h3-card-in">${html}<button type="button" class="icon-btn h3-close" aria-label="Fechar">${icon('x')}</button></div>`;
  card.hidden = false;
  document.body.classList.add('hub-card-open');
  $('.h3-close', card).onclick = closeCard;
  card.onclick = (event) => { if (event.target === card) closeCard(); };
  setTimeout(() => $('button:not(.h3-close), a', card)?.focus({ preventScroll: true }), 30);
  return card;
}
function closeCard() {
  const card = hudRoot && $('#h3-card', hudRoot);
  if (card) { card.hidden = true; card.innerHTML = ''; }
  document.body.classList.remove('hub-card-open');
}
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && document.body.classList.contains('hub-card-open')) closeCard(); });

async function afterTime(main) {
  await applyPeriod();
  if (shown && main) paintHud(main);
}

function personCard(id) {
  const cast = CAST[id];
  const [step] = hubTalk(id);
  const bond = BONDS[id];
  const period = currentPeriod();
  const free = slots();
  let hang = '';
  if (bond && bondOpen(id)) {
    const blocked = bondBlocked(id);
    const right = bond.when === period;
    const can = right && free[period] > 0 && !blocked;
    const why = blocked ? `Precisa de ${blocked.name} ${blocked.level}` : !right ? (bond.when === 'night' ? 'Só à noite' : 'Só depois da aula') : !free[period] ? 'Sem tempo livre agora' : `Gasta ${period === 'aft' ? 'uma tarde' : 'uma noite'}`;
    hang = `<button type="button" class="btn gold" data-hang ${can ? '' : 'disabled'}>${icon('heart')}Passar ${period === 'aft' ? 'a tarde' : 'a noite'} junto<small>${esc(why)}</small></button>`;
  }
  const card = openCard(`
    <div class="h3-person">
      <div class="h3-portrait">${portrait(id, step?.expr || 'neutral')}</div>
      <div class="h3-talk">
        <p class="eyebrow">${bond ? `ARCANO ${ROMAN[bond.n]} · ${esc(bond.arcana.toUpperCase())} · NÍVEL ${bondRank(id)}/${MAX_RANK}` : esc((cast.tag || cast.role || '').toUpperCase())}</p>
        <h2>${esc(cast.full)}</h2>
        <p class="h3-line">${esc(step?.text || cast.quote || '…')}</p>
        <div class="h3-buttons"><button type="button" class="btn ghost" data-again>${icon('chat')}Conversar</button>${hang}${TUTOR_IDS.includes(id) ? `<button type="button" class="btn gold" data-tutor-open="${id}">${icon(id === 'monika' ? 'star' : 'flask')}${id === 'monika' ? 'Projetos do clube' : 'Tirar uma dúvida'}<small>Abre a conversa com ${esc(cast.name)}</small></button>` : ''}</div>
      </div>
    </div>`, cast.color);
  if (!card) return;
  sfx.play('click');
  $('[data-again]', card).onclick = () => personCard(id);
  const tutorBtn = $('[data-tutor-open]', card);
  if (tutorBtn) tutorBtn.onclick = () => { closeCard(); $(id === 'monika' ? '#monika-btn' : '#kurisu-btn').click(); };
  const hangBtn = $('[data-hang]', card);
  if (hangBtn) hangBtn.onclick = async () => {
    closeCard();
    const main = document.getElementById('main');
    if (await hangout(id, period)) await afterTime(main);
  };
}

const ACT = (id) => ACTIVITIES.find((a) => a.id === id);
const TUTOR_IDS = ['kurisu', 'monika'];
const PLACES = {
  sala: { name: 'Prédio principal', text: 'Sala da Turma D e, no fim do corredor, o Clube de Código Criativo.', links: [['scroll', 'Quadro de missões e aulas', '#missoes'], ['star', 'Clube de Código Criativo (Monika)', 'monika']], acts: ['reforco', 'xadrez'] },
  exames: { name: 'Prédio de Exames', text: 'Onde os Exames Especiais acontecem. O telão do saguão mostra o próximo.', links: [], acts: [] },
  conselho: { name: 'Conselho Estudantil', text: 'O telão do Sistema S, o ranking e o anuário.', links: [['trophy', 'Telão do Sistema S', '#conselho']], acts: ['debate'] },
  info: { name: 'Sala de Informática', text: 'Laboratório livre e o Arcade de jogos em Python.', links: [['gamepad', 'Laboratório livre', '#lab']], acts: [] },
  biblio: { name: 'Biblioteca', text: 'A Dona Zilá vigia o silêncio. Guia de Python, regulamento e arquivos.', links: [['book', 'Guia, regulamento e arquivos', '#guia']], acts: ['biblioteca'] },
  lab404: { name: 'Laboratório 404', text: 'A porta diz «Não perturbe (sério)».', links: [], acts: [] },
  galeria: { name: 'Galeria Jacarandá', text: 'Lojas, lanchonete e a prateleira de itens gratuitos.', links: [['bag', 'Lojas da Galeria', '#loja']], acts: ['bico'] },
  dorm: { name: 'Dormitório', text: 'Quarto 404-D. ID estudantil, ajustes e as noites de estudo.', links: [['bed', 'Seu quarto: ID e ajustes', '#dorm']], acts: ['quarto', 'livro', 'dormir'] },
  portao: { name: 'Portão principal', text: 'Ninguém sai da ilha. Mas dá para correr em volta dela.', links: [], acts: ['corrida'] },
};

// Pontos de interação dentro dos prédios.
function nextLessonLink() {
  const o = nextObjective();
  if (o.type === 'lesson' || o.type === 'bonus') return ['scroll', `Próxima aula: ${o.lesson.title}`, `#aula/${o.lesson.id}`];
  if (o.type === 'duel' || o.type === 'rematch') return ['sword', `Exame Especial: ${CAST[o.chapter.rival].full}`, `#prova/${o.chapter.rival}`];
  return ['gamepad', 'Laboratório livre', '#lab'];
}
const SPOTS = {
  escola: {
    quadro: () => ({ name: 'Quadro de missões', text: 'As aulas do mês, uma embaixo da outra. Quem conclui todas libera o Exame Especial.', links: [nextLessonLink(), ['scroll', 'Ver todas as missões', '#missoes']], acts: ['reforco', 'xadrez'] }),
    carteira: () => ({ name: 'Sua carteira', text: 'Última fileira, perto da janela. Alguém riscou «D-40» no tampo antes de você chegar.', links: [nextLessonLink(), ['calendar', 'Agenda e vínculos', '#agenda']], acts: [] }),
    telao: () => ({ name: 'Telão do Sistema S', text: 'O placar das quatro turmas, atualizado em tempo real.', links: [['trophy', 'Ranking de classes', '#conselho'], ['star', 'Ranking individual', '#conselho/individual'], ['users', 'Anuário', '#conselho/anuario']], acts: [] }),
    'pc-clube': () => ({ name: 'PC do clube', text: 'Um computador antigo cheio de poemas em Python. A Monika deixou um bilhete: «use à vontade».', links: [['star', 'Projetos do clube com a Monika', 'monika'], ['gamepad', 'Laboratório livre', '#lab']], acts: [] }),
    mural: () => ({ name: 'Mural do Sistema S', text: 'Avisos do Conselho, o regulamento e recortes de jornal que alguém esqueceu de tirar.', links: [['book', 'Regulamento', '#guia/regulamento'], ['archive', 'Arquivos', '#guia/arquivos']], acts: [] }),
  },
  dorm: {
    cama: () => ({ name: 'Sua cama', text: 'Quarto 404-D. A janela dá para o pátio e para o telão do Sistema S, que nunca desliga.', links: [['bed', 'ID estudantil e ajustes', '#dorm']], acts: ['quarto', 'livro', 'dormir'] }),
    escrivaninha: () => ({ name: 'Escrivaninha', text: 'Um notebook da escola, um caderno e uma caneca de café frio.', links: [nextLessonLink(), ['gamepad', 'Laboratório livre', '#lab']], acts: ['quarto'] }),
    avisos: () => ({ name: 'Balcão e quadro de avisos', text: '«Silêncio depois das 23h.» «Proibido cozinhar no quarto (isso vale para você, Ana).»', links: [['calendar', 'Agenda e vínculos', '#agenda'], ['archive', 'Arquivos', '#guia/arquivos']], acts: [] }),
    maquina: () => ({ name: 'Máquina de bebidas', text: 'Aceita pontos privados. O botão do café gelado está gasto de tanto uso.', links: [], acts: [], buy: { label: 'Comprar um café gelado', price: 150 } }),
  },
  galeria: {
    conveniencia: () => ({ name: 'Loja de conveniência', text: 'Gabaritos, pistas, minutos extras e temas para o terminal. Tudo se compra com pontos.', links: [['bag', 'Entrar na loja', '#loja']], acts: [] }),
    lanchonete: () => ({ name: 'Lanchonete', text: 'A Dona Dulce está sempre precisando de alguém para repor o balcão.', links: [], acts: ['bico'] }),
    livraria: () => ({ name: 'Livraria', text: 'Romances, manuais de Python e um corredor inteiro de policiais que a Raquel já leu.', links: [['book', 'Guia de Python', '#guia']], acts: ['livro'] }),
    eletronicos: () => ({ name: 'Eletrônicos', text: 'Notebooks de demonstração ligados. Ninguém vai reclamar se você testar um.', links: [['gamepad', 'Testar um notebook (laboratório livre)', '#lab']], acts: [] }),
    gratis: () => ({ name: 'Prateleira de itens gratuitos', text: 'Macarrão instantâneo, sabonete e pão. Regulamento, artigo 10: ninguém passa fome, mas todo mundo vê quem está pegando.', links: [['book', 'Ler o regulamento', '#guia/regulamento']], acts: [] }),
  },
};

function optionsCard(place, extra = {}) {
  const period = currentPeriod();
  const free = slots();
  const links = [...place.links];
  const acts = place.acts.map(ACT).filter(Boolean);
  const card = openCard(`
    <div class="h3-place">
      <p class="eyebrow">${esc((AREA_NAMES[areaNow] || '').toUpperCase())} · ${period === 'night' ? 'NOITE' : 'DEPOIS DA AULA'} · ${free[period]} ${period === 'aft' ? 'tardes' : 'noites'} livres</p>
      <h2>${esc(place.name)}</h2><p>${esc(place.text)}</p>
      <div class="h3-options">
        ${links.map(([ic, label, href]) => (href === 'kurisu' || href === 'monika' ? `<button type="button" class="h3-opt" data-tutorlink="${href}">${icon(ic)}<span><strong>${esc(label)}</strong><small>${href === 'kurisu' ? 'Tira-dúvidas e erros de Python' : 'Projetos criativos, passo a passo'}</small></span></button>` : `<a class="h3-opt" href="${href}">${icon(ic)}<span><strong>${esc(label)}</strong><small>Sem custo de tempo</small></span></a>`)).join('')}
        ${extra.areas ? extra.areas.map(([ic, label, text, area, spawn]) => `<button type="button" class="h3-opt" data-area="${area}" data-spawn="${spawn}">${icon(ic)}<span><strong>${esc(label)}</strong><small>${esc(text)}</small></span></button>`).join('') : ''}
        ${place.buy ? `<button type="button" class="h3-opt" data-buy ${state.pp >= place.buy.price ? '' : 'disabled'}>${icon('coin')}<span><strong>${esc(place.buy.label)}</strong><small>${place.buy.price} pp · saldo ${state.pp.toLocaleString('pt-BR')} pp</small></span></button>` : ''}
        ${acts.map((a) => {
    const ok = a.when === period && free[period] > 0;
    const why = a.when !== period ? (a.when === 'night' ? 'Só à noite' : 'Só depois da aula') : !free[period] ? 'Sem tempo livre agora' : `Gasta ${period === 'aft' ? 'uma tarde' : 'uma noite'}`;
    return `<button type="button" class="h3-opt act" data-act="${a.id}" ${ok ? '' : 'disabled'}>${icon('star')}<span><strong>${esc(a.name)}</strong><small>${esc(why)} · ${Object.entries(a.gain).map(([k, v]) => `+${v} ${k === 'int' ? 'Intelecto' : k === 'cal' ? 'Sangue-frio' : k === 'dis' ? 'Disciplina' : k === 'emp' ? 'Empatia' : 'Carisma'}`).join(' · ')}${a.pp ? ' · + pp' : ''}</small></span></button>`;
  }).join('')}
      </div>
    </div>`, '#3aa3ff');
  if (!card) return;
  sfx.play('click');
  $$('a.h3-opt', card).forEach((a) => a.addEventListener('click', () => closeCard()));
  $$('[data-tutorlink]', card).forEach((b) => { b.onclick = () => { closeCard(); $(b.dataset.tutorlink === 'monika' ? '#monika-btn' : '#kurisu-btn').click(); }; });
  $$('[data-area]', card).forEach((b) => { b.onclick = () => { closeCard(); world?.enterArea(b.dataset.area, b.dataset.spawn); }; });
  const buyBtn = $('[data-buy]', card);
  if (buyBtn) buyBtn.onclick = () => {
    if (state.pp < place.buy.price) return;
    state.pp -= place.buy.price;
    save();
    closeCard();
    toast(`${place.buy.label.replace('Comprar um', 'Um')}: −${place.buy.price} pp. Gelado do jeito certo.`);
  };
  $$('[data-act]', card).forEach((b) => { b.onclick = async () => {
    closeCard();
    const main = document.getElementById('main');
    if (await doActivity(ACT(b.dataset.act))) await afterTime(main);
  }; });
}

function placeCard(key) {
  const place = PLACES[key];
  if (!place) return;
  const links = [...place.links];
  if (key === 'exames') {
    const open = chapters.find((c) => duelUnlocked(c) && !duelWon(c));
    if (open) links.push(['sword', `Exame Especial: ${CAST[open.rival].full}`, `#prova/${open.rival}`]);
    else links.push(['scroll', 'Nenhum exame aberto: ver o quadro de missões', '#missoes']);
  }
  if (key === 'lab404') links.push(['flask', 'Bater na porta da Kurisu', 'kurisu']);
  optionsCard({ ...place, links });
}

function travelCard() {
  optionsCard({ name: 'Mapa rápido', text: 'Ir direto para um lugar, sem andar até lá.', links: [], acts: [] }, {
    areas: [
      ['map', 'Pátio', 'O centro do campus', 'campus', 'inicio'],
      ['scroll', 'Sala da Turma D', 'Prédio principal, térreo', 'escola', 'salaD'],
      ['star', 'Clube de Código Criativo', 'Prédio principal, com a Monika', 'escola', 'clube'],
      ['bed', 'Seu quarto (404-D)', 'Dormitório', 'dorm', 'quarto'],
      ['users', 'Saguão do dormitório', 'Dormitório', 'dorm', 'entrada'],
      ['bag', 'Galeria Jacarandá', 'Lojas e lanchonete', 'galeria', 'entrada'],
    ],
  });
  const card = hudRoot && $('#h3-card', hudRoot);
  const box = card && $('.h3-options', card);
  if (box) {
    for (const key of ['conselho', 'biblio', 'info', 'lab404', 'exames', 'portao']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'h3-opt';
      b.innerHTML = `${icon('map')}<span><strong>${esc(PLACES[key].name)}</strong><small>${esc(PLACES[key].text)}</small></span>`;
      b.onclick = () => placeCard(key);
      box.append(b);
    }
  }
}

export function interact(target) {
  if (!shown || document.body.classList.contains('hub-card-open')) return;
  if (target.type === 'npc') personCard(target.id);
  else if (target.type === 'door') world?.enterArea(target.to, target.spawn);
  else if (target.type === 'spot') { const make = SPOTS[target.area]?.[target.key]; if (make) optionsCard(make()); }
  else if (AREA_OF[target.key]) world?.enterArea(AREA_OF[target.key], 'entrada');
  else placeCard(target.key);
}
