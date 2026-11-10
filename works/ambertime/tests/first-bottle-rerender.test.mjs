import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {firstBottleCompletion} from '../first-bottle-view.mjs';
const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
// Exercise the production DOM update and animation completion branches, without
// a second implementation of their state transitions or browser dependencies.
const updateStart=app.indexOf("  const keepFirstBottle=kind==='first-bottle-complete'");
assert(updateStart>=0,'completion render must preserve the mounted ceremony node');
const update=app.slice(updateStart,app.indexOf("  $('dialog-actions').innerHTML=actions;",updateStart));
const finishStart=app.indexOf(" if(kind==='first-bottle-complete'&&!modal.ceremonyNode){");
assert(finishStart>=0,'completion must wait for label animationend');
const finish=app.slice(finishStart,app.indexOf(' dialog.dataset.kind=kind;',finishStart));
function harness(reduced=false){
 const state={modal:{kind:'first-bottle-complete',productId:71},reduced};
 const host={dataset:{},writes:0,node:null,set innerHTML(value){this.markup=value;this.writes++;const listeners=new Map();const label={addEventListener(type,fn,options){listeners.set(type,{fn,options});},emit(name){const entry=listeners.get('animationend');if(entry){entry.fn({animationName:name});if(entry.options?.once)listeners.delete('animationend');}}};this.node={parentElement:this,dataset:{},label,querySelector:()=>label};},querySelector(){return this.node;}};
 const $=id=>id==='dialog-body'?host:null;
 const run=new Function('state','$','body',"with(state){const kind=modal.kind;const matchMedia=()=>({matches:state.reduced});\n"+update+'\n'+finish+'}');
 const render=()=>run(state,$,firstBottleCompletion({name:'初めて',bottle:'round',label:'cream'},71,'standard',{esc:String},!!state.modal.ceremonyStarted));
 return {state,host,render};
}
test('first label remains animated across intermediate render and completes only once',()=>{
 const h=harness();h.render();const node=h.host.node;
 assert.equal(h.state.modal.ceremonyStarted,undefined);assert.equal(node.dataset.static,undefined);assert.match(h.host.markup,/first-bottle-base/);assert.match(h.host.markup,/first-bottle-label/);assert.doesNotMatch(h.host.markup,/data-static/);
 for(let i=0;i<5;i++)h.render();assert.equal(h.host.writes,1);assert.equal(h.host.node,node);assert.equal(h.state.modal.ceremonyStarted,undefined);
 node.label.emit('first-bottle-apply-label');assert.equal(h.state.modal.ceremonyStarted,true);assert.equal(node.dataset.static,'true');
 for(let i=0;i<5;i++)h.render();assert.equal(h.host.writes,1);assert.equal(h.host.node,node);assert.equal(node.dataset.static,'true');
});
test('reduced motion immediately displays final bottle without replacing it on render',()=>{
 const h=harness(true);h.render();const node=h.host.node;assert.equal(h.state.modal.ceremonyStarted,true);assert.equal(node.dataset.static,'true');h.render();assert.equal(h.host.node,node);assert.equal(h.host.writes,1);
});
test('late completion event cannot complete a different modal',()=>{
 const h=harness();h.render();const old=h.state.modal;h.state.modal={kind:'product',productId:72};h.host.node.label.emit('first-bottle-apply-label');assert.equal(old.ceremonyStarted,undefined);assert.equal(h.state.modal.ceremonyStarted,undefined);
});
