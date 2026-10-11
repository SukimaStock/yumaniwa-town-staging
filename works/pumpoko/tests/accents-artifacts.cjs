'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createCanvas}=require('@napi-rs/canvas');
const {harness,BASE}=require('./accents-review.cjs'),{run}=require('./five-stage-review.cjs'),{render}=require('./stage1-review.cjs');
const out=path.resolve(__dirname,'../visual-review'),old=harness({sourceRef:BASE}).w,now=harness().w,route=run({capture:true});
const wanted=[[1,1050],[1,2400],[2,7300],[3,12250],[4,21400],[5,34200]];
const rows=wanted.map(([stage,x])=>route.frames.filter(f=>f.world.handoffs===stage-1&&!f.world.finished).reduce((a,b)=>Math.abs(b.world[b.world.active].x-x)<Math.abs(a.world[a.world.active].x-x)?b:a));
const sheet=createCanvas(780,rows.length*780+50),ctx=sheet.getContext('2d'),one=createCanvas(390,740),c=one.getContext('2d');
ctx.fillStyle=now.PumpokoMaterial.air;ctx.fillRect(0,0,780,sheet.height);ctx.fillStyle='#695539';ctx.font='17px sans-serif';ctx.fillText('Before / current main',18,28);ctx.fillText('After / sparse accents',408,28);
for(const [i,f]of rows.entries()){for(const [col,api]of [old,now].entries()){render(api,c,f);ctx.drawImage(one,col*390,50+i*780);}ctx.fillStyle='#695539';ctx.font='13px sans-serif';ctx.fillText('STAGE '+wanted[i][0]+' / actual 60Hz state at '+f.time.toFixed(2)+'s',18,50+i*780+765);}
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'accents-comparison.png'),sheet.toBuffer('image/png'));
// Two real, unretimed three-second segments, sampled at 15fps.
const sequences=[route.frames.filter(f=>f.time>=2&&f.time<5),route.frames.filter(f=>f.world.handoffs===2&&f.world[f.world.active].x>=12000).slice(0,45)];
const tmp=fs.mkdtempSync('/tmp/pumpoko-accents-film-'),film=createCanvas(780,780),fc=film.getContext('2d');let serial=0;
for(const seq of sequences)for(const f of seq){fc.fillStyle=now.PumpokoMaterial.air;fc.fillRect(0,0,780,780);for(const [col,api]of [old,now].entries()){render(api,c,f);fc.drawImage(one,col*390,40);}fc.fillStyle='#695539';fc.font='16px sans-serif';fc.fillText('Before / '+f.time.toFixed(2)+'s',16,26);fc.fillText('After / '+f.time.toFixed(2)+'s',406,26);fs.writeFileSync(path.join(tmp,String(serial++).padStart(4,'0')+'.png'),film.toBuffer('image/png'));}
execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','15','-i',path.join(tmp,'%04d.png'),'-c:v','libx264','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'accents-comparison.mp4')]);fs.rmSync(tmp,{recursive:true,force:true});
const data={base:BASE,frames:serial,seconds:serial/15,route:{seat:route.seat,title:route.title,handoffs:route.checkpoints.length,falls:route.events.filter(e=>e.type==='fall').length},samples:rows.map((f,i)=>({stage:wanted[i][0],x:f.world[f.world.active].x,time:f.time})),evidence:'Real 60Hz Story states / 15fps Native Canvas; no browser/device capture or audio'};fs.writeFileSync('/tmp/accents-artifacts.json',JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data));
