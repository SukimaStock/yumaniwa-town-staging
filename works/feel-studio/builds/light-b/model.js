(function(root){'use strict';
const G=typeof module!=='undefined'&&module.exports?require('../../geometry-v2.js'):root.StudioGeometry;const validate=c=>G.validate(c,'light');
function create(config){const c=validate(config),s={t:0,level:0,phase:0};return{state:s,update(dt,input){s.t=input.active?s.t+dt:0;s.phase+=dt/c.pulse;const target=s.t>c.delay?(Math.sin(s.phase*Math.PI*2)+1)/2:0;s.level+=(target-s.level)*Math.min(1,dt*5);},draw(ctx){paint(ctx,c,s.level);}};}
function paint(ctx,c,level){ctx.fillStyle='#34493f';ctx.fillRect(0,0,640,470);ctx.fillStyle='#1f342c';ctx.fillRect(40,65,560,290);ctx.fillStyle='rgba(222,213,172,'+level*.7+')';ctx.beginPath();ctx.arc(c.lamp.x,c.lamp.y,95,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d3c79f';ctx.beginPath();ctx.arc(c.lamp.x,c.lamp.y,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#71836c';ctx.fillRect(c.shutter.x-35,c.shutter.y-70,70,140);ctx.fillStyle='#d4d7bc';ctx.font='14px sans-serif';ctx.fillText('あかりの待ち合わせ',40,32);}

const api={create,validate,handles:c=>G.handles(c,'light'),edit:(c,id,p)=>G.edit(c,id,p,'light')};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudioPrototype=api;
})(typeof window!=='undefined'?window:globalThis);
