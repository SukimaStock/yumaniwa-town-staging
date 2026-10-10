 'use strict';
// Timed actual original scenes and exact-main 02, with identical detach gestures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {originalRunner,runner}=require('./opening-film.cjs');
const base='7a5fadefc589bcf5b743ee86ac35a104df8ad9da';
async function scenes(r,kind){
  const frames=[{label:'Title',bytes:r.title}];let seconds=0;
  for(const [at,label]of kind==='original'?[[4.5,'Expanding cut'],[6.4,'Continuous seed fall'],[8.4,'Seed landing (no growth)'],[10,'Seed play']]
    :kind==='before'?[[3.6,'Expanding cut'],[5.4,'Scheduled seed flight'],[7.7,'Three fixed fruits'],[9,'Hero begins']]
    :[[4.5,'Original expanding cut'],[6.4,'Continuous physical fall'],[9.2,'Growth at actual roots'],[12,'Same fruit rolls']]){
    while(seconds<at){r.frame();seconds+=1/60;}
    frames.push({label,bytes:r.canvas.toBuffer('image/png')});
  }
  if(kind!=='original')assert.equal(r.probe().phase,'playing');return frames;
}
(async()=>{
  const rows=[{label:'Original PUMPOKO',frames:await scenes(await originalRunner(),'original')},
    {label:'02 before (#184)',frames:await scenes(runner(base),'before')},
    {label:'02 revised: original fall + actual roots',frames:await scenes(runner(null),'after')}];
  const sheet=createCanvas(1950,2370),c=sheet.getContext('2d');c.fillStyle='#faf1dc';c.fillRect(0,0,1950,2370);
  for(const [row,r]of rows.entries()){
    c.fillStyle='#695539';c.font='18px sans-serif';c.textAlign='left';c.fillText(r.label,10,row*790+23);
    for(const [col,f]of r.frames.entries()){
      c.drawImage(await loadImage(f.bytes),col*390,row*790+32);
      c.fillStyle='#695539';c.font='14px sans-serif';c.textAlign='center';c.fillText(f.label,col*390+195,row*790+786);
    }
  }
  const out=path.resolve(__dirname,'../visual-review/opening-comparison.png');fs.writeFileSync(out,sheet.toBuffer('image/png'));
  console.log(JSON.stringify({out,rows:3,scenes:5,before:base,capture:'native Canvas; actual timing and identical pointer detach gesture; no device/audio evidence'}));
})().catch(e=>{console.error(e);process.exitCode=1});
