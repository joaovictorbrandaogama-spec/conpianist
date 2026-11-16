// Tutoras: Kurisu (Laboratório 404, tira-dúvidas e erros) e Monika (Clube de Código Criativo,
// projetos e orientação passo a passo). Um painel só, com uma aba para cada uma.
// Online: o Claude de quem joga, pela capacidade "sample" do artefato (respostas por streaming).
// Offline (fora do visualizador, sem permissão ou sem acesso): respostas locais por regras.
import { $, $$, esc, icon, highlight, explainError, sfx, toast } from './util.js';
import { KURISU_PERSONA, REFUSAL_LINE } from './kurisu-persona.js';
import { MONIKA_PERSONA, MONIKA_REFUSAL } from './monika-persona.js';
import { CREATIVE } from './content/creative.js';
import { avatar } from './art/characters.js';
import { codex } from './content/codex.js';
import { state, save } from './state.js';
import { go } from './nav.js';

let online = null;            // null = ainda não verificado
let contextProvider = () => ({ mode: 'sala' });
let busy = false;
let controller = null;
let current = 'kurisu';

export const setTutorContext = (provider) => { contextProvider = provider || (() => ({ mode: 'sala' })); };
export const currentTutor = () => current;

let sampler = null;
let probing = null;
async function checkHealth() {
  if (online !== null) return online;
  probing ||= (async () => {
    try { sampler = (await window.claude?.use?.('sample')) || null; } catch { sampler = null; }
    online = !!sampler;
    return online;
  })();
  return probing;
}

// Códigos que desligam a IA nesta visita (sem insistir): segue no modo offline.
const PERMANENT = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'session_expired']);

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const findCodex = (q) => {
  let entry = null;
  let best = 0;
  for (const item of codex) for (const key of item.keys) if (key.length > best && q.includes(key)) { entry = item; best = key.length; }
  return entry;
};

// ---------- Kurisu offline ----------
const K_OPEN = ['Hmph.', 'Tá, escuta.', 'Preste atenção, que eu não vou repetir.', 'Vamos por partes, como em qualquer experimento.'];
const K_CLOSE = ['Rode de novo e observe o que muda.', 'Hipótese, experimento, conclusão. Vai.', 'N-não é como se eu estivesse torcendo por você.', 'Teste e me traga o resultado.'];
function kurisuOffline(question, context) {
  const q = question.toLowerCase();
  if (/christina|assistente|zumbi/.test(q)) return 'Não tem -tina nenhum! É Kurisu. Makise Kurisu. Agora volte para o código.';
  if (/quem (é|e) voc|seu nome|kurisu/.test(q) && q.length < 60) return 'Makise Kurisu, neurocientista. Estou aqui estudando como pessoas aprendem sob pressão. Você é o meu melhor conjunto de dados, então trate de aprender direito.';
  if (/monika/.test(q)) return 'A presidente do Clube de Código Criativo? Ela é… intensa. Mas, se você quer ideia de projeto em vez de conserto de erro, ela é a pessoa certa. Não conte que eu disse isso.';
  if (/obrigad|valeu|thanks/.test(q)) return 'N-não precisa agradecer! Eu só não suporto ver código quebrado. …De nada.';
  const error = context.error && explainError(context.error);
  if (error && /erro|error|por que|porque|não funciona|nao funciona|ajuda|bug|quebr|problema|explica/.test(q)) return `${pick(K_OPEN)} O Python já te contou o que houve; você só precisa ler. ${error} ${pick(K_CLOSE)}`;
  if (context.mode === 'duelo' && /dica|ajuda|resposta|solu|como/.test(q)) return 'Você está no meio de um Exame Especial. Se eu te der a resposta, arruíno os dados do experimento e a sua vitória. Releia o enunciado, liste as variáveis que você precisa e escreva uma linha por vez.';
  if (context.hint && /dica|pista|ajuda|travei|não sei|nao sei|como (faço|faz|eu)|começ|comec/.test(q)) return `${pick(K_OPEN)} Uma pista, e só uma: ${context.hint} ${pick(K_CLOSE)}`;
  const entry = findCodex(q);
  if (entry) return `${pick(K_OPEN)} ${entry.text}\n\n\`\`\`python\n${entry.code}\n\`\`\`\n${pick(K_CLOSE)}`;
  if (error) return `Olhando o seu terminal: ${error} ${pick(K_CLOSE)}`;
  if (context.hint) return `Não entendi bem a pergunta, mas olhando o que você está fazendo: ${context.hint}`;
  return 'Estou sem conexão com o laboratório, então só consigo responder sobre os tópicos do guia: print, variáveis, operadores, strings, input, if, random, for, while, listas, dicionários, grades, funções, try/except, split e join, sorted, compreensões, tuplas, classes e erros. Pergunte citando um deles, ou me mostre um erro.';
}

