'use strict';
// Actual 60Hz Engine/Codea states; native Canvas samples at 15fps. No retiming.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {harness}=require('./harness.cjs'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const BASE='d9c3f115eb7dda60e2c9d9dcc77432e4b2835307';
function collect(ref=null){
 const h=harness({width:390,height:740,sourceRef:ref}),w=h.w,S=w.PumpokoStory;
 let state,frame=0,phase='title',released=false,playFrame=0,finished=false;const events={},opening=[],ending=[];
 const update=S.update;S.update=(s,...args)=>{state=s;return update(s,...args);};
 h.pointer('pointerdown',195,365);events.touch=0;
 for(frame=1;frame<7200;frame++){
  const p=h.probe();
  if(p.phase==='title'&&!released)h.pointer('pointermove',195+79*Math.sin((frame-1)/60*2.3),365+70*Math.cos((frame-1)/60*2.3));
  if(p.phase==='playing'){
   if(!playFrame)playFrame=frame;
   h.key(p.model.active==='rutabaga'&&(frame-playFrame)%40===0?'keyup':'keydown','ArrowRight');
  }
  if(p.finished&&!finished){finished=true;h.key('keyup','ArrowRight');}
  h.frame();const q=h.probe(),t=frame/60;
  if(q.prologue.loose===9&&!released){events.loose=t;h.pointer('pointerup',195,365);released=true;}
  if(q.phase!==phase){events[q.phase]=t;phase=q.phase;}
  if(state.ending?.settledAt!==null&&state.ending?.settledAt!==undefined&&events.fixed===undefined)events.fixed=t;
  if(frame%4===0||q.returnTitle&&q.phase==='title'){
   const snapshot={t,state:structuredClone({...state,prologue:null,opening:null,nursery:null}),
    prologue:structuredClone(state.prologue),nursery:structuredClone(S.nurseryPoses(state)),
    opening:state.opening?{...state.opening,geometry:null,seeds:structuredClone(state.opening.seeds),camera:{...state.opening.camera},transition:{...state.opening.transition}}:null,
    openingView:state.opening?w.PumpokoOpening.view(state.opening):null,openingFrame:S.openingFrame(state)};
   if(released&&!finished&&t<=(events.playing??Infinity)+1)opening.push(snapshot);
   if(finished)ending.push(snapshot);
  }
  if(q.returnTitle&&q.phase==='title')break;
 }
 assert.equal(state.world.handoffs,4);assert.ok(state.returnTitle);assert.deepEqual(h.errors,[]);
 return {w,events,opening,ending};
}
function draw(run,c,f){
 const w=run.w,s=f.state;c.resetTransform();c.globalAlpha=1;c.fillStyle='#faf1dc';c.fillRect(0,0,390,740);c.save();c.translate(0,740);c.scale(1,-1);
 if(s.phase==='title')w.PumpokoTitleDraw(c,f.prologue);
 else if(s.phase==='opening'){
  // Opening geometry contains sampler functions. Reuse the canonical adapter
  // and the captured numeric seed/camera states, never interpolate a pose.
  const geometry=w.PumpokoOpening.create(w.PumpokoPrologue.create(),s.world).geometry;
  s.opening={...f.opening,geometry};w.PumpokoOpeningDraw(c,s,f.nursery,f.openingFrame);s.opening=null;
 }else{
  const mix=w.PumpokoStory.returnMix(s);c.save();c.globalAlpha=1-mix;w.PumpokoWorldDraw(c,s.world,s.view,f.nursery);c.restore();
  if(mix)w.PumpokoTitleDraw(c,f.prologue,{x:195,y:375,scale:1},mix,mix);
 }
 c.restore();
}
async function main(){
 const runs=[collect(BASE),collect()],out=path.resolve(__dirname,'../visual-review');fs.mkdirSync(out,{recursive:true});
 for(const run of runs){const logo=await loadImage(path.resolve(__dirname,'../assets/pumpoko-logo.svg')); /* title closure reads DOM */run.w.document.getElementById=(original=>id=>id==='title-art'?logo:original(id))(run.w.document.getElementById);}
 const {execFileSync}=require('node:child_process'),tmp=fs.mkdtempSync(require('node:os').tmpdir()+'/pumpoko-timing-');
 const panel=createCanvas(390,740),pc=panel.getContext('2d'),film=createCanvas(780,780),fc=film.getContext('2d');let serial=0;
 try{
  for(const [section,offsets]of [['opening',[0,2,4,6,8,10,11]],['ending',[0,3,6,9,12,15,18,21,24]]]){
   const start=run=>section==='opening'?run.events.loose:run.events.coast;
   const closest=(run,t)=>run[section].find(f=>f.t>=start(run)+t)||run[section].at(-1);
   const sheet=createCanvas(offsets.length*195,2*410),sc=sheet.getContext('2d');sc.fillStyle='#faf1dc';sc.fillRect(0,0,sheet.width,sheet.height);
   for(let row=0;row<2;row++)for(let col=0;col<offsets.length;col++){
    const f=closest(runs[row],offsets[col]);draw(runs[row],pc,f);const image=await loadImage(panel.toBuffer('image/png'));sc.drawImage(image,col*195,row*410+35,195,370);
    sc.fillStyle='#695539';sc.font='13px sans-serif';sc.fillText(`${row?'After':'Before'} +${(f.t-start(runs[row])).toFixed(1)}s ${f.state.phase}`,col*195+5,row*410+22);
   }
   fs.writeFileSync(path.join(out,'timing-'+section+'.png'),sheet.toBuffer('image/png'));
   const duration=Math.max(...runs.map(run=>run[section].at(-1).t-start(run)));
   for(let i=0;i<=Math.ceil(duration*15);i++){
    fc.fillStyle='#faf1dc';fc.fillRect(0,0,780,780);
    for(let col=0;col<2;col++){
     const run=runs[col],f=closest(run,i/15);draw(run,pc,f);const image=await loadImage(panel.toBuffer('image/png'));fc.drawImage(image,col*390,40);
     fc.fillStyle='#695539';fc.font='14px sans-serif';fc.fillText(`${col?'After':'Before'} / ${section} +${(i/15).toFixed(2)}s / ${f.state.phase}`,col*390+7,24);
    }
    fs.writeFileSync(path.join(tmp,String(serial++).padStart(4,'0')+'.png'),film.toBuffer('image/png'));
    if(i%15===0&&global.gc)global.gc();
   }
  }
  execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','15','-i',path.join(tmp,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','26','-movflags','+faststart',path.join(out,'timing-comparison.mp4')]);
  console.log(JSON.stringify({base:BASE,events:runs.map(r=>r.events),frames:serial,fps:15,duration:serial/15,capture:'actual 60Hz Engine states; native Canvas; no audio/device evidence; shorter variant holds its final captured frame, no retiming; one cut between opening/ending'}));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
module.exports={BASE,collect};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
