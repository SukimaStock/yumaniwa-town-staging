'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {load,home,finish,tap,root} = require('./harness.cjs');
function tick(w,seconds=25) { for(let i=0;i<seconds*60;i++){w.eve.timer=Math.max(0,w.eve.timer-1/60);w.updateNarrative(1/60)} }
function recover(w) {
 w.closeHomeTerminal();const p=w.fixedPlanets.find(p=>p.kind==='data'&&!p.depleted);
 assert.ok(p,'unused SERA');w.base.level=Math.max(w.base.level,w.planetInteractionTier(p));w.mode='landed';w.landPlanet=p;w.resetHarvestCycle();w.updateHarvest(10);
 assert.ok(w.dataSignals.pendingAnalysis.has(w.echoIdForPlanet(p)));return p;
}
function collect(w,index=1) { while(w.echoes.found<index){recover(w);home(w);tick(w)} }
function archive(w,index) {home(w);assert.equal(w.openEchoArchive(),true);w.homeTerminal.archivePage=Math.floor((index-1)/4);w.eve.timer=0;assert.notEqual(w.startEchoMemory(index,'archive'),false);finish(w);}
function progress(w){return JSON.stringify({n:w.echoes.found,d:[...w.echoes.discovered],resources:w.resources,base:w.base.level,incident:w.incident.found,finale:w.finale.completed,logs:w.systemLog});}
for(const locale of ['ja','en']) test(locale+': SERA recovery -> automatic HOME analysis -> deposit/text -> inert replay',()=>{
 const {world:w,storage,save,drawing,data}=load({locale});const voices=[];
 const say=w.sayEve.bind(w);w.sayEve=(line,...a)=>{voices.push(line);say(line,...a)};
 recover(w);tick(w,20);assert.equal(w.resources.data,1);assert.equal(w.echoes.found,0);assert.equal(w.echoes.read.size,0);
 assert.equal(w.dataSignals.decoded.size,0);assert.equal(w.echoStory.active,false);assert.equal(w.echoStory.analyzing,false);
 w.drawDataRecovery();w.drawDataAnalysis();assert.ok(!drawing.some(c=>c[0]==='text'&&String(c[1]).includes('ANALYSIS')));
 assert.equal(w.openEchoArchive(),false);assert.equal(w.queueDataAnalysis(w.landPlanet),false);
 home(w);w.updateNarrative(.01);assert.ok(w.echoStory.pendingTimer>0);assert.equal(w.echoes.found,0);
 tick(w,1);assert.ok(w.echoStory.analyzing);assert.equal(w.echoes.found,0);
 for(let i=0;i<1000&&w.echoStory.analyzing;i++)w.updateNarrative(1/60);
 assert.equal(w.echoStory.analysisResult,'echo');assert.equal(w.echoes.found,1);assert.equal(w.dataSignals.pendingAnalysis.size,0);assert.equal(w.dataSignals.decoded.size,1);
 for(let i=0;i<500&&w.echoStory.analysisResultTimer>0;i++)w.updateNarrative(1/60);
 assert.ok(w.homeTerminal.depositTimer>0);assert.equal(w.homeTerminal.mode,'archive');assert.equal(w.echoStory.active,false);
 tick(w,1);assert.equal(w.echoStory.active,true);assert.equal(w.homeTerminal.focusIndex,1);
 w.echoStory.timer=3;w.drawHomeTerminal();w.drawEchoMemory();
 for(const line of data.echo.memories?.[0]?.lines||[])assert.ok(drawing.some(c=>c[0]==='text'&&c[1]===line));
 finish(w);assert.ok(w.echoes.read.has(1));assert.ok(w.echoes.interpreted.has(1));assert.equal(voices.length,1);
 const before=progress(w);for(let i=0;i<3;i++){archive(w,1)}
 assert.equal(progress(w),before);assert.equal(voices.length,1);assert.equal(w.echoes.carriedThisTrip,0);
 assert.deepEqual(JSON.parse(storage.get(save.knowledgeKey)).dataSignals.pendingAnalysis,[]);
});
test('native terminal row, page bounds, cancel and replay input isolation',()=>{
 const {world:w}=load();home(w);let L=w.homeTerminalLayout();
 assert.equal(w.homeTerminalHit(L.archive.x+5,L.archive.y+14),'archive');tap(w,L.archive);assert.equal(w.homeTerminal.mode,'archive');
 tap(w,L.rows[0]);assert.equal(w.echoStory.active,false);assert.equal(w.homeTerminalHit(L.previous.x+5,L.previous.y+5),null);
 tap(w,L.next);tap(w,L.next);assert.equal(w.homeTerminal.archivePage,2);tap(w,L.next);assert.equal(w.homeTerminal.archivePage,2);
 tap(w,L.previous);tap(w,L.back);assert.equal(w.homeTerminal.mode,'browse');
 w.touch({state:'BEGAN',x:L.archive.x+10,y:L.archive.y+12});w.touch({state:'CANCELLED',x:L.archive.x+10,y:L.archive.y+12});assert.equal(w.homeTerminal.mode,'browse');
 w.echoes.found=1;w.echoes.discovered.add('fixture');w.openEchoArchive();tap(w,L.rows[0]);assert.equal(w.echoStory.active,true);
 tap(w,L.close);assert.equal(w.homeTerminal.visible,true);assert.equal(w.pressing,false);assert.equal(w.departHold,0);
 finish(w);w.eve.timer=0;tap(w,L.close);assert.equal(w.homeTerminal.visible,false);
 assert.equal(w.startEchoMemory(1,'archive'),false);
});
test('RETURN / WAIT require confirmed-memory revisit then counterpart, once across CONTINUE',()=>{
 const a=load(),w=a.world;collect(w,7);w.base.level=5;assert.equal(w.echoes.returnWaitLinked,false);
 const voices=[];w.sayEve=s=>{voices.push(s);w.eve.timer=2.6};home(w);w.openEchoArchive();tick(w,1);
 assert.equal(w.echoes.returnWaitLinked,false);assert.equal(w.homeTerminal.resonanceTarget,0);
 archive(w,2);assert.equal(w.echoes.returnWaitLinked,false);assert.equal(w.homeTerminal.resonanceTarget,7);
 archive(w,2);assert.equal(w.echoes.returnWaitLinked,false);archive(w,7);
 assert.equal(w.echoes.returnWaitLinked,true);assert.deepEqual(voices,['……待っていた。']);archive(w,2);assert.equal(voices.length,1);
 const b=load({storage:a.storage});assert.equal(b.world.loadGame(),true);assert.equal(b.world.echoes.returnWaitLinked,true);
 archive(b.world,7);assert.equal(b.world.echoes.returnWaitLinked,true);
});
test('pending DATA survives newer MEMORY, old HOME and rescue checkpoint; decoded wins',()=>{
 const a=load(),w=a.world;home(w);w.saveGame('checkpoint');const p=recover(w);const id=w.echoIdForPlanet(p);
 const snapshot=w.captureDiscoveryProgress();w.restoreHomeCheckpoint();w.mergeDiscoveryProgress(snapshot);
 assert.equal(w.echoes.found,0);assert.equal(w.dataSignals.pendingAnalysis.size,1);assert.equal(w.canLandOnPlanet(w.findPlanetById(id)),false);
 const b=load({storage:a.storage});assert.equal(b.world.loadGame(),true);assert.equal(b.world.dataSignals.pendingAnalysis.size,1);assert.equal(b.world.echoes.found,0);
 home(b.world);tick(b.world);assert.equal(b.world.echoes.found,1);assert.ok(b.world.echoes.interpreted.has(1));
 b.world.mergeDiscoveryProgress(snapshot);assert.equal(b.world.dataSignals.pendingAnalysis.size,0);
 const c=load({storage:b.storage});assert.equal(c.world.loadGame(),true);assert.equal(c.world.echoes.found,1);assert.equal(c.world.dataSignals.pendingAnalysis.size,0);assert.ok(c.world.echoes.interpreted.has(1));
});
test('legacy HOME v3 / MEMORY v1 migrate read memories without repeating first reaction',()=>{
 const a=load(),w=a.world;collect(w,2);home(w);
 const old=w.buildSaveData();delete old.echoes.interpreted;delete old.echoes.returnWaitLinked;
 a.storage.set(a.save.key,JSON.stringify(old));
 const mem=w.buildKnowledgeData();delete mem.echoes.interpreted;delete mem.echoes.returnWaitLinked;a.storage.set(a.save.knowledgeKey,JSON.stringify(mem));
 const b=load({storage:a.storage});assert.equal(b.world.loadGame(),true);assert.deepEqual([...b.world.echoes.interpreted],[1,2]);
 let count=0;b.world.sayEve=()=>count++;archive(b.world,1);assert.equal(count,0);
 // Old saves with no read array represented already-read memories.
 delete old.echoes.read;assert.equal(b.world.applySaveData(old),true);assert.deepEqual([...b.world.echoes.interpreted],[1,2]);
 // Explicit empty new field must remain empty.
 old.echoes.interpreted=[];b.world.applySaveData(old);assert.equal(b.world.echoes.interpreted.size,0);
});
test('invalid interpretation indices and stale pair flag cannot unlock memory/finale',()=>{
 const {world:w}=load();collect(w,2);const d=w.buildSaveData();d.echoes.interpreted=[0,1,2,7,12,1.5,'bad'];d.echoes.returnWaitLinked=true;
 w.applySaveData(d);assert.deepEqual([...w.echoes.interpreted],[1,2]);assert.equal(w.echoes.returnWaitLinked,false);
 assert.equal(w.startEchoMemory(12,'archive'),false);
});
test('final Echo requires HOME interpretation; existing Finale starts once, completed replays inert',()=>{
 const {world:w}=load();collect(w,11);recover(w);home(w);for(let i=0;i<1000&&!w.echoStory.active;i++)w.updateNarrative(1/60);assert.equal(w.echoes.found,12);w.echoStory.active=false;w.base.level=5;home(w);assert.equal(w.shouldStartFinale(),false);
 let starts=0;w.startFinale=()=>{starts++;w.finale.active=true;return true};
 archive(w,12);assert.equal(starts,0);w.eve.timer=0;w.updateNarrative(.1);assert.equal(starts,1);
 w.updateNarrative(.1);assert.equal(starts,1);w.finale.active=false;w.finale.completed=true;home(w);w.openEchoArchive();w.startEchoMemory(12,'archive');finish(w);assert.equal(starts,1);
});
test('save keys are independent; NEW GAME cannot delete the original game',()=>{
 const storage=new Map([['sukimastock.orbit.web.staging.save.v3','original'],['sukimastock.orbit.web.staging.knowledge.v1','original-memory']]);
 const a=load({storage});assert.equal(a.world.hasSave(),false);home(a.world);a.world.saveGame();a.world.clearSave();assert.equal(storage.get('sukimastock.orbit.web.staging.save.v3'),'original');assert.equal(storage.get('sukimastock.orbit.web.staging.knowledge.v1'),'original-memory');
 const standalone=load({pathname:'/works/orbit-02/'});assert.equal(standalone.save.key,'sukimastock.orbit-02.web.save.v3');
});
test('storage failure retains current-session HOME archive checkpoint',()=>{
 const {world:w,context}=load();collect(w,1);home(w);context.window.localStorage.setItem=()=>{throw Error('quota')};archive(w,1);
 assert.equal(w.storageSaveFailed,true);assert.deepEqual([...w.homeCheckpoint.echoes.interpreted],[1]);assert.equal(w.restoreHomeCheckpoint(),true);assert.equal(w.echoes.interpreted.has(1),true);
});
test('copied flight simulation and RESTORE costs/caps match Game Jam edition',()=>{
 const original=load({work:path.resolve(root,'../orbit')});const copy=load();
 original.context.Math.random=copy.context.Math.random=()=>.5;
 for(const a of [original,copy]) {const w=a.world;w.reset();w.ship.pos={x:1700,y:500};w.ship.vel={x:100,y:-80};w.pressing=true;w.pressScreen={x:260,y:370};for(let i=0;i<600;i++)w.fixedFlight(1/60);}
 assert.equal(JSON.stringify(copy.world.ship),JSON.stringify(original.world.ship));
 for(let l=1;l<=5;l++) {for(const a of [original,copy]){a.world.base.level=l;a.world.applyRestoreCaps(l,false)};assert.equal(JSON.stringify(copy.world.nextBaseRepairCost()),JSON.stringify(original.world.nextBaseRepairCost()));assert.equal(JSON.stringify(copy.world.resources),JSON.stringify(original.world.resources));}
});
test('all original Echo text/locales, planets, MiniMap, Codea and Engine copies preserved',()=>{
 for(const lang of ['ja','en']) {const a=load({locale:lang}),b=load({locale:lang,work:path.resolve(root,'../orbit')});delete a.data.archive;assert.deepEqual(a.data.echo,b.data.echo);a.data.eve.landing['3'].data[1]=b.data.eve.landing['3'].data[1];assert.deepEqual(a.data,b.data);assert.equal(JSON.stringify(a.world.fixedPlanets),JSON.stringify(b.world.fixedPlanets));assert.equal(a.World.prototype.drawMiniMap.toString(),b.World.prototype.drawMiniMap.toString());assert.equal(a.World.prototype.drawEchoMemory.toString(),b.World.prototype.drawEchoMemory.toString());}
 for(const file of ['codea-lite.js','sukimastock-engine.js','restore-ritual-inline.js']) assert.equal(fs.readFileSync(path.join(root,file),'utf8'),fs.readFileSync(path.resolve(root,'../orbit',file),'utf8'));
});

