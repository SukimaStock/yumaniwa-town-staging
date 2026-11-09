# Time and notification traffic — implementation checkpoint

Status: **DRAFT / UNVERIFIED**. Do not merge until browser integration and long-duration validation are complete.
Base: `a870e0affcea2d124c44622652e50eaf6a827637` (#879). #878/#879 and effective M0 PRs #869/#871/#872/#873/#875/#877 were confirmed merged; #870/#874/#876 were not adopted as separate changes.

## Audit and implemented behavior

- Results previously cleared the active notification; new shop letters also replaced active text. One ordinary presentation lane now finishes its active item before selecting result → world → shop → daily.
- World/shop each retain one latest pending item. Results retain one latest saved transition per room (at most three), without joining unrelated months. Daily lines never wait. IDs are bounded to 256 UI-only dedup entries.
- Unsafe visibility removes the active display timer. Non-daily items interrupted before 3.5 seconds return to their slot, unless a newer item is already pending. Later interruption consumes the display; daily lines are disposable. Reload/session reset drops ephemeral slots.
- Existing Motion v0.2 remains: result 3.5s, daily 6s, shop 6.5s, world 6.5–10s by text length. Passive cards are status regions, not dismiss buttons, and do not capture pointer input. Existing feedback detail buttons remain.
- Ordinary notices are suppressed while M0 is open, including half mode because its existing drawer occupies the notification area. M0 observation still progresses time. No map news panel, badges, or new map design was introduced.
- Existing `userPaused`, `blocked()`, RuntimeClock and manual distillation/tasting safeguards are retained. Modals, errors and hidden documents suppress ordinary display. Feedback previews defer while the ordinary lane is active.
- Shop/generation notification acknowledgement now follows mounted, visible dialog state, using the existing formal notice operation and save transaction. Failure preserves the underlying offer/decision. Generation recall preparation follows successful acknowledgement, retaining its operation-index boundary. Existing M0 suspension/restoration remains.
- Dialogue commit uses the existing successful-save hook. A microtask orders results first; an ephemeral reset epoch prevents an old session callback from leaking into a new session without dropping a valid letter after another save in the same month.

## Verification

- Scope → Risk → Impact: PASS against locked r0. `node --check` and `git diff --check`: PASS.
- Focused notification/clock/ack suite: 28 tests PASS; ack matrix includes 24 combinations of notice kind, document visibility, mounted dialog and save success/failure.
- Simulated 1,200-month notification pressure: latest slots remain bounded; no active overwrite, concatenation or daily backlog. This is presentation stress, not a 100-year economic playthrough.
- Broader requested acceptance selection: 73 PASS / 4 FAIL. The four are existing source/cache assertions in formal-copy and market-rules-ui; base comparison is recorded below rather than silently changing them.
- Browser test added with HTTP-response-only instrumentation (no test hooks ship in the product). Execution attempted: Chromium startup fails with `socket() failed: Operation not permitted`; shared browser cannot reach the test server (`ERR_CONNECTION_REFUSED`). No browser, geometry, touch, focus or visual result is claimed PASS.
- Existing passive-dismiss and immediate-consumption expectations were changed only where the user's new specification explicitly replaces them. Existing unrelated tests and protected calculation/save checks were not weakened or deleted.

Full-suite comparison with complete Git history (same environment): base 1,586 tests = 1,481 PASS / 95 FAIL / 10 SKIP; candidate 1,595 = 1,489 PASS / 95 FAIL / 11 SKIP. There are 94 shared failing test names. The old recall-preparation integration test now passes with its post-mount boundary coverage; the single new failure is the deliberately unrelaxed 32-year fixture described below. The extra browser suite skips by default without explicit browser variables; the separate explicitly enabled launch was attempted and failed at environment startup. These totals do not claim the repository-wide suite is green.

## Preservation and unresolved checks

Formal save format/keys, model, economic parameters, RNG, event eligibility/text (170 adopted lines), recall collector/selection/history, Engine and other works are byte-unchanged in the diff. Important notice operation ordering changed in the UI and is tested explicitly; this is not a new saved field.

The new two-series 32-year preservation scenario has **not passed**. Its latest run halts at month 171 instead of advancing to 172; the test retains the failing assertion. Independent model-only diagnosis: the fixture lists bottles but never assigns them to retail, leaving 94 bottles in hand and zero sales. Cash £2 cannot cover £4 monthly maintenance, so the existing funds safeguard correctly returns the prior state. This is a fixture setup failure, not evidence of a notification-caused economic change. Earlier fixture attempts exposed (1) recall initialization on a non-new legacy fixture and (2) an unfunded idle scenario stopping at month 290. After three attempts, fixture changes stopped under repository rules. At checkpoint 701cc26, no completed multi-decade or generation-crossing comparison was claimed. The independent reuse result below is separate from this still-failing fixture. Existing formal-save and recall-save regressions ran in the broader test selection, but do not substitute for the missing long-run proof.

Independent audit found the original overwrite/occlusion bugs and a same-month follow-up-save dialogue loss in the first implementation; the epoch fix was independently reviewed. The reviewer implemented the small acknowledgement change, so that part was reviewed separately by the main agent and covered by the mounted-dialog/rollback tests; it is not described as an independent review of their own code.

## Remaining before merge

1. Run the new browser suite and existing market compact/rules and dialogue browser suites in a browser-capable environment. Inspect all specified phone widths, long text, map gestures, focus and ARIA behavior; test actual saved failure/recovery and manual distillation exit.
2. Keep the failed fixture and its three-attempt limit explicit. Independent existing-career reuse below is a separate proof; it does not turn that test green or authorize a fourth repair.
3. Resolve or classify full-suite differences against exact base, then confirm required CI at the final candidate SHA.
4. Author iPhone Safari: readability and motion at normal/reduced motion; map half/full gestures and return from a decision; manual pause → ledger open/close; quick room switch after a notice. Browser success is not physical-device evidence.

Staging deployment and Production are unchanged. This is a reviewable implementation checkpoint, not completion of S3 or authorization to proceed to the separate map design task.


## S3 continuation — 2026-11-09

Start: main `a870e0affcea2d124c44622652e50eaf6a827637`, PR HEAD `701cc26f5afa8f611330806b12cf143c23718947`; existing r0 scope retained. No new PR, lock, formal field or economic change.

### Independent review and small correction

A controller-only reproduction exposed a priority boundary: queue world while unsafe, become safe without an intervening update, then push an operation result. The initial `push()` update selected world before registering the result. No current shipping UI path was demonstrated, but the controller API violated next-item priority. Removed that first update; the existing post-registration update still handles interruption, visibility, and selection. Active notices remain untouched. Added one regression. Independent reviewer verified the fix, interruption timers, latest news, ambient discard, and active preservation; 16/16 notification/dialogue tests passed, no unresolved major finding.

Expanded rerun: 37 tests, 35 PASS and 2 FAIL in `r0-notice-priority.test.mjs`. Both failed names already occur in exact-base and 701cc26 logs; they are not introduced by this correction. Existing M0 geometry/state tests: 8/8 PASS. Scope → Risk → Impact, syntax and diff whitespace checks PASS. Prior full-suite totals above were not relabeled as a fresh complete run.

### Browser status: UNVERIFIED

Explicitly enabled notice-traffic browser suite and existing market-compact, market-rules, shop-dialogue browser suites were attempted. All four fail before application assertions because Chromium cannot create its socket (`Operation not permitted`). The separate shared desktop/CDP browser exists, but cannot access the exact-HEAD local server (`ERR_CONNECTION_REFUSED`); native desktop input also reported unavailable AT-SPI. No sandbox protections were changed. Published main was not substituted for the candidate.

Consequently all requested actual-screen phone sizes, wrapping/visible duration, touch/pinch/pan/pins, keyboard/focus, ARIA announcements, reduced-motion rendering, real visibility transitions, manual distillation exit and saved error recovery remain UNVERIFIED. Node M0 and clock assertions are not browser results. Existing browser scripts are not presumed to cover every manual checklist item merely because they exist.

### CI startup cause

The actual GitHub run annotations for [Change PR Gate 42651155101](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/42651155101) and [Change Verification Evidence 42651157553](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/42651157553) identify a scheduled brownout of default `pull_request_target` protection for affected public repositories, ending **2026-11-09 18:00 UTC (19:00 North Macedonia)**. Both runs have no jobs and failed before tests started. [Release Validator 42651155275](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/42651155275) succeeded at 701cc26.

No workflow, mandatory check, permission or event policy was weakened, and no blind reruns were made during the brownout. Final-HEAD CI must still be checked; prior success does not transfer to a new commit. Browser and fixture limitations independently prevent merge even after the brownout ends.

### Independent existing-career reproduction

The failed `notice-traffic-preservation.test.mjs` is untouched (three attempts remain exhausted). This diagnostic imports the pre-existing successful `design/market-dialogue-s3/long-run.mjs` without changing its economic loop. It uses its public operations and completed-month callback. No internal cash/state edits, relaxed funds guards or replacement test expectations. Reuse is an independent check allowed by the repository rule and the continuation request, not a fourth automatic fixture repair.

Run the following from repository root as `node --input-type=module` standard input. Only the diagnostic JSON writes to `/tmp`; no game notification history is saved. Monthly snapshots include every official session record; final equality and restoration are exact. This samples monthly completed states, not every intermediate UI operation, and covers one policy/seed only.

```js
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {simulateScenario} from './works/ambertime/design/market-dialogue-s3/long-run.mjs';
import * as D from './works/ambertime/partner-orders.mjs';
import {scopedNotices,automaticEvents} from './works/ambertime/event-notices.mjs';
import {createDialogueProjection} from './works/ambertime/shop-dialogue.mjs';
import {serializeSession,readSession} from './works/ambertime/development-save.mjs';
import {PARALLEL_PARAMETERS as P} from './works/ambertime/parallel-parameters.mjs';
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const checkpoints=Array.from({length:384},(_,i)=>i+1), options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const rows=[];let baseline,baselineRecords;
for(const enabled of [false,true]){
 let room='sales',safe=true,time=0,serial=0,last=D.newShopDialogueDistillery(42),records,maxPending=0;
 const timers=new Map(),projection=createDialogueProjection();
 const lane=scopedNotices({room:()=>room,safe:()=>safe,now:()=>time,show:()=>{},hide:()=>{},setTimer:(fn,ms)=>{timers.set(++serial,{fn,at:time+ms});return serial;},clearTimer:id=>timers.delete(id)});
 const hashes=[];
 const result=simulateScenario('wide',384,{checkpoints,onCheckpoint(game,info){
  records=info.records;
  const before=hash({game,records});
  if(enabled){
   room=['sales','warehouse','distill'][game.core.month%3];safe=game.core.month%5!==0;lane.update();
   lane.push(automaticEvents(last,game));
   const entry=projection.read(game);if(entry?.month>last.core.month)lane.push([{id:'shop:'+entry.id,kind:'shop',entry}]);
   lane.push([{id:'town:independent:'+game.core.month,kind:'message',text:'研究用の町の知らせ'},{id:'ambient:independent:'+game.core.month,kind:'ambient',text:'研究用の日常'}]);
   time+=game.core.month%2?1000:500;
   for(const [id,t]of [...timers])if(t.at<=time){timers.delete(id);t.fn();}
   const inspected=lane.inspect();maxPending=Math.max(maxPending,inspected.pending.length);assert(inspected.pending.length<=5);assert(inspected.seen<=256);assert(timers.size<=1);
  }
  assert.equal(hash({game,records}),before,'Passive UI must not mutate native state or records');hashes.push(before);
  if(enabled)assert.equal(before,rows[0].monthlyHashes[game.core.month-1],'Monthly native state and all session records');
  last=game;
 }});
 assert.equal(result.game.core.month,384);assert(result.game.generations.completed.length>=1);
 const encoded=serializeSession(result.game,records,options);
 const restored=readSession(encoded,options);assert.deepEqual(restored,{game:result.game,...records});
 if(!enabled){baseline=result.game;baselineRecords=records;}else{assert.deepEqual(result.game,baseline);assert.deepEqual(records,baselineRecords);assert.equal(encoded,rows[0].encoded);}
 rows.push({enabled,monthlyHashes:hashes,encoded,gameHash:hash(result.game),sessionHash:hash(encoded),recordHash:hash(records),formalChars:encoded.length,handovers:result.game.generations.completed.map(x=>x.endedMonth),operations:result.game.operations.length,sold:result.game.core.products.reduce((n,p)=>n+p.sold,0),fills:result.fills,forcedBottlings:result.forcedBottlings,maxPending,lane:lane.inspect()});
 console.error(JSON.stringify({completed:enabled?'notices':'control',month:384,handovers:rows.at(-1).handovers}));
}
const report={sourceHead:'701cc26f5afa8f611330806b12cf143c23718947',controllerSha256:'f514c0ed55b3ecbf88c64701331f84cc34c8b314c73bad7ba45d827f510b1eaa',method:'Unmodified existing design/market-dialogue-s3/long-run.mjs wide policy seed42, two runs,384 monthly read-only checkpoints; existing failed fixture untouched',limitations:['Monthly callback samples completed monthly states; it does not exercise each intermediate UI operation boundary.','Notification stress includes research-only world and ambient notices; these are never persisted.','One seed and economic policy; browser and actual iPhone separate.'],checks:{monthly384Exact:true,formalRoundTripBoth:true,finalGameIncludingRngEconomyOperationsExact:true,formalSessionBytesExact:true,historyRecallCaskLedgerExact:true,generationHandover:true,passiveUiNoMutation:true},series:rows.map(({monthlyHashes,encoded,...row})=>row)};
writeFileSync('/tmp/s3-existing-career-comparison-result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
```

### Independent 32-year result: PASS within stated scope

Both runs completed **384 months**, **611 recorded operations**, **21 fills**, **321 sold bottles**, and one handover at **month 312**, with **0 forced bottlings**. All 384 completed-month game+record hashes matched. Final deep equality includes economy, RNG, operation log, history, recall, cask records and ledger. Formal sessions were byte-equal (**3,160,924 characters**), and `readSession` restored each exactly. No formal save/model/history/recall source changed.

- Game SHA256: `4073b1abb74f8bf127474f9c9e6dc25c9c0d24d55a54b613ef949fb0754b9001`
- Session SHA256: `d0055db7de71dd99e0f1744365315a6ebdf3d47e16b08b50bf86a2f29710db42`
- Records SHA256: `77949f8c7b82ec8e9a9dd86eea6fb1556803485b9936219c7a61486ca5824953`
- Tested controller SHA256: `f514c0ed55b3ecbf88c64701331f84cc34c8b314c73bad7ba45d827f510b1eaa` (701cc26 plus the priority correction; not pristine 701cc26).
- Unmodified existing career asset SHA256: `aac261a52fc824ac404c2df0787c99f1f11a2644fbfdcdbb900bb8e627e76aff`
- Unmodified failed fixture SHA256: `20d4d80e5310d032aeebeffac7a99d88e87472e1920169f463c640acdab6bfa8`

Notification-enabled diagnostic: 836 received, 305 display starts (including redisplays), 831 discard transitions (including replacements/interruption), maximum pending 5, final dedup IDs 256, at most one timer. These counters are not disjoint event totals and must not be added or interpreted as unique delivered/read notices. The 1,200-month stress also continues to pass in the focused suite.

Fresh preservation regressions (`formal-save`, `recall-save`, `recall-live`): **20/20 PASS**, including quota-failure old-session preservation/retry. Required sales UI source regressions: **37 PASS / 4 existing FAIL**, same four names as the prior baseline comparison. These do not establish actual-browser behavior.

Conclusion remains **DRAFT / UNVERIFIED overall**. The independent long-run proof is complete for one seed/policy and monthly boundaries. The original fixture remains a known failing test at its repair limit; actual browser acceptance and final required CI remain incomplete. No merge or Staging deployment was performed, and Production was untouched.
