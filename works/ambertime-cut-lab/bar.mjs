import {streamProfile,colorForProfile} from './projection.mjs';
export function barGeometry({progress=0,start=null,end=null},x=10,w=100){const at=p=>x+Math.round(p/99*(w-1));return {current:at(progress),start:start===null?null:at(start),end:end===null?null:at(end),right:x+w-1};}
export function drawBar(ctx,state,{variant='C',malt='plain',ferment='long',x=10,y=85,w=100,h=6}={}){
 const g=barGeometry(state,x,w),r=(a,b,c,d,color)=>{ctx.fillStyle=color;ctx.fillRect(a,b,c,d);};
 r(x-1,y-1,w+2,h+2,'#858995');
 for(let n=0;n<w;n++){let color=variant==='A'?'#5c605d':colorForProfile(streamProfile(n/(w-1)*99,{malt,ferment}));r(x+n,y,1,h,color);}
 if(variant==='A')r(x,y,Math.max(1,g.current-x+1),h,'#c8b77e');
 const stop=g.end??g.current;
 if(variant==='C'&&g.start!==null){ctx.fillStyle='#191a29aa';ctx.fillRect(x,y,Math.max(0,g.start-x),h);ctx.fillRect(stop+1,y,Math.max(0,x+w-stop-1),h);r(g.start,y+h+1,Math.max(1,stop-g.start+1),1,'#f0e6c8');for(let n=g.start;n<=stop;n+=3)r(n,y+h+2,1,1,'#f0e6c8');}
 if(variant!=='B'&&g.start!==null){r(g.start,y-3,1,h+6,'#f0e6c8');r(g.start-1,y+h+3,3,1,'#f0e6c8');}
 if(variant!=='B'&&g.end!==null){r(g.end,y-3,1,h+6,'#f0e6c8');r(g.end-1,y-4,3,1,'#f0e6c8');}
 r(g.current,y-2,1,h+4,'#f0e6c8');r(g.current-1,y-3,3,1,'#f0e6c8');return g;
}
