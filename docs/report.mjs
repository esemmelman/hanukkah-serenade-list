export const DATES = ['2026-12-05', '2026-12-06', '2026-12-08'];
export const HEADERS = ['Name', 'Cell', 'Email', 'Dec 5', 'Dec 6', 'Dec 8', 'Party', 'Accompanying'];
export function formatPhone(value) {
  let d = value.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length === 10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : value;
}
export function buildReport(signups) {
  if (!Array.isArray(signups)) throw new Error('The signup list could not be read.');
  const rows = signups.map(s => {
    const guests = s.additional_names || [];
    if (typeof s.full_name !== 'string' || !s.full_name.trim() || !Number.isInteger(s.people_count) || s.people_count < 1 || !Array.isArray(guests) || guests.some(n => typeof n !== 'string') || guests.length + 1 > s.people_count || typeof s.cell_phone !== 'string' || typeof s.email !== 'string' || !Array.isArray(s.available_dates) || s.available_dates.some(d => !DATES.includes(d))) throw new Error('A signup contains invalid data. No PDF was created.');
    return [s.full_name, formatPhone(s.cell_phone), s.email, ...DATES.map(d => s.available_dates.includes(d) ? s.people_count : 0), s.people_count, guests.join(', ')];
  }).sort((a,b) => a[0].trim().localeCompare(b[0].trim(),'en',{sensitivity:'base'}) || a[2].localeCompare(b[2]));
  return { rows, totals: [3,4,5,6].map(i => rows.reduce((n,r) => n+r[i],0)) };
}
export function createReportPdf(jsPDF, report, now = new Date()) {
  const doc = new jsPDF({orientation:'landscape',unit:'pt',format:'letter'});
  const stamp = new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(now);
  doc.setProperties({title:'Hanukkah Serenaders - December 2026'});
  doc.setFont('helvetica','bold'); doc.setFontSize(19);
  doc.text('Hanukkah Serenaders - December 2026',30,38);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(85);
  doc.text(`Generated ${stamp} Pacific | Sorted by first name`,30,57);
  doc.autoTable({startY:76,margin:{left:30,right:30,top:30,bottom:40},head:[HEADERS],body:report.rows,foot:[['TOTAL','','',...report.totals,'']],theme:'plain',showHead:'everyPage',showFoot:'lastPage',rowPageBreak:'avoid',
    styles:{font:'helvetica',fontSize:8.5,cellPadding:8,overflow:'linebreak',valign:'top',lineColor:[220,220,220],lineWidth:{bottom:.4}},headStyles:{fillColor:[238,238,238],textColor:30,fontStyle:'bold'},footStyles:{fillColor:[238,238,238],textColor:30,fontStyle:'bold'},
    columnStyles:{0:{cellWidth:115},1:{cellWidth:105},2:{cellWidth:185},3:{cellWidth:40,halign:'center'},4:{cellWidth:40,halign:'center'},5:{cellWidth:40,halign:'center'},6:{cellWidth:40,halign:'center'},7:{cellWidth:167}}});
  let y=doc.lastAutoTable.finalY+18;
  if(y>555){doc.addPage();y=35;}
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(85);
  doc.text(doc.splitTextToSize('Each row is one signup party. Date columns count the full party. Party total counts people once per signup; the same person may attend multiple nights.',732),30,y);
  for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(110);doc.text(`Page ${i} of ${doc.getNumberOfPages()}`,762,594,{align:'right'});}
  return doc;
}

