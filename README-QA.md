# Soukis release gate

The `fix/final-ui-robustness` branch is the pre-release QA branch.

Use `QA-CHECKLIST.md` for manual flow validation and `.github/workflows/qa.yml` for baseline repository checks. The project should not be considered release-ready solely because CI passes: Supabase RLS, authentication, cart/order behavior, multilingual rendering, and admin authorization still require functional validation.
