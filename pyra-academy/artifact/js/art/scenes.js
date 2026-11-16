// Cenários originais em SVG, montados em camadas para o efeito de paralaxe.
// O campus é uma cidade fechada: salas, galeria, dormitórios — e câmeras em todo canto.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const svg = (body) => `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
const layer = (depth, body, cls = '') => `<div class="scene-layer ${cls}" style="--depth:${depth}">${svg(body)}</div>`;

function stars(count, seed, maxY = 520) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const size = r() < 0.08 ? 2.4 : 0.6 + r() * 1.2;
    out += `<circle class="${r() < 0.3 ? 'twinkle' : ''}" style="animation-delay:${(r() * 5).toFixed(2)}s" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * maxY).toFixed(0)}" r="${size.toFixed(1)}" fill="#fff" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

function windows(x, y, cols, rows, w, h, gapX, gapY, seed, lit = 0.55, off = '#1c1c36') {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const on = r() < lit;
    out += `<rect x="${x + i * (w + gapX)}" y="${y + j * (h + gapY)}" width="${w}" height="${h}" fill="${on ? (r() < 0.25 ? '#9fe0ff' : '#ffd98a') : off}"/>`;
  }
  return out;
}

function skyline(seed, baseY, color, minH = 40, maxH = 190) {
  const r = rng(seed);
  let x = -10;
  let out = '';
  while (x < 1610) {
    const w = 40 + r() * 90;
    const h = minH + r() * (maxH - minH);
    out += `<rect x="${x.toFixed(0)}" y="${(baseY - h).toFixed(0)}" width="${(w + 2).toFixed(0)}" height="${(h + 4).toFixed(0)}"/>`;
    x += w;
  }
  return `<g fill="${color}">${out}</g>`;
}

const BOOKS = ['#e8173f', '#ffc93c', '#4fc8ff', '#5eea9a', '#b9a2ff', '#f5f2ea', '#ff9f6b', '#7a2a3a', '#2f4a8a'];
function shelf(x, y, w, h, rows, seed) {
  const r = rng(seed);
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#241820" stroke="#0e0a10" stroke-width="6"/>`;
  const rowH = h / rows;
  for (let j = 0; j < rows; j++) {
    let bx = x + 10;
    const by = y + j * rowH;
    while (bx < x + w - 26) {
      const bw = 12 + r() * 16;
      const bh = rowH * (0.5 + r() * 0.32);
      out += `<rect x="${bx.toFixed(0)}" y="${(by + rowH - bh - 8).toFixed(0)}" width="${bw.toFixed(0)}" height="${bh.toFixed(0)}" fill="${BOOKS[Math.floor(r() * BOOKS.length)]}" opacity=".85"/>`;
      bx += bw + 3;
    }
    out += `<rect x="${x}" y="${(by + rowH - 8).toFixed(0)}" width="${w}" height="8" fill="#0e0a10"/>`;
  }
  return out;
}

const CREST = (x, y, s = 1, color = '#f5f2ea') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0-46 40-30V8C40 34 20 52 0 62-20 52-40 34-40 8V-30Z" fill="#0b0b12" stroke="${color}" stroke-width="4"/><path d="M-12-20H8a14 14 0 0 1 0 28H-4V34" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>`;

// Câmera de vigilância com a luz vermelha piscando.
const CAMERA = (x, y, flip = 1) => `<g transform="translate(${x} ${y}) scale(${flip} 1)"><path d="M0 0V26H18" fill="none" stroke="#0b0b12" stroke-width="7"/><rect x="12" y="14" width="58" height="28" rx="6" fill="#20202c" stroke="#0b0b12" stroke-width="4"/><circle cx="60" cy="28" r="8" fill="#0b0b12"/><circle cx="60" cy="28" r="3.5" fill="#4fc8ff"/><circle class="blink" cx="24" cy="22" r="4" fill="#ff2a4a"/></g>`;

