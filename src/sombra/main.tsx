import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import qrcode from 'qrcode-generator';
import cartasJson from '../../docs/sombra-no-guaiba/cartas.json';
import {createBoard, bboxOf, VIEWS, LOCAIS, LC} from './board';
import {call, store, useMesa, useAgora} from './api';
import './style.css';

type Any = any;
const CARTAS = cartasJson as Any;
const EVENTOS: Record<string, Any> = Object.fromEntries([...CARTAS.eventos_agendados, ...CARTAS.eventos_aleatorios].map((e:Any) => [e.id, e]));
const ITENS: Record<string, Any> = Object.fromEntries(CARTAS.itens.map((i:Any) => [i.id, i]));
const PAPEL: Record<string, Any> = Object.fromEntries(CARTAS.papeis_detetives.map((p:Any) => [p.id, p]));
const nm = (id:number) => (LOCAIS as Any)[id]?.curto ?? '?';
const ZONAS: Record<string, string> = {CEN: 'Centro Histórico', CBX: 'Cidade Baixa e Menino Deus', BOM: 'Bom Fim e Farroupilha', MOI: 'Moinhos e bairros nobres', NOR: 'Zona Norte', LES: 'Zona Leste', SUL: 'Zona Sul', EXT: 'Extremo Sul', ILH: 'Ilhas'};
const hora = (r:number) => String((5 + r) % 24).padStart(2, '0') + 'h';
const JAN: Record<string, [number, number]> = {A: [9, 10], B: [13, 14], C: [17, 18], D: [21, 22]};
const JTXT: Record<string, string> = {A: '14–16h', B: '18–20h', C: '22–00h', D: '02–04h'};
const EXTRACOES: number[] = Object.values(LOCAIS as Any).filter((n:Any) => n.etiquetas.some((t:string) => t.startsWith('EXT'))).map((n:Any) => n.id);
const TICKET: Record<string, string> = {pe: 'PÉ', bike: 'BIKE', onibus: 'ÔNI', trem: 'TREM', app: 'APP', barco: 'BARCO', esconder: 'ESC'};
const MODO: Record<string, string> = {pe: 'A pé', bike: 'Bike', onibus: 'Ônibus', trem: 'Trensurb', app: 'Aplicativo', barco: 'Barco', esconder: 'Esconder-se', viatura: 'Viatura', apoio: 'Apoio grátis'};
const ACAO: Record<string, [string, string]> = {
  investigar: ['Investigar rastro', 'O espião passou por aqui?'], interrogar: ['Interrogar testemunhas', 'O espião está aqui ou num lugar vizinho?'], periciar: ['Vasculhar ponto de contato', 'Se houver envelope, o time lê a pista'],
  confiscar: ['Confiscar envelope', 'Tira a pista do espião'], interceptar: ['Interceptar transmissão', 'Decifrar uma mensagem da rede'], abordar: ['Abordar (prender)', 'Se o espião estiver aqui, você vence'],
  bloqueio: ['Montar blitz', 'Fecha a passagem de veículos'], grampo: ['Instalar grampo', 'Pega o espião se recolher aqui'], comprar: ['Comprar item', 'Usa o orçamento do time'],
  usar: ['Usar item', 'Do estoque do time'], transferir: ['Dar 1 ponto', 'Para outro detetive usar na vez dele'], acusar: ['Acusação de Plano', 'Acertou: a rede troca de plano. Errou: perde orçamento'],
};
const ACAO_ESPIAO: Record<string, [string, string]> = {
  recolher: ['Recolher envelope', 'Pista nova, mas gera uma transmissão'], sacar: ['Sacar dinheiro', '+R$ 4, alerta bancário na próxima rodada'], disfarce: ['Trocar disfarce', 'Exposição −2 e proteção contra 1 alerta'],
  falsa: ['Mensagem falsa', 'Uma transmissão para enganar a polícia'], informante: ['Pagar informante', 'Mostra grampos e blitz por perto'], emergencia: ['Contato de emergência', 'Senha nova, mas revela sua zona'],
  horaH: ['DECLARAR HORA H', 'Só se tiver certeza do lugar e da hora'], passar: ['Encerrar o turno', 'Sem ação'],
};
const modoMapa = (r:number) => r >= 14 ? 'noite' : 'dia';

// ------------------------------------------------------------------ tabuleiro em React
function Board({pub, extra, onSelect, view, className = ''}:{pub:Any;extra?:Any;onSelect?:(id:number)=>void;view?:number[];className?:string}) {
  const ref = useRef<SVGSVGElement>(null); const b = useRef<Any>(null); const sel = useRef(onSelect); sel.current = onSelect;
  useEffect(() => { b.current = (createBoard as Any)(ref.current, {onSelect: (id:number) => sel.current?.(id)}); b.current.setView(view ?? VIEWS.tv, false); }, []);
  const ek = JSON.stringify(extra ?? {});
  useEffect(() => { if (pub) b.current?.update(pub, extra ?? {}); }, [pub, ek]);
  const vk = JSON.stringify(view);
  useEffect(() => { if (view) b.current?.setView(view); }, [vk]);
  return <div className={'board ' + className} data-mode={modoMapa(pub?.round ?? 1)} style={{position: 'absolute', inset: 0}}>
    <svg ref={ref} role="img" aria-label="Tabuleiro de Porto Alegre"/>
    <div className="mapctl"><button onClick={() => b.current?.zoom(.7)} aria-label="Aproximar">+</button><button onClick={() => b.current?.zoom(1 / .7)} aria-label="Afastar">−</button></div>
  </div>;
}
function minBox(box:number[], w = 9000, h = 6500) { const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2; const W = Math.max(w, box[2] - box[0]), H = Math.max(h, box[3] - box[1]); return [cx - W / 2, cy - H / 2, cx + W / 2, cy + H / 2]; }

