// Elenco e retratos vetoriais originais, gerados em SVG a partir de parâmetros.
// Nenhuma imagem externa: cada rosto é montado por código, com contorno a tinta e sombra chapada.

// ---------- cores ----------
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const toHex = (parts) => '#' + parts.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const darken = (hex, amount) => toHex(rgb(hex).map((v) => v * (1 - amount)));
const lighten = (hex, amount) => toHex(rgb(hex).map((v) => v + (255 - v) * amount));
const mix = (a, b, t) => { const x = rgb(a); const y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };

export const CLASS_COLORS = { a: '#ffc93c', b: '#4fc8ff', c: '#5eea9a', d: '#ff3355' };
export const CLASS_MOTTO = {
  a: 'A elite. Nunca perdeu um Ponto de Classe por descuido.',
  b: 'A turma unida. Ninguém fica para trás.',
  c: 'A turma que joga sujo e cobra caro.',
  d: 'Os “defeituosos”. Começaram o mês com zero.',
};

const SKIN = { s1: '#f8e6da', s2: '#f1d3bd', s3: '#e3b793', s4: '#c98f6e', s5: '#a66c49', s6: '#7c4c34' };

// ---------- elenco ----------
// home: turma de origem (a, b, c, d) — a letra atual depende dos Pontos de Classe.
const student = (full, home, merit, tag, look, bio, quote, extra = {}) => ({
  name: full.split(' ')[0], full, home, merit, tag, bio, quote, role: tag, outfit: 'blazer', ...look, ...extra,
});
const look = (skin, hair, eye, style, more = {}) => ({ skin: SKIN[skin] || skin, hair, eye, style, ...more });

