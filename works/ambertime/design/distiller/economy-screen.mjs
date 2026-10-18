import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as D from '../../partner-orders.mjs';
const rows=[];
function run(seed,policy){let s=D.newRecipeDistillery(seed),fills=0,delegated=0,minimum=1600,checkpoints=[],cashEvents=[],starts=[],forcedEarly=0;const ages=new Map();
function bottle(c){s=D.bottleBranded(s,c.id,s.brands.length?{brandId:1}:{name:'収支検証'});s=D.setSalePrice(s,'standard',s.result.productId);s=D.listBottles(s,s.result.productId);}
function resolve(){for(let guard=0;guard<60;guard++){
if(s.trade.offer){s=D.declineOffer(s);continue;}
if(s.decisions.length){const d=s.decisions[0],c=D.currentCask(s,d.caskId);if(c.age>=ages.get(c.id)||d.eventId==='funds'){if(d.eventId==='funds'&&c.age<ages.get(c.id))forcedEarly++;bottle(c);continue;}const o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');assert(o);s=D.chooseDistillery(s,c.id,o.id);continue;}
const g=D.generationStatus(s);if(g.needsNotice){s=D.noticeGeneration(s,g.id);continue;}if(g.phase==='review'){s=D.handoverGeneration(s,g.id);continue;}
const due=s.core.casks.find(c=>c.age>=ages.get(c.id));if(due){bottle(due);continue;}return;}throw Error('policy');}
for(let tick=0;tick<360*60;tick++){
resolve();let g=D.generationStatus(s);const target=s.core.month<36?2:4;
if(s.still.phase==='ready'&&s.core.casks.length<target){const auto=policy!=='manual'&&fills>0&&g.phase==='working';if(auto){if(!s.usual.reservation)s=D.reserveUsual(s);if(D.canBeginUsual(s).ok){s=D.beginUsual(s);starts.push({month:s.core.month,cash:s.core.cash,minimum:D.canBeginUsual(s).minimum});delegated++;}}
else if(D.canStart(s).ok)s=D.startDistillation(s);}
if(s.still.phase==='distilling'){const active=s.usual.reservation?.status==='active';s=D.distillStep(s);if(!active&&s.still.distillation.progress===65)s=D.fillBarrel(D.stopDistillation(s),'refill');if(s.still.phase==='ready'){fills++;const c=s.core.casks.at(-1);ages.set(c.id,s.core.month<36?6:(policy==='long-aging'?[12,24,36,48][(fills-1)%4]:12));}}
minimum=Math.min(minimum,s.core.cash);
cashEvents.push({cash:s.core.cash,jobs:delegated,canHire:fills>0,month:s.core.month});
if((tick+1)%60===0){resolve();const month=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,month+1);minimum=Math.min(minimum,s.core.cash);checkpoints.push({month:s.core.month,cash:s.core.cash,jobs:delegated});cashEvents.push({cash:s.core.cash,jobs:delegated,canHire:fills>0,month:s.core.month});}}
resolve();return{seed,policy,months:s.core.month,fills,delegated,forcedEarly,cash:s.core.cash,minCash:minimum,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,bottlesSold:s.core.totals.bottlesSold,stock:s.core.products.reduce((n,p)=>n+p.stock,0),generations:s.generations.completed.length,checkpoints,starts,cashEvents};}
for(const seed of [1,42])for(const policy of ['manual','delegated','long-aging']){const r=run(seed,policy);const events=r.cashEvents;delete r.cashEvents;r.costCandidates=[];if(policy!=='manual'){for(const hire of [20,40,80])for(const perJob of [8,12,24])r.costCandidates.push({hire,perJob,total:hire+r.delegated*perJob,endCash:r.cash-hire-r.delegated*perJob,minCash:Math.min(...events.map(x=>x.cash-(x.canHire?hire:0)-x.jobs*perJob))});for(const monthly of [1,4])r.costCandidates.push({hire:40,monthly,total:40+360*monthly,endCash:r.cash-40-360*monthly,minCash:Math.min(...events.map(x=>x.cash-(x.canHire?40+x.month*monthly:0)))});}rows.push(r);console.error(JSON.stringify({...r,checkpoints:undefined,starts:undefined}));fs.writeFileSync(new URL('./economy-screen.json',import.meta.url),JSON.stringify({method:'Actual current public operations,360months; proposed costs are shadow ledgers only, do not enforce budget or change production timings. Need final fee-enforced run.',runs:rows},null,2));}
const candidates=rows.flatMap(r=>r.costCandidates.map(x=>({seed:r.seed,policy:r.policy,...x})));fs.writeFileSync(new URL('./economy-candidates.json',import.meta.url),JSON.stringify(candidates,null,2));
const keys=['seed','policy','hire','perJob','monthly','total','endCash','minCash'];fs.writeFileSync(new URL('./economy-candidates.csv',import.meta.url),keys.join(',')+'\n'+candidates.map(r=>keys.map(k=>r[k]??'').join(',')).join('\n')+'\n');
