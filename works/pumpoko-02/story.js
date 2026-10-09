/* Presentation around the adopted kernel. Never edits its camera or velocities. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./physics.js'):root.FruitLabPhysics,
    typeof module==='object'&&module.exports?require('./world.js'):root.FruitLabWorld,
    typeof module==='object'&&module.exports?require('./courses.js'):root.FruitLabCourses);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PumpokoStory=api;
})(typeof window!=='undefined'?window:globalThis,function(P,W,C){
  'use strict';
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const blend=(a,b,t)=>Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*t]));
  const follow=s=>({...s.world.camera,z:1});
  function create(){
    const world=W.createCourse(C.get('world4'));
    return {world,phase:'title',elapsed:0,slow:0,returnTitle:false,view:{x:world.pumpkin.x,y:world.pumpkin.y+12,z:2.2},opening:null,ending:null,previous:null};
  }
  function start(s){
    if(s.phase!=='title')return false;
    if(s.returnTitle){s.previous={world:s.world,view:{...s.view}};s.world=W.createCourse(C.get('world4'));}
    s.opening={from:s.returnTitle?{...follow(s),z:1.5}:{...s.view},elapsed:0};
    s.phase='playing';s.elapsed=0;s.slow=0;s.returnTitle=false;return true;
  }
  function pair(s){
    const a=s.world.pumpkin,b=s.world.holes.at(-1).occupant;
    // Equal subject weights; include the open cellar beneath the socket.
    const z=Math.min(.78,820/(Math.abs(a.x-b.x)+180));
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2+60,z};
  }
  function update(s,axis,dt){
    dt=Math.max(0,Math.min(.05,Number(dt)||0));
    if(s.phase==='title'){
      if(axis)start(s);
      else {
        if(s.returnTitle){P.input(s.world,0);W.update(s.world,dt);s.view=blend(s.view,pair(s),1-Math.exp(-dt*2));}
        return [];
      }
    }
    s.elapsed+=dt;
    const controlled=s.phase==='playing'||s.phase==='coast';
    P.input(s.world,controlled?axis:0);const events=W.update(s.world,dt);
    if(s.phase==='playing'&&s.world.finished){s.phase='coast';s.elapsed=0;}
    if(s.phase==='coast'){
      const b=s.world.pumpkin;
      s.slow=!axis&&Math.abs(s.world.axis)<.1&&b.grounded&&Math.hypot(b.vx,b.vy)<35?s.slow+dt:0;
      if(s.elapsed>=1.8&&s.slow>=.4){s.phase='ending';s.elapsed=0;s.ending={from:{...s.view},target:pair(s),velocity:{x:s.world.camera.vx,y:s.world.camera.vy}};}
    }
    if(s.phase==='playing'||s.phase==='coast'){
      s.view=follow(s);
      if(s.opening){s.opening.elapsed+=dt;s.view=blend(s.opening.from,s.view,smooth(s.opening.elapsed/1.2));if(s.opening.elapsed>=1.2){s.opening=null;s.previous=null;}}
    }else if(s.phase==='ending'){
      // Target follows residual rolling gently; both vegetables stay together.
      const target=pair(s),k=1-Math.exp(-dt*2);
      s.ending.target=blend(s.ending.target,target,k);
      s.view=blend(s.ending.from,s.ending.target,smooth(s.elapsed/6));
      for(const key of ['x','y'])s.view[key]+=s.ending.velocity[key]*s.elapsed*Math.exp(-s.elapsed*2)*(1-smooth(s.elapsed/6));
      if(s.elapsed>=11){s.phase='title';s.returnTitle=true;s.elapsed=0;P.clearInput(s.world);}
    }
    return events;
  }
  function dissolve(s){return s.previous&&s.opening?1-smooth(s.opening.elapsed/1.2):0;}
  return {create,start,update,pair,dissolve};
});
