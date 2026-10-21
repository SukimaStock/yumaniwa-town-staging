import fs from 'node:fs';
import {run,summary,SEEDS,STRATEGIES,SHOPS,affinity,PRODUCTS} from './model.mjs';
const checkpoints=[10,30,60,90],rows=[];
for(const seed of SEEDS)for(const [strategy] of STRATEGIES)for(const years of checkpoints)rows.push({seed,strategy,...summary(run({seed,strategy},years))});
const ablations=[];
for(const seed of SEEDS)for(const mode of ['full','affinityOff','continuityOff','propagationOff'])ablations.push({seed,mode,...summary(run({seed,strategy:'C',affinityOn:mode!=='affinityOff',continuityOn:mode!=='continuityOff',propagationOn:mode!=='propagationOff'},60))});
const continuity=SEEDS.flatMap(seed=>['A','B'].flatMap(strategy=>[true,false].map(continuityOn=>({seed,strategy,continuityOn,...summary(run({seed,strategy,continuityOn},60))}))));
// Pure matched-receipt counterfactual: no propagation, all remaining at starter town.
// Isolates quarterly3 versus annual12; same total actual deliveries after bootstrap.
const matched=SEEDS.flatMap(seed=>['A','B'].map(strategy=>({seed,strategy,...summary(run({seed,strategy,propagationOn:false},60))})));
const fits=Object.fromEntries(SHOPS.map(n=>[n.id,Object.fromEntries(Object.entries(PRODUCTS).map(([k,p])=>[k,affinity(n,p)]))]));
const result={format:'ambertime-reputation-v03-results',checkpoints,rows,ablations,continuity,matched,fits};
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.table(rows.filter(x=>x.seed===SEEDS[0]).map(x=>({strategy:x.strategy,years:x.years,known:x.known.join(','),interested:x.interested.join(','),trading:x.trading.join(','),delivered:x.delivered,inventory:x.inventory})));
