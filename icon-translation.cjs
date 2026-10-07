// Optional LibreTranslate-compatible endpoint, configured only by server operator.
module.exports=async function translate(req,res){
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.method!=='POST')return send(405,{error:'METHOD_NOT_ALLOWED'});
 if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'ORIGIN_NOT_ALLOWED'});
 if(!process.env.ICON_TRANSLATION_URL)return send(503,{error:'TRANSLATION_NOT_CONFIGURED'});
 let body='';try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2048)return send(413,{error:'TOO_LARGE'});}const {text}=JSON.parse(body);if(typeof text!=='string'||!text.trim()||text.length>120)return send(400,{error:'INVALID_TEXT'});
 const response=await fetch(process.env.ICON_TRANSLATION_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:text,source:'es',target:'en',format:'text',...(process.env.ICON_TRANSLATION_API_KEY?{api_key:process.env.ICON_TRANSLATION_API_KEY}:{})}),signal:AbortSignal.timeout(7000),redirect:'error'});
 if(!response.ok)throw Error('PROVIDER_ERROR');const data=await response.json();if(typeof data.translatedText!=='string'||!/^[a-z0-9 -]{1,120}$/i.test(data.translatedText.trim()))throw Error('INVALID_TRANSLATION');return send(200,{translation:data.translatedText.trim()});
 }catch{return send(502,{error:'TRANSLATION_UNAVAILABLE'});}
};
