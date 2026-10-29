import * as Base from '../v01/model.mjs';
export const VERSION='whisky-evaluation/0.1.1';
export const {AGES,AXES,LABELS,MODELS,SAMPLES,SHOPS,SEED,DEFAULT,conditions,ageValue,bottle}=Base;
export const VARIANTS={salience:'案A：重点・他軸維持',soft:'案B：重点を強調・連続上限',guarded:'案C：他軸維持・連続上限'};
export const ADOPTED='guarded';
const clamp=x=>Math.max(0,Math.min(1,x)),mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const primary=[['fruit','grain'],['fruit','vanilla'],['smoke','body'],['body','spice']];
// Preserve every original person/target/age interest. Only their priorities change.
export function priorityWeights(guest,variant=ADOPTED){
 const [first,second]=primary[guest.type];
 return guest.weights.map((w,i)=>w*(AXES[i]===first?4:AXES[i]===second?1.5:variant!=='soft'?1:.35));
}
export function softCeiling(raw){return raw<=.8?Math.max(0,raw):.8+.2*(-Math.expm1(-(raw-.8)/.2));}
export function assess(b,guest,model,variant=ADOPTED){
 if(!Object.hasOwn(VARIANTS,variant))throw Error('比較案を確認してください。');
 const weights=priorityWeights(guest,variant),total=weights.reduce((a,b)=>a+b,0),p=b.profile;
 const axisFacts=AXES.map((axis,i)=>({axis,actual:p[axis],target:guest.taste[axis],delta:p[axis]-guest.taste[axis],distance:Math.abs(p[axis]-guest.taste[axis]),weight:weights[i]}));
 const weightedDistance=axisFacts.reduce((s,x)=>s+x.distance*x.weight,0)/total,mismatchPenalty=0;
 const distance=weightedDistance+mismatchPenalty,fit=Math.exp(-2.65*distance),gate=clamp((fit-.45)/.4),potential=ageValue(b.years,model),ease=(1-p.rough)*.06;
 const base=.94*fit+ease;
 const maturity=.36*potential*guest.ageInterest*gate;
 const attentionCost=.24*potential*(1-guest.ageInterest)*(1-.4*gate),rawScore=base+maturity-attentionCost;
 const score=variant!=='salience'?softCeiling(rawScore):clamp(rawScore);
 const verdict=score>=.8?'strong':score>=.62?'like':score>=.48?'neutral':'miss';
 const distinct=clamp(Math.max(p.smoke,.85*p.body,p.wood,p.vanilla));
 const impression=clamp(.38*distinct+.32*Math.abs(score-.5)*2+.3*potential*gate*guest.ageInterest);
 const positiveImpression=['strong','like'].includes(verdict)?impression:0,negativeImpression=verdict==='miss'?impression:0,neutralImpression=['neutral'].includes(verdict)?impression:0;
 const sorted=[...axisFacts].sort((a,b)=>a.distance*a.weight-b.distance*b.weight);
 return {id:guest.id,type:guest.type,ageInterest:guest.ageInterest,priority:primary[guest.type][0],weightedDistance,mismatchPenalty,fit,gate,potential,ease,base,maturity,attentionCost,rawScore,score,impression,positiveImpression,negativeImpression,neutralImpression,signedImpression:positiveImpression-negativeImpression,verdict,axisFacts,matched:sorted.slice(0,2).map(x=>x.axis),unmatched:sorted.slice(-2).map(x=>x.axis)};
}
export function reaction(person,b){
 const r=Base.reaction(person,b),priority=person.axisFacts.find(x=>x.axis===person.priority),label=LABELS[AXES.indexOf(person.priority)];
 const fitText=priority.actual<.2?`${label}が控えめなところ`:priority.actual>.6?`${label}がしっかりあるところ`:`${label}のほどよさ`;
 // Use the person's influential preference, rather than an irrelevant closest axis.
 if(['strong','like'].includes(person.verdict)&&priority.distance<.2){r.reasons[0]=`この客が重視する${label}の強さが好みに近い。`;r.text=person.verdict==='strong'?`${fitText}が好きです。印象に残る一本ですね。`:`${fitText}を楽しめました。`;}
 if(person.maturity>=.08&&['strong','like'].includes(person.verdict))r.text+=' この味なら、熟成を待った価値を感じます。';
 return r;
}
export function summarize(people){
 const counts=Object.fromEntries(['strong','like','neutral','miss'].map(k=>[k,people.filter(p=>p.verdict===k).length]));
 const sorted=[...people].sort((a,b)=>a.score-b.score||a.id-b.id),n=people.length;
 const histogram=Array.from({length:10},(_,i)=>people.filter(p=>Math.min(9,Math.floor(p.score*10))===i).length);
 return {counts,support:(counts.strong+counts.like)/n,strong:counts.strong/n,fit:mean(people.map(x=>x.fit)),maturity:mean(people.map(x=>x.maturity)),impression:mean(people.map(x=>x.impression)),positiveImpression:mean(people.map(x=>x.positiveImpression)),negativeImpression:mean(people.map(x=>x.negativeImpression)),neutralImpression:mean(people.map(x=>x.neutralImpression)),signedImpression:mean(people.map(x=>x.signedImpression)),supportStrength:mean(people.map(x=>Math.max(0,x.score-.62)/.38)),rawSupportStrength:mean(people.map(x=>Math.max(0,x.rawScore-.62)/.38)),peak:sorted.at(-1).score,rawPeak:Math.max(...people.map(x=>x.rawScore)),ceilingRate:people.filter(x=>x.score>=1).length/n,nearCeilingRate:people.filter(x=>x.score>=.99).length/n,rawExcessRate:people.filter(x=>x.rawScore>1).length/n,histogram,quantiles:Object.fromEntries([.1,.5,.9,.99].map(q=>[q,sorted[Math.floor(q*(n-1))].score])),medianGuest:sorted[Math.floor(n/2)].id,fanGuest:sorted.find(p=>p.score===sorted.at(-1).score).id};
}
function validateSupplied(c,b,g){
 if(b.years!==c.years||b.flavorYears!==(c.aging==='fixed'?c.referenceYears:c.years)||!AXES.every(k=>Number.isFinite(b.profile?.[k])&&b.profile[k]>=0&&b.profile[k]<=1))throw Error('瓶の風味・年数と比較条件が一致しません。');
 if(!Array.isArray(g)||!g.length||new Set(g.map(p=>p.id)).size!==g.length||!g.every(p=>Number.isInteger(p.id)&&p.id>=0&&[0,1,2,3].includes(p.type)&&Number.isFinite(p.ageInterest)&&p.ageInterest>=0&&p.ageInterest<=1&&p.weights?.length===8&&p.weights.every(w=>Number.isFinite(w)&&w>0)&&AXES.every(k=>Number.isFinite(p.taste?.[k])&&p.taste[k]>=0&&p.taste[k]<=1)))throw Error('客の識別・好みを確認してください。');
}
export function baseline(input={},suppliedBottle=null,guests=null){
 const c=conditions(input),b=suppliedBottle??bottle(c),g=guests??Base.cohort(c.shop,c.seed);
 validateSupplied(c,b,g);
 const people=g.map(guest=>{const p=Base.assess(b,guest,c.model),rawScore=.94*p.fit+p.ease+p.maturity-p.attentionCost;return {...p,rawScore,priority:primary[guest.type][0],positiveImpression:['strong','like'].includes(p.verdict)?p.impression:0,negativeImpression:p.verdict==='miss'?p.impression:0,neutralImpression:p.verdict==='neutral'?p.impression:0,signedImpression:(['strong','like'].includes(p.verdict)?1:p.verdict==='miss'?-1:0)*p.impression};});
 const summary=summarize(people),central=people.find(x=>x.id===summary.medianGuest),fan=people.find(x=>x.id===summary.fanGuest);
 return {version:Base.VERSION,variant:'baseline',conditions:c,bottle:b,...summary,reaction:Base.reaction(central,b),fan:{guest:fan.id,...Base.reaction(fan,b)},people};
}
export function evaluate(input={},variant=ADOPTED,suppliedBottle=null,guests=null){
 const c=conditions(input),b=suppliedBottle??bottle(c),g=guests??Base.cohort(c.shop,c.seed);
 validateSupplied(c,b,g);
 const people=g.map(guest=>assess(b,guest,c.model,variant)),summary=summarize(people),central=people.find(x=>x.id===summary.medianGuest),fan=people.find(x=>x.id===summary.fanGuest);
 return {version:VERSION,variant,conditions:c,bottle:b,...summary,reaction:reaction(central,b),fan:{guest:fan.id,...reaction(fan,b)},people};
}
export function matched(input={},variant=ADOPTED){const c=conditions(input),b=bottle(c),g=Base.cohort(c.shop,c.seed);return {before:baseline(c,b,g),after:evaluate(c,variant,b,g)};}
export function differences(before,after){
 if(before.people.length!==after.people.length||before.conditions.shop!==after.conditions.shop||before.conditions.seed!==after.conditions.seed)throw Error('同じ客の比較を選んでください。');
 const prior=new Map(before.people.map(p=>[p.id,p]));if(prior.size!==before.people.length||new Set(after.people.map(p=>p.id)).size!==after.people.length||!after.people.every(p=>prior.has(p.id)&&prior.get(p.id).type===p.type&&prior.get(p.id).ageInterest===p.ageInterest&&AXES.every(k=>prior.get(p.id).axisFacts.find(x=>x.axis===k).target===p.axisFacts.find(x=>x.axis===k).target)))throw Error('客の識別が一致しません。');
 return {up:after.people.filter(p=>p.score>prior.get(p.id).score+1e-12).length,down:after.people.filter(p=>p.score<prior.get(p.id).score-1e-12).length,same:after.people.filter(p=>Math.abs(p.score-prior.get(p.id).score)<=1e-12).length,support:after.support-before.support,strong:after.strong-before.strong,positiveImpression:after.positiveImpression-before.positiveImpression,negativeImpression:after.negativeImpression-before.negativeImpression};
}
export function compare(input={},dimension='years',variant=ADOPTED){const c=conditions(input),values={years:AGES,sample:SAMPLES.map(x=>x.id),shop:SHOPS.map(x=>x.id),model:Object.keys(MODELS)}[dimension];if(!values)throw Error('比較する条件を確認してください。');return values.map(value=>matched({...c,[dimension]:value},variant));}
export function exportLog(input={},dimension='years',variant=ADOPTED){return {version:VERSION,conditions:conditions(input),dimension,variant,results:compare(input,dimension,variant)};}
export function replay(log){if(log?.version!==VERSION)throw Error('v011のログを選んでください。');return exportLog(log.conditions,log.dimension,log.variant);}
export function csv(log){const fields=['version','variant','sample','years','shop','model','aging','referenceYears','seed','support','strong','supportStrength','rawSupportStrength','peak','rawPeak','ceilingRate','nearCeilingRate','positiveImpression','negativeImpression','histogram'];const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';return '\uFEFF'+[fields,...log.results.flatMap(pair=>[pair.before,pair.after].map(r=>fields.map(f=>f==='histogram'?JSON.stringify(r.histogram):r.conditions[f]??r[f])))].map(row=>row.map(quote).join(',')).join('\r\n');}
