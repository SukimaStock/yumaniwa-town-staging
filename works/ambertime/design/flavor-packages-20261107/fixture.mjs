// Reproducible real model fixture. Only public actions; no hand-edited state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as D from '../../partner-orders.mjs';
import {advance,resolve} from '../../tests/brands-helpers.mjs';
import {packageFamily} from '../../release-package.mjs';
export const packageRecipes=[
 {family:'fruit',malt:'plain',ferment:'long',start:12,end:40},
 {family:'grain',malt:'plain',ferment:'short',start:30,end:65},
 {family:'smoke',malt:'peat',ferment:'long',start:10,end:90},
 {family:'body',malt:'plain',ferment:'short',start:63,end:89},
 {family:'mixed',malt:'plain',ferment:'short',start:0,end:43},
];
function fill(s,recipe){
 s=D.selectFlavorCards(resolve(s),{malt:recipe.malt,ferment:recipe.ferment});
 s=D.startRangeDistillation(s);
 while(s.still.distillation.progress<recipe.start)s=D.distillStep(s);
 s=D.beginCollection(s);
 while(s.still.distillation.progress<recipe.end)s=D.distillStep(s);
 return D.fillBarrel(D.stopDistillation(s),'refill');
}
export function makePackageFixture(){
 const raw=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/placement-established-six.json',import.meta.url))).raw;
 let s=D.enableStoreMarket(D.restoreDistillery(raw));
 // Earn the supermarket offer through the same public sales path as the market regression.
 s=D.setMarketRetail(s,{productId:s.result.productId,count:6});s=resolve(advance(s,2));
 s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<65)s=D.distillStep(s);
 s=D.fillBarrel(D.stopDistillation(s),'refill');const cid=s.core.casks.at(-1).id;s=advance(s,12);
 s=D.bottleBranded(s,cid,{},40);s=D.setMarketRetail(s,{productId:s.result.productId,count:40});
 for(let n=0;!s.shop.offer;n++){if(n>=15)throw Error('supermarket offer timeout');s=advance(s,1);}
 assert.equal(s.shop.offer.shopId,'supermarket');s=D.acceptShop(s,'supermarket',s.shop.offer.id);
 const ids=[];
 for(const recipe of packageRecipes){
  s=fill(s,recipe);const caskId=s.core.casks.at(-1).id;s=advance(s,12);s=D.bottleBranded(s,caskId,{});
  const release=s.releases.at(-1);assert.equal(packageFamily(release.profile),recipe.family);ids.push(release.productId);
  s=D.setSalePrice(s,'high',release.productId);
  s=D.setMarketRetail(s,{productId:release.productId,count:Math.max(0,release.bottles-12)});
  s=advance(s,12);
 }
 s=D.enableMarketRules(s);
 for(let i=0;i<ids.length;i++){
  const productId=ids[i];
  // Alternate shelves so both shops remain compact, while all five stay in hand.
  s=D.assignStoreProduct(s,{productId,shopId:i%2?'supermarket':'town-liquor',count:3});
 }
 assert.equal(D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(s))),D.serializeDistillery(s));
 return {game:s,ids};
}
export function makeFirstBottleFixture(){
 let s=fill(D.newConnectedDistillery(42),packageRecipes[0]);s=advance(s,1);return s;
}
