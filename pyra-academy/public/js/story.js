// Roteiro da visual novel. Cada cena é uma lista de passos interpretada por vn.js.
// {nome} é trocado pelo nome escolhido pela pessoa jogadora.
import { state, save } from './state.js';
import { RIVALS, POINTS } from './content/index.js';

const N = (text) => ({ who: 'narr', text });
const V = (text) => ({ who: 'voce', text });
const say = (who, expr, text, pos) => ({ who, expr, text, pos });

export const prologue = () => [
  { bg: 'black' },
  { title: 'ACADEMIA PYRA', sub: 'Onde o mérito é a única moeda' },
  N('Uma carta sem remetente. Um brasão dourado. Uma única frase:'),
  N('«A Vaga 006 é sua. Apresente-se ao anoitecer.»'),
  { bg: 'gate' },
  N('A Academia Pyra aceita seis estudantes por ano. Cinco deles são prodígios que programam desde antes de aprender a amarrar os sapatos.'),
  N('O sexto é você. E você nunca escreveu uma linha de código na vida.'),
  V('(Só pode ter sido um engano… mas a carta trazia o meu nome.)'),
  { ask: 'name', prompt: 'Como você assina a lista de presença?' },
  N('O portão se abre sozinho quando você se aproxima. Como se estivesse esperando.'),
  { walk: 'gate', hint: 'Atravesse o portão e caminhe até a entrada' },
  { bg: 'hall' },
  N('O corredor é silencioso demais. Em cada porta, um nome e um número. O número muda enquanto você olha.'),
  say('vesper', 'neutral', '{nome}. Vaga 006. Quatro minutos de antecedência. Ótimo: pontualidade é a única coisa que não ensinamos aqui.'),
  say('vesper', 'neutral', 'Sou Vésper Albuquerque, orientadora da Sala Ômega. As regras são simples, e eu não costumo repetir.'),
  say('vesper', 'cold', 'Tudo nesta escola é medido em Mérito. Cada aula concluída, cada desafio resolvido, cada prova vencida. O ranking é público e muda em tempo real.'),
  say('vesper', 'cold', 'No fim do período, quem estiver em último lugar é desligado. Sem recurso. Sem segunda chance.'),
  { choice: [
    { text: 'Entendido. Não pretendo ficar em último.', set: { attitude: 'firme' }, then: [say('vesper', 'smirk', 'Todos dizem isso no primeiro dia. Poucos repetem no último.')] },
    { text: 'E se eu nunca programei antes?', set: { attitude: 'honesto' }, merit: 10, then: [say('vesper', 'think', 'Então você é a variável mais interessante da sala. O comitê não erra: ele aposta. …Honestidade registrada. Dez de Mérito.')] },
    { text: 'Quem me indicou para a vaga?', set: { attitude: 'curioso' }, then: [say('vesper', 'cold', 'Essa informação custa um Mérito que você ainda não tem. Conquiste-o.')] },
  ] },
  say('vesper', 'neutral', 'Sua turma já está lá dentro. Um conselho gratuito, o único que vai receber de mim: eles não são seus colegas. São seus rivais.'),
  { walk: 'hall', hint: 'Siga pelo corredor até a porta da Sala Ômega' },
  { bg: 'classroom', clear: true },
  N('A porta desliza. Cinco pares de olhos se voltam para você ao mesmo tempo.'),
  say('caio', 'smirk', 'Então é verdade. Deram a Vaga 006 pra alguém que nunca abriu um terminal. Relaxa, Zero-Seis: alguém precisa segurar o último lugar.', 'left'),
  say('yuki', 'cold', 'Probabilidade de permanência até o fim do período: 4,2%. …Arredondando para cima.', 'right'),
  { clear: true },
  say('bianca', 'smile', 'Não liguem para eles. Eu sou a Bianca. Se precisar de ajuda, é só pedir. Eu adoro fazer… investimentos.', 'left'),
  say('theo', 'think', 'Seis pessoas, uma vaga de sobra. Ineficiente. A estatística já escolheu quem sai.', 'right'),
  { clear: true },
  N('No fundo da sala, alguém nem levanta os olhos do livro.'),
  say('sora', 'cold', '…'),
  say('sora', 'neutral', 'Não é o código que decide quem fica. É quem aprende mais rápido do que os outros esperam.'),
  N('Ninguém responde. Pela primeira vez, aquela sala parece ficar sem palavras.'),
  { clear: true },
  say('vesper', 'neutral', 'Sentem-se. {nome}, sua mesa é a do fundo. O ranking de hoje está no telão.'),
  N(`Sora ${RIVALS.sora} · Bianca ${RIVALS.bianca} · Theo ${RIVALS.theo} · Yuki ${RIVALS.yuki} · Caio ${RIVALS.caio} · {nome} 0.`),
  say('vesper', 'neutral', 'Cada capítulo termina com uma Prova de Mérito contra quem está logo acima de você. Vença, e cem pontos trocam de mãos.'),
  say('vesper', 'think', 'Ah, e no fim do corredor fica o Laboratório 404. Há uma pesquisadora visitante que tolera perguntas. Às vezes.'),
  say('vesper', 'smirk', 'O período começou. Que vença o mérito.'),
  { title: 'CAPÍTULO 1', sub: 'Fundamentos — a primeira linha' },
];

