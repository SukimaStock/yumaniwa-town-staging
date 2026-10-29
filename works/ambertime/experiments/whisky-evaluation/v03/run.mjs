import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as M from './model.mjs';
import * as B from '../v02/model.mjs';
import {rebuild} from './memory.mjs';
import {SCENARIOS,traceScenario,traceSteps} from './scenarios.mjs';
const dir=new URL('.',import.meta.url),seeds=Array.from({length:100},(_,i)=>i+1),policies=['support','impression','repeat'];
const columns=['seed','policy','scenario','shop','release','month','sample','years','sold','revenue','support','recognition','positiveEvidence','negativeEvidence','expectations','expectationWeight','intrinsic','memoryBonus','contextValue','priorProductId','reactionKind'];
const rows=[],gapRows=[],examples=[],checks={salesEqualAcrossPolicies:0,baseReplayExact:0,archiveSurvivesGap:0,nonincreasingGapSupport:0};
const round=n=>Number.isFinite(n)?Math.round(n*1e8)/1e8:null;
function observation(o,meta){const v=o.view,a=v.assessment;return {...meta,release:o.productId,month:o.month,sample:o.spec.sample,years:o.spec.years,sold:o.summary.sold,revenue:o.summary.revenue,support:v.support,recognition:v.recognition,positiveEvidence:v.positiveEvidence,negativeEvidence:v.negativeEvidence,expectations:v.expectations.length,expectationWeight:v.expectations.reduce((n,e)=>n+e.weight,0),intrinsic:a?.intrinsic??null,memoryBonus:a?.bonus??null,contextValue:a?.value??null,priorProductId:a?.priorProductId??null,reactionKind:v.reaction?.kind??null};}
const alternate=[{id:'sweet-repeat',steps:Array.from({length:5},()=>({sample:'sweet',years:8,tier:'standard'}))},{id:'deep-repeat',steps:Array.from({length:5},()=>({sample:'deep',years:20,tier:'standard'}))},{id:'young-to-deep',steps:[1,1,8,15,20].map((years,i)=>({sample:i<2?'balanced':'deep',years,tier:'standard'}))}];
for(const seed of seeds){
 for(const shop of M.SHOPS){
  for(const scenario of SCENARIOS){let reference=null;const original=traceScenario({seed,shopId:shop.id,scenario:scenario.id,policy:'support'});
   for(const policy of policies){const project=s=>({...s,policy,relations:rebuild(s.sales,s.receipts,policy)});const trace=policy==='support'?original:{...original,policy,state:project(original.state),observations:original.observations.map(o=>({...o,view:M.shopView(project(o.checkpoint),shop.id,o.productId)}))},sales=B.serialize(trace.state.sales);if(reference!==null){assert.equal(sales,reference);checks.salesEqualAcrossPolicies++;}reference=sales;
    // Pure projection is checked against a full action replay on a fixed subset.
    if(seed===1&&policy!=='support'){const full=traceScenario({seed,shopId:shop.id,scenario:scenario.id,policy});assert.deepEqual(trace.state,full.state);}
    if(seed===1){assert.equal(B.serialize(B.restore(sales)),sales);checks.baseReplayExact++;}
    for(const o of trace.observations)rows.push(observation(o,{seed,policy,scenario:scenario.id,shop:shop.id}));
    if(seed===42&&policy==='support')examples.push({seed,shop:shop.id,scenario:scenario.id,observations:trace.observations.map(o=>({productId:o.productId,month:o.month,view:o.view}))});
    if(policy==='support'&&scenario.id==='D'){
     const start=trace.state,initial=M.shopView(start,shop.id),archive=JSON.stringify(initial.archive);
     for(const gap of [0,3,12,60,120]){const sales={...start.sales,month:start.sales.month+gap},state={...start,sales,relations:rebuild(sales,start.receipts,start.policy)},v=M.shopView(state,shop.id);if(seed===1){let full=start,left=gap;while(left){const months=Math.min(12,left);full=M.transact(full,{type:'advance',months});left-=months;}assert.deepEqual(v,M.shopView(full,shop.id));}assert.equal(JSON.stringify(v.archive),archive);checks.archiveSurvivesGap++;assert.ok(v.support<=initial.support+1e-12);checks.nonincreasingGapSupport++;gapRows.push({seed,shop:shop.id,gap,support:v.support,recognition:v.recognition,expectationWeight:v.expectations.reduce((n,e)=>n+e.weight,0),archiveRecords:v.archive.length,lastTransaction:v.lastTransaction,lastSale:v.lastSale});}
    }
    if(seed===42&&shop.id==='specialist'&&scenario.id==='D'&&policy==='support')fs.writeFileSync(new URL('example-log.json',dir),M.serialize(trace.state)+'\n');
   }
  }
  for(const extra of alternate){const trace=traceSteps({seed,shopId:shop.id,policy:'support',steps:extra.steps,scenario:extra.id});for(const o of trace.observations)rows.push(observation(o,{seed,policy:'support',scenario:extra.id,shop:shop.id}));}
 }
 console.log('seed',seed,'complete');
}
function dist(values){const a=values.filter(x=>typeof x==='number'&&Number.isFinite(x)).sort((a,b)=>a-b);return a.length?{n:a.length,mean:a.reduce((a,b)=>a+b,0)/a.length,min:a[0],p10:a[Math.floor((a.length-1)*.1)],p50:a[Math.floor((a.length-1)*.5)],p90:a[Math.floor((a.length-1)*.9)],max:a.at(-1)}:{n:0};}
const metrics=['sold','revenue','support','recognition','positiveEvidence','negativeEvidence','expectations','expectationWeight','intrinsic','memoryBonus','contextValue'];
const groups=new Map();for(const row of rows){const key=[row.policy,row.scenario,row.shop,row.release].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
const summaries=[...groups].map(([key,rs])=>({key,policy:rs[0].policy,scenario:rs[0].scenario,shop:rs[0].shop,release:rs[0].release,...Object.fromEntries(metrics.map(m=>[m,dist(rs.map(r=>r[m]))])),noSale:rs.filter(x=>x.sold===0).length,memoryBonusPositive:rs.filter(x=>x.memoryBonus>0).length}));
const q=x=>'"'+String(x??'').replaceAll('"','""')+'"',csv=(cs,rs)=>'\uFEFF'+[cs,...rs.map(r=>cs.map(k=>typeof r[k]==='number'?round(r[k]):r[k]))].map(r=>r.map(q).join(',')).join('\n')+'\n';
const result={version:M.VERSION,baseSha:'6f7b63ff24c6bb339da3c4888de5070ef902e35f',seeds,policies,scenarios:SCENARIOS,alternate,conditionCount:4500,observationRows:rows.length,checks,summaries,gaps:gapRows,examples};
fs.writeFileSync(new URL('results.json',dir),JSON.stringify(result)+'\n');fs.writeFileSync(new URL('comparison.csv.gz',dir),gzipSync(csv(columns,rows),{level:9}));fs.writeFileSync(new URL('gaps.csv',dir),csv(Object.keys(gapRows[0]),gapRows));
console.log(JSON.stringify({conditionCount:result.conditionCount,observationRows:rows.length,checks},null,2));
