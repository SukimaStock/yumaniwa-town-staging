// Exhaustive existing-taste audit. These are read-only projections, never player saves.
import {execFileSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {affinity as townFit,NODES as TOWN_NODES} from '../ambertime/experiments/town-simulation/v01/model.mjs';
import {attachFlavor} from '../ambertime/lab-flavor.mjs';
import {cutProfile,streamProfile,AXES,FIXED_LITRES} from './projection.mjs';
execFileSync('git',['diff','--quiet','e23095e200a3728092c307735dfd664fca78fcdb','--',':(glob)works/ambertime/*.mjs','works/ambertime-flavor-lab-v02','works/ambertime/experiments/town-simulation','works/ambertime/experiments/reputation'],{cwd:fileURLToPath(new URL('../../',import.meta.url))});
const dir=fileURLToPath(new URL('./audit/',import.meta.url));fs.mkdirSync(dir,{recursive:true});
const all=[],conditions=[],ageGroups=[],heatmaps=[],ages=[0,12,60,120],casks=['refill','first'];
const range=a=>({min:Math.min(...a),max:Math.max(...a),mean:a.reduce((x,y)=>x+y,0)/a.length});
const dist=(a,b)=>Math.sqrt(['fruit','grain','smoke','body','rough','spice'].reduce((n,k)=>n+(a[k]-b[k])**2,0)/6);
const statProfiles=rows=>Object.fromEntries(AXES.map(k=>[k,range(rows.map(r=>r.profile[k]))]));
function svg(rows,malt,ferment,axis){const color=v=>{const a=[44,48,66],b=[218,210,177];return '#'+a.map((n,i)=>Math.round(n+(b[i]-n)*v).toString(16).padStart(2,'0')).join('');};const groups=new Map();for(const r of rows){const c=color(r.profile[axis]);groups.set(c,(groups.get(c)??'')+`M${42+r.start*3},${22+(99-r.end)*3}h3v3h-3z`);}const cells=[...groups].map(([c,d])=>`<path fill="${c}" d="${d}"/>`).join('');return `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="360" viewBox="0 0 380 360"><rect width="380" height="360" fill="#202330"/><g fill="#ece4cd" font-family="sans-serif" font-size="12"><text x="42" y="14">${malt}/${ferment} ${axis} (0 dark → 1 light)</text><text x="42" y="335">start 0 → 87 · end 99(top) → 12(bottom)</text></g>${cells}<path d="M42 22V322H339" fill="none" stroke="#ece4cd"/></svg>`;}
for(const malt of ['plain','peat'])for(const ferment of ['short','long']){
 const rows=[];let averagedMaxError=0;
 for(let start=0;start<=87;start++)for(let end=start+12;end<=99;end++){
  const r=cutProfile({malt,ferment,start,end,labelHistory:false});
  const avg=Object.fromEntries(AXES.map(k=>[k,0]));for(let i=0;i<48;i++){const f=streamProfile(start+(end-start)*(i+.5)/48,{malt,ferment});for(const k of AXES)avg[k]+=f[k]/48;}
  for(const k of AXES)averagedMaxError=Math.max(averagedMaxError,Math.abs(r.raw[k]-Math.min(1,Math.max(0,avg[k]))));
  assert.deepEqual(r.profile,cutProfile({malt,ferment,start,end,labelHistory:false}).profile);
  rows.push(r);all.push([malt,ferment,start,end,...AXES.map(k=>r.profile[k]),r.price,r.shopAffinity['town-liquor'],r.shopAffinity.supermarket]);
 }
 assert.equal(rows.length,3916);assert(averagedMaxError<1e-10);
 const find=(a,b)=>rows.find(r=>r.start===a&&r.end===b);
 const startDiffs=[],endDiffs=[];for(const r of rows){if(r.width>12){startDiffs.push(dist(r.profile,find(r.start+1,r.end).profile));endDiffs.push(dist(r.profile,find(r.start,r.end-1).profile));}}
 const bins={};for(const r of rows){const key=AXES.map(k=>Math.round(r.profile[k]*10)).join(',');bins[key]=(bins[key]??0)+1;}
 const widths=[];for(let w=12;w<=99;w++){const rs=rows.filter(r=>r.width===w);widths.push({width:w,count:rs.length,profileRanges:statProfiles(rs),meanRoughness:range(rs.map(r=>r.profile.rough)),labels:new Set(rs.map(r=>r.label)).size});}
 const labels=Object.fromEntries([...new Set(rows.map(r=>r.label))].map(label=>[label,rows.filter(r=>r.label===label).length]));
 const pairs=[[[12,60],[24,60]],[[24,52],[24,80]],[[0,99],[30,70]],[[24,52],[50,78]]].map(([a,b])=>({a,b,rms:dist(find(...a).profile,find(...b).profile),profileA:find(...a).profile,profileB:find(...b).profile}));
 const group={malt,ferment,intervals:rows.length,exactUniqueProfiles:new Set(rows.map(r=>JSON.stringify(r.profile))).size,axes:statProfiles(rows),labels,widths,startOneStepRMS:range(startDiffs),endOneStepRMS:range(endDiffs),coarsePointOneBins:Object.keys(bins).length,largestCoarseBin:Math.max(...Object.values(bins)),averagedMaxError,pairs};
 conditions.push(group);
 for(const axis of ['fruit','grain','smoke','body','rough','spice']){const name=`${malt}-${ferment}-${axis}.svg`;fs.writeFileSync(path.join(dir,name),svg(rows,malt,ferment,axis));heatmaps.push(name);}
 for(const cask of casks)for(const months of ages){
  const aged=rows.map(r=>cutProfile({malt,ferment,start:r.start,end:r.end,cask,months,labelHistory:false}));
  const priceRange=range(aged.map(r=>r.price)),priceHist={};for(const r of aged)priceHist[r.price]=(priceHist[r.price]??0)+1;
  const best=(f)=>{let v=-Infinity,out=[];for(const r of aged){const n=f(r);if(n>v+1e-10){v=n;out=[r];}else if(Math.abs(n-v)<1e-10)out.push(r);}return {value:v,count:out.length,examples:out.slice(0,5).map(r=>[r.start,r.end])};};
  const townReactionFits=Object.fromEntries(TOWN_NODES.filter(n=>n.taste).map(n=>[n.id,range(aged.map(r=>townFit(n,{...r.scalar,age:months,price:30,aromaFamily:r.primary},true).fit))]));
  const bestPrice=best(r=>r.price),lowRough=best(r=>-r.profile.rough),highCharacter=best(r=>r.scalar.character),shopBest=Object.fromEntries(['town-liquor','supermarket'].map(id=>[id,best(r=>r.shopAffinity[id])]));
  const pareto=[];for(const r of aged){let dominated=false;for(const q of aged){if(q===r)continue;if(q.price>=r.price&&q.profile.rough<=r.profile.rough&&q.scalar.character>=r.scalar.character&&(q.price>r.price||q.profile.rough<r.profile.rough||q.scalar.character>r.scalar.character)){dominated=true;break;}}if(!dominated)pareto.push([r.start,r.end]);}
  ageGroups.push({malt,ferment,cask,months,count:aged.length,price:priceRange,uniquePrices:Object.keys(priceHist).length,atFloor16:priceHist['16']??0,axes:statProfiles(aged),affinity:Object.fromEntries(['town-liquor','supermarket'].map(id=>[id,range(aged.map(r=>r.shopAffinity[id]))])),acceptance:Object.fromEntries(['retail','town-liquor','supermarket'].map(id=>[id,range(aged.map(r=>r.acceptance[id]))])),townReactionFits,departmentProductConditionPass:aged.filter(r=>r.departmentProductCondition==='').length,bestPrice,lowestRoughness:{...lowRough,value:-lowRough.value},highCharacter,shopBest,scalarPareto:pareto,paretoWarning:'Only private price/roughness/character scalar axes; ignores family preference, stock, events, sales time and player taste. Not a recommended cut.'});
 }
}
const sourcePaths=['../ambertime/lab-flavor.mjs','../ambertime-flavor-lab-v02/model.mjs','../ambertime/model.mjs','../ambertime/economy.mjs','../ambertime/market-sales.mjs','../ambertime/brand-reputation.mjs','../ambertime/town-connection.mjs','../ambertime/experiments/town-simulation/v01/model.mjs','../ambertime/experiments/reputation/v03/model.mjs'];
const sources=Object.fromEntries(sourcePaths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(new URL(p,import.meta.url))).digest('hex')]));
fs.writeFileSync(path.join(dir,'profiles.json'),JSON.stringify({schema:'ambertime-cut-profiles/1',columns:['malt','ferment','start','end',...AXES,'price','townAffinity','supermarketAffinity'],rows:all}));
const result={schema:'ambertime-cut-audit/1',base:'e23095e200a3728092c307735dfd664fca78fcdb',sources,legalIntervals:3916,totalRawProfiles:all.length,totalDownstreamProfiles:ageGroups.reduce((n,r)=>n+r.count,0),fixedLitres:FIXED_LITRES,ages,casks,conditions,ageGroups,heatmaps,method:'Existing 48-point position average; main normalized flavor, Lab.mature then main projectFlavor/salePrices/market affinity & acceptance. Pure projections not native finance simulations or player saves. All legal intervals; discrete 0.1 bins only quantify coarse resemblance, not exact equality.'};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(result,null,2));console.log(`PASS ${all.length} raw profiles, ${result.totalDownstreamProfiles} downstream profiles, 24 heatmaps; 48-sample stream identity and determinism`);