export const kurisuIntro = () => [
  { bg: 'lab', clear: true },
  N('Laboratório 404. Na porta, um aviso: «Não perturbe (sério)». Você bate mesmo assim.'),
  say('kurisu', 'angry', 'Eu escrevi NÃO PERTURBE. Qual parte da frase precisa de revisão por pares?'),
  say('kurisu', 'think', '…Espera. Você é a tal Vaga 006. Quem nunca programou e veio parar no meio daqueles cinco.'),
  say('kurisu', 'neutral', 'Makise Kurisu. Neurociência. Passo um semestre aqui estudando como cérebros aprendem sob pressão, e você é um espécime… conveniente.'),
  say('kurisu', 'flustered', 'N-não é como se eu fosse te ajudar por bondade! É coleta de dados. Só isso.'),
  say('kurisu', 'smirk', 'Então, quando travar, pergunte. De preferência com o erro em mãos. Hipótese, experimento, conclusão: é assim que se aprende qualquer coisa.'),
];

const CHAPTER_INTROS = {
  c2: [
    { bg: 'classroom', clear: true },
    { title: 'CAPÍTULO 2', sub: 'Decisões e acaso — o programa escolhe' },
    say('vesper', 'neutral', 'Até agora seus programas faziam sempre a mesma coisa. A partir de hoje, eles decidem.'),
    say('yuki', 'cold', 'A próxima prova é minha. Eu não erro lógica. Sugiro que você também não.', 'right'),
  ],
  c3: [
    { bg: 'classroom', clear: true },
    { title: 'CAPÍTULO 3', sub: 'Laços — repita sem se repetir' },
    say('vesper', 'neutral', 'Um programador que copia e cola dez linhas ainda está digitando. O próximo capítulo ensina a mandar a máquina repetir.'),
    say('theo', 'smirk', 'Finalmente um assunto digno. Tente não escrever a mesma linha duas vezes na minha frente.', 'right'),
  ],
  c4: [
    { bg: 'classroom', clear: true },
    { title: 'CAPÍTULO 4', sub: 'Coleções — muitos valores, um só nome' },
    say('vesper', 'neutral', 'Inventários, lojas, mapas. Tudo o que você conhece de jogos é feito de listas e dicionários.'),
    say('bianca', 'smile', 'Chegou a minha vez, Zero-Seis. Prometo ser gentil. Com a sua pontuação, não.', 'right'),
  ],
  c5: [
    { bg: 'classroom', clear: true },
    { title: 'CAPÍTULO 5', sub: 'Funções e projeto — o topo' },
    say('vesper', 'neutral', 'Último capítulo. Funções transformam quem usa ferramentas em quem as fabrica.'),
    N('Do fundo da sala, Sora fecha o livro pela primeira vez no período.'),
    say('sora', 'neutral', '…Eu estava esperando você chegar até aqui.'),
  ],
};
export const chapterIntro = (chapter) => CHAPTER_INTROS[chapter.id] || [];

