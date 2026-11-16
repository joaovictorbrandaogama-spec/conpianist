// Agenda: tempo livre depois da aula e à noite, atributos e vínculos (cartas de arcano).
import { $, $$, esc, icon, toast, sfx } from './util.js';
import { state, save, calendar } from './state.js';
import { CAST, avatar, portrait } from './art/characters.js';
import {
  STATS, statPoints, statRank, statNext, addStat, slots, spend, PERIOD, BONDS, ROMAN, MAX_RANK, bondRank, bondPoints,
  bondOpen, bondGate, bondBlocked, addBond, rankProgress, perkAt, grantPerk, ACTIVITIES, RANK_STEPS,
} from './life.js';
import { hangoutScene, hasScene } from './bonds.js';
import { playScene } from './vn.js';

const num = (value) => value.toLocaleString('pt-BR');

/** Cartão de arcano (usado na agenda, no anuário e na subida de nível). */
export function arcanaCard(id, { big = false } = {}) {
  const bond = BONDS[id];
  const cast = CAST[id];
  const rank = bondRank(id);
  const open = bondOpen(id);
  return `<span class="arcana ${big ? 'big' : ''} ${open ? '' : 'sealed'} ${rank >= MAX_RANK ? 'max' : ''}" style="--glow:${cast.color}">
    <span class="arcana-n">${ROMAN[bond.n]}</span>
    <span class="arcana-face">${open ? avatar(id, rank >= 7 ? 'smile' : 'neutral') : icon('lock')}</span>
    <span class="arcana-name">${esc(bond.arcana)}</span>
    <span class="arcana-who">${open ? esc(cast.name) : '???'}</span>
    <span class="arcana-rank" aria-label="Nível ${rank} de ${MAX_RANK}">${Array.from({ length: MAX_RANK }, (_, i) => `<i class="${i < rank ? 'on' : ''}"></i>`).join('')}</span>
  </span>`;
}

/** Passa um período com alguém. Devolve true se o tempo foi gasto. */
export async function hangout(id, kind) {
  if (!bondOpen(id)) { toast('Ainda não dá para se aproximar dessa pessoa.'); return false; }
  if (bondRank(id) >= MAX_RANK) {
    if (!spend(kind)) { toast(`Sem ${kind === 'aft' ? 'tardes' : 'noites'} livres. Conclua uma aula para ganhar mais tempo.`); return false; }
    await playScene(hangoutScene(id, MAX_RANK, false));
    addStat('emp', 1);
    toast(`Vínculo máximo com ${CAST[id].name}. +1 de Empatia.`, 'gold');
    return true;
  }
  const blocked = bondBlocked(id);
  if (blocked) { toast(`Para se aproximar mais de ${CAST[id].name}, você precisa de ${blocked.name} ${blocked.level}. Nenhum tempo foi gasto.`); return false; }
  if (!spend(kind)) { toast(`Sem ${kind === 'aft' ? 'tardes' : 'noites'} livres. Conclua uma aula para ganhar mais tempo.`); return false; }
  const before = bondRank(id);
  const next = before + 1;
  const gate = bondGate(id);
  const authored = !gate && hasScene(id, next) && bondPoints(id) + 3 >= RANK_STEPS[next];
  const picked = await playScene(hangoutScene(id, next, authored));
  let gain = 1 + (Number(picked.bonus) || 0);
  if (authored) {
    state.seen[`${id}:${next}`] = true;
    gain = Math.max(gain, RANK_STEPS[next] - bondPoints(id));
  }
  // No máximo um nível por encontro: a história de cada vínculo não pula capítulos.
  const ceiling = (RANK_STEPS[next + 1] ?? Infinity) - 1;
  gain = Math.max(0, Math.min(gain, ceiling - bondPoints(id)));
  addBond(id, gain);
  const after = bondRank(id);
  if (after > before) {
    for (let r = before + 1; r <= after; r++) grantPerk(id, r);
    await playScene([{ card: { id, rank: after, perks: Array.from({ length: after - before }, (_, i) => perkAt(id, before + 1 + i)).filter(Boolean) } }]);
  } else if (gate) {
    toast(`Para aprofundar o vínculo com ${CAST[id].name}, você precisa de ${gate.name} ${gate.level}.`);
  } else {
    toast(gain >= 3 ? `${CAST[id].name} gostou muito da conversa.` : `Vínculo com ${CAST[id].name} um pouco mais forte.`);
  }
  return true;
}

