import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extractFunction} from './r5-history-source.mjs';
const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
function harness(){
 const workers=[],document={hidden:false,activeElement:{id:'ledger-section-recipes',dataset:{}},getElementById:()=>({querySelector:()=>null})};
 class Worker{constructor(url){this.url=String(url);this.posts=[];this.terminated=false;workers.push(this);}postMessage(data){this.posts.push(data);}terminate(){this.terminated=true;}reply(data){this.onmessage?.({data});}error(){this.onerror?.({preventDefault(){}});}}
 const context={Worker,URL,document,CSS:{escape:x=>x},queueMicrotask:fn=>fn()};vm.createContext(context);
 const initial="let game={seed:1,operations:[]},modal={kind:'ledger',section:'recipes'},renders=0;const $=()=>({querySelector:()=>null});function render(){renders++;}function restoreLedger(){}const button=()=>'';let historyWorker=null,historyRequest=0,historyData=null,historyError='',historyLoading=false,historySnapshot=null;let caskSnapshot=null,caskProjection=null,caskWorker=null,caskRequest=0;";
 const constants=['historyVisible','caskModalVisible','emptyCaskView'].map(n=>source.split('\n').find(l=>l.startsWith('const '+n+'='))).join('\n');
 const functions=['prepareLedgerWorkers','readHistory','caskData'].map(n=>extractFunction(source,n).replaceAll('import.meta.url',"'https://example.test/shop-app.mjs'")).join('\n');
 vm.runInContext(initial+constants+'\n'+functions+`\nglobalThis.api={warm:prepareLedgerWorkers,history:readHistory,cask:caskData,setGame:s=>game=s,setModal:m=>modal=m,hidden:v=>document.hidden=v,retryHistory:()=>{historySnapshot=null;readHistory();},retryCask:()=>{caskSnapshot=null;return caskData();},view:()=>({historyData,historyError,historyLoading,caskProjection,renders,game})};`,context);
 return {...context.api,workers};
}
test('A1 worker warm-up sends no game and unchanged snapshots preserve existing projections',()=>{
 const h=harness(),raw=JSON.stringify(h.view().game);h.warm();assert.equal(h.workers.length,2);assert(h.workers.every(w=>w.posts.length===0));h.cask();h.history();assert.equal(h.workers.length,2);
 const [history,cask]=h.workers;history.reply({requestId:history.posts[0].requestId,history:{events:[]}});cask.reply({requestId:cask.posts[0].requestId,ledger:{casks:[]}});
 const projection=h.cask();h.cask();h.history();assert.equal(h.cask(),projection);assert.equal(history.posts.length,1);assert.equal(cask.posts.length,1);assert(h.workers.every(w=>!w.terminated));assert.equal(JSON.stringify(h.view().game),raw);
});
test('A1 reused workers reject out-of-order and replaced-snapshot replies',()=>{
 const h=harness();h.history();h.cask();const [history,cask]=h.workers,oldH=history.posts[0].requestId,oldC=cask.posts[0].requestId;
 h.setGame({seed:2,operations:[{key:'new'}]});h.history();h.cask();assert.equal(h.workers.length,2);history.reply({requestId:oldH,history:{events:['old']}});cask.reply({requestId:oldC,ledger:{casks:['old']}});assert.equal(h.view().historyData,null);assert.equal(h.view().caskProjection.loading,true);
 history.reply({requestId:history.posts[1].requestId,history:{events:['new']}});cask.reply({requestId:cask.posts[1].requestId,ledger:{casks:['new']}});assert.deepEqual(JSON.parse(JSON.stringify(h.view().historyData)),{events:['new']});assert.deepEqual(JSON.parse(JSON.stringify(h.view().caskProjection)),{casks:['new']});assert(h.workers.every(w=>!w.terminated));
});
test('A1 replies after closing a modal neither reopen it nor trigger redraw',()=>{
 const h=harness();h.history();h.cask();h.setModal(null);const renders=h.view().renders;for(const w of h.workers)w.reply({requestId:w.posts[0].requestId,history:{events:[]},ledger:{casks:[]}});assert.equal(h.view().renders,renders);assert.equal(h.view().historyLoading,false);assert.equal(h.view().caskProjection.loading,undefined);
});
test('A1 worker errors terminate failed instance; explicit retry creates replacement only',()=>{
 const h=harness();h.history();h.cask();const [history,cask]=h.workers;history.error();assert(history.terminated);assert(h.view().historyError);h.retryHistory();assert.equal(h.workers.length,3);assert(!cask.terminated);cask.error();assert(cask.terminated);assert.equal(h.view().caskProjection.error,true);h.retryCask();assert.equal(h.workers.length,4);
});
test('A1 hidden startup does not warm workers; demand works after visible',()=>{const h=harness();h.hidden(true);h.warm();assert.equal(h.workers.length,0);h.hidden(false);h.warm();assert.equal(h.workers.length,2);});
