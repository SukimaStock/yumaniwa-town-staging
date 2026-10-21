// Disposable ledger projection over existing facts. No replay, economic simulation or writes.
const copy=value=>value==null?null:structuredClone(value);
const present=value=>value!==undefined&&value!==null;
const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const firstNumber=(...values)=>values.map(number).find(present)??null;
const firstValue=(...values)=>values.find(present)??null;
const total=(rows,key,cents=false)=>{
 if(rows.some(row=>number(row[key])===null))return null;
 const value=rows.reduce((sum,row)=>sum+(cents?Math.round(row[key]*100):row[key]),0);
 return cents?value/100:value;
};

export function buildReleaseLedger(state,{facts}={}){
 const releases=state.releases??[],records=state.records??[],products=state.core?.products??[];
 const brands=copy(state.brands??[]),coverage={...copy(facts?.coverage??{}),complete:facts?.coverage?.complete===true,fromMonth:number(facts?.coverage?.fromMonth)};
 const recordByProduct=new Map(),releaseProducts=new Set();
 for(const record of records)if(present(record.productId))recordByProduct.set(record.productId,record);
 for(const release of releases)if(present(release.productId))releaseProducts.add(release.productId);

 function entry(source,kind,index){
  const productId=source.productId??null,record=kind==='release'&&present(productId)?recordByProduct.get(productId)??null:kind==='legacy'?source:null;
  const product=present(productId)?products.find(item=>item.id===productId):null;
  const receipt=present(productId)?facts?.products?.find(item=>item.productId===productId):null;
  const caskId=firstValue(source.caskId,record?.caskId),fill=present(caskId)?facts?.casks?.find(item=>item.caskId===caskId):null;
  const brandId=firstValue(source.brandId,record?.brandId),brand=brands.find(item=>item.id===brandId);
  const wholesale=kind==='legacy'&&['wholesale','special-order'].includes(source.channel);
  const date=firstNumber(source.bottledMonth,record?.bottledMonth);
  // A release from the origin month may already predate the observed operation prefix.
  const covered=coverage.complete||receipt?.complete===true||(date!==null&&coverage.fromMonth!==null&&date>coverage.fromMonth);
  const mirror={count:firstNumber(source.delivered,record?.delivered),revenue:firstNumber(source.deliveryRevenue,record?.deliveryRevenue)};
  let deliveries,deliveryComplete=false;
  if(present(productId)&&Array.isArray(state.shop?.deliveries)){
   const rows=state.shop.deliveries.filter(item=>item.productId===productId);
   if(rows.length){
    deliveries={count:total(rows,'count'),revenue:total(rows,'revenue',true)};
    deliveryComplete=deliveries.count!==null&&deliveries.revenue!==null&&(covered||mirror.count===deliveries.count&&mirror.revenue===deliveries.revenue)&&
     (mirror.count===null||mirror.count===deliveries.count)&&(mirror.revenue===null||mirror.revenue===deliveries.revenue);
   }else{
    const hasMirror=mirror.count!==null||mirror.revenue!==null;
    deliveries=hasMirror?mirror:covered?{count:0,revenue:0}:mirror;
    deliveryComplete=hasMirror?mirror.count!==null&&mirror.revenue!==null:covered;
   }
  }else{deliveries=mirror;deliveryComplete=mirror.count!==null&&mirror.revenue!==null;}
  // Retail mirrors already exclude shop deliveries. Never add the product or record mirror.
  const retail=wholesale?{count:null,revenue:null}:{count:firstNumber(source.sold,record?.sold),revenue:firstNumber(source.revenue,record?.revenue)};
  const bottledCount=firstNumber(source.bottles,record?.bottles),listed=firstValue(product?state.productsById?.[product.id]?.listed:null,receipt?.listed,source.listed);
  let stock=firstNumber(product?.stock,receipt?.stock);
  if(stock===null&&source.status==='sold-out')stock=0;
  if(stock===null&&covered&&deliveryComplete&&bottledCount!==null&&retail.count!==null&&deliveries.count!==null){
   const remaining=bottledCount-retail.count-deliveries.count;
   if(remaining>=0)stock=remaining;
  }
  return {
   key:kind==='release'?`release:${source.id??'index:'+index}`:`legacy:${productId??'index:'+index}`,
   kind,channel:wholesale?'wholesale':'retail',brandId,releaseId:kind==='release'?source.id??null:source.releaseId??null,productId,caskId,
   batchId:firstValue(source.batchId,record?.batchId,fill?.batchId),date,bottledMonth:date,
   name:firstValue(brand?.name,record?.name,source.name,source.flavorName),type:firstValue(source.type,record?.type,product?.type),
   age:firstNumber(source.age,record?.age,product?.age),profile:copy(firstValue(source.profile,record?.profile)),cut:firstNumber(source.cut,record?.cut,product?.cut),
   bottles:bottledCount,stock,price:wholesale?firstNumber(source.unitPrice,product?.price,receipt?.currentPrice,source.price):firstNumber(product?.price,receipt?.currentPrice,source.price,record?.unitPrice),
   status:wholesale?'wholesale':stock===0?'sold-out':listed===true?'selling':listed===false?'stored':null,listed,
   retail,deliveries,deliveryComplete,wholesale:wholesale?{count:number(source.sold),revenue:number(source.revenue),partner:source.partner??null}:null,
   stopAt:number(fill?.stopAt),record:copy(record)
  };
 }

 const entries=releases.map((release,index)=>entry(release,'release',index));
 records.forEach((record,index)=>{
  if(present(record.productId)&&(releaseProducts.has(record.productId)||recordByProduct.get(record.productId)!==record))return;
  entries.push(entry(record,'legacy',index));
 });
 return {brands,entries,coverage};
}
