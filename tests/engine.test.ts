import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,addPlayer,act,view,card,tick,speaker,type Game} from '../src/engine.ts';
import {cards,cases,categories} from '../src/content.ts';
function setup(n=3){
 const tokens=Array.from({length:n},(_,i)=>String(i+1).repeat(64));
 const g=createGame('ABCDE','Jogador 1',tokens[0]);
 for(let i=1;i<n;i++)addPlayer(g,'Jogador '+(i+1),tokens[i]);
 act(g,tokens[0],{type:'start'});
 const token=(id:string)=>tokens[g.players.findIndex(p=>p.id===id)];
 const judge=()=>token(g.players.find(p=>p.role==='juiz')?.id||speaker(g).id);
 return {g,tokens,token,judge};
}
function begin(g:Game,j:string,now=Date.now()){
 const s=speaker(g),token=String(g.players.findIndex(p=>p.id===s.id)+1).repeat(64);
 act(g,token,{type:'prepared'},now);act(g,j,{type:'begin'},now);
}
function hand(g:Game,id:string,...ids:string[]){g.players.find(p=>p.id===id)!.hand=ids;}
function close(g:Game,j:string){act(g,j,{type:'end'});act(g,j,{type:'nextTurn'});}

test('800 cartas, 100 por categoria e 60 contextos próprios',()=>{
 assert.equal(cards.length,800);for(const c of categories)assert.equal(cards.filter(x=>x.type===c).length,100);
 assert.equal(new Set(cards.map(c=>c.name)).size,800);assert.equal(cases.length,60);
 assert.equal(new Set(cases.map(c=>c.context)).size,60);
 for(const c of cases){assert.ok(c.context.length>170);assert.ok(!c.context.includes('Cabe a vocês conectar'));assert.ok(!c.context.startsWith('O fato ocorreu'));}
 assert.ok(cases[0].context.includes('pipa'));assert.ok(cases[1].context.includes('alface')||cases[1].context.includes('Alface'));
 for(const c of cards){for(const key of ['name','text','effect','target','timing','duration','visibility'])assert.ok(c[key as keyof typeof c]);assert.ok(c.timing.includes('preparação'));}
});
test('mãos privadas, sem segredos de sessão expostos',()=>{
 const {g,tokens}=setup();for(const t of tokens){const v=view(g,t);assert.equal(v.me.secret,undefined);assert.ok(v.players.every(p=>!('hand'in p)&&!('secret'in p)));assert.ok(!JSON.stringify(v).includes(g.players[0].secret));}
});
test('cartas e troca apenas na preparação, com limite de 2 ações e 1 troca',()=>{
 const {g,token,judge}=setup();const p=speaker(g);hand(g,p.id,'0-1','0-2','0-3','0-4');
 assert.throws(()=>act(g,token(p.id),{type:'begin'}));
 for(const c of ['0-1','0-2'])act(g,token(p.id),{type:'play',card:c});
 assert.throws(()=>act(g,token(p.id),{type:'play',card:'0-3'}));
 act(g,token(p.id),{type:'swap',card:'0-3'});
 assert.throws(()=>act(g,token(p.id),{type:'swap',card:p.hand[0]}));
 begin(g,judge());assert.throws(()=>act(g,token(p.id),{type:'play',card:p.hand[0]}));assert.throws(()=>act(g,token(p.id),{type:'swap',card:p.hand[0]}));
});
test('juiz precisa aguardar confirmação; confirmar bloqueia cartas e troca',()=>{
 const {g,token,judge}=setup();const p=speaker(g);
 assert.throws(()=>act(g,judge(),{type:'begin'}),/confirmar/);
 assert.throws(()=>act(g,judge(),{type:'prepared'}));
 act(g,token(p.id),{type:'prepared'});
 assert.equal(view(g,judge()).players.find(q=>q.id===p.id)!.prepared,true);
 assert.throws(()=>act(g,token(p.id),{type:'play',card:p.hand[0]}));assert.throws(()=>act(g,token(p.id),{type:'swap',card:p.hand[0]}));
 act(g,judge(),{type:'begin'});assert.equal(g.phase,'speaking');
});
test('nenhuma mão renova entre acusação e defesa; ambas renovam após o par',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;
 const originalA=[...a.hand],originalD=[...d.hand];const played=a.hand.find(id=>card(id).effect==='present');
 if(played)act(g,token(a.id),{type:'play',card:played});const remainder=[...a.hand];
 begin(g,judge());act(g,judge(),{type:'end'});assert.deepEqual(a.hand,remainder);assert.deepEqual(d.hand,originalD);
 act(g,judge(),{type:'nextTurn'});assert.equal(g.turn,1);assert.deepEqual(a.hand,remainder);assert.deepEqual(d.hand,originalD);
 begin(g,judge());act(g,judge(),{type:'end'});assert.deepEqual(a.hand,remainder);assert.deepEqual(d.hand,originalD);
 act(g,judge(),{type:'nextTurn'});assert.equal(g.turn,2);assert.equal(a.hand.length,4);assert.equal(d.hand.length,4);assert.notDeepEqual(a.hand,originalA);assert.notDeepEqual(d.hand,originalD);assert.equal(a.prepared,false);assert.equal(d.swapped,false);
});
test('avaliação da defesa termina antes de renovar ambas as mãos',()=>{
 const {g,token,judge}=setup();begin(g,judge());close(g,judge());const d=speaker(g),a=g.players.find(p=>p.role==='acusação')!;
 hand(g,d.id,'6-14','0-0');act(g,token(d.id),{type:'play',card:'6-14'});const aHand=[...a.hand],dHand=[...d.hand];begin(g,judge());act(g,judge(),{type:'end'});
 assert.throws(()=>act(g,judge(),{type:'nextTurn'}));assert.deepEqual(a.hand,aHand);assert.deepEqual(d.hand,dHand);
 act(g,judge(),{type:'review',effect:g.effects[0].id,passed:true});assert.deepEqual(d.hand,dHand);
 act(g,judge(),{type:'nextTurn'});assert.equal(a.hand.length,4);assert.equal(d.hand.length,4);assert.notDeepEqual(a.hand,aHand);
});
test('BLEFE só durante a fala, pausa e retoma exatamente o tempo restante',()=>{
 const {g,token,judge}=setup();const p=speaker(g),o=g.players.find(x=>x.role==='defesa')!;hand(g,p.id,'0-0');
 act(g,token(p.id),{type:'play',card:'0-0'},500);const pres=g.presentations[0];
 assert.equal((view(g,token(o.id)).presentations[0].card as any).text,undefined);
 assert.throws(()=>act(g,token(o.id),{type:'bluff',presentation:pres.id},700));
 begin(g,judge(),1000);act(g,token(o.id),{type:'bluff',presentation:pres.id},11000);assert.equal(g.remaining,50000);assert.equal(g.deadline,null);
 assert.equal((view(g,token(o.id)).presentations[0].card as any).text,card('0-0').text);
 act(g,judge(),{type:'judgeBluff',lied:true},31000);assert.equal(g.deadline,81000);assert.equal(p.shame,1);
 assert.throws(()=>act(g,token(o.id),{type:'bluff',presentation:pres.id},32000));
});
test('corrupção privada preparada antes da fala; denúncia ignora o próprio envio',()=>{
 const {g,token,judge}=setup();const p=speaker(g),o=g.players.find(x=>x.role==='defesa')!;hand(g,p.id,'3-0');
 const before=g.logs.length;act(g,token(p.id),{type:'play',card:'3-0'},500);assert.equal(g.logs.length,before);
 assert.equal(view(g,token(o.id)).effects.length,0);assert.equal(view(g,judge()).effects.length,1);
 begin(g,judge(),1000);act(g,token(p.id),{type:'denounce'},3000);assert.equal(p.penalty,1);
 act(g,token(o.id),{type:'denounce'},4000);assert.equal(o.score,2);assert.equal(g.effects[0].status,'cancelled');assert.throws(()=>act(g,token(o.id),{type:'denounce'},5000));
});
test('instrução de sabotagem fala com a pessoa certa e juiz só recebe ao final da fala dela',()=>{
 const {g,token,judge}=setup(4);const a=speaker(g),d=g.players.find(x=>x.role==='defesa')!,juror=g.players.find(x=>x.role==='jurado')!;
 hand(g,a.id,'2-50');act(g,token(a.id),{type:'play',card:'2-50'});
 const incoming=view(g,token(d.id)).effects[0];assert.match(incoming.instruction,/Na sua próxima fala, encene uma aula de zumba\. Encerre com um slogan\./);
 assert.ok(!incoming.card.text.includes('o adversário deve'));assert.equal(view(g,judge()).effects.length,0);assert.equal(view(g,token(juror.id)).effects.length,0);
 assert.ok(!JSON.stringify(view(g,judge())).includes('aula de zumba'));
 begin(g,judge());act(g,judge(),{type:'end'});assert.equal(view(g,judge()).effects.length,0);act(g,judge(),{type:'nextTurn'});
 assert.equal(view(g,judge()).effects.length,0);begin(g,judge());assert.equal(view(g,judge()).effects.length,0);
 assert.match(view(g,token(d.id)).effects[0].instruction,/Nesta fala, encene/);
 act(g,judge(),{type:'end'});const evaluation=view(g,judge()).effects[0];assert.ok(evaluation.instruction.includes(d.name));assert.ok(evaluation.instruction.includes('encenar uma aula de zumba'));assert.equal(evaluation.target,d.id);
 act(g,judge(),{type:'review',effect:evaluation.id,passed:true});assert.equal(d.score,1);
});
test('desafio próprio oculto ao juiz até a revisão; corrupção força decisão prevista',()=>{
 const {g,token,judge}=setup();const p=speaker(g);hand(g,p.id,'6-0','3-1');
 act(g,token(p.id),{type:'play',card:'6-0'});act(g,token(p.id),{type:'play',card:'3-1'});
 assert.ok(!view(g,judge()).effects.some(e=>e.kind==='challengeSelf'));
 begin(g,judge());assert.ok(!view(g,judge()).effects.some(e=>e.kind==='challengeSelf'));
 act(g,judge(),{type:'end'});assert.throws(()=>act(g,judge(),{type:'nextTurn'}));assert.throws(()=>act(g,judge(),{type:'review',effect:g.effects[0].id,passed:false}),/bloqueada/);act(g,judge(),{type:'review',effect:g.effects[0].id,passed:true});assert.equal(p.score,1);act(g,judge(),{type:'nextTurn'});assert.equal(g.turn,1);
});
test('refutação cancela o desafio recebido antes de começar a fala',()=>{
 const {g,token,judge}=setup();const a=speaker(g);hand(g,a.id,'2-14');act(g,token(a.id),{type:'play',card:'2-14'});begin(g,judge());close(g,judge());const d=speaker(g);hand(g,d.id,'5-0');act(g,token(d.id),{type:'play',card:'5-0'});assert.equal(g.effects[0].status,'cancelled');begin(g,judge());act(g,judge(),{type:'end'});act(g,judge(),{type:'nextTurn'});
});
test('bônus de tempo na preparação não inicia o relógio e persiste até começar',()=>{
 const {g,token,judge}=setup();const p=speaker(g);hand(g,p.id,'4-75');act(g,token(p.id),{type:'play',card:'4-75'},1000);assert.equal(g.remaining,72000);assert.equal(g.deadline,null);tick(g,100000);assert.equal(g.phase,'ready');begin(g,judge(),101000);assert.equal(g.deadline,173000);
});
test('sabotagem da defesa continua válida após renovar as mãos',()=>{
 const {g,token,judge}=setup();begin(g,judge());close(g,judge());const d=speaker(g);hand(g,d.id,'2-14');act(g,token(d.id),{type:'play',card:'2-14'});begin(g,judge());close(g,judge());assert.equal(g.turn,2);const incoming=view(g,token(speaker(g).id)).effects[0];assert.equal(incoming.turn,2);assert.equal(incoming.status,'active');assert.match(incoming.instruction,/Na sua próxima fala/);assert.equal(view(g,judge()).effects.length,0);
});
test('penalidade da defesa é aplicada na sua preparação sem renovar a mão',()=>{
 const {g,token,judge}=setup();const d=g.players.find(x=>x.role==='defesa')!;const original=[...d.hand];act(g,token(d.id),{type:'denounce'});assert.equal(d.penalty,1);begin(g,judge());close(g,judge());assert.deepEqual(d.hand,original);assert.equal(d.used,1);assert.equal(d.penalty,0);
});
test('temporizador termina no servidor; fala seguinte espera nova preparação',()=>{
 const {g,judge}=setup();begin(g,judge(),1000);tick(g,61000);assert.equal(g.phase,'review');act(g,judge(),{type:'nextTurn'},62000);assert.equal(g.phase,'ready');assert.equal(g.deadline,null);assert.equal(speaker(g).prepared,false);
});
test('partida completa com rodízio e placar final',()=>{
 const {g,tokens,judge}=setup();const roles=new Map(g.players.map(p=>[p.id,new Set([p.role])]));
 for(let r=0;r<3;r++){for(let t=0;t<6;t++){begin(g,judge());close(g,judge());}assert.equal(g.phase,'verdict');act(g,judge(),{type:'vote',vote:'acusação'});assert.equal(g.phase,'result');act(g,tokens[0],{type:'nextRound'});if(r<2)for(const p of g.players)roles.get(p.id)!.add(p.role);}
 assert.equal(g.phase,'finished');for(const r of roles.values())assert.equal(r.size,3);assert.equal(g.players.reduce((a,p)=>a+p.score,0),12);
});
test('júri vota por maioria e juiz só desempata',()=>{
 const {g,token,judge}=setup(5);g.phase='verdict';const jury=g.players.filter(x=>x.role==='jurado');assert.throws(()=>act(g,judge(),{type:'vote',vote:'acusação'}));act(g,token(jury[0].id),{type:'vote',vote:'acusação'});act(g,token(jury[1].id),{type:'vote',vote:'defesa'});assert.equal(g.phase,'verdict');act(g,judge(),{type:'vote',vote:'defesa'});assert.equal(g.winner,'defesa');assert.equal(jury[1].score,1);
});
test('Duelo mantém preparação, blefe de selo e renovação por par',()=>{
 const {g,token}=setup(2);assert.ok(g.deck.every(id=>card(id).duel));const p=speaker(g),o=g.players.find(q=>q.id!==p.id)!;hand(g,p.id,'0-0');p.seals['0-0']=true;
 act(g,token(p.id),{type:'play',card:'0-0',claim:'trocado'},500);begin(g,token(p.id),1000);assert.equal(view(g,token(o.id)).presentations[0].seal,undefined);
 act(g,token(o.id),{type:'bluff',presentation:g.presentations[0].id},3000);assert.equal(p.shame,1);assert.equal(o.score,1);assert.equal(view(g,token(o.id)).presentations[0].seal,'ORIGINAL');
 const otherHand=[...o.hand];act(g,token(p.id),{type:'end'},4000);assert.deepEqual(o.hand,otherHand);assert.equal(g.phase,'ready');
 for(let t=1;t<6;t++){const sp=speaker(g);begin(g,token(sp.id),5000+t);act(g,token(sp.id),{type:'end'},6000+t);}assert.equal(g.phase,'result');
});
test('sessão não autorizada não pode agir',()=>{const {g}=setup();assert.throws(()=>view(g,'impostor'));assert.throws(()=>act(g,'impostor',{type:'start'}));});

