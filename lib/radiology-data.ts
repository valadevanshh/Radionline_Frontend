export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  contactNumber: string;
  address?: string;
  signatureUrl?: string;
  profileFileUrl?: string;
  createdAt: string;
}

export interface RadiologyCenter {
  id: string;
  centerName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  contactNumber: string;
  address?: string;
  headerTemplateUrl?: string;
  logoUrl?: string;
  createdAt: string;
}

export interface XRayReport {
  id: string;
  patientNumber: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  radiologyCenterId: string;
  radiologyCenterName: string;
  bodyParts: string[];
  referringPhysicianId: string;
  referringPhysicianName: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  status: 'Completed' | 'Pending' | 'In Review';
  studyDate: string;
  clinicalNotes?: string;
  findings?: string;
  impression?: string;
  hasHeaderUrl?: boolean;
  hasNoHeaderUrl?: boolean;
  createdAt: string;
}

export const INITIAL_DOCTORS: Doctor[] = [];

export const INITIAL_CENTERS: RadiologyCenter[] = [];

export const INITIAL_REPORTS: XRayReport[] = [];
