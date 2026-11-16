const py = String.raw;

export default {
  id: 'c2', n: 2, rival: 'yuki',
  title: 'Decisões e acaso',
  subtitle: 'O programa escolhe',
  blurb: 'Comparações, condições e sorte. É aqui que um roteiro fixo vira um jogo que reage.',
  lessons: [
    {
      id: 'booleanos', title: 'Verdadeiro ou falso', minutes: 9,
      summary: 'Comparações e os operadores lógicos and, or e not.',
      intro: { who: 'yuki', text: 'Toda decisão se reduz a uma pergunta de resposta binária. Quem formula a pergunta errada recebe a resposta certa para o problema errado.' },
      sections: [
        { h: 'Perguntas que o Python responde', body: [
          'Uma **comparação** é uma pergunta cuja resposta é `True` (verdadeiro) ou `False` (falso). Esses dois valores formam o tipo `bool`.',
          { code: py`vida = 35
print(vida > 0)      # True
print(vida == 100)   # False  (== pergunta "é igual?")
print(vida != 100)   # True   (!= pergunta "é diferente?")
print(vida >= 35)    # True   (maior ou igual)` },
          { warn: '`=` guarda um valor. `==` compara dois valores. Trocar um pelo outro é o erro mais comum desta aula.' },
          'Textos também podem ser comparados. Maiúsculas contam: `"Mago" == "mago"` é `False`.',
        ] },
        { h: 'Combinando condições', body: [
          { list: [
            '`and` — verdadeiro só quando **as duas** condições são verdadeiras.',
            '`or` — verdadeiro quando **pelo menos uma** é verdadeira.',
            '`not` — inverte: `not True` é `False`.',
          ] },
          { code: py`nivel = 6
tem_chave = False

print(nivel >= 5 and tem_chave)    # False: falta a chave
print(nivel >= 5 or tem_chave)     # True: uma já basta
print(not tem_chave)               # True` },
          'Quando misturar vários, o Python resolve `not` primeiro, depois `and`, por último `or`. Parênteses deixam a intenção explícita — use sempre que houver `and` e `or` na mesma linha.',
        ] },
        { h: 'Guardando respostas', body: [
          'O resultado de uma comparação pode ser guardado em uma variável. Dar um bom nome a ela transforma uma condição complicada em uma frase legível:',
          { code: py`ouro = 80
preco = 60
mochila_cheia = False

pode_comprar = ouro >= preco and not mochila_cheia
print(pode_comprar)   # True` },
          'O operador `in` pergunta se algo está contido em outra coisa: `"a" in "mapa"` é `True`.',
        ] },
      ],
      game: {
        title: 'A porta trancada',
        text: 'Regras de acesso de um jogo são expressões booleanas. Mude os valores e tente prever o resultado de cada linha antes de rodar.',
        code: py`nivel = 4
tem_chave = True
e_mestre = False
vida = 12

abre_porta = (nivel >= 3 and tem_chave) or e_mestre
em_perigo = vida < 20 and not e_mestre

print("A porta abre?", abre_porta)
print("Vida em nível crítico?", em_perigo)
print("Pode enfrentar o chefe?", abre_porta and not em_perigo)`,
      },
      pitfalls: [
        'Escrever `if x = 10` no lugar de `x == 10`.',
        'Escrever `true` ou `false` em minúsculas: em Python é `True` e `False`.',
        'Escrever `nivel >= 3 and <= 10`: cada lado do `and` precisa ser uma comparação completa (`nivel >= 3 and nivel <= 10`).',
      ],
      recap: ['Comparações devolvem `True` ou `False`.', '`==` compara; `=` atribui.', '`and` exige as duas, `or` exige uma, `not` inverte.'],
      exercises: [
        {
          id: 'bool-1', level: 1, title: 'Controle de acesso',
          task: 'Para entrar no salão é preciso ter nível 5 ou mais **e** ter convite. Com `nivel = 8` e `tem_convite = True`, calcule `pode_entrar` usando uma comparação e `and`. Mostre `pode_entrar`.',
          starter: py`nivel = 8
tem_convite = True
pode_entrar = False  # Substitua pela condição
print(pode_entrar)`,
          hint: 'pode_entrar = nivel >= 5 and tem_convite',
          solution: py`nivel = 8
tem_convite = True
pode_entrar = nivel >= 5 and tem_convite
print(pode_entrar)`,
          expected: 'True',
          check: py`assert pode_entrar is True, "pode_entrar deve ser o booleano True."
assert "and" in __fonte__ and ">=" in __fonte__, "Escreva a condição com >= e and, em vez de digitar True."`,
        },
        {
          id: 'bool-2', level: 2, title: 'A loja do ferreiro',
          task: 'Um jogador só consegue comprar se tiver ouro suficiente **e** a mochila não estiver cheia. Com os valores dados, calcule `pode_comprar` usando `>=`, `and` e `not`. Mostre o resultado.',
          starter: py`ouro = 45
preco = 60
mochila_cheia = False
pode_comprar = True  # Substitua pela condição
print(pode_comprar)`,
          hint: 'pode_comprar = ouro >= preco and not mochila_cheia. Com 45 de ouro e preço 60, a resposta é False.',
          solution: py`ouro = 45
preco = 60
mochila_cheia = False
pode_comprar = ouro >= preco and not mochila_cheia
print(pode_comprar)`,
          expected: 'False',
          check: py`assert pode_comprar is False, "Com 45 de ouro e preço 60, não dá para comprar."
assert "not" in __fonte__ and "and" in __fonte__, "Use and e not na condição."`,
        },
        {
          id: 'bool-3', level: 3, title: 'Golpe crítico',
          task: 'O golpe é crítico quando a `sorte` é 90 ou mais, **ou** quando o ataque é furtivo e o inimigo não está alerta. Calcule `critico` com `or`, `and` e `not` (use parênteses) e mostre o resultado.',
          starter: py`sorte = 40
furtivo = True
inimigo_alerta = False
critico = False  # Substitua pela condição
print(critico)`,
          hint: 'critico = sorte >= 90 or (furtivo and not inimigo_alerta)',
          solution: py`sorte = 40
furtivo = True
inimigo_alerta = False
critico = sorte >= 90 or (furtivo and not inimigo_alerta)
print(critico)`,
          expected: 'True',
          check: py`assert critico is True, "Ataque furtivo contra inimigo distraído deve ser crítico."
assert " or " in __fonte__ and "not" in __fonte__ and "and" in __fonte__, "Monte a condição com or, and e not."`,
        },
      ],
      quiz: [
        { q: 'Qual expressão verifica se `x` é igual a 10?', options: ['x = 10', 'x == 10', 'x != 10', 'x => 10'], correct: 1, why: '= guarda um valor; == compara dois valores e devolve True ou False.' },
        { q: 'Quanto vale `True and False or True`?', options: ['True', 'False', 'Um erro', 'None'], correct: 0, why: 'O and é resolvido primeiro: True and False dá False. Depois, False or True dá True.' },
      ],
    },

    {
      id: 'condicoes', title: 'Caminhos que se dividem', minutes: 11,
      summary: 'Faça o programa escolher com if, elif e else.',
      intro: { who: 'yuki', text: 'Se a condição for verdadeira, um caminho. Senão, outro. Parece simples. A maioria erra a indentação antes de errar a lógica.' },
      sections: [
        { h: 'if: só se for verdade', body: [
          'O `if` executa um bloco de código **somente** quando a condição é verdadeira. O bloco é formado pelas linhas recuadas logo abaixo:',
          { code: py`vida = 0
if vida <= 0:
    print("Fim de jogo.")
    print("Tente outra vez.")
print("Esta linha roda sempre.")` },
          'Duas regras de escrita: a linha do `if` termina com **dois-pontos**, e as linhas do bloco ficam recuadas com **4 espaços**. Em Python, o recuo não é enfeite: é ele que diz o que está dentro e o que está fora do `if`.',
        ] },
        { h: 'else: o outro caminho', body: [
          { code: py`ouro = 30
if ouro >= 50:
    print("Você compra a espada.")
else:
    print("Ouro insuficiente.")` },
          'Exatamente um dos dois blocos é executado. O `else` não tem condição: ele pega tudo o que sobrou.',
        ] },
        { h: 'elif: várias portas', body: [
          'Para mais de dois caminhos, use `elif` (“senão, se”). O Python testa de cima para baixo e executa **apenas o primeiro** bloco verdadeiro; os demais são ignorados.',
          { code: py`pontos = 720
if pontos >= 1000:
    rank = "Ouro"
elif pontos >= 500:
    rank = "Prata"
else:
    rank = "Bronze"
print(rank)   # Prata` },
          { tip: 'A ordem importa. Se o teste `pontos >= 500` viesse primeiro, alguém com 1200 pontos cairia em Prata e nunca chegaria ao teste do Ouro.' },
        ] },
        { h: 'Condições dentro de condições', body: [
          'Um `if` pode morar dentro de outro. Cada nível ganha mais 4 espaços de recuo:',
          { code: py`tem_chave = True
nivel = 2
if tem_chave:
    if nivel >= 3:
        print("A porta se abre.")
    else:
        print("A chave gira, mas a porta resiste.")
else:
    print("Trancada.")` },
        ] },
      ],
      game: {
        title: 'Pedra, papel, tesoura',
        text: 'O juiz de um jogo é uma cadeia de condições. Troque as jogadas e confira se o juiz acerta todos os casos.',
        code: py`jogador = "pedra"
rival = "tesoura"

print(f"Você: {jogador} | Rival: {rival}")

if jogador == rival:
    print("Empate!")
elif jogador == "pedra" and rival == "tesoura":
    print("Pedra quebra tesoura. Você venceu!")
elif jogador == "papel" and rival == "pedra":
    print("Papel embrulha pedra. Você venceu!")
elif jogador == "tesoura" and rival == "papel":
    print("Tesoura corta papel. Você venceu!")
else:
    print("O rival venceu esta rodada.")`,
      },
      pitfalls: [
        'Esquecer os dois-pontos no fim de `if`, `elif` ou `else`.',
        'Misturar recuos: 4 espaços em uma linha e 2 na seguinte causa `IndentationError`.',
        'Usar vários `if` soltos quando queria `elif`: todos são testados e mais de um pode executar.',
      ],
      recap: ['`if` executa o bloco quando a condição é verdadeira.', '`elif` testa outra condição; `else` pega o resto.', 'Só o primeiro bloco verdadeiro da cadeia roda.', 'O recuo de 4 espaços delimita o bloco.'],
      exercises: [
        {
          id: 'cond-1', level: 1, title: 'De pé ou derrotado',
          task: 'Com `vida = 12`, guarde em `estado` o texto `De pé` se a vida for maior que zero; caso contrário, guarde `Derrotado`. Use `if` e `else`, e mostre `estado`.',
          starter: py`vida = 12
estado = ""
# Escreva a condição e os dois caminhos
print(estado)`,
          hint: 'if vida > 0: na linha de baixo, com 4 espaços, estado = "De pé". Depois else: e o outro valor.',
          solution: py`vida = 12
if vida > 0:
    estado = "De pé"
else:
    estado = "Derrotado"
print(estado)`,
          expected: 'De pé',
          check: py`assert estado == "De pé", "Com vida 12, estado deve ser De pé."
assert "if" in __fonte__ and "else" in __fonte__, "Use if e else."`,
        },
        {
          id: 'cond-2', level: 2, title: 'Sistema de ranks',
          task: 'Leia uma pontuação inteira com `input()`. Mostre `Rank: Ouro` para 1000 ou mais, `Rank: Prata` para 500 ou mais, e `Rank: Bronze` para o resto. Use `if`, `elif` e `else`.',
          starter: py`pontos = int(input("Pontuação: "))
# Decida o rank e mostre "Rank: ..."
`,
          hint: 'Teste primeiro o caso mais exigente (>= 1000), depois o >= 500 com elif, e deixe o Bronze no else.',
          solution: py`pontos = int(input("Pontuação: "))
if pontos >= 1000:
    rank = "Ouro"
elif pontos >= 500:
    rank = "Prata"
else:
    rank = "Bronze"
print(f"Rank: {rank}")`,
          cases: [
            { inputs: ['720'], expected: 'Rank: Prata' },
            { inputs: ['1000'], expected: 'Rank: Ouro' },
            { inputs: ['499'], expected: 'Rank: Bronze' },
            { inputs: ['500'], expected: 'Rank: Prata' },
          ],
        },
        {
          id: 'cond-3', level: 3, title: 'O juiz',
          task: 'Leia duas jogadas com `input()`: primeiro a do jogador, depois a do rival. Cada uma será `pedra`, `papel` ou `tesoura`. Mostre apenas `vitória`, `derrota` ou `empate`, do ponto de vista do jogador. (Pedra vence tesoura, tesoura vence papel, papel vence pedra.)',
          starter: py`jogador = input("Sua jogada: ")
rival = input("Jogada do rival: ")
# Mostre vitória, derrota ou empate
`,
          hint: 'Comece pelo empate (jogador == rival). Depois liste, com elif e or, as três combinações em que o jogador vence. O que sobrar no else é derrota.',
          solution: py`jogador = input("Sua jogada: ")
rival = input("Jogada do rival: ")
if jogador == rival:
    print("empate")
elif (jogador == "pedra" and rival == "tesoura") or (jogador == "tesoura" and rival == "papel") or (jogador == "papel" and rival == "pedra"):
    print("vitória")
else:
    print("derrota")`,
          cases: [
            { inputs: ['pedra', 'tesoura'], expected: 'vitória' },
            { inputs: ['papel', 'tesoura'], expected: 'derrota' },
            { inputs: ['papel', 'papel'], expected: 'empate' },
            { inputs: ['tesoura', 'papel'], expected: 'vitória' },
            { inputs: ['papel', 'pedra'], expected: 'vitória' },
            { inputs: ['pedra', 'papel'], expected: 'derrota' },
          ],
        },
      ],
      quiz: [
        { q: 'Em uma cadeia `if / elif / else`, quantos blocos são executados?', options: ['Todos os verdadeiros', 'Exatamente um', 'Sempre dois', 'Nenhum'], correct: 1, why: 'O Python executa o primeiro bloco cuja condição é verdadeira; havendo else, sempre um bloco roda.' },
        { q: 'O que delimita o bloco de código que pertence a um `if`?', options: ['Chaves { }', 'A palavra end', 'O recuo (indentação)', 'Parênteses'], correct: 2, why: 'Em Python o bloco é formado pelas linhas recuadas abaixo da linha que termina com dois-pontos.' },
      ],
    },

    {
      id: 'acaso', title: 'Rolando os dados', minutes: 9,
      summary: 'Use o módulo random para criar sorte, risco e surpresa.',
      intro: { who: 'yuki', text: 'Acaso não é ausência de regra. É uma regra com distribuição de probabilidade. Aprenda a escrevê-la antes de reclamar da sorte.' },
      sections: [
        { h: 'Importando ferramentas', body: [
          'O Python vem com centenas de ferramentas prontas organizadas em **módulos**. Para usar um módulo, importe-o no começo do programa. O `random` é o módulo dos números aleatórios:',
          { code: py`import random

dado = random.randint(1, 6)   # inteiro entre 1 e 6, incluindo os dois
print(dado)` },
          'Rode esse código várias vezes: o resultado muda. Repare que em `randint` os **dois limites entram** no sorteio.',
        ] },
        { h: 'Outras formas de sortear', body: [
          { code: py`import random

classe = random.choice(["guerreiro", "mago", "ladino"])  # escolhe um item
chance = random.random()        # decimal entre 0.0 e 1.0
print(classe, chance)` },
          'Os colchetes criam uma **lista** de opções. Listas ganham um capítulo só para elas mais adiante; por enquanto, basta saber que `random.choice()` tira um item de dentro.',
        ] },
        { h: 'Probabilidade com if', body: [
          'Para algo acontecer em 30% das vezes, sorteie um número de 1 a 100 e teste se ele ficou dentro da faixa:',
          { code: py`import random

if random.randint(1, 100) <= 30:
    print("Você encontrou um item raro!")
else:
    print("Só poeira.")` },
          { tip: '`random.seed(7)` fixa a sequência de sorteios. É útil para testar: com a mesma semente, o programa sorteia sempre os mesmos números.' },
        ] },
      ],
      game: {
        title: 'O d20',
        text: 'Em RPGs de mesa, o dado de 20 lados decide tudo: 20 é acerto crítico, 1 é falha crítica. Rode várias vezes e observe a sorte mudar.',
        code: py`import random

ataque = 6
defesa_do_goblin = 13

dado = random.randint(1, 20)
total = dado + ataque
print(f"Você rolou {dado} (+{ataque} de ataque = {total})")

if dado == 20:
    print("ACERTO CRÍTICO! Dano dobrado.")
elif dado == 1:
    print("Falha crítica... você tropeça na própria espada.")
elif total >= defesa_do_goblin:
    print("Acertou o goblin!")
else:
    print("O goblin desvia.")`,
      },
      pitfalls: [
        'Esquecer o `import random` no começo do programa: `NameError`.',
        'Escrever só `randint(1, 6)`: a função mora dentro do módulo, então é `random.randint(1, 6)`.',
        'Sortear de novo sem querer: cada chamada gera um número novo. Guarde o resultado em uma variável se for usá-lo mais de uma vez.',
      ],
      recap: ['`import random` libera as funções de sorteio.', '`random.randint(a, b)` inclui `a` e `b`.', '`random.choice(lista)` sorteia um item.', 'Sorteio + `if` = probabilidade.'],
      exercises: [
        {
          id: 'rand-1', level: 1, title: 'Dado de seis lados',
          task: 'Importe o módulo `random`, sorteie um número inteiro de 1 a 6 com `random.randint()`, guarde em `dado` e mostre o valor.',
          starter: py`# Importe o módulo e role o dado
dado = 0
print(dado)`,
          hint: 'Primeira linha: import random. Depois: dado = random.randint(1, 6).',
          solution: py`import random

dado = random.randint(1, 6)
print(dado)`,
          check: py`assert type(dado) is int and 1 <= dado <= 6, "dado deve ser um inteiro entre 1 e 6."
assert "randint" in __fonte__, "Use random.randint() para sortear."
assert __saida__.strip() == str(dado), "Mostre apenas o valor do dado."`,
          cases: [{ seed: 1 }, { seed: 2 }, { seed: 3 }],
        },
        {
          id: 'rand-2', level: 2, title: 'Cara ou coroa',
          task: 'Sorteie `cara` ou `coroa` com `random.choice()`, guarde em `lado` e mostre a frase `Deu LADO!` (por exemplo, `Deu coroa!`).',
          starter: py`import random

lado = ""
# Sorteie e mostre a frase
`,
          hint: 'lado = random.choice(["cara", "coroa"]) e depois print(f"Deu {lado}!").',
          solution: py`import random

lado = random.choice(["cara", "coroa"])
print(f"Deu {lado}!")`,
          check: py`assert lado in ("cara", "coroa"), "lado deve ser cara ou coroa."
assert "choice" in __fonte__, "Use random.choice() para sortear."
assert __saida__.strip() == f"Deu {lado}!", "A frase deve ser exatamente: Deu cara! ou Deu coroa!"`,
          cases: [{ seed: 1 }, { seed: 2 }, { seed: 5 }, { seed: 8 }],
        },
        {
          id: 'rand-3', level: 3, title: 'Ataque com crítico',
          task: 'Role um d20 e guarde em `rolagem`. O `dano` base é 10. Se a rolagem for 20, o dano dobra; se for 1, o dano vira 0; nos outros casos, continua 10. Mostre a rolagem e depois o dano, um por linha.',
          starter: py`import random

rolagem = random.randint(1, 20)
dano = 10
# Ajuste o dano conforme a rolagem

print(rolagem)
print(dano)`,
          hint: 'if rolagem == 20: dano = dano * 2 — e um elif rolagem == 1: dano = 0. Não precisa de else.',
          solution: py`import random

rolagem = random.randint(1, 20)
dano = 10
if rolagem == 20:
    dano = dano * 2
elif rolagem == 1:
    dano = 0

print(rolagem)
print(dano)`,
          check: py`assert type(rolagem) is int and 1 <= rolagem <= 20, "rolagem deve ser um inteiro de 1 a 20."
_esperado = 20 if rolagem == 20 else 0 if rolagem == 1 else 10
assert dano == _esperado, f"Com rolagem {rolagem}, o dano deveria ser {_esperado}."
assert __saida__.split() == [str(rolagem), str(dano)], "Mostre a rolagem e depois o dano, um por linha."`,
          cases: [{ seed: 0 }, { seed: 5 }, { seed: 31 }, { seed: 4 }],
        },
      ],
      quiz: [
        { q: 'Quais valores `random.randint(1, 6)` pode devolver?', options: ['De 1 a 5', 'De 0 a 6', 'De 1 a 6', 'De 2 a 5'], correct: 2, why: 'Em randint os dois limites entram no sorteio: de 1 a 6, inclusive.' },
        { q: 'Como fazer um evento acontecer em cerca de 25% das vezes?', options: ['if random.randint(1, 100) <= 25:', 'if random == 25:', 'if random.randint(1, 25):', 'if 25%:'], correct: 0, why: 'Sorteando de 1 a 100, os números de 1 a 25 representam 25 das 100 possibilidades.' },
      ],
    },
  ],

  duel: {
    title: 'Exame Especial: O porteiro da arena',
    seconds: 480,
    brief: 'Yuki não comete erros de lógica. Seu código vai ser testado com vários casos, não só um.',
    task: 'O porteiro da arena lê duas informações com `input()`: primeiro o `nivel` (um inteiro), depois a `classe` (um texto). Mostre **apenas** o destino do jogador:\n\n• classe `mestre` → `Arena principal`, em qualquer nível\n• nível 10 ou mais → `Arena principal`\n• nível de 5 a 9 → `Arena de treino`\n• abaixo disso → `Acesso negado`',
    starter: py`nivel = int(input("Nível: "))
classe = input("Classe: ")

# Decida e mostre o destino
`,
    hint: 'A regra do mestre pode entrar junto com a do nível 10, usando or: if classe == "mestre" or nivel >= 10.',
    solution: py`nivel = int(input("Nível: "))
classe = input("Classe: ")

if classe == "mestre" or nivel >= 10:
    print("Arena principal")
elif nivel >= 5:
    print("Arena de treino")
else:
    print("Acesso negado")`,
    cases: [
      { inputs: ['12', 'mago'], expected: 'Arena principal' },
      { inputs: ['7', 'mago'], expected: 'Arena de treino' },
      { inputs: ['2', 'ladino'], expected: 'Acesso negado' },
      { inputs: ['1', 'mestre'], expected: 'Arena principal' },
      { inputs: ['5', 'guerreiro'], expected: 'Arena de treino' },
      { inputs: ['10', 'arqueiro'], expected: 'Arena principal' },
      { inputs: ['4', 'mago'], expected: 'Acesso negado' },
    ],
    taunts: [
      'Leitura das entradas concluída. Tempo gasto: irrelevante.',
      'Você considerou o caso do nível exatamente igual a 5? Eu considerei.',
      'Três ramos escritos. Falta verificar as bordas.',
      'Seis casos de teste aprovados mentalmente. Compilando.',
    ],
  },
};
