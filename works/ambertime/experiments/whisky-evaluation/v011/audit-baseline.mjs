import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import * as V from '../v01/model.mjs';
import {unit} from '../../reputation/v03/model.mjs';

// Single-factor audit. Every intervention below changes exactly the named factor.
// Candidate v011 implementation is deliberately not imported here.
const clamp=x=>Math.max(0,Math.min(1,x)),mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
const CENTERS=[
 [.65,.55,.08,.4,.08,.22,.18,.18],
 [.8,.32,.08,.45,.12,.25,.4,.45],
 [.45,.4,.72,.65,.2,.4,.5,.3],
 [.35,.65,.15,.9,.25,.7,.55,.3]
];
export const INTERVENTIONS=[
 {id:'baseline',factor:'none',description:'v01そのまま'},
 {id:'cohort-uniform',factor:'cohort mixture only',description:'嗜好4群を均等化。他の個人差・関心・重み・式は同一'},
 {id:'weights-uniform',factor:'weights only',description:'8軸の重みを全て1とする'},
 {id:'weights-salient',factor:'weights only',description:'各客が最も好む香味軸の重みだけ4倍。刺激軸は主軸選択から除く'},
 {id:'fit-rms',factor:'fit distance aggregation only',description:'重み付きL1距離を重み付きRMS距離に置換。指数係数は2.65のまま'},
 {id:'maturity-zero',factor:'maturity coefficient only',description:'熟成加点係数.36だけ0とする'},
 {id:'attention-zero',factor:'attention coefficient only',description:'低関心減点係数.24だけ0とする'},
 {id:'ease-zero',factor:'ease coefficient only',description:'全員共通の刺激低下加点.06だけ0とする'},
 {id:'thresholds-higher',factor:'verdict thresholds only',description:'支持.62→.65、強い支持.80→.85。score計算は同一'},
 {id:'cap-unclamped',factor:'upper/lower score cap only',description:'飽和前rawScoreをscoreとして保持。他の係数・閾値は同一'},
 {id:'impression-signed',factor:'impression data representation only',description:'同じ印象値を好意・否定・中立に分離。scoreと判定は同一'}
];
function changeGuest(guest,c,id){
 const g={...guest,taste:{...guest.taste},weights:[...guest.weights]};
 if(id==='cohort-uniform'){
  const rand=k=>unit(c.seed,`${c.shop}:${guest.id}:${k}`),type=Math.min(3,Math.floor(rand('taste')*4));
  g.type=type;g.taste=Object.fromEntries(V.AXES.map((k,j)=>[k,clamp(CENTERS[type][j]+(rand(k)-.5)*.36)]));
 }
 if(id==='weights-uniform')g.weights.fill(1);
 if(id==='weights-salient'){
  const eligible=V.AXES.map((k,i)=>({k,i,target:g.taste[k]})).filter(x=>x.k!=='rough');
  const salient=eligible.sort((a,b)=>b.target-a.target||a.i-b.i)[0].i;g.weights[salient]*=4;
 }
 return g;
}
export function counterfactual(b,guest,c,id){
 const g=changeGuest(guest,c,id),total=g.weights.reduce((a,b)=>a+b,0),ds=V.AXES.map((k,i)=>({axis:k,d:Math.abs(b.profile[k]-g.taste[k]),w:g.weights[i]}));
 const distance=id==='fit-rms'?Math.sqrt(ds.reduce((s,x)=>s+x.d*x.d*x.w,0)/total):ds.reduce((s,x)=>s+x.d*x.w,0)/total;
 const fit=Math.exp(-2.65*distance),gate=clamp((fit-.45)/.4),potential=V.ageValue(b.years,c.model);
 const maturity=(id==='maturity-zero'?0:.36)*potential*g.ageInterest*gate;
 const attentionCost=(id==='attention-zero'?0:.24)*potential*(1-g.ageInterest)*(1-.4*gate);
 const ease=(id==='ease-zero'?0:.06)*(1-b.profile.rough),rawScore=.94*fit+ease+maturity-attentionCost,score=id==='cap-unclamped'?rawScore:clamp(rawScore);
 const distinct=clamp(Math.max(b.profile.smoke,b.profile.body*.85,b.profile.wood,b.profile.vanilla));
 const impression=clamp(.38*distinct+.32*Math.abs(score-.5)*2+.3*potential*gate*g.ageInterest);
 const strong=score>=(id==='thresholds-higher'?.85:.8),support=score>=(id==='thresholds-higher'?.65:.62);
 return {id:g.id,type:g.type,fit,gate,maturity,attentionCost,ease,rawScore,score,impression,strong,support,positiveImpression:support?impression:0,negativeImpression:score<.48?impression:0,neutralImpression:!support&&score>=.48?impression:0,ds};
}
const groupKey=c=>[c.seed,c.aging,c.model,c.shop,c.years].join('|');
function wins(rows){
 const groups=new Map();for(const r of rows){const key=groupKey(r.conditions);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const out=Object.fromEntries(V.SAMPLES.map(s=>[s.id,{support:0,strong:0,both:0}]));
 for(const rs of groups.values()){
  const support=Math.max(...rs.map(r=>r.support)),strong=Math.max(...rs.map(r=>r.strong));
  for(const r of rs){const x=out[r.conditions.sample],a=r.support===support,b=r.strong===strong;if(a)x.support++;if(b)x.strong++;if(a&&b)x.both++;}
 }
 return {groups:groups.size,bySample:out};
}
function quantile(xs,q){const sorted=[...xs].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*q)];}
function summarise(rows){
 const n=rows.length*120;
 return {conditions:rows.length,people:n,winners:wins(rows),meanSupport:mean(rows.map(r=>r.support)),meanStrong:mean(rows.map(r=>r.strong)),meanScore:mean(rows.map(r=>r.meanScore)),meanRawScore:mean(rows.map(r=>r.meanRawScore)),ceilingPeople:rows.reduce((n,r)=>n+r.ceiling,0),ceilingRate:rows.reduce((n,r)=>n+r.ceiling,0)/n,anyCeilingConditions:rows.filter(r=>r.ceiling>0).length,rawAboveOne:rows.reduce((n,r)=>n+r.rawAboveOne,0),positiveImpression:mean(rows.map(r=>r.positiveImpression)),negativeImpression:mean(rows.map(r=>r.negativeImpression)),neutralImpression:mean(rows.map(r=>r.neutralImpression)),scoreQuantiles:[.1,.5,.9].map(q=>quantile(rows.flatMap(r=>r.scores),q)),bySeed:Object.fromEntries([...new Set(rows.map(r=>r.conditions.seed))].map(seed=>[seed,{winners:wins(rows.filter(r=>r.conditions.seed===seed)),ceilingRate:rows.filter(r=>r.conditions.seed===seed).reduce((n,r)=>n+r.ceiling,0)/(rows.filter(r=>r.conditions.seed===seed).length*120)}]))};
}
export function runAudit(){
 const source=JSON.parse(fs.readFileSync(new URL('../v01/results.json',import.meta.url),'utf8'));
 const baseline=[],mismatches=[],axis=new Map(),archetypes=new Map();
 const cohorts=new Map();
 const rowsById=Object.fromEntries(INTERVENTIONS.map(x=>[x.id,[]]));
 let checked=0;
 for(const old of source.results){
  const c=old.conditions,r=V.evaluate(c);
  for(const key of Object.keys(old))try{assert.deepEqual(r[key],old[key]);}catch{mismatches.push({conditions:c,key});}
  checked++;
  const ck=c.seed+'|'+c.shop;if(!cohorts.has(ck))cohorts.set(ck,V.cohort(c.shop,c.seed));
  const guests=cohorts.get(ck);
  for(const intervention of INTERVENTIONS){
   const id=intervention.id,ps=guests.map(g=>counterfactual(r.bottle,g,c,id));
   if(id==='baseline')for(let i=0;i<ps.length;i++){
    assert.equal(ps[i].score,r.people[i].score);assert.equal(ps[i].fit,r.people[i].fit);assert.equal(ps[i].impression,r.people[i].impression);
    for(const d of ps[i].ds){const key=[c.sample,c.shop,d.axis].join('|');const a=axis.get(key)||{n:0,distance:0,weighted:0};a.n++;a.distance+=d.d;a.weighted+=d.d*d.w;axis.set(key,a);}
    const key=[c.sample,c.shop,ps[i].type].join('|'),a=archetypes.get(key)||{n:0,support:0,strong:0,score:0,fit:0};a.n++;a.support+=Number(ps[i].support);a.strong+=Number(ps[i].strong);a.score+=ps[i].score;a.fit+=ps[i].fit;archetypes.set(key,a);
   }
   rowsById[id].push({conditions:c,support:ps.filter(p=>p.support).length/120,strong:ps.filter(p=>p.strong).length/120,meanScore:mean(ps.map(p=>p.score)),meanRawScore:mean(ps.map(p=>p.rawScore)),ceiling:ps.filter(p=>p.score===1).length,rawAboveOne:ps.filter(p=>p.rawScore>1).length,positiveImpression:mean(ps.map(p=>p.positiveImpression)),negativeImpression:mean(ps.map(p=>p.negativeImpression)),neutralImpression:mean(ps.map(p=>p.neutralImpression)),scores:ps.map(p=>p.score)});
  }
  baseline.push({conditions:c,support:r.support,strong:r.strong,peak:r.peak,counts:r.counts,reaction:r.reaction});
 }
 assert.equal(mismatches.length,0,'v01 reproduction differs from saved baseline');
 const interventions=INTERVENTIONS.map(x=>({...x,...summarise(rowsById[x.id])}));
 const baselineWins=interventions[0].winners.bySample.balanced;assert.deepEqual(baselineWins,{support:398,strong:461,both:359});
 for(const id of ['cap-unclamped','impression-signed'])for(let i=0;i<baseline.length;i++){assert.equal(rowsById[id][i].support,rowsById.baseline[i].support);assert.equal(rowsById[id][i].strong,rowsById.baseline[i].strong);}
 const focus=baseline.filter(r=>r.conditions.seed===20261029&&r.conditions.model==='B'&&r.conditions.aging==='fixed'&&r.conditions.sample==='balanced'&&r.conditions.shop==='diner');
 const result={schema:'whisky-evaluation-v011-causal-audit/1',sourceVersion:V.VERSION,sourceBaseSha:'bdb683ec07b41b9507294b81d4a37ef01e2b9556',seeds:source.seeds,reproduction:{checkedConditions:checked,summaryFieldsCompared:'all saved fields, including bottle/recipe/profile, counts, aggregate numeric values, median guest, reaction and fan reaction',mismatches,baselineWins},interventions,axisDistances:[...axis].map(([key,a])=>({key,n:a.n,meanDistance:a.distance/a.n,meanWeightedContribution:a.weighted/a.n})),archetypeResults:[...archetypes].map(([key,a])=>({key,n:a.n,support:a.support/a.n,strong:a.strong/a.n,score:a.score/a.n,fit:a.fit/a.n})),fixedAgeFocus:focus,notes:['Uniform mixture changes cohort type only; exact same hash draws for every other attribute. Other interventions use original v01 cohorts unchanged.','Weights-salient applies a preferred-axis weight, not a recipe identity bonus. No candidate is selected in this causal audit.','Threshold and clipping ablations are measurement sensitivity checks, not a recommendation to equalise recipe wins.','Impression sign split does not alter support or scores; legacy impression magnitude remains the same.']};
 return result;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1])){
 const result=runAudit();fs.writeFileSync(new URL('audit-baseline.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({reproduction:result.reproduction,interventions:result.interventions.map(x=>({id:x.id,wins:x.winners.bySample.balanced,meanSupport:x.meanSupport,meanStrong:x.meanStrong,ceilingRate:x.ceilingRate,rawAboveOne:x.rawAboveOne}))},null,2));
}
