/* Integer-minute rules; all motion uses seconds. No wall clock or saved state. */
(function(root){
  'use strict';
  const objects=Object.freeze([
    {id:'start',name:'いま',x:195,y:515,detail:'8:08',cost:0},
    {id:'coffee',name:'コーヒー',x:95,y:430,detail:'淹れる · 2分',cost:2},
    {id:'laundry',name:'洗濯もの',x:288,y:415,detail:'8:14 洗い上がり · 1分',cost:1},
    {id:'bag',name:'荷物',x:120,y:260,detail:'詰める · 2分',cost:2},
    {id:'door',name:'玄関',x:283,y:210,detail:'8:20までに出る',cost:0}
  ].map(Object.freeze));
  const byId=Object.fromEntries(objects.map(o=>[o.id,o]));
  const time=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
  const follow=(a,b,dt)=>a+(b-a)*(-Math.expm1(-24*dt));
  function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return {distance:Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy),t};}
  class Morning{
    constructor(){this.reset();}
    reset(){this.clock=488;this.ready=494;this.current='start';this.done=[];this.route=[];this.traces=[];this.mode='plan';this.surprise=false;this.timer=0;this.active=null;this.message='いま → 用事をなぞる → 玄関';this.history=[];}
    connect(id){
      if(this.mode!=='plan'||!byId[id])return false;
      const last=this.route.at(-1);
      if(last===id)return false;
      if(id===(this.route.at(-2)||this.current)&&last){this.route.pop();this.traces.pop();return true;}
      if(id==='start'||this.done.includes(id))return false;
      if(this.route.includes(id)||last==='door')return false;
      this.route.push(id);return true;
    }
    duration(id){return 1+byId[id].cost+Math.max(0,id==='laundry'?(this.surprise?this.ready:497)-(this.clock+1):0);}
    preview(){let clock=this.clock;return this.route.map(id=>{clock=Math.max(clock+1,id==='laundry'?this.ready:0)+byId[id].cost;return {id,clock};});}
    run(){if(this.mode!=='plan'||!this.route.length)return false;this.mode='run';this.timer=0;this.active=null;this.message='朝が動きだす';return true;}
    update(dt){
      if(this.mode!=='run')return;
      let left=Math.max(0,dt);
      while(left>0&&this.mode==='run'){
        if(!this.active){const id=this.route[0];if(!id){this.mode='plan';this.message='続きの朝をつなごう';break;}this.active={id,from:this.current,start:this.clock,duration:this.duration(id)};this.timer=0;this.message=id==='laundry'&&this.active.duration>2?`${time(this.surprise?this.ready:497)}まで、洗濯を待つ`:`${byId[id].name} · ${time(this.clock+this.active.duration)}`;}
        const span=this.active.duration*.45;
        const step=Math.min(left,span-this.timer);this.timer+=step;left-=step;
        if(this.timer+1e-9<span)break;
        const a=this.active;this.clock=a.start+a.duration;this.current=a.id;this.route.shift();this.traces.shift();this.done.push(a.id);this.history.push({...a,end:this.clock});this.active=null;this.timer=0;
        if(a.id==='door'){const missing=['coffee','laundry','bag'].filter(id=>!this.done.includes(id));this.mode=missing.length||this.clock>500?'failure':'success';this.message=missing.length?'まだ残っている用事がある':this.clock>500?'少し遅かった。別の順番なら？':'間に合った。ひとつの朝になった';break;}
        if(!this.surprise){this.surprise=true;this.ready=497;this.mode='change';this.route=[];this.traces=[];this.message=a.id==='laundry'?'洗濯は終了。洗い上がりが3分遅れていた':'洗濯が長引いた。洗い上がりは 8:17';break;}
        if(!this.route.length){this.mode='plan';this.message='続きの朝をつなごう';}
      }
    }
    replan(){if(this.mode!=='change')return;this.mode='plan';this.route=[];this.message='いまの物から、残りをつなぐ';}
    snapshot(){return {clock:this.clock,ready:this.ready,current:this.current,done:[...this.done],route:[...this.route],mode:this.mode,message:this.message,history:this.history.map(x=>({...x})),preview:this.preview()};}
  }
  const api={Morning,objects,byId,time,follow,distanceToSegment};
  if(typeof module!=='undefined')module.exports=api;else root.Morning02=api;
})(typeof window!=='undefined'?window:globalThis);
