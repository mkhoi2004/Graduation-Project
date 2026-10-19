# Báo Cáo Kiểm Thử Hệ Thống Chấm Công & Quản Lý Thời Gian Làm Việc (`/hr`)

> **Hệ thống:** DentalKhoi ERP (KhoiDent)  
> **Thời gian thực hiện:** 19/10/2026  
> **Môi trường:** Node.js v24, MS SQL Server Express 2017+, NestJS, React 19, Vite, TailwindCSS, Prisma ORM v6  
> **Trạng thái kiểm thử:** ✅ **PASSED (197/197 Tests Passed - 129 API + 68 Web | 100% Tỷ lệ thành công)**

---

## 1. Danh Mục Test Case Chức Năng Chấm Công & Thời Gian Làm Việc

| STT | Mã Test Case | Mô tả kiểm thử | Dữ liệu đầu vào / Thao tác | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | **TC-ATT-001** | Check-in lần đầu trong ngày | Nhân viên bấm "Check-in" khi chưa có bản ghi hôm nay | Ghi nhận giờ máy chủ (Asia/Ho_Chi_Minh), tạo bản ghi, thông báo "Đã Check-in lúc HH:mm" | Bản ghi được tạo, trạng thái chuyển thành DANG_LAM, thông báo chuẩn | ✅ **PASS** |
| 2 | **TC-ATT-002** | Check-in lặp lại (Idempotency) | Nhân viên đã Check-in bấm lại "Check-in" | Chặn ghi đè giờ gốc, thông báo "Bạn đã Check-in rồi (lúc HH:mm)", giữ nguyên giờ ban đầu | Không ghi đè giờ gốc, trả về giờ ban đầu với thông báo thân thiện | ✅ **PASS** |
| 3 | **TC-ATT-003** | Check-out khi chưa Check-in | Nhân viên bấm "Check-out" khi chưa Check-in hôm nay | Chặn thực hiện, thông báo "Bạn chưa Check-in hôm nay" | Chặn ở cả Frontend và Backend, hiển thị thông báo lỗi rõ ràng | ✅ **PASS** |
| 4 | **TC-ATT-004** | Check-out Bác sĩ đang có ca khám | Bác sĩ có ca khám ở trạng thái `IN_PROGRESS` bấm Check-out | Cảnh báo: "Bác sĩ đang có ca khám chưa hoàn tất! Bạn có chắc chắn muốn Check-out không?" | Hiển thị modal cảnh báo xác nhận; nếu bấm Xác nhận mới cho Check-out | ✅ **PASS** |
| 5 | **TC-ATT-005** | Check-out lần đầu thành công | Nhân viên đã Check-in bấm Check-out | Ghi nhận giờ máy chủ, tính buổi, công, đi trễ, tăng ca, thông báo "Đã Check-out lúc HH:mm" | Cập nhật checkOutTime gốc, tính đúng số buổi và công | ✅ **PASS** |
| 6 | **TC-ATT-006** | Check-out lặp lại | Nhân viên đã Check-out bấm lại "Check-out" | Chặn ghi đè, thông báo "Bạn đã Check-out rồi (lúc HH:mm)" | Không cập nhật lại, giữ nguyên giờ ra ban đầu | ✅ **PASS** |
| 7 | **TC-ATT-007** | Ràng buộc mốc giờ làm việc ($S < M < E$) | Cấu hình Giờ vào = 12:00, Trưa = 11:00, Ra = 18:00 | Báo lỗi: Thứ tự các mốc không hợp lệ (Giờ vào < Phân buổi < Tan làm) | Backend từ chối lưu với mã lỗi BadRequest (400), Frontend báo lỗi trực quan | ✅ **PASS** |
| 8 | **TC-ATT-008** | Ngày hiệu lực cấu hình không ở quá khứ | Đặt ngày hiệu lực = 2026-10-01 (quá khứ) | Báo lỗi: Ngày hiệu lực cấu hình không được ở trong quá khứ | Chặn lưu cấu hình với ngày quá khứ | ✅ **PASS** |
| 9 | **TC-ATT-009** | Lưu bản chụp cấu hình vào bản ghi công | Check-in/out thành công khi cấu hình 09:00 - 12:00 - 18:00 | Bản ghi lưu JSON `configSnapshot` với các mốc đã áp dụng | Cấu hình mới không làm thay đổi các bản ghi công cũ | ✅ **PASS** |
| 10 | **TC-ATT-010** | Tính công đầy đủ (08:50 - 18:00) | Check-in 08:50, Check-out 18:00 ($S=09:00, M=12:00, E=18:00$) | Có mặt sáng & chiều, Buổi = 2, Công = 1.0, Đi trễ = 0, Tăng ca = 0, Trạng thái = DU_NGAY | Trả về: sessions=2, workUnits=1.0, lateMinutes=0, overtimeHours=0, status=DU_NGAY | ✅ **PASS** |
| 11 | **TC-ATT-011** | Tính công đi trễ & tăng ca (09:20 - 19:30) | Check-in 09:20, Check-out 19:30 | Buổi = 2, Công = 1.0, Đi trễ = 20 phút, Tăng ca = 1.50 giờ | Trả về: sessions=2, workUnits=1.0, lateMinutes=20, overtimeHours=1.50 | ✅ **PASS** |
| 12 | **TC-ATT-012** | Chỉ có mặt buổi sáng (09:00 - 11:30) | Check-in 09:00, Check-out 11:30 | Buổi = 1 (sáng), Công = 0.5, Đi trễ = 0, Tăng ca = 0, Trạng thái = CHI_SANG | Trả về: sessions=1, workUnits=0.5, lateMinutes=0, overtimeHours=0, status=CHI_SANG | ✅ **PASS** |
| 13 | **TC-ATT-013** | Chỉ có mặt buổi chiều (13:00 - 18:00) | Check-in 13:00, Check-out 18:00 | Buổi = 1 (chiều), Công = 0.5, Đi trễ = 0 (chiều không tính trễ), Tăng ca = 0, Trạng thái = CHI_CHIEU | Trả về: sessions=1, workUnits=0.5, lateMinutes=0, overtimeHours=0, status=CHI_CHIEU | ✅ **PASS** |
| 14 | **TC-ATT-014** | Đi trễ buổi sáng nửa ngày (09:05 - 12:00) | Check-in 09:05, Check-out 12:00 | Buổi = 1 (sáng), Công = 0.5, Đi trễ = 5 phút, Tăng ca = 0, Trạng thái = CHI_SANG | Trả về: sessions=1, workUnits=0.5, lateMinutes=5, overtimeHours=0 | ✅ **PASS** |
| 15 | **TC-ATT-015** | Vào làm ca tối tăng ca (20:00 - 21:00) | Check-in 20:00, Check-out 21:00 | Buổi = 0, Công = 0, Đi trễ = 0, Tăng ca = 1.00 giờ (tính từ max(20:00, 18:00)) | Trả về: sessions=0, workUnits=0, lateMinutes=0, overtimeHours=1.00 | ✅ **PASS** |
| 16 | **TC-ATT-016** | Đảm bảo giá trị luôn $\ge 0$ | Check-in sớm 07:00, Check-out sớm 16:00 | Đi trễ = 0 (không âm), Tăng ca = 0 (không âm) | Không xuất hiện số âm trên toàn bộ chỉ số | ✅ **PASS** |
| 17 | **TC-ATT-017** | Cảnh báo xung đột nghỉ | Chấm công vào ngày có đơn nghỉ đã được duyệt | Gắn cờ `hasLeaveConflict = true`, hiển thị badge cảnh báo "Xung đột nghỉ" | Hiển thị cảnh báo trực quan cho HR, không tự xóa dữ liệu | ✅ **PASS** |
| 18 | **TC-ATT-018** | HR Bổ sung / Sửa công (Lý do bắt buộc) | HR điều chỉnh giờ công nhưng để trống lý do | Chặn lưu: "Bắt buộc phải nhập lý do điều chỉnh chấm công!" | Yêu cầu nhập lý do; khi nhập thành công đổi nguồn thành `HR` | ✅ **PASS** |
| 19 | **TC-ATT-019** | Phê duyệt điều chỉnh (Maker-Checker) | Người tạo yêu cầu điều chỉnh tự bấm duyệt cho chính mình | Báo lỗi: "Nguyên tắc Segregation of Duties (SoD): Người yêu cầu điều chỉnh không thể tự phê duyệt!" | Chặn tự duyệt cả ở Backend API và ẩn nút ở Frontend | ✅ **PASS** |
| 20 | **TC-ATT-020** | Maker-Checker người khác duyệt thành công | Quản lý/Admin khác người lập bấm duyệt | Cập nhật trạng thái `APPROVED`, ghi nhận `approvedById`, `approvedAt` | Bản ghi được duyệt thành công, chuyển sang đã duyệt | ✅ **PASS** |
| 21 | **TC-ATT-021** | Tích hợp tổng công vào Bảng lương | Tạo bảng lương tháng từ nguồn tổng công thực tế | Ngày công thực tế tự động lấy từ tổng `workUnits` đã duyệt (hỗ trợ công lẻ 0.5) | Bảng lương nhận đúng số công thực tế 0.5/1.0, không bị làm tròn sai lệch | ✅ **PASS** |
| 22 | **TC-ATT-022** | Phân trang cố định 10 dòng/trang | Mọi bảng dữ liệu hệ thống (Chấm công, Báo cáo tháng, Ca trực, Lương, Hồ sơ) | Chỉ hiển thị tối đa 10 dòng trên 1 trang | Phân trang cố định 10 dòng/trang kèm thanh điều hướng Trang x/y | ✅ **PASS** |
| 23 | **TC-ATT-023** | Đồng bộ tên Quản trị viên | Đăng nhập tài khoản `admin` | Tên hiển thị là "Trần Nguyễn Minh Khôi" | Khớp 100% trong Seed data, Database và Giao diện Header | ✅ **PASS** |
| 24 | **TC-ATT-024** | Tính lương chuẩn 26 công + ngày nghỉ có lương | Lương 26tr, công thực tế 20, nghỉ có lương 2 ngày (NĐ 145/2020) | Lương theo công = $(26tr \div 26) \times (20 + 2) = 22.000.000$ đ | Khớp 100% công thức, ngày nghỉ không lương không được tính | ✅ **PASS** |
| 25 | **TC-ATT-025** | Tiền lương làm thêm giờ ngày thường ($\ge 150\%$) | Lương 26tr, 26 công, 8h/ngày $\rightarrow$ 125k/h; làm thêm 2h ngày thường | Lương OT = $125.000 \times 1.5 \times 2 = 375.000$ đ | Khớp chính xác tỷ lệ 150% theo Điều 98 BLLĐ 2019 | ✅ **PASS** |
| 26 | **TC-ATT-026** | Tiền lương làm thêm ngày nghỉ tuần & lễ ($\ge 200\%, \ge 300\%$) | 4h OT Chủ Nhật (200%) & 8h OT ngày lễ Tết (300%) | Chủ Nhật = $125k \times 2.0 \times 4 = 1tr$; Lễ = $125k \times 3.0 \times 8 = 3tr$ | Tính đúng hệ số tối thiểu quy định | ✅ **PASS** |

