// Retratos vetoriais originais do elenco, gerados em SVG a partir de parâmetros.
// Nenhuma imagem externa: cada rosto é montado por código.

export const CAST = {
  narr: { name: '', color: '#d4af6a' },
  voce: { name: 'Você', color: '#f4efe4' },
  vesper: {
    name: 'Profª. Vésper', full: 'Vésper Albuquerque', role: 'Orientadora da Sala Ômega', color: '#b9a2ff',
    skin: '#eed3c2', shade: '#d3ac9c', hair: '#2b2440', hairHi: '#5a4a86', eye: '#8f73ff',
    style: 'bun', outfit: 'suit', cloth: '#2a2140', cloth2: '#3b2e5c', tie: '#b9a2ff', glasses: true,
  },
  caio: {
    name: 'Caio', full: 'Caio Montenegro', role: 'O Velocista · 5º lugar', color: '#ff7350',
    skin: '#dba77f', shade: '#b97f5c', hair: '#a82d1c', hairHi: '#ff8452', eye: '#ffb13d',
    style: 'spiky', outfit: 'blazer', cloth: '#171c30', cloth2: '#222a47', tie: '#ff7350',
  },
  yuki: {
    name: 'Yuki', full: 'Yuki Arashi', role: 'A Lógica Fria · 4º lugar', color: '#79d6ff',
    skin: '#f6e2d6', shade: '#dcbcae', hair: '#1c2a52', hairHi: '#4468b8', eye: '#5cc4ff',
    style: 'bob', outfit: 'blazer', cloth: '#171c30', cloth2: '#222a47', tie: '#79d6ff',
  },
  theo: {
    name: 'Theo', full: 'Theo Lindqvist', role: 'O Otimizador · 3º lugar', color: '#86ecb0',
    skin: '#f2d8c5', shade: '#d6b19c', hair: '#c9ae62', hairHi: '#fbeeb4', eye: '#35b884',
    style: 'side', outfit: 'blazer', cloth: '#171c30', cloth2: '#222a47', tie: '#86ecb0', glasses: true,
  },
  bianca: {
    name: 'Bianca', full: 'Bianca Ferraz', role: 'A Estrategista · 2º lugar', color: '#ff7ab8',
    skin: '#c98f6e', shade: '#a76c50', hair: '#3b1d2d', hairHi: '#8a4166', eye: '#ff5fa2',
    style: 'wavy', outfit: 'blazer', cloth: '#171c30', cloth2: '#222a47', tie: '#ff7ab8',
  },
  sora: {
    name: 'Sora', full: 'Sora Kanzaki', role: 'O Enigma · 1º lugar', color: '#e7ddb8',
    skin: '#f4e5df', shade: '#d9c0b8', hair: '#dfdcec', hairHi: '#ffffff', eye: '#d4af6a',
    style: 'messy', outfit: 'blazer', cloth: '#171c30', cloth2: '#222a47', tie: '#d4af6a',
  },
  kurisu: {
    name: 'Kurisu', full: 'Makise Kurisu', role: 'Pesquisadora visitante · Lab 404', color: '#ff9f6b',
    skin: '#f6ddd0', shade: '#dcb7a6', hair: '#8f3d2f', hairHi: '#d27358', eye: '#6f86e0',
    style: 'long', outfit: 'labcoat', cloth: '#f2f1ee', cloth2: '#d5d3cd', tie: '#b3362c',
  },
};

// O protagonista (Vaga 006). Visual masculino; o nome é o que a pessoa escolher.
export const PLAYER = {
  name: 'Você', full: 'Você', role: 'Vaga 006', color: '#f3d999', masc: true,
  skin: '#ecc9ad', shade: '#cfa58a', hair: '#24202f', hairHi: '#6c6496', eye: '#c9a35e',
  style: 'male', outfit: 'blazer', cloth: '#171c30', cloth2: '#222a47', tie: '#d4af6a',
};
export const look = (id) => (id === 'voce' ? PLAYER : CAST[id]);

