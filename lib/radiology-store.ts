'use client';

import { RADIOLOGY_TEMPLATES } from './radiology-templates';
import { generateUUID } from './uuid';

export type UserRole = 'SUPER_ADMIN' | 'DOCTOR' | 'MANAGER' | 'CENTER';

export function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  const str = dateStr.trim();
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    return str.replace(/\//g, '-');
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return str;
}

export type CenterPageLevel = 'none' | 'read' | 'write';

/** One centre a centre-side login can use (multi-centre accounts have several). */
export interface SessionCenterAccess {
  centerId: string;
  centerName: string;
  isAdmin: boolean;
  permissions: Partial<Record<'reports' | 'invoices' | 'templates' | 'center_info', CenterPageLevel>>;
}

export interface UserAccount {
  /** Numeric user id (from login / auth/me) */
  userId?: number;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  doctorId?: string;
  centerId?: string;
  avatar?: string;
  /** Centre logins: every linked centre with its page permissions */
  centers?: SessionCenterAccess[];
  /** Centres this user works with (all centres for staff / doctors) */
  centerCount?: number;
  /** More than one centre: show the Diagnostic Center column / filter */
  multiCenter?: boolean;
  /** Centre logins: best level per page across their centres */
  pagePermissions?: Partial<Record<'reports' | 'invoices' | 'templates' | 'center_info', CenterPageLevel>> | null;
  /** Super Admin, or Center Admin of at least one centre */
  canManageCenterUsers?: boolean;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  username?: string;
  password?: string;
  contactNumber: string;
  address?: string;
  signatureUrl?: string;
  profileFileUrl?: string;
  degree?: string;
  registrationNumber?: string;
  createdAt: string;
  /** Profile picture (stored path / URL) */
  photoUrl?: string | null;
  yearsOfExperience?: number | null;
  /** Expertise / specialisations, e.g. Neuro, MSK, Chest */
  expertise?: string[];
  cvUrl?: string | null;
  cvFileName?: string | null;
}

export interface RadiologyCenter {
  id: string;
  centerName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  username?: string;
  password?: string;
  contactNumber: string;
  address?: string;
  headerTemplateUrl?: string;
  letterheadMode?: 'header' | 'footer' | 'full-page' | 'preprinted';
  logoUrl?: string;
  createdAt: string;
}

export interface StudyReportInfo {
  id: string;
  bodyPart: string;
  modality?: string;
  reportStatus: 'PENDING' | 'DRAFT' | 'SIGNED' | string;
  status?: string;
  findings?: string | null;
  impression?: string | null;
  technique?: string | null;
  templateId?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
  signedByName?: string | null;
  claimedBy?: string | null;
  claimedByName?: string | null;
  isUrgent?: boolean;
  /** Doctor details frozen onto the report when this study was signed */
  signer?: StudySigner | null;
  /** Public read-only report link token (QR code), created at signing */
  publicToken?: string | null;
  /** Absolute public link when the server has PUBLIC_REPORT_BASE_URL set */
  publicUrl?: string | null;
}

export interface StudySigner {
  doctorId?: string | null;
  name?: string | null;
  degree?: string | null;
  registrationNumber?: string | null;
  signatureUrl?: string | null;
  signedAt?: string | null;
}

