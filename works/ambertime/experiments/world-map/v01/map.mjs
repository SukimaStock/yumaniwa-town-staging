// AmberTime world map: six independently authored views on one 72x72 cell grid.
// A cell is exactly 2x2 pixels on the 144x144 canvas. Nothing is scaled or snapped.
export const SIZE=144, MAP_CELL=2, GRID=72, SPRITE_SIZE=32;
export const STAGES=['蒸留所','近所','町','地方','日本','地球'];
export const clampStage=n=>Math.max(1,Math.min(6,Number.isFinite(n)?Math.trunc(n):1));
export const zoomTarget=(stage,direction)=>clampStage(clampStage(stage)+(direction==='out'?1:-1));
const P={grass:'#87996b',lightGrass:'#9caa78',grassDark:'#738a62',grove:'#3c6151',leaf:'#54785b',leafLight:'#78946a',trunk:'#77503a',ink:'#293a3b',copper:'#b87333',shine:'#dca050',copperDark:'#754326',cream:'#dbcca8',wall:'#bcb394',blue:'#29adff',yellow:'#ffff64',roof:'#9a6448',road:'#c1a77e',roadLight:'#d3bd94',stone:'#807e79',stoneLight:'#b8b1a2',river:'#628f9a',waterLight:'#8eafb0',sea:'#356a83',seaDark:'#2b576f',beach:'#cab589',land:'#7d9d73',snow:'#d4cab3',mountain:'#8b8b80',night:'#142031',star:'#eadab0'};
function painter(ctx){return (x,y,w,h,color)=>{if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<1||h<1||x+w>GRID||y+h>GRID)throw Error('off-grid cell');ctx.fillStyle=color;ctx.fillRect(x*MAP_CELL,y*MAP_CELL,w*MAP_CELL,h*MAP_CELL);};}
const box=(p,x,y,w,h,c)=>p(x,y,w,h,c);
function path(p,points,width=2){for(let i=1;i<points.length;i++){let [x,y]=points[i-1], [ex,ey]=points[i];const dx=Math.abs(ex-x),dy=Math.abs(ey-y),sx=x<ex?1:-1,sy=y<ey?1:-1;let err=dx-dy;while(true){p(x,y,width,width,P.road);if(x===ex&&y===ey)break;const e=2*err;if(e>-dy){err-=dy;x+=sx}if(e<dx){err+=dx;y+=sy}}}}
function backdrop(p){p(0,0,72,72,P.grass);for(const [x,y] of [[4,18],[18,11],[51,8],[59,25],[9,49],[42,53],[65,57],[6,68],[29,64],[53,41],[37,8],[47,27]])p(x,y,2,1,P.grassDark);}
function tree(p,x,y,s=1){const t=(a,b,w,h,c)=>p(x+a*s,y+b*s,w*s,h*s,c);t(3,8,2,5,P.trunk);t(0,3,8,8,P.ink);t(1,1,6,8,P.grove);t(2,0,4,5,P.leaf);t(2,2,2,3,P.leafLight);t(5,5,2,3,P.leaf);}
function flower(p,x,y){p(x,y,1,1,P.cream);p(x+2,y,1,1,P.cream);p(x+1,y+1,1,1,P.shine);}
function cloud(p,x,y){p(x,y+3,12,3,P.cream);p(x+3,y+1,7,4,P.cream);p(x+6,y,3,2,P.snow);}
function stone(p,x,y){p(x,y+1,4,2,P.stone);p(x+1,y,2,1,P.stoneLight);}
function distillery(p,x,y,size){ // Independently authored stage-specific pixel shapes.
 const q=(a,b,w,h,c)=>p(x+a,y+b,w,h,c);
 if(size===16){q(2,10,14,5,P.ink);q(3,11,12,3,P.cream);q(2,7,12,4,P.copperDark);q(4,5,9,5,P.copper);q(6,3,6,4,P.shine);q(7,1,3,3,P.copperDark);q(10,5,5,2,P.copperDark);q(14,6,2,5,P.copperDark);q(12,11,4,4,P.ink);q(13,12,2,2,P.waterLight);q(5,12,2,3,P.ink);q(8,11,2,3,P.blue);q(8,12,3,1,P.yellow);q(9,11,1,3,P.yellow);}
 else if(size===12){q(1,8,11,4,P.ink);q(2,9,9,2,P.cream);q(2,6,8,3,P.copperDark);q(3,4,7,4,P.copper);q(5,3,4,2,P.shine);q(6,1,2,3,P.copperDark);q(8,4,4,2,P.copperDark);q(11,5,1,4,P.copperDark);q(9,8,3,4,P.ink);q(10,9,2,2,P.waterLight);q(4,10,2,2,P.ink);q(6,9,2,2,P.blue);q(6,10,3,1,P.yellow);}
 else if(size===8){q(0,5,8,3,P.ink);q(1,6,6,1,P.cream);q(1,3,6,3,P.copper);q(2,2,4,2,P.shine);q(3,1,2,2,P.copperDark);q(6,3,2,1,P.copperDark);q(7,4,1,2,P.copperDark);q(3,6,2,2,P.blue);q(4,6,1,2,P.yellow);}
}
function shop(p,x,y,kind,size){const q=(a,b,w,h,c)=>p(x+a,y+b,w,h,c);
 if(size===12){q(0,5,12,7,P.ink);q(1,6,10,5,P.cream);q(1,2,10,5,kind==='liquor'?P.roof:P.grove);q(3,1,6,3,kind==='liquor'?P.copper:P.leafLight);q(2,8,3,4,P.ink);q(6,8,4,2,P.waterLight);if(kind==='liquor'){q(1,4,2,3,P.roof);q(2,5,1,2,P.cream)}else{q(1,6,10,2,P.cream);q(3,6,2,2,P.grove);q(7,6,2,2,P.grove)}}
 else{q(0,3,8,5,P.ink);q(1,4,6,3,P.cream);q(1,1,6,3,kind==='liquor'?P.roof:P.grove);q(2,0,4,2,kind==='liquor'?P.copper:P.leafLight);q(2,5,2,3,P.ink);q(5,5,2,2,P.waterLight);}
}
function house(p,x,y){p(x, y+3,6,5,P.ink);p(x+1,y+4,4,3,P.cream);p(x+1,y+1,4,3,P.roof);p(x+2,y,2,2,P.copper);p(x+3,y+5,1,3,P.ink);}
function first(p){backdrop(p);cloud(p,7,6);cloud(p,49,9);tree(p,8,36,1);tree(p,56,42,1);tree(p,7,57,1);tree(p,61,23,1);path(p,[[35,47],[35,53],[33,60],[34,68]],2);distillery(p,26,31,16);for(const a of [[43,22],[53,55],[18,62]])stone(p,...a);for(const a of [[22,30],[50,39],[16,51]])flower(p,...a);}
function second(p){backdrop(p);path(p,[[24,49],[36,50],[39,40],[51,32]],2);path(p,[[39,40],[45,56],[55,59]],2);tree(p,7,15,1);tree(p,28,10,1);tree(p,6,59,1);tree(p,63,36,1);distillery(p,13,36,12);shop(p,45,17,'liquor',12);shop(p,51,47,'super',12);for(const a of [[34,21],[18,27],[61,68]])stone(p,...a);flower(p,33,60);}
function third(p){backdrop(p);path(p,[[0,40],[69,40]],3);path(p,[[36,0],[36,69]],3);path(p,[[35,17],[70,17]],2);path(p,[[0,59],[35,59]],2);path(p,[[27,40],[27,31]],2);path(p,[[45,40],[45,29]],2);path(p,[[53,40],[53,49]],2);
 tree(p,7,9);tree(p,57,7);tree(p,7,47);tree(p,61,56);tree(p,28,57);
 for(const a of [[12,24],[27,12],[54,27],[14,56],[46,57]])house(p,...a);
 distillery(p,23,31,8);shop(p,43,22,'liquor',8);shop(p,49,46,'super',8);
}
function mountain(p,x,y){for(let i=0;i<6;i++){const span=i+1;p(x+6-span,y+i,span*2,1,P.mountain)}p(x+5,y+1,2,2,P.snow);p(x+4,y+3,2,1,P.snow);}
function village(p,x,y){p(x,y+2,5,4,P.ink);p(x+1,y,3,3,P.copper);p(x+2,y+4,1,2,P.cream);}
function fourth(p){backdrop(p);for(let y=0;y<72;y++){const x=52+Math.round(5*Math.sin(y/9));p(x,y,8,1,P.river);if(y%4===0)p(x+2,y,3,1,P.waterLight)}for(const a of [[4,8],[14,7],[24,10],[7,24],[17,25]])mountain(p,...a);for(const a of [[3,32],[15,40],[26,25],[33,16],[42,31],[11,54],[35,56],[45,57],[20,58]])tree(p,...a);
 path(p,[[1,38],[15,35],[28,38],[36,42],[46,50]],2);path(p,[[11,71],[18,56],[28,38],[36,23]],2);village(p,16,17);village(p,40,50);distillery(p,28,36,8);}
