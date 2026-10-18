import {createComparisonProjection} from './comparison-model.mjs?v=0.18';
const projection=createComparisonProjection();
self.onmessage=({data})=>{
 const {requestId,state}=data;
 try{self.postMessage({requestId,comparison:projection.update(state)});}
 catch{self.postMessage({requestId,error:true});}
};
