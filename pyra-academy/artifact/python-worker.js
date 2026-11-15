/* Worker clássico: o interpretador e o código da pessoa ficam fora da thread da interface. */
// Pyodide 0.29.2 é publicado junto com o jogo (o artefato não deixa baixar de outros sites).
const CDN = new URL('./pyodide/', self.location.href).href;

// O artefato não serve .zip: a biblioteca padrão vem em base64 num .txt e é
// entregue ao Pyodide como se fosse o python_stdlib.zip original.
const realFetch = self.fetch.bind(self);
let stdlib;
self.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url || '';
  if (url.split('?')[0].endsWith('/python_stdlib.zip')) {
    stdlib ??= realFetch(CDN + 'python_stdlib.zip.b64.txt')
      .then((response) => { if (!response.ok) throw new Error('stdlib ' + response.status); return response.text(); })
      .then((text) => { const raw = atob(text.trim()); const bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i); return bytes; })
      .catch((error) => { stdlib = null; throw error; });
    return stdlib.then((bytes) => new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/zip' } }));
  }
  return realFetch(input, init);
};
let runtimePromise;

const BOOTSTRAP = `
import builtins as _pyra_builtins
import contextlib as _pyra_contextlib
import io as _pyra_io
import json as _pyra_json
import linecache as _pyra_linecache
import random as _pyra_random
import traceback as _pyra_traceback

_PYRA_FILE = 'seu_codigo.py'
_PYRA_LIMIT = 20000

class _PyraNeedInput(BaseException):
    pass

class _PyraTerminal:
    def __init__(self):
        self.parts = []
        self.size = 0
    def add(self, kind, text):
        if not text:
            return
        remaining = _PYRA_LIMIT - self.size
        if len(text) > remaining:
            if remaining > 0:
                self._push(kind, text[:remaining])
            self.size = _PYRA_LIMIT
            raise RuntimeError('Saída limitada a 20.000 caracteres. Reduza os prints ou confira seu laço.')
        self._push(kind, text)
        self.size += len(text)
    def _push(self, kind, text):
        if self.parts and self.parts[-1][0] == kind:
            self.parts[-1][1] += text
        else:
            self.parts.append([kind, text])
    def text(self, kind):
        return ''.join(text for k, text in self.parts if k == kind)

class _PyraStream(_pyra_io.TextIOBase):
    def __init__(self, terminal, kind):
        self._terminal = terminal
        self._kind = kind
    def writable(self):
        return True
    def write(self, text):
        self._terminal.add(self._kind, str(text))
        return len(text)

def _pyra_make_input(terminal, inputs, interactive):
    queue = [str(item) for item in inputs]
    def _input(prompt=''):
        terminal.add('prompt', str(prompt))
        if not queue:
            if interactive:
                raise _PyraNeedInput()
            raise EOFError('O programa chamou input() mais vezes do que o número de entradas disponíveis.')
        value = queue.pop(0)
        terminal.add('echo', value + '\\n')
        return value
    return _input

def _pyra_format(error):
    frames = [f for f in _pyra_traceback.extract_tb(error.__traceback__) if f.filename == _PYRA_FILE]
    lines = []
    line_number = None
    if frames:
        lines.append('Traceback (most recent call last):\\n')
        lines.extend(_pyra_traceback.format_list(frames))
        line_number = frames[-1].lineno
    if isinstance(error, SyntaxError) and error.filename == _PYRA_FILE:
        line_number = error.lineno
    lines.extend(_pyra_traceback.format_exception_only(type(error), error))
    return ''.join(lines).strip()[-6000:], line_number

def _pyra_execute(code, check, expected, inputs_json, interactive, seed):
    terminal = _PyraTerminal()
    out = _PyraStream(terminal, 'out')
    err = _PyraStream(terminal, 'err')
    safe_builtins = dict(vars(_pyra_builtins))
    safe_builtins['input'] = _pyra_make_input(terminal, _pyra_json.loads(inputs_json), interactive)
    namespace = {'__name__': '__main__', '__builtins__': safe_builtins}
    assessed = bool(check) or expected is not None
    result = {'parts': [], 'stdout': '', 'passed': None, 'error': None, 'errorLine': None, 'needInput': False, 'failure': None}
    _pyra_linecache.cache[_PYRA_FILE] = (len(code), None, code.splitlines(True), _PYRA_FILE)
    if seed is not None:
        _pyra_random.seed(seed)
    def finish():
        result['parts'] = terminal.parts
        result['stdout'] = terminal.text('out')
        return _pyra_json.dumps(result, ensure_ascii=False)
    try:
        with _pyra_contextlib.redirect_stdout(out), _pyra_contextlib.redirect_stderr(err):
            exec(compile(code, _PYRA_FILE, 'exec'), namespace, namespace)
    except _PyraNeedInput:
        result['needInput'] = True
        return finish()
    except SystemExit:
        pass
    except BaseException as error:
        result['error'], result['errorLine'] = _pyra_format(error)
        result['passed'] = False if assessed else None
        return finish()
    if assessed:
        stdout = terminal.text('out')
        try:
            if expected is not None and stdout.rstrip() != expected.rstrip():
                raise AssertionError('A saída ainda não corresponde ao resultado esperado. Compare os valores, a ordem e a formatação.')
            if check:
                namespace['__saida__'] = stdout
                namespace['__fonte__'] = code
                sink = _PyraTerminal()
                with _pyra_contextlib.redirect_stdout(_PyraStream(sink, 'out')), _pyra_contextlib.redirect_stderr(_PyraStream(sink, 'err')):
                    exec(compile(check, 'testes.py', 'exec'), namespace, namespace)
            result['passed'] = True
        except BaseException as error:
            result['passed'] = False
            if isinstance(error, AssertionError):
                detail = str(error) or 'Um dos testes não passou. Releia o enunciado com calma.'
            elif isinstance(error, NameError):
                detail = 'Os testes procuraram um nome que não existe no seu código: ' + str(error) + '. Confira os nomes pedidos no enunciado.'
            else:
                detail = 'Os testes encontraram um erro ao usar seu código: ' + type(error).__name__ + ': ' + str(error)
            result['failure'] = detail[:2000]
    return finish()
`;

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      importScripts(CDN + 'pyodide.js');
      const pyodide = await loadPyodide({ indexURL: CDN });
      pyodide.runPython(BOOTSTRAP);
      return pyodide;
    })();
  }
  return runtimePromise;
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  let pyodide;
  try {
    if (type !== 'warm') self.postMessage({ id, type: 'status', phase: 'loading', message: runtimePromise ? 'Preparando Python…' : 'Carregando Python… a primeira vez pode levar alguns segundos.' });
    pyodide = await getRuntime();
  } catch {
    runtimePromise = null;
    self.postMessage({ id, type: 'fatal', error: 'Não foi possível carregar o Python neste visualizador. Recarregue a página e execute novamente.' });
    return;
  }
  if (type === 'warm') { self.postMessage({ id, type: 'result', result: { warmed: true } }); return; }
  self.postMessage({ id, type: 'status', phase: 'running', message: 'Executando seu código…' });
  let execute;
  try {
    execute = pyodide.globals.get('_pyra_execute');
    const seed = Number.isFinite(data.seed) ? data.seed : undefined;
    const result = JSON.parse(execute(data.code, data.check, data.expected ?? undefined, JSON.stringify(data.inputs || []), !!data.interactive, seed));
    self.postMessage({ id, type: 'result', result });
  } catch (error) {
    self.postMessage({ id, type: 'fatal', error: 'O laboratório encontrou um erro. Execute novamente. ' + String(error.message).slice(0, 500) });
  } finally {
    execute?.destroy();
  }
};
