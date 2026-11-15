import { chapters, lessons, lessonById, POINTS, RIVALS } from './content/index.js';
import { CAST } from './art/characters.js';

const KEY = 'pyra.academy.v2';
const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

function readLocal() {
  try { return obj(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return {}; }
}
function load(raw = readLocal()) {
  raw = obj(raw);
  return {
    name: typeof raw.name === 'string' ? raw.name.slice(0, 24) : '',
    started: !!raw.started,
    flags: obj(raw.flags),
    ex: obj(raw.ex),          // id do exercício -> { passed, half, tries }
    quiz: obj(raw.quiz),      // "aula:indice" -> true
    done: obj(raw.done),      // id da aula -> true
    duels: obj(raw.duels),    // rival -> { result: 'win' | 'honra', bet: 0 | 1 | -1 }
    bonus: Number.isFinite(raw.bonus) ? raw.bonus : 0,
    drafts: obj(raw.drafts),
    last: typeof raw.last === 'string' ? raw.last : null,
    sound: raw.sound !== false,
    gfx: ['low', 'medium', 'high'].includes(raw.gfx) ? raw.gfx : 'auto',
    freeMode: !!raw.freeMode,
    classicHub: !!raw.classicHub,
    chat: Array.isArray(raw.chat) ? raw.chat.filter((m) => m && typeof m.content === 'string').slice(-40) : [],
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
  };
}

export const state = load();
let storageOK = true;
const listeners = new Set();

export function save() {
  state.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch { storageOK = false; }
  queueCloud();
  listeners.forEach((fn) => fn());
  return storageOK;
}
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const canSave = () => storageOK || cloud.ok;

// ---------- salvamento na conta (capacidade db do artefato) ----------
// Cada jogador tem um documento privado em data/users/<id>/save/progress.
// O navegador guarda uma cópia local; vale a versão salva por último.
const cloud = { ref: null, ok: false, timer: 0, writing: false, again: false };
const CLOUD_LIMIT = 230000;

function cloudBody() {
  const body = { ...state };
  let text = JSON.stringify(body);
  if (text.length > CLOUD_LIMIT) { body.chat = body.chat.slice(-10); text = JSON.stringify(body); }
  if (text.length > CLOUD_LIMIT) {
    const drafts = Object.entries(body.drafts).sort((a, b) => a[1].length - b[1].length);
    body.drafts = {};
    for (const [key, code] of drafts) { body.drafts[key] = code; if (JSON.stringify(body).length > CLOUD_LIMIT) { delete body.drafts[key]; break; } }
  }
  return body;
}

async function flushCloud() {
  if (!cloud.ref) return;
  if (cloud.writing) { cloud.again = true; return; }
  cloud.writing = true;
  try { await cloud.ref.set(cloudBody()); cloud.ok = true; }
  catch (error) { cloud.ok = false; console.warn('[pyra] não foi possível salvar na conta:', error?.code || error); }
  cloud.writing = false;
  if (cloud.again) { cloud.again = false; flushCloud(); }
}
function queueCloud() {
  if (!cloud.ref) return;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(flushCloud, 1500);
}
addEventListener('pagehide', () => { if (cloud.ref && cloud.timer) { clearTimeout(cloud.timer); cloud.timer = 0; flushCloud(); } });

/**
 * Liga o salvamento na conta. Resolve true se trouxe da nuvem um progresso
 * mais novo que o deste navegador (a tela atual deve ser redesenhada).
 */
export async function connectCloud() {
  const claude = window.claude;
  if (!claude?.use) return false;
  try {
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (!db || !user) return false;
    const id = await user.id();
    if (!id) return false;
    const ref = db.collection(`data/users/${id}/save`).doc('progress');
    const snap = await Promise.race([ref.get(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))]);
    cloud.ref = ref;
    cloud.ok = true;
    const remote = snap.exists ? obj(snap.data()) : null;
    if (remote && (Number(remote.updatedAt) || 0) > state.updatedAt) {
      Object.assign(state, load(remote));
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* fica só na nuvem */ }
      listeners.forEach((fn) => fn());
      return true;
    }
    if (state.started) flushCloud();
    return false;
  } catch (error) {
    console.warn('[pyra] salvamento na conta indisponível:', error?.code || error?.message || error);
    return false;
  }
}
export const cloudActive = () => !!cloud.ref && cloud.ok;

async function wipeCloud() {
  clearTimeout(cloud.timer);
  cloud.timer = 0;
  if (cloud.ref) { try { await cloud.ref.delete(); } catch { /* segue mesmo assim */ } }
}

export async function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* nada a apagar */ }
  await wipeCloud();
  location.hash = '';
  location.reload();
}

// ---------- cópia do progresso (o localStorage não sincroniza entre dispositivos) ----------
/** Texto JSON com todo o progresso, para salvar em arquivo. */
export function exportSave() {
  return JSON.stringify({ app: 'academia-pyra', version: 2, savedAt: new Date().toISOString(), state }, null, 2);
}
/** Restaura um progresso exportado. Devolve uma mensagem de erro, ou '' se deu certo (a página recarrega). */
export async function importSave(text) {
  let data;
  try { data = JSON.parse(text); } catch { return 'O arquivo não é um JSON válido.'; }
  const saved = data?.app === 'academia-pyra' ? data.state : null;
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return 'Este arquivo não é um progresso da Academia Pyra.';
  for (const key of ['ex', 'quiz', 'done', 'duels']) {
    const value = saved[key];
    if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) return 'O progresso do arquivo está corrompido.';
  }
  if (JSON.stringify(saved).length > 400000) return 'O arquivo é grande demais para ser um progresso.';
  const restored = load({ ...saved, updatedAt: Date.now() });
  let stored = false;
  try { localStorage.setItem(KEY, JSON.stringify(restored)); stored = true; } catch { /* tenta só a nuvem */ }
  if (cloud.ref) { try { await cloud.ref.set(restored); stored = true; } catch { /* sem nuvem */ } }
  if (!stored) return 'Não foi possível salvar o progresso importado.';
  location.hash = '';
  location.reload();
  return '';
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

export function ranking() {
  const rows = Object.entries(RIVALS).map(([id, base]) => ({
    id, name: CAST[id].full, color: CAST[id].color,
    merit: base - (state.duels[id]?.result === 'win' ? POINTS.steal : 0), you: false,
  }));
  rows.push({ id: 'voce', name: state.name || 'Você', color: '#d4af6a', merit: merit(), you: true });
  rows.sort((a, b) => b.merit - a.merit || (a.you ? 1 : -1));
  rows.forEach((row, index) => { row.rank = index + 1; });
  return rows;
}
export const rank = () => ranking().find((row) => row.you).rank;

// ---------- progresso ----------
export const requiredDone = (lesson) => lesson.exercises.filter((e) => e.level < 3).every((e) => state.ex[e.id]?.passed);
export const quizDone = (lesson) => lesson.quiz.every((_, index) => state.quiz[`${lesson.id}:${index}`]);
export const lessonDone = (lesson) => !!state.done[lesson.id];
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

/** Próximo objetivo sugerido na sala. */
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
  lessonsDone: lessons.filter(lessonDone).length,
  exercises: lessons.reduce((sum, lesson) => sum + lesson.exercises.length, 0),
  exercisesDone: lessons.reduce((sum, lesson) => sum + lesson.exercises.filter((e) => state.ex[e.id]?.passed).length, 0),
  duelsWon: chapters.filter(duelWon).length,
});
