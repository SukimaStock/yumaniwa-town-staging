// Offline only. Load the existing extraction and C-3 policy without invoking
// their 30-year fixture CLIs or changing the published generators.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SHOPS} from '../shop-model.mjs';
import {compactFacts} from './facts-compact.mjs';
import {buildChronicle} from './editor.mjs';
import {withReputationCandidates} from './facts-d.mjs';

async function loadSection(name,start,end,append,adapt = body => body) {
  const url = new URL(name,import.meta.url);
  const source = readFileSync(url,'utf8');
  const first = start ? source.indexOf(start) : 0;
  const last = source.indexOf(end,first);
  assert.ok(first >= 0 && last > first,`Offline source seam changed: ${name}`);
  const body = source.slice(first,last)
    .replace(/from '([.][^']+)'/gu,(_,path) => 'from '+JSON.stringify(new URL(path,url).href))
    .replaceAll('import.meta.url',JSON.stringify(url.href));
  return import('data:text/javascript;base64,'+Buffer.from(adapt(body)+append).toString('base64'));
}

const {extractLong} = await loadSection('./facts-generate.mjs',null,'const [directory, scenario, mode]',
  '\nexport const extractLong = (state,analysis,observer) => extract(state,analysis,true,observer);', body => {
    const seam = '    for (const cask of after.core.casks)';
    assert.ok(body.includes(seam),'Extraction observer seam changed');
    return body.replace('analysis,uncompressed)', 'analysis,uncompressed,observer)')
      .replace(seam,'    observer({index,operation,before,after});\n'+seam);
  });
const {candidateC} = await loadSection('./research-h23b.mjs','const reputation =','const timing =',
  '\nexport {candidateC};');

export function buildLongRecord(state,id,sourceSha256) {
  const handovers = [], operationGenerations = [];
  const coverage = {complete:!state.origin,fromMonth:state.origin?.core.month ?? 0};
  const started = performance.now();
  let final, lastGeneration;
  const {events,omitted} = extractLong(state,{shops:SHOPS,handovers},({index,before,after}) => {
    final = after;
    const generation = before?.generations?.active?.id ?? null;
    operationGenerations[index] = generation;
    const completed = after.generations?.completed ?? [];
    for (const era of completed.slice(before?.generations?.completed.length ?? 0)) {
      assert.ok(before,'This study requires complete careers');
      assert.equal(era.id,generation);
      assert.equal(after.generations.active.id,era.id+1);
      const caskIds = after.core.casks.filter(row=>before.core.casks.some(old=>old.id===row.id)).map(row=>row.id);
      const shopIds = [...new Set((after.shop?.relations ?? [])
        .filter(row=>row.shopId!=='department' || after.shop.deliveries.some(receipt=>receipt.shopId==='department'))
        .map(row=>row.shopId ?? 'town-liquor'))];
      handovers.push({month:era.endedMonth,generationId:era.id,nextGenerationId:after.generations.active.id,caskIds,shopIds});
    }
    lastGeneration = after.generations?.active?.id ?? null;
  });
  const {operations,origin,...snapshot} = state;
  assert.deepEqual(final,snapshot,'Recorded operations must reconstruct the complete checkpoint');
  assert.equal(new Set(events.map(event=>event.id)).size,events.length);
  for (const event of events) {
    assert.ok(event.evidence?.sourceId);
    assert.equal(event.generationId,operationGenerations[event.operationIndex ?? -1]);
  }
  const extractionMs = performance.now()-started;
  const {events:baseEvents} = compactFacts(events,state.labConnection.town.events);
  const baseIds = new Set(baseEvents.map(event=>event.id));
  const replayById = new Map(events.map(event=>[event.id,event]));
  const {events:retained} = candidateC(events,baseIds,{quiet:false,release:false});
  const keptIds = new Set(retained.map(event=>event.id));
  const arrivals = new Map(events.filter(event=>event.kind==='arrival').map(event=>[event.ids.townEventId,event.id]));
  for (const event of retained.filter(event=>['inquiry','visit'].includes(event.kind))) {
    const source = event.evidence.sourceChain.findLast(id=>arrivals.has(id));
    if (source) assert.ok(keptIds.has(arrivals.get(source)));
  }
  const record = withReputationCandidates({
    id,seed:state.seed,sourceSha256,lastOperationIndex:operations.length-1,elapsedMonths:state.core.month,
    coverage,events:baseEvents,omitted,
  },{
    sourceSha256,
    events:retained.filter(event=>!baseIds.has(event.id)).map(event=>({...event,replayOrdinal:event.ordinal})),
    replayOrdinals:Object.fromEntries(baseEvents.map(event=>[event.id,replayById.get(event.id).ordinal])),
  });
  const counts = {};
  for (const {kind} of events) counts[kind] = (counts[kind] ?? 0)+1;
  return {record,metrics:{
    extractionMs,retentionMs:performance.now()-started-extractionMs,rawEvents:events.length,rawKinds:counts,
    operations:operations.length,brands:state.brands.map(({id,name})=>({id,name})),
    officialGenerations:state.generations.completed,activeGeneration:lastGeneration,
    originalTownEvents:state.labConnection.town.events.length,
    extractedBytes:Buffer.byteLength(JSON.stringify(record)),
    peakRssBytes:process.resourceUsage().maxRSS*1024,
  }};
}

