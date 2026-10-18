// Actual 120-year v16 estate, recipe-book upgrade and disposable comparison views.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as D from '../partner-orders.mjs';
import * as S from '../shop-model.mjs';
import * as B from './brands-helpers.mjs';
import {buildGenerationGame} from './generation-simulate.mjs';
import {createComparisonProjection,buildComparisonData} from '../comparison-model.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),round=n=>Math.round(n*100)/100||0;
const estate=s=>JSON.stringify({core:s.core,still:s.still,usual:s.usual,generations:s.generations,brands:s.brands,releases:s.releases,records:s.records,shop:s.shop,department:s.department,trade:s.trade,batchesById:s.batchesById,notesById:s.notesById,productsById:s.productsById});
const timed=fn=>{const t=performance.now(),value=fn();return {value,ms:round(performance.now()-t)};};
const json=x=>JSON.parse(JSON.stringify(x));
const out=process.env.AMBER_OUT?new URL('file://'+process.env.AMBER_OUT+'/'):new URL('../design/comparison/',import.meta.url);
function csv(name,rows){const keys=[...new Set(rows.flatMap(Object.keys))],cell=x=>'"'+String(x==null?'':typeof x==='object'?JSON.stringify(x):x).replaceAll('"','""')+'"';fs.writeFileSync(new URL(name,out),keys.map(cell).join(',')+'\n'+rows.map(r=>keys.map(k=>cell(r[k])).join(',')).join('\n')+'\n');}
function checkFacts(s,data){
 assert.equal(new Set(data.items.map(x=>x.key)).size,data.items.length);
 assert.equal(new Set(data.manualSources.map(x=>x.caskId)).size,data.manualSources.length);
 const cents=x=>Math.round(x*100);let count=0,revenue=0;
 for(const item of data.items){
  if(item.kind==='cask')continue;
  const n=(item.retail?.count??0)+(item.wholesale?.count??0)+item.shops.reduce((n,x)=>n+x.count,0);
  const money=cents(item.retail?.revenue??0)+cents(item.wholesale?.revenue??0)+item.shops.reduce((n,x)=>n+cents(x.revenue),0);
  count+=n;revenue+=money;
  if(item.bottles!==null&&item.stock!==null)assert.equal(item.stock+n,item.bottles,'Stock and all sales channels: '+item.key);
  if(item.salesComplete){assert.equal(item.retailPriceTotals.reduce((n,x)=>n+x.count,0),item.retail.count);assert.equal(item.retailPriceTotals.reduce((n,x)=>n+cents(x.revenue),0),cents(item.retail.revenue));}
  assert(item.age===null||item.age>=0);assert(item.filledMonth===null||item.filledMonth<=s.core.month);
  assert(item.firstSaleMonth===null||item.firstSaleMonth>=item.listedMonth);
  for(const period of item.priceChanges){assert(period.month>=item.bottledMonth&&period.month<=s.core.month);assert(period.price>0);}
  if(item.manualSource){assert.equal(item.manualSource.caskId,item.caskId);assert.equal(item.manualSource.batchId,item.batchId);assert.equal(item.manualSource.stopAt,item.stopAt);}
 }
 assert.equal(count,s.core.totals.bottlesSold,'All historical channel quantities');assert.equal(revenue,cents(s.core.totals.revenue),'All historical channel revenues');
 return {items:data.items.length,casks:data.items.filter(x=>x.kind==='cask').length,releases:data.items.filter(x=>x.kind==='release').length,manualSources:data.manualSources.length,totalSold:count,totalRevenue:revenue/100,priceChanges:data.items.reduce((n,x)=>n+x.priceChanges.length,0),historicalReleasesCovered:s.releases.every(r=>data.items.some(x=>x.releaseId===r.id)),allChannelsMatch:true};
}
function shortColdEquality(){
 let s=B.release(D.newRecipeDistillery(11),{progress:65,type:'refill',age:12,selection:{name:'川辺'},tier:'standard'}),id=s.result.productId;
 s=B.advance(s,1);s=D.setSalePrice(s,'high',id);s=B.advance(s,1);s=D.setSalePrice(s,'low',id);s=B.advance(s,1);
 const raw=D.serializeDistillery(s),projection=createComparisonProjection();projection.update(s);
 const source=D.manualRecipeSources(s)[0];s=D.saveRecipe(s,source.caskId,'最初の製法');s=D.selectRecipe(s,s.recipeBook.entries[0].id);
 const warm=projection.update(s),cold=buildComparisonData(s);assert.deepEqual(json(warm),json(cold));assert.equal(D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(s))),D.serializeDistillery(s));
 return {month:s.core.month,items:cold.items.length,pricePeriods:cold.items.find(x=>x.productId===id).priceChanges.length,warmEqualsCold:true,originalRawBytes:Buffer.byteLength(raw,'utf8')};
}

