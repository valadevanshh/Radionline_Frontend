import { XRayReport, Doctor, RadiologyCenter, DocTemplate, UserAccount } from './radiology-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
/** Origin without /api suffix — used for /api/files/... media URLs */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

// Live-updates socket. Uses NEXT_PUBLIC_WS_URL when set; otherwise derives it from the API origin
// (http -> ws, https -> wss) so a deployment that only sets NEXT_PUBLIC_API_URL still gets live updates.
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || `${API_ORIGIN.replace(/^http/, 'ws')}/ws`;
const TOKEN_KEY = 'radionline_token_v1';

/** Turn DB path or /api/files/... into a browser-loadable URL (img, PDF, etc.). */
export function resolveMediaUrl(ref?: string | null): string {
  if (!ref) return '';
  const raw = ref.trim();
  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (raw.startsWith('/api/files/')) {
    return `${API_ORIGIN}${raw}`;
  }
  if (/^\d{4}\/\d{2}\/\d{2}\//.test(raw)) {
    return `${API_ORIGIN}/api/files/${raw}`;
  }
  return raw;
}

/** First-study / each-additional-study amounts in whole rupees. */
export interface RateCard {
  center: { firstStudy: number; additionalStudy: number };
  doctor: { firstStudy: number; additionalStudy: number };
}

