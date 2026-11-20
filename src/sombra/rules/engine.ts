// Motor de regras de Sombra no Guaíba. Roda SOMENTE no servidor: guarda o plano e a rota secreta.
import {createHash, randomInt} from 'node:crypto';
import {cartas as cartasJson} from './dados.js';
import {MAPA, LOCAL, IDS, VIZ, AGUA, BIKE, BIKE_ZONAS, TREM, LINHAS, EXTRACOES, JANELAS, HQ, tem, hora, periodo, alcance, extracaoMeio} from './map.js';
import {sortearPlano, pistaFalsa, shuffle, type Pista, type Plano, type Rng} from './plan.js';

// ------------------------------------------------------------------ tipos
export type Papel = 'delegada'|'perito'|'analista'|'tatico'|'rua';
export type Modo = 'pe'|'bike'|'onibus'|'trem'|'app'|'barco'|'esconder';
type Efeito = {tipo:string;[k:string]:any};
type CartaEvento = {id:string;nome:string;texto:string;efeitos:Efeito[];rodadas?:[number,number];grupo?:string;copias?:number;duracao?:number;rodadas_validas?:[number,number];cat?:string};
type Item = {id:string;nome:string;custo:number;usos?:number;texto:string};
const CARTAS = cartasJson as unknown as {eventos_agendados:CartaEvento[];eventos_aleatorios:CartaEvento[];itens:Item[];perfis_espiao:{id:string;nome:string;texto:string}[];papeis_detetives:{id:Papel;nome:string;letra:string}[]};
export const EVENTO: Record<string, CartaEvento> = Object.fromEntries([...CARTAS.eventos_agendados, ...CARTAS.eventos_aleatorios].map(e => [e.id, e]));
export const ITEM: Record<string, Item> = Object.fromEntries(CARTAS.itens.map(i => [i.id, i]));
const ORDEM_PAPEIS: Papel[] = ['delegada', 'perito', 'analista', 'tatico', 'rua'];
const DENUNCIA = [0, 5, 10, 20, 30, 40];
/** Parâmetros de equilíbrio (ajustados com scripts/sombra-sim.ts). */
export const BALANCO = {viaturaAlcance: 3, viaturaPorRodada: 1, interrogarRaio: 1, interrogarCusto: 2, interrogarPorRodada: 1, abordarPorRodada: 1, confiscar: false, rendaEspiao: 1,
  dinheiroInicial: 10, conteudoSoComDecodificador: true, horaHMaxAbordagem: 50, peAlcance: 3, abordagem: [100, 100, 100, 85, 70, 55]};
export const TEMPO = {preparo: 120_000, espiao: 90_000, detetives: 150_000, vez: 75_000};

type Player = {id:string;secret:string;name:string;side:'espiao'|'detetive'|null;seen:number};
type Det = {papel:Papel;owner:string;loc:number;pa:number;bloqueio:boolean;encerrou:boolean;k9:number;escuta:boolean;transferiu:boolean;interrogouGratis:boolean;investigou:number[];viaturas?:number;abordagens?:number;interrogacoes?:number;rolou?:boolean};
type Spy = {owner:string;loc:number;dinheiro:number;exposicao:number;perfil:string;credenciais:number;pistas:Pista[];disfarce:number;escudo:boolean;
  escondido:number;falsas:number;falhas:number;denunciaIgnorada:boolean;deveMover:boolean;app:{rodada:number;de:number;para:number}|null;
  movimentos:number;moveu:boolean;agiu:boolean;transporteGratis:boolean;appGratis:boolean;opcoesInicio:number[];planoB?:boolean;remarcada?:string};
type Contato = {local:number;pista:Pista;status:'fechado'|'recolhido'|'confiscado';lida:boolean;grampo:boolean;extra?:boolean};
type Transmissao = {n:number;rodada:number;tipo:string;pista:Pista;zona:string;falsa:boolean;tentativas:number;decifrada:boolean;expirada:boolean;bonus:number};
type Rastro = {rodada:number;local:number;saiu?:Modo;acao?:string;proximo?:number};
type Revelacao = {rodada:number;local?:number;zona?:string;motivo:string};
type Ativo = {id:string;de:number;ate:number;escolha?:number|string};
export type Aviso = {id:number;rodada:number;texto:string;tom:'info'|'alerta'|'perigo'|'bom';para:'todos'|'equipe'|'espiao';local?:number;zona?:string};
type PistaEquipe = {fonte:string;tipo:string;texto:string;elimina?:string[];zona?:string;duvidosa?:boolean;rodada:number};
type Equipe = {orcamento:number;estoque:{item:string;desde:number}[];dossie:Record<string,string>;chat:{autor:string;texto:string;at:number}[];pistas:PistaEquipe[];
  acusou:boolean;retratos:{zona:string;ate:number}[];ceic:{zona:string;ate:number}[];cones:{local:number;ate:number}[];lancha:number;decodificador:boolean;
  interrogarGratis:number;bloqueiosGratis:number;bloqueiosGratisAte:number;movimentoGratis:string[]|null;grampos:number[];vistoriados:Record<number,string>};
export type Game = {
  kind:'sombra';code:string;revision:number;host:string;players:Player[];phase:'lobby'|'preparo'|'espiao'|'detetives'|'fim';round:number;rs:number;
  plano:Plano|null;contatos:Contato[];dets:Det[];spy:Spy|null;agenda:{id:string;rodadas:[number,number]}[];baralho:string[];descarte:string[];ativos:Ativo[];carta:string|null;
  fila:Transmissao[];bilhetes:{rodada:number;modo:Modo}[];rastro:Rastro[];revelacoes:Revelacao[];equipe:Equipe;avisos:Aviso[];
  horaH:{local:number;rodada:number}|null;pendentes?:{local:number;motivo:string}[];alertaBancario:{zona:string;rodada:number}|null;cancelarRevelacao:boolean;interceptBloqueado:boolean;
  deadline:number|null;vez?:number|null;dado?:{det:number;valor:number;rodada:number}|null;winner:'espiao'|'detetives'|null;motivo:string;requests:string[];espiaoEscolhido:string|null;
};

