/** Python de verdade, fora da thread da interface. Nenhum código é enviado a servidores. */
export class PythonRunner {
  constructor() {
    this.worker = null;
    this.pending = null;
    this.sequence = 0;
    this.ready = false;
  }

  get busy() { return !!this.pending; }

  /** Baixa o interpretador em segundo plano para a primeira execução ser rápida. */
  warm() {
    if (this.pending || this.ready) return;
    this._send({ type: 'warm' }, { onStatus: () => {}, runLimit: 90000 }).then(() => { this.ready = true; }, () => {});
  }

  run(code, { check = '', expected, inputs = [], interactive = false, seed, onStatus = () => {} } = {}) {
    if (this.pending) {
      if (this.pending.kind === 'warm') return this.pending.promise.then(() => this.run(code, { check, expected, inputs, interactive, seed, onStatus }), () => this.run(code, { check, expected, inputs, interactive, seed, onStatus }));
      return Promise.reject(new Error('Já há um programa em execução. Interrompa-o primeiro.'));
    }
    return this._send({
      type: 'run', code: String(code), check: String(check || ''),
      expected: typeof expected === 'string' ? expected : null,
      inputs: inputs.map(String), interactive: !!interactive,
      seed: Number.isFinite(seed) ? seed : null,
    }, { onStatus, runLimit: 8000 });
  }

  _send(message, { onStatus, runLimit }) {
    if (typeof Worker === 'undefined') return Promise.reject(new Error('Este navegador não oferece suporte ao laboratório. Abra o site em um navegador atualizado.'));
    const id = ++this.sequence;
    let pendingRef;
    const promise = new Promise((resolve, reject) => {
      const status = (text) => { try { onStatus(text); } catch {} };
      pendingRef = this.pending = { id, kind: message.type, resolve, reject, status, timer: null, promise: null };
      const timeout = (milliseconds, text) => {
        clearTimeout(this.pending?.timer);
        if (this.pending) this.pending.timer = setTimeout(() => this.abort(text), milliseconds);
      };
      timeout(90000, 'O carregamento do Python demorou demais. Confira a conexão e execute novamente.');
      if (message.type === 'run') status(this.ready ? 'Preparando execução…' : 'Carregando Python pela primeira vez…');
      try {
        if (!this.worker) {
          this.worker = new Worker(new URL('../python-worker.js', import.meta.url));
          this.worker.onmessage = ({ data }) => {
            const pending = this.pending;
            if (!pending || data.id !== pending.id) return;
            if (data.type === 'status') {
              pending.status(data.message);
              if (data.phase === 'running') { this.ready = true; timeout(pending.runLimit, 'Execução interrompida após 8 segundos. Confira se há um laço sem fim e tente novamente.'); }
              return;
            }
            if (data.type === 'fatal') { this.abort(data.error); return; }
            if (data.type === 'result') {
              clearTimeout(pending.timer);
              this.pending = null;
              this.ready = true;
              pending.resolve(data.result);
            }
          };
          this.worker.onerror = (event) => {
            event.preventDefault();
            this.abort('Não foi possível iniciar o Python. Confira sua conexão e execute novamente.');
          };
          this.worker.onmessageerror = () => this.abort('A execução perdeu a conexão com o laboratório. Execute novamente.');
        }
        this.pending.runLimit = runLimit;
        this.worker.postMessage({ id, ...message });
      } catch (error) {
        this.abort('Não foi possível abrir o laboratório: ' + error.message);
      }
    });
    if (pendingRef) pendingRef.promise = promise;
    return promise;
  }

  abort(message) {
    const pending = this.pending;
    this.pending = null;
    this.ready = false;
    if (pending) clearTimeout(pending.timer);
    this.worker?.terminate();
    this.worker = null;
    pending?.reject(new Error(message));
  }

  stop() { this.abort('Execução interrompida. Você pode editar o código e executar novamente.'); }
}
