# Soukis review and development instructions

- Preserve the Soukis product direction and existing Arabic, French, and English localization order.
- Treat Arabic as RTL and French/English as LTR. Any user-visible dynamic text must follow the active language.
- Preserve DZD/DA currency behavior and promotion tiers: Boost, Premium, Max, and Max Pro.
- Treat cart, authentication, orders, listings, and admin authorization as critical flows.
- Never trust client-side admin visibility as authorization; privileged operations must remain protected by the backend/database policies.
- Do not expose Supabase service-role keys or other secrets in frontend code.
- Escape user-controlled listing content before inserting it into HTML.
- For dynamic UI created after initial page load, ensure language changes and accessibility labels remain correct.
- Prefer small, focused changes. Do not redesign the existing Soukis UI unless required to fix a defect.
- Before recommending a merge, inspect the complete diff and validate affected flows; do not assume a successful review means the code is correct.
