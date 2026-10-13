// Independent numeric controls on the shared rigid-part assembly. No timeline,
// Touch vertices, scene graph, object names or automatic return to initial values.
import {RigidParts,composePartPose,assemblyBounds} from './parts.js?v=0.7.1';
import {motionRanges} from './motion.js?v=0.7.1';
import {scale,norm} from './math.js?v=0.7.1';
const TAU=Math.PI*2,fail=m=>{throw new TypeError(`Invalid specimen: manipulation ${m}`);};
const finite=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
const vector=v=>Array.isArray(v)&&v.length===3&&Array.from(v).every(x=>finite(x,-2,2));
const unit=v=>vector(v)&&Math.abs(Math.hypot(...v)-1)<1e-5;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function ranges(data,part){
 const c=data.behaviors.manipulation.controls.find(c=>c.part===part.id);
 if(!c)return motionRanges(data,part);
 return c.type==='linear'?{rotation:null,slide:{direction:c.axis,min:c.min,max:c.max}}:{rotation:{axis:c.axis,pivot:c.pivot,min:c.type==='rotate'?0:c.min,max:c.type==='rotate'?TAU:c.max},slide:null};
}
export function manipulationBounds(data){return assemblyBounds(data,part=>ranges(data,part));}
export function validateManipulation(data){
 const m=data.behaviors?.manipulation;
 if(!m||data.schema!=='sukima3d-specimen/2'||typeof m!=='object'||Array.isArray(m)||m.version!==1||Object.keys(m).some(k=>!['version','controls'].includes(k)))fail('version/settings');
 if(!Array.isArray(m.controls)||!m.controls.length||m.controls.length>32)fail('controls');
 const ids=new Set(data.parts?.map(p=>p.id)),used=new Set(),auto=new Set(data.behaviors.motion?.tracks.map(t=>t.part));
 for(const c of m.controls){
  if(!c||!['rotate','hinge','linear'].includes(c.type))fail('type');
  const required=['part','type','axis','initial','sensitivity',...(c.type!=='linear'?['pivot']:[]),...(c.type!=='rotate'?['min','max']:[])];
  const allowed=[...required,...(c.type==='rotate'?['inertia','damping']:[])];
  if(required.some(k=>!Object.hasOwn(c,k))||Object.keys(c).some(k=>!allowed.includes(k)))fail('control fields');
  if(typeof c.part!=='string'||!ids.has(c.part)||used.has(c.part))fail('part reference/duplicate');used.add(c.part);
  if(auto.has(c.part))fail('same part has autonomous and manual control');
  if(!unit(c.axis)||!finite(c.sensitivity,.25,2))fail('axis/sensitivity');
  if(c.type!=='linear'&&!vector(c.pivot))fail('pivot');
  if(c.type==='rotate'){
   if(!finite(c.initial,-TAU,TAU)||(Object.hasOwn(c,'inertia')&&!finite(c.inertia,0,1))||(Object.hasOwn(c,'damping')&&!finite(c.damping,2,18)))fail('rotate settings');
  }else{
   const limit=c.type==='hinge'?Math.PI:1;
   if(!finite(c.min,-limit,limit)||!finite(c.max,-limit,limit)||c.max-c.min<.001||!finite(c.initial,c.min,c.max))fail('range/initial');
  }
 }
 if(Object.hasOwn(data.behaviors,'touch'))fail('Touch + manipulation is not supported');
 if(manipulationBounds(data)>3)fail('swept display bounds');
}
export class ManipulationPlayer extends RigidParts {
 constructor(definition,motion=null){
  super(definition);validateManipulation(definition);
  this.motion=motion;this.boundDefinition=structuredClone(definition);this.radius=manipulationBounds(definition);this.active=null;
  this.controls=structuredClone(definition.behaviors.manipulation.controls).map(c=>({...c,value:c.initial,velocity:0,inertia:c.inertia??0,damping:c.damping??8}));
 }
 control(id){return this.controls.find(c=>c.part===id)??null;}
 pick(origin,direction){return super.pick(origin,direction,true);}
 pose(part){
  const c=this.control(part.id);
  if(c)return composePartPose(part,c.type==='linear'?null:c,c.type==='linear'?0:c.value%TAU,c.type==='linear'?scale(norm(c.axis),c.value):[0,0,0]);
  const moving=this.motion?.parts.find(p=>p.id===part.id);return moving?this.motion.pose(moving):super.pose(part);
 }
 grab(id){const c=this.control(id);if(!c)return false;this.cancel();this.active=id;c.velocity=0;return true;}
 moveBy(id,delta,seconds){
  const c=this.control(id);if(!c||this.active!==id||!Number.isFinite(delta))return;
  const before=c.value;c.value=c.type==='rotate'?c.value+clamp(delta,-1.05,1.05):clamp(c.value+delta,c.min,c.max);
  if(c.value!==before){const target=clamp((c.value-before)/Math.max(1/240,Number.isFinite(seconds)?seconds:0),-6,6);c.velocity=c.velocity*.35+target*.65;}
  if(c.type!=='rotate')c.velocity=0;
 }
 release(recent=true){const c=this.control(this.active);this.active=null;if(c)c.velocity=c.type==='rotate'&&recent?c.velocity*c.inertia:0;}
 cancel(){this.active=null;for(const c of this.controls)c.velocity=0;}
 step(seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return;const dt=Math.min(seconds,.05);
  for(const c of this.controls)if(c.part!==this.active&&c.type==='rotate'&&c.velocity){const decay=Math.exp(-c.damping*dt);c.value+=c.velocity*(1-decay)/c.damping;c.velocity*=decay;if(Math.abs(c.velocity)<.001)c.velocity=0;}
 }
 reset(){this.cancel();for(const c of this.controls)c.value=c.type==='rotate'?c.initial:clamp(c.initial,c.min,c.max);}
 setOption(id,key,value){
  const c=this.control(id);if(!c)return false;
  const limits={sensitivity:[.25,2],inertia:[0,1],damping:[2,18]};if(!Object.hasOwn(limits,key)||!finite(value,...limits[key])||(key!=='sensitivity'&&c.type!=='rotate'))return false;
  this.cancel();c[key]=value;return true;
 }
 setRange(id,min,max){
  const c=this.control(id),limit=c?.type==='hinge'?Math.PI:1;
  if(!c||c.type==='rotate'||!finite(min,-limit,limit)||!finite(max,-limit,limit)||max-min<.001)return false;
  const candidate=structuredClone(this.boundDefinition),target=candidate.behaviors.manipulation.controls.find(c=>c.part===id);target.min=min;target.max=max;
  const radius=manipulationBounds(candidate);if(radius>3)return false;
  this.cancel();c.min=min;c.max=max;c.value=clamp(c.value,min,max);this.boundDefinition=candidate;this.radius=radius;return true;
 }
}
