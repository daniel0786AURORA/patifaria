import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, addPlayer, act, tick, view, opcoesEspiao, opcoesDetetive, acoesEspiao, aplicarCarta, mods, EVENTO, ITEM, BALANCO, type Game} from '../src/sombra/rules/engine.ts';
import {sortearPlano, rng} from '../src/sombra/rules/plan.ts';
import {LOCAL, EXTRACOES, JANELAS, VIZ, IDS, HQ, tem, alcance} from '../src/sombra/rules/map.ts';

const tok = (n:number) => n.toString(16).padStart(64, '0');
function mesa(jogadores = 4, seed = 1): {g:Game;host:string;toks:string[]} {
  const host = tok(999); const g = createGame('ABCDE', host, seed); const toks: string[] = [];
  for (let i = 0; i < jogadores; i++) { toks.push(tok(i + 1)); addPlayer(g, `Jogador ${i + 1}`, toks[i]); }
  return {g, host, toks};
}
const spyTok = (g:Game, toks:string[]) => toks.find(t => view(g, t).me.tipo === 'jogador' && (view(g, t).me as any).side === 'espiao')!;

test('plano secreto respeita as regras das pistas', () => {
  const vistos = new Set<string>();
  for (let s = 0; s < 600; s++) {
    const p = sortearPlano(rng(s)); const ext = LOCAL[p.extracao].curto; vistos.add(ext + p.janela);
    const onde = p.contatos.filter(c => c.pista.tipo === 'ONDE').map(c => new Set(c.pista.elimina));
    const quando = p.contatos.filter(c => c.pista.tipo === 'QUANDO').map(c => new Set(c.pista.elimina));
    assert.equal(onde.length, 4); assert.equal(quando.length, 2); assert.equal(p.contatos.length, 8);
    assert.ok(onde.every(e => !e.has(ext)));
    assert.equal(new Set(onde.flatMap(e => [...e])).size, 5);
    assert.ok(quando.every(q => !q.has(p.janela) && q.size === 2));
    assert.equal(new Set(quando.flatMap(q => [...q])).size, 3);
    assert.ok(new Set(p.contatos.map(c => LOCAL[c.local].zona)).size >= 5);
  }
  assert.equal(vistos.size, 24);
});

test('lobby: entrar, escolher espião e começar', () => {
  const {g, host, toks} = mesa(3);
  assert.throws(() => addPlayer(g, 'Jogador 1', tok(50)), /apelido/);
  act(g, host, {action: 'escolherEspiao', player: view(g, toks[2]).me.tipo === 'jogador' ? (view(g, toks[2]).me as any).id : ''});
  act(g, host, {action: 'iniciar'});
  assert.equal(g.phase, 'preparo'); assert.equal(g.dets.length, 4);
  assert.equal(g.spy!.owner, (view(g, toks[2]).me as any).id);
  assert.throws(() => act(g, toks[0], {action: 'iniciar'}), /vez|Ação/);
});

test('informação secreta não vaza para a TV nem para os detetives', () => {
  const {g, host, toks} = mesa(4, 7); act(g, host, {action: 'iniciar'});
  const st = spyTok(g, toks); const s = g.spy!;
  act(g, st, {action: 'preparar', perfil: 'sombra', local: s.opcoesInicio[1]});
  const secretos = [...g.contatos.map(c => c.pista.texto)];
  for (const t of [host, ...toks.filter(x => x !== st)]) {
    const v = view(g, t); const txt = JSON.stringify(v);
    assert.equal(v.espiao, null); assert.equal(v.pub.final, null);
    assert.ok(!('loc' in (v.pub.espiao ?? {})));
    for (const sec of secretos) assert.ok(!txt.includes(sec), 'texto de pista vazou: ' + sec);
    assert.ok(!txt.includes('"plano"') || v.pub.final === null);
  }
  const vs = view(g, st); assert.equal(vs.espiao!.loc, s.loc); assert.equal(vs.equipe, null);
});

