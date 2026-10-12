import {point} from './game.mjs';
const TAU=Math.PI*2;
export const PALETTE={air:'#24333b',wall:'#354950',deep:'#182930',seam:'#293c43',rim:'#759da8',enamel:'#a2c2c7',water:'#e4f5ee',copper:'#be8364',rust:'#815943',lamp:'#e6bb72',ink:'#ccdbd8'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function path(c,pts,color,width){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
function polygon(c,pts,color){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);c.fillStyle=color;c.fill();}
export class RainDrawing{
 constructor(landscape=false){this.setLayout(landscape);}
 setLayout(wide){this.wide=wide;this.width=wide?830:400;this.height=wide?420:760;this.sx=wide?1.7:1;this.sy=wide?.49:1;this.ox=wide?75:0;this.oy=wide?14:0;}
 project(p){return {x:p.x*this.sx+this.ox,y:p.y*this.sy+this.oy};}
 inverse(p){return {x:(p.x-this.ox)/this.sx,y:(p.y-this.oy)/this.sy};}
 line(c,pts,color,width){path(c,pts.map(p=>this.project(p)),color,width);}
 poly(c,pts,color){polygon(c,pts.map(p=>this.project(p)),color);}
 text(c,str,x,y,size,color=PALETTE.ink,alpha=1){c.save();c.globalAlpha=alpha;c.fillStyle=color;c.font=`${size}px "Hiragino Mincho ProN", "Yu Mincho", serif`;c.textAlign='center';c.fillText(str,x,y);c.restore();}
 background(c,g){
  const P=PALETTE;c.fillStyle=P.air;c.fillRect(0,0,this.width,this.height);
  // A painted roof behind the mechanisms. Every joint is quieter than the water.
  this.poly(c,[{x:21,y:156},{x:67,y:129},{x:340,y:149},{x:382,y:180},{x:382,y:731},{x:21,y:731}],P.wall);
  this.poly(c,[{x:21,y:156},{x:67,y:129},{x:67,y:700},{x:21,y:731}],'#2d4149');
  this.poly(c,[{x:67,y:129},{x:340,y:149},{x:382,y:180},{x:90,y:164}],'#435b60');
  this.line(c,[{x:24,y:161},{x:86,y:164},{x:376,y:182}],'#596f71',2);
  for(let row=0;row<12;row++){
   const y=191+row*43;
   this.line(c,[{x:29,y},{x:377,y:y+9}],P.seam,1.1);
   for(let col=0;col<5;col++){
    const x=33+col*75+(row%2?36:0);if(x>379)continue;
    this.line(c,[{x,y},{x:x-3,y:y+40}],'#30444b',1);
   }
  }
  // Surface nicks are stable; never fresh per-frame noise.
  for(let i=0;i<70;i++){
   const x=35+((i*137+23)%326),y=193+((i*73)%512),p=this.project({x,y});
   c.fillStyle=i%3?'#485a5d55':'#21373f44';c.fillRect(p.x,p.y,(i%3+1)*this.sx,1);
  }
  this.line(c,[{x:14,y:735},{x:387,y:735}],'#17282d',12);
  this.line(c,[{x:14,y:730},{x:387,y:730}],'#687a75',2);
  const rainEnd=this.reduced?0:(g.phase==='end'?clamp(1-g.age/3,0,1):1);
  for(let i=0;i<46;i++){
   const x=(i*113.7+g.t*8)%420-10,y=(i*163.1+g.t*(80+i%5*9))%780;
   const a=this.project({x,y}),b=this.project({x:x-1.8,y:y+6+i%4});
   path(c,[a,b],`rgba(138,174,187,${.07*rainEnd})`,.9);
  }
 }
 gutter(c,p,g){
  const P=PALETTE,r=p.length/2,a=[];
  for(let i=0;i<=24;i++)a.push(point(p,-r+2*r*i/24));
  const center=this.project(p);
  // Wall bracket and pin remain fixed while the gutter tilts around them.
  c.fillStyle='#263840';c.fillRect(center.x-11,center.y-7,22,31);
  ellipse(c,center.x,center.y+20,3,3,'#71898b');
  const pp=a.map(v=>this.project(v));
  path(c,pp.map(v=>({x:v.x+3,y:v.y+10})), '#14272d66',17);
  path(c,pp.map(v=>({x:v.x,y:v.y+6})), '#4b6266',18);
  path(c,pp,P.deep,17);path(c,pp,P.rim,13);path(c,pp,P.enamel,7.2);
  path(c,pp.map(v=>({x:v.x,y:v.y-2})), '#d6e2d2',1.2);
  if(p.wet>0){c.save();c.globalAlpha=p.wet*.56;path(c,pp.slice(3,-3), '#e6f7ec',2.5);c.restore();}
  const ends=[point(p,-r+8),point(p,r-8)];
  for(let i=0;i<ends.length;i++){
   const e=this.project(ends[i]);
   ellipse(c,e.x+1,e.y+5,10,6,P.rust);ellipse(c,e.x,e.y,9,6,P.copper);
   ellipse(c,e.x-2,e.y-1,2,1.4,'#f0c59a');
   path(c,[{x:e.x-3,y:e.y+1},{x:e.x+3,y:e.y+1}],'#81543d',1);
  }
  ellipse(c,center.x,center.y+9,4,4,'#355057');ellipse(c,center.x,center.y+9,1.7,1.7,'#a9bfc0');
  if(g.drag?.index===g.pans.indexOf(p)){
   c.strokeStyle='#dbc29a77';c.lineWidth=1;c.beginPath();c.arc(center.x,center.y+9,10,0,TAU);c.stroke();
  }
 }
 cup(c,g){
  const P=PALETTE,p=this.project(g.cup),caught=g.phase==='caught',f=caught?clamp(g.age/.55,0,1):0;
  const w=this.wide?39:30,h=this.wide?34:41;
  ellipse(c,p.x+4,p.y+h+3,w+2,5,'#12232d55');
  polygon(c,[{x:p.x-w,y:p.y},{x:p.x+w,y:p.y},{x:p.x+w-7,y:p.y+h},{x:p.x-w+7,y:p.y+h}],'#adbbb0');
  polygon(c,[{x:p.x-w,y:p.y},{x:p.x-w+11,y:p.y+2},{x:p.x-w+14,y:p.y+h},{x:p.x-w+7,y:p.y+h}],'#6c8786');
  c.fillStyle='#536e72';c.fillRect(p.x+w-9,p.y+7,3,h-12);
  ellipse(c,p.x,p.y,w,8,'#cbd4c1');ellipse(c,p.x,p.y,w-4,5.5,'#344f5b');
  if(f){ellipse(c,p.x,p.y+1,w-5,5,'#93bec8');ellipse(c,p.x+Math.sin(g.age*13)*4*(1-f),p.y,w-8,2.8,'#ddede0');}
  c.strokeStyle='#889f96';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+8,w+5,18,0,Math.PI*.12,Math.PI*.88);c.stroke();
  c.fillStyle=P.rust;c.fillRect(p.x-6,p.y+h-13,12,7);c.fillStyle=P.copper;c.fillRect(p.x-5,p.y+h-13,10,3);
 }
 bead(c,g){
  const d=g.drop;if(!d||g.phase==='caught'||g.phase==='end')return;
  const p=this.project(d),speed=d.kind==='air'?Math.min(1,d.vy/430):0;
  for(const t of g.traces){const q=this.project(t);ellipse(c,q.x,q.y,1.8,2.2,`rgba(192,226,225,${Math.max(0,t.life)*.17})`);}
  if(d.kind==='pan')ellipse(c,p.x+2,p.y+6,8,2,'#376e7780');
  // No halo: one dense, bright drop stays legible against the slate.
  ellipse(c,p.x,p.y,7.7-speed*2,7+speed*4,PALETTE.water);
  ellipse(c,p.x+2,p.y+2,4.8-speed,4.2,'#8dbfca');ellipse(c,p.x-2,p.y-3,2.2,1.7,'#ffffe5');
 }
 sill(c,g){
  const y=this.wide?393:711;
  for(let i=0;i<5;i++){
   const x=(this.wide?348:132)+i*(this.wide?31:34),f=i<g.filled||(g.phase==='caught'&&i===g.level);
   c.fillStyle=f?'#d29e60':'#526970';c.fillRect(x-7,y-15,14,18);
   c.fillStyle=f?'#e6c080':'#263e48';c.fillRect(x-5,y-12,10,12);
   path(c,[{x:x-7,y:y+4},{x:x+8,y:y+4}],'#20343d',2);
   if(f){path(c,[{x:x-1,y:y-10},{x:x-1,y:y-3}],'#f3d6a1',1.3);}
  }
 }
 draw(c,g,fade){
  this.background(c,g);
  const P=PALETTE;
  if(g.phase!=='end'){
   const sp=this.project({x:g.source,y:g.pans[0].y-71});
   path(c,[{x:sp.x-20,y:sp.y-26},{x:sp.x-20,y:sp.y-7},{x:sp.x,y:sp.y-7},{x:sp.x,y:sp.y}], '#627d83',7);
   path(c,[{x:sp.x-20,y:sp.y-26},{x:sp.x-20,y:sp.y-7},{x:sp.x,y:sp.y-7},{x:sp.x,y:sp.y}], '#adbbb0',2);
   ellipse(c,sp.x,sp.y,4,2,P.deep);
   for(const p of g.pans)this.gutter(c,p,g);
   this.cup(c,g);this.bead(c,g);
  }else{
   // The last shower leaves five filled cups on a real ledge.
   for(let i=0;i<5;i++){
    const p=this.project({x:74+i*63,y:465+Math.sin(i*1.4)*4});
    const f={...g,cup:{x:74+i*63,y:465+Math.sin(i*1.4)*4},phase:'caught',age:1};this.cup(c,f);
    if(g.age<3){ellipse(c,p.x,p.y-13+Math.sin(g.age*2+i)*2,1.3,2,'#b1d8d1');}
   }
   this.line(c,[{x:30,y:516},{x:374,y:516}],'#718a84',4);
  }
  this.sill(c,g);
  const titleAlpha=g.phase==='end'?Math.min(1,g.age*.9):fade;
  const tx=this.wide?415:200,ty=this.wide?66:88;
  this.text(c,'雨つぎ',tx,ty,this.wide?28:37,'#dce5d5',titleAlpha);
  if(!g.started){
   this.text(c,'雨どいを、かたむける。',tx,this.wide?101:122,12,'#9eb5b9');
   const p=this.project(point(g.pans[0],g.pans[0].length/2-8));
   c.save();c.globalAlpha=this.reduced?.55:.45+.15*Math.sin(g.t*2);c.strokeStyle='#d5b388';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,15,0,TAU);c.stroke();c.restore();
  }
  if(g.phase==='end')this.text(c,'SukimaStock',tx,this.wide?101:122,11,'#91aaad',Math.min(1,g.age));
  if(g.phase==='retry')this.text(c,'もう一粒。',tx,this.wide?127:173,12,'#b6cac7',Math.min(1,g.age*4));
 }
}
