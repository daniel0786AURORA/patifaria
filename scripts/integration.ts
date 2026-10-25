import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
async function request(data:any){return fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestId:crypto.randomUUID()})});}
async function req(data:any){const r=await request(data);const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));return b;}
async function rejected(data:any){const r=await request(data);assert.equal(r.status,400,await r.text());}
const created=await req({type:'create',name:'QA Juiz'}),code=created.game.code;
const joined=await Promise.all([req({type:'join',code,name:'QA Acusação'}),req({type:'join',code,name:'QA Defesa'})]);
const sessions=[created,...joined].map(x=>({token:x.token,code}));
const games=await Promise.all(sessions.map(s=>req({...s,type:'poll'})));assert.ok(games.every(x=>x.game.players.length===3));
let {game:g}=await req({...sessions[0],type:'start'});
function who(role:string){const id=g.players.find((p:any)=>p.role===role).id;return sessions[games.findIndex(x=>x.game.me.id===id)];}
const roleHistory=new Map<string,Set<string>>();let challengesReviewed=0,bluffs=0,pairs=0;
for(let round=0;round<3;round++){
 for(const p of g.players){if(!roleHistory.has(p.id))roleHistory.set(p.id,new Set());roleHistory.get(p.id)!.add(p.role);}
 let pairStart:Record<string,string[]>={};
 for(let t=0;t<6;t++){
  const j=who('juiz'),sp=who(t%2===0?'acusação':'defesa'),opposite=who(t%2===0?'defesa':'acusação');
  if(t%2===0){for(const role of ['acusação','defesa']){const mine=(await req({...who(role),type:'poll'})).game;assert.equal(mine.me.hand.length,4);pairStart[role]=mine.me.hand.map((c:any)=>c.id);}}
  let mine=(await req({...sp,type:'poll'})).game;assert.deepEqual(mine.me.hand.map((c:any)=>c.id),pairStart[t%2===0?'acusação':'defesa']);
  await rejected({...j,type:'begin'});
  const proof=mine.me.hand.find((c:any)=>c.effect==='present');
  if(proof){mine=(await req({...sp,type:'play',card:proof.id})).game;assert.equal(mine.phase,'ready');assert.equal(mine.deadline,null);}
  const challenge=mine.me.hand.find((c:any)=>c.effect==='challengeSelf'||c.effect==='challenge'&&t<5);
  if(challenge){mine=(await req({...sp,type:'play',card:challenge.id})).game;const judgeView=(await req({...j,type:'poll'})).game;assert.ok(!judgeView.effects.some((e:any)=>['challenge','challengeSelf'].includes(e.kind)));}
  const remainingHands:Record<string,string[]>={};for(const role of ['acusação','defesa']){remainingHands[role]=(await req({...who(role),type:'poll'})).game.me.hand.map((c:any)=>c.id);}
  g=(await req({...sp,type:'prepared'})).game;if(mine.me.hand.length)await rejected({...sp,type:'play',card:mine.me.hand[0].id});
  g=(await req({...j,type:'begin'})).game;assert.equal(g.phase,'speaking');assert.ok(!g.effects.some((e:any)=>['challenge','challengeSelf'].includes(e.kind)));
  if(mine.me.hand.length){await rejected({...sp,type:'play',card:mine.me.hand[0].id});await rejected({...sp,type:'swap',card:mine.me.hand[0].id});}
  if(proof){const other=(await req({...opposite,type:'poll'})).game;const pres=other.presentations.findLast((x:any)=>x.turn===t);assert.equal(pres.card.text,undefined);g=(await req({...opposite,type:'bluff',presentation:pres.id})).game;assert.equal(g.phase,'bluff');const remaining=g.remaining;assert.ok(g.presentations.at(-1).card.text);g=(await req({...j,type:'judgeBluff',lied:false})).game;assert.equal(g.phase,'speaking');assert.equal(g.remaining,remaining);bluffs++;}
  g=(await req({...j,type:'end'})).game;
  const reviews=g.effects.filter((e:any)=>['challenge','challengeSelf'].includes(e.kind)&&e.status==='active'&&e.turn===t);
  if(reviews.length)await rejected({...j,type:'nextTurn'});
  for(const e of reviews){assert.ok(e.instruction.includes(e.targetName));g=(await req({...j,type:'review',effect:e.id,passed:true})).game;challengesReviewed++;}
  for(const role of ['acusação','defesa'])assert.deepEqual((await req({...who(role),type:'poll'})).game.me.hand.map((c:any)=>c.id),remainingHands[role]);
  g=(await req({...j,type:'nextTurn'})).game;
  if(t%2===0){for(const role of ['acusação','defesa'])assert.deepEqual((await req({...who(role),type:'poll'})).game.me.hand.map((c:any)=>c.id),remainingHands[role]);}
  else if(t<5){for(const role of ['acusação','defesa']){const renewed=(await req({...who(role),type:'poll'})).game.me.hand.map((c:any)=>c.id);assert.equal(renewed.length,4);assert.notDeepEqual(renewed,pairStart[role]);}pairs++;}
 }
 assert.equal(g.phase,'verdict');g=(await req({...who('juiz'),type:'vote',vote:'acusação'})).game;assert.equal(g.phase,'result');g=(await req({...sessions[0],type:'nextRound'})).game;
 console.log(`Julgamento ${round+1}/3 verificado.`);
}
assert.equal(g.phase,'finished');for(const r of roleHistory.values())assert.equal(r.size,3);
await rejected({type:'poll',code,token:'f'.repeat(64)});
console.log(JSON.stringify({status:'PASS',base,room:code,players:3,rounds:3,speeches:18,pairsRenewed:pairs,bluffs,challengesReviewed,checks:['concurrent join','private sessions','pre-speech cards only','ready confirmation','both hands preserved between speeches','paired hand renewal','challenge hidden from judge until review','actor-specific instructions','bluff timer resume','role rotation','final scoreboard']}));
