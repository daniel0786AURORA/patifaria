import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, addPlayer, act, tick, view, opcoesEspiao, opcoesDetetive, acoesEspiao, type Game} from '../src/sombra/rules/engine.ts';
import {sortearPlano, rng} from '../src/sombra/rules/plan.ts';
import {LOCAL, EXTRACOES, JANELAS, VIZ, alcance} from '../src/sombra/rules/map.ts';

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

test('movimento do espião: a pé até 2 ligações e nunca para em detetive', () => {
  const {g, host, toks} = mesa(2, 3); act(g, host, {action: 'iniciar'});
  const st = spyTok(g, toks); act(g, st, {action: 'preparar', perfil: 'corredor', local: g.spy!.opcoesInicio[0]});
  const o = opcoesEspiao(g); const ocup = new Set(g.dets.map(d => d.loc));
  const dois = alcance(g.spy!.loc, 2);
  assert.ok(o.pe.length > 0);
  for (const d of o.pe) { assert.ok(dois.has(d.local)); assert.ok(!ocup.has(d.local)); }
  for (const k of Object.values(o)) for (const d of k) assert.ok(!ocup.has(d.local) || d.local === g.spy!.loc);
  const longe = [...alcance(g.spy!.loc, 6)].find(([, d]) => d >= 4)![0];
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
      const livres = g.dets.map((d, i) => ({d, i})).filter(x => !x.d.encerrou);
      const {d, i} = livres[0]; const dt = toks.find(t => (view(g, t).me as any).id === d.owner)!;
      const o = opcoesDetetive(g, i); const ok = o.acoes.filter(a => a.ok);
      const roll = r();
      try {
        if (d.pa <= 0 || roll < 0.08) act(g, dt, {action: 'encerrar', i});
        else if (roll < 0.5 && o.mover.length) act(g, dt, {action: 'det', i, acao: 'mover', local: pick(o.mover).local});
        else if (ok.length) {
          const a = pick(ok);
          if (a.acao === 'interceptar') act(g, dt, {action: 'det', i, acao: a.acao, n: a.alvos![0].n});
          else if (a.acao === 'comprar') act(g, dt, {action: 'det', i, acao: a.acao, item: pick(a.alvos!).item});
          else if (a.acao === 'usar') { const it = pick(a.alvos!).item!; act(g, dt, {action: 'det', i, acao: 'usar', item: it, zona: LOCAL[d.loc].zona, local: VIZ[d.loc][0]}); }
          else if (a.acao === 'transferir') act(g, dt, {action: 'det', i, acao: a.acao, alvo: (i + 1) % g.dets.length});
          else if (a.acao === 'acusar') act(g, dt, {action: 'det', i, acao: a.acao, extracao: pick(EXTRACOES), janela: pick(Object.keys(JANELAS))});
          else act(g, dt, {action: 'det', i, acao: a.acao});
        } else act(g, dt, {action: 'encerrar', i});
      } catch (e) { if (!/insuficiente|Orçamento|PA|Escolha|vizinho|estoque|chuva|Item|grampo/i.test((e as Error).message)) throw e; act(g, dt, {action: 'encerrar', i}); }
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
  tick(g, Date.now() + 1e7); assert.ok(g.phase === 'espiao' || g.phase === 'fim'); assert.ok(g.round >= 2 || g.phase === 'fim');
});
