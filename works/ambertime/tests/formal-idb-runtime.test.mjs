import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs';
import {readSession} from '../development-save.mjs';
import {simulateScenario} from '../design/market-dialogue-s3/long-run.mjs';
import {createRuntimeHarness,deferred,options,runtimeSource,freshSession,sessionForNewGame,encodeSession} from './formal-idb-runtime-harness.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const fault=code=>Object.assign(Error(code),{code});

test('actual action keeps game, clock and all sidecars detached until durable readback',async()=>{
 const wait=deferred();let candidate;
 const h=createRuntimeHarness({writer:(text,token,session)=>{candidate={text,token,session};return wait.promise;}}),before=clone(h.snapshot());
 const result=h.context.act(h.model.startRangeDistillation,()=>h.log.push('after'),()=>h.log.push('success'),{paused:true,time:200});
 assert.deepEqual(clone(h.snapshot()),before);assert.equal(h.node('save-status').textContent,'保存中');
 assert.equal(candidate.session.game.still.phase,'distilling');assert.equal(candidate.session.elapsed,200);
 assert.notDeepEqual(candidate.session.recallRecord,before.recallRecord);
 assert.ok(!h.log.includes('success'));assert.ok(!h.log.includes('news'));
 let second=0;assert.equal(await h.context.act(s=>{second++;return s;}),false);assert.equal(second,0);
 wait.resolve({ok:true,revision:2,text:candidate.text,session:candidate.session});
 assert.equal(await result,true);assert.equal(h.context.game.still.phase,'distilling');assert.equal(h.context.elapsed,200);
 assert.deepEqual(clone(h.snapshot().recallRecord),candidate.session.recallRecord);
 assert.deepEqual(clone(h.snapshot().game),readSession(h.stored,options).game);
 assert.ok(h.log.indexOf('success')>h.log.findIndex(x=>Array.isArray(x)&&x[0]==='write'));
});

test('abort, quota, stale revision and uncertain readback do not publish or retry',async()=>{
 for(const code of ['AbortError','QuotaExceededError','conflict','readback']){
  let writes=0;const h=createRuntimeHarness({writer:async()=>{writes++;throw fault(code);}}),before=clone(h.snapshot());
  assert.equal(await h.context.act(h.model.startRangeDistillation,()=>h.log.push('success')),false);
  assert.deepEqual(clone(h.snapshot()),before);assert.equal(h.context.canSave,false);assert.equal(h.context.runtimeHalted,true);
  assert.ok(!h.log.includes('success'));assert.equal(h.timers.size,0);
  assert.equal(await h.context.act(h.model.startRangeDistillation),false);assert.equal(writes,1);
 }
});

test('hide invalidates a pending action and late durable success cannot resume UI',async()=>{
 const wait=deferred(),h=createRuntimeHarness({writer:()=>wait.promise}),before=clone(h.snapshot());
 const result=h.context.act(h.model.startRangeDistillation,()=>h.log.push('success'));
 h.context.document.hidden=true;h.context.suspend();wait.resolve({ok:true,revision:2});
 assert.equal(await result,false);assert.deepEqual(clone(h.snapshot()),before);
 h.context.document.hidden=false;h.context.resume();assert.equal(h.timers.size,0);assert.ok(!h.log.includes('success'));
 assert.equal(h.run('commitBoundary.status.state'),'halted');
});

test('each logical tick waits before publishing extraction and elapsed, with fresh wall-clock interval',async()=>{
 const h=createRuntimeHarness();assert.equal(await h.context.act(h.model.startRangeDistillation),true);
 h.timers.clear();h.log.length=0;const wait=deferred();let candidate;
 h.adapter.saveCandidate=(text,token)=>{candidate={text,token};return wait.promise;};
 h.context.schedule();const before=clone(h.snapshot()),tick=h.tick();
 assert.deepEqual(clone(h.snapshot()),before);assert.equal(h.timers.size,0);
 const saved=readSession(candidate.text,options);assert.equal(saved.elapsed,before.elapsed+100);assert.equal(saved.game.still.distillation.progress,before.game.still.distillation.progress+1);
 wait.resolve({ok:true,revision:candidate.token.expectedRevision+1});await tick;
 assert.equal(h.context.elapsed,saved.elapsed);assert.equal(h.context.game.still.distillation.progress,saved.game.still.distillation.progress);
 assert.equal(h.timers.size,1);assert.ok([...h.timers.values()][0].ms>=99);
});

test('actual elapsed-only tick is durable and failure retains previous clock metadata',async()=>{
 for(const failed of [false,true]){
  const h=createRuntimeHarness({writer:async(text,token)=>{if(failed)throw fault('AbortError');return {ok:true,revision:token.expectedRevision+1};}}),before=clone(h.snapshot());
  h.context.schedule();await h.tick();
  assert.equal(h.context.elapsed,failed?before.elapsed:100);
  assert.deepEqual(clone(h.context.game),before.game);
  if(failed)assert.deepEqual(clone(h.snapshot()),before);
 }
});

