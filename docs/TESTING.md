# Soukis testing notes

The current repository is a vanilla browser application backed by Supabase.

Manual testing should cover:

- Fresh session and signed-out state.
- Sign-in/sign-up and protected actions.
- Listing load failure and successful load.
- Language switching before and after listings load.
- Cart interactions after listings are dynamically rendered.
- Orders and ownership boundaries.
- Admin authorization and RLS boundaries.
- Mobile layout at narrow widths.

When a test cannot be executed in CI because it requires a real Supabase project, record that limitation explicitly rather than treating the path as tested.
