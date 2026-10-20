// Finite rule comparisons. These policies are probes, not recommended recipes or human choices.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as L from './model.mjs';
import * as D from '../../partner-orders.mjs';
import * as M from '../../model.mjs';
import * as E from '../../economy.mjs';
const seeds=[20261020,42],months=36,policies=['early6','wait36','cashAware24','autumnStock'];
const round=n=>Math.round(n*100)/100,clone=structuredClone;
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const baseline='6f6f0f35105c34b5aefffefdd0b73d678e60b401';
function snapshot(s){const v=L.view(s);return {month:v.month,cash:v.cash,slots:v.freeSlots,reserve:v.reserve,upkeep:v.upkeep,season:v.season.id,casks:v.casks.map(c=>({id:c.id,serial:c.serial,age:c.age,roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres,bottles:c.bottles})),products:v.products.map(p=>({id:p.id,sourceId:p.sourceId,age:p.age,stock:p.stock,sold:p.sold,price:p.price,listed:p.listed})),totals:clone(s.game.core.totals)};}
function addStock(s,id,count,reason,listed){
 const before=L.view(s),c=before.casks.find(c=>c.id===id),q=L.quote(s,id,count);if(!q.ok)return {s,event:null};
 s=L.bottle(s,id,count,{why:reason,wait:'fixed analysis rule, not a human decision',next:''});const p=s.game.core.products.at(-1);if(listed)s=L.setListed(s,p.id,true);
 return {s,event:{month:before.month,serial:c.serial,age:c.age,count:q.count,reason,listed,season:before.season.id,cashBefore:before.cash,cashAfter:L.view(s).cash,slotsBefore:before.freeSlots,slotsAfter:L.view(s).freeSlots,productId:p.id,productAge:p.age,price:p.price}};
}
function recover(s){
 const before=snapshot(s),v=L.view(s);
 for(const p of v.products.filter(p=>!p.listed)){const listed=L.setListed(s,p.id,true),next=L.advance(listed,1);if(next.elapsed>s.elapsed)return {possible:true,action:'list stored product',productId:p.id,before,after:snapshot(next)};}
 for(const c of [...v.casks].sort((a,b)=>b.age-a.age)){
  const q=L.quote(s,c.id,Math.min(5,c.bottles));if(!q.ok)continue;
  const attempt=addStock(s,c.id,q.count,'separate recovery counterfactual',true),next=L.advance(attempt.s,1);
  if(next.elapsed>s.elapsed)return {possible:true,action:'bottle a small lot and list for next-month sale',serial:c.serial,count:q.count,before,after:snapshot(next)};
 }
 return {possible:false,before,reason:'No tested list-or-five-bottle recovery advanced time. This is not proof that every possible action fails.'};
}
function run(seed,fixture,condition,policy){
 let s=L.createSession({seed,fixture,condition}),initial=snapshot(s),events=[],cashPath=[initial.cash],startEvents=[],monthly=[],stalled=null;
 // All rules can open at most one new batch per elapsed month, using the same 66/refill.
 for(let turn=0;turn<months&&s.elapsed<months;turn++){
  let v=L.view(s);
  for(const p of v.products)if(!p.listed&&(policy!=='autumnStock'||v.season.id==='winter'))s=L.setListed(s,p.id,true);
  v=L.view(s);const oldest=[...v.casks].sort((a,b)=>b.age-a.age||a.id-b.id)[0];
  if(oldest){
   const runway=v.upkeep?(v.cash-v.reserve)/v.upkeep:Infinity;
   const should=policy==='early6'?oldest.age>=6:policy==='wait36'?oldest.age>=36:policy==='cashAware24'?oldest.age>=24||runway<3:oldest.age>=12&&['autumn','winter'].includes(v.season.id);
   if(should){const full=L.quote(s,oldest.id),q=full.ok?full:L.quote(s,oldest.id,Math.min(5,oldest.bottles));const reason=policy==='cashAware24'&&runway<3?'cash minus bottling reserve below three maintenance months':policy;
    if(q.ok){const r=addStock(s,oldest.id,q.count,reason,policy!=='autumnStock'||v.season.id==='winter');s=r.s;events.push(r.event);cashPath.push(L.view(s).cash);}}
  }
  const startCheck=L.canStart(s,{stop:66,type:'refill'});
  if(startCheck.ok){const before=L.view(s);s=L.start(s,{stop:66,type:'refill'});startEvents.push({month:before.month,cashBefore:before.cash,cashAfter:L.view(s).cash,slotsBefore:before.freeSlots,slotsAfter:L.view(s).freeSlots});cashPath.push(L.view(s).cash);}
  const before=s.elapsed,next=L.advance(s,1);
  if(next.elapsed===before){stalled={attempt:turn,elapsed:before,notice:next.notice,unadvancedBudget:months-before,recovery:recover(next)};s=next;break;}
  s=next;const v2=L.view(s),m=v2.lastMonth;monthly.push({month:v2.month,cash:v2.cash,revenue:m.revenue,upkeep:m.upkeep,bottles:m.bottles,slots:v2.freeSlots,season:v2.season.id});cashPath.push(v2.cash);
 }
 const final=snapshot(s),delta={revenue:round(final.totals.revenue-initial.totals.revenue),productionAndBottling:round(final.totals.costs-initial.totals.costs),maintenance:round(final.totals.upkeep-initial.totals.upkeep),bottlesSold:final.totals.bottlesSold-initial.totals.bottlesSold};
 assert.equal(round(initial.cash+delta.revenue-delta.productionAndBottling-delta.maintenance),final.cash);
 const firstSaleDelay=events.map(e=>{const h=s.history.find(h=>h.kind==='month'&&h.month>e.month&&h.sales?.some(x=>x.id===e.productId&&x.sold>0));return h?h.month-e.month:null;});
 return {seed,fixture,condition,policy,elapsed:final.month,initialCash:initial.cash,finalCash:final.cash,cashChange:round(final.cash-initial.cash),minimumCash:Math.min(...cashPath),maximumCash:Math.max(...cashPath),ledger:delta,initialCaskCount:initial.casks.length,finalCaskCount:final.casks.length,finalStock:final.products.reduce((n,p)=>n+p.stock,0),newBatches:startEvents.length,bottlingEvents:events,firstSaleDelay,slotReleaseCount:events.filter(e=>e.slotsAfter>e.slotsBefore).length,terminalStall:stalled,monthly:(seed===20261020&&fixture==='lean'&&condition==='combined')?monthly:undefined};
}
const runs=[];for(const seed of seeds)for(const f of L.FIXTURES)for(const c of L.CONDITIONS)for(const policy of policies)runs.push(run(seed,f.id,c.id,policy));
const pairedInitial=L.FIXTURES.flatMap(f=>seeds.map(seed=>{const states=L.CONDITIONS.map(c=>L.createSession({seed,fixture:f.id,condition:c.id}));const ref=states[0].game.core;return {seed,fixture:f.id,identicalCore:states.every(s=>JSON.stringify(s.game.core)===JSON.stringify(ref)),cash:ref.cash,ages:ref.casks.map(c=>c.age)};}));assert(pairedInitial.every(x=>x.identicalCore));
const aggregates=L.CONDITIONS.flatMap(c=>policies.map(policy=>{const rs=runs.filter(r=>r.condition===c.id&&r.policy===policy);return {condition:c.id,policy,runs:rs.length,completed36:rs.filter(r=>r.elapsed===months).length,stalled:rs.filter(r=>r.terminalStall).length,recoverableByTestedAction:rs.filter(r=>r.terminalStall?.recovery.possible).length,averageCashChange:round(rs.reduce((n,r)=>n+r.cashChange,0)/rs.length),averageBatches:round(rs.reduce((n,r)=>n+r.newBatches,0)/rs.length),averageBottleAge:round(rs.flatMap(r=>r.bottlingEvents).reduce((n,e)=>n+e.age,0)/Math.max(1,rs.flatMap(r=>r.bottlingEvents).length)),averageUpkeep:round(rs.reduce((n,r)=>n+r.ledger.maintenance,0)/rs.length)};}));
function raw(seed,stop,type,age){let g=D.startDistillation(D.newStaffDistillery(seed));while(g.still.distillation.progress<stop)g=D.distillStep(g);g=D.fillBarrel(D.stopDistillation(g),type);let c=g.core.casks[0];for(let n=0;n<age;n++)c=M.ageCask(c);return c;}
const flavorTrajectories=[];for(const type of ['bourbon','refill'])for(const stop of [30,66,99])flavorTrajectories.push({type,stop,points:[0,6,12,24,36,48,72,96,120].map(age=>{const c=raw(seeds[0],stop,type,age);return {age,roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres,bottles:Math.floor((c.litres+1e-9)/.7)};})});
function neutralize(game){game.tastingId=null;game.decisions=[];for(const n of Object.values(game.notesById)){n.phase='watching';n.view='watching';n.pending=null;n.targetAge=null;}}
// Same valid calendar/game snapshot and frozen products; counterfactual season maps only.
let stocked=L.createSession({seed:seeds[0],fixture:'mixed',condition:'season'});for(const c of [...L.view(stocked).casks])stocked=addStock(stocked,c.id,30,'isolated seasonal demand',true).s;
const isolatedSeasons=[];
for(const targetMonth of [0,3,6,9]){
 const snap=clone(stocked),projection=clone(stocked);projection.game.core.month=36+targetMonth;const q=L.season(projection);neutralize(snap.game);
 const taste=E.economicMonthly(clone(snap.game),snap.game.core.month,L.retailFactors(projection));
 const uniform=E.economicMonthly(clone(snap.game),snap.game.core.month,new Map(snap.game.core.products.map(p=>[p.id,q.base])));
 const none=E.economicMonthly(clone(snap.game),snap.game.core.month,null);
 for(const p of taste.core.products){const old=snap.game.core.products.find(x=>x.id===p.id);for(const key of ['age','roughness','character','wood','price'])assert.equal(p[key],old[key]);}
 isolatedSeasons.push({season:q.id,baseFactor:q.base,productIds:snap.game.core.products.map(p=>p.id),profileFactors:[...L.retailFactors(projection).values()],noSeason:{bottles:none.core.lastMonth.bottles,revenue:none.core.lastMonth.revenue,sales:none.core.lastMonth.sales},uniformSeason:{bottles:uniform.core.lastMonth.bottles,revenue:uniform.core.lastMonth.revenue,sales:uniform.core.lastMonth.sales},withTaste:{bottles:taste.core.lastMonth.bottles,revenue:taste.core.lastMonth.revenue,sales:taste.core.lastMonth.sales}});
}
const prestockCounterfactuals=[];
for(const condition of L.CONDITIONS.map(c=>c.id))for(const countMode of ['same20','full']){
 const autumn=L.advance(L.createSession({seed:seeds[0],fixture:'mixed',condition}),8);assert.equal(L.season(autumn).id,'autumn');const chosen=[...L.view(autumn).casks].sort((a,b)=>b.age-a.age)[0];
 const a=addStock(autumn,chosen.id,countMode==='same20'?20:null,'autumn preparation held unlisted',false),winterA=L.advance(a.s,3),winterB=L.advance(autumn,3),b=addStock(winterB,chosen.id,countMode==='same20'?20:null,'wait in barrel until winter',false);
 const aid=a.s.game.core.products.at(-1).id,bid=b.s.game.core.products.at(-1).id,A=L.advance(L.setListed(winterA,aid,true),1),B=L.advance(L.setListed(b.s,bid,true),1),pa=A.game.core.products.find(p=>p.id===aid),pb=B.game.core.products.find(p=>p.id===bid);
 prestockCounterfactuals.push({condition,countMode,sharedAutumn:{month:autumn.elapsed,cash:L.view(autumn).cash,serial:chosen.serial,age:chosen.age},preparedAutumn:{bottle:a.event,firstWinterEnd:snapshot(A),product:{age:pa.age,roughness:pa.roughness,character:pa.character,wood:pa.wood,price:pa.price,sold:pa.sold,stock:pa.stock}},waitUntilWinter:{bottle:b.event,firstWinterEnd:snapshot(B),product:{age:pb.age,roughness:pb.roughness,character:pb.character,wood:pb.wood,price:pb.price,sold:pb.sold,stock:pb.stock}},cashDifferencePreparedMinusWait:round(L.view(A).cash-L.view(B).cash)});
}
function focusedRecovery(){
 const records=[];
 for(const seed of [20261020,42])for(const condition of ['finance','combined']){
  let s=L.advance(L.createSession({seed,fixture:'lean',condition}),12);const stalled=L.view(s),events=[];
  const oldest=()=>[...L.view(s).casks].sort((a,b)=>b.age-a.age)[0];
  const supply=count=>{const c=oldest(),q=L.quote(s,c.id,count);if(!q.ok)return false;const before=L.view(s);s=L.bottle(s,c.id,count,{why:'focused recovery counterfactual'});const p=s.game.core.products.at(-1);s=L.setListed(s,p.id,true);events.push({action:'bottle/list',month:s.elapsed,serial:c.serial,age:c.age,count:q.count,cost:q.cost,cashBefore:before.cash,cashAfter:L.view(s).cash});return true;};
  supply(Math.min(5,oldest().bottles));s=L.advance(s,1);const afterSmall={month:s.elapsed,cash:L.view(s).cash,canStart:L.canStart(s).ok};
  if(!L.canStart(s).ok)supply(null);
  let steps=0;while(!L.canStart(s).ok&&steps++<6){const before=s.elapsed;s=L.advance(s,1);if(s.elapsed===before)break;}
  const check=L.canStart(s);let started=false;if(check.ok){s=L.start(s,{stop:66,type:'refill'});started=true;}
  records.push({seed,condition,stoppedAt:stalled.month,notice:stalled.notice,afterSmall,events,nextBatchStarted:started,monthsUntilNextBatch:s.elapsed-stalled.month,finalMonth:s.elapsed,finalCash:L.view(s).cash,finalCasks:L.view(s).casks.length});
 }
 return records;
}
const results={focusedRecovery:focusedRecovery(),version:'ambertime-decision-analysis/0.1',baseline,conditions:L.CONDITIONS,fixtures:L.FIXTURES,seeds,months,policyDefinitions:{early6:'Bottle oldest cask if age>=6, list immediately.',wait36:'Bottle oldest cask if age>=36, list immediately; does not override rule on funds stop.',cashAware24:'Bottle oldest cask if age>=24 OR cash minus all bottling reserves is less than3 maintenance months; list immediately.',autumnStock:'Bottle oldest cask age>=12 during autumn or winter; store unlisted in autumn and list at first winter decision. Does not override rule on funds stop.',common:'At most one bottling per elapsed-month decision, then open at most one66/refill batch if canStart. If full bottling cannot be paid, try5 bottles. No price optimization. Each run ends at36 elapsed months or first blocked month; this is a policy stall, not automatically a game softlock.'},pairedInitial,aggregates,runs,flavorTrajectories,isolatedSeasons,prestockCounterfactuals,limits:['Prepared fixtures provide starting assets; their creation costs are not subtracted. Same fixture core is identical across conditions, but fixtures have different assets/capital.','Four fixed policies are finite probes, not optimal or human policies. Cash change includes liquidation of provided starting stock; it is not proof of sustainable profit.','36-month horizon can leave unsold products and younger assets, so final cash alone cannot rank policies.','No flavor score, contest, price prediction or seasonal bonus on bottling. Season modifies actual later retail wishes under shared customer cap24.','Stored bottles preserve taste. Their label age is age at bottling, not calendar age of bottle.','Fund guard rejects a whole monthly transaction. Blocked attempts do not age or pay another month. Recovery counterfactuals try listing stock or5bottle lots only.','Autumn counterfactuals share a snapshot but bottling at different dates changes profile, count and fees; same20 mode isolates equal count but cask slot remains occupied.','Winter can have the highest raw demand; cap, rounding, carry cost and timing mean this does not establish a universal bottling date.','Real market seasonality, human bottling motives, subjective enjoyment and main long-term economy are not verified.']};
// Outcomes checkpoint prevents recomputing the whole grid for representation-only edits.
fs.writeFileSync('/tmp/ambertime-decision-analysis-full.json',JSON.stringify(results));
// Keep complete scalar ledgers and bounded trace samples, not thousands of copied states.
const brief=state=>({month:state.month,cash:state.cash,slots:state.slots,reserve:state.reserve,upkeep:state.upkeep,season:state.season,caskCount:state.casks.length,inventoryBottles:state.products.reduce((n,p)=>n+p.stock,0)});
results.selectedTraces=results.runs.filter(r=>r.seed===20261020&&r.fixture==='lean'&&r.condition==='combined').map(r=>({policy:r.policy,monthly:r.monthly.filter((m,i,a)=>i<2||i>=a.length-2||m.month%6===0),bottlings:r.bottlingEvents.length<=5?r.bottlingEvents:{count:r.bottlingEvents.length,first:r.bottlingEvents.slice(0,3),last:r.bottlingEvents.slice(-2)}}));
results.runs=results.runs.map(({bottlingEvents,firstSaleDelay,monthly,terminalStall,...r})=>({...r,bottlingCount:bottlingEvents.length,bottlingSample:(bottlingEvents.length<=2?bottlingEvents:[bottlingEvents[0],bottlingEvents.at(-1)]).map(e=>[e.month,e.age,e.count,e.cashBefore,e.cashAfter,e.slotsBefore,e.slotsAfter]),salesDelay:[firstSaleDelay.filter(n=>n!==null).length,firstSaleDelay.filter(n=>n===null).length,Math.min(...firstSaleDelay.filter(n=>n!==null)),Math.max(...firstSaleDelay.filter(n=>n!==null))],terminalStall:terminalStall?{...terminalStall,recovery:{...terminalStall.recovery,before:brief(terminalStall.recovery.before),...(terminalStall.recovery.after?{after:brief(terminalStall.recovery.after)}:{})}}:null}));
for(const c of results.prestockCounterfactuals){c.preparedAutumn.firstWinterEnd=brief(c.preparedAutumn.firstWinterEnd);c.waitUntilWinter.firstWinterEnd=brief(c.waitUntilWinter.firstWinterEnd);}
results.bottlingSampleColumns=['month','age','count','cashBefore','cashAfter','slotsBefore','slotsAfter'];results.salesDelayColumns=['observed','notObserved','minMonths','maxMonths'];
const text=JSON.stringify(results);assert(Buffer.byteLength(text)<100000,'Result representation exceeds finite artifact budget');
fs.writeFileSync(new URL('./results.json',import.meta.url),text+'\n');
console.log(JSON.stringify({runs:runs.length,bytes:Buffer.byteLength(text),aggregates,stalls:runs.filter(r=>r.terminalStall).map(r=>({seed:r.seed,fixture:r.fixture,condition:r.condition,policy:r.policy,elapsed:r.elapsed,recoverable:r.terminalStall.recovery.possible})),isolatedSeasons:isolatedSeasons.map(r=>({season:r.season,none:r.noSeason.bottles,uniform:r.uniformSeason.bottles,taste:r.withTaste.bottles,allocation:r.withTaste.sales.map(x=>x.sold)})),prestock:prestockCounterfactuals.map(r=>({condition:r.condition,mode:r.countMode,cashDifference:r.cashDifferencePreparedMinusWait}))},null,2));
