// Lore da Academia Pyra: o Regulamento (regras do Sistema S) e os Arquivos, que se abrem
// conforme o ano avança, os exames acontecem e os vínculos crescem.

export const SCHOOL = {
  name: 'Instituto Nacional de Formação Avançada · Ilha Pyra',
  short: 'Academia Pyra',
  founded: 2014,
  students: 480,
  perClass: 40,
};

// Artigos do regulamento. Ficam na Biblioteca, aba Regulamento.
export const RULES = [
  { n: 1, title: 'Da finalidade', text: 'A Academia Pyra foi criada pelo Ministério da Ciência para formar a próxima geração de líderes em tecnologia do país. Seus alunos são selecionados pelo Comitê de Admissão por critérios que não são divulgados.' },
  { n: 2, title: 'Da promessa', text: 'Os alunos que se formarem na Turma A têm vaga garantida em qualquer universidade ou empresa que escolherem, no país ou fora dele. Os demais recebem o diploma, e só.' },
  { n: 3, title: 'Do isolamento', text: 'Durante os três anos, nenhum aluno deixa a ilha e nenhum contato com o exterior é permitido: sem ligações, sem mensagens, sem internet fora da PyraNet. Exceções exigem autorização do diretor, que nunca autoriza.' },
  { n: 4, title: 'Das turmas', text: 'Cada ano tem quatro turmas de quarenta alunos. A letra de cada turma (A, B, C ou D) é definida pelos Pontos de Classe e muda quando uma turma ultrapassa outra. Os alunos não mudam de turma: a turma é que muda de letra.' },
  { n: 5, title: 'Dos Pontos de Classe', text: 'Todas as turmas começam o ano com 1.000 Pontos de Classe (CP). Atrasos, faltas, conversas em aula, uso de celular e desempenho em provas alteram o saldo. Os critérios exatos não são informados aos alunos.' },
  { n: 6, title: 'Dos pontos privados', text: 'No dia 1º de cada mês, cada aluno recebe em seu ID estudantil os Pontos de Classe da sua turma multiplicados por 100, em pontos privados (pp). Um ponto privado equivale a um real dentro do campus.' },
  { n: 7, title: 'Do que se compra', text: 'Tudo no campus pode ser comprado com pontos privados. Tudo. Inclusive o que não está à venda na Galeria.' },
  { n: 8, title: 'Das transferências entre alunos', text: 'Pontos privados podem ser transferidos livremente entre alunos de qualquer turma e de qualquer ano. Contratos entre alunos são válidos e o Conselho Estudantil os registra.' },
  { n: 9, title: 'Da mudança de turma', text: 'Um aluno pode mudar de turma pagando 20.000.000 pp ao Conselho, ou sendo aceito por outra turma que pague o valor por ele.' },
  { n: 10, title: 'Dos itens gratuitos', text: 'A Galeria Jacarandá mantém uma prateleira de itens gratuitos (alimentos básicos, produtos de higiene) para alunos sem saldo, com limite mensal. Ninguém passa fome na Academia, mas todo mundo vê quem está pegando.' },
  { n: 11, title: 'Da vigilância', text: 'O campus tem câmeras em todas as áreas comuns. As gravações são usadas pela Comissão Disciplinar para registrar faltas e atribuir Pontos de Classe.' },
  { n: 12, title: 'Dos Exames Especiais', text: 'Ao longo do ano, a escola aplica Exames Especiais com regras próprias, divulgadas no dia. Eles movem Pontos de Classe entre as turmas e podem resultar em expulsão.' },
  { n: 13, title: 'Da expulsão', text: 'Um aluno é expulso quando reprova em uma prova obrigatória, quando seu Mérito termina o ano em último lugar ou quando o regulamento de um Exame Especial assim determinar. A turma do expulso perde Pontos de Classe.' },
  { n: 14, title: 'Do Ponto de Proteção', text: 'Um Ponto de Proteção, concedido em casos raros por um Exame Especial, anula uma expulsão. Ele é pessoal e intransferível.' },
  { n: 15, title: 'Da vaga aberta', text: 'Quando um aluno é expulso no primeiro mês, o Comitê de Admissão pode ocupar a vaga com um novo aluno. Isso aconteceu uma única vez antes deste ano.' },
  { n: 16, title: 'Do Conselho Estudantil', text: 'O Conselho Estudantil administra contratos, propõe regras de Exames Especiais e tem voz na Comissão Disciplinar. Seu presidente é eleito pelos alunos do 2º e do 3º ano.' },
  { n: 17, title: 'Dos clubes', text: 'Clubes com pelo menos três membros recebem uma sala e verba em pontos privados. Clubes não rendem Pontos de Classe, mas o Conselho observa quem os frequenta.' },
  { n: 18, title: 'Das provas', text: 'Provas escritas mensais têm nota de corte. Quem fica abaixo é expulso. Uma nota mais alta na prova pode ser comprada com pontos privados, desde que alguém tenha a coragem de perguntar o preço.' },
];

