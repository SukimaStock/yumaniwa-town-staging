import {renderSVG as legacyRender} from './versions/0.1/renderer.mjs';
import {paperGrain,inkBreak} from './material-assets.mjs';
import {washLight,washDensity} from './watercolor-assets.mjs';
export function renderSVG(scene){
 if(!scene.study)return legacyRender(scene);
 const {colors:c,settings:s,width,height}=scene;
 let defs='',index=0;
 const ellipse=(x,y,rx,ry)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`;
 const path=d=>`<path d="${d}"/>`;
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
 function lemon(o){
  const r=o.rx,h=o.ry;
  // Rounded shoulders and short tips distinguish a lemon without an outline.
  const contour=`M${-r} 0 C${-r*.91} ${-h*.17} ${-r*.94} ${-h*.2} ${-r*.82} ${-h*.3} C${-r*.59} ${-h*.92} ${-r*.2} ${-h*1.07} ${r*.18} ${-h*.97} C${r*.55} ${-h*.94} ${r*.8} ${-h*.53} ${r*.9} ${-h*.17} L${r} 0 L${r*.9} ${h*.15} C${r*.77} ${h*.65} ${r*.4} ${h} 0 ${h} C${-r*.42} ${h} ${-r*.72} ${h*.74} ${-r*.85} ${h*.28} Z`;
  const leaf=o.leaf?`<path d="M-20 -34 C-42 -58 -57 -57 -66 -52 C-60 -32 -42 -28 -20 -34Z" fill="${c.leaf}"/>`:'';
  return `<g data-object="${o.id}" transform="translate(${o.x} ${o.y}) rotate(${o.angle})">${paint(path(contour),c[o.color],true)}${leaf}</g>`;
 }
 let body=paint(`<rect width="${width}" height="${height}"/>`,c.paper)+paint(`<rect y="432" width="900" height="288"/>`,c.table);
 for(const o of scene.objects){
  if(o.kind==='lemon'){body+=lemon(o);continue;}
  let shape='';
  if(o.kind==='cloth')shape=paint(path(o.outline),c.cloth)+paint(path(o.fold),c.fold);
  if(o.kind==='bottle')shape=paint(path(o.outline),c.bottle)+paint(path(o.side),c.bottleSide)+paint(ellipse(o.mouth.x,o.mouth.y,o.mouth.rx,o.mouth.ry),c.bottleMouth);
  if(o.kind==='ellipse')shape=paint(ellipse(o.x,o.y,o.rx,o.ry),c[o.color]);
  if(o.kind==='bowl')shape=paint(path(o.outline),c.bowl)+paint(path(o.rim),c.rim);
  body+=`<g data-object="${o.id}">${shape}</g>`;
 }
 if(s.texture!=='original')body+=`<use xlink:href="#paperGrain" opacity="${s.texture==='print'?.14:.09}"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="900" height="720" viewBox="0 0 900 720" role="img" aria-labelledby="art-title"><title id="art-title">レモンのある食卓</title><metadata>${JSON.stringify(s)}</metadata><defs>${defs}</defs>${body}</svg>`;
}
