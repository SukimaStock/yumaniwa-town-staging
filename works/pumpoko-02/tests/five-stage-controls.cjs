'use strict';
// Ordinary rightward drive, briefly release/repress on an observed landing.
// Recorded input example only: uses visible terrain/contact/landing states.
// Changes no game body, speed, physics or action. Early and late presses use
// the existing landing buffer. Probe snapshots use the current authored map.
function axis(model){
 const b=model[model.active],course=model.course||require('../courses.js').get('world4'),gaps=course.gaps||[];
 // Recorded example player, not runtime assistance: countersteer after the
 // first STAGE 3 takeoff, then drive the receiving bank's upward shoulder.
 // Old-course references keep their original right-only pumpkin input.
 const first=gaps.find(g=>g.id==='stage3-1'),second=gaps.find(g=>g.id==='stage3-2');
 if(model.handoffs===2&&first&&second&&second.a-first.b<500){
  if(b.x>=first.b&&b.x<first.b+80&&b.vx>300)return -1;
 }
 // New bouncing phrases: drive into the bank, then release/repress on
 // its visible landings. Outside the phrase keep the held approach stable.
 const bounceStage=model.handoffs===1?2:model.handoffs===3?4:null;
 if(bounceStage){
  const first=gaps.find(g=>g.id==='stage'+bounceStage+'-'+(bounceStage===2?1:2));
  const next=gaps.find(g=>g.id==='stage'+bounceStage+'-'+(bounceStage===2?2:3));
  if(first&&next&&next.runup===next.a-first.b){
   const landing=b.grounded||b.landing&&model.time-b.landing.at<.085;
   if(b.x<next.a){
    if(b.x>first.b){
     const f=require('../world.js').contact(b,course),height=f.distance-b.r,incoming=-(b.vx*f.nx+b.vy*f.ny);
     if(incoming>80&&height>40&&height<80)return 0;
     if(landing&&model.axis>.85)return 0;
    }return 1;
   }
  }
 }
 const first5=gaps.find(g=>g.id==='stage5-2'),next5=gaps.find(g=>g.id==='stage5-3');
 if(model.handoffs===4&&first5&&next5&&next5.a-first5.b<500){
  return b.x>=first5.a-80&&b.x<first5.a-20?-1:1;
 }
 const landing=b.grounded||b.landing&&model.time-b.landing.at<.085;
 return b.kind==='rutabaga'&&(!b.grounded||b.vx>120)&&landing&&model.axis>.85?0:1;
}
module.exports={axis};
