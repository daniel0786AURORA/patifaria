// Sorteio do plano secreto (mesmas regras de docs/sombra-no-guaiba/gerar_pistas.py). Só roda no servidor.
import {MAPA, LOCAL, POR_NOME, JANELAS} from './map.js';

export type Rng = () => number;
export function rng(seed:number): Rng {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const pick = <T,>(r:Rng, xs:readonly T[]) => xs[Math.floor(r() * xs.length)];
export function shuffle<T>(r:Rng, xs:T[]): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function combos<T>(xs:T[], k:number): T[][] { if (k === 0) return [[]]; return xs.flatMap((x, i) => combos(xs.slice(i + 1), k - 1).map(c => [x, ...c])); }

const EXT: Record<string, {meio:string;regiao:string}> = {
  'Cais Mauá': {meio: 'agua', regiao: 'centro'}, 'Rodoviária': {meio: 'terra', regiao: 'centro'},
  'Aeroporto': {meio: 'ar', regiao: 'norte'}, 'Ponte do Guaíba': {meio: 'terra', regiao: 'norte'},
  'Ilha da Pintada': {meio: 'agua', regiao: 'ilhas'}, 'Belém Novo': {meio: 'agua', regiao: 'sul'},
};
const TODOS = Object.keys(EXT);
const by = (f:(v:{meio:string;regiao:string})=>boolean) => TODOS.filter(k => f(EXT[k]));
export type Pista = {tipo:'ONDE'|'QUANDO'|'CREDENCIAL';texto:string;elimina?:string[];dinheiro?:number};
const artigo = (k:string) => ['Cais Mauá', 'Aeroporto'].includes(k) ? 'no' : ['Rodoviária', 'Ponte do Guaíba', 'Ilha da Pintada'].includes(k) ? 'na' : 'em';
export const MODELOS_ONDE: {texto:string;elimina:string[]}[] = [
  {texto: 'Esqueça a água: o Guaíba está vigiado.', elimina: by(v => v.meio === 'agua')},
  {texto: 'Nada de estrada desta vez.', elimina: by(v => v.meio === 'terra')},
  {texto: 'Não haverá voo.', elimina: ['Aeroporto']},
  {texto: 'O contato evita o Centro.', elimina: by(v => v.regiao === 'centro')},
  {texto: 'O contato não atravessa o rio.', elimina: ['Ilha da Pintada', 'Ponte do Guaíba']},
  {texto: 'Longe da Zona Norte.', elimina: by(v => v.regiao === 'norte')},
  {texto: 'Nada no Extremo Sul.', elimina: ['Belém Novo']},
  {texto: 'Nem barco de pescador, nem ônibus de linha.', elimina: ['Ilha da Pintada', 'Rodoviária']},
  {texto: 'Os armazéns do cais estão cheios de câmeras.', elimina: ['Cais Mauá']},
  {texto: 'A rodoviária tem polícia demais.', elimina: ['Rodoviária']},
  ...TODOS.map(k => ({texto: `Não é ${artigo(k)} ${k}.`, elimina: [k]})),
];
export const MODELOS_QUANDO: {texto:string;elimina:string[]}[] = [
  {texto: 'Só depois que escurecer.', elimina: ['A', 'B']},
  {texto: 'Ainda com a luz do dia.', elimina: ['C', 'D']},
  {texto: 'Nem à tarde, nem de madrugada.', elimina: ['A', 'D']},
  {texto: 'Nem no rush da tarde, nem perto da meia-noite.', elimina: ['B', 'C']},
  {texto: 'Os guardas trocam de turno às 14h e às 22h: evite esses horários.', elimina: ['A', 'C']},
  {texto: 'No rush e na madrugada as saídas estão vigiadas.', elimina: ['B', 'D']},
];
const SENHAS = ['Chimarrão sem açúcar.', 'O minuano sopra do sul.', 'O sol se põe no Gasômetro.', 'A ponte subiu às seis.', 'Bah, que frio.', 'Tri legal, tchê.', 'O Guaíba é um lago.', 'Quero-quero não dorme.'];

export type Plano = {extracao:number;janela:string;contatos:{local:number;pista:Pista}[];naoSorteados:number[]};
export function sortearPlano(r:Rng): Plano {
  const ext = pick(r, TODOS); const jan = pick(r, Object.keys(JANELAS));
  const erradas = new Set(TODOS.filter(k => k !== ext));
  const validos = MODELOS_ONDE.filter(m => !m.elimina.includes(ext) && m.elimina.length <= 3);
  const ok = combos(validos, 4).filter(c => {
    const sets = c.map(m => new Set(m.elimina)); const u = new Set(sets.flatMap(s => [...s]));
    if (u.size !== erradas.size) return false;
    return combos(sets, 3).every(t => new Set(t.flatMap(s => [...s])).size >= 4) && new Set(c.map(m => m.texto)).size === 4;
  });
  const onde = pick(r, ok);
  const qv = MODELOS_QUANDO.filter(m => !m.elimina.includes(jan));
  const pares = combos(qv, 2).filter(([a, b]) => new Set([...a.elimina, ...b.elimina]).size === 3);
  const quando = pick(r, pares);
  const senhas = shuffle(r, SENHAS).slice(0, 2);
  const pistas: Pista[] = shuffle(r, [
    ...onde.map(m => ({tipo: 'ONDE' as const, ...m})), ...quando.map(m => ({tipo: 'QUANDO' as const, ...m})),
    ...senhas.map(s => ({tipo: 'CREDENCIAL' as const, texto: `Senha: “${s}”`, dinheiro: 2})),
  ]);
  let contatos: number[];
  do { contatos = shuffle(r, MAPA.contatos_candidatos).slice(0, MAPA.contatos_sorteados); } while (new Set(contatos.map(c => LOCAL[c].zona)).size < 5);
  return {extracao: POR_NOME[ext], janela: jan, contatos: contatos.map((local, i) => ({local, pista: pistas[i]})),
    naoSorteados: MAPA.contatos_candidatos.filter(c => !contatos.includes(c))};
}
/** Pista falsa plausível para a Mensagem Falsa: elimina justamente o ponto verdadeiro. */
export function pistaFalsa(r:Rng, extracao:number): Pista {
  const nome = LOCAL[extracao].curto;
  return {tipo: 'ONDE', ...pick(r, MODELOS_ONDE.filter(m => m.elimina.includes(nome) && m.elimina.length <= 3))};
}
