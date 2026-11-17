// Contact data is returned only to the organizer's verified Google account.
export async function handle(req: Request): Promise<Response> {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  let payload: { googleAccessToken?: string } = {};
  try { payload = await req.json(); } catch { /* Header authentication remains supported. */ }
  const auth = typeof payload.googleAccessToken === 'string'
    ? 'Bearer ' + payload.googleAccessToken : req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || auth.length > 8192) return reply({ error: 'Google authorization required' }, 401);
  try {
    const identity = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: auth }, signal: AbortSignal.timeout(10000),
    });
    if (!identity.ok) return reply({ error: 'Google identity check failed (HTTP ' + identity.status + '). Please authorize email access for the app.' }, 401);
    const user = await identity.json();
    if (user.email !== 'esemmoc@gmail.com' || user.email_verified !== true) {
      return reply({ error: 'Organizer account required' }, 403);
    }
    const base = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!base || !key) return reply({ error: 'Database access unavailable' }, 503);
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const params = new URLSearchParams({ select: 'id,full_name,cell_phone,email,people_count,additional_names,available_dates', order: 'id.asc', limit: '500', offset: String(offset) });
      const result = await fetch(`${base}/rest/v1/hanukkah_serenading_signups?${params}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000),
      });
      if (!result.ok) return reply({ error: 'Could not read signups; spreadsheet unchanged' }, 502);
      const batch = await result.json();
      if (!Array.isArray(batch)) throw new Error('Invalid response');
      rows.push(...batch);
      if (batch.length < 500) break;
    }
    return reply({ signups: rows });
  } catch { return reply({ error: 'Could not read signups; spreadsheet unchanged' }, 502); }
}

Deno.serve(handle);
