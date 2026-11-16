// Roteiro da visual novel. Cada cena é uma lista de passos interpretada por vn.js.
// {nome} = nome de quem joga · {T} = letra atual da sua turma · {T:c} = letra atual de outra turma.
import { state, save, lessonsDoneCount } from './state.js';
import { POINTS, SYSTEM, MONTHS } from './content/index.js';
import { CAST } from './art/characters.js';

const N = (text) => ({ who: 'narr', text });
const V = (text) => ({ who: 'voce', text });
const say = (who, expr, text, pos) => ({ who, expr, text, pos });
const num = (value) => value.toLocaleString('pt-BR');

export const prologue = () => [
  { bg: 'black' },
  { title: 'ACADEMIA PYRA', sub: 'Aqui tudo se compra com pontos. Menos o topo.' },
  N('Uma carta sem remetente. Um brasão. Uma única frase:'),
  N('«Abriu uma vaga na Turma D. Ela é sua. Apresente-se no dia 1º.»'),
  { bg: 'gate' },
  N('Instituto Nacional de Formação Avançada. Fundado pelo Ministério da Ciência para formar quem vai programar o país daqui a vinte anos. Todo mundo chama de Academia Pyra.'),
  N('A escola ocupa uma ilha inteira: salas, dormitórios, uma galeria de lojas, laboratórios. Durante três anos, ninguém sai e nenhuma mensagem entra.'),
  N('Quem se forma na Turma A escolhe qualquer universidade, qualquer empresa. Quem se forma nas outras turmas leva um diploma, e só.'),
  N('São cento e sessenta alunos no primeiro ano, quarenta por turma. Cento e cinquenta e nove programam desde antes de aprender a amarrar os sapatos.'),
  N('O último assento da Turma D é seu. E você nunca escreveu uma linha de código na vida.'),
  V('(Só pode ter sido engano… mas a carta trazia o meu nome.)'),
  { ask: 'name', prompt: 'Como você assina a ficha de matrícula?' },
  { ask: 'look', prompt: 'Escolha a foto do seu ID estudantil.' },
  N('O portão lê o seu cartão e destrava. No visor, três linhas: «{nome} · MATRÍCULA D-40 · SALDO 0 pp».'),
  { bg: 'hall' },
  N('O corredor é limpo demais e silencioso demais. Em cada canto, uma câmera. As lentes acompanham você.'),
  say('vesper', 'neutral', '{nome}. Matrícula D-40. Quatro minutos de antecedência. Ótimo: pontualidade é a única coisa que não ensinamos aqui.'),
  say('vesper', 'neutral', 'Sou Vésper Albuquerque, orientadora da Turma D. Ouça com atenção, porque eu não costumo repetir.'),
  say('vesper', 'cold', 'Esta escola funciona pelo Sistema S. Cada turma tem Pontos de Classe. No dia 1º de cada mês, cada aluno recebe o saldo da turma multiplicado por cem, em pontos privados. Com eles se compra tudo neste campus. Tudo.'),
  say('vesper', 'cold', 'As turmas são ordenadas pelos Pontos de Classe. Quem tem mais é a Turma A; quem tem menos, a D. Se uma turma ultrapassa a outra, as letras trocam. E só a Turma A se forma com privilégios.'),
  say('vesper', 'neutral', 'Além disso há o Mérito: a sua nota individual, pública, atualizada em tempo real. No fim do ano, o último lugar do ranking é expulso. Sem recurso.'),
  { choice: [
    { text: 'Entendido. Não pretendo ficar em último.', set: { attitude: 'firme' }, then: [say('vesper', 'smirk', 'Todos dizem isso no primeiro dia. Poucos repetem no último.')] },
    { text: 'E se eu nunca programei antes?', set: { attitude: 'honesto' }, merit: 10, then: [say('vesper', 'think', 'Então você é a variável mais interessante do ano. O comitê não erra: ele aposta. …Honestidade registrada. Dez de Mérito.')] },
    { text: 'Quem me indicou para a vaga?', set: { attitude: 'curioso' }, then: [say('vesper', 'cold', 'Essa informação custa pontos que você ainda não tem. Conquiste-os.')] },
  ] },
  say('vesper', 'neutral', 'A vaga que você ocupa era do primeiro expulso do ano. Ele durou vinte e nove dias. Sua turma já está lá dentro — e hoje é dia de depósito. Vai ser… educativo.'),
  { bg: 'classroom', clear: true },
  N('A porta desliza. A sala está em festa: é dia 1º, dia de receber os pontos do mês.'),
  say('davi', 'happy', 'Carne nova! Chegou no melhor dia: hoje caem cem mil pontos na conta de cada um. Mês passado eu comprei um console, acredita?', 'left'),
  say('lara', 'smile', 'Cem mil por mês só por existir. Essa escola é o paraíso.', 'right'),
  { clear: true },
  say('kiara', 'happy', 'Oi, oi! Você é a matrícula nova? Eu sou a Kiara! Já decorei o seu nome: {nome}. Vamos ser amigos, tá?', 'left'),
  say('lucas', 'smile', 'Lucas. Se precisar de qualquer coisa, fala comigo. Aqui ninguém fica sozinho.', 'right'),
  N('No fundo da sala, um garoto loiro faz flexões no corredor entre as carteiras, contando em voz alta. Ninguém comenta.'),
  say('valentim', 'smirk', '…noventa e nove. Cem. Ah, um espectador. Pode continuar admirando, eu não cobro.', 'right'),
  { clear: true },
  say('ayumi', 'cold', 'São 8h02. O depósito sempre cai às 8h em ponto. Tem alguma coisa errada.'),
  N('Um a um, os celulares se acendem. O mesmo número em todas as telas.'),
  { notice: { kicker: 'EXTRATO · DIA 1º DE MAIO', title: 'DEPÓSITO MENSAL', lines: [['Pontos de Classe da Turma D', '0 CP'], ['Cálculo', '0 × 100'], ['Valor depositado', '0 pp']], foot: 'Saldo atual: 0 pp' } },
  say('davi', 'surprised', 'Zero?! Deve ser bug. Alguém reinicia o servidor!'),
  { clear: true },
  say('vesper', 'cold', 'Não é bug. Sentem-se.'),
  say('vesper', 'neutral', 'Em um mês: noventa e oito atrasos, trezentas e noventa e uma conversas e celulares em aula, a pior média do ano na avaliação diagnóstica. As câmeras registraram tudo.'),
  say('vesper', 'cold', 'Vocês começaram com mil Pontos de Classe e queimaram cada um deles. Nenhuma turma da história da Academia tinha chegado a zero tão rápido.'),
  say('vesper', 'smirk', 'Parabéns. Vocês são, oficialmente, os defeituosos.'),
  say('caio', 'angry', 'Isso é injusto! Ninguém avisou que estavam contando!', 'left'),
  say('vesper', 'neutral', `Também não avisaram a Turma A. Eles continuam com ${num(SYSTEM.base.a)}.`, 'right'),
  { clear: true },
  N('O telão da sala troca de imagem.'),
  { notice: { kicker: 'TELÃO · SISTEMA S', title: 'RANKING DE CLASSES', lines: [['Turma A', `${num(SYSTEM.base.a)} CP`], ['Turma B', `${num(SYSTEM.base.b)} CP`], ['Turma C', `${num(SYSTEM.base.c)} CP`], ['Turma D', '0 CP']], foot: 'Depósito mensal de cada aluno = Pontos de Classe × 100' } },
  say('vesper', 'neutral', 'Pontos de Classe sobem de dois jeitos: aulas concluídas e Exames Especiais contra as outras turmas. {nome} acabou de chegar e já vale tanto quanto todos vocês juntos: zero.'),
  say('caio', 'smirk', 'Ótimo. Mandaram para a pior turma alguém que nunca abriu um terminal. Relaxa, Quarenta: alguém precisa segurar o último lugar.', 'left'),
  say('samuel', 'neutral', '…Ou alguém precisa começar a subir.', 'right'),
  { clear: true },
  say('vesper', 'neutral', 'Na Galeria existe uma prateleira de itens gratuitos para quem está sem saldo. Ninguém vai passar fome. Mas o campus inteiro vai ver vocês pegando.'),
  say('samuel', 'neutral', '(…Câmeras no teto, nos corredores, na porta. Ela não estava blefando sobre nada disso.)', 'left'),
  say('vesper', 'think', 'Ah. No fim da ala leste fica o Laboratório 404. Há uma pesquisadora visitante que tolera perguntas. Às vezes.', 'right'),
  say('vesper', 'smirk', 'O mês começou. Cada aula concluída soma Pontos de Classe para a turma inteira. Surpreendam-me.'),
  { title: 'CAPÍTULO 1', sub: 'Maio — Fundamentos' },
];

