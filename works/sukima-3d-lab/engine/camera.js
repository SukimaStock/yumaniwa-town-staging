import {perspective,norm,rotate,inverse} from './math.js';
export class Camera {
 constructor(){this.fov=36*Math.PI/180;this.resize(1,1);}
 resize(width,height){this.aspect=width/Math.max(1,height);this.distance=Math.max(4.75,3.7/this.aspect);this.projection=perspective(this.fov,this.aspect);}
 ray(x,y,rect,orientation){
  const nx=2*(x-rect.left)/rect.width-1,ny=1-2*(y-rect.top)/rect.height,t=Math.tan(this.fov/2),q=inverse(orientation);
  return {origin:rotate(q,[0,0,this.distance]),direction:rotate(q,norm([nx*this.aspect*t,ny*t,-1]))};
 }
}
