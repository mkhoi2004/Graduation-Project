# Báo Cáo Kiểm Tra Hệ Thống: Đăng Nhập & Phân Hệ Tiếp Nhận (/reception)

> **Dự án:** Dental ERP (Hệ thống quản lý phòng khám nha khoa)  
> **Thời gian cập nhật:** 17/10/2026  
> **Môi trường:** Localhost (Windows 11, Node.js v22, MS SQL Server Express 2017+, NestJS, React 19 + Vite)  
> **Trạng thái tổng thể:** ✅ **PASSED (33/33 Automated Tests + Live API & Proxy Verified)**

---

## 1. Tổng Quan & Khắc Phục Sự Cố Đăng Nhập

### 1.1. Chẩn đoán sự cố: "Nhập tài khoản ấn đăng nhập bị load lại màn hình không nhảy qua"
Khi người dùng nhập tài khoản `reception` / `Dental@123` và bấm "Đăng nhập", màn hình bị giật/nháy rồi giữ nguyên ở trang `/login`. Nguyên nhân bắt nguồn từ cơ chế khai báo Route trong `apps/web/src/App.tsx`:
- **Nguyên nhân cốt lõi**: Trước đây, trong `AppRoutes`, biến `session = getSession()` được gọi một lần duy nhất lúc component khởi tạo. Khi chưa đăng nhập, `session` mang giá trị `null`, khiến biểu thức `<Route path="/reception" element={session ? ... : <Navigate to="/login" replace />} />` gắn cố định thẻ `<Navigate to="/login" />` vào cấu trúc cây Route của `/reception`.
- **Hiện tượng**: Khi form đăng nhập gọi `saveSession(payload)` và `navigate('/reception')`, React Router chuyển hướng đến `/reception`. Tại đây, cây Route khớp thẻ `<Navigate to="/login" />` và ngay lập tức redirect ngược trở lại `/login`. Người dùng nhìn thấy màn hình "load lại" mà không thể vào được quầy tiếp nhận.
- **Giải pháp đã xử lý triệt để**:
  1. Tách các route bảo vệ thành các component độc lập: `ProtectedReceptionRoute` và `PublicLoginRoute`. Mỗi khi có chuyển hướng URL, component tự động đọc `getSession()` từ `localStorage` để quyết định cấp quyền hay điều hướng.
  2. Bổ sung cấu hình proxy `/api` vào `apps/web/vite.config.ts` trỏ về `http://localhost:3000` và mở rộng cấu hình CORS trong `apps/api/src/app.setup.ts` chấp nhận cả `localhost:5173` và `127.0.0.1:5173`.
  3. Bổ sung kiểm thử tự động `App.test.tsx` giả lập luồng người dùng bấm nút "Tiếp nhận" và submit form đăng nhập -> đảm bảo hệ thống chuyển trang mượt mà sang `Quầy tiếp nhận`.

---

## 2. Danh Sách API Liên Quan & Trạng Thái Kiểm Thử

| Phương thức | Endpoint | Chức năng | Phân quyền | Kết quả kiểm thử | Chi tiết phản hồi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Đăng nhập tài khoản nội bộ | Public (Giới hạn 5 req/phút) | ✅ **PASSED** | Trả về `accessToken` JWT, thông tin user và role `RECEPTION_STAFF` |
| `POST` | `/api/auth/login` *(Qua Vite Proxy)* | Đăng nhập qua proxy `localhost:5173/api/auth/login` | Public | ✅ **PASSED** | Kết nối thông suốt, loại bỏ hoàn toàn lỗi CORS / lệch cổng |
| `POST` | `/api/auth/login` *(Sai pass)* | Kiểm tra bảo mật sai thông tin | Public | ✅ **PASSED** | Trả về HTTP `401 Unauthorized` (`"Tên đăng nhập hoặc mật khẩu không đúng"`) |
| `POST` | `/api/auth/login` *(Rate limit)* | Kiểm tra chống brute-force | Public | ✅ **PASSED** | Gửi > 5 request/phút trả về HTTP `429 Too Many Requests` |
| `GET` | `/api/health` | Kiểm tra tình trạng backend | Public | ✅ **PASSED** | Trả về HTTP `200 OK` (`{"service":"dental-erp-api","status":"ok"}`) |
| `GET` | `/api/openapi.json` | Cung cấp tài liệu OpenAPI cho APIdog | Public | ✅ **PASSED** | Trả về HTTP `200 OK` schema OpenAPI 3.0 |
| `GET` | `/api/docs` | Giao diện Swagger UI | Public | ✅ **PASSED** | Trả về HTTP `200 OK` HTML Swagger Docs |

---

## 3. Dữ Liệu Mẫu (Demo Test Data) Cho Phân Hệ Tiếp Nhận (/reception)

Hệ thống đã được tích hợp sẵn bộ dữ liệu mẫu phong phú bao gồm **5 bệnh nhân** và **4 phiếu tiếp nhận** với đầy đủ các trạng thái và nghiệp vụ để phục vụ việc kiểm thử:

