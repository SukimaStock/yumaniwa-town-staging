// v0.9 adds a delivery route. Chemistry, upkeep, retail and wholesale rates
// remain the v0.8.1 values; only repeat-work timing is new.
export const TRADE=Object.freeze({version:5,rules:'continuous-wholesale',proposalMinDeliveries:1,
 proposalCooldownMin:12,proposalCooldownRange:7,proposalBaseProbability:0.04,
 proposalDeliveryWeight:0.02,proposalMaxProbability:0.10});
