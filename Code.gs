/** Hanukkah signup -> Google Sheets. Run in a spreadsheet-bound Apps Script. */
const DATES = ['2026-12-05', '2026-12-06', '2026-12-08'];
const HEADERS = ['Name', 'Cell', 'Email', 'Dec 5, 2026', 'Dec 6, 2026', 'Dec 8, 2026', 'Party size', 'Accompanying serenaders'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Serenaders')
    .addItem('Refresh signup list', 'refreshSerenaders').addToUi();
}

function buildReport(signups) {
  const key = name => {
    const words = name.trim().split(/\s+/);
    return words[words.length - 1] + ' ' + name;
  };
  return signups.map(s => {
    const guests = s.additional_names || [];
    if (!s.full_name || !Number.isInteger(s.people_count) || s.people_count < 1 ||
        !Array.isArray(guests) || guests.length + 1 > s.people_count ||
        !Array.isArray(s.available_dates) || s.available_dates.some(d => !DATES.includes(d))) {
      throw new Error('Invalid signup data; the existing sheet has not been replaced.');
    }
    return [s.full_name, s.cell_phone || '', s.email || '',
      ...DATES.map(d => s.available_dates.includes(d) ? s.people_count : 0),
      s.people_count, guests.join(', ')];
  }).sort((a, b) => key(a[0]).localeCompare(key(b[0]), 'en', { sensitivity: 'base' }) ||
    a[0].localeCompare(b[0]) || a[2].localeCompare(b[2]));
}

// Text from the signup form must never become a spreadsheet formula.
function sheetText(value) {
  return typeof value === 'string' && /^[=+@\-']/.test(value) ? "'" + value : value;
}

function fetchSignups() {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('SUPABASE_SECRET_KEY');
  if (!secret) throw new Error('Set SUPABASE_SECRET_KEY in Project Settings > Script properties first.');
  const rows = [];
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    const url = 'https://fgomaujsdblpzxhnnqrg.supabase.co/rest/v1/hanukkah_serenading_signups' +
      '?select=id,full_name,cell_phone,email,people_count,additional_names,available_dates' +
      '&order=id.asc&limit=' + limit + '&offset=' + offset;
    const headers = { apikey: secret };
    if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
    const response = UrlFetchApp.fetch(url, { headers, muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error('Cannot read signup contacts (HTTP ' + response.getResponseCode() + '). Check the secret key.');
    }
    const batch = JSON.parse(response.getContentText());
    if (!Array.isArray(batch)) throw new Error('Unexpected database response.');
    rows.push(...batch);
    if (batch.length < limit) return rows;
  }
}

function refreshSerenaders() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Finish fetching and validation before changing any existing output.
    const report = buildReport(fetchSignups());
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName('Serenaders') || book.insertSheet('Serenaders');
    const last = report.length + 4;
    if (sheet.getMaxRows() < last + 2) sheet.insertRowsAfter(sheet.getMaxRows(), last + 2 - sheet.getMaxRows());
    const values = [HEADERS, ...report.map(row => row.map(sheetText))];
    const total = ['TOTAL', '', '', ...[3, 4, 5, 6].map(i => report.reduce((n, r) => n + r[i], 0)), ''];
    values.push(total);
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), last + 2), 8).breakApart();
    sheet.getRange(1, 1, 1, 8).merge();
    sheet.getRange(1, 1).setValue('Hanukkah serenaders — December 2026').setFontWeight('bold');
    sheet.getRange(2, 1, 1, 8).merge();
    sheet.getRange(2, 1).setValue('Updated ' + Utilities.formatDate(new Date(), 'America/Los_Angeles', 'MMM d, yyyy h:mm a') + ' Pacific · Sorted by last name');
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
  } finally { lock.releaseLock(); }
}
