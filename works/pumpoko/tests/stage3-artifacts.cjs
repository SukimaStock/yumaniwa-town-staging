'use strict';
// Actual Story states at 60Hz, sampled at 15fps. No device capture/retiming/audio.
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process'),{createCanvas}=require('@napi-rs/canvas');
const {trial,summary,BASE}=require('./stage3-review.cjs'),{harness}=require('./harness.cjs'),{render}=require('./stage1-review.cjs'),W=require('../world.js'),{course}=require('./five-stage-review.cjs');
async function main(){
 const out=path.resolve(__dirname,'../visual-review'),w=harness().w,old=harness({sourceRef:BASE}).w;
 const before=trial({before:true,capture:true}),held=trial({mode:'held',capture:true}),brake=trial({mode:'settle',capture:true}),low=trial({mode:'low',capture:true}),stop=trial({mode:'stop',capture:true});
 if(!before.success||held.success||!brake.success||low.success||!stop.success)throw Error('Recorded outcomes disagree');
 const panel=createCanvas(390,740),pc=panel.getContext('2d'),frameAt=(r,t)=>r.frames.find(f=>f.time>=t)||r.frames.at(-1);
 const map=createCanvas(1500,690),mc=map.getContext('2d');mc.fillStyle='#faf1dc';mc.fillRect(0,0,1500,690);mc.fillStyle='#695539';mc.font='22px sans-serif';mc.fillText('STAGE 3 / same three gaps, one joined challenge',24,33);mc.font='15px sans-serif';mc.fillText('Authored geometry overview (compressed X) / gameplay zoom remains 0.8 / no physics or camera changes',24,61);
 for(const [row,c]of [old.FruitLabCourses.get('world4'),course].entries()){
  const left=12300,right=15500,scale=1400/(right-left),sx=x=>50+(x-left)*scale,y0=110+row*280,sy=y=>y0+130-(y-290)*.8,gaps=c.gaps.filter(g=>g.stage===3&&g.a<right);let x=left;
  mc.fillStyle='#695539';mc.font='18px sans-serif';mc.fillText(row?'AFTER / 300-unit receiving bank, rising shoulder, gap 2 = 140':'BEFORE / 1740-unit bank, separate runup, gap 2 = 180',24,y0);
  for(const end of [...gaps.map(g=>g.a),right]){mc.beginPath();mc.moveTo(sx(x),sy(W.curve('return',x,c).y));for(let p=x;p<end;p+=4)mc.lineTo(sx(p),sy(W.curve('return',p,c).y));mc.lineTo(sx(end),sy(W.curve('return',end,c).y));mc.lineTo(sx(end),y0+245);mc.lineTo(sx(x),y0+245);mc.closePath();mc.fillStyle=w.PumpokoMaterial.flesh;mc.fill();
   mc.beginPath();mc.moveTo(sx(x),sy(W.curve('return',x,c).y));for(let p=x;p<=end;p+=4)mc.lineTo(sx(p),sy(W.curve('return',p,c).y));mc.strokeStyle=w.PumpokoMaterial.cream;mc.lineWidth=10;mc.stroke();mc.strokeStyle=w.PumpokoMaterial.rind;mc.lineWidth=6;mc.stroke();const gap=gaps.find(g=>g.a===end);x=gap?gap.b:end;
  }
  mc.fillStyle='#695539';mc.font='15px sans-serif';for(const g of gaps)mc.fillText(g.id+' / '+(g.b-g.a)+'u',sx(g.a)-20,y0+42);
 }
 mc.font='15px sans-serif';mc.fillText('Gap 1 stays 160. Gap 3, all entry/exit shoulders, checkpoints and all other stages stay exact.',24,665);
 fs.writeFileSync(path.join(out,'stage3-map.png'),map.toBuffer('image/png'));
 const sheet=createCanvas(1170,1100),sc=sheet.getContext('2d');sc.fillStyle='#faf1dc';sc.fillRect(0,0,1170,1100);
 const shots=[['Before: right held / independent gap 2',before,8.5,old],['After: right held / misses bank 2',held,6.55,w],['After: settle early / catches bank 2',brake,6.9,w],['Too little speed / gap 1 shortfall',low,5.7,w],['Stop near zero / reverse for runup',stop,5.1,w],['Restart / both gaps cleared',stop,stop.seconds-.2,w]];
 for(const [i,[label,r,t,api]]of shots.entries()){const col=i%3,row=Math.floor(i/3),x=col*390,y=row*550;render(api,pc,frameAt(r,t));sc.drawImage(panel,0,120,390,500,x,y+38,390,500);sc.fillStyle='#695539';sc.font='13px sans-serif';sc.fillText(label,x+8,y+20);sc.fillText('Native Canvas / '+t.toFixed(2)+'s',x+8,y+35);}
 fs.writeFileSync(path.join(out,'stage3-comparison.png'),sheet.toBuffer('image/png'));
 const filmCanvas=createCanvas(780,780),fc=filmCanvas.getContext('2d');
 const file=path.join(out,'stage3-comparison.mp4'),ff=spawn('ffmpeg',['-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','780x780','-framerate','15','-i','pipe:0','-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','27','-movflags','+faststart',file],{stdio:['pipe','ignore','pipe']});
 let err='';ff.stderr.on('data',b=>err+=b);const done=new Promise((res,rej)=>{ff.on('error',rej);ff.on('close',n=>n===0?res():rej(Error(err)));});
 const sections=[{title:'1 / SAME RIGHT INPUT / BEFORE vs AFTER',left:before,right:held,lt:3.2,rt:3.2,ll:'Before / right held',rl:'After / right held',api:old},{title:'2 / SAME START / HELD vs COUNTERSTEER',left:held,right:brake,lt:3.4,rt:3.4,ll:'After / right held',rl:'After / moderate brake, then right',api:w},{title:'3 / LOW MOMENTUM vs STOP, REVERSE, RESTART',left:low,right:stop,lt:3.0,rt:4.8,ll:'After / brakes before takeoff',rl:'After / stop, reverse, restart',api:w}];
 let count=0;
 for(const sec of sections)for(let i=0;i<90;i++){
  fc.fillStyle='#faf1dc';fc.fillRect(0,0,780,780);fc.fillStyle='#695539';fc.font='16px sans-serif';fc.fillText(sec.title,8,20);
  for(const [col,r,t,label,api]of [[0,sec.left,sec.lt+i/15,sec.ll,sec.api],[1,sec.right,sec.rt+i/15,sec.rl,w]]){
   const f=frameAt(r,t);render(api,pc,f);fc.drawImage(panel,col*390,40);fc.fillStyle='#695539';fc.font='12px sans-serif';fc.fillText(label+' / '+f.time.toFixed(2)+'s / '+(f.axis<0?'LEFT':'RIGHT'),col*390+8,36);
  }
  const bytes=Buffer.from(fc.getImageData(0,0,780,780).data);if(!ff.stdin.write(bytes))await new Promise(r=>ff.stdin.once('drain',r));count++;if(count%30===0&&global.gc)global.gc();
 }
 ff.stdin.end();await done;
 const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames,r_frame_rate','-of','json',file],{encoding:'utf8'}));
 if(Number(metadata.streams[0].nb_frames)!==count)throw Error('Frame count mismatch');
 console.log(JSON.stringify({base:BASE,out,frames:count,video:metadata,before:summary(before),held:summary(held),brake:summary(brake),low:summary(low),stop:summary(stop),sections:sections.map(({title,lt,rt,ll,rl})=>({title,lt,rt,ll,rl})),limitations:'Native offscreen Canvas, automatic Story controls. Each 6-second segment preserves time at 15fps; short trials hold last frame. Section 3 uses individually labelled times. No real-device/human/audio evidence.'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
