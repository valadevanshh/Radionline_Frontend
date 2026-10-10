'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, PendingApproval, getAccessToken, WS_BASE_URL } from '@/lib/api-client';
import { RadiologyStore, UserAccount } from '@/lib/radiology-store';
import ApprovalDiff from '@/components/ApprovalDiff';
import { toast } from '@/components/ui/Toast';
import { formatPatientDisplayId } from '@/lib/uuid';

const ENTITY_WORD: Record<string, string> = {
  case: 'patient record',
  doctor: 'doctor',
  center: 'diagnostic centre',
  template: 'template',
};

/** Plain-language title for a request, e.g. "Delete patient record". */
function actionTitle(actionType: string, entityType: string): string {
  const verb = (actionType || '').split('_')[0].toUpperCase();
  const what = ENTITY_WORD[(entityType || '').toLowerCase()] || (entityType || 'record').toLowerCase();
  if (verb === 'DELETE') return `Delete ${what}`;
  if (verb === 'UPDATE') return entityType === 'case' ? 'Edit patient details' : `Edit ${what}`;
  if (verb === 'CREATE') return entityType === 'case' ? 'Upload image (new case)' : `Add ${what}`;
  return actionType;
}

/** Name of the record the request is about (patient / doctor / centre / template). */
function subjectName(a: PendingApproval): string {
  const src = { ...(a.before || {}), ...(a.payload || {}) } as Record<string, unknown>;
  const name = src.fullName || src.centerName || src.title || src.name || src.email || a.entityId;
  const ptNum = formatPatientDisplayId(src.patientNumber as string);
  const num = ptNum ? ` (${ptNum})` : '';
  return name ? `${String(name)}${num}` : '';
}

