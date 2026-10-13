# Espadachim Prateada — modelo 3D

Modelo 3D em estilo anime da personagem da imagem de referência
(`reference/reference.png`): cabelo prateado longo com o enfeite vermelho em
forma de meia-lua, olhos heterocromáticos (vermelho à direita dela, ciano à
esquerda), coleira alta com óculos, biquíni preto, casaco branco aberto com
forro carmim e caudas longas, shorts de couro, perneira armada na perna
esquerda, cinta branca na coxa direita, botas pretas, braçadeira com
bandagens vermelhas e pretas, luvas e as três espadas.

![Comparação: referência e o modelo em quatro vistas](renders/comparacao.png)

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `export/personagem.blend` | Cena editável do Blender 4.5: modelo com rig, materiais toon (sombra em degrau + contorno), luz e câmeras. A câmera `RefCam` reproduz o enquadramento da imagem de referência. |
| `export/personagem.glb` | glTF 2.0 completo (885 mil triângulos), com esqueleto e pesos. Abre em Blender, Unity (glTFast/UniVRM), Godot, three.js, visualizadores online. |
| `export/personagem.fbx` | FBX com esqueleto e textura embutida, para Unity/Unreal/Maya. |
| `export/personagem_web.glb` | Versão leve (609 mil triângulos, compressão Draco, 2,7 MB) usada pelo visualizador web. |
| `viewer/` | Visualizador three.js com sombreamento toon, contorno, vistas e poses. Para abrir localmente: `python3 -m http.server` dentro da pasta e acesse `http://localhost:8000`. |
| `renders/` | Renders do Blender (EEVEE) usados na comparação. |
| `src/` | Todo o código que gera o modelo (ver abaixo). |

Medidas: 1,68 m de altura (sem o enfeite do cabelo), em metros, Z para cima
no Blender, personagem olhando para −Y.

### Rig

22 ossos com nomes humanoides (`Hips`, `Spine`, `Chest`, `UpperChest`, `Neck`,
`Head`, `Shoulder/UpperArm/LowerArm/Hand.L/.R`, `UpperLeg/LowerLeg/Foot/Toes.L/.R`).
A pose de repouso é a pose da imagem (não é T-pose). As espadas da mão e o
punho seguem `Hand.R`; as espadas das costas seguem `Hips`; o cabelo longo
distribui o peso entre `Head` e o tronco.

### Materiais

Cada material tem uma cor iluminada, uma cor de sombra e uma cor de contorno
(`export/palette.json`). No `.blend` o visual toon usa *Shader to RGB* no
EEVEE e contorno por casco invertido (modificador `Outline`). No glTF/FBX os
materiais são PBR simples com essas cores-base; o visualizador web reaplica o
toon.

## Como foi feito

Tudo é gerado por código, sem esculpir à mão:

1. **Medidas da referência.** Os pontos do esqueleto (ombros, cotovelos,
   quadril, joelhos...) foram medidos em pixels na imagem e convertidos para
   metros (`src/rig.py`, 1,85 mm por pixel). Pelo decote e pelo umbigo deu
   para ver que o tronco está girado ~20° para a direita dela, e isso foi
   reproduzido.
2. **Corpo por campos de distância (SDF).** Tronco e cabeça são "lofts" de
   seções elípticas; pernas e braços são lofts ao longo dos ossos; tudo
   unido suavemente e transformado em malha com *marching cubes*
   (`src/sdf.py`, `src/body.py`).
3. **Rosto.** Olhos, sobrancelhas e boca são pintados em uma textura
   (`src/face_texture.py`) projetada de frente na cabeça.
4. **Roupas.** Cada peça é a superfície do corpo deslocada alguns milímetros,
   recortada por uma máscara (polígonos traçados na imagem, planos ou
   ângulos) e com espessura dada no Blender. O casco do casaco é branco por
   fora e vermelho por dentro (`src/outfit.py`).
5. **Cabelo.** Uma "touca" esculpida mais ~50 mechas afinando em ponta,
   com colisão contra cabeça, corpo e casaco (`src/hair.py`).
6. **Mãos, acessórios e espadas** em `src/hands.py` e `src/props.py`.
7. **Cena, rig e exportação** em `src/scene.py`, `src/rigging.py` e
   `src/export.py`.

### Gerar de novo

Requer o Blender 4.5 e, no Python do Blender, `scipy`, `scikit-image` e
`pillow`.

```bash
cd modelo-personagem/src
PY=<pasta do blender>/4.5/python/bin/python3.11
$PY face_texture.py                 # textures/face.png
$PY build_parts.py                  # malhas em ../cache (~10 min)
./preview.sh /tmp/prev ref,three    # renders rápidos para conferir
blender -b -P export.py -- --rig --renders
$PY compare.py ../renders/ref.png /tmp/cmp.png   # sobreposição com a referência
```

## Limitações

- O rosto é uma textura projetada: fica melhor de frente e de três quartos.
- Os detalhes pequenos da roupa (textos impressos, zíperes, fivelas menores)
  e o mecanismo das espadas foram simplificados.
- As espadas são versões estilizadas (blocos com as cores certas), não
  réplicas fiéis.
- O rig não tem dedos nem ossos de cabelo/casaco; esses acompanham a mão,
  a cabeça e o quadril.
