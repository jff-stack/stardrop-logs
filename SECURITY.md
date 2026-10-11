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
  `isolation_check.sql` plays a friend of a friend, a stranger and a
  logged-out visitor, and also asserts that every table has row-level security
  forced and that no table or internal function is open to them. Re-run it
  after any database change.
- Sign-up, sign-in, password reset and "resend confirmation" look the same
  whether or not an email already has an account.
- Friends are opt-in and added by invite link only. A friend can only get what
  one database function returns (name, checked in today, best streak badge,
  and counts if chosen), never the logs themselves. Nudges are presets, with
  no free text.

### Known limits

Sign-up talks to Supabase Auth straight from the browser, so two things are
outside the app's control:

- Supabase answers a little faster when it has no email to send, which is the
  case for an address that already has a confirmed account.
- Someone calling the Auth API directly with an under-18 birthday gets an
  error for a new email and a normal answer for an existing one, because the
  age check only runs when a new user is created. The app never sends that
  request.

Closing either would mean moving sign-up behind our own server.

## If you run your own copy

- Only ever put the **publishable** key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  Never the secret or `service_role` key. `npm run check:supabase` refuses to
  run if it spots one.
- Keep `.env.local` out of git (it's already in `.gitignore`).
- Never add a table to Supabase **Realtime**, and never use the service-role
  key in the app or in Vercel: both skip the protections above.
- Run all the migrations, keep **Confirm email** on, and set a custom SMTP
  provider before real users sign up.
