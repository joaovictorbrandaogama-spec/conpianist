// Estado do jogo: progresso, Mérito, Sistema S (classes e pontos privados), calendário e vínculos.
import { chapters, lessons, lessonById, POINTS, SYSTEM, MONTHS } from './content/index.js';
import { CAST, STUDENT_IDS, CLASS_COLORS, setPlayerLook } from './art/characters.js';

const KEY = 'pyra.academy.v3';
const OLD_KEY = 'pyra.academy.v2';
const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const count = (value) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

function read() {
  try {
    const current = localStorage.getItem(KEY);
    if (current) return obj(JSON.parse(current));
    // Progresso da versão anterior: aulas e provas são mantidas, mas a história recomeça na nova escola.
    const old = localStorage.getItem(OLD_KEY);
    if (old) return { ...obj(JSON.parse(old)), started: false, migrated: true };
  } catch { /* armazenamento indisponível */ }
  return {};
}

function load() {
  const raw = read();
  const items = obj(raw.items);
  return {
    name: typeof raw.name === 'string' ? raw.name.slice(0, 20) : '',
    look: count(raw.look),
    started: !!raw.started,
    migrated: !!raw.migrated,
    flags: obj(raw.flags),
    ex: obj(raw.ex),          // id do exercício -> { passed, half, tries }
    quiz: obj(raw.quiz),      // "aula:indice" -> true
    done: obj(raw.done),      // id da aula -> true
    duels: obj(raw.duels),    // rival -> { result: 'win' | 'honra', bet: 0 | 1 | -1 }
    bonus: Number.isFinite(raw.bonus) ? raw.bonus : 0,
    pp: count(raw.pp),                 // pontos privados
    deposits: obj(raw.deposits),       // id do capítulo -> valor depositado no dia 1º
    items: { gabarito: count(items.gabarito), pista: count(items.pista), minuto: count(items.minuto) },
    themes: Array.isArray(raw.themes) ? raw.themes.filter((t) => typeof t === 'string') : [],
    theme: typeof raw.theme === 'string' ? raw.theme : '',
    drafts: obj(raw.drafts),
    last: typeof raw.last === 'string' ? raw.last : null,
    sound: raw.sound !== false,
    freeMode: !!raw.freeMode,
    chat: Array.isArray(raw.chat) ? raw.chat.filter((m) => m && typeof m.content === 'string').slice(-40) : [],
    chatMonika: Array.isArray(raw.chatMonika) ? raw.chatMonika.filter((m) => m && typeof m.content === 'string').slice(-40) : [],
    // Vida no campus: vínculos, atributos e tempo livre.
    stats: Object.fromEntries(['int', 'cal', 'dis', 'emp', 'car'].map((k) => [k, count(obj(raw.stats)[k])])),
    bonds: Object.fromEntries(Object.entries(obj(raw.bonds)).map(([k, v]) => [k, count(v)])),
    used: { aft: count(obj(raw.used).aft), night: count(obj(raw.used).night) },
    daylog: Array.isArray(raw.daylog) ? raw.daylog.filter((v) => v === 'aft' || v === 'night').slice(-60) : [],
    seen: obj(raw.seen),
    period: raw.period === 'night' ? 'night' : 'aft',   // tarde ou noite no campus 3D
    graphics: raw.graphics === '2d' ? '2d' : '3d',      // campus em 3D ou em lista       // cenas de vínculo já vistas: "id:nivel" -> true
  };
}

export const state = load();
setPlayerLook(state.look);
let storageOK = true;
const listeners = new Set();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch { storageOK = false; }
  listeners.forEach((fn) => fn());
  return storageOK;
}
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const canSave = () => storageOK;

let onReset = () => {};
export const setResetHandler = (fn) => { onReset = fn; };
/** Apaga o progresso e volta à tela de título, sem recarregar a página. */
export function resetAll() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch { /* nada a apagar */ }
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, load());
  setPlayerLook(state.look);
  listeners.forEach((fn) => fn());
  onReset();
}

// ---------- mérito ----------
export function exercisePoints(exercise) {
  const record = state.ex[exercise.id];
  if (!record?.passed) return 0;
  return record.half ? POINTS[exercise.level] / 2 : POINTS[exercise.level];
}

export function lessonMerit(lesson) {
  let total = 0;
  for (const exercise of lesson.exercises) total += exercisePoints(exercise);
  lesson.quiz.forEach((_, index) => { if (state.quiz[`${lesson.id}:${index}`]) total += POINTS.quiz; });
  if (state.done[lesson.id]) total += POINTS.lesson;
  return total;
}
export const lessonMax = (lesson) => lesson.exercises.reduce((sum, e) => sum + POINTS[e.level], 0) + lesson.quiz.length * POINTS.quiz + POINTS.lesson;

