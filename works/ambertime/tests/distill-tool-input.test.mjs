import test from 'node:test';
import assert from 'node:assert/strict';
import {DistillToolInput} from '../distill-tool-input.mjs';
class Target{
 constructor(){this.handlers=new Map();this.captured=new Set();this.captureCount=0;}
 addEventListener(type,fn){if(!this.handlers.has(type))this.handlers.set(type,new Set());this.handlers.get(type).add(fn);}
 removeEventListener(type,fn){this.handlers.get(type)?.delete(fn);}
 setPointerCapture(id){this.captureCount++;this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);this.fire('lostpointercapture',{pointerId:id});}
 fire(type,values={}){const e={pointerId:1,isPrimary:true,button:0,clientX:100,clientY:100,detail:1,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...values};for(const f of [...(this.handlers.get(type)??[])])f(e);return e;}
}
function harness(){
 const root=new Target(),lever=new Target(),glass=new Target(),doc=new Target(),win=new Target();win.visualViewport=new Target();doc.defaultView=win;root.ownerDocument=doc;
 let v={visible:true,leverEnabled:true,leverDown:false,glassEnabled:false,glassMode:null,glassPosition:1,glassTravel:63};const actions=[],changes=[];
 const ui=new DistillToolInput({root,lever,glass,read:()=>v,onAction:k=>{actions.push(k);},onChange:s=>changes.push(s)});
 return {root,lever,glass,doc,win,ui,actions,changes,view:()=>v,set:patch=>{v={...v,...patch};ui.update(v);},collect(mode='start'){this.set({leverEnabled:false,leverDown:true,glassEnabled:true,glassMode:mode,glassPosition:mode==='start'?1:0});}};
}
test('lever uses relative pull, three crisp steps and capture outside its image; commit once on release',()=>{
 const h=harness();h.lever.fire('pointerdown',{clientY:250});assert(h.lever.hasPointerCapture(1));
 h.lever.fire('pointermove',{clientY:267});assert.equal(h.changes.at(-1).leverStep,0);
 h.lever.fire('pointermove',{clientY:268});assert.equal(h.changes.at(-1).leverStep,1);
 h.lever.fire('pointermove',{clientY:286});assert.equal(h.changes.at(-1).leverStep,2);assert.deepEqual(h.actions,[]);
 h.ui.update(h.view());h.lever.fire('pointerup',{clientY:310});assert.deepEqual(h.actions,['lever']);assert.equal(h.lever.hasPointerCapture(1),false);
 h.lever.fire('pointerup',{clientY:310});const click=h.lever.fire('click');assert(click.prevented&&click.stopped);assert.deepEqual(h.actions,['lever']);
 h.set({leverDown:true,leverEnabled:false});h.lever.fire('pointerdown');h.lever.fire('pointerup',{clientY:160});assert.deepEqual(h.actions,['lever']);
});
test('tap, short, upward or sideways lever pulls and input cancellations never start',()=>{
 for(const end of [{},{clientY:135},{clientY:50},{clientX:160,clientY:140}]){
  const h=harness();h.lever.fire('pointerdown');h.lever.fire('pointerup',end);assert.deepEqual(h.actions,[]);assert.deepEqual(h.changes.at(-1),{leverStep:null,glassOffset:null});
  h.lever.fire('pointerdown');h.lever.fire('pointermove',{clientY:160});h.lever.fire('pointercancel');h.lever.fire('pointerup',{clientY:160});assert.deepEqual(h.actions,[]);
  h.lever.fire('pointerdown');h.lever.fire('pointerup',{clientY:140});assert.deepEqual(h.actions,['lever'],'cancelled gesture must not lock later input');
 }
});
test('glass taps tolerate small movement, and pointer clicks are never replayed',()=>{
 const h=harness();h.glass.fire('pointerdown');h.glass.fire('pointerup');assert.deepEqual(h.actions,[],'glass is inactive before lever');
 h.collect();h.glass.fire('pointerdown');h.glass.fire('pointerup',{clientX:104,clientY:104});assert.deepEqual(h.actions,['glass']);
 h.glass.fire('click');h.glass.fire('click');h.glass.fire('click',{detail:0,pointerType:'touch'});h.glass.fire('click',{detail:0,sourceCapabilities:{firesTouchEvents:true}});assert.deepEqual(h.actions,['glass']);
 h.set({glassMode:'stop',glassPosition:0});h.glass.fire('pointerdown');h.glass.fire('pointerup');assert.deepEqual(h.actions,['glass','glass']);
 h.set({glassMode:null,glassEnabled:false,glassPosition:1});h.glass.fire('pointerdown');h.glass.fire('pointerup');h.glass.fire('click',{detail:0});assert.equal(h.actions.length,2);
});
test('glass follows bounded horizontal motion and only commits the valid direction on release',()=>{
 for(const mode of ['start','stop']){
  const h=harness();h.collect(mode);const sign=mode==='start'?-1:1;
  h.glass.fire('pointerdown');h.glass.fire('pointermove',{clientX:100+sign*200});assert.equal(h.changes.at(-1).glassOffset,sign*63);assert.deepEqual(h.actions,[]);
  h.glass.fire('pointerup',{clientX:100+sign*200});assert.deepEqual(h.actions,['glass']);h.glass.fire('click');assert.equal(h.actions.length,1);
  for(const end of [{clientX:100+sign*15},{clientX:100-sign*30},{clientX:100+sign*30,clientY:140}]){h.glass.fire('pointerdown');h.glass.fire('pointerup',end);assert.equal(h.actions.length,1);}
  h.glass.fire('pointerdown');h.glass.fire('pointermove',{clientX:100+sign*40});h.glass.fire('pointercancel');h.glass.fire('pointerup',{clientX:100+sign*40});assert.equal(h.actions.length,1);
 }
});
test('drag classification is sticky so returning near the origin is not turned into a tap',()=>{
 const h=harness();h.collect();h.glass.fire('pointerdown');h.glass.fire('pointermove',{clientX:80});h.glass.fire('pointerup',{clientX:99});h.glass.fire('click');assert.deepEqual(h.actions,[]);
 h.glass.fire('pointerdown');h.glass.fire('pointermove',{clientX:98});h.glass.fire('pointerup',{clientX:70});assert.deepEqual(h.actions,['glass']);
});
test('a second finger, lost capture, hiding, page leave, resize or state change cancels pending gestures',()=>{
 for(const interrupt of [h=>h.root.fire('pointerdown',{pointerId:2,isPrimary:false}),h=>h.lever.fire('lostpointercapture'),h=>{h.doc.hidden=true;h.doc.fire('visibilitychange');},h=>h.win.fire('pagehide'),h=>h.win.fire('resize'),h=>h.win.visualViewport.fire('resize'),h=>h.set({visible:false}),h=>h.set({leverEnabled:false})]){
  const h=harness();h.lever.fire('pointerdown');h.lever.fire('pointermove',{clientY:150});interrupt(h);h.lever.fire('pointerup',{clientY:150});assert.deepEqual(h.actions,[]);assert.deepEqual(h.changes.at(-1),{leverStep:null,glassOffset:null});
 }
 const h=harness();h.collect();h.glass.fire('pointerdown');h.glass.fire('pointermove',{clientX:60});h.set({glassMode:'stop',glassPosition:0});h.glass.fire('pointerup',{clientX:60});assert.deepEqual(h.actions,[]);
});
test('glass travel uses CSS geometry and keyboard access never makes lever clicks into pulls',()=>{
 const h=harness();h.lever.fire('click',{detail:0});assert.deepEqual(h.actions,[]);
 h.lever.fire('keydown',{key:'ArrowDown'});assert.equal(h.changes.at(-1).leverStep,1);h.lever.fire('keydown',{key:'Enter'});assert.deepEqual(h.actions,[]);
 h.lever.fire('keydown',{key:'ArrowDown',repeat:true});assert.equal(h.changes.at(-1).leverStep,1);
 h.lever.fire('keydown',{key:'ArrowDown'});h.lever.fire('keydown',{key:'Enter'});assert.deepEqual(h.actions,['lever']);
 h.lever.fire('keydown',{key:'ArrowDown'});h.lever.fire('keydown',{key:'Escape'});h.lever.fire('keydown',{key:'Enter'});assert.equal(h.actions.length,1);
 h.collect();h.set({glassTravel:30});h.glass.fire('pointerdown');h.glass.fire('pointermove',{clientX:0});assert.equal(h.changes.at(-1).glassOffset,-30);h.glass.fire('pointerup',{clientX:84});assert.equal(h.actions.length,2);
 h.glass.fire('click',{detail:0});assert.equal(h.actions.length,3);
 h.ui.destroy();h.glass.fire('click',{detail:0});h.lever.fire('pointerdown');h.lever.fire('pointerup',{clientY:160});assert.equal(h.actions.length,3);assert.equal(h.glass.handlers.get('pointerdown').size,0);
});
