'use strict';
// Actual unchanged Story/WORLD trajectories and camera, automatically driven.
// Native offscreen Canvas comparison; not a browser or device recording.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas'),{harness}=require('./harness.cjs');
const BASE='ab66a9a9f05a5ae72b5f6cd9c56cac89d3de9149';
function collect(){
 const w=harness().w,S=w.PumpokoStory,s=S.create();S.beginJourney(s);
 for(let i=0;i<1200&&s.phase==='opening';i++)S.update(s,0,1/60);
 assert.equal(s.phase,'playing');
 const clips=[],seen=new Set(),history=[];let active=null;
 for(let i=0;i<10800&&(!s.world.finished||active);i++){
  const axis=require('./five-stage-controls.cjs').axis(s.world);
  S.update(s,axis,1/60);
  const frame={world:structuredClone(s.world),view:{...s.view},nursery:structuredClone(S.nurseryPoses(s))};
  history.push(frame);if(history.length>91)history.shift();
  const touching=s.world.holes.find(h=>h.state==='compressing'&&!seen.has(h.id));
  if(touching){assert.ok(active===null,'non-overlapping completed clips');seen.add(touching.id);active={id:touching.id,index:s.world.holes.indexOf(touching),frames:history.slice(),contact:history.length-1,time:s.world.time};clips.push(active);}
  else if(active){active.frames.push(frame);if(active.frames.length>=active.contact+121)active=null;}
 }
 assert.equal(s.world.handoffs,4);assert.equal(clips.length,4);assert.ok(s.world.finished);assert.ok(active===null,'non-overlapping completed clips');
 return {w,clips};
}
function draw(w,c,frame){
 c.resetTransform();c.globalAlpha=1;c.clearRect(0,0,390,740);c.fillStyle=w.PumpokoMaterial.air;c.fillRect(0,0,390,740);
 c.save();c.translate(0,740);c.scale(1,-1);w.PumpokoWorldDraw(c,frame.world,frame.view,frame.nursery);c.restore();
}
function picks(clip){
 const contact=clip.frames.findIndex((f,i)=>i>=clip.contact&&f.world.holes[clip.index].state==='compressing'&&f.world.holes[clip.index].elapsed>=.025);
 const exit=clip.frames.findIndex((f,i)=>i>=clip.contact&&f.world.holes[clip.index].state==='settling'&&f.world.holes[clip.index].elapsed>=.065);
 const after=clip.contact+36;
 assert.ok(contact>=0&&exit>=0);assert.equal(clip.frames[after].world.holes[clip.index].state,'complete');
 return [['Approach',clip.contact-6],['Contact / compression',contact],['Exiting',exit],['After / seated partner',after]];
}
function main(){
 const {w,clips}=collect(),before=harness({sourceRef:BASE}).w;
 const out=path.resolve(__dirname,'../visual-review');fs.mkdirSync(out,{recursive:true});
 const sheet=createCanvas(1560,4*2*510+70),sc=sheet.getContext('2d');sc.fillStyle='#faf1dc';sc.fillRect(0,0,sheet.width,sheet.height);
 sc.fillStyle='#695539';sc.font='18px sans-serif';sc.fillText('4 actual exchanges: before #186 / corrected; same world positions and .8 camera',12,25);
 sc.font='14px sans-serif';sc.fillText('Native Canvas / automatic input / real timing / not device footage',12,52);
 const panel=createCanvas(390,740),pc=panel.getContext('2d');
 for(const [row,clip]of clips.entries())for(const [variant,root]of [before,w].entries()){
  for(const [col,[label,index]]of picks(clip).entries()){
   const y=70+(row*2+variant)*510,frame=clip.frames[index];draw(root,pc,frame);
   sc.drawImage(panel,0,150,390,470,col*390,y+40,390,470);
   sc.fillStyle='#695539';sc.font='14px sans-serif';sc.fillText(`${clip.id} / ${variant?'After':'Before #186'} / ${label}`,col*390+8,y+18);
   sc.font='12px sans-serif';sc.fillText(`world ${frame.world.time.toFixed(3)}s / ${frame.world.holes[clip.index].state}`,col*390+8,y+34);
  }
 }
 fs.writeFileSync(path.join(out,'socket-comparison.png'),sheet.toBuffer('image/png'));
 const {mkdtempSync,rmSync}=fs,{tmpdir}=require('node:os'),{execFileSync}=require('node:child_process');
 const tmp=mkdtempSync(path.join(tmpdir(),'pumpoko-sockets-')),film=createCanvas(780,780),fc=film.getContext('2d');let serial=0;
 try{
  for(const clip of clips)for(let i=0;i<clip.frames.length;i++){
   const frame=clip.frames[i];fc.fillStyle='#faf1dc';fc.fillRect(0,0,780,780);
   for(const [col,root]of [before,w].entries()){
    draw(root,pc,frame);fc.drawImage(panel,col*390,40);
    fc.fillStyle='#695539';fc.font='15px sans-serif';fc.fillText(`${clip.id} / ${col?'Corrected':'Before #186'} / ${(frame.world.time-clip.time).toFixed(2)}s`,col*390+10,24);
   }
   fs.writeFileSync(path.join(tmp,String(serial++).padStart(4,'0')+'.png'),film.toBuffer('image/png'));
   if(i%30===0&&global.gc)global.gc();
  }
  execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','60','-i',path.join(tmp,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','26','-movflags','+faststart',path.join(out,'socket-handoffs.mp4')]);
  const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames,r_frame_rate','-of','json',path.join(out,'socket-handoffs.mp4')],{encoding:'utf8'}));
  assert.equal(Number(meta.streams[0].nb_frames),serial);assert.equal(meta.streams[0].r_frame_rate,'60/1');
  console.log(JSON.stringify({out,base:BASE,frames:serial,fps:60,duration:meta.format.duration,clips:clips.map(c=>({id:c.id,contactAt:c.time,frames:c.frames.length,states:picks(c).map(([label,i])=>({label,worldTime:c.frames[i].world.time,state:c.frames[i].world.holes[c.index].state}))})),capture:'native Canvas; actual motion/camera, same states both variants, no retiming, cuts only between distant sockets, no audio/device evidence'}));
 }finally{rmSync(tmp,{recursive:true,force:true});}
}
module.exports={BASE,collect,draw,picks};if(require.main===module)main();
