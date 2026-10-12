(function(root){'use strict';
const G=typeof module!=='undefined'&&module.exports?require('../../geometry-v2.js'):root.StudioGeometry;
const validate=c=>G.validate(c,'boat');
function create(config){const c=validate(config),s={...c.start,u:0,v:0,t:0,goal:0,blocked:false};return{state:s,update(dt,input){const old={x:s.x,y:s.y};if(input.active){s.t+=dt;if(s.t>=c.wait){const dx=c.end.x-c.start.x,dy=c.end.y-c.start.y;s.goal=G.clamp(((input.x-c.start.x)*dx+(input.y-c.start.y)*dy)/(dx*dx+dy*dy||1),0,1);}}else s.t=0;
const k=Math.pow(6.28/c.travel,2);s.v+=(k*(s.goal-s.u)-(input.active?2.5:Math.max(.4,c.settle*4))*s.v)*dt;s.u=G.clamp(s.u+s.v*dt,0,1.13);Object.assign(s,G.along(c,s.u));if(G.obstruction(c,s,old)){s.v=0;s.u=G.clamp(s.u,0,1);} },draw(ctx,input){G.boat(ctx,c,s,input);}};}

const api={create,validate,handles:c=>G.handles(c,'boat'),edit:(c,id,p)=>G.edit(c,id,p,'boat')};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudioPrototype=api;
})(typeof window!=='undefined'?window:globalThis);