export const kurisuIntro = () => [
  { bg: 'lab', clear: true },
  N('Laboratório 404. Na porta, um aviso: «Não perturbe (sério)». Você bate mesmo assim.'),
  say('kurisu', 'angry', 'Eu escrevi NÃO PERTURBE. Qual parte da frase precisa de revisão por pares?'),
  say('kurisu', 'think', '…Espera. Você é a matrícula D-40. Quem nunca programou e veio parar na turma que zerou os pontos.'),
  say('kurisu', 'neutral', 'Makise Kurisu. Neurociência. Passo um semestre aqui estudando como cérebros aprendem sob pressão, e você é um espécime… conveniente.'),
  say('kurisu', 'flustered', 'N-não é como se eu fosse te ajudar por bondade! É coleta de dados. Só isso.'),
  say('kurisu', 'smirk', 'Então, quando travar, pergunte. De preferência com o erro em mãos. Hipótese, experimento, conclusão: é assim que se aprende qualquer coisa.'),
];

export const monikaIntro = () => [
  { bg: 'classroom', clear: true },
  N('Prédio principal, fim do corredor. Uma placa escrita à mão: «Clube de Código Criativo». A porta está entreaberta, como se alguém soubesse que você vinha.'),
  say('monika', 'happy', 'Ah! Aí está você. {nome}, né? Eu sou a Monika, presidente do clube. Senta onde quiser. Tecnicamente, todos os lugares estão livres.'),
  say('monika', 'smile', 'Aqui a gente não estuda Python só para passar de prova. A gente usa Python para fazer coisas que não existiam antes: poemas, desenhos feitos de letras, histórias em que quem lê escolhe o caminho.'),
  say('monika', 'think', 'Você já conheceu a Kurisu? Ela é ótima para consertar o que quebrou. Eu sou melhor para quando você não sabe o que construir. Dá para ter as duas, viu?'),
  say('monika', 'smirk', 'E pode deixar que eu te guio passo a passo. Pessoalmente. A partir de hoje, você é oficialmente o meu aluno favorito.'),
  say('monika', 'flustered', 'Quer dizer… o único aluno do clube. Mas favorito também. Vamos começar?'),
];

/** Dia 1º de um novo mês: o depósito cai (ou não) no celular. */
export function monthStart(chapter, deposit) {
  if (!deposit) return [];
  const month = MONTHS[chapter.n - 1];
  return [
    { bg: 'dorm', clear: true },
    N(`Dia 1º de ${month.toLowerCase()}. O celular vibra às 8h em ponto.`),
    { notice: {
      kicker: `EXTRATO · DIA 1º DE ${month.toUpperCase()}`, title: 'DEPÓSITO MENSAL',
      lines: [[`Pontos de Classe da Turma ${deposit.letter}`, `${num(deposit.cp)} CP`], ['Cálculo', `${num(deposit.cp)} × ${SYSTEM.ppPerCP}`], ['Valor depositado', `${num(deposit.amount)} pp`]],
      foot: `Saldo atual: ${num(state.pp)} pp · gaste na Galeria`,
    } },
    V(deposit.amount > 0 ? '(Pontos de verdade. Cada um deles saiu de uma aula concluída.)' : '(Zero de novo.)'),
  ];
}