// ------------------------------------------------------------------ início
function Home() {
  const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const criar = async () => { setBusy(true); setErr(''); try { const j = await call({type: 'create'}); store.set('sombra:tv:' + j.game.pub.code, j.token); location.href = '/sombra?tv=' + j.game.pub.code; } catch (e) { setErr((e as Error).message); setBusy(false); } };
  return <main className="home"><div className="home-card">
    <div><div className="eyebrow">Jogo de movimento oculto em Porto Alegre</div><h1>Sombra no <span>Guaíba</span></h1>
      <p className="muted">Um espião tenta fugir da cidade. Os detetives têm até o amanhecer para pegá-lo. O mapa fica na TV; cada um joga pelo próprio celular.</p></div>
    <div className="home-opts">
      <div className="box"><h2>Nesta tela (TV ou computador)</h2><p className="muted" style={{margin: 0}}>Abre a mesa e mostra o QR code para os celulares entrarem.</p><button className="btn" onClick={criar} disabled={busy}>Abrir mesa</button></div>
      <form className="box" onSubmit={e => { e.preventDefault(); if (/^[A-Za-z2-9]{5}$/.test(code)) location.href = '/sombra?m=' + code.toUpperCase(); else setErr('O código tem 5 caracteres.'); }}>
        <h2>No celular</h2><label className="muted" htmlFor="code">Código que aparece na TV</label>
        <input id="code" className="input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} autoCapitalize="characters" autoComplete="off" placeholder="ABCDE"/>
        <button className="btn sec">Entrar na mesa</button></form>
      {err && <div className="err">{err}</div>}
    </div>
  </div></main>;
}

// ------------------------------------------------------------------ vez, dado e jogadores (TV e celulares)
function quemJoga(pub:Any): {nome:string;papel:string;espiao:boolean}|null {
  if (pub.phase === 'espiao' || pub.phase === 'preparo') { const p = pub.players.find((x:Any) => x.side === 'espiao'); return p ? {nome: p.name, papel: 'Espião', espiao: true} : null; }
  if (pub.phase === 'detetives' && pub.vez != null) { const d = pub.dets[pub.vez]; return {nome: d.dono, papel: PAPEL[d.papel].nome, espiao: false}; }
  return null;
}
const dadoAgora = (pub:Any) => pub.phase === 'detetives' && pub.dado && pub.dado.det === pub.vez && pub.dado.rodada === pub.round ? pub.dado.valor : null;
function Dado({valor, grande}:{valor:number;grande?:boolean}) { return <div key={valor + '-' + Date.now()} className={'dado anim' + (grande ? ' grande' : '')} aria-label={`Dado: ${valor}`}>{valor}</div>; }
function Jogadores({pub}:{pub:Any}) {
  const q = quemJoga(pub);
  return <div className="jog">{pub.players.map((p:Any) => {
    const meus = pub.dets.map((d:Any, i:number) => ({d, i})).filter((x:Any) => x.d.owner === p.id);
    const agora = q && q.nome === p.name;
    return <div key={p.id} className={agora ? 'agora' : ''}><span>{agora ? '▶ ' : ''}{p.name}</span>
      <span style={{display: 'flex', gap: 4}}>{p.side === 'espiao' ? <span className="tag esp">ESPIÃO</span> : meus.map((x:Any) => <span key={x.i} className="tag">{PAPEL[x.d.papel].letra}{pub.vez === x.i && x.d.rolou ? ` · ${x.d.pa} pts` : ''}</span>)}</span></div>;
  })}</div>;
}

