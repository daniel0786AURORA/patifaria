import assert from 'node:assert/strict';
const playerCount=Number(process.env.TEST_PLAYERS||4);
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
async function request(data:any){return fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestId:crypto.randomUUID()})});}
async function req(data:any){const r=await request(data);const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));return b;}
async function rejected(data:any){const r=await request(data);assert.equal(r.status,400,await r.text());}
const created=await req({type:'create',name:'QA Juiz'}),code=created.game.code;
const joined=await Promise.all(Array.from({length:playerCount-1},(_,i)=>req({type:'join',code,name:['QA Acusação','QA Defesa','QA Júri'][i]})));
const sessions=[created,...joined].map(x=>({token:x.token,code}));
const games=await Promise.all(sessions.map(s=>req({...s,type:'poll'})));assert.ok(games.every(x=>x.game.players.length===playerCount));
await req({...sessions[0],type:'configure',rounds:playerCount,seconds:60});
let {game:g}=await req({...sessions[0],type:'start'});
function who(role:string){const id=g.players.find((p:any)=>p.role===role).id;return sessions[games.findIndex(x=>x.game.me.id===id)];}
const roleHistory=new Map<string,Set<string>>();let challengesReviewed=0,bluffs=0,pairs=0,forcedDecisions=0,juryOpenings=0,judgePowerUses=0,pointPurchases=0,successfulReports=0;const seenCards=new Set<string>();
for(let round=0;round<playerCount;round++){
 for(const p of g.players){if(!roleHistory.has(p.id))roleHistory.set(p.id,new Set());roleHistory.get(p.id)!.add(p.role);}
 let pairStart:Record<string,string[]>={};const corruptAuthors=new Set<string>();
 for(let t=0;t<6;t++){
  const j=who('juiz'),sp=who(t%2===0?'acusação':'defesa'),opposite=who(t%2===0?'defesa':'acusação');
  if(t%2===0){for(const role of ['acusação','defesa']){const mine=(await req({...who(role),type:'poll'})).game;assert.equal(mine.me.hand.length,4);assert.equal(mine.me.hand.filter((c:any)=>c.type==='Evidências').length,1);assert.equal(mine.me.hand.filter((c:any)=>c.type==='Testemunhas').length,1);for(const c of mine.me.hand){assert.ok(!seenCards.has(c.id));seenCards.add(c.id);}pairStart[role]=mine.me.hand.map((c:any)=>c.id);}}
  let mine=(await req({...sp,type:'poll'})).game;assert.deepEqual(mine.me.hand.map((c:any)=>c.id),pairStart[t%2===0?'acusação':'defesa']);
  await rejected({...j,type:'begin'});
  const perk=mine.pointPerks.find((p:any)=>!p.blockedReason);if(perk){const before=mine.me.score;mine=(await req({...sp,type:'spendPoints',perk:perk.id})).game;assert.equal(mine.me.score,before-perk.cost);assert.equal(mine.phase,'ready');pointPurchases++;}
  const proof=mine.me.hand.find((c:any)=>c.effect==='present'&&!c.blockedReason);
  if(proof){mine=(await req({...sp,type:'play',card:proof.id})).game;assert.equal(mine.phase,'ready');assert.equal(mine.deadline,null);}
  const support=mine.me.used<2?mine.me.hand.find((c:any)=>c.effect!=='present'&&!c.blockedReason):null;
  if(support){mine=(await req({...sp,type:'play',card:support.id})).game;if(support.type==='Corrupção')corruptAuthors.add(mine.me.id);const judgeView=(await req({...j,type:'poll'})).game;assert.ok(!judgeView.effects.some((e:any)=>['challenge','challengeSelf'].includes(e.kind)));}
  if(t===0&&playerCount===4){const jury=who('jurado');await req({...jury,type:'question',text:'Qual detalhe do depoimento realmente liga a pessoa ao caso?'});const v=(await req({...jury,type:'poll'})).game;const sealed=v.presentations.find((x:any)=>!x.revealed);if(sealed){await req({...jury,type:'juryReveal',presentation:sealed.id});juryOpenings++;}}
  const judgeState=(await req({...j,type:'poll'})).game;
  const desired=['extend','cut','improv','reveal'][t];const power=judgeState.judgePowers.find((p:any)=>p.id===desired&&!p.blockedReason)||(t===4?judgeState.judgePowers.find((p:any)=>!p.blockedReason):null);
  if(power){g=(await req({...j,type:'judgePower',power:power.id})).game;assert.ok(g.judgePowers.find((p:any)=>p.id===power.id).used);await rejected({...j,type:'judgePower',power:power.id});judgePowerUses++;}
  if(t>=3&&!judgeState.judgeUnderWatch&&corruptAuthors.size){const bad=[...corruptAuthors][0];const accused=g.players.find((p:any)=>p.id===bad);const reporter=who(accused.role==='acusação'?'defesa':'acusação');const before=(await req({...reporter,type:'poll'})).game;g=(await req({...reporter,type:'denounce'})).game;assert.equal(g.judgeUnderWatch,true);assert.equal(g.me.score,before.me.score+2);const judgeAfter=(await req({...j,type:'poll'})).game;assert.ok(judgeAfter.judgePowers.every((p:any)=>p.blockedReason));for(const session of sessions){const state=(await req({...session,type:'poll'})).game;assert.ok(state.notices.some((n:any)=>n.round===g.round&&n.kind==='denounced'));assert.ok(state.notices.some((n:any)=>n.round===g.round&&n.kind==='corruption'));assert.ok(!state.effects.some((e:any)=>e.card.type==='Corrupção'&&e.status==='active'));}successfulReports++;}
  const remainingHands:Record<string,string[]>={};for(const role of ['acusação','defesa']){remainingHands[role]=(await req({...who(role),type:'poll'})).game.me.hand.map((c:any)=>c.id);}
  g=(await req({...sp,type:'prepared'})).game;if(mine.me.hand.length)await rejected({...sp,type:'play',card:mine.me.hand[0].id});
  g=(await req({...j,type:'begin'})).game;assert.equal(g.phase,'speaking');assert.ok(!g.effects.some((e:any)=>['challenge','challengeSelf'].includes(e.kind)));
  if(mine.me.hand.length){await rejected({...sp,type:'play',card:mine.me.hand[0].id});await rejected({...sp,type:'swap',card:mine.me.hand[0].id});}
  if(proof){const other=(await req({...opposite,type:'poll'})).game;const pres=other.presentations.findLast((x:any)=>x.turn===t);if(!pres.revealed)assert.equal(pres.card.text,undefined);g=(await req({...opposite,type:'bluff',presentation:pres.id})).game;assert.equal(g.phase,'bluff');const remaining=g.remaining;assert.ok(g.presentations.at(-1).card.text);g=(await req({...j,type:'poll'})).game;const forced=g.judgeControls?.bluff;if(forced){await rejected({...j,type:'judgeBluff',lied:!forced.lied});forcedDecisions++;}g=(await req({...j,type:'judgeBluff',lied:forced?.lied??false})).game;assert.equal(g.phase,'speaking');assert.equal(g.remaining,remaining);bluffs++;}
  g=(await req({...j,type:'end'})).game;
  const reviews=g.effects.filter((e:any)=>['challenge','challengeSelf'].includes(e.kind)&&e.status==='active'&&e.turn===t);
  if(reviews.length)await rejected({...j,type:'nextTurn'});
  for(const e of reviews){assert.ok(e.instruction.includes(e.targetName));const forced=g.judgeControls?.reviews?.[e.id];if(forced){await rejected({...j,type:'review',effect:e.id,passed:!forced.passed});forcedDecisions++;}g=(await req({...j,type:'review',effect:e.id,passed:forced?.passed??true})).game;challengesReviewed++;}
  for(const role of ['acusação','defesa'])assert.deepEqual((await req({...who(role),type:'poll'})).game.me.hand.map((c:any)=>c.id),remainingHands[role]);
  g=(await req({...j,type:'nextTurn'})).game;
  if(t%2===0){for(const role of ['acusação','defesa'])assert.deepEqual((await req({...who(role),type:'poll'})).game.me.hand.map((c:any)=>c.id),remainingHands[role]);}
  else if(t<5){for(const role of ['acusação','defesa']){const renewed=(await req({...who(role),type:'poll'})).game.me.hand.map((c:any)=>c.id);assert.equal(renewed.length,4);assert.notDeepEqual(renewed,pairStart[role]);}pairs++;}
 }
 assert.equal(g.phase,'verdict');if(playerCount===4){await rejected({...who('juiz'),type:'vote',vote:'defesa'});}g=(await req({...who(playerCount===4?'jurado':'juiz'),type:'vote',vote:'acusação'})).game;assert.equal(g.phase,'result');g=(await req({...sessions[0],type:'nextRound'})).game;
 console.log(`Julgamento ${round+1}/${playerCount} verificado.`);
}
assert.equal(g.phase,'finished');for(const r of roleHistory.values())assert.equal(r.size,playerCount);
await rejected({type:'poll',code,token:'f'.repeat(64)});
console.log(JSON.stringify({status:'PASS',base,room:code,players:playerCount,rounds:playerCount,speeches:playerCount*6,uniqueInitialCards:seenCards.size,forcedDecisions,juryOpenings,judgePowerUses,pointPurchases,successfulReports,pairsRenewed:pairs,bluffs,challengesReviewed,checks:['judge cards and limits','points spent on real advantages','corruption penalties and public notices','balanced hands without repeats','jury powers and verdict','forced choices enforced','concurrent join','private sessions','pre-speech cards only','ready confirmation','both hands preserved between speeches','paired hand renewal','challenge hidden from judge until review','actor-specific instructions','bluff timer resume','role rotation','final scoreboard']}));
