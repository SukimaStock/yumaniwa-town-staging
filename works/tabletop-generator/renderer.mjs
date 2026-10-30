import {renderSVG as legacyRender} from './versions/0.2/renderer.mjs';
import {paperGrain,inkBreak} from './material-assets.mjs';
import {washLight,washDensity} from './watercolor-assets.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function renderSVG(scene){
 if(scene.settings.version!==3)return legacyRender(scene);
 const {colors:c,settings:s,width,height}=scene;
 let defs='',index=0;
 const ellipse=(x,y,rx,ry)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`;
 const path=d=>`<path d="${d}"/>`;
 const frame=o=>o.frame?`matrix(${o.frame.scale} 0 0 ${o.frame.scale} ${o.frame.x} ${o.frame.y}) `:'';
 const assets=s.texture==='print'?{inkBreak,paperGrain}:s.texture==='watercolor'?{washLight,washDensity,paperGrain}:{};
 for(const [id,data]of Object.entries(assets))defs+=`<image id="${id}" x="-100" y="-100" width="1100" height="920" preserveAspectRatio="none" xlink:href="${data}"/>`;
 function paint(shape,color,local=false){
  let content=`<g fill="${color}">${shape}</g>`;
  if(s.texture!=='original'){
   const id=`surface-${index++}`;defs+=`<clipPath id="${id}">${shape}</clipPath>`;
   const layers=s.texture==='print'?'<use xlink:href="#inkBreak" opacity=".22"/>':'<use xlink:href="#washLight" opacity=".18"/><use xlink:href="#washDensity" opacity=".045"/>';
   content+=`<g clip-path="url(#${id})"><g${local?' transform="translate(-450 -360)"':''}>${layers}</g></g>`;
  }
  return content;
 }
 let body=paint(`<rect width="${width}" height="${height}"/>`,c.paper)+paint(`<rect y="432" width="900" height="288"/>`,c.table);
 for(const o of scene.objects){
  if(o.kind==='fruit'){
   body+=`<g data-object="${o.id}" transform="${frame(o)}translate(${o.x} ${o.y}) rotate(${o.angle})">${paint(path(o.outline),c[o.color],true)}${o.stem?paint(path(o.stem),c.stem,true):''}</g>`;continue;
  }
  let shape='';
  if(o.kind==='cloth')shape=paint(path(o.outline),c.cloth)+paint(path(o.fold),c.fold);
  if(o.kind==='bottle'){
   const l=o.label;
   shape=`<g transform="translate(257 0) scale(${o.widthScale} 1) translate(-257 0)">${paint(path(o.outline),c.bottle)}${paint(path(o.side),c.bottleSide)}${paint(ellipse(o.mouth.x,o.mouth.y,o.mouth.rx+2,o.mouth.ry+1),c.bottleLip)}${paint(ellipse(o.mouth.x,o.mouth.y,o.mouth.rx-5,o.mouth.ry-2),c.bottleMouth)}${paint(`<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}"/>`,c.label)}</g>`;
  }
  if(o.kind==='beer-glass'){
   // A single pale silhouette, amber surface and quiet foam cap; no rim/base rings.
   shape=paint(path(o.outline),c.glassLine);
   shape+=paint(path(o.liquid),c.wine);
   shape+=paint(path(o.foam),c.foam);
  }
  if(o.kind==='glass'){
   const id='drink-bowl';defs+=`<clipPath id="${id}">${path(o.outline)}</clipPath>`;
   shape=paint(ellipse(o.x,o.base,46,9),c.glassLine)+paint(`<rect x="${o.x-3}" y="458" width="6" height="${o.base-458}"/>`,c.glassLine);
   shape+=`<g opacity=".36">${paint(path(o.outline),c.glass)}</g>`;
   const liquid=paint(path(o.liquid),c.wine)+paint(ellipse(o.x,o.level,49,11),c.wineTop);
   shape+=`<g clip-path="url(#${id})">${liquid}</g>`;
   shape+=`<path d="${o.sides}" fill="none" stroke="${c.glassLine}" stroke-width="3"/>`;
   shape+=`<ellipse cx="${o.x}" cy="${o.top}" rx="54" ry="12" fill="none" stroke="${c.glassLine}" stroke-width="3"/>`;
  }
  if(o.kind==='cork')shape=`<g transform="translate(${o.x} ${o.y}) rotate(${o.angle})">${paint('<path d="M-24.5 -11 H18 Q24.5 -11 24.5 0 Q24.5 11 18 11 H-24.5 Z"/>',c.cork,true)}${paint(ellipse(-24.5,0,4,11),c.corkEnd,true)}</g>`;
  if(o.kind==='cap'){
   const outline=Array.from({length:32},(_,i)=>{const a=i*Math.PI/16,r=i%2?.87:1;return `${i?'L':'M'}${(Math.cos(a)*17*r).toFixed(3)} ${(Math.sin(a)*9*r).toFixed(3)}`;}).join(' ')+'Z';
   shape=`<g transform="translate(${o.x} ${o.y})">${paint(path(outline),c.capEdge,true)}<g transform="translate(0 -3)">${paint(path(outline),c.cap,true)}</g>${paint(ellipse(0,-3,11,5),c.cap,true)}</g>`;
  }
  if(o.kind==='ellipse')shape=paint(ellipse(o.x,o.y,o.rx,o.ry),c[o.color]);
  if(o.kind==='bowl')shape=paint(path(o.outline),c.bowl)+paint(path(o.rim),c.rim);
  body+=`<g data-object="${o.id}"${o.frame?` transform="${frame(o).trim()}"`:''}>${shape}</g>`;
 }
 if(s.texture!=='original')body+=`<use xlink:href="#paperGrain" opacity="${s.texture==='print'?.14:.09}"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="900" height="720" viewBox="0 0 900 720" role="img" aria-labelledby="art-title"><title id="art-title">${esc(scene.title)}</title><metadata>${esc(JSON.stringify(s))}</metadata><defs>${defs}</defs>${body}</svg>`;
}
