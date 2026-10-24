import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin';
import { checkBuiltInModels } from '@/lib/server/llm';

// Admin-only: is each built-in AI model answering right now, and how fast?
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: '没有管理员权限' }, { status: 403 });
  return NextResponse.json({ models: await checkBuiltInModels(), checkedAt: new Date().toISOString() });
}
