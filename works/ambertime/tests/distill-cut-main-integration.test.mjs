import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {DistillLearning} from '../distill-learning.mjs';
import {distillToolsView} from '../distill-tools-view.mjs';
import {distillationReadout} from '../spirit-view.mjs';
const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const baseline=JSON.parse(fs.readFileSync(new URL('../design/cut-main/model-baseline.json',import.meta.url)));
const digest=raw=>createHash('sha256').update(raw).digest('hex');
const step=(s,p)=>{while(s.still.distillation.progress<p)s=D.distillStep(s);return s;};
function extract(name){const start=source.indexOf('function '+name+'(');assert(start>=0,name);let depth=0,quote=null,escape=false;for(let i=source.indexOf('{',start);i<source.length;i++){const c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}if(c==="'"||c==='\"'||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);}throw Error(name);}
function memory(){let raw=null;return {getItem(){return raw;},setItem(k,v){raw=v;}};}
function host({saveSucceeds=true,preview=false}={}){
 const learning=new DistillLearning({storage:memory(),enabled:!preview}),ctx={D,distillLearning:learning,distillToolsView,distillationReadout,document:{hidden:false},T:{minimumStop:30},stopClock(){},message(){},manualCards:s=>s.labConnection.cards};
 vm.createContext(ctx);vm.runInContext(`let game=D.selectFlavorCards(D.newMarketRulesDistillery(42),{malt:'plain',ferment:'short'}),room='distill',modal=null,userPaused=false,distillPrepared=true,preparedForDistillation=game.core.lastDistillation,canSave=true,preview=${preview},shownFillSpiritId=null,saveSucceeds=${saveSucceeds},actCalls=0,pendingCountdown=null;
 const countdown={active:false,start(fn){this.active=true;pendingCountdown=fn;},cancel(){this.active=false;}};
 function act(fn,after,afterSave){actCalls++;game=fn(game);if(after)after();if(saveSucceeds&&afterSave)afterSave();}
 ${['distillBatchKey','prepareDistillation','finishDistillation','currentDistillTools','startFromLever'].map(extract).join('\n')}
 globalThis.api={startFromLever,finishDistillation,key:distillBatchKey,tools:currentDistillTools,game:()=>game,calls:()=>actCalls,runCountdown(){const fn=pendingCountdown;pendingCountdown=null;countdown.active=false;if(fn)fn();},cancelCountdown(){pendingCountdown=null;countdown.active=false;},stepTo(n){while(game.still.distillation.progress<n)game=D.distillStep(game);},setGame(s){game=s;},setSave(ok){saveSucceeds=ok;},setAutomatic(){game.usual.reservation={status:'active'};}};`,ctx);
 return {api:ctx.api,learning};
}
test('formal model and supporting rule modules remain byte-identical to the pinned main',()=>{
 assert.equal(baseline.base,'c927acf16128e0bd4b8096596221c70f9ed69355');assert(baseline.formalSources.length>40);
 for(const r of baseline.formalSources)assert.equal(digest(fs.readFileSync(new URL('../../../'+r.path,import.meta.url))),r.sha256,r.path);
});
test('four same native cut sequences retain all twenty old state and cold-save bytes',()=>{
 assert.equal(baseline.cases.length,20);
 for(const {start,end,malt} of baseline.cases.filter(x=>x.tag==='before')){
  const rows=baseline.cases.filter(x=>x.start===start&&x.end===end&&x.malt===malt),match=(s,tag)=>{const row=rows.find(x=>x.tag===tag),raw=D.serializeDistillery(s);assert.equal(digest(raw),row.sha256,`${start}→${end} ${tag}`);assert.equal(raw,row.raw);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);};
  let s=D.selectFlavorCards(D.newMarketRulesDistillery(42),{malt,ferment:'short'});s=D.startRangeDistillation(s);match(s,'before');s=D.beginCollection(step(s,start));match(s,'collect-start');s=D.stopDistillation(step(s,end));match(s,'finished');s=D.fillBarrel(s,'refill');match(s,'filled');s=D.bottleBranded(s,s.core.casks.at(-1).id,{});match(s,'bottled');
 }
});
test('host counts only the saved start and saved same-batch completion, never collection start',()=>{
 const {api,learning}=host();api.startFromLever();assert.equal(api.calls(),0);assert.equal(learning.completedRuns,0);api.runCountdown();const key=api.key();assert.equal(learning.completedRuns,0);assert.equal(api.game().still.phase,'distilling');api.finishDistillation();assert.equal(learning.completedRuns,0);api.stepTo(12);api.finishDistillation();assert.equal(api.game().still.phase,'filling');assert.equal(api.key(),key);assert.equal(learning.completedRuns,1);api.finishDistillation();assert.equal(learning.completedRuns,1);
});
test('failed formal save and cancelled countdown do not advance independent learning',()=>{
 const failed=host({saveSucceeds:false});failed.api.startFromLever();failed.api.runCountdown();failed.api.setSave(true);failed.api.finishDistillation();failed.api.stepTo(12);failed.api.finishDistillation();assert.equal(failed.learning.completedRuns,0,'failed start save did not arm a completion');
 const stopFailed=host();stopFailed.api.startFromLever();stopFailed.api.runCountdown();stopFailed.api.finishDistillation();stopFailed.api.stepTo(12);stopFailed.api.setSave(false);stopFailed.api.finishDistillation();assert.equal(stopFailed.learning.completedRuns,0,'failed result save did not count');
 const cancelled=host();cancelled.api.startFromLever();cancelled.api.cancelCountdown();cancelled.api.runCountdown();assert.equal(cancelled.api.calls(),0);assert.equal(cancelled.learning.completedRuns,0);
});
test('preview performs the native operation without persisting or advancing real experience',()=>{
 const {api,learning}=host({preview:true});api.startFromLever();api.runCountdown();api.finishDistillation();api.stepTo(12);api.finishDistillation();assert.equal(api.game().still.phase,'filling');assert.equal(learning.completedRuns,0);
});
test('foreign batch completion and automatic lever state cannot count a pending manual batch',()=>{
 const {api,learning}=host();api.startFromLever();api.runCountdown();const original=api.key();let other=D.startRangeDistillation(D.newMarketRulesDistillery(43));other=D.beginCollection(other);api.setGame(step(other,12));assert.notEqual(api.key(),original);api.finishDistillation();assert.equal(learning.completedRuns,0);
 const automatic=host();automatic.api.setAutomatic();assert.equal(automatic.api.tools().leverEnabled,false);automatic.api.startFromLever();automatic.api.runCountdown();assert.equal(automatic.api.calls(),0);assert.equal(automatic.learning.completedRuns,0);
});
test('presentation and learning reads do not mutate formal game or serialized bytes',()=>{
 const {api,learning}=host();api.startFromLever();api.runCountdown();api.finishDistillation();api.stepTo(6);const before=D.serializeDistillery(api.game());for(let n=0;n<10;n++){api.tools();api.key();learning.completedRuns;}assert.equal(D.serializeDistillery(api.game()),before);assert.equal(Object.hasOwn(api.game(),'completedRuns'),false);assert.equal(before.includes('completedKeys'),false);assert.equal(before.includes('distill-learning'),false);
});
test('host catches localStorage property denial and never touches storage in preview',()=>{
 const fn=extract('distillLearningStorage');for(const preview of [false,true]){let reads=0;const ctx={preview};Object.defineProperty(ctx,'localStorage',{get(){reads++;throw Error('denied getter');}});vm.createContext(ctx);vm.runInContext(fn+';globalThis.read=distillLearningStorage;',ctx);assert.equal(ctx.read(),null);assert.equal(reads,preview?0:1);}
});
