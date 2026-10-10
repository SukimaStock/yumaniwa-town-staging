'use strict';
const S=require('../story.js'),W=require('../world.js'),P=require('../physics.js'),{course}=require('./five-stage-review.cjs'),{enter}=require('./stage1-review.cjs'),{harness}=require('./harness.cjs');
const BASE='4c38ba3552e453df95c46d9ffe2e13f1c4a83572';
let reference,checkpoints;
function previous(){return reference??=harness({sourceRef:BASE}).w;}
function priorAxis(m){const b=m[m.active],first=m.course.gaps.find(g=>g.id==='stage3-1');if(m.handoffs===2&&b.x>=first.b&&b.x<first.b+80&&b.vx>300)return -1;const land=b.grounded||b.landing&&m.time-b.landing.at<.085;return b.kind==='rutabaga'&&(!b.grounded||b.vx>120)&&land&&m.axis>.85?0:1;}
function starting(stage,before=false){
 if(!checkpoints){const api=previous().PumpokoStory,s=api.create();api.beginJourney(s);checkpoints=[];for(let i=0;i<60*130&&checkpoints.length<4;i++){const es=api.update(s,s.phase==='playing'?priorAxis(s.world):0,1/60);if(es.some(e=>e.type==='handoff'))checkpoints.push(structuredClone(s.world.stages.checkpoint));}if(checkpoints.length!==4)throw Error('Reference journey did not yield four checkpoints');}
 const s=enter(),c=before?previous().FruitLabCourses.get('world4'):course;
 if(stage===1){s.world.course=c;return s;}
 const cp=checkpoints[stage-2];s.world=W.restoreCheckpoint({course:c,settings:s.world.settings,time:cp.at,stages:{checkpoint:structuredClone(cp)}});s.nursery.fall=null;s.phase='playing';s.needsNeutral=false;s.look=0;s.view={...s.world.camera,z:.8};return s;
}
function pair(c,stage){const ids=stage===1?['second','second']:['stage'+stage+'-'+(stage===2?1:2),'stage'+stage+'-'+(stage===2?2:3)];return ids.map(id=>c.gaps.find(g=>g.id===id));}
function trial({stage=2,mode='controlled',fps=60,before=false,capture=false,delay=0,release=1/fps,brakeStart=80,brakeEnd=20,trigger=650,lead=80,early=false}={}){
 const s=starting(stage,before),api=before?previous().PumpokoStory:S,c=s.world.course,[first,last]=pair(c,stage),b=s.world[s.world.active],initial={...b};
 const frames=[],inputs=[],lands=[],events=[],departures=[];let phase='approach',stopped=null,brakingZero=null,fall=null,retry=null,lastAxis=null,pending=null,used=new Set(),pushes=0;
 const control=()=>{
  if(stage===2||stage===4){
   const f=W.contact(b,c),clearance=f.distance-b.r,incoming=-(b.vx*f.nx+b.vy*f.ny);
   const hit=b.x>first.b&&b.x<last.a&&(early?incoming>80&&clearance>0&&clearance<lead:b.landing&&s.world.time-b.landing.at<.12);
   const stamp=early?b.lastBounce:b.landing?.at;
   if(hit&&!used.has(stamp)&&!pending){used.add(stamp);if(mode!=='one-push'||pushes===0)pending={at:s.world.time+delay,end:s.world.time+delay+release};}
   if(pending){if(s.world.time>=pending.end){pending=null;pushes++;return 1;}if(s.world.time>=pending.at)return 0;}
   return 1;
  }
  if(stage===5)return b.x>=first.a-brakeStart&&b.x<first.a-brakeEnd?-1:1;
  return 1;
 };
 for(let i=0;i<fps*70;i++){
  const t=i/fps,prior={...b};let axis=mode==='held'||before?1:control();
  if(mode==='weak'){if(stage===1||stage===5)axis=b.x>=first.a-140&&b.x<first.a-20?-1:1;else axis=b.x>=first.a-140&&b.x<first.a-20?0:1;}
  if(mode==='stop'){
   if(phase==='approach'&&b.x>=c.stages[stage-1].startX+trigger)phase='braking';
   if(phase==='braking'&&b.vx<=0){brakingZero={time:t,x:b.x,vx:b.vx,grounded:b.grounded};phase='settle';}
   if(phase==='settle'&&b.grounded&&Math.abs(b.vx)<10){stopped={time:t,x:b.x,y:b.y,vx:b.vx,grounded:true};phase='restart';}
   axis=phase==='braking'?-1:phase==='settle'?0:phase==='restart'?control():1;
  }
  if(axis!==lastAxis){inputs.push({time:t,x:b.x,axis,phase});lastAxis=axis;}
  const es=api.update(s,s.phase==='playing'?axis:0,1/fps);
  if(prior.grounded&&!b.grounded&&b.x>first.a-50)departures.push({time:t,x:b.x,y:b.y,vx:b.vx,vy:b.vy});
  if(es.some(e=>e.type==='land'))lands.push({time:t,x:b.x,y:b.y,vx:b.vx,vy:b.vy});
  for(const e of es)if(['boost','fall','retry','handoff'].includes(e.type))events.push({...e,time:t,x:b.x});
  if(es.some(e=>e.type==='fall'))fall={time:t,x:b.x,y:b.y};
  if(capture&&i%(fps/15)===0)frames.push({time:t,axis,phase,world:structuredClone(s.world),view:{...s.view}});
  if(es.some(e=>e.type==='retry')){retry={time:t,handoffs:s.world.handoffs,completed:[...s.world.stages.completed],input:s.world.target,body:{...s.world[s.world.active]},phase:s.phase};break;}
  if(!fall&&b.x>last.b+120&&(b.grounded||lands.some(l=>l.x>last.b)))return {stage,mode,fps,before,success:true,seconds:t,initial,inputs,lands,departures,events,stopped,brakingZero,pushes,frames};
 }
 return {stage,mode,fps,before,success:false,initial,inputs,lands,departures,events,stopped,brakingZero,pushes,fall,retry,frames};
}
const summary=r=>{const {frames,...rest}=r;return rest;};
module.exports={BASE,previous,starting,pair,trial,summary};
if(require.main===module)for(const stage of [1,2,4,5])for(const fps of [30,60,120])for(const mode of ['held','controlled','weak','stop']){const r=trial({stage,fps,mode});console.log(JSON.stringify({stage,fps,mode,success:r.success,seconds:r.seconds,fall:r.fall,stop:r.stopped,pushes:r.pushes}));}