/** Faz uma atividade comum. */
export async function doActivity(activity) {
  if (!spend(activity.when)) { toast('Sem tempo livre nesse período. Conclua uma aula para ganhar mais.'); return false; }
  const lines = [{ bg: activity.place, clear: true }, { who: 'narr', text: activity.text }];
  if (activity.who && CAST[activity.who]?.skin) lines.push({ who: activity.who, expr: 'smile', text: CAST[activity.who].quote });
  await playScene(lines);
  const ups = [];
  for (const [key, amount] of Object.entries(activity.gain)) {
    const up = addStat(key, amount);
    const stat = STATS.find((s) => s.key === key);
    if (up) ups.push(`${stat.name} subiu para o nível ${up}: ${stat.ranks[up - 1]}`);
  }
  if (activity.pp) {
    const pay = Math.round(activity.pp * (1 + (statRank('car') - 1) * 0.25));
    state.pp += pay;
    save();
    toast(`+${num(pay)} pp pelo bico.`, 'gold');
  }
  if (activity.bond) addBond(activity.bond, 1);
  const gains = Object.entries(activity.gain).map(([key, amount]) => `+${amount} ${STATS.find((s) => s.key === key).name}`).join(' · ');
  toast(ups.length ? ups.join('. ') : gains, ups.length ? 'gold' : '');
  if (ups.length) sfx.play('title');
  return true;
}

// ---------- gráfico de atributos ----------
function radar() {
  const size = 260;
  const c = size / 2;
  const r = 96;
  const point = (i, value) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / STATS.length;
    return [c + Math.cos(angle) * r * value, c + Math.sin(angle) * r * value];
  };
  const rings = [0.2, 0.4, 0.6, 0.8, 1].map((v) => `<polygon points="${STATS.map((_, i) => point(i, v).join(',')).join(' ')}" class="radar-ring"/>`).join('');
  const shape = STATS.map((s, i) => point(i, Math.max(0.12, statRank(s.key) / 5)).join(',')).join(' ');
  const labels = STATS.map((s, i) => {
    const [x, y] = point(i, 1.24);
    return `<text x="${x}" y="${y}" class="radar-label" fill="${s.color}">${s.name.toUpperCase()}</text><text x="${x}" y="${y + 15}" class="radar-level">${statRank(s.key)}</text>`;
  }).join('');
  return `<svg class="radar" viewBox="-30 -20 ${size + 60} ${size + 40}" role="img" aria-label="Seus atributos">${rings}
    ${STATS.map((_, i) => `<line x1="${c}" y1="${c}" x2="${point(i, 1)[0]}" y2="${point(i, 1)[1]}" class="radar-axis"/>`).join('')}
    <polygon points="${shape}" class="radar-shape"/>${labels}</svg>`;
}