export const CAST = {
  narr: { name: '', color: '#f5f2ea' },
  voce: { name: 'Você', color: '#f5f2ea', home: 'd' },

  // --- equipe ---
  vesper: {
    name: 'Profª. Vésper', full: 'Vésper Albuquerque', role: 'Orientadora da Turma D', tag: 'Orientadora', color: '#b9a2ff', home: 'staff',
    skin: '#eed3c2', hair: '#2b2440', eye: '#8f73ff', style: 'bun', outfit: 'suit', tie: '#b9a2ff', glasses: true, fem: true,
    bio: 'Orientadora da Turma D. Fria, exata e alérgica a repetir instruções. Dizem que ela mesma se formou aqui — ninguém sabe em qual turma.',
    quote: 'Eu não repito. Anote.',
  },
  kurisu: {
    name: 'Kurisu', full: 'Makise Kurisu', role: 'Pesquisadora visitante · Lab 404', tag: 'Lab 404', color: '#ff9f6b', home: 'staff',
    skin: '#f6ddd0', hair: '#8f3d2f', eye: '#6f86e0', style: 'long', outfit: 'labcoat', tie: '#b3362c', fem: true,
    bio: 'Neurocientista visitante. Estuda como cérebros aprendem sob pressão — e você é o espécime mais conveniente do campus.',
    quote: 'Hipótese, experimento, conclusão.',
  },
  monika: {
    name: 'Monika', full: 'Monika', role: 'Presidente do Clube de Código Criativo · 3º ano', tag: 'A Presidente do Clube', color: '#5fd39a', home: 'y3',
    skin: SKIN.s1, hair: '#c4774e', eye: '#2fb873', style: 'ponytail', outfit: 'blazer', tie: '#5fd39a', fem: true, acc: ['bow'],
    bio: 'Presidente, e única integrante oficial, do Clube de Código Criativo. Escreve poemas que se programam sozinhos e guia quem aparece na porta do clube como se fosse a pessoa mais importante do mundo. Com você, ela tem certeza disso.',
    quote: 'Um programa é um poema que o computador lê em voz alta. Vamos escrever o seu?',
  },
  helena: {
    name: 'Helena', full: 'Helena Sarmento', role: 'Presidente do Conselho Estudantil · 3º ano', tag: 'A Presidente', color: '#fff1c9', home: 'y3',
    skin: SKIN.s2, hair: '#3a1f5c', eye: '#ff4d6d', style: 'hime', outfit: 'council', tie: '#e8173f', fem: true,
    bio: 'Presidente do Conselho Estudantil. Formanda da Turma A, invicta em Exames Especiais há três anos. É o Conselho que decide quais turmas merecem existir.',
    quote: 'O Sistema S não é cruel. Ele só não mente.',
  },

  mauro: {
    name: 'Prof. Mauro', full: 'Mauro Lisboa', role: 'Orientador da Turma A', tag: 'O Inflexível', color: '#ffc93c', home: 'staff',
    skin: SKIN.s3, hair: '#2a2a30', eye: '#4a4a5a', style: 'short', outfit: 'suit', tie: '#ffc93c',
    bio: 'Orientador da Turma A. Fala pouco, cobra muito e é o único professor que Vésper chama pelo primeiro nome.',
    quote: 'Regras existem para quem não sabe se comportar sem elas.',
  },
  estela: {
    name: 'Profª. Estela', full: 'Estela Rangel', role: 'Orientadora da Turma B', tag: 'A Sorridente', color: '#4fc8ff', home: 'staff',
    skin: SKIN.s2, hair: '#e8b04a', eye: '#ff7ab8', style: 'wavy', outfit: 'suit', tie: '#4fc8ff', fem: true,
    bio: 'Orientadora da Turma B e colega de turma de Vésper nos tempos de aluna. Sorri o tempo inteiro, inclusive quando está trapaceando.',
    quote: 'A Vésper te contou da nossa turma? Não? Que pena. Quer dizer… que bom.',
  },
  saulo: {
    name: 'Prof. Saulo', full: 'Saulo Bento', role: 'Orientador da Turma C', tag: 'O Conveniente', color: '#5eea9a', home: 'staff',
    skin: SKIN.s2, hair: '#6a6a72', eye: '#5a6a8a', style: 'slick', outfit: 'suit', tie: '#5eea9a', glasses: true,
    bio: 'Orientador da Turma C. Nunca vê nada de errado no que o Dário faz, e nunca vê nada de certo no que os outros fazem.',
    quote: 'Eu não vi nada. E você também não.',
  },
  diretor: {
    name: 'Diretor Valadares', full: 'Heitor Valadares', role: 'Diretor da Academia Pyra', tag: 'O Diretor', color: '#e6dff0', home: 'staff',
    skin: SKIN.s2, hair: '#b9bccb', eye: '#6a6a8a', style: 'slick', outfit: 'suit', tie: '#8f0f2a', glasses: true, hairLight: true,
    bio: 'Diretor da Academia e pai de Íris. Defende o Sistema S em público e, em particular, recebe visitas que não constam de nenhuma agenda.',
    quote: 'A escola não fabrica gênios. Ela revela quem já era.',
  },
  dulce: {
    name: 'Dona Dulce', full: 'Dulce Amorim', role: 'Gerente da Galeria Jacarandá', tag: 'A Gerente', color: '#5eea9a', home: 'staff',
    skin: SKIN.s4, hair: '#7a7a80', eye: '#5a3a2a', style: 'bun', outfit: 'suit', tie: '#5eea9a', fem: true, hairLight: true,
    bio: 'Comanda a Galeria há quinze anos. Sabe quem gastou o quê e não conta para ninguém, por menos de mil pontos.',
    quote: 'Cesta grátis é na prateleira de baixo, meu bem. Sem vergonha.',
  },
  selma: {
    name: 'Enfermeira Selma', full: 'Selma Duarte', role: 'Enfermaria', tag: 'A Enfermeira', color: '#ff9fb0', home: 'staff',
    skin: SKIN.s3, hair: '#3a2a2a', eye: '#5a8a7a', style: 'bun', outfit: 'labcoat', tie: '#ff9fb0', fem: true,
    bio: 'Cuida da enfermaria e de quem passa noites demais na frente do computador. Receita padrão: oito horas de sono e menos while True.',
    quote: 'Dormir também é estudar. Para o cérebro, pelo menos.',
  },
  zila: {
    name: 'Dona Zilá', full: 'Zilá Prado', role: 'Bibliotecária', tag: 'A Bibliotecária', color: '#c98f6e', home: 'staff',
    skin: SKIN.s5, hair: '#e0e0e8', eye: '#4a4a5a', style: 'bun', outfit: 'suit', tie: '#c98f6e', fem: true, glasses: true, hairLight: true,
    bio: 'Guardiã da Biblioteca e de um arquivo de provas antigas que ela jura que não existe.',
    quote: 'Silêncio. E devolva no prazo.',
  },
  rios: {
    name: 'Comandante Rios', full: 'Aurélio Rios', role: 'Chefe da Segurança', tag: 'O Vigia', color: '#9aa6b8', home: 'staff',
    skin: SKIN.s5, hair: '#141414', eye: '#3a3a3a', style: 'fade', outfit: 'suit', tie: '#2a2a36',
    bio: 'Comanda as cento e doze câmeras do campus. Nunca sorri na frente delas.',
    quote: 'Ponto cego não existe. Existe câmera que você ainda não achou.',
  },
  terno: {
    name: 'Homem de terno', full: 'Visitante sem nome', role: 'Visitante do Diretor', tag: 'O Visitante', color: '#f5f2ea', home: 'staff',
    skin: SKIN.s2, hair: '#101014', eye: '#2a2a30', style: 'slick', outfit: 'suit', tie: '#f5f2ea',
    bio: 'Ninguém sabe o nome dele. Visita o diretor uma vez por mês e olha para o Samuel como quem olha um projeto inacabado.',
    quote: 'O Projeto Tábula não abandona os seus resultados.',
  },

  // --- 2º e 3º anos ---
  leonardo: {
    name: 'Leonardo', full: 'Leonardo Vasconcelos', role: 'Vice-presidente do Conselho · 2º ano', tag: 'O Imperador', color: '#ff5f7a', home: 'y2',
    skin: SKIN.s2, hair: '#e2d6b8', eye: '#d0405a', style: 'messy', outfit: 'council', tie: '#e8173f', hairLight: true, acc: ['earring'],
    bio: 'Unificou o 2º ano inteiro sob o próprio nome: as quatro turmas dele obedecem a uma pessoa só. Quer suceder Helena e trocar a guerra entre classes por uma guerra entre indivíduos.',
    quote: 'Classes são uma muleta. Eu prefiro ver quem anda sozinho.',
  },
  sayuri: {
    name: 'Sayuri', full: 'Sayuri Monteiro', role: 'Secretária do Conselho · 2º ano', tag: 'A Secretária', color: '#9ab8ff', home: 'y2',
    skin: SKIN.s1, hair: '#1a1a28', eye: '#6a8ad0', style: 'hime', outfit: 'council', tie: '#e8173f', fem: true, glasses: true,
    bio: 'Redige as atas do Conselho e as regras dos Exames Especiais. Sabe as regras antes de todo mundo e nunca conta.',
    quote: 'Está no regulamento, artigo 31. Releia.',
  },
  benjamin: student('Benjamin Castro', 'y2', 0, 'O Resistente', look('s4', '#2a1a12', '#5a8a5a', 'short'),
    'Último líder do 2º ano que não se curvou a Leonardo. A turma dele paga caro por isso todo mês.', 'Ele compra todo mundo. Eu não estou à venda, e minha turma está pobre por isso.',
    { role: 'Líder do 2º ano B', color: '#86ecb0', tie: '#86ecb0' }),
  otto: student('Otto Brenner', 'y3', 0, 'O Veterano', look('s1', '#c9ae62', '#4a6aa0', 'fade'),
    'Foi vice de Helena por dois anos. Diz que se aposentou da política e vende conselhos na lanchonete por 500 pp.', 'Dica grátis: nada aqui é grátis.',
    { role: 'Ex-vice do Conselho · 3º ano', color: '#ffe08a', tie: '#ffe08a' }),
  dalila: student('Dalila Mor', 'y3', 0, 'A Exilada', look('s5', '#3a1a2a', '#c07ae0', 'wavy', { fem: true }),
    'Tentou derrubar Helena no segundo ano e perdeu. Desde então a turma dela vive na letra D, e ela ainda sorri quando fala da presidente.', 'Perder para ela foi a melhor aula que eu tive.',
    { role: '3º ano · Turma D', color: '#d8a8ff', tie: '#d8a8ff' }),

  // --- Turma A ---
  sora: student('Sora Kanzaki', 'a', 2400, 'O Enigma', look('#f4e5df', '#dfdcec', '#d4af6a', 'messy', { hairLight: true }),
    'Líder silencioso da Turma A e 1º lugar do ano desde o primeiro dia. Passa as aulas lendo e nunca foi visto estudando.',
    'Vence quem aprende mais rápido do que os outros esperam.', { color: '#f0e3b0', tie: '#d4af6a' }),
  bianca: student('Bianca Ferraz', 'a', 1900, 'A Estrategista', look('#c98f6e', '#3b1d2d', '#ff5fa2', 'wavy', { fem: true, acc: ['earring'] }),
    'Vice-líder da Turma A. Trata o colégio como um mercado: tudo é investimento, inclusive você.',
    'Eu adoro fazer… investimentos.', { color: '#ff7ab8', tie: '#ff7ab8' }),
  augusto: student('Augusto Bragança', 'a', 1720, 'O Herdeiro', look('s2', '#d9b45f', '#4a8fe0', 'slick'),
    'Terceira geração de Braganças na Turma A. Trata Pontos de Classe como herança de família.', 'Tradição não se discute. Se mantém.'),
  meilin: student('Mei Lin Duarte', 'a', 1650, 'A Calculista', look('s1', '#1b1b26', '#a07cff', 'hime', { fem: true, glasses: true }),
    'Resolve de cabeça o que os outros jogam na calculadora. Fala pouco e quase sempre em números.', 'Você tem 12% de chance. Eu arredondei para cima.'),
  rafael: student('Rafael Siqueira', 'a', 1580, 'O Orador', look('s4', '#2a1a16', '#e0a13a', 'fade'),
    'Capitão do clube de debate. Vence a discussão antes de o outro terminar a frase.', 'Posso refutar isso em três pontos. Quer ouvir os três?'),
  isadora: student('Isadora Krüger', 'a', 1520, 'A Perfeccionista', look('s1', '#e2c56a', '#3fb884', 'ponytail', { fem: true }),
    'Refaz um exercício que já estava certo até ele ficar bonito. Entrega tudo um dia antes.', 'Funcionar é o mínimo.'),
  nikolai: student('Nikolai Prado', 'a', 1470, 'O Enxadrista', look('s2', '#20202c', '#9aa6b8', 'short', { glasses: true }),
    'Pensa quatro jogadas à frente, inclusive na fila da cantina.', 'Você moveu o peão errado há dez minutos.'),
  helo: student('Helô Yamamoto', 'a', 1400, 'A Veloz', look('s3', '#e86a9a', '#7a4a2a', 'twintails', { fem: true }),
    'Digita mais rápido do que fala. E fala muito rápido.', 'Já terminei. Posso ir?'),
  vicente: student('Vicente Aragão', 'a', 1340, 'O Sentinela', look('s5', '#17171f', '#5a3a22', 'curly'),
    'Monitor informal da Turma A. Anota quem chega atrasado — nas outras turmas.', 'As câmeras veem tudo. Eu vejo o resto.'),
  livia: student('Lívia Castellani', 'a', 1290, 'A Diplomata', look('s2', '#a04a2a', '#2fa6a0', 'braid', { fem: true }),
    'Negocia acordos entre as turmas. Ninguém sabe exatamente para quem ela trabalha.', 'Todo mundo quer alguma coisa. Meu trabalho é saber o quê.'),

  iris: student('Íris Valadares', 'a', 2150, 'A Rainha', look('s1', '#e6dff0', '#9a6ad8', 'long', { fem: true, hairLight: true, acc: ['hairpin'] }),
    'Filha do diretor. Anda de bengala desde criança e nunca precisou correr: os outros correm por ela. Divide a Turma A ao meio com Augusto e diz que joga xadrez com pessoas.',
    'Uma peça que não sabe que é peça joga melhor.', { color: '#c9a8ff', tie: '#c9a8ff' }),
  mateus: student('Mateus Toledo', 'a', 1240, 'O Agente Duplo', look('s2', '#c9a36a', '#4a9fe8', 'side', { acc: ['earring'] }),
    'Sorri para Íris, almoça com Augusto e manda mensagem para a Turma C. Diz que só aposta no lado que vai vencer.', 'Lealdade é investimento de longo prazo. Eu prefiro curto.'),
  cecilia: student('Cecília Amaral', 'a', 1210, 'A Sombra da Rainha', look('s2', '#2a1f3a', '#c0405a', 'bob', { fem: true }),
    'Anda sempre dois passos atrás de Íris, carregando a bolsa e a paciência. Ninguém sabe o que Íris tem contra ela.', 'Não fui eu que escolhi ficar aqui.'),
  gael: student('Gael Fontoura', 'a', 1180, 'O Guarda-Costas', look('s5', '#101018', '#3a3a4a', 'fade'),
    'Não fala, não ri e não sai de perto de Íris. Já desmontou um teclado mecânico com uma mão só.', '…'),
  henrique: student('Henrique Leme', 'a', 1150, 'O Fiel', look('s3', '#3b2a1e', '#5a7a3a', 'short', { glasses: true }),
    'Braço direito de Augusto. Defende a facção conservadora com planilhas e com a voz alta demais.', 'O Augusto sempre tem razão. Eu só confiro os decimais.'),
  yasmin: student('Yasmin Bastos', 'a', 1100, 'A Neutra', look('s4', '#3a2418', '#c97a3a', 'ponytail', { fem: true }),
    'Recusou as duas facções da Turma A. Prefere a biblioteca e o clube de xadrez, onde perde de propósito para Íris.', 'Neutralidade também é uma posição.'),
  ravi: student('Ravi Menon', 'a', 1060, 'O Prodígio Cansado', look('s5', '#16121a', '#8a5a2a', 'messy'),
    'Entrou na faculdade aos doze anos, largou aos treze e veio parar aqui para ter uma adolescência. Está achando tudo muito cansativo.', 'Eu já escrevi uma tese sobre isso. Era chata.'),
  tais: student('Taís Moreno', 'a', 1020, 'A Alpinista', look('s3', '#7a2a3a', '#e0a13a', 'wavy', { fem: true, acc: ['earring'] }),
    'Muda de facção conforme o placar. Já esteve com Augusto, com Íris e, por uma tarde, com a Turma B.', 'Eu não troco de lado. O lado é que troca de mim.'),

  // --- Turma B ---
  theo: student('Theo Lindqvist', 'b', 1450, 'O Otimizador', look('#f2d8c5', '#c9ae62', '#35b884', 'side', { glasses: true }),
    'O ás da Turma B. Tem uma regra: nunca escreve a mesma linha duas vezes.',
    'Tempo é o único recurso que não se recupera.', { color: '#86ecb0', tie: '#86ecb0' }),
  clara: student('Clara Bittencourt', 'b', 1380, 'A Representante', look('s2', '#f0a6b8', '#4a9fe8', 'long', { fem: true, acc: ['hairpin'] }),
    'Sabe o nome dos quarenta alunos do ano. A Turma B a seguiria até o fim do ranking — e voltaria.', 'Ninguém da minha turma fica para trás. Ninguém.'),
  hugo: student('Hugo Tanaka', 'b', 1210, 'O Braço Direito', look('s2', '#1d1d28', '#6a4a2a', 'short'),
    'Organiza os grupos de estudo da Turma B com planilha, cronograma e lanche.', 'Sessão de revisão às sete. Trouxe pão de queijo.'),
  luna: student('Luna Figueiredo', 'b', 1160, 'A Sonhadora', look('s4', '#5b3a8c', '#ffd24a', 'bob', { fem: true }),
    'Escreve programas que geram poesia. Alguns até compilam.', 'E se o erro for só o código tentando dizer outra coisa?'),
  pedro: student('Pedro Nakamura', 'b', 1100, 'O Arquivista', look('s3', '#4a2f22', '#3f7f6a', 'bangs', { glasses: true }),
    'Guarda cópia de todas as provas antigas que a escola permite guardar. E de algumas que não.', 'Isso caiu em 2019. Questão quatro.'),
  sofia: student('Sofia Albernaz', 'b', 1050, 'A Mediadora', look('s5', '#231815', '#c97a3a', 'curly', { fem: true }),
    'Resolve brigas de grupo antes que elas custem pontos à turma.', 'Respira. Agora me conta do começo.'),
  enzo: student('Enzo Carvalhal', 'b', 990, 'O Impulsivo', look('s2', '#e2752b', '#3f9a5a', 'spiky'),
    'Roda o código antes de terminar de escrever. Às vezes dá certo.', 'Testa primeiro, entende depois!'),
  aiko: student('Aiko Mendes', 'b', 940, 'A Detalhista', look('s1', '#1c2a52', '#5cc4ff', 'twintails', { fem: true }),
    'Acha o espaço sobrando no fim da linha 212.', 'Tem um espaço a mais ali. Não, ali.'),
  tomas: student('Tomás Queiroz', 'b', 880, 'O Tranquilo', look('s6', '#15151c', '#8a6a3a', 'fade'),
    'Nunca foi visto com pressa. Entrega sempre no último minuto, sempre certo.', 'Calma. O prazo é só às seis.'),
  valentina: student('Valentina Rocha', 'b', 830, 'A Atleta', look('s3', '#8f4a2f', '#4a7fd0', 'ponytail', { fem: true, acc: ['bandage'] }),
    'Capitã do vôlei. Trata bug como adversário: estuda, cansa e derruba.', 'Mais uma tentativa. Sempre cabe mais uma.'),

  benicio: student('Benício Arantes', 'b', 1300, 'O Escudo', look('s2', '#1a1a24', '#5ab0e0', 'slick'),
    'Calado, frio e o único da Turma B que desconfia de todo mundo, para que Clara não precise.', 'Alguém precisa pensar no pior. Eu me ofereci.'),
  rui: student('Rui Assunção', 'b', 1020, 'O Artilheiro', look('s4', '#2a1a12', '#e0a13a', 'spiky'),
    'Camisa 10 do futebol e de qualquer grupo de estudo que precise de energia. Erra o código com o mesmo sorriso com que erra pênalti.', 'Bora! Mais uma rodada!'),
  elisa: student('Elisa Moraes', 'b', 960, 'A Correspondente', look('s1', '#c96a8a', '#6a4ac0', 'twintails', { fem: true }),
    'Edita o jornalzinho da Turma B. Metade das notícias é verdade; a outra metade vira verdade depois que ela publica.', 'Isso é exclusivo. Posso citar você?'),
  diego: student('Diego Hamada', 'b', 900, 'O Inventor', look('s3', '#4a2f22', '#3fa07a', 'messy', { glasses: true }),
    'Monta robôs com sucata da Galeria. Um deles já entregou lanche no dormitório errado.', 'Se não explodiu, é protótipo.'),
  patricia: student('Patrícia Ueno', 'b', 870, 'A Tesoureira', look('s2', '#3a2a1a', '#4a7fd0', 'braid', { fem: true }),
    'Guarda o fundo comum da Turma B: cada aluno deposita um pouco, e ninguém fica sem almoço.', 'Ninguém fica sem almoço. Mas todo mundo presta contas.'),
  noah: student('Noah Prates', 'b', 800, 'O Perdido', look('s1', '#d9c27a', '#5a9a8a', 'bangs'),
    'Se perde no campus desde o primeiro dia. Já entrou na sala do Conselho procurando o banheiro, duas vezes.', 'Desculpa, eu me perdi de novo. Aqui é a biblioteca?'),
  lia: student('Lia Bonfim', 'b', 760, 'A Voluntária', look('s4', '#2a1a2a', '#e07ab8', 'bun', { fem: true }),
    'Se inscreve em todo mutirão, toda comissão e todo grupo de estudos. Dorme quatro horas por noite e jura que está ótima.', 'Pode deixar comigo! E a outra coisa também!'),
  caua: student('Cauã Pires', 'b', 720, 'O Cético', look('s3', '#1e1a16', '#6a8a6a', 'fade'),
    'Acha que a Clara é boa demais para ser verdade. Ficou na Turma B para provar e ainda não conseguiu.', 'Ninguém é tão legal assim de graça.'),

  // --- Turma C ---
  yuki: student('Yuki Arashi', 'c', 1000, 'A Lógica Fria', look('#f6e2d6', '#1c2a52', '#5cc4ff', 'bob', { fem: true }),
    'A melhor nota da Turma C. Modela tudo em probabilidades, inclusive as pessoas.',
    'Eu não erro lógica. Sugiro que você também não.', { color: '#79d6ff', tie: '#79d6ff' }),
  dario: student('Dário Falcão', 'c', 960, 'O Tirano', look('s3', '#7a1620', '#e04a3a', 'slick', { acc: ['scar'] }),
    'Governa a Turma C com contratos e medo. Considera as outras turmas um caixa eletrônico.', 'Ponto de classe é igual a dinheiro: está sempre no bolso errado até eu pegar.'),
  kenji: student('Kenji Barros', 'c', 900, 'O Capanga', look('s4', '#17171f', '#6a5a4a', 'short', { acc: ['bandage'] }),
    'Faz o que Dário manda. Programa surpreendentemente bem quando ninguém está olhando.', 'O chefe mandou perguntar quanto você tem de saldo.'),
  mirela: student('Mirela Santoro', 'c', 850, 'A Espiã', look('s2', '#1f6f78', '#e0c84a', 'bangs', { fem: true }),
    'Sempre aparece onde há uma conversa que não é dela.', 'Eu? Só estava passando.'),
  igor: student('Igor Volkov', 'c', 800, 'O Muro', look('s1', '#b9bccb', '#5a8ad0', 'fade', { hairLight: true }),
    'Dois metros de silêncio. Lê documentação por diversão.', '…'),
  jade: student('Jade Nogueira', 'c', 760, 'A Apostadora', look('s5', '#16161e', '#ffc93c', 'braid', { fem: true, acc: ['earring'] }),
    'Aposta pontos privados em qualquer coisa: provas, chuva, quem chega atrasado.', 'Dois para um que você trava no while.'),
  otavio: student('Otávio Pimentel', 'c', 710, 'O Contador', look('s2', '#6b4530', '#3f6f5a', 'side', { glasses: true }),
    'Mantém o livro-caixa dos contratos da Turma C. Sabe quanto cada colega deve.', 'Com juros, são 2.340 pontos.'),
  sara: student('Sara Ishikawa', 'c', 670, 'A Sombra', look('s1', '#20202c', '#9a7ad0', 'hime', { fem: true, acc: ['mole'] }),
    'Ninguém lembra de tê-la visto entrar. Ela sempre já estava lá.', 'Você fala alto demais quando pensa.'),
  bruno: student('Bruno Leal', 'c', 640, 'O Devedor', look('s3', '#5a3a26', '#4a6a8a', 'curly'),
    'Assinou um contrato com Dário no primeiro mês. Ainda está pagando.', 'Não posso falar com você. Cláusula sete.'),
  camila: student('Camila Drummond', 'c', 610, 'A Dissidente', look('s4', '#a04a2a', '#3fb884', 'wavy', { fem: true }),
    'A única da Turma C que não assinou o contrato. Senta sozinha, por escolha.', 'Eu não devo nada a ninguém. Recomendo.'),

  vitoria: student('Vitória Brandão', 'c', 880, 'A Lutadora', look('s3', '#2a2030', '#e04a5a', 'short', { fem: true, acc: ['bandage'] }),
    'Faixa preta e zero paciência. Odeia o Dário, odeia o contrato e odeia ainda mais perder para quem não treina.', 'Fala de novo. Mais perto.'),
  hiro: student('Hiro Matsuda', 'c', 840, 'O Estrategista Oculto', look('s2', '#151520', '#7a9ad0', 'bangs', { glasses: true }),
    'Escreve os planos que o Dário assina. Prefere que ninguém saiba disso, principalmente o Dário.', 'Planos bons não têm autor.'),
  raquel: student('Raquel Lobo', 'c', 820, 'A Leitora', look('s1', '#c0c4d8', '#7a8ac0', 'long', { fem: true, hairLight: true }),
    'Lê na biblioteca todos os intervalos, toma chá na garrafa térmica e é a única pessoa com quem o Dário não grita.', 'Você também gosta de romance policial? Que bom. Senta.'),
  leandro: student('Leandro Sampaio', 'c', 700, 'O Barulhento', look('s4', '#e8d24a', '#4a5a3a', 'spiky', { acc: ['bandage'] }),
    'Grita primeiro, pensa depois e não pede desculpa nunca. Morre de medo do Igor.', 'Tá olhando o quê, Turma D?!'),
  marcela: student('Marcela Nóbrega', 'c', 650, 'A Arrependida', look('s2', '#6a3a2a', '#3f8a6a', 'wavy', { fem: true }),
    'Assinou o contrato do Dário achando que era uma lista de presença.', 'Ninguém lê as letras miúdas. Eu também não li.'),
  fabio: student('Fábio Correia', 'c', 590, 'O Rato da Galeria', look('s5', '#1a120e', '#6a5a3a', 'curly'),
    'Conhece todas as promoções e todos os pontos cegos das câmeras da Galeria. Jura que só usa o primeiro conhecimento.', 'A câmera 14 pisca a cada vinte segundos. Curiosidade minha.'),
  nanda: student('Fernanda Kuroiwa', 'c', 560, 'A Hacker', look('s1', '#3a1a5a', '#4ae0c0', 'bob', { fem: true, acc: ['headphones'] }),
    'Encontrou três falhas no sistema de pontos e reportou duas.', 'A terceira eu guardo para uma ocasião especial.', { name: 'Nanda' }),
  tobias: student('Tobias Reis', 'c', 530, 'O Ex-líder', look('s3', '#5a4a3a', '#5a6a8a', 'side'),
    'Era o líder da Turma C até a primeira semana. Perdeu o cargo, o dinheiro e o lugar na mesa do refeitório para o Dário.', 'Eu tinha um plano. Ele tinha punhos.'),

  // --- Turma D ---
  caio: student('Caio Montenegro', 'd', 600, 'O Velocista', look('#dba77f', '#a82d1c', '#ffb13d', 'spiky'),
    'A melhor nota da Turma D — o que, segundo ele, é como ser o mais alto do jardim de infância. Programa rápido e erra rápido.',
    'Cronômetro não mente.', { color: '#ff7350', tie: '#ff7350', growth: 6 }),
  ayumi: student('Ayumi Ribeiro', 'd', 520, 'A Representante', look('s2', '#1b1b26', '#7f9ad8', 'ponytail', { fem: true, glasses: true }),
    'Representante da Turma D, eleita por falta de concorrência. Tem um plano para cada crise e nenhuma paciência para atrasos.',
    'Plano B. Sempre existe um plano B.', { growth: 16 }),
  samuel: student('Samuel Okoye', 'd', 500, 'O Mediano', look('s6', '#15151c', '#d08a3a', 'short'),
    'Tira exatamente a média em tudo. Sempre. Ninguém acerta a média exata por acaso tantas vezes.',
    'A média é um lugar tranquilo. Ninguém olha para a média.', { growth: 0 }),
  lara: student('Lara Benedetti', 'd', 380, 'A Popular', look('s3', '#e0b055', '#4aa8e0', 'wavy', { fem: true, acc: ['earring'] }),
    'Gastou os cem mil pontos do primeiro mês em onze dias. Conhece todo mundo no campus.',
    'Ponto parado é ponto triste.', { growth: 12 }),
  jonas: student('Jonas Petrov', 'd', 330, 'O Atleta', look('s4', '#5a3a26', '#5a8a5a', 'fade', { acc: ['bandage'] }),
    'Bolsista do atletismo. Corre os cem metros em onze segundos e procura ponto e vírgula num código Python por onze minutos.',
    'Se eu treinar isso todo dia, uma hora sai.', { growth: 10 }),
  bia: student('Beatriz Lacerda', 'd', 290, 'A Informante', look('s2', '#d2552b', '#3f9a7a', 'bangs', { fem: true, acc: ['freckles'] }),
    'A Bia sabe de tudo antes do telão. Troca informação por lanche.',
    'Fiquei sabendo de uma coisa. Quanto vale um pastel?', { name: 'Bia', growth: 12 }),
  davi: student('Davi Moreira', 'd', 240, 'O Palhaço', look('s3', '#4a2f22', '#6a4a2a', 'curly'),
    'Comprou um console com o primeiro depósito. Faz a turma rir no pior momento possível.',
    'Zero ponto é só um ponto de vista.', { growth: 10 }),
  nina: student('Nina Sakamoto', 'd', 210, 'A Desenhista', look('s1', '#2a3a6a', '#c07ae0', 'hime', { fem: true, acc: ['hairpin'] }),
    'Trava em prova e desenha nas margens. Os fluxogramas dela são os mais bonitos da escola.',
    'Se eu desenhar o problema, ele fica menor.', { growth: 16 }),
  icaro: student('Ícaro Fontes', 'd', 160, 'O Sonâmbulo', look('s2', '#7a8aa8', '#5ad0c0', 'bangs', { acc: ['headphones'] }),
    'Vira a noite em partidas ranqueadas e dorme na primeira aula. Reflexos absurdos, frequência péssima.',
    'Me acorda quando for prova.', { growth: 14 }),

  kiara: student('Kiara Santos', 'd', 560, 'A Simpática', look('s2', '#b8704a', '#7ab0e0', 'bob', { fem: true, acc: ['hairpin'] }),
    'Sabe o aniversário dos cento e sessenta alunos do ano e quer ser amiga de todos. Quase todos. Ninguém pergunta sobre a escola de onde ela veio.',
    'Pode contar comigo! Sério, para qualquer coisa.', { color: '#ffa8c8', tie: '#ffa8c8', growth: 12 }),
  lucas: student('Lucas Tavares', 'd', 540, 'O Pacificador', look('s2', '#c9a36a', '#4aa8e0', 'side'),
    'O mais popular da Turma D: capitão do futebol, mediador de brigas, o primeiro a defender quem está sozinho. Às vezes parece ter medo de que alguém fique de fora.',
    'Ninguém aqui vai ficar para trás. Eu prometo.', { growth: 12 }),
  italo: student('Ítalo Kawamura', 'd', 470, 'O Exigente', look('s2', '#20202c', '#4a7ac0', 'side', { glasses: true }),
    'Segunda maior nota da turma na diagnóstica, e não perdoa quem tirou menos. Dá reforço como quem dá bronca.', 'Não é difícil. Você é que não leu.', { growth: 14 }),
  valentim: student('Valentim Castelo Branco', 'd', 450, 'O Excêntrico', look('s2', '#efd27a', '#4a6ad0', 'slick', { hairLight: true }),
    'Herdeiro de um império de tecnologia. Faz flexões no meio da aula e só resolve um exercício quando acha a questão bonita o bastante. Não liga para Pontos de Classe, nem para você.',
    'Perfeição não compete. Perfeição se observa.', { color: '#ffe08a', tie: '#ffe08a', growth: 4 }),
  giovana: student('Giovana Paes', 'd', 380, 'A Discreta', look('s3', '#7a4a2a', '#c07a3a', 'wavy', { fem: true }),
    'Tira notas medianas de propósito para ninguém pedir favor. Samuel percebeu. Ela percebeu que ele percebeu.', 'Chamar atenção custa caro aqui.', { growth: 14 }),
  bernardo: student('Bernardo Sato', 'd', 310, 'O Professor', look('s2', '#2a2a3a', '#6a6a8a', 'curly', { glasses: true }),
    'Fala como personagem de anime, sabe tudo de mangá e explica laços com referências que ninguém entende.', 'Isso é claramente um arco de treinamento.', { growth: 10 }),
  maya: student('Maya Hoshino', 'd', 270, 'A Invisível', look('s1', '#5a3a6a', '#9a7ad0', 'long', { fem: true, glasses: true }),
    'Fala baixinho, anda de capuz e guarda um segredo: fora da ilha, é uma streamer famosa com outro nome e outro cabelo.', 'E-eu? Não, não foi comigo que você falou…', { growth: 14 }),
  analiu: student('Ana Liu', 'd', 250, 'A Tímida', look('s1', '#141418', '#5a4a3a', 'ponytail', { fem: true }),
    'Faz o melhor bolinho do dormitório e escreve o nome do Lucas na margem do caderno. Apaga em seguida.', 'E-eu trouxe bolinho. Para todo mundo! Não só para… todo mundo.', { name: 'Ana', growth: 12 }),
  yago: student('Yago Moura', 'd', 200, 'O Mentiroso', look('s3', '#4a2f22', '#6a8a4a', 'messy'),
    'Inventa uma história por dia: já foi campeão de xadrez, ator mirim e primo de um ministro. O Davi acredita em todas.', 'Eu já resolvi esse exercício. Ontem. Num papel que eu perdi.', { growth: 8 }),
};