test('evidências e testemunhas são 200 histórias diferentes; motor contém 43 efeitos',()=>{
 for(const type of ['Evidências','Testemunhas']){const pool=cards.filter(c=>c.type===type);assert.equal(new Set(pool.map(c=>c.text)).size,100);assert.equal(new Set(pool.map(c=>c.name)).size,100);}
 assert.equal(new Set(cards.map(c=>c.effect)).size,43);assert.equal(new Set(cards.map(c=>c.name)).size,800);
});
test('todas as mãos têm evidência, testemunha e dois apoios distintos, sem repetir na partida',()=>{
 for(let sample=0;sample<20;sample++){
  const {g,tokens,judge}=setup(4);const seen=new Set<string>();
  for(let r=0;r<3;r++){
   for(let t=0;t<6;t++){
    if(t%2===0)for(const p of g.players.filter(p=>['acusação','defesa'].includes(p.role))){const hand=p.hand.map(card);assert.equal(hand.filter(c=>c.type==='Evidências').length,1);assert.equal(hand.filter(c=>c.type==='Testemunhas').length,1);const support=hand.filter(c=>c.effect!=='present');assert.equal(support.length,2);assert.notEqual(support[0].family,support[1].family);assert.notEqual(support[0].type,support[1].type);for(const c of hand){assert.ok(!seen.has(c.id),`Carta repetida: ${c.id}`);seen.add(c.id);}}
    begin(g,judge());close(g,judge());
   }
   const juror=g.players.find(p=>p.role==='jurado')!;act(g,tokens[g.players.indexOf(juror)],{type:'vote',vote:'acusação'});act(g,tokens[0],{type:'nextRound'});
  }
  assert.equal(seen.size,72);
 }
});
test('trocar uma testemunha mantém a categoria e recebe pessoa inédita',()=>{
 const {g,token}=setup();const p=speaker(g),old=p.hand.find(id=>card(id).type==='Testemunhas')!;act(g,token(p.id),{type:'swap',card:old});assert.ok(!p.hand.includes(old));assert.equal(p.hand.filter(id=>card(id).type==='Testemunhas').length,1);
});
test('ordem de BLEFE nomeia favorecido, bloqueia escolha contrária e registra aplicação',()=>{
 for(const claimant of ['author','challenger']){
  const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;hand(g,a.id,'3-2','0-0');act(g,token(a.id),{type:'play',card:'3-2'});act(g,token(a.id),{type:'play',card:'0-0'});
  const order=view(g,judge()).effects[0];assert.ok(order.instruction.includes(a.name));assert.ok(!order.instruction.includes('você'));assert.equal(view(g,token(d.id)).effects.length,0);assert.equal(view(g,token(d.id)).judgeControls,undefined);
  begin(g,judge());act(g,token(d.id),{type:'bluff',presentation:g.presentations[0].id});const lock=view(g,judge()).judgeControls!.bluff!;assert.equal(lock.lied,false);assert.throws(()=>act(g,judge(),{type:'judgeBluff',lied:true}),/bloqueada/);assert.equal(g.phase,'bluff');act(g,judge(),{type:'judgeBluff',lied:false});assert.equal(g.effects[0].status,'consumed');assert.ok(g.effects[0].note?.includes(a.name));assert.match(view(g,judge()).effects[0].instruction,/Ordem cumprida/);
 }
});
test('reprovação automática identifica a tarefa do adversário e não o argumento',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;hand(g,a.id,'3-0','2-50');act(g,token(a.id),{type:'play',card:'3-0'});act(g,token(a.id),{type:'play',card:'2-50'});const order=view(g,judge()).effects.find(e=>e.kind==='forceReject')!;assert.ok(order.instruction.includes(d.name));assert.ok(order.instruction.includes('Não é reprovar o argumento'));
 begin(g,judge());close(g,judge());begin(g,judge());act(g,judge(),{type:'end'});const task=g.effects.find(e=>e.kind==='challenge')!;assert.equal(view(g,judge()).judgeControls!.reviews[task.id]!.passed,false);assert.throws(()=>act(g,judge(),{type:'review',effect:task.id,passed:true}),/bloqueada/);act(g,judge(),{type:'review',effect:task.id,passed:false});assert.equal(d.shame,1);assert.equal(g.effects.find(e=>e.kind==='forceReject')!.status,'consumed');
});
test('corrupção de testemunha ignora evidência, mas favorece autor quando ele contesta testemunha',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;hand(g,a.id,'3-5','0-0');act(g,token(a.id),{type:'play',card:'3-5'});act(g,token(a.id),{type:'play',card:'0-0'});begin(g,judge());act(g,token(d.id),{type:'bluff',presentation:g.presentations[0].id});assert.equal(view(g,judge()).judgeControls!.bluff,null);act(g,judge(),{type:'judgeBluff',lied:false});close(g,judge());hand(g,d.id,'1-0');act(g,token(d.id),{type:'play',card:'1-0'});begin(g,judge());act(g,token(a.id),{type:'bluff',presentation:g.presentations.at(-1)!.id});assert.equal(view(g,judge()).judgeControls!.bluff!.lied,true);assert.throws(()=>act(g,judge(),{type:'judgeBluff',lied:false}));act(g,judge(),{type:'judgeBluff',lied:true});assert.equal(g.effects[0].status,'consumed');
});
test('ordem mais recente tem prioridade; quantidade e cancelamento por denúncia são respeitados',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;hand(g,a.id,'3-12','0-0');act(g,token(a.id),{type:'play',card:'3-12'});act(g,token(a.id),{type:'play',card:'0-0'});begin(g,judge());act(g,token(d.id),{type:'bluff',presentation:g.presentations[0].id});act(g,judge(),{type:'judgeBluff',lied:false});assert.equal(g.effects[0].remaining,1);assert.equal(g.effects[0].status,'active');close(g,judge());d.used=0; /* Isola a prioridade das ordens; a penalidade de BLEFE é coberta separadamente. */ hand(g,d.id,'3-2','1-0');act(g,token(d.id),{type:'play',card:'3-2'});act(g,token(d.id),{type:'play',card:'1-0'});begin(g,judge());act(g,token(a.id),{type:'bluff',presentation:g.presentations.at(-1)!.id});assert.equal(view(g,judge()).judgeControls!.bluff!.lied,false);act(g,judge(),{type:'judgeBluff',lied:false});act(g,token(d.id),{type:'denounce'});assert.equal(g.effects[0].status,'cancelled');
});
test('pausa do juiz pode ser bloqueada por ordem sem bloquear BLEFE nem fim de fala',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;hand(g,a.id,'3-9','0-0');act(g,token(a.id),{type:'play',card:'3-9'});act(g,token(a.id),{type:'play',card:'0-0'});begin(g,judge());assert.equal(view(g,judge()).judgeControls!.pauseBlocked,true);assert.throws(()=>act(g,judge(),{type:'pause'}));act(g,token(d.id),{type:'bluff',presentation:g.presentations[0].id});assert.equal(g.phase,'bluff');act(g,judge(),{type:'judgeBluff',lied:false});act(g,judge(),{type:'end'});assert.equal(g.phase,'review');assert.equal(g.effects[0].status,'consumed');
});
test('sabotagens bloqueiam ações no servidor e proteção restaura a troca',()=>{
 const {g,token,judge}=setup();const a=speaker(g);const block=cards.find(c=>c.effect==='blockSwap')!;hand(g,a.id,block.id);act(g,token(a.id),{type:'play',card:block.id});begin(g,judge());close(g,judge());const d=speaker(g);assert.equal(view(g,token(d.id)).me.swapBlocked,true);assert.throws(()=>act(g,token(d.id),{type:'swap',card:d.hand[0]}));const protect=cards.find(c=>c.effect==='protectSwap')!;hand(g,d.id,protect.id,'1-0');act(g,token(d.id),{type:'play',card:protect.id});assert.equal(view(g,token(d.id)).me.swapBlocked,false);act(g,token(d.id),{type:'swap',card:'1-0'});
});
test('todos os 43 tipos de efeito executam e permitem continuar o julgamento',()=>{
 const representatives=[...new Map(cards.map(c=>[c.effect,c])).values()];
 for(const c of representatives){const {g,token,judge}=setup(4);const a=speaker(g);hand(g,a.id,c.id,...['0-1','1-1','7-0'].filter(id=>id!==c.id));act(g,token(a.id),{type:'play',card:c.id});assert.ok(Number.isFinite(g.remaining));assert.ok(a.hand.length<=5);begin(g,judge());act(g,judge(),{type:'end'});for(const task of g.effects.filter(e=>e.status==='active'&&['challenge','challengeSelf'].includes(e.kind)&&e.turn===g.turn)){const lock=view(g,judge()).judgeControls!.reviews[task.id];act(g,judge(),{type:'review',effect:task.id,passed:lock?.passed??true});}act(g,judge(),{type:'nextTurn'});assert.equal(g.phase,'ready',c.effect);}
});
test('quatro jogadores: Júri Popular abre prova, pergunta, decide e entra no rodízio',()=>{
 const {g,tokens,token,judge}=setup(4);g.rounds=4;const seenRoles=new Map(g.players.map(p=>[p.id,new Set([p.role])]));
 for(let r=0;r<4;r++){
  const a=speaker(g),jury=g.players.find(p=>p.role==='jurado')!;hand(g,a.id,'0-0','1-0');act(g,token(a.id),{type:'play',card:'0-0'});act(g,token(a.id),{type:'play',card:'1-0'});
  act(g,token(jury.id),{type:'question',text:'Quem assinou o recibo?'});assert.throws(()=>act(g,token(jury.id),{type:'question'}));act(g,token(jury.id),{type:'juryReveal',presentation:g.presentations[0].id});assert.equal(g.presentations[0].revealed,true);assert.throws(()=>act(g,token(jury.id),{type:'juryReveal',presentation:g.presentations[1].id}));
  for(let t=0;t<6;t++){begin(g,judge());close(g,judge());}
  assert.throws(()=>act(g,judge(),{type:'vote',vote:'defesa'}));act(g,token(jury.id),{type:'vote',vote:'defesa'});assert.equal(g.winner,'defesa');act(g,tokens[0],{type:'nextRound'});if(r<3)for(const p of g.players)seenRoles.get(p.id)!.add(p.role);
 }
 assert.equal(g.phase,'finished');for(const roles of seenRoles.values())assert.equal(roles.size,4);
});

