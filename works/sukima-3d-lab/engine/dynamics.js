import {RotationBody} from './rotation.js?v=0.6.0';
import {norm,add,sub,scale,dot,cross} from './math.js?v=0.6.0';
import {FEEL_PROFILES,DEFAULT_FEEL,springStep} from './response.js?v=0.6.0';
import {PULL_DEFAULTS,attachment,pullWeights,resistantPull,safeScale} from './pull.js?v=0.6.0';
export class TouchBody extends RotationBody {
 constructor(mesh,options={}) {
  super(mesh,{damping:1.85,settle:.014,maxDisplacement:.28,...FEEL_PROFILES[DEFAULT_FEEL],...PULL_DEFAULTS,...options});this.touchEnabled=true;
  this.shapeLimits=mesh.deformation?.limits;this.shapeSafety=Boolean(this.shapeLimits);
  this.feel=DEFAULT_FEEL;
  this.offsets=mesh.rest.map(()=>[0,0,0]);this.offsetVelocity=mesh.rest.map(()=>[0,0,0]);
  this.pressure=null;this.pull=null;this.pullSafety=false;this.deformationLimit=Math.min(this.options.maxDisplacement,this.shapeLimits?.maxDisplacement??Infinity);this.held=false;this.reboundDamping=this.options.returnDamping;
  this.compliance=mesh.deformation?.compliance??mesh.rest.map(()=>1);
  if(this.compliance.length!==mesh.rest.length||this.compliance.some(v=>!Number.isFinite(v)||v<0||v>1))throw new TypeError('Invalid mesh deformation compliance');
 }
 setFeel(name) {
  if(!FEEL_PROFILES[name])throw new RangeError('Unknown feel profile');
  this.cancel();this.feel=name;Object.assign(this.options,FEEL_PROFILES[name]);
  this.reboundDamping=this.options.returnDamping;
 }
 weightsAt(point,radius,hit) {
  const weights=this.mesh.rest.map((v,i)=>{
   const falloff=Math.max(0,1-Math.hypot(...sub(v,point))/radius);
   return falloff*falloff*this.compliance[i];
  });
  hit.triangle.forEach((index,j)=>weights[index]=Math.max(weights[index],Math.max(0,hit.barycentric[j])*this.compliance[index]));
  const center=this.mesh.deformation?.faceCenters?.[hit.face];
  if(Number.isInteger(center)&&center>=0&&center<weights.length)weights[center]=Math.max(weights[center],.72*this.compliance[center]);
  return weights;
 }
 press(hit) {
  this.pull=null;this.held=true;this.velocity=[0,0,0];
  const bary=hit.barycentric.map(v=>Math.max(0,v)),sum=bary.reduce((a,b)=>a+b,0)||1;
  const point=hit.triangle.reduce((p,index,j)=>add(p,scale(this.mesh.rest[index],bary[j]/sum)),[0,0,0]);
  const [a,b,c]=hit.triangle.map(i=>this.mesh.rest[i]),normal=norm(cross(sub(b,a),sub(c,a)));
  const local=this.weightsAt(point,Math.min(.78,this.options.radius),hit);
  const spread=this.weightsAt(point,this.options.radius,hit);
  this.pressure={point,normal,face:hit.face,age:0,local,spread};
  // Seed inward velocity at contact, not in RAF or pointerup. Even down/up in
  // the same frame retains a small physical dent; new taps never add unbounded kicks.
  for(let i=0;i<this.offsetVelocity.length;i++) {
   const compression=Math.max(0,-dot(this.offsets[i],normal));
   const available=Math.max(0,1-compression/(this.options.depth*1.25));
   const wanted=-this.options.tapImpulse*local[i]*available;
   const current=dot(this.offsetVelocity[i],normal);
   if(wanted<current)this.offsetVelocity[i]=add(this.offsetVelocity[i],scale(normal,wanted-current));
   const speed=Math.hypot(...this.offsetVelocity[i]);
   if(speed>4.2)this.offsetVelocity[i]=scale(this.offsetVelocity[i],4.2/speed);
  }
 }
 release(duration) {
  if(this.pressure){
   const age=Math.max(this.pressure.age,Number.isFinite(duration)?duration:0);
   this.reboundDamping=this.options.returnDamping*(1-.07*Math.min(1,Math.max(0,age)));
  }
  if(this.pull){
   const stretch=Math.hypot(...this.pull.delta)/this.options.maxPull;
   this.reboundDamping=this.options.returnDamping*(1-.1*Math.min(1,stretch));
  }
  this.pressure=null;this.pull=null;this.held=false;
 }
 beginPull(hit){
  // Bake the current settling pose so the grab plane cannot drift under a finger.
  this.orientation=this.pose();this.wobble=[0,0,0];this.wobbleVelocity=[0,0,0];
  this.velocity=[0,0,0];this.held=true;this.pressure=null;
  this.offsetVelocity.forEach(v=>v.fill(0));
  this.pullSafety=true;this.deformationLimit=Math.max(Math.min(this.options.maxPull,this.shapeLimits?.maxPull??Infinity),...this.offsets.map(v=>Math.hypot(...v)));
  this.pull={face:hit.face,weights:pullWeights(this.mesh,hit,this.options.pullRadius),base:this.offsets.map(v=>v.slice()),delta:[0,0,0]};
  return attachment(this.mesh,hit);
 }
 pullTo(delta){
  if(!this.pull||delta.length!==3||delta.some(v=>!Number.isFinite(v)))return;
  this.pull.delta=resistantPull(delta,this.options.pullStrength,Math.min(this.options.maxPull,this.shapeLimits?.maxPull??Infinity));
 }
 beginDrag() {
  this.release();this.held=true;
  // Crossing the drag threshold is not a tap. Let any existing dent restore
  // quietly without carrying a freshly seeded tap into a quick swipe.
  this.offsetVelocity.forEach(v=>v.fill(0));
 }
 integrate(dt) {
  super.integrate(dt);
  const contact=this.pressure;
  if(contact)contact.age+=dt;
  const progress=contact?1-Math.exp(-contact.age*this.options.pressRate):0;
  const stiffness=this.pull?this.options.pullStiffness:contact?this.options.pressStiffness:this.options.restoreStiffness;
  const damping=this.pull?1:contact?this.options.pressDamping:this.reboundDamping;
  for(let i=0;i<this.mesh.rest.length;i++){
   const weight=contact?contact.local[i]+(contact.spread[i]-contact.local[i])*progress:0;
   for(let k=0;k<3;k++){
    const target=this.pull?this.pull.base[i][k]+this.pull.delta[k]*this.pull.weights[i]:contact?-contact.normal[k]*Math.min(this.options.depth,this.shapeLimits?.pressDepth??Infinity)*progress*weight:0;
    [this.offsets[i][k],this.offsetVelocity[i][k]]=springStep(this.offsets[i][k],this.offsetVelocity[i][k],target,stiffness,damping,dt);
   }
   const magnitude=Math.hypot(...this.offsets[i]);
   if(!this.pullSafety&&!this.shapeSafety&&magnitude>this.deformationLimit){
    const direction=scale(this.offsets[i],1/magnitude);
    this.offsets[i]=scale(direction,this.deformationLimit);
    const outward=dot(this.offsetVelocity[i],direction);
    if(outward>0)this.offsetVelocity[i]=sub(this.offsetVelocity[i],scale(direction,outward));
   }
  }
  // Include return overshoot in the same topology guard as the active pull.
  if(this.pullSafety||this.shapeSafety){
   const magnitude=Math.max(...this.offsets.map(v=>Math.hypot(...v)));
   const factor=Math.min(1,this.deformationLimit/(magnitude||1),safeScale(this.mesh,this.offsets));
   if(factor<1){this.offsets=this.offsets.map(v=>scale(v,factor));this.offsetVelocity=this.offsetVelocity.map(v=>scale(v,factor));}
   if(!this.pull&&this.offsets.every(v=>Math.hypot(...v)<.001)){this.pullSafety=false;this.deformationLimit=Math.min(this.options.maxDisplacement,this.shapeLimits?.maxDisplacement??Infinity);}
  }
  for(let i=0;i<this.mesh.rest.length;i++)this.mesh.vertices[i]=add(this.mesh.rest[i],this.offsets[i]);
 }
 cancel(){
  this.release();this.velocity=[0,0,0];this.reboundDamping=this.options.returnDamping;
  this.offsetVelocity.forEach(v=>v.fill(0));
 }
}
