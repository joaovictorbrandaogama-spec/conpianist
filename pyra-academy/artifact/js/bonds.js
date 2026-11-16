// Cenas de vínculo. Cada personagem principal tem uma cena escrita para os níveis 1, 4, 7 e 10;
// nos outros encontros, uma conversa curta com uma escolha que agrada (ou não) a pessoa.
import { state } from './state.js';
import { CAST } from './art/characters.js';
import { BONDS } from './life.js';
import { hubTalk } from './story.js';

const N = (text) => ({ who: 'narr', text });
const V = (text) => ({ who: 'voce', text });
const say = (who, expr, text, pos) => ({ who, expr, text, pos });
const pick = (options) => ({ choice: options.map(([text, bonus, ...then]) => ({ text, set: { bonus }, then })) });

export const SCENES = {
  ayumi: {
    1: [
      N('Biblioteca, mesa do fundo. A Ayumi tem três planilhas abertas e um cronograma colado na capa do caderno.'),
      say('ayumi', 'cold', 'Senta. Você concluiu a última aula mais rápido que metade da turma. Quero saber se aprendeu ou se teve sorte.'),
      say('ayumi', 'neutral', 'Explique para mim, sem olhar o código, o que acontece quando o Python encontra um erro de sintaxe.'),
      pick([
        ['Ele nem começa a rodar: lê o arquivo inteiro antes.', 2, say('ayumi', 'think', 'Correto. E pouca gente sabe disso. …Você vai ajudar no grupo de estudos das seis.')],
        ['Ele roda até a linha com erro e para.', 0, say('ayumi', 'cold', 'Errado. Erro de sintaxe impede o programa inteiro de começar. Anote. Grupo de estudos às seis: você vai como aluno.')],
      ]),
      say('ayumi', 'neutral', 'A Turma D não vai subir com boa vontade. Vai subir com método. Eu tenho o método. Você, ao que parece, tem velocidade.'),
    ],
    4: [
      N('A Ayumi está sozinha na biblioteca depois do horário, olhando para o telão do Sistema S pela janela.'),
      say('ayumi', 'cold', 'Sabe o que o Comitê escreveu na minha ficha de admissão? «Capacidade acadêmica: Turma A. Capacidade de trabalho em grupo: insuficiente.»'),
      say('ayumi', 'angry', 'Eu pedi revisão. Negada. Fui parar na Turma D por um critério que nem é uma nota.'),
      pick([
        ['Então a Turma D é o seu exame de trabalho em grupo.', 2, say('ayumi', 'surprised', '…'), say('ayumi', 'think', 'Isso é irritantemente lógico.')],
        ['Você vai conseguir subir sozinha.', 0, say('ayumi', 'neutral', 'Era o que eu pensava em abril.')],
      ]),
      say('ayumi', 'neutral', 'Esquece o que eu disse. …Não, não esquece. Só não conta para o Caio.'),
    ],
    7: [
      N('O grupo de estudos das seis agora ocupa três mesas. O Ítalo corrige o Caio; a Nina desenha fluxogramas para o Davi.'),
      say('caio', 'happy', 'Representante! Acertei o desafio bônus. Pode anotar na sua planilha de humilhação.', 'left'),
      say('ayumi', 'flustered', 'Não é planilha de humilhação. É planilha de progresso.', 'right'),
      { clear: true },
      say('ayumi', 'think', 'Em abril, eu achava que um líder era a pessoa que sabia mais. Agora eu acho que é a pessoa que faz os outros saberem.'),
      pick([
        ['Você virou uma líder de verdade.', 2, say('ayumi', 'flustered', 'N-não exagera. …Obrigada.')],
        ['Ainda acho que você sabe mais.', 1, say('ayumi', 'smirk', 'Também acho. Mas não é mais o ponto.')],
      ]),
    ],
    10: [
      N('A Ayumi pede para você ir até a sala vazia. No quadro, ela escreveu um plano para o resto do ano. No topo: «Turma A».'),
      say('ayumi', 'neutral', 'O regulamento permite que cada turma registre um representante e um vice no Conselho. Eu quero registrar o seu nome.'),
      say('ayumi', 'flustered', 'Eu queria chegar à Turma A sozinha, para provar que o Comitê errou. Agora eu quero chegar com eles. Com você.'),
      say('ayumi', 'smile', 'Plano B: sempre existe um plano B. Mas você é o plano A.'),
    ],
  },

  caio: {
    1: [
      N('Terraço, intervalo. O Caio tem um cronômetro na mão e dois notebooks abertos.'),
      say('caio', 'smirk', 'Corrida de digitação, Quarenta. Quem escrever um FizzBuzz primeiro ganha o pastel do outro.'),
      N('Você perde por onze segundos. Mas o seu roda de primeira; o dele, na terceira tentativa.'),
      say('caio', 'think', '…Como você leu aquele erro tão rápido? Eu olho para o vermelho e só vejo vermelho.'),
      pick([
        ['A última linha do erro diz o tipo. Começa por ela.', 2, say('caio', 'surprised', 'A última? Eu sempre lia a primeira!'), say('caio', 'happy', 'Tá. Amanhã tem revanche. Com leitura de erro.')],
        ['Sorte.', 0, say('caio', 'angry', 'Sorte nada. Amanhã eu descubro sozinho.')],
      ]),
    ],
    4: [
      N('O Caio aparece com o rosto vermelho e a gravata torta. Atrás dele, o Leandro, da Turma C, ri no corredor.'),
      say('caio', 'angry', 'Ele me empurrou primeiro! Agora a Turma C abriu queixa na Comissão Disciplinar e quem vai perder pontos somos nós!'),
      say('caio', 'cold', 'Ninguém viu. Só as câmeras. E as câmeras dizem o que a escola quiser.'),
      pick([
        ['Vou atrás da gravação. Câmeras não mentem.', 2, say('caio', 'surprised', 'Você… vai mesmo? Por mim?')],
        ['Você não podia ter revidado.', 0, say('caio', 'angry', 'Eu sei! …Eu sei. Valeu pelo sermão.')],
      ]),
    ],
    7: [
      N('O Fábio, da Turma C, vendeu a informação por 3.000 pp: a câmera 14 pisca, mas a 15 pega o mesmo corredor por outro ângulo.'),
      N('Na audiência, a gravação mostra o Leandro empurrando primeiro. A queixa é arquivada.'),
      say('caio', 'flustered', 'Eu… nunca ninguém tinha ido atrás de nada por mim. Eu sempre corri sozinho.'),
      say('caio', 'smirk', 'Se alguém perguntar, eu ia resolver sozinho. Mas agora eu te devo um pastel. Dois.'),
      pick([
        ['Paga em aula de digitação.', 2, say('caio', 'happy', 'Fechado. Você vai digitar tão rápido que vai ler o erro antes de errar.')],
        ['Não precisa pagar nada.', 1, say('caio', 'neutral', 'Precisa sim. É assim que eu funciono.')],
      ]),
    ],
    10: [
      N('Resultado da prova mensal no telão. Nota de corte: 40. Caio Montenegro: 41.'),
      say('caio', 'happy', 'QUARENTA E UM! Um ponto! Eu passei por UM PONTO!'),
      say('caio', 'think', 'Sabe o que eu percebi? Eu não preciso ser o mais rápido da sala. Eu preciso ser o que chega.'),
      say('caio', 'smile', 'Corrida de revezamento, Quarenta. Daqui até a Turma A, eu passo o bastão pra você e você passa pra mim.'),
    ],
  },

  samuel: {
    1: [
      N('Noite. O terraço do dormitório está vazio, exceto pelo Samuel, sentado no parapeito como se não houvesse altura.'),
      say('samuel', 'neutral', 'Você também não dorme. …Quer saber por que eu tiro sempre a média?'),
      say('samuel', 'think', 'Porque ninguém olha para o meio. O primeiro lugar é vigiado. O último também. O meio é invisível.'),
      pick([
        ['E por que você está me contando?', 2, say('samuel', 'smirk', 'Boa pergunta. Talvez porque você está subindo rápido demais para ser invisível. E eu queria ver isso de perto.')],
        ['Isso parece cansativo.', 1, say('samuel', 'neutral', 'É menos cansativo do que ser visto.')],
      ]),
    ],
    4: [
      N('O Samuel mostra a tela do celular: uma partida de xadrez terminada em xeque-mate. Ele apaga em seguida.'),
      say('samuel', 'neutral', 'Eu cresci num lugar sem janelas. Paredes cinzentas, horário para tudo, nenhum fim de semana.'),
      say('samuel', 'think', 'Aqui eu posso escolher o almoço. Parece pouco. Não é.'),
      pick([
        ['O que você escolheu hoje?', 2, say('samuel', 'smile', '…Curry. Duas vezes. Ninguém me impediu.')],
        ['Que lugar era esse?', 0, say('samuel', 'cold', 'Um lugar que não existe. Esquece.')],
      ]),
    ],
    7: [
      N('O Samuel está no mesmo lugar de sempre, mas hoje não olha para o céu. Olha para a janela da diretoria, acesa.'),
      say('samuel', 'neutral', 'A Íris me reconheceu. Ela viu, há oito anos, o lugar onde eu fui criado. Do outro lado de um vidro.'),
      say('samuel', 'think', 'Me ensinaram tudo que dá para medir. Eu vim para cá aprender o que não dá. Ter um amigo, por exemplo. Considere isso um experimento.'),
      pick([
        ['Então eu sou cobaia?', 2, say('samuel', 'smirk', 'A melhor que eu tive.'), say('samuel', 'smile', 'Foi uma piada. Estou praticando.')],
        ['Experimentos podem dar errado.', 1, say('samuel', 'neutral', 'Por isso eles valem a pena.')],
      ]),
    ],
    10: [
      N('Na noite em que o homem de terno visita o diretor, o Samuel não sobe ao terraço. Ele bate na sua porta.'),
      say('samuel', 'cold', 'Ele veio me lembrar que eu sou um resultado. Que resultados voltam para o laboratório quando o experimento acaba.'),
      say('samuel', 'neutral', 'Eu não vou voltar. Se um dia eu sumir, não foi escolha minha. Lembre disso.'),
      say('samuel', 'smile', 'Obrigado, {nome}. Por ser o meu ponto fora da curva.'),
    ],
  },

  kiara: {
    1: [
      N('Salão do dormitório, quase meia-noite. A Kiara aparece com um saco de salgadinhos e o sorriso de sempre.'),
      say('kiara', 'happy', 'Ainda acordado? Que bom! Me conta tudo: de onde você veio, quem eram seus amigos, como entrou aqui…'),
      N('As perguntas não param. São muitas, e muito precisas.'),
      pick([
        ['Você pergunta como quem toma nota.', 1, say('kiara', 'surprised', '…Eu? Haha! Você é engraçado.'), say('kiara', 'smile', 'Eu só gosto de saber das pessoas. De todas.')],
        ['Responder com calma e devolver as perguntas.', 2, say('kiara', 'flustered', 'Ah… ninguém nunca pergunta de volta.'), say('kiara', 'smile', 'Outro dia eu conto. Prometo!')],
      ]),
    ],
    4: [
      N('Escada de incêndio, tarde da noite. Um barulho de metal. A Kiara chuta a lixeira de novo, e de novo.'),
      say('kiara', 'angry', 'Todo mundo é tão… IRRITANTE. O Yago mente, a Ayumi manda, o Valentim se acha. E eu sorrio. Sorrio. Sorrio!'),
      N('Ela vira e vê você. Em meio segundo, o rosto volta ao normal.'),
      say('kiara', 'smile', 'Você não viu nada, né? A gente é amigo.'),
      pick([
        ['Vi. E está tudo bem.', 2, say('kiara', 'surprised', '…Tudo bem?'), say('kiara', 'cold', 'Ninguém nunca disse isso. Normalmente vão embora.')],
        ['Eu não vi nada.', 1, say('kiara', 'smile', 'Ótimo. Eu sabia que podia contar com você.')],
      ]),
    ],
    7: [
      N('A Kiara chama você para o terraço. Sem salgadinhos, sem sorriso.'),
      say('kiara', 'cold', 'Na minha escola antiga, a minha turma acabou. Alguém publicou os segredos de todo mundo num blog. Os pais tiraram os filhos, os professores pediram demissão.'),
      say('kiara', 'neutral', 'Fui eu. Eu sabia de tudo porque todo mundo me contava tudo. Um dia eu cansei de ser a única que guardava.'),
      pick([
        ['Obrigado por me contar.', 2, say('kiara', 'flustered', 'Você é muito estranho, sabia? …Eu precisava que alguém soubesse e não fosse embora.')],
        ['Isso foi cruel.', 1, say('kiara', 'cold', 'Foi. Eu sei. Eu sei melhor que todo mundo.')],
      ]),
    ],
    10: [
      N('A Kiara está no salão do dormitório, sentada no sofá, sem fazer nada. Só esperando.'),
      say('kiara', 'neutral', 'Eu ainda vou sorrir para todo mundo. É assim que eu sobrevivo aqui.'),
      say('kiara', 'smile', 'Mas com você eu posso parar de sorrir. Isso é… descansar. Eu não sabia que dava.'),
      say('kiara', 'smirk', 'E se você contar para alguém, eu acabo com você. Com carinho.'),
    ],
  },

  lara: {
    1: [
      N('Galeria Jacarandá. A Lara arrasta você por três lojas antes de parar numa vitrine de pulseiras.'),
      say('lara', 'happy', 'Regra da Lara número um: ponto parado é ponto triste. Regra número dois: contato vale mais que ponto.'),
      say('lara', 'think', 'Olha só. Aquela ali da Turma B? Namora o goleiro. Aquele da A? Deve 40 mil pro Dário. Eu sei porque eu pergunto.'),
      pick([
        ['Você conhece o campus inteiro.', 2, say('lara', 'smile', 'Conheço! E agora o campus inteiro vai conhecer você. De nada.')],
        ['Isso não é fofoca?', 0, say('lara', 'flustered', 'É informação social. É diferente. Totalmente.')],
      ]),
    ],
    4: [
      N('Saindo da Galeria, a Lara para. Duas alunas da Turma C a cercam perto da escada rolante.'),
      say('jade', 'smirk', 'A Lara deve dois mil para a gente desde maio. Juros de dez por cento ao dia. Já fez a conta?', 'left'),
      say('lara', 'smile', 'Ha… claro, eu pago amanhã, gente!', 'right'),
      pick([
        ['Pagar a dívida dela na hora.', 1, N('Você transfere o valor. A Jade dá de ombros e sai.')],
        ['Pedir o contrato por escrito. Sem contrato, sem dívida.', 2, say('jade', 'cold', 'Tsc. Esperta demais.', 'left'), N('Não há contrato. Elas vão embora.')],
      ]),
      { clear: true },
      say('lara', 'flustered', 'Você… não precisava. Mas obrigada. De verdade.'),
    ],
    7: [
      N('O terraço da Galeria, fim de tarde. A Lara mexe no copo de suco sem beber.'),
      say('lara', 'neutral', 'No fundamental, eu era a garota que ficava sozinha no recreio. Tinha um grupo que… bom. Que fazia questão que eu ficasse.'),
      say('lara', 'smile', 'Aí eu decidi que no ensino médio eu ia ser a mais popular. Popularidade é armadura, entende?'),
      pick([
        ['Você não precisa de armadura comigo.', 2, say('lara', 'flustered', 'Que frase de novela… mas funcionou.')],
        ['Armadura que funciona é armadura boa.', 1, say('lara', 'think', 'É. É sim. Só pesa um pouco.')],
      ]),
    ],
    10: [
      N('A Lara entrega a você uma pulseira igual à dela, daquela primeira vitrine.'),
      say('lara', 'happy', 'Eu escolhi você como armadura. …Brincadeira. Escolhi como amigo. Melhor amigo, até.'),
      say('lara', 'smirk', 'E a Dona Dulce já sabe: amigo da Lara paga menos. Contato vale mais que ponto, lembra?'),
    ],
  },

  kurisu: {
    1: [
      N('Laboratório 404, depois das dez. Gráficos de ondas cerebrais cobrem as três telas.'),
      say('kurisu', 'neutral', 'Esses são os seus dados das aulas: quanto tempo você passa em cada erro antes de acertar.'),
      say('kurisu', 'think', 'Hipótese: você aprende mais quando erra do que quando acerta. A curva sobe depois de cada resposta errada.'),
      pick([
        ['Então errar é bom?', 2, say('kurisu', 'smirk', 'Errar e entender o erro é bom. Errar e chutar de novo é só ruído.')],
        ['Você está me espionando?', 1, say('kurisu', 'flustered', 'É COLETA DE DADOS. Com consentimento! …Você assinou o termo. Página doze.')],
      ]),
    ],
    4: [
      N('A Kurisu está de pé, braços cruzados, encarando um registro de rede na tela.'),
      say('kurisu', 'angry', 'Os registros do laboratório estão saindo da ilha. Toda noite, às três da manhã, para um servidor sem nome.'),
      say('kurisu', 'cold', 'Eu não autorizei isso. A diretoria diz que é «backup». Backup não precisa de criptografia militar.'),
      pick([
        ['Vamos descobrir para onde vai.', 2, say('kurisu', 'smirk', 'Hmph. Finalmente alguém com método. Hipótese, experimento, conclusão.')],
        ['Talvez seja só backup mesmo.', 0, say('kurisu', 'cold', 'Talvez. E talvez a Terra seja plana. Teste antes de acreditar.')],
      ]),
    ],
    7: [
      N('Três noites de rastreamento depois, a Kurisu mostra um único nome na tela: «PROJETO TÁBULA — AVALIAÇÃO EXTERNA».'),
      say('kurisu', 'neutral', 'Uma instituição que cria crianças para aprender rápido. Eles estão usando os dados dos alunos daqui como grupo de comparação.'),
      say('kurisu', 'angry', 'Ciência sem ética é só crueldade com planilha. Cortei o envio. Se perguntarem, foi uma falha de hardware.'),
      pick([
        ['Você arriscou seu cargo por nós.', 2, say('kurisu', 'flustered', 'Por vocês? Pelos DADOS. Pela integridade dos dados! …E por vocês. Um pouco.')],
        ['Isso pode dar problema.', 1, say('kurisu', 'smirk', 'Vai dar. Vale a pena.')],
      ]),
    ],
    10: [
      N('A Kurisu desliga as três telas pela primeira vez desde que você a conhece.'),
      say('kurisu', 'neutral', 'O meu semestre aqui acaba no ano que vem. O artigo está quase pronto.'),
      say('kurisu', 'flustered', 'Você é o melhor resultado do meu experimento. N-não no sentido de cobaia! No sentido de… Hmph. Esquece.'),
      say('kurisu', 'smile', 'De agora em diante, quando você travar, a sua pergunta passa na frente da fila. Considere isso um agradecimento científico.'),
    ],
  },

  vesper: {
    1: [
      N('Corredor do primeiro andar, nove da noite. A professora Vésper encontra você saindo da biblioteca.'),
      say('vesper', 'neutral', 'D-40. O horário de estudo terminou há uma hora. Por que ainda está aqui?'),
      pick([
        ['Porque eu ainda não entendi o exercício.', 2, say('vesper', 'think', 'Resposta honesta. Raro.'), say('vesper', 'smirk', 'Quinze minutos. Eu fico.')],
        ['Porque eu quero o primeiro lugar.', 1, say('vesper', 'cold', 'Todos querem. Volte para o dormitório.')],
      ]),
    ],
    4: [
      N('Sala dos professores, porta entreaberta. A Vésper e a professora Estela discutem em voz baixa.'),
      say('estela', 'smirk', 'Você ainda acha que eu te traí naquele exame, Vésper? Faz vinte anos.', 'left'),
      say('vesper', 'cold', 'Eu não acho. Eu sei.', 'right'),
      { clear: true },
      say('vesper', 'neutral', '…Você ouviu. Tudo bem. No meu primeiro ano, num Exame Especial, alguém precisava ser sacrificado. Ela me escolheu.'),
      pick([
        ['E você perdoou?', 1, say('vesper', 'think', 'Perdoar não é o verbo. Eu entendi. É pior.')],
        ['Foi por isso que você virou professora da Turma D?', 2, say('vesper', 'smirk', 'Você pergunta as coisas certas. Isso vai te dar problemas.')],
      ]),
    ],
    7: [
      N('A Vésper deixa você ver a planilha dela: cada aluno da Turma D, com anotações à mão.'),
      say('vesper', 'neutral', 'Eu via os alunos como peças. Quais avançam, quais se sacrificam. Era o que essa escola me ensinou.'),
      say('vesper', 'think', 'Ao lado do seu nome eu escrevi, em maio: «variável». Ontem eu risquei e escrevi outra coisa.'),
      pick([
        ['O que você escreveu?', 2, say('vesper', 'smirk', 'Não é da sua conta. …«Aposta».')],
        ['Ainda sou uma peça?', 1, say('vesper', 'cold', 'Todos somos. Algumas escolhem para onde andam.')],
      ]),
    ],
    10: [
      N('A Vésper põe um cartão antigo, amarelado, sobre a mesa. Um ID estudantil de vinte anos atrás.'),
      say('vesper', 'neutral', 'Turma D. Primeiro ano. Nunca tinha programado. Vaga aberta por expulsão no primeiro mês.'),
      N('No cartão, a matrícula: D-40.'),
      say('vesper', 'smile', 'O Comitê não erra, {nome}. Ele aposta. Há vinte anos, apostou em mim. Este ano, quando alguém da Turma A indicou o seu nome, eu assinei embaixo.'),
    ],
  },

  bia: {
    1: [
      N('Lanchonete da Galeria. A Bia empurra um pastel na sua direção como quem fecha um negócio.'),
      say('bia', 'smirk', 'Um pastel, uma informação. Hoje: a Turma C tem um contrato. Dezoito assinaturas. O Dário recebe parte do depósito de cada um.'),
      pick([
        ['Pagar com outro pastel e pedir mais.', 2, say('bia', 'happy', 'Cliente bom! Quem escreve os planos do Dário é o Hiro. Ninguém sabe. Agora você sabe.')],
        ['Como você descobriu?', 1, say('bia', 'think', 'Fonte não se revela. Pastel se come.')],
      ]),
    ],
    4: [
      N('A Bia abre um caderno cheio de nomes, setas e cifrões.'),
      say('bia', 'think', 'Minha rede tem gente nas quatro turmas. Mas tem um boato que eu não consigo confirmar: dizem que alguém da Turma A está vendendo informação para a C.'),
      pick([
        ['Aposto no Mateus Toledo.', 2, say('bia', 'surprised', '…Era a minha aposta também. Você está aprendendo rápido.')],
        ['Pergunte direto para a Turma A.', 0, say('bia', 'cold', 'Nunca pergunte direto. É o primeiro mandamento.')],
      ]),
      say('bia', 'smile', 'Toma. Uma Pista limpa. Cortesia da casa, para o próximo exame.'),
    ],
    7: [
      say('bia', 'neutral', 'Sabe por que eu vendo informação para todas as turmas?'),
      say('bia', 'think', 'Porque assim todas precisam de mim. Ninguém expulsa quem todo mundo precisa.'),
      say('bia', 'smile', 'Mas tem uma coisa que eu nunca vendi: nada sobre a Turma D. Lealdade é a única mercadoria que eu não ponho na vitrine.'),
      pick([
        ['Nem sobre mim?', 2, say('bia', 'smirk', 'Principalmente sobre você. Você vale muito.')],
        ['Isso é bonito.', 1, say('bia', 'flustered', 'É estratégico. Bonito é coincidência.')],
      ]),
    ],
    10: [
      N('A Bia entrega o caderno de contatos inteiro. Cada página tem um nome e um preço.'),
      say('bia', 'smile', 'Se um dia eu for expulsa, isso fica com você. Até lá, a rede é nossa.'),
      say('bia', 'happy', 'E toma a sua parte dos lucros. Informante que se preze divide com o sócio.'),
    ],
  },

  valentim: {
    1: [
      N('Terraço. O Valentim está deitado numa espreguiçadeira que ninguém sabe de onde veio, de óculos escuros.'),
      say('valentim', 'smirk', 'Você está fazendo sombra em mim. A não ser que tenha vindo admirar. Nesse caso, pode ficar à direita.'),
      pick([
        ['Seu código de ontem foi bonito mesmo.', 2, say('valentim', 'happy', 'Finalmente alguém com olhos! Uma linha. Uma compreensão de lista. Perfeição.')],
        ['Por que você não se esforça pela turma?', 0, say('valentim', 'neutral', 'Porque a turma não se esforça por mim. Simetria.')],
      ]),
    ],
    4: [
      say('valentim', 'think', 'Você se pergunta por que eu ignoro os Pontos de Classe. Eu vou responder porque estou de bom humor.'),
      say('valentim', 'smirk', 'Minha família tem mais dinheiro que este campus. Eu não preciso da Turma A. A Turma A é que não tem um Valentim.'),
      pick([
        ['E o que você quer daqui, então?', 2, say('valentim', 'neutral', '…Ninguém nunca me perguntou isso.'), say('valentim', 'smile', 'Algo que eu não possa comprar. Ainda não achei.')],
        ['Isso é arrogância.', 1, say('valentim', 'happy', 'É precisão.')],
      ]),
    ],
    7: [
      N('Laboratório de informática, tarde. Você encontra o Valentim sentado ao lado da Maya, explicando dicionários. Devagar. Com paciência.'),
      say('valentim', 'surprised', 'Você não viu isto.'),
      say('maya', 'flustered', 'E-ele explica muito bem…', 'left'),
      pick([
        ['Não vi nada. Bonito, aliás.', 2, say('valentim', 'smirk', 'Óbvio que foi bonito. Tudo que eu faço é.')],
        ['Então você se importa com a turma!', 1, say('valentim', 'cold', 'Eu me importo com dicionários mal usados.')],
      ]),
    ],
    10: [
      say('valentim', 'neutral', 'Fiz uma lista das pessoas mais interessantes desta escola.'),
      say('valentim', 'smirk', 'Você está em segundo lugar. O primeiro, obviamente, eu.'),
      say('valentim', 'smile', 'Considere isso o maior elogio que alguém da família Castelo Branco já fez. Agora sim, encontrei algo que não dá para comprar.'),
    ],
  },

  clara: {
    1: [
      N('Sala da Turma B, depois da aula. A Clara acena da porta antes que você passe direto.'),
      say('clara', 'smile', 'Ei! O nosso grupo de estudos é aberto para todas as turmas. Hoje é sobre laços. Quer entrar?'),
      say('benicio', 'cold', 'Clara, ele é da turma que vamos enfrentar.', 'right'),
      pick([
        ['Aceitar e levar bolinhos da Ana.', 2, say('clara', 'happy', 'Bolinho! O Benício vai fingir que não gostou e comer cinco.')],
        ['Agradecer, mas recusar.', 0, say('clara', 'smile', 'Tudo bem! A porta continua aberta.')],
      ]),
    ],
    4: [
      N('Galeria, prateleira de itens gratuitos. A Clara está colocando macarrão instantâneo na cesta. Ela congela quando vê você.'),
      say('clara', 'flustered', 'Ah! Não é… quer dizer, é. Eu transfiro todos os meus pontos para o fundo comum da turma. Todo mês.'),
      say('clara', 'neutral', 'Se a representante come de graça, ninguém tem vergonha de comer de graça. Faz sentido?'),
      pick([
        ['Faz. Mas alguém devia cuidar de você também.', 2, say('clara', 'surprised', '…Ninguém nunca disse isso.')],
        ['Seu segredo está seguro.', 1, say('clara', 'smile', 'Obrigada. Sério.')],
      ]),
    ],
    7: [
      N('O jornalzinho da Elisa traz uma manchete: «Representante da Turma B esconde dívida milionária?».'),
      say('clara', 'cold', 'Não é dívida. É o fundo. Mas ninguém vai ler a matéria inteira.'),
      pick([
        ['Mostrar o extrato do fundo para a Elisa.', 2, N('A Elisa publica uma correção no dia seguinte. A Turma B aplaude a Clara no refeitório.')],
        ['Ignorar. Boato morre sozinho.', 1, N('O boato demora uma semana para morrer. A Clara sorri a semana inteira, cansada.')],
      ]),
      say('clara', 'smile', 'Obrigada por ficar do meu lado. Mesmo sendo de outra turma.'),
    ],
    10: [
      say('clara', 'smile', 'A Turma B é a minha família. Eu faria tudo por eles.'),
      say('clara', 'happy', 'Mas família também pode ter amigos fora de casa, né? Você é o meu.'),
      say('clara', 'think', 'O fundo comum votou: um presente para quem ajudou a Turma B sem pedir nada. Unânime. Até o Benício.'),
    ],
  },

  dario: {
    1: [
      N('Corredor do segundo andar. O Dário bloqueia a passagem com o braço na parede.'),
      say('dario', 'smirk', 'D-40. Tenho uma proposta: você assina o meu contrato, me passa vinte por cento do depósito, e eu deixo a sua turma em paz.'),
      pick([
        ['Não.', 2, say('dario', 'happy', 'Ha! Resposta curta. Gosto de gente que não tem medo.')],
        ['Vou pensar.', 0, say('dario', 'cold', 'Quem pensa já perdeu. Pensa rápido.')],
      ]),
    ],
    4: [
      say('dario', 'think', 'Me responde uma coisa. Quem manda na Turma D de verdade?'),
      say('dario', 'neutral', 'A Ayumi faz barulho. Você sobe no ranking. Mas alguém da sua turma está mexendo as peças sem aparecer. Eu sinto o cheiro.'),
      pick([
        ['Ninguém manda. A gente decide junto.', 2, say('dario', 'smirk', 'Mentira bonita. Mas você acredita nela, e isso é interessante.')],
        ['Talvez seja eu.', 1, say('dario', 'happy', 'Hah! Talvez. Vou descobrir.')],
      ]),
    ],
    7: [
      N('O Dário está no terraço com um olho roxo. Ninguém da Turma C fala sobre isso.'),
      say('dario', 'cold', 'Eu fui atrás de quem mexe as peças da sua turma. Achei. Perdi.'),
      say('dario', 'think', 'Sabe o que é engraçado? Foi a primeira vez que eu senti medo. Eu passei a vida procurando isso.'),
      pick([
        ['E agora?', 2, say('dario', 'smirk', 'Agora eu quero vencer quem me deu medo. Isso é o mais perto de felicidade que eu chego.')],
        ['Você mereceu.', 1, say('dario', 'happy', 'Mereci. É por isso que foi bom.')],
      ]),
    ],
    10: [
      say('dario', 'neutral', 'Trégua, D-40. A Turma C para de cobrar a sua turma.'),
      say('dario', 'smirk', 'Não é amizade. É respeito. Amizade eu não sei fazer. Respeito eu pago em pontos.'),
    ],
  },

  iris: {
    1: [
      N('Biblioteca, mesa de xadrez. A Íris arruma as peças sem olhar para o tabuleiro.'),
      say('iris', 'smile', 'Sente-se. Brancas para você: é uma cortesia que eu faço para quem eu ainda não conheço.'),
      N('Xeque-mate em nove lances.'),
      pick([
        ['De novo.', 2, say('iris', 'happy', 'De novo! Ah, você é do tipo que volta. Eu gosto desse tipo.')],
        ['Você nem olhou o tabuleiro.', 1, say('iris', 'smirk', 'Eu olhei você. É mais rápido.')],
      ]),
    ],
    4: [
      say('iris', 'think', 'Tenho um problema no coração desde que nasci. Nunca corri, nunca joguei bola. Então eu aprendi a fazer os outros correrem.'),
      say('iris', 'neutral', 'Dizem que gênio nasce. Eu acho que gênio é o que sobra quando tiram todo o resto de você.'),
      pick([
        ['Ou o que você escolhe ser.', 2, say('iris', 'smile', 'Que resposta otimista. Eu vou fingir que concordo, só hoje.')],
        ['Isso é triste.', 1, say('iris', 'cold', 'É eficiente.')],
      ]),
    ],
    7: [
      say('iris', 'neutral', 'Oito anos atrás, meu pai me levou a um lugar sem placa. Um vidro, uma sala cinzenta e sem janelas do outro lado, e um menino resolvendo um tabuleiro inteiro sem levantar os olhos.'),
      say('iris', 'smirk', 'Eu reconheci o rosto dele no primeiro dia de aula. Ele finge que não me reconheceu. Os dois sabemos que é mentira.'),
      pick([
        ['O que você quer dele?', 2, say('iris', 'smile', 'Provar que um gênio feito perde para um gênio nascido. Só isso. Só tudo.')],
        ['Deixa ele em paz.', 1, say('iris', 'cold', 'Paz não é algo que ele conheça. Nem eu.')],
      ]),
    ],
    10: [
      say('iris', 'smile', 'Quando eu derrotar o Samuel, quero que você esteja assistindo.'),
      say('iris', 'think', 'E se ele vencer… quero que seja você a me contar. Os outros iam sentir pena. Você, não.'),
      say('iris', 'happy', 'É estranho ter um amigo em outra turma. Meu pai não aprovaria. Mais um motivo.'),
    ],
  },
};

