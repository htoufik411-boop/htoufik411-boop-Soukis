# Soukis QA checklist

## Critical flows
- [ ] Switch Arabic → French → English and verify RTL/LTR, language icon, labels, placeholders, filters, and dynamic product cards.
- [ ] Load listings and verify category/city labels and DZD pricing.
- [ ] Add a listing to the cart, change quantity, remove it, and verify the cart count and total.
- [ ] Verify authentication states before protected actions.
- [ ] Verify My Products and My Orders only expose the signed-in user's data.
- [ ] Verify the Admin entry point rejects non-admin users and backend policies protect privileged data.
- [ ] Verify expired promotions are not ranked or displayed as active.
- [ ] Verify Boost, Premium, Max, and Max Pro labels and ranking remain localized.

## Security
- [ ] No service-role or private Supabase credentials in client-side files.
- [ ] User-controlled listing fields are escaped before HTML insertion.
- [ ] Database RLS/policies enforce ownership and admin privileges; UI checks are not treated as authorization.

## Responsive/accessibility
- [ ] Test the header, language selector, cart, modals, filters, and product cards on narrow mobile widths.
- [ ] Icon-only controls have accessible labels.
- [ ] Modal close control and important status messages are keyboard/screen-reader accessible.

A merge should not be considered release-ready until the affected checks above have been validated.
