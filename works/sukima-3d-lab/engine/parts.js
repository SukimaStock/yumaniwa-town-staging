// Shared fixed meshes and local rigid transforms; no time or input ownership.
import {add,sub,scale,dot,cross,norm,rotate,inverse,multiply,axisAngle,rotationMatrix} from './math.js?v=0.7.1';
import {compileParts} from './mesh.js?v=0.7.1';
import {packedMesh,pickMesh} from './geometry.js?v=0.7.1';
import {rayTriangle} from './math.js?v=0.7.1';
export function composePartPose(part,rotation,angle,translation=[0,0,0]){
 const q=rotation?axisAngle(rotation.axis,angle):[0,0,0,1];
 const pivot=rotation?rotation.pivot.map((v,i)=>v*part.transform.scale[i]):[0,0,0];
 const offset=add(sub(pivot,rotate(q,pivot)),translation),base=norm(part.transform.orientation);
 return {orientation:norm(multiply(base,q)),position:add(part.transform.position,rotate(base,offset))};
}
export class RigidParts {
 constructor(definition){
  this.parts=compileParts(definition);this.scale=definition.display.scale;let length=0;
  for(const part of this.parts){part.first=length/9;part.packed=packedMesh(part.mesh);part.count=part.packed.length/9;length+=part.packed.length;}
  this.packed=new Float32Array(length);for(const part of this.parts)this.packed.set(part.packed,part.first*9);
 }
 pose(part){return composePartPose(part,null,0);}
 drawCommands(orientation){
  const view=norm(orientation);
  return this.parts.map(part=>{
   const pose=this.pose(part),model=rotationMatrix(norm(multiply(view,pose.orientation))),position=rotate(view,scale(pose.position,this.scale));
   for(const index of [0,1,2,4,5,6,8,9,10])model[index]*=this.scale;
   model.set(position,12);
   return {id:part.id,first:part.first,count:part.count,model};
  });
 }
 // CPU snapshot for a static preview / validation only. The live renderer
 // instead sends fixed vertex buffers and the part model matrices above.
 snapshot(){
  const vertices=[],triangles=[],parts=[];
  for(const part of this.parts){
   const pose=this.pose(part),start=vertices.length;
   vertices.push(...part.mesh.rest.map(v=>scale(add(rotate(pose.orientation,v),pose.position),this.scale)));
   triangles.push(...part.mesh.triangles.map(t=>({...t,indices:t.indices.map(i=>start+i),normals:t.normals?.map(n=>rotate(pose.orientation,n))})));
   parts.push({id:part.id,start,count:part.mesh.rest.length});
  }
  return {rest:vertices,vertices,triangles,parts,radius:this.radius};
 }
 pick(origin,direction,visibleOnly=false){
  let closest=null;
  for(const part of this.parts){
   const pose=this.pose(part),inv=inverse(pose.orientation);
   const o=rotate(inv,sub(scale(origin,1/this.scale),pose.position)),d=rotate(inv,scale(direction,1/this.scale));
   let hit;
   if(!visibleOnly)hit=pickMesh(part.mesh,o,d);
   else for(const tri of part.mesh.triangles){
    const [a,b,c]=tri.indices.map(i=>part.mesh.rest[i]);
    if(!tri.doubleSided&&dot(cross(sub(b,a),sub(c,a)),d)>=0)continue;
    const candidate=rayTriangle(o,d,a,b,c);
    if(candidate&&(!hit||candidate.distance<hit.distance))hit={...candidate,face:tri.face,triangle:tri.indices};
   }
   if(hit&&(!closest||hit.distance<closest.distance))closest={...hit,part:part.id,point:scale(add(rotate(pose.orientation,hit.point),pose.position),this.scale)};
  }
  return closest;
 }
}

const TAU=Math.PI*2;
// Exact maximum of A cos(theta)+B sin(theta) over a bounded angular arc.
function arcMax(A,B,lo,hi){
 let result=Math.max(A*Math.cos(lo)+B*Math.sin(lo),A*Math.cos(hi)+B*Math.sin(hi));
 const critical=Math.atan2(B,A),first=Math.ceil((lo-critical)/TAU);
 if(critical+first*TAU<=hi+1e-12)result=Math.max(result,Math.hypot(A,B));
 return result;
}
// Bound the complete authored motion, not just t=0 or a few sampled frames.
// Slide endpoints and rotation arcs yield a safe bound even at different phases.
export function assemblyBounds(data,ranges){
 let radius=0;
 for(const part of data.parts??[]){
  const {rotation:r,slide:s}=ranges(part),base=norm(part.transform.orientation);
  const pivot=r?r.pivot.map((v,i)=>v*part.transform.scale[i]):[0,0,0],axis=r?norm(r.axis):[0,0,1];
  const endpoints=s?[s.min,s.max]:[0];
  const angles=r?[r.min,r.max]:[0,0];
  for(const raw of part.geometry.vertices){
   const v=raw.map((x,i)=>x*part.transform.scale[i]),u=sub(v,pivot),parallel=scale(axis,dot(u,axis)),radial=sub(u,parallel);
   const R=rotate(base,radial),T=rotate(base,cross(axis,radial));
   for(const amount of endpoints){
    const c=add(part.transform.position,rotate(base,add(add(pivot,parallel),s?scale(norm(s.direction),amount):[0,0,0])));
    const squared=dot(c,c)+dot(radial,radial)+2*arcMax(dot(c,R),dot(c,T),...angles);
    radius=Math.max(radius,Math.sqrt(Math.max(0,squared))*data.display.scale);
   }
  }
 }
 return radius;
}
