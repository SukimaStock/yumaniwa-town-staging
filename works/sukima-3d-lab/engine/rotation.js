// Display/rotation only. No spring vertices, Touch profile, input or gallery DOM.
import {axisAngle,multiply,norm,scale} from './math.js?v=0.5.0';
export class RotationBody {
 constructor(mesh,options={}){
  this.mesh=mesh;this.touchEnabled=false;
  this.options={damping:1.85,settle:.014,...options};
  this.orientation=multiply(axisAngle([1,0,0],.19),axisAngle([0,1,0],-.23));
  this.velocity=[0,0,0];this.wobble=[0,0,0];this.wobbleVelocity=[0,0,0];this.held=false;
 }
 hold(){this.held=true;this.velocity=[0,0,0];}
 release(){this.held=false;}
 beginDrag(){this.release();this.held=true;}
 drag(dx,dy,seconds,size){
  const factor=3.2/Math.max(180,size),delta=[dy*factor,dx*factor,0],angle=Math.hypot(...delta);
  if(angle)this.orientation=norm(multiply(axisAngle(delta,angle),this.orientation));
  const target=scale(delta,1/Math.max(1/240,seconds)),speed=Math.hypot(...target);
  this.velocity=scale(target,Math.min(1,9/(speed||1)));
 }
 pose(){return norm(multiply(axisAngle(this.wobble,Math.hypot(...this.wobble)),this.orientation));}
 step(seconds){
  let remaining=Math.max(0,Math.min(seconds,.05));
  while(remaining>1e-9){const dt=Math.min(remaining,1/120);remaining-=dt;this.integrate(dt);}
 }
 integrate(dt){
  if(!this.held){
   const speed=Math.hypot(...this.velocity),angle=speed*dt;
   if(angle)this.orientation=norm(multiply(axisAngle(this.velocity,angle),this.orientation));
   const decay=Math.exp(-this.options.damping*dt);
   this.velocity=scale(this.velocity,decay);
   const envelope=Math.exp(-(((speed-.65)/.65)**2));
   for(let i=0;i<3;i++){
    const target=this.velocity[i]*envelope*this.options.settle;
    this.wobbleVelocity[i]+=((target-this.wobble[i])*85-this.wobbleVelocity[i]*11)*dt;
    this.wobble[i]+=this.wobbleVelocity[i]*dt;
   }
   if(speed<.0002)this.velocity=[0,0,0];
  }
 }
 cancel(){this.release();this.velocity=[0,0,0];}
 resetPose(orientation){this.cancel();this.orientation=orientation.slice();this.wobble=[0,0,0];this.wobbleVelocity=[0,0,0];}
}