// Ipê-rosa do campus.
const TREE = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 0C-6-50-14-90-4-140H8C16-90 6-50 10 0Z" fill="#2a1626"/><path d="M0-110-46-170M2-120 50-176" stroke="#2a1626" stroke-width="9" stroke-linecap="round"/>
  <g fill="#ff6fa5"><circle cx="-52" cy="-190" r="56"/><circle cx="48" cy="-200" r="62"/><circle cx="-4" cy="-250" r="66"/></g>
  <g fill="#ff9cc2"><circle cx="-30" cy="-226" r="38"/><circle cx="34" cy="-236" r="34"/><circle cx="6" cy="-286" r="30"/></g>
  <g fill="#ffd0e0" opacity=".8"><circle cx="-10" cy="-262" r="14"/><circle cx="52" cy="-222" r="12"/><circle cx="-58" cy="-206" r="11"/></g></g>`;

const PETALS = (count, seed) => {
  const r = rng(seed);
  return Array.from({ length: count }, () => `<ellipse class="petal" style="animation-delay:-${(r() * 9).toFixed(2)}s;animation-duration:${(7 + r() * 6).toFixed(1)}s" cx="${(r() * 1700).toFixed(0)}" cy="-20" rx="9" ry="5" fill="${r() < 0.5 ? '#ff9cc2' : '#ffd0e0'}"/>`).join('');
};

const SCENES = {
  // Portão principal ao entardecer.
  gate() {
    const fence = Array.from({ length: 34 }, (_, i) => {
      const x = 40 + i * 46;
      if (x > 600 && x < 1000) return '';
      return `<path d="M${x} 900V590l8-20 8 20V900Z" fill="#0b0b12"/>`;
    }).join('');
    return [
      layer(0.01, `<defs>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#160d3a"/><stop offset=".42" stop-color="#5a2272"/><stop offset=".72" stop-color="#ea4f6c"/><stop offset="1" stop-color="#ffc56e"/></linearGradient>
        <radialGradient id="g-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2c4" stop-opacity=".75"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#g-sky)"/>${stars(70, 11, 300)}
      <circle cx="1190" cy="560" r="360" fill="url(#g-sun)"/><circle cx="1190" cy="560" r="124" fill="#fff0c0"/>
      <g fill="#ff9a8f" opacity=".45"><rect x="60" y="238" width="440" height="26" rx="13"/><rect x="170" y="276" width="300" height="18" rx="9"/><rect x="960" y="170" width="480" height="24" rx="12"/><rect x="1090" y="206" width="270" height="16" rx="8"/><rect x="620" y="110" width="260" height="14" rx="7"/></g>`),
      layer(0.03, `${skyline(21, 700, '#3b1d5e', 40, 170)}<rect y="696" width="1600" height="204" fill="#2a1548"/>${skyline(8, 720, '#2a1548', 20, 90)}`),
      layer(0.06, `<g fill="#14142a">
        <rect x="230" y="440" width="1140" height="330"/><rect x="130" y="380" width="170" height="390"/><rect x="1300" y="380" width="170" height="390"/>
        <path d="M680 470V190l120-70 120 70V470Z"/>
      </g>
      <path d="M680 190l120-70 120 70" fill="none" stroke="#e8173f" stroke-width="8"/>
      <rect x="230" y="440" width="1140" height="10" fill="#e8173f"/><rect x="130" y="380" width="170" height="8" fill="#f5f2ea"/><rect x="1300" y="380" width="170" height="8" fill="#f5f2ea"/>
      <circle cx="800" cy="268" r="62" fill="#fff0c0"/>${CREST(800, 262, 0.9, '#e8173f')}
      <rect x="734" y="350" width="132" height="44" fill="#0b0b12" stroke="#f5f2ea" stroke-width="3"/><text x="800" y="382" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="700" font-size="28" fill="#ff3355">07:56</text>
      <path d="M800 120V70" stroke="#f5f2ea" stroke-width="4"/><circle class="twinkle" cx="800" cy="66" r="7" fill="#ff2a4a"/>
      ${windows(268, 476, 9, 5, 30, 34, 14, 20, 5)}${windows(934, 476, 9, 5, 30, 34, 14, 20, 9)}
      ${windows(150, 410, 3, 7, 30, 30, 15, 18, 7, 0.7)}${windows(1320, 410, 3, 7, 30, 30, 15, 18, 8, 0.7)}
      ${windows(712, 410, 4, 1, 30, 40, 16, 0, 3, 0.9)}
      <path d="M730 770V610h140V770Z" fill="#ffd98a"/><path d="M800 610V770M730 660H870" stroke="#14142a" stroke-width="6"/>`),
      layer(0.1, `<path d="M0 768H1600V900H0Z" fill="#101019"/>
        <path d="M620 900 752 768H848L980 900Z" fill="#2a2440"/><path d="M700 900 782 768H818L900 900Z" fill="#f5f2ea" opacity=".12"/>
        ${TREE(330, 790, 1.1)}${TREE(1290, 790, 1.15)}${TREE(120, 800, 0.8)}${TREE(1490, 800, 0.85)}
        <g class="lamp"><rect x="470" y="590" width="8" height="190" fill="#0b0b12"/><circle cx="474" cy="582" r="15" fill="#ffe6a8"/><circle cx="474" cy="582" r="70" fill="#ffd98a" opacity=".16"/></g>
        <g class="lamp"><rect x="1122" y="590" width="8" height="190" fill="#0b0b12"/><circle cx="1126" cy="582" r="15" fill="#ffe6a8"/><circle cx="1126" cy="582" r="70" fill="#ffd98a" opacity=".16"/></g>`),
      layer(0.16, `${fence}<rect x="0" y="630" width="600" height="12" fill="#0b0b12"/><rect x="1000" y="630" width="600" height="12" fill="#0b0b12"/>
        <g fill="#14141f" stroke="#f5f2ea" stroke-width="4"><rect x="548" y="450" width="84" height="450"/><rect x="968" y="450" width="84" height="450"/></g>
        <path d="M536 450h108l-14-30h-80ZM956 450h108l-14-30h-80Z" fill="#e8173f" stroke="#0b0b12" stroke-width="4"/>
        ${CREST(590, 570, 0.8)}${CREST(1010, 570, 0.8)}
        <path d="M632 492 968 466V522L632 548Z" fill="#0b0b12" stroke="#f5f2ea" stroke-width="4"/>
        <text x="800" y="518" text-anchor="middle" transform="rotate(-4.4 800 508)" font-family="Anton,Impact,sans-serif" font-size="34" letter-spacing="7" fill="#f5f2ea">ACADEMIA PYRA</text>
        ${CAMERA(632, 396)}${CAMERA(968, 396, -1)}
        ${PETALS(16, 5)}`, 'scene-front'),
    ].join('');
  },

  // Corredor da ala das turmas.
  hall() {
    const frames = [0, 1, 2, 3].map((i) => {
      const t = i / 4;
      const t2 = (i + 0.72) / 4;
      const x1 = t * 560;
      const x2 = t2 * 560;
      const top = (x) => 60 + (x / 560) * 270;
      const bot = (x) => 760 - (x / 560) * 250;
      const win = `<path d="M${x1 + 30} ${top(x1 + 30) + 50}L${x2} ${top(x2) + 40}L${x2} ${bot(x2) - 140 + t2 * 60}L${x1 + 30} ${bot(x1 + 30) - 160 + t * 60}Z" fill="url(#h-win)" stroke="#0b0b12" stroke-width="6"/>`;
      const rx1 = 1600 - x1;
      const rx2 = 1600 - x2;
      const door = `<path d="M${rx1 - 30} ${top(x1 + 30) + 70}L${rx2} ${top(x2) + 60}L${rx2} ${bot(x2)}L${rx1 - 30} ${bot(x1 + 30)}Z" fill="#1c1c2e" stroke="#0b0b12" stroke-width="6"/>
        <path d="M${rx1 - 44} ${top(x1 + 30) + 34}L${rx2 + 6} ${top(x2) + 30}L${rx2 + 6} ${top(x2) + 52}L${rx1 - 44} ${top(x1 + 30) + 60}Z" fill="${['#ff3355', '#5eea9a', '#4fc8ff', '#ffc93c'][i]}"/>`;
      return win + door;
    }).join('');
    return [
      layer(0.02, `<defs>
        <linearGradient id="h-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2a8a"/><stop offset=".6" stop-color="#e8506a"/><stop offset="1" stop-color="#ffc56e"/></linearGradient>
        <linearGradient id="h-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a44"/><stop offset="1" stop-color="#0d0d16"/></linearGradient>
        <radialGradient id="h-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="#12121e"/>
      <path d="M0 60 560 330H1040L1600 60V0H0Z" fill="#181828"/>
      <path d="M0 760 560 510H1040L1600 760V900H0Z" fill="url(#h-floor)"/>
      <path d="M0 60 560 330V510L0 760Z" fill="#23233a"/><path d="M1600 60 1040 330V510L1600 760Z" fill="#1d1d32"/>
      <rect x="560" y="330" width="480" height="180" fill="#14141f"/>`),
      layer(0.05, `<circle cx="800" cy="420" r="210" fill="url(#h-glow)" opacity=".5"/>
        <path d="M710 510V360H890V510Z" fill="#ffe6ad"/><path d="M800 360V510" stroke="#14141f" stroke-width="5"/>
        <path d="M710 510V360H890V510" fill="none" stroke="#0b0b12" stroke-width="7"/>
        <rect x="744" y="318" width="112" height="34" fill="#e8173f" stroke="#0b0b12" stroke-width="4"/><text x="800" y="344" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="24" letter-spacing="3" fill="#fff">1º ANO</text>`),
      layer(0.09, `${frames}
        <g opacity=".2" fill="#ffc56e"><path d="M40 420 430 560 300 900H-200Z"/><path d="M190 400 520 520 520 900H260Z"/></g>
        <g stroke="#e8173f" stroke-width="5"><path d="M0 760 560 510M1600 760 1040 510"/></g>
        <g stroke="#3a3a5a" stroke-width="2" opacity=".7"><path d="M200 900 660 510M520 900 740 510M800 900V510M1080 900 860 510M1400 900 940 510M0 800H1600M250 648H1350M420 572H1180"/></g>`),
      layer(0.14, `<g fill="#fff3d0"><rect x="640" y="100" width="320" height="10" rx="5"/><rect x="700" y="210" width="200" height="7" rx="3"/><rect x="740" y="282" width="120" height="5" rx="2"/></g>
        ${CAMERA(540, 140)}${CAMERA(1060, 140, -1)}`),
    ].join('');
  },

  // Sala de aula da Turma D.
  classroom() {
    const desk = (x, y, s, fill = '#2a2a40') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-150 0H150L170 26H-170Z" fill="${fill}" stroke="#0b0b12" stroke-width="5" stroke-linejoin="round"/><rect x="-170" y="26" width="340" height="14" fill="#14141f"/><path d="M-140 40V170M140 40V170" stroke="#0b0b12" stroke-width="12"/><path d="M-60-74h120a12 12 0 0 1 12 12V0H-72V-62a12 12 0 0 1 12-12Z" fill="#14141f"/></g>`;
    const bars = [['A', 190, '#ffc93c'], ['B', 138, '#4fc8ff'], ['C', 90, '#5eea9a'], ['D', 8, '#ff3355']];
    return [
      layer(0.02, `<defs>
        <linearGradient id="c-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a8a"/><stop offset=".55" stop-color="#e8506a"/><stop offset="1" stop-color="#ffc56e"/></linearGradient>
        <linearGradient id="c-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2a44"/><stop offset="1" stop-color="#17161f"/></linearGradient>
        <linearGradient id="c-board" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#153f3a"/><stop offset="1" stop-color="#0b2623"/></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#c-wall)"/>
      <path d="M0 700H1600V900H0Z" fill="#101019"/><path d="M0 700H1600" stroke="#e8173f" stroke-width="6"/>`),
      layer(0.04, `<g>
        ${[0, 1].map((i) => `<g transform="translate(${60 + i * 190} 150)"><rect width="160" height="400" fill="url(#c-sky)"/><circle cx="${i ? 40 : 120}" cy="290" r="34" fill="#fff0c0" opacity=".9"/><path d="M0 330 40 300 90 326 160 290V400H0Z" fill="#2a1548" opacity=".85"/><path d="M80 0V400M0 200H160" stroke="#14141f" stroke-width="8"/><rect width="160" height="400" fill="none" stroke="#0b0b12" stroke-width="8"/></g>`).join('')}
        <g opacity=".18" fill="#ffc56e"><path d="M60 550 220 550 620 900H180Z"/><path d="M250 550 410 550 980 900H640Z"/></g>
      </g>`),
      layer(0.06, `<rect x="470" y="150" width="760" height="360" fill="#14141f" stroke="#0b0b12" stroke-width="8"/>
        <rect x="488" y="168" width="724" height="324" fill="url(#c-board)"/>
        <g font-family="JetBrains Mono,monospace" font-size="25" fill="#e9f5ec" opacity=".92" xml:space="preserve">
          <text x="520" y="226"><tspan fill="#ffc93c">def</tspan> merito(voce):</text>
          <text x="572" y="266"><tspan fill="#ffc93c">while</tspan> voce.aprende():</text>
          <text x="624" y="306">voce.pontos += <tspan fill="#8fd8ff">1</tspan></text>
          <text x="572" y="346"><tspan fill="#ffc93c">return</tspan> voce.pontos</text>
        </g>
        <path d="M520 386H900" stroke="#e9f5ec" stroke-width="3" stroke-dasharray="6 10" opacity=".4"/>
        <text x="520" y="448" font-family="Anton,Impact,sans-serif" font-size="34" letter-spacing="4" fill="#ff5a70">TUDO SE COMPRA COM PONTOS</text>
        <rect x="488" y="496" width="724" height="14" fill="#0b0b12"/><rect x="560" y="490" width="50" height="8" fill="#fff"/><rect x="620" y="490" width="34" height="8" fill="#ffc93c"/>
        <g transform="translate(1290 160)"><rect width="250" height="330" fill="#0b0b12" stroke="#f5f2ea" stroke-width="5"/>
          <text x="125" y="46" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="26" letter-spacing="4" fill="#f5f2ea">CLASSES</text>
          ${bars.map(([letter, w, color], i) => `<text x="24" y="${102 + i * 60}" font-family="Anton,Impact,sans-serif" font-size="34" fill="${color}">${letter}</text><rect x="58" y="${78 + i * 60}" width="${w}" height="28" fill="${color}"><animate attributeName="opacity" values=".65;1;.65" dur="${3 + i * 0.4}s" repeatCount="indefinite"/></rect>`).join('')}
        </g>
        ${CREST(850, 96, 0.62)}${CAMERA(1500, 60, -1)}${CAMERA(40, 60)}`),
      layer(0.1, `<path d="M640 610H960L990 646H610Z" fill="#33334d" stroke="#0b0b12" stroke-width="5" stroke-linejoin="round"/><rect x="610" y="646" width="380" height="70" fill="#1c1c2a" stroke="#0b0b12" stroke-width="5"/><rect x="610" y="646" width="380" height="8" fill="#e8173f"/>`),
      layer(0.14, `${[150, 480, 800, 1120, 1450].map((x) => desk(x, 720, 0.62, '#222236')).join('')}`),
      layer(0.2, `${desk(330, 772, 1)}${desk(800, 784, 1)}${desk(1270, 772, 1)}`, 'scene-front'),
    ].join('');
  },

  // Laboratório 404.
  lab() {
    const r = rng(42);
    const wave = Array.from({ length: 60 }, (_, i) => `${i ? 'L' : 'M'}${630 + i * 8.6} ${300 + Math.sin(i / 2.2) * 34 * (0.4 + r())}`).join('');
    return [
      layer(0.02, `<defs>
        <radialGradient id="l-glow" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#3fd0c8" stop-opacity=".35"/><stop offset="1" stop-color="#3fd0c8" stop-opacity="0"/></radialGradient>
        <linearGradient id="l-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d2b3a"/><stop offset="1" stop-color="#071421"/></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="#0b0b14"/><rect width="1600" height="900" fill="url(#l-glow)"/>
      <path d="M0 690H1600V900H0Z" fill="#101019"/>`),
      layer(0.05, `<g fill="#17172a" stroke="#0b0b12" stroke-width="5"><rect x="80" y="140" width="360" height="520"/><path d="M80 270H440M80 400H440M80 530H440"/></g>
        ${Array.from({ length: 16 }, (_, i) => `<rect x="${100 + (i % 8) * 40}" y="${i < 8 ? 190 : 320}" width="26" height="${60 + (i * 7) % 18}" fill="${['#ff9f6b', '#6f86e0', '#5eea9a', '#ffc93c'][i % 4]}" opacity=".8"/>`).join('')}
        <g fill="none" stroke="#3fd0c8" stroke-width="3" opacity=".8"><path d="M140 600c0-40 60-40 60 0s60 40 60 0"/><circle cx="330" cy="470" r="34"/><path d="M330 436V504M296 470H364"/></g>
        <g transform="translate(1225 170) scale(.8)"><rect width="300" height="200" fill="#17172a" stroke="#f5f2ea" stroke-width="4"/><text x="150" y="76" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="70" fill="#ff9f6b">404</text><text x="150" y="122" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="24" letter-spacing="6" fill="#f5f2ea">LABORATÓRIO</text><text x="150" y="160" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="16" fill="#8f9bc9">não perturbe (sério)</text></g>`),
      layer(0.08, `<rect x="590" y="150" width="590" height="330" fill="url(#l-screen)" stroke="#3fd0c8" stroke-width="5"/>
        <path d="${wave}" fill="none" stroke="#3fd0c8" stroke-width="4" stroke-linecap="round"><animate attributeName="stroke-dasharray" values="0 1400;1400 0" dur="5s" repeatCount="indefinite"/></path>
        <g font-family="JetBrains Mono,monospace" font-size="20" fill="#9fe8e2"><text x="620" y="200">&gt;&gt;&gt; hipotese = "voce consegue"</text><text x="620" y="400">&gt;&gt;&gt; experimento(hipotese)</text><text x="620" y="436" fill="#ff9f6b">True<tspan class="blink">_</tspan></text></g>
        <rect x="865" y="480" width="40" height="70" fill="#1c1c2a"/><rect x="785" y="548" width="200" height="14" fill="#2a2a40"/>`),
      layer(0.14, `<path d="M420 640H1500L1560 700H360Z" fill="#2a2a44" stroke="#0b0b12" stroke-width="5" stroke-linejoin="round"/><rect x="360" y="700" width="1200" height="30" fill="#14141f"/>
        <g transform="translate(520 560)"><rect width="150" height="96" fill="#0d0d16" stroke="#f5f2ea" stroke-width="3"/><rect x="10" y="10" width="130" height="66" fill="#10283a"/><path d="M20 30h70M20 46h100M20 62h50" stroke="#5eea9a" stroke-width="4" stroke-linecap="round"/></g>
        <g transform="translate(1180 590)"><path d="M0 0h60l-8 66h-44Z" fill="#a8172f" stroke="#0b0b12" stroke-width="4"/><rect x="-4" y="-8" width="68" height="12" fill="#e2e2ea" stroke="#0b0b12" stroke-width="3"/><text x="30" y="42" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="20" fill="#fff">Dr</text></g>
        <path d="M740 640c40-60 120-60 160 0" fill="none" stroke="#39457f" stroke-width="5"/>`),
    ].join('');
  },

  // Prédio de Exames Especiais.
  arena() {
    const grid = Array.from({ length: 17 }, (_, i) => `<path d="M${800 + (i - 8) * 60} 520L${800 + (i - 8) * 260} 900"/>`).join('')
      + [540, 570, 612, 670, 750, 860].map((y) => `<path d="M0 ${y}H1600"/>`).join('');
    return [
      layer(0.02, `<defs>
        <radialGradient id="a-bg" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#3a1030"/><stop offset="1" stop-color="#07070c"/></radialGradient>
        <linearGradient id="a-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f2ea" stop-opacity=".5"/><stop offset="1" stop-color="#f5f2ea" stop-opacity="0"/></linearGradient>
        <linearGradient id="a-r" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2a4a" stop-opacity=".6"/><stop offset="1" stop-color="#ff2a4a" stop-opacity="0"/></linearGradient>
      </defs><rect width="1600" height="900" fill="url(#a-bg)"/>${stars(50, 77, 420)}`),
      layer(0.05, `<g class="beam"><path d="M120 0 560 900H-100Z" fill="url(#a-l)"/></g><g class="beam beam-b"><path d="M1480 0 1040 900H1700Z" fill="url(#a-r)"/></g>
        <g opacity=".45">${CREST(800, 330, 2.2, '#e8173f')}</g>
        <path d="M470 60 1130 36V150L470 174Z" fill="#0b0b12" stroke="#f5f2ea" stroke-width="5"/>
        <text x="800" y="128" text-anchor="middle" transform="rotate(-2 800 110)" font-family="Anton,Impact,sans-serif" font-size="64" letter-spacing="8" fill="#ff3355">EXAME ESPECIAL</text>`),
      layer(0.1, `<path d="M0 520H1600V900H0Z" fill="#0b0b12"/><g stroke="#6a1a30" stroke-width="2" opacity=".8">${grid}</g>
        <path d="M0 520H1600" stroke="#e8173f" stroke-width="6"/>${CAMERA(60, 420)}${CAMERA(1540, 420, -1)}`),
    ].join('');
  },

  // Biblioteca.
  library() {
    const lamp = (x) => `<g transform="translate(${x} 640)"><circle cx="0" cy="-30" r="90" fill="#5eea9a" opacity=".1"/><path d="M-4 0V-40" stroke="#c9a04a" stroke-width="6"/><path d="M-44-40h88l-12-26h-64Z" fill="#2fa66a" stroke="#0b0b12" stroke-width="4" stroke-linejoin="round"/><rect x="-22" y="0" width="44" height="8" fill="#c9a04a"/></g>`;
    return [
      layer(0.02, `<defs><linearGradient id="b-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a8a"/><stop offset=".6" stop-color="#e8506a"/><stop offset="1" stop-color="#ffc56e"/></linearGradient></defs>
        <rect width="1600" height="900" fill="#1c1420"/><path d="M0 720H1600V900H0Z" fill="#120d14"/>
        ${[560, 760, 960].map((x) => `<path d="M${x} 600V250a40 40 0 0 1 80 0V600Z" fill="url(#b-win)" stroke="#0b0b12" stroke-width="8"/><path d="M${x + 40} 212V600M${x} 400H${x + 80}" stroke="#0b0b12" stroke-width="6"/>`).join('')}
        <g opacity=".14" fill="#ffc56e"><path d="M560 600h80l260 300H640Z"/><path d="M760 600h80l320 300H900Z"/><path d="M960 600h80l380 300h-300Z"/></g>`),
      layer(0.05, `${shelf(40, 130, 440, 590, 5, 4)}${shelf(1120, 130, 440, 590, 5, 9)}
        <rect x="500" y="120" width="600" height="56" fill="#0b0b12" stroke="#f5f2ea" stroke-width="4"/><text x="800" y="162" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="36" letter-spacing="10" fill="#f5f2ea">BIBLIOTECA</text>${CAMERA(1090, 190, -1)}`),
      layer(0.1, `<path d="M0 720H1600" stroke="#e8173f" stroke-width="6"/><path d="M560 900 700 720H900L1040 900Z" fill="#7a1228" opacity=".6"/>`),
      layer(0.16, `<path d="M300 660H1300L1380 720H220Z" fill="#3a2630" stroke="#0b0b12" stroke-width="6" stroke-linejoin="round"/><rect x="220" y="720" width="1160" height="34" fill="#22161c" stroke="#0b0b12" stroke-width="5"/>
        ${lamp(520)}${lamp(1080)}
        <g transform="translate(740 620)"><path d="M0 30 60 12 120 30V44L60 28 0 44Z" fill="#f5f2ea" stroke="#0b0b12" stroke-width="4" stroke-linejoin="round"/><path d="M60 12V28" stroke="#0b0b12" stroke-width="3"/></g>
        <g transform="translate(900 628)"><rect width="90" height="16" fill="#e8173f" stroke="#0b0b12" stroke-width="4"/><rect x="8" y="-16" width="80" height="16" fill="#4fc8ff" stroke="#0b0b12" stroke-width="4"/><rect x="2" y="-32" width="74" height="16" fill="#ffc93c" stroke="#0b0b12" stroke-width="4"/></g>`, 'scene-front'),
    ].join('');
  },

  // Terraço.
  rooftop() {
    const fence = Array.from({ length: 28 }, (_, i) => `<path d="M${i * 60} 420V700"/>`).join('');
    return [
      layer(0.01, `<defs><linearGradient id="r-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1450"/><stop offset=".5" stop-color="#b0408a"/><stop offset=".85" stop-color="#ff8a5c"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>
        <radialGradient id="r-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2c4" stop-opacity=".8"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></radialGradient></defs>
        <rect width="1600" height="900" fill="url(#r-sky)"/>${stars(50, 31, 260)}
        <circle cx="420" cy="590" r="320" fill="url(#r-sun)"/><circle cx="420" cy="590" r="96" fill="#fff0c0"/>
        <g fill="#ffb4a0" opacity=".5"><rect x="700" y="210" width="520" height="30" rx="15"/><rect x="820" y="252" width="340" height="20" rx="10"/><rect x="120" y="150" width="380" height="24" rx="12"/><rect x="1180" y="330" width="300" height="18" rx="9"/></g>`),
      layer(0.03, `${skyline(13, 660, '#4a2468', 30, 150)}<rect y="656" width="1600" height="60" fill="#3a1c58"/>`),
      layer(0.07, `${skyline(40, 700, '#2a1548', 30, 110)}`),
      layer(0.12, `<path d="M0 700H1600V900H0Z" fill="#1c1c28"/><g stroke="#2e2e40" stroke-width="3"><path d="M0 760H1600M0 830H1600M200 700 80 900M500 700 440 900M800 700V900M1100 700 1160 900M1400 700 1520 900"/></g>
        <g stroke="#0b0b12" stroke-width="5" opacity=".9">${fence}</g><path d="M0 420H1600M0 700H1600" stroke="#0b0b12" stroke-width="10"/>
        <g stroke="#0b0b12" stroke-width="1.5" opacity=".45">${Array.from({ length: 54 }, (_, i) => `<path d="M${i * 30} 425 ${i * 30 + 275} 700M${i * 30} 425 ${i * 30 - 275} 700"/>`).join('')}</g>`),
      layer(0.18, `<g transform="translate(1240 430)"><rect x="20" y="90" width="12" height="190" fill="#0b0b12"/><rect x="208" y="90" width="12" height="190" fill="#0b0b12"/><rect width="240" height="150" rx="20" fill="#3a3a52" stroke="#0b0b12" stroke-width="6"/><path d="M0 50H240M0 100H240" stroke="#0b0b12" stroke-width="4" opacity=".6"/><rect x="96" y="-22" width="48" height="24" fill="#3a3a52" stroke="#0b0b12" stroke-width="5"/></g>
        <g transform="translate(40 470)"><rect width="250" height="240" fill="#2a2a3c" stroke="#0b0b12" stroke-width="6"/><rect x="80" y="70" width="100" height="170" fill="#ffd98a" stroke="#0b0b12" stroke-width="6"/><rect x="-10" y="-14" width="270" height="18" fill="#e8173f" stroke="#0b0b12" stroke-width="5"/></g>${CAMERA(300, 480)}`, 'scene-front'),
    ].join('');
  },

  // Quarto do dormitório.
  dorm() {
    return [
      layer(0.02, `<defs><linearGradient id="d-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0a24"/><stop offset="1" stop-color="#3a1c68"/></linearGradient>
        <radialGradient id="d-lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd98a" stop-opacity=".5"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs>
        <rect width="1600" height="900" fill="#17151f"/><path d="M0 700H1600V900H0Z" fill="#0f0e15"/><path d="M0 700H1600" stroke="#e8173f" stroke-width="6"/>`),
      layer(0.04, `<g transform="translate(560 130)"><rect width="480" height="420" fill="url(#d-sky)"/>${stars(40, 3, 200).replace(/cx="(\d+)"/g, (m, x) => `cx="${(Number(x) * 0.3).toFixed(0)}"`)}
          <circle cx="380" cy="90" r="44" fill="#fff5d6"/><circle cx="362" cy="78" r="9" fill="#e9dcb4" opacity=".6"/>
          <g transform="translate(0 420) scale(.3 1)">${skyline(17, 0, '#14122e', 80, 260)}</g>
          <g fill="#ffd98a">${windows(20, 240, 12, 6, 8, 10, 30, 18, 12, 0.4, 'none')}</g>
          <path d="M240 0V420M0 210H480" stroke="#0b0b12" stroke-width="10"/><rect width="480" height="420" fill="none" stroke="#0b0b12" stroke-width="12"/></g>
        <path d="M520 110h90c0 160-20 320-60 460h-40Z" fill="#a8172f" stroke="#0b0b12" stroke-width="5"/><path d="M1080 110h-90c0 160 20 320 60 460h40Z" fill="#a8172f" stroke="#0b0b12" stroke-width="5"/><rect x="500" y="96" width="600" height="18" fill="#0b0b12"/>`),
      layer(0.08, `<g transform="translate(1180 160)"><rect width="230" height="300" fill="#0b0b12" stroke="#f5f2ea" stroke-width="4"/>${CREST(115, 130, 1.5, '#e8173f')}<text x="115" y="266" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="26" letter-spacing="4" fill="#f5f2ea">TURMA A OU NADA</text></g>
        ${shelf(120, 200, 300, 260, 2, 23)}`),
      layer(0.14, `<circle cx="1260" cy="560" r="240" fill="url(#d-lamp)"/>
        <path d="M980 640H1560V676H980Z" fill="#3a2a34" stroke="#0b0b12" stroke-width="6"/><path d="M1010 676V900M1530 676V900" stroke="#0b0b12" stroke-width="14"/>
        <g transform="translate(1120 500)"><path d="M0 0h230v130H0Z" fill="#0b0b12" stroke="#f5f2ea" stroke-width="4"/><rect x="12" y="12" width="206" height="106" fill="#10283a"/><path d="M26 34h90M26 54h150M40 74h110M40 94h70" stroke="#5eea9a" stroke-width="5" stroke-linecap="round"/><path d="M-20 140h270l14 14H-34Z" fill="#c9c9d6" stroke="#0b0b12" stroke-width="4" stroke-linejoin="round"/></g>
        <g transform="translate(1440 500)"><path d="M0 140V40" stroke="#0b0b12" stroke-width="8"/><path d="M-40 40h80l-14-44h-52Z" fill="#ffc93c" stroke="#0b0b12" stroke-width="5" stroke-linejoin="round"/></g>
        <g transform="translate(1020 606)"><rect width="56" height="30" rx="6" fill="#0b0b12" stroke="#f5f2ea" stroke-width="3"/><circle class="blink" cx="44" cy="15" r="5" fill="#ff2a4a"/></g>`),
      layer(0.2, `<path d="M-20 730H640V900H-20Z" fill="#2a2a40" stroke="#0b0b12" stroke-width="6"/><path d="M-20 700H640V744H-20Z" fill="#f5f2ea" stroke="#0b0b12" stroke-width="6"/><path d="M20 640H250a24 24 0 0 1 24 24v40H20Z" fill="#e2ddd0" stroke="#0b0b12" stroke-width="6"/><path d="M300 744H640V900H300Z" fill="#a8172f" stroke="#0b0b12" stroke-width="6"/>`, 'scene-front'),
    ].join('');
  },

  // Galeria Jacarandá: o comércio do campus.
  mall() {
    const shop = (x, w, color, name, sub) => `<g transform="translate(${x} 250)">
      <rect width="${w}" height="470" fill="#1c1c2a" stroke="#0b0b12" stroke-width="8"/>
      <rect x="20" y="150" width="${w - 40}" height="250" fill="#ffe6ad"/><rect x="20" y="150" width="${w - 40}" height="250" fill="${color}" opacity=".25"/>
      <path d="M${w / 2} 150V400" stroke="#0b0b12" stroke-width="6"/><rect x="20" y="150" width="${w - 40}" height="250" fill="none" stroke="#0b0b12" stroke-width="6"/>
      <path d="M-10 90H${w + 10}L${w - 6} 150H6Z" fill="${color}" stroke="#0b0b12" stroke-width="6" stroke-linejoin="round"/>
      ${Array.from({ length: Math.floor(w / 60) }, (_, i) => `<path d="M${16 + i * 60} 90 ${30 + i * 60} 150h30l-14-60Z" fill="#f5f2ea" opacity=".85"/>`).join('')}
      <rect x="14" y="14" width="${w - 28}" height="62" fill="#0b0b12" stroke="${color}" stroke-width="4"/>
      <text x="${w / 2}" y="60" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="40" letter-spacing="5" fill="${color}">${name}</text>
      <text x="${w / 2}" y="440" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="700" font-size="18" fill="#f5f2ea">${sub}</text>
    </g>`;
    return [
      layer(0.01, `<defs><linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140c34"/><stop offset="1" stop-color="#7a2a7a"/></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#m-sky)"/>${stars(60, 51, 240)}${skyline(61, 300, '#2a1548', 40, 150)}`),
      layer(0.05, `${shop(40, 360, '#ff3355', 'CAFÉ', '2 pp o cafezinho')}${shop(430, 340, '#ffc93c', 'MERCADO', 'aberto 24 h')}${shop(800, 360, '#4fc8ff', 'GAMES', 'console: 62.000 pp')}${shop(1190, 370, '#5eea9a', 'LIVROS', 'apostilas e mangás')}`),
      layer(0.09, `<path d="M0 720H1600V900H0Z" fill="#14141f"/><g stroke="#26263a" stroke-width="3"><path d="M0 780H1600M0 850H1600M160 720 60 900M480 720 420 900M800 720V900M1120 720 1180 900M1440 720 1540 900"/></g>
        <path d="M0 720H1600" stroke="#f5f2ea" stroke-width="5"/>
        <g opacity=".22"><rect x="60" y="724" width="320" height="120" fill="#ff3355"/><rect x="450" y="724" width="300" height="120" fill="#ffc93c"/><rect x="820" y="724" width="320" height="120" fill="#4fc8ff"/><rect x="1210" y="724" width="330" height="120" fill="#5eea9a"/></g>`),
      layer(0.14, `<path d="M0 150Q400 250 800 170T1600 150" fill="none" stroke="#0b0b12" stroke-width="4"/>
        ${Array.from({ length: 21 }, (_, i) => { const t = i / 20; const x = t * 1600; const u = t < 0.5 ? t * 2 : (t - 0.5) * 2; const y = t < 0.5 ? (1 - u) ** 2 * 150 + 2 * u * (1 - u) * 250 + u * u * 170 : (1 - u) ** 2 * 170 + 2 * u * (1 - u) * 90 + u * u * 150; return `<circle class="twinkle" style="animation-delay:${(i * 0.23).toFixed(2)}s" cx="${x.toFixed(0)}" cy="${(y + 16).toFixed(0)}" r="9" fill="${['#ffc93c', '#ff3355', '#4fc8ff', '#f5f2ea'][i % 4]}"/>`; }).join('')}
        ${CAMERA(770, 250)}`),
      layer(0.2, `<g transform="translate(560 760)"><rect width="300" height="20" fill="#3a2630" stroke="#0b0b12" stroke-width="5"/><path d="M30 20V90M270 20V90" stroke="#0b0b12" stroke-width="10"/><rect y="-50" width="300" height="16" fill="#3a2630" stroke="#0b0b12" stroke-width="5"/></g>
        ${TREE(1480, 880, 1.2)}${TREE(90, 890, 1.05)}${PETALS(10, 9)}`, 'scene-front'),
    ].join('');
  },

  // Sala do Conselho Estudantil.
  council() {
    const banner = (x, color) => `<g transform="translate(${x} 90)"><path d="M0 0H130V420L65 380 0 420Z" fill="${color}" stroke="#0b0b12" stroke-width="6" stroke-linejoin="round"/>${CREST(65, 170, 1, '#f5f2ea')}</g>`;
    const bars = [['A', 300, '#ffc93c'], ['B', 216, '#4fc8ff'], ['C', 140, '#5eea9a'], ['D', 10, '#ff3355']];
    return [
      layer(0.02, `<defs><linearGradient id="k-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a2a"/><stop offset="1" stop-color="#140d16"/></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#k-wall)"/><path d="M0 700H1600V900H0Z" fill="#0f0a10"/><path d="M0 700H1600" stroke="#ffc93c" stroke-width="6"/>
        <g stroke="#3a2638" stroke-width="4">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 200} 0V700"/>`).join('')}</g>`),
      layer(0.05, `${banner(120, '#a8172f')}${banner(1350, '#a8172f')}
        <rect x="430" y="120" width="740" height="400" fill="#0b0b12" stroke="#f5f2ea" stroke-width="6"/>
        <text x="800" y="184" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="44" letter-spacing="8" fill="#f5f2ea">SISTEMA S</text>
        ${bars.map(([letter, w, color], i) => `<text x="480" y="${262 + i * 66}" font-family="Anton,Impact,sans-serif" font-size="48" fill="${color}">${letter}</text><rect x="540" y="${224 + i * 66}" width="${w * 1.9}" height="40" fill="${color}"><animate attributeName="opacity" values=".7;1;.7" dur="${3 + i * 0.5}s" repeatCount="indefinite"/></rect>`).join('')}
        ${CAMERA(1180, 130, -1)}${CAMERA(420, 130)}`),
      layer(0.1, `<g transform="translate(800 560)"><path d="M-60-150h120l14 150h-148Z" fill="#a8172f" stroke="#0b0b12" stroke-width="6" stroke-linejoin="round"/><path d="M-40-150a40 40 0 0 1 80 0" fill="#a8172f" stroke="#0b0b12" stroke-width="6"/></g>`),
      layer(0.16, `<path d="M250 640H1350L1460 720H140Z" fill="#3a2630" stroke="#0b0b12" stroke-width="6" stroke-linejoin="round"/><rect x="140" y="720" width="1320" height="40" fill="#22161c" stroke="#0b0b12" stroke-width="5"/><rect x="140" y="720" width="1320" height="8" fill="#ffc93c"/>
        ${[420, 800, 1180].map((x) => `<g transform="translate(${x} 664)"><rect x="-50" y="-6" width="100" height="14" fill="#f5f2ea" stroke="#0b0b12" stroke-width="4"/></g>`).join('')}
        <g transform="translate(800 650)"><rect x="-110" y="-34" width="220" height="34" fill="#0b0b12" stroke="#ffc93c" stroke-width="4"/><text x="0" y="-9" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="22" letter-spacing="4" fill="#ffc93c">PRESIDENTE</text></g>`, 'scene-front'),
    ].join('');
  },

  // Sala de Informática.
  complab() {
    const row = (y, s, n) => Array.from({ length: n }, (_, i) => {
      const x = 800 + (i - (n - 1) / 2) * 250 * s;
      return `<g transform="translate(${x.toFixed(0)} ${y}) scale(${s})"><rect x="-80" y="-120" width="160" height="104" fill="#0b0b12" stroke="#f5f2ea" stroke-width="4"/><rect x="-70" y="-110" width="140" height="84" fill="#0d2b3a"/><path d="M-56-92h60M-56-74h96M-44-56h70M-44-38h40" stroke="${['#5eea9a', '#4fc8ff', '#ffc93c'][i % 3]}" stroke-width="6" stroke-linecap="round"/><rect x="-10" y="-16" width="20" height="18" fill="#0b0b12"/><path d="M-110 2H110L124 26H-124Z" fill="#2a2a40" stroke="#0b0b12" stroke-width="5" stroke-linejoin="round"/></g>`;
    }).join('');
    return [
      layer(0.02, `<defs><radialGradient id="i-glow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#4fc8ff" stop-opacity=".28"/><stop offset="1" stop-color="#4fc8ff" stop-opacity="0"/></radialGradient></defs>
        <rect width="1600" height="900" fill="#10101c"/><rect width="1600" height="900" fill="url(#i-glow)"/><path d="M0 660H1600V900H0Z" fill="#0b0b12"/>`),
      layer(0.05, `<rect x="420" y="110" width="760" height="300" fill="#0b0b12" stroke="#4fc8ff" stroke-width="6"/>
        <g font-family="JetBrains Mono,monospace" font-size="26" fill="#9fe8e2" xml:space="preserve"><text x="460" y="176"><tspan fill="#ffc93c">for</tspan> aluno <tspan fill="#ffc93c">in</tspan> turma_d:</text><text x="512" y="220">aluno.estudar()</text><text x="460" y="264"><tspan fill="#ffc93c">print</tspan>(pontos_de_classe)</text><text x="460" y="330" fill="#ff5a70">&gt;&gt;&gt; 0<tspan class="blink">_</tspan></text></g>
        <g transform="translate(110 190)"><rect width="200" height="440" fill="#17172a" stroke="#0b0b12" stroke-width="6"/>${Array.from({ length: 24 }, (_, i) => `<circle class="${i % 3 ? 'twinkle' : 'blink'}" style="animation-delay:${(i * 0.31).toFixed(2)}s" cx="${40 + (i % 4) * 40}" cy="${50 + Math.floor(i / 4) * 66}" r="7" fill="${['#5eea9a', '#ffc93c', '#ff3355'][i % 3]}"/>`).join('')}</g>
        ${CAMERA(1500, 120, -1)}`),
      layer(0.1, row(600, 0.6, 5)),
      layer(0.16, row(730, 0.86, 4)),
      layer(0.22, row(900, 1.2, 3), 'scene-front'),
    ].join('');
  },

  black() {
    return layer(0, '<rect width="1600" height="900" fill="#07070c"/>');
  },
};

export function scene(name) {
  return (SCENES[name] || SCENES.black)();
}
