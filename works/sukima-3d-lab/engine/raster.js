// Small static thumbnail raster. No DOM, animation, WebGL context or asset.
// Uses the shipped packed geometry, perspective camera and matte light model.
import {packedMesh} from './geometry.js?v=0.6.0';
import {rotate,norm,dot} from './math.js?v=0.6.0';
export function rasterMesh(mesh,orientation,camera,size=200,diagnostics=false){
 if(!Number.isInteger(size)||size<16||size>512)throw new RangeError('Preview size');
 const pixels=new Uint8ClampedArray(size*size*4),depth=new Float32Array(size*size),packed=packedMesh(mesh),light=norm([-.6,.85,1.2]),t=Math.tan(camera.fov/2);
 const edgeDistance=diagnostics?new Float32Array(size*size):null;
 const edge=(a,b,x,y)=>(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
 for(let i=0;i<packed.length;i+=27){
  const tri=[];
  for(let j=0;j<3;j++){
   const k=i+j*9,p=rotate(orientation,Array.from(packed.subarray(k,k+3))),n=rotate(orientation,Array.from(packed.subarray(k+3,k+6))),z=camera.distance-p[2];
   tri.push({x:(1+p[0]/(z*t*camera.aspect))*size/2,y:(1-p[1]/(z*t))*size/2,inv:1/z,n,c:packed.subarray(k+6,k+9)});
  }
  if(tri.some(p=>p.inv<=0))continue; // All validated display meshes are in front.
  const [a,b,c]=tri,area=edge(a,b,c.x,c.y);if(area>=-1e-9)continue;
  const distances=edgeDistance?[Math.hypot(b.x-c.x,b.y-c.y),Math.hypot(c.x-a.x,c.y-a.y),Math.hypot(a.x-b.x,a.y-b.y)]:null;
  const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(size-1,Math.ceil(Math.max(a.x,b.x,c.x))),minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(size-1,Math.ceil(Math.max(a.y,b.y,c.y)));
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const weights=[edge(b,c,x+.5,y+.5)/area,edge(c,a,x+.5,y+.5)/area,edge(a,b,x+.5,y+.5)/area];if(weights.some(w=>w<-1e-7))continue;
   const inv=weights.reduce((v,w,j)=>v+w*tri[j].inv,0),index=y*size+x;if(inv<=depth[index])continue;
   depth[index]=inv;
   if(edgeDistance)edgeDistance[index]=Math.min(...weights.map((w,j)=>w*Math.abs(area)/distances[j]));
   const n=norm([0,1,2].map(k=>weights.reduce((v,w,j)=>v+w*tri[j].inv*tri[j].n[k],0)/inv));
   const strength=.66+.30*Math.max(0,dot(n,light))+.07*(.5+.5*n[1]);
   for(let k=0;k<3;k++)pixels[index*4+k]=Math.round(a.c[k]*strength*255);
   pixels[index*4+3]=255;
  }
 }
 return {width:size,height:size,pixels,depth,...(edgeDistance?{edgeDistance}:{})};
}
