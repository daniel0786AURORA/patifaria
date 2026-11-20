// Simulador de partidas de Sombra no Guaíba com jogadores automáticos que seguem uma estratégia.
// Uso: node --import tsx scripts/sombra-sim.ts [partidas=400]
import {createGame, addPlayer, act, tick, opcoesEspiao, acoesEspiao, opcoesDetetive, agl, BALANCO, type Game} from '../src/sombra/rules/engine.ts';
Object.assign(BALANCO, JSON.parse(process.env.BAL || '{}'));
import {rng} from '../src/sombra/rules/plan.ts';
import {MAPA, LOCAL, IDS, VIZ, AGUA, LINHAS, TREM, EXTRACOES, JANELAS, HQ, tem, alcance} from '../src/sombra/rules/map.ts';

const DIST: Record<number, Map<number, number>> = {};
for (const i of IDS) { const m = alcance(i, 60); m.set(i, 0); DIST[i] = m; }
const dist = (a:number, b:number) => DIST[a].get(b) ?? 99;
const tok = (n:number) => n.toString(16).padStart(64, '0');
type Stats = Record<string, number>;
const st: Stats = {};
const inc = (k:string, v = 1) => st[k] = (st[k] ?? 0) + v;

// ---------- o que o espião sabe e quer
function candidatosEspiao(g:Game) {
  const s = g.spy!; let ext = EXTRACOES.slice(); let jan = Object.keys(JANELAS);
  if (s.planoB) return {ext: [g.plano!.extracao], jan: [g.plano!.janela]};
  if (s.remarcada) { let ext = EXTRACOES.slice(); for (const p of s.pistas) if (p.tipo === 'ONDE') ext = ext.filter(e => !p.elimina!.includes(LOCAL[e].curto)); return {ext, jan: [s.remarcada]}; }
  for (const p of s.pistas) { if (p.tipo === 'ONDE') ext = ext.filter(e => !p.elimina!.includes(LOCAL[e].curto)); if (p.tipo === 'QUANDO') jan = jan.filter(j => !p.elimina!.includes(j)); }
  return {ext, jan};
}
function jogarEspiao(g:Game, st0:string, r:()=>number) {
  const s = g.spy!; const {ext, jan} = candidatosEspiao(g);
  const fechados = g.contatos.filter(c => c.status === 'fechado').map(c => c.local);
  const futuras = jan.filter(j => JANELAS[j][1] >= g.round);
  const proxJanela = futuras.map(j => JANELAS[j][0]).sort((a, b) => a - b)[0] ?? 99;
  // decide o alvo
  let alvo: number[]; let modoFuga = false;
  const confiante = ext.length === 1 && futuras.length === 1;
  const apertado = futuras.length && proxJanela - g.round <= 3 && ext.length <= 2;
  if (s.credenciais > 0 && (confiante || apertado || (g.round >= 17 && futuras.length))) { alvo = ext; modoFuga = true; }
  else alvo = fechados.length ? fechados : ext;
  if (s.credenciais === 0 && !g.contatos.some(c => c.status === 'fechado' && c.pista.tipo === 'CREDENCIAL') && !fechados.length) alvo = [IDS.find(i => tem(i, 'EMERGENCIA'))!];
  const perto = (l:number) => Math.min(...g.dets.map(d => dist(d.loc, l)));
  // foi visto há pouco? então prioriza sumir para longe
  const ult = g.revelacoes.filter(x => x.local).at(-1); const visto = !!ult && g.round - ult.rodada <= 1;
  const nota = (l:number, risco:number, custo:number) => Math.min(...alvo.map(a => dist(l, a))) * (visto ? 3 : 10) + risco * 0.8 + custo * 1.2
    + (perto(l) <= 1 ? 40 : perto(l) <= 2 ? 18 : perto(l) <= 3 ? 6 : 0) - (visto && ult!.local ? Math.min(dist(l, ult!.local!), 6) * 6 : 0) + (agl(g, l) >= 2 && !tem(l, 'ESC') ? 3 : 0) + r() * 3;
  while (s.movimentos > 0 && g.phase === 'espiao' && !s.agiu) {
    const o = opcoesEspiao(g); let melhor: {m:string;l:number;n:number} | null = null;
    for (const m of Object.keys(o) as (keyof typeof o)[]) for (const d of o[m]) {
      const n = m === 'esconder' ? (alvo.includes(s.loc) ? -5 : nota(s.loc, d.risco, 0) + (perto(s.loc) <= 1 ? -10 : 6)) : nota(d.local, d.risco, d.custo);
      if (!melhor || n < melhor.n) melhor = {m, l: d.local, n};
    }
    if (!melhor) break;
    if (s.moveu && melhor.n >= nota(s.loc, 0, 0) - 1) break;
    act(g, st0, {action: 'mover', modo: melhor.m, local: melhor.l}); inc('espiao_mov_' + melhor.m);
  }
  if (g.phase !== 'espiao') return;
  const ac = Object.fromEntries(acoesEspiao(g).map(a => [a.acao, a]));
  const naJanela = futuras.some(j => g.round >= JANELAS[j][0] && g.round <= JANELAS[j][1]);
  let escolha = 'passar';
  const longe = perto(s.loc) > Number(process.env.LONGE ?? 4) || g.round >= JANELAS[futuras[0] ?? 'D'][1];
  if (ac.horaH.ok && modoFuga && ext.includes(s.loc) && naJanela && longe && (confiante || g.round >= JANELAS[futuras[0]][1] || ext.length === 1)) escolha = 'horaH';
  else if (ac.recolher.ok) escolha = 'recolher';
  else if (ac.emergencia.ok) escolha = 'emergencia';
  else if (ac.disfarce.ok && s.exposicao >= 5 && s.dinheiro >= (ac.disfarce.custo ?? 2) + 3) escolha = 'disfarce';
  else if (ac.sacar.ok && s.dinheiro < 4) escolha = 'sacar';
  else if (ac.falsa.ok && g.round >= 4 && s.dinheiro >= 7 && r() < 0.35) escolha = 'falsa';
  act(g, st0, {action: 'agir', acao: escolha}); inc('espiao_acao_' + escolha);
}

