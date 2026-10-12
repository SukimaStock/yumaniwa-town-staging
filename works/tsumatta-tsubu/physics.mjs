// Small position-based disk solver. There is no release flag or release timer:
// gravity can move a grain only when its current contacts allow it.
export const walls = [[64,135,174,330],[174,330,174,344],[226,344,226,330],[226,330,336,135]];
export class Grains {
  constructor() { this.reset(); }
  reset() {
    this.particles = [];
    this.drag = null;
    const add = (x,y,r=15) => this.particles.push({x,y,px:x,py:y,r});
    add(180,298,20); add(220,298,20);
    for(let row=0;row<5;row++) {
      const n=4+row;
      for(let i=0;i<n;i++) add(200+(i-(n-1)/2)*18,255-row*17,9);
    }
    // Settle before presentation, using exactly the same collision solver.
    for(let i=0;i<600;i++) this.step();
  }
  pick(x,y) {
    let best=-1,d=30;
    this.particles.forEach((p,i)=>{const a=Math.hypot(p.x-x,p.y-y);if(a<d&&p.y<600){best=i;d=a;}});
    if(best>=0) this.drag={i:best,x:this.particles[best].x,y:this.particles[best].y,offsetX:this.particles[best].x-x,offsetY:this.particles[best].y-y};
    return best;
  }
  move(x,y) { if(this.drag){this.drag.x=Math.max(55,Math.min(345,x+this.drag.offsetX));this.drag.y=Math.max(70,Math.min(400,y+this.drag.offsetY));} }
  release() { this.drag=null; }
  step(dt=1/120) {
    const ps=this.particles;
    for(const p of ps) {
      const vx=(p.x-p.px)*.996,vy=(p.y-p.py)*.996;
      p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+720*dt*dt;
    }
    for(let k=0;k<14;k++) {
      if(this.drag) {
        const p=ps[this.drag.i];
        p.x+=(this.drag.x-p.x)*.32;p.y+=(this.drag.y-p.y)*.32;
      }
      for(const p of ps) for(const [ax,ay,bx,by] of walls) {
        const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/(dx*dx+dy*dy)));
        const nx=p.x-ax-t*dx,ny=p.y-ay-t*dy,d=Math.hypot(nx,ny);
        if(d<p.r&&d>.00001) {p.x+=nx/d*(p.r-d);p.y+=ny/d*(p.r-d);}
      }
      for(let i=0;i<ps.length;i++) for(let j=i+1;j<ps.length;j++) {
        const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),r=a.r+b.r;
        if(d<r&&d>.00001) {
          const nx=dx/d,ny=dy/d,push=(r-d)*.5;
          a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;
        }
      }
    }
    // Contact friction dissipates relative tangential motion, rather than
    // freezing a preselected group or starting a scripted flow on pointerdown.
    for(const p of ps) {
      for(const [ax,ay,bx,by] of walls) {
        const dx=bx-ax,dy=by-ay,l=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/(l*l)));
        if(Math.hypot(p.x-ax-t*dx,p.y-ay-t*dy)<p.r+.2) {
          const tangent=((p.x-p.px)*dx+(p.y-p.py)*dy)/(l*l)*.06;
          p.px+=tangent*dx;p.py+=tangent*dy;
        }
      }
      if(p.y>720){p.y=720;p.py=720;p.px=p.x;}
    }
  }
}
