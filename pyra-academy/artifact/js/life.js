// Vida no campus: tempo livre (tardes e noites), os cinco atributos e os vínculos com arcanos.
// As aulas nunca gastam tempo livre: cada aula concluída é que dá mais tempo livre.
import { state, save, lessonsDoneCount } from './state.js';
import { chapters } from './content/index.js';
import { CAST } from './art/characters.js';

// ---------- atributos ----------
export const STATS = [
  { key: 'int', name: 'Intelecto', color: '#4fd8ff', ranks: ['Mediano', 'Estudioso', 'Afiado', 'Brilhante', 'Gênio'], text: 'Sobe com exercícios resolvidos e horas de estudo. Alguns vínculos só se aprofundam com Intelecto.' },
  { key: 'cal', name: 'Sangue-frio', color: '#e8173f', ranks: ['Nervoso', 'Controlado', 'Calculista', 'Gélido', 'Imperturbável'], text: 'Sobe com Exames Especiais, apostas e o clube de xadrez. Alguns vínculos exigem nervos de aço.' },
  { key: 'dis', name: 'Disciplina', color: '#5eea9a', ranks: ['Relapso', 'Pontual', 'Constante', 'Incansável', 'Inabalável'], text: 'Sobe com aulas concluídas, treinos e noites bem dormidas.' },
  { key: 'emp', name: 'Empatia', color: '#ff7ab8', ranks: ['Distante', 'Atento', 'Acolhedor', 'Confidente', 'Pilar da turma'], text: 'Sobe com vínculos e com o reforço da turma. Abre as conversas mais difíceis.' },
  { key: 'car', name: 'Carisma', color: '#ffc93c', ranks: ['Invisível', 'Notado', 'Persuasivo', 'Magnético', 'Lendário'], text: 'Sobe com debates, bicos e vitórias públicas. Rende mais pontos nos bicos da Galeria.' },
];
const STAT_STEPS = [0, 8, 20, 36, 56];

/** Pontos de um atributo: parte vem do progresso nas aulas e exames, parte das atividades. */
export function statPoints(key) {
  const extra = state.stats[key] || 0;
  const done = lessonsDoneCount();
  const passed = Object.values(state.ex).filter((e) => e?.passed).length;
  const duels = Object.values(state.duels);
  const wins = duels.filter((d) => d.result === 'win').length;
  if (key === 'int') return extra + passed;
  if (key === 'cal') return extra + duels.length * 3 + wins * 2 + duels.filter((d) => d.bet).length * 2;
  if (key === 'dis') return extra + done * 2;
  if (key === 'emp') return extra + Object.keys(BONDS).reduce((sum, id) => sum + bondRank(id), 0);
  if (key === 'car') return extra + wins * 3;
  return extra;
}
export const statRank = (key) => STAT_STEPS.filter((step) => statPoints(key) >= step).length;
export const statNext = (key) => STAT_STEPS[statRank(key)] ?? null;
export const statName = (key) => { const s = STATS.find((x) => x.key === key); return `${s.name} ${statRank(key)} · ${s.ranks[statRank(key) - 1]}`; };
export function addStat(key, amount) {
  const before = statRank(key);
  state.stats[key] = (state.stats[key] || 0) + amount;
  save();
  return statRank(key) > before ? statRank(key) : 0;
}

// ---------- tempo livre ----------
const facedCount = () => chapters.filter((c) => state.duels[c.rival]).length;
export function slots() {
  const done = lessonsDoneCount();
  const bonusVesper = [4, 7, 10].filter((r) => bondRank('vesper') >= r).length;
  const aft = 2 + done + facedCount() * 2 + bonusVesper - (state.used.aft || 0);
  const night = 1 + done + facedCount() - (state.used.night || 0);
  return { aft: Math.max(0, aft), night: Math.max(0, night) };
}
export function spend(kind) {
  if (slots()[kind] <= 0) return false;
  state.used[kind] = (state.used[kind] || 0) + 1;
  state.daylog.push(kind);
  if (state.daylog.length > 60) state.daylog.shift();
  save();
  return true;
}
export const PERIOD = { aft: 'Depois da aula', night: 'Noite' };

