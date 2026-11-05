# 保留申し出からの分岐確認

本計測後に実行した補助試験。既存の公開操作だけで61か月・保留2件の状態を生成し、受諾/納品/月次と辞退/月次の2分岐を比較した。両分岐の各操作後全状態・最終context・正式復元が一致。性能値には含めない。

repositoryルートで実行する。正式保存ファイルを書き換える処理はない。

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import * as D from './works/ambertime/partner-orders.mjs';
import {release,advance} from './works/ambertime/tests/brands-helpers.mjs';
import {loadAdapter,fullReplay,createCheckpoint,replayTail,encodeContext} from './works/ambertime/checkpoint-research/prototype.mjs';
let s=D.newStockistsDistillery(42);
for(let i=0;i<3;i++){s=release(s,{age:6,progress:65,selection:i?{brandId:1}:{name:'川霧'},tier:'low'});s=advance(s,6);}
s=advance(release(s,{age:24,progress:65,selection:{brandId:1},tier:'high'}),1);
assert.equal(s.shop.offer.shopId,'town-liquor');assert.equal(s.shop.pendingOffers.length,2);
const raw=D.serializeDistillery(s),a=await loadAdapter();let cp;
fullReplay(a,raw,{onStep:({state,context,nextIndex})=>{if(nextIndex===s.operations.length)cp=createCheckpoint(a,{state,context,sourceRaw:raw});}});
const results=[];
for(const branch of ['accept-deliver','decline']){
 let t=structuredClone(s);const expected=new Map(),offer=t.shop.offer;
 const put=value=>{t=value;expected.set(t.operations.length,JSON.stringify(t));};
 put(branch==='accept-deliver'?D.acceptShop(t,offer.shopId,offer.id):D.declineShop(t,offer.shopId,offer.id));
 if(branch==='accept-deliver')put(D.deliverShop(t,t.releases.at(-1).productId,1,'town-liquor'));
 put(D.tickDistillery(t));
 const target=D.serializeDistillery(t),full=fullReplay(a,target),actual=replayTail(a,JSON.parse(JSON.stringify(cp)),target,{binding:'prefix-branch',onStep:({state,nextIndex,operation})=>{if(operation)assert.equal(JSON.stringify(state),expected.get(nextIndex));}});
 assert.deepEqual(encodeContext(actual.context),encodeContext(full.context));
 assert.equal(JSON.stringify(actual.state),target);assert.equal(D.serializeDistillery(D.restoreDistillery(target)),target);
 results.push({branch,tail:actual.replayed,equal:true,month:t.core.month,pending:t.shop.pendingOffers.length});
}
console.log(JSON.stringify({offeredMonth:s.core.month,pending:s.shop.pendingOffers.length,results}));
JS
```

結果：

```json
{"offeredMonth":61,"pending":2,"results":[{"branch":"accept-deliver","tail":3,"equal":true,"month":62,"pending":1},{"branch":"decline","tail":2,"equal":true,"month":62,"pending":1}]}
```