// Aparências disponíveis para a foto do ID estudantil de quem joga.
export const PLAYER_LOOKS = [
  look('s2', '#20202c', '#6f86e0', 'bangs'),
  look('s4', '#2a1a16', '#d08a3a', 'short'),
  look('s1', '#6b4530', '#3fb884', 'ponytail', { fem: true }),
  look('s5', '#17171f', '#c97a3a', 'curly', { fem: true }),
  look('s3', '#b3261e', '#e0a13a', 'messy'),
  look('s2', '#5b3a8c', '#ff7ab8', 'bob', { fem: true }),
];
let playerLook = 0;
export const setPlayerLook = (index) => { playerLook = Math.max(0, Math.min(PLAYER_LOOKS.length - 1, Number(index) || 0)); };

// Valores derivados (sombra da pele, tons de cabelo, cores do uniforme).
function finish(c) {
  if (!c.skin) return c;
  c.shade ??= mix(c.skin, '#7a2f45', 0.26);
  c.hairHi ??= lighten(c.hair, c.hairLight ? 0.6 : 0.38);
  c.hairLo ??= darken(c.hair, c.hairLight ? 0.22 : 0.34);
  c.color ??= CLASS_COLORS[c.home] || '#f5f2ea';
  c.tie ??= c.color;
  if (c.outfit === 'blazer') {
    // Uniforme da Academia: blazer vermelho com debrum branco; a cor da turma fica na gravata e no brasão.
    c.trim ??= '#f1ece0';
    c.cloth ??= '#5a0e1e';
    c.cloth2 ??= '#8e1b31';
  }
  c.trim ??= CLASS_COLORS[c.home] || '#d4af6a';
  c.cloth ??= '#16161f';
  c.cloth2 ??= '#272735';
  return c;
}
Object.values(CAST).forEach(finish);
PLAYER_LOOKS.forEach((item) => finish(Object.assign(item, { home: 'd', outfit: 'blazer', full: 'Você', name: 'Você' })));

