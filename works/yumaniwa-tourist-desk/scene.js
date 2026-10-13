import {RigidParts} from '../sukima-3d-lab/engine/parts.js?v=0.7.1';
import {MotionPlayer} from '../sukima-3d-lab/engine/motion.js?v=0.7.1';
import {ManipulationPlayer} from '../sukima-3d-lab/engine/manipulation.js?v=0.7.1';
import {validateSpecimen} from '../sukima-3d-lab/engine/specimen.js?v=0.7.1';
import {Camera} from '../sukima-3d-lab/engine/camera.js?v=0.7.1';
import {axisAngle,multiply,rotate,inverse,add,sub,scale,rotationMatrix,norm,cross,dot} from '../sukima-3d-lab/engine/math.js?v=0.7.1';
import {LAYOUT} from './layout.js';
export {LAYOUT};
export const DESK={halfWidth:3.28,halfDepth:2.85};
export function transformPoint(matrix,p){return [0,1,2].map(i=>matrix[i]*p[0]+matrix[i+4]*p[1]+matrix[i+8]*p[2]+matrix[i+12]);}
export function matrixProduct(a,b){const m=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m;}
function modelMatrix(q,s,p){const m=rotationMatrix(q);for(const i of [0,1,2,4,5,6,8,9,10])m[i]*=s;m.set(p,12);return m;}
export class DeskItem {
 constructor(entry,source){
  validateSpecimen(source);this.entry=entry;this.source=source;this.id=entry.id;
  const definition=structuredClone(source);
  // Same authored globe axle/pivot, transferred from autonomous spin to direct rotation.
  if(this.id==='school-globe'){
   const t=definition.behaviors.motion.tracks[0];delete definition.behaviors.motion;
   definition.behaviors.manipulation={version:1,controls:[{part:t.part,type:'rotate',axis:t.axis,pivot:t.pivot,initial:t.initialAngle,sensitivity:1,inertia:.45,damping:6}]};
  }
  this.motion=definition.behaviors.motion?new MotionPlayer(definition):null;
  this.player=definition.behaviors.manipulation?new ManipulationPlayer(definition,this.motion):this.motion??new RigidParts(definition);
  this.orientation=multiply(axisAngle([0,1,0],entry.yaw),entry.flat?axisAngle([1,0,0],Math.PI/2):[0,0,0,1]);
  const points=this.player.snapshot().rest.map(p=>rotate(this.orientation,p));
  const lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
  this.scale=entry.size/Math.max(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]);
  this.position=[entry.x,-lo[1]*this.scale+.012+(entry.mount?.55:0)+(entry.pot?.14:0),entry.z];
  this.pickRadius=(this.player.radius??Math.max(...points.map(p=>Math.hypot(...p))))*this.scale;
  this.home=this.position.slice();this.returning=null;this.bounds={lo,hi};
 }
 toWorld(p){return add(this.position,scale(rotate(this.orientation,p),this.scale));}
 toLocal(p){return scale(rotate(inverse(this.orientation),sub(p,this.position)),1/this.scale);}
 commands(view){const outer=modelMatrix(view,1,[0,0,0]),object=modelMatrix(this.orientation,this.scale,this.position);return this.player.drawCommands([0,0,0,1]).map(c=>({...c,model:matrixProduct(outer,matrixProduct(object,c.model))}));}
 pick(ray){const toward=sub(this.position,ray.origin),along=dot(toward,ray.direction);if(along<0||dot(toward,toward)-along*along>this.pickRadius*this.pickRadius)return null;const o=this.toLocal(ray.origin),d=scale(rotate(inverse(this.orientation),ray.direction),1/this.scale);const hit=this.player.pick(o,d,true);return hit?{...hit,item:this}:null;}
 step(dt){this.motion?.step(dt);if(this.player!==this.motion)this.player.step?.(dt);if(this.returning){const c=this.player.control(this.returning.part),mix=1-Math.exp(-dt*13);c.value+=(this.returning.value-c.value)*mix;if(Math.abs(c.value-this.returning.value)<.0005){c.value=this.returning.value;this.returning=null;}}}
 localCamera(camera,view){return {aspect:camera.aspect,distance:camera.distance,fov:camera.fov,project:(p,r)=>camera.project(this.toWorld(p),r,view),ray:(x,y,r)=>{const ray=camera.ray(x,y,r,view);return {origin:this.toLocal(ray.origin),direction:norm(rotate(inverse(this.orientation),ray.direction))};}};}
}
export class DeskScene {
 constructor(items){this.items=items;this.camera=new Camera();this.view=axisAngle([1,0,0],.78);this.resize(390,844);}
 resize(w,h){this.camera.resize(w,h,1.1);this.camera.distance=Math.max(12.8,11.8/this.camera.aspect);this.view=multiply(axisAngle([1,0,0],.78),axisAngle([0,1,0],w>h?-.16:-.035));}
 pick(x,y,rect){const ray=this.camera.ray(x,y,rect,this.view);let hit=null;for(const item of this.items){const h=item.pick(ray);if(h&&(!hit||h.distance<hit.distance))hit=h;}return hit;}
 step(dt){for(const item of this.items)item.step(dt);}
}
export async function loadDesk(request=fetch){
 const base=new URL('../sukima-3d-lab/',import.meta.url),read=async file=>{const r=await request(new URL(file,base));if(!r.ok)throw new Error('道具を読み込めませんでした');return r.json();};
 const collection=await read('collection.json'),items=new Array(LAYOUT.length);let next=0;
 await Promise.all(Array.from({length:4},async()=>{while(next<LAYOUT.length){const i=next++,entry=LAYOUT[i],ref=collection.items.find(e=>e.id===entry.id);if(!ref||ref.number!==entry.number)throw new Error('モデルの番号が一致しません');items[i]=new DeskItem(entry,await read(ref.file));}}));
 return new DeskScene(items);
}
// Only the desk, its paper, books and pot are new meshes. Collection models stay intact.
export function furniture(){const vertices=[];const tri=(a,b,c,color)=>{const n=norm(cross(sub(b,a),sub(c,a)));for(const p of [a,b,c])vertices.push(...p,...n,...color);};
 const box=(p,s,color,yaw=0)=>{const q=axisAngle([0,1,0],yaw),v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>add(p,rotate(q,v.map((x,i)=>x*s[i]/2))));for(const f of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]){tri(v[f[0]],v[f[1]],v[f[2]],color);tri(v[f[0]],v[f[2]],v[f[3]],color);}};
 box([0,-.15,0],[6.56,.3,5.7],[.54,.39,.255]);
 // Broad planks, quiet seams and a rounded-looking stepped lip.
 for(let i=0;i<7;i++)box([0,.001,-2.445+i*.81],[6.51,.012,.793],[.61+i%3*.012,.46+i%2*.012,.31+i%3*.009]);
 box([0,-.34,2.7],[6.35,.26,.16],[.44,.305,.195]);
 for(const x of [-2.75,2.75])for(const z of [-2.35,2.35])box([x,-.88,z],[.25,1.25,.25],[.44,.31,.2]);
 box([0,-.66,-2.48],[5.7,.68,.16],[.49,.35,.235]);
 box([2.22,.5,-2.77],[1.23,1.05,.12],[.47,.34,.23]); // real mounting board for wall shelf
 for(let i=0;i<5;i++){box([-1.02+i*.018,.023+i*.012,.2],[.78,.012,.9],[.81+i*.013,.78+i*.014,.65+i*.02],-.15);}
 for(let i=0;i<3;i++){box([.96+i*.14,.3,-.91],[.115,.58,.38],[[.39,.48,.43],[.66,.49,.34],[.65,.64,.51]][i],-.03);}
 // Pamphlets, faint printed lines, no floating explanatory panels.
 box([.34,.024,1.78],[.46,.018,.63],[.77,.72,.58],.14);
 for(let i=0;i<4;i++)box([.34,.037,1.63+i*.073],[.26,.004,.009],[.45,.51,.43],.14);
 box([2.65,.07,.21],[.3,.14,.3],[.57,.36,.25]);box([2.65,.144,.21],[.34,.04,.34],[.62,.41,.29]);
 // Side ink pad and small stamp marks left on the stacked ticket slips.
 box([-1.57,.049,-.1],[.34,.07,.3],[.26,.29,.255],-.09);
 box([-.95,.09,.51],[.14,.003,.13],[.52,.32,.25],.13);
 return new Float32Array(vertices);
}
