import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
export function makeServer(store){
 return createServer(async(req,res)=>{
  const send=(status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(type==='application/json'?JSON.stringify(data):data)};
  try{
   const url=new URL(req.url,'http://localhost');
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'Cross-origin request rejected.'});
   let body={};if(req.method==='POST'){
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>32000)return send(413,{error:'Request exceeds 32 KB.'});}body=JSON.parse(raw);
    if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Body must be an object.');
   }
   if(url.pathname==='/api/flags'&&req.method==='GET')return send(200,store.list());
   if(url.pathname==='/api/flags'&&req.method==='POST')return send(200,store.save(body));
   if(url.pathname==='/api/evaluate'&&req.method==='POST')return send(200,store.assign(body.key,body.userId,body.attributes));
   if(url.pathname==='/api/conversions'&&req.method==='POST')return send(200,store.convert(body.exposure_id));
   if(url.pathname==='/api/summary'&&req.method==='GET')return send(200,store.summary(url.searchParams.get('key'),Number(url.searchParams.get('version'))));
   const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
   if(req.method==='GET'&&files[url.pathname]){const [file,type]=files[url.pathname];return send(200,await readFile(new URL('../public/'+file,import.meta.url)),type);}
   send(404,{error:'Not found.'});
  }catch(error){send(400,{error:error.message});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const store=new Store(process.env.FLAGS_DB||'data/flags.json');
 makeServer(store).listen(Number(process.env.PORT||3100),'127.0.0.1',()=>console.log('FeatureFlag Lab: http://127.0.0.1:'+(process.env.PORT||3100)));
}