export interface XRayReport {
  id: string;
  patientNumber: string;
  fullName: string;
  age: number;
  ageUnit?: 'Years' | 'Months' | 'Days';
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  radiologyCenterId: string;
  radiologyCenterName: string;
  bodyParts: string[];
  /** Study modality: X-Ray | CT | MRI | Sonography | Blood Report */
  modality?: string;
  referringPhysicianId: string;
  referringPhysicianName: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedDoctorDegree?: string;
  assignedDoctorRegNo?: string;
  assignedDoctorIds?: string[];
  claimedByDoctorId?: string;
  claimedByDoctorName?: string;
  claimStatus?: 'UNCLAIMED' | 'CLAIMED';
  status: 'Completed' | 'Pending' | 'In Review';
  studyDate: string;
  clinicalNotes?: string;
  findings?: string;
  impression?: string;
  reportsByBodyPart?: Record<string, string>;
  impressionsByBodyPart?: Record<string, string>;
  dicomFileUrl?: string;
  dicomMetadata?: Record<string, string>;
  docContent?: string;
  dicomSnapshots?: string[];
  uploadedImages?: string[];
  clinicalHistoryImages?: string[];
  hasHeaderUrl?: boolean;
  hasNoHeaderUrl?: boolean;
  createdAt: string;
  signatureApplied?: boolean;
  isUrgent?: boolean;
  isPartial?: boolean;
  studyCount?: number;
  signedStudyCount?: number;
  pendingStudyCount?: number;
  studies?: StudyReportInfo[];
  techniquesByBodyPart?: Record<string, string>;
  progressLabel?: string;
  isPortable?: boolean;
}

export const INITIAL_DOCTORS: Doctor[] = [];

export const INITIAL_CENTERS: RadiologyCenter[] = [];

export const INITIAL_REPORTS: XRayReport[] = [];

export interface DocTemplate {
  id: string;
  title: string;
  centerId: string;
  centerName: string;
  modality: string;
  bodyPart?: string;
  findings?: string;
  impression?: string;
  content?: string;
  doctorId?: string;
  doctorName?: string;
  createdAt: string;
}

export const INITIAL_TEMPLATES: DocTemplate[] = RADIOLOGY_TEMPLATES.map((t) => ({
  id: `sys-${t.id}`,
  title: t.title,
  centerId: 'ALL',
  centerName: 'System Standard',
  modality: t.category,
  bodyPart: t.bodyPart || 'GENERAL',
  findings: t.findings,
  impression: t.impression,
  content: `<b>FINDINGS:</b><br/>${t.findings.replace(/\n/g, '<br/>')}<br/><br/><b>IMPRESSION:</b><br/>${t.impression.replace(/\n/g, '<br/>')}`,
  createdAt: new Date().toISOString(),
}));

const STORAGE_KEYS = {
  REPORTS: 'radionline_reports_v1',
  DOCTORS: 'radionline_doctors_v1',
  CENTERS: 'radionline_centers_v1',
  SESSION: 'radionline_session_v1',
  TOKEN: 'radionline_token_v1',
  TEMPLATES: 'radionline_templates_v1',
  USERS: 'radionline_users_v1',
};

