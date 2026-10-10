/* WORLD LOOP only. No motors, new gravity or altered fruit constants.
 * Hermite curves and normal contact follow PUMPOKO's stage-geometry approach;
 * coordinates here are Y-up and authored independently for this small lab. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./physics.js') : root.FruitLabPhysics);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FruitLabWorld = api;
})(typeof window !== 'undefined' ? window : globalThis, function (P) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => t * t * (3 - 2 * t);
  const PARAMETERS = {
    tolerance: ['穴の横方向の猶予', 52, 38, 62, 1],
    assist: ['抜ける初速の補助', 260, 210, 330, 5],
    upward: ['突き上げに必要な速度', 45, 25, 90, 5],
  };
  // x, height, tangent. A long descending shoulder leads onto the first plug.
  const CURVES = {
    surface: [[-440, 710, -.8], [0, 420, 0], [320, 580, 0], [500, 500, -.45], [590, 480, 0]],
    underground: [[410, 220, -.6], [660, 95, 0], [830, 125, 0], [1010, 85, 0], [1240, 125, 0], [1310, 132, .1]],
    return: [[1140, 248, 0], [1240, 240, -.15], [1490, 205, 0], [1750, 310, .7]],
  };
  function curve(layer, x, course) {
    const points = (course ? course.curves : CURVES)[layer]; x = clamp(x, points[0][0], points.at(-1)[0]);
    const i = Math.max(0, points.findIndex((p, i) => i && x <= p[0]) - 1), a = points[i], b = points[i + 1];
    const length = b[0] - a[0], t = (x - a[0]) / length;
    const y = (2*t*t*t-3*t*t+1)*a[1] + (t*t*t-2*t*t+t)*length*a[2] + (-2*t*t*t+3*t*t)*b[1] + (t*t*t-t*t)*length*b[2];
    const slope = ((6*t*t-6*t)*a[1]+(3*t*t-4*t+1)*length*a[2]+(-6*t*t+6*t)*b[1]+(3*t*t-2*t)*length*b[2])/length;
    const curvature = ((12*t-6)*a[1]+(6*t-4)*length*a[2]+(-12*t+6)*b[1]+(6*t-2)*length*b[2])/(length*length);
    const k = Math.hypot(1, slope);
    return { x, y, slope, curvature, tx: 1/k, ty: slope/k, nx: -slope/k, ny: 1/k };
  }
  function contact(b, course) {
    let x = b.x;
    for (let i = 0; i < 8; i++) {
      const f = curve(b.layer, x, course);
      x -= clamp(((f.x-b.x)+(f.y-b.y)*f.slope)/Math.max(.4,1+f.slope*f.slope+(f.y-b.y)*f.curvature),-45,45);
    }
    const f = curve(b.layer, x, course); f.distance = (b.x-f.x)*f.nx+(b.y-f.y)*f.ny;
    if(course?.gaps?.some(g=>g.layer===b.layer)){
      if(!hasGround(b.layer,f.x,course)||f.distance<0){const edge=edgeContact(b,course);if(edge)return edge;return emptyFrame;}
    }
    return f;
  }
  // Infinity explicitly means no support, never a virtual floor. Gap endpoints
  // remain real top contact; there are no extra side-wall clamps at the lips.
  const emptyFrame=Object.freeze({support:false,distance:Infinity});
  function hasGround(layer,x,course){return !course?.gaps?.some(g=>g.layer===layer&&x>g.a&&x<g.b);}
  function groundFrame(layer,x,course){return hasGround(layer,x,course)?curve(layer,x,course):emptyFrame;}
  function fruit(kind, x, layer, plug = false, course) {
    const b = P.body(kind, 0); b.layer = layer; b.plugged = plug;
    const f = curve(layer, x, course); b.x = f.x + f.nx*b.r; b.y = f.y+f.ny*b.r;
    return b;
  }
  function create(settings = P.defaults()) {
    const s = P.create('pumpkin', settings); s.mode = 'world'; s.phase = 'surface';
    if (!settings.world) settings.world = Object.fromEntries(Object.entries(PARAMETERS).map(([k,v]) => [k,v[1]]));
    s.pumpkin = fruit('pumpkin', -250, 'surface'); s.rutabaga = fruit('rutabaga', 500, 'underground', true);
    const next = fruit('pumpkin', 1240, 'return', true);
    s.rutabaga.x = 500; s.rutabaga.y = 490; next.x = 1240; next.y = 230;
    s.entities = [s.pumpkin,s.rutabaga,next];
    s.holes = [hole('down',500,490,-1,s.rutabaga,'pumpkin','underground'),hole('up',1240,230,1,next,'rutabaga','return')];
    s.camera = {x:s.pumpkin.x,y:s.pumpkin.y+70,vx:0,vy:0}; return s;
  }
  function createCourse(course, settings = P.defaults()) {
    const s=create(settings);s.course=course;s.finished=false;s.finishedAt=null;
    s.goal=course.goal?{state:'approach',contact:0,seatedAt:null,pose:null}:null;
    s.pumpkin=fruit('pumpkin',-250,'surface',false,course);s.entities=[s.pumpkin];
    s.holes=course.holes.map(spec=>{
      const kind=spec.direction<0?'rutabaga':'pumpkin',occupant=fruit(kind,spec.x,spec.exitLayer,true,course);
      occupant.x=spec.x;occupant.y=spec.y;s.entities.push(occupant);
      const h=hole(spec.id,spec.x,spec.y,spec.direction,occupant,spec.direction<0?'pumpkin':'rutabaga',spec.exitLayer);
      h.entryLayer=spec.entryLayer;return h;
    });
    s.stages=course.stage1?{completed:[],checkpoint:null,failedAt:null}:null;
    s.rutabaga=s.entities[1];s.camera={x:s.pumpkin.x,y:s.pumpkin.y+70,vx:0,vy:0};return s;
  }
  // A real circle may touch the solid bank's corner before its centre reaches
  // that bank. Later stages resolve that endpoint, never the missing interior.
  // Original STAGE 1 uses its accepted contact path without this extension.
  function edgeContact(b,course){
    let nearest=null;
    for(const g of course.gaps||[]){if(!g.stage||g.layer!==b.layer||b.x<g.a-b.r||b.x>g.b+b.r)continue;
      for(const x of [g.a,g.b]){const f=curve(b.layer,x,course),dx=b.x-x,dy=b.y-f.y,d=Math.hypot(dx,dy);
        if(dy<0||d<1e-8||d>b.r+3||(nearest&&d>=nearest.distance))continue;
        const nx=dx/d,ny=dy/d;nearest={...f,nx,ny,tx:ny,ty:-nx,distance:d};
      }
    }return nearest;
  }
  function stageSpec(s){return s.course?.stages?.[s.handoffs]||(s.handoffs===0?s.course?.stage1:null);}
  function restoreCheckpoint(s,start){
    const cp=s.stages?.checkpoint,world=createCourse(s.course,s.settings);
    if(cp){
      world.entities=JSON.parse(JSON.stringify(cp.entities));world.active=cp.active;world.phase=cp.phase;world.handoffs=cp.handoffs;
      world.holes=cp.holes.map(saved=>{
        const h={...JSON.parse(JSON.stringify(saved)),occupant:world.entities[saved.occupantIndex],incoming:null};
        if(h.swaps){h.state='complete';h.elapsed=0;Object.assign(h.occupant,{x:h.x,y:h.y,vx:0,vy:0,pulse:0,angle:0,plugged:true});}
        return h;
      });
      for(const kind of ['pumpkin','rutabaga'])world[kind]=world.entities[cp[kind+'Index']]||world.entities.findLast(b=>b.kind===kind&&!b.plugged)||world.entities.findLast(b=>b.kind===kind);
      const spec=stageSpec(world),body=world.entities[cp.entityIndex];
      Object.assign(body,fruit(cp.active,spec.spawnX,spec.layer,false,s.course),{grounded:true});world[cp.active]=body;
      world.stages={completed:Array.from({length:cp.handoffs},(_,i)=>i+1),checkpoint:cp,failedAt:null};
    }else Object.assign(world.pumpkin,start);
    P.clearInput(world);if(cp){world.time=s.time;world.lastRoll=s.time;}
    const b=world[world.active];world.camera={x:b.x,y:b.y+70,vx:0,vy:0};return world;
  }
  function closingWorld(s){
    const course=s.course.finale;if(!course)return null;
    const spec=course.holes.at(-1),h=s.holes.at(-1),partner={...h.occupant,x:spec.x,y:spec.y};
    return {course,entities:[partner,s.pumpkin],holes:[{...h,x:spec.x,y:spec.y,occupant:partner,incoming:null}],
      pumpkin:s.pumpkin,rutabaga:partner,active:s.active,goal:s.goal,time:s.time,camera:s.camera};
  }
  function hole(id,x,y,direction,occupant,incomingKind,exitLayer) {
    return {id,x,y,direction,occupant,incomingKind,exitLayer,state:'waiting',swaps:0,elapsed:0,incoming:null};
  }
  function eligible(s,h,b) {
    if(h.state!=='waiting'||h.swaps||b.plugged||b.kind!==h.incomingKind||(h.entryLayer&&b.layer!==h.entryLayer)) return false;
    // Project into the oriented mouth: both a vertical approach and real circle
    // contact are needed. Pure side contact and the opposite side cannot fire.
    const dx=b.x-h.occupant.x,dy=b.y-h.occupant.y, gap=Math.hypot(dx,dy);
    const speed=(b.vy-h.occupant.vy)*h.direction;
    return Math.abs(dx)<=s.settings.world.tolerance && dy*-h.direction>=22 &&
      gap<=b.r+h.occupant.r+3 && speed>=(h.direction>0?s.settings.world.upward:.5);
  }
  function rejectContact(h,b) {
    if(h.state!=='waiting'||b.kind!==h.incomingKind||b.layer!==(h.entryLayer||(h.direction<0?'surface':'underground')))return;
    const dx=b.x-h.occupant.x,dy=b.y-h.occupant.y,distance=Math.hypot(dx,dy),radius=b.r+h.occupant.r;
    if(distance>=radius||distance<.001)return;
    const nx=dx/distance,ny=dy/distance,penetration=radius-distance;
    b.x+=nx*penetration;b.y+=ny*penetration;
    const approach=b.vx*nx+b.vy*ny;
    if(approach<0){b.vx-=nx*approach*1.1;b.vy-=ny*approach*1.1;}
    b.grounded=false; // A rejected touch settles again through ordinary gravity.
  }
  function start(s,h,b) {
    h.state='compressing'; h.elapsed=0; h.incoming=b; h.from={x:b.x,y:b.y};
    h.impact={vx:b.vx,vy:b.vy,speed:Math.hypot(b.vx,b.vy)};
    h.plugFrom={x:h.occupant.x,y:h.occupant.y}; b.grounded=false; b.pulse=1; h.occupant.pulse=1;
  }
  function advanceHole(s,h,dt) {
    if(h.state==='compressing') {
      h.elapsed+=dt; const t=clamp(h.elapsed/.075,0,1), easing=smooth(t);
      h.occupant.y=h.plugFrom.y+h.direction*(h.direction>0?16:7)*easing;
      h.incoming.x=h.from.x+(h.x-h.from.x)*easing*.55;
      h.incoming.y=h.from.y+(h.y-h.from.y)*easing*.55;
      if(t<1)return;
      const out=h.occupant, incoming=h.incoming, p=s.settings.handoff;
      const inherited=h.impact.speed*p.inherit;
      const speed=clamp(Math.max(s.settings.world.assist,inherited),0,p.cap);
      // Existing angle/cap/inherit knobs remain useful. Always clear the lip;
      // small horizontal inheritance lets the previous motion read through.
      const minimumNormal=h.direction>0?Math.min(speed,215):0;
      const tangentLimit=Math.min(speed*.6,Math.sqrt(Math.max(0,speed*speed-minimumNormal*minimumNormal)));
      const tangent=clamp(h.impact.vx*p.inherit*Math.cos(p.angle*Math.PI/180)*.6,-tangentLimit,tangentLimit);
      const normal=Math.sqrt(Math.max(0,speed*speed-tangent*tangent));
      out.vx=tangent; out.vy=h.direction*normal; out.layer=h.exitLayer;
      out.plugged=false; out.exiting=h.direction>0; out.grounded=false; out.safety=out.kind==='rutabaga'; out.pulse=1;
      incoming.plugged=true; incoming.vx=incoming.vy=0; incoming.grounded=false;
      h.settleFrom={x:incoming.x,y:incoming.y}; h.occupant=incoming; h.state='settling'; h.elapsed=0; h.swaps++;
      s.active=out.kind; s[out.kind]=out; s.handoffs++; s.phase=s.course?h.exitLayer:(h.direction<0?'underground':'return');
      if(s.course)out.exitX=h.x;
      s.bufferedAt=-10;s.boostUsed=true; // Same held input survives; old landing buffer does not.
      s.events.push({type:'handoff',kind:out.kind,strength:h.impact.speed});
    } else if(h.state==='settling') {
      h.elapsed+=dt; const t=clamp(h.elapsed/.18,0,1), q=smooth(t);
      h.occupant.x=h.settleFrom.x+(h.x-h.settleFrom.x)*q;
      h.occupant.y=h.settleFrom.y+(h.y-h.settleFrom.y)*q+Math.sin(t*Math.PI*2)*3*(1-t);
      h.occupant.pulse=(1-t)*.6;
      if(t===1){h.state='complete';h.incoming=null;h.occupant.angle=0;}
    }
  }
  function surfaceHeight(x, course) {
    if(course){
      const layers=course.surfaces;
      for(let i=0;i<layers.length;i++){
        const points=course.curves[layers[i]],last=points.at(-1);
        if(x<=last[0]||i===layers.length-1)return curve(layers[i],x,course).y;
        const next=course.curves[layers[i+1]][0];
        if(x<next[0]){
          const bridge=course.surfaceBridges?.find(b=>b.layer===layers[i]);
          if(bridge){const u=x-bridge.a,start=bridge.y+500*bridge.slope;
            if(u<=500)return bridge.y+u*bridge.slope;
            if(u<1100)return start+(bridge.plateau-start)*(u-500)/600;
            if(x>bridge.b-600)return bridge.plateau+(bridge.endY-bridge.plateau)*(x-bridge.b+600)/600;
            return bridge.plateau;
          }
          return last[1]+(next[1]-last[1])*(x-last[0])/(next[0]-last[0]);
        }
      }
    }
    if(x<=590)return curve('surface',x).y;
    if(x>=1140)return curve('return',x).y;
    return 480+(248-480)*(x-590)/550;
  }
  function roof(x, course, layer) {
    if(course){
      const cell=course.cellars.find(c=>c.layer===layer)||course.cellars.find(c=>x>=c.left&&x<=c.right)||course.cellars[0];
      let value=x<cell.roofStart?cell.roofHeight:Math.max(cell.exitRoof,cell.roofHeight-(x-cell.roofStart)*(cell.roofHeight-cell.exitRoof)/(cell.exitX-cell.roofStart));
      if(cell.entryRoof&&x<cell.entryRoof.until+600){const e=cell.entryRoof,at=Math.min(x,e.until),entry=at<e.roofStart?e.height:Math.max(e.exitRoof,e.height-(at-e.roofStart)*(e.height-e.exitRoof)/(e.exitX-e.roofStart));
        value=x<=e.until?entry:entry+(value-entry)*(x-e.until)/600;
      }
      return Math.min(surfaceHeight(x,course)-25,value);
    }
    return Math.min(surfaceHeight(x)-25,x<650?430:Math.max(215,430-(x-650)*215/590)); }
  function geometry(s,b) {
    const findContact=s.course?body=>contact(body,s.course):contact;
    return {contact:findContact,frame:x=>groundFrame(b.layer,x,s.course),constrain(body) {
      const points=(s.course?s.course.curves:CURVES)[body.layer],left=points[0][0]+body.r,right=points.at(-1)[0]-body.r;
      if(body.x<left||body.x>right){body.x=clamp(body.x,left,right);body.vx=body.x===left?Math.abs(body.vx)*.35:-Math.abs(body.vx)*.35;}
      const floor=findContact(body);
      if(floor.distance<body.r){body.x=floor.x+floor.nx*body.r;body.y=floor.y+floor.ny*body.r;}
      // The cellar roof and return lip use separate collision layers. The
      // return pumpkin passes through its mouth until its center clears it.
      if(body.layer==='underground'||s.course?.cellars.some(c=>c.layer===body.layer)) {
        const ceiling=roof(body.x,s.course,body.layer);
        if(body.y+body.r>ceiling && !s.holes.some(h=>Math.abs(body.x-h.x)<65&&((h.direction>0&&h.state==='waiting')||(h.direction<0&&h.swaps===1&&body.safety)))) {
          body.y=ceiling-body.r;body.vy=Math.min(body.vy,0)*.25;
        }
      }

    }};
  }
  function seatGoal(s,b,step,previous) {
    const goal=s.course.goal,state=s.goal;
    if(!goal||s.finished)return;
    const f=contact(b,s.course);
    // Use observed centre travel, not the tangent velocity parameter: normal
    // circle offset shortens travel inside a rounded cup in the existing model.
    const speed=Math.hypot(b.x-previous.x,b.y-previous.y)/step;state.travelSpeed=speed;
    const supported=b.kind==='pumpkin'&&b.layer===goal.layer&&b.grounded&&
      Math.abs(f.distance-b.r)<.05&&Math.abs(b.x-goal.x)<=goal.halfWidth&&
      f.y<=goal.bottom+goal.depth&&speed<=goal.speed;
    state.contact=supported?state.contact+step:0;
    if(state.contact+1e-10<goal.dwell)return;
    // Success latches the attained, supported pose. No attraction, position
    // correction or extra damping precedes it; the fruit can overshoot/return.
    s.finished=true;s.finishedAt=s.time;state.state='seated';state.seatedAt=s.time;
    state.pose={x:b.x,y:b.y,angle:b.angle};b.vx=b.vy=b.angular=0;
    s.target=s.axis=s.previousInput=0;s.bufferedAt=-10;s.boostUsed=true;
    s.events.push({type:'seat',kind:b.kind,strength:speed});
  }
  function update(s,dt) {
    s.events.length=0; s.accumulator+=clamp(Number(dt)||0,0,.05);
    while(s.accumulator+1e-10>=P.STEP) {
      const step=P.STEP;s.time+=step;
      if(s.goal?.state==='seated')s.target=s.axis=s.previousInput=0;
      s.axis+=(s.target-s.axis)*(1-Math.exp(-step*12));
      const active=s[s.active],previous={x:active.x,y:active.y};
      if(s.goal?.state!=='seated'&&!s.holes.some(h=>h.state==='compressing'&&h.incoming===active)) {
        const geo=geometry(s,active);
        // Upward launch must clear the occupied surface lip before normal floor
        // projection resumes. This does not alter the pumpkin's gravity/drive.
        // Only the extended course has an extra convex crest. Its surface can
        // support, never pull, a rolling fruit; gravity handles the brief flight.
        if((s.course?.crestStart && active.layer==='return' && active.x>=s.course.crestStart ||
          s.course?.stage1 && active.layer==='surface' && active.x>1220 ||
          s.course?.stages && active.kind==='pumpkin' && s.handoffs>0 &&
          (active.layer!=='finish'||active.x<s.course.goal.x-445)) && active.grounded){
          const f=geo.contact(active),v=active.vx*f.tx+active.vy*f.ty;
          if(f.curvature<0 && v*v*(-f.curvature)/Math.pow(1+f.slope*f.slope,1.5)>P.G*f.ny)active.grounded=false;
        }
        if(active.exiting && geo.contact(active).distance>=active.r) active.exiting=false;
        if(active.exiting && active.vy>0) {
          active.vx+=s.axis*s.settings.pumpkin.response/s.settings.pumpkin.mass*s.settings.pumpkin.air*step;
          active.vy-=P.G*step; active.x=clamp(active.x+active.vx*step,(s.course?active.exitX:1240)-4,(s.course?active.exitX:1240)+4);active.y+=active.vy*step;active.pulse*=Math.exp(-step*10);
        } else P.integrate(s,active,s.axis,step,geo);
        for(const h of s.holes){if(eligible(s,h,active)){start(s,h,active);break;}rejectContact(h,active);}
      }
      for(const h of s.holes)advanceHole(s,h,step);
      const b=s[s.active];
      if(s.course?.stage1){
        s.stages??={completed:[],checkpoint:null,failedAt:null};
        if(s.handoffs>s.stages.completed.length){
          const cleared=s.handoffs;s.stages.completed.push(cleared);
          s.stages.checkpoint={stage:cleared+1,at:s.time,active:s.active,layer:b.layer,
            entityIndex:s.entities.indexOf(b),pumpkinIndex:s.entities.indexOf(s.pumpkin),rutabagaIndex:s.entities.indexOf(s.rutabaga),handoffs:s.handoffs,phase:s.phase,
            body:JSON.parse(JSON.stringify(b)),entities:JSON.parse(JSON.stringify(s.entities)),
            holes:s.holes.map(h=>({...JSON.parse(JSON.stringify(h)),
              occupantIndex:s.entities.indexOf(h.occupant),incomingIndex:s.entities.indexOf(h.incoming)})),
            camera:{...s.camera},settings:JSON.parse(JSON.stringify(s.settings))};
          s.events.push({type:'stage-clear',stage:cleared,next:cleared+1});
        }
        const spec=stageSpec(s);
        if(spec&&b.y<spec.failY&&s.stages.failedAt===null){
          s.stages.failedAt=s.time;s.events.push({type:'fall',kind:b.kind,stage:s.handoffs+1});
          s.target=s.axis=s.previousInput=0;s.bufferedAt=-10;s.boostUsed=true;
        }
      }
      if(b.kind==='pumpkin'&&b.grounded&&Math.hypot(b.vx,b.vy)>85&&s.time-s.lastRoll>.65){s.events.push({type:'roll',kind:b.kind,strength:Math.hypot(b.vx,b.vy)});s.lastRoll=s.time;}
      // No reset at exchange and no view of the next plug before the player.
      for(const key of ['x','y']) {
        let target=b[key]+(key==='y'?70:0);const v='v'+key;
        if(s.course?.stage1&&key==='y'&&(s.handoffs===0||s.course.stages))target=Math.max(target,stageSpec(s)?.cameraFloor??s.course.stage1.cameraFloor);
        s.camera[v]+=((target-s.camera[key])*49-s.camera[v]*14)*step;
        s.camera[key]+=s.camera[v]*step;
      }
      if(s.course&&!s.finished&&s.handoffs===s.holes.length){
        if(s.course.goal)seatGoal(s,b,step,previous);
        else if(b.grounded&&b.x>=s.course.finishX){s.finished=true;s.finishedAt=s.time;}
        if(s.finished&&s.course.stages&&!s.stages.completed.includes(5)){s.stages.completed.push(5);s.finale=closingWorld(s);s.events.push({type:'stage-clear',stage:5,next:null});}
        if(s.finale)s.finale.time=s.time;
      }
      s.accumulator-=step;
    }
    return s.events;
  }
  return {PARAMETERS,CURVES,curve,groundFrame,hasGround,surfaceHeight,roof,contact,create,createCourse,stageSpec,restoreCheckpoint,update,eligible};
});
