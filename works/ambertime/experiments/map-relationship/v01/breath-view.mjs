// A pure, display-only projection for the M1-A breathing comparison.
// Exact stage-3 authored shop(p,...,8) sprites occupy 8x8 source cells (2px each).
export const BREATH_PERIOD_MS = 2200;
export const BREATH_REPLY_DELAY_MS = 320;
export const BREATH_MAX_SCALE = 1.28;

export const BREATH_PATTERNS = Object.freeze([
 {id:'together',label:'A 同時に呼吸',source:true,target:true,targetDelay:0},
 {id:'reply',label:'B 少し遅れて呼応',source:true,target:true,targetDelay:BREATH_REPLY_DELAY_MS},
 {id:'partner',label:'C 相手だけ',source:true,target:false,targetDelay:0}
]);
export const AUTHOR_SHOP_SPRITES=Object.freeze({
 'town-liquor':Object.freeze({x:86,y:44,w:16,h:16}),
 supermarket:Object.freeze({x:98,y:92,w:16,h:16})
});
// Opaque parts of the 8x8 shop() pixel art. Everything else is map terrain,
// which must NOT be enlarged as an accidental rectangular cutout.
const AUTHOR_SHOP_ROWS=Object.freeze([
 [2,6],[1,7],[1,7],[0,8],[0,8],[0,8],[0,8],[0,8]
]);
export function shopBreathRoles(pattern){
 const p=BREATH_PATTERNS.find(x=>x.id===pattern);
 return p?{source:p.source,target:p.target,sourceDelay:0,targetDelay:p.targetDelay}:null;
}
export function authoredSpriteBounds(shopId,observationBounds){
 const original=AUTHOR_SHOP_SPRITES[shopId],current=observationBounds?.[shopId];
 if(!original||!Array.isArray(current)||current.length!==4)return null;
 return original.x===current[0]&&original.y===current[1]&&
  original.w===current[2]&&original.h===current[3]?original:null;
}
export function authoredShopPixelIsVisible(x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=16||y>=16)return false;
 const [from,to]=AUTHOR_SHOP_ROWS[Math.floor(y/2)];
 return x>=from*2&&x<to*2;
}
// Mutate only the temporary 16x16 RGBA crop, never source canvas pixels.
// Exposed as pure data processing so edge cases are testable in Node.
export function alphaMaskShopCrop(rgba,width=16,height=16){
 if(!(rgba instanceof Uint8ClampedArray)||width!==16||height!==16||rgba.length!==width*height*4)
  throw new TypeError('Expected an authored 16x16 RGBA shop crop');
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)
  if(!authoredShopPixelIsVisible(x,y))rgba[(y*width+x)*4+3]=0;
 return rgba;
}
export function breathParticipants(link,pattern,visibleIds){
 const roles=shopBreathRoles(pattern);
 const shown=new Set(visibleIds??[]);
 if(!roles||!link?.canDrawLink||!shown.has(link.fromShopId)||!shown.has(link.selectedShopId)||
   link.fromShopId===link.selectedShopId)return [];
 return [
  ...(roles.source?[{id:link.fromShopId,role:'source',delayMs:roles.sourceDelay}]:[]),
  ...(roles.target?[{id:link.selectedShopId,role:'target',delayMs:roles.targetDelay}]:[])
 ];
}
