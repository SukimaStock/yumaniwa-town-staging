(function(root) {
  'use strict';
  const W=root.FruitLabWorld, A=root.FruitLabArt;
  function line(c,left,right,height,step=6) {
    for(let x=left;x<right;x+=step)x===left?c.moveTo(x,height(x)):c.lineTo(x,height(x));
    c.lineTo(right,height(right));
  }
  function label(c,x,y,text) {c.save();c.translate(x,y);c.scale(1,-1);c.font='13px sans-serif';c.textAlign='center';c.fillStyle='#775c4590';c.fillText(text,0,0);c.restore();}
  root.FruitLabWorldDraw=function(c,s) {
    const course=s.course,surface=x=>W.surfaceHeight(x,course),roof=x=>W.roof(x,course);
    const end=course?course.curves[course.surfaces.at(-1)].at(-1)[0]+40:1790;
    const left=course?Math.max(-480,s.camera.x-620):-480,right=course?Math.min(end,s.camera.x+620):1790;
    const cellars=course?course.cellars:[{left:410,right:1310,layer:'underground'}];
    c.save();c.translate(500-s.camera.x,350-s.camera.y);
    // One continuous cutaway: collision heights also drive all visible lips.
    c.beginPath();line(c,left,right,surface);c.lineTo(right,-650);c.lineTo(left,-650);c.closePath();
    const earth=c.createLinearGradient(0,600,0,-200);earth.addColorStop(0,'#ebbb67');earth.addColorStop(.4,'#d7a26d');earth.addColorStop(1,'#bd9064');c.fillStyle=earth;c.fill();
    c.save();c.clip();
    for(const depth of [24,55,100,165,250,360,500]){
      c.beginPath();line(c,left,right,x=>surface(x)-depth+Math.sin(x*.011+depth)*5,10);
      c.strokeStyle='#fff1cb20';c.lineWidth=depth<100?10:3;c.stroke();
    }c.restore();
    // The open cellar is a real space below the same surface, not a scene swap.
    for(const cell of cellars){
      if(course&&(cell.right<left||cell.left>right))continue;
      const a=course?Math.max(cell.left,left):cell.left,b=course?Math.min(cell.right,right):cell.right;
      const floor=x=>W.curve(cell.layer,x,course).y,ceiling=x=>W.roof(x,course,cell.layer);
      c.beginPath();line(c,a,b,floor);c.lineTo(b,ceiling(b));for(let x=b;x>=a;x-=6)c.lineTo(x,ceiling(x));c.closePath();
      const air=c.createLinearGradient(0,430,0,90);air.addColorStop(0,'#bfa78e');air.addColorStop(1,'#e3d2b2');c.fillStyle=air;c.fill();
    }
    for(const [a,b,height]of[[course?left:-440,right,surface],...cellars.filter(cell=>!course||cell.right>=left&&cell.left<=right).map(cell=>[course?Math.max(cell.left,left):cell.left,course?Math.min(cell.right,right):cell.right,x=>W.curve(cell.layer,x,course).y])]){
      c.beginPath();line(c,a,b,height);c.strokeStyle='#f5dc9b';c.lineWidth=5;c.stroke();c.strokeStyle='#8c653b60';c.lineWidth=1;c.stroke();
    }
    for(const cell of cellars){
      if(course&&(cell.right<left||cell.left>right))continue;
      c.beginPath();line(c,course?Math.max(cell.left,left):cell.left,course?Math.min(cell.right,right):cell.right,x=>W.roof(x,course,cell.layer));c.strokeStyle='#95704e';c.lineWidth=4;c.stroke();
    }
    for(const h of s.holes){
      const y=surface(h.x);c.fillStyle='#806142';c.fillRect(h.x-39,roof(h.x)-2,78,y-roof(h.x)+4);
      A.ellipse(c,h.x,y,40,6,'#725638');A.ellipse(c,h.x,roof(h.x),39,5,'#725638');
    }
    for(const b of s.entities){
      if(!b.plugged){const floor=W.curve(b.layer,b.x,course).y;const altitude=Math.max(0,b.y-b.r-floor);A.ellipse(c,b.x,floor+2,b.r,4,`rgba(80,54,27,${.18/(1+altitude/80)})`);}
      (b.kind==='pumpkin'?A.pumpkin:A.rutabaga)(c,b);
      if(b===s[s.active])A.ellipse(c,b.x,b.y+b.r+23,2.5,2.5,'#80654d90');
    }
    // Socket collars occlude the buried middle, leaving heads above and bottoms
    // below. Compression and seating use actual object positions throughout.
    for(const h of s.holes){
      const top=surface(h.x),bottom=roof(h.x);
      c.fillStyle=earth;c.fillRect(h.x-44,bottom+7,88,Math.max(0,top-bottom-14));
      c.beginPath();c.moveTo(h.x-44,top);c.lineTo(h.x-36,top-5);c.moveTo(h.x+36,top-5);c.lineTo(h.x+44,top);c.strokeStyle='#f9dda0';c.lineWidth=5;c.stroke();
      c.beginPath();c.moveTo(h.x-43,bottom);c.lineTo(h.x-32,bottom+6);c.moveTo(h.x+32,bottom+6);c.lineTo(h.x+43,bottom);c.strokeStyle='#987146';c.lineWidth=5;c.stroke();
    }
    const labels=course?course.labels:[[-110,380,'地上 · ころころ'],[850,45,'地下 · ぽよん'],[1490,170,'地上 · ころころ']];
    for(const [x,y,text]of labels)label(c,x,y,text);
    c.restore();
    c.save();c.fillStyle='#9c856348';c.font='15px sans-serif';c.textAlign='center';
    for(const [x,dir]of[[70,'←'],[930,'→']]){c.save();c.translate(x,550);c.scale(1,-1);c.fillText(dir,0,0);c.restore();}c.restore();
  };
})(typeof window!=='undefined'?window:globalThis);
