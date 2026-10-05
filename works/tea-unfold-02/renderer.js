(function (root) {
  'use strict';
  const vertex = `
    attribute vec3 position, normal, surface;
    uniform mat4 camera;
    varying vec3 n, uv;
    void main() { gl_Position = camera * vec4(position, 1.0); n = mat3(camera) * normal; uv = surface; }
  `;
  const fragment = `
    precision mediump float;
    varying vec3 n, uv;
    uniform float wet;
    void main() {
      vec3 nn = normalize(n); if (!gl_FrontFacing) nn = -nn;
      vec3 light = normalize(vec3(-.6, .8, 1.4));
      float diffuse = max(0.0, dot(nn, light));
      float grain = sin(uv.x*163.0+uv.y*79.0)*sin(uv.x*117.0-uv.y*47.0);
      float center = exp(-abs(uv.y)*125.0);
      float branch = abs(fract(uv.x*9.0-abs(uv.y)*1.4+.08*sin(uv.y*11.0))-.5);
      float veins = (1.0-smoothstep(.012,.043,branch))*smoothstep(.02,.09,abs(uv.y));
      float edge = smoothstep(.83,1.0,abs(uv.y));
      vec3 color = mix(vec3(.18,.20,.12),vec3(.29,.30,.17),wet);
      color *= .9 + grain*.075;
      color = mix(color,vec3(.22,.20,.10),edge*.42);
      color += vec3(.045,.038,.018)*(center+veins*.45);
      color *= gl_FrontFacing ? 1.0 : .82;
      if (uv.z > 1.5) color = vec3(.34,.25,.13)*(1.0+grain*.08);
      float spec = pow(max(0.0,dot(reflect(-light,nn),vec3(0.,0.,1.))),38.0);
      vec3 finalColor = color*(.63+diffuse*.60) + vec3(.63,.61,.44)*spec*wet*.25;
      gl_FragColor = vec4(finalColor,1.0);
    }
  `;
  // A fixed orthographic camera preserves the apparent expansion during scrubbing.
  function camera() {
    const ax = -.63, az = -.24, ay = .12;
    const rotate = (p) => {
      let [x,y,z]=p; [y,z]=[y*Math.cos(ax)-z*Math.sin(ax),y*Math.sin(ax)+z*Math.cos(ax)];
      [x,z]=[x*Math.cos(ay)+z*Math.sin(ay),-x*Math.sin(ay)+z*Math.cos(ay)];
      return [x*Math.cos(az)-y*Math.sin(az),x*Math.sin(az)+y*Math.cos(az),z];
    };
    const a=rotate([1,0,0]),b=rotate([0,1,0]),c=rotate([0,0,1]);
    const scale=.62;
    return new Float32Array([a[0]*scale,a[1]*scale,-a[2]*.25,0,b[0]*scale,b[1]*scale,-b[2]*.25,0,
      c[0]*scale,c[1]*scale,-c[2]*.25,0,-.02,-.15,0,1]);
  }
  class Renderer {
    constructor(onState) {
      this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = 720;
      this.onState = onState; this.lost = false; this.dirty = true; this.rendered = -1;
      this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost=true; this.onState('lost'); });
      this.canvas.addEventListener('webglcontextrestored', () => {
        this.lost=false;
        try { this.initialize(); this.onState('ready'); } catch (e) { this.unavailable=true; this.onState('unavailable'); }
      });
      this.gl = this.canvas.getContext('webgl', { alpha:true, antialias:true, premultipliedAlpha:true, preserveDrawingBuffer:true });
      if (!this.gl) throw new Error('WebGL unavailable');
      this.initialize();
    }
    initialize() {
      const gl=this.gl;
      const compile=(type,source)=>{
        const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      this.program=gl.createProgram();
      const shaders=[compile(gl.VERTEX_SHADER,vertex),compile(gl.FRAGMENT_SHADER,fragment)];
      shaders.forEach(s=>gl.attachShader(this.program,s)); gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
      shaders.forEach(s=>gl.deleteShader(s));
      this.locations=Object.fromEntries(['position','normal','surface'].map(k=>[k,gl.getAttribLocation(this.program,k)]));
      this.buffers=Object.fromEntries(['position','normal','surface','indices'].map(k=>[k,gl.createBuffer()]));
      this.cameraUniform=gl.getUniformLocation(this.program,'camera'); this.wetUniform=gl.getUniformLocation(this.program,'wet');
      this.stem=root.RolledTeaModel.stem(); this.dirty=true; this.unavailable=false;
    }
    drawMesh(mesh) {
      const gl=this.gl;
      for (const [key,data] of [['position',mesh.positions],['normal',mesh.normals],['surface',mesh.uv]]) {
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[key]); gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.locations[key]); gl.vertexAttribPointer(this.locations[key],3,gl.FLOAT,false,0,0);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.buffers.indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.DYNAMIC_DRAW);
      gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);
    }
    render(progress) {
      if (this.lost || this.unavailable || (!this.dirty && progress === this.rendered)) return;
      const gl=this.gl;
      gl.viewport(0,0,this.canvas.width,this.canvas.height); gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.useProgram(this.program); gl.uniformMatrix4fv(this.cameraUniform,false,camera());
      gl.uniform1f(this.wetUniform,root.RolledTeaModel.smooth(0,.32,progress));
      this.drawMesh(this.stem); this.drawMesh(root.RolledTeaModel.mesh(progress));
      this.rendered=progress; this.dirty=false;
    }
  }
  root.RolledTeaRenderer=Renderer;
})(window);
