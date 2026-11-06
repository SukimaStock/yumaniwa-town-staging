import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extractFunction} from './r5-history-source.mjs';
const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
// S2 removes the normal cask/recipe replay worker. The separate history worker
// retains the A1 lifecycle contract; no historical source hashes are changed.
function harness(){
 const workers=[],document={hidden:false,activeElement:{id:'ledger-section-history',dataset:{}},getElementById:()=>({querySelector:()=>null})};
 class Worker{constructor(url){this.url=String(url);this.posts=[];this.terminated=false;workers.push(this);}postMessage(data){this.posts.push(data);}terminate(){this.terminated=true;}reply(data){this.onmessage?.({data});}error(){this.onerror?.({preventDefault(){}});}}
 const context={Worker,URL,document,CSS:{escape:x=>x},queueMicrotask:fn=>fn()};vm.createContext(context);
 const initial="let game={seed:1,operations:[]},modal={kind:'history'},renders=0;const $=()=>({querySelector:()=>null});function render(){renders++;}function restoreLedger(){}const button=()=>'';let historyWorker=null,historyRequest=0,historyData=null,historyError='',historyLoading=false,historySnapshot=null;";
 const constants=source.split('\n').find(l=>l.startsWith('const historyVisible='));
 const functions=['prepareLedgerWorkers','readHistory'].map(n=>extractFunction(source,n).replaceAll('import.meta.url',"'https://example.test/shop-app.mjs'")).join('\n');
 vm.runInContext(initial+constants+'\n'+functions+`\nglobalThis.api={warm:prepareLedgerWorkers,history:readHistory,setGame:s=>game=s,setModal:m=>modal=m,hidden:v=>document.hidden=v,retryHistory:()=>{historySnapshot=null;readHistory();},view:()=>({historyData,historyError,historyLoading,renders,game})};`,context);
 return {...context.api,workers};
}
test('history-only warm-up sends no game and unchanged snapshots preserve projection',()=>{
 const h=harness(),raw=JSON.stringify(h.view().game);h.warm();assert.equal(h.workers.length,1);assert.equal(h.workers[0].posts.length,0);assert.match(h.workers[0].url,/history-worker/);h.history();
 const [history]=h.workers;history.reply({requestId:history.posts[0].requestId,history:{events:[]}});const projection=h.view().historyData;
 h.history();h.warm();assert.equal(h.view().historyData,projection);assert.equal(h.workers.length,1);assert.equal(history.posts.length,1);assert(!history.terminated);assert.equal(JSON.stringify(h.view().game),raw);
});
test('history worker rejects out-of-order and replaced-snapshot replies',()=>{
 const h=harness();h.history();const [history]=h.workers,old=history.posts[0].requestId;
 h.setGame({seed:2,operations:[{key:'new'}]});h.history();assert.equal(h.workers.length,1);history.reply({requestId:old,history:{events:['old']}});assert.equal(h.view().historyData,null);assert.equal(h.view().historyLoading,true);
 history.reply({requestId:history.posts[1].requestId,history:{events:['new']}});assert.deepEqual(JSON.parse(JSON.stringify(h.view().historyData)),{events:['new']});assert(!history.terminated);
});
test('history replies after closing modal neither reopen it nor trigger redraw',()=>{
 const h=harness();h.history();h.setModal(null);const renders=h.view().renders;const w=h.workers[0];w.reply({requestId:w.posts[0].requestId,history:{events:[]}});assert.equal(h.view().renders,renders);assert.equal(h.view().historyLoading,false);
});
test('history worker errors terminate failed instance; retry creates one replacement',()=>{
 const h=harness();h.history();const [history]=h.workers;history.error();assert(history.terminated);assert(h.view().historyError);h.retryHistory();assert.equal(h.workers.length,2);assert.equal(h.workers[1].posts.length,1);assert(!h.workers[1].terminated);
});
test('hidden startup does not warm history worker; demand works after visible',()=>{const h=harness();h.hidden(true);h.warm();assert.equal(h.workers.length,0);h.hidden(false);h.warm();assert.equal(h.workers.length,1);});
