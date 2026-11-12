import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
test('v0.7 runtime has exactly the two reviewed copy changes relative to fixed931; not a replacement for existing source guard',()=>{
 const before=execFileSync('git',['show','0ef9ba32c72e0fcb87f5ed748c47865db099adb6:works/ambertime/partner-orders.mjs'],{encoding:'utf8',maxBuffer:4*1024*1024});let now=fs.readFileSync(new URL('../partner-orders.mjs',import.meta.url),'utf8');
 const inverse=[['function prepareFlavorFill(s,type){if(!s.core.spirit?.flavor)return s;return {...s,core:{...s.core,spirit:setFlavorCask(s.core.spirit,type)}};}','function prepareFlavorFill(s,type){if(!s.core.spirit?.flavor)return s;const j=clone(s);j.core.spirit=setFlavorCask(j.core.spirit,type);return j;}',1],['if(salary){j.core.cash=round(j.core.cash-salary);j.core.totals.costs=round(j.core.totals.costs+salary);}','if(salary){j=clone(j);j.core.cash=round(j.core.cash-salary);j.core.totals.costs=round(j.core.totals.costs+salary);}',2]];
 for(const [a,b,n] of inverse){assert.equal(now.split(a).length-1,n);now=now.replaceAll(a,b);}assert.equal(now,before);
});