// ---------- Monika offline ----------
const M_OPEN = ['Ah, que bom que você perguntou para mim.', 'Vem cá, vamos olhar isso juntos.', 'Eu estava esperando você chegar nessa parte.', 'Certo, um passo de cada vez.'];
const M_CLOSE = ['Roda e me conta o que apareceu, tá?', 'Quando der certo, eu tenho o próximo passo pronto.', 'Eu fico bem aqui, esperando o resultado.', 'Escreve, roda, e volta. Eu não saio daqui.'];
const nameOf = () => state.name || 'Quarenta';
function monikaOffline(question, context) {
  const q = question.toLowerCase();
  if (/quem (é|e) voc|seu nome|monika/.test(q) && q.length < 60) return `Monika, presidente do Clube de Código Criativo. Aqui a gente usa Python para inventar coisas: poemas, desenhos em texto, histórias. E você, ${nameOf()}, é oficialmente o meu aluno favorito. Não conta para os outros.`;
  if (/kurisu/.test(q)) return 'A Kurisu é ótima para consertar o que quebrou. Eu sou melhor para quando você não sabe o que construir. Pode ir falar com ela sempre que precisar, viu? Eu não fico com ciúmes. Muito.';
  if (/obrigad|valeu|thanks/.test(q)) return `Imagina! Ver você aprendendo é a melhor parte do meu dia, ${nameOf()}. Qual vai ser o próximo projeto?`;
  if (/dormir|cansad|parar|tchau|sair|descans/.test(q)) return 'Vai descansar, sério. Cérebro descansado aprende mais rápido, e o clube vai estar exatamente aqui amanhã. Eu guardo o seu lugar.';
  if (context.mode === 'duelo') return 'Ei, isso é um Exame Especial. Essa prova é sua, e eu quero ver você vencer com o seu próprio código. Respira, lê o enunciado com calma e escreve uma linha por vez. Eu comemoro com você depois.';
  const error = context.error && explainError(context.error);
  if (error) return `${pick(M_OPEN)} ${error} Todo poema tem rascunho, e todo programa tem erro no caminho. ${pick(M_CLOSE)}`;
  if (context.mode === 'aula' && context.hint) return `${pick(M_OPEN)} Eu não vou te dar a resposta, porque quero que ela seja sua. Mas pensa nisso: ${context.hint} ${pick(M_CLOSE)}`;
  if (/ideia|projeto|criar|criativ|poema|arte|desenh|jogo|histór|histor|guia|o que (eu )?fa[çz]o|tédio|tedio/.test(q)) {
    const project = pick(CREATIVE);
    return `Tenho uma ideia perfeita para você: ${project.title.toLowerCase()}. ${project.text} Primeiro passo: ${project.steps[0].toLowerCase()} Toca em «${project.title}» na lista de projetos aqui embaixo que eu abro tudo no laboratório.`;
  }
  const entry = findCodex(q);
  if (entry) return `${pick(M_OPEN)} ${entry.text}\n\n\`\`\`python\n${entry.code}\n\`\`\`\nAgora tenta usar isso num projeto seu. ${pick(M_CLOSE)}`;
  return `Estou sem conexão agora, ${nameOf()}, mas ainda posso te guiar. Escolha um dos projetos aqui embaixo: eu abro o código no laboratório com os passos comentados. Ou me pergunte sobre print, strings, listas, random, laços ou dicionários.`;
}

