/* Presentation states only; the adopted fixed-step WORLD LOOP kernel is immutable. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./physics.js'):root.FruitLabPhysics,
    typeof module==='object'&&module.exports?require('./world.js'):root.FruitLabWorld,
    typeof module==='object'&&module.exports?require('./courses.js'):root.FruitLabCourses,
    typeof module==='object'&&module.exports?require('./prologue.js'):root.PumpokoPrologue);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PumpokoStory=api;
})(typeof window!=='undefined'?window:globalThis,function(P,W,C,D){
  'use strict';
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const blend=(a,b,t)=>Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*t]));
  const follow=s=>({x:s.world.camera.x+s.look,y:s.world.camera.y,z:.8});
  function create(){
    const world=W.createCourse(C.get('world4')),prologue=D.create();prologue.looseAt=null;
    return {world,prologue,phase:'title',elapsed:0,slow:0,look:0,returnTitle:false,
      view:{x:world.pumpkin.x,y:world.pumpkin.y+70,z:.8},opening:null,ending:null};
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
    s.view=follow(s);s.phase='opening';s.elapsed=0;s.slow=0;s.look=0;
    s.opening={progress:0};s.returnTitle=false;s.ending=null;D.release(s.prologue);return true;
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
        if(s.prologue.time-s.prologue.looseAt>=1.8){beginJourney(s);return [];}
      }
      return s.prologue.detachments.map(()=>({type:'detach'}));
    }
    s.elapsed+=dt;
    if(s.phase==='opening'){
      D.update(s.prologue,dt);s.opening.progress=smooth(s.elapsed/3.2);
      if(s.elapsed>=3.2){s.phase='playing';s.elapsed=0;s.opening=null;}
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
  return {create,start,beginJourney,update,pair,openingMix,returnMix,smooth};
});