test('RESTORE report acknowledgement returns to browse; only status row enters Archive',()=>{
 const {world:w}=load();home(w);w.homeTerminal.restoreReportLevel=2;tap(w,w.homeTerminalLayout().restore);assert.equal(w.homeTerminal.mode,'browse');assert.equal(w.homeTerminal.restoreReportLevel,0);tap(w,w.homeTerminalLayout().archive);assert.equal(w.homeTerminal.mode,'archive');
});
test('CONTINUE after analysis commit resumes unread Echo only at HOME after opening',()=>{
 const a=load(),w=a.world;home(w);w.saveGame();recover(w);home(w);
 for(let i=0;i<1000&&w.echoes.found<1;i++)w.updateNarrative(1/60);
 const b=load({storage:a.storage});assert.equal(b.world.loadGame(),true);assert.equal(b.world.echoes.read.size,0);
 b.world.updateNarrative(.1);assert.equal(b.world.echoStory.active,false);b.world.homeTerminal.opening=false;b.world.updateNarrative(.1);
 assert.equal(b.world.echoStory.active,true);finish(b.world);assert.ok(b.world.echoes.interpreted.has(1));assert.equal(b.world.homeTerminal.mode,'archive');
});
test('NEW GAME clears only new-work saves, prologue hands off to ordinary flight',()=>{
 const a=load(),w=a.world;home(w);w.saveGame();w.echoes.found=3;
 tapScene(a.app||a.context.app.scenes.title);
 function tapScene(scene){const r=scene.newButton;scene.touch({state:'BEGAN',x:r.x+5,y:r.y+5});scene.touch({state:'ENDED',x:r.x+5,y:r.y+5});}
 assert.equal(w.hasSave(),false);assert.equal(a.calls[0][0],'drift');
 a.context.app.scenes.drift.enter();assert.equal(w.echoes.found,0);assert.equal(w.echoes.interpreted.size,0);
 for(let i=0;i<2400 && a.context.app.scenes.drift.prologueActive;i++)a.context.app.scenes.drift.update(1/60);
 assert.equal(a.context.app.scenes.drift.prologueActive,false);assert.equal(w.mode,'flight');assert.ok(Number.isFinite(w.ship.pos.x));
});
test('RESTORE completion 1→5 retains resource spending, caps, departure voice and save',()=>{
 const original=load({work:path.resolve(root,'../orbit')}),copy=load();
 for(let level=1;level<5;level++){
  for(const a of [original,copy]){home(a.world);a.world.base.level=level;a.world.applyRestoreCaps(level,false);const cost=a.world.nextBaseRepairCost();a.world.resources.ore=cost.ore;a.world.resources.data=cost.data;assert.equal(a.world.completeBaseRepair(cost),true);assert.equal(a.world.base.level,level+1);assert.equal(a.world.resources.ore,0);assert.equal(a.world.resources.data,0);assert.equal(a.world.eve.restoreDepartureLevel,level+1);assert.ok(a.storage.has(a.save.key));}
  assert.equal(JSON.stringify(copy.world.resources),JSON.stringify(original.world.resources));
 }
});
test('resonance/last-memory voice keeps every language-recovery band short',()=>{
 for(const locale of ['ja','en']){const {data}=load({locale});for(let level=1;level<=5;level++){assert.ok(data.archive.resonanceByLevel[level].length<=24);assert.ok(data.archive.completeByLevel[level].length<=28);assert.ok(data.archive.resonanceByLevel[level].split('\n').length<=2);}}
});