const CHAPTER_INTROS = {
  c2: [
    { bg: 'classroom', clear: true },
    { title: 'CAPÍTULO 2', sub: 'Junho — Decisões e acaso' },
    say('vesper', 'neutral', 'Junho tem prova intermediária. Nota abaixo do corte é expulsão, e o Comitê não aceita recurso. O desempate entre as turmas será um duelo de código: um representante de cada lado.'),
    say('bia', 'smirk', '(sussurrando) Fiquei sabendo que a Turma B tem as provas do ano passado. Dizem que as perguntas se repetem. Quanto vale isso? Dois pastéis.', 'left'),
    say('vesper', 'neutral', 'Até agora seus programas faziam sempre a mesma coisa. A partir de hoje, eles decidem.', 'right'),
    N('A porta se abre sem ninguém bater. Dois alunos de outra turma entram como se a sala fosse deles.'),
    say('dario', 'smirk', 'Então esta é a sala dos defeituosos. Soube que vocês voltaram a ter pontos. Que bom: ponto parado em turma fraca é desperdício.', 'left'),
    say('yuki', 'cold', 'O próximo Exame Especial é contra a nossa turma. Eu não erro lógica. Sugiro que você também não.', 'right'),
    say('dario', 'happy', `Quem perde paga ${SYSTEM.examStealCP} Pontos de Classe. Vai separando.`, 'left'),
  ],
  c3: [
    { bg: 'classroom', clear: true },
    { title: 'CAPÍTULO 3', sub: 'Julho — Laços' },
    { notice: { kicker: 'COMUNICADO OFICIAL · JULHO', title: 'EXAME ESPECIAL: A ILHA', lines: [['Duração', '7 dias'], ['Local', 'Ilha vizinha ao campus'], ['Pontos de exame por turma', '300'], ['Líder secreto', '1 por turma']], foot: 'O código de acesso aos suprimentos será disputado entre representantes.' } },
    say('vesper', 'neutral', 'Uma semana numa ilha deserta. Cada turma escolhe um líder secreto; quem descobrir o líder da outra turma ganha pontos. Os suprimentos ficam trancados atrás de um terminal.'),
    say('vesper', 'smirk', 'Um programador que copia e cola dez linhas ainda está digitando. Este mês vocês aprendem a mandar a máquina repetir.'),
    say('clara', 'smile', 'Com licença! Clara, representante da turma do Theo. Vim desejar boa sorte no exame. De verdade.', 'left'),
    say('theo', 'smirk', 'Ela é educada. Eu sou eficiente. Tente não escrever a mesma linha duas vezes na minha frente.', 'right'),
  ],
  c4: [
    { bg: 'classroom', clear: true },
    { title: 'CAPÍTULO 4', sub: 'Agosto — Coleções' },
    { notice: { kicker: 'COMUNICADO OFICIAL · AGOSTO', title: 'EXAME ESPECIAL: O CRUZEIRO', lines: [['Alunos a bordo', '160'], ['Grupos mistos', '12'], ['Alvos ocultos', '1 por grupo'], ['Acerto', '+50 CP · erro −50 CP']], foot: 'O registro dos grupos será decidido por inventário: listas e dicionários.' } },
    say('vesper', 'neutral', 'Na volta da ilha, um cruzeiro. Doze grupos misturando as quatro turmas. Em cada grupo, um alvo. Descubram quem é antes que descubram vocês.'),
    say('vesper', 'think', 'Inventários, lojas, mapas. Tudo o que você conhece de jogos é feito de listas e dicionários.'),
    N('No intervalo, alguém da turma de elite atravessa o campus só para sentar na carteira ao lado da sua.'),
    say('bianca', 'smile', 'Chegou a minha vez, Quarenta. A sua turma virou o assunto do campus, e eu adoro investir em assunto. Prometo ser gentil. Com a sua pontuação, não.', 'right'),
  ],
  c5: [
    { bg: 'hall', clear: true },
    { title: 'CAPÍTULO 5', sub: 'Setembro — Funções' },
    say('vesper', 'neutral', 'Funções transformam quem usa ferramentas em quem as fabrica. É a distância entre a turma de vocês e a de cima.'),
    { notice: { kicker: 'COMUNICADO OFICIAL · SETEMBRO', title: 'FESTIVAL ESPORTIVO', lines: [['Time Vermelho', 'Turmas A e D'], ['Time Branco', 'Turmas B e C'], ['Última prova', 'Revezamento de código'], ['Pior colocado do ano', '−100 CP para a turma']], foot: 'Cada aluno participa de pelo menos uma prova.' } },
    N('No corredor, uma garota da Turma A apoiada numa bengala para na frente do Samuel. Ela sorri como quem reencontra alguém.'),
    say('iris', 'smile', 'Faz tempo. Oito anos, eu acho. Você cresceu, mas continua olhando para os lados antes de piscar.', 'left'),
    say('samuel', 'cold', 'Você deve estar me confundindo com alguém.', 'right'),
    say('iris', 'smirk', 'Claro. Com alguém. …E você, {nome}. É você que ele está deixando subir?', 'left'),
    { clear: true },
    N('No fim do corredor, encostado na janela, o primeiro lugar do ano fecha o livro pela primeira vez.'),
    say('sora', 'neutral', '…Eu estava esperando você chegar até aqui.'),
  ],
  c6: [
    { bg: 'council', clear: true },
    { title: 'CAPÍTULO 6', sub: 'Outubro — Nível de elite' },
    N('Uma convocação com o selo do Conselho Estudantil. Não se recusa uma dessas.'),
    say('leonardo', 'smirk', 'Então essa é a famosa D-40. Relaxa, eu só vim ver de perto. No ano que vem eu sento naquela cadeira, e vou precisar de gente que sobe sozinha.', 'right'),
    say('sayuri', 'neutral', 'Vice-presidente, a reunião é com a presidente. O senhor não está na pauta.', 'left'),
    { clear: true },
    say('helena', 'neutral', '{nome}. Matrícula D-40. Em cinco meses você fez o Sistema S se mexer mais do que em cinco anos.'),
    say('helena', 'cold', 'O Conselho precisa saber se isso foi mérito ou ruído. O último exame do ano é meu: erros tratados, texto dissecado, dados organizados. Nível de elite.'),
    say('helena', 'smirk', 'Se vencer, a sua turma leva o selo do Conselho. Se perder… o sistema continua não mentindo.'),
    say('vesper', 'think', 'Ela nunca perdeu um exame. Estude como se isso fosse verdade.', 'right'),
  ],
};
export const chapterIntro = (chapter) => CHAPTER_INTROS[chapter.id] || [];

