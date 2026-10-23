// Wall time is transient. Saved game time remains an integer logical step.
// One timeout runs one step; no loop can skip manual collection positions.
export class RuntimeClock {
 constructor(stepMs=100){this.stepMs=stepMs;this.reset();}
 reset(){this.deadline=null;}
 delay(now,rate=1,manual=false){
  const period=this.stepMs/rate;
  this.deadline=this.deadline===null?now+period:this.deadline+period;
  // Recover only small scheduling jitter. Manual work never runs overdue steps
  // back-to-back; automatic work can recover at most two intervals of debt.
  if(manual?now>=this.deadline:now-this.deadline>2*period)this.deadline=now+period;
  return Math.max(0,this.deadline-now);
 }
}
