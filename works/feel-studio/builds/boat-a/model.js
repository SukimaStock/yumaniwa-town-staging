(function(root){'use strict';
const G=typeof module!=='undefined'&&module.exports?require('../../geometry-v2.js'):root.StudioGeometry;
const validate=c=>G.validate(c,'boat');
function create(config){const c=validate(config),s={...c.start,u:0,t:0,blocked:false};return{state:s,update(dt,input){const old={x:s.x,y:s.y};if(input.active){s.t+=dt;if(s.t>=c.wait)s.u=Math.min(1,s.u+dt/c.travel);}Object.assign(s,G.along(c,s.u));if(G.obstruction(c,s,old))s.u=Math.max(0,s.u-dt/c.travel);},draw(ctx,input){G.boat(ctx,c,s,input);}};}

const api={create,validate,handles:c=>G.handles(c,'boat'),edit:(c,id,p)=>G.edit(c,id,p,'boat')};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudioPrototype=api;
})(typeof window!=='undefined'?window:globalThis);
