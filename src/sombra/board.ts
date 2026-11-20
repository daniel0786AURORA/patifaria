// @ts-nocheck — desenho do tabuleiro em SVG (mesma arte da prévia). Recebe só dados públicos.
import mapaJson from '../../docs/sombra-no-guaiba/mapa.json';
import arteJson from '../../docs/sombra-no-guaiba/mapa-arte.json';

const M = mapaJson, A = arteJson, C = M.conexoes;
const NS = 'http://www.w3.org/2000/svg';
const N = {}; M.locais.forEach(n => N[n.id] = n);
const BY = {}; M.locais.forEach(n => BY[n.curto] = n.id);
const TIPO_COR = {comercial: 't-com', boemio: 't-boe', nobre: 't-nob', residencial: 't-res', universitario: 't-uni', industrial: 't-ind', quente: 't-que', lazer: 't-laz', rural: 't-rur', ilha: 't-ilh'};
export const LC = {L1: '#e8772e', L2: '#8e5bb5', L3: '#2f9a4a', L4: '#d9a400', L5: '#d6404e', L6: '#1f8f9a', L7: '#c0582a', L8: '#d4589e', L9: '#6f8f2a', L10: '#8a6d3b', L11: '#3d6fc4', L12: '#b0457a', L13: '#2a8fc7', L14: '#7a6cc4', L15: '#c48a2a', L16: '#5a8f6a'};
const PRIO = ['Aeroporto', 'Mercado Público', 'Rodoviária', 'Redenção', 'Beira-Rio', 'Arena', 'Iguatemi', 'BarraShopping', 'Cais Mauá', 'Belém Novo', 'Ilha da Pintada', 'Ponte do Guaíba', 'Palácio da Polícia', 'Praia de Belas', 'PUCRS', 'Gasômetro', 'Parcão', 'Restinga', 'Lami', 'Ipanema', 'Jardim Botânico', 'Cidade Baixa', 'Menino Deus', 'Bourbon Wallig', 'Sarandi', 'Rubem Berta', 'Ceasa', 'Tristeza', 'Morro Santana', 'Morro do Osso', 'Iberê Camargo', 'Hipódromo', 'Lomba do Pinheiro', 'Partenon', 'Bom Fim', 'Clínicas', 'Padre Chagas', "Passo d'Areia", 'Navegantes', 'Farrapos', 'São Pedro'];
const prio = id => { const i = PRIO.indexOf(N[id].curto); return i < 0 ? 100 + id : i; };
const ORDER = M.locais.map(n => n.id).sort((a, b) => prio(a) - prio(b));
const aglColor = a => ['#8a948f', '#8fb26a', '#d9b23c', '#ef9a2f', '#e8662f', '#d93a2b'][a];
const LETRA = {delegada: 'D', perito: 'P', analista: 'A', tatico: 'T', rua: 'R'};
const hora = r => String((5 + r) % 24).padStart(2, '0') + 'h';
function arc(r, a0, a1) { const p = a => [r * Math.cos(a), r * Math.sin(a)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; }
function smooth(ids) { const p = ids.map(i => [N[i].x, N[i].y]); if (p.length < 2) return ''; let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) { const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; } return d; }
const boatPath = (a, b) => { const p = N[a], q = N[b]; const s = a < b ? 1 : -1; const mx = (p.x + q.x) / 2 - (q.y - p.y) * .22 * s, my = (p.y + q.y) / 2 + (q.x - p.x) * .22 * s; return `M${p.x} ${p.y} Q${mx} ${my} ${q.x} ${q.y}`; };
export const bboxOf = (ids, pad = 900) => { const xs = ids.map(i => N[i].x), ys = ids.map(i => N[i].y); return [Math.min(...xs) - pad, Math.min(...ys) - pad * .8, Math.max(...xs) + pad, Math.max(...ys) + pad * .8]; };
const zoneIds = zs => M.locais.filter(n => zs.includes(n.zona)).map(n => n.id);
export const VIEWS = {
  cidade: bboxOf(M.locais.map(n => n.id)), tv: bboxOf(zoneIds(['CEN', 'CBX', 'BOM', 'MOI', 'NOR', 'LES', 'ILH']).concat([BY['Hipódromo'], BY['Glória']])),
  centro: bboxOf(zoneIds(['CEN', 'CBX', 'BOM'])), norte: bboxOf(zoneIds(['NOR', 'ILH'])), leste: bboxOf(zoneIds(['MOI', 'LES'])), sul: bboxOf(zoneIds(['SUL'])),
  extremo: bboxOf(zoneIds(['EXT']).concat(['Restinga', 'Ipanema', 'Hípica'].map(s => BY[s]))),
};

