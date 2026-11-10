import test from 'node:test';
import assert from 'node:assert/strict';
import {regionalOfferView,regionalPartnerView} from '../regional-offer-view.mjs';
const game={brands:[{id:1,name:'A<&"'}],releases:[{id:4,brandId:1}]};
// Explicit display-only input; this does not claim a native inquiry happened.
const offer={id:'regional-offer:trial-region-desk:e331',partnerId:'trial-region-desk',regionId:'trial-region',releaseId:4,brandId:1,status:'pending'};
test('regional dialog reads common metadata and escapes the real brand without delivery controls',()=>{
 const view=regionalOfferView(game,offer);assert.equal(view.title,'別の地域の仕入れ窓口（仮）からの申し出');
 assert.match(view.body,/麦・穏やかな樽香/);assert.match(view.body,/A&lt;&amp;&quot;/);assert.match(view.body,/取扱いの問い合わせ/);assert.doesNotMatch(view.body,/<button|data-market|data-action|月3本|買取|自動発送/);
});
test('unknown partner, mismatched release/region and decided offers cannot become an active dialog',()=>{
 for(const change of [{partnerId:'retail'},{partnerId:'missing'},{regionId:'town'},{releaseId:9},{brandId:2},{status:'accepted'}])assert.equal(regionalOfferView(game,{...offer,...change}),null);
 assert.equal(regionalOfferView(game,null),null);
});
test('contract information requires an actual matching contract and has no unimplemented action',()=>{
 const partnerId='trial-region-desk';assert.equal(regionalPartnerView(game,partnerId,null),null);
 const view=regionalPartnerView(game,partnerId,{partnerId,regionId:'trial-region'});assert.match(view.body,/取扱関係あり/);assert.doesNotMatch(view.body,/<button|data-action|棚|自動発送|売上/);
});
