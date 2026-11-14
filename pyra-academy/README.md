# Academia Pyra

Uma visual novel para aprender Python. Você recebe a Vaga 006 de uma escola de elite para prodígios da programação, entra na Sala Ômega sem nunca ter escrito uma linha de código e precisa subir no ranking de Mérito enfrentando cinco rivais — programando de verdade.

É a evolução do site Pyra original (12 aulas em formato de painel). O interpretador Python continua rodando inteiro no navegador; mudou todo o resto.

## O que tem no jogo

- **História e rivais.** Prólogo jogável (portão, corredor, sala), cinco rivais com personalidade própria, escolhas de diálogo, conversas na sala que mudam conforme você vence, e dois finais (o verdadeiro exige o 1º lugar).
- **5 capítulos, 17 aulas, 51 exercícios.** Cada aula tem explicação em seções, um **exemplo de jogo** executável, erros comuns, resumo, três exercícios (aquecimento, prática e desafio bônus) e duas perguntas.
- **Provas de Mérito.** Ao fim de cada capítulo, um duelo cronometrado contra o rival, com aposta opcional. Vencer tira 100 pontos do adversário; perder com código correto rende mérito de honra e abre a revanche.
- **Laboratório e Arcade.** Editor livre com `input()` funcionando no terminal e 7 jogos completos em Python para jogar e modificar (adivinhe o número, pedra-papel-tesoura, arena por turnos, jogo da velha, forca, labirinto, Jogo da Vida).
- **Laboratório 404.** Chat com a tutora Makise Kurisu, que enxerga o exercício, o código e o erro abertos na tela. Usa a API quando o servidor tem uma chave; sem chave, responde em modo offline com regras locais.
- **Guia de consulta** com busca, tradução dos erros do Python para português e destaque da linha com problema.

Conteúdo por capítulo: 1) print, variáveis, números, strings, `input()`; 2) booleanos, `if/elif/else`, `random`; 3) `for`, `while`, `break`/`continue` e o game loop; 4) listas, dicionários, grades; 5) funções, parâmetros e retornos, projeto final (arena).

## Como rodar

Requer Node.js 18 ou mais recente.

```bash
npm install
```

```bash
npm start
```

Abra http://localhost:8000. Para escolher outra porta, defina `PORT`.

### Ativando a tutora com IA

A API da tutora usa a API da Anthropic pelo SDK oficial. Defina a chave **no servidor** antes de iniciar:

```bash
ANTHROPIC_API_KEY=sua-chave npm start
```

A chave nunca vai para o navegador. Sem ela o jogo funciona normalmente e a Kurisu responde em modo offline (dicas do exercício, explicação de erros e fichas do guia).

Variáveis opcionais:

| Variável | Padrão | Para quê |
|---|---|---|
| `KURISU_MODEL` | `claude-opus-5-5` | Modelo usado. Troque por `claude-sonnet-5-5` ou `claude-haiku-5-5` para reduzir custo. |
| `KURISU_EFFORT` | `low` | Profundidade de raciocínio (`low`, `medium`, `high`…). |
| `KURISU_MAX_TOKENS` | `8000` | Teto de tokens por resposta. |
| `KURISU_RATE_MAX` | `30` | Perguntas por IP a cada 5 minutos. |
| `KURISU_FALLBACKS` | ligado | `off` desativa o fallback de recusa do lado do servidor. |
| `KURISU_DISABLED` | — | `1` força o modo offline. |

### Hospedagem estática

A pasta `public/` funciona sozinha em qualquer hospedagem de arquivos estáticos (por exemplo `python -m http.server` dentro dela). Nesse caso não existe `/api/kurisu` e a tutora fica no modo offline. Para ter a tutora com IA, hospede o `server.js` em um serviço que rode Node.

Não abra `index.html` direto por `file://`: módulos JavaScript e Web Workers precisam de HTTP.

## A API

`POST /api/kurisu` recebe JSON e responde por streaming (`text/event-stream`):

```json
{
  "messages": [{ "role": "user", "content": "Por que deu erro?" }],
  "context": { "mode": "aula", "lesson": "A primeira linha", "task": "…", "code": "print(\"Olá)", "error": "SyntaxError: …" }
}
```

Eventos: `delta` (`{"text": "…"}`), `done` e `error`. Erros antes do início do streaming voltam como JSON com `code` (`invalid`, `rate_limited`, `no_credentials`, `upstream`…). `GET /api/health` informa se a IA está disponível.

Cuidados já implementados: validação e limites de tamanho (o que passa do limite é recusado, não cortado), limite de requisições por IP, a personalidade fica em um prompt de sistema fixo (com cache) e o contexto do jogo entra como dados na mensagem.

A personalidade está em `server/kurisu-persona.js`.

## Estrutura

```
server.js                  servidor estático + /api/kurisu
server/kurisu-persona.js   prompt de sistema da tutora
public/
  index.html, css/main.css
  python-worker.js         Pyodide em Web Worker (execução, input simulado, testes)
  js/
    main.js                título, barra superior, rotas e transições
    vn.js, story.js        motor da visual novel e roteiro
    screens.js             sala, missões, aula, prova, ranking, laboratório, guia
    editor.js, runner.js   editor com realce, terminal e verificação
    tutor.js               chat da Kurisu (online e offline)
    state.js               progresso, mérito e ranking (localStorage)
    art/                   personagens e cenários gerados em SVG
    content/               c1–c5 (aulas e provas), arcade, guia
tools/validate.mjs         validação do conteúdo com CPython
```

Sem etapa de build. A única dependência é `@anthropic-ai/sdk`, usada só pelo servidor.

## Validação do conteúdo

```bash
npm run validate
```

Roda, em CPython e com o mesmo código Python do laboratório, as 200 verificações do conteúdo: toda solução de referência passa nos testes, todo código inicial falha (ninguém conclui um exercício sem mexer nele), e todos os exemplos das aulas, do guia e do Arcade executam sem erro. Requer `python3`.

## Limites conhecidos

- O Python roda no navegador (Pyodide 0.29.2, baixado da CDN jsDelivr no primeiro uso; depois disso o navegador guarda em cache). Não há instalação de pacotes nem acesso a arquivos.
- `input()` é simulado: no Laboratório o programa é reexecutado a cada resposta, com a mesma semente de sorteio, então jogos com `random` se comportam de forma consistente durante uma partida. Programas que dependem do relógio podem variar.
- Execução limitada a 8 segundos e 20.000 caracteres de saída.
- O progresso fica no `localStorage` do navegador: não sincroniza entre dispositivos.
- Os testes verificam saídas e condições explícitas; não medem estilo nem originalidade.

## Créditos

História, escola, rivais, ilustrações em SVG e material didático foram criados para este projeto. O clima de escola meritocrática com ranking e rivais é inspirado no gênero. A tutora do Laboratório 404 usa, como homenagem de fã, a personalidade de Makise Kurisu (Steins;Gate), a pedido do autor do projeto; o retrato é um desenho próprio.

Referências técnicas: [tutorial oficial do Python](https://docs.python.org/pt-br/3/tutorial/) e [Pyodide](https://pyodide.org/en/0.29.2/usage/index.html).
