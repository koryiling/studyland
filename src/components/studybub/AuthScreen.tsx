'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import type { TFn } from '@/i18n';

type Mode = 'login' | 'signup' | 'forgot';

export const MIN_PASSWORD = 8;

// Turn Supabase auth errors into friendly messages
export function authErrorMessage(message: string, t: TFn): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return t('auth.err.invalidLogin');
  if (m.includes('email not confirmed')) return t('auth.err.notConfirmed');
  if (m.includes('already registered') || m.includes('already been registered')) return t('auth.err.alreadyRegistered');
  if (m.includes('password should be') || m.includes('weak password')) return t('auth.err.weakPassword', { n: MIN_PASSWORD });
  if (m.includes('rate limit') || m.includes('too many')) return t('auth.err.rateLimit');
  if (m.includes('same password') || m.includes('different from the old')) return t('auth.err.samePassword');
  if (m.includes('invalid email') || m.includes('unable to validate email')) return t('auth.err.invalidEmail');
  if (m.includes('error sending') || m.includes('smtp')) return t('auth.err.emailFailed');
  if (m.includes('expired') || m.includes('invalid') || m.includes('otp')) return t('auth.linkExpired');
  return message;
}

export function AuthScreen({ initialError }: { initialError?: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ? authErrorMessage(initialError, t) : '');
  const [notice, setNotice] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  };

  // After sign-up, show the login form but keep the "check your email" notice
  const switchModeKeepNotice = (next: Mode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD) return setError(t('auth.err.tooShort', { n: MIN_PASSWORD }));
      if (password !== confirmPassword) return setError(t('auth.err.mismatch'));
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) setError(authErrorMessage(err.message, t));
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/` },
        });
        if (err) setError(authErrorMessage(err.message, t));
        else if (!data.session) {
          // Email confirmation is on: the account exists but must be confirmed first
          setNotice(t('auth.signupDone'));
          switchModeKeepNotice('login');
        }
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/confirm?next=/?set-password=1`,
        });
        if (err) setError(authErrorMessage(err.message, t));
        else setNotice(t('auth.resetSent'));
      }
    } catch {
      setError(t('common.networkError'));
    } finally {
      setBusy(false);
    }
  };

  const title = t(mode === 'login' ? 'auth.title.login' : mode === 'signup' ? 'auth.title.signup' : 'auth.title.forgot');
  const subtitle = t(mode === 'login' ? 'auth.sub.login' : mode === 'signup' ? 'auth.sub.signup' : 'auth.sub.forgot');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#F4F9F5]">
      <div className="w-full max-w-sm space-y-6">
        <LanguagePicker compact />
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <StudyBubMascot mood="happy" size={96} />
          </div>
          <div className="text-2xl font-extrabold text-[#1C2B22]">Studyland</div>
          <div className="text-[11px] text-[#2F8F5B] font-semibold tracking-wider uppercase">{t('nav.tagline')}</div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
          <div>
            <h1 className="text-lg font-extrabold text-[#1C2B22]">{title}</h1>
            <p className="text-xs text-[#8A9E92] mt-1 leading-relaxed">{subtitle}</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="auth-email" className="block text-xs font-bold text-[#1C2B22]">{t('auth.email')}</label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm focus:outline-none focus:border-[#2F8F5B]"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-xs font-bold text-[#1C2B22]">{t('auth.password')}</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('forgot')} className="text-[11px] font-semibold text-[#2F8F5B] hover:underline">
                    {t('auth.forgotLink')}
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? t('auth.minChars', { n: MIN_PASSWORD }) : ''}
                className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm focus:outline-none focus:border-[#2F8F5B]"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="auth-confirm" className="block text-xs font-bold text-[#1C2B22]">{t('auth.confirmPassword')}</label>
              <input
                id="auth-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm focus:outline-none focus:border-[#2F8F5B]"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="p-3 rounded-2xl bg-[#EBF5F0] border border-[#C8E3D3] text-[#2F8F5B] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{t(mode === 'login' ? 'auth.btn.login' : mode === 'signup' ? 'auth.btn.signup' : 'auth.btn.forgot')}</span>
          </button>

          <div className="text-center text-xs text-[#607367]">
            {mode === 'login' ? (
              <>
                {t('auth.noAccount')}{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-bold text-[#2F8F5B] hover:underline">
                  {t('auth.btn.signup')}
                </button>
              </>
            ) : (
              <>
                {t('auth.haveAccount')}{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-bold text-[#2F8F5B] hover:underline">
                  {t('auth.backToLogin')}
                </button>
              </>
            )}
          </div>
        </form>

        <p className="text-[11px] text-center text-[#8A9E92] px-2">{t('auth.noEmail')}</p>
      </div>
    </div>
  );
}
