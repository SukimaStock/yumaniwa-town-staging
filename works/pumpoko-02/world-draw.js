(function(root) {
  'use strict';
  const W=root.FruitLabWorld, A=root.FruitLabArt, M=root.PumpokoMaterial;
  function line(c,left,right,height,step=6) {
    for(let x=left;x<right;x+=step)x===left?c.moveTo(x,height(x)):c.lineTo(x,height(x));
    c.lineTo(right,height(right));
  }
  // Original drawTerrain: rind 7, then cream 3 inside it, at zoom 1.85.
  // 02 keeps its .8 camera: convert material units, never collision coordinates.
  const MATERIAL_UNITS=1.85/.8;
  function cut(c,a,b,floor,ceiling) {
    line(c,a,b,floor);c.lineTo(b,ceiling(b));
    for(let x=b;x>a;x-=6)c.lineTo(x,ceiling(x));
    c.lineTo(a,ceiling(a));c.closePath();
  }
  function solid(c,left,right,bottom,surface,spaces) {
    c.beginPath();line(c,left,right,surface);
    c.lineTo(right,bottom);c.lineTo(left,bottom);c.closePath();c.clip();
    // Complement intersections preserve the UNION of connected air spaces.
    for(const space of spaces){
      c.beginPath();c.rect(left-100,bottom-100,right-left+200,4000);
      cut(c,space.a,space.b,space.floor,space.ceiling);c.clip('evenodd');
    }
  }
  function air(c,left,right,top,surface,spaces) {
    c.beginPath();cut(c,left,right,surface,()=>top);
    // Same winding: nonzero clipping unions overlapping cellar / mouth paths.
    // Above ground AND the whole cellar remain visible, not just the socket box.
    for(const space of spaces)cut(c,space.a,space.b,space.floor,space.ceiling);
    c.clip();
  }
  function skin(c,left,right,bottom,surface,cavities,mouths,gaps) {
    c.save();solid(c,left,right,bottom,surface,[...cavities,...mouths,...gaps]);
    c.beginPath();line(c,left,right,surface);
    for(const space of [...cavities,...mouths,...gaps])cut(c,space.a,space.b,space.floor,space.ceiling);
    c.lineCap='round';c.lineJoin='round';
    // The clip puts the entire skin / pale band on the SOLID side of the same
    // contour. Floors, ceilings, vertical cut ends and socket walls share it.
    c.strokeStyle=M.cream;c.lineWidth=2*(7+3)*MATERIAL_UNITS;c.stroke();
    c.strokeStyle=M.rind;c.lineWidth=2*7*MATERIAL_UNITS;c.stroke();
    // In the existing thin roof (sometimes only 25 units), opposing skins
    // share one pale inner seam instead of overlapping into a green lump.
    // This remains inside the solid; neither ceiling nor surface is moved.
    c.beginPath();
    for(const space of cavities){
      let pen=false;
      for(let x=Math.max(left,space.a);x<=Math.min(right,space.b);x+=2){
        const top=surface(x),ceiling=space.ceiling(x);
        const slope=(surface(x+1)-surface(x-1))/2;
        const thickness=(top-ceiling)/Math.hypot(1,slope);
        if(thickness<17*MATERIAL_UNITS){
          const y=(top+ceiling)/2;
          if(pen)c.lineTo(x,y);else c.moveTo(x,y);pen=true;
        }else pen=false;
      }
    }
    c.lineCap='butt';c.strokeStyle=M.cream;c.lineWidth=3*MATERIAL_UNITS;c.stroke();
    c.restore();
  }
  root.PumpokoWorldDraw=function(c,s,view,nursery,opening) {
    const camera=view||{...s.camera,z:1},z=camera.z||1;
    const course=s.course,surface=x=>W.surfaceHeight(x,course)-(opening?.lift||0),roof=x=>W.roof(x,course);
    // Continue the soil to the viewport edges; collision bounds stay adopted.
    const left=camera.x-240/z,right=camera.x+240/z,bottom=Math.min(-650,camera.y-900/z);
    const cellars=course?course.cellars:[{left:410,right:1310,layer:'underground'}];
    if(!opening||opening.backgroundMix){
      c.save();c.globalAlpha*=opening?.backgroundMix??1;
      for(const [base,color,amplitude,rate] of [[160,M.far,17,.18],[100,M.near,12,.3]]){
        c.beginPath();c.moveTo(0,0);
        for(let x=0;x<=390;x+=6)c.lineTo(x,base+Math.sin((x+camera.x*rate)*.013)*amplitude);
        c.lineTo(390,0);c.closePath();c.fillStyle=color;c.fill();
      }c.restore();
    }
    if(opening&&opening.ground===0)return;
    c.save();c.globalAlpha*=opening?.ground??1;
    if(opening){const v=opening.screen;c.translate(v.x,v.y);c.rotate(v.angle);c.scale(v.sx,v.sy);c.translate(-v.camera.x,-v.camera.y);}
    else {c.translate(195,400);c.scale(z,z);c.translate(-camera.x,-camera.y);}
    const cavities=cellars.filter(cell=>cell.right>=left&&cell.left<=right).map(cell=>({
      // Keep a full material shoulder beyond the view; artificial clipping
      // ends stay offscreen while real cellar walls inside it are retained.
      a:Math.max(cell.left,left-46.25),b:Math.min(cell.right,right+46.25),
      floor:x=>W.curve(cell.layer,x,course).y,
      ceiling:x=>W.roof(x,course,cell.layer)
    }));
    const mouths=s.holes.filter(h=>h.x+44>=left&&h.x-44<=right).map(h=>({
      a:h.x-44,b:h.x+44,floor:roof,ceiling:surface
    }));
    const gaps=(course?.gaps||[]).filter(g=>g.b>=left&&g.a<=right).map(g=>({
      a:g.a,b:g.b,floor:()=>bottom-1,ceiling:()=>Math.max(1100,camera.y+1000/z)
    }));
    const spaces=[...cavities,...mouths,...gaps];
    // All material layers share actual openings; no fruit fill crosses a mouth.
    c.save();solid(c,left,right,bottom,surface,spaces);
    c.beginPath();line(c,left,right,surface);c.lineTo(right,bottom);c.lineTo(left,bottom);c.closePath();
    const earth=c.createLinearGradient(0,600,0,-200);earth.addColorStop(0,M.fleshLight);earth.addColorStop(.55,M.flesh);earth.addColorStop(1,M.fleshDeep);c.fillStyle=earth;c.fill();
    c.save();c.clip();
    // Soft overlapping shoulders; no grain or diagram-like stratum lines.
    c.beginPath();line(c,left,right,x=>surface(x)-12);
    c.strokeStyle='rgba(255,235,185,.065)';
    for(const width of [104,88,72,56,40,24]){c.lineWidth=width;c.stroke();}
    c.restore();
    c.restore();
    // The open cellar is a real space below the same surface, not a scene swap.
    for(const cell of cellars){
      if(course&&(cell.right<left||cell.left>right))continue;
      const a=course?Math.max(cell.left,left):cell.left,b=course?Math.min(cell.right,right):cell.right;
      const floor=x=>W.curve(cell.layer,x,course).y,ceiling=x=>W.roof(x,course,cell.layer);
      c.beginPath();line(c,a,b,floor);c.lineTo(b,ceiling(b));for(let x=b;x>=a;x-=6)c.lineTo(x,ceiling(x));c.closePath();
      const air=c.createLinearGradient(0,430,0,90);air.addColorStop(0,M.airDeep);air.addColorStop(1,M.air);c.fillStyle=air;c.fill();
    }
    // Bodies near a socket share its actual cutaway, with the EXIT side behind
    // the ENTRY side. Signed depth reverses the order for upward exchanges.
    const groups=new Map(s.holes.map(h=>[h,[]])),free=[];
    for(const b of opening?[]:s.entities){
      if(nursery?.opening&&b===s.entities[0])continue;
      const reach=2*b.r;
      if(b.x+reach<left||b.x-reach>right)continue;
      const hole=s.holes.find(h=>h.occupant===b||h.incoming===b||
        (Math.abs(b.x-h.x)<44+reach&&
         b.y-reach<Math.max(surface(h.x-44),surface(h.x+44))&&
         b.y+reach>Math.min(roof(h.x-44),roof(h.x+44))));
      if(hole)groups.get(hole).push(b);else free.push(b);
      if(!b.plugged&&W.hasGround(b.layer,b.x,course)){
        const floor=W.curve(b.layer,b.x,course).y,altitude=Math.max(0,b.y-b.r-floor);
        c.save();if(hole)solid(c,left,right,bottom,surface,spaces);
        A.ellipse(c,b.x,floor+2,b.r,4,`rgba(80,54,27,${.18/(1+altitude/80)})`);c.restore();
      }
    }
    if(!opening)A.nursery(c,nursery,s);
    const fruit=b=>{
      // A soft 0.48s compression/recovery pivots at the attained contact.
      // This is drawing only: it cannot change the circle, path or fruit art.
      const age=b===s.pumpkin&&s.goal?.state==='seated'?s.time-s.goal.seatedAt:-1;
      const q=age>=0&&age<.32?.085*Math.sin(Math.PI*age/.32)**2:
        age>=.32&&age<.48?-.012*Math.sin(Math.PI*(age-.32)/.16)**2:0;
      c.save();
      if(q){c.translate(b.x,b.y-b.r);c.scale(1+q*.6,1-q);c.translate(-b.x,-b.y+b.r);}
      (b.kind==='pumpkin'?A.pumpkin:A.rutabaga)(c,b);c.restore();
    };
    for(const b of free)fruit(b);
    for(const [h,bodies]of groups){
      if(!bodies.length)continue;
      bodies.sort((a,b)=>h.direction*(b.y-a.y));
      c.save();air(c,left,right,Math.max(1100,camera.y+1000/z),surface,spaces);
      for(const b of bodies)fruit(b);c.restore();
    }
    skin(c,left,right,bottom,surface,cavities,mouths,gaps);
    c.restore();

  };
})(typeof window!=='undefined'?window:globalThis);
