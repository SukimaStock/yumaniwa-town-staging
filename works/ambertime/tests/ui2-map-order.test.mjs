import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {scopedNotices} from '../event-notices.mjs';
import {mapNoticeBaseline,newlyUnlocked} from '../world-map-view.mjs';
const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const revealSource=app.slice(app.indexOf('function noteMapReach('),app.indexOf('let modalReturnFocus'));
const world=(id,text='全国へ口コミが届きました。')=>({id:'town:'+id,kind:'message',text});
function harness({room='sales',max=5,announced=1}={}){
 let time=0,safe=true,nextTimer=0,visible=null;const timers=new Map(),shown=[],log=[];
 const lane=scopedNotices({room:()=>room,safe:()=>safe,now:()=>time,show:(text,entries,lifetime,kind)=>{visible={text,entries,lifetime,kind};shown.push(visible);log.push('notice:'+text);},hide:()=>{visible=null;},setTimer:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:time+ms});return id;},clearTimer:id=>timers.delete(id)});
 const game={tastingId:null,decisions:[],trade:{offer:null},shop:{offer:null},still:{phase:'ready'},core:{month:1}};
 const storage={hidden:true},sandbox={game,document:{hidden:false},countdown:{active:false},mapProgress:()=>({bottled:true,max}),newlyUnlocked,automaticNews:lane,m0:{isOpen:false},regionalPending:()=>[],generationState:()=>({phase:'working'}),$:()=>storage,mapNoticeSave(){log.push('map:saved');},stopClock(){log.push('map:opened');}};
 vm.runInNewContext(`let mapShown=${announced},mapAnnounced=${announced},mapPending=0,worldMapStage=1,modal=null,runtimeHalted=false,preview=true,canSave=true,userPaused=true;`+revealSource+`;globalThis.state=()=>({mapShown,mapAnnounced,mapPending,worldMapStage,modal,userPaused});globalThis.close=()=>{modal=null;};globalThis.setModal=value=>{modal=value;};globalThis.halt=value=>{runtimeHalted=value;};`,sandbox);
 return {lane,game,sandbox,storage,shown,log,timers,get visible(){return visible;},max(n){max=n;},room(n){room=n;lane.update();},safe(n){safe=n;lane.update();},advance(ms){const end=time+ms;for(;;){const item=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!item||item[1].at>end)break;timers.delete(item[0]);time=item[1].at;item[1].fn();}time=end;},reach(){sandbox.noteMapReach();return sandbox.tryShowMapReveal();},reveal:()=>sandbox.tryShowMapReveal()};
}

test('rumor is visible before map and its full lifetime gates the automatic reveal',()=>{
 const h=harness(),fact=world('national');h.lane.push([fact]);assert.equal(h.reach(),false);assert.equal(h.lane.worldPending,true);assert.equal(h.sandbox.state().mapAnnounced,1);
 h.advance(6499);assert.equal(h.reveal(),false);h.advance(1);assert.equal(h.lane.worldPending,false);assert.equal(h.reveal(),true);
 assert.equal(h.sandbox.state().worldMapStage,5);assert.equal(h.sandbox.state().userPaused,true);assert.equal(h.shown.length,1);assert(h.log.indexOf('notice:'+fact.text)<h.log.indexOf('map:opened'));
 h.sandbox.close();assert.equal(h.reach(),false,'same reach is not opened twice');
});

test('unread world notice in another room cannot be bypassed by a map reveal',()=>{
 const h=harness({room:'warehouse'});h.lane.push([world('waiting')]);assert.equal(h.visible,null);assert.equal(h.lane.worldPending,true);assert.equal(h.reach(),false);
 h.advance(60000);assert.equal(h.reveal(),false);h.room('sales');assert.equal(h.visible.kind,'world');assert.equal(h.reveal(),false);h.advance(6500);assert.equal(h.reveal(),true);
});

test('interrupted world reading retains only remaining lifetime and never completes off-screen',()=>{
 const h=harness();h.lane.push([world('long','長い口コミ。'.repeat(30))]);const lifetime=h.visible.lifetime;h.reach();h.advance(4000);h.safe(false);assert.equal(h.visible,null);assert.equal(h.timers.size,0);assert.equal(h.lane.worldPending,true);
 h.advance(100000);assert.equal(h.reveal(),false);h.safe(true);assert.equal(h.visible.lifetime,lifetime-4000,'resume does not restart full reading time');assert.equal(h.lane.inspect().displayed,1,'resume retains one logical notice');assert.equal(h.reveal(),false);
 h.advance(lifetime-4001);assert.equal(h.reveal(),false);h.advance(1);assert.equal(h.reveal(),true);assert.equal(h.sandbox.state().userPaused,true);
});

test('explicit close finishes only current long notice and keeps next queued notice and reach',()=>{
 const h=harness();h.lane.push([world('long','長文。'.repeat(100))]);assert.equal(h.reach(),false);const next={id:'bottle:later',kind:'bottled',count:5};h.lane.push([next]);h.lane.clear();
 assert.equal(h.visible.kind,'operation');assert.equal(h.reveal(),false,'next notice remains visible instead of map overlap');assert.equal(h.shown.length,2);h.advance(3500);assert.equal(h.reveal(),true);
 h.lane.push([next,world('long','長文。'.repeat(100))]);assert.equal(h.shown.length,2,'closing never clears deduplication history');
});

