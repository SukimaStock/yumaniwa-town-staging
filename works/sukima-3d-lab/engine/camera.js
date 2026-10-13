import {perspective,norm,rotate,inverse,sub} from './math.js?v=0.7.1';
export class Camera {
 constructor(){this.fov=36*Math.PI/180;this.resize(1,1);}
 resize(width,height,radius=1.1){this.aspect=width/Math.max(1,height);this.distance=Math.max(4.75,3.7/this.aspect)*Math.max(1,radius/1.1);this.projection=perspective(this.fov,this.aspect);}
 ray(x,y,rect,orientation,parameters=this){
  const nx=2*(x-rect.left)/rect.width-1,ny=1-2*(y-rect.top)/rect.height,t=Math.tan(parameters.fov/2),q=inverse(orientation);
  return {origin:rotate(q,[0,0,parameters.distance]),direction:rotate(q,norm([nx*parameters.aspect*t,ny*t,-1]))};
 }
 project(point,rect,orientation,parameters=this){
  const p=rotate(orientation,point),depth=parameters.distance-p[2],t=Math.tan(parameters.fov/2);
  if(depth<.1)return null;
  const result=[rect.left+rect.width*(1+p[0]/(depth*t*parameters.aspect))/2,rect.top+rect.height*(1-p[1]/(depth*t))/2];
  return result.every(Number.isFinite)?result:null;
 }
 // Intersect a camera-parallel plane through the current deformed attachment.
 // Freeze both plane depth and object pose for the entire captured gesture.
 pullMapping(x,y,rect,orientation,point){
  const depth=this.distance-rotate(orientation,point)[2],t=Math.tan(this.fov/2),q=inverse(orientation);
  const unitsX=2*depth*t*this.aspect/rect.width,unitsY=2*depth*t/rect.height;
  return (nextX,nextY)=>rotate(q,[(nextX-x)*unitsX,(y-nextY)*unitsY,0]);
 }

}
