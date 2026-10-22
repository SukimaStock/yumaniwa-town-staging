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
// Stage 4: fixed regional layout. All mountains, woods, rivers, villages and
// bridge use authored cell coordinates, not miniature versions of town sprites.
function mountain(p,x,y){for(let i=0;i<7;i++){const span=i+1;p(x+7-span,y+i,span*2,1,i<4?P.mountain:P.stone)}p(x+5,y+2,4,1,P.snow);p(x+6,y+1,2,1,P.snow);p(x+6,y+4,2,2,P.stoneLight);}
function pine(p,x,y){p(x+2,y+5,2,3,P.trunk);p(x+1,y+2,4,5,P.grove);p(x,y+4,6,2,P.ink);p(x+1,y+1,4,4,P.leaf);p(x+2,y,2,2,P.leafLight);}
function hamlet(p,x,y){p(x,y+3,6,4,P.ink);p(x+1,y+4,4,2,P.cream);p(x+1,y+2,4,2,P.copper);p(x+2,y+1,2,2,P.roof);p(x+3,y+5,1,2,P.ink);}
function river(p){for(const [y,x,w] of [
[0,58,5],[1,58,5],[2,57,5],[3,57,5],[4,56,5],[5,56,5],[6,55,5],[7,55,5],[8,54,5],[9,54,5],
[10,54,5],[11,55,5],[12,55,5],[13,56,5],[14,57,5],[15,58,5],[16,58,5],[17,59,5],[18,59,5],
[19,58,5],[20,57,5],[21,56,5],[22,56,5],[23,55,5],[24,54,5],[25,54,5],[26,53,5],[27,53,5],
[28,52,5],[29,51,5],[30,50,5],[31,50,5],[32,50,5],[33,51,5],[34,52,5],[35,53,5],[36,54,5],
[37,55,5],[38,56,5],[39,57,5],[40,58,5],[41,58,5],[42,58,5],[43,57,5],[44,56,5],[45,55,5],
[46,54,5],[47,53,5],[48,52,5],[49,51,5],[50,50,5],[51,50,5],[52,51,5],[53,52,5],[54,53,5],
[55,54,5],[56,55,5],[57,56,5],[58,56,5],[59,56,5],[60,55,5],[61,54,5],[62,53,5],
[63,52,5],[64,52,5],[65,53,5],[66,54,5],[67,55,5],[68,56,5],[69,56,5],[70,57,5],[71,58,5]]){p(x,y,w,1,P.river);if(y%5===0)p(x+1,y,2,1,P.waterLight);}}
function fourth(p){
 backdrop(p);
 // Northwest ridge, with dark foothills and a few snowy caps.
 for(const [x,y] of [[2,10],[11,7],[20,10],[6,20],[16,22]])mountain(p,x,y);
 for(const [x,y] of [[30,7],[37,6],[44,9],[33,14],[41,15],[7,44],[14,46],[5,55],[13,58],[20,53],[25,62],[32,49],[39,27],[22,31]])pine(p,x,y);
 river(p);
 // Narrow routes connect the distillery with two representative settlements.
 path(p,[[32,39],[37,35],[44,26],[46,20]],2);
 path(p,[[32,40],[25,45],[19,49],[15,54]],2);
 path(p,[[32,39],[42,41],[50,43],[57,44],[63,47]],2);
 // A short bridge crosses the river, not a representation of actual gossip routes.
 p(55,43,8,2,P.roadLight);p(56,42,2,1,P.stoneLight);p(61,42,2,1,P.stoneLight);
 hamlet(p,43,17);hamlet(p,12,53);hamlet(p,61,48);
 // The map-scale distillery is a dedicated five-cell mark.
 p(30,36,6,5,P.ink);p(31,37,4,3,P.cream);p(31,34,4,3,P.copper);p(32,33,2,2,P.shine);
 p(33,38,1,2,P.blue);p(33,38,1,1,P.yellow);
}
// Stage 5: explicitly authored island rows. Coastline stays one native cell wide.
function island(p,rows){for(const [y,x,w] of rows){p(x-1,y,w+2,1,P.beach);p(x,y,w,1,P.land);}}
function fifth(p){
 p(0,0,72,72,P.sea);
 for(const [x,y] of [[8,8],[23,10],[38,11],[62,38],[4,48],[52,61],[19,70]])p(x,y,3,1,P.waterLight);
 // Hokkaido – independent from the slender northern end of Honshu.
 island(p,[[7,55,4],[8,52,8],[9,50,10],[10,49,12],[11,48,12],[12,49,11],[13,50,9],[14,52,7],[15,53,5],[16,54,3]]);
 // Honshu – a recognizable slanted continuous island running northeast to southwest.
 island(p,[[19,52,4],[20,51,5],[21,50,6],[22,49,6],[23,48,6],[24,48,5],
 [25,47,6],[26,45,7],[27,44,7],[28,44,6],[29,42,7],[30,40,8],[31,39,8],[32,37,8],
 [33,36,8],[34,34,9],[35,32,9],[36,30,9],[37,29,8],[38,27,8],[39,25,8],
 [40,23,8],[41,21,8],[42,20,7],[43,19,7],[44,17,7],[45,15,7],[46,13,7],
 [47,11,7],[48,10,7],[49,10,6],[50,11,5]]);
 // Shikoku, slightly to the south of western Honshu.
 island(p,[[52,24,7],[53,23,9],[54,24,8],[55,25,5]]);
 // Kyushu, west/southwest of Honshu; visibly detached from Shikoku.
 island(p,[[50,12,4],[51,10,7],[52,9,8],[53,8,9],[54,7,9],[55,7,8],[56,8,7],
 [57,9,6],[58,9,6],[59,10,5],[60,11,4],[61,12,3],[62,12,2]]);
 for(const [x,y] of [[10,65],[8,68],[5,70]])p(x,y,2,1,P.land);
 // Low-detail mountain symbols; no prefecture boundary or fabricated city pins.
 for(const [x,y] of [[51,12],[48,28],[39,33],[30,38],[18,47]]){p(x,y,2,1,P.grove);p(x+1,y-1,1,1,P.stoneLight);}
 // One schematic home point in central Honshu; it is NOT a real prefecture.
 p(34,35,2,2,P.copper);p(35,35,1,1,P.cream);
}
// Stage 6: East Asia-facing Earth on its own 72-row cell artwork.
function sixth(p){
 p(0,0,72,72,P.night);
 for(const [x,y] of [[8,11],[20,6],[56,14],[63,29],[10,46],[59,55],[21,64],[43,5],[5,63],[49,65],[67,8],[15,30]])p(x,y,1,1,P.star);
 const spans=[];
 for(let y=18;y<=54;y++){
  const delta=y-36;const half=Math.floor(Math.sqrt(Math.max(0,18*18-delta*delta)));
  if(half>0){p(36-half,y,half*2,1,y%9===0?P.river:P.sea);spans.push([y,36-half,half*2]);}
 }
 // Eurasia appears on the upper right; the continent silhouettes do not leave the sphere.
 const asia=[[22,39,3],[23,37,7],[24,36,10],[25,35,12],[26,35,13],[27,36,13],
 [28,37,12],[29,38,12],[30,38,12],[31,39,11],[32,39,10],[33,40,9],[34,41,8],[35,41,7],[36,42,6],
 [37,42,5],[38,44,3]];
 const australia=[[43,42,3],[44,40,6],[45,39,8],[46,39,9],[47,40,8],[48,41,6],[49,43,4]];
 const africa=[[32,27,4],[33,26,6],[34,26,7],[35,27,7],[36,28,6],[37,29,5],[38,29,4],[39,30,3],[40,31,2]];
 for(const [y,x,w] of [...asia,...australia,...africa]){
  const d=y-36,half=Math.floor(Math.sqrt(Math.max(0,18*18-d*d)));
  if(half>0){const left=Math.max(x,36-half),right=Math.min(x+w,36+half);if(right>left)p(left,y,right-left,1,P.land);}
 }
 // A compact Japanese archipelago separated by ocean from the continental coast.
 for(const [x,y] of [[49,29],[50,30],[50,32],[49,34],[48,35]])p(x,y,1,1,P.beach);
 // Thin cloud rows follow the same one-cell grid.
 for(const [x,y,w] of [[28,26,7],[39,24,6],[32,42,5],[43,48,5]])p(x,y,w,1,P.cream);
 // Home-location dot is symbolic, not a precise geolocation.
 p(49,33,1,1,P.shine);
}
export function renderMap(ctx,stage){stage=clampStage(stage);ctx.imageSmoothingEnabled=false;const p=painter(ctx);[first,second,third,fourth,fifth,sixth][stage-1](p);return stage;}