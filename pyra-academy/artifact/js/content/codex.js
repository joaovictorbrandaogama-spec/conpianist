const py = String.raw;

// Guia rápido: consulta durante os exercícios e base de conhecimento da tutora offline.
export const codex = [
  { term: 'print()', category: 'Saída', keys: ['print', 'mostrar', 'imprimir', 'tela'],
    text: 'Mostra valores na tela. Vários valores separados por vírgula saem com um espaço entre eles; cada print termina pulando de linha.',
    code: py`print("Olá", "Python")
print(2 + 3)
print("sem pular linha", end="")` },
  { term: 'Variáveis', category: 'Fundamentos', keys: ['variavel', 'variável', 'variaveis', 'variáveis', 'atribuição', 'guardar'],
    text: 'O sinal = guarda o valor da direita no nome da esquerda. Use nomes descritivos em minúsculas com sublinhado. += e -= atualizam o valor atual.',
    code: py`vida = 100
vida -= 30
nome_do_heroi = "Lia"` },
  { term: 'Operadores', category: 'Fundamentos', keys: ['operador', 'conta', 'divisão', 'divisao', 'resto', 'potência', 'potencia', 'matemática', 'matematica', 'round'],
    text: '/ divide (devolve float); // devolve a parte inteira; % devolve o resto; ** eleva a uma potência. round(x, casas) arredonda.',
    code: py`print(7 / 2)    # 3.5
print(7 // 2)   # 3
print(7 % 2)    # 1
print(2 ** 3)   # 8
print(round(3.14159, 2))` },
  { term: 'Strings e f-strings', category: 'Texto', keys: ['string', 'texto', 'f-string', 'fstring', 'formatar', 'upper', 'strip', 'replace', 'len'],
    text: 'Textos vão entre aspas. Uma f-string preenche {lacunas} com valores. Métodos como .upper(), .strip() e .replace() devolvem um texto novo.',
    code: py`nome = "Ana"
media = 8.5
print(f"{nome}: {media:.2f}")
print("=" * 20)
print(len(nome), nome.upper(), nome[0])` },
  { term: 'input() e conversões', category: 'Entrada', keys: ['input', 'entrada', 'digitar', 'ler', 'int(', 'float(', 'converter', 'conversão'],
    text: 'input() sempre devolve texto. Converta com int() ou float() antes de fazer contas; str() faz o caminho inverso.',
    code: py`nome = input("Nome: ")
idade = int(input("Idade: "))
print(f"{nome} terá {idade + 1} anos.")` },
  { term: 'Comparações e lógica', category: 'Lógica', keys: ['comparação', 'comparacao', 'booleano', 'bool', 'true', 'false', ' and ', ' or ', 'not', '=='],
    text: '== compara igualdade e != diferença. and exige as duas condições, or exige ao menos uma, not inverte. O resultado é True ou False.',
    code: py`nivel = 8
tem_chave = False
print(nivel >= 5 and tem_chave)
print(nivel >= 5 or tem_chave)
print(not tem_chave)` },
  { term: 'if / elif / else', category: 'Decisão', keys: ['if', 'elif', 'else', 'condição', 'condicao', 'condicional', 'decisão'],
    text: 'Executa o primeiro bloco cuja condição é verdadeira; else trata o restante. A linha termina com dois-pontos e o bloco é recuado com 4 espaços.',
    code: py`pontos = 720
if pontos >= 1000:
    print("Ouro")
elif pontos >= 500:
    print("Prata")
else:
    print("Bronze")` },
  { term: 'random', category: 'Acaso', keys: ['random', 'aleatório', 'aleatorio', 'sortear', 'sorteio', 'dado', 'randint', 'choice'],
    text: 'Importe o módulo no começo do programa. randint(a, b) inclui os dois limites; choice(lista) sorteia um item.',
    code: py`import random
dado = random.randint(1, 6)
classe = random.choice(["mago", "ladino"])
if random.randint(1, 100) <= 30:
    print("Item raro!")` },
  { term: 'for e range()', category: 'Laços', keys: ['for', 'range', 'laço', 'laco', 'loop', 'repetir', 'repetição'],
    text: 'for percorre uma sequência. range(inicio, fim, passo) inclui o início e exclui o fim. Acumuladores são criados antes do laço.',
    code: py`total = 0
for numero in range(1, 6):
    total += numero
print(total)   # 15` },
  { term: 'while, break e continue', category: 'Laços', keys: ['while', 'break', 'continue', 'infinito', 'game loop', 'enquanto'],
    text: 'while repete enquanto a condição for verdadeira: algo no bloco precisa mudar a condição. break encerra o laço; continue pula para a próxima volta.',
    code: py`while True:
    comando = input("> ")
    if comando == "sair":
        break
    if comando == "":
        continue
    print("Você disse:", comando)` },
  { term: 'Listas', category: 'Coleções', keys: ['lista', 'listas', 'append', 'índice', 'indice', 'inventário', 'inventario', 'pop', 'remove'],
    text: 'Coleções ordenadas e mutáveis. Índices começam em zero; -1 é o último item. append adiciona; remove e pop retiram.',
    code: py`itens = ["espada", "poção"]
itens.append("escudo")
print(itens[0], itens[-1], len(itens))
for item in itens:
    print(item)
print("mapa" in itens)` },
  { term: 'Dicionários', category: 'Coleções', keys: ['dicionário', 'dicionario', 'dict', 'chave', 'valor', 'get(', 'items'],
    text: 'Pares de chave e valor. d[chave] consulta e altera; .get(chave, padrão) evita KeyError; .items() percorre chave e valor juntos.',
    code: py`heroi = {"nome": "Kai", "vida": 20}
heroi["vida"] += 15
print(heroi.get("mana", 0))
for chave, valor in heroi.items():
    print(chave, valor)` },
  { term: 'Grades (listas de listas)', category: 'Coleções', keys: ['grade', 'matriz', 'tabuleiro', 'mapa', '2d', 'join', 'linha', 'coluna'],
    text: 'Uma lista de linhas. grade[linha][coluna] acessa uma casa. Dois for aninhados visitam todas; " ".join(linha) transforma a linha em texto.',
    code: py`mapa = [[".", "."], [".", "."]]
mapa[1][0] = "@"
for linha in mapa:
    print(" ".join(linha))` },
  { term: 'Funções', category: 'Funções', keys: ['função', 'funcao', 'funções', 'funcoes', 'def', 'return', 'parâmetro', 'parametro', 'argumento', 'escopo'],
    text: 'def define; chamar executa. return devolve um valor e encerra a função (sem return, o resultado é None). Parâmetros podem ter valor padrão.',
    code: py`def aplicar_dano(vida, dano, escudo=0):
    efetivo = max(dano - escudo, 0)
    return max(vida - efetivo, 0)

print(aplicar_dano(50, 20, 5))   # 35` },
  { term: 'try / except', category: 'Erros', keys: ['try', 'except', 'exceção', 'excecao', 'tratar erro', 'tratamento de erro', 'raise', 'finally'],
    text: 'try tenta executar um trecho; se a exceção indicada acontecer, o except assume em vez de o programa cair. Diga sempre o tipo do erro. raise levanta um erro de propósito.',
    code: py`try:
    idade = int("vinte")
except ValueError:
    idade = 0
print(idade)

def sacar(saldo, valor):
    if valor > saldo:
        raise ValueError("saldo insuficiente")
    return saldo - valor

print(sacar(100, 30))` },
  { term: 'split() e join()', category: 'Texto', keys: ['split', 'join', 'separar texto', 'juntar texto', 'startswith', 'isdigit', 'registro'],
    text: 'split corta um texto e devolve uma lista; join faz o caminho de volta e é chamado no separador. in, startswith, count e isdigit respondem perguntas sobre o texto.',
    code: py`hora, aluno, motivo = "08:02;Davi;atraso".split(";")
print(aluno, motivo)
print(" | ".join(["A", "B", "C"]))
print("42".isdigit(), "erro" in "sem erro")` },
  { term: 'Fatias e sorted()', category: 'Coleções', keys: ['fatia', 'slice', 'sorted', 'ordenar', 'ordenação', 'reverse', 'key=', 'lambda'],
    text: 'lista[inicio:fim] devolve um pedaço (o fim não entra). sorted devolve uma nova lista em ordem; key diz o que comparar e reverse=True inverte.',
    code: py`notas = [72, 95, 58, 88]
print(sorted(notas, reverse=True)[:3])
alunos = [("Caio", 600), ("Sora", 2400)]
print(sorted(alunos, key=lambda aluno: aluno[1]))
print(max(notas), min(notas), sum(notas))` },
  { term: 'Compreensão de lista', category: 'Coleções', keys: ['compreensão', 'compreensao', 'comprehension', 'filtrar', 'enumerate', 'zip'],
    text: 'Cria uma lista a partir de outra em uma linha: [o que guardar for item in lista if condição]. enumerate entrega posição e item; zip percorre duas listas juntas.',
    code: py`notas = [72, 45, 95]
aprovados = [n for n in notas if n >= 60]
print(aprovados)
for posicao, nota in enumerate(aprovados, start=1):
    print(posicao, nota)` },
  { term: 'Tuplas', category: 'Coleções', keys: ['tupla', 'tuple', 'desempacotar', 'desempacotamento'],
    text: 'Uma sequência que não muda, escrita com parênteses. Boa para registros de tamanho fixo, e pode ser desempacotada em variáveis.',
    code: py`aluno = ("Nina", "D", 210)
nome, turma, merito = aluno
print(nome, turma, merito)
print(aluno[0], len(aluno))` },
  { term: 'Classes', category: 'Objetos', keys: ['classe em python', 'class ', 'objeto', '__init__', 'self', 'método', 'metodo', 'atributo'],
    text: 'Uma classe é um molde: __init__ prepara cada objeto, self é o próprio objeto, atributos guardam os dados e métodos são as ações.',
    code: py`class Conta:
    def __init__(self, dono):
        self.dono = dono
        self.saldo = 0

    def depositar(self, valor):
        self.saldo += valor

conta = Conta("Lara")
conta.depositar(500)
print(conta.dono, conta.saldo)` },
  { term: 'Lendo erros', category: 'Depuração', keys: ['erro', 'error', 'traceback', 'bug', 'depurar', 'debug', 'não funciona', 'nao funciona'],
    text: 'Leia a última linha do erro primeiro: ela diz o tipo e o motivo. A linha indicada é onde o Python percebeu o problema; às vezes a causa está na linha de cima. SyntaxError é escrita inválida; NameError é nome desconhecido; TypeError é mistura de tipos; IndentationError é recuo errado.',
    code: py`# Dúvida sobre o que uma variável guarda? Investigue:
valor = "3"
print(valor, type(valor))
print(int(valor) + 2)` },
];
