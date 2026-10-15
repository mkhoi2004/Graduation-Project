import { ApiError } from '../utils/api-error.js';

const TRANSITIONS = Object.freeze({
  REGISTERED: new Set(['IN_PROGRESS', 'ON_HOLD', 'CANCELLED']),
  ON_HOLD: new Set(['IN_PROGRESS', 'CANCELLED']),
  IN_PROGRESS: new Set(['CLINICAL_COMPLETED', 'ON_HOLD', 'CANCELLED']),
  CLINICAL_COMPLETED: new Set(['CLOSED']),
  CLOSED: new Set(),
  CANCELLED: new Set(),
});

export function assertVisitTransition(fromStatus, toStatus, reason) {
  if (!Object.hasOwn(TRANSITIONS, toStatus)) {
    throw ApiError.badRequest('INVALID_STATUS', `Trạng thái lượt khám không hợp lệ: ${toStatus}`);
  }
  if (['ON_HOLD', 'CANCELLED'].includes(toStatus) && !String(reason ?? '').trim()) {
    throw ApiError.badRequest('VISIT_STATUS_REASON_REQUIRED', 'Tạm hoãn hoặc hủy lượt khám bắt buộc có lý do');
  }
  if (!TRANSITIONS[fromStatus]?.has(toStatus)) {
    throw ApiError.conflict(
      'INVALID_VISIT_STATUS_TRANSITION',
      `Không thể chuyển trạng thái lượt khám từ ${fromStatus} sang ${toStatus}`,
    );
  }
}

