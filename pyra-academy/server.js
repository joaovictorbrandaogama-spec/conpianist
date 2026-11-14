// Academia Pyra — servidor estático + API da tutora Kurisu.
// Uso: ANTHROPIC_API_KEY=... node server.js   (porta padrão 8000)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { KURISU_PERSONA, REFUSAL_LINE } from './server/kurisu-persona.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, 'public');
const PORT = Number(process.env.PORT) || 8000;
const MODEL = process.env.KURISU_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.KURISU_EFFORT || 'low';
const MAX_TOKENS = Number(process.env.KURISU_MAX_TOKENS) || 8000;
// Fallback de recusa do lado do servidor: só existe nestas famílias de modelo.
const USE_FALLBACKS = process.env.KURISU_FALLBACKS !== 'off'
  && /^claude-(opus-5|fable-5|mythos-5|sonnet-5-5)/.test(MODEL);

const LIMITS = { body: 96_000, messages: 24, message: 4_000, code: 20_000, field: 6_000 };
const RATE = { windowMs: 5 * 60_000, max: Number(process.env.KURISU_RATE_MAX) || 30 };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

// O SDK resolve credenciais nesta ordem: ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN
// ou um perfil criado por `ant auth login`.
function hasCredentials() {
  if (process.env.KURISU_DISABLED === '1') return false;
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE) return true;
  try { return fs.existsSync(path.join(os.homedir(), '.config', 'anthropic')); } catch { return false; }
}

let client = null;
const getClient = () => (client ??= new Anthropic());

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  if (recent.length >= RATE.max) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [key, list] of hits) if (!list.some((t) => now - t < RATE.windowMs)) hits.delete(key);
  return false;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > LIMITS.body) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

class Invalid extends Error {}

/** Valida o corpo e devolve as mensagens no formato da API. Nada é truncado: o que passa do limite é recusado. */
export function buildMessages(payload) {
  if (!payload || typeof payload !== 'object') throw new Invalid('Corpo inválido.');
  const { messages, context = {} } = payload;
  if (!Array.isArray(messages) || messages.length === 0) throw new Invalid('Envie ao menos uma mensagem.');
  if (messages.length > LIMITS.messages) throw new Invalid('Conversa longa demais. Comece uma nova.');
  const clean = [];
  for (const item of messages) {
    if (!item || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') throw new Invalid('Mensagem inválida.');
    const content = item.content.trim();
    if (!content) continue;
    if (content.length > LIMITS.message) throw new Invalid('Mensagem longa demais.');
    const last = clean[clean.length - 1];
    if (last && last.role === item.role) last.content += '\n\n' + content;
    else clean.push({ role: item.role, content });
  }
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== 'user') throw new Invalid('A última mensagem precisa ser da pessoa jogadora.');

  if (context === null || typeof context !== 'object' || Array.isArray(context)) throw new Invalid('Contexto inválido.');
  const fields = [
    ['modo', context.mode, LIMITS.field], ['estudante', context.playerName, 80],
    ['aula', context.lesson, LIMITS.field], ['conceito', context.concept, LIMITS.field],
    ['exercicio', context.exercise, LIMITS.field], ['enunciado', context.task, LIMITS.field],
    ['codigo_atual', context.code, LIMITS.code], ['saida_do_terminal', context.output, LIMITS.field],
    ['erro', context.error, LIMITS.field],
  ];
  const lines = [];
  for (const [name, value, max] of fields) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string') throw new Invalid('Contexto inválido.');
    if (value.length > max) throw new Invalid(`O campo ${name} passa do limite de ${max} caracteres.`);
    lines.push(`<${name}>\n${value}\n</${name}>`);
  }
  if (lines.length) {
    const last = clean[clean.length - 1];
    last.content = `<contexto_do_jogo>\n${lines.join('\n')}\n</contexto_do_jogo>\n\n${last.content}`;
  }
  return clean;
}

function startStream(messages, withFallbacks) {
  const params = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: EFFORT },
    system: [{ type: 'text', text: KURISU_PERSONA, cache_control: { type: 'ephemeral' } }],
    messages,
  };
  if (withFallbacks) {
    return getClient().beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  }
  return getClient().messages.stream(params);
}