/** Server times are UTC; ones without a zone are read as UTC (not local). */
function formatServerTime(v?: string | null): string {
  if (!v) return 'N/A';
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Building,
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function ApprovalsPage() {
  const [session, setSession] = useState<UserAccount | null>(null);

  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getApprovals();
      setApprovals(data);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load approval requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSession(RadiologyStore.getSession());
    fetchApprovals();

    // WebSocket listener for live updates
    let ws: WebSocket | null = null;
    try {
      const token = getAccessToken();
      const baseUrl = WS_BASE_URL;
      const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'PENDING_APPROVAL_REQUEST' || payload.type === 'APPROVAL_RESOLVED' || payload.type === 'APPROVAL_UPDATED') {
            fetchApprovals();
          }
        } catch (e) {
          console.warn('Approvals WS error:', e);
        }
      };
    } catch (e) {
      console.warn('Approvals WS connection error:', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApprove = async (approval: PendingApproval) => {
    setActionLoadingId(approval.id);
    try {
      await ApiClient.approveChange(approval.id, session?.name || 'Super Admin');
      setToastMessage(`✓ Approved: ${actionTitle(approval.actionType, approval.entityType)}${subjectName(approval) ? ` — ${subjectName(approval)}` : ''}`);
      setTimeout(() => setToastMessage(null), 4000);
      await fetchApprovals();
    } catch (err: any) {
      toast.error(`Could not approve: ${err?.message || 'error'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    setActionLoadingId(rejectingId);
    try {
      await ApiClient.rejectChange(rejectingId, rejectionReason || 'Rejected by Super Admin', session?.name || 'Super Admin');
      setToastMessage(`✓ Request rejected`);
      setTimeout(() => setToastMessage(null), 4000);
      setRejectingId(null);
      setRejectionReason('');
      await fetchApprovals();
    } catch (err: any) {
      toast.error(`Could not reject: ${err?.message || 'error'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredApprovals = approvals.filter((a) => {
    if (activeFilter !== 'ALL' && a.status !== activeFilter) return false;
    return true;
  });

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'case': return FileText;
      case 'doctor': return Users;
      case 'center': return Building;
      default: return ShieldCheck;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="tag" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>● APPROVED</span>;
      case 'REJECTED':
        return <span className="tag" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>● REJECTED</span>;
      case 'PENDING':
      default:
        return <span className="tag" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>● PENDING APPROVAL</span>;
    }
  };

  const isSuperAdmin = session?.role === 'SUPER_ADMIN';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Section Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="section-title">{isSuperAdmin ? 'SUPER ADMIN APPROVAL CENTER' : 'MY SUBMISSIONS'}</span>
          <span className="tag" style={{ background: 'var(--navy-light)', color: 'var(--navy)' }}>
            {approvals.filter((a) => a.status === 'PENDING').length} PENDING
          </span>
        </div>
      </div>

      <main style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {toastMessage && (
          <div style={{ padding: '8px 14px', background: 'var(--navy)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={15} style={{ color: '#009ef7' }} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Banner & Filter Bar */}
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: 'var(--teal)' }} />
              <span>{isSuperAdmin ? 'Manager Requests (Add / Edit / Delete)' : 'Requests waiting for Super Admin'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {isSuperAdmin
                ? 'Manager adds, edits and deletes are applied only after you approve them.'
                : 'Your adds, edits and deletes are applied after the Super Admin approves them.'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((filter) => {
              const count = approvals.filter((a) => filter === 'ALL' || a.status === filter).length;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`btn btn-sm ${activeFilter === filter ? 'btn-teal' : 'btn-ghost'}`}
                  style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}
                >
                  <span>{filter}</span>
                  <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 700 }}>({count})</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={fetchApprovals}
              className="btn btn-ghost btn-sm"
              title="Refresh Approvals"
              style={{ padding: '4px 6px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Approvals List */}
        {loading && approvals.length === 0 ? (
          <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Loading approval requests from backend...
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <ShieldCheck size={32} style={{ margin: '0 auto 10px', color: 'var(--text-muted)', opacity: 0.5 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>No Approval Requests Found</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              No pending or reviewed manager requests match the current filter.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredApprovals.map((appr) => {
              const Icon = getEntityIcon(appr.entityType);
              const isExpanded = !!expandedIds[appr.id];
              const isPending = appr.status === 'PENDING';
              const isProcessing = actionLoadingId === appr.id;

              return (
                <div
                  key={appr.id}
                  className="card"
                  style={{
                    padding: '12px 16px',
                    borderLeft: isPending ? '4px solid #f59e0b' : appr.status === 'APPROVED' ? '4px solid #10b981' : '4px solid #ef4444',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          flexShrink: 0,
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: 'var(--surface-hover)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--navy)',
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{actionTitle(appr.actionType, appr.entityType)}</span>
                          <span className="tag" style={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10 }}>
                            {appr.entityType.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', columnGap: 12, rowGap: 2, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User size={12} /> Requested by: <strong>{appr.managerName}</strong>
                          </span>
                          {subjectName(appr) && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }} data-testid="approval-subject">
                              <Icon size={12} /> <strong>{subjectName(appr)}</strong>
                            </span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> {formatServerTime(appr.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {getStatusBadge(appr.status)}

                      {isSuperAdmin && isPending && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleApprove(appr)}
                            disabled={isProcessing}
                            className="btn btn-teal btn-sm"
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            <CheckCircle size={13} />
                            <span>{isProcessing ? 'Applying...' : 'Approve'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(appr.id);
                              setRejectionReason('');
                            }}
                            disabled={isProcessing}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px 10px', fontSize: 11, color: 'var(--red)', border: '1px solid var(--border)' }}
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpand(appr.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 6px' }}
                        title="Toggle Payload Details"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Rejection Reason display if rejected */}
                  {appr.status === 'REJECTED' && appr.rejectionReason && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '6px 10px', fontSize: 11, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span><strong>Rejection Reason:</strong> {appr.rejectionReason} (Reviewed by {appr.reviewedBy || 'Super Admin'})</span>
                    </div>
                  )}

                  {/* Expandable before/after diff (Priority 7) */}
                  {isExpanded && (
                    <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <ApprovalDiff
                        actionType={appr.actionType}
                        before={appr.before}
                        after={appr.payload}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Reject Reason Modal */}
      {rejectingId && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'var(--surface)', width: 420, padding: 18, borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
              Reject Manager Action Request
            </div>
            <form onSubmit={handleRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Reason for Rejection:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter clear feedback for the manager..."
                  required
                  rows={3}
                  style={{ width: '100%', padding: 8, fontSize: 12, borderRadius: 4, border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === rejectingId}
                  className="btn btn-sm"
                  style={{ background: 'var(--red)', color: '#fff' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
