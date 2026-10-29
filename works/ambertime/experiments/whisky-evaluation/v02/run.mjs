import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import * as M from './model.mjs';
import {acceptance} from '../../../market-sales.mjs';
const dir=new URL('.',import.meta.url),seeds=Array.from({length:100},(_,i)=>i+1),ages=M.AGES,tiers=Object.keys(M.PRICE_TIERS),horizons=[1,3,6];
const columns=['seed','recipe','years','tier','shop','months','sold','remaining','revenue','evaluations','supportCount','strongCount','missCount','meanScore','rawPeak','positiveImpression','negativeImpression','acceptance','price'];
const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"',line=r=>r.map(quote).join(','),rows=[line(columns)];
const sums={},grouped=new Map(),examples=[],holdouts=[];
for(const malt of ['plain','peat'])for(const ferment of ['short','long'])for(const cask of ['refill','first'])holdouts.push({id:`hold-${holdouts.length}`,recipe:{malt,ferment,cask,start:.22,end:.84}});
const allRecipes=[...M.SAMPLES.map(x=>({id:x.id,sample:x.id})),...holdouts.map(x=>({...x,sample:'balanced'}))];
const mean=a=>a.length?a.reduce((a,b)=>a+b,0)/a.length:null;
function add(key,row){if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);}
function sample(seed,h,years,tier,shopId){
 // The initial eight-year bottle remains in hand; all compared test lots start at month1.
 let s=M.create({seed});s=M.transact(s,{type:'advance',months:1});s=M.transact(s,{type:'next',sample:h.sample,recipe:h.recipe??null,years,tier});s=M.transact(s,{type:'place',shopId,portion:'all'});s=M.transact(s,{type:'confirm'});
 const p=s.products[1],a=acceptance(M.SHOPS.find(d=>d.id===shopId).nativeVenue,M.salesItem(p,5));
 for(let months=1;months<=6;months++){
  s=M.transact(s,{type:'advance',months:1});
  if(!horizons.includes(months))continue;const summary=M.productSummary(s,p.id),r=summary.byShop.find(x=>x.shopId===shopId),people=r.evaluations,n=people.length;
  const row={seed,recipe:h.id,years,tier,shop:shopId,months,sold:summary.sold,remaining:r.remaining,revenue:summary.revenue,evaluations:n,supportCount:r.positive,strongCount:r.strong,missCount:r.negative,meanScore:mean(people.map(x=>x.score)),rawPeak:n?Math.max(...people.map(x=>x.rawScore)):null,positiveImpression:mean(people.map(x=>x.positiveImpression)),negativeImpression:mean(people.map(x=>x.negativeImpression)),acceptance:a,price:p.price};
  if(row.sold!==n||row.sold+row.remaining!==5||Math.abs(row.revenue-row.sold*row.price)>.001)throw Error('Simulation observation does not match transactional inventory');
  rows.push(line(columns.map(c=>row[c])));add([h.id,years,tier,shopId,months].join(':'),row);
  if(seed===42&&tier==='standard'&&[1,8,20].includes(years)&&months===3&&M.SAMPLES.some(x=>x.id===h.id))examples.push({...row,reactions:people.map(x=>({verdict:x.verdict,text:x.reaction.text,reasons:x.reaction.reasons}))});
 }
 if(seed===1&&h.id==='balanced'&&years===8&&tier==='standard'&&shopId==='bar'){const text=M.serialize(s);if(M.serialize(M.restore(text))!==text)throw Error('replay mismatch');fs.writeFileSync(new URL('example-log.json',dir),text+'\n');}
}
for(const seed of seeds){for(const h of allRecipes)for(const years of (h.id.startsWith('hold-')?[1,8,20]:ages))for(const tier of tiers)for(const d of M.SHOPS)sample(seed,h,years,tier,d.id);console.log('seed',seed,'complete');}
function distribution(values){const a=values.filter(x=>x!==null).sort((a,b)=>a-b);return a.length?{n:a.length,mean:mean(a),min:a[0],p10:a[Math.floor((a.length-1)*.1)],p50:a[Math.floor((a.length-1)*.5)],p90:a[Math.floor((a.length-1)*.9)],max:a.at(-1)}:{n:0,mean:null};}
const summaries=[...grouped].map(([key,g])=>({key,recipe:g[0].recipe,years:g[0].years,tier:g[0].tier,shop:g[0].shop,months:g[0].months,sold:distribution(g.map(x=>x.sold)),revenue:distribution(g.map(x=>x.revenue)),strongCount:distribution(g.map(x=>x.strongCount)),supportCount:distribution(g.map(x=>x.supportCount)),missCount:distribution(g.map(x=>x.missCount)),meanScore:distribution(g.map(x=>x.meanScore)),noSale:g.filter(x=>x.sold===0).length,allSold:g.filter(x=>x.sold===5).length,acceptance:g[0].acceptance,price:g[0].price}));
const perSeedWinners={sold:Object.fromEntries(M.SHOPS.map(d=>[d.id,0])),strong:Object.fromEntries(M.SHOPS.map(d=>[d.id,0])),pareto:Object.fromEntries(M.SHOPS.map(d=>[d.id,0])),groups:0};
for(const h of allRecipes)for(const years of (h.id.startsWith('hold-')?[1,8,20]:ages))for(const tier of tiers)for(const months of horizons){const sets=M.SHOPS.map(d=>grouped.get([h.id,years,tier,d.id,months].join(':')));for(let i=0;i<seeds.length;i++){const g=sets.map(a=>a[i]),bestSold=Math.max(...g.map(x=>x.sold)),bestStrong=Math.max(...g.map(x=>x.strongCount));perSeedWinners.groups++;for(const r of g){perSeedWinners.sold[r.shop]+=r.sold===bestSold;perSeedWinners.strong[r.shop]+=r.strongCount===bestStrong;perSeedWinners.pareto[r.shop]+=!g.some(x=>x.sold>=r.sold&&x.strongCount>=r.strongCount&&(x.sold>r.sold||x.strongCount>r.strongCount));}}}
const result={version:M.VERSION,evaluationVersion:M.EVALUATION_VERSION,salesVersion:M.SALES_VERSION,baseSha:'82d93017725760e9f4c441386de6ea3f267bbb80',seeds,ages,tiers,months:horizons,initialBottles:5,shops:M.SHOPS,holdouts,conditionCount:(rows.length-1)/3,observationRows:rows.length-1,columns,notes:['比較瓶は月1に準備。最初の8年瓶は手元に保持。1/3/6か月後は暦月2/4/7。','各購入瓶を1評価事例とする仮説。実在人数や120人全員の試飲ではない。','支持率は評価事例がある条件だけ。無販売を0点として平均しない。'],perSeedWinners,summaries,examples};
fs.writeFileSync(new URL('results.json',dir),JSON.stringify(result)+'\n');fs.writeFileSync(new URL('comparison.csv.gz',dir),gzipSync(rows.join('\n')+'\n',{level:9}));
fs.writeFileSync(new URL('examples.csv',dir),'\uFEFF'+[line(columns),...examples.map(r=>line(columns.map(c=>r[c])))].join('\n')+'\n');console.log(JSON.stringify({conditionCount:result.conditionCount,observationRows:result.observationRows,perSeedWinners},null,2));
