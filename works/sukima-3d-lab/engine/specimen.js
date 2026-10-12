// Pure JSON -> welded mesh. No DOM, requests, object IDs or shape generators.
import {add,sub,scale,cross,dot,norm} from './math.js?v=0.4.0';
import {FEEL_PROFILES} from './response.js?v=0.4.0';
const fail=message=>{throw new TypeError(`Invalid specimen: ${message}`);};
const finite=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const vector=(v,length,min,max)=>Array.isArray(v)&&v.length===length&&v.every(x=>finite(x,min,max));
const ID=/^[a-z][a-z0-9-]{1,47}$/;
const SETTINGS=Object.freeze({depth:[.04,.23],radius:[.55,1.9],pressRate:[3,16],pressStiffness:[100,500],pressDamping:[.4,1],restoreStiffness:[100,500],returnDamping:[.4,.98],tapImpulse:[1.8,3.6],holdDelay:[200,700],pullStrength:[.5,1.5],maxPull:[.1,.6],pullRadius:[1,1.9],pullStiffness:[200,600]});
export function validateSpecimen(data){
 if(!data||data.schema!=='sukima3d-specimen/1')fail('schema');
 if(typeof data.id!=='string'||!ID.test(data.id)||typeof data.name!=='string'||!data.name.trim()||data.name.length>48)fail('id/name');
 if(!Array.isArray(data.tags)||data.tags.length>8||data.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>24))fail('tags');
 const g=data.geometry,v=g?.vertices,faces=g?.faces;
 if(!Array.isArray(v)||v.length<4||v.length>64||v.some(p=>!vector(p,3,-2,2)))fail('vertices');
 for(let i=0;i<v.length;i++)for(let j=0;j<i;j++)if(Math.hypot(...sub(v[i],v[j]))<1e-5)fail('duplicate vertices');
 if(!Array.isArray(faces)||faces.length<4||faces.length>96)fail('faces');
 const edges=new Map(),used=new Set();let volume=0,triangleCount=0;
 for(const f of faces){
  if(!Array.isArray(f)||f.length<3||f.length>12||new Set(f).size!==f.length||f.some(i=>!Number.isInteger(i)||i<0||i>=v.length))fail('face indices');
  triangleCount+=f.length;
  const [a,b,c]=f.map(i=>v[i]),raw=cross(sub(b,a),sub(c,a));
  if(Math.hypot(...raw)<1e-5)fail('degenerate face');
  const normal=norm(raw),center=scale(f.reduce((p,i)=>add(p,v[i]),[0,0,0]),1/f.length);
  if(f.some(i=>Math.abs(dot(normal,sub(v[i],a)))>1e-5))fail('nonplanar face');
  // v0.4's small production contract is a closed convex solid. This also
  // excludes self intersections without a general-purpose mesh repair system.
  if(v.some(p=>dot(normal,sub(p,a))>1e-5))fail('inward winding or nonconvex solid');
  for(let j=0;j<f.length;j++){
   const i=f[j],next=f[(j+1)%f.length];used.add(i);
   if(dot(normal,cross(sub(v[next],v[i]),sub(center,v[i])))<1e-5)fail('nonconvex or degenerate polygon');
   if(Math.hypot(...sub(v[next],v[i]))<.025)fail('tiny edge');
   const key=[i,next].sort((a,b)=>a-b).join(':');const edge=edges.get(key)??{count:0,balance:0};edge.count++;edge.balance+=i<next?1:-1;edges.set(key,edge);
   volume+=dot(v[i],cross(v[next],center))/6;
  }
 }
 if(triangleCount>512||used.size!==v.length||[...edges.values()].some(e=>e.count!==2||e.balance!==0)||volume<.035)fail('open/nonmanifold/unused vertices or volume');
 // Convex halfspaces plus welded edges are insufficient for disjoint shells;
 // require all corners to belong to the one connected surface.
 const connected=new Set([0]);let growing=true;
 while(growing){growing=false;for(const f of faces)if(f.some(i=>connected.has(i)))for(const i of f)if(!connected.has(i)){connected.add(i);growing=true;}}
 if(connected.size!==v.length)fail('disconnected solid');
 for(const key of ['cornerCompliance','centerCompliance'])if(!finite(g[key],0,1))fail(`geometry.${key}`);
 if(g.limits){
  if(!finite(g.limits.pressDepth,.03,.23)||!finite(g.limits.maxDisplacement,.04,.28)||!finite(g.limits.maxPull,.1,.6)||g.limits.pressDepth>g.limits.maxDisplacement)fail('geometry limits');
 }
 const m=data.material;
 if(!m||m.kind!=='matte'||!vector(m.color,3,0,1)||!finite(m.variation,0,.08))fail('matte material');
 if(m.faceColors&&(!Array.isArray(m.faceColors)||m.faceColors.length!==faces.length||m.faceColors.some(c=>!vector(c,3,0,1))))fail('face colors');
 if(!Object.hasOwn(FEEL_PROFILES,data.feel?.profile)||!data.feel.overrides||typeof data.feel.overrides!=='object'||Array.isArray(data.feel.overrides))fail('feel');
 for(const [key,value] of Object.entries(data.feel.overrides)){if(!Object.hasOwn(SETTINGS,key)||!finite(value,...SETTINGS[key]))fail(`feel override ${key}`);}
 const d=data.display;
 if(!d||!vector(d.orientation,4,-1,1)||Math.abs(Math.hypot(...d.orientation)-1)>1e-5||!finite(d.scale,.55,1.25))fail('display');
 if(Math.max(...v.map(p=>Math.hypot(...p)))*d.scale>1.65)fail('display bounds');
 return data;
}
export function createSpecimen(data){
 validateSpecimen(data);
 const {geometry:g,display,material}=data,rest=g.vertices.map(v=>scale(v,display.scale)),faces=g.faces.map(f=>f.slice()),triangles=[],faceCenters=[];
 faces.forEach((f,face)=>{
  const point=scale(f.reduce((p,i)=>add(p,rest[i]),[0,0,0]),1/f.length),center=rest.push(point)-1;faceCenters.push(center);
  for(let j=0;j<f.length;j++)triangles.push({indices:[f[j],f[(j+1)%f.length],center],face});
 });
 const compliance=rest.map((_,i)=>i<g.vertices.length?g.cornerCompliance:g.centerCompliance);
 return {rest,vertices:rest.map(v=>v.slice()),faces,triangles,material:{...material,color:material.color.slice(),faceColors:material.faceColors?.map(c=>c.slice())},radius:Math.max(...rest.map(p=>Math.hypot(...p))),deformation:{compliance,faceCenters,limits:g.limits?{...g.limits}:undefined}};
}
export function validateCollection(data){
 if(!data||data.schema!=='sukima3d-collection/1'||!Array.isArray(data.items)||!data.items.length||data.items.length>1000)fail('collection');
 const ids=new Set(),files=new Set();
 for(const item of data.items){
  if(!item||typeof item.id!=='string'||!ID.test(item.id)||!/^objects\/[a-z][a-z0-9-]{1,47}\.json$/.test(item.file)||ids.has(item.id)||files.has(item.file))fail('collection entry');
  ids.add(item.id);files.add(item.file);
 }
 return data.items;
}
