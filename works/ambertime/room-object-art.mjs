// Main-room objects share an integer cell grid with the room furniture.
// Codea's copper/wood/metal palette and stepped silhouettes inform the drawing;
// the existing Web liquid thresholds, opacity and authored variants stay intact.
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
const svg=(kind,w,h,body)=>`<svg class="room-object room-${kind}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const cells=(color,areas)=>areas.map(([x,y,w,h])=>rect(x,y,w,h,color)).join('');
const metal='#414644',metalLight='#8b8b70',glassEdge='#b9c0aa';

export function stillArt(){
 const dark='#503214',copper='#b87333',light='#dca050';
 // Pot, swan neck, horizontal condenser and receiver meet a single bench plane.
 const pot=cells(dark,[[8,23,34,17],[11,19,28,4],[15,16,20,3],[18,13,14,3],[6,27,38,9],[10,40,30,3],[14,43,22,2]])
  +cells(copper,[[9,25,32,14],[12,21,26,4],[16,18,18,3],[19,15,12,3],[8,28,34,7],[12,39,26,2],[16,41,18,2]])
  +cells(light,[[11,26,2,10],[14,23,3,2],[18,20,5,1]])
  +cells(metal,[[9,37,32,2],[14,44,3,4],[33,44,3,4]])
  +cells(metalLight,[[11,37,28,1]]);
 const pipe=cells(dark,[[22,6,7,9],[25,4,7,3],[30,5,4,3],[33,7,4,3],[36,9,25,4],[59,11,4,15]])
  +cells(copper,[[23,7,5,7],[26,5,5,2],[30,6,3,2],[33,8,3,2],[36,10,25,2],[60,12,2,13]])
  +cells(light,[[24,7,1,6],[27,5,3,1],[37,10,22,1]]);
 const fitting=cells(dark,[[23,28,5,5]])+cells(metalLight,[[24,29,3,3]])+rect(25,30,1,1,metal);
 const receiver=cells(glassEdge,[[51,30,16,1],[51,31,1,13],[66,31,1,13],[52,44,1,2],[65,44,1,2],[53,46,12,2]])
  +'<g class="receiver-liquid">'+rect(53,33,12,12,'#d8d0a7').replace('/>',' fill-opacity=".68"/>')+rect(53,45,12,1,'#d8d0a7').replace('/>',' fill-opacity=".68"/>')+rect(53,33,12,1,'#e7ddb6').replace('/>',' fill-opacity=".8"/>')+'</g>'
  +cells('#d4d7bf',[[53,32,1,6],[54,46,4,1]]);
 const stream='<g class="distill-stream">'+cells('#ded7b5',[[60,26,1,2],[60,29,1,2]])+'</g>';
 const steam='<g class="still-steam">'+cells('#c1b79a',[[16,5,1,2],[17,2,1,2],[19,0,1,2]])+'</g>';
 return svg('still',72,48,pipe+pot+fitting+receiver+stream+steam);
}

export function glass(wood=0,{sample=false}={}){
 const color=wood>.65?'#ad743a':wood>.3?'#d79743':wood>.1?'#dfb262':'#dfd2a8';
 const liquid='<g fill-opacity=".82">'+rect(2,9,8,3,color)+rect(3,12,6,1,color)+rect(4,13,4,1,color)+'</g>'+rect(2,9,8,1,color);
 const outline=cells(glassEdge,[[3,1,6,1],[2,2,1,4],[9,2,1,4],[1,6,1,6],[10,6,1,6],[2,12,1,1],[9,12,1,1],[3,13,1,1],[8,13,1,1],[4,14,4,1],[5,15,2,2],[2,17,8,1]])
  +rect(3,3,1,3,'#e3d9bc');
 return svg('glass',12,18,(sample?'<g class="sample-liquid">'+liquid+'</g>':liquid)+outline);
}

function bottleBody(slender,color,opacity){
 const body=slender?[[5,4,2,6],[4,10,4,2],[3,12,6,15],[4,27,4,1]]:[[4,4,4,5],[3,9,6,2],[2,11,8,1],[1,12,10,15],[2,27,8,1]];
 return `<g fill-opacity="${opacity}">${cells(color,body)}</g>`;
}
function bottleOutline(slender){
 return cells('#8f9a7d',slender?[[4,4,1,6],[7,4,1,6],[3,10,1,2],[8,10,1,2],[2,12,1,15],[9,12,1,15],[3,27,6,1]]:[[3,4,1,5],[8,4,1,5],[2,9,1,2],[9,9,1,2],[1,11,1,1],[10,11,1,1],[0,12,1,15],[11,12,1,15],[1,27,10,1]]);
}
function bottle(wood,brand,full){
 const color=wood>.6?'#946332':wood>.2?'#bb8542':'#ccad6d';
 const slender=brand.bottle==='slender',dark=brand.label==='dark';
 const labelX=slender?3:1,labelW=slender?6:10;
 const liquid=full?bottleBody(slender,color,.8):'<g fill-opacity=".85">'+rect(1,13,10,14,color)+'</g>';
 const label=cells(dark?'#303e3a':'#d9cba4',dark?[[labelX+1,16,labelW-2,1],[labelX,17,labelW,4],[labelX+1,21,labelW-2,1]]:[[labelX,16,labelW,6]])
  +cells(dark?'#d5c098':'#786343',[[4,18,4,1],[4,20,3,1]]);
 return svg('bottle',12,28,bottleBody(slender,'#a9b690',.12)+liquid+bottleOutline(slender)+cells('#94734c',[[4,0,4,3]])+rect(4,0,4,1,'#c8a078')+label+cells('#e2d6a8',[[slender?4:2,12,1,3],[slender?4:2,24,1,2]]));
}
export function bottleArt(wood=0){return bottle(wood,{},false);}
export function brandArt(wood=0,brand={}){return bottle(wood,brand,true);}
