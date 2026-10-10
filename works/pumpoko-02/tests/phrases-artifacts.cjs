'use strict';
// Actual Story states at 60Hz, sampled at 15fps; native Canvas, no retiming/audio.
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process'),{createCanvas}=require('@napi-rs/canvas');
const {trial,summary,previous,BASE}=require('./phrases-review.cjs'),{course,run}=require('./five-stage-review.cjs'),{render}=require('./stage1-review.cjs'),{harness}=require('./harness.cjs'),W=require('../world.js');
async function main(){
 const out=path.resolve(__dirname,'../visual-review'),w=harness().w,old=previous(),stages=[1,2,4,5],trials={};
 for(const stage of stages){trials[stage]={before:trial({stage,before:true,capture:true}),held:trial({stage,mode:'held',capture:true}),good:trial({stage,capture:true}),weak:trial({stage,mode:'weak'}),stop:trial({stage,mode:'stop'})};if(!trials[stage].before.success||!trials[stage].good.success||!trials[stage].stop.success||trials[stage].held.success!==(stage===1)||trials[stage].weak.success)throw Error('Outcome mismatch '+stage);}
 const panel=createCanvas(390,740),pc=panel.getContext('2d'),at=(r,t)=>r.frames.find(f=>f.time>=t)||r.frames.at(-1);
 const map=createCanvas(1500,2150),mc=map.getContext('2d');mc.fillStyle='#faf1dc';mc.fillRect(0,0,1500,2150);mc.fillStyle='#695539';mc.font='22px sans-serif';mc.fillText('PUMPOKO 02 / STAGE 1, 2, 4, 5 / BEFORE AND AFTER',24,32);mc.font='15px sans-serif';mc.fillText('Same X/Y scale within each pair (overview only). Gameplay zoom 0.8. No added gaps, physics or camera changes.',24,58);
 const ranges={1:[2600,4130,430],2:[6300,9500,140],4:[21550,24400,-100],5:[30480,33000,170]},names={1:'gentle runup and lower receiving bank',2:'renew a bounce on broad flat ground',4:'two renewed bounces through a shallow basin',5:'countersteer, catch the valley, accelerate again'};
 for(const [i,stage]of stages.entries()){
  const top=90+i*505;mc.fillStyle='#695539';mc.font='20px sans-serif';mc.fillText('STAGE '+stage+' / '+names[stage],24,top);
  for(const [row,c]of [old.FruitLabCourses.get('world4'),course].entries()){
   const [left,right,base]=ranges[stage],layer=c.stages[stage-1].layer,scale=1400/(right-left),sx=x=>50+(x-left)*scale,y0=top+35+row*225,sy=y=>y0+110-(y-base)*.65,gaps=c.gaps.filter(g=>g.layer===layer&&g.a<right&&g.b>left);let x=left;
   mc.fillStyle='#695539';mc.font='15px sans-serif';mc.fillText(row?'AFTER':'BEFORE',24,y0);
   for(const end of [...gaps.map(g=>g.a),right]){
    mc.beginPath();mc.moveTo(sx(x),sy(W.curve(layer,x,c).y));for(let p=x;p<end;p+=4)mc.lineTo(sx(p),sy(W.curve(layer,p,c).y));mc.lineTo(sx(end),sy(W.curve(layer,end,c).y));mc.lineTo(sx(end),y0+185);mc.lineTo(sx(x),y0+185);mc.closePath();mc.fillStyle=w.PumpokoMaterial.flesh;mc.fill();
    mc.beginPath();mc.moveTo(sx(x),sy(W.curve(layer,x,c).y));for(let p=x;p<end;p+=4)mc.lineTo(sx(p),sy(W.curve(layer,p,c).y));mc.lineTo(sx(end),sy(W.curve(layer,end,c).y));mc.strokeStyle=w.PumpokoMaterial.cream;mc.lineWidth=10;mc.stroke();mc.strokeStyle=w.PumpokoMaterial.rind;mc.lineWidth=6;mc.stroke();const g=gaps.find(g=>g.a===end);x=g?g.b:end;
   }
   mc.fillStyle='#695539';mc.font='13px sans-serif';for(const g of gaps)mc.fillText(g.id+' / '+(g.b-g.a)+'u',sx(g.a)-25,y0+205);
  }
 }
 mc.font='15px sans-serif';mc.fillStyle='#695539';mc.fillText('STAGE 3, all four sockets, checkpoints and the quiet final approach/pocket are unchanged.',24,2132);fs.writeFileSync(path.join(out,'phrases-map.png'),map.toBuffer('image/png'));
 const sheet=createCanvas(1170,2220),sc=sheet.getContext('2d');sc.fillStyle='#faf1dc';sc.fillRect(0,0,1170,2220);
 const moments={1:[9.1,9.4,9.4],2:[8.7,6.5,6.85],4:[13.2,11.65,12.8],5:[11.0,11.1,10.85]};
 for(const [row,stage]of stages.entries())for(const [col,key]of ['before','held','good'].entries()){
  const r=trials[stage][key],f=at(r,moments[stage][col]);render(key==='before'?old:w,pc,f);const x=col*390,y=row*555;sc.drawImage(panel,0,120,390,500,x,y+48,390,500);sc.fillStyle='#695539';sc.font='14px sans-serif';sc.fillText('STAGE '+stage+' / '+(key==='before'?'before / held RIGHT':key==='held'?'after / held RIGHT':'after / appropriate input'),x+8,y+20);sc.font='12px sans-serif';sc.fillText('Native Canvas / '+f.time.toFixed(2)+'s / '+(f.axis<0?'LEFT':f.axis===0?'RELEASE':'RIGHT'),x+8,y+38);
 }
 fs.writeFileSync(path.join(out,'phrases-comparison.png'),sheet.toBuffer('image/png'));
 const film=createCanvas(780,780),fc=film.getContext('2d'),file=path.join(out,'phrases-comparison.mp4'),ff=spawn('ffmpeg',['-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','780x780','-framerate','15','-i','pipe:0','-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','27','-movflags','+faststart',file],{stdio:['pipe','ignore','pipe']});let err='';ff.stderr.on('data',b=>err+=b);const done=new Promise((res,rej)=>{ff.on('error',rej);ff.on('close',n=>n===0?res():rej(Error(err)));});
 const sections=[{stage:1,title:'STAGE 1 / gentle drive-through / BEFORE vs AFTER',keys:['before','held'],start:7.4,seconds:4},{stage:2,title:'STAGE 2 / one renewed landing bounce',keys:['held','good'],start:4.5,seconds:6},{stage:4,title:'STAGE 4 / link two renewed bounces',keys:['held','good'],start:9,seconds:6},{stage:5,title:'STAGE 5 / countersteer, catch, accelerate',keys:['held','good'],start:8,seconds:6}];let count=0;
 for(const sec of sections)for(let i=0;i<sec.seconds*15;i++){
  fc.fillStyle='#faf1dc';fc.fillRect(0,0,780,780);fc.fillStyle='#695539';fc.font='16px sans-serif';fc.fillText(sec.title,8,20);
  for(const [col,key]of sec.keys.entries()){const f=at(trials[sec.stage][key],sec.start+i/15);render(key==='before'?old:w,pc,f);fc.drawImage(panel,col*390,40);fc.fillStyle='#695539';fc.font='12px sans-serif';fc.fillText((key==='before'?'Before / held':key==='held'?'After / held':'After / controlled')+' / '+f.time.toFixed(2)+'s / '+(f.axis<0?'LEFT':f.axis===0?'RELEASE':'RIGHT'),col*390+8,36);}
  if(!ff.stdin.write(Buffer.from(fc.getImageData(0,0,780,780).data)))await new Promise(r=>ff.stdin.once('drain',r));count++;if(count%30===0&&global.gc)global.gc();
 }
 ff.stdin.end();await done;const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames,r_frame_rate','-of','json',file],{encoding:'utf8'}));if(Number(metadata.streams[0].nb_frames)!==count)throw Error('Frame mismatch');
 const full=[30,60,120].map(fps=>{const r=run({fps});if(!r.s.returnTitle)throw Error('Whole run failed '+fps);return {fps,seat:r.seat,title:r.title,events:r.events};});
 console.log(JSON.stringify({base:BASE,out,video:metadata,sections,trials:Object.fromEntries(stages.map(stage=>[stage,Object.fromEntries(Object.entries(trials[stage]).map(([k,r])=>[k,summary(r)]))])),full,limitations:'Native offscreen Canvas and automatic 60Hz Story input sampled at 15fps. Time is preserved within each section; completed trials hold their last frame. No actual browser/device/audio/human-feel evidence.'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