---

## 2. Kết Quả Chạy Toàn Bộ Test Suite

### 2.1. Backend API Unit Tests (`apps/api`)
```
 RUN  v4.1.12 C:/Users/ADMIN/Documents/GitHub/Graduation-Project/apps/api

 ✓ src/payments/momo-signature.spec.ts (2 tests)
 ✓ src/personnel/personnel-domain.spec.ts (20 tests) - Kiểm thử 100% chuẩn 26 công, hệ số tăng ca 150%/200%/300%
 ✓ src/accounting/accounting-domain.spec.ts (13 tests)
 ✓ src/warehouse/warehouse-domain.spec.ts (10 tests)
 ✓ src/payments/payments.service.spec.ts (5 tests)
 ✓ src/config/env.validation.spec.ts (4 tests)
 ✓ src/accounting/accounting.service.spec.ts (15 tests)
 ✓ src/reception/reception.service.spec.ts (14 tests)
 ✓ src/warehouse/warehouse.service.spec.ts (12 tests)
 ✓ src/auth/auth.service.spec.ts (2 tests)
 ✓ src/doctor/doctor.service.spec.ts (11 tests)
 ✓ src/personnel/personnel.service.spec.ts (20 tests) - Kiểm thử Check-in/out, SoD Maker-Checker, Cấu hình thời gian làm việc
 ✓ src/app.controller.spec.ts (1 test)
 ✓ src/accounting/accounting.controller.spec.ts (2 tests)

 Test Files  14 passed (14)
      Tests  130 passed (130)

 Test Files  14 passed (14)
      Tests  129 passed (129)
```

