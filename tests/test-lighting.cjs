'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../engine/sukimastock-lighting.v0.1.0.js');

function rgba(w=12,h=10) {
  const data=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<w*h;i++){data[i*4]=135;data[i*4+1]=110;data[i*4+2]=90;data[i*4+3]=255;}
  return {width:w,height:h,data};
}
function at(im,x,y){return im.data.slice((y*im.width+x)*4,(y*im.width+x)*4+4);}

test('optional lighting module has stable public contract and periods',()=>{
  assert.equal(L.VERSION,'0.1.0');
  assert.equal(L.CONTRACT,'sukimastock-material-lightmap/0.2');
  assert.equal(L.stage('morning').azimuth,1);
  assert.equal(L.stage('evening').azimuth,-1);
  assert.equal(L.stage('night').sun,0);
  assert.throws(()=>L.stage('unknown'),/Unsupported/);
});

test('no material map means byte-identical fallback without source mutation',()=>{
  const image=rgba(),copy=Uint8ClampedArray.from(image.data);
  const out=L.render(image,null,'night');
  assert.deepEqual(Array.from(out.data),Array.from(copy));
  assert.notStrictEqual(out.data,image.data);
});

test('roof, wall, side and window share one map and preserve RGBA alpha',()=>{
  const image=rgba(),old=Uint8ClampedArray.from(image.data);
  image.data[3]=0;old[3]=0;
  const shapes=[
    {type:'rect',surface:'wall',x:0,y:0,w:12,h:10},
    {type:'polygon',surface:'roof',points:[[0,0],[6,-1],[12,0],[12,2],[0,2]]},
    {type:'rect',surface:'side',x:10,y:2,w:2,h:8},
    {type:'rect',surface:'window',x:2,y:3,w:4,h:3}
  ];
  const map=L.paint(12,10,shapes),base=Uint8Array.from(map.surface);
  assert.equal(map.surface[3*12+3],L.SURFACE.WINDOW);
  assert.equal(map.surface[5*12+11],L.SURFACE.SIDE);
  assert.equal(map.surface[1*12+3],L.SURFACE.ROOF);
  const night=L.render(image,map,'night'),noon=L.render(image,map,'noon');
  assert.deepEqual(Array.from(image.data),Array.from(old));
  assert.deepEqual(Array.from(map.surface),Array.from(base));
  assert.equal(night.data[3],0);
  assert.ok(at(night,3,4)[0]>at(night,7,4)[0], 'night window glows more than wall');
  assert.ok(at(noon,7,4)[0]>at(night,7,4)[0], 'day wall brighter than night');
});

test('PNG editor shapes remain relocatable instead of baked into pixel map',()=>{
 const image=rgba(16,16),base={schema:L.CONTRACT,logicalCanvasPx:{width:16,height:16},
  surface:new Uint8Array(256).fill(1),height:new Uint8Array(256),emission:new Uint8Array(256),
  shapes:[{id:'window-1',kind:'window',shape:'rect',x:1,y:1,w:3,h:3}]};
 const old=L.render(image,base,'night');
 base.shapes[0]={...base.shapes[0],x:9,y:9};
 const moved=L.render(image,base,'night');
 assert.ok(at(old,2,2)[0]>at(moved,2,2)[0]);
 assert.ok(at(moved,10,10)[0]>at(old,10,10)[0]);
 assert.equal(base.emission[2*16+2],0);
});

test('footprint casts right in morning, left in evening and disappears at night',()=>{
 const map={shapes:[{kind:'shadow',shape:'ellipse',cx:7,cy:13,rx:6,ry:2}]};
 const morning=L.footprints(map,'morning'),noon=L.footprints(map,'noon');
 const evening=L.footprints(map,'evening'),night=L.footprints(map,'night');
 assert.equal(morning.length,2);
 assert.equal(noon.length,1);
 assert.equal(evening.length,2);
 assert.equal(night.length,1);
 assert.ok(morning[1].points[2][0]>morning[1].points[1][0]);
 assert.ok(evening[1].points[2][0]<evening[1].points[1][0]);
});

test('mask boundaries, oversized/malformed inputs and invalid polygons are rejected safely',()=>{
 assert.throws(()=>L.paint(0,5,[]),/logical/);
 assert.throws(()=>L.paint(99999,99999,[]),/logical/);
 assert.throws(()=>L.paint(4,4,[{type:'rect',surface:'wall',x:0,y:0,w:-4,h:2}]),/rectangle/);
 assert.throws(()=>L.paint(4,4,[{type:'polygon',surface:'roof',points:[[0,0],[3,0]]}]),/polygon/);
 assert.throws(()=>L.render(rgba(4,4),{schema:L.CONTRACT,surface:new Uint8Array(2)},'noon'),/length mismatch/);
 assert.throws(()=>L.render(rgba(4,4),{schema:'unknown'},'noon'),/contract/);
 assert.throws(()=>L.render({width:4,height:4,data:new Uint8Array(2)},null,'noon'),/length mismatch/);
 assert.throws(()=>L.paint(4,4,[{type:'rect',surface:'none',x:0,y:0,w:1,h:1}]),/Unknown shape surface/);
});

test('fully-offscreen semantic geometry is clipped with bounded output',()=>{
 const map=L.paint(8,8,[{type:'rect',surface:'roof',x:-100,y:-100,w:400,h:400}]);
 assert.ok(map.surface.every(x=>x===L.SURFACE.ROOF));
 assert.equal(map.surface.length,64);
});

test('Codea/Canvas semantic shapes use exactly the same renderer as bitmap maps',()=>{
 const img=rgba(8,8);
 const shapes=[{type:'rect',surface:'wall',x:0,y:0,w:8,h:8},
 {type:'rect',surface:'window',x:3,y:3,w:2,h:2}];
 const a=L.paint(8,8,shapes);
 const b={schema:L.CONTRACT,logicalCanvasPx:{width:8,height:8},
   surface:Uint8Array.from(a.surface),height:Uint8Array.from(a.height),emission:Uint8Array.from(a.emission)};
 assert.deepEqual(Array.from(L.render(img,a,'night').data),Array.from(L.render(img,b,'night').data));
});

test('real Postcard Generator 0.2 building data adapts without altering source',async()=>{
 const {generateScene,validateScene}=await import('../works/postcard-generator/engine.mjs');
 const {makePostcardLightMap}=await import('../works/postcard-generator/lighting-adapter.mjs');
 for(const roof of ['hip','gable','shed','round','flat']) for(const windowShape of ['rect','paired','arch']){
  const scene=generateScene('light-contract-'+roof+'-'+windowShape,{
   version:'0.2',scene:'street',palette:'blue',density:'open',roofs:roof,windows:windowShape,
   sky:'clear',accents:'plain',groundFloor:'plain',corners:'right'
  });
  assert.deepEqual(validateScene(scene).errors,[]);
  const before=JSON.stringify(scene);
  const m=makePostcardLightMap(scene,{width:192,height:240});
  assert.equal(m.schema,L.CONTRACT);
  assert.equal(m.surface.length,192*240);
  assert.ok(m.surface.some(v=>v===L.SURFACE.WALL));
  assert.ok(m.surface.some(v=>v===L.SURFACE.ROOF));
  assert.ok(m.surface.some(v=>v===L.SURFACE.WINDOW));
  assert.ok(m.emission.some(v=>v>0));
  assert.equal(JSON.stringify(scene),before,'adapter cannot mutate canonical scene');
  const result=L.render(rgba(192,240),m,'evening');
  assert.equal(result.data.length,192*240*4);
 }
});
