const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {stripTypeScriptTypes}=require('node:module');const {webcrypto,createHash}=require('node:crypto');
const testKey='synthetic-access-code-for-security-tests';
let source=fs.readFileSync('supabase/functions/serenade-export-data/index.ts','utf8').replace(/const ACCESS_HASH = '(?:[a-f0-9]+|__DEPLOYMENT_ACCESS_HASH__)';/,"const ACCESS_HASH = '"+createHash('sha256').update(testKey).digest('hex')+"';").replace('export async function','async function');source=stripTypeScriptTypes(source);
function handler(fetch){let handle;vm.runInNewContext(source,{Request,Response,URLSearchParams,AbortSignal,TextEncoder,crypto:webcrypto,fetch,Deno:{env:{get:n=>n==='SUPABASE_URL'?'https://database.example':'server-secret'},serve:h=>handle=h}});return handle;}
const request=code=>new Request('https://example.org',{method:'POST',headers:{Origin:'https://esemmelman.github.io'},body:JSON.stringify({accessCode:code})});
test('missing and invalid codes never read contacts',async()=>{
 const h=handler(()=>assert.fail('Database must not be read'));
 for(const code of ['', 'incorrect-'.repeat(5)])assert.equal((await h(request(code))).status,401);
});
test('rejects unrelated browser origins',async()=>{
 const h=handler(()=>assert.fail('Database must not be read'));
 assert.equal((await h(new Request('https://example.org',{method:'POST',headers:{Origin:'https://unrelated.example'},body:'{}'}))).status,403);
});
test('authorized fetch reads all pages and disables caching',async()=>{
 let pages=0;const h=handler(async(url,opts)=>{assert.equal(opts.headers.Authorization,'Bearer server-secret');assert.ok(url.includes('offset='+pages*500));return Response.json(Array.from({length:pages++===0?500:1},()=>({full_name:'Synthetic Person'})));});
 const r=await h(request(testKey));assert.equal(r.status,200);assert.equal((await r.json()).signups.length,501);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://esemmelman.github.io');
});

