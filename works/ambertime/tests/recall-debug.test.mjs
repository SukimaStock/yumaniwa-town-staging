import test from 'node:test';
import assert from 'node:assert/strict';
import {RECALL_DEBUG_SCENES,drawRecallDebugScene,createRecallDebugPreview} from '../recall/debug-scene.mjs';

class MockElement{
 constructor(tag='div'){
  this.tag=tag;this.attrs={};this.dataset={};this.listeners={};this.children=[];this.open=false;this.disabled=false;
  this.classList={add(){},remove(){}};this.offsetWidth=300;this.textContent='';
 }
 setAttribute(k,v){this.attrs[k]=v;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 fire(type,event={}){for(const fn of this.listeners[type]??[])fn(event);}
 contains(){return true;}
 focus(){this.focused=true;}
 showModal(){this.open=true;}
 close(){this.open=false;this.fire('close');}
 querySelector(k){return(this.matches??={})[k]??=new MockElement(k);}
 getContext(){return this.ctx??={rects:[],clearRect(){},fillRect(x,y,w,h){this.rects.push([x,y,w,h]);}};}
}
function fixture(){
 const doc={head:new MockElement('head'),body:new MockElement('body'),activeElement:new MockElement('button'),hidden:false,listeners:{},createElement:tag=>new MockElement(tag),addEventListener(type,fn){this.listeners[type]=fn;}};
 const jobs=new Map();let id=0;const win={matchMedia:()=>({matches:false}),setTimeout(fn,ms){jobs.set(++id,{fn,ms});return id;},clearTimeout(key){jobs.delete(key);}};
 const preview=createRecallDebugPreview({document:doc,window:win});const dialog=doc.body.children[0];
 const control=action=>dialog.querySelector(action==='next-button'?'.at-recall-controls [data-recall-action="next"]':`[data-recall-action="${action}"]`);
 const click=action=>{const target=control(action);target.dataset.recallAction=action==='next-button'?'next':action;dialog.fire('click',{target:{closest:()=>target}});};
 const tick=()=>{const job=[...jobs.values()][0];assert.equal(job?.ms,5000);jobs.delete([...jobs.keys()][0]);job.fn();};
 return {doc,win,jobs,preview,dialog,control,click,tick};
}

test('six fixed sample scenes, with no persistence references',()=>{
 assert.equal(RECALL_DEBUG_SCENES.length,6);
 assert.equal(new Set(RECALL_DEBUG_SCENES.map(x=>x.date)).size,6);
 for(const scene of RECALL_DEBUG_SCENES){assert.ok(scene.date);assert.ok(scene.sentence);assert.ok(scene.scene);}
});

test('each scene draws a distinct pixel composition',()=>{
 const outputs=[];
 for(const scene of RECALL_DEBUG_SCENES){const canvas=new MockElement('canvas');drawRecallDebugScene(canvas,scene.scene);assert.ok(canvas.ctx.rects.length>20);outputs.push(JSON.stringify(canvas.ctx.rects));}
 assert.equal(new Set(outputs).size,6);
});

test('auto advance, tap, pause, previous, final stop and debug-only close',()=>{
 const f=fixture();f.preview.open();assert.equal(f.dialog.open,true);
 assert.equal(f.dialog.querySelector('[data-recall-counter]').textContent,'1 / 6');assert.equal(f.jobs.size,1);
 f.tick();assert.equal(f.dialog.querySelector('[data-recall-counter]').textContent,'2 / 6');
 f.click('pause');assert.equal(f.jobs.size,0);f.click('next');assert.equal(f.dialog.querySelector('[data-recall-counter]').textContent,'3 / 6');assert.equal(f.jobs.size,0);
 f.click('previous');assert.equal(f.dialog.querySelector('[data-recall-counter]').textContent,'2 / 6');
 f.click('pause');assert.equal(f.jobs.size,1);
 for(let n=3;n<=6;n++)f.tick();
 assert.equal(f.dialog.querySelector('[data-recall-counter]').textContent,'6 / 6');assert.equal(f.jobs.size,0);
 assert.equal(f.control('next-button').textContent,'次の代へ');assert.equal(f.dialog.open,true);
 f.click('next');assert.equal(f.dialog.open,false);assert.equal(f.jobs.size,0);
 f.preview.open();assert.equal(f.dialog.querySelector('[data-recall-counter]').textContent,'1 / 6');f.preview.close();
});

test('reduced-motion keeps scenes under manual control',()=>{
 const f=fixture();f.win.matchMedia=()=>({matches:true});f.preview.open();assert.equal(f.jobs.size,0);
 assert.equal(f.control('pause').disabled,true);f.click('next');assert.equal(f.jobs.size,0);f.preview.close();
});
