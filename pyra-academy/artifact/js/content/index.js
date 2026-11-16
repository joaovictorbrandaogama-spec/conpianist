import c1 from './c1.js';
import c2 from './c2.js';
import c3 from './c3.js';
import c4 from './c4.js';
import c5 from './c5.js';
import c6 from './c6.js';

export const chapters = [c1, c2, c3, c4, c5, c6];
export const lessons = chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ ...lesson, chapter })));
export const lessonById = (id) => lessons.find((lesson) => lesson.id === id);
export const chapterOf = (lessonId) => lessonById(lessonId)?.chapter;
export const chapterByRival = (rival) => chapters.find((chapter) => chapter.rival === rival);

// Mérito individual.
export const POINTS = { 1: 20, 2: 30, 3: 50, quiz: 10, lesson: 20, duelWin: 200, duelHonor: 80, steal: 100, bet: 100, betLoss: 50 };
export const LEVEL_NAMES = { 1: 'Aquecimento', 2: 'Prática', 3: 'Desafio bônus' };

// Sistema S: Pontos de Classe (CP) e pontos privados (pp).
// A turma de quem joga começa em zero; cada aula concluída e cada Exame Especial movem o placar.
export const SYSTEM = {
  base: { a: 1000, b: 720, c: 460, d: 0 },
  lessonCP: 20,       // por aula concluída
  examWinCP: 120,     // vitória em Exame Especial
  examHonorCP: 40,    // derrota com código correto
  examStealCP: 100,   // perdidos pela turma derrotada
  ppPerCP: 100,       // depósito mensal = CP × 100
};

// Cada capítulo é um mês do ano letivo.
export const MONTHS = ['Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro'];

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
