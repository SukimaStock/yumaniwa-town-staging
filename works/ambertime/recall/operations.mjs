// Observe completed public model calls, never its nested temporary operations.
// The native model remains the authority for append-only operation history.
const isGame=value=>value?.core&&Number.isInteger(value.seed)&&Array.isArray(value.operations);
const require=value=>{if(!value)throw Error('回想の正式操作境界を確認できません。');};
const historicalProjections=new Set(['preAlleyBarState','preMarketRulesState','preStoreMarketState','preStage4State']);

export function createObservedModel(native,onTransition){
 require(native&&typeof onTransition==='function');
 return Object.freeze(Object.fromEntries(Object.entries(native).map(([name,value])=>[name,
  typeof value!=='function'||historicalProjections.has(name)?value:function(...args){
   const before=args[0],after=value.apply(native,args);
   // Creation, restore, projections and ordinary queries are not live operations.
   if(!isGame(before)||!isGame(after))return after;
   const length=before.operations.length,count=after.operations.length-length;
   require(after.seed===before.seed&&after.version===before.version&&count>=0&&count<=1);
   if(count===0)return after; // Includes partial extraction and ending a tasting.
   // Check the append boundary without serializing the growing full history.
   // This is a guard against miswiring; it does not replace the formal reader.
   if(length)require(JSON.stringify(before.operations[length-1])===JSON.stringify(after.operations[length-1]));
   const operation=after.operations[length];require(operation&&typeof operation.key==='string');
   onTransition({index:length,operation,before,after});
   return after;
  }
 ])));
}
