/** Hanukkah signup -> Google Sheets. Run in a spreadsheet-bound Apps Script. */
const DATES = ['2026-12-05', '2026-12-06', '2026-12-08'];
const HEADERS = ['Name', 'Cell', 'Email', 'Dec 5, 2026', 'Dec 6, 2026', 'Dec 8, 2026', 'Party size', 'Accompanying serenaders'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Serenaders')
    .addItem('Refresh signup list', 'refreshSerenaders').addToUi();
}

function buildReport(signups) {
  const key = name => name.trim();
  return signups.map(s => {
    const guests = s.additional_names || [];
    if (!s.full_name || !Number.isInteger(s.people_count) || s.people_count < 1 ||
        !Array.isArray(guests) || guests.length + 1 > s.people_count ||
        !Array.isArray(s.available_dates) || s.available_dates.some(d => !DATES.includes(d))) {
      throw new Error('Invalid signup data; the existing sheet has not been replaced.');
    }
    return [s.full_name, formatPhone(s.cell_phone || ''), s.email || '',
      ...DATES.map(d => s.available_dates.includes(d) ? s.people_count : 0),
      s.people_count, guests.join(', ')];
  }).sort((a, b) => key(a[0]).localeCompare(key(b[0]), 'en', { sensitivity: 'base' }) ||
    a[0].localeCompare(b[0]) || a[2].localeCompare(b[2]));
}

function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6) : value;
}

// Text from the signup form must never become a spreadsheet formula.
function sheetText(value) {
  return typeof value === 'string' && /^[=+@\-']/.test(value) ? "'" + value : value;
}

function fetchSignups() {
  // This call also ensures the email scope is requested during Google authorization.
  if (Session.getActiveUser().getEmail() !== 'esemmoc@gmail.com') {
    throw new Error('Please sign in with the organizer Google account.');
  }
  const response = UrlFetchApp.fetch('https://fgomaujsdblpzxhnnqrg.supabase.co/functions/v1/serenade-admin-data', {
    method: 'post', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true,
  });
  const data = JSON.parse(response.getContentText());
  if (response.getResponseCode() !== 200 || !Array.isArray(data.signups)) {
    throw new Error(data.error || 'Cannot read signup contacts. The spreadsheet is unchanged.');
  }
  return data.signups;
}

function refreshSerenaders() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Finish fetching and validation before changing any existing output.
    const report = buildReport(fetchSignups());
    const book = SpreadsheetApp.openById('1gMip7rqtPr6wbGWquq8UKqeLjW9Bpg8nQfYOirxi3_w');
    const sheet = book.getSheetByName('Serenaders') || book.insertSheet('Serenaders');
    const last = report.length + 4;
    if (sheet.getMaxRows() < last + 2) sheet.insertRowsAfter(sheet.getMaxRows(), last + 2 - sheet.getMaxRows());
    const values = [HEADERS, ...report.map(row => row.map(sheetText))];
    const total = ['TOTAL', '', '', ...[3, 4, 5, 6].map(i => report.reduce((n, r) => n + r[i], 0)), ''];
    values.push(total);
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), last + 2), 8).breakApart();
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), last + 2), 8).clearContent();
    sheet.getRange(1, 1, 1, 8).merge();
    sheet.getRange(1, 1).setValue('Hanukkah serenaders — December 2026').setFontWeight('bold');
    sheet.getRange(2, 1, 1, 8).merge();
    sheet.getRange(2, 1).setValue('Updated ' + Utilities.formatDate(new Date(), 'America/Los_Angeles', 'MMM d, yyyy h:mm a') + ' Pacific · Sorted by first name');
    sheet.getRange(3, 1, values.length, 8).setValues(values);
    // Remove stale rows after a shorter refresh, within the generated columns only.
    const oldLast = sheet.getLastRow();
    if (oldLast > last) sheet.getRange(last + 1, 1, oldLast - last, 8).clearContent();
    sheet.getRange(3, 1, values.length, 8).setFontWeight('normal').setBackground('white');
    sheet.getRange(3, 1, 1, 8).setBackground('#eeeeee').setFontWeight('bold');
    sheet.getRange(last, 1, 1, 8).setBackground('#eeeeee').setFontWeight('bold');
    sheet.getRange(4, 4, report.length + 1, 4).setNumberFormat('0');
    sheet.setFrozenRows(3);
    [210, 155, 270, 115, 115, 115, 95, 270].forEach((width, i) => sheet.setColumnWidth(i + 1, width));
    sheet.getRange(3, 1, values.length, 8).setWrap(true).setVerticalAlignment('top');
    sheet.autoResizeRows(3, values.length);
    sheet.getRange(last + 2, 1, 1, 8).merge();
    sheet.getRange(last + 2, 1).setValue('Each row is one signup party. Date columns count the full party. Party size totals people once per signup; date totals may count the same person on multiple nights.');
    SpreadsheetApp.flush();
    return { parties: report.length, people: total[6], dates: total.slice(3, 6) };
  } finally { lock.releaseLock(); }
}

function doGet() {
  return HtmlService.createHtmlOutput(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_top"><style>body{font:18px/1.6 system-ui;background:#f4f6fb;color:#202e49;padding:24px}main{max-width:600px;margin:8vh auto;background:white;padding:32px;border-radius:18px}button,a{font:inherit}button{background:#254eac;color:white;border:0;border-radius:10px;padding:14px 24px;cursor:pointer}button:disabled{opacity:.6}#status{min-height:60px}</style></head><body><main><h1>Hanukkah Serenade List</h1><p>Fetch current signups and replace the spreadsheet in first-name order, including phone numbers and nightly totals.</p><button id="refresh">Refresh Spreadsheet</button><p id="status" role="status" aria-live="polite">Ready to refresh.</p><a href="https://docs.google.com/spreadsheets/d/1gMip7rqtPr6wbGWquq8UKqeLjW9Bpg8nQfYOirxi3_w/edit?gid=851372248">Open spreadsheet ↗</a><script>const b=document.getElementById('refresh'),s=document.getElementById('status');b.onclick=()=>{b.disabled=true;s.textContent='Fetching current signups…';google.script.run.withSuccessHandler(r=>{s.textContent='Updated '+r.parties+' signups, '+r.people+' people. Nightly totals: '+r.dates.join(', ')+'.';b.disabled=false}).withFailureHandler(e=>{s.textContent=e.message||'Refresh failed. Please try again.';b.disabled=false}).refreshSerenaders()};</script></main></body></html>`).setTitle('Hanukkah Serenade List');
}
