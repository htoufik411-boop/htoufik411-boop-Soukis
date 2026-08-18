# Soukis release plan

## Phase 1 — repository safety
- Baseline CI checks are present.
- Review instructions and security expectations are documented.

## Phase 2 — functional QA
- Validate authentication and protected actions.
- Validate listings, filters, categories, and cities.
- Validate cart and orders end to end.
- Validate Arabic/French/English switching and RTL/LTR.
- Validate Boost/Premium/Max/Max Pro expiration and ranking.
- Validate admin authorization against Supabase RLS.

## Phase 3 — release review
- Review the complete PR diff.
- Run CI and resolve failures.
- Request Copilot code review and validate every actionable finding.
- Perform final human review.
- Merge only when the release gate is satisfied.
