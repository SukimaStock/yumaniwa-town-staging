'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scene,paint,delta,motifs,harness,BASE}=require('./accents-review.cjs'),{protect,withoutAccents}=require('./accents-reference.cjs');
const api=harness().w,previous=harness({sourceRef:BASE}).w,W=require('../world.js'),course=require('../courses.js').get('world4');
test('all original runtime/renderer code is protected; accents leave frozen model and canvas transform intact and render deterministically',()=>{
 protect();for(const [stage,x]of [[1,1050],[2,7300],[3,12250],[4,21400],[5,34200]]){const s=scene(stage,x),before=JSON.stringify(s.world);
  const {createCanvas}=require('@napi-rs/canvas'),ctx=createCanvas(390,740).getContext('2d');ctx.translate(0,740);ctx.scale(1,-1);const transform=ctx.getTransform();
  const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}};freeze(s.world);
  api.PumpokoWorldDraw(ctx,s.world,s.view);assert.equal(JSON.stringify(s.world),before);assert.deepEqual(ctx.getTransform(),transform);
  const a=paint(api,s),b=paint(api,s);assert.equal(delta(a,b).count,0,'deterministic rendering');assert.equal(delta(paint(api,s,true),paint(previous,s)).count,0,'unchanged complete baseline without authorized accents');
 }
});
test('sparse accents include all five motifs, change well under one percent of each frame, and leave empty views',()=>{
 const found={cloud:0,stone:0,flower:0,bird:0,grass:0};let empty=0,changed=0;
 for(const spec of course.stages)for(let x=spec.startX+700;x<spec.endX-1100;x+=360){const s=scene(spec.id,x),d=delta(paint(api,s,true),paint(api,s)),m=motifs(api,s);assert.ok(d.count<390*740*.01,'sparse changed pixels '+spec.id+'/'+x);
  assert.ok(m.cloud<=6&&m.stone<=2&&m.grass<=2&&m.flower<=2&&m.bird<=1,'bounded draw calls including offscreen shoulders');for(const k of Object.keys(found))found[k]+=m[k];if(d.count===0)empty++;else changed++;
 }
 for(const [k,n]of Object.entries(found))assert.ok(n>0,k+' appears somewhere');assert.ok(empty>=5,'intentional empty intervals');assert.ok(changed>20,'visible accents across the route');assert.ok(found.flower<found.grass&&found.bird<found.cloud/3,'flowers and birds rarer');
});
test('all 16 lips and four sockets keep their visible contours and surrounding landing air unchanged; stones never enter the cellar air',()=>{
 const compare=(s,x,y,rx,ry)=>{const d=delta(paint(api,s,true),paint(api,s));for(let py=0;py<740;py++)for(let px=0;px<390;px++){const wx=s.view.x+(px-195)/.8,wy=s.view.y+(340-py)/.8;if(Math.abs(wx-x)<=rx&&Math.abs(wy-y)<=ry){const i=(py*390+px)*4;assert.deepEqual([...d.a.slice(i,i+3)],[...d.b.slice(i,i+3)],'protected contour '+x+'/'+y);}}};
 for(const g of course.gaps)for(const x of [g.a,g.b]){const s=scene(g.stage||1,x);compare(s,x,W.curve(g.layer,x,course).y,80,65);}
 for(const [i,h]of course.holes.entries()){const s=scene(i+1,h.x);s.view.y=(W.surfaceHeight(h.x,course)+W.roof(h.x,course))/2;compare(s,h.x,h.y,105,90);}
 for(const [stage,x]of [[2,7300],[4,21400]]){const s=scene(stage,x),d=delta(paint(api,s,true),paint(api,s));for(let py=0;py<740;py++)for(let px=0;px<390;px++){const wx=s.view.x+(px-195)/.8,wy=s.view.y+(340-py)/.8;const air=course.cellars.some(cell=>wx>cell.left&&wx<cell.right&&wy>W.curve(cell.layer,wx,course).y+3&&wy<W.roof(wx,course,cell.layer)-3);if(air){const i=(py*390+px)*4;assert.equal(d.a[i],d.b[i]);assert.equal(d.a[i+1],d.b[i+1]);assert.equal(d.a[i+2],d.b[i+2]);}}}
});
test('opening, initial root and final quiet approach/tableau have exact unchanged pixels',()=>{
 for(const [stage,x]of [[1,300],[5,course.goal.x-400],[5,course.goal.x]]){const s=scene(stage,x);assert.equal(delta(paint(api,s),paint(previous,s)).count,0);}
 const s=scene(1,1050),{createCanvas}=require('@napi-rs/canvas');
 const draw=w=>{const canvas=createCanvas(390,740),c=canvas.getContext('2d');c.fillStyle=w.PumpokoMaterial.air;c.fillRect(0,0,390,740);c.translate(0,740);c.scale(1,-1);w.PumpokoWorldDraw(c,s.world,s.view,null,{ground:.5,backgroundMix:.3,lift:20,screen:{x:195,y:400,angle:.08,sx:.7,sy:.73,camera:{x:1050,y:400}}});return canvas;};assert.equal(delta(draw(api),draw(previous)).count,0);
});
test('subtle sky moves slowly without moving rooted grass/soil; gameplay and checkpoints match fresh main through the whole journey at 30/60/120fps',()=>{
 const s=scene(1,1050,10),a=paint(api,s);s.world.time+=1;const shifted=delta(a,paint(api,s));assert.ok(shifted.count>0,'slow sky drift');
 for(let py=0;py<740;py++)for(let px=0;px<390;px++){const wx=s.view.x+(px-195)/.8,wy=s.view.y+(340-py)/.8;if(wy<W.surfaceHeight(wx,course)+30){const i=(py*390+px)*4;assert.equal(shifted.a[i],shifted.b[i]);assert.equal(shifted.a[i+1],shifted.b[i+1]);assert.equal(shifted.a[i+2],shifted.b[i+2]);}}
 const S=require('../story.js'),{enter}=require('./stage1-review.cjs'),control=require('./five-stage-controls.cjs').axis;
 for(const fps of [30,60,120]){const a=enter(),b=previous.PumpokoStory.create();previous.PumpokoStory.beginJourney(b);while(b.phase==='opening')previous.PumpokoStory.update(b,0,1/60);
  for(let i=0;i<fps*120&&!a.returnTitle;i++){const axis=a.phase==='playing'?control(a.world):0;S.update(a,axis,1/fps);previous.PumpokoStory.update(b,axis,1/fps);if(i%fps===0||a.world.handoffs!==b.world.handoffs){assert.equal(JSON.stringify(a.world),JSON.stringify(b.world),'exact world '+fps+'/'+i);assert.equal(a.phase,b.phase);assert.equal(a.elapsed,b.elapsed);assert.equal(a.look,b.look);assert.equal(JSON.stringify(a.view),JSON.stringify(b.view));assert.equal(JSON.stringify(S.nurseryPoses(a)),JSON.stringify(previous.PumpokoStory.nurseryPoses(b)));};}
  assert.ok(a.returnTitle);assert.equal(JSON.stringify(a.world),JSON.stringify(b.world),'exact final world');assert.equal(a.phase,b.phase);assert.equal(JSON.stringify(a.view),JSON.stringify(b.view));
 }
});
