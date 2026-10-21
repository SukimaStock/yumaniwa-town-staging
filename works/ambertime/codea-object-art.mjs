import {CAP_COLORS,IDENTITY_LABELS} from './brand-identity.mjs?v=0.58-first-brand';
// Exact top-row-first Codea DistilleryAssets matrices. See design/codea-cask-bottles/source-reference.json.
// Native dimensions are part of the asset: never pad, resample or author extra cells.
const freeze=rows=>Object.freeze(rows.map(row=>Object.freeze(row)));
export const Cask=freeze([
 [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
 [0,0,0,11,11,11,11,11,11,11,11,0,0,0,0,0],
 [0,0,11,12,12,12,12,12,12,12,12,11,0,0,0,0],
 [0,11,13,13,13,13,13,13,13,13,13,13,11,0,0,0],
 [0,11,12,11,11,11,11,11,11,11,11,12,11,0,0,0],
 [11,12,11,11,11,11,11,11,11,11,11,11,12,11,0,0],
 [11,12,11,11,11,11,11,11,11,11,11,11,12,11,0,0],
 [11,12,11,11,11,11,10,10,11,11,11,11,12,11,0,0],
 [11,12,11,11,11,11,11,11,11,11,11,11,12,11,0,0],
 [11,12,11,11,11,11,11,11,11,11,11,11,12,11,0,0],
 [11,12,11,11,11,11,11,11,11,11,11,11,12,11,0,0],
 [0,11,12,11,11,11,11,11,11,11,11,12,11,0,0,0],
 [0,11,13,13,13,13,13,13,13,13,13,13,11,0,0,0],
 [0,0,11,11,11,11,11,11,11,11,11,11,0,0,0,0],
 [0,0,0,10,10,10,10,10,10,10,10,0,0,0,0,0],
 [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
]);
export const BottleStandard=freeze([
 [0,0,0,0,0,0,0,0,0,0,0,0],
 [0,0,0,0,4,4,4,4,0,0,0,0],
 [0,0,0,0,9,21,21,9,0,0,0,0],
 [0,0,0,0,9,21,21,9,0,0,0,0],
 [0,0,0,9,21,21,21,21,9,0,0,0],
 [0,0,0,9,21,7,7,21,9,0,0,0],
 [0,0,0,9,21,7,7,21,9,0,0,0],
 [0,0,0,9,21,7,7,21,9,0,0,0],
 [0,0,0,9,21,21,21,21,9,0,0,0],
 [0,0,0,9,21,21,21,21,9,0,0,0],
 [0,0,0,9,9,9,9,9,9,0,0,0],
 [0,0,0,0,0,0,0,0,0,0,0,0]
]);
export const BottleFancy=freeze([
 [0,0,0,0,0,0,0,0,0,0,0,0],
 [0,0,0,0,0,20,20,0,0,0,0,0],
 [0,0,0,0,9,21,21,9,0,0,0,0],
 [0,0,0,9,21,21,21,21,9,0,0,0],
 [0,0,9,21,21,21,21,21,21,9,0,0],
 [0,0,9,21,6,6,6,21,21,9,0,0],
 [0,0,9,21,6,20,6,21,21,9,0,0],
 [0,0,9,21,6,6,6,21,21,9,0,0],
 [0,0,9,21,21,21,21,21,21,9,0,0],
 [0,0,0,9,21,21,21,21,9,0,0,0],
 [0,0,0,0,9,9,9,9,0,0,0,0],
 [0,0,0,0,0,0,0,0,0,0,0,0]
]);
export const BottleSquare=freeze([
 [0,0,0,0,0,0,0,0,0,0,0,0],
 [0,0,0,0,13,13,13,13,0,0,0,0],
 [0,0,0,0,9,21,21,9,0,0,0,0],
 [0,0,0,0,9,21,21,9,0,0,0,0],
 [0,0,9,9,9,9,9,9,9,9,0,0],
 [0,0,9,21,7,7,7,7,21,9,0,0],
 [0,0,9,21,7,7,7,7,21,9,0,0],
 [0,0,9,21,7,7,7,7,21,9,0,0],
 [0,0,9,21,21,21,21,21,21,9,0,0],
 [0,0,9,9,9,9,9,9,9,9,0,0],
 [0,0,0,0,0,0,0,0,0,0,0,0],
 [0,0,0,0,0,0,0,0,0,0,0,0]
]);
export const BottleTall=freeze([
 [0,0,0,0,0,0,0,0,0,0,0,0],
 [0,0,0,0,0,10,10,0,0,0,0,0],
 [0,0,0,0,0,10,10,0,0,0,0,0],
 [0,0,0,0,0,9,9,0,0,0,0,0],
 [0,0,0,0,0,9,9,0,0,0,0,0],
 [0,0,0,0,9,21,21,9,0,0,0,0],
 [0,0,0,0,9,21,21,9,0,0,0,0],
 [0,0,0,0,9,7,7,9,0,0,0,0],
 [0,0,0,0,9,7,7,9,0,0,0,0],
 [0,0,0,0,9,21,21,9,0,0,0,0],
 [0,0,0,0,9,9,9,9,0,0,0,0],
 [0,0,0,0,0,0,0,0,0,0,0,0]
]);

export const sourcePalette=Object.freeze({4:'#32ff32',6:'#ffc832',7:'#646464',9:'#29adff',10:'#3c281e',11:'#644632',12:'#a0785a',13:'#282832',14:'#5a5a64',16:'#19141e',17:'#f0e6c8',18:'#28285a',19:'#c8c8dc',20:'#b87333',21:'#c89632',22:'#ffff64'});
export const glassColor='#8f9a7d';
export const caskPalettes=Object.freeze({bourbon:Object.freeze({10:'#503214',11:'#b46e28',12:'#dca050'}),refill:Object.freeze({10:'#463c32',11:'#a09678',12:'#c8beaa'})});
export const bottles=Object.freeze({standard:BottleStandard,fancy:BottleFancy,square:BottleSquare,tall:BottleTall});
function render(kind,rows,palette,classes,colorAt=(index)=>palette[index]){
 const h=rows.length,w=rows[0].length,bottom=rows.reduce((bottom,row,y)=>row.some(Boolean)?y+1:bottom,0);
 const body=rows.map((row,y)=>row.map((index,x)=>index?`<rect x="${x}" y="${y}" width="1" height="1" fill="${colorAt(index,x,y)}"/>`:'').join('')).join('');
 return `<svg class="${classes}" data-codea="${kind}" data-content-bottom="${bottom}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
export function codeaCask(type='bourbon'){return render('cask',Cask,{...sourcePalette,...(caskPalettes[type]??caskPalettes.bourbon)},'pixel-object pixel-cask');}
export function codeaBottle(shape='standard',{label=null,priceTier=null}={}){
 const rows=bottles[shape]??BottleStandard,palette={...sourcePalette,9:glassColor},labelStyle=IDENTITY_LABELS.find(x=>x.id===label),cap=CAP_COLORS[priceTier];
 return render('bottle',rows,palette,'room-object room-bottle',(index,x,y)=>{
  if(cap&&y>=1&&y<=(shape==='tall'?2:1))return cap;
  if(labelStyle){if(index===6||index===7)return labelStyle.color;if(shape==='fancy'&&x===5&&y===6)return labelStyle.detail;}
  return palette[index];
 });
}