// Arquivos: fragmentos de lore. `unlock` recebe um resumo do progresso.
// p = { chapter, lessons, duels: {id: 'win'|'honra'}, bond: (id) => rank, letter }
export const FILES = [
  {
    id: 'carta', title: 'A carta sem remetente', tag: 'Pessoal',
    unlock: () => true, hint: '',
    text: '«Abriu uma vaga na Turma D. Ela é sua. Apresente-se no dia 1º.» O papel tem o brasão da Academia em relevo e nenhuma assinatura. O envelope foi entregue em mãos, por um homem que não quis dizer o nome.',
  },
  {
    id: 'expulso', title: 'O primeiro expulso', tag: 'Turma D',
    unlock: (p) => p.lessons >= 2, hint: 'Conclua 2 aulas.',
    text: 'Antes de você, a matrícula D-40 era de um garoto chamado Rodrigo. Ele durou vinte e nove dias. Segundo a Bia, foi pego vendendo respostas da avaliação diagnóstica para a Turma C. Segundo o Dário, ele «quebrou um contrato». Os dois podem estar dizendo a verdade.',
  },
  {
    id: 'mil-pontos', title: 'Como se perde mil pontos', tag: 'Sistema S',
    unlock: (p) => p.lessons >= 4, hint: 'Conclua 4 aulas.',
    text: 'Ata da Comissão Disciplinar, abril: Turma D, primeiro ano. 98 atrasos, 391 conversas e celulares em aula, 27 faltas, média 31 na diagnóstica. Desconto total: 1.000 CP. Observação manuscrita da orientadora: «Eles vão aprender. Ou vão embora.»',
  },
  {
    id: 'provas-antigas', title: 'O arquivo que não existe', tag: 'Biblioteca',
    unlock: (p) => p.chapter >= 2, hint: 'Chegue ao capítulo 2.',
    text: 'Pedro Nakamura, da Turma B, descobriu em junho: as provas mensais do primeiro ano repetem as perguntas de anos anteriores com outros números. Dona Zilá guarda as antigas numa caixa que «não existe». Comprar uma cópia custa 15.000 pp de um aluno do 3º ano. A regra 18 permite. Ninguém fala disso em voz alta.',
  },
  {
    id: 'faccoes', title: 'As duas Turmas A', tag: 'Turma A',
    unlock: (p) => p.chapter >= 3, hint: 'Chegue ao capítulo 3.',
    text: 'A Turma A tem duas facções desde o primeiro dia. Augusto Bragança lidera os conservadores: não perder pontos, não arriscar, não confiar em ninguém de fora. Íris Valadares lidera os agressivos: tirar pontos das outras turmas antes que elas cresçam. Sora não pertence a nenhuma das duas. As duas tentam recrutá-lo toda semana.',
  },
  {
    id: 'contrato', title: 'Contrato nº 1 da Turma C', tag: 'Turma C',
    unlock: (p) => p.duels.yuki, hint: 'Enfrente o Exame Especial de junho.',
    text: '«Cláusula 1: cada signatário transfere 20.000 pp por mês ao responsável. Cláusula 4: o responsável decide quem participa dos Exames Especiais. Cláusula 7: é proibido conversar com alunos da Turma D sem autorização.» Assinado por dezoito alunos da Turma C. Responsável: Dário Falcão. Testemunha: Prof. Saulo Bento.',
  },
  {
    id: 'ilha', title: 'Relatório do Exame da Ilha', tag: 'Exame Especial',
    unlock: (p) => p.duels.theo, hint: 'Enfrente o Exame Especial de julho.',
    text: 'Exame de sobrevivência, uma semana, ilha ao lado do campus. Cada turma recebeu 300 pontos de exame para gastar em comida, barracas e água. Cada turma tinha um líder secreto; descobrir o líder de outra turma valia 50 pontos. A Turma D terminou com mais pontos do que gastou porque alguém leu o regulamento até a última página.',
  },
  {
    id: 'cruzeiro', title: 'Os Doze Grupos do Cruzeiro', tag: 'Exame Especial',
    unlock: (p) => p.duels.bianca, hint: 'Enfrente o Exame Especial de agosto.',
    text: 'No navio de volta, os 160 alunos foram divididos em doze grupos misturando as quatro turmas. Em cada grupo havia um «alvo» escolhido pela escola. Quem descobrisse o alvo ganhava pontos; quem errasse perdia. A Bianca acertou nove dos doze. Ninguém sabe como ela soube dos outros três.',
  },
  {
    id: 'festival', title: 'Placar do Festival Esportivo', tag: 'Exame Especial',
    unlock: (p) => p.duels.sora, hint: 'Enfrente o Exame Especial de setembro.',
    text: 'Times Vermelho (Turmas A e D) contra Branco (Turmas B e C). O Vermelho venceu por quatro pontos. No revezamento final, o Samuel correu contra Helena Sarmento, presidente do Conselho, e perdeu por um passo. Quem viu de perto diz que ele diminuiu o ritmo nos últimos dez metros.',
  },
  {
    id: 'helena', title: 'A presidente invicta', tag: 'Conselho',
    unlock: (p) => p.chapter >= 6, hint: 'Chegue ao capítulo 6.',
    text: 'Helena Sarmento é presidente do Conselho desde o fim do primeiro ano. Nunca perdeu um Exame Especial. Tem um irmão mais novo que não passou no processo de admissão, e ela não fala dele. Leonardo Vasconcelos quer o cargo dela e já tem os votos do 2º ano inteiro.',
  },
  {
    id: 'vesper', title: 'Ficha antiga: Vésper Albuquerque', tag: 'Equipe',
    unlock: (p) => p.bond('vesper') >= 5, hint: 'Vínculo com Vésper no nível 5.',
    text: 'Matrícula de vinte anos atrás: Vésper Albuquerque, Turma D. Formada na Turma A. Ao lado da ficha, uma anotação do comitê: «primeira transferência de D para A sem pagamento». Colega de turma: Estela Rangel, formada na Turma B. As duas não se falaram por cinco anos.',
  },
  {
    id: 'tabula', title: 'Projeto Tábula', tag: 'Confidencial',
    unlock: (p) => p.bond('samuel') >= 5, hint: 'Vínculo com Samuel no nível 5.',
    text: 'Instalação privada no continente, sem placa na porta. Crianças são criadas desde os primeiros anos para aprender qualquer coisa mais rápido que qualquer pessoa. Programação, idiomas, luta, xadrez. Não há férias nem visitas. Um único aluno da geração 4 completou o currículo e foi embora antes da avaliação final. O registro dele foi apagado. O sobrenome que ele usa agora é comum o bastante para não chamar atenção.',
  },
  {
    id: 'iris', title: 'O que a Íris sabe', tag: 'Turma A',
    unlock: (p) => p.bond('samuel') >= 8 || p.duels.sora === 'win', hint: 'Vínculo com Samuel no nível 8, ou vença o exame de setembro.',
    text: 'O diretor Valadares visitou o Projeto Tábula uma vez, há oito anos, e levou a filha. Íris viu, através de um vidro, um garoto da idade dela resolver um tabuleiro de xadrez inteiro sem levantar os olhos. Ela nunca esqueceu o rosto. Ela o reconheceu no primeiro dia de aula.',
  },
  {
    id: 'kiara', title: 'A escola de onde a Kiara veio', tag: 'Turma D',
    unlock: (p) => p.bond('kiara') >= 7, hint: 'Vínculo com Kiara no nível 7.',
    text: 'Antes da Academia, a turma da Kiara foi dissolvida no meio do ano. Os colegas trocaram de escola, os professores pediram demissão, e um blog anônimo publicou os segredos de todo mundo. Ninguém nunca provou quem escreveu o blog. Ninguém, além dela, sabe que o blog tinha só um autor.',
  },
  {
    id: 'clube', title: 'Ata do Clube de Código Criativo', tag: 'Clubes',
    unlock: (p) => !!p.monika, hint: 'Visite o Clube de Código Criativo.',
    text: 'Integrantes registrados: Monika (3º ano). Data de fundação: em branco. Verba: zero pp, porque ela nunca pediu. Observação da secretária do Conselho: «Ninguém lembra de ter aprovado este clube. Ninguém lembra de ter reprovado também. A sala está sempre arrumada.»',
  },

];

export const CLASS_LORE = {
  a: 'A turma que nunca perdeu um ponto por descuido. Dividida entre os conservadores de Augusto e os agressivos de Íris; Sora observa os dois lados.',
  b: 'A turma unida. Clara conhece cada colega pelo nome e mantém um fundo comum para que ninguém fique sem almoço.',
  c: 'Governada por contrato. Dário recebe uma parte do depósito de cada signatário e decide quem participa de cada exame.',
  d: 'Os «defeituosos». Queimaram os mil pontos iniciais em um mês. Agora têm uma representante com plano para tudo, um excêntrico, uma simpática demais e você.',
};
