// Node event-routing evidence with a fake DOM and fake renderer, never browser certification.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {PinchZoom} from '../peek-zoom.js';
class Surface {
 constructor(){this.events=new Map();this.style={};this.hidden=false;this.textContent='';this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};this.captures=new Set();}
 addEventListener(type,fn){const list=this.events.get(type)??[];list.push(fn);this.events.set(type,list);}
 dispatch(type,event={}){event.preventDefault??=()=>{event.prevented=true;};for(const f of this.events.get(type)??[])f(event);return event;}
 setAttribute(){}getBoundingClientRect(){return {left:0,top:0,width:390,height:844};}
 hasPointerCapture(id){return this.captures.has(id);}setPointerCapture(id){this.captures.add(id);}
 releasePointerCapture(id){this.captures.delete(id);this.dispatch('lostpointercapture',{pointerId:id,pointerType:'touch'});}
}
const canvas=new Surface(),hint=new Surface(),error=new Surface(),sound=new Surface(),reset=new Surface(),mapLink=new Surface(),doc=new Surface(),win=new Surface();
let touchSignals=0;win.trackTouristDeskTouch=()=>touchSignals++;
doc.hidden=false;doc.querySelector=s=>({'canvas':canvas,'.invitation':hint,'.error':error,'.sound':sound,'.view-reset':reset,'.desk-map-link':mapLink})[s];
const audio={withBaseline:x=>x,configure(){},enabled:false,unlock(){},resumeContext(){},syncBusVolumes(){},tone(){},resumeFromLifecycle(){},pauseForLifecycle(){}};win.SSE={audio};
const control={part:'dial',type:'rotate',initial:.24,value:.24,min:0,max:1,inertia:0},player={active:false,controls:[control],control:()=>control,grab(){this.active=true;},release(){this.active=false;},moveBy(id,delta){control.value+=delta;}};
const item={id:'rotary-dial-telephone',entry:{label:'電話',material:'machine'},player,position:[0,0,0],home:[0,0,0],localCamera:()=>({})};
let picks=0;const scene={zoom:1,items:[item],camera:{distance:16,fov:.6},view:[0,0,0,1],resize(){},setZoom(x){this.zoom=Math.max(1,Math.min(1.6,x));},pick(){picks++;return {item,part:'dial',point:[0,0,0]};},step(){}};
class FakeRenderer {resize(){}draw(){}restore(){}}
const context=vm.createContext({window:win,document:doc,console,performance:{now:()=>1000},devicePixelRatio:1,requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class {observe(){}},Map,Math});
const synthetic=values=>new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v);},{context});
const modules={pinch:synthetic({PinchZoom}),scene:synthetic({loadDesk:async()=>scene,DESK:{halfWidth:3.28,halfDepth:2.85}}),renderer:synthetic({DeskRenderer:FakeRenderer}),mapping:synthetic({manipulationMapping:(p,h,x)=>{let previous=x;return {delta:(next)=>{const d=(next-previous)/100;previous=next;return d;}};}})};
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8'),app=new vm.SourceTextModule(source,{context});
await app.link(spec=>spec.includes('peek-zoom')?modules.pinch:spec.includes('manipulation-mapping')?modules.mapping:spec.includes('renderer')?modules.renderer:modules.scene);await app.evaluate();
const e=(id,x,y=100)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,timeStamp:1000});
const send=(type,id,x,y=100)=>canvas.dispatch(type,e(id,x,y));
assert.equal(reset.hidden,true);send('pointerdown',1,100);assert.equal(player.active,true);send('pointerdown',2,200);assert.equal(player.active,false);assert.equal(picks,1);assert.equal(touchSignals,1);assert.equal(canvas.captures.size,2);
send('pointermove',2,230);assert.equal(scene.zoom,1.3);assert.equal(reset.hidden,false);assert.equal(control.value,.24);
send('pointerup',2,230);send('pointermove',1,160);send('pointerup',1,160);assert.equal(control.value,.24);assert.equal(canvas.captures.size,0);
send('pointerdown',3,100);send('pointerup',3,100);assert.ok(Math.abs(control.value-.89)<1e-6);const value=control.value;
reset.dispatch('click');assert.equal(scene.zoom,1);assert.equal(reset.hidden,true);assert.equal(control.value,value);
// A held stamp returns through its existing release path when the second finger arrives.
item.id='ticket-stamper';item.entry.press=true;control.type='linear';control.part='press';control.initial=.12;control.value=.12;control.min=0;control.max=.32;
send('pointerdown',4,100);assert.equal(control.value,0);send('pointerdown',5,200);assert.equal(player.active,false);assert.equal(item.returning.part,'press');assert.equal(item.returning.value,.12);send('pointermove',5,240);const pinched=scene.zoom;send('pointercancel',5,240);send('pointermove',4,180);send('pointerup',4,180);assert.equal(scene.zoom,pinched);assert.equal(control.value,0);
// Reset/rotation/visibility and GL loss release every captured pointer without a new tap.
send('pointerdown',6,100);send('pointerdown',7,200);reset.dispatch('click');assert.equal(canvas.captures.size,0);assert.equal(scene.zoom,1);send('pointerup',6,100);send('pointerup',7,200);
send('pointerdown',8,100);send('pointerdown',9,200);win.dispatch('resize');assert.equal(canvas.captures.size,0);assert.equal(player.active,false);
send('pointerdown',10,100);send('pointerdown',11,200);doc.hidden=true;doc.dispatch('visibilitychange');assert.equal(canvas.captures.size,0);doc.hidden=false;doc.dispatch('visibilitychange');
send('pointerdown',12,100);canvas.dispatch('webglcontextlost');assert.equal(canvas.captures.size,0);assert.equal(player.active,false);const beforePicks=picks;send('pointerdown',13,100);assert.equal(picks,beforePicks);canvas.dispatch('webglcontextrestored');send('pointerdown',14,100);send('pointerup',14,100);assert.ok(picks>beforePicks);
for(const type of ['contextmenu','selectstart','dragstart']){assert.equal(canvas.dispatch(type).prevented,true);assert.notEqual(doc.dispatch(type).prevented,true);};
await Promise.resolve(sound.dispatch('click'));assert.equal(audio.enabled,true);assert.equal(sound.textContent,'音あり');
console.log('PASS actual app event routing: pinch cancellation, drain, normal tap, reset, stamp release, cancel, resize, visibility, GL loss, native UI and sound button. Fake DOM only.');

