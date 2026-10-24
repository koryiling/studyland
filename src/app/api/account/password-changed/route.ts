import { NextResponse } from 'next/server';
import { getCurrentClaims } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Called after a user replaces an admin-issued temporary password: clears the flag.
export async function POST() {
  const claims = await getCurrentClaims();
  if (!claims?.sub) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // app_metadata updates are merged with the existing values (role etc. are kept)
  const { error } = await createAdminClient().auth.admin.updateUserById(claims.sub, {
    app_metadata: { must_change_password: false },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
