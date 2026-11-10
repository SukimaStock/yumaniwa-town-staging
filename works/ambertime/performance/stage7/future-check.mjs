// Independent process against either baseline checkout or candidate checkout.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [root,fixture,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node future-check.mjs REPOSITORY RAW_OR_V8 OUTPUT_JSON');
const url=p=>pathToFileURL(path.resolve(root,p)).href;
const D=await import(url('works/ambertime/partner-orders.mjs')+'?world=world-network-v01');
const S=await import(url('works/ambertime/development-save.mjs'));
const {PARALLEL_PARAMETERS:P}=await import(url('works/ambertime/economy-parameters.mjs'));
const {runNativeWorldPolicy}=await import(url('works/ambertime-strategy-lab/world-network.mjs'));
const {sessionFor}=await import(url('works/ambertime/tests/regional-delivery-helpers.mjs'));
const text=fs.readFileSync(fixture,'utf8'),parsed=JSON.parse(text),formal=parsed.version===8&&parsed.game;
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const restored=formal?S.readSession(text,options):null,initial=formal?restored.game:D.restoreDistillery(text);
const hash=x=>createHash('sha256').update(x).digest('hex');
if(formal&&S.serializeSession(initial,restored,options)!==text)throw Error('Initial formal bytes changed');
const run=runNativeWorldPolicy(initial,{policy:'distant',production:'balanced',intervalMonths:12,localFocus:'town-liquor',continuousFocus:'bar',temporaryRefusal:'wait',months:12,retainState:true});
if(!run.completed)throw Error('Future career stopped: '+JSON.stringify(run.stop));
const next=run.state,raw=D.serializeDistillery(next),report={fixtureSha256:hash(text),startMonth:initial.core.month,initialPackets:initial.labConnection.town.packets.length,initialPending:initial.labConnection.town.pending.length,initialFormalExact:!!formal,futureMonth:next.core.month,completedMonths:run.completedMonths,futureRawSha256:hash(raw),futureTownSha256:hash(JSON.stringify(next.labConnection)),futureGenerationSha256:hash(JSON.stringify(next.generations)),futureOperations:next.operations.length};
// Short pending-event fixture additionally reconstructs all auxiliary records.
// --records advances retained long-game auxiliary records across the actual
// operation tail using a full projection replay; this is correctness work,
// never ordinary boot/save timing. Without it, long auxiliary future is untested.
if(formal&&process.argv.includes('--records')){
 const {advanceHistoryRecord}=await import(url('works/ambertime/history-record.mjs'));
 const {advanceRecall}=await import(url('works/ambertime/recall/collector.mjs'));
 const {advanceRecentLedger}=await import(url('works/ambertime/recent-ledger.mjs'));
 const {reconcileCaskSlots}=await import(url('works/ambertime/cask-slots.mjs'));
 let metadata=structuredClone(restored);delete metadata.game;
 const state=(facts,count)=>Object.fromEntries(Object.keys(next).filter(k=>k==='origin'||k==='operations'||Object.hasOwn(facts,k)).map(k=>[k,k==='operations'?next.operations.slice(0,count):k==='origin'?next.origin:facts[k]]));
 D.replayDistilleryOperations(next,({operation,index,before,after})=>{
  if(!operation||index<initial.operations.length)return;
  const a=state(before,index),b=state(after,index+1);
  metadata={...metadata,caskSlots:reconcileCaskSlots(b,metadata.caskSlots),recentLedger:advanceRecentLedger(a,b,metadata.recentLedger),historyRecord:advanceHistoryRecord(a,b,metadata.historyRecord),recallRecord:advanceRecall(a,b,metadata.recallRecord)};
 });
 const futureFormal=S.serializeSession(next,metadata,options);
 report.futureFormalSha256=hash(futureFormal);report.futureHistorySha256=hash(JSON.stringify(metadata.historyRecord));report.futureRecallSha256=hash(JSON.stringify(metadata.recallRecord));report.futureLedgerSha256=hash(JSON.stringify(metadata.recentLedger));
}else if(initial.core.month<=120){const metadata=sessionFor(next),futureFormal=S.serializeSession(next,metadata,options);report.futureFormalSha256=hash(futureFormal);report.futureHistorySha256=hash(JSON.stringify(metadata.historyRecord));report.futureRecallSha256=hash(JSON.stringify(metadata.recallRecord));}
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
