'use strict';
// Ordinary rightward drive, briefly release/repress on an observed landing.
// Uses existing visible contact/landing states, with no map, speed changes or
// new action. The existing .12-second late landing boost accepts the press.
function axis(model){const b=model[model.active],landing=b.grounded||b.landing&&model.time-b.landing.at<.085;return b.kind==='rutabaga'&&(!b.grounded||b.vx>120)&&landing&&model.axis>.85?0:1;}
module.exports={axis};