async function handleKurisu(req, res) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'local';
  if (!hasCredentials()) return sendJson(res, 503, { code: 'no_credentials', error: 'A API da tutora não está configurada neste servidor.' });
  if (rateLimited(ip)) return sendJson(res, 429, { code: 'rate_limited', error: 'Muitas perguntas em pouco tempo. Respire e tente de novo em alguns minutos.' });

  let messages;
  try {
    messages = buildMessages(JSON.parse(await readBody(req)));
  } catch (error) {
    if (error.status === 413) return sendJson(res, 413, { code: 'too_large', error: 'Requisição grande demais.' });
    return sendJson(res, 400, { code: 'invalid', error: error instanceof Invalid ? error.message : 'JSON inválido.' });
  }

  let opened = false;
  const open = () => {
    if (opened) return;
    opened = true;
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
  };
  const emit = (event, data) => { open(); res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };

  let stream = null;
  req.on('close', () => { if (!res.writableEnded) stream?.abort(); });

  const run = async (withFallbacks) => {
    stream = startStream(messages, withFallbacks);
    stream.on('text', (delta) => emit('delta', { text: delta }));
    return stream.finalMessage();
  };

  try {
    let final;
    try {
      final = await run(USE_FALLBACKS);
    } catch (error) {
      // Se o recurso beta de fallback não for aceito para esta conta/modelo, tenta uma vez sem ele.
      if (USE_FALLBACKS && !opened && error instanceof Anthropic.BadRequestError) final = await run(false);
      else throw error;
    }
    if (final.stop_reason === 'refusal') emit('delta', { text: (opened ? '\n\n' : '') + REFUSAL_LINE });
    emit('done', { stop_reason: final.stop_reason, model: final.model });
    res.end();
  } catch (error) {
    let status = 502;
    let code = 'upstream';
    let message = 'A tutora não conseguiu responder agora. Tente novamente.';
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      status = 503; code = 'no_credentials'; message = 'A chave da API foi recusada. Confira a configuração do servidor.';
    } else if (error instanceof Anthropic.RateLimitError) {
      status = 429; code = 'rate_limited'; message = 'A API está no limite de uso. Tente de novo em instantes.';
    } else if (error instanceof Anthropic.BadRequestError) {
      status = 400; code = 'invalid';
    } else if (error instanceof Anthropic.APIConnectionError) {
      code = 'network'; message = 'Sem conexão com a API da tutora.';
    } else if (error instanceof Anthropic.APIError) {
      code = 'upstream';
    }
    if (!(error instanceof Anthropic.APIError)) console.error('[kurisu]', error);
    else console.error('[kurisu]', error.status, error.message);
    if (opened) { emit('error', { code, error: message }); res.end(); }
    else sendJson(res, status, { code, error: message });
  }
}

function serveStatic(req, res, pathname) {
  let relative;
  try { relative = decodeURIComponent(pathname); } catch { res.writeHead(400).end(); return; }
  if (relative.endsWith('/')) relative += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, relative));
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403).end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado.');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  });
}

export const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api/health') return sendJson(res, 200, { ok: true, ai: hasCredentials(), model: MODEL });
  if (pathname === '/api/kurisu') {
    if (req.method !== 'POST') return sendJson(res, 405, { code: 'method', error: 'Use POST.' });
    handleKurisu(req, res).catch((error) => { console.error(error); if (!res.headersSent) sendJson(res, 500, { code: 'internal', error: 'Erro interno.' }); else res.end(); });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  serveStatic(req, res, pathname);
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    console.log(`Academia Pyra em http://localhost:${PORT}`);
    console.log(hasCredentials()
      ? `Tutora Kurisu: online (modelo ${MODEL}${USE_FALLBACKS ? ', fallback de recusa ativo' : ''}).`
      : 'Tutora Kurisu: modo offline (defina ANTHROPIC_API_KEY para ativar a API).');
  });
}
