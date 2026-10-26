import {BODY_SIZE,pixelTypography} from './text-metrics.mjs?v=0.24-type-ui-1';

// Current main presentation default. Explicit 0 keeps the former size comparison.
// Reuse the normal Canvas body's integral physical font dots.
export const uniformRequested=search=>new URLSearchParams(search).get('font-uniform')!=='0';
export function uniformMetrics(viewport){
 const {scale,dpr}=viewport,body=pixelTypography(BODY_SIZE,scale*dpr),dot=body.pixels/8;
 const linePixels=10*dot;
 return {pixels:body.pixels,dot,cssSize:body.pixels/dpr,cssLine:linePixels/dpr,lineLogical:linePixels/(scale*dpr)};
}
export function installUniformTypography(search,root){
 if(!uniformRequested(search))return null;
 root.dataset.fontUniform='1';
 return {metrics:null,resize(viewport){
  this.metrics=uniformMetrics(viewport);
  root.style.setProperty('--uniform-font-size',this.metrics.cssSize+'px');
  root.style.setProperty('--uniform-line-height',this.metrics.cssLine+'px');
 }};
}
