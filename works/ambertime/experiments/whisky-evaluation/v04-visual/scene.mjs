import * as M from '../v03/model.mjs';
import {codeaBottle} from '../../../codea-object-art.mjs';

export const SCENE_VERSION='whisky-visual/0.4';
export const VARIANTS=Object.freeze({shelf:'棚中心',interior:'店内中心',records:'瓶と記録中心'});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const recipeKey=p=>JSON.stringify([p.recipe.malt,p.recipe.ferment,p.recipe.start,p.recipe.end,p.recipe.cask,p.years]);
const shape=p=>({sweet:'fancy',smoke:'tall',deep:'square',balanced:'standard'}[p.sample]??'standard');
const productInfo=p=>({productId:p.id,sample:p.sample,name:p.name,years:p.years,tier:p.tier,createdMonth:p.createdMonth,recipeKey:recipeKey(p)});
const tokens=(p,count,kind)=>Array.from({length:count},(_,serial)=>({...productInfo(p),serial,kind}));

// A read-only projection. No clock, inventory, opinion or saved field is changed here.
export function sceneFor(session,shopId='bar'){
 const shop=M.SHOPS.find(x=>x.id===shopId);if(!shop)throw Error('表示する店を選んでください。');
 const sales=session.sales,relation=session.relations[shopId],products=new Map(sales.products.map(p=>[p.id,p]));
 const current=sales.products.flatMap(p=>tokens(p,p.shops[shopId]??0,'current'));
 const selected=products.get(sales.selectedId),draft=tokens(selected,M.allocation(session)[shopId]??0,'draft');
 const memories=relation.archive.filter(r=>r.sold>0&&r.supportCount>0).map(r=>({
  ...productInfo(products.get(r.productId)),kind:'memory',sold:r.sold,supportCount:r.supportCount,strongCount:r.strongCount,lastSale:r.lastSale,
  expectationWeight:relation.expectations.find(e=>e.productId===r.productId)?.weight??0
 })).sort((a,b)=>b.lastSale-a.lastSale||b.strongCount-a.strongCount||b.supportCount-a.supportCount||a.productId-b.productId);
 const weight=memories.reduce((sum,r)=>sum+r.expectationWeight,0),expectationStrength=1-Math.exp(-weight);
 const visibleMemories=memories.slice(0,3).map(r=>({...r,connectionStrength:weight?r.expectationWeight/weight*expectationStrength:0}));
 const links=[...new Set([...current,...draft].map(x=>x.productId))].flatMap(id=>{
  const p=products.get(id),prior=visibleMemories.find(r=>r.productId!==id&&r.recipeKey===recipeKey(p));
  return prior?[{productId:id,priorProductId:prior.productId,strength:prior.connectionStrength}]:[];
 });
 const visibleCurrent=current.slice(0,10),visibleDraft=draft.slice(0,Math.max(0,10-visibleCurrent.length));
 return {version:SCENE_VERSION,shopId,shopName:shop.name,month:sales.month,current,visibleCurrent,stockCount:current.length,hiddenStock:Math.max(0,current.length-10),draft,visibleDraft,draftCount:draft.length,hiddenDraft:draft.length-visibleDraft.length,memories,visibleMemories,hiddenMemoryCount:Math.max(0,memories.length-3),expectationStrength,links,lastTradeMonth:relation.lastTradeMonth};
}

