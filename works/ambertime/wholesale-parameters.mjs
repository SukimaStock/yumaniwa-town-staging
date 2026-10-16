// v08 offers have their own RNG/replay. All v07 chemistry and retail fees remain.
export const WHOLESALE=Object.freeze({version:3,rules:'parallel-wholesale',cooldownMin:9,cooldownRange:7,
 maxProbability:0.22,baseProbability:0.02,volumeWeight:0.08,youngWeight:0.08,continuityWeight:0.04,
 partners:Object.freeze(['川沿いの酒販店','町の卸売商','港の仕入れ店']),
 terms:Object.freeze([{age:12,price:13.2},{age:18,price:14.4},{age:24,price:15.8},{age:30,price:17}]),
 priceFactors:Object.freeze([0.94,1,1.04])});