async function main(){
 fs.mkdirSync(out,{recursive:true});
 const base='6eb9b676f68ada4fd9601cde7a9e8dbd43c56f66',protectedFiles=['model.mjs','economy.mjs','parameters.mjs','economy-parameters.mjs','partner-parameters.mjs','aroma-extraction.mjs','brand-reputation.mjs'];
 const chemistry=Object.fromEntries(protectedFiles.map(f=>[f,hash(fs.readFileSync(new URL('../'+f,import.meta.url)))]));
 assert.deepEqual(chemistry,Object.fromEntries(protectedFiles.map(f=>[f,hash(execFileSync('git',['show',base+':works/ambertime/'+f],{cwd:new URL('../../../',import.meta.url)}))])));
 let baseline,sourceMode;const sourcePath=process.env.AMBER_COMPARISON_SAVE??'/tmp/ambertime-generations/1.json',start=performance.now();
 if(fs.existsSync(sourcePath)){
  const raw=fs.readFileSync(sourcePath,'utf8'),prior=JSON.parse(fs.readFileSync(new URL('../design/generations/long-results.json',import.meta.url),'utf8')).runs.find(r=>r.seed===1);
  assert.equal(hash(raw),prior.stateSha256,'Reused actual public-play source must match committed evidence');baseline=D.restoreDistillery(raw);sourceMode='strictly-restored previously observed public v16 seed1 1440month source';
 }else{baseline=buildGenerationGame(1440,{seed:1});sourceMode='fresh actual public v16 seed1 1440month play';}
 const baselineRaw=D.serializeDistillery(baseline),baselineValidationMs=round(performance.now()-start);assert.equal(baseline.version,16);assert.equal(baseline.core.month,1440);
 console.error(JSON.stringify({phase:'baseline-valid',sourceMode,month:baseline.core.month,operations:baseline.operations.length,ms:baselineValidationMs}));
 const before=estate(baseline);let s=D.enableRecipeBook(baseline);assert.equal(estate(s),before);
 const sourceTiming=timed(()=>D.manualRecipeSources(s)),sources=sourceTiming.value;
 const pruned=sources.filter(r=>!s.core.casks.some(c=>c.id===r.caskId)&&!s.core.archive.some(c=>c.id===r.caskId)&&!s.records.some(x=>x.caskId===r.caskId));
 assert(pruned.length>=2,'Old manual sources outlive short records and cask archive');
 const saved=[];
 for(const [i,source]of pruned.slice(0,2).entries()){
  s=D.saveRecipe(s,source.caskId,['創業時の抽出','次の抽出'][i]);s=D.selectRecipe(s,s.recipeBook.entries.at(-1).id);assert.equal(estate(s),before);
  const entry=s.recipeBook.entries.at(-1);assert.equal(entry.stopAt,source.stopAt);assert.equal(entry.type,source.type);assert.equal(entry.source.caskId,source.caskId);assert.equal(entry.source.batchId,source.batchId);assert.equal(entry.source.filledMonth,source.filledMonth);assert.equal(entry.source.operationIndex,source.operationIndex);assert(!('brandId'in entry.source),'No invented source brand metadata');saved.push({entry,actualSource:source,sourceAbsentFromShortRecords:true,sourceAbsentFromArchive:true});
 }
 const projection=createComparisonProjection(),initial=timed(()=>projection.update(s)),data=initial.value;const initialFacts=checkFacts(s,data);assert.equal(estate(s),before);
 console.error(JSON.stringify({phase:'initial-projection',ms:initial.ms,...initialFacts}));
 const identical=timed(()=>projection.update(s));assert.deepEqual(json(identical.value),json(data));
 s=D.selectRecipe(s,s.recipeBook.entries[0].id);assert.equal(estate(s),before);const suffix=timed(()=>projection.update(s));assert.deepEqual(json(suffix.value),json(data));
 const oldTick=D.tickDistillery(baseline),oldMonth=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,oldMonth+1);assert.equal(estate(s),estate(oldTick),'Selected recipe does not change an ordinary monthly outcome');
 const monthUpdate=timed(()=>projection.update(s)),monthlyFacts=checkFacts(s,monthUpdate.value);
 const serialization=timed(()=>D.serializeDistillery(s)),raw=serialization.value;
 // Run the short cold/warm equality only after the long suffix has reused its
 // validator prefix. The short game's cache must not evict the long prefix.
 const short=shortColdEquality();
 const child=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};const raw=fs.readFileSync(0,'utf8'),t=performance.now(),s=D.restoreDistillery(raw);process.stdout.write(JSON.stringify({raw:D.serializeDistillery(s),book:s.recipeBook,ms:performance.now()-t}));`;
 const cold=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',child],{input:raw,maxBuffer:16e6}));assert.equal(cold.raw,raw);assert.deepEqual(cold.book,s.recipeBook);
 const result={method:{base,seed:1,sourceMode,baselineMonths:1440,upgradeVersion:s.version,finalMonth:s.core.month,chemistry,scope:'Actual 120-year v16 public play, then recipe-book upgrade, save two pruned old manual sources, select them, compare full history, then one actual v17 month. Not120years played entirely under v17. No state injection, no tolerance weakening. Initial comparison projection only once at120years; shortfixture cold equality covers incremental semantics.',limits:'One observed manufacturing policy/seed. Timings shared-machine observations, not human playtime or device guarantees. UTF16 codeunit restore bound and browserlocalStorage quota are different.'},baseline:{sha256:hash(baselineRaw),months:baseline.core.month,completedGenerations:baseline.generations.completed.length,activeGeneration:baseline.generations.active.id,brands:baseline.brands.length,relations:baseline.shop.relations.length,releases:baseline.releases.length,deliveries:baseline.shop.deliveries.length,adoptions:baseline.department.adoptions.length},savedRecipes:saved,observations:{manualSources:sources.length,prunedSources:pruned.length,estateUnchangedOnUpgradeAndSelection:true,monthOutcomeEqualsOldModel:true,initialFacts,monthlyFacts,shortFixture:short,coldRestoreEqual:true,coldRecipeBookEqual:true},timingsMs:{baselineValidation:baselineValidationMs,manualSourceLookup:sourceTiming.ms,initialProjection:initial.ms,identicalProjection:identical.ms,recipeSuffixProjection:suffix.ms,oneMonthProjection:monthUpdate.ms,suffixSerialization:serialization.ms,coldFinalRestore:round(cold.ms)},capacity:{brands:s.brands.length,brandsRemaining:D.RETAIL_BRANDS.maxBrands-s.brands.length,operations:s.operations.length,operationsRemaining:P.maxOperations-s.operations.length,releases:s.releases.length,releasesRemaining:D.RETAIL_BRANDS.maxReleases-s.releases.length,deliveries:s.shop.deliveries.length,deliveriesRemaining:S.SHOP.maxDeliveries-s.shop.deliveries.length,recipes:s.recipeBook.entries.length,recipesRemaining:D.RECIPE_BOOK.maxEntries-s.recipeBook.entries.length,codeUnits:raw.length,utf8Bytes:Buffer.byteLength(raw,'utf8'),utf16Bytes:raw.length*2,restoreExclusiveCodeUnitLimit:P.maxSaveBytes*4+16384,restoreRemainingCodeUnits:P.maxSaveBytes*4+16384-raw.length},stateSha256:hash(raw)};
 fs.writeFileSync(new URL('long-results.json',out),JSON.stringify(result,null,2)+'\n');csv('long-items.csv',monthUpdate.value.items);csv('long-recipes.csv',saved);csv('long-timings.csv',Object.entries(result.timingsMs).map(([operation,ms])=>({operation,ms})));console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))await main();
