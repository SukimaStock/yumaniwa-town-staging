import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs?v=0.18-nearby';
import {FLAVOR_MAX,FLAVOR_AXES,flavorPhrase,flavorMeter} from '../flavor-view.mjs';
import {tasting} from '../model.mjs';
import {shortTaste} from '../tasting-view.mjs';
import {nearbyCasks} from '../nearby-comparison.mjs';
import {fill,advance} from './brands-helpers.mjs';
import {twoManualRecipes} from './recipe-helpers.mjs';
const attributes=html=>Object.fromEntries([...html.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const position=(html,property)=>Number(html.match(new RegExp(property+':([^%]+)%'))?.[1]);
function sampled(){let s=fill(D.newRecipeDistillery(42),{progress:65}),id=s.core.casks[0].id;s=D.sampleDistillery(s,id);return {s,id};}
function renderComparison(comp){return FLAVOR_AXES.map(a=>flavorMeter(comp.current?.profile,a.key,{previousProfile:comp.previous?.profile})).join('');}

test('shared flavor phrases follow existing tasting thresholds and a single fixed 1.35 scale',()=>{
 assert.equal(FLAVOR_MAX,1.35);assert.deepEqual(FLAVOR_AXES.map(a=>[a.key,a.label]),[['roughness','刺激'],['character','原酒の香り'],['wood','木の香り']]);
 for(const value of [0,0.12,0.13,0.3,0.35,0.36,0.57,0.6,0.66,0.8,0.85,1,1.35]){
  const profile={roughness:value,character:value,wood:value},expected=shortTaste({text:tasting(profile).split('。').filter(Boolean)});
  for(const axis of FLAVOR_AXES){const html=flavorMeter(profile,axis.key),a=attributes(html);assert.equal(flavorPhrase(profile,axis.key),expected[axis.index]);assert.equal(a['aria-valuemin'],'0');assert.equal(a['aria-valuemax'],'1.35');assert.equal(Number(a['aria-valuenow']),value);assert.equal(position(html,'width'),value/1.35*100);assert.equal(html.split('class="flavor-phrase"').length-1,1);assert(html.includes('>'+expected[axis.index]+'</small>'));}
 }
});

test('previous marks retain exact positions outside the fill at zero, maximum, equal and nearby values',()=>{
 for(const [value,previous] of [[0,0],[1.35,1.35],[0.3,0.3],[0.3,0.300000001],[0.3,0],[0.3,1.35]]){
  const html=flavorMeter({wood:value},'wood',{previousProfile:{wood:previous}});
  assert.equal(position(html,'width'),value/1.35*100);assert.equal(position(html,'left'),previous/1.35*100);
  assert.match(html,/<i class="flavor-fill"[^>]*><\/i><span class="flavor-previous"/,'previous mark is a sibling, never a child clipped by the fill');
  assert.match(html,/class="flavor-previous"[^>]*aria-hidden="true"/);
 }
});

test('accessible flavor readings expose actual values, axis and previous direction without a rank',()=>{
 for(const axis of FLAVOR_AXES)for(const [value,previous,direction] of [[0.3,0.6,'前回より減少'],[0.6,0.3,'前回より増加'],[0.3,0.3,'前回と同じ']]){
  const html=flavorMeter({[axis.key]:value},axis.key,{previousProfile:{[axis.key]:previous}}),a=attributes(html);
  assert.equal(a.role,'meter');assert.equal(a['aria-label'],axis.label);assert.equal(a['aria-valuenow'],String(value));assert(a['aria-valuetext'].startsWith('現在 '+value+'、'));assert.match(html,/class="nearby-meter flavor-track"/);assert(!html.includes('flavor-meter'));assert(a['aria-valuetext'].includes('前回 '+previous+'、'+direction));assert(!/勝者|ランク|推奨|高品質/.test(html));
 }
});

test('absent or invalid old sample axes never become fabricated zero marks or flavor readings',()=>{
 // Partial inputs exercise display defenses only; no saved game is edited.
 for(const previousProfile of [null,{}, {wood:undefined},{wood:null},{wood:NaN},{wood:Infinity},{wood:-0.01},{wood:1.351},{roughness:0.5}]){
  const html=flavorMeter({wood:0.3},'wood',{previousProfile});assert(!html.includes('flavor-previous'));assert(!attributes(html)['aria-valuetext'].includes('前回'));
 }
 for(const profile of [null,{}, {wood:null},{wood:undefined},{wood:NaN},{wood:Infinity},{wood:-0.01},{wood:1.351}]){
  const html=flavorMeter(profile,'wood',{previousProfile:{wood:0}});assert.match(html,/不明/);assert(!html.includes('role="meter"'));assert(!html.includes('flavor-previous'));assert.equal(flavorPhrase(profile,'wood'),null);
 }
 assert.equal(flavorPhrase({wood:0.3},'missing'),null);
});

test('custom previous labels are escaped while exact numeric readings remain accessible',()=>{
 const html=flavorMeter({wood:0.3},'wood',{previousProfile:{wood:0},previousLabel:'<img src=x onerror="alert(1)">&\''});
 assert(!html.includes('<img'));assert.match(html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;&amp;&#39;/);assert.equal(attributes(html)['aria-valuenow'],'0.3');assert.equal(position(html,'left'),0);
});

test('first and next-month public tastings preserve the same prior sample on same-month reopening',()=>{
 let {s,id}=sampled(),comp=D.comparison(s,id);assert.equal(comp.previous,null);assert(!renderComparison(comp).includes('flavor-previous'));
 const first=structuredClone(comp.current);s=D.endTasting(s);s=advance(s,1);s=D.sampleDistillery(s,id);comp=D.comparison(s,id);
 assert.deepEqual(comp.previous,first);assert.equal(comp.current.age,first.age+1);assert.equal((renderComparison(comp).match(/class="flavor-previous"/g)??[]).length,3);
 const samples=structuredClone(s.notesById[id].samples),operations=structuredClone(s.operations);s=D.endTasting(s);s=D.sampleDistillery(s,id);
 assert.deepEqual(s.notesById[id].samples,samples);assert.deepEqual(s.operations,operations);assert.deepEqual(D.comparison(s,id).previous,first);
 const raw=D.serializeDistillery(s),html=renderComparison(D.comparison(s,id));assert.equal(D.serializeDistillery(s),raw);assert.equal(html,renderComparison(comp));
});

test('normal tasting and nearby cask comparison render identical current profiles through the shared view',()=>{
 const {s,id}=sampled(),comp=D.comparison(s,id),cask=nearbyCasks(s).find(c=>c.caskId===id),raw=D.serializeDistillery(s);
 for(const axis of FLAVOR_AXES)assert.equal(flavorMeter(comp.current.profile,axis.key),flavorMeter(cask.profile,axis.key));
 assert.equal(D.serializeDistillery(s),raw);
});

test('rendering current and previous flavor is pure for game, recipes, queued work and tasting samples',()=>{
 let {s,first}=twoManualRecipes();s=advance(s,1);s=D.selectRecipe(s,'recipe-'+first);s=D.reserveUsual(s);s=D.sampleDistillery(s,first);
 const raw=D.serializeDistillery(s),comp=D.comparison(s,first),before=JSON.stringify(comp);
 for(let i=0;i<5;i++)renderComparison(comp);
 assert.equal(JSON.stringify(comp),before);assert.equal(D.serializeDistillery(s),raw);assert.equal(s.usual.reservation.status,'queued');assert.equal(s.recipeBook.selectedId,'recipe-'+first);assert.equal(s.tastingId,first);
 const restored=D.restoreDistillery(raw);assert.equal(renderComparison(D.comparison(restored,first)),renderComparison(comp));assert.equal(D.serializeDistillery(restored),raw);
});

test('cold strict restore reproduces flavor readings and previous markers without changing saved facts',()=>{
 let {s,id}=sampled();s=D.endTasting(s);s=advance(s,1);s=D.sampleDistillery(s,id);const raw=D.serializeDistillery(s),expected=renderComparison(D.comparison(s,id));
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs?v=0.18-nearby',import.meta.url).href)};import {FLAVOR_AXES,flavorMeter} from ${JSON.stringify(new URL('../flavor-view.mjs',import.meta.url).href)};const s=D.restoreDistillery(fs.readFileSync(0,'utf8')),c=D.comparison(s,${id});process.stdout.write(JSON.stringify({html:FLAVOR_AXES.map(a=>flavorMeter(c.current?.profile,a.key,{previousProfile:c.previous?.profile})).join(''),raw:D.serializeDistillery(s)}));`;
 const actual=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}));assert.equal(actual.html,expected);assert.equal(actual.raw,raw);
});

test('modern moderate tasting copy is short and detail can hide visible phrases without losing readings',()=>{
 const profile={flavor:{version:1,primary:'fruit',profile:{fruit:.5,grain:.2,smoke:0,body:.1,rough:.4,spice:.1,wood:.1,vanilla:.1},history:[]}},before=JSON.stringify(profile);
 const phrase=flavorPhrase(profile,'character'),visible=flavorMeter(profile,'character'),hidden=flavorMeter(profile,'character',{hidePhrase:true});
 assert.equal(phrase,'原酒：果実の香り · ほどよい');assert.ok(visible.includes('<small class="flavor-phrase">'+phrase+'</small>'));
 assert.ok(!hidden.includes('class="flavor-phrase"'));assert.equal(attributes(hidden)['aria-valuetext'],attributes(visible)['aria-valuetext']);
 assert.equal(attributes(hidden)['aria-valuenow'],'0.5');assert.equal(JSON.stringify(profile),before);
});