test('movimento do espião: a pé dentro do alcance e nunca para em detetive', () => {
  const {g, host, toks} = mesa(2, 3); act(g, host, {action: 'iniciar'});
  const st = spyTok(g, toks); act(g, st, {action: 'preparar', perfil: 'corredor', local: g.spy!.opcoesInicio[0]});
  const o = opcoesEspiao(g); const ocup = new Set(g.dets.map(d => d.loc));
  const dois = alcance(g.spy!.loc, BALANCO.peAlcance);
  assert.ok(o.pe.length > 0);
  for (const d of o.pe) { assert.ok(dois.has(d.local)); assert.ok(!ocup.has(d.local)); }
  for (const k of Object.values(o)) for (const d of k) assert.ok(!ocup.has(d.local) || d.local === g.spy!.loc);
  const longe = [...alcance(g.spy!.loc, 8)].find(([, d]) => d > BALANCO.peAlcance + 1)![0];
  assert.throws(() => act(g, st, {action: 'mover', modo: 'pe', local: longe}), /não é possível/);
});

// ------------------------------------------------------------------ simulação com jogadores automáticos
function jogarPartida(seed:number, jogadores = 4) {
  const {g, host, toks} = mesa(jogadores, seed); act(g, host, {action: 'iniciar'});
  const r = rng(seed * 7 + 1); const pick = <T,>(xs:T[]) => xs[Math.floor(r() * xs.length)];
  const st = spyTok(g, toks);
  act(g, st, {action: 'preparar', perfil: pick(['sombra', 'corredor', 'criptografo']), local: pick(g.spy!.opcoesInicio)});
  let passos = 0;
  while (g.phase !== 'fim' && passos++ < 5000) {
    if (g.phase === 'espiao') {
      const s = g.spy!;
      if (s.movimentos > 0 && (!s.moveu || r() < 0.3)) {
        const o = opcoesEspiao(g); const modos = (Object.keys(o) as (keyof typeof o)[]).filter(k => o[k].length);
        // vai em direção a contatos fechados ou ao ponto de extração quando tem senha
        const alvo = s.credenciais > 0 ? EXTRACOES : g.contatos.filter(c => c.status === 'fechado').map(c => c.local);
        let melhor: {m:string;l:number} | null = null; let md = 99;
        for (const m of modos) for (const d of o[m]) for (const a of alvo) { const dist = a === d.local ? 0 : alcance(d.local, 5).get(a) ?? 9; if (dist < md && r() < 0.9) { md = dist; melhor = {m, l: d.local}; } }
        if (!melhor || r() < 0.15) { const m = pick(modos); melhor = {m, l: pick(o[m]).local}; }
        act(g, st, {action: 'mover', modo: melhor.m, local: melhor.l}); continue;
      }
      const ac = acoesEspiao(g).filter(a => a.ok);
      const pref = ac.find(a => a.acao === 'horaH') ?? ac.find(a => a.acao === 'recolher') ?? (r() < 0.2 ? pick(ac) : ac.find(a => a.acao === 'passar'))!;
      act(g, st, {action: 'agir', acao: pref.acao}); continue;
    }
    if (g.phase === 'detetives') {
      const i = g.vez!; const d = g.dets[i]; const dt = toks.find(t => (view(g, t).me as any).id === d.owner)!;
      if (!d.rolou) { act(g, dt, {action: 'rolar', i}); assert.ok(d.pa >= 1 && d.pa <= 7); continue; }
      const o = opcoesDetetive(g, i); const ok = o.acoes.filter(a => a.ok);
      const roll = r();
      try {
        if (d.pa <= 0 || roll < 0.08) act(g, dt, {action: 'encerrar'});
        else if (roll < 0.5 && o.mover.length) act(g, dt, {action: 'det', i, acao: 'mover', local: pick(o.mover).local});
        else if (ok.length) {
          const a = pick(ok);
          if (a.acao === 'interceptar') act(g, dt, {action: 'det', i, acao: a.acao, n: a.alvos![0].n});
          else if (a.acao === 'comprar') act(g, dt, {action: 'det', i, acao: a.acao, item: pick(a.alvos!).item});
          else if (a.acao === 'usar') { const it = pick(a.alvos!).item!; act(g, dt, {action: 'det', i, acao: 'usar', item: it, zona: LOCAL[d.loc].zona, local: VIZ[d.loc][0]}); }
          else if (a.acao === 'transferir') act(g, dt, {action: 'det', i, acao: a.acao, alvo: (i + 1) % g.dets.length});
          else if (a.acao === 'acusar') act(g, dt, {action: 'det', i, acao: a.acao, extracao: pick(EXTRACOES), janela: pick(Object.keys(JANELAS))});
          else act(g, dt, {action: 'det', i, acao: a.acao});
        } else act(g, dt, {action: 'encerrar'});
      } catch (e) { if (!/insuficiente|Orçamento|PA|Escolha|vizinho|estoque|chuva|Item|grampo/i.test((e as Error).message)) throw e; act(g, dt, {action: 'encerrar'}); }
      continue;
    }
    if (!tick(g, Date.now() + 1e7)) throw new Error('travou na fase ' + g.phase);
  }
  assert.equal(g.phase, 'fim', 'a partida não terminou');
  assert.ok(g.round <= 24);
  // invariantes finais
  for (const t of toks) JSON.stringify(view(g, t));
  return g;
}
test('300 partidas simuladas terminam sem erro', () => {
  const placar = {espiao: 0, detetives: 0}; const motivos: Record<string, number> = {};
  for (let s = 1; s <= 300; s++) { const g = jogarPartida(s, 2 + (s % 5)); placar[g.winner!]++; const k = g.motivo.split(/[.:]/)[0].replace(/\d+|[A-ZÀ-Ú][a-zà-ú]+ \d+/g, '').slice(0, 40); motivos[k] = (motivos[k] ?? 0) + 1; }
  console.log('placar com jogadores aleatórios:', placar, motivos);
  assert.equal(placar.espiao + placar.detetives, 300);
});

