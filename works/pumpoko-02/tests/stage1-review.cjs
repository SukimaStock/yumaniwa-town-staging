'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const S=require('../story.js'),P=require('../physics.js'),W=require('../world.js'),C=require('../courses.js'),{harness}=require('./harness.cjs'),{BASE,SHIFT}=require('./stage1-reference.cjs');
const course=C.get('world4');
function enter(){const s=S.create();S.beginJourney(s);while(s.phase==='opening')S.update(s,0,1/60);return s;}
function placed(g,speed=0,start=g.a-8){const w=W.createCourse(course),b=w.pumpkin,f=W.curve('surface',start,course);Object.assign(b,{x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,vx:speed*f.tx,vy:speed*f.ty,grounded:true});return w;}
function crossing(g,speed,start=g.a-8){const w=placed(g,speed,start),b=w.pumpkin;let depart=null,landing=null;for(let i=0;i<4800;i++){
 const previous={...b};P.input(w,1);const events=W.update(w,P.STEP);
 if(previous.grounded&&!b.grounded&&b.x>g.a-60)depart={time:w.time,x:b.x,y:b.y,vx:b.vx,vy:b.vy,speed:Math.hypot(b.vx,b.vy)};
 if(events.some(e=>e.type==='land')&&b.x>g.b-36)landing={time:w.time,x:b.x,y:b.y,vx:b.vx,vy:b.vy};
 if(b.grounded&&b.x>g.b+40)return {success:true,time:w.time,depart,landing};
 if(w.stages.failedAt!==null)return {success:false,time:w.time,depart,landing};
 }return {success:false,timeout:true,time:w.time,depart,landing};}
function travel({normal=false,full=false,capture=false,fps=60,releaseFrames=2}={}){const s=enter(),startX=s.world.pumpkin.x;let failed=false,retries=0,elapsed=0,clear=null,seat=null,title=null;const frames=[],events=[],flights=[];let flight=null;
 for(let i=0;i<fps*120;i++){
  const b=s.world[s.world.active],previous={...b};let axis=s.phase==='playing'?(s.world.handoffs?require('./five-stage-controls.cjs').axis(s.world):1):0;
  if(normal&&s.phase==='playing'&&s.world.handoffs===0){if(b.x<900||b.x>3900)axis=Math.floor(i/fps*60)%60<22?1:0;if(!failed&&b.x>3230)axis=-1;}
  const ev=S.update(s,axis,1/fps);elapsed+=1/fps;
  if(ev.some(e=>e.type==='fall'))failed=true;
  if(ev.some(e=>e.type==='retry')){S.update(s,0,1/fps);elapsed+=1/fps;retries++;}
  for(const e of ev)if(['fall','retry','handoff','stage-clear','seat'].includes(e.type))events.push({...e,time:elapsed});
  if(!flight&&previous.grounded&&!b.grounded&&previous.layer==='surface'){
   const g=course.gaps.filter(g=>g.layer==='surface').find(g=>b.x>g.a-60&&b.x<g.a+40);if(g)flight={gap:g.id,depart:{time:elapsed,x:b.x,y:b.y,vx:b.vx,vy:b.vy,speed:Math.hypot(b.vx,b.vy)}};
  }
  if(flight&&ev.some(e=>e.type==='land')&&b.x>course.gaps.filter(g=>g.layer==='surface').find(g=>g.id===flight.gap).b-36){flight.landing={time:elapsed,x:b.x,y:b.y,vx:b.vx,vy:b.vy};flights.push(flight);flight=null;}
  if(capture&&i%4===0)frames.push({time:elapsed,world:structuredClone(s.world),view:{...s.view},nursery:structuredClone(S.nurseryPoses(s))});
  if(clear===null&&s.world.handoffs===1){clear=elapsed;if(!full&&!capture)break;}
  if(capture&&!full&&clear!==null&&i%4===0)break;
  if(seat===null&&s.world.finished)seat=elapsed;
  if(s.returnTitle){title=elapsed;break;}
 }
 return {state:s,startX,length:course.stage1.endX-startX,screens:(course.stage1.endX-startX)/(390/.8),clear,seat,title,retries,events,flights,frames};}
