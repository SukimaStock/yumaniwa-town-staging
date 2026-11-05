// Offline H1-A2 collector continuations. No product module imports this file.
// Existing projection bodies run inside pinned, in-memory collector wrappers.
// Prefix sidecars bind to the final target: original history closures consult
// final eras/releases. Online future-neutral collector migration is NOT proven.
// The sidecar digest detects ordinary corruption, not malicious re-signing.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildReleaseLedger} from '../ledger-view.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';
import {SHOPS} from '../shop-model.mjs';

const hashes={
 'generation-summary.mjs':'1c7608321562968ed91b4983f82ecb10d198d24cf4611d0da14ea23d964d9d68',
 'distillery-history.mjs':'119fd941e6ab671feef4ea8dce1b3d8b2e91236a8a0c2f2ca16b9e10a30504d4',
 'cask-ledger.mjs':'249a9d26d14856c8015620ff113af07d780c95e3ba042188b85466fbc613bea5',
 'memory-lab/connections.mjs':'0d69abc6f17a81b3237c19d24978819f3bf4879f6052e8fb5db009d26c39125d',
 'chronicle-lab/facts-generate.mjs':'b7e24370300a1679dbd58bb828c0a65212712b01c703b2797bdc27a3a9598ab5',
};
export const projectionSourceHashes=Object.freeze(hashes);
const clone=x=>structuredClone(x);
const encode=x=>x instanceof Map?{$map:[...x].map(([k,v])=>[encode(k),encode(v)])}:x instanceof Set?{$set:[...x].map(encode)}:Array.isArray(x)?x.map(encode):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,encode(v)])):x;
const decode=x=>x&&typeof x==='object'&&Object.keys(x).length===1&&x.$map?new Map(x.$map.map(([k,v])=>[decode(k),decode(v)])):x&&typeof x==='object'&&Object.keys(x).length===1&&x.$set?new Set(x.$set.map(decode)):Array.isArray(x)?x.map(decode):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,decode(v)])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function source(path){const url=new URL('../'+path,import.meta.url),text=readFileSync(url,'utf8');assert.equal(createHash('sha256').update(text).digest('hex'),hashes[path],'Projection source changed: '+path);return {url,text};}
function once(text,from,to){assert.equal(text.split(from).length,2,'Projection seam changed: '+from);return text.replace(from,to);}
function splitOnce(text,seam){assert.equal(text.split(seam).length,2,'Projection seam changed: '+seam);return text.split(seam);}
async function moduleFrom(text,url){text=text.replace(/from '([.][^']+)'/gu,(_,p)=>'from '+JSON.stringify(new URL(p,url).href)).replaceAll('import.meta.url',JSON.stringify(url.href));return import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));}

