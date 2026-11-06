// H4-1 display research only. No model progression, persistence or randomness.
import {playbackScenes} from '../recall/live-scene.mjs';
import {codeaBottle,codeaCask,sourcePalette} from '../codea-object-art.mjs';
export const WIDTH=120,HEIGHT=72;
export const sceneDimensions=()=>({width:WIDTH,height:HEIGHT});
export function sceneViews(edition){
 const captions=playbackScenes(edition);
 return captions.map((caption,index)=>{
  const event=edition.scenes[index].event,kind=event.kind;
  const place=event.ids?.shopId;
  // Known shop identity stays stable; unknown places do not impersonate that shop.
  const art=kind==='delivery'||kind==='shop-start' ? (place==='town-liquor'?'shop':place==='supermarket'?'supermarket':'neutral')
   :kind==='arrival'?'street':kind==='inquiry'?'letter':kind==='visit'?'distillery'
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
 const P=sourcePalette,ink=P[16],wood=P[11],edge=P[10],light=P[12],paper=P[17];
 // Shared front-view parts; one native cell per outline. No map or geographic claims.
 const window=(x,y,w,h)=>{rect(x,y,w,h,ink);rect(x+1,y+1,w-2,h-2,P[21]);rect(x+Math.floor(w/2),y,1,h,edge);rect(x,y+Math.floor(h/2),w,1,edge);};
 const person=(x,y)=>{rect(x+2,y,4,1,ink);rect(x+1,y+1,6,4,light);rect(x+1,y+1,2,1,ink);rect(x,y+5,8,9,P[14]);rect(x+1,y+14,2,4,ink);rect(x+5,y+14,2,4,ink);};
 const asset=(cells,x,y)=>{for(const cell of cells)rect(x+cell.x,y+cell.y,cell.w,cell.h,cell.color);};
 const facade=(x,y,w,h)=>{rect(x,y,w,h,ink);rect(x+1,y+2,w-2,h-2,P[14]);rect(x-2,y,w+4,2,ink);rect(x+1,y+3,w-2,1,light);};
 if(['shop','supermarket','street','distillery'].includes(view.art)){
  rect(0,0,WIDTH,HEIGHT,P[13]);rect(0,47,WIDTH,25,P[14]);
  if(view.art==='street'){
   // Same street-level silhouette as the original distant scene; no landmark/location invented.
   for(const [x,y,w] of [[2,22,20],[26,10,22],[52,20,17],[73,7,21],[98,18,20]]){
    facade(x,y,w,54-y);
    for(let yy=y+9;yy<48;yy+=10)for(let xx=x+4;xx<x+w-3;xx+=7)window(xx,yy,4,5);
   }
   rect(0,54,WIDTH,18,P[13]);rect(0,54,WIDTH,1,ink);
   person(20,50);person(85,49);
  }else{
   facade(18,10,84,45);
   if(view.art==='distillery'){
    window(25,24,17,18);window(79,24,16,18);
    rect(51,20,21,35,ink);rect(53,22,17,31,wood);window(57,26,9,14);
    rect(0,56,WIDTH,16,edge);person(86,49);
   }else{
    rect(19,16,82,6,view.art==='supermarket'?P[14]:wood);
    for(let x=20;x<98;x+=12)rect(x,16,6,6,paper);
    window(25,28,28,22);rect(65,27,28,28,ink);rect(67,29,24,25,wood);window(72,31,14,15);
    asset(bottle,27,37);asset(bottle,40,37);
    rect(17,55,86,2,ink);
   }
  }
  rect(0,69,WIDTH,1,light);
 }else{
  // Main room's existing wall, one-cell mortar and floor colors (CanvasScene.drawWorld).
  rect(0,0,WIDTH,HEIGHT,'#41414b');
  for(let y=0;y<48;y+=5){rect(0,y,WIDTH,1,'#35353e');for(let x=(y/5%2)*8;x<WIDTH;x+=16)rect(x,y,1,5,'#35353e');}
  rect(0,48,WIDTH,24,sourcePalette[11]);
  for(let x=0;x<WIDTH;x+=12){rect(x,48,1,24,sourcePalette[10]);rect(x+1,48,1,24,sourcePalette[12]);}
  rect(0,48,WIDTH,2,sourcePalette[16]);
  if(view.art==='letter'){
   window(87,9,22,18);
   rect(20,46,78,4,ink);rect(22,46,74,2,light);
   rect(26,50,3,15,edge);rect(90,50,3,15,edge);
   rect(40,39,38,17,ink);rect(41,40,36,15,paper);
   // A folded envelope, not written labels or additional narrative text.
   for(let i=0;i<8;i++){rect(43+i*2,41+i,2,1,light);rect(73-i*2,41+i,2,1,light);}
   asset(bottle,94,35);
  }else if(view.art==='bottle'){
   for(const cell of cask)rect(40+cell.x,32+cell.y,cell.w,cell.h,cell.color);
   for(const cell of bottle)rect(72+cell.x,36+cell.y,cell.w,cell.h,cell.color);
  }
 }
}
