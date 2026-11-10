// Static routing configuration, never an unlock or a contract.
export const WORLD_NETWORK=Object.freeze({version:1,rules:'world-trading-network/1'});
export const WORLD_CONTACTS=Object.freeze([
 {id:'trial-region-desk',partnerId:'trial-region-desk',regionId:'trial-region',nodeId:'near-wide',mapScale:'region',stage:4},
 {id:'national-specialist-desk',partnerId:'national-specialist-desk',regionId:'national-network',nodeId:'national-craft',mapScale:'prefecture',stage:5},
 {id:'overseas-import-desk',partnerId:'overseas-import-desk',regionId:'overseas-network',nodeId:'overseas-craft',mapScale:'country',stage:6}
].map(Object.freeze));
export const worldNetworkMode=s=>s?.worldNetwork?.version===WORLD_NETWORK.version&&s.worldNetwork.rules===WORLD_NETWORK.rules;
export const regionalContacts=s=>worldNetworkMode(s)?WORLD_CONTACTS:WORLD_CONTACTS.slice(0,1);
export const worldContact=id=>WORLD_CONTACTS.find(p=>p.id===id)??null;
export const contactForNode=(s,nodeId)=>regionalContacts(s).find(p=>p.nodeId===nodeId)??null;
