// Small synthetic path tests; not a substitute for the frozen 100-year protocol.
import {register} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
register(new URL('./copy-v07-baseline-loader.mjs',import.meta.url));
const B=await import('../partner-orders.mjs?copy-v07-baseline=0ef9ba32');
const D=await import('../partner-orders.mjs');
const M=await import('../model.mjs');
const {PARAMETERS:C}=await import('../parameters.mjs');
const copy=structuredClone;
function freeze(x,seen=new Set()){if(!x||typeof x!=='object'||seen.has(x))return x;seen.add(x);Object.values(x).forEach(y=>freeze(y,seen));return Object.freeze(x);}
function objects(x,out=new Set()){if(!x||typeof x!=='object'||out.has(x))return out;out.add(x);Object.values(x).forEach(y=>objects(y,out));return out;}
function detached(input,result){if(result===input)return;const refs=objects(input);for(const obj of objects(result))assert(!refs.has(obj),'public result shares object with input');}
function compare(s,name,args=[],{fault=null,expectError=false,errorMessage=null}={}){
 const left=freeze(copy(s)),right=freeze(copy(s)),before=JSON.stringify(s);
 function run(api,input,faultKind=fault){let output,error;try{globalThis.__copyV07Fault=faultKind?key=>{if(key===faultKind)throw Error('injected '+key+' failure');}:undefined;output=api[name](input,...args);}catch(e){error={name:e.name,message:e.message};}finally{delete globalThis.__copyV07Fault;}return {output,error};}
 const a=run(B,left),b=run(D,right);assert.deepEqual(b,a,name+' whole-state/result/error differential');
 assert.equal(JSON.stringify(left),before,'baseline input unchanged');assert.equal(JSON.stringify(right),before,'candidate input unchanged');
 if(errorMessage)assert.equal(b.error?.message,errorMessage,'specific rejection boundary reached');
 if(expectError)assert(b.error,'fault/failure must be exercised');else assert.equal(b.error,undefined,JSON.stringify(b.error));
 if(fault){const retried=run(D,right,null),clean=run(B,freeze(copy(s)),null);assert.equal(retried.error,undefined,'retry after injected failure succeeds');assert.deepEqual(retried,clean,'exception must not poison subsequent execution');assert.equal(JSON.stringify(right),before);detached(right,retried.output);}
 if(!b.error){if(a.output.result&&a.output.records?.includes(a.output.result)){assert(b.output.records.includes(b.output.result),'known result/records alias preserved');assert.equal(b.output.records.indexOf(b.output.result),a.output.records.indexOf(a.output.result));}const otherInput=freeze(copy(s)),other=run(D,otherInput,null);assert.deepEqual(other,b,'independent game gets identical result');detached(otherInput,other.output);if(b.output!==right&&other.output!==otherInput)detached(b.output,other.output);const otherBefore=JSON.stringify(other.output);detached(right,b.output);if(b.output!==right){const original=JSON.stringify(right);b.output.core.cash+=123;for(const obj of objects(b.output))if(Array.isArray(obj)){obj.push({testMutation:true});break;}assert.equal(JSON.stringify(right),original,'result mutation cannot reach caller');assert.equal(JSON.stringify(other.output),otherBefore,'result mutation cannot reach another game state');}}
 return a.output;
}
function ready(flavor){let s=flavor?B.newConnectedDistillery(42):B.newDelegatedDistillery(42);if(flavor){s=B.selectFlavorCards(s,{malt:'plain',ferment:'long'});s=B.startRangeDistillation(s);while(s.still.distillation.progress<12)s=B.distillStep(s);s=B.beginCollection(s);}else s=B.startDistillation(s);while(s.still.distillation.progress<65)s=B.distillStep(s);return B.stopDistillation(s);}
function automatic(factory){let s=B.fillBarrel(ready(factory==='connected'),'refill');if(factory!=='connected')s=factory==='roles'?B.enableBottlingRoles(s):B.enableStaffProgression(s);s=B.bottleBranded(s,s.core.casks[0].id,{},1);if(factory==='connected'){/* Synthetic branch probe: not a legal saved career. */s.staffProgression.bottling.hired=true;}else s=B.hireBottlingStaff(s);return B.reserveBottling(s,s.core.casks[0].id,{mode:'age',age:1,count:10});}
for(const flavor of [false,true])for(const type of ['bourbon','refill'])test(`fill ${flavor?'flavor':'legacy'} ${type}: exact and detached frozen input`,()=>compare(ready(flavor),'fillBarrel',[type]));
for(const flavor of [false,true])test(`fill ${flavor?'flavor':'legacy'} failure boundaries`,()=>{
 const s=ready(flavor);compare(s,'fillBarrel',['invalid'],{expectError:true});
 const poor=copy(s);poor.core.cash=0;compare(poor,'fillBarrel',['refill'],{expectError:true});
 const missing=copy(s);missing.core.spirit=null;compare(missing,'fillBarrel',['refill'],{expectError:true});
 compare(s,'fillBarrel',['refill'],{fault:'fill',expectError:true});
 if(flavor){const aged=copy(s);aged.core.spirit.flavor.months=1;compare(aged,'fillBarrel',['refill'],{expectError:true});}
});
for(const mode of ['legacy','roles','connected'])test(`automatic ${mode}: paid job, failure after salary, reserve rollback`,()=>{
 const s=automatic(mode),n=compare(s,'tickDistillery');assert.equal(n.automation.lastBottlings.length,1,'salary job actually ran');assert.equal(n.automation.lastBottlings[0].salary,2);
 compare(s,'tickDistillery',[],{fault:'bottle',expectError:true});
 let rollback=0;for(const cash of [25,35,40,50,100,150,160,170]){const poor=copy(s);poor.core.cash=cash;const out=compare(poor,'tickDistillery');if(out.core.month===poor.core.month){rollback++;assert.equal(out.core.cash,cash);assert.deepEqual(out.core.totals,poor.core.totals);assert.deepEqual(out.labConnection,poor.labConnection);}}assert(rollback>0,'a real reserve rollback occurred');
});
test('automatic before paid-staff boundary remains exact',()=>{let s=B.fillBarrel(ready(false),'refill');s=B.reserveBottling(s,s.core.casks[0].id,{mode:'age',age:1,count:10});const n=compare(s,'tickDistillery');assert.equal(n.automation.lastBottlings.length,1);assert.equal(n.automation.lastBottlings[0].salary,undefined);});

