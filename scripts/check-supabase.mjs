// Quick check that .env.local points at a working Supabase project and that
// all the migrations have been run. Never prints your keys.
//
//   npm run check:supabase
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const ok = (msg) => console.log(`  ✔ ${msg}`);
const fail = (msg) => {
  console.error(`  ✘ ${msg}`);
  process.exitCode = 1;
};

console.log("Stardrop Logs: Supabase check\n");

if (!url || !key) {
  fail("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in .env.local");
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  fail(`URL doesn't look like a Supabase project URL (expected https://<ref>.supabase.co)`);
}
if (/service_role|^sb_secret_/.test(key) || key.includes("c2VydmljZV9yb2xl")) {
  fail("That looks like a SECRET/service_role key. Use the publishable (anon) key instead!");
  process.exit(1);
}

const base = url.replace(/\/$/, "");
// The apikey header alone works for both legacy anon JWTs and new sb_publishable_ keys.
const headers = { apikey: key };

// 1) Auth service reachable with this key?
try {
  const res = await fetch(`${base}/auth/v1/settings`, { headers });
  if (res.ok) {
    const s = await res.json();
    ok("Auth service reachable, key accepted");
    if (s.external?.email) ok("Email sign-up enabled");
    else fail("Email provider is disabled (Auth > Providers > Email)");
    const social = Object.entries(s.external ?? {})
      .filter(([k, v]) => v === true && !["email", "phone", "anonymous_users"].includes(k))
      .map(([k]) => k);
    if (social.length) fail(`Social providers enabled (${social.join(", ")}): they skip the DOB age gate`);
  } else {
    fail(`Auth responded ${res.status}, check the URL/key`);
  }
} catch (e) {
  fail(`Could not reach ${base}: ${e.message}`);
}

// 2) Migration applied? min_age_years() is public and returns 18.
try {
  const res = await fetch(`${base}/rest/v1/rpc/min_age_years`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
  });
  if (res.ok && (await res.json()) === 18) ok("Migration 0001_init.sql applied (age gate = 18)");
  else fail("min_age_years() not found, run supabase/migrations/0001_init.sql in the SQL Editor");
} catch (e) {
  fail(`RPC check failed: ${e.message}`);
}

// 3) RLS sanity: logged-out requests must NOT be able to read logs.
try {
  const res = await fetch(`${base}/rest/v1/poop_logs?select=id&limit=1`, { headers });
  if (res.status === 401 || res.status === 403) ok("Logged-out access to poop_logs is blocked");
  else if (res.ok && (await res.json()).length === 0) ok("Logged-out access to poop_logs returns nothing");
  else fail(`poop_logs is readable while logged out (status ${res.status})! Re-run the migration.`);
} catch (e) {
  fail(`RLS check failed: ${e.message}`);
}

// 4) Migration 0002 applied? A missing table returns 404; an existing,
//    RLS-protected one returns 401/403 to logged-out requests.
try {
  const res = await fetch(`${base}/rest/v1/quiet_days?select=id&limit=1`, { headers });
  if (res.status === 404) {
    fail("quiet_days table missing, run supabase/migrations/0002_quiet_days.sql");
  } else if (res.status === 401 || res.status === 403 || (res.ok && (await res.json()).length === 0)) {
    ok("Migration 0002_quiet_days.sql applied (and locked down)");
  } else {
    fail(`quiet_days is readable while logged out (status ${res.status})!`);
  }
} catch (e) {
  fail(`quiet_days check failed: ${e.message}`);
}

// 5) Migration 0003 applied? Asking for an unknown column gets a 400 before
//    any permission check; a real (locked) column gets 401/403.
try {
  const res = await fetch(`${base}/rest/v1/profiles?select=gender&limit=1`, { headers });
  if (res.status === 400) fail("profiles.gender missing, run supabase/migrations/0003_gender.sql");
  else if (res.status === 401 || res.status === 403 || (res.ok && (await res.json()).length === 0)) {
    ok("Migration 0003_gender.sql applied");
  } else fail(`profiles is readable while logged out (status ${res.status})!`);
} catch (e) {
  fail(`gender check failed: ${e.message}`);
}

console.log(process.exitCode ?"\nSome checks failed." : "\nAll good, your farm is connected!");
