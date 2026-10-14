# Passagem de bastão: detalhamento da Alpha

Este documento é para quem continuar o modelo (outra sessão ou outro
modelo). Ele resume o estado atual, como trabalhar no projeto e o que falta,
em ordem de prioridade.

Personagem: **Alpha, visual Crimson Weave**, de *Punishing: Gray Raven*.
Alvo: `reference/reference.png` (frente, 735×1030). O usuário quer o modelo
"o mais parecido possível" e que **não pareça massinha**: bordas duras onde o
design tem, tecido com espessura, detalhes no lugar certo, toon limpo.

## Estado atual

Tudo é gerado por código (Python + Blender 4.5, sem modelagem manual).

| Parte (`src/parts.py`) | Módulo | Situação |
| --- | --- | --- |
| `body`, `head` | `body.py`, `face_texture.py` | SDF + marching cubes, normais suavizadas; rosto com textura projetada |
| `hair` | `hair.py`, `hair_texture.py` | Mechas em crescente com normais de massa, rabo alto, pontas rosa→vermelho |
| `top`, `hips`, `arms`, `legs` | `outfit.py`, `clothing_geo.py` | Cascas projetadas no corpo com espessura e borda dura (revisado e refinado) |
| `coat` | `coat.py` | Jaqueta curta, lapelas, gola alta, saia com pregas, aba esquerda, gráfico das costas (revisado e refinado) |
| `boots` | `boots.py` | Bota alta com solado, faixas, placa prateada (revisado e refinado) |
| `acc` | `accessories.py` | Coleira, óculos, anéis do braço, fivelas, alças, bolsa (revisado e refinado) |
| `swords` | `swords.py` | Bainha Nightblaze, espada de cima, kodachi, suporte nas costas (revisado e refinado) |
| `hands` | `hands.py` | Mãos com luva e dedos em 3 segmentos (ver lista abaixo) |

Peças rígidas usam `hardsurf.py` (polígonos com bevel e arestas vivas).
Sombreamento padrão: **toon v2** (`toon2.py`): três tons, AO de contato
assado em atributo `_CTRL`, brilho e borda. `CHAR_TOON=1` volta ao toon antigo.

Triângulos (antes dos modificadores): cerca de 1 milhão no total. Os mais
pesados são as roupas (`hips`+`arms`+`top`+`legs`, ~270 mil), o casaco
(~180 mil), o cabelo (~94 mil) e o corpo (90 mil).

## Como trabalhar

```bash
BP=/opt/blender-dl/blender-4.5.14-linux-x64/4.5/python/bin/python3.11
cd modelo-personagem/src

$BP build_parts.py coat            # gera cache/coat.npz (caches não vão para o git)
$BP build_parts.py body head hair top hips arms legs coat boots acc hands swords   # tudo

./preview.sh /tmp/r ref,three,back --res 0.8            # render (preview.sh -> scene.py)
./preview.sh /tmp/r ref --parts body,coat --res 0.7     # só algumas partes (rápido)
./preview.sh /tmp/r custom --cam 0,-1.2,1.3,0,0,1.3,0.4  # close-up: posição, alvo, altura do quadro
$BP compare.py /tmp/r/ref.png /tmp/r/cmp.png           # referência | render | contorno

blender -b -P export.py -- --rig --renders   # .blend, .glb, .fbx, web .glb, renders/
$BP viewer_build.py                         # embute o glb web no visualizador
python3 fetch_refs.py                       # baixa as referências extras para reference/extra/
```

- Blender 4.5 sem interface (`blender -b`), EEVEE via Mesa EGL. O ambiente
  original tinha Blender em `/opt/blender-dl/`; numa máquina nova, instale o
  Blender 4.5 e use o Python dele (precisa de numpy, scipy, scikit-image, pillow).
- Coordenadas: metros, Z para cima, ela olha para −Y, o lado DIREITO dela é −X.
  `rig.px(x_px, y_px, prof)` converte pixel da referência em posição 3D;
  `rig.J` tem as articulações.
- Regras e ajudantes de cada módulo: `docs/agent-brief.md`. Pesquisa por
  região (cores, contagens, formas), crítica e técnicas: `docs/research.json`.
- O rig escolhe os ossos pelo **nome do objeto** (`src/rigging.py`, `rule()`).
  Ao criar objetos novos, siga os prefixos existentes (`Coat…`, `Acc…`,
  `Boot…`/`Sole…`, `Sword…`, `Hand…`, `Hair…`).
- Sempre confira no render `ref` com `compare.py` que a silhueta continua
  alinhada à referência, e veja de frente, 3/4, lado e costas.

## O que falta (prioridade)

1. **Botas**: estão baixas e largas comparadas à referência. Na arte, a bota
   chega a ~1,3 cabeça de altura, o cano é mais fino e o solado menos grosso.
   O pé também termina ~20 px abaixo no `ref` (limite da altura do tornozelo
   do rig, `rig.J['ankle_*']`, z=0,117).
2. **Perna direita** (`body.py`, `LEG_PROFILE`): reta demais; falta curva de
   joelho, panturrilha e afinamento no tornozelo.
3. **Rosto e cabeça**: inclinar a cabeça ~5° para baixo; olhos e cílios mais
   definidos como na referência; pele um pouco menos saturada.
4. **Alças da coxa esquerda**: estão em `s = 0,045 / 0,105` (`outfit.STRAP_S`);
   a referência pede ~`0,065 / 0,145`. Mexer junto com as fivelas em
   `accessories.py`.
5. **Manga esquerda**: a barra (`outfit.SK_L`) está ~20 px baixa.
6. **Pescoço**: o corpo alarga muito abaixo de z 1,457, escondendo a faixa
   de baixo da coleira (`accessories.py`, `FLARE_Z`/`FLARE_K`).
7. **Bainha grande**: fica 9–12 cm atrás da mão direita por causa da saia do
   casaco; a mão não chega a segurá-la de verdade (`hands.py`, `swords.py`).
8. **Casaco**: o gráfico das costas é estimado (referências de costas em
   baixa resolução); a barra direita termina um pouco curta; as pregas das
   costas quase não aparecem com a luz de frente.
9. **Mãos**: ~13 mil triângulos por mão (dá para reduzir); o padrão vermelho
   da luva esquerda está simplificado.
10. **Sombreamento**: a referência tem gradiente e brilho mais ricos (couro
    brilhante, metal); o toon atual ainda é bem "chapado". Ideias em
    `docs/research.json` → `tech.techniques`.
11. **Peso**: roupas e casaco somam ~450 mil triângulos; o casaco não usa
    decimação (ela criava pontinhos). Uma versão leve (~200 mil) para jogos
    seria útil.

## Histórico curto

- v1: SDF + marching cubes para tudo; parecia massinha.
- v2: cabelo e rosto refeitos, toon v2, peças rígidas com `hardsurf.py`, e as
  seis partes (casaco, roupas, espadas, botas, acessórios, mãos) refeitas
  cada uma por um agente, revisadas por outro agente contra as referências
  e refinadas.
