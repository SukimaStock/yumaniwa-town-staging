// v0.7 has its own replay contract; original profiles/saves stay unchanged.
import {PARAMETERS as CORE} from './parameters.mjs';
import {PARALLEL_PARAMETERS as OLD} from './parallel-parameters.mjs';
export const PARALLEL_PARAMETERS=Object.freeze({...OLD,version:2,startingCash:1600,baseMaintenance:4,perCaskMaintenance:8,marketMultiplier:0.45,minimumMarketValue:16,youngDemandMonths:6,youngDemand:4});
export const ECONOMY_PARAMETERS=Object.freeze({...CORE,startingCash:PARALLEL_PARAMETERS.startingCash,distillationCost:120,minPrice:16});