export const STUDENT_IDS = Object.keys(CAST).filter((id) => 'abcd'.includes(CAST[id].home) && CAST[id].skin);
export const studentsOf = (home) => STUDENT_IDS.filter((id) => CAST[id].home === home);

// ---------- desenho ----------
const INK = '#17131f';
let uid = 0;
const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" ${extra}/>`;
const L = (d, stroke, width = 5, opacity = 0.6) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
const SHINE = 'M138 166l16-12 10 9 15-13 12 11 14-13 12 11 15-11 12 9 14-8';

// Cabelos: [atrás da cabeça, na frente do rosto, na frente do corpo]
const HAIR = {
  bun: (c) => [
    `<circle cx="204" cy="108" r="40" fill="${c.hair}" stroke="${INK}" stroke-width="3"/>${L('M180 94q24-14 50 0', c.hairHi, 5, 0.55)}${P('M106 232C92 112 308 108 294 232L288 268 112 268Z', c.hairLo)}`,
    `${P('M108 236C98 116 302 116 292 236 290 206 282 190 268 178 236 206 176 206 140 168 132 186 118 206 108 236Z', c.hair)}
     ${P('M108 236C104 196 112 172 128 160 122 190 122 214 126 246Z', c.hair)}${P('M292 236C296 196 288 172 272 160 278 190 278 214 274 246Z', c.hair)}
     ${L('M150 148Q204 126 256 150', c.hairHi, 6, 0.5)}`,
    '',
  ],
  spiky: (c) => [
    P('M106 240C92 120 308 120 294 240L290 262 110 262Z', c.hairLo),
    `${P('M108 238 90 178 118 190 104 132 144 164 142 98 180 146 204 86 224 146 262 100 258 164 298 134 284 190 312 180 292 238C288 208 278 190 264 182L256 216 236 184 224 218 204 182 190 220 172 184 160 216 146 186C128 192 114 210 108 238Z', c.hair)}
     ${L('M150 150 176 172M204 110 204 160M252 150 232 172', c.hairHi, 5, 0.55)}`,
    '',
  ],
  bob: (c) => [
    P('M98 226C90 104 310 104 302 226L308 336C286 352 262 346 262 322L138 322C138 346 114 352 92 336Z', c.hairLo),
    `${P('M106 238C96 116 304 116 294 238 292 212 286 196 276 188L270 228 250 192 244 232 222 194 212 234 196 194 184 234 166 194 154 232 140 192 130 228 124 188C114 196 108 212 106 238Z', c.hair)}
     ${P('M106 226C96 270 98 306 104 338L128 334C120 300 120 262 126 222Z', c.hair)}${P('M294 226C304 270 302 306 296 338L272 334C280 300 280 262 274 222Z', c.hair)}
     ${L(SHINE, c.hairHi, 4, 0.6)}`,
    '',
  ],
  side: (c) => [
    P('M106 240C92 116 308 116 294 240L290 258 110 258Z', c.hairLo),
    `${P('M108 240C96 112 304 108 292 238 290 210 284 194 272 182 238 204 184 196 150 160 134 178 120 204 116 244Z', c.hair)}
     ${P('M292 236C296 204 290 182 276 170L270 190C278 204 280 222 278 246Z', c.hair)}
     ${L('M156 152Q206 122 262 152', c.hairHi, 6, 0.6)}`,
    '',
  ],
  wavy: (c) => [
    P('M96 224C86 96 314 96 304 224 316 300 338 372 322 452 304 486 276 462 282 428L278 330 122 330 118 428C124 462 96 486 78 452 62 372 84 300 96 224Z', c.hairLo),
    `${P('M106 240C94 114 306 114 294 240 292 214 288 198 278 186 252 220 198 220 168 178 168 208 146 232 120 242Z', c.hair)}
     ${L('M152 148Q206 124 258 152', c.hairHi, 7, 0.5)}`,
    `${P('M108 226C90 300 112 372 92 448 108 474 138 462 136 430 144 366 122 302 130 228Z', c.hair)}
     ${P('M292 226C310 300 288 372 308 448 292 474 262 462 264 430 256 366 278 302 270 228Z', c.hair)}
     ${L('M112 300Q104 360 110 420M288 300Q296 360 290 420', c.hairHi, 4, 0.45)}`,
  ],
  messy: (c) => [
    P('M100 236C88 108 312 108 300 236L304 300C290 312 272 306 270 290L130 290C128 306 110 312 96 300Z', c.hairLo),
    `${P('M104 244 98 196 110 204 104 150 132 176 138 116 170 156 198 102 222 154 256 114 262 172 292 146 290 200 304 194 296 246C292 214 284 198 272 190L266 232 248 196 240 250 222 198 206 268 190 198 178 240 162 196 150 236 138 196C122 202 108 218 104 244Z', c.hair)}
     ${L('M150 154 170 178M200 122 204 168M250 154 234 178', c.hairHi, 5, 0.6)}`,
    '',
  ],
  long: (c) => [
    P('M98 226C88 100 312 100 302 226L318 600 82 600Z', c.hairLo),
    `${P('M106 240C94 114 306 114 294 240 292 212 286 194 274 184L266 226 248 190 236 226 216 186 200 232 186 188 166 228 152 190 136 226 128 186C116 196 108 214 106 240Z', c.hair)}
     ${L(SHINE, c.hairHi, 4, 0.55)}`,
    `${P('M108 228C96 320 104 420 92 540L128 548C136 430 122 320 130 230Z', c.hair)}${P('M292 228C304 320 296 420 308 540L272 548C264 430 278 320 270 230Z', c.hair)}
     ${L('M112 300Q108 400 110 500M288 300Q292 400 290 500', c.hairHi, 4, 0.4)}`,
  ],
  ponytail: (c) => [
    `${P('M272 150C334 144 362 214 344 286 332 340 352 392 322 446 300 420 306 356 298 304 292 256 292 214 268 188Z', c.hairLo)}
     ${L('M318 200Q334 270 322 330M326 350Q334 390 322 420', c.hairHi, 4, 0.45)}${P('M106 236C92 112 308 108 294 236L288 262 112 262Z', c.hairLo)}`,
    `${P('M108 238C98 114 302 112 292 236 288 206 280 190 266 180 240 208 190 204 156 172 146 198 126 216 112 244Z', c.hair)}
     ${P('M108 232C102 262 106 292 114 318L126 300C120 276 120 252 124 226Z', c.hair)}${P('M292 232C298 262 294 292 286 318L274 300C280 276 280 252 276 226Z', c.hair)}
     <rect x="270" y="160" width="20" height="26" rx="6" transform="rotate(28 280 173)" fill="${c.tie}" stroke="${INK}" stroke-width="2.5"/>
     ${L('M150 150Q204 124 258 150', c.hairHi, 6, 0.5)}`,
    '',
  ],
  twintails: (c) => [
    `${P('M116 186C58 196 40 280 60 362 70 412 52 452 76 484 102 452 98 402 102 352 106 292 112 250 128 216Z', c.hairLo)}
     ${P('M284 186C342 196 360 280 340 362 330 412 348 452 324 484 298 452 302 402 298 352 294 292 288 250 272 216Z', c.hairLo)}
     ${L('M78 280Q70 350 80 420M322 280Q330 350 320 420', c.hairHi, 4, 0.45)}${P('M104 232C92 110 308 110 296 232L290 258 110 258Z', c.hairLo)}`,
    `${P('M106 238C96 116 304 116 294 238 292 212 286 196 276 188L270 226 250 192 244 230 222 194 212 232 196 194 184 232 166 194 154 230 140 192 130 226 124 188C114 196 108 212 106 238Z', c.hair)}
     <circle cx="114" cy="192" r="11" fill="${c.tie}" stroke="${INK}" stroke-width="2.5"/><circle cx="286" cy="192" r="11" fill="${c.tie}" stroke="${INK}" stroke-width="2.5"/>
     ${L(SHINE, c.hairHi, 4, 0.6)}`,
    '',
  ],
  short: (c) => [
    P('M108 236C96 98 304 98 292 236L288 254 112 254Z', c.hairLo),
    `${P('M110 232C100 94 300 94 290 232 286 206 276 188 262 180L250 198 236 178 220 198 204 176 188 198 172 178 158 198 146 182C128 190 114 208 110 232Z', c.hair)}
     ${L('M150 160Q204 134 254 160', c.hairHi, 6, 0.5)}`,
    '',
  ],
  curly: (c) => [
    P('M98 256C68 236 62 184 90 152 92 108 140 80 178 94 204 72 254 78 272 104 310 104 340 142 326 184 344 214 334 254 304 262Z', c.hairLo),
    `${P('M112 228C102 180 118 142 158 132 180 110 232 112 250 134 286 140 300 186 290 230 282 214 274 204 264 200 258 214 244 216 236 206 228 220 210 218 204 206 194 220 176 216 172 204 160 216 146 210 142 198 128 204 116 214 112 228Z', c.hair)}
     ${L('M140 160q10-12 22-4M180 138q12-12 26-2M228 142q14-8 24 4M262 170q10-4 14 8', c.hairHi, 5, 0.55)}`,
    '',
  ],
  hime: (c) => [
    P('M98 226C88 100 312 100 302 226L318 600 82 600Z', c.hairLo),
    `${P('M106 238C96 114 304 114 294 238L290 214 274 218 270 208 130 208 126 218 110 214Z', c.hair)}
     ${P('M106 226C100 262 102 292 106 316H130C126 284 126 254 130 222Z', c.hair)}${P('M294 226C300 262 298 292 294 316H270C274 284 274 254 270 222Z', c.hair)}
     ${L(SHINE, c.hairHi, 4, 0.6)}`,
    `${P('M108 300C98 380 104 460 94 548L126 552C134 460 122 380 128 300Z', c.hair)}${P('M292 300C302 380 296 460 306 548L274 552C266 460 278 380 272 300Z', c.hair)}`,
  ],
  slick: (c) => [
    P('M108 240C94 86 306 86 292 240L288 258 112 258Z', c.hairLo),
    `${P('M112 222C98 80 302 80 288 222 284 198 274 182 258 174 236 158 204 170 190 160 172 150 150 164 142 174 126 182 116 198 112 222Z', c.hair)}
     ${L('M146 158Q166 126 200 118M196 152Q214 126 244 124M244 160Q258 140 274 142', c.hairHi, 4, 0.55)}`,
    '',
  ],
  braid: (c) => [
    P('M104 234C92 110 308 110 296 234L290 262 110 262Z', c.hairLo),
    `${P('M106 240C94 114 306 114 294 240 292 214 288 198 278 186 252 220 198 220 168 178 168 208 146 232 120 242Z', c.hair)}
     ${L('M152 148Q206 124 258 152', c.hairHi, 7, 0.5)}`,
    `${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${292 + (i % 2 ? 6 : -4)}" cy="${262 + i * 34}" rx="20" ry="22" transform="rotate(${i % 2 ? 24 : -24} ${292} ${262 + i * 34})" fill="${c.hair}" stroke="${INK}" stroke-width="3"/>`).join('')}
     <path d="M282 462l-10 38 22-12 16 16-6-42Z" fill="${c.hair}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
     <rect x="276" y="452" width="34" height="12" rx="5" fill="${c.tie}" stroke="${INK}" stroke-width="2.5"/>`,
  ],
  fade: (c) => [
    P('M110 238C96 96 304 96 290 238L286 252 114 252Z', c.hairLo),
    `${P('M114 212C98 74 302 70 288 202 278 178 252 166 224 174 198 152 152 164 134 190 126 198 118 206 114 212Z', c.hair)}
     ${L('M146 150Q196 116 256 134', c.hairHi, 6, 0.5)}`,
    '',
  ],
  bangs: (c) => [
    P('M100 232C90 108 310 108 300 232L306 312C292 328 274 322 272 304L128 304C126 322 108 328 94 312Z', c.hairLo),
    `${P('M106 242C96 114 304 112 294 240 292 220 286 204 274 192L262 236 246 200 234 244 214 202 196 246 180 204 166 240 150 200 136 232 126 196C114 206 108 222 106 242Z', c.hair)}
     ${P('M106 230C100 262 102 286 108 306L128 300C122 276 122 252 126 226Z', c.hair)}${P('M294 230C300 262 298 286 292 306L272 300C278 276 278 252 274 226Z', c.hair)}
     ${L(SHINE, c.hairHi, 4, 0.55)}`,
    '',
  ],
};

// Grandes planos de luz e poucas mechas: continuam legíveis nos avatares pequenos.
// O recorte usa a própria silhueta do penteado, sem cobrir olhos ou acessórios.
function hairDetail(c, key) {
  let strands;
  if (c.style === 'curly') {
    strands = 'M124 183q-2-23 20-25M157 145q20-20 38-9M211 132q22-8 34 10M258 158q25 8 22 31';
  } else if (c.style === 'spiky' || c.style === 'messy') {
    strands = 'M144 150q17 33 20 57M196 123q-4 34 7 76M248 149q-18 28-14 57M275 181l-10 32';
  } else if (['bob', 'long', 'twintails', 'hime', 'bangs'].includes(c.style)) {
    strands = 'M149 149q-12 28-12 63M176 140q-8 31-7 59M203 137q-5 35 3 65M230 142q9 28 9 60M256 151q12 28 13 60';
  } else if (c.style === 'slick' || c.style === 'fade') {
    strands = 'M132 176q31-58 92-62M161 162q37-40 87-40M216 159q31-27 57-17';
  } else {
    strands = 'M141 156q29 45 87 39M172 136q26 40 87 42M211 133q29 22 63 25M126 177q4 24 17 36';
  }
  return `<g clip-path="url(#${key}hairShape)">
    <path d="M92 151Q198 102 310 151L306 171Q194 128 96 177Z" fill="${c.hairHi}" opacity=".35"/>
    <path d="M101 210Q195 170 301 207V258H101Z" fill="${c.hairLo}" opacity=".21"/>
    ${L(strands, c.hairLo, 1.5, 0.48)}
    ${L('M137 153Q161 137 181 137M216 137Q241 140 259 150', lighten(c.hairHi, 0.3), 2.1, 0.5)}
  </g>`;
}

// Expressões: sobrancelhas [interno, externo], pálpebra 0..1, boca.
const EXPR = {
  neutral: { brow: [0, 0], lid: 0, mouth: 'flat' },
  smile: { brow: [-2, 0], lid: 0, mouth: 'smile' },
  smirk: { brow: [-1, -5], lid: 0.2, mouth: 'smirk' },
  angry: { brow: [10, -6], lid: 0.14, mouth: 'frown' },
  cold: { brow: [4, 0], lid: 0.36, mouth: 'flat' },
  surprised: { brow: [-9, -7], lid: 0, wide: true, mouth: 'open' },
  happy: { brow: [-3, -1], closed: true, mouth: 'grin' },
  flustered: { brow: [5, -3], lid: 0, mouth: 'wavy', blush: true },
  think: { brow: [-4, 3], lid: 0.24, mouth: 'side' },
};

const LIP = '#8a3b45';
const MOUTH = {
  flat: `<path d="M187 298Q200 301 213 298" fill="none" stroke="${LIP}" stroke-width="3" stroke-linecap="round"/>`,
  smile: `<path d="M183 294Q200 309 217 294" fill="none" stroke="${LIP}" stroke-width="3" stroke-linecap="round"/>`,
  smirk: `<path d="M185 298Q204 305 219 290" fill="none" stroke="${LIP}" stroke-width="3" stroke-linecap="round"/>`,
  frown: `<path d="M187 301Q200 292 213 301" fill="none" stroke="${LIP}" stroke-width="3" stroke-linecap="round"/>`,
  open: `<ellipse cx="200" cy="299" rx="8" ry="10" fill="#6d2b34" stroke="${INK}" stroke-width="2"/><ellipse cx="200" cy="304" rx="5" ry="4" fill="#d9707a"/>`,
  grin: `<path d="M181 291Q200 316 219 291Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  wavy: `<path d="M185 298q4-6 8 0t8 0 8 0" fill="none" stroke="${LIP}" stroke-width="3" stroke-linecap="round"/>`,
  side: `<path d="M191 299Q204 297 215 292" fill="none" stroke="${LIP}" stroke-width="3" stroke-linecap="round"/>`,
};

