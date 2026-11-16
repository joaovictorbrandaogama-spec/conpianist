const py = String.raw;

export default {
  id: 'c3', n: 3, rival: 'theo',
  title: 'Laços',
  subtitle: 'Repita sem se repetir',
  blurb: 'for, while e o laço principal de um jogo. O computador não cansa; aprenda a mandar nele mil vezes com três linhas.',
  lessons: [
    {
      id: 'for', title: 'Repita sem se repetir', minutes: 11,
      summary: 'Percorra sequências com for e range().',
      intro: { who: 'theo', text: 'Copiar e colar a mesma linha dez vezes não é programar. É digitar. Se você se pegar repetindo, existe um laço esperando para ser escrito.' },
      sections: [
        { h: 'O laço for', body: [
          'O `for` repete um bloco de código uma vez para cada item de uma sequência. A cada volta, a variável do laço recebe o próximo item:',
          { code: py`for numero in range(3):
    print("Volta número", numero)
print("Acabou.")` },
          'A estrutura é a mesma do `if`: dois-pontos no fim da linha e bloco recuado com 4 espaços. O que estiver recuado se repete; o que estiver fora roda uma vez só, depois do laço.',
        ] },
        { h: 'range(): a fábrica de números', body: [
          { code: py`range(5)          # 0, 1, 2, 3, 4          (começa em 0, para ANTES do 5)
range(1, 6)       # 1, 2, 3, 4, 5          (começa em 1, para antes do 6)
range(0, 10, 2)   # 0, 2, 4, 6, 8          (de 2 em 2)
range(5, 0, -1)   # 5, 4, 3, 2, 1          (contagem regressiva)` },
          { warn: 'O limite final nunca entra. `range(1, 5)` vai até o 4. Para ir de 1 a 5, escreva `range(1, 6)`.' },
        ] },
        { h: 'Acumuladores', body: [
          'Para somar ou contar ao longo das voltas, crie uma variável **antes** do laço e atualize-a lá dentro. Se você criá-la dentro do laço, ela é zerada a cada volta.',
          { code: py`total = 0
for numero in range(1, 5):
    total += numero       # 1, depois 3, depois 6, depois 10
print(total)              # 10` },
        ] },
        { h: 'Percorrendo textos e laços dentro de laços', body: [
          'O `for` também percorre um texto, letra por letra. E um laço pode morar dentro de outro: para cada volta do laço de fora, o de dentro roda inteiro.',
          { code: py`for letra in "PYRA":
    print(letra)

for linha in range(3):
    for coluna in range(4):
        print("#", end="")   # end="" evita pular de linha
    print()                  # pula de linha ao fim de cada fileira` },
        ] },
      ],
      game: {
        title: 'Largada e mapa',
        text: 'Dois usos clássicos de for em jogos: uma contagem regressiva e o desenho de um mapa por fileiras. Mude a largura e a altura.',
        code: py`for segundos in range(3, 0, -1):
    print(f"{segundos}...")
print("JÁ!")
print()

largura = 12
altura = 4
print("+" + "-" * largura + "+")
for linha in range(altura):
    print("|" + "." * largura + "|")
print("+" + "-" * largura + "+")`,
      },
      pitfalls: [
        'Esperar que `range(5)` chegue ao 5: ele vai de 0 a 4.',
        'Criar o acumulador dentro do laço: ele volta ao valor inicial a cada repetição.',
        'Deixar o `print()` do resultado dentro do laço e ver o total parcial a cada volta.',
      ],
      recap: ['`for x in sequência:` repete o bloco para cada item.', '`range(inicio, fim, passo)` não inclui o fim.', 'Acumuladores nascem antes do laço.'],
      exercises: [
        {
          id: 'for-1', level: 1, title: 'Soma de XP',
          task: 'Use um `for` com `range()` para somar todos os números de 1 a 10 na variável `total`. Mostre apenas o total final.',
          starter: py`total = 0
# Percorra os números de 1 a 10 e acumule
print(total)`,
          hint: 'for numero in range(1, 11): e, dentro, total += numero. O print fica fora do laço, sem recuo.',
          solution: py`total = 0
for numero in range(1, 11):
    total += numero
print(total)`,
          expected: '55',
          check: py`assert total == 55, "A soma de 1 a 10 é 55."
assert "for" in __fonte__ and "range" in __fonte__, "Use for e range()."`,
        },
        {
          id: 'for-2', level: 2, title: 'Tabuada do 7',
          task: 'Mostre a tabuada do 7, de 1 a 10, com uma linha para cada conta no formato `7 x 1 = 7`.',
          starter: py`# Dez linhas, um laço
`,
          hint: 'for n in range(1, 11): print(f"7 x {n} = {7 * n}")',
          solution: py`for n in range(1, 11):
    print(f"7 x {n} = {7 * n}")`,
          expected: '7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35\n7 x 6 = 42\n7 x 7 = 49\n7 x 8 = 56\n7 x 9 = 63\n7 x 10 = 70',
          check: py`assert __fonte__.count("print") <= 2, "Use um laço em vez de dez prints."`,
        },
        {
          id: 'for-3', level: 3, title: 'A escadaria',
          task: 'Desenhe uma escada de 5 degraus com `#`: a primeira linha tem um `#`, a segunda tem dois, e assim por diante até cinco.',
          starter: py`# Use um for e a repetição de texto
`,
          hint: 'O número da volta diz quantos # desenhar: for degrau in range(1, 6): print("#" * degrau)',
          solution: py`for degrau in range(1, 6):
    print("#" * degrau)`,
          expected: '#\n##\n###\n####\n#####',
          check: py`assert "for" in __fonte__, "Use um laço for."
assert "#####" not in __fonte__, "Monte os degraus com repetição de texto, sem digitar a escada."`,
        },
      ],
      quiz: [
        { q: 'Quais valores `range(3)` fornece?', options: ['1, 2, 3', '0, 1, 2', '0, 1, 2, 3', 'Somente 3'], correct: 1, why: 'Com um argumento, range começa em zero e para antes do limite informado.' },
        { q: 'Quantas vezes o bloco de `for i in range(2, 8, 2):` é executado?', options: ['3', '4', '6', '8'], correct: 0, why: 'Os valores são 2, 4 e 6. O 8 não entra, então são três voltas.' },
      ],
    },

    {
      id: 'while', title: 'Enquanto houver vida', minutes: 10,
      summary: 'Repita enquanto uma condição continuar verdadeira.',
      intro: { who: 'theo', text: 'O for sabe quantas voltas vai dar. O while não sabe — e é por isso que ele é perigoso. Um laço que nunca termina é o desperdício supremo.' },
      sections: [
        { h: 'O laço while', body: [
          'O `while` repete o bloco **enquanto** a condição for verdadeira. Ele testa a condição antes de cada volta; quando ela fica falsa, o programa segue adiante.',
          { code: py`contador = 3
while contador > 0:
    print(contador)
    contador -= 1     # sem esta linha, o laço nunca terminaria
print("Fogo!")` },
        ] },
        { h: 'for ou while?', body: [
          { list: [
            'Use `for` quando você sabe **quantas vezes** vai repetir ou quer percorrer uma sequência.',
            'Use `while` quando a repetição depende de algo que **muda durante o laço**: a vida do monstro, o ouro acumulado, a resposta do jogador.',
          ] },
          { code: py`ouro = 10
dias = 0
while ouro < 100:
    ouro *= 2
    dias += 1
print(f"Meta atingida em {dias} dias, com {ouro} de ouro.")` },
        ] },
        { h: 'O laço infinito', body: [
          'Se nada dentro do bloco alterar a condição, o `while` roda para sempre. Antes de rodar, faça sempre a pergunta: **o que aqui dentro faz a condição ficar falsa?**',
          { warn: 'Se o seu programa travar, o laboratório interrompe a execução depois de 8 segundos. Quase sempre o motivo é um while sem atualização.' },
        ] },
      ],
      game: {
        title: 'Batalha automática',
        text: 'A batalha continua enquanto os dois lutadores estiverem de pé. Como os golpes são sorteados, cada execução conta uma luta diferente.',
        code: py`import random

vida_heroi = 40
vida_lobo = 30
turno = 1

while vida_heroi > 0 and vida_lobo > 0:
    golpe = random.randint(5, 12)
    vida_lobo -= golpe
    print(f"Turno {turno}: você causa {golpe}. Lobo com {max(vida_lobo, 0)} de vida.")
    if vida_lobo > 0:
        mordida = random.randint(4, 10)
        vida_heroi -= mordida
        print(f"         o lobo morde: {mordida}. Você com {max(vida_heroi, 0)} de vida.")
    turno += 1

if vida_heroi > 0:
    print("Vitória!")
else:
    print("O lobo venceu...")`,
      },
      pitfalls: [
        'Esquecer de atualizar a variável da condição: laço infinito.',
        'Atualizar a variável errada, ou na direção errada (somar quando devia subtrair).',
        'Usar `while` quando um `for` com `range()` seria mais simples e mais seguro.',
      ],
      recap: ['`while condição:` repete enquanto a condição for verdadeira.', 'Algo no bloco precisa caminhar para tornar a condição falsa.', '`for` para contagens conhecidas; `while` para condições que mudam.'],
      exercises: [
        {
          id: 'while-1', level: 1, title: 'Contagem regressiva',
          task: 'Com `contador = 3`, use `while` para mostrar `3`, `2` e `1`, um por linha, diminuindo o contador a cada volta. Depois do laço, mostre `Fogo!`.',
          starter: py`contador = 3
# Escreva o while e atualize o contador
`,
          hint: 'A condição é contador > 0. Dentro do bloco: print(contador) e depois contador -= 1. O print("Fogo!") fica fora, sem recuo.',
          solution: py`contador = 3
while contador > 0:
    print(contador)
    contador -= 1
print("Fogo!")`,
          expected: '3\n2\n1\nFogo!',
          check: py`assert contador == 0, "A contagem deve terminar com contador em zero."
assert "while" in __fonte__, "Use um laço while."`,
        },
        {
          id: 'while-2', level: 2, title: 'O ouro que dobra',
          task: 'Um amuleto dobra o seu ouro a cada dia. Começando com `ouro = 10` e `dias = 0`, use `while` para dobrar o ouro **enquanto ele for menor que 1000**, contando os dias. Mostre `dias` e depois `ouro`, um por linha.',
          starter: py`ouro = 10
dias = 0
# Dobre o ouro enquanto for menor que 1000

print(dias)
print(ouro)`,
          hint: 'while ouro < 1000: dentro, ouro *= 2 e dias += 1.',
          solution: py`ouro = 10
dias = 0
while ouro < 1000:
    ouro *= 2
    dias += 1

print(dias)
print(ouro)`,
          expected: '7\n1280',
          check: py`assert dias == 7 and ouro == 1280, "Em 7 dias o ouro chega a 1280."
assert "while" in __fonte__, "Use um laço while."`,
        },
        {
          id: 'while-3', level: 3, title: 'Duelo cronometrado',
          task: 'Simule a luta: a cada turno, o herói causa 12 de dano ao monstro. Se o monstro ainda estiver vivo, ele causa 7 de dano ao herói. Conte os turnos até o monstro chegar a zero ou menos. Mostre `Turnos: N` e depois `Vida restante: V` (a vida do herói).',
          starter: py`vida_heroi = 30
vida_monstro = 45
turnos = 0

# Lute enquanto o monstro estiver vivo

print(f"Turnos: {turnos}")
print(f"Vida restante: {vida_heroi}")`,
          hint: 'while vida_monstro > 0: tire 12 do monstro, some 1 em turnos e, com um if vida_monstro > 0, tire 7 do herói.',
          solution: py`vida_heroi = 30
vida_monstro = 45
turnos = 0

while vida_monstro > 0:
    vida_monstro -= 12
    turnos += 1
    if vida_monstro > 0:
        vida_heroi -= 7

print(f"Turnos: {turnos}")
print(f"Vida restante: {vida_heroi}")`,
          expected: 'Turnos: 4\nVida restante: 9',
          check: py`assert turnos == 4, "A luta dura 4 turnos."
assert vida_heroi == 9, "O herói apanha em 3 turnos: 30 - 21 = 9. O monstro não ataca depois de derrotado."
assert "while" in __fonte__, "Use um laço while."`,
        },
      ],
      quiz: [
        { q: 'Se a condição de um `while` for falsa logo no início, quantas vezes o bloco executa?', options: ['Uma', 'Duas', 'Zero', 'Infinitas'], correct: 2, why: 'O teste acontece antes de entrar no bloco; se já começa falso, o bloco nunca roda.' },
        { q: 'O que causa um laço infinito?', options: ['Usar print dentro do laço', 'Nada no bloco altera a condição', 'Usar while em vez de for', 'Ter mais de 100 voltas'], correct: 1, why: 'Se a condição nunca muda, ela nunca fica falsa e o laço não termina.' },
      ],
    },

    {
      id: 'laco-de-jogo', title: 'O laço do jogo', minutes: 11,
      summary: 'break, continue e o padrão que move todos os jogos.',
      intro: { who: 'theo', text: 'Todo jogo que você já jogou é um único laço: ler, atualizar, mostrar. Sessenta vezes por segundo. Entenda isso e você entende todos eles.' },
      sections: [
        { h: 'break: sair agora', body: [
          '`break` encerra o laço na hora, mesmo que a condição ainda seja verdadeira. O programa continua na primeira linha depois do laço.',
          { code: py`for numero in range(1, 100):
    if numero * numero > 50:
        print("Primeiro quadrado maior que 50:", numero * numero)
        break` },
        ] },
        { h: 'continue: pular esta volta', body: [
          '`continue` abandona a volta atual e vai direto para a próxima. É útil para ignorar casos que não interessam:',
          { code: py`for numero in range(1, 8):
    if numero % 2 == 0:
        continue          # pula os pares
    print(numero)         # 1, 3, 5, 7` },
        ] },
        { h: 'while True: o laço principal', body: [
          'Quando não dá para saber de antemão quando parar, o padrão é um laço “infinito” de propósito, com um `break` na condição de saída:',
          { code: py`while True:
    comando = input("> ")
    if comando == "sair":
        break
    print(f"Você digitou: {comando}")
print("Até a próxima.")` },
          'Esse é o esqueleto de quase todo jogo, o chamado **game loop**. A cada volta ele faz três coisas: **lê a entrada** do jogador, **atualiza o estado** do mundo (vida, posição, pontos) e **mostra o resultado**. Em um jogo gráfico isso acontece dezenas de vezes por segundo; em um jogo de texto, uma vez por comando.',
        ] },
      ],
      game: {
        title: 'Adivinhe o número',
        text: 'Um jogo completo em 15 linhas: laço principal, entrada, atualização e saída com break. Aqui três palpites já estão digitados; abra no Laboratório para jogar de verdade.',
        inputs: ['5', '9', '7'],
        code: py`secreto = 7
tentativas = 0

print("Pensei em um número de 1 a 10.")
while True:
    palpite = int(input("Seu palpite: "))
    tentativas += 1
    if palpite == secreto:
        print(f"Acertou em {tentativas} tentativas!")
        break
    elif palpite < secreto:
        print("É maior.")
    else:
        print("É menor.")`,
      },
      pitfalls: [
        'Escrever `while True` e esquecer o `break`: laço infinito garantido.',
        'Colocar código depois do `continue` no mesmo bloco esperando que ele rode: não roda.',
        'Achar que `break` sai do programa: ele só sai do laço mais interno.',
      ],
      recap: ['`break` encerra o laço.', '`continue` pula para a próxima volta.', '`while True` + `break` é o padrão do laço principal.', 'Game loop: entrada → atualização → saída.'],
      exercises: [
        {
          id: 'loop-1', level: 1, title: 'Primeiro que aparecer',
          task: 'Procure o primeiro número **maior que 50** que seja múltiplo de 7. Comece em `numero = 51`, use `while True` e saia com `break` quando encontrar. Guarde em `achado` e mostre o valor.',
          starter: py`numero = 51
achado = 0
while True:
    # Se numero for múltiplo de 7: guarde e saia
    # Senão: avance para o próximo
    break

print(achado)`,
          hint: 'if numero % 7 == 0: achado = numero e break. Fora do if, ainda dentro do while: numero += 1.',
          solution: py`numero = 51
achado = 0
while True:
    if numero % 7 == 0:
        achado = numero
        break
    numero += 1

print(achado)`,
          expected: '56',
          check: py`assert achado == 56, "O primeiro múltiplo de 7 depois de 50 é 56."
assert "break" in __fonte__ and "56" not in __fonte__, "Encontre o número com o laço e o break, sem digitá-lo."`,
        },
        {
          id: 'loop-2', level: 2, title: 'Pulando armadilhas',
          task: 'Mostre os números de 1 a 10, um por linha, **pulando os múltiplos de 3**. Use `for` e `continue`.',
          starter: py`for numero in range(1, 11):
    # Pule os múltiplos de 3
    print(numero)`,
          hint: 'Antes do print: if numero % 3 == 0: continue',
          solution: py`for numero in range(1, 11):
    if numero % 3 == 0:
        continue
    print(numero)`,
          expected: '1\n2\n4\n5\n7\n8\n10',
          check: py`assert "continue" in __fonte__, "Use continue para pular as voltas."`,
        },
        {
          id: 'loop-3', level: 3, title: 'Laço de comandos',
          task: 'Escreva um laço principal que lê comandos com `input()` até receber `sair`. Conte quantas vezes o comando `atacar` foi digitado; ignore qualquer outro comando. Ao sair, mostre `Ataques: N`.',
          starter: py`ataques = 0
# Laço principal: leia comandos até "sair"

print(f"Ataques: {ataques}")`,
          hint: 'while True: comando = input("> "). Se for "sair", break. Se for "atacar", ataques += 1.',
          solution: py`ataques = 0
while True:
    comando = input("> ")
    if comando == "sair":
        break
    if comando == "atacar":
        ataques += 1

print(f"Ataques: {ataques}")`,
          cases: [
            { inputs: ['atacar', 'curar', 'atacar', 'sair'], expected: 'Ataques: 2' },
            { inputs: ['sair'], expected: 'Ataques: 0' },
            { inputs: ['atacar', 'atacar', 'atacar', 'dançar', 'sair'], expected: 'Ataques: 3' },
          ],
        },
      ],
      quiz: [
        { q: 'O que `break` faz dentro de um laço?', options: ['Pula para a próxima volta', 'Encerra o laço imediatamente', 'Encerra o programa', 'Reinicia o laço'], correct: 1, why: 'break sai do laço na hora. Quem pula para a próxima volta é o continue.' },
        { q: 'Quais são os três passos de um game loop, na ordem?', options: ['Desenhar, dormir, repetir', 'Ler entrada, atualizar estado, mostrar resultado', 'Importar, definir, executar', 'Sortear, comparar, encerrar'], correct: 1, why: 'A cada volta o jogo lê o que o jogador fez, atualiza o mundo e mostra o novo estado.' },
      ],
    },
  ],

  duel: {
    title: 'Exame Especial: Sequência de combos',
    seconds: 480,
    brief: 'Theo detesta código repetido. Este desafio é um clássico de entrevistas, vestido de arena.',
    task: 'Percorra os turnos de 1 a 15. Para cada turno, mostre uma linha:\n\n• `Combo` se o turno for múltiplo de 3 **e** de 5\n• `Golpe` se for múltiplo só de 3\n• `Bloqueio` se for múltiplo só de 5\n• o próprio número nos outros casos\n\nConte quantos turnos foram `Golpe` e, no fim, mostre `Golpes: N`.',
    starter: py`golpes = 0
# Percorra os turnos de 1 a 15

print(f"Golpes: {golpes}")`,
    hint: 'A ordem dos testes importa: verifique primeiro o caso que é múltiplo dos dois (turno % 15 == 0), depois o de 3, depois o de 5.',
    solution: py`golpes = 0
for turno in range(1, 16):
    if turno % 3 == 0 and turno % 5 == 0:
        print("Combo")
    elif turno % 3 == 0:
        print("Golpe")
        golpes += 1
    elif turno % 5 == 0:
        print("Bloqueio")
    else:
        print(turno)

print(f"Golpes: {golpes}")`,
    expected: '1\n2\nGolpe\n4\nBloqueio\nGolpe\n7\n8\nGolpe\nBloqueio\n11\nGolpe\n13\n14\nCombo\nGolpes: 4',
    check: py`assert golpes == 4, "São 4 turnos de Golpe: 3, 6, 9 e 12."
assert "for" in __fonte__ or "while" in __fonte__, "Use um laço."
assert __fonte__.count("print") <= 6, "Um laço resolve isso com poucos prints."`,
    taunts: [
      'Laço escrito. Uma linha. Você ainda está contando nos dedos?',
      'A ordem dos testes importa. Espero que tenha percebido antes de mim.',
      'Contador implementado. Zero redundância.',
      'Estou só removendo um espaço em branco desnecessário.',
    ],
  },
};
