'use strict';
// Ordinary rightward drive, briefly release/repress on an observed landing.
// Uses existing visible contact/landing states, with no map, speed changes or
// new action. The existing .12-second late landing boost accepts the press.
function axis(model){
 const b=model[model.active];
 // Recorded example player, not runtime assistance: countersteer after the
 // first STAGE 3 takeoff, then drive the receiving bank's upward shoulder.
 // Old-course references keep their original right-only pumpkin input.
 const first=model.course?.gaps.find(g=>g.id==='stage3-1'),second=model.course?.gaps.find(g=>g.id==='stage3-2');
 if(model.handoffs===2&&first&&second&&second.a-first.b<500){
  if(b.x>=first.b&&b.x<first.b+80&&b.vx>300)return -1;
 }
 const landing=b.grounded||b.landing&&model.time-b.landing.at<.085;
 return b.kind==='rutabaga'&&(!b.grounded||b.vx>120)&&landing&&model.axis>.85?0:1;
}
module.exports={axis};
