import {AXES} from '../v011/model.mjs';
export const POLICIES={support:'強い支持を覚える',impression:'正負の印象を覚える',repeat:'繰り返しを覚える'};
const mean=a=>a.length?a.reduce((a,b)=>a+b,0)/a.length:0,decay=(months,half)=>2**(-Math.max(0,months)/half);
export const similarity=(a,b)=>Math.exp(-4*(.85*mean(AXES.map(k=>Math.abs(a.profile[k]-b.profile[k])))+.15*Math.abs(Math.log1p(a.years)-Math.log1p(b.years))/Math.log(21)));
const key=p=>JSON.stringify([p.recipe.malt,p.recipe.ferment,p.recipe.start,p.recipe.end,p.recipe.cask,p.years]);
function facts(record){const e=record.evaluations,positive=e.filter(x=>['like','strong'].includes(x.verdict)),negative=e.filter(x=>['neutral','miss'].includes(x.verdict));const votes=(people,field)=>AXES.map(axis=>({axis,count:people.filter(p=>p[field].includes(axis)).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count||AXES.indexOf(a.axis)-AXES.indexOf(b.axis));return {sold:e.length,supportCount:positive.length,strongCount:e.filter(x=>x.verdict==='strong').length,missCount:e.filter(x=>x.verdict==='miss').length,positiveImpression:mean(e.map(x=>x.positiveImpression)),negativeImpression:mean(e.map(x=>x.negativeImpression)),impression:mean(e.map(x=>x.impression)),matched:votes(positive,'matched'),unmatched:votes(negative,'unmatched'),ageResponse:{valued:positive.filter(x=>x.maturity>=.08).length,lowInterest:e.filter(x=>x.attentionCost>.07).length}};}
function salience(r,all,month,policy){const n=r.sold;if(!n)return 0;const repetition=all.filter(x=>x.productId!==r.productId&&x.sold&&similarity(x,r)>.85).length,signal=policy==='support'?r.strongCount/n:policy==='impression'?r.impression:Math.min(1,repetition/3);return (.2+.8*signal)*(n/(n+2))*decay(month-r.lastSale,120);}
function priorFor(records,p,month,policy){return records.filter(r=>r.productId!==p.id&&r.sold>0&&r.lastSale<month).map(r=>({record:r,similarity:similarity(r,p),salience:salience(r,records,month,policy)})).sort((a,b)=>b.salience*(.25+.75*b.similarity)-a.salience*(.25+.75*a.similarity)||b.record.lastSale-a.record.lastSale||a.record.productId-b.record.productId)[0]??null;}
function record(p){return {productId:p.id,name:p.name,years:p.years,recipe:structuredClone(p.recipe),profile:structuredClone(p.profile),received:0,firstReceived:null,lastReceived:null,lastSale:null,evaluations:[],sold:0,supportCount:0,strongCount:0,missCount:0,positiveImpression:0,negativeImpression:0,impression:0,contexts:[]};}
function context(p,people,prior,month,available){
 const n=people.length,positive=people.filter(x=>['like','strong'].includes(x.verdict)).length,intrinsic=mean(people.map(x=>x.score));
 // A positive mixture retains separated flavors; negative memories add no expectation.
 const expectationComponents=available.filter(r=>r.productId!==p.id&&r.supportCount>0&&r.lastSale<month).map(r=>({productId:r.productId,weight:(r.supportCount+.5*r.strongCount)/(r.sold+2)*decay(month-r.lastSale,36),similarity:similarity(r,p)}));
 const totalWeight=expectationComponents.reduce((n,x)=>n+x.weight,0),expectationAffinity=totalWeight?expectationComponents.reduce((n,x)=>n+x.weight*x.similarity,0)/totalWeight:0,expectationStrength=1-Math.exp(-totalWeight);
 const recalledPositiveAffinity=prior&&prior.record.supportCount>0?prior.similarity*Math.min(1,prior.salience):0;
 const bonus=(positive/n)*(.04*expectationAffinity*expectationStrength+.01*recalledPositiveAffinity);
 const data={intrinsic,bonus,value:Math.min(1,intrinsic+bonus),priorProductId:prior?.record.productId??null,similarity:prior?.similarity??0,evaluationCount:n,month,positiveCount:positive,expectationAffinity,expectationStrength,expectationComponents,recalledPositiveAffinity};
 let kind='direct',text=null;
 if(prior){const r=prior.record,same=key(r)===key(p);if(same&&r.supportCount>0){kind='return';text=`前の${r.years}年の一本を好んだ客がいました。同じ製法をまた届けてもらいましたね。`;}
 else if(positive>0&&r.supportCount>0&&p.years<r.years){kind='new-positive';text=`前の${r.years}年の一本にも、今回の若い一本にも、好む客がいました。`;}
 else if(positive>0&&r.supportCount>0){kind='new-positive';text=`前の一本とは違う味も、今回好まれています。`;}
 else if(r.missCount>0&&r.supportCount===0){kind='negative-memory';text=`前の一本は好みに合わない客がいました。今回も、客の反応を見ています。`;}
 else {kind='remembered';text=`前に売れた${r.years}年の一本も、店の記録に残っています。`;}}
 return {...data,reaction:{text,kind,priorProductId:data.priorProductId,currentProductId:p.id,facts:{currentEvaluations:n,currentPositive:positive,priorSold:prior?.record.sold??0,priorPositive:prior?.record.supportCount??0,priorNegative:prior?.record.missCount??0}}};
}
export function rebuild(sales,receipts,policy){
 if(!Object.hasOwn(POLICIES,policy))throw Error('記憶モデルを確認してください。');
 const products=new Map(sales.products.map(p=>[p.id,p])),relations={};
 for(const id of ['diner','bar','specialist']){
  const records=new Map();for(const t of receipts.filter(x=>x.shopId===id)){const p=products.get(t.productId);if(!p||!['delivery','recall'].includes(t.kind)||!Number.isInteger(t.count)||t.count<=0||!Number.isInteger(t.month)||t.month<0||t.month>sales.month)throw Error('受領記録を確認してください。');if(!records.has(p.id))records.set(p.id,record(p));const r=records.get(p.id);if(t.kind==='delivery'){r.received+=t.count;r.firstReceived??=t.month;r.lastReceived=t.month;}}
  for(const m of sales.lastMonths){
   // All receipts in one month use the archive as it stood before that month.
   const available=structuredClone([...records.values()].filter(r=>r.lastSale!==null&&r.lastSale<m.month));
   const priors=new Map();for(const row of m.shops.filter(x=>x.shopId===id)){const p=products.get(row.productId);priors.set(p.id,structuredClone(priorFor([...records.values()],p,m.month,policy)));}
   for(const row of m.shops.filter(x=>x.shopId===id)){
    const p=products.get(row.productId);if(!records.has(p.id))throw Error('受領記録のない瓶が売れています。');const r=records.get(p.id),assessment=context(p,row.evaluations,priors.get(p.id),m.month,available);
    r.contexts.push(assessment);r.evaluations.push(...row.evaluations);r.lastSale=m.month;Object.assign(r,facts(r));
   }
  }
  const archive=[...records.values()],month=sales.month;
  const positiveEvidence=archive.reduce((n,r)=>n+(r.supportCount+.5*r.strongCount)/7.5*decay(month-r.lastSale,72),0),negativeEvidence=archive.reduce((n,r)=>n+r.missCount/5*decay(month-r.lastSale,72),0);
  const recognition=1-Math.exp(-archive.reduce((n,r)=>n+Math.min(5,r.received)/5*decay(month-(r.lastReceived??month),120),0));
  const expectations=archive.filter(r=>r.supportCount>0).map(r=>({productId:r.productId,profile:r.profile,years:r.years,weight:(r.supportCount+.5*r.strongCount)/(r.sold+2)*decay(month-r.lastSale,36),positiveCount:r.supportCount,strongCount:r.strongCount}));
  const trade=receipts.filter(x=>x.shopId===id).at(-1),lastSales=archive.filter(r=>r.lastSale!==null).map(r=>r.lastSale);
  relations[id]={shopId:id,recognition,support:positiveEvidence/(4+positiveEvidence+.5*negativeEvidence),positiveEvidence,negativeEvidence,expectations,archive,lastTradeMonth:trade?.month??null,lastSaleMonth:lastSales.length?Math.max(...lastSales):null};
 }
 return relations;
}
export function view(s,shopId,productId=s.sales.selectedId){
 const relation=s.relations[shopId],p=s.sales.products.find(p=>p.id===productId);if(!relation||!p)throw Error('店と瓶を確認してください。');
 const r=relation.archive.find(r=>r.productId===productId),assessment=r?.contexts.at(-1)??null;
 let reaction=assessment?.reaction??{text:null,kind:'unseen',priorProductId:null,currentProductId:p.id,facts:{currentEvaluations:0}};
 if(!assessment&&r?.received){const prior=priorFor(relation.archive,p,s.sales.month+1,s.policy);if(prior){const old=prior.record;reaction={text:`前に売れた${old.years}年の一本も覚えています。今回の瓶は、まだ客の評価を待っています。`,kind:'received',priorProductId:old.productId,currentProductId:p.id,facts:{currentEvaluations:0,priorSold:old.sold,priorPositive:old.supportCount,priorNegative:old.missCount}};}}
 return {...relation,text:reaction.text,reaction,contextAssessment:assessment,assessment,lastTransaction:relation.lastTradeMonth,lastSale:relation.lastSaleMonth};
}