// ---------- o que a força-tarefa sabe (só informação pública e do time)
type Crenca = Set<number>;
let fonte = 'inicio';
function expandir(g:Game, c:Crenca): Crenca {
  const b = g.bilhetes.filter(x => x.rodada === g.round); const ocup = new Set(g.dets.map(d => d.loc));
  let atual = c;
  for (const t of b) {
    const n = new Set<number>();
    for (const x of atual) {
      if (t.modo === 'esconder') n.add(x);
      if (t.modo === 'pe') for (const [y] of alcance(x, BALANCO.peAlcance)) n.add(y);
      if (t.modo === 'bike') for (const [y] of alcance(x, 4)) n.add(y);
      if (t.modo === 'app') for (const [y] of alcance(x, 4)) n.add(y);
      if (t.modo === 'barco') AGUA[x].forEach(y => n.add(y));
      if (t.modo === 'trem' && TREM.includes(x)) TREM.forEach(y => n.add(y));
      if (t.modo === 'onibus') for (const l of LINHAS) { const i = l.paradas.indexOf(x); if (i >= 0) l.paradas.slice(Math.max(0, i - 5), i + 6).forEach(y => n.add(y)); }
    }
    n.forEach(y => { if (ocup.has(y)) n.delete(y); }); atual = n.size ? n : atual;
  }
  return atual;
}
function aplicarRevelacoes(g:Game, c:Crenca, desde:number): Crenca {
  for (const r of g.revelacoes.filter(x => x.rodada >= desde && x.rodada === g.round)) {
    if (r.local) { fonte = 'revelacao:' + r.motivo.split(' ')[0]; return new Set([r.local]); }
    if (r.zona) { const z = new Set([...c].filter(i => LOCAL[i].zona === r.zona)); return z.size ? z : new Set(IDS.filter(i => LOCAL[i].zona === r.zona)); }
  }
  return c;
}
function deducaoTime(g:Game) {
  let ext = EXTRACOES.slice(); let jan = Object.keys(JANELAS); if (g.equipe.acusou) return {ext, jan};
  for (const p of g.equipe.pistas) { if (p.duvidosa) continue; if (p.tipo === 'ONDE') ext = ext.filter(e => !p.elimina!.includes(LOCAL[e].curto)); if (p.tipo === 'QUANDO') jan = jan.filter(j => !p.elimina!.includes(j)); }
  return {ext, jan};
}
function jogarDetetives(g:Game, toks:Record<string, string>, crenca:Crenca, r:()=>number): Crenca {
  const {ext, jan} = deducaoTime(g);
  const janelaAgora = jan.some(j => g.round >= JANELAS[j][0] - 1 && g.round <= JANELAS[j][1]);
  for (let i = 0; i < g.dets.length && g.phase === 'detetives'; i++) {
    const d = g.dets[i]; const t = toks[d.owner];
    if (g.vez !== i) continue; act(g, t, {action: 'rolar', i}); inc('dado', d.pa);
    for (let passos = 0; passos < 8 && g.phase === 'detetives' && !d.encerrou && d.pa > 0; passos++) {
      const o = opcoesDetetive(g, i); const ok = Object.fromEntries(o.acoes.map(a => [a.acao, a]));
      const faz = (acao:string, extra:Record<string, unknown> = {}) => { act(g, t, {action: 'det', i, acao, ...extra}); inc('det_' + acao); };
      // 1) acusação quando o time já deduziu tudo
      if (ok.acusar?.ok && ext.length === 1 && jan.length === 1) { faz('acusar', {extracao: ext[0], janela: jan[0]}); continue; }
      // 2) prender se a crença é pequena e inclui este local
      if (ok.abordar?.ok && crenca.has(d.loc) && crenca.size <= 3) { const antes = g.revelacoes.length; const fz = fonte + '|n' + crenca.size; faz('abordar'); if ((g.phase as string) === 'fim' && g.winner === 'detetives') inc('captura_por_' + fz); if (g.phase !== 'detetives') break;
        crenca = g.revelacoes.length > antes && g.revelacoes.at(-1)!.local ? new Set([g.revelacoes.at(-1)!.local!]) : new Set([...crenca].filter(x => x !== d.loc)); continue; }
      // 3) analista intercepta
      const fila = ok.interceptar?.ok ? ok.interceptar.alvos![0] : null;
      if (fila && (d.papel === 'analista' || r() < 0.3)) { faz('interceptar', {n: fila.n}); continue; }
      // 4) perícia e confisco de envelopes
      if (ok.periciar?.ok && (d.papel === 'perito' || r() < 0.5)) { faz('periciar'); continue; }
      if (ok.confiscar?.ok) { faz('confiscar'); continue; }
      // 5) rastro e testemunhas
      if (ok.investigar?.ok && crenca.size > 1 && crenca.has(d.loc) === false && r() < 0.5) {
        faz('investigar'); const txt = g.avisos.at(-1)!.texto; const m = /esteve aqui na rodada (\d+)/.exec(txt);
        if (m && txt.includes('ainda não saiu')) { crenca = new Set([d.loc]); fonte = 'investigar-aqui'; }
        else if (m) { const seg = /Seguiu para ([^.]+)\./.exec(txt); if (seg) { const id = IDS.find(x => LOCAL[x].curto === seg[1]); if (id && +m[1] >= g.round - 1) { crenca = new Set([...alcance(id, 2).keys(), id]); fonte = 'investigar-rastro'; } } }
        continue; }
      if (ok.interrogar?.ok && crenca.size > 2 && r() < 0.6) { faz('interrogar'); const sim = g.avisos.at(-1)!.texto.includes('SIM');
        const raio = new Set([d.loc, ...alcance(d.loc, d.papel === 'rua' ? 3 : 2).keys()]);
        const nova = new Set([...crenca].filter(x => sim === raio.has(x))); if (sim) fonte = 'interrogar'; crenca = nova.size ? nova : sim ? raio : crenca; continue; }
      // 6) compras úteis
      if (ok.comprar?.ok && g.equipe.orcamento >= 9 && !g.equipe.decodificador && d.papel === 'delegada') { faz('comprar', {item: 'decodificador'}); continue; }
      if (ok.usar?.ok && ok.usar.alvos!.some(a => a.item === 'decodificador')) { faz('usar', {item: 'decodificador'}); continue; }
      // 7) blitz na extração provável perto da janela
      if (ok.bloqueio?.ok && janelaAgora && ext.length <= 2 && ext.includes(d.loc)) { faz('bloqueio'); continue; }
      // 8) mover
      let alvos: number[];
      if (d.papel === 'analista' && g.fila.some(x => !x.decifrada && !x.expirada) && !d.escuta) alvos = [HQ];
      else if (janelaAgora && ext.length <= 2 && i % 2 === 0) alvos = ext;
      else if (crenca.size <= 25) alvos = [...crenca];
      else alvos = g.contatos.filter(c => c.status === 'fechado' && !c.lida).map(c => c.local);
      if (!alvos.length) alvos = [...crenca];
      const atual = Math.min(...alvos.map(a => dist(d.loc, a)));
      let melhor: {l:number;n:number} | null = null;
      for (const m of o.mover) { const n = Math.min(...alvos.map(a => dist(m.local, a))) * 3 + m.custo + r(); if (!melhor || n < melhor.n) melhor = {l: m.local, n}; }
      if (melhor && melhor.n < atual * 3 - 0.5) { act(g, t, {action: 'det', i, acao: 'mover', local: melhor.l}); inc('det_mover'); continue; }
      break;
    }
    if (g.phase === 'detetives' && g.vez === i) act(g, t, {action: 'encerrar'});
  }
  return crenca;
}

