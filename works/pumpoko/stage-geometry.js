(function(root){
  'use strict';
  const MATERIALS=Object.freeze(['flesh','polished','cushion']);
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const smooth=t=>t*t*(3-2*t);
  function validate(data){
    const errors=[],ids=new Set();
    const fail=s=>errors.push(s),id=(v,label)=>{if(typeof v!=='string'||!v.length||v.length>100||ids.has(v))fail(label+': unique id required');else ids.add(v);};
    const coord=(v,label)=>{if(!finite(v)||Math.abs(v)>20000)fail(label+': finite coordinate within ±20000 required');};
    if(!data||typeof data!=='object'||Array.isArray(data))return ['Stage Data must be an object'];
    const visiting=new Set();let entries=0;
    function json(v,depth=0){
      if(++entries>50000||depth>16){fail('Stage Data is too large or deeply nested');return;}
      if(v===null||typeof v==='string'||typeof v==='boolean')return;
      if(typeof v==='number'){if(!Number.isFinite(v))fail('All numeric data must be finite');return;}
      if(typeof v!=='object'){fail('Stage Data must contain JSON-compatible values only');return;}
      if(visiting.has(v)){fail('Stage Data cannot contain cycles');return;}visiting.add(v);for(const child of Object.values(v))json(child,depth+1);visiting.delete(v);
    }
    json(data);
    if(data.version!==1)fail('Unsupported version (expected 1)');
    if(!data.start||!data.end)fail('start and end required');
    else {coord(data.start.x,'start.x');coord(data.start.y,'start.y');coord(data.end.left,'end.left');coord(data.end.right,'end.right');if(!(data.end.left<data.end.right))fail('end.left must precede end.right');}
    if(!Array.isArray(data.surfaces)||!data.surfaces.length||data.surfaces.length>128)fail('1–128 surfaces required');
    let previous=-Infinity,total=0;
    for(const s of Array.isArray(data.surfaces)?data.surfaces:[]){
      if(!s||typeof s!=='object'){fail('Invalid surface');continue;}id(s.id,'surface');
      if(!MATERIALS.includes(s.material))fail(s.id+': invalid material');
      if(!Array.isArray(s.points)||s.points.length<2){fail(s.id+': at least two points required');continue;}
      total+=s.points.length;let x=-Infinity;
      for(const p of s.points){
        if(!p||typeof p!=='object'){fail('Invalid point');continue;}id(p.id,'point');coord(p.x,'point.x');coord(p.y,'point.y');
        if(!(p.x>x))fail(s.id+': point x order must increase');x=p.x;
        if(p.tangent!==undefined&&(!finite(p.tangent)||Math.abs(p.tangent)>10))fail('tangent must be finite within ±10');
        if(p.round!==undefined&&typeof p.round!=='boolean')fail('round must be boolean');
      }
      if(!(s.points[0].x>previous))fail('surfaces must be ordered without overlap');previous=s.points.at(-1).x;
    }
    if(total>4096)fail('At most 4096 control points');
    if(!Array.isArray(data.materials)||data.materials.length>1024)fail('materials array required (maximum 1024)');
    for(const m of Array.isArray(data.materials)?data.materials:[]){
      if(!m||typeof m!=='object'){fail('Invalid material interval');continue;}id(m.id,'material interval');coord(m.left,'material.left');coord(m.right,'material.right');
      if(!(m.left<m.right)||!MATERIALS.includes(m.material))fail('Invalid material interval');
      if(typeof m.includeLeft!=='boolean'||typeof m.includeRight!=='boolean')fail('material edge flags required');
    }
    if(!Array.isArray(data.features)||data.features.length>32)fail('features array required (maximum 32)');
    for(const f of Array.isArray(data.features)?data.features:[]){
      if(!f||typeof f!=='object'){fail('Invalid feature');continue;}id(f.id,'feature');
      if(f.type!=='loop')fail('Unsupported feature type');
      coord(f.x,'loop.x');coord(f.y,'loop.y');
      if(!finite(f.radius)||f.radius<24||f.radius>1000)fail('Loop radius must be 24–1000');
      if(!MATERIALS.includes(f.material))fail('Invalid Loop material');
      if(!f.entry||!f.exit||!finite(f.entry.x)||!finite(f.entry.y)||!finite(f.exit.x)||!finite(f.exit.y))fail('Loop entry/exit required');
      else {for(const key of ['entry','exit']){coord(f[key].x,'loop.'+key+'.x');coord(f[key].y,'loop.'+key+'.y');}
        if(Math.abs(f.entry.x-(f.x-f.radius*1.8))>.001||Math.abs(f.exit.x-(f.x+f.radius*1.8))>.001||Math.abs(f.entry.y-f.y-f.radius)>.001)fail('Loop ports must follow the fixed v1 topology');}
    }
    if(!errors.length){
      const contains=x=>data.surfaces.some(s=>x>=s.points[0].x&&x<=s.points.at(-1).x);
      if(!contains(data.start.x))fail('start must lie over a surface');
      if(!data.surfaces.some(s=>data.end.left>=s.points[0].x&&data.end.right<=s.points.at(-1).x))fail('end must fit on one surface');
    }
    return errors;
  }
  function compile(input){
    const errors=validate(input);if(errors.length)throw Error(errors.slice(0,3).join(' / '));
    const data=JSON.parse(JSON.stringify(input));
    const material=x=>{
      const s=data.surfaces.find(s=>x>=s.points[0].x&&x<=s.points.at(-1).x);
      let value=s?s.material:'flesh';
      for(const m of data.materials)if((m.includeLeft?x>=m.left:x>m.left)&&(m.includeRight?x<=m.right:x<m.right))value=m.material;
      return value;
    };
    const segments=data.surfaces.map((surface,index)=>{
      const points=surface.points,samples=[];
      for(let k=0;k<points.length-1;k++){
        const a=points[k],b=points[k+1],n=Math.ceil((b.x-a.x)/6);
        for(let i=0;i<n;i++){
          const t=i/n,x=a.x+(b.x-a.x)*t;
          const y=a.tangent!==undefined&&b.tangent!==undefined?
            (2*t*t*t-3*t*t+1)*a.y+(t*t*t-2*t*t+t)*(b.x-a.x)*a.tangent+
            (-2*t*t*t+3*t*t)*b.y+(t*t*t-t*t)*(b.x-a.x)*b.tangent:a.y+(b.y-a.y)*smooth(t);
          samples.push(Object.freeze({x,y,material:material(x)}));
        }
      }
      const last=points.at(-1);samples.push(Object.freeze({x:last.x,y:last.y,material:material(last.x)}));
      return Object.freeze({id:index,key:surface.id,left:points[0].x,right:last.x,samples:Object.freeze(samples)});
    });
    const terrain=Object.freeze(segments.flatMap(s=>s.samples));
    const gaps=Object.freeze(segments.slice(0,-1).map((s,i)=>Object.freeze({left:s.right,right:segments[i+1].left})));
    const roundRanges=[];
    for(const s of data.surfaces)for(let i=0;i<s.points.length-1;i++)if(s.points[i].round&&s.points[i+1].round)roundRanges.push({left:s.points[i].x,right:s.points[i+1].x});
    const firstRound=data.surfaces.flatMap(s=>s.points).filter(p=>p.round);
    const round=firstRound.length?{left:firstRound[0].x,bottom:firstRound.reduce((a,b)=>a.y>b.y?a:b).x,right:firstRound.at(-1).x}:{left:Infinity,bottom:Infinity,right:-Infinity};
    function floor(x){
      const segment=segments.find(s=>x>=s.left&&x<=s.right);if(!segment)return null;
      const samples=segment.samples;let lo=0,hi=samples.length-1;
      while(hi-lo>1){const m=(lo+hi)>>1;if(samples[m].x<=x)lo=m;else hi=m;}
      const a=samples[lo],b=samples[hi],slope=(b.y-a.y)/(b.x-a.x),len=Math.hypot(1,slope);
      return {y:a.y+(x-a.x)*slope,nx:slope/len,ny:-1/len,slope,material:material(x),segment:segment.id};
    }
    const loops=data.features.map(f=>{
      // A circle with an open lower mouth. The raised approach passes above
      // the returning lower arc; a slow grain can fall back to the foundation.
      // All contacts below are one-sided geometry, never a path or motor.
      const mouth=.45,bottom=f.y+f.radius;
      const pieces=[[{x:f.entry.x,y:f.entry.y,t:0},{x:f.x-f.radius*Math.sin(mouth),y:bottom-f.radius*.12,t:-.22}],
        [{x:f.x,y:bottom,t:0},{x:f.x+f.radius*Math.sin(mouth),y:f.y+f.radius*Math.cos(mouth),t:-Math.tan(mouth)}]];
      const ramps=pieces.map(points=>{
        const samples=[];
        for(let k=0;k<points.length-1;k++){
          const a=points[k],b=points[k+1],n=Math.ceil((b.x-a.x)/3);
          for(let i=0;i<n;i++){const t=i/n;samples.push({x:a.x+(b.x-a.x)*t,y:(2*t*t*t-3*t*t+1)*a.y+(t*t*t-2*t*t+t)*(b.x-a.x)*a.t+(-2*t*t*t+3*t*t)*b.y+(t*t*t-t*t)*(b.x-a.x)*b.t});}
        }
        samples.push({x:points.at(-1).x,y:points.at(-1).y});return Object.freeze(samples.map(Object.freeze));
      });
      return Object.freeze({...f,mouth,ramps:Object.freeze(ramps)});
    });
    function rampFloor(loop,x){
      const ps=loop.ramps.find(ps=>x>=ps[0].x&&x<=ps.at(-1).x);if(!ps)return null;let lo=0,hi=ps.length-1;
      while(hi-lo>1){const k=(lo+hi)>>1;if(ps[k].x<=x)lo=k;else hi=k;}
      const a=ps[lo],b=ps[hi],slope=(b.y-a.y)/(b.x-a.x),len=Math.hypot(1,slope);
      return {y:a.y+(x-a.x)*slope,nx:slope/len,ny:-1/len};
    }
    function featureContacts(p,support){
      const contacts=[];
      for(const f of loops){
        const ramp=rampFloor(f,p.x);
        if(ramp&&((p.previousY??p.y)-ramp.y)*-ramp.ny+support(p,ramp.nx,ramp.ny)<=.75){const penetration=(p.y-ramp.y)*-ramp.ny+support(p,ramp.nx,ramp.ny);if(penetration>-3&&penetration<30)contacts.push({...ramp,penetration,material:f.material,kind:'ramp',loopId:f.id});}
        const dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy);if(!d)continue;
        const angle=Math.atan2(dy,dx),inMouth=Math.abs(angle-Math.PI/2)<f.mouth;
        const previous=Math.hypot((p.previousX??p.x)-f.x,(p.previousY??p.y)-f.y);
        const nx=-dx/d,ny=-dy/d,penetration=d-f.radius+support(p,nx,ny);
        if(!inMouth&&previous<=f.radius&&penetration>-3&&penetration<30)contacts.push({nx,ny,penetration,material:f.material,kind:'circle',loopId:f.id});
      }
      return contacts;
    }
    const bounds=Object.freeze({left:segments[0].left+10,right:segments.at(-1).right-10,lostY:Math.max(600,...terrain.map(p=>p.y+100),...loops.map(f=>f.y+f.radius+100)),top:Math.min(...terrain.map(p=>p.y),...loops.map(f=>f.y-f.radius))});
    const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};freeze(data);
    return Object.freeze({data,segments:Object.freeze(segments),terrain,GAP:gaps,START:Object.freeze(data.start),END:Object.freeze(data.end),ROUND:Object.freeze(round),bounds,
      floor,material,isRound:x=>roundRanges.some(r=>x>=r.left&&x<=r.right),field:(x,y)=>{const f=floor(x);return f?{...f,signed:(y-f.y)*-f.ny}:null;},loops:Object.freeze(loops),featureContacts,rampFloor});
  }
  const api=Object.freeze({validate,compile,MATERIALS});root.PumpkinStageGeometry=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
