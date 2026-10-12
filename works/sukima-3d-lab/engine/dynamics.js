import {axisAngle,multiply,norm,add,sub,scale} from './math.js';
export class TouchBody {
 constructor(mesh,options={}) {
  this.mesh=mesh;this.options={damping:1.85,depth:.205,stiffness:170,settle:.014,...options};
  this.orientation=multiply(axisAngle([1,0,0],.19),axisAngle([0,1,0],-.23));
  this.velocity=[0,0,0];this.wobble=[0,0,0];this.wobbleVelocity=[0,0,0];
  this.offsets=mesh.rest.map(()=>[0,0,0]);this.offsetVelocity=mesh.rest.map(()=>[0,0,0]);this.pressure=null;this.held=false;
 }
 press(hit){
  this.held=true;this.velocity=[0,0,0];
  // Map the deformed hit back to the rest surface, preserving continuity on re-press.
  const point=hit.triangle.reduce((sum,index,j)=>add(sum,scale(this.mesh.rest[index],hit.barycentric[j])),[0,0,0]);
  const normal=norm(point);
  this.pressure={point,normal,face:hit.face};
  // Face centres bend most, shared corners move gently: the shell remains welded.
  this.weights=this.mesh.rest.map((v,i)=>{
   const distance=Math.hypot(...sub(v,point)),falloff=Math.max(0,1-distance/.92);
   return falloff*falloff*(i<12?.48:1);
  });
  // Interior hit uses barycentric attachment, so even a grazing press is perceptible.
  hit.triangle.forEach((index,j)=>this.weights[index]=Math.max(this.weights[index],hit.barycentric[j]*(index<12?.48:1)));
  // Even an off-centre press visibly bends its selected face, while shared corners stay gentle.
  const faceCenter=this.mesh.rest.length-this.mesh.faces.length+hit.face;
  this.weights[faceCenter]=Math.max(this.weights[faceCenter],.72);
 }
 release(){this.pressure=null;this.held=false;}
 drag(dx,dy,seconds,size) {
  const factor=3.2/Math.max(180,size),delta=[dy*factor,dx*factor,0],angle=Math.hypot(...delta);
  if(angle)this.orientation=norm(multiply(axisAngle(delta,angle),this.orientation));
  const target=scale(delta,1/Math.max(1/240,seconds)),speed=Math.hypot(...target);
  this.velocity=scale(target,Math.min(1,9/(speed||1)));
 }
 pose(){return norm(multiply(axisAngle(this.wobble,Math.hypot(...this.wobble)),this.orientation));}
 step(seconds) {
  let remaining=Math.max(0,Math.min(seconds,.05));
  while(remaining>1e-9){const dt=Math.min(remaining,1/120);remaining-=dt;this.integrate(dt);}
 }
 integrate(dt) {
  if(!this.held){
   const speed=Math.hypot(...this.velocity),angle=speed*dt;
   if(angle)this.orientation=norm(multiply(axisAngle(this.velocity,angle),this.orientation));
   const decay=Math.exp(-this.options.damping*dt);
   this.velocity=scale(this.velocity,decay);
   // A tiny spring follows braking torque as the body comes to rest.
   const envelope=Math.exp(-(((speed-.65)/.65)**2));
   for(let i=0;i<3;i++){
    const target=this.velocity[i]*envelope*this.options.settle;
    this.wobbleVelocity[i]+=((target-this.wobble[i])*85-this.wobbleVelocity[i]*11)*dt;
    this.wobble[i]+=this.wobbleVelocity[i]*dt;
   }
   if(speed<.0002)this.velocity=[0,0,0];
  }
  for(let i=0;i<this.mesh.rest.length;i++){
   for(let k=0;k<3;k++){
    const target=this.pressure?-this.pressure.normal[k]*this.options.depth*this.weights[i]:0;
    const velocity=this.offsetVelocity[i];
    velocity[k]+=((target-this.offsets[i][k])*this.options.stiffness-velocity[k]*18)*dt;
    this.offsets[i][k]+=velocity[k]*dt;
    this.mesh.vertices[i][k]=this.mesh.rest[i][k]+this.offsets[i][k];
   }
  }
 }
 cancel(){this.release();this.velocity=[0,0,0];}
}
