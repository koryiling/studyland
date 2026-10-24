'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessage, MIN_PASSWORD } from '@/components/studybub/AuthScreen';
import { useI18n } from '@/lib/i18n';

interface SetPasswordScreenProps {
  reason: 'recovery' | 'temporary' | 'change';
  email?: string;
  onDone: () => void;
  onCancel?: () => void;
}

// Used after a reset-password email link, after an admin set a temporary password,
// or when a signed-in user wants to change their password.
export function SetPasswordScreen({ reason, email, onDone, onCancel }: SetPasswordScreenProps) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) return setError(t('auth.err.tooShort', { n: MIN_PASSWORD }));
    if (password !== confirmPassword) return setError(t('auth.err.mismatch'));

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) return setError(authErrorMessage(err.message, t));
      if (reason === 'temporary') {
        // Clear the "must change password" flag set by the admin, then refresh the token
        await fetch('/api/account/password-changed', { method: 'POST' });
        await supabase.auth.refreshSession();
      }
      onDone();
    } catch {
      setError(t('common.networkError'));
    } finally {
      setBusy(false);
    }
  };

  const intro = t(reason === 'recovery' ? 'setpw.recovery' : reason === 'temporary' ? 'setpw.temporary' : 'setpw.change');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#F4F9F5]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#1C2B22]">{t('setpw.title')}</h1>
            {email && <p className="text-xs text-[#8A9E92]">{email}</p>}
          </div>
        </div>
        <p className="text-xs text-[#607367] leading-relaxed">{intro}</p>

        <div className="space-y-1">
          <label htmlFor="new-password" className="block text-xs font-bold text-[#1C2B22]">{t('setpw.new')}</label>
          <input
            id="new-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.minChars', { n: MIN_PASSWORD })}
            className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm focus:outline-none focus:border-[#2F8F5B]"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="new-password-confirm" className="block text-xs font-bold text-[#1C2B22]">{t('setpw.again')}</label>
          <input
            id="new-password-confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm focus:outline-none focus:border-[#2F8F5B]"
          />
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3.5 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{t('setpw.save')}</span>
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="w-full text-xs font-semibold text-[#8A9E92]">
            {t('common.cancel')}
          </button>
        )}
      </form>
    </div>
  );
}
