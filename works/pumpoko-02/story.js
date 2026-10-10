/* Presentation states only; the adopted fixed-step WORLD LOOP kernel is immutable. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./physics.js'):root.FruitLabPhysics,
    typeof module==='object'&&module.exports?require('./world.js'):root.FruitLabWorld,
    typeof module==='object'&&module.exports?require('./courses.js'):root.FruitLabCourses,
    typeof module==='object'&&module.exports?require('./prologue.js'):root.PumpokoPrologue,
    typeof module==='object'&&module.exports?require('./opening.js'):root.PumpokoOpening);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PumpokoStory=api;
})(typeof window!=='undefined'?window:globalThis,function(P,W,C,D,O){
  'use strict';
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const blend=(a,b,t)=>Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*t]));
  const follow=s=>({x:s.world.camera.x+s.look,y:s.world.camera.y,z:.8});
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
    D.release(s.prologue);
    const opening=O.create(s.prologue,s.world);
    s.opening=opening;s.nursery={plants:[],time:opening.time,fall:opening};s.bridge=null;
    s.view=O.frame(opening);s.returnTitle=false;s.ending=null;return true;
  }
  function openingFrame(s){
    if(!s.opening)return null;
    const f=O.frame(s.opening);
    if(s.bridge){
      const t=smooth((s.opening.time-s.bridge.at)/1.25),target=follow(s),q=f.screen;
      f.screen={x:q.x+(195-q.x)*t,y:q.y+(400-q.y)*t,angle:q.angle*(1-t),
        sx:q.sx+(.8-q.sx)*t,sy:q.sy+(.8-q.sy)*t,camera:blend({...q.camera,z:0},{...target,z:0},t)};
      f.backgroundMix=t;f.z=f.screen.sx;
      f.x=f.screen.camera.x+(195-f.screen.x)/f.screen.sx;
      f.y=f.screen.camera.y+(400-f.screen.y)/f.screen.sy;
    }
    return f;
  }
  function rootPlants(s){
    const fall=s.nursery.fall;
    for(const a of fall.arrivalEvents){
      const root=fall.geometry.worldPoint({x:a.x,y:a.rootY}),scale=(.95+a.id%3*.025)*.62;
      s.nursery.plants.push({id:a.id,x:root.x,ground:root.y,y:root.y+36*scale,scale,hero:false,at:a.at,
        arrival:{id:a.id,x:a.x,y:a.y,rootY:a.rootY,at:a.at}});
    }
    if(!fall.transition.settled||s.nursery.plants.some(p=>p.hero)||!s.nursery.plants.length)return;
    // Choose from observed roots, favouring a downhill that can start the
    // normal zero-input roll. This selection never changes a seed trajectory.
    const plant=s.nursery.plants.find(p=>W.curve('surface',p.x,s.world.course).slope<-.05)||s.nursery.plants[0];
    plant.hero=true;plant.scale=1;
    // Seat the existing body at that root before any fruit is visible. Solve
    // only height for the unchanged contact circle; the root's x stays exact.
    const b=s.world.pumpkin;b.x=plant.x;b.y=plant.ground+b.r;b.artId=plant.id;
    for(let i=0;i<16;i++){
      const f=W.contact(b,s.world.course);b.y+=(b.r-f.distance)/f.ny;
    }
    plant.y=b.y;
    Object.assign(s.world.camera,{x:b.x,y:b.y+70,vx:0,vy:0});
  }
  function nurseryPoses(s){
    if(!s.nursery)return null;
    const time=s.nursery.time,opening=s.nursery.fall;
    return {opening:s.phase==='opening',seeds:opening?opening.seeds.map(p=>{
      const w=opening.geometry.worldPoint(p),age=p.arrival?time-p.arrival.at-.9:-1;
      const landing=p.entryLandedAt==null?-1:time-p.entryLandedAt;
      if(landing>0&&landing<.20&&!p.lost)w.y+=O.UNITS*1.2*Math.sin(Math.PI*landing/.20)**2;
      return {id:p.runId,...w,angle:-p.angle,alpha:p.inactive?0:1-smooth(age/.6),sx:O.UNITS,sy:O.UNITS*p.roll};
    }):[],plants:s.nursery.plants.map(p=>{
      const age=time-p.at-.9;
      return {...p,sprout:smooth(age/.65),leaves:smooth((age-.5)/.85),grow:O.fruitGrowth(age)};
    })};
  }
  function pair(s){
    const a=s.world.pumpkin,b=s.world.holes.at(-1).occupant;
    const z=Math.min(.8,310/(Math.abs(a.x-b.x)+180),520/(Math.abs(a.y-b.y)+160));
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2+25,z};
  }
  function finalShot(s){
    return {from:{...s.view},target:pair(s),velocity:{x:s.world.camera.vx,y:s.world.camera.vy},
      time:0,settledAt:null,bounds:{left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity},hero:null};
  }
  function shotView(s,dt){
    const shot=s.ending;shot.time+=dt;
    if(shot.settledAt!==null){s.view={...shot.target};return;}
    // Accumulate the REAL travel during deceleration. The shot can widen but
    // never breathe in and out as the pumpkin rolls back through the valley.
    const bounds=shot.bounds;
    for(const b of [s.world.pumpkin,s.world.holes.at(-1).occupant]){
      bounds.left=Math.min(bounds.left,b.x);bounds.right=Math.max(bounds.right,b.x);
      bounds.bottom=Math.min(bounds.bottom,b.y);bounds.top=Math.max(bounds.top,b.y);
    }
    shot.target={x:(bounds.left+bounds.right)/2,y:(bounds.bottom+bounds.top)/2+25,
      z:Math.min(.8,310/(bounds.right-bounds.left+180),520/(bounds.top-bounds.bottom+160))};
    const t=smooth(shot.time/6);s.view=blend(shot.from,shot.target,t);
    for(const key of ['x','y'])s.view[key]+=shot.velocity[key]*shot.time*Math.exp(-shot.time*2)*(1-t);
    // Camera travel overlaps coast. Start the quiet hold only when BOTH the
    // existing natural slow condition and the six-second shot have completed.
    if(s.phase==='ending'&&shot.time>=6)shot.settledAt=shot.time;
  }
  function update(s,axis,dt){
    dt=Math.max(0,Math.min(.05,Number(dt)||0));
    if(s.phase==='title'){
      if(!s.prologue.held){s.prologue.targetX=axis*.38;s.prologue.targetY=0;}
      D.update(s.prologue,dt);
      if(D.allLoose(s.prologue)){
        if(s.prologue.looseAt===null)s.prologue.looseAt=s.prologue.time;
        if(s.prologue.time-s.prologue.looseAt>=1){beginJourney(s);return [];}
      }
      return s.prologue.detachments.map(()=>({type:'detach'}));
    }
    s.elapsed+=dt;
    if(s.phase==='opening'){
      O.update(s.opening,dt);s.nursery.time=s.opening.time;rootPlants(s);
      const hero=s.nursery.plants.find(p=>p.hero);
      if(hero&&s.opening.transition.settled&&!s.bridge&&s.opening.time-hero.at-.9>=1)
        s.bridge={at:s.opening.time};
      s.view=openingFrame(s);
      if(s.bridge&&s.opening.time-s.bridge.at>=1.25){
        s.phase='playing';s.elapsed=0;s.opening=null;s.bridge=null;s.view=follow(s);
      }
      return [];
    }
    if(s.nursery?.fall){
      O.update(s.nursery.fall,dt);s.nursery.time=s.nursery.fall.time;rootPlants(s);
      if(s.nursery.fall.seeds.every(p=>p.inactive||p.arrival&&s.nursery.time-p.arrival.at>=3.15))s.nursery.fall=null;
    }
    const controlled=s.phase==='playing'||s.phase==='coast';
    P.input(s.world,controlled?axis:0);const events=W.update(s.world,dt);
    if(s.phase==='playing'&&s.world.finished){s.phase='coast';s.elapsed=0;s.ending=finalShot(s);}
    if(s.phase==='coast'){
      const b=s.world.pumpkin;
      s.slow=!axis&&Math.abs(s.world.axis)<.1&&b.grounded&&Math.hypot(b.vx,b.vy)<35?s.slow+dt:0;
      if(s.elapsed>=1.8&&s.slow>=.4){s.phase='ending';s.elapsed=0;}
    }
    if(s.phase==='playing'){
      // Velocity anticipation is low-pass filtered and never modifies the model
      // camera, input, constants or plug transfers. Its range stays within view.
      const target=Math.max(-55,Math.min(55,s.world[s.world.active].vx*.12));
      s.look+=(target-s.look)*(1-Math.exp(-dt*3));s.view=follow(s);
    }else if(s.phase==='coast'||s.phase==='ending'){
      shotView(s,dt);
      if(s.phase==='ending'&&s.ending.settledAt!==null&&s.ending.time-s.ending.settledAt>=2.5){s.phase='returning';s.elapsed=0;s.ending.hero={from:{...s.view},offset:{x:(s.world.pumpkin.x-s.view.x)*s.view.z,y:(s.world.pumpkin.y-s.view.y)*s.view.z}};s.prologue=D.create();s.prologue.looseAt=null;P.clearInput(s.world);}
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
  function returnMix(s){return s.phase==='returning'?smooth((s.elapsed-2.1)/1.5):s.phase==='title'?1:0;}
  return {create,start,beginJourney,update,pair,returnMix,smooth,nurseryPoses,openingFrame};
});
