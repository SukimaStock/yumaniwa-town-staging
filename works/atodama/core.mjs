export const W=360,H=500,DT=1/180,DURATION=4.6,FRAMES=Math.round(DURATION/DT),R=8;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const levels=[
 {name:'まず一球',start:{x:180,y:445},targets:[{x:180,y:340},{x:180,y:200},{x:180,y:80}],walls:[],bumpers:[],gates:[],keys:[],limit:3},
 {name:'同時に走る',start:{x:180,y:445},targets:[{x:65,y:110},{x:295,y:110},{x:65,y:330},{x:295,y:330}],walls:[],bumpers:[{x:180,y:240,r:43}],gates:[],keys:[],limit:3},
 {name:'先に開けておく',start:{x:180,y:445},targets:[{x:65,y:375},{x:180,y:95},{x:295,y:375}],walls:[{x1:20,y1:245,x2:143,y2:245},{x1:217,y1:245,x2:340,y2:245}],bumpers:[],gates:[{x1:143,y1:245,x2:217,y2:245,key:0}],keys:[{x:65,y:375}],limit:3},
 {name:'壁を使う',start:{x:180,y:445},targets:[{x:65,y:380},{x:70,y:100},{x:290,y:100},{x:290,y:360}],walls:[{x1:20,y1:265,x2:143,y2:265},{x1:217,y1:265,x2:340,y2:265}],bumpers:[{x:180,y:140,r:38},{x:180,y:355,r:26}],gates:[{x1:143,y1:265,x2:217,y2:265,key:0}],keys:[{x:65,y:380}],limit:3},
 {name:'二段のリレー',start:{x:180,y:445},targets:[{x:65,y:395},{x:65,y:250},{x:280,y:85}],walls:[{x1:20,y1:325,x2:96,y2:325},{x1:164,y1:325,x2:340,y2:325},{x1:20,y1:175,x2:216,y2:175},{x1:284,y1:175,x2:340,y2:175}],bumpers:[],gates:[{x1:96,y1:325,x2:164,y2:325,key:0},{x1:216,y1:175,x2:284,y2:175,key:1}],keys:[{x:65,y:395},{x:65,y:250}],limit:3},
 {name:'三球の設計',start:{x:180,y:445},targets:[{x:65,y:395},{x:65,y:250},{x:290,y:250},{x:65,y:75},{x:290,y:75}],walls:[{x1:20,y1:325,x2:96,y2:325},{x1:164,y1:325,x2:340,y2:325},{x1:20,y1:175,x2:216,y2:175},{x1:284,y1:175,x2:340,y2:175}],bumpers:[{x:180,y:85,r:25}],gates:[{x1:96,y1:325,x2:164,y2:325,key:0},{x1:216,y1:175,x2:284,y2:175,key:1}],keys:[{x:65,y:395},{x:65,y:250}],limit:3}
];
export const borders=[{x1:20,y1:24,x2:340,y2:24},{x1:340,y1:24,x2:340,y2:480},{x1:340,y1:480,x2:20,y2:480},{x1:20,y1:480,x2:20,y2:24}];
export function newRun(level,ghosts,shot){return {level,ghosts,shot,ball:{...level.start,vx:Math.cos(shot.angle)*shot.speed,vy:Math.sin(shot.angle)*shot.speed},frame:0,open:level.keys.map(()=>false),hit:level.targets.map(()=>false),path:[],events:[],bounces:0,finished:false};}
function contact(ball,s){const sx=s.x2-s.x1,sy=s.y2-s.y1;const t=clamp(((ball.x-s.x1)*sx+(ball.y-s.y1)*sy)/(sx*sx+sy*sy),0,1);const px=s.x1+sx*t,py=s.y1+sy*t;const dx=ball.x-px,dy=ball.y-py,d=Math.hypot(dx,dy),min=R+3;if(d>=min)return false;let nx=d>.0001?dx/d:-Math.sign(ball.vx),ny=d>.0001?dy/d:-Math.sign(ball.vy);if(!nx&&!ny)ny=-1;ball.x=px+nx*(min+.01);ball.y=py+ny*(min+.01);const v=ball.vx*nx+ball.vy*ny;if(v<0){ball.vx-=2*v*nx;ball.vy-=2*v*ny;return true;}return false;}
export function step(s){if(s.finished)return;const {level:l,ball:b}=s;s.events=[];const actors=s.ghosts.map(g=>g.path[Math.min(s.frame,g.path.length-1)]).filter(Boolean);
 for(const p of actors)activate(s,p,true);
 b.x+=b.vx*DT;b.y+=b.vy*DT;
 for(const w of borders)if(contact(b,w)){s.bounces++;s.events.push({type:'bounce',x:b.x,y:b.y});}
 for(const w of l.walls)if(contact(b,w)){s.bounces++;s.events.push({type:'bounce',x:b.x,y:b.y});}
 for(const w of l.gates)if(!s.open[w.key]&&contact(b,w)){s.bounces++;s.events.push({type:'bounce',x:b.x,y:b.y});}
 for(const o of l.bumpers){const dx=b.x-o.x,dy=b.y-o.y,d=Math.hypot(dx,dy),rr=o.r+R;if(d<rr){const nx=d?dx/d:0,ny=d?dy/d:-1;b.x=o.x+nx*(rr+.01);b.y=o.y+ny*(rr+.01);const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=2*v*nx;b.vy-=2*v*ny;s.bounces++;s.events.push({type:'bounce',x:b.x,y:b.y});}}}
 activate(s,b);s.path.push({x:b.x,y:b.y});s.frame++;if(s.frame>=FRAMES)s.finished=true;
}
function activate(s,p,echo=false){s.level.keys.forEach((k,i)=>{if(echo&&!s.open[i]&&dist(k,p)<R+18){s.open[i]=true;s.events.push({type:'key',index:i,x:k.x,y:k.y});}});s.level.targets.forEach((t,i)=>{if(!s.hit[i]&&dist(t,p)<R+16){s.hit[i]=true;s.events.push({type:'target',index:i,x:t.x,y:t.y});}});}
export function simulate(level,ghosts,shot){const s=newRun(level,ghosts,shot);while(!s.finished)step(s);return s;}
export function snapshot(run){return {shot:{...run.shot},path:run.path.map(p=>({...p})),hit:[...run.hit],open:[...run.open]};}
export function dailyLevel(seed){let a=seed>>>0;const rnd=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};const l={name:'フリーテーブル',start:{x:180,y:445},targets:[],walls:[],bumpers:[{x:95+rnd()*50,y:160+rnd()*90,r:25+rnd()*18},{x:235+rnd()*30,y:270+rnd()*50,r:20+rnd()*13}],gates:[],keys:[],limit:3,seed};
 // Targets are sampled from three physical trajectories, so every table has a solution.
 for(let n=0;n<3;n++){const angle=-Math.PI+.3+rnd()*2.5,speed=250+rnd()*220;const r=simulate(l,[],{angle,speed});for(let k=0;k<2;k++){let index=Math.floor((.2+rnd()*.65)*FRAMES),p=r.path[index];for(let j=0;j<120;j++){if(p.y<395&&p.y>58&&p.x>45&&p.x<315&&l.targets.every(t=>dist(t,p)>50)&&l.bumpers.every(o=>dist(o,p)>o.r+28))break;index=(index+17)%FRAMES;p=r.path[index];}if(l.targets.every(t=>dist(t,p)>38)&&l.bumpers.every(o=>dist(o,p)>o.r+24))l.targets.push({...p});}}
 return l;}
