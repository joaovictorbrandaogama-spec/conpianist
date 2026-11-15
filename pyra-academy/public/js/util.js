export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Texto corrido com `código` e **destaque**. */
export function fmt(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

const ICONS = {
  home: '<path d="M3 11 12 3l9 8v10h-6v-6H9v6H3Z"/>',
  scroll: '<path d="M6 3h11a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5m4 3h8M8 12h8M8 16h5"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6m-5 1h10"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  book: '<path d="M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-3-1-7-1-10 1Zm0 0v16"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7M17 4a4 4 0 0 1 0 8m5 9c0-3-2-6-5-7"/>',
  chat: '<path d="M4 4h16v12H9l-5 4Z"/><path d="M8 9h8M8 12h5"/>',
  play: '<path d="m7 4 14 8-14 8Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  bulb: '<path d="M9 18h6m-6 3h6M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"/>',
  reset: '<path d="M3 4v6h6M3 10a9 9 0 1 1 1 8"/>',
  sword: '<path d="M14 4h6v6L9 21l-2-2-3 3-2-2 3-3-2-2Zm-6 9 3 3"/>',
  star: '<path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2l-5.6 3.1 1.2-6.3L3 9.6l6.3-.8Z"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9Zm12-1a5 5 0 0 1 0 8m2-11a9 9 0 0 1 0 14"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9Zm12 0 5 6m0-6-5 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  send: '<path d="M3 20 21 12 3 4l3 8Zm3-8h8"/>',
  gamepad: '<path d="M6 8h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2v-3a4 4 0 0 1 4-4Zm1 3v4m-2-2h4m6-1h.01M18 14h.01"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  flask: '<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3M7 15h10"/>',
};
export const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.code}</svg>`;

// ---------- realce de sintaxe Python ----------
const TOKEN = /(#[^\n]*)|((?:[fFrRbB]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|\b(\d+(?:\.\d+)?)\b|\b(def|return|if|elif|else|for|while|in|not|and|or|import|from|as|break|continue|pass|class|try|except|finally|with|lambda|is|global|del|raise|assert|yield|nonlocal)\b|\b(True|False|None)\b|\b(print|input|len|range|int|float|str|bool|list|dict|set|tuple|type|sum|min|max|abs|round|sorted|enumerate|zip|isinstance|reversed|any|all)\b(?=\s*\()|([A-Za-z_]\w*)(?=\s*\()/g;
const CLASSES = ['', 'tk-c', 'tk-s', 'tk-n', 'tk-k', 'tk-b', 'tk-f', 'tk-d'];

export function highlight(code) {
  let out = '';
  let last = 0;
  TOKEN.lastIndex = 0;
  let match;
  while ((match = TOKEN.exec(code))) {
    if (match[0] === '') { TOKEN.lastIndex++; continue; }
    out += esc(code.slice(last, match.index));
    let group = 1;
    while (group < 8 && match[group] === undefined) group++;
    out += `<span class="${CLASSES[group]}">${esc(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return out + esc(code.slice(last));
}

export const codeBlock = (code, extra = '') => `<pre class="code ${extra}"><code>${highlight(code)}</code></pre>`;

// ---------- tradução de erros do Python ----------
const ERRORS = [
  [/unterminated (triple-quoted )?string literal|EOL while scanning/, 'Você abriu aspas e não fechou. Todo texto precisa começar e terminar com o mesmo tipo de aspas.'],
  [/expected ':'/, 'Faltou o dois-pontos (:) no fim da linha. Linhas com if, elif, else, for, while e def terminam com dois-pontos.'],
  [/was never closed/, 'Um parêntese, colchete ou chave foi aberto e não foi fechado.'],
  [/unmatched '\)'|unmatched '\]'|unmatched '\}'/, 'Há um fechamento sobrando: um ), ] ou } sem o par que abre.'],
  [/Maybe you meant '==' or ':=' instead of '='|cannot assign to|invalid syntax. Maybe you meant '=='/, 'Para comparar, use ==. Um = sozinho serve para guardar um valor em uma variável.'],
  [/f-string: /, 'Há um problema dentro das chaves da f-string. Confira se cada { tem o seu } e se a expressão dentro delas é válida.'],
  [/IndentationError: expected an indented block/, 'Depois de uma linha que termina com dois-pontos, o bloco de dentro precisa estar recuado com 4 espaços.'],
  [/IndentationError: unexpected indent/, 'Esta linha está recuada sem motivo. Só recue linhas que pertencem a um bloco (if, for, while, def).'],
  [/IndentationError|TabError/, 'O recuo (indentação) não está consistente. Use sempre 4 espaços por nível e alinhe as linhas do mesmo bloco.'],
  [/SyntaxError/, 'O Python não conseguiu ler esta linha. Procure aspas, parênteses, vírgulas ou dois-pontos faltando — às vezes o erro está na linha de cima.'],
  [/NameError: name '([^']+)' is not defined/, (m) => `O Python não conhece o nome ${m[1]}. Confira se digitou exatamente igual (maiúsculas contam), se criou a variável antes de usar e, se for um texto, se colocou aspas.`],
  [/UnboundLocalError/, 'Dentro da função você usou uma variável antes de dar um valor a ela. Crie a variável dentro da função ou receba-a como parâmetro.'],
  [/TypeError: can only concatenate str|TypeError: unsupported operand type\(s\) for \+: '(int|float)' and 'str'|must be str, not/, 'Você tentou somar texto com número. Converta com str(numero) ou, melhor, use uma f-string: f"Pontos: {pontos}".'],
  [/TypeError: unsupported operand/, 'Essa operação não funciona entre esses dois tipos. Confira se um número não está guardado como texto (com aspas) ou vindo de input() sem int().'],
  [/TypeError: .*missing \d+ required positional argument/, 'A função foi chamada com menos valores do que ela espera. Compare a chamada com os parâmetros no def.'],
  [/TypeError: .*takes \d+ positional arguments? but \d+ (was|were) given/, 'A função foi chamada com mais valores do que ela aceita. Compare a chamada com os parâmetros no def.'],
  [/TypeError: '(\w+)' object is not callable/, (m) => `Você colocou parênteses depois de algo que não é função (um ${m[1]}). Talvez uma variável tenha o mesmo nome de uma função.`],
  [/TypeError: '(\w+)' object is not subscriptable/, (m) => `Você usou colchetes em um valor do tipo ${m[1]}, que não tem posições. Colchetes funcionam em listas, textos e dicionários.`],
  [/TypeError: '[<>]=?' not supported between instances of 'str' and 'int'|not supported between instances/, 'Você comparou texto com número. Valores vindos de input() são texto: converta com int() antes de comparar.'],
  [/TypeError/, 'Um valor de tipo inesperado apareceu em uma operação. Use print(type(valor)) para investigar o que cada variável guarda.'],
  [/ValueError: invalid literal for int\(\)/, 'int() recebeu um texto que não é um número inteiro. Confira o que foi digitado ou guardado nessa variável.'],
  [/ValueError: could not convert string to float/, 'float() recebeu um texto que não é um número. Use ponto, não vírgula, nas casas decimais.'],
  [/ValueError/, 'A função recebeu um valor do tipo certo, mas com conteúdo inválido para o que ela faz.'],
  [/IndexError/, 'Você pediu uma posição que não existe. Em uma lista com 3 itens, as posições vão de 0 a 2.'],
  [/KeyError: (.+)/, (m) => `O dicionário não tem a chave ${m[1]}. Confira a grafia ou use .get() para ter um valor padrão.`],
  [/ZeroDivisionError/, 'Divisão por zero. Antes de dividir, verifique com um if se o divisor é diferente de zero.'],
  [/AttributeError: '(\w+)' object has no attribute '(\w+)'/, (m) => `Um valor do tipo ${m[1]} não tem ${m[2]}. Confira o tipo da variável ou a grafia do método.`],
  [/EOFError/, 'O programa pediu mais entradas com input() do que as disponíveis.'],
  [/RecursionError/, 'Uma função chamou a si mesma sem parar. Verifique a condição de parada.'],
  [/ModuleNotFoundError/, 'Este módulo não está disponível no laboratório. Aqui funcionam os módulos padrão do Python, como random e math.'],
  [/Execução interrompida após 8 segundos/, 'O programa não terminou: provavelmente um while cuja condição nunca fica falsa. Confira se algo muda a cada volta.'],
];

