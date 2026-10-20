import test from 'node:test';
import assert from 'node:assert/strict';
import {stillArt,glass,bottleArt,brandArt} from '../room-object-art.mjs';
import {glass as originalGlass} from '../cask-glass-art.mjs';
import {bottleArt as originalBottle} from '../art.mjs';
import {brandArt as originalBrand} from '../brand-art.mjs';
import {stillArt as originalStill} from '../distillery-art.mjs';

const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value]));
const rectangles=svg=>[...svg.matchAll(/<rect\b[^>]*\/>/g)].map(([tag])=>attrs(tag));
const fills=svg=>new Set([...svg.matchAll(/\bfill="(#[0-9a-f]+)"/gi)].map(([,value])=>value));
const colorFrom=(svg,palette)=>palette.find(color=>fills(svg).has(color));

test('room objects have bounded integer cells and a physical base on their common plane',()=>{
 const examples=[[stillArt(),60,36],[glass(.4),10,14],[bottleArt(.4),12,28],
  ...['standard','slender'].flatMap(bottle=>['paper','dark'].map(label=>[brandArt(.4,{bottle,label}),12,28]))];
 for(const [svg,width,height] of examples){
  assert.match(svg,new RegExp(`viewBox="0 0 ${width} ${height}"`));
  assert.match(svg,/shape-rendering="crispEdges"/);
  assert.match(svg,/aria-hidden="true" focusable="false"/);
  assert.doesNotMatch(svg,/<(?:path|circle|ellipse|image|text|filter|linearGradient|radialGradient)\b/);
  const rects=rectangles(svg);assert.ok(rects.length>0);
  for(const r of rects){
   const [x,y,w,h]=['x','y','width','height'].map(key=>Number(r[key]));
   assert.ok([x,y,w,h].every(Number.isInteger));
   assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height,JSON.stringify(r));
  }
  assert.ok(rects.some(r=>Number(r.y)+Number(r.height)===height),'base meets the shelf or bench');
 }
});

test('glass preserves original liquid colors at and immediately across every boundary',()=>{
 const palette=['#dfd2a8','#dfb262','#d79743','#ad743a'];
 for(const value of [-.1,0,.1,.100001,.3,.300001,.65,.650001,1]){
  const original=originalGlass(value),current=glass(value);
  assert.equal(colorFrom(current,palette),colorFrom(original,palette),`wood=${value}`);
  assert.match(original,/<g fill-opacity="\.82">/);
  assert.match(current,/<g fill-opacity="\.82">/);
  const liquidRects=rectangles(current).filter(r=>r.fill===colorFrom(original,palette));
  const top=Math.min(...liquidRects.map(r=>Number(r.y)));
  assert.ok(liquidRects.some(r=>Number(r.y)===top&&r.height==='1'),'opaque surface retained above translucent liquid');
  assert.ok(liquidRects.every(r=>Number(r.x)>=2&&Number(r.x)+Number(r.width)<=8&&Number(r.y)>=4&&Number(r.y)+Number(r.height)<=10),'liquid stays within the bowl, above the stem');
  assert.doesNotMatch(current,/class="sample-liquid"/);
  assert.match(glass(value,{sample:true}),/class="sample-liquid"/);
 }
 assert.equal(glass(),glass(0));
});

test('both bottle renderers preserve original colors, threshold strictness and liquid opacity',()=>{
 const palette=['#ccad6d','#bb8542','#946332'];
 for(const value of [-.1,0,.2,.200001,.6,.600001,1]){
  assert.equal(colorFrom(bottleArt(value),palette),colorFrom(originalBottle(value),palette),`plain wood=${value}`);
  assert.match(originalBottle(value),/opacity="\.85"/);
  assert.match(bottleArt(value),/fill-opacity="\.85"/);
  for(const bottle of ['standard','slender'])for(const label of ['paper','dark']){
   const brand={bottle,label};
   assert.equal(colorFrom(brandArt(value,brand),palette),colorFrom(originalBrand(value,brand),palette),`${bottle}/${label} wood=${value}`);
   assert.match(originalBrand(value,brand),/fill-opacity="\.8"/);
   assert.match(brandArt(value,brand),/fill-opacity="0\.8"/);
  }
 }
});

test('authored bottle shapes and labels remain distinct without incorporating player text',()=>{
 const standard=brandArt(.4),slender=brandArt(.4,{bottle:'slender'}),dark=brandArt(.4,{label:'dark'});
 assert.notEqual(standard,slender);assert.notEqual(standard,dark);
 const outlineWidth=svg=>{
  const outline=rectangles(svg).filter(r=>r.fill==='#19141e');
  return Math.max(...outline.map(r=>Number(r.x)+Number(r.width)))-Math.min(...outline.map(r=>Number(r.x)));
 };
 assert.ok(outlineWidth(slender)<outlineWidth(standard));
 assert.ok(fills(standard).has('#d9cba4'));assert.ok(fills(dark).has('#303e3a'));
 assert.ok(fills(standard).has('#786343'));assert.ok(fills(dark).has('#d5c098'));
 assert.equal(brandArt(.4,{name:'<script>alert(1)</script>',bottle:'unknown',label:'unknown'}),standard);
 assert.equal(bottleArt(),bottleArt(0));assert.equal(brandArt(),brandArt(0,{}));
});

test('clear receiver and sample preserve existing reaction hooks without introducing state or effects',()=>{
 const current=stillArt(),original=originalStill();
 for(const hook of ['receiver-liquid','distill-stream','still-steam']){
  assert.ok(original.includes(`class="${hook}"`));assert.ok(current.includes(`class="${hook}"`));
 }
 for(const color of ['#d8d0a7','#e7ddb6'])assert.ok(fills(current).has(color)&&fills(original).has(color));
 assert.match(current,/fill-opacity="\.68"/);assert.match(current,/fill-opacity="\.8"/);
 const receiver=rectangles(current).filter(r=>r.fill==='#b9c0aa');
 const walls=receiver.filter(r=>r.width==='1'&&Number(r.height)>5);
 assert.equal(walls.length,2,'receiver has two one-cell transparent walls');
 const left=Math.min(...walls.map(r=>Number(r.x))),right=Math.max(...walls.map(r=>Number(r.x)));
 const liquid=rectangles(current).filter(r=>['#d8d0a7','#e7ddb6'].includes(r.fill));
 assert.ok(liquid.every(r=>Number(r.x)>left&&Number(r.x)+Number(r.width)<=right),'liquid remains inside clear walls');
 const bottom=Math.max(...liquid.map(r=>Number(r.y)+Number(r.height)));
 assert.match(current,new RegExp(`class="receiver-liquid" data-liquid-bottom="${bottom}"`),'collection pivot follows the actual liquid bottom');
 assert.match(glass(.4,{sample:true}),/class="sample-liquid" data-liquid-bottom="10"/);
 const copper=rectangles(current.match(/<g class="still-pot">(.*?)<\/g>/s)[0]);
 assert.ok(copper.every(r=>Number(r.x)+Number(r.width)<left),'pot body does not overlap receiver');
 assert.equal(current,stillArt());
 assert.doesNotMatch(current,/<(?:animate|script|foreignObject)\b|\bon\w+=/);
});