test('mounted notice acknowledgement is single pending action, no eager notification flag',async()=>{
 const wait=deferred(),h=createRuntimeHarness({writer:()=>wait.promise,functions:['acknowledgeStaffOpportunity']});
 // Synthetic operation uses the actual wrapper/observer and formal sidecars.
 h.run('D.noticeStaffOpportunity');
 // No real staff offer exists in a new fixture: assert the busy guard runs before
 // model validation or mutation, even if the same mounted dialog renders twice.
 const first=h.context.act(h.model.startRangeDistillation);h.context.modal={kind:'staff-opportunity',job:'distill',noticePending:true};h.node('action-dialog').open=true;
 await h.context.acknowledgeStaffOpportunity();assert.equal(h.context.modal.noticePending,true);
 wait.resolve({ok:true,revision:2});assert.equal(await first,true);
});

test('runtime has one IDB formal writer and cold reload, with import source bytes retained',()=>{
 assert.match(runtimeSource,/bootMainIdb\(/);assert.doesNotMatch(runtimeSource,/writeCandidate\(/);
 assert.match(runtimeSource,/retry-save'\)\.addEventListener\('click',\(\)=>location\.reload\(\)/);
 assert.match(runtimeSource,/const raw=await file\.text\(\);if\(epoch!==runtimeEpoch\|\|sessionToken!==sessionEpoch[\s\S]*?return false;session=readSession\(raw/);
 assert.match(runtimeSource,/replaceSession\(text,session,'import'\)/);
 assert.match(runtimeSource,/pageshow',e=>\{if\(e\.persisted\)\{suspend\(\);resume\(\);\}\}/);
 assert.match(runtimeSource,/LEGACY_SAVE_KEYS\.includes\(e\.key\)/);
 for(const path of ['market-ui.mjs','placement-ui.mjs','recall/player.mjs']){
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(source,/await (?:act|commit|onComplete)/);
 }
});


test('invalid import preserves the running session and resumes a fresh clock',async()=>{
 const h=createRuntimeHarness({functions:['importRecord']}),before=clone(h.snapshot());h.context.schedule();assert.equal(h.timers.size,1);
 const wait=deferred(),importing=h.context.importRecord({text:()=>wait.promise});assert.equal(h.timers.size,0);
 assert.deepEqual(clone(h.snapshot()),before);wait.resolve('invalid json');assert.equal(await importing,false);
 assert.deepEqual(clone(h.snapshot()),before);assert.equal(h.context.canSave,true);assert.equal(h.timers.size,1);
 assert.equal(h.context.lastSaveError.phase,'ファイル検証');
});

test('file-read interruption cannot install a candidate or clear recovery after resuming',async()=>{
 const h=createRuntimeHarness({functions:['importRecord']}),before=clone(h.snapshot()),wait=deferred();
 const importing=h.context.importRecord({text:()=>wait.promise});h.context.document.hidden=true;h.context.suspend();
 wait.resolve(before.lastSavedText);assert.equal(await importing,false);assert.deepEqual(clone(h.snapshot()),before);
 assert.equal(h.context.canSave,false);assert.equal(h.timers.size,0);
});


test('native dialog cancellation cannot replace the modal during a pending action',async()=>{
 const wait=deferred(),h=createRuntimeHarness({writer:()=>wait.promise,functions:['closeModal']});
 const target={kind:'bottler-panel',policyNoticeId:1};h.context.modal=target;
 const saving=h.context.act(h.model.startRangeDistillation,()=>{h.context.modal.policyNoticeId=null;});
 h.context.closeModal();assert.equal(h.context.modal,target);assert.equal(target.policyNoticeId,1);
 wait.resolve({ok:true,revision:2});assert.equal(await saving,true);assert.equal(h.context.modal,target);assert.equal(target.policyNoticeId,null);
});


test('delayed explicit replacement preserves old state until receipt and never installs after interruption',async()=>{
 for(const interrupted of [false,true]){
  const wait=deferred(),h=createRuntimeHarness({writer:()=>wait.promise,functions:['replaceSession']}),before=clone(h.snapshot());
  const replacement=freshSession(404),text=encodeSession(replacement);let installed=0;
  h.context.installSession=async session=>{installed++;assert.equal(session,replacement);};
  const result=h.context.replaceSession(text,replacement,'import');
  assert.deepEqual(clone(h.snapshot()),before);assert.equal(installed,0);
  if(interrupted){h.context.document.hidden=true;h.context.suspend();}
  wait.resolve({ok:true,revision:2,text});assert.equal(await result,!interrupted);
  assert.equal(installed,interrupted?0:1);
  if(interrupted)assert.deepEqual(clone(h.snapshot()),before);
  else{assert.equal(h.context.game.seed,404);assert.equal(h.context.lastSavedText,text);}
 }
});

test('title-selected session installation awaits every boundary before exposing an actionable game',async()=>{
 const legacy=sessionForNewGame(D.newMarketRulesDistillery(141)),writes=[];
 const h=createRuntimeHarness({session:legacy,functions:['installSession'],writer:(text,token)=>{const wait=deferred();writes.push({text,token,wait});return wait.promise;}});
 h.node('game').hidden=true;
 const installing=h.context.installSession(legacy);await Promise.resolve();
 assert.equal(writes.length,1);assert.equal(h.run('runtimeStarting'),true);assert.equal(h.node('game').hidden,true);
 assert.equal(D.alleyBarMode(h.context.game),false);assert.equal(D.shopDialogueMode(h.context.game),false);
 assert.equal(await h.context.act(h.model.startRangeDistillation),false);
 let resolved=0,done=false;installing.then(()=>{done=true;});
 for(let spins=0;spins<100&&!done;spins++){
  if(resolved<writes.length){const w=writes[resolved++];w.wait.resolve({ok:true,revision:w.token.expectedRevision+1});}
  await Promise.resolve();
 }
 await installing;assert.equal(resolved,7);assert.equal(h.run('runtimeStarting'),false);assert.equal(h.node('game').hidden,false);
 assert.equal(D.shopDialogueMode(h.context.game),true);assert.equal(D.bottlingAssignmentMode(h.context.game),true);assert.equal(D.consignmentMode(h.context.game),true);
 assert.deepEqual(clone(h.context.game),readSession(h.stored,options).game);
});

test('real mounted shop acknowledgement publishes its native operation and flag only after readback',async()=>{
 let offered;
 simulateScenario('wide',20,{checkpoints:Array.from({length:20},(_,i)=>i+1),onCheckpoint(game,{records}){
  if(!offered&&game.shop.offer&&!game.trade.offer&&!game.decisions.length)offered=structuredClone({game,...records});
 }});
 assert.ok(offered,'Public-operation career must produce a real offer');
 for(const success of [false,true]){
  const wait=deferred(),h=createRuntimeHarness({session:offered,writer:()=>wait.promise,functions:['acknowledgeDecisionNotice']}),before=clone(h.snapshot());
  const offer=offered.game.shop.offer,target={kind:'shop-offer',shopId:offer.shopId,offerId:offer.id,noticePending:true};h.context.modal=target;
  h.node('action-dialog').open=true;h.node('action-dialog').dataset.kind=target.kind;
  const acknowledging=h.context.acknowledgeDecisionNotice();assert.deepEqual(clone(h.snapshot()),before);assert.equal(target.noticePending,true);
  await h.context.acknowledgeDecisionNotice();assert.equal(target.noticePending,true);
  if(success)wait.resolve({ok:true,revision:2});else wait.reject(fault('QuotaExceededError'));
  await acknowledging;assert.equal(target.noticePending,!success);
  if(success){assert.equal(h.context.game.shop.offer.notified,true);assert.equal(h.context.game.operations.at(-1).key,'stockist-notice');assert.deepEqual(clone(h.context.game),readSession(h.stored,options).game);}
  else assert.deepEqual(clone(h.snapshot()),before);
 }
});


test('idle hide resumes only after exact current record verification',async()=>{
 const h=createRuntimeHarness(),wait=deferred();let checked;
 h.adapter.verifyCurrent=raw=>{checked=raw;return wait.promise;};
 h.context.document.hidden=true;h.context.suspend();
 assert.equal(h.context.canSave,false);assert.equal(h.run('commitBoundary.status.state'),'ready');
 h.context.document.hidden=false;const resumed=h.context.resume();
 assert.equal(h.context.canSave,false);assert.equal(checked,h.context.lastSavedText);
 wait.resolve();await resumed;assert.equal(h.context.canSave,true);
 assert.equal(await h.context.act(h.model.startRangeDistillation),true);
});

test('idle resume rejects a changed saved generation and never applies stale action',async()=>{
 const h=createRuntimeHarness();h.adapter.verifyCurrent=async()=>{throw fault('conflict');};
 h.context.document.hidden=true;h.context.suspend();h.context.document.hidden=false;await h.context.resume();
 assert.equal(h.context.canSave,false);assert.equal(h.run('commitBoundary.status.state'),'halted');
 assert.equal(await h.context.act(h.model.startRangeDistillation),false);
});


test('late rejected idle verification cannot halt a replacement session',async()=>{
 const h=createRuntimeHarness(),wait=deferred();h.adapter.verifyCurrent=()=>wait.promise;
 h.context.document.hidden=true;h.context.suspend();h.context.document.hidden=false;const resumed=h.context.resume();
 h.context.replacement={...h.adapter,state:'ready'};h.run('connectMainStore(replacement,1);canSave=true;');
 wait.reject(fault('conflict'));await resumed;
 assert.equal(h.context.canSave,true);assert.equal(h.run('commitBoundary.status.state'),'ready');
});
