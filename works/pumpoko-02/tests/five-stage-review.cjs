'use strict';
const S=require('../story.js'),W=require('../world.js'),P=require('../physics.js'),C=require('../courses.js');
const course=C.get('world4'),{enter}=require('./stage1-review.cjs');
function run({fps=60,period=40,release=2,policy='landing',capture=false}={}){
 const s=enter(),startX=s.world.pumpkin.x,events=[],checkpoints=[],flights=[],frames=[];let elapsed=0,seat=null,title=null;const airborne=new Map();
 for(let i=0;i<fps*180&&!s.returnTitle;i++){
  const b=s.world[s.world.active],before={...b},stage=s.world.handoffs+1;
  const axis=s.phase==='playing'?(policy==='landing'?require('./five-stage-controls.cjs').axis(s.world):b.kind==='rutabaga'&&Math.floor(s.world.time*60+1e-7)%period<release?0:1):0;
  const es=S.update(s,axis,1/fps);elapsed+=1/fps;
  for(const g of course.gaps.filter(g=>g.layer===b.layer)){
   if(!airborne.has(g.id)&&before.x<g.a&&b.x>=g.a-b.r&&!b.grounded)airborne.set(g.id,{gap:g.id,stage,depart:{x:b.x,y:b.y,vx:b.vx,vy:b.vy,time:elapsed}});
   const f=airborne.get(g.id);if(f&&es.some(e=>e.type==='land')&&b.x>g.b-b.r){f.land={x:b.x,y:b.y,vx:b.vx,vy:b.vy,time:elapsed};flights.push(f);airborne.delete(g.id);}
  }
  for(const e of es)if(['stage-clear','handoff','fall','retry','seat'].includes(e.type))events.push({...e,time:elapsed});
  if(es.some(e=>e.type==='handoff'))checkpoints.push(structuredClone(s.world.stages.checkpoint));
  if(es.some(e=>e.type==='seat'))seat=elapsed;
  if(capture&&i%4===0)frames.push({time:elapsed,stage,world:structuredClone(s.world),view:{...s.view},nursery:structuredClone(S.nurseryPoses(s))});
  if(s.phase==='retrying')break;
  if(s.returnTitle)title=elapsed;
 }
 return {s,startX,events,checkpoints,flights,frames,seat,title};
}
let accepted;
const acceptedRun=()=>accepted??=run();
function atStage(stage){
 if(stage===1)return enter();
 const s=enter(),cp=acceptedRun().checkpoints[stage-2];
 s.world=W.restoreCheckpoint({course,settings:s.world.settings,time:cp.at,stages:{checkpoint:structuredClone(cp)}});
 s.nursery.fall=null;s.phase='playing';s.needsNeutral=false;s.look=0;s.view={...s.world.camera,z:.8};return s;
}
function placed(g,{speed=0,start=g.a-g.runup,armed=false,launch=false}={}){
 const s=atStage(g.stage||1),b=s.world[s.world.active],f=W.curve(g.layer,start,course);
 Object.assign(b,{x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,vx:speed*f.tx,vy:speed*f.ty,grounded:true,exiting:false,landing:null});
 s.world.target=s.world.previousInput=armed?0:1;s.world.axis=0;s.world.boostUsed=true;
 if(launch){Object.assign(b,{x:g.a+b.r+1,y:W.curve(g.layer,g.a,course).y+b.r,vx:speed,vy:0,grounded:false});}
 s.world.camera={x:b.x,y:b.y+70,vx:0,vy:0};s.view={...s.world.camera,z:.8};return s;
}
function crossing(g,options={}){
 const s=placed(g,options),b=s.world[s.world.active];let depart=null,land=null;
 for(let i=0;i<60*14;i++){
  const prior={...b},axis=require('./five-stage-controls.cjs').axis(s.world);
  const ev=S.update(s,options.steady?1:axis,1/60);
  if(prior.x<g.a&&b.x>=g.a-b.r&&!b.grounded&&!depart)depart={x:b.x,y:b.y,vx:b.vx,vy:b.vy,time:i/60};
  if(ev.some(e=>e.type==='land')&&b.x>g.b-b.r)land={x:b.x,y:b.y,vx:b.vx,vy:b.vy,time:i/60};
  if(land&&b.x>g.b+60)return {success:true,depart,land,seconds:i/60};
  if(ev.some(e=>e.type==='fall'))return {success:false,depart,land,seconds:i/60};
 }
 return {success:false,timeout:true,depart,land};
}
function measure(){
 const examples=[run(),run({policy:'periodic',period:55,release:4}),run({policy:'periodic',period:25,release:2})];
 const stages=course.stages.map((spec,i)=>{
  const durations=examples.map(r=>{const ends=r.events.filter(e=>e.type==='handoff'||e.type==='seat');return ends[i].time-(i?ends[i-1].time:0);});
  const start=i?course.holes[i-1].x:examples[0].startX,length=spec.endX-start;
  return {stage:i+1,kind:spec.kind,start,end:spec.endX,length,screens:length/(390/.8),ratio:i?length/(course.stages[i-1].endX-(i===1?examples[0].startX:course.holes[i-2].x)):null,gaps:course.gaps.filter(g=>g.layer===spec.layer).length,seconds:durations,minimumSampledSeconds:Math.min(...durations),retrySeconds:spec.retrySeconds};
 });
 const gaps=course.gaps.map(g=>({...g,width:g.b-g.a,fromRest:crossing(g),lowMomentum:crossing(g,{speed:60,start:g.a-8,steady:true,launch:true}),flight:examples[0].flights.find(f=>f.gap===g.id)}));
 return {base:require('./five-stage-reference.cjs').BASE,zoom:.8,logicalWidth:390,visibleUnits:487.5,stages,gaps,examples:examples.map((r,i)=>({policy:i?'periodic':'landing',period:i?[55,25][i-1]:null,release:i?[4,2][i-1]:null,seat:r.seat,title:r.title,ending:r.title-r.seat,events:r.events})),evidence:'240Hz integrator / 60Hz automatic Story input; native Canvas; real device and human feel UNVERIFIED'};
}
module.exports={course,run,acceptedRun,atStage,placed,crossing,measure};
if(require.main===module)console.log(JSON.stringify(measure(),null,2));