// =============================== AGENDA ===============================
export function agenda(main, tabName, ctx) {
  const tab = ['tempo', 'vinculos', 'atributos'].includes(tabName) ? tabName : 'tempo';
  const free = slots();
  const cal = calendar();
  const bondIds = Object.keys(BONDS).sort((a, b) => BONDS[a].n - BONDS[b].n);

  const timeTab = () => ['aft', 'night'].map((kind) => {
    const people = bondIds.filter((id) => bondOpen(id) && BONDS[id].when === kind);
    const acts = ACTIVITIES.filter((a) => a.when === kind);
    return `<section class="period reveal ${free[kind] ? '' : 'empty'}" style="--d:${kind === 'aft' ? 2 : 3}">
      <header class="period-head"><span class="period-ic">${icon(kind === 'aft' ? 'clock' : 'bed')}</span><div><p class="eyebrow">${PERIOD[kind].toUpperCase()}</p><h2>${free[kind]} ${kind === 'aft' ? (free[kind] === 1 ? 'tarde livre' : 'tardes livres') : (free[kind] === 1 ? 'noite livre' : 'noites livres')}</h2></div></header>
      <div class="acts">
        ${acts.map((a) => `<button type="button" class="act" data-act="${a.id}" ${free[kind] ? '' : 'disabled'}><span class="act-ic">${icon('star')}</span><span><strong>${esc(a.name)}</strong><small>${esc(a.text)}</small><em>${Object.entries(a.gain).map(([k, v]) => `+${v} ${STATS.find((s) => s.key === k).name}`).join(' · ')}${a.pp ? ` · +${num(a.pp)} pp` : ''}</em></span></button>`).join('')}
      </div>
      <p class="eyebrow small">${icon('users')} PASSAR TEMPO COM ALGUÉM</p>
      <div class="people">${people.map((id) => { const blocked = bondBlocked(id); return `<button type="button" class="person ${blocked ? 'blocked' : ''}" data-hang="${id}" data-kind="${kind}" ${free[kind] && !blocked ? '' : 'disabled'} style="--glow:${CAST[id].color}">
          <span class="mate-face">${avatar(id)}</span><span><strong>${esc(CAST[id].name)}</strong><small>${blocked ? `${icon('lock')} precisa de ${esc(blocked.name)} ${blocked.level}` : `${ROMAN[BONDS[id].n]} · ${esc(BONDS[id].arcana)} · nível ${bondRank(id)}`}</small></span>
          ${hasScene(id, bondRank(id) + 1) && !bondGate(id) ? '<i class="spark" title="Há algo novo para descobrir">!</i>' : ''}</button>`; }).join('') || '<p class="fine">Ninguém disponível neste período ainda.</p>'}</div>
    </section>`;
  }).join('');

  const statsTab = () => `<div class="stats-grid">
    <div class="radar-box reveal" style="--d:2">${radar()}</div>
    <div class="stat-list reveal" style="--d:3">${STATS.map((s) => {
    const rank = statRank(s.key);
    const next = statNext(s.key);
    const pts = statPoints(s.key);
    return `<article class="stat" style="--glow:${s.color}"><header><strong>${s.name}</strong><b>${rank}</b><span>${s.ranks[rank - 1]}</span></header>
      <div class="bar"><i style="width:${next ? Math.min(100, (pts / next) * 100) : 100}%"></i></div>
      <small>${next ? `${pts} de ${next} para «${s.ranks[rank]}»` : 'Nível máximo'} · ${esc(s.text)}</small></article>`;
  }).join('')}</div></div>`;

  const bondsTab = () => `<p class="fine reveal">Vinte e dois arcanos, vinte e duas pessoas. Cada nível de vínculo abre uma conversa nova, e alguns níveis dão vantagens nos exames, na Galeria e nos seus atributos.</p>
    <div class="arcana-grid">${bondIds.map((id, i) => `<button type="button" class="arcana-btn reveal" style="--d:${Math.min(i, 10)}" data-bond="${id}">${arcanaCard(id)}</button>`).join('')}</div>
    <div class="profile" id="bond-detail" hidden></div>`;

  main.innerHTML = `
  <section class="page agenda">
    <header class="page-head reveal"><p class="eyebrow">AGENDA · ${cal.day} DE ${cal.month.toUpperCase()} · ${cal.weekday}</p><h1>Tempo livre também é estratégia.</h1>
      <p>As aulas nunca gastam o seu tempo: cada aula concluída é que libera <strong>uma tarde e uma noite</strong>, e cada Exame Especial libera mais duas tardes. Use para estudar, treinar, ganhar pontos ou se aproximar das pessoas.</p></header>
    <div class="slots reveal" style="--d:1"><span>${icon('clock')}<b>${free.aft}</b> ${free.aft === 1 ? 'tarde' : 'tardes'}</span><span>${icon('bed')}<b>${free.night}</b> ${free.night === 1 ? 'noite' : 'noites'}</span><span>${icon('star')}<b>${STATS.reduce((s, x) => s + statRank(x.key), 0)}</b> níveis de atributo</span><span>${icon('users')}<b>${bondIds.reduce((s, id) => s + bondRank(id), 0)}</b> níveis de vínculo</span></div>
    <nav class="subtabs reveal" aria-label="Seções da agenda">${[['tempo', 'Tempo livre'], ['vinculos', 'Vínculos'], ['atributos', 'Atributos']].map(([id, label]) => `<a href="#agenda/${id}" class="${id === tab ? 'active' : ''}">${label}</a>`).join('')}</nav>
    ${{ tempo: timeTab, vinculos: bondsTab, atributos: statsTab }[tab]()}
  </section>`;

  const repaint = () => agenda(main, tab, ctx);
  $$('[data-act]', main).forEach((button) => { button.onclick = async () => { await doActivity(ACTIVITIES.find((a) => a.id === button.dataset.act)); repaint(); }; });
  $$('[data-hang]', main).forEach((button) => { button.onclick = async () => { if (await hangout(button.dataset.hang, button.dataset.kind)) repaint(); }; });
  $$('[data-bond]', main).forEach((button) => { button.onclick = () => bondDetail(button.dataset.bond, repaint); });
  ctx?.setTutorContext?.(() => ({ mode: 'agenda (tempo livre, vínculos e atributos)' }));
}

