import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { setAdminSessionToken } from '../utils/adminAuth.ts';

interface AdminLoginProps {
  initialized: boolean;
  onAuthSuccess: (username: string) => void;
  onBackToHome: () => void;
}

export function AdminLogin({
  initialized,
  onAuthSuccess,
  onBackToHome,
}: AdminLoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    if (!initialized) {
      if (password.length < 8) {
        setError('Administrator password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const endpoint = initialized ? '/api/admin/login' : '/api/admin/setup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        username?: string;
        sessionToken?: string;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        return;
      }

      if (data.sessionToken) {
        setAdminSessionToken(data.sessionToken);
      }
      onAuthSuccess(data.username || username.trim());
    } catch {
      setError('Unable to reach authentication server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <div className="bg-white rounded-3xl border border-[#F8BBD0] shadow-[0_14px_44px_-14px_rgba(231,84,128,0.16)] p-7 sm:p-9 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#E75480] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Survey</span>
          </button>
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#FFF0F5] text-[#E75480]">
            <Lock className="w-5 h-5" />
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#333333]">
            {initialized ? 'Administrator Login' : 'Initial Admin Account Setup'}
          </h1>
          <p className="text-sm text-[#666666] leading-relaxed">
            {initialized
              ? 'Sign in with your administrator credentials to view survey analytics and Google Sheets responses.'
              : 'Create the primary administrator account for this survey portal. Credentials are salted and hashed on the server.'}
          </p>
        </div>

        {!initialized && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FFF0F5] border border-[#F8BBD0] text-xs text-[#333333]">
            <ShieldCheck className="w-4 h-4 text-[#E75480] shrink-0 mt-0.5" />
            <span>
              No <code>ADMIN_PASSWORD</code> environment variable is set yet, so you can configure
              your server-side administrator login once right here.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-username" className="block text-sm font-semibold text-[#333333]">
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480] focus:ring-2 focus:ring-[#E75480]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-sm font-semibold text-[#333333]">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete={initialized ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={initialized ? 'Enter administrator password' : 'Minimum 8 characters'}
              className="w-full px-4 py-3 rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480] focus:ring-2 focus:ring-[#E75480]/20"
            />
          </div>

          {!initialized && (
            <div className="space-y-1.5">
              <label
                htmlFor="admin-confirm-password"
                className="block text-sm font-semibold text-[#333333]"
              >
                Confirm Password
              </label>
              <input
                id="admin-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480] focus:ring-2 focus:ring-[#E75480]/20"
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-[#991B1B]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 disabled:opacity-60 shadow-sm transition-opacity cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>
              {submitting
                ? 'Authenticating...'
                : initialized
                  ? 'Sign In to Dashboard'
                  : 'Create Admin Account'}
            </span>
          </button>
        </form>
      </div>
    </main>
  );
}
