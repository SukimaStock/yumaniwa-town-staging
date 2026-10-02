(function(){
  'use strict';
  const M=window.PumpkinBuilderModel,J=window.PumpkinJourney,G=window.PumpkinStageGeometry,Draw=window.PumpkinStageDraw;
  const m=M.create(),$=id=>document.getElementById(id),canvas=$('stage-canvas'),c=canvas.getContext('2d'),view={x:0,y:0,z:.5},storageKey='kotsu-koro-stage-builder-v1';
  let width=1,height=1,drag=null,last=0,savedView=null,notice='現在のStage 1を読み込みました。';const keys=new Set();
  const world=(x,y)=>{if(m.mode==='play'){const a=J.view(m.run).angle,dx=x-width/2,dy=y-height*.48;return{x:m.run.camera.x+(Math.cos(a)*dx+Math.sin(a)*dy)/view.z,y:m.run.camera.y+(-Math.sin(a)*dx+Math.cos(a)*dy)/view.z};}return{x:view.x+x/view.z,y:view.y+y/view.z};},screen=(x,y)=>({x:(x-view.x)*view.z,y:(y-view.y)*view.z});
  function size(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);c.setTransform(d,0,0,d,0,0);}
  function fit(){const g=m.geometry;view.z=Math.min((width-90)/(g.bounds.right-g.bounds.left+30),(height-125)/Math.max(320,g.bounds.lostY-130));view.z=Math.max(.06,Math.min(1.4,view.z));view.x=g.bounds.left-45/view.z;view.y=Math.min(100,g.bounds.top-50)-50/view.z;}
  function status(text){notice=text;sync();}
  function sync(){
    $('message').textContent=m.error||notice;$('message').classList.toggle('error',!!m.error);
    document.body.classList.toggle('playing',m.mode==='play');$('play').hidden=m.mode==='play';$('reset').hidden=m.mode!=='play';$('edit').setAttribute('aria-pressed',String(m.mode==='edit'));
    const q=M.point(m,m.selection?.id),loop=m.draft.features.find(f=>f.id===m.selection?.id);
    $('selection-title').textContent=q?'Control point':loop?'Loop':m.selection?.type==='gap'?'Gap':m.selection?.type==='interval'?'Surface interval':'地形を選択';
    let info='';if(q)info=`x ${q.p.x.toFixed(1)} · y ${q.p.y.toFixed(1)}`;
    if(loop)info=`radius ${loop.radius.toFixed(1)} · center ${loop.x.toFixed(0)}, ${loop.y.toFixed(0)}`;
    if(m.selection?.type==='gap'){const g=m.geometry.GAP[m.selection.index];if(g)info=`幅 ${(g.right-g.left).toFixed(1)} px · 両端の●をドラッグ`;}
    $('selection-info').textContent=info;$('selection-help').textContent=loop?'中心をドラッグ / 右のhandleで半径を変更。入口と出口は一緒に追従します。':'点・地面の区間・gapをクリック。端の点を動かすとgap幅が変わります。';$('tangent-label').hidden=!q;if(q)$('tangent').value=q.p.tangent??0;
    $('material').disabled=!q&&!loop&&m.selection?.type!=='interval';const x=q?q.p.x+.01:m.selection?.x;$('material').value=loop?loop.material:x!==undefined?m.geometry.material(x):'flesh';
    $('delete').disabled=!q&&!loop;$('undo').disabled=!m.undo.length;$('redo').disabled=!m.redo.length;
    $('run-result').textContent=m.mode==='play'?`9 started · ${J.party(m.run).length} survived · ${m.run.seeds.filter(p=>p.lost).length} lost${m.run.finished?' · quiet':''}`:m.traces[0].length?`前の試遊 · ${9-m.losses.length} survived · ${m.losses.length} lost`:'';
  }
  function hit(p){
    const marker=m.geometry.floor(m.testStart.x);if(marker){const a=screen(m.testStart.x,marker.y);a.y-=54;if(Math.hypot(p.x-a.x,p.y-a.y)<18)return {type:'start'};}
    for(const side of ['left','right']){const x=m.draft.end[side],f=m.geometry.floor(x);if(f){const a=screen(x,f.y);a.y-=25;if(Math.hypot(p.x-a.x,p.y-a.y)<12)return {type:'end',side};}}
    for(const f of m.draft.features){const a=screen(f.x,f.y),r=screen(f.x+f.radius,f.y);const dr=Math.hypot(p.x-r.x,p.y-r.y),dc=Math.hypot(p.x-a.x,p.y-a.y);if(Math.min(dr,dc)<15)return {type:dr<dc?'radius':'loop',id:f.id};}
    for(const s of m.draft.surfaces)for(const q of s.points){const a=screen(q.x,q.y);if(Math.hypot(p.x-a.x,p.y-a.y)<13)return {type:'point',id:q.id};}
    const q=M.point(m,m.selection?.id);if(q&&q.p.tangent!==undefined){const a=screen(q.p.x+45,q.p.y+45*q.p.tangent);if(Math.hypot(p.x-a.x,p.y-a.y)<12)return {type:'tangent',id:q.p.id};}
    const w=world(p.x,p.y),gap=m.geometry.GAP.findIndex(g=>w.x>g.left&&w.x<g.right);if(gap>=0)return {type:'gap',index:gap};
    const f=m.geometry.floor(w.x);if(f){const s=m.draft.surfaces[f.segment];const interval=Math.max(0,s.points.findIndex(q=>q.x>w.x)-1);if(Math.abs(w.y-f.y)*view.z<30)return {type:'interval',surface:s.id,interval,x:w.x};}
    return {type:'pan'};
  }
  function pos(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  canvas.addEventListener('pointerdown',e=>{
    if(drag)return;const p=pos(e);canvas.setPointerCapture(e.pointerId);canvas.focus();
    if(m.mode==='play'){drag={type:'tilt',id:e.pointerId,px:p.x,py:p.y,moved:0};m.run.held=true;return;}
    const target=hit(p);drag={...target,pointer:e.pointerId,px:p.x,py:p.y,vx:view.x,vy:view.y};m.selection=target.type==='radius'?{type:'loop',id:target.id}:target;sync();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||(drag.pointer??drag.id)!==e.pointerId)return;const p=pos(e),w=world(p.x,p.y);
    if(m.mode==='edit'&&['point','tangent','start','end','loop','radius'].includes(drag.type)&&!drag.checkpoint){M.checkpoint(m);drag.checkpoint=true;}
    if(drag.type==='tilt'){drag.moved=Math.max(drag.moved,Math.hypot(p.x-drag.px,p.y-drag.py));m.run.targetX=Math.max(-.38,Math.min(.38,(p.x-drag.px)/210));m.run.targetY=Math.max(-.38,Math.min(.38,(p.y-drag.py)/210));}
    else if(drag.type==='point')M.editPoint(m,drag.id,w.x,w.y,false);
    else if(drag.type==='tangent'){const q=M.point(m,drag.id);M.tangent(m,drag.id,(w.y-q.p.y)/Math.max(15,w.x-q.p.x),false);}
    else if(drag.type==='start')M.moveStart(m,w.x,false);
    else if(drag.type==='end')M.moveEnd(m,drag.side,w.x,false);
    else if(drag.type==='loop'||drag.type==='radius'){if(M.editLoop)M.editLoop(m,drag.id,drag.type,w.x,w.y,false);}
    else if(drag.type==='pan'){view.x=drag.vx-(p.x-drag.px)/view.z;view.y=drag.vy-(p.y-drag.py)/view.z;}
    sync();
  });
  function end(e){if(!drag)return;if(m.mode==='play'){if(e.type==='pointerup'&&drag.moved<9){const w=world(pos(e).x,pos(e).y);J.knock(m.run,w.x,w.y);}J.release(m.run);}drag=null;sync();}
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  canvas.addEventListener('wheel',e=>{if(m.mode!=='edit')return;e.preventDefault();if(e.ctrlKey||e.metaKey){const p=pos(e),w=world(p.x,p.y);view.z=Math.max(.06,Math.min(3,view.z*Math.exp(-e.deltaY*.002)));view.x=w.x-p.x/view.z;view.y=w.y-p.y/view.z;}else{view.x+=(e.deltaX||e.deltaY)/view.z;}},{passive:false});
  function beginPlay(){if(M.play(m)){savedView={...view};drag=null;keys.clear();status('ドラッグで世界を傾ける · 放すと余韻 · EDITで地形へ戻る');}else sync();}
  $('play').onclick=beginPlay;$('reset').onclick=()=>{M.play(m);keys.clear();drag=null;sync();};$('edit').onclick=()=>{if(m.mode==='play'){M.edit(m);Object.assign(view,savedView);drag=null;keys.clear();status('薄い線が種の軌跡、×が脱落位置です。');}};
  document.querySelectorAll('[data-primitive]').forEach(b=>b.onclick=()=>{if(M.addPrimitive(m,b.dataset.primitive)){fit();if(b.dataset.primitive==='Loop'){const f=m.draft.features.at(-1);view.z=.85;view.x=f.x-220-width/(2*view.z);view.y=f.y-height*.44/view.z;notice='Loopと練習用の谷を追加しました。▼から左右へ振って、勢いを作ってみてください。';}}sync();});
  $('add-point').onclick=()=>{M.addPoint(m);sync();};$('delete').onclick=()=>{M.remove(m);sync();};$('material').onchange=()=>{M.setMaterial(m,$('material').value);sync();};$('tangent').onchange=()=>{M.tangent(m,m.selection?.id,Number($('tangent').value));sync();};$('undo').onclick=()=>{M.history(m,'undo');sync();};$('redo').onclick=()=>{M.history(m,'redo');sync();};$('fit').onclick=fit;function zoom(factor){const x=view.x+width/2/view.z,y=view.y+height/2/view.z;view.z=Math.max(.06,Math.min(3,view.z*factor));view.x=x-width/2/view.z;view.y=y-height/2/view.z;}$('zoom-in').onclick=()=>zoom(1.3);$('zoom-out').onclick=()=>zoom(1/1.3);
  $('save').onclick=()=>{try{localStorage.setItem(storageKey,JSON.stringify({stage:m.draft,testStart:m.testStart}));status('このブラウザへdraftを保存しました。');}catch(e){m.error='保存できませんでした。EXPORT JSONを使ってください。';sync();}};
  $('load').onclick=()=>{try{const text=localStorage.getItem(storageKey);if(!text)throw Error('保存したdraftがありません');const v=JSON.parse(text);if(!M.importJSON(m,JSON.stringify(v.stage)))throw Error(m.error);if(v.testStart&&m.geometry.floor(v.testStart.x))m.testStart=v.testStart;fit();status('保存したdraftを読み込みました。');}catch(e){m.error=e.message;sync();}};
  $('export').onclick=()=>{const blob=new Blob([M.exportJSON(m)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kotsu-koro-stage.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Stage JSONをexportしました。');};
  $('import').onclick=()=>$('file').click();$('file').onchange=async()=>{const f=$('file').files[0];if(!f)return;if(f.size>1048576){m.error='JSONは1MB以下にしてください';sync();return;}if(M.importJSON(m,await f.text())){fit();status('Stage JSONを読み込みました。');}else sync();$('file').value='';};
  $('canonical').onclick=()=>{if(M.importJSON(m,JSON.stringify(window.PumpkinStageData))){fit();status('現在のStage 1を読み込みました。Undoでdraftへ戻れます。');}};
  window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(m.mode==='play'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s',' '].includes(e.key)){e.preventDefault();keys.add(e.key);if(e.key===' '&&!e.repeat)J.knock(m.run,m.run.camera.x+30,m.run.camera.y);}else if(e.key==='Delete'&&m.mode==='edit'){M.remove(m);sync();}else if(e.key==='Escape'&&m.mode==='play')$('edit').click();});
  window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();if(m.run)J.release(m.run);drag=null;});document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){keys.clear();if(m.run)J.release(m.run);drag=null;}});
  function seed(p,i){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.scale(1,p.roll||1);c.fillStyle=i%2?'#f4e8b9':'#f8edc6';c.strokeStyle='#c9bb85';c.lineWidth=1;c.beginPath();c.ellipse(0,0,10.3,5.5,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-6,0);c.lineTo(7,0);c.strokeStyle='#fff5d7';c.stroke();c.restore();}
  function render(){
    c.clearRect(0,0,width,height);c.fillStyle='#faf2d5';c.fillRect(0,0,width,height);
    if(m.mode==='play')view.z=Math.min(1.25,width/480,height/500)*(m.run.result?Math.min(1,m.run.camera.z/J.ZOOM):1);
    c.save();if(m.mode==='play'){c.translate(width/2,height*.48);c.rotate(J.view(m.run).angle);c.scale(view.z,view.z);c.translate(-m.run.camera.x,-m.run.camera.y);}else{c.scale(view.z,view.z);c.translate(-view.x,-view.y);}
    const g=m.mode==='play'?m.run.geometry:m.geometry;Draw.drawTerrain(c,g,0,m.run?.ending&&m.run.result.arrivals.length?1-J.smooth(m.run.ending.elapsed/2.8):1);Draw.drawLoops(c,g);Draw.drawFarm(c,g);
    if(m.mode==='play'){Draw.drawSeeds(c,m.run,(_c,p,i)=>seed(p,i));Draw.drawPlants(c,m.run);}
    else {
      for(const [i,trace]of m.traces.entries()){c.beginPath();for(const [k,p]of trace.entries()){if(!k)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);}c.strokeStyle=`hsla(${30+i*13},35%,42%,.22)`;c.lineWidth=1.5/view.z;c.stroke();}
      for(const p of m.losses){c.strokeStyle='#a77b61';c.lineWidth=1.4/view.z;c.beginPath();const r=5/view.z;c.moveTo(p.x-r,p.y-r);c.lineTo(p.x+r,p.y+r);c.moveTo(p.x+r,p.y-r);c.lineTo(p.x-r,p.y+r);c.stroke();}
      for(const [i,gap]of g.GAP.entries()){const a=g.floor(gap.left),b=g.floor(gap.right),y=Math.min(a.y,b.y)-22/view.z;c.strokeStyle=m.selection?.type==='gap'&&m.selection.index===i?'#c7853b':'#ab9c78';c.lineWidth=1/view.z;c.setLineDash([4/view.z,4/view.z]);c.beginPath();c.moveTo(gap.left,y);c.lineTo(gap.right,y);c.stroke();c.setLineDash([]);c.font=`${10/view.z}px system-ui`;c.fillStyle='#897758';c.textAlign='center';c.fillText('GAP', (gap.left+gap.right)/2,y-6/view.z);}
      for(const s of m.draft.surfaces)for(const p of s.points){c.beginPath();c.arc(p.x,p.y,5.5/view.z,0,Math.PI*2);c.fillStyle=m.selection?.id===p.id?'#d69436':'#fff7d8';c.fill();c.strokeStyle='#718064';c.lineWidth=1.5/view.z;c.stroke();}
      const q=M.point(m,m.selection?.id);if(q&&q.p.tangent!==undefined){const p=q.p;c.strokeStyle='#bb905b';c.lineWidth=1/view.z;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+45,p.y+45*p.tangent);c.stroke();c.fillStyle='#bb905b';c.beginPath();c.arc(p.x+45,p.y+45*p.tangent,4/view.z,0,Math.PI*2);c.fill();}
      const f=g.floor(m.testStart.x);if(f){c.fillStyle='#cf913a';c.beginPath();c.moveTo(m.testStart.x-8/view.z,f.y-62/view.z);c.lineTo(m.testStart.x+8/view.z,f.y-62/view.z);c.lineTo(m.testStart.x,f.y-47/view.z);c.closePath();c.fill();c.font=`${11/view.z}px system-ui`;c.textAlign='center';c.fillText('TEST START',m.testStart.x,f.y-71/view.z);}
      for(const side of ['left','right']){const x=m.draft.end[side],f=g.floor(x);if(f){c.fillStyle='#7a937b';c.fillRect(x-3/view.z,f.y-37/view.z,6/view.z,28/view.z);}}
      const endX=(m.draft.end.left+m.draft.end.right)/2,endF=g.floor(endX);if(endF){c.fillStyle='#708468';c.font=`${10/view.z}px system-ui`;c.fillText('END',endX,endF.y-46/view.z);}
      for(const f of m.draft.features){c.strokeStyle='#957d50';c.lineWidth=1.4/view.z;c.beginPath();c.moveTo(f.x,f.y);c.lineTo(f.x+f.radius,f.y);c.stroke();for(const x of [f.x,f.x+f.radius]){c.fillStyle='#fff1b8';c.beginPath();c.arc(x,f.y,6/view.z,0,Math.PI*2);c.fill();c.stroke();}}
    }
    c.restore();
  }
  function frame(time){const dt=last?Math.min(.06,(time-last)/1000):0;last=time;
    if(m.mode==='play'){if(!drag){m.run.held=keys.size>0;m.run.targetX=(Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a')))*.38;m.run.targetY=(Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w')))*.38;}M.update(m,dt);$('run-result').textContent=`9 started · ${J.party(m.run).length} survived · ${m.run.seeds.filter(p=>p.lost).length} lost${m.run.finished?' · quiet':''}`;}
    render();requestAnimationFrame(frame);
  }
  new ResizeObserver(()=>{size();}).observe($('canvas-area'));size();fit();sync();requestAnimationFrame(frame);
})();