export function duelMerit(rival) {
  const duel = state.duels[rival];
  if (!duel) return 0;
  let total = duel.result === 'win' ? POINTS.duelWin : POINTS.duelHonor;
  if (duel.bet === 1) total += POINTS.bet;
  if (duel.bet === -1) total -= POINTS.betLoss;
  return total;
}

export function merit() {
  let total = state.bonus;
  for (const lesson of lessons) total += lessonMerit(lesson);
  for (const chapter of chapters) total += duelMerit(chapter.rival);
  return Math.max(0, total);
}

// ---------- progresso ----------
export const requiredDone = (lesson) => lesson.exercises.filter((e) => e.level < 3).every((e) => state.ex[e.id]?.passed);
export const quizDone = (lesson) => lesson.quiz.every((_, index) => state.quiz[`${lesson.id}:${index}`]);
export const lessonDone = (lesson) => !!state.done[lesson.id];
export const lessonsDoneCount = () => lessons.filter(lessonDone).length;
export const chapterLessonsDone = (chapter) => chapter.lessons.every(lessonDone);
export const duelFaced = (chapter) => !!state.duels[chapter.rival];
export const duelWon = (chapter) => state.duels[chapter.rival]?.result === 'win';

export function chapterUnlocked(chapter) {
  if (state.freeMode || chapter.n === 1) return true;
  return duelFaced(chapters[chapter.n - 2]);
}
export const duelUnlocked = (chapter) => chapterUnlocked(chapter) && (state.freeMode || chapterLessonsDone(chapter));

/** Fecha a aula se os obrigatórios e o quiz estiverem prontos. Devolve true se acabou de concluir. */
export function tryCompleteLesson(lesson) {
  if (state.done[lesson.id] || !requiredDone(lesson) || !quizDone(lesson)) return false;
  state.done[lesson.id] = true;
  save();
  return true;
}

/** Próximo objetivo sugerido no campus. */
export function nextObjective() {
  for (const chapter of chapters) {
    if (!chapterUnlocked(chapter)) break;
    const pending = chapter.lessons.find((lesson) => !lessonDone(lesson));
    if (pending) return { type: 'lesson', chapter, lesson: pending };
    if (!duelFaced(chapter)) return { type: 'duel', chapter };
  }
  const rematch = chapters.find((chapter) => duelFaced(chapter) && !duelWon(chapter));
  if (rematch) return { type: 'rematch', chapter: rematch };
  const bonus = lessons.find((lesson) => lesson.exercises.some((e) => !state.ex[e.id]?.passed));
  if (bonus) return { type: 'bonus', chapter: bonus.chapter, lesson: lessonById(bonus.id) };
  return { type: 'complete' };
}

export const totals = () => ({
  lessons: lessons.length,
  lessonsDone: lessonsDoneCount(),
  exercises: lessons.reduce((sum, lesson) => sum + lesson.exercises.length, 0),
  exercisesDone: lessons.reduce((sum, lesson) => sum + lesson.exercises.filter((e) => state.ex[e.id]?.passed).length, 0),
  duelsWon: chapters.filter(duelWon).length,
  students: STUDENT_IDS.length + 1,
});

// ---------- Sistema S: classes ----------
/** Pontos de Classe de cada turma de origem. A turma "d" é a de quem joga. */
export function classPoints() {
  const cp = { ...SYSTEM.base };
  cp.d += lessonsDoneCount() * SYSTEM.lessonCP;
  for (const chapter of chapters) {
    const duel = state.duels[chapter.rival];
    if (!duel) continue;
    if (duel.result !== 'win') { cp.d += SYSTEM.examHonorCP; continue; }
    cp.d += SYSTEM.examWinCP;
    const home = CAST[chapter.rival].home;
    if (home !== 'd' && cp[home] !== undefined) cp[home] -= SYSTEM.examStealCP;
  }
  return cp;
}

/** Turmas em ordem de pontos. A letra (A–D) é a posição: quem ultrapassa troca de letra. */
export function classBoard() {
  const cp = classPoints();
  return ['a', 'b', 'c', 'd']
    .map((home, order) => ({ home, order, cp: cp[home] }))
    .sort((x, y) => y.cp - x.cp || x.order - y.order)
    .map((row, index) => ({ ...row, letter: 'ABCD'[index], color: CLASS_COLORS[row.home], you: row.home === 'd' }));
}
export const letterOf = (home) => classBoard().find((row) => row.home === home)?.letter || '';
export const playerLetter = () => letterOf('d');

// ---------- ranking individual ----------
export function ranking() {
  const done = lessonsDoneCount();
  const rows = STUDENT_IDS.map((id) => {
    const c = CAST[id];
    // Colegas de turma sobem junto: o grupo de estudos rende Mérito a cada aula que você conclui.
    const value = c.merit + (c.growth || 0) * done - (state.duels[id]?.result === 'win' ? POINTS.steal : 0);
    return { id, name: c.full, home: c.home, color: c.color, merit: value, you: false };
  });
  rows.push({ id: 'voce', name: state.name || 'Você', home: 'd', color: CAST.voce.color, merit: merit(), you: true });
  rows.sort((a, b) => b.merit - a.merit || (a.you ? 1 : -1));
  rows.forEach((row, index) => { row.rank = index + 1; });
  return rows;
}
export const rank = () => ranking().find((row) => row.you).rank;

