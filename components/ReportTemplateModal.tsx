'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookmarkPlus,
  Sparkles,
  Check,
  Building2,
  Stethoscope,
  ChevronDown,
  RotateCcw,
  Eye,
  FileEdit,
  ShieldAlert,
} from 'lucide-react';
import { DocTemplate, RadiologyStore, RadiologyCenter } from '@/lib/radiology-store';
import { ApiClient, apiErrorMessage, isPendingApproval, resolveMediaUrl } from '@/lib/api-client';
import { canWriteTemplates, useSession } from '@/lib/access';
import { STUDY_MODALITY_OPTIONS } from '@/components/NewXRayReportModal';
import { RADIOLOGY_TEMPLATES } from '@/lib/radiology-templates';
import { toast } from '@/components/ui/Toast';

const POPULAR_BODY_PARTS = [
  'CHEST PA/AP',
  'CHEST LATERAL',
  'KNEE JOINT AP/LAT',
  'LUMBAR SPINE AP/LAT',
  'CERVICAL SPINE AP/LAT',
  'PELVIS WITH BOTH HIPS',
  'ABDOMEN ERECT/SUPINE',
  'PNS WATER\'S VIEW',
  'SKULL AP/LAT',
  'SHOULDER JOINT AP',
  'ELBOW JOINT AP/LAT',
  'WRIST JOINT AP/LAT',
  'ANKLE JOINT AP/LAT',
  'FOOT AP/OBLIQUE',
  'HAND AP/OBLIQUE',
];

interface ReportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass an existing template to edit, or null/undefined to create a new one */
  initialTemplate?: DocTemplate | null;
  /** Optional pre-filled values (e.g. from a current report in workspace or review modal) */
  prefill?: {
    title?: string;
    centerId?: string;
    modality?: string;
    bodyPart?: string;
    findings?: string;
    impression?: string;
  };
  onSaved?: (savedTemplate: DocTemplate) => void;
}

