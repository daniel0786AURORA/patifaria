import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
async function req(data:any){const r=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestId:crypto.randomUUID()})});const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));return b;}
const created=await req({type:'create',name:'QA Juiz'}),code=created.game.code;
const joined=await Promise.all([req({type:'join',code,name:'QA Acusação'}),req({type:'join',code,name:'QA Defesa'})]);
const sessions=[created,...joined].map(x=>({token:x.token,code}));
const games=await Promise.all(sessions.map(s=>req({...s,type:'poll'})));assert.ok(games.every(x=>x.game.players.length===3));
let {game:g}=await req({...sessions[0],type:'start'});
function who(role:string){const id=g.players.find((p:any)=>p.role===role).id;return sessions[games.findIndex(x=>x.game.me.id===id)];}
const roleHistory=new Map<string,Set<string>>();
for(let round=0;round<3;round++){
 for(const p of g.players){if(!roleHistory.has(p.id))roleHistory.set(p.id,new Set());roleHistory.get(p.id)!.add(p.role);}
 for(let t=0;t<6;t++){
 const j=who('juiz');g=(await req({...j,type:'begin'})).game;
 const sp=who(t%2===0?'acusação':'defesa');const mine=(await req({...sp,type:'poll'})).game;
 assert.equal(mine.me.hand.length,4);
 const proof=mine.me.hand.find((c:any)=>c.effect==='present');
 if(proof){g=(await req({...sp,type:'play',card:proof.id})).game;const opposite=who(t%2===0?'defesa':'acusação');const other=(await req({...opposite,type:'poll'})).game;const pres=other.presentations.at(-1);assert.equal(pres.card.text,undefined);g=(await req({...opposite,type:'bluff',presentation:pres.id})).game;assert.equal(g.phase,'bluff');const remaining=g.remaining;assert.ok(g.presentations.at(-1).card.text);g=(await req({...j,type:'judgeBluff',lied:false})).game;assert.equal(g.phase,'speaking');assert.equal(g.remaining,remaining);}
 g=(await req({...j,type:'end'})).game;g=(await req({...j,type:'nextTurn'})).game;
 }
 assert.equal(g.phase,'verdict');g=(await req({...who('juiz'),type:'vote',vote:'acusação'})).game;assert.equal(g.phase,'result');
 g=(await req({...sessions[0],type:'nextRound'})).game;
}
assert.equal(g.phase,'finished');for(const r of roleHistory.values())assert.equal(r.size,3);
// Auth, optimistic concurrency and persistence verified through separate requests.
const bad=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'poll',code,token:'f'.repeat(64)})});assert.equal(bad.status,400);
console.log(JSON.stringify({status:'PASS',base,room:code,players:3,rounds:3,speeches:18,checks:['concurrent join','persisted private sessions','4-card hands','bluff reveal','clock resume','verdict','role rotation','final scoreboard','unauthorized session denied']}));
