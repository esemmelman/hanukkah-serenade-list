import {buildReport,createReportPdf} from './report.mjs';
import {readSession,saveSession,clearSession} from './session.mjs';
const endpoint='https://fgomaujsdblpzxhnnqrg.supabase.co/functions/v1/serenade-export-data';
const form=document.querySelector('#pdf-form'),button=document.querySelector('#create'),status=document.querySelector('#status'),download=document.querySelector('#download'),access=document.querySelector('#access');
let accessCode=new URLSearchParams(location.hash.slice(1)).get('access')||'',objectUrl;
let storage;try{storage=window.localStorage;}catch{}
let session=readSession(storage);
document.querySelector('#access-section').hidden=!!(accessCode||session);
if(accessCode||session)status.textContent='Ready. Create a PDF from the latest signups.';
form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;
  accessCode=access.value.trim()||accessCode;
  if(!accessCode&&!session){status.textContent='Enter your organizer passcode.';access.focus();return;}
  button.disabled=true;download.hidden=true;status.textContent='Fetching current signups…';
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(accessCode?{accessCode}:{sessionToken:session.token}),cache:'no-store',signal:AbortSignal.timeout(60000)});
    const result=await response.json();
    if(response.status===401){accessCode='';session=null;clearSession(storage);document.querySelector('#access-section').hidden=false;access.value='';window.history.replaceState(null,'',location.pathname);}
    if(!response.ok)throw new Error(result.error||'Could not fetch the signup list.');
    session=result.session;saveSession(storage,session);accessCode='';access.value='';document.querySelector('#access-section').hidden=true;
    const report=buildReport(result.signups);status.textContent='Creating your PDF…';
    const pdf=createReportPdf(window.jspdf.jsPDF,report);
    if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(pdf.output('blob'));
    download.href=objectUrl;download.download=`hanukkah-serenaders-${new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date())}.pdf`;download.hidden=false;access.value='';
    status.textContent=`PDF ready: ${report.rows.length} signups, ${report.totals[3]} people. Date totals: ${report.totals.slice(0,3).join(', ')}.`;
  }catch(error){status.textContent=error.name==='TimeoutError'?'The connection timed out. Please try again.':error.message;}
  finally{button.disabled=false;}
});
