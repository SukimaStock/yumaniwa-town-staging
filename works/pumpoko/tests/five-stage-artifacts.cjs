'use strict';
// Exact authored map + automatically played native Canvas. No device capture.
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const {createCanvas}=require('@napi-rs/canvas'),{course,run,measure}=require('./five-stage-review.cjs');
const W=require('../world.js'),{harness}=require('./harness.cjs'),{render}=require('./stage1-review.cjs');
async function main(){
 const out=path.resolve(__dirname,'../visual-review'),m=measure(),r=run({capture:true}),w=harness().w;
 fs.mkdirSync(out,{recursive:true});
 const map=createCanvas(1500,1170),ctx=map.getContext('2d');ctx.fillStyle='#faf1dc';ctx.fillRect(0,0,1500,1170);
 ctx.fillStyle='#695539';ctx.font='20px sans-serif';ctx.fillText('PUMPOKO 02 / 5 STAGES / authored map (gameplay zoom remains 0.8)',25,30);
 ctx.font='14px sans-serif';ctx.fillText('Native Canvas / geometry and measured automatic input / not device evidence',25,54);
 for(const spec of course.stages){const row=spec.id-1,metric=m.stages[row],left=spec.startX-100,right=spec.endX+100;
  const scale=1400/(right-left),sx=x=>50+(x-left)*scale,points=course.curves[spec.layer],height=Math.max(...points.filter(p=>p[0]>=left&&p[0]<=right).map(p=>p[1]));
  const y0=90+row*215,sy=y=>y0+155-(y-height)*.15,gaps=course.gaps.filter(g=>g.layer===spec.layer);
  ctx.fillStyle='#695539';ctx.font='18px sans-serif';ctx.fillText(`STAGE ${spec.id} / ${spec.kind} / ${metric.length.toFixed(1)} units / ${metric.screens.toFixed(2)} screens / ${metric.gaps} gaps`,25,y0);
  ctx.font='13px sans-serif';ctx.fillText(`Automatic clear examples: ${metric.seconds.map(t=>t.toFixed(2)+'s').join(' / ')} | restart ${spec.retrySeconds}s`,25,y0+22);
  const ranges=[];let a=left;for(const g of gaps){ranges.push([a,g.a]);a=g.b;}ranges.push([a,right]);
  for(const [a,b]of ranges){ctx.beginPath();ctx.moveTo(sx(a),sy(W.curve(spec.layer,a,course).y));for(let x=a+5;x<b;x+=5)ctx.lineTo(sx(x),sy(W.curve(spec.layer,x,course).y));ctx.lineTo(sx(b),sy(W.curve(spec.layer,b,course).y));ctx.lineTo(sx(b),y0+200);ctx.lineTo(sx(a),y0+200);ctx.closePath();ctx.fillStyle=w.PumpokoMaterial.flesh;ctx.fill();
   ctx.beginPath();ctx.moveTo(sx(a),sy(W.curve(spec.layer,a,course).y));for(let x=a+5;x<=b;x+=5)ctx.lineTo(sx(Math.min(x,b)),sy(W.curve(spec.layer,Math.min(x,b),course).y));ctx.strokeStyle=w.PumpokoMaterial.cream;ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle=w.PumpokoMaterial.rind;ctx.lineWidth=6;ctx.stroke();}
  for(const g of gaps){ctx.fillStyle='#a45f34';ctx.font='12px sans-serif';ctx.fillText((g.b-g.a)+'u',sx(g.a)-5,y0+56);}
  ctx.fillStyle='#b9672f';ctx.beginPath();ctx.arc(sx(spec.endX),sy(W.curve(spec.layer,spec.endX,course).y)-10,7,0,Math.PI*2);ctx.fill();
 }
 fs.writeFileSync(path.join(out,'five-stages-map.png'),map.toBuffer('image/png'));
 const panel=createCanvas(390,740),pc=panel.getContext('2d'),sheet=createCanvas(1170,50+Math.ceil(course.gaps.length/2)*400),sc=sheet.getContext('2d');
 sc.fillStyle='#faf1dc';sc.fillRect(0,0,sheet.width,sheet.height);sc.fillStyle='#695539';sc.font='18px sans-serif';sc.fillText('Actual gap flights / depart, air, landing / native Canvas automatic run',15,28);
 for(const [i,g]of course.gaps.entries()){
  const flight=r.flights.find(f=>f.gap===g.id);if(!flight)throw Error('Missing filmed flight '+g.id);
  for(const [col,t]of [flight.depart.time,(flight.depart.time+flight.land.time)/2,flight.land.time].entries()){
   const f=r.frames.find(f=>f.time>=t)||r.frames.at(-1);render(w,pc,f);const x=(i%2)*585+col*195,y=50+Math.floor(i/2)*400;
   sc.drawImage(panel,x,y+28,195,370);sc.fillStyle='#695539';sc.font='12px sans-serif';sc.fillText(`${g.id} ${['depart','air','land'][col]} ${f.time.toFixed(2)}s`,x+4,y+17);
  }
 }
 fs.writeFileSync(path.join(out,'five-stages-cliffs.png'),sheet.toBuffer('image/png'));
 const film=spawn('ffmpeg',['-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','390x740','-framerate','15','-i','pipe:0','-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','27','-movflags','+faststart',path.join(out,'five-stages-run.mp4')],{stdio:['pipe','ignore','pipe']});
 let stderr='',serial=0;film.stderr.on('data',b=>stderr+=b);const finished=new Promise((resolve,reject)=>{film.on('error',reject);film.on('close',code=>code===0?resolve():reject(Error(stderr)));});
 for(const f of r.frames){if(f.time>r.seat+3.2)break;render(w,pc,f);pc.resetTransform();pc.fillStyle='rgba(250,241,220,.9)';pc.fillRect(0,0,390,26);pc.fillStyle='#695539';pc.font='12px sans-serif';pc.fillText(`STAGE ${Math.min(5,f.stage)} / ${f.time.toFixed(2)}s / automatic native Canvas`,8,18);
  const bytes=Buffer.from(pc.getImageData(0,0,390,740).data);if(!film.stdin.write(bytes))await new Promise(resolve=>film.stdin.once('drain',resolve));serial++;if(serial%30===0&&global.gc)global.gc();
 }
 film.stdin.end();await finished;
 const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames,r_frame_rate','-of','json',path.join(out,'five-stages-run.mp4')],{encoding:'utf8'}));
 if(Number(metadata.streams[0].nb_frames)!==serial)throw Error('Film frame mismatch');
 console.log(JSON.stringify({out,frames:serial,video:metadata,seat:r.seat,title:r.title,evidence:'60Hz actual automatic Story states sampled at 15fps; no retiming/audio/device evidence'}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
