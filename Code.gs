const DATES = ['2026-12-05', '2026-12-06', '2026-12-08'];

function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6) : value;
}

function buildReport(signups) {
  return signups.map(s => {
    const guests = s.additional_names || [];
    if (!s.full_name || !Number.isInteger(s.people_count) || s.people_count < 1 ||
      !Array.isArray(guests) || guests.length + 1 > s.people_count ||
      !Array.isArray(s.available_dates) || s.available_dates.some(d => !DATES.includes(d))) throw new Error('Invalid signup data.');
    return [s.full_name, formatPhone(s.cell_phone || ''), s.email || '', ...DATES.map(d => s.available_dates.includes(d) ? s.people_count : 0), s.people_count, guests.join(', ')];
  }).sort((a, b) => a[0].trim().localeCompare(b[0].trim(), 'en', { sensitivity: 'base' }) || a[2].localeCompare(b[2]));
}

function fetchSignups() {
  if (Session.getActiveUser().getEmail() !== 'esemmoc@gmail.com') throw new Error('Please sign in with the organizer Google account.');
  const response = UrlFetchApp.fetch('https://fgomaujsdblpzxhnnqrg.supabase.co/functions/v1/serenade-admin-data', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ googleAccessToken: ScriptApp.getOAuthToken() }), muteHttpExceptions: true,
  });
  const data = JSON.parse(response.getContentText());
  if (response.getResponseCode() !== 200 || !Array.isArray(data.signups)) throw new Error(data.error || 'Cannot read current signups.');
  return data.signups;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function reportHtml(rows, stamp) {
  const totals = [3, 4, 5, 6].map(i => rows.reduce((n, row) => n + row[i], 0));
  const headers = ['Name', 'Cell', 'Email', 'Dec 5', 'Dec 6', 'Dec 8', 'Party', 'Accompanying'];
  return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:landscape;margin:30pt}body{font:10pt Arial,sans-serif;color:#202020}h1{font-size:20pt;margin:0 0 8pt}p{font-size:9pt;color:#555}table{border-collapse:collapse;width:100%;table-layout:fixed}thead{display:table-header-group}tr{page-break-inside:avoid}th,td{border-bottom:1px solid #ddd;padding:8pt 5pt;text-align:left;overflow-wrap:anywhere;word-wrap:break-word;vertical-align:top}th,.total{background:#eee;font-weight:bold}.n{text-align:center}col.name{width:16%}col.cell{width:14%}col.email{width:25%}col.num{width:6%}col.guests{width:21%}</style></head><body><h1>Hanukkah Serenaders - December 2026</h1><p>Generated ' + escapeHtml(stamp) + ' Pacific | Sorted by first name</p><table><colgroup><col class="name"><col class="cell"><col class="email"><col class="num"><col class="num"><col class="num"><col class="num"><col class="guests"></colgroup><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map((v, i) => '<td' + (i >= 3 && i <= 6 ? ' class="n"' : '') + '>' + escapeHtml(v) + '</td>').join('') + '</tr>').join('') + '<tr class="total"><td>TOTAL</td><td></td><td></td>' + totals.map(n => '<td class="n">' + n + '</td>').join('') + '<td></td></tr></tbody></table><p>Each row is one signup party. Date columns count the full party. Party total counts people once per signup; the same person may attend multiple nights.</p></body></html>';
}

function createPdf() {
  const rows = buildReport(fetchSignups());
  const now = new Date();
  const stamp = Utilities.formatDate(now, 'America/Los_Angeles', 'MMM d, yyyy h:mm a');
  const pdf = Utilities.newBlob(reportHtml(rows, stamp), 'text/html', 'serenaders.html').getAs('application/pdf');
  return { base64: Utilities.base64Encode(pdf.getBytes()), filename: 'hanukkah-serenaders-' + Utilities.formatDate(now, 'America/Los_Angeles', 'yyyy-MM-dd') + '.pdf', parties: rows.length, people: rows.reduce((n, r) => n + r[6], 0) };
}

function doGet() {
  return HtmlService.createHtmlOutput(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_top"><style>body{font:18px/1.6 system-ui;background:#f4f6fb;color:#202e49;padding:24px}main{max-width:600px;margin:8vh auto;background:white;padding:32px;border-radius:18px}button,a{font:inherit}button,.download{display:inline-block;background:#254eac;color:white;border:0;border-radius:10px;padding:14px 24px;cursor:pointer;text-decoration:none}button:disabled{opacity:.6}#status{min-height:60px}[hidden]{display:none!important}</style></head><body><main><h1>Hanukkah Serenade List</h1><p>Generate a PDF from current signups, sorted by first name, with formatted phones and nightly totals.</p><button id="generate">Create PDF</button><p id="status" role="status" aria-live="polite">Ready to create your PDF.</p><a id="download" class="download" hidden>Download PDF</a><script>const b=document.getElementById('generate'),s=document.getElementById('status'),a=document.getElementById('download');let url;b.onclick=()=>{b.disabled=true;a.hidden=true;s.textContent='Fetching current signups and creating PDF…';google.script.run.withSuccessHandler(r=>{if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0))],{type:'application/pdf'}));a.href=url;a.download=r.filename;a.hidden=false;s.textContent='PDF ready: '+r.parties+' signups, '+r.people+' people.';b.disabled=false}).withFailureHandler(e=>{s.textContent=e.message||'Could not create PDF. Please try again.';b.disabled=false}).createPdf()};</script></main></body></html>`).setTitle('Hanukkah Serenade List');
}