async function loadFactories(){
 let {text,url}=source('generation-summary.mjs');
 text=text.slice(0,text.indexOf('export function buildGenerationSummaries'));
 text=once(text,"import {replayDistilleryOperations} from './partner-orders.mjs?v=market-rules-r1';",'');
 text=once(text,'export function createGenerationSummary(state){','export function createGenerationSummary(state,prefix){');
 text=once(text,' const summaries=new Map(),seenShops=new Set();let unknownPast=!!state.origin;', ' const summaries=prefix?.summaries??new Map(),seenShops=prefix?.seenShops??new Set();let unknownPast=prefix?.unknownPast??!!state.origin;');
 text=once(text,' return {observe,finish};',' return {observe,finish,checkpoint:()=>({summaries,seenShops,unknownPast})};');
 const summary=await moduleFrom(text,url);

 ({text,url}=source('distillery-history.mjs'));
 text=text.replace(/^import \{createGenerationSummary\}[^\n]+\n/m,'').replace(/^import \{replayDistilleryOperations\}[^\n]+\n/m,'');
 text=once(text,'export function buildDistilleryHistory(state){','export function createHistoryCollector(state,prefix,createGenerationSummary){');
 text=once(text,' const summary=createGenerationSummary(state);',' const summary=createGenerationSummary(state,prefix?.summary);');
 text=once(text,' const events=new Map(),firstSales=new Set(),firstDistillations=new Set();',' const events=prefix?.events??new Map(),firstSales=prefix?.firstSales??new Set(),firstDistillations=prefix?.firstDistillations??new Set();');
 text=once(text,' let actor=eras.length?1:undefined;',' let actor=prefix?.actor??(eras.length?1:undefined);');
 text=once(text,' if(legacy){for(let s=state.origin;', ' if(legacy&&!prefix){for(let s=state.origin;');
 let [head,tail]=splitOnce(text,' replayDistilleryOperations(state,observation=>{');
 let [observe,rest]=splitOnce(tail,' });\n function addGenerationDecision');
 let [helpers,finish]=splitOnce(' function addGenerationDecision'+rest,' if(eras.length){\n  // Founding');
 finish=' if(eras.length){\n  // Founding'+finish;
 // Preserve helper scope; only the final rendering becomes finish().
 finish=finish.slice(0,finish.lastIndexOf('\n}'));
 text=head+' function observe(observation){'+observe+'\n }\n'+helpers+' function finish(){'+finish+'\n }\n return {observe,finish,checkpoint:()=>({events,firstSales,firstDistillations,actor,summary:summary.checkpoint()})};\n}';
 const history=await moduleFrom(text,url);

 ({text,url}=source('cask-ledger.mjs'));
 text=once(text,'export function buildCaskLedger(state,{facts,replay}={}){','export function createCaskCollector(state,prefix){\n let facts;');
 text=once(text,' const sources=new Map(),manuals=new Map(),fills=new Map(),initial=new Map(),casks=new Map(),notes=new Map(),volumes=new Map();',' const sources=prefix?.sources??new Map(),manuals=prefix?.manuals??new Map(),fills=prefix?.fills??new Map(),initial=prefix?.initial??new Map(),casks=prefix?.casks??new Map(),notes=prefix?.notes??new Map(),volumes=prefix?.volumes??new Map();');
 text=once(text," const coverage={complete:facts?.coverage?.complete===true,fromMonth:number(facts?.coverage?.fromMonth),replayed:typeof replay==='function'};",' let coverage;');
 text=once(text,'for(const s of origins)snapshot(s);','if(!prefix)for(const s of origins)snapshot(s);');
 [head,tail]=splitOnce(text," if(typeof replay==='function')replay(({operation,before,after})=>{");
 [observe,finish]=splitOnce(tail,' });\n snapshot(state);');
 finish=' snapshot(state);'+finish;
 finish=finish.slice(0,finish.lastIndexOf('\n}'));
 text=head+' function observe({operation,before,after}){'+observe+'\n }\n function finish(input){facts=input;coverage={complete:facts?.coverage?.complete===true,fromMonth:number(facts?.coverage?.fromMonth),replayed:true};'+finish+'\n }\n return {observe,finish,checkpoint:()=>({sources,manuals,fills,initial,casks,notes,volumes})};\n}';
 const cask=await moduleFrom(text,url);

 ({text,url}=source('memory-lab/connections.mjs'));
 text=text.slice(0,text.indexOf('export function extractConnections'));
 text=text.replace(/^import \{replayDistilleryOperations\}[^\n]+\n/m,'');
 text=once(text,'export function observeFacts(state,h0,observeOperation) {','export function createFactCollector(state,h0,prefix) {');
 text=once(text,"  const facts = Object.fromEntries(['offers'", "  const facts = prefix??Object.fromEntries(['offers'");
 [head,tail]=splitOnce(text,'  replayDistilleryOperations(state, observation => {');
 [observe,rest]=splitOnce(tail,'  });\n  return facts;');
 observe=once(observe,'    observeOperation?.(observation);','');
 text=head+'  function observe(observation){'+observe+'\n  }\n  return {observe,checkpoint:()=>facts};'+rest;
 const fact=await moduleFrom(text,url);

 ({text,url}=source('chronicle-lab/facts-generate.mjs'));
 text=text.slice(0,text.indexOf('const [directory, scenario, mode]'));
 text=text.replace(/^const histories = [^\n]+\n/m,'').replace(/^const previous = [^\n]+\n/m,'');
 [head,tail]=splitOnce(text,'function extract(state,analysis,uncompressed) {');
 const init='  const sales = new Map(), caskTypes = new Map(), townOrigins = new Map();\n  const facts = observeFacts(state,analysis,({index,operation,before,after}) => {';
 [rest,finish]=splitOnce(tail,'  });\n  const events = [];');
 assert.ok(rest.startsWith('\n'+init));
 const extraObserve=rest.slice(('\n'+init).length);
 text=head+'export function createRawCollector(state,analysis,prefix,createFactCollector){\n const sales=prefix?.sales??new Map(),caskTypes=prefix?.caskTypes??new Map(),townOrigins=prefix?.townOrigins??new Map();\n const factCollector=createFactCollector(state,analysis,prefix?.facts);\n function observe(observation){const {index,operation,before,after}=observation;'+extraObserve+'\n factCollector.observe(observation);\n }\n function finish(){const facts=factCollector.checkpoint(),uncompressed=true;\n const events=[];'+finish.slice(0,finish.lastIndexOf('\n}'))+'\n }\n return {observe,finish,checkpoint:()=>({sales,caskTypes,townOrigins,facts:factCollector.checkpoint()})};\n}';
 const raw=await moduleFrom(text,url);
 return {summary,history,cask,fact,raw};
}
let factories;
export async function createProjectionCollectors(state,{prefix=null,id='research',sourceSha256=null}={}){
 factories??=await loadFactories();
 const input=prefix?decode(clone(prefix.payload)):null;
 if(prefix){assert.equal(prefix.schema,'ambertime-projection-prefix/1');assert.equal(prefix.digest,digest(prefix.payload),'Projection checkpoint corrupted');assert.deepEqual(prefix.sourceHashes,hashes,'Projection rules changed');assert.equal(prefix.targetHash,digest(state),'Projection final target mismatch');assert.equal(prefix.seed,state.seed,'Projection seed mismatch');assert.equal(prefix.origin,JSON.stringify(state.origin),'Projection origin mismatch');assert.ok(prefix.nextOperationIndex<=state.operations.length);assert.equal(prefix.prefixHash,digest(state.operations.slice(0,prefix.nextOperationIndex)),'Projection prefix mismatch');}
 const analysis={shops:SHOPS,handovers:input?.handovers??[]};
 const history=factories.history.createHistoryCollector(state,input?.history,factories.summary.createGenerationSummary);
 const cask=factories.cask.createCaskCollector(state,input?.cask);
 const raw=factories.raw.createRawCollector(state,analysis,input?.raw,factories.fact.createFactCollector);
 let nextOperationIndex=prefix?.nextOperationIndex??0;
 function observe(observation){
  const {index,operation,before,after}=observation;
  assert.equal(index,operation?nextOperationIndex:-1,'Projection observation order mismatch');
  assert.ok(operation||!prefix,'Resumed collector must not receive a synthetic initial observation');
  history.observe(observation);cask.observe(observation);raw.observe(observation);
  const completed=after.generations?.completed??[];
  for(const era of completed.slice(before?.generations?.completed.length??0))analysis.handovers.push({month:era.endedMonth,generationId:era.id,nextGenerationId:after.generations.active.id,caskIds:after.core.casks.filter(c=>before.core.casks.some(old=>old.id===c.id)).map(c=>c.id),shopIds:[...new Set((after.shop?.relations??[]).filter(r=>r.shopId!=='department'||after.shop.deliveries.some(d=>d.shopId==='department')).map(r=>r.shopId??'town-liquor'))]});
  if(operation)nextOperationIndex++;
 }
 function checkpoint(){const payload=encode({history:history.checkpoint(),cask:cask.checkpoint(),raw:raw.checkpoint(),handovers:analysis.handovers});return clone({schema:'ambertime-projection-prefix/1',targetHash:digest(state),seed:state.seed,origin:JSON.stringify(state.origin),nextOperationIndex,prefixHash:digest(state.operations.slice(0,nextOperationIndex)),sourceHashes:hashes,payload,digest:digest(payload)});}
 function finish({context}){
  const caskIds=[...new Set([...state.core.casks,...state.core.archive,...state.records,...state.releases,...context.manualSources.values(),...(state.recipeBook?.entries??[]).map(r=>r.source)].map(c=>c?.caskId??c?.id).filter(Number.isFinite))];
  const productIds=[...new Set([...state.releases,...state.records].map(r=>r.productId).filter(Number.isFinite))];
  const facts={products:productIds.map(id=>context.nearbyProducts.get(id)).filter(Boolean).map(clone),casks:caskIds.map(id=>{const f=context.nearbyCasks.get(id);return f?{...clone(f),manualSource:clone(context.manualSources.get(id)??null)}:null;}).filter(Boolean),manualSources:[...context.manualSources.values()].map(clone),coverage:{complete:state.origin===null,fromMonth:state.origin?.core?.month??0}};
  const rawFacts=raw.finish();
  const rawRecord={id,seed:state.seed,sourceSha256,lastOperationIndex:state.operations.length-1,elapsedMonths:state.core.month,coverage:facts.coverage,events:rawFacts.events,omitted:rawFacts.omitted,factStage:'uncompressed'};
  return {casks:cask.finish(facts),history:history.finish(),releases:buildReleaseLedger(state,{facts}),shops:buildShopLedger(state),rawRecord};
 }
 return {observe,checkpoint,finish};
}
