// Main-only pixel objects. Codea AmberTime CaskVisual/DistilleryAssets informed
// the stepped 16-cell silhouette and three wood tones. No game state lives here.
const svg=(kind,w,h,body)=>`<svg class="pixel-object pixel-${kind}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
function caskCells(){
 const cells=Array.from({length:16},()=>Array(16).fill('.'));
 const run=(x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)cells[yy][xx]=c;};
 run(4,1,8,1,'d');run(3,2,10,1,'d');run(2,3,12,2,'d');run(1,5,14,6,'d');run(2,11,12,2,'d');run(3,13,10,1,'d');run(4,14,8,1,'d');
 run(4,2,8,1,'l');run(3,4,10,7,'m');run(2,5,12,6,'m');run(3,11,10,2,'m');run(4,13,8,1,'m');
 // Three plain stave joints and one edge highlight, without wood grain.
 for(const x of [5,8,11])run(x,4,1,9,'d');
 run(2,5,1,6,'l');run(3,4,1,1,'l');run(3,11,1,1,'l');
 run(2,3,12,1,'b');run(2,12,12,1,'b');
 run(3,3,9,1,'h');run(3,12,9,1,'h');
 run(7,7,2,1,'d');run(7,8,2,1,'l');
 return cells;
}
const CASK=caskCells();
function pixels(cells,palette){return cells.map((row,y)=>row.map((c,x)=>c==='.'?'':rect(x,y,1,1,palette[c])).join('')).join('');}
export function barrel(type='bourbon'){
 const wood=type==='refill'?{d:'#463c32',m:'#a09678',l:'#c8beaa'}:{d:'#503214',m:'#b46e28',l:'#dca050'};
 const palette={...wood,b:'#414644',h:'#8b8b70'};
 return svg('cask',16,16,pixels(CASK,palette));
}
export function glass(wood=0,{sample=false}={}){
 // Keep the original Web thresholds and exact color/opacity, independent of age/type.
 const color=wood>.65?'#ad743a':wood>.3?'#d79743':wood>.1?'#dfb262':'#dfd2a8';
 const edge='#b9c0aa',light='#e3d9bc';
 const liquid=rect(3,11,10,3,color)+rect(4,14,8,2,color)+rect(5,16,6,1,color);
 const outline=rect(4,2,8,1,edge)+rect(3,3,1,5,edge)+rect(12,3,1,5,edge)+rect(2,8,1,6,edge)+rect(13,8,1,6,edge)+rect(3,14,1,2,edge)+rect(12,14,1,2,edge)+rect(4,16,2,1,edge)+rect(10,16,2,1,edge)+rect(6,17,4,1,edge)+rect(7,18,2,3,edge)+rect(4,21,8,1,edge)+rect(5,4,1,3,light);
 return svg('glass',16,24,`${sample?'<g class="sample-liquid">':''}<g fill-opacity=".82">${liquid}</g>${rect(3,11,10,1,color)}${sample?'</g>':''}${outline}`);
}
