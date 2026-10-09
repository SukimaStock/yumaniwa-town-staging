(function(root) {
  'use strict';
  const W=root.FruitLabWorld, A=root.FruitLabArt;
  const surface = W.surfaceHeight;
  function line(c,left,right,height,step=6) {
    for(let x=left;x<right;x+=step)x===left?c.moveTo(x,height(x)):c.lineTo(x,height(x));
    c.lineTo(right,height(right));
  }
  function label(c,x,y,text) {c.save();c.translate(x,y);c.scale(1,-1);c.font='13px sans-serif';c.textAlign='center';c.fillStyle='#775c4590';c.fillText(text,0,0);c.restore();}
  root.FruitLabWorldDraw=function(c,s) {
    c.save();c.translate(500-s.camera.x,350-s.camera.y);
    // One continuous cutaway: collision heights also drive all visible lips.
    c.beginPath();line(c,-480,1790,surface);c.lineTo(1790,-650);c.lineTo(-480,-650);c.closePath();
    const earth=c.createLinearGradient(0,600,0,-200);earth.addColorStop(0,'#ebbb67');earth.addColorStop(.4,'#d7a26d');earth.addColorStop(1,'#bd9064');c.fillStyle=earth;c.fill();
    c.save();c.clip();
    for(const depth of [24,55,100,165,250,360,500]){
      c.beginPath();line(c,-480,1790,x=>surface(x)-depth+Math.sin(x*.011+depth)*5,10);
      c.strokeStyle='#fff1cb20';c.lineWidth=depth<100?10:3;c.stroke();
    }c.restore();
    // The open cellar is a real space below the same surface, not a scene swap.
    c.beginPath();line(c,410,1310,x=>W.curve('underground',x).y);
    c.lineTo(1310,W.roof(1310));for(let x=1310;x>=410;x-=6)c.lineTo(x,W.roof(x));c.closePath();
    const air=c.createLinearGradient(0,430,0,90);air.addColorStop(0,'#bfa78e');air.addColorStop(1,'#e3d2b2');c.fillStyle=air;c.fill();
    for(const [left,right,height] of [[-440,1790,surface],[410,1310,x=>W.curve('underground',x).y]]){
      c.beginPath();line(c,left,right,height);c.strokeStyle='#f5dc9b';c.lineWidth=5;c.stroke();c.strokeStyle='#8c653b60';c.lineWidth=1;c.stroke();
    }
    c.beginPath();line(c,410,1310,W.roof);c.strokeStyle='#95704e';c.lineWidth=4;c.stroke();
    for(const h of s.holes){
      const y=surface(h.x);c.fillStyle='#806142';c.fillRect(h.x-39,W.roof(h.x)-2,78,y-W.roof(h.x)+4);
      A.ellipse(c,h.x,y,40,6,'#725638');A.ellipse(c,h.x,W.roof(h.x),39,5,'#725638');
    }
    for(const b of s.entities){
      if(!b.plugged){const floor=W.curve(b.layer,b.x).y;const altitude=Math.max(0,b.y-b.r-floor);A.ellipse(c,b.x,floor+2,b.r,4,`rgba(80,54,27,${.18/(1+altitude/80)})`);}
      (b.kind==='pumpkin'?A.pumpkin:A.rutabaga)(c,b);
      if(b===s[s.active])A.ellipse(c,b.x,b.y+b.r+23,2.5,2.5,'#80654d90');
    }
    // Socket collars occlude the buried middle, leaving heads above and bottoms
    // below. Compression and seating use actual object positions throughout.
    for(const h of s.holes){
      const top=surface(h.x),bottom=W.roof(h.x);
      c.fillStyle=earth;c.fillRect(h.x-44,bottom+7,88,Math.max(0,top-bottom-14));
      c.beginPath();c.moveTo(h.x-44,top);c.lineTo(h.x-36,top-5);c.moveTo(h.x+36,top-5);c.lineTo(h.x+44,top);c.strokeStyle='#f9dda0';c.lineWidth=5;c.stroke();
      c.beginPath();c.moveTo(h.x-43,bottom);c.lineTo(h.x-32,bottom+6);c.moveTo(h.x+32,bottom+6);c.lineTo(h.x+43,bottom);c.strokeStyle='#987146';c.lineWidth=5;c.stroke();
    }
    label(c,-110,380,'地上 · ころころ');label(c,850,45,'地下 · ぽよん');label(c,1490,170,'地上 · ころころ');
    c.restore();
    c.save();c.fillStyle='#9c856348';c.font='15px sans-serif';c.textAlign='center';
    for(const [x,dir]of[[70,'←'],[930,'→']]){c.save();c.translate(x,550);c.scale(1,-1);c.fillText(dir,0,0);c.restore();}c.restore();
  };
})(typeof window!=='undefined'?window:globalThis);
