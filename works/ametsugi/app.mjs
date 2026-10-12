import {RainGame,local} from './game.mjs?v=1';
import {RainDrawing,PALETTE} from './draw.mjs?v=1';
const game=new RainGame(),drawing=new RainDrawing(innerWidth/innerHeight>1.15);
let pointer=null,selected=0,fade=1,wasStarted=false,lastPhase='',lastAngle=0,tickWait=0;
const sound=document.getElementById('sound'),again=document.getElementById('again'),announce=document.getElementById('announce');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
drawing.reduced=reduced;
function release(){game.release();pointer=null;}
function tone(f,end,d,v,type='triangle'){SSE.audio.tone({frequency:f,endFrequency:end,duration:d,volume:SSE.audio.baseline().reference.se.soft*v,type});}
function sync(){
 again.hidden=game.phase!=='end';
 if(lastPhase!==game.phase){
  lastPhase=game.phase;
  announce.textContent=game.phase==='end'?'雨が渡りました。もうひと雨で、反対向きの屋根を遊べます。':game.phase==='retry'?'水がこぼれました。同じ屋根でもう一粒。':game.phase==='caught'?'器に雨が届きました。':`雨つぎ。${game.pans.length}つの雨どい。`;
 }
 sound.setAttribute('aria-label',SSE.audio.enabled?'音を切る':'音を出す');sound.setAttribute('aria-pressed',String(!SSE.audio.enabled));
}
const scene={opaque:true,
 update(dt){
  const wide=SSE.viewport.screenWidth/SSE.viewport.screenHeight>1.15;
  if(wide!==drawing.wide){release();drawing.setLayout(wide);SSE.viewport.configure(drawing.width,drawing.height);}
  for(let i=0;i<4;i++)if(SSE.input.actionPressed('pick'+i))selected=Math.min(i,game.pans.length-1);
  const dir=(SSE.input.action('right')?1:0)-(SSE.input.action('left')?1:0);
  if(dir){game.start();game.setAngle(selected,game.pans[selected].target+dir*dt*.9);}
  if(SSE.input.actionPressed('reset')){game.reset();selected=0;release();fade=1;wasStarted=false;}
  game.update(dt);
  if(game.started){if(!wasStarted)wasStarted=true;fade=Math.max(0,fade-dt*.48);}
  if(game.drag){
   const angle=game.pans[game.drag.index].angle;tickWait-=dt;
   if(Math.abs(angle-lastAngle)>.14&&tickWait<0){tone(150,95,.027,.36);lastAngle=angle;tickWait=.14;}
  }
  for(const e of game.drainEvents()){
   if(e.type==='catch')tone(420-e.pan*44,270-e.pan*26,.062,.6,'sine');
   if(e.type==='pour')tone(240,155,.065,.33,'sine');
   if(e.type==='cup'){tone(610,450,.16,.9,'sine');tone(304,260,.22,.36,'sine');}
   if(e.type==='miss')tone(110,68,.065,.26,'sine');
   if(e.type==='end')tone(330,329,.4,.2,'sine');
  }
  sync();
 },
 draw(){background(36,51,59);withCanvasContext(c=>{c.scale(1,-1);c.translate(0,-drawing.height);drawing.draw(c,game,fade);});},
 touch(t){
  const raw={x:t.x,y:drawing.height-t.y},p=drawing.inverse(raw);
  if(t.state===BEGAN){
   if(game.phase==='end')return true;
   const candidates=game.pans.map((pan,i)=>{const q=local(pan,p.x,p.y);return {i,q,dist:Math.abs(q.v-6)};}).filter(h=>Math.abs(h.q.u)<game.pans[h.i].length/2+20&&h.dist<(drawing.wide?45:30)).sort((a,b)=>a.dist-b.dist);
   if(candidates.length){selected=candidates[0].i;if(game.grab(selected,p)){pointer=t.id;lastAngle=game.pans[selected].angle;tone(130,100,.025,.3);}}
  }else if(t.id===pointer&&t.state===MOVING)game.move(p);
  else if(t.id===pointer&&(t.state===ENDED||t.state===CANCELLED))release();
  return true;
 }
};
SSE.createApp({id:'ametsugi',logicalWidth:drawing.width,logicalHeight:drawing.height,frameRate:60,initialScene:'rain',pointerMode:'primary',outerBackground:PALETTE.air,debug:false,
 keyboard:{bindings:{left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],reset:['KeyR'],pick0:['Digit1'],pick1:['Digit2'],pick2:['Digit3'],pick3:['Digit4']}},
 audio:SSE.audio.withBaseline({storageKey:'ametsugi.sound'}),analytics:{enabled:false},
 lifecycle:{pauseOnBlur:true,onPause:release,onResume:release},scenes:{rain:scene},
 setup(){
  sound.addEventListener('click',()=>{SSE.audio.setEnabled(!SSE.audio.enabled);if(SSE.audio.enabled){SSE.audio.unlock();tone(280,230,.045,.4);}sync();});
  document.getElementById('reset').addEventListener('click',()=>{game.reset();selected=0;release();fade=1;wasStarted=false;sync();});
  again.addEventListener('click',()=>{game.replay();selected=0;fade=1;wasStarted=false;sync();});
  const canvas=document.getElementById('gameCanvas');
  for(const type of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(type,e=>e.preventDefault());
  window.addEventListener('resize',release);
  sync();
 }
});
// Read-only developer observation: no forced goal, state setter or hidden autoplay.
if(new URLSearchParams(location.search).has('qa')){
 Object.defineProperty(window,'rainObservation',{value:()=>({...game.snapshot(),layout:{wide:drawing.wide,width:drawing.width,height:drawing.height,sx:drawing.sx,sy:drawing.sy,ox:drawing.ox,oy:drawing.oy},audio:{enabled:SSE.audio.enabled,unlocked:SSE.audio.unlocked,state:SSE.audio.ctx?.state??'uncreated'},reducedMotion:reduced})});
 setInterval(()=>{const el=document.getElementById('gameCanvas');el.dataset.phase=game.phase;el.dataset.level=String(game.level);el.dataset.drag=String(game.drag?.index??'none');el.dataset.audio=SSE.audio.ctx?.state??'uncreated';},150);
}
try{CodeaLite.start('gameCanvas');}catch(e){console.error(e);const p=document.createElement('p');p.id='boot-error';p.textContent='雨つぎを開けませんでした。ページを読み込み直してください。';document.body.appendChild(p);}
