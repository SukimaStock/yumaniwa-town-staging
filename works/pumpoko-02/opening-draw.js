/* The original stage-draw opening shot: sky, transform, expanding cut, lifting
 * terrain and exactly one moving copy of each seed. Terrain uses 02's sampler. */
(function(root){
  'use strict';
  root.PumpokoOpeningDraw=function(c,state,nursery,frame){
    const O=root.PumpokoOpening,s=state.opening,o=O.opening(s),M=root.PumpokoMaterial;
    c.save();c.translate(0,740);c.scale(1,-1);
    c.save();c.globalAlpha=o*(1-(frame.backgroundMix||0));
    const sky=c.createLinearGradient(0,0,0,740);
    sky.addColorStop(0,M.air);sky.addColorStop(.58,M.cream);sky.addColorStop(1,M.airDeep);
    c.fillStyle=sky;c.fillRect(0,0,390,740);
    c.fillStyle=M.far;c.beginPath();c.moveTo(-100,740);
    for(let x=-100;x<=490;x+=10)c.lineTo(x,475+Math.sin((x+s.camera.x*.16)/260)*52);
    c.lineTo(490,740);c.closePath();c.fill();
    c.fillStyle=M.near;c.beginPath();c.moveTo(-100,740);
    for(let x=-100;x<=490;x+=10)c.lineTo(x,560+Math.sin((x+s.camera.x*.28)/210+.8)*34);
    c.lineTo(490,740);c.closePath();c.fill();c.restore();
    c.save();const v=O.view(s);
    c.translate(v.x,v.y);c.rotate(v.angle);c.scale(v.sx,v.sy);c.translate(-s.camera.x,-s.camera.y);
    if(o<.7){
      c.save();c.translate(s.geometry.START.x,s.geometry.START.y);
      c.scale(1+o*1150/94,1+o*1150/94);
      c.globalAlpha=1-O.smooth((o-.20)/.5);
      root.PumpokoTitleArt.vessel(c,false,true,s);c.restore();
    }
    c.restore();c.restore();
    root.PumpokoWorldDraw(c,state.world,state.view,null,frame);
    c.save();const q=frame.screen;
    c.translate(q.x,q.y);c.rotate(q.angle);c.scale(q.sx,q.sy);c.translate(-q.camera.x,-q.camera.y);
    root.FruitLabArt.nursery(c,nursery,state.world);c.restore();
    root.PumpokoTitleArt.captions(c,s,1-O.smooth(s.transition.progress/.48));
  };
})(typeof window!=='undefined'?window:globalThis);
