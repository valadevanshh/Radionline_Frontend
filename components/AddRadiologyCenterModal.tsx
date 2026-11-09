'use client';

import ProfileDocuments from '@/components/ProfileDocuments';
import type { ProfileDocument } from '@/lib/profile-documents';
import React, { useState, useEffect } from 'react';
import { X, Building, Check, FileImage, Key, Lock, Eye, EyeOff, Wand2 } from 'lucide-react';
import { RadiologyCenter } from '@/lib/radiology-store';

interface AddRadiologyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (center: Omit<RadiologyCenter, 'id' | 'createdAt'> & { id?: string }) => void | boolean | Promise<void | boolean>;
  /** Edit mode: prefill from this centre; blank password keeps the current one. */
  initial?: RadiologyCenter | null;
}

export default function AddRadiologyCenterModal({
  isOpen,
  onClose,
  onSave,
  initial = null,
}: AddRadiologyCenterModalProps) {
  const isEdit = !!initial;
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [readingDocuments, setReadingDocuments] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [headerFileName, setHeaderFileName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDocuments(initial?.documents || []);
    setCenterName(initial?.centerName || '');
    setFirstName(initial?.firstName || '');
    setLastName(initial?.lastName || '');
    setEmail(initial?.email || '');
    setUsername(initial?.username || '');
    setPassword('');
    setContactNumber(initial?.contactNumber || '');
    setAddress(initial?.address || '');
    setHeaderFileName('');
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let pass = 'Center@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readingDocuments || submitting) return;
    if (!centerName || !email || !contactNumber) {
      alert('Please fill in all required fields (Center Name, Email, Contact Number).');
      return;
    }

    setSubmitting(true);
    try {
      const finalUsername = username.trim() || email.trim();
      if (initial) {
        // Edit: keep letterhead / logo; password only when a new one is typed
        const success = await onSave({
          id: initial.id,
          documents,
          centerName: centerName.toUpperCase(),
          firstName,
          lastName,
          email,
          username: finalUsername,
          ...(password.trim() ? { password: password.trim() } : {}),
          contactNumber,
          address,
          headerTemplateUrl: initial.headerTemplateUrl,
        } as Omit<RadiologyCenter, 'id' | 'createdAt'> & { id?: string });
        if (success === false) return;
        onClose();
        return;
      }
      const finalPassword = password.trim() || 'center@123';

      const success = await onSave({
        documents,
        centerName: centerName.toUpperCase(),
        firstName,
        lastName,
        email,
        username: finalUsername,
        password: finalPassword,
        contactNumber,
        address,
        headerTemplateUrl: headerFileName
          ? `https://placehold.co/1000x200/009ef7/ffffff.png?text=${encodeURIComponent(centerName)}`
          : 'https://placehold.co/1000x200/009ef7/ffffff.png?text=RADIOLOGY+CENTER',
      });

      if (success === false) return;
      setCenterName('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setContactNumber('');
      setAddress('');
      setHeaderFileName('');
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white text-slate-900 w-full max-w-xl border border-slate-200 shadow-2xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#009ef7]/20 border border-[#009ef7]/40 text-[#009ef7]">
              <Building className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              {isEdit ? 'Edit Radiology Diagnostic Center' : 'Add Radiology Diagnostic Center'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Radiology Center Name *</label>
            <input
              type="text"
              required
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              placeholder="Enter Center Name"
              className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs uppercase"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!username) setUsername(e.target.value);
                }}
                placeholder="Email Address"
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Number *</label>
              <input
                type="text"
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Contact Number"
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Account Login Credentials Section */}
          <div className="p-4 bg-sky-50/70 border border-sky-200/90 space-y-3">
            <div className="flex items-center justify-between border-b border-sky-200/80 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-sky-900 uppercase text-[11px] font-mono">
                <Key className="w-3.5 h-3.5 text-sky-600" />
                <span>Center Portal Login Credentials</span>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="flex items-center gap-1 text-[10px] text-sky-700 hover:text-sky-900 font-mono font-bold bg-sky-100 px-2 py-0.5 border border-sky-300 cursor-pointer"
              >
                <Wand2 className="w-3 h-3" /> Auto Password
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-sky-900 mb-1">Username / Login Email *</label>
                <input
                  type="text"
                  required
                  value={username || email}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username / Login Email"
                  className="w-full px-3 py-2 border border-sky-300 bg-white text-slate-900 focus:border-sky-500 focus:outline-none text-xs font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-sky-900 mb-1">{isEdit ? 'New Password (blank = keep current)' : 'Login Password *'}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!isEdit}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEdit ? 'Leave blank to keep' : 'Set password'}
                    className="w-full pl-3 pr-9 py-2 border border-sky-300 bg-white text-slate-900 focus:border-sky-500 focus:outline-none text-xs font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="rn-icon-vcenter absolute right-2.5 top-2.5 text-sky-700 hover:text-sky-900 inline-flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Center Full Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter Center Address"
              className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
            />
          </div>

          {/* Header Template File Upload */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">
              Header Template / Letterhead Image Upload
            </label>
            <div className="border border-dashed border-slate-300 p-4 bg-slate-50 text-center relative hover:bg-slate-100 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeaderFileName(e.target.files?.[0]?.name || '')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileImage className="w-6 h-6 mx-auto text-[#009ef7] mb-1" />
              <p className="text-xs font-semibold text-slate-700">
                {headerFileName ? headerFileName : 'Upload Header Template (.png, .jpg)'}
              </p>
            </div>
          </div>

          <ProfileDocuments title="Center Documents" value={documents} onChange={setDocuments} onBusyChange={setReadingDocuments} disabled={submitting} />

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={readingDocuments || submitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#009ef7] hover:bg-[#0095e8] transition-colors cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEdit ? 'Save Changes' : 'Create Radiology Center'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