function partida(seed:number, jogadores:number) {
  const host = tok(999); const g = createGame('SIMUL', host, seed); const toks: string[] = [];
  for (let k = 0; k < jogadores; k++) { toks.push(tok(k + 1)); addPlayer(g, 'J' + (k + 1), toks[k]); }
  act(g, host, {action: 'iniciar'});
  const porId: Record<string, string> = {}; g.players.forEach((p, k) => porId[p.id] = toks[k]);
  const spyT = porId[g.spy!.owner]; const r = rng(seed * 13 + 5);
  act(g, spyT, {action: 'preparar', perfil: ['sombra', 'corredor', 'criptografo'][seed % 3], local: g.spy!.opcoesInicio[0]});
  let crenca: Crenca = new Set(IDS.filter(i => !MAPA.inicio_detetives.opcoes.includes(i))); fonte = 'inicio';
  let laco = 0;
  while (g.phase !== 'fim' && laco++ < 500) {
    if (g.phase === 'espiao') { const rodada = g.round; jogarEspiao(g, spyT, r); crenca = expandir(g, crenca); crenca = aplicarRevelacoes(g, crenca, rodada); inc('crenca_soma', crenca.size); inc('crenca_n'); continue; }
    if (g.phase === 'detetives') { crenca = jogarDetetives(g, porId, crenca, r); if ((g.phase as string) !== 'fim') crenca = aplicarRevelacoes(g, crenca, g.round); continue; }
    tick(g, Date.now() + 1e7);
  }
  if (g.phase !== 'fim') throw new Error('partida não terminou, seed ' + seed);
  return g;
}

