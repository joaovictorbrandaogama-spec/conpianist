// Bancada de código: editor com realce de sintaxe, terminal e verificação por testes.
import { $, esc, icon, highlight, explainError, sfx } from './util.js';
import { PythonRunner } from './runner.js';
import { state, save } from './state.js';

export const runner = new PythonRunner();
let sessionSeed = Math.floor(Math.random() * 1e9);

const insert = (textarea, text) => {
  textarea.focus();
  if (!document.execCommand?.('insertText', false, text)) textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
};

/**
 * @param {HTMLElement} host
 * @param {object} o
 * @param {string} o.key      chave do rascunho salvo
 * @param {string} o.starter  código inicial
 * @param {string} o.filename
 * @param {boolean} o.interactive  input() pede valores no terminal
 * @param {() => Array<{inputs: string[], seed?: number, expected?: string, check?: string}>} [o.cases] casos de teste
 * @param {(outcome: {passed: boolean, message: string}) => void} [o.onVerify]
 * @param {(snapshot: object) => void} [o.onRun]
 */
export function createWorkbench(host, o) {
  const cases = o.cases ? o.cases() : null;
  const presetInputs = cases?.[0]?.inputs || o.inputs || [];
  host.innerHTML = `
    <div class="bench">
      <div class="bench-top">
        <span class="bench-file"><i>Py</i>${esc(o.filename || 'codigo.py')}</span>
        <span class="bench-tools">
          <button type="button" class="icon-btn" data-act="reset" title="Restaurar o código inicial" aria-label="Restaurar o código inicial">${icon('reset')}</button>
        </span>
      </div>
      ${presetInputs.length ? `<div class="bench-inputs" title="Estas respostas são digitadas automaticamente quando o programa chama input()">Entradas simuladas: ${presetInputs.map((v) => `<kbd>${esc(v)}</kbd>`).join(' ')}</div>` : ''}
      <div class="bench-editor">
        <div class="gutter" aria-hidden="true"></div>
        <div class="code-area">
          <pre class="hl" aria-hidden="true"><code></code></pre>
          <textarea class="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Editor de código Python" wrap="off"></textarea>
        </div>
      </div>
      <div class="bench-actions">
        <small class="bench-keys">Ctrl + Enter executa</small>
        <span>
          <button type="button" class="btn ghost" data-act="stop" hidden>${icon('stop')}Interromper</button>
          <button type="button" class="btn ghost" data-act="run">${icon('play')}Executar</button>
          ${cases ? `<button type="button" class="btn gold" data-act="verify">${icon('check')}${esc(o.verifyLabel || 'Verificar')}</button>` : ''}
        </span>
      </div>
      <div class="term">
        <div class="term-head"><span>TERMINAL</span><span class="term-status" role="status">Pronto</span></div>
        <div class="term-body" aria-live="polite"><span class="term-empty">A saída do seu programa aparece aqui.</span></div>
      </div>
      <div class="bench-feedback" role="status"></div>
    </div>`;

  const textarea = $('.code-input', host);
  const layer = $('.hl code', host);
  const gutter = $('.gutter', host);
  const termBody = $('.term-body', host);
  const termStatus = $('.term-status', host);
  const feedback = $('.bench-feedback', host);
  const buttons = { run: $('[data-act="run"]', host), verify: $('[data-act="verify"]', host), stop: $('[data-act="stop"]', host) };
  let errorLine = null;
  let last = { output: '', error: '' };
  let token = 0;

  const paint = () => {
    const code = textarea.value;
    layer.innerHTML = highlight(code) + '\n';
    const count = code.split('\n').length;
    gutter.innerHTML = Array.from({ length: count }, (_, i) => `<span class="${i + 1 === errorLine ? 'err' : ''}">${i + 1}</span>`).join('');
  };
  const syncScroll = () => {
    $('.hl', host).scrollTop = textarea.scrollTop;
    $('.hl', host).scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  };

  textarea.value = state.drafts[o.key] ?? o.starter;
  paint();

  let saveTimer;
  textarea.addEventListener('input', () => {
    errorLine = null;
    paint();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { state.drafts[o.key] = textarea.value.slice(0, 20000); save(); }, 400);
  });
  textarea.addEventListener('scroll', syncScroll);
  textarea.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); (event.shiftKey && buttons.verify ? verify : run)(); return; }
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    if (event.key === 'Tab' && !event.shiftKey) { event.preventDefault(); insert(textarea, '    '); return; }
    if (event.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const current = value.slice(lineStart, start);
      const indent = current.match(/^ */)[0] + (current.trimEnd().endsWith(':') ? '    ' : '');
      event.preventDefault();
      insert(textarea, '\n' + indent);
      return;
    }
    if (event.key === 'Backspace' && start === end) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const before = value.slice(lineStart, start);
      if (before.length >= 4 && /^ +$/.test(before) && before.length % 4 === 0) {
        event.preventDefault();
        textarea.setSelectionRange(start - 4, start);
        insert(textarea, '');
      }
    }
  });

  const setBusy = (busy) => {
    buttons.run.disabled = busy;
    if (buttons.verify) buttons.verify.disabled = busy;
    buttons.stop.hidden = !busy;
    host.classList.toggle('busy', busy);
  };

  function renderTerm(result, pendingInput) {
    let html = '';
    for (const [kind, text] of result.parts || []) html += `<span class="t-${kind}">${esc(text)}</span>`;
    if (result.error) html += `<span class="t-err">${html && !html.endsWith('\n</span>') ? '\n' : ''}${esc(result.error)}</span>`;
    if (!html && !pendingInput) html = '<span class="term-empty">O programa terminou sem mostrar nada. Use print() para ver resultados.</span>';
    termBody.innerHTML = html;
    if (pendingInput) {
      const field = document.createElement('input');
      field.className = 'term-input';
      field.type = 'text';
      field.autocomplete = 'off';
      field.spellcheck = false;
      field.setAttribute('aria-label', 'Resposta para o input() do programa');
      termBody.append(field);
      setTimeout(() => field.focus({ preventScroll: true }), 30);
      field.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        pendingInput(field.value);
      });
    }
    termBody.scrollTop = termBody.scrollHeight;
  }

  function showError(result) {
    errorLine = result.errorLine || null;
    paint();
    const tip = explainError(result.error);
    feedback.className = 'bench-feedback bad';
    feedback.innerHTML = `<strong>${errorLine ? `Erro na linha ${errorLine}.` : 'O programa parou com um erro.'}</strong> ${esc(tip || 'Leia a última linha do terminal: ela diz o tipo do erro e o motivo.')}`;
  }

  async function execute(options) {
    return runner.run(textarea.value, { ...options, onStatus: (text) => { termStatus.textContent = text; } });
  }

  async function run() {
    if (runner.busy && runner.pending?.kind !== 'warm') return;
    const mine = ++token;
    const inputs = [...presetInputs];
    const interactive = !!o.interactive;
    if (interactive) sessionSeed = Math.floor(Math.random() * 1e9);
    feedback.className = 'bench-feedback';
    feedback.textContent = '';
    errorLine = null;
    setBusy(true);
    sfx.play('click');
    const loop = async () => {
      try {
        const result = await execute({ inputs, interactive, seed: interactive ? sessionSeed : cases?.[0]?.seed });
        if (mine !== token || !host.isConnected) return;
        last = { output: result.stdout, error: result.error || '' };
        if (result.needInput) {
          termStatus.textContent = 'Aguardando sua resposta…';
          setBusy(false);
          renderTerm(result, (value) => { inputs.push(value); setBusy(true); loop(); });
          return;
        }
        renderTerm(result);
        termStatus.textContent = result.error ? 'Erro' : 'Concluído';
        if (result.error) { showError(result); sfx.play('bad'); }
        o.onRun?.({ ...last, code: textarea.value });
      } catch (error) {
        if (mine !== token || !host.isConnected) return;
        last = { output: '', error: error.message };
        termBody.innerHTML = `<span class="t-err">${esc(error.message)}</span>`;
        termStatus.textContent = 'Interrompido';
        feedback.className = 'bench-feedback bad';
        feedback.textContent = explainError(error.message) || error.message;
        o.onRun?.({ ...last, code: textarea.value });
      }
      setBusy(false);
    };
    await loop();
  }

  async function verify() {
    if (!cases || (runner.busy && runner.pending?.kind !== 'warm')) return;
    const mine = ++token;
    feedback.className = 'bench-feedback';
    feedback.textContent = '';
    errorLine = null;
    setBusy(true);
    sfx.play('click');
    let outcome = { passed: true, message: '' };
    try {
      for (let index = 0; index < cases.length; index++) {
        const test = cases[index];
        const result = await execute({ inputs: test.inputs, seed: test.seed, expected: test.expected, check: test.check });
        if (mine !== token || !host.isConnected) return;
        if (index === 0 || result.passed === false) {
          renderTerm(result);
          last = { output: result.stdout, error: result.error || result.failure || '' };
        }
        if (result.passed !== true) {
          if (result.error) { showError(result); outcome = { passed: false, message: feedback.textContent }; }
          else {
            let message = result.failure || 'Um dos testes não passou.';
            if (cases.length > 1 && test.inputs.length) message = `Com as entradas ${test.inputs.map((v) => `“${v}”`).join(', ')}: ${test.expected !== undefined ? `a saída esperada era “${test.expected}”.` : message}`;
            feedback.className = 'bench-feedback bad';
            feedback.textContent = message;
            outcome = { passed: false, message };
          }
          break;
        }
      }
      termStatus.textContent = outcome.passed ? `Aprovado em ${cases.length} teste${cases.length > 1 ? 's' : ''}` : 'Reprovado';
      if (outcome.passed) {
        feedback.className = 'bench-feedback good';
        feedback.textContent = 'Todos os testes passaram.';
      }
    } catch (error) {
      if (mine !== token || !host.isConnected) return;
      termBody.innerHTML = `<span class="t-err">${esc(error.message)}</span>`;
      termStatus.textContent = 'Interrompido';
      feedback.className = 'bench-feedback bad';
      feedback.textContent = explainError(error.message) || error.message;
      last = { output: '', error: error.message };
      outcome = { passed: false, message: error.message };
    }
    setBusy(false);
    sfx.play(outcome.passed ? 'ok' : 'bad');
    o.onVerify?.(outcome);
    o.onRun?.({ ...last, code: textarea.value });
  }

  buttons.run.onclick = run;
  if (buttons.verify) buttons.verify.onclick = verify;
  buttons.stop.onclick = () => { token++; runner.stop(); setBusy(false); termStatus.textContent = 'Interrompido'; };
  $('[data-act="reset"]', host).onclick = () => {
    if (textarea.value !== o.starter && !confirm('Restaurar o código inicial? Suas alterações neste exercício serão apagadas.')) return;
    textarea.value = o.starter;
    delete state.drafts[o.key];
    save();
    errorLine = null;
    paint();
  };

  return {
    getCode: () => textarea.value,
    setCode: (code) => { textarea.value = code; state.drafts[o.key] = code; save(); errorLine = null; paint(); },
    snapshot: () => ({ code: textarea.value, ...last }),
    focus: () => textarea.focus(),
    run, verify,
    setFeedback: (kind, text) => { feedback.className = 'bench-feedback ' + kind; feedback.textContent = text; },
  };
}
