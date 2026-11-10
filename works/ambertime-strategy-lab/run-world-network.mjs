import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {worldOpening,runWorldStrategyComparison,runNativeWorldPolicy,runPriceCounterfactual,nativePriceContext,WORLD_LAB_LIMITS} from './world-network.mjs';
import {tradingPartner} from '../ambertime/trading-partners.mjs?world=world-network-v01';
import * as D from '../ambertime/partner-orders.mjs?world=world-network-v01';
import {sessionFor} from '../ambertime/tests/regional-delivery-helpers.mjs';
import {serializeSession,readSession} from '../ambertime/development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../ambertime/economy-parameters.mjs';
export function freshCold(raw){
 const model=new URL('../ambertime/partner-orders.mjs?world=world-network-v01',import.meta.url).href;
 const script=`import fs from 'node:fs';import {performance} from 'node:perf_hooks';import {createHash} from 'node:crypto';import * as D from ${JSON.stringify(model)};const raw=fs.readFileSync(0,'utf8'),start=performance.now(),s=D.restoreDistillery(raw),restoreMilliseconds=performance.now()-start,back=D.serializeDistillery(s);process.stdout.write(JSON.stringify({freshProcess:true,exact:back===raw,sha256:createHash('sha256').update(back).digest('hex'),restoreMilliseconds,roundtripMilliseconds:performance.now()-start,rawCodeUnits:raw.length,rawBytes:Buffer.byteLength(raw),rssAfterBytes:process.memoryUsage().rss,scope:'Fresh child imports model then restores before constructing or serializing any game. RSS is after measurement, not peak.'}));`;
 return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:16e6,timeout:240000}));
}

