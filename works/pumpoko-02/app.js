(function(root){
  'use strict';
  const P=root.FruitLabPhysics,S=root.PumpokoStory,D=root.PumpokoPrologue;
  let state=S.create(),pointer=null,touchAxis=0,ui,lastSound=-10,lastPhase='';
  function release(){pointer=null;touchAxis=0;D.release(state.prologue);P.clearInput(state.world);root.SSE.input.reset();root.CodeaLite?.clearPointers();}
  function reset(){release();state=S.create();lastSound=-10;sync();}
  function sync(){
    if(!ui)return;const title=state.phase==='title';ui.title.hidden=!title;ui.controls.hidden=!title;
    ui.rest.hidden=true;
    const phase=state.phase+':'+state.world.phase;
    if(phase!==lastPhase){lastPhase=phase;ui.status.textContent=title?'カボチャに触れて旅をはじめる':state.phase==='ending'||state.phase==='returning'?'地上のカボチャと地下のルタバガが残る景色':state.world.active==='pumpkin'?'地上でカボチャを滑らせる':'地下でルタバガを跳ねさせる';}
  }
  function sound(events){
    const t=state.world.time||state.prologue.time;
    if(t<lastSound)lastSound=-10;
    // No rolling ticks or boosted repeated chirps. Stamp muted events too.
    const e=events.find(e=>e.type==='handoff')||events.find(e=>e.type==='detach')||events.find(e=>e.type==='land'&&e.strength>90);
    if(!e||t-lastSound<(e.type==='land'?.35:.13))return;
    lastSound=t;if(!root.SSE.audio.enabled||root.document.hidden||root.SSE.lifecycle?.paused)return;
    const name=e.type==='handoff'?'shell':e.type==='detach'?'fiber':e.kind==='pumpkin'?'drumDon':'seed';
    root.SSE.audio.play(name);
  }
  const scene={opaque:true,
    update(dt){
      if(root.SSE.input.actionPressed('reset')){reset();return;}
      if(state.phase==='title'&&root.SSE.input.actionPressed('start')){S.start(state);root.SSE.audio.play('shell');}
      const axis=pointer!==null?touchAxis:Number(root.SSE.input.action('right'))-Number(root.SSE.input.action('left'));
      const previous=state.phase;sound(S.update(state,axis,dt));
      if(previous!==state.phase&&(state.phase==='opening'||state.phase==='title'))release();sync();
    },
    draw(){root.background(250,241,220);root.withCanvasContext(c=>{
      if(state.phase==='title')root.PumpokoTitleDraw(c,state.prologue);
      else if(state.phase==='opening'){
        const plants=S.nurseryPoses(state),frame=S.openingFrame(state);
        // The cut physically fills the view before its expanded lower skin
        // unrolls into the actual terrain. No shell fade or early separate stage.
        if(frame.unroll<1)root.PumpokoTitleDraw(c,state.opening.shell,frame.pose,1,0,false);
        root.PumpokoWorldDraw(c,state.world,state.view,{...plants,opening:true,seeds:[]},
          {...frame,surface:x=>S.openingSurface(state,x)});
        c.save();c.translate(195,400);c.scale(state.view.z,state.view.z);c.translate(-state.view.x,-state.view.y);
        root.FruitLabArt.nursery(c,{plants:[],seeds:plants.seeds},state.world);c.restore();
        root.PumpokoTitleArt.captions(c,state.opening.shell,frame.caption);
      }else{
        const mix=S.returnMix(state);
        c.save();c.globalAlpha=1-mix;root.PumpokoWorldDraw(c,state.world,state.view,S.nurseryPoses(state));c.restore();
        if(mix)root.PumpokoTitleDraw(c,state.prologue,{x:195,y:375,scale:1},mix,mix);
      }
    });},
    touch(t){
      if(state.phase==='ending'||state.phase==='returning'||state.phase==='opening')return true;
      if(state.phase==='title'){
        const names=new Map([[root.BEGAN,'began'],[root.MOVING,'moving'],[root.ENDED,'ended'],[root.CANCELLED,'cancelled']]);
        if(D.touch(state.prologue,{...t,state:names.get(t.state)})){
          if(t.state===root.BEGAN){pointer=t.id;root.SSE.audio.play('shell');}
          else if(t.state===root.ENDED||t.state===root.CANCELLED){pointer=null;touchAxis=0;}
        }
        return true;
      }
      if(t.state===root.BEGAN){pointer=t.id;touchAxis=t.x<195?-1:1;}
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
      root.SSE.audio.preload();
      const doc=root.document;ui={title:doc.getElementById('title'),controls:doc.getElementById('title-controls'),start:doc.getElementById('start'),rest:doc.getElementById('rest'),status:doc.getElementById('status')};
      const beginMusic=event=>{
        if(event.isTrusted!==true||doc.hidden||root.SSE.lifecycle?.paused||!root.SSE.audio.enabled)return;
        if(root.SSE.audio.currentMusic==='pumpoko')root.SSE.audio.resumeMusic('pumpoko');
        else root.SSE.audio.playMusic('pumpoko',{restart:false});
      };
      doc.getElementById('gameCanvas').addEventListener('pointerdown',event=>{if(event.isPrimary!==false&&!(event.button>0))beginMusic(event);},{passive:true});
      root.addEventListener('keydown',event=>{if(!event.repeat&&!root.SSE.input.isEditable(event)&&root.SSE.input.eventKeys(event).some(key=>root.SSE.input.isBoundKey(key)))beginMusic(event);});
      ui.start.addEventListener('click',event=>{release();beginMusic(event);S.start(state);sync();});
      const button=doc.getElementById('sound');function label(){button.textContent=root.SSE.audio.enabled?'♪':'♪̸';button.setAttribute('aria-pressed',String(root.SSE.audio.enabled));button.setAttribute('aria-label',root.SSE.audio.enabled?'音を切る':'音を入れる');}
      button.addEventListener('click',event=>{release();root.SSE.audio.setEnabled(!root.SSE.audio.enabled);root.SSE.audio.unlock();beginMusic(event);label();});label();
      root.addEventListener('resize',release);root.addEventListener('blur',release);sync();
    }
  });
  if(new URLSearchParams(root.location.search).get('dev')==='1'){
    root.PumpokoProbe=()=>({phase:state.phase,elapsed:state.elapsed,finished:state.world.finished,target:state.world.target,returnTitle:state.returnTitle,view:{...state.view},model:P.snapshot(state.world),pointer,axis:touchAxis,prologue:{time:state.prologue.time,loose:state.prologue.seeds.filter(p=>!p.attached).length,held:state.prologue.held},opening:state.opening?.progress,openingFrame:S.openingFrame(state),nursery:S.nurseryPoses(state)});
  }
})(typeof window!=='undefined'?window:globalThis);
