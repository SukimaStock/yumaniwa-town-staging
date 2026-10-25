import {layoutScene} from '../../../canvas-layout.mjs';
export {layoutScene};
export function identity(game,l){
 const group=game.lots.filter(x=>x.recipeId===l.recipeId);
 return {brand:group[0].label,number:group.findIndex(x=>x.id===l.id)+1,id:l.id};
}
export const age=m=>`${Math.floor(m/12)}年${m%12?m%12+'か月':''}`;
export function flavor(l){return `${{fruit:'果実香',smoke:'煙の香り',grain:'麦の香り',body:'厚み'}[l.product.aromaFamily]??'原酒香'}・樽香${l.product.wood>.45?'強め':l.product.wood>.15?'あり':'控えめ'}`;}
// Same cell colors, wall checker, floor and shelf rail geometry as CanvasScene.drawWorld.
// Kept here as SVG to share the native DOM controls without starting its game/storage runtime.
export function roomBackdrop(room){
 const l=layoutScene({room}),r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
 let s=`<defs><pattern id="wall-bricks" width="48" height="30" patternUnits="userSpaceOnUse">${r(0,0,48,30,'#41414b')+r(0,0,48,3,'#35353e')+r(0,15,48,3,'#35353e')+r(0,0,3,15,'#35353e')+r(24,15,3,15,'#35353e')}</pattern><pattern id="wall-check-left" width="6" height="6" patternUnits="userSpaceOnUse">${r(0,0,3,3,'#2d2d36')+r(3,3,3,3,'#2d2d36')}</pattern><pattern id="wall-check-right" x="333" width="6" height="6" patternUnits="userSpaceOnUse">${r(0,0,3,3,'#2d2d36')+r(3,3,3,3,'#2d2d36')}</pattern></defs>${r(0,0,360,l.floorY,'url(#wall-bricks)')+r(0,0,27,l.floorY,'url(#wall-check-left)')+r(333,0,27,l.floorY,'url(#wall-check-right)')}`;
 s+=r(0,l.floorY,360,640-l.floorY,'#644632');for(let x=0;x<360;x+=36)s+=r(x,l.floorY,3,640-l.floorY,'#3c281e')+r(x+3,l.floorY,3,640-l.floorY,'#a0785a');for(let y=l.floorY+90;y<640;y+=90)s+=r(0,y,360,3,'#a0785a');s+=r(0,l.floorY,360,6,'#19141e');
 const post=(x,y,w,h)=>r(x,y,w,h,'#19141e')+r(x+3,y+3,w-6,h-6,'#a0785a');
 if(room!=='distill'){const b=l.shelf;s+=post(b.x,b.y,9,b.h)+post(b.x+b.w-6,b.y,9,b.h);for(const y of b.rails)s+=r(b.x+3,y+3,b.w,9,'#19141e')+r(b.x,y,b.w,3,'#3c281e')+r(b.x,y+3,b.w,3,'#644632')+r(b.x,y+6,b.w,3,'#a0785a')+r(b.x,y+9,b.w,3,'#19141e');}
 else{s+=post(72,384,9,84)+post(282,384,9,84)+r(75,381,216,9,'#19141e')+r(72,378,216,9,'#19141e')+r(75,381,210,3,'#a0785a');}
 return `<svg viewBox="0 0 360 640" preserveAspectRatio="none" shape-rendering="crispEdges">${s}</svg>`;
}