// A reading-stand tap operates its hinge and only reveals a separate HTML anchor.
item.id='folding-reading-stand';item.entry.press=false;control.type='hinge';control.value=.3;
mapLink.hidden=true;const zoomBefore=scene.zoom;
send('pointerdown',20,100);send('pointerup',20,100);assert.equal(mapLink.hidden,false);assert.equal(scene.zoom,zoomBefore);assert.equal(control.value,control.min);
// Drag and pinch never reveal the link or navigate.
send('pointerdown',21,100);send('pointermove',21,130);send('pointerup',21,130);assert.equal(mapLink.hidden,true);
send('pointerdown',22,100);send('pointerdown',23,200);send('pointermove',23,230);send('pointerup',23,230);send('pointerup',22,100);assert.equal(mapLink.hidden,true);
mapLink.hidden=false;assert.notEqual(mapLink.dispatch('click').prevented,true);assert.equal(canvas.captures.size,0);
console.log('PASS separate map anchor, existing hinge tap, no link on drag/pinch, native guide behavior.');

const normalPick=scene.pick;scene.pick=()=>null;const countBeforeMiss=touchSignals;send('pointerdown',30,100);send('pointerup',30,100);assert.equal(touchSignals,countBeforeMiss);scene.pick=normalPick;win.trackTouristDeskTouch=()=>{throw new Error('tracker unavailable');};send('pointerdown',31,100);assert.equal(player.active,true);send('pointerup',31,100);assert.equal(player.active,false);
