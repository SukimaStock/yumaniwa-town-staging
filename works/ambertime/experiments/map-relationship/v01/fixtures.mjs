// Explicit comparison fixtures, not the player's game or a claimed simulation run.
// Every displayed link has release → shipment → rumor → arrival provenance.
const release={id:'e1',type:'release',releaseId:1,month:0,sourceId:null};
const shipment={id:'e2',type:'shipment',releaseId:1,month:1,sourceId:'e1',from:'distillery',to:'town'};
const rumor={id:'e3',type:'rumor',releaseId:1,month:4,sourceId:'e2',from:'town',to:'bar',actor:'旅人'};
const arrival={id:'e4',type:'arrival',releaseId:1,mainReleaseId:1,month:7,sourceId:'e3',from:'town',to:'bar',channel:'chance'};
const baseEvents=[release,shipment,rumor];
const relation=shopId=>({shopId,startedMonth:0});
export const SCENARIOS=Object.freeze([
 {id:'before',name:'届く前',month:5,desc:'町の酒店にはウイスキーがあるけれど、バーに口コミが届いた記録はまだありません。',selected:'town-liquor',relations:[relation('town-liquor'),relation('bar')],events:baseEvents},
 {id:'after',name:'届いた後',month:7,desc:'町の酒店から紹介が生まれ、バーへ口コミが到達したという固定記録があります。',selected:'bar',relations:[relation('town-liquor'),relation('bar')],events:[...baseEvents,arrival]},
 {id:'missing',name:'まだ取扱前',month:7,desc:'口コミの到達記録はあっても、バーが正式取扱店でないときは関係をたどる対象にしません。',selected:'town-liquor',relations:[relation('town-liquor')],events:[...baseEvents,arrival]}
]);
export function fixtureState(scenario){
 return {labConnection:{version:1,town:{events:scenario.events.map(e=>({...e}))}},shop:{relations:scenario.relations.map(r=>({...r}))},core:{month:scenario.month}};
}
export const SHOP_NAMES=Object.freeze({retail:'蒸留所','town-liquor':'町の酒店',supermarket:'町のスーパー',bar:'路地裏のバー',department:'町のデパート'});
export const MAP_SHOPS=Object.freeze(['town-liquor','supermarket','bar']);
