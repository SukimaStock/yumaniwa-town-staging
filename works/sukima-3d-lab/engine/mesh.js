// Explicit triangle surfaces and assemblies. This module never triangulates a
// polygon, fills a hole, takes a convex hull or attaches a behavior.
import {add,sub,scale,cross,dot,norm,rotate} from './math.js?v=0.7.1';
const fail=m=>{throw new TypeError(`Invalid specimen: ${m}`);};
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const vector=(v,n,min,max)=>Array.isArray(v)&&v.length===n&&Array.from(v).every(x=>finite(x,min,max));
const unitQuat=q=>vector(q,4,-1,1)&&Math.abs(Math.hypot(...q)-1)<1e-5;
const ID=/^[a-z][a-z0-9-]{1,47}$/;
export function validateMeshSpecimen(data){
 if(data?.schema!=='sukima3d-specimen/2')fail('schema');
 if(typeof data.id!=='string'||!ID.test(data.id)||typeof data.name!=='string'||!data.name.trim()||data.name.length>48)fail('id/name');
 if(!Array.isArray(data.tags)||data.tags.length>8||data.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>24))fail('tags');
 const d=data.display;
 if(!d||!unitQuat(d.orientation)||!finite(d.scale,.55,1.25))fail('display');
 if(!Array.isArray(data.parts)||!data.parts.length||data.parts.length>32)fail('parts');
 const ids=new Set();let vertexCount=0,triangleCount=0;
 for(const part of data.parts){
  if(!part||typeof part.id!=='string'||!ID.test(part.id)||ids.has(part.id))fail('part id');ids.add(part.id);
  const t=part.transform;
  if(!t||!vector(t.position,3,-2,2)||!unitQuat(t.orientation)||!vector(t.scale,3,.02,4))fail('part transform');
  const g=part.geometry,v=g?.vertices,triangles=g?.triangles;
  if(!g||!['open','closed'].includes(g.surface))fail('surface');
  if(!Array.isArray(v)||v.length<3||v.length>2048||Array.from(v).some(p=>!vector(p,3,-2,2)))fail('mesh vertices');
  if(!Array.isArray(triangles)||!triangles.length||triangles.length>4096)fail('triangles');
  const edges=new Map(),used=new Set(),unique=new Set();let volume=0;
  if(g.normals!==undefined&&(!Array.isArray(g.normals)||g.normals.length!==v.length||Array.from(g.normals).some(n=>!vector(n,3,-1,1)||Math.abs(Math.hypot(...n)-1)>1e-5)))fail('mesh normals');
  for(const tri of triangles){
   if(!Array.isArray(tri)||tri.length!==3||new Set(tri).size!==3||tri.some(i=>!Number.isInteger(i)||i<0||i>=v.length))fail('triangle indices');
   const key=tri.slice().sort((a,b)=>a-b).join(':');if(unique.has(key))fail('duplicate triangle');unique.add(key);
   const [a,b,c]=tri.map(i=>v[i]),raw=cross(sub(b,a),sub(c,a));
   if(Math.hypot(...raw)<1e-6)fail('zero-area triangle');
   if(g.normals&&tri.some(i=>dot(g.normals[i],norm(raw))<=1e-5))fail('normal disagrees with winding');
   volume+=dot(a,cross(b,c))/6;
   for(let j=0;j<3;j++){
    const i=tri[j],next=tri[(j+1)%3];used.add(i);
    const key=[i,next].sort((a,b)=>a-b).join(':');const e=edges.get(key)??{count:0,balance:0};e.count++;e.balance+=i<next?1:-1;edges.set(key,e);
   }
  }
  if(used.size!==v.length||[...edges.values()].some(e=>e.count>2||(e.count===2&&e.balance!==0)))fail('unused vertices/nonmanifold or inconsistent winding');
  if(g.surface==='closed'&&([...edges.values()].some(e=>e.count!==2)||volume<=1e-5))fail('closed surface edges/volume');
  const m=part.material;
  if(!m||m.kind!=='matte'||!vector(m.color,3,0,1)||!finite(m.variation,0,.08)||typeof m.doubleSided!=='boolean')fail('mesh material');
  if(m.triangleColors!==undefined&&(!Array.isArray(m.triangleColors)||m.triangleColors.length!==triangles.length||m.triangleColors.some(c=>!vector(c,3,0,1))))fail('triangle colors');
  const transformed=v.map(p=>scale(add(rotate(t.orientation,p.map((x,i)=>x*t.scale[i])),t.position),d.scale));
  if(transformed.some(p=>Math.hypot(...p)>1.65))fail('display bounds');
  for(const tri of triangles){const [a,b,c]=tri.map(i=>transformed[i]);if(Math.hypot(...cross(sub(b,a),sub(c,a)))<1e-6)fail('transformed zero-area triangle');}
  vertexCount+=v.length;triangleCount+=triangles.length*(m.doubleSided?2:1);
 }
 if(vertexCount>2048||triangleCount>8192)fail('mesh budget');
 return data;
}
export function createMeshSpecimen(data){
 const rest=[],triangles=[],parts=[];let face=0;
 validateMeshSpecimen(data);
 for(const part of data.parts){
  const {geometry:g,transform:t}=part,material={...part.material,color:part.material.color.slice(),triangleColors:part.material.triangleColors?.map(c=>c.slice())},start=rest.length;
  rest.push(...g.vertices.map(v=>scale(add(rotate(t.orientation,v.map((x,i)=>x*t.scale[i])),t.position),data.display.scale)));
  // Inverse transpose for positive nonuniform scaling, then rotate. The
  // common display scale is uniform and does not change normal directions.
  const normals=g.normals?.map(n=>norm(rotate(t.orientation,n.map((x,i)=>x/t.scale[i]))));
  g.triangles.forEach((tri,index)=>triangles.push({indices:tri.map(i=>start+i),face:face++,part:part.id,materialFace:index,material,normals:normals?tri.map(i=>normals[i]):undefined,doubleSided:material.doubleSided}));
  parts.push({id:part.id,start,count:g.vertices.length});
 }
 return {rest,vertices:rest.map(v=>v.slice()),triangles,parts,radius:Math.max(...rest.map(v=>Math.hypot(...v)))};
}
// Scale is baked once; rigid Motion and the base pose remain transforms.
// This keeps authored nonuniform scale out of animated normal matrices.
export function compileParts(data){
 validateMeshSpecimen(data);let face=0;
 return data.parts.map(part=>{
  const {geometry:g,transform:t}=part,rest=g.vertices.map(v=>v.map((x,i)=>x*t.scale[i]));
  const material=structuredClone(part.material),normals=g.normals?.map(n=>norm(n.map((x,i)=>x/t.scale[i])));
  const triangles=g.triangles.map((indices,index)=>({indices:indices.slice(),face:face++,part:part.id,materialFace:index,material,normals:normals?indices.map(i=>normals[i]):undefined,doubleSided:material.doubleSided}));
  return {id:part.id,transform:structuredClone(t),mesh:{rest,vertices:rest,triangles}};
 });
}