test('juiz acrescenta tempo sincronizado uma vez e não pode usar duas cartas na mesma fala',()=>{
 const {g,token,judge}=setup();const a=speaker(g);assert.equal(view(g,judge()).judgePowers!.length,4);assert.equal(view(g,token(a.id)).judgePowers,undefined);
 assert.throws(()=>act(g,token(a.id),{type:'judgePower',power:'extend'}));
 begin(g,judge(),1000);act(g,judge(),{type:'judgePower',power:'extend'},11000);assert.equal(g.remaining,60000);assert.equal(g.deadline,71000);assert.equal(g.phase,'speaking');
 assert.throws(()=>act(g,judge(),{type:'judgePower',power:'cut'},12000));
 assert.ok(view(g,judge()).judgePowers!.find(p=>p.id==='extend')!.used);
 act(g,judge(),{type:'end'},13000);act(g,judge(),{type:'nextTurn'},14000);assert.throws(()=>act(g,judge(),{type:'judgePower',power:'extend'},15000));
 act(g,judge(),{type:'judgePower',power:'cut'},16000);assert.equal(g.remaining,50000);assert.equal(g.deadline,null);
});
test('corte do juiz preserva mínimo, respeita proteção e funciona com relógio pausado',()=>{
 const {g,token,judge}=setup();const a=speaker(g);const shield=cards.find(c=>c.effect==='protectTime')!;hand(g,a.id,shield.id);act(g,token(a.id),{type:'play',card:shield.id});assert.throws(()=>act(g,judge(),{type:'judgePower',power:'cut'}));
 g.effects[0].status='cancelled';begin(g,judge(),1000);act(g,judge(),{type:'pause'},51000);assert.equal(g.remaining,10000);assert.throws(()=>act(g,judge(),{type:'judgePower',power:'cut'},52000));
 g.remaining=15000;act(g,judge(),{type:'judgePower',power:'cut'},53000);assert.equal(g.remaining,10000);assert.equal(g.deadline,null);assert.equal(g.paused,true);
});
test('carta do juiz abre somente uma prova lacrada da fala atual',()=>{
 const {g,token,judge}=setup();const a=speaker(g);hand(g,a.id,'0-0');act(g,token(a.id),{type:'play',card:'0-0'});const pres=g.presentations[0];assert.equal(pres.revealed,false);
 act(g,judge(),{type:'judgePower',power:'reveal',presentation:pres.id});assert.equal(pres.revealed,true);assert.ok(view(g,judge()).notices.some(n=>n.kind==='judgePower'));
});
test('improviso imposto pelo juiz só revela tarefa ao juiz depois da fala',()=>{
 const {g,token,judge}=setup();const a=speaker(g);act(g,judge(),{type:'judgePower',power:'improv'});
 assert.equal(view(g,judge()).effects.filter(e=>e.kind==='challengeSelf').length,0);
 const received=view(g,token(a.id)).effects.find(e=>e.kind==='challengeSelf')!;assert.ok(received.instruction.startsWith('Na sua próxima fala'));
 begin(g,judge());assert.equal(view(g,judge()).effects.length,0);act(g,judge(),{type:'end'});assert.ok(view(g,judge()).effects.some(e=>e.id===received.id));act(g,judge(),{type:'review',effect:received.id,passed:true});assert.equal(a.score,1);
});
test('juiz não impõe atuação depois da confirmação e poderes renovam no próximo caso',()=>{
 const {g,tokens,token,judge}=setup();const a=speaker(g);act(g,token(a.id),{type:'prepared'});assert.throws(()=>act(g,judge(),{type:'judgePower',power:'improv'}));
 act(g,judge(),{type:'judgePower',power:'extend'});g.phase='result';act(g,tokens[0],{type:'nextRound'});assert.deepEqual(g.judgePowersUsed,[]);assert.deepEqual(g.judgePowerTurns,[]);assert.equal(g.judgeUnderWatch,false);
});
test('pontos compram tempo sem gastar ação de carta e diminuem o placar',()=>{
 const {g,token}=setup();const a=speaker(g);a.score=2;const actions=a.used;act(g,token(a.id),{type:'spendPoints',perk:'time'});assert.equal(a.score,1);assert.equal(a.used,actions);assert.equal(g.remaining,70000);assert.equal(g.deadline,null);assert.equal(g.scoreLedger!.at(-1)!.delta,-1);
 assert.throws(()=>act(g,token(a.id),{type:'spendPoints',perk:'time'}));
});
test('compras não podem ser feitas sem saldo, fora da preparação ou depois da confirmação',()=>{
 const {g,token,judge}=setup();const a=speaker(g);assert.throws(()=>act(g,token(a.id),{type:'spendPoints',perk:'time'}));a.score=10;act(g,token(a.id),{type:'prepared'});assert.throws(()=>act(g,token(a.id),{type:'spendPoints',perk:'draw'}));act(g,judge(),{type:'begin'});assert.throws(()=>act(g,token(a.id),{type:'spendPoints',perk:'clean'}));assert.equal(a.score,10);
});
test('pontos compram prova extra ou retiram vergonha com condições verificadas',()=>{
 const first=setup();const a=speaker(first.g);a.score=3;const old=[...a.hand];act(first.g,first.token(a.id),{type:'spendPoints',perk:'draw'});assert.equal(a.hand.length,5);assert.equal(a.score,1);const added=a.hand.find(id=>!old.includes(id))!;assert.equal(card(added).effect,'present');
 const second=setup();const b=speaker(second.g);b.score=2;assert.throws(()=>act(second.g,second.token(b.id),{type:'spendPoints',perk:'clean'}));b.shame=2;act(second.g,second.token(b.id),{type:'spendPoints',perk:'clean'});assert.equal(b.shame,1);assert.equal(b.score,1);
});
test('contestação errada perde troca na próxima preparação e dá pontos gastáveis ao vencedor',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;hand(g,a.id,'0-0');act(g,token(a.id),{type:'play',card:'0-0'});begin(g,judge());act(g,token(d.id),{type:'bluff',presentation:g.presentations[0].id});act(g,judge(),{type:'judgeBluff',lied:false});assert.equal(d.swapPenalty,true);assert.equal(a.score,1);assert.ok(g.notices!.some(n=>n.kind==='bluff'&&n.message.includes(d.name)));close(g,judge());assert.equal(speaker(g).id,d.id);assert.equal(d.used,0);assert.equal(d.swapped,true);assert.throws(()=>act(g,token(d.id),{type:'swap',card:d.hand[0]}));
});
test('denúncia correta confisca poderes, pune remetente, dá recompensa prática e avisa a todos',()=>{
 const {g,tokens,token,judge}=setup(4);const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!,j=g.players.find(p=>p.role==='juiz')!;j.score=5;hand(g,a.id,'3-2');act(g,token(a.id),{type:'play',card:'3-2'});act(g,judge(),{type:'judgePower',power:'extend'});begin(g,judge(),1000);act(g,token(d.id),{type:'denounce'},11000);
 assert.equal(g.judgeUnderWatch,true);assert.equal(j.score,3);assert.equal(a.penalty,1);assert.equal(d.score,2);assert.equal(d.pendingSeconds,10);assert.equal(g.effects[0].status,'cancelled');assert.equal(g.phase,'speaking');assert.equal(g.deadline,71000);
 assert.throws(()=>act(g,judge(),{type:'judgePower',power:'cut'},12000));
 for(const t of tokens){const v=view(g,t);assert.equal(v.judgeUnderWatch,true);assert.ok(v.notices.some(n=>n.kind==='denounced'&&n.message.includes(d.name)));const result=v.notices.find(n=>n.kind==='corruption')!;assert.ok(result.message.includes(j.name));assert.ok(result.details.some(text=>text.includes('Poderes')||text.includes('poderes')));}
 act(g,judge(),{type:'end'},13000);act(g,judge(),{type:'nextTurn'},14000);assert.equal(g.remaining,70000);assert.equal(d.pendingSeconds,0);hand(g,d.id,'3-1');assert.ok(view(g,token(d.id)).me.hand[0].blockedReason?.includes('fiscalização'));assert.throws(()=>act(g,token(d.id),{type:'play',card:'3-1'},15000));
});
test('denúncia falsa avisa sem confiscar poderes; após flagrante não se repetem denúncias',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;act(g,token(d.id),{type:'denounce'});assert.equal(g.judgeUnderWatch,false);assert.equal(d.penalty,1);assert.ok(g.notices!.some(n=>n.kind==='falseDenounce'));act(g,judge(),{type:'judgePower',power:'extend'});
 hand(g,a.id,'3-0');act(g,token(a.id),{type:'play',card:'3-0'});assert.throws(()=>act(g,token(d.id),{type:'denounce'}));
});
test('flagrante anula ambos os lados sem revelar envelopes do próprio denunciante',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;hand(g,a.id,'3-2');act(g,token(a.id),{type:'play',card:'3-2'});begin(g,judge());close(g,judge());hand(g,d.id,'3-1');act(g,token(d.id),{type:'play',card:'3-1'});act(g,token(a.id),{type:'denounce'});assert.ok(g.effects.every(e=>e.status==='cancelled'));const publicResult=g.notices!.find(n=>n.kind==='corruption')!;assert.ok(publicResult.details[0].includes(card('3-1').name));assert.ok(!publicResult.details[0].includes(card('3-2').name));assert.throws(()=>act(g,token(d.id),{type:'denounce'}));
});
test('juiz só ganha ponto de conclusão se não foi flagrado',()=>{
 const clean=setup();const j=clean.g.players.find(p=>p.role==='juiz')!;clean.g.phase='verdict';act(clean.g,clean.judge(),{type:'vote',vote:'defesa'});assert.equal(j.score,1);
 const caught=setup();const j2=caught.g.players.find(p=>p.role==='juiz')!;caught.g.judgeUnderWatch=true;caught.g.phase='verdict';act(caught.g,caught.judge(),{type:'vote',vote:'defesa'});assert.equal(j2.score,0);
});

test('blefe descoberto retira uma ação futura de quem mentiu sem alterar o tempo pausado',()=>{
 const {g,token,judge}=setup();const a=speaker(g),d=g.players.find(p=>p.role==='defesa')!;hand(g,a.id,'0-0');act(g,token(a.id),{type:'play',card:'0-0'},500);begin(g,judge(),1000);act(g,token(d.id),{type:'bluff',presentation:g.presentations[0].id},11000);const remaining=g.remaining;act(g,judge(),{type:'judgeBluff',lied:true},21000);assert.equal(g.remaining,remaining);assert.equal(a.penalty,1);assert.equal(d.score,1);act(g,judge(),{type:'end'},22000);act(g,judge(),{type:'nextTurn'},23000);begin(g,judge());close(g,judge());assert.equal(speaker(g).id,a.id);assert.equal(a.used,1);
});