function measure(){const fast=travel(),normal=travel({normal:true}),full=travel({full:true}),gaps=course.gaps.filter(g=>g.layer==='surface').map(g=>{let threshold=null;for(let speed=50;speed<=620;speed++)if(crossing(g,speed).success){threshold=speed;break;}return {...g,width:g.b-g.a,minimumTestedTangentSpeed:threshold,restart:crossing(g,0,g.a-g.runup)};});return {base:BASE,shift:SHIFT,zoom:.8,logicalWidth:390,visibleWorldWidth:390/.8,startX:fast.startX,endX:course.stage1.endX,length:fast.length,screens:fast.screens,nominalLength:course.stage1.endX-course.stage1.startX,fastClear:fast.clear,normalClear:normal.clear,normalRetries:normal.retries,gaps,flights:fast.flights,full:{seat:full.seat,title:full.title,ending:full.title-full.seat,events:full.events},retry:course.stage1.retrySeconds,evidence:'fixed 240Hz physics, 60Hz story/app harness; native Canvas rendering; no real-device/human play evidence'};}
function render(w,c,f){c.resetTransform();c.fillStyle='#faf1dc';c.fillRect(0,0,390,740);c.save();c.translate(0,740);c.scale(1,-1);w.PumpokoWorldDraw(c,f.world,f.view,f.nursery);c.restore();}
async function main(){const {createCanvas,loadImage}=require('@napi-rs/canvas'),out=path.resolve(__dirname,'../visual-review'),h=harness(),w=h.w,m=measure(),run=travel({capture:true});fs.mkdirSync(out,{recursive:true});
 // An overview is explicitly a map, rather than a gameplay zoom capture.
 const map=createCanvas(1500,480),c=map.getContext('2d'),scale=1400/(course.stage1.endX+440),sx=x=>50+(x+440)*scale,sy=y=>290-y*.24;
 c.fillStyle='#faf1dc';c.fillRect(0,0,1500,480);c.font='18px sans-serif';c.fillStyle='#695539';c.fillText('STAGE 1 / '+m.length.toFixed(1)+' units / '+m.screens.toFixed(2)+' screens at gameplay zoom 0.8',25,28);
 const segments=[[-440,1700],[1800,3400],[3580,5190]];
 for(const [a,b]of segments){c.beginPath();c.moveTo(sx(a),sy(W.curve('surface',a,course).y));for(let x=a+4;x<b;x+=4)c.lineTo(sx(x),sy(W.curve('surface',x,course).y));c.lineTo(sx(b),sy(W.curve('surface',b,course).y));c.lineTo(sx(b),330);c.lineTo(sx(a),330);c.closePath();c.fillStyle=w.PumpokoMaterial.flesh;c.fill();c.save();c.clip();c.strokeStyle=w.PumpokoMaterial.cream;c.lineWidth=10;c.stroke();c.strokeStyle=w.PumpokoMaterial.rind;c.lineWidth=6;c.stroke();c.restore();}
 for(const [name,x]of [['A / roll',600],['B / first gap',1700],['C / build speed',3000],['D / first handoff',4600]]){c.fillStyle='#695539';c.font='15px sans-serif';c.fillText(name,sx(x)-60,65);}
 for(const g of course.gaps.filter(g=>g.layer==='surface')){c.fillStyle='#695539';c.font='13px sans-serif';c.fillText('gap '+g.id+' / '+(g.b-g.a),sx(g.a)-35,355);}
 c.beginPath();c.arc(sx(m.startX),sy(W.curve('surface',m.startX,course).y)-9,9,0,Math.PI*2);c.fillStyle='#d48b36';c.fill();c.fillStyle='#695539';c.fillText('actual spawn',sx(m.startX)-30,95);
 c.beginPath();c.arc(sx(course.stage1.endX),sy(490)-8,8,0,Math.PI*2);c.fillStyle='#e6d7b5';c.fill();
 const old=harness({sourceRef:BASE}).w.FruitLabCourses.get('world4');c.strokeStyle='#738665';c.lineWidth=3;c.beginPath();
 for(let x=-440;x<=1490;x+=4){const y=425-W.curve('surface',x,old).y*.055;if(x===-440)c.moveTo(sx(x),y);else c.lineTo(sx(x),y);}c.stroke();
 c.fillStyle='#695539';c.font='14px sans-serif';c.fillText('Before: continuous STAGE 1 / '+((old.holes[0].x-m.startX)/(390/.8)).toFixed(2)+' screens',450,415);
 c.fillText('After: two real gaps / later stages translated +3700 with identical shapes',450,444);
 fs.writeFileSync(path.join(out,'stage1-map.png'),map.toBuffer('image/png'));
 const panel=createCanvas(390,740),pc=panel.getContext('2d'),sheet=createCanvas(1560,1580),sc=sheet.getContext('2d');sc.fillStyle='#faf1dc';sc.fillRect(0,0,sheet.width,sheet.height);
 for(let row=0;row<2;row++){const flight=run.flights[row];for(let col=0;col<4;col++){const target=flight.depart.time+[-.35,0,.2,.5][col],f=run.frames.find(f=>f.time>=target);render(w,pc,f);sc.drawImage(await loadImage(panel.toBuffer('image/png')),col*390,row*790+40);sc.fillStyle='#695539';sc.font='14px sans-serif';sc.fillText('gap '+flight.gap+' / '+f.time.toFixed(2)+'s',col*390+12,row*790+26);}}fs.writeFileSync(path.join(out,'stage1-cliffs.png'),sheet.toBuffer('image/png'));
 const tmp=fs.mkdtempSync('/tmp/pumpoko-stage1-'),film=createCanvas(390,780),fc=film.getContext('2d');try{for(let i=0;i<run.frames.length;i++){const f=run.frames[i];render(w,pc,f);fc.fillStyle='#faf1dc';fc.fillRect(0,0,390,780);fc.drawImage(await loadImage(panel.toBuffer('image/png')),0,40);fc.fillStyle='#695539';fc.font='13px sans-serif';fc.fillText('PUMPOKO 02 / simulation / '+f.time.toFixed(2)+'s',9,25);fs.writeFileSync(path.join(tmp,String(i).padStart(4,'0')+'.png'),film.toBuffer('image/png'));if(i%15===0&&global.gc)global.gc();}
 execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','15','-i',path.join(tmp,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','26','-movflags','+faststart',path.join(out,'stage1-run.mp4')]);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}console.log(JSON.stringify(m,null,2));}
module.exports={enter,placed,crossing,travel,measure,render};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
