/* Ametsugi studio entry: original five-roof physics/art live in work-local portable files.
 * The frame keeps its own canvas, RAF, input, sound and hinge gestures.
 * Only first-roof starting tilt and first-rain wait are persistent Studio settings.
 */
(function(root){'use strict';
const {RainGame,local,LIMIT}=root.AmetsugiPhysics;
const {RainDrawing,PALETTE}=root.AmetsugiDrawing;
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function validate(value){
 if(!value||Object.keys(value).sort().join(',')!=='angle,wait'||!Number.isFinite(value.angle)||!Number.isFinite(value.wait)||value.angle < -LIMIT||value.angle > LIMIT||value.wait < 0||value.wait > 2)throw Error('雨つぎの編集値が不正です');
 return clone(value);
}
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const sound=document.getElementById('sound'),reset=document.getElementById('reset'),again=document.getElementById('again'),announce=document.getElementById('announce');
let config={angle:0,wait:.85},game=new RainGame(),drawing=new RainDrawing(false),editing=false,paused=false,pointer=null,selected=0;
let w=0,h=0,dpr=1,scale=1,ox=0,oy=0,fade=1,last=0,wasStarted=false,lastPhase='',bridge;
let enabled=false,audio=null;
drawing.reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
function release(){game.release();pointer=null;}
function setFirstAngle(value,instant=false){if(game.level!==0)return;game.setAngle(0,value);if(instant){game.pans[0].angle=game.pans[0].target;game.pans[0].velocity=0;}}
function restore(input){
 const next=validate(input);release();config=next;game=new RainGame();selected=0;fade=1;wasStarted=false;lastPhase='';
 setFirstAngle(config.angle,true);game.pending=config.wait;sync();
}
function tone(f,end,d,vol,type='sine'){
 if(!enabled||!audio)return;try{if(audio.state==='suspended')audio.resume();const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(end,1),t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*.028),t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+d+.01);}catch(_){}
}
function sync(){
 again.hidden=game.phase!=='end';
 if(lastPhase!==game.phase){lastPhase=game.phase;announce.textContent=game.phase==='end'?'雨が渡りました。もうひと雨。':game.phase==='retry'?'水がこぼれました。もう一粒。':game.phase==='caught'?'器に雨が届きました。': '雨つぎ。雨どいを傾ける。';}
 sound.setAttribute('aria-label',enabled?'音を切る':'音を出す');sound.setAttribute('aria-pressed',String(!enabled));
}
function resize(){
 const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
 const wide=box.width/box.height>1.15;
 if(wide!==drawing.wide){release();drawing.setLayout(wide);}
 const ndpr=Math.min(root.devicePixelRatio||1,2);
 if(box.width!==w||box.height!==h||ndpr!==dpr){w=box.width;h=box.height;dpr=ndpr;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 scale=Math.min(w/drawing.width,h/drawing.height);ox=(w-drawing.width*scale)/2;oy=(h-drawing.height*scale)/2;
}
function position(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left-ox)/scale,y=(e.clientY-r.top-oy)/scale;return drawing.inverse({x,y});}
function candidate(p){return game.pans.map((pan,i)=>{const q=local(pan,p.x,p.y);return{i,q,dist:Math.abs(q.v-6)};}).filter(z=>Math.abs(z.q.u)<game.pans[z.i].length/2+20&&z.dist<(drawing.wide?45:30)).sort((a,b)=>a.dist-b.dist)[0];}
canvas.addEventListener('pointerdown',e=>{
 if(pointer!==null||paused)return;
 const p=position(e),hit=candidate(p);if(!hit)return;
 selected=hit.i;
 if(editing){
  if(game.level!==0||selected!==0)return;
  game.hinges.grab(game.pans[0].id);
  game.drag={index:0,x:p.x,y:p.y};
 }else if(!game.grab(selected,p))return;
 pointer=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch(_){}
 if(editing)bridge?.changed('begin');else tone(130,100,.025,.3);
 e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
 if(pointer!==e.pointerId)return;
 game.move(position(e));
 if(editing){config.angle=game.pans[0].target;game.pans[0].angle=config.angle;game.pans[0].velocity=0;bridge?.changed('move');}
 e.preventDefault();
});
function pointerEnd(e){if(pointer!==e.pointerId)return;release();if(editing)bridge?.changed('end');}
canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);
root.addEventListener('keydown',e=>{
 if(paused||editing)return;
 if(e.key==='r'||e.key==='R'){restore(config);e.preventDefault();return;}
 if(/^[1-4]$/.test(e.key)){selected=Math.min(Number(e.key)-1,game.pans.length-1);return;}
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){game.start();game.setAngle(selected,game.pans[selected].target+(e.key==='ArrowRight'?1:-1)*.04);e.preventDefault();}
});
sound.addEventListener('click',()=>{enabled=!enabled;if(enabled){const AC=root.AudioContext||root.webkitAudioContext;if(AC){audio=audio||new AC();audio.resume();tone(280,230,.045,.4);}}sync();});
reset.addEventListener('click',()=>restore(config));
again.addEventListener('click',()=>{if(game.replay()){selected=0;fade=1;wasStarted=false;sync();}});
function update(dt){
 if(paused||editing)return;
 game.update(dt);
 if(game.started){wasStarted=true;fade=Math.max(0,fade-dt*.48);}
 for(const e of game.drainEvents()){
  if(e.type==='catch')tone(420-e.pan*44,270-e.pan*26,.062,.6);
  if(e.type==='pour')tone(240,155,.065,.33);
  if(e.type==='cup'){tone(610,450,.16,.9);tone(304,260,.22,.36);}
  if(e.type==='miss')tone(110,68,.065,.26);
  if(e.type==='end')tone(330,329,.4,.2);
  if(e.type==='roof'){selected=0;}
 }
 sync();
}
function loop(t){
 resize();const dt=last?Math.min(.2,Math.max(0,(t-last)/1000)):.016;last=t;
 update(dt);
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=PALETTE.air;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);drawing.draw(ctx,game,fade);ctx.restore();
 root.requestAnimationFrame(loop);
}
function beginEdit(id){
 if(id===null){release();editing=true;restore(config);paused=false;}
}
function applyEdit(id,change){
 const next=clone(config);
 if(id==='angle'){next.angle=change.value;}
 else if(id==='wait'){next.wait=change.value;}
 else throw Error('この傾きは作品の雨どいで操作してください');
 validate(next);restore(next);
}
function endEdit(id){if(id===null){release();editing=false;}}
bridge=root.FeelBridge?.connect({
 play(){paused=false;},
 pause(value){paused=!!value;release();},
 reset(){restore(config);},
 getState(){return clone(config);},
 restoreState:restore,
 getEditableElements(){return [
  {id:'gutter',label:'最初の雨どい',type:'position',control:'work',hint:'雨どいの銅色の端を上下に動かして傾きを決めます（最初の屋根のみ）。'},
  {id:'angle',label:'最初の雨どいの傾き',type:'value',min:-LIMIT,max:LIMIT,step:.02,value:config.angle,unit:'rad'},
  {id:'wait',label:'最初の雨までの間',type:'timing',min:0,max:2,step:.05,value:config.wait,unit:'秒'}
 ];},
 beginEdit,applyEdit,endEdit,
 getComparisonInfo(){return '雨つぎの全5屋根と水の動きは元作品の物理を保持。編集できるのは最初の屋根の初期傾きと一粒目までの間です。';}
});
root.addEventListener('blur',release);
root.addEventListener('resize',release);
document.addEventListener('visibilitychange',()=>{release();if(!bridge?.isConnected())paused=document.hidden;});
restore(config);root.requestAnimationFrame(loop);
})(typeof window!=='undefined'?window:globalThis);
