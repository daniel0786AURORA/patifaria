import { randomInt, randomUUID, createHash } from 'node:crypto';
import {judgePowers,pointPerks} from './court-resources.js';
import {cards,cases,type Card} from './content.js';
export type Role='juiz'|'acusação'|'defesa'|'jurado';
type Player={id:string;secret:string;name:string;role:Role;score:number;shame:number;penalty:number;used:number;swapped:boolean;prepared?:boolean;denounced:boolean;hand:string[];seals:Record<string,boolean>;seen:number;question:boolean;extraSwaps?:number;actionPenalty?:boolean;juryRevealUsed?:boolean;mission:number;pendingSeconds?:number;swapPenalty?:boolean;spentPerkAt?:string};
type Effect={id:string;card:string;author:string;target:string;kind:string;status:'active'|'consumed'|'cancelled'|'expired';turn:number;instruction:string;remaining?:number;note?:string;reflected?:boolean};
type Presentation={id:string;card:string;author:string;contested:boolean;revealed:boolean;turn:number;claim?:string;seal?:boolean};
type Notice={id:string;kind:string;title:string;message:string;details:string[];at:number;round:number};
type ScoreEntry={id:string;player:string;delta:number;reason:string;round:number};
export type Game={code:string;revision:number;host:string;players:Player[];phase:'lobby'|'ready'|'speaking'|'bluff'|'review'|'verdict'|'result'|'finished';round:number;rounds:number;seconds:number;turn:number;caseId:number;usedCases:number[];deck:string[];discard:string[];remaining:number;deadline:number|null;paused:boolean;effects:Effect[];presentations:Presentation[];challenge?:{presentation:string;challenger:string};logs:{id:string;text:string}[];votes:Record<string,string>;winner?:string;requests:string[];created:number;seenCards?:string[];recentFamilies?:string[];judgePowersUsed?:string[];judgePowerTurns?:number[];judgeUnderWatch?:boolean;notices?:Notice[];scoreLedger?:ScoreEntry[];};
const cardMap=new Map(cards.map(c=>[c.id,c]));
export const card=(id:string)=>cardMap.get(id)!;
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function ensure(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
function shuffle<T>(items:T[]){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function log(g:Game,text:string){g.logs.push({id:randomUUID(),text});g.logs=g.logs.slice(-90);}
function notice(g:Game,kind:string,title:string,message:string,details:string[]=[],at=Date.now()){
 g.notices??=[];g.notices.push({id:randomUUID(),kind,title,message,details,at,round:g.round});g.notices=g.notices.slice(-40);
}
function points(g:Game,p:Player,delta:number,reason:string){
 const applied=Math.max(-p.score,delta);p.score+=applied;g.scoreLedger??=[];g.scoreLedger.push({id:randomUUID(),player:p.id,delta:applied,reason,round:g.round});g.scoreLedger=g.scoreLedger.slice(-100);
}
function bluffConsequences(g:Game,winner:Player,loser:Player,lied:boolean){
 shame(g,loser);if(lied)loser.penalty=1;else loser.swapPenalty=true;points(g,winner,1,'Venceu uma contestação de BLEFE');
 notice(g,'bluff',lied?'BLEFE DESMASCARADO!':'CONTESTAÇÃO REJEITADA!',`${winner.name} ganhou 1 ponto utilizável. ${loser.name} ${lied?'perde uma ação':'perde a troca opcional'} na próxima preparação.`,['O perdedor também recebe uma Ficha de Vergonha, salvo proteção ativa.','Pontos podem comprar vantagens; gastar reduz seu placar.']);
}
function powerReason(g:Game,id:string,now=Date.now()):string|null{
 if(g.judgeUnderWatch)return 'Poderes especiais confiscados pela Corregedoria até o próximo julgamento.';
 if(!['ready','speaking'].includes(g.phase))return 'Use na preparação ou durante a fala, fora de contestações.';
 if(g.judgePowersUsed?.includes(id))return 'Esta carta já foi usada neste julgamento.';
 if(g.judgePowerTurns?.includes(g.turn))return 'O juiz já usou uma carta nesta fala.';
 const remaining=g.deadline?Math.max(0,g.deadline-now):g.remaining;
 if(id==='extend'&&remaining>=90000)return 'A fala já está no limite de 90 segundos.';
 if(id==='cut'&&(remaining<=10000||active(g,'protectTime',speaker(g).id).length))return 'O tempo está protegido ou já chegou ao mínimo de 10 segundos.';
 if(id==='reveal'&&!g.presentations.some(x=>x.turn===g.turn&&!x.revealed))return 'Aguarde uma prova ou testemunha lacrada desta fala.';
 if(id==='improv'&&(g.phase!=='ready'||speaker(g).prepared))return 'Intime a atuação antes de o advogado confirmar a preparação.';
 return null;
}
function perkReason(g:Game,p:Player,id:string,cost:number){
 if(!['acusação','defesa'].includes(p.role)||g.phase!=='ready'||speaker(g).id!==p.id||p.prepared)return 'Use na preparação da sua fala, antes de confirmar.';
 if(p.spentPerkAt===`${g.round}:${g.turn}`)return 'Você já comprou uma vantagem nesta preparação.';
 if(p.score<cost)return `Você precisa de ${cost} ponto(s).`;
 if(id==='time'&&(g.remaining>=90000||active(g,'blockTime',p.id).length))return 'Bônus de tempo bloqueado ou limite de 90 segundos atingido.';
 if(id==='clean'&&p.shame===0)return 'Você não tem Fichas de Vergonha para remover.';
 if(id==='draw'&&p.hand.length>=5)return 'Sua mão já tem cinco cartas.';
 return null;
}
export function addPlayer(g:Game,name:string,secret:string){ensure(g.phase==='lobby','A sessão já começou.');ensure(g.players.length<10,'Este tribunal está lotado.');name=name.trim().slice(0,22);ensure(name.length>=2,'Use um apelido com pelo menos 2 letras.');ensure(!g.players.some(p=>p.name.toLowerCase()===name.toLowerCase()),'Esse apelido já está no tribunal.');const p:Player={id:randomUUID(),secret:hash(secret),name,role:'jurado',score:0,shame:0,penalty:0,used:0,swapped:false,denounced:false,hand:[],seals:{},seen:Date.now(),question:false,mission:0};g.players.push(p);log(g,`${name} entrou no tribunal.`);return p;}
export function createGame(code:string,name:string,secret:string):Game{const g:Game={code,revision:0,host:'',players:[],phase:'lobby',round:0,rounds:3,seconds:60,turn:0,caseId:0,usedCases:[],deck:[],discard:[],remaining:60000,deadline:null,paused:false,effects:[],presentations:[],logs:[],votes:{},requests:[],created:Date.now()};g.host=addPlayer(g,name,secret).id;return g;}
function drawMatching(g:Game,predicate:(c:Card)=>boolean):string{
 g.seenCards??=[];
 const held=new Set(g.players.flatMap(p=>p.hand));
 const compatible=cards.filter(c=>(g.players.length>2||c.duel)&&predicate(c)&&!held.has(c.id));
 let pool=compatible.filter(c=>!g.seenCards!.includes(c.id));
 if(!pool.length){const reset=new Set(compatible.map(c=>c.id));g.seenCards=g.seenCards.filter(id=>!reset.has(id));pool=compatible;}
 ensure(pool.length,'Não há carta compatível para esta ação.');const chosen=pool[randomInt(pool.length)].id;
 g.seenCards.push(chosen);g.deck=g.deck.filter(id=>id!==chosen);return chosen;
}
function draw(g:Game):string{return drawMatching(g,()=>true);}
function support(g:Game,excluded:Card[]=[]):string{
 const families=new Set(excluded.map(c=>c.family||c.effect)),types=new Set(excluded.map(c=>c.type));
 const eligible=cards.filter(c=>(g.players.length>2||c.duel)&&c.effect!=='present'&&!families.has(c.family||c.effect)&&!types.has(c.type));
 const fresh=eligible.filter(c=>!g.seenCards?.includes(c.id)&&!g.recentFamilies?.slice(-6).includes(c.family||c.effect));
 const pool=fresh.length?fresh:eligible.filter(c=>!g.seenCards?.includes(c.id));const finalPool=pool.length?pool:eligible;
 ensure(finalPool.length,'Não há apoio de função diferente disponível.');
 const categories=[...new Set(finalPool.map(c=>c.type))];const type=categories[randomInt(categories.length)];
 const options=[...new Set(finalPool.filter(c=>c.type===type).map(c=>c.family||c.effect))];const family=options[randomInt(options.length)];
 const allowed=new Set(finalPool.filter(c=>c.type===type&&(c.family||c.effect)===family).map(c=>c.id));
 const id=drawMatching(g,c=>allowed.has(c.id));g.recentFamilies??=[];g.recentFamilies.push(family);g.recentFamilies=g.recentFamilies.slice(-12);return id;
}
export function speaker(g:Game){return g.players.find(p=>p.role===(g.turn%2===0?'acusação':'defesa'))!;}
function judge(g:Game,p:Player){return p.role==='juiz'||(g.players.length===2&&p.id===speaker(g).id);}
function deal(g:Game,p:Player){
 g.discard.push(...p.hand);p.hand=[];p.hand.push(drawMatching(g,c=>c.type==='Evidências'));p.hand.push(drawMatching(g,c=>c.type==='Testemunhas'));
 p.hand.push(support(g,p.hand.map(card)));p.hand.push(support(g,p.hand.map(card)));p.hand=shuffle(p.hand);
 p.used=0;p.swapped=false;p.extraSwaps=0;p.prepared=false;p.seals={};for(const id of p.hand)p.seals[id]=randomInt(2)===0;
}
function active(g:Game,kind:string,target:string,turn=g.turn){return g.effects.filter(e=>e.status==='active'&&e.kind===kind&&e.target===target&&e.turn===turn);}
function prepareSpeaker(g:Game){const p=speaker(g);p.prepared=false;if(p.swapPenalty){p.swapped=true;p.swapPenalty=false;}p.actionPenalty=p.penalty>0;p.used=Math.min(1,Math.max(p.penalty,active(g,'limitAction',p.id).length?1:0));p.penalty=0;if(p.pendingSeconds){g.remaining=Math.min(90000,g.remaining+p.pendingSeconds*1000);p.pendingSeconds=0;}for(const e of active(g,'shorten',p.id))g.remaining=Math.max(30000,g.remaining-(card(e.card).amount||5)*1000);}
function consume(e:Effect,note:string){e.remaining=Math.max(0,(e.remaining??1)-1);if(!e.remaining)e.status='consumed';e.note=note;}
function forcedBluff(g:Game){
 if(g.phase!=='bluff'||!g.challenge)return undefined;const pres=g.presentations.find(p=>p.id===g.challenge!.presentation)!;
 const order=[...g.effects].reverse().find(e=>e.status==='active'&&[pres.author,g.challenge!.challenger].includes(e.author)&&(e.kind==='forceBluff'||e.kind==='forceBluffEvidence'&&card(pres.card).type==='Evidências'||e.kind==='forceBluffWitness'&&card(pres.card).type==='Testemunhas'));
 if(!order)return undefined;const person=g.players.find(p=>p.id===order.author)!;return {order,lied:order.author!==pres.author,reason:`Ordem ativa: a decisão deve favorecer ${person.name} (${person.role}). A opção contrária está bloqueada.`};
}
function forcedReview(g:Game,task:Effect){
 const order=[...g.effects].reverse().find(e=>e.status==='active'&&((e.author===task.target&&(e.kind==='forceApprove'||e.kind==='forceApproveSelf'&&task.kind==='challengeSelf'))||(e.author!==task.target&&(e.kind==='forceReject'||e.kind==='forceRejectSabotage'&&task.kind==='challenge'))));
 if(!order)return undefined;const passed=['forceApprove','forceApproveSelf'].includes(order.kind);const target=g.players.find(p=>p.id===task.target)!;
 return {order,passed,reason:`Ordem ativa: ${passed?'aprovar':'reprovar'} esta tarefa de ${target.name} (${target.role}). ${actorInstruction(task)}`};
}
function pauseOrder(g:Game){return [...g.effects].reverse().find(e=>e.status==='active'&&e.kind==='blockJudgePause'&&e.author===speaker(g)?.id&&e.turn===g.turn);}
function blockedCard(g:Game,p:Player,c:Card){
 if(c.type==='Corrupção'&&g.judgeUnderWatch)return 'O juiz está sob fiscalização: novas corrupções estão bloqueadas neste julgamento.';
 const restrictions:Record<string,string[]>={blockCorruption:['Corrupção'],blockRefute:['Refutações'],blockTwist:['Reviravoltas']};
 for(const [kind,types] of Object.entries(restrictions))if(types.includes(c.type)&&active(g,kind,p.id).length)return `Esta categoria está bloqueada na sua preparação por uma sabotagem.`;
 if(['time','discardForTime','shameForTime'].includes(c.effect)&&active(g,'blockTime',p.id).length)return 'Uma sabotagem bloqueou os bônus de tempo nesta preparação.';
 if(c.target==='adversário'&&g.turn===5)return 'Não há próxima fala do adversário neste julgamento.';
 return null;
}
function corruptInstruction(g:Game,e:Effect){
 const author=g.players.find(p=>p.id===e.author)!,opponent=g.players.find(p=>['acusação','defesa'].includes(p.role)&&p.id!==e.author)!;
 if(e.status==='consumed')return `Ordem cumprida. ${e.note||'O efeito já foi aplicado e não está mais ativo.'}`;if(e.status==='cancelled')return 'Ordem cancelada: não pode mais alterar decisões.';if(e.status==='expired')return 'Ordem expirada ao encerrar o julgamento.';
 const count=e.remaining??1;const whom=`${author.name} (${author.role})`,against=`${opponent.name} (${opponent.role})`;
 const lines:Record<string,string>={
 forceBluff:`A próxima decisão de BLEFE deve favorecer ${whom}, seja ao apresentar, seja ao contestar uma carta.`,
 forceBluffEvidence:`A próxima decisão de BLEFE sobre uma EVIDÊNCIA deve favorecer ${whom}. Contestações de testemunhas não consomem esta ordem.`,
 forceBluffWitness:`A próxima decisão de BLEFE sobre uma TESTEMUNHA deve favorecer ${whom}. Contestações de evidências não consomem esta ordem.`,
 forceReject:`Reprove a próxima TAREFA DE ATUAÇÃO de ${against}. Só se aplica quando essa pessoa encerrar sua fala e a tarefa aparecer para avaliação. Não é reprovar o argumento nem o veredito.`,
 forceApprove:`Aprove a próxima TAREFA DE ATUAÇÃO de ${whom}, na avaliação após a fala. Não altera o veredito.`,
 forceApproveSelf:`Aprove a próxima ATUAÇÃO VOLUNTÁRIA (Interpretação) de ${whom}. Não vale para tarefas recebidas por Sabotagem.`,
 forceRejectSabotage:`Reprove a próxima TAREFA IMPOSTA POR SABOTAGEM a ${against}, ao final da fala. Atuações voluntárias não consomem esta ordem.`,
 favor:`Defenda verbalmente o próximo argumento de ${whom}; depois clique em Marcar ordem cumprida. Esta ordem não altera votos.`,
 waiveShame:`A próxima Ficha de Vergonha de ${whom} será cancelada automaticamente. Você não precisa clicar em nada.`,
 blockJudgePause:`Durante a fala ${Math.floor(e.turn/2)+1} de ${whom}, seu botão de pausa fica bloqueado. BLEFE ainda pausa normalmente.`
 };
 return `${lines[e.kind]||e.instruction} ${count>1?`Restam ${count} aplicações.`:'Uma aplicação restante.'}`;
}
function addEffect(g:Game,p:Player,c:Card,target:Player,kind=c.effect,turn=g.turn){
 const e:Effect={id:randomUUID(),card:c.id,author:p.id,target:target.id,kind,status:'active',turn,instruction:c.actorText||c.text,remaining:c.type==='Corrupção'?c.amount||1:1};
 if(isChallenge(e)){const shield=active(g,'blockNextChallenge',target.id,turn)[0];if(shield){e.status='cancelled';consume(shield,'Tarefa de atuação bloqueada automaticamente.');}}
 g.effects.push(e);return e;
}
function replaceCard(g:Game,p:Player,id:string){const c=card(id),i=p.hand.indexOf(id);if(i<0)return;g.discard.push(...p.hand.splice(i,1));const next=c.effect==='present'?drawMatching(g,q=>q.type===c.type):support(g,p.hand.map(card));p.hand.splice(i,0,next);p.seals[next]=randomInt(2)===0;}
function clearKind(g:Game,p:Player,kinds:string[]){const e=[...g.effects].reverse().find(e=>e.status==='active'&&e.target===p.id&&e.turn===g.turn&&kinds.includes(e.kind));if(e){e.status='cancelled';if(e.kind==='limitAction'&&!p.actionPenalty)p.used=Math.max(0,p.used-1);if(e.kind==='shorten')g.remaining=Math.min(90000,g.remaining+(card(e.card).amount||5)*1000);}return e;}

function isChallenge(e:Effect){return e.kind==='challenge'||e.kind==='challengeSelf';}
function actorInstruction(e:Effect){return e.instruction.replace(/^Na próxima fala, o adversário deve argumentar como /,'Na sua próxima fala, encene ').replace(/^Interprete /,'Na sua próxima fala, encene ').replace(/ O juiz avalia ao final:.*$/,'');}

function round(g:Game){g.round++;g.judgePowersUsed=[];g.judgePowerTurns=[];g.judgeUnderWatch=false;g.turn=0;g.phase='ready';g.effects=[];g.presentations=[];g.votes={};g.winner=undefined;g.challenge=undefined;g.paused=false;g.deadline=null;g.remaining=g.seconds*1000;const pool=cases.filter(c=>!g.usedCases.includes(c.id));if(!pool.length)g.usedCases=[];g.caseId=shuffle(pool.length?pool:cases)[0].id;g.usedCases.push(g.caseId);g.deck=shuffle(cards.filter(c=>g.players.length>2||c.duel).map(c=>c.id));g.discard=[];
const n=g.players.length;for(let i=0;i<n;i++){const p=g.players[i];const offset=(i-(g.round-1)%n+n)%n;p.role=n===2?(offset===0?'acusação':'defesa'):offset===0?'juiz':offset===1?'acusação':offset===2?'defesa':'jurado';p.hand=[];p.seals={};p.shame=0;p.used=0;p.denounced=false;p.question=false;p.juryRevealUsed=false;p.extraSwaps=0;p.spentPerkAt=undefined;p.mission=0;if(p.role==='acusação'||p.role==='defesa')deal(g,p);}
prepareSpeaker(g);log(g,`Julgamento ${g.round}: ${cases[g.caseId].title}. Papéis distribuídos!`);}
function stopClock(g:Game,now:number){if(g.deadline){g.remaining=Math.max(0,g.deadline-now);g.deadline=null;}}
function resume(g:Game,now:number){if(!g.paused)g.deadline=now+g.remaining;}
function shame(g:Game,p:Player){const protection=[...g.effects].reverse().find(e=>e.status==='active'&&e.kind==='waiveShame'&&e.author===p.id);if(protection){consume(protection,`Uma Ficha de Vergonha de ${p.name} foi cancelada automaticamente.`);return;}p.shame++;if(p.shame>=3){p.shame=0;p.penalty=1;log(g,`${p.name} juntou 3 Fichas de Vergonha: uma ação a menos na próxima fala.`);}}
function endTurn(g:Game){for(const e of g.effects)if(e.status==='active'&&e.kind==='blockJudgePause'&&e.turn===g.turn)consume(e,'A pausa manual ficou bloqueada durante esta fala.');g.remaining=0;g.deadline=null;g.paused=false;g.phase='review';log(g,`Encerrou a fala de ${speaker(g).name}.`);if(g.players.length===2)advance(g);}
function advance(g:Game){
 for(const e of g.effects)if(e.status==='active'&&card(e.card).type!=='Corrupção'&&e.turn===g.turn)e.status='expired';
 if(g.turn===5){g.phase='verdict';if(g.players.length===2){const [a,b]=g.players;finish(g,a.mission===b.mission?'empate':a.mission>b.mission?a.role:b.role);}}
 else{
  const renew=g.turn%2===1;g.turn++;g.phase='ready';g.paused=false;g.deadline=null;g.remaining=g.seconds*1000;
  if(renew){for(const p of g.players)if(p.role==='acusação'||p.role==='defesa')deal(g,p);log(g,'As duas falas terminaram: mãos renovadas para acusação e defesa.');}
  prepareSpeaker(g);
 }
}

function finish(g:Game,winner:string){g.winner=winner;g.phase='result';g.effects.forEach(e=>{if(e.status==='active')e.status='expired';});for(const p of g.players){if(p.role===winner)points(g,p,3,'Vitória judicial');if(p.role==='jurado'&&g.votes[p.id]===winner)points(g,p,1,'Voto no lado vencedor');if(p.role==='juiz'&&!g.judgeUnderWatch)points(g,p,1,'Concluiu o julgamento sem ser flagrado');}log(g,`Veredito: ${winner==='empate'?'empate':winner==='acusação'?'CULPADO!':'INOCENTE!'} Vitória judicial vale 3 pontos.`);}
export function tick(g:Game,now=Date.now()){if(g.phase==='speaking'&&g.deadline&&now>=g.deadline)endTurn(g);}
export function act(g:Game,secret:string,a:Record<string,any>,now=Date.now()){
 const p=g.players.find(p=>p.secret===hash(secret));ensure(p,'Sessão não encontrada. Entre novamente.');tick(g,now);p.seen=now;
 const isLaw=p.role==='acusação'||p.role==='defesa';const other=g.players.find(q=>q.role===(p.role==='acusação'?'defesa':'acusação'));
 switch(a.type){
 case 'configure':ensure(p.id===g.host&&g.phase==='lobby','Somente o anfitrião configura a sala.');ensure([1,2,3,4,5,6,8,10].includes(a.rounds)&&[30,45,60,90].includes(a.seconds),'Configuração inválida.');g.rounds=a.rounds;g.seconds=a.seconds;break;
 case 'start':ensure(p.id===g.host&&g.phase==='lobby','Somente o anfitrião pode iniciar.');ensure(g.players.length>=2,'Convide pelo menos mais uma pessoa.');round(g);break;
 case 'prepared':ensure(g.phase==='ready'&&speaker(g).id===p.id&&!p.prepared,'Só quem vai falar pode concluir a preparação.');p.prepared=true;log(g,`${p.name} terminou de preparar suas cartas.`);break;
 case 'begin':ensure(g.phase==='ready'&&judge(g,p),'Aguarde o juiz iniciar a fala.');ensure(speaker(g).prepared,'Aguarde o advogado confirmar que está pronto para falar.');g.phase='speaking';g.paused=false;g.deadline=now+g.remaining;log(g,`${speaker(g).name} está com a palavra.`);break;
 case 'pause':ensure(g.phase==='speaking'&&judge(g,p),'Só o juiz pode controlar o relógio.');ensure(g.paused||!pauseOrder(g),'Uma ordem reservada impede pausar esta fala. BLEFE continua disponível.');if(g.paused){g.paused=false;resume(g,now);}else{stopClock(g,now);g.paused=true;}log(g,g.paused?'Ordem no tribunal! Relógio pausado.':'O relógio foi retomado.');break;
 case 'end':ensure(g.phase==='speaking'&&judge(g,p),'Só o juiz encerra a fala.');endTurn(g);break;
 case 'judgePower':{
 ensure(p.role==='juiz','Somente o juiz pode usar cartas de gabinete.');const power=judgePowers.find(q=>q.id===a.power);ensure(power,'Carta de gabinete inválida.');const reason=powerReason(g,power.id,now);ensure(!reason,reason||'Carta indisponível.');
 if(power.id==='extend'||power.id==='cut'){
  const running=!!g.deadline;if(running)stopClock(g,now);g.remaining=power.id==='extend'?Math.min(90000,g.remaining+10000):Math.max(10000,g.remaining-10000);if(running)resume(g,now);
 }
 if(power.id==='reveal'){const pres=g.presentations.find(x=>x.turn===g.turn&&!x.revealed&&(!a.presentation||x.id===a.presentation));ensure(pres,'Essa prova não está lacrada nesta fala.');pres.revealed=true;}
 if(power.id==='improv'){const pool=cards.filter(c=>c.effect==='challengeSelf');addEffect(g,p,pool[randomInt(pool.length)],speaker(g),'challengeSelf');}
 g.judgePowersUsed??=[];g.judgePowersUsed.push(power.id);g.judgePowerTurns??=[];g.judgePowerTurns.push(g.turn);
 log(g,`${p.name} usou ${power.name} na fala de ${speaker(g).name}.`);notice(g,'judgePower','O MARTELO AGIU!',`${p.name} usou ${power.name} na fala de ${speaker(g).name}.`,[power.text],now);break;
 }
 case 'spendPoints':{
 const perk=pointPerks.find(q=>q.id===a.perk);ensure(perk,'Vantagem inválida.');const reason=perkReason(g,p,perk.id,perk.cost);ensure(!reason,reason||'Vantagem indisponível.');
 if(perk.id==='time')g.remaining=Math.min(90000,g.remaining+10000);
 if(perk.id==='clean')p.shame--;
 if(perk.id==='draw'){const id=drawMatching(g,c=>c.effect==='present');p.hand.push(id);p.seals[id]=randomInt(2)===0;}
 points(g,p,-perk.cost,`Comprou ${perk.name}`);p.spentPerkAt=`${g.round}:${g.turn}`;log(g,`${p.name} gastou ${perk.cost} ponto(s) em ${perk.name}.`);break;
 }
 case 'play':{
 ensure(g.phase==='ready'&&speaker(g).id===p.id&&!p.prepared,'Jogue suas cartas na preparação, antes de confirmar que está pronto.');ensure(p.used<2,'Você já usou suas ações desta fala.');ensure(p.hand.includes(a.card),'Essa carta não está na sua mão.');const c=card(a.card);ensure(g.players.length>2||c.duel,'Carta indisponível no Duelo.');ensure(!blockedCard(g,p,c),blockedCard(g,p,c)||'Carta bloqueada.');p.hand.splice(p.hand.indexOf(c.id),1);p.used++;g.discard.push(c.id);
 if(c.type==='Corrupção'){const j=g.players.find(q=>q.role==='juiz')!;addEffect(g,p,c,j);break;}
 log(g,['challenge','challengeSelf'].includes(c.effect)?`${p.name} preparou uma carta de atuação.`:`${p.name} preparou ${c.name}.`);
 if(c.effect==='present'){
 const pres:Presentation={id:randomUUID(),card:c.id,author:p.id,contested:false,turn:g.turn,revealed:active(g,'openEvidence',p.id).length>0};if(g.players.length===2){ensure(['original','trocado'].includes(a.claim),'No Duelo, declare ORIGINAL ou TROCADO.');pres.claim=a.claim;pres.seal=p.seals[c.id];pres.revealed=false;}
 g.presentations.push(pres);p.mission++;if(g.players.length===2)points(g,p,1,'Prova apresentada no Duelo');}
 const amount=c.amount||5;
 if(c.effect==='time')g.remaining=Math.min(90000,g.remaining+amount*1000);
 if(c.effect==='cleanShame')p.shame=Math.max(0,p.shame-Math.min(2,c.amount||1));
 if(c.effect==='extraSwap')p.extraSwaps=(p.extraSwaps||0)+1;
 if(['redraw','redrawTwo','redrawEvidence','redrawWitness','reshuffleSupport'].includes(c.effect)){
  let candidates=shuffle(p.hand).filter(id=>c.effect!=='redrawEvidence'||card(id).type==='Evidências').filter(id=>c.effect!=='redrawWitness'||card(id).type==='Testemunhas').filter(id=>c.effect!=='reshuffleSupport'||card(id).effect!=='present');
  for(const id of candidates.slice(0,['redrawTwo','reshuffleSupport'].includes(c.effect)?2:1))replaceCard(g,p,id);
 }
 if(['drawExtra','wildProof'].includes(c.effect)&&p.hand.length<5){const id=c.effect==='wildProof'?drawMatching(g,q=>q.effect==='present'):support(g,p.hand.map(card));p.hand.push(id);p.seals[id]=randomInt(2)===0;}
 if(c.effect==='discardForTime'&&p.hand.length){g.discard.push(...p.hand.splice(randomInt(p.hand.length),1));g.remaining=Math.min(90000,g.remaining+amount*1000);}
 if(c.effect==='shameForTime'){shame(g,p);g.remaining=Math.min(90000,g.remaining+amount*1000);}
 if(c.effect==='timeForClean'){g.remaining=Math.max(30000,g.remaining-amount*1000);p.shame=Math.max(0,p.shame-1);}
 if(c.effect==='shield'||c.effect==='blockNextChallenge'){const e=g.effects.find(e=>e.status==='active'&&isChallenge(e)&&e.target===p.id&&e.turn===g.turn);if(e)e.status='cancelled';else if(c.effect==='shield')p.shame=Math.max(0,p.shame-1);else addEffect(g,p,c,p);}
 const mechanical=['blockSwap','shorten','limitAction','openEvidence','blockCorruption','blockTime','blockRefute','blockTwist'];
 if(mechanical.includes(c.effect)){const protection=c.effect==='shorten'?active(g,'protectTime',other!.id,g.turn+1):c.effect==='blockSwap'?active(g,'protectSwap',other!.id,g.turn+1):[];if(!protection.length)addEffect(g,p,c,other!,c.effect,g.turn+1);}
 if(c.effect==='clearSabotage')clearKind(g,p,mechanical);
 if(c.effect==='protectTime'){clearKind(g,p,['shorten']);addEffect(g,p,c,p);}
 if(c.effect==='protectSwap'){clearKind(g,p,['blockSwap']);addEffect(g,p,c,p);}
 if(c.effect==='reflectChallenge'){const e=g.effects.find(e=>e.status==='active'&&e.kind==='challenge'&&e.target===p.id&&e.turn===g.turn);if(e){e.status='cancelled';if(g.turn<5&&!e.reflected){const reflected=addEffect(g,p,card(e.card),other!,'challenge',g.turn+1);reflected.instruction=actorInstruction(e);reflected.reflected=true;}}}
 if(c.effect==='simplifyChallenge'){const e=g.effects.find(e=>e.status==='active'&&isChallenge(e)&&e.target===p.id&&e.turn===g.turn);if(e)e.instruction=actorInstruction(e).split('. ')[0]+'.';}
 if(['tradeChallenge','rehearse'].includes(c.effect)){
  const old=g.effects.find(e=>e.status==='active'&&isChallenge(e)&&e.target===p.id&&e.turn===g.turn);
  if(old||c.effect==='rehearse'){if(old)old.status='cancelled';const choices=cards.filter(q=>q.effect==='challengeSelf'&&q.id!==old?.card);addEffect(g,p,choices[randomInt(choices.length)],p,'challengeSelf');}
 }
 if(isChallenge({kind:c.effect} as Effect))addEffect(g,p,c,c.effect==='challengeSelf'?p:other!,c.effect,c.effect==='challengeSelf'?g.turn:g.turn+1);

 break;}
 case 'swap':ensure(g.phase==='ready'&&speaker(g).id===p.id&&!p.prepared&&(!p.swapped||(p.extraSwaps||0)>0),'Troque uma carta na preparação, antes de confirmar que está pronto.');ensure(!active(g,'blockSwap',p.id).length,'Sua troca está bloqueada por uma sabotagem nesta preparação.');ensure(p.hand.includes(a.card),'Carta inválida.');replaceCard(g,p,a.card);if(p.swapped)p.extraSwaps!--;else p.swapped=true;break;
 case 'bluff':{
 ensure(g.phase==='speaking'&&!g.paused&&isLaw&&speaker(g).id!==p.id,'Contestação indisponível.');const pres=g.presentations.find(x=>x.id===a.presentation);ensure(pres&&pres.author===speaker(g).id&&pres.turn===g.turn&&!pres.contested,'Essa apresentação não pode ser contestada.');pres.contested=true;pres.revealed=true;stopClock(g,now);
 if(g.players.length===2){const original=pres.claim==='original';const truth=pres.seal;const lied=original!==truth;const loser=lied?g.players.find(x=>x.id===pres.author)!:p;const winner=lied?p:g.players.find(x=>x.id===pres.author)!;bluffConsequences(g,winner,loser,lied);winner.mission++;log(g,`BLEFE: selo real ${truth?'ORIGINAL':'TROCADO'}. ${winner.name} ganhou 1 ponto.`);resume(g,now);}else{g.phase='bluff';g.challenge={presentation:pres.id,challenger:p.id};log(g,`${p.name} gritou BLEFE! O texto original foi revelado.`);}break;}
 case 'judgeBluff':{
 ensure(g.phase==='bluff'&&p.role==='juiz'&&typeof a.lied==='boolean','Decisão indisponível.');const pres=g.presentations.find(x=>x.id===g.challenge!.presentation)!;let lied=a.lied;const f=forcedBluff(g);ensure(!f||a.lied===f.lied,'Esta opção está bloqueada pela ordem ativa. '+(f?.reason||''));if(f){lied=f.lied;consume(f.order,`Decisão aplicada: ${lied?'HOUVE BLEFE':'NÃO HOUVE BLEFE'}, favorecendo ${g.players.find(q=>q.id===f.order.author)!.name}.`);}
 const loser=g.players.find(x=>x.id===(lied?pres.author:g.challenge!.challenger))!;const winner=g.players.find(x=>x.id===(lied?g.challenge!.challenger:pres.author))!;bluffConsequences(g,winner,loser,lied);log(g,`${lied?'Houve blefe':'Contestação rejeitada'}: ${loser.name} recebe uma Ficha de Vergonha. ${winner.name} ganha 1 ponto.`);g.challenge=undefined;g.phase='speaking';resume(g,now);break;}
 case 'denounce':{
 ensure(isLaw&&g.players.length>2&&['ready','speaking','review'].includes(g.phase)&&!p.denounced&&!g.judgeUnderWatch,'Denúncia indisponível: o juiz pode já estar sob fiscalização.');
 p.denounced=true;const magistrate=g.players.find(q=>q.role==='juiz')!;const running=!!g.deadline;if(running)stopClock(g,now);
 notice(g,'denounced','DENUNCIARAM O JUIZ!',`${p.name} denunciou ${magistrate.name}. A investigação verifica somente os favores enviados por ${other!.name}.`,[],now);
 const found=g.effects.filter(e=>e.author===other!.id&&card(e.card).type==='Corrupção');
 if(found.length){
  g.judgeUnderWatch=true;for(const e of g.effects)if(card(e.card).type==='Corrupção'&&e.status==='active'){e.status='cancelled';e.note='Ordem anulada pela Corregedoria.';}
  points(g,p,2,'Denúncia de corrupção procedente');points(g,magistrate,-2,'Corrupção descoberta');other!.penalty=1;
  if(speaker(g).id===p.id&&['ready','speaking'].includes(g.phase))g.remaining=Math.min(90000,g.remaining+10000);else p.pendingSeconds=Math.min(20,(p.pendingSeconds||0)+10);
  const details=[`Cartas comprovadas: ${found.map(e=>card(e.card).name).join(', ')}.`,`${magistrate.name} perdeu os poderes especiais e até 2 pontos. Todos os favorecimentos ativos foram anulados; novas corrupções estão bloqueadas até o próximo caso.`,`${other!.name} perde uma ação na próxima preparação.`,`${p.name} ganhou 2 pontos utilizáveis e 10 segundos na fala atual ou na próxima fala como advogado.`];
  notice(g,'corruption','CORRUPÇÃO CONFIRMADA!',`${magistrate.name} está sob fiscalização da Corregedoria até o fim deste julgamento.`,details,now);
  log(g,`CORRUPÇÃO! ${p.name} denunciou corretamente ${magistrate.name}. Poderes confiscados; ${other!.name} perde uma ação. +2 pontos e +10 segundos para ${p.name}.`);
 }else{
  p.penalty=1;notice(g,'falseDenounce','DENÚNCIA IMPROCEDENTE!',`Não foram encontrados favores de ${other!.name} para ${magistrate.name}.`,[`${p.name} perde uma ação na próxima preparação. O juiz mantém seus poderes.`],now);log(g,`Denúncia falsa de ${p.name}! Uma ação a menos na próxima fala.`);
 }
 if(running)resume(g,now);break;
 }

 case 'review':{
 ensure(g.phase==='review'&&p.role==='juiz','Só o juiz avalia os desafios.');const e=g.effects.find(e=>e.id===a.effect&&e.status==='active'&&e.turn===g.turn);ensure(e&&['challenge','challengeSelf'].includes(e.kind)&&typeof a.passed==='boolean','Desafio inválido.');const target=g.players.find(q=>q.id===e.target)!;let passed=a.passed;const forced=forcedReview(g,e);ensure(!forced||a.passed===forced.passed,'Esta avaliação está bloqueada pela ordem ativa. '+(forced?.reason||''));if(forced){passed=forced.passed;consume(forced.order,`Tarefa de ${target.name} ${passed?'aprovada':'reprovada'} automaticamente pela ordem.`);}e.status='consumed';if(passed){points(g,target,1,'Tarefa de atuação cumprida');log(g,`${target.name} cumpriu o desafio: +1 ponto.`);}else{shame(g,target);log(g,`${target.name} falhou no desafio: uma Ficha de Vergonha.`);}break;}
 case 'nextTurn':ensure(g.phase==='review'&&p.role==='juiz','Aguarde o juiz.');ensure(!g.effects.some(e=>e.status==='active'&&['challenge','challengeSelf'].includes(e.kind)&&e.turn===g.turn),'Avalie os desafios primeiro.');advance(g);break;
 case 'juryReveal':ensure(p.role==='jurado'&&!p.juryRevealUsed&&['ready','speaking'].includes(g.phase),'O jurado pode abrir uma prova por julgamento.');{const pres=g.presentations.find(x=>x.id===a.presentation&&x.turn===g.turn&&!x.revealed);ensure(pres,'Esta prova não pode ser aberta.');pres.revealed=true;p.juryRevealUsed=true;log(g,`${p.name} usou Vista dos Autos: o conteúdo original de uma prova foi aberto para todos.`);}break;
 case 'question':ensure(p.role==='jurado'&&!p.question&&['ready','speaking'].includes(g.phase),'Uma pergunta por jurado em cada julgamento.');p.question=true;log(g,`${p.name} pediu esclarecimento: ${String(a.text||'Como essa prova se relaciona ao caso?').slice(0,180)}`);break;
 case 'vote':{
 ensure(g.phase==='verdict'&&['acusação','defesa'].includes(a.vote),'Votação indisponível.');const jury=g.players.filter(q=>q.role==='jurado');if(p.role==='jurado'){ensure(!g.votes[p.id],'Seu voto já foi registrado.');g.votes[p.id]=a.vote;if(jury.every(q=>g.votes[q.id])){const aVotes=Object.values(g.votes).filter(v=>v==='acusação').length;if(aVotes*2!==jury.length)finish(g,aVotes*2>jury.length?'acusação':'defesa');}}else{ensure(p.role==='juiz','Somente juiz e jurados votam.');ensure(!jury.length||(jury.every(q=>g.votes[q.id])&&Object.values(g.votes).filter(v=>v==='acusação').length*2===jury.length),'O juiz só desempata após todos os jurados votarem.');finish(g,a.vote);}break;}
 case 'nextRound':ensure(p.id===g.host&&g.phase==='result','Aguarde o anfitrião.');if(g.round>=g.rounds){g.phase='finished';log(g,'Fim da temporada! A justiça foi descansar.');}else round(g);break;
 case 'restart':ensure(p.id===g.host&&g.phase==='finished','Somente o anfitrião reinicia.');g.round=0;g.players.forEach(p=>{p.score=0;p.penalty=0;p.swapPenalty=false;p.pendingSeconds=0;p.spentPerkAt=undefined;});g.scoreLedger=[];round(g);break;
 case 'consumeFavor':ensure(p.role==='juiz','Ação reservada ao juiz.');{const e=g.effects.find(e=>e.id===a.effect&&e.kind==='favor'&&e.status==='active');ensure(e,'Ordem inválida.');consume(e,`O juiz confirmou que defendeu verbalmente o argumento de ${g.players.find(p=>p.id===e.author)!.name}.`);}break;
 case 'heartbeat':break;
 default:throw new Error('Ação desconhecida.');
 }
 return g;
}
export function view(g:Game,secret:string,now=Date.now()){
 const p=g.players.find(p=>p.secret===hash(secret));ensure(p,'Sessão não encontrada.');
 const done=['result','finished'].includes(g.phase);return {code:g.code,revision:g.revision,host:g.host,phase:g.phase,round:g.round,rounds:g.rounds,seconds:g.seconds,turn:g.turn,case:cases[g.caseId],remaining:g.remaining,deadline:g.deadline,paused:g.paused,serverTime:now,winner:g.winner,judgeUnderWatch:!!g.judgeUnderWatch,notices:g.notices||[],scoreLedger:g.scoreLedger||[],judgePowers:p.role==='juiz'?judgePowers.map(power=>({...power,used:!!g.judgePowersUsed?.includes(power.id),blockedReason:powerReason(g,power.id,now)})):undefined,pointPerks:pointPerks.map(perk=>({...perk,blockedReason:perkReason(g,p,perk.id,perk.cost)})),me:{...p,secret:undefined,hand:p.hand.map(c=>({...card(c),blockedReason:blockedCard(g,p,card(c))})),swapBlocked:active(g,'blockSwap',p.id).length>0},players:g.players.map(({id,name,role,score,shame,seen,prepared})=>({id,name,role,score,shame,prepared:!!prepared,online:now-seen<15000})),effects:g.effects.filter(e=>{
  if(card(e.card).type==='Corrupção')return done||p.role==='juiz'||e.author===p.id;
  if(isChallenge(e)){if(p.role==='juiz')return done||g.phase==='review'&&e.turn===g.turn;return done||p.id===e.author||p.id===e.target;}
  return true;
 }).map(e=>{
  if(!isChallenge(e))return {...e,instruction:card(e.card).type==='Corrupção'?corruptInstruction(g,e):e.target===p.id?e.instruction.replace('Na próxima preparação do adversário','Na sua próxima preparação').replace('a próxima fala do adversário','a sua próxima fala').replace('Na próxima fala do adversário','Na sua próxima fala').replace('que ele apresentar','que você apresentar').replace('a fala dele','a sua fala').replace('Ele continua','Você continua'):e.instruction,card:card(e.card)};
  const target=g.players.find(q=>q.id===e.target)!;
  const own=p.id===e.target;
  const instruction=actorInstruction(e);
  const message=own?(g.turn===e.turn&&g.phase==='review'?instruction.replace('Na sua próxima fala, encene ','Nesta fala, você deveria encenar '):g.turn===e.turn&&['speaking','bluff'].includes(g.phase)?instruction.replace('Na sua próxima fala,','Nesta fala,'):instruction):`${target.name} (${target.role}) ${g.phase==='review'?'deveria':'deve'} ${instruction.replace('Na sua próxima fala, encene ','encenar ')}`;
  return {...e,instruction:message,targetName:target.name,card:{...card(e.card),text:message}};
 }),presentations:g.presentations.map(x=>({...x,card:x.revealed||x.author===p.id||done?card(x.card):{name:card(x.card).name,icon:card(x.card).icon,type:card(x.card).type},seal:g.players.length===2&&(x.author===p.id||x.revealed)?x.seal?'ORIGINAL':'TROCADO':undefined})),judgeControls:p.role==='juiz'?{bluff:(()=>{const f=forcedBluff(g);return f?{lied:f.lied,reason:f.reason}:null;})(),reviews:Object.fromEntries(g.phase==='review'?g.effects.filter(e=>isChallenge(e)&&e.status==='active'&&e.turn===g.turn).map(e=>{const f=forcedReview(g,e);return [e.id,f?{passed:f.passed,reason:f.reason}:null];}):[]),pauseBlocked:!!pauseOrder(g)}:undefined,challenge:g.challenge,logs:g.logs,votes:Object.keys(g.votes),myVote:g.votes[p.id]};
}
