export const SOUKIS_ENTITLEMENTS = Object.freeze({
  boost: Object.freeze({ durationDays: 7, listingBoost: 1, featured: false, priority: 1 }),
  premium: Object.freeze({ durationDays: 15, listingBoost: 3, featured: true, priority: 2 }),
  max: Object.freeze({ durationDays: 21, listingBoost: 5, featured: true, priority: 3 }),
  max_pro: Object.freeze({ durationDays: 30, listingBoost: 10, featured: true, priority: 4 })
});

export function isEntitlementActive(entitlement, now = new Date()) {
  if (!entitlement?.startsAt || !entitlement?.endsAt) return false;
  const start = new Date(entitlement.startsAt);
  const end = new Date(entitlement.endsAt);
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && now >= start && now < end;
}

export function getActiveEntitlement(entitlements = [], now = new Date()) {
  return entitlements
    .filter(item => isEntitlementActive(item, now))
    .sort((a, b) => (SOUKIS_ENTITLEMENTS[b.plan]?.priority ?? 0) - (SOUKIS_ENTITLEMENTS[a.plan]?.priority ?? 0))[0] ?? null;
}

export function getPlanDurationDays(plan) {
  return SOUKIS_ENTITLEMENTS[plan]?.durationDays ?? 0;
}
