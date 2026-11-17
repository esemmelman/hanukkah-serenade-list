const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('Code.gs', 'utf8'), ctx);
const sample = (name, count, dates, guests = []) => ({ full_name: name, people_count: count, available_dates: dates, additional_names: guests, cell_phone: '+1 555 555 1234', email: 'test@example.org' });
test('sorts by first name and counts full parties only on selected nights', () => {
  const rows = ctx.buildReport([sample('Amy Zebra', 3, ['2026-12-05', '2026-12-08'], ['A', 'B']), sample('Zoe Adams', 1, [])]);
  assert.equal(rows[0][0], 'Amy Zebra');
  assert.deepEqual(Array.from(rows[0].slice(3, 7)), [3, 0, 3, 3]);
  assert.equal(rows[0][7], 'A, B');
});
test('empty input and legacy group counts remain valid', () => {
  assert.equal(ctx.buildReport([]).length, 0);
  assert.equal(ctx.buildReport([sample('Legacy Group', 5, ['2026-12-06'])])[0][4], 5);
});
test('rejects invalid counts and unexpected dates before writing', () => {
  assert.throws(() => ctx.buildReport([sample('Bad Row', 0, [])]));
  assert.throws(() => ctx.buildReport([sample('Bad Row', 1, ['2027-01-01'])]));
  assert.throws(() => ctx.buildReport([sample('Bad Row', 1, [], ['Guest'])]));
});
test('untrusted strings are literal text', () => {
  for (const text of ['=IMPORTXML("x")', '+123', '@test', '-1', "'name"]) assert.equal(ctx.sheetText(text), "'" + text);
  assert.equal(ctx.sheetText(3), 3);
});
test('normalizes US contacts and preserves international numbers', () => {
  assert.equal(ctx.formatPhone('13104879355'), '(310) 487-9355');
  assert.equal(ctx.formatPhone('949-484-3838'), '(949) 484-3838');
  assert.equal(ctx.formatPhone('+44 20 7946 0958'), '+44 20 7946 0958');
});
test('failed fetch never opens or clears the spreadsheet and releases the lock', () => {
  let unlocked = false;
  const failure = vm.createContext({
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() { unlocked = true; } }) },
    Session: { getActiveUser: () => ({ getEmail: () => 'esemmoc@gmail.com' }) },
    ScriptApp: { getOAuthToken: () => 'test-token' },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 502, getContentText: () => '{"error":"Database unavailable"}' }) },
    SpreadsheetApp: { openById() { assert.fail('Must not open sheet after fetch failure'); } },
  });
  vm.runInContext(fs.readFileSync('Code.gs', 'utf8'), failure);
  assert.throws(() => failure.refreshSerenaders(), /Database unavailable/);
  assert.equal(unlocked, true);
});