let uid = 0;

const darken = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
};

// --- cabelos: [atrás da cabeça, na frente do rosto, na frente do corpo] ---
const HAIR = {
  bun: (c) => [
    `<circle cx="204" cy="112" r="40" fill="${c.hair}"/><path d="M178 96q26-16 54 0" fill="none" stroke="${c.hairHi}" stroke-width="5" stroke-linecap="round" opacity=".55"/>
     <path d="M106 232C92 112 308 108 294 232L288 268 112 268Z" fill="${c.hair}"/>`,
    `<path d="M108 236C98 116 302 116 292 236 290 206 282 190 268 178 236 206 176 206 140 168 132 186 118 206 108 236Z" fill="${c.hair}"/>
     <path d="M108 236C104 196 112 172 128 160 122 190 122 214 126 246Z" fill="${c.hair}"/>
     <path d="M292 236C296 196 288 172 272 160 278 190 278 214 274 246Z" fill="${c.hair}"/>
     <path d="M150 148Q204 126 256 150" fill="none" stroke="${c.hairHi}" stroke-width="6" stroke-linecap="round" opacity=".5"/>`,
    '',
  ],
  spiky: (c) => [
    `<path d="M106 240C92 120 308 120 294 240L290 262 110 262Z" fill="${c.hair}"/>`,
    `<path d="M108 238 90 178 118 190 104 132 144 164 142 98 180 146 204 86 224 146 262 100 258 164 298 134 284 190 312 180 292 238C288 208 278 190 264 182L256 216 236 184 224 218 204 182 190 220 172 184 160 216 146 186C128 192 114 210 108 238Z" fill="${c.hair}"/>
     <path d="M150 150 176 172M204 110 204 160M252 150 232 172" fill="none" stroke="${c.hairHi}" stroke-width="5" stroke-linecap="round" opacity=".55"/>`,
    '',
  ],
  bob: (c) => [
    `<path d="M98 226C90 104 310 104 302 226L308 336C286 352 262 346 262 322L138 322C138 346 114 352 92 336Z" fill="${c.hair}"/>`,
    `<path d="M106 238C96 116 304 116 294 238 292 212 286 196 276 188L270 228 250 192 244 232 222 194 212 234 196 194 184 234 166 194 154 232 140 192 130 228 124 188C114 196 108 212 106 238Z" fill="${c.hair}"/>
     <path d="M106 226C96 270 98 306 104 338L128 334C120 300 120 262 126 222Z" fill="${c.hair}"/>
     <path d="M294 226C304 270 302 306 296 338L272 334C280 300 280 262 274 222Z" fill="${c.hair}"/>
     <path d="M146 150Q200 126 254 150" fill="none" stroke="${c.hairHi}" stroke-width="7" stroke-linecap="round" opacity=".55"/>`,
    '',
  ],
  side: (c) => [
    `<path d="M106 240C92 116 308 116 294 240L290 258 110 258Z" fill="${c.hair}"/>`,
    `<path d="M108 240C96 112 304 108 292 238 290 210 284 194 272 182 238 204 184 196 150 160 134 178 120 204 116 244Z" fill="${c.hair}"/>
     <path d="M292 236C296 204 290 182 276 170L270 190C278 204 280 222 278 246Z" fill="${c.hair}"/>
     <path d="M156 152Q206 122 262 152" fill="none" stroke="${c.hairHi}" stroke-width="6" stroke-linecap="round" opacity=".6"/>`,
    '',
  ],
  wavy: (c) => [
    `<path d="M96 224C86 96 314 96 304 224 316 300 338 372 322 452 304 486 276 462 282 428L278 330 122 330 118 428C124 462 96 486 78 452 62 372 84 300 96 224Z" fill="${c.hair}"/>`,
    `<path d="M106 240C94 114 306 114 294 240 292 214 288 198 278 186 252 220 198 220 168 178 168 208 146 232 120 242Z" fill="${c.hair}"/>
     <path d="M152 148Q206 124 258 152" fill="none" stroke="${c.hairHi}" stroke-width="7" stroke-linecap="round" opacity=".5"/>`,
    `<path d="M108 226C90 300 112 372 92 448 108 474 138 462 136 430 144 366 122 302 130 228Z" fill="${c.hair}"/>
     <path d="M292 226C310 300 288 372 308 448 292 474 262 462 264 430 256 366 278 302 270 228Z" fill="${c.hair}"/>
     <path d="M112 300Q104 360 110 420M288 300Q296 360 290 420" fill="none" stroke="${c.hairHi}" stroke-width="4" stroke-linecap="round" opacity=".45"/>`,
  ],
  messy: (c) => [
    `<path d="M100 236C88 108 312 108 300 236L304 300C290 312 272 306 270 290L130 290C128 306 110 312 96 300Z" fill="${c.hair}"/>`,
    `<path d="M104 244 98 196 110 204 104 150 132 176 138 116 170 156 198 102 222 154 256 114 262 172 292 146 290 200 304 194 296 246C292 214 284 198 272 190L266 232 248 196 240 250 222 198 206 268 190 198 178 240 162 196 150 236 138 196C122 202 108 218 104 244Z" fill="${c.hair}"/>
     <path d="M150 154 170 178M200 122 204 168M250 154 234 178" fill="none" stroke="#b9b3d6" stroke-width="5" stroke-linecap="round" opacity=".6"/>`,
    '',
  ],
  male: (c) => [
    `<path d="M108 238C94 116 306 116 292 238L288 256 112 256Z" fill="${c.hair}"/>`,
    `<path d="M110 236C100 118 302 108 290 234 287 206 281 192 271 182L264 208 250 178 236 206 220 172 205 202 190 170 176 198 160 174 148 202 136 184C120 196 113 214 110 236Z" fill="${c.hair}"/>
     <path d="M110 226C108 248 111 262 117 272L124 270C120 256 120 240 122 224Z M290 226C292 248 289 262 283 272L276 270C280 256 280 240 278 224Z" fill="${c.hair}"/>
     <path d="M150 150Q196 122 252 146M212 132 236 158" fill="none" stroke="${c.hairHi}" stroke-width="6" stroke-linecap="round" opacity=".55"/>`,
    '',
  ],
  long: (c) => [
    `<path d="M98 226C88 100 312 100 302 226L318 600 82 600Z" fill="${c.hair}"/>`,
    `<path d="M106 240C94 114 306 114 294 240 292 212 286 194 274 184L266 226 248 190 236 226 216 186 200 232 186 188 166 228 152 190 136 226 128 186C116 196 108 214 106 240Z" fill="${c.hair}"/>
     <path d="M148 150Q200 124 254 150" fill="none" stroke="${c.hairHi}" stroke-width="7" stroke-linecap="round" opacity=".5"/>`,
    `<path d="M108 228C96 320 104 420 92 540L128 548C136 430 122 320 130 230Z" fill="${c.hair}"/>
     <path d="M292 228C304 320 296 420 308 540L272 548C264 430 278 320 270 230Z" fill="${c.hair}"/>
     <path d="M112 300Q108 400 110 500M288 300Q292 400 290 500" fill="none" stroke="${c.hairHi}" stroke-width="4" stroke-linecap="round" opacity=".4"/>`,
  ],
};

