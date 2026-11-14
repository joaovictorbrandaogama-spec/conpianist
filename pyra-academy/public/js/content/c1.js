const py = String.raw;

export default {
  id: 'c1', n: 1, rival: 'caio',
  title: 'Fundamentos',
  subtitle: 'A primeira linha',
  blurb: 'Texto, números, variáveis e a voz do jogador. Sem isso, nada do que vem depois fica de pé.',
  lessons: [
    {
      id: 'primeiro-programa', title: 'A primeira linha', minutes: 8,
      summary: 'Dê sua primeira ordem ao Python com print().',
      intro: { who: 'vesper', text: 'Todo prodígio desta sala começou exatamente aqui: uma linha, um resultado. A diferença é o que cada um fez depois.' },
      sections: [
        { h: 'O que é um programa', body: [
          'Um programa é uma lista de instruções que o computador executa **na ordem em que foram escritas**, de cima para baixo, uma de cada vez. Ele não adivinha intenções: faz exatamente o que está escrito, nem mais, nem menos.',
          'Python é a linguagem em que vamos escrever essas instruções. Ela foi desenhada para ser lida quase como uma frase, e é por isso que tanta gente começa por ela — de cientistas a criadores de jogos.',
        ] },
        { h: 'print(): a voz do programa', body: [
          'A instrução mais básica é `print()`. Ela mostra na tela o que estiver entre os parênteses. Para mostrar um texto, coloque-o entre aspas:',
          { code: py`print("Olá, Academia!")
print("Cada print começa em uma linha nova.")` },
          'Três detalhes que derrubam quase todo iniciante: `print` é escrito todo em minúsculas, os **parênteses** são obrigatórios e as **aspas** precisam abrir e fechar. As aspas não aparecem na tela: elas só avisam ao Python onde o texto começa e termina.',
          { tip: 'Pode usar aspas duplas ("texto") ou simples (\'texto\'). O que não pode é abrir com uma e fechar com a outra.' },
        ] },
        { h: 'Texto não é conta', body: [
          'Tudo o que está entre aspas é tratado como texto, letra por letra. Sem aspas, o Python tenta **calcular**:',
          { code: py`print("3 + 2")   # mostra: 3 + 2
print(3 + 2)     # mostra: 5` },
          'O que vem depois de `#` é um **comentário**: o Python ignora, mas quem lê o código agradece. Use comentários para explicar o porquê de uma linha, não para repetir o que ela já diz.',
        ] },
        { h: 'Vários valores e linhas em branco', body: [
          'Dá para mandar mais de um valor para o mesmo `print()`, separando por vírgula. O Python coloca um espaço entre eles. E um `print()` vazio pula uma linha:',
          { code: py`print("Mérito:", 100)
print()
print("Dano:", 6 * 7, "pontos")` },
        ] },
      ],
      game: {
        title: 'Tela de título',
        text: 'Todo jogo começa com uma tela de abertura. Antes de existirem gráficos, elas eram desenhadas só com caracteres. Rode e depois troque o nome do jogo pelo seu.',
        code: py`print("+----------------------------+")
print("|                            |")
print("|     A LENDA DE PYRA        |")
print("|                            |")
print("|   [1] Novo jogo            |")
print("|   [2] Continuar            |")
print("|                            |")
print("+----------------------------+")
print()
print("Versão", 1.0, "- feito com", 9, "linhas de Python")`,
      },
      pitfalls: [
        '`Print("oi")` com P maiúsculo: o Python diferencia maiúsculas de minúsculas e não conhece `Print`.',
        '`print("oi)` sem fechar as aspas: erro de sintaxe. Toda aspa aberta precisa ser fechada.',
        '`print "oi"` sem parênteses: funcionava no Python 2, não funciona mais.',
      ],
      recap: ['O programa roda de cima para baixo.', '`print()` mostra valores; texto vai entre aspas.', 'Sem aspas, o Python calcula. Depois de `#`, ele ignora.'],
      exercises: [
        {
          id: 'pp-1', level: 1, title: 'Sinal de vida',
          task: 'Use dois `print()` para mostrar exatamente estas duas linhas:\n\n`Olá, Academia!`\n`Meu primeiro programa.`',
          starter: py`# Escreva suas duas instruções abaixo
print("")`,
          hint: 'Cada frase vai em seu próprio print(), entre aspas. Copie acentos e pontuação exatamente.',
          solution: py`print("Olá, Academia!")
print("Meu primeiro programa.")`,
          expected: 'Olá, Academia!\nMeu primeiro programa.',
        },
        {
          id: 'pp-2', level: 2, title: 'Crachá da Vaga 006',
          task: 'Imprima o crachá abaixo, com as três linhas exatamente assim:\n\n`=== VAGA 006 ===`\n`Status: em treinamento`\n`Mérito: 0`',
          starter: py`# Três linhas, três prints
`,
          hint: 'São três chamadas de print(), uma embaixo da outra. Os sinais de igual fazem parte do texto.',
          solution: py`print("=== VAGA 006 ===")
print("Status: em treinamento")
print("Mérito: 0")`,
          expected: '=== VAGA 006 ===\nStatus: em treinamento\nMérito: 0',
        },
        {
          id: 'pp-3', level: 3, title: 'Deixe a máquina calcular',
          task: 'Mostre a linha `Dano total: 42` usando **um único** `print()` com dois valores separados por vírgula: o texto e a conta `6 * 7`. O número 42 não pode aparecer escrito no seu código.',
          starter: py`# Um print, dois valores: o texto e a conta
`,
          hint: 'print("Dano total:", 6 * 7) — a vírgula separa os valores e o Python coloca o espaço sozinho.',
          solution: py`print("Dano total:", 6 * 7)`,
          expected: 'Dano total: 42',
          check: py`assert "42" not in __fonte__, "Deixe o Python fazer a conta: escreva 6 * 7 em vez de 42."`,
        },
      ],
      quiz: [
        { q: 'O que `print("3 + 2")` mostra?', options: ['5', '3 + 2', '"3 + 2"', 'Um erro'], correct: 1, why: 'Entre aspas, 3 + 2 é só texto. Sem aspas, o Python calcularia a soma.' },
        { q: 'Em que ordem as instruções de um programa são executadas?', options: ['Da mais curta para a mais longa', 'Em ordem aleatória', 'De cima para baixo', 'Todas ao mesmo tempo'], correct: 2, why: 'O Python lê e executa uma linha de cada vez, de cima para baixo.' },
      ],
    },

    {
      id: 'variaveis', title: 'Etiquetas na memória', minutes: 10,
      summary: 'Guarde valores com nome e atualize-os ao longo do programa.',
      intro: { who: 'caio', text: 'Vida, ouro, pontos… todo jogo é um monte de números mudando. Quem não sabe guardar um número não programa nem jogo da velha.' },
      sections: [
        { h: 'Dando nome aos valores', body: [
          'Uma **variável** é um nome que aponta para um valor guardado na memória. Você cria uma variável com o sinal `=`:',
          { code: py`heroi = "Lia"
vida = 100
print(heroi)
print(vida)` },
          'Leia `vida = 100` como “vida **recebe** 100”. O `=` não pergunta se as coisas são iguais: ele guarda o valor da direita no nome da esquerda. Note que `heroi` aparece sem aspas no `print()`: com aspas, apareceria a palavra heroi; sem aspas, aparece o valor guardado.',
        ] },
        { h: 'Variáveis variam', body: [
          'O valor de uma variável pode ser trocado quantas vezes você quiser. O Python sempre calcula primeiro o lado direito e só depois guarda o resultado:',
          { code: py`vida = 100
vida = vida - 30    # usa o valor antigo (100) para calcular o novo
print(vida)         # 70

vida -= 20          # atalho para: vida = vida - 20
vida += 5           # atalho para: vida = vida + 5
print(vida)         # 55` },
          'Esse padrão — pegar o valor atual, mudar e guardar de volta — aparece em todo jogo: perder vida, ganhar ouro, somar pontos.',
        ] },
        { h: 'Regras e bons nomes', body: [
          { list: [
            'Nomes usam letras, números e `_`, sem espaços, e não podem começar com número.',
            'Maiúsculas importam: `Vida` e `vida` são variáveis diferentes.',
            'Por convenção, use minúsculas com sublinhado: `pontos_de_vida`, `nome_do_jogador`.',
            'Prefira nomes que dizem o que guardam. `ouro` é melhor que `x`.',
          ] },
        ] },
        { h: 'Tipos de valor', body: [
          'Cada valor tem um **tipo**. Os quatro que você mais vai usar:',
          { code: py`nome = "Lia"      # str: texto
nivel = 7         # int: número inteiro
precisao = 0.85   # float: número com casas decimais
viva = True       # bool: verdadeiro ou falso

print(type(nivel))   # <class 'int'>` },
          { tip: 'Em Python, o separador decimal é o ponto: 0.85, nunca 0,85.' },
        ] },
      ],
      game: {
        title: 'Ficha de personagem',
        text: 'Uma ficha de RPG é só um punhado de variáveis. Veja como elas mudam depois de uma armadilha e de um baú. Altere os valores e rode de novo.',
        code: py`nome = "Kael"
classe = "Ladino"
vida = 40
ouro = 12

print("===", nome, "o", classe, "===")
print("Vida:", vida, "| Ouro:", ouro)

# Kael pisa em uma armadilha...
vida -= 15
# ...mas encontra um baú logo depois.
ouro += 50

print("Depois da masmorra:")
print("Vida:", vida, "| Ouro:", ouro)`,
      },
      pitfalls: [
        'Usar uma variável antes de criar: `print(ouro)` antes de `ouro = 10` causa `NameError`.',
        'Escrever o nome diferente: criar `pontos` e depois usar `Pontos` ou `ponto`.',
        'Colocar aspas onde não deve: `print("vida")` mostra a palavra vida, não o valor.',
      ],
      recap: ['`nome = valor` guarda um valor.', 'O lado direito é calculado antes de guardar.', '`+=` e `-=` atualizam o valor atual.', 'Tipos básicos: `str`, `int`, `float`, `bool`.'],
      exercises: [
        {
          id: 'var-1', level: 1, title: 'Nasce uma heroína',
          task: 'Crie a variável `heroi` com o texto `Lia` e a variável `vida` com o número inteiro `100`. Mostre as duas, uma por linha, nessa ordem.',
          starter: py`heroi = ""
vida = 0
print(heroi)
print(vida)`,
          hint: 'O texto vai entre aspas: "Lia". O número vai sem aspas: 100.',
          solution: py`heroi = "Lia"
vida = 100
print(heroi)
print(vida)`,
          expected: 'Lia\n100',
          check: py`assert heroi == "Lia", "heroi deve guardar o texto Lia."
assert type(vida) is int and vida == 100, "vida deve ser o número inteiro 100, sem aspas."`,
        },
        {
          id: 'var-2', level: 2, title: 'Dia de feira',
          task: 'Você começa com `ouro = 50`. Ganhou 30 moedas em uma missão e gastou 45 em uma espada. Atualize a variável `ouro` com **duas operações** e mostre o valor final. Não escreva o resultado direto: deixe o Python calcular.',
          starter: py`ouro = 50
# Ganhou 30...
# ...e gastou 45.
print(ouro)`,
          hint: 'Use ouro += 30 e depois ouro -= 45. Cada linha parte do valor que a variável tem naquele momento.',
          solution: py`ouro = 50
ouro += 30
ouro -= 45
print(ouro)`,
          expected: '35',
          check: py`assert ouro == 35, "Depois de ganhar 30 e gastar 45, o ouro deve ser 35."
assert "35" not in __fonte__, "Não escreva 35 no código: atualize a variável com as operações."`,
        },
        {
          id: 'var-3', level: 3, title: 'Troca de mãos',
          task: 'O guerreiro quer trocar os itens de mão. Faça `mao_direita` passar a guardar `escudo` e `mao_esquerda` passar a guardar `espada` **sem digitar os textos de novo**: use as variáveis. Depois mostre `mao_direita` e `mao_esquerda`, uma por linha.',
          starter: py`mao_direita = "espada"
mao_esquerda = "escudo"
# Troque os valores das duas variáveis

print(mao_direita)
print(mao_esquerda)`,
          hint: 'Se você fizer mao_direita = mao_esquerda direto, a espada se perde. Guarde um dos valores em uma terceira variável antes (ou use o atalho do Python: a, b = b, a).',
          solution: py`mao_direita = "espada"
mao_esquerda = "escudo"
reserva = mao_direita
mao_direita = mao_esquerda
mao_esquerda = reserva

print(mao_direita)
print(mao_esquerda)`,
          expected: 'escudo\nespada',
          check: py`assert mao_direita == "escudo" and mao_esquerda == "espada", "As duas variáveis precisam trocar de valor."
assert __fonte__.count('"espada"') + __fonte__.count("'espada'") == 1, "Não digite os textos de novo: faça a troca usando as variáveis."`,
        },
      ],
      quiz: [
        { q: 'Depois de `x = 4` e `x = x + 2`, quanto vale `x`?', options: ['4', '2', '6', 'x + 2'], correct: 2, why: 'O lado direito usa o valor antigo (4), soma 2 e guarda 6 de volta em x.' },
        { q: 'Qual destes nomes de variável é válido em Python?', options: ['2jogador', 'pontos de vida', 'pontos_de_vida', 'pontos-de-vida'], correct: 2, why: 'Nomes não começam com número, não têm espaço nem hífen. O sublinhado é permitido.' },
      ],
    },

    {
      id: 'numeros', title: 'A calculadora de dano', minutes: 10,
      summary: 'Operadores, ordem das contas e os dois tipos de divisão.',
      intro: { who: 'vesper', text: 'Por trás de cada golpe crítico existe uma fórmula. Quem entende a fórmula deixa de torcer e passa a planejar.' },
      sections: [
        { h: 'Os operadores', body: [
          { code: py`print(7 + 2)    # 9    soma
print(7 - 2)    # 5    subtração
print(7 * 2)    # 14   multiplicação
print(7 / 2)    # 3.5  divisão (sempre dá float)
print(7 // 2)   # 3    divisão inteira (joga fora a parte decimal)
print(7 % 2)    # 1    resto da divisão
print(7 ** 2)   # 49   potência` },
          'Multiplicação é `*` (não x) e potência é `**` (não ^).',
        ] },
        { h: 'Quem é calculado primeiro', body: [
          'Vale a mesma ordem da matemática: primeiro potências, depois multiplicações e divisões, por último somas e subtrações. Parênteses passam na frente de tudo:',
          { code: py`print(2 + 3 * 4)     # 14
print((2 + 3) * 4)   # 20` },
          { tip: 'Na dúvida, use parênteses. Eles não custam nada e deixam a intenção clara.' },
        ] },
        { h: 'Divisão inteira e resto: a dupla dos jogos', body: [
          '`//` e `%` parecem estranhos, mas resolvem problemas do dia a dia. Converter tempo, distribuir itens, saber se um número é par, fazer algo “a cada N turnos”:',
          { code: py`segundos = 200
minutos = segundos // 60    # 3 minutos inteiros
resto = segundos % 60       # sobram 20 segundos
print(minutos, "min", resto, "s")

turno = 8
print(turno % 2)   # 0 → turno par; 1 → turno ímpar` },
        ] },
        { h: 'Inteiros, decimais e arredondamento', body: [
          'Misturar `int` com `float` dá `float`. Para arredondar, use `round(valor, casas)`; para cortar a parte decimal, `int(valor)`:',
          { code: py`dano = 17 * 1.5        # 25.5
print(round(dano))     # 26
print(round(3.14159, 2))  # 3.14
print(int(25.9))       # 25 (corta, não arredonda)` },
        ] },
      ],
      game: {
        title: 'Fórmula de dano',
        text: 'Uma fórmula de dano clássica: ataque menos defesa, multiplicado por um bônus de golpe crítico. Mude os atributos e veja quantos golpes são necessários.',
        code: py`ataque = 24
defesa = 9
critico = 1.5        # golpe crítico causa 50% a mais
vida_do_chefe = 120

dano_normal = ataque - defesa
dano_critico = round(dano_normal * critico)

print("Dano normal:", dano_normal)
print("Dano crítico:", dano_critico)

golpes = vida_do_chefe // dano_normal
sobra = vida_do_chefe % dano_normal
print("Golpes completos para derrotar o chefe:", golpes)
print("Vida que ainda sobraria:", sobra)`,
      },
      pitfalls: [
        'Esperar que `10 / 2` dê `5`: a divisão `/` sempre devolve float, então o resultado é `5.0`.',
        'Usar vírgula como decimal: `1,5` não é um número e meio; para o Python são dois valores.',
        'Esquecer os parênteses: `ataque - defesa * 2` multiplica antes de subtrair.',
      ],
      recap: ['`/` divide e devolve float; `//` devolve a parte inteira; `%` devolve o resto.', '`**` é potência.', 'Parênteses definem a ordem.', '`round()` arredonda.'],
      exercises: [
        {
          id: 'num-1', level: 1, title: 'Estoque de poções',
          task: 'Cada poção custa 25 moedas e você vai comprar 4. Mantenha `preco = 25` e `quantidade = 4`, calcule `total` **a partir dessas variáveis** e mostre `total`.',
          starter: py`preco = 25
quantidade = 4
total = 0  # Substitua por uma expressão
print(total)`,
          hint: 'Multiplicação em Python usa o asterisco: preco * quantidade.',
          solution: py`preco = 25
quantidade = 4
total = preco * quantidade
print(total)`,
          expected: '100',
          check: py`assert preco == 25 and quantidade == 4, "Mantenha os valores do enunciado."
assert total == 100, "total deve ser preço vezes quantidade."
assert "100" not in __fonte__, "Calcule o total com as variáveis, sem escrever 100."`,
        },
        {
          id: 'num-2', level: 2, title: 'Cronômetro da masmorra',
          task: 'Um jogador terminou a masmorra em `3725` segundos. Usando `//` e `%`, calcule `horas`, `minutos` e `segundos` (o que sobra de cada um) e mostre os três valores, um por linha, nessa ordem.',
          starter: py`tempo = 3725
horas = 0
minutos = 0
segundos = 0
print(horas)
print(minutos)
print(segundos)`,
          hint: 'Uma hora tem 3600 segundos: horas = tempo // 3600. O que sobra é tempo % 3600; aplique a mesma ideia com 60 para achar os minutos e os segundos.',
          solution: py`tempo = 3725
horas = tempo // 3600
resto = tempo % 3600
minutos = resto // 60
segundos = resto % 60
print(horas)
print(minutos)
print(segundos)`,
          expected: '1\n2\n5',
          check: py`assert (horas, minutos, segundos) == (1, 2, 5), "3725 segundos são 1 hora, 2 minutos e 5 segundos."
assert "//" in __fonte__ and "%" in __fonte__, "Use a divisão inteira (//) e o resto (%)."`,
        },
        {
          id: 'num-3', level: 3, title: 'Média do boletim',
          task: 'As notas de três provas foram `7.5`, `8.0` e `9.5`. Calcule a média, **arredonde para uma casa decimal** com `round()` e guarde em `media`. Mostre `media`.',
          starter: py`nota1 = 7.5
nota2 = 8.0
nota3 = 9.5
media = 0
print(media)`,
          hint: 'Some as três notas entre parênteses antes de dividir por 3. Depois: round(valor, 1).',
          solution: py`nota1 = 7.5
nota2 = 8.0
nota3 = 9.5
media = round((nota1 + nota2 + nota3) / 3, 1)
print(media)`,
          expected: '8.3',
          check: py`assert media == 8.3, "A média arredondada para uma casa deve ser 8.3. Confira os parênteses."
assert "round" in __fonte__, "Use round() para arredondar."`,
        },
      ],
      quiz: [
        { q: 'Qual é o resultado de `2 + 3 * 4`?', options: ['20', '14', '24', '9'], correct: 1, why: 'A multiplicação vem primeiro: 3 * 4 = 12, e depois 2 + 12 = 14.' },
        { q: 'Quanto vale `17 % 5`?', options: ['3', '3.4', '2', '12'], correct: 2, why: '17 dividido por 5 dá 3 e sobram 2. O operador % devolve esse resto.' },
      ],
    },

    {
      id: 'strings', title: 'Palavras com poder', minutes: 11,
      summary: 'Junte texto e dados com f-strings e métodos de string.',
      intro: { who: 'caio', text: 'Ninguém vê suas variáveis. O jogador só vê o que você escreve na tela. Texto feio, jogo feio.' },
      sections: [
        { h: 'Somar e repetir texto', body: [
          'Textos (strings) também aceitam `+` e `*`, mas com outro significado: `+` **junta** e `*` **repete**.',
          { code: py`print("Py" + "thon")     # Python
print("=" * 20)          # ====================
print("ha" * 3 + "!")    # hahaha!` },
        ] },
        { h: 'f-strings: texto com lacunas', body: [
          'Para misturar texto com valores, coloque um `f` antes das aspas e escreva as variáveis (ou contas) entre chaves. O Python preenche cada lacuna:',
          { code: py`nome = "Lia"
nivel = 7
print(f"{nome} chegou ao nível {nivel}!")
print(f"No próximo nível: {nivel + 1}")` },
          'Dá para formatar números dentro das chaves. `:.2f` mostra duas casas decimais, o padrão para dinheiro:',
          { code: py`preco = 4.5
print(f"Poção: {preco:.2f} moedas")   # Poção: 4.50 moedas` },
        ] },
        { h: 'Métodos: ferramentas embutidas', body: [
          'Strings vêm com funções próprias, chamadas com um ponto depois do texto. Elas **devolvem um texto novo**; o original não muda.',
          { code: py`nome = "  kael o bravo "
print(nome.strip())            # tira espaços das pontas
print(nome.strip().title())    # Kael O Bravo
print(nome.upper())            # tudo em maiúsculas
print(nome.replace("bravo", "sábio"))
print(len(nome.strip()))       # quantidade de caracteres: 12` },
        ] },
        { h: 'Posições dentro do texto', body: [
          'Cada caractere tem uma posição, e a contagem **começa em zero**. Posições negativas contam de trás para frente:',
          { code: py`palavra = "Python"
print(palavra[0])     # P
print(palavra[-1])    # n
print(palavra[0:3])   # Pyt  (da posição 0 até antes da 3)` },
        ] },
      ],
      game: {
        title: 'Barra de vida',
        text: 'Barras de vida são strings repetidas. Mude o valor de vida e veja a barra reagir. Esse truque de multiplicar caracteres aparece em quase todo jogo de texto.',
        code: py`nome = "Dragão Rubro"
vida = 13
vida_maxima = 20

cheio = "█" * vida
vazio = "░" * (vida_maxima - vida)
porcentagem = vida / vida_maxima * 100

print(nome.upper())
print(f"[{cheio}{vazio}] {vida}/{vida_maxima}")
print(f"{porcentagem:.0f}% de vida")
print("-" * 30)`,
      },
      pitfalls: [
        'Esquecer o `f`: `"Olá, {nome}"` sem o f mostra as chaves e a palavra nome.',
        'Somar texto com número: `"Pontos: " + 10` dá `TypeError`. Use f-string ou `str(10)`.',
        'Achar que `.upper()` altera a variável: é preciso guardar o resultado, `nome = nome.upper()`.',
      ],
      recap: ['`+` junta textos, `*` repete.', 'f-strings preenchem `{lacunas}` com valores.', 'Métodos como `.upper()` e `.strip()` devolvem um texto novo.', 'Posições começam em 0.'],
      exercises: [
        {
          id: 'str-1', level: 1, title: 'Placar',
          task: 'Com `nome = "Lia"` e `pontos = 80`, guarde em `mensagem` uma f-string que produza `Lia fez 80 pontos.` e mostre `mensagem`.',
          starter: py`nome = "Lia"
pontos = 80
mensagem = ""
print(mensagem)`,
          hint: 'Comece a string com f e use {nome} e {pontos} dentro dela. Não esqueça o ponto final.',
          solution: py`nome = "Lia"
pontos = 80
mensagem = f"{nome} fez {pontos} pontos."
print(mensagem)`,
          expected: 'Lia fez 80 pontos.',
          check: py`assert mensagem == "Lia fez 80 pontos.", "Confira os espaços e o ponto final."
assert "{" in __fonte__, "Use uma f-string com as variáveis entre chaves."`,
        },
        {
          id: 'str-2', level: 2, title: 'Barra de vida',
          task: 'Com `vida = 7` e `maximo = 10`, monte `barra` usando repetição de texto: um `#` para cada ponto de vida e um `-` para cada ponto que falta. Depois mostre a linha `[#######---] 7/10` usando uma f-string.',
          starter: py`vida = 7
maximo = 10
barra = ""
print(barra)`,
          hint: 'barra = "#" * vida + "-" * (maximo - vida). No print, coloque os colchetes como texto da f-string: f"[{barra}] {vida}/{maximo}".',
          solution: py`vida = 7
maximo = 10
barra = "#" * vida + "-" * (maximo - vida)
print(f"[{barra}] {vida}/{maximo}")`,
          expected: '[#######---] 7/10',
          check: py`assert barra == "#######---", "A barra deve ter 7 # e 3 -."
assert "*" in __fonte__, "Use a repetição de texto com *."`,
        },
        {
          id: 'str-3', level: 3, title: 'Registro de matrícula',
          task: 'O nome chegou bagunçado: `"  sora kanzaki  "`. Crie `limpo` sem os espaços das pontas e com iniciais maiúsculas, e `codigo` com o nome limpo todo em maiúsculas e `_` no lugar do espaço. Mostre, uma por linha: `limpo`, `codigo` e a quantidade de caracteres de `limpo`.',
          starter: py`nome = "  sora kanzaki  "
limpo = nome
codigo = nome
print(limpo)
print(codigo)
print(0)`,
          hint: 'Encadeie os métodos: nome.strip().title(). Para o código: limpo.upper().replace(" ", "_"). O tamanho vem de len(limpo).',
          solution: py`nome = "  sora kanzaki  "
limpo = nome.strip().title()
codigo = limpo.upper().replace(" ", "_")
print(limpo)
print(codigo)
print(len(limpo))`,
          expected: 'Sora Kanzaki\nSORA_KANZAKI\n12',
          check: py`assert limpo == "Sora Kanzaki", "limpo deve ser Sora Kanzaki."
assert codigo == "SORA_KANZAKI", "codigo deve ser SORA_KANZAKI."
assert "len(" in __fonte__, "Use len() para contar os caracteres."`,
        },
      ],
      quiz: [
        { q: 'Se `texto = "python"`, o que `len(texto)` devolve?', options: ['5', '6', '"6"', 'python'], correct: 1, why: 'len() conta os caracteres: são seis. O resultado é um número inteiro.' },
        { q: 'O que `print("ab" * 3)` mostra?', options: ['ab3', 'ababab', 'ab ab ab', 'Um erro'], correct: 1, why: 'Multiplicar um texto por um número repete o texto.' },
      ],
    },

    {
      id: 'entrada', title: 'O jogador fala', minutes: 10,
      summary: 'Receba dados com input() e converta texto em número.',
      intro: { who: 'vesper', text: 'Um programa que não escuta ninguém é um monólogo. A partir de agora, o seu vai fazer perguntas.' },
      sections: [
        { h: 'input(): fazendo perguntas', body: [
          '`input()` pausa o programa, espera a pessoa digitar e devolve o que foi digitado. O texto entre parênteses é a pergunta que aparece na tela:',
          { code: py`nome = input("Qual é o seu nome? ")
print(f"Prazer, {nome}!")` },
          { tip: 'Nos exercícios, as respostas são digitadas automaticamente pelo sistema de testes (você vê quais são acima do editor). No Laboratório, é você quem digita, direto no terminal.' },
        ] },
        { h: 'Tudo o que entra é texto', body: [
          'Este é o detalhe mais importante da aula: `input()` **sempre devolve texto**, mesmo que a pessoa digite um número. E texto com `+` é juntado, não somado:',
          { code: py`a = input("Um número: ")    # a pessoa digita 5
b = input("Outro: ")        # a pessoa digita 3
print(a + b)                # 53 — juntou os textos!` },
        ] },
        { h: 'Convertendo tipos', body: [
          'Para fazer contas, converta o texto em número: `int()` para inteiros e `float()` para decimais. O caminho contrário é `str()`.',
          { code: py`a = int(input("Um número: "))
b = int(input("Outro: "))
print(a + b)                # 8

altura = float("1.75")
print(str(10) + " pontos")` },
          'Se o texto não for um número (por exemplo `int("dez")`), o Python para com um `ValueError`. Mais adiante você vai aprender a se proteger disso.',
        ] },
      ],
      game: {
        title: 'Criação de personagem',
        text: 'A primeira tela de quase todo RPG: o jogo pergunta, o jogador responde. Aqui as respostas já estão preenchidas; abra no Laboratório para digitar as suas.',
        inputs: ['Ayla', 'maga', '16'],
        code: py`print("=== CRIAÇÃO DE PERSONAGEM ===")
nome = input("Nome: ")
classe = input("Classe: ")
idade = int(input("Idade: "))

vida = 50 + idade * 2
print()
print(f"{nome.title()}, a {classe}, entra na Academia.")
print(f"Vida inicial: {vida}")
print(f"Em dez anos terá {idade + 10} anos de experiência.")`,
      },
      pitfalls: [
        'Fazer conta com o que veio do `input()` sem converter: `"5" + "3"` vira `"53"`.',
        'Comparar texto com número: `input() > 10` dá `TypeError`. Converta com `int()` antes.',
        'Esquecer o espaço no fim da pergunta: `input("Nome:")` deixa a resposta colada no texto.',
      ],
      recap: ['`input()` lê o que a pessoa digita e devolve texto.', '`int()` e `float()` convertem texto em número.', '`str()` converte número em texto.'],
      exercises: [
        {
          id: 'ent-1', level: 1, title: 'Lista de presença',
          task: 'Leia um nome com `input()` e mostre `Olá, NOME! Sua vaga está confirmada.`, trocando NOME pelo que foi digitado.',
          starter: py`nome = input("Seu nome: ")
# Mostre a mensagem usando o nome
`,
          hint: 'Use uma f-string: print(f"Olá, {nome}! Sua vaga está confirmada.")',
          solution: py`nome = input("Seu nome: ")
print(f"Olá, {nome}! Sua vaga está confirmada.")`,
          cases: [
            { inputs: ['Ravi'], expected: 'Olá, Ravi! Sua vaga está confirmada.' },
            { inputs: ['Mei'], expected: 'Olá, Mei! Sua vaga está confirmada.' },
          ],
        },
        {
          id: 'ent-2', level: 2, title: 'Somador de pontos',
          task: 'Leia dois números inteiros com `input()` (um de cada vez), some os dois e mostre apenas o resultado.',
          starter: py`a = input("Primeiro número: ")
b = input("Segundo número: ")
print(a + b)`,
          hint: 'O código inicial junta os textos. Envolva cada input() com int(): a = int(input("...")).',
          solution: py`a = int(input("Primeiro número: "))
b = int(input("Segundo número: "))
print(a + b)`,
          cases: [
            { inputs: ['12', '30'], expected: '42' },
            { inputs: ['7', '5'], expected: '12' },
          ],
        },
        {
          id: 'ent-3', level: 3, title: 'Calculadora de XP',
          task: 'Leia o nome de um personagem e depois o nível dele (um inteiro). Cada nível exige 150 de XP. Mostre `NOME precisa de TOTAL XP para o próximo nível.`, onde TOTAL é o nível multiplicado por 150.',
          starter: py`# Leia o nome e o nível, calcule e mostre a frase
`,
          hint: 'nivel = int(input("Nível: ")). Depois, dentro da f-string, você pode fazer a conta: {nivel * 150}.',
          solution: py`nome = input("Nome: ")
nivel = int(input("Nível: "))
print(f"{nome} precisa de {nivel * 150} XP para o próximo nível.")`,
          cases: [
            { inputs: ['Mika', '4'], expected: 'Mika precisa de 600 XP para o próximo nível.' },
            { inputs: ['Dante', '11'], expected: 'Dante precisa de 1650 XP para o próximo nível.' },
          ],
        },
      ],
      quiz: [
        { q: 'A pessoa digita 5 e depois 3. O que este código mostra?\n\n`a = input()`\n`b = input()`\n`print(a + b)`', options: ['8', '53', '5 3', 'Um erro'], correct: 1, why: 'input() devolve texto. Somar dois textos junta um no outro: "5" + "3" vira "53".' },
        { q: 'Qual linha lê um número inteiro digitado pela pessoa?', options: ['n = input(int)', 'n = int(input())', 'n = input().int', 'n = inteiro(input())'], correct: 1, why: 'Primeiro input() lê o texto; depois int() converte esse texto em número inteiro.' },
      ],
    },
  ],

  duel: {
    title: 'Prova de Mérito: Ficha de combate',
    seconds: 420,
    brief: 'Caio aposta que termina antes de você. O desafio junta tudo do capítulo: variáveis, contas e f-strings.',
    task: 'A heroína Aria ataca um inimigo. Usando as variáveis dadas, calcule:\n\n• `dano_por_golpe`: o ataque menos a defesa do inimigo\n• `dano_total`: o dano por golpe vezes a quantidade de golpes\n• `vida_restante`: a vida do inimigo menos o dano total\n\nDepois mostre exatamente estas três linhas (os números devem vir das variáveis):\n\n`Aria ataca 3 vezes!`\n`Dano total: 33`\n`Vida do inimigo: 17/50`',
    starter: py`heroina = "Aria"
ataque = 18
defesa_inimigo = 7
golpes = 3
vida_inimigo = 50

# Calcule dano_por_golpe, dano_total e vida_restante

# Mostre as três linhas com f-strings
`,
    hint: 'Monte uma conta por linha. Nas f-strings, tudo o que muda vem entre chaves: f"{heroina} ataca {golpes} vezes!".',
    solution: py`heroina = "Aria"
ataque = 18
defesa_inimigo = 7
golpes = 3
vida_inimigo = 50

dano_por_golpe = ataque - defesa_inimigo
dano_total = dano_por_golpe * golpes
vida_restante = vida_inimigo - dano_total

print(f"{heroina} ataca {golpes} vezes!")
print(f"Dano total: {dano_total}")
print(f"Vida do inimigo: {vida_restante}/{vida_inimigo}")`,
    expected: 'Aria ataca 3 vezes!\nDano total: 33\nVida do inimigo: 17/50',
    check: py`assert dano_por_golpe == 11, "dano_por_golpe deve ser ataque menos defesa_inimigo."
assert dano_total == 33, "dano_total deve ser dano_por_golpe vezes golpes."
assert vida_restante == 17, "vida_restante deve ser vida_inimigo menos dano_total."
assert "33" not in __fonte__ and "17" not in __fonte__, "Os números 33 e 17 precisam vir das contas, não digitados."`,
    taunts: [
      'Já declarei todas as variáveis. Você ainda está lendo o enunciado?',
      'Metade pronta. Dá tempo de eu pegar um café.',
      'Só falta formatar a saída. Sente a pressão, Zero-Seis?',
      'Revisando… e pronto. Quer dizer, quase.',
    ],
  },
};
