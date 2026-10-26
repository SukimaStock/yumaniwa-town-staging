import test from 'node:test';
import assert from 'node:assert/strict';
import {mapProgress,mapStep,drawGameMap,newlyUnlocked,revealStart,mapIntroduction,mapSeenBaseline,mapNoticeBaseline} from '../world-map-view.mjs';
const make=(arrivals=[],shipments=[],deliveries=[],relations=[],events=[])=>({
 labConnection:{version:1,town:{arrivals,shipments,events}},shop:{deliveries,relations}
});
const arrived=(to,channel='road')=>({type:'arrival',to,channel});
test('new game, old saves and bottling without a sale stay at the distillery',()=>{
 assert.equal(mapProgress(null).max,1);assert.equal(mapProgress({shop:{}}).max,1);
 assert.equal(mapProgress(make()).max,1);assert.equal(mapProgress({...make(),releases:[{id:1,bottles:10}]}).max,1);
});
test('actual deliveries and retail sales open nearby, never rumor as a sale',()=>{
 assert.equal(mapProgress(make([],[{count:2,id:'retail:10:1'}])).max,2);
 assert.equal(mapProgress(make([],[],[{count:2}])).max,2);
 assert.equal(mapProgress(make([arrived('near-local')])).max,4);
 assert.equal(mapProgress(make([arrived('diner')])).max,3);
});
test('arrivals only unlock levels actually reached; jumps unlock skipped views',()=>{
 assert.equal(mapProgress(make([arrived('overseas-craft')])).max,5);
 assert.equal(mapProgress(make([arrived('national-food')])).max,5);
 assert.equal(mapProgress(make([arrived('near-wide')])).max,4);
 assert.equal(mapProgress(make([arrived('town','direct')])).max,1);
 assert.equal(mapProgress(make([arrived('online')])).max,1);
 assert.equal(mapProgress(make([{type:'rumor',to:'overseas-food'}])).max,1);
});
test('zoom is clamped to visible area, plus outward and minus inward',()=>{
 assert.equal(mapStep(1,'out',1),1);assert.equal(mapStep(1,'out',6),2);
 assert.equal(mapStep(6,'out',6),6);assert.equal(mapStep(6,'in',6),5);
 assert.equal(mapStep(3,'out',2),2);assert.equal(mapStep(1,'in',5),1);
});
test('display is a read-only projection of state and uses the Lab renderer',()=>{
 const game=make([arrived('overseas-craft')],[{count:3}],[],[{shopId:'supermarket'}],[{type:'inquiry',to:'overseas-craft'}]);
 const before=JSON.stringify(game);let draws=0;
 const canvas={getContext(){return {fillStyle:'',imageSmoothingEnabled:true,fillRect(x,y,w,h){draws++;assert.ok([x,y,w,h].every(Number.isInteger));assert.ok([x,y,w,h].every(n=>n%2===0));assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=144&&y+h<=144);}}}};
 assert.equal(drawGameMap(canvas,game,3),3);assert.ok(draws>25);
 assert.equal(drawGameMap(canvas,game,4),4);assert.equal(drawGameMap(canvas,game,5),5);assert.equal(drawGameMap(canvas,game,6),6);
 assert.equal(JSON.stringify(game),before);
 const old=make([arrived('overseas-craft')]);assert.equal(drawGameMap(canvas,old,6,6),6);assert.equal(mapProgress(old).max,5);
});

test('Earth requires an overseas inquiry or overseas-origin visit',()=>{
 const arrive=[arrived('overseas-craft')];
 assert.equal(mapProgress(make(arrive,[],[],[],[{type:'interest',to:'overseas-craft'}])).max,5);
 assert.equal(mapProgress(make(arrive,[],[],[],[{type:'rumor',to:'overseas-craft'}])).max,5);
 assert.equal(mapProgress(make(arrive,[],[],[],[{type:'memory',to:'overseas-craft'}])).max,5);
 assert.equal(mapProgress(make(arrive,[],[],[],[{type:'inquiry',to:'diner'}])).max,5);
 assert.equal(mapProgress(make(arrive,[],[],[],[{type:'visit',from:'diner',to:'distillery'}])).max,5);
 assert.equal(mapProgress(make(arrive,[],[],[],[{type:'inquiry',to:'overseas-food'}])).max,6);
 assert.equal(mapProgress(make([],[],[],[],[{type:'visit',from:'overseas-craft',to:'distillery'}])).max,6);
});
test('newly reached map stages coalesce and old-stage baseline is not replayed',()=>{
 assert.equal(newlyUnlocked(1,4),true);
 assert.equal(newlyUnlocked(4,4),false);
 assert.equal(newlyUnlocked(6,5),false);
 assert.equal(revealStart(2,6),2);
 assert.equal(revealStart(6,6),6);
});

