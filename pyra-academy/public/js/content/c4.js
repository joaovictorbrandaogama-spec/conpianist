const py = String.raw;

export default {
  id: 'c4', n: 4, rival: 'bianca',
  title: 'Coleções',
  subtitle: 'Muitos valores, um só nome',
  blurb: 'Listas, dicionários e tabuleiros. Inventários, lojas, fichas e mapas são feitos disso.',
  lessons: [
    {
      id: 'listas', title: 'O inventário', minutes: 12,
      summary: 'Guarde vários valores em ordem com listas.',
      intro: { who: 'bianca', text: 'Informação solta não vale nada, meu bem. Informação organizada vale… bem, vale o que eu disser que vale.' },
      sections: [
        { h: 'Uma variável, muitos valores', body: [
          'Uma **lista** guarda vários valores em ordem, dentro de colchetes e separados por vírgula. Cada item tem uma posição (índice), e a contagem **começa em zero**:',
          { code: py`inventario = ["espada", "poção", "mapa"]
print(inventario[0])     # espada  (primeiro)
print(inventario[-1])    # mapa    (último)
print(len(inventario))   # 3       (quantidade de itens)` },
          'Pedir uma posição que não existe, como `inventario[3]` aqui, causa `IndexError`. Com 3 itens, os índices válidos são 0, 1 e 2.',
        ] },
        { h: 'Listas mudam', body: [
          { code: py`inventario = ["espada", "poção"]
inventario.append("escudo")     # adiciona no fim
inventario[0] = "espada longa"  # troca o item da posição 0
inventario.remove("poção")      # remove pelo valor
ultimo = inventario.pop()       # remove e devolve o último
print(inventario, ultimo)` },
          'Para saber se algo está na lista, use `in`: `"mapa" in inventario` devolve `True` ou `False`.',
        ] },
        { h: 'Percorrendo uma lista', body: [
          'O `for` percorre os itens um a um — é a combinação mais usada da linguagem:',
          { code: py`pontuacoes = [120, 95, 180]
acima_de_100 = 0
for pontos in pontuacoes:
    if pontos > 100:
        acima_de_100 += 1
print(acima_de_100)   # 2` },
        ] },
        { h: 'Ferramentas prontas', body: [
          { code: py`pontuacoes = [120, 95, 180]
print(sum(pontuacoes))      # 395  soma
print(max(pontuacoes))      # 180  maior
print(min(pontuacoes))      # 95   menor
print(sorted(pontuacoes))   # [95, 120, 180]  cópia ordenada
print(pontuacoes[0:2])      # [120, 95]  fatia: da posição 0 até antes da 2` },
        ] },
      ],
      game: {
        title: 'Mochila do aventureiro',
        text: 'Um inventário é uma lista que cresce e encolhe durante o jogo. Acompanhe cada mudança e tente adicionar o seu próprio item.',
        code: py`mochila = ["tocha", "corda"]
capacidade = 4

achados = ["poção", "gema", "armadura pesada"]
for item in achados:
    if len(mochila) < capacidade:
        mochila.append(item)
        print(f"+ {item}")
    else:
        print(f"Mochila cheia! {item} ficou para trás.")

if "poção" in mochila:
    mochila.remove("poção")
    print("Você bebe a poção.")

print("Mochila:", mochila)
print(f"Espaço livre: {capacidade - len(mochila)}")`,
      },
      pitfalls: [
        'Contar a partir de 1: o primeiro item é o `[0]`, e o último é `[len(lista) - 1]` ou `[-1]`.',
        'Escrever `lista = lista.append(x)`: `append` altera a própria lista e devolve `None`.',
        'Remover um item que não está na lista com `.remove()`: `ValueError`. Teste com `in` antes.',
      ],
      recap: ['Listas usam `[ ]` e índices a partir de 0.', '`.append()` adiciona, `.remove()` e `.pop()` retiram.', '`for item in lista` percorre.', '`len`, `sum`, `max`, `min` e `sorted` resumem.'],
      exercises: [
        {
          id: 'lst-1', level: 1, title: 'Novo item',
          task: 'Com `inventario = ["espada", "poção"]`, adicione `escudo` usando `.append()`. Mostre o último item e depois a quantidade de itens, um por linha.',
          starter: py`inventario = ["espada", "poção"]
# Adicione um item e mostre os resultados
`,
          hint: 'inventario.append("escudo"), depois print(inventario[-1]) e print(len(inventario)).',
          solution: py`inventario = ["espada", "poção"]
inventario.append("escudo")
print(inventario[-1])
print(len(inventario))`,
          expected: 'escudo\n3',
          check: py`assert inventario == ["espada", "poção", "escudo"], "A lista deve ter os três itens, nessa ordem."
assert "append" in __fonte__, "Use .append() para adicionar."`,
        },
        {
          id: 'lst-2', level: 2, title: 'Estatísticas da partida',
          task: 'Com as pontuações dadas, calcule `maior` (a maior pontuação), `total` (a soma) e `acima` (quantas são **maiores que 100**, contando com um `for`). Mostre os três valores, um por linha, nessa ordem.',
          starter: py`pontuacoes = [120, 95, 180, 60]
maior = 0
total = 0
acima = 0

print(maior)
print(total)
print(acima)`,
          hint: 'maior = max(pontuacoes) e total = sum(pontuacoes). Para acima: percorra a lista e some 1 quando pontos > 100.',
          solution: py`pontuacoes = [120, 95, 180, 60]
maior = max(pontuacoes)
total = sum(pontuacoes)
acima = 0
for pontos in pontuacoes:
    if pontos > 100:
        acima += 1

print(maior)
print(total)
print(acima)`,
          expected: '180\n455\n2',
          check: py`assert (maior, total, acima) == (180, 455, 2), "Confira: maior 180, total 455 e 2 pontuações acima de 100."
assert "for" in __fonte__, "Conte as pontuações acima de 100 com um for."`,
        },
        {
          id: 'lst-3', level: 3, title: 'Separando o saque',
          task: 'Conte quantas vezes `ouro` aparece em `saque` (guarde em `moedas`) e monte uma **nova lista** `sem_ouro` com todos os outros itens, na mesma ordem. Mostre `moedas` e depois `sem_ouro`.',
          starter: py`saque = ["ouro", "poção", "ouro", "gema", "ouro", "mapa"]
moedas = 0
sem_ouro = []
# Percorra o saque separando o ouro do resto

print(moedas)
print(sem_ouro)`,
          hint: 'for item in saque: se item == "ouro", some 1 em moedas; senão, sem_ouro.append(item).',
          solution: py`saque = ["ouro", "poção", "ouro", "gema", "ouro", "mapa"]
moedas = 0
sem_ouro = []
for item in saque:
    if item == "ouro":
        moedas += 1
    else:
        sem_ouro.append(item)

print(moedas)
print(sem_ouro)`,
          expected: "3\n['poção', 'gema', 'mapa']",
          check: py`assert moedas == 3, "São 3 moedas de ouro."
assert sem_ouro == ["poção", "gema", "mapa"], "sem_ouro deve ter poção, gema e mapa, nessa ordem."
assert len(saque) == 6, "Não altere a lista saque: crie uma lista nova."`,
        },
      ],
      quiz: [
        { q: 'Em `valores = [10, 20, 30]`, o que `valores[1]` devolve?', options: ['10', '20', '30', '1'], correct: 1, why: 'O índice 0 aponta para 10; o índice 1 aponta para 20.' },
        { q: 'Depois de `itens = ["a", "b"]` e `itens.append("c")`, quanto vale `len(itens)`?', options: ['2', '3', '"c"', 'Um erro'], correct: 1, why: 'append adiciona um item ao final, então a lista passa a ter três itens.' },
      ],
    },

    {
      id: 'dicionarios', title: 'Fichas e atributos', minutes: 12,
      summary: 'Modele personagens, lojas e contagens com chave e valor.',
      intro: { who: 'bianca', text: 'Eu não decoro posições. Eu decoro nomes. Um bom dicionário é como uma boa rede de contatos: você pede pelo nome e recebe o que precisa.' },
      sections: [
        { h: 'Chave e valor', body: [
          'Um **dicionário** guarda pares: uma **chave** (o nome do dado) e um **valor**. Em vez de procurar pela posição, você procura pela chave:',
          { code: py`heroi = {"nome": "Kai", "vida": 20, "classe": "mago"}
print(heroi["nome"])     # Kai
print(heroi["vida"])     # 20` },
          'Dicionários usam chaves `{ }`, com `chave: valor` separados por vírgula. É a estrutura natural para uma ficha de personagem.',
        ] },
        { h: 'Alterando e consultando com segurança', body: [
          { code: py`heroi = {"nome": "Kai", "vida": 20}
heroi["vida"] = 35          # altera um valor existente
heroi["ouro"] = 100         # cria uma chave nova
heroi["vida"] -= 5          # funciona como qualquer variável

print("mana" in heroi)          # False: a chave não existe
print(heroi.get("mana", 0))     # 0: valor padrão, sem erro` },
          'Pedir uma chave que não existe com colchetes causa `KeyError`. Quando houver dúvida, use `in` ou `.get(chave, padrão)`.',
        ] },
        { h: 'Percorrendo um dicionário', body: [
          { code: py`precos = {"poção": 15, "escudo": 40}
for item in precos:                  # percorre as chaves
    print(item, precos[item])

for item, preco in precos.items():   # chave e valor juntos
    print(f"{item}: {preco} moedas")` },
          'Os itens saem na ordem em que foram inseridos.',
        ] },
        { h: 'O padrão da contagem', body: [
          'Um uso muito comum: contar quantas vezes cada coisa aparece. A chave é a coisa, o valor é a contagem.',
          { code: py`letras = ["a", "b", "a"]
contagem = {}
for letra in letras:
    contagem[letra] = contagem.get(letra, 0) + 1
print(contagem)   # {'a': 2, 'b': 1}` },
        ] },
      ],
      game: {
        title: 'A loja de itens',
        text: 'Uma loja é um dicionário de preços; o carrinho é uma lista. Juntar as duas estruturas é o que você fará o tempo todo em projetos reais.',
        code: py`precos = {"poção": 15, "escudo": 40, "espada": 60, "mapa": 8}
carteira = 100
carrinho = ["poção", "espada", "mapa", "escudo"]

print("=== LOJA ===")
for item, preco in precos.items():
    print(f"{item:<8} {preco:>3} moedas")
print()

for item in carrinho:
    preco = precos[item]
    if carteira >= preco:
        carteira -= preco
        print(f"Comprou {item}. Restam {carteira} moedas.")
    else:
        print(f"Faltam {preco - carteira} moedas para {item}.")`,
      },
      pitfalls: [
        'Acessar chave inexistente com colchetes: `KeyError`. Use `.get()` ou teste com `in`.',
        'Esquecer as aspas da chave: `heroi[nome]` procura uma variável chamada `nome`.',
        'Confundir os fechamentos: listas usam `[ ]`, dicionários usam `{ }`.',
      ],
      recap: ['`{"chave": valor}` cria; `d["chave"]` consulta e altera.', '`.get(chave, padrão)` evita `KeyError`.', '`for chave, valor in d.items()` percorre os pares.'],
      exercises: [
        {
          id: 'dic-1', level: 1, title: 'Subindo de nível',
          task: 'O herói `Kai` tem `vida` 20. Atualize a vida para 35 e adicione a chave `nivel` com valor 2. Mostre o nome, a vida e o nível, um por linha.',
          starter: py`heroi = {"nome": "Kai", "vida": 20}
# Atualize a vida e adicione o nível

print(heroi["nome"])`,
          hint: 'heroi["vida"] = 35 e heroi["nivel"] = 2. Depois consulte cada valor pela chave.',
          solution: py`heroi = {"nome": "Kai", "vida": 20}
heroi["vida"] = 35
heroi["nivel"] = 2

print(heroi["nome"])
print(heroi["vida"])
print(heroi["nivel"])`,
          expected: 'Kai\n35\n2',
          check: py`assert heroi == {"nome": "Kai", "vida": 35, "nivel": 2}, "O dicionário deve ter nome Kai, vida 35 e nivel 2."`,
        },
        {
          id: 'dic-2', level: 2, title: 'Fechando a conta',
          task: 'Use o dicionário `precos` para calcular o `total` do `carrinho` com um `for`. Mostre `Total: N moedas`.',
          starter: py`precos = {"poção": 15, "escudo": 40, "espada": 60}
carrinho = ["poção", "poção", "espada"]
total = 0
# Some o preço de cada item do carrinho

print(f"Total: {total} moedas")`,
          hint: 'for item in carrinho: total += precos[item]',
          solution: py`precos = {"poção": 15, "escudo": 40, "espada": 60}
carrinho = ["poção", "poção", "espada"]
total = 0
for item in carrinho:
    total += precos[item]

print(f"Total: {total} moedas")`,
          expected: 'Total: 90 moedas',
          check: py`assert total == 90, "Duas poções e uma espada custam 90."
assert "for" in __fonte__ and "90" not in __fonte__, "Calcule com um for consultando o dicionário."`,
        },
        {
          id: 'dic-3', level: 3, title: 'Apuração dos votos',
          task: 'A sala votou em quem deve liderar o projeto. Monte o dicionário `contagem` com o número de votos de cada nome e depois mostre uma linha por pessoa no formato `Nome: N`, na ordem em que os nomes aparecem pela primeira vez.',
          starter: py`votos = ["Sora", "Bianca", "Sora", "Theo", "Sora", "Bianca"]
contagem = {}
# Conte os votos

# Mostre "Nome: N" para cada pessoa
`,
          hint: 'Para contar: contagem[nome] = contagem.get(nome, 0) + 1. Para mostrar: for nome, total in contagem.items().',
          solution: py`votos = ["Sora", "Bianca", "Sora", "Theo", "Sora", "Bianca"]
contagem = {}
for nome in votos:
    contagem[nome] = contagem.get(nome, 0) + 1

for nome, total in contagem.items():
    print(f"{nome}: {total}")`,
          expected: 'Sora: 3\nBianca: 2\nTheo: 1',
          check: py`assert contagem == {"Sora": 3, "Bianca": 2, "Theo": 1}, "A contagem deve ser Sora 3, Bianca 2, Theo 1."
assert "for" in __fonte__, "Use um for para contar."`,
        },
      ],
      quiz: [
        { q: 'O que `dados.get("cidade", "Não informada")` faz se a chave `cidade` não existe?', options: ['Devolve "Não informada"', 'Cria a chave automaticamente', 'Devolve "cidade"', 'Causa KeyError'], correct: 0, why: 'get() devolve o valor padrão quando a chave não existe, sem alterar o dicionário.' },
        { q: 'Como alterar a vida do herói para 50 em `heroi = {"vida": 20}`?', options: ['heroi.vida = 50', 'heroi["vida"] = 50', 'heroi[0] = 50', 'heroi = 50'], correct: 1, why: 'Valores de um dicionário são acessados e alterados pela chave, entre colchetes.' },
      ],
    },

    {
      id: 'tabuleiro', title: 'O tabuleiro', minutes: 12,
      summary: 'Listas dentro de listas: mapas, grades e jogo da velha.',
      intro: { who: 'bianca', text: 'Quem enxerga o tabuleiro inteiro joga diferente de quem só enxerga a própria peça. Hoje você aprende a construir o tabuleiro.' },
      sections: [
        { h: 'Listas de listas', body: [
          'Uma lista pode guardar outras listas. Com isso você representa qualquer coisa em formato de grade: um mapa, um tabuleiro, uma tela de pixels. Cada lista de dentro é uma **linha**:',
          { code: py`tabuleiro = [
    ["X", "O", "X"],
    [" ", "X", "O"],
    ["O", " ", "X"],
]
print(tabuleiro[0])       # ['X', 'O', 'X']  a primeira linha
print(tabuleiro[1][2])    # O  linha 1, coluna 2` },
          'São dois índices: o primeiro escolhe a **linha**, o segundo escolhe a **coluna** dentro dela. Os dois começam em zero.',
        ] },
        { h: 'Percorrendo a grade', body: [
          'Dois laços aninhados visitam todas as casas: o de fora passa pelas linhas, o de dentro pelas casas de cada linha.',
          { code: py`mapa = [[".", "#"], ["#", "#"]]
paredes = 0
for linha in mapa:
    for casa in linha:
        if casa == "#":
            paredes += 1
print(paredes)   # 3` },
        ] },
        { h: 'Desenhando', body: [
          'Para mostrar uma linha como texto, use `.join()`: ele junta os itens de uma lista usando o texto que você escolher como separador.',
          { code: py`linha = ["T", ".", "@"]
print(" ".join(linha))    # T . @
print("".join(linha))     # T.@` },
          'Mudar uma casa é uma atribuição com dois índices: `mapa[1][2] = "@"`. Mover um personagem é apagar a casa antiga e marcar a nova.',
        ] },
      ],
      game: {
        title: 'Explorador de masmorra',
        text: 'Um mapa em grade, um herói representado por @ e uma lista de movimentos. A função de desenho é chamada a cada passo: é um game loop em miniatura.',
        code: py`mapa = [
    ["#", "#", "#", "#", "#", "#"],
    ["#", ".", ".", ".", "T", "#"],
    ["#", ".", "#", ".", ".", "#"],
    ["#", ".", ".", ".", ".", "#"],
    ["#", "#", "#", "#", "#", "#"],
]
linha, coluna = 3, 1
movimentos = ["direita", "direita", "cima", "cima", "direita"]

for passo in movimentos:
    nova_l, nova_c = linha, coluna
    if passo == "cima": nova_l -= 1
    if passo == "baixo": nova_l += 1
    if passo == "direita": nova_c += 1
    if passo == "esquerda": nova_c -= 1

    if mapa[nova_l][nova_c] == "#":
        print(f"{passo}: parede!")
        continue
    linha, coluna = nova_l, nova_c
    if mapa[linha][coluna] == "T":
        print("Você encontrou o tesouro!")
        mapa[linha][coluna] = "."

mapa[linha][coluna] = "@"
for fileira in mapa:
    print(" ".join(fileira))`,
      },
      pitfalls: [
        'Inverter os índices: é sempre `grade[linha][coluna]`, nunca coluna primeiro.',
        'Sair da grade: `grade[3]` em uma grade de 3 linhas causa `IndexError`.',
        'Usar `.join()` em uma lista com números: ele só junta textos.',
      ],
      recap: ['Uma grade é uma lista de linhas.', '`grade[linha][coluna]` acessa uma casa.', 'Dois `for` aninhados visitam tudo.', '`" ".join(linha)` transforma a linha em texto.'],
      exercises: [
        {
          id: 'tab-1', level: 1, title: 'Lendo o tabuleiro',
          task: 'No tabuleiro de jogo da velha dado, mostre a casa do **centro** e depois a casa do **canto inferior direito**, uma por linha.',
          starter: py`tabuleiro = [
    ["X", "O", "X"],
    ["O", "X", " "],
    [" ", "O", "O"],
]
# Mostre o centro e o canto inferior direito
`,
          hint: 'O centro é a linha 1, coluna 1. O canto inferior direito é a linha 2, coluna 2.',
          solution: py`tabuleiro = [
    ["X", "O", "X"],
    ["O", "X", " "],
    [" ", "O", "O"],
]
print(tabuleiro[1][1])
print(tabuleiro[2][2])`,
          expected: 'X\nO',
          check: py`assert "[1][1]" in __fonte__.replace(" ", "") and "[2][2]" in __fonte__.replace(" ", ""), "Acesse as casas com dois índices: tabuleiro[linha][coluna]."`,
        },
        {
          id: 'tab-2', level: 2, title: 'Contando peças',
          task: 'Usando dois `for` aninhados, conte quantas casas do tabuleiro têm `X` e guarde em `total_x`. Mostre o resultado.',
          starter: py`tabuleiro = [
    ["X", "O", "X"],
    ["O", "X", " "],
    ["X", "O", "O"],
]
total_x = 0
# Percorra linhas e casas

print(total_x)`,
          hint: 'for linha in tabuleiro: e dentro, for casa in linha: — se casa == "X", some 1.',
          solution: py`tabuleiro = [
    ["X", "O", "X"],
    ["O", "X", " "],
    ["X", "O", "O"],
]
total_x = 0
for linha in tabuleiro:
    for casa in linha:
        if casa == "X":
            total_x += 1

print(total_x)`,
          expected: '4',
          check: py`assert total_x == 4, "Há 4 casas com X."
assert __fonte__.count("for") >= 2, "Use dois laços for aninhados."`,
        },
        {
          id: 'tab-3', level: 3, title: 'Posicionando as peças',
          task: 'Crie um mapa 3×3 só com `.`. Coloque o tesouro `T` na linha 0, coluna 0, e o herói `@` na linha 1, coluna 2. Depois mostre o mapa, uma linha por vez, com as casas separadas por espaço.',
          starter: py`mapa = [
    [".", ".", "."],
    [".", ".", "."],
    [".", ".", "."],
]
# Posicione T e @

# Desenhe o mapa
`,
          hint: 'mapa[0][0] = "T" e mapa[1][2] = "@". Para desenhar: for linha in mapa: print(" ".join(linha)).',
          solution: py`mapa = [
    [".", ".", "."],
    [".", ".", "."],
    [".", ".", "."],
]
mapa[0][0] = "T"
mapa[1][2] = "@"

for linha in mapa:
    print(" ".join(linha))`,
          expected: 'T . .\n. . @\n. . .',
          check: py`assert mapa == [["T", ".", "."], [".", ".", "@"], [".", ".", "."]], "T fica em [0][0] e @ em [1][2]."
assert "for" in __fonte__, "Desenhe o mapa com um for."`,
        },
      ],
      quiz: [
        { q: 'Em `g = [[1, 2], [3, 4]]`, quanto vale `g[1][0]`?', options: ['1', '2', '3', '4'], correct: 2, why: 'g[1] é a segunda linha, [3, 4]. O item de índice 0 dela é 3.' },
        { q: 'O que `"-".join(["a", "b", "c"])` devolve?', options: ['abc', 'a-b-c', '-abc-', '["a-b-c"]'], correct: 1, why: 'join junta os itens da lista colocando o separador entre eles.' },
      ],
    },
  ],

  duel: {
    title: 'Prova de Mérito: O mercado paralelo',
    seconds: 540,
    brief: 'Bianca negocia melhor do que programa — e programa muito bem. O desafio mistura dicionários, listas e condições.',
    task: 'Processe os pedidos na ordem. Cada pedido é uma lista `[item, quantidade]`.\n\n• Se o `estoque` do item for suficiente: diminua o estoque e some ao `total` o preço vezes a quantidade.\n• Se não for: mostre `Sem estoque: ITEM` e não venda nada desse pedido.\n\nNo fim, mostre `Total: N`.',
    starter: py`estoque = {"poção": 3, "elixir": 0, "bomba": 5}
precos = {"poção": 15, "elixir": 50, "bomba": 30}
pedidos = [["poção", 2], ["elixir", 1], ["bomba", 5], ["poção", 2]]
total = 0

# Processe cada pedido

print(f"Total: {total}")`,
    hint: 'for pedido in pedidos: item = pedido[0] e quantidade = pedido[1]. Depois, if estoque[item] >= quantidade: atualize estoque e total; else: mostre o aviso.',
    solution: py`estoque = {"poção": 3, "elixir": 0, "bomba": 5}
precos = {"poção": 15, "elixir": 50, "bomba": 30}
pedidos = [["poção", 2], ["elixir", 1], ["bomba", 5], ["poção", 2]]
total = 0

for pedido in pedidos:
    item = pedido[0]
    quantidade = pedido[1]
    if estoque[item] >= quantidade:
        estoque[item] -= quantidade
        total += precos[item] * quantidade
    else:
        print(f"Sem estoque: {item}")

print(f"Total: {total}")`,
    expected: 'Sem estoque: elixir\nSem estoque: poção\nTotal: 180',
    check: py`assert total == 180, "O total das vendas deve ser 180."
assert estoque == {"poção": 1, "elixir": 0, "bomba": 0}, "O estoque final deve ser: poção 1, elixir 0, bomba 0."
assert "for" in __fonte__ and "180" not in __fonte__, "Processe os pedidos com um laço."`,
    taunts: [
      'Que gracinha, você lê o enunciado até o fim. Eu já estou no laço.',
      'Metade dos pedidos processados. Quer comprar uma dica? Brincadeira. …Ou não.',
      'O segundo pedido de poção é uma armadilha. Ops, falei demais.',
      'Só conferindo o estoque final. Negócios são negócios.',
    ],
  },
};
