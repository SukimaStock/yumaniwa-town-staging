// Actual one-generation / 120-year operations; targeted reads, not UI timings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as D from '../partner-orders.mjs?v=0.18-nearby';
import {nearbyCasks,releasePair,previousRelease,sourceDetails} from '../nearby-comparison.mjs';
import {buildGenerationGame} from './generation-simulate.mjs';
import {buildComparisonData} from '../comparison-model.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const round=x=>Math.round(x*100)/100;
const timed=fn=>{const start=performance.now(),value=fn();return {value,ms:round(performance.now()-start)};};
const equal=(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
function child(path,label){
 const raw=fs.readFileSync(path,'utf8'),restore=timed(()=>D.restoreDistillery(raw));let s=restore.value;
 const oldEstate=JSON.stringify({core:s.core,still:s.still,usual:s.usual,generations:s.generations,brands:s.brands,releases:s.releases,shop:s.shop,department:s.department,trade:s.trade});
 const upgrade=timed(()=>{s=D.enableRecipeBook(s);const src=D.manualRecipeSources(s);for(const source of [src[0],src.at(-1)]){s=D.saveRecipe(s,source.caskId);s=D.selectRecipe(s,s.recipeBook.entries.at(-1).id);}return src;});
 assert.equal(JSON.stringify({core:s.core,still:s.still,usual:s.usual,generations:s.generations,brands:s.brands,releases:s.releases,shop:s.shop,department:s.department,trade:s.trade}),oldEstate);
 const before=JSON.stringify(s),book=JSON.stringify(s.recipeBook),generation=JSON.stringify(s.generations);
 const current=s.releases.filter(r=>previousRelease(s,r.id)).at(-1);assert(current);
 const initialCasks=timed(()=>nearbyCasks(s));assert(initialCasks.value.length>=3);
 const base=initialCasks.value[0];
 const changeCask=timed(()=>{const all=nearbyCasks(s);return [all.find(c=>c.caskId===base.caskId),all[2]];});
 const reopenCasks=timed(()=>nearbyCasks(s));equal(initialCasks.value,reopenCasks.value);assert.notEqual(changeCask.value[0].caskId,changeCask.value[1].caskId);
 const initialRelease=timed(()=>releasePair(s,current.id));assert.equal(initialRelease.value.current.brandId,initialRelease.value.previous.brandId);assert.equal(initialRelease.value.previous.releaseId,previousRelease(s,current.id).id);
 const reopenRelease=timed(()=>releasePair(s,current.id));equal(initialRelease.value,reopenRelease.value);
 const earlier=s.releases.filter(r=>previousRelease(s,r.id)&&r.id!==current.id).at(-1);const changeRelease=timed(()=>releasePair(s,earlier.id));assert(changeRelease.value);
 const src=upgrade.value[0],source=timed(()=>sourceDetails(s,src.caskId));assert.equal(source.value.stopAt,src.stopAt);assert.equal(source.value.manualSource.caskId,src.caskId);
 assert.equal(JSON.stringify(s),before);assert.equal(JSON.stringify(s.recipeBook),book);assert.equal(JSON.stringify(s.generations),generation);
 console.error(JSON.stringify({label,phase:'targeted-reads-done',restoreMs:restore.ms,releasePairMs:initialRelease.ms,casksMs:initialCasks.ms}));
 const old=timed(()=>buildComparisonData(s));
 const checked=[];
 for(const view of [...initialCasks.value,initialRelease.value.current,initialRelease.value.previous,changeRelease.value.current,changeRelease.value.previous]){
  const full=old.value.items.find(x=>x.key===view.key);assert(full,view.key);
  const fields=view.kind==='cask'?['caskId','batchId','filledMonth','stopAt','type','age','profile','litres']:['brandId','releaseId','productId','caskId','batchId','filledMonth','stopAt','type','age','profile','bottledMonth','bottles','stock','status','currentPrice','listedMonth','retailActiveMonths','firstSaleMonth','lastSaleMonth','retailPriceTotals','retail','shops','salesComplete'];
  for(const k of fields)equal(view[k],full[k]);
  // Initial-price entries and each observed change compare independently of tier,
  // which the compact reader intentionally does not need for rendering.
  if(view.kind==='release')equal(view.priceChanges,full.priceChanges.map(({tier,...rest})=>rest));
  checked.push(view.key);
 }
 assert.equal(JSON.stringify(s),before);
 const result={label,months:s.core.month,sourceSha256:hash(raw),version:s.version,completedGenerations:s.generations.completed.length,activeGeneration:s.generations.active.id,operations:s.operations.length,releases:s.releases.length,casks:s.core.casks.length,recipes:s.recipeBook.entries.length,sourceRetainedAfterPruning:!s.core.archive.some(c=>c.id===src.caskId)&&!s.records.some(r=>r.caskId===src.caskId),sourceDetails:source.value,selectedReleaseIds:{current:current.id,previous:previousRelease(s,current.id).id,changed:earlier.id},timingsMs:{strictColdRestoreIncludingReceipts:restore.ms,recipeUpgradeSaveSelection:upgrade.ms,initialCasks:initialCasks.ms,changeCaskPartner:changeCask.ms,reopenCasks:reopenCasks.ms,initialReleasePair:initialRelease.ms,changeReleasePair:changeRelease.ms,reopenReleasePair:reopenRelease.ms,sourceDetails:source.ms,oldFullProjection:old.ms},checks:{targetedEqualsFullProjection:checked,sourceStopEqualsActualManualFill:true,readOnlyRawStateUnchanged:true,recipeBookUnchanged:true,generationUnchanged:true,sameBrandImmediatePrevious:true},releasePair:initialRelease.value};
 process.stdout.write(JSON.stringify(result));
}
async function main(){
 const out=process.env.AMBER_OUT?resolve(process.env.AMBER_OUT):fileURLToPath(new URL('../design/nearby-comparison/',import.meta.url));fs.mkdirSync(out,{recursive:true});
 const temp=fs.mkdtempSync(join(os.tmpdir(),'amber-nearby-'));
 let longPath=process.env.AMBER_NEARBY_SAVE??'/tmp/ambertime-generations/1.json',sourceMode;
 if(fs.existsSync(longPath)){const raw=fs.readFileSync(longPath,'utf8'),prior=JSON.parse(fs.readFileSync(new URL('../design/generations/long-results.json',import.meta.url))).runs.find(r=>r.seed===1);assert.equal(hash(raw),prior.stateSha256);sourceMode='previously observed actual public v16 seed1 1440-month play; exact hash matches committed generation evidence';}
 else{longPath=join(temp,'120year.json');fs.writeFileSync(longPath,D.serializeDistillery(buildGenerationGame(1440,{seed:1})));sourceMode='fresh actual public v16 seed1 1440-month play';}
 const generation=buildGenerationGame(312,{seed:1});assert.equal(generation.generations.completed.length,1);const generationPath=join(temp,'generation.json');fs.writeFileSync(generationPath,D.serializeDistillery(generation));
 const runs=[];for(const [label,path]of [['one-generation',generationPath],['120-year',longPath]]){console.error(JSON.stringify({phase:'start',label}));runs.push(JSON.parse(execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--child',path,label],{maxBuffer:16e6})));}
 const result={method:{scope:'Public-operation one completed generation (312 months), and exact previously observed 120-year v16 estate. Each fixture strictly cold-restored in its own process including transient receipt capture, then upgraded via public recipe-book operations. Targeted comparisons occur after required validation, with no second operation replay. No persistent game field is added.',sourceMode,seed:1,node:process.version,base:'0e0a526b2f03efc392243810c41031320665cf4c',timing:'Node read-model wall times on shared machine, not browser paint, iPhone timings, or guarantees. Initial, partner change, and reopen measured separately. Old full projection measured once per fixture only as a factual oracle and previous-cost comparison.',limits:'One seed / one deterministic manufacturing policy. Physical Safari and subjective readability are outside this script.'},sourceHashes:Object.fromEntries(['partner-orders.mjs','nearby-comparison.mjs'].map(f=>[f,hash(fs.readFileSync(new URL('../'+f,import.meta.url)))])),runs};
 fs.writeFileSync(join(out,'performance-results.json'),JSON.stringify(result,null,2)+'\n');
 const columns=['strictColdRestoreIncludingReceipts','initialCasks','changeCaskPartner','reopenCasks','initialReleasePair','changeReleasePair','reopenReleasePair','oldFullProjection'];
 const md=['# 身近な比較の読み取り性能','','`node works/ambertime/tests/nearby-simulate.mjs`。既存120年保存がない場合は同じ公開操作方針で再生成する。`AMBER_NEARBY_SAVE`で既存のseed1・1440か月保存を指定できる（既存検証ハッシュと照合）。','','共有マシン上のNode読み取り処理時間。ブラウザ描画時間・実機iPhoneの操作時間ではない。コールド保存検証は比較表示の時間と分けた。','','| 処理（ms） | 一代分（312か月） | 120年（1440か月） |','| --- | ---: | ---: |',...columns.map(k=>`| ${k} | ${runs[0].timingsMs[k]} | ${runs[1].timingsMs[k]} |`),'','各対象について従来の全履歴投影と、抽出・樽・風味・在庫・自家販売本数・実売価格・実際の販売期間・店舗納品を照合。同じ銘柄の直前発売であること、読み取り前後のゲーム状態・製法・世代記録の一致、通常の短期記録から外れた仕込みへの参照を確認した。','','初回の厳密な保存検証では操作履歴を再実行し、その同じ検証中に一時的な実績コンテキストを作る。検証後の樽比較・発売回比較はその対象だけを読み、全履歴を再構成しない。保存形式・判定の厳密さは維持している。','','一つの製造方針・seedの観測結果。全戦略の保証や実機Safariの確認ではない。'].join('\n');fs.writeFileSync(join(out,'performance-notes.md'),md+'\n');console.log(JSON.stringify(result,null,2));
}
if(process.argv[2]==='--child')child(process.argv[3],process.argv[4]);else if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))await main();