// ------------------------------------------------------------------ utilidades
export const hash = (t:string) => createHash('sha256').update(t).digest('hex');
const rnd = (g:Game): number => { let t = (g.rs = (g.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const R = (g:Game): Rng => () => rnd(g);
const chance = (g:Game, pct:number) => rnd(g) * 100 < pct;
const nome = (id:number) => LOCAL[id].curto;
const zonaNome = (z:string) => MAPA.zonas[z];
const fail = (msg:string): never => { throw new Error(msg); };
let avisoSeq = 0;
function aviso(g:Game, texto:string, tom:Aviso['tom'] = 'info', para:Aviso['para'] = 'todos', extra:Partial<Aviso> = {}) {
  g.avisos.push({id: Date.now() * 100 + (avisoSeq++ % 100), rodada: g.round, texto, tom, para, ...extra}); g.avisos = g.avisos.slice(-120);
}

// ------------------------------------------------------------------ criação e sala
export function createGame(code:string, hostToken:string, seed = randomInt(2 ** 31)): Game {
  return {kind: 'sombra', code, revision: 0, host: hash(hostToken), players: [], phase: 'lobby', round: 0, rs: seed, plano: null, contatos: [], dets: [], spy: null,
    agenda: [], baralho: [], descarte: [], ativos: [], carta: null, fila: [], bilhetes: [], rastro: [], revelacoes: [], equipe: equipeNova(), avisos: [],
    horaH: null, alertaBancario: null, cancelarRevelacao: false, interceptBloqueado: false, deadline: null, winner: null, motivo: '', requests: [], espiaoEscolhido: null};
}
const equipeNova = (): Equipe => ({orcamento: 8, estoque: [], dossie: {}, chat: [], pistas: [], acusou: false, retratos: [], ceic: [], cones: [], lancha: 0, decodificador: false,
  interrogarGratis: 0, bloqueiosGratis: 0, bloqueiosGratisAte: 0, movimentoGratis: null, grampos: [], vistoriados: {}});
export function addPlayer(g:Game, name:string, token:string) {
  const n = name.trim().replace(/\s+/g, ' ').slice(0, 18); if (n.length < 2) fail('Escolha um apelido com pelo menos 2 letras.');
  if (g.phase !== 'lobby') fail('A partida já começou.'); if (g.players.length >= 6) fail('A mesa está cheia (6 jogadores).');
  if (g.players.some(p => p.name.toLowerCase() === n.toLowerCase())) fail('Já tem alguém com esse apelido.');
  g.players.push({id: hash(token).slice(0, 12), secret: hash(token), name: n, side: null, seen: Date.now()});
}
const playerOf = (g:Game, token:string) => g.players.find(p => p.secret === hash(token));

function iniciar(g:Game) {
  if (g.players.length < 2) fail('Precisa de pelo menos 2 jogadores: 1 espião e 1 detetive.');
  const spyP = g.players.find(p => p.id === g.espiaoEscolhido) ?? g.players[Math.floor(rnd(g) * g.players.length)];
  g.players.forEach(p => p.side = p === spyP ? 'espiao' : 'detetive');
  const detPlayers = g.players.filter(p => p.side === 'detetive');
  const papeis = ORDEM_PAPEIS.slice(0, g.players.length >= 6 ? 5 : 4);
  const inicio = [MAPA.inicio_detetives.fixo, ...shuffle(R(g), MAPA.inicio_detetives.opcoes)];
  g.dets = papeis.map((papel, i) => ({papel, owner: detPlayers[i % detPlayers.length].id, loc: inicio[i], pa: 0, bloqueio: false, encerrou: false, k9: 0, escuta: papel === 'analista',
    transferiu: false, interrogouGratis: false, investigou: []}));
  g.plano = sortearPlano(R(g));
  g.contatos = g.plano.contatos.map(c => ({local: c.local, pista: c.pista, status: 'fechado', lida: false, grampo: false}));
  // agenda: 4 eventos, sem repetir grupo
  const ag: CartaEvento[] = [];
  for (const e of shuffle(R(g), CARTAS.eventos_agendados)) { if (ag.length < 4 && !ag.some(a => a.grupo && a.grupo === e.grupo)) ag.push(e); }
  g.agenda = ag.sort((a, b) => a.rodadas![0] - b.rodadas![0]).map(e => ({id: e.id, rodadas: e.rodadas!}));
  g.baralho = shuffle(R(g), CARTAS.eventos_aleatorios.flatMap(e => Array(e.copias ?? 1).fill(e.id)));
  const ocup = new Set(g.dets.map(d => d.loc));
  const longe = IDS.filter(i => ![...ocup].some(o => (alcance(o, 2).has(i) || o === i)) && !tem(i, 'CON') && !extracaoMeio(i) && LOCAL[i].zona !== 'ILH');
  const opcoes = shuffle(R(g), longe).slice(0, 3);
  g.spy = {owner: spyP.id, loc: opcoes[0], dinheiro: BALANCO.dinheiroInicial + (g.players.length >= 6 ? 4 : 0), exposicao: 0, perfil: '', credenciais: 0, pistas: [], disfarce: 0, escudo: false, escondido: 0,
    falsas: 2 + (g.players.length >= 6 ? 1 : 0), falhas: 0, denunciaIgnorada: false, deveMover: false, app: null, movimentos: 1, moveu: false, agiu: false, transporteGratis: false, appGratis: false, opcoesInicio: opcoes};
  g.phase = 'preparo'; g.deadline = Date.now() + TEMPO.preparo;
  aviso(g, `${spyP.name} é o espião. A força-tarefa se posiciona.`, 'alerta');
}

// ------------------------------------------------------------------ eventos e modificadores
type Mods = {agl:Map<number,number>;ignoraMad:Set<number>;viaturaZona:Map<string,number>;viaturaLocal:Map<number,number>;viaturaProibida:Set<number>;
  fechado:Record<string,boolean>;linhasFechadas:Set<string>;trecho:Map<string,Set<number>>;horario:Map<string,number>;locaisFechados:Set<number>;lojas:Set<number>;
  esconderijos:Set<number>;disfarce:Map<number,number>;denuncia:number;retratoGlobal:boolean;cameraOff:Set<number>;caixaOff:Set<number>;appCusto:number;barcoClandestino:number;
  silencio:Set<number>;assalto:number;chuva:boolean};
const ativosAgora = (g:Game) => [
  ...g.agenda.filter(a => g.round >= a.rodadas[0] && g.round <= a.rodadas[1]).map(a => ({id: a.id, de: a.rodadas[0], ate: a.rodadas[1]} as Ativo)),
  ...g.ativos.filter(a => g.round >= a.de && g.round <= a.ate)];
function locaisDoEfeito(e:Efeito, a:Ativo): number[] {
  if (e.mesmo_local || e.sorteio === 1) return typeof a.escolha === 'number' ? [a.escolha] : [];
  if (e.locais?.length) return e.locais;
  if (e.zonas?.length) return IDS.filter(i => e.zonas.includes(LOCAL[i].zona));
  if (e.sorteio && typeof a.escolha === 'string') return IDS.filter(i => LOCAL[i].zona === a.escolha);
  if (e.um_local && typeof a.escolha === 'number') return [a.escolha];
  return [];
}
export function mods(g:Game): Mods {
  const m: Mods = {agl: new Map(), ignoraMad: new Set(), viaturaZona: new Map(), viaturaLocal: new Map(), viaturaProibida: new Set(), fechado: {}, linhasFechadas: new Set(), trecho: new Map(),
    horario: new Map(), locaisFechados: new Set(), lojas: new Set(), esconderijos: new Set(), disfarce: new Map(), denuncia: 0, retratoGlobal: false, cameraOff: new Set(), caixaOff: new Set(),
    appCusto: 0, barcoClandestino: 0, silencio: new Set(), assalto: 0, chuva: false};
  const add = (mp:Map<any,number>, k:any, v:number) => mp.set(k, (mp.get(k) ?? 0) + v);
  for (const a of ativosAgora(g)) {
    const ev = EVENTO[a.id]; if (!ev) continue; if (a.id === 'chuva-forte') m.chuva = true;
    for (const e of ev.efeitos) {
      const ls = locaisDoEfeito(e, a);
      switch (e.tipo) {
        case 'agl': ls.forEach(i => add(m.agl, i, e.valor)); break;
        case 'agl_vizinhos': VIZ[e.local].forEach(i => add(m.agl, i, e.valor)); break;
        case 'agl_zona': IDS.filter(i => e.zonas.includes(LOCAL[i].zona)).forEach(i => add(m.agl, i, e.valor)); break;
        case 'agl_tipo': IDS.filter(i => LOCAL[i].tipo === e.tipo_area).forEach(i => add(m.agl, i, e.valor)); break;
        case 'agl_global': IDS.forEach(i => add(m.agl, i, e.valor)); break;
        case 'ignora_madrugada': ls.forEach(i => m.ignoraMad.add(i)); break;
        case 'viatura_custo': if (e.locais) e.locais.forEach((i:number) => add(m.viaturaLocal, i, e.valor)); else (e.zonas ?? []).forEach((z:string) => add(m.viaturaZona, z, e.valor)); break;
        case 'viatura_proibida': ls.forEach(i => m.viaturaProibida.add(i)); break;
        case 'transporte_fechado':
          if (e.trecho) { const k = e.linhas?.[0] ?? e.modo; m.trecho.set(k, new Set([...(m.trecho.get(k) ?? []), ...e.trecho])); }
          else if (e.linhas) e.linhas.forEach((l:string) => m.linhasFechadas.add(l)); else m.fechado[e.modo] = true; break;
        case 'transporte_horario': (e.linhas ?? [e.modo]).forEach((l:string) => m.horario.set(l, e.ate)); break;
        case 'local_fechado': ls.forEach(i => m.locaisFechados.add(i)); break;
        case 'vira_loja': ls.forEach(i => m.lojas.add(i)); break;
        case 'vira_esconderijo': ls.forEach(i => m.esconderijos.add(i)); break;
        case 'disfarce_custo': ls.forEach(i => add(m.disfarce, i, e.valor)); break;
        case 'denuncia_mod': m.denuncia += e.valor; break;
        case 'retrato_global': m.retratoGlobal = true; break;
        case 'camera_off': ls.forEach(i => m.cameraOff.add(i)); break;
        case 'caixa_off': ls.forEach(i => m.caixaOff.add(i)); break;
        case 'app_custo': m.appCusto += e.valor; break;
        case 'barco_clandestino': m.barcoClandestino = e.valor; break;
        case 'silencio_suspenso': ls.forEach(i => m.silencio.add(i)); break;
        case 'assalto_mod': m.assalto += e.valor; break;
      }
    }
  }
  return m;
}
/** Sorteia o que a carta precisa sortear e aplica os efeitos imediatos. */
export function aplicarCarta(g:Game, id:string, agenda = false) {
  const ev = EVENTO[id]; const a: Ativo = {id, de: g.round, ate: g.round + Math.max(1, ev.duracao ?? 1) - 1};
  for (const e of ev.efeitos) {
    if (e.sorteio === 1 || e.um_local) { const pool = e.um_local ? IDS.filter(i => tem(i, 'CAM')) : e.locais; a.escolha = pool[Math.floor(rnd(g) * pool.length)]; }
    else if (e.sorteio === true && a.escolha === undefined) { const zs = Object.keys(MAPA.zonas); a.escolha = zs[Math.floor(rnd(g) * zs.length)]; }
    const s = g.spy!, t = g.equipe;
    switch (e.tipo) {
      case 'exposicao': s.exposicao = Math.min(10, s.exposicao + e.valor); break;
      case 'revela_tipo_pista': { const ult = [...g.contatos].filter(c => c.status === 'recolhido').pop();
        aviso(g, ult ? `Manchete: a última pista que o espião recolheu era do tipo ${ult.pista.tipo}.` : 'Manchete: o espião ainda não recolheu nenhuma pista.', 'alerta'); break; }
      case 'orcamento': t.orcamento = Math.max(0, t.orcamento + e.valor); break;
      case 'dinheiro_espiao': s.dinheiro += e.valor; break;
      case 'movimento_extra': s.movimentos = 2; break;
      case 'app_gratis': s.appGratis = true; break;
      case 'interrogar_gratis': t.interrogarGratis = e.alcance; break;
      case 'bloqueio_gratis': t.bloqueiosGratis += e.quantidade; t.bloqueiosGratisAte = g.round + e.duracao - 1; break;
      case 'movimento_detetive': t.movimentoGratis = e.zonas; break;
      case 'contato_extra': { const onde = g.contatos.filter(c => c.pista.tipo === 'ONDE' && c.status === 'fechado'); const livres = g.plano!.naoSorteados.filter(l => !g.contatos.some(c => c.local === l));
        if (onde.length && livres.length) { const c = onde[Math.floor(rnd(g) * onde.length)]; const l = livres[Math.floor(rnd(g) * livres.length)];
          g.contatos.push({local: l, pista: c.pista, status: 'fechado', lida: false, grampo: false, extra: true}); aviso(g, `A rede deixou uma cópia de pista em ${nome(l)}.`, 'bom', 'espiao'); aviso(g, 'A rede movimentou um envelope pela cidade.', 'alerta'); } break; }
      case 'interceptar_bonus': { const t0 = g.fila.find(x => !x.decifrada && !x.expirada); if (t0) t0.bonus += e.valor; break; }
    }
  }
  if (agenda) return;
  if (ev.duracao) g.ativos.push(a);
  else if (a.escolha !== undefined) g.ativos.push(a);
  if (ev.efeitos.some(e => e.tipo === 'interceptar_bloqueado')) g.interceptBloqueado = true;
}
function sacarCarta(g:Game) {
  for (let tent = 0; tent < 12; tent++) {
    if (!g.baralho.length) { g.baralho = shuffle(R(g), g.descarte); g.descarte = []; }
    const id = g.baralho.shift(); if (!id) return; const ev = EVENTO[id];
    g.descarte.push(id);
    if (ev.rodadas_validas && (g.round < ev.rodadas_validas[0] || g.round > ev.rodadas_validas[1])) continue;
    g.carta = id; aplicarCarta(g, id); aviso(g, `Evento: ${ev.nome}. ${ev.texto}`, 'alerta'); return;
  }
}

// ------------------------------------------------------------------ lotação, transporte e risco
export function agl(g:Game, id:number, m = mods(g)): number {
  const l = LOCAL[id]; const r = g.round; const p = periodo(r); let a = l.aglomeracao_base;
  if (p === 'rush' && (l.zona === 'CEN' || tem(id, 'T'))) a += 1;
  if (p === 'noite') { if (tem(id, 'NOITE+1')) a += 1; if (tem(id, 'PARQUE')) a -= 1; }
  if (p === 'madrugada' && !m.ignoraMad.has(id)) a += tem(id, 'MADRUGADA+2') ? 2 : tem(id, 'NOITE+1') ? 0 : (tem(id, 'T') && l.tipo === 'comercial') ? -1 : -2;
  if (l.tipo === 'comercial') { if (r >= 2 && r <= 12) a += 1; if (p === 'madrugada') a -= 1; }
  if (l.tipo === 'universitario') a += r < 15 && r >= 2 ? 1 : r >= 15 ? -1 : 0;
  if (l.tipo === 'industrial' && r >= 15) a -= 1;
  if (l.tipo === 'boemio' && r >= 15 && r <= 20) a += 1;
  a += m.agl.get(id) ?? 0;
  return Math.max(0, Math.min(5, a));
}
const aberto = (g:Game, modo:string, m:Mods, linha?:string) => {
  const r = g.round;
  if (m.fechado[modo]) return false;
  if (modo === 'onibus') { const l = LINHAS.find(x => x.id === linha)!; if (m.linhasFechadas.has(l.id)) return false; const ext = m.horario.get(l.id) ?? m.horario.get('onibus') ?? 0;
    return r <= 18 || (l.corujao && r <= 23) || r <= ext; }
  if (modo === 'trem' || modo === 'bike') return r <= 18;
  if (modo === 'barco') return r >= 2 && r <= 16;
  return true;
};
const retratoAtivo = (g:Game, z:string, m:Mods) => m.retratoGlobal || g.equipe.retratos.some(x => x.zona === z && x.ate >= g.round);
export function chanceDenuncia(g:Game, id:number, escondido:boolean, m = mods(g)): number {
  const s = g.spy!; const l = LOCAL[id];
  let a = agl(g, id, m) - (escondido ? 2 : 0); a = Math.max(0, a);
  let c = DENUNCIA[a] + 2 * s.exposicao + (retratoAtivo(g, l.zona, m) ? 15 : 0) + m.denuncia;
  if (l.tipo === 'nobre') c -= 5;
  if (l.tipo === 'quente' && !m.silencio.has(id)) c *= 0.5;
  if (s.disfarce > 0) c *= 0.5;
  return Math.max(0, Math.min(95, Math.round(c)));
}
function chanceCamera(g:Game, id:number, m:Mods): number {
  const l = LOCAL[id]; if (m.cameraOff.has(id) || l.tipo === 'rural') return 0;
  let c = tem(id, 'CAM') ? 25 : 0; if (l.tipo === 'nobre') c += 15;
  if (c && g.equipe.ceic.some(x => x.zona === l.zona && x.ate >= g.round)) c += 25;
  return c;
}
function podeEsconder(g:Game, id:number, m:Mods) {
  const s = g.spy!, l = LOCAL[id];
  if (s.deveMover || s.escondido >= 2) return false;
  return tem(id, 'ESC') || agl(g, id, m) <= 1 || m.esconderijos.has(id) || (g.round >= 15 && (l.tipo === 'industrial' || l.tipo === 'lazer'));
}

// ------------------------------------------------------------------ movimento do espião
export type Destino = {local:number;custo:number;risco:number;linha?:string};
export function opcoesEspiao(g:Game): Record<Modo, Destino[]> {
  const s = g.spy!, m = mods(g), from = s.loc;
  const ocup = new Set(g.dets.map(d => d.loc)); const bloq = new Set(g.dets.filter(d => d.bloqueio).map(d => d.loc));
  const fech = m.locaisFechados; const terra = !fech.has(from);
  const out: Record<Modo, Destino[]> = {pe: [], bike: [], onibus: [], trem: [], app: [], barco: [], esconder: []};
  const push = (k:Modo, local:number, custo:number, linha?:string) => {
    if (custo > s.dinheiro || local === from) return; if (out[k].some(d => d.local === local)) return;
    out[k].push({local, custo, risco: chanceDenuncia(g, local, false, m), linha});
  };
  if (terra) {
    for (const [y] of alcance(from, BALANCO.peAlcance, y => !ocup.has(y) && !fech.has(y))) push('pe', y, 0);
    if (aberto(g, 'bike', m) && BIKE.has(from)) for (const [y] of alcance(from, 4, y => BIKE_ZONAS.has(LOCAL[y].zona) && !ocup.has(y) && !fech.has(y))) if (BIKE.has(y)) push('bike', y, 1);
    const gratis = s.perfil === 'corredor' && !s.transporteGratis;
    for (const l of LINHAS) {
      const i = l.paradas.indexOf(from); if (i < 0 || !aberto(g, 'onibus', m, l.id)) continue;
      const tr = m.trecho.get(l.id) ?? new Set();
      for (const dir of [1, -1]) for (let k = 1; k <= 5; k++) {
        const y = l.paradas[i + dir * k]; if (y === undefined || bloq.has(y) || fech.has(y)) break;
        if (!ocup.has(y) && !tr.has(y)) push('onibus', y, gratis ? 0 : 1, l.id);
      }
    }
    const tt = m.trecho.get('trem') ?? new Set();
    const ti = TREM.indexOf(from);
    if (ti >= 0 && aberto(g, 'trem', m) && !tt.has(from)) for (const dir of [1, -1]) for (let k = 1; k < TREM.length; k++) {
      const y = TREM[ti + dir * k]; if (y === undefined || bloq.has(y)) break; if (!ocup.has(y) && !tt.has(y)) push('trem', y, gratis ? 0 : 1);
    }
    for (const [y] of alcance(from, 4, y => !fech.has(y), y => !bloq.has(y))) {
      if (ocup.has(y) || bloq.has(y)) continue;
      let c = (LOCAL[y].zona === 'EXT' || LOCAL[from].zona === 'EXT' ? 6 : 3) + m.appCusto; if (s.perfil === 'corredor') c -= 1; if (s.appGratis) c = 0;
      push('app', y, c);
    }
  }
  const barcoOk = aberto(g, 'barco', m) || m.barcoClandestino > 0;
  if (barcoOk) for (const y of AGUA[from]) if (!ocup.has(y)) push('barco', y, aberto(g, 'barco', m) ? 2 : m.barcoClandestino);
  if (podeEsconder(g, from, m)) out.esconder.push({local: from, custo: 0, risco: chanceDenuncia(g, from, true, m)});
  return out;
}
const semSaida = (o:Record<Modo, Destino[]>) => Object.values(o).every(v => !v.length);

// ------------------------------------------------------------------ fluxo das rodadas
function comecarRodada(g:Game) {
  g.round++; g.carta = null; g.interceptBloqueado = false;
  const s = g.spy!, t = g.equipe;
  if (g.round > 1) s.dinheiro += BALANCO.rendaEspiao;
  s.movimentos = 1; s.moveu = false; s.agiu = false; s.transporteGratis = false; s.appGratis = false;
  t.interrogarGratis = 0; t.movimentoGratis = null;
  if (t.bloqueiosGratisAte < g.round) t.bloqueiosGratis = 0;
  for (const a of g.agenda) if (a.rodadas[0] === g.round) { aplicarCarta(g, a.id, true); aviso(g, `Começou: ${EVENTO[a.id].nome}. ${EVENTO[a.id].texto}`, 'alerta'); }
  if (g.round >= 2) sacarCarta(g);
  g.phase = 'espiao'; g.deadline = Date.now() + TEMPO.espiao;
  if (semSaida(opcoesEspiao(g))) fimDeJogo(g, 'detetives', `O espião ficou encurralado em ${nome(s.loc)}.`);
}
/** Posição exata que só chega à central no fim da rodada (o espião se move antes de a polícia agir). */
function atrasar(g:Game, motivo:string) { (g.pendentes ??= []).push({local: g.spy!.loc, motivo}); }
function revelar(g:Game, motivo:string, exato:boolean) {
  const s = g.spy!; const r: Revelacao = {rodada: g.round, motivo, ...(exato ? {local: s.loc} : {zona: LOCAL[s.loc].zona})};
  g.revelacoes.push(r);
  aviso(g, exato ? `${motivo}: o espião está em ${nome(s.loc)}!` : `${motivo}: o espião está na zona ${zonaNome(LOCAL[s.loc].zona)}.`, 'perigo', 'todos', exato ? {local: s.loc} : {zona: LOCAL[s.loc].zona});
}
function fimTurnoEspiao(g:Game) {
  const s = g.spy!, m = mods(g), id = s.loc; const esc = g.bilhetes.at(-1)?.rodada === g.round && g.bilhetes.at(-1)?.modo === 'esconder';
  if (!g.horaH) {
    if (chance(g, chanceDenuncia(g, id, esc, m))) {
      if (s.perfil === 'sombra' && !s.denunciaIgnorada) { s.denunciaIgnorada = true; aviso(g, 'Alguém te reconheceu, mas não ligou para a polícia.', 'alerta', 'espiao'); }
      else if (s.escudo) { s.escudo = false; aviso(g, 'Um transeunte desconfiou, mas o disfarce funcionou.', 'alerta', 'espiao'); }
      else { revelar(g, 'Denúncia de transeunte', false); if (s.exposicao >= 7) atrasar(g, 'Denúncia confirmada'); s.exposicao = Math.min(10, s.exposicao + 1); }
    }
    if (chance(g, chanceCamera(g, id, m))) {
      if (s.escudo) { s.escudo = false; aviso(g, 'Uma câmera te filmou, mas o disfarce enganou o reconhecimento facial.', 'alerta', 'espiao'); }
      else { atrasar(g, 'Imagens da câmera CEIC'); aviso(g, 'Uma câmera te filmou. A central vai ver as imagens no fim da hora.', 'perigo', 'espiao'); }
    }
    if (LOCAL[id].tipo === 'quente' && !m.silencio.has(id) && chance(g, 15 + m.assalto) && s.dinheiro > 0) { s.dinheiro = Math.max(0, s.dinheiro - 2); aviso(g, 'Você foi assaltado e perdeu R$ 2.', 'perigo', 'espiao'); }
    if (s.exposicao >= 10) revelar(g, 'Caçada total', false);
  }
  if (s.disfarce > 0) s.disfarce--;
  s.deveMover = false;
  for (const d of g.dets) { d.pa = 0; d.rolou = false; d.encerrou = false; d.transferiu = false; d.interrogouGratis = false; d.investigou = []; d.viaturas = 0; d.abordagens = 0; d.interrogacoes = 0; }
  g.phase = 'detetives'; g.vez = 0; g.dado = null; g.deadline = Date.now() + TEMPO.vez;
}
function fechamento(g:Game) {
  if (g.phase === 'fim') return;
  const s = g.spy!, t = g.equipe;
  if (g.horaH) { fimDeJogo(g, 'espiao', `O espião embarcou em ${nome(g.horaH.local)} e fugiu de Porto Alegre.`); return; }
  for (const p of g.pendentes ?? []) { g.revelacoes.push({rodada: g.round, local: p.local, motivo: p.motivo});
    aviso(g, `${p.motivo}: o espião foi visto em ${nome(p.local)} às ${String(hora(g.round)).padStart(2, '0')}h.`, 'perigo', 'todos', {local: p.local}); }
  g.pendentes = [];
  if (MAPA.rodadas.revelacoes.includes(g.round)) {
    if (g.cancelarRevelacao) { g.cancelarRevelacao = false; aviso(g, 'A revelação programada foi cancelada.', 'info'); }
    else revelar(g, 'Revelação programada', true);
  }
  if (g.alertaBancario && g.alertaBancario.rodada <= g.round) { const z = g.alertaBancario.zona; g.revelacoes.push({rodada: g.round, zona: z, motivo: 'Alerta bancário'});
    aviso(g, `Alerta bancário: o espião sacou dinheiro na zona ${zonaNome(z)}.`, 'perigo', 'todos', {zona: z}); g.alertaBancario = null; }
  if (!g.interceptBloqueado) for (const x of g.fila) if (!x.decifrada && !x.expirada && g.round - x.rodada >= 3) { x.expirada = true; aviso(g, `A transmissão #${x.n} se perdeu.`, 'info'); }
  g.ativos = g.ativos.filter(a => a.ate > g.round);
  t.retratos = t.retratos.filter(x => x.ate > g.round); t.ceic = t.ceic.filter(x => x.ate > g.round); t.cones = t.cones.filter(x => x.ate > g.round);
  t.orcamento += 2;
  // janela perdida: a rede remarca para a próxima e avisa só o espião
  const jp = g.plano!.janela; if (g.round === JANELAS[jp][1]) { const prox = Object.keys(JANELAS).find(j => JANELAS[j][0] > g.round);
    if (prox) { g.plano!.janela = prox; s.remarcada = prox; aviso(g, `A janela passou. A rede remarcou a fuga para a janela ${prox} (${String(hora(JANELAS[prox][0])).padStart(2, '0')}h), no mesmo lugar.`, 'alerta', 'espiao');
      aviso(g, 'Movimentação estranha nas frequências da rede.', 'info'); } }
  if (g.round >= MAPA.rodadas.total) { fimDeJogo(g, 'detetives', 'Amanheceu. O espião não conseguiu sair da cidade a tempo.'); return; }
  comecarRodada(g);
}
function fimDeJogo(g:Game, quem:'espiao'|'detetives', motivo:string) {
  g.phase = 'fim'; g.winner = quem; g.motivo = motivo; g.deadline = null;
  aviso(g, (quem === 'espiao' ? 'O ESPIÃO VENCEU. ' : 'OS DETETIVES VENCERAM. ') + motivo, quem === 'espiao' ? 'perigo' : 'bom');
}

// ------------------------------------------------------------------ ações do espião
function moverEspiao(g:Game, modo:Modo, destino:number) {
  const s = g.spy!; if (s.movimentos <= 0) fail('Você já se moveu nesta rodada.');
  const op = opcoesEspiao(g)[modo]?.find(d => d.local === destino); if (!op) fail('Esse movimento não é possível agora.');
  const ult = g.rastro.at(-1);
  if (modo === 'esconder') { s.escondido++; g.rastro.push({rodada: g.round, local: s.loc, acao: 'escondido'}); if (ult) { ult.saiu ??= 'esconder'; ult.proximo ??= s.loc; } }
  else {
    s.escondido = 0; s.dinheiro -= op!.custo;
    if ((modo === 'onibus' || modo === 'trem') && s.perfil === 'corredor' && op!.custo === 0) s.transporteGratis = true;
    if (modo === 'app') { s.app = {rodada: g.round, de: s.loc, para: destino}; s.appGratis = false; }
    if (ult) { ult.saiu = modo; ult.proximo = destino; }
    s.loc = destino; g.rastro.push({rodada: g.round, local: destino});
    if ((modo === 'pe' || modo === 'bike') && g.equipe.cones.some(c => c.local === destino)) revelar(g, 'Avistado numa barreira', true);
  }
  g.bilhetes.push({rodada: g.round, modo}); s.movimentos--; s.moveu = true;
}
export type AcaoEspiao = 'recolher'|'sacar'|'disfarce'|'falsa'|'informante'|'emergencia'|'horaH'|'passar';
export function acoesEspiao(g:Game): {acao:AcaoEspiao;custo?:number;ok:boolean;motivo?:string}[] {
  const s = g.spy!, m = mods(g), id = s.loc, c = g.contatos.find(x => x.local === id && x.status === 'fechado');
  const lojas = tem(id, 'LOJ') || m.lojas.has(id);
  const custoDisf = Math.max(0, (s.perfil === 'sombra' ? 1 : 2) + (LOCAL[id].tipo === 'nobre' ? 1 : 0) + (m.disfarce.get(id) ?? 0));
  const credLivres = g.contatos.some(x => x.status === 'fechado' && x.pista.tipo === 'CREDENCIAL');
  return [
    {acao: 'recolher', ok: !!c, motivo: c ? undefined : 'Não há envelope aqui.'},
    {acao: 'sacar', ok: tem(id, 'ATM') && !m.caixaOff.has(id), motivo: 'Precisa de caixa eletrônico funcionando.'},
    {acao: 'disfarce', custo: custoDisf, ok: lojas && s.dinheiro >= custoDisf, motivo: lojas ? 'Dinheiro insuficiente.' : 'Precisa de uma loja.'},
    {acao: 'falsa', custo: 2, ok: s.falsas > 0 && s.dinheiro >= 2, motivo: s.falsas ? 'Dinheiro insuficiente.' : 'Acabaram as mensagens falsas.'},
    {acao: 'informante', custo: 2, ok: agl(g, id, m) >= 2 && s.dinheiro >= 2, motivo: 'Precisa de movimento na rua e R$ 2.'},
    {acao: 'emergencia', ok: tem(id, 'EMERGENCIA') && s.credenciais === 0 && !credLivres, motivo: 'Só no Mercado, sem senhas no mapa.'},
    {acao: 'horaH', ok: EXTRACOES.includes(id) && s.credenciais > 0 && Object.values(JANELAS).some(([a, b]) => g.round >= a && g.round <= b),
      motivo: 'Precisa estar num ponto de extração, numa janela de fuga e com senha.'},
    {acao: 'passar', ok: true},
  ].map(a => ({...a, motivo: a.ok ? undefined : a.motivo})) as any;
}
function agirEspiao(g:Game, acao:AcaoEspiao) {
  const s = g.spy!; if (s.agiu) fail('Você já agiu nesta rodada.');
  if (!s.moveu) fail('Mova-se (ou esconda-se) antes de agir.');
  const op = acoesEspiao(g).find(a => a.acao === acao); if (!op?.ok) fail(op?.motivo ?? 'Ação indisponível.');
  const id = s.loc, m = mods(g), t = g.equipe;
  const ult = g.rastro.at(-1)!;
  switch (acao) {
    case 'recolher': {
      const c = g.contatos.find(x => x.local === id && x.status === 'fechado')!; c.status = 'recolhido'; s.pistas.push(c.pista); s.exposicao = Math.min(10, s.exposicao + 1); ult.acao = 'recolheu um envelope';
      if (c.pista.tipo === 'CREDENCIAL') { s.credenciais++; s.dinheiro += c.pista.dinheiro ?? 2; }
      for (const o of g.contatos) if (o !== c && o.status === 'fechado' && o.pista.tipo === c.pista.tipo && o.pista.texto === c.pista.texto) o.status = 'recolhido';
      if (t.grampos.includes(id)) { t.pistas.push({fonte: `Grampo em ${nome(id)}`, tipo: c.pista.tipo, texto: c.pista.texto, elimina: c.pista.elimina, rodada: g.round});
        revelar(g, `Grampo em ${nome(id)}`, true); }
      else { const n = g.fila.length + 1; g.fila.push({n, rodada: g.round, tipo: c.pista.tipo, pista: c.pista, zona: LOCAL[id].zona, falsa: false, tentativas: 0, decifrada: false, expirada: false, bonus: 0});
        aviso(g, `Transmissão #${n} captada: a rede confirmou uma pista do tipo ${c.pista.tipo}.`, 'alerta'); }
      aviso(g, `Pista: ${c.pista.texto}`, 'bom', 'espiao'); break;
    }
    case 'sacar': s.dinheiro += 4; s.exposicao = Math.min(10, s.exposicao + 1); g.alertaBancario = {zona: LOCAL[id].zona, rodada: g.round + 1}; ult.acao = 'sacou dinheiro'; break;
    case 'disfarce': s.dinheiro -= op!.custo!; s.exposicao = Math.max(0, s.exposicao - 2); s.disfarce = LOCAL[id].tipo === 'boemio' ? 4 : 3; s.escudo = true; ult.acao = 'trocou de roupa'; break;
    case 'falsa': { s.dinheiro -= 2; s.falsas--; const z = Object.keys(MAPA.zonas)[Math.floor(rnd(g) * Object.keys(MAPA.zonas).length)]; const n = g.fila.length + 1;
      g.fila.push({n, rodada: g.round, tipo: 'ONDE', pista: pistaFalsa(R(g), g.plano!.extracao), zona: z, falsa: true, tentativas: 0, decifrada: false, expirada: false, bonus: 0});
      aviso(g, `Transmissão #${n} captada: a rede confirmou uma pista do tipo ONDE.`, 'alerta'); break; }
    case 'informante': { s.dinheiro -= 2; const perto = new Set([id, ...alcance(id, 2).keys()]);
      const gr = t.grampos.filter(l => perto.has(l)).map(l => nome(l)); const bl = g.dets.filter(d => d.bloqueio && perto.has(d.loc)).map(d => nome(d.loc));
      aviso(g, `Informante: ${gr.length ? 'grampos em ' + gr.join(', ') : 'nenhum grampo por perto'}; ${bl.length ? 'blitz em ' + bl.join(', ') : 'nenhuma blitz por perto'}.`, 'info', 'espiao'); break; }
    case 'emergencia': s.credenciais++; s.exposicao = Math.min(10, s.exposicao + 3); revelar(g, 'Contato de emergência', false); break;
    case 'horaH': {
      s.credenciais--; const [a, b] = JANELAS[g.plano!.janela]; const certo = id === g.plano!.extracao && g.round >= a && g.round <= b;
      if (certo) { g.horaH = {local: id, rodada: g.round}; aviso(g, `EXTRAÇÃO EM ANDAMENTO em ${nome(id)}! Última chance para os detetives.`, 'perigo', 'todos', {local: id}); g.revelacoes.push({rodada: g.round, local: id, motivo: 'Hora H'}); }
      else { s.falhas++; s.exposicao = Math.min(10, s.exposicao + 3); revelar(g, 'Extração fracassada', true);
        if (s.falhas >= 2) { fimDeJogo(g, 'detetives', 'A rede queimou: duas extrações falharam.'); return; } }
      break;
    }
    case 'passar': break;
  }
  s.agiu = true; s.movimentos = 0;
  if (g.phase === 'espiao') fimTurnoEspiao(g);
}

// ------------------------------------------------------------------ ações dos detetives
const custoViatura = (g:Game, d:Det, dest:number, m:Mods) => {
  let c = 2; const l = LOCAL[dest]; const p = periodo(g.round);
  if (p === 'rush' && (l.zona === 'CEN' || l.zona === 'NOR')) c++;
  c += Math.max(m.viaturaZona.get(l.zona) ?? 0, m.viaturaLocal.get(dest) ?? 0);
  if (l.tipo === 'quente' && !m.silencio.has(dest)) c++;
  return c;
};
export type OpcaoDet = {acao:string;custo:number;ok:boolean;motivo?:string;alvos?:{local?:number;n?:number;item?:string;custo?:number;texto?:string}[]};
export function opcoesDetetive(g:Game, i:number): {mover:{modo:string;local:number;custo:number}[];acoes:OpcaoDet[]} {
  const d = g.dets[i], m = mods(g), t = g.equipe, here = d.loc;
  const mover: {modo:string;local:number;custo:number}[] = [];
  const add = (modo:string, local:number, custo:number) => {
    if (local === here || custo > d.pa) return; const k = mover.findIndex(x => x.local === local);
    if (k < 0) mover.push({modo, local, custo}); else if (mover[k].custo > custo) mover[k] = {modo, local, custo}; };
  const fech = m.locaisFechados;
  if (!fech.has(here)) {
    for (const y of VIZ[here]) if (!fech.has(y)) add('pe', y, 1);
    if ((d.viaturas ?? 0) < BALANCO.viaturaPorRodada) for (const [y] of alcance(here, BALANCO.viaturaAlcance + (d.papel === 'tatico' ? 1 : 0), y => !fech.has(y) && !m.viaturaProibida.has(y))) if (!m.viaturaProibida.has(here)) add('viatura', y, custoViatura(g, d, y, m));
    for (const l of LINHAS) { const k = l.paradas.indexOf(here); if (k < 0 || !aberto(g, 'onibus', m, l.id)) continue;
      for (let j = Math.max(0, k - 5); j <= Math.min(l.paradas.length - 1, k + 5); j++) if (!fech.has(l.paradas[j])) add('onibus', l.paradas[j], 1); }
    if (TREM.includes(here) && aberto(g, 'trem', m)) TREM.forEach(y => add('trem', y, 1));
  }
  if (t.lancha === g.round) AGUA[here].forEach(y => add('barco', y, 2));
  if (t.movimentoGratis) IDS.filter(y => t.movimentoGratis!.includes(LOCAL[y].zona)).forEach(y => add('apoio', y, 0));
  mover.sort((a, b) => a.custo - b.custo);
  const c = g.contatos.find(x => x.local === here && x.status === 'fechado');
  const candidato = MAPA.contatos_candidatos.includes(here); const visto = t.vistoriados[here];
  const podeInterceptar = here === HQ || tem(here, 'ANT') || d.escuta;
  const custoInt = d.papel === 'analista' ? 1 : d.papel === 'tatico' ? 3 : 2;
  const a = agl(g, here, m); const quente = LOCAL[here].tipo === 'quente' && !m.silencio.has(here);
  const estoque = t.estoque.filter(x => x.desde <= g.round);
  const acoes: OpcaoDet[] = [
    {acao: 'investigar', custo: 1, ok: !d.investigou.includes(here), motivo: 'Já investigado nesta rodada.'},
    {acao: 'interrogar', custo: alcanceGratis(g, d) ? 0 : BALANCO.interrogarCusto, ok: a >= 2 && !quente && (d.interrogacoes ?? 0) < BALANCO.interrogarPorRodada, motivo: quente ? 'Ninguém fala com a polícia aqui.' : a < 2 ? 'Pouca gente na rua para interrogar.' : 'Já interrogou nesta rodada.'},
    {acao: 'periciar', custo: d.papel === 'perito' ? 1 : 2, ok: candidato && !visto, motivo: candidato ? 'Este local já foi vistoriado.' : 'Só num possível ponto de contato.'},
    {acao: 'confiscar', custo: 2, ok: BALANCO.confiscar && !!c && c.lida, motivo: 'Precisa periciar um envelope aqui antes.'},
    {acao: 'interceptar', custo: custoInt, ok: podeInterceptar && !g.interceptBloqueado && g.fila.some(x => !x.decifrada && !x.expirada),
      motivo: !podeInterceptar ? 'Só no Palácio, nos morros com antenas ou com Escuta Móvel.' : 'Nenhuma transmissão para decifrar.',
      alvos: g.fila.filter(x => !x.decifrada && !x.expirada).map(x => ({n: x.n, texto: `#${x.n} · ${x.tipo} · ${chanceInterceptar(g, d, x)}%`}))},
    {acao: 'abordar', custo: d.papel === 'tatico' ? 1 : 2, ok: d.papel !== 'analista' && (d.abordagens ?? 0) < BALANCO.abordarPorRodada, motivo: d.papel === 'analista' ? 'A Analista não aborda.' : 'Já abordou nesta rodada.'},
    {acao: 'bloqueio', custo: t.bloqueiosGratis > 0 ? 0 : 2, ok: !d.bloqueio, motivo: 'Já há uma blitz sua aqui.'},
    {acao: 'grampo', custo: 1, ok: candidato && !t.grampos.includes(here) && estoque.some(x => x.item === 'grampo'), motivo: candidato ? 'Precisa de um Grampo no estoque.' : 'Só num possível ponto de contato.'},
    {acao: 'comprar', custo: 1, ok: true, alvos: CARTAS.itens.map(it => ({item: it.id, custo: Math.max(0, it.custo - (d.papel === 'delegada' ? 1 : 0)), texto: it.nome}))},
    {acao: 'usar', custo: 0, ok: estoque.length > 0, motivo: 'Estoque vazio.', alvos: [...new Set(estoque.map(x => x.item))].map(it => ({item: it, texto: ITEM[it].nome}))},
    {acao: 'transferir', custo: 1, ok: d.papel === 'delegada' && !d.transferiu && g.dets.length > 1, motivo: 'Só a Delegada, 1 vez por rodada.'},
    {acao: 'acusar', custo: d.papel === 'delegada' ? 2 : 3, ok: !t.acusou && (here === HQ || d.papel === 'delegada'), motivo: t.acusou ? 'O time já acusou.' : 'Só no Palácio da Polícia.'},
  ];
  return {mover, acoes: acoes.filter(x => x.acao !== 'confiscar' || BALANCO.confiscar).map(x => ({...x, ok: x.ok && x.custo <= d.pa, motivo: !x.ok ? x.motivo : x.custo > d.pa ? 'PA insuficiente.' : undefined}))};
}
const alcanceGratis = (g:Game, d:Det) => d.papel === 'rua' && !d.interrogouGratis ? BALANCO.interrogarRaio + 1 : g.equipe.interrogarGratis;
const chanceInterceptar = (g:Game, d:Det, x:Transmissao) => Math.min(95, 40 + 15 * x.tentativas + (g.equipe.decodificador ? 20 : 0) + (d.papel === 'analista' ? 15 : 0) - (g.spy!.perfil === 'criptografo' ? 15 : 0) + x.bonus);
type CorpoDet = {i:number;acao:string;local?:number;n?:number;item?:string;zona?:string;extracao?:number;janela?:string;alvo?:number};
/** Passa a vez para o próximo detetive; depois do último, fecha a rodada. */
function proximaVez(g:Game) {
  const atual = g.vez ?? 0; g.dets[atual].encerrou = true;
  const prox = g.dets.findIndex((d, i) => i > atual && !d.encerrou);
  if (prox < 0) { g.vez = null; fechamento(g); return; }
  g.vez = prox; g.deadline = Date.now() + TEMPO.vez;
}
function rolarDado(g:Game, p:Player, i:number) {
  const d = g.dets[i]; if (!d || d.owner !== p.id) fail('Esse detetive não é seu.');
  if (g.vez !== i) fail('Ainda não é a vez deste detetive.'); if (d.rolou) fail('Você já rolou o dado nesta rodada.');
  const valor = 1 + Math.floor(rnd(g) * 6); d.pa += valor; d.rolou = true; g.dado = {det: i, valor, rodada: g.round};
  aviso(g, `🎲 ${p.name} (${papelNome(d.papel)}) tirou ${valor} no dado: ${d.pa} ponto${d.pa === 1 ? '' : 's'} para usar.`, 'info');
}
function agirDetetive(g:Game, p:Player, b:CorpoDet) {
  b.i = Number(b.i); if (b.local !== undefined) b.local = Number(b.local); if (b.n !== undefined) b.n = Number(b.n); if (b.alvo !== undefined) b.alvo = Number(b.alvo); if (b.extracao !== undefined) b.extracao = Number(b.extracao);
  const d = g.dets[b.i]; if (!d || d.owner !== p.id) fail('Esse detetive não é seu.'); if (g.vez !== b.i) fail('Ainda não é a vez deste detetive.'); if (!d.rolou) fail('Role o dado primeiro.');
  const t = g.equipe, s = g.spy!, m = mods(g), quem = `${p.name} (${papelNome(d.papel)})`;
  if (b.acao === 'mover') {
    const op = opcoesDetetive(g, b.i).mover.find(x => x.local === Number(b.local)); if (!op) fail('Não dá para ir até lá.');
    d.pa -= op!.custo; d.loc = op!.local; d.bloqueio = false; if (op!.modo === 'viatura') d.viaturas = (d.viaturas ?? 0) + 1; if (op!.modo === 'apoio') t.movimentoGratis = null; return;
  }
  const op = opcoesDetetive(g, b.i).acoes.find(x => x.acao === b.acao); if (!op) fail('Ação desconhecida.'); if (!op!.ok) fail(op!.motivo ?? 'Ação indisponível.');
  const here = d.loc; let custo = op!.custo;
  switch (b.acao) {
    case 'investigar': {
      d.investigou.push(here); const k9 = d.k9 > 0; const alcanceR = m.chuva ? 4 : k9 ? 12 : 8; if (k9) d.k9--;
      const r = [...g.rastro].reverse().find(x => x.local === here && x.rodada < g.round && g.round - x.rodada < alcanceR);
      if (!r) aviso(g, `${quem} investigou ${nome(here)}: nenhum sinal do espião nas últimas ${alcanceR} rodadas.`, 'info', 'todos', {local: here});
      else {
        const prox = r.proximo && r.proximo !== here && (k9 || (d.papel === 'perito' && g.round - r.rodada <= 3)) ? ` Seguiu para ${nome(r.proximo)}.` : '';
        aviso(g, `${quem} investigou ${nome(here)}: o espião esteve aqui na rodada ${r.rodada}${r.saiu ? `, saiu de ${MODO_NOME[r.saiu]}` : ' e ainda não saiu'}${r.acao ? ` (${r.acao})` : ''}.${prox}`, 'alerta', 'todos', {local: here});
      }
      break;
    }
    case 'interrogar': {
      d.interrogacoes = (d.interrogacoes ?? 0) + 1; const gr = alcanceGratis(g, d); const R2 = gr || BALANCO.interrogarRaio;
      if (gr) { if (d.papel === 'rua') d.interrogouGratis = true; else t.interrogarGratis = 0; }
      const perto = s.loc === here || alcance(here, R2).has(s.loc);
      aviso(g, `${quem} interrogou testemunhas em ${nome(here)}: ${perto ? `SIM, o espião está a até ${R2} ligações.` : `não, ninguém viu o espião a até ${R2} ligações.`}`, perto ? 'perigo' : 'info', 'todos', {local: here}); break;
    }
    case 'periciar': {
      aviso(g, `A força-tarefa vasculha ${nome(here)}.`, 'info', 'todos', {local: here});
      const c = g.contatos.find(x => x.local === here && x.status === 'fechado'); const antigo = g.contatos.find(x => x.local === here);
      if (!c) { t.vistoriados[here] = antigo ? 'retirado' : 'vazio';
        aviso(g, antigo ? `${quem} achou o esconderijo de um envelope em ${nome(here)}, mas ele já foi retirado.` : `${quem} vasculhou ${nome(here)}: nenhum envelope aqui.`, antigo ? 'alerta' : 'info', 'equipe'); break; }
      c.lida = true; t.vistoriados[here] = 'lido';
      t.pistas.push({fonte: `Envelope em ${nome(here)}`, tipo: c.pista.tipo, texto: c.pista.texto, elimina: c.pista.elimina, rodada: g.round});
      aviso(g, `${quem} periciou o envelope em ${nome(here)}: ${c.pista.texto}`, 'bom', 'equipe'); break; }
    case 'confiscar': { const c = g.contatos.find(x => x.local === here && x.status === 'fechado')!; c.status = 'confiscado'; t.vistoriados[here] = 'confiscado';
      aviso(g, `${quem} confiscou o envelope de ${nome(here)}.`, 'bom', 'equipe'); aviso(g, `A rede avisa: o contato em ${nome(here)} caiu.`, 'perigo', 'espiao'); break; }
    case 'interceptar': {
      const x = g.fila.find(y => y.n === b.n && !y.decifrada && !y.expirada); if (!x) fail('Escolha uma transmissão ativa.');
      if (chance(g, chanceInterceptar(g, d, x!))) {
        x!.decifrada = true; t.orcamento += 2;
        const duvidosa = x!.falsa && t.decodificador && chance(g, 50);
        if (BALANCO.conteudoSoComDecodificador && !t.decodificador) {
          aviso(g, `${quem} rastreou a transmissão #${x!.n} (${x!.tipo}): foi enviada da zona ${zonaNome(x!.zona)} na rodada ${x!.rodada}. Sem o Decodificador, o conteúdo segue cifrado.`, 'bom', 'equipe');
        } else {
          t.pistas.push({fonte: `Transmissão #${x!.n}`, tipo: x!.pista.tipo, texto: x!.pista.texto, elimina: x!.pista.elimina, zona: x!.zona, duvidosa, rodada: g.round});
          aviso(g, `${quem} decifrou a transmissão #${x!.n}: “${x!.pista.texto}” Enviada da zona ${zonaNome(x!.zona)} na rodada ${x!.rodada}.${duvidosa ? ' ⚠ Autenticidade duvidosa.' : ''}`, 'bom', 'equipe');
        }
        aviso(g, `A força-tarefa decifrou a transmissão #${x!.n}.`, 'alerta', 'todos');
      } else { x!.tentativas++; aviso(g, `${quem} não conseguiu decifrar a transmissão #${x!.n}.`, 'info', 'todos'); }
      break;
    }
    case 'abordar': {
      if (s.loc !== here) { aviso(g, `${quem} fez uma abordagem em ${nome(here)}: ninguém suspeito.`, 'info', 'todos', {local: here}); break; }
      const nivel = Math.max(0, agl(g, here, m) - (d.papel === 'tatico' ? 1 : 0));
      d.abordagens = (d.abordagens ?? 0) + 1;
      if (chance(g, g.horaH ? Math.min(BALANCO.horaHMaxAbordagem, BALANCO.abordagem[nivel]) : BALANCO.abordagem[nivel])) { d.pa -= custo; fimDeJogo(g, 'detetives', `${quem} prendeu o espião em ${nome(here)}.`); return; }
      s.exposicao = Math.min(10, s.exposicao + 2); s.deveMover = true; revelar(g, `O espião escapou de uma abordagem de ${quem}`, true); break;
    }
    case 'bloqueio': d.bloqueio = true; if (t.bloqueiosGratis > 0 && custo === 0) t.bloqueiosGratis--; aviso(g, `Blitz montada em ${nome(here)}.`, 'info', 'todos', {local: here}); break;
    case 'grampo': { t.grampos.push(here); usarEstoque(g, 'grampo'); aviso(g, `${quem} instalou um grampo em ${nome(here)}.`, 'bom', 'equipe'); break; }
    case 'comprar': {
      const it = ITEM[b.item ?? '']; if (!it) fail('Item desconhecido.'); const preco = Math.max(0, it.custo - (d.papel === 'delegada' ? 1 : 0));
      if (t.orcamento < preco) fail('Orçamento insuficiente.'); t.orcamento -= preco;
      t.estoque.push({item: it.id, desde: here === HQ ? g.round : g.round + 1});
      aviso(g, `${quem} comprou ${it.nome}${here === HQ ? '' : ' (chega na próxima rodada)'}.`, 'info', 'equipe'); break;
    }
    case 'usar': custo = usarItem(g, d, b, quem); break;
    case 'transferir': { const o = g.dets[b.alvo ?? -1]; if (!o || o === d) fail('Escolha outro detetive.'); o!.pa++; d.transferiu = true; break; }
    case 'acusar': {
      if (!EXTRACOES.includes(b.extracao ?? -1) || !(b.janela! in JANELAS)) fail('Escolha o ponto de extração e a janela.');
      t.acusou = true;
      if (b.extracao === g.plano!.extracao && b.janela === g.plano!.janela) { d.pa -= custo; planoB(g); return; }
      t.orcamento = 0; g.cancelarRevelacao = true; aviso(g, `Acusação errada (${nome(b.extracao!)}, janela ${b.janela}). O orçamento foi zerado e a próxima revelação foi cancelada.`, 'perigo'); break;
    }
  }
  d.pa -= custo;
}
/** Acusação certa: a rede abandona o plano e manda um plano B ao espião. Sem janela possível, a fuga acabou. */
function planoB(g:Game) {
  const p = g.plano!, s = g.spy!;
  const janelas = Object.keys(JANELAS).filter(j => j !== p.janela && JANELAS[j][0] >= g.round + 3);
  if (!janelas.length) { fimDeJogo(g, 'detetives', `A força-tarefa descobriu o plano (${nome(p.extracao)}, janela ${p.janela}) e não sobrou tempo para um plano B.`); return; }
  const outros = EXTRACOES.filter(e => e !== p.extracao);
  p.extracao = outros[Math.floor(rnd(g) * outros.length)]; p.janela = janelas[Math.floor(rnd(g) * janelas.length)];
  s.exposicao = Math.min(10, s.exposicao + 2); s.credenciais = Math.max(1, s.credenciais); s.planoB = true;
  aviso(g, 'A acusação estava CERTA. A rede abortou o plano original e ativou um plano B. A caçada continua.', 'bom');
  aviso(g, `Plano B da rede: fuga por ${nome(p.extracao)}, janela ${p.janela} (${String(hora(JANELAS[p.janela][0])).padStart(2, '0')}h). Você recebeu uma senha nova.`, 'perigo', 'espiao');
}
function usarEstoque(g:Game, item:string) { const k = g.equipe.estoque.findIndex(x => x.item === item && x.desde <= g.round); if (k < 0) fail('Item fora do estoque.'); g.equipe.estoque.splice(k, 1); }
function usarItem(g:Game, d:Det, b:CorpoDet, quem:string): number {
  const t = g.equipe, s = g.spy!, item = b.item ?? '';
  if (!t.estoque.some(x => x.item === item && x.desde <= g.round)) fail('Item fora do estoque.');
  const zona = b.zona && b.zona in MAPA.zonas ? b.zona : undefined;
  switch (item) {
    case 'retrato': if (!zona) fail('Escolha a zona.'); t.retratos.push({zona: zona!, ate: g.round + 3}); aviso(g, `Retrato falado espalhado na zona ${zonaNome(zona!)}.`, 'info', 'todos', {zona}); break;
    case 'ceic': if (!zona) fail('Escolha a zona.'); t.ceic.push({zona: zona!, ate: g.round + 2}); aviso(g, `${quem} ativou o monitoramento CEIC.`, 'info', 'equipe'); break;
    case 'k9': d.k9 = 3; break;
    case 'escuta-movel': d.escuta = true; break;
    case 'decodificador': t.decodificador = true; break;
    case 'drone': { if (d.pa < 1) fail('O drone precisa de 1 PA.'); const l = b.local; if (!l || !LOCAL[l]) fail('Escolha o local.');
      const sim = s.loc === l || VIZ[l!].includes(s.loc); aviso(g, `Drone sobre ${nome(l!)}: ${sim ? 'SINAL! O espião está ali ou num vizinho.' : 'nada.'}`, sim ? 'perigo' : 'info', 'todos', {local: l}); usarEstoque(g, item); return 1; }
    case 'quebra-sigilo': aviso(g, s.app ? `Quebra de sigilo: corrida de App na rodada ${s.app.rodada}, de ${nome(s.app.de)} para ${nome(s.app.para)}.` : 'Quebra de sigilo: o espião ainda não usou aplicativo.', 'alerta'); break;
    case 'cones': { if (d.pa < 1) fail('Os cones precisam de 1 PA.'); const l = b.local; if (!l || !VIZ[d.loc].includes(l)) fail('Escolha um local vizinho.'); t.cones.push({local: l!, ate: g.round + 3});
      aviso(g, `Barreira montada em ${nome(l!)}.`, 'info', 'todos', {local: l}); usarEstoque(g, item); return 1; }
    case 'lancha': t.lancha = g.round; break;
    case 'helicoptero': { if (mods(g).chuva) fail('Helicóptero não voa com chuva forte.'); const l = b.local; if (!l || !LOCAL[l]) fail('Escolha o destino.'); d.loc = l!; d.bloqueio = false;
      aviso(g, `O helicóptero Águia levou ${quem} até ${nome(l!)}.`, 'info', 'todos', {local: l}); break; }
    case 'grampo': fail('Use a ação Instalar grampo num ponto de contato.');
    default: fail('Item desconhecido.');
  }
  usarEstoque(g, item); return 0;
}
const MODO_NOME: Record<Modo, string> = {pe: 'a pé', bike: 'bike', onibus: 'ônibus', trem: 'Trensurb', app: 'aplicativo', barco: 'barco', esconder: 'esconderijo'};
const papelNome = (p:Papel) => CARTAS.papeis_detetives.find(x => x.id === p)!.nome;

// ------------------------------------------------------------------ entrada de ações
export function act(g:Game, token:string, b:any) {
  const isHost = hash(token) === g.host; const p = playerOf(g, token);
  if (!isHost && !p) fail('Entre novamente na mesa.');
  const tipo = String(b.action ?? '');
  if (tipo === 'escolherEspiao' && isHost && g.phase === 'lobby') { g.espiaoEscolhido = g.players.some(x => x.id === b.player) ? b.player : null; return; }
  if (tipo === 'iniciar' && isHost && g.phase === 'lobby') { iniciar(g); return; }
  if (tipo === 'novaPartida' && isHost && g.phase === 'fim') { const keep = g.players.map(x => ({...x, side: null})); Object.assign(g, createGame(g.code, 'x', g.rs), {host: g.host, players: keep, revision: g.revision, requests: g.requests}); return; }
  if (tipo === 'pularTempo' && isHost) { if (g.deadline) g.deadline = Date.now() - 1; tick(g); return; }
  if (!p) fail('Ação só para jogadores.');
  if (tipo === 'chat' && p!.side === 'detetive') { const texto = String(b.texto ?? '').trim().slice(0, 200); if (texto) { g.equipe.chat.push({autor: p!.name, texto, at: Date.now()}); g.equipe.chat = g.equipe.chat.slice(-80); } return; }
  if (tipo === 'dossie' && p!.side === 'detetive') { const k = String(b.chave ?? ''); if (/^\d+:[A-D]$|^\d+$|^[A-D]$/.test(k)) { const v = String(b.valor ?? ''); if (v) g.equipe.dossie[k] = v.slice(0, 3); else delete g.equipe.dossie[k]; } return; }
  if (g.phase === 'preparo' && p!.side === 'espiao' && tipo === 'preparar') {
    if (!CARTAS.perfis_espiao.some(x => x.id === b.perfil)) fail('Escolha um perfil.'); if (!g.spy!.opcoesInicio.includes(b.local)) fail('Escolha um dos esconderijos iniciais.');
    g.spy!.perfil = b.perfil; g.spy!.loc = b.local; g.rastro = [{rodada: 0, local: b.local}];
    aviso(g, `O espião escolheu o perfil ${CARTAS.perfis_espiao.find(x => x.id === b.perfil)!.nome}. A caçada começa.`, 'alerta'); comecarRodada(g); return;
  }
  if (g.phase === 'espiao' && p!.side === 'espiao') {
    if (tipo === 'mover') { moverEspiao(g, b.modo, Number(b.local)); return; }
    if (tipo === 'agir') { agirEspiao(g, b.acao); return; }
  }
  if (g.phase === 'detetives' && p!.side === 'detetive') {
    if (tipo === 'det') { agirDetetive(g, p!, b); return; }
    if (tipo === 'rolar') { rolarDado(g, p!, Number(b.i)); return; }
    if (tipo === 'encerrar') { const i = g.vez ?? -1; if (g.dets[i]?.owner !== p!.id) fail('Agora não é a sua vez.'); proximaVez(g); return; }
  }
  fail('Agora não é a sua vez.');
}
/** Avança o jogo quando o tempo acaba. Chamado a cada consulta. */
export function tick(g:Game, now = Date.now()) {
  if (!g.deadline || now < g.deadline) return false;
  const s = g.spy;
  if (g.phase === 'preparo' && s) { s.perfil = 'corredor'; g.rastro = [{rodada: 0, local: s.loc}]; aviso(g, 'O tempo acabou: o espião começa como Corredor.', 'info'); comecarRodada(g); return true; }
  if (g.phase === 'espiao' && s) {
    if (!s.moveu) { const o = opcoesEspiao(g); if (o.esconder.length) moverEspiao(g, 'esconder', s.loc);
      else { const pe = [...o.pe].sort((a, b) => a.risco - b.risco)[0] ?? Object.values(o).flat()[0]; if (pe) moverEspiao(g, (Object.keys(o) as Modo[]).find(k => o[k].includes(pe))!, pe.local); } }
    if (g.phase === 'espiao') fimTurnoEspiao(g); return true;
  }
  if (g.phase === 'detetives') {
    const i = g.vez ?? 0; const d = g.dets[i];
    if (d && !d.rolou) { const dono = g.players.find(x => x.id === d.owner); aviso(g, `O tempo de ${dono?.name ?? 'um detetive'} (${papelNome(d.papel)}) acabou.`, 'info'); }
    proximaVez(g); return true; }
  return false;
}

// ------------------------------------------------------------------ o que cada aparelho pode ver
export function view(g:Game, token:string|null) {
  const isHost = !!token && hash(token) === g.host; const p = token ? playerOf(g, token) : undefined;
  const side = p?.side ?? null; const fim = g.phase === 'fim'; const m = g.phase === 'lobby' ? null : mods(g);
  const pub = {
    kind: 'sombra', code: g.code, revision: g.revision, phase: g.phase, round: g.round, hora: hora(Math.max(1, g.round)), deadline: g.deadline, now: Date.now(),
    players: g.players.map(x => ({id: x.id, name: x.name, side: x.side, online: Date.now() - x.seen < 20_000})), espiaoEscolhido: g.espiaoEscolhido,
    dets: g.dets.map(d => ({papel: d.papel, owner: d.owner, dono: g.players.find(x => x.id === d.owner)?.name ?? '', loc: d.loc, pa: d.pa, bloqueio: d.bloqueio, encerrou: d.encerrou, rolou: !!d.rolou})),
    vez: g.phase === 'detetives' ? g.vez ?? null : null, dado: g.dado ?? null,
    espiao: g.spy ? {perfil: g.spy.perfil, exposicao: g.spy.exposicao, falhas: g.spy.falhas, moveu: g.spy.moveu} : null,
    bilhetes: g.bilhetes, revelacoes: g.revelacoes, horaH: g.horaH, cones: g.equipe.cones,
    agl: m ? Object.fromEntries(IDS.map(i => [i, agl(g, i, m)])) : {},
    eventos: {agenda: g.agenda, ativos: g.ativos.filter(a => a.ate >= g.round), carta: g.carta},
    fila: g.fila.map(x => ({n: x.n, rodada: x.rodada, tipo: x.tipo, tentativas: x.tentativas, decifrada: x.decifrada, expirada: x.expirada})),
    contatos: MAPA.contatos_candidatos.map(local => ({local})), retratos: g.equipe.retratos.map(r => r.zona),
    avisos: g.avisos.filter(a => a.para === 'todos').slice(-30),
    fechados: m ? [...m.locaisFechados] : [], winner: g.winner, motivo: g.motivo,
    final: fim && g.spy ? {plano: g.plano, rastro: g.rastro, espiao: g.spy.loc, pistas: g.contatos.map(c => ({local: c.local, tipo: c.pista.tipo, texto: c.pista.texto, status: c.status}))} : null,
  };
  const me = isHost ? {tipo: 'tv' as const} : p ? {tipo: 'jogador' as const, id: p.id, name: p.name, side} : {tipo: 'publico' as const};
  let equipe = null, espiao = null;
  if (side === 'detetive' && g.phase !== 'lobby') {
    const t = g.equipe;
    equipe = {orcamento: t.orcamento, estoque: t.estoque, dossie: t.dossie, chat: t.chat.slice(-40), pistas: t.pistas, acusou: t.acusou, decodificador: t.decodificador, lancha: t.lancha === g.round,
      contatos: MAPA.contatos_candidatos.map(l => ({local: l, situacao: t.vistoriados[l] ?? 'desconhecido', grampo: t.grampos.includes(l)})),
      avisos: g.avisos.filter(a => a.para === 'equipe').slice(-30), interrogarGratis: t.interrogarGratis, bloqueiosGratis: t.bloqueiosGratis,
      meus: g.phase === 'detetives' && g.vez != null && g.dets[g.vez].owner === p!.id && g.dets[g.vez].rolou ? [{i: g.vez, ...opcoesDetetive(g, g.vez)}] : []};
  }
  if (side === 'espiao' && g.spy) {
    const s = g.spy;
    espiao = {loc: s.loc, dinheiro: s.dinheiro, credenciais: s.credenciais, pistas: s.pistas, disfarce: s.disfarce, escudo: s.escudo, escondido: s.escondido, falsas: s.falsas,
      movimentos: s.movimentos, moveu: s.moveu, agiu: s.agiu, perfil: s.perfil, opcoesInicio: g.phase === 'preparo' ? s.opcoesInicio : [],
      remarcada: s.remarcada ?? null,
      planoB: s.planoB ? {extracao: g.plano!.extracao, janela: g.plano!.janela} : null,
      opcoes: g.phase === 'espiao' && s.movimentos > 0 ? opcoesEspiao(g) : null, acoes: g.phase === 'espiao' && s.moveu && !s.agiu ? acoesEspiao(g) : null,
      contatos: g.contatos.map(c => ({local: c.local, status: c.status === 'confiscado' ? 'caiu' : c.status === 'recolhido' ? 'recolhido' : 'fechado'})),
      avisos: g.avisos.filter(a => a.para === 'espiao').slice(-30), aqui: {agl: agl(g, s.loc, m!), risco: chanceDenuncia(g, s.loc, false, m!)}};
  }
  return {me, pub, equipe, espiao};
}