// ------------------------------------------------------------------ TV
function Qr({text}:{text:string}) { const svg = useMemo(() => { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({cellSize: 4, margin: 1, scalable: true}); }, [text]); return <div className="qr" dangerouslySetInnerHTML={{__html: svg}}/>; }
function Tempo({deadline, offset}:{deadline:number|null;offset:number}) { const now = useAgora(offset); if (!deadline) return null; const s = Math.max(0, Math.ceil((deadline - now) / 1000)); return <span className={'timer' + (s <= 15 ? ' low' : '')}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>; }
function TV({code}:{code:string}) {
  const token = store.get('sombra:tv:' + code); const {game, error, send, offset} = useMesa(code, token);
  if (!token) return <main className="home"><div className="home-card box"><h2>Esta tela não abriu a mesa {code}</h2><p className="muted">Abra uma mesa nova na tela inicial.</p><a className="btn" href="/sombra">Voltar</a></div></main>;
  if (!game) return <main className="home"><div className="waiting"><b>Conectando à mesa {code}…</b>{error && <div className="err">{error}</div>}</div></main>;
  const pub = game.pub;
  if (pub.phase === 'lobby') return <LobbyTV pub={pub} send={send} error={error}/>;
  return <TVJogo pub={pub} send={send} offset={offset} error={error}/>;
}
function LobbyTV({pub, send, error}:{pub:Any;send:Any;error:string}) {
  const url = `${location.origin}/sombra?m=${pub.code}`;
  return <main className="lobby-tv">
    <div style={{display: 'grid', gap: 18}}>
      <div className="eyebrow">Porto Alegre · 06h · o espião está na cidade</div><h1>Sombra no <span>Guaíba</span></h1>
      <p className="muted" style={{fontSize: 20, margin: 0}}>Aponte a câmera do celular para o QR code ou entre em <b style={{color: 'var(--paper)'}}>{location.host}/sombra</b> com o código abaixo. De 2 a 6 jogadores.</p>
      <div className="ajuda" style={{fontSize: 17}}><b>Como funciona:</b> um jogador é o <b>espião</b> e se move escondido pela cidade, juntando pistas para fugir. Os outros são <b>detetives</b>: cada um, na sua vez, <b>rola o dado</b> e gasta os pontos andando pelo mapa e investigando. Pega o espião quem chegar no mesmo lugar e <b>abordar</b>. Ele vence se fugir no lugar e na hora certos.</div>
      <div className="plist">
        {pub.players.map((p:Any) => <div className="pl" key={p.id}><span>{p.name}</span>
          <button className={pub.espiaoEscolhido === p.id ? 'on' : ''} onClick={() => send('escolherEspiao', {player: pub.espiaoEscolhido === p.id ? '' : p.id})}>{pub.espiaoEscolhido === p.id ? 'Espião' : 'Fazer espião'}</button></div>)}
        {!pub.players.length && <div className="muted">Esperando os celulares entrarem…</div>}
      </div>
      <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
        <button className="btn" disabled={pub.players.length < 2} onClick={() => send('iniciar')}>{pub.espiaoEscolhido ? 'Começar' : 'Sortear espião e começar'}</button>
        <span className="muted">{pub.players.length < 2 ? 'Precisa de pelo menos 2 jogadores.' : `${pub.players.length} jogadores · ${pub.players.length >= 6 ? 5 : 4} detetives na força-tarefa`}</span>
      </div>
      {error && <div className="err">{error}</div>}
    </div>
    <div style={{display: 'grid', gap: 16, justifyItems: 'center'}}><Qr text={url}/><div className="code">{pub.code}</div>
      <a className="btn" style={{textDecoration: 'none'}} target="_blank" rel="noreferrer"
        href={'https://wa.me/?text=' + encodeURIComponent(`Bora jogar Sombra no Guaíba! Entra na mesa ${pub.code}: ${url}`)}>Mandar convite pelo WhatsApp</a>
      <button className="btn sec" onClick={() => navigator.clipboard?.writeText(url).catch(() => {})}>Copiar link da mesa</button></div>
  </main>;
}
function TVJogo({pub, send, offset, error}:{pub:Any;send:Any;offset:number;error:string}) {
  const foco = useMemo(() => {
    if (pub.final) return minBox(bboxOf([...pub.final.rastro.map((r:Any) => r.local), pub.final.plano.extracao], 1500), 12000, 8000);
    const ids: number[] = pub.dets.map((d:Any) => d.loc);
    const ult = pub.revelacoes.at(-1);
    if (ult?.local) ids.push(ult.local);
    if (ult?.zona && pub.round - ult.rodada <= 1) Object.values(LOCAIS as Any).filter((n:Any) => n.zona === ult.zona).forEach((n:Any) => ids.push(n.id));
    if (pub.horaH) return minBox(bboxOf([pub.horaH.local, ...pub.dets.map((d:Any) => d.loc)], 1500));
    return minBox(bboxOf(ids, 2200), 14000, 9000);
  }, [JSON.stringify([pub.dets.map((d:Any) => d.loc), pub.revelacoes.length, pub.horaH, !!pub.final])]);
  const ev = pub.eventos; const carta = ev.carta ? EVENTOS[ev.carta] : null;
  const agendaAgora = ev.agenda.filter((a:Any) => pub.round >= a.rodadas[0] && pub.round <= a.rodadas[1]);
  const prox = ev.agenda.filter((a:Any) => a.rodadas[0] > pub.round);
  const banner = pub.phase === 'preparo' ? 'O espião está escolhendo onde se esconder…' : pub.phase === 'espiao' ? 'Vez do espião. Olhem para o lado.' : pub.phase === 'detetives' ? 'Vez da força-tarefa' : null;
  const avisos = [...pub.avisos].reverse().slice(0, 9);
  return <main className="tv">
    <div className="tv-map">
      <Board pub={pub} view={foco} extra={{}}/>
      {pub.horaH && !pub.final && <div className="banner perigo">🚨 EXTRAÇÃO EM ANDAMENTO EM {nm(pub.horaH.local).toUpperCase()}</div>}
      {!pub.horaH && !pub.final && (() => { const q = quemJoga(pub); const v = dadoAgora(pub); if (!q) return banner && <div className="banner">{banner}</div>;
        return <div className="vezbanner"><div>Vez de {q.nome} <span style={{color: q.espiao ? 'var(--hot)' : 'var(--cop)'}}>· {q.papel}</span>
          <div style={{font: '600 16px var(--f-body)', color: 'var(--muted)'}}>{q.espiao ? 'O espião está se movendo em segredo. Não olhem o celular dele.' : v ? `Tirou ${v} no dado: ${v} pontos para gastar.` : 'Esperando rolar o dado no celular…'}</div></div>
          {v ? <Dado valor={v} grande/> : null}</div>; })()}
      {pub.final && <div className="final">
        <div className="eyebrow">Fim de jogo · rodada {pub.round}</div>
        <h2 style={{color: pub.winner === 'espiao' ? 'var(--hot)' : 'var(--cop)'}}>{pub.winner === 'espiao' ? 'O espião escapou' : 'A força-tarefa venceu'}</h2>
        <div style={{fontSize: 18}}>{pub.motivo}</div>
        <div>Plano da rede: fuga por <b>{nm(pub.final.plano.extracao)}</b>, janela {pub.final.plano.janela} ({JTXT[pub.final.plano.janela]}). A linha vermelha no mapa é a rota secreta do espião.</div>
        <div className="envs">{pub.final.pistas.map((p:Any, i:number) => <span key={i}><b>{nm(p.local)}</b> · {p.tipo} · {p.texto} {p.status !== 'fechado' ? `(${p.status})` : ''}</span>)}</div>
        <div><button className="btn" onClick={() => send('novaPartida')}>Nova partida com os mesmos jogadores</button></div>
      </div>}
    </div>
    <aside className="tv-side">
      <div>
        <div className="clock"><b>{hora(pub.round)}</b><span>Rodada {pub.round} de 24</span><Tempo deadline={pub.deadline} offset={offset}/></div>
        <div className="windows">{Object.entries(JAN).map(([k, [a, b]]) => <div key={k} className={pub.round >= a && pub.round <= b ? 'on' : ''}>{k} {JTXT[k]}</div>)}</div>
      </div>
      <div><div className="lbl">Jogadores</div><Jogadores pub={pub}/></div>
      {(carta || agendaAgora.length > 0) && <div className="card">
        {agendaAgora.map((a:Any) => <div key={a.id} style={{marginBottom: 6}}><div className="lbl">Agenda · até {hora(a.rodadas[1] + 1)}</div><div className="ev-title">{EVENTOS[a.id].nome}</div><div style={{fontSize: 14}}>{EVENTOS[a.id].texto}</div></div>)}
        {carta && <div><div className="lbl">Carta da rodada</div><div className="ev-title" style={{color: 'var(--paper)'}}>{carta.nome}</div><div style={{fontSize: 14}}>{carta.texto}</div></div>}
      </div>}
      {prox.length > 0 && <div className="muted" style={{fontSize: 14}}>Próximos: {prox.map((a:Any) => `${EVENTOS[a.id].nome} às ${hora(a.rodadas[0])}`).join(' · ')}</div>}
      {pub.fila.length > 0 && <div><div className="lbl">Fila de interceptação</div><div className="queue">{pub.fila.slice(-4).map((x:Any) => <div className="q" key={x.n}><b>#{x.n}</b><span>{x.tipo} · rodada {x.rodada}</span>
        <em className={x.decifrada ? 'ok' : x.expirada ? 'exp' : 'live'}>{x.decifrada ? 'decifrada' : x.expirada ? 'perdida' : `${3 - (pub.round - x.rodada)} rod.`}</em></div>)}</div></div>}
      <div className="lbl">Acontecimentos</div>
      <div className="feed">{avisos.map((a:Any) => <div key={a.id} className={a.tom}>{a.texto}</div>)}</div>
      {error && <div className="err">{error}</div>}
      <button className="btn sec" style={{minHeight: 36, padding: '6px 10px', fontSize: 13}} onClick={() => send('pularTempo')}>Pular tempo desta fase</button>
    </aside>
    <div className="tv-bottom">
      <div style={{display: 'grid', gap: 8}}>
        <div><div className="lbl">Exposição do espião{pub.espiao?.perfil ? ` · ${CARTAS.perfis_espiao.find((p:Any) => p.id === pub.espiao.perfil)?.nome}` : ''}</div>
          <div className="expo-bar">{Array.from({length: 10}, (_, i) => <i key={i} className={(i < (pub.espiao?.exposicao ?? 0) ? 'on' : '') + (i >= 6 ? ' hi' : '')}/>)}</div></div>
        <div><div className="lbl">Detetives · pontos na rodada</div><div className="cops">{pub.dets.map((d:Any, i:number) => <div key={i} className={'cop' + (d.encerrou ? ' done' : '')}><b>{PAPEL[d.papel].letra}</b><span className="pa">{d.encerrou ? 'jogou' : d.rolou ? `${d.pa} pts` : '—'}</span></div>)}</div></div>
      </div>
      <div><div className="lbl">Bilhetes do espião · como ele se moveu</div>
        <div className="tickets">{Array.from({length: 24}, (_, k) => { const r = k + 1; const ts = pub.bilhetes.filter((b:Any) => b.rodada === r);
          return <div key={r} className={'tk' + ([3, 8, 13, 18, 23].includes(r) ? ' rev' : '') + (Object.values(JAN).some(([a, b]) => r >= a && r <= b) ? ' win' : '') + (r === pub.round ? ' now' : '')}>
            <small>{hora(r)}</small><span>{ts.map((b:Any) => TICKET[b.modo]).join('+')}</span></div>; })}</div></div>
    </div>
  </main>;
}

