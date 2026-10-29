import {distill,mature,expression} from '../../../../ambertime-flavor-lab-v02/model.mjs';
import {unit} from '../../reputation/v03/model.mjs';

export const VERSION='whisky-evaluation/0.1';
export const SEED=20261029;
export const AGES=[1,3,6,10,15,20];
export const AXES=['fruit','grain','smoke','body','rough','spice','wood','vanilla'];
export const LABELS=['果実','穀物','煙','深み','刺激','スパイス','樽香','バニラ'];
export const MODELS={A:'直線型',B:'逓減型',C:'段階型'};
export const SAMPLES=[
 {id:'sweet',name:'甘い香り',recipe:{malt:'plain',ferment:'long',start:12/99,end:40/99,cask:'first'}},
 {id:'smoke',name:'煙',recipe:{malt:'peat',ferment:'long',start:10/99,end:90/99,cask:'refill'}},
 {id:'deep',name:'深み',recipe:{malt:'plain',ferment:'short',start:75/99,end:1,cask:'refill'}},
 {id:'balanced',name:'バランス',recipe:{malt:'plain',ferment:'long',start:35/99,end:70/99,cask:'refill'}}
];
// New Lab hypotheses: overlapping tastes, not one correct bottle per shop.
const TASTES=[
 [.65,.55,.08,.4,.08,.22,.18,.18],
 [.8,.32,.08,.45,.12,.25,.4,.45],
 [.45,.4,.72,.65,.2,.4,.5,.3],
 [.35,.65,.15,.9,.25,.7,.55,.3]
];
export const SHOPS=[
 {id:'diner',name:'町の食堂',mix:[.55,.24,.08,.13],ageInterest:.2,note:'食事と飲みやすさを好む客が多め。価格は今回固定・評価外。'},
 {id:'bar',name:'町のバー',mix:[.25,.25,.28,.22],ageInterest:.52,note:'香りや飲み比べへの関心がさまざま。'},
 {id:'specialist',name:'専門酒店',mix:[.15,.22,.31,.32],ageInterest:.75,note:'熟成や個性への関心が比較的高め。'}
];
const clamp=x=>Math.max(0,Math.min(1,x));
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
export const DEFAULT={sample:'balanced',years:6,shop:'diner',model:'B',aging:'actual',referenceYears:6,seed:SEED};
export function conditions(input={}){
 const c={...DEFAULT,...input};
 if(!SAMPLES.some(x=>x.id===c.sample)||!SHOPS.some(x=>x.id===c.shop)||!Object.hasOwn(MODELS,c.model)||!AGES.includes(c.years)||!AGES.includes(c.referenceYears)||!['actual','fixed'].includes(c.aging)||!Number.isInteger(c.seed)||c.seed<1||c.seed>4294967295)throw Error('比較条件を確認してください。');
 return Object.fromEntries(Object.keys(DEFAULT).map(k=>[k,c[k]]));
}
export function ageValue(years,model){
 if(!Number.isFinite(years)||years<0||!Object.hasOwn(MODELS,model))throw Error('年数とモデルを確認してください。');
 if(model==='A')return clamp(years/20);
 if(model==='B')return clamp(Math.log1p(years/3)/Math.log1p(20/3));
 return years<3?.05:years<6?.25:years<10?.45:years<15?.7:years<20?.85:1;
}
export function bottle(input){
 const c=conditions(input),sample=SAMPLES.find(x=>x.id===c.sample),spirit=distill(sample.recipe),flavorYears=c.aging==='fixed'?c.referenceYears:c.years;
 const profile=mature(spirit,flavorYears,sample.recipe.cask);
 return {sample:sample.id,name:sample.name,recipe:{...sample.recipe},years:c.years,flavorYears,profile,expression:expression(profile,spirit)};
}
export function cohort(shopId,seed=SEED,count=120){
 const shop=SHOPS.find(x=>x.id===shopId);if(!shop||!Number.isInteger(seed)||seed<1||seed>4294967295||!Number.isInteger(count)||count<1||count>1000)throw Error('客層を確認してください。');
 return Array.from({length:count},(_,i)=>{
  const rand=k=>unit(seed,`${shopId}:${i}:${k}`),r=rand('taste');let type=0,sum=shop.mix[0];while(r>sum&&type<3)sum+=shop.mix[++type];
  const taste=Object.fromEntries(AXES.map((k,j)=>[k,clamp(TASTES[type][j]+(rand(k)-.5)*.36)]));
  // Same people across bottles/ages/models. Individual differences overlap stores.
  const ageInterest=clamp(shop.ageInterest+(rand('age')-.5)*1.1);
  return {id:i,type,taste,ageInterest,weights:AXES.map(k=>k==='rough'?1.25:.7+rand('weight:'+k)*.6)};
 });
}
export function assess(b,guest,model){
 const p=b.profile,total=guest.weights.reduce((a,b)=>a+b,0);
 const distances=AXES.map((k,i)=>({axis:k,actual:p[k],target:guest.taste[k],delta:p[k]-guest.taste[k],distance:Math.abs(p[k]-guest.taste[k]),weight:guest.weights[i]}));
 const distance=distances.reduce((n,x)=>n+x.distance*x.weight,0)/total;
 const fit=Math.exp(-2.65*distance),gate=clamp((fit-.45)/.4),potential=ageValue(b.years,model);
 const maturity= .36*potential*guest.ageInterest*gate;
 // Occasion/attention mismatch is a preference hypothesis, not a price or demand rule.
 const attentionCost=.24*potential*(1-guest.ageInterest)*(1-.4*gate);
 const ease=(1-p.rough)*.06;
 const score=clamp(.94*fit+ease+maturity-attentionCost);
 const distinct=clamp(Math.max(p.smoke,p.body*.85,p.wood,p.vanilla));
 const impression=clamp(.38*distinct+.32*Math.abs(score-.5)*2+.3*potential*gate*guest.ageInterest);
 const verdict=score>=.8?'strong':score>=.62?'like':score>=.48?'neutral':'miss';
 const reasons=distances.sort((a,b)=>a.distance*a.weight-b.distance*b.weight);
 return {id:guest.id,type:guest.type,ageInterest:guest.ageInterest,fit,gate,potential,maturity,attentionCost,ease,score,impression,verdict,axisFacts:distances,matched:reasons.slice(0,2).map(x=>x.axis),unmatched:reasons.slice(-2).map(x=>x.axis)};
}
export function reaction(result,b){
 const axisLabel=k=>LABELS[AXES.indexOf(k)];
 const matched=result.axisFacts.find(x=>x.axis===result.matched[0]),unmatched=result.axisFacts.find(x=>x.axis===result.unmatched.at(-1));
 const liked=matched.axis==='rough'&&matched.actual<.3?'刺激が穏やかなところ':`${axisLabel(matched.axis)}が${matched.actual<.2?'控えめなところ':matched.actual>.6?'しっかりあるところ':'ほどよくあるところ'}`;
 const miss=axisLabel(unmatched.axis),mismatch=unmatched.delta>0?`${miss}が私には強すぎました`:`私にはもう少し${miss}がほしいです`;
 const reasons=[`${liked}が、この客の好みに近い。`];
 let text,hint=null;
 if(result.verdict==='strong')text=`${liked}が好きです。印象に残る一本ですね。`;
 else if(result.verdict==='like')text=b.profile.rough<.2?'口当たりが穏やかで飲みやすいですね。':`${liked}を楽しめました。`;
 else if(result.verdict==='neutral')text=`${liked}は楽しめます。${mismatch}。`;
 else text=`${mismatch}。今回は好みに合いませんでした。`;
 if(result.maturity>=.08)reasons.push('味が合い、熟成年数への関心も高いため、待った時間が評価につながった。');
 else if(result.gate<.25)reasons.push('味の相性が低いため、年数が増えても熟成価値はほとんど評価に乗らない。');
 else if(result.attentionCost>.07)reasons.push('熟成への関心が低く、この場では気軽さを優先した。');
 else reasons.push('熟成年数より、今回の味の相性が評価の中心。');
 if(result.verdict==='miss')hint='同じ一本を別の店に届けてみる。';
 else if(result.verdict==='neutral')hint='同じ店・年数のまま、別の味を試してみる。';
 else if(result.verdict==='like'&&b.years<=6&&result.ageInterest>.55)hint='同じ仕込みをもう少し熟成して比べてみる。';
 return {text,reasons,hint};
}
export function evaluate(input={}){
 const c=conditions(input),b=bottle(c),guests=cohort(c.shop,c.seed),people=guests.map(g=>assess(b,g,c.model));
 const counts=Object.fromEntries(['strong','like','neutral','miss'].map(k=>[k,people.filter(p=>p.verdict===k).length]));
 // Speak as one identified guest; store summary includes every guest, never cherry-picks a fan.
 const representative=[...people].sort((a,b)=>a.score-b.score||a.id-b.id)[Math.floor(people.length/2)];
 const strongest=[...people].sort((a,b)=>b.score-a.score||a.id-b.id)[0];
 return {version:VERSION,conditions:c,bottle:b,counts,support:(counts.strong+counts.like)/people.length,strong:counts.strong/people.length,fit:mean(people.map(x=>x.fit)),maturity:mean(people.map(x=>x.maturity)),impression:mean(people.map(x=>x.impression)),peak:strongest.score,medianGuest:representative.id,reaction:reaction(representative,b),fan:{guest:strongest.id,...reaction(strongest,b)},people};
}
export function compare(input,dimension){
 const c=conditions(input);
 const choices={years:AGES,sample:SAMPLES.map(x=>x.id),shop:SHOPS.map(x=>x.id),model:Object.keys(MODELS)};
 if(!choices[dimension])throw Error('比較する項目を確認してください。');
 return choices[dimension].map(value=>evaluate({...c,[dimension]:value}));
}
export function exportLog(input,dimension='years'){
 const c=conditions(input);return {version:VERSION,conditions:c,dimension,results:compare(c,dimension)};
}
export function replay(log){if(log?.version!==VERSION)throw Error('このLabのログを選んでください。');return exportLog(log.conditions,log.dimension);}
export function csv(log){
 const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 const head=['sample','years','shop','model','aging','flavorYears','referenceYears','seed','support','strong','peak','fit','maturity','impression',...AXES,'reaction'];
 return '\uFEFF'+[head,...log.results.map(r=>{const c=r.conditions;return [c.sample,c.years,c.shop,c.model,c.aging,r.bottle.flavorYears,c.referenceYears,c.seed,r.support,r.strong,r.peak,r.fit,r.maturity,r.impression,...AXES.map(k=>r.bottle.profile[k]),r.reaction.text];})].map(row=>row.map(quote).join(',')).join('\r\n');
}