// ---------- vínculos ----------
// Arcanos maiores. `when`: em que período a pessoa pode ser encontrada. `open`: quando o vínculo fica disponível.
const ch = (n) => () => chapters.filter((c) => state.duels[c.rival]).length + 1 >= n;
export const BONDS = {
  davi: { n: 0, arcana: 'O Louco', place: 'classroom', when: 'aft', likes: 'piada' },
  bia: { n: 1, arcana: 'O Mago', place: 'mall', when: 'aft', likes: 'segredo' },
  kurisu: { n: 2, arcana: 'A Sacerdotisa', place: 'lab', when: 'night', likes: 'ciencia', open: () => !!state.flags.metKurisu },
  iris: { n: 3, arcana: 'A Imperatriz', place: 'library', when: 'aft', likes: 'desafio', open: ch(5), gates: { 4: ['int', 3], 7: ['cal', 4] } },
  leonardo: { n: 4, arcana: 'O Imperador', place: 'council', when: 'aft', likes: 'desafio', open: ch(6), gates: { 1: ['car', 3] } },
  vesper: { n: 5, arcana: 'O Hierofante', place: 'hall', when: 'aft', likes: 'ouvir', gates: { 4: ['dis', 2], 7: ['dis', 4] } },
  lara: { n: 6, arcana: 'Os Amantes', place: 'mall', when: 'aft', likes: 'elogio' },
  caio: { n: 7, arcana: 'O Carro', place: 'rooftop', when: 'aft', likes: 'desafio' },
  ayumi: { n: 8, arcana: 'A Justiça', place: 'library', when: 'aft', likes: 'ouvir', gates: { 7: ['int', 3] } },
  samuel: { n: 9, arcana: 'O Eremita', place: 'rooftop', when: 'night', likes: 'ouvir', gates: { 4: ['cal', 2], 7: ['cal', 3] } },
  yuki: { n: 10, arcana: 'A Roda da Fortuna', place: 'library', when: 'aft', likes: 'ciencia', open: ch(2) },
  jonas: { n: 11, arcana: 'A Força', place: 'gate', when: 'aft', likes: 'desafio' },
  icaro: { n: 12, arcana: 'O Enforcado', place: 'dorm', when: 'night', likes: 'piada' },
  sora: { n: 13, arcana: 'A Morte', place: 'rooftop', when: 'aft', likes: 'ouvir', open: ch(5), gates: { 1: ['int', 3] } },
  nina: { n: 14, arcana: 'A Temperança', place: 'library', when: 'aft', likes: 'elogio' },
  dario: { n: 15, arcana: 'O Diabo', place: 'hall', when: 'aft', likes: 'desafio', open: ch(2), gates: { 4: ['cal', 3] } },
  maya: { n: 16, arcana: 'A Torre', place: 'dorm', when: 'night', likes: 'segredo' },
  clara: { n: 17, arcana: 'A Estrela', place: 'classroom', when: 'aft', likes: 'elogio', open: ch(3) },
  kiara: { n: 18, arcana: 'A Lua', place: 'dorm', when: 'night', likes: 'elogio', gates: { 4: ['emp', 2], 7: ['emp', 3] } },
  valentim: { n: 19, arcana: 'O Sol', place: 'rooftop', when: 'aft', likes: 'elogio', gates: { 1: ['car', 2] } },
  helena: { n: 20, arcana: 'O Julgamento', place: 'council', when: 'aft', likes: 'ouvir', open: ch(6), gates: { 1: ['cal', 3] } },
  lucas: { n: 21, arcana: 'O Mundo', place: 'gate', when: 'aft', likes: 'ouvir' },
};
export const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
export const MAX_RANK = 10;
export const RANK_STEPS = [0, 1, 3, 5, 8, 11, 14, 18, 22, 26, 30];