const DUELS = {
  caio: {
    label: 'SELETIVA DA TURMA D',
    pre: [
      say('vesper', 'neutral', 'Antes de enfrentar as outras turmas, a Turma D precisa de alguém para representá-la nos Exames Especiais. Hoje: a melhor nota da sala contra a matrícula mais nova.', 'right'),
      say('caio', 'smirk', 'Olha só quem terminou os fundamentos. Parabéns, Quarenta: aprendeu a engatinhar.'),
      say('caio', 'happy', 'Mesmo desafio, mesmo relógio. Eu termino antes de você achar a tecla dos dois-pontos.'),
    ],
    win: [
      say('caio', 'surprised', '…Aprovado? Em todos os testes? Antes de mim?!'),
      say('caio', 'flustered', 'Tsc. Sorte de principiante. …Mas a sua saída estava limpa. Odeio admitir.'),
      say('vesper', 'smirk', 'Registrado: {nome} representa a turma nos Exames Especiais. Montenegro: velocidade sem precisão é só barulho.', 'right'),
    ],
    lose: [
      say('caio', 'happy', 'Cronômetro não mente, Quarenta!'),
      say('vesper', 'neutral', 'Você entregou depois, mas entregou certo. Mérito de honra registrado. A revanche fica aberta.', 'right'),
    ],
  },
  yuki: {
    pre: [
      say('yuki', 'cold', 'Analisei seus últimos exercícios. Você melhora 11% por aula. Insuficiente para hoje.'),
      say('yuki', 'neutral', 'Seu código será testado com vários casos. Um único ramo errado e os pontos vão para a nossa turma.'),
    ],
    win: [
      say('yuki', 'surprised', 'Todos os casos de borda… cobertos.'),
      say('yuki', 'think', 'Recalculando. Probabilidade de a sua turma sobreviver ao ano: 38%. …Não. 61%. Meu modelo estava errado sobre você.'),
      say('yuki', 'smile', 'É raro eu gostar de estar errada. O Dário não vai gostar nem um pouco.'),
    ],
    lose: [
      say('yuki', 'cold', 'Resultado dentro do previsto.'),
      say('yuki', 'neutral', 'Mas seu código final estava correto. Eu revisei. Tente de novo quando quiser; vou atualizar o modelo.'),
    ],
  },
  theo: {
    pre: [
      say('theo', 'think', 'Tenho uma regra: nunca escrevo a mesma linha duas vezes. Vamos ver quantas você desperdiça.'),
      say('theo', 'smirk', 'Um laço, quatro ramos, zero redundância. É assim que a minha turma vence.'),
    ],
    win: [
      say('theo', 'surprised', 'Mesma estrutura que a minha. E você terminou primeiro.'),
      say('theo', 'flustered', 'Isso é… eficiente. Eu não esperava dizer essa palavra para alguém da sua turma.'),
      say('theo', 'smile', 'Me mostre depois como você organizou os testes. Em nome da otimização. A Clara vai querer te dar parabéns; finja surpresa.'),
    ],
    lose: [
      say('theo', 'smirk', 'Tempo é o único recurso que não se recupera, Quarenta.'),
      say('theo', 'neutral', 'Ainda assim, sua solução passou. Elimine a hesitação e tente a revanche.'),
    ],
  },
  bianca: {
    pre: [
      say('bianca', 'smile', 'Quarenta! Eu torci tanto para você chegar até aqui. Ia ser um desperdício tirar pontos de qualquer outra turma.'),
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
      N('O salão de exames está vazio. Sora já está lá, de pé, sem livro nenhum nas mãos.'),
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
  helena: {
    label: 'EXAME DO CONSELHO',
    bg: 'council',
    pre: [
      N('A sala do Conselho. Uma mesa, dois terminais, o telão do Sistema S ao fundo.'),
      say('helena', 'neutral', 'Regras do Conselho: registros sujos, dados incompletos e nenhuma segunda chance para código que quebra.'),
      say('helena', 'smirk', 'Mostre que você trata os erros antes que eles tratem de você.'),
    ],
    win: [
      say('helena', 'surprised', 'Nenhuma exceção escapou. Nenhuma linha desperdiçada.'),
      say('helena', 'smile', 'Três anos invicta. Eu tinha me esquecido de como é interessante perder.'),
      say('helena', 'neutral', 'O selo do Conselho é da sua turma. Usem bem: agora o campus inteiro está olhando para vocês.'),
    ],
    lose: [
      say('helena', 'neutral', 'Dentro do previsto.'),
      say('helena', 'think', 'Mas o seu código terminou correto, e o Conselho registra isso. A revanche está aberta. Poucos têm coragem de pedir.'),
    ],
  },
};

const stealsFrom = (rival) => 'abc'.includes(CAST[rival].home);

export function preDuel(chapter, rematch) {
  const lines = DUELS[chapter.rival];
  const label = lines.label || 'EXAME ESPECIAL';
  const script = [
    { bg: lines.bg || 'arena', clear: true },
    { title: rematch ? 'REVANCHE' : label, sub: chapter.duel.title.replace(/^[^:]*: /, '') },
    { versus: chapter.rival },
  ];
  if (rematch) {
    script.push(say(chapter.rival, 'smirk', chapter.rival === 'sora' ? '…De novo. Ótimo.' : 'De novo? Tudo bem. O resultado pode até mudar. Pode.'));
  } else {
    script.push(...lines.pre);
    script.push(say('vesper', 'neutral', `As regras: vence quem entregar primeiro um código aprovado em todos os testes. A vitória vale ${POINTS.duelWin} de Mérito para você e ${SYSTEM.examWinCP} Pontos de Classe para a turma${stealsFrom(chapter.rival) ? `; a turma derrotada perde ${SYSTEM.examStealCP}` : ''}. Perder com código correto ainda rende ${POINTS.duelHonor} de Mérito.`, 'right'));
    script.push({ choice: [
      { text: `Apostar: +${POINTS.bet} de Mérito se vencer, −${POINTS.betLoss} se perder`, set: { bet: true }, then: [say('vesper', 'smirk', 'Aposta registrada. Gosto de quem arrisca com as contas feitas.', 'right')] },
      { text: 'Sem aposta. Só o exame.', set: { bet: false }, then: [say('vesper', 'neutral', 'Prudente. Registrado.', 'right')] },
    ] });
  }
  script.push(N('O cronômetro aparece no telão. Três. Dois. Um.'));
  return script;
}

export function postDuel(chapter, won, firstWin) {
  const lines = DUELS[chapter.rival];
  const script = [
    { bg: lines.bg || 'arena', clear: true },
    { title: won ? 'APROVADO' : 'ENTREGA TARDIA', sub: won ? 'Exame vencido' : 'Código correto, mas depois do adversário', tone: won ? 'gold' : 'white' },
    ...(won ? lines.win : lines.lose),
  ];
  if (won && firstWin) {
    const rivalName = CAST[chapter.rival].name;
    script.push(N(`+${POINTS.duelWin} de Mérito. +${SYSTEM.examWinCP} Pontos de Classe para a sua turma.${stealsFrom(chapter.rival) ? ` A turma de ${rivalName} perde ${SYSTEM.examStealCP}.` : ''}`));
  }
  return script;
}

/** A turma de quem joga trocou de letra. */
export function promotion(letter) {
  const lines = {
    C: [
      say('vesper', 'smirk', 'Em vinte anos de Academia, eu nunca tinha visto a última turma trocar de letra antes das férias. A partir de hoje, vocês são a Turma C.'),
      say('davi', 'happy', 'TURMA C! Alguém atualiza o grupo! Alguém compra um bolo!', 'left'),
      say('ayumi', 'smile', 'Bolo depois. A turma do Dário acabou de virar a D, e eles vão querer a letra de volta.', 'right'),
    ],
    B: [
      say('vesper', 'think', 'Turma B. O depósito do mês que vem vai ter mais zeros do que vocês estão acostumados a ver.'),
      say('lara', 'happy', 'Eu sabia que valia a pena andar com gente estudiosa!', 'left'),
      say('samuel', 'neutral', 'Falta uma letra.', 'right'),
    ],
    A: [
      N('O telão pisca. As quatro linhas trocam de lugar pela última vez.'),
      say('vesper', 'smile', '…Turma A. Vocês começaram maio com zero.'),
      say('caio', 'happy', 'TURMA A! Eu sempre disse que o Quarenta tinha potencial! …Tá, eu não disse. Mas pensei, uma vez.', 'left'),
      say('ayumi', 'flustered', 'Eu… não tenho plano para isso. É a primeira vez que eu não tenho um plano.', 'right'),
    ],
  }[letter];
  if (!lines) return [];
  return [{ bg: 'classroom', clear: true }, { title: `TURMA ${letter}`, sub: 'Promoção de classe', tone: 'gold' }, ...lines];
}

export function ending(isFirst) {
  const script = [
    { bg: 'council', clear: true },
    { title: 'FIM DO ANO LETIVO', sub: 'Sistema S — resultado final' },
    say('helena', 'neutral', 'O ano terminou. O telão não mente, e hoje ele diz algo que ninguém neste campus previu.'),
    N('A turma que começou maio com zero Pontos de Classe termina o ano como Turma {T}.'),
  ];
  if (isFirst) {
    script.push(
      say('vesper', 'smile', '{nome}. Matrícula D-40. Primeiro lugar do ano.'),
      say('caio', 'happy', 'Eu sempre disse que o Quarenta tinha potencial. …Tá, eu não disse. Mas pensei, uma vez.', 'left'),
      say('bianca', 'smirk', 'Meu melhor investimento do ano.', 'right'),
      { clear: true },
      say('vesper', 'think', 'No primeiro dia, você quis saber quem indicou a sua vaga. Agora tem pontos de sobra para comprar a resposta.'),
      say('sora', 'smile', 'Fui eu.'),
      say('sora', 'neutral', 'Todo mundo aqui já chegou sabendo. Eu queria ver alguém aprender do zero. Tinha esquecido como era.'),
      say('vesper', 'smirk', 'E, há vinte anos, uma aluna chegou à Turma D sem nunca ter programado e se formou na A. Ela está na sua frente, com um crachá de orientadora. O comitê não erra. Ele aposta.'),
      N('Você olha para o telão uma última vez. O número ao lado do seu nome não é mais zero.'),
      N('E o melhor: você sabe exatamente como cada ponto foi parar ali.'),
      { title: 'PARABÉNS', sub: 'Você completou a Academia Pyra', tone: 'gold' },
    );
  } else {
    script.push(
      say('vesper', 'neutral', '{nome}. Seu nome continua na lista. E bem longe do último lugar.'),
      say('sora', 'neutral', 'O topo ainda está aberto. Revanches, desafios bônus… cada ponto conta.'),
      say('vesper', 'smirk', 'A matrícula D-40 continua sendo a mais interessante do campus. Não me decepcione agora.'),
      { title: 'O ANO CONTINUA', sub: 'Alcance o 1º lugar para ver o final verdadeiro', tone: 'white' },
    );
  }
  return script;
}

// Conversas rápidas no campus, conforme o andamento.
// Rivais: before / won / honra. Colegas e equipe: before / late (depois de metade das aulas).
const TALK = {
  caio: {
    before: [['smirk', 'Ainda aqui, Quarenta? Aproveita a vista do último lugar enquanto eu deixo.'], ['happy', 'Dica grátis: f-string. Decora isso. É a única coisa que eu vou te ensinar.']],
    won: [['flustered', 'Não fica se achando. …Como você fez aquela conta tão rápido, afinal?'], ['smile', 'Se alguém perguntar, eu deixei você ganhar. Combinado? E vê se ganha da turma do Dário por nós dois.']],
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
    before: [['smile', 'Oi, Quarenta! Precisa de alguma coisa? Eu cobro barato. Em juros.'], ['smirk', 'Quem sabe onde cada informação está guardada controla o campus. Dicionários, meu bem.']],
    won: [['happy', 'Meu investimento favorito! Como vão os rendimentos?'], ['smile', 'Só falta Sora. Ninguém nunca chegou tão perto. Não desperdice.']],
    honra: [['smirk', 'A porta da revanche está aberta. Traga a carteira.']],
  },
  sora: {
    before: [['cold', '…'], ['neutral', 'Leia o erro inteiro antes de mudar o código. A resposta quase sempre já está escrita ali.'], ['think', 'Você está subindo mais rápido do que eles esperavam.']],
    won: [['smile', 'Você me lembrou como é aprender. Não vou esquecer.'], ['happy', 'Agora é você quem alguém vai tentar alcançar. É mais difícil do que parece.']],
    honra: [['neutral', 'Eu espero. Vença a revanche.']],
  },
  helena: {
    before: [['neutral', 'O Conselho observa todas as turmas. A sua tem dado mais trabalho do que as outras três juntas.'], ['smirk', 'Vinte milhões de pontos compram uma vaga na Turma A. Ninguém nunca pagou. Há caminhos mais baratos, e mais difíceis.']],
    won: [['smile', 'Guardei o seu código do exame nos arquivos do Conselho. Como referência.'], ['neutral', 'No ano que vem, alguém vai chegar à Turma D sem saber nada. Lembre-se de como foi.']],
    honra: [['think', 'O Conselho não tem pressa. A revanche continua na pauta.']],
  },
  vesper: {
    before: [['neutral', 'O quadro lista as missões. O telão, as classes. O resto é com você.'], ['think', 'Travar faz parte. Ficar travado sem perguntar é que não. Laboratório 404, fim da ala leste.'], ['smirk', 'Os desafios bônus não são obrigatórios. O primeiro lugar também não.'], ['cold', 'As câmeras não descontam pontos de quem estuda. Só de quem finge.']],
    late: [['think', 'Faz vinte anos que eu não via uma turma D estudar por vontade própria. Não estrague.'], ['smirk', 'Eu não dou parabéns. Mas atualizei o meu relatório sobre você três vezes este mês.']],
  },
  ayumi: {
    before: [['cold', 'Novato, regra um: atraso custa Ponto de Classe. Regra dois: não existe regra dois enquanto a um não for cumprida.'], ['neutral', 'Montei um grupo de estudos às 18h na biblioteca. Você explica o que aprendeu: explicar é a melhor forma de fixar.'], ['think', 'A turma do Dário vive de contrato e ameaça. A nossa vai viver de planilha. Eu tenho uma para cada cenário.']],
    late: [['smile', 'A frequência da turma subiu para 96%. Eu não achei que fosse escrever essa frase este ano.'], ['flustered', 'N-não é que eu esteja orgulhosa. É só que os números estão bons.']],
  },
  samuel: {
    before: [['neutral', 'Tirei cinquenta na diagnóstica. A média da sala foi cinquenta. Coincidência.'], ['think', 'Antes de escrever, diga em voz alta o que o programa tem que fazer. Se você não consegue dizer, não consegue programar.'], ['neutral', 'Todo mundo olha para o primeiro e para o último lugar. Ninguém olha para o meio. É um ótimo lugar para observar.']],
    late: [['smirk', 'Você subiu mais rápido do que eu calculei. E eu calculo bem.'], ['neutral', 'Quando chegar perto do topo, repare em quem para de sorrir para você. É assim que se descobre quem contava com a sua queda.']],
  },
  lara: {
    before: [['smile', 'Você precisa conhecer a Galeria! Quer dizer… quando a gente voltar a ter saldo.'], ['flustered', 'Tá, eu gastei cem mil pontos em onze dias. Mas a jaqueta era linda.'], ['happy', 'Se você subir a turma, eu te apresento para o campus inteiro. Contato vale mais que ponto, sabia?']],
    late: [['happy', 'O depósito caiu! Dessa vez eu fiz uma planilha de gastos. A Ayumi quase chorou.'], ['smile', 'Aprendi f-string só para montar etiqueta de preço. Não conta para ninguém que eu achei legal.']],
  },
  jonas: {
    before: [['neutral', 'Treino às cinco da manhã, aula às oito. Se eu dormir no teclado, me cutuca.'], ['think', 'Programar é igual a largada: se errar o primeiro passo, o resto da corrida é só correr atrás.'], ['smile', 'Me explica esse tal de while depois? Em troca eu te ensino a sobreviver à educação física.']],
    late: [['happy', 'Fiz um laço que conta minhas voltas na pista! Deu erro três vezes, mas rodou!'], ['smile', 'O treinador diz que disciplina é fazer o chato todo dia. Acho que serve para código também.']],
  },
  bia: {
    before: [['smirk', 'Fiquei sabendo que a turma do Dário já está de olho nos nossos pontos. Quanto vale essa informação? Um pastel.'], ['smile', 'Dizem que a professora Vésper estudou aqui. Dizem que foi na Turma D. Eu não disse nada.'], ['think', 'Sabia que dá para comprar quase tudo com ponto privado? Até transferência de turma. Vinte milhões. Eu perguntei.']],
    late: [['happy', 'O campus inteiro está falando da nossa turma. Finalmente a fofoca é sobre a gente por um bom motivo!'], ['smirk', 'A turma de elite anda nervosa. Uma fonte me contou. A fonte sou eu, ouvindo atrás da porta.']],
  },
  davi: {
    before: [['happy', 'Olha pelo lado bom: com zero ponto, ninguém pode tirar nada da gente!'], ['flustered', 'Vendi o console para pagar o almoço do mês. Não quero falar sobre isso.'], ['smile', 'Por que o programador confunde Halloween com Natal? Porque OCT 31 é igual a DEC 25. …Um dia você vai rir.']],
    late: [['happy', 'Escrevi um programa que conta piada! Tem um bug: ele acha que é engraçado.'], ['smile', 'Sério agora: valeu por não desistir da gente, Quarenta.']],
  },
  nina: {
    before: [['flustered', 'Ah! D-desculpa, eu estava desenhando. Você… quer ver? É um fluxograma do exercício de hoje.'], ['neutral', 'Na prova eu sei tudo. Aí o relógio começa e a minha cabeça fica em branco.'], ['smile', 'Se eu desenhar o problema antes, ele fica menor. Tenta: uma caixinha para cada passo, uma seta para cada decisão.']],
    late: [['smile', 'Passei no último simulado! Desenhei o programa inteiro antes de digitar.'], ['happy', 'Fiz um desenho da turma no telão. Você está no meio. Espero que não se importe.']],
  },
  icaro: {
    before: [['cold', '…Zzz.'], ['neutral', 'Hm? Ah. Novato. Fui dormir às cinco. Ranqueada não se ganha sozinha.'], ['think', 'Jogo é só um while com um input dentro. Depois que você entende isso, não consegue mais desver.']],
    late: [['smirk', 'Dormi oito horas ontem. A Ayumi me subornou com café. Não me orgulho.'], ['happy', 'Fiz um bot que treina mira comigo. Em Python. Acho que isso conta como estudar.']],
  },
  dario: {
    before: [['smirk', 'Empresto ponto a juros de dez por cento ao dia. Pergunta para o Bruno como é.'], ['angry', 'Aproveita a letra enquanto ela é sua.']],
  },
  clara: {
    before: [['smile', 'Se alguém da sua turma precisar de ajuda com laços, o nosso grupo de estudos é aberto. Sério!'], ['happy', 'Competir não impede de torcer. Eu torço por vocês. Menos no dia do exame.']],
  },
  monika: {
    before: [['happy', 'Você voltou! Quer dizer, eu sabia que voltaria. Quer dizer… oi, {nome}.'], ['smile', 'Tive uma ideia de projeto para nós: um gerador de poemas. Você escolhe as palavras, o Python escolhe a ordem.'], ['think', 'A Kurisu pergunta por que o código quebrou. Eu prefiro perguntar o que você quer que ele crie.'], ['flustered', 'Se você for dormir agora, tudo bem! Sério. Eu guardo o seu lugar no clube.']],
    late: [['happy', 'Olha quanta coisa você já sabe! Eu sempre soube que seria você.'], ['smirk', 'Toda vez que você termina uma aula, o clube fica um pouco mais animado. Tá, o clube sou eu. Mas fica.']],
  },
  kiara: {
    before: [['happy', 'Bom dia, {nome}! Trouxe um adesivo pro seu caderno. Combina com você!'], ['smile', 'Se alguém da turma estiver triste, me avisa? Eu gosto de saber das coisas. De todas as coisas.'], ['think', 'Você é bem observador, né? Hm. Que legal.']],
    late: [['smile', 'A turma está tão unida agora! Eu adoro quando todo mundo gosta de todo mundo.'], ['cold', '…Ah! Desculpa, eu estava pensando em outra coisa. Tudo ótimo!']],
  },
  lucas: {
    before: [['smile', 'Montei um grupo de reforço depois do treino. Ninguém precisa ter vergonha de não saber.'], ['think', 'A Ayumi e o Caio brigaram de novo. Eu resolvo. Sempre resolvo.']],
    late: [['happy', 'A sala toda veio no reforço ontem. A sala TODA. Até o Valentim, mas ele só ficou se olhando no reflexo do monitor.'], ['neutral', 'Às vezes eu acho que, se a turma brigar de verdade, eu não sei o que eu faço.']],
  },
  valentim: {
    before: [['smirk', 'Você está me olhando. Compreensível.'], ['neutral', 'Pontos de Classe? Eu não preciso de pontos. Pontos é que precisam de mim.'], ['happy', 'Este exercício é bonito. Vou resolvê-lo. Não por vocês: por ele.']],
    late: [['think', 'Você subiu sem atalhos. Isso é… esteticamente aceitável.'], ['smirk', 'Se precisar de um gênio no grupo de estudos, me chame. Talvez eu vá. Talvez eu esteja fazendo flexões.']],
  },
  italo: {
    before: [['cold', 'Errou de novo o recuo? Quatro espaços. QUATRO.'], ['neutral', 'Se você não entender, eu explico de novo. Mais devagar. Com mais irritação.']],
    late: [['smile', 'Sua última entrega estava limpa. Não se acostume a ouvir isso.'], ['think', 'Eu achava que estudar era uma coisa que se faz sozinho. A Ayumi me provou que não. Não conta para ela.']],
  },
  giovana: {
    before: [['neutral', 'Tirei setenta. Nem muito, nem pouco. Ninguém pede cola para quem tira setenta.'], ['think', 'O Samuel faz a mesma coisa que eu, sabia? Só que melhor. Isso me assusta um pouco.']],
  },
  bernardo: {
    before: [['happy', 'Um laço while é basicamente um arco de treinamento: só termina quando a condição muda!'], ['think', 'Se esta escola fosse um anime, você seria o protagonista. Eu seria o amigo que explica as regras.']],
  },
  maya: {
    before: [['flustered', 'A-ah! Desculpa, não te vi. Quer dizer, você que não me viu. Tudo bem.'], ['neutral', 'Eu prefiro o laboratório vazio. Dá para ouvir o ventilador dos computadores.']],
    late: [['smile', 'Eu gravei um tutorial de Python. Para ninguém ver. …Você quer ver?']],
  },
  analiu: {
    before: [['flustered', 'Bolinho de feijão. É da receita da minha avó. P-pode pegar dois.'], ['smile', 'O Lucas disse que meu bolinho é o melhor do dormitório. Ele disse isso para todo mundo, mas mesmo assim.']],
  },
  yago: {
    before: [['smirk', 'Eu já fui campeão estadual de Python. Aos nove anos. Mas não gosto de falar disso.'], ['happy', 'Sabia que o diretor é meu tio? De consideração. Ele não sabe ainda.']],
  },
  iris: {
    before: [['smile', 'Que gentil você vir até a Turma A. Sente-se. Você joga xadrez?'], ['smirk', 'O Augusto acha que defender é vencer. Eu acho que ele vai perceber o erro tarde demais. Como sempre.'], ['think', 'Você sabe quem é o Samuel de verdade? Não? Que inveja.']],
    late: [['smirk', 'Você está virando uma peça interessante, {nome}. Cuidado: peças interessantes são as primeiras a serem sacrificadas.']],
  },
  augusto: {
    before: [['cold', 'A Turma A não negocia com a Turma D. Nada pessoal: é estatística.'], ['neutral', 'A Íris arrisca demais. Um dia ela vai perder pontos que não são dela.']],
  },
  leonardo: {
    before: [['smirk', 'O 2º ano é meu, inteiro. Quando eu for presidente, a escola toda vai ser.'], ['happy', 'Você tem cara de quem ganha sozinho. Gosto disso. Volta quando cansar da sua turma.']],
  },
  estela: {
    before: [['happy', 'Olá, aluno da Vésper! Ela te trata bem? Ela não trata ninguém bem, né? Hihi.'], ['smirk', 'A minha Turma B vai vencer a sua. Nada pessoal. Bom, um pouquinho pessoal.']],
  },
  dulce: {
    before: [['smile', 'Chegou o dia 1º? Então hoje a Galeria lota. Volta amanhã que eu separo o seu café.'], ['neutral', 'Tem aluno que gasta o depósito em três dias. Tem aluno que compra a nota da prova. Eu só registro a venda.']],
  },
  zila: {
    before: [['cold', 'Shhh.'], ['neutral', 'Se procura provas antigas, não temos. Se procurasse romances, o corredor 4.']],
  },
  selma: {
    before: [['neutral', 'Você está com olheira de quem passou a noite programando. Vai dormir.'], ['smile', 'Café não é vitamina. Toma uma água.']],
  },
  vitoria: {
    before: [['angry', 'Não me olha assim. Eu não assinei aquele contrato e não vou assinar.'], ['smirk', 'Você luta? Não? Pena. Seria mais rápido resolver as coisas assim.']],
  },
  raquel: {
    before: [['smile', 'Estou lendo um policial em que o detetive é o assassino. Você já leu? Deveria.'], ['think', 'O Dário não é tão burro quanto parece. Ele só prefere que pensem que é.']],
  },
  benicio: {
    before: [['cold', 'A Clara confia em você. Eu não. Ainda.'], ['neutral', 'Se a sua turma tentar algo contra a minha, eu vou saber primeiro.']],
  },
  sayuri: {
    before: [['neutral', 'O regulamento tem dezoito artigos. A maioria dos alunos leu cinco.'], ['cold', 'O vice-presidente não fala pelo Conselho. Por enquanto.']],
  },
  otto: {
    before: [['smirk', 'Conselho? Quinhentos pontos. Esse aqui foi grátis, para você ver a qualidade.'], ['neutral', 'A Helena nunca perdeu. Mas ela já esteve muito perto, uma vez. Essa história custa mil.']],
  },
  diretor: {
    before: [['neutral', 'A matrícula D-40. Acompanho seus números com interesse.'], ['think', 'O Sistema S não pune ninguém. Ele só mostra a cada um o seu valor.']],
  },
};

/** Próxima fala de um personagem. Quem não tem falas próprias responde com a frase do anuário. */
export function hubTalk(id) {
  const cast = CAST[id];
  if (!cast) return [];
  const lines = TALK[id];
  const duel = state.duels[id];
  let pool = null;
  if (lines) {
    if (duel) pool = duel.result === 'win' ? lines.won : lines.honra;
    if (!pool && lines.late && lessonsDoneCount() >= 9) pool = lines.late;
    pool ||= lines.before;
  }
  pool ||= [['neutral', cast.quote || '…']];
  const key = `talk:${id}`;
  const seen = state.flags[key] || 0;
  state.flags[key] = seen + 1;
  save();
  const [expr, text] = pool[seen % pool.length];
  return [say(id, expr, text.replaceAll('{nome}', state.name || 'D-40'))];
}