export default function ReportTemplateModal({
  isOpen,
  onClose,
  initialTemplate,
  prefill,
  onSaved,
}: ReportTemplateModalProps) {
  const session = useSession();
  const isDoctor = canWriteTemplates(session);

  const [centers, setCenters] = useState<RadiologyCenter[]>(() => RadiologyStore.getCenters());
  const [title, setTitle] = useState('');
  const [centerId, setCenterId] = useState('ALL');
  const [modality, setModality] = useState<string>('X-Ray');
  const [bodyPart, setBodyPart] = useState('CHEST PA/AP');
  const [technique, setTechnique] = useState('Standard digital radiographs evaluated in PA and Lateral projections.');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

  // Load available centers
  useEffect(() => {
    if (!isOpen) return;
    const loadCenters = async () => {
      try {
        const fetched = await ApiClient.getCenters();
        if (Array.isArray(fetched) && fetched.length > 0) {
          setCenters(fetched);
          RadiologyStore.setCenters(fetched);
        }
      } catch {
        setCenters(RadiologyStore.getCenters());
      }
    };
    loadCenters();
  }, [isOpen]);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) return;

    if (initialTemplate) {
      setTitle(initialTemplate.title || '');
      setCenterId(initialTemplate.centerId || 'ALL');
      setModality(initialTemplate.modality || 'X-Ray');
      setBodyPart(initialTemplate.bodyPart || 'GENERAL');
      setFindings(initialTemplate.findings || '');
      setImpression(initialTemplate.impression || '');
      setTechnique(`Standard digital ${initialTemplate.modality || 'radiography'} examination evaluated.`);
    } else if (prefill) {
      setTitle(prefill.title || (prefill.bodyPart ? `${prefill.bodyPart} — Master Template` : ''));
      setCenterId(prefill.centerId || 'ALL');
      setModality(prefill.modality || 'X-Ray');
      setBodyPart(prefill.bodyPart || 'CHEST PA/AP');
      setFindings(prefill.findings || '');
      setImpression(prefill.impression || '');
      setTechnique(`Standard digital ${prefill.modality || 'radiography'} examination evaluated.`);
    } else {
      // Default initial state
      setTitle('Chest PA/AP — Normal Adult Study');
      setCenterId('ALL');
      setModality('X-Ray');
      setBodyPart('CHEST PA/AP');
      setTechnique('Standard digital radiographs evaluated in PA projection.');
      setFindings(
        'Both lung fields are clear and well expanded without focal consolidation, nodule, or mass.\n\n' +
        'Cardiac size and silhouette are within normal limits (CTR < 0.5).\n\n' +
        'The aortic knuckle, hilar structures, and mediastinal contours appear normal.\n\n' +
        'Both costophrenic angles and domes of diaphragms are well defined and clear.\n\n' +
        'Bony thorax, ribs, and visualized soft tissues are unremarkable.'
      );
      setImpression('NO SIGNIFICANT CARDIOPULMONARY ABNORMALITY DETECTED.');
    }
  }, [isOpen, initialTemplate, prefill]);

  // Selected center details
  const selectedCenter = useMemo(() => {
    if (centerId === 'ALL') return null;
    return centers.find((c) => c.id === centerId) || null;
  }, [centerId, centers]);

  // Quick preset loader from system templates
  const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    const matched = RADIOLOGY_TEMPLATES.find((t) => t.id === selectedId);
    if (matched) {
      setTitle(`${matched.name} Template`);
      if (matched.category?.includes('CT')) setModality('CT');
      else if (matched.category?.includes('MRI')) setModality('MRI');
      else if (matched.category?.includes('Ultrasound')) setModality('Sonography');
      else setModality('X-Ray');

      if (matched.bodyPart) setBodyPart(matched.bodyPart);
      setFindings(matched.findings || '');
      setImpression(matched.impression || '');
      setTechnique(`Digital ${matched.category || 'radiography'} examination evaluated in standard projections.`);
      toast.info(`Loaded "${matched.name}" preset`);
    }
  };

  const handleResetToStandard = () => {
    setFindings(
      'Both lung fields are clear and well expanded without focal consolidation, nodule, or mass.\n\n' +
      'Cardiac size and silhouette are within normal limits.\n\n' +
      'Both costophrenic angles and domes of diaphragms appear normal.\n\n' +
      'Bony thorax and visualized soft tissues are unremarkable.'
    );
    setImpression('NO SIGNIFICANT RADIOLOGICAL ABNORMALITY DETECTED.');
    setTechnique('Standard digital radiographs evaluated in multiple projections.');
    toast.info('Reset findings to standard normal baseline');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDoctor) {
      toast.error('Only doctors can create and manage templates.');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a Template Name.');
      return;
    }

    if (!findings.trim()) {
      toast.error('Please enter the Radiological Findings content.');
      return;
    }

    let centerName = 'All Centers';
    if (centerId !== 'ALL' && selectedCenter) {
      centerName = selectedCenter.centerName;
    }

    const contentHtml = `
      <div style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #000;">
        <h2 style="font-family: system-ui, sans-serif; font-size: 13pt; text-align: center; text-transform: uppercase; text-decoration: underline; margin-bottom: 12px; font-weight: bold;">
          RADIOGRAPH OF ${bodyPart.toUpperCase()} VIEW
        </h2>
        <h3 style="font-family: system-ui, sans-serif; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 4px; font-weight: bold;">
          TECHNIQUE:
        </h3>
        <p style="margin: 0 0 10px; font-size: 11pt;">${technique.replace(/\n/g, '<br/>')}</p>
        <h3 style="font-family: system-ui, sans-serif; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 4px; font-weight: bold;">
          RADIOLOGICAL FINDINGS:
        </h3>
        <p style="margin: 0 0 12px; font-size: 11pt; white-space: pre-wrap;">${findings.replace(/\n/g, '<br/>')}</p>
        <h3 style="font-family: system-ui, sans-serif; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 4px; font-weight: bold;">
          IMPRESSION & CONCLUSION:
        </h3>
        <div style="background-color: #f8fafc; padding: 10px 14px; border-left: 4px solid #0f172a; font-weight: bold; font-size: 11pt;">
          ${impression.replace(/\n/g, '<br/>')}
        </div>
      </div>
    `;

    const payload: Partial<DocTemplate> = {
      id: initialTemplate?.id,
      title: title.trim(),
      centerId,
      centerName,
      modality,
      bodyPart: bodyPart.trim() || modality,
      findings: findings.trim(),
      impression: impression.trim(),
      content: contentHtml,
    };

    setIsSaving(true);
    try {
      const saved = await ApiClient.saveTemplate(payload);
      if (isPendingApproval(saved)) {
        toast.info(saved.message || 'Sent to the Super Admin for approval.');
      } else {
        RadiologyStore.saveTemplate(saved);
        toast.success(`Template "${saved.title}" saved successfully!`);
        if (onSaved) onSaved(saved);
      }
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the template. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-50 border border-slate-200 w-full max-w-5xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-[#009ef7]/10 text-[#009ef7] border border-[#009ef7]/20 rounded-xl shrink-0">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 font-mono uppercase tracking-tight">
                  {initialTemplate ? 'Edit Report Template' : 'New Report Template Studio'}
                </h2>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold text-[10px] rounded-full uppercase flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" /> Doctor Report Format
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans hidden sm:block truncate">
                Design and preview your master template directly in actual A4 radiology report layout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="hidden min-[500px]:flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold font-mono">
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'editor' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Interactive</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Report Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Non-doctor Guard Notice */}
        {!isDoctor && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs font-semibold text-amber-800 shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Read-only: Template creation and modifications are restricted to verified reporting doctors only.</span>
          </div>
        )}

        {/* Configuration Ribbon */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs shrink-0 shadow-2xs">
          {/* Template Name */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700 font-mono text-[11px] uppercase">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isDoctor}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chest PA/AP Normal..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#009ef7] focus:outline-none"
            />
          </div>

          {/* Modality */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700 font-mono text-[11px] uppercase">
              Modality <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={!isDoctor}
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#009ef7] focus:outline-none"
            >
              {STUDY_MODALITY_OPTIONS.map((mod) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
          </div>

          {/* Body Part */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700 font-mono text-[11px] uppercase">
              Body Part / Study <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={!isDoctor}
                list="bodyPartOptionsList"
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                placeholder="e.g. CHEST PA/AP"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 uppercase focus:bg-white focus:border-[#009ef7] focus:outline-none"
              />
              <datalist id="bodyPartOptionsList">
                {POPULAR_BODY_PARTS.map((bp) => (
                  <option key={bp} value={bp} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Target Center */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700 font-mono text-[11px] uppercase">
              Assign to Center
            </label>
            <select
              disabled={!isDoctor}
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#009ef7] focus:outline-none"
            >
              <option value="ALL">🌐 All Diagnostic Centers (Global)</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  🏥 {c.centerName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Toolbar Bar: Preset Dropdown & Helper Controls */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Presets:
            </span>
            <select
              disabled={!isDoctor}
              onChange={handleLoadPreset}
              defaultValue=""
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-[#009ef7] cursor-pointer"
            >
              <option value="" disabled>Load from clinical library...</option>
              {RADIOLOGY_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!isDoctor}
              onClick={handleResetToStandard}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
              title="Reset findings to standard normal baseline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Normal</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {selectedCenter ? (
              <span className="text-slate-600 font-semibold">Previewing with 🏥 {selectedCenter.centerName} letterhead</span>
            ) : (
              <span>Universal Standard Platform Letterhead</span>
            )}
          </div>
        </div>

        {/* Main Work Area: Authentic A4 Report Document */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center bg-slate-200/60">
          {/* A4 Sheet Container */}
          <div
            className="w-full max-w-[210mm] bg-white text-black shadow-xl rounded-sm p-6 sm:p-10 border border-slate-300/80 transition-all relative overflow-hidden"
            style={{
              minHeight: '297mm',
              fontFamily: 'Georgia, "Times New Roman", Times, serif',
            }}
          >
            {/* Full-page letterhead background if configured */}
            {selectedCenter?.headerTemplateUrl && selectedCenter.letterheadMode === 'full-page' && (
              <img
                src={resolveMediaUrl(selectedCenter.headerTemplateUrl)}
                alt=""
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
              />
            )}

            <div className={`relative z-10 ${selectedCenter?.headerTemplateUrl && selectedCenter.letterheadMode === 'full-page' ? 'pt-20 sm:pt-28 pb-12' : ''}`}>
              {/* 1. Letterhead / Header (Header banner mode or default platform header) */}
              {selectedCenter?.headerTemplateUrl && selectedCenter.letterheadMode !== 'full-page' ? (
                <div className="mb-4 border-b pb-3 text-center">
                  <img
                    src={resolveMediaUrl(selectedCenter.headerTemplateUrl)}
                    alt={selectedCenter.centerName}
                    className="w-full h-auto max-h-36 object-contain mx-auto"
                  />
                </div>
              ) : !selectedCenter?.headerTemplateUrl ? (
                <header className="border-b-2 border-black pb-3 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-widest font-sans">
                      PACS
                    </div>
                    <div className="flex-1 min-w-0 font-sans">
                      <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wide leading-tight text-black">
                        {selectedCenter ? selectedCenter.centerName : 'RADIONET TELERADIOLOGY & PACS HUB'}
                      </h1>
                      <p className="text-[11px] text-slate-700 mt-0.5">
                        {selectedCenter?.address || '78 Healthcare Avenue · Diagnostic Central Complex · State of Medical Radiodiagnosis'}
                        {selectedCenter?.contactNumber ? ` · Tel: ${selectedCenter.contactNumber}` : ' · 24x7 Diagnostic Support: +91 98765 00000'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-1">
                        ISO 9001:2015 Certified · NABL Accredited · 24×7 Rapid Turnaround Teleradiology
                      </p>
                    </div>
                  </div>
                </header>
              ) : null}

            {/* 2. Demographic Box */}
            <table className="w-full border-collapse mb-5 font-sans text-xs border border-black">
              <tbody>
                <tr>
                  <td className="border border-black p-2 w-1/2 align-top">
                    <span className="block text-[10px] text-slate-600 uppercase font-semibold">Patient Name</span>
                    <span className="font-bold text-sm text-black uppercase">PATIENT PREVIEW (SAMPLE)</span>
                  </td>
                  <td className="border border-black p-2 w-1/2 align-top">
                    <span className="block text-[10px] text-slate-600 uppercase font-semibold">Patient ID</span>
                    <span className="font-bold text-xs text-black font-mono">PID-SAMPLE-TEMPLATE</span>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 align-top">
                    <span className="block text-[10px] text-slate-600 uppercase font-semibold">Age / Sex</span>
                    <span className="font-bold text-xs text-black">45 Yrs / Male</span>
                  </td>
                  <td className="border border-black p-2 align-top">
                    <span className="block text-[10px] text-slate-600 uppercase font-semibold">Date of Study</span>
                    <span className="font-bold text-xs text-black font-mono">{new Date().toLocaleDateString('en-GB')}</span>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 align-top">
                    <span className="block text-[10px] text-slate-600 uppercase font-semibold">Referring Doctor</span>
                    <span className="font-bold text-xs text-black">Dr. Attending Physician</span>
                  </td>
                  <td className="border border-black p-2 align-top">
                    <span className="block text-[10px] text-slate-600 uppercase font-semibold">Modality</span>
                    <span className="font-bold text-xs text-black uppercase">{modality}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black p-2 align-top bg-slate-50/50">
                    <span className="block text-[10px] text-slate-600 uppercase font-semibold">Study / Body Part</span>
                    <span className="font-extrabold text-xs text-black uppercase font-mono">{bodyPart || modality}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 3. Study Header Title */}
            <div className="text-center my-4 font-sans">
              <h2 className="text-sm font-bold uppercase tracking-wider underline text-black">
                {modality.toUpperCase()} — {bodyPart.toUpperCase()} EXAMINATION
              </h2>
            </div>

            {/* 4. Clinical History Section */}
            <div className="mb-4">
              <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-900 mb-1">
                Clinical History:
              </h3>
              <p className="text-xs text-slate-600 italic">
                Evaluated for routine radiodiagnostic assessment.
              </p>
            </div>

            {/* 5. Technique Section */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-black">
                  Technique:
                </h3>
                <span className="text-[10px] font-sans text-slate-400 font-mono italic">Editable in template</span>
              </div>
              <input
                type="text"
                disabled={!isDoctor}
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                placeholder="Enter radiographic technique description..."
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#009ef7] focus:outline-none text-xs bg-slate-50/40 focus:bg-white text-slate-900 font-serif"
              />
            </div>

            {/* 6. Findings Section (Hero editable section) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                  Radiological Findings:
                  <span className="text-rose-500">*</span>
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <span>{findings.split('\n').filter(Boolean).length} Paragraphs</span>
                  <span>·</span>
                  <span>{findings.length} chars</span>
                </div>
              </div>

              {viewMode === 'editor' ? (
                <div className="relative group">
                  <textarea
                    rows={10}
                    required
                    disabled={!isDoctor}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Enter standard radiological findings here (e.g. lung fields, heart size, osseous structures, soft tissues)..."
                    className="w-full p-3.5 border-2 border-slate-300 group-hover:border-slate-400 rounded-lg text-[13px] leading-relaxed text-black focus:border-[#009ef7] focus:outline-none bg-white font-serif transition-colors shadow-2xs resize-y"
                    style={{ minHeight: '180px' }}
                  />
                  <div className="absolute right-2.5 bottom-2.5 pointer-events-none text-[10px] font-mono font-semibold text-slate-400 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200">
                    A4 Report Typography
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/30 text-[13px] leading-relaxed font-serif whitespace-pre-wrap text-black min-h-[120px]">
                  {findings || <span className="text-slate-400 italic">No findings entered yet.</span>}
                </div>
              )}
            </div>

            {/* 7. Impression / Conclusion Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                  Impression & Conclusion:
                  <span className="text-rose-500">*</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Prominent summary block</span>
              </div>

              <div className="border-l-4 border-slate-900 bg-slate-50 p-3 rounded-r-lg">
                {viewMode === 'editor' ? (
                  <textarea
                    rows={3}
                    required
                    disabled={!isDoctor}
                    value={impression}
                    onChange={(e) => setImpression(e.target.value)}
                    placeholder="Enter diagnostic impression & final conclusion..."
                    className="w-full p-2 border border-slate-300 rounded text-[13px] font-bold text-slate-900 focus:border-[#009ef7] focus:outline-none bg-white font-serif resize-y"
                  />
                ) : (
                  <p className="text-[13px] font-bold font-serif text-slate-900 whitespace-pre-wrap">
                    {impression || <span className="text-slate-400 italic">No impression entered yet.</span>}
                  </p>
                )}
              </div>
            </div>

            {/* 8. Doctor Signature & Verification Block */}
            <div className="mt-8 pt-4 border-t border-slate-300 font-sans">
              <div className="flex items-end justify-between">
                <div className="text-[10px] text-slate-400 font-mono">
                  <span>Standard Report Template Draft</span>
                  <br />
                  <span>ISO 27001 & HIPAA Compliant Teleradiology</span>
                </div>

                <div className="text-right">
                  <div className="inline-block border border-dashed border-slate-300 px-4 py-2 bg-slate-50/50 rounded mb-1.5 text-center">
                    <span className="text-[9px] font-mono font-bold text-emerald-600 block uppercase tracking-wider">
                      ✓ Digital Signature Applied
                    </span>
                    <span className="text-[8px] font-mono text-slate-400">Authenticated Teleradiologist</span>
                  </div>
                  <div className="font-bold text-sm text-black">
                    {session?.name || session?.email || 'Dr. Reporting Radiologist'}
                  </div>
                  <div className="text-xs text-slate-700">M.D. (Radiodiagnosis)</div>
                  <div className="text-[11px] text-slate-500 font-mono">MCI Reg. No. 48291</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                    Consultant Radiologist
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-6 pt-2 border-t border-slate-200 text-[10px] text-slate-400 italic text-center">
                This radiology report template is configured for professional radiologist use and clinical correlation.
              </div>
            </div>
            </div>
          </div>

          {/* Bottom Action Strip */}
          <div className="w-full max-w-[210mm] mt-4 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {isDoctor && (
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-60 text-white text-xs font-bold font-mono uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Template...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{initialTemplate ? 'Update Master Template' : 'Save & Publish Template'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
