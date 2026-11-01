// Disposable visual plans for already committed retail sales. No game/save access.
// The host places each bottle ghost at `from`, using its own measured sprite size.
// Translation is relative to that origin; a snapped endpoint can differ from `to`
// by at most half a grid cell. Every interval holds, then jumps (no interpolation).
export function retailSalePlan(count,{from,to,grid=3}={}){
 if(!Number.isSafeInteger(count)||count<=0||!Number.isFinite(grid)||grid<=0||
    ![from?.x,from?.y,to?.x,to?.y].every(Number.isFinite))return [];
 const ghosts=Math.min(4,count),grouped=count>=4,base=Math.floor(count/ghosts),extra=count%ghosts;
 const snap=n=>{const value=Math.round(n/grid)*grid;return Object.is(value,-0)?0:value;};
 const dx=to.x-from.x,dy=to.y-from.y;
 if(!Number.isFinite(dx)||!Number.isFinite(dy))return [];
 return Array.from({length:ghosts},(_,i)=>({
  units:base+(i<extra?1:0),delay:i*(grouped?130:45),duration:210,
  frames:Array.from({length:9},(_,step)=>{
   const offset=step/8,travel=Math.min(1,step/7),scale=step<3?1:step<6?.75:.5;
   return {offset,transform:`translate(${snap(dx*travel)}px, ${snap(dy*travel)}px) scale(${scale})`,opacity:step===8?0:1,easing:'steps(1,end)'};
  })
 }));
}

// Allocate a shared visual budget across releases before positioning any sprite.
// `sales` contains {productId, units}; every group keeps its release's artwork.
// Invalid entries are ignored. Runtime/memory scale with release count, not sales.
export function retailSaleGroups(sales){
 if(!Array.isArray(sales))return [];
 const valid=sales.filter(sale=>sale&&Number.isSafeInteger(sale.units)&&sale.units>0&&
  (typeof sale.productId==='string'&&sale.productId.length>0||Number.isSafeInteger(sale.productId)&&sale.productId>=0));
 const total=valid.reduce((n,sale)=>n+sale.units,0);
 if(!Number.isSafeInteger(total)||total<=0)return [];
 let groups;
 if(total<=3)groups=valid.flatMap(({productId,units})=>Array.from({length:units},()=>({productId,units:1})));
 else{
  groups=valid.map(({productId,units})=>({productId,units}));
  const budget=Math.max(4,valid.length);
  while(groups.length<budget){
   let largest=-1;
   for(let i=0;i<groups.length;i++)if(groups[i].units>1&&(largest===-1||groups[i].units>groups[largest].units))largest=i;
   if(largest===-1)break;
   const group=groups[largest],first=Math.ceil(group.units/2);
   groups.splice(largest,1,{productId:group.productId,units:first},{productId:group.productId,units:group.units-first});
  }
 }
 return groups.map((group,i)=>({...group,delay:total<=3?i*45:groups.length===1?0:390*i/(groups.length-1),duration:210}));
}
