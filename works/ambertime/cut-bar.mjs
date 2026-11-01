// Read-only C bar. These color-only functions match Lab #741, not a second taste model.
const assert=(ok,message)=>{if(!ok)throw Error(message);};
export function streamProfile(position,{malt='plain',ferment='long'}={}){
 assert(Number.isFinite(position)&&position>=0&&position<=99,'位置を確認');
 assert(['plain','peat'].includes(malt)&&['short','long'].includes(ferment),'仕込みを確認');
 const x=position/99,bell=(c,w)=>Math.exp(-(((x-c)/w)**2)),long=ferment==='long';
 return {fruit:.12+(long?.86:.43)*bell(.34,.29),grain:.19+(long?.42:.77)*bell(.56,.33),body:.15+.91*bell(.79,.30),spice:.11+.69*bell(.91,.24),rough:.19+.50*bell(.08,.22)+.49*bell(.95,.22),smoke:malt==='peat'?.56+.18*bell(.58,.35):.055,wood:0,vanilla:0};
}

// Equal-luminance-ish symbolic family palette, not the color of spirit or score.
export const FAMILY_COLORS={fruit:[197,143,164],grain:[195,173,107],smoke:[132,148,178],body:[108,166,160]};
export function colorForProfile(p){const ids=Object.keys(FAMILY_COLORS),sum=ids.reduce((n,k)=>n+p[k]**2,0);return '#'+[0,1,2].map(i=>Math.round(ids.reduce((n,k)=>n+FAMILY_COLORS[k][i]*p[k]**2,0)/sum).toString(16).padStart(2,'0')).join('');}

// Display quantization only: never feeds the 48-point flavor or saved state.
export const BAR_RENDER_VARIANTS=Object.freeze(['continuous','columns','dither','components']);
const hex=rgb=>'#'+rgb.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('');
const rgbForProfile=p=>colorForProfile(p).slice(1).match(/../g).map(n=>parseInt(n,16));
export function cutCellColor(profile,{variant='columns',column=0,row=0}={}){
 if(!BAR_RENDER_VARIANTS.includes(variant))throw Error('バー描画方式を確認');
 const rgb=rgbForProfile(profile);
 if(variant==='continuous')return hex(rgb);
 if(variant==='components'){
  const families=Object.keys(FAMILY_COLORS).sort((a,b)=>profile[b]-profile[a]);
  const weight=profile[families[1]]**2/(profile[families[0]]**2+profile[families[1]]**2);
  return hex(FAMILY_COLORS[((column+row*2)%4)/4<weight?families[1]:families[0]]);
 }
 // A small shared RGB lattice makes the continuous stream visibly stepped.
 // Its boundaries follow the profile, never fixed head/heart/tail positions.
 const quantum=16;
 if(variant==='columns')return hex(rgb.map(n=>Math.round(n/quantum)*quantum));
 // Fixed two-row ordered dither: no random source or frame-dependent phase.
 const threshold=([.125,.625,.875,.375][(column%2)+row%2*2]);
 return hex(rgb.map(n=>Math.floor(n/quantum)*quantum+(n%quantum/quantum>threshold?quantum:0)));
}

export function drawCutBar(rect,g,condition={}, {variant='columns'}={}){
 const point=n=>g.x+Math.round(n*g.w/3)*3,rangePosition=n=>99*n;
 for(let x=0;x<g.w;x+=3){
  const profile=streamProfile(rangePosition(x/g.w),condition);
  if(variant==='continuous'||variant==='columns')rect(g.x+x,g.y,Math.min(3,g.w-x),g.h,cutCellColor(profile,{variant,column:x/3}));
  else for(let y=0;y<g.h;y+=3)rect(g.x+x,g.y+y,Math.min(3,g.w-x),Math.min(3,g.h-y),cutCellColor(profile,{variant,column:x/3,row:y/3}));
 }
 const stop=g.end??g.current;
 if(g.start!==null){rect(g.x,g.y,Math.max(0,point(g.start)-g.x),g.h,'#191a29aa');rect(point(stop)+3,g.y,Math.max(0,g.x+g.w-point(stop)-3),g.h,'#191a29aa');rect(point(g.start),g.y+g.h+3,Math.max(3,point(stop)-point(g.start)+3),3,'#f0e6c8');for(let x=point(g.start);x<=point(stop);x+=9)rect(x,g.y+g.h+6,3,3,'#f0e6c8');}
 for(const [kind,n] of [['start',g.start],['end',g.end]])if(n!==null){rect(point(n)-3,kind==='start'?g.y+g.h+6:g.y-9,9,3,'#f0e6c8');}
 rect(point(g.current)-3,g.y-6,9,3,'#f0e6c8');
 return {...g,palette:'family-mixture',renderVariant:variant,currentX:point(g.current),startX:g.start===null?null:point(g.start),endX:g.end===null?null:point(g.end)};
}
