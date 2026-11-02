import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm'};
http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'text/plain'}).end('ok');return;}
  try {
    const url=new URL(req.url,'http://localhost');
    const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end('Não encontrado');}
}).listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('BKM Projetos: http://localhost:'+(Number(process.env.PORT)||8080)));
