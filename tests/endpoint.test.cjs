const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const source = stripTypeScriptTypes(fs.readFileSync('supabase/functions/serenade-admin-data/index.ts', 'utf8').replace('export async function', 'async function'));
function endpoint(fetch) {
  let handler;
  const context = vm.createContext({ Request, Response, URLSearchParams, AbortSignal, fetch,
    Deno: { env: { get: name => name === 'SUPABASE_URL' ? 'https://database.example' : 'server-key' }, serve: h => { handler = h; } } });
  vm.runInContext(source, context);
  return handler;
}
test('rejects missing authorization without contacting the database', async () => {
  const handle = endpoint(() => assert.fail('No external call permitted'));
  const response = await handle(new Request('https://example.org', { method: 'POST' }));
  assert.equal(response.status, 401);
});
test('rejects another Google account and unverified organizer identities', async () => {
  for (const user of [{ email: 'other@example.org', email_verified: true }, { email: 'esemmoc@gmail.com', email_verified: false }]) {
    let calls = 0;
    const handle = endpoint(async url => { calls++; assert.equal(url, 'https://openidconnect.googleapis.com/v1/userinfo'); return Response.json(user); });
    assert.equal((await handle(new Request('https://example.org', { method: 'POST', headers: { Authorization: 'Bearer google-token' } }))).status, 403);
    assert.equal(calls, 1);
  }
});
test('authorized requests paginate live data and never forward the Google token to the database', async () => {
  let pages = 0;
  const handle = endpoint(async (url, opts) => {
    if (url.includes('googleapis.com')) return Response.json({ email: 'esemmoc@gmail.com', email_verified: true });
    assert.equal(opts.headers.Authorization, 'Bearer server-key');
    assert.ok(url.includes(`offset=${pages * 500}`));
    return Response.json(Array.from({ length: pages++ === 0 ? 500 : 1 }, () => ({ full_name: 'Synthetic Person' })));
  });
  const response = await handle(new Request('https://example.org', { method: 'POST', headers: { Authorization: 'Bearer google-token' } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).signups.length, 501);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
