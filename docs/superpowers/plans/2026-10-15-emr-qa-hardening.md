# EMR QA Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung kiểm thử và ràng buộc cốt lõi cho bệnh nhân, lịch hẹn/lượt khám, odontogram; cải thiện UI lâm sàng và cập nhật `Test.md` trung thực.

**Architecture:** Đặt validation thuần trong `backend/src/validators` để test nhanh, gọi từ service trước repository, và giữ kiểm tra cạnh tranh/overlap tại repository. UI chỉ phản chiếu cùng quy tắc để phản hồi sớm; backend vẫn là nguồn cưỡng chế cuối cùng.

**Tech Stack:** Node.js ESM, node:test, Express 5, Sequelize/SQL Server, React 19, Ant Design 6, Vite 7.

**Spec:** `docs/superpowers/specs/2026-10-15-emr-qa-hardening-design.md`

## Global Constraints

- Không xóa hoặc viết đè lịch sử test cũ.
- Mọi thay đổi hành vi production phải có test RED trước, GREEN sau.
- Không dùng dữ liệu bệnh nhân thật.
- Không tự suy diễn quyết định lâm sàng; đánh dấu cần bác sĩ/dược sĩ xác nhận.
- Ngày hiển thị theo `dd/MM/yyyy`; dữ liệu thời gian lưu/trao đổi theo ISO hiện hữu.

## Review Focus

- Ngày sinh biên đúng 18 tuổi, timezone và ngày tương lai.
- Hai request đặt hẹn đồng thời cho cùng bác sĩ/ghế.
- Chuyển trạng thái lượt khám bỏ bước hoặc quay ngược.
- FDI răng sữa/vĩnh viễn và mặt răng không phù hợp.
- UI mobile có thao tác được mà không che khuất cảnh báo y khoa.

---

### Task 1: Patient validation

**Files:**
- Create: `backend/src/validators/patient.js`
- Create: `backend/tests/patient-validation.test.js`
- Modify: `backend/src/services/patient-visit-service.js`
- Modify: `frontend/src/pages/patients/patients-page.jsx`

**Interfaces:**
- Produces: `validatePatientPayload(payload, { now, partial })`, trả dữ liệu normalized hoặc ném `ApiError` có code ổn định.

- [ ] Viết test RED cho tên trắng, DOB tương lai, DOB+birthYear, năm sinh ngoài biên, phone/email sai và guardian dưới 18.
- [ ] Chạy test mới, xác nhận fail do validator chưa tồn tại.
- [ ] Implement validator tối thiểu và gọi ở create/update patient.
- [ ] Chạy test mới và toàn bộ backend suite.
- [ ] Cập nhật form UI với email, guardian, rule/aria/help text và disabled future date.

### Task 2: Appointment and visit state rules

**Files:**
- Create: `backend/src/validators/appointment.js`
- Create: `backend/src/validators/visit-status.js`
- Create: `backend/tests/scheduling-validation.test.js`
- Modify: `backend/src/services/patient-visit-service.js`
- Modify: `backend/src/repositories/patient-visit-repository.js`

**Interfaces:**
- Produces: `validateAppointmentPayload(payload, { now })`, `assertVisitTransition(from, to, reason)` và repository `findAppointmentConflicts`.

- [ ] Viết test RED cho past/end-before-start, thiếu doctor, conflict doctor/room và transition sai.
- [ ] Chạy test, xác nhận fail đúng lý do.
- [ ] Implement validation và kiểm tra overlap trước create.
- [ ] Chạy test mới và suite Module 3–4.

### Task 3: Odontogram validation and general UI

**Files:**
- Create: `backend/src/validators/odontogram.js`
- Create: `backend/tests/odontogram-validation.test.js`
- Modify: `backend/src/services/clinical-service.js`
- Modify: `frontend/src/pages/emr/emr-detail-page.jsx`

**Interfaces:**
- Produces: `validateToothChart(entries, patient, { now })`, hỗ trợ FDI permanent/primary và surface codes.

- [ ] Viết test RED cho tooth invalid, surface invalid, primary tooth warning policy và duplicate tooth/surface.
- [ ] Implement validator và gọi trước update EMR/add service line.
- [ ] Mở rộng UI mixed dentition, surface selector và alert dị ứng/bệnh nền luôn thấy.
- [ ] Chạy test mới, Module 5 và frontend build.

### Task 4: Navigation/responsive/accessibility polish

**Files:**
- Modify: `frontend/src/layouts/main-layout.jsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Giữ nguyên route; nhãn không chứa mã AT/module nội bộ; sidebar collapse theo viewport và có accessible labels.

- [ ] Thay nhãn gắn dự án/AT bằng thuật ngữ tổng quát.
- [ ] Bổ sung overflow/responsive/focus-visible tối thiểu cho layout và bảng.
- [ ] Chạy frontend build; chỉ ghi manual responsive là Not tested nếu chưa có browser matrix.

### Task 5: Source-of-truth report

**Files:**
- Modify: `Test.md`

**Interfaces:**
- Bổ sung, không xóa, các mục: snapshot, test matrix, bug log, UI changes/sources, business rules, risks.

- [ ] Ghi baseline 96/96 và kết quả mới theo output thực tế.
- [ ] Ghi từng case với đủ cột yêu cầu; không điền Pass nếu chưa chạy.
- [ ] Liên kết bug với test/rule, ghi trạng thái Open/Fixed/Verified.
- [ ] Ghi rõ test UI/browser/medical CDS nào Not tested hoặc cần chuyên gia xác nhận.
- [ ] Chạy toàn bộ backend tests, frontend build và kiểm tra diff cuối.

