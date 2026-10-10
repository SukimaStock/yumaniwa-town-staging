/* Presentation states only; the adopted fixed-step WORLD LOOP kernel is immutable. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./physics.js'):root.FruitLabPhysics,
    typeof module==='object'&&module.exports?require('./world.js'):root.FruitLabWorld,
    typeof module==='object'&&module.exports?require('./courses.js'):root.FruitLabCourses,
    typeof module==='object'&&module.exports?require('./prologue.js'):root.PumpokoPrologue,
    typeof module==='object'&&module.exports?require('./title-draw.js'):root.PumpokoTitleArt);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PumpokoStory=api;
})(typeof window!=='undefined'?window:globalThis,function(P,W,C,D,T){
  'use strict';
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const blend=(a,b,t)=>Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*t]));
  const follow=s=>({x:s.world.camera.x+s.look,y:s.world.camera.y,z:.8});
  const OPENING_DURATION=4.3;
  function create(){
    const world=W.createCourse(C.get('world4')),prologue=D.create();prologue.looseAt=null;
    return {world,prologue,phase:'title',elapsed:0,slow:0,look:0,returnTitle:false,
      view:{x:world.pumpkin.x,y:world.pumpkin.y+70,z:.8},opening:null,nursery:null,ending:null};
  }
  // The existing keyboard/start accessibility action touches the shell, never
  // bypasses seed detachment. Pointer dragging uses the original vessel model.
  function start(s){
    if(s.phase!=='title')return false;
    D.knock(s.prologue,70,-35);return true;
  }
  function beginJourney(s){
    if(s.phase!=='title')return false;
    if(s.returnTitle)s.world=W.createCourse(C.get('world4'));
    s.phase='opening';s.elapsed=0;s.slow=0;s.look=0;
    const b=s.world.pumpkin,from={x:b.x-70,y:b.y+250,z:.8};
    const plants=[{id:0,x:b.x-168,scale:.63},{id:1,x:b.x-97,scale:.72},
      {id:2,x:b.x,scale:1,hero:true}].map(p=>({...p,
        ground:W.surfaceHeight(p.x,s.world.course),
        y:p.hero?b.y:W.surfaceHeight(p.x,s.world.course)+33*p.scale,
        angle:0}));
    const seeds=s.prologue.seeds.map((p,i)=>{
      const origin=T.seedPose(s.prologue,p),plant=plants[Math.floor(i/3)];
      return {id:i,plant:plant.id,origin:{x:from.x+(origin.x-195)/from.z,
        y:from.y+(origin.y-400)/from.z,angle:origin.angle,sx:origin.sx/from.z,sy:origin.sy/from.z},
        x:plant.x+(i%3-1)*9,y:W.surfaceHeight(plant.x+(i%3-1)*9,s.world.course)+3,
        depart:.08+i*.025,land:1.35+i*.045};
    });
    s.opening={progress:0,from,to:follow(s),shell:{...s.prologue}};
    s.nursery={plants,seeds,time:0};s.view={...from};
    s.returnTitle=false;s.ending=null;D.release(s.prologue);return true;
  }
  function nurseryPoses(s) {
    if(!s.nursery)return null;
    const time=s.nursery.time;
    return {seeds:s.nursery.seeds.map(p=>{
      const u=Math.max(0,Math.min(1,(time-p.depart)/(p.land-p.depart))),after=Math.max(0,time-p.land);
      return {...p,x:p.origin.x+(p.x-p.origin.x)*smooth(u),
        y:p.origin.y+(p.y-p.origin.y)*u*u+3*Math.sin(Math.min(1,after/.25)*Math.PI)*Math.exp(-after*8),
        angle:p.origin.angle+smooth(u)*.35,alpha:1-smooth(after/.5),
        sx:p.origin.sx+(.65-p.origin.sx)*smooth(u),sy:p.origin.sy+(.65-p.origin.sy)*smooth(u)};
    }),plants:s.nursery.plants.map(p=>{
      const landed=Math.max(...s.nursery.seeds.filter(seed=>seed.plant===p.id).map(seed=>seed.land));
      const age=time-landed;
      return {...p,leaves:smooth(age/.6),grow:smooth((age-.3)/1.45)};
    })};
  }
  function pair(s){
    const a=s.world.pumpkin,b=s.world.holes.at(-1).occupant;
    const z=Math.min(.8,310/(Math.abs(a.x-b.x)+180),520/(Math.abs(a.y-b.y)+160));
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2+25,z};
  }
  function update(s,axis,dt){
    dt=Math.max(0,Math.min(.05,Number(dt)||0));
    if(s.phase==='title'){
      if(!s.prologue.held){s.prologue.targetX=axis*.38;s.prologue.targetY=0;}
      D.update(s.prologue,dt);
      if(D.allLoose(s.prologue)){
        if(s.prologue.looseAt===null)s.prologue.looseAt=s.prologue.time;
        if(s.prologue.time-s.prologue.looseAt>=.55){beginJourney(s);return [];}
      }
      return s.prologue.detachments.map(()=>({type:'detach'}));
    }
    s.elapsed+=dt;
    if(s.phase==='opening'){
      s.nursery.time=s.elapsed;s.opening.progress=smooth(s.elapsed/OPENING_DURATION);
      s.view=blend(s.opening.from,s.opening.to,smooth((s.elapsed-2.4)/1.9));
      // Reveal the existing body at full size before handing over. Its natural
      // initial slope supplies the first roll once normal play resumes.
      if(s.elapsed>=OPENING_DURATION){s.phase='playing';s.elapsed=0;s.opening=null;s.view=follow(s);}
      return [];
    }
    const controlled=s.phase==='playing'||s.phase==='coast';
    P.input(s.world,controlled?axis:0);const events=W.update(s.world,dt);
    if(s.phase==='playing'&&s.world.finished){s.phase='coast';s.elapsed=0;}
    if(s.phase==='coast'){
      const b=s.world.pumpkin;
      s.slow=!axis&&Math.abs(s.world.axis)<.1&&b.grounded&&Math.hypot(b.vx,b.vy)<35?s.slow+dt:0;
      if(s.elapsed>=1.8&&s.slow>=.4){s.phase='ending';s.elapsed=0;s.ending={from:{...s.view},target:pair(s),velocity:{x:s.world.camera.vx,y:s.world.camera.vy},hero:null};}
    }
    if(s.phase==='playing'||s.phase==='coast'){
      // Velocity anticipation is low-pass filtered and never modifies the model
      // camera, input, constants or plug transfers. Its range stays within view.
      const target=Math.max(-55,Math.min(55,s.world[s.world.active].vx*.12));
      s.look+=(target-s.look)*(1-Math.exp(-dt*3));s.view=follow(s);
    }else if(s.phase==='ending'){
      s.ending.target=blend(s.ending.target,pair(s),1-Math.exp(-dt*2));
      s.view=blend(s.ending.from,s.ending.target,smooth(s.elapsed/6));
      for(const key of ['x','y'])s.view[key]+=s.ending.velocity[key]*s.elapsed*Math.exp(-s.elapsed*2)*(1-smooth(s.elapsed/6));
      if(s.elapsed>=11){s.phase='returning';s.elapsed=0;s.ending.hero={from:{...s.view},offset:{x:(s.world.pumpkin.x-s.view.x)*s.view.z,y:(s.world.pumpkin.y-s.view.y)*s.view.z}};s.prologue=D.create();s.prologue.looseAt=null;P.clearInput(s.world);}
    }else if(s.phase==='returning'){
      const b=s.world.pumpkin,h=s.ending.hero,t=smooth(s.elapsed/3.6);
      // Interpolate projected subject placement while zooming, so an initially
      // off-centre hero cannot be magnified outside the portrait before recentering.
      const z=h.from.z+(3.325-h.from.z)*t;
      s.view={x:b.x-h.offset.x*(1-t)/z,y:b.y-(h.offset.y*(1-t)-25*t)/z,z};
      if(s.elapsed>=3.6){s.phase='title';s.returnTitle=true;s.elapsed=0;P.clearInput(s.world);}
    }
    return events;
  }
  function openingMix(s){return s.opening?s.opening.progress:1;}
  function returnMix(s){return s.phase==='returning'?smooth((s.elapsed-2.1)/1.5):s.phase==='title'?1:0;}
  return {create,start,beginJourney,update,pair,openingMix,returnMix,smooth,nurseryPoses,OPENING_DURATION};
});
