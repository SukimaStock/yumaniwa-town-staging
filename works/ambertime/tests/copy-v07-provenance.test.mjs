import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {invertReviewedCopyV07} from './copy-v07-provenance.mjs';
const source=readFileSync(new URL('../partner-orders.mjs',import.meta.url),'utf8');
const prior=execFileSync('git',['show','0ef9ba32c72e0fcb87f5ed748c47865db099adb6:works/ambertime/partner-orders.mjs'],{encoding:'utf8',maxBuffer:4*1024*1024});
const A='function prepareFlavorFill(s,type){if(!s.core.spirit?.flavor)return s;return {...s,core:{...s.core,spirit:setFlavorCask(s.core.spirit,type)}};}';
const B='if(salary){j.core.cash=round(j.core.cash-salary);j.core.totals.costs=round(j.core.totals.costs+salary);}';
const digest=s=>createHash('sha256').update(s).digest('hex');
const accepts=s=>{try{return digest(invertReviewedCopyV07(s))===digest(prior);}catch{return false;}};
test('only exact reviewed A1 B2 returns exact immutable931 source',()=>assert.equal(invertReviewedCopyV07(source),prior));
for(const [name,hunk] of [['A',A],['B',B]]){
 test(`${name} missing is rejected`,()=>assert.throws(()=>invertReviewedCopyV07(source.replace(hunk,''))));
 test(`${name} duplicate is rejected`,()=>assert.throws(()=>invertReviewedCopyV07(source+'\n'+hunk)));
 test(`${name} altered meaning is rejected`,()=>assert.equal(accepts(source.replace(hunk,hunk.replace('s.core','s.changedCore').replace('j.core.cash','j.core.otherCash'))),false));
}
test('unreviewed edit outside hunks is not hidden',()=>assert.equal(accepts(source+'\n// unrelated source change\n'),false));
test('old unoptimized source does not silently bypass required hunk count',()=>assert.throws(()=>invertReviewedCopyV07(prior)));
test('mutating one salary copy while retaining count fails exact original source',()=>{
 const mutated=source.replace(B,B+'void 0;');assert.equal(accepts(mutated),false);
});
