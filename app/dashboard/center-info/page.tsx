'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, Check, Shield, FileText, Edit3 } from 'lucide-react';
import { ApiClient, apiErrorMessage } from '@/lib/api-client';
import { centerIdsWith, hasCenterLevel } from '@/lib/access';
import { RadiologyStore, RadiologyCenter } from '@/lib/radiology-store';
import { PageShell, PageHeader, StatusBadge } from '@/components/ui';

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
  const [saving, setSaving] = useState(false);
  // Centre logins linked to several centres pick which one to view
  const [myCenters, setMyCenters] = useState<RadiologyCenter[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');

  const fillForm = (c: RadiologyCenter) => {
    setCenterName(c.centerName || '');
    setContactNumber(c.contactNumber || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setHeaderTemplateUrl(c.headerTemplateUrl || '');
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
    !!center && (session?.role === 'SUPER_ADMIN' || hasCenterLevel(session, 'center_info', 'write', center.id));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!center || saving) return;
    if (!centerName.trim()) {
      setError('Centre name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await ApiClient.updateCenterProfile(center.id, {
        centerName: centerName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        address: address.trim(),
        headerTemplateUrl: headerTemplateUrl.trim(),
      });
      const next = { ...center, ...saved };
      RadiologyStore.saveCenter(next);
      setCenter(next);
      setMyCenters((prev) => prev.map((c) => (c.id === next.id ? next : c)));
      fillForm(next);
      setIsEditing(false);
      setSuccessNotice('Center details & letterhead updated.');
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Could not save the centre profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setHeaderTemplateUrl(dataUrl);
    };
    reader.readAsDataURL(file);
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Header Letterhead Banner
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerFile}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#009ef7]/10 file:text-[#009ef7] hover:file:bg-[#009ef7]/20 cursor-pointer"
                    />
                  </div>
                </div>

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
                    disabled={saving}
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

          {/* Letterhead & Pricing Configuration Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Header Letterhead Preview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#009ef7]" /> Header Letterhead Banner
                </h3>
                <span className="text-[10px] font-mono text-slate-400">PDF & Printed Reports</span>
              </div>

              {center.headerTemplateUrl ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={center.headerTemplateUrl}
                    alt="Center Letterhead Banner"
                    className="w-full h-auto max-h-36 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400">
                  Standard platform header active. Edit profile to upload a custom diagnostic center letterhead image.
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
