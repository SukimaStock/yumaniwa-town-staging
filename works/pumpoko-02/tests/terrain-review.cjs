'use strict';
// Native offscreen Canvas fixtures, identical real geometry and .8 view in both
// columns. Not browser screenshots or device evidence. Reference is actual old code.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas'),{harness}=require('./harness.cjs');
const BASE='fe586873233f80272a96d84f85fd3c8eb6a38ea3';
function fixture(w,{x,layer='surface',hole=false}){
  const W=w.FruitLabWorld,course=w.FruitLabCourses.get('world4'),s=W.createCourse(course);
  const f=W.curve(layer,x,course);
  if(!hole){const b=layer==='surface'?s.pumpkin:s.rutabaga;b.plugged=false;b.layer=layer;b.x=f.x+f.nx*b.r;b.y=f.y+f.ny*b.r;s.entities=[b];}
  const top=W.surfaceHeight(x,course),roof=W.roof(x,course,layer);
  return {s,view:{x,y:hole?(top+roof)/2:layer==='surface'?f.y+70:(f.y+roof)/2,z:.8}};
}
function render(w,s,view){
  const canvas=createCanvas(390,740),c=canvas.getContext('2d');
  c.fillStyle=w.PumpokoMaterial.air;c.fillRect(0,0,390,740);
  c.save();c.translate(0,740);c.scale(1,-1);w.PumpokoWorldDraw(c,s,view);c.restore();
  return canvas;
}
function main(){
 const before=harness({sourceRef:BASE}).w,after=harness().w;
 const cases=[['Surface / grounded pumpkin',{x:530}],['Cellar / bouncing partner',{x:1930,layer:'underground'}],
  ['Mouth 1 / cellar cut side',{x:1400,hole:true}],['Mouth 2 / upward exchange',{x:2790,hole:true}],
  ['Mouth 3 / deeper cellar',{x:5210,hole:true}],['Mouth 4 / final surface',{x:7050,hole:true}]];
 const sheet=createCanvas(780,330+cases.length*500),c=sheet.getContext('2d');c.fillStyle='#faf1dc';c.fillRect(0,0,sheet.width,sheet.height);
 const g=require('../../pumpoko/stage-geometry.js').compile(require('../../pumpoko/stage-data.js'));
 const old=require('../../pumpoko/stage-draw.js'),reference=createCanvas(390,270),r=reference.getContext('2d');
 r.fillStyle=old.material.air;r.fillRect(0,0,390,270);r.translate(195,80);r.scale(1.85,1.85);r.translate(-190,-g.floor(190).y);old.drawTerrain(r,g);c.drawImage(reference,0,30);
 c.fillStyle='#695539';c.font='16px sans-serif';c.fillText('Original PUMPOKO / actual terrain at 1.85x',10,22);
 for(const [i,t]of ['Skin: 7 x 1.85 = 12.95 screen pixels','Inner cream: 3 x 1.85 = 5.55 pixels','02: same presence at unchanged .8x','All thickness on the solid side','Native Canvas fixtures / no device capture'].entries())c.fillText(t,400,80+i*35);
 for(const [i,[label,spec]]of cases.entries()){
  const y=330+i*500;
  for(const [col,w]of [before,after].entries()){
   const {s,view}=fixture(w,spec),image=render(w,s,view);
   c.drawImage(image,0,140,390,470,col*390,y+30,390,470);
   c.fillStyle='#695539';c.font='14px sans-serif';c.fillText((col?'After':'Before #185')+' / '+label,col*390+8,y+22);
  }
 }
 const out=path.resolve(__dirname,'../visual-review/stage-material-comparison.png');fs.writeFileSync(out,sheet.toBuffer('image/png'));
 console.log(JSON.stringify({out,base:BASE,scenes:cases.length,camera:'.8 unchanged',capture:'native Canvas fixtures; old reference drawn by unmodified stage-draw.js'}));
}
module.exports={BASE,fixture,render};if(require.main===module)main();
