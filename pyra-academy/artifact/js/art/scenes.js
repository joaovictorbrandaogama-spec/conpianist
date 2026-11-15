// Cenários originais em SVG, montados em camadas para o efeito de paralaxe.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const svg = (body, extra = '') => `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ${extra}>${body}</svg>`;
const layer = (depth, body, cls = "") => `<div class="scene-layer ${cls}" style="--depth:${depth}">${svg(body)}</div>`;

function stars(count, seed, maxY = 520) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const size = r() < 0.08 ? 2.4 : 0.6 + r() * 1.2;
    out += `<circle class="${r() < 0.3 ? 'twinkle' : ''}" style="animation-delay:${(r() * 5).toFixed(2)}s" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * maxY).toFixed(0)}" r="${size.toFixed(1)}" fill="#fff" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

function windows(x, y, cols, rows, w, h, gapX, gapY, seed, lit = 0.55) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const on = r() < lit;
    out += `<rect x="${x + i * (w + gapX)}" y="${y + j * (h + gapY)}" width="${w}" height="${h}" rx="2" fill="${on ? (r() < 0.25 ? '#9fd8ff' : '#ffd98a') : '#1a2140'}" opacity="${on ? 0.92 : 0.9}"/>`;
  }
  return out;
}

const CREST = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0-46 40-30V8C40 34 20 52 0 62-20 52-40 34-40 8V-30Z" fill="#0b0f1e" stroke="#d4af6a" stroke-width="4"/><path d="M-12-20H8a14 14 0 0 1 0 28H-4V34" fill="none" stroke="#d4af6a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>`;

