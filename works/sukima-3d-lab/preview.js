// Lightweight static vector preview of the SAME mesh/material as Touch View.
// No WebGL context, image asset, animation or gallery dependency.
import {createSpecimen} from './engine/specimen.js?v=0.4.0';
import {rotate,sub,cross,dot,norm,scale} from './engine/math.js?v=0.4.0';
export function previewSvg(definition){
 const mesh=createSpecimen(definition),q=definition.display.orientation,light=norm([-.6,.85,1.2]),pixels=68*Math.min(1,1.1/mesh.radius);
 const vertices=mesh.rest.map(v=>rotate(q,v)),polygons=[];
 for(const {indices,face} of mesh.triangles){
  const [a,b,c]=indices.map(i=>vertices[i]),normal=norm(cross(sub(b,a),sub(c,a)));
  if(normal[2]<=0)continue;
  const strength=.66+.30*Math.max(0,dot(normal,light))+.07*(.5+.5*normal[1]);
  const shade=1+Math.sin(face*4.17)*mesh.material.variation;
  const color=(mesh.material.faceColors?.[face]??mesh.material.color).map(v=>Math.round(Math.min(1,v*shade)*strength*255));
  const points=[a,b,c].map(v=>`${(100+v[0]*pixels).toFixed(2)},${(100-v[1]*pixels).toFixed(2)}`).join(' ');
  polygons.push({depth:(a[2]+b[2]+c[2])/3,markup:`<polygon points="${points}" fill="rgb(${color.join(',')})" stroke="rgb(${color.join(',')})" stroke-width="0.4"/>`});
 }
 polygons.sort((a,b)=>a.depth-b.depth);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" aria-hidden="true"><ellipse cx="100" cy="177" rx="45" ry="7" fill="#9c8c79" opacity=".10"/>${polygons.map(p=>p.markup).join('')}</svg>`;
}
