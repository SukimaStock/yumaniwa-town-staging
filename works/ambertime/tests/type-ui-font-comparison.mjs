// Standalone comparison only; never imports or modifies the game/model/storage.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const output=path.join(root,'works/ambertime/design/type-ui/comparison');
const {chromium}=createRequire(import.meta.url)('playwright');
const faces=[
 {id:'gothic',label:'美咲ゴシック',file:path.join(root,'works/ambertime/fonts/misaki_gothic.ttf')},
 {id:'second',label:'美咲ゴシック第2',file:process.env.MISAKI_SECOND_PATH??path.join(root,'works/ambertime/fonts/misaki_gothic_2nd.ttf')},
 {id:'mincho',label:'美咲明朝',file:path.join(output,'fonts/misaki_mincho.ttf')}
];
const buffers=await Promise.all(faces.map(face=>fs.readFile(face.file)));
const samples=['0123456789','2026年10月','£1,188','38.4 L','1年5か月','バーボン','リフィル'];
const html=boost=>`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${faces.map(f=>`@font-face{font-family:${f.id};src:url('/${f.id}.ttf') format('truetype');font-weight:400}`).join('')}*{box-sizing:border-box}body{margin:0;background:#19141e;color:#f0e6c8;font:14px/1.5 system-ui,sans-serif;padding:16px}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 12px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.card{background:#2e3143;padding:12px}h2{font:16px system-ui,sans-serif;margin:0 0 8px}.label{font:12px system-ui,sans-serif;color:#c1bdb0;margin:4px 0}.native{font-size:24px;font-weight:400;font-synthesis:none;line-height:38px;white-space:nowrap}.num{font-size:32px;vertical-align:-3px;line-height:.75}canvas{display:block;width:280px;height:280px}</style></head><body><h1>${boost?'Separate condition: old numeric compensation':'Equal size: every face and character = 24 CSS px'}</h1><p>${boost?'Gothic body24 / numbers32; Gothic2nd and Mincho uniformly24. No stretch or synthetic bold.':'Canvas and native HTML; same source strings, same24px size, normal400 weight.'}</p><div class="grid">${faces.map(f=>`<section class="card"><h2>${f.label}</h2><div class="label">Canvas</div><canvas id="${f.id}" width="280" height="280"></canvas><div class="label">Native HTML</div>${samples.map(s=>`<div class="native" style="font-family:${f.id},sans-serif">${boost&&f.id==='gothic'?s.replace(/[0-9]+(?:[.,][0-9]+)*/g,t=>`<span class="num">${t}</span>`):s}</div>`).join('')}</section>`).join('')}</div></body></html>`;
const server=createServer((req,res)=>{const index=faces.findIndex(f=>req.url===`/${f.id}.ttf`);if(index>=0){res.setHeader('Content-Type','font/ttf');res.end(buffers[index]);}else{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html(req.url.includes('boost')));}});
await fs.mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/tmp/chromium',headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const condition of [{dpr:1,boost:false},{dpr:3,boost:false},{dpr:1,boost:true}]){
  const page=await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:condition.dpr});
  await page.goto(`http://127.0.0.1:${server.address().port}/${condition.boost?'boost':'equal'}`);
  const measured=await page.evaluate(async({faces,samples,dpr,boost})=>{
   for(const face of faces)await document.fonts.load(`24px ${face.id}`,samples.join(''));
   const result=[];
   for(const face of faces){
    const canvas=document.getElementById(face.id);canvas.width=280*dpr;canvas.height=280*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);c.fillStyle='#f0e6c8';
    const textRuns=value=>String(value).split(/([0-9]+(?:[.,][0-9]+)*)/u).filter(Boolean);
    samples.forEach((s,i)=>{let x=4;for(const run of textRuns(s)){const enlarged=boost&&face.id==='gothic'&&/^\d/.test(run);c.font=`${enlarged?32:24}px ${face.id}`;c.fillText(run,x,30+i*36+(enlarged?3:0));x+=c.measureText(run).width;}});
    const glyphs={};
    for(const ch of ['0','6','8','9','£','.',',','L','蒸','年','月','か','バ','リ']){
     const off=document.createElement('canvas');off.width=100*dpr;off.height=80*dpr;const t=off.getContext('2d');t.font=`${24*dpr}px ${face.id}`;t.fillText(ch,12*dpr,45*dpr);const m=t.measureText(ch),data=t.getImageData(0,0,off.width,off.height).data;let left=Infinity,top=Infinity,right=-1,bottom=-1,intermediate=0;
     for(let y=0;y<off.height;y++)for(let x=0;x<off.width;x++){const a=data[(y*off.width+x)*4+3];if(a){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);if(a!==255)intermediate++;}}
     glyphs[ch]={advanceCss:m.width/dpr,metricInkCss:{left:m.actualBoundingBoxLeft/dpr,right:m.actualBoundingBoxRight/dpr,ascent:m.actualBoundingBoxAscent/dpr,descent:m.actualBoundingBoxDescent/dpr},rasterInkPhysical:{left,top,width:right-left+1,height:bottom-top+1},intermediateAlphaPixels:intermediate};
    }
    result.push({id:face.id,label:face.label,glyphs,nativeSamples:[...document.querySelectorAll(`.native[style*="${face.id},"]`)].map(n=>({text:n.textContent,font:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize,rect:n.getBoundingClientRect().toJSON()}))});
   }
   return result;
  },{faces:faces.map(({id,label})=>({id,label})),samples,...condition});
  for(const face of measured){assert.deepEqual(face.nativeSamples.map(s=>s.text),samples);assert.equal(face.glyphs['0'].rasterInkPhysical.height,(face.id==='second'?21:15)*condition.dpr);}
  const filename=condition.boost?'numeric-compensation-separate-dpr1.png':`same-size24-dpr${condition.dpr}.png`;
  await page.screenshot({path:path.join(output,filename),fullPage:true});results.push({...condition,screenshot:filename,faces:measured});await page.close();
 }
 const metadata={officialArchive:'https://littlelimit.net/arc/misaki/misaki_ttf_2021-05-05.zip',archiveSha256:'c1851af85a0a010dd84f40803159c2d8a23feecb6c7e800cfeb5c6edc50da46e',browser:await browser.version(),fontSizeCss:24,sourceStrings:samples,fonts:faces.map((f,i)=>({id:f.id,label:f.label,file:path.relative(root,f.file),sha256:createHash('sha256').update(buffers[i]).digest('hex')})),results,physicalSafari:false};
 await fs.writeFile(path.join(output,'browser-metrics.json'),JSON.stringify(metadata,null,2));console.log('PASS threefont comparison:2equal-size DPR conditions +1separate numeric condition');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
