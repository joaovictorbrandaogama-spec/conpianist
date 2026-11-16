const py = String.raw;

// Jogos completos para estudar, rodar e modificar no Laboratório.
// `demo` são entradas de exemplo usadas na validação automática.
export const arcade = [
  {
    id: 'adivinhe', title: 'Adivinhe o número', tag: 'while · if · random', level: 'Capítulos 1–3',
    text: 'O computador pensa em um número e dá dicas. Você tem sete tentativas. Desafio: mude a faixa para 1 a 1000 e descubra quantas tentativas bastam.',
    demo: ['50', '75', '62', '68', '65', '66', '67'],
    code: py`import random

secreto = random.randint(1, 100)
tentativas = 7

print("Pensei em um número de 1 a 100.")
print(f"Você tem {tentativas} tentativas.")

while tentativas > 0:
    palpite = int(input("Seu palpite: "))
    tentativas -= 1

    if palpite == secreto:
        print("Acertou! Você leu a minha mente.")
        break
    elif palpite < secreto:
        print(f"É maior. Restam {tentativas} tentativas.")
    else:
        print(f"É menor. Restam {tentativas} tentativas.")

if palpite != secreto:
    print(f"Fim de jogo. O número era {secreto}.")`,
  },
  {
    id: 'jokenpo', title: 'Pedra, papel, tesoura', tag: 'dicionário · while · random', level: 'Capítulos 2–4',
    text: 'Melhor de cinco contra o computador. O dicionário VENCE guarda as regras em vez de uma pilha de ifs. Desafio: acrescente lagarto e Spock.',
    demo: ['pedra', 'papel', 'tesoura', 'pedra', 'papel', 'pedra', 'papel', 'tesoura', 'pedra'],
    code: py`import random

VENCE = {"pedra": "tesoura", "tesoura": "papel", "papel": "pedra"}
voce = 0
cpu = 0

print("Melhor de cinco: quem fizer 3 pontos vence.")
while voce < 3 and cpu < 3:
    jogada = input("pedra, papel ou tesoura? ").strip().lower()
    if jogada not in VENCE:
        print("Jogada inválida. Tente de novo.")
        continue

    rival = random.choice(list(VENCE))
    print(f"Você: {jogada} | Computador: {rival}")

    if jogada == rival:
        print("Empate.")
    elif VENCE[jogada] == rival:
        voce += 1
        print("Ponto seu!")
    else:
        cpu += 1
        print("Ponto do computador.")
    print(f"Placar: {voce} x {cpu}")
    print()

if voce > cpu:
    print("Você venceu a partida!")
else:
    print("O computador venceu. Revanche?")`,
  },
  {
    id: 'arena', title: 'Arena: batalha por turnos', tag: 'funções · dicionário · game loop', level: 'Capítulo 5',
    text: 'Um RPG de turnos com menu: atacar, golpe forte (pode errar) ou beber poção. Desafio: crie um segundo inimigo que aparece quando o primeiro cai.',
    demo: ['1', '2', '1', '3', '1', '2', '1', '1', '2', '1', '1', '1', '1', '1', '1'],
    code: py`import random

def barra(atual, maximo, tamanho=12):
    cheios = max(atual, 0) * tamanho // maximo
    return "[" + "#" * cheios + "-" * (tamanho - cheios) + "]"

def mostrar(heroi, monstro):
    print(f"Você   {barra(heroi['vida'], 40)} {heroi['vida']}/40   Poções: {heroi['pocoes']}")
    print(f"{monstro['nome']:<6} {barra(monstro['vida'], 50)} {monstro['vida']}/50")

def turno_do_heroi(heroi, monstro, escolha):
    if escolha == "1":
        dano = random.randint(6, 10)
        monstro["vida"] -= dano
        print(f"Você ataca e causa {dano}.")
    elif escolha == "2":
        if random.randint(1, 100) <= 60:
            dano = random.randint(14, 20)
            monstro["vida"] -= dano
            print(f"GOLPE FORTE! {dano} de dano.")
        else:
            print("Você erra o golpe forte.")
    elif escolha == "3" and heroi["pocoes"] > 0:
        heroi["pocoes"] -= 1
        heroi["vida"] = min(heroi["vida"] + 15, 40)
        print("Você bebe uma poção (+15).")
    else:
        print("Você hesita e perde a vez.")

heroi = {"vida": 40, "pocoes": 2}
monstro = {"nome": "Ogro", "vida": 50}

print("Um Ogro bloqueia a ponte!")
while heroi["vida"] > 0 and monstro["vida"] > 0:
    print()
    mostrar(heroi, monstro)
    escolha = input("[1] Atacar  [2] Golpe forte  [3] Poção > ").strip()
    turno_do_heroi(heroi, monstro, escolha)

    if monstro["vida"] > 0:
        pancada = random.randint(4, 9)
        heroi["vida"] -= pancada
        print(f"O Ogro revida: {pancada} de dano.")

print()
if heroi["vida"] > 0:
    print("O Ogro tomba. A ponte é sua!")
else:
    print("Você foi derrotado... tente outra estratégia.")`,
  },
  {
    id: 'velha', title: 'Jogo da velha', tag: 'listas · funções · for', level: 'Capítulos 4–5',
    text: 'Dois jogadores no mesmo teclado. O tabuleiro é uma lista de 9 casas e as vitórias são uma lista de trios. Desafio: faça o computador jogar de O escolhendo uma casa livre ao acaso.',
    demo: ['5', '1', '9', '3', '2', '8', '7', '6', '4'],
    code: py`LINHAS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],   # horizontais
    [0, 3, 6], [1, 4, 7], [2, 5, 8],   # verticais
    [0, 4, 8], [2, 4, 6],              # diagonais
]

def desenhar(casas):
    print()
    for inicio in [0, 3, 6]:
        print(" " + " | ".join(casas[inicio:inicio + 3]))
        if inicio < 6:
            print("---+---+---")
    print()

def vencedor(casas):
    for a, b, c in LINHAS:
        if casas[a] == casas[b] == casas[c]:
            return casas[a]
    return None

casas = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
jogador = "X"
jogadas = 0

while jogadas < 9 and vencedor(casas) is None:
    desenhar(casas)
    escolha = input(f"Jogador {jogador}, escolha uma casa: ").strip()
    if escolha not in casas or escolha in ("X", "O"):
        print("Casa inválida ou ocupada.")
        continue
    casas[int(escolha) - 1] = jogador
    jogadas += 1
    jogador = "O" if jogador == "X" else "X"

desenhar(casas)
ganhou = vencedor(casas)
if ganhou:
    print(f"Jogador {ganhou} venceu!")
else:
    print("Deu velha!")`,
  },
  {
    id: 'forca', title: 'Forca', tag: 'strings · listas · while', level: 'Capítulos 3–4',
    text: 'Descubra a palavra letra por letra antes de acabar as vidas. Desafio: adicione dicas por categoria e um placar de vitórias.',
    demo: ['a', 'e', 'o', 'i', 'r', 's', 't', 'n', 'l', 'c', 'm', 'd', 'p', 'u', 'v', 'b', 'f', 'g', 'h', 'j', 'q', 'x', 'z', 'k', 'w', 'y'],
    code: py`import random

PALAVRAS = ["python", "variavel", "funcao", "dicionario", "algoritmo", "laboratorio"]
palavra = random.choice(PALAVRAS)
descobertas = []
erradas = []
vidas = 6

print("=== FORCA ===")
while vidas > 0:
    visivel = ""
    for letra in palavra:
        visivel += letra if letra in descobertas else "_"
    print()
    print(" ".join(visivel), f"   vidas: {vidas}   erradas: {' '.join(erradas)}")

    if "_" not in visivel:
        print("Você descobriu a palavra!")
        break

    chute = input("Letra: ").strip().lower()
    if len(chute) != 1 or not chute.isalpha():
        print("Digite uma única letra.")
    elif chute in descobertas or chute in erradas:
        print("Você já tentou essa.")
    elif chute in palavra:
        descobertas.append(chute)
        print("Boa!")
    else:
        erradas.append(chute)
        vidas -= 1
        print("Não tem essa letra.")

if vidas == 0:
    print(f"Fim de jogo. A palavra era {palavra}.")`,
  },
  {
    id: 'labirinto', title: 'Labirinto', tag: 'grade · game loop · dicionário', level: 'Capítulo 4',
    text: 'Leve o @ até a saída S usando w, a, s, d. O mapa é uma lista de textos; os movimentos são um dicionário de deslocamentos. Desafio: adicione chaves e portas.',
    demo: ['d', 'd', 's', 's', 'd', 'd', 'w', 'w', 'd', 'd', 's', 's', 's', 's', 'a', 'x', 'd', 'd'],
    code: py`MAPA = [
    "##########",
    "#@..#....#",
    "#.#.#.##.#",
    "#.#...#..#",
    "#.#####.##",
    "#......S.#",
    "##########",
]
MOVIMENTOS = {"w": (-1, 0), "s": (1, 0), "a": (0, -1), "d": (0, 1)}

grade = [list(linha) for linha in MAPA]
linha, coluna = 1, 1
passos = 0

def desenhar():
    print()
    for fileira in grade:
        print("".join(fileira))

print("Chegue ao S. Comandos: w (cima), s (baixo), a (esquerda), d (direita).")
while True:
    desenhar()
    comando = input("Mover: ").strip().lower()
    if comando not in MOVIMENTOS:
        print("Comando desconhecido.")
        continue

    dl, dc = MOVIMENTOS[comando]
    destino = grade[linha + dl][coluna + dc]
    if destino == "#":
        print("Parede!")
        continue

    grade[linha][coluna] = "."
    linha += dl
    coluna += dc
    passos += 1
    grade[linha][coluna] = "@"

    if destino == "S":
        desenhar()
        print(f"Você escapou em {passos} passos!")
        break`,
  },
  {
    id: 'vida', title: 'Jogo da Vida', tag: 'grade · laços aninhados · funções', level: 'Capítulos 4–5',
    text: 'Não é um jogo de jogar, é de observar: células nascem e morrem conforme a vizinhança. Quatro regras simples produzem padrões que “andam”. Desafio: troque o padrão inicial.',
    demo: [],
    code: py`LARGURA, ALTURA = 12, 8

def vizinhos(grade, l, c):
    total = 0
    for dl in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dl == 0 and dc == 0:
                continue
            nl, nc = l + dl, c + dc
            if 0 <= nl < ALTURA and 0 <= nc < LARGURA and grade[nl][nc]:
                total += 1
    return total

def proxima(grade):
    nova = []
    for l in range(ALTURA):
        fileira = []
        for c in range(LARGURA):
            n = vizinhos(grade, l, c)
            viva = grade[l][c]
            fileira.append(n == 3 or (viva and n == 2))
        nova.append(fileira)
    return nova

grade = [[False] * LARGURA for _ in range(ALTURA)]
for l, c in [(0, 1), (1, 2), (2, 0), (2, 1), (2, 2)]:   # um "planador"
    grade[l][c] = True

for geracao in range(6):
    print(f"Geração {geracao}")
    for fileira in grade:
        print("".join("█" if viva else "·" for viva in fileira))
    print()
    grade = proxima(grade)`,
  },
  {
    id: 'sistema-s', title: 'Sistema S: seis meses', tag: 'classes · try · sorted', level: 'Capítulo 6',
    text: 'Você é representante da Turma D e tem seis meses para subir no placar. Cada escolha tem risco e recompensa. Desafio: crie uma quarta ação e faça as turmas rivais reagirem quando você passar delas.',
    demo: ['1', '2', 'x', '1', '3', '2', '2'],
    code: py`import random

class Turma:
    def __init__(self, letra, pontos):
        self.letra = letra
        self.pontos = pontos

    def mudar(self, valor):
        self.pontos = max(self.pontos + valor, 0)

# número da opção -> (nome, pior resultado, melhor resultado)
ACOES = {
    "1": ("Grupo de estudos", 40, 90),
    "2": ("Exame Especial contra a turma de cima", -80, 220),
    "3": ("Dia de folga", -30, 10),
}

def ler_opcao():
    while True:
        resposta = input("Sua escolha (1, 2 ou 3): ").strip()
        if resposta in ACOES:
            return resposta
        print("Opção inválida.")

rivais = [Turma("A", 1000), Turma("B", 720), Turma("C", 460)]
minha = Turma("D", 0)

print("Você é representante da Turma D. Tem 6 meses para subir no Sistema S.")
for mes in range(1, 7):
    print(f"\n=== MÊS {mes} | Turma D: {minha.pontos} CP ===")
    for numero, (nome, minimo, maximo) in ACOES.items():
        print(f"[{numero}] {nome} (de {minimo} a {maximo} CP)")

    nome, minimo, maximo = ACOES[ler_opcao()]
    resultado = random.randint(minimo, maximo)
    minha.mudar(resultado)
    print(f"{nome}: {resultado:+d} CP")

    for rival in rivais:
        rival.mudar(random.randint(-40, 30))

todas = sorted(rivais + [minha], key=lambda turma: turma.pontos, reverse=True)
print("\n=== RESULTADO FINAL ===")
for posicao, turma in enumerate(todas):
    marca = " <- você" if turma is minha else ""
    print(f"{posicao + 1}º lugar: antiga Turma {turma.letra} com {turma.pontos} CP{marca}")

if todas[0] is minha:
    print("A Turma D virou a Turma A. O campus inteiro está olhando para vocês.")
else:
    print("Ainda não foi desta vez. Rode de novo e teste outra estratégia.")`,
  },
];
