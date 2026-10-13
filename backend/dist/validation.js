export function safeId(value) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint')
        throw new Error('ID không hợp lệ.');
    const raw = String(value);
    if (!/^[1-9]\d*$/.test(raw))
        throw new Error('ID không hợp lệ.');
    const id = Number(raw);
    if (!Number.isSafeInteger(id))
        throw new Error('ID vượt giới hạn an toàn của JavaScript.');
    return id;
}
export function pageOptions(page, size) {
    const p = page === undefined ? 1 : Number(page);
    const s = size === undefined ? 20 : Number(size);
    if (!Number.isSafeInteger(p) || p < 1 || !Number.isSafeInteger(s) || s < 1 || s > 100 ||
        !Number.isSafeInteger((p - 1) * s))
        throw new Error('Phân trang không hợp lệ.');
    return { page: p, size: s, offset: (p - 1) * s };
}
export function patientErrors(input) {
    input = input && typeof input === 'object' ? input : {};
    const errors = {};
    if (typeof input?.fullName !== 'string' || input.fullName.trim().length < 2 || input.fullName.length > 200)
        errors.fullName = ['Họ tên phải có 2–200 ký tự.'];
    if (input.dateOfBirth == null && input.birthYear == null)
        errors.birth = ['Cần ngày hoặc năm sinh.'];
    if (input.dateOfBirth != null) {
        const dob = input.dateOfBirth;
        const date = new Date(dob + 'T00:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== dob || date > new Date())
            errors.dateOfBirth = ['Ngày sinh không hợp lệ.'];
        else if (input.birthYear != null && Number(dob.slice(0, 4)) !== input.birthYear)
            errors.birthYear = ['Năm sinh không khớp ngày sinh.'];
    }
    const year = input.birthYear;
    if (year != null && (!Number.isInteger(year) || year < 1900 || year > new Date().getUTCFullYear()))
        errors.birthYear = ['Năm sinh không hợp lệ.'];
    if (input.phone != null && (typeof input.phone !== 'string' || input.phone.length > 20))
        errors.phone = ['Số liên hệ quá dài.'];
    return errors;
}
export function serviceErrors(input) {
    input = input && typeof input === 'object' ? input : {};
    const errors = {};
    if (typeof input?.code !== 'string' || !input.code.trim() || input.code.length > 40)
        errors.code = ['Mã dịch vụ phải có 1–40 ký tự.'];
    if (typeof input?.name !== 'string' || input.name.trim().length < 2 || input.name.length > 200)
        errors.name = ['Tên dịch vụ phải có 2–200 ký tự.'];
    if (typeof input?.requiresConsent !== 'boolean')
        errors.requiresConsent = ['Trường bắt buộc.'];
    return errors;
}
export function visitErrors(input) {
    input = input && typeof input === 'object' ? input : {};
    const errors = {};
    try {
        safeId(input.patientId);
    }
    catch {
        errors.patientId = ['Bệnh nhân không hợp lệ.'];
    }
    if (input.doctorUserId != null) {
        try {
            safeId(input.doctorUserId);
        }
        catch {
            errors.doctorUserId = ['Bác sĩ không hợp lệ.'];
        }
    }
    if (typeof input.branchCode !== 'string' || !input.branchCode.trim() || input.branchCode.length > 40)
        errors.branchCode = ['Mã chi nhánh không hợp lệ.'];
    if (!['STANDARD', 'FOLLOW_UP', 'WARRANTY'].includes(input.visitType))
        errors.visitType = ['Loại lượt khám không hợp lệ.'];
    return errors;
}
export function searchPattern(search) {
    if (typeof search !== 'string' || !search.trim())
        return null;
    return `%${search.trim().replaceAll('[', '[[]').replaceAll('%', '[%]').replaceAll('_', '[_]')}%`;
}
