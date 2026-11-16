# Academia Pyra — versão publicada como artefato

Publicada em https://claude.ai/artifact/Wvj97H2v9hXGXRwX7scMtc

`index.html` é o fragmento da página (sem `<html>`/`<head>`/`<body>`: o claude.ai acrescenta o esqueleto). Os demais arquivos vão como arquivos de apoio, com os mesmos caminhos. A única capacidade declarada é `sample` (as tutoras respondem pelo Claude de quem joga).

## Recolocar o Pyodide

Os arquivos grandes do Pyodide 0.29.2 não ficam no repositório. Para recriá-los:

```bash
npm pack pyodide@0.29.2 && tar xzf pyodide-0.29.2.tgz
```

```bash
cp package/pyodide.js package/pyodide.asm.js package/pyodide.asm.wasm package/pyodide-lock.json vendor/pyodide/ && cp package/python_stdlib.zip vendor/pyodide/python_stdlib.wasm
```

O `python_stdlib.zip` vai com extensão `.wasm` porque artefatos não servem `.zip`; o Pyodide recebe o caminho por `stdLibURL`.

## Rodar localmente

```bash
python3 -m http.server 8765
```

Abra http://localhost:8765 (o `index.html` funciona direto no navegador mesmo sem o esqueleto).
