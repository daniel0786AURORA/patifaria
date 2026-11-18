// Dados do tabuleiro e consultas de movimento. Público: pode ser usado pelo servidor e pelo navegador.
import mapaJson from '../../../docs/sombra-no-guaiba/mapa.json';

export type Zona = string;
export type TipoArea = 'comercial'|'boemio'|'nobre'|'residencial'|'universitario'|'industrial'|'quente'|'lazer'|'rural'|'ilha';
export type Local = {id:number;nome:string;curto:string;zona:Zona;tipo:TipoArea;aglomeracao_base:number;etiquetas:string[];lat:number;lon:number;x:number;y:number};
export type Linha = {id:string;nome:string;corujao:boolean;paradas:number[]};
export type Mapa = {
  zonas:Record<string,string>;tipos:Record<string,string>;locais:Local[];
  conexoes:{a_pe:[number,number][];barco:{rodadas:[number,number];arestas:[number,number][]};trensurb:{rodadas:[number,number];estacoes:number[]};
    onibus:{rodadas:[number,number];corujao_rodadas:[number,number];linhas:Linha[]};bike:{rodadas:[number,number];estacoes:number[]}};
  janelas_extracao:Record<string,[number,number]>;pontos_extracao:number[];contatos_candidatos:number[];contatos_sorteados:number;
  inicio_detetives:{fixo:number;opcoes:number[]};rodadas:{total:number;revelacoes:number[]};
};
export const MAPA = mapaJson as unknown as Mapa;
export const LOCAL: Record<number, Local> = Object.fromEntries(MAPA.locais.map(l => [l.id, l]));
export const POR_NOME: Record<string, number> = Object.fromEntries(MAPA.locais.map(l => [l.curto, l.id]));
export const IDS = MAPA.locais.map(l => l.id);
export const tem = (id:number, tag:string) => LOCAL[id]?.etiquetas.includes(tag) ?? false;
export const extracaoMeio = (id:number) => LOCAL[id].etiquetas.find(t => t.startsWith('EXT:'))?.slice(4);

export const VIZ: Record<number, number[]> = Object.fromEntries(IDS.map(i => [i, [] as number[]]));
for (const [a, b] of MAPA.conexoes.a_pe) { VIZ[a].push(b); VIZ[b].push(a); }
export const AGUA: Record<number, number[]> = Object.fromEntries(IDS.map(i => [i, [] as number[]]));
for (const [a, b] of MAPA.conexoes.barco.arestas) { AGUA[a].push(b); AGUA[b].push(a); }
export const BIKE = new Set(MAPA.conexoes.bike.estacoes);
export const BIKE_ZONAS = new Set(['CEN', 'CBX', 'BOM', 'MOI']);
export const TREM = MAPA.conexoes.trensurb.estacoes;
export const LINHAS = MAPA.conexoes.onibus.linhas;
export const EXTRACOES = MAPA.pontos_extracao;
export const JANELAS = MAPA.janelas_extracao;
export const HQ = IDS.find(i => tem(i, 'HQ'))!;

/** Hora do relógio (0-23) de uma rodada. Rodada 1 = 06h. */
export const hora = (r:number) => (5 + r) % 24;
export const horaTxt = (r:number) => String(hora(r)).padStart(2, '0') + 'h';
export const periodo = (r:number) => r >= 19 ? 'madrugada' : r >= 15 ? 'noite' : (r >= 2 && r <= 4) || (r >= 12 && r <= 14) ? 'rush' : 'dia';

/** Busca em largura. `pode(y)` decide se dá para entrar em y; `atravessa(y)` se dá para seguir adiante a partir de y. */
export function alcance(origem:number, max:number, pode:(y:number)=>boolean = () => true, atravessa:(y:number)=>boolean = () => true): Map<number, number> {
  const dist = new Map<number, number>([[origem, 0]]); const fila = [origem];
  while (fila.length) {
    const x = fila.shift()!; const d = dist.get(x)!;
    if (d >= max || (x !== origem && !atravessa(x))) continue;
    for (const y of VIZ[x]) if (!dist.has(y) && pode(y)) { dist.set(y, d + 1); fila.push(y); }
  }
  dist.delete(origem); return dist;
}
export const distancia = (a:number, b:number) => a === b ? 0 : alcance(a, 60).get(b) ?? 99;
