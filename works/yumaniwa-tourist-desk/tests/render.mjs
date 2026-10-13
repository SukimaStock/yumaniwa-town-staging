// Offscreen GLES evidence only. This does not certify Safari or physical devices.
import {readFileSync} from 'node:fs';
import {DeskItem,DeskScene,LAYOUT,furniture} from '../scene.js';
import {rotationMatrix} from '../../sukima-3d-lab/engine/math.js?v=0.7.1';
const load=()=>new DeskScene(LAYOUT.map(e=>new DeskItem(e,JSON.parse(readFileSync(new URL(`../../sukima-3d-lab/objects/${e.id}.json`,import.meta.url))))));
const source=readFileSync(new URL('../../sukima-3d-lab/engine/renderer.js',import.meta.url),'utf8');
const shaders=Object.fromEntries(['VERTEX','FRAGMENT'].map(n=>[n,source.match(new RegExp('const '+n+'=`([\\s\\S]*?)`;'))[1]])),scenes=[];
for(const [width,height] of [[390,844],[844,390],[768,1024],[1366,900]]){for(const label of ['rest','middle','touched','close']){
 const scene=load();scene.resize(width,height);if(label==='middle')scene.setZoom(1.3);if(label==='close')scene.setZoom(1.6);if(label==='touched'){scene.step(.05);for(const item of scene.items){const c=item.player.controls?.[0];if(c)c.value=c.type==='rotate'?c.value+1.3:c.max;}}
 const packed=Array.from(furniture()),draws=[{model:Array.from(rotationMatrix(scene.view)),first:0,count:packed.length/9}];
 for(const item of scene.items){const offset=packed.length/9;packed.push(...item.player.packed);draws.push(...item.commands(scene.view).map(c=>({model:Array.from(c.model),first:offset+c.first,count:c.count})));if(item.printedMap){const first=packed.length/9;packed.push(...item.printedMap);const c=item.commands(scene.view).find(c=>c.id==='reading-plate');draws.push({model:Array.from(c.model),first,count:item.printedMap.length/9});}}
 scenes.push({label,width,height,packed,draws,projection:Array.from(scene.camera.projection),distance:scene.camera.distance});
}}
process.stdout.write(JSON.stringify({shaders,scenes}));
