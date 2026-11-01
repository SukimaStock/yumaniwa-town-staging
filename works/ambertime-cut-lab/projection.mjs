// Read-only projection of the adopted main-game model. No player saves or finance writes.
import * as Lab from '../ambertime-flavor-lab-v02/model.mjs';
import {projectFlavor,attachFlavor} from '../ambertime/lab-flavor.mjs';
import {salePrices,marketValue} from '../ambertime/economy.mjs';
import {normalShopUnitPrice,NORMAL_SHOP_DEMAND} from '../ambertime/shop-demand.mjs';
import {shopProductCondition} from '../ambertime/shop-model.mjs';
import {affinity,acceptance} from '../ambertime/market-sales.mjs';
export const FIXED_LITRES=34.35;
export const AXES=['fruit','grain','smoke','body','rough','spice','wood','vanilla'];
export const LABELS={fruit:'果実',grain:'麦',smoke:'煙',body:'厚み',rough:'刺激',spice:'スパイス',wood:'木',vanilla:'バニラ'};
const assert=(x,s)=>{if(!x)throw Error(s)};
export function cutProfile({malt='plain',ferment='long',start=0,end=65,cask='refill',months=0,labelHistory=true}={}){
 assert(Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end<=99&&end-start>=12,'採取区間は0〜99、幅12以上');
 assert(['refill','first','bourbon'].includes(cask)&&Number.isInteger(months)&&months>=0&&months<=1200,'樽と熟成年数を確認');
 const choice={malt,ferment,cask:cask==='bourbon'?'first':cask,start:start/99,end:end/99};
 const source=attachFlavor({id:1},choice),raw=source.flavor.spirit,profile=Object.fromEntries(Object.entries(Lab.mature(raw,months/12,choice.cask)).map(([k,v])=>[k,Math.round(v*1e12)/1e12])),scalar=projectFlavor(profile);
 let label=Lab.expression(raw,raw);if(labelHistory&&months){let s=Lab.fill(Lab.initial(),choice);s.barrels[0].spirit=raw;for(let n=months;n>0;n-=Math.min(120,n))s=Lab.advance(s,Math.min(120,n));label=s.barrels[0].label;}
 const product={id:1,age:months,...scalar,flavor:{profile}};
 const price=salePrices({core:{products:[product]}},1).standard;
 product.price=price;
 const shopAffinity=Object.fromEntries(['retail','town-liquor','supermarket'].map(id=>[id,affinity(id,product)]));
 const state={core:{products:[product]},releases:[{productId:1}]},shopPrices=Object.fromEntries(['town-liquor','supermarket'].map(id=>[id,normalShopUnitPrice(state,1,id)]));
 const accepted=Object.fromEntries(['retail','town-liquor','supermarket'].map(id=>[id,acceptance(id,{...product,price:id==='retail'?price:shopPrices[id],referencePrice:id==='retail'?marketValue(product):NORMAL_SHOP_DEMAND.referencePaidPrice[id]})]));
 return {primary:source.flavor.primary,departmentProductCondition:shopProductCondition(state,1,'department'),shopPrices,choice,start,end,width:end-start,months,cask:choice.cask,raw,profile,scalar,label,candidateLabel:Lab.expression(profile,raw),price,litres:FIXED_LITRES,shopAffinity,affinity:shopAffinity,acceptance:accepted};
}
// Analytical stream functions from flavor-lab-v02/model.mjs. The official taste
// remains Lab.distill's 48 midpoint average. These fractions only color the bar;
// tests prove their 48-point averages equal that unchanged official function.
export function streamProfile(position,{malt='plain',ferment='long'}={}){
 assert(Number.isFinite(position)&&position>=0&&position<=99,'位置を確認');
 assert(['plain','peat'].includes(malt)&&['short','long'].includes(ferment),'仕込みを確認');
 const x=position/99,bell=(c,w)=>Math.exp(-(((x-c)/w)**2)),long=ferment==='long';
 return {fruit:.12+(long?.86:.43)*bell(.34,.29),grain:.19+(long?.42:.77)*bell(.56,.33),body:.15+.91*bell(.79,.30),spice:.11+.69*bell(.91,.24),rough:.19+.50*bell(.08,.22)+.49*bell(.95,.22),smoke:malt==='peat'?.56+.18*bell(.58,.35):.055,wood:0,vanilla:0};
}
export const flowProfile=({position,...options})=>streamProfile(position,options);
// Equal-luminance-ish symbolic family palette, not the color of spirit or score.
export const FAMILY_COLORS={fruit:[197,143,164],grain:[195,173,107],smoke:[132,148,178],body:[108,166,160]};
export function colorForProfile(p){const ids=Object.keys(FAMILY_COLORS),sum=ids.reduce((n,k)=>n+p[k]**2,0);return '#'+[0,1,2].map(i=>Math.round(ids.reduce((n,k)=>n+FAMILY_COLORS[k][i]*p[k]**2,0)/sum).toString(16).padStart(2,'0')).join('');}
