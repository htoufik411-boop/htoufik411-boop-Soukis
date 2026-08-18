# Soukis security baseline

This project is a browser-based marketplace. The frontend is not a trust boundary.

## Rules

1. Never put Supabase service-role credentials, private keys, or other privileged secrets in frontend JavaScript.
2. Authentication state in the browser must not be treated as proof of admin privileges.
3. Admin and seller ownership checks must be enforced by Supabase/Postgres Row Level Security and appropriate database policies.
4. Listing fields, image URLs, names, categories, and locations are user-controlled data and must be safely escaped when rendered as HTML.
5. Keep payment/order state transitions server-authoritative where applicable; do not trust client-supplied totals or ownership.
6. Keep dependencies and external scripts limited to trusted sources and review changes that affect them.

## Release gate

A security-sensitive change should be reviewed for both frontend behavior and the corresponding Supabase/RLS policy before merging.
