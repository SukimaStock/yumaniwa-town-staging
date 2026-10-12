import {validateCollection,validateSpecimen} from './engine/specimen.js?v=0.6.0';
export async function loadCollection(base=new URL('./',import.meta.url),request=fetch){
 const read=async path=>{const url=new URL(path,base);url.search='?v=0.6.0';const response=await request(url,{cache:'no-cache'});if(!response.ok)throw new Error('Collection file unavailable');return response.json();};
 const entries=validateCollection(await read('collection.json')),items=new Array(entries.length);let next=0;
 // Small concurrency; stable numbered order despite asynchronous requests.
 await Promise.all(Array.from({length:Math.min(4,entries.length)},async()=>{
  while(next<entries.length){const index=next++,entry=entries[index];try{
   const definition=validateSpecimen(await read(entry.file));if(definition.id!==entry.id)throw new Error('Specimen ID mismatch');items[index]={...entry,definition,index};
  }catch(error){items[index]={...entry,index,error:String(error.message)};}}
 }));
 return items;
}
