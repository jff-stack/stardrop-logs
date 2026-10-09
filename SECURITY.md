# Security

Stardrop Logs stores health diary data, so security reports are very welcome.

## Reporting a problem

Please **don't open a public issue** for security problems. Use GitHub's
private reporting instead: **Security > Report a vulnerability** on this repo.

Include what you found, how to reproduce it, and what someone could do with
it. You'll get a reply within a few days, and credit in the fix if you'd like.

## Supported versions

Only the latest commit on `main` gets fixes.

## How the app is protected

The short version (the README has the full list):

- Every table has row-level security, enabled and forced. Users can only
  ever reach their own rows, and the app never uses a service-role key.
- The 18+ age gate and all input rules are enforced in Postgres, not just the UI.
- Strict security headers (CSP, HSTS, frame blocking), no open redirects, and
  CSV exports that can't run spreadsheet formulas.
- `supabase/tests/*.sql` impersonate users to prove nothing leaks between them.

## If you run your own copy

- Only ever put the **publishable** key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  Never the secret or `service_role` key. `npm run check:supabase` refuses to
  run if it spots one.
- Keep `.env.local` out of git (it's already in `.gitignore`).
- Run both migrations, keep **Confirm email** on, and set a custom SMTP
  provider before real users sign up.
