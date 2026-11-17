// Replaced only in the deployment payload; credential verifiers stay out of Git.
const ACCESS_HASH = '__DEPLOYMENT_ACCESS_HASH__';
const ORIGIN = 'https://esemmelman.github.io';
export async function handle(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const headers: Record<string,string> = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin' };
  if(origin === ORIGIN) headers['Access-Control-Allow-Origin'] = ORIGIN;
  const reply = (body: unknown,status=200) => new Response(JSON.stringify(body),{status,headers});
  if(origin && origin !== ORIGIN) return reply({error:'Origin not allowed'},403);
  if(req.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type'}});
  if(req.method !== 'POST') return reply({error:'Method not allowed'},405);
  try {
    const body = await req.text();
    if(body.length > 1024) return reply({error:'Invalid request'},400);
    const {accessCode} = JSON.parse(body);
    if(typeof accessCode !== 'string' || accessCode.length > 128 || !accessCode.length) return reply({error:'Enter the organizer passcode.'},401);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(accessCode))), b=>b.toString(16).padStart(2,'0')).join('');
    let difference=0;for(let i=0;i<ACCESS_HASH.length;i++)difference|=ACCESS_HASH.charCodeAt(i)^digest.charCodeAt(i);
    if(difference !== 0) return reply({error:'Organizer access code is not valid.'},401);
    const base=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!base || !key) return reply({error:'Database access unavailable.'},503);
    const signups: unknown[]=[];
    for(let offset=0;;offset+=500){
      const params=new URLSearchParams({select:'id,full_name,cell_phone,email,people_count,additional_names,available_dates',order:'id.asc',limit:'500',offset:String(offset)});
      const result=await fetch(base+'/rest/v1/hanukkah_serenading_signups?'+params,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});
      if(!result.ok)return reply({error:'Could not fetch current signups. Please try again.'},502);
      const batch=await result.json();if(!Array.isArray(batch))throw new Error('Invalid database response');
      signups.push(...batch);if(batch.length<500)break;
    }
    return reply({signups});
  } catch { return reply({error:'Could not fetch current signups. Please try again.'},502); }
}
Deno.serve(handle);