const N = Number(process.argv[2] ?? 400);
const res: Record<string, number> = {}; const motivo: Record<string, number> = {}; const porJog: Record<number, {e:number;t:number}> = {};
let rodadas = 0, pistas = 0, decif = 0, trans = 0, revel = 0, aglMedia = 0, credOk = 0;
for (let s = 1; s <= N; s++) {
  const j = 2 + (s % 5); const g = partida(s, j);
  res[g.winner!] = (res[g.winner!] ?? 0) + 1; porJog[j] ??= {e: 0, t: 0}; porJog[j].t++; if (g.winner === 'espiao') porJog[j].e++;
  const k = g.motivo.replace(/em [A-ZÀ-Ú][^.]*\./, 'em X.').replace(/\(.*?\)/g, '').replace(/[A-ZÀ-Ú]\w+ \(\w+\) prendeu/, 'Detetive prendeu').split('.')[0].slice(0, 60);
  motivo[k] = (motivo[k] ?? 0) + 1;
  if (g.motivo.startsWith('Amanheceu')) { const {ext, jan} = candidatosEspiao(g); inc('T_cred_' + Math.min(g.spy!.credenciais, 1)); inc('T_ext_' + ext.length); inc('T_jan_' + jan.length);
    inc('T_distExt_' + Math.min(dist(g.spy!.loc, g.plano!.extracao), 6)); inc('T_falhas_' + g.spy!.falhas); }
  rodadas += g.round; pistas += g.contatos.filter(c => c.status === 'recolhido').length; decif += g.fila.filter(x => x.decifrada).length; trans += g.fila.length; revel += g.revelacoes.length;
  aglMedia += IDS.reduce((a, i) => a + agl(g, i), 0) / IDS.length; if (g.spy!.credenciais > 0 || g.horaH) credOk++;
}
console.log(JSON.stringify({partidas: N, vitorias: res, taxa_espiao: +(100 * (res.espiao ?? 0) / N).toFixed(1),
  por_jogadores: Object.fromEntries(Object.entries(porJog).map(([k, v]) => [k, `${(100 * v.e / v.t).toFixed(0)}% espião`])),
  motivos: motivo, media: {rodadas: +(rodadas / N).toFixed(1), pistas_recolhidas: +(pistas / N).toFixed(1), transmissoes: +(trans / N).toFixed(1), decifradas: +(decif / N).toFixed(1),
    revelacoes: +(revel / N).toFixed(1), lotacao_media: +(aglMedia / N).toFixed(2), tamanho_crenca_detetives: +(st.crenca_soma / st.crenca_n).toFixed(1)},
  acoes: Object.fromEntries(Object.entries(st).filter(([k]) => !k.startsWith('crenca')).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / N).toFixed(2)]))}, null, 1));
