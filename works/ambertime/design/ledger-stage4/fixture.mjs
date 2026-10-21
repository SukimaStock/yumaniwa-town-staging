import * as D from '../../partner-orders.mjs';
import {shopFixture} from '../ledger-stage3/fixture.mjs';
import {advance,fill,resolve} from '../../tests/brands-helpers.mjs';
let cached;
export function generationFixture(){
 if(cached)return structuredClone(cached);
 const settle=s=>{s=resolve(s);for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);if(s.shop.offer&&!s.shop.offer.notified)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);if(s.generations.active.phase!=='working'&&s.generations.active.noticedPhase!==s.generations.active.phase)s=D.noticeGeneration(s,s.generations.active.id);return s;};
 let s=D.restoreDistillery(JSON.stringify(shopFixture().delivered));s=settle(advance(s,299-s.core.month));s=fill(s,{progress:65});s=settle(advance(s,1));s=D.bottleBranded(s,s.core.casks.at(-1).id,{},5);s=settle(s);
 if(s.generations.active.phase!=='last-batch')throw Error('fixture late boundary');
 const lastBatch=s;let finished=settle(fill(s,{progress:65}));
 const handed=settle(D.handoverGeneration(finished,1));
 let unfinished=settle(D.startDistillation(lastBatch));for(let i=0;i<37;i++)unfinished=D.distillStep(unfinished);unfinished=settle(advance(unfinished,12));
 const skipped=settle(advance(lastBatch,12));
 cached={finished:JSON.parse(D.serializeDistillery(finished)),handed:JSON.parse(D.serializeDistillery(handed)),unfinished:JSON.parse(D.serializeDistillery(unfinished)),skipped:JSON.parse(D.serializeDistillery(skipped))};
 for(const game of Object.values(cached))D.restoreDistillery(JSON.stringify(game));return structuredClone(cached);
}
