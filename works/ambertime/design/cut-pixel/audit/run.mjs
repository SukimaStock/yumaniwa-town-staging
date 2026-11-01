// Reproduce with: node works/ambertime/design/cut-pixel/audit/run.mjs
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {attachFlavor} from '../../../lab-flavor.mjs';
import {glassColor,GLASS_PALETTE} from '../../../flavor-color.mjs';
const out=fileURLToPath(new URL('.',import.meta.url)),keys=['fruit','grain','smoke','body'],weights={fruit:1.05,grain:.92,smoke:1.18,body:.89};
const rows=[],conditions={},bump=(o,k)=>o[k]=(o[k]||0)+1,rank=(p,w={fruit:1,grain:1,smoke:1,body:1})=>keys.toSorted((a,b)=>p[b]*w[b]-p[a]*w[a]);
for(const malt of ['plain','peat'])for(const ferment of ['short','long']){
 const condition=malt+'-'+ferment,c={count:0,rawMax:{},identityMax:{},mixed5:{},mixed10:{},normalizedMax:{},normalizedNameMismatch:0,shades:{},rawNameMismatch:0,representativeNameMismatch:0,mixedMarginMax:0,adjacentEdges:0,adjacentChanges:0,maxAdjacentDistance:0,maxChangedDistance:0,labelFamilies:{},maxSameFamilyDistance:0};conditions[condition]=c;
 const local=[],lookup=new Map();
 for(let start=0;start<=87;start++)for(let end=start+12;end<=99;end++){
  const f=attachFlavor({id:1},{malt,ferment,cask:'refill',start:start/99,end:end/99}).flavor,p=f.profile,g=glassColor(p),raw=rank(p)[0],normalized=rank(p,{fruit:1/.98,grain:1/.96,smoke:1/.74,body:1})[0];
  const row={condition,start,end,profile:p,label:f.label,primary:f.primary,...g};rows.push(row);local.push(row);lookup.set(start+':'+end,row);c.count++;
  bump(c.rawMax,raw);bump(c.identityMax,g.dominant);bump(c.mixed5,g.family);bump(c.mixed10,g.margin<1-1/1.1?'mixed':g.dominant);bump(c.normalizedMax,normalized);bump(c.shades,g.shade);c.normalizedNameMismatch+=normalized!==f.primary;c.rawNameMismatch+=raw!==f.primary;c.representativeNameMismatch+=g.family!=='mixed'&&g.family!==f.primary;
  if(g.family==='mixed')c.mixedMarginMax=Math.max(c.mixedMarginMax,g.margin);
  c.labelFamilies[f.label]??={};bump(c.labelFamilies[f.label],g.family);
 }
 const distance=(a,b)=>Math.hypot(...keys.map(k=>a.profile[k]-b.profile[k]));
 for(const row of local)for(const next of [[row.start+1,row.end],[row.start,row.end+1]]){
  const other=lookup.get(next.join(':'));if(!other)continue;c.adjacentEdges++;const d=distance(row,other);c.maxAdjacentDistance=Math.max(c.maxAdjacentDistance,d);if(row.family!==other.family){c.adjacentChanges++;c.maxChangedDistance=Math.max(c.maxChangedDistance,d);}
 }
 for(const family of Object.keys(GLASS_PALETTE)){
  const set=local.filter(r=>r.family===family);let max=0,pair=null;for(let i=0;i<set.length;i++)for(let j=i+1;j<set.length;j++){const d=distance(set[i],set[j]);if(d>max){max=d;pair=[[set[i].start,set[i].end],[set[j].start,set[j].end]];}}
  c.sameFamilySpread??={};c.sameFamilySpread[family]={maxDistance:max,pair};c.maxSameFamilyDistance=Math.max(c.maxSameFamilyDistance,max);
 }
}
fs.writeFileSync(out+'summary.json',JSON.stringify({source:'main 6c8b2be96c81646bab59ae69964342b5a46e6d94; adopted lab-flavor attachFlavor; 48 midpoint samples',legalCutsPerCondition:3916,total:rows.length,classification:'existing identity weights; mixed only when relative lead <5%; no position buckets',conditions},null,2)+'\n');
fs.writeFileSync(out+'profiles.csv','condition,start,end,fruit,grain,smoke,body,namePrimary,family,color,label\n'+rows.map(r=>[r.condition,r.start,r.end,...keys.map(k=>r.profile[k].toFixed(9)),r.primary,r.family,r.color,r.label].join(',')).join('\n')+'\n');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#272837"/><g font-family="sans-serif" fill="#f0e6c8">${body}</g></svg>`;
let heat='<text x="18" y="24" font-size="16">All 15,664 legal cuts — existing profiles / representative display only</text>';
for(const [i,condition]of Object.keys(conditions).entries()){
 const ox=18+(i%2)*330,oy=58+Math.floor(i/2)*345;heat+=`<text x="${ox}" y="${oy-10}" font-size="14">${condition}; x=start, y=end</text>`;
 for(const r of rows.filter(r=>r.condition===condition))heat+=`<rect x="${ox+r.start*3}" y="${oy+(99-r.end)*3}" width="3" height="3" fill="${r.color}"/>`;
}
fs.writeFileSync(out+'classification-map.svg',svg(680,755,heat));
const samples=[[0,12],[12,36],[24,66],[40,80],[70,99]],variants=['continuous','representative','shaded'];
let body='<text x="18" y="24" font-size="17">Same profiles: continuous / representative / representative + shades</text><text x="18" y="44" font-size="12">Each group uses the same confirmed 48-sample profile. Glass height is symbolic, identical.</text>';
let y=76;
for(const condition of Object.keys(conditions)){
 body+=`<text x="18" y="${y}" font-size="14">${condition}</text>`;y+=20;
 for(const [i,cut]of samples.entries()){
 const r=rows.find(r=>r.condition===condition&&r.start===cut[0]&&r.end===cut[1]),x=18+i*176;
 body+=`<text x="${x}" y="${y}" font-size="12">${r.start}–${r.end} ${r.family}</text>`;
 for(const [j,variant]of variants.entries()){
  const g=glassColor(r.profile,{variant}),gx=x+j*48,gy=y+9;
  body+=`<path d="M${gx} ${gy}v42h30v-42" fill="none" stroke="#b9c0aa" stroke-width="3"/><path d="M${gx+3} ${gy+21}h24v18h-24z" fill="${g.color}"/><path d="M${gx+3} ${gy+21}h24v3h-24z" fill="${g.highlight}"/><text x="${gx}" y="${gy+57}" font-size="10">${['A','B','C'][j]}</text>`;
 }
 }
 y+=100;
}
body+=`<text x="18" y="${y}" font-size="12">Actual in-game interior is narrower; these comparisons magnify equally. Colors never encode price or quality.</text>`;
fs.writeFileSync(out+'glass-comparison.svg',svg(900,y+25,body));
console.log(JSON.stringify({total:rows.length,conditions:Object.fromEntries(Object.entries(conditions).map(([k,c])=>[k,{counts:c.mixed5,mismatch:c.representativeNameMismatch,edges:c.adjacentEdges,changes:c.adjacentChanges,spread:c.maxSameFamilyDistance}]))},null,2));
