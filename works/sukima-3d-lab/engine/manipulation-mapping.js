// Screen deltas -> one captured local degree of freedom. Frozen viewer pose;
// no repicking, timeline, DOM or reclassification into whole-object rotation.
import {add,sub,scale,dot,cross,norm,rotate,inverse} from './math.js?v=0.7.1';
import {composePartPose} from './parts.js?v=0.7.1';
export function manipulationMapping(player,hit,x,y,rect,view,camera){
 const part=player.parts.find(p=>p.id===hit.part),control=player.control(hit.part);
 if(!part||!control)throw new TypeError('Manipulation hit must reference a control');
 const pose=player.pose(part),local=rotate(inverse(pose.orientation),sub(scale(hit.point,1/player.scale),pose.position));
 const axis=norm(rotate(norm(part.transform.orientation),control.axis));
 const pivot=control.type==='linear'?hit.point:scale(add(part.transform.position,rotate(norm(part.transform.orientation),control.pivot.map((v,i)=>v*part.transform.scale[i]))),player.scale);
 // The Camera object can resize later; retain its coefficients for this gesture.
 const frozen={aspect:camera.aspect,distance:camera.distance,fov:camera.fov};
 const project=point=>camera.project(point,rect,view,frozen);
 const ray=(px,py)=>camera.ray(px,py,rect,view,frozen);
 const marker=value=>{const p=composePartPose(part,control.type==='linear'?null:control,control.type==='linear'?0:value,control.type==='linear'?scale(norm(control.axis),value):[0,0,0]);return scale(add(rotate(p.orientation,local),p.position),player.scale);};
 const radial=(px,py)=>{
  const r=ray(px,py),den=dot(r.direction,axis);if(Math.abs(den)<.18)return null;
  const t=dot(sub(hit.point,r.origin),axis)/den;if(!Number.isFinite(t)||t<=0||t>100)return null;
  const v=sub(add(r.origin,scale(r.direction,t)),pivot),flat=sub(v,scale(axis,dot(v,axis)));
  return Math.hypot(...flat)>.035?norm(flat):null;
 };
 const plane=control.type!=='linear'&&Math.abs(dot(ray(x,y).direction,axis))>.32&&radial(x,y)!==null;
 let previous=[x,y];
 return {mode:plane?'axis-plane':'projected-axis',delta(nextX,nextY){
  if(!Number.isFinite(nextX)||!Number.isFinite(nextY))return 0;
  const old=previous;previous=[nextX,nextY];if(old[0]===nextX&&old[1]===nextY)return 0;
  if(plane){
   const a=radial(...old),b=radial(nextX,nextY);if(!a||!b)return 0;
   return Math.atan2(dot(axis,cross(a,b)),dot(a,b))*control.sensitivity;
  }
  // Incremental projected-curve fitting rebases the cursor at range ends, so
  // reversing direction responds immediately even after dragging past a stop.
  const start=project(marker(control.value));if(!start)return 0;
  const target=[start[0]+(nextX-old[0])*control.sensitivity,start[1]+(nextY-old[1])*control.sensitivity];
  let value=control.value;
  for(let i=0;i<6;i++){
   const epsilon=.001,a=project(marker(value-epsilon)),b=project(marker(value+epsilon)),p=project(marker(value));if(!a||!b||!p)break;
   let tangent=scale(sub(b,a),1/(2*epsilon)),length=Math.hypot(...tangent);
   if(length<12&&control.type!=='linear'){
    const direction=control.type==='hinge'?(control.max-value>value-control.min?1:-1):1;
    const trial=control.type==='hinge'?Math.max(control.min,Math.min(control.max,value+direction*.2)):value+.2,other=project(marker(trial));
    if(!other||Math.abs(trial-value)<1e-5)break;
    tangent=scale(sub(other,p),1/(trial-value));length=Math.hypot(...tangent);
   }
   // Almost invisible axes are deliberately quiet rather than explosively
   // amplifying a few pixels. Rotate the miniature from a fixed part/background.
   if(length<12)break;
   let change=dot(sub(target,p),tangent)/dot(tangent,tangent);if(!Number.isFinite(change))break;
   change=Math.max(-.35,Math.min(.35,change));value+=change;
   if(control.type!=='rotate')value=Math.max(control.min,Math.min(control.max,value));
   if(Math.abs(change)<1e-6)break;
  }
  return value-control.value;
 }};
}
