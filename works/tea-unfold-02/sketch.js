(function (root) {
  'use strict';
  const M=root.RolledTeaModel, playback=new M.Playback();
  const ui=Object.fromEntries(['play','reset','progress','speed','stage','error','announce'].map(k=>[k,document.getElementById(k)]));
  let renderer=null, suspended=document.hidden, previousStage='', lastControlValue=-1;
  function renderState(state) {
    ui.error.hidden=state==='ready';
    ui.error.textContent=state==='lost' ? '描画の復帰を待っています。' : 'このブラウザーでは立体描画を利用できません。別のブラウザーで開いてください。';
    if (state!=='ready') { playback.playing=false; playback.suspend(); }
    for (const key of ['play','progress','reset','speed']) ui[key].disabled=state!=='ready';
    sync();
  }
  function sync() {
    const value=Math.round(playback.progress*1000), label=M.stage(playback.progress);
    if (value!==lastControlValue) {
      ui.progress.value=String(value); ui.progress.setAttribute('aria-valuetext',`${label}、${Math.round(value/10)}パーセント`);
      lastControlValue=value;
    }
    if (label!==previousStage) { ui.stage.textContent=label; previousStage=label; }
    ui.play.textContent=playback.playing ? '一時停止' : playback.progress===1 ? 'もう一度再生' : '再生';
  }
  try { renderer=new root.RolledTeaRenderer(renderState); renderState('ready'); }
  catch (e) { renderState('unavailable'); }
  const scene={ opaque:true,
    update() { if (!suspended) playback.advance(performance.now()); sync(); },
    draw() {
      background(238,234,225);
      if (!renderer || renderer.lost || renderer.unavailable) return;
      renderer.render(playback.progress);
      withCanvasContext(c=>{
        c.scale(1,-1); c.translate(0,-740);
        c.drawImage(renderer.canvas,12,125,366,366);
      });
    }, touch() { return true; }
  };
  SSE.createApp({ id:SUKIMASTOCK_WORK.id,logicalWidth:390,logicalHeight:740,frameRate:30,
    initialScene:'leaf',debug:false,pointerMode:'primary',outerBackground:'#eeeae1',keyboard:{enabled:false},
    audio:{enabled:false},analytics:{enabled:false},scenes:{leaf:scene} });
  ui.play.addEventListener('click',()=>{ playback.toggle(); sync(); ui.announce.textContent=playback.playing?'再生します。':'一時停止しました。'; });
  ui.reset.addEventListener('click',()=>{ playback.reset(); sync(); ui.announce.textContent='最初のひと粒に戻しました。'; });
  ui.progress.addEventListener('input',()=>{ playback.seek(Number(ui.progress.value)/1000); sync(); });
  ui.speed.addEventListener('change',()=>{ playback.speed=Number(ui.speed.value); playback.suspend(); });
  document.addEventListener('visibilitychange',()=>{ suspended=document.hidden; playback.suspend(); });
  root.addEventListener('pagehide',()=>{ suspended=true; playback.suspend(); });
  root.addEventListener('pageshow',()=>{ suspended=document.hidden; playback.suspend(); });
  root.RolledTeaStudy=Object.freeze({ snapshot:()=>Object.freeze({ ...playback.snapshot(),renderer:!renderer||renderer.unavailable?'unavailable':renderer.lost?'lost':'ready' }) });
})(window);