function eye(cx, s, c, e, key) {
  // s: -1 = olho à esquerda de quem vê (canto interno à direita), 1 = à direita.
  const browColor = darken(c.hair, c.hairLight ? 0.5 : 0.3);
  const bi = 211 + e.brow[0];
  const bo = 209 + e.brow[1];
  const brow = `<path d="M${cx - s * 21} ${bi}Q${cx + s * 2} ${(bi + bo) / 2 - 7} ${cx + s * 25} ${bo}" fill="none" stroke="${browColor}" stroke-width="${c.fem ? 3.6 : 5}" stroke-linecap="round"/>`;
  if (e.closed) {
    return `${brow}<path d="M${cx - 21} 244Q${cx} 226 ${cx + 21} 244" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  }
  const h = ((c.fem ? 19 : 15) + (e.wide ? 5 : 0)) * (1 - (e.lid || 0) * 0.9);
  const b = (c.fem ? 11 : 9) + (e.wide ? 2 : 0);
  const ix = cx - s * 21;
  const ox = cx + s * 24;
  const upper = `M${ix} 245Q${cx + s * 2} ${240 - h * 1.5} ${ox} 238`;
  const shape = `${upper}Q${cx + s * 4} ${240 + b * 1.6} ${ix} 245Z`;
  const ir = e.wide ? 9.5 : 11.5;
  return `${brow}
  <clipPath id="${key}e${s}"><path d="${shape}"/></clipPath>
  <path d="${shape}" fill="#fbfaff"/>
  <g clip-path="url(#${key}e${s})">
    <ellipse cx="${cx + s}" cy="240" rx="${ir}" ry="${ir + 2.5}" fill="url(#${key}iris)" stroke="${darken(c.eye, 0.48)}" stroke-width="1.2"/>
    <path d="M${cx - 7} 246Q${cx} 254 ${cx + 8} 245" fill="none" stroke="${lighten(c.eye, 0.7)}" stroke-width="2" opacity=".8"/>
    <ellipse cx="${cx + s}" cy="241" rx="${ir * 0.45}" ry="${ir * 0.62}" fill="#120e1a"/>
    <path d="${upper}" fill="none" stroke="#1a1424" stroke-width="11" opacity=".25"/>
    <circle cx="${cx - 4}" cy="234" r="3.8" fill="#fff"/><circle cx="${cx + 5}" cy="246" r="1.9" fill="#fff" opacity=".85"/>
  </g>
  <path d="M${ix + s * 3} 231Q${cx} ${233 - h * 1.25} ${ox - s * 3} 226" fill="none" stroke="${c.shade}" stroke-width="1.5" stroke-linecap="round" opacity=".65"/>
  <path d="${upper}l${s * 7}-5" fill="none" stroke="${INK}" stroke-width="${c.fem ? 5.5 : 4.6}" stroke-linecap="round" stroke-linejoin="round"/>
  ${c.fem ? `<path d="M${ox - s * 4} 234l${s * 8}-9M${ox - s * 10} 231l${s * 5}-8" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` : ''}
  <path d="M${ox - s * 2} 240Q${cx + s * 10} ${241 + b * 0.9} ${cx} ${240 + b * 0.82}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>`;
}

function outfit(c, key) {
  const trim = c.trim;
  const torso = 'M38 600C42 498 70 452 128 432L170 412 230 412 272 432C330 452 358 498 362 600Z';
  const collar = `<path d="M170 412 200 478 230 412 222 394 178 394Z" fill="#eef0f8" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M178 394 158 420 190 448 200 420Z M222 394 242 420 210 448 200 420Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  if (c.outfit === 'labcoat') {
    return `${P(torso, `url(#${key}cloth)`)}
      <path d="M170 412 200 474 230 412 222 394 178 394Z" fill="#2a2f45" stroke="${INK}" stroke-width="2.5"/>
      <path d="M178 394 158 420 190 448 200 420Z M222 394 242 420 210 448 200 420Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M192 430H208L213 448 200 540 187 448Z" fill="${c.tie}" stroke="${INK}" stroke-width="2"/><path d="M192 430H208L205 444H195Z" fill="${darken(c.tie, 0.25)}"/>
      <path d="M166 412 126 436 150 600H200V474Z M234 412 274 436 250 600H200V474Z" fill="#fbfaf7" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M166 412 138 446 164 476 152 498 200 590M234 412 262 446 236 476 248 498 200 590" fill="none" stroke="#bdbab2" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="258" y="520" width="44" height="6" rx="2" fill="#c9c6bd"/><rect x="266" y="508" width="5" height="18" rx="2" fill="#4e6bd6"/><rect x="276" y="508" width="5" height="18" rx="2" fill="#d6564e"/>`;
  }
  if (c.outfit === 'council') {
    return `${P(torso, '#f4f1ea')}${collar}
      <path d="M192 430H208L214 450 200 548 186 450Z" fill="${c.tie}" stroke="${INK}" stroke-width="2"/><path d="M192 430H208L205 445H195Z" fill="${darken(c.tie, 0.3)}"/>
      <path d="M166 412 132 440 160 474 148 496 200 600H120L96 448Z M234 412 268 440 240 474 252 496 200 600H280L304 448Z" fill="#e2ddd0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M96 452Q150 520 122 600M304 452Q250 520 278 600" fill="none" stroke="#d4af6a" stroke-width="5"/>
      <path d="M62 500l44-24 10 30-46 22Z" fill="#e8173f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M76 506l22-12" stroke="#fff" stroke-width="3"/>
      <circle cx="282" cy="520" r="15" fill="#d4af6a" stroke="${INK}" stroke-width="3"/><path d="M282 510l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z" fill="#fff"/>`;
  }
  const suit = c.outfit === 'suit';
  const neckwear = suit
    ? `<circle cx="200" cy="436" r="9" fill="${c.tie}" stroke="${INK}" stroke-width="2.5"/><path d="M200 446V478" stroke="#c9cbdc" stroke-width="2"/>`
    : c.fem
      ? `<path d="M200 436l-28-15v30ZM200 436l28-15v30Z" fill="${c.tie}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M194 444l-9 34 15-10 15 10-9-34Z" fill="${darken(c.tie, 0.2)}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="200" cy="436" r="7" fill="${c.tie}" stroke="${INK}" stroke-width="2.5"/>`
      : `<path d="M192 430H208L214 450 200 548 186 450Z" fill="${c.tie}" stroke="${INK}" stroke-width="2"/><path d="M192 430H208L205 445H195Z" fill="${darken(c.tie, 0.3)}"/><path d="M194 470 206 462M193 496 207 488M194 522 205 514" stroke="${darken(c.tie, 0.3)}" stroke-width="3" opacity=".7"/>`;
  return `${P(torso, `url(#${key}cloth)`)}${collar}${neckwear}
    <path d="M166 412 132 440 160 474 148 496 200 600H120L96 448Z M234 412 268 440 240 474 252 496 200 600H280L304 448Z" fill="${c.cloth2}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M166 412 132 440 160 474 148 496 200 600M234 412 268 440 240 474 252 496 200 600" fill="none" stroke="${trim}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M262 506l18-7 18 7v16c0 12-9 20-18 24-9-4-18-12-18-24Z" fill="#0d0d14" stroke="${c.color}" stroke-width="2.5"/>
    <path d="M273 512h9a5 5 0 0 1 0 10h-5v8" fill="none" stroke="${c.color}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M200 478V600" stroke="${darken(c.cloth, 0.4)}" stroke-width="3" opacity=".6"/><circle cx="200" cy="560" r="5" fill="#d8c48a" stroke="${INK}" stroke-width="1.5"/>
    <path d="M58 524Q68 470 110 446M342 524Q332 470 290 446" fill="none" stroke="#000" stroke-width="4" opacity=".28"/>
    <path d="M44 560Q52 500 84 470" fill="none" stroke="#fff" stroke-width="3" opacity=".08"/>`;
}

function accessories(c) {
  const has = (name) => c.acc?.includes(name);
  const face = `${has('mole') ? '<circle cx="262" cy="264" r="2.4" fill="#3a2530"/>' : ''}
    ${has('freckles') ? '<g fill="#a85a3a" opacity=".55"><circle cx="150" cy="268" r="2"/><circle cx="160" cy="274" r="2"/><circle cx="170" cy="267" r="2"/><circle cx="230" cy="267" r="2"/><circle cx="240" cy="274" r="2"/><circle cx="250" cy="268" r="2"/></g>' : ''}
    ${has('bandage') ? `<g transform="rotate(-10 236 276)"><rect x="218" y="269" width="38" height="14" rx="6" fill="#f3e2c4" stroke="${INK}" stroke-width="2"/><rect x="231" y="270" width="12" height="12" fill="#e4cda6"/></g>` : ''}
    ${has('scar') ? `<path d="M226 196l22 30M232 208l10-6M238 218l10-6" fill="none" stroke="#8a2030" stroke-width="2.6" stroke-linecap="round"/>` : ''}
    ${has('earring') ? '<circle cx="119" cy="268" r="5.5" fill="none" stroke="#ffc93c" stroke-width="3"/><circle cx="281" cy="268" r="5.5" fill="none" stroke="#ffc93c" stroke-width="3"/>' : ''}`;
  const top = (has('hairpin') ? `<g transform="rotate(-28 142 192)"><rect x="126" y="187" width="32" height="9" rx="4" fill="${c.tie}" stroke="${INK}" stroke-width="2.5"/></g>` : '')
    + (has('bow') ? `<g transform="translate(288 150) rotate(16)"><path d="M0 0-34-20-30 18Z" fill="#fbfbff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M0 0 34-20 30 18Z" fill="#fbfbff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-26-10-8-2M26-10 8-2" stroke="#d8d8e4" stroke-width="3"/><circle r="8" fill="#eeeef6" stroke="${INK}" stroke-width="3"/></g>` : '');
  const neck = has('headphones')
    ? `<path d="M152 372Q200 420 248 372" fill="none" stroke="#2a2a36" stroke-width="12" stroke-linecap="round"/><rect x="136" y="342" width="26" height="42" rx="10" fill="${c.trim}" stroke="${INK}" stroke-width="3"/><rect x="238" y="342" width="26" height="42" rx="10" fill="${c.trim}" stroke="${INK}" stroke-width="3"/>`
    : '';
  return { face, top, neck };
}

function tailoring(c) {
  const pale = c.outfit === 'labcoat' || c.outfit === 'council';
  const seam = pale ? '#9698a4' : darken(c.cloth, 0.36);
  return `<path d="M43 600Q48 510 86 466L108 478Q78 533 80 600ZM357 600Q352 510 314 466L292 478Q322 533 320 600Z" fill="${seam}" opacity="${pale ? '.12' : '.28'}"/>
    <path d="M76 486Q91 462 118 452M324 486Q309 462 282 452" fill="none" stroke="${pale ? '#fff' : lighten(c.cloth, 0.4)}" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>
    <path d="M90 543l18-19M310 543l-18-19M130 578l26-15M270 578l-26-15" fill="none" stroke="${seam}" stroke-width="2" stroke-linecap="round" opacity=".4"/>
    ${c.outfit === 'blazer' || c.outfit === 'suit' ? `<path d="M104 517l37 7-2 9-37-7Z" fill="${c.cloth2}" stroke="${seam}" stroke-width="1.5"/><path d="M105 517l34 6" stroke="${c.trim}" stroke-width="1.5" opacity=".7"/>` : ''}`;
}

function draw(c, expression, label) {
  const e = EXPR[expression] || EXPR.neutral;
  const key = `p${++uid}`;
  const [hairBack, hairFront, hairOver] = (HAIR[c.style] || HAIR.short)({ ...c, hair: `url(#${key}hair)` });
  const acc = accessories(c);
  const face = c.fem
    ? 'M121 214C119 138 281 138 279 214C279 252 264 290 234 312Q200 336 166 312C136 290 121 252 121 214Z'
    : 'M121 214C119 138 281 138 279 214C279 256 268 294 238 314Q200 336 162 314C132 294 121 256 121 214Z';
  const glasses = c.glasses
    ? `<g fill="rgba(190,220,255,.14)" stroke="${c.outfit === 'suit' ? '#d4af6a' : INK}" stroke-width="3.5"><rect x="131" y="220" width="60" height="42" rx="12"/><rect x="209" y="220" width="60" height="42" rx="12"/><path d="M191 238Q200 232 209 238M131 236 118 230M269 236 282 230" fill="none"/></g><path d="M140 228l16 0M218 228l16 0" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>`
    : '';
  return `<svg class="portrait" viewBox="0 0 400 556" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" preserveAspectRatio="xMidYMax meet">
  <defs>
    <linearGradient id="${key}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${darken(c.eye, 0.55)}"/><stop offset=".55" stop-color="${c.eye}"/><stop offset="1" stop-color="${lighten(c.eye, 0.6)}"/></linearGradient>
    <linearGradient id="${key}cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.cloth2}"/><stop offset="1" stop-color="${c.cloth}"/></linearGradient>
    <linearGradient id="${key}hair" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="${mix(c.hair, c.hairHi, 0.58)}"/><stop offset=".3" stop-color="${c.hair}"/><stop offset=".7" stop-color="${c.hair}"/><stop offset=".7" stop-color="${mix(c.hair, c.hairLo, 0.5)}"/><stop offset="1" stop-color="${c.hairLo}"/></linearGradient>
    <radialGradient id="${key}skin" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${lighten(c.skin, 0.12)}"/><stop offset=".7" stop-color="${c.skin}"/><stop offset="1" stop-color="${mix(c.skin, c.shade, 0.35)}"/></radialGradient>
    <clipPath id="${key}face"><path d="${face}"/></clipPath>
    <clipPath id="${key}hairShape">${hairFront}</clipPath>
  </defs>
  ${hairBack}
  <g transform="translate(0 -44)">
    <path d="M174 322V402C190 418 210 418 226 402V322Z" fill="${c.skin}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M175 368C190 394 210 394 225 368V324H175Z" fill="${c.shade}"/>
    <path d="M179 379l7 23M222 378l-6 25" fill="none" stroke="${lighten(c.skin, 0.3)}" stroke-width="2" opacity=".55"/>
    ${outfit(c, key)}
    ${tailoring(c)}
  </g>
  ${acc.neck}
  <ellipse cx="120" cy="246" rx="10" ry="17" fill="${c.skin}" stroke="${INK}" stroke-width="2.5"/><ellipse cx="280" cy="246" rx="10" ry="17" fill="${c.skin}" stroke="${INK}" stroke-width="2.5"/>
  <path d="M116 241q7-6 9 6l-5 6M284 241q-7-6-9 6l5 6" fill="none" stroke="${c.shade}" stroke-width="2" stroke-linecap="round"/>
  <path d="${face}" fill="url(#${key}skin)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  <g clip-path="url(#${key}face)">
    <path d="M272 206Q284 262 246 318" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".16"/>
    <path d="M110 150H290V214Q244 196 200 202T110 214Z" fill="${c.shade}" opacity=".6"/>
    <path d="M273 215Q273 258 251 286L233 310 201 324 241 338 291 281 296 210Z" fill="${c.shade}" opacity=".45"/>
    <path d="M127 258Q136 288 161 306L177 315 161 316 123 282Z" fill="${c.shade}" opacity=".22"/>
    <ellipse cx="152" cy="272" rx="18" ry="8" fill="#ff6b7d" opacity="${e.blush ? 0.45 : 0.1}"/><ellipse cx="248" cy="272" rx="18" ry="8" fill="#ff6b7d" opacity="${e.blush ? 0.45 : 0.1}"/>
    ${e.blush ? '<path d="M140 268l8 8M150 266l8 8M240 266l8 8M250 268l8 8" stroke="#ff4d66" stroke-width="2" opacity=".6"/>' : ''}
  </g>
  ${eye(160, -1, c, e, key)}${eye(240, 1, c, e, key)}
  <path d="M201 262l-5 13 7 2" fill="none" stroke="${darken(c.shade, 0.12)}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M204 261l2 8M194 311q7 3 13 0" fill="none" stroke="${lighten(c.skin, 0.5)}" stroke-width="2.1" stroke-linecap="round" opacity=".55"/>
  ${MOUTH[e.mouth]}
  ${acc.face}
  ${glasses}
  ${hairFront}
  ${hairDetail(c, key)}
  ${acc.top}
  ${hairOver}
</svg>`;
}

const resolve = (id) => (id === 'voce' ? PLAYER_LOOKS[playerLook] : CAST[id]);
/** Parâmetros de aparência de um personagem (usados também pelos modelos 3D). */
export const lookOf = resolve;

/** Busto de um personagem em uma expressão. */
export function portrait(id, expression = 'neutral') {
  const c = resolve(id);
  if (!c || !c.skin) return '';
  return draw(c, expression, c.full || c.name);
}

/** Busto de uma das aparências disponíveis para quem joga. */
export const lookPortrait = (index) => draw(PLAYER_LOOKS[index], 'neutral', `Aparência ${index + 1}`);

const crop = (svg) => svg.replace('class="portrait" viewBox="0 0 400 556"', 'class="avatar" viewBox="92 104 216 216"').replace('preserveAspectRatio="xMidYMax meet"', 'preserveAspectRatio="xMidYMid slice"');

/** Miniatura (só o rosto) para listas e ranking. */
export function avatar(id, expression = 'neutral') {
  return crop(portrait(id, expression));
}
export const lookAvatar = (index) => crop(lookPortrait(index));
