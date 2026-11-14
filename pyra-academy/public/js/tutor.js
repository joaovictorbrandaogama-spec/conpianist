// Laboratório 404: conversa com a tutora Kurisu.
// Online: POST /api/kurisu (respostas por streaming). Offline: respostas locais por regras.
import { $, esc, icon, highlight, explainError, sfx } from './util.js';
import { avatar } from './art/characters.js';
import { codex } from './content/codex.js';
import { state, save } from './state.js';

let online = null;            // null = ainda não verificado
let contextProvider = () => ({ mode: 'sala' });
let busy = false;
let controller = null;

export const setTutorContext = (provider) => { contextProvider = provider || (() => ({ mode: 'sala' })); };

async function checkHealth() {
  if (online !== null) return online;
  try {
    const response = await fetch('api/health', { cache: 'no-store' });
    const data = response.ok ? await response.json() : null;
    online = !!data?.ai;
  } catch { online = false; }
  return online;
}

// ---------- modo offline ----------
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const OPEN = ['Hmph.', 'Tá, escuta.', 'Preste atenção, que eu não vou repetir.', 'Vamos por partes, como em qualquer experimento.'];
const CLOSE = ['Rode de novo e observe o que muda.', 'Hipótese, experimento, conclusão. Vai.', 'N-não é como se eu estivesse torcendo por você.', 'Teste e me traga o resultado.'];