test('tempo esgotado avança as fases sozinho', () => {
  const {g, host} = mesa(3, 11); act(g, host, {action: 'iniciar'});
  tick(g, Date.now() + 1e7); assert.equal(g.phase, 'espiao');
  tick(g, Date.now() + 1e7); assert.equal(g.phase, 'detetives');
  for (let k = 0; k < 6 && g.phase === 'detetives'; k++) tick(g, Date.now() + 1e7);
  assert.ok(g.phase === 'espiao' || g.phase === 'fim'); assert.ok(g.round >= 2 || g.phase === 'fim');
});

// ------------------------------------------------------------------ cobertura de cartas, itens e ações
function emJogo(seed = 5, jogadores = 3) {
  const {g, host, toks} = mesa(jogadores, seed); act(g, host, {action: 'iniciar'});
  const st = spyTok(g, toks); act(g, st, {action: 'preparar', perfil: 'sombra', local: g.spy!.opcoesInicio[0]});
  const det = toks.find(t => t !== st)!; return {g, host, toks, st, det};
}
const rodarDetetives = (g:Game) => { for (let k = 0; k < 8 && g.phase === 'detetives'; k++) tick(g, Date.now() + 1e7); };
const suaVez = (g:Game, tok:string, i:number) => { g.vez = i; g.dets[i].rolou = false; g.dets[i].pa = 0; act(g, tok, {action: 'rolar', i}); g.dets[i].pa = 6; };
const paraDetetives = (g:Game, st:string) => { const o = opcoesEspiao(g); const k = (Object.keys(o) as (keyof typeof o)[]).find(m => o[m].length)!; act(g, st, {action: 'mover', modo: k, local: o[k][0].local}); act(g, st, {action: 'agir', acao: 'passar'}); };

