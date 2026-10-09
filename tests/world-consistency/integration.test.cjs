'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {auditTimeline}=require('./timeline-audit.cjs');
const pumpoko=require('./pumpoko-contract.cjs'),orbit=require('./orbit-contract.cjs');
const P=(event,extra={})=>({event,session:1,mode:'journey',travelling:0,arrived:2,lost:7,total:9,resolved:true,resultCount:2,growthComplete:false,...extra});
const O=(event,extra={})=>({event,session:1,pending:[],decoded:['S:01'],found:1,read:[1],interpreted:[1],data:1,...extra});
test('PUMPOKO coherent transition with title reset and fresh next run',()=>{
 const f=[P('resolved'),P('grown',{growthComplete:true}),P('return-title',{mode:'prologue',travelling:9,arrived:0,lost:0,resolved:false,resultCount:0,growthComplete:false}),P('second-journey',{session:2,travelling:9,arrived:0,lost:0,resolved:false,resultCount:0})];
 assert.deepEqual(auditTimeline(f,pumpoko),[]);
});
test('ORBIT coherent packet recovery, HOME decode and inert archive replay',()=>{
 const f=[O('start',{pending:[],decoded:[],found:0,read:[],interpreted:[],data:0}),O('SERA-recovery',{pending:['S:01'],decoded:[],found:0,read:[],interpreted:[]}),O('HOME-before-analysis',{pending:['S:01'],decoded:[],found:0,read:[],interpreted:[]}),O('HOME-analysis',{read:[],interpreted:[]}),O('first-memory'),O('archive-replay')];
 assert.deepEqual(auditTimeline(f,orbit),[]);
});
for(const [label,frames,contract,id] of [
 ['premature-resolution',[P('before',{resolved:false,travelling:1,arrived:1}),P('bad',{travelling:1})],pumpoko,'NO_PREMATURE_RESOLUTION'],
 ['duplicate-seed',[P('ok'),P('bad',{arrived:3})],pumpoko,'SEED_CONSERVATION'],
 ['result-drift',[P('ok'),P('bad',{resultCount:1})],pumpoko,'RESULT_EQUALS_ARRIVALS'],
 ['dirty-reset',[P('grown',{growthComplete:true}),P('return-title',{mode:'prologue',arrived:1,lost:0,resolved:false})],pumpoko,'RESET_AT_TITLE'],
 ['early-decode',[O('before',{pending:[],decoded:[],found:0,read:[],interpreted:[]}),O('SERA-recovery',{pending:['S:01']})],orbit,'SERA_NO_PREMATURE_DECODE'],
 ['double-accounted-packet',[O('before'),O('bad',{pending:['S:01']})],orbit,'NO_PENDING_DECODED_OVERLAP'],
 ['inert-replay-violation',[O('before'),O('archive-replay',{data:2})],orbit,'ARCHIVE_REPLAY_INERT'],
 ['lost-packet',[O('before',{pending:['S:02']}),O('bad')],orbit,'PENDING_ACCOUNTED']
])test('detects '+label,()=>{const issues=auditTimeline(frames,contract);assert.ok(issues.some(x=>x.rule===id),'expected '+id+', got '+JSON.stringify(issues));assert.ok(issues.every(x=>Number.isInteger(x.step)&&x.step>=0));});


// These cases capture real state from the *current* work implementations.
// The synthetic mutation cases above test detection, not real gameplay.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'../..');