function offlineAnswer(question, context) {
  const q = question.toLowerCase();
  if (/christina|assistente|zumbi/.test(q)) return 'Não tem -tina nenhum! É Kurisu. Makise Kurisu. Agora volte para o código.';
  if (/quem (é|e) voc|seu nome|kurisu/.test(q) && q.length < 60) return 'Makise Kurisu, neurocientista. Estou aqui estudando como pessoas aprendem sob pressão. Você é o meu melhor conjunto de dados, então trate de aprender direito.';
  if (/obrigad|valeu|thanks/.test(q)) return 'N-não precisa agradecer! Eu só não suporto ver código quebrado. …De nada.';

  const error = context.error && explainError(context.error);
  if (error && /erro|error|por que|porque|não funciona|nao funciona|ajuda|bug|quebr|problema|explica/.test(q)) {
    return `${pick(OPEN)} O Python já te contou o que houve; você só precisa ler. ${error} ${pick(CLOSE)}`;
  }
  if (context.mode === 'duelo' && /dica|ajuda|resposta|solu|como/.test(q)) {
    return 'Você está no meio de uma Prova de Mérito. Se eu te der a resposta, arruíno os dados do experimento e a sua vitória. Releia o enunciado, liste as variáveis que você precisa e escreva uma linha por vez.';
  }
  if (context.hint && /dica|pista|ajuda|travei|não sei|nao sei|como (faço|faz|eu)|começ|comec/.test(q)) {
    return `${pick(OPEN)} Uma pista, e só uma: ${context.hint} ${pick(CLOSE)}`;
  }
  const entry = codex.find((item) => item.keys.some((key) => q.includes(key)));
  if (entry) {
    return `${pick(OPEN)} ${entry.text}\n\n\`\`\`python\n${entry.code}\n\`\`\`\n${pick(CLOSE)}`;
  }
  if (error) return `Olhando o seu terminal: ${error} ${pick(CLOSE)}`;
  if (context.hint) return `Não entendi bem a pergunta, mas olhando o que você está fazendo: ${context.hint}`;
  return 'Estou sem conexão com o servidor do laboratório, então só consigo responder sobre os tópicos do guia: print, variáveis, operadores, strings, input, if, random, for, while, listas, dicionários, grades, funções e erros. Pergunte citando um deles — ou me mostre um erro.';
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

function bubble(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.innerHTML = role === 'assistant' ? `<span class="msg-avatar">${avatar('kurisu')}</span><div class="msg-body">${renderMessage(text)}</div>` : `<div class="msg-body">${renderMessage(text)}</div>`;
  return el;
}

const QUICK = [
  ['Explique este erro', 'Pode explicar o erro que apareceu no meu terminal?'],
  ['Uma dica', 'Estou travando neste exercício. Pode dar uma dica sem entregar a resposta?'],
  ['Por que funciona?', 'Meu código funcionou, mas não entendi direito por quê. Pode explicar o que cada parte faz?'],
];

export function mountTutor() {
  const panel = $('#tutor');
  panel.innerHTML = `
    <div class="tutor-head">
      <span class="tutor-face">${avatar('kurisu', 'smirk')}</span>
      <div><strong>Makise Kurisu</strong><small id="tutor-status">Laboratório 404</small></div>
      <button type="button" class="icon-btn" id="tutor-clear" title="Limpar a conversa" aria-label="Limpar a conversa">${icon('reset')}</button>
      <button type="button" class="icon-btn" id="tutor-close" aria-label="Fechar o laboratório">${icon('x')}</button>
    </div>
    <div class="tutor-log" id="tutor-log" aria-live="polite"></div>
    <div class="tutor-quick" id="tutor-quick">${QUICK.map(([label], index) => `<button type="button" data-quick="${index}">${esc(label)}</button>`).join('')}</div>
    <form class="tutor-form" id="tutor-form">
      <textarea id="tutor-input" rows="1" maxlength="2000" placeholder="Pergunte sobre Python…" aria-label="Pergunta para a Kurisu"></textarea>
      <button type="submit" class="btn gold" aria-label="Enviar">${icon('send')}</button>
    </form>`;

  const log = $('#tutor-log');
  const input = $('#tutor-input');
  const paintLog = () => {
    log.innerHTML = '';
    if (!state.chat.length) log.append(bubble('assistant', 'Hmph. Então você veio mesmo. Mostre o erro, diga onde travou ou pergunte sobre qualquer coisa de Python. Eu vejo o código que estiver aberto na sua tela.'));
    for (const message of state.chat) log.append(bubble(message.role, message.content));
    log.scrollTop = log.scrollHeight;
  };
  paintLog();

  $('#tutor-close').onclick = () => toggleTutor(false);
  $('#tutor-clear').onclick = () => { controller?.abort(); state.chat = []; save(); paintLog(); };
  $('#tutor-quick').onclick = (event) => {
    const button = event.target.closest('[data-quick]');
    if (button) send(QUICK[Number(button.dataset.quick)][1]);
  };
  $('#tutor-form').onsubmit = (event) => { event.preventDefault(); send(input.value); };
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(input.value); } });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });

  async function send(raw) {
    const text = String(raw).trim().slice(0, 2000);
    if (!text || busy) return;
    busy = true;
    input.value = '';
    input.style.height = 'auto';
    sfx.play('click');
    state.chat.push({ role: 'user', content: text });
    log.append(bubble('user', text));
    const reply = bubble('assistant', '');
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
      const full = offlineAnswer(text, context);
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
        const payload = {
          messages: state.chat.slice(-12).map(({ role, content }) => ({ role, content })),
          context: {
            mode: context.mode, playerName: state.name || undefined, lesson: context.lesson, concept: context.concept,
            exercise: context.exercise, task: context.task,
            code: context.code?.slice(0, 20000), output: context.output ? '(final da saída) ' + context.output.slice(-3000) : undefined,
            error: context.error?.slice(-3000),
          },
        };
        const response = await fetch('api/kurisu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
        if (!response.ok || !response.body) {
          const info = await response.json().catch(() => ({}));
          if (response.status === 429) answer = info.error || 'Muitas perguntas em pouco tempo. Espere um pouco.';
          else { if (info.code === 'no_credentials') online = false; await goOffline(); }
        } else {
          setStatus(true);
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let cut;
            while ((cut = buffer.indexOf('\n\n')) >= 0) {
              const chunk = buffer.slice(0, cut);
              buffer = buffer.slice(cut + 2);
              const event = /^event: (.+)$/m.exec(chunk)?.[1];
              const data = /^data: (.+)$/m.exec(chunk)?.[1];
              if (!data) continue;
              const parsed = JSON.parse(data);
              if (event === 'delta') { answer += parsed.text; show(); }
              else if (event === 'error') answer += (answer ? '\n\n' : '') + (parsed.error || 'A conexão com o laboratório caiu.');
            }
          }
          if (!answer.trim()) answer = 'Hmph. A resposta se perdeu no caminho. Pergunte de novo.';
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') answer = answer || '(conversa interrompida)';
      else { online = false; await goOffline(); }
    }
    controller = null;
    reply.classList.remove('typing');
    show();
    state.chat.push({ role: 'assistant', content: answer });
    state.chat = state.chat.slice(-40);
    save();
    sfx.play('merit');
    busy = false;
  }
}

function setStatus(isOnline) {
  const el = $('#tutor-status');
  if (!el) return;
  el.textContent = isOnline ? 'Lab 404 · online' : 'Lab 404 · modo offline';
  el.title = isOnline ? 'Respostas geradas pela API' : 'Sem API configurada: respostas locais e limitadas';
  el.classList.toggle('off', !isOnline);
}

export function toggleTutor(open) {
  const panel = $('#tutor');
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