// ------------------------------------------------------------------ celular
function Celular({code}:{code:string}) {
  const [token, setToken] = useState(store.get('sombra:p:' + code)); const [name, setName] = useState(store.get('sombra:nome') ?? ''); const [err, setErr] = useState('');
  const mesa = useMesa(code, token);
  if (!token) return <main className="home"><form className="home-card box" onSubmit={async e => { e.preventDefault(); setErr('');
    try { const j = await call({type: 'join', code, name}); store.set('sombra:p:' + code, j.token); store.set('sombra:nome', name); setToken(j.token); } catch (x) { setErr((x as Error).message); } }}>
    <div className="eyebrow">Mesa {code}</div><h2>Como te chamam?</h2>
    <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={18} placeholder="Seu apelido" autoFocus/>
    <button className="btn">Entrar</button>{err && <div className="err">{err}</div>}</form></main>;
  const g = mesa.game;
  if (!g) return <main className="home"><div className="waiting"><b>Conectando…</b>{mesa.error && <><div className="err">{mesa.error}</div><button className="btn sec" onClick={() => { store.del('sombra:p:' + code); setToken(null); }}>Entrar de novo</button></>}</div></main>;
  const me = g.me; const pub = g.pub;
  if (pub.phase === 'lobby') return <main className="phone"><div className="ph-body"><div className="waiting"><b>Você está na mesa, {me.name}.</b><span>Olhe para a TV. Quando todos entrarem, ela sorteia o espião e a partida começa.</span>
    <div className="plist" style={{textAlign: 'left'}}>{pub.players.map((p:Any) => <div className="pl" key={p.id}>{p.name}{pub.espiaoEscolhido === p.id ? ' · espião' : ''}</div>)}</div></div></div></main>;
  if (me.side === 'espiao') return <Espiao g={g} mesa={mesa}/>;
  return <Detetive g={g} mesa={mesa}/>;
}
function Fim({pub, voce}:{pub:Any;voce:string}) {
  const ganhou = (pub.winner === 'espiao') === (voce === 'espiao');
  return <div className="waiting"><b style={{color: ganhou ? 'var(--good)' : 'var(--hot)'}}>{ganhou ? 'Vitória!' : 'Derrota'}</b><span>{pub.motivo}</span><span>A fuga era por {nm(pub.final.plano.extracao)}, janela {pub.final.plano.janela}. Veja a rota completa na TV.</span></div>;
}
function Feed({avisos}:{avisos:Any[]}) { return <div className="feed" style={{gap: 6}}>{[...avisos].reverse().slice(0, 8).map((a:Any) => <div key={a.id} className={a.tom}>{a.texto}</div>)}</div>; }

