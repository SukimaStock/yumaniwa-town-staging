// Game tuning only. Months are compressed; these are not a real-world whisky model.
export const PARAMETERS = Object.freeze({
  modelVersion: 1, startingCash: 4000, startYear: 2026,
  distillationCost: 260, baseLitres: 24, extraLitres: 16,
  maxCasks: 4, maxProducts: 8, bottleLitres: 0.7, bottlingCost: 3,
  baseUpkeep: 22, caskUpkeep: 5, spiritUpkeep: 3,
  monthlyCustomers: 24, maxPrice: 160, minPrice: 2,
  aromaBloomMonths: 22, maturePremium: 50, youngHarshnessPenalty: 50, newmakeHarshnessPenalty: 20, priceElasticity: 2.8,
  casks: Object.freeze({
    bourbon: Object.freeze({ name: 'Bourbon Cask', short: 'バーボン樽', cost: 160, soften: 0.057, wood: 0.019, evaporation: 0.0026 }),
    refill: Object.freeze({ name: 'Refill Bourbon Cask', short: 'リフィル樽', cost: 100, soften: 0.036, wood: 0.009, evaporation: 0.0019 })
  })
});
