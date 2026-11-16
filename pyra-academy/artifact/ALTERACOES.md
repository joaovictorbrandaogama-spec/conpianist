# Academia Pyra — melhorias gráficas

O projeto existente recebeu personagens com proporções mais naturais, uniformes detalhados, cabelo em mechas, novos acabamentos nos ambientes e iluminação de tarde/noite. As regras, as aulas e o progresso do jogo foram preservados.

## Arquivos alterados

| Arquivo | Alterações |
| --- | --- |
| `js/three/models.js` | Corpo, mandíbula, mãos, sapatos, lapelas, debrum, gravata/laço e cabelo procedurais refinados. Contornos extrudidos e agrupados por parte animada, sombra de contato suave, materiais independentes por personagem, descarte seguro e respeito a movimento reduzido. |
| `js/three/world.js` | Fachadas e janelas, pavimentação, árvores instanciadas, bancos, céu, neblina, luz de tarde/noite, sombras do cenário e halos dos postes. Mantidas as coordenadas e a redução automática de resolução. |
| `js/three/interiors.js` | Rodapés, molduras, parquet, livros, armários, mesas/cadeiras, dormitórios, vitrines e luminárias com texturas geradas localmente. Detalhes repetidos usam instâncias. |
| `js/three/stage.js` | Acabamentos dos cenários de diálogo, luz principal/preenchimento/recorte, sombras do elenco e halos suaves. Transições e câmera respeitam movimento reduzido; recursos são liberados na troca de cenário e no descarte. |
| `js/art/characters.js` | Mechas, íris, sombras de rosto e detalhes de tecido nos retratos SVG, mantendo os dados do elenco e as expressões. |
| `css/life.css` | Separação do botão de troca de período e do objetivo do campus; nome do interlocutor posicionado acima da fala no celular. |
| `css/main.css` | Grades e controles do dormitório e da aula adaptados à largura de 390 px, sem esconder conteúdo fora da tela. |

## Compatibilidade

- Nenhum contrato público foi alterado.
- Exportações, dados do elenco, aparências do jogador, colisões, portas, pontos de interação, posições de chegada e câmeras dos interiores foram comparados com o ZIP original.
- Os 22 arquivos protegidos pelo pedido permanecem idênticos ao original, incluindo o runtime Python, as aulas, o estado, os tutores, o editor e o executor.
- `vendor/` permanece integralmente igual: nenhum addon ou outra dependência foi adicionado.
- Texturas e brilhos novos são gerados localmente por código. Os halos oferecem brilho suave sem um passe de bloom em tela inteira.
- O projeto continua sem build, com Three.js r170 e o fragmento original de `index.html`.
- Os únicos arquivos novos deste pacote são `LEIA-ME.txt` e este resumo.

## Validação executada

- Sintaxe dos módulos e 69 verificações de compatibilidade aprovadas.
- Construção de 96 aparências e atualização das nove expressões; altura dos modelos entre 1,87 e 1,95. Verificados isolamento de `setDim()` e descarte entre personagens.
- Geração e validação de 831 SVGs de personagens, expressões e aparências.
- Prólogo completo pela interface em desktop e em 390 px; nome, foto e escolha persistidos. Diálogo 3D com retrato confirmado.
- Os onze cenários de diálogo construídos/renderizados, incluindo `black`; troca e descarte sem exceções JavaScript.
- Campus: tarde/noite, viagens para Sala D, Clube, dormitório, Galeria e retorno ao pátio.
- Controles: caminhada, setas, Shift, interação com E, colisão com a mesa, saída pela porta, clique para andar, pausa e descarte.
- Aula inicial: o botão “Rodar exemplo” executou Python e exibiu “A LENDA DE PYRA” e “Versão 1.0 - feito com 9 linhas de Python”.
- Alternância para 2D no dormitório e diálogos 2D; prólogo/campus também funcionaram com WebGL desativado.
- Em 390 px, diálogo, campus, dormitório e aula sem rolagem horizontal; placa do nome sem sobrepor o texto.

## Custo de renderização

Comparação de uma mesma cena de teste com 25 personagens, câmera e iluminação iguais:

| Medida | Original | Atualizado |
| --- | ---: | ---: |
| Chamadas de renderização | 1.338 | 903 |
| Triângulos renderizados | 277.038 | 266.742 |

A etapa final de agrupamento dos contornos preservou as imagens pixel a pixel. Os testes usaram Chromium com renderização por software (SwiftShader); esses números não são uma medição de FPS em um notebook físico.

O ambiente de teste registrou falha de certificado ao acessar o Google Fonts já referenciado pelo original e ausência de favicon. As fontes de fallback permitiram executar os testes. A simulação sem WebGL também emitiu os avisos esperados de contexto indisponível. Nenhuma exceção JavaScript do jogo foi observada nos fluxos aprovados.
