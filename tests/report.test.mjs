import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jsPDF} from 'jspdf';
import {applyPlugin} from 'jspdf-autotable';
import {buildReport,formatPhone,createReportPdf} from '../docs/report.mjs';
applyPlugin(jsPDF);
const sample=(name,count,dates,guests=[])=>({full_name:name,people_count:count,available_dates:dates,additional_names:guests,cell_phone:'13104879355',email:'test@example.org'});
test('sorts first names and counts parties on selected nights',()=>{
 const report=buildReport([sample('Zoe Adams',1,[]),sample('Amy Zebra',3,['2026-12-05','2026-12-08'],['A','B'])]);
 assert.equal(report.rows[0][0],'Amy Zebra');assert.deepEqual(report.totals,[3,0,3,4]);assert.equal(report.rows[0][1],'(310) 487-9355');
});
test('empty, invalid, and older unnamed parties',()=>{
 assert.deepEqual(buildReport([]).totals,[0,0,0,0]);
 assert.equal(buildReport([sample('Legacy Party',5,['2026-12-06'])]).totals[1],5);
 assert.throws(()=>buildReport([sample('Bad Row',0,[])]));
 assert.throws(()=>buildReport([sample('Bad Row',1,['2027-01-01'])]));
 assert.throws(()=>buildReport([sample('Bad Row',1,[],['Guest'])]));
 assert.equal(formatPhone('+44 20 7946 0958'),'+44 20 7946 0958');
});
test('generates a real PDF and paginates long contact lists',()=>{
 for(const n of [0,7,100]){
  const report=buildReport(Array.from({length:n},(_,i)=>sample('Person '+i,1,['2026-12-05'])));
  const doc=createReportPdf(jsPDF,report,new Date('2026-11-17T06:00:00Z'));
  assert.ok(doc.output().startsWith('%PDF-'));assert.ok(doc.output().includes('TOTAL'));
  if(n===100)assert.ok(doc.getNumberOfPages()>1);
 }
});