// --- espião
function Espiao({g, mesa}:{g:Any;mesa:Any}) {
  const pub = g.pub, s = g.espiao, send = mesa.send;
  const [aba, setAba] = useState('jogar'); const [verMapa, setVerMapa] = useState(false); const [alvo, setAlvo] = useState<number|null>(null);
  const [perfil, setPerfil] = useState('sombra'); const [inicio, setInicio] = useState<number|null>(null);
  const [caderno, setCaderno] = useState<Record<string, string>>(() => { try { return JSON.parse(store.get('sombra:caderno:' + pub.code) || '{}'); } catch { return {}; } });
  useEffect(() => store.set('sombra:caderno:' + pub.code, JSON.stringify(caderno)), [caderno]);
  useEffect(() => setAlvo(null), [pub.round, s.moveu]);
  const minhaVez = pub.phase === 'espiao' && !s.agiu;
  // todas as formas de chegar em cada lugar
  const porLugar: Record<number, {modo:string;custo:number;risco:number;linha?:string}[]> = {};
  if (s.opcoes && s.movimentos > 0) for (const m of Object.keys(s.opcoes)) for (const d of s.opcoes[m]) (porLugar[d.local] ??= []).push({modo: m, ...d});
  const destinos = Object.keys(porLugar).map(Number);
  const rotulos = Object.fromEntries(destinos.filter(l => l !== s.loc).map(l => { const r = Math.min(...porLugar[l].map(x => x.risco)); return [l, r + '%']; }));
  const esc = s.opcoes?.esconder?.[0];
  let corpo: React.ReactNode;
  if (pub.phase === 'fim') corpo = <Fim pub={pub} voce="espiao"/>;
  else if (pub.phase === 'preparo') corpo = <>
    <div className="ajuda"><b>Você é o ESPIÃO.</b> Ninguém sabe onde você está. Recolha envelopes com pistas para descobrir <b>onde</b> e <b>quando</b> é a sua fuga, chegue lá na hora certa e declare a <b>Hora H</b>. Se um detetive te abordar, você perde.</div>
    <h2>1. Escolha seu estilo</h2>
    {CARTAS.perfis_espiao.map((p:Any) => <button key={p.id} className={'act' + (perfil === p.id ? ' sel' : '')} onClick={() => setPerfil(p.id)}><div><b>{p.nome}</b><small>{p.texto}</small></div></button>)}
    <h2>2. Onde você começa?</h2>
    {s.opcoesInicio.map((l:number) => <button key={l} className={'act' + (inicio === l ? ' sel' : '')} onClick={() => setInicio(l)}><div>{nm(l)}<small>{ZONAS[(LOCAIS as Any)[l].zona]}</small></div></button>)}
    <button className="btn enorme" disabled={!inicio} onClick={() => send('preparar', {perfil, local: inicio})}>Começar a fuga</button></>;
  else if (aba === 'jogar') corpo = !minhaVez ? <>
      <Turno pub={pub} meuId={g.me.id}/>
      <div className="ajuda">Na sua vez você: <b>1)</b> escolhe para onde ir no mapa, <b>2)</b> faz uma ação no lugar onde chegou. Os detetives só veem <b>como</b> você se moveu (a pé, ônibus…), nunca <b>para onde</b>.</div>
      <Feed avisos={[...pub.avisos.slice(-5), ...s.avisos.slice(-3)]}/></> : <>
    <div className="turno minha"><div><b>SUA VEZ</b><small>Você está em {nm(s.loc)} · R$ {s.dinheiro}</small></div><Tempo deadline={pub.deadline} offset={mesa.offset}/></div>
    {s.opcoes && s.movimentos > 0 && <>
      <div className="lbl">{s.moveu ? 'Movimento extra (opcional)' : 'Passo 1: para onde você vai?'}</div>
      {!verMapa ? <button className="btn sec" onClick={() => setVerMapa(true)}>👁 Mostrar meu mapa (cuidado com quem está olhando)</button> : <>
        <div className="mini-map" style={{height: '50vh'}}><Board pub={pub} extra={{espiao: s.loc, destaques: destinos, rotulos, selecionado: alvo ?? undefined}} view={minBox(bboxOf([s.loc], 2600), 7000, 9000)} onSelect={id => porLugar[id] && setAlvo(id)}/></div>
        <small className="muted">Toque num lugar aceso. O número é a chance de alguém te denunciar lá.</small>
        <button className="btn sec" onClick={() => setVerMapa(false)}>Esconder mapa</button></>}
      {alvo != null && porLugar[alvo] && <div className="sheet"><b>{alvo === s.loc ? 'Ficar aqui' : `Ir para ${nm(alvo)}`}</b>
        {porLugar[alvo].map(o => <button key={o.modo + (o.linha ?? '')} className="act" onClick={() => send('mover', {modo: o.modo, local: alvo})}>
          <div>{MODO[o.modo]}{o.linha ? ` (linha ${o.linha})` : ''}<small>{o.custo ? `R$ ${o.custo}` : 'grátis'} · risco {o.risco}%</small></div></button>)}
        <button className="btn sec" onClick={() => setAlvo(null)}>Cancelar</button></div>}
      {esc && <button className="act" onClick={() => send('mover', {modo: 'esconder', local: s.loc})}><div>Ficar escondido onde estou<small>risco {esc.risco}%</small></div></button>}
      <details><summary className="muted">Ver lista de lugares</summary><div style={{display: 'grid', gap: 6, marginTop: 8}}>
        {destinos.filter(l => l !== s.loc).sort((a, b) => nm(a).localeCompare(nm(b))).map(l => <button key={l} className="act" onClick={() => setAlvo(l)}><span>{nm(l)}</span><small>{porLugar[l].map(o => MODO[o.modo]).join(', ')}</small></button>)}</div></details>
    </>}
    {s.acoes && <><div className="lbl">Passo 2: o que fazer em {nm(s.loc)}?</div>
      {s.acoes.filter((a:Any) => a.ok).map((a:Any) => <button key={a.acao} className={'act' + (a.acao === 'horaH' ? ' sel' : '')} onClick={() => { if (a.acao !== 'horaH' || confirm('Declarar a Hora H aqui e agora? Se o lugar ou a hora estiverem errados, você perde uma senha e é revelado.')) send('agir', {acao: a.acao}); }}>
        <div>{ACAO_ESPIAO[a.acao][0]}<small>{ACAO_ESPIAO[a.acao][1]}</small></div>{a.custo ? <span className="risk">R$ {a.custo}</span> : null}</button>)}</>}
  </>;
  else if (aba === 'pistas') corpo = <>
    {s.planoB && <div className="card" style={{borderColor: 'var(--hot)'}}><div className="lbl">Plano B da rede</div>Fuga por <b>{nm(s.planoB.extracao)}</b>, janela {s.planoB.janela} ({JTXT[s.planoB.janela]}).</div>}
    {s.remarcada && !s.planoB && <div className="card" style={{borderColor: 'var(--amber)'}}><div className="lbl">Fuga remarcada</div>A rede remarcou para a janela {s.remarcada} ({JTXT[s.remarcada]}), no mesmo lugar.</div>}
    <div className="ajuda">Cada pista elimina lugares ou horários. Marque aqui o que já descartou (✗). Sobrando 1 lugar e 1 horário, vá até lá e declare a <b>Hora H</b>.</div>
    <Grade marcas={caderno} marcar={(k, v) => setCaderno(c => ({...c, [k]: v}))}/>
    <div className="lbl">Suas pistas</div>{s.pistas.length ? s.pistas.map((p:Any, i:number) => <div key={i} className="pista"><b>{p.tipo}</b>{p.texto}</div>) : <div className="muted">Nenhuma ainda. Vá até um ponto de contato (envelope no mapa) e escolha "Recolher envelope".</div>}
    <div className="lbl">Pontos de contato com envelope</div>{s.contatos.map((c:Any) => <div key={c.local} className="act" style={{minHeight: 40}}><span>{nm(c.local)}</span><small>{c.status === 'fechado' ? 'esperando você' : c.status === 'caiu' ? 'caiu' : 'recolhido'}</small></div>)}</>;
  else corpo = <>
    <div className="grid2"><div className="card"><div className="lbl">Dinheiro</div><b style={{fontSize: 26}}>R$ {s.dinheiro}</b></div><div className="card"><div className="lbl">Senhas</div><b style={{fontSize: 26}}>{s.credenciais}</b></div></div>
    <div className="card"><div className="lbl">Onde você está</div>{nm(s.loc)} · chance de denúncia {s.aqui.risco}%{s.disfarce ? ` · disfarçado por ${s.disfarce} rodada(s)` : ''}</div>
    <div className="lbl">Avisos só para você</div><Feed avisos={s.avisos}/></>;
  return <main className="phone spy">
    <div className="ph-top"><div className="row"><b style={{color: '#d8c9a3'}}>Você é o espião</b><span style={{font: '500 13px var(--f-mono)'}}>R$ {s.dinheiro} · {s.credenciais} senha{s.credenciais === 1 ? '' : 's'}</span></div>
      <span className="eyebrow" style={{color: '#6d6555'}}>{pub.phase === 'preparo' ? 'Preparação' : `${hora(pub.round)} · rodada ${pub.round} de 24`}</span></div>
    <div className="ph-body">{corpo}{mesa.error && <div className="err">{mesa.error}</div>}</div>
    {pub.phase !== 'preparo' && <nav className="ph-tabs" style={{gridTemplateColumns: 'repeat(3,1fr)'}}>{[['jogar', 'Jogar'], ['pistas', 'Pistas'], ['bolso', 'Bolso']].map(([k, t]) => <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{t}</button>)}</nav>}
  </main>;
}
function Turno({pub, meuId}:{pub:Any;meuId:string}) {
  const q = quemJoga(pub); const v = dadoAgora(pub);
  if (!q) return <div className="turno"><div><b>{pub.phase === 'fim' ? 'Fim de jogo' : 'Aguarde'}</b></div></div>;
  const eu = pub.players.find((p:Any) => p.id === meuId)?.name === q.nome;
  return <div className={'turno' + (eu ? ' minha' : '')}><div><b>{eu ? 'SUA VEZ' : `Vez de ${q.nome}`}</b><small>{q.papel}{v ? ` · tirou ${v} no dado` : q.espiao ? ' · movendo em segredo' : ' · vai rolar o dado'}</small></div>{v ? <Dado valor={v}/> : null}</div>;
}