// ---------- encontros comuns ----------
const LIKE_TEXT = {
  ouvir: 'Ouvir sem interromper.',
  piada: 'Fazer uma piada para aliviar.',
  elogio: 'Elogiar o que a pessoa fez.',
  desafio: 'Desafiar: «aposto que eu faço melhor».',
  segredo: 'Contar algo que ninguém sabe sobre você.',
  ciencia: 'Puxar assunto de programação.',
};
const GOOD = [['smile', 'Foi bom passar a tarde assim. Sério.'], ['happy', 'Hah! Você é melhor companhia do que parece.'], ['flustered', 'Ninguém costuma fazer isso por mim…']];
const MEH = [['neutral', 'Hm. Tá.'], ['think', 'Não era bem o que eu queria ouvir, mas tudo bem.'], ['cold', '…Certo.']];
const rand = (list) => list[Math.floor(Math.random() * list.length)];

export function genericHangout(id) {
  const bond = BONDS[id];
  const cast = CAST[id];
  const keys = Object.keys(LIKE_TEXT).filter((k) => k !== bond.likes).sort(() => Math.random() - 0.5).slice(0, 2);
  const options = [bond.likes, ...keys].sort(() => Math.random() - 0.5);
  const [line] = hubTalk(id);
  const good = rand(GOOD);
  const meh = rand(MEH);
  return [
    { bg: bond.place, clear: true },
    N(`Você passa um tempo com ${cast.full}.`),
    line,
    { choice: options.map((k) => ({ text: LIKE_TEXT[k], set: { bonus: k === bond.likes ? 2 : 0 }, then: [say(id, ...(k === bond.likes ? good : meh))] })) },
  ];
}

/** Cena para o próximo encontro: a escrita, se houver uma para o nível que vai abrir, ou a comum. */
export function hangoutScene(id, nextRank, authored) {
  const scene = authored ? SCENES[id]?.[nextRank] : null;
  if (scene) return [{ bg: BONDS[id].place, clear: true }, ...scene];
  return genericHangout(id);
}
export const hasScene = (id, rank) => !!SCENES[id]?.[rank] && !state.seen[`${id}:${rank}`];
