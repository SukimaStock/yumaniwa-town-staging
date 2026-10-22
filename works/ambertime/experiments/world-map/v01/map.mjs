// AmberTime world-map art: every object originates in integer-pixel 32x32 art.
// Palette and copper still silhouette follow works/ambertime/room-object-art.mjs.
export const SIZE=144;
export const SPRITE_SIZE=32;
export const STAGES=['蒸留所','近所','町','地方','日本','地球'];
export const zoomTarget=(stage,direction)=>Math.max(1,Math.min(6,stage+(direction==='out'?1:-1)));
export const clampStage=n=>Math.max(1,Math.min(6,Number.isFinite(n)?Math.trunc(n):1));
const K={ink:'#28343b', deep:'#263d40', grass:'#86996c',grassLight:'#9da977',grassDeep:'#6d8665', grassShade:'#7e9468', path:'#c7b188',path2:'#dbc5a0',sand:'#c3b487',tree:'#4d6b55',tree2:'#698463',treeLight:'#809a70',trunk:'#79533e',stone:'#827f80',stoneLight:'#c0ada0',copper:'#b87333',copperLight:'#dca050',copperDark:'#503214',blue:'#29adff',yellow:'#ffff64',cream:'#d9ccaa',plaster:'#bfb699',roof:'#9e684b',brick:'#b98760',window:'#a5c6bd',wood:'#785845',foam:'#efe3bb',river:'#638d99',riverLight:'#81a7aa',sea:'#356c83',seaDark:'#2b596f',coast:'#d2bd8d',land:'#84a079',landDark:'#678a6a',snow:'#d1c9b6',mountain:'#777b77', mountainLight:'#a29e91',night:'#111d2c',night2:'#1d3041',star:'#e8d8a8'};
const pix=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
function line(c,x,y,x2,y2,col,width=1){let dx=Math.abs(x2-x),dy=Math.abs(y2-y),sx=x<x2?1:-1,sy=y<y2?1:-1,err=dx-dy;while(true){pix(c,x,y,width,width,col);if(x===x2&&y===y2)break;const e=2*err;if(e>-dy){err-=dy;x+=sx}if(e<dx){err+=dx;y+=sy}}}
function path(c,pts,width=4){for(let i=1;i<pts.length;i++){const [x,y]=pts[i-1], [xx,yy]=pts[i];line(c,x,y,xx,yy,K.path,width);if(width>=3)line(c,x+1,y,xx+1,yy,K.path2,Math.max(1,width-2));}}
function polygon(c,pts,col){const ys=pts.map(p=>p[1]),lo=Math.max(0,Math.min(...ys)),hi=Math.min(SIZE-1,Math.max(...ys));for(let y=lo;y<=hi;y++){const xs=[];for(let i=0;i<pts.length;i++){const [x1,y1]=pts[i], [x2,y2]=pts[(i+1)%pts.length];if((y1<=y&&y<y2)||(y2<=y&&y<y1))xs.push(x1+(y-y1)*(x2-x1)/(y2-y1))}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)pix(c,Math.ceil(xs[i]),y,Math.max(1,Math.floor(xs[i+1])-Math.ceil(xs[i])),1,col)}}
function inPoly(x,y,p){let b=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],z=p[j];if(((a[1]>y)!==(z[1]>y))&&(x<(z[0]-a[0])*(y-a[1])/(z[1]-a[1])+a[0]))b=!b}return b;}
function pattern(c,{start=0,count=30,land=true}={}){for(let i=start;i<start+count;i++){let x=(i*73+11+i*i*3)%142,y=(i*43+7+i*i*5)%140;if(land){pix(c,x,y,1+(i%3===0),1,i%5===0?K.grassLight:K.grassShade);if(i%9===0){pix(c,x+2,y,2,2,K.foam);pix(c,x+3,y+1,1,2,K.copperLight)}}else pix(c,x,y,2+(i%3===0),1,i%4===0?K.riverLight:K.sea);}}
function field(c){pix(c,0,0,144,144,K.grass);pattern(c,{count:130});}
function tree(c,x,y,s=1){const p=(a,b,w,h,col)=>pix(c,x+a*s,y+b*s,w*s,h*s,col);p(-1,0,3,4,K.trunk);p(-4,-8,9,9,K.ink);p(-3,-10,7,4,K.tree);p(-5,-6,11,3,K.tree);p(-3,-8,6,5,K.tree2);p(-2,-10,3,3,K.treeLight);p(2,-5,3,2,K.tree2)}
function stone(c,x,y){pix(c,x-3,y-2,7,4,K.stone);pix(c,x-2,y-3,5,1,K.stoneLight);pix(c,x+1,y,3,2,K.deep)}
function flower(c,x,y){pix(c,x-2,y,2,1,K.foam);pix(c,x+1,y,2,1,K.foam);pix(c,x,y-2,1,2,K.foam);pix(c,x,y+1,1,2,K.foam);pix(c,x,y,1,1,K.copperLight)}
function cloud(c,x,y){pix(c,x,y+2,17,4,K.foam);pix(c,x+3,y,9,4,K.foam);pix(c,x+8,y-3,5,4,K.cream)}
function hill(c,x,y){pix(c,x-10,y+4,21,5,K.grassDeep);pix(c,x-6,y,14,5,K.grassShade);pix(c,x-3,y-3,8,4,K.grassLight)}
// A 32×32 handmade building with the exact cyan/yellow/copper vocabulary of the original AmberTime pot.
// First create a semantic master sprite, then reduce it for wider views.
function masterSprite(kind){const cmds=[];const c={fillStyle:'',fillRect(x,y,w,h){cmds.push([x,y,w,h,this.fillStyle])}};const r=(x,y,w,h,col)=>pix(c,x,y,w,h,col);
 if(kind==='still'){
  r(5,27,24,3,K.ink);r(7,24,18,4,K.plaster);r(6,21,19,5,K.cream);r(4,20,22,3,K.ink);
  r(5,16,19,5,K.copperDark);r(7,12,16,5,K.copper);r(9,9,12,5,K.copperLight);r(11,7,8,5,K.copperDark);r(12,9,6,4,K.copper);r(14,5,3,4,K.copperDark);
  r(14,3,3,3,K.copperLight);r(16,7,4,3,K.copperDark);r(18,9,9,3,K.copperDark);r(25,11,3,10,K.copperDark);r(19,9,7,1,K.copperLight);r(26,12,1,8,K.copper);
  r(23,19,8,9,K.ink);r(24,20,6,7,K.plaster);r(25,21,4,5,K.window);r(24,27,6,1,K.foam);
  r(9,24,3,4,K.ink);r(10,25,2,3,K.wood);r(15,23,3,3,K.blue);r(16,22,1,5,K.yellow);r(14,24,5,1,K.yellow);
  r(6,26,2,2,K.ink);r(19,26,2,2,K.ink);r(10,16,3,2,K.copperLight);r(7,19,3,1,K.roof);
  r(15,1,1,1,K.foam);r(17,0,1,1,K.plaster);
 }else if(kind==='liquor'){
  r(2,26,28,3,K.ink);r(5,13,23,14,K.plaster);r(4,10,25,4,K.ink);r(7,7,20,6,K.roof);r(11,5,13,4,K.brick);r(16,3,4,4,K.ink);r(17,4,2,4,K.roof);
  r(6,16,7,9,K.ink);r(7,17,5,8,K.wood);r(8,19,1,3,K.cream);r(17,16,8,6,K.ink);r(18,17,6,4,K.window);r(19,18,3,2,K.copperLight);
  r(1,11,2,12,K.wood);r(0,12,7,2,K.ink);r(0,14,7,6,K.copperDark);r(2,15,3,4,K.cream);r(3,16,1,3,K.foam);r(2,18,3,1,K.foam);r(25,24,5,3,K.copperDark);r(26,23,3,4,K.copper);
 }else if(kind==='super'){
  r(2,26,28,3,K.ink);r(4,11,25,16,K.plaster);r(3,9,26,5,K.ink);r(5,6,23,4,K.roof);r(8,4,17,3,K.brick);
  r(4,12,25,5,K.cream);for(let x=5;x<29;x+=6){r(x,12,3,6,K.tree);r(x+3,12,3,6,K.foam)}
  r(7,19,8,7,K.ink);r(8,20,6,6,K.wood);r(18,19,9,7,K.ink);r(19,20,7,5,K.window);r(20,23,3,2,K.copperLight);r(23,22,3,2,K.grassDeep);r(28,13,2,14,K.wood);
 }return cmds;}
