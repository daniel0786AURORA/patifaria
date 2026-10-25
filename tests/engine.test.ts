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
 act(g,judge(),{type:'end'});assert.throws(()=>act(g,judge(),{type:'nextTurn'}));act(g,judge(),{type:'review',effect:g.effects[0].id,passed:false});assert.equal(p.score,1);act(g,judge(),{type:'nextTurn'});assert.equal(g.turn,1);
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
 assert.equal(g.phase,'finished');for(const r of roles.values())assert.equal(r.size,3);assert.equal(g.players.reduce((a,p)=>a+p.score,0),9);
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
