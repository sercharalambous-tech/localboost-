import { createClient } from "@supabase/supabase-js";

// ── Client-side Supabase (browser) ───────────────────────
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Server-side Supabase (with service role for admin ops) ─
export function createServerAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Singleton browser client ──────────────────────────────
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!_browserClient) {
    _browserClient = createBrowserClient();
  }
  return _browserClient;
}
