import {buildReport,createReportPdf} from './report.mjs';
const endpoint='https://fgomaujsdblpzxhnnqrg.supabase.co/functions/v1/serenade-export-data';
const form=document.querySelector('#pdf-form'),button=document.querySelector('#create'),status=document.querySelector('#status'),download=document.querySelector('#download'),access=document.querySelector('#access');
let accessCode=new URLSearchParams(location.hash.slice(1)).get('access')||'',objectUrl;
document.querySelector('#access-section').hidden=!!accessCode;
if(accessCode)status.textContent='Ready. Create a PDF from the latest signups.';
form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;
  accessCode=accessCode||access.value.trim();
  if(!accessCode){status.textContent='Open your private organizer link or enter its access code.';access.focus();return;}
  button.disabled=true;download.hidden=true;status.textContent='Fetching current signups…';
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessCode}),cache:'no-store',signal:AbortSignal.timeout(60000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not fetch the signup list.');
    const report=buildReport(result.signups);status.textContent='Creating your PDF…';
    const pdf=createReportPdf(window.jspdf.jsPDF,report);
    if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(pdf.output('blob'));
    download.href=objectUrl;download.download=`hanukkah-serenaders-${new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date())}.pdf`;download.hidden=false;access.value='';
    status.textContent=`PDF ready: ${report.rows.length} signups, ${report.totals[3]} people. Date totals: ${report.totals.slice(0,3).join(', ')}.`;
  }catch(error){status.textContent=error.name==='TimeoutError'?'The connection timed out. Please try again.':error.message;}
  finally{button.disabled=false;}
});
