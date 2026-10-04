(function(root){
  'use strict';
  const M=root.Morning02, game=new M.Morning(), ink='#526b64', warm='#c78053';
  let finger=null,tip={x:195,y:515},stroke=[],pulses={},lastMessage='';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sound(){SSE.audio.tone({frequency:330+game.route.length*65,endFrequency:430+game.route.length*65,duration:.045,volume:SSE.audio.baseline().reference.se.ui});}
  function seal(){const n=game.route.length;if(n&&stroke.length>1){game.traces[n-1]=stroke.slice();}stroke=[];}
  function contact(id,p){
    const prev=game.route.length;
    if(!game.connect(id))return;
    if(game.route.length>prev){stroke.push({x:M.byId[id].x,y:M.byId[id].y});seal();stroke=[{x:M.byId[id].x,y:M.byId[id].y}];pulses[id]=1;sound();}
    else{stroke=[{x:M.byId[id].x,y:M.byId[id].y}];pulses[id]=.6;}
  }
  function sweep(a,b){
    const hits=M.objects.map(o=>({o,...M.distanceToSegment(o,a,b)})).filter(h=>h.distance<40).sort((x,y)=>x.t-y.t);
    for(const h of hits)contact(h.o.id,b);
  }
  function reset(){game.reset();finger=null;stroke=[];tip={...M.byId.start};pulses={};}
  function label(c,str,x,y,size=14,color=ink,align='center'){c.fillStyle=color;c.font=`${size}px system-ui, sans-serif`;c.textAlign=align;c.fillText(str,x,y);}
  function path(c,points,color,width=4){if(points.length<2)return;c.beginPath();c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
  function object(c,o){
    const selected=game.route.includes(o.id),done=game.done.includes(o.id),current=game.current===o.id;
    const pulse=pulses[o.id]||0;
    c.save();c.translate(o.x,o.y);c.scale(1+(reduced?0:pulse*.075),1-(reduced?0:pulse*.035));
    c.shadowColor='#6c68552b';c.shadowBlur=9;c.shadowOffsetY=4;
    c.fillStyle=done?'#dbe1ce':selected?'#f8ddb3':'#f8f1df';c.beginPath();c.arc(0,0,36,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.strokeStyle=current?warm:selected?ink:'#b4b9a3';c.lineWidth=current?3:1.5;c.stroke();
    c.strokeStyle=ink;c.fillStyle=ink;c.lineWidth=2.4;
    if(o.id==='coffee'){c.beginPath();c.roundRect(-14,-7,25,20,4);c.stroke();c.beginPath();c.arc(13,1,7,-Math.PI/2,Math.PI/2);c.stroke();path(c,[{x:-9,y:-14},{x:-6,y:-23},{x:-10,y:-29}],ink,1.4);}
    if(o.id==='laundry'){c.strokeRect(-19,-23,38,45);c.beginPath();c.arc(0,5,12,0,Math.PI*2);c.stroke();path(c,[{x:-15,y:-14},{x:15,y:-14}],ink,2);c.fillRect(-11,-20,4,3);}
    if(o.id==='bag'){c.beginPath();c.roundRect(-20,-9,40,28,5);c.stroke();c.beginPath();c.arc(0,-9,10,Math.PI,Math.PI*2);c.stroke();path(c,[{x:-7,y:-8},{x:-7,y:18}],ink,1);}
    if(o.id==='door'){c.strokeRect(-15,-25,30,47);c.fillRect(6,-1,4,4);path(c,[{x:-22,y:23},{x:22,y:23}],ink,2);}
    if(o.id==='start'){c.beginPath();c.arc(0,0,10,0,Math.PI*2);c.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;path(c,[{x:Math.cos(a)*16,y:Math.sin(a)*16},{x:Math.cos(a)*23,y:Math.sin(a)*23}],ink,2);}}
    if(done)label(c,'✓',25,-23,16);
    if(selected)label(c,String(game.route.indexOf(o.id)+1),-28,-27,15,warm);
    c.restore();if(o.id==='start'){label(c,'いま',o.x+54,o.y+5,14);return;}label(c,current?'いま · '+o.name:o.name,o.x,o.y+57,16);
    label(c,o.id==='laundry'?`${M.time(game.ready)} 洗い上がり · 1分`:o.detail,o.x,o.y+77,11,'#7c8070');
  }
  const scene={opaque:true,
    update(dt){game.update(dt);for(const id of Object.keys(pulses))pulses[id]=Math.max(0,pulses[id]-dt*4);
      if(finger){tip.x=M.follow(tip.x,finger.x,dt);tip.y=M.follow(tip.y,finger.y,dt);}
      if(game.message!==lastMessage){lastMessage=game.message;document.getElementById('announce').textContent=lastMessage;}
    },
    draw(){background(239,232,216);withCanvasContext(c=>{
      // Work-local top-down canvas within Engine's logical viewport.
      c.scale(1,-1);c.translate(0,-740);
      c.fillStyle='#f4efdf';c.beginPath();c.roundRect(20,120,350,515,35);c.fill();
      label(c,'MORNING THREAD / 02',195,55,11,'#8a8877');label(c,'ひとつの朝を、つくる',195,87,21);
      label(c,`${M.time(game.clock)}  →  8:20`,195,156,23);label(c,'コーヒー・洗濯・荷物を済ませて出る',195,180,12);
      const toTop=p=>({x:p.x,y:740-p.y});
      // All model positions use Codea's bottom-left coordinates; drawings convert below.
      c.save();c.translate(0,740);c.scale(1,-1);
      for(const h of game.history)path(c,[M.byId[h.from],M.byId[h.id]],'#a8b8a1',5);
      let from=M.byId[game.current];game.route.forEach((id,i)=>{const to=M.byId[id];path(c,game.traces[i]?.length>1?game.traces[i]:[from,to],ink,4);from=to;});
      if(finger){path(c,stroke.concat([tip]),warm,4);c.fillStyle=warm;c.beginPath();c.arc(finger.x,finger.y,5,0,Math.PI*2);c.fill();c.beginPath();c.arc(tip.x,tip.y,8,0,Math.PI*2);c.fill();}
      if(game.active){const a=game.active,f=Math.min(1,game.timer/(a.duration*.45)),p=M.byId[a.from],q=M.byId[a.id];c.fillStyle=warm;c.beginPath();c.arc(p.x+(q.x-p.x)*f,p.y+(q.y-p.y)*f,8,0,Math.PI*2);c.fill();}
      c.restore();
      for(const o of M.objects){object(c,{...o,y:740-o.y});}
      // Object labels and illustrations are top-down; model and touch stay bottom-up.
      label(c,game.message,195,659,game.mode==='change'?13:14,game.mode==='failure'?warm:ink);
      if(game.mode==='plan'){
        const preview=game.preview().at(-1);label(c,preview?`最後は ${M.time(preview.clock)} · 戻ってなぞるとほどける`:'物から物へ。途中で指を離しても大丈夫',195,684,11,'#868575');
        if(game.route.length){label(c,'▶ 朝を動かす',283,633,14,warm);}
      }else if(game.mode==='change'){label(c,'残りをつなぎ直す ↗',283,633,14,warm);}
      else if(game.mode==='success'||game.mode==='failure'){label(c,'↺ もう一度',195,633,16,warm);}
      label(c,'↺',40,690,25,'#8a8877');label(c,SSE.audio.enabled?'♪':'♪ OFF',342,690,12,'#8a8877');
    });},
    touch(t){
      const p={x:t.x,y:t.y};
      if(t.state===BEGAN){
        if(Math.hypot(p.x-40,p.y-50)<28){reset();return true;}
        if(Math.hypot(p.x-342,p.y-50)<30){SSE.audio.setEnabled(!SSE.audio.enabled);return true;}
        if(game.mode==='success'||game.mode==='failure'){if(Math.hypot(p.x-195,p.y-107)<27)reset();return true;}
        if(game.mode==='change'){if(Math.hypot(p.x-283,p.y-107)<27){game.replan();game.traces=[];}return true;}
        if(game.mode!=='plan')return true;
        if(game.route.length&&Math.hypot(p.x-283,p.y-107)<27){game.run();return true;}
        const o=M.objects.find(o=>Math.hypot(p.x-o.x,p.y-o.y)<42);
        if(!o)return true;
        const endpoint=game.route.at(-1)||game.current;
        // Picking any unfinished object also joins it: a tap is a simple fallback.
        if(o.id!==endpoint){contact(o.id,p);}
        finger=p;tip={...p};stroke=[{...M.byId[game.route.at(-1)||game.current]}];pulses[o.id]=1;
      }else if(t.state===MOVING&&finger){const old=finger;finger=p;stroke.push(p);if(stroke.length>512)stroke.splice(1,1);sweep(old,p);}
      else if(t.state===ENDED||t.state===CANCELLED){stroke=[];finger=null;}
      return true;
    }
  };
  // Read-only observation, no testing mutations or alternate input path.
  root.MorningThread02=Object.freeze({snapshot:()=>game.snapshot()});
  SSE.createApp({id:SUKIMASTOCK_WORK.id,logicalWidth:390,logicalHeight:740,frameRate:60,initialScene:'morning',pointerMode:'primary',debug:false,audio:SSE.audio.withBaseline({storageKey:'morning-thread-02.sound',enabled:false}),analytics:{enabled:false},scenes:{morning:scene}});
})(window);
