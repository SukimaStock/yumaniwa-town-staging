// Representative adoption parity, not a fresh full economic-safety sweep.
// Uses the already reviewed career policy against native public operations;
// does not invoke or weaken the old Lab's pinned-source adapter/guard.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as D from '../../partner-orders.mjs';
import {runCareer} from '../../experiments/market-design/v01/run.mjs';
const lab=new URL('../../experiments/market-design/v01/',import.meta.url);
const configs=[{seed:42,cap:1,age:6,policy:'retail'},{seed:42,cap:4,age:6,policy:'retail'},{seed:42,cap:2,age:12,policy:'mixed'},{seed:42,cap:2,age:24,policy:'shops'}];
const metrics=['months','minCash','endCash','revenue','sold','stock','casks','starts','bottled','forced','blocked','reason','nextMinimum','nativeNextMinimum','fundingGap','canStart','canStartReason','maxZeroMonths','maxZeroMonthsWithInventory','shortagePeriods','unlock','bottling','stops','returns'];
const monthlyFields=['month','cash','revenue','cumulativeRevenue','sold','cumulativeSold','net','stock','casks','nextMinimum','fundingGap','retailSold','shopSold'];
const pick=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o[k]]));
export async function validateAdoption(out=new URL('./financial-results.json',import.meta.url)){
 const frozen=JSON.parse(await fs.readFile(new URL('economic-results.json',lab),'utf8'));
 const engine={...D,newStoreMarketDistillery:D.newMarketRulesDistillery},runs=[];
 for(const config of configs){
  const expected=frozen.runs.find(r=>r.seed===config.seed&&r.cap===config.cap&&r.age===config.age&&r.policy===config.policy&&r.warmupMonths===0&&r.recipe.malt==='plain'&&r.recipe.ferment==='long'&&r.tier==='standard');assert(expected,'Missing frozen reference');
  const native=runCareer(engine,{...config,restoreCheck:true});
  for(const key of metrics)assert.deepEqual(native[key],expected[key],`${JSON.stringify(config)} ${key}`);
  const trajectories=JSON.parse(await fs.readFile(new URL(expected.trajectoryFile,lab),'utf8')),trace=trajectories.trajectories[expected.trajectoryIndex];
  assert.deepEqual(native.monthly.map(r=>pick(r,monthlyFields)),trace.monthly.map(r=>pick(r,monthlyFields)),`${JSON.stringify(config)} every economic month`);
  runs.push({config,reference:{file:expected.trajectoryFile,index:expected.trajectoryIndex},matched:true,coldSerializationReplay:native.roundtrip,...pick(native,metrics),monthly:native.monthly.map(r=>pick(r,monthlyFields))});
  process.stderr.write(`Native adoption parity ${runs.length}/${configs.length}: ${config.policy} ${config.cap}casks ${config.age}m -> ${native.months}months £${native.endCash}\n`);
 }
 const hashes={};for(const name of ['market-sales.mjs','economy.mjs','store-market.mjs','partner-orders.mjs'])hashes[name]=createHash('sha256').update(await fs.readFile(new URL('../../'+name,import.meta.url))).digest('hex');
 const result={schema:'ambertime-native-market-adoption-finance/1',scope:'Four representative native careers versus immutable PR667 results; not all84 and not universal safety. Includes a known stopped career rather than treating nonnegative cash as success.',referenceMerge:'ae65684c23fddf7d2515358d804ae2775cc51ee4',rules:'ambertime-market-design/1',sourceSha256:hashes,metricsCompared:metrics,monthlyFieldsCompared:monthlyFields,runs,runCount:runs.length,totalMonths:runs.reduce((n,r)=>n+r.months,0)};
 await fs.writeFile(out,JSON.stringify(result,null,2)+'\n');return result;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)await validateAdoption(process.argv[2]??new URL('./financial-results.json',import.meta.url));
