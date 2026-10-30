import test from 'node:test';import assert from 'node:assert/strict';
import{generateScene,validateScene,normalizeSettings,SCENES,PALETTES}from './engine.mjs';import{renderSVG}from './renderer.mjs';
const lum=h=>[1,3,5].reduce((s,i,j)=>s+parseInt(h.slice(i,i+2),16)*[.2126,.7152,.0722][j],0);
const geometry=s=>({mode:s.mode,composition:s.composition,blocks:s.blocks.map(block=>({ground:block.ground,buildings:block.buildings.map(b=>({id:b.id,x:b.x,y:b.y,width:b.width,height:b.height,base:b.base,cols:b.cols,rows:b.rows,roof:b.roof,roofHeight:b.roofHeight,windowShape:b.windowShape,band:b.band,balcony:b.balcony,terrace:b.terrace,windowGrid:b.windowGrid,corner:b.corner&&(({side,plotX,plotWidth,width,rise,roofEnvelope})=>({side,plotX,plotWidth,width,rise,roofEnvelope}))(b.corner),groundFloor:b.groundFloor&&(({kind,height,count,striped})=>({kind,height,count,striped}))(b.groundFloor),plants:b.plants.map(({row,col,size,placement})=>({row,col,size,placement})),shade:b.shade&&(({source,direction,points,opacity})=>({source,direction,points,opacity}))(b.shade)}))})),surfaces:s.surfaces,alley:s.alley,clouds:s.clouds,people:s.people,boats:s.boats,waterlines:s.waterlines,reflections:s.reflections?.map(({color,...q})=>q)});
test('1260 grouped scenes retain all geometry and details while grouping existing wall colors into coherent districts',()=>{
 const flips=new Set();
 for(let i=0;i<10;i++)for(const{ id:scene}of SCENES)for(const{ id:palette}of PALETTES)for(const density of ['open','normal','dense']){
  const config={scene,palette,density,alleyDepth:'staggered',reflection:'matched',corners:i%2?'left':'right',facade:i%2?'grid':'terrace',accents:'both',groundFloor:i%2?'awning':'arcade'},seed='district-audit-'+i;
  const s=generateScene(seed,{...config,colorMode:'grouped'}),before=generateScene(seed,{...config,colorMode:'varied'});
  assert.deepEqual(geometry(s),geometry(before),`${scene}/${palette}/${density}`);assert.deepEqual(validateScene(s).errors,[]);assert.deepEqual(s,generateScene(s.seed,JSON.parse(JSON.stringify(s.settings))));
  flips.add(s.grouping.flip);assert.equal(s.grouping.axis,scene==='waterfront'?'depth':'sides');
  const groups=new Set();
  for(const block of s.blocks)for(const [j,b]of block.buildings.entries()){
   groups.add(b.colorGroup);assert.ok(s.palette.walls.includes(b.wall));if(b.band)assert.ok(s.palette.walls.includes(b.bandColor));
   const x=b.corner?.plotX??b.x,width=b.corner?.plotWidth??b.width,region=scene==='waterfront'?(b.layer===s.blocks.length-1?1:0):(x+width/2<400?0:1);assert.equal(b.colorGroup,region^s.grouping.flip);
   if(j){const previous=block.buildings[j-1];assert.notEqual(b.wall,previous.wall);if(b.colorGroup===previous.colorGroup)assert.ok(Math.abs(lum(b.wall)-lum(previous.wall))>=24);}
   assert.equal(b.windowColor,lum(b.wall)<145?s.palette.light:s.palette.ink);
  }
  assert.equal(groups.size,2);
  const svg=renderSVG(s);assert.doesNotMatch(svg,/NaN|Infinity|undefined|<image|<filter|<linearGradient/);
  for(const q of s.reflections||[]){const source=s.blocks.at(-1).buildings.find(b=>b.id===q.source);assert.equal(q.color,source.wall);}
 }
 assert.deepEqual([...flips].sort(),[0,1]);
});
test('grouped mode remains explicit and legacy keeps its original behavior',()=>{
 assert.equal(normalizeSettings({colorMode:'grouped'}).colorMode,'grouped');assert.equal(normalizeSettings({}).colorMode,'auto');
 for(let i=0;i<100;i++)assert.notEqual(generateScene('auto-color-'+i).colorMode,'grouped');
 assert.deepEqual(generateScene('old-colors',{version:'0.1',colorMode:'grouped'}),generateScene('old-colors',{version:'0.1'}));
});
test('grouping validation rejects missing plans, wrong district assignment, new colors and repeated adjacent colors',()=>{
 const source=generateScene('bad-group',{scene:'street',colorMode:'grouped'});
 for(const mutate of [s=>delete s.grouping,s=>s.grouping.flip=3,s=>s.grouping.axis='depth',s=>s.blocks[0].buildings[0].colorGroup=9,s=>s.blocks[0].buildings[0].wall='#010203',s=>s.blocks[0].buildings[1].wall=s.blocks[0].buildings[0].wall]){
  const s=structuredClone(source);mutate(s);assert.ok(validateScene(s).errors.some(e=>e.startsWith('color-group')));
 }
});
