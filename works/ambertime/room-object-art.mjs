// Main-room objects share an integer cell grid with the room furniture.
// Codea's copper/wood/metal palette and stepped silhouettes inform the drawing;
// the existing Web liquid thresholds, opacity and authored variants stay intact.
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
const svg=(kind,w,h,body)=>`<svg class="room-object room-${kind}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const cells=(color,areas)=>areas.map(([x,y,w,h])=>rect(x,y,w,h,color)).join('');
const glassEdge='#b9c0aa';

export function stillArt(){
 const dark='#503214',copper='#b87333',light='#dca050';
 // Native cells: 60 × 36. At the room's 3 px grid the whole set is 180 × 108.
 // A low, rounded pot and a separate clear receiver share the y36 bench plane.
 // Native16×16: one source pixel is one cell, with no resizing or resampling.
 // Keep the original small silhouette and the existing bench plane at y36.
 // The old Web pipe owns the cap connection; there is no independent black contour.
 const rows=["......CCCC......", ".....CCCCC......", "....CCBBCCC.....", "....CBBCCCC.....", "...CCCCCCCC.....", "..CCCCCCCCCC....", ".CCCBBBCCCCCC...", ".CCBBFBBCCCCC...", "CCCBFFFBCWWCCC..", "CCCBBFBBCWWCCC..", "CCCCBBBCCCCCCC..", "CCCCCCCCCCCCCC..", ".CCCCCCCCCCCC...", ".SSSSSSSSSSSS...", ".SWWSSRRSSWWS...", ".SSSSSRRSSSSS..."];
 const palette={C:copper,B:'#29adff',F:'#ffff64',W:'#3c281e',S:'#5a5a64',R:'#ab5236'};
 const edge=n=>n;
 const pot=rows.map((row,y)=>[...row].map((cell,x)=>cell==='.'?'':rect(10+edge(x),20+edge(y),edge(x+1)-edge(x),edge(y+1)-edge(y),cell==='C'&&x>=12?'#a3632d':palette[cell])).join('')).join('');
 // Short neck and arm are authored on the same native cell grid as the pot.
 const pipe=cells(dark,[[16,17,3,4],[17,15,4,3],[20,16,3,3],[22,18,3,3],[24,19,11,3],[33,21,2,3]])
  +cells(copper,[[17,17,1,4],[18,16,3,1],[21,17,1,2],[23,19,1,2],[24,20,10,1],[34,21,1,3]])
  +cells(light,[[18,16,2,1],[25,20,7,1]]);
 const connection='';
 // Body, cyan/yellow window-like highlight, hatch, stone furnace and log ends
 // are already in source order above; the original cap at y20 meets the shorter neck directly.
 const fitting='';
 // A10×9 receiver sits on the same y36 bench; its interior ends at y34.
 const receiver=cells(glassEdge,[[29,27,10,1],[29,28,1,6],[38,28,1,6],[30,34,1,1],[37,34,1,1],[31,35,6,1]])
  +'<g class="receiver-liquid" data-liquid-bottom="34">'+rect(31,29,6,5,'#d8d0a7').replace('/>',' fill-opacity=".68"/>')+rect(31,29,6,1,'#e7ddb6').replace('/>',' fill-opacity=".8"/>')+'</g>'
  +cells('#d4d7bf',[[31,28,1,3],[32,34,2,1]]);
 const stream='<g class="distill-stream">'+cells('#ded7b5',[[34,24,1,1],[34,26,1,1]])+'</g>';
 const steam='<g class="still-steam">'+cells('#c1b79a',[[15,14,1,1],[16,11,1,2],[18,9,1,1]])+'</g>';
 return svg('still',60,36,'<g class="still-pipe">'+pipe+'</g><g class="still-connection">'+connection+'</g><g class="still-pot">'+pot+fitting+'</g>'+receiver+stream+steam);
}

export function glass(wood=0,{sample=false}={}){
 const color=wood>.65?'#ad743a':wood>.3?'#d79743':wood>.1?'#dfb262':'#dfd2a8';
 // Tulip bowl, narrow stem and broad foot remain readable at 30 × 42 px.
 const liquid='<g fill-opacity=".82">'+rect(2,6,6,3,color)+rect(3,9,4,1,color)+'</g>'+rect(2,6,6,1,color);
 const outline=cells(glassEdge,[[3,0,4,1],[2,1,1,3],[7,1,1,3],[1,4,1,5],[8,4,1,5],[2,9,1,1],[7,9,1,1],[3,10,4,1],[4,11,2,2],[2,13,6,1]])
  +rect(3,2,1,2,'#e3d9bc');
 return svg('glass',10,14,(sample?'<g class="sample-liquid" data-liquid-bottom="10">'+liquid+'</g>':liquid)+outline);
}

function bottleBody(slender,color,opacity){
 const body=slender?[[5,4,2,6],[4,10,4,2],[3,12,6,15],[4,27,4,1]]:[[4,4,4,5],[3,9,6,2],[2,11,8,1],[1,12,10,15],[2,27,8,1]];
 return `<g fill-opacity="${opacity}">${cells(color,body)}</g>`;
}
function bottleOutline(slender){
 return cells('#19141e',slender?[[4,4,1,6],[7,4,1,6],[3,10,1,2],[8,10,1,2],[2,12,1,15],[9,12,1,15],[3,27,6,1]]:[[3,4,1,5],[8,4,1,5],[2,9,1,2],[9,9,1,2],[1,11,1,1],[10,11,1,1],[0,12,1,15],[11,12,1,15],[1,27,10,1]]);
}
function bottle(wood,brand,full){
 const color=wood>.6?'#946332':wood>.2?'#bb8542':'#ccad6d';
 const slender=brand.bottle==='slender',dark=brand.label==='dark';
 const labelX=slender?3:1,labelW=slender?6:10;
 const liquid=full?bottleBody(slender,color,.8):'<g fill-opacity=".85">'+rect(1,13,10,14,color)+'</g>';
 const label=rect(labelX,16,labelW,6,dark?'#303e3a':'#d9cba4')
  +rect(4,18,4,1,dark?'#d5c098':'#786343');
 return svg('bottle',12,28,bottleBody(slender,'#a9b690',.12)+liquid+bottleOutline(slender)+rect(4,0,4,3,'#19141e')+rect(5,1,2,2,'#94734c')+label);
}
export function bottleArt(wood=0){return bottle(wood,{},false);}
export function brandArt(wood=0,brand={}){return bottle(wood,brand,true);}