const SCENES = {
  gate() {
    const fence = Array.from({ length: 34 }, (_, i) => {
      const x = 40 + i * 46;
      if (x > 600 && x < 1000) return '';
      return `<path d="M${x} 880V560l8-22 8 22V880Z" fill="#070912"/>`;
    }).join('');
    return [
      layer(0.01, `<defs>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05061a"/><stop offset=".45" stop-color="#1a1650"/><stop offset=".75" stop-color="#5b2a6e"/><stop offset="1" stop-color="#e2855c"/></linearGradient>
        <radialGradient id="g-moon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7de" stop-opacity=".55"/><stop offset="1" stop-color="#fff7de" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#g-sky)"/>${stars(150, 11)}
      <circle cx="1240" cy="190" r="230" fill="url(#g-moon)"/><circle cx="1240" cy="190" r="78" fill="#fff5d6"/><circle cx="1214" cy="170" r="14" fill="#e9dcb4" opacity=".6"/><circle cx="1262" cy="214" r="9" fill="#e9dcb4" opacity=".6"/>`),
      layer(0.03, `<path d="M0 640 120 560 260 620 420 520 560 610 700 540 860 620 1040 530 1200 610 1360 540 1600 630V900H0Z" fill="#241a4a" opacity=".85"/>
        <path d="M0 700 200 640 380 690 620 630 840 700 1100 640 1320 700 1600 650V900H0Z" fill="#1a1338"/>`),
      layer(0.06, `<g fill="#0c0f24">
        <rect x="250" y="430" width="1100" height="330"/>
        <path d="M250 430 800 330 1350 430Z"/>
        <rect x="700" y="170" width="200" height="300"/><path d="M690 170 800 60 910 170Z"/>
        <rect x="170" y="500" width="110" height="260"/><rect x="1320" y="500" width="110" height="260"/>
        <path d="M160 500 225 440 290 500ZM1310 500 1375 440 1440 500Z"/>
      </g>
      <circle cx="800" cy="250" r="46" fill="#fff0c2"/><circle cx="800" cy="250" r="46" fill="none" stroke="#d4af6a" stroke-width="6"/><path d="M800 250V218M800 250l22 12" stroke="#1a1338" stroke-width="5" stroke-linecap="round"/>
      <path d="M800 62V20" stroke="#d4af6a" stroke-width="4"/><path d="M800 22l36 12-36 12Z" fill="#d4af6a"/>
      ${windows(290, 470, 9, 4, 30, 44, 18, 22, 5)}${windows(900 + 30, 470, 9, 4, 30, 44, 18, 22, 9)}
      ${windows(730, 330, 3, 2, 34, 50, 19, 18, 3, 0.8)}${windows(190, 530, 2, 4, 26, 36, 18, 18, 7)}${windows(1340, 530, 2, 4, 26, 36, 18, 18, 8)}
      <path d="M740 760V600a60 60 0 0 1 120 0V760Z" fill="#ffd98a"/><path d="M800 544V760M740 640H860" stroke="#0c0f24" stroke-width="6"/>
      <rect x="250" y="752" width="1100" height="14" fill="#d4af6a" opacity=".5"/>`),
      layer(0.1, `<path d="M0 760H1600V900H0Z" fill="#0a0c1c"/>
        <path d="M640 900 760 760H840L960 900Z" fill="#2a2452"/><path d="M700 900 782 760H818L900 900Z" fill="#3a3270" opacity=".6"/>
        <g class="lamp"><rect x="470" y="560" width="8" height="220" fill="#070912"/><circle cx="474" cy="552" r="16" fill="#ffe6a8"/><circle cx="474" cy="552" r="70" fill="#ffd98a" opacity=".16"/></g>
        <g class="lamp"><rect x="1122" y="560" width="8" height="220" fill="#070912"/><circle cx="1126" cy="552" r="16" fill="#ffe6a8"/><circle cx="1126" cy="552" r="70" fill="#ffd98a" opacity=".16"/></g>`),
      layer(0.16, `${fence}<rect x="0" y="600" width="600" height="12" fill="#070912"/><rect x="1000" y="600" width="600" height="12" fill="#070912"/>
        <g fill="#0e1126" stroke="#d4af6a" stroke-width="3"><rect x="548" y="440" width="84" height="460"/><rect x="968" y="440" width="84" height="460"/></g>
        <path d="M536 440h108l-14-30h-80ZM956 440h108l-14-30h-80Z" fill="#161a36" stroke="#d4af6a" stroke-width="3"/>
        <circle cx="590" cy="392" r="20" fill="#ffe6a8"/><circle cx="1010" cy="392" r="20" fill="#ffe6a8"/><circle cx="590" cy="392" r="80" fill="#ffd98a" opacity=".14"/><circle cx="1010" cy="392" r="80" fill="#ffd98a" opacity=".14"/>
        ${CREST(590, 560, 0.8)}${CREST(1010, 560, 0.8)}
        <path d="M632 470Q800 380 968 470" fill="none" stroke="#d4af6a" stroke-width="5"/><path d="M632 496Q800 410 968 496" fill="none" stroke="#070912" stroke-width="10"/>
        <text x="800" y="404" text-anchor="middle" font-family="Cinzel,serif" font-size="22" letter-spacing="6" fill="#d4af6a">ACADEMIA PYRA</text>`),
    ].join('');
  },

  hall() {
    const frames = [0, 1, 2, 3].map((i) => {
      const t = i / 4, t2 = (i + 0.72) / 4;
      const x1 = 0 + t * 560, x2 = 0 + t2 * 560;
      const top = (x) => 60 + (x / 560) * 270, bot = (x) => 760 - (x / 560) * 250;
      const win = `<path d="M${x1 + 30} ${top(x1 + 30) + 50}L${x2} ${top(x2) + 40}L${x2} ${bot(x2) - 140 + t2 * 60}L${x1 + 30} ${bot(x1 + 30) - 160 + t * 60}Z" fill="url(#h-win)" stroke="#d4af6a" stroke-width="3" opacity=".95"/>`;
      const rx1 = 1600 - x1, rx2 = 1600 - x2;
      const door = `<path d="M${rx1 - 30} ${top(x1 + 30) + 70}L${rx2} ${top(x2) + 60}L${rx2} ${bot(x2)}L${rx1 - 30} ${bot(x1 + 30)}Z" fill="#141a36" stroke="#2c3566" stroke-width="3"/>`;
      return win + door;
    }).join('');
    return [
      layer(0.02, `<defs>
        <linearGradient id="h-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a7a"/><stop offset=".6" stop-color="#c0568a"/><stop offset="1" stop-color="#ffb074"/></linearGradient>
        <linearGradient id="h-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1f44"/><stop offset="1" stop-color="#090b1a"/></linearGradient>
        <radialGradient id="h-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="#0b0e22"/>
      <path d="M0 60 560 330H1040L1600 60V0H0Z" fill="#10142e"/>
      <path d="M0 760 560 510H1040L1600 760V900H0Z" fill="url(#h-floor)"/>
      <path d="M0 60 560 330V510L0 760Z" fill="#161b3c"/><path d="M1600 60 1040 330V510L1600 760Z" fill="#12163a"/>
      <rect x="560" y="330" width="480" height="180" fill="#0d1026"/>`),
      layer(0.05, `<circle cx="800" cy="420" r="210" fill="url(#h-glow)" opacity=".5"/>
        <path d="M700 510V372a100 100 0 0 1 200 0V510Z" fill="#ffe6ad"/><path d="M800 280V510" stroke="#0d1026" stroke-width="5"/>
        <path d="M700 510V372a100 100 0 0 1 200 0V510" fill="none" stroke="#d4af6a" stroke-width="6"/>
        <text x="800" y="318" text-anchor="middle" font-family="Cinzel,serif" font-size="30" fill="#d4af6a" opacity="0">Ω</text>`),
      layer(0.09, `${frames}
        <g opacity=".22" fill="#ffb074"><path d="M40 420 430 560 300 900H-200Z"/><path d="M190 400 520 520 520 900H260Z"/></g>
        <g stroke="#d4af6a" stroke-width="2" opacity=".35"><path d="M0 760 560 510M1600 760 1040 510M0 60 560 330M1600 60 1040 330"/></g>
        <g stroke="#2a3160" stroke-width="2" opacity=".7"><path d="M200 900 660 510M520 900 740 510M800 900V510M1080 900 860 510M1400 900 940 510M0 800H1600M250 648H1350M420 572H1180"/></g>`),
      layer(0.14, `<g fill="#ffe6ad"><rect x="640" y="100" width="320" height="10" rx="5"/><rect x="700" y="210" width="200" height="7" rx="3"/><rect x="740" y="282" width="120" height="5" rx="2"/></g>
        <rect x="560" y="60" width="480" height="60" fill="#ffe6ad" opacity=".05"/>`),
    ].join('');
  },

  classroom() {
    const desk = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-150 0H150L170 26H-170Z" fill="#1c2244"/><rect x="-170" y="26" width="340" height="14" fill="#10142c"/><path d="M-140 40V170M140 40V170" stroke="#0b0e20" stroke-width="12"/><path d="M-60-74h120a12 12 0 0 1 12 12V0H-72V-62a12 12 0 0 1 12-12Z" fill="#0d1126"/></g>`;
    return [
      layer(0.02, `<defs>
        <linearGradient id="c-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f6b"/><stop offset=".55" stop-color="#b2518f"/><stop offset="1" stop-color="#ffb877"/></linearGradient>
        <linearGradient id="c-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a38"/><stop offset="1" stop-color="#0c1024"/></linearGradient>
        <linearGradient id="c-board" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#143b36"/><stop offset="1" stop-color="#0b2623"/></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#c-wall)"/>
      <path d="M0 700H1600V900H0Z" fill="#0a0d1e"/><path d="M0 700H1600" stroke="#d4af6a" stroke-width="3" opacity=".4"/>`),
      layer(0.04, `<g>
        ${[0, 1].map((i) => `<g transform="translate(${60 + i * 190} 150)"><rect width="160" height="400" rx="6" fill="url(#c-sky)"/><circle cx="${i ? 40 : 120}" cy="290" r="34" fill="#ffe7b0" opacity=".9"/><path d="M0 330 40 300 90 326 160 290V400H0Z" fill="#1a1338" opacity=".8"/><path d="M80 0V400M0 200H160" stroke="#0c1024" stroke-width="8"/><rect width="160" height="400" rx="6" fill="none" stroke="#d4af6a" stroke-width="4"/></g>`).join('')}
        <g opacity=".18" fill="#ffb877"><path d="M60 550 220 550 620 900H180Z"/><path d="M250 550 410 550 980 900H640Z"/></g>
      </g>`),
      layer(0.06, `<rect x="470" y="150" width="760" height="360" rx="8" fill="#2a1f14" stroke="#d4af6a" stroke-width="5"/>
        <rect x="488" y="168" width="724" height="324" rx="4" fill="url(#c-board)"/>
        <g font-family="JetBrains Mono,monospace" font-size="25" fill="#e9f5ec" opacity=".9" xml:space="preserve">
          <text x="520" y="226"><tspan fill="#f7c873">def</tspan> merito(voce):</text>
          <text x="572" y="266"><tspan fill="#f7c873">while</tspan> voce.aprende():</text>
          <text x="624" y="306">voce.pontos += <tspan fill="#8fd8ff">1</tspan></text>
          <text x="572" y="346"><tspan fill="#f7c873">return</tspan> voce.pontos</text>
        </g>
        <path d="M520 386H900" stroke="#e9f5ec" stroke-width="3" stroke-dasharray="6 10" opacity=".4"/>
        <text x="520" y="446" font-family="Cinzel,serif" font-size="28" letter-spacing="6" fill="#f7c873" opacity=".85">MÉRITO É A ÚNICA MOEDA</text>
        <rect x="488" y="496" width="724" height="14" fill="#3a2b1c"/><rect x="560" y="490" width="50" height="8" rx="3" fill="#fff"/><rect x="620" y="490" width="34" height="8" rx="3" fill="#f7c873"/>
        <g transform="translate(1290 160)"><rect width="250" height="330" rx="10" fill="#070a18" stroke="#39457f" stroke-width="4"/>
          <text x="125" y="44" text-anchor="middle" font-family="Cinzel,serif" font-size="20" letter-spacing="5" fill="#d4af6a">RANKING</text>
          ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="24" y="${66 + i * 42}" width="${200 - i * 26}" height="24" rx="4" fill="${i === 5 ? '#d4af6a' : '#27306a'}" opacity="${i === 5 ? 1 : 0.9}"><animate attributeName="opacity" values=".6;1;.6" dur="${3 + i * 0.4}s" repeatCount="indefinite"/></rect>`).join('')}
        </g>
        ${CREST(850, 96, 0.62)}`),
      layer(0.1, `<path d="M640 610H960L990 646H610Z" fill="#232a55"/><rect x="610" y="646" width="380" height="70" fill="#141936"/><rect x="610" y="646" width="380" height="8" fill="#d4af6a" opacity=".55"/>`),
      layer(0.2, `${desk(330, 760, 1)}${desk(800, 772, 1)}${desk(1270, 760, 1)}`, 'scene-front'),
    ].join('');
  },

  lab() {
    const r = rng(42);
    const wave = Array.from({ length: 60 }, (_, i) => `${i ? 'L' : 'M'}${630 + i * 8.6} ${300 + Math.sin(i / 2.2) * 34 * (0.4 + r())}`).join('');
    return [
      layer(0.02, `<defs>
        <radialGradient id="l-glow" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#3fd0c8" stop-opacity=".35"/><stop offset="1" stop-color="#3fd0c8" stop-opacity="0"/></radialGradient>
        <linearGradient id="l-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d2b3a"/><stop offset="1" stop-color="#071421"/></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="#070912"/><rect width="1600" height="900" fill="url(#l-glow)"/>
      <path d="M0 690H1600V900H0Z" fill="#0b0e1c"/>`),
      layer(0.05, `<g fill="#111630" stroke="#27306a" stroke-width="3"><rect x="80" y="140" width="360" height="520" rx="6"/><path d="M80 270H440M80 400H440M80 530H440"/></g>
        ${Array.from({ length: 16 }, (_, i) => `<rect x="${100 + (i % 8) * 40}" y="${i < 8 ? 190 : 320}" width="26" height="${60 + (i * 7) % 18}" rx="3" fill="${['#ff9f6b', '#6f86e0', '#86ecb0', '#d4af6a'][i % 4]}" opacity=".75"/>`).join('')}
        <g fill="none" stroke="#3fd0c8" stroke-width="3" opacity=".8"><path d="M140 600c0-40 60-40 60 0s60 40 60 0"/><circle cx="330" cy="470" r="34"/><path d="M330 436V504M296 470H364"/></g>
        <g transform="translate(1225 170) scale(.8)"><rect width="300" height="200" rx="10" fill="#111630" stroke="#27306a" stroke-width="3"/><text x="150" y="70" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="60" fill="#ff9f6b">404</text><text x="150" y="120" text-anchor="middle" font-family="Cinzel,serif" font-size="20" letter-spacing="6" fill="#d4af6a">LABORATÓRIO</text><text x="150" y="160" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="16" fill="#8f9bc9">não perturbe (sério)</text></g>`),
      layer(0.08, `<rect x="590" y="150" width="590" height="330" rx="12" fill="url(#l-screen)" stroke="#3fd0c8" stroke-width="4"/>
        <path d="${wave}" fill="none" stroke="#3fd0c8" stroke-width="4" stroke-linecap="round"><animate attributeName="stroke-dasharray" values="0 1400;1400 0" dur="5s" repeatCount="indefinite"/></path>
        <g font-family="JetBrains Mono,monospace" font-size="20" fill="#9fe8e2"><text x="620" y="200">&gt;&gt;&gt; hipotese = "voce consegue"</text><text x="620" y="400">&gt;&gt;&gt; experimento(hipotese)</text><text x="620" y="436" fill="#ff9f6b">True<tspan class="blink">_</tspan></text></g>
        <rect x="865" y="480" width="40" height="70" fill="#141936"/><rect x="785" y="548" width="200" height="14" rx="6" fill="#1c2244"/>`),
      layer(0.14, `<path d="M420 640H1500L1560 700H360Z" fill="#1b2146"/><rect x="360" y="700" width="1200" height="30" fill="#10142c"/>
        <g transform="translate(520 560)"><rect width="150" height="96" rx="8" fill="#0d1126" stroke="#39457f" stroke-width="3"/><rect x="10" y="10" width="130" height="66" rx="4" fill="#10283a"/><path d="M20 30h70M20 46h100M20 62h50" stroke="#86ecb0" stroke-width="4" stroke-linecap="round"/></g>
        <g transform="translate(1180 590)"><path d="M0 0h60l-8 66h-44Z" fill="#7a1f2a"/><rect x="-4" y="-8" width="68" height="12" rx="4" fill="#c9ccd9"/><text x="30" y="42" text-anchor="middle" font-family="Cinzel,serif" font-size="18" fill="#fff">Dr</text></g>
        <path d="M740 640c40-60 120-60 160 0" fill="none" stroke="#39457f" stroke-width="5"/>`),
    ].join('');
  },

  arena() {
    const grid = Array.from({ length: 17 }, (_, i) => `<path d="M${800 + (i - 8) * 60} 520L${800 + (i - 8) * 260} 900"/>`).join('')
      + [540, 570, 612, 670, 750, 860].map((y) => `<path d="M0 ${y}H1600"/>`).join('');
    return [
      layer(0.02, `<defs>
        <radialGradient id="a-bg" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#241a52"/><stop offset="1" stop-color="#05060f"/></radialGradient>
        <linearGradient id="a-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4af6a" stop-opacity=".5"/><stop offset="1" stop-color="#d4af6a" stop-opacity="0"/></linearGradient>
        <linearGradient id="a-r" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5b6e" stop-opacity=".5"/><stop offset="1" stop-color="#ff5b6e" stop-opacity="0"/></linearGradient>
      </defs><rect width="1600" height="900" fill="url(#a-bg)"/>${stars(60, 77, 480)}`),
      layer(0.05, `<g class="beam"><path d="M120 0 560 900H-100Z" fill="url(#a-l)"/></g><g class="beam beam-b"><path d="M1480 0 1040 900H1700Z" fill="url(#a-r)"/></g>
        <g opacity=".5">${CREST(800, 300, 2.4)}</g>`),
      layer(0.1, `<path d="M0 520H1600V900H0Z" fill="#080a18"/><g stroke="#3a3f8a" stroke-width="2" opacity=".65">${grid}</g>
        <path d="M0 520H1600" stroke="#d4af6a" stroke-width="3" opacity=".7"/>`),
    ].join('');
  },

  black() {
    return layer(0, '<rect width="1600" height="900" fill="#05060d"/>');
  },
};

export function scene(name) {
  return (SCENES[name] || SCENES.black)();
}