// --- detetive
function Detetive({g, mesa}:{g:Any;mesa:Any}) {
  const pub = g.pub, eq = g.equipe, send = mesa.send, me = g.me;
  const [aba, setAba] = useState('jogar'); const [alvo, setAlvo] = useState<number|null>(null); const [sub, setSub] = useState<string|null>(null);
  const [msg, setMsg] = useState(''); const [ext, setExt] = useState<number|null>(null); const [jan, setJan] = useState<string|null>(null);
  const vez = pub.vez; const det = vez != null ? pub.dets[vez] : null;
  const minhaVez = pub.phase === 'detetives' && det && det.owner === me.id;
  const op = eq?.meus?.[0];
  useEffect(() => { setAlvo(null); setSub(null); }, [vez, pub.round, det?.loc]);
  const fazer = (acao:string, extra:Any = {}) => send('det', {i: vez, acao, ...extra}).then((ok:boolean) => { if (ok) { setSub(null); setAlvo(null); } });
  const meusIdx = pub.dets.map((d:Any, i:number) => d.owner === me.id ? i : -1).filter((i:number) => i >= 0);
  const avisos = [...pub.avisos, ...(eq?.avisos ?? [])].sort((a:Any, b:Any) => a.id - b.id);
  const rotulos = op ? Object.fromEntries(op.mover.map((m:Any) => [m.local, String(m.custo)])) : {};
  const moverPara = (id:number) => op?.mover.find((m:Any) => m.local === id);
  let corpo: React.ReactNode;
  if (pub.phase === 'fim') corpo = <Fim pub={pub} voce="detetive"/>;
  else if (aba === 'jogar') corpo = !minhaVez ? <>
      <Turno pub={pub} meuId={me.id}/>
      <div className="ajuda"><b>Você é DETETIVE</b> ({meusIdx.map((i:number) => PAPEL[pub.dets[i].papel].nome).join(' e ')}). Na sua vez: <b>role o dado</b>, o número é quantos pontos você tem. Gaste andando pelo mapa e fazendo ações. Para prender o espião, esteja no mesmo lugar que ele e use <b>Abordar</b>.</div>
      <div className="mini-map" style={{height: '38vh'}}><Board pub={pub} extra={{meus: meusIdx}} view={minBox(bboxOf(pub.dets.map((d:Any) => d.loc), 2500), 9000, 9000)}/></div>
      <Feed avisos={avisos}/></> : !det.rolou ? <>
    <div className="turno minha"><div><b>SUA VEZ</b><small>{PAPEL[det.papel].nome} em {nm(det.loc)}</small></div><Tempo deadline={pub.deadline} offset={mesa.offset}/></div>
    <button className="btn enorme" onClick={() => send('rolar', {i: vez})}>🎲 Rolar o dado</button>
    <div className="ajuda">O número que cair é quantos pontos você tem para gastar nesta rodada. Todo mundo vê o resultado na TV.</div></> : <>
    <div className="turno minha"><div><b>{PAPEL[det.papel].nome} · {nm(det.loc)}</b><small>Tirou {pub.dado?.valor} no dado</small></div><Tempo deadline={pub.deadline} offset={mesa.offset}/></div>
    <div className="pontos">Você tem {det.pa} ponto{det.pa === 1 ? '' : 's'} {Array.from({length: Math.max(det.pa, 1)}, (_, i) => <i key={i} className={i < det.pa ? '' : 'off'}/>)}</div>
    <div className="lbl">Andar: toque num lugar aceso (o número é o custo em pontos)</div>
    <div className="mini-map" style={{height: '46vh'}}><Board pub={pub} extra={{meus: meusIdx, destaques: op?.mover.map((m:Any) => m.local) ?? [], rotulos, selecionado: alvo ?? undefined}}
      view={minBox(bboxOf([det.loc], 2600), 8000, 9000)} onSelect={id => moverPara(id) && setAlvo(id)}/></div>
    {alvo != null && moverPara(alvo) && <div className="sheet"><b>Ir para {nm(alvo)}</b>
      <button className="btn blue" onClick={() => fazer('mover', {local: alvo})}>{MODO[moverPara(alvo).modo]} · {moverPara(alvo).custo} ponto{moverPara(alvo).custo === 1 ? '' : 's'}</button>
      <button className="btn sec" onClick={() => setAlvo(null)}>Cancelar</button></div>}
    <div className="lbl">Fazer aqui em {nm(det.loc)}</div>
    {op?.acoes.filter((a:Any) => a.ok).map((a:Any) => <React.Fragment key={a.acao}>
      <button className={'act' + (sub === a.acao ? ' sel' : '')} onClick={() => ['interceptar', 'comprar', 'usar', 'transferir', 'acusar'].includes(a.acao) ? setSub(sub === a.acao ? null : a.acao) : fazer(a.acao)}>
        <div>{ACAO[a.acao][0]}<small>{ACAO[a.acao][1]}</small></div><span className="cost">{a.custo} pt{a.custo === 1 ? '' : 's'}</span></button>
      {sub === a.acao && a.acao === 'interceptar' && a.alvos.map((t:Any) => <button key={t.n} className="act" onClick={() => fazer('interceptar', {n: t.n})}><span>Mensagem {t.texto.split(' · ')[0]}</span><span className="cost">{t.texto.split(' · ').slice(1).join(' · ')}</span></button>)}
      {sub === a.acao && a.acao === 'comprar' && a.alvos.map((t:Any) => <button key={t.item} className="act" disabled={t.custo > eq.orcamento} onClick={() => fazer('comprar', {item: t.item})}><div>{t.texto}<small>{ITENS[t.item].texto}</small></div><span className="cost">{t.custo} créd.</span></button>)}
      {sub === a.acao && a.acao === 'usar' && <UsarItem alvos={a.alvos} det={det} fazer={fazer}/>}
      {sub === a.acao && a.acao === 'transferir' && <div className="chips">{pub.dets.map((d:Any, i:number) => i !== vez && <button key={i} className="chip" onClick={() => fazer('transferir', {alvo: i})}>{PAPEL[d.papel].nome} ({d.dono})</button>)}</div>}
      {sub === a.acao && a.acao === 'acusar' && <div className="card" style={{display: 'grid', gap: 8}}>
        <div className="chips">{EXTRACOES.map(e => <button key={e} className={'chip' + (ext === e ? ' on' : '')} onClick={() => setExt(e)}>{nm(e)}</button>)}</div>
        <div className="chips">{Object.keys(JAN).map(j => <button key={j} className={'chip' + (jan === j ? ' on' : '')} onClick={() => setJan(j)}>{j} · {JTXT[j]}</button>)}</div>
        <button className="btn" disabled={!ext || !jan} onClick={() => fazer('acusar', {extracao: ext, janela: jan})}>Acusar: {ext ? nm(ext) : '?'}, janela {jan ?? '?'}</button></div>}
    </React.Fragment>)}
    <button className="btn enorme blue" onClick={() => send('encerrar', {})}>Terminar minha vez</button>
    <Feed avisos={avisos}/></>;
  else if (aba === 'pistas') corpo = <><div className="ajuda">O espião foge por 1 de 6 lugares, em 1 de 4 horários. Marque o que o time já descartou. Estas marcações aparecem só nos celulares dos detetives.</div>
    <Grade marcas={eq?.dossie ?? {}} marcar={(k, v) => send('dossie', {chave: k, valor: v})}/>
    <div className="lbl">Pistas da força-tarefa · orçamento {eq?.orcamento ?? 0} créditos</div>
    {eq?.pistas.length ? eq.pistas.map((p:Any, i:number) => <div key={i} className="pista"><b>{p.tipo} · {p.fonte}{p.zona ? ` · zona ${ZONAS[p.zona]}` : ''}{p.duvidosa ? ' · ⚠ duvidosa' : ''}</b>{p.texto}</div>) : <div className="muted">Nada ainda. Vasculhe pontos de contato (envelope no mapa) e intercepte mensagens no Palácio da Polícia.</div>}
    <div className="lbl">Possíveis pontos de contato (só 8 têm envelope)</div>{eq?.contatos.map((c:Any) => <div key={c.local} className="act" style={{minHeight: 40}}><span>{nm(c.local)}</span><small>{({desconhecido: 'não vistoriado', vazio: 'vazio', retirado: 'já retirado', lido: 'lido', confiscado: 'confiscado'} as Any)[c.situacao]}{c.grampo ? ' · grampo' : ''}</small></div>)}</>;
  else corpo = <><form style={{display: 'flex', gap: 8}} onSubmit={e => { e.preventDefault(); if (msg.trim()) { send('chat', {texto: msg}); setMsg(''); } }}>
      <input className="input" value={msg} onChange={e => setMsg(e.target.value)} placeholder="Mensagem para o time" maxLength={200}/><button className="btn blue">Enviar</button></form>
    <div className="chat">{[...(eq?.chat ?? [])].reverse().map((m:Any, i:number) => <div key={i} className="msg"><b>{m.autor}:</b> {m.texto}</div>)}</div>
    <div className="lbl">Quem está jogando</div><Jogadores pub={pub}/></>;
  return <main className="phone">
    <div className="ph-top"><div className="row"><b>Você é detetive</b><span className="eyebrow">{hora(pub.round)} · rodada {pub.round} de 24</span></div></div>
    <div className="ph-body">{corpo}{mesa.error && <div className="err">{mesa.error}</div>}</div>
    <nav className="ph-tabs" style={{gridTemplateColumns: 'repeat(3,1fr)'}}>{[['jogar', 'Jogar'], ['pistas', 'Pistas'], ['time', 'Time']].map(([k, t]) => <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{t}</button>)}</nav>
  </main>;
}