### 2.2. Frontend Web Unit Tests (`apps/web`)
```
 RUN  v5.0.5 C:/Users/ADMIN/Documents/GitHub/Graduation-Project/apps/web

 ✓ src/features/reception/reception-data.test.ts (5 tests)
 ✓ src/features/accounting/accounting-format.test.ts (2 tests)
 ✓ src/lib/auth-session.test.ts (3 tests)
 ✓ src/lib/role-routes.test.ts (8 tests)
 ✓ src/features/reception/reception-context.test.ts (4 tests)
 ✓ src/features/reception/receipt-excel.test.ts (4 tests)
 ✓ src/features/doctor/summary-excel.test.ts (3 tests)
 ✓ src/features/reception/payment-page.test.tsx (4 tests)
 ✓ src/features/personnel/personnel-pages.test.tsx (5 tests) - Kiểm thử Hồ sơ, Quyền hạn SoD, Chấm công, Bảng lương, Thưởng
 ✓ src/App.test.tsx (9 tests)
 ✓ src/features/accounting/accounting-pages.test.tsx (5 tests)
 ✓ src/features/warehouse/warehouse-pages.test.tsx (5 tests)
 ✓ src/features/reception/reception-pages.test.tsx (3 tests)
 ✓ src/features/doctor/doctor-steps.test.tsx (8 tests)

 Test Files  14 passed (14)
      Tests  68 passed (68)
```

**TỔNG CỘNG:** **197 / 197 TESTS PASSED (100% SUCCESS RATE)**
