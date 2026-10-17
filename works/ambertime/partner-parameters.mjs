// v6 isolates new partner preferences and observation semantics from v0.9.
import {TRADE} from './trade-parameters.mjs';
export const PARTNER_ORDERS=Object.freeze({...TRADE,version:6,rules:'partner-orders',proposalCooldownMin:18,proposalCooldownRange:13});
// Compressed game months. Wholesale unit rates remain below ordinary retail.
export const PARTNERS=Object.freeze([
 Object.freeze({name:'町の卸売商',age:12,price:13.2}),
 Object.freeze({name:'港の仕入れ店',age:18,price:14.98}),
 Object.freeze({name:'川沿いの酒販店',age:24,price:17})
]);

// One optional profile. All requirements use the ordinary tasting thresholds.
export const SPECIAL_ORDER=Object.freeze({partner:'港の仕入れ店',targetAge:24,unitPrice:26.10,
 minDeliveries:2,minBottles:60,minDuration:12,baseProbability:0.015,deliveryWeight:0.008,durationWeight:0.003,orderWeight:0.005,maxProbability:0.10,
 criteria:Object.freeze({roughnessMax:0.30,characterMin:0.80,woodMax:0.66}),
 taste:Object.freeze(['刺激がほどけた口当たり','熟した果実と厚い穀物の香り','強い木の渋みがない余韻'])});