export const RadiologyStore = {
  init() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DOCTORS)) {
      localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(INITIAL_DOCTORS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CENTERS)) {
      localStorage.setItem(STORAGE_KEYS.CENTERS, JSON.stringify(INITIAL_CENTERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
    }
    const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (storedUsers && /admin@radio\.com|manager@radio\.com|radio@1|manager@123/.test(storedUsers)) {
      localStorage.removeItem(STORAGE_KEYS.USERS);
    }
  },

  getUsers(): UserAccount[] {
    if (typeof window === 'undefined') return [];
    this.init();
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    return stored ? JSON.parse(stored) : [];
  },

  saveUser(userAccount: UserAccount) {
    if (typeof window === 'undefined') return;
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === userAccount.email.toLowerCase());
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...userAccount };
    } else {
      users.push(userAccount);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getSession(): UserAccount | null {
    if (typeof window === 'undefined') return null;
    this.init();
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as UserAccount;
    } catch {
      return null;
    }
  },

  setSession(user: UserAccount) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    window.dispatchEvent(new Event('radionline_session_changed'));
  },

  logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    window.dispatchEvent(new Event('radionline_session_changed'));
  },

  getReports(): XRayReport[] {
    if (typeof window === 'undefined') return INITIAL_REPORTS;
    this.init();
    const stored = localStorage.getItem(STORAGE_KEYS.REPORTS);
    const list: XRayReport[] = stored ? JSON.parse(stored) : INITIAL_REPORTS;
    const session = this.getSession();
    if (!session) return list;

    if (session.role === 'DOCTOR') {
      const docId = session.doctorId || session.email;
      return list.filter((r) => {
        const isClaimedByOther = Boolean(
          (r.claimedByDoctorId && r.claimedByDoctorId !== docId && r.claimedByDoctorId !== session.email && r.claimedByDoctorId !== 'UNCLAIMED') ||
          (r.assignedDoctorId && r.assignedDoctorId !== docId && r.assignedDoctorId !== session.email && r.assignedDoctorId !== 'ALL' && (r.status === 'In Review' || r.status === 'Completed' || r.claimStatus === 'CLAIMED')) ||
          (r.studies && r.studies.some((s) => s.claimedBy && s.claimedBy !== docId && s.claimedBy !== session.email && s.claimedBy !== 'UNCLAIMED'))
        );
        return !isClaimedByOther;
      });
    }

    if (session.role === 'CENTER') {
      const centerIds = new Set(
        session.centers?.map((c) => c.centerId) || (session.centerId ? [session.centerId] : [])
      );
      if (centerIds.size > 0) {
        return list.filter((r) => centerIds.has(r.radiologyCenterId));
      }
    }

    return list;
  },

  saveReport(report: Omit<XRayReport, 'id' | 'createdAt'> & { id?: string }) {
    if (typeof window === 'undefined') return;
    const session = this.getSession();
    if (session) {
      if (session.role === 'CENTER') {
        const centerIds = new Set(
          session.centers?.map((c) => c.centerId) || (session.centerId ? [session.centerId] : [])
        );
        if (centerIds.size > 0 && report.radiologyCenterId && !centerIds.has(report.radiologyCenterId)) {
          return;
        }
      } else if (session.role === 'DOCTOR') {
        const docId = session.doctorId || session.email;
        const isClaimedByOther = Boolean(
          (report.claimedByDoctorId && report.claimedByDoctorId !== docId && report.claimedByDoctorId !== session.email && report.claimedByDoctorId !== 'UNCLAIMED') ||
          (report.assignedDoctorId && report.assignedDoctorId !== docId && report.assignedDoctorId !== session.email && report.assignedDoctorId !== 'ALL' && (report.status === 'In Review' || report.status === 'Completed' || report.claimStatus === 'CLAIMED')) ||
          (report.studies && report.studies.some((s) => s.claimedBy && s.claimedBy !== docId && s.claimedBy !== session.email && s.claimedBy !== 'UNCLAIMED'))
        );
        if (isClaimedByOther) {
          if (report.id) {
            const rawStored = localStorage.getItem(STORAGE_KEYS.REPORTS);
            if (rawStored) {
              const all = (JSON.parse(rawStored) as XRayReport[]).filter((r) => r.id !== report.id);
              localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(all));
            }
          }
          window.dispatchEvent(new Event('radionline_reports_changed'));
          return;
        }
      }
    }
    const rawStored = localStorage.getItem(STORAGE_KEYS.REPORTS);
    const reports: XRayReport[] = rawStored ? JSON.parse(rawStored) : INITIAL_REPORTS;
    if (report.id) {
      const idx = reports.findIndex((r) => r.id === report.id);
      if (idx !== -1) {
        reports[idx] = { ...reports[idx], ...report } as XRayReport;
      }
    } else {
      const created: XRayReport = {
        ...report,
        id: generateUUID(),
        patientNumber: report.patientNumber?.trim() || '',
        createdAt: new Date().toISOString(),
      } as XRayReport;
      reports.unshift(created);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    } catch (err) {
      console.warn('LocalStorage quota exceeded. Report is saved in PostgreSQL database.', err);
    }
    window.dispatchEvent(new Event('radionline_reports_changed'));
  },

  deleteReport(id: string) {
    if (typeof window === 'undefined') return;
    const reports = this.getReports().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    window.dispatchEvent(new Event('radionline_reports_changed'));
  },

  updateReportStatus(id: string, status: 'Completed' | 'Pending' | 'In Review') {
    if (typeof window === 'undefined') return;
    const reports = this.getReports();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx !== -1) {
      reports[idx].status = status;
      if (status === 'Completed') reports[idx].signatureApplied = true;
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
      window.dispatchEvent(new Event('radionline_reports_changed'));
    }
  },

  getDoctors(): Doctor[] {
    if (typeof window === 'undefined') return INITIAL_DOCTORS;
    this.init();
    const stored = localStorage.getItem(STORAGE_KEYS.DOCTORS);
    return stored ? JSON.parse(stored) : INITIAL_DOCTORS;
  },

  saveDoctor(doctor: Omit<Doctor, 'id' | 'createdAt'> & { id?: string }) {
    if (typeof window === 'undefined') return;
    const doctors = this.getDoctors();
    let savedDoc: Doctor;
    if (doctor.id) {
      const idx = doctors.findIndex((d) => d.id === doctor.id);
      if (idx !== -1) {
        doctors[idx] = { ...doctors[idx], ...doctor } as Doctor;
        savedDoc = doctors[idx];
      } else {
        savedDoc = {
          ...doctor,
          id: generateUUID(),
          createdAt: new Date().toISOString().split('T')[0],
        } as Doctor;
        doctors.unshift(savedDoc);
      }
    } else {
      savedDoc = {
        ...doctor,
        id: generateUUID(),
        createdAt: new Date().toISOString().split('T')[0],
      } as Doctor;
      doctors.unshift(savedDoc);
    }
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));

    // Register/sync User Account credentials for Login
    const loginEmail = savedDoc.username || savedDoc.email;
    if (loginEmail && savedDoc.password) {
      this.saveUser({
        email: loginEmail,
        name: savedDoc.fullName,
        role: 'DOCTOR',
        password: savedDoc.password,
        doctorId: savedDoc.id,
      });
    }

    window.dispatchEvent(new Event('radionline_doctors_changed'));
  },

  deleteDoctor(id: string) {
    if (typeof window === 'undefined') return;
    const doctors = this.getDoctors().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
    window.dispatchEvent(new Event('radionline_doctors_changed'));
  },

  getCenters(): RadiologyCenter[] {
    if (typeof window === 'undefined') return INITIAL_CENTERS;
    this.init();
    const stored = localStorage.getItem(STORAGE_KEYS.CENTERS);
    return stored ? JSON.parse(stored) : INITIAL_CENTERS;
  },

  setCenters(centers: RadiologyCenter[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CENTERS, JSON.stringify(centers));
    window.dispatchEvent(new Event('radionline_centers_changed'));
  },

  saveCenter(center: Omit<RadiologyCenter, 'id' | 'createdAt'> & { id?: string }) {
    if (typeof window === 'undefined') return;
    const centers = this.getCenters();
    let savedCenter: RadiologyCenter;
    if (center.id) {
      const idx = centers.findIndex((c) => c.id === center.id);
      if (idx !== -1) {
        centers[idx] = { ...centers[idx], ...center } as RadiologyCenter;
        savedCenter = centers[idx];
      } else {
        savedCenter = {
          ...center,
          id: generateUUID(),
          createdAt: new Date().toISOString().split('T')[0],
        } as RadiologyCenter;
        centers.unshift(savedCenter);
      }
    } else {
      savedCenter = {
        ...center,
        id: generateUUID(),
        createdAt: new Date().toISOString().split('T')[0],
      } as RadiologyCenter;
      centers.unshift(savedCenter);
    }
    localStorage.setItem(STORAGE_KEYS.CENTERS, JSON.stringify(centers));

    // Register/sync User Account credentials for Login
    const loginEmail = savedCenter.username || savedCenter.email;
    if (loginEmail && savedCenter.password) {
      this.saveUser({
        email: loginEmail,
        name: savedCenter.centerName,
        role: 'CENTER',
        password: savedCenter.password,
        centerId: savedCenter.id,
      });
    }

    window.dispatchEvent(new Event('radionline_centers_changed'));
  },

  deleteCenter(id: string) {
    if (typeof window === 'undefined') return;
    const centers = this.getCenters().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CENTERS, JSON.stringify(centers));
    window.dispatchEvent(new Event('radionline_centers_changed'));
  },

  getTemplates(): DocTemplate[] {
    if (typeof window === 'undefined') return INITIAL_TEMPLATES;
    this.init();
    const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    const parsed: DocTemplate[] = stored ? JSON.parse(stored) : [];
    
    // Auto-merge system templates so all standard templates are always available
    const existingIds = new Set(parsed.map((t) => t.id));
    const missingSystem = INITIAL_TEMPLATES.filter((t) => !existingIds.has(t.id));
    let combined = parsed;
    if (missingSystem.length > 0) {
      combined = [...parsed, ...missingSystem];
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(combined));
    }
    if (combined.length === 0) combined = INITIAL_TEMPLATES;

    const session = this.getSession();
    if (!session) return combined;

    if (session.role === 'DOCTOR') {
      const docId = String(session.doctorId || session.userId || '').trim();
      const docName = (session.name || '').trim().toLowerCase();
      return combined.filter((t) => {
        // System standard templates (sys- prefix or no doctor ownership)
        if (t.id.startsWith('sys-') || (!t.doctorId && !t.doctorName)) {
          return true;
        }
        // If template was created by a doctor, it is strictly visible ONLY to that creator doctor!
        if (t.doctorId && docId && (t.doctorId === docId || (session.doctorId && t.doctorId === session.doctorId))) {
          return true;
        }
        if (t.doctorName && docName && t.doctorName.trim().toLowerCase() === docName) {
          return true;
        }
        // Created by Doctor A -> invisible to Doctor B!
        return false;
      });
    }

    if (session.role === 'CENTER') {
      const allowedCenters = new Set(
        session.centers?.map((c) => c.centerId) || (session.centerId ? [session.centerId] : [])
      );
      return combined.filter((t) => {
        // Centers should never see private doctor-created templates
        if (t.doctorId || (t.doctorName && !t.id.startsWith('sys-'))) {
          return false;
        }
        return (t.centerId || 'ALL') === 'ALL' || allowedCenters.has(t.centerId);
      });
    }

    return combined;
  },

  saveTemplate(template: Omit<DocTemplate, 'id' | 'createdAt'> & { id?: string }): DocTemplate {
    if (typeof window === 'undefined') return template as DocTemplate;
    const session = this.getSession();
    const docId = session?.role === 'DOCTOR' ? String(session.doctorId || session.userId || '') : undefined;
    const docName = session?.role === 'DOCTOR' ? session.name : undefined;

    const toSave: any = {
      ...template,
      doctorId: template.doctorId || docId,
      doctorName: template.doctorName || docName,
    };

    const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    const rawTemplates: DocTemplate[] = stored ? JSON.parse(stored) : [...INITIAL_TEMPLATES];

    let saved: DocTemplate;
    if (toSave.id) {
      const idx = rawTemplates.findIndex((t) => t.id === toSave.id);
      if (idx !== -1) {
        rawTemplates[idx] = { ...rawTemplates[idx], ...toSave } as DocTemplate;
        saved = rawTemplates[idx];
      } else {
        saved = {
          ...toSave,
          id: generateUUID(),
          createdAt: new Date().toISOString(),
        } as DocTemplate;
        rawTemplates.unshift(saved);
      }
    } else {
      saved = {
        ...toSave,
        id: generateUUID(),
        createdAt: new Date().toISOString(),
      } as DocTemplate;
      rawTemplates.unshift(saved);
    }
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(rawTemplates));
    window.dispatchEvent(new Event('radionline_templates_changed'));
    return saved;
  },

  deleteTemplate(id: string) {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    const rawTemplates: DocTemplate[] = stored ? JSON.parse(stored) : [];
    const remaining = rawTemplates.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(remaining));
    window.dispatchEvent(new Event('radionline_templates_changed'));
  },
};
