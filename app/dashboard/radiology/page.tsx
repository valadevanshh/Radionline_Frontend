'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building,
  Search,
  Plus,
  Mail,
  Phone,
  CheckCircle,
  MapPin,
  Trash2,
  IndianRupee,
} from 'lucide-react';
import { RadiologyStore, RadiologyCenter } from '@/lib/radiology-store';
import AddRadiologyCenterModal from '@/components/AddRadiologyCenterModal';
import { ApiClient, CenterPricing, RateCard, apiErrorMessage, isPendingApproval } from '@/lib/api-client';
import { useConfirm, toast } from '@/components/ui';
import CenterPricingModal, { formatRates } from '@/components/CenterPricingModal';

import { useResizableColumns } from '@/lib/use-resizable-columns';
import { RowCard, RowCardList, RT_CONTAINER, RT_TABLET_HIDE } from '@/components/ui/ResponsiveTable';

export default function RadiologyCentersPage() {
  const confirm = useConfirm();
  const [centers, setCenters] = useState<RadiologyCenter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Per-centre pricing: Super Admin only (read + edit)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [pricingById, setPricingById] = useState<Record<string, CenterPricing>>({});
  const [defaultRates, setDefaultRates] = useState<RateCard | null>(null);
  const [editPricing, setEditPricing] = useState<CenterPricing | null>(null);

  const { widths, startResizing } = useResizableColumns({
    centerName: 200,
    contact: 190,
    credentials: 230,
    headerBanner: 120,
    pricing: 150,
    status: 90,
    actions: 80,
  });

  const loadPricing = async () => {
    try {
      const data = await ApiClient.getCenterPricing();
      setDefaultRates(data.default);
      setPricingById(Object.fromEntries(data.centers.map((p) => [p.centerId, p])));
    } catch (err) {
      console.warn('Center pricing load error:', err);
    }
  };

  useEffect(() => {
    const admin = RadiologyStore.getSession()?.role === 'SUPER_ADMIN';
    setIsSuperAdmin(admin);
    if (admin) loadPricing();
  }, [centers.length]);

  const openPricing = (c: RadiologyCenter) => {
    const p = pricingById[c.id];
    if (p) setEditPricing(p);
    else if (defaultRates) {
      setEditPricing({ ...defaultRates, centerId: c.id, centerName: c.centerName, currency: 'INR', isDefault: true });
    }
  };

  const loadCenters = async () => {
    try {
      const data = await ApiClient.getCenters();
      setCenters(data);
    } catch {
      setCenters(RadiologyStore.getCenters());
    }
  };

  useEffect(() => {
    loadCenters();
    const handleCentersChanged = () => loadCenters();
    window.addEventListener('radionline_centers_changed', handleCentersChanged);
    return () => window.removeEventListener('radionline_centers_changed', handleCentersChanged);
  }, []);

  const filteredCenters = useMemo(() => {
    return centers.filter(
      (c) =>
        c.centerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactNumber.includes(searchQuery)
    );
  }, [centers, searchQuery]);

  // Add centre: Super Admin saves at once; a Manager's request waits for Super Admin approval.
  const handleAddCenter = async (center: Omit<RadiologyCenter, 'id' | 'createdAt'>) => {
    try {
      const saved = await ApiClient.saveCenter(center);
      if (isPendingApproval(saved)) {
        toast.info(saved.message || 'Centre request sent to the Super Admin for approval.');
        return;
      }
      RadiologyStore.saveCenter(saved);
      toast.success(`Centre saved: ${saved.centerName || center.centerName}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the centre'));
    }
    loadCenters();
  };

  // Delete centre: Super Admin deletes; a Manager's delete becomes a request for approval.
  const handleDeleteCenter = async (id: string) => {
    const session = RadiologyStore.getSession();
    const isManager = session?.role === 'MANAGER';
    const ok = await confirm({
      title: isManager ? 'Request centre removal' : 'Remove Center',
      message: isManager
        ? 'This sends a delete request to the Super Admin. The centre is removed only after approval.'
        : 'Are you sure you want to remove this Radiology Diagnostic Center?',
      confirmLabel: isManager ? 'Send Request' : 'Remove Center',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await ApiClient.deleteCenter(id);
      if (isPendingApproval(res)) {
        toast.info(res.message || 'Delete request sent to the Super Admin for approval.');
        return;
      }
      RadiologyStore.deleteCenter(id);
      toast.success('Centre removed.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove the centre'));
    }
    loadCenters();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 space-y-3 max-w-7xl w-full mx-auto">
        
        {/* Page Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2 font-mono">
              <Building className="w-5 h-5 text-[#009ef7]" />
              <span>Diagnostic Radiology Centers</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer shrink-0 font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>Add Center</span>
          </button>
        </div>

        {/* Filter Toolbar & Data Card */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-0">
          
          {/* Search Filter Strip */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 flex-wrap shrink-0">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="rn-icon-vcenter w-4 h-4 absolute left-3 top-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by center name, email, or contact number..."
                className="rn-input-iconpad w-full pl-9 pr-3 py-1.5 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:outline-none focus:border-[#009ef7]"
              />
            </div>
            <div className="text-xs font-mono text-slate-500 font-bold">
              {filteredCenters.length} {filteredCenters.length === 1 ? 'CENTER' : 'CENTERS'}
            </div>
          </div>

          {/* Table / Empty Slate Body (No Horizontal Scroll, Resizable Columns, Internal Vertical Scroll) */}
          <div className={`data-table-container ${RT_CONTAINER} flex-1 overflow-y-auto`}>
            {filteredCenters.length > 0 ? (
              <>
              {/* Phones: compact center cards (shared RowCard pattern, < md) */}
              <RowCardList testId="center-cards">
                {filteredCenters.map((c) => {
                  const pr = pricingById[c.id];
                  const rates = pr || defaultRates;
                  return (
                    <RowCard
                      key={c.id}
                      title={c.centerName}
                      subtitle={c.address || 'Main Location'}
                      aside={
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded font-mono">
                          Active
                        </span>
                      }
                      fields={[
                        { label: 'Email', value: c.email, full: true },
                        { label: 'Phone', value: <span className="font-mono">{c.contactNumber}</span> },
                        { label: 'Header', value: c.headerTemplateUrl ? 'Custom Banner' : 'Default Header' },
                        { label: 'Username', value: <span className="font-mono">{c.username || c.email}</span> },
                        { label: 'Password', value: <span className="font-mono">{c.password || 'N/A'}</span> },
                        isSuperAdmin && rates
                          ? {
                              label: 'Pricing (first / each additional)',
                              full: true,
                              value: (
                                <button
                                  type="button"
                                  onClick={() => openPricing(c)}
                                  className="text-left text-xs leading-5 text-slate-700 hover:text-[#009ef7] cursor-pointer"
                                  data-testid={`pricing-card-${c.id}`}
                                >
                                  Centre <strong>{formatRates(rates.center.firstStudy, rates.center.additionalStudy)}</strong>
                                  {' \u00b7 '}
                                  Doctor <strong>{formatRates(rates.doctor.firstStudy, rates.doctor.additionalStudy)}</strong>
                                  <span
                                    className={`ml-1.5 inline-block px-1.5 rounded text-[10px] font-bold font-mono ${
                                      pr && !pr.isDefault ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {pr && !pr.isDefault ? 'Custom' : 'Default'}
                                  </span>
                                </button>
                              ),
                            }
                          : null,
                      ]}
                      actions={
                        <>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => openPricing(c)}
                              className="px-3 py-1.5 text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              <span>Edit pricing</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCenter(c.id)}
                            className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </RowCardList>
              <table className="data-table hidden md:table">
                <thead>
                  <tr>
                    <th title="Center Name" style={{ width: widths.centerName, position: 'relative' }}>
                      <span>Center Name</span>
                      <div className="col-resizer" onMouseDown={(e) => startResizing('centerName', e.clientX, widths.centerName)} />
                    </th>
                    <th title="Contact Info" style={{ width: widths.contact, position: 'relative' }}>
                      <span>Contact Info</span>
                      <div className="col-resizer" onMouseDown={(e) => startResizing('contact', e.clientX, widths.contact)} />
                    </th>
                    <th title="Login Credentials" style={{ width: widths.credentials, position: 'relative' }}>
                      <span>Login Credentials</span>
                      <div className="col-resizer" onMouseDown={(e) => startResizing('credentials', e.clientX, widths.credentials)} />
                    </th>
                    <th title="Header Banner" className={RT_TABLET_HIDE} style={{ width: widths.headerBanner, position: 'relative' }}>
                      <span>Header Banner</span>
                      <div className="col-resizer" onMouseDown={(e) => startResizing('headerBanner', e.clientX, widths.headerBanner)} />
                    </th>
                    {isSuperAdmin && (
                      <th title="Pricing (first / each additional study)" style={{ width: widths.pricing, position: 'relative' }}>
                        <span>Pricing</span>
                        <div className="col-resizer" onMouseDown={(e) => startResizing('pricing', e.clientX, widths.pricing)} />
                      </th>
                    )}
                    <th title="Status" className={RT_TABLET_HIDE} style={{ width: widths.status, position: 'relative' }}>
                      <span>Status</span>
                      <div className="col-resizer" onMouseDown={(e) => startResizing('status', e.clientX, widths.status)} />
                    </th>
                    <th title="Actions" style={{ width: widths.actions, textAlign: 'right', position: 'relative' }}>
                      <span>Actions</span>
                      <div className="col-resizer" onMouseDown={(e) => startResizing('actions', e.clientX, widths.actions)} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCenters.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td title={`${c.centerName} (${c.address || 'Main Location'})`} className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#009ef7]/10 border border-[#009ef7]/20 flex items-center justify-center font-bold text-[#009ef7] text-sm shrink-0 font-mono">
                            {c.centerName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{c.centerName}</div>
                            <div className="text-[11px] text-slate-500">{c.address || 'Main Location'}</div>
                            {isSuperAdmin && (pricingById[c.id] || defaultRates) && (() => {
                              const r = (pricingById[c.id] || defaultRates) as RateCard;
                              return (
                                <button
                                  type="button"
                                  onClick={() => openPricing(c)}
                                  className="show-mobile mt-0.5 text-[11px] font-semibold text-[#009ef7] cursor-pointer"
                                  data-testid={`pricing-mobile-${c.id}`}
                                >
                                  {`\u20B9${r.center.firstStudy}/+${r.center.additionalStudy} \u00b7 Dr \u20B9${r.doctor.firstStudy}/+${r.doctor.additionalStudy}`}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td title={`${c.email} | ${c.contactNumber}`} className="p-3.5">
                        <div className="font-semibold text-slate-800">{c.email}</div>
                        <div className="font-mono text-[11px] text-slate-500">{c.contactNumber}</div>
                      </td>
                      <td title={`User: ${c.username || c.email} | Pass: ${c.password || 'N/A'}`} className="p-3.5">
                        <div className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded inline-flex gap-3 text-slate-700">
                          <span>USER: <strong>{c.username || c.email}</strong></span>
                          <span>PASS: <strong>{c.password || 'N/A'}</strong></span>
                        </div>
                      </td>
                      <td title={c.headerTemplateUrl ? 'Custom Banner' : 'Default Header'} className={`p-3.5 ${RT_TABLET_HIDE}`}>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded font-mono border border-slate-200">
                          {c.headerTemplateUrl ? 'Custom Banner' : 'Default Header'}
                        </span>
                      </td>
                      {isSuperAdmin && (() => {
                        const p = pricingById[c.id];
                        const r = p || defaultRates;
                        return (
                          <td className="p-3.5" title="Centre charge and doctor payout: first study / each additional study">
                            {r ? (
                              <button
                                type="button"
                                onClick={() => openPricing(c)}
                                className="text-left text-[11px] leading-5 text-slate-700 hover:text-[#009ef7] cursor-pointer"
                                data-testid={`pricing-cell-${c.id}`}
                              >
                                <div>
                                  Centre <strong>{formatRates(r.center.firstStudy, r.center.additionalStudy)}</strong>
                                </div>
                                <div>
                                  Doctor <strong>{formatRates(r.doctor.firstStudy, r.doctor.additionalStudy)}</strong>
                                </div>
                                <span
                                  className={`inline-block mt-0.5 px-1.5 rounded text-[10px] font-bold font-mono ${
                                    p && !p.isDefault ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {p && !p.isDefault ? 'Custom' : 'Default'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">-</span>
                            )}
                          </td>
                        );
                      })()}
                      <td title="Active" className={`p-3.5 ${RT_TABLET_HIDE}`}>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded font-mono">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => openPricing(c)}
                            className="p-1.5 text-slate-400 hover:text-[#009ef7] transition-colors cursor-pointer rounded hover:bg-sky-50"
                            title="Edit pricing"
                            aria-label="Edit pricing"
                            data-testid={`pricing-edit-${c.id}`}
                          >
                            <IndianRupee className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteCenter(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded hover:bg-rose-50"
                          title="Delete Radiology Center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            ) : (
              /* Wowed Empty State Card */
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#009ef7]/10 border border-[#009ef7]/20 rounded-full flex items-center justify-center mb-4 text-[#009ef7]">
                  <Building className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-mono">
                  No Diagnostic Centers Registered Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
                  Add your diagnostic center profiles to upload letterheads and create center login credentials.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Radiology Center</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      <CenterPricingModal
        pricing={editPricing}
        defaults={defaultRates}
        onClose={() => setEditPricing(null)}
        onSaved={(p) => {
          setPricingById((prev) => ({ ...prev, [p.centerId]: p }));
          setEditPricing(null);
          toast.success(`Pricing saved for ${p.centerName}. Applies to cases signed from now on.`);
        }}
      />

      <AddRadiologyCenterModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddCenter}
      />
    </div>
  );
}
