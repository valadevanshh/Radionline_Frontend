'use client';

import ProfileDocuments from '@/components/ProfileDocuments';
import type { ProfileDocument } from '@/lib/profile-documents';
import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, Check, Shield, FileText, Edit3, Trash2 } from 'lucide-react';
import { ApiClient, apiErrorMessage, isPendingApproval, resolveMediaUrl } from '@/lib/api-client';
import { centerIdsWith, hasCenterLevel, managerCan } from '@/lib/access';
import { RadiologyStore, RadiologyCenter } from '@/lib/radiology-store';
import { PageShell, PageHeader, StatusBadge } from '@/components/ui';
import { centerLetterheads, centerReportLayout, CenterLetterhead, CenterReportLayout } from '@/lib/report-layout';
import { generateUUID } from '@/lib/uuid';

export default function CenterInfoProfilePage() {
  const [session, setSession] = useState<any>(null);
  const [center, setCenter] = useState<RadiologyCenter | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [headerTemplateUrl, setHeaderTemplateUrl] = useState('');
  const [letterheadMode, setLetterheadMode] = useState<'header' | 'footer' | 'full-page' | 'preprinted'>('full-page');
  const [reportLayout, setReportLayout] = useState<CenterReportLayout>(centerReportLayout());
  const [letterheads, setLetterheads] = useState<CenterLetterhead[]>([]);
  const [newLetterheadName, setNewLetterheadName] = useState('');
  const [newLetterheadUrl, setNewLetterheadUrl] = useState('');
  const [newLetterheadMode, setNewLetterheadMode] = useState<CenterLetterhead['letterheadMode']>('full-page');
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [readingDocuments, setReadingDocuments] = useState(false);
  const [saving, setSaving] = useState(false);
  // Centre logins linked to several centres pick which one to view
  const [myCenters, setMyCenters] = useState<RadiologyCenter[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');

  const fillForm = (c: RadiologyCenter) => {
    setDocuments(c.documents || []);
    setCenterName(c.centerName || '');
    setContactNumber(c.contactNumber || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setHeaderTemplateUrl(c.headerTemplateUrl || '');
    setLetterheadMode(c.letterheadMode || 'full-page');
    setReportLayout(centerReportLayout(c.reportLayout, c.letterheadMode || 'full-page', Boolean(c.headerTemplateUrl)));
    setLetterheads(centerLetterheads(c));
    setNewLetterheadName('');
    setNewLetterheadUrl('');
    setNewLetterheadMode(c.letterheadMode || 'full-page');
  };

  const selectCenter = async (c: RadiologyCenter | null) => {
    setCenter(c);
    setIsEditing(false);
    setSelectedCenterId(c?.id || '');
    if (c) fillForm(c);
    setPricing(c ? await ApiClient.getPricing(c.id).catch(() => null) : null);
  };

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentSession = RadiologyStore.getSession();
      setSession(currentSession);

      const centersList = await ApiClient.getCenters();
      // Centres this login may see on this page (Center Info = view or edit)
      const allowed = centerIdsWith(currentSession, 'center_info', 'read');
      const mine = currentSession?.role === 'CENTER' ? centersList.filter((c) => allowed.includes(c.id)) : centersList;
      setMyCenters(mine);
      const keep = mine.find((c) => c.id === selectedCenterId);
      const preferred = keep || mine.find((c) => c.id === currentSession?.centerId) || mine[0] || null;
      await selectCenter(preferred);
    } catch (e: any) {
      setError(apiErrorMessage(e, 'Failed to load center profile'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canEditProfile =
    !!center && (session?.role === 'SUPER_ADMIN' || managerCan(session, 'centers', 'write') || hasCenterLevel(session, 'center_info', 'write', center.id));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!center || saving || readingDocuments) return;
    if (!centerName.trim()) {
      setError('Centre name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields = {
        centerName: centerName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        address: address.trim(),
        headerTemplateUrl: headerTemplateUrl.trim(),
        letterheadMode,
        reportLayout,
        letterheads,
        documents,
      };
      if (session?.role === 'MANAGER') {
        const result = await ApiClient.saveCenter({ ...center, ...fields });
        if (isPendingApproval(result)) {
          setIsEditing(false);
          setSuccessNotice('Center letterheads and print layout sent to Super Admin for approval.');
          setTimeout(() => setSuccessNotice(null), 4500);
          return;
        }
      }
      const saved = await ApiClient.updateCenterProfile(center.id, fields);
      const next = { ...center, ...saved };
      RadiologyStore.saveCenter(next);
      setCenter(next);
      setMyCenters((prev) => prev.map((c) => (c.id === next.id ? next : c)));
      fillForm(next);
      setIsEditing(false);
      setSuccessNotice('Center details, letterheads & print layout updated.');
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Could not save the centre profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleNewLetterheadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setNewLetterheadUrl(String(event.target?.result || ''));
    reader.readAsDataURL(file);
  };

  const addLetterhead = () => {
    const name = newLetterheadName.trim();
    if (!name || !newLetterheadUrl) return;
    if (letterheads.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())) {
      setError('Use a different name for each letterhead.');
      return;
    }
    const added: CenterLetterhead = { id: generateUUID(), name, url: newLetterheadUrl, letterheadMode: newLetterheadMode || 'full-page' };
    setLetterheads((current) => [...current, added]);
    if (!headerTemplateUrl) {
      setHeaderTemplateUrl(added.url);
      setLetterheadMode(added.letterheadMode || 'full-page');
    }
    setNewLetterheadName('');
    setNewLetterheadUrl('');
    setError(null);
  };

  return (
    <PageShell>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#009ef7]" />
            <span>Diagnostic Center Profile</span>
          </div>
        }
        subtitle="Manage your diagnostic center details, letterhead banner, and billing profile"
      />

      {myCenters.length > 1 && (
        <label className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs font-bold text-slate-600">
          <span>Centre</span>
          <select
            value={selectedCenterId}
            onChange={(e) => selectCenter(myCenters.find((c) => c.id === e.target.value) || null)}
            style={{ height: 38, borderRadius: 10, border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 13, background: '#fff', maxWidth: 360 }}
            data-testid="center-info-select"
          >
            {myCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.centerName}
              </option>
            ))}
          </select>
        </label>
      )}

      {successNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
          Loading center profile...
        </div>
      ) : !center ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400" data-testid="center-info-noaccess">
          {session?.role === 'CENTER' && (session?.centers || []).length > 0
            ? 'You do not have access to Center Info. Ask your Center Admin for access.'
            : 'No center profile linked to this account.'}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Overview Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#009ef7]/10 text-[#009ef7] border border-[#009ef7]/20 flex items-center justify-center font-bold text-xl font-mono shrink-0">
                  {center.centerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">{center.centerName}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Center ID: {center.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status="ACTIVE" />
                {!isEditing && !canEditProfile && (
                  <span className="text-[11px] font-semibold text-slate-500 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200" data-testid="center-info-readonly">
                    View only
                  </span>
                )}
                {!isEditing && canEditProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#009ef7]" /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Profile Info Details / Form */}
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Center Name *</label>
                    <input
                      type="text"
                      required
                      value={centerName}
                      onChange={(e) => setCenterName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#009ef7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                    <input
                      type="text"
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#009ef7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#009ef7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Address / Location</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 102 Medical Hub, Hospital Road"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#009ef7]"
                    />
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="block text-xs font-bold text-slate-700">Letterhead placement on reports</legend>
                  <div className="flex flex-wrap justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {([
                      ['header', 'Add Header'],
                      ['footer', 'Add Footer'],
                      ['full-page', 'Whole Page Scan'],
                      ['preprinted', 'Preprinted Paper (No Image)'],
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={letterheadMode === mode}
                        onClick={() => setLetterheadMode(mode)}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          letterheadMode === mode
                            ? 'border-[#009ef7] bg-[#009ef7] text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">Preprinted paper reserves clear space at the top and bottom without adding the uploaded image.</p>
                </fieldset>

                <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-xs font-bold text-slate-700">Report layout for this center</legend>
                  <p className="text-[11px] text-slate-500">These defaults preserve the current report layout. Heights reserve clear space in millimeters.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-slate-700">Header space (mm)
                      <input type="number" min={8} max={100} value={reportLayout.headerHeightMm} onChange={(e) => setReportLayout((v) => ({ ...v, headerHeightMm: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Footer space (mm)
                      <input type="number" min={8} max={70} value={reportLayout.footerHeightMm} onChange={(e) => setReportLayout((v) => ({ ...v, footerHeightMm: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">QR code position
                      <select value={reportLayout.qrPosition} onChange={(e) => setReportLayout((v) => ({ ...v, qrPosition: e.target.value as CenterReportLayout['qrPosition'] }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="left">Left</option><option value="right">Right</option></select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Doctor details position
                      <select value={reportLayout.doctorDetailsPosition} onChange={(e) => setReportLayout((v) => ({ ...v, doctorDetailsPosition: e.target.value as CenterReportLayout['doctorDetailsPosition'] }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-xs font-bold text-slate-700">Named letterheads</legend>
                  <p className="text-[11px] text-slate-500">Upload each version with a clear name. They will appear in the All Reports action menu.</p>
                  <div className="space-y-2">
                    {letterheads.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveMediaUrl(item.url)} alt="" className="h-10 w-14 rounded border border-slate-200 bg-white object-contain" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-500">{item.letterheadMode || 'full-page'}</div>
                        </div>
                        <button type="button" onClick={() => {
                          const remaining = letterheads.filter((x) => x.id !== item.id);
                          setLetterheads(remaining);
                          if (headerTemplateUrl === item.url) {
                            setHeaderTemplateUrl(remaining[0]?.url || '');
                            setLetterheadMode(remaining[0]?.letterheadMode || 'full-page');
                          }
                        }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label={`Remove ${item.name}`} title="Remove letterhead">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {!letterheads.length && <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">No letterheads added yet.</p>}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-700">Letterhead name *
                      <input value={newLetterheadName} onChange={(e) => setNewLetterheadName(e.target.value)} placeholder="e.g. Main Branch, Clinic A" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Letterhead format
                      <select value={newLetterheadMode || 'full-page'} onChange={(e) => setNewLetterheadMode(e.target.value as CenterLetterhead['letterheadMode'])} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                        <option value="header">Header image</option><option value="footer">Footer image</option><option value="full-page">Full page</option><option value="preprinted">Preprinted paper</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Image file
                      <input type="file" accept="image/*" onChange={handleNewLetterheadFile} className="mt-1 block w-full text-xs text-slate-600" />
                    </label>
                  </div>
                  {newLetterheadUrl && <p className="text-[11px] font-semibold text-emerald-700">Image selected. Add it to the center’s letterheads before saving.</p>}
                  <button type="button" disabled={!newLetterheadName.trim() || !newLetterheadUrl} onClick={addLetterhead} className="rounded-lg bg-[#009ef7] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Add named letterhead</button>
                </fieldset>

                <ProfileDocuments title="Center Documents" value={documents} onChange={setDocuments} disabled={saving || readingDocuments} onBusyChange={setReadingDocuments} />

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); if (center) fillForm(center); setError(null); }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || readingDocuments}
                    className="px-4 py-2 rounded-xl bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-60 text-xs font-bold text-white shadow-xs cursor-pointer"
                    data-testid="center-info-save"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase mb-1">
                    <Mail className="w-3.5 h-3.5 text-[#009ef7]" /> Email Contact
                  </div>
                  <div className="text-xs font-semibold text-slate-800">{center.email}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase mb-1">
                    <Phone className="w-3.5 h-3.5 text-[#009ef7]" /> Contact Phone
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-800">{center.contactNumber}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#009ef7]" /> Location
                  </div>
                  <div className="text-xs font-semibold text-slate-800">{center.address || 'Main Location'}</div>
                </div>
              </div>
            )}
          </div>

          {!isEditing && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><ProfileDocuments title="Center Documents" value={center.documents || []} /></div>}

          {/* Letterhead & Pricing Configuration Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Header Letterhead Preview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#009ef7]" /> Report Letterhead
                </h3>
                <span className="text-[10px] font-mono text-slate-400">{center.letterheadMode === 'header' ? 'Header' : center.letterheadMode === 'footer' ? 'Footer' : center.letterheadMode === 'preprinted' ? 'Preprinted paper' : 'Whole page'} · PDF & print</span>
              </div>

              {center.headerTemplateUrl ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaUrl(center.headerTemplateUrl)}
                    alt="Center Letterhead Banner"
                    className="w-full h-auto max-h-36 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400">
                  Standard platform header active. Edit profile to upload a custom diagnostic center letterhead image.
                </div>
              )}
              {centerLetterheads(center).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {centerLetterheads(center).map((item) => (
                    <span key={item.id} className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-800">{item.name}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Center Billing & Rate Card Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#009ef7]" /> Contracted Rate Card
                </h3>
                <span className="text-[10px] font-mono text-slate-400">IST Monthly Billing</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-slate-600 font-medium">First Study Rate per Case</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{pricing?.center?.firstStudy ?? 30}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-slate-600 font-medium">Additional Study Rate</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{pricing?.center?.additionalStudy ?? 15}
                  </span>
                </div>
                <div className="p-2.5 text-[11px] text-slate-500 italic">
                  * Invoices are finalized automatically at the end of each IST billing period.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