/** Foto do momento, usada para detectar subida no ranking e promoção de classe. */
export const snapshot = () => ({ rank: rank(), letter: playerLetter() });

// ---------- pontos privados ----------
/** Depósito do dia 1º ao abrir um novo capítulo (mês): Pontos de Classe × 100. */
export function grantDeposit(chapter) {
  if (chapter.n < 2 || state.deposits[chapter.id] !== undefined) return null;
  const cp = classPoints().d;
  const amount = cp * SYSTEM.ppPerCP;
  state.deposits[chapter.id] = amount;
  state.pp += amount;
  save();
  return { cp, amount, letter: playerLetter() };
}

/** Meses que já viraram (o exame anterior foi enfrentado) mas cujo depósito ainda não caiu. */
export const pendingMonths = () => chapters.filter((chapter) => chapter.n >= 2 && duelFaced(chapters[chapter.n - 2]) && state.deposits[chapter.id] === undefined);

export const SHOP = [
  { id: 'gabarito', kind: 'token', name: 'Gabarito comentado', price: 8000, ic: 'eye',
    text: 'Mostra a solução de um exercício sem cortar o Mérito dele pela metade.' },
  { id: 'pista', kind: 'token', name: 'Pista limpa', price: 5000, ic: 'bulb',
    text: 'Em um Exame Especial, revela a pista sem dar 45 segundos de vantagem ao adversário.' },
  { id: 'minuto', kind: 'token', name: 'Minuto extra', price: 12000, ic: 'clock',
    text: 'Em um Exame Especial, atrasa a entrega do adversário em 60 segundos. Um uso por exame.' },
  { id: 'tema-ambar', kind: 'theme', theme: 'ambar', name: 'Terminal Âmbar', price: 15000, ic: 'code',
    text: 'Pinta o terminal e o editor com fósforo âmbar, como nos computadores antigos.' },
  { id: 'tema-fosforo', kind: 'theme', theme: 'fosforo', name: 'Terminal Fósforo', price: 15000, ic: 'code',
    text: 'Verde sobre preto. Para quem quer se sentir dentro do sistema.' },
  { id: 'transferencia', kind: 'locked', name: 'Transferência para a Turma A', price: 20000000, ic: 'lock',
    text: 'Regra do Sistema S: qualquer aluno pode comprar uma vaga na Turma A. Ninguém jamais juntou o valor.' },
];

export function buy(id, discount = 0) {
  const item = SHOP.find((entry) => entry.id === id);
  const price = Math.round(item?.price * (1 - discount));
  if (!item || item.kind === 'locked' || state.pp < price) return false;
  if (item.kind === 'theme') {
    if (state.themes.includes(item.theme)) return false;
    state.themes.push(item.theme);
    state.theme = item.theme;
  } else {
    state.items[item.id] = (state.items[item.id] || 0) + 1;
  }
  state.pp -= price;
  save();
  return true;
}

export function useItem(id) {
  if (!(state.items[id] > 0)) return false;
  state.items[id] -= 1;
  save();
  return true;
}

// ---------- calendário ----------
const WEEK = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
export function calendar() {
  const finished = chapters.every(duelFaced);
  const chapter = chapters.find((c) => !duelFaced(c)) || chapters[chapters.length - 1];
  const done = chapter.lessons.filter(lessonDone).length;
  const day = finished ? 30 : 1 + Math.round((done / chapter.lessons.length) * 26);
  const date = new Date(2026, 3 + chapter.n, day);
  const hour = new Date().getHours();
  return {
    day, chapter, month: MONTHS[chapter.n - 1], weekday: WEEK[date.getDay()],
    period: hour < 12 ? 'Manhã' : hour < 18 ? 'Depois da aula' : 'Noite',
  };
}

// ---------- vínculos ----------
/** Nível de vínculo (0 a 5) com um personagem: conversas, exames e o grupo de estudos da turma. */
export function bond(id) {
  const c = CAST[id];
  if (!c) return 0;
  const talks = state.flags[`talk:${id}`] || 0;
  let level = (talks >= 1 ? 1 : 0) + (talks >= 3 ? 1 : 0);
  const duel = state.duels[id];
  if (duel) level += duel.result === 'win' ? 3 : 1;
  else if (c.home === 'd' || c.home === 'staff') {
    const done = lessonsDoneCount();
    level += (done >= 5 ? 1 : 0) + (done >= 11 ? 1 : 0) + (done >= 17 ? 1 : 0);
  }
  return Math.min(5, level);
}