test('multiple pending reaches coalesce to maximum after latest queued world news is read',()=>{
 const h=harness({room:'distill',max:3});h.lane.push([world('town')]);assert.equal(h.reach(),false);h.max(6);h.lane.push([world('overseas')]);assert.equal(h.reach(),false);
 h.room('sales');assert.equal(h.shown.length,1);assert.equal(h.visible.entries[0].id.startsWith('world-display:'),true);assert.equal(h.lane.inspect().received,2);h.lane.clear();assert.equal(h.reveal(),true);assert.equal(h.sandbox.state().worldMapStage,6);h.sandbox.close();assert.equal(h.reach(),false);
});

test('important decisions, offers, storage failures and an open M0 defer a completed reach',()=>{
 const blockers=[
  h=>{h.sandbox.countdown.active=true;return()=>{h.sandbox.countdown.active=false;};},
  h=>{h.sandbox.setModal({kind:'ledger'});return()=>h.sandbox.setModal(null);},
  h=>{h.game.decisions=[{caskId:4}];return()=>{h.game.decisions=[];};},
  h=>{h.game.trade.offer={id:1};return()=>{h.game.trade.offer=null;};},
  h=>{h.game.shop.offer={notified:false};return()=>{h.game.shop.offer=null;};},
  h=>{h.sandbox.regionalPending=()=>[{notified:false}];return()=>{h.sandbox.regionalPending=()=>[];};},
  h=>{h.sandbox.generationState=()=>({phase:'review'});return()=>{h.sandbox.generationState=()=>({phase:'working'});};},
  h=>{h.sandbox.m0.isOpen=true;return()=>{h.sandbox.m0.isOpen=false;};},
  h=>{h.storage.hidden=false;return()=>{h.storage.hidden=true;};},
  h=>{h.sandbox.halt(true);return()=>h.sandbox.halt(false);},
  h=>{h.sandbox.document.hidden=true;return()=>{h.sandbox.document.hidden=false;};}
 ];
 for(const block of blockers){const h=harness(),release=block(h);assert.equal(h.reach(),false);assert.equal(h.sandbox.state().mapAnnounced,1);release();assert.equal(h.reveal(),true);assert.equal(h.sandbox.state().mapAnnounced,5);}
});

test('restored historical reach and cleared transient queue do not replay old news or maps',()=>{
 const progress={max:6,bottled:true},baseline=mapNoticeBaseline(progress,null,true,{consumeHistorical:true});assert.deepEqual(baseline,{shown:6,announced:6});
 const h=harness({max:6,announced:baseline.announced});assert.equal(h.reach(),false);h.lane.reset();assert.equal(h.lane.worldPending,false);assert.equal(h.shown.length,0);assert.equal(h.reach(),false);
});

test('vague cross-modal decision count is removed without deleting decision and offer routes',()=>{
 assert.doesNotMatch(app,/このあと判断/);assert.doesNotMatch(app,/waiting=game\.decisions\.filter/);
 assert.match(app,/showShopOffer/);assert.match(app,/showGeneration/);assert.match(app,/game\.decisions\.length/);assert.match(app,/kind==='decision'/);
});

test('real mapNoticeLoad consumes valid v3 pending history without claiming an undrawn stage',()=>{
 const loadSource=app.slice(app.indexOf('function mapNoticeLoad('),app.indexOf('const mapViewMax='));
 for(const stored of [{version:3,shown:1,announced:1},null]){
  const game={core:{month:120,cash:1000},releases:[{id:1,bottles:5}],history:['same factual game']},before=JSON.stringify(game),progress={bottled:true,max:5};
  const saved=[],sandbox={game,mapProgress:()=>progress,mapNoticeBaseline,newlyUnlocked,MAP_NOTICE_KEY:'ui-only-map-notice',
   localStorage:{getItem:()=>stored===null?null:JSON.stringify(stored)},automaticNews:{active:null,worldPending:false},m0:{isOpen:false},$:()=>({hidden:true}),regionalPending:()=>[],document:{hidden:false},countdown:{active:false},generationState:()=>({phase:'working'}),stopClock(){throw Error('restored history must not open a map');},mapNoticeSave(){saved.push({...sandbox.state()});}};
  vm.runInNewContext('let mapShown=0,mapAnnounced=0,mapPending=4,worldMapStage=1,modal=null,runtimeHalted=false,preview=false,canSave=true;'+loadSource+revealSource+';globalThis.state=()=>({mapShown,mapAnnounced,mapPending,modal});',sandbox);
  sandbox.mapNoticeLoad(true);
  assert.equal(sandbox.state().mapShown,stored?1:5,'stored drawn stage remains honest; no-key historical baseline follows current contract');
  assert.equal(sandbox.state().mapAnnounced,5);assert.equal(sandbox.state().mapPending,0);assert.equal(saved.length,1);
  sandbox.noteMapReach();assert.equal(sandbox.tryShowMapReveal(),false);assert.equal(sandbox.state().modal,null);
  assert.equal(JSON.stringify(game),before,'consuming UI history never alters formal game facts');
 }
});
