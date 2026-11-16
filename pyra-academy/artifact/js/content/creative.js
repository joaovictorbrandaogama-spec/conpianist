// Projetos criativos do Clube de Código Criativo (Monika). Cada um abre no laboratório livre.
// `inputs` são as respostas usadas para conferir o código no CPython (tools/creative-check).
export const CREATIVE = [
  {
    id: 'poemas', title: 'Gerador de poemas', level: 'Listas e random',
    text: 'Você escreve as palavras; o Python escolhe a ordem. Cada execução é um poema novo.',
    steps: ['Rode do jeito que está.', 'Troque as palavras das três listas pelas suas.', 'Mude o 4 do range para fazer poemas maiores.', 'Desafio: crie uma quarta lista com rimas e use no fim de cada verso.'],
    inputs: [],
    code: `# Gerador de poemas do Clube de Código Criativo
# Passo 1: rode do jeito que está.
# Passo 2: troque as palavras das listas pelas suas.
import random

quem = ["a lua", "o terminal", "a turma D", "um ponto e vírgula"]
faz = ["sussurra", "esquece", "programa", "espera"]
o_que = ["um laço sem fim", "o meu nome", "a nota de corte", "um poema em Python"]

for verso in range(4):
    sujeito = random.choice(quem)
    print(sujeito[0].upper() + sujeito[1:], random.choice(faz), random.choice(o_que) + ".")
`,
  },
  {
    id: 'losango', title: 'Arte em texto', level: 'Laços e strings',
    text: 'Um losango desenhado só com espaços e símbolos. Depois, a forma é sua.',
    steps: ['Rode e veja o losango.', 'Mude o tamanho e o símbolo.', 'Desafio: faça só a metade de cima, virando uma árvore com tronco.'],
    inputs: [],
    code: `# Arte em texto: um losango que cresce e diminui
# Passo 1: mude o tamanho. Passo 2: troque o "*" por outro símbolo.
tamanho = 5
simbolo = "*"

for i in range(1, tamanho + 1):
    print(" " * (tamanho - i) + simbolo * (2 * i - 1))
for i in range(tamanho - 1, 0, -1):
    print(" " * (tamanho - i) + simbolo * (2 * i - 1))
`,
  },
  {
    id: 'aventura', title: 'Aventura em texto', level: 'input e if',
    text: 'Uma história em que quem joga escolhe o caminho. Digite as respostas no terminal.',
    steps: ['Rode e escolha um caminho.', 'Escreva o que acontece em cada escolha com as suas palavras.', 'Desafio: dentro de uma escolha, faça outra pergunta.'],
    inputs: ['1'],
    code: `# Uma aventura em texto: você escolhe o caminho
print("Você acorda no Clube de Código Criativo. A porta está trancada.")
escolha = input("Você procura a chave (1) ou olha pela janela (2)? ")

if escolha == "1":
    print("Debaixo do teclado há uma chave e um bilhete: 'eu sabia que você ia achar'.")
elif escolha == "2":
    print("Lá fora, o telão do Sistema S pisca o seu nome.")
else:
    print("Você fica parado. Às vezes, não escolher também é uma escolha.")
`,
  },
  {
    id: 'carta', title: 'Carta para o futuro', level: 'f-strings',
    text: 'Uma carta que se escreve com as suas respostas.',
    steps: ['Rode e responda às perguntas.', 'Acrescente uma terceira pergunta e use a resposta na carta.', 'Desafio: conte quantas letras tem o seu sonho com len().'],
    inputs: ['Quarenta', 'um jogo'],
    code: `# Carta para o futuro: f-strings e input
nome = input("Seu nome: ")
sonho = input("O que você quer programar até o fim do ano? ")
print()
print(f"Querido(a) {nome} do futuro,")
print(f"lembra quando você queria programar {sonho}?")
print("Espero que tenha conseguido. E, se não, que ainda esteja tentando.")
`,
  },
  {
    id: 'ceu', title: 'Céu estrelado', level: 'Laços aninhados',
    text: 'Um céu diferente a cada execução, feito de pontos e estrelas.',
    steps: ['Rode algumas vezes.', 'Mude a largura, a altura e os símbolos da lista.', 'Desafio: coloque uma lua "(" em um lugar sorteado.'],
    inputs: [],
    code: `# Céu estrelado: random e laços aninhados
import random

largura = 30
altura = 6
for linha in range(altura):
    ceu = ""
    for coluna in range(largura):
        ceu += random.choice(["*", ".", " ", " ", " ", "+"])
    print(ceu)
`,
  },
  {
    id: 'palavras', title: 'As palavras do seu poema', level: 'Dicionários',
    text: 'Conta quais palavras um poema mais repete. Cole o seu poema no lugar do exemplo.',
    steps: ['Rode com o poema de exemplo.', 'Troque pelo seu poema.', 'Desafio: ignore palavras curtas, como "o" e "e".'],
    inputs: [],
    code: `# Quais palavras o seu poema mais repete?
poema = """o código canta
o código cala
e a turma inteira
ouve o código"""

contagem = {}
for palavra in poema.split():
    contagem[palavra] = contagem.get(palavra, 0) + 1

for palavra, vezes in sorted(contagem.items(), key=lambda par: -par[1]):
    print(palavra, vezes)
`,
  },
];