// --- expressões: sobrancelhas [dy interno, dy externo], pálpebra 0..1, abertura dos olhos, boca ---
const EXPR = {
  neutral: { brow: [0, 0], lid: 0, mouth: 'flat' },
  smile: { brow: [-2, 0], lid: 0, mouth: 'smile' },
  smirk: { brow: [-1, -5], lid: 0.18, mouth: 'smirk' },
  angry: { brow: [9, -5], lid: 0.12, mouth: 'frown' },
  cold: { brow: [3, 0], lid: 0.34, mouth: 'flat' },
  surprised: { brow: [-9, -7], lid: 0, wide: true, mouth: 'open' },
  happy: { brow: [-3, -1], closed: true, mouth: 'grin' },
  flustered: { brow: [5, -3], lid: 0, mouth: 'wavy', blush: true },
  think: { brow: [-4, 3], lid: 0.22, mouth: 'side' },
};

const MOUTH = {
  flat: '<path d="M188 297Q200 300 212 297" fill="none" stroke="#7a3b3b" stroke-width="3" stroke-linecap="round"/>',
  smile: '<path d="M184 293Q200 307 216 293" fill="none" stroke="#7a3b3b" stroke-width="3" stroke-linecap="round"/>',
  smirk: '<path d="M186 297Q204 304 218 290" fill="none" stroke="#7a3b3b" stroke-width="3" stroke-linecap="round"/>',
  frown: '<path d="M188 300Q200 292 212 300" fill="none" stroke="#7a3b3b" stroke-width="3" stroke-linecap="round"/>',
  open: '<ellipse cx="200" cy="298" rx="8" ry="10" fill="#6d2b34"/><ellipse cx="200" cy="303" rx="5" ry="4" fill="#d9707a"/>',
  grin: '<path d="M182 291Q200 314 218 291Z" fill="#fff" stroke="#7a3b3b" stroke-width="2.5" stroke-linejoin="round"/>',
  wavy: '<path d="M186 297q4-6 8 0t8 0 8 0" fill="none" stroke="#7a3b3b" stroke-width="3" stroke-linecap="round"/>',
  side: '<path d="M192 298Q204 296 214 292" fill="none" stroke="#7a3b3b" stroke-width="3" stroke-linecap="round"/>',
};