test('todas as cartas de evento aplicam sem erro e a rodada segue', () => {
  for (const id of Object.keys(EVENTO)) {
    const {g, toks} = emJogo(17);
    const ev = EVENTO[id]; g.round = ev.rodadas?.[0] ?? ev.rodadas_validas?.[0] ?? 6;
    if (ev.rodadas) { g.agenda = [{id, rodadas: ev.rodadas}]; aplicarCarta(g, id, true); } else aplicarCarta(g, id);
    mods(g); opcoesEspiao(g); g.dets.forEach((_, i) => opcoesDetetive(g, i));
    for (const t of toks) JSON.stringify(view(g, t));
    tick(g, Date.now() + 1e7); tick(g, Date.now() + 1e7); tick(g, Date.now() + 1e7);
    assert.ok(['espiao', 'detetives', 'fim'].includes(g.phase), id);
  }
});

test('todos os itens podem ser comprados e usados', () => {
  for (const item of Object.keys(ITEM)) {
    const {g, st, det} = emJogo(23); paraDetetives(g, st);
    const i = g.dets.findIndex(d => d.loc === HQ); g.equipe.orcamento = 20; suaVez(g, det, i);
    act(g, det, {action: 'det', i, acao: 'comprar', item});
    assert.ok(g.equipe.estoque.some(x => x.item === item), item);
    const d = g.dets[i];
    if (item === 'grampo') { d.loc = 1; const cand = (globalThis as any).CAND ?? null; void cand;
      const c = IDS.find(x => tem(x, 'CON'))!; d.loc = c; act(g, det, {action: 'det', i, acao: 'grampo'}); assert.ok(g.equipe.grampos.includes(c)); continue; }
    act(g, det, {action: 'det', i, acao: 'usar', item, zona: LOCAL[d.loc].zona, local: item === 'cones' ? VIZ[d.loc][0] : 1});
    assert.ok(!g.equipe.estoque.some(x => x.item === item), 'não consumiu ' + item);
  }
});

test('ações do espião: recolher, sacar, disfarce, falsa, informante e emergência', () => {
  const {g, st} = emJogo(31);
  const c = g.contatos[0]; g.spy!.loc = VIZ[c.local].find(v => !g.dets.some(d => d.loc === v))!;
  act(g, st, {action: 'mover', modo: 'pe', local: c.local}); act(g, st, {action: 'agir', acao: 'recolher'});
  assert.equal(c.status, 'recolhido'); assert.equal(g.fila.length, 1);
  const prox = (acao:string, onde:(id:number)=>boolean) => {
    rodarDetetives(g); assert.equal(g.phase, 'espiao');
    const alvo = IDS.find(x => onde(x) && !g.dets.some(d => d.loc === x) && VIZ[x].some(v => !g.dets.some(d => d.loc === v)))!;
    g.spy!.loc = VIZ[alvo].find(v => !g.dets.some(d => d.loc === v))!; g.spy!.dinheiro = 20;
    act(g, st, {action: 'mover', modo: 'pe', local: alvo}); act(g, st, {action: 'agir', acao});
  };
  prox('sacar', x => tem(x, 'ATM')); assert.ok(g.alertaBancario);
  prox('disfarce', x => tem(x, 'LOJ')); assert.ok(g.spy!.disfarce > 0);
  prox('falsa', x => true); assert.ok(g.fila.some(x => x.falsa));
  prox('informante', x => LOCAL[x].aglomeracao_base >= 3);
  g.contatos.forEach(x => { if (x.pista.tipo === 'CREDENCIAL') x.status = 'recolhido'; }); g.spy!.credenciais = 0;
  prox('emergencia', x => tem(x, 'EMERGENCIA')); assert.equal(g.spy!.credenciais, 1);
});

