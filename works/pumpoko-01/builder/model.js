(function(root){
  'use strict';
  const D=root.PumpkinDynamics||require('../dynamics.js'),J=root.PumpkinJourney||require('../journey.js'),G=root.PumpkinStageGeometry||require('../stage-geometry.js'),canonical=root.PumpkinStageData||require('../stage-data.js');
  const copy=v=>JSON.parse(JSON.stringify(v)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function create(data=canonical){
    G.compile(data);const m={draft:copy(data),geometry:G.compile(data),mode:'edit',selection:null,testStart:{x:data.start.x},run:null,traces:Array.from({length:9},()=>[]),losses:[],error:'',undo:[],redo:[],traceClock:0,nextId:0};
    m.uid=prefix=>{let id;const text=JSON.stringify(m.draft);do{id=prefix+'-'+(++m.nextId);}while(text.includes('"'+id+'"'));return id;};return m;
  }
  function checkpoint(m){m.undo.push({draft:copy(m.draft),testStart:copy(m.testStart)});if(m.undo.length>40)m.undo.shift();m.redo=[];}
  function change(m,fn,remember=true){
    if(m.mode!=='edit')return false;const before=copy(m.draft),start=copy(m.testStart),selection=copy(m.selection);
    try{fn();const g=G.compile(m.draft);if(remember){m.undo.push({draft:before,testStart:start});if(m.undo.length>40)m.undo.shift();m.redo=[];}m.geometry=g;m.error='';return true;}
    catch(e){m.draft=before;m.testStart=start;m.selection=selection;m.error=e.message;return false;}
  }
  function point(m,id){for(const s of m.draft.surfaces){const index=s.points.findIndex(p=>p.id===id);if(index>=0)return {surface:s,index,p:s.points[index]};}return null;}
  function editPoint(m,id,x,y,remember=true){return change(m,()=>{
    const q=point(m,id);if(!q)throw Error('Point not found');const si=m.draft.surfaces.indexOf(q.surface),ps=q.surface.points;
    const lo=q.index?ps[q.index-1].x+2:si?m.draft.surfaces[si-1].points.at(-1).x+2:-19900;
    const hi=q.index<ps.length-1?ps[q.index+1].x-2:si<m.draft.surfaces.length-1?m.draft.surfaces[si+1].points[0].x-2:19900;
    const old=q.p.x;q.p.x=clamp(x,lo,hi);q.p.y=clamp(y,-1900,1900);
    for(const r of m.draft.materials){if(r.left===old)r.left=q.p.x;if(r.right===old)r.right=q.p.x;}
  },remember);}
  function tangent(m,id,value,remember=true){return change(m,()=>{const q=point(m,id);if(!q)throw Error('Point not found');q.p.tangent=clamp(value,-4,4);},remember);}
  function addPoint(m){return change(m,()=>{
    let q=m.selection?.type==='point'?point(m,m.selection.id):null;
    const surface=q?.surface||m.draft.surfaces.find(s=>s.id===m.selection?.surface)||m.draft.surfaces.at(-1);
    const i=q?Math.min(q.index,surface.points.length-2):Math.floor((surface.points.length-2)/2),a=surface.points[i],b=surface.points[i+1];
    if(b.x-a.x<5)throw Error('この区間は狭すぎます');const x=(a.x+b.x)/2,f=m.geometry.floor(x),p={id:m.uid('point'),x,y:f.y,...(a.round&&b.round?{round:true}:{})};
    if(a.tangent!==undefined&&b.tangent!==undefined)p.tangent=f.slope;
    surface.points.splice(i+1,0,p);m.selection={type:'point',id:p.id};
  });}
  function remove(m){return change(m,()=>{
    if(m.selection?.type==='loop'){m.draft.features=m.draft.features.filter(f=>f.id!==m.selection.id);}
    else {const q=point(m,m.selection?.id);if(!q)throw Error('pointまたはLoopを選んでください');if(q.surface.points.length<=2)throw Error('surfaceには2点以上必要です');q.surface.points.splice(q.index,1);}
    m.selection=null;
  });}
  function setMaterial(m,kind){return change(m,()=>{
    if(!G.MATERIALS.includes(kind))throw Error('Invalid material');
    if(m.selection?.type==='loop'){m.draft.features.find(f=>f.id===m.selection.id).material=kind;return;}
    let s=m.draft.surfaces.find(s=>s.id===m.selection?.surface),q=point(m,m.selection?.id);
    if(q)s=q.surface;if(!s)throw Error('地面の区間を選んでください');
    const i=q?Math.min(q.index,s.points.length-2):clamp(m.selection?.interval||0,0,s.points.length-2),left=s.points[i].x,right=s.points[i+1].x;
    m.draft.materials=m.draft.materials.filter(r=>r.left!==left||r.right!==right);
    m.draft.materials.push({id:m.uid('material'),left,right,material:kind,includeLeft:true,includeRight:true});
  });}
  function addPrimitive(m,kind){return change(m,()=>{
    if(kind==='Gap'){
      const s=m.draft.surfaces.find(s=>s.id===m.selection?.surface)||point(m,m.selection?.id)?.surface||m.draft.surfaces.at(-1),ps=s.points;
      const x=clamp(m.selection?.x||(ps[0].x+ps.at(-1).x)/2,ps[0].x+35,ps.at(-1).x-35),left=x-24,right=x+24;
      if(!(left>ps[0].x&&right<ps.at(-1).x))throw Error('Gapを作る区間が短すぎます');
      const edge=x=>({id:m.uid('point'),x,y:m.geometry.floor(x).y,tangent:m.geometry.floor(x).slope,...(m.geometry.isRound(x)?{round:true}:{})});
      const next={id:m.uid('surface'),material:s.material,points:[edge(right),...ps.filter(p=>p.x>right)]};
      s.points=[...ps.filter(p=>p.x<left),edge(left)];const index=m.draft.surfaces.indexOf(s);m.draft.surfaces.splice(index+1,0,next);m.selection={type:'gap',index};return;
    }
    if(kind==='Loop'){
      const s=m.draft.surfaces.at(-1),a=s.points.at(-1),x=a.x,y=a.y;a.tangent=0;a.round=true;
      const p=(dx,dy,t=0)=>({id:m.uid('point'),x:x+dx,y:y+dy,tangent:t,round:true});
      s.points.push(p(80,0),p(165,80,.85),p(250,150),p(335,80,-.85),p(420,0),p(720-32*1.8,0),p(720-32*.65,32*.55),p(940,32*.55));
      const radius=32,cx=x+720,cy=y-radius;
      const f={id:m.uid('loop'),type:'loop',x:cx,y:cy,radius,entry:{x:cx-radius*1.8,y},exit:{x:cx+radius*1.8,y:y+radius*.55},material:'polished'};
      m.draft.features.push(f);m.draft.materials.push({id:m.uid('material'),left:x,right:x+940,material:'polished',includeLeft:true,includeRight:true});
      m.draft.end={left:x+830,right:x+930};m.testStart={x:x+250};m.selection={type:'loop',id:f.id};return;
    }
    if(!['Straight','Slope','Bowl','Ramp'].includes(kind))throw Error('Unknown primitive');
    const s=m.draft.surfaces.at(-1),a=s.points.at(-1),x=a.x,y=a.y;
    const p=(dx,dy,t=0,round=false)=>({id:m.uid('point'),x:x+dx,y:y+dy,tangent:t,...(round?{round:true}:{})});
    a.tangent=0;
    if(kind==='Straight')s.points.push(p(320,0));
    if(kind==='Slope')s.points.push(p(240,100,.4),p(340,100));
    if(kind==='Ramp')s.points.push(p(180,0),p(280,-80,-1));
    if(kind==='Bowl'){a.round=true;s.points.push(p(85,85,1,true),p(170,155,0,true),p(255,85,-1,true),p(340,0,0,true),p(450,0));}
    const last=s.points.at(-1);m.draft.end={left:last.x-100,right:last.x-10};m.selection={type:'point',id:last.id};
  });}
  function editLoop(m,id,kind,x,y,remember=true){return change(m,()=>{
    const f=m.draft.features.find(f=>f.id===id);if(!f)throw Error('Loop not found');
    const left=m.geometry.bounds.left+5,right=m.geometry.bounds.right-5;
    if(kind==='radius'){const bottom=f.y+f.radius;f.radius=clamp(Math.hypot(x-f.x,y-f.y),24,Math.min(300,(f.x-left)/1.8,(right-f.x)/1.8));f.y=bottom-f.radius;}
    else {f.x=clamp(x,left+f.radius*1.8,right-f.radius*1.8);f.y=clamp(y,-1900,1900);}
    f.entry={x:f.x-f.radius*1.8,y:f.y+f.radius};f.exit={x:f.x+f.radius*1.8,y:m.geometry.floor(f.x+f.radius*1.8)?.y??f.y+f.radius*1.55};
  },remember);}
  function moveStart(m,x,remember=true){return change(m,()=>{if(!m.geometry.floor(x))throw Error('TEST STARTは地面の上に置いてください');m.testStart.x=x;},remember);}
  function moveEnd(m,side,x,remember=true){return change(m,()=>{m.draft.end[side]=x;},remember);}
  function play(m){
    try{
      const g=G.compile(m.draft),f=g.floor(m.testStart.x);if(!f)throw Error('TEST STARTを地面へ移してください');
      const segment=g.segments[f.segment],span=segment.right-segment.left;
      if(span<28)throw Error('9粒を置く地面が狭すぎます');
      const centre=clamp(m.testStart.x,segment.left+12,segment.right-12),spacing=Math.min(24,(span-24)/2);
      const s=J.create(D.create(),false,g);
      // Builder-only initial placement. No changes to seeds after the run begins.
      s.seeds.forEach((p,i)=>{p.x=clamp(centre+(i%3-1)*spacing,segment.left+11,segment.right-11);const at=g.floor(p.x);p.y=at.y-12-Math.floor(i/3)*19;p.vx=p.vy=p.spin=0;p.angle=(i%3-1)*.12;p.turn=p.angle;});
      s.camera.x=centre;s.camera.y=f.y-90;m.run=s;m.mode='play';m.traces=Array.from({length:9},()=>[]);m.losses=[];m.traceClock=0;m.previousLost=Array(9).fill(false);m.fallEntry=Array(9).fill(null);m.error='';record(m);return true;
    }catch(e){m.error=e.message;return false;}
  }
  function record(m){
    m.run.seeds.forEach((p,i)=>{
      if(!p.inactive){const a=m.traces[i];a.push({x:p.x,y:p.y});if(a.length>1200)a.shift();}
      if(!p.lost&&!m.run.geometry.floor(p.x)&&!m.fallEntry[i])m.fallEntry[i]={x:p.x,y:p.y};
      if(!p.lost&&m.run.geometry.floor(p.x))m.fallEntry[i]=null;
      if(p.lost&&!m.previousLost[i])m.losses.push({seed:i,...(m.fallEntry[i]||{x:p.x,y:p.y})});
      m.previousLost[i]=p.lost;
    });
  }
  function update(m,dt){if(m.mode!=='play')return;J.update(m.run,dt);m.traceClock+=Math.min(dt,.06);if(m.traceClock>=.1){m.traceClock%=.1;record(m);}}
  function edit(m){if(m.run)J.release(m.run);m.mode='edit';m.run=null;}
  function history(m,direction){if(m.mode!=='edit')return false;const from=direction==='undo'?m.undo:m.redo,to=direction==='undo'?m.redo:m.undo,item=from.pop();if(!item)return false;to.push({draft:copy(m.draft),testStart:copy(m.testStart)});m.draft=item.draft;m.testStart=item.testStart;m.geometry=G.compile(m.draft);m.selection=null;m.error='';return true;}
  function importJSON(m,text){try{const draft=JSON.parse(text);G.compile(draft);return change(m,()=>{m.draft=copy(draft);m.testStart={x:draft.start.x};m.selection=null;});}catch(e){m.error=e.message;return false;}}
  const api=Object.freeze({create,checkpoint,change,point,editPoint,tangent,addPoint,remove,setMaterial,addPrimitive,editLoop,moveStart,moveEnd,play,update,edit,history,importJSON,exportJSON:m=>JSON.stringify(m.draft,null,2)});
  root.PumpkinBuilderModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
