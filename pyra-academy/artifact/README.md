# Academia Pyra — versão artefato do claude.ai

Esta pasta é a versão do jogo publicada como artefato no claude.ai:
https://claude.ai/artifact/Wvj97H2v9hXGXRwX7scMtc

Diferenças em relação à versão com servidor (`../public` + `../server.js`):

- **Kurisu** responde pelo próprio Claude, na conta de quem joga (capacidade `sample`), sem chave de API. A personalidade está em `js/kurisu-persona.js`. Há voz opcional (capacidade `tts`).
- **Progresso** fica salvo na conta do jogador (capacidade `db`, documento privado em `data/users/<id>/save/progress`), com cópia no navegador.
- **Confirmações** usam uma caixa da própria página (o artefato não mostra `confirm()`).
- **Exportar progresso** usa a capacidade `downloads`.
- **Python (Pyodide 0.29.2)** é servido junto do artefato, porque o artefato não baixa arquivos de outros sites. Como artefatos não servem `.zip`, a biblioteca padrão vai em base64 (`pyodide/python_stdlib.zip.b64.txt`) e o `python-worker.js` a decodifica.

## Recolocar os arquivos do Pyodide

Os arquivos grandes do Pyodide não estão no repositório. Para recriá-los:

```bash
npm pack pyodide@0.29.2 && tar xzf pyodide-0.29.2.tgz
```

```bash
cp package/pyodide.js package/pyodide.asm.js package/pyodide.asm.wasm package/pyodide-lock.json pyodide/ && base64 -w0 package/python_stdlib.zip > pyodide/python_stdlib.zip.b64.txt
```

A página é `page.html` (sem `<html>`/`<head>`/`<body>`: o claude.ai acrescenta o esqueleto ao publicar). Os demais arquivos são publicados como arquivos de apoio com os mesmos caminhos.
