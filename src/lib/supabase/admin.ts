// Server-only admin client (secret key: bypasses RLS). Never import from client components.
import { createClient } from '@supabase/supabase-js';
import { getCurrentClaims } from './server';

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not configured');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Admin = app_metadata.role === 'admin', which only the server can set (users can't edit app_metadata).
// Re-checked against the Auth server so a revoked admin loses access immediately.
export async function requireAdmin(): Promise<{ userId: string } | null> {
  const claims = await getCurrentClaims();
  if (!claims?.sub) return null;
  const { data, error } = await createAdminClient().auth.admin.getUserById(claims.sub);
  if (error || data.user?.app_metadata?.role !== 'admin') return null;
  return { userId: claims.sub };
}
