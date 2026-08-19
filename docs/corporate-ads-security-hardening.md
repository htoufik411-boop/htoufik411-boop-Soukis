# Corporate Ads security hardening checklist

This branch is intentionally isolated from `main`.

## Required before merge

- [ ] Build migrations successfully from an empty database.
- [ ] Ensure every migration filename/timestamp is unique and ordered.
- [ ] Ensure all SECURITY DEFINER functions use a fixed `search_path` and explicit authorization checks.
- [ ] Expose payment-creation RPCs only to the minimum required role.
- [ ] Derive payment amount from the approved request on the server.
- [ ] Bind provider checkout ID to exactly one payment/request before webhook processing.
- [ ] Do not use a request-only fallback when a provider checkout ID is supplied.
- [ ] Verify webhook signature over the raw request body.
- [ ] Verify event type, payment status, amount, currency, and environment.
- [ ] Make webhook processing idempotent for both event and checkout identifiers.
- [ ] Activate a campaign only inside the verified payment transaction.
- [ ] Run CI and payment-flow tests before merging.

## Current decision

Do not merge corporate-ad payment PRs into `main` until all checks above pass.
