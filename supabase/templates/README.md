# Email templates

Cute, on-brand versions of the two emails Supabase sends. They're plain HTML
with tables and inline styles, so they look right in Gmail, Apple Mail and
Outlook.

| File | Supabase template | Subject |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `Your garden is almost ready ✦` |
| `reset-password.html` | Reset password | `Reset your Stardrop Logs password` |

## Setup

1. Deploy the site first. The images (`public/email/*.png`) load from
   `{{ .SiteURL }}`, so your **Site URL** in Supabase has to be the live domain.
2. Supabase dashboard > **Authentication > Emails > Templates**.
3. For each template above, set the subject, switch the body to **Source**,
   and paste the file contents.

Both links go to `/auth/confirm` with a `token_hash`, so they work even if the
email is opened on a different device from the one used to sign up.

## Notes

- The emails don't include the sign-up name on purpose. It comes straight
  from the sign-up request, so anyone could put whatever text they liked into
  an email sent to someone else's address.
- Supabase's built-in mailer is heavily rate limited and meant for testing.
  For a real launch, add your own SMTP provider under
  **Authentication > Emails > SMTP settings**.
- If you change Mia's pixels, run `npm run email:art` to redraw the images.
