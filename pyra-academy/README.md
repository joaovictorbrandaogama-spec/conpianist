# Academia Pyra

Uma visual novel em 3D para aprender Python. Você é o protagonista — um rapaz com o nome que você escolher — e recebe a Vaga 006 de uma escola de elite para prodígios da programação, entra na Sala Ômega sem nunca ter escrito uma linha de código e precisa subir no ranking de Mérito enfrentando cinco rivais — programando de verdade.

Esta é a versão em **Three.js** da Academia Pyra: a escola virou um mundo 3D (portão, corredor, Sala Ômega, Laboratório 404 e arena), os personagens ganharam corpo e expressão, e a sala de aula agora é explorável. O interpretador Python continua rodando inteiro no navegador, e todo o conteúdo didático foi mantido.

## O que tem no jogo

- **Mundo em 3D.** Cinco cenários montados por código (nenhum modelo ou imagem externa): o portão ao anoitecer, o corredor ao pôr do sol, a Sala Ômega, o Laboratório 404 e a arena das provas. Iluminação com sombras, brilho (bloom), poeira dourada e céu estrelado.
- **História e rivais.** Prólogo jogável — você atravessa o portão e percorre o corredor andando —, cinco rivais com personalidade própria, escolhas de diálogo, conversas na sala que mudam conforme você vence, e dois finais (o verdadeiro exige o 1º lugar). As cenas são encenadas com personagens 3D que piscam, falam, mudam de expressão (nove) e de postura.
- **Sala Ômega explorável.** Ande pela sala, converse com a turma nas carteiras e use os objetos: o quadro mostra a próxima missão, o telão exibe o ranking ao vivo, o fliperama e o terminal abrem o Laboratório, a estante abre o Guia, a porta lateral leva ao Laboratório 404 e a sua carteira abre a próxima aula.
- **5 capítulos, 17 aulas, 51 exercícios.** Cada aula tem explicação em seções, um **exemplo de jogo** executável, erros comuns, resumo, três exercícios (aquecimento, prática e desafio bônus) e duas perguntas.
- **Provas de Mérito.** Ao fim de cada capítulo, um duelo cronometrado contra o rival na arena 3D, com placar holográfico e aposta opcional. Vencer tira 100 pontos do adversário; perder com código correto rende mérito de honra e abre a revanche. Quando você sobe no ranking, a câmera vai até o telão da sala.
- **Laboratório e Arcade.** Editor livre com `input()` funcionando no terminal e 7 jogos completos em Python para jogar e modificar (adivinhe o número, pedra-papel-tesoura, arena por turnos, jogo da velha, forca, labirinto, Jogo da Vida).
- **Laboratório 404.** Chat com a tutora Makise Kurisu, que enxerga o exercício, o código e o erro abertos na tela. Usa a API quando o servidor tem uma chave; sem chave, responde em modo offline com regras locais.
- **Guia de consulta** com busca, tradução dos erros do Python para português e destaque da linha com problema.
- **Trilha ambiente sintetizada** (um clima por cenário, sem arquivos de áudio) e efeitos sonoros, com um botão para silenciar.

Conteúdo por capítulo: 1) print, variáveis, números, strings, `input()`; 2) booleanos, `if/elif/else`, `random`; 3) `for`, `while`, `break`/`continue` e o game loop; 4) listas, dicionários, grades; 5) funções, parâmetros e retornos, projeto final (arena).

## Como jogar

| Ação | Teclado e mouse | Toque |
|---|---|---|
| Andar | `W` `A` `S` `D` ou setas | direcional na tela (sala) ou toque no chão |
| Olhar em volta | arrastar com o mouse | arrastar com o dedo |
| Aproximar a câmera | roda do mouse | — |
| Ir até um lugar ou pessoa | clicar nele | tocar nele |
| Interagir / conversar | `E`, `Enter` ou espaço quando o aviso aparece | tocar no aviso |
| Avançar o diálogo | clique, `Enter`, espaço ou `→` | toque |
| Executar o código | `Ctrl` + `Enter` (com `Shift`, verifica) | botões do editor |

Na sala, o botão **Lugares e turma** lista todos os destinos e colegas: dá para jogar inteiro sem andar, só com o teclado ou um leitor de tela. O prólogo jogável tem o botão **Ir até lá** e o **Pular cena**.

### Ajustes

Em **Ranking → Ajustes do jogo**:

- **Qualidade gráfica:** Automática (padrão), Baixa, Média ou Alta. No automático o jogo escolhe pelo aparelho e reduz sozinho se os quadros caírem.
- **Sala clássica:** troca a sala explorável por um painel de atalhos.
- **Cópia do progresso:** exporta o progresso para um arquivo `.json` e importa em outro navegador ou dispositivo.
- **Nome do protagonista:** troque quando quiser (até 24 caracteres); a turma, a professora e a Kurisu passam a usar o novo nome.
- Modo livre, rever o prólogo e apagar o progresso.

