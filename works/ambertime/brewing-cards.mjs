// Native 16x16, top row first. Colors follow the existing Codea casks and room.
const ear=[
 '................','........1.......','.......121......','.......121......',
 '.....12121......','.....1221.......','......12121.....','.....121221.....',
 '.....1221.......','......12121.....','.......1221.....','.......21.......',
 '......21........','......21........','.....21.........','................'
];
const active=[
 '................','................','................','.......33.......',
 '...3...33.......','...3.......3....','..........33....','.....33.........',
 '....3333.33.....','...333333333....','..222222222222..','...1111111111...',
 '................','................','................','................'
];
const calm=[
 '................','................','................','................',
 '................','................','...........3....','................',
 '.....33.........','.....33.........','..222222222222..','...1111111111...',
 '................','................','................','................'
];
const icon=(rows,colors)=>Object.freeze({rows:Object.freeze([...rows]),colors:Object.freeze(colors)});
export const BREWING_CARDS=Object.freeze([
 Object.freeze({group:'malt',value:'plain',label:'ふつうの麦芽',icon:icon(ear,{'1':'#9d692f','2':'#e4b55e'})}),
 Object.freeze({group:'malt',value:'peat',label:'ピート麦芽',icon:icon(ear.map((row,y)=>y===2?row.slice(0,12)+'3'+row.slice(13):y===4?row.slice(0,13)+'3'+row.slice(14):row),{'1':'#684632','2':'#ad743a','3':'#8c8c96'})}),
 Object.freeze({group:'ferment',value:'short',label:'短い発酵',icon:icon(active,{'1':'#b88243','2':'#e4b55e','3':'#f0e6c8'})}),
 Object.freeze({group:'ferment',value:'long',label:'長い発酵',icon:icon(calm,{'1':'#684632','2':'#b88243','3':'#f0e6c8'})})
]);
export function longFermentationUnlocked(state){
 for(let s=state;s;s=s.origin){
  if(s.staffExperience?.manualFills>0||s.operations?.some(o=>o.key==='fill'))return true;
 }
 return false;
}
// UI only: never rewrite old journals, active runs or saved recipes.
export function manualCards(state){
 const cards=state.labConnection.cards;
 return {...cards,ferment:longFermentationUnlocked(state)?cards.ferment:'short'};
}
export function chooseManualCard(state,group,value){
 const card=BREWING_CARDS.find(c=>c.group===group&&c.value===value);
 if(!card||value==='long'&&!longFermentationUnlocked(state))return null;
 return {...manualCards(state),[group]:value};
}
export function drawBrewingIcon(ctx,value){
 const {rows,colors}=BREWING_CARDS.find(c=>c.value===value).icon;
 ctx.clearRect(0,0,16,16);ctx.imageSmoothingEnabled=false;
 rows.forEach((row,y)=>[...row].forEach((cell,x)=>{if(colors[cell]){ctx.fillStyle=colors[cell];ctx.fillRect(x,y,1,1);}}));
}
export function drawCardLock(ctx){
 ctx.clearRect(0,0,7,8);ctx.fillStyle='#c8c8dc';
 ['..111..','.1...1.','.1...1.','1111111','1110111','1110111','1111111','.......'].forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='1')ctx.fillRect(x,y,1,1);}));
}
export function brewingCardsMarkup(state){
 const cards=manualCards(state),unlocked=longFermentationUnlocked(state);
 return '<div class="flavor-cards">'+[['malt','麦芽'],['ferment','発酵']].map(([group,label])=>'<h3>'+label+'</h3>'+BREWING_CARDS.filter(c=>c.group===group).map(c=>{
  const locked=c.value==='long'&&!unlocked;
  return '<button type="button" data-action="flavor-card" data-group="'+group+'" data-id="'+c.value+'" aria-pressed="'+(cards[group]===c.value)+'"'+(locked?' disabled title="初めて自分でたる詰めすると解放" aria-label="長い発酵・初めて自分でたる詰めすると解放"':'')+'><canvas class="brewing-icon" width="16" height="16" data-brewing-icon="'+c.value+'" aria-hidden="true"></canvas><span class="brewing-name">'+c.label+'</span>'+(locked?'<canvas class="card-lock" width="7" height="8" aria-hidden="true"></canvas>':'')+'</button>';
 }).join('')).join('')+'</div>';
}
export function renderBrewingIcons(root){
 for(const canvas of root.querySelectorAll('[data-brewing-icon]'))drawBrewingIcon(canvas.getContext('2d'),canvas.dataset.brewingIcon);
 for(const canvas of root.querySelectorAll('.card-lock'))drawCardLock(canvas.getContext('2d'));
}
