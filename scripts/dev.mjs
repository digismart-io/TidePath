import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import worker from '../src/worker.js';
import { openDatabase } from './sqlite.mjs';
if(!existsSync('.local/tidepath.sqlite'))await import('./reset.mjs');
const {DB,sqlite,close}=openDatabase('.local/tidepath.sqlite');
// Additive schema update for checkouts with an existing local demo database.
for(const migration of ['0003_import_records.sql','0004_operations_and_snapshots.sql'])sqlite.exec(await readFile(new URL('../migrations/'+migration,import.meta.url),'utf8'));
const root=resolve('public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
const env={DB,DEMO_MODE:'true',ASSETS:{async fetch(request){
  let file;try{file=resolve(root,'.'+decodeURIComponent(new URL(request.url).pathname));}catch{return new Response('Bad path',{status:400});}
  if(file!==root&&!file.startsWith(root+sep))return new Response('Not found',{status:404});
  try{if((await stat(file)).isDirectory())file=resolve(file,'index.html');const data=await readFile(file);return new Response(data,{headers:{'Content-Type':types[extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}
}}};
const port=Number(process.env.PORT||8787);
const server=http.createServer(async(req,res)=>{
  try{
    const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>40000){res.writeHead(413);res.end('Request too large');return;}parts.push(chunk);}
    const request=new Request(`http://localhost:${port}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(parts)}:{})});
    const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){console.error(e);res.writeHead(500);res.end('Local server error');}
});
server.listen(port,'127.0.0.1',()=>console.log(`TidePath local preview: http://localhost:${port}\nFictional Q3 2026 · Persistent SQLite · Same Worker API as D1`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>{close();process.exit(0);}));
