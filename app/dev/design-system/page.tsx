'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Search } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  DataTable,
  Modal,
  PageHeader,
  PageShell,
  PriorityBadge,
  StatusBadge,
  TextInput,
  toast,
} from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { color, radius, space, type as typeScale } from '@/styles/tokens';

const SAMPLE_ROWS = [
  { id: '1', patient: 'Anita Shah', status: 'Completed', priority: true, studyDate: '2026-09-18T09:15:00' },
  { id: '2', patient: 'Ravi Mehta', status: 'In Review', priority: false, studyDate: '2026-09-20T14:40:00' },
  { id: '3', patient: 'Leela Nair', status: 'Pending', priority: true, studyDate: '2026-09-22' },
];

const STATUS_SAMPLES = [
  'Pending',
  'Completed',
  'SIGNED',
  'In Review',
  'DRAFT',
  'CLAIMED',
  'APPROVED',
  'REJECTED',
  'paid',
  'overdue',
];

export default function DesignSystemDemoPage() {
  const [query, setQuery] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastConfirm, setLastConfirm] = useState<string>('—');

  return (
    <div className="min-h-screen bg-[var(--rn-bg)]">
      <PageHeader
        title="Design system — Phase 1"
        subtitle="Primitives only. Screens are not restyled yet."
        actions={
          <Button size="sm" variant="secondary" onClick={() => toast.info('Toast helper is wired')}>
            Ping toast
          </Button>
        }
      />

      <PageShell width="full">
        <div className="mx-auto max-w-6xl space-y-8 pb-16">
          <section className="rounded-[var(--rn-radius-card)] border border-[var(--rn-border)] bg-[var(--rn-surface)] p-5">
            <h2 className="mb-4 text-[16px] font-semibold text-[var(--rn-text)]">Color tokens</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {(
                [
                  ['primary', color.primary],
                  ['surface', color.surface],
                  ['border', color.border],
                  ['success', color.success],
                  ['warning', color.warning],
                  ['danger', color.danger],
                  ['info', color.info],
                ] as const
              ).map(([name, value]) => (
                <div key={name} className="space-y-2">
                  <div
                    className="h-12 rounded-[var(--rn-radius-control)] border border-[var(--rn-border)]"
                    style={{ background: value }}
                  />
                  <div className="text-[12px] font-semibold capitalize text-[var(--rn-text)]">{name}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 text-[12px] text-[var(--rn-text-secondary)] sm:grid-cols-3">
              <div>Spacing: {Object.values(space).join(' / ')}px</div>
              <div>Type: {Object.values(typeScale).filter((n, i, a) => a.indexOf(n) === i).join(' / ')}px (min 12)</div>
              <div>Radius: control {radius.control} / card {radius.card} / modal {radius.modal}</div>
            </div>
          </section>

          <section className="rounded-[var(--rn-radius-card)] border border-[var(--rn-border)] bg-[var(--rn-surface)] p-5">
            <h2 className="mb-4 text-[16px] font-semibold text-[var(--rn-text)]">Button</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm">Small 32</Button>
              <Button size="md">Medium 36</Button>
              <Button size="lg">Large 40</Button>
              <Button disabled>Disabled</Button>
            </div>
          </section>

          <section className="rounded-[var(--rn-radius-card)] border border-[var(--rn-border)] bg-[var(--rn-surface)] p-5">
            <h2 className="mb-1 text-[16px] font-semibold text-[var(--rn-text)]">TextInput</h2>
            <p className="mb-4 text-[12px] text-[var(--rn-text-secondary)]">
              Own padding beats globals.css input height:32px — icons stay clear of placeholder text.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patients…"
                leftIcon={<Search className="h-4 w-4" />}
              />
              <TextInput
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Password"
                leftIcon={<Mail className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="flex items-center justify-center text-[var(--rn-text-muted)] hover:text-[var(--rn-text)]"
                    aria-label={showSecret ? 'Hide' : 'Show'}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold text-[var(--rn-text)]">PageHeader + PageShell + DataTable</h2>
            <div className="overflow-hidden rounded-[var(--rn-radius-card)] border border-[var(--rn-border)]">
              <PageHeader title="Worklist" subtitle="Row height 44px · header 56px" actions={<Button size="sm">New case</Button>} />
              <div className="p-4">
                <DataTable
                  columns={[
                    { key: 'patient', header: 'Patient' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => <StatusBadge status={row.status} />,
                    },
                    {
                      key: 'priority',
                      header: 'Priority',
                      render: (row) => <PriorityBadge priority={row.priority} />,
                    },
                    {
                      key: 'studyDate',
                      header: 'Study',
                      render: (row) => formatDate(row.studyDate),
                    },
                    {
                      key: 'when',
                      header: 'Date/time',
                      render: (row) => formatDateTime(row.studyDate),
                    },
                  ]}
                  rows={SAMPLE_ROWS}
                  rowKey={(row) => row.id}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[var(--rn-radius-card)] border border-[var(--rn-border)] bg-[var(--rn-surface)] p-5">
            <h2 className="mb-1 text-[16px] font-semibold text-[var(--rn-text)]">Status + priority vocabulary</h2>
            <p className="mb-4 text-[12px] text-[var(--rn-text-secondary)]">
              Completed and SIGNED both render as Signed. Urgent / STAT / true all render as STAT.
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_SAMPLES.map((s) => (
                <span key={s} className="inline-flex items-center gap-2">
                  <span className="text-[12px] text-[var(--rn-text-muted)]">{s}</span>
                  <StatusBadge status={s} />
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <PriorityBadge priority="STAT" />
              <PriorityBadge priority="urgent" />
              <PriorityBadge priority={true} />
              <PriorityBadge priority="routine" />
              <PriorityBadge priority={false} />
            </div>
          </section>

          <section className="rounded-[var(--rn-radius-card)] border border-[var(--rn-border)] bg-[var(--rn-surface)] p-5">
            <h2 className="mb-4 text-[16px] font-semibold text-[var(--rn-text)]">Modal · ConfirmDialog · Toast</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(true)}>
                Open modal
              </Button>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                Open confirm
              </Button>
              <Button variant="secondary" onClick={() => toast.success('Case claimed')}>
                Success toast
              </Button>
              <Button variant="secondary" onClick={() => toast.error('Sign-off failed')}>
                Error toast
              </Button>
            </div>
            <p className="mt-3 text-[12px] text-[var(--rn-text-secondary)]">
              Last confirm result: {lastConfirm}
            </p>
          </section>

          <section className="rounded-[var(--rn-radius-card)] border border-[var(--rn-border)] bg-[var(--rn-surface)] p-5">
            <h2 className="mb-3 text-[16px] font-semibold text-[var(--rn-text)]">Date formatters</h2>
            <div className="space-y-1 font-mono text-[13px] text-[var(--rn-text)]">
              <div>formatDate(2026-09-18T09:15:00) → {formatDate('2026-09-18T09:15:00')}</div>
              <div>formatDateTime(2026-09-18T09:15:00) → {formatDateTime('2026-09-18T09:15:00')}</div>
              <div>formatDate(18/09/2026) → {formatDate('18/09/2026')}</div>
            </div>
          </section>
        </div>
      </PageShell>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Report options"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Save</Button>
          </>
        }
      >
        Footer stays pinned. Backdrop and header are the single modal chrome for Phase 2.
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete record"
        message="This is the shared ConfirmDialog used instead of window.confirm()."
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmOpen(false);
          setLastConfirm('confirmed');
          toast.success('Confirmed');
        }}
        onCancel={() => {
          setConfirmOpen(false);
          setLastConfirm('cancelled');
        }}
      />
    </div>
  );
}
