import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as D from '../partner-orders.mjs';import {advance} from './brands-helpers.mjs';import {mapShopDetail} from '../map-sales-view.mjs';import {shopRemark} from '../shop-remarks.mjs';
const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
test('native restocking after six months does not claim that delivery is overdue',()=>{
 let s=D.enableStoreMarket(D.restoreDistillery(raw));const productId=s.result.productId;
 s=D.assignStoreProduct(s,{productId,shopId:'town-liquor',count:5});s=advance(s,1);assert(mapShopDetail(s,'town-liquor').totalSold>0);
 s=D.returnStoreProduct(s,{productId,shopId:'town-liquor'});s=advance(s,6);
 s=D.assignStoreProduct(s,{productId,shopId:'town-liquor',count:1});const save=D.serializeDistillery(s),old=shopRemark(s,'town-liquor',1);
 assert.equal(old.key,'gap');assert.match(old.text,/届いて/);
 const d=mapShopDetail(s,'town-liquor');assert.equal(d.currentStock,1);assert.equal(d.remark,'しばらく売れていませんね。');assert.equal(d.remarkKey,'gap');assert.equal(D.serializeDistillery(s),save);assert.equal(D.serializeDistillery(D.restoreDistillery(save)),save);
});
test('old wholesale receipt is not relabelled as a shelf customer purchase',()=>{
 const s=D.restoreDistillery(raw),month=s.core.month;s.shop.deliveries.push({id:999,shopId:'town-liquor',brandId:1,month,count:5});
 assert.equal(mapShopDetail(s,'town-liquor').remark,'ウイスキー、届きました。');
 const shelf=structuredClone(s);shelf.storeMarket={version:1,startedMonth:month,byShop:{'town-liquor':{},supermarket:{}}};
 const d=mapShopDetail(shelf,'town-liquor');assert.equal(d.totalSold,0);assert.equal(d.remarkKey,'neutral');assert.equal(d.remark,'いらっしゃいませ。');
 shelf.core.month++;shelf.shop.deliveries.push({id:1000,shopId:'town-liquor',brandId:1,month:month+1,count:1});
 assert.equal(mapShopDetail(shelf,'town-liquor').remark,'店頭で売れました。');
});
