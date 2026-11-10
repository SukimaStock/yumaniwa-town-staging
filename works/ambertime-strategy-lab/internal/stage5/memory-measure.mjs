import {buildMemory} from './memory.mjs';
import {memoryCatalog,bytes} from '../memory.mjs';
import {writeFileSync} from 'node:fs';
const results=[];
for(const months of [12,360,1200]){
 const source={core:{products:[]},brands:[{id:1,name:'合成比較酒'}],releases:Array.from({length:months},(_,i)=>({id:i+1,productId:i+1,caskId:i%4,brandId:1,bottledMonth:i,age:24,sourceGeneration:1+Math.floor(i/360),bottles:54,price:10,sold:54,revenue:540,profile:{age:24,type:'refill',character:.7,wood:.3,roughness:.25},recipe:{cut:.5},status:'sold-out'}))};
 const start=performance.now(),memory=buildMemory(source),buildMs=performance.now()-start;
 results.push({months,fullReleaseBytes:bytes(source.releases),priorCBytes:bytes(memoryCatalog(source)),stage5CBytes:bytes(memory),buildMs,identities:memory.catalog.length,traits:Object.keys(memory.traits).length,visuals:Object.keys(memory.visuals).length,details:Object.keys(memory.details).length});
}
writeFileSync(new URL('memory-results.json',import.meta.url),JSON.stringify({synthetic:true,scope:'same flavor, varying old IDs/month/cask/generation; one-time projection, not incremental runtime',results},null,2)+'\n');
console.log(JSON.stringify(results));