function fillIsle(p,cells,color){for(const [y,start,len] of cells)p(start,y,len,1,color);}
function fifth(p){p(0,0,72,72,P.sea);for(const [x,y]of[[6,6],[36,12],[57,48],[18,54],[4,38],[61,69]])p(x,y,3,1,P.waterLight);
 // All coastline spans are authored on the 72-row cell grid, not scaled polygons.
 const hokkaido=[[6,51,5],[7,48,10],[8,46,11],[9,44,12],[10,43,12],[11,45,10],[12,46,7],[13,48,5],[14,49,3]];
 const honshu=[[13,49,4],[14,48,5],[15,49,6],[16,50,5],[17,49,5],[18,47,7],[19,46,7],[20,45,7],[21,46,5],[22,44,7],[23,43,7],[24,42,7],[25,40,7],[26,39,7],[27,38,8],[28,37,7],[29,36,7],[30,34,8],[31,33,8],[32,31,8],[33,29,8],[34,28,8],[35,26,8],[36,24,8],[37,23,7],[38,21,7],[39,19,7],[40,17,7],[41,16,6],[42,14,7],[43,13,6],[44,11,7],[45,9,7],[46,9,6],[47,12,5]];
 const shikoku=[[46,18,11],[47,19,12],[48,21,8],[49,23,5]];
 const kyushu=[[46,10,7],[47,7,9],[48,6,10],[49,5,9],[50,4,8],[51,4,8],[52,6,7],[53,7,6],[54,8,5],[55,9,4]];
 for(const a of [hokkaido,honshu,shikoku,kyushu]){fillIsle(p,a.map(([y,x,w])=>[y,x-1,w+2]),P.beach);fillIsle(p,a,P.land);}
 for(const [x,y]of[[8,59],[10,63],[12,68],[6,71]])if(y<72)p(x,y,2,1,P.land);p(37,31,2,2,P.copper);p(38,31,1,1,P.cream);
}
function sixth(p){p(0,0,72,72,P.night);for(const [x,y]of[[8,11],[20,6],[56,14],[63,29],[10,46],[59,55],[21,64],[43,5],[5,63],[49,65],[67,8]])p(x,y,1,1,P.star);
 // Circle is drawn as cell rows, so edges never require sub-pixel rounding.
 for(let y=18;y<=54;y++){const dy=y-36;const span=Math.floor(Math.sqrt(Math.max(0,18*18-dy*dy)));if(span>0)p(36-span,y,2*span,1,y%7===0?P.river:P.sea);}
 const north=[[23,26,4],[24,24,7],[25,23,9],[26,22,9],[27,23,8],[28,22,8],[29,23,7],[30,25,5],[31,26,6],[32,28,4],[33,29,3],[34,29,2]];
 const south=[[35,34,4],[36,33,5],[37,33,5],[38,34,4],[39,35,5],[40,36,5],[41,36,5],[42,37,4],[43,38,3],[44,39,3],[45,40,2]];
 const east=[[25,43,7],[26,42,10],[27,41,12],[28,42,12],[29,43,10],[30,42,11],[31,42,10],[32,43,9],[33,45,6],[34,44,7],[35,44,6],[36,45,5],[37,46,4]];
 for(const a of [north,south,east])fillIsle(p,a,P.land);
 for(const [x,y,w]of[[28,22,7],[44,30,6],[26,42,7],[39,48,5]])p(x,y,w,2,P.cream);
}
export function renderMap(ctx,stage){stage=clampStage(stage);ctx.imageSmoothingEnabled=false;const p=painter(ctx);[first,second,third,fourth,fifth,sixth][stage-1](p);return stage;}