// Analysis only. Yield functions change only in owned temporary native copies, never player saves.
// Taste/aging/prices/sales/costs/upkeep are the existing game APIs; candidate states are
// deliberately NOT claimed valid replay saves until a versioned production adapter exists.
import {createHash} from 'node:crypto';import fs from 'node:fs';import assert from 'node:assert/strict';import os from 'node:os';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import * as D from '../../partner-orders.mjs';import {runCareer} from '../../experiments/market-design/v01/run.mjs';
const sourceGuardBase='e23095e200a3728092c307735dfd664fca78fcdb',sourceGuardRepo=fileURLToPath(new URL('../../../../',import.meta.url));
execFileSync('git',['diff','--quiet',sourceGuardBase,'--',':(glob)works/ambertime/*.mjs','works/ambertime-flavor-lab-v02','works/ambertime/experiments/town-simulation','works/ambertime/experiments/reputation','works/ambertime/experiments/market-design'],{cwd:sourceGuardRepo});
const round=x=>Math.round(x*100)/100;
const oldEnd=p=>24+16*(69/70)*(p/99),oldFlow=p=>p<=30?24*p/30:24+16*(p-30)/70;
const standard=oldEnd(65),total=oldEnd(99),exponent=Math.log(1-standard/total)/Math.log(1-65/99);
const beta33=x=>10*x**3-15*x**4+6*x**5,beta34=x=>20*x**3-45*x**4+36*x**5-10*x**6;
const beta35=x=>35*x**3-105*x**4+126*x**5-70*x**6+15*x**7;
const flowFloor=9,centralFloorMix=((standard-flowFloor*65/99)/(total-flowFloor)-beta34(65/99))/(beta35(65/99)-beta34(65/99));
const centralMix=(standard/total-beta33(65/99))/(beta34(65/99)-beta33(65/99));
export const models={
 pureCentral:{label:"中央型beta混合・標準0→65維持・総量39.77L",cumulative:p=>total*((1-centralMix)*beta33(p/99)+centralMix*beta34(p/99))},
 central:{label:"中央型beta混合+9L基底・標準0→65維持・総量39.77L",cumulative:p=>flowFloor*p/99+(total-flowFloor)*((1-centralFloorMix)*beta34(p/99)+centralFloorMix*beta35(p/99))},
 old:{label:'従来：終了点のみ',volume:(a,b)=>round(oldEnd(b))},
 currentFlow:{label:'既存進行液量の差分',cumulative:oldFlow},
 reanchor:{label:'旧終了点曲線を30まで連続補間',cumulative:p=>p<=30?oldEnd(30)*p/30:oldEnd(p)},
 smooth40:{label:'総量39.77L・標準0→65維持の前寄り曲線',cumulative:p=>total*(1-(1-p/99)**exponent)},
 calibrated:{label:'既存進行曲線を標準量へ倍率補正',cumulative:p=>oldFlow(p)*standard/oldFlow(65)}
};
for(const m of Object.values(models))m.volume??=((a,b)=>round(Math.max(0,m.cumulative(b)-m.cumulative(a))));
const ranges=[[0,12],[0,65],[15,75],[20,80],[24,52],[30,70],[50,70],[70,90],[45,57],[87,99],[0,99]];
let centralLegalIntervals=0;for(let a=0;a<=87;a++)for(let b=a+12;b<=99;b++){const v=models.central.volume(a,b);assert(v>=1&&v<=40);assert.equal(v,models.central.volume(a,b));assert.equal(models.central.volume(a,a),0);centralLegalIntervals++;}assert.equal(models.central.volume(0,65),models.old.volume(0,65));assert.equal(models.central.volume(0,99),models.old.volume(0,99));
let previous=-1;for(let i=0;i<=9900;i++){const v=models.central.cumulative(i/100);assert(Number.isFinite(v)&&v>=previous&&v<=40);previous=v;}assert.equal(models.central.cumulative(0),0);
if(process.argv.includes('--check-matrix')){console.log(`PASS ${centralLegalIntervals} legal interval pairs; 9901 cumulative samples monotonic finite <=40; zero start, >=1L legal stop, deterministic, reference and full yield exact`);process.exit(0);}
const rows=[];
for(const [a,b] of ranges)for(const [id,m] of Object.entries(models)){
 let s=D.newMarketRulesDistillery(42);s=D.startRangeDistillation(s);while(s.still.distillation.progress<a)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<b)s=D.distillStep(s);s=D.stopDistillation(s);
 const volume=m.volume(a,b),bottleCount=Math.floor((volume+1e-9)/.7),flavor=s.core.spirit.flavor.profile;
 const fillable=volume>=1;
 if(fillable){s.core.spirit.litres=volume;s.core.spirit.initialLitres=volume;s.still.distillation.litres=volume;s.still.batch.initialLitres=volume;}
 s=D.fillBarrel(s,'refill');const c=s.core.casks.at(-1);s=D.bottleBranded(s,c.id,{});const p=s.core.products.at(-1),unitPrice=D.salePrices(s,p.id).standard;
 rows.push({model:id,start:a,end:b,litres:volume,flavor,roughness:flavor.rough,character:Math.max(flavor.fruit,flavor.grain,flavor.body,flavor.smoke),fillable,bottles:bottleCount,price:unitPrice,valuePerLitre:round(unitPrice/.7),grossPotential:round(bottleCount*unitPrice),distillationCost:120,caskCost:100,bottlingCost:3*bottleCount,productionCost:round(220+3*bottleCount),potentialBeforeUpkeep:round(bottleCount*(unitPrice-3)-220)});
}
for(const range of ranges){const r=rows.filter(x=>x.start===range[0]&&x.end===range[1]);for(const x of r)assert.deepEqual(x.flavor,r[0].flavor);}
const priorPath=new URL('./comparison.json',import.meta.url),prior=fs.existsSync(priorPath)?JSON.parse(fs.readFileSync(priorPath)):null;
const cacheIdentity={base:'e23095e200a3728092c307735dfd664fca78fcdb',constants:{oldTotal:total,standardEnd:65,standard,exponent,centralMix,flowFloor,centralFloorMix,calibratedTotal:models.calibrated.cumulative(99)},method:'Owned temporary copies of pinned main native modules; only stopRangeDistillation volume changes. Existing exact replay validation, production, aging, pricing, market, maintenance and reserve APIs retained. Candidate saves are comparison-only, never player data.'};
const curveDigest=createHash('sha256').update(JSON.stringify({oldEnd:oldEnd.toString(),oldFlow:oldFlow.toString(),curves:Object.fromEntries(Object.entries(models).map(([id,m])=>[id,{volume:m.volume.toString(),cumulative:m.cumulative?.toString()}]))})).digest('hex');
const resume=process.env.AMBER_CUT_RESUME==='1'&&prior?.base===cacheIdentity.base&&JSON.stringify(prior?.constants)===JSON.stringify(cacheIdentity.constants)&&prior?.method===cacheIdentity.method&&prior?.curveDigest===curveDigest;
const cached=resume?prior.careers:[];
const result={schema:'ambertime-cut-consistency-comparison/1',base:'e23095e200a3728092c307735dfd664fca78fcdb',method:'Owned temporary copies of pinned main native modules; only stopRangeDistillation volume changes. Existing exact replay validation, production, aging, pricing, market, maintenance and reserve APIs retained. Candidate saves are comparison-only, never player data.',constants:{oldTotal:total,standardEnd:65,standard,exponent,centralMix,flowFloor,centralFloorMix,calibratedTotal:models.calibrated.cumulative(99)},assertions:{centralLegalIntervals,allLegalFillable:true,max40:true,zeroAtStart:true,deterministic:true,standardAndFullMatchOld:true,matchedFlavorAcrossModels:true},curveDigest,resumeUsed:resume,rows,careers:[],complete:false};
const out=new URL('./comparison.json',import.meta.url),save=()=>fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');save();
const sourceRoot=fileURLToPath(new URL('../../',import.meta.url)),repoRoot=fileURLToPath(new URL('../../../../',import.meta.url));
async function candidate(id){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'amber-cut-compare-'));fs.mkdirSync(temp+'/modules/experiments',{recursive:true});
 for(const f of fs.readdirSync(sourceRoot))if(f.endsWith('.mjs')){const relative='works/ambertime/'+f;const data=execFileSync('git',['show',result.base+':'+relative],{cwd:repoRoot,encoding:'utf8'});fs.writeFileSync(temp+'/modules/'+f,data);}
 for(const dir of ['town-simulation','reputation'])fs.cpSync(sourceRoot+'/experiments/'+dir,temp+'/modules/experiments/'+dir,{recursive:true});
 fs.cpSync(path.resolve(sourceRoot,'../ambertime-flavor-lab-v02'),temp+'/ambertime-flavor-lab-v02',{recursive:true});
 let economy=fs.readFileSync(temp+'/modules/economy.mjs','utf8');
 if(id!=='old'){
  const m=models[id],formula=id==='currentFlow'?'p<=30?24*p/30:24+16*(p-30)/70':id==='reanchor'?'p<=30?(24+16*69/70*30/99)*p/30:24+16*69/70*p/99':id==='smooth40'?`${total}*(1-(1-p/99)**${exponent})`:id==='calibrated'?`(p<=30?24*p/30:24+16*(p-30)/70)*${standard/oldFlow(65)}`:id==='pureCentral'?`${total}*((1-${centralMix})*(10*(p/99)**3-15*(p/99)**4+6*(p/99)**5)+${centralMix}*(20*(p/99)**3-45*(p/99)**4+36*(p/99)**5-10*(p/99)**6))`:`9*p/99+${total-9}*((1-${centralFloorMix})*(20*(p/99)**3-45*(p/99)**4+36*(p/99)**5-10*(p/99)**6)+${centralFloorMix}*(35*(p/99)**3-105*(p/99)**4+126*(p/99)**5-70*(p/99)**6+15*(p/99)**7))`;
  const target=' Object.assign(j.core.spirit,{cut,litres:f.litres,initialLitres:f.litres,roughness:';
  assert.equal(economy.split(target).length,2);economy=economy.replace(target,` const cumulative=p=>${formula};f.litres=round(Math.max(0,cumulative(d.progress)-cumulative(d.collectStart)));\n`+target);
 }
 fs.writeFileSync(temp+'/modules/economy.mjs',economy);const engine=await import(pathToFileURL(temp+'/modules/partner-orders.mjs').href);return{engine,close:()=>fs.rmSync(temp,{recursive:true,force:true})};
}
const configs=[{seed:42,cap:1,age:6,policy:'retail',cutStart:0,cutEnd:65,horizon:36},{seed:42,cap:1,age:6,policy:'retail',cutStart:0,cutEnd:65,horizon:120},...[ [30,70],[20,80],[50,70],[24,52] ].map(([cutStart,cutEnd])=>({seed:42,cap:1,age:6,policy:'retail',cutStart,cutEnd,horizon:120}))];
configs.push(...[[24,52],[0,12],[87,99]].map(([cutStart,cutEnd])=>({seed:42,cap:1,age:1,policy:'retail',cutStart,cutEnd,horizon:12})));
for(const id of ['old','central']){
 const copy=await candidate(id);try{for(const config of ['old','central'].includes(id)?configs:[configs[0],configs[4]]){
  const prior=cached.find(r=>r.model===id&&JSON.stringify(r.config)===JSON.stringify(config));if(prior){result.careers.push(prior);save();continue;}
  const engine={...copy.engine,newStoreMarketDistillery:copy.engine.newMarketRulesDistillery};
  const r=runCareer(engine,config);result.careers.push({model:id,config,...r});save();process.stderr.write(`${id} ${config.cutStart}-${config.cutEnd} h${config.horizon}: cash${r.endCash},min${r.minCash},sold${r.sold},starts${r.starts},month${r.months},reason${r.reason}\n`);
 }}finally{copy.close();}
}
result.complete=true;save();console.log(`PASS ${rows.length} matched-flavor range rows, ${result.careers.length} native-rule economic careers; owned temporary copies, no production writes`);
