/* Ametsugi studio entry: original five-roof physics/art live in work-local portable files.
 * The frame keeps its own canvas, RAF, input, sound and hinge gestures.
 * LIVE applies bounded tuning in place; RESTART values are used by restore/reset only.
 */
(function(root){'use strict';
const {RainGame,local,LIMIT}=root.AmetsugiPhysics;
const {RainDrawing,PALETTE}=root.AmetsugiDrawing;
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const {validate,defaults,elements}=root.AmetsugiParameters;
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const sound=document.getElementById('sound'),reset=document.getElementById('reset'),again=document.getElementById('again'),announce=document.getElementById('announce');
let config=clone(defaults),game=new RainGame(),drawing=new RainDrawing(false),editing=false,paused=false,pointer=null,selected=0;
let w=0,h=0,dpr=1,scale=1,ox=0,oy=0,fade=1,last=0,wasStarted=false,lastPhase='',bridge;
let enabled=false,audio=null,master=null;
function applyState(input){config=validate(input);Object.assign(game.tuning,config);Object.assign(drawing.tuning,config);if(master&&audio)master.gain.setTargetAtTime(config.volume,audio.currentTime,.02);}

drawing.reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
function release(){const captured=pointer;pointer=null;game.release();if(captured!==null){try{canvas.releasePointerCapture(captured);}catch(_){}}}
function setFirstAngle(value,instant=false){if(game.level!==0)return;game.setAngle(0,value);if(instant){game.pans[0].angle=game.pans[0].target;game.pans[0].velocity=0;}}
function restore(input){
 const next=validate(input);release();config=next;game=new RainGame();selected=0;fade=1;wasStarted=false;lastPhase='';
 applyState(config);setFirstAngle(config.angle,true);game.pending=config.wait;sync();
}
function tone(f,end,d,vol,type='sine'){
 if(!enabled||!audio)return;try{if(audio.state==='suspended')audio.resume();const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(end,1),t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*.028),t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(master||audio.destination);o.start(t);o.stop(t+d+.01);}catch(_){}
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
 if(!game.grab(selected,p))return;
 pointer=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch(_){}
 tone(130,100,.025,.3);
 e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
 if(pointer!==e.pointerId)return;
 game.move(position(e));
 e.preventDefault();
});
function pointerEnd(e){if(pointer!==e.pointerId)return;release();}
canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);
root.addEventListener('keydown',e=>{
 if(paused)return;
 if(e.key==='r'||e.key==='R'){restore(config);e.preventDefault();return;}
 if(/^[1-4]$/.test(e.key)){selected=Math.min(Number(e.key)-1,game.pans.length-1);return;}
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){game.start();game.setAngle(selected,game.pans[selected].target+(e.key==='ArrowRight'?1:-1)*.04);e.preventDefault();}
});
sound.addEventListener('click',()=>{enabled=!enabled;if(enabled){const AC=root.AudioContext||root.webkitAudioContext;if(AC){audio=audio||new AC();if(!master){master=audio.createGain();master.gain.value=config.volume;master.connect(audio.destination);}audio.resume();tone(280,230,.045,.4);}}sync();});
reset.addEventListener('click',()=>restore(config));
again.addEventListener('click',()=>{if(game.replay()){selected=0;fade=1;wasStarted=false;sync();}});
function update(dt){
 if(paused)return;
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
function beginEdit(id){if(id===null)editing=true;}
function applyEdit(id,change){
 const e=elements(config).find(e=>e.id===id);if(!e||e.apply==='rebuild'||e.control==='work')throw Error('Workまたは作品内で操作してください');
 applyState({...config,[id]:change.value});
}
function endEdit(id){if(id===null)editing=false;}
function getTestScenes(){return [{id:'first-roof-rain',label:'最初の屋根に一粒',contract:'ametsugi-first-roof-rain/1',description:'入力なしで一粒を開始',configDrivenKeys:['angle','wait']}];}
function startTestScene(input){
 if(!input||input.sceneId!=='first-roof-rain'||input.contract!=='ametsugi-first-roof-rain/1'||typeof input.runId!=='string'||!/^[a-zA-Z0-9_-]{1,90}$/.test(input.runId))throw Error('テスト場面の指定が不正です');
 const next=validate(input.config);
 restore(next);game.start();fade=0;wasStarted=true;last=0;sync();
 return {runId:input.runId,sceneId:input.sceneId,contract:input.contract,effectiveConditions:{level:0,lap:0,time:0,angle:config.angle,wait:config.wait,source:game.source,drop:null,velocity:0,input:'free'},config:clone(config)};
}
bridge=root.FeelBridge?.connect({
 play(){paused=false;},
 pause(value){paused=!!value;release();},
 reset(){restore(config);},
 getState(){return clone(config);},
 restoreState:restore,
 applyState,
 getEditableElements(){return elements(config);},
 getTestScenes,startTestScene,
 beginEdit,applyEdit,endEdit,
 getComparisonInfo(){return 'LIVEは時間・水滴・雨どいを保って即時反映。RESTARTは次の「試す」で開始角度と待ち時間を反映します。同じ開始条件で比較できますが、指の操作と乱れた経路は揃いません。';}
});
root.addEventListener('blur',release);
root.addEventListener('resize',release);
document.addEventListener('visibilitychange',()=>{release();if(!bridge?.isConnected())paused=document.hidden;});
restore(config);root.requestAnimationFrame(loop);
})(typeof window!=='undefined'?window:globalThis);
