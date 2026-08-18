// Single public pricing source for the Soukis launch offers.
// Prices are in Algerian dinars (DZD). Durations are fixed validity periods,
// not recurring subscriptions. Server-side checkout must independently
// validate the selected plan and amount before accepting payment.
export const SOUKIS_PRICING = Object.freeze({
  currency: 'DZD',
  plans: Object.freeze({
    boost: Object.freeze({ price: 500, durationDays: 7 }),
    premium: Object.freeze({ price: 1000, durationDays: 15 }),
    max: Object.freeze({ price: 1500, durationDays: 21 }),
    max_pro: Object.freeze({ price: 2000, durationDays: 30 })
  })
});

export function getPlanPricing(planKey) {
  return SOUKIS_PRICING.plans[planKey] ?? null;
}
