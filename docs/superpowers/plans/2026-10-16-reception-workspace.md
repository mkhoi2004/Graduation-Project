# Reception Workspace Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Xây dựng khu vực `/reception` thành các màn hình tab riêng, cho phép nhân viên tiếp nhận thao tác quy trình bệnh nhân → phiếu tiếp nhận → dịch vụ/phòng/bác sĩ → xem phiếu → chuyển bác sĩ bằng dữ liệu frontend.

**Architecture:** Giữ xác thực và phân quyền hiện tại, thay placeholder của vai trò `RECEPTION_STAFF` bằng một layout route lồng nhau. Dữ liệu nghiệp vụ được quản lý bằng React Context và lưu localStorage để các tab dùng chung; các hàm sinh mã, chống trùng bệnh nhân và tính tiền được tách thành module thuần để kiểm thử độc lập. Backend/SQL, in thật và chuyển hồ sơ thật được để dành cho giai đoạn API sau.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, shadcn/ui hiện có, Lucide React, Vitest, Testing Library.

---

### Task 1: Định nghĩa dữ liệu và quy tắc nghiệp vụ tiếp nhận

**Files:**
- Create: `apps/web/src/features/reception/reception-data.ts`
- Test: `apps/web/src/features/reception/reception-data.test.ts`

**Steps:**
1. Viết test thất bại cho mã MBN/TNK theo ngày, số thứ tự tăng dần và định dạng mẫu trong tài liệu.
2. Viết test thất bại cho tạo/cập nhật bệnh nhân theo số điện thoại, không tạo bản ghi trùng.
3. Viết test thất bại cho tổng tiền dịch vụ theo số lượng.
4. Chạy test để xác nhận RED.
5. Cài đặt tối thiểu các type, danh mục dịch vụ và hàm thuần.
6. Chạy lại test để xác nhận GREEN.

### Task 2: Tạo store dùng chung cho các tab

**Files:**
- Create: `apps/web/src/features/reception/reception-context.tsx`
- Test: `apps/web/src/features/reception/reception-context.test.tsx`

**Steps:**
1. Viết test thất bại cho thêm/cập nhật bệnh nhân, tạo nhiều phiếu cho một bệnh nhân, cập nhật dịch vụ và trạng thái chuyển bác sĩ.
2. Cài đặt provider/hook cùng cơ chế localStorage có kiểm tra dữ liệu cơ bản.
3. Chạy test và sửa đến khi đạt.

### Task 3: Tạo layout tab và routing bảo vệ theo vai trò

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/features/reception/reception-layout.tsx`
- Create: `apps/web/src/features/reception/reception-dashboard.tsx`
- Test: `apps/web/src/App.test.tsx`

**Steps:**
1. Viết test route thất bại cho `/reception` và một tab con khi có session `RECEPTION_STAFF`.
2. Refactor route guard để hỗ trợ route lồng nhau.
3. Tạo layout có thanh tab cố định, tiêu đề người dùng và đăng xuất.
4. Tạo dashboard tóm tắt và các nút đi tới từng bước.
5. Chạy test để xác nhận điều hướng/phân quyền.

### Task 4: Xây màn hình Bệnh nhân và Tạo tiếp nhận

**Files:**
- Create: `apps/web/src/features/reception/patients-page.tsx`
- Create: `apps/web/src/features/reception/new-intake-page.tsx`
- Test: `apps/web/src/features/reception/reception-pages.test.tsx`

**Steps:**
1. Viết test thất bại cho tạo bệnh nhân, phát hiện số điện thoại đã có và chuyển sang cập nhật.
2. Viết test thất bại cho chọn bệnh nhân và tạo mã TNK mới.
3. Cài đặt form, tìm kiếm, danh sách và phản hồi thành công/lỗi.
4. Chạy test đến khi đạt.

### Task 5: Xây màn hình Dịch vụ, In phiếu và Chuyển bác sĩ

**Files:**
- Create: `apps/web/src/features/reception/services-page.tsx`
- Create: `apps/web/src/features/reception/receipt-page.tsx`
- Create: `apps/web/src/features/reception/transfer-page.tsx`
- Test: `apps/web/src/features/reception/reception-pages.test.tsx`

**Steps:**
1. Viết test thất bại cho thêm/hủy dịch vụ, chọn phòng và bác sĩ, tính tổng tiền.
2. Viết test thất bại cho hiển thị phiếu và cập nhật trạng thái chuyển bác sĩ.
3. Cài đặt các màn hình; nút in chỉ hiển thị thông báo placeholder, các nút chuyển bước dùng route.
4. Chạy test đến khi đạt.

### Task 6: Kiểm tra chất lượng toàn dự án

**Files:**
- Modify only if verification reveals issues.

**Steps:**
1. Chạy toàn bộ unit test frontend.
2. Chạy lint và TypeScript/build frontend.
3. Chạy build/test cấp workspace có liên quan để phát hiện hồi quy.
4. Kiểm tra nhanh luồng đăng nhập `reception` và các route tab.
5. Dùng skill `verification-before-completion`, sau đó yêu cầu code review theo skill `requesting-code-review`.
