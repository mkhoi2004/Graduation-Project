import { ApiError } from '../utils/api-error.js';

const PERMANENT_QUADRANTS = new Set(['1', '2', '3', '4']);
const PRIMARY_QUADRANTS = new Set(['5', '6', '7', '8']);
const SURFACES = new Set(['M', 'O', 'I', 'D', 'B', 'F', 'L', 'P']);

function classifyTooth(toothCode) {
  const code = String(toothCode ?? '').trim();
  if (!/^\d{2}$/.test(code)) return null;
  const quadrant = code[0];
  const position = Number(code[1]);
  if (PERMANENT_QUADRANTS.has(quadrant) && position >= 1 && position <= 8) {
    return { code, dentition: 'PERMANENT', position, posterior: position >= 4 };
  }
  if (PRIMARY_QUADRANTS.has(quadrant) && position >= 1 && position <= 5) {
    return { code, dentition: 'PRIMARY', position, posterior: position >= 4 };
  }
  return null;
}

function patientAge(patient, now) {
  if (patient?.dateOfBirth) {
    const birth = new Date(`${patient.dateOfBirth}T00:00:00`);
    if (!Number.isNaN(birth.getTime())) {
      let age = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
      return age;
    }
  }
  if (patient?.birthYear) return now.getFullYear() - Number(patient.birthYear);
  return null;
}

export function validateToothCode(toothCode) {
  const tooth = classifyTooth(toothCode);
  if (!tooth) {
    throw ApiError.badRequest('INVALID_FDI_TOOTH', 'Số răng không hợp lệ theo FDI (11–48 hoặc 51–85)');
  }
  return tooth;
}

export function validateToothChart(entries, patient = {}, { now = new Date() } = {}) {
  if (!Array.isArray(entries)) {
    throw ApiError.badRequest('INVALID_TOOTH_CHART', 'Dữ liệu odontogram phải là một danh sách');
  }

  const warnings = [];
  const seen = new Set();
  const age = patientAge(patient, now);
  const normalized = entries.map(entry => {
    const tooth = validateToothCode(entry?.toothCode);
    const findingCode = String(entry?.findingCode ?? '').trim().toUpperCase();
    if (!findingCode) {
      throw ApiError.badRequest('TOOTH_FINDING_REQUIRED', `Răng ${tooth.code} chưa có tình trạng`);
    }

    const surfaceCode = entry?.surfaceCode ? String(entry.surfaceCode).trim().toUpperCase() : null;
    if (surfaceCode && !SURFACES.has(surfaceCode)) {
      throw ApiError.badRequest('INVALID_TOOTH_SURFACE', `Mặt răng ${surfaceCode} không hợp lệ`);
    }
    if (surfaceCode === 'O' && !tooth.posterior) {
      throw ApiError.badRequest('TOOTH_SURFACE_NOT_APPLICABLE', `Răng ${tooth.code} không có mặt nhai O`);
    }
    if (surfaceCode === 'I' && tooth.posterior) {
      throw ApiError.badRequest('TOOTH_SURFACE_NOT_APPLICABLE', `Răng ${tooth.code} không có rìa cắn I`);
    }
    if (findingCode === 'CARIES' && !surfaceCode) {
      throw ApiError.badRequest('TOOTH_SURFACE_REQUIRED', `Sâu răng tại răng ${tooth.code} phải ghi rõ mặt răng`);
    }

    const uniqueKey = `${tooth.code}:${surfaceCode || 'WHOLE'}`;
    if (seen.has(uniqueKey)) {
      throw ApiError.badRequest('DUPLICATE_TOOTH_SURFACE', `Trùng tình trạng răng ${tooth.code}, mặt ${surfaceCode || 'toàn răng'}`);
    }
    seen.add(uniqueKey);

    if (tooth.dentition === 'PRIMARY' && age !== null && age >= 18) {
      warnings.push({
        code: 'PRIMARY_TOOTH_ADULT_WARNING',
        toothCode: tooth.code,
        message: `Răng sữa ${tooth.code} được ghi nhận ở bệnh nhân từ 18 tuổi; cần bác sĩ xác nhận răng sữa lưu giữ`,
      });
    }

    return {
      ...entry,
      toothCode: tooth.code,
      surfaceCode,
      findingCode,
      note: entry?.note ? String(entry.note).trim() : null,
    };
  });

  return { entries: normalized, warnings };
}