for(const mode of ['legacy','roles','connected'])test(`automatic ${mode}: stock policy stays exact across five monthly transitions`,()=>{
 let s=automatic(mode);const id=s.core.casks[0].id;s=B.reserveBottling(s,id,{mode:'stock',threshold:5,count:1});
 let jobs=0;for(let month=0;month<5;month++){const previous=s;s=compare(s,'tickDistillery');assert.equal(s.core.month,previous.core.month+1,'each requested month advances');jobs+=s.automation.lastBottlings.length;for(const job of s.automation.lastBottlings){assert.equal(job.salary,2);assert.equal(job.count,1);assert.equal(job.caskId,id);}assert.equal(JSON.stringify(s.operations),JSON.stringify(B.tickDistillery(previous).operations),'repeated stock operation order remains exact');}
 assert(jobs>=1,'stock salary branch exercised');if(mode==='roles')assert(jobs>1,'role stock replenishment repeats rather than merely the first month');
});

for(const flavor of [false,true])test(`fill ${flavor?'flavor':'legacy'} reaches post-payment reserve rejection without mutation`,()=>{
 const s=ready(flavor);s.core.cash=C.casks.refill.cost;
 const post=M.fillCask(freeze(copy(s.core)),'refill');assert.equal(post.cash,0);assert.equal(post.casks.length,s.core.casks.length+1,'core fill itself succeeds before reserve check');
 compare(s,'fillBarrel',['refill'],{expectError:true,errorMessage:'瓶詰め費用を残せる樽を選んでください。'});
});
test('flavor preparation preserves the existing result/records alias',()=>{
 // Isolated alias probe; no claim this composed state is a valid saved career.
 const prior=automatic('roles');assert(prior.records.includes(prior.result),'fixture has the real public bottling alias');
 const s=ready(true);s.result=prior.result;s.records=prior.records;
 assert(s.records.includes(s.result));const n=compare(s,'fillBarrel',['refill']);assert(n.records.includes(n.result),'fill output keeps the existing record identity');
});