const DUELS = {
  caio: {
    pre: [
      say('caio', 'smirk', 'Olha só quem terminou os fundamentos. Parabéns, Zero-Seis: aprendeu a engatinhar.'),
      say('caio', 'happy', 'Prova de Mérito. Mesmo desafio, mesmo relógio. Eu termino antes de você achar a tecla dos dois-pontos.'),
    ],
    win: [
      say('caio', 'surprised', '…Aprovado? Em todos os testes? Antes de mim?!'),
      say('caio', 'flustered', 'Tsc. Sorte de principiante. …Mas a sua saída estava limpa. Odeio admitir.'),
      say('vesper', 'smirk', 'Mérito transferido. Montenegro: velocidade sem precisão é só barulho.', 'right'),
    ],
    lose: [
      say('caio', 'happy', 'Cronômetro não mente, Zero-Seis!'),
      say('vesper', 'neutral', 'Você entregou depois, mas entregou certo. Mérito de honra registrado. A revanche fica aberta.', 'right'),
    ],
  },
  yuki: {
    pre: [
      say('yuki', 'cold', 'Analisei seus últimos exercícios. Você melhora 11% por aula. Insuficiente para hoje.'),
      say('yuki', 'neutral', 'Seu código será testado com vários casos. Um único ramo errado e a prova é minha.'),
    ],
    win: [
      say('yuki', 'surprised', 'Todos os casos de borda… cobertos.'),
      say('yuki', 'think', 'Recalculando. Probabilidade de permanência: 38%. …Não. 61%. Meu modelo estava errado sobre você.'),
      say('yuki', 'smile', 'É raro eu gostar de estar errada.'),
    ],
    lose: [
      say('yuki', 'cold', 'Resultado dentro do previsto.'),
      say('yuki', 'neutral', 'Mas seu código final estava correto. Eu revisei. Tente de novo quando quiser; vou atualizar o modelo.'),
    ],
  },
  theo: {
    pre: [
      say('theo', 'think', 'Tenho uma regra: nunca escrevo a mesma linha duas vezes. Vamos ver quantas você desperdiça.'),
      say('theo', 'smirk', 'Um laço, quatro ramos, zero redundância. É assim que se vence.'),
    ],
    win: [
      say('theo', 'surprised', 'Mesma estrutura que a minha. E você terminou primeiro.'),
      say('theo', 'flustered', 'Isso é… eficiente. Eu não esperava dizer essa palavra para você.'),
      say('theo', 'smile', 'Me mostre depois como você organizou os testes. Em nome da otimização.'),
    ],
    lose: [
      say('theo', 'smirk', 'Tempo é o único recurso que não se recupera, Zero-Seis.'),
      say('theo', 'neutral', 'Ainda assim, sua solução passou. Elimine a hesitação e tente a revanche.'),
    ],
  },
  bianca: {
    pre: [
      say('bianca', 'smile', 'Zero-Seis! Eu torci tanto para você chegar até aqui. Ia ser um desperdício tirar pontos de qualquer outra pessoa.'),
      say('bianca', 'smirk', 'Um conselho de amiga: no mercado, quem não confere o estoque paga a conta.'),
    ],
    win: [
      say('bianca', 'surprised', 'Você… conferiu o estoque antes de vender. Nos dois pedidos.'),
      say('bianca', 'happy', 'Ha! Tudo bem. Eu sei reconhecer um bom investimento quando perco para ele.'),
      say('bianca', 'smirk', 'Agora só falta uma pessoa acima de você. Cuidado: Sora não negocia.'),
    ],
    lose: [
      say('bianca', 'happy', 'Negócios são negócios, meu bem.'),
      say('bianca', 'smile', 'Mas você fechou a conta certa no final. Volte para a revanche: eu gosto de clientes persistentes.'),
    ],
  },
  sora: {
    pre: [
      N('A arena está vazia. Sora já está lá, de pé, sem livro nenhum nas mãos.'),
      say('sora', 'neutral', 'No primeiro dia eu disse que vence quem aprende mais rápido do que os outros esperam.'),
      say('sora', 'smile', 'Eu esperava muito de você. Mostre que ainda assim eu subestimei.'),
    ],
    win: [
      say('sora', 'surprised', '…'),
      say('sora', 'happy', 'Então é assim que se sente. Perder. Eu tinha esquecido.'),
    ],
    lose: [
      say('sora', 'neutral', 'Faltou pouco.'),
      say('sora', 'smile', 'Não pare aqui. A revanche é sua por direito, e eu quero que você a vença.'),
    ],
  },
};