// For prefix auditing, facts discarded by the full C-3 pass cannot become
// first-in-region or first-in-generation by truncating its tail. Any displayed
// antecedent eligible through a prefix inquiry/visit is already in the full
// closure. Recomputing on the retained facts is therefore sufficient.
export function auditPrefixClosure(record) {
  const order = (a,b) => a.month-b.month || (a.operationIndex ?? -1)-(b.operationIndex ?? -1) ||
    a.replayOrdinal-b.replayOrdinal;
  const sorted = record.events.toSorted(order);
  return sorted.filter(event=>event.kind==='handover').map(boundary=>{
    const visible = event => event.month<=boundary.month &&
      (event.operationIndex == null ? event.month<boundary.month :
        event.operationIndex<boundary.operationIndex ||
        event.operationIndex===boundary.operationIndex && event.replayOrdinal<=boundary.replayOrdinal);
    const prefix = sorted.filter(visible);
    const baselineIds = new Set(compactFacts(prefix,[]).events.map(event=>event.id));
    const asOf = candidateC(prefix,baselineIds,{quiet:false,release:false}).events;
    const retained = new Set(asOf.map(event=>event.id));
    const postCutoffSources = prefix.filter(event=>!retained.has(event.id)).map(event=>({
      id:event.id,month:event.month,region:event.ids.regionId,
      laterReferences:sorted.filter(later=>!visible(later) && ['inquiry','visit'].includes(later.kind) &&
        later.evidence.sourceChain.includes(event.ids.townEventId)).map(({id,month})=>({id,month})),
    }));
    assert.ok(postCutoffSources.every(event=>event.laterReferences.length>0));
    const options = boundary.generationId===1 ? {} : {targetGeneration:boundary.generationId};
    const full = buildChronicle(record,'handover','d',options);
    // Keep the legacy ordinal (seed) and replayOrdinal (boundary) exactly.
    const asOfEdit = buildChronicle({...record,events:asOf},'handover','d',options);
    assert.deepEqual(full.cutoff,asOfEdit.cutoff);
    assert.equal(full.audit.seed,asOfEdit.audit.seed);
    return {boundary:boundary.id,cutoff:full.cutoff,seed:full.audit.seed,
      fullCount:prefix.length,asOfCount:asOf.length,postCutoffSources,
      fullSelection:full.audit.selectedIds,asOfSelection:asOfEdit.audit.selectedIds,
    };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [path,id] = process.argv.slice(2);
  if (id==='--prefix') {
    console.log(JSON.stringify(auditPrefixClosure(JSON.parse(readFileSync(path,'utf8')).record)));
    process.exit(0);
  }
  assert.ok(path && id,'Usage: node research-h24-facts.mjs <checkpoint.json> <scenario>');
  const raw = readFileSync(path,'utf8');
  const state = JSON.parse(raw);
  const result = buildLongRecord(state,id,createHash('sha256').update(raw).digest('hex'));
  assert.equal(JSON.stringify(state),raw,'Extraction must preserve the checkpoint');
  result.metrics.saveBytes = Buffer.byteLength(raw);
  console.log(JSON.stringify(result));
}
