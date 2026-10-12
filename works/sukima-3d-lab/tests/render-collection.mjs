// Exact shipped shaders and specimen JSON; native GLES evidence, not Safari QA.
import {readFileSync} from 'node:fs';
import {TouchSession} from '../engine/session.js';
import {packedMesh,pickMesh} from '../engine/geometry.js';
import {Camera} from '../engine/camera.js';
import {rotationMatrix} from '../engine/math.js';
import {previewRaster} from '../preview.js';
const root=new URL('../',import.meta.url),read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const source=readFileSync(new URL('engine/renderer.js',root),'utf8');
const shaders=Object.fromEntries(['VERTEX','FRAGMENT'].map(name=>[name,source.match(new RegExp('const '+name+'=`([\\s\\S]*?)`;'))[1]]));
const scenes=[];
for(const [width,height] of [[390,844],[844,390],[900,900]])for(const item of read('collection.json').items){
 const definition=read(item.file),session=new TouchSession().select(definition),body=session.body,camera=new Camera();camera.resize(width,height,session.assembly?.radius??session.mesh.radius);
 const rect={left:0,top:0,width,height};
 const draws=()=>session.assembly?{packed:Array.from(session.assembly.packed),draws:session.assembly.drawCommands(body.pose()).map(c=>({...c,model:Array.from(c.model)}))}:{packed:Array.from(packedMesh(session.mesh)),model:Array.from(rotationMatrix(body.pose()))};
 const append=(label,extra={})=>scenes.push({label:`${item.id}-${label}`,reference:`${item.id}-rest`,width,height,...draws(),projection:Array.from(camera.projection),distance:camera.distance,...(item.id==='ring'&&label==='rest'?{backgroundAt:[[Math.floor(width/2),Math.floor(height/2)]]}:{}),...extra});
 const run=n=>{for(let i=0;i<n;i++)body.step(1/120);},hit=()=>{const ray=camera.ray(width/2,height/2,rect,body.pose());return pickMesh(session.mesh,ray.origin,ray.direction);};
 append('rest');const pose=body.orientation.slice();body.drag(85,-30,.1,390);body.velocity=[0,0,0];append('turned');body.drag(160,60,.1,390);body.velocity=[0,0,0];append('back');body.orientation=pose;
 if(session.manipulation){
  const player=session.manipulation,c=player.controls[0];
  for(const [label,value] of [['partial',c.type==='rotate'?c.initial+.8:c.min+(c.max-c.min)*.4],['limit',c.type==='rotate'?c.initial+1.6:c.type==='hinge'?c.min:c.max],['reverse',c.type==='rotate'?c.initial-.6:c.min+(c.max-c.min)*.7]]){player.grab(c.part);player.moveBy(c.part,value-c.value,1/60);player.release();append(label);}
  body.drag(85,-30,.1,390);body.velocity=[0,0,0];append('part-turned');session.resetPose();append('reset',{equalReference:true});continue;
 }
 if(session.motion){
  for(const time of [.8,2,4]){session.motion.time=time;append(`motion-${time}`);}
  body.drag(85,-30,.1,390);body.velocity=[0,0,0];append('motion-turned');
  session.motion.setPlaying(false);session.resetPose();append('reset',{equalReference:true});continue;
 }
 if(!body.touchEnabled)continue;
 body.press(hit());body.release(0);run(9);append('tap');run(300);
 body.press(hit());run(120);append('held');
 const grabbed=hit(),point=body.beginPull(grabbed),mapping=camera.pullMapping(width/2,height/2,rect,body.pose(),point);
 body.pullTo(mapping(width/2+Math.min(width,height)*.09,height/2-Math.min(width,height)*.05));run(48);append('pull');body.release();run(18);append('release');
}
// Compare the actual lightweight preview to the same GPU triangles/camera;
// this checks depth, holes, inside surfaces, two sides and assembled occlusion.
for(const item of read('collection.json').items){
 const definition=read(item.file);if(definition.schema!=='sukima3d-specimen/2')continue;
 const session=new TouchSession().select(definition),camera=new Camera();camera.resize(200,200,session.assembly?.radius??session.mesh.radius);
 const preview=previewRaster(definition,200,true);
 const draws=session.assembly?{packed:Array.from(session.assembly.packed),draws:session.assembly.drawCommands(session.body.pose()).map(c=>({...c,model:Array.from(c.model)}))}:{packed:Array.from(packedMesh(session.mesh)),model:Array.from(rotationMatrix(session.body.pose()))};
 scenes.push({label:`${item.id}-preview`,reference:`${item.id}-preview`,width:200,height:200,...draws,projection:Array.from(camera.projection),distance:camera.distance,cpuPreview:Array.from(preview.pixels),cpuEdgeDistance:Array.from(preview.edgeDistance)});
}
console.log(JSON.stringify({shaders,scenes}));
