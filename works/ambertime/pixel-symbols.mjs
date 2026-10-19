// Identical seven-cell glyphs for Canvas and native buttons; no font dependency.
export const SYMBOLS=Object.freeze({person:['0011100','0011100','0001000','0111110','1101011','0010100','0110110'],play:['1000000','1110000','1111100','1111111','1111100','1110000','1000000'],pause:Array(7).fill('0100010'),close:['1000001','0100010','0010100','0001000','0010100','0100010','1000001']});
export function drawSymbol(ctx,kind,x,y,cell=3,color='#f0e6c8'){
 ctx.fillStyle=color;SYMBOLS[kind].forEach((row,dy)=>[...row].forEach((value,dx)=>{if(value==='1')ctx.fillRect(x+dx*cell,y+dy*cell,cell,cell);}));
}
export function symbolMarkup(kind){return '<svg class="pixel-icon" viewBox="0 0 7 7" aria-hidden="true" focusable="false" shape-rendering="crispEdges">'+SYMBOLS[kind].map((row,y)=>[...row].map((value,x)=>value==='1'?`<rect x="${x}" y="${y}" width="1" height="1"/>`:'').join('')).join('')+'</svg>';}