function eye(cx, side, c, e, key) {
  // side: -1 = olho esquerdo de quem vê (canto interno à direita), 1 = direito
  const inner = cx - side * 23;
  const outer = cx + side * 25;
  const browColor = darken(c.hair, c.style === 'messy' ? 0.45 : 0.25);
  const m = !!c.masc;
  const brow = `<path d="M${inner} ${(m ? 205 : 207) + e.brow[0]}Q${cx} ${(m ? 200 : 199) + (e.brow[0] + e.brow[1]) / 2 - (m ? 1 : 3)} ${outer} ${(m ? 207 : 208) + e.brow[1]}" fill="none" stroke="${browColor}" stroke-width="${m ? 7.5 : 5}" stroke-linecap="${m ? 'butt' : 'round'}"/>`;
  if (e.closed) {
    return `${brow}<path d="M${cx - 22} 242Q${cx} 224 ${cx + 22} 242" fill="none" stroke="#231a2c" stroke-width="5" stroke-linecap="round"/>`;
  }
  const ry = (e.wide ? 18 : 16) - (m ? 2.5 : 0);
  const iris = (e.wide ? 10.5 : 12.5) - (m ? 1 : 0);
  const lidY = 222 + (e.lid || 0) * 26;
  return `${brow}
  <clipPath id="${key}e${side}"><ellipse cx="${cx}" cy="240" rx="23" ry="${ry}"/></clipPath>
  <ellipse cx="${cx}" cy="240" rx="23" ry="${ry}" fill="#fdfbff"/>
  <g clip-path="url(#${key}e${side})">
    <ellipse cx="${cx}" cy="241" rx="${iris}" ry="${iris + 3}" fill="url(#${key}iris)"/>
    <ellipse cx="${cx}" cy="242" rx="${iris * 0.48}" ry="${iris * 0.62}" fill="#15101f"/>
    <circle cx="${cx - 5}" cy="234" r="4.6" fill="#fff"/><circle cx="${cx + 5}" cy="248" r="2.2" fill="#fff" opacity=".85"/>
    <rect x="${cx - 26}" y="${lidY - 30}" width="52" height="30" fill="${c.skin}"/>
    <rect x="${cx - 26}" y="${lidY}" width="52" height="5" fill="#2a1f33" opacity=".22"/>
  </g>
  <path d="M${cx - 25} ${e.lid ? lidY + 2 : 237}Q${cx} ${e.lid ? lidY - 6 : 240 - ry - 9} ${cx + 25} ${e.lid ? lidY + 1 : 235}" fill="none" stroke="#231a2c" stroke-width="5" stroke-linecap="round"/>
  ${m ? '' : `<path d="M${outer} ${e.lid ? lidY + 1 : 235}l${side * 7}-6" fill="none" stroke="#231a2c" stroke-width="4" stroke-linecap="round"/>`}
  <path d="M${cx - 15} ${240 + ry}Q${cx} ${244 + ry} ${cx + 15} ${239 + ry}" fill="none" stroke="#7a5a5a" stroke-width="2" stroke-linecap="round" opacity=".45"/>`;
}