test('SERA recovery never blocks immediate departure or repeats a collected packet',()=>{
 const {world:w}=load();const p=recover(w);const before=w.resources.data;
 w.updateHarvest(10);assert.equal(w.resources.data,before);assert.equal(w.dataSignals.pendingAnalysis.size,1);
 w.landTarget={...w.ship.pos};w.pressing=true;for(let i=0;i<180&&w.mode==='landed';i++)w.fixedLanded(1/60);
 assert.equal(w.mode,'takeoff');assert.equal(w.echoes.found,0);assert.equal(w.echoStory.active,false);
 assert.equal(w.echoStory.pendingTimer,0);assert.equal(w.echoStory.analyzing,false);
});
test('voluntary HOME return keeps voice -> boot -> receive -> analysis order',()=>{
 const {world:w}=load();recover(w);const base=w.fixedPlanets.find(p=>p.kind==='base');
 w.mode='landed';w.landPlanet=base;w.landTarget={...w.ship.pos};w.hasDepartedBase=true;w.onLanded();
 assert.ok(w.eve.timer>0);assert.ok(w.homeTerminalBoot.pending);assert.equal(w.homeTerminal.visible,false);
 let received=false,analyzed=false;
 for(let i=0;i<1200&&!analyzed;i++){
  w.fixedUpdate(1/60);
  if(w.echoStory.pendingTimer>0){received=true;assert.ok(w.homeTerminal.visible);assert.equal(w.homeTerminal.opening,false);assert.equal(w.eve.timer,0)}
  if(w.echoStory.analyzing){assert.ok(received);analyzed=true;}
 }
 assert.ok(analyzed);assert.equal(w.echoes.found,0);assert.equal(w.dataSignals.pendingAnalysis.size,1);
});
test('multiple carried packets serialize and post-12 DATA yields empty HOME result',()=>{
 const {world:w}=load();recover(w);recover(w);assert.equal(w.echoes.found,0);assert.equal(w.dataSignals.pendingAnalysis.size,2);
 home(w);tick(w,30);assert.equal(w.echoes.found,2);assert.equal(w.echoes.interpreted.size,2);assert.equal(w.resources.data,2);assert.equal(w.dataSignals.pendingAnalysis.size,0);
 // A post-12 procedural packet still carries resource DATA, with no new memory.
 w.echoes.found=12;w.echoes.read=new Set(Array.from({length:12},(_,i)=>i+1));w.echoes.interpreted=new Set(w.echoes.read);
 recover(w);home(w);let empty=false;for(let i=0;i<800;i++){w.updateNarrative(1/60);if(w.echoStory.analysisResult==='empty')empty=true;}
 assert.ok(empty);assert.equal(w.echoes.found,12);assert.equal(w.resources.data,3);assert.equal(w.dataSignals.pendingAnalysis.size,0);assert.equal(w.echoStory.active,false);
});
test('actual emergency rescue keeps recovered DATA and processes only after HOME reveal',()=>{
 const a=load(),w=a.world;home(w);w.resources.ore=2;w.saveGame();recover(w);w.resources.ore=9;w.mode='rescue';w.rescue.didTeleport=false;
 w.fixedRescue(100);assert.equal(w.mode,'landed');assert.equal(w.landPlanet.kind,'base');assert.equal(w.resources.ore,2);
 assert.equal(w.resources.data,1);assert.equal(w.dataSignals.pendingAnalysis.size,1);assert.equal(w.echoes.found,0);
 w.updateNarrative(1);assert.equal(w.echoStory.analyzing,false);assert.equal(w.echoStory.pendingTimer,0);
 w.rescue.postFadeTimer=0;w.rescue.pendingReturnLine=false;w.homeTerminal.opening=false;w.eve.timer=0;tick(w);
 assert.equal(w.echoes.found,1);assert.equal(w.dataSignals.pendingAnalysis.size,0);assert.ok(w.echoes.interpreted.has(1));
});
test('pending-only knowledge enables CONTINUE and does not decode in space',()=>{
 const a=load();recover(a.world);assert.equal(a.world.hasKnowledgeSave(),true);assert.equal(a.world.hasPhysicalSave(),false);
 const b=load({storage:a.storage});assert.equal(b.world.loadGame(),true);assert.equal(b.world.mode,'flight');tick(b.world);
 assert.equal(b.world.echoes.found,0);assert.equal(b.world.dataSignals.pendingAnalysis.size,1);assert.equal(b.world.echoStory.active,false);
 home(b.world);tick(b.world);assert.equal(b.world.echoes.found,1);
});
test('pending optional migration rejects duplicates/decoded ids and preserves Phase 1 pair',()=>{
 const {world:w}=load();home(w);w.echoes.found=7;w.echoes.read=new Set([2,7]);w.echoes.interpreted=new Set([2,7]);w.echoes.returnWaitLinked=true;
 const d=w.buildSaveData();d.dataSignals={decoded:['S:01'],pendingAnalysis:['S:01','S:02','S:02',null,7,'']};w.applySaveData(d);
 assert.deepEqual([...w.dataSignals.pendingAnalysis],['S:02']);assert.equal(w.echoes.returnWaitLinked,true);
 delete d.dataSignals.pendingAnalysis;w.applySaveData(d);assert.equal(w.dataSignals.pendingAnalysis.size,0);assert.equal(w.echoes.returnWaitLinked,true);
});

