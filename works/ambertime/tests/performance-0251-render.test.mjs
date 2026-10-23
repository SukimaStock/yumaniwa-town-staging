import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual scene methods without a browser constructor or timing
// loop. Imports are presentation dependencies unused by these empty-room cases.
function sceneHarness(){
 const source=fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8').replace(/^import.*\n/gm,'').replace('export class CanvasScene','class CanvasScene');
 const attrs={},environment={document:{hidden:false,getElementById:()=>({setAttribute:(key,value)=>{attrs[key]=value;}})},performance:{now:()=>100}};
 const Scene=vm.runInNewContext(source+'\nCanvasScene;',environment),scene=Object.create(Scene.prototype),rects=[];
 scene.view={room:'warehouse',monthProgress:0,timeStatus:'進行中',casks:[],products:[],inspectId:null};
 scene.layout={floorY:460,shelf:{x:24,y:180,w:312,h:270,rails:[270,450]},caskSlots:[],productSlots:[]};
 scene.root={dataset:{}};scene.viewport={scale:1.25};scene.reducedMotion={matches:false};scene.arrival={room:'warehouse',ids:[],blinkId:null,hidden:false,staticIds:[],nextMs:null};
 scene.fontSettled=true;scene.suspended=false;scene.frame=0;scene.pixelRect=(...args)=>rects.push(args);
 let worldPaints=0;scene.worldCtx={clearRect:()=>worldPaints++,fillRect:()=>{}};
 return {scene,attrs,rects,environment,worldPaints:()=>worldPaints};
}

test('clock-only progress paints the existing bar without redrawing the room',()=>{
 const h=sceneHarness(),s=h.scene;s.drawWorld();assert.equal(h.worldPaints(),1);
 s.updateProgress(.25);assert.equal(s.view.monthProgress,.25);assert.equal(h.attrs['aria-valuenow'],'25');assert.match(h.attrs['aria-valuetext'],/25％/);
 assert.equal(h.rects.length,2);assert.equal(h.rects[1][2],348*.25);assert.equal(h.rects[1][3]*s.viewport.scale,2);assert.equal(h.worldPaints(),1);
 s.drawWorld();assert.equal(h.worldPaints(),1,'month progress does not invalidate room pixels');
 // A pending frame incorporates latest progress itself; hidden/suspended pages
 // must not receive direct canvas work from this fast path.
 s.frame=1;s.updateProgress(.5);assert.equal(h.rects.length,2);assert.equal(s.view.monthProgress,.5);
 s.frame=0;h.environment.document.hidden=true;s.updateProgress(.6);assert.equal(h.rects.length,2);
 h.environment.document.hidden=false;s.suspended=true;s.updateProgress(.7);assert.equal(h.rects.length,2);
});

test('room bitmap cache invalidates for room content, inspection and arrival changes',()=>{
 const h=sceneHarness(),s=h.scene;s.drawWorld();s.drawWorld();assert.equal(h.worldPaints(),1);
 s.view.inspectId=12;s.drawWorld();assert.equal(h.worldPaints(),2);
 s.arrival={...s.arrival,ids:[12],blinkId:12,hidden:true};s.drawWorld();assert.equal(h.worldPaints(),3);
 s.view.casks=[{id:12,type:'refill',selected:true}];s.drawWorld();assert.equal(h.worldPaints(),4);
 s.reducedMotion.matches=true;s.drawWorld();assert.equal(h.worldPaints(),5);
 s.layout={...s.layout,floorY:463};s.drawWorld();assert.equal(h.worldPaints(),6);
 s.view.room='sales';s.drawWorld();assert.equal(h.worldPaints(),7);
 s.drawWorld();assert.equal(h.worldPaints(),7);
});

test('display serials remain stable while extraction moves and refresh after creation operations',()=>{
 const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8'),start=source.indexOf('let serialDisplayKey='),end=source.indexOf('const caskName=',start);
 assert(start>=0&&end>start);
 let projections=0;
 const context={caskSerials:state=>{
  projections++;return new Map(state.operations.filter(o=>o.key==='fill').map((o,i)=>[o.id,i+1]));
 }};
 vm.runInNewContext('let game;'+source.slice(start,end)+'\nglobalThis.read=state=>{game=state;return displayCaskSerials();};',context);
 const initial={seed:42,operations:[{key:'fill',id:9}],still:{progress:0}},first=context.read(initial);
 assert.equal(first.get(9),1);assert.equal(projections,1);
 const advanced={...initial,still:{progress:50}};
 assert.equal(context.read(advanced),first);assert.equal(projections,1,'moving extraction does not request history projection');
 const created={...advanced,operations:[...advanced.operations,{key:'fill',id:15}]},second=context.read(created);
 assert.equal(second.get(9),1);assert.equal(second.get(15),2);assert.equal(projections,2);
 const otherSeed={...created,seed:43};context.read(otherSeed);assert.equal(projections,3);
});

test('staff presentation snapshot refreshes eligibility and work state after operations',()=>{
 const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8'),start=source.indexOf('let staffDisplayKey='),end=source.indexOf('function renderProgress',start);
 assert(start>=0&&end>start);
 let validations=0;
 const context={D:{staffStatus:state=>{
  validations++;return {hired:state.staff.hired,unlocked:state.staffProgression.distill.unlocked,canHire:state.staffProgression.distill.unlocked&&!state.staff.hired&&state.core.cash>=200,state:state.usual.reservation?.status==='active'?'working':state.usual.reservation?'queued':'idle'};
 }}};
 vm.runInNewContext('let game;'+source.slice(start,end)+'\nglobalThis.read=state=>{game=state;return staffDisplayStatus();};',context);
 const base={seed:42,operations:[],core:{month:0,cash:100,casks:[],products:[]},still:{phase:'distilling',progress:0},staff:{hired:false},staffProgression:{distill:{unlocked:false}},usual:{reservation:null},recipeBook:{selectedId:null}};
 const first=context.read(base);assert.equal(first.canHire,false);
 assert.equal(context.read({...base,still:{...base.still,progress:50}}),first);assert.equal(validations,1,'extraction alone leaves eligibility unchanged');
 const eligible={...base,operations:[{key:'month'}],core:{...base.core,month:1,cash:300},staffProgression:{distill:{unlocked:true}}};
 assert.equal(context.read(eligible).canHire,true);
 const hired={...eligible,operations:[...eligible.operations,{key:'staff-hire'}],staff:{hired:true}};
 assert.equal(context.read(hired).hired,true);assert.equal(context.read(hired).canHire,false);
 const queued={...hired,operations:[...hired.operations,{key:'staff-reserve'}],usual:{reservation:{status:'queued'}}};
 assert.equal(context.read(queued).state,'queued');
 const working={...queued,operations:[...queued.operations,{key:'staff-start'}],usual:{reservation:{status:'active'}}};
 assert.equal(context.read(working).state,'working');
 const finished={...working,operations:[...working.operations,{key:'staff-complete'}],usual:{reservation:null},still:{phase:'ready'}};
 assert.equal(context.read(finished).state,'idle');assert.equal(validations,6);
});
