import {rotationMatrix} from './math.js?v=0.7.1';
import {packedMesh} from './geometry.js?v=0.7.1';
const VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec3 color;
uniform mat4 projection;
uniform mat4 model;
uniform float distance;
out vec3 n; out vec3 c; out vec3 local;
void main(){vec4 world=model*vec4(position,1.);n=mat3(model)*normal;c=color;local=position;world.z-=distance;gl_Position=projection*world;}`;
const FRAGMENT=`#version 300 es
precision highp float;
in vec3 n; in vec3 c; in vec3 local;
uniform bool shadow;
out vec4 outputColor;
void main(){
 if(shadow){float r=length(local.xz);outputColor=vec4(.36,.28,.21,.14*pow(max(0.,1.-r),2.));return;}
 vec3 N=normalize(n); float diffuse=max(0.,dot(N,normalize(vec3(-.6,.85,1.2))));
 float sky=.5+.5*N.y;vec3 linear=c*(.66+.30*diffuse+.07*sky);
 outputColor=vec4(linear,1.);
}`;
export class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});
  if(!this.gl)throw new Error('WEBGL2_UNAVAILABLE');
  this.initialize();
 }
 initialize(){
  const gl=this.gl;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(message);}return s;};
  const vs=shader(gl.VERTEX_SHADER,VERTEX),fs=shader(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  this.program=program;this.vao=gl.createVertexArray();this.buffer=gl.createBuffer();
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);}
  this.uniforms=Object.fromEntries(['projection','model','distance','shadow'].map(k=>[k,gl.getUniformLocation(program,k)]));
  // A soft world-space ground shadow, independent of the body's orientation.
  const vertices=[];
  for(let i=0;i<48;i++)for(const p of [[0,-1.38,0],[Math.cos(i/48*Math.PI*2)*1.65,-1.38,Math.sin(i/48*Math.PI*2)*1.65],[Math.cos((i+1)/48*Math.PI*2)*1.65,-1.38,Math.sin((i+1)/48*Math.PI*2)*1.65]])vertices.push(...p,0,1,0,0,0,0);
  this.shadowData=new Float32Array(vertices);
 }
 resize(width,height,dpr=1){
  const density=Math.min(2,Math.max(1,dpr));
  this.canvas.width=Math.max(1,Math.round(width*density));this.canvas.height=Math.max(1,Math.round(height*density));
  this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
 }
 draw(mesh,orientation,camera,motion=null){
  const gl=this.gl,u=this.uniforms;
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  gl.uniformMatrix4fv(u.projection,false,camera.projection);gl.uniform1f(u.distance,camera.distance);
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  const shadowModel=rotationMatrix([0,0,0,1]);shadowModel[13]=-Math.max(0,(motion?.radius??mesh.radius??1.1)+.22-1.38);
  gl.uniform1i(u.shadow,1);gl.uniformMatrix4fv(u.model,false,shadowModel);
  gl.bufferData(gl.ARRAY_BUFFER,this.shadowData,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,this.shadowData.length/9);
  gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  gl.uniform1i(u.shadow,0);
  if(motion){
   gl.bufferData(gl.ARRAY_BUFFER,motion.packed,gl.DYNAMIC_DRAW);
   for(const command of motion.drawCommands(orientation)){gl.uniformMatrix4fv(u.model,false,command.model);gl.drawArrays(gl.TRIANGLES,command.first,command.count);}
  }else{
   gl.uniformMatrix4fv(u.model,false,rotationMatrix(orientation));
   const packed=packedMesh(mesh);gl.bufferData(gl.ARRAY_BUFFER,packed,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,packed.length/9);
  }
 }
 destroy(){const gl=this.gl;gl.deleteBuffer(this.buffer);gl.deleteVertexArray(this.vao);gl.deleteProgram(this.program);}
}
