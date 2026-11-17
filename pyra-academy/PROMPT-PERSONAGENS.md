# Pedido: cabeças, cabelos e uniformes para os personagens da Academia Pyra

Você vai criar, no Blender, as peças 3D que faltam para os personagens de um jogo em three.js chamado **Academia Pyra**: uma visual novel escolar em estilo anime (cel shading, contorno preto), com clima de escola de elite e ranking.

Os **corpos já existem** e devem ser usados como base: `base_body_male.glb` e `base_body_female.glb` (também dentro de `base_bodies.blend`). São manequins com esqueleto, em pose A, sem rosto, cabelo nem roupa. As peças que você fizer serão montadas por código em cima deles, então as especificações técnicas abaixo precisam ser seguidas à risca.

**Não modele os 90 personagens um por um.** O jogo monta cada personagem combinando peças e trocando cores por código. O que você entrega é um **kit de peças neutras**: uma cabeça, 16 estilos de cabelo, alguns acessórios e os uniformes.

---

## 1. Especificações técnicas (obrigatórias)

### Esqueleto e encaixe
- Use os rigs dos arquivos: `body_male_rig` e `body_female_rig`. **Não renomeie, não mova e não acrescente ossos.**
- Ossos que importam aqui: `Head`, `Neck`, `UpperChest`, `Chest`, `Spine`, `Hips`, `Shoulder.L/R`, `UpperArm.L/R`, `LowerArm.L/R`, `Hand.L/R`, `UpperLeg.L/R`, `LowerLeg.L/R`, `Foot.L/R`, `Toes.L/R`.
- **Cabeça, cabelo e acessórios de cabeça:** 100% de peso no osso `Head`, ou filhos dele.
- **Roupas:** malhas com skinning nos mesmos ossos do corpo (copie os pesos do corpo com *Data Transfer*), para dobrarem junto quando o personagem anda.
- Altura do pescoço: masculino ≈ 1,45 m, feminino ≈ 1,32 m. No jogo, o corpo feminino é ampliado até o pescoço ficar em 1,45 m.

### Proporção
- Estilo anime, mas não chibi: **cabeça com cerca de 0,29 m de altura** (do queixo ao topo do crânio, sem cabelo) para o corpo masculino de 1,75 m. Rosto oval, queixo fino, olhos grandes.
- Uma cabeça base serve para todos. Se quiser, faça uma variante feminina com o queixo um pouco mais fino; a versão masculina tem a mandíbula levemente mais marcada.

### Rosto (importante)
- O rosto **não tem olhos, sobrancelhas nem boca modelados.** O jogo desenha tudo isso por código numa textura, inclusive as 9 expressões e as piscadas.
- A parte da frente do rosto deve ter um **material separado chamado `face`**, com UV em projeção frontal (como se fosse uma foto de frente) ocupando o quadrado UV inteiro, de 0 a 1 nos dois eixos:
  - centro dos olhos em u = 0,37 e u = 0,63, v = 0,53;
  - ponta do nariz em u = 0,50, v = 0,40;
  - boca em u = 0,50, v = 0,28;
  - queixo em v ≈ 0,08 e linha do cabelo em v ≈ 0,92.
- Modele nariz e orelhas de forma bem discreta, porque o desenho faz o resto. O resto da cabeça usa o material `skin`.

### Materiais
- Use apenas **Principled BSDF com cor base**, sem texturas de imagem, sem transparência, sem metal e sem emissão. O jogo troca cada material por um shader toon e pinta as cores por personagem.
- Nomeie os materiais **exatamente** assim, porque a cor sai do nome:
  - `skin`: pele (cabeça, pescoço, mãos, pernas expostas)
  - `face`: frente do rosto (ver acima)
  - `hair`: cabelo
  - `hair_shine`: faixa de brilho do cabelo (algumas mechas ou uma faixa)
  - `cloth`: tecido principal do blazer, paletó ou jaleco
  - `cloth_shade`: avesso e partes em sombra do tecido (gola interna, lapela de baixo)
  - `trim`: debrum e lapela de contraste
  - `white`: camisa
  - `tie`: gravata, laço de fita e prendedor de cabelo
  - `gold`: botões, brasão e brinco
  - `lower`: calça, saia e meias
  - `shoe`: sapatos
