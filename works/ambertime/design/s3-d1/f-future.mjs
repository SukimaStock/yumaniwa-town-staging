import fs from 'node:fs';import assert from 'node:assert/strict';
import * as Native from '../../partner-orders.mjs';
import * as NativeB from '../../partner-orders.mjs?d1f-independent-b';
import {createObservedModel}from '../../recall/operations.mjs';
import {advanceRecall}from '../../recall/collector.mjs';
import {advanceHistoryRecord}from '../../history-record.mjs';
import {advanceRecentLedger}from '../../recent-ledger.mjs';
import {reconcileCaskSlots}from '../../cask-slots.mjs';
import {shopDialogueHistory}from '../../shop-dialogue.mjs';
import {encode,decode,anchor,hash}from './codec.mjs';
import {continueScenario}from './f-continue.mjs';
const [file,out,spanArg='12',expectedSha='b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55',snapshotOut='/tmp/s3-d1-f-final.research.json']=process.argv.slice(2),span=Number(spanArg),source=JSON.parse(fs.readFileSync(file));
assert(Number.isInteger(span)&&span>0&&span<=80);assert.equal(hash(source.game),expectedSha);
const restored=decode(encode(source),anchor(source));assert.equal(JSON.stringify(source),JSON.stringify(restored));
let {game:b,...recordsB}=restored;const steps=[],months=[];const map=new WeakMap([[source.game,b]]);
const isGame=x=>x?.core&&Array.isArray(x.operations);
let operation=null;
const observedB=createObservedModel(NativeB,({before,after})=>{recordsB={...recordsB,caskSlots:reconcileCaskSlots(after,recordsB.caskSlots),recentLedger:advanceRecentLedger(before,after,recordsB.recentLedger),historyRecord:advanceHistoryRecord(before,after,recordsB.historyRecord),recallRecord:advanceRecall(before,after,recordsB.recallRecord)}});
const paired=Object.fromEntries(Object.entries(Native).map(([name,fn])=>[name,typeof fn!=='function'?fn:(...args)=>{
 if(!isGame(args[0]))return fn(...args);
 const before=args[0];assert(map.has(before),'unpaired state '+name);const other=map.get(before),otherArgs=[other,...structuredClone(args.slice(1))];
 operation={name,month:before.core.month,index:before.operations.length};console.error(JSON.stringify({begin:operation}));
 console.error(JSON.stringify({side:'A',begin:operation}));const a=fn(...args);console.error(JSON.stringify({side:'B',begin:operation}));const z=observedB[name](...otherArgs);
 assert.equal(JSON.stringify(a),JSON.stringify(z),'first public-call difference '+JSON.stringify(operation));
 if(isGame(a)){map.set(a,z);b=z;steps.push({...operation,afterMonth:a.core.month,stateSha:hash(a),operations:a.operations.length});}
 console.error(JSON.stringify({end:operation}));return a;
}]));
try{
 const result=continueScenario(source,'wide',span,{native:paired,checkpoints:Array.from({length:span},(_,i)=>source.game.core.month+1+i),onTransition(g,r){assert.equal(JSON.stringify(r),JSON.stringify(recordsB),'collector difference '+JSON.stringify(operation));assert.equal(JSON.stringify(shopDialogueHistory(g)),JSON.stringify(shopDialogueHistory(b)),'dialogue difference')},onCheckpoint(g,{records}){assert.equal(JSON.stringify(g),JSON.stringify(b));assert.equal(JSON.stringify(records),JSON.stringify(recordsB));months.push({month:g.core.month,game:hash(g),records:hash(records),dialogue:hash(shopDialogueHistory(g))});fs.writeFileSync(out,JSON.stringify({status:'running',steps,months},null,2))}});
 assert.equal(months.length,span);assert.equal(result.game.core.month,source.game.core.month+span);const t0=source.game.labConnection.town,t=result.game.labConnection.town;
 const evidence={status:'complete',inputGameSha:hash(source.game),fullRoundtrip:true,steps,months,newGenerations:result.game.generations.completed.length-source.game.generations.completed.length,newEvents:t.events.length-t0.events.length,newAttempts:t.attempts.length-t0.attempts.length,newArrivals:t.arrivals.length-t0.arrivals.length,newReleases:result.game.releases.length-source.game.releases.length,newDeliveries:result.game.shop.deliveries.length-source.game.shop.deliveries.length,finalGameSha:hash(result.game),finalInputSha:hash(result),peakRssKiB:process.resourceUsage().maxRSS};fs.writeFileSync(out,JSON.stringify(evidence,null,2));fs.writeFileSync(snapshotOut,JSON.stringify(result));console.log(JSON.stringify({status:evidence.status,months:months.length,steps:steps.length,newReleases:evidence.newReleases}));
}catch(error){fs.writeFileSync(out,JSON.stringify({status:'stopped',operation,error:error.stack,steps,months},null,2));throw error}
