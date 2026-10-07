const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
try{const env=fs.readFileSync(path.join(__dirname,'.env'),'utf8');for(const line of env.split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}}catch{}
http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);return res.end('Solicitud inválida');}
 if(pathname==='/api/icon-translation')return require('./icon-translation.cjs')(req,res);
 if(pathname==='/api/config'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({firebase:process.env.FIREBASE_API_KEY?{apiKey:process.env.FIREBASE_API_KEY,authDomain:process.env.FIREBASE_AUTH_DOMAIN,projectId:process.env.FIREBASE_PROJECT_ID,appId:process.env.FIREBASE_APP_ID}:null}));}
 const allowed=pathname==='/'||['/index.html','/style.css','/enhanced.css','/iconify.css','/sw.js','/manifest.webmanifest','/icon.svg'].includes(pathname)||/^\/src\/[a-z-]+\.js$/.test(pathname)||pathname==='/data/catalog.json';
 if(!allowed){res.writeHead(404);return res.end('No encontrado');}const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(err?'No encontrado':data);});
}).listen(5173,'127.0.0.1',()=>console.log('Súper Hogar listo en http://127.0.0.1:5173'));