> [!TIP]
> **Thao tác 1 chạm trong giao diện**:
> - Trên thanh Header của Quầy tiếp nhận, có sẵn nút **"Nạp dữ liệu mẫu"** (biểu tượng ✨) để nạp tức thì bộ dữ liệu dưới đây.
> - Nút **"Làm mới"** để xóa trắng dữ liệu và bắt đầu lại từ đầu.
> - Nếu bạn mở quầy tiếp nhận lần đầu tiên, hệ thống sẽ tự động hiển thị dữ liệu mẫu này.

### 3.1. Danh sách 5 Bệnh nhân mẫu (Patients)

| Mã Bệnh Nhân | Họ và tên | Ngày sinh | Giới tính | Số điện thoại | Địa chỉ | Ghi chú / Tiền sử bệnh |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `MBN20261710/0001` | **Nguyễn Văn An** | 14/05/1992 | Nam | `0912345678` | 123 Nguyễn Trãi, Q.1, TP.HCM | Dị ứng nhẹ với penicillin, ê buốt răng hàm dưới khi uống nước đá |
| `MBN20261710/0002` | **Trần Thị Mai Hương** | 20/11/1998 | Nữ | `0987654321` | 45 Lê Lợi, Q.Hải Châu, Đà Nẵng | Nhu cầu niềng răng khay trong suốt và tẩy trắng răng thẩm mỹ 2 hàm |
| `MBN20261710/0003` | **Lê Quốc Bảo** | 03/08/1985 | Nam | `0903112233` | 88 Cầu Giấy, Hà Nội | Sưng đau nướu răng khôn hàm dưới bên trái, há miệng khó khăn |
| `MBN20261710/0004` | **Phạm Thùy Linh** | 28/02/2001 | Nữ | `0934567890` | 12 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM | Khám định kỳ 6 tháng, cạo vôi răng và đánh bóng 2 hàm |
| `MBN20261710/0005` | **Hoàng Minh Tuấn** | 10/10/1978 | Nam | `0978999888` | 67 Trần Hưng Đạo, Hoàn Kiếm, HN | Răng cửa bị mẻ lớn sau va chạm, muốn bọc răng toàn sứ cao cấp |

---

### 3.2. Danh sách 4 Phiếu tiếp nhận mẫu (Intakes)

| Mã Tiếp Nhận | Bệnh nhân | Triệu chứng ban đầu | Ưu tiên | Dịch vụ đã chọn & Tạm tính | Phòng khám & Bác sĩ | Trạng thái |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| `TNK20261710/0001` | Nguyễn Văn An | Đau nhức răng cấm phải 2 ngày, ê buốt khi ăn đồ ngọt | Thường | - Trám răng (x1): 300.000đ<br>- Cạo vôi + đánh bóng (x1): 400.000đ<br>**Tổng: 700.000 VNĐ** | - Phòng khám 01<br>- BS. Nguyễn Hoàng Minh | `TRANSFERRED`<br>*(Đã chuyển bác sĩ, hồ sơ được khóa an toàn)* |
| `TNK20261710/0002` | Lê Quốc Bảo | Răng số 8 sưng tấy, đau nhức dữ dội lan lên thái dương | Khẩn cấp | - Nhổ răng khôn (x1): 500.000đ<br>- Cạo vôi + đánh bóng (x1): 400.000đ<br>**Tổng: 900.000 VNĐ** | - Phòng tiểu phẫu<br>- BS. Lê Quốc Huy | `READY`<br>*(Sẵn sàng xem phiếu & bấm chuyển bác sĩ)* |
| `TNK20261710/0003` | Trần Thị Mai Hương | Tư vấn niềng khay trong suốt và tẩy trắng răng thẩm mỹ | Ưu tiên | - Niềng khay trong suốt (x1): 70.000.000đ<br>- Tẩy trắng tại phòng (x1): 3.000.000đ<br>**Tổng: 73.000.000 VNĐ** | - Phòng khám 02<br>- BS. Trần Ngọc Lan | `READY`<br>*(Sẵn sàng xem phiếu & bấm chuyển bác sĩ)* |
| `TNK20261710/0004` | Hoàng Minh Tuấn | Răng cửa trên sứt mẻ 1/3 thân răng, cần phục hình | Thường | *Chưa chọn dịch vụ*<br>**Tổng: 0 VNĐ** | *Chưa chọn phòng/bác sĩ* | `DRAFT`<br>*(Đang chờ tiếp tục chọn dịch vụ và điều phối)* |

---

## 4. Hướng Dẫn Thử Nghiệm Từng Tính Năng Tại Quầy Tiếp Nhận

### 4.1. Bước 1: Dashboard Quầy tiếp nhận (`/reception`)
- Nhìn thấy ngay 4 khối thẻ thống kê:
  - **Tổng bệnh nhân:** `5`
  - **Phiếu tiếp nhận:** `4`
  - **Chờ hoàn thiện:** `3` (gồm 1 phiếu DRAFT và 2 phiếu READY)
  - **Đã chuyển bác sĩ:** `1` (phiếu TNK...0001)
