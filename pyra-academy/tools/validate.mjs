// Valida o conteúdo com CPython usando o MESMO código Python do laboratório:
// toda solução de referência precisa passar, e todo código inicial precisa falhar.
// Uso: node tools/validate.mjs   (requer python3 no PATH)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chapters, casesOf } from '../public/js/content/index.js';
import { arcade } from '../public/js/content/arcade.js';
import { codex } from '../public/js/content/codex.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const worker = fs.readFileSync(path.join(here, '../public/python-worker.js'), 'utf8');
const literal = worker.match(/const BOOTSTRAP = `([\s\S]*?)`;/)[1];
const bootstrap = new Function('return `' + literal + '`;')();

const jobs = [];
const add = (label, code, cases, expectPass) => jobs.push({ label, code, cases, expectPass });

for (const chapter of chapters) {
  for (const lesson of chapter.lessons) {
    if (lesson.exercises.length !== 3) throw new Error(`${lesson.id}: esperados 3 exercícios`);
    for (const exercise of lesson.exercises) {
      const cases = casesOf(exercise);
      add(`${lesson.id}/${exercise.id} solução`, exercise.solution, cases, true);
      add(`${lesson.id}/${exercise.id} inicial`, exercise.starter, cases, false);
    }
    add(`${lesson.id} exemplo de jogo`, lesson.game.code, [{ inputs: lesson.game.inputs || [], seed: 7 }], null);
    for (const section of lesson.sections) for (const block of section.body) {
      if (block.code && !/input\(|^range\(|# NameError/m.test(block.code)) add(`${lesson.id} trecho "${section.h}"`, block.code, [{ inputs: [], seed: 1 }], null);
    }
    for (const question of lesson.quiz) if (!(question.correct >= 0 && question.correct < question.options.length)) throw new Error(`${lesson.id}: quiz inválido`);
  }
  const cases = casesOf(chapter.duel);
  add(`${chapter.id} prova solução`, chapter.duel.solution, cases, true);
  add(`${chapter.id} prova inicial`, chapter.duel.starter, cases, false);
}
for (const game of arcade) add(`arcade/${game.id}`, game.code, [{ inputs: game.demo, seed: 3, interactive: true }], null);
for (const entry of codex) if (!/input\(/.test(entry.code)) add(`guia/${entry.term}`, entry.code, [{ inputs: [], seed: 1 }], null);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyra-validate-'));
fs.writeFileSync(path.join(dir, 'harness.py'), bootstrap);
fs.writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify(jobs));
fs.writeFileSync(path.join(dir, 'run.py'), `
import json, sys
sys.path.insert(0, ${JSON.stringify(dir)})
import harness
jobs = json.load(open(${JSON.stringify(path.join(dir, 'jobs.json'))}, encoding='utf-8'))
failures = 0
for job in jobs:
    outcome, detail = True, ''
    for case in job['cases']:
        assessed = case.get('expected') is not None or bool(case.get('check'))
        result = json.loads(harness._pyra_execute(job['code'], case.get('check') or '', case.get('expected'), json.dumps(case.get('inputs') or []), bool(case.get('interactive')), case.get('seed')))
        if job['expectPass'] is None:
            if result['error']:
                outcome, detail = False, result['error']
            break
        if not assessed:
            outcome, detail = False, 'caso sem expected nem check'
            break
        if result['passed'] is not True:
            outcome, detail = False, (result['error'] or result['failure'] or '?')
            break
    if job['expectPass'] is None:
        ok = outcome
    else:
        ok = outcome == job['expectPass']
        if not ok and job['expectPass'] is False:
            detail = 'o código inicial passa nos testes sem ser alterado'
    if not ok:
        failures += 1
        print('FALHOU', job['label'], '::', detail.splitlines()[-1] if detail else '')
print(f"{len(jobs) - failures}/{len(jobs)} verificações passaram.")
sys.exit(1 if failures else 0)
`);
const run = spawnSync('python3', ['-I', path.join(dir, 'run.py')], { stdio: 'inherit' });
fs.rmSync(dir, { recursive: true, force: true });
process.exit(run.status ?? 1);
