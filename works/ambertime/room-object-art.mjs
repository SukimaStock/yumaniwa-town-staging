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
 const black='#19141e',shadow='#8c542d';
 const pot=cells(black,[[13,10,10,4],[10,14,16,3],[7,17,22,3],[5,20,26,10],[7,30,22,2],[10,32,16,2]])
  +cells(copper,[[14,11,8,4],[11,15,14,3],[8,18,20,3],[6,21,24,8],[8,29,20,2]])
  +cells(shadow,[[23,21,7,8],[11,31,14,1]])
  +cells(black,[[8,31,20,2],[10,33,3,3],[23,33,3,3]]);
 // The neck rises once, then runs to a short downpipe above the receiver.
 const pipe=cells(dark,[[16,5,5,6],[18,3,5,3],[22,4,3,3],[24,6,3,3],[26,8,24,3],[48,10,3,6]])
  +cells(copper,[[17,6,3,5],[19,4,3,2],[22,5,2,2],[25,7,2,2],[27,9,23,1],[49,10,1,5]])
  +cells(light,[[18,6,1,4],[20,4,2,1],[28,9,18,1]]);
 const fitting=cells(black,[[18,23,4,4]]);
 const receiver=cells(glassEdge,[[42,20,14,1],[42,21,1,12],[55,21,1,12],[43,33,1,2],[54,33,1,2],[44,35,10,1]])
  +'<g class="receiver-liquid" data-liquid-bottom="34">'+rect(44,23,10,11,'#d8d0a7').replace('/>',' fill-opacity=".68"/>')+rect(44,23,10,1,'#e7ddb6').replace('/>',' fill-opacity=".8"/>')+'</g>'
  +cells('#d4d7bf',[[44,22,1,5],[45,34,3,1]]);
 const stream='<g class="distill-stream">'+cells('#ded7b5',[[49,16,1,1],[49,18,1,1]])+'</g>';
 const steam='<g class="still-steam">'+cells('#c1b79a',[[10,5,1,1],[11,2,1,2],[13,0,1,1]])+'</g>';
 return svg('still',60,36,'<g class="still-pipe">'+pipe+'</g><g class="still-pot">'+pot+fitting+'</g>'+receiver+stream+steam);
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
