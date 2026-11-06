import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadRecords} from './data.mjs';
import {compareBoundary,metrics,linksFor,version,order} from './selection.mjs';
import {compareStorage} from './storage.mjs';
const {sources,records}=loadRecords();
const frozen=JSON.parse(fs.readFileSync(new URL('../s4/h2-comparison.json',import.meta.url)));
const results=[],timings=[],storage=[];
for(const {years,policy,record} of records){
 const editions=[];
 for(const {handoverId} of record.recallSnapshots){
  const before=JSON.stringify(record),start=performance.now(),r=compareBoundary(record,handoverId);
  const comparisonMs=performance.now()-start,samples=[];
  for(let repeat=0;repeat<7;repeat++){const timing={};compareBoundary(record,handoverId,timing);samples.push(timing);}
  const median=key=>samples.map(t=>t[key]).sort((a,b)=>a-b)[3];
  timings.push({years,policy,handoverId,comparisonMs,extractMedianMs:median('extractMs'),AMedianMs:median('AMs'),BMedianMs:median('BMs'),CMedianMs:median('CMs')});
  assert.equal(JSON.stringify(record),before);
  const baseline=frozen.results.find(x=>x.years===years&&x.policy===policy&&x.boundary===handoverId);
  assert.deepEqual(r.modes.A.selectedIds,baseline.selected.map(e=>e.id));assert.equal(r.seed,baseline.seed);
  for(const edition of Object.values(r.modes)){
   edition.metrics=metrics(edition.scenes,r.startMonth,r.cutoff.month,r.generation);
   edition.lostFromA=r.modes.A.selectedIds.filter(id=>!edition.selectedIds.includes(id));
   edition.newFromA=edition.selectedIds.filter(id=>!r.modes.A.selectedIds.includes(id));
  }
  editions.push({...r,version,scenes:r.modes.C.scenes});
  results.push({years,policy,sourceSha256:record.sourceSha256,...r});
 }
 storage.push({years,policy,...compareStorage(record,editions)});
}
for(const policy of ['local','wide','mixed']){
 const a=results.find(r=>r.years===30&&r.policy===policy),b=results.find(r=>r.years===100&&r.policy===policy);
 assert.deepEqual(a.modes,b.modes,'30/100 first boundary mismatch');
}
const record=records.find(r=>r.years===100&&r.policy==='local').record;
const activeExamples={status:'provisional-active-generation-4-not-a-frozen-recall',events:['delivery:1','delivery:78','delivery:153','delivery:238','arrival:e36','visit:e3669','bottling:14'].map(id=>{const event=record.events.find(e=>e.id===id);return {event,links:linksFor(event,record.events.filter(e=>order(e,event)<=0))};})};
const out={schema:'ambertime-h3-1-comparison/1',version,baseSha:'2df1ca9db957de576fbf9fa7e29b762c83023cb3',sources,method:'Exact published H2-5 snapshot memberships. A unchanged cumulative; A-current diagnostic; B/C outgoing-generation-only. 12 rows include 3 repeated first boundaries; 9 unique boundaries.',results,activeExamples};
fs.writeFileSync(new URL('./comparison.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(new URL('./timings.json',import.meta.url),JSON.stringify({runtime:process.version,measurement:'Warm process; no game replay or input IO',timings,storage},null,2)+'\n');
const lines=['# H3-1 世代回想の全場面','','Aは既存累積結果。B/Cは退く世代のみ。背景参照を主場面へ水増ししない。',''];
for(const r of results){
 lines.push('## '+r.policy+'・'+r.years+'年資料・第'+r.generation+'世代','',
  '境界：月'+r.cutoff.month+' / 操作'+r.cutoff.operationIndex+' / 同操作内'+r.cutoff.replayOrdinal+'。seed '+r.seed+'。','');
 for(const [mode,edition]of Object.entries(r.modes)){
  lines.push('### '+mode+'案（'+edition.scenes.length+'場面）','');
  for(const s of edition.scenes)lines.push(s.number+'. '+s.sentence,
   '   - 分類：'+s.category+' / '+s.event.kind+'。ID：'+s.eventId+'。採用理由：'+s.reason+'。',
   '   - 関係：'+(s.links.length?s.links.map(l=>l.type+' ← '+l.sourceId+'（'+l.role+'、月'+l.sourceMonth+'、第'+l.sourceGeneration+'世代'+(l.causal?'、因果確認済み':'')+'）').join(' / '):'確認できる関係なし。隣接するだけでは因果にしない。'),
   '   - 情景：'+s.illustration.location+'。'+s.illustration.action+'。');
  lines.push('');
 }
}
fs.writeFileSync(new URL('./SCENES.md',import.meta.url),lines.join('\n')+'\n');
console.log(JSON.stringify(results.map(r=>({years:r.years,policy:r.policy,generation:r.generation,A:r.modes.A.metrics,B:r.modes.B.metrics,C:r.modes.C.metrics})),null,2));
