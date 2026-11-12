// Independent Node Lab, NOT imported by shipped runtime. No shared mutable output.
export function partitionClone(root){
 if(!root||Object.getPrototypeOf(root)!==Object.prototype)return structuredClone(root);
 const keys=Object.keys(root), parent=keys.map((_,i)=>i), owners=new Map();let rootCycle=false,unsupported=false;
 const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
 function visit(v,i){if(!v||typeof v!=='object')return;if(v===root){rootCycle=true;return;}if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype){unsupported=true;return;}if(owners.has(v)){parent[find(i)]=find(owners.get(v));return;}owners.set(v,i);for(const k of Object.keys(v))visit(v[k],i);}
 keys.forEach((k,i)=>visit(root[k],i));
 // Formal state is a plain JSON graph. Unsupported object graphs use native unchanged.
 if(rootCycle||unsupported||Reflect.ownKeys(root).length!==keys.length)return structuredClone(root);
 const groups=new Map();keys.forEach((k,i)=>{let g=groups.get(find(i));if(!g)groups.set(find(i),g={});g[k]=root[k];});
 const copied={};for(const g of groups.values())Object.assign(copied,structuredClone(g));
 return Object.fromEntries(keys.map(k=>[k,copied[k]]));
}
