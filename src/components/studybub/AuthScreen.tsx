'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup' | 'forgot';

const MIN_PASSWORD = 8;

// Turn Supabase auth errors into friendly messages
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email 或密码不正确。';
  if (m.includes('email not confirmed')) return '这个账号还没有完成 Email 验证，请先到邮箱点击确认链接。';
  if (m.includes('already registered') || m.includes('already been registered')) return '这个 Email 已经注册过了，请直接登录。';
  if (m.includes('password should be') || m.includes('weak password')) return `密码太弱，请至少使用 ${MIN_PASSWORD} 个字符，并混合字母和数字。`;
  if (m.includes('rate limit') || m.includes('too many')) return '尝试次数太多，请稍后再试。';
  if (m.includes('same password') || m.includes('different from the old')) return '新密码不能和旧密码一样。';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'Email 格式不正确。';
  if (m.includes('error sending') || m.includes('smtp')) return '邮件发送失败，请联系管理员帮你重设密码。';
  return message;
}

export function AuthScreen({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || '');
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
      if (password.length < MIN_PASSWORD) return setError(`密码至少需要 ${MIN_PASSWORD} 个字符。`);
      if (password !== confirmPassword) return setError('两次输入的密码不一样。');
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) setError(authErrorMessage(err.message));
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/` },
        });
        if (err) setError(authErrorMessage(err.message));
        else if (!data.session) {
          // Email confirmation is on: the account exists but must be confirmed first
          setNotice('注册成功！我们已发送确认邮件到你的邮箱，请点击邮件里的链接完成验证后再登录。');
          switchModeKeepNotice('login');
        }
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/confirm?next=/?set-password=1`,
        });
        if (err) setError(authErrorMessage(err.message));
        else setNotice('如果这个 Email 已注册，你会收到一封重设密码的邮件。请点击邮件里的链接设置新密码。');
      }
    } catch {
      setError('网络连接失败，请检查网络后重试。');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? '欢迎回来' : mode === 'signup' ? '创建账号' : '忘记密码';
  const subtitle =
    mode === 'login'
      ? '登录后，你的资料和学习记录会保存在账号里，换设备也不会丢失。'
      : mode === 'signup'
      ? '用 Email 注册一个 Studyland 账号。'
      : '输入注册时用的 Email，我们会寄一封重设密码的邮件给你。';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#F4F9F5]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <StudyBubMascot mood="happy" size={96} />
          </div>
          <div className="text-2xl font-extrabold text-[#1C2B22]">Studyland</div>
          <div className="text-[11px] text-[#2F8F5B] font-semibold tracking-wider uppercase">Upload · Learn · Grow</div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
          <div>
            <h1 className="text-lg font-extrabold text-[#1C2B22]">{title}</h1>
            <p className="text-xs text-[#8A9E92] mt-1 leading-relaxed">{subtitle}</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="auth-email" className="block text-xs font-bold text-[#1C2B22]">Email</label>
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
                <label htmlFor="auth-password" className="block text-xs font-bold text-[#1C2B22]">密码</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('forgot')} className="text-[11px] font-semibold text-[#2F8F5B] hover:underline">
                    忘记密码？
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
                placeholder={mode === 'signup' ? `至少 ${MIN_PASSWORD} 个字符` : ''}
                className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm focus:outline-none focus:border-[#2F8F5B]"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="auth-confirm" className="block text-xs font-bold text-[#1C2B22]">再输入一次密码</label>
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
            <span>{mode === 'login' ? '登录' : mode === 'signup' ? '注册' : '发送重设密码邮件'}</span>
          </button>

          <div className="text-center text-xs text-[#607367]">
            {mode === 'login' ? (
              <>还没有账号？<button type="button" onClick={() => switchMode('signup')} className="font-bold text-[#2F8F5B] hover:underline">注册</button></>
            ) : (
              <>已经有账号？<button type="button" onClick={() => switchMode('login')} className="font-bold text-[#2F8F5B] hover:underline">返回登录</button></>
            )}
          </div>
        </form>

        <p className="text-[11px] text-center text-[#8A9E92] px-2">
          收不到邮件？请检查垃圾邮件箱，或联系管理员帮你重设密码。
        </p>
      </div>
    </div>
  );
}
