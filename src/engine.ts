import { randomInt, randomUUID, createHash } from 'node:crypto';
import {cards,cases,type Card} from './content.js';
export type Role='juiz'|'acusação'|'defesa'|'jurado';
type Player={id:string;secret:string;name:string;role:Role;score:number;shame:number;penalty:number;used:number;swapped:boolean;prepared?:boolean;denounced:boolean;hand:string[];seals:Record<string,boolean>;seen:number;question:boolean;mission:number};
type Effect={id:string;card:string;author:string;target:string;kind:string;status:'active'|'consumed'|'cancelled'|'expired';turn:number;instruction:string};
type Presentation={id:string;card:string;author:string;contested:boolean;revealed:boolean;turn:number;claim?:string;seal?:boolean};
export type Game={code:string;revision:number;host:string;players:Player[];phase:'lobby'|'ready'|'speaking'|'bluff'|'review'|'verdict'|'result'|'finished';round:number;rounds:number;seconds:number;turn:number;caseId:number;usedCases:number[];deck:string[];discard:string[];remaining:number;deadline:number|null;paused:boolean;effects:Effect[];presentations:Presentation[];challenge?:{presentation:string;challenger:string};logs:{id:string;text:string}[];votes:Record<string,string>;winner?:string;requests:string[];created:number;};
const cardMap=new Map(cards.map(c=>[c.id,c]));
export const card=(id:string)=>cardMap.get(id)!;
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function ensure(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
function shuffle<T>(items:T[]){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function log(g:Game,text:string){g.logs.push({id:randomUUID(),text});g.logs=g.logs.slice(-90);}
export function addPlayer(g:Game,name:string,secret:string){ensure(g.phase==='lobby','A sessão já começou.');ensure(g.players.length<10,'Este tribunal está lotado.');name=name.trim().slice(0,22);ensure(name.length>=2,'Use um apelido com pelo menos 2 letras.');ensure(!g.players.some(p=>p.name.toLowerCase()===name.toLowerCase()),'Esse apelido já está no tribunal.');const p:Player={id:randomUUID(),secret:hash(secret),name,role:'jurado',score:0,shame:0,penalty:0,used:0,swapped:false,denounced:false,hand:[],seals:{},seen:Date.now(),question:false,mission:0};g.players.push(p);log(g,`${name} entrou no tribunal.`);return p;}
export function createGame(code:string,name:string,secret:string):Game{const g:Game={code,revision:0,host:'',players:[],phase:'lobby',round:0,rounds:3,seconds:60,turn:0,caseId:0,usedCases:[],deck:[],discard:[],remaining:60000,deadline:null,paused:false,effects:[],presentations:[],logs:[],votes:{},requests:[],created:Date.now()};g.host=addPlayer(g,name,secret).id;return g;}
function draw(g:Game):string{if(!g.deck.length){g.deck=shuffle(g.discard);g.discard=[];}ensure(g.deck.length,'Baralho vazio.');return g.deck.pop()!;}
export function speaker(g:Game){return g.players.find(p=>p.role===(g.turn%2===0?'acusação':'defesa'))!;}
function judge(g:Game,p:Player){return p.role==='juiz'||(g.players.length===2&&p.id===speaker(g).id);}
function deal(g:Game,p:Player){g.discard.push(...p.hand);p.hand=Array.from({length:4},()=>draw(g));p.used=0;p.swapped=false;p.prepared=false;p.seals={};for(const id of p.hand)p.seals[id]=randomInt(2)===0;}
function prepareSpeaker(g:Game){const p=speaker(g);p.prepared=false;p.used=Math.min(1,p.penalty);p.penalty=0;}
function isChallenge(e:Effect){return e.kind==='challenge'||e.kind==='challengeSelf';}
function actorInstruction(e:Effect){return card(e.card).text.replace(/^Na próxima fala, o adversário deve argumentar como /,'Na sua próxima fala, encene ').replace(/^Interprete /,'Na sua próxima fala, encene ').replace(/ O juiz avalia ao final:.*$/,'');}

function round(g:Game){g.round++;g.turn=0;g.phase='ready';g.effects=[];g.presentations=[];g.votes={};g.winner=undefined;g.challenge=undefined;g.paused=false;g.deadline=null;g.remaining=g.seconds*1000;const pool=cases.filter(c=>!g.usedCases.includes(c.id));if(!pool.length)g.usedCases=[];g.caseId=shuffle(pool.length?pool:cases)[0].id;g.usedCases.push(g.caseId);g.deck=shuffle(cards.filter(c=>g.players.length>2||c.duel).map(c=>c.id));g.discard=[];
const n=g.players.length;for(let i=0;i<n;i++){const p=g.players[i];const offset=(i-(g.round-1)%n+n)%n;p.role=n===2?(offset===0?'acusação':'defesa'):offset===0?'juiz':offset===1?'acusação':offset===2?'defesa':'jurado';p.hand=[];p.seals={};p.shame=0;p.penalty=0;p.used=0;p.denounced=false;p.question=false;p.mission=0;if(p.role==='acusação'||p.role==='defesa')deal(g,p);}
prepareSpeaker(g);log(g,`Julgamento ${g.round}: ${cases[g.caseId].title}. Papéis distribuídos!`);}
function stopClock(g:Game,now:number){if(g.deadline){g.remaining=Math.max(0,g.deadline-now);g.deadline=null;}}
function resume(g:Game,now:number){if(!g.paused)g.deadline=now+g.remaining;}
function shame(g:Game,p:Player){p.shame++;if(p.shame>=3){p.shame=0;p.penalty=1;log(g,`${p.name} juntou 3 Fichas de Vergonha: uma ação a menos na próxima fala.`);}}
function endTurn(g:Game){g.remaining=0;g.deadline=null;g.paused=false;g.phase='review';log(g,`Encerrou a fala de ${speaker(g).name}.`);if(g.players.length===2)advance(g);}
function advance(g:Game){
 for(const e of g.effects)if(e.status==='active'&&isChallenge(e)&&e.turn===g.turn)e.status='expired';
 if(g.turn===5){g.phase='verdict';if(g.players.length===2){const [a,b]=g.players;finish(g,a.mission===b.mission?'empate':a.mission>b.mission?a.role:b.role);}}
 else{
  const renew=g.turn%2===1;g.turn++;g.phase='ready';g.paused=false;g.deadline=null;g.remaining=g.seconds*1000;
  if(renew){for(const p of g.players)if(p.role==='acusação'||p.role==='defesa')deal(g,p);log(g,'As duas falas terminaram: mãos renovadas para acusação e defesa.');}
  prepareSpeaker(g);
 }
}

function finish(g:Game,winner:string){g.winner=winner;g.phase='result';g.effects.forEach(e=>{if(e.status==='active')e.status='expired';});for(const p of g.players){if(p.role===winner)p.score+=3;if(p.role==='jurado'&&g.votes[p.id]===winner)p.score++;}log(g,`Veredito: ${winner==='empate'?'empate':winner==='acusação'?'CULPADO!':'INOCENTE!'} Vitória judicial vale 3 pontos.`);}
export function tick(g:Game,now=Date.now()){if(g.phase==='speaking'&&g.deadline&&now>=g.deadline)endTurn(g);}
export function act(g:Game,secret:string,a:Record<string,any>,now=Date.now()){
 const p=g.players.find(p=>p.secret===hash(secret));ensure(p,'Sessão não encontrada. Entre novamente.');tick(g,now);p.seen=now;
 const isLaw=p.role==='acusação'||p.role==='defesa';const other=g.players.find(q=>q.role===(p.role==='acusação'?'defesa':'acusação'));
 switch(a.type){
 case 'configure':ensure(p.id===g.host&&g.phase==='lobby','Somente o anfitrião configura a sala.');ensure([1,2,3,4,5,6,8,10].includes(a.rounds)&&[30,45,60,90].includes(a.seconds),'Configuração inválida.');g.rounds=a.rounds;g.seconds=a.seconds;break;
 case 'start':ensure(p.id===g.host&&g.phase==='lobby','Somente o anfitrião pode iniciar.');ensure(g.players.length>=2,'Convide pelo menos mais uma pessoa.');round(g);break;
 case 'prepared':ensure(g.phase==='ready'&&speaker(g).id===p.id&&!p.prepared,'Só quem vai falar pode concluir a preparação.');p.prepared=true;log(g,`${p.name} terminou de preparar suas cartas.`);break;
 case 'begin':ensure(g.phase==='ready'&&judge(g,p),'Aguarde o juiz iniciar a fala.');ensure(speaker(g).prepared,'Aguarde o advogado confirmar que está pronto para falar.');g.phase='speaking';g.paused=false;g.deadline=now+g.remaining;log(g,`${speaker(g).name} está com a palavra.`);break;
 case 'pause':ensure(g.phase==='speaking'&&judge(g,p),'Só o juiz pode controlar o relógio.');if(g.paused){g.paused=false;resume(g,now);}else{stopClock(g,now);g.paused=true;}log(g,g.paused?'Ordem no tribunal! Relógio pausado.':'O relógio foi retomado.');break;
 case 'end':ensure(g.phase==='speaking'&&judge(g,p),'Só o juiz encerra a fala.');endTurn(g);break;
 case 'play':{
 ensure(g.phase==='ready'&&speaker(g).id===p.id&&!p.prepared,'Jogue suas cartas na preparação, antes de confirmar que está pronto.');ensure(p.used<2,'Você já usou suas ações desta fala.');ensure(p.hand.includes(a.card),'Essa carta não está na sua mão.');const c=card(a.card);ensure(g.players.length>2||c.duel,'Carta indisponível no Duelo.');ensure(c.effect!=='challenge'||g.turn<5,'Não há próxima fala para esse desafio.');p.hand.splice(p.hand.indexOf(c.id),1);p.used++;g.discard.push(c.id);
 if(c.type==='Corrupção'){const j=g.players.find(q=>q.role==='juiz')!;g.effects.push({id:randomUUID(),card:c.id,author:p.id,target:j.id,kind:c.effect,status:'active',turn:g.turn,instruction:c.text});break;}
 log(g,['challenge','challengeSelf'].includes(c.effect)?`${p.name} preparou uma carta de atuação.`:`${p.name} preparou ${c.name}.`);
 if(c.effect==='present'){
 const pres:Presentation={id:randomUUID(),card:c.id,author:p.id,contested:false,turn:g.turn,revealed:g.players.length===2};if(g.players.length===2){ensure(['original','trocado'].includes(a.claim),'No Duelo, declare ORIGINAL ou TROCADO.');pres.claim=a.claim;pres.seal=p.seals[c.id];pres.revealed=false;}
 g.presentations.push(pres);p.mission++;if(g.players.length===2)p.score++;}
 if(c.effect==='time'){g.remaining=Math.min(90000,g.remaining+[5000,8000,10000,12000][Math.floor(Number(c.id.split('-')[1])/25)]);}
 if(c.effect==='redraw'&&p.hand.length){const idx=randomInt(p.hand.length);g.discard.push(...p.hand.splice(idx,1));p.hand.push(draw(g));p.seals[p.hand.at(-1)!]=randomInt(2)===0;}
 if(c.effect==='shield'){const e=g.effects.find(e=>e.status==='active'&&isChallenge(e)&&e.target===p.id&&e.turn===g.turn);if(e){e.status='cancelled';log(g,'O desafio foi refutado.');}else p.shame=Math.max(0,p.shame-1);}
 if(c.effect==='challenge'||c.effect==='challengeSelf'){const target=c.effect==='challengeSelf'?p:other!;g.effects.push({id:randomUUID(),card:c.id,author:p.id,target:target.id,kind:c.effect,status:'active',turn:c.effect==='challengeSelf'?g.turn:g.turn+1,instruction:c.text});}
 break;}
 case 'swap':ensure(g.phase==='ready'&&speaker(g).id===p.id&&!p.prepared&&!p.swapped,'Troque uma carta na preparação, antes de confirmar que está pronto.');ensure(p.hand.includes(a.card),'Carta inválida.');g.discard.push(...p.hand.splice(p.hand.indexOf(a.card),1));p.hand.push(draw(g));p.seals[p.hand.at(-1)!]=randomInt(2)===0;p.swapped=true;break;
 case 'bluff':{
 ensure(g.phase==='speaking'&&!g.paused&&isLaw&&speaker(g).id!==p.id,'Contestação indisponível.');const pres=g.presentations.find(x=>x.id===a.presentation);ensure(pres&&pres.author===speaker(g).id&&pres.turn===g.turn&&!pres.contested,'Essa apresentação não pode ser contestada.');pres.contested=true;pres.revealed=true;stopClock(g,now);
 if(g.players.length===2){const original=pres.claim==='original';const truth=pres.seal;const lied=original!==truth;const loser=lied?g.players.find(x=>x.id===pres.author)!:p;shame(g,loser);const winner=lied?p:g.players.find(x=>x.id===pres.author)!;winner.score++;winner.mission++;log(g,`BLEFE: selo real ${truth?'ORIGINAL':'TROCADO'}. ${winner.name} ganhou 1 ponto.`);resume(g,now);}else{g.phase='bluff';g.challenge={presentation:pres.id,challenger:p.id};log(g,`${p.name} gritou BLEFE! O texto original foi revelado.`);}break;}
 case 'judgeBluff':{
 ensure(g.phase==='bluff'&&p.role==='juiz'&&typeof a.lied==='boolean','Decisão indisponível.');const pres=g.presentations.find(x=>x.id===g.challenge!.presentation)!;let lied=a.lied;const f=[...g.effects].reverse().find(e=>e.kind==='forceBluff'&&e.status==='active');if(f){lied=f.author!==pres.author;f.status='consumed';}
 const loser=g.players.find(x=>x.id===(lied?pres.author:g.challenge!.challenger))!;const winner=g.players.find(x=>x.id===(lied?g.challenge!.challenger:pres.author))!;shame(g,loser);winner.score++;log(g,`${lied?'Houve blefe':'Contestação rejeitada'}: ${loser.name} recebe uma Ficha de Vergonha. ${winner.name} ganha 1 ponto.`);g.challenge=undefined;g.phase='speaking';resume(g,now);break;}
 case 'denounce':{
 ensure(isLaw&&g.players.length>2&&['ready','speaking','review'].includes(g.phase)&&!p.denounced,'Denúncia indisponível.');p.denounced=true;const found=g.effects.filter(e=>e.author===other!.id&&card(e.card).type==='Corrupção');if(found.length){for(const e of found)if(e.status==='active')e.status='cancelled';p.score+=2;log(g,`CORRUPÇÃO! ${p.name} denunciou corretamente: ${found.map(e=>card(e.card).name).join(', ')}. +2 pontos. Efeitos ativos cancelados.`);}else{p.penalty=1;log(g,`Denúncia falsa de ${p.name}! Uma ação a menos na próxima fala.`);}break;}
 case 'review':{
 ensure(g.phase==='review'&&p.role==='juiz','Só o juiz avalia os desafios.');const e=g.effects.find(e=>e.id===a.effect&&e.status==='active'&&e.turn===g.turn);ensure(e&&['challenge','challengeSelf'].includes(e.kind)&&typeof a.passed==='boolean','Desafio inválido.');const target=g.players.find(q=>q.id===e.target)!;let passed=a.passed;const forced=[...g.effects].reverse().find(x=>x.status==='active'&&((x.kind==='forceApprove'&&x.author===target.id)||(x.kind==='forceReject'&&x.author!==target.id)));if(forced){passed=forced.kind==='forceApprove';forced.status='consumed';}e.status='consumed';if(passed){target.score++;log(g,`${target.name} cumpriu o desafio: +1 ponto.`);}else{shame(g,target);log(g,`${target.name} falhou no desafio: uma Ficha de Vergonha.`);}break;}
 case 'nextTurn':ensure(g.phase==='review'&&p.role==='juiz','Aguarde o juiz.');ensure(!g.effects.some(e=>e.status==='active'&&['challenge','challengeSelf'].includes(e.kind)&&e.turn===g.turn),'Avalie os desafios primeiro.');advance(g);break;
 case 'question':ensure(p.role==='jurado'&&!p.question&&['ready','speaking'].includes(g.phase),'Uma pergunta por jurado em cada julgamento.');p.question=true;log(g,`${p.name} pediu esclarecimento: ${String(a.text||'Como essa prova se relaciona ao caso?').slice(0,180)}`);break;
 case 'vote':{
 ensure(g.phase==='verdict'&&['acusação','defesa'].includes(a.vote),'Votação indisponível.');const jury=g.players.filter(q=>q.role==='jurado');if(p.role==='jurado'){ensure(!g.votes[p.id],'Seu voto já foi registrado.');g.votes[p.id]=a.vote;if(jury.every(q=>g.votes[q.id])){const aVotes=Object.values(g.votes).filter(v=>v==='acusação').length;if(aVotes*2!==jury.length)finish(g,aVotes*2>jury.length?'acusação':'defesa');}}else{ensure(p.role==='juiz','Somente juiz e jurados votam.');ensure(!jury.length||(jury.every(q=>g.votes[q.id])&&Object.values(g.votes).filter(v=>v==='acusação').length*2===jury.length),'O juiz só desempata após todos os jurados votarem.');finish(g,a.vote);}break;}
 case 'nextRound':ensure(p.id===g.host&&g.phase==='result','Aguarde o anfitrião.');if(g.round>=g.rounds){g.phase='finished';log(g,'Fim da temporada! A justiça foi descansar.');}else round(g);break;
 case 'restart':ensure(p.id===g.host&&g.phase==='finished','Somente o anfitrião reinicia.');g.round=0;g.players.forEach(p=>p.score=0);round(g);break;
 case 'consumeFavor':ensure(p.role==='juiz','Ação reservada ao juiz.');{const e=g.effects.find(e=>e.id===a.effect&&e.kind==='favor'&&e.status==='active');ensure(e,'Ordem inválida.');e.status='consumed';}break;
 case 'heartbeat':break;
 default:throw new Error('Ação desconhecida.');
 }
 return g;
}
export function view(g:Game,secret:string,now=Date.now()){
 const p=g.players.find(p=>p.secret===hash(secret));ensure(p,'Sessão não encontrada.');
 const done=['result','finished'].includes(g.phase);return {code:g.code,revision:g.revision,host:g.host,phase:g.phase,round:g.round,rounds:g.rounds,seconds:g.seconds,turn:g.turn,case:cases[g.caseId],remaining:g.remaining,deadline:g.deadline,paused:g.paused,serverTime:now,winner:g.winner,me:{...p,secret:undefined,hand:p.hand.map(card)},players:g.players.map(({id,name,role,score,shame,seen,prepared})=>({id,name,role,score,shame,prepared:!!prepared,online:now-seen<15000})),effects:g.effects.filter(e=>{
  if(card(e.card).type==='Corrupção')return done||p.role==='juiz'||e.author===p.id;
  if(isChallenge(e))return done||p.id===e.author||p.id===e.target||(p.role==='juiz'&&g.phase==='review'&&e.turn===g.turn);
  return true;
 }).map(e=>{
  if(!isChallenge(e))return {...e,card:card(e.card)};
  const target=g.players.find(q=>q.id===e.target)!;
  const own=p.id===e.target;
  const instruction=actorInstruction(e);
  const message=own?(g.turn===e.turn&&g.phase==='review'?instruction.replace('Na sua próxima fala, encene ','Nesta fala, você deveria encenar '):g.turn===e.turn&&['speaking','bluff'].includes(g.phase)?instruction.replace('Na sua próxima fala,','Nesta fala,'):instruction):`${target.name} (${target.role}) ${g.phase==='review'?'deveria':'deve'} ${instruction.replace('Na sua próxima fala, encene ','encenar ')}`;
  return {...e,instruction:message,targetName:target.name,card:{...card(e.card),text:message}};
 }),presentations:g.presentations.map(x=>({...x,card:x.revealed||x.author===p.id||done?card(x.card):{name:card(x.card).name,icon:card(x.card).icon,type:card(x.card).type},seal:g.players.length===2&&(x.author===p.id||x.revealed)?x.seal?'ORIGINAL':'TROCADO':undefined})),challenge:g.challenge,logs:g.logs,votes:Object.keys(g.votes),myVote:g.votes[p.id]};
}
