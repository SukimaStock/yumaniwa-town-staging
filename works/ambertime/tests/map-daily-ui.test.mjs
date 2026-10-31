import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {layoutScene,computeViewport,projectRect} from '../canvas-layout.mjs';
import {SYMBOLS} from '../pixel-symbols.mjs';
import {mapProgress,newlyUnlocked} from '../world-map-view.mjs';
const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
test('unlocked map joins native management row without overlaps or small touch targets',()=>{
 for(const mapAvailable of [false,true])for(const staffAvailable of [false,true])for(const room of ['distill','warehouse','sales']){
  const list=layoutScene({room,staffAvailable,mapAvailable}).controls.filter(c=>c.y===520);
  assert.equal(list.some(c=>c.key==='open-world-map'),mapAvailable);
  assert(list.at(-1).x+list.at(-1).w<=360);
  for(let i=1;i<list.length;i++)assert(list[i-1].x+list[i-1].w<=list[i].x);
  for(const [width,height] of [[360,568],[375,620],[390,680]])for(const control of list){const r=projectRect(computeViewport({width,height}),control);assert(r.width>=44&&r.height>=44);}
 }
 assert.equal(SYMBOLS.map.length,11);assert(SYMBOLS.map.every(row=>row.length===11));
});
test('hiding market for a map retains return confirmation; ordinary hiding still cancels it',()=>{
 const text=fs.readFileSync(new URL('../market-ui.mjs',import.meta.url),'utf8');
 const head=text.slice(text.indexOf(' function update(options={}){'),text.indexOf('  const s=state();',text.indexOf(' function update(options={}){')))+'}';
 for(const preserveEditing of [true,false]){
  const marker={shopId:'town-liquor',productId:3,count:5};let editingCalls=0,cancelled=0;
  const x={root:{},geometry(){},cancel(){cancelled++;},setEditing(){editingCalls++;}};
  vm.runInNewContext('let visible=true,notice="",editing='+JSON.stringify(marker)+';'+head+';globalThis.read=()=>({editing,visible});',x);
  x.update({visible:false,preserveEditing});
  assert.equal(x.read().visible,false);assert.equal(cancelled,1);
  assert.equal(editingCalls,preserveEditing?0:1);
  assert.equal(JSON.stringify(x.read().editing),JSON.stringify(preserveEditing?marker:null));
 }
});
test('map close and nested shop close preserve the placement draft',()=>{
 const fn=source.slice(source.indexOf('function closeModal('),source.indexOf('function trial('));
 for(const modal of [{kind:'world-map',source:'direct'},{kind:'stockist',mapParent:{kind:'world-map',source:'direct'}}]){
  let resets=0,remembered=0;const x={placementUI:{reset(){resets++;}},rememberMapBrowse(){remembered++;},render(){},schedule(){},$:()=>({focus(){}})};
  vm.runInNewContext('let modal='+JSON.stringify(modal)+';'+fn+';globalThis.read=()=>modal;',x);x.closeModal();
  assert.equal(resets,0);assert.equal(remembered,modal.kind==='world-map'?1:0);
  assert.equal(x.read()?.kind??null,modal.kind==='world-map'?null:'world-map');
 }
});
test('host keeps first introduction but later unlock never switches daily range',()=>{
 const block=source.slice(source.indexOf('function noteMapReach('),source.indexOf('let modalReturnFocus'));
 for(const shown of [0,2]){
  const game={core:{month:20},releases:[{bottles:5}],labConnection:{version:1,town:{arrivals:[{type:'arrival',to:'national-food',channel:'road'}],events:[]}},tastingId:null,decisions:[],trade:{offer:null},shop:{offer:null},still:{phase:'ready'}};
  const before=JSON.stringify(game),x={game,document:{hidden:false},countdown:{active:false},mapProgress,newlyUnlocked,mapNoticeSave(){},stopClock(){},generationState:()=>({phase:'working'})};
  vm.runInNewContext('let mapShown='+shown+',mapAnnounced='+shown+',mapPending=0,worldMapStage=2,modal=null,runtimeHalted=false,preview=true,canSave=true;'+block+';globalThis.read=()=>({worldMapStage,modal,mapAnnounced});',x);
  assert.equal(x.showInitialMapNotice(),shown===0);assert.equal(x.read().worldMapStage,shown===0?5:2);assert.equal(x.read().mapAnnounced,5);assert.equal(JSON.stringify(game),before);
 }
});
