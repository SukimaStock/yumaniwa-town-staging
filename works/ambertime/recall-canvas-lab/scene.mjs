// H4-1 display research only. No model progression, persistence or randomness.
import {playbackScenes} from '../recall/live-scene.mjs';
import {renderMap} from '../experiments/world-map/v01/map.mjs';
import {codeaBottle,codeaCask,sourcePalette} from '../codea-object-art.mjs';
export const WIDTH=120,HEIGHT=72;
const regionArt=Object.freeze({'near-local':'region','near-wide':'region','national-food':'national','national-craft':'national','overseas-food':'overseas','overseas-craft':'overseas'});
export const sceneDimensions=view=>['national','overseas','region'].includes(view.art)?{width:144,height:144}:{width:WIDTH,height:HEIGHT};
export function sceneViews(edition){
 const captions=playbackScenes(edition);
 return captions.map((caption,index)=>{
  const event=edition.scenes[index].event,kind=event.kind;
  const place=event.ids?.shopId;
  // Only a known place gets a shop crop; an unfamiliar ID never becomes that shop.
  const art=kind==='delivery'||kind==='shop-start' ? (place==='town-liquor'?'shop':place==='supermarket'?'supermarket':'neutral')
   :kind==='arrival'||kind==='inquiry'?(Object.hasOwn(regionArt,event.ids?.regionId)?regionArt[event.ids.regionId]:'neutral'):kind==='visit'?'distillery'
   :kind==='bottling'||kind==='fill'?'bottle':'neutral';
  return Object.freeze({...caption,art});
 });
}
// Native Codea generators are the source of every bottle/cask cell and color.
// Their output is a fixed rect-only SVG; parse only those trusted generated rects.
export function assetCells(markup){
 return [...markup.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="(#[a-fA-F0-9]{6})"\/>/g)]
  .map(([,x,y,w,h,color])=>({x:+x,y:+y,w:+w,h:+h,color}));
}
const bottle=assetCells(codeaBottle('standard',{label:'cream',priceTier:'standard'}));
const cask=assetCells(codeaCask('bourbon'));
export function drawScene(ctx,view){
 if(!ctx)return;
 ctx.imageSmoothingEnabled=false;
 const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const dimensions=sceneDimensions(view);
 ctx.clearRect(0,0,dimensions.width,dimensions.height);
 if(['national','overseas','region'].includes(view.art)){
  // Render the entire native map: no clipped globe/island or resampled cells.
  renderMap(ctx,view.art==='overseas'?6:view.art==='national'?5:4);
 }else if(['shop','supermarket','distillery'].includes(view.art)){
  const stage=view.art==='distillery'?1:2;
  // Same map geometry/building at every date; no new drawing-only save fields.
  const offset=view.art==='shop'?[24,8]:view.art==='supermarket'?[24,68]:[12,36];
  ctx.save();ctx.beginPath();ctx.rect(0,0,WIDTH,HEIGHT);ctx.clip();
  ctx.translate(-offset[0],-offset[1]);renderMap(ctx,stage);ctx.restore();
 }else{
  // Main room's existing wall, one-cell mortar and floor colors (CanvasScene.drawWorld).
  rect(0,0,WIDTH,HEIGHT,'#41414b');
  for(let y=0;y<48;y+=5){rect(0,y,WIDTH,1,'#35353e');for(let x=(y/5%2)*8;x<WIDTH;x+=16)rect(x,y,1,5,'#35353e');}
  rect(0,48,WIDTH,24,sourcePalette[11]);
  for(let x=0;x<WIDTH;x+=12){rect(x,48,1,24,sourcePalette[10]);rect(x+1,48,1,24,sourcePalette[12]);}
  rect(0,48,WIDTH,2,sourcePalette[16]);
  if(view.art==='bottle'){
   for(const cell of cask)rect(40+cell.x,32+cell.y,cell.w,cell.h,cell.color);
   for(const cell of bottle)rect(72+cell.x,36+cell.y,cell.w,cell.h,cell.color);
  }
 }
}
