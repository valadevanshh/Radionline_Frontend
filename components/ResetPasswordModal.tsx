'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, Wand2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { ApiClient, apiErrorMessage } from '@/lib/api-client';

export const MIN_PASSWORD = 8;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Random 10-character password (letters + digits, no look-alikes such as 0/O, 1/l). */
export function generatePassword(len = 10): string {
  for (;;) {
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    const pw = Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join('');
    if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) return pw;
  }
}

export interface ResetTarget {
  /** Backend user ref: user id, email, "doctor:<id>" or "center:<id>". */
  ref: string;
  name: string;
  detail?: string;
}

/** Super Admin: set a new password for any login. */
export default function ResetPasswordModal({ target, onClose }: { target: ResetTarget | null; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPw('');
    setConfirmPw('');
    setShow(false);
    setError('');
    setSaving(false);
    setCopied(false);
  }, [target?.ref]);

  const generate = () => {
    const g = generatePassword();
    setPw(g);
    setConfirmPw(g);
    setShow(true);
    setError('');
    setCopied(false);
  };

  const copy = async () => {
    if (!pw) return;
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy; select the password and copy it manually.');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || saving) return;
    if (pw.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters`);
    if (pw !== confirmPw) return setError('Passwords do not match');
    setSaving(true);
    setError('');
    try {
      const r = await ApiClient.adminResetPassword(target.ref, pw);
      toast.success(
        r.sessionsEnded ? `Password reset for ${target.name}. They have been signed out.` : `Password reset for ${target.name}.`,
      );
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset the password'));
    } finally {
      setSaving(false);
    }
  };

  const field = (id: string, value: string, set: (v: string) => void, placeholder: string, testId: string) => (
    <input
      id={id}
      type={show ? 'text' : 'password'}
      autoComplete="new-password"
      value={value}
      onChange={(e) => {
        set(e.target.value);
        if (error) setError('');
      }}
      placeholder={placeholder}
      className={`w-full h-9 rounded-lg border px-2.5 pr-9 text-[14px] font-mono outline-none focus:border-[#009ef7] focus:ring-2 focus:ring-sky-100 ${
        error ? 'border-rose-400' : 'border-slate-300'
      }`}
      data-testid={testId}
      disabled={saving}
    />
  );

  return (
    <Modal
      open={!!target}
      onClose={() => !saving && onClose()}
      size="sm"
      title={
        <span className="inline-flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#009ef7]" /> Reset password
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-3" data-testid="reset-password-modal">
        {target && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[12px]">
            <div className="font-semibold text-slate-800 truncate">{target.name}</div>
            {target.detail && <div className="text-slate-500 font-mono truncate">{target.detail}</div>}
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="rp-new" className="text-[11px] font-semibold text-slate-600">
              New password <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#009ef7] hover:underline"
              data-testid="reset-generate"
              disabled={saving}
            >
              <Wand2 className="w-3.5 h-3.5" /> Generate
            </button>
          </div>
          <div className="relative flex items-center gap-1.5">
            <div className="relative flex-1">
              {field('rp-new', pw, setPw, `At least ${MIN_PASSWORD} characters`, 'reset-new')}
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                aria-label={show ? 'Hide password' : 'Show password'}
                title={show ? 'Hide' : 'Show'}
                data-testid="reset-toggle"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={copy}
              disabled={!pw}
              className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:border-[#009ef7] hover:text-[#009ef7] disabled:opacity-40"
              aria-label="Copy password"
              title={copied ? 'Copied' : 'Copy'}
              data-testid="reset-copy"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="rp-confirm" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Confirm password <span className="text-rose-500">*</span>
          </label>
          <div className="pr-[42px]">{field('rp-confirm', confirmPw, setConfirmPw, 'Re-enter the password', 'reset-confirm')}</div>
        </div>
        {error ? (
          <p className="text-[12px] font-medium text-rose-600" role="alert" data-testid="reset-error">
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">Share the new password with the user securely. Their other sessions will be signed out.</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 px-3 rounded-lg border border-slate-300 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-60 text-white text-[13px] font-semibold inline-flex items-center gap-1.5"
            data-testid="reset-submit"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Reset password
          </button>
        </div>
      </form>
    </Modal>
  );
}