function livePumpoko() {
 const D=require(path.join(root,'works/pumpoko/dynamics.js'));
 const J=require(path.join(root,'works/pumpoko/journey.js'));
 const keys=new Set();
 let config,journey=null;
 const input={action:k=>keys.has(k),actionPressed:()=>false,reset(){keys.clear()}};
 const reference={bgm:{active:.3},se:{action:.2,soft:.1}};
 const SSE={
   createApp:c=>{config=c;}, input, lifecycle:{paused:false},
   audio:{enabled:false,baseline:()=>({reference}),withBaseline:x=>x,play(){}}
 };
 const window={
   location:{search:'?dev=1&ending=2'},addEventListener(){},
   SUKIMASTOCK_WORK:{id:'pumpoko',logicalWidth:390,logicalHeight:740,frameRate:60,title:'PUMPOKO'},
   PumpkinDynamics:D,
   PumpkinJourney:{...J,create(...args){journey=J.create(...args);return journey;}},
   PumpkinStageDraw:{}
 };
 const context={
   window,location:window.location,document:{hidden:false},
   SSE,URLSearchParams,BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED'
 };
 vm.runInNewContext(fs.readFileSync(path.join(root,'works/pumpoko/sketch.js'),'utf8'),context);
 const scene=config.scenes.main;
 const trace=[],snapshot=(event,session)=>{
   const p=window.PumpkinProbe();
   // Probe returns scene-visible state; result count comes from the real Journey.
   trace.push({
     event,session,mode:p.mode,total:p.seedCount,
     travelling:p.travelling,arrived:p.arrived,lost:p.lost,
     resolved:!!p.ending,
     resultCount:p.mode==='journey'?journey?.result?.arrivals.length??0:0,
     growthComplete:!!p.ending?.growthComplete
   });
 };
 snapshot('start',1);
 let resolved=false, grown=false, returned=false;
 for(let i=0;i<30*60;i++){
   scene.update(1/60);
   const p=window.PumpkinProbe();
   if(!resolved&&p.ending){resolved=true;snapshot('resolved',1);}
   if(resolved&&!grown&&p.ending?.growthComplete){grown=true;snapshot('grown',1);}
   if(p.mode==='prologue'){returned=true;snapshot('return-title',1);break;}
 }
 assert.ok(resolved&&grown&&returned,'first actual journey completed and returned');
 assert.equal(trace.find(x=>x.event==='resolved').resultCount,2);
 keys.add('right');keys.add('down');
 let started=false;
 for(let i=0;i<60*60;i++){
   scene.update(1/60);
   if(window.PumpkinProbe().mode==='journey'){
     started=true;snapshot('second-journey',2);break;
   }
 }
 assert.ok(started,'a new journey begins from the real prologue');
 keys.clear();
 assert.deepEqual(auditTimeline(trace,pumpoko),[]);
 return trace;
}

function liveOrbit() {
 const {load,home,finish}=require(path.join(root,'works/orbit-02/tests/harness.cjs'));
 const {world:w}=load();
 const trace=[],snapshot=event=>trace.push({
   event, pending:[...w.dataSignals.pendingAnalysis],
   decoded:[...w.dataSignals.decoded],found:w.echoes.found,
   read:[...w.echoes.read],interpreted:[...w.echoes.interpreted],
   data:w.resources.data
 });
 const tick=()=>{w.eve.timer=Math.max(0,w.eve.timer-1/60);w.updateNarrative(1/60);};
 snapshot('start');
 w.closeHomeTerminal();
 const p=w.fixedPlanets.find(p=>p.kind==='data'&&!p.depleted);
 assert.ok(p,'recoverable SERA must exist');
 w.base.level=Math.max(w.base.level,w.planetInteractionTier(p));
 w.mode='landed';w.landPlanet=p;w.resetHarvestCycle();w.updateHarvest(10);
 snapshot('SERA-recovery');
 home(w);w.updateNarrative(.01);
 snapshot('HOME-before-analysis');
 for(let i=0;i<3000&&!w.echoes.found;i++)tick();
 assert.equal(w.echoes.found,1,'HOME analysis should discover one Echo');
 snapshot('HOME-analysis');
 for(let i=0;i<2000&&!w.echoStory.active;i++)tick();
 assert.ok(w.echoStory.active,'new Echo is presented after analysis');
 finish(w);
 snapshot('first-memory');
 home(w);assert.equal(w.openEchoArchive(),true);
 w.homeTerminal.archivePage=0;w.eve.timer=0;
 assert.notEqual(w.startEchoMemory(1,'archive'),false);
 finish(w);
 snapshot('archive-replay');
 assert.deepEqual(auditTimeline(trace,orbit),[]);
 return trace;
}

test('LIVE PUMPOKO: scene events satisfy the shared audit through second journey',()=>{
 const trace=livePumpoko();
 assert.deepEqual(trace.map(x=>x.event),
   ['start','resolved','grown','return-title','second-journey']);
});
test('LIVE ORBIT 02: recovery, HOME knowledge and archive replay satisfy the shared audit',()=>{
 const trace=liveOrbit();
 assert.deepEqual(trace.map(x=>x.event),
   ['start','SERA-recovery','HOME-before-analysis','HOME-analysis','first-memory','archive-replay']);
});
