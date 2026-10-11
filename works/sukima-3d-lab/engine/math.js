// Small column-major math module. No DOM or external dependencies.
export const add = (a,b) => a.map((v,i)=>v+b[i]);
export const sub = (a,b) => a.map((v,i)=>v-b[i]);
export const scale = (a,s) => a.map(v=>v*s);
export const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm = a => scale(a,1/(Math.hypot(...a)||1));
export const identity = () => [0,0,0,1];
export function multiply(a,b) {
 const [x,y,z,w]=a,[u,v,t,s]=b;
 return [w*u+x*s+y*t-z*v,w*v-x*t+y*s+z*u,w*t+x*v-y*u+z*s,w*s-x*u-y*v-z*t];
}
export function axisAngle(axis,angle) {
 const n=norm(axis),s=Math.sin(angle/2); return [...scale(n,s),Math.cos(angle/2)];
}
export function rotate(q,v) {
 const t=scale(cross(q.slice(0,3),v),2);
 return add(v,add(scale(t,q[3]),cross(q.slice(0,3),t)));
}
export const inverse = q => [-q[0],-q[1],-q[2],q[3]];
export function rotationMatrix(q) {
 const x=rotate(q,[1,0,0]),y=rotate(q,[0,1,0]),z=rotate(q,[0,0,1]);
 return new Float32Array([...x,0,...y,0,...z,0,0,0,0,1]);
}
export function perspective(fov,aspect,near=.1,far=40) {
 const f=1/Math.tan(fov/2),d=near-far;
 return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/d,-1,0,0,2*far*near/d,0]);
}
export function rayTriangle(origin,direction,a,b,c) {
 const e1=sub(b,a),e2=sub(c,a),p=cross(direction,e2),det=dot(e1,p);
 if(Math.abs(det)<1e-9)return null;
 const t=sub(origin,a),u=dot(t,p)/det;
 if(u<-1e-7||u>1+1e-7)return null;
 const q=cross(t,e1),v=dot(direction,q)/det;
 if(v<-1e-7||u+v>1+1e-7)return null;
 const distance=dot(e2,q)/det;
 return distance>1e-6?{distance,point:add(origin,scale(direction,distance)),barycentric:[1-u-v,u,v]}:null;
}
