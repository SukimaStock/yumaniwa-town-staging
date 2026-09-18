/* CoffeeFactory — Phase 1. All work-specific code lives here.
 * Core: immutable plan + phase derivation + wall/monotonic clock.
 * Scenes/input never depend on visualMode. Add only a decoration renderer in Phase 4.
 * Node exports only Core for deterministic tests; no browser debug/time controls.
 */
(function (root) {
  "use strict";

  const ROAST = Object.freeze({
    Light: Object.freeze({ temperature: 93, prepSeconds: 30 }),
    Medium: Object.freeze({ temperature: 88, prepSeconds: 40 }),
    Dark: Object.freeze({ temperature: 83, prepSeconds: 50 }),
  });
  const DEFAULT_FREESTYLE = Object.freeze([
    Object.freeze({ grams: 50, duration: 10, waitAfter: 45 }),
    Object.freeze({ grams: 70, duration: 10, waitAfter: 45 }),
    Object.freeze({ grams: 105, duration: 10 }),
  ]);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function finite(v, lo, hi, label) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) {
      throw new RangeError(label + " is outside its supported range");
    }
    return v;
  }
  function freeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  function createPlan(settings, freestyle = DEFAULT_FREESTYLE, finishWait = 30) {
    const beanGrams = finite(settings.beanGrams, 5, 40, "Bean amount");
    if (!Number.isInteger(beanGrams)) throw new RangeError("Use whole grams");
    if (!ROAST[settings.roast] || !["Fine", "Medium", "Coarse"].includes(settings.grind)) {
      throw new RangeError("Invalid roast or grind");
    }
    let source;
    if (settings.recipeMode === "kasuya") {
      const water = beanGrams * 15;
      const first40 = Math.round(water * 0.4);
      const first = Math.round(first40 / 2);
      const last = Math.round((water - first40) / 3);
      const grams = [first, first40 - first, last, last, water - first40 - last * 2];
      source = grams.map((g, i) => ({ grams: g, duration: 10, ...(i < 4 ? { waitAfter: 35 } : {}) }));
      finishWait = 30;
    } else if (settings.recipeMode === "freestyle") {
      if (!Array.isArray(freestyle) || freestyle.length < 1 || freestyle.length > 20) {
        throw new RangeError("Use 1–20 pours");
      }
      source = freestyle;
    } else throw new RangeError("Invalid recipe mode");
    finite(finishWait, 0, 600, "Finish wait");
    let startTime = 0, totalWater = 0;
    const pours = source.map((p, i) => {
      const grams = finite(p.grams, 1, 1000, "Pour grams");
      const duration = finite(p.duration, 1, 600, "Pour duration");
      const isLast = i === source.length - 1;
      const waitAfter = isLast ? 0 : finite(p.waitAfter, 0, 600, "Wait");
      totalWater += grams;
      const pour = { grams, duration, startTime, cumulativeGrams: totalWater };
      if (!isLast) pour.waitAfter = waitAfter;
      startTime += duration + waitAfter;
      return pour;
    });
    return freeze({
      schemaVersion: 1, recipeMode: settings.recipeMode,
      cupPreset: settings.cupPreset, beanGrams, roast: settings.roast, grind: settings.grind,
      recommendedTemperature: ROAST[settings.roast].temperature,
      prepSeconds: ROAST[settings.roast].prepSeconds,
      totalWater, ratio: totalWater / beanGrams,
      finishWait, pours, totalDuration: startTime + finishWait,
    });
  }
  // All intervals are [start, end): zero waits transition directly to the next POUR.
  function phaseAt(plan, seconds) {
    const time = clamp(seconds, 0, plan.totalDuration);
    let index = plan.pours.length - 1, status = "COMPLETE", start = plan.totalDuration, duration = 0;
    for (let i = 0; i < plan.pours.length; i++) {
      const p = plan.pours[i];
      if (time < p.startTime + p.duration) {
        index = i; status = "POUR"; start = p.startTime; duration = p.duration; break;
      }
      const next = plan.pours[i + 1];
      if (next && time < next.startTime) {
        index = i; status = "WAIT"; start = p.startTime + p.duration;
        duration = next.startTime - start; break;
      }
    }
    const last = plan.pours[plan.pours.length - 1];
    if (status === "COMPLETE" && time < plan.totalDuration) {
      status = "FINISHING"; start = last.startTime + last.duration; duration = plan.finishWait;
    }
    const remaining = Math.max(0, start + duration - time);
    return {
      time, status, index, pourNumber: index + 1,
      grams: plan.pours[index].grams,
      cumulativeGrams: plan.pours[index].cumulativeGrams,
      remaining, remainingSeconds: Math.ceil(remaining),
      progress: duration > 0 ? clamp((time - start) / duration, 0, 1) : 1,
      totalRemaining: Math.max(0, plan.totalDuration - time),
    };
  }
  // Foreground: performance.now(), independent of draw frequency and clock adjustments.
  // Hidden: Date.now() difference also covers devices that suspend the monotonic clock.
  // No storage in Phase 1: reload starts a new app; visibility/page cache preserve this clock.
  class RecipeClock {
    constructor(plan, source = { mono: () => performance.now(), wall: () => Date.now() }) {
      this.plan = plan; this.source = source;
      this.position = 0; this.paused = false; this.hidden = false;
      this.anchor();
    }
    anchor() { this.monoAt = this.source.mono(); this.wallAt = this.source.wall(); }
    time() {
      if (this.paused) return this.position;
      const delta = this.hidden ? this.source.wall() - this.wallAt : this.source.mono() - this.monoAt;
      return clamp(this.position + Math.max(0, delta) / 1000, 0, this.plan.totalDuration);
    }
    snapshot() { return { ...phaseAt(this.plan, this.time()), paused: this.paused }; }
    pause() { this.position = this.time(); this.paused = true; this.anchor(); }
    resume() { this.anchor(); this.paused = false; }
    seekPour(index) {
      this.position = this.plan.pours[clamp(index, 0, this.plan.pours.length - 1)].startTime;
      this.anchor();
      return this.snapshot();
    }
    move(direction) { return this.seekPour(this.snapshot().index + direction); }
    setHidden(hidden) {
      if (this.hidden === hidden) return;
      this.position = this.time(); this.hidden = hidden; this.anchor();
    }
  }
  const Core = { ROAST, DEFAULT_FREESTYLE, createPlan, phaseAt, RecipeClock };
  if (typeof module === "object" && module.exports) { module.exports = Core; return; }

/* Kobito Motion Lab — standalone Canvas character. No CoffeeFactory/SSE dependency.
   World units = logical px, +y downward. update() uses capped fixed substeps.
   Contacts are world-space constraints; NEVER blend final planted feet. */