- Bảng danh sách "Tiếp nhận gần đây" liệt kê đầy đủ 4 hồ sơ kèm huy hiệu trạng thái tương ứng.

### 4.2. Bước 2: Quản lý Hồ sơ bệnh nhân (`/reception/patients`)
- **Xem danh sách**: Có sẵn 5 bệnh nhân với đầy đủ thông tin.
- **Thử tìm kiếm**: Nhập `An`, `0987`, hoặc `0003` vào thanh tìm kiếm -> danh sách lọc tức thì.
- **Thử chỉnh sửa**: Bấm nút **"Sửa"** tại một bệnh nhân -> thông tin tự động điền lên form bên trái -> thay đổi địa chỉ hoặc ghi chú -> bấm **"Cập nhật hồ sơ bệnh nhân"**.
- **Thử tạo tiếp nhận nhanh**: Bấm nút **"Tiếp nhận"** tại dòng bệnh nhân -> hệ thống tự chuyển sang trang Tạo tiếp nhận với bệnh nhân đó đã được chọn sẵn.
- **Thử tạo bệnh nhân mới**: Điền thông tin mới -> hệ thống sinh mã tự tăng `MBN20261710/0006`.

### 4.3. Bước 3: Tạo Tiếp nhận mới (`/reception/intakes/new`)
- Chọn bất kỳ bệnh nhân nào trong danh sách.
- Nhập triệu chứng và chọn mức độ ưu tiên (*Thường*, *Ưu tiên*, *Khẩn cấp*).
- Xem ô "Mã dự kiến" tự động hiển thị `TNK20261710/0005`.
- Bấm **"Tạo phiếu & chọn dịch vụ"** để tự động chuyển sang trang Chọn dịch vụ.

### 4.4. Bước 4: Chọn Dịch vụ & Điều phối (`/reception/services`)
- Chọn phiếu `TNK20261710/0004` (đang ở trạng thái DRAFT):
  - Bấm nút `+` để thêm các dịch vụ mong muốn (ví dụ: *Răng toàn sứ cao cấp*).
  - Quan sát khung bên phải: Tổng tạm tính nhảy số tức thì theo đơn vị tiền tệ VND.
  - Chọn **Phòng khám** (ví dụ: *Phòng khám 01*) và **Bác sĩ** (ví dụ: *BS. Lê Quốc Huy*).
  - Khi đã chọn đủ 3 yếu tố (Dịch vụ, Phòng, Bác sĩ), nút **"Lưu & xem phiếu"** sáng lên -> bấm để chuyển sang bước xem phiếu.

### 4.5. Bước 5: Xem Phiếu tiếp nhận (`/reception/receipt`)
- Xem chi tiết phiếu tiếp nhận trình bày đẹp mắt: mã TNK, tên bệnh nhân, bác sĩ, phòng khám, danh mục dịch vụ chi tiết và tổng tiền.
- Bấm nút **"In phiếu"** -> nhận thông báo xác nhận tính năng in phiếu sẵn sàng kết nối thiết bị.
- Bấm **"Tiếp tục chuyển bác sĩ"** để đi tới bước cuối cùng.

### 4.6. Bước 6: Chuyển bác sĩ (`/reception/transfer`)
- Thấy ngay danh sách hồ sơ:
  - Phiếu `DRAFT`: Hiện cảnh báo vàng báo chưa đủ dịch vụ/phòng khám.
  - Phiếu `READY` (`TNK...0002` hoặc `0003`): Nút **"Chuyển bác sĩ"** màu đỏ sẵn sàng bấm.
- Bấm nút **"Chuyển bác sĩ"**:
  - Trạng thái lập tức đổi sang `Đã chuyển` (màu xanh lục).
  - Thẻ thống kê tại Dashboard tăng số hồ sơ đã chuyển lên `2`.
  - Nút chỉnh sửa dịch vụ tự động ẩn đi để khóa hồ sơ.

---

## 5. Kết Quả Kiểm Thử Tự Động (Automated Test Suite)

Tất cả **33 test cases** đều chạy thành công 100%:

- **Backend Unit Tests (`apps/api`)**: **7/7 PASSED** (AuthService, EnvValidation, AppController).
- **Backend E2E Tests (`apps/api/test`)**: **2/2 PASSED** (Health, OpenAPI contract).
- **Frontend Unit & Integration Tests (`apps/web`)**: **24/24 PASSED** (bao gồm test đăng nhập chuyển route `navigates to reception workspace upon successful login submission`, role routing, auth session, và luồng dữ liệu 5 bước tiếp nhận).
- **Kiểm tra cú pháp & Linting**: **0 errors, 0 warnings** trên toàn bộ workspace.
- **Biên dịch Production (`npm run build`)**: **Thành công 100%**.