export function explainError(text) {
  if (!text) return '';
  for (const [pattern, message] of ERRORS) {
    const match = pattern.exec(text);
    if (match) return typeof message === 'function' ? message(match) : message;
  }
  return '';
}

// ---------- avisos ----------
let toastTimer;
export function toast(message, kind = '') {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast visible ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 4200);
}

// ---------- efeitos sonoros sintetizados ----------
let audio = null;
let soundOn = true;
export const sfx = {
  set enabled(value) { soundOn = !!value; },
  get enabled() { return soundOn; },
  /** Contexto de áudio compartilhado (efeitos e trilha ambiente). */
  context() { audio ??= new (window.AudioContext || window.webkitAudioContext)(); return audio; },
  play(name) {
    if (!soundOn) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const now = audio.currentTime;
      const tone = (freq, start, dur, type = 'sine', gain = 0.05, slide = 0) => {
        const osc = audio.createOscillator();
        const amp = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + start);
        if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + start + dur);
        amp.gain.setValueAtTime(0.0001, now + start);
        amp.gain.exponentialRampToValueAtTime(gain, now + start + 0.012);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(amp).connect(audio.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.02);
      };
      if (name === 'type') tone(660 + Math.random() * 60, 0, 0.03, 'triangle', 0.012);
      else if (name === 'click') tone(520, 0, 0.07, 'triangle', 0.04, 260);
      else if (name === 'step') tone(95 + Math.random() * 40, 0, 0.06, 'triangle', 0.028, -30);
      else if (name === 'whoosh') tone(220, 0, 0.28, 'sawtooth', 0.02, 700);
      else if (name === 'ok') { tone(523, 0, 0.12, 'triangle', 0.05); tone(659, 0.09, 0.12, 'triangle', 0.05); tone(784, 0.18, 0.22, 'triangle', 0.05); }
      else if (name === 'bad') { tone(240, 0, 0.16, 'square', 0.025, -80); tone(180, 0.12, 0.2, 'square', 0.025, -60); }
      else if (name === 'merit') { tone(880, 0, 0.08, 'sine', 0.05); tone(1175, 0.07, 0.08, 'sine', 0.05); tone(1568, 0.14, 0.3, 'sine', 0.05); }
      else if (name === 'title') { tone(196, 0, 1.4, 'sine', 0.05); tone(294, 0.1, 1.3, 'sine', 0.035); tone(392, 0.25, 1.2, 'triangle', 0.03); }
    } catch { /* sem áudio, sem problema */ }
  },
};

/** Anima um número até o valor final. */
export function countUp(el, to, duration = 900) {
  const from = Number(el.dataset.value || 0);
  el.dataset.value = String(to);
  if (reducedMotion() || from === to) { el.textContent = to.toLocaleString('pt-BR'); return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString('pt-BR');
    if (t < 1 && el.isConnected) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
