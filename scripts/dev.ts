import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
try{for(const line of readFileSync('.env.local','utf8').split('\n')){const i=line.indexOf('=');if(i>0)process.env[line.slice(0,i)]=line.slice(i+1);}}catch{}
const server=await createServer({server:{host:'127.0.0.1',port:5173},plugins:[{name:'game-api',configureServer(s){s.middlewares.use('/api/game',async(req,res)=>{const {default:handler}=await import('../api/game.ts');await handler(req,res);});}}]});
await server.listen();server.printUrls();