- Cor base neutra (cinza claro) em tudo, porque o jogo substitui as cores.

### Geometria
- Malhas **fechadas, sem buracos**, normais apontando para fora e sem faces duplicadas. O contorno preto do jogo é feito inflando a malha pelas normais, e faces abertas ou invertidas aparecem como manchas.
- Cabelo feito de mechas sólidas, sem *alpha cards* e sem planos com transparência.
- Limites de triângulos (depois de aplicar os modificadores):

  | Peça | Máximo |
  |---|---|
  | cabeça (com orelhas) | 3.000 |
  | cada estilo de cabelo | 3.000 |
  | cada acessório | 400 |
  | cada uniforme completo | 10.000 |

  Se puder, entregue também versões `_low` com cerca de 40% dos triângulos (usadas no campus, onde há dezenas de personagens).

### Exportação
- **GLB (glTF 2.0)**, pelo exportador oficial do Blender: +Y para cima, com *Apply Modifiers*, sem animações, com skinning e sem *shape keys*.
- **Sem compressão Draco nem Meshopt**, porque o jogo não tem os decodificadores.
- Personagem olhando para −Y no Blender (frente padrão do glTF), igual aos corpos enviados.
- Escala real, em metros, com transformações aplicadas (Ctrl+A → All Transforms) em tudo.
- Entregue **dois arquivos**, cada um com o rig e todas as peças como objetos separados, nomeados exatamente como na seção 2:
  - `pyra_parts_male.glb`
  - `pyra_parts_female.glb`
- Mande também o `.blend` de trabalho.

---

## 2. O que modelar

### 2.1 Cabeça
- `head` (masculina) e `head_f` (feminina, opcional): materiais `skin` e `face`.

### 2.2 Cabelos (16 estilos)
Nome do objeto: `hair_<estilo>`. Cada estilo tem que caber na cabeça base sem atravessar o crânio. Todos usam `hair` e `hair_shine`.

| Estilo | Descrição | Quantos personagens usam |
|---|---|---|
| `short` | curto e arrumado, franja leve | 8 |
| `fade` | laterais raspadas, topo curto | 8 |
| `slick` | penteado para trás, com gel | 7 |
| `side` | repartido de lado, franja varrida | 6 |
| `messy` | bagunçado, mechas em várias direções | 5 |
| `spiky` | espetado, estilo shōnen | 4 |
| `curly` | cacheado volumoso | 6 |
| `bangs` | franja reta até as sobrancelhas, comprimento médio | 6 |
| `bob` | chanel na altura do queixo | 5 |
| `hime` | franja reta e mechas laterais retas até o ombro, cabelo longo atrás | 5 |
| `long` | liso e longo até o meio das costas | 5 |
| `wavy` | ondulado até abaixo dos ombros | 8 |
| `ponytail` | rabo de cavalo alto, com prendedor (material `tie`) | 6 |
| `twintails` | duas marias-chiquinhas, com prendedores (`tie`) | 3 |
| `braid` | trança lateral caindo sobre o ombro, com prendedor (`tie`) | 3 |
| `bun` | coque alto, rosto livre | 5 |

### 2.3 Acessórios
Nome do objeto entre parênteses:
- óculos de armação fina (`acc_glasses`): material `trim` na armação, sem lentes ou com lentes sólidas bem finas;
- laço de fita no cabelo, preso atrás da cabeça (`acc_bow`): material `white`;
- prendedor de cabelo, duas presilhas do lado esquerdo (`acc_hairpin`): material `tie`;
- brincos pequenos de argola (`acc_earring`): material `gold`;
- fones de ouvido apoiados no pescoço (`acc_headphones`): material `lower`;
- curativo no rosto (`acc_bandage`): material `white`, colado sobre a bochecha direita.

Sardas, pinta e cicatriz são pintadas pelo jogo; não precisa modelar.

### 2.4 Uniformes (skinning nos ossos do corpo)
Cada uniforme é **um objeto** com vários materiais. As versões masculina e feminina vão no arquivo do corpo correspondente.

