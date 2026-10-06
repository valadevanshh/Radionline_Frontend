'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, TextInput } from '@/components/ui';
import { CenterPricing, RateCard, apiErrorMessage, ApiClient } from '@/lib/api-client';

const RS = '\u20B9';
const MAX_RATE = 100000;

type Field = 'centerFirst' | 'centerAdditional' | 'doctorFirst' | 'doctorAdditional';
type Values = Record<Field, string>;

function toValues(r: RateCard): Values {
  return {
    centerFirst: String(r.center.firstStudy),
    centerAdditional: String(r.center.additionalStudy),
    doctorFirst: String(r.doctor.firstStudy),
    doctorAdditional: String(r.doctor.additionalStudy),
  };
}

/** Rate card as "Rs30 / +15" for a table cell or hint. */
export function formatRates(first: number, additional: number): string {
  return `${RS}${first} / +${additional}`;
}

interface CenterPricingModalProps {
  pricing: CenterPricing | null;
  defaults: RateCard | null;
  onClose: () => void;
  onSaved: (p: CenterPricing) => void;
}

/** Super Admin: edit one centre's charge and doctor payout (first / each additional study). */
export default function CenterPricingModal({ pricing, defaults, onClose, onSaved }: CenterPricingModalProps) {
  const [values, setValues] = useState<Values | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValues(pricing ? toValues(pricing) : null);
    setError('');
  }, [pricing]);

  if (!pricing || !values) return null;

  const num = (f: Field) => Number(values[f]);
  const valid = (Object.keys(values) as Field[]).every((f) => {
    const raw = values[f].trim();
    return /^\d+$/.test(raw) && Number(raw) <= MAX_RATE;
  });
  const sameAsDefault =
    !!defaults && valid &&
    num('centerFirst') === defaults.center.firstStudy && num('centerAdditional') === defaults.center.additionalStudy &&
    num('doctorFirst') === defaults.doctor.firstStudy && num('doctorAdditional') === defaults.doctor.additionalStudy;
  const payoutAboveCharge = valid && (num('doctorFirst') > num('centerFirst') || num('doctorAdditional') > num('centerAdditional'));
  const example = valid
    ? { center: num('centerFirst') + 2 * num('centerAdditional'), doctor: num('doctorFirst') + 2 * num('doctorAdditional') }
    : null;

  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [f]: e.target.value.replace(/[^\d]/g, '') });
    setError('');
  };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = await ApiClient.updateCenterPricing(pricing.centerId, {
        centerFirstStudy: num('centerFirst'),
        centerAdditionalStudy: num('centerAdditional'),
        doctorFirstStudy: num('doctorFirst'),
        doctorAdditionalStudy: num('doctorAdditional'),
      });
      onSaved(saved);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the pricing.'));
    } finally {
      setSaving(false);
    }
  };

  const field = (f: Field, label: string) => (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      <TextInput
        value={values[f]}
        onChange={set(f)}
        inputMode="numeric"
        maxLength={6}
        leftIcon={<span className="text-sm">{RS}</span>}
        data-testid={`pricing-${f}`}
        aria-label={label}
      />
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pricing - ${pricing.centerName}`}
      size="md"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-[#009ef7] hover:underline disabled:text-slate-400 disabled:no-underline"
            disabled={!defaults || sameAsDefault}
            onClick={() => defaults && setValues(toValues(defaults))}
            data-testid="pricing-use-defaults"
          >
            Use defaults
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="center-pricing-form" disabled={!valid || saving} data-testid="pricing-save">
              {saving ? 'Saving...' : 'Save pricing'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="center-pricing-form" onSubmit={save} className="space-y-4" data-testid="center-pricing-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <fieldset className="rounded-lg border border-slate-200 p-3 space-y-3">
            <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Centre is charged</legend>
            {field('centerFirst', 'First study')}
            {field('centerAdditional', 'Each additional study')}
          </fieldset>
          <fieldset className="rounded-lg border border-slate-200 p-3 space-y-3">
            <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Doctor is paid</legend>
            {field('doctorFirst', 'First study')}
            {field('doctorAdditional', 'Each additional study')}
          </fieldset>
        </div>

        <div className="text-xs text-slate-600 space-y-1">
          {example && (
            <p data-testid="pricing-example">
              A 3-study case: centre {RS}{example.center}, doctor {RS}{example.doctor}.
            </p>
          )}
          {defaults && (
            <p className="text-slate-500">
              Defaults: centre {formatRates(defaults.center.firstStudy, defaults.center.additionalStudy)}, doctor{' '}
              {formatRates(defaults.doctor.firstStudy, defaults.doctor.additionalStudy)}.
            </p>
          )}
          <p className="text-slate-500">Applies to cases signed from now on. Cases already billed keep their amounts.</p>
          {!valid && <p className="text-rose-600">Enter whole rupees from 0 to {MAX_RATE}.</p>}
          {payoutAboveCharge && <p className="text-amber-700">The doctor payout is higher than the centre charge.</p>}
          {error && <p className="text-rose-600" role="alert">{error}</p>}
        </div>
      </form>
    </Modal>
  );
}
