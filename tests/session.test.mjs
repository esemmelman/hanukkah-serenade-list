import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSession,saveSession,clearSession,STORAGE_KEY} from '../docs/session.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('remembers a successful session across page loads until its exact expiration',()=>{
 const s=storage(),session={token:'signed-session',expiresAt:1000};
 saveSession(s,session);assert.deepEqual(readSession(s,999),session);
 assert.equal(readSession(s,1000),null);assert.equal(s.getItem(STORAGE_KEY),null);
});
test('corrupt and blocked storage do not prevent signing in',()=>{
 const s=storage();s.setItem(STORAGE_KEY,'broken');assert.equal(readSession(s),null);
 assert.equal(readSession(undefined),null);assert.doesNotThrow(()=>saveSession(undefined,{token:'test'}));
 saveSession(s,{token:'test',expiresAt:9999999999999});clearSession(s);assert.equal(readSession(s),null);
});
