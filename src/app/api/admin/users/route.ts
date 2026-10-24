import { randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, requireAdmin } from '@/lib/supabase/admin';

// Admin-only user management. Admins never see passwords; they can only issue a
// reset link, set a one-time temporary password, or confirm an email manually.

const forbidden = () => NextResponse.json({ error: 'forbidden' }, { status: 403 });

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const admin = createAdminClient();

  const users = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    users.push(...data.users);
    if (data.users.length < 200) break;
  }

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at || null,
      emailConfirmed: Boolean(u.email_confirmed_at),
      mustChangePassword: Boolean(u.app_metadata?.must_change_password),
      isAdmin: u.app_metadata?.role === 'admin',
    })),
  });
}

// Readable temporary password without look-alike characters (0/O, 1/l/I)
function temporaryPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[randomInt(chars.length)];
  return out;
}

export async function POST(req: NextRequest) {
  const caller = await requireAdmin();
  if (!caller) return forbidden();

  let body: { userId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { userId, action } = body;
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const admin = createAdminClient();
  const { data: target, error: findError } = await admin.auth.admin.getUserById(userId);
  if (findError || !target.user?.email) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const email = target.user.email;

  switch (action) {
    case 'reset-link': {
      // Creates a one-time recovery link without sending email; the admin passes it on
      const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
      if (error || !data.properties?.hashed_token) {
        return NextResponse.json({ error: error?.message || 'link_failed' }, { status: 500 });
      }
      const link = `${req.nextUrl.origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=${encodeURIComponent('/?set-password=1')}`;
      return NextResponse.json({ link, email });
    }

    case 'temp-password': {
      if (userId === caller.userId) {
        return NextResponse.json({ error: 'self_temp_password' }, { status: 400 });
      }
      const password = temporaryPassword();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password,
        app_metadata: { must_change_password: true },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ tempPassword: password, email });
    }

    case 'confirm-email': {
      const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, email });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
