// Display only: use the bottled snapshot, never the live cask or flavor.primary.
import {glassColor} from './flavor-color.mjs';
import {bottles,codeaBottle} from './codea-object-art.mjs?v=0.62-bottle-shelf-wall';
import {bottleShape,releasePriceTier} from './brand-identity.mjs?v=0.58-first-brand';
export const PACKAGE_PALETTE=Object.freeze({fruit:'#7c3e51',grain:'#91622c',smoke:'#354c62',body:'#2f5d53',mixed:'#5b5055'});
const axes=['fruit','grain','smoke','body','rough','spice','wood','vanilla'];
export function packageFamily(snapshot){
 const flavor=snapshot?.flavor,p=flavor?.profile;
 if(flavor?.version!==1||axes.some(k=>!Number.isFinite(p?.[k])||p[k]<0||p[k]>1))return null;
 return glassColor(p).family;
}
const shade=(color,amount)=>'#'+[1,3,5].map(i=>{const v=parseInt(color.slice(i,i+2),16);return Math.round(amount>=0?v+(255-v)*amount:v*(1+amount)).toString(16).padStart(2,'0');}).join('');
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
export function packageBox(snapshot){
 const family=packageFamily(snapshot);if(!family)return '';
 const color=PACKAGE_PALETTE[family],light=shade(color,.26);
 // C1-L on the bottle's 2-unit pixel grid (x even, y odd), anchored at y=23.
 // 10x18 keeps the box subordinate; no half-size border or decoration pixels.
 return '<g class="package-box">'+rect(12,5,10,18,shade(color,-.34))+rect(14,7,6,14,color)+rect(14,7,2,14,light)+rect(16,9,4,2,'#e1d3af')+rect(16,19,4,2,light)+'</g>';
}
// Reuse the original SVG cells verbatim, including the ceremony's separate label.
export function packageLayer(bottle,snapshot,{box=true,shape='standard'}={}){
 const family=packageFamily(snapshot);if(!family)return bottle;
 // Use the complete bottle silhouette for both the glass and separate label.
 const rows=bottles[shape]??bottles.standard;
 const bottom=rows.reduce((bottom,row,y)=>row.some(Boolean)?y+1:bottom,0);
 const offsetY=23-bottom*2;
 const cells=bottle.slice(bottle.indexOf('>')+1,bottle.lastIndexOf('</svg>'));
 return `<svg class="room-object room-bottle release-package" data-codea="bottle" data-package-family="${family}" data-content-bottom="23" viewBox="0 0 24 24" width="24" height="24" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${box?packageBox(snapshot):''}<g class="package-bottle" transform="translate(-2 ${offsetY}) scale(2)">${cells}</g></svg>`;
}
export function packageArt(snapshot,brand={},priceTier='standard'){
 return packageLayer(codeaBottle(bottleShape(brand),{label:brand?.label==='dark'?'dark':'cream',priceTier}),snapshot,{shape:bottleShape(brand)});
}
export function releasePackageArt(state,productId,{brandId=null,snapshot=null}={}){
 // Guard missing IDs: historical wholesale rows must not match an unrelated row.
 const release=productId==null?null:state.releases?.find(r=>r.productId===productId);
 const record=productId==null?null:state.records?.find(r=>r.productId===productId);
 const brand=state.brands?.find(b=>b.id===(brandId??release?.brandId??record?.brandId));
 return packageArt(release?.profile??record?.profile??snapshot,brand,releasePriceTier(state,productId));
}