export const bondPoints = (id) => state.bonds[id] || 0;
export function bondRank(id) {
  if (!BONDS[id]) return 0;
  const pts = bondPoints(id);
  return RANK_STEPS.filter((step, rank) => rank > 0 && pts >= step).length;
}
export const bondOpen = (id) => !!BONDS[id] && (BONDS[id].open ? BONDS[id].open() : true);
/** O atributo exigido para subir ao próximo nível, se ainda faltar. */
export function bondGate(id) {
  const next = bondRank(id) + 1;
  const gate = BONDS[id]?.gates?.[next];
  if (!gate) return null;
  const [key, level] = gate;
  return statRank(key) >= level ? null : { key, level, name: STATS.find((s) => s.key === key).name };
}
/** O vínculo está parado esperando um atributo: outro encontro não renderia nada. */
export function bondBlocked(id) {
  const gate = bondGate(id);
  if (!gate) return null;
  return bondPoints(id) >= RANK_STEPS[bondRank(id) + 1] - 1 ? gate : null;
}
/** Soma pontos de vínculo. Não passa do limite do próximo nível se um atributo ainda barrar a subida. */
export function addBond(id, amount) {
  const before = bondRank(id);
  if (before >= MAX_RANK) return 0;
  const gate = bondGate(id);
  let pts = bondPoints(id) + amount;
  if (gate) pts = Math.min(pts, RANK_STEPS[before + 1] - 1);
  state.bonds[id] = pts;
  save();
  const after = bondRank(id);
  return after > before ? after : 0;
}
export const rankProgress = (id) => {
  const r = bondRank(id);
  if (r >= MAX_RANK) return 1;
  const a = RANK_STEPS[r];
  const b = RANK_STEPS[r + 1];
  return (bondPoints(id) - a) / (b - a);
};

// Benefícios por nível (texto mostrado no cartão de vínculo).
export const PERKS = {
  kurisu: { 4: 'Revisão por pares: ganha um Gabarito comentado.', 7: 'Segunda revisão: ganha outro Gabarito comentado.', 10: 'Hipótese confirmada: +6 de Intelecto.' },
  ayumi: { 4: 'Plano B: nos Exames Especiais, o adversário entrega 20 segundos depois.', 7: 'Plano C: o adversário entrega 40 segundos depois.', 10: 'Plano final: o adversário entrega 60 segundos depois.' },
  caio: { 7: 'Treino de velocidade: nos Exames Especiais, o adversário entrega mais 10 segundos depois.', 10: 'Revezamento: +6 de Disciplina.' },
  samuel: { 7: 'Leitura fria: +6 de Sangue-frio.', 10: 'Ponto fora da curva: +6 de Intelecto.' },
  kiara: { 7: 'Rede de amizades: +6 de Carisma.', 10: 'Sem máscara: +6 de Empatia.' },
  valentim: { 10: 'Patrocínio Castelo Branco: ganha 50.000 pp.' },
  lara: { 3: 'Amizade de vitrine: 10% de desconto na Galeria.', 7: 'Cliente preferencial: 20% de desconto na Galeria.', 10: 'Influência: 30% de desconto na Galeria.' },
  bia: { 4: 'Fonte quente: ganha uma Pista limpa.', 7: 'Dossiê: ganha outra Pista limpa e um Minuto extra.', 10: 'Rede de informantes: ganha 30.000 pp.' },
  vesper: { 4: 'Tempo de estudo: +1 tarde livre.', 7: 'Confiança: +1 tarde livre.', 10: 'Orientação: +1 tarde livre.' },
  clara: { 4: 'Grupo aberto: ganha um Gabarito comentado.', 10: 'Fundo comum: ganha 50.000 pp.' },
  dario: { 4: 'Empréstimo sem juros (raríssimo): ganha 30.000 pp.', 10: 'Trégua: a Turma C para de cobrar a sua turma por um mês. Ganha 60.000 pp.' },
};
export const perkAt = (id, rank) => PERKS[id]?.[rank] || (rank === MAX_RANK ? 'Vínculo máximo: +4 de Empatia.' : '');

