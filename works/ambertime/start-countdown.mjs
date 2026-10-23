// Transient preparation only: this timer never owns game time, model or saves.
export class StartCountdown{
 constructor({onChange=()=>{},canRun=()=>true,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  this.onChange=onChange;this.canRun=canRun;this.setTimer=setTimer;this.clearTimer=clearTimer;this.value=null;this.timer=null;this.token=0;
 }
 get active(){return this.value!==null;}
 cancel(){
  ++this.token;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
  if(!this.active)return false;this.value=null;this.onChange(null);return true;
 }
 start(onComplete){
  if(this.active||!this.canRun())return false;
  const token=++this.token;this.value=3;this.onChange(this.value);
  const next=()=>{
   if(token!==this.token||!this.active)return;
   this.timer=null;
   if(!this.canRun()){this.cancel();return;}
   if(this.value===1){this.value=null;this.onChange(null);if(token===this.token)onComplete();return;}
   this.value--;this.onChange(this.value);
   if(token===this.token&&this.active)this.timer=this.setTimer(next,1000);
  };
  if(token===this.token&&this.active)this.timer=this.setTimer(next,1000);
  return true;
 }
}