function outfit(c, key) {
  const trim = '#d4af6a';
  if (c.outfit === 'labcoat') {
    return `<path d="M38 600C42 498 70 452 128 432L170 412 230 412 272 432C330 452 358 498 362 600Z" fill="url(#${key}cloth)"/>
      <path d="M170 412 200 474 230 412 222 394 178 394Z" fill="#2a2f45"/>
      <path d="M178 394 158 420 190 448 200 420Z M222 394 242 420 210 448 200 420Z" fill="#fff" stroke="#c9c9d6" stroke-width="1.5"/>
      <path d="M192 430H208L213 448 200 540 187 448Z" fill="${c.tie}"/><path d="M192 430H208L205 444H195Z" fill="${darken(c.tie, 0.25)}"/>
      <path d="M166 412 126 436 150 600H200V474Z M234 412 274 436 250 600H200V474Z" fill="#fbfaf7" stroke="#cfcdc6" stroke-width="2"/>
      <path d="M166 412 138 446 164 476 152 498 200 590M234 412 262 446 236 476 248 498 200 590" fill="none" stroke="#bdbab2" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="258" y="520" width="44" height="6" rx="2" fill="#c9c6bd"/><rect x="266" y="508" width="5" height="18" rx="2" fill="#4e6bd6"/><rect x="276" y="508" width="5" height="18" rx="2" fill="#d6564e"/>`;
  }
  const suit = c.outfit === 'suit';
  return `<path d="M38 600C42 498 70 452 128 432L170 412 230 412 272 432C330 452 358 498 362 600Z" fill="url(#${key}cloth)"/>
    <path d="M170 412 200 478 230 412 222 394 178 394Z" fill="#eef0f8"/>
    <path d="M178 394 158 420 190 448 200 420Z M222 394 242 420 210 448 200 420Z" fill="#fff" stroke="#c9cbdc" stroke-width="1.5"/>
    ${suit
    ? `<circle cx="200" cy="436" r="9" fill="${c.tie}"/><circle cx="200" cy="436" r="9" fill="none" stroke="${trim}" stroke-width="2.5"/><path d="M200 446V478" stroke="#c9cbdc" stroke-width="2"/>`
    : `<path d="M192 430H208L214 450 200 548 186 450Z" fill="${c.tie}"/><path d="M192 430H208L205 445H195Z" fill="${darken(c.tie, 0.3)}"/><path d="M194 470 206 462M193 496 207 488M194 522 205 514" stroke="${darken(c.tie, 0.3)}" stroke-width="3" opacity=".7"/>`}
    <path d="M166 412 132 440 160 474 148 496 200 600H120L96 448Z M234 412 268 440 240 474 252 496 200 600H280L304 448Z" fill="${c.cloth2}"/>
    <path d="M166 412 132 440 160 474 148 496 200 600M234 412 268 440 240 474 252 496 200 600" fill="none" stroke="${trim}" stroke-width="2.5" stroke-linejoin="round" opacity=".9"/>
    <path d="M262 506l18-7 18 7v16c0 12-9 20-18 24-9-4-18-12-18-24Z" fill="#0d1120" stroke="${trim}" stroke-width="2"/>
    <path d="M273 512h9a5 5 0 0 1 0 10h-5v8" fill="none" stroke="${trim}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M60 520Q70 470 110 446M340 520Q330 470 290 446" fill="none" stroke="#000" stroke-width="3" opacity=".18"/>`;
}