const rect=(x,y,w,h,color,attrs='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" ${attrs}/>`;
const nativeBottle=p=>codeaBottle(shape(p),{label:p.sample==='smoke'?'dark':'cream',priceTier:p.tier});
function bottle(p,x,y,kind){
 const title=kind==='memory'?`${p.name}・${p.years}年、${p.createdMonth}か月目の商品。実売${p.sold}本、好んだ評価${p.supportCount}件の記録。現物在庫ではありません。`:`${p.name}・${p.years}年、${p.createdMonth}か月目の商品、${kind==='draft'?'仮置き':'店頭在庫'}1本`;
 return `<g class="scene-${kind}" data-kind="${kind}" data-product-id="${p.productId}" data-bottle-count="${kind==='memory'?0:1}"${kind==='current'?` data-recall-id="${p.productId}"`:''} transform="translate(${x} ${y})"${kind==='draft'?' opacity=".45"':''}><title>${esc(title)}</title>${kind==='memory'?rect(-2,-1,16,17,'#c8beaa')+rect(-1,0,14,15,'#19141e')+rect(0,13,12,1,'#a0785a'):''}${nativeBottle(p)}${kind==='memory'?rect(-1,15,14,1,'#644632'):''}</g>`;
}
function furniture(variant,shopId){
 const wall=rect(0,0,160,54,'#2d2d36');
 if(shopId==='diner'){
  const table=rect(2,43,156,3,'#a0785a')+rect(8,46,144,3,'#644632')+rect(17,49,5,5,'#3c281e')+rect(138,49,5,5,'#3c281e');
  const seats=rect(0,32,2,18,'#644632')+rect(158,32,2,18,'#644632');
  const plates=rect(4,40,7,2,'#c8beaa')+rect(5,39,5,1,'#8f9a7d')+rect(149,40,7,2,'#c8beaa')+rect(150,39,5,1,'#8f9a7d');
  if(variant==='records')return wall+rect(2,2,76,49,'#253b3b')+rect(83,4,74,43,'#644632')+rect(85,6,70,39,'#41414b')+rect(3,43,73,3,'#a0785a')+rect(12,46,4,8,'#3c281e')+rect(64,46,4,8,'#3c281e');
  const board=rect(20,4,120,23,'#644632')+rect(22,6,116,19,'#41414b');
  return wall+board+table+(variant==='interior'?seats+plates+rect(10,5,5,12,'#8f9a7d')+rect(11,6,3,8,'#19141e'):'');
 }
 if(shopId==='specialist'){
  const rack=rect(7,5,2,40,'#644632')+rect(77,5,2,40,'#644632')+rect(8,27,70,2,'#a0785a')+rect(8,43,70,3,'#a0785a')+rect(8,46,70,4,'#3c281e');
  const recordCase=rect(87,5,67,39,'#644632')+rect(89,7,63,35,'#19141e')+rect(89,40,63,3,'#a0785a');
  if(variant==='records')return wall+rect(2,2,77,49,'#253b3b')+rect(83,2,75,49,'#41414b')+rack+rect(86,43,69,3,'#a0785a');
  return wall+rack+recordCase+(variant==='interior'?rect(0,49,160,5,'#644632')+rect(0,48,160,2,'#a0785a')+rect(8,51,68,1,'#3c281e')+rect(91,51,61,1,'#3c281e'):'');
 }
 if(variant==='records')return wall+rect(2,2,76,49,'#253b3b')+rect(82,2,76,49,'#41414b')+rect(7,43,65,3,'#a0785a')+rect(86,43,68,2,'#644632');
 const shelf=rect(8,23,144,3,'#a0785a')+rect(8,26,144,2,'#3c281e')+rect(8,43,144,4,'#a0785a')+rect(8,47,144,3,'#644632');
 if(variant==='shelf')return wall+shelf+rect(8,6,2,37,'#644632')+rect(150,6,2,37,'#644632');
 // A bar counter, back shelf and glasses. These are finite rects in the native room palette.
 return wall+rect(8,23,144,3,'#644632')+rect(0,41,160,4,'#a0785a')+rect(0,45,160,9,'#644632')+rect(4,41,152,1,'#c8beaa')+rect(5,31,5,7,'#8f9a7d')+rect(6,32,3,4,'#19141e')+rect(5,38,5,1,'#c8beaa')+rect(150,31,5,7,'#8f9a7d')+rect(151,32,3,4,'#19141e')+rect(150,38,5,1,'#c8beaa');
}
function locations(scene,variant){
 const recordMode=variant==='records'||scene.shopId==='specialist';
 return {
  current:scene.visibleCurrent.map((p,i)=>({p,x:recordMode?7+(i%5)*13:14+(i%10)*13,y:recordMode?(i<5?15:30):29})),
  memory:scene.visibleMemories.map((p,i)=>({p,x:recordMode?91+i*20:31+i*42,y:recordMode?15:7})),
  draft:scene.visibleDraft.map((p,i)=>{const slot=i+scene.visibleCurrent.length;return {p,x:recordMode?7+(slot%5)*13:14+slot*13,y:recordMode?(slot<5?15:30):29};})
 };
}
export function renderScene(scene,variant='shelf'){
 if(!Object.hasOwn(VARIANTS,variant))throw Error('比較する見せ方を選んでください。');
 const loc=locations(scene,variant),drawn=[];
 for(const link of scene.links){
  const current=loc.current.find(x=>x.p.productId===link.productId)??loc.draft.find(x=>x.p.productId===link.productId),memory=loc.memory.find(x=>x.p.productId===link.priorProductId);
  if(current&&memory)drawn.push(`<path class="recipe-link" data-prior-product-id="${link.priorProductId}" d="M${current.x+6} ${current.y} V${current.y-2} H${memory.x+6} V${memory.y+16}" fill="none" stroke="#c8beaa" stroke-width="1" opacity="${(.12+.78*link.strength).toFixed(4)}"/>`);
 }
 const memory=loc.memory.map(({p,x,y})=>bottle(p,x,y,'memory')+rect(x-2,y+17,16,1,'#c8beaa',`class="expectation-mark" opacity="${(.1+.8*p.connectionStrength).toFixed(4)}"`)).join('');
 const bottles=loc.current.map(({p,x,y})=>bottle(p,x,y,'current')).join(''),draft=loc.draft.map(({p,x,y})=>bottle(p,x,y,'draft')).join('');
 const stockLabel=`店頭 ${scene.stockCount}本${scene.hiddenStock?`（描画10本・ほか${scene.hiddenStock}本）`:''}`,memoryLabel=`好んだ客の記録 ${scene.memories.length}件${scene.hiddenMemoryCount?`（表示3件・ほか${scene.hiddenMemoryCount}件）`:''}`;
 return `<figure class="shop-scene" data-shop="${scene.shopId}" data-variant="${variant}" data-stock-count="${scene.stockCount}" data-memory-count="${scene.memories.length}" data-draft-count="${scene.draftCount}"><svg class="scene-art" viewBox="0 0 160 54" width="320" height="108" shape-rendering="crispEdges" role="img" aria-label="${esc(scene.shopName+'。'+stockLabel+'。台紙に残す'+memoryLabel+'。'+(scene.draftCount?'仮置き'+scene.draftCount+'本。':'')+'記録の瓶は現物在庫ではありません。')}">${furniture(variant,scene.shopId)}${drawn.join('')}${memory}${bottles}${draft}</svg><figcaption class="scene-legend"><span>${stockLabel}${scene.draftCount?` · 仮置き${scene.draftCount}本${scene.hiddenDraft?`（描画外${scene.hiddenDraft}本）`:''}`:''}</span><span>${memoryLabel}</span></figcaption></figure>`;
}
