import {add,sub,scale,cross,dot,norm,rayTriangle} from './math.js';
export function createPolyhedron() {
 const t=(1+Math.sqrt(5))/2;
 const raw=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
 const corners=raw.map((v,i)=>{const n=norm(v),r=1+Math.sin(i*7.31)*.045;return [n[0]*r*.96,n[1]*r*1.06,n[2]*r];});
 const faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
 const rest=corners.map(v=>v.slice()),triangles=[];
 faces.forEach((f,face)=>{
  const [a,b,c]=f.map(i=>rest[i]);
  if(dot(cross(sub(b,a),sub(c,a)),a)<0)f.reverse();
  const center=scale(f.reduce((sum,i)=>add(sum,rest[i]),[0,0,0]),1/3),m=rest.push(center)-1;
  for(let j=0;j<3;j++)triangles.push({indices:[f[j],f[(j+1)%3],m],face});
 });
 return {rest,vertices:rest.map(v=>v.slice()),faces,triangles};
}
export function pickMesh(mesh,origin,direction) {
 let closest=null;
 for(const tri of mesh.triangles){
  const hit=rayTriangle(origin,direction,...tri.indices.map(i=>mesh.vertices[i]));
  if(hit&&(!closest||hit.distance<closest.distance))closest={...hit,face:tri.face,triangle:tri.indices};
 }
 return closest;
}
export function packedMesh(mesh) {
 const out=new Float32Array(mesh.triangles.length*3*9);let offset=0;
 for(const {indices,face} of mesh.triangles){
  const [a,b,c]=indices.map(i=>mesh.vertices[i]),normal=norm(cross(sub(b,a),sub(c,a)));
  const shade=1+Math.sin(face*4.17)*.028,color=[.69*shade,.385*shade,.255*shade];
  for(const vertex of [a,b,c]){out.set([...vertex,...normal,...color],offset);offset+=9;}
 }
 return out;
}