export async function runWorldNetworkEvidence(){
const seeds=(process.env.AMBER_WORLD_SEEDS??'27,39,107').split(',').map(Number),months=Number(process.env.AMBER_WORLD_MONTHS??120),longMonths=Number(process.env.AMBER_WORLD_LONG_MONTHS??1200),start=performance.now();
const load=path=>JSON.parse(fs.readFileSync(path,'utf8')),fingerprint=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const comparisons=[],refusalProbes={scope:'Fixed-schedule probes stopped on temporary public refusal, NOT game over or a hard record cap.',comparisons:[],localFocusSensitivity:[],additionalLongRun:null};
const packComparison=c=>{const opening=c.opening??c.rows[0]?.start;return {...c,opening,rows:c.rows.map(({start,checkpoints,...row})=>({...row,checkpointCount:checkpoints?.length??row.checkpointCount??0}))};};
if(process.env.AMBER_WORLD_CANONICAL){
 comparisons.push(...load(process.env.AMBER_WORLD_CANONICAL));
 const old=load(process.env.AMBER_WORLD_PROBE_MATRIX),supplement=load(process.env.AMBER_WORLD_SUPPLEMENT),grain=load(process.env.AMBER_WORLD_GRAIN_PROBE);
 if(old.refusalProbes)Object.assign(refusalProbes,old.refusalProbes);
 else{
 const label=(c,defaults)=>({...c,...defaults,temporaryRefusal:'stop',productionBudget:'fixed-attempt-no-preflight',rows:c.rows.map(r=>({...r,...defaults,temporaryRefusal:'stop',productionBudget:'fixed-attempt-no-preflight'}))});
 refusalProbes.comparisons.push(...old.comparisons.map(c=>label(c,{localFocus:'bar',continuousFocus:'bar',intervalMonths:12})),...supplement.patient.map(c=>label(c,{localFocus:'town-liquor',continuousFocus:'bar',intervalMonths:48})),label(grain,{localFocus:'town-liquor',continuousFocus:'town-liquor',intervalMonths:48}));
 refusalProbes.localFocusSensitivity.push(...supplement.canonical.map(r=>({...r,continuousFocus:'bar',temporaryRefusal:'stop',intervalMonths:12,productionBudget:'fixed-attempt-no-preflight'})));
 refusalProbes.additionalLongRun={...old.longRun,localFocus:'bar',continuousFocus:'bar',intervalMonths:12,temporaryRefusal:'stop',productionBudget:'fixed-attempt-no-preflight',classification:'temporary-refusal fixed-schedule probe, not a hard cap or game over'};
 }
}else{
 for(const seed of seeds){const opening=worldOpening(seed),initialSha256=fingerprint(opening);
  for(const intervalMonths of [12,48]){const comparison=runWorldStrategyComparison({seed,months,production:'balanced',intervalMonths,localFocus:'town-liquor',continuousFocus:'bar',temporaryRefusal:'wait',initial:opening});comparisons.push({...comparison,initialSha256});console.log('canonical',seed,intervalMonths,comparison.rows.map(r=>`${r.policy}:${r.completedMonths}/${months}:${r.delta.cash}`).join(' '));}
  for(const production of ['craft','balanced']){const probe=runWorldStrategyComparison({seed,months,production,intervalMonths:12,localFocus:'bar',continuousFocus:'bar',temporaryRefusal:'stop',initial:opening});refusalProbes.comparisons.push({...probe,initialSha256});refusalProbes.localFocusSensitivity.push(runNativeWorldPolicy(opening,{policy:'local',months,production,intervalMonths:12,localFocus:'town-liquor',continuousFocus:'bar',temporaryRefusal:'stop'}));}
  refusalProbes.comparisons.push(runWorldStrategyComparison({seed,months,production:'balanced',intervalMonths:48,localFocus:'town-liquor',continuousFocus:'bar',temporaryRefusal:'stop',initial:opening}));
 }
 const opening=worldOpening(seeds[0]);comparisons.push(runWorldStrategyComparison({seed:seeds[0],months,production:'grain',intervalMonths:48,localFocus:'town-liquor',continuousFocus:'town-liquor',temporaryRefusal:'wait',initial:opening}));refusalProbes.comparisons.push(runWorldStrategyComparison({seed:seeds[0],months,production:'grain',intervalMonths:48,localFocus:'town-liquor',continuousFocus:'town-liquor',temporaryRefusal:'stop',initial:opening}));
}
const preOpening=worldOpening(seeds[0],{untilOffer:false});comparisons.push({...runWorldStrategyComparison({seed:seeds[0],months:12,production:'balanced',intervalMonths:12,localFocus:'town-liquor',continuousFocus:'bar',temporaryRefusal:'wait',initial:preOpening}),phase:'before-overseas-inquiry',initialSha256:fingerprint(preOpening)});
const openingHashes=new Map();
for(const c of comparisons){
 const key=c.seed+':'+(c.phase??'after-offer');
 if(!openingHashes.has(key)){const source=c.phase==='before-overseas-inquiry'?preOpening:worldOpening(c.seed),raw=JSON.stringify(source);let short=2166136261;for(const ch of raw)short=Math.imul(short^ch.charCodeAt(0),16777619)>>>0;openingHashes.set(key,{sha256:fingerprint(source),short:short.toString(16).padStart(8,'0'),codeUnits:raw.length});}
 const identity=openingHashes.get(key);if(c.initialFingerprint!==identity.short||c.rows.some(r=>r.initialFingerprint!==identity.short||r.initialCodeUnits!==identity.codeUnits))throw Error('Native starting checkpoint changed');c.initialSha256=identity.sha256;
}
function formalMeasurement(run,{cold=false}={}){
 const game=run.state;delete run.state;if(!game)return run;const raw=JSON.stringify(game);if(cold)run.coldSubprocess=freshCold(raw);
 const t=performance.now();try{const metadata=sessionFor(game),options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs},text=serializeSession(game,metadata,options),restored=readSession(text,options);run.formalSession={ok:serializeSession(restored.game,restored,options)===text,version:8,codeUnits:text.length,bytes:Buffer.byteLength(text),milliseconds:Math.round(performance.now()-t),includesHistoryRecall:true};}catch(e){run.formalSession={ok:false,error:e.message,milliseconds:Math.round(performance.now()-t)};}return run;
}
let long;
if(process.env.AMBER_WORLD_LONG_METRICS){long=load(process.env.AMBER_WORLD_LONG_METRICS);long.formalSession=load(process.env.AMBER_WORLD_LONG_FORMAL).formalSession;long.coldSubprocess=load(process.env.AMBER_WORLD_LONG_COLD);}
else long=formalMeasurement(runNativeWorldPolicy(worldOpening(seeds[0]),{policy:'distant',production:'balanced',intervalMonths:12,localFocus:'town-liquor',continuousFocus:'bar',temporaryRefusal:'wait',months:longMonths,retainState:true,onCheckpoint:(_s,m)=>console.log('long checkpoint',m.month,m.rawCodeUnits,m.operations,m.releases)}),{cold:true});
if(long.completedMonths>longMonths||long.seed!==seeds[0]||long.production!=='balanced'||long.policy!=='distant')throw Error('Long measurement does not match requested scenario');
if(!refusalProbes.additionalLongRun)refusalProbes.additionalLongRun=formalMeasurement(runNativeWorldPolicy(worldOpening(seeds[0]),{policy:'mixed',production:'balanced',intervalMonths:12,localFocus:'bar',continuousFocus:'bar',temporaryRefusal:'stop',months:longMonths,retainState:true}));
const observed=process.env.AMBER_WORLD_PRICE_CONTEXT?load(process.env.AMBER_WORLD_PRICE_CONTEXT):(()=>{const opening=worldOpening(seeds[0]),run=runNativeWorldPolicy(opening,{policy:'mixed',months:12,production:'balanced',localFocus:'town-liquor',continuousFocus:'bar',temporaryRefusal:'wait',retainState:true});return {opening:{month:opening.core.month,contexts:nativePriceContext(opening)},after:{month:run.state.core.month,contexts:nativePriceContext(run.state)},method:'Actual formal native states, no injected demand or contracts'};})();
for(const phase of Object.values(observed))if(phase?.contexts)for(const c of phase.contexts)c.partnerName=tradingPartner(c.partnerId)?.name??c.partnerId;
const report={schema:'ambertime-world-network-lab/1',base:'8ff15e13d482f921aa83b9f638a6e64416577d40',scope:'Actual public native operations from genuine seeded inquiry checkpoints; price cases separately counterfactual. Not human playtesting or formal premium adoption.',production:{craft:{malt:'peat',ferment:'short',collection:[25,40],cask:'bourbon',matureMonths:24},balanced:{alternates:['plain/short/45..65/refill/12months','peat/short/25..40/bourbon/24months']},grain:{malt:'plain',ferment:'short',collection:[45,65],cask:'refill',matureMonths:12},intervalMonths:[12,48],minimumBudget:'canonical canStart minimum plus selected-cask premium; bottling waits for stock space/funds',temporaryRefusal:'wait without adding flavor operations; retry on later actual months',maxCasks:4,brandId:1},comparisons:comparisons.map(packComparison),refusalProbes:{...refusalProbes,comparisons:refusalProbes.comparisons.map(packComparison)},prices:{...runPriceCounterfactual(),nativeContext:observed},longRun:{requestedMonths:longMonths,...long},limits:{...WORLD_LAB_LIMITS,activeProducts:8},assemblyMilliseconds:Math.round(performance.now()-start),executionMode:process.env.AMBER_WORLD_CANONICAL?'Assembly from completed, explicitly configured measurements':'Fresh complete measurements',limitations:['Each seed starts from the same genuine overseas inquiry checkpoint across its five strategies, not from month zero; the pre-inquiry case is separately labelled.','All policies accept actual incoming offers; only allocations differ. Common production rules may yield different actual production when finances/stock force waiting.','Distant cash may dominate after an upfront procurement contract; the report does not tune the economy to conceal this.','Temporary start/bottle refusals are waiting, not game over. Separate fixed-schedule probes stop on refusal and cannot establish bankruptcy or record capacity.','Price elasticity, unit cost8 and demand6units in the price matrix are explicit synthetic hypotheses. Native price context uses actual pending offers or observed last-three-month purchases; a contract alone adds no demand. No native quote or saved rule changes.','Four-cask production and finite formal record limits remain unchanged. Cached same-process restore timing is not cold-start time; coldSubprocess reports a fresh child and material latency.']};
fs.writeFileSync(new URL('./results-world-network.json',import.meta.url),JSON.stringify(report)+'\n');console.log('Wrote results-world-network.json',report.assemblyMilliseconds,'ms','long',long.completedMonths,long.stop,'cold',long.coldSubprocess);

return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runWorldNetworkEvidence();
