'use strict';
// Real 60Hz model states, native Canvas imagery; no input/trajectory retiming.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),{harness}=require('./harness.cjs');
const BASE='0246b9ec22f7113addca96c53082474ab87fbcc7';
function collect(ref=null){
 const h=harness({sourceRef:ref}),w=h.w,S=w.PumpokoStory,s=S.create();S.beginJourney(s);
 while(s.phase==='opening')S.update(s,0,1/60);
 const frames=[];let arrival=null,near=null,maxInputSpeed=0,seats=0;
 for(let i=0;i<7200&&!s.returnTitle;i++){
  const input=s.phase==='playing'?(s.world.active==='rutabaga'&&i%40===0?0:1):0;
  const events=S.update(s,input,1/60);seats+=events.filter(e=>e.type==='seat').length;
  const b=s.world.pumpkin;
  if(s.world.handoffs===4&&b.x>=(ref?7300:7610)&&near===null)near=s.world.time;
  if(s.world.finished&&arrival===null)arrival=s.world.time;
  if(near!==null&&!s.world.finished)maxInputSpeed=Math.max(maxInputSpeed,Math.hypot(b.vx,b.vy));
  if(near!==null&&i%4===0)frames.push({world:structuredClone(s.world),view:{...s.view},phase:s.phase,elapsed:s.elapsed,ending:s.ending?structuredClone(s.ending):null,nursery:structuredClone(S.nurseryPoses(s)),t:s.world.time});
 }
 assert.ok(s.returnTitle);assert.equal(s.world.handoffs,4);if(!ref)assert.equal(seats,1);
 return {w,frames,arrival,near,seats,maxInputSpeed};
}
function picks(run,after=true){
 const at=t=>run.frames.find(f=>f.t>=t)||run.frames.at(-1);
 if(!after)return [at(run.near),at(run.arrival),at(run.arrival+.16),run.frames.find(f=>f.ending?.settledAt!=null)||run.frames.at(-1)];
 const entering=run.frames.find(f=>!f.world.finished&&f.world.pumpkin.x>=f.world.course.goal.x-26);
 return [at(run.near),entering,at(run.arrival+.16),run.frames.find(f=>f.ending?.settledAt!=null)];
}
function draw(run,c,f){
 const before=JSON.stringify(f.world);c.resetTransform();c.globalAlpha=1;c.fillStyle='#faf1dc';c.fillRect(0,0,390,740);
 c.save();c.translate(0,740);c.scale(1,-1);run.w.PumpokoWorldDraw(c,f.world,f.view,f.nursery);c.restore();
 assert.equal(JSON.stringify(f.world),before,'art is read-only');
}
async function main(){
 const after=collect(),before=collect(BASE),out=path.resolve(__dirname,'../visual-review');fs.mkdirSync(out,{recursive:true});
 const panel=createCanvas(390,740),pc=panel.getContext('2d'),labels=['Approach','Enter pocket','Seat / small squash','Final pair composition'];
 const sheet=createCanvas(1560,800),sc=sheet.getContext('2d');sc.fillStyle='#faf1dc';sc.fillRect(0,0,1560,800);
 for(const [i,f]of picks(after).entries()){assert.ok(f);draw(after,pc,f);const image=await loadImage(panel.toBuffer('image/png'));sc.drawImage(image,i*390,60);sc.fillStyle='#695539';sc.font='16px sans-serif';sc.fillText(labels[i],i*390+12,24);sc.font='13px sans-serif';sc.fillText(`${f.t.toFixed(3)}s / ${f.phase} / z=${f.view.z.toFixed(3)}`,i*390+12,46);}
 fs.writeFileSync(path.join(out,'goal-sequence.png'),sheet.toBuffer('image/png'));
 const comparison=createCanvas(1560,1600),cc=comparison.getContext('2d');cc.fillStyle='#faf1dc';cc.fillRect(0,0,1560,1600);
 for(const [row,run]of [before,after].entries())for(const [i,f]of picks(run,row===1).entries()){
  draw(run,pc,f);const image=await loadImage(panel.toBuffer('image/png'));cc.drawImage(image,i*390,row*800+60);
  cc.fillStyle='#695539';cc.font='16px sans-serif';cc.fillText(`${row?'After':'Before #188'} / ${row?labels[i]:['Final approach','Old finishX passage','Old coast','Old final pair'][i]}`,i*390+12,row*800+24);cc.font='13px sans-serif';cc.fillText(`${f.t.toFixed(3)}s / ${f.phase} / actual z=${f.view.z.toFixed(3)}`,i*390+12,row*800+46);
 }
 fs.writeFileSync(path.join(out,'goal-comparison.png'),comparison.toBuffer('image/png'));
 const {execFileSync}=require('node:child_process'),tmp=fs.mkdtempSync(require('node:os').tmpdir()+'/pumpoko-goal-'),film=createCanvas(390,780),fc=film.getContext('2d');let serial=0;
 try{
  const last=after.frames.find(f=>f.ending?.settledAt!=null);const end=last.t+2.3;
  for(const f of after.frames.filter(f=>f.t<=end)){
   draw(after,pc,f);const image=await loadImage(panel.toBuffer('image/png'));fc.fillStyle='#faf1dc';fc.fillRect(0,0,390,780);fc.drawImage(image,0,40);
   fc.fillStyle='#695539';fc.font='13px sans-serif';fc.fillText(`Actual goal / ${(f.t-after.near).toFixed(2)}s / ${f.phase}`,10,24);
   fs.writeFileSync(path.join(tmp,String(serial++).padStart(4,'0')+'.png'),film.toBuffer('image/png'));if(serial%15===0&&global.gc)global.gc();
  }
  execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','15','-i',path.join(tmp,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','25','-movflags','+faststart',path.join(out,'goal.mp4')]);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 console.log(JSON.stringify({base:BASE,after:{approach:after.near,seated:after.arrival,seats:after.seats,maxInputSpeed:after.maxInputSpeed,frames:serial,fps:15},before:{approach:before.near,passedFinishX:before.arrival},capture:'actual 60Hz model -> 15fps native Canvas; no audio/device recording; no retiming; video ends in final composition before title return'}));
}
module.exports={collect,picks,draw,BASE};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
