'use client';

import React, { useState } from 'react';
import { X, Upload, Check, UserPlus, Image as ImageIcon, Key, Lock, Eye, EyeOff, Wand2 } from 'lucide-react';
import { Doctor } from '@/lib/radiology-store';

interface AddDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doctor: Omit<Doctor, 'id' | 'createdAt'>) => void;
}

export default function AddDoctorModal({ isOpen, onClose, onSave }: AddDoctorModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [degree, setDegree] = useState('M.D. (Radiodiagnosis)');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [signatureName, setSignatureName] = useState('');
  // The chosen signature image as a data: URL (stored by the API under doctors/{id}/signature)
  const [signatureData, setSignatureData] = useState('');
  const [profileName, setProfileName] = useState('');

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let pass = 'Dr@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !contactNumber) {
      alert('Please fill in all required fields (First Name, Last Name, Email, Contact Number).');
      return;
    }

    const finalUsername = username.trim() || email.trim();
    const finalPassword = password.trim() || 'doctor@123';

    onSave({
      firstName,
      lastName,
      fullName: `DR. ${firstName.toUpperCase()} ${lastName.toUpperCase()}`,
      email,
      username: finalUsername,
      password: finalPassword,
      contactNumber,
      address,
      degree: degree.trim() || 'M.D. (Radiodiagnosis)',
      registrationNumber: registrationNumber.trim(),
      // Real uploaded image, or none (no placeholder image on reports)
      signatureUrl: signatureData || '',
    });

    setFirstName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setContactNumber('');
    setAddress('');
    setSignatureName('');
    setSignatureData('');
    setProfileName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white text-slate-900 w-full max-w-xl border border-slate-200 shadow-2xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#009ef7]/20 border border-[#009ef7]/40 text-[#009ef7]">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Add Radiologist / Doctor
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Medical Degree / Qualification</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. M.D. (Radiodiagnosis), D.N.B."
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Medical Council Reg. No.</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. MCI Reg. No. 48291"
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Account Login Credentials Section */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/90 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 uppercase text-[11px] font-mono">
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <span>Doctor Login Credentials</span>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-900 font-mono font-bold bg-amber-100 px-2 py-0.5 border border-amber-300 cursor-pointer"
              >
                <Wand2 className="w-3 h-3" /> Auto Password
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-amber-900 mb-1">Username / Login ID *</label>
                <input
                  type="text"
                  required
                  value={username || email}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username / Login ID"
                  className="w-full px-3 py-2 border border-amber-300 bg-white text-slate-900 focus:border-amber-500 focus:outline-none text-xs font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 mb-1">Login Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set password"
                    className="w-full pl-3 pr-9 py-2 border border-amber-300 bg-white text-slate-900 focus:border-amber-500 focus:outline-none text-xs font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="rn-icon-vcenter absolute right-2.5 top-2.5 text-amber-700 hover:text-amber-900 inline-flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address / Hospital Wing (Optional)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter Address"
              className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs"
            />
          </div>

          {/* Upload Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Digital Signature Image</label>
              <div className="border border-dashed border-slate-300 p-3 bg-slate-50 text-center relative hover:bg-slate-100 transition-colors">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setSignatureName('');
                    setSignatureData('');
                    if (!f) return;
                    if (f.size > 2 * 1024 * 1024) {
                      alert('The signature image must be 2 MB or smaller.');
                      e.target.value = '';
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setSignatureData(String(reader.result || ''));
                      setSignatureName(f.name);
                    };
                    reader.readAsDataURL(f);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-5 h-5 mx-auto text-[#009ef7] mb-1" />
                <span className="text-[11px] font-semibold text-slate-600">
                  {signatureName ? signatureName : 'Upload Signature (.png, .jpg)'}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Profile Photo / File</label>
              <div className="border border-dashed border-slate-300 p-3 bg-slate-50 text-center relative hover:bg-slate-100 transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setProfileName(e.target.files?.[0]?.name || '')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <ImageIcon className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <span className="text-[11px] font-semibold text-slate-600">
                  {profileName ? profileName : 'Upload Profile File'}
                </span>
              </div>
            </div>
          </div>

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
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#009ef7] hover:bg-[#0095e8] transition-colors cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Create Doctor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
