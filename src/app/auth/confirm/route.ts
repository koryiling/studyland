import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Landing route for links in Supabase emails (confirm sign-up, reset password).
// Handles both the PKCE "?code=" link (default email template) and the
// "?token_hash=&type=" link (custom SSR template), then redirects into the app.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next') || '/';
  // Only allow redirects within this site
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const supabase = await createClient();
  // The login screen turns this into a message in the student's language
  let errorMessage = 'link_expired';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    errorMessage = 'link_expired';
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const target = type === 'recovery' && !next.includes('set-password') ? '/?set-password=1' : next;
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errorMessage)}`);
}