export interface CenterPricing extends RateCard {
  centerId: string;
  centerName: string;
  currency: string;
  isDefault: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface CenterPricingUpdate {
  centerFirstStudy: number;
  centerAdditionalStudy: number;
  doctorFirstStudy: number;
  doctorAdditionalStudy: number;
}

/** Public read-only report behind a QR token. No login: plain fetch, no auth header. */
export async function fetchPublicReport(token: string): Promise<PublicReport> {
  const res = await fetch(`${API_BASE_URL}/public/reports/${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.detail || '';
    } catch {}
    throw new Error(detail || `Report could not be loaded (${res.status})`);
  }
  return res.json();
}

export interface PublicReport {
  center: { name: string; address?: string | null; phone?: string | null; logoUrl?: string | null };
  patient: {
    name: string;
    patientId: string;
    age: number;
    ageUnit?: string;
    gender: string;
    studyDate: string;
    referringDoctor?: string | null;
  };
  study: {
    modality: string;
    bodyPart: string;
    title: string;
    technique: string;
    findings: string;
    impression: string;
    clinicalHistory: string;
    signedAt?: string | null;
  };
  signer: {
    name?: string | null;
    degree?: string | null;
    registrationNumber?: string | null;
    signatureUrl?: string | null;
    signedAt?: string | null;
  };
}

/** Link printed in the report QR code: server base URL when configured, else this site's origin. */
export function publicReportLink(study?: { publicToken?: string | null; publicUrl?: string | null } | null): string {
  if (!study?.publicToken) return '';
  if (study.publicUrl) return study.publicUrl;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/r/${encodeURIComponent(study.publicToken)}`;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function forceLogoutOnUnauthorized() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('radionline_session_v1');
  window.dispatchEvent(new Event('radionline_session_changed'));
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  const token = getAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && endpoint !== '/auth/login') {
    forceLogoutOnUnauthorized();
    const errorText = await res.text();
    throw new Error(`API error 401: ${errorText}`);
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

/**
 * Turn an Error thrown by fetchJson ("API error 409: {"detail":"..."}") into a short,
 * human message: the server's detail when it sent one, else the fallback plus the status.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const m = raw.match(/^API error (\d{3}): ([\s\S]*)$/);
  if (!m) return /failed to fetch|networkerror|load failed/i.test(raw) ? `${fallback} (cannot reach the server)` : fallback;
  const [, code, body] = m;
  try {
    const j = JSON.parse(body);
    const d = j?.detail;
    if (typeof d === 'string' && d.trim()) return d.trim();
    if (Array.isArray(d) && d[0]?.msg) return `${fallback} (${d[0].msg})`;
  } catch {
    /* body was not JSON */
  }
  return `${fallback} (server error ${code})`;
}

export interface DoctorProfileUpdate {
  degree?: string;
  registrationNumber?: string;
  signatureUrl?: string;
}

export interface PendingApproval {
  id: string;
  managerId: string;
  managerName: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  payload: Record<string, any>;
  /** Priority 7: current DB values for before/after approval diffs */
  before?: Record<string, any> | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface RevenueSummary {
  currency: string;
  currentPeriod: string;
  currentMonth: {
    period: string;
    centerBilling: number;
    doctorPayouts: number;
    net: number;
    centerPaid: number;
    centerPending: number;
    doctorPaid: number;
    doctorPending: number;
    centerInvoiceCount: number;
    doctorInvoiceCount: number;
    currency: string;
  };
  trend: Array<{
    period: string;
    centerBilling: number;
    doctorPayouts: number;
    net: number;
    centerPaid: number;
    centerPending: number;
    doctorPaid: number;
    doctorPending: number;
  }>;
  assumption?: string;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  user: UserAccount;
}

export interface MyWorkItem extends XRayReport {
  studyCount?: number;
  workDate?: string;
}

export interface MyWorkResponse {
  items: MyWorkItem[];
  total: number;
  page: number;
  page_size: number;
  dateField?: string;
  centers?: Array<{ id: string; name: string }>;
}



export type ReportCommentKind = 'FLAG' | 'REASSIGN' | 'RECHECK' | 'COMMENT';

export interface ReportComment {
  id: number;
  caseId: string;
  studyId?: string | null;
  authorUserId?: number | null;
  authorRole: string;
  authorName: string;
  kind: ReportCommentKind | string;
  body: string;
  fromDoctorId?: string | null;
  toDoctorId?: string | null;
  createdAt: string;
}

// Per-user bell notification (case reassigned to me, new Case Activity message)
export type UserNotificationKind = 'CASE_REASSIGNED' | 'CASE_MESSAGE';

export interface UserNotification {
  id: number;
  userId: number;
  kind: UserNotificationKind | string;
  title: string;
  body?: string | null;
  caseId?: string | null;
  link?: string | null;
  actorUserId?: number | null;
  actorName?: string | null;
  createdAt: string;
  readAt?: string | null;
}

/** A Manager's edit / delete is staged for Super Admin approval: the API answers 202 with this body. */
export interface PendingApprovalResult {
  pendingApproval: true;
  message: string;
  approval: PendingApproval;
}

export function isPendingApproval(x: unknown): x is PendingApprovalResult {
  return !!x && typeof x === 'object' && (x as any).pendingApproval === true;
}

/** Patient details editable after upload (row Edit). Centre / modality / body parts are fixed. */
export interface CaseDetailsUpdate {
  fullName?: string;
  age?: number;
  ageUnit?: 'Years' | 'Months' | 'Days';
  gender?: 'Male' | 'Female' | 'Other';
  phone?: string;
  referringPhysicianName?: string;
  clinicalNotes?: string;
  isUrgent?: boolean;
  isPortable?: boolean;
  /** stored file paths from uploadFile (or data: URLs) */
  addImages?: string[];
}

export interface CaseDetailsUpdateResult {
  updated: boolean;
  message?: string;
  changes?: Record<string, unknown>;
  addedImages?: number;
  report?: XRayReport;
}

/** Persistent PACS mark (arrow) on one case image; coordinates are 0..1000 of the image. */
export interface ImageAnnotation {
  id: number;
  caseId: string;
  imageKey: string;
  kind: 'arrow' | string;
  data: { x1: number; y1: number; x2: number; y2: number };
  authorUserId?: number | null;
  authorName?: string | null;
  authorRole?: string | null;
  createdAt: string;
}

export type PageLevel = 'none' | 'read' | 'write';
export type CenterPage = 'reports' | 'invoices' | 'templates' | 'center_info';

export interface CenterAccessLink {
  centerId: string;
  centerName?: string;
  isAdmin: boolean;
  permissions: Partial<Record<CenterPage, PageLevel>>;
}

export interface CenterUserRow {
  id: number;
  email: string;
  name: string;
  primaryCenterId?: string | null;
  centers: CenterAccessLink[];
  otherCenterCount: number;
  canEditLogin: boolean;
}

export interface CenterUsersResponse {
  users: CenterUserRow[];
  manageableCenters: Array<{ centerId: string; centerName: string }>;
  pages: CenterPage[];
  currentUserId: number;
}

export const ApiClient = {
  // Health
  async getHealth() {
    return fetchJson<{ status: string; service: string; database: string }>('/health');
  },

  // Auth & Users
  async login(credentials: { email: string; password: string }) {
    const result = await fetchJson<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setAccessToken(result.access_token);
    return result;
  },

  logout() {
    setAccessToken(null);
  },

  /** Current user + centre access (refreshes the stored session). */
  async getMe() {
    return fetchJson<UserAccount>('/auth/me');
  },

  async getUsers() {
    return fetchJson<UserAccount[]>('/auth/users');
  },

  async saveUser(user: UserAccount) {
    return fetchJson<UserAccount>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  // Reports
  async getReports() {
    return fetchJson<XRayReport[]>('/reports');
  },

  async getMyWork(params?: {
    status?: string;
    from?: string;
    to?: string;
    center?: string;
    page?: number;
    pageSize?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.from) q.append('from', params.from);
    if (params?.to) q.append('to', params.to);
    if (params?.center) q.append('center', params.center);
    if (params?.page != null) q.append('page', String(params.page));
    if (params?.pageSize != null) q.append('page_size', String(params.pageSize));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<MyWorkResponse>(`/reports/my-work${qs}`);
  },


  async getReportById(id: string) {
    return fetchJson<XRayReport>(`/reports/${id}`);
  },


  async getMyPartialCases() {
    return fetchJson<{ items: Array<{
      id: string;
      patientName: string;
      patientNumber: string;
      signedStudyCount: number;
      studyCount: number;
      pendingStudyCount: number;
      pendingBodyParts: string[];
    }>; total: number }>('/reports/my-partial-cases');
  },

  async saveStudyDraft(caseId: string, studyId: string, payload: {
    findings?: string;
    impression?: string;
    technique?: string;
    templateId?: string;
    clinicalNotes?: string;
    docContent?: string;
    dicomSnapshots?: string[];
  }) {
    return fetchJson<any>(`/reports/${caseId}/studies/${studyId}/draft`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async signStudyReport(caseId: string, studyId: string, payload: {
    findings?: string;
    impression?: string;
    technique?: string;
    templateId?: string;
    clinicalNotes?: string;
    docContent?: string;
    dicomSnapshots?: string[];
    title?: string;
  }) {
    return fetchJson<{
      ok: boolean;
      toast: string;
      studyId: string;
      bodyPart: string;
      reportStatus: string;
      nextStudyId?: string | null;
      nextBodyPart?: string | null;
      caseComplete: boolean;
      signedStudyCount: number;
      studyCount: number;
      pendingStudyCount: number;
      billing?: any;
      notified?: boolean;
      report?: XRayReport;
    }>(`/reports/${caseId}/studies/${studyId}/sign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },


  async saveReport(report: Partial<XRayReport>) {
    return fetchJson<XRayReport & Partial<PendingApprovalResult>>('/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  },

  async claimReport(reportId: string, doctorId: string, doctorName: string) {
    return fetchJson<XRayReport>(`/reports/${reportId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ doctorId, doctorName }),
    });
  },

  async rejectReport(reportId: string, doctorId: string, reason?: string) {
    return fetchJson<{ status: string; message: string }>(`/reports/${reportId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ doctorId, reason: reason || 'Doctor declined study' }),
    });
  },

  /** Super Admin: deleted ({}). Manager: PendingApprovalResult (202). */
  async deleteReport(id: string) {
    return fetchJson<PendingApprovalResult | Record<string, never>>(`/reports/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** Row Edit: patient details. Manager: PendingApprovalResult (202). */
  async updateCaseDetails(id: string, body: CaseDetailsUpdate) {
    return fetchJson<CaseDetailsUpdateResult | PendingApprovalResult>(`/reports/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // PACS image marks (arrows)
  async getAnnotations(caseId: string) {
    return fetchJson<ImageAnnotation[]>(`/reports/${encodeURIComponent(caseId)}/annotations`);
  },

  async addAnnotation(caseId: string, body: { imageKey: string; kind: 'arrow'; data: ImageAnnotation['data'] }) {
    return fetchJson<ImageAnnotation>(`/reports/${encodeURIComponent(caseId)}/annotations`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async deleteAnnotation(caseId: string, annotationId: number) {
    return fetchJson<{ ok: boolean }>(`/reports/${encodeURIComponent(caseId)}/annotations/${annotationId}`, {
      method: 'DELETE',
    });
  },

  // Centre users (Center Admin / Super Admin)
  async getCenterUsers() {
    return fetchJson<CenterUsersResponse>('/center-users');
  },

  async createCenterUser(body: { name?: string; email: string; password?: string; centers: CenterAccessLink[] }) {
    return fetchJson<{ linkedExisting: boolean; user: CenterUserRow }>('/center-users', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateCenterUser(userId: number, body: { name?: string; password?: string; centers: CenterAccessLink[] }) {
    return fetchJson<{ user: CenterUserRow }>(`/center-users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async unlinkCenterUser(userId: number, centerId: string) {
    return fetchJson<{ ok: boolean }>(`/center-users/${userId}/centers/${encodeURIComponent(centerId)}`, {
      method: 'DELETE',
    });
  },

  /** Centre details / letterhead (Super Admin, or Center Info = write for that centre). */
  async updateCenterProfile(centerId: string, body: Partial<RadiologyCenter>) {
    return fetchJson<RadiologyCenter>(`/centers/${encodeURIComponent(centerId)}/profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // Doctors
  async getDoctors() {
    return fetchJson<Doctor[]>('/doctors');
  },

  async saveDoctor(doctor: Partial<Doctor>) {
    return fetchJson<Doctor & Partial<PendingApprovalResult>>('/doctors', {
      method: 'POST',
      body: JSON.stringify(doctor),
    });
  },

  // Public QR link of a signed study (Super Admin): withdraw it
  async revokePublicLink(caseId: string, studyId: string) {
    return fetchJson<{ ok: boolean; revoked: boolean; studyId: string }>(
      `/reports/${encodeURIComponent(caseId)}/studies/${encodeURIComponent(studyId)}/public-link/revoke`,
      { method: 'POST' }
    );
  },

  // Report signature details (degree / reg no / signature image).
  // signatureUrl: a data: URL uploads a new image, '' removes it, omit to keep it.
  async getMyDoctorProfile() {
    return fetchJson<Doctor>('/doctors/me');
  },

  async updateMyDoctorProfile(body: DoctorProfileUpdate) {
    return fetchJson<Doctor>('/doctors/me/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async updateDoctorProfile(doctorId: string, body: DoctorProfileUpdate) {
    return fetchJson<Doctor>(`/doctors/${encodeURIComponent(doctorId)}/profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /** Super Admin: deleted ({}). Manager: PendingApprovalResult (202). */
  async deleteDoctor(id: string) {
    return fetchJson<PendingApprovalResult | Record<string, never>>(`/doctors/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Centers
  async getCenters() {
    return fetchJson<RadiologyCenter[]>('/centers');
  },

  async saveCenter(center: Partial<RadiologyCenter>) {
    return fetchJson<RadiologyCenter & Partial<PendingApprovalResult>>('/centers', {
      method: 'POST',
      body: JSON.stringify(center),
    });
  },

  /** Super Admin: deleted ({}). Manager: PendingApprovalResult (202). */
  async deleteCenter(id: string) {
    return fetchJson<PendingApprovalResult | Record<string, never>>(`/centers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** Upload binary to KV2/disk; returns relative path + public URL. */
  async uploadFile(
    file: File,
    opts: { category: 'cases' | 'doctors' | 'centers'; entityId: string; subfolder?: string },
  ): Promise<{ path: string; url: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('category', opts.category);
    form.append('entity_id', opts.entityId);
    form.append('subfolder', opts.subfolder || 'uploads');

    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload failed ${res.status}: ${err}`);
    }
    return res.json();
  },

  /** uploadFile with progress (0..1) for the Upload Image dialog. */
  uploadFileWithProgress(
    file: Blob,
    filename: string,
    opts: { category: 'cases' | 'doctors' | 'centers'; entityId: string; subfolder?: string },
    onProgress?: (fraction: number) => void,
  ): Promise<{ path: string; url: string }> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file, filename);
      form.append('category', opts.category);
      form.append('entity_id', opts.entityId);
      form.append('subfolder', opts.subfolder || 'uploads');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/files/upload`);
      const token = getAccessToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status === 401) {
          forceLogoutOnUnauthorized();
          reject(new Error(`API error 401: ${xhr.responseText}`));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            onProgress?.(1);
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Upload failed: bad server response'));
          }
        } else {
          reject(new Error(`API error ${xhr.status}: ${xhr.responseText}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed: network error'));
      xhr.send(form);
    });
  },

  // Templates
  async getTemplates() {
    return fetchJson<DocTemplate[]>('/templates');
  },

  async saveTemplate(template: Partial<DocTemplate>) {
    return fetchJson<DocTemplate & Partial<PendingApprovalResult>>('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  },

  /** Super Admin: deleted ({}). Manager: PendingApprovalResult (202). */
  async deleteTemplate(id: string) {
    return fetchJson<PendingApprovalResult | Record<string, never>>(`/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },


  async matchTemplate(modality: string, bodyPart: string): Promise<DocTemplate | null> {
    const params = new URLSearchParams({
      modality: modality.trim(),
      bodyPart: bodyPart.trim(),
    });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/templates/match?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (res.status === 401) {
      forceLogoutOnUnauthorized();
      throw new Error('API error 401: Unauthorized');
    }
    if (res.status === 204 || res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API error ${res.status}: ${errorText}`);
    }
    return res.json();
  },

  // Approvals
  async getApprovals(status?: string, managerId?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (managerId) params.append('managerId', managerId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<PendingApproval[]>(`/approvals${queryString}`);
  },

  async submitApproval(data: {
    managerId: string;
    managerName: string;
    actionType: string;
    entityType: string;
    entityId?: string;
    payload: Record<string, any>;
  }) {
    return fetchJson<PendingApproval>('/approvals/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async approveChange(approvalId: string, reviewerName?: string) {
    return fetchJson<PendingApproval>(`/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewerName: reviewerName || 'Super Admin' }),
    });
  },

  async rejectChange(approvalId: string, rejectionReason: string, reviewerName?: string) {
    return fetchJson<PendingApproval>(`/approvals/${approvalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewerName: reviewerName || 'Super Admin', rejectionReason }),
    });
  },

  // Invoices & Billing
  async getPricing(centerId?: string) {
    return fetchJson<{
      currency: string;
      center: { firstStudy: number; additionalStudy: number };
      doctor: { firstStudy: number; additionalStudy: number };
      isDefault?: boolean;
      variesByCenter?: boolean;
      allowedModalities: string[];
    }>(`/billing/pricing${centerId ? `?centerId=${encodeURIComponent(centerId)}` : ''}`);
  },

  /** Super Admin: every centre's rate card (defaults where none is set). */
  async getCenterPricing() {
    return fetchJson<{ default: RateCard; centers: CenterPricing[] }>('/billing/center-pricing');
  },

  /** Super Admin: set one centre's rates. Applies to cases signed from now on. */
  async updateCenterPricing(centerId: string, body: CenterPricingUpdate) {
    return fetchJson<CenterPricing>(`/billing/center-pricing/${encodeURIComponent(centerId)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async getBillingPeriods() {
    return fetchJson<Array<{
      period: string;
      locked: boolean;
      lockedAt?: string | null;
      lockedBy?: string | null;
      effectiveStatusHint?: string;
    }>>('/billing/periods');
  },

  async lockBillingPeriod(period: string, unlock = false) {
    return fetchJson<{ period: string; locked: boolean; invoicesFinalized?: number }>(
      '/billing/lock-period',
      {
        method: 'POST',
        body: JSON.stringify({ period, unlock }),
      }
    );
  },

  async getInvoices(params?: {
    partyType?: string;
    partyId?: string;
    period?: string;
    status?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.partyType) q.append('partyType', params.partyType);
    if (params?.partyId) q.append('partyId', params.partyId);
    if (params?.period) q.append('period', params.period);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<any[]>(`/invoices${qs}`);
  },

  async getInvoice(id: string) {
    return fetchJson<any>(`/invoices/${id}`);
  },

  async updateInvoiceStatus(id: string, status: 'paid' | 'pending') {
    return fetchJson<any>(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Priority 7: Super Admin revenue

  async getRevenueSummary(months = 6) {
    return fetchJson<RevenueSummary>(`/billing/revenue?months=${months}`);
  },

  // Priority 6: case activity thread / flag-reassign / recheck
  async getReportComments(reportId: string) {
    return fetchJson<ReportComment[]>('/reports/' + reportId + '/comments');
  },

  // Bell notifications for the logged-in user
  async getMyNotifications() {
    return fetchJson<{ items: UserNotification[]; unread: number }>('/notifications');
  },

  async markNotificationRead(id: number) {
    return fetchJson<UserNotification>('/notifications/' + id + '/read', { method: 'POST' });
  },

  async markAllNotificationsRead() {
    return fetchJson<{ ok: boolean; updated: number }>('/notifications/read-all', { method: 'POST' });
  },

  async addReportComment(reportId: string, body: string) {
    return fetchJson<ReportComment>('/reports/' + reportId + '/comments', {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  async flagReassignReport(reportId: string, reason: string, toDoctorId: string) {
    return fetchJson<{
      status: string;
      caseId: string;
      claimedBy: string;
      claimedByName: string;
      fromDoctorId?: string | null;
      flag: ReportComment;
      reassign: ReportComment;
    }>('/reports/' + reportId + '/flag-reassign', {
      method: 'POST',
      body: JSON.stringify({ reason, toDoctorId }),
    });
  },

  async requestRecheck(reportId: string, reason: string) {
    return fetchJson<{
      status: string;
      caseId: string;
      recheck: ReportComment;
    }>('/reports/' + reportId + '/recheck', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },


};