1. **`outfit_blazer`**, o uniforme da Academia: blazer acinturado até o quadril com lapela entalhada e debrum (`trim`), dois bolsos, três botões dourados (`gold`) e brasão no peito esquerdo (escudo com a letra P, em `gold`). Camisa branca com colarinho (`white`).
   - masculino: gravata (`tie`), calça reta (`lower`) e sapatos sociais (`shoe`);
   - feminino: laço de fita no colarinho (`tie`), **saia pregueada** até o meio da coxa (`lower`), meias até abaixo do joelho (`lower`) e sapato boneca (`shoe`).

   A saia precisa de skinning nas coxas e no quadril, para acompanhar a caminhada sem atravessar as pernas.
2. **`outfit_suit`**, para professores e diretor: paletó reto mais longo, gravata (feminino: laço) e calça social; a versão feminina tem saia lápis até o joelho.
3. **`outfit_labcoat`**: jaleco aberto até o meio da coxa sobre camisa e gravata, com calça e sapatos.
4. **`outfit_council`**, do conselho estudantil: paletó de gala até o meio da coxa, ombreiras discretas e debrum dourado (`trim`), com calça ou saia longa e sapatos.

**Não altere nem apague a malha dos corpos**: cada uniforme é um objeto separado. O jogo esconde o corpo onde a roupa cobre e deixa à mostra só mãos, pescoço e, com saia, as pernas. Por isso a roupa pode ficar bem colada, sem espaço por dentro, mas precisa cobrir por completo a pele que esconde.

---

## 3. Personagens principais (referência de visual)

As cores são aplicadas pelo jogo; servem para você conferir se os estilos funcionam. Formato: estilo de cabelo · cor do cabelo · olhos · roupa · detalhe.

| Personagem | Papel | Visual |
|---|---|---|
| Protagonista (masculino, nome escolhido) | aluno novo da Turma D | `bangs`, `short`, `curly` ou `messy` · preto · azul · blazer |
| Vésper Albuquerque (F) | orientadora da Turma D | `bun` · roxo muito escuro · violeta · suit · óculos |
| Makise Kurisu (F) | pesquisadora visitante, tutora | `long` · ruivo acastanhado · azul · labcoat · gravata vermelha |
| Monika (F) | presidente do clube de código | `ponytail` · castanho-cobre · verde · blazer · laço de fita branco |
| Sora Kanzaki (M) | o enigma, 1º do ranking | `messy` · branco-prateado · dourado · blazer |
| Bianca Ferraz (F) | a estrategista | `wavy` · vinho escuro · rosa · blazer · brincos · pele morena |
| Caio Montenegro (M) | o velocista | `spiky` · vermelho · âmbar · blazer · pele bronzeada |
| Yuki Arashi (F) | a lógica fria | `bob` · azul-marinho · azul-claro · blazer |
| Theo Lindqvist (M) | o otimizador | `side` · loiro escuro · verde · blazer · óculos |
| Helena Sarmento (F) | presidente do conselho | `hime` · roxo escuro · vermelho · council |
| Leonardo Vasconcelos (M) | vice do conselho | `messy` · loiro platinado · vermelho · council · brinco |
| Estela Rangel (F) | orientadora da Turma B | `wavy` · loiro dourado · rosa · suit |
| Heitor Valadares (M) | diretor | `slick` · grisalho · cinza · suit · óculos |
| Dário Falcão (M) | o tirano | `slick` · vinho · vermelho · blazer · cicatriz |
| Íris Valadares (F) | a rainha | `long` · lilás quase branco · roxo · blazer · prendedor |
| Beatriz Lacerda (F) | a informante | `bangs` · laranja · verde · blazer · sardas |

Cores das turmas, usadas na gravata e no brasão: A amarelo `#ffc93c`, B azul `#4fc8ff`, C verde `#5eea9a`, D vermelho `#ff3355`. O blazer da Academia é vermelho-vinho (`#8e1b31` / `#5a0e1e`) com debrum creme.

---

## 4. Ordem de entrega

1. **Teste primeiro, antes de fazer tudo:** a cabeça base, `hair_bangs`, `hair_long` e `outfit_blazer` (masculino e feminino), já exportados nos dois GLBs. Isso valida o encaixe, os nomes e o UV do rosto antes do resto.
2. Depois do teste aprovado: os outros 14 cabelos, os acessórios e os outros três uniformes.
3. Por último, se der tempo, as versões `_low`.

Para cada entrega, mande também uma imagem de frente, uma de lado e uma de costas de um personagem montado com as peças.