test('Hora H certa termina com fuga; duas erradas queimam a rede', () => {
  const {g, st} = emJogo(41); const ext = g.plano!.extracao; const [a] = JANELAS[g.plano!.janela];
  g.round = a; g.dets.forEach((d, k) => d.loc = [34, 1, 13, 60][k] === ext ? 13 : [34, 1, 13, 60][k]);
  g.spy!.loc = VIZ[ext].find(v => !g.dets.some(d => d.loc === v))!; g.spy!.credenciais = 1;
  act(g, st, {action: 'mover', modo: 'pe', local: ext}); act(g, st, {action: 'agir', acao: 'horaH'});
  assert.ok(g.horaH); rodarDetetives(g); assert.equal(g.winner, 'espiao');
  const b = emJogo(43); const e2 = EXTRACOES.find(e => e !== b.g.plano!.extracao)!; b.g.round = 9; b.g.spy!.credenciais = 2;
  for (let k = 0; k < 2; k++) { b.g.phase = 'espiao'; b.g.spy!.moveu = false; b.g.spy!.agiu = false; b.g.spy!.movimentos = 1;
    b.g.dets.forEach(d => { if (d.loc === e2 || VIZ[e2].includes(d.loc)) d.loc = 13; });
    b.g.spy!.loc = VIZ[e2][0]; act(b.g, b.st, {action: 'mover', modo: 'pe', local: e2}); act(b.g, b.st, {action: 'agir', acao: 'horaH'}); }
  assert.equal(b.g.winner, 'detetives');
});

test('acusação certa ativa o plano B; janela perdida é remarcada', () => {
  const {g, st, det} = emJogo(47); paraDetetives(g, st);
  const i = g.dets.findIndex(d => d.loc === HQ); const antigo = {e: g.plano!.extracao, j: g.plano!.janela}; suaVez(g, det, i);
  act(g, det, {action: 'det', i, acao: 'acusar', extracao: antigo.e, janela: antigo.j});
  assert.notEqual(g.phase, 'fim'); assert.ok(g.spy!.planoB); assert.notEqual(g.plano!.extracao, antigo.e);
  const h = emJogo(53); h.g.plano!.janela = 'A'; h.g.round = 10; h.g.phase = 'detetives'; h.g.vez = 0; h.g.deadline = 1; rodarDetetives(h.g);
  assert.equal(h.g.plano!.janela, 'B'); assert.equal(h.g.spy!.remarcada, 'B');
});

test('pontos de contato: a TV vê os 14 candidatos, não quais são os 8 verdadeiros', () => {
  const {g, host, st, det} = emJogo(59);
  const tv = view(g, host); assert.equal(tv.pub.contatos.length, 14);
  paraDetetives(g, st);
  const i = 0; const vazio = (tv.pub.contatos as {local:number}[]).map(c => c.local).find(l => !g.contatos.some(c => c.local === l))!;
  g.dets[i].loc = vazio; suaVez(g, det, i); act(g, det, {action: 'det', i, acao: 'periciar'});
  assert.equal(g.equipe.vistoriados[vazio], 'vazio'); assert.equal(g.equipe.pistas.length, 0);
});

test('turno dos detetives: um de cada vez, com dado público de 1 a 6', () => {
  const {g, toks, st} = emJogo(61, 3); paraDetetives(g, st);
  assert.equal(g.vez, 0); const dono = (i:number) => toks.find(t => (view(g, t).me as any).id === g.dets[i].owner)!;
  assert.throws(() => act(g, dono(1), {action: 'rolar', i: 1}), /vez/);
  assert.throws(() => act(g, dono(0), {action: 'det', i: 0, acao: 'investigar'}), /dado/);
  act(g, dono(0), {action: 'rolar', i: 0});
  const v = g.dado!.valor; assert.ok(v >= 1 && v <= 6); assert.equal(g.dets[0].pa, v);
  for (const t of toks) assert.equal(view(g, t).pub.dado!.valor, v);
  assert.throws(() => act(g, dono(0), {action: 'rolar', i: 0}), /já rolou/);
  act(g, dono(0), {action: 'encerrar'}); assert.equal(g.vez, 1);
  for (let i = 1; i < g.dets.length; i++) { act(g, dono(i), {action: 'rolar', i}); act(g, dono(i), {action: 'encerrar'}); }
  assert.ok(g.phase === 'espiao' || g.phase === 'fim');
});
