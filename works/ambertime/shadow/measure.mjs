import {performance} from 'node:perf_hooks';
import * as M from '../../ambertime-strategy-lab/internal/model.mjs';
import * as D from '../partner-orders.mjs';
import {createShadow,advanceShadow,createObserver} from './adapter.mjs';
const result={kind:'synthetic scaling; not formal 100-year gameplay',node:process.version,rows:[]};
for(const n of [12,360,1200]){let m=M.createModel();const start=performance.now();for(let id=1;id<=n;id++){m=M.registerRelease(m,{id,productId:id,brandId:1,caskId:id,bottledMonth:id,age:12,price:10,bottles:1,profile:{roughness:.2}});m=M.applyTransaction(m,{seq:id,month:id,kind:'retail-sale',status:'completed',releaseId:id,count:1,revenueCents:1000});m=M.compactRelease(m,id);}const t=performance.now();const clone=structuredClone(m);result.rows.push({releases:n,totalUpdateMs:t-start,copyMs:performance.now()-t,bytes:Buffer.byteLength(JSON.stringify(clone)),heapUsed:process.memoryUsage().heapUsed});}
let s=D.newShopDialogueDistillery(42),shadow=createShadow(s),t=performance.now();for(let i=0;i<100;i++)shadow=advanceShadow(shadow,s,s);result.nativeNoChange100Ms=performance.now()-t;
const inactive=createObserver();t=performance.now();for(let i=0;i<100000;i++)inactive.observe(s,s);result.inactive100000Ms=performance.now()-t;
console.log(JSON.stringify(result,null,2));
