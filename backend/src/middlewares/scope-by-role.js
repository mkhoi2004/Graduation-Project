import { ApiError } from '../utils/api-error.js';

/**
 * Data Visibility Scoping per Section 3.2 of Prompt_Project.txt
 * - Admin: sees all data across all branches and modules (audit logged when viewing EMR/sensitive)
 * - Receptionist: sees administrative patient profiles, appointments, visits at registration, self shifts/receipts
 * - Doctor: only sees patients with assigned visits (DoctorId = doctor, state >= REGISTERED) or active TreatmentRelationships
 * - Accountant: sees billing, payments, deposits, debts, insurance claims, journals; EMR only minimal completed services
 * - Warehouse: sees stock, lots, serials, sterilization, labo; only reference patient code for traceability
 */
export function scopeByRole(user, resourceType) {
  if (!user) {
    throw ApiError.unauthorized('UNAUTHENTICATED', 'User context required for data scoping');
  }

  const role = user.role;
  const userId = user.userId;
  const branchId = user.branchId;

  switch (resourceType) {
    case 'PATIENT': {
      if (role === 'ADMIN') {
        return { isFullAccess: true };
      }
      if (role === 'RECEPTIONIST') {
        // Can view administrative profiles
        return { filter: {} };
      }
      if (role === 'DOCTOR') {
        // Requires doctor assignment or treatment relationship
        return {
          requiresDoctorRelationship: true,
          doctorId: userId,
        };
      }
      if (role === 'ACCOUNTANT') {
        // Minimal data needed for invoicing
        return { minimalBillingOnly: true };
      }
      if (role === 'WAREHOUSE') {
        // Warehouse cannot view patient records directly
        throw ApiError.forbidden('DATA_SCOPE_DENIED', 'Warehouse role cannot directly access patient profiles');
      }
      break;
    }

    case 'VISIT': {
      if (role === 'ADMIN') return { isFullAccess: true };
      if (role === 'RECEPTIONIST') return { branchId };
      if (role === 'DOCTOR') {
        return { doctorId: userId, states: ['REGISTERED', 'IN_PROGRESS', 'CLINICAL_COMPLETED', 'CLOSED'] };
      }
      if (role === 'ACCOUNTANT') return { branchId, forBilling: true };
      if (role === 'WAREHOUSE') {
        throw ApiError.forbidden('DATA_SCOPE_DENIED', 'Warehouse role cannot directly access clinical visits');
      }
      break;
    }

    case 'EMR': {
      if (role === 'ADMIN') return { isFullAccess: true, auditRequired: true };
      if (role === 'DOCTOR') return { doctorId: userId };
      // Receptionist, Accountant, Warehouse cannot view clinical EMR directly
      throw ApiError.forbidden('DATA_SCOPE_DENIED', `Role '${role}' cannot access clinical EMR records`);
    }

    case 'FINANCIAL': {
      if (role === 'ADMIN') return { isFullAccess: true, auditRequired: true };
      if (role === 'ACCOUNTANT') return { branchId, canManage: true };
      if (role === 'RECEPTIONIST') {
        // Can only view/create receipts for own shift
        return { branchId, ownCashierOnly: true, cashierId: userId };
      }
      if (role === 'DOCTOR' || role === 'WAREHOUSE') {
        throw ApiError.forbidden('DATA_SCOPE_DENIED', `Role '${role}' cannot access financial and billing records`);
      }
      break;
    }

    case 'INVENTORY': {
      if (role === 'ADMIN' || role === 'WAREHOUSE') return { isFullAccess: true };
      if (role === 'DOCTOR') {
        // Only items/lots for own clinical procedures
        return { clinicalProcedureOnly: true, doctorId: userId };
      }
      if (role === 'ACCOUNTANT') {
        // Inventory valuation / COGS only
        return { valuationOnly: true };
      }
      if (role === 'RECEPTIONIST') {
        throw ApiError.forbidden('DATA_SCOPE_DENIED', 'Receptionist role cannot access inventory management');
      }
      break;
    }

    default:
      return {};
  }
}
