// Independent boundary diagnostics. Run from repo root:
// node works/ambertime/design/department-audit/boundary-check.mjs
// Public-operation fixtures are distinguished from quote-only synthetic projections.
// Projections are NEVER serialized or treated as valid saves or simulation observations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../../partner-orders.mjs';
import {SHOP,shopEvidence} from '../../shop-model.mjs';
import {release,advance} from '../../tests/brands-helpers.mjs';
let base=D.newStockistsDistillery(42);
for(let i=0;i<3;i++){base=release(base,{age:6,progress:65,selection:i?{brandId:1}:{name:'川霧'},tier:'low'});base=advance(base,6);}
base=advance(release(base,{age:24,progress:65,selection:{brandId:1},tier:'high'}),1);
const pid=base.releases.at(-1).productId;
function departmentOffer(s){s=structuredClone(s);while(s.shop.offer?.shopId!=='department'){assert(s.shop.offer);const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}return s;}
const offered=departmentOffer(base),offer=offered.shop.offer;
const accepted=D.acceptShop(offered,'department',offer.id);
assert.deepEqual(accepted.core,offered.core);assert.equal(accepted.shop.deliveries.length,0);
const mismatch=[];
for(let stock=1;stock<=5;stock++){
 const s=structuredClone(offered);s.core.products.find(p=>p.id===pid).stock=stock;
 const evidence=shopEvidence(s,1,'department'),quote=D.shopOfferQuote(s,pid,'department');
 assert(evidence.eligible);assert.equal(quote.ok,stock>=5);
 mismatch.push({stock,evidenceEligible:evidence.eligible,quoteOk:quote.ok,reason:quote.reason,quantities:quote.quantities});
}
const before=accepted.core.products.find(p=>p.id===pid).stock;
assert(before>10);
const delivered=D.deliverShop(accepted,pid,5,'department'),after=delivered.core.products.find(p=>p.id===pid).stock,q=D.shopQuote(delivered,pid,'department');
assert.equal(after,before-5);assert(after>=5);assert.equal(q.remaining,0);assert.equal(q.ok,false);
const capCounterfactual=structuredClone(delivered);capCounterfactual.shop.deliveries=[];
const uncapped=D.shopQuote(capCounterfactual,pid,'department');assert(uncapped.ok);
const stale=[];
for(const [name,fn] of [['accept',s=>D.acceptShop(s,'department',offer.id)],['decline',s=>D.declineShop(s,'department',offer.id)],['notice',s=>D.noticeShopOffer(s,'department',offer.id)],['accept-deliver',s=>D.acceptShopDelivery(s,pid,5,'department',offer.id)]]){
 const raw=JSON.stringify(accepted);assert.throws(()=>fn(accepted));assert.equal(JSON.stringify(accepted),raw);stale.push(name);
}
const declined=D.declineShop(offered,'department',offer.id),until=declined.shop.declinedUntil['department:1'];
assert.equal(until,offered.core.month+12);assert.equal(SHOP.declineGap,12);
// Natural sold-out pruning occurs on the NEXT bottling, not simply when time advances.
let pruned=advance(accepted,60);const old=structuredClone(pruned.releases.find(r=>r.productId===pid));
assert.equal(pruned.core.products.find(p=>p.id===pid).stock,0);
pruned=release(pruned,{age:0,progress:65,selection:{brandId:1},tier:'high'});
assert(!pruned.core.products.some(p=>p.id===pid));
const retained=pruned.releases.find(r=>r.productId===pid);assert.deepEqual(retained,old);assert(retained.profile);assert.equal(retained.age,24);
// Verify natural public fixture is replayable; synthetic projections above are excluded.
assert.equal(D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(pruned))),D.serializeDistillery(pruned));
const result={schema:'ambertime-department-boundary/1',scope:'Independent diagnostic only; not long-run simulation. No game or save modification.',fixture:{seed:42,offerMonth:offer.month,productId:pid,age:old.age},checks:{stockMinimum:{type:'synthetic quote-only projections; never saves',rows:mismatch},acceptWithoutDelivery:{type:'public operations',deliveries:accepted.shop.deliveries.length,coreUnchanged:true},monthlyCap:{type:'public operation plus separately labeled quote-only counterfactual',stockBefore:before,delivered:5,stockAfter:after,remaining:q.remaining,reason:q.reason,counterfactualQuoteWithoutCurrentMonthLedger:uncapped.ok,oneNextLegalLotCounterfactuallyBlocked:5,remainingInventoryNotAllCountedAsLost:after,note:'Five is one additional lot at this instant, NOT observed permanently lost demand. Later retail/other stores may sell it.'},staleIds:{type:'public operations',rejectedWithoutMutation:stale},declineCooldown:{type:'public operation and configuration/code boundary',declinedMonth:offered.core.month,declinedUntil:until,months:SHOP.declineGap,predicate:'month >= declinedUntil; exact reoffer is NOT guaranteed: safe point, global cooldown, stock, evidence and queue still apply'},historicalRetention:{type:'natural public operations with exact replay',productPruned:true,releaseRetained:true,profile:retained.profile,age:retained.age,cut:retained.cut,barrel:retained.type,note:'Release ledger survives product pruning; stored profile is immutable historical evidence, not a live product or delivery right.'}},allAssertionsPassed:true};
fs.writeFileSync(new URL('./boundary-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
