// Grants (or removes) admin rights for a registered Studyland account.
// The account must already exist (sign up in the app first).
// Usage: node scripts/make-admin.mjs you@example.com          -> make admin
//        node scripts/make-admin.mjs you@example.com --remove -> remove admin
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile(join(root, '.env.local'));

const email = process.argv[2]?.trim().toLowerCase();
const remove = process.argv.includes('--remove');
if (!email) {
  console.error('Usage: node scripts/make-admin.mjs <email> [--remove]');
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

let user = null;
for (let page = 1; page <= 50 && !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email) || null;
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`No account found for ${email}. Sign up in the app first.`);
  process.exit(1);
}
if (!user.email_confirmed_at && !remove) {
  console.error(`${email} has not confirmed its email yet. Confirm it first, so nobody else can claim it.`);
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(user.id, { app_metadata: { role: remove ? null : 'admin' } });
if (error) throw error;
console.log(remove ? `Removed admin rights from ${email}.` : `${email} is now an admin. Sign out and in again to see 管理后台 in Profile.`);
