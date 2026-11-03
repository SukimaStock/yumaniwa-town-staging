import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IDENTITY_BOTTLES,IDENTITY_LABELS,bottleShape,brandNameError} from '../brand-identity.mjs';
import {codeaBottle,sourcePalette} from '../codea-object-art.mjs';
import {firstBottleLabelCells,firstBottleLabelLayer,firstBottleBareBottle,firstBrandEditor,firstBottleCompletion} from '../first-bottle-view.mjs';

const rectMap=svg=>new Map([...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="([^"]+)"\/>/g)]
 .map(m=>[m[1]+':'+m[2],m[3]]));

test('label overlay exactly composes every native Codea bottle and price tier',()=>{
 for(const bottle of IDENTITY_BOTTLES)for(const label of IDENTITY_LABELS)for(const priceTier of ['low','standard','high']){
  const brand={name:'初めて',bottle:bottle.id,label:label.id};
  const shape=bottleShape(brand);
  const composed=rectMap(firstBottleBareBottle(brand,priceTier));
  const overlay=rectMap(firstBottleLabelLayer(brand));
  assert.ok(overlay.size>0,bottle.id);
  assert.equal(firstBottleLabelCells(brand).length,overlay.size,bottle.id);
  for(const [position,color] of overlay){assert.equal(composed.get(position),sourcePalette[21]);composed.set(position,color);}
  assert.deepEqual([...composed].sort(),[...rectMap(codeaBottle(shape,{label:label.id,priceTier}))].sort(),bottle.id+'/'+label.id+'/'+priceTier);
 }
});

test('choice panel keeps central bottle, shape then swatch then name, and defaults',()=>{
 const esc=s=>String(s);
 const button=(text,action,id,extra='')=>'<button data-action="'+action+'" data-id="'+id+'" '+extra+'>'+text+'</button>';
 const view=firstBrandEditor({name:'AmberTime',bottle:'round',label:'cream'},{
  art:b=>codeaBottle(bottleShape(b),{label:b.label}),
  esc,button,error:brandNameError
 });
 assert.match(view,/class="first-brand-preview"/);
 assert.match(view,/<output id="first-brand-preview-name" for="brand-name">AmberTime<\/output>/);
 assert.ok(view.indexOf('<legend>ビンの形</legend>')<view.indexOf('<legend>ラベル</legend>'));
 assert.ok(view.indexOf('<legend>ラベル</legend>')<view.indexOf('<label for="brand-name">ブランド名</label>'));
 assert.equal((view.match(/data-action="brand-bottle"/g)??[]).length,4);
 assert.equal((view.match(/data-action="brand-label"/g)??[]).length,2);
 assert.equal((view.match(/class="first-brand-swatch"/g)??[]).length,2);
 assert.match(view,/aria-pressed="true"/);
 assert.match(view,/maxlength="40"/);
 assert.doesNotMatch(view,/autofocus/);
});

test('completion has only the bottle itself as its next-step control',()=>{
 const brand={name:'初めての一杯',bottle:'fancy',label:'dark'};
 const view=firstBottleCompletion(brand,71,'high',{esc:s=>String(s)});
 assert.match(view,/data-action="first-bottle-proceed" data-id="71"/);
 assert.equal((view.match(/<button /g)??[]).length,1);
 assert.match(view,/aria-label="初めての一杯。完成したビンをタップして販売室へ進む"/);
 assert.match(view,/class="first-bottle-base"/);
 assert.match(view,/class="first-bottle-label"/);
 assert.match(view,/ビンをタップ/);
 assert.match(view,/初めての一杯/);
});

test('first ceremony occurs only in post-save callback; unchanged branded action',()=>{
 const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../room-scene.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(app,/const firstBottle=D\.needsBrandSetup\(game\),selection=/);
 assert.match(app,/const ok=act\(s=>D\.bottleBranded\(D\.endTasting\(s\),id,selection,count\),\(\)=>/);
 assert.match(app,/if\(firstBottle\)modal=\{kind:'first-bottle-complete'/);
 assert.match(app,/if\(modal\?\.kind==='first-bottle-complete'\)return;/);
 assert.match(app,/kind==='first-bottle-complete'\)\{/);
 assert.match(app,/名前・ビン・ラベルは、あとから変更できません。/);
 assert.match(app,/const label=\$\('first-brand-preview-name'\);if\(label\)label\.textContent/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@keyframes first-bottle-apply-label/);
 assert.match(css,/#action-dialog \.first-brand-preview-bottle svg\[data-codea="bottle"\]\{width:94px!important;height:94px!important\}/);
 assert.match(css,/#action-dialog \.first-bottle-base svg\[data-codea="bottle"\]\{width:100%!important;height:100%!important\}/);
 assert.match(html,/firstBottle=a5-1/);
 assert.match(html,/brand=a5-1/);
});
