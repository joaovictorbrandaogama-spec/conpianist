import c1 from './c1.js';
import c2 from './c2.js';
import c3 from './c3.js';
import c4 from './c4.js';
import c5 from './c5.js';

export const chapters = [c1, c2, c3, c4, c5];
export const lessons = chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ ...lesson, chapter })));
export const lessonById = (id) => lessons.find((lesson) => lesson.id === id);
export const chapterOf = (lessonId) => lessonById(lessonId)?.chapter;
export const chapterByRival = (rival) => chapters.find((chapter) => chapter.rival === rival);

export const POINTS = { 1: 20, 2: 30, 3: 50, quiz: 10, lesson: 20, duelWin: 200, duelHonor: 80, steal: 100, bet: 100, betLoss: 50 };
export const RIVALS = { sora: 2400, bianca: 1900, theo: 1450, yuki: 1000, caio: 600 };
export const LEVEL_NAMES = { 1: 'Aquecimento', 2: 'Prática', 3: 'Desafio bônus' };

/** Entradas e casos de teste de um exercício ou prova, em formato uniforme. */
export function casesOf(spec) {
  if (spec.cases?.length) {
    return spec.cases.map((item) => ({
      inputs: item.inputs || [], seed: item.seed,
      expected: item.expected ?? spec.expected, check: item.check ?? spec.check ?? '',
    }));
  }
  return [{ inputs: spec.inputs || [], seed: spec.seed, expected: spec.expected, check: spec.check || '' }];
}