const SPRITES={still:masterSprite('still'),liquor:masterSprite('liquor'),super:masterSprite('super')};
function stamp(c,kind,x,y,side=32){for(const [rx,ry,w,h,col] of SPRITES[kind]){const tx=Math.round(x+rx*side/32),ty=Math.round(y+ry*side/32),tw=Math.max(1,Math.round((rx+w)*side/32)-Math.round(rx*side/32)),th=Math.max(1,Math.round((ry+h)*side/32)-Math.round(ry*side/32));pix(c,tx,ty,tw,th,col);}}
function cottage(c,x,y,scale=1,roof=K.roof){const s=scale,p=(a,b,w,h,col)=>pix(c,x+a*s,y+b*s,w*s,h*s,col);p(-6,-2,13,9,K.ink);p(-5,-1,11,8,K.cream);p(-7,-5,15,4,K.ink);p(-5,-7,11,4,roof);p(-1,2,3,5,K.wood);p(-4,0,2,2,K.window);p(4,0,2,2,K.window)}
function creek(c){for(let y=0;y<144;y++){let x=Math.floor(17+7*Math.sin(y/17));pix(c,x,y,12,1,K.seaDark);pix(c,x+2,y,8,1,K.river);if(y%6===0)pix(c,x+6,y,3,1,K.riverLight)}}
function mountain(c,x,y){polygon(c,[[x-10,y+5],[x,y-10],[x+11,y+5]],K.deep);polygon(c,[[x-9,y+4],[x,y-9],[x+9,y+4]],K.mountain);polygon(c,[[x-2,y-6],[x,y-10],[x+5,y-3],[x+2,y-2],[x,y-5],[x-2,y-2],[x-5,y-2]],K.snow);line(c,x+1,y-1,x+6,y+4,K.mountainLight);}
function urchin(c,x,y){pix(c,x-2,y-1,5,4,K.ink);pix(c,x-1,y-2,3,5,K.roof);pix(c,x,y-3,2,3,K.brick);pix(c,x,y,1,2,K.foam)}
function first(c){field(c);hill(c,20,25);hill(c,116,46);cloud(c,13,11);cloud(c,103,16);path(c,[[73,119],[71,107],[73,98],[77,91]],5);for(const t of [[18,77,2],[24,85,2],[115,96,2],[126,106,2],[20,116,1],[120,52,1]])tree(c,...t);for(const [x,y] of [[43,41],[95,118],[13,131]])stone(c,x,y);for(const [x,y] of [[44,71],[101,55],[30,110]])flower(c,x,y);stamp(c,'still',45,45,64);}
function second(c){field(c);path(c,[[53,91],[67,91],[78,98],[93,107],[107,112],[129,122]],5);path(c,[[79,97],[79,73],[93,61]],3);for(const t of [[12,31,2],[22,121,2],[121,32,2],[98,81,1],[39,18,1],[106,132,1]])tree(c,...t);stamp(c,'still',25,63,36);stamp(c,'liquor',87,33,29);stamp(c,'super',100,94,30);for(const [x,y] of [[72,20],[20,105],[130,76]])stone(c,x,y);for(const [x,y] of [[58,35],[92,87],[22,42]])flower(c,x,y);}
function third(c){field(c);creek(c);path(c,[[54,0],[55,26],[70,46],[81,67],[75,91],[95,113],[109,143]],5);path(c,[[0,76],[46,75],[74,67],[124,67],[144,54]],5);path(c,[[27,113],[55,94],[75,91],[124,126]],4);path(c,[[20,15],[39,35],[55,45]],3);for(const [x,y,s] of [[17,10,1],[116,12,1],[133,90,1],[22,124,1],[126,136,1],[108,45,1]])tree(c,x,y,s);stamp(c,'still',51,48,25);stamp(c,'liquor',21,48,20);stamp(c,'super',106,78,22);for(const p of [[107,20],[88,33],[37,27],[39,99],[81,113],[125,116],[11,48]])cottage(c,...p,1);for(const [x,y] of [[118,40],[48,121],[9,92]])stone(c,x,y);for(const [x,y] of [[71,23],[101,105]])flower(c,x,y);}
function fourth(c){field(c);for(let y=0;y<144;y++){const x=Math.floor(103+14*Math.sin(y/19));pix(c,x,y,13,1,K.seaDark);pix(c,x+2,y,9,1,K.river);if(y%5===0)pix(c,x+4,y,5,1,K.riverLight)}for(const [x,y] of [[15,25],[35,22],[55,29],[12,52],[33,49]])mountain(c,x,y);for(let i=0;i<29;i++){const x=(i*29+12)%96,y=(i*43+10)%130;tree(c,x,y,1)}path(c,[[0,61],[39,53],[64,73],[82,88],[99,109]],3);path(c,[[12,140],[31,109],[64,73],[77,37]],3);stamp(c,'still',57,61,10);stamp(c,'liquor',70,28,8);stamp(c,'super',89,111,8);for(const [x,y] of [[14,93],[53,126],[72,17]])urchin(c,x,y);}
// Hand-drawn Japanese island coastlines, independent of rumor topology.
const ISLANDS=[[[97,15],[109,12],[117,17],[123,26],[118,36],[123,42],[111,47],[108,52],[99,47],[92,49],[90,37],[96,29]],[[93,45],[98,49],[101,60],[96,70],[91,80],[84,88],[82,96],[74,102],[70,109],[62,111],[56,117],[45,118],[39,124],[31,124],[23,129],[19,125],[23,118],[31,113],[41,114],[50,109],[58,105],[62,98],[72,94],[77,86],[82,79],[84,70],[90,61]],[[52,117],[63,116],[62,123],[52,128],[44,127],[45,121]],[[23,124],[30,130],[30,139],[22,143],[15,137],[17,129]],[[13,141],[16,141],[15,143]]];
function land(c,pts){polygon(c,pts,K.coast);polygon(c,pts.map(([x,y])=>[x-1,y-1]),K.land);for(let i=0;i<36;i++){let x=(i*37+11)%144,y=(i*41+5)%144;if(inPoly(x,y,pts))pix(c,x,y,2,2,i%2?K.landDark:K.grassLight)}}
function fifth(c){pix(c,0,0,144,144,K.sea);pattern(c,{count:68,land:false});for(const a of ISLANDS)land(c,a);for(const [x,y] of [[100,39],[86,76],[60,110],[30,130]]){pix(c,x-1,y,3,1,K.mountainLight);pix(c,x,y-1,1,2,K.mountain)}pix(c,80,88,2,2,K.copperLight);pix(c,82,88,1,1,K.foam);}
const CONTINENTS=[[[44,48],[56,38],[69,37],[79,47],[76,60],[68,66],[64,82],[54,83],[46,72],[38,58]],[[62,84],[73,87],[77,99],[70,116],[59,112],[53,98]],[[79,43],[99,43],[108,55],[105,77],[94,83],[82,71]]];
function sixth(c){pix(c,0,0,144,144,K.night);for(let i=0;i<31;i++){let x=(i*61+17)%140,y=(i*41+23)%140;pix(c,x,y,i%9===0?2:1,1,i%5===0?K.star:K.stone);if(i%13===0){pix(c,x-2,y,5,1,K.star);pix(c,x,y-2,1,5,K.star)}}const cx=72,cy=73,r=36;for(let y=cy-r;y<=cy+r;y++){let dx=Math.floor(Math.sqrt(Math.max(0,r*r-(y-cy)*(y-cy))));pix(c,cx-dx,y,2*dx,1,y%7===0?K.river:K.sea);pix(c,cx+Math.floor(dx*.55),y,Math.max(1,Math.floor(dx*.45)),1,K.seaDark)}for(const shape of CONTINENTS){for(let y=37;y<109;y++)for(let x=36;x<109;x++)if((x-cx)**2+(y-cy)**2<r*r-12&&inPoly(x,y,shape)){pix(c,x,y,1,1,(x+y)%11===0?K.grassLight:K.land)}}for(const [x,y,w] of [[51,49,11],[71,58,13],[85,73,12],[58,91,9],[78,101,12]]){pix(c,x,y,w,2,K.cream);pix(c,x+3,y-2,w-5,2,K.foam)}}
export function renderMap(ctx,stage){stage=clampStage(stage);ctx.imageSmoothingEnabled=false;const f=[first,second,third,fourth,fifth,sixth][stage-1];f(ctx);return stage;}
