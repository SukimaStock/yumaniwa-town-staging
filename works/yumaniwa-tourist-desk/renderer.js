import {Renderer} from '../sukima-3d-lab/engine/renderer.js?v=0.7.1';
import {rotationMatrix,rotate} from '../sukima-3d-lab/engine/math.js?v=0.7.1';
import {furniture} from './scene.js?v=0.3';
// Reuse the exact Lab shader/program/VAO. Extend frame ownership only here.
export class DeskRenderer extends Renderer {
 constructor(canvas,scene){super(canvas);this.scene=scene;this.upload();}
 upload(){const gl=this.gl;let offset=0;const chunks=[furniture(),...this.scene.items.map(i=>i.player.packed),...this.scene.items.filter(i=>i.printedMap).map(i=>i.printedMap)];this.furnitureCount=chunks[0].length/9;
  this.offsets=new Map();for(let i=0;i<chunks.length;i++){if(i<=this.scene.items.length&&i)this.offsets.set(this.scene.items[i-1],offset/9);else if(i>this.scene.items.length){const item=this.scene.items.filter(i=>i.printedMap)[i-this.scene.items.length-1];item.mapFirst=offset/9;}offset+=chunks[i].length;}
  const data=new Float32Array(offset);offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);this.bytes=data.byteLength;
  // Soft contact patches share one buffer. Draw before objects, on the tabletop.
  this.shadowBuffer=gl.createBuffer();const patches=[];
  for(const item of this.scene.items){item.shadowFirst=patches.length/9;for(let i=0;i<24;i++)for(const p of [[0,0,0],[Math.cos(i/24*Math.PI*2),0,Math.sin(i/24*Math.PI*2)],[Math.cos((i+1)/24*Math.PI*2),0,Math.sin((i+1)/24*Math.PI*2)]])patches.push(...p,0,1,0,0,0,0);}
  gl.bindBuffer(gl.ARRAY_BUFFER,this.shadowBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(patches),gl.STATIC_DRAW);
 }
 bind(buffer){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(let i=0;i<3;i++)gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);}
 draw(){const gl=this.gl,u=this.uniforms,s=this.scene;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.uniformMatrix4fv(u.projection,false,s.camera.projection);gl.uniform1f(u.distance,s.camera.distance);gl.uniform1i(u.shadow,0);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.disable(gl.BLEND);
  this.bind(this.buffer);gl.uniformMatrix4fv(u.model,false,rotationMatrix(s.view));gl.drawArrays(gl.TRIANGLES,0,this.furnitureCount);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);gl.depthMask(false);gl.uniform1i(u.shadow,1);this.bind(this.shadowBuffer);
  for(const item of s.items){const m=rotationMatrix(s.view),width=item.entry.size*.6;for(const i of [0,1,2,4,5,6,8,9,10])m[i]*=width;m.set(rotate(s.view,[item.position[0],.012,item.position[2]]),12);gl.uniformMatrix4fv(u.model,false,m);gl.drawArrays(gl.TRIANGLES,item.shadowFirst,72);}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);gl.uniform1i(u.shadow,0);this.bind(this.buffer);
  for(const item of s.items)for(const command of item.commands(s.view)){gl.uniformMatrix4fv(u.model,false,command.model);gl.drawArrays(gl.TRIANGLES,this.offsets.get(item)+command.first,command.count);}
  for(const item of s.items.filter(i=>i.printedMap)){const c=item.commands(s.view).find(c=>c.id==='reading-plate');gl.uniformMatrix4fv(u.model,false,c.model);gl.drawArrays(gl.TRIANGLES,item.mapFirst,item.printedMap.length/9);}
 }
 restore(){this.initialize();this.upload();}
 destroy(){this.gl.deleteBuffer(this.shadowBuffer);super.destroy();}
}
