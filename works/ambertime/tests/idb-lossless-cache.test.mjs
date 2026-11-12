import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {buildGraph,currentGraph,assertUpdatedGraph,sameIdentity} from './r0-cache-graph.mjs';
import {makeEntryDiagnostic} from '../entry-diagnostics.mjs';
const base='1051d6e6fedfc0de1462668303d65cb3dc597453';
const before=()=>buildGraph(path=>execFileSync('git',['show',base+':'+path],{maxBuffer:32*1024*1024}));
const prefix='works/ambertime/';
test('lossless live integration updates every changed dependency from exact predecessor',()=>{
 const old=before(),now=currentGraph();assertUpdatedGraph(old,now);
 for(const name of ['partner-orders.mjs','development-save.mjs','save-codec.mjs','lossless-json.mjs','formal-idb-main.mjs','session-entry.mjs']){
  const target=prefix+name,parents=[...now.nodes].filter(([,n])=>n.edges.some(e=>e.target===target)).map(([p])=>p);
  assert(parents.length,name);sameIdentity(now,parents,target);
  for(const p of parents)for(const e of now.nodes.get(p).edges.filter(e=>e.target===target)){
   const q=new URL(e.spec,'https://test/'+p).searchParams;assert.deepEqual(q.getAll('codec'),['v03']);assert(![...q.keys()].some(k=>k.startsWith('amp;')));
  }
 }
});
test('live writer explicitly emits lossless while actual diagnostics retain known outer version',()=>{
 const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 assert.match(app,/function sessionText[^\n]*encoding:'lossless-v1'/);
 assert.match(app,/saveVersion:isCurrentSession\(lastSavedText\)\?JSON.parse\(lastSavedText\).version:null/);
 assert.match(app,/get formalFormat\(\)[^\n]*JSON.parse\(lastSavedText\).version/);
 const url='https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/shop-app.mjs?codec=v03';
 assert.equal(makeEntryDiagnostic({versions:{app:url}}).versions.app,url);
 assert.equal(makeEntryDiagnostic({versions:{app:url+'PrivateName'}}).versions.app,undefined);
});
