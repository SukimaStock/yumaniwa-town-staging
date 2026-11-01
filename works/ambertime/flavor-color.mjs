// Display only. Never use these colors/classes in flavor, price, volume or replay.
export const GLASS_PALETTE=Object.freeze({fruit:'#c58fa4',grain:'#c3ad6b',smoke:'#8494b2',body:'#6ca6a0',mixed:'#a3a39c'});
const families=Object.keys(GLASS_PALETTE).filter(k=>k!=='mixed');
// Match the adopted model's existing expression/summary identity weighting.
// Parity with its public attachFlavor result is exhaustively audited, not taste math.
const identityWeights={fruit:1.05,grain:.92,smoke:1.18,body:.89};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const hex=channels=>'#'+channels.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('');
const tint=(color,toward,amount)=>hex(rgb(color).map((n,i)=>n+(toward[i]-n)*amount));
export function glassColor(profile,{variant='representative'}={}){
 if(!['representative','continuous','shaded'].includes(variant))throw Error('Unknown glass color variant');
 if(!profile||families.some(k=>!Number.isFinite(profile[k])||profile[k]<0||profile[k]>1))throw Error('A confirmed four-family profile is required');
 const ranked=families.map(key=>({key,value:profile[key]*identityWeights[key]})).sort((a,b)=>b.value-a.value);
 const [first,second]=ranked,margin=first.value?1-second.value/first.value:0;
 // Only a close first/second tie: no broad “everything else” bucket.
 const family=margin<.05?'mixed':first.key;
 const shade=profile[first.key]<.48?0:profile[first.key]<.69?1:2;
 let color=GLASS_PALETTE[family];
 if(variant==='continuous'){
  const sum=families.reduce((n,k)=>n+profile[k]**2,0);
  color=sum?hex([0,1,2].map(i=>families.reduce((n,k)=>n+rgb(GLASS_PALETTE[k])[i]*profile[k]**2,0)/sum)):GLASS_PALETTE.mixed;
 }else if(variant==='shaded')color=shade===0?tint(color,[240,230,200],.18):shade===2?tint(color,[39,40,55],.13):color;
 return {family,color,highlight:tint(color,[240,230,200],.28),shade,dominant:first.key,runnerUp:second.key,margin};
}
