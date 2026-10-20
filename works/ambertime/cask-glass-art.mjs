// Exact source cask renderer; existing sample glass is retained below.
const svg=(kind,w,h,body)=>`<svg class="pixel-object pixel-${kind}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
export {codeaCask as barrel} from './codea-object-art.mjs?v=0.57-codea-objects';
export function glass(wood=0,{sample=false}={}){
 // Keep the original Web thresholds and exact color/opacity, independent of age/type.
 const color=wood>.65?'#ad743a':wood>.3?'#d79743':wood>.1?'#dfb262':'#dfd2a8';
 const edge='#b9c0aa',light='#e3d9bc';
 const liquid=rect(3,11,10,3,color)+rect(4,14,8,2,color)+rect(5,16,6,1,color);
 const outline=rect(4,2,8,1,edge)+rect(3,3,1,5,edge)+rect(12,3,1,5,edge)+rect(2,8,1,6,edge)+rect(13,8,1,6,edge)+rect(3,14,1,2,edge)+rect(12,14,1,2,edge)+rect(4,16,2,1,edge)+rect(10,16,2,1,edge)+rect(6,17,4,1,edge)+rect(7,18,2,3,edge)+rect(4,21,8,1,edge)+rect(5,4,1,3,light);
 return svg('glass',16,24,`${sample?'<g class="sample-liquid">':''}<g fill-opacity=".82">${liquid}</g>${rect(3,11,10,1,color)}${sample?'</g>':''}${outline}`);
}
