import { chapters, lessons, lessonById, POINTS, RIVALS } from './content/index.js';
import { CAST } from './art/characters.js';

const KEY = 'pyra.academy.v2';
const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

function load() {
  let raw = {};
  try { raw = obj(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* armazenamento indisponível */ }
  return {
    name: typeof raw.name === 'string' ? raw.name.slice(0, 20) : '',
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
    freeMode: !!raw.freeMode,
    chat: Array.isArray(raw.chat) ? raw.chat.filter((m) => m && typeof m.content === 'string').slice(-40) : [],
  };
}

export const state = load();
let storageOK = true;
const listeners = new Set();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch { storageOK = false; }
  listeners.forEach((fn) => fn());
  return storageOK;
}
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const canSave = () => storageOK;

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* nada a apagar */ }
  location.hash = '';
  location.reload();
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
