import * as D from '../partner-orders.mjs';
import {release,advance} from './brands-helpers.mjs';
let cached;
export function legacyOffered(){if(!cached){let s=D.newStockistsDistillery(42);for(let i=0;i<3;i++){s=release(s,{age:6,progress:65,selection:i?{brandId:1}:{name:'川霧'},tier:'low'});s=advance(s,6);}s=release(s,{age:24,progress:65,selection:{brandId:1},tier:'high'});cached=advance(s,1);}return structuredClone(cached);}
export function offered(){let s=D.enableDepartment(legacyOffered());while(s.shop.offer&&s.shop.offer.shopId!=='department'){const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}if(!s.shop.offer){s=advance(s,12);while(s.shop.offer&&s.shop.offer.shopId!=='department'){const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}}return s;}
export function interested(){const s=offered(),o=s.shop.offer;if(o?.shopId!=='department')throw Error('No department fixture offer');return D.acceptShop(s,o.shopId,o.id);}
export const product=s=>s.releases.at(-1).productId;
// These synthetic projections isolate quote boundaries only. They are never
// serialized and are never used as replay or valid operation-history fixtures.
export function projection({age=24,roughness=.3,stock=36}={}){const s=interested();Object.assign(s.core.products.find(p=>p.id===product(s)),{age,roughness,stock});return s;}