function bondDetail(id, repaint) {
  const el = $('#bond-detail');
  const cast = CAST[id];
  const bond = BONDS[id];
  const open = bondOpen(id);
  const rank = bondRank(id);
  const gate = bondGate(id);
  const free = slots();
  const perks = Object.entries({ ...Object.fromEntries(Array.from({ length: MAX_RANK }, (_, i) => [i + 1, perkAt(id, i + 1)])) }).filter(([, text]) => text);
  el.style.setProperty('--glow', cast.color);
  el.innerHTML = `<div class="profile-card" role="dialog" aria-label="Vínculo com ${esc(cast.full)}">
    <button type="button" class="icon-btn profile-close" aria-label="Fechar">${icon('x')}</button>
    <div class="profile-art">${open ? portrait(id, rank >= 7 ? 'smile' : 'neutral') : ''}${arcanaCard(id, { big: true })}</div>
    <div class="profile-body">
      <p class="eyebrow">ARCANO ${ROMAN[bond.n]} · ${esc(bond.arcana.toUpperCase())}</p>
      <h2>${open ? esc(cast.full) : 'Vínculo selado'}</h2>
      ${open ? `<p class="profile-tag">${esc(cast.tag || cast.role)} · encontrada ${bond.when === 'aft' ? 'depois da aula' : 'à noite'}</p><p>${esc(cast.bio)}</p>
      <div class="profile-bond"><span>NÍVEL ${rank}/${MAX_RANK}</span><div class="bar"><i style="width:${rankProgress(id) * 100}%"></i></div></div>
      ${gate ? `<p class="gate">${icon('lock')} Para o nível ${rank + 1}: ${esc(gate.name)} ${gate.level} (você tem ${statRank(gate.key)}).</p>` : ''}
      <ul class="perks">${perks.map(([r, text]) => `<li class="${Number(r) <= rank ? 'on' : ''}"><b>${r}</b>${esc(text)}</li>`).join('') || '<li class="on"><b>·</b>Cada nível rende Empatia.</li>'}</ul>
      <button type="button" class="btn gold" id="bond-go" ${free[bond.when] && !bondBlocked(id) ? '' : 'disabled'}>${icon('chat')}Passar ${bond.when === 'aft' ? 'a tarde' : 'a noite'} com ${esc(cast.name)}</button>
      ${free[bond.when] ? '' : `<p class="fine">Sem ${bond.when === 'aft' ? 'tardes' : 'noites'} livres. Conclua uma aula para ganhar mais.</p>`}`
    : '<p>Este vínculo ainda não está disponível. Ele se abre conforme o ano avança.</p>'}
    </div></div>`;
  el.hidden = false;
  el.onclick = (event) => { if (event.target === el || event.target.closest('.profile-close')) el.hidden = true; };
  const goBtn = $('#bond-go');
  if (goBtn) goBtn.onclick = async () => { el.hidden = true; if (await hangout(id, bond.when)) repaint(); };
}
