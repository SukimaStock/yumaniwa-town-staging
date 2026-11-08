// Shared pixel glyphs for Canvas and native buttons; no font dependency.
// Codea Atelier imports are color-indexed source artwork, top row first.
const ATELIER_SOURCE=Object.freeze({
 map:{w:11,h:11,rle:'BAJLBABLCMBLDMBdCMCLCMBLDMBdBLBMCLCMBLGdCLCMBLBMBdBMBdCMCLCMBLBMBdBMBdCMCLCMBLBMBdCMBdBMCLCMBLBMBdCMBdBMFLBMBdBLCMBdCLCbBLBMBdDMBdBLBAJLBA',colors:{11:'#644632',12:'#a0785a',27:'#b69a65',29:'#e7dcc0'}},
 handshake:{w:11,h:11,rle:'BAIRDABRGABRDABRBAERBABRDABRGABRDABRBAERBABRBABRBABRGACRCABRBAERBABRDABRFABREABRBADRCABRDABRGABRDAIRCA',colors:{17:'#f0e6c8'}},
 pause:{w:7,h:7,rle:'IABRDABRCABRDABRCABRDABRCABRDABRCABRDABRIA',colors:{17:'#f0e6c8'}},
 stock:{w:7,h:7,rle:'CADREABRBABRDAFRCAFRCAFRCAFRCAFRBA',colors:{17:'#f0e6c8'}},
 person:{w:7,h:7,rle:'CADLDABLDRBLCABLDRBLCABLDRBLDABLBRBLDABLDRBLCABLDRBLBA',colors:{11:'#644632',17:'#f0e6c8'}},
 store:{w:11,h:11,rle:'BAJLBABLJcNLJdCLCdCbBdCbCdCLCdCbBdCbCdCLJdCLCdCbBdCbCdCLCdCbBdCbCdCLJdML',colors:{11:'#644632',27:'#b69a65',28:'#e4c58a',29:'#e7dcc0'}}
});
const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function unpack(source){
 const result=[];
 for(let i=0;i<source.rle.length;i+=2){
  const count=ALPHABET.indexOf(source.rle[i]),value=ALPHABET.indexOf(source.rle[i+1]);
  if(count<1||value<0)throw Error('Invalid Atelier sprite encoding');
  for(let j=0;j<count;j++)result.push(value);
 }
 if(result.length!==source.w*source.h)throw Error('Invalid Atelier sprite size');
 return Object.freeze(Array.from({length:source.h},(_,y)=>Object.freeze(result.slice(y*source.w,(y+1)*source.w))));
}
const ATELIER=Object.freeze(Object.fromEntries(Object.entries(ATELIER_SOURCE).map(([k,v])=>[k,unpack(v)])));
const LEGACY={chevronRight:['100','010','001','010','100'],chevronDown:['10001','01010','00100'],map:['01110001110','11011111001','11010001001','11010101001','11010001001','11010001001','11010101001','11010001001','11010001001','01111111110','00010001000'],handshake:['00000000000','00000110000','11001111011','11111001111','01101010110','00110101000','00011010100','00001101000','00000110000','00000000000','00000000000'],store:['00000000000','01111111110','01111111110','01100100110','01100100110','01111111110','01100100110','01100100110','01111111110','01111111110','00000000000'],clock:['0011100','0100010','1001001','1001101','1000001','0100010','0011100'],stock:['0011100','0010100','0111110','0100010','0111110','0100010','0111110'],person:['0011100','0011100','0001000','0111110','1101011','0010100','0110110'],fast:['1000100','1100110','1110111','1110111','1110111','1100110','1000100'],play:['1000000','1110000','1111100','1111111','1111100','1110000','1000000'],pause:Array(7).fill('0100010'),close:['1000001','0100010','0010100','0001000','0010100','0100010','1000001']};
export const SYMBOLS=Object.freeze({...LEGACY,...Object.fromEntries(Object.entries(ATELIER).map(([name,rows])=>[name,Object.freeze(rows.map(row=>row.map(v=>v?'1':'0').join('')))]))});
const roofAccent=Object.freeze({x:5,y:1,color:'#bf7950'});
const cellColor=(kind,x,y,defaultColor)=>{
 const value=ATELIER[kind]?.[y]?.[x];
 if(value)return ATELIER_SOURCE[kind].colors[value]??defaultColor;
 return kind==='store'&&x===roofAccent.x&&y===roofAccent.y?'#bf7950':defaultColor;
};
export function drawSymbol(ctx,kind,x,y,cell=3,color='#f0e6c8'){
 const rows=SYMBOLS[kind];if(!rows)return;
 rows.forEach((row,dy)=>[...row].forEach((value,dx)=>{if(value==='1'){ctx.fillStyle=cellColor(kind,dx,dy,color);ctx.fillRect(x+dx*cell,y+dy*cell,cell,cell);}}));
}
export function symbolMarkup(kind){
 const rows=SYMBOLS[kind];if(!rows)return '';
 return '<svg class="pixel-icon" data-symbol="'+kind+'" viewBox="0 0 '+rows[0].length+' '+rows.length+'" aria-hidden="true" focusable="false" shape-rendering="crispEdges">'+rows.map((row,y)=>[...row].map((value,x)=>value==='1'?'<rect x="'+x+'" y="'+y+'" width="1" height="1"'+(ATELIER[kind]?' fill="'+cellColor(kind,x,y,'#f0e6c8')+'"':kind==='store'&&x===roofAccent.x&&y===roofAccent.y?' style="fill:#bf7950"':'')+'/>':'').join('')).join('')+'</svg>';
}

// Keep native details semantics and accessible text; replace only the UA marker.
export function disclosureSymbols(root){
 for(const summary of root.querySelectorAll('details > summary'))if(!summary.querySelector(':scope > .pixel-disclosure'))summary.insertAdjacentHTML('afterbegin','<span class="pixel-disclosure" aria-hidden="true">'+symbolMarkup('chevronRight')+symbolMarkup('chevronDown')+'</span>');
}
