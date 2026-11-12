// Test-only provenance transform. This does not establish behavioral safety.
// Keep exact source927 hashes in consignment-integration-source.test.mjs unchanged.
import assert from 'node:assert/strict';
const reviewed = [
 ['function prepareFlavorFill(s,type){if(!s.core.spirit?.flavor)return s;return {...s,core:{...s.core,spirit:setFlavorCask(s.core.spirit,type)}};}',
  'function prepareFlavorFill(s,type){if(!s.core.spirit?.flavor)return s;const j=clone(s);j.core.spirit=setFlavorCask(j.core.spirit,type);return j;}',1],
 ['if(salary){j.core.cash=round(j.core.cash-salary);j.core.totals.costs=round(j.core.totals.costs+salary);}',
  'if(salary){j=clone(j);j.core.cash=round(j.core.cash-salary);j.core.totals.costs=round(j.core.totals.costs+salary);}',2],
];
export function invertReviewedCopyV07(source) {
 assert.equal(typeof source,'string');
 for(const [current,previous,count] of reviewed){
  assert.equal(source.split(current).length-1,count,'exact reviewed copy hunk occurrence count');
  source=source.replaceAll(current,previous);
 }
 return source;
}
