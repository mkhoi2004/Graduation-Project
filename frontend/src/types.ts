export type Patient = {
  id: number;
  fullName: string;
  dateOfBirth: string | null;
  birthYear: number | null;
  phone: string | null;
  version: number;
};

export type PatientInput = Omit<Patient, 'id' | 'version'>;
export type Service = { id: number; code: string; name: string; requiresConsent: boolean; isActive: boolean };
export type Visit = {
  id: number; patientId: number; doctorUserId: number | null; branchCode: string;
  visitType: 'STANDARD' | 'FOLLOW_UP' | 'WARRANTY'; status: string; createdAt: string; version: number;
};
export type Dashboard = { patients: number; visitsToday: number; openVisits: number; pendingPayments: number };
