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
  function curve(layer, x) {
    const points = CURVES[layer]; x = clamp(x, points[0][0], points.at(-1)[0]);
    const i = Math.max(0, points.findIndex((p, i) => i && x <= p[0]) - 1), a = points[i], b = points[i + 1];
    const length = b[0] - a[0], t = (x - a[0]) / length;
    const y = (2*t*t*t-3*t*t+1)*a[1] + (t*t*t-2*t*t+t)*length*a[2] + (-2*t*t*t+3*t*t)*b[1] + (t*t*t-t*t)*length*b[2];
    const slope = ((6*t*t-6*t)*a[1]+(3*t*t-4*t+1)*length*a[2]+(-6*t*t+6*t)*b[1]+(3*t*t-2*t)*length*b[2])/length;
    const curvature = ((12*t-6)*a[1]+(6*t-4)*length*a[2]+(-12*t+6)*b[1]+(6*t-2)*length*b[2])/(length*length);
    const k = Math.hypot(1, slope);
    return { x, y, slope, curvature, tx: 1/k, ty: slope/k, nx: -slope/k, ny: 1/k };
  }
  function contact(b) {
    let x = b.x;
    for (let i = 0; i < 8; i++) {
      const f = curve(b.layer, x);
      x -= clamp(((f.x-b.x)+(f.y-b.y)*f.slope)/Math.max(.4,1+f.slope*f.slope+(f.y-b.y)*f.curvature),-45,45);
    }
    const f = curve(b.layer, x); f.distance = (b.x-f.x)*f.nx+(b.y-f.y)*f.ny; return f;
  }
  function fruit(kind, x, layer, plug = false) {
    const b = P.body(kind, 0); b.layer = layer; b.plugged = plug;
    const f = curve(layer, x); b.x = f.x + f.nx*b.r; b.y = f.y+f.ny*b.r;
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
  function hole(id,x,y,direction,occupant,incomingKind,exitLayer) {
    return {id,x,y,direction,occupant,incomingKind,exitLayer,state:'waiting',swaps:0,elapsed:0,incoming:null};
  }
  function eligible(s,h,b) {
    if(h.state!=='waiting'||h.swaps||b.plugged||b.kind!==h.incomingKind) return false;
    // Project into the oriented mouth: both a vertical approach and real circle
    // contact are needed. Pure side contact and the opposite side cannot fire.
    const dx=b.x-h.occupant.x,dy=b.y-h.occupant.y, gap=Math.hypot(dx,dy);
    const speed=(b.vy-h.occupant.vy)*h.direction;
    return Math.abs(dx)<=s.settings.world.tolerance && dy*-h.direction>=22 &&
      gap<=b.r+h.occupant.r+3 && speed>=(h.direction>0?s.settings.world.upward:.5);
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
      s.active=out.kind; s[out.kind]=out; s.handoffs++; s.phase=h.direction<0?'underground':'return';
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
  function surfaceHeight(x) {
    if(x<=590)return curve('surface',x).y;
    if(x>=1140)return curve('return',x).y;
    return 480+(248-480)*(x-590)/550;
  }
  function roof(x) { return Math.min(surfaceHeight(x)-25,x<650?430:Math.max(215,430-(x-650)*215/590)); }
  function geometry(s,b) {
    return {contact,frame:x=>curve(b.layer,x),constrain(body) {
      const points=CURVES[body.layer],left=points[0][0]+body.r,right=points.at(-1)[0]-body.r;
      if(body.x<left||body.x>right){body.x=clamp(body.x,left,right);body.vx=body.x===left?Math.abs(body.vx)*.35:-Math.abs(body.vx)*.35;}
      const floor=contact(body);
      if(floor.distance<body.r){body.x=floor.x+floor.nx*body.r;body.y=floor.y+floor.ny*body.r;}
      // The cellar roof and return lip use separate collision layers. The
      // return pumpkin passes through its mouth until its center clears it.
      if(body.layer==='underground') {
        const ceiling=roof(body.x);
        if(body.y+body.r>ceiling && !s.holes.some(h=>Math.abs(body.x-h.x)<65)) {
          body.y=ceiling-body.r;body.vy=Math.min(body.vy,0)*.25;
        }
      }

    }};
  }
  function update(s,dt) {
    s.events.length=0; s.accumulator+=clamp(Number(dt)||0,0,.05);
    while(s.accumulator+1e-10>=P.STEP) {
      const step=P.STEP;s.time+=step;s.axis+=(s.target-s.axis)*(1-Math.exp(-step*12));
      const active=s[s.active];
      if(!s.holes.some(h=>h.state==='compressing'&&h.incoming===active)) {
        const geo=geometry(s,active);
        // Upward launch must clear the occupied surface lip before normal floor
        // projection resumes. This does not alter the pumpkin's gravity/drive.
        if(active.exiting && contact(active).distance>=active.r) active.exiting=false;
        if(active.exiting && active.vy>0) {
          active.vx+=s.axis*s.settings.pumpkin.response/s.settings.pumpkin.mass*s.settings.pumpkin.air*step;
          active.vy-=P.G*step; active.x=clamp(active.x+active.vx*step,1236,1244);active.y+=active.vy*step;active.pulse*=Math.exp(-step*10);
        } else P.integrate(s,active,s.axis,step,geo);
        for(const h of s.holes)if(eligible(s,h,active)){start(s,h,active);break;}
      }
      for(const h of s.holes)advanceHole(s,h,step);
      const b=s[s.active];
      if(b.kind==='pumpkin'&&b.grounded&&Math.hypot(b.vx,b.vy)>85&&s.time-s.lastRoll>.65){s.events.push({type:'roll',kind:b.kind,strength:Math.hypot(b.vx,b.vy)});s.lastRoll=s.time;}
      // No reset at exchange and no view of the next plug before the player.
      for(const key of ['x','y']) {
        const target=b[key]+(key==='y'?70:0),v='v'+key;
        s.camera[v]+=((target-s.camera[key])*49-s.camera[v]*14)*step;
        s.camera[key]+=s.camera[v]*step;
      }
      s.accumulator-=step;
    }
    return s.events;
  }
  return {PARAMETERS,CURVES,curve,surfaceHeight,roof,contact,create,update,eligible};
});