(function (host) {
'use strict';
const TAU=Math.PI*2, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const approach=(v,target,step)=>v+clamp(target-v,-step,step);
function point(){return {x:0,y:0};}
function copy(a,b){a.x=b.x;a.y=b.y;}
function transform(out,x,y,ox,oy,a){const c=Math.cos(a),s=Math.sin(a);out.x=ox+x*c-y*s;out.y=oy+x*s+y*c;}
// Analytic 2-link solver; stable pole sign, finite coincident targets, clamped reach.
// Caller owns reusable elbow/hand points. Residual is distance to requested target.
// Pole ±1 solves planar bone lengths. A continuous pole in [-1,1] is used ONLY
// while turning: it projects the bend through the depth axis without flipping knees.
function twoBone(out,a,target,l1,l2,pole=1){
 const dx=target.x-a.x,dy=target.y-a.y,raw=Math.hypot(dx,dy),d=clamp(raw,Math.abs(l1-l2)+.001,l1+l2-.015);
 const ux=raw>1e-7?dx/raw:0,uy=raw>1e-7?dy/raw:1;
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 out.joint.x=a.x+ux*along-uy*height*pole;out.joint.y=a.y+uy*along+ux*height*pole;
 out.end.x=a.x+ux*d;out.end.y=a.y+uy*d;out.error=Math.hypot(target.x-out.end.x,target.y-out.end.y);return out;
}
class Spring {
 constructor(value=0,frequency=3.2,damping=.72){this.x=value;this.v=0;this.w=TAU*frequency;this.damping=damping;}
 step(target,dt){const w=this.w;this.v+=(w*w*(target-this.x)-2*this.damping*w*this.v)*dt;this.x+=this.v*dt;return this.x;}
}
// All clips write into caller-owned numeric pose buffers. Normalized phase is reusable
// for recipe-time sampling later. Stateful contacts/springs are intentionally separate.
const P={rootX:0,pelvisX:1,pelvisY:2,pelvisAngle:3,torsoAngle:4,headAngle:5,armSwing:6,ik:7,toolAngle:8,toolY:9,reach:10,effort:11,celebrate:12,anchorIK:13};
const DURATIONS={idle:4.7,walk:.62,carryWalk:.76,operate:4.2,temperatureWork:4.2,pour:5.8,inspect:4.3,celebrate:3.2};
function poseAt(name,phase,params,out){
 out.fill(0);const p=phase*TAU,s=Math.sin(p),breath=Math.sin(params.life*TAU/4.7),g=params.gait*TAU;
 out[P.pelvisY]=breath*.16;out[P.headAngle]=breath*.012;
 if(name==='walk'||name==='carryWalk'){
  const carry=name==='carryWalk';out[P.pelvisY]=(carry?.25:.45)*Math.cos(g*2)*params.speedWeight;
  out[P.pelvisX]=Math.sin(g)*.22*params.speedWeight;out[P.pelvisAngle]=Math.sin(g)*.007*params.speedWeight;
  out[P.torsoAngle]=carry?-.025:-.015;out[P.armSwing]=carry?.03:.32;out[P.ik]=carry?1:0;out[P.toolY]=carry?-.2:0;
 } else if(name==='operate'||name==='temperatureWork'){
  // Same full-body work rhythm. `temperatureWork` reuses this movement on the
  // mirrored water-side worker without reusing the grinder role itself.
  const reach=smooth((phase-.10)/.20)*(1-smooth((phase-.82)/.16));
  const pull=smooth((phase-.36)/.20)*(1-smooth((phase-.65)/.17));
  out[P.rootX]=-.22*Math.sin(Math.PI*clamp(phase/.18,0,1))+reach*.3;
  out[P.pelvisY]=pull*.3;out[P.pelvisX]=reach*.2-pull*.2;
  out[P.torsoAngle]=reach*.025-pull*.02;out[P.ik]=reach;out[P.anchorIK]=reach;out[P.reach]=reach;out[P.effort]=pull;out[P.headAngle]=-.07*reach;
 } else if(name==='pour'){
  const reach=smooth(phase/.20)*(1-smooth((phase-.82)/.18)),tilt=smooth((phase-.22)/.20)*(1-smooth((phase-.78)/.20));
  out[P.pelvisX]=tilt*.3;out[P.pelvisY]=tilt*.12;out[P.torsoAngle]=tilt*.035;
  out[P.ik]=1;out[P.reach]=reach;out[P.toolAngle]=tilt*.58;
  out[P.toolY]=-reach*.45+tilt*.12*Math.sin(p*3);out[P.headAngle]=tilt*.07;out[P.effort]=tilt;
 } else if(name==='inspect'){
  const lean=(1-Math.cos(p))*.5;out[P.torsoAngle]=lean*.035;out[P.pelvisX]=lean*.2;out[P.headAngle]=lean*.035;
  out[P.reach]=lean*.5;out[P.ik]=lean*.45;out[P.anchorIK]=lean*.45;
 } else if(name==='celebrate'){
  // Shorter, lower hop: more "pyon" than floating.
  // 0-.08: tiny crouch, .08-.26: quick hop, .26-.36: land, then settle.
  const crouch=Math.sin(Math.PI*clamp(phase/.08,0,1))*(phase<.08?1:0);
  const u=clamp((phase-.08)/.18,0,1);
  const hop=Math.sin(Math.PI*u)*(phase>=.08&&phase<=.26?1:0);
  const land=Math.sin(Math.PI*clamp((phase-.26)/.10,0,1))*(phase>.26&&phase<.36?1:0);
  out[P.pelvisY]=crouch*.38-hop*2.35+land*.24;
  out[P.pelvisX]=0;
  out[P.torsoAngle]=-hop*.012+land*.004;
  out[P.armSwing]=0;
  out[P.celebrate]=hop;
  out[P.headAngle]=-hop*.015;
 }
 return out;
}
class Bone {
 constructor(name,parent){this.name=name;this.parent=parent;this.x=0;this.y=0;this.angle=0;this.localX=0;this.localY=0;this.localAngle=0;}
 world(x,y,angle=0){this.x=x;this.y=y;this.angle=angle;const p=this.parent;if(p){const c=Math.cos(p.angle),s=Math.sin(p.angle),dx=x-p.x,dy=y-p.y;this.localX=dx*c+dy*s;this.localY=-dx*s+dy*c;this.localAngle=angle-p.angle;}else{this.localX=x;this.localY=y;this.localAngle=angle;}}
}
class Foot {
 constructor(x,ground,offset){this.x=x;this.y=ground-1.5;this.lockX=x;this.lockY=this.y;this.fromX=x;this.toX=x;this.phase=offset;this.swing=false;this.u=0;this.duration=.34;this.settle=false;this.angle=0;this.slip=0;}
 lift(to,duration,settle=false){this.swing=true;this.u=0;this.duration=duration;this.fromX=this.x;this.toX=to;this.settle=settle;}
 step(dt,target,ground){
  if(!this.swing){this.x=this.lockX;this.y=this.lockY;this.angle=0;return;}
  this.u=Math.min(1,this.u+dt/this.duration);
  if(!this.settle)this.toX=mix(this.toX,target,1-Math.exp(-18*dt));
  const u=this.u;this.x=mix(this.fromX,this.toX,smooth(u));this.y=ground-1.5-Math.sin(Math.PI*u)*(this.settle?1.2:2.1);
  this.angle=Math.sin(TAU*u)*.12;
  if(u>=1){this.lockX=this.x;this.lockY=ground-1.5;this.y=this.lockY;this.swing=false;this.angle=0;}
 }
}
class Kobito {
 constructor({x=55,ground=72,direction=1,appearance={}}={}){
  this.appearance={hatBend:appearance.hatBend??2,bodyWidth:appearance.bodyWidth??7.5,apronLength:appearance.apronLength??8.5,eyeGap:appearance.eyeGap??3.5};
  this.x=x;this.ground=ground;this.velocity=0;this.direction=direction;this.facing=direction;this.requestedDirection=direction;
  this.motion='idle';this.previousMotion='idle';this.phase=0;this.life=0;this.gait=0;this.pause=false;this.blendTime=1;this.blendDuration=.28;
  this.pose=new Float64Array(14);this.fromPose=new Float64Array(14);this.targetPose=new Float64Array(14);this.params={life:0,gait:0,speedWeight:0};
  this.feet=[new Foot(x-2.7,ground,0),new Foot(x+2.7,ground,.5)];this.lastPhases=[0,.5];
  this.headSpring=new Spring(0,3.6,.76);this.hatSpring=new Spring(0,2.9,.63);this.apronSpring=new Spring(0,3.0,.72);this.leanSpring=new Spring(0,2.8,.8);this.toolSpring=new Spring(0,4.2,.82);
  this.tool={x:x+12,y:ground-27,angle:0,weight:0,kind:'box',left:point(),right:point(),spout:point()};this.toolFrom={x:12*direction,y:-6};this.toolBlend=0;this.pendingTool='box';
  this.anchor={x:x+17,y:ground-33};this.hasAnchor=false;this.lookTarget=null;this.look={x:x+25,y:ground-39};
  this.bones={};this.nodes=[];const add=(n,p)=>{const b=new Bone(n,p?this.bones[p]:null);this.bones[n]=b;this.nodes.push(b);};
  add('root');add('pelvis','root');add('torso','pelvis');add('head','torso');
  for(const side of ['left','right']){add(side+'UpperArm','torso');add(side+'Forearm',side+'UpperArm');add(side+'Hand',side+'Forearm');add(side+'Thigh','pelvis');add(side+'Shin',side+'Thigh');add(side+'Foot',side+'Shin');}
  this.ik=[0,1,2,3].map(()=>({joint:point(),end:point(),error:0}));this.handTargets=[point(),point()];this.handFree=[point(),point()];
  this.metrics={maxSlip:0,handError:0,legError:0};this.blink=0;this.nextBlink=2.7;this.rng=1729;this.accumulator=0;this.headBias=0;this.loadBearing=0;
  this.solve(0);
 }
 setMotion(name){if(!(name in DURATIONS))throw new Error('Unknown motion: '+name);if(name===this.motion)return;
  this.fromPose.set(this.pose);this.toolFrom.x=this.tool.x-this.bones.torso.x;this.toolFrom.y=this.tool.y-this.bones.pelvis.y;this.previousMotion=this.motion;this.motion=name;this.phase=0;this.blendTime=0;
  if(name==='carryWalk')this.pendingTool='box';if(name==='pour')this.pendingTool='pot';
 }
 setPaused(value){if(this.pause===value)return;this.pause=value;this.fromPose.set(this.pose);this.blendTime=0;}
 setDirection(value){this.requestedDirection=value<0?-1:1;}
 setAnchor(anchor){if(anchor){this.hasAnchor=true;this.anchor.x=anchor.x;this.anchor.y=anchor.y;}else if(this.blendTime>=this.blendDuration){this.hasAnchor=false;}}
 setLookTarget(target){this.lookTarget=target?{x:target.x,y:target.y}:null;}
 update(dt){
  // Decorative time is intentionally suspended after long background gaps. Never replay steps.
  this.accumulator+=clamp(Number.isFinite(dt)?dt:0,0,.12);
  while(this.accumulator>=1/120){this.step(1/120);this.accumulator-=1/120;}
 }
 step(dt){
  this.life+=dt;if(!this.pause)this.phase=(this.phase+dt/DURATIONS[this.motion])%1;
  const moving=(this.motion==='walk'||this.motion==='carryWalk')&&!this.pause;
  const carry=this.motion==='carryWalk',period=carry?.76:.62,topSpeed=carry?9:12;
  const turn=this.requestedDirection!==this.direction;
  let desired=moving&&!turn?topSpeed*this.direction:0;
  const oldV=this.velocity;this.velocity=approach(this.velocity,desired,44*dt);this.x+=this.velocity*dt;
  if(turn&&Math.abs(this.velocity)<.05&&!this.feet[0].swing&&!this.feet[1].swing)this.direction=this.requestedDirection;
  this.facing=approach(this.facing,this.direction,7*dt);
  const active=Math.abs(this.velocity)>.4||this.feet.some(f=>f.swing);
  if(active)this.gait=(this.gait+dt/period)%1;
  for(let i=0;i<2;i++){
   const f=this.feet[i],phase=(this.gait+i*.5)%1,previous=this.lastPhases[i];
   if(!f.swing&&Math.abs(this.velocity)>.5&&phase>=.62&&previous<.62){
    const swingTime=period*.38;f.lift(this.x+this.velocity*(swingTime+period*.31),swingTime);
   }
   const predicted=this.x+this.velocity*((1-f.u)*f.duration+period*.31)+(1-Math.min(1,Math.abs(this.velocity)/8))*(i?2.7:-2.7);
   f.step(dt,predicted,this.ground);this.lastPhases[i]=phase;
  }
  // Quiet replanting on stop/turn: one foot at a time, with a real swing arc.
  if(Math.abs(this.velocity)<.25&&!this.feet[0].swing&&!this.feet[1].swing){
   for(let i=0;i<2;i++){const target=this.x+(i?2.7:-2.7);if(Math.abs(this.feet[i].x-target)>1.2){this.feet[i].lift(target,.26,true);break;}}
  }
  this.params.life=this.life;this.params.gait=this.gait;this.params.speedWeight=Math.min(1,Math.abs(this.velocity)/topSpeed);
  poseAt(this.motion,this.phase,this.params,this.targetPose);
  if(this.pause){
   this.targetPose[P.armSwing]=0;
   if(this.loadBearing>0){
    // Load-bearing idle: keep both feet planted and let the skeleton absorb the
    // weight through pelvis/torso/head instead of rotating the whole character.
    // Negative torsoAngle leans slightly away from the carried tool for either facing.
    const weight=clamp(this.loadBearing,0,1);
    const breath=Math.sin(this.life*TAU/4.8);
    const sway=Math.sin(this.life*TAU/6.4+.65);
    this.targetPose[P.pelvisY]=breath*.28*weight;
    this.targetPose[P.pelvisX]=sway*.45*weight;
    this.targetPose[P.pelvisAngle]=sway*.018*weight;
    this.targetPose[P.torsoAngle]=(-.052-sway*.022)*weight;
    this.targetPose[P.headAngle]=breath*.016-sway*.010*weight;
   }else{
    this.targetPose[P.pelvisY]=Math.sin(this.life*1.34)*.15;
    this.targetPose[P.pelvisX]*=.35;
    this.targetPose[P.torsoAngle]*=.45;
   }
  }
  this.blendTime+=dt;const blend=smooth(this.blendTime/this.blendDuration);
  for(let i=0;i<this.pose.length;i++)this.pose[i]=mix(this.fromPose[i],this.targetPose[i],blend);
  const acceleration=(this.velocity-oldV)/dt;
  this.leanSpring.step(this.velocity*.0005-acceleration*.0003,dt);
  const desiredHead=this.pose[P.headAngle]-this.leanSpring.x*.4;
  this.headSpring.step(desiredHead,dt);this.hatSpring.step(this.headSpring.x+acceleration*.00055,dt);
  this.apronSpring.step(-this.velocity*.001+acceleration*.0006+Math.sin(this.gait*TAU)*.025*this.params.speedWeight,dt);
  this.toolSpring.step(this.pose[P.toolAngle]+acceleration*.0005,dt);
  const usesTool=this.motion==='carryWalk'||this.motion==='pour';
  // Tool changes pass through opacity zero. Hands use the identical tool transform.
  if(this.tool.kind!==this.pendingTool){this.toolBlend=approach(this.toolBlend,0,dt/this.blendDuration);if(this.toolBlend===0)this.tool.kind=this.pendingTool;}
  else this.toolBlend=approach(this.toolBlend,usesTool?1:0,dt/this.blendDuration);
  this.tool.weight=smooth(this.toolBlend);
  if(this.life>=this.nextBlink){this.blink=.12;this.rng=(1664525*this.rng+1013904223)>>>0;this.nextBlink=this.life+2.8+(this.rng/4294967296)*3.9;}this.blink=Math.max(0,this.blink-dt);
  this.solve(dt);
 }
 solve(dt){
  const b=this.bones,p=this.pose,f=this.facing,g=this.ground;
  b.root.world(this.x,g,0);
  let py=g-11.6+p[P.pelvisY],px=this.x+(p[P.pelvisX]+p[P.rootX])*f;
  // A small contact-aware pelvis height correction keeps both fixed ankles reachable.
  // Celebrate is the exception: the whole kobito briefly leaves the floor.
  const hopY=this.motion==='celebrate'?p[P.celebrate]*4.6:0;
  if(hopY<.05){
   for(let i=0;i<2;i++){const foot=this.feet[i],hx=px+(i?1.5:-1.5),dx=foot.x-hx;const maxHeight=Math.sqrt(Math.max(4,10.35*10.35-dx*dx));py=Math.max(py,foot.y-maxHeight);}
  }
  b.pelvis.world(px,py,p[P.pelvisAngle]*f);
  const lean=p[P.torsoAngle]*f+this.leanSpring.x+b.pelvis.angle*.35;
  b.torso.world(px+Math.sin(lean)*8,py-Math.cos(lean)*8,lean);
  const headX=b.torso.x+Math.sin(lean)*6.5,headY=b.torso.y-Math.cos(lean)*6.5;
  const carrying=this.motion==='carryWalk';const lookSource=this.lookTarget||(this.hasAnchor?this.anchor:null);const lookX=lookSource?lookSource.x:carrying?this.tool.x:this.x+f*25,lookY=lookSource?lookSource.y:carrying?this.tool.y:g-40;
  const look=clamp(Math.atan2((lookY-headY),Math.abs(lookX-headX)+8)*.16,-.1,.1)*f;
  b.head.world(headX,headY,this.headSpring.x*f+look+(this.headBias||0));
  const tool=this.tool,reach=p[P.reach];
  const pot=tool.kind==='pot';tool.x=b.torso.x+(pot?9:6.8)*f;tool.y=py+(pot?-6:-3)+p[P.toolY];tool.angle=this.toolSpring.x*f;
  if(pot&&this.motion==='pour'&&this.hasAnchor){tool.x+=clamp(this.anchor.x-(tool.x+7*f),-1,1)*reach;tool.y+=clamp(this.anchor.y-(tool.y+3),-1,1)*reach;}
  const toolTransition=smooth(this.blendTime/this.blendDuration);
  tool.x=mix(b.torso.x+this.toolFrom.x,tool.x,toolTransition);tool.y=mix(py+this.toolFrom.y,tool.y,toolTransition);
  if(pot){
   transform(tool.left,-2.6*f,0,tool.x,tool.y,tool.angle);transform(tool.right,-3.9*f,0,tool.x,tool.y,tool.angle);transform(tool.spout,7.15*f,-1.95,tool.x,tool.y,tool.angle);
  }else{transform(tool.left,-3.9,-.65,tool.x,tool.y,tool.angle);transform(tool.right,3.9,-.65,tool.x,tool.y,tool.angle);transform(tool.spout,0,0,tool.x,tool.y,tool.angle);}
  this.metrics.handError=0;this.metrics.legError=0;
  for(let i=0;i<2;i++){
   const side=i?'right':'left',hip=b[side+'Thigh'],shin=b[side+'Shin'],foot=b[side+'Foot'];
   const hipSide=i?1:-1,hipAngle=b.pelvis.angle;
   hip.world(px+hipSide*1.5*Math.cos(hipAngle),py+hipSide*(.35+1.5*Math.sin(hipAngle)),0);
   const footTarget=(hopY>.05?{x:this.feet[i].x,y:this.feet[i].y-hopY}:this.feet[i]);
   twoBone(this.ik[i],hip,footTarget,5.5,5.3,-f);
   hip.world(hip.x,hip.y,Math.atan2(this.ik[i].joint.y-hip.y,this.ik[i].joint.x-hip.x));
   shin.world(this.ik[i].joint.x,this.ik[i].joint.y,Math.atan2(this.ik[i].end.y-this.ik[i].joint.y,this.ik[i].end.x-this.ik[i].joint.x));
   foot.world(this.ik[i].end.x,this.ik[i].end.y,this.feet[i].angle*f);
   this.metrics.legError=Math.max(this.metrics.legError,this.ik[i].error);
   if(hopY<.05&&!this.feet[i].swing){const slip=Math.hypot(foot.x-this.feet[i].lockX,foot.y-this.feet[i].lockY);this.metrics.maxSlip=Math.max(this.metrics.maxSlip,slip);}
   const arm=b[side+'UpperArm'],fore=b[side+'Forearm'],hand=b[side+'Hand'];
   const nearSideName=f>=0?'right':'left';
   const role=side===nearSideName?'near':'far';
   // Shoulder anchors are explicitly biased by motion so the visible arm does not
   // appear to grow from the throat. Near arms start farther back and slightly lower.
   let dx=(role==='near'?-1.6:.35),dy=(role==='near'?.85:.2);
   if(this.motion==='walk'){dx=(role==='near'?-2.25:.2);dy=(role==='near'?1.0:.2);} 
   else if(this.motion==='carryWalk'){dx=(role==='near'?-1.5:-.15);dy=(role==='near'?.9:.55);} 
   else if(this.motion==='operate'||this.motion==='temperatureWork'){dx=(role==='near'?-2.15:-.95);dy=(role==='near'?1.0:.8);} 
   else if(this.motion==='inspect'){dx=(role==='near'?-1.8:.1);dy=(role==='near'?.75:.25);} 
   arm.world(b.torso.x+dx*f,b.torso.y+dy,0);
   const swing=Math.sin(this.gait*TAU+(i?Math.PI:0)+.15)*p[P.armSwing]*this.params.speedWeight;
   const free=this.handFree[i];free.x=arm.x+(Math.sin(swing)*4+(i?1:0))*f;free.y=arm.y+9.8-Math.abs(swing)*.8;
   const target=this.handTargets[i];copy(target,free);
   const held=i?tool.right:tool.left;let holdWeight=tool.weight;
   // Explicit handedness by motion:
   // carry: near hand is the visible front hand, far hand supports from the far side
   // operate: far hand works the lever (natural depth), near hand stays quiet
   // pour: keep original two-hand feel (already good)
   // celebrate: small hop plus a tiny arm lift, avoiding deep bends
   if(this.motion==='carryWalk'){
    if(role==='near'){target.x=mix(target.x,held.x+2.1*f,holdWeight); target.y=mix(target.y,held.y+4.1,holdWeight);} 
    else {target.x=mix(target.x,held.x-1.2*f,holdWeight*.95); target.y=mix(target.y,held.y+3.7,holdWeight*.95);} 
   } else if(this.motion==='operate'){
    if(role==='near') holdWeight*=.08;
    else {target.x=mix(target.x,this.anchor.x+.2*f,p[P.anchorIK]); target.y=mix(target.y,this.anchor.y+.2,p[P.anchorIK]);}
   } else if(this.motion==='temperatureWork'){
    if(role==='near') holdWeight*=.08;
    else {target.x=mix(target.x,this.anchor.x+.15*f,p[P.anchorIK]*.82); target.y=mix(target.y,this.anchor.y+.6,p[P.anchorIK]*.82);}
   } else if(this.motion==='inspect'){
    if(role==='near'){target.x=mix(target.x,this.anchor.x-.6*f,p[P.anchorIK]*.75); target.y=mix(target.y,this.anchor.y+1.5,p[P.anchorIK]*.75);} else holdWeight*=0;
   } else if(this.motion==='celebrate'){
    // Slight arm motion only: keep the hands low and readable.
    if(role==='near'){
      target.x=mix(target.x,arm.x+1.2*f,p[P.celebrate]*.9);
      target.y=mix(target.y,arm.y+7.9,p[P.celebrate]*.9);
    } else {
      target.x=mix(target.x,arm.x-0.3*f,p[P.celebrate]*.55);
      target.y=mix(target.y,arm.y+8.7,p[P.celebrate]*.55);
    }
   } else {
    target.x=mix(target.x,held.x,holdWeight);target.y=mix(target.y,held.y,holdWeight);
   }
   if(this.hasAnchor && this.motion!=='operate' && this.motion!=='temperatureWork' && this.motion!=='inspect'){
    const primary=(i===1?1+f:1-f)*.5;const weight=p[P.anchorIK]*mix(.45,1,primary)*(1-holdWeight);target.x=mix(target.x,this.anchor.x-(1-primary)*3*f,weight);target.y=mix(target.y,this.anchor.y+(1-primary)*3,weight);
   }
   twoBone(this.ik[2+i],arm,target,5.5,5.2,f);
   arm.world(arm.x,arm.y,Math.atan2(this.ik[2+i].joint.y-arm.y,this.ik[2+i].joint.x-arm.x));
   fore.world(this.ik[2+i].joint.x,this.ik[2+i].joint.y,Math.atan2(this.ik[2+i].end.y-this.ik[2+i].joint.y,this.ik[2+i].end.x-this.ik[2+i].joint.x));
   hand.world(this.ik[2+i].end.x,this.ik[2+i].end.y,tool.angle);
   this.metrics.handError=Math.max(this.metrics.handError,this.ik[2+i].error);
  }
  }
 draw(ctx,{debug=false}={}){drawKobito(ctx,this,debug);}
}
const PAPER='#F2E9DA',INK='#3A2D24',GOLD='#C1A066';
function line(ctx,a,b,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function disk(ctx,x,y,r,fill,stroke=INK,w=1.4){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}}
function drawKobito(c,k,debug){
 const b=k.bones,f=k.facing,p=k.pose;c.save();c.lineJoin='round';c.lineCap='round';
 function limb(side,type,color){const a=b[side+(type==='leg'?'Thigh':'UpperArm')],j=b[side+(type==='leg'?'Shin':'Forearm')],e=b[side+(type==='leg'?'Foot':'Hand')];
  // A single soft stroke hides anatomical joints while preserving solved endpoints.
  c.strokeStyle=INK;c.lineWidth=type==='leg'?3.6:2.8;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(j.x,j.y,e.x,e.y);c.stroke();
  if(type==='leg'){c.save();c.translate(e.x,e.y);c.rotate(e.angle);c.fillStyle=INK;c.beginPath();c.ellipse(f*.35,-.2,3.3,1.7,0,0,TAU);c.fill();c.restore();}
 }
 // Visual depth follows facing. For right-facing kobito the right arm is near;
 // for left-facing kobito the left arm is near. Pose/IK are untouched: only
 // paint order changes, so the far hand can never jump in front of the body.
 const nearSide=f>=0?'right':'left',farSide=nearSide==='right'?'left':'right';
 const nearHand=b[nearSide+'Hand'],farHand=b[farSide+'Hand'];
 const style=k.appearance,w=style.bodyWidth;
 function drawBody(){
  c.save();c.translate(b.pelvis.x,b.pelvis.y);c.rotate(b.torso.angle);
  c.fillStyle=GOLD;c.strokeStyle=INK;c.lineWidth=1.1;c.beginPath();c.moveTo(-4,-9);c.quadraticCurveTo(0,-10,4,-9);c.lineTo(w,2);c.quadraticCurveTo(0,4,-w,2);c.closePath();c.fill();c.stroke();
  c.save();c.rotate(k.apronSpring.x);c.fillStyle=PAPER;c.beginPath();c.moveTo(-2.6,-7);c.lineTo(2.6,-7);c.lineTo(4,style.apronLength-7);c.quadraticCurveTo(0,style.apronLength-5.8,-4,style.apronLength-7);c.closePath();c.fill();c.restore();c.restore();
 }
 function drawHead(){
  c.save();c.translate(b.head.x,b.head.y);c.rotate(b.head.angle);disk(c,0,0,9,PAPER,INK,1.1);
  for(const side of [-1,1]){const eyeX=f*1.8+side*style.eyeGap*.5;
   if(k.blink>0){c.strokeStyle=INK;c.lineWidth=.65;c.beginPath();c.moveTo(eyeX-.65,1.8);c.lineTo(eyeX+.65,1.8);c.stroke();}else disk(c,eyeX,1.8,.7,INK,null);}
  c.save();c.rotate(k.hatSpring.x-b.head.angle*.5);c.fillStyle=GOLD;c.strokeStyle=INK;c.lineWidth=1.1;
  c.beginPath();c.moveTo(-9,-4);c.quadraticCurveTo(-4,-12,style.hatBend,-18);c.quadraticCurveTo(style.hatBend+3,-17,5,-10);c.lineTo(9,-4);c.quadraticCurveTo(0,-2.5,-9,-4);c.closePath();c.fill();c.stroke();c.restore();c.restore();
 }
 function drawTool(){
  if(k.tool.weight>.001&&!k.hideTool){const t=k.tool;c.save();c.globalAlpha=t.weight;c.translate(t.x,t.y);c.rotate(t.angle);c.scale((t.kind==='pot'?f:1)*.65,.65);c.lineWidth=1.35;c.strokeStyle=INK;c.fillStyle=GOLD;
   if(t.kind==='box'){c.beginPath();c.roundRect(-6,-6,12,12,1.2);c.fill();c.stroke();c.strokeStyle=INK;c.lineWidth=.8;c.beginPath();c.moveTo(0,-6);c.lineTo(0,6);c.moveTo(-6,-2);c.lineTo(6,-2);c.stroke();}
   else {c.beginPath();c.arc(-5,0,3.2,0,TAU);c.stroke();c.beginPath();c.moveTo(3,-1);c.lineTo(11,-4);c.lineTo(10,-1);c.lineTo(4,4);c.closePath();c.fill();c.stroke();c.beginPath();c.roundRect(-4,-5,9,11,3);c.fill();c.stroke();c.beginPath();c.moveTo(-3,-5);c.lineTo(4,-5);c.stroke();disk(c,.5,-6.5,1,INK,null);}
   c.restore();
  }
 }
 limb('left','leg',GOLD);limb('right','leg',GOLD);
 if(k.motion==='carryWalk'){
  limb(farSide,'arm',GOLD);      // far arm stays behind the body
  disk(c,farHand.x,farHand.y,2.0,PAPER,INK,.9); // far hand behind
  drawBody(); drawHead(); drawTool();           // box between the two hands
  limb(nearSide,'arm',GOLD);    // near arm in front of the box
  disk(c,nearHand.x,nearHand.y,2.0,PAPER,INK,.9); // near hand is the top-most layer
 } else {
  limb(farSide,'arm',GOLD);
  disk(c,farHand.x,farHand.y,2.0,PAPER,INK,.9);
  drawBody();
  limb(nearSide,'arm',GOLD);
  drawHead();
  drawTool();
  disk(c,nearHand.x,nearHand.y,2.0,PAPER,INK,.9);
 }
 if(debug){
  c.globalAlpha=.8;for(const n of k.nodes){if(n.parent)line(c,n.parent,n,.35,INK);disk(c,n.x,n.y,.7,PAPER,INK,.35);}
  for(const foot of k.feet){c.strokeStyle=GOLD;c.lineWidth=.65;c.beginPath();c.moveTo(foot.lockX-2,k.ground+2);c.lineTo(foot.lockX+2,k.ground+2);c.moveTo(foot.lockX,k.ground);c.lineTo(foot.lockX,k.ground+4);c.stroke();if(!foot.swing)disk(c,foot.x,k.ground,.8,GOLD,null);}
  for(let i=0;i<2;i++){const t=k.handTargets[i];c.strokeStyle=GOLD;c.lineWidth=.65;c.strokeRect(t.x-1.3,t.y-1.3,2.6,2.6);}
  disk(c,b.root.x,b.root.y,1.4,GOLD,INK,.4);disk(c,b.pelvis.x,b.pelvis.y,1.4,GOLD,INK,.4);
 }
 c.restore();
}
const api={Kobito,Spring,twoBone,poseAt,P,DURATIONS,colors:{PAPER,INK,GOLD}};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else host.KobitoMotion=api;
})(typeof window!=='undefined'?window:this);


  const C = { paper: [242,233,218], ink: [58,45,36], gold: [193,160,102], goldText: [158,126,78], muted: [119,100,80], rule: [203,189,168], white: [249,244,235] };
  const UI_FONT_STACK = '"Zen Maru Gothic", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif';
  const SETUP_STORAGE_KEY = "coffeefactory.v1.setup";
  const DEFAULT_SETUP = Object.freeze({ cupPreset:1, beanGrams:15, roast:"Medium" });
  function loadSetupSettings(){
    const fallback={...DEFAULT_SETUP,grind:"Coarse",recipeMode:"kasuya"};
    try{
      const raw=root.localStorage?.getItem(SETUP_STORAGE_KEY);
      if(!raw)return fallback;
      const saved=JSON.parse(raw);
      const cupPreset=saved?.cupPreset===2?2:1;
      const beanGrams=Number.isInteger(saved?.beanGrams)&&saved.beanGrams>=5&&saved.beanGrams<=40?saved.beanGrams:(cupPreset===2?25:15);
      const roast=ROAST[saved?.roast]?saved.roast:"Medium";
      return {cupPreset,beanGrams,roast,grind:"Coarse",recipeMode:"kasuya"};
    }catch(_){return fallback;}
  }
  const state = {
    visualMode: "factory", // Factory is the main experience; Core/input remain visual-mode agnostic.
    settings: loadSetupSettings(),
    plan: null, clock: null, prepClock: null,
    sample: null, previousSample: null, lastSampleMono: 0, suppressCue: false,
    finishing: false, brewStarting: false, brewCountdown: 0, brewCountdownDelay: 0, brewUiFade: 1, brewReadySoundStep: 0,
    gesture: null, buttons: [], pulse: 0, cupLift: 0, languageTransition: null,
  };

  const SETUP_ICONS = {
    cup: typeof loadImage === "function" ? loadImage("./assets/coffee-cup-icon.png") : null,
    beans: typeof loadImage === "function" ? loadImage("./assets/beans-icon.png") : null,
    water: typeof loadImage === "function" ? loadImage("./assets/kettle-icon.png") : null,
  };
  const SOUND_ICONS = {
    on: typeof loadImage === "function" ? loadImage("./assets/sound-icon.png") : null,
    off: typeof loadImage === "function" ? loadImage("./assets/sound-mute-icon.png") : null,
  };

  const factoryView = (() => {
    const KM = root.KobitoMotion;
    if (!KM) return null;
    const { Kobito, P } = KM;
    const PAPER = "#F2E9DA", INK = "#3A2D24", GOLD = "#C1A066", COFFEE = "#77523A", SOLID_TOOL = "#F7F0E5";
    const EQUIPMENT_FILL = "#E9DBC4";
    const RULE = "#D7C7AD", WATER = "#A8C4D4", STEAM = "#D9D0C0";
    const W = 120;
    const scenes = Object.create(null);
    const FACTORY_EXTERIOR = typeof loadImage === "function" ? loadImage("./assets/factory-exterior-line.png") : null;

    const rr = (ctx,x,y,w,h,r) => { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); };
    const mapPoint = (worker,scale,p) => ({x:worker.x+(p.x-worker.x)*scale,y:worker.ground+(p.y-worker.ground)*scale});
    const invPoint = (worker,scale,x,y) => ({x:worker.x+(x-worker.x)/scale,y:worker.ground+(y-worker.ground)/scale});
    function drawScaled(ctx,worker,scale){
      ctx.save();ctx.translate(worker.x,worker.ground);ctx.scale(scale,scale);ctx.translate(-worker.x,-worker.ground);worker.draw(ctx);ctx.restore();
    }
    function labPanel(x,y,w,labH,draw){
      const h=w*labH/W;
      withCanvasContext(ctx=>{
        ctx.save();
        ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
        ctx.translate(x,y+h);ctx.scale(w/W,-w/W);
        draw(ctx);
        ctx.restore();
      });
    }
    function backdrop(ctx, floor=136, labelText=""){
      ctx.fillStyle='rgba(255,255,255,.14)';rr(ctx,6,10,108,floor-14,8);ctx.fill();
      ctx.strokeStyle=RULE;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(8,floor);ctx.lineTo(112,floor);ctx.stroke();
      if(labelText){ctx.fillStyle=INK;ctx.globalAlpha=.45;ctx.font=`3.4px ${UI_FONT_STACK}`;ctx.textAlign='left';ctx.fillText(labelText,8,16);ctx.globalAlpha=1;}
    }
    function drawFactoryExterior(ctx,alpha=.24){
      if(!FACTORY_EXTERIOR || !FACTORY_EXTERIOR.loaded || !FACTORY_EXTERIOR.element)return;
      ctx.save();
      ctx.globalAlpha=alpha;
      // Local scene space is already y-up inside the lab panel.
      // The exterior asset itself is upright, so draw it directly here.
      ctx.drawImage(FACTORY_EXTERIOR.element,6,14,108,118);
      ctx.restore();
    }

    // ---- Shared tool language -----------------------------------------------
    // Equipment uses continuous silhouettes wherever possible. Outer / inner
    // strokes stay consistent so the tools read as one family instead of stacked
    // primitive shapes.
    const TOOL_OUTLINE=1.08, TOOL_DETAIL=.66;
    function drawSteam(ctx,cx,baseY,seed=0,scale=1){
      const t=performance.now()*.00082;
      ctx.save();
      for(let i=0;i<4;i++){
        const q=(t+i*.24+seed)%1;
        const sway=Math.sin(q*4.6+seed*6+i*.8)*1.1 + Math.sin(q*2.2+i*.45)*.34;
        const x=cx+sway*scale;
        const y=baseY-q*10.8*scale;
        const r=(.82+q*.66+(i%2)*.12)*scale;
        const a=.14*(1-q)+.04;
        ctx.fillStyle=`rgba(217,208,192,${a.toFixed(3)})`;
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    function kettleBodyPath(ctx){
      // Human-scale gooseneck kettle silhouette inspired by the reference:
      // tall reservoir, long slim spout, rear handle loop.
      ctx.beginPath();
      ctx.moveTo(-6.2,-11.4);
      ctx.quadraticCurveTo(-10.8,-11.0,-12.1,-2.2);
      ctx.quadraticCurveTo(-12.5,8.5,-7.0,10.7);
      ctx.quadraticCurveTo(-2.2,11.9,4.8,10.8);
      ctx.quadraticCurveTo(9.4,9.9,10.3,5.0);
      ctx.quadraticCurveTo(12.8,4.2,18.5,2.0,25.0,-1.3);
      ctx.quadraticCurveTo(29.6,-3.6,31.1,-5.0);
      ctx.quadraticCurveTo(31.6,-5.8,31.0,-6.4);
      ctx.quadraticCurveTo(30.0,-6.9,27.4,-6.3);
      ctx.bezierCurveTo(21.2,-4.9,16.1,-3.9,11.1,-3.4);
      ctx.quadraticCurveTo(10.1,-8.7,6.6,-10.8);
      ctx.quadraticCurveTo(1.8,-11.8,-6.2,-11.4);
      ctx.closePath();
    }
    function drawKettle(ctx,x,y,{scale=1,flip=1,angle=0,fill=SOLID_TOOL,water=false}={}){
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(flip*scale,scale);
      ctx.strokeStyle=INK;ctx.lineWidth=TOOL_OUTLINE;
      // Rear handle first so it sits behind the body.
      ctx.beginPath();
      ctx.moveTo(-8.4,-6.9);
      ctx.bezierCurveTo(-17.4,-6.0,-18.4,6.2,-8.5,7.3);
      ctx.stroke();
      ctx.fillStyle=fill;
      kettleBodyPath(ctx);ctx.fill();ctx.stroke();
      // Open-top rim suggestion only; the water inside is not shown from outside.
      ctx.lineWidth=TOOL_DETAIL;
      ctx.beginPath();
      ctx.moveTo(-4.2,-10.7);
      ctx.quadraticCurveTo(.9,-11.9,5.8,-10.8);
      ctx.stroke();
      ctx.restore();
    }
    function cupPath(ctx){
      // Softer cylindrical taper with a rounder drinking rim.
      ctx.beginPath();
      ctx.moveTo(-12.2,-11.0);
      ctx.quadraticCurveTo(0,-13.2,12.2,-11.0);
      ctx.bezierCurveTo(13.0,-5.8,12.7,2.2,9.8,9.1);
      ctx.quadraticCurveTo(0,12.2,-9.8,9.1);
      ctx.bezierCurveTo(-12.7,2.2,-13.0,-5.8,-12.2,-11.0);
      ctx.closePath();
    }
    function drawCoffeeCup(ctx,x,y,{scale=1,coffee=true,fill=SOLID_TOOL}={}){
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
      ctx.strokeStyle=INK;ctx.lineWidth=TOOL_OUTLINE;
      // Rear handle first so it sits behind the cup body.
      ctx.beginPath();
      ctx.moveTo(12.0,-4.6);
      ctx.bezierCurveTo(18.0,-5.2,18.8,-1.1,18.1,2.8);
      ctx.bezierCurveTo(17.2,7.0,14.6,8.5,10.8,7.1);
      ctx.stroke();
      ctx.fillStyle=fill;
      cupPath(ctx);ctx.fill();ctx.stroke();
      // Rim / coffee surface.
      ctx.lineWidth=TOOL_DETAIL;
      ctx.beginPath();ctx.moveTo(-9.2,-9.5);ctx.quadraticCurveTo(0,-11.2,9.2,-9.5);ctx.stroke();
      if(coffee){ctx.fillStyle=COFFEE;ctx.globalAlpha=.66;ctx.beginPath();ctx.ellipse(0,-10.0,9.1,1.9,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      ctx.restore();
    }
    function drawDripper(ctx,x,y,{scale=1,fill='rgba(255,255,255,.28)'}={}){
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle=INK;ctx.fillStyle=fill;ctx.lineWidth=TOOL_OUTLINE;
      // Slightly rounded cone, one body path rather than ellipse + trapezoid.
      ctx.beginPath();ctx.moveTo(-15,-7.4);ctx.quadraticCurveTo(0,-10.2,15,-7.4);ctx.bezierCurveTo(12.6,-1.6,9.1,7.6,5.3,12.2);ctx.quadraticCurveTo(0,14.5,-5.3,12.2);ctx.bezierCurveTo(-9.1,7.6,-12.6,-1.6,-15,-7.4);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.lineWidth=TOOL_DETAIL;ctx.beginPath();ctx.moveTo(-12.8,-6.7);ctx.quadraticCurveTo(0,-8.6,12.8,-6.7);ctx.stroke();
      ctx.restore();
    }
    function drawWorkStand(ctx,x,y,{w=27,scale=1}={}){
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle=INK;ctx.fillStyle='rgba(193,160,102,.18)';ctx.lineWidth=TOOL_OUTLINE;
      ctx.beginPath();ctx.moveTo(-w/2,0);ctx.quadraticCurveTo(-w/2,-2,-w/2+2,-2);ctx.lineTo(w/2-2,-2);ctx.quadraticCurveTo(w/2,-2,w/2,0);ctx.quadraticCurveTo(w/2,2,w/2-2,2);ctx.lineTo(-w/2+2,2);ctx.quadraticCurveTo(-w/2,2,-w/2,0);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.lineWidth=TOOL_DETAIL;ctx.beginPath();ctx.moveTo(-w*.36,2);ctx.quadraticCurveTo(-w*.33,7,-w*.31,10);ctx.moveTo(w*.36,2);ctx.quadraticCurveTo(w*.33,7,w*.31,10);ctx.stroke();ctx.restore();
    }
    function drawServingCart(ctx,x,y,{scale=1}={}){
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle=INK;ctx.fillStyle='rgba(255,255,255,.14)';ctx.lineWidth=TOOL_OUTLINE;
      ctx.beginPath();ctx.moveTo(-16,-1.5);ctx.quadraticCurveTo(0,-5.8,16,-1.5);ctx.quadraticCurveTo(13,2.8,4,3.5);ctx.lineTo(-4,3.5);ctx.quadraticCurveTo(-13,2.8,-16,-1.5);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.lineWidth=TOOL_DETAIL;ctx.beginPath();ctx.moveTo(-10,3.2);ctx.lineTo(-9,7);ctx.moveTo(10,3.2);ctx.lineTo(9,7);ctx.stroke();ctx.fillStyle=INK;ctx.beginPath();ctx.arc(-9,7.4,1.2,0,Math.PI*2);ctx.arc(9,7.4,1.2,0,Math.PI*2);ctx.fill();ctx.restore();
    }

    // ---- Setup / load floor -------------------------------------------------
    function makeSetup(cups){
      const beanWorker=new Kobito({x:-18,ground:121,direction:1,appearance:{hatBend:2,bodyWidth:7.1,apronLength:8.7}});
      const waterWorker=new Kobito({x:96,ground:122,direction:-1,appearance:{hatBend:3,bodyWidth:7.0,apronLength:8.2}});
      beanWorker.setMotion('carryWalk');beanWorker.setPaused(false);beanWorker.hideTool=true;
      waterWorker.setMotion('carryWalk');waterWorker.pendingTool='pot';waterWorker.tool.kind='pot';waterWorker.toolBlend=1;waterWorker.tool.weight=1;waterWorker.loadBearing=1;waterWorker.setPaused(true);waterWorker.hideTool=true;
      return {beanWorker,waterWorker,beanScale:.66,waterScale:.66,currentCups:cups,bean:{mode:'enter',targetCups:cups,carryCups:cups},water:{mode:'hold',targetCups:cups,timer:0,fall:0,action:'refill'}};
    }
    function setupCupChange(v,next){
      if(next===v.bean.targetCups && next===v.water.targetCups)return;
      const prev=v.currentCups;v.currentCups=next;v.bean.targetCups=next;
      if(v.bean.mode==='hold'){v.bean.mode='exit';v.beanWorker.setPaused(false);v.beanWorker.setDirection(-1);}
      v.water.action=next>prev?'refill':'dump';v.water.targetCups=next;v.water.mode='turnOut';v.water.timer=0;v.water.fall=0;v.waterWorker.setPaused(true);v.waterWorker.setDirection(1);
    }
    function updateSetup(v,dt,cups){
      setupCupChange(v,cups);
      const bw=v.beanWorker, bs=v.bean;
      if(bs.mode==='enter'){bw.setDirection(1);bw.setPaused(false);if(bw.x>=26){bw.x=26;bw.velocity=0;bw.setPaused(true);bs.mode='hold';bw.setDirection(1);}}
      else if(bs.mode==='exit'){bw.setDirection(-1);bw.setPaused(false);if(bw.x<=-20){bs.carryCups=bs.targetCups;bw.x=-20;bw.velocity=0;bw.setDirection(1);bs.mode='enter';}}
      else {bw.setPaused(true);bw.setDirection(1);}
      const ww=v.waterWorker, ws=v.water;
      if(ws.mode==='turnOut'){ws.timer+=dt;ws.fall=0;ww.setPaused(true);ww.setDirection(1);if(ws.timer>=.24){ws.mode='fill';ws.timer=0;}}
      else if(ws.mode==='fill'){
        ws.timer+=dt;ww.setPaused(true);ww.setDirection(1);
        if(ws.action==='refill'){
          if(ws.timer<.12)ws.fall=ws.timer/.12;else if(ws.timer<1.02)ws.fall=1;else ws.fall=Math.max(0,1-(ws.timer-1.02)/.24);
        } else ws.fall=0;
        if(ws.timer>=1.26){ws.mode='settle';ws.timer=0;ws.fall=0;}
      } else if(ws.mode==='settle'){ws.timer+=dt;ws.fall=0;ww.setPaused(true);ww.setDirection(1);if(ws.timer>=.42){ws.mode='turnBack';ws.timer=0;}}
      else if(ws.mode==='turnBack'){ws.timer+=dt;ws.fall=0;ww.setPaused(true);ww.setDirection(-1);if(ws.timer>=.24){ws.mode='hold';ws.timer=0;}}
      else {ww.setPaused(true);ww.setDirection(-1);ws.fall=0;}
      bw.update(dt);ww.update(dt);
    }
    function drawBeanSack(ctx,x,y,rot=0,sc=1){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(sc,sc);ctx.fillStyle=EQUIPMENT_FILL;ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-4,-6);ctx.quadraticCurveTo(-6,-2,-5,3);ctx.quadraticCurveTo(0,7,5,3);ctx.quadraticCurveTo(6,-2,4,-6);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-2.6,-5.5);ctx.lineTo(2.6,-5.5);ctx.stroke();ctx.restore();}
    function drawSetup(ctx,v){
      // Match Prep: no faint panel, only the floor line remains.
      ctx.strokeStyle=RULE;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(8,136);ctx.lineTo(112,136);ctx.stroke();
      drawFactoryExterior(ctx);
      const bt=mapPoint(v.beanWorker,v.beanScale,v.beanWorker.tool);
      if(v.bean.carryCups===1)drawBeanSack(ctx,bt.x+1.1,bt.y+1.1,.08,.95);else{drawBeanSack(ctx,bt.x+1,bt.y+2,.08,.97);drawBeanSack(ctx,bt.x+.2,bt.y-3.8,-.05,.76);}
      drawScaled(ctx,v.beanWorker,v.beanScale);
      const f=v.waterWorker.facing>=0?1:-1, center={x:v.waterWorker.x+(f<0?-9.4:8.3),y:v.waterWorker.ground-17.2},angle=f<0?-.08:.08;
      drawKettle(ctx,center.x,center.y,{scale:.67,flip:f,angle,fill:EQUIPMENT_FILL});
      drawSteam(ctx,center.x+(f<0?-1.5:1.5),center.y-7.2,.17,.72);
      drawScaled(ctx,v.waterWorker,v.waterScale);
      if(v.water.fall>0){
        const base={x:center.x+(f<0?1.8:-.8),y:center.y-6.6},t=v.water.fall,p=v.water.timer%1,wx=base.x+.2;
        ctx.strokeStyle=`rgba(168,196,212,${(.42+.34*t).toFixed(3)})`;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(wx,14);ctx.lineTo(wx,base.y-1.2);ctx.stroke();
        for(const b of [{p:0,dx:0,r:2.1},{p:.16,dx:2.8,r:1.8},{p:.33,dx:-2.6,r:1.6},{p:.54,dx:1.5,r:1.35},{p:.74,dx:-1.3,r:1.15}]){const q=(p+b.p)%1,x=base.x+b.dx+Math.sin(q*4+b.p*8)*.8,y=base.y-q*14,r=b.r*(1+q*.7),a=(.36+.25*t)*(1-q);ctx.fillStyle=`rgba(195,214,223,${a.toFixed(3)})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
      }
    }

    // ---- Prep floor ---------------------------------------------------------
    function makePrep(){
      const grinder=new Kobito({x:12,ground:127,direction:1,appearance:{hatBend:2.2,bodyWidth:7.1,apronLength:8.7}});grinder.setMotion('operate');grinder.hideTool=true;
      // A fresh Motion Lab operate worker. Keep its original appearance; only placement/scale follow Prep.
      const operator=new Kobito({x:12,ground:127,direction:1});operator.setMotion('operate');operator.hideTool=true;
      const cooler=new Kobito({x:109.5,ground:128,direction:-1,appearance:{hatBend:3.4,bodyWidth:6.9,apronLength:8.2}});cooler.setMotion('temperatureWork');cooler.hideTool=true;
      return {
        grinder,operator,cooler,
        grinderScale:.715,operatorScale:.715,coolerScale:.715,
        handleRot:0,groundsLevel:.48,
        // Decorative heater cycle for the Prep kettle/thermometer. Starts hot,
        // cools gradually, then rises again. Kept separate from recipe timing.
        tempCycle:0,
        // Motion Lab equipment relation: +11 px in x, -19 px in y from the worker root.
        operatorLever:{x:23,y:108,anchor:{x:23,y:108}}
      };
    }
    function crossedPhase(previous,current,target){
      return previous<=current
        ? previous<target&&current>=target
        : previous<target||current>=target;
    }
    function updatePrep(v,dt){
      v.handleRot+=dt*2.2;v.groundsLevel=.48+Math.sin(performance.now()*.0012)*.10;
      // One gentle heat cycle takes about 11 seconds: high -> low -> high.
      // This is purely visual so it never affects the recipe's recommended temperature.
      v.tempCycle=(v.tempCycle+dt/11)%1;
      v.grinder.setAnchor({x:28+Math.cos(v.handleRot)*10.5,y:58+Math.sin(v.handleRot)*10.5});v.grinder.headBias=.10;
      const effort=v.operator.pose[P.effort]||0, lever=v.operatorLever;
      lever.anchor.x=lever.x-effort*.7*v.operator.facing;lever.anchor.y=lever.y+effort*1.8;
      v.operator.setAnchor(lever.anchor);v.operator.headBias=0;
      const glance=(Math.sin(v.cooler.life*.95)+1)*.5;
      v.cooler.setAnchor({x:100.5,y:100.5+5.5*glance});
      v.cooler.setLookTarget({x:82+18*glance,y:60+23.5*glance});v.cooler.headBias=0;
      const operatorPhase=v.operator.phase,coolerPhase=v.cooler.phase;
      v.grinder.update(dt);v.operator.update(dt);v.cooler.update(dt*.92);
      if(crossedPhase(operatorPhase,v.operator.phase,.36)) playSE("grinder_lever",{cooldown:1200});
      if(crossedPhase(coolerPhase,v.cooler.phase,.18)) playSE("steam_soft",{cooldown:2600});
    }
    function drawPrep(ctx,v,plan){
      // Prep only: remove the faint white panel so the workers live directly on the page.
      // Keep the floor line for grounding and composition.
      ctx.strokeStyle=RULE;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(8,138);ctx.lineTo(112,138);ctx.stroke();
      // manual grinder
      ctx.save();ctx.strokeStyle=INK;ctx.fillStyle=EQUIPMENT_FILL;ctx.lineWidth=1.05;rr(ctx,28,44,22,34,4);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(31,44);ctx.lineTo(34.5,33);ctx.lineTo(44.5,33);ctx.lineTo(48,44);ctx.closePath();ctx.fill();ctx.stroke();
      const cx=28,cy=58,arm=10.5,kx=cx+Math.cos(v.handleRot)*arm,ky=cy+Math.sin(v.handleRot)*arm;ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(kx,ky);ctx.stroke();ctx.fillStyle=GOLD;ctx.beginPath();ctx.arc(kx,ky,2.2,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.14)';rr(ctx,36.5,80.5,6.8,4.8,1.3);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.22)';rr(ctx,33.5,92,16,11,2.2);ctx.fill();ctx.stroke();ctx.fillStyle=COFFEE;rr(ctx,34.9,96,13.2,v.groundsLevel*3.8,1);ctx.fill();
      const ph=(v.handleRot*.38)%1;ctx.fillStyle=COFFEE;
      // Fine grounds: a narrow, irregular curtain instead of four large beads.
      for(let i=0;i<14;i++){
        const q=(ph+i*.113)%1;
        const flutter=Math.sin(i*2.31+q*8.2)*.46+Math.sin(i*.83+q*3.4)*.18;
        const x=40+flutter,y=85.1+q*7.2,r=.16+(i%4)*.035;
        ctx.globalAlpha=.48+.42*(1-q);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;ctx.restore();
      // Motion Lab operate worker + lever are transformed as ONE unit.
      // This keeps the hand target, lever ring and visual lever on the identical scaled coordinates.
      ctx.save();
      ctx.translate(v.operator.x,v.operator.ground);ctx.scale(v.operatorScale,v.operatorScale);ctx.translate(-v.operator.x,-v.operator.ground);
      ctx.strokeStyle=INK;ctx.lineWidth=1.1;
      ctx.beginPath();ctx.moveTo(v.operatorLever.x+3,v.operatorLever.y+11);ctx.lineTo(v.operatorLever.anchor.x,v.operatorLever.anchor.y);ctx.stroke();
      ctx.beginPath();rr(ctx,v.operatorLever.x-1,v.operatorLever.y+10,8,4,1);ctx.fillStyle=GOLD;ctx.fill();ctx.stroke();
      ctx.lineWidth=.65;ctx.beginPath();
      ctx.moveTo(v.operatorLever.x+3,v.operatorLever.y+14);ctx.lineTo(v.operatorLever.x+3,v.operator.ground);
      ctx.moveTo(v.operatorLever.x-2,v.operator.ground);ctx.lineTo(v.operatorLever.x+8,v.operator.ground);
      ctx.stroke();
      ctx.strokeStyle=GOLD;ctx.lineWidth=.75;ctx.beginPath();ctx.arc(v.operatorLever.anchor.x,v.operatorLever.anchor.y,2.2,0,Math.PI*2);ctx.stroke();
      ctx.restore();
      drawScaled(ctx,v.operator,v.operatorScale);
      // Shared kettle silhouette + thermometer. The right-side station breathes a
      // little: steam becomes slightly stronger while the thermometer rises.
      const heat=(Math.cos(v.tempCycle*Math.PI*2)+1)*.5;
      drawKettle(ctx,82,58,{scale:.92,flip:1,angle:0,fill:EQUIPMENT_FILL});
      drawSteam(ctx,82,46.8,.29,.88+heat*.34);
      ctx.save();ctx.strokeStyle=INK;ctx.lineWidth=TOOL_OUTLINE;ctx.fillStyle='rgba(255,255,255,.20)';rr(ctx,95,62,10,42,3);ctx.fill();ctx.stroke();ctx.lineWidth=TOOL_DETAIL;ctx.beginPath();ctx.moveTo(100,66);ctx.lineTo(100,98);ctx.stroke();for(const y of [68,73,78,83,88,93,98]){ctx.beginPath();ctx.moveTo(102.5,y);ctx.lineTo(105,y);ctx.stroke();}
      // Move through the useful visible range rather than tying this decorative
      // cycle to the roast preset. High -> low -> high stays readable for every roast.
      const fillTop=76.5+(1-heat)*14.5;ctx.fillStyle='#B45E4B';rr(ctx,98.2,fillTop,3.6,92-fillTop,1.1);ctx.fill();ctx.beginPath();ctx.arc(100,97.5,2.8,0,Math.PI*2);ctx.fill();ctx.restore();
      drawScaled(ctx,v.cooler,v.coolerScale);
    }

    // ---- Brew floor ---------------------------------------------------------
    function makeBrew(){
      // The brewer works from the raised stand again. This is part of the
      // human-scale-equipment story, so do not flatten both workers to one floor.
      const brewer=new Kobito({x:98,ground:32,direction:-1,appearance:{hatBend:1,bodyWidth:7.2,apronLength:9.2}});brewer.hideTool=true;brewer.setMotion('idle');brewer.blendDuration=.46;
      const watcher=new Kobito({x:24,ground:78,direction:1,appearance:{hatBend:3,bodyWidth:7,apronLength:8}});watcher.setMotion('inspect');
      const waitKettlePose={x:84.5,y:24.8,angle:0,flip:-1};
      return {
        brewer,watcher,brewerScale:.64,watcherScale:.64,mode:'ready',phaseTarget:'ready',
        kettlePose:{...waitKettlePose},
        waitKettlePose,
        kettleTween:null,
        glance:{elapsed:0,next:2.8,duration:.68,active:false},
        dripT:0
      };
    }
    function beginKettleTween(v,target,duration,{arcY=0}={}){
      v.kettleTween={from:{...v.kettlePose},to:{...target},elapsed:0,duration,arcY};
    }
    function stepKettleTween(v,dt,dynamicTarget){
      const tw=v.kettleTween;if(!tw)return false;
      if(dynamicTarget)tw.to={...dynamicTarget};
      tw.elapsed=Math.min(tw.duration,tw.elapsed+dt);
      const u=tw.duration>0?tw.elapsed/tw.duration:1;
      // One continuous ease-in/ease-out motion: no intermediate pose or stop.
      const e=u*u*u*(u*(u*6-15)+10);
      const lerp=(a,b)=>a+(b-a)*e;
      v.kettlePose={
        x:lerp(tw.from.x,tw.to.x),
        y:lerp(tw.from.y,tw.to.y)-Math.sin(Math.PI*u)*(tw.arcY||0),
        angle:lerp(tw.from.angle,tw.to.angle),
        flip:lerp(tw.from.flip,tw.to.flip)
      };
      if(u>=1){v.kettleTween=null;return true;}return false;
    }
    function updateBrew(v,dt,sample){
      const preparing=!!state.brewStarting;
      const pouring=!preparing&&sample?.status==='POUR';
      const actorPaused=preparing||!!sample?.paused;
      const desired=preparing?'ready':(pouring?'pour':'wait');

      if(desired!==v.phaseTarget){
        v.phaseTarget=desired;
        if(desired==='pour'){
          v.mode='lifting';
          v.brewer.blendDuration=.46;
          v.brewer.setMotion('pour');
          v.brewer.setAnchor(invPoint(v.brewer,v.brewerScale,64,34));
          v.brewer.setPaused(actorPaused);
          beginKettleTween(v,v.kettlePose,.40);
        }else if(desired==='wait'){
          // Finish the pour in one continuous return. Clear the pour anchor while
          // the current pose is still settled, then blend body + kettle together.
          v.mode='settling';
          v.brewer.setAnchor(null);
          v.brewer.blendDuration=.62;
          v.brewer.setMotion('idle');
          v.brewer.setPaused(actorPaused);
          beginKettleTween(v,v.waitKettlePose,.62,{arcY:.20});
        }else{
          v.mode='ready';
          v.brewer.setAnchor(null);
          v.brewer.blendDuration=.46;
          v.brewer.setMotion('idle');
          v.brewer.setPaused(actorPaused);
          beginKettleTween(v,v.waitKettlePose,.28);
        }
      }

      if(pouring)v.brewer.setAnchor(invPoint(v.brewer,v.brewerScale,64,34));
      v.brewer.setPaused(actorPaused);
      v.watcher.setPaused(actorPaused);

      if(!actorPaused){
        const g=v.glance;g.elapsed+=dt;if(!g.active&&g.elapsed>=g.next){g.active=true;g.elapsed=0;g.duration=.55+Math.random()*.25;g.next=3.2+Math.random()*2.4;}let w=0;if(g.active){const u=g.elapsed/g.duration;if(u>=1){g.active=false;g.elapsed=0;}else w=Math.sin(Math.PI*u);}v.watcher.headBias=-.16*w;
        v.brewer.update(dt);v.watcher.update(dt);
        if(pouring){
          const t=v.brewer.tool,c=mapPoint(v.brewer,v.brewerScale,t);
          const target={x:c.x,y:c.y,angle:t.angle,flip:v.brewer.facing};
          if(v.kettleTween){if(stepKettleTween(v,dt,target))v.mode='pour';}
          else {v.kettlePose=target;v.mode='pour';}
        }else{
          if(v.kettleTween){
            if(stepKettleTween(v,dt,null)){
              v.mode=desired==='ready'?'ready':'wait';
              if(v.mode==='wait')v.brewer.blendDuration=.46;
            }
          }else{
            v.kettlePose={...v.waitKettlePose};v.mode=desired==='ready'?'ready':'wait';
          }
          if(desired==='wait')v.dripT=(v.dripT+dt)%3.2;
        }
      }
    }
    function drawBrew(ctx,v){
      // Match Prep: keep the grounding line, remove the faint panel.
      // The raised stand and vertical drop remain unchanged.
      ctx.strokeStyle=RULE;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(8,79);ctx.lineTo(112,79);ctx.stroke();

      drawWorkStand(ctx,98.5,32.5,{w:27});
      drawDripper(ctx,60,41,{scale:.88,fill:EQUIPMENT_FILL});
      ctx.save();ctx.fillStyle=COFFEE;ctx.globalAlpha=.70;ctx.beginPath();ctx.ellipse(60,35.8,9.1,1.45,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.restore();
      // Leave a visible drop space between dripper and cup.
      drawCoffeeCup(ctx,60,68,{scale:.96,coffee:true,fill:SOLID_TOOL});

      const k=v.kettlePose;
      drawKettle(ctx,k.x,k.y,{scale:.70,flip:k.flip,angle:k.angle,fill:EQUIPMENT_FILL});
      drawSteam(ctx,k.x,k.y-6.3,(v.mode==='wait'||v.mode==='ready'||v.mode==='settling')?.12:.41,.60);
      drawScaled(ctx,v.watcher,v.watcherScale);drawScaled(ctx,v.brewer,v.brewerScale);
      if(v.mode==='wait'){
        // Waiting changes the action, not the composition. Keep the kettle at rest,
        // and show a short dripping path from just below the dripper toward the cup.
        const phase=v.dripT%1.52;
        const drops=[
          {t:phase/1.52,dx:0,r:.98,a:.78},
          {t:((phase+.66)%1.52)/1.52,dx:.42,r:.66,a:.48}
        ];
        for(const d of drops){
          const y=54.2+d.t*5.9;
          const x=60+d.dx+Math.sin((d.t+.14)*Math.PI*2)*.10;
          const r=d.r*(.88+.18*(1-d.t));
          ctx.fillStyle=COFFEE;ctx.globalAlpha=d.a*(.82+.18*(1-d.t));ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
      }
    }

    // ---- Finish floor -------------------------------------------------------
    function makeFinish(cups){
      const shipper=new Kobito({x:-10,ground:126,direction:1,appearance:{hatBend:2.2,bodyWidth:7.1,apronLength:8.6}});shipper.setMotion('carryWalk');shipper.hideTool=true;
      const cheerer=new Kobito({x:107,ground:127,direction:-1,appearance:{hatBend:3.1,bodyWidth:7,apronLength:8.3}});cheerer.setMotion('celebrate');cheerer.hideTool=true;cheerer.phase=.18;
      return {shipper,cheerer,shipperScale:.66,cheererScale:.66,cups,shipMode:'walkIn',shipWait:0,life:0};
    }
    function updateFinish(v,dt,cups){
      v.life+=dt;
      if(v.cups!==cups){v.cups=cups;v.shipper.x=-10;v.shipper.velocity=0;v.shipper.setDirection(1);v.shipper.setPaused(false);v.shipMode='walkIn';v.cheerer.phase=.14;v.life=0;}
      const w=v.shipper;if(v.shipMode==='walkIn'){w.setPaused(false);w.setDirection(1);if(w.x>=27){w.x=27;w.velocity=0;w.setPaused(true);v.shipMode='wait';v.shipWait=0;}}
      else if(v.shipMode==='wait'){v.shipWait+=dt;w.setPaused(true);if(v.shipWait>1.2){w.setDirection(-1);w.setPaused(false);v.shipMode='walkOut';}}
      else if(v.shipMode==='walkOut'){w.setDirection(-1);w.setPaused(false);if(w.x<-10){w.x=-10;w.velocity=0;w.setDirection(1);v.shipMode='walkIn';}}
      w.update(dt);v.cheerer.update(dt);
    }
    function drawFinishBackdropAccents(ctx){
      // A little more activity on the shipping floor, kept well behind the actors.
      ctx.save();ctx.globalAlpha=.095;ctx.strokeStyle=INK;ctx.lineWidth=.72;
      ctx.beginPath();ctx.moveTo(12,33);ctx.lineTo(42,33);ctx.moveTo(78,33);ctx.lineTo(108,33);ctx.stroke();
      for(const [x,w,h] of [[16,8,7],[26,10,9],[82,9,8],[94,11,7]]){
        ctx.beginPath();ctx.moveTo(x,33);ctx.lineTo(x,33-h);ctx.quadraticCurveTo(x+w/2,31-h,x+w,33-h);ctx.lineTo(x+w,33);ctx.stroke();
      }
      ctx.beginPath();ctx.moveTo(20,20);ctx.lineTo(20,26);ctx.moveTo(100,20);ctx.lineTo(100,26);ctx.stroke();
      ctx.restore();
    }
    function drawFinish(ctx,v,plan){
      // Match Prep: no faint panel, only the floor line remains.
      ctx.strokeStyle=RULE;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(8,139);ctx.lineTo(112,139);ctx.stroke();
      // Return to the same exterior seen on Setup. At Finish it is quieter,
      // so the completed cup and workers stay in front while the scene gains closure.
      drawFactoryExterior(ctx,.14);
      // Freshly finished coffee gives off a little extra steam on arrival, then
      // settles back to the quiet baseline over the first ~1.8 seconds.
      const freshSteam=Math.max(0,1-v.life/1.8);
      const freshPuff=(x,y,seed,scale)=>{
        if(freshSteam<=0) return;
        ctx.save();ctx.globalAlpha=.72*freshSteam;
        drawSteam(ctx,x,y,seed+.43,scale*1.08);
        ctx.restore();
      };
      if(v.cups===1){
        drawCoffeeCup(ctx,60,101,{scale:1.14,coffee:true,fill:SOLID_TOOL});
        drawSteam(ctx,60,87.7,.08,.88);
        freshPuff(60,87.7,.08,.88);
      }else{
        drawCoffeeCup(ctx,39.5,101.5,{scale:.82,coffee:true,fill:SOLID_TOOL});
        drawCoffeeCup(ctx,80.5,101.5,{scale:.82,coffee:true,fill:SOLID_TOOL});
        drawSteam(ctx,39.5,91.3,.05,.67);drawSteam(ctx,80.5,91.3,.37,.67);
        freshPuff(39.5,91.3,.05,.67);freshPuff(80.5,91.3,.37,.67);
      }
      const t=mapPoint(v.shipper,v.shipperScale,v.shipper.tool);const box=(x,y,w,h,rot=0)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=GOLD;ctx.strokeStyle=INK;ctx.lineWidth=1;rr(ctx,-w/2,-h/2,w,h,1.4);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-w/2,-1.3);ctx.lineTo(w/2,-1.3);ctx.stroke();ctx.restore();};if(v.cups===1)box(t.x+1,t.y+2,11,9,.04);else{box(t.x+1,t.y+3,12,9,.04);box(t.x+.4,t.y-4.2,9.5,7.3,-.04);}
      drawScaled(ctx,v.shipper,v.shipperScale);drawScaled(ctx,v.cheerer,v.cheererScale);
    }

    function reset(name){
      if(name==='setup') scenes.setup=makeSetup(state.settings.cupPreset);
      else if(name==='prep') scenes.prep=makePrep();
      else if(name==='brew') scenes.brew=makeBrew();
      else if(name==='finish') scenes.finish=makeFinish(state.plan?.cupPreset||state.settings.cupPreset);
    }
    function ensure(name){if(!scenes[name])reset(name);return scenes[name];}
    function update(name,dt){
      const v=ensure(name);dt=Math.min(.04,Math.max(0,dt||0));
      if(name==='setup')updateSetup(v,dt,state.settings.cupPreset);
      else if(name==='prep')updatePrep(v,dt);
      else if(name==='brew')updateBrew(v,dt,state.sample);
      else if(name==='finish')updateFinish(v,dt,state.plan?.cupPreset||state.settings.cupPreset);
    }
    function draw(name){
      const v=ensure(name);
      if(name==='setup')labPanel(50,295,260,150,ctx=>drawSetup(ctx,v));
      else if(name==='prep')labPanel(60,248,240,138,ctx=>drawPrep(ctx,v,state.plan));
      else if(name==='brew')labPanel(45,360,270,80,ctx=>drawBrew(ctx,v));
      else if(name==='finish')labPanel(42,285,276,150,ctx=>drawFinish(ctx,v,state.plan));
    }
    return {reset,update,draw};
  })();

  const TEXT = {
    prepare: { jp:"準備へ", en:"Prepare" },
    start: { jp:"コーヒーを淹れる", en:"Brew coffee" },
    again: { jp:"もう一杯", en:"Brew another" },
    back: { jp:"設定にもどる", en:"Back to settings" },
    cupOne: { jp:"1杯", en:"1 cup" },
    cupTwo: { jp:"2杯", en:"2 cups" },
    roastLight: { jp:"浅煎り", en:"Light" },
    roastMedium: { jp:"中煎り", en:"Medium" },
    roastDark: { jp:"深煎り", en:"Dark" },
    prepTemp: { jp:"お湯の目安", en:"Water temp" },
    prepInstruction: { jp:"粉をセットして、スケールを0gに", en:"Set grounds and tare scale to 0g" },
    prepGrind: { jp:"粗挽きが目安", en:"coarse grind" },
    brewReady: { jp:"淹れる準備", en:"Getting ready" },
    brewRemaining: { jp:"あと", en:"Remaining" },
    phasePour: { jp:"お湯を注ぐ", en:"Pour water" },
    phaseWait: { jp:"少し待つ", en:"Wait a moment" },
    phaseFinish: { jp:"あと少し", en:"Almost done" },
    phaseDone: { jp:"おわり", en:"Done" },
    pause: { jp:"いったん止める", en:"Pause" },
    resume: { jp:"つづける", en:"Resume" },
    finishOne: { jp:"一杯できました", en:"One cup is ready" },
    finishTwo: { jp:"二杯できました", en:"Two cups are ready" },
    finishTime: { jp:"かかった時間", en:"Brew time" },
  };
  const tr = key => SSE.i18n.t(key, TEXT[key]?.jp ?? key);
  const roastLabel = {
    get Light(){return tr("roastLight");},
    get Medium(){return tr("roastMedium");},
    get Dark(){return tr("roastDark");}
  };
  const grindLabel = {
    get Fine(){return SSE.i18n.language==="jp"?"細挽き":"Fine";},
    get Medium(){return SSE.i18n.language==="jp"?"中挽き":"Medium";},
    get Coarse(){return SSE.i18n.language==="jp"?"粗挽き":"Coarse";}
  };
  const recipeName = mode => mode === "kasuya" ? (SSE.i18n.language==="jp"?"4:6メソッド":"4:6 method") : (SSE.i18n.language==="jp"?"カスタム":"Custom");
  const clockText = (seconds, roundUp = false) => {
    const n = Math.max(0, roundUp ? Math.ceil(seconds) : Math.floor(seconds));
    return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
  };
  function ink(name = "ink") { fill(...C[name]); noStroke(); }
  function label(value, x, y, size = 14, align = CENTER, tone = "ink") {
    ink(tone); font(UI_FONT_STACK);
    fontSize(size); textAlign(align); text(value, x, y);
  }
  function rule(y, x1 = 28, x2 = 332, tone = "rule") {
    stroke(...C[tone]); strokeWidth(1); line(x1,y,x2,y); noStroke();
  }
  function arc(cx,cy,r,start,end,width,tone) {
    withCanvasContext(ctx => {
      ctx.beginPath(); ctx.strokeStyle = `rgb(${C[tone].join(",")})`; ctx.lineWidth = width;
      ctx.lineCap = "round"; ctx.arc(cx,cy,r,start,end,true); ctx.stroke();
    });
  }
  function ticks(cx,cy,r,n = 60) {
    stroke(...C.rule); strokeWidth(1);
    for (let i=0;i<n;i++) {
      const a = Math.PI/2 - i/n*Math.PI*2, len = i%5 === 0 ? 8 : 3;
      line(cx+Math.cos(a)*r,cy+Math.sin(a)*r,cx+Math.cos(a)*(r+len),cy+Math.sin(a)*(r+len));
    }
    noStroke();
  }
  function brewSegmentRing(cx,cy,r,count,index,phaseProgress,status) {
    const n=Math.max(1,count), sweep=Math.PI*2/n, gap=Math.min(.09,sweep*.13);
    withCanvasContext(ctx=>{
      ctx.save();ctx.lineCap='butt';ctx.lineWidth=16;
      for(let i=0;i<n;i++){
        const start=Math.PI/2-i*sweep-gap/2;
        const span=sweep-gap;
        const end=start-span;
        ctx.beginPath();ctx.strokeStyle=`rgb(${C.rule.join(',')})`;ctx.arc(cx,cy,r,start,end,true);ctx.stroke();
        let f=i<index?1:i>index?0:(status==='POUR'?clamp(phaseProgress,0,1):1);
        if(f>0){ctx.beginPath();ctx.strokeStyle=`rgb(${C.gold.join(',')})`;ctx.arc(cx,cy,r,start,start-span*f,true);ctx.stroke();}
      }
      ctx.restore();
    });
  }
  function hourglassIcon(x,y,scale=1,rotation=0) {
    // Rounded glass body: keep the existing flip timing, but replace the old
    // crossed straight-line silhouette with a softer, readable hourglass.
    withCanvasContext(ctx=>{
      const gold=`rgb(${C.gold.join(',')})`;
      const paper=`rgb(${C.paper.join(',')})`;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(rotation*Math.PI/180);
      ctx.scale(scale,scale);
      ctx.lineCap='round';
      ctx.lineJoin='round';

      // Soft top / bottom frames.
      ctx.fillStyle=paper;
      ctx.strokeStyle=gold;
      ctx.lineWidth=1.55;
      ctx.beginPath();ctx.roundRect(-10.5,-14.3,21,3.2,1.5);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.roundRect(-10.5,11.1,21,3.2,1.5);ctx.fill();ctx.stroke();

      // Curved glass: broad at both ends, gently pinched at the waist.
      ctx.beginPath();
      ctx.moveTo(-8.2,-11.1);
      ctx.bezierCurveTo(-8.0,-6.7,-4.7,-3.1,-1.45,0);
      ctx.bezierCurveTo(-4.7,3.1,-8.0,6.7,-8.2,11.1);
      ctx.lineTo(8.2,11.1);
      ctx.bezierCurveTo(8.0,6.7,4.7,3.1,1.45,0);
      ctx.bezierCurveTo(4.7,-3.1,8.0,-6.7,8.2,-11.1);
      ctx.closePath();
      ctx.fillStyle=paper;
      ctx.fill();
      ctx.strokeStyle=gold;
      ctx.lineWidth=1.45;
      ctx.stroke();

      // A little sand keeps the icon readable at its small Brew size.
      ctx.fillStyle=gold;
      ctx.beginPath();
      ctx.moveTo(-5.6,-8.6);
      ctx.quadraticCurveTo(0,-6.9,5.6,-8.6);
      ctx.quadraticCurveTo(3.2,-4.8,.85,-1.35);
      ctx.quadraticCurveTo(0,-.45,-.85,-1.35);
      ctx.quadraticCurveTo(-3.2,-4.8,-5.6,-8.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5.7,8.7);
      ctx.quadraticCurveTo(0,5.3,5.7,8.7);
      ctx.quadraticCurveTo(0,10.1,-5.7,8.7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle=gold;
      ctx.lineWidth=1.0;
      ctx.beginPath();ctx.moveTo(0,-.2);ctx.lineTo(0,4.8);ctx.stroke();
      ctx.restore();
    });
  }
  function hourglassFlipRotation(timeSec) {
    // codea-lite rotate() takes DEGREES, not radians.
    // Keep the hourglass still for a while, then flip 180° in ~0.5 s.
    const wait=2.0, spin=.5, cycle=wait+spin;
    const n=Math.floor(timeSec/cycle);
    const local=timeSec-n*cycle;
    const base=n*180;
    if(local<wait) return base;
    const u=Math.min(1,(local-wait)/spin);
    const eased=u*u*(3-2*u);
    return -(base+eased*180);
  }
  function brewReadyLamps(x,y,elapsed){
    const lit=Math.max(0,Math.min(3,Math.floor(elapsed+.5)));
    for(let i=0;i<3;i++){
      const cx=x+(i-1)*25;
      if(i<lit){fill(...C.gold);noStroke();ellipse(cx,y,11,11);}
      else {noFill();stroke(...C.rule);strokeWidth(1.5);ellipse(cx,y,10,10);noStroke();}
    }
  }
  // Decoration-only interface. Core/input stay unchanged; Factory is the default renderer.
  const decorationViews = {
    simple: {
      setup() {}, prep() {}, brew() {},
      finish() {
        const y = 355 + state.cupLift;
        stroke(...C.ink); strokeWidth(2); noFill();
        ellipse(250,y+27,48,52);
        fill(...C.paper); rect(104,y-25,140,91,5);
        ellipse(174,y+66,140,25);
        fill(...C.gold); ellipse(174,y+66,119,11);
        noFill(); ellipse(174,y-38,190,14); noStroke();
      },
    },
    factory: {
      setup() { factoryView?.draw("setup"); },
      prep() { factoryView?.draw("prep"); },
      brew() { factoryView?.draw("brew"); },
      finish() { factoryView?.draw("finish"); },
    },
  };
  function decoration(scene) {
    const view = decorationViews[state.visualMode] || decorationViews.simple;
    if (view[scene]) view[scene](state.plan, state.sample);
  }
  function base() {
    ink("paper"); rect(0,0,360,640);
    state.buttons = [];
  }
  function button(id,title,x,y,w,h,action,opts = {}) {
    const bounds = { x,y,w,h };
    const pressed = state.gesture?.id === id && !state.gesture.cancelled;
    // SSE handles bounds/hits; the flat face is CoffeeFactory's own visual design.
    pushMatrix(); translate(0,pressed ? -1.5 : 0);
    if (opts.primary) {
      ink("ink"); rect(x,y,w,h,2);
    } else if (opts.choice) {
      if (opts.selected) {
        ink("gold"); rect(x,y,w,h,2);
      } else {
        ink("white"); rect(x,y,w,h,2);
        noFill(); stroke(...C.rule); strokeWidth(0.8); rect(x,y,w,h,2); noStroke();
      }
    } else if (opts.subtle) {
      ink("white"); rect(x+9,y+4,w-18,h-8,6);
      noFill(); stroke(...C.rule); strokeWidth(.6); rect(x+9,y+4,w-18,h-8,6); noStroke();
    } else if (opts.selected) {
      ink("gold"); rect(x+12,y+3,w-24,2);
    } else if (!opts.textOnly) {
      noFill(); stroke(...C.rule); strokeWidth(1); rect(x,y,w,h,2); noStroke();
    }
    const tone = opts.disabled ? "rule"
      : opts.primary ? "paper"
      : (opts.choice && opts.selected) ? "paper"
      : (opts.choice && opts.tone === "gold") ? "goldText"
      : (opts.tone || "ink");
    label(title,x+w/2,y+h/2,opts.size || 14,CENTER,tone,opts.mono ? "mono" : "sans");
    popMatrix();
    state.buttons.push({ id, bounds, action, disabled: !!opts.disabled });
  }
  function segmented(id,values,current,y,action,display) {
    const gap=6, w=(304-gap*(values.length-1))/values.length;
    values.forEach((value,i) => button(id+value,display[value],28+i*(w+gap),y,w,40,()=>action(value),{
      selected:current===value,choice:true,size:15,tone:"gold"
    }));
  }
  function drawSetupIcon(asset,x,y,w,h=w) {
    if(!asset) return;
    spriteMode(CENTER);
    const sourceW=Number(asset.width)||0;
    const sourceH=Number(asset.height)||0;
    const drawIcon=()=>{
      if(sourceW>0&&sourceH>0){
        const scale=Math.min(w/sourceW,h/sourceH);
        sprite(asset,x,y,sourceW*scale,sourceH*scale);
        return;
      }
      sprite(asset,x,y,w,h);
    };
    // UI assets are stored larger than their display size. Force smooth,
    // high-quality downsampling so small icons stay clean on Retina screens.
    if(typeof withCanvasContext === "function"){
      withCanvasContext(ctx=>{
        ctx.imageSmoothingEnabled=true;
        if("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality="high";
        drawIcon();
      });
    }else{
      drawIcon();
    }
  }
  function cupChoiceButton(id,count,x,y,w,h,action,selected) {
    button(id,"",x,y,w,h,action,{selected,choice:true,size:1,tone:"gold"});
    const tone=selected?"paper":"goldText";
    const cy=y+h/2+1;
    if(count===1){
      drawSetupIcon(SETUP_ICONS.cup,x+w/2-25,cy,28,31);
      label(tr("cupOne"),x+w/2+22,cy,16,CENTER,tone);
    }else{
      drawSetupIcon(SETUP_ICONS.cup,x+w/2-35,cy,28,31);
      drawSetupIcon(SETUP_ICONS.cup,x+w/2-16,cy,28,31);
      label(tr("cupTwo"),x+w/2+28,cy,16,CENTER,tone);
    }
  }
  function setupSummary(plan) {
    const x=66, y=553, w=228, h=32;
    ink("white"); rect(x,y,w,h,6);
    noFill(); stroke(...C.rule); strokeWidth(.8); rect(x,y,w,h,6);
    stroke(...C.rule); strokeWidth(.65); line(x+76,y+6,x+76,y+h-6); line(x+152,y+6,x+152,y+h-6); noStroke();
    const cy=y+h/2;
    drawSetupIcon(SETUP_ICONS.cup,x+22,cy,19,21);
    label(state.settings.cupPreset===2?tr("cupTwo"):tr("cupOne"),x+49,cy,17,CENTER,"ink");
    drawSetupIcon(SETUP_ICONS.beans,x+97,cy,20,22);
    label(state.settings.beanGrams+"g",x+123,cy,17,CENTER,"ink");
    drawSetupIcon(SETUP_ICONS.water,x+173,cy-2,22,21);
    label(plan.totalWater+"g",x+201,cy,17,CENTER,"ink");
  }
  const TOP_TIMER_Y=578, TOP_META_Y=540, TOP_TIMER_SIZE=52;
  function fixedClockLabel(value,x,y,size=TOP_TIMER_SIZE,tone="ink") {
    const chars=String(value).padStart(5,"0").slice(-5).split("");
    const digitSlot=size*.57, colonSlot=size*.26;
    const widths=[digitSlot,digitSlot,colonSlot,digitSlot,digitSlot];
    const total=widths.reduce((a,b)=>a+b,0);
    let cursor=x-total/2;
    for(let i=0;i<chars.length;i++){
      const cx=cursor+widths[i]/2;
      label(chars[i],cx,y,size,CENTER,tone);
      cursor+=widths[i];
    }
  }
  function speakerIcon(x,y,enabled=true) {
    const tone=enabled?"muted":"rule";
    noFill(); stroke(...C[tone]); strokeWidth(1.7);
    // left box + right cone, avoiding circular reading
    line(x-10,y-4,x-6,y-4);
    line(x-6,y-4,x-1,y-8);
    line(x-1,y-8,x-1,y+8);
    line(x-1,y+8,x-6,y+4);
    line(x-6,y+4,x-10,y+4);
    line(x-10,y+4,x-10,y-4);
    if(enabled){
      line(x+4,y-4,x+7,y); line(x+7,y,x+4,y+4);
      line(x+8,y-6.5,x+12,y); line(x+12,y,x+8,y+6.5);
    }else{
      line(x+4,y-5,x+11,y+5);
      line(x+11,y-5,x+4,y+5);
    }
    noStroke();
  }
  function pauseGlyph(x,y,scale=1,tone="ink") {
    fill(...C[tone]); noStroke();
    const w=5*scale, h=22*scale, gap=4*scale;
    rect(x-gap/2-w, y-h/2, w, h, 1.6);
    rect(x+gap/2, y-h/2, w, h, 1.6);
  }
  function soundButton() {
    button("sound","",300,594,32,32,()=>{
      const next=!SSE.audio.enabled;
      SSE.audio.setEnabled(next);
      seAudio.setEnabled(next);
      bgm.setEnabled(next);
      if(next) playSE("ui_select",{force:true});
    },{textOnly:true,size:1,tone:"muted"});
    const icon=SSE.audio.enabled?SOUND_ICONS.on:SOUND_ICONS.off;
    if(icon){
      const iconSize=SSE.audio.enabled?36:34;
      drawSetupIcon(icon,316,610,iconSize,iconSize);
    }else{
      speakerIcon(316,610,SSE.audio.enabled);
    }
  }
  function syncDocumentLanguage(){
    const english=SSE.i18n.language==="en";
    if(root.document?.documentElement) root.document.documentElement.lang=english?"en":"ja";
    const canvas=root.document?.getElementById?.("gameCanvas");
    if(canvas) canvas.setAttribute("aria-label",english
      ?"CoffeeFactory brewing timer. Choose your coffee settings and prepare to brew."
      :"CoffeeFactory 抽出タイマー。コーヒーの設定を選んで準備へ進んでください。");
  }
  // Two-part language selector, matching the direct JP / EN control used in
  // Rojiura Masala. Both choices stay visible; the active half is highlighted.
  const LANGUAGE_TOGGLE_BOUNDS = Object.freeze({x:28,y:593,w:82,h:28});
  function languageChoice(t){
    if(!t) return null;
    const b=LANGUAGE_TOGGLE_BOUNDS,pad=7;
    const inside=t.x>=b.x-pad&&t.x<=b.x+b.w+pad&&t.y>=b.y-pad&&t.y<=b.y+b.h+pad;
    if(!inside) return null;
    return t.x < b.x+b.w*.5 ? "jp" : "en";
  }
  function selectLanguage(language){
    const selected=language==="en"?"en":"jp";
    if(state.languageTransition||SSE.i18n.language===selected) return;
    playSE("ui_select");
    resetGesture();
    state.languageTransition={started:performance.now(),duration:CONTENT_FADE.duration,switched:false,target:selected};
  }
  function languageButton(){
    const b=LANGUAGE_TOGGLE_BOUNDS,half=b.w*.5;
    const jpActive=SSE.i18n.language!=="en";
    const selectedX=jpActive?b.x+2:b.x+half;
    ink("white"); rect(b.x,b.y,b.w,b.h,2);
    noFill(); stroke(...C.rule); strokeWidth(0.8); rect(b.x,b.y,b.w,b.h,2); noStroke();
    ink("gold"); rect(selectedX,b.y+2,half-2,b.h-4,2);
    label("JP",b.x+half*.5,b.y+b.h/2,12,CENTER,jpActive?"paper":"goldText");
    label("EN",b.x+half+half*.5,b.y+b.h/2,12,CENTER,jpActive?"goldText":"paper");
  }
  function chrome(){
    languageButton();
    soundButton();
  }
  function resetGesture() { state.gesture = null; }
  // One transition language for the whole app: every scene fades as a complete
  // composition, so text, controls, kobito and tools never pop independently.
  const SCREEN_FADE = Object.freeze({ duration:0.72, color:"paper", easing:"smooth" });
  const CONTENT_FADE = Object.freeze({ duration:0.58 });
  function displayFade(progress) {
    const t=clamp(progress,0,1);
    return t*t*(3-2*t);
  }
  function withDisplayFade(alpha,draw) {
    withCanvasContext(ctx=>{
      ctx.save();ctx.globalAlpha*=clamp(alpha,0,1);
      draw();
      ctx.restore();
    });
  }
  function languageFadeOverlay(){
    const transition=state.languageTransition;
    if(!transition) return;
    const elapsed=Math.max(0,(performance.now()-transition.started)/1000);
    const half=Math.max(.001,transition.duration*.5);
    if(elapsed>=half && !transition.switched){
      SSE.i18n.set(transition.target||"jp");
      syncDocumentLanguage();
      transition.switched=true;
    }
    if(elapsed>=transition.duration){
      state.languageTransition=null;
      return;
    }
    const alpha=elapsed<half
      ?displayFade(elapsed/half)
      :1-displayFade((elapsed-half)/half);
    fill(C.paper[0],C.paper[1],C.paper[2],Math.round(alpha*255));
    noStroke();rect(0,0,360,640);
  }
  function go(scene,fade = true) {
    resetGesture();
    SSE.app.replace(scene,null,fade ? SCREEN_FADE : {duration:0});
  }
  const BGM_LEVELS = Object.freeze({
    setup:0.045,
    prep:0.085,
    brew:0.145,
    finish:0.17,
  });
  const FINISH_BGM_BREAK = Object.freeze({
    dropSeconds:0.20,
    holdSeconds:0.50,
    riseSeconds:2.50,
    lowLevel:0.035,
  });
  const BGM_FADE_TAU = 1.10;
  const bgm = {
    audio:null,
    ctx:null,
    source:null,
    gain:null,
    scene:"setup",
    level:0,
    unlocked:false,
    hidden:false,
    finishBreak:null,
    init(){
      if(this.audio || typeof root.Audio!=="function") return;
      const audio=new root.Audio("./assets/audio/CoffeeFactory.mp3");
      audio.preload="auto";
      audio.loop=true;
      // Keep the media element at unity gain. Scene volume is applied through Web Audio
      // so iPhone/iOS does not depend on HTMLMediaElement.volume support.
      audio.volume=1;
      audio.playsInline=true;
      this.audio=audio;
      const AudioContextClass=root.AudioContext||root.webkitAudioContext;
      if(!AudioContextClass) return;
      try{
        this.ctx=new AudioContextClass();
        this.source=this.ctx.createMediaElementSource(audio);
        this.gain=this.ctx.createGain();
        this.gain.gain.value=0;
        this.source.connect(this.gain);
        this.gain.connect(this.ctx.destination);
      }catch(_){
        this.ctx=null;
        this.source=null;
        this.gain=null;
      }
    },
    applyLevel(value){
      const level=clamp(value,0,1);
      if(this.gain){
        this.gain.gain.value=level;
      }else if(this.audio){
        // Desktop/legacy fallback when Web Audio is unavailable.
        this.audio.volume=level;
      }
    },
    resumeContext(){
      if(!this.ctx || this.ctx.state!=="suspended") return;
      try{
        const promise=this.ctx.resume();
        if(promise?.catch) promise.catch(()=>{});
      }catch(_){}
    },
    target(){
      if(!this.unlocked || this.hidden || !SSE.audio.enabled) return 0;
      return BGM_LEVELS[this.scene] ?? BGM_LEVELS.setup;
    },
    ensurePlaying(){
      this.init();
      if(!this.audio || !this.unlocked || this.hidden || !SSE.audio.enabled) return;
      this.resumeContext();
      if(!this.audio.paused) return;
      try{
        const promise=this.audio.play();
        if(promise?.catch) promise.catch(()=>{});
      }catch(_){}
    },
    userGesture(){
      this.unlocked=true;
      this.init();
      this.resumeContext();
      this.ensurePlaying();
    },
    setScene(scene){
      this.scene=BGM_LEVELS[scene]===undefined?"setup":scene;
      this.ensurePlaying();
    },
    beginFinishBreak(playCompletionCue=true){
      this.finishBreak={
        elapsed:0,
        from:this.level,
        cuePending:!!playCompletionCue,
      };
      this.ensurePlaying();
    },
    setEnabled(value){
      if(value){
        this.unlocked=true;
        this.level=0;
        this.applyLevel(0);
        this.resumeContext();
        this.ensurePlaying();
        return;
      }
      this.level=0;
      this.applyLevel(0);
      if(this.audio) this.audio.pause();
    },
    setHidden(value){
      this.hidden=!!value;
      if(this.hidden){
        if(this.audio) this.audio.pause();
        this.level=0;
        this.applyLevel(0);
      }else{
        this.resumeContext();
        this.ensurePlaying();
      }
    },
    update(dt){
      this.init();
      if(!this.audio) return;
      const step=Math.max(0,Number.isFinite(dt)?dt:0);
      const active=this.unlocked && !this.hidden && SSE.audio.enabled;
      if(this.finishBreak){
        const b=this.finishBreak;
        const cfg=FINISH_BGM_BREAK;
        b.elapsed+=step;
        if(b.cuePending && b.elapsed>=cfg.dropSeconds){
          b.cuePending=false;
          cue("finish");
        }
        const holdEnd=cfg.dropSeconds+cfg.holdSeconds;
        const breakEnd=holdEnd+cfg.riseSeconds;
        if(!active){
          this.level=0;
          this.applyLevel(0);
          if(!this.audio.paused) this.audio.pause();
          if(b.elapsed>=breakEnd) this.finishBreak=null;
          return;
        }
        this.ensurePlaying();
        if(b.elapsed<cfg.dropSeconds){
          const u=clamp(b.elapsed/cfg.dropSeconds,0,1);
          const eased=u*u*(3-2*u);
          this.level=b.from+(cfg.lowLevel-b.from)*eased;
        }else if(b.elapsed<holdEnd){
          this.level=cfg.lowLevel;
        }else if(b.elapsed<breakEnd){
          const u=clamp((b.elapsed-holdEnd)/cfg.riseSeconds,0,1);
          const eased=u*u*(3-2*u);
          this.level=cfg.lowLevel+(BGM_LEVELS.finish-cfg.lowLevel)*eased;
        }else{
          this.level=BGM_LEVELS.finish;
          this.finishBreak=null;
        }
        this.applyLevel(this.level);
        return;
      }
      const target=this.target();
      const tau=target<this.level?0.75:BGM_FADE_TAU;
      const k=1-Math.exp(-step/Math.max(0.001,tau));
      this.level += (target-this.level)*k;
      if(Math.abs(target-this.level)<0.0005) this.level=target;
      this.applyLevel(this.level);
      if(target>0){
        this.ensurePlaying();
      }else if(this.level<0.0015 && !this.audio.paused){
        this.audio.pause();
      }
    },
  };
  const SE_DEFINITIONS = Object.freeze({
    ui_select:{file:"./assets/audio/ui_select.wav",volume:.34,cooldown:45},
    ui_step:{file:"./assets/audio/ui_step.wav",volume:.32,cooldown:35},
    factory_start:{file:"./assets/audio/factory_start.wav",volume:.42,cooldown:160},
    grinder_lever:{file:"./assets/audio/grinder_lever.wav",volume:.38,cooldown:1100},
    steam_soft:{file:"./assets/audio/steam_soft.wav",volume:.22,cooldown:2400},
    brew_ready:{file:"./assets/audio/brew_ready.wav",volume:.48,cooldown:60},
    brew_change:{file:"./assets/audio/brew_change.wav",volume:.62,cooldown:100},
    brew_finish:{file:"./assets/audio/brew_finish.wav",volume:.68,cooldown:200},
  });
  const seAudio = {
    ctx:null, masterGain:null, buffers:Object.create(null), loading:Object.create(null),
    lastPlayed:Object.create(null), unlocked:false, hidden:false, masterVolume:.95,
    init(){
      if(this.ctx) return this.ctx;
      const AudioContextClass=root.AudioContext||root.webkitAudioContext;
      if(!AudioContextClass) return null;
      try{
        this.ctx=new AudioContextClass();
        this.masterGain=this.ctx.createGain();
        this.masterGain.gain.value=SSE.audio.enabled?this.masterVolume:0;
        this.masterGain.connect(this.ctx.destination);
      }catch(_){
        this.ctx=null;this.masterGain=null;return null;
      }
      return this.ctx;
    },
    preload(){
      const ctx=this.init();
      if(!ctx||typeof root.fetch!=="function") return;
      for(const [name,definition] of Object.entries(SE_DEFINITIONS)) this.load(name,definition);
    },
    load(name,definition=SE_DEFINITIONS[name]){
      if(!definition?.file||this.buffers[name]||this.loading[name]) return this.loading[name]||null;
      const ctx=this.init();
      if(!ctx||typeof root.fetch!=="function") return null;
      const task=root.fetch(definition.file,{cache:"force-cache"})
        .then(response=>{if(!response.ok) throw new Error("SE fetch failed: "+name);return response.arrayBuffer();})
        .then(data=>ctx.decodeAudioData(data.slice(0)))
        .then(buffer=>{this.buffers[name]=buffer;return buffer;})
        .catch(()=>null)
        .finally(()=>{delete this.loading[name];});
      this.loading[name]=task;
      return task;
    },
    unlock(){
      const ctx=this.init();
      if(!ctx) return;
      this.unlocked=true;
      if(ctx.state==="suspended") ctx.resume().catch(()=>{});
      this.syncGain(true);
    },
    syncGain(immediate=false){
      if(!this.ctx||!this.masterGain) return;
      const value=(!this.hidden&&SSE.audio.enabled)?this.masterVolume:0;
      const gain=this.masterGain.gain;
      const now=this.ctx.currentTime;
      gain.cancelScheduledValues(now);
      if(immediate) gain.setValueAtTime(value,now);
      else {
        gain.setValueAtTime(gain.value,now);
        gain.linearRampToValueAtTime(value,now+.08);
      }
    },
    setEnabled(){this.syncGain(false);},
    setHidden(value){this.hidden=!!value;this.syncGain(false);},
    play(name,options=null){
      if(this.hidden||!SSE.audio.enabled) return false;
      const definition=SE_DEFINITIONS[name];
      if(!definition) return false;
      const ctx=this.init();
      if(!ctx||!this.masterGain) return false;
      if(!this.unlocked) this.unlock();
      const opts=options||{};
      const cooldown=Number(opts.cooldown??definition.cooldown??80);
      const nowMs=performance.now();
      if(!opts.force&&this.lastPlayed[name]&&nowMs-this.lastPlayed[name]<cooldown) return false;
      const buffer=this.buffers[name];
      if(!buffer){this.load(name,definition);return false;}
      this.lastPlayed[name]=nowMs;
      try{
        const source=ctx.createBufferSource();
        const gain=ctx.createGain();
        source.buffer=buffer;
        source.playbackRate.value=clamp(Number(opts.playbackRate??definition.playbackRate??1),.25,4);
        gain.gain.value=clamp(Number(opts.volume??definition.volume??.25),0,1);
        source.connect(gain);gain.connect(this.masterGain);
        source.start(0);
        source.onended=()=>{try{source.disconnect();gain.disconnect();}catch(_){}};
        return true;
      }catch(_){return false;}
    },
  };
  function playSE(name,options=null) {
    if(document.hidden) return false;
    return seAudio.play(name,options||undefined);
  }
  function cue(kind) {
    if(kind==="finish") return playSE("brew_finish",{force:true});
    if(kind==="wait") return playSE("brew_change",{playbackRate:.94});
    return playSE("brew_change",{playbackRate:1.06});
  }
  function saveSetupSettings(){
    try{
      root.localStorage?.setItem(SETUP_STORAGE_KEY,JSON.stringify({
        cupPreset:state.settings.cupPreset,
        beanGrams:state.settings.beanGrams,
        roast:state.settings.roast,
      }));
    }catch(_){}
  }
  function selectCupPreset(count){
    if(state.settings.cupPreset!==count){
      playSE("ui_select");
      state.settings.cupPreset=count;
      state.settings.beanGrams=count===2?25:15;
    }
    saveSetupSettings();
  }
  function adjustBeanGrams(delta){
    const before=state.settings.beanGrams;
    state.settings.beanGrams=clamp(state.settings.beanGrams+delta,5,40);
    if(state.settings.beanGrams!==before) playSE("ui_step",{playbackRate:delta>0?1.08:.94});
    saveSetupSettings();
  }
  function selectRoast(value){
    if(state.settings.roast!==value) playSE("ui_select");
    state.settings.roast=value;
    saveSetupSettings();
  }
  function confirmPlan() {
    // v1 exposes one guided method. Keep future-capable core fields deterministic.
    state.settings.recipeMode = "kasuya";
    state.settings.grind = "Coarse";
    saveSetupSettings();
    state.plan = createPlan(state.settings);
    state.clock = null; state.sample = null;
    playSE("factory_start",{force:true});
    go("prep");
  }
  function startBrew() {
    // Enter Brew softly, then give the user three full seconds to move from the
    // phone to the kettle. RecipeClock stays paused until the countdown ends.
    state.clock = new RecipeClock(state.plan);
    state.clock.pause();
    state.sample = state.clock.snapshot(); state.previousSample = state.sample;
    state.lastSampleMono = performance.now(); state.suppressCue = true; state.finishing = false;
    state.brewStarting = true; state.brewCountdown = 3; state.brewCountdownDelay = .18; state.brewUiFade = 0; state.brewReadySoundStep = 0;
    playSE("factory_start",{force:true,playbackRate:1.04});
    go("brew");
  }
  function refreshBrew(context,allowCue = true) {
    const sample = state.clock.snapshot(), old = state.previousSample;
    const now = performance.now();
    const timely = now-state.lastSampleMono <= 1500;
    const audible = allowCue && timely && !state.suppressCue && !document.hidden && !sample.paused;
    state.sample = sample;
    if(old&&sample.status!==old.status&&audible){
      if(sample.status==="POUR"){
        cue("pour"); state.pulse=1;
        context?.motion.to(state,{pulse:0},0.25,"linear");
      }else if(sample.status==="WAIT"){
        cue("wait");
      }
    }
    state.previousSample = sample; state.lastSampleMono = now; state.suppressCue = false;
    if (sample.status === "COMPLETE" && !state.finishing) {
      state.finishing = true;
      bgm.beginFinishBreak(audible);
      go("finish");
    }
  }
  function pauseResume() {
    if(state.brewStarting) return;
    // Reconcile a long gap before applying a user action to an expired brew.
    refreshBrew(null,false);
    if (state.finishing) return;
    if (state.clock.paused) state.clock.resume(); else state.clock.pause();
    playSE("ui_select",{playbackRate:state.clock.paused ? .94 : 1.06});
    state.sample = state.clock.snapshot(); state.previousSample = state.sample;
    resetGesture();
  }
  function movePour(direction) {
    if(state.brewStarting) return;
    refreshBrew(null,false);
    if (state.finishing) return;
    const s=state.clock.snapshot();
    if (s.index+direction<0 || s.index+direction>=state.plan.pours.length) return;
    state.sample = state.clock.move(direction); state.previousSample = state.sample;
    state.lastSampleMono = performance.now(); state.pulse=0;
    playSE("ui_select",{playbackRate:direction>0?1.06:.94});
    resetGesture();
  }
  const BREW_AREA = {x:70,y:188,w:220,h:205};
  function touchHandler(t,withBrew = false) {
    if(state.languageTransition) return true;
    if (t.state === BEGAN) {
      bgm.userGesture();
      seAudio.unlock();
      const langChoice=languageChoice(t);
      if(langChoice){
        state.gesture={id:"languageToggle",target:langChoice,x:t.x,y:t.y,pointer:t.id,cancelled:false};
        return true;
      }
      const b = state.buttons.find(b=>!b.disabled && SSE.ui.hit(t,b.bounds));
      state.gesture = b ? {id:b.id, x:t.x,y:t.y, pointer:t.id,cancelled:false}
        : withBrew && SSE.ui.hit(t,BREW_AREA) ? {id:"gauge",x:t.x,y:t.y,pointer:t.id,cancelled:false} : null;
      return true;
    }
    const g = state.gesture;
    if (!g || t.id !== g.pointer) return true;
    const dx=t.x-g.x,dy=t.y-g.y;
    if (t.state === CANCELLED) { resetGesture(); return true; }
    if (t.state === MOVING) {
      if (g.id !== "gauge" && Math.hypot(dx,dy)>10) g.cancelled = true;
      if (g.id === "gauge") {
        if (Math.abs(dy)>26 && Math.abs(dy)>Math.abs(dx)) g.cancelled=true;
        if (!g.cancelled && Math.abs(dx)>=52 && Math.abs(dx)>Math.abs(dy)*1.5 && SSE.ui.hit(t,BREW_AREA)) {
          resetGesture(); movePour(dx>0?1:-1); return true;
        }
        if (Math.hypot(dx,dy)>12) g.moved=true;
      }
      return true;
    }
    if (t.state === ENDED) {
      resetGesture();
      if (g.cancelled) return true;
      if (g.id === "gauge") {
        if (!g.moved && Math.hypot(dx,dy)<=12 && SSE.ui.hit(t,BREW_AREA)) pauseResume();
      } else if(g.id === "languageToggle") {
        const choice=languageChoice(t);
        if(Math.hypot(dx,dy)<=10 && choice && choice===g.target) selectLanguage(choice);
      } else {
        const b=state.buttons.find(b=>b.id===g.id && !b.disabled);
        if (b && Math.hypot(dx,dy)<=10 && SSE.ui.hit(t,b.bounds)) b.action();
      }
    }
    return true;
  }
  const setupScene = {
    opaque:true,
    enter() { resetGesture(); state.clock=null; state.prepClock=null; factoryView?.reset("setup"); bgm.setScene("setup"); },
    update(dt) { bgm.update(dt); factoryView?.update("setup",dt); },
    draw() {
      base(); chrome(); decoration("setup");
      // Setup is the order desk: the picture tells the story, the top summary tells the order.
      const plan=createPlan(state.settings);
      setupSummary(plan);
      // Four evenly paced decision rows: cups, beans, roast, continue.
      cupChoiceButton("cup1",1,28,240,149,38,()=>selectCupPreset(1),state.settings.cupPreset===1);
      cupChoiceButton("cup2",2,183,240,149,38,()=>selectCupPreset(2),state.settings.cupPreset===2);

      button("minus","−",38,184,42,30,()=>adjustBeanGrams(-1),{disabled:state.settings.beanGrams<=5,size:23,textOnly:true,subtle:true});
      drawSetupIcon(SETUP_ICONS.beans,143,199,21,24);
      label(state.settings.beanGrams+"g",202,198,28,CENTER,"ink");
      button("plus","+",280,184,42,30,()=>adjustBeanGrams(1),{disabled:state.settings.beanGrams>=40,size:23,textOnly:true,subtle:true});

      segmented("roast",["Light","Medium","Dark"],state.settings.roast,118,selectRoast,roastLabel);
      button("prepare",tr("prepare"),28,50,304,42,confirmPlan,{primary:true,size:16});
      languageFadeOverlay();
    },
    touch(t) { return touchHandler(t); },
    leave:resetGesture,
  };
  const prepScene = {
    opaque:true,
    enter() {
      resetGesture();
      state.prepClock=null;
      factoryView?.reset("prep");
      bgm.setScene("prep");
    },
    update(dt) { bgm.update(dt); factoryView?.update("prep",dt); },
    draw() {
      base(); chrome(); decoration("prep");
      const p=state.plan;

      // Prep is an action screen, not another settings screen.
      // Keep the same typographic hierarchy as Setup: small context, one large value,
      // then only the minimum instructions needed before brewing.
      label(tr("prepTemp"),180,590,13,CENTER,"muted");
      label(p.recommendedTemperature+"℃",180,550,48,CENTER,"ink");

      label(tr("prepInstruction"),180,207,14,CENTER,"ink");
      label(p.beanGrams+"g → "+p.totalWater+"g ・ "+tr("prepGrind"),180,181,13,CENTER,"muted");

      button("start",tr("start"),28,106,304,42,startBrew,{primary:true,size:16});
      button("back",tr("back"),70,42,220,34,()=>go("setup"),{textOnly:true,size:13});
      languageFadeOverlay();
    },
    touch(t) { return touchHandler(t); },
    leave:resetGesture,
  };
  const brewScene = {
    opaque:true,
    enter(context) {
      resetGesture();
      factoryView?.reset("brew");
      state.pulse=0;
      if(!state.brewStarting) state.brewUiFade=1;
      bgm.setScene("brew");
    },
    update(dt,context) {
      bgm.update(dt);
      if(state.brewStarting){
        // The factory is already visible, but workers and RecipeClock remain still.
        factoryView?.update("brew",dt);
        if(state.brewCountdownDelay>0){
          state.brewCountdownDelay=Math.max(0,state.brewCountdownDelay-dt);
          return;
        }
        state.brewCountdown=Math.max(0,state.brewCountdown-dt);
        const readyStep=Math.min(3,Math.floor(Math.max(0,3-state.brewCountdown)+.5));
        while(state.brewReadySoundStep<readyStep){
          state.brewReadySoundStep+=1;
          playSE("brew_ready",{force:true,playbackRate:1+(state.brewReadySoundStep-2)*.06});
        }
        if(state.brewCountdown<=0){
          state.brewStarting=false;
          state.brewUiFade=0;
          state.clock.resume();
          state.sample=state.clock.snapshot(); state.previousSample=state.sample;
          state.lastSampleMono=performance.now(); state.suppressCue=false;
          cue("pour"); state.pulse=1;
          context?.motion.to(state,{pulse:0},0.25,"linear");
        }
        return;
      }
      state.brewUiFade=Math.min(1,state.brewUiFade+dt/CONTENT_FADE.duration);
      refreshBrew(context);
      factoryView?.update("brew",dt);
    },
    draw() {
      base(); chrome(); decoration("brew");
      const p=state.plan,s=state.sample;
      const starting=state.brewStarting;
      const pouring=s.status==="POUR";
      const waiting=s.status==="WAIT";
      const finishing=s.status==="FINISHING";
      const phaseLabel=pouring?tr("phasePour"):waiting?tr("phaseWait"):finishing?tr("phaseFinish"):tr("phaseDone");
      const totalRemaining=Math.max(0,p.totalDuration-s.time);

      if(starting){
        // Fade the ready cue away during the final part of the countdown, rather
        // than replacing it abruptly with the brew UI.
        const readyAlpha=displayFade(state.brewCountdown/CONTENT_FADE.duration);
        withDisplayFade(readyAlpha,()=>{
          label(tr("brewReady"),180,579,15,CENTER,"ink");
          const readyElapsed=Math.max(0,3-state.brewCountdown);
          brewReadyLamps(180,539,readyElapsed);
        });
      }else{
        // All brew information enters as one composition. The factory itself keeps
        // moving underneath, while text, gauge and controls share one fade.
        const uiAlpha=displayFade(state.brewUiFade);
        withDisplayFade(uiAlpha,()=>{
          label(tr("brewRemaining"),180,598,12,CENTER,"muted");
          fixedClockLabel(clockText(totalRemaining,true),180,561,42,"ink");
          label(s.pourNumber+" / "+p.pours.length+" ・ "+phaseLabel,180,522,13,CENTER,"muted");

          brewSegmentRing(180,252,70,p.pours.length,s.index,s.progress,s.status);
          if(pouring){
            label(s.remainingSeconds,180,267,58,CENTER,"ink");
            label(SSE.i18n.language==="jp"?s.grams+"g 注ぐ":"Pour "+s.grams+"g",180,218,17,CENTER,"muted");
          }else{
            label(s.remainingSeconds,180,280,22,CENTER,"muted");
            const phaseStart=p.pours[s.index].startTime+p.pours[s.index].duration;
            const phaseElapsed=Math.max(0,s.time-phaseStart);
            hourglassIcon(180,236,1.05,hourglassFlipRotation(phaseElapsed));
          }
          if(s.paused)pauseGlyph(180,305,.5,"ink");

          label(pouring?(SSE.i18n.language==="jp"?s.cumulativeGrams+"gまで":"to "+s.cumulativeGrams+"g"):(SSE.i18n.language==="jp"?"ここまで "+s.cumulativeGrams+"g":s.cumulativeGrams+"g so far"),180,157,16,CENTER,"muted");

          button("prev","‹",28,28,83,42,()=>movePour(-1),{disabled:s.index===0,textOnly:true,size:34});
          button("pause",s.paused?tr("resume"):tr("pause"),117,28,126,42,pauseResume,{size:15});
          button("next","›",249,28,83,42,()=>movePour(1),{disabled:s.index===p.pours.length-1,textOnly:true,size:34});
        });
      }
      languageFadeOverlay();
    },
    touch(t) {
      if(!state.brewStarting && state.brewUiFade<1) return true;
      return touchHandler(t,true);
    },
    leave:resetGesture,
  };
  const finishScene = {
    opaque:true,
    enter(context) { resetGesture(); factoryView?.reset("finish"); state.cupLift=-6; bgm.setScene("finish"); context.motion.to(state,{cupLift:0},0.24,"sineOut"); },
    update(dt) { bgm.update(dt); factoryView?.update("finish",dt); },
    draw() {
      base(); chrome(); decoration("finish");
      const p=state.plan;
      label(p.cupPreset===2?tr("finishTwo"):tr("finishOne"),180,247,28,CENTER,"ink");
      label(tr("finishTime")+" "+clockText(p.totalDuration).replace(/^0/,""),180,211,17,CENTER,"muted");
      button("again",tr("again"),28,84,304,42,()=>go("prep"),{primary:true,size:16});
      button("setup",tr("back"),70,30,220,34,()=>go("setup"),{textOnly:true,size:13});
      languageFadeOverlay();
    },
    touch(t) { return touchHandler(t); },
    leave:resetGesture,
  };
  function lifecycle(hidden) {
    resetGesture();
    for(const c of [state.clock,state.prepClock]) if(c) c.setHidden(hidden);
    bgm.setHidden(hidden);
    seAudio.setHidden(hidden);
    state.suppressCue=true;
  }
  SSE.createApp({
    id:"coffeefactory",logicalWidth:360,logicalHeight:640,initialScene:"setup",debug:false,
    outerBackground:"paper",sceneBackground:"paper",
    theme:{colors:{paper:C.paper},motion:{scene:SCREEN_FADE.duration}},
    i18n:{defaultLanguage:"jp",storageKey:"coffeefactory.v1.language",text:TEXT},
    analytics:{enabled:false},
    audio:{
      masterVolume:.72,
      storageKey:"coffeefactory.v1.sound",
      sounds:{},
    },
    setup() {
      syncDocumentLanguage();
      seAudio.preload();
      document.addEventListener("visibilitychange",()=>lifecycle(document.hidden));
      root.addEventListener("pagehide",()=>lifecycle(true));
      root.addEventListener("pageshow",()=>lifecycle(document.hidden));
      root.addEventListener("blur",resetGesture);
      root.addEventListener("resize",resetGesture);
    },
    scenes:{setup:setupScene,prep:prepScene,brew:brewScene,finish:finishScene},
  });
})(typeof window !== "undefined" ? window : globalThis);