// --------------------------------------------------------- ilustrações
function illustrations(el, layer) {
  const IL = {};
  const R = (p, x, y, w, h, cls, rx = 0) => el('rect', {x, y, width: w, height: h, rx, class: cls}, p);
  const E = (p, cx, cy, rx, ry, cls) => el('ellipse', {cx, cy, rx, ry, class: cls}, p);
  const PT = (p, d, cls) => el('path', {d, class: cls}, p);
  IL.mercado = g => { R(g, -40, -24, 80, 48, 'i-ochre i-ln'); R(g, -28, -14, 56, 28, 'i-roof i-ln'); [[-44, -28], [32, -28], [-44, 12], [32, 12]].forEach(([x, y]) => { R(g, x, y, 12, 16, 'i-ochre i-ln'); PT(g, `M${x - 1} ${y} L${x + 6} ${y - 8} L${x + 13} ${y}Z`, 'i-roof i-ln'); }); R(g, -6, 10, 12, 14, 'i-door'); };
  IL.catedral = g => { R(g, -24, -6, 48, 34, 'i-wall i-ln'); E(g, 0, -10, 17, 15, 'i-patina i-ln'); R(g, -3, -30, 6, 10, 'i-patina i-ln'); [-34, 22].forEach(x => { R(g, x, -24, 12, 52, 'i-wall i-ln'); PT(g, `M${x} -24 L${x + 6} -38 L${x + 12} -24Z`, 'i-patina i-ln'); }); R(g, -6, 14, 12, 14, 'i-door'); };
  IL.gasometro = g => { R(g, -44, -8, 64, 36, 'i-brick i-ln'); for (let i = 0; i < 5; i++) R(g, -38 + i * 12, 0, 7, 10, 'i-win'); R(g, 26, -82, 11, 110, 'i-brick i-ln'); for (let k = 0; k < 5; k++) el('line', {x1: 26, x2: 37, y1: -70 + k * 20, y2: -70 + k * 20, class: 'i-ln'}, g); };
  IL.cais = g => { for (let i = 0; i < 6; i++) { R(g, -90 + i * 30, -10, 26, 22, 'i-wall i-ln'); PT(g, `M${-90 + i * 30} -10 L${-77 + i * 30} -20 L${-64 + i * 30} -10Z`, 'i-roof i-ln'); } [[-70, -22], [40, -22]].forEach(([x, y]) => PT(g, `M${x} ${y} L${x} ${y - 36} L${x + 28} ${y - 36} M${x} ${y - 28} L${x + 18} ${y - 36}`, 'i-crane')); };
  IL.casaCultura = g => { R(g, -36, -14, 72, 36, 'i-pink i-ln'); for (let i = 0; i < 6; i++) R(g, -30 + i * 11, -6, 6, 9, 'i-win'); R(g, -8, -38, 16, 26, 'i-pink i-ln'); PT(g, 'M-10 -38 L0 -50 L10 -38Z', 'i-roof i-ln'); };
  IL.rodoviaria = g => { R(g, -50, -16, 100, 30, 'i-wall i-ln'); R(g, -50, -20, 100, 8, 'i-steel i-ln'); [[-40, 20], [-6, 20], [28, 20]].forEach(([x, y]) => { R(g, x, y, 26, 11, 'i-bus i-ln', 3); R(g, x + 3, y + 2, 20, 4, 'i-win'); }); };
  IL.ponte = g => { PT(g, 'M-110 4 H110', 'i-deck'); [-28, 22].forEach(x => { R(g, x, -58, 9, 66, 'i-steel i-ln'); R(g, x - 3, -62, 15, 6, 'i-steel i-ln'); }); R(g, -19, -24, 41, 8, 'i-steelD i-ln'); for (let k = 0; k < 4; k++) PT(g, `M${-100 + k * 18} 16 q4 -4 8 0`, 'i-wave'); };
  IL.beiraRio = g => { E(g, 0, 0, 64, 50, 'i-white i-ln'); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; el('ellipse', {cx: Math.cos(a) * 58, cy: Math.sin(a) * 45, rx: 9, ry: 5, transform: `rotate(${a * 180 / Math.PI} ${Math.cos(a) * 58} ${Math.sin(a) * 45})`, class: 'i-white i-ln'}, g); } E(g, 0, 0, 40, 28, 'i-red'); E(g, 0, 0, 32, 21, 'i-grass'); PT(g, 'M0 -21 V21', 'i-chalk'); };
  IL.arena = g => { E(g, 0, 0, 64, 50, 'i-steelD i-ln'); E(g, 0, 0, 52, 40, 'i-blue'); E(g, 0, 0, 36, 24, 'i-grass'); PT(g, 'M0 -24 V24', 'i-chalk'); };
  IL.aeroporto = g => { R(g, -50, -10, 100, 24, 'i-glass i-ln', 4); R(g, 56, -46, 10, 40, 'i-wall i-ln'); R(g, 51, -54, 20, 10, 'i-glass i-ln', 2); PT(g, 'M-20 40 l60 -6 l4 2 l-20 6 l-10 16 l-6 0 l4 -15 l-22 3 l-6 6 l-4 0 l2 -9z', 'i-plane'); };
  IL.redencao = g => { PT(g, 'M-30 -6 C-26 -26 10 -30 24 -16 C38 -4 26 18 4 16 C-14 14 -34 12 -30 -6Z', 'i-lake i-ln'); R(g, -58, 20, 40, 14, 'i-lake i-ln', 2); E(g, -38, 27, 4, 4, 'i-white'); [[30, 24], [44, -20], [-50, -14], [0, -40]].forEach(([x, y]) => E(g, x, y, 10, 9, 'i-tree')); };
  IL.lago = g => PT(g, 'M-16 -4 C-12 -16 12 -14 16 -2 C18 10 -2 14 -10 10 C-16 6 -18 2 -16 -4Z', 'i-lake i-ln');
  IL.estufa = g => { PT(g, 'M-30 14 V-2 A30 26 0 0 1 30 -2 V14Z', 'i-glass i-ln'); for (let k = -20; k <= 20; k += 10) PT(g, `M${k} 14 V${-Math.sqrt(900 - k * k) * 0.85}`, 'i-ln'); E(g, -46, 6, 10, 9, 'i-tree'); E(g, 46, 4, 11, 10, 'i-tree'); };
  IL.hipodromo = g => { R(g, -46, -10, 92, 22, 'i-wall i-ln'); PT(g, 'M-50 -10 L-40 -22 H40 L50 -10Z', 'i-roof i-ln'); for (let i = 0; i < 8; i++) R(g, -40 + i * 10, -4, 6, 10, 'i-win'); };
  IL.ibere = g => { PT(g, 'M-30 24 V-20 Q-30 -30 -18 -30 H20 Q30 -30 30 -18 V24Z', 'i-white i-ln'); PT(g, 'M30 -10 C46 -8 46 8 30 10 M30 4 C42 6 42 18 30 20', 'i-white i-ln'); for (let i = 0; i < 3; i++) R(g, -22, -18 + i * 14, 18, 4, 'i-win'); };
  IL.shopping = g => { R(g, -46, -26, 92, 40, 'i-mall i-ln', 3); R(g, -38, -20, 76, 10, 'i-glass'); R(g, -46, 18, 92, 22, 'i-park-lot i-ln'); for (let i = 0; i < 9; i++) PT(g, `M${-40 + i * 10} 20 v18`, 'i-chalk'); };
  IL.campus = g => { R(g, -44, -18, 30, 26, 'i-uni i-ln'); R(g, -8, -30, 26, 38, 'i-uni i-ln'); R(g, 24, -12, 24, 20, 'i-uni i-ln'); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R(g, -4 + i * 7, -24 + j * 10, 4, 5, 'i-win'); E(g, -30, 20, 10, 9, 'i-tree'); E(g, 36, 20, 10, 9, 'i-tree'); };
  IL.hospital = g => { R(g, -36, -24, 72, 48, 'i-white i-ln'); R(g, -6, -18, 12, 36, 'i-red'); R(g, -18, -6, 36, 12, 'i-red'); };
  IL.palacio = g => { R(g, -38, -18, 76, 40, 'i-wall i-ln'); PT(g, 'M-42 -18 L0 -34 L42 -18Z', 'i-steelD i-ln'); PT(g, 'M0 -6 L5 4 L16 4 L7 10 L10 20 L0 14 L-10 20 L-7 10 L-16 4 L-5 4Z', 'i-badge'); };
  IL.antenas = g => { [[-20, 0, 60], [10, -6, 76], [34, 4, 50]].forEach(([x, y, h]) => { PT(g, `M${x - 7} ${y} L${x} ${y - h} L${x + 7} ${y} M${x - 5} ${y - h * .33} H${x + 5} M${x - 3} ${y - h * .66} H${x + 3}`, 'i-mast'); E(g, x, y - h, 3.5, 3.5, 'i-redlight'); }); };
  IL.praia = g => { PT(g, 'M-70 10 C-30 -6 30 -6 70 6 L70 20 C30 10 -30 10 -70 24Z', 'i-sand'); [[-30, 0], [20, -2]].forEach(([x, y]) => { PT(g, `M${x - 12} ${y} A12 8 0 0 1 ${x + 12} ${y}Z`, 'i-red'); PT(g, `M${x} ${y} V${y + 14}`, 'i-ln'); }); };
  IL.barco = g => { PT(g, 'M-16 0 H16 L10 8 H-10Z', 'i-boat i-ln'); PT(g, 'M0 0 V-22 L14 -2Z', 'i-sail i-ln'); };
  IL.canoa = g => PT(g, 'M-12 0 H12 L8 5 H-8Z', 'i-boat i-ln');
  IL.pier = g => { R(g, -60, -3, 90, 6, 'i-wood i-ln'); for (let i = 0; i < 5; i++) PT(g, `M${-55 + i * 20} 3 v8`, 'i-ln'); IL.barco(el('g', {transform: 'translate(48 10)'}, g)); };
  IL.pescador = g => { R(g, -20, -20, 26, 18, 'i-wood i-ln'); PT(g, 'M-24 -20 L-7 -32 L10 -20Z', 'i-roof i-ln'); [-16, 0].forEach(x => PT(g, `M${x} -2 v12`, 'i-ln')); IL.canoa(el('g', {transform: 'translate(30 14)'}, g)); IL.canoa(el('g', {transform: 'translate(-34 18)'}, g)); };
  IL.sambodromo = g => { R(g, -80, -6, 160, 12, 'i-sand i-ln'); R(g, -80, -22, 160, 14, 'i-stand i-ln'); R(g, -80, 8, 160, 14, 'i-stand i-ln'); for (let i = 0; i < 8; i++) E(g, -70 + i * 20, 0, 3, 3, 'i-confete'); };
  IL.igreja = g => { R(g, -18, -8, 36, 30, 'i-white i-ln'); R(g, -7, -36, 14, 30, 'i-white i-ln'); PT(g, 'M-9 -36 L0 -50 L9 -36Z', 'i-patina i-ln'); PT(g, 'M0 -58 V-50 M-3 -55 H3', 'i-ln'); R(g, -5, 10, 10, 12, 'i-door'); };
  IL.ceasa = g => { for (let i = 0; i < 3; i++) { R(g, -60, -30 + i * 22, 120, 18, 'i-steel i-ln'); for (let k = 0; k < 8; k++) PT(g, `M${-60 + k * 15} ${-30 + i * 22} l7 -6 l8 6`, 'i-ln'); } };
  IL.anfiteatro = g => { E(g, -6, -30, 16, 16, 'i-sun'); PT(g, 'M-40 10 A40 30 0 0 1 40 10Z', 'i-stand i-ln'); R(g, -16, 4, 32, 10, 'i-wood i-ln'); };
  IL.deck = g => { R(g, -40, -6, 80, 14, 'i-wood i-ln'); [[-24, -6], [0, -6], [24, -6]].forEach(([x, y]) => PT(g, `M${x - 9} ${y} A9 6 0 0 1 ${x + 9} ${y}Z`, 'i-sail')); };
  IL.trem = g => { R(g, -46, -8, 30, 16, 'i-train i-ln', 4); R(g, -14, -8, 30, 16, 'i-train i-ln', 3); R(g, 18, -8, 30, 16, 'i-train i-ln', 4); [-42, -10, 22].forEach(x => R(g, x, -4, 22, 5, 'i-glass')); };
  IL.catamara = g => { PT(g, 'M-26 4 H26 L20 12 H-20Z', 'i-white i-ln'); R(g, -16, -6, 30, 10, 'i-glass i-ln', 3); PT(g, 'M-40 14 q6 -5 12 0 q6 5 12 0', 'i-wave'); };
  IL.vila = g => { [[-24, 4], [-6, -4], [12, 6], [28, -2]].forEach(([x, y], i) => { R(g, x - 8, y - 8, 16, 14, i % 2 ? 'i-brick i-ln' : 'i-wall i-ln'); PT(g, `M${x - 10} ${y - 8} L${x} ${y - 16} L${x + 10} ${y - 8}Z`, 'i-roof i-ln'); }); };
  IL.fazenda = g => { R(g, -14, -8, 28, 18, 'i-wall i-ln'); PT(g, 'M-17 -8 L0 -20 L17 -8Z', 'i-roof i-ln'); for (let i = 0; i < 4; i++) PT(g, `M${-50 + i * 6} 18 H${-24 + i * 6}`, 'i-field'); E(g, 32, 6, 9, 8, 'i-tree'); E(g, 42, -6, 8, 7, 'i-tree'); };
  const L = [
    ['Mercado Público', 'mercado', 334, 435, 5.4], ['Matriz', 'catedral', -58, 435, 5.04], ['Gasômetro', 'gasometro', 377, 334, 5.4], ['Cais Mauá', 'cais', 87, -348, 5.76],
    ['Casa de Cultura', 'casaCultura', -319, 247, 4.32], ['Embarcadero', 'deck', -435, -232, 4.68], ['Rodoviária', 'rodoviaria', 609, -247, 5.76], ['Ponte do Guaíba', 'ponte', -812, 15, 7.2],
    ['Beira-Rio', 'beiraRio', -377, 363, 8.28], ['Arena', 'arena', -609, -377, 8.28], ['Aeroporto', 'aeroporto', 609, 479, 7.2], ['Redenção', 'redencao', 174, 131, 5.4],
    ['Parcão', 'lago', 174, 87, 3.6], ['Jardim Botânico', 'estufa', -334, 247, 4.68], ['Hipódromo', 'hipodromo', 0, -363, 5.4], ['Iberê Camargo', 'ibere', -377, 102, 4.68],
    ['Praia de Belas', 'shopping', 464, 203, 5.4], ['Iguatemi', 'shopping', 479, 247, 5.4], ['BarraShopping', 'shopping', 464, 203, 5.4], ['Bourbon Ipiranga', 'shopping', -435, 319, 4.68], ['Bourbon Wallig', 'shopping', 464, 247, 5.04],
    ['UFRGS', 'campus', 334, -334, 3.96], ['PUCRS', 'campus', 479, 319, 5.4], ['Campus do Vale', 'campus', 464, 334, 5.4], ['Clínicas', 'hospital', 392, 247, 4.5], ['Palácio da Polícia', 'palacio', -435, 203, 4.68],
    ['Morro Santa Tereza', 'antenas', 334, -116, 6.12], ['Morro da Polícia', 'antenas', 348, -87, 6.12], ['Ipanema', 'praia', -464, 247, 6.48], ['Lami', 'praia', -261, 406, 6.48],
    ['Belém Novo', 'pier', -609, 334, 6.48], ['Ilha da Pintada', 'pescador', 464, 377, 5.4], ['Porto Seco', 'sambodromo', 551, 174, 6.12], ['Navegantes', 'igreja', -377, 218, 4.68],
    ['Ceasa', 'ceasa', 551, 247, 6.12], ['Pôr do Sol', 'anfiteatro', -406, 29, 4.68], ['Restinga', 'vila', 464, 290, 5.76], ['Rubem Berta', 'vila', 464, 290, 5.4], ['Lomba do Pinheiro', 'vila', 464, 319, 5.4],
    ['Chapéu do Sol', 'fazenda', 493, 319, 6.12], ['Lageado', 'fazenda', 464, 348, 6.12], ['Extrema', 'fazenda', 479, 319, 6.12], ['Ponta Grossa', 'fazenda', 493, 261, 5.4], ['Ilha dos Marinheiros', 'pescador', 464, 0, 5.4],
  ];
  L.forEach(([s, fn, dx, dy, sc]) => { const id = BY[s]; if (!id) return; const n = N[id]; IL[fn](el('g', {transform: `translate(${n.x + dx} ${n.y + dy}) scale(${sc})`, class: 'illus'}, layer)); });
  const put = (fn, [x, y], sc, rot = 0) => IL[fn](el('g', {transform: `translate(${x} ${y}) rotate(${rot}) scale(${sc})`, class: 'illus'}, layer));
  const a = N[BY['São Pedro']], b = N[BY['Farrapos']]; put('trem', [a.x + (b.x - a.x) * .55 + 160, a.y + (b.y - a.y) * .55], 5.5, -60);
  const ll = (lat, lon) => [(lon - A.origem[1]) * A.kx, (A.origem[0] - lat) * A.ky];
  put('catamara', ll(-30.024, -51.254), 8); put('barco', ll(-30.060, -51.254), 8); put('barco', ll(-30.112, -51.270), 7);
  put('barco', ll(-30.150, -51.252), 6.5); put('canoa', ll(-30.040, -51.275), 7); put('barco', ll(-30.200, -51.218), 7); put('catamara', ll(-30.090, -51.265), 6.5, -10);
}

