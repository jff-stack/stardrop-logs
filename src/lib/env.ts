// Public config, checked once. Only the publishable Supabase key belongs here;
// it's fine in the browser because RLS protects every table.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local (local) or your Vercel project settings (deployed).`,
    );
  }
  return value;
}

// Referenced literally so Next.js can inline them into client bundles.
export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
