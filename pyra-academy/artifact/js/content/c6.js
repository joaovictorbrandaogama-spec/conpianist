const py = String.raw;

export default {
  id: 'c6', n: 6, rival: 'helena',
  title: 'Nível de elite',
  subtitle: 'Código em que se pode confiar',
  blurb: 'Erros tratados, texto dissecado, listas afiadas e classes. A diferença entre um programa que funciona e um programa em que se pode confiar.',
  lessons: [
    {
      id: 'erros', title: 'À prova de falhas', minutes: 12,
      summary: 'Trate erros com try e except em vez de deixar o programa cair.',
      intro: { who: 'helena', text: 'Qualquer um escreve código que funciona quando tudo dá certo. O Conselho só confia em código que sabe o que fazer quando dá errado.' },
      sections: [
        { h: 'Erros têm nome', body: [
          'Quando algo dá errado durante a execução, o Python **levanta uma exceção** e o programa para naquela linha. Você já conheceu várias: `ValueError` (valor com conteúdo inválido, como `int("doze")`), `ZeroDivisionError` (divisão por zero), `KeyError` (chave que não existe no dicionário) e `IndexError` (posição que não existe na lista).',
          'Até aqui, a única defesa era torcer para ninguém digitar bobagem. Programas de verdade recebem dados sujos o tempo todo — e precisam continuar de pé.',
        ] },
        { h: 'try e except', body: [
          'Coloque dentro de `try` o trecho que pode falhar. Se a exceção indicada acontecer, o Python pula para o `except` em vez de derrubar o programa:',
          { code: py`try:
    numero = int("doze")
    print("Convertido:", numero)
except ValueError:
    print("Isso não é um número inteiro.")

print("O programa continua.")` },
          'Repare que a linha `print("Convertido:", numero)` nem chegou a rodar: quando o erro acontece, o resto do bloco `try` é abandonado.',
          { tip: 'Diga sempre qual erro você espera (`except ValueError:`). Um `except:` sozinho engole qualquer coisa, inclusive erros de digitação no seu próprio código.' },
        ] },
        { h: 'Um except para cada problema', body: [
          'Dá para tratar erros dentro de funções e devolver um valor seguro. E com `as` você guarda a exceção em uma variável para ver a mensagem:',
          { code: py`def dividir(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None

print(dividir(10, 2))   # 5.0
print(dividir(10, 0))   # None

estoque = {"poção": 3}
try:
    print(estoque["elixir"])
except KeyError as erro:
    print("Item não cadastrado:", erro)` },
        ] },
        { h: 'Insistir até dar certo', body: [
          'O padrão mais útil do capítulo: um `while True` que só termina com `break` quando a entrada é válida. É assim que todo programa sério lê dados de uma pessoa:',
          { code: py`while True:
    resposta = input("Quantos pontos? ")
    try:
        pontos = int(resposta)
        break
    except ValueError:
        print("Digite só números.")

print("Registrado:", pontos)` },
        ] },
        { h: 'raise, else e finally', body: [
          'Você também pode **levantar** um erro com `raise` quando uma regra do seu programa é quebrada. O bloco `else` roda só se nada falhou, e o `finally` roda sempre, com ou sem erro:',
          { code: py`def sacar(saldo, valor):
    if valor > saldo:
        raise ValueError("saldo insuficiente")
    return saldo - valor

try:
    saldo = sacar(100, 250)
except ValueError as erro:
    print("Operação recusada:", erro)
else:
    print("Novo saldo:", saldo)
finally:
    print("Fim do atendimento.")` },
        ] },
      ],
      game: {
        title: 'Caixa da Galeria',
        text: 'O caixa da Galeria recebe pedidos de todo tipo: valores válidos, texto no lugar de número, valores negativos e compras maiores que o saldo. Nenhum deles derruba o programa. Note que a mensagem do erro de conversão vem do próprio Python, em inglês.',
        code: py`saldo = 22000
pedidos = ["8000", "abc", "5000", "-300", "20000"]

print(f"Saldo inicial: {saldo} pp")
for pedido in pedidos:
    try:
        valor = int(pedido)
        if valor <= 0:
            raise ValueError("o valor precisa ser positivo")
        if valor > saldo:
            raise ValueError("saldo insuficiente")
    except ValueError as erro:
        print(f"  Pedido {pedido!r} recusado: {erro}")
    else:
        saldo -= valor
        print(f"  Compra de {valor} pp aprovada. Saldo: {saldo} pp")

print(f"Saldo final: {saldo} pp")`,
      },
      pitfalls: [
        'Usar `except:` sem dizer o tipo: você esconde erros que deveria enxergar.',
        'Colocar o programa inteiro dentro de um `try`: proteja só as linhas que podem falhar.',
        'Capturar o erro e não fazer nada (`pass`): o problema continua lá, só ficou invisível.',
      ],
      recap: ['`try` tenta; `except TipoDoErro` trata.', '`as erro` guarda a mensagem da exceção.', '`while True` + `try` + `break` valida entradas.', '`raise` levanta um erro; `finally` roda sempre.'],
      exercises: [
        {
          id: 'err-1', level: 1, title: 'Conversão segura',
          task: 'Leia um texto com `input()`. Se ele puder virar um inteiro, mostre `Dobro: N` (o dobro do número). Se não puder, mostre `Entrada inválida`. Use `try` e `except ValueError`.',
          starter: py`texto = input("Número: ")
numero = int(texto)
print(f"Dobro: {numero * 2}")`,
          hint: 'Coloque a conversão e o print do dobro dentro do try. No except ValueError, mostre a mensagem de entrada inválida.',
          solution: py`texto = input("Número: ")
try:
    numero = int(texto)
    print(f"Dobro: {numero * 2}")
except ValueError:
    print("Entrada inválida")`,
          check: py`assert "try" in __fonte__ and "except" in __fonte__, "Use try e except para tratar a conversão."`,
          cases: [
            { inputs: ['21'], expected: 'Dobro: 42' },
            { inputs: ['abc'], expected: 'Entrada inválida' },
            { inputs: ['-4'], expected: 'Dobro: -8' },
          ],
        },
        {
          id: 'err-2', level: 2, title: 'Divisão blindada',
          task: 'Crie `media_segura(total, quantidade)`: ela devolve `total / quantidade`, mas se a quantidade for zero devolve `0` em vez de quebrar. Use `try` e `except ZeroDivisionError`. Depois mostre `media_segura(90, 4)` e `media_segura(50, 0)`, um por linha.',
          starter: py`def media_segura(total, quantidade):
    return total / quantidade

print(media_segura(90, 4))
print(media_segura(50, 0))`,
          hint: 'Dentro da função: try com o return da divisão; except ZeroDivisionError com return 0.',
          solution: py`def media_segura(total, quantidade):
    try:
        return total / quantidade
    except ZeroDivisionError:
        return 0

print(media_segura(90, 4))
print(media_segura(50, 0))`,
          expected: '22.5\n0',
          check: py`assert media_segura(10, 4) == 2.5, "Com quantidade diferente de zero, a função devolve a divisão normal."
assert media_segura(7, 0) == 0, "Com quantidade zero, a função deve devolver 0."
assert "ZeroDivisionError" in __fonte__, "Capture especificamente ZeroDivisionError."`,
        },
        {
          id: 'err-3', level: 3, title: 'Insista até acertar',
          task: 'O sistema de matrícula pede uma nota de 0 a 10. Leia valores com `input()` em um laço até receber um **inteiro entre 0 e 10**. A cada tentativa inválida (texto que não é número ou número fora da faixa), mostre `Tente de novo`. No fim, mostre `Nota: N` e, na linha de baixo, `Tentativas: T`, contando também a tentativa válida.',
          starter: py`tentativas = 0
# Repita até receber um inteiro de 0 a 10
nota = int(input("Nota: "))
tentativas += 1
print(f"Nota: {nota}")
print(f"Tentativas: {tentativas}")`,
          hint: 'while True: some 1 em tentativas; dentro de um try, converta o input. No except ValueError, mostre a mensagem e use continue. Depois do try, se 0 <= nota <= 10, use break; senão, mostre a mensagem.',
          solution: py`tentativas = 0
while True:
    tentativas += 1
    try:
        nota = int(input("Nota: "))
    except ValueError:
        print("Tente de novo")
        continue
    if 0 <= nota <= 10:
        break
    print("Tente de novo")

print(f"Nota: {nota}")
print(f"Tentativas: {tentativas}")`,
          cases: [
            { inputs: ['dez', '15', '7'], expected: 'Tente de novo\nTente de novo\nNota: 7\nTentativas: 3' },
            { inputs: ['10'], expected: 'Nota: 10\nTentativas: 1' },
            { inputs: ['-1', 'x', '', '0'], expected: 'Tente de novo\nTente de novo\nTente de novo\nNota: 0\nTentativas: 4' },
          ],
        },
      ],
      quiz: [
        { q: 'Qual erro o Python levanta em `int("doze")`?', options: ['TypeError', 'ValueError', 'NameError', 'SyntaxError'], correct: 1, why: 'O tipo está certo (é um texto), mas o conteúdo não serve para virar número: isso é um ValueError.' },
        { q: 'Quando o bloco `except ValueError` é executado?', options: ['Sempre, logo depois do try', 'Só se um ValueError acontecer dentro do try', 'Antes do try', 'Só quando o programa termina'], correct: 1, why: 'O except fica de reserva: só roda se a exceção indicada for levantada em alguma linha do bloco try.' },
      ],
    },

    {
      id: 'texto-avancado', title: 'Decifrando registros', minutes: 12,
      summary: 'Parta, junte e interrogue textos com split, join e companhia.',
      intro: { who: 'bia', text: 'Informação chega sempre bagunçada: fofoca, recado, registro de câmera. Quem sabe separar o que importa fica sabendo primeiro.' },
      sections: [
        { h: 'split(): texto vira lista', body: [
          'Dados de verdade quase sempre chegam como texto: uma linha de planilha, um registro, uma mensagem. O método `.split(separador)` corta o texto em pedaços e devolve uma **lista**:',
          { code: py`registro = "08:02;Davi;atraso"
partes = registro.split(";")
print(partes)          # ['08:02', 'Davi', 'atraso']
print(partes[1])       # Davi

frase = "tudo se compra com pontos"
print(frase.split())   # sem argumento, separa nos espaços` },
        ] },
        { h: 'Desempacotar', body: [
          'Quando você sabe quantos pedaços vêm, pode guardar cada um em uma variável de uma vez só. O nome disso é **desempacotamento**:',
          { code: py`hora, aluno, ocorrencia = "08:02;Davi;atraso".split(";")
print(f"{aluno} às {hora}: {ocorrencia}")` },
          { warn: 'Se a quantidade de pedaços não bater com a de variáveis, o Python levanta `ValueError`. Com dados sujos, isso se trata com o `try` da aula passada.' },
        ] },
        { h: 'join(): lista vira texto', body: [
          'O caminho de volta é o `.join()`. Ele é chamado **no separador** e recebe a lista:',
          { code: py`nomes = ["Ayumi", "Samuel", "Nina"]
print(", ".join(nomes))      # Ayumi, Samuel, Nina
print(" > ".join(nomes))     # Ayumi > Samuel > Nina
print("-".join("PYRA"))      # P-Y-R-A` },
          '`join` só junta textos. Para juntar números, converta cada um com `str()` antes.',
        ] },
        { h: 'Perguntas que um texto responde', body: [
          { code: py`linha = "ERRO: saldo insuficiente"
print("saldo" in linha)                 # True: contém?
print(linha.startswith("ERRO"))         # True: começa com?
print(linha.lower())                    # tudo em minúsculas
print("banana".count("a"))              # 3: quantas vezes aparece
print("42".isdigit(), "4x".isdigit())   # True False: só dígitos?` },
          'Comparar textos é sensível a maiúsculas: `"Sim" == "sim"` é falso. Para aceitar as duas formas, normalize antes com `.lower()` e `.strip()`.',
        ] },
        { h: 'Várias linhas de uma vez', body: [
          'Aspas triplas guardam um texto com várias linhas. Separando em `"\\n"` (o caractere de quebra de linha), você percorre uma linha por vez:',
          { code: py`relatorio = """08:02;Davi;atraso
08:15;Lara;celular
09:40;Davi;conversa"""

for linha in relatorio.split("\n"):
    hora, aluno, ocorrencia = linha.split(";")
    print(aluno, "->", ocorrencia)` },
        ] },
      ],
      game: {
        title: 'As câmeras da sala',
        text: 'É assim que a Turma D perdeu mil pontos em um mês: cada ocorrência registrada pelas câmeras tem um preço. O programa lê os registros, aplica a tabela e soma por aluno. O `:<6` dentro da f-string alinha o texto à esquerda em seis colunas.',
        code: py`registros = """08:02;Davi;atraso
08:15;Lara;celular
09:40;Davi;conversa
10:05;Icaro;dormindo
11:30;Lara;celular
13:10;Davi;celular"""

PENALIDADE = {"atraso": 5, "celular": 10, "conversa": 3, "dormindo": 8}
perdidos = {}

for linha in registros.split("\n"):
    hora, aluno, ocorrencia = linha.split(";")
    pontos = PENALIDADE[ocorrencia]
    perdidos[aluno] = perdidos.get(aluno, 0) + pontos
    print(f"[{hora}] {aluno:<6} {ocorrencia:<9} -{pontos} CP")

print("-" * 32)
for aluno, total in perdidos.items():
    print(f"{aluno}: -{total} Pontos de Classe")
print("Total da turma:", -sum(perdidos.values()))`,
      },
      pitfalls: [
        'Escrever `lista.join(", ")`: é o contrário. O separador vem primeiro: `", ".join(lista)`.',
        'Esquecer que `split()` devolve textos: `"10;20".split(";")` dá `["10", "20"]`, não números.',
        'Comparar sem normalizar: `"SIM "` é diferente de `"sim"`. Use `.strip().lower()`.',
      ],
      recap: ['`.split(sep)` corta o texto e devolve uma lista.', '`sep.join(lista)` junta textos com um separador.', '`in`, `.startswith()`, `.count()` e `.isdigit()` interrogam o texto.', 'Desempacotar: `a, b, c = texto.split(";")`.'],
      exercises: [
        {
          id: 'txt-1', level: 1, title: 'Partes de um registro',
          task: 'A catraca gravou o texto `"D-40;Lia;laboratório"`. Separe-o com `split(";")`, guarde a lista em `partes` e mostre, um por linha: o nome (a segunda parte) e a quantidade de partes.',
          starter: py`registro = "D-40;Lia;laboratório"
partes = registro
print(partes[1])
print(len(partes))`,
          hint: 'partes = registro.split(";") — o resto do código já mostra o que foi pedido.',
          solution: py`registro = "D-40;Lia;laboratório"
partes = registro.split(";")
print(partes[1])
print(len(partes))`,
          expected: 'Lia\n3',
          check: py`assert partes == ["D-40", "Lia", "laboratório"], "partes deve ser a lista devolvida por registro.split(';')."`,
        },
        {
          id: 'txt-2', level: 2, title: 'Chamada em uma linha',
          task: 'Com a lista `presentes`, monte em `chamada` um único texto com os nomes separados por `" | "`, usando `join`. Mostre `chamada` e, na linha de baixo, `Total: N` com a quantidade de nomes.',
          starter: py`presentes = ["Ayumi", "Caio", "Nina", "Samuel"]
chamada = ""
print(chamada)
print("Total: 0")`,
          hint: 'O separador chama o método: " | ".join(presentes). A quantidade vem de len(presentes), dentro de uma f-string.',
          solution: py`presentes = ["Ayumi", "Caio", "Nina", "Samuel"]
chamada = " | ".join(presentes)
print(chamada)
print(f"Total: {len(presentes)}")`,
          expected: 'Ayumi | Caio | Nina | Samuel\nTotal: 4',
          check: py`assert chamada == "Ayumi | Caio | Nina | Samuel", "chamada deve ter os nomes separados por ' | '."
assert "join" in __fonte__, "Use o método join."
assert "len(" in __fonte__, "Calcule a quantidade com len()."`,
        },
        {
          id: 'txt-3', level: 3, title: 'Relatório das câmeras',
          task: 'Cada linha de `registros` tem o formato `hora;aluno;ocorrência`. Monte o dicionário `contagem` com quantas ocorrências cada aluno teve. O laço do fim, que já está pronto, mostra uma linha por aluno no formato `Nome: N`.',
          starter: py`registros = """08:02;Davi;atraso
08:15;Lara;celular
09:40;Davi;conversa
10:05;Icaro;dormindo
11:30;Lara;celular
13:10;Davi;celular"""

contagem = {}
# Percorra as linhas, separe os campos e conte por aluno

for aluno, total in contagem.items():
    print(f"{aluno}: {total}")`,
          hint: 'for linha in registros.split("\\n"): separe com linha.split(";") em três variáveis e some 1 em contagem[aluno], usando contagem.get(aluno, 0) para começar do zero.',
          solution: py`registros = """08:02;Davi;atraso
08:15;Lara;celular
09:40;Davi;conversa
10:05;Icaro;dormindo
11:30;Lara;celular
13:10;Davi;celular"""

contagem = {}
for linha in registros.split("\n"):
    hora, aluno, ocorrencia = linha.split(";")
    contagem[aluno] = contagem.get(aluno, 0) + 1

for aluno, total in contagem.items():
    print(f"{aluno}: {total}")`,
          expected: 'Davi: 3\nLara: 2\nIcaro: 1',
          check: py`assert contagem == {"Davi": 3, "Lara": 2, "Icaro": 1}, "contagem deve ter Davi com 3, Lara com 2 e Icaro com 1."
assert "split" in __fonte__, "Use split para separar as linhas e os campos."`,
        },
      ],
      quiz: [
        { q: 'O que `"a-b-c".split("-")` devolve?', options: ['`"abc"`', "`['a', 'b', 'c']`", "`['a-b-c']`", '`3`'], correct: 1, why: 'split corta o texto em cada separador e devolve a lista dos pedaços.' },
        { q: 'Qual expressão produz o texto `1, 2, 3` a partir de `lista = ["1", "2", "3"]`?', options: ['`join(", ", lista)`', '`lista.join(", ")`', '`", ".join(lista)`', '`lista + ", "`'], correct: 2, why: 'join é um método do separador: ele recebe a lista e coloca o separador entre os itens.' },
      ],
    },

    {
      id: 'listas-afiadas', title: 'Listas afiadas', minutes: 13,
      summary: 'Fatias, ordenação com sorted, tuplas e compreensões de lista.',
      intro: { who: 'samuel', text: 'Ordenar, filtrar, cortar. Quase toda pergunta sobre dados é uma dessas três coisas disfarçada.' },
      sections: [
        { h: 'Fatias', body: [
          'Assim como nos textos, dá para pegar um **pedaço** de uma lista com `lista[inicio:fim]`. O início entra, o fim fica de fora, e qualquer um dos dois pode ser omitido:',
          { code: py`ranking = ["Sora", "Bianca", "Theo", "Yuki", "Caio"]
print(ranking[:3])     # os três primeiros
print(ranking[-2:])    # os dois últimos
print(ranking[1:4])    # da posição 1 até antes da 4
print(ranking[::-1])   # uma cópia de trás para frente` },
        ] },
        { h: 'sorted(): ordenar sem bagunçar', body: [
          '`sorted(lista)` devolve uma **nova** lista em ordem, sem mexer na original. Com `reverse=True`, a ordem é do maior para o menor. E três funções resolvem as perguntas mais comuns:',
          { code: py`notas = [72, 95, 58, 88]
print(sorted(notas))                 # [58, 72, 88, 95]
print(sorted(notas, reverse=True))   # [95, 88, 72, 58]
print(notas)                         # o original continua igual
print(max(notas), min(notas), sum(notas))` },
        ] },
        { h: 'Tuplas e a chave de ordenação', body: [
          'Uma **tupla** é como uma lista que não pode ser alterada, escrita com parênteses. É ótima para registros de tamanho fixo, como `(nome, mérito)`. Para ordenar tuplas por um dos campos, passe em `key` uma função que diz **o que comparar**:',
          { code: py`alunos = [("Caio", 600), ("Sora", 2400), ("Yuki", 1000)]

def pontos(aluno):
    return aluno[1]

podio = sorted(alunos, key=pontos, reverse=True)
print(podio[0])    # ('Sora', 2400)

# A mesma coisa com uma função anônima de uma linha (lambda):
podio = sorted(alunos, key=lambda aluno: aluno[1], reverse=True)
for nome, merito in podio:
    print(nome, merito)` },
          '`lambda aluno: aluno[1]` é só um jeito curto de escrever uma função que recebe `aluno` e devolve `aluno[1]`.',
        ] },
        { h: 'Compreensões de lista', body: [
          'Criar uma lista a partir de outra é tão comum que o Python tem um atalho. Leia de dentro para fora: **o que guardar**, **de onde vem** e, se quiser, **qual é o filtro**:',
          { code: py`notas = [72, 95, 58, 88]

aprovados = [nota for nota in notas if nota >= 60]
dobradas = [nota * 2 for nota in notas]

print(aprovados)   # [72, 95, 88]
print(dobradas)    # [144, 190, 116, 176]` },
          'É exatamente o que um `for` com `append` faria, em uma linha. Se a compreensão ficar difícil de ler, volte ao laço comum: clareza vale mais que esperteza.',
        ] },
        { h: 'enumerate e zip', body: [
          '`enumerate` entrega a posição junto com o item (comece em 1 com `start=1`). `zip` anda por duas listas ao mesmo tempo:',
          { code: py`nomes = ["Sora", "Bianca", "Theo"]
meritos = [2400, 1900, 1450]

for posicao, nome in enumerate(nomes, start=1):
    print(f"{posicao}º {nome}")

for nome, merito in zip(nomes, meritos):
    print(nome, merito)` },
        ] },
      ],
      game: {
        title: 'O telão do Sistema S',
        text: 'O telão do Conselho em trinta linhas: uma lista de tuplas, uma ordenação por mérito, barras proporcionais e um filtro por turma. Acrescente alunos e veja o ranking se reorganizar.',
        code: py`alunos = [
    ("Caio", "D", 600), ("Sora", "A", 2400), ("Yuki", "C", 1000),
    ("Theo", "B", 1450), ("Bianca", "A", 1900), ("Nina", "D", 210),
]

ordenados = sorted(alunos, key=lambda aluno: aluno[2], reverse=True)
maior = ordenados[0][2]

print("=== TELÃO DO SISTEMA S ===")
for posicao, (nome, turma, merito) in enumerate(ordenados, start=1):
    barra = "█" * round(merito / maior * 20)
    print(f"{posicao}º {nome:<7} [{turma}] {barra} {merito}")

turma_d = [nome for nome, turma, merito in alunos if turma == "D"]
meritos = [merito for nome, turma, merito in alunos]

print("Turma D:", ", ".join(turma_d))
print("Média geral:", sum(meritos) // len(meritos))`,
      },
      pitfalls: [
        'Confundir `lista.sort()` com `sorted(lista)`: o primeiro altera a lista e devolve `None`; o segundo devolve uma lista nova.',
        'Esquecer que o fim da fatia fica de fora: `lista[0:3]` tem as posições 0, 1 e 2.',
        'Tentar alterar uma tupla: `aluno[1] = 700` dá `TypeError`. Crie uma tupla nova.',
      ],
      recap: ['`lista[inicio:fim]` devolve um pedaço; o fim não entra.', '`sorted(lista, key=..., reverse=True)` ordena sem alterar o original.', 'Tuplas são registros fixos: `(nome, merito)`.', '`[x for x in lista if condição]` cria listas em uma linha.'],
      exercises: [
        {
          id: 'afi-1', level: 1, title: 'O pódio',
          task: 'Com a lista `meritos`, crie `ordenados` (do maior para o menor, usando `sorted`) e `podio` (os três primeiros de `ordenados`, usando uma fatia). Mostre `podio`. A lista original não pode ser alterada.',
          starter: py`meritos = [600, 2400, 1000, 1450, 1900]
ordenados = meritos
podio = ordenados
print(podio)`,
          hint: 'ordenados = sorted(meritos, reverse=True) e podio = ordenados[:3].',
          solution: py`meritos = [600, 2400, 1000, 1450, 1900]
ordenados = sorted(meritos, reverse=True)
podio = ordenados[:3]
print(podio)`,
          expected: '[2400, 1900, 1450]',
          check: py`assert meritos == [600, 2400, 1000, 1450, 1900], "A lista original não deve mudar: use sorted(), não .sort()."
assert ordenados == [2400, 1900, 1450, 1000, 600], "ordenados deve ir do maior para o menor."
assert podio == [2400, 1900, 1450], "podio deve ter os três primeiros de ordenados."`,
        },
        {
          id: 'afi-2', level: 2, title: 'Filtro de aprovados',
          task: 'Com `notas`, use **compreensões de lista** para criar `aprovados` (as notas maiores ou iguais a 60) e `com_bonus` (cada nota aprovada mais 5). Mostre as duas listas, uma por linha.',
          starter: py`notas = [72, 45, 95, 58, 60, 88]
aprovados = []
com_bonus = []
print(aprovados)
print(com_bonus)`,
          hint: 'aprovados = [nota for nota in notas if nota >= 60]. Para com_bonus, percorra aprovados e guarde nota + 5.',
          solution: py`notas = [72, 45, 95, 58, 60, 88]
aprovados = [nota for nota in notas if nota >= 60]
com_bonus = [nota + 5 for nota in aprovados]
print(aprovados)
print(com_bonus)`,
          expected: '[72, 95, 60, 88]\n[77, 100, 65, 93]',
          check: py`assert aprovados == [72, 95, 60, 88], "aprovados deve ter as notas a partir de 60, na ordem original."
assert com_bonus == [77, 100, 65, 93], "com_bonus deve ter cada nota aprovada mais 5."
assert "append" not in __fonte__, "Use compreensões de lista em vez de append()."`,
        },
        {
          id: 'afi-3', level: 3, title: 'Ranking da turma',
          task: 'Cada item de `turma` é uma tupla `(nome, mérito)`. Guarde em `ranking` a turma ordenada do maior mérito para o menor (use `sorted` com `key`). Depois mostre uma linha por aluno no formato `1º Nome - mérito`, numerando com `enumerate`.',
          starter: py`turma = [("Nina", 210), ("Caio", 600), ("Ayumi", 520), ("Samuel", 500)]
ranking = turma
# Mostre "1º Nome - mérito" para cada aluno, em ordem
`,
          hint: 'ranking = sorted(turma, key=lambda aluno: aluno[1], reverse=True). No laço: for posicao, (nome, merito) in enumerate(ranking, start=1).',
          solution: py`turma = [("Nina", 210), ("Caio", 600), ("Ayumi", 520), ("Samuel", 500)]
ranking = sorted(turma, key=lambda aluno: aluno[1], reverse=True)
for posicao, (nome, merito) in enumerate(ranking, start=1):
    print(f"{posicao}º {nome} - {merito}")`,
          expected: '1º Caio - 600\n2º Ayumi - 520\n3º Samuel - 500\n4º Nina - 210',
          check: py`assert ranking == [("Caio", 600), ("Ayumi", 520), ("Samuel", 500), ("Nina", 210)], "ranking deve estar do maior mérito para o menor."
assert turma[0] == ("Nina", 210), "Não altere a lista original: use sorted()."`,
        },
      ],
      quiz: [
        { q: 'Se `x = [10, 20, 30, 40]`, quanto vale `x[1:3]`?', options: ['`[10, 20, 30]`', '`[20, 30]`', '`[20, 30, 40]`', '`[10, 20]`'], correct: 1, why: 'A fatia começa na posição 1 (o 20) e para antes da posição 3 (o 40).' },
        { q: 'O que `[n * 2 for n in [1, 2, 3] if n > 1]` produz?', options: ['`[2, 4, 6]`', '`[4, 6]`', '`[2, 3]`', '`[1, 4, 6]`'], correct: 1, why: 'O filtro deixa passar só o 2 e o 3; cada um é multiplicado por 2.' },
      ],
    },

    {
      id: 'classes', title: 'Moldes de objetos', minutes: 14,
      summary: 'Junte dados e funções em classes e crie seus próprios tipos.',
      intro: { who: 'vesper', text: 'Até aqui vocês espalharam os dados de um lado e as funções do outro. Programas grandes juntam os dois em um molde só.' },
      sections: [
        { h: 'Da ficha ao molde', body: [
          'No projeto da Arena, cada lutador era um dicionário, e as funções que mexiam nele ficavam soltas pelo programa. Uma **classe** junta as duas coisas: é um molde que diz quais dados cada objeto guarda e o que ele sabe fazer.',
          { code: py`class Aluno:
    def __init__(self, nome, turma):
        self.nome = nome
        self.turma = turma
        self.pontos = 0

nina = Aluno("Nina", "D")
print(nina.nome, nina.turma, nina.pontos)` },
          '`__init__` (com dois sublinhados de cada lado) roda sozinho quando o objeto é criado. `self` é o próprio objeto que está nascendo: `self.nome = nome` guarda o valor **dentro dele**. Os dados de um objeto se chamam **atributos**, e você os acessa com ponto.',
        ] },
        { h: 'Métodos: funções que moram no objeto', body: [
          'Uma função definida dentro da classe é um **método**. O primeiro parâmetro é sempre `self`; na hora de chamar, o Python o preenche sozinho:',
          { code: py`class Aluno:
    def __init__(self, nome, turma):
        self.nome = nome
        self.turma = turma
        self.pontos = 0

    def ganhar(self, valor):
        self.pontos += valor

    def resumo(self):
        return f"{self.nome} ({self.turma}): {self.pontos} pts"

nina = Aluno("Nina", "D")
nina.ganhar(20)
nina.ganhar(30)
print(nina.resumo())    # Nina (D): 50 pts` },
          'Você usa métodos desde o capítulo 1: `"texto".upper()` e `lista.append(x)` são métodos das classes `str` e `list`. Agora você fabrica os seus.',
        ] },
        { h: 'Cada objeto tem os seus dados', body: [
          'A classe é o molde; cada objeto criado a partir dela é independente. Mudar um não afeta o outro:',
          { code: py`class Conta:
    def __init__(self, dono):
        self.dono = dono
        self.saldo = 0

lara = Conta("Lara")
davi = Conta("Davi")
lara.saldo += 100000
print(lara.saldo, davi.saldo)   # 100000 0` },
        ] },
        { h: 'Objetos que guardam objetos', body: [
          'Um atributo pode ser uma lista de outros objetos. É assim que programas grandes se organizam: uma turma tem alunos, uma loja tem itens, um jogo tem fases.',
          { code: py`class Aluno:
    def __init__(self, nome, pontos):
        self.nome = nome
        self.pontos = pontos

class Turma:
    def __init__(self, letra):
        self.letra = letra
        self.alunos = []

    def matricular(self, aluno):
        self.alunos.append(aluno)

    def total(self):
        return sum([aluno.pontos for aluno in self.alunos])

turma_d = Turma("D")
turma_d.matricular(Aluno("Caio", 600))
turma_d.matricular(Aluno("Ayumi", 520))
print(turma_d.total())   # 1120` },
          { tip: 'Daqui em diante, o caminho natural é: módulos e arquivos, bibliotecas como Pygame para jogos com gráficos e, quando quiser, um projeto seu do começo ao fim.' },
        ] },
      ],
      game: {
        title: 'Simulador do Sistema S',
        text: 'A escola inteira em uma classe: cada turma guarda seus pontos e sabe concluir aulas, vencer exames e calcular o depósito do mês. Rode e veja a Turma D escalar o placar em três meses.',
        code: py`class Turma:
    def __init__(self, letra, pontos):
        self.letra = letra
        self.pontos = pontos

    def aula_concluida(self):
        self.pontos += 20

    def vencer(self, outra):
        self.pontos += 120
        outra.pontos = max(outra.pontos - 100, 0)
        print(f"  Turma {self.letra} vence a Turma {outra.letra} no Exame Especial!")

    def deposito(self):
        return self.pontos * 100

turmas = [Turma("A", 1000), Turma("B", 720), Turma("C", 460), Turma("D", 0)]
d = turmas[3]

for mes in ["maio", "junho", "julho"]:
    print(f"== {mes.upper()} ==")
    for aula in range(4):
        d.aula_concluida()
    d.vencer(turmas[2])
    ordem = sorted(turmas, key=lambda turma: turma.pontos, reverse=True)
    for turma in ordem:
        print(f"  {turma.letra}: {turma.pontos:>5} CP -> depósito de {turma.deposito()} pp")`,
      },
      pitfalls: [
        'Esquecer o `self` como primeiro parâmetro de um método: o Python reclama do número de argumentos.',
        'Escrever `nome = nome` no `__init__` em vez de `self.nome = nome`: o valor se perde quando a função termina.',
        'Esquecer os parênteses ao criar o objeto: `Aluno` é o molde; `Aluno("Nina", "D")` é um objeto.',
      ],
      recap: ['`class Nome:` define um molde; `Nome(...)` cria um objeto.', '`__init__` prepara o objeto; `self` é o próprio objeto.', 'Atributos guardam dados; métodos são as ações.', 'Cada objeto tem os seus próprios atributos.'],
      exercises: [
        {
          id: 'cls-1', level: 1, title: 'Ficha de aluno',
          task: 'Complete a classe `Aluno`: o `__init__` deve guardar `nome` e `turma` no objeto e começar com `pontos` igual a `0`. O código do fim cria a aluna Nina e mostra os três atributos.',
          starter: py`class Aluno:
    def __init__(self, nome, turma):
        pass  # Guarde nome, turma e pontos no objeto

aluno = Aluno("Nina", "D")
print(aluno.nome)
print(aluno.turma)
print(aluno.pontos)`,
          hint: 'Três linhas dentro do __init__: self.nome = nome, self.turma = turma e self.pontos = 0.',
          solution: py`class Aluno:
    def __init__(self, nome, turma):
        self.nome = nome
        self.turma = turma
        self.pontos = 0

aluno = Aluno("Nina", "D")
print(aluno.nome)
print(aluno.turma)
print(aluno.pontos)`,
          expected: 'Nina\nD\n0',
          check: py`_a = Aluno("Teste", "B")
assert (_a.nome, _a.turma, _a.pontos) == ("Teste", "B", 0), "O __init__ deve guardar nome e turma e começar com pontos = 0."
assert isinstance(aluno, Aluno) and aluno.nome == "Nina", "Mantenha a criação de aluno = Aluno('Nina', 'D')."`,
        },
        {
          id: 'cls-2', level: 2, title: 'Conta de pontos privados',
          task: 'Complete a classe `Conta` com dois métodos:\n\n• `depositar(valor)`: soma o valor ao saldo.\n• `pagar(valor)`: se houver saldo suficiente, desconta o valor e devolve `True`; senão, não muda nada e devolve `False`.\n\nO código do fim já está pronto: ele deposita, tenta duas compras e mostra o saldo.',
          starter: py`class Conta:
    def __init__(self, dono):
        self.dono = dono
        self.saldo = 0

    def depositar(self, valor):
        pass

    def pagar(self, valor):
        pass

conta = Conta("Lara")
conta.depositar(22000)
print(conta.pagar(8000))
print(conta.pagar(50000))
print(conta.saldo)`,
          hint: 'depositar: self.saldo += valor. pagar: se valor > self.saldo, return False; caso contrário, desconte e return True.',
          solution: py`class Conta:
    def __init__(self, dono):
        self.dono = dono
        self.saldo = 0

    def depositar(self, valor):
        self.saldo += valor

    def pagar(self, valor):
        if valor > self.saldo:
            return False
        self.saldo -= valor
        return True

conta = Conta("Lara")
conta.depositar(22000)
print(conta.pagar(8000))
print(conta.pagar(50000))
print(conta.saldo)`,
          expected: 'True\nFalse\n14000',
          check: py`_c = Conta("Teste")
assert _c.saldo == 0, "Toda conta começa com saldo 0."
_c.depositar(100)
assert _c.saldo == 100, "depositar deve somar o valor ao saldo."
assert _c.pagar(100) is True and _c.saldo == 0, "Pagar exatamente o saldo deve funcionar e zerar a conta."
assert _c.pagar(1) is False and _c.saldo == 0, "Sem saldo, pagar devolve False e não muda nada."`,
        },
        {
          id: 'cls-3', level: 3, title: 'A turma inteira',
          task: 'A classe `Aluno` está pronta. Complete a classe `Turma`:\n\n• `matricular(aluno)`: adiciona o aluno à lista `self.alunos`.\n• `total()`: devolve a soma dos pontos de todos os alunos.\n• `lider()`: devolve o **nome** de quem tem mais pontos.\n\nO código do fim mostra o total e o líder da Turma D.',
          starter: py`class Aluno:
    def __init__(self, nome, pontos):
        self.nome = nome
        self.pontos = pontos

class Turma:
    def __init__(self, letra):
        self.letra = letra
        self.alunos = []

    def matricular(self, aluno):
        pass

    def total(self):
        pass

    def lider(self):
        pass

turma = Turma("D")
turma.matricular(Aluno("Caio", 600))
turma.matricular(Aluno("Ayumi", 520))
turma.matricular(Aluno("Nina", 210))
print(f"Total: {turma.total()}")
print(f"Líder: {turma.lider()}")`,
          hint: 'matricular usa self.alunos.append(aluno). Em total, some aluno.pontos em um laço. Em lider, guarde o melhor aluno visto até agora e devolva melhor.nome no fim.',
          solution: py`class Aluno:
    def __init__(self, nome, pontos):
        self.nome = nome
        self.pontos = pontos

class Turma:
    def __init__(self, letra):
        self.letra = letra
        self.alunos = []

    def matricular(self, aluno):
        self.alunos.append(aluno)

    def total(self):
        soma = 0
        for aluno in self.alunos:
            soma += aluno.pontos
        return soma

    def lider(self):
        melhor = self.alunos[0]
        for aluno in self.alunos:
            if aluno.pontos > melhor.pontos:
                melhor = aluno
        return melhor.nome

turma = Turma("D")
turma.matricular(Aluno("Caio", 600))
turma.matricular(Aluno("Ayumi", 520))
turma.matricular(Aluno("Nina", 210))
print(f"Total: {turma.total()}")
print(f"Líder: {turma.lider()}")`,
          expected: 'Total: 1330\nLíder: Caio',
          check: py`_t = Turma("X")
_t.matricular(Aluno("A", 5))
_t.matricular(Aluno("B", 9))
_t.matricular(Aluno("C", 7))
assert len(_t.alunos) == 3, "matricular deve adicionar o aluno a self.alunos."
assert _t.total() == 21, "total deve somar os pontos de todos os alunos."
assert _t.lider() == "B", "lider deve devolver o nome de quem tem mais pontos."
assert Turma("Y").alunos == [], "Cada turma precisa da sua própria lista de alunos."`,
        },
      ],
      quiz: [
        { q: 'Para que serve o método `__init__`?', options: ['Apagar o objeto', 'Preparar o objeto no momento em que ele é criado', 'Mostrar o objeto na tela', 'Importar um módulo'], correct: 1, why: 'O Python chama __init__ automaticamente ao criar o objeto. É onde os atributos iniciais são guardados.' },
        { q: 'Dentro de um método, o que é `self`?', options: ['A classe inteira', 'O próprio objeto que recebeu a chamada', 'Uma variável global', 'O valor devolvido pelo método'], correct: 1, why: 'Em nina.ganhar(20), self é nina. É por ele que o método alcança os atributos daquele objeto.' },
      ],
    },
  ],

  duel: {
    title: 'Exame do Conselho: Auditoria do Sistema S',
    seconds: 780,
    brief: 'Helena nunca perdeu um exame. O desafio junta o capítulo inteiro: texto partido em campos, erros tratados e dados ordenados.',
    task: 'O Conselho recebeu registros no formato `turma;aluno;pontos`. Alguns estão corrompidos: têm um campo faltando ou pontos que não são números.\n\nCrie a função `auditar(registros)`. Ela recebe uma lista de textos e devolve um dicionário com o **total de pontos de cada turma**, ignorando as linhas corrompidas (use `split`, `try` e `except`).\n\nDepois chame a função com `registros`, guarde o resultado em `totais` e mostre as turmas **da maior pontuação para a menor**, uma por linha:\n\n`A: 230`\n`D: 150`\n`C: 90`\n`B: 40`',
    starter: py`def auditar(registros):
    pass  # Devolva {"A": total, "B": total, ...} ignorando linhas corrompidas

registros = [
    "A;Sora;120",
    "D;Caio;60",
    "C;Yuki;90",
    "B;Theo;quarenta",
    "A;Bianca;110",
    "D;Nina",
    "B;Clara;40",
    "D;Ayumi;90",
]
totais = auditar(registros)
# Mostre as turmas da maior pontuação para a menor
`,
    hint: 'Dentro do for, coloque no try as duas linhas que podem falhar: o split desempacotado em três nomes e o int() dos pontos. No except ValueError, use continue. Para mostrar em ordem: sorted(totais.items(), key=lambda item: item[1], reverse=True).',
    solution: py`def auditar(registros):
    totais = {}
    for linha in registros:
        try:
            turma, aluno, pontos = linha.split(";")
            pontos = int(pontos)
        except ValueError:
            continue
        totais[turma] = totais.get(turma, 0) + pontos
    return totais

registros = [
    "A;Sora;120",
    "D;Caio;60",
    "C;Yuki;90",
    "B;Theo;quarenta",
    "A;Bianca;110",
    "D;Nina",
    "B;Clara;40",
    "D;Ayumi;90",
]
totais = auditar(registros)
for turma, pontos in sorted(totais.items(), key=lambda item: item[1], reverse=True):
    print(f"{turma}: {pontos}")`,
    expected: 'A: 230\nD: 150\nC: 90\nB: 40',
    check: py`assert isinstance(totais, dict), "Guarde em totais o dicionário devolvido por auditar(registros)."
assert auditar(registros) == {"A": 230, "D": 150, "C": 90, "B": 40}, "Confira os totais: linhas com campo faltando ou pontos não numéricos devem ser ignoradas."
assert auditar([]) == {}, "Com uma lista vazia, a função deve devolver um dicionário vazio."
assert auditar(["X;Ana;5", "X;Bia;abc", "Y;Caio;7", "sem-separador", "X;Davi;10"]) == {"X": 15, "Y": 7}, "A função deve funcionar com outros registros, ignorando os corrompidos."
assert "try" in __fonte__ and "except" in __fonte__, "Trate as linhas corrompidas com try e except."`,
    taunts: [
      'O Conselho não tem pressa. Você deveria ter.',
      'Linha seis. Já percebeu o que há de errado com ela?',
      'Um try bem colocado vale mais do que dez ifs desesperados.',
      'Ordenar um dicionário pelos valores. É interessante ver quem lembra como.',
      'Estou revisando a minha entrega. Por hábito, não por necessidade.',
    ],
  },
};
