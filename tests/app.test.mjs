import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {buildReport} from '../docs/report.mjs';
import {readSession,saveSession,clearSession,STORAGE_KEY} from '../docs/session.mjs';
const source=fs.readFileSync('docs/app.mjs','utf8').replace(/^import .*;\r?\n/gm,'');
const session={token:'signed-token',expiresAt:Date.now()+86400000};
const sample=name=>({full_name:name,cell_phone:'13104879355',email:'test@example.org',people_count:1,available_dates:['2026-12-05'],additional_names:[]});
function app(saved=null){
 const nodes={},data=new Map(saved?[[STORAGE_KEY,JSON.stringify(saved)]]:[]),calls=[],pdfs=[];
 const node=()=>({children:[],value:'',hidden:false,disabled:false,textContent:'',events:{},append(n){this.children.push(n);},replaceChildren(){this.children=[];},addEventListener(name,fn){this.events[name]=fn;},focus(){}});
 for(const id of ['pdf-form','create','status','download','access','refresh','signup-rows','signup-totals','summary','signup-list'])nodes['#'+id]=node();
 nodes['#signup-list'].hidden=true;nodes['#download'].hidden=true;nodes['#refresh'].hidden=true;
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 let result={signups:[sample('Zoe Adams'),sample('Amy <Zebra>')],session},status=200;
 const context=vm.createContext({buildReport,readSession,saveSession,clearSession,window:{localStorage:storage,history:{replaceState(){}},jspdf:{jsPDF:{}}},document:{querySelector:id=>nodes[id],createElement:node},location:{hash:'',pathname:'/hanukkah-serenade-list/'},URLSearchParams,URL:{createObjectURL:()=> 'blob:verified-pdf',revokeObjectURL(){}},Intl,Date,AbortSignal,createReportPdf:(_,report)=>{pdfs.push(report);return {output:()=>new Blob(['PDF'])};},fetch:async(url,opts)=>{calls.push({url,opts,body:JSON.parse(opts.body)});return Response.json(result,{status});}});
 vm.runInContext(source,context);return {nodes,calls,pdfs,data,setResponse:(value,code=200)=>{result=value;status=code;}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('launch automatically fetches and displays current signups for a remembered organizer',async()=>{
 const a=app(session);await settle();
 assert.equal(a.calls.length,1);assert.equal(a.calls[0].body.sessionToken,session.token);assert.equal(a.calls[0].opts.cache,'no-store');
 assert.equal(a.nodes['#pdf-form'].hidden,true);assert.equal(a.nodes['#signup-list'].hidden,false);
 assert.deepEqual(a.nodes['#signup-rows'].children.map(r=>r.children[0].textContent),['Amy <Zebra>','Zoe Adams']);
 assert.equal(a.nodes['#signup-rows'].children[0].children[1].textContent,'(310) 487-9355');
 assert.deepEqual(a.nodes['#signup-totals'].children.slice(3,7).map(c=>c.textContent),['2','0','0','2']);
 assert.equal(a.nodes['#download'].hidden,false);assert.equal(a.nodes['#download'].href,'blob:verified-pdf');assert.equal(a.pdfs[0].rows.length,2);
});
test('requires authentication before fetching, then immediately displays the list',async()=>{
 const a=app();await settle();assert.equal(a.calls.length,0);assert.equal(a.nodes['#signup-list'].hidden,true);
 a.nodes['#access'].value='synthetic-passcode';await a.nodes['#pdf-form'].events.submit({preventDefault(){}});
 assert.equal(a.calls[0].body.accessCode,'synthetic-passcode');assert.equal(a.nodes['#signup-list'].hidden,false);assert.equal(a.nodes['#access'].value,'');
});
test('expired authorization hides the list and clears the saved session',async()=>{
 const a=app();a.setResponse({error:'Sign in again'},401);a.nodes['#access'].value='incorrect';await a.nodes['#pdf-form'].events.submit({preventDefault(){}});
 assert.equal(a.nodes['#pdf-form'].hidden,false);assert.equal(a.nodes['#signup-list'].hidden,true);assert.equal(a.nodes['#download'].hidden,true);assert.equal(a.data.get(STORAGE_KEY),undefined);
});
test('failed refresh labels the previous list and disables its PDF link',async()=>{
 const a=app(session);await settle();a.setResponse({error:'Service unavailable'},502);await a.nodes['#refresh'].events.click();
 assert.equal(a.nodes['#signup-rows'].children.length,2);assert.match(a.nodes['#status'].textContent,/previously loaded list/);assert.equal(a.nodes['#download'].hidden,true);
});
