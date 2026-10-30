import test from'node:test';import assert from'node:assert/strict';
import{generateScene,normalizeSettings,SCENES,PALETTES}from'./engine.mjs';import{renderSVG}from'./renderer.mjs';
const strip=svg=>svg.replace(/<metadata>.*?<\/metadata>/s,'').replace(/<defs data-finish="[^"]+">.*?<\/defs>/s,'').replace(/<g data-wall-finish="[^"]+">.*?<\/g>/gs,'').replace(/<rect data-paper-grain="true"[^>]*\/>/,'');
test('original is default and omitted for byte-compatible old settings; legacy ignores finishes',()=>{
 assert.equal(normalizeSettings({}).finish,undefined);assert.deepEqual(normalizeSettings({finish:'original'}),normalizeSettings({}));assert.deepEqual(normalizeSettings({finish:'unknown'}),normalizeSettings({}));
 assert.equal(normalizeSettings({finish:'print'}).finish,'print');
 for(const finish of['original','print','watercolor']){assert.deepEqual(generateScene('old',{version:'0.1',finish}),generateScene('old',{version:'0.1'}));assert.equal(renderSVG(generateScene('old',{version:'0.1',finish})),renderSVG(generateScene('old',{version:'0.1'})));}
});
test('288 finish combinations preserve all scene geometry/colors and reproduce standalone SVG from settings',()=>{
 for(let i=0;i<3;i++)for(const {id:scene}of SCENES)for(const {id:palette}of PALETTES)for(const finish of['print','watercolor']){
  const config={scene,palette,density:['open','normal','dense'][i],accents:'both',colorMode:'grouped'},a=generateScene('finish-audit-'+i,config),b=generateScene(a.seed,{...config,finish});
  const copy=structuredClone(b);delete copy.settings.finish;assert.deepEqual(copy,a);assert.deepEqual(b,generateScene(b.seed,JSON.parse(JSON.stringify(b.settings))));
  const svg=renderSVG(b);assert.equal(svg,renderSVG(generateScene(b.seed,b.settings)));assert.equal(strip(svg),strip(renderSVG(a)));assert.match(svg,/<defs data-finish=/);assert.match(svg,/<pattern id="finish-paper"/);assert.match(svg,/data-paper-grain="true"/);assert.doesNotMatch(svg,/<image|<script|<foreignObject|NaN|Infinity|undefined/);
  assert.ok(svg.length<350000);assert.match(svg,/&quot;finish&quot;/);assert.doesNotMatch(svg,/<filter|<animate/);
 }
});
test('texture marks differ by seed and style while keeping windows and roofs as original paths',()=>{
 const a=renderSVG(generateScene('texture-seed-a',{scene:'closeup',finish:'print'})),b=renderSVG(generateScene('texture-seed-b',{scene:'closeup',finish:'print'})),w=renderSVG(generateScene('texture-seed-a',{scene:'closeup',finish:'watercolor'}));
 assert.notEqual(a.match(/<defs.*?<\/defs>/s)[0],b.match(/<defs.*?<\/defs>/s)[0]);assert.match(a,/data-wall-finish="print"/);assert.match(w,/<radialGradient id="finish-pigment"/);assert.match(w,/C[\d.]+ [\d.]+/);assert.doesNotMatch(a,/<radialGradient/);
});
