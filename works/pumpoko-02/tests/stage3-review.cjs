'use strict';
const S=require('../story.js'),W=require('../world.js'),P=require('../physics.js'),{atStage,course}=require('./five-stage-review.cjs');
const BASE='102cb79e031dabf8b79da795a1963411cef5a0ac';
const g1=course.gaps.find(g=>g.id==='stage3-1'),g2=course.gaps.find(g=>g.id==='stage3-2');
function trial({mode='brake',fps=60,brake=g1.b,end=g1.b+80,capture=false,before=false,stoppedStart=false,lowStart=g1.a-180,lowEnd=g1.a-20,reverseX=g1.a-280}={}){
 const s=atStage(3),api=before?require('./harness.cjs').harness({sourceRef:BASE}).w.PumpokoStory:S;
 if(before)s.world.course=require('./harness.cjs').harness({sourceRef:BASE}).w.FruitLabCourses.get('world4');
 const c=s.world.course,b=s.world.pumpkin,finish=before?c.gaps.find(g=>g.id==='stage3-2').b+200:g2.b+200;
 if(stoppedStart){const f=W.curve('return',g1.a-650,c);Object.assign(b,{x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,vx:0,vy:0,grounded:true,exiting:false});P.clearInput(s.world);s.world.camera={x:b.x,y:b.y+70,vx:0,vy:0};s.view={...s.world.camera,z:.8};}
 const initial={...b},frames=[],lands=[],departures=[],events=[],inputs=[];let lastAxis=null,phase='approach',stopped=null,reversed=false,minX=Infinity,fall=null,retry=null;
 for(let i=0;i<fps*40;i++){
  const t=i/fps,prior={...b};let axis=mode==='held'||before?1:b.x>=brake&&b.x<end?-1:1;
  if(mode==='settle')axis=b.x>=g1.a-140&&b.x<g1.a-20?-1:1;
  if(mode==='low')axis=b.x>=lowStart&&b.x<lowEnd?-1:1;
  if(mode==='stop'){
   if(phase==='approach'&&b.x>=g1.a-360)phase='braking';
   if(phase==='braking'&&b.grounded&&b.vx<=0){stopped={time:t,x:b.x,y:b.y,vx:b.vx,grounded:b.grounded};phase='reverse';}
   if(phase==='reverse'&&b.x<=reverseX){reversed=true;phase='restart';minX=b.x;}
   axis=phase==='braking'||phase==='reverse'?-1:b.x>=brake&&b.x<end?-1:1;
  }
  if(axis!==lastAxis){inputs.push({time:t,x:b.x,axis,phase});lastAxis=axis;}
  const ev=api.update(s,s.phase==='playing'?axis:0,1/fps);
  if(prior.grounded&&!b.grounded&&b.x>g1.a-50)departures.push({time:t,x:b.x,y:b.y,vx:b.vx,vy:b.vy});
  if(ev.some(e=>e.type==='land')&&b.x>g1.a-50)lands.push({time:t,x:b.x,y:b.y,vx:b.vx,vy:b.vy});
  for(const e of ev)if(['fall','retry','handoff'].includes(e.type))events.push({...e,time:t});
  if(ev.some(e=>e.type==='fall'))fall={time:t,x:b.x,y:b.y};
  if(capture&&i%(fps/15)===0)frames.push({time:t,axis,phase,world:structuredClone(s.world),view:{...s.view}});
  if(ev.some(e=>e.type==='retry')){retry={time:t,handoffs:s.world.handoffs,completed:[...s.world.stages.completed],input:s.world.target,body:{...s.world.pumpkin},phase:s.phase};break;}
  if(!fall&&b.x>=finish&&b.grounded)return {success:true,mode,fps,seconds:t,initial,inputs,lands,departures,stopped,reversed,minX,events,frames};
 }
 return {success:false,mode,fps,initial,inputs,lands,departures,stopped,reversed,minX,fall,retry,events,frames};
}
function summary(r){const {frames,...other}=r;return other;}
module.exports={BASE,g1,g2,trial,summary};
if(require.main===module)for(const mode of ['held','brake','low','stop'])console.log(JSON.stringify(summary(trial({mode})),null,2));
