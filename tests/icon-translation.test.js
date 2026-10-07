import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import translate from '../icon-translation.cjs';
test('translation adapter: unavailable, real provider contract, errors and origin',async()=>{
 const oldUrl=process.env.ICON_TRANSLATION_URL,oldKey=process.env.ICON_TRANSLATION_API_KEY;
 let providerBody,fail=false;const provider=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;providerBody=JSON.parse(body);res.writeHead(fail?500:200,{'Content-Type':'application/json'});res.end(JSON.stringify({translatedText:'dragon fruit'}));});
 const server=createServer(translate);await new Promise(r=>provider.listen(0,'127.0.0.1',r));await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const post=(text,extra={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify({text})});
 try{delete process.env.ICON_TRANSLATION_URL;assert.equal((await post('pitaya')).status,503);process.env.ICON_TRANSLATION_URL=`http://127.0.0.1:${provider.address().port}/translate`;process.env.ICON_TRANSLATION_API_KEY='test-only';const r=await post('pitaya');assert.deepEqual(await r.json(),{translation:'dragon fruit'});assert.equal(providerBody.source,'es');assert.equal(providerBody.target,'en');assert.equal(providerBody.q,'pitaya');assert.equal(providerBody.api_key,'test-only');assert.equal((await post('pitaya',{Origin:'https://other.example'})).status,403);assert.equal((await post('x'.repeat(121))).status,400);fail=true;assert.equal((await post('pitaya')).status,502);}finally{if(oldUrl===undefined)delete process.env.ICON_TRANSLATION_URL;else process.env.ICON_TRANSLATION_URL=oldUrl;if(oldKey===undefined)delete process.env.ICON_TRANSLATION_API_KEY;else process.env.ICON_TRANSLATION_API_KEY=oldKey;await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>provider.close(r))]);}
});
