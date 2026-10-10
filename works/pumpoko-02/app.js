(function(root){
  'use strict';
  const P=root.FruitLabPhysics,S=root.PumpokoStory,D=root.PumpokoPrologue;
  let state=S.create(),pointer=null,touchAxis=0,ui,lastSound=-10,lastPhase='',freshInput=false;
  let musicStatus='loading';
  const musicReady=()=>!root.SSE.audio.enabled||musicStatus==='ready'||musicStatus==='silent';
  function applyMusicGate(){state.musicReady=musicReady();if(ui){ui.wait.hidden=state.phase!=='title'||state.musicReady;ui.silent.hidden=musicStatus!=='failed';}}
  function release(){pointer=null;touchAxis=0;D.release(state.prologue);P.clearInput(state.world);root.SSE.input.reset();root.CodeaLite?.clearPointers();}
  function reset(){release();state=S.create();freshInput=false;lastSound=-10;applyMusicGate();sync();}
  function sync(){
    if(!ui)return;applyMusicGate();const title=state.phase==='title';ui.title.hidden=!title;ui.controls.hidden=!title;
    ui.rest.hidden=true;
    const phase=state.phase+':'+state.world.phase;
    if(phase!==lastPhase){lastPhase=phase;ui.status.textContent=title?'カボチャに触れて旅をはじめる':state.phase==='ending'||state.phase==='returning'?'地上のカボチャと地下のルタバガが残る景色':state.world.active==='pumpkin'?'地上でカボチャを滑らせる':'地下でルタバガを跳ねさせる';}
  }
  function sound(events){
    const t=state.world.time||state.prologue.time;
    if(t<lastSound)lastSound=-10;
    // No rolling ticks or boosted repeated chirps. Stamp muted events too.
    const e=events.find(e=>e.type==='seat')||events.find(e=>e.type==='handoff')||events.find(e=>e.type==='fall')||events.find(e=>e.type==='detach')||events.find(e=>e.type==='land'&&e.strength>90);
    if(!e||(e.type!=='seat'&&t-lastSound<(e.type==='land'?.35:.13)))return;
    lastSound=t;if(!root.SSE.audio.enabled||root.document.hidden||root.SSE.lifecycle?.paused)return;
    const name=e.type==='handoff'?'shell':e.type==='detach'||e.type==='fall'?'fiber':e.kind==='pumpkin'?'drumDon':'seed';
    root.SSE.audio.play(e.type==='seat'?'shell':name,e.type==='fall'?{volume:root.SSE.audio.baseline().reference.se.soft*.35}:e.type==='seat'?{volume:root.SSE.audio.baseline().reference.se.soft*.72,playbackRate:.88}:undefined);
  }
  const scene={opaque:true,
    update(dt){
      if(root.SSE.input.actionPressed('reset')){reset();return;}
      applyMusicGate();
      if(state.phase==='title'&&root.SSE.input.actionPressed('start')){S.start(state);root.SSE.audio.play('shell');}
      const axis=pointer!==null?touchAxis:Number(root.SSE.input.action('right'))-Number(root.SSE.input.action('left'));
      const previous=state.phase;sound(S.update(state,freshInput?0:axis,dt));
      if(previous!==state.phase){
        if(state.phase==='retrying'||previous==='retrying'){release();freshInput=true;}
        else if(state.phase==='opening'||state.phase==='title'){release();freshInput=false;}
      }sync();
    },
    draw(){root.background(250,241,220);root.withCanvasContext(c=>{
      if(state.phase==='title')root.PumpokoTitleDraw(c,state.prologue);
      else if(state.phase==='opening'){
        root.PumpokoOpeningDraw(c,state,S.nurseryPoses(state),S.openingFrame(state));
      }else{
        const mix=S.returnMix(state);
        c.save();c.globalAlpha=1-mix;root.PumpokoWorldDraw(c,state.world,state.view,S.nurseryPoses(state));c.restore();
        if(mix)root.PumpokoTitleDraw(c,state.prologue,{x:195,y:375,scale:1},mix,mix);
      }
    });},
    touch(t){
      if(state.world.finished&&state.phase!=='title'||state.phase==='ending'||state.phase==='returning'||state.phase==='opening'||state.phase==='retrying')return true;
      if(state.phase==='title'){
        const names=new Map([[root.BEGAN,'began'],[root.MOVING,'moving'],[root.ENDED,'ended'],[root.CANCELLED,'cancelled']]);
        if(D.touch(state.prologue,{...t,state:names.get(t.state)})){
          if(t.state===root.BEGAN){pointer=t.id;root.SSE.audio.play('shell');}
          else if(t.state===root.ENDED||t.state===root.CANCELLED){pointer=null;touchAxis=0;}
        }
        return true;
      }
      if(t.state===root.BEGAN){freshInput=false;state.needsNeutral=false;pointer=t.id;touchAxis=t.x<195?-1:1;}
      else if(t.id===pointer&&t.state===root.MOVING)touchAxis=t.x<195?-1:1;
      else if(t.id===pointer&&(t.state===root.ENDED||t.state===root.CANCELLED)){pointer=null;touchAxis=0;if(t.state===root.CANCELLED)P.clearInput(state.world);}
      if(t.state!==root.CANCELLED)P.input(state.world,touchAxis);sync();return true;
    }
  };
  root.SSE.createApp({id:'pumpoko-02',logicalWidth:390,logicalHeight:740,frameRate:60,initialScene:'journey',pointerMode:'primary',debug:false,outerBackground:'#faf1dc',
    keyboard:{bindings:{left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],start:['Space','Enter'],reset:['KeyR']}},
    audio:root.SSE.audio.withBaseline({storageKey:'pumpoko-02.sound',music:{pumpoko:{file:'./audio/pumpoko-bgm.mp3',loop:true,volume:root.SSE.audio.baseline().reference.bgm.active}},sounds:{
      shell:{file:'./audio/shell.wav',mode:'buffer',volume:root.SSE.audio.baseline().reference.se.soft},
      fiber:{file:'./audio/fiber.wav',mode:'buffer',volume:root.SSE.audio.baseline().reference.se.soft},
      drumDon:{file:'./audio/drum-don.wav',mode:'buffer',volume:root.SSE.audio.baseline().reference.se.soft},
      seed:{file:'./audio/seed.wav',mode:'buffer',volume:root.SSE.audio.baseline().reference.se.soft}}}),
    devtools:{enabled:false},analytics:{enabled:false},lifecycle:{pauseOnBlur:true,onPause:release,onResume:release},scenes:{journey:scene},
    setup(){
      const doc=root.document;ui={title:doc.getElementById('title'),controls:doc.getElementById('title-controls'),start:doc.getElementById('start'),rest:doc.getElementById('rest'),status:doc.getElementById('status'),wait:doc.getElementById('audio-wait'),silent:doc.getElementById('continue-silent')};
      root.SSE.audio.preload();
      root.SSE.audio.preload('pumpoko').then(()=>{if(musicStatus!=='loading')return;musicStatus=root.SSE.audio.resourceState('pumpoko').status==='ready'?'ready':'failed';sync();}).catch(()=>{if(musicStatus==='loading'){musicStatus='failed';sync();}});
      ui.silent.addEventListener('click',()=>{musicStatus='silent';root.SSE.audio.setEnabled(false);sync();});
      const canvas=doc.getElementById('gameCanvas');
      canvas.addEventListener('contextmenu',event=>event.preventDefault());
      canvas.addEventListener('selectstart',event=>event.preventDefault());
      canvas.addEventListener('dragstart',event=>event.preventDefault());
      root.addEventListener('keydown',event=>{
        if(state.phase==='playing'&&!event.repeat&&!root.SSE.input.isEditable(event)&&
          ['ArrowLeft','KeyA','ArrowRight','KeyD'].some(key=>root.SSE.input.eventKeys(event).includes(key))){freshInput=false;state.needsNeutral=false;}
      });
      const beginMusic=event=>{
        if(event.isTrusted!==true||doc.hidden||root.SSE.lifecycle?.paused||!root.SSE.audio.enabled)return;
        if(root.SSE.audio.currentMusic==='pumpoko')root.SSE.audio.resumeMusic('pumpoko');
        else root.SSE.audio.playMusic('pumpoko',{restart:false});
      };
      doc.getElementById('gameCanvas').addEventListener('pointerdown',event=>{if(event.isPrimary!==false&&!(event.button>0))beginMusic(event);},{passive:true});
      root.addEventListener('keydown',event=>{if(!event.repeat&&!root.SSE.input.isEditable(event)&&root.SSE.input.eventKeys(event).some(key=>root.SSE.input.isBoundKey(key)))beginMusic(event);});
      ui.start.addEventListener('click',event=>{release();beginMusic(event);S.start(state);sync();});
      const button=doc.getElementById('sound');function label(){button.textContent=root.SSE.audio.enabled?'♪':'♪̸';button.setAttribute('aria-pressed',String(root.SSE.audio.enabled));button.setAttribute('aria-label',root.SSE.audio.enabled?'音を切る':'音を入れる');}
      button.addEventListener('click',event=>{release();root.SSE.audio.setEnabled(!root.SSE.audio.enabled);root.SSE.audio.unlock();beginMusic(event);label();sync();});label();
      root.addEventListener('resize',release);root.addEventListener('blur',release);sync();
    }
  });
  if(new URLSearchParams(root.location.search).get('dev')==='1'){
    root.PumpokoProbe=()=>({phase:state.phase,elapsed:state.elapsed,finished:state.world.finished,target:state.world.target,returnTitle:state.returnTitle,view:{...state.view},model:P.snapshot(state.world),pointer,axis:touchAxis,prologue:{time:state.prologue.time,loose:state.prologue.seeds.filter(p=>!p.attached).length,held:state.prologue.held},stages:state.world.stages,freshInput,opening:state.opening?.transition.progress,openingFrame:S.openingFrame(state),nursery:S.nurseryPoses(state)});
  }
})(typeof window!=='undefined'?window:globalThis);
