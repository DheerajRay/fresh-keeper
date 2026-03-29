import React, { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Panel, PrimaryButton, SecondaryButton, cx } from './ui';

type AuthMode = 'sign_in' | 'sign_up';

const AuthScreen: React.FC = () => {
  const { status, missingEnv, errorMessage, clearError, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeError = localError || errorMessage;

  const resetErrors = () => {
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetErrors();

    if (!email.trim() || !password.trim()) {
      setLocalError('Email and password are required.');
      return;
    }

    if (mode === 'sign_up' && !displayName.trim()) {
      setLocalError('Display name is required when creating an account.');
      return;
    }

    setIsSubmitting(true);
    const result = mode === 'sign_in'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, displayName.trim());
    setIsSubmitting(false);

    if (result.error) {
      setLocalError(result.error);
      return;
    }

    setPassword('');
  };

  if (status === 'missing_config') {
    return (
      <div className="min-h-screen bg-[#f5f5f3] px-4 py-8 text-neutral-950 md:px-6 md:py-12">
        <div className="mx-auto max-w-2xl">
          <Panel className="p-6 md:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Supabase</p>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Finish auth configuration</h1>
                <p className="text-sm leading-6 text-neutral-600">
                  The app is ready for Supabase auth, but the browser-safe environment variables are missing.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-950">Missing variables</p>
                <div className="mt-3 space-y-2 text-sm text-neutral-600">
                  {missingEnv.map((entry) => (
                    <div key={entry} className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-neutral-950">
                      {entry}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 text-sm leading-6 text-neutral-600">
                <p>Set them in <code className="text-neutral-950">.env.local</code> and in Vercel before continuing.</p>
                <p>
                  Keep <code className="text-neutral-950">SUPABASE_SECRET_KEY</code> server-only. Only the
                  <code className="text-neutral-950"> VITE_*</code> Supabase values belong in the browser.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] px-4 py-8 text-neutral-950 md:px-6 md:py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_minmax(0,420px)] lg:items-start">
        <Panel className="p-6 md:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Account</p>
              <h1 className="text-4xl font-semibold tracking-tight text-neutral-950">FreshKeeper account</h1>
              <p className="max-w-md text-sm leading-6 text-neutral-600">
                Sign in to continue, or create an account to save your fridge, meals, and shopping data.
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6 md:p-8">
          <div className="space-y-5">
            <div className="inline-flex rounded-2xl border border-neutral-200 bg-neutral-100 p-1">
              {[
                { value: 'sign_in' as const, label: 'Sign in' },
                { value: 'sign_up' as const, label: 'Create account' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    resetErrors();
                    setMode(option.value);
                  }}
                  className={cx(
                    'rounded-2xl px-4 py-2 text-sm font-medium transition',
                    mode === option.value
                      ? 'border border-neutral-950 bg-transparent text-neutral-950'
                      : 'text-neutral-600 hover:text-neutral-900',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <form aria-label="Authentication form" className="space-y-4" onSubmit={handleSubmit}>
              {mode === 'sign_up' ? (
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Display name</span>
                  <input
                    type="text"
                    autoComplete="nickname"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    onFocus={resetErrors}
                    placeholder="Dheeraj"
                    className="min-h-[52px] w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
                  />
                </label>
              ) : null}

              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onFocus={resetErrors}
                  placeholder="you@example.com"
                  className="min-h-[52px] w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Password</span>
                <input
                  type="password"
                  autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={resetErrors}
                  placeholder="At least 6 characters"
                  className="min-h-[52px] w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
                />
              </label>

              {activeError ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                  {activeError}
                </div>
              ) : null}

              <PrimaryButton type="submit" disabled={isSubmitting} className="min-h-[52px] w-full">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                {isSubmitting ? 'Working' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
              </PrimaryButton>
            </form>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default AuthScreen;
