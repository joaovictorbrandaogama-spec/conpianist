# Academia Pyra: o que precisa melhorar

Instruções para quem for continuar o jogo. O jogo é uma visual novel escolar em 3D para aprender Python, que roda no navegador. Usa Three.js r170 e Pyodide 0.29.2, sem etapa de build. A versão publicada (artefato do claude.ai) está em `pyra-academy/artifact/`, no branch `claude/hopeful-euler-3qmzb1`.

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `js/three/models.js` | Personagens 3D: corpos GLB (`vendor/bodies/*.wasm`), cabeça, rosto, cabelo, uniforme, expressões e poses |
| `js/three/world.js` | Campus 3D: prédios, árvores, chão, mar, céu, luz, pós-processamento, câmera, colisão e NPCs |
| `js/three/interiors.js` | Interiores caminháveis: escola (corredor, Sala D, clube), dormitório (saguão, quarto 404-D) e Galeria |
| `js/three/stage.js` | Cenários das cenas de diálogo |
| `js/art/scenes.js`, `js/art/characters.js` | Cenários e retratos em SVG (tela de título, modo sem WebGL) |
| `css/*.css` | Interface |
| `PROMPT-PERSONAGENS.md` | Especificação completa para modelar cabeças, cabelos e uniformes |

## Como rodar

Na pasta `pyra-academy/artifact`, rode `python3 -m http.server 8765` e abra http://localhost:8765. Os arquivos grandes do Pyodide não estão no repositório: o `README-ARTEFATO.md` explica como recolocá-los.

## O que melhorar, por prioridade

### 1. Personagens (`models.js`): é o que mais destoa

- **Cabeça e rosto.** A cabeça tem formato de ovo e o rosto é pintado chapado: olhos e boca são decalques, e não há nariz, queixo nem orelhas com volume. Siga o `PROMPT-PERSONAGENS.md`.
- **Cabelo.** São placas duras e soltas, sem volume nem camadas. Precisa de mechas com massa, franja e nuca coerentes, nos 16 estilos.
- **Uniforme.** Hoje é pintura sobre o corpo:
  - lapelas e gravata são decalques planos;
  - a barra do paletó é um corte serrilhado na altura do quadril;
  - o quadril é pintado com a cor da saia ou do casaco para esconder que atravessa a roupa.

  Paletó, saia e calça devem virar malhas próprias, com skinning nos ossos do corpo.
- **Mãos.** São simples demais.
- **NPCs do campus.** Usam a versão de baixo detalhe mesmo perto da câmera. Troque o nível de detalhe pela distância.
- **Animação.** Revise e melhore a caminhada, a respiração parada e o olhar para quem fala.

### 2. Campus (`world.js`)

- **Árvores.** As copas são icosaedros lisos e os troncos têm 7 lados. Faça copas com volume e camadas, e varie as espécies.
- **Prédios.**
  - São caixas com as janelas pintadas na textura: dê relevo às janelas, crie cornijas, platibanda e frisos.
  - Os telhados são planos azul-escuros com caixinhas em cima.
- **Gramado e caminhos.** O gramado é uma textura listrada uniforme e as bordas dos caminhos são faixas brancas finas. Faça meio-fio com volume, variação de tom e grama mais alta nas bordas.
- **Prédio entre a câmera e o jogador.** Hoje ele fica translúcido a 22% e parece um véu. Use um corte (cutaway) ou dithering.
- **Placas com os nomes dos prédios.** São sprites sem teste de profundidade e aparecem através das paredes.
- **Mar e praia.** O mar é um plano com textura deslizando e a espuma é um anel fixo. Faça ondas na areia e reflexo do sol.
- **Céu.** É uma textura pintada parada. As nuvens devem se mover e o sol deve ficar coerente com a direção das sombras.

### 3. Interiores (`interiors.js`)

- **Paredes e corte.** O corte é de casa de bonecas: paredes lisas e fundo azul-marinho vazio acima delas. Dê acabamento às paredes (pintura, painéis, rodapé, moldura).
- **Móveis.** Quase todos são caixas. Precisam de formas reais: mesas, cadeiras, estantes, sofás e cama.
- **Janelas.** São planos com uma cidade pintada. Precisam de profundidade e luz entrando.

### 4. Cenas de diálogo e 2D (`stage.js`, `art/scenes.js`)

- Não foram revisadas nas últimas rodadas. Harmonize com o céu azul do campus.
- A tela de título ainda usa o cenário SVG noturno com janelas amarelas, num tom quente.

### 5. Interface

- A dica de controles no rodapé do campus tem pouco contraste sobre o caminho.

### 6. Desempenho

- O mapa ficou pesado:
  - sombra de 4096;
  - bloom (EffectComposer, MSAA);
  - resolução até 2x;
  - 8 luzes pontuais nos postes;
  - cerca de 380 objetos desenhados no campus.
- Só foi testado em GPU por software (SwiftShader). Teste num computador e num celular reais.
- Ligue essas opções a níveis de qualidade e mantenha a queda automática de resolução.

### 7. Decisão pendente com o dono do projeto

Estes elementos foram acrescentados ao mapa sem terem sido pedidos. Pergunte antes se ficam ou saem:

- entradas novas dos prédios;
- vitrine de troféus no corredor;
- luzes no chão dos caminhos;
- sombras de nuvem;
- campo fora do muro;
- calçada do lado de fora dos interiores.

## Regras que não podem ser quebradas

- **Nada de jogo muda.** Não altere `SITES`, colisores, portas, pontos de interação, posições dos NPCs, pontos de chegada, `BOUNDS` nem câmeras.
- **Conteúdo e lógica ficam como estão.** Não mexa em:
  - aulas (`js/content/`);
  - Python (`python-worker.js`, `js/runner.js`);
  - editor (`js/editor.js`);
  - estado salvo (`js/state.js`);
  - tutoras (`js/tutor.js`, `js/*-persona.js`).
- **Visual.**
  - O uniforme continua vermelho.
  - As cores das turmas e o vermelho de perigo ficam como estão.
  - O clima é de céu azul: nada de tons quentes dominando.
- **Técnico.**
  - Sem build.
  - Three.js r170 pelo import map, com arquivos locais em `vendor/`.
  - Scripts externos só de cdnjs, jsdelivr ou unpkg, com versão exata; fontes só do Google Fonts.
- **Artefato.**
  - `index.html` é um fragmento: sem `<html>`, `<head>` nem `<body>`.
  - `.zip` e `.glb` não são servidos. Os corpos vão como `.wasm` e a biblioteca padrão do Python como `python_stdlib.wasm`.
  - Não use `confirm()` nem `alert()`: o jogo tem caixa de confirmação própria.
  - A única capacidade é `sample`.
- **Modo sem WebGL.** Abrir com `?gl=0` precisa continuar funcionando.

## Como validar cada entrega

- Tire fotos em 1280×760 e em 390×844.
- Cubra tarde e noite, em todas as áreas:
  - campus;
  - Sala D, clube e corredor;
  - saguão e quarto do dormitório;
  - Galeria.
- Confirme que não há erro no console.
- Na aula 1, "Rodar exemplo" precisa mostrar "A LENDA DE PYRA".
- Entregue por área, com fotos de antes e depois.
