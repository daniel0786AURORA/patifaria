import {useEffect, useRef, useState, useCallback} from 'react';

export async function call(body:Record<string, unknown>) {
  const r = await fetch('/api/sombra', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  let j: any = {}; try { j = await r.json(); } catch { /* resposta vazia */ }
  if (!r.ok) throw new Error(j.error || 'Não foi possível falar com a mesa.');
  return j;
}
export const store = {
  get: (k:string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k:string, v:string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } },
  del: (k:string) => { try { localStorage.removeItem(k); } catch { /* sem armazenamento */ } },
};
const rid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Mantém a mesa sincronizada (consulta a cada segundo) e envia ações. */
export function useMesa(code:string, token:string|null) {
  const [game, setGame] = useState<any>(null); const [error, setError] = useState(''); const [offset, setOffset] = useState(0);
  const rev = useRef(-1); const busy = useRef(false);
  const aplicar = (j:any) => { if (j.game) { setGame(j.game); rev.current = j.game.pub.revision; setOffset(j.game.pub.now - Date.now()); } else if (j.now) setOffset(j.now - Date.now()); };
  useEffect(() => {
    if (!token) return; let vivo = true;
    const poll = async () => {
      if (busy.current) return; busy.current = true;
      try { const j = await call({type: 'poll', code, token, revision: rev.current}); if (vivo) { aplicar(j); setError(''); } }
      catch (e) { if (vivo) setError((e as Error).message); }
      finally { busy.current = false; }
    };
    poll(); const t = setInterval(poll, 1000); return () => { vivo = false; clearInterval(t); };
  }, [code, token]);
  const send = useCallback(async (action:string, extra:Record<string, unknown> = {}) => {
    try { const j = await call({type: 'act', code, token, requestId: rid(), action, ...extra}); aplicar(j); setError(''); return true; }
    catch (e) { setError((e as Error).message); return false; }
  }, [code, token]);
  return {game, error, send, offset, setError};
}
export function useAgora(offset:number) { const [t, setT] = useState(Date.now()); useEffect(() => { const i = setInterval(() => setT(Date.now()), 500); return () => clearInterval(i); }, []); return t + offset; }