O jogo respeita a preferência do sistema por **menos movimento** (sem balanço de câmera, tremores nem confete). Sem WebGL, ou abrindo com `?gl=0` no endereço, ele usa os cenários ilustrados em SVG e a sala clássica: nada do conteúdo depende do 3D.

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

O Three.js vai junto, em `public/vendor/`: o mundo 3D não depende de CDN.

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
  vendor/                  Three.js (cópia local enxuta, licença MIT)
  js/
    main.js                título, barra superior, rotas e transições
    backdrop.js            cenário e câmera de cada tela; momento do ranking
    vn.js, story.js        motor da visual novel e roteiro (com os trechos jogáveis)
    screens.js             missões, aula, prova, ranking, laboratório, guia e sala clássica
    hub3d.js               Sala Ômega explorável
    duel3d.js              os duelistas e o placar na arena
    ambience.js            trilha ambiente sintetizada
    editor.js, runner.js   editor com realce, terminal e verificação
    tutor.js               chat da Kurisu (online e offline)
    state.js               progresso, mérito, ranking e cópia do progresso (localStorage)
    world/                 o mundo 3D
      engine.js            renderizador, laço, câmera, qualidade, bloom, troca de cenário
      kit.js               materiais, texturas em canvas, lotes de geometria, sombreamento dos personagens
      set-gate.js          portão e fachada da escola
      set-school.js        corredor, Sala Ômega e Laboratório 404
      set-arena.js         arena das provas
      cast3d.js            personagens 3D: corpo, cabelo, rosto, expressões e poses
      stage.js             palco da visual novel (posições e foco em quem fala)
      explore.js           andar em terceira pessoa: entrada, colisão e câmera
      walks.js             trechos jogáveis do prólogo
      fx.js                confete e faíscas
    art/                   retratos e cenários em SVG (miniaturas e modo sem WebGL)
    content/               c1–c5 (aulas e provas), arcade, guia
tools/validate.mjs         validação do conteúdo com CPython
tools/vendor-three.mjs     regera a cópia local do Three.js (só para atualizar a versão)
```

Sem etapa de build. A única dependência é `@anthropic-ai/sdk`, usada só pelo servidor. O Three.js já está no repositório como um único arquivo; `tools/vendor-three.mjs` existe apenas para regerá-lo ao trocar de versão.

## Validação do conteúdo

```bash
npm run validate
```

Roda, em CPython e com o mesmo código Python do laboratório, as 200 verificações do conteúdo: toda solução de referência passa nos testes, todo código inicial falha (ninguém conclui um exercício sem mexer nele), e todos os exemplos das aulas, do guia e do Arcade executam sem erro. Requer `python3`.

## Limites conhecidos

- O mundo 3D precisa de WebGL. Em aparelhos sem WebGL o jogo cai para os cenários em SVG; em aparelhos fracos, a qualidade Automática desliga sombras e bloom.
- O Python roda no navegador (Pyodide 0.29.2, baixado da CDN jsDelivr no primeiro uso; depois disso o navegador guarda em cache). Não há instalação de pacotes nem acesso a arquivos.
- `input()` é simulado: no Laboratório o programa é reexecutado a cada resposta, com a mesma semente de sorteio, então jogos com `random` se comportam de forma consistente durante uma partida. Programas que dependem do relógio podem variar.
- Execução limitada a 8 segundos e 20.000 caracteres de saída.
- O progresso fica no `localStorage` do navegador e não sincroniza sozinho entre dispositivos; para levar a outro aparelho, use **Exportar / Importar** nos ajustes.
- Os testes verificam saídas e condições explícitas; não medem estilo nem originalidade.
- Na sala explorável, o caminho automático até um lugar clicado é simples: ele contorna móveis, mas em casos raros para antes do destino (basta clicar de novo ou andar pelo teclado).

## Créditos

História, escola, rivais, cenários e personagens 3D, ilustrações em SVG e material didático foram criados para este projeto. O clima de escola meritocrática com ranking e rivais é inspirado no gênero. A tutora do Laboratório 404 usa, como homenagem de fã, a personalidade de Makise Kurisu (Steins;Gate), a pedido do autor do projeto; o retrato e o modelo 3D são desenhos próprios.

O mundo 3D usa o [Three.js](https://threejs.org/) (licença MIT, cópia em `public/vendor/`).

Referências técnicas: [tutorial oficial do Python](https://docs.python.org/pt-br/3/tutorial/), [Pyodide](https://pyodide.org/en/0.29.2/usage/index.html) e [documentação do Three.js](https://threejs.org/docs/).
