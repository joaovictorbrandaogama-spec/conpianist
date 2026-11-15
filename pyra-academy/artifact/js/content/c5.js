const py = String.raw;

export default {
  id: 'c5', n: 5, rival: 'sora',
  title: 'Funções e projeto',
  subtitle: 'Construa suas próprias ferramentas',
  blurb: 'Funções, parâmetros, retorno e um jogo inteiro montado peça por peça. O último degrau antes do topo.',
  lessons: [
    {
      id: 'funcoes', title: 'Pequenas máquinas', minutes: 12,
      summary: 'Dê nome a um trecho de código com def e devolva resultados com return.',
      intro: { who: 'sora', text: '…Você usa print, len e input desde o primeiro dia. Alguém escreveu essas funções. Hoje você passa para o outro lado.' },
      sections: [
        { h: 'Criando uma função', body: [
          'Uma **função** é um bloco de código com nome. Você a define uma vez com `def` e depois a **chama** quantas vezes quiser:',
          { code: py`def saudar():
    print("A arena está aberta!")
    print("Que vença o mérito.")

saudar()
saudar()` },
          'Definir não executa nada: o bloco só roda quando a função é chamada, com o nome seguido de parênteses.',
        ] },
        { h: 'Parâmetros: as entradas', body: [
          'Entre os parênteses você declara **parâmetros**: nomes que recebem os valores passados na chamada. Assim a mesma função serve para dados diferentes:',
          { code: py`def anunciar(nome, nivel):
    print(f"{nome} entra em campo (nível {nivel}).")

anunciar("Lia", 7)
anunciar("Kael", 3)` },
        ] },
        { h: 'return: a saída', body: [
          '`return` devolve um valor para quem chamou e encerra a função. O valor devolvido pode ser guardado em uma variável, usado em uma conta ou passado para outra função.',
          { code: py`def dano_final(ataque, defesa):
    return ataque - defesa

golpe = dano_final(18, 7)
print(golpe)                      # 11
print(dano_final(30, 5) * 2)      # 50` },
          { warn: '`print` mostra na tela; `return` devolve para o programa. Uma função que só faz `print` devolve `None`, e você não consegue usar o resultado dela em contas.' },
        ] },
        { h: 'Por que usar funções', body: [
          { list: [
            '**Reaproveitar**: escreva a fórmula de dano uma vez e use em todos os ataques.',
            '**Organizar**: um programa grande vira uma lista de passos com nomes claros.',
            '**Testar**: uma função pequena pode ser verificada sozinha, com valores diferentes.',
          ] },
        ] },
      ],
      game: {
        title: 'Sistema de combate',
        text: 'Com três funções pequenas, a batalha fica legível como uma história. Repare que o laço principal não tem nenhuma conta: só chama as funções.',
        code: py`import random

def rolar_ataque(forca):
    return forca + random.randint(1, 6)

def barra(vida, maximo):
    cheios = max(vida, 0) * 10 // maximo
    return "[" + "#" * cheios + "-" * (10 - cheios) + "]"

def mostrar(nome, vida, maximo):
    print(f"{nome:<8} {barra(vida, maximo)} {max(vida, 0)}/{maximo}")

vida_heroi, vida_orc = 30, 40
while vida_heroi > 0 and vida_orc > 0:
    vida_orc -= rolar_ataque(5)
    if vida_orc > 0:
        vida_heroi -= rolar_ataque(3)
    mostrar("Você", vida_heroi, 30)
    mostrar("Orc", vida_orc, 40)
    print()

print("Vitória!" if vida_heroi > 0 else "Derrota...")`,
      },
      pitfalls: [
        'Usar `print` quando o enunciado pede `return`: o valor aparece na tela, mas a função devolve `None`.',
        'Definir a função e esquecer de chamá-la: nada acontece.',
        'Escrever código depois do `return` no mesmo bloco: ele nunca é executado.',
      ],
      recap: ['`def nome(parametros):` define a função.', 'Chamar a função executa o bloco.', '`return` devolve um valor e encerra a função.'],
      exercises: [
        {
          id: 'fun-1', level: 1, title: 'Golpe dobrado',
          task: 'Crie a função `dobro(numero)`, que **devolve** o número multiplicado por 2. Depois mostre `dobro(21)`.',
          starter: py`def dobro(numero):
    return 0  # Complete a operação

print(dobro(21))`,
          hint: 'Troque o 0 por numero * 2. A função não deve ter print dentro dela.',
          solution: py`def dobro(numero):
    return numero * 2

print(dobro(21))`,
          expected: '42',
          check: py`assert callable(dobro), "Defina dobro como uma função."
assert dobro(21) == 42 and dobro(0) == 0 and dobro(-3) == -6, "dobro deve funcionar para qualquer número, inclusive zero e negativos."`,
        },
        {
          id: 'fun-2', level: 2, title: 'Classificador',
          task: 'Crie duas funções:\n\n• `esta_vivo(vida)` devolve `True` se a vida for maior que zero e `False` caso contrário.\n• `rank(pontos)` devolve `"Ouro"` para 1000 ou mais, `"Prata"` para 500 ou mais e `"Bronze"` para o resto.\n\nMostre `esta_vivo(12)` e `rank(720)`, um por linha.',
          starter: py`def esta_vivo(vida):
    pass  # Devolva True ou False

def rank(pontos):
    pass  # Devolva o texto do rank

print(esta_vivo(12))
print(rank(720))`,
          hint: 'esta_vivo cabe em uma linha: return vida > 0. Em rank, cada ramo do if/elif/else tem o seu próprio return.',
          solution: py`def esta_vivo(vida):
    return vida > 0

def rank(pontos):
    if pontos >= 1000:
        return "Ouro"
    elif pontos >= 500:
        return "Prata"
    else:
        return "Bronze"

print(esta_vivo(12))
print(rank(720))`,
          expected: 'True\nPrata',
          check: py`assert esta_vivo(1) is True and esta_vivo(0) is False and esta_vivo(-5) is False, "esta_vivo deve devolver True só quando a vida é maior que zero."
assert rank(1000) == "Ouro" and rank(999) == "Prata" and rank(500) == "Prata" and rank(499) == "Bronze" and rank(0) == "Bronze", "Confira os limites de cada rank."`,
        },
        {
          id: 'fun-3', level: 3, title: 'Fábrica de barras',
          task: 'Crie a função `barra(vida, maximo)`, que devolve um texto com um `#` para cada ponto de vida e um `-` para cada ponto que falta, entre colchetes. Exemplo: `barra(3, 5)` devolve `[###--]`. Mostre `barra(3, 5)`.',
          starter: py`def barra(vida, maximo):
    return ""

print(barra(3, 5))`,
          hint: 'return "[" + "#" * vida + "-" * (maximo - vida) + "]"',
          solution: py`def barra(vida, maximo):
    return "[" + "#" * vida + "-" * (maximo - vida) + "]"

print(barra(3, 5))`,
          expected: '[###--]',
          check: py`assert barra(3, 5) == "[###--]", "barra(3, 5) deve devolver [###--]."
assert barra(0, 3) == "[---]" and barra(4, 4) == "[####]", "A função deve funcionar com vida zerada e vida cheia."`,
        },
      ],
      quiz: [
        { q: 'Qual instrução devolve um valor para quem chamou a função?', options: ['print', 'return', 'def', 'input'], correct: 1, why: 'return devolve o resultado. Uma função que termina sem return devolve None.' },
        { q: 'O que este código mostra?\n\n`def f(x):`\n`    x * 2`\n`print(f(5))`', options: ['10', '5', 'None', 'Um erro'], correct: 2, why: 'A função faz a conta, mas não devolve nada: faltou o return. Sem return, o resultado é None.' },
      ],
    },

    {
      id: 'funcoes-2', title: 'Máquinas que conversam', minutes: 12,
      summary: 'Valores padrão, vários retornos e o escopo das variáveis.',
      intro: { who: 'sora', text: 'Uma função sozinha é uma ferramenta. Funções que chamam funções são um sistema. …É aí que as coisas ficam interessantes.' },
      sections: [
        { h: 'Parâmetros com valor padrão', body: [
          'Um parâmetro pode ter um valor padrão, usado quando a chamada não informa nada. Parâmetros com padrão ficam por último:',
          { code: py`def curar(vida, quantidade=10):
    return vida + quantidade

print(curar(50))              # 60  (usa o padrão)
print(curar(50, 25))          # 75
print(curar(50, quantidade=5))  # 55  (argumento nomeado)` },
        ] },
        { h: 'Devolvendo mais de um valor', body: [
          'Separe os valores por vírgula no `return` e receba cada um em uma variável:',
          { code: py`def dividir_saque(ouro, jogadores):
    return ouro // jogadores, ouro % jogadores

cada, sobra = dividir_saque(100, 3)
print(cada, sobra)    # 33 1` },
        ] },
        { h: 'Escopo: o que acontece na função fica na função', body: [
          'Variáveis criadas dentro de uma função são **locais**: existem só durante a chamada e não são vistas do lado de fora. É por isso que a comunicação é feita por parâmetros (entrada) e `return` (saída).',
          { code: py`def calcular():
    resultado = 42      # variável local
    return resultado

valor = calcular()
print(valor)            # 42
# print(resultado)      # NameError: resultado não existe aqui fora` },
        ] },
        { h: 'Funções chamando funções', body: [
          'Programas grandes são construídos em camadas: funções simples no fundo, funções que as combinam por cima.',
          { code: py`def efetivo(dano, escudo):
    return max(dano - escudo, 0)       # nunca negativo

def aplicar_dano(vida, dano, escudo=0):
    return max(vida - efetivo(dano, escudo), 0)

print(aplicar_dano(50, 20, 5))   # 35` },
          { tip: '`max(valor, 0)` é o jeito curto de impedir que um número fique negativo. `min(valor, 100)` impede que passe de 100.' },
        ] },
      ],
      game: {
        title: 'Gerador de saque',
        text: 'Funções pequenas que se combinam: uma sorteia a raridade, outra monta o item, outra abre o baú inteiro. Rode várias vezes.',
        code: py`import random

def sortear_raridade():
    rolagem = random.randint(1, 100)
    if rolagem <= 5:
        return "lendário"
    elif rolagem <= 30:
        return "raro"
    return "comum"

def gerar_item(nivel=1):
    tipo = random.choice(["espada", "arco", "cajado", "escudo"])
    raridade = sortear_raridade()
    bonus = {"comum": 1, "raro": 3, "lendário": 8}[raridade]
    return f"{tipo} {raridade} (+{bonus * nivel})"

def abrir_bau(quantidade, nivel=1):
    itens = []
    for _ in range(quantidade):
        itens.append(gerar_item(nivel))
    return itens

print("Baú do nível 4:")
for item in abrir_bau(5, nivel=4):
    print(" -", item)`,
      },
      pitfalls: [
        'Tentar usar fora da função uma variável criada dentro dela: `NameError`.',
        'Colocar um parâmetro com padrão antes de um sem padrão: erro de sintaxe.',
        'Esquecer de receber os dois valores quando a função devolve dois.',
      ],
      recap: ['`def f(a, b=10)` define um valor padrão.', '`return a, b` devolve vários valores.', 'Variáveis de dentro da função são locais.', 'Funções podem chamar outras funções.'],
      exercises: [
        {
          id: 'fn2-1', level: 1, title: 'Título de nobreza',
          task: 'Crie `apresentar(nome, titulo="Estudante")`, que devolve o título seguido do nome, separados por um espaço. Mostre `apresentar("Lia")` e `apresentar("Vésper", "Professora")`, um por linha.',
          starter: py`def apresentar(nome):
    return nome

print(apresentar("Lia"))`,
          hint: 'Acrescente o parâmetro com valor padrão: def apresentar(nome, titulo="Estudante"): e devolva f"{titulo} {nome}".',
          solution: py`def apresentar(nome, titulo="Estudante"):
    return f"{titulo} {nome}"

print(apresentar("Lia"))
print(apresentar("Vésper", "Professora"))`,
          expected: 'Estudante Lia\nProfessora Vésper',
          check: py`assert apresentar("Caio") == "Estudante Caio", "Sem título informado, use Estudante."
assert apresentar("Sora", titulo="Enigma") == "Enigma Sora", "O título informado deve substituir o padrão."`,
        },
        {
          id: 'fn2-2', level: 2, title: 'Divisão do tesouro',
          task: 'Crie `dividir(ouro, jogadores)`, que devolve **dois valores**: quanto cada jogador recebe (divisão inteira) e quanto sobra. Chame com 100 moedas e 3 jogadores, guarde em `cada` e `sobra`, e mostre `Cada um: 33` e `Sobra: 1`.',
          starter: py`def dividir(ouro, jogadores):
    pass  # Devolva dois valores

# Chame a função e mostre as duas linhas
`,
          hint: 'return ouro // jogadores, ouro % jogadores — e na chamada: cada, sobra = dividir(100, 3).',
          solution: py`def dividir(ouro, jogadores):
    return ouro // jogadores, ouro % jogadores

cada, sobra = dividir(100, 3)
print(f"Cada um: {cada}")
print(f"Sobra: {sobra}")`,
          expected: 'Cada um: 33\nSobra: 1',
          check: py`assert tuple(dividir(100, 3)) == (33, 1), "dividir(100, 3) deve devolver 33 e 1."
assert tuple(dividir(20, 4)) == (5, 0) and tuple(dividir(7, 10)) == (0, 7), "A função deve funcionar com outros valores."
assert cada == 33 and sobra == 1, "Guarde os resultados em cada e sobra."`,
        },
        {
          id: 'fn2-3', level: 3, title: 'Dano com escudo',
          task: 'Crie `aplicar_dano(vida, dano, escudo=0)`. O escudo reduz o dano (o dano nunca fica negativo) e a função devolve a vida que sobra (nunca abaixo de zero). Mostre `aplicar_dano(50, 20)` e `aplicar_dano(50, 20, 5)`, um por linha.',
          starter: py`def aplicar_dano(vida, dano, escudo=0):
    return vida

print(aplicar_dano(50, 20))
print(aplicar_dano(50, 20, 5))`,
          hint: 'Primeiro calcule o dano efetivo: max(dano - escudo, 0). Depois devolva max(vida - efetivo, 0).',
          solution: py`def aplicar_dano(vida, dano, escudo=0):
    efetivo = max(dano - escudo, 0)
    return max(vida - efetivo, 0)

print(aplicar_dano(50, 20))
print(aplicar_dano(50, 20, 5))`,
          expected: '30\n35',
          check: py`assert aplicar_dano(50, 20) == 30 and aplicar_dano(50, 20, 5) == 35, "Confira a conta do escudo."
assert aplicar_dano(10, 99) == 0, "A vida nunca fica abaixo de zero."
assert aplicar_dano(40, 5, escudo=10) == 40, "Se o escudo for maior que o dano, a vida não muda (o dano não pode ser negativo)."`,
        },
      ],
      quiz: [
        { q: 'Dada `def f(a, b=2): return a * b`, quanto vale `f(5)`?', options: ['5', '10', '2', 'Um erro'], correct: 1, why: 'Como b não foi informado, vale o padrão 2. Então 5 * 2 = 10.' },
        { q: 'Uma variável criada dentro de uma função pode ser usada fora dela?', options: ['Sim, sempre', 'Só se tiver o mesmo nome', 'Não: ela é local à função', 'Só depois do return'], correct: 2, why: 'Variáveis locais existem apenas durante a chamada. Para levar um valor para fora, use return.' },
      ],
    },

    {
      id: 'projeto-arena', title: 'Projeto final: a Arena', minutes: 20,
      summary: 'Monte um jogo de batalha completo juntando tudo o que você aprendeu.',
      intro: { who: 'vesper', text: 'Não há conteúdo novo hoje. Há algo mais difícil: juntar o que você já sabe em um programa que funciona do começo ao fim.' },
      sections: [
        { h: 'Como se constrói um programa', body: [
          'Ninguém escreve um jogo de uma vez, de cima para baixo. O caminho profissional é o mesmo para dez linhas ou dez mil:',
          { list: [
            '**Descreva** o que o programa faz em uma frase. Aqui: “dois lutadores se atacam em turnos até um cair”.',
            '**Liste os dados**: cada lutador tem nome, vida e ataque — um dicionário.',
            '**Liste as ações**: criar um lutador, atacar, verificar se está vivo, conduzir a batalha — uma função para cada.',
            '**Construa e teste uma peça de cada vez**, da mais simples para a mais complexa.',
          ] },
        ] },
        { h: 'Peça 1: os dados', body: [
          'Uma função que fabrica lutadores garante que todos tenham as mesmas chaves:',
          { code: py`def criar_lutador(nome, vida, ataque):
    return {"nome": nome, "vida": vida, "ataque": ataque}

lia = criar_lutador("Lia", 30, 8)
print(lia["nome"], lia["vida"])` },
        ] },
        { h: 'Peça 2: as ações', body: [
          'Dicionários passados para uma função podem ser alterados lá dentro — é assim que `atacar` tira vida do alvo. Note o `max()` segurando a vida em zero:',
          { code: py`def esta_vivo(lutador):
    return lutador["vida"] > 0

def atacar(atacante, alvo):
    alvo["vida"] = max(alvo["vida"] - atacante["ataque"], 0)
    return atacante["ataque"]` },
        ] },
        { h: 'Peça 3: o laço principal', body: [
          'A batalha é um game loop: enquanto os dois estiverem vivos, um ataca; se o outro sobreviver, revida. No fim, a função devolve o nome de quem ficou de pé. Você vai escrever essa parte no desafio bônus.',
          { tip: 'Depois deste projeto, bons próximos passos são: jogo da forca, jogo da velha para dois jogadores, um RPG de texto com salas e inventário e, quando quiser gráficos, a biblioteca Pygame no seu computador.' },
        ] },
      ],
      game: {
        title: 'Arena completa',
        text: 'A versão “de luxo” do projeto: ataques sorteados, golpes críticos e narração. Tudo construído com as mesmas três peças que você vai programar nos exercícios.',
        code: py`import random

def criar_lutador(nome, vida, ataque):
    return {"nome": nome, "vida": vida, "ataque": ataque}

def esta_vivo(lutador):
    return lutador["vida"] > 0

def atacar(atacante, alvo):
    dano = atacante["ataque"] + random.randint(-2, 3)
    critico = random.randint(1, 10) == 10
    if critico:
        dano *= 2
    alvo["vida"] = max(alvo["vida"] - dano, 0)
    aviso = " CRÍTICO!" if critico else ""
    print(f"  {atacante['nome']} acerta {dano}.{aviso} {alvo['nome']} fica com {alvo['vida']}.")

def batalha(a, b):
    turno = 1
    while esta_vivo(a) and esta_vivo(b):
        print(f"Turno {turno}")
        atacar(a, b)
        if esta_vivo(b):
            atacar(b, a)
        turno += 1
    return a["nome"] if esta_vivo(a) else b["nome"]

campeao = batalha(criar_lutador("Lia", 40, 9), criar_lutador("Golem", 55, 6))
print(f"\n{campeao} vence a arena!")`,
      },
      pitfalls: [
        'Tentar escrever tudo de uma vez e só rodar no fim: teste cada função assim que terminar.',
        'Esquecer que o lutador derrotado não revida: verifique se ele ainda está vivo antes do contra-ataque.',
        'Deixar a vida ficar negativa: use `max(valor, 0)`.',
      ],
      recap: ['Descreva, liste dados, liste ações, construa aos poucos.', 'Dicionários modelam os dados; funções modelam as ações.', 'O laço principal só coordena as funções.'],
      exercises: [
        {
          id: 'prj-1', level: 1, title: 'Peça 1: fábrica de lutadores',
          task: 'Crie `criar_lutador(nome, vida, ataque)`, que devolve um dicionário com as chaves `nome`, `vida` e `ataque`. Crie a lutadora Lia com 30 de vida e 8 de ataque, guarde em `lia` e mostre `lia["nome"]` e `lia["vida"]`, um por linha.',
          starter: py`def criar_lutador(nome, vida, ataque):
    return {}

lia = criar_lutador("Lia", 30, 8)
print(lia["nome"])
print(lia["vida"])`,
          hint: 'return {"nome": nome, "vida": vida, "ataque": ataque}',
          solution: py`def criar_lutador(nome, vida, ataque):
    return {"nome": nome, "vida": vida, "ataque": ataque}

lia = criar_lutador("Lia", 30, 8)
print(lia["nome"])
print(lia["vida"])`,
          expected: 'Lia\n30',
          check: py`assert criar_lutador("Orc", 50, 6) == {"nome": "Orc", "vida": 50, "ataque": 6}, "A função deve devolver um dicionário com nome, vida e ataque."
assert lia == {"nome": "Lia", "vida": 30, "ataque": 8}, "lia deve ter 30 de vida e 8 de ataque."`,
        },
        {
          id: 'prj-2', level: 2, title: 'Peça 2: atacar',
          task: 'A função `criar_lutador` já está pronta. Crie:\n\n• `esta_vivo(lutador)`: devolve `True` se a vida for maior que zero.\n• `atacar(atacante, alvo)`: diminui a vida do alvo pelo ataque do atacante, sem deixar passar abaixo de zero.\n\nFaça Lia atacar o Orc duas vezes. Mostre a vida do Orc e depois `esta_vivo(orc)`.',
          starter: py`def criar_lutador(nome, vida, ataque):
    return {"nome": nome, "vida": vida, "ataque": ataque}

def esta_vivo(lutador):
    pass

def atacar(atacante, alvo):
    pass

lia = criar_lutador("Lia", 30, 8)
orc = criar_lutador("Orc", 12, 5)
# Lia ataca o Orc duas vezes

print(orc["vida"])
print(esta_vivo(orc))`,
          hint: 'Em atacar: alvo["vida"] = max(alvo["vida"] - atacante["ataque"], 0). Depois chame atacar(lia, orc) duas vezes.',
          solution: py`def criar_lutador(nome, vida, ataque):
    return {"nome": nome, "vida": vida, "ataque": ataque}

def esta_vivo(lutador):
    return lutador["vida"] > 0

def atacar(atacante, alvo):
    alvo["vida"] = max(alvo["vida"] - atacante["ataque"], 0)

lia = criar_lutador("Lia", 30, 8)
orc = criar_lutador("Orc", 12, 5)
atacar(lia, orc)
atacar(lia, orc)

print(orc["vida"])
print(esta_vivo(orc))`,
          expected: '0\nFalse',
          check: py`_a = criar_lutador("A", 20, 7)
_b = criar_lutador("B", 10, 3)
atacar(_a, _b)
assert _b["vida"] == 3, "atacar deve tirar do alvo o valor do ataque do atacante."
assert _a["vida"] == 20, "O atacante não perde vida ao atacar."
atacar(_a, _b)
assert _b["vida"] == 0, "A vida não pode ficar abaixo de zero."
assert esta_vivo(_a) is True and esta_vivo(_b) is False, "esta_vivo deve devolver True só com vida maior que zero."`,
        },
        {
          id: 'prj-3', level: 3, title: 'Peça 3: a batalha',
          task: 'Com as três funções prontas, crie `batalha(a, b)`: enquanto os dois estiverem vivos, `a` ataca `b`; se `b` sobreviver, `b` ataca `a`. A função devolve o **nome** do vencedor. Faça Lia (30 de vida, 8 de ataque) enfrentar o Golem (40 de vida, 6 de ataque) e mostre `Vencedor: NOME`.',
          starter: py`def criar_lutador(nome, vida, ataque):
    return {"nome": nome, "vida": vida, "ataque": ataque}

def esta_vivo(lutador):
    return lutador["vida"] > 0

def atacar(atacante, alvo):
    alvo["vida"] = max(alvo["vida"] - atacante["ataque"], 0)

def batalha(a, b):
    pass  # Laço de turnos; devolva o nome de quem vencer

lia = criar_lutador("Lia", 30, 8)
golem = criar_lutador("Golem", 40, 6)
print(f"Vencedor: {batalha(lia, golem)}")`,
          hint: 'while esta_vivo(a) and esta_vivo(b): atacar(a, b) e, se esta_vivo(b), atacar(b, a). Depois do laço: se a está vivo, return a["nome"]; senão, return b["nome"].',
          solution: py`def criar_lutador(nome, vida, ataque):
    return {"nome": nome, "vida": vida, "ataque": ataque}

def esta_vivo(lutador):
    return lutador["vida"] > 0

def atacar(atacante, alvo):
    alvo["vida"] = max(alvo["vida"] - atacante["ataque"], 0)

def batalha(a, b):
    while esta_vivo(a) and esta_vivo(b):
        atacar(a, b)
        if esta_vivo(b):
            atacar(b, a)
    if esta_vivo(a):
        return a["nome"]
    return b["nome"]

lia = criar_lutador("Lia", 30, 8)
golem = criar_lutador("Golem", 40, 6)
print(f"Vencedor: {batalha(lia, golem)}")`,
          expected: 'Vencedor: Lia',
          check: py`assert batalha(criar_lutador("A", 10, 5), criar_lutador("B", 100, 50)) == "B", "Quando o segundo lutador é mais forte, ele deve vencer."
assert batalha(criar_lutador("A", 5, 5), criar_lutador("B", 5, 5)) == "A", "Com forças iguais, quem ataca primeiro vence: o derrotado não revida."
_c = criar_lutador("C", 9, 3)
_d = criar_lutador("D", 9, 3)
batalha(_c, _d)
assert _c["vida"] == 3 and _d["vida"] == 0, "Confira a ordem dos turnos: a ataca, e b só revida se ainda estiver vivo."`,
        },
      ],
      quiz: [
        { q: 'Qual é a melhor forma de construir um programa maior?', options: ['Escrever tudo e testar só no fim', 'Dividir em funções pequenas e testar cada uma', 'Usar uma única função gigante', 'Evitar funções para ganhar velocidade'], correct: 1, why: 'Peças pequenas são fáceis de entender, testar e reaproveitar. O programa final apenas as combina.' },
        { q: 'Por que usar `max(vida - dano, 0)` ao aplicar dano?', options: ['Para dobrar o dano', 'Para impedir que a vida fique negativa', 'Para arredondar a vida', 'Para sortear o dano'], correct: 1, why: 'max devolve o maior dos dois valores; se a conta der negativo, o resultado é 0.' },
      ],
    },
  ],

  duel: {
    title: 'Prova Final: O relatório da Sala Ômega',
    seconds: 720,
    brief: 'Sora nunca perdeu uma prova. O desafio final pede uma função que funcione com qualquer turma, não só com a do exemplo.',
    task: 'Crie a função `relatorio(turma)`. Ela recebe uma lista de dicionários, cada um com `nome` e `merito`, e devolve um dicionário com três chaves:\n\n• `lider`: o nome de quem tem mais mérito\n• `media`: a média de mérito (divisão inteira da soma pela quantidade)\n• `acima`: a lista dos nomes com mérito **maior ou igual** à média, na ordem da turma\n\nDepois chame a função com a `turma` dada, guarde em `resultado` e mostre as três linhas:\n\n`Líder: Sora`\n`Média: 1470`\n`Acima da média: 2`',
    starter: py`def relatorio(turma):
    pass  # Devolva {"lider": ..., "media": ..., "acima": [...]}

turma = [
    {"nome": "Caio", "merito": 600},
    {"nome": "Yuki", "merito": 1000},
    {"nome": "Sora", "merito": 2400},
    {"nome": "Theo", "merito": 1450},
    {"nome": "Bianca", "merito": 1900},
]
resultado = relatorio(turma)
# Mostre as três linhas
`,
    hint: 'Percorra a turma uma vez para somar o mérito e guardar o líder (compare com o maior valor visto até agora). Calcule a média com //. Percorra de novo para montar a lista acima. A terceira linha usa len(resultado["acima"]).',
    solution: py`def relatorio(turma):
    soma = 0
    lider = turma[0]
    for aluno in turma:
        soma += aluno["merito"]
        if aluno["merito"] > lider["merito"]:
            lider = aluno
    media = soma // len(turma)
    acima = []
    for aluno in turma:
        if aluno["merito"] >= media:
            acima.append(aluno["nome"])
    return {"lider": lider["nome"], "media": media, "acima": acima}

turma = [
    {"nome": "Caio", "merito": 600},
    {"nome": "Yuki", "merito": 1000},
    {"nome": "Sora", "merito": 2400},
    {"nome": "Theo", "merito": 1450},
    {"nome": "Bianca", "merito": 1900},
]
resultado = relatorio(turma)
print(f"Líder: {resultado['lider']}")
print(f"Média: {resultado['media']}")
print(f"Acima da média: {len(resultado['acima'])}")`,
    expected: 'Líder: Sora\nMédia: 1470\nAcima da média: 2',
    check: py`assert isinstance(resultado, dict), "Guarde em resultado o dicionário devolvido por relatorio(turma)."
_r = relatorio(turma)
assert _r["lider"] == "Sora", "O líder da turma dada é Sora."
assert _r["media"] == 1470, "A média deve ser a soma dividida (divisão inteira) pela quantidade: 1470."
assert _r["acima"] == ["Sora", "Bianca"], "Com média 1470, ficam acima: Sora e Bianca, nessa ordem."
_s = relatorio([{"nome": "Ana", "merito": 10}])
assert _s == {"lider": "Ana", "media": 10, "acima": ["Ana"]}, "A função deve funcionar com uma turma de uma pessoa só."
_t = relatorio([{"nome": "A", "merito": 5}, {"nome": "B", "merito": 9}, {"nome": "C", "merito": 7}])
assert _t == {"lider": "B", "media": 7, "acima": ["B", "C"]}, "A função deve funcionar com outras turmas (teste: méritos 5, 9 e 7)."`,
    taunts: [
      '…',
      'Você começou pela função. Bom. A maioria começa pelo print.',
      'Uma passada para a soma e o líder. Outra para a lista. Não precisa de mais.',
      'Estou esperando você terminar. …Não. Estou quase terminando.',
    ],
  },
};
