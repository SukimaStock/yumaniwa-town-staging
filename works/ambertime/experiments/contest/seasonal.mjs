// Annual experiment only; 0.1 production adapters and scores remain frozen.
import * as L from './model.mjs';
export const JUDGE_POOL=Object.freeze([...L.JUDGES,
 Object.freeze({id:'light',name:'軽やか派',hint:'穏やかなシゲキと控えめな木。かおりも強すぎない方を好む。',target:[.10,.48,.16],width:[.22,.25,.24],weight:[.35,.40,.25]}),
 Object.freeze({id:'layered',name:'重なり派',hint:'原酒と木のかおりが共にある味。シゲキは穏やかな方を好む。',target:[.15,.90,.52],width:[.25,.25,.25],weight:[.15,.45,.40]})]);
const clone=structuredClone,round=n=>Math.round(n*10)/10;
const check=(ok,message)=>{if(!ok)throw Error(message);};
const validSeed=seed=>Number.isInteger(seed)&&seed>=1&&seed<=4294967295;
const validOptions=o=>['fixed','rotating'].includes(o.panelMode)&&['mean','median'].includes(o.aggregation)&&typeof o.recommendations==='boolean';
export function panelFor(seed,year,panelMode='rotating'){
 check(validSeed(seed)&&Number.isInteger(year)&&year>=1&&['fixed','rotating'].includes(panelMode),'年・シード・審査方式を確認してください。');
 if(panelMode==='fixed')return clone(JUDGE_POOL.slice(0,3));
 let x=(seed^Math.imul(year,0x9e3779b1))>>>0||1;
 const next=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
 const pool=clone(JUDGE_POOL);for(let i=pool.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,3);
}
export function evaluate(cask,panel,{aggregation='mean',recommendations=true}={}){
 check(Array.isArray(panel)&&panel.length===3&&new Set(panel.map(j=>j.id)).size===3&&panel.every(j=>JUDGE_POOL.some(p=>p.id===j.id))&&['mean','median'].includes(aggregation)&&typeof recommendations==='boolean','審査条件を確認してください。');
 const original=L.judge(cask),values=[cask.roughness,cask.character,cask.wood];
 const judges=panel.map(({id})=>{
  const prior=original.judges.find(j=>j.id===id);if(prior)return prior;
  const j=JUDGE_POOL.find(j=>j.id===id),distances=values.map((v,i)=>j.weight[i]*((v-j.target[i])/j.width[i])**2),score=round(100*Math.exp(-distances.reduce((a,b)=>a+b,0)/2));
  const i=distances.indexOf(Math.max(...distances)),axis=['シゲキ','原酒のかおり','木のかおり'][i];
  return {id,name:j.name,score,comment:score>=85?(id==='light'?'軽い口当たりとかおりが好みに合う。':'原酒と木のかおりの重なりが好みに合う。'):`${axis}が好みより${values[i]>j.target[i]?'強い':'控えめ'}。`};
 });
 const scores=judges.map(j=>j.score),total=aggregation==='median'?[...scores].sort((a,b)=>a-b)[1]:round(scores.reduce((a,b)=>a+b,0)/3);
 return {judges,total};
}
let cachedRivals;
export function rivals(){
 if(!cachedRivals)cachedRivals=[L.rival(),L.generateCask({seed:4218,stop:99,type:'bourbon',months:6,id:-1}),L.generateCask({seed:9142,stop:50,type:'bourbon',months:36,id:-2})];
 return clone(cachedRivals);
}
export function createSeason({seed=L.DEFAULT_SEED,strategy='diverse',consumption='small',evaporation='current',panelMode='rotating',aggregation='mean',recommendations=true}={}){
 const options={panelMode,aggregation,recommendations};check(validOptions(options),'実験条件を確認してください。');
 return {...L.createSession({seed,strategy,consumption,evaporation}),version:'ambertime-contest/0.2',options};
}
export function fairStatus(s){
 const year=Math.max(1,Math.floor(s.month/12)),opensAt=year*12,record=s.history.find(h=>h.year===year);
 return {year,opensAt,status:s.month<opensAt?'upcoming':record?.kind==='entry'?'submitted':record?.kind==='skip'?'skipped':'open',judges:panelFor(s.seed,year,s.options.panelMode)};
}
export function annualAdvance(s,months){
 const next=L.advance(s,months);
 // Crossing the following boundary closes the previous optional fair. Time never waits for entry.
 for(let boundary=(Math.floor(s.month/12)+1)*12;boundary<=next.month;boundary+=12){
  const year=boundary/12-1;if(year>=1&&!next.history.some(h=>h.year===year))next.history.push({kind:'skip',year,month:boundary,reason:'次の年を迎えたため見送り'});
 }
 return next;
}
export const nextFair=s=>annualAdvance(s,(Math.floor(s.month/12)+1)*12-s.month);
export function skipFair(s){
 const status=fairStatus(s);check(status.status==='open','今年の出品は終了しているか、まだ開催前です。');
 const next=clone(s);next.history.push({kind:'skip',year:status.year,month:s.month,reason:'出品を見送り'});return next;
}
export function enterFair(s,id){
 const status=fairStatus(s);check(status.status==='open','今年は1樽だけ出品できます。開催前・終了後は出品できません。');
 const next=clone(s),c=next.casks.find(c=>c.id===id),used=L.CONDITIONS.consumption[s.consumption];
 check(c&&Number.isFinite(used)&&c.litres>0&&c.litres+1e-12>=used,'出品する原酒が足りません。');
 const evaluation=evaluate(c,status.judges,s.options),field=rivals().map(r=>evaluate(r,status.judges,s.options)),rank=1+field.filter(r=>r.total>evaluation.total).length;
 const recommendations=s.options.recommendations?evaluation.judges.filter((j,i)=>j.score>=80&&field.every(r=>j.score>r.judges[i].score)).map(j=>j.name):[];
 const profile=clone(c),beforeLitres=c.litres;c.litres=Math.max(0,c.litres-used);c.sampled+=used;
 next.history.push({kind:'entry',year:status.year,month:s.month,caskId:id,age:c.age,profile,evaluation,rank,fieldSize:4,recommendations,consumed:used,beforeLitres,afterLitres:c.litres,panelIds:status.judges.map(j=>j.id),options:clone(s.options),rivals:field});
 return next;
}
export const seasonalReplace=(s,id,recipe)=>L.replace(s,id,recipe);