// --------------------------------------------------------- tabuleiro
export function createBoard(svg, {onSelect, interativo = true} = {}) {
  svg.innerHTML = '';
  const el = (t, a = {}, p = svg) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
  const g = {};
  ['terra', 'terr', 'streets', 'parks', 'trees', 'gravlab', 'roads', 'highways', 'rlabels', 'links', 'bus', 'rail', 'boat', 'illus', 'hi', 'zonas', 'zlabels', 'route', 'nodes', 'pieces'].forEach(k => g[k] = el('g', {class: 'g-' + k}));
  const defs = el('defs', {}, svg); svg.insertBefore(defs, svg.firstChild);
  const pat = el('pattern', {id: 'hatch', width: 16, height: 16, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'}, defs);
  el('rect', {width: 16, height: 16, class: 'hatch-bg'}, pat); el('line', {x1: 0, y1: 0, x2: 0, y2: 16, class: 'hatch-ln', 'stroke-width': 6}, pat);
  el('path', {d: A.terra, class: 'a-shore', 'fill-rule': 'evenodd'}, g.terra);
  el('path', {d: A.fora, class: 'a-out', 'fill-rule': 'evenodd'}, g.terra);
  A.vizinhos.forEach(v => { const t = el('text', {x: v.x, y: v.y, class: 'a-viz', 'text-anchor': 'middle'}, g.terra); t.textContent = v.nome; });
  el('path', {d: A.terra, class: 'a-land', 'fill-rule': 'evenodd'}, g.terra);
  const cells = {};
  A.territorios.forEach(t => { cells[t.id] = el('path', {d: t.d, class: 'a-cell ' + TIPO_COR[N[t.id].tipo], 'fill-rule': 'evenodd'}, g.terr); });
  el('path', {d: A.ruas, class: 'a-street', 'vector-effect': 'non-scaling-stroke'}, g.streets);
  { let d1 = '', d2 = ''; const r = 70; for (let i = 0; i < A.arvores.length; i += 2) { const x = A.arvores[i], y = A.arvores[i + 1]; const rr = r * (0.8 + ((i * 7919) % 3) * 0.18);
    d1 += `M${x - rr + 20} ${y + 25}a${rr} ${rr} 0 1 0 ${2 * rr} 0a${rr} ${rr} 0 1 0 ${-2 * rr} 0`; d2 += `M${x - rr} ${y}a${rr} ${rr} 0 1 0 ${2 * rr} 0a${rr} ${rr} 0 1 0 ${-2 * rr} 0`; }
    el('path', {d: d1, class: 'a-tree-s'}, g.trees); el('path', {d: d2, class: 'a-tree'}, g.trees); }
  A.rodovias.forEach((r, i) => { el('path', {d: r.d, class: 'a-hw-case', 'vector-effect': 'non-scaling-stroke'}, g.highways); el('path', {d: r.d, class: 'a-hw', 'vector-effect': 'non-scaling-stroke'}, g.highways);
    const id = 'hw' + i; el('path', {id, d: r.d, fill: 'none'}, g.rlabels); const t = el('text', {class: 'a-rlabel hw'}, g.rlabels); const tp = el('textPath', {href: '#' + id, startOffset: '30%'}, t); tp.textContent = r.nome; });
  const P = id => [N[id].x, N[id].y];
  const park = (s, w, h, rot, cls = 'a-park', rx = 60) => { const [x, y] = P(BY[s]); el('rect', {x: x - w / 2, y: y - h / 2, width: w, height: h, rx, transform: `rotate(${rot} ${x} ${y})`, class: cls}, g.parks); };
  park('Redenção', 620, 420, -28); park('Parcão', 300, 220, -20); park('Parque Marinha', 320, 880, -8); park('Harmonia', 260, 520, -12);
  park('Jardim Botânico', 560, 520, 10); park('Pôr do Sol', 160, 900, -6, 'a-park', 40); park('Hipódromo', 520, 380, 0, 'a-track', 190); park('Reserva do Lami', 1400, 900, -30, 'a-park', 300);
  ['Morro Santana', 'Morro do Osso', 'Morro da Polícia', 'Morro Santa Tereza'].forEach((s, i) => { const [x, y] = P(BY[s]); const R = [900, 700, 650, 520][i];
    for (let k = 0; k < 4; k++) el('ellipse', {cx: x, cy: y, rx: R * (1 - k * .22), ry: R * .72 * (1 - k * .22), class: 'a-hill' + (k ? ' ring' : '')}, g.parks); });
  { const [x, y] = P(BY['Aeroporto']); el('rect', {x: x - 1500, y: y - 90, width: 3000, height: 180, rx: 20, transform: `rotate(-36 ${x} ${y})`, class: 'a-runway'}, g.parks); }
  const AVN = {L1: 'Av. Assis Brasil', L2: 'Av. Protásio Alves', L3: 'Av. Bento Gonçalves', L4: 'Av. Ipiranga', L5: 'Av. Padre Cacique · Wenceslau Escobar', L6: 'Av. Cavalhada', L7: 'Av. Farrapos', L8: 'Av. Independência', L9: 'Av. Oscar Pereira', L10: 'Estrada do Lami', L11: 'Av. Sertório', L12: 'III Perimetral', L13: 'BR-290', L14: 'Av. Protásio Alves', L15: 'Av. Juca Batista', L16: 'Estrada João de Oliveira Remião'};
  C.onibus.linhas.forEach((l, i) => { const d = smooth(l.paradas);
    el('path', {d, class: 'a-road-case', 'vector-effect': 'non-scaling-stroke'}, g.roads); el('path', {d, class: 'a-road', 'vector-effect': 'non-scaling-stroke'}, g.roads);
    if (!['L13', 'L14'].includes(l.id)) { const id = 'av' + i; el('path', {id, d, fill: 'none'}, g.rlabels); const t = el('text', {class: 'a-rlabel'}, g.rlabels); const tp = el('textPath', {href: '#' + id, startOffset: '38%'}, t); tp.textContent = AVN[l.id]; } });
  illustrations(el, g.illus);
  el('path', {d: A.gravatai, class: 'a-water'}, g.gravlab);
  const water = (x, y, t, rot, cls = 'a-wlabel') => { const e = el('text', {x, y, class: cls, transform: `rotate(${rot} ${x} ${y})`, 'text-anchor': 'middle'}, g.gravlab); e.textContent = t; return e; };
  const wl = [water(-9800, 6000, 'LAGO GUAÍBA', -64), water(-8600, -8200, 'DELTA DO JACUÍ', -20, 'a-wlabel s')];
  { const c = el('g', {transform: 'translate(-9600 -2200) scale(9)', class: 'illus'}, g.gravlab);
    el('circle', {r: 60, class: 'i-rose-bg'}, c); el('circle', {r: 52, class: 'i-rose-ring'}, c);
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([x, y], i) => { el('path', {d: `M0 0 L${-y * 12} ${x * 12} L${x * 48} ${y * 48}Z`, class: i ? 'i-rose-b' : 'i-rose-a'}, c); el('path', {d: `M0 0 L${y * 12} ${-x * 12} L${x * 48} ${y * 48}Z`, class: i ? 'i-rose-a' : 'i-rose-n'}, c); });
    const t = el('text', {x: 0, y: -66, 'text-anchor': 'middle', class: 'i-rose-t'}, c); t.textContent = 'N'; }
  C.a_pe.forEach(([a, b]) => el('line', {x1: N[a].x, y1: N[a].y, x2: N[b].x, y2: N[b].y, class: 'g-link', 'vector-effect': 'non-scaling-stroke'}, g.links));
  C.onibus.linhas.forEach((l, i) => el('path', {d: smooth(l.paradas), stroke: LC[l.id], class: 'g-bus', 'vector-effect': 'non-scaling-stroke', transform: `translate(${(i % 5 - 2) * 28} ${(i % 3 - 1) * 28})`}, g.bus));
  const railD = smooth(C.trensurb.estacoes);
  ['g-rail-b', 'g-rail', 'g-rail-t'].forEach(c => el('path', {d: railD, class: c, 'vector-effect': 'non-scaling-stroke'}, g.rail));
  C.barco.arestas.forEach(([a, b]) => el('path', {d: boatPath(a, b), class: 'g-boat', 'vector-effect': 'non-scaling-stroke'}, g.boat));
  const zl = {}; M.locais.forEach(n => { (zl[n.zona] = zl[n.zona] || []).push(n); });
  const zoneLabels = Object.entries(zl).filter(([z]) => !['BOM', 'ILH'].includes(z)).map(([z, ns]) => { const x = ns.reduce((s, n) => s + n.x, 0) / ns.length, y = ns.reduce((s, n) => s + n.y, 0) / ns.length;
    const t = el('text', {class: 'a-zone', 'text-anchor': 'middle'}, g.zlabels); t.textContent = M.zonas[z].toUpperCase(); return {x, y, t}; });

  // marcadores
  const markers = [], nodeEls = {}, rings = {}, envs = {};
  M.locais.forEach(n => {
    const G = el('g', {class: 'node', tabindex: interativo ? 0 : -1, role: interativo ? 'button' : 'img', 'aria-label': n.nome}, g.nodes);
    const inner = el('g', {}, G); markers.push({x: n.x, y: n.y, g: G});
    const ext = n.etiquetas.find(t => t.startsWith('EXT'));
    el('circle', {r: ext ? 16 : 12.5, class: 'g-halo'}, inner);
    rings[n.id] = [];
    for (let i = 0; i < 5; i++) { const a0 = -Math.PI / 2 + i * (2 * Math.PI / 5) + .13, a1 = a0 + 2 * Math.PI / 5 - .26; rings[n.id].push(el('path', {d: arc(ext ? 13.2 : 10.5, a0, a1), stroke: 'var(--ring-off)', 'stroke-width': 3.2, fill: 'none', class: 'agl'}, inner)); }
    if (ext) el('circle', {r: 19.5, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4, 'stroke-dasharray': '4 3.5'}, inner);
    el('circle', {class: 'core c-' + n.tipo, r: 6.8}, inner);
    if (n.etiquetas.includes('T')) { const b = el('g', {transform: 'translate(-19 -12)'}, inner); el('rect', {x: -7, y: -7, width: 14, height: 14, rx: 3, fill: '#1f4f86', stroke: '#fff', 'stroke-width': 1.4}, b); const t = el('text', {y: 4.4, 'text-anchor': 'middle', class: 'g-tletter'}, b); t.textContent = 'T'; }
    if (n.etiquetas.includes('B')) el('path', {d: 'M-12 15 q3.5 -3.5 7 0 q3.5 3.5 7 0 q3.5 -3.5 7 0', class: 'g-wave'}, inner);
    const env = el('g', {class: 'g-envg', style: 'display:none'}, inner); el('rect', {x: -27, y: 4, width: 15, height: 10.5, rx: 1.6, class: 'g-env'}, env); el('path', {d: 'M-27 4 l7.5 5.6 l7.5 -5.6', class: 'g-env-flap'}, env); envs[n.id] = env;
    const lab = el('text', {class: 'g-label'}, G); lab.textContent = n.curto; n._lab = lab; n._ext = !!ext; n._bw = 12;
    if (interativo) { G.addEventListener('click', () => onSelect?.(n.id)); G.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(n.id); } }); }
    nodeEls[n.id] = G;
  });

  // câmera
  let vb = {x: 0, y: 0, w: 1, h: 1}; let pieceMarkers = [];
  const size = () => ({w: svg.clientWidth || 800, h: svg.clientHeight || 500});
  function fitBox([x0, y0, x1, y1]) { const {w: W0, h: H0} = size(); const w = x1 - x0, h = y1 - y0, ar = W0 / H0; let W = w, H = h; if (w / h > ar) H = w / ar; else W = h * ar; return {x: (x0 + x1) / 2 - W / 2, y: (y0 + y1) / 2 - H / 2, w: W, h: H}; }
  function apply() {
    const {w: W0, h: H0} = size(); vb.h = vb.w * H0 / W0;
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const u = vb.w / W0;
    [...markers, ...pieceMarkers].forEach(m => m.g.setAttribute('transform', `translate(${m.x} ${m.y}) scale(${u})`));
    g.rlabels.setAttribute('font-size', (12 * u).toFixed(1)); g.rlabels.style.display = u < 16 ? '' : 'none';
    wl.forEach(t => t.setAttribute('font-size', (30 * Math.max(u, 8)).toFixed(0)));
    svg.querySelector('#hatch').setAttribute('patternTransform', `rotate(45) scale(${u / 9})`);
    layoutLabels(u, W0, H0); onView?.(u);
  }
  let onView = null;
  function layoutLabels(u, W0, H0) {
    const boxes = []; const hit = b => boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const S = (x, y) => [(x - vb.x) / u, (y - vb.y) / u]; const out = b => b[0] < 4 || b[2] > W0 - 4 || b[1] < 4 || b[3] > H0 - 4;
    M.locais.forEach(n => { const [sx, sy] = S(n.x, n.y); boxes.push([sx - 14, sy - 20, sx + 18, sy + 16]); });
    const fs = 15, cw = 7.3;
    ORDER.forEach(id => { const n = N[id]; const [sx, sy] = S(n.x, n.y); const w = n.curto.length * cw + 6, h = fs + 2, o = n._ext ? 22 : 16;
      const opts = [['r', sx + o, sy - h / 2 + 3], ['l', sx - o - w, sy - h / 2], ['b', sx - w / 2, sy + o + 2], ['t', sx - w / 2, sy - o - h - 6]];
      let ok = null; for (const c of opts) { const b = [c[1], c[2], c[1] + w, c[2] + h]; if (out(b)) continue; if (!hit(b)) { ok = c; boxes.push(b); break; } }
      const L = n._lab; if (!ok) { L.style.display = 'none'; return; } L.style.display = ''; const [side] = ok;
      L.setAttribute('x', side === 'r' ? o : side === 'l' ? -o : 0); L.setAttribute('y', side === 't' ? -o - 8 : side === 'b' ? o + fs : side === 'r' ? 8 : 5); L.setAttribute('text-anchor', side === 'r' ? 'start' : side === 'l' ? 'end' : 'middle'); });
    zoneLabels.forEach(z => { const [sx, sy] = S(z.x, z.y); const w = z.t.textContent.length * 11, h = 22; const b = [sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2];
      const show = u > 9 && !out(b) && !hit(b); z.t.style.display = show ? '' : 'none'; if (show) { boxes.push(b); z.t.setAttribute('x', z.x); z.t.setAttribute('y', z.y + 7 * u); z.t.setAttribute('font-size', (18 * u).toFixed(1)); } });
  }
  let anim = 0;
  function setView(box, animar = true) {
    const to = fitBox(box), from = {...vb}; cancelAnimationFrame(anim);
    if (!animar || from.w === 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) { vb = to; apply(); return; }
    const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3);
      vb = {x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e}; apply(); if (k < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  const toMap = (cx, cy) => { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  function zoomAt(f, cx, cy) { const p = toMap(cx, cy); const w = Math.max(2200, Math.min(60000, vb.w * f)); const k = w / vb.w; vb = {x: p.x - (p.x - vb.x) * k, y: p.y - (p.y - vb.y) * k, w, h: vb.h * k}; apply(); }
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX, e.clientY); }, {passive: false});
  let drag = null, pinch = null; const ptrs = new Map();
  svg.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, e); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); drag = null; return; }
    if (e.target.closest('.node')) return; drag = {p: toMap(e.clientX, e.clientY)}; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, e);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); zoomAt(pinch / d, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2); pinch = d; return; }
    if (!drag) return; const p = toMap(e.clientX, e.clientY); vb.x -= p.x - drag.p.x; vb.y -= p.y - drag.p.y; apply(); });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; drag = null; };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  new ResizeObserver(() => apply()).observe(svg);

  // estado dinâmico
  function pieceGroup(loc) { const n = N[loc]; const G = el('g', {class: 'piece'}, g.pieces); const inner = el('g', {}, G); pieceMarkers.push({x: n.x, y: n.y, g: G}); return inner; }
  function update(pub, extra = {}) {
    const agl = pub.agl || {};
    for (const id in rings) { const a = agl[id] ?? 0; rings[id].forEach((p, i) => p.setAttribute('stroke', i < a ? aglColor(a) : 'var(--ring-off)')); }
    const cont = new Set((pub.contatos || []).map(c => c.local)); for (const id in envs) envs[id].style.display = cont.has(+id) ? '' : 'none';
    g.pieces.innerHTML = ''; pieceMarkers = []; g.route.innerHTML = '';
    // zona revelada recente
    for (const id in cells) cells[id].classList.remove('zona-rev');
    const ult = (pub.revelacoes || []).at(-1);
    if (ult && ult.zona && pub.round - ult.rodada <= 1) M.locais.filter(n => n.zona === ult.zona).forEach(n => cells[n.id]?.classList.add('zona-rev'));
    const ultLocal = [...(pub.revelacoes || [])].reverse().find(r => r.local);
    if (ultLocal && !pub.final) { const inner = pieceGroup(ultLocal.local);
      el('circle', {r: 30, fill: 'none', stroke: 'var(--hot)', 'stroke-width': 2.6, 'stroke-dasharray': '6 5', class: 'pulse'}, inner);
      const t = el('text', {x: 0, y: 47, 'text-anchor': 'middle', class: 'g-seen'}, inner); t.textContent = `visto às ${hora(ultLocal.rodada)}`; }
    (pub.cones || []).forEach(c => { const b = el('g', {transform: 'translate(-20 22)'}, pieceGroup(c.local)); for (let k = 0; k < 4; k++) el('rect', {x: k * 10, width: 10, height: 7, fill: k % 2 ? '#fff' : '#f08a24'}, b); });
    (pub.dets || []).forEach((d, i) => { const inner = pieceGroup(d.loc); const same = pub.dets.filter((x, j) => j < i && x.loc === d.loc).length;
      const dx = [24, -26, 26, -24, 0][same], dy = [-30, -30, 30, 30, -44][same];
      el('line', {x1: 0, y1: 0, x2: dx, y2: dy, stroke: 'var(--cop)', 'stroke-width': 2.4}, inner);
      el('circle', {cx: dx, cy: dy, r: 13.5, fill: extra.meus?.includes(i) ? '#ffd166' : 'var(--cop)', stroke: '#06111d', 'stroke-width': 2.5, class: extra.ativo === i ? 'det-ativo' : ''}, inner);
      const t = el('text', {x: dx, y: dy + 6, 'text-anchor': 'middle', class: 'g-coptext'}, inner); t.textContent = LETRA[d.papel];
      if (d.bloqueio) { const b = el('g', {transform: 'translate(-20 20)'}, inner); for (let k = 0; k < 4; k++) el('rect', {x: k * 10, width: 10, height: 7, fill: k % 2 ? '#fff' : 'var(--hot)'}, b); } });
    if (pub.horaH) { const inner = pieceGroup(pub.horaH.local); el('circle', {r: 40, class: 'g-horah'}, inner); const t = el('text', {y: -48, 'text-anchor': 'middle', class: 'g-seen'}, inner); t.textContent = 'HORA H'; }
    if (extra.espiao) { const inner = pieceGroup(extra.espiao); el('circle', {r: 15, class: 'g-spy'}, inner); const t = el('text', {y: 5, 'text-anchor': 'middle', class: 'g-spytxt'}, inner); t.textContent = '?'; }
    if (pub.final) { const r = pub.final.rastro; const ids = r.map(x => x.local); el('path', {d: 'M' + ids.map(i => `${N[i].x} ${N[i].y}`).join(' L'), class: 'g-route', 'vector-effect': 'non-scaling-stroke'}, g.route);
      r.forEach((x, k) => { if (k && x.local === r[k - 1].local) return; const inner = pieceGroup(x.local); el('circle', {r: 10, class: 'g-step'}, inner); const t = el('text', {y: 4, 'text-anchor': 'middle', class: 'g-steptxt'}, inner); t.textContent = x.rodada; });
      const inner = pieceGroup(pub.final.plano.extracao); el('circle', {r: 26, class: 'g-horah'}, inner); }
    const destaque = extra.destaques ? new Set(extra.destaques) : null;
    for (const id in nodeEls) { nodeEls[id].classList.toggle('dim', !!destaque && !destaque.has(+id) && +id !== extra.selecionado); nodeEls[id].classList.toggle('alvo', !!destaque && destaque.has(+id)); nodeEls[id].classList.toggle('sel', +id === extra.selecionado); }
    apply();
  }
  return {update, setView, apply, zoom: f => { const r = svg.getBoundingClientRect(); zoomAt(f, r.left + r.width / 2, r.top + r.height / 2); }, onView: f => onView = f, get u() { return vb.w / size().w; }};
}
export {N as LOCAIS, BY as POR_NOME, M as MAPA_DADOS};
