import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server client for route handlers. Create a new one per request (never share across requests).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a context that can't set cookies; proxy.ts refreshes sessions.
          }
        },
      },
    }
  );
}

// The signed-in user's verified JWT claims, or null if not signed in.
export async function getCurrentClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return data.claims;
}