/** Aplica o que um novo nível dá de imediato (itens e pontos). */
export function grantPerk(id, rank) {
  const give = (item, n = 1) => { state.items[item] = (state.items[item] || 0) + n; };
  if (id === 'bia' && rank === 4) give('pista');
  if (id === 'bia' && rank === 7) { give('pista'); give('minuto'); }
  if (id === 'bia' && rank === 10) state.pp += 30000;
  if (id === 'clara' && rank === 4) give('gabarito');
  if (id === 'clara' && rank === 10) state.pp += 50000;
  if (id === 'dario' && rank === 4) state.pp += 30000;
  if (id === 'dario' && rank === 10) state.pp += 60000;
  if (id === 'kurisu' && (rank === 4 || rank === 7)) give('gabarito');
  const stat = (key, n) => { state.stats[key] = (state.stats[key] || 0) + n; };
  if (id === 'kurisu' && rank === 10) stat('int', 6);
  if (id === 'caio' && rank === 10) stat('dis', 6);
  if (id === 'samuel' && rank === 7) stat('cal', 6);
  if (id === 'samuel' && rank === 10) stat('int', 6);
  if (id === 'kiara' && rank === 7) stat('car', 6);
  if (id === 'kiara' && rank === 10) stat('emp', 6);
  if (id === 'valentim' && rank === 10) state.pp += 50000;
  if (rank === MAX_RANK && !PERKS[id]?.[MAX_RANK]) state.stats.emp = (state.stats.emp || 0) + 4;
  save();
}

/** Desconto na Galeria pelo vínculo com a Lara. */
export const shopDiscount = () => (bondRank('lara') >= 10 ? 0.3 : bondRank('lara') >= 7 ? 0.2 : bondRank('lara') >= 3 ? 0.1 : 0);
/** Segundos a mais para o adversário nos Exames Especiais (vínculo com a Ayumi). */
export const duelBonusSeconds = () => (bondRank('ayumi') >= 10 ? 60 : bondRank('ayumi') >= 7 ? 40 : bondRank('ayumi') >= 4 ? 20 : 0) + (bondRank('caio') >= 7 ? 10 : 0);

// ---------- atividades ----------
// Cada uma gasta um período e rende atributos, pontos ou um vínculo.
export const ACTIVITIES = [
  { id: 'biblioteca', when: 'aft', place: 'library', who: 'zila', name: 'Estudar na Biblioteca', text: 'Duas horas com os livros que a Dona Zilá deixa você pegar.', gain: { int: 3 } },
  { id: 'xadrez', when: 'aft', place: 'classroom', who: 'yasmin', name: 'Clube de xadrez', text: 'A Yasmin joga devagar e pensa rápido. Você aprende a esperar.', gain: { cal: 3 } },
  { id: 'debate', when: 'aft', place: 'council', who: 'rafael', name: 'Clube de debate', text: 'O Rafael refuta você em três pontos. Na próxima, você refuta um.', gain: { car: 3 } },
  { id: 'reforco', when: 'aft', place: 'classroom', who: 'lucas', name: 'Reforço da Turma D', text: 'Você explica o que aprendeu para quem ficou para trás.', gain: { emp: 2, int: 1 }, bond: 'lucas' },
  { id: 'corrida', when: 'aft', place: 'gate', who: 'jonas', name: 'Treino de corrida', text: 'Cinco voltas no portão com o Jonas. Ele faz dez.', gain: { dis: 3 }, bond: 'jonas' },
  { id: 'bico', when: 'aft', place: 'mall', who: 'dulce', name: 'Bico na Galeria', text: 'Repor prateleiras para a Dona Dulce. O pagamento cai na hora.', gain: { dis: 1, car: 1 }, pp: 4000 },
  { id: 'quarto', when: 'night', place: 'dorm', who: null, name: 'Estudar no quarto', text: 'Revisar a aula do dia com o caderno aberto e a luz baixa.', gain: { int: 2, dis: 1 } },
  { id: 'livro', when: 'night', place: 'dorm', who: null, name: 'Ler um romance', text: 'Um policial que a Raquel emprestou. O detetive mente para o leitor.', gain: { emp: 2, car: 1 } },
  { id: 'dormir', when: 'night', place: 'dorm', who: null, name: 'Dormir cedo', text: 'Oito horas, como a Enfermeira Selma manda.', gain: { dis: 3 } },
];

// ---------- progresso resumido para a lore ----------
export function loreProgress() {
  const duels = {};
  for (const [id, d] of Object.entries(state.duels)) duels[id] = d.result;
  return { chapter: facedCount() + 1, lessons: lessonsDoneCount(), duels, bond: bondRank, monika: !!state.flags.metMonika };
}

export const bondName = (id) => CAST[id]?.full || id;
