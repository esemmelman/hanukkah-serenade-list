import {buildReport,createReportPdf} from './report.mjs';
import {readSession,saveSession,clearSession} from './session.mjs';
const endpoint='https://fgomaujsdblpzxhnnqrg.supabase.co/functions/v1/serenade-export-data';
const $=selector=>document.querySelector(selector);
const form=$('#pdf-form'),button=$('#create'),status=$('#status'),download=$('#download'),access=$('#access'),refresh=$('#refresh');
let accessCode=new URLSearchParams(location.hash.slice(1)).get('access')||'',objectUrl,report;
let storage;try{storage=window.localStorage;}catch{}
let session=readSession(storage);
form.hidden=!!(accessCode||session);

function renderReport(value){
  const body=$('#signup-rows');body.replaceChildren();
  for(const row of value.rows){
    const tr=document.createElement('tr');
    row.forEach((text,index)=>{const cell=document.createElement(index===0?'th':'td');if(index===0)cell.scope='row';cell.textContent=String(text);tr.append(cell);});
    body.append(tr);
  }
  if(!value.rows.length){const tr=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=8;cell.textContent='No signups yet.';tr.append(cell);body.append(tr);}
  const total=$('#signup-totals');total.replaceChildren();
  ['TOTAL','','',...value.totals,''].forEach((text,index)=>{const cell=document.createElement(index===0?'th':'td');if(index===0)cell.scope='row';cell.textContent=String(text);total.append(cell);});
  $('#summary').textContent=`${value.rows.length} signups · ${value.totals[3]} people · Dec 5: ${value.totals[0]} · Dec 6: ${value.totals[1]} · Dec 8: ${value.totals[2]}`;
  $('#signup-list').hidden=false;
}

async function loadSignups(){
  if(button.disabled)return;
  accessCode=access.value.trim()||accessCode;
  if(!accessCode&&!session){form.hidden=false;status.textContent='Enter your organizer passcode.';access.focus();return;}
  button.disabled=true;refresh.disabled=true;download.hidden=true;refresh.hidden=false;
  status.textContent='Loading current signups…';
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(accessCode?{accessCode}:{sessionToken:session.token}),cache:'no-store',signal:AbortSignal.timeout(60000)});
    const result=await response.json();
    if(response.status===401){accessCode='';session=null;clearSession(storage);form.hidden=false;access.value='';report=null;$('#signup-list').hidden=true;$('#summary').textContent='';refresh.hidden=true;window.history.replaceState(null,'',location.pathname);}
    if(!response.ok)throw new Error(result.error||'Could not fetch the signup list.');
    const current=buildReport(result.signups);
    session=result.session;saveSession(storage,session);accessCode='';access.value='';form.hidden=true;
    report=current;renderReport(report);
    const now=new Date();
    const stamp=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(now);
    status.textContent=`Updated ${stamp} Pacific. Sorted by first name.`;
    try{
      const pdf=createReportPdf(window.jspdf.jsPDF,report,now);
      if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(pdf.output('blob'));
      download.href=objectUrl;download.download=`hanukkah-serenaders-${new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(now)}.pdf`;download.hidden=false;
    }catch{status.textContent+=' PDF creation failed; refresh to try again.';}
  }catch(error){
    status.textContent=(error.name==='TimeoutError'?'The connection timed out. Please try again.':error.message)+(report?' Showing the previously loaded list.':'');
  }finally{button.disabled=false;refresh.disabled=false;}
}
form.addEventListener('submit',event=>{event.preventDefault();return loadSignups();});
refresh.addEventListener('click',loadSignups);
if(accessCode||session)loadSignups();
