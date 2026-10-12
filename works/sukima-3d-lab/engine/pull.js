import {add,sub,scale,dot,cross} from './math.js?v=0.4.0';

export const PULL_DEFAULTS=Object.freeze({holdDelay:380,pullStrength:1,maxPull:.48,pullRadius:1.45,pullStiffness:520});
export function attachment(mesh,hit,vertices=mesh.vertices){
 return hit.triangle.reduce((p,index,j)=>add(p,scale(vertices[index],hit.barycentric[j])),[0,0,0]);
}
// A broad flat core keeps the grabbed triangle together. Smoothstep makes
// shared neighbours follow without detaching a face or assuming vertex IDs.
export function pullWeights(mesh,hit,radius){
 const point=attachment(mesh,hit,mesh.rest);
 const weights=mesh.rest.map(v=>{
  const u=Math.max(0,Math.min(1,(Math.hypot(...sub(v,point))/radius-.35)/.65));
  return 1-u*u*(3-2*u);
 });
 const anchor=hit.triangle.reduce((s,index,j)=>s+weights[index]*hit.barycentric[j],0);
 return weights.map(w=>w/Math.max(.1,anchor));
}
export function resistantPull(delta,strength,limit){
 const length=Math.hypot(...delta);if(!length)return [0,0,0];
 return scale(delta,limit*Math.tanh(length*strength/limit)/length);
}
export function shapeIsSafe(mesh,offsets,factor=1){
 for(const {indices} of mesh.triangles){
  const [a,b,c]=indices.map(i=>mesh.rest[i]);
  const [x,y,z]=indices.map(i=>add(mesh.rest[i],scale(offsets[i],factor)));
  const restNormal=cross(sub(b,a),sub(c,a)),normal=cross(sub(y,x),sub(z,x));
  // Signed area prevents folding/degeneracy; strain also limits stretched seams.
  if(dot(restNormal,normal)<.18*dot(restNormal,restNormal))return false;
  for(const [r,s,p,q] of [[a,b,x,y],[b,c,y,z],[c,a,z,x]]){
   const ratio=Math.hypot(...sub(p,q))/Math.hypot(...sub(r,s));
   if(ratio<.35||ratio>2)return false;
  }
 }
 return true;
}
// Rare safety guard for extreme drags/debug values. Scale the whole smooth
// field, never individual vertices, to retain neighbour continuity.
export function safeScale(mesh,offsets){
 // At rest skip triangle work. This epsilon is far below valid authored edges.
 if(offsets.every(v=>Math.hypot(...v)<1e-8))return 1;
 if(shapeIsSafe(mesh,offsets))return 1;
 let low=0,high=1;
 for(let i=0;i<12;i++){const middle=(low+high)/2;if(shapeIsSafe(mesh,offsets,middle))low=middle;else high=middle;}
 return low;
}
