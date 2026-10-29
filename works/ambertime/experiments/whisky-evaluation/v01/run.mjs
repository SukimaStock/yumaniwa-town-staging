import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as M from './model.mjs';
const dir=fileURLToPath(new URL('.',import.meta.url)),rows=[];
const seeds=[M.SEED,42,1,7,31];
for(const seed of seeds)for(const aging of ['actual','fixed'])for(const model of Object.keys(M.MODELS))for(const sample of M.SAMPLES)for(const shop of M.SHOPS)for(const years of M.AGES){
 const r=M.evaluate({seed,aging,model,sample:sample.id,shop:shop.id,years});
 rows.push({conditions:r.conditions,bottle:r.bottle,counts:r.counts,support:r.support,strong:r.strong,peak:r.peak,fit:r.fit,maturity:r.maturity,impression:r.impression,reaction:r.reaction,medianGuest:r.medianGuest,fan:r.fan});
}
const result={version:M.VERSION,baseSha:'8bd15572e10b4dc51fca2c1c3cc025668719caab',seeds,cohortSize:120,referenceYears:6,results:rows};
fs.writeFileSync(dir+'results.json',JSON.stringify(result)+'\n');fs.writeFileSync(dir+'comparison.csv',M.csv(result));fs.writeFileSync(dir+'example-log.json',JSON.stringify(M.exportLog(M.DEFAULT))+'\n');
const baseline=rows.filter(r=>r.conditions.seed===M.SEED&&r.conditions.model==='B'&&r.conditions.aging==='actual');
console.log(JSON.stringify({rows:rows.length,peopleEvaluated:rows.length*120,baseline:baseline.filter(r=>[1,20].includes(r.conditions.years)).map(r=>({sample:r.conditions.sample,shop:r.conditions.shop,years:r.conditions.years,support:r.support,strong:r.strong,peak:r.peak}))},null,2));
