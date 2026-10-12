(function(root){'use strict';
const G=typeof module!=='undefined'&&module.exports?require('../../geometry-v2.js'):root.StudioGeometry;
const validate=c=>G.validate(c,'boat');
function create(config){const c=validate(config),s={...c.start,u:0,t:0,charge:0,was:false,launched:false,blocked:false};return{state:s,update(dt,input){const old={x:s.x,y:s.y};if(input.active&&!s.launched)s.charge=Math.min(2,s.charge+dt);if(s.was&&!input.active&&!s.launched){s.launched=true;s.t=0;}s.was=input.active;if(s.launched){s.t+=dt;if(s.t>c.wait){const p=G.clamp((s.t-c.wait)/(c.travel/(.5+s.charge/2)),0,1);s.u=1-Math.pow(1-p,2);}}Object.assign(s,G.along(c,s.u));if(G.obstruction(c,s,old)){s.launched=false;s.charge=0;}},draw(ctx,input){G.boat(ctx,c,s,input);ctx.fillStyle='#d8cba5';ctx.fillRect(40,375,Math.min(200,s.charge*100),3);}};}

const api={create,validate,handles:c=>G.handles(c,'boat'),edit:(c,id,p)=>G.edit(c,id,p,'boat')};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudioPrototype=api;
})(typeof window!=='undefined'?window:globalThis);
