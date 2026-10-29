import test from 'node:test';
import assert from 'node:assert/strict';
import {generateScene,validateScene,normalizeSettings,PALETTES,COMPOSITIONS} from './versions/0.1/engine.mjs';
import {renderSVG} from './versions/0.1/renderer.mjs';

test('identical seeds and normalized settings reproduce plain scene data and SVG',()=>{
  const a=generateScene('a shared harbor',{palette:'garden',density:'dense'});
  assert.deepEqual(a,JSON.parse(JSON.stringify(a)));
  assert.deepEqual(a,generateScene('a shared harbor',{density:'dense',palette:'garden'}));
  assert.equal(renderSVG(a),renderSVG(generateScene('a shared harbor',{density:'dense',palette:'garden'})));
});
test('palette stream cannot move buildings, change their geometry, tower or boats',()=>{
  const geometry=s=>({shoreY:s.shoreY,composition:s.composition,blocks:s.blocks.map(b=>b.buildings.map(({wall,wallIndex,roofColor,windowColor,trim,...g})=>g)),landmark:(({wall,roofColor,windowColor,...g})=>g)(s.landmark),boats:s.boats.map(({hull,deck,...g})=>g)});
  const scenes=PALETTES.map(p=>generateScene('color-only',{palette:p.id}));
  for(const scene of scenes)assert.deepEqual(geometry(scene),geometry(scenes[0]));
  assert.notEqual(renderSVG(scenes[0]),renderSVG(scenes[1]));
});
test('36 default seeds form distinct structure and varied compositions',()=>{
  const scenes=Array.from({length:36},(_,i)=>generateScene(`postcard-${i+1}`));
  const structures=scenes.map(s=>JSON.stringify(s.blocks.map(b=>b.buildings.map(x=>[x.x,x.y,x.width,x.height,x.roof]))));
  assert.equal(new Set(structures).size,36);
  assert.equal(new Set(scenes.map(s=>s.composition)).size,4);
  assert.ok(new Set(scenes.map(s=>s.shoreY)).size>25);
  assert.equal(new Set(scenes.map(s=>s.palette.id)).size,3);
  assert.equal(new Set(scenes.map(s=>s.layerCount)).size,2);
});
test('3600 scenes: finite, supported and contiguous buildings, visible towers and bounded boats',()=>{
  for(let i=0;i<300;i++)for(const composition of COMPOSITIONS)for(const density of ['open','normal','dense']){
    const scene=generateScene(`audit-${i}`,{composition,density});
    const validation=validateScene(scene);
    assert.deepEqual(validation.errors,[],`${i}/${composition}/${density}`);
    assert.ok(validation.metrics.buildings>=20);
    assert.ok(validation.metrics.visibleTower>=50);
    for(const block of scene.blocks)for(const b of block.buildings){
      assert.ok(b.cols<=4&&b.rows<=5);
      assert.ok(b.y+b.height-b.base<.03);
    }
  }
});
test('validator detects malformed positions and hidden landmark rather than assigning a beauty score',()=>{
  const scene=generateScene('broken');
  scene.blocks[0].buildings[0].width=NaN;
  scene.blocks[1].buildings[0].base+=17;
  scene.landmark.y=900;
  const v=validateScene(scene);
  assert.ok(v.errors.some(e=>e.startsWith('non-finite:')));
  assert.ok(v.errors.some(e=>e.startsWith('unsupported:')));
  assert.ok(v.errors.includes('hidden-landmark'));
  assert.equal(v.score,undefined);
});
test('SVG is standalone, bounded in size, accessible and embeds reproducible metadata',()=>{
  for(let i=0;i<36;i++){
    const s=generateScene(`postcard-${i+1}`),svg=renderSVG(s);
    assert.match(svg,/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="800" height="1000"/);
    assert.match(svg,/<metadata>.*seed.*settings.*<\/metadata>/);
    assert.match(svg,/<title>.*<\/title>/);
    assert.match(svg,/<\/svg>$/);
    assert.doesNotMatch(svg,/<(?:image|script|foreignObject)|NaN|Infinity|undefined|url\(/);
    assert.ok((svg.match(/</g)||[]).length<1200);
    assert.ok(svg.length<140000);
  }
});
test('user seed is escaped and unsupported settings normalize predictably',()=>{
  const svg=renderSVG(generateScene('<script>&\"\'test'));
  assert.doesNotMatch(svg,/<script>/);
  assert.match(svg,/&lt;script&gt;/);
  assert.deepEqual(normalizeSettings({palette:'unknown',density:NaN,composition:'../'}),{palette:'auto',density:'normal',composition:'auto'});
  assert.equal(generateScene('').seed,'harbor-01');
  assert.equal(generateScene('a'.repeat(140)).seed.length,120);
});
