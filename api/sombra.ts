import {randomBytes, randomInt} from 'node:crypto';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {createGame, addPlayer, act, tick, view, hash, type Game} from '../src/sombra/rules/engine.js';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Sem Supabase configurado (desenvolvimento local), as mesas ficam na memória do processo.
const memoria = new Map<string, {state:Game;at:number}>();
const usarMemoria = () => !process.env.SUPABASE_URL && !process.env.VERCEL;

async function rpc(operation:'get'|'create'|'save', code:string, state:Game|null = null, revision = -1): Promise<any> {
  if (usarMemoria()) {
    const agora = Date.now(); for (const [k, v] of memoria) if (agora - v.at > 48 * 3600_000) memoria.delete(k);
    const atual = memoria.get(code);
    if (operation === 'get') return atual ? structuredClone(atual.state) : null;
    if (operation === 'create') { if (atual) return false; memoria.set(code, {state: structuredClone(state!), at: agora}); return true; }
    if (!atual || atual.state.revision !== revision) return false; memoria.set(code, {state: structuredClone(state!), at: agora}); return true;
  }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY, backend = process.env.GAME_BACKEND_KEY;
  if (!url || !key || !backend) throw new Error('A mesa está em manutenção. Tente novamente em instantes.');
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/rpc/patifaria_storage`, {method: 'POST', headers: {apikey: key, 'Content-Type': 'application/json'},
      body: JSON.stringify({backend_key: backend, operation, room_code: code, new_state: state, expected_revision: revision}), signal: AbortSignal.timeout(12000)});
  } catch (e) {
    console.error('storage: conexão falhou', e);
    throw new Error('Não foi possível conectar ao banco de dados (Supabase). Confira se o projeto está ativo no supabase.com e se SUPABASE_URL está certo na Vercel.');
  }
  if (!res.ok) { console.error('storage', res.status, await res.text().catch(() => ''));
    throw new Error(res.status === 401 || res.status === 403 || res.status === 404 ? `O banco de dados recusou o acesso (erro ${res.status}). Confira as variáveis do Supabase na Vercel.` : 'Não foi possível acessar a mesa. Tente novamente.'); }
  return await res.json();
}

export default async function handler(req:IncomingMessage & {body?:any}, res:ServerResponse) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({error: 'Método inválido.'})); return; }
  try {
    let b = req.body; if (typeof b === 'string') b = JSON.parse(b);
    if (!b) { let raw = ''; for await (const c of req) { raw += c; if (raw.length > 8000) throw new Error('Pedido muito grande.'); } b = JSON.parse(raw); }
    if (JSON.stringify(b).length > 8000) throw new Error('Pedido muito grande.');
    if (b.type === 'create') {
      const token = randomBytes(32).toString('hex'); let g: Game | null = null;
      for (let tries = 0; ; tries++) {
        if (tries > 6) throw new Error('Não foi possível criar a mesa.');
        const code = Array.from({length: 5}, () => alphabet[randomInt(alphabet.length)]).join('');
        g = createGame(code, token); if (await rpc('create', code, g)) break;
      }
      res.end(JSON.stringify({token, game: view(g!, token)})); return;
    }
    const code = String(b.code || '').toUpperCase(); if (!/^[A-Z2-9]{5}$/.test(code)) throw new Error('Informe o código de 5 caracteres que aparece na TV.');
    const token = b.type === 'join' ? randomBytes(32).toString('hex') : String(b.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Entre novamente na mesa.');
    for (let retry = 0; retry < 8; retry++) {
      const g: Game = await rpc('get', code);
      if (!g || g.kind !== 'sombra') throw new Error('Mesa não encontrada ou expirada.');
      const rev = g.revision; let changed = false;
      if (b.type === 'join') { addPlayer(g, String(b.name || ''), token); changed = true; }
      else if (b.type === 'poll') {
        const isHost = hash(token) === g.host; const me = g.players.find(p => p.secret === hash(token));
        if (!isHost && !me) throw new Error('Entre novamente na mesa.');
        changed = tick(g);
        if (me && Date.now() - me.seen > 7000) { me.seen = Date.now(); changed = true; }
        if (!changed && b.revision === g.revision) { res.end(JSON.stringify({unchanged: true, now: Date.now()})); return; }
      } else {
        if (typeof b.requestId !== 'string' || b.requestId.length > 80) throw new Error('Pedido inválido.');
        if (!g.requests.includes(b.requestId)) { act(g, token, b); g.requests.push(b.requestId); g.requests = g.requests.slice(-200); changed = true; }
      }
      if (changed) { g.revision++; if (!await rpc('save', code, g, rev)) continue; }
      res.end(JSON.stringify({token: b.type === 'join' ? token : undefined, game: view(g, token)})); return;
    }
    res.statusCode = 409; res.end(JSON.stringify({error: 'Muita movimentação na mesa. Tente de novo.'}));
  } catch (e) { res.statusCode = 400; res.end(JSON.stringify({error: e instanceof Error ? e.message : 'Ocorreu um erro.'})); }
}
