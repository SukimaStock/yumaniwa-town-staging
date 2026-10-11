'use strict';
// A reproducible, ordinary drag route. Read only visible grain positions;
// never alter seed state or use the internal momentum/assist bookkeeping.
// Call at 30Hz regardless of render FPS, then apply {x,y} through the same
// Journey.drag input used by the scene's MOVING handler. These profiles are
// regression input recordings for different starts, not game autopilot logic.
const profiles=Object.freeze({
  canonical:Object.freeze([40,40,40,40,40,40,40]),
  prologue:Object.freeze([20,40,80,20,80,40,80]),
  pumped:Object.freeze([40,40,120,120,50,80,80]),
  observer:Object.freeze([120,80,80,40,100,60,100]),
  title:Object.freeze([30,40,80,30,100,60,40])
});
function create(profile='canonical') {
  const margins=Array.isArray(profile)?profile:profiles[profile];
  if(!margins)throw Error('Unknown momentum route profile: '+profile);
  let nextGesture=0, samples=0;
  return s=>{
    const xs=s.seeds.filter(p=>!p.lost&&!p.arrival).map(p=>p.x).sort((a,b)=>a-b);
    if(!xs.length)return {x:0,y:0};
    const median=xs[Math.floor(xs.length/2)],gap=s.geometry.GAP.find(g=>g.right>median),k=s.geometry.GAP.indexOf(gap);
    const up=!!gap&&median>gap.left-margins[k]&&median<gap.left&&samples>=nextGesture;
    if(up)nextGesture=samples+15; // A deliberate new stroke, at most twice a second.
    samples++;
    return {x:.38,y:up?-.28:0};
  };
}
module.exports={create,profiles};