// ---------- as duas tutoras ----------
const TUTORS = {
  kurisu: {
    id: 'kurisu', name: 'Makise Kurisu', short: 'Kurisu', place: 'Laboratório 404', speaker: 'KURISU', expr: 'smirk',
    persona: KURISU_PERSONA, refusal: REFUSAL_LINE, chatKey: 'chat', offline: kurisuOffline,
    placeholder: 'Pergunte sobre Python…',
    greeting: 'Hmph. Então você veio mesmo. Mostre o erro, diga onde travou ou pergunte sobre qualquer coisa de Python. Eu vejo o código que estiver aberto na sua tela.',
    quick: [
      ['Explique este erro', 'Pode explicar o erro que apareceu no meu terminal?'],
      ['Uma dica', 'Estou travando neste exercício. Pode dar uma dica sem entregar a resposta?'],
      ['Por que funciona?', 'Meu código funcionou, mas não entendi direito por quê. Pode explicar o que cada parte faz?'],
    ],
  },
  monika: {
    id: 'monika', name: 'Monika', short: 'Monika', place: 'Clube de Código Criativo', speaker: 'MONIKA', expr: 'smile',
    persona: MONIKA_PERSONA, refusal: MONIKA_REFUSAL, chatKey: 'chatMonika', offline: monikaOffline,
    placeholder: 'Conte o que você quer criar…',
    greeting: 'Oi! Que bom que você veio. Aqui no clube a gente usa Python para inventar coisas. Me diga o que você quer criar, ou escolha um projeto aqui embaixo, que eu te guio passo a passo.',
    quick: [
      ['Me dá uma ideia', 'Estou sem ideia. Pode me sugerir um projeto criativo e me guiar no primeiro passo?'],
      ['Próximo passo', 'Já fiz o passo anterior. Qual é o próximo passo do nosso projeto?'],
      ['Deixa mais bonito', 'Meu programa funciona. Como deixo a saída mais bonita ou mais criativa?'],
    ],
  },
};
const chatOf = (t) => {
  if (!Array.isArray(state[t.chatKey])) state[t.chatKey] = [];
  return state[t.chatKey];
};

function buildPrompt(t, history, context) {
  const fields = [
    ['modo', context.mode], ['estudante', state.name], ['aula', context.lesson], ['conceito', context.concept],
    ['exercicio', context.exercise], ['enunciado', context.task], ['codigo_atual', context.code?.slice(0, 20000)],
    ['saida_do_terminal', context.output ? '(final da saída) ' + context.output.slice(-3000) : ''], ['erro', context.error?.slice(-3000)],
  ].filter(([, value]) => value);
  const transcript = history.slice(0, -1).map((m) => `${m.role === 'user' ? 'ESTUDANTE' : t.speaker}: ${m.content}`).join('\n\n');
  const question = history[history.length - 1].content;
  return `${t.persona}

# Conversa até agora
${transcript || '(início da conversa)'}

<contexto_do_jogo>
${fields.map(([name, value]) => `<${name}>\n${value}\n</${name}>`).join('\n')}
</contexto_do_jogo>

# Nova mensagem do estudante
${question}

Responda agora, como ${t.short}, só com a fala dela (sem prefixo de nome).`;
}

