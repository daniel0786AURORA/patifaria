import {randomBytes, randomInt} from 'node:crypto';
import {createGame,addPlayer,act,tick,view,hash,type Game} from '../src/engine.ts';
import type {IncomingMessage,ServerResponse} from 'node:http';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function rpc(operation:string,code:string,state:Game|null=null,revision=-1){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY,backend=process.env.GAME_BACKEND_KEY;
 if(!url||!key||!backend)throw new Error('O tribunal está em manutenção. Tente novamente em instantes.');
 const res=await fetch(`${url}/rest/v1/rpc/patifaria_storage`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({backend_key:backend,operation,room_code:code,new_state:state,expected_revision:revision}),signal:AbortSignal.timeout(12000)});
 if(!res.ok){console.error('storage',res.status);throw new Error('Não foi possível acessar o tribunal. Tente novamente.');}return await res.json();
}
export default async function handler(req:IncomingMessage&{body?:any},res:ServerResponse){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(req.method!=='POST'){res.statusCode=405;res.end(JSON.stringify({error:'Método inválido.'}));return;}
 try{
 let b=req.body;if(typeof b==='string')b=JSON.parse(b);if(!b){let raw='';for await(const c of req){raw+=c;if(raw.length>10000)throw new Error('Pedido muito grande.');}b=JSON.parse(raw);}
 if(JSON.stringify(b).length>10000)throw new Error('Pedido muito grande.');
 if(b.type==='create'){
 const token=randomBytes(32).toString('hex');let g:Game;for(let tries=0;;tries++){if(tries>5)throw new Error('Não foi possível criar a sala.');const code=Array.from({length:5},()=>alphabet[randomInt(alphabet.length)]).join('');g=createGame(code,String(b.name||''),token);if(await rpc('create',code,g))break;}
 res.end(JSON.stringify({token,game:view(g!,token)}));return;
 }
 const code=String(b.code||'').toUpperCase();if(!/^[A-Z2-9]{5}$/.test(code))throw new Error('Informe um código de 5 caracteres.');
 const token=b.type==='join'?randomBytes(32).toString('hex'):String(b.token||'');if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Entre novamente no tribunal.');
 for(let retry=0;retry<8;retry++){
 const g:Game=await rpc('get',code);if(!g)throw new Error('Tribunal não encontrado ou expirado.');
 const rev=g.revision;let changed=false;
 if(b.type==='join'){addPlayer(g,String(b.name||''),token);changed=true;}
 else if(b.type==='poll'){
 view(g,token);const phase=g.phase;tick(g);changed=g.phase!==phase;
 const me=g.players.find(p=>p.secret=== hash(token))!;
 if(Date.now()-me.seen>7000){me.seen=Date.now();changed=true;}
 }else{
 if(typeof b.requestId!=='string'||b.requestId.length>80)throw new Error('Pedido inválido.');
 if(!g.requests.includes(b.requestId)){act(g,token,b);g.requests.push(b.requestId);g.requests=g.requests.slice(-200);changed=true;}
 }
 if(changed){g.revision++;if(!await rpc('save',code,g,rev))continue;}
 res.end(JSON.stringify({token:b.type==='join'?token:undefined,game:view(g,token)}));return;
 }
 res.statusCode=409;res.end(JSON.stringify({error:'Muita movimentação no tribunal. Tente de novo.'}));
 }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e instanceof Error?e.message:'Ocorreu um erro.'}));}
}