export function preDuel(chapter, rematch) {
  const script = [{ bg: 'arena', clear: true }, { title: rematch ? 'REVANCHE' : 'PROVA DE MÉRITO', sub: chapter.duel.title.replace(/^Prova[^:]*: /, '') }];
  if (rematch) {
    script.push(say(chapter.rival, 'smirk', chapter.rival === 'sora' ? '…De novo. Ótimo.' : 'De novo? Tudo bem. O resultado pode até mudar. Pode.'));
  } else {
    script.push(...DUELS[chapter.rival].pre);
    script.push(say('vesper', 'neutral', `As regras: quem entregar primeiro um código aprovado em todos os testes vence, soma ${POINTS.duelWin} de Mérito e tira ${POINTS.steal} do adversário. Perder com código correto ainda rende ${POINTS.duelHonor}.`, 'right'));
    script.push({ choice: [
      { text: `Apostar: +${POINTS.bet} se vencer, −${POINTS.betLoss} se perder`, set: { bet: true }, then: [say('vesper', 'smirk', 'Aposta registrada. Gosto de quem arrisca com as contas feitas.', 'right')] },
      { text: 'Sem aposta. Só a prova.', set: { bet: false }, then: [say('vesper', 'neutral', 'Prudente. Registrado.', 'right')] },
    ] });
  }
  script.push(N('O cronômetro aparece no telão. Três. Dois. Um.'));
  return script;
}

export function postDuel(chapter, won, firstWin) {
  const lines = DUELS[chapter.rival];
  const script = [{ bg: 'arena', clear: true }, ...(won ? lines.win : lines.lose)];
  if (won && firstWin) script.push(N(`+${POINTS.duelWin} de Mérito. ${POINTS.steal} pontos saem do placar de ${chapter.rival === 'sora' ? 'Sora' : 'seu rival'}.`));
  return script;
}

export function ending(isFirst) {
  const script = [
    { bg: 'classroom', clear: true },
    { title: 'FIM DO PERÍODO', sub: 'Sala Ômega — resultado final' },
    say('vesper', 'neutral', 'O período terminou. O telão não mente, e hoje ele diz algo que ninguém nesta sala previu.'),
  ];
  if (isFirst) {
    script.push(
      say('vesper', 'smile', '{nome}. Vaga 006. Primeiro lugar.'),
      say('caio', 'happy', 'Eu sempre disse que Zero-Seis tinha potencial. …Tá, eu não disse. Mas pensei, uma vez.', 'left'),
      say('bianca', 'smirk', 'Meu melhor investimento do ano.', 'right'),
      { clear: true },
      say('vesper', 'think', 'Você me perguntou quem indicou a sua vaga. Agora tem Mérito suficiente para a resposta.'),
      say('sora', 'smile', 'Fui eu.'),
      say('sora', 'neutral', 'Todo mundo aqui já chegou sabendo. Eu queria ver alguém aprender do zero. Tinha esquecido como era.'),
      say('vesper', 'smirk', 'E a pessoa que ocupou a Vaga 006 antes de você… está na sua frente, com um crachá de orientadora. O comitê não erra. Ele aposta.'),
      N('Você olha para o telão uma última vez. O número ao lado do seu nome não é mais zero.'),
      N('E o melhor: você sabe exatamente como cada ponto foi parar ali.'),
      { title: 'PARABÉNS', sub: 'Você completou a Academia Pyra' },
    );
  } else {
    script.push(
      say('vesper', 'neutral', '{nome}. Seu nome continua na lista. E bem longe do último lugar.'),
      say('sora', 'neutral', 'O topo ainda está aberto. Revanches, desafios bônus… cada ponto conta.'),
      say('vesper', 'smirk', 'A Vaga 006 continua sendo a mais interessante da sala. Não me decepcione agora.'),
      { title: 'O PERÍODO CONTINUA', sub: 'Alcance o 1º lugar para ver o final verdadeiro' },
    );
  }
  return script;
}

