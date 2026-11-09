// Lab-only, read-only changes to pixels already occupied by an authored shop.
// Coordinate system: existing stage-3 town canvas, 144 x 144; source cells 2 x 2.
export const REACTION_STEPS = 6;
export const REACTION_KINDS = Object.freeze([
  {id:'eaves',label:'A ひさし'},
  {id:'window',label:'B 窓'},
  {id:'door',label:'C 戸口'}
]);
// Stage-3 sprite origins come directly from map.mjs: shop(p,43,22,...,8),
// shop(p,49,46,...,8). The bar has NO drawn sprite: never light its dummy pin.
const SHOPS = Object.freeze({
  'town-liquor':Object.freeze({x:86,y:44,roof:'#b88358',wood:'#946448'}),
  supermarket:Object.freeze({x:98,y:92,roof:'#73947e',wood:'#526e60'})
});
export const drawableShop=id=>Object.hasOwn(SHOPS,id);
const patch=(x,y,w,h,color)=>({x,y,w,h,color});
const limit=n=>Math.max(0,Math.min(REACTION_STEPS,Number.isFinite(n)?Math.floor(n):0));

export function reactionPatches(kind,shopId,step){
  const shop=SHOPS[shopId],s=limit(step);
  if(!shop||!s||!REACTION_KINDS.some(k=>k.id===kind))return [];
  const {x,y}=shop;
  if(kind==='eaves'){
    // Not separate blinking dots: a single contiguous 2-pixel strip is
    // progressively recolored along the existing lower roof tile row.
    // Both original roof layers remain aligned with the authored sprite.
    return [patch(x+2,y+4,s*2,2,shop.roof),
      ...(s>=4?[patch(x+4,y+2,Math.min(8,2*(s-3)),2,shop.wood)]:[])];
  }
  if(kind==='window'){
    // The existing four-pixel square window acquires an interior and then
    // one shutter moves onto the adjoining wall by exactly one map cell.
    const a=[patch(x+10,y+10,4,4,'#354c4a')];
    if(s>=2)a.push(patch(x+12,y+10,2,4,'#c39c67'));
    if(s>=3)a.push(patch(x+10,y+10,4,4,'#d7b77d'));
    if(s>=4)a.push(patch(x+8,y+10,2,4,shop.wood));
    if(s>=5)a.push(patch(x+10,y+12,2,2,'#e6cd91'));
    return a;
  }
  // The dark original doorway is 4x6 source pixels. It does not light up or
  // pulse: the 2x6 panel shifts left and reveals the warm interior once.
  const a=[patch(x+4,y+10,4,6,'#293a3b')];
  if(s>=2)a.push(patch(x+6,y+10,2,6,'#917658'));
  if(s>=3)a.push(patch(x+6,y+10,2,4,'#c9aa77'));
  if(s>=4)a.push(patch(x+2,y+10,2,6,shop.wood));
  if(s>=5)a.push(patch(x+6,y+10,2,4,'#d7bc84'));
  return a;
}
export function paintReaction(ctx,kind,shopId,step){
  ctx.clearRect(0,0,144,144);
  ctx.imageSmoothingEnabled=false;
  const patches=reactionPatches(kind,shopId,step);
  for(const p of patches){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.w,p.h);}
  return patches.length;
}
