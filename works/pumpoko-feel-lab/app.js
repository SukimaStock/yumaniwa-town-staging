(function(root){
  'use strict';
  // This is an embedded authoring toy, not a fullscreen Codea app.
  // Only the physics, Hermite contact and fruit artwork are imported from PUMPOKO 02.
  const P=root.FruitLabPhysics,W=root.FruitLabWorld,Art=root.FruitLabArt,doc=root.document;
  const canvas=doc.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
  const terrainPoints={
    bowl:[[-500,370,-.5],[-330,260,-.7],[-120,50,-.8],[30,35,0],[200,95,.85],[360,290,.7],[500,360,0]],
    waves:[[-500,255,-.4],[-320,70,0],[-150,240,.7],[20,65,0],[190,235,.7],[360,65,0],[500,260,.5]],
    ramp:[[-500,360,-.65],[-270,160,-.85],[-50,65,0],[180,60,0],[330,120,.8],[500,350,.7]],
    steps:[[-500,210,0],[-280,65,-.6],[-100,100,.55],[85,65,-.45],[260,180,.65],[500,240,0]],
    bigU:[[-500,310,-.4],[-360,240,-.85],[-160,95,-.55],[0,48,0],[160,95,.55],[360,240,.85],[500,310,.4]],
    softWaves:[[-500,200,-.3],[-345,92,-.35],[-190,105,.32],[-50,152,.08],[100,92,-.25],[250,125,.35],[400,102,-.15],[500,150,.2]],
    doubleBounce:[[-500,230,-.4],[-320,92,-.55],[-170,90,.20],[-45,155,.4],[90,95,-.32],[240,170,.42],[390,120,-.26],[500,170,.15]],
    halfpipe:[[-500,310,-.3],[-370,185,-1.0],[-170,60,-.45],[0,43,0],[170,60,.45],[370,185,1.0],[500,310,.3]]
  };
  const chainPoints={
    flow:[[-500,275,-.50],[-320,145,-.64],[-120,40,0],[70,105,.67],[250,195,.35],[410,100,-.66],[590,64,0],[790,130,.49],[1010,220,-.18],[1240,80,-.48],[1510,160,.52],[1700,240,.24]],
    rhythm:[[-500,175,-.24],[-335,92,-.4],[-150,70,0],[20,118,.35],[190,93,-.37],[360,66,0],[550,125,.5],[730,95,-.28],[910,75,0],[1090,175,.5],[1320,105,-.35],[1540,190,.35],[1700,190,0]],
    pump:[[-500,295,-.5],[-320,160,-.86],[-120,45,-.35],[40,35,0],[235,110,.64],[440,245,.58],[620,100,-.70],[790,48,0],[950,118,.72],[1150,220,.3],[1320,105,-.50],[1530,175,.53],[1700,280,.5]],
    breath:[[-500,280,-.47],[-290,125,-.8],[-90,42,0],[115,105,.50],[300,130,0],[500,130,0],[675,130,0],[860,80,-.51],[1040,40,0],[1240,125,.64],[1460,190,.38],[1700,220,0]]
  };
  // Preserve each earlier chain verbatim (only translate the second in x/y).
  // A short C1-continuous runway between the parts keeps the order experiment
  // about sequence rather than a sudden seam or physics changes.
  const orderSpecs={
    ac:['flow','pump'],ca:['pump','flow'],
    bd:['rhythm','breath'],db:['breath','rhythm']
  };
  function composeOrder(firstId,secondId){
    const first=chainPoints[firstId].map(p=>p.slice()),second=chainPoints[secondId];
    const tail=first[first.length-1],head=second[0];
    const separation=180,dx=tail[0]+separation-head[0],dy=tail[1]-head[1];
    const connector=[
      [tail[0]+55,tail[1],0],
      [tail[0]+125,tail[1],0]
    ];
    const shifted=second.map(p=>[p[0]+dx,p[1]+dy,p[2]]);
    const joined=first.concat(connector,shifted);
    for(let i=1;i<joined.length;i++){
      if(!(joined[i][0]>joined[i-1][0])||!joined[i].every(Number.isFinite))throw Error('Invalid connected terrain');
    }
    return joined;
  }
  const orderPoints=Object.fromEntries(Object.entries(orderSpecs).map(([key,[a,b]])=>[key,composeOrder(a,b)]));
  const orderDescriptions={
    ac:'ROLL比較｜A · FLOW → C · PUMP。自然に作った勢いを切り返しへつなぐ。',
    ca:'ROLL比較｜C · PUMP → A · FLOW。切り返しで作った勢いを次の流れへ渡す。',
    bd:'BOUNCE比較｜B · RHYTHM → D · BREATH。連続バウンドから平面の余白へ。',
    db:'BOUNCE比較｜D · BREATH → B · RHYTHM。平面で整えてからリズムへ入る。'
  };
  const orderParts={ac:'A · FLOW → C · PUMP',ca:'C · PUMP → A · FLOW',
    bd:'B · RHYTHM → D · BREATH',db:'D · BREATH → B · RHYTHM'};
  const orderJoinX=1700+90;
  const orderSecondStartX=1880;
  const chainDescriptions={
    flow:'FLOW｜長い下り → 深い谷 → 小さな谷 → 長い上り。勢いをつないで進む。',
    rhythm:'RHYTHM｜浅い谷と短い岸をつなぐ。着地の押し直しを楽しむ。',
    pump:'PUMP｜大きなU字 → 上り → 小さなU字。切り返して勢いを作り直す。',
    breath:'BREATH｜下り → 深い谷 → 平面 → 小さな谷。余白が気持ちよさを変えるか。'
  };
  const descriptions={
    bowl:'下って、受けて、登る。左右の切り返しを試す。',
    waves:'谷をつなぐ。前の勢いが次へ届くか。',
    ramp:'長い下りと上り。勢いをどれだけ残せるか。',
    steps:'小さな谷と岸。ぽよんの連続を探す。',
    bigU:'大きなU字。切り返して斜面を登る。',
    softWaves:'ゆるい連続谷。勢いを途切れさせない。',
    doubleBounce:'二段の起伏。着地を次の跳ねにつなぐ。',
    halfpipe:'小さなハーフパイプ。左右へ繰り返して勢いを育てる。'
  };
  let kind='pumpkin',terrain='bowl',mode='single',feedback='retry',course,state,activePointer=null,pointerSource=null,axis=0;
  let keys=new Set(),canvasSize={width:0,height:0,dpr:1},lastTime=0,view=null;
  const byId=id=>doc.getElementById(id);
  function points(){return mode==='order'?orderPoints[terrain]:mode==='chain'?chainPoints[terrain]:terrainPoints[terrain]}
  function limits(){const p=points();return {min:p[0][0],max:p[p.length-1][0]}}
  function floor(x){const l=limits();return W.curve('surface',Math.max(l.min,Math.min(l.max,x)),course)}
  const geometry={
    contact(body){return W.contact(body,course)},
    frame(x){return floor(x)},
    constrain(body){
      const l=limits(),min=l.min+15+body.r,max=l.max-15-body.r;
      if(body.x>=min&&body.x<=max)return;
      body.x=Math.max(min,Math.min(max,body.x));
      body.vx*=-.25;
      const ground=W.contact(body,course);
      if(ground.distance<body.r){body.x=ground.x+ground.nx*body.r;body.y=ground.y+ground.ny*body.r}
    }
  };
  function release(){activePointer=null;pointerSource=null;axis=0;keys.clear();if(state)P.clearInput(state)}
  function reset(){
    release();
    course={curves:{surface:points().map(p=>p.slice())},surfaces:['surface'],holes:[],cellars:[],gaps:[],finishX:100000};
    state=P.create(kind,P.defaults());
    const b=state[kind],f=floor(mode==='single'?-420:-410);
    b.layer='surface';b.x=f.x+f.nx*b.r;b.y=f.y+f.ny*b.r+(kind==='rutabaga'?95:0);
    b.vx=b.vy=0;b.grounded=kind==='pumpkin';
    for(const item of doc.querySelectorAll('[data-kind]'))item.classList.toggle('active',item.dataset.kind===kind);
    for(const item of doc.querySelectorAll('[data-terrain]'))item.classList.toggle('active',mode==='single'&&item.dataset.terrain===terrain);
    for(const item of doc.querySelectorAll('[data-chain]'))item.classList.toggle('active',mode==='chain'&&item.dataset.chain===terrain);
    for(const item of doc.querySelectorAll('[data-order]'))item.classList.toggle('active',mode==='order'&&item.dataset.order===terrain);
    for(const item of doc.querySelectorAll('[data-study]'))item.classList.toggle('active',item.dataset.study===mode);
    byId('single-courses').hidden=mode!=='single';byId('chain-courses').hidden=mode!=='chain';
    byId('order-courses').hidden=mode!=='order';
    byId('order-hint').hidden=mode!=='order';
    byId('saved').textContent=(mode==='order'?orderDescriptions:mode==='chain'?chainDescriptions:descriptions)[terrain];
    const label=byId('order-progress');if(label)label.textContent=mode==='order'?(orderParts[terrain]+' · 前半'):'';
    computeView();
  }
  function computeView(){
    const width=Math.max(1,canvasSize.width),height=Math.max(1,canvasSize.height);
    const l=limits(),b=state[kind],headroom=kind==='rutabaga'?235:100,margin=20;
    if(mode==='single'){
      let lo=Infinity,hi=-Infinity;
      for(let x=l.min;x<=l.max;x+=5){const y=floor(x).y;lo=Math.min(lo,y);hi=Math.max(hi,y)}
      const bottom=lo-75,top=hi+headroom;
      const zoom=Math.min((width-2*margin)/(l.max-l.min+50),(height-2*margin)/(top-bottom));
      view={zoom,originX:width/2-zoom*(l.min+l.max)/2,originY:height/2-zoom*(top+bottom)/2,lo,hi,bottom,top,width,height};
    }else{
      // Follow the active body, with a little forward anticipation. Only the camera moves.
      const zoom=Math.min(.73,Math.max(.47,(width-2*margin)/650));
      const half=width/(2*zoom),desired=b.x+Math.max(-55,Math.min(145,b.vx*.22+75));
      const centreX=Math.max(l.min+half-20,Math.min(l.max-half+20,desired));
      let lo=Infinity,hi=-Infinity;
      for(let x=centreX-half-20;x<=centreX+half+20;x+=8){
        const y=floor(x).y;lo=Math.min(lo,y);hi=Math.max(hi,y);
      }
      const bottom=lo-90,top=Math.max(hi+headroom,b.y+b.r+55);
      const verticalZoom=Math.min(zoom,(height-2*margin)/(top-bottom));
      // Preserve scale within each visible phrase; avoiding snap or crop is more important than zooming in.
      const centerY=(top+bottom)/2;
      view={zoom:verticalZoom,originX:width/2-verticalZoom*centreX,originY:height/2-verticalZoom*centerY,lo,hi,bottom,top,width,height,centreX};
    }
    return view;
  }
  function resize(){
    const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
    const dpr=Math.min(3,Math.max(1,root.devicePixelRatio||1));
    const pxW=Math.max(1,Math.round(width*dpr)),pxH=Math.max(1,Math.round(height*dpr));
    if(canvas.width!==pxW)canvas.width=pxW;
    if(canvas.height!==pxH)canvas.height=pxH;
    canvasSize={width,height,dpr};
    if(course)computeView();
  }
  function render(){
    const {width,height,dpr}=canvasSize;
    if(!width||!height||!state)return;
    ctx.setTransform(dpr,0,0,-dpr,0,height*dpr);
    ctx.fillStyle='#faf1dc';ctx.fillRect(0,0,width,height);
    const v=computeView(),l=limits();
    if(mode==='order'){
      const label=byId('order-progress');
      if(label)label.textContent=orderParts[terrain]+
        (state[kind].x>=orderSecondStartX?' · 後半':state[kind].x>=1700?' · つなぎ':' · 前半');
    }
    ctx.save();ctx.translate(v.originX,v.originY);ctx.scale(v.zoom,v.zoom);
    ctx.beginPath();ctx.moveTo(l.min-15,v.bottom-80);ctx.lineTo(l.min-15,floor(l.min).y);
    for(let x=l.min;x<=l.max;x+=5)ctx.lineTo(x,floor(x).y);
    ctx.lineTo(l.max+15,v.bottom-80);ctx.closePath();
    ctx.fillStyle='#d9b385';ctx.fill();
    ctx.beginPath();for(let x=l.min;x<=l.max;x+=5){const y=floor(x).y;if(x===l.min)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
    ctx.strokeStyle='#68835f';ctx.lineWidth=9;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
    const body=state[kind],f=floor(body.x);
    const altitude=Math.max(0,body.y-body.r-f.y);
    Art.ellipse(ctx,body.x,f.y+2,body.r,4,'rgba(80,54,27,'+(.16/(1+altitude/80))+')');
    (kind==='pumpkin'?Art.pumpkin:Art.rutabaga)(ctx,body);
    ctx.restore();
  }
  function currentAxis(){
    if(activePointer!==null)return axis;
    return Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
  }
  function simulate(dt){
    P.input(state,currentAxis());
    state.events.length=0;
    state.accumulator+=Math.max(0,Math.min(.05,dt));
    let limit=0;
    while(state.accumulator+1e-10>=P.STEP&&limit++<14){
      state.time+=P.STEP;
      state.axis+=(state.target-state.axis)*(1-Math.exp(-P.STEP*12));
      P.integrate(state,state[kind],state.axis,P.STEP,geometry);
      state.accumulator-=P.STEP;
    }
  }
  function loop(now){
    if(!doc.hidden&&state){simulate(lastTime?Math.min((now-lastTime)/1000,.05):1/60);render()}
    lastTime=now;
    root.requestAnimationFrame(loop);
  }
  function pointAxis(event){
    const rect=canvas.getBoundingClientRect();
    return (event.clientX-rect.left)<rect.width/2?-1:1;
  }
  function startPointer(event,nextAxis,source){
    if(event.isPrimary===false||activePointer!==null)return;
    event.preventDefault();
    activePointer=event.pointerId;pointerSource=source;axis=nextAxis;
    try{event.currentTarget.setPointerCapture(event.pointerId)}catch(_){}
  }
  function endPointer(event){
    if(activePointer!==event.pointerId)return;
    activePointer=null;pointerSource=null;axis=0;P.input(state,0);
  }
  canvas.addEventListener('pointerdown',event=>startPointer(event,pointAxis(event),'canvas'));
  canvas.addEventListener('pointermove',event=>{
    if(pointerSource==='canvas'&&activePointer===event.pointerId)axis=pointAxis(event);
  });
  for(const id of ['left-control','right-control']){
    const button=byId(id),direction=id==='left-control'?-1:1;
    button.addEventListener('pointerdown',event=>startPointer(event,direction,id));
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,endPointer);
    button.addEventListener('contextmenu',event=>event.preventDefault());
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,endPointer);
  for(const type of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(type,event=>event.preventDefault());
  root.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(event.code))return;
    if(['INPUT','TEXTAREA','SELECT'].includes(doc.activeElement?.tagName))return;
    event.preventDefault();keys.add(event.code);
  });
  root.addEventListener('keyup',event=>{keys.delete(event.code)});
  root.addEventListener('blur',release);
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){release();lastTime=0}});
  for(const b of doc.querySelectorAll('[data-kind]'))b.addEventListener('click',()=>{kind=b.dataset.kind;if(mode==='order')terrain=kind==='pumpkin'?'ac':'bd';reset()});
  for(const b of doc.querySelectorAll('[data-study]'))b.addEventListener('click',()=>{
    mode=b.dataset.study;
    terrain=mode==='order'?(kind==='pumpkin'?'ac':'bd'):mode==='chain'?'flow':'bowl';
    reset();
  });
  for(const b of doc.querySelectorAll('[data-chain]'))b.addEventListener('click',()=>{if(!chainPoints[b.dataset.chain])return;mode='chain';terrain=b.dataset.chain;reset()});
  for(const b of doc.querySelectorAll('[data-order]'))b.addEventListener('click',()=>{
    if(!orderPoints[b.dataset.order])return;mode='order';terrain=b.dataset.order;reset();
  });
  for(const b of doc.querySelectorAll('[data-feedback]'))b.addEventListener('click',()=>{feedback=b.dataset.feedback;for(const item of doc.querySelectorAll('[data-feedback]'))item.classList.toggle('active',item===b)});
  for(const b of doc.querySelectorAll('[data-terrain]'))b.addEventListener('click',()=>{if(!terrainPoints[b.dataset.terrain])return;mode='single';terrain=b.dataset.terrain;reset()});
  byId('reset').addEventListener('click',reset);
  byId('save').addEventListener('click',()=>{
    const entry={kind,mode,terrain,feedback,points:points().map(p=>p.slice()),
      ...(mode==='order'?{sourceCourses:orderSpecs[terrain].slice(),junctionX:orderJoinX}:{}),
      note:byId('memo').value.trim(),at:new Date().toISOString()};
    try{
      const key='pumpoko-feel-lab-terrains-v1';
      const items=JSON.parse(root.localStorage.getItem(key)||'[]');
      items.push(entry);root.localStorage.setItem(key,JSON.stringify(items.slice(-50)));
      byId('saved').textContent='地形とメモをこの端末に保存しました（'+Math.min(50,items.length)+'件）';
    }catch(_){byId('saved').textContent='保存できません。メモをコピーしてください。'}
  });
  root.addEventListener('resize',resize);
  if(root.ResizeObserver)new root.ResizeObserver(resize).observe(canvas.parentElement);
  resize();reset();
  if(new URLSearchParams(root.location.search).get('dev')==='1'){
    root.FeelLabProbe=()=>({kind,terrain,mode,feedback,parts:mode==='order'?orderSpecs[terrain]:null,axis:currentAxis(),x:state[kind].x,y:state[kind].y,
      vx:state[kind].vx,vy:state[kind].vy,time:state.time,view:{...view},
      canvas:{width:canvasSize.width,height:canvasSize.height},grounded:state[kind].grounded});
  }
  root.requestAnimationFrame(loop);
})(window);