(function(root){
  'use strict';
  const P=root.FruitLabPhysics,S=root.PumpokoStory;
  let state=S.create(),pointer=null,touchAxis=0,ui,lastSound=-10,lastPhase='';
  function release(){pointer=null;touchAxis=0;P.clearInput(state.world);root.SSE.input.reset();root.CodeaLite?.clearPointers();}
  function reset(){release();state=S.create();lastSound=-10;sync();}
  function sync(){
    if(!ui)return;const title=state.phase==='title';ui.title.hidden=!title;ui.controls.hidden=!title;
    ui.start.textContent=state.returnTitle?'もう一度、旅へ':'左右に触れて、旅へ';
    ui.rest.hidden=state.phase!=='coast';
    const phase=state.phase+':'+state.world.phase;
    if(phase!==lastPhase){lastPhase=phase;ui.status.textContent=title?'左右に触れて旅をはじめる':state.phase==='ending'?'地上のカボチャと地下のルタバガが残る景色':state.phase==='coast'?'指をそっと離して、ひと息':state.world.active==='pumpkin'?'地上でカボチャを滑らせる':'地下でルタバガを跳ねさせる';}
  }
  function sound(events){
    if(!root.SSE.audio.enabled)return;
    const rank={roll:0,land:1,handoff:2,boost:3},e=events.reduce((a,b)=>!a||rank[b.type]>rank[a.type]?b:a,null),t=state.world.time;
    if(t<lastSound)lastSound=-10; // A replay creates a fresh simulation clock.
    if(!e||t-lastSound<(e.type==='roll'?.6:.13)||e.type==='land'&&e.strength<65)return;
    lastSound=t;const heavy=e.kind==='pumpkin'||e.type==='boost';
    root.SSE.audio.tone({frequency:heavy?100:240,endFrequency:heavy?65:130,duration:e.type==='roll'?.028:.06,volume:root.SSE.audio.baseline().reference.se.soft*(e.type==='roll'?.16:.45),type:'sine'});
  }
  const scene={opaque:true,
    update(dt){
      if(root.SSE.input.actionPressed('reset')){reset();return;}
      if(state.phase==='title'&&root.SSE.input.actionPressed('start'))S.start(state);
      const axis=pointer!==null?touchAxis:Number(root.SSE.input.action('right'))-Number(root.SSE.input.action('left'));
      sound(S.update(state,axis,dt));sync();
    },
    draw(){root.background(241,231,212);root.withCanvasContext(c=>{
      const alpha=S.dissolve(state);
      c.save();c.globalAlpha=1-alpha;root.PumpokoWorldDraw(c,state.world,state.view);c.restore();
      if(alpha){c.save();c.globalAlpha=alpha;root.PumpokoWorldDraw(c,state.previous.world,state.previous.view);c.restore();}
    });},
    touch(t){
      if(state.phase==='ending')return true;
      if(t.state===root.BEGAN){pointer=t.id;touchAxis=t.x<500?-1:1;S.start(state);}
      else if(t.id===pointer&&t.state===root.MOVING)touchAxis=t.x<500?-1:1;
      else if(t.id===pointer&&(t.state===root.ENDED||t.state===root.CANCELLED)){pointer=null;touchAxis=0;if(t.state===root.CANCELLED)P.clearInput(state.world);}
      if(t.state!==root.CANCELLED)P.input(state.world,touchAxis);sync();return true;
    }
  };
  root.SSE.createApp({id:'pumpoko-02',logicalWidth:1000,logicalHeight:760,frameRate:60,initialScene:'journey',pointerMode:'primary',debug:false,outerBackground:'#f1e7d4',
    keyboard:{bindings:{left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],start:['Space','Enter'],reset:['KeyR']}},
    audio:root.SSE.audio.withBaseline({storageKey:'pumpoko-02.sound'}),devtools:{enabled:false},analytics:{enabled:false},
    lifecycle:{pauseOnBlur:true,onPause:release,onResume:release},scenes:{journey:scene},
    setup(){
      const doc=root.document;ui={title:doc.getElementById('title'),controls:doc.getElementById('title-controls'),start:doc.getElementById('start'),rest:doc.getElementById('rest'),status:doc.getElementById('status')};
      ui.start.addEventListener('click',()=>{release();S.start(state);sync();});
      const button=doc.getElementById('sound');function label(){button.textContent=root.SSE.audio.enabled?'音あり':'音なし';button.setAttribute('aria-pressed',String(root.SSE.audio.enabled));}
      button.addEventListener('click',()=>{release();root.SSE.audio.setEnabled(!root.SSE.audio.enabled);root.SSE.audio.unlock();label();});label();
      for(const el of [ui.title,ui.controls])el.addEventListener('pointerdown',release);
      root.addEventListener('resize',release);root.addEventListener('blur',release);sync();
    }
  });
  if(new URLSearchParams(root.location.search).get('dev')==='1')root.PumpokoProbe=()=>({phase:state.phase,returnTitle:state.returnTitle,view:{...state.view},model:P.snapshot(state.world),pointer,axis:touchAxis});
})(typeof window!=='undefined'?window:globalThis);