// ---------- renderização ----------
function renderMessage(text) {
  const parts = String(text).split(/```(?:python|py)?\n?([\s\S]*?)(?:```|$)/g);
  let html = '';
  parts.forEach((part, index) => {
    if (index % 2 === 1) { if (part.trim()) html += `<pre class="code"><code>${highlight(part.replace(/\n$/, ''))}</code></pre>`; return; }
    const clean = part.trim();
    if (!clean) return;
    html += clean.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`).join('');
  });
  return html;
}

function bubble(t, role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.innerHTML = role === 'assistant' ? `<span class="msg-avatar">${avatar(t.id)}</span><div class="msg-body">${renderMessage(text)}</div>` : `<div class="msg-body">${renderMessage(text)}</div>`;
  return el;
}

/** Abre um projeto criativo no laboratório livre, com a Monika acompanhando. */
export function openProject(id) {
  const project = CREATIVE.find((p) => p.id === id);
  if (!project) return;
  state.drafts.lab = project.code;
  const chat = chatOf(TUTORS.monika);
  chat.push({ role: 'assistant', content: `Abri «${project.title}» no laboratório para você. ${project.text}\n\nOs passos: ${project.steps.map((s, i) => `${i + 1}) ${s}`).join(' ')}\n\nComece pelo primeiro e me conte como foi. Eu fico bem aqui.` });
  state.chatMonika = chat.slice(-40);
  save();
  go('#lab');
  toast(`${project.title} aberto no laboratório.`);
  if (current === 'monika') paint();
}

let paint = () => {};

export function mountTutor() {
  const panel = $('#tutor');
  panel.innerHTML = `
    <div class="tutor-tabs" role="tablist" aria-label="Escolher tutora">
      ${Object.values(TUTORS).map((t) => `<button type="button" role="tab" class="tutor-tab" data-tutor="${t.id}"><span class="mate-face">${avatar(t.id, t.expr)}</span><span><strong>${esc(t.short)}</strong><small>${esc(t.place)}</small></span></button>`).join('')}
    </div>
    <div class="tutor-head">
      <span class="tutor-face" id="tutor-face"></span>
      <div><strong id="tutor-name"></strong><small id="tutor-status"></small></div>
      <button type="button" class="icon-btn" id="tutor-clear" title="Limpar a conversa" aria-label="Limpar a conversa">${icon('reset')}</button>
      <button type="button" class="icon-btn" id="tutor-close" aria-label="Fechar">${icon('x')}</button>
    </div>
    <div class="tutor-log" id="tutor-log" aria-live="polite"></div>
    <div class="tutor-projects" id="tutor-projects" hidden></div>
    <div class="tutor-quick" id="tutor-quick"></div>
    <form class="tutor-form" id="tutor-form">
      <textarea id="tutor-input" rows="1" maxlength="2000" aria-label="Mensagem para a tutora"></textarea>
      <button type="submit" class="btn gold" aria-label="Enviar">${icon('send')}</button>
    </form>`;

  const log = $('#tutor-log');
  const input = $('#tutor-input');
  paint = () => {
    const t = TUTORS[current];
    panel.dataset.tutor = current;
    $$('.tutor-tab', panel).forEach((b) => { const on = b.dataset.tutor === current; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    $('#tutor-face').innerHTML = avatar(t.id, t.expr);
    $('#tutor-name').textContent = t.name;
    input.placeholder = t.placeholder;
    $('#tutor-quick').innerHTML = t.quick.map(([label], index) => `<button type="button" data-quick="${index}">${esc(label)}</button>`).join('');
    const projects = $('#tutor-projects');
    projects.hidden = current !== 'monika';
    projects.innerHTML = current === 'monika' ? `<small>PROJETOS DO CLUBE</small><div>${CREATIVE.map((p) => `<button type="button" data-project="${p.id}" title="${esc(p.text)}"><strong>${esc(p.title)}</strong><em>${esc(p.level)}</em></button>`).join('')}</div>` : '';
    log.innerHTML = '';
    const chat = chatOf(t);
    if (!chat.length) log.append(bubble(t, 'assistant', t.greeting));
    for (const message of chat) log.append(bubble(t, message.role, message.content));
    log.scrollTop = log.scrollHeight;
    setStatus(online !== false);
  };
  paint();

  $('.tutor-tabs', panel).onclick = (event) => {
    const tab = event.target.closest('[data-tutor]');
    if (!tab || tab.dataset.tutor === current || busy) return;
    current = tab.dataset.tutor;
    sfx.play('click');
    paint();
  };
  $('#tutor-close').onclick = () => toggleTutor(false);
  $('#tutor-clear').onclick = () => { controller?.abort(); state[TUTORS[current].chatKey] = []; save(); paint(); };
  $('#tutor-quick').onclick = (event) => {
    const button = event.target.closest('[data-quick]');
    if (button) send(TUTORS[current].quick[Number(button.dataset.quick)][1]);
  };
  $('#tutor-projects').onclick = (event) => {
    const button = event.target.closest('[data-project]');
    if (button) openProject(button.dataset.project);
  };
  $('#tutor-form').onsubmit = (event) => { event.preventDefault(); send(input.value); };
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(input.value); } });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });

  async function send(raw) {
    const text = String(raw).trim().slice(0, 2000);
    if (!text || busy) return;
    const t = TUTORS[current];
    const chat = chatOf(t);
    busy = true;
    input.value = '';
    input.style.height = 'auto';
    sfx.play('click');
    chat.push({ role: 'user', content: text });
    log.append(bubble(t, 'user', text));
    const reply = bubble(t, 'assistant', '');
    reply.classList.add('typing');
    reply.querySelector('.msg-body').innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    log.append(reply);
    log.scrollTop = log.scrollHeight;
    const body = reply.querySelector('.msg-body');
    const context = contextProvider() || {};
    let answer = '';
    const show = () => { body.innerHTML = renderMessage(answer); log.scrollTop = log.scrollHeight; };

    const goOffline = async () => {
      setStatus(false);
      const full = t.offline(text, context);
      for (let index = 0; index < full.length; index += 3) {
        answer = full.slice(0, index + 3);
        show();
        await new Promise((resolve) => setTimeout(resolve, 12));
      }
      answer = full;
    };

    try {
      if (!(await checkHealth())) await goOffline();
      else {
        controller = new AbortController();
        setStatus(true);
        try {
          const result = await sampler(buildPrompt(t, chat.slice(-12), context), {
            signal: controller.signal, cache: false,
            onText: ({ text: whole }) => { answer = whole; show(); },
          });
          answer = result.text;
          if (result.truncated) answer += '\n\n(…a resposta ficou longa demais e foi cortada.)';
        } catch (failure) {
          const code = failure?.code || 'upstream_error';
          if (code === 'cancelled') answer = failure.text || answer || '(conversa interrompida)';
          else if (code === 'refused') answer = t.refusal;
          else if (code === 'rate_limited') answer = (failure.text ? failure.text + '\n\n' : '') + 'Muitas perguntas em pouco tempo. Espere um pouco e pergunte de novo.';
          else if (PERMANENT.has(code)) { online = false; sampler = null; answer = ''; await goOffline(); }
          else answer = (failure.text || answer) ? `${failure.text || answer}\n\n(a conexão caiu no meio da resposta)` : 'A conexão caiu. Pergunte de novo.';
        }
        if (!answer.trim()) answer = 'A resposta se perdeu no caminho. Pergunte de novo.';
      }
    } catch (error) {
      if (error.name === 'AbortError') answer = answer || '(conversa interrompida)';
      else { online = false; await goOffline(); }
    }
    controller = null;
    reply.classList.remove('typing');
    show();
    chat.push({ role: 'assistant', content: answer });
    state[t.chatKey] = chat.slice(-40);
    save();
    sfx.play('merit');
    busy = false;
  }
}

function setStatus(isOnline) {
  const el = $('#tutor-status');
  if (!el) return;
  const t = TUTORS[current];
  el.textContent = `${t.place} · ${isOnline ? 'online' : 'modo offline'}`;
  el.title = isOnline ? 'Respostas geradas pelo Claude da sua conta' : 'Sem acesso ao Claude nesta visita: respostas locais e limitadas';
  el.classList.toggle('off', !isOnline);
}

/** Abre ou fecha o painel. `who` escolhe a tutora ('kurisu' ou 'monika'). */
export function toggleTutor(open, who) {
  const panel = $('#tutor');
  if (who && TUTORS[who] && who !== current && !busy) { current = who; paint(); }
  const show = open ?? panel.hidden;
  panel.hidden = !show;
  document.body.classList.toggle('tutor-open', show);
  if (show) {
    checkHealth().then(setStatus);
    setTimeout(() => $('#tutor-input')?.focus({ preventScroll: true }), 80);
    const log = $('#tutor-log');
    if (log) log.scrollTop = log.scrollHeight;
  }
}
