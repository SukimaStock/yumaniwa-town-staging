// Optional offscreen GLES evidence, not a WebGL/browser or physical-device test.
import {readFileSync} from 'node:fs';
import {createPolyhedron,packedMesh,pickMesh} from '../engine/geometry.js';
import {TouchBody} from '../engine/dynamics.js';
import {Camera} from '../engine/camera.js';
import {rotationMatrix} from '../engine/math.js';
import {FEEL_PROFILES} from '../engine/response.js';
const source=readFileSync(new URL('../engine/renderer.js',import.meta.url),'utf8');
const shaders=Object.fromEntries(['VERTEX','FRAGMENT'].map(name=>[name,source.match(new RegExp('const '+name+'=`([\\s\\S]*?)`;'))[1]]));
const scenes=[];
for(const [width,height] of [[390,844],[844,390],[900,900]]){
 const camera=new Camera();camera.resize(width,height);
 const append=(body,label)=>scenes.push({label,width,height,packed:Array.from(packedMesh(body.mesh)),model:Array.from(rotationMatrix(body.pose())),projection:Array.from(camera.projection),distance:camera.distance});
 append(new TouchBody(createPolyhedron()),'rest');
 for(const name of Object.keys(FEEL_PROFILES)){
  const body=new TouchBody(createPolyhedron());body.setFeel(name);
  const hit=()=>{const ray=camera.ray(width/2,height/2,{left:0,top:0,width,height},body.pose());return pickMesh(body.mesh,ray.origin,ray.direction);};
  body.press(hit());body.release(0);for(let i=0;i<9;i++)body.step(1/120);append(body,name+'-tap');
  for(let i=0;i<240;i++)body.step(1/120);
  body.press(hit());for(let i=0;i<10;i++)body.step(1/120);append(body,name+'-held-start');
  for(let i=0;i<110;i++)body.step(1/120);append(body,name+'-held');
  body.release(1);for(let i=0;i<18;i++)body.step(1/120);append(body,name+'-release');
  for(let i=0;i<240;i++)body.step(1/120);
  const grabbed=hit();body.press(grabbed);for(let i=0;i<48;i++)body.step(1/120);
  const point=body.beginPull(grabbed),mapping=camera.pullMapping(width/2,height/2,{left:0,top:0,width,height},body.pose(),point);
  body.pullTo(mapping(width/2+Math.min(width,height)*.11,height/2-Math.min(width,height)*.06));
  for(let i=0;i<48;i++)body.step(1/120);append(body,name+'-pull');
  body.release();for(let i=0;i<18;i++)body.step(1/120);append(body,name+'-pull-release');
 }
}
console.log(JSON.stringify({shaders,scenes}));
