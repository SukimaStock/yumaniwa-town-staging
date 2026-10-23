// Paired, finite comparisons. No changes to existing models, no seed search.
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import * as M from './model.mjs';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
const folder=new URL('./results/',import.meta.url);await fs.mkdir(folder,{recursive:true});
export const SEEDS=[42,20261021,1,7,17,31,73,101,127,251,509,997,2026,4093,8191,16381,32749,65521,131071,262139,524287,1048573,2097143,4194301];
const cases=[];
// Core factorial: matched destination comparison A..E, native split diagnostic,
// monthly-frequency diagnostic; all-open versus event-gated, stable versus changing.
for(const group of M.GROUPS)for(const access of ['open','discovery'])for(const change of ['same','switch'])cases.push({group:group.id,timing:'rotation',access,change,flavor:'fruit'});
for(const group of M.GROUPS)cases.push({group:group.id,timing:'split',access:'open',change:'same',flavor:'fruit'});
for(const group of ['A','E'])cases.push({group,timing:'frequent',access:'open',change:'same',flavor:'fruit'});
for(const f of M.FLAVORS.filter(f=>f.id!=='fruit'))cases.push({group:'E',timing:'rotation',access:'open',change:'same',flavor:f.id});
const summarize=s=>{const x=M.summary(s);delete x.recentEvents;delete x.regions;return {...x,shops:x.shops.map(({history,events,lastComment,name,status,...n})=>n),signals:s.shipments.reduce((n,d)=>n+1-Math.exp(-d.count/4),0),firstInquiry:Object.fromEntries(M.SHOPS.map(n=>[n.id,s.town.events.find(e=>e.type==='inquiry'&&e.to===n.id)?.month??null])),firstRumor:s.town.events.find(e=>e.type==='rumor')?.month??null};};
const receiptSchedule=s=>s.shipments.map(d=>[d.id,d.month,d.count,d.releaseId,d.flavorId]);
async function runSeedsSequential(seeds,pilot=false){const rows=[],started=performance.now();let i=0;
 for(const seed of seeds)for(const condition of cases){
  const s=M.create({seed,...condition}),checkpoints={};for(const year of [10,20,30]){M.advance(s,year*12);checkpoints[year]=summarize(s);}
  const valid=M.validate(s);if(!valid.ok)throw Error(JSON.stringify(valid));
  const log=M.exportLog(s),row={seed,...condition,checkpoints,scheduleChecksum:M.checksum(receiptSchedule(s)),checksum:log.checksum,validation:valid};rows.push(row);
  // Selected complete logs fixed before results are known, including weak flavor.
  if(!pilot&&seed===42&&condition.timing==='rotation'&&condition.group==='E'&&(condition.flavor==='wood'||condition.access==='discovery'))await fs.writeFile(new URL(`log-42-${condition.access}-${condition.flavor}-${condition.change}.json`,folder),JSON.stringify(log)+'\n');
  if(++i%24===0)console.log(JSON.stringify({phase:pilot?'pilot':'full',completed:i,total:seeds.length*cases.length}));
 }
 // Assert matched rotation all-open A..E before treating them as paired evidence.
 for(const seed of seeds){const selected=rows.filter(r=>r.seed===seed&&r.timing==='rotation'&&r.access==='open'&&r.change==='same'&&r.flavor==='fruit');if(new Set(selected.map(r=>r.scheduleChecksum)).size!==1)throw Error('Unmatched receipt schedule');}
 return {seeds,cases:cases.length,rows,elapsedMs:performance.now()-started};
}
const stats=values=>{const xs=values.filter(x=>x!==null).sort((a,b)=>a-b),n=values.length;if(!xs.length)return {n,reached:0,unreached:n,first:null,median:null,mean:null,q1:null,q3:null,last:null};const q=p=>xs[Math.floor((xs.length-1)*p)];return {n,reached:xs.length,unreached:n-xs.length,first:xs[0],median:xs.length%2?xs[(xs.length-1)/2]:(xs[xs.length/2-1]+xs[xs.length/2])/2,mean:xs.reduce((a,b)=>a+b,0)/xs.length,q1:q(.25),q3:q(.75),last:xs.at(-1)};};
async function runSeeds(seeds,pilot=false){
 const started=performance.now(),parts=[];let cursor=0;
 async function lane(){while(cursor<seeds.length){const seed=seeds[cursor++];const r=await new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{seeds:[seed],pilot}});w.once('message',resolve);w.once('error',reject);w.once('exit',code=>{if(code)reject(Error('worker exit '+code));});});parts.push(r);console.log(JSON.stringify({phase:pilot?'pilot':'full',seedsComplete:parts.length,total:seeds.length}));}}
 await Promise.all(Array.from({length:Math.min(4,seeds.length)},lane));
 const rows=parts.flatMap(p=>p.rows).sort((a,b)=>seeds.indexOf(a.seed)-seeds.indexOf(b.seed)||cases.findIndex(c=>Object.entries(c).every(([k,v])=>a[k]===v))-cases.findIndex(c=>Object.entries(c).every(([k,v])=>b[k]===v)));
 return {seeds,cases:cases.length,rows,elapsedMs:performance.now()-started};
}
if(!isMainThread){parentPort.postMessage(await runSeedsSequential(workerData.seeds,workerData.pilot));}
else {
const pilot=await runSeeds(SEEDS.slice(0,3),true);await fs.writeFile(new URL('pilot.json',folder),JSON.stringify({method:'fixed first3 seeds; all33cases complete and valid before full run',...pilot})+'\n');
console.log('pilot valid; expanding to24 fixed seeds');
const full=await runSeeds(SEEDS),aggregate=cases.map(c=>{const rows=full.rows.filter(r=>Object.entries(c).every(([k,v])=>r[k]===v));return {...c,checkpoints:Object.fromEntries([10,20,30].map(year=>[year,{reach:Object.fromEntries(['near','national','overseas'].map(level=>[level,stats(rows.map(r=>r.checkpoints[year].firstReach[level]))])),rumors:stats(rows.map(r=>r.checkpoints[year].counts.rumor??0)),inquiries:stats(rows.map(r=>r.checkpoints[year].counts.inquiry??0)),visits:stats(rows.map(r=>r.checkpoints[year].counts.visit??0)),quiet:stats(rows.map(r=>r.checkpoints[year].quietMonths)),shops:Object.fromEntries(M.SHOPS.map(n=>[n.id,{handling:stats(rows.map(r=>r.checkpoints[year].shops.find(s=>s.id===n.id)?.firstHandling??null)),firstDelivery:stats(rows.map(r=>r.checkpoints[year].shops.find(s=>s.id===n.id)?.firstDelivery??null)),settled:rows.filter(r=>r.checkpoints[year].shops.find(s=>s.id===n.id)?.settled).length}]))}]))};});
const matrix=M.FLAVORS.map(f=>({id:f.id,name:f.name,label:f.label,recipe:f.recipe,ageMonths:f.ageMonths,profile:f.profile,product:f.product,shops:Object.fromEntries(M.SHOPS.map(n=>[n.id,M.fitDetails(n.id,f)]))}));
const manifest={schema:'shop-expansion-comparison/1',base:M.BASE,seeds:SEEDS,caseCount:cases.length,runCount:full.rows.length,years:[10,20,30],statistics:'Reach stats conditional on reached. Always report reached/unreached; no null converted to0 or 361.',matrix,aggregate,elapsedMs:full.elapsedMs};
await fs.writeFile(new URL('comparison.json',folder),JSON.stringify(manifest)+'\n');await fs.writeFile(new URL('runs.json',folder),JSON.stringify(full)+'\n');
const head=['seed','group','timing','access','change','flavor','year','produced','delivered','inventory','receipts','signal','near','national','overseas','rumors','inquiries','visits','quietMonths'];
const csv=[head.join(',')];for(const r of full.rows)for(const y of [10,20,30]){const x=r.checkpoints[y];csv.push([r.seed,r.group,r.timing,r.access,r.change,r.flavor,y,x.produced,x.delivered,x.inventory,x.receiptCount,x.signals,x.firstReach.near??'',x.firstReach.national??'',x.firstReach.overseas??'',x.counts.rumor??0,x.counts.inquiry??0,x.counts.visit??0,x.quietMonths].join(','));}await fs.writeFile(new URL('monthly-checkpoints.csv',folder),csv.join('\n')+'\n');
// Preserve E/discovery/switch rare bar as a causal note, alongside its23 failures.
const rare=M.advance(M.create({seed:997,access:'discovery',change:'switch'}),360),handling=rare.handling.bar,offer=rare.events.find(e=>e.id===handling.sourceId),inquiry=rare.town.events.find(e=>e.id===offer.sourceId);let parent=inquiry;const causalChain=[];while(parent){causalChain.push(parent);parent=rare.town.events.find(e=>e.id===parent.sourceId);}
await fs.writeFile(new URL('bar-discovery-997.json',folder),JSON.stringify({seed:997,options:rare.options,handling,causalChain,sourceRelease:rare.town.releases.find(r=>r.id===inquiry.releaseId),barShipments:rare.shipments.filter(d=>d.to==='bar'),summary:M.shopView(rare,'bar')},null,2)+'\n');
for(const file of await fs.readdir(folder))if(/^(?:pilot|runs|log-42-.+)\.json$/.test(file)){const source=new URL(file,folder);await fs.writeFile(new URL(file+'.gz',folder),gzipSync(await fs.readFile(source),{level:9}));await fs.unlink(source);}
console.log(JSON.stringify({runs:full.rows.length,cases:cases.length,seeds:SEEDS.length,elapsedMs:full.elapsedMs}));

}
