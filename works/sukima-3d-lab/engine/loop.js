export class AnimationLoop {
 constructor(update,draw){this.update=update;this.draw=draw;this.frame=null;this.last=null;this.tick=time=>{if(this.frame===null)return;const dt=this.last===null?0:Math.min(.05,(time-this.last)/1000);this.last=time;this.update(dt);this.draw();this.frame=requestAnimationFrame(this.tick);};}
 start(){if(this.frame!==null)return;this.last=null;this.frame=requestAnimationFrame(this.tick);}
 stop(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;this.last=null;}
}
