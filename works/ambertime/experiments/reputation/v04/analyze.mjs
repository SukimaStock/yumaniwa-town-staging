import fs from 'node:fs';
import {SEEDS,STRATEGIES,NODES,SHOPS,PRODUCTS,affinity,run,summary,create,step,deliver,productionCalendar,peakCasks} from './model.mjs';
const checkpoints=[10,30,60,90],rows=[];
function compact(s){const v=summary(s);for(const n of Object.values(v.nodes))delete n.history;return v;}
for(const seed of SEEDS)for(const {id:strategy} of STRATEGIES)for(const sns of [false,true])for(const years of checkpoints)rows.push({seed,strategy,sns,...compact(run({seed,strategy,sns},years))});
const ablations=SEEDS.flatMap(seed=>['full','noRoots','noMemory','noBridges'].map(mode=>({seed,mode,...compact(run({seed,strategy:'mixed',rootedness:mode!=='noRoots',memory:mode!=='noMemory',bridges:mode!=='noBridges'},90))})));
// Matched town receipts: exact same total, independent of discovery/allocation.
function matched({seed,bulk=false,alternating=false,rootedness=true,memory=true,gap=0}){
 const s=create({seed,rootedness,memory});
 const assign=lot=>{if(!alternating)return;const kind=lot.product.release%2?'young':'long';lot.product={...PRODUCTS[kind],brand:'AmberTime',release:lot.product.release,kind};};assign(s.lots[0]);
 for(let m=0;m<360;m++){step(s,{ship:false});if(s.month%18===0)assign(s.lots.at(-1));if(s.month%12===0&&bulk||s.month%3===0&&!bulk)deliver(s,'town',bulk?12:3);}
 for(let i=0;i<gap;i++)step(s,{ship:false});return compact(s);
}
const matchedRows=SEEDS.flatMap(seed=>[['quarterly',{}],['annual',{bulk:true}],['same',{memory:true}],['alternating',{alternating:true}],['noRoots',{rootedness:false}],['noMemory',{memory:false}],['shortGap',{gap:12}],['longGap',{gap:120}]].map(([condition,o])=>({seed,condition,...matched({seed,...o})})));
const fits=Object.fromEntries(NODES.map(n=>[n.id,Object.fromEntries(Object.entries(PRODUCTS).map(([k,p])=>[k,affinity(n,p)]))]));
const supply=STRATEGIES.map(({id})=>({strategy:id,peak:peakCasks(productionCalendar(id)),calendar:productionCalendar(id)}));
const result={format:'ambertime-reputation-v04-results',seeds:SEEDS,checkpoints,rows,ablations,matched:matchedRows,fits,supply};
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(result)+'\n');
console.table(rows.filter(x=>x.seed===SEEDS[0]&&!x.sns).map(x=>({strategy:x.strategy,years:x.years,root:x.localRoot.toFixed(3),townKnown:SHOPS.filter(n=>x.known.includes(n.id)).length,remote:x.remoteKnown.join(','),trade:x.trading.join(','),delivered:x.delivered})));