/** Devolve o SVG do busto de um personagem em uma expressão. */
const FACE_SOFT = 'M122 216C120 140 280 140 278 216 278 264 250 308 200 326 150 308 122 264 122 216Z';
const FACE_MASC = 'M120 214C118 140 282 140 280 214 280 258 260 294 228 316 214 326 186 326 172 316 140 294 120 258 120 214Z';

export function portrait(id, expression = 'neutral') {
  const c = look(id);
  if (!c || !c.skin) return '';
  const e = EXPR[expression] || EXPR.neutral;
  const key = `p${++uid}`;
  const [hairBack, hairFront, hairOver] = HAIR[c.style](c);
  const glasses = c.glasses
    ? `<g fill="rgba(180,210,255,.10)" stroke="${c.outfit === 'suit' ? '#d4af6a' : '#1b1e2c'}" stroke-width="3.5"><rect x="132" y="220" width="58" height="42" rx="13"/><rect x="210" y="220" width="58" height="42" rx="13"/><path d="M190 238Q200 232 210 238M132 236 118 230M268 236 282 230" fill="none"/></g><path d="M140 228l14 0M218 228l14 0" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>`
    : '';
  return `<svg class="portrait" viewBox="0 0 400 556" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${c.full || c.name}" preserveAspectRatio="xMidYMax meet">
  <defs>
    <linearGradient id="${key}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${darken(c.eye, 0.5)}"/><stop offset=".55" stop-color="${c.eye}"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>
    <linearGradient id="${key}cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.cloth2}"/><stop offset="1" stop-color="${c.cloth}"/></linearGradient>
    <clipPath id="${key}face"><path d="${c.masc ? FACE_MASC : FACE_SOFT}"/></clipPath>
  </defs>
  ${hairBack}
  <g transform="translate(0 -44)">
  <path d="M174 322V402C190 418 210 418 226 402V322Z" fill="${c.skin}"/>
  <path d="M174 366C190 392 210 392 226 366V322H174Z" fill="${c.shade}"/>
  ${outfit(c, key)}
  </g>
  <ellipse cx="121" cy="244" rx="10" ry="18" fill="${c.skin}"/><ellipse cx="279" cy="244" rx="10" ry="18" fill="${c.skin}"/>
  <path d="${c.masc ? FACE_MASC : FACE_SOFT}" fill="${c.skin}"/>
  <g clip-path="url(#${key}face)">
    <path d="M110 150H290V214Q200 196 110 214Z" fill="${c.shade}" opacity=".55"/>
    <path d="M258 250Q286 262 262 318L290 300V240Z" fill="${c.shade}" opacity=".35"/>
    ${e.blush ? '<ellipse cx="150" cy="270" rx="20" ry="9" fill="#ff6b7d" opacity=".42"/><ellipse cx="250" cy="270" rx="20" ry="9" fill="#ff6b7d" opacity=".42"/><path d="M138 266l8 8M148 264l8 8M240 264l8 8M250 266l8 8" stroke="#ff4d66" stroke-width="2" opacity=".6"/>' : ''}
  </g>
  ${eye(160, -1, c, e, key)}${eye(240, 1, c, e, key)}
  <path d="M201 262l-5 12 7 1" fill="none" stroke="${c.shade}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  ${MOUTH[e.mouth]}
  ${glasses}
  ${hairFront}
  ${hairOver}
</svg>`;
}

/** Miniatura circular (só o rosto) para listas e ranking. */
export function avatar(id, expression = 'neutral') {
  const svg = portrait(id, expression);
  return svg.replace('class="portrait" viewBox="0 0 400 556"', 'class="avatar" viewBox="92 98 216 216"').replace('preserveAspectRatio="xMidYMax meet"', 'preserveAspectRatio="xMidYMid slice"');
}
