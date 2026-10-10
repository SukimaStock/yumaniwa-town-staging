(function(root){'use strict';
const P=root.FruitLabPhysics,W=root.FruitLabWorld,A=root.FruitLabArt,doc=root.document,WIDTH=1000,HEIGHT=760;
const courses={
bowl:[[-500,370,-.5],[-330,260,-.7],[-120,50,-.8],[30,35,0],[200,95,.85],[360,290,.7],[500,360,0]],
waves:[[-500,255,-.4],[-320,70,0],[-150,240,.7],[20,65,0],[190,235,.7],[360,65,0],[500,260,.5]],
ramp:[[-500,360,-.65],[-270,160,-.85],[-50,65,0],[180,60,0],[330,120,.8],[500,350,.7]],
steps:[[-500,210,0],[-280,65,-.6],[-100,100,.55],[85,65,-.45],[260,180,.65],[500,240,0]]
};const descriptions={bowl:'下って、受けて、登る。左右の切り返しを試す。',waves:'谷をつなぐ。前の勢いが次へ届くか。',ramp:'長い下りと上り。勢いをどれだけ残せるか。',steps:'小さな谷と岸。ぽよんの連続を探す。'};
let kind='pumpkin',terrain='bowl',state=null,course=null,pointer=null,touchAxis=0,ui;
function reset(){course={curves:{surface:courses[terrain].map(v=>[...v])},surfaces:['surface'],holes:[],cellars:[],gaps:[],finishX:100000};state=P.create(kind,P.defaults());const b=state[kind];b.layer='surface';const f=W.curve('surface',-280,course);b.x=f.x+f.nx*b.r;b.y=f.y+f.ny*b.r;b.vx=0;b.vy=0;b.grounded=true;pointer=null;touchAxis=0;root.SSE.input.reset();root.CodeaLite?.clearPointers();if(ui){for(const b of doc.querySelectorAll('[data-kind]'))b.classList.toggle('active',b.dataset.kind===kind);for(const b of doc.querySelectorAll('[data-terrain]'))b.classList.toggle('active',b.dataset.terrain===terrain);ui.saved.textContent=descriptions[terrain]}}
function frame(b){return W.curve('surface',Math.max(-500,Math.min(500,b.x)),course)}
const geometry={contact(b){return W.contact(b,course)},frame(x){return frame({x})},constrain(b){if(b.x<-470+b.r||b.x>470-b.r){b.x=Math.max(-470+b.r,Math.min(470-b.r,b.x));b.vx*=-.25;const f=W.contact(b,course);if(f.distance<b.r){b.x=f.x+f.nx*b.r;b.y=f.y+f.ny*b.r}}}};
function update(dt){state.accumulator+=Math.min(.05,Math.max(0,dt));while(state.accumulator+1e-10>=P.STEP){state.time+=P.STEP;state.axis+=(state.target-state.axis)*(1-Math.exp(-P.STEP*12));P.integrate(state,state[kind],state.axis,P.STEP,geometry);state.accumulator-=P.STEP}}
function viewFit(){
 const values=[];for(let x=-500;x<=500;x+=5)values.push(W.curve('surface',x,course).y);
 const lo=Math.min(...values),hi=Math.max(...values);
 const margin=65,headroom=kind==='rutabaga'?270:120;
 const bottom=lo-90,top=hi+headroom;
 const z=Math.min((WIDTH-2*margin)/1040,(HEIGHT-2*margin)/(top-bottom));
 return {z,x:WIDTH/2,y:(HEIGHT-z*(top+bottom))/2,lo,hi,bottom,top};
}
function draw(c){c.save();
 const view=viewFit();c.translate(view.x,view.y);c.scale(view.z,view.z);
c.fillStyle='#d6b184';c.beginPath();c.moveTo(-510,-270);c.lineTo(-510,W.curve('surface',-500,course).y);for(let x=-500;x<=500;x+=4)c.lineTo(x,W.curve('surface',x,course).y);c.lineTo(510,-270);c.closePath();c.fill();
c.strokeStyle='#6d855d';c.lineWidth=9;c.lineJoin='round';c.beginPath();for(let x=-500;x<=500;x+=4){const f=frame({x});if(x===-500)c.moveTo(x,f.y);else c.lineTo(x,f.y)}c.stroke();
const b=state[kind],f=frame(b),altitude=Math.max(0,b.y-b.r-f.y);A.ellipse(c,b.x,f.y+3,b.r,4,'rgba(80,54,27,'+(.15/(1+altitude/80))+')');
(kind==='pumpkin'?A.pumpkin:A.rutabaga)(c,b);c.restore()}
const scene={opaque:true,update(dt){let axis=pointer!==null?touchAxis:Number(root.SSE.input.action('right'))-Number(root.SSE.input.action('left'));P.input(state,axis);update(dt)},draw(){root.background(250,241,220);root.withCanvasContext(draw)},touch(t){if(t.state===root.BEGAN){pointer=t.id;touchAxis=t.x<WIDTH/2?-1:1}else if(t.id===pointer&&t.state===root.MOVING)touchAxis=t.x<WIDTH/2?-1:1;else if(t.id===pointer&&(t.state===root.ENDED||t.state===root.CANCELLED)){pointer=null;touchAxis=0}return true}};
reset();root.SSE.createApp({id:'pumpoko-feel-lab',logicalWidth:WIDTH,logicalHeight:HEIGHT,frameRate:60,initialScene:'lab',pointerMode:'primary',debug:false,outerBackground:'#faf1dc',keyboard:{bindings:{left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD']}},audio:root.SSE.audio.withBaseline({storageKey:'pumpoko-feel-lab.sound'}),devtools:{enabled:false},analytics:{enabled:false},lifecycle:{pauseOnBlur:true,onPause(){pointer=null;touchAxis=0;P.clearInput(state)},onResume(){pointer=null;touchAxis=0;P.clearInput(state)}},scenes:{lab:scene},setup(){ui={saved:doc.getElementById('saved')};for(const b of doc.querySelectorAll('[data-kind]'))b.addEventListener('click',()=>{kind=b.dataset.kind;reset()});for(const b of doc.querySelectorAll('[data-terrain]'))b.addEventListener('click',()=>{terrain=b.dataset.terrain;reset()});doc.getElementById('reset').addEventListener('click',reset);const canvas=doc.getElementById('gameCanvas');for(const type of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(type,e=>e.preventDefault());doc.getElementById('save').addEventListener('click',()=>{const entry={kind,terrain,points:courses[terrain],note:doc.getElementById('memo').value.trim(),at:new Date().toISOString()};try{const key='pumpoko-feel-lab-terrains-v1',arr=JSON.parse(root.localStorage.getItem(key)||'[]');arr.push(entry);root.localStorage.setItem(key,JSON.stringify(arr.slice(-50)));ui.saved.textContent='地形とメモを端末に保存しました（'+Math.min(50,arr.length)+'件）'}catch(e){ui.saved.textContent='保存できません。メモをコピーしてください。'}});root.addEventListener('resize',()=>{pointer=null;touchAxis=0});reset()}});
})(typeof window!=='undefined'?window:globalThis);