test('first confirmations of Phase 1 RETURN / WAIT never arm or solve the pair',()=>{
 const {world:w}=load();collect(w,7);w.echoes.interpreted.delete(2);w.echoes.interpreted.delete(7);
 archive(w,2);archive(w,7);assert.equal(w.echoes.returnWaitLinked,false);assert.equal(w.homeTerminal.resonanceTarget,0);
 archive(w,7);assert.equal(w.homeTerminal.resonanceTarget,2);archive(w,2);assert.equal(w.echoes.returnWaitLinked,true);
});
for(const stage of ['receiving','analyzing','deposit','reading'])test('CONTINUE at '+stage+' cannot duplicate packet/resources and finishes interpretation',()=>{
 const a=load(),w=a.world;recover(w);home(w);
 const reached=()=>stage==='receiving'?w.echoStory.pendingTimer>0:stage==='analyzing'?w.echoStory.analyzing:stage==='deposit'?w.homeTerminal.depositTimer>0:w.echoStory.active;
 for(let i=0;i<1000&&!reached();i++)w.updateNarrative(1/60);assert.ok(reached());
 const b=load({storage:a.storage});assert.equal(b.world.loadGame(),true);home(b.world);tick(b.world);
 assert.equal(b.world.echoes.found,1);assert.equal(b.world.resources.data,1);assert.equal(b.world.dataSignals.pendingAnalysis.size,0);assert.equal(b.world.dataSignals.decoded.size,1);assert.ok(b.world.echoes.interpreted.has(1));
});