// Conversas rápidas na sala de aula, conforme o andamento.
const TALK = {
  caio: {
    before: [['smirk', 'Ainda aqui, Zero-Seis? Aproveita a vista do último lugar enquanto eu deixo.'], ['happy', 'Dica grátis: f-string. Decora isso. É a única coisa que eu vou te ensinar.']],
    won: [['flustered', 'Não fica se achando. …Como você fez aquela conta tão rápido, afinal?'], ['smile', 'Se alguém perguntar, eu deixei você ganhar. Combinado?']],
    honra: [['happy', 'Quer revanche? Meu cronômetro está sempre carregado.']],
  },
  yuki: {
    before: [['cold', 'Estou ocupada modelando a sua derrota. Volte depois.'], ['neutral', 'Condições se testam nas bordas: o primeiro valor que entra e o último que fica de fora.']],
    won: [['smile', 'Atualizei meu modelo. Você agora tem uma categoria própria.'], ['think', 'Teste sempre o caso do meio, o da borda e o absurdo. Você já faz isso. Continue.']],
    honra: [['neutral', 'Seu código estava certo. Só chegou tarde. A revanche é estatisticamente promissora.']],
  },
  theo: {
    before: [['think', 'Se você digitou a mesma linha três vezes hoje, saiba que eu senti.'], ['neutral', 'range começa em zero e para antes do fim. Metade dos erros do mundo nasce aí.']],
    won: [['smile', 'Reorganizei minhas anotações usando a sua estrutura. Não conte a ninguém.'], ['neutral', 'O próximo passo depois dos laços é dar nome a eles. Funções. Você vai gostar.']],
    honra: [['smirk', 'Corte a hesitação pela metade e a revanche é sua.']],
  },
  bianca: {
    before: [['smile', 'Oi, Zero-Seis! Precisa de alguma coisa? Eu cobro barato. Em juros.'], ['smirk', 'Quem sabe onde cada informação está guardada controla a sala. Dicionários, meu bem.']],
    won: [['happy', 'Meu investimento favorito! Como vão os rendimentos?'], ['smile', 'Só falta Sora. Ninguém nunca chegou tão perto. Não desperdice.']],
    honra: [['smirk', 'A porta da revanche está aberta. Traga a carteira.']],
  },
  sora: {
    before: [['cold', '…'], ['neutral', 'Leia o erro inteiro antes de mudar o código. A resposta quase sempre já está escrita ali.'], ['think', 'Você está subindo mais rápido do que eles esperavam.']],
    won: [['smile', 'Você me lembrou como é aprender. Não vou esquecer.'], ['happy', 'Agora é você quem alguém vai tentar alcançar. É mais difícil do que parece.']],
    honra: [['neutral', 'Eu espero. Vença a revanche.']],
  },
  vesper: {
    before: [['neutral', 'O quadro lista as missões. O telão, o ranking. O resto é com você.'], ['think', 'Travar faz parte. Ficar travado sem perguntar é que não. Laboratório 404, fim do corredor.'], ['smirk', 'Os desafios bônus não são obrigatórios. O primeiro lugar também não.']],
  },
};

export function hubTalk(id) {
  const lines = TALK[id];
  if (!lines) return [];
  const duel = state.duels[id];
  const pool = duel?.result === 'win' ? lines.won : duel ? lines.honra : lines.before;
  const key = `talk:${id}`;
  const index = (state.flags[key] || 0) % pool.length;
  state.flags[key] = index + 1;
  save();
  const [expr, text] = pool[index];
  return [say(id, expr, text)];
}