function Grade({marcas, marcar}:{marcas:Record<string, string>;marcar:(k:string, v:string)=>void}) {
  const prox: Record<string, string> = {'': 'x', x: 'q', q: 'v', v: ''}; const sim: Record<string, string> = {x: '✗', q: '?', v: '✓'};
  return <div className="dossie"><div/>{Object.keys(JAN).map(j => <div key={j}><b>{j}</b><br/><small>{JTXT[j]}</small></div>)}
    {EXTRACOES.map(e => <React.Fragment key={e}><div style={{textAlign: 'left'}}>{nm(e)}</div>
      {Object.keys(JAN).map(j => { const k = `${e}:${j}`; const v = marcas[k] ?? ''; return <button key={k} className={v} onClick={() => marcar(k, prox[v])} aria-label={`${nm(e)} janela ${j}`}>{sim[v] ?? ''}</button>; })}</React.Fragment>)}</div>;
}

function UsarItem({alvos, det, fazer}:{alvos:Any[];det:Any;fazer:Any}) {
  const [item, setItem] = useState<string|null>(null); const [local, setLocal] = useState<number|''>(''); const [zona, setZona] = useState(Object.keys(ZONAS)[0]);
  const precisaZona = ['retrato', 'ceic'].includes(item ?? ''); const precisaLocal = ['drone', 'helicoptero', 'cones'].includes(item ?? '');
  const locais = item === 'cones' ? (LOCAIS as Any)[det.loc] && Object.values(LOCAIS as Any).filter((n:Any) => n.id !== det.loc) : Object.values(LOCAIS as Any);
  return <div className="card" style={{display: 'grid', gap: 8}}>
    <div className="chips">{alvos.map((a:Any) => <button key={a.item} className={'chip' + (item === a.item ? ' on' : '')} onClick={() => setItem(a.item)}>{a.texto}</button>)}</div>
    {item && <small className="muted">{ITENS[item].texto}</small>}
    {precisaZona && <select className="input" value={zona} onChange={e => setZona(e.target.value)}>{Object.entries(ZONAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
    {precisaLocal && <select className="input" value={local} onChange={e => setLocal(Number(e.target.value))}><option value="">Escolha o local</option>
      {(locais as Any[]).sort((a, b) => a.curto.localeCompare(b.curto)).map((n:Any) => <option key={n.id} value={n.id}>{n.curto}</option>)}</select>}
    <button className="btn blue" disabled={!item || (precisaLocal && !local)} onClick={() => fazer('usar', {item, zona, local: local || undefined})}>Usar</button>
  </div>;
}

// ------------------------------------------------------------------ rotas
function App() {
  const q = new URLSearchParams(location.search);
  const tv = q.get('tv'), m = q.get('m');
  if (tv && /^[A-Z2-9]{5}$/.test(tv)) return <TV code={tv}/>;
  if (m && /^[A-Za-z2-9]{5}$/.test(m)) return <Celular code={m.toUpperCase()}/>;
  return <Home/>;
}
void LC;
createRoot(document.getElementById('root')!).render(<App/>);