// Run the production methods with deterministic host scheduling; no browser or copied policy.
import fs from 'node:fs';
import vm from 'node:vm';
function clock(){let id=0;const jobs=new Map();return {jobs,set:fn=>{jobs.set(++id,fn);return id;},clear:n=>jobs.delete(n),step(){const [n,fn]=jobs.entries().next().value??[];if(fn){jobs.delete(n);fn();}}};}
test('scene queue coalesces, cancels all presentation work hidden and after pagehide',()=>{
 const c=clock(),document={hidden:false},sandbox={document,requestAnimationFrame:c.set,cancelAnimationFrame:c.clear,setTimeout:c.set,clearTimeout:c.clear};
 vm.runInNewContext(fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export class CanvasScene','globalThis.CanvasScene=class CanvasScene'),sandbox);
 const scene=Object.create(sandbox.CanvasScene.prototype);let draws=0;scene.draw=()=>draws++;
 scene.queue();scene.queue();assert.equal(c.jobs.size,1);c.step();assert.equal(draws,1);
 scene.queue();for(const key of ['hintTimer','selectionTimer','motionTimer'])scene[key]=c.set(()=>assert.fail('cancelled timer fired'));
 document.hidden=true;scene.queue();assert.equal(c.jobs.size,0);assert.equal(scene.frame,0);
 document.hidden=false;scene.suspended=true;scene.queue();assert.equal(c.jobs.size,0);scene.suspended=false;scene.queue();c.step();assert.equal(draws,2);
 const actual=Object.create(sandbox.CanvasScene.prototype);actual.view={};actual.fontSettled=true;actual.suspended=true;actual.draw();document.hidden=true;actual.suspended=false;actual.draw();assert.equal(c.jobs.size,0);
});
test('actual scene drawing keeps selection blink visible but stops it behind a dialog',()=>{
 const c=clock(),dialog={open:false},document={hidden:false,getElementById:id=>id==='action-dialog'?dialog:null};
 const sandbox={document,setTimeout:c.set,clearTimeout:c.clear,cancelAnimationFrame:c.clear,performance:{now:()=>100},BODY_SIZE:16,drawSymbol(){}};
 vm.runInNewContext(fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export class CanvasScene','globalThis.CanvasScene=class CanvasScene'),sandbox);
 const scene=Object.create(sandbox.CanvasScene.prototype),ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
 Object.assign(scene,{fontSettled:true,view:{room:'warehouse',casks:[{id:1,selected:true}],products:[],calendar:'',generation:'',cash:''},root:{dataset:{}},ctx,world:{},viewport:{dpr:1,width:360,height:640,scale:1,offsetX:0,offsetY:0},layout:{caskSlots:[],equipment:{y:0}},reducedMotion:{matches:false},motion:{sample:()=>({nextMs:null})},activeControls:[],idleSince:0,controls(){},drawWorld(){},window(){},pixelRect(){},text(){},measure:()=>0,textMetrics:()=>({logical:16})});
 scene.draw();assert.equal(c.jobs.size,1,'visible selected object still blinks');dialog.open=true;scene.draw();assert.equal(c.jobs.size,0,'dialog leaves no scene timer');
 dialog.open=false;scene.draw();assert.equal(c.jobs.size,1,'closing dialog restores selection motion');scene.reducedMotion.matches=true;scene.draw();assert.equal(c.jobs.size,0);
});
test('map reveal coalesces to the latest stage, records announcement separately and has no timer',()=>{
 const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8'),c=clock();
 const game={...make([arrived('overseas-craft')],[],[],[],[{type:'visit',from:'overseas-craft',to:'distillery'}]),releases:[{bottles:3}],tastingId:null,decisions:[],trade:{offer:null},still:{phase:'ready'}};
 const sandbox={game,document:{hidden:false},countdown:{active:false},mapProgress,newlyUnlocked,setTimeout:c.set,clearTimeout:c.clear,mapNoticeSave(){},stopClock(){},generationState:()=>({phase:'working'})};
 vm.runInNewContext('let mapShown=1,mapAnnounced=1,mapPending=0,worldMapStage=1,modal=null,runtimeHalted=false,preview=true,canSave=true;'+source.slice(source.indexOf('function noteMapReach('),source.indexOf('let modalReturnFocus'))+';globalThis.state=()=>({mapShown,mapAnnounced,worldMapStage,modal});globalThis.close=()=>{modal=null;};',sandbox);
 sandbox.noteMapReach();sandbox.document.hidden=true;assert.equal(sandbox.tryShowMapReveal(),false);assert.equal(c.jobs.size,0);
 sandbox.document.hidden=false;assert.equal(sandbox.tryShowMapReveal(),true);assert.equal(sandbox.state().worldMapStage,6);assert.equal(sandbox.state().modal.source,'unlock');assert.equal(sandbox.state().mapShown,1,'opening does not claim an undrawn stage');assert.equal(sandbox.state().mapAnnounced,6);assert.equal(c.jobs.size,0);
 sandbox.close();sandbox.noteMapReach();assert.equal(sandbox.tryShowMapReveal(),false);assert.equal(c.jobs.size,0);assert.doesNotMatch(source,/mapFrame|animateMapReveal|mapRevealTarget/);
});

test('first bottle opens only one; factual shipment opens two and keeps saves read-only',()=>{
 const bottle={...make(),releases:[{id:1,bottles:3}]},before=JSON.stringify(bottle);
 assert.equal(mapProgress(bottle).bottled,true);assert.equal(mapProgress(bottle).max,1);
 assert.equal(mapProgress({...bottle,shop:{deliveries:[{count:1}]}}).max,2);
 assert.equal(mapProgress({...bottle,labConnection:{version:1,town:{shipments:[{count:1}]}}}).max,2);
 assert.equal(JSON.stringify(bottle),before);assert.equal(newlyUnlocked(0,1),true);
});
test('fresh zero baseline survives reload before introduction; old seen states remain intact',()=>{
 const empty=mapProgress(make()),bottle=mapProgress({...make(),releases:[{bottles:3}]});
 assert.equal(mapSeenBaseline(empty,{shown:1},true),0);assert.equal(mapSeenBaseline(bottle,{shown:0},true),0);
 assert.equal(mapSeenBaseline(bottle,null,false),0);assert.equal(mapSeenBaseline(bottle,null,true),1);
 assert.equal(mapSeenBaseline({...bottle,max:6},{shown:4},true),4);
 assert.equal(mapSeenBaseline({...bottle,max:6},null,true),6);
 assert.equal(mapSeenBaseline(empty,{shown:6},true),6);
 assert.equal(mapSeenBaseline(empty,{shown:6},false),0);
 assert.equal(mapSeenBaseline({...bottle,max:5},{shown:6},true),6);
});
test('introduction captions distinguish rumor, delivery, inquiry and overseas visitor',()=>{
 const bottle={...make(),releases:[{bottles:3}]};
 assert.equal(mapIntroduction(bottle,1),'最初の一本ができました。');
 assert.equal(mapIntroduction(make([],[],[{count:1}]),2),'ウイスキーが届きました。');
 assert.equal(mapIntroduction(make([arrived('town')]),3),'うわさが町に広がりました。');
 assert.equal(mapIntroduction(make([arrived('near-local')]),4),'うわさが周辺の地域に届きました。');
 assert.equal(mapIntroduction(make([arrived('national-food')]),5),'うわさが全国に届きました。');
 const far=make([arrived('overseas-craft')],[],[],[],[{type:'visit',from:'overseas-craft',to:'distillery'}]);
 assert.equal(mapIntroduction(far,6),'海外から訪問がありました。');
 assert.equal(mapIntroduction(make([],[],[],[],[{type:'inquiry',to:'overseas-food'}]),6),'海外から問い合わせが届きました。');
 for(const stage of [2,3,4])assert.match(mapIntroduction(far,stage),/地図も見られます/);
});
test('first introduction also shows latest unlocked stage immediately and never changes game',()=>{
 const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8'),c=clock();
 const game={...make([arrived('overseas-craft')],[],[],[],[{type:'visit',from:'overseas-craft',to:'distillery'}]),releases:[{bottles:3}],tastingId:null,decisions:[],trade:{offer:null},still:{phase:'ready'}},before=JSON.stringify(game);
 const sandbox={game,document:{hidden:false},countdown:{active:false},mapProgress,newlyUnlocked,setTimeout:c.set,clearTimeout:c.clear,mapNoticeSave(){},stopClock(){},generationState:()=>({phase:'working'})};
 vm.runInNewContext('let mapShown=0,mapAnnounced=0,mapPending=0,worldMapStage=1,modal=null,runtimeHalted=false,preview=true,canSave=true;'+source.slice(source.indexOf('function noteMapReach('),source.indexOf('let modalReturnFocus'))+';globalThis.state=()=>({mapShown,mapAnnounced,worldMapStage,modal});',sandbox);
 sandbox.noteMapReach();assert.equal(sandbox.tryShowMapReveal(),true);assert.equal(sandbox.state().worldMapStage,6);assert.equal(sandbox.state().mapShown,0);assert.equal(sandbox.state().mapAnnounced,6);assert.equal(c.jobs.size,0);assert.equal(JSON.stringify(game),before);
});
test('notice v1 and old no-key saves migrate without replay; v2 keeps drawn and announced independent',()=>{
 const p=mapProgress({...make(),releases:[{bottles:3}]});
 assert.deepEqual(mapNoticeBaseline(p,{version:1,shown:1},true),{shown:1,announced:1});
 assert.deepEqual(mapNoticeBaseline({...p,max:5},{version:1,shown:6},true),{shown:6,announced:6});
 assert.deepEqual(mapNoticeBaseline({...p,max:6},{version:2,shown:2,announced:6},true),{shown:2,announced:6});
 assert.deepEqual(mapNoticeBaseline(p,{version:2,shown:1,announced:0},true),{shown:1,announced:0});
 assert.deepEqual(mapNoticeBaseline(p,null,true),{shown:1,announced:1});
 assert.deepEqual(mapNoticeBaseline({...p,max:6},null,true),{shown:6,announced:6});
 assert.deepEqual(mapNoticeBaseline(p,{version:2,shown:6,announced:6},false),{shown:0,announced:0});
 assert.deepEqual(mapNoticeBaseline(p,{version:1,shown:0},true),{shown:0,announced:0});
 assert.deepEqual(mapNoticeBaseline(p,{version:2,shown:9,announced:'bad'},true),{shown:1,announced:1});
});
test('map history cannot unlock scales and close routes do not mark future stages',()=>{
 const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const sandbox={game:make(),mapProgress,mapShown:6};vm.runInNewContext(source.match(/const mapViewMax=.*?;/)[0]+'globalThis.maximum=mapViewMax;',sandbox);assert.equal(sandbox.maximum(),1);
 assert.match(source,/drawGameMap\(canvas,game,worldMapStage\)/);
 const target={focused:false,focus(){this.focused=true}},x={placementUI:null,comparisonKinds:[],render(){},schedule(){x.scheduled++},scheduled:0,$:()=>target};
 const fn=source.slice(source.indexOf('function closeModal('),source.indexOf('function trial('));
 vm.runInNewContext('let modal={kind:"world-map",source:"menu",parent:{kind:"aux-panel",marker:3}},mapShown=2,mapAnnounced=6;'+fn+'globalThis.state=()=>({modal,mapShown,mapAnnounced});globalThis.unlock=()=>{modal={kind:"world-map",source:"unlock"};};',x);
 x.closeModal();assert.equal(x.state().modal.kind,'aux-panel');assert.equal(x.state().modal.marker,3);assert(target.focused);assert.equal(x.scheduled,0);assert.equal(x.state().mapShown,2);assert.equal(x.state().mapAnnounced,6);
 x.unlock();x.closeModal();assert.equal(x.state().modal,null);assert.equal(x.scheduled,1);assert.equal(x.state().mapShown,2);assert.equal(x.state().mapAnnounced,6);
});
