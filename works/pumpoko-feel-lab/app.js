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
  let kind='pumpkin',terrain='bowl',course,state,activePointer=null,pointerSource=null,axis=0;
  let keys=new Set(),canvasSize={width:0,height:0,dpr:1},lastTime=0,view=null;
  const byId=id=>doc.getElementById(id);
  function floor(x){return W.curve('surface',Math.max(-500,Math.min(500,x)),course)}
  const geometry={
    contact(body){return W.contact(body,course)},
    frame(x){return floor(x)},
    constrain(body){
      const min=-485+body.r,max=485-body.r;
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
    course={curves:{surface:terrainPoints[terrain].map(p=>p.slice())},surfaces:['surface'],holes:[],cellars:[],gaps:[],finishX:100000};
    state=P.create(kind,P.defaults());
    const b=state[kind],f=floor(-420);
    b.layer='surface';b.x=f.x+f.nx*b.r;b.y=f.y+f.ny*b.r+(kind==='rutabaga'?95:0);
    b.vx=b.vy=0;b.grounded=kind==='pumpkin';
    for(const item of doc.querySelectorAll('[data-kind]'))item.classList.toggle('active',item.dataset.kind===kind);
    for(const item of doc.querySelectorAll('[data-terrain]'))item.classList.toggle('active',item.dataset.terrain===terrain);
    byId('saved').textContent=descriptions[terrain];
    computeView();
  }
  function computeView(){
    let lo=Infinity,hi=-Infinity;
    for(let x=-500;x<=500;x+=5){const y=floor(x).y;lo=Math.min(lo,y);hi=Math.max(hi,y)}
    const width=Math.max(1,canvasSize.width),height=Math.max(1,canvasSize.height);
    const bottom=lo-100,top=hi+(kind==='rutabaga'?330:145),margin=16;
    const zoom=Math.min((width-margin*2)/1050,(height-margin*2)/(top-bottom));
    view={zoom,originX:width/2,originY:height/2-zoom*(top+bottom)/2,
      lo,hi,bottom,top,width,height};
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
    const v=view||computeView();
    ctx.save();ctx.translate(v.originX,v.originY);ctx.scale(v.zoom,v.zoom);
    ctx.beginPath();ctx.moveTo(-515,v.bottom-80);ctx.lineTo(-515,floor(-500).y);
    for(let x=-500;x<=500;x+=4)ctx.lineTo(x,floor(x).y);
    ctx.lineTo(515,v.bottom-80);ctx.closePath();
    ctx.fillStyle='#d9b385';ctx.fill();
    ctx.beginPath();for(let x=-500;x<=500;x+=4){const y=floor(x).y;if(x===-500)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
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
  for(const b of doc.querySelectorAll('[data-kind]'))b.addEventListener('click',()=>{kind=b.dataset.kind;reset()});
  for(const b of doc.querySelectorAll('[data-terrain]'))b.addEventListener('click',()=>{terrain=b.dataset.terrain;reset()});
  byId('reset').addEventListener('click',reset);
  byId('save').addEventListener('click',()=>{
    const entry={kind,terrain,points:terrainPoints[terrain],note:byId('memo').value.trim(),at:new Date().toISOString()};
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
    root.FeelLabProbe=()=>({kind,terrain,axis:currentAxis(),x:state[kind].x,y:state[kind].y,
      vx:state[kind].vx,vy:state[kind].vy,time:state.time,view:{...view},
      canvas:{width:canvasSize.width,height:canvasSize.height},grounded:state[kind].grounded});
  }
  root.requestAnimationFrame(loop);
})(window);