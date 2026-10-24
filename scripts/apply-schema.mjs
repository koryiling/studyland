// Applies supabase/schema.sql to the Supabase database in .env.local (POSTGRES_URL_NON_POOLING).
// Usage: node scripts/apply-schema.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile(join(root, '.env.local'));

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) throw new Error('POSTGRES_URL_NON_POOLING missing in .env.local (run: vercel env pull)');

const client = new pg.Client({
  connectionString: url.replace(/[?&]sslmode=[^&]*/, ''),
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(readFileSync(join(root, 'supabase', 'schema.sql'), 'utf8'));
  const { rows } = await client.query(`
    select c.relname as table, c.relrowsecurity as rls,
           (select count(*) from pg_policies p where p.tablename = c.relname) as policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('user_records', 'file_texts')`);
  console.table(rows);
} finally {
  await client.end();
}
