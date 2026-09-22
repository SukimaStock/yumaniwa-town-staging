(() => {
  const TX = window.OrbitText;
  if(!TX || !TX.isReady()) throw new Error('ORBIT text must be loaded before restore ritual');
  const tx = (key, vars) => TX.t(key, vars);

  const host = document.getElementById('ritualHost');
  if(!host) throw new Error('ritualHost missing');

  const shadow = host.attachShadow({mode:'open'});
  const style = document.createElement('style');
  style.textContent = "\n  :root{\n    --bg:#090c12;\n    --fg:#d9e6f4;\n    --dim:#90a4bb;\n    --accent:#9fcbff;\n    --accent2:#b9dcff;\n    --warm:#e7cb8b;\n    --fail:#d57878;\n    --panel:rgba(10,14,20,0.70);\n    --line:rgba(180,220,255,.18);\n  }\n  :host{\n    display:block;\n    width:100%;\n    height:100%;\n    overflow:hidden;\n    background:var(--bg);\n    color:var(--fg);\n    margin:0; height:100%; overflow:hidden; background:var(--bg); color:var(--fg);\n    font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;\n    touch-action:none;\n  }\n  :host,canvas,button{\n    -webkit-user-select:none;\n    user-select:none;\n    -webkit-touch-callout:none;\n    -webkit-user-drag:none;\n  }\n  canvas{\n    display:block; width:100vw; height:100vh;\n    touch-action:none;\n  }\n  .overlay{\n    position:fixed; inset:0; pointer-events:none;\n    display:flex; flex-direction:column; justify-content:space-between;\n    padding:14px 16px calc(18px + env(safe-area-inset-bottom)) 16px;\n    box-sizing:border-box;\n  }\n  .top{\n    display:flex;\n    flex-direction:column;\n    align-items:stretch;\n    gap:8px;\n  }\n  .bottom{\n    display:flex;\n    justify-content:center;\n    align-items:center;\n  }\n  .row{\n    display:flex;\n    align-items:center;\n    justify-content:flex-start;\n    gap:8px;\n  }\n  .pill{\n    padding:8px 12px;\n    border:1px solid rgba(190,220,255,.18);\n    background:rgba(9,14,22,.24);\n    backdrop-filter: blur(4px);\n    border-radius:999px;\n    color:#d5e2f0; font-size:11px; letter-spacing:.08em;\n  }\n\n  .progressHud{\n    width:min(84vw,420px);\n    padding:10px 13px 9px;\n    border:1px solid rgba(190,220,255,.18);\n    background:rgba(9,14,22,.34);\n    backdrop-filter:blur(4px);\n    border-radius:16px;\n  }\n  .progressTrack{\n    height:5px;\n    border-radius:999px;\n    background:rgba(110,145,185,.16);\n    overflow:hidden;\n  }\n  .progressFill{\n    height:100%;\n    width:0%;\n    border-radius:999px;\n    background:rgba(145,190,255,.70);\n    transition:width .08s linear;\n  }\n  .progressText{\n    margin-top:7px;\n    text-align:center;\n    color:rgba(215,230,245,.76);\n    font-size:11px;\n    letter-spacing:.10em;\n    font-variant-numeric:tabular-nums;\n  }\n  .seg{\n    pointer-events:auto;\n    display:grid;\n    grid-template-columns:repeat(3,minmax(0,1fr));\n    gap:5px;\n    width:100%;\n    padding:5px;\n    border:1px solid rgba(190,220,255,.16);\n    background:rgba(9,14,22,.24);\n    backdrop-filter: blur(4px);\n    border-radius:18px;\n  }\n  .seg button{\n    appearance:none;\n    border:0;\n    margin:0;\n    min-width:0;\n    border-radius:12px;\n    padding:8px 6px;\n    background:transparent;\n    color:#b8c8d8;\n    font-size:10px;\n    letter-spacing:.035em;\n    white-space:nowrap;\n  }\n  .seg button.active{\n    background:rgba(150,195,255,.16);\n    color:#e6f1ff;\n    box-shadow: inset 0 0 0 1px rgba(185,220,255,.16);\n  }\n  .response{\n    position:fixed; inset:0;\n    z-index:10;\n    display:flex; align-items:center; justify-content:center;\n    pointer-events:none;\n    opacity:0;\n    transition:opacity .28s ease;\n  }\n  .response.show{ opacity:1; }\n  .responseCard{\n    width:min(92vw, 640px);\n    padding:22px 18px 20px;\n    border-top:1px solid rgba(185,220,255,.16);\n    border-bottom:1px solid rgba(185,220,255,.16);\n    background:rgba(7,12,18,.66);\n    backdrop-filter: blur(7px);\n    text-align:center;\n  }\n  .responseLabel{\n    font-size:10px;\n    letter-spacing:.18em;\n    color:rgba(195,215,235,.62);\n    margin-bottom:11px;\n  }\n  .responseText{\n    font-size:clamp(16px,4.2vw,19px);\n    line-height:1.50;\n    letter-spacing:.045em;\n    color:#eef6ff;\n    text-shadow:0 0 18px rgba(155,190,255,.12);\n    white-space:pre-line;\n  }\n  .responseHint{\n    margin-top:14px;\n    font-size:10px;\n    color:rgba(200,215,232,.54);\n    letter-spacing:.06em;\n    opacity:0;\n    transition:opacity .25s ease;\n  }\n  .response.ready .responseHint{ opacity:1; }\n\n  @media (min-width:520px){\n    .top{\n      flex-direction:row;\n      align-items:center;\n      justify-content:space-between;\n    }\n    .seg{\n      width:auto;\n      grid-template-columns:repeat(5,minmax(72px,auto));\n      border-radius:999px;\n    }\n    .seg button{\n      border-radius:999px;\n      padding:8px 10px;\n      font-size:12px;\n      letter-spacing:.07em;\n    }\n  }\n  @media (max-width:420px){\n    .overlay{\n      padding-left:12px;\n      padding-right:12px;\n    }\n    .pill{\n      padding:7px 10px;\n      font-size:11px;\n    }\n    .bottom{\n      align-items:center;\n    }\n    .progressHud{\n      width:min(90vw,420px);\n    }\n  }\n\n  :host(.embedded) .seg{display:none;}\n  :host(.embedded) .top{justify-content:flex-start;}\n  :host(.embedded) .row{justify-content:flex-start;}\n";
  shadow.appendChild(style);

  const shell = document.createElement('div');
  shell.innerHTML = `<canvas id="c"></canvas>

<div class="overlay">
  <div class="top">
    <div class="row">
      <div class="pill">${tx("ritual.shellLabel")}</div>
    </div>
    <div class="seg">
      <button id="btnWake" class="active">${tx("ritual.wake.name")}</button>
      <button id="btnLink">${tx("ritual.link.name")}</button>
      <button id="btnMemory">${tx("ritual.memory.name")}</button>
      <button id="btnResonance">${tx("ritual.resonance.name")}</button>
      <button id="btnRebirth">${tx("ritual.rebirth.name")}</button>
    </div>
  </div>
  <div class="bottom">
    <div class="progressHud" id="progressHud">
      <div class="progressTrack"><div class="progressFill" id="progressFill"></div></div>
      <div class="progressText" id="progressText">0 / 28</div>
    </div>
  </div>
</div>

<div class="response" id="response">
  <div class="responseCard">
    <div class="responseLabel" id="responseLabel">${tx("ritual.responseLabel")}</div>
    <div class="responseText" id="responseText"></div>
    <div class="responseHint">${tx("ritual.responseHint")}</div>
  </div>
</div>`;

  while(shell.firstChild) shadow.appendChild(shell.firstChild);


  const canvas = shadow.getElementById('c');
  const ctx = canvas.getContext('2d');
  const overlayEl = shadow.querySelector('.overlay');
  const progressHud = shadow.getElementById('progressHud');
  const progressFill = shadow.getElementById('progressFill');
  const progressText = shadow.getElementById('progressText');
  const responseEl = shadow.getElementById('response');
  const responseTextEl = shadow.getElementById('responseText');
  const responseLabelEl = shadow.getElementById('responseLabel');
  const btnWake = shadow.getElementById('btnWake');
  const btnLink = shadow.getElementById('btnLink');
  const btnMemory = shadow.getElementById('btnMemory');
  const btnResonance = shadow.getElementById('btnResonance');
  const btnRebirth = shadow.getElementById('btnRebirth');

  const embedded = true;
  host.classList.add('embedded');

  const runtime = {
    active:false,
    completion:null,
    introStart:0,
    introDuration:0.55,
    introActive:false
  };

  function finishEmbedded(){
    if(!runtime.active) return false;

    const completedRitual = ritual;
    const cb = runtime.completion;

    runtime.active = false;
    runtime.completion = null;
    runtime.introStart = 0;
    runtime.introActive = false;
    if(overlayEl) overlayEl.style.opacity = '1';
    host.classList.remove('active');
    host.setAttribute('aria-hidden','true');

    if(cb) cb(completedRitual);
    return true;
  }

  function DPR(){ return Math.min(window.devicePixelRatio || 1, 2); }

  let W=0,H=0,CX=0,CY=0;
  let ritual = 'wake';
  let state = null;
  let lastTs = 0;
  let stars = [];

  const WAKE = {
    name:tx("ritual.wake.name"),
    response:tx("ritual.wake.response"),
    instruction:tx("ritual.wake.instruction"),
    initExtra(s){
      s.currentTaps = 0;
      s.targetTaps = 12;
      s.ripples = [];
      s.sparks = [];
      s.tapPulse = 0;
      s.rippleFlash = 0;
    }
  };

  const LINK = {
    name:tx("ritual.link.name"),
    response:tx("ritual.link.response"),
    instruction:tx("ritual.link.instruction"),
    initExtra(s){
      s.turnsNeeded = 3.0;
      s.totalTurns = 0;
      s.activePointer = null;
      s.prevAng = null;
      s.prevTime = 0;
      s.trail = [];
      s.trailLast = null;
      s.spinVel = 0;
      s.spinBoost = 0;
      s.arcTimer = 0;
      s.arcs = [];
      s.hintGone = false;
      s.comboHold = 0;
      s.comboActive = false;
      s.comboTime = 0;
      s.startAt = performance.now()/1000;
    }
  };

  const MEMORY = {
    name:tx("ritual.memory.name"),
    response:tx("ritual.memory.response"),
    instruction:tx("ritual.memory.instruction"),
    initExtra(s){
      s.activePointer = null;
      s.lastPt = null;
      s.trace = [];
      s.patches = [];
      s.revealScore = 0;
      s.exposure = 0;
      s.revealTarget = 10.0;
      s.hints = [];
      s.mistSeed = Math.random()*10000;
      const hintRows = 14;
      const hintRadius = 88;
      const hintJitter = 18;
      const seg = Math.PI * 1.4;
      const a0 = -Math.PI * 0.2;
      for(let i=0;i<hintRows;i++){
        const t = i/(hintRows-1);
        const ang = a0 + seg*t;
        const deterministicNoise = Math.sin((i+1)*2.173)*0.5 + 0.5;
        const deterministicNoise2 = Math.sin((i+1)*4.619+1.2)*0.5 + 0.5;
        const deterministicNoise3 = Math.sin((i+1)*7.231+0.7)*0.5 + 0.5;
        const r = hintRadius + (deterministicNoise-0.5)*hintJitter*2;
        const x = CX + Math.cos(ang)*r + (deterministicNoise2-0.5)*hintJitter;
        const y = CY + Math.sin(ang)*r + (deterministicNoise3-0.5)*hintJitter;
        s.hints.push({x,y,flash:0});
      }
    }
  };

  const RESONANCE = {
    name:tx("ritual.resonance.name"),
    response:tx("ritual.resonance.response"),
    instruction:tx("ritual.resonance.instruction"),
    initExtra(s){
      s.activePointer = null;
      s.activeFrom = null;
      s.dragPos = null;
      s.nodeCount = 6;
      s.nodeR = 20;
      s.hitR = 28;
      s.links = [];
      s.nodes = [];
      s.orderIdx = 0;
      s.beatTimer = 0;
      s.heartPulse = 0;
      s.hintShown = false;
      s.perfectPossible = true;

      const R = Math.min(W,H)*0.28;
      // Canvas Y grows downward. Starting at top and increasing angle gives clockwise order.
      for(let i=0;i<s.nodeCount;i++){
        const a = -Math.PI/2 + i*(Math.PI*2/s.nodeCount);
        s.nodes.push({
          x:CX + Math.cos(a)*R,
          y:CY + Math.sin(a)*R,
          done:false,
          glow:(i===0 ? 1 : 0)
        });
      }
    }
  };

  const REBIRTH = {
    name:tx("ritual.rebirth.name"),
    response:tx("ritual.rebirth.response"),
    instruction:tx("ritual.rebirth.instruction"),
    initExtra(s){
      s.activePointer = null;
      s.isCharging = false;
      s.currentCharge = 0;
      s.targetCharge = 10.0;
      s.preBeatThreshold = 5.0;
      s.preBeatTimer = 0;
      s.preBeating = false;
      s.beatTimer = 0;
      s.heartPulse = 0;
      s.ripples = [];
      s.focusSamples = [];
      s.focusScore = null;
      s.focusShowT = 0;
      s.successBlue = 0;
    }
  };

  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function shortestAngleDelta(a,b){
    let d = b-a;
    while(d > Math.PI) d -= Math.PI*2;
    while(d < -Math.PI) d += Math.PI*2;
    return d;
  }
  function expoProgress(now,target){
    return target<=0?1:1-Math.pow(2,-4*Math.max(0,Math.min(now,target))/target);
  }
  function circle(x,y,r,fill){
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    if(fill){ ctx.fillStyle = fill; ctx.fill(); }
  }
  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }
  function drawText(txt,x,y,size,color,align='center'){
    ctx.fillStyle=color;
    ctx.font=`${size}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    ctx.textAlign=align;
    ctx.textBaseline='middle';
    ctx.fillText(txt,x,y);
  }

  function initStars(){
    stars = Array.from({length:56}, (_,i)=>({
      x:Math.random(), y:Math.random(), a:26+Math.random()*56, s:1+Math.random()*1.6, p:i*0.37
    }));
  }

  function getDef(){
    if(ritual==='wake') return WAKE;
    if(ritual==='link') return LINK;
    if(ritual==='memory') return MEMORY;
    if(ritual==='resonance') return RESONANCE;
    return REBIRTH;
  }

  function setRitual(next){
    ritual = next;
    btnWake.classList.toggle('active', ritual==='wake');
    btnLink.classList.toggle('active', ritual==='link');
    btnMemory.classList.toggle('active', ritual==='memory');
    btnResonance.classList.toggle('active', ritual==='resonance');
    btnRebirth.classList.toggle('active', ritual==='rebirth');
    reset();
  }

  btnWake.addEventListener('click', ()=>setRitual('wake'));
  btnLink.addEventListener('click', ()=>setRitual('link'));
  btnMemory.addEventListener('click', ()=>setRitual('memory'));
  btnResonance.addEventListener('click', ()=>setRitual('resonance'));
  btnRebirth.addEventListener('click', ()=>setRitual('rebirth'));

  // v2.7.5: direct in-page ritual runtime.
  // No iframe, no srcdoc, no postMessage, no second document lifecycle.
  window.OrbitRitual = {
    get active(){ return runtime.active; },
    get ready(){ return runtime.active; },

    start(nextRitual, onComplete){
      if(runtime.active) return false;

      const next = String(nextRitual || 'wake').toLowerCase();
      if(!['wake','link','memory','resonance','rebirth'].includes(next)) return false;

      runtime.active = true;
      runtime.completion = typeof onComplete === 'function' ? onComplete : null;
      runtime.introStart = performance.now()/1000;
      runtime.introActive = true;
      if(overlayEl) overlayEl.style.opacity = '0';

      host.classList.add('active');
      host.setAttribute('aria-hidden','false');

      setRitual(next);
      lastTs = runtime.introStart;
      resize();
      return true;
    },

    close(){
      runtime.active = false;
      runtime.completion = null;
      runtime.introStart = 0;
      runtime.introActive = false;
      if(overlayEl) overlayEl.style.opacity = '1';
      host.classList.remove('active');
      host.setAttribute('aria-hidden','true');
      reset();
    }
  };

  function reset(){
    const def = getDef();
    state = {
      mode:'RUNNING',          // RUNNING / SUCCESS_WAIT / RESPONSE
      started:false,
      progress:0,
      coreOn:0,
      flashA:0,
      responseA:0,
      successAt:0,
      responseUnlockAt:0,
      inputReleasedAfterSuccess:true,
      hudAlpha:255,
      phasePulse:0
    };
    def.initExtra(state);
    responseEl.classList.remove('show','ready');
    responseTextEl.textContent = '';
    responseLabelEl.textContent = tx("ritual.responseLabel");
    responseLabelEl.style.display = '';
    updateProgressHud();
  }

  function resize(){
    const oldW=W, oldH=H, oldCX=CX, oldCY=CY;
    const hadLayout = oldW > 0 && oldH > 0;

    const dpr = DPR();
    canvas.width = Math.floor(innerWidth*dpr);
    canvas.height = Math.floor(innerHeight*dpr);
    canvas.style.width = innerWidth+'px';
    canvas.style.height = innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    W=innerWidth; H=innerHeight;
    CX=W/2;
    CY=H/2 + (W < 520 ? 18 : 0);

    if(!hadLayout || !runtime.active || !state || (oldW===W && oldH===H)) return;

    // Phase 17: orientation/viewport changes must not strand ritual targets
    // outside the new canvas. Preserve progress and remap only spatial state.
    cancelActivePointer();

    const oldSpan = Math.max(1, Math.min(oldW,oldH));
    const newSpan = Math.max(1, Math.min(W,H));
    const scale = newSpan / oldSpan;
    const remapPoint = (p) => {
      if(!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      p.x = CX + (p.x-oldCX)*scale;
      p.y = CY + (p.y-oldCY)*scale;
    };

    if(ritual==='memory'){
      for(const h of state.hints || []) remapPoint(h);
      for(const tr of state.trace || []) remapPoint(tr);
      for(const p of state.patches || []){
        remapPoint(p);
        if(Number.isFinite(p.r)) p.r *= scale;
      }
    } else if(ritual==='resonance'){
      for(const n of state.nodes || []) remapPoint(n);
      remapPoint(state.dragPos);
    }
  }

  function markStarted(){
    if(state.started) return;
    state.started = true;
    state.startAt = performance.now()/1000;
  }

  function getProgressValue(){
    if(!state) return 0;
    if(ritual==='wake') return clamp(state.currentTaps/state.targetTaps,0,1);
    if(ritual==='link') return clamp(state.totalTurns/state.turnsNeeded,0,1);
    if(ritual==='memory') return clamp(state.revealScore/state.revealTarget,0,1);
    if(ritual==='resonance') return clamp(state.orderIdx/state.nodeCount,0,1);
    return clamp(state.currentCharge/state.targetCharge,0,1);
  }

  function getProgressText(){
    if(!state) return '';
    if(ritual==='wake') return `${state.currentTaps} / ${state.targetTaps}`;
    if(ritual==='link') return `${state.totalTurns.toFixed(1)} / ${state.turnsNeeded.toFixed(1)}`;
    if(ritual==='memory') return `${Math.floor(getProgressValue()*100)}%`;
    if(ritual==='resonance') return `${state.orderIdx} / ${state.nodeCount}`;
    return `${state.currentCharge.toFixed(1)} / ${state.targetCharge.toFixed(1)}`;
  }

  function updateProgressHud(){
    if(!state) return;
    const p=getProgressValue();
    progressFill.style.width=`${Math.round(p*1000)/10}%`;
    progressText.textContent=getProgressText();
    progressHud.style.opacity=(state.mode==='RESPONSE') ? '0' : '1';
  }

  function pushWakeTap(x,y){
    markStarted();
    state.currentTaps++;
    state.progress = clamp(state.currentTaps / state.targetTaps, 0, 1);
    updateProgressHud();
    state.coreOn = clamp(state.progress * 1.08, 0, 1);
    state.tapPulse = 1;
    state.rippleFlash = 1;
    state.ripples.push({x,y,r:12,a:230});
    for(let i=0;i<6;i++){
      const ang = Math.random()*Math.PI*2;
      const spd = 45 + Math.random()*95;
      state.sparks.push({
        x,y,
        vx:Math.cos(ang)*spd,
        vy:Math.sin(ang)*spd,
        a:255,
        life:0.42 + Math.random()*0.25,
        t:0
      });
    }
    if(state.currentTaps >= state.targetTaps){
      startSuccess();
    }
  }

  function spawnLinkArc(){
    const a = Math.random()*Math.PI*2;
    const ringR = Math.min(W,H)*0.245;
    const outer = {x:CX + Math.cos(a)*ringR, y:CY + Math.sin(a)*ringR};
    const inner = {x:CX + Math.cos(a)*(ringR*0.35), y:CY + Math.sin(a)*(ringR*0.35)};
    state.arcs.push({a:255, life:0.25, seg:[{x:CX,y:CY}, inner, outer]});
  }


  function memoryHintCollide(x,y){
    for(const h of state.hints){
      const d = Math.hypot(x-h.x, y-h.y);
      if(d <= 12){
        state.revealScore += 0.05;
        h.flash = 255;
      } else if(d <= 16){
        state.revealScore += 0.02;
        h.flash = Math.max(h.flash, 180);
      }
    }
  }

  function addMemoryPatch(x,y,k){
    const r = 32 + Math.random()*14;
    state.patches.push({x,y,r,alpha:clamp(190*k,40,255)});
  }


  function resonanceInsideNode(x,y,node,rad){
    return Math.hypot(x-node.x, y-node.y) <= rad;
  }

  function pointLineDistance(px,py,ax,ay,bx,by){
    const abx=bx-ax, aby=by-ay;
    const denom=abx*abx+aby*aby || 1;
    const t=clamp(((px-ax)*abx + (py-ay)*aby)/denom,0,1);
    const qx=ax+abx*t, qy=ay+aby*t;
    return Math.hypot(px-qx, py-qy);
  }

  function resonanceAddLink(i,j){
    if(state.links.some(L => (L.i===i&&L.j===j)||(L.i===j&&L.j===i))) return;
    state.links.push({i,j,t:0});
    state.nodes[i].done=true;
    state.nodes[j].glow=1;
  }


  function rebirthSpawnRipple(alpha=160,width=12,speed=340,radius=36){
    state.ripples.push({radius,alpha,width,speed});
  }

  function calcStdDev(values){
    if(!values.length) return 0;
    const mean=values.reduce((a,b)=>a+b,0)/values.length;
    const variance=values.reduce((a,v)=>a+(v-mean)*(v-mean),0)/values.length;
    return Math.sqrt(variance);
  }

  function cancelActivePointer(){
    if(!state) return;

    if(state.mode==='SUCCESS_WAIT' || state.mode==='RESPONSE'){
      state.inputReleasedAfterSuccess = true;
    }

    if(ritual==='link'){
      state.activePointer = null;
      state.prevAng = null;
      state.prevTime = 0;
      state.trailLast = null;
      state.comboHold = 0;
      return;
    }

    if(ritual==='memory'){
      state.activePointer = null;
      state.lastPt = null;
      return;
    }

    if(ritual==='resonance'){
      state.activePointer = null;
      state.activeFrom = null;
      state.dragPos = null;
      return;
    }

    if(ritual==='rebirth'){
      state.activePointer = null;
      state.isCharging = false;
    }
  }

  function ritualIntroProgress(now = performance.now()/1000){
    if(!runtime.introActive) return 1;
    return clamp((now - runtime.introStart) / Math.max(0.001, runtime.introDuration), 0, 1);
  }

  function handleCancel(e){
    e?.preventDefault?.();
    cancelActivePointer();
  }

  function handleDown(e){
    e.preventDefault();
    const now = performance.now()/1000;
    if(runtime.introActive && ritualIntroProgress(now) < 1) return;

    if(state.mode==='RESPONSE'){
      if(now >= state.responseUnlockAt && state.inputReleasedAfterSuccess){
        if(!finishEmbedded()) reset();
      }
      return;
    }
    if(state.mode!=='RUNNING') return;

    const x=e.clientX, y=e.clientY;

    if(ritual==='wake'){
      pushWakeTap(x,y);
      return;
    }

    if(ritual==='memory'){
      if(state.activePointer !== null) return;
      canvas.setPointerCapture?.(e.pointerId);
      state.activePointer = e.pointerId;
      markStarted();
      state.lastPt = {x,y};
      state.trace.push({x,y,life:1.25});
      addMemoryPatch(x,y,0.55);
      memoryHintCollide(x,y);
      return;
    }

    if(ritual==='resonance'){
      if(state.activePointer !== null) return;
      const wantFrom = state.orderIdx % state.nodeCount;
      if(resonanceInsideNode(x,y,state.nodes[wantFrom],state.nodeR)){
        canvas.setPointerCapture?.(e.pointerId);
        markStarted();
        state.activePointer=e.pointerId;
        state.activeFrom=wantFrom;
        state.dragPos={x,y};
      }
      return;
    }

    if(ritual==='rebirth'){
      if(state.activePointer !== null) return;
      const centerY=CY+10;
      const inCore=Math.hypot(x-CX,y-centerY) < 80;
      if(inCore){
        canvas.setPointerCapture?.(e.pointerId);
        markStarted();
        state.activePointer=e.pointerId;
        state.isCharging=true;
        state.focusSamples=[];
        state.focusSamples.push(Math.hypot(x-CX,y-centerY));
      }
      return;
    }

    // LINK
    if(state.activePointer !== null) return;
    canvas.setPointerCapture?.(e.pointerId);
    state.activePointer = e.pointerId;
    const dx=x-CX, dy=y-CY;
    const r=Math.hypot(dx,dy);
    if(r>=10) markStarted();
    state.prevAng = (r>=10)?Math.atan2(dy,dx):null;
    state.prevTime = performance.now()/1000;
    state.trailLast = {x,y};
    state.trail.push({x,y,a:190});
  }

  function handleMove(e){
    e.preventDefault();
    if(runtime.introActive && ritualIntroProgress() < 1) return;
    if(state.mode!=='RUNNING' || e.pointerId!==state.activePointer) return;

    if(ritual==='memory'){
      const x=e.clientX, y=e.clientY;
      if(!state.lastPt){
        state.lastPt={x,y};
        return;
      }
      const d = Math.hypot(x-state.lastPt.x, y-state.lastPt.y);
      if(d >= 6){
        state.lastPt = {x,y};
        state.trace.push({x,y,life:1.25});
        state.revealScore += d / 250.0;
        addMemoryPatch(x,y,1.0);
        memoryHintCollide(x,y);
        state.progress = clamp(state.revealScore / state.revealTarget, 0, 1);
        updateProgressHud();
        if(state.progress >= 1) startSuccess();
      }
      return;
    }

    if(ritual==='resonance'){
      const x=e.clientX, y=e.clientY;
      if(state.activeFrom===null) return;
      state.dragPos={x,y};
      const from=state.nodes[state.activeFrom];
      const to=state.nodes[(state.orderIdx+1)%state.nodeCount];
      if(pointLineDistance(x,y,from.x,from.y,to.x,to.y) > 60){
        state.perfectPossible=false;
      }
      return;
    }

    if(ritual==='rebirth'){
      const x=e.clientX, y=e.clientY;
      const centerY=CY+10;
      state.focusSamples.push(Math.hypot(x-CX,y-centerY));
      return;
    }

    if(ritual!=='link') return;
    const now=performance.now()/1000;
    const x=e.clientX, y=e.clientY;
    const dx=x-CX, dy=y-CY;
    const r=Math.hypot(dx,dy);

    if(r>=10){
      const ang=Math.atan2(dy,dx);
      if(state.prevAng!==null){
        let d = shortestAngleDelta(state.prevAng, ang);
        const dt = Math.max(1e-3, now-state.prevTime);
        d = clamp(d, -0.9, 0.9);

        // Clockwise only = positive turn
        const clockwise = Math.max(0, d);
        const omega = Math.abs(clockwise)/dt;

        state.spinVel += (omega - state.spinVel) * 0.01;
        state.spinBoost = clamp(state.spinVel / 4.2, 0, 1);

        if(state.spinBoost >= 0.80){
          state.comboHold += dt;
          if(!state.comboActive && state.comboHold >= 0.60){
            state.comboActive = true;
            state.comboTime = 0.60;
          }
        }else{
          state.comboHold = 0;
        }

        state.totalTurns += clockwise / (Math.PI*2);
        state.progress = clamp(state.totalTurns / state.turnsNeeded, 0, 1);
        state.coreOn = clamp(state.totalTurns / 2.0, 0, 1);
      }
      state.prevAng = ang;
      state.prevTime = now;
    } else {
      state.prevAng = null;
      state.prevTime = now;
    }

    const p={x,y};
    if(!state.trailLast || Math.hypot(p.x-state.trailLast.x, p.y-state.trailLast.y) > 3){
      state.trailLast = p;
      state.trail.push({x,y,a:170 + 50*state.spinBoost});
      if(state.trail.length > 90) state.trail.shift();
    }

    if(state.progress >= 1){
      startSuccess();
    }
  }

  function handleUp(e){
    e.preventDefault();
    if(runtime.introActive && ritualIntroProgress() < 1) return;
    if(state.mode==='SUCCESS_WAIT' || state.mode==='RESPONSE'){
      state.inputReleasedAfterSuccess = true;
      return;
    }
    if(e.pointerId!==state.activePointer) return;

    if(ritual==='link'){
      state.activePointer = null;
      state.prevAng = null;
      state.prevTime = 0;
      state.trailLast = null;
      return;
    }

    if(ritual==='memory'){
      state.activePointer = null;
      state.lastPt = null;
      return;
    }

    if(ritual==='resonance'){
      const x=e.clientX, y=e.clientY;
      if(state.activeFrom!==null){
        const wantFrom=state.orderIdx % state.nodeCount;
        const wantTo=(state.orderIdx+1) % state.nodeCount;
        if(state.activeFrom===wantFrom && resonanceInsideNode(x,y,state.nodes[wantTo],state.hitR)){
          resonanceAddLink(wantFrom,wantTo);
          state.orderIdx += 1;
          state.progress = clamp(state.orderIdx/state.nodeCount,0,1);
          updateProgressHud();
          if(!state.hintShown) state.hintShown=true;

          if(state.orderIdx>=state.nodeCount){
            startSuccess();
            state.inputReleasedAfterSuccess = true;
          }
        }
      }
      state.activePointer=null;
      state.activeFrom=null;
      state.dragPos=null;
      return;
    }

    if(ritual==='rebirth'){
      state.activePointer=null;
      state.isCharging=false;
    }
  }

  canvas.addEventListener('pointerdown', handleDown);
  canvas.addEventListener('pointermove', handleMove);
  canvas.addEventListener('pointerup', handleUp);
  canvas.addEventListener('pointercancel', handleCancel);
  canvas.addEventListener('lostpointercapture', handleCancel);
  window.addEventListener('blur', cancelActivePointer);
  window.addEventListener('pagehide', cancelActivePointer);

  document.addEventListener('contextmenu', e=>e.preventDefault(), {passive:false});
  document.addEventListener('selectstart', e=>e.preventDefault(), {passive:false});
  document.addEventListener('dragstart', e=>e.preventDefault(), {passive:false});
  document.addEventListener('gesturestart', e=>e.preventDefault(), {passive:false});

  function startSuccess(){
    if(state.mode!=='RUNNING') return;
    state.mode = 'SUCCESS_WAIT';
    state.flashA = 150;
    state.successAt = performance.now()/1000;
    state.inputReleasedAfterSuccess = false;
    state.responseUnlockAt = 0;
    state.hudAlpha = 0;

    if(ritual==='rebirth'){
      rebirthSpawnRipple(255,22,400,40);
      const sd = state.focusSamples.length>4 ? calcStdDev(state.focusSamples) : 0;
      const norm = clamp(1 - sd/40,0,1);
      state.focusScore = Math.floor(norm*100+0.5);
      state.focusShowT = 1.0;
      state.successBlue = 0;
    }

    responseTextEl.textContent = getDef().response;
    responseLabelEl.textContent = tx("ritual.responseLabel");
    responseLabelEl.style.display = '';
    responseEl.classList.remove('show','ready');
  }

  function startResponse(){
    state.mode = 'RESPONSE';
    updateProgressHud();
    const now = performance.now()/1000;
    state.responseUnlockAt = now + (ritual==='rebirth' ? 2.0 : 1.15);
    responseEl.classList.add('show');
    responseEl.classList.remove('ready');
  }

  function update(dt, now){
    state.phasePulse = Math.sin(now * (1.6 + 0.8*state.coreOn));
    state.flashA = Math.max(0, state.flashA - 260*dt);

    if(ritual==='wake'){
      state.tapPulse = Math.max(0, state.tapPulse - 2.4*dt);
      state.rippleFlash = Math.max(0, state.rippleFlash - 2.2*dt);

      for(let i=state.ripples.length-1;i>=0;i--){
        const rp = state.ripples[i];
        rp.r += 150*dt;
        rp.a -= 190*dt;
        if(rp.a <= 0) state.ripples.splice(i,1);
      }

      for(let i=state.sparks.length-1;i>=0;i--){
        const s = state.sparks[i];
        s.t += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.a -= 520*dt;
        if(s.t > s.life || s.a <= 0) state.sparks.splice(i,1);
      }
    } else if(ritual==='memory'){
      const targetExposure = clamp(state.revealScore / state.revealTarget, 0, 1) * 0.9;
      state.exposure = lerp(state.exposure, targetExposure, 1 - Math.exp(-dt*2.4));
      state.progress = clamp(state.revealScore / state.revealTarget, 0, 1);

      for(let i=state.trace.length-1;i>=0;i--){
        const tr = state.trace[i];
        tr.life -= dt;
        if(tr.life <= 0) state.trace.splice(i,1);
      }

      for(let i=state.patches.length-1;i>=0;i--){
        const p = state.patches[i];
        p.r += 60*dt;
        p.alpha -= 70*dt;
        if(p.alpha <= 0) state.patches.splice(i,1);
      }

      for(const h of state.hints){
        if(h.flash > 0) h.flash = Math.max(0, h.flash - 240*dt);
      }
    } else if(ritual==='resonance'){
      state.beatTimer = (state.beatTimer + dt) % 1.0;
      const phase = state.beatTimer;
      state.heartPulse = Math.max(0, 1 - phase*8);

      for(const L of state.links){
        L.t = clamp(L.t + dt/0.25, 0, 1);
      }
      for(const n of state.nodes){
        n.glow = clamp(n.glow - dt*1.6, 0, 1);
      }
    } else if(ritual==='rebirth'){
      const beatPeriod=60/55;

      if(state.mode==='RUNNING'){
        if(state.isCharging){
          state.currentCharge += dt;
          if(!state.preBeating && state.currentCharge>=state.preBeatThreshold){
            state.preBeating=true;
            state.preBeatTimer=0;
          }
          if(state.preBeating){
            state.preBeatTimer += dt;
            while(state.preBeatTimer>=beatPeriod){
              state.preBeatTimer -= beatPeriod;
              rebirthSpawnRipple(120,12,340,36);
            }
          }
          if(state.currentCharge>=state.targetCharge){
            state.progress=1;
            startSuccess();
          }
        }else{
          state.currentCharge=Math.max(0,state.currentCharge-dt*0.5);
          state.preBeating=false;
          state.preBeatTimer=0;
        }
        state.progress=clamp(state.currentCharge/state.targetCharge,0,1);
      }

      if(state.mode==='SUCCESS_WAIT'){
        state.successBlue=clamp(state.successBlue+dt*0.8,0,1);
        state.beatTimer += dt;
        while(state.beatTimer>=beatPeriod){
          state.beatTimer -= beatPeriod;
          rebirthSpawnRipple(200,16,360,40 + state.ripples.length*6);
        }
        state.heartPulse=Math.max(0,1-(state.beatTimer/beatPeriod)*8);
        if(state.focusShowT>0) state.focusShowT-=dt;
      }

      for(let i=state.ripples.length-1;i>=0;i--){
        const r=state.ripples[i];
        r.radius += r.speed*dt;
        r.alpha -= 150*dt;
        if(r.alpha<=0) state.ripples.splice(i,1);
      }
    } else {
      state.spinVel *= 0.92;
      state.spinBoost = clamp(state.spinVel / 4.2, 0, 1);

      for(let i=state.trail.length-1;i>=0;i--){
        state.trail[i].a -= 230*dt;
        if(state.trail[i].a <= 0) state.trail.splice(i,1);
      }

      if(state.comboActive){
        state.comboTime -= dt;
        if(state.comboTime <= 0) state.comboActive = false;
      }

      let hz = 1.2 + 2.0*state.spinBoost + (state.comboActive ? 1.2 : 0);
      if(state.mode==='RUNNING' && state.totalTurns >= 1.5){
        state.arcTimer += dt;
        const period = 1/hz;
        while(state.arcTimer >= period){
          state.arcTimer -= period;
          spawnLinkArc();
        }
      }

      for(let i=state.arcs.length-1;i>=0;i--){
        const a = state.arcs[i];
        a.life -= dt;
        a.a = 255 * clamp(a.life/0.25,0,1);
        if(a.life <= 0) state.arcs.splice(i,1);
      }

      if((now - state.startAt) > 3.2 || state.progress > 0.20){
        state.hintGone = true;
      }
    }

    if(state.mode === 'SUCCESS_WAIT'){
      const wait = ritual==='rebirth' ? 1.10 : 0.55;
      if(now - state.successAt > wait){
        startResponse();
      }
      return;
    }

    if(state.mode === 'RESPONSE'){
      if(now >= state.responseUnlockAt){
        responseEl.classList.add('ready');
      }
      updateProgressHud();
      return;
    }

    updateProgressHud();
  }

  function drawBackground(now){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgb(8,10,14)');
    g.addColorStop(1,'rgb(14,18,26)');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    for(const s of stars){
      const a = s.a + 30*Math.sin(now*0.8+s.p);
      ctx.fillStyle = `rgba(230,240,255,${a/255})`;
      circle(s.x*W, s.y*H, s.s, ctx.fillStyle);
    }

    const vg = ctx.createRadialGradient(CX,CY,Math.min(W,H)*0.18,CX,CY,Math.max(W,H)*0.72);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0,0,W,H);
  }

  function drawStation(progress, now){
    const p = clamp(progress,0,1);
    const alpha = 0.10 + 0.18*p + ((state.mode==='SUCCESS_WAIT' || state.mode==='RESPONSE') ? 0.12*state.coreOn : 0);
    const strokeA = alpha;
    const glowA = alpha * 0.55;
    const rCore = 44, rInner = 72, rOuter = 116;

    ctx.save();
    ctx.translate(CX,CY);
    ctx.rotate(Math.sin(now*0.08)*0.01);

    ctx.globalCompositeOperation='lighter';
    circle(0,0,rOuter*2.0,`rgba(90,135,175,${glowA*0.25})`);
    circle(0,0,rInner*2.2,`rgba(120,165,210,${glowA*0.22})`);
    ctx.globalCompositeOperation='source-over';

    ctx.lineWidth = 1.4;
    ctx.strokeStyle = `rgba(165,205,235,${strokeA})`;

    [[-2.55,-1.70],[-1.35,-0.48],[0.18,0.95],[1.38,2.42]].forEach(([a0,a1])=>{
      ctx.beginPath(); ctx.arc(0,0,rOuter,a0,a1); ctx.stroke();
    });
    [[-2.95,-2.10],[-1.95,-0.95],[-0.62,0.38],[0.72,1.82],[2.25,2.82]].forEach(([a0,a1])=>{
      ctx.beginPath(); ctx.arc(0,0,rInner,a0,a1); ctx.stroke();
    });

    const spokeAngles = [-Math.PI/2, 0, Math.PI/2, Math.PI];
    spokeAngles.forEach((a,idx)=>{
      const x1 = Math.cos(a)*(rCore+8), y1 = Math.sin(a)*(rCore+8);
      const x2 = Math.cos(a)*(rInner-8), y2 = Math.sin(a)*(rInner-8);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();

      const px = Math.cos(a)*(rOuter+10), py = Math.sin(a)*(rOuter+10);
      ctx.save();
      ctx.translate(px,py); ctx.rotate(a);
      ctx.strokeRect(-9,-5,18,10);
      ctx.restore();

      if(idx !== 1){
        circle(px,py,3.3,`rgba(155,205,240,${0.10 + 0.18*p})`);
      }
    });

    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0,0,rCore,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,rCore-15,0,Math.PI*2); ctx.stroke();

    ctx.globalCompositeOperation='lighter';
    circle(0,0,(18 + 6*p)*2.0, `rgba(125,170,255,${0.10 + 0.18*p})`);
    ctx.globalCompositeOperation='source-over';
    circle(0,0,12, `rgba(145,190,255,${0.12 + 0.24*p})`);

    ctx.strokeStyle = `rgba(175,205,225,${0.08 + 0.06*(1-p)})`;
    ctx.lineWidth = 1.1;
    [
      [[-20,-34],[-30,-46],[-36,-57]],
      [[28,18],[42,23],[51,31]],
      [[-7,29],[-12,41],[-18,51]]
    ].forEach(path=>{
      ctx.beginPath();
      ctx.moveTo(path[0][0],path[0][1]);
      for(let i=1;i<path.length;i++) ctx.lineTo(path[i][0],path[i][1]);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawWake(now){
    const prog = state.mode==='RESPONSE' ? 1 : expoProgress(state.currentTaps, state.targetTaps);
    drawStation(prog, now);

    // ripples
    ctx.save();
    for(const rp of state.ripples){
      ctx.strokeStyle = `rgba(170,210,255,${rp.a/255})`;
      ctx.lineWidth = 2.0;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();

    // sparks
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    for(const s of state.sparks){
      circle(s.x,s.y,1.6,`rgba(210,235,255,${s.a/255})`);
    }
    ctx.restore();

    // central glow
    const t = prog;
    const pulse = state.phasePulse;
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    circle(CX,CY,100 + 72*t + 24*state.tapPulse, `rgba(110,160,255,${0.10 + 0.18*t + 0.12*state.rippleFlash})`);
    circle(CX,CY,62 + 42*t + 10*Math.max(0,pulse), `rgba(155,195,255,${0.14 + 0.24*t + 0.10*state.tapPulse})`);
    circle(CX,CY,16 + 13*t + 3*state.tapPulse, `rgba(255,255,255,${0.25 + 0.35*t})`);
    ctx.restore();

    // HUD
    if(state.mode==='RUNNING' && !state.started){
      drawText(WAKE.instruction, CX, CY-96, 13, 'rgba(200,210,220,0.68)');
    }
  }

  function drawLink(now){
    drawStation(state.progress, now);

    const ringR = Math.min(W,H)*0.245;
    const boost = state.spinBoost || 0;

    // ring glow
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    circle(CX,CY,ringR*1.10,`rgba(120,170,255,${(40 + 60*state.coreOn + 90*boost)/255})`);
    circle(CX,CY,ringR*0.73,`rgba(160,200,255,${(20 + 40*state.coreOn + 50*boost)/255})`);
    const g = (40 + 120*state.coreOn + 20*state.phasePulse) * (1 + 0.6*boost);
    circle(CX,CY,clamp(g*0.7*(1+0.25*boost),0,270), `rgba(170,210,255,${(120 + 90*state.coreOn + 70*boost)/255})`);
    circle(CX,CY,14 + 12*state.coreOn + 5*boost, `rgba(255,255,255,${(60 + 70*state.coreOn + 40*boost)/255})`);
    ctx.restore();

    // rotating arcs
    ctx.save();
    ctx.strokeStyle = `rgba(180,220,255,${0.14 + 0.18*state.coreOn})`;
    ctx.lineWidth = 1.2;
    for(let i=0;i<3;i++){
      ctx.beginPath();
      const start = -now*0.9 + i*0.45;
      ctx.arc(CX,CY,ringR*(1 - i*0.08), start, start + Math.PI*1.55);
      ctx.stroke();
    }
    ctx.restore();

    // clockwise hint dots
    if(!state.hintGone && state.mode==='RUNNING'){
      const a = 140 + 60*Math.sin(now*3);
      const r = ringR*1.25;
      for(let i=0;i<28;i++){
        const ang = ((i/28)*Math.PI*2) - Math.PI/2;
        circle(CX + Math.cos(ang)*r, CY + Math.sin(ang)*r, 1.8, `rgba(200,230,255,${a/255})`);
      }
      // Clockwise = highlight moving from top toward right/down
      const lead = (-Math.PI/2) + ((now*2.8) % (Math.PI*2));
      circle(CX + Math.cos(lead)*r, CY + Math.sin(lead)*r, 4.8, `rgba(220,245,255,${(a+40)/255})`);
    }

    // trail
    if(state.trail.length >= 2){
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.lineCap='round';
      ctx.lineJoin='round';

      ctx.lineWidth=6;
      for(let i=1;i<state.trail.length;i++){
        const a0=state.trail[i-1], a1=state.trail[i];
        const alpha=(a1.a*(0.9 + 0.6*boost))/255;
        ctx.strokeStyle=`rgba(200,230,255,${alpha})`;
        ctx.beginPath(); ctx.moveTo(a0.x,a0.y); ctx.lineTo(a1.x,a1.y); ctx.stroke();
      }
      ctx.lineWidth=2;
      for(let i=1;i<state.trail.length;i++){
        const a0=state.trail[i-1], a1=state.trail[i];
        const alpha=(a1.a*(1.0 + 0.6*boost))/255;
        ctx.strokeStyle=`rgba(225,245,255,${alpha})`;
        ctx.beginPath(); ctx.moveTo(a0.x,a0.y); ctx.lineTo(a1.x,a1.y); ctx.stroke();
      }
      ctx.restore();
    }

    // connection arcs
    if(state.arcs.length){
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.lineWidth=3;
      for(const a of state.arcs){
        ctx.strokeStyle = `rgba(200,235,255,${a.a/255})`;
        ctx.beginPath();
        ctx.moveTo(a.seg[0].x,a.seg[0].y);
        ctx.lineTo(a.seg[1].x,a.seg[1].y);
        ctx.lineTo(a.seg[2].x,a.seg[2].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // HUD
    if(state.mode==='RUNNING' && !state.started){
      drawText(LINK.instruction, CX, CY-96, 13, 'rgba(200,210,220,0.68)');
    }
  }


  function drawMemory(now){
    // Station is deliberately buried in mist at first and becomes legible as memory exposure grows.
    const stationReveal = 0.10 + state.exposure * 0.90;
    ctx.save();
    ctx.globalAlpha = 0.22 + state.exposure*0.58;
    drawStation(stationReveal, now);
    ctx.restore();

    // Soft full-screen exposure veil.
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle = `rgba(255,255,255,${0.12*state.exposure})`;
    ctx.fillRect(0,0,W,H);
    ctx.restore();

    // Mist: horizontal scan lines + fixed drifting particles, fading with exposure.
    const mistAlpha = 1 - 0.70*state.exposure;
    ctx.save();
    ctx.strokeStyle = `rgba(235,243,255,${0.055*mistAlpha})`;
    ctx.lineWidth = 1;
    for(let y=0;y<H;y+=3){
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }
    for(let i=0;i<90;i++){
      const fx = (Math.sin(i*91.17 + state.mistSeed)*0.5+0.5)*W;
      const fy = (Math.sin(i*43.71 + state.mistSeed*0.7 + 1.8)*0.5+0.5)*H;
      ctx.fillStyle = `rgba(255,255,255,${0.025*mistAlpha})`;
      ctx.fillRect(fx,fy,1,1);
    }
    ctx.restore();

    // Trace particles.
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    for(const tr of state.trace){
      const k = clamp(tr.life/1.25,0,1);
      const size = 5 + 20*(1-k);
      circle(tr.x,tr.y,size,`rgba(235,245,255,${0.63*k})`);
    }

    // Exposure patches.
    for(const p of state.patches){
      circle(p.x,p.y,p.r,`rgba(255,255,255,${clamp(p.alpha/255,0,1)*0.48})`);
    }
    ctx.restore();

    // Constellation hints only — no central gameplay ring.
    for(const h of state.hints){
      circle(h.x,h.y,1.75,'rgba(200,215,235,0.47)');
      if(h.flash > 0){
        const k = h.flash/255;
        circle(h.x,h.y,3 + 3*k,`rgba(220,240,255,${0.86*k})`);
      }
    }

    if(state.mode==='RUNNING' && !state.started){
      drawText(MEMORY.instruction, CX, CY - 110, 13, 'rgba(220,230,245,0.72)');
    }
  }


  function drawResonance(now){
    const pulse=state.heartPulse || 0;

    // The station is clear enough to act as the body of the ritual,
    // but stays behind the interactive nodes.
    ctx.save();
    ctx.globalAlpha=0.52 + state.progress*0.20;
    drawStation(0.45 + state.progress*0.55, now);
    ctx.restore();

    // Existing cables: pulse like a heartbeat and "lock" into place.
    for(const L of state.links){
      const a=state.nodes[L.i], b=state.nodes[L.j];
      const px=lerp(a.x,b.x,L.t), py=lerp(a.y,b.y,L.t);
      const pulseW=3 + 6*pulse;
      const pulseA=90*pulse;

      ctx.strokeStyle=`rgba(140,185,255,${(80+pulseA*0.4)/255})`;
      ctx.lineWidth=pulseW;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(px,py); ctx.stroke();

      ctx.strokeStyle=`rgba(90,170,255,${(120+pulseA)/255})`;
      ctx.lineWidth=pulseW*0.65;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(px,py); ctx.stroke();
    }

    // Current drag cable.
    if(state.activeFrom!==null && state.dragPos){
      const a=state.nodes[state.activeFrom];
      ctx.strokeStyle='rgba(90,170,255,0.55)';
      ctx.lineWidth=6;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(state.dragPos.x,state.dragPos.y); ctx.stroke();
    }

    // First-link-only hint.
    if(!state.hintShown && state.mode==='RUNNING'){
      const a=state.nodes[0], b=state.nodes[1];
      ctx.strokeStyle=`rgba(200,215,235,${(120+90*pulse)/255})`;
      ctx.lineWidth=2;
      ctx.setLineDash([7,8]);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Nodes.
    for(let i=0;i<state.nodes.length;i++){
      const n=state.nodes[i];
      const current = state.mode==='RUNNING' && i===(state.orderIdx % state.nodeCount);
      const isStart = i===0;
      const baseA = (current||isStart) ? 0.94 : 0.47;
      const glowA = (70*pulse + 160*n.glow)/255;

      circle(n.x,n.y,22,`rgba(170,200,255,${clamp(baseA+glowA,0,1)})`);
      circle(n.x,n.y,11, current||isStart ? 'rgba(180,220,255,0.63)' : 'rgba(170,200,255,0.35)');
      if(n.done){
        circle(n.x,n.y,9,'rgba(120,190,255,0.86)');
      }
    }

    // Core heartbeat.
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    circle(CX,CY,80 + 30*pulse,`rgba(180,210,255,${(80+120*pulse)/255})`);
    ctx.restore();

    if(state.mode==='RUNNING' && !state.started){
      drawText(RESONANCE.instruction, CX, CY-86, 13, 'rgba(210,225,245,0.70)');
    }
  }


  function drawRebirth(now){
    const p=clamp(state.currentCharge/state.targetCharge,0,1);
    const centerY=CY+10;

    // Final stage slowly lets the station become fully present.
    ctx.save();
    ctx.globalAlpha=0.60 + p*0.30;
    drawStation(0.70 + p*0.30, now);
    ctx.restore();

    // Success phase: the surrounding space quietly turns blue rather than exploding.
    if(state.successBlue>0){
      const g=ctx.createLinearGradient(0,0,0,H);
      const t=state.successBlue;
      g.addColorStop(0,`rgba(0,65,155,${0.30*t})`);
      g.addColorStop(1,`rgba(0,110,255,${0.18*t})`);
      ctx.fillStyle=g;
      ctx.fillRect(0,0,W,H);
    }

    const holdPulse = state.isCharging ? Math.sin(now*6.0) : Math.sin(now*2.0);
    const successPulse = state.mode==='SUCCESS_WAIT' ? state.heartPulse : 0;
    const corePulse = state.mode==='SUCCESS_WAIT' ? successPulse : Math.max(0,holdPulse);
    const coreR=40 + p*20 + corePulse*(state.mode==='SUCCESS_WAIT' ? 8 : (state.isCharging?10:4));

    ctx.save();
    ctx.globalCompositeOperation='lighter';
    circle(CX,centerY,coreR*1.30,`rgba(${Math.round(190*(1-p))},${Math.round(220-110*p)},255,${0.23+0.28*p})`);
    circle(CX,centerY,coreR*0.80,`rgba(150,205,255,${0.46+0.30*p})`);
    circle(CX,centerY,coreR*0.40,`rgba(255,255,255,${0.38+0.40*p})`);
    ctx.restore();

    // Outer halo: heartbeat briefly thickens it.
    const haloR=144;
    const haloW=2 + 1.6*Math.max(0,corePulse);
    ctx.strokeStyle=`rgba(200,230,255,${0.35+0.20*Math.max(0,corePulse)})`;
    ctx.lineWidth=haloW;
    ctx.beginPath(); ctx.arc(CX,centerY,haloR,0,Math.PI*2); ctx.stroke();

    // Heartbeat ripples.
    for(const r of state.ripples){
      ctx.strokeStyle=`rgba(200,230,255,${clamp(r.alpha/255,0,1)})`;
      ctx.lineWidth=Math.max(1,r.width*(r.alpha/255));
      ctx.beginPath(); ctx.arc(CX,centerY,r.radius,0,Math.PI*2); ctx.stroke();
    }

    if(state.mode==='RUNNING' && !state.started){
      drawText(REBIRTH.instruction, CX, CY-86, 13, 'rgba(200,210,220,0.68)');
    }
  }

  function drawFlash(){
    if(state.flashA <= 0) return;
    ctx.fillStyle = `rgba(255,255,255,${state.flashA/255})`;
    ctx.fillRect(0,0,W,H);
  }

  function drawCurrentRitual(now){
    if(ritual==='wake') drawWake(now);
    else if(ritual==='link') drawLink(now);
    else if(ritual==='memory') drawMemory(now);
    else if(ritual==='resonance') drawResonance(now);
    else drawRebirth(now);
  }

  function drawRitualIntro(now, q){
    // Stage 1: a single powered conductor appears before any interface.
    const lineStages = q < 0.16 ? 0.18 : (q < 0.30 ? 0.48 : 0.82);
    const lineW = Math.min(W*0.78, 420) * lineStages;
    ctx.save();
    ctx.strokeStyle = q < 0.30
      ? 'rgba(135,205,240,0.66)'
      : 'rgba(175,225,250,0.82)';
    ctx.lineWidth = q < 0.30 ? 1.0 : 1.4;
    ctx.beginPath();
    ctx.moveTo(CX-lineW/2, CY);
    ctx.lineTo(CX+lineW/2, CY);
    ctx.stroke();

    // Stage 2: the real ritual geometry joins the circuit in two hard steps.
    // Mark it "started" only while drawing so instructional text stays dark
    // until the final HUD wake-up.
    if(q >= 0.34){
      const savedStarted = state.started;
      state.started = true;
      ctx.globalAlpha = q < 0.58 ? 0.34 : 0.76;
      drawCurrentRitual(now);
      state.started = savedStarted;
      ctx.globalAlpha = 1;
    }

    if(q >= 0.24){
      const a = q < 0.58 ? 0.55 : 0.9;
      ctx.fillStyle = 'rgba(205,240,255,' + a + ')';
      ctx.beginPath(); ctx.arc(CX-lineW/2,CY,2.2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(CX+lineW/2,CY,2.2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function render(ts){
    if(!runtime.active){
      requestAnimationFrame(render);
      return;
    }

    const now=ts/1000;
    if(!lastTs) lastTs = now;
    const dt = Math.min(0.033, now-lastTs);
    lastTs = now;

    const introQ = ritualIntroProgress(now);
    if(runtime.introActive && introQ < 1){
      // Freeze simulation and gestures while the deep system powers on.
      drawBackground(now);
      drawRitualIntro(now, introQ);
      lastTs = now;
      requestAnimationFrame(render);
      return;
    }

    if(runtime.introActive){
      runtime.introActive = false;
      if(overlayEl) overlayEl.style.opacity = '1';
      lastTs = now;
    }

    update(dt, now);

    drawBackground(now);
    drawCurrentRitual(now);
    drawFlash();

    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  resize();
  initStars();
  ritual='wake';
  btnWake.classList.toggle('active', true);
  btnLink.classList.toggle('active', false);
  btnMemory.classList.toggle('active', false);
  btnResonance.classList.toggle('active', false);
  btnRebirth.classList.toggle('active', false);
  reset();
  requestAnimationFrame(render);

})();
