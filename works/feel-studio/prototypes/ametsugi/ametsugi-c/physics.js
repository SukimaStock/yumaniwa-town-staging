/* Touch & Tune independent RainGame variant; live tuning in bounded fixed-step equations. Based on from works/ametsugi/game.mjs, adapted solely at the work-local hinge interface. No edits to the canonical game. */
/* For this work's hinge-only controls, value/grab/moveBy/cancel are the same operations as ManipulationPlayer. */
(function(root){'use strict';
class ManipulationPlayer {
 constructor(spec){this.active=null;this.controls=spec.behaviors.manipulation.controls.map(c=>({...c,value:c.initial,velocity:0}));}
 control(id){return this.controls.find(c=>c.part===id)||null;}
 grab(id){const c=this.control(id);if(!c)return false;this.cancel();this.active=id;c.velocity=0;return true;}
 moveBy(id,delta){const c=this.control(id);if(!c||this.active!==id||!Number.isFinite(delta))return;c.value=Math.max(c.min,Math.min(c.max,c.value+delta));c.velocity=0;}
 cancel(){this.active=null;for(const c of this.controls)c.velocity=0;}
}
// The v0.7 rigid-part HINGE contract owns captured values/range ends/cancel.
// Water contact, inertia, catches and the journey belong to this work.

const COURSES = [
 {pans:[[155,305,170]],cup:[285,491],source:155},
 {pans:[[133,255,158],[267,405,146]],cup:[120,571],source:133},
 {pans:[[141,224,154],[269,356,136],[137,488,148]],cup:[266,645],source:141},
 {pans:[[259,221,144],[129,354,140],[261,487,142]],cup:[128,645],source:259},
 {pans:[[139,197,142],[262,310,132],[134,423,130],[258,536,128]],cup:[132,680],source:139},
];
const STEP=1/120, G=670, LIMIT=.66;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function point(p,u,above=0){
 const v=10*(1-(u/(p.length/2))**2)-above,c=Math.cos(p.angle),s=Math.sin(p.angle);
 return {x:p.x+c*u-s*v,y:p.y+s*u+c*v};
}
function local(p,x,y){
 const c=Math.cos(p.angle),s=Math.sin(p.angle),dx=x-p.x,dy=y-p.y;
 return {u:dx*c+dy*s,v:-dx*s+dy*c};
}
function definition(n){
 return {schema:'sukima3d-specimen/2',id:'ametsugi-hinges',name:'Rain gutters',tags:['指で開閉'],
  parts:Array.from({length:n},(_,i)=>({id:'gutter-'+i,
   geometry:{surface:'open',vertices:[[-.6,-.025,0],[.6,-.025,0],[.6,.025,0],[-.6,.025,0]],triangles:[[0,1,2],[0,2,3]]},
   material:{kind:'matte',color:[.48,.61,.64],variation:0,doubleSided:true},
   transform:{position:[0,0,0],orientation:[0,0,0,1],scale:[1,1,1]}})),
  behaviors:{manipulation:{version:1,controls:Array.from({length:n},(_,i)=>({part:'gutter-'+i,type:'hinge',axis:[0,0,1],pivot:[0,0,0],initial:0,min:-LIMIT,max:LIMIT,sensitivity:1}))}},
  display:{orientation:[0,0,0,1],scale:1}};
}
class RainGame{
 constructor(){this.tuning={gravity:670,resistance:1.05,response:1,sensitivity:1};this.lap=0;this.reset();}
 reset(){this.level=0;this.filled=0;this.failures=0;this.t=0;this.accumulator=0;this.traces=[];this.events=[];this.started=false;this.load();}
 load(){
  const base=COURSES[this.level];
  // A second visit mirrors the roofs. The same control now asks a new route.
  const mirror=this.lap%2===1;
  this.pans=base.pans.map(([x,y,length],i)=>({id:'gutter-'+i,x:mirror?400-x:x,y,length,angle:0,target:0,velocity:0,wet:0}));
  this.cup={x:mirror?400-base.cup[0]:base.cup[0],y:base.cup[1],radius:29};
  this.source=mirror?400-base.source:base.source;
  this.hinges=new ManipulationPlayer(definition(this.pans.length));
  this.phase='waiting';this.age=0;this.drag=null;this.drop=null;this.pending=.85;
 }
 start(){if(this.started)return;this.started=true;this.events.push({type:'start'});}
 spawn(){this.drop={kind:'air',x:this.source,y:this.pans[0].y-64,vx:0,vy:0,pan:-1,left:-1,u:0,v:0,visited:0};this.phase='playing';this.age=0;}
 grab(index,p){
  if(!this.pans[index]||!['waiting','playing','retry'].includes(this.phase))return false;
  this.start();this.hinges.grab(this.pans[index].id);
  this.drag={index,x:p.x,y:p.y};return true;
 }
 move(p,dt=1/60){
  if(!this.drag)return;
  const d=this.drag,pan=this.pans[d.index],a=local(pan,d.x,d.y),b=local(pan,p.x,p.y);
  // A vertical drag anywhere on either half has the same physical lever arm.
  // Incremental rebasing gives immediate reversal after an end-stop.
  const arm=Math.abs(a.u)>15?a.u:(a.u<0?-1:1)*pan.length*.35;
  const delta=clamp((b.v-a.v)/arm*this.tuning.sensitivity,-.28,.28);
  this.hinges.moveBy(pan.id,delta,dt);pan.target=this.hinges.control(pan.id).value;
  d.x=p.x;d.y=p.y;
 }
 release(){this.hinges.cancel();this.drag=null;}
 setAngle(index,value){const p=this.pans[index];if(!p)return;this.hinges.grab(p.id);this.hinges.moveBy(p.id,clamp(value,-LIMIT,LIMIT)-this.hinges.control(p.id).value,1/60);p.target=this.hinges.control(p.id).value;this.hinges.cancel();}
 replay(){if(this.phase!=='end')return false;this.lap++;this.reset();return true;}
 retry(){this.release();this.failures++;this.phase='retry';this.age=0;this.events.push({type:'miss'});}
 drainEvents(){return this.events.splice(0);}
 update(seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return;
  this.accumulator+=Math.min(seconds,.2);
  while(this.accumulator>=STEP){this.step(STEP);this.accumulator-=STEP;}
 }
 step(dt){
  this.t+=dt;this.age+=dt;
  for(const p of this.pans){
   const old=p.angle;
   p.velocity+=(p.target-p.angle)*430*this.tuning.response*dt-p.velocity*34*Math.sqrt(this.tuning.response)*dt;
   p.angle=clamp(p.angle+p.velocity*dt,-LIMIT,LIMIT);
   p.angular=(p.angle-old)/dt;p.wet=Math.max(0,p.wet-dt*.18);
  }
  for(const t of this.traces)t.life-=dt;this.traces=this.traces.filter(t=>t.life>0);
  if(this.phase==='end')return;
  if(this.phase==='caught'){
   if(this.age>1.65){
    this.filled++;
    if(this.level===COURSES.length-1){this.phase='end';this.age=0;this.release();this.events.push({type:'end'});}
    else{this.level++;this.release();this.load();this.events.push({type:'roof'});}
   }return;
  }
  if(this.phase==='retry'){
   if(this.drop){this.drop.y+=dt*300;this.drop.x+=this.drop.vx*dt;}
   if(this.age>.85){this.drop=null;this.phase='waiting';this.pending=.35;this.age=0;}
   return;
  }
  if(this.phase==='waiting'){if(this.started){this.pending-=dt;if(this.pending<=0)this.spawn();}return;}
  const d=this.drop;if(!d)return;
  const before={x:d.x,y:d.y};
  if(d.kind==='pan'){
   const p=this.pans[d.pan],r=p.length/2;
   const slope=Math.sin(p.angle)-20*d.u/(r*r)*Math.cos(p.angle);
   d.v+=(this.tuning.gravity*slope-d.v*this.tuning.resistance)*dt;d.u+=d.v*dt;
   const pos=point(p,d.u,6);d.x=pos.x;d.y=pos.y;p.wet=1;
   if(Math.abs(d.u)>r){
    const c=Math.cos(p.angle),s=Math.sin(p.angle),dv=-20*d.u/(r*r);
    d.vx=d.v*(c-s*dv);d.vy=d.v*(s+c*dv)+p.angular*d.u;
    d.kind='air';d.left=d.pan;this.events.push({type:'pour',x:d.x,y:d.y});
   }
  }else{
   d.vy+=this.tuning.gravity*dt;d.vx*=Math.exp(-.07*dt);d.x+=d.vx*dt;d.y+=d.vy*dt;
   if(d.vy>0){
    for(let i=0;i<this.pans.length;i++){
     const p=this.pans[i];if(i<=d.left)continue;
     const a=local(p,before.x,before.y),b=local(p,d.x,d.y),r=p.length/2;
     const edge=u=>10*(1-(u/r)**2)-6;
     if(Math.abs(b.u)<=r+3&&a.v<=edge(a.u)&&b.v>=edge(b.u)){
      d.kind='pan';d.pan=i;d.u=clamp(b.u,-r+1,r-1);
      d.v=(d.vx*Math.cos(p.angle)+d.vy*Math.sin(p.angle))*.28;
      d.visited++;p.wet=1;Object.assign(d,point(p,d.u,6));
      this.events.push({type:'catch',pan:i,x:d.x,y:d.y});break;
     }
    }
    if(d.kind==='air'&&before.y<=this.cup.y-5&&d.y>=this.cup.y-5&&Math.abs(d.x-this.cup.x)<this.cup.radius){
     this.phase='caught';this.age=0;d.x=this.cup.x;d.y=this.cup.y+9;this.release();this.events.push({type:'cup'});
    }
   }
   if(this.phase==='playing'&&(d.y>760||d.x<-55||d.x>455))this.retry();
  }
  if(this.phase==='playing'&&Math.hypot(d.x-before.x,d.y-before.y)>.5){
   this.traces.push({x:d.x,y:d.y,life:.45});if(this.traces.length>65)this.traces.shift();
  }
 }
 snapshot(){return {phase:this.phase,time:this.t,level:this.level,filled:this.filled,lap:this.lap,failures:this.failures,started:this.started,drag:this.drag?.index??null,pans:this.pans.map(p=>({x:p.x,y:p.y,length:p.length,angle:p.angle,target:p.target})),cup:{...this.cup},drop:this.drop?{...this.drop}:null};}
}

root.AmetsugiPhysics={RainGame,COURSES,STEP,G,LIMIT,point,local};
})(typeof window!=='undefined'?window:globalThis);
