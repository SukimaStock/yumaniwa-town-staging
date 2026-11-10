// Run with Node. Synthetic ordered transactions, not a 100-year native game/save.
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import * as M from '../../ambertime-strategy-lab/internal/model.mjs';
import {createReader,updateReader} from './readers.mjs';
import {compactRemark} from './read-contract.mjs';
import {shopRemark} from '../shop-remarks.mjs';
import {createReadSwitch} from './read-switch.mjs';
const shops=['town-liquor','supermarket','bar','department'];
const bytes=x=>Buffer.byteLength(JSON.stringify(x));
const timed=(fn,n)=>{const t=performance.now();for(let i=0;i<n;i++)fn();return (performance.now()-t)/n;};
const result={kind:'Synthetic 12/360/1200 monthly releases; NOT formal game longevity, save performance, browser or iPhone measurements',node:process.version,readRepetitions:2000,rows:[],copyCountMethod:'Static call-path count for this fixture: registerRelease + two applyTransaction + compactRelease each copy the whole core using JSON; updateReader structuredClones reader and closed eligibility. Not an instrumented allocation count.'};
for(const months of [12,360,1200]){
 let core=M.createModel(),reader=createReader(),native={core:{month:0},operations:[],brands:[{id:1}],releases:[],shop:{deliveries:[],relations:shops.map(shopId=>({shopId,brandId:1,startedMonth:0})),pendingOffers:[]},storeMarket:{startedMonth:0},department:{adoptions:[],interests:[]},alleyBar:{version:1,boundaryMonth:0}},readerMs=0,coreMs=0,maxCoreUpdateMs=0;
 reader=updateReader(reader,null,native);
 for(let month=1;month<=months;month++){
  const release={id:month,productId:month,brandId:1,caskId:month,bottledMonth:month,age:12,price:10,bottles:2,profile:{roughness:.2,wood:.4,character:.5}},shopId=shops[(month-1)%4];
  let t=performance.now();core=M.registerRelease(core,release);core=M.applyTransaction(core,{seq:month*2-1,month,kind:'paid-procurement',status:'completed',releaseId:month,shopId,count:1,revenueCents:1000});core=M.applyTransaction(core,{seq:month*2,month,kind:'retail-sale',status:'completed',releaseId:month,count:1,revenueCents:1000});core=M.compactRelease(core,month);const elapsed=performance.now()-t;coreMs+=elapsed;maxCoreUpdateMs=Math.max(maxCoreUpdateMs,elapsed);
  const next={...native,core:{month},operations:[...native.operations,{key:'synthetic',value:month}],releases:[...native.releases,release],shop:{...native.shop,deliveries:[...native.shop.deliveries,{id:month,month,shopId,brandId:1,releaseId:month,productId:month,count:1,revenue:10}]}};
  t=performance.now();reader=updateReader(reader,native,next);readerMs+=performance.now()-t;native=next;
 }
 const shadow={core,reader};
 for(const shopId of shops){const old=shopRemark(native,shopId),fresh=compactRemark(shadow,{shopId,brandId:1});assert.deepEqual(fresh,{key:old.key,text:old.text});}
 const nativeRead=()=>shops.map(shopId=>{const {key,text}=shopRemark(native,shopId);return {key,text};});
 const compactRead=()=>shops.map(shopId=>compactRemark(shadow,{shopId,brandId:1}));
 nativeRead();compactRead();
 const router=createReadSwitch({features:{remarks:true},snapshot:()=>({state:shadow,status:'active',last:native})});
 const inactive=createReadSwitch({snapshot:()=>{throw Error('disabled must not inspect snapshot');}}),baseline=shopRemark(native,'town-liquor');
 const routedRead=()=>shops.map(shopId=>router.read('remarks',native,shopRemark(native,shopId),{shopId}));
 result.rows.push({months,releases:months,receipts:months,coreBytes:bytes(core),readerBytes:bytes(reader),sourceReadFieldsBytes:bytes(native),coreUpdateTotalMs:coreMs,coreUpdateMaxMs:maxCoreUpdateMs,readerUpdateTotalMs:readerMs,oldFourRemarksMeanMs:timed(nativeRead,2000),compactFourRemarksMeanMs:timed(compactRead,2000),comparedFourRemarksMeanMs:timed(()=>assert.deepEqual(compactRead(),nativeRead()),2000),actualComparedRouterFourRemarksMeanMs:timed(routedRead,2000),disabledRouterSingleReadMeanMs:timed(()=>inactive.read('remarks',native,baseline,{shopId:'town-liquor'}),20000),routerEvidence:router.report().counters.remarks,coreWholeJsonCopies:months*4,readerWholeStructuredCopies:months+1,closedEligibilityCopies:months,formalHistoryReplays:0,remarkParity:true});
}
console.log(JSON.stringify(result,null,2));
