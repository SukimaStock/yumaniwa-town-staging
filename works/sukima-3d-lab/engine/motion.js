// Authored local transforms, evaluated analytically. No DOM, Touch physics,
// object names, joints or edits to source geometry during playback.
import {scale,norm} from './math.js?v=0.7.1';
import {RigidParts,composePartPose,assemblyBounds} from './parts.js?v=0.7.1';
const TAU=Math.PI*2,fail=m=>{throw new TypeError(`Invalid specimen: motion ${m}`);};
const finite=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
const vector=(v,min,max)=>Array.isArray(v)&&v.length===3&&Array.from(v).every(x=>finite(x,min,max));
const unit=v=>vector(v,-1,1)&&Math.abs(Math.hypot(...v)-1)<1e-5;
const fields={spin:['part','type','axis','pivot','speed','initialAngle'],swing:['part','type','axis','pivot','baseAngle','amplitude','period','phase'],slide:['part','type','direction','amplitude','period','phase']};
export function validateMotion(data){
 const motion=data.behaviors?.motion;if(motion===undefined)return;
 if(data.schema!=='sukima3d-specimen/2')fail('requires specimen/2');
 if(!motion||typeof motion!=='object'||Array.isArray(motion)||Object.keys(motion).some(k=>!['version','tracks'].includes(k))||motion.version!==1)fail('version/settings');
 if(!Array.isArray(motion.tracks)||!motion.tracks.length||motion.tracks.length>64)fail('tracks');
 const ids=new Set(data.parts?.map(p=>p?.id)),used=new Set();
 for(const track of motion.tracks){
  if(!track||!Object.hasOwn(fields,track.type))fail('type');
  const keys=fields[track.type];if(Object.keys(track).length!==keys.length||keys.some(k=>!Object.hasOwn(track,k)))fail('track fields');
  if(typeof track.part!=='string'||!ids.has(track.part))fail('part reference');
  const key=`${track.part}:${track.type==='slide'?'translation':'rotation'}`;
  if(used.has(key))fail('conflicting tracks');used.add(key);
  if(track.type!=='slide'&&(!unit(track.axis)||!vector(track.pivot,-2,2)))fail('axis/pivot');
  if(track.type==='spin'){
   if(!finite(track.speed,-6,6)||!finite(track.initialAngle,-TAU,TAU))fail('spin settings');
  }else{
   if(!finite(track.period,1,120)||!finite(track.phase,-TAU,TAU))fail('period/phase');
   if(track.type==='swing'&&(!finite(track.baseAngle,-TAU,TAU)||!finite(track.amplitude,0,1.4)))fail('swing settings');
   if(track.type==='slide'&&(!unit(track.direction)||!finite(track.amplitude,0,.65)))fail('slide settings');
  }
 }
 // Capabilities are separate fields, not an exclusive mode enum. Combining
 // rigid part Motion with elastic Touch needs a later coordinate-space adapter.
 if(Object.hasOwn(data.behaviors,'touch'))fail('Touch + Motion is not supported in v0.6');
 if(motionBounds(data)>3)fail('swept display bounds');
}
const periodic=(t,period,phase)=>Math.sin(TAU*(t%period)/period+phase);
export function sampleTrack(track,time){
 if(!Number.isFinite(time)||time<0)throw new TypeError('Motion time must be finite and nonnegative');
 if(track.type==='spin')return (track.initialAngle+(track.speed===0?0:track.speed*(time%(TAU/Math.abs(track.speed)))))%TAU;
 if(track.type==='swing')return track.baseAngle+track.amplitude*periodic(time,track.period,track.phase);
 if(track.type==='slide')return scale(norm(track.direction),track.amplitude*periodic(time,track.period,track.phase));
 throw new TypeError('Unknown Motion track');
}
export function partPose(part,tracks,time){
 const rotation=tracks.find(t=>t.type!=='slide'),slide=tracks.find(t=>t.type==='slide');
 return composePartPose(part,rotation,rotation?sampleTrack(rotation,time):0,slide?sampleTrack(slide,time):[0,0,0]);
}
export function motionRanges(data,part){
 const tracks=data.behaviors?.motion?.tracks.filter(t=>t.part===part.id)??[],r=tracks.find(t=>t.type!=='slide'),s=tracks.find(t=>t.type==='slide');
 const angles=!r?[0,0]:r.type==='spin'?(r.speed===0?[r.initialAngle,r.initialAngle]:[0,TAU]):[r.baseAngle-r.amplitude,r.baseAngle+r.amplitude];
 return {rotation:r?{...r,min:angles[0],max:angles[1]}:null,slide:s?{direction:s.direction,min:-s.amplitude,max:s.amplitude}:null};
}
export function motionBounds(data){return assemblyBounds(data,part=>motionRanges(data,part));}
export class MotionPlayer extends RigidParts {
 constructor(definition){
  super(definition);validateMotion(definition);
  if(!definition.behaviors?.motion)throw new TypeError('Motion definition required');
  this.tracks=structuredClone(definition.behaviors.motion.tracks);
  this.radius=motionBounds(definition);this.time=0;this.playing=true;
  for(const part of this.parts)part.tracks=this.tracks.filter(t=>t.part===part.id);
 }
 step(dt){if(this.playing&&Number.isFinite(dt)&&dt>0)this.time+=Math.min(dt,.05);}
 setPlaying(value){this.playing=Boolean(value);}
 reset(){this.time=0;}
 pose(part){return partPose(part,part.tracks,this.time);}
}
