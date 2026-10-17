import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const KEY='sukimastock.ambertime.wholesale.v6';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const response=(fixture,{ok=true,status=200}={})=>({ok,status,json:async()=>fixture});
async function harness(){
 const html=await readFile(new URL('../design/partners/browser-check.html',import.meta.url),'utf8');
 const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;\n/gm,'');
 const nodes=new Map(),requests=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',srcdoc:'',disabled:id==='#reload',checked:true,style:{}});return nodes.get(id);};
 const buttons=['offer','accepted','assigned'].map(name=>({dataset:{fixture:name}}));
 const context=vm.createContext({URL,Map,JSON,Error,location:{href:'https://example.test/works/ambertime/design/partners/browser-check.html'},window:{},document:{querySelector:node,querySelectorAll:()=>buttons},
  fetch:url=>{if(new URL(url).pathname.endsWith('/index.html'))return Promise.resolve({ok:true,text:async()=>'<html><head></head><body>game</body></html>'});const d=deferred();requests.push({...d,url:String(url)});return d.promise;},
  D:{restoreDistillery(){}},V09:{restoreDistillery(){}},firstDifference:()=>null,replayCheckpoint:fixture=>{if(fixture.replayFailure)throw Error('replay failed');return fixture;}});
 await vm.runInContext('(async()=>{'+source+'})()',context);
 return {node,buttons,requests,storage:context.window.qaStorage,choose:i=>buttons[i].onclick(),reload:()=>node('#reload').onclick()};
}
async function success(h,id='first'){
 const pending=h.choose(0);h.requests.at(-1).resolve(response({id}));await pending;
 assert.equal(h.node('#reload').disabled,false);assert.match(h.node('#game').srcdoc,/parent.qaStorage/);assert.equal(JSON.parse(h.storage.getItem(KEY)).game.id,id);
}
function cleared(h){assert.equal(h.storage.getItem(KEY),null);assert.equal(h.node('#game').srcdoc,'');assert.equal(h.node('#reload').disabled,true);}
test('QA fixture selection clears old success immediately and cannot reload after HTTP or network failure',async()=>{
 const h=await harness();await success(h);
 let pending=h.choose(1);cleared(h);assert.match(h.node('#status').textContent,/読み込み中/);h.reload();cleared(h);
 h.requests.at(-1).resolve(response({id:'wrong-page'},{ok:false,status:404}));await pending;cleared(h);assert.match(h.node('#diagnostic').textContent,/HTTP 404/);assert.doesNotMatch(h.node('#status').textContent,/公開版/);h.reload();cleared(h);
 await success(h,'second');pending=h.choose(2);h.requests.at(-1).reject(Error('offline'));await pending;cleared(h);assert.match(h.node('#diagnostic').textContent,/offline/);
});
test('QA replay failure cannot retain the previously selected memory or iframe',async()=>{
 const h=await harness();await success(h);const pending=h.choose(1);h.requests.at(-1).resolve(response({replayFailure:true}));await pending;cleared(h);assert.match(h.node('#diagnostic').textContent,/replay failed/);h.reload();cleared(h);
});
test('only latest overlapping fixture response can mount, including stale failure and delayed JSON',async()=>{
 const h=await harness();const first=h.choose(0),old=h.requests.at(-1),latest=h.choose(1);h.requests.at(-1).resolve(response({id:'latest'}));await latest;old.resolve(response({id:'stale'}));await first;assert.equal(JSON.parse(h.storage.getItem(KEY)).game.id,'latest');assert.equal(h.node('#reload').disabled,false);
 const staleFailure=h.choose(0),failure=h.requests.at(-1),next=h.choose(2);h.requests.at(-1).resolve(response({id:'newest'}));await next;failure.reject(Error('obsolete error'));await staleFailure;assert.equal(JSON.parse(h.storage.getItem(KEY)).game.id,'newest');assert.doesNotMatch(h.node('#diagnostic').textContent,/obsolete/);
 const json=deferred(),slow=h.choose(0);h.requests.at(-1).resolve({ok:true,json:()=>json.promise});await Promise.resolve();await Promise.resolve();const fast=h.choose(1);h.requests.at(-1).resolve(response({id:'fastest'}));await fast;json.resolve({id:'late-json'});await slow;assert.equal(JSON.parse(h.storage.getItem(KEY)).game.id,'fastest');
 h.node('#pc').onclick();assert.equal(h.node('#game').style.width,'1280px');assert.equal(h.node('#game').style.maxWidth,'none');h.node('#phone').onclick();assert.equal(h.node('#game').style.width,'390px');assert.equal(h.node('#game').style.maxWidth,'none');
});
