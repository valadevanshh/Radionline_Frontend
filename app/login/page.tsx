'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { RadiologyStore } from '@/lib/radiology-store';
import { ApiClient } from '@/lib/api-client';
import { TextInput } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await ApiClient.login({ email: email.trim(), password });
      RadiologyStore.setSession(result.user);
      if (result.user.role === 'SUPER_ADMIN') {
        router.push('/dashboard/approvals');
      } else {
        router.push('/dashboard/all-reports');
      }
    } catch {
      // Ensure no mock/local session or JWT remains after a failed API login
      ApiClient.logout();
      RadiologyStore.logout();
      setLoading(false);
      setError('Invalid username or password. Please check your credentials.');
      setErrorKey((k) => k + 1);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-start sm:items-center justify-center px-4 pt-16 pb-10 sm:py-10 font-sans text-slate-900">
      <style>{`
        @keyframes rn-login-pulse { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
        @keyframes rn-login-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes rn-login-pop { 0% { opacity: 0; transform: scale(0.85); } 60% { opacity: 1; transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes rn-login-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes rn-login-glow { 0%, 100% { opacity: 0.55; scale: 1; } 50% { opacity: 0.9; scale: 1.2; } }
        @keyframes rn-login-drift-a { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(60px, 40px) scale(1.08); } }
        @keyframes rn-login-drift-b { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-50px, -30px) scale(1.06); } }
        @keyframes rn-login-bar { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }
        @keyframes rn-login-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
        @keyframes rn-login-drop { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: none; } }
        @keyframes rn-login-bob { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(12deg); } }
        @keyframes rn-login-twinkle { 0%, 100% { opacity: 0.25; scale: 0.8; } 50% { opacity: 0.9; scale: 1.15; } }
        .rn-login-pulse { animation: rn-login-pulse 6s linear infinite; }
        .rn-login-drop { animation: rn-login-drop 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rn-login-bob { animation: rn-login-bob 5s ease-in-out infinite; }
        .rn-login-twinkle { animation: rn-login-twinkle 3s ease-in-out infinite; }
        .rn-login-rise { animation: rn-login-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rn-login-pop { animation: rn-login-pop 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rn-login-float { animation: rn-login-float 6s ease-in-out 1s infinite; }
        .rn-login-glow { animation: rn-login-glow 4s ease-in-out infinite; }
        .rn-login-drift-a { animation: rn-login-drift-a 18s ease-in-out infinite; }
        .rn-login-drift-b { animation: rn-login-drift-b 22s ease-in-out infinite; }
        .rn-login-bar { background-size: 200% 100%; animation: rn-login-bar 4s linear infinite; }
        .rn-login-shake { animation: rn-login-shake 0.4s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .rn-login-pulse { animation: none; opacity: 0; }
          .rn-login-rise, .rn-login-pop, .rn-login-float, .rn-login-glow, .rn-login-drift-a, .rn-login-drift-b,
          .rn-login-bar, .rn-login-shake, .rn-login-drop, .rn-login-bob, .rn-login-twinkle { animation: none; }
        }
      `}</style>

      {/* Background: static soft grid (not animated: repainting it every frame was costly), colour glows and a heartbeat line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
      />
      <div aria-hidden="true" className="rn-login-drift-a pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-sky-300/30 blur-3xl" />
      <div aria-hidden="true" className="rn-login-drift-b pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-blue-400/20 blur-3xl" />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-32 w-full -translate-y-1/2 sm:block"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 50 H170 L185 50 L195 28 L207 80 L220 8 L233 72 L243 50 H760 L775 50 L785 30 L797 78 L810 12 L823 70 L833 50 H1000"
          stroke="#009ef7"
          strokeOpacity="0.14"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        <path
          className="rn-login-pulse"
          d="M0 50 H170 L185 50 L195 28 L207 80 L220 8 L233 72 L243 50 H760 L775 50 L785 30 L797 78 L810 12 L823 70 L833 50 H1000"
          pathLength={1000}
          stroke="#009ef7"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeDasharray="90 910"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Mobile only: curved blue header with heartbeat line and floating medical shapes */}
      <div aria-hidden="true" className="rn-login-drop pointer-events-none absolute inset-x-0 top-0 sm:hidden">
        <div className="absolute inset-x-0 top-0 h-[320px] bg-sky-300/40 [clip-path:ellipse(150%_100%_at_30%_0%)]" />
        <div className="absolute inset-x-0 top-0 h-[290px] overflow-hidden bg-gradient-to-br from-sky-400 via-[#009ef7] to-blue-700 [clip-path:ellipse(140%_100%_at_60%_0%)]">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div aria-hidden="true" className="rn-login-drift-a pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <svg className="absolute inset-x-0 top-[94px] h-16 w-full" viewBox="0 0 400 60" preserveAspectRatio="none" fill="none">
            <path
              d="M0 30 H40 L50 30 L58 14 L66 48 L76 4 L86 42 L94 30 H300 L310 30 L318 16 L326 46 L336 6 L346 40 L354 30 H400"
              stroke="#ffffff"
              strokeOpacity="0.25"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            <path
              className="rn-login-pulse"
              d="M0 30 H40 L50 30 L58 14 L66 48 L76 4 L86 42 L94 30 H300 L310 30 L318 16 L326 46 L336 6 L346 40 L354 30 H400"
              pathLength={1000}
              stroke="#ffffff"
              strokeOpacity="0.9"
              strokeWidth="2"
              strokeDasharray="90 910"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg className="rn-login-bob absolute left-6 top-8 h-5 w-5 text-white/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
          </svg>
          <svg style={{ animationDelay: '1.5s' }} className="rn-login-bob absolute right-8 top-[190px] h-4 w-4 text-white/50" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
          </svg>
          <svg style={{ animationDelay: '0.8s' }} className="rn-login-bob absolute left-10 top-[200px] h-3 w-3 text-white/40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
          </svg>
          <span className="rn-login-twinkle absolute right-6 top-10 h-2 w-2 rounded-full bg-white" />
          <span style={{ animationDelay: '1s' }} className="rn-login-twinkle absolute left-[38%] top-6 h-1.5 w-1.5 rounded-full bg-white" />
          <span style={{ animationDelay: '2s' }} className="rn-login-twinkle absolute right-[30%] top-[130px] h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      </div>
      <svg style={{ animationDelay: '2s' }} aria-hidden="true" className="rn-login-bob pointer-events-none absolute left-6 bottom-8 h-5 w-5 text-sky-300/70 sm:hidden" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
      </svg>
      <svg style={{ animationDelay: '0.5s' }} aria-hidden="true" className="rn-login-bob pointer-events-none absolute right-8 bottom-16 h-4 w-4 text-blue-300/60 sm:hidden" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
      </svg>

      <div className="relative w-full max-w-[380px]">
        <div className="rn-login-pop relative flex justify-center mb-5 sm:mb-3">
          <div aria-hidden="true" className="rn-login-glow absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/40 blur-2xl" />
          <img src="/logo.png" alt="Radionline" className="rn-login-float relative h-28 w-28 rounded-full bg-white p-1 shadow-xl shadow-blue-900/25 ring-4 ring-white/40 object-contain sm:h-32 sm:w-32" />
        </div>

        <div style={{ animationDelay: '120ms' }} className="rn-login-rise relative overflow-hidden bg-white sm:bg-white/90 sm:backdrop-blur border border-slate-200/80 rounded-2xl shadow-xl shadow-sky-900/5 p-6 sm:p-7">
          <div aria-hidden="true" className="rn-login-bar absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#38bdf8,#009ef7,#1d4ed8,#009ef7,#38bdf8)]" />

          <div style={{ animationDelay: '220ms' }} className="rn-login-rise mb-5 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Welcome back. Enter your details to continue.</p>
          </div>

          {error && (
            <div
              key={errorKey}
              role="alert"
              className="rn-login-shake mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div style={{ animationDelay: '300ms' }} className="rn-login-rise">
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <TextInput
                id="login-email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                autoFocus
                leftIcon={<Mail className="h-4 w-4" />}
              />
            </div>

            <div style={{ animationDelay: '380ms' }} className="rn-login-rise">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <TextInput
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ animationDelay: '460ms' }}
              className="rn-login-rise group relative overflow-hidden w-full h-10 rounded-lg bg-gradient-to-r from-[#009ef7] to-blue-600 hover:from-[#0086d6] hover:to-blue-700 text-white text-sm font-semibold shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/35 hover:-translate-y-px active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]"
              />
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span className="relative">{loading ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>
        </div>

        <p style={{ animationDelay: '560ms' }} className="rn-login-rise mt-5 text-center text-xs text-slate-500">
          Forgot your password? Contact your administrator.
        </p>
      </div>
    </main>
  );
}
