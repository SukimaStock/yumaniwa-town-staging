import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import * as B from '../v01/model.mjs';
import * as N from './model.mjs';
import {distill,mature,expression} from '../../../../ambertime-flavor-lab-v02/model.mjs';
const dir=fileURLToPath(new URL('.',import.meta.url));
const seeds=[20261029,42,1,7,31];for(let i=2;seeds.length<30;i++)if(!seeds.includes(i))seeds.push(i);
const variants=['baseline',...Object.keys(N.VARIANTS)],metrics=['support','strong','ceilingRate','nearCeilingRate','peak','rawPeak','supportStrength','rawSupportStrength','positiveImpression','negativeImpression'];
const round=x=>Math.round(x*1e8)/1e8,rows=[],fullCSV=[],columns=['seed','aging','model','sample','shop','years','variant',...metrics,'p10','p50','p90','histogram'];
const quote=x=>'"'+String(x).replaceAll('"','""')+'"',line=values=>values.map(quote).join(',');
fullCSV.push(line(columns));
const cohortCache=new Map(),bottleCache=new Map();
function people(c){const key=c.seed+':'+c.shop;if(!cohortCache.has(key))cohortCache.set(key,B.cohort(c.shop,c.seed));return cohortCache.get(key);}
function bottle(c){const key=[c.sample,c.years,c.aging,c.referenceYears].join(':');if(!bottleCache.has(key))bottleCache.set(key,B.bottle(c));return bottleCache.get(key);}
const acc=()=>({n:0,sums:Object.fromEntries(metrics.map(m=>[m,0])),cappedConditions:0,negativePeople:0,positivePeople:0,strongPeople:0});
function add(a,r){a.n++;for(const m of metrics)a.sums[m]+=r[m];a.cappedConditions+=r.ceilingRate>0?1:0;a.negativePeople+=r.counts.miss;a.positivePeople+=r.counts.strong+r.counts.like;a.strongPeople+=r.counts.strong;}
function done(a){return {...a,means:Object.fromEntries(metrics.map(m=>[m,a.sums[m]/a.n]))};}
const aggregate=Object.fromEntries(variants.map(v=>[v,acc()])),bySeed=Object.fromEntries(seeds.map(s=>[s,Object.fromEntries(variants.map(v=>[v,acc()]))])),wins=Object.fromEntries(variants.map(v=>[v,{groups:0,support:Object.fromEntries(B.SAMPLES.map(s=>[s.id,0])),strong:Object.fromEntries(B.SAMPLES.map(s=>[s.id,0])),both:Object.fromEntries(B.SAMPLES.map(s=>[s.id,0]))}]));
const ageChecks=Object.fromEntries(variants.map(v=>[v,{pairs:0,allUp:0,mixed:0,moreStrong:0,narrowerSupport:0,both:0,byShop:Object.fromEntries(B.SHOPS.map(s=>[s.id,{pairs:0,allUp:0,mixed:0}]))}]));
const examples=[],curveAge=[],seedWinRecords=[];
for(const seed of seeds){
 const groups=new Map();
 for(const aging of ['actual','fixed'])for(const model of Object.keys(B.MODELS))for(const shop of B.SHOPS)for(const years of B.AGES)for(const sample of B.SAMPLES){
  const c=B.conditions({seed,aging,model,shop:shop.id,years,sample:sample.id}),b=bottle(c),g=people(c);
  const groupKey=[aging,model,shop.id,years].join(':');if(!groups.has(groupKey))groups.set(groupKey,Object.fromEntries(variants.map(v=>[v,[]])));
  for(const variant of variants){
   const r=variant==='baseline'?N.baseline(c,b,g):N.evaluate(c,variant,b,g);
   add(aggregate[variant],r);add(bySeed[seed][variant],r);groups.get(groupKey)[variant].push({sample:sample.id,support:r.support,strong:r.strong});
   const fields=[seed,aging,model,sample.id,shop.id,years,variant,...metrics.map(m=>round(r[m])),round(r.quantiles[.1]),round(r.quantiles[.5]),round(r.quantiles[.9]),r.histogram.join('|')];fullCSV.push(line(fields));
   if(seeds.indexOf(seed)<5)rows.push(fields);
   if(seed===B.SEED&&model==='B')curveAge.push({variant,aging,shop:shop.id,sample:sample.id,years,...Object.fromEntries(metrics.map(m=>[m,r[m]]))});
   if(years===20){
    const youngC={...c,years:1},youngBottle=bottle(youngC),young=variant==='baseline'?N.baseline(youngC,youngBottle,g):N.evaluate(youngC,variant,youngBottle,g),delta=N.differences(young,r),a=ageChecks[variant];
    a.pairs++;a.byShop[shop.id].pairs++;if(delta.up===120){a.allUp++;a.byShop[shop.id].allUp++;}if(delta.up>0&&delta.down>0){a.mixed++;a.byShop[shop.id].mixed++;}if(delta.strong>0)a.moreStrong++;if(delta.support<0)a.narrowerSupport++;if(delta.strong>0&&delta.support<0)a.both++;
    if(seed===B.SEED&&model==='B')examples.push({variant,conditions:c,young:{support:young.support,strong:young.strong,peak:young.peak},old:{support:r.support,strong:r.strong,peak:r.peak},delta});
   }
  }
 }
 const seedWins=Object.fromEntries(variants.map(v=>[v,{support:0,strong:0,both:0}]));
 for(const group of groups.values())for(const variant of variants){const values=group[variant],s=Math.max(...values.map(x=>x.support)),t=Math.max(...values.map(x=>x.strong)),w=wins[variant];w.groups++;for(const v of values){if(v.support===s)w.support[v.sample]++;if(v.strong===t)w.strong[v.sample]++;if(v.support===s&&v.strong===t)w.both[v.sample]++;if(v.sample==='balanced'){seedWins[variant].support+=v.support===s;seedWins[variant].strong+=v.strong===t;seedWins[variant].both+=v.support===s&&v.strong===t;}}}
 seedWinRecords.push({seed,groups:groups.size,variants:seedWins});console.log('representative seed',seed,'complete');
}
const holdouts=[];for(const malt of ['plain','peat'])for(const ferment of ['short','long'])for(const cask of ['refill','first'])for(const [start,end] of [[.05,.35],[.58,.94]])holdouts.push({id:'hold-'+holdouts.length,recipe:{malt,ferment,cask,start,end}});
const holdAcc={baseline:acc(),guarded:acc()},holdAge={baseline:{pairs:0,allUp:0,mixed:0},guarded:{pairs:0,allUp:0,mixed:0}},holdCSV=[line(columns)],holdByRecipe=Object.fromEntries(holdouts.map(h=>[h.id,{recipe:h.recipe,baseline:acc(),guarded:acc()}]));
for(const seed of seeds){
 for(const h of holdouts)for(const aging of ['actual','fixed'])for(const model of Object.keys(B.MODELS))for(const shop of B.SHOPS){
  const spirit=distill(h.recipe),g=people({shop:shop.id,seed}),young={};
  for(const years of B.AGES){
   const c=B.conditions({seed,aging,model,shop:shop.id,years}),flavorYears=aging==='actual'?years:6,profile=mature(spirit,flavorYears,h.recipe.cask),b={sample:h.id,name:h.id,recipe:h.recipe,years,flavorYears,profile,expression:expression(profile,spirit)};
   for(const variant of ['baseline','guarded']){
    const r=variant==='baseline'?N.baseline(c,b,g):N.evaluate(c,variant,b,g);add(holdAcc[variant],r);add(holdByRecipe[h.id][variant],r);
    holdCSV.push(line([seed,aging,model,h.id,shop.id,years,variant,...metrics.map(m=>round(r[m])),round(r.quantiles[.1]),round(r.quantiles[.5]),round(r.quantiles[.9]),r.histogram.join('|')]));
    if(years===1)young[variant]=r;if(years===20){const d=N.differences(young[variant],r),a=holdAge[variant];a.pairs++;if(d.up===120)a.allUp++;if(d.up>0&&d.down>0)a.mixed++;}
   }
  }
 }
 console.log('holdout seed',seed,'complete');
}
const result={version:N.VERSION,baseSha:'bdb683ec07b41b9507294b81d4a37ef01e2b9556',adopted:N.ADOPTED,seeds,cohortSize:120,conditionCountPerVariant:seeds.length*432,variants:N.VARIANTS,aggregate:Object.fromEntries(variants.map(v=>[v,done(aggregate[v])])),wins,bySeed:Object.fromEntries(seeds.map(s=>[s,Object.fromEntries(variants.map(v=>[v,done(bySeed[s][v])]))])),seedWinRecords,ageChecks,examples,curveAge,holdout:{recipes:holdouts,conditionsPerVariant:holdAcc.guarded.n,aggregate:Object.fromEntries(['baseline','guarded'].map(v=>[v,done(holdAcc[v])])),ageChecks:holdAge,byRecipe:Object.fromEntries(holdouts.map(h=>[h.id,{recipe:h.recipe,...Object.fromEntries(['baseline','guarded'].map(v=>[v,done(holdByRecipe[h.id][v])]))}]))},columns,rows};
fs.writeFileSync(dir+'results.json',JSON.stringify(result)+'\n');fs.writeFileSync(dir+'comparison.csv','\uFEFF'+[line(columns),...rows.map(line)].join('\n')+'\n');fs.writeFileSync(dir+'all-30-seeds.csv.gz',gzipSync(fullCSV.join('\n')+'\n',{level:9}));fs.writeFileSync(dir+'holdout-30-seeds.csv.gz',gzipSync(holdCSV.join('\n')+'\n',{level:9}));
console.log(JSON.stringify({seeds:seeds.length,representativeConditionsPerVariant:result.conditionCountPerVariant,holdoutConditionsPerVariant:holdAcc.guarded.n,wins,ageChecks,aggregate:result.aggregate,holdout:result.holdout.aggregate},null,2));
