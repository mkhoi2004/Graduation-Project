# QUY TRÌNH THAO TÁC NGHIỆP VỤ THEO VAI TRÒ (ROLE-BASED WORKFLOW GUIDE)
### Hệ thống Quản lý Phòng khám Nha khoa Tích hợp ERP & EMR — Chuẩn v14

> **Tài liệu hướng dẫn chuẩn hóa quy trình người dùng cuối (End-User Operational Manual)**  
> **Môi trường ứng dụng:** Web App React 19 + Vite (`http://127.0.0.1:5173`)  
> **Backend:** Node.js Express 5 (`http://127.0.0.1:5000`) & SQL Server 2022  
> **Cập nhật:** 15/10/2026 (GMT+7)

---

## MỤC LỤC
1. [Tổng quan Hệ thống & Ma trận Phân quyền (RBAC)](#1-tổng-quan-hệ-thống--ma-trận-phân-quyền-rbac)
2. [Bản đồ Màn hình & Đường dẫn URL (Sitemap)](#2-bản-đồ-màn-hình--đường-dẫn-url-sitemap)
3. [Quy trình Dành cho Lễ tân / Tiếp nhận (RECEPTIONIST)](#3-quy-trình-dành-cho-lễ-tân--tiếp-nhận-receptionist)
4. [Quy trình Dành cho Bác sĩ Điều trị (DOCTOR)](#4-quy-trình-dành-cho-bác-sĩ-điều-trị-doctor)
5. [Quy trình Dành cho Quản lý Kho & Tiệt trùng / Labo (WAREHOUSE)](#5-quy-trình-dành-cho-quản-lý-kho--tiệt-trùng--labo-warehouse)
6. [Quy trình Dành cho Kế toán & Kế toán trưởng (ACCOUNTANT)](#6-quy-trình-dành-cho-kế-toán--kế-toán-trưởng-accountant)
7. [Quy trình Dành cho Quản trị viên (ADMIN)](#7-quy-trình-dành-cho-quản-trị-viên-admin)
8. [Quy trình Phối hợp Liên vai trò Mẫu (End-to-End Walkthrough)](#8-quy-trình-phối-hợp-liên-vai-trò-mẫu-end-to-end-walkthrough)
9. [Bảng Tra cứu Tiêu chí Nghiệm thu Nghiệp vụ (AT-01 đến AT-24)](#9-bảng-tra-cứu-tiêu-chí-nghiệm-thu-nghiệp-vụ-at-01-đến-at-24)

---

## 1. Tổng quan Hệ thống & Ma trận Phân quyền (RBAC)

Hệ thống được thiết kế theo kiến trúc phân tách trách nhiệm nghiêm ngặt (Separation of Duties). Người dùng sau khi đăng nhập sẽ chỉ được cấp quyền truy cập các màn hình và thao tác nghiệp vụ tương ứng với vai trò của mình:

| Vai trò (Role Code) | Tên vai trò hiển thị | Trách nhiệm chính | Giới hạn bắt buộc |
| :--- | :--- | :--- | :--- |
| **`RECEPTIONIST`** | Nhân viên tiếp nhận / Lễ tân | Đón tiếp, tạo hồ sơ BN, mở lượt khám, phân công bác sĩ, thu cọc, thu ngân thanh toán. | Không sửa EMR lâm sàng; Không tự duyệt giảm giá vượt hạn mức; Không ghi sổ kế toán. |
| **`DOCTOR`** | Bác sĩ điều trị | Khám bệnh, lập sơ đồ răng FDI, lập EMR, lấy đồng thuận, kê đơn, chốt dịch vụ, ký số EMR. | Chỉ xem BN có quan hệ điều trị (AT-17); Không sửa EMR đã ký (phải lập phụ lục AT-23); Không thu tiền mặt. |
| **`WAREHOUSE`** | Quản lý kho / Tiệt trùng | Nhập kho, xuất kho FEFO (AT-07), quản lý Serial Implant (AT-12), thu hồi lô (AT-08), tiệt trùng (AT-22), Labo. | Không can thiệp EMR bệnh án; Không sửa doanh thu hoặc chứng từ kế toán. |
| **`ACCOUNTANT`** | Kế toán viên / Kế toán trưởng | Kiểm soát hóa đơn, duyệt chiết khấu/hoàn tiền (AT-20), đối soát két (AT-09), BHTM (AT-03/04), sổ cái, khóa sổ (AT-10), hoa hồng (M11), đối soát (M12). | Maker-Checker: Người lập đề xuất không tự duyệt đề xuất của mình; Không ghi đè kỳ khóa. |
| **`ADMIN`** | Quản trị viên hệ thống | Quản lý danh mục phòng/ghế, bảng giá dịch vụ phiên bản (AT-16/21), tài khoản nhân viên, kiểm tra hệ thống. | Không xem EMR nhạy cảm mặc định; Mọi thao tác đều lưu vết `AccessAuditLogs`. |

---

## 2. Bản đồ Màn hình & Đường dẫn URL (Sitemap)

| Menu trên giao diện | Đường dẫn URL | Vai trò được phép truy cập | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Bảng điều khiển** | `/dashboard` | Tất cả vai trò | Thống kê nhanh lượt khám, doanh thu ngày, cảnh báo |
| **Hồ sơ Bệnh nhân** | `/patients` | Tất cả vai trò | Tìm kiếm, tạo mới hồ sơ bệnh nhân, xem lịch sử |
| **Lượt khám & Tiếp nhận**| `/visits` | Tất cả vai trò | Tiếp nhận ca khám, phân công bác sĩ, đổi trạng thái ca |
| **Bệnh án EMR chi tiết** | `/visits/:visitId/emr` | `DOCTOR`, `ADMIN` | Khám lâm sàng, sơ đồ răng, đồng thuận, ký số |
| **Hàng đợi ký số** | `/sign-queue` | `DOCTOR`, `ADMIN` | Ký lại các hồ sơ EMR bị lỗi mạng khi ký (AT-13) |
| **Thu ngân & Thanh toán** | `/billing` | `RECEPTIONIST`, `ACCOUNTANT`, `ADMIN` | Quản lý ca thu ngân, thu cọc, lập hóa đơn, thanh toán |
| **Kho thuốc & Vật tư** | `/inventory` | `WAREHOUSE`, `DOCTOR`, `ADMIN` | Nhập kho, tồn kho FEFO, Serial Implant, thu hồi lô |
| **Tiệt trùng & Labo** | `/operations` | Tất cả vai trò | Lò hấp tiệt trùng, kiểm soát gói vô trùng, đơn Labo |
| **Kế toán & Khóa sổ** | `/accounting` | `ACCOUNTANT`, `ADMIN` | Sổ cái bút toán kép, đối soát két, khóa sổ kỳ |
| **Bảo hiểm thương mại** | `/insurance` | `RECEPTIONIST`, `ACCOUNTANT`, `ADMIN` | Hợp đồng BHTM, gửi hồ sơ claim, bồi thường |
| **Hoa hồng & Lương** | `/hr/payroll` | `DOCTOR`, `ACCOUNTANT`, `ADMIN` | Tính hoa hồng dịch vụ, bảng lương nhân sự |
| **Đối soát & Toàn vẹn** | `/reconciliation` | `ACCOUNTANT`, `ADMIN` | Đối soát 5 nguồn cuối ngày, toàn vẹn chữ ký SHA-256 |
| **Dịch vụ & Bảng giá** | `/catalog/services` | Tất cả vai trò (Xem); `ADMIN` (Sửa) | Danh mục dịch vụ, phiên bản giá theo thời gian |
| **Phòng khám & Ghế** | `/catalog/rooms` | Tất cả vai trò (Xem); `ADMIN` (Sửa) | Danh mục phòng khám, ghế nha điều trị, phòng tiệt trùng |
| **Quản lý người dùng** | `/users` | `ADMIN` duy nhất | Thêm nhân viên, cấp tài khoản, đổi mật khẩu, lưu trữ |
| **Kiểm tra hệ thống** | `/environment` | Tất cả vai trò | Kiểm tra kết nối CSDL, kiểm tra API Health, cấu hình |

---

## 3. Quy trình Dành cho Lễ tân / Tiếp nhận (RECEPTIONIST)

### Bước 1: Đăng nhập hệ thống
- Truy cập trình duyệt tại `http://127.0.0.1:5173/login`.
- Đăng nhập với tài khoản: `receptionist` / `Receptionist1234@`.
- Hệ thống điều hướng vào màn hình **Bảng điều khiển** (`/dashboard`).

### Bước 2: Kiểm tra hoặc Tạo mới Hồ sơ Bệnh nhân
- **Chuyển màn hình:** Bấm chọn menu **Hồ sơ Bệnh nhân** (`/patients`).
- **Tìm kiếm:** Nhập Số điện thoại, Họ tên hoặc Mã BN vào thanh tìm kiếm.
  - *Nếu bệnh nhân cũ:* Kiểm tra lại thông tin liên lạc và tiền sử dị ứng.
  - *Nếu bệnh nhân mới:* Bấm nút **"+ Tiếp nhận BN mới"** để mở form nhập:
    - **Họ và tên:** Viết in hoa có dấu (ví dụ: `NGUYỄN VĂN AN`).
    - **Giới tính:** Chọn Nam / Nữ / Khác.
    - **Ngày sinh hoặc Năm sinh:** Nhập ngày sinh chuẩn hoặc năm sinh (nếu không nhớ ngày).
    - **Số điện thoại:** 10 chữ số chuẩn định dạng Việt Nam.
    - **Cảnh báo trùng SĐT (AT-05):** Nếu số điện thoại đã tồn tại trong hệ thống (dùng chung trong gia đình), giao diện sẽ hiển thị hộp thoại cảnh báo màu vàng. Lễ tân xác nhận đây là người thân trước khi bấm tiếp tục lưu.
    - **Ràng buộc Người giám hộ:** Nếu bệnh nhân < 18 tuổi, bắt buộc nhập thông tin Người giám hộ (Họ tên, SĐT, quan hệ) trước khi lưu.
    - **Tiền sử y tế / Dị ứng:** Ghi nhận tiền sử bệnh lý tim mạch, tiểu đường, dị ứng thuốc (nếu chưa rõ ghi `UNKNOWN`, không được tự ý xóa bỏ).
- Bấm **"Lưu hồ sơ"** -> Hệ thống sinh mã bệnh nhân duy nhất (ví dụ: `PAT-2026-0001`).

### Bước 3: Khởi tạo Lượt khám & Phân công Bác sĩ (Tạo quan hệ điều trị)
- **Chuyển màn hình:** Bấm chọn menu **Lượt khám & Tiếp nhận** (`/visits`).
- Bấm nút **"+ Tiếp nhận lượt khám"**:
  - **Bệnh nhân:** Tìm và chọn bệnh nhân vừa tiếp nhận.
  - **Chi nhánh:** Mặc định `Phòng khám Nha khoa Local`.
  - **Ghế nha / Phòng khám:** Chọn ghế còn trống (ví dụ: `CHAIR-01` - Ghế nha số 1).
  - **Bác sĩ phụ trách:** Chọn bác sĩ điều trị đang trực (ví dụ: `Bác sĩ mẫu`). *Lưu ý: Hành động này kích hoạt nguyên tắc AT-17, tạo lập quan hệ điều trị độc quyền giữa bác sĩ và bệnh nhân để cấp quyền xem EMR.*
  - **Hình thức thanh toán:** Chọn `Tự chi trả` (SELF_PAY) hoặc `Bảo hiểm thương mại bảo lãnh` (BHTM_GUARANTEE).
  - **Lý do khám:** Ghi nhận ngắn gọn triệu chứng (ví dụ: "Đau răng hàm dưới bên phải").
- Bấm **"Xác nhận tiếp nhận"** -> Lượt khám xuất hiện ở đầu bảng với trạng thái **`REGISTERED`** (Đã tiếp nhận).
- Hướng dẫn bệnh nhân di chuyển vào khu vực chờ hoặc ghế khám của Bác sĩ đã chỉ định.

### Bước 4: Thu cọc / Tiền tạm ứng (Nếu có chỉ định dịch vụ kỹ thuật cao)
- **Chuyển màn hình:** Bấm chọn menu **Thu ngân & Thanh toán** (`/billing`).
- Kiểm tra trạng thái ca làm việc tại tab **"Quản lý Ca thu ngân"**. Nếu đầu ngày chưa mở ca, bấm **"Mở ca thu ngân"** và nhập số tiền quỹ đầu ca.
- Chuyển sang tab **"Thu tiền cọc / Tạm ứng"**:
  - Chọn Bệnh nhân và Lượt khám tương ứng.
  - Nhập số tiền cọc (Ví dụ: `2,000,000` VND).
  - Phương thức: `Tiền mặt` / `Chuyển khoản QR` / `Thẻ POS`.
  - Ghi chú: "Tạm ứng cấy ghép Implant R46".
- Bấm **"Thu tiền cọc"** -> Hệ thống sinh phiếu thu cọc `DEP-XXXX`.
- *Nguyên tắc AT-01:* Tiền cọc được hạch toán vào tài khoản `3387` (Doanh thu chưa thực hiện / Cọc), chưa phát sinh doanh thu dịch vụ.

### Bước 5: Theo dõi trạng thái ca khám
- Tại màn hình `/visits`, Lễ tân theo dõi tiến độ ca khám:
  - Khi Bác sĩ mở bệnh án và khám: Trạng thái chuyển thành **`IN_PROGRESS`** (Đang khám).
  - Khi Bác sĩ hoàn thành khám và chốt thủ thuật: Trạng thái chuyển thành **`CLINICAL_COMPLETED`** (Hoàn tất lâm sàng).

### Bước 6: Xuất hóa đơn & Thu tiền thanh toán
- Khi trạng thái là `CLINICAL_COMPLETED`, mời bệnh nhân ra quầy thanh toán.
- **Chuyển màn hình:** Vào **Thu ngân & Thanh toán** (`/billing`) -> Tab **"Lập hóa đơn & Thanh toán"**:
  - Chọn lượt khám của bệnh nhân.
  - Hệ thống tự động hiển thị bảng kê các dịch vụ Bác sĩ đã chốt (Service Completions) kèm đơn giá theo phiên bản đã duyệt (AT-16).
  - **Cấn trừ tiền cọc (AT-15):** Nếu bệnh nhân có khoản cọc từ Bước 4, bấm **"Áp dụng cấn cọc"**. Hệ thống trừ trực tiếp vào số tiền phải thanh toán và khóa khoản cọc tránh cấn trùng.
  - **Chiết khấu (nếu có):** Nếu có voucher hoặc giảm giá, chọn chương trình. Nếu giảm giá vượt hạn mức, hệ thống yêu cầu Kế toán duyệt (AT-20) mới được áp dụng.
  - Chọn phương thức thanh toán cho phần còn lại (Tiền mặt / Quét mã QR).
  - Bấm **"Xác nhận thanh toán & Xuất hóa đơn"** (AT-02 khóa chống thanh toán đè).
  - In hóa đơn / phiếu thu giao cho người bệnh.

### Bước 7: Đóng lượt khám & Kết thúc ca làm việc
- **Chuyển màn hình:** Quay lại **Lượt khám & Tiếp nhận** (`/visits`).
- Tìm lượt khám -> Bấm **"Đóng lượt khám"** -> Trạng thái chuyển sang **`CLOSED`** (Đã đóng ca).
- **Cuối ngày:** Vào `/billing` -> Tab **"Quản lý Ca thu ngân"** -> Bấm **"Đóng ca & Kết chuyển"**:
  - Đếm tiền mặt thực tế trong két và nhập chi tiết theo từng mệnh giá.
  - Nếu có chênh lệch thừa/thiếu, nhập lý do giải trình. Nếu chênh lệch vượt ngưỡng (ví dụ > 100.000 đ), hệ thống sinh sự cố `CashDiscrepancy` (AT-09) chuyển Kế toán trưởng duyệt.

---

## 4. Quy trình Dành cho Bác sĩ Điều trị (DOCTOR)

### Bước 1: Đăng nhập & Tiếp nhận danh sách chờ khám
- Truy cập trình duyệt tại `http://127.0.0.1:5173/login`.
- Đăng nhập với tài khoản: `doctor` / `Doctor1234@`.
- Bác sĩ vào màn hình **Lượt khám & Tiếp nhận** (`/visits`) để xem danh sách các bệnh nhân đang chờ tại phòng/ghế của mình (Trạng thái `REGISTERED`).

### Bước 2: Mở Hồ sơ Bệnh án Điện tử (EMR)
- Trên hàng lượt khám của bệnh nhân, bấm nút **"Mở Bệnh án (EMR)"**.
- Giao diện chuyển sang màn hình EMR chuyên sâu: `/visits/:visitId/emr`.
- Lượt khám tự động chuyển trạng thái sang **`IN_PROGRESS`** (Đang khám).
- *Nguyên tắc AT-17:* Bác sĩ chỉ được mở EMR của bệnh nhân có phân công quan hệ điều trị với mình. Mọi nỗ lực truy cập hồ sơ của bệnh nhân khác sẽ bị API từ chối với lỗi `403 Forbidden` và ghi nhật ký cảnh báo an ninh `AccessAuditLogs`.

### Bước 3: Ghi nhận Khám lâm sàng & Tiền sử
- Tại màn hình EMR chi tiết:
  - **Lý do khám (Chief Complaint):** Ghi rõ triệu chứng chính của bệnh nhân (ví dụ: "Đau buốt răng hàm dưới khi uống nước lạnh").
  - **Tiền sử & Bệnh sử (Medical History):** Rà soát tiền sử dị ứng, tiền sử dùng thuốc, bệnh toàn thân.
  - **Khám thực thể (Clinical Examination):** Ghi nhận tình trạng niêm mạc, vệ sinh răng miệng, khớp cắn.
  - **Chẩn đoán (Diagnoses):** Chọn mã chẩn đoán ICD hoặc mô tả bệnh học (ví dụ: `Viêm tủy không hồi phục R46`).

### Bước 4: Thao tác trên Sơ đồ răng (Odontogram / Tooth Chart)
- Chọn tab **"Sơ đồ răng (FDI)"**:
  - Hiển thị đầy đủ 32 răng vĩnh viễn theo chuẩn quốc tế FDI.
  - Bấm chọn số hiệu răng cần điều trị (Ví dụ: `R46`).
  - Chọn mặt răng bị tổn thương: `O` (Mặt nhai), `M` (Mặt gần), `D` (Mặt xa), `B` (Mặt ngoài), `L` (Mặt trong).
  - Chọn tình trạng răng: Sâu men, Sâu ngà, Tủy viêm, Răng lung lay, Răng đã mất, Răng sứ...
  - Bấm **"Cập nhật tình trạng răng"** -> Sơ đồ răng đổi màu sắc và ký hiệu đồ họa trực quan.

### Bước 5: Lấy Phiếu đồng thuận can thiệp (Informed Consent - AT-06)
- Với các thủ thuật xâm lấn (Nhổ răng, Tiểu phẫu, Cấy ghép Implant, Điều trị tủy):
- Chọn tab **"Phiếu đồng thuận"**:
  - Chọn mẫu phiếu (Ví dụ: "Đồng thuận Điều trị tủy răng").
  - Bác sĩ giải thích rõ ràng cho bệnh nhân về phương pháp, các giai đoạn thực hiện và các nguy cơ có thể gặp phải.
  - Bệnh nhân ký điện tử xác nhận (chuyển sang trạng thái `SIGNED`).
  - **Xử lý tình huống Rút đồng thuận (AT-06):** Nếu trong quá trình điều trị bệnh nhân đổi ý không muốn làm tiếp thủ thuật tiếp theo (ví dụ đã nhổ R38 nhưng sợ không nhổ tiếp R48), Bác sĩ bấm **"Rút đồng thuận (Revoke)"** và nhập lý do. Hệ thống lập tức dừng các bước chưa thực hiện, bảo toàn toàn bộ dữ liệu phần đã làm và bảo đảm EMR không bị xóa.

### Bước 6: Chỉ định Vật tư cấy ghép & Quản lý Serial Implant (AT-12)
- Nếu thực hiện thủ thuật cấy ghép Implant:
- Bác sĩ chọn mặt hàng Implant từ danh mục (Ví dụ: Trụ Straumann SLA Active).
- Nhập/Quét mã Serial của trụ cấy ghép.
- **Ràng buộc AT-12:** Hệ thống tự động kiểm tra mã Serial trên toàn cơ sở dữ liệu. Nếu Serial này đã từng được cấy ghép cho bất kỳ bệnh nhân nào trước đó, hệ thống lập tức từ chối với lỗi `409 Conflict - SERIAL_ALREADY_IMPLANTED`, bảo đảm an toàn sinh học tuyệt đối.

### Bước 7: Kê đơn thuốc ngoại trú
- Chọn tab **"Kê đơn thuốc"**:
  - Tìm kiếm thuốc trong danh mục kho dược (Kháng sinh, Giảm đau, Kháng viêm, Nước súc miệng...).
  - Nhập số lượng, liều dùng (Sáng / Trưa / Chiều / Tối), cách dùng (Uống sau ăn).
  - Bấm **"Lưu đơn thuốc"** -> Đơn thuốc được gắn chặt chẽ vào phiên bản EMR hiện tại.

### Bước 8: Chốt Hoàn thành Dịch vụ (Service Completion - AT-18)
- Sau khi thực hiện xong thủ thuật trên ghế:
- Chọn tab **"Chốt dịch vụ hoàn thành"**:
  - Chọn dịch vụ đã hoàn thành thực tế (Ví dụ: `Cạo vôi răng` hoặc `Điều trị tủy R46`).
  - Nhập số lượng thực hiện.
  - Bấm nút **"Xác nhận hoàn thành dịch vụ"**.
  - **Cơ chế AT-18 chống trùng lặp:** Hệ thống sinh mã `Service_Completion_Event_ID` duy nhất gắn liền với dòng dịch vụ. Nếu bấm lặp lại, hệ thống trả về kết quả cũ mà không tạo thêm sự kiện mới, ngăn chặn tuyệt đối việc nhân đôi doanh thu hoặc nhân đôi xuất kho vật tư.
  - Đây là căn cứ để Thu ngân xuất hóa đơn tính tiền.

### Bước 9: Ký số Hồ sơ Bệnh án Điện tử (Digital Signature - AT-13 & AT-23)
- Bác sĩ bấm nút **"Ký số hoàn tất Bệnh án"**:
  - Hệ thống tính toán mã băm SHA-256 trên toàn bộ dữ liệu lâm sàng và ghi nhận chữ ký số của Bác sĩ.
  - Trạng thái EMR chuyển sang **`SIGNED`**.
  - Lượt khám tự động chuyển trạng thái sang **`CLINICAL_COMPLETED`**.
  - **Xử lý rủi ro mất mạng khi ký (AT-13):** Nếu đang ký mà gặp sự cố mạng hoặc lỗi máy chủ chữ ký, hệ thống không bao giờ tạo chữ ký giả mạo. Bệnh án được lưu nháp an toàn và tự động đẩy vào **Hàng đợi ký số** (`/sign-queue`). Khi có mạng ổn định, Bác sĩ chỉ cần vào `/sign-queue` bấm **"Ký lại"**.
  - **Nguyên tắc Bất biến (Immutability - AT-23):** Bệnh án sau khi đã `SIGNED` sẽ bị khóa cứng vĩnh viễn, cấm mọi hành vi chỉnh sửa đè. Nếu cần bổ sung thông tin (ví dụ bệnh nhân nhớ thêm tiền sử dị ứng sau khi về), Bác sĩ bấm nút **"Tạo Phụ lục đính chính (Addendum)"**, nhập lý do và nội dung đính chính kèm thời gian xác thực.

### Bước 10: Xem Hoa hồng cá nhân
- Bác sĩ có thể bấm menu **Hoa hồng & Lương** (`/hr/payroll`) để xem danh sách các dịch vụ mình đã hoàn thành trong tháng và số tiền hoa hồng được hưởng tương ứng. Bác sĩ chỉ xem được dữ liệu của chính mình, không xem được của bác sĩ khác.

---

## 5. Quy trình Dành cho Quản lý Kho & Tiệt trùng / Labo (WAREHOUSE)

### Bước 1: Nhập kho Thuốc & Vật tư y tế
- **Đăng nhập:** Tài khoản `warehouse` / `WarehouseManager1234@`.
- **Chuyển màn hình:** Menu bên trái -> **Kho thuốc & Vật tư** (`/inventory`).
- Bấm nút **"+ Tạo phiếu nhập kho"** (Goods Receipt):
  - Chọn Nhà cung cấp: `Nhà cung cấp mẫu` (LOCAL-SUPPLIER).
  - Chọn Kho nhập: `Kho Dược & Vật tư Trung tâm` (WH-MAIN).
  - Chọn Mặt hàng: Ví dụ `Găng tay y tế M`, `Thuốc tê Lidocain 2%`, `Trụ Implant Straumann`...
  - Nhập Số lượng và Đơn giá mua.
  - **Quản lý Lô & Hạn dùng (Lot & Expiry):** Bắt buộc nhập Số lô (Lot Number, ví dụ `LOT-2026-01`) và Ngày hết hạn (Expiry Date, ví dụ `2027-12-31`).
  - **Quản lý Serial (đối với Implant):** Nếu mặt hàng được cấu hình quản lý Serial, hệ thống yêu cầu nhập/quét đúng số lượng mã Serial duy nhất tương ứng với số lượng nhập.
- Bấm **"Xác nhận nhập kho"** -> Tồn kho `OnHand` tăng lên, sẵn sàng cấp phát.

### Bước 2: Kiểm soát Xuất kho theo Hạn dùng (FEFO - AT-07)
- Khi Bác sĩ kê đơn hoặc thực hiện thủ thuật:
- Hệ thống áp dụng nghiêm ngặt nguyên tắc **FEFO (First Expired, First Out)**: Tự động chỉ định xuất từ lô thuốc có hạn sử dụng gần nhất còn hiệu lực.
- Nếu một lô đã quá hạn sử dụng (Expired) hoặc đang bị cách ly: Hệ thống lập tức từ chối xuất kho và trả về mã lỗi `LOT_EXPIRED_OR_QUARANTINED`, ngăn chặn hoàn toàn việc dùng thuốc quá hạn cho người bệnh.

### Bước 3: Thu hồi Lô khẩn cấp & Truy vết Bệnh nhân (Lot Recall - AT-08)
- Khi nhận công văn thu hồi thuốc/vật tư từ nhà sản xuất hoặc Bộ Y tế:
- Tại màn hình `/inventory`, chuyển sang tab **"Quản lý Lô & Thu hồi"**:
  - Tìm kiếm Lô thuốc cần thu hồi theo Mã lô.
  - Bấm nút **"Thu hồi Lô (Recall Lot)"** -> Trạng thái lô lập tức đổi thành **`QUARANTINED`** / **`RECALLED`**. Toàn bộ số lượng tồn của lô này bị khóa ngay lập tức, không ai có thể xuất kho được nữa.
  - Bấm nút **"Báo cáo Truy vết Bệnh nhân (Patient Tracing - AT-08)"**: Hệ thống quét toàn bộ dữ liệu khám chữa bệnh và xuất bảng danh sách chi tiết: *Mã bệnh nhân, Họ tên, SĐT, Mã lượt khám, Ngày giờ đã sử dụng lô thuốc này*. Báo cáo được gửi ngay cho Hội đồng chuyên môn để theo dõi và xử lý kịp thời.

### Bước 4: Vận hành Quy trình Tiệt trùng Dụng cụ (Sterilization - AT-22)
- **Chuyển màn hình:** Menu bên trái -> **Tiệt trùng & Labo** (`/operations`).
- Chọn tab **"Quy trình Tiệt trùng Dụng cụ"**:
  - Tiếp nhận dụng cụ sau khám -> Ngâm rửa khử khuẩn -> Rửa siêu âm -> Đóng gói túi ép vô trùng và dán nhãn mã vạch (Pack Code).
  - Bấm **"+ Tạo chu trình tiệt trùng"** (Sterilization Cycle):
    - Chọn Lò hấp tiệt trùng: Ví dụ `Lò hấp sấy Melag Euroklav`. *Lưu ý: Hệ thống tự động kiểm tra hạn kiểm định/hiệu chuẩn của thiết bị; Nếu quá hạn sẽ cảnh báo sự cố vi phạm an toàn y tế.*
    - Quét danh sách các Mã gói dụng cụ đưa vào buồng hấp.
    - Cài đặt chu trình (Nhiệt độ 134°C, áp suất 2.1 bar, thời gian tiệt trùng).
    - Đặt chỉ thị sinh học/hóa học vào buồng hấp.
  - **Nghiệm thu kết quả chu trình:**
    - Sau khi lò hấp hoàn tất và đọc kết quả que thử chỉ thị:
    - *Trường hợp PASS:* Bấm **"Xác nhận PASS"** -> Toàn bộ gói dụng cụ được cấp trạng thái `STERILIZED` (Đã tiệt trùng), hệ thống tự tính hạn vô trùng (ví dụ 30 ngày) và cho phép cấp phát lên ghế khám.
    - *Trường hợp FAIL:* Bấm **"Ghi nhận FAIL"** -> Toàn bộ gói dụng cụ trong chu trình lập tức bị chuyển sang trạng thái cách ly `QUARANTINED`, cấm tuyệt đối sử dụng, đồng thời tự động kích hoạt báo cáo sự cố y khoa (`Incidents`).
    - *Trường hợp Ngoại lệ cấp cứu:* Nếu bác sĩ buộc phải can thiệp cấp cứu cầm máu đe dọa tính mạng mà gói vô trùng có cảnh báo, hệ thống cho phép ghi nhận ngoại lệ có dấu vết thời gian và chuyển Hội đồng chuyên môn hậu kiểm.

### Bước 5: Quản lý Đơn hàng Gia công Labo (Lab Orders & Reworks)
- Tại màn hình `/operations`, chọn tab **"Quản lý Đơn hàng Labo"**:
  - Khi Bác sĩ gửi dấu răng làm mão sứ, cầu răng, hàm tháo lắp: Bấm **"+ Tạo đơn Labo"**, chọn Bệnh nhân, Bác sĩ, Xưởng Labo gia công, Hạn giao dự kiến.
  - Khi nhận sản phẩm sứ từ Labo về: Kỹ thuật viên/Thủ kho kiểm tra chất lượng (QC):
    - *Nếu Đạt tiêu chuẩn:* Bấm **"Nghiệm thu Đạt"** -> Báo bác sĩ hẹn bệnh nhân gắn phục hình.
    - *Nếu Không đạt (sai màu, kênh cắn, hở bờ):* Bấm **"Yêu cầu làm lại (Rework)"**: Nhập nguyên nhân lỗi và chọn bên chịu chi phí (Labo chịu hoặc Phòng khám chịu). Hệ thống giữ nguyên đơn gốc để theo dõi và sinh phiên bản làm lại mới độc lập.

---

## 6. Quy trình Dành cho Kế toán & Kế toán trưởng (ACCOUNTANT)

### Bước 1: Kiểm soát Hóa đơn & Phê duyệt Maker-Checker (AT-20)
- **Đăng nhập:** Tài khoản kế toán viên (`accountant`) hoặc kế toán trưởng (`approver` với cờ `isApprover = true`).
- **Chuyển màn hình:** Menu bên trái -> **Kế toán & Khóa sổ** (`/accounting`) hoặc **Thu ngân & Thanh toán** (`/billing`).
- **Phê duyệt Chiết khấu & Giảm giá (AT-18, AT-20):**
  - Khi Lễ tân/Thu ngân tạo yêu cầu giảm giá vượt hạn mức thông thường:
  - Kế toán trưởng vào tab **"Phê duyệt"** xem chi tiết lý do và tỷ lệ giảm giá.
  - Bấm **"Chấp thuận"** hoặc **"Từ chối"**. Hệ thống kiểm soát chặt chẽ: Tỷ lệ giảm giá không vượt quá 100%, không cho phép chia nhỏ hóa đơn để né tránh duyệt.
- **Phê duyệt Hoàn tiền (Refunds - AT-20):**
  - Khi bệnh nhân yêu cầu hoàn lại tiền (ví dụ không làm tiếp dịch vụ hoặc hoàn tiền cọc):
  - Kế toán viên lập đề xuất hoàn tiền -> Kế toán trưởng phê duyệt độc lập (Maker-Checker).
  - Quy tắc bất biến AT-20: Tổng số tiền hoàn lũy kế không bao giờ được vượt quá số tiền thực thu còn khả dụng trên hóa đơn.

### Bước 2: Xử lý Chênh lệch Quỹ ca Thu ngân (Cash Discrepancy - AT-09)
- Tại màn hình `/accounting`, chọn tab **"Đối soát Ca Thu ngân"**:
  - Xem danh sách các ca thu ngân đã đóng có chênh lệch thực đếm (Over/Short) vượt ngưỡng cấu hình `CASH_OVER_SHORT_THRESHOLD` (ví dụ chênh lệch > 100.000 đ).
  - Xem biên bản giải trình của Thu ngân (thối nhầm tiền, lệch tiền lẻ...).
  - Kế toán trưởng đưa ra phương án xử lý: Trừ vào quỹ rủi ro ca trực / Yêu cầu nhân viên bồi hoàn / Đưa vào chi phí tổn thất được duyệt.
  - Bấm **"Phê duyệt kết luận phân xử"** -> Ca thu ngân chuyển sang trạng thái **`RECONCILED`**. Tuyệt đối không xóa hay sửa đè dữ liệu giao dịch cũ để làm khớp sổ.

### Bước 3: Quản lý Bảo lãnh Bảo hiểm Thương mại (BHTM - AT-03, AT-04, AT-14)
- **Chuyển màn hình:** Menu bên trái -> **Bảo hiểm thương mại** (`/insurance`).
- Chọn tab **"Hồ sơ Yêu cầu Bồi thường (Insurance Claims)"**:
  - **Lập & Gửi hồ sơ claim:** Chọn lượt khám có bảo lãnh BHTM, kiểm tra dịch vụ và chi phí đủ điều kiện -> Bấm **"Gửi hồ sơ bồi thường"** (AT-14 chống gửi lặp hồ sơ).
  - **Ghi nhận duyệt bảo lãnh (AT-03):** Khi công ty bảo hiểm gửi thông báo chấp thuận bồi thường (ví dụ duyệt 1.000.000 đ): Kế toán nhập thông tin duyệt. *Lưu ý quy tắc AT-03: Khoản này chỉ được hạch toán tăng Phải thu BHTM (TK 131), số dư tài khoản ngân hàng của phòng khám chưa tăng và hồ sơ tuyệt đối chưa được chuyển sang `SETTLED`.*
  - **Xử lý BHTM duyệt thiếu hoặc từ chối (AT-04):** Nếu bảo hiểm chỉ duyệt một phần hoặc từ chối, hệ thống đối chiếu hợp đồng. Nếu hợp đồng không cho phép thu lại của bệnh nhân, hệ thống ngăn cấm tự ý chuyển nợ sang người bệnh, mà yêu cầu lập **"Quyết định xử lý chênh lệch BHTM"** do Kế toán trưởng phê duyệt.
  - **Nhận tiền thanh toán từ BHTM:** Khi tiền về tài khoản ngân hàng, Kế toán đối chiếu sao kê và bấm **"Xác nhận thanh toán BHTM"** -> Hồ sơ claim chính thức chuyển sang trạng thái **`SETTLED`** và đóng ca **`CLOSED`**.

### Bước 4: Hạch toán Sổ cái Bút toán kép & Khóa sổ Kỳ kế toán (AT-10, AT-24)
- Tại màn hình `/accounting`, chọn tab **"Sổ cái & Bút toán (General Ledger)"**:
  - Xem các bút toán tự động sinh từ sự kiện nghiệp vụ:
    - Hoàn thành dịch vụ: `Nợ 131 / Có 511` (Ghi nhận doanh thu và phải thu).
    - Thu tiền mặt: `Nợ 111 / Có 131` (Thu nợ giảm phải thu).
    - Thu tiền cọc: `Nợ 111 / Có 3387` (Tăng tiền, tăng doanh thu chưa thực hiện).
    - Cấn cọc: `Nợ 3387 / Có 131` (Cấn trừ nghĩa vụ, không ghi doanh thu lần 2).
    - Xuất kho vật tư: `Nợ 632 / Có 156` (Giá vốn hàng bán).
  - Kiểm tra tính cân đối Nợ = Có trên từng bút toán (AT-24).
- **Khóa sổ kỳ kế toán (Accounting Period Closing - AT-10):**
  - Chuyển sang tab **"Kỳ kế toán & Khóa sổ"**:
  - Cuối kỳ kế toán (tháng/quý), sau khi kiểm tra toàn bộ chứng từ đã hạch toán đầy đủ:
  - Kế toán trưởng bấm nút **"Khóa sổ kỳ kế toán"** (Chuyển trạng thái kỳ sang `CLOSED`).
  - **Quy tắc bất biến AT-10:** Sau khi kỳ đã khóa, hệ thống cấm tuyệt đối mọi hành vi thêm mới, sửa đổi hoặc xóa chứng từ có ngày hạch toán rơi vào kỳ đã đóng. Nếu phát hiện sai sót sau khóa sổ, bắt buộc phải hạch toán bút toán điều chỉnh vào kỳ kế toán đang MỞ hiện tại (AT-11).

### Bước 5: Tính toán & Phê duyệt Bảng lương, Hoa hồng (Module 11)
- **Chuyển màn hình:** Menu bên trái -> **Hoa hồng & Lương** (`/hr/payroll`).
- Chọn tab **"Bảng tính Hoa hồng & Lương"**:
  - Chọn Kỳ tính lương và Chi nhánh.
  - Bấm **"Tính toán hoa hồng tự động"**: Hệ thống quét toàn bộ các sự kiện hoàn thành dịch vụ trong kỳ và áp dụng tỷ lệ hoa hồng theo phiên bản quy tắc đã được phê duyệt.
  - **Quy tắc an toàn tài chính:** Một dòng tiền chỉ được tính hoa hồng một lần duy nhất; Nếu có ca hoàn tiền hoặc hủy dịch vụ sau chốt, hệ thống tự động sinh bút toán điều chỉnh hoa hồng số âm (`CommissionAdjustment`) liên kết với khoản gốc, không sửa đè bảng lương cũ đã khóa.
  - Kế toán trưởng rà soát các khoản phụ cấp, giảm trừ và bấm **"Phê duyệt Bảng lương"**.

### Bước 6: Chạy Báo cáo Đối soát Cuối ngày & Kiểm tra Toàn vẹn Hệ thống (Module 12)
- **Chuyển màn hình:** Menu bên trái -> **Đối soát & Toàn vẹn** (`/reconciliation`).
- **Chạy Đối soát Tổng hợp Cuối ngày (Daily Reconciliation):**
  - Bấm nút **"Chạy Đối soát Tự động Cuối ngày"**:
  - Hệ thống tự động quét và đối chiếu chéo 5 nguồn nghiệp vụ:
    1. Quỹ tiền mặt các ca thu ngân (So khớp thực đếm và sổ quỹ).
    2. Giao dịch ngân hàng và cổng thanh toán QR chờ khớp.
    3. Hồ sơ EMR chờ ký số quá hạn xử lý.
    4. Gói dụng cụ vô trùng lỗi hoặc thiết bị quá hạn kiểm định.
    5. Đơn hàng gia công Labo quá hạn bàn giao.
  - Mọi sai lệch (Anomalies) được liệt kê chi tiết kèm mức độ ưu tiên để Kế toán trưởng phân xử.
- **Kiểm tra Toàn vẹn Chữ ký số EMR SHA-256 (AT-19):**
  - Bấm nút **"Kiểm tra Toàn vẹn Dữ liệu EMR"**: Hệ thống quét toàn bộ bảng `EmrSignatures` và tính toán lại chuỗi băm SHA-256 (64 ký tự hex), xác nhận 100% hồ sơ không bị can thiệp trái phép.
- **Hoàn tiền sau khóa sổ (AT-11):**
  - Nếu phát sinh ca hoàn tiền cho hóa đơn thuộc kỳ kế toán cũ đã đóng: Kế toán trưởng sử dụng chức năng "Hoàn tiền sau khóa sổ", nhập mã giao dịch gốc và mã kỳ kế toán đang mở để hệ thống tạo chứng từ điều chỉnh hợp lệ mà không phá vỡ tính bất biến của kỳ cũ.

---

## 7. Quy trình Dành cho Quản trị viên (ADMIN)

### Bước 1: Quản lý Phòng khám & Ghế điều trị (Rooms & Chairs)
- **Đăng nhập:** Tài khoản `admin` / `Admin1234@`.
- **Chuyển màn hình:** Menu bên trái -> **Phòng khám & Ghế** (`/catalog/rooms`).
- **Thao tác:**
  - Xem danh mục ghế nha và phòng chức năng hiện có:
    - Mã `CHAIR-01`: Ghế nha số 1.
    - Mã `STERILE-01`: Phòng tiệt trùng.
  - Bấm nút **"+ Thêm phòng/ghế mới"**:
    - Nhập Mã phòng/ghế (Ví dụ: `CHAIR-02`).
    - Nhập Tên hiển thị (Ví dụ: `Ghế điều trị VIP 02`).
    - Chọn Loại phòng: `Ghế điều trị nha khoa` (CHAIR) hoặc `Phòng tiệt trùng` (STERILIZATION).
  - Bấm **"Lưu danh mục"**.
  - Quản lý trạng thái hoạt động: Có thể chuyển trạng thái Sẵn sàng hoạt động, Đang bảo dưỡng hoặc Tạm ngưng.

### Bước 2: Quản lý Danh mục Dịch vụ & Bảng giá Phiên bản (AT-16, AT-21)
- **Chuyển màn hình:** Menu bên trái -> **Dịch vụ & Bảng giá** (`/catalog/services`).
- **Thao tác:**
  - Xem danh mục dịch vụ điều trị (Khám tư vấn, Cạo vôi răng, Nhổ răng khôn, Trám răng composite, Tẩy trắng răng...).
  - Thêm dịch vụ mới: Bấm **"+ Thêm dịch vụ"**, nhập mã dịch vụ và tên dịch vụ.
  - **Quản lý Bảng giá theo phiên bản (Versioned Price Management):**
    - Khi phòng khám điều chỉnh tăng/giảm giá: Bấm **"Tạo phiên bản giá mới (Draft)"**:
      - Nhập Đơn giá mới (Ví dụ: `350,000` VND).
      - Nhập Ngày bắt đầu có hiệu lực (`EffectiveFrom`).
      - Gửi Kế toán trưởng phê duyệt (Maker-Checker).
    - **Quy tắc AT-21:** Hệ thống cấm tuyệt đối duyệt 2 phiên bản giá có khoảng thời gian hiệu lực chồng lấn nhau trong cùng một chi nhánh.
    - **Quy tắc AT-16:** Khi phiên bản giá mới có hiệu lực, toàn bộ các báo giá và hóa đơn cũ đã chốt vẫn giữ nguyên đơn giá cũ, không bao giờ bị nhảy giá hồi tố.

### Bước 3: Quản lý Tài khoản Người dùng & Phân quyền (RBAC)
- **Chuyển màn hình:** Menu bên trái -> **Quản lý người dùng** (`/users`).
- **Thao tác:**
  - Xem danh sách toàn bộ nhân sự phòng khám theo 5 vai trò chuẩn: `ADMIN`, `RECEPTIONIST`, `DOCTOR`, `ACCOUNTANT`, `WAREHOUSE`.
  - Thêm nhân viên mới: Bấm **"+ Thêm người dùng"**:
    - Tên đăng nhập (Username).
    - Tên hiển thị (DisplayName).
    - Mật khẩu: Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
    - Chọn Vai trò (Role).
    - Chọn Chi nhánh làm việc (`LOCAL`).
    - Bật cờ `isApprover` nếu nhân sự là Kế toán trưởng có quyền phê duyệt cấp cao.
  - **Lưu trữ tài khoản (Soft-delete):** Khi nhân viên nghỉ việc, Admin bấm nút **"Lưu trữ (Soft-delete)"** để đưa bản ghi vào bảng `Users_Deleted`. Hệ thống bảo toàn 100% lịch sử các ca khám, bệnh án và chứng từ do nhân viên đó từng lập trong quá khứ, không làm gãy khóa ngoại.

### Bước 4: Kiểm tra Sức khỏe Hệ thống (System Health Check)
- **Chuyển màn hình:** Menu bên trái -> **Kiểm tra hệ thống** (`/environment`).
- **Thao tác:**
  - Kiểm tra trạng thái Liveness API (`/api/health/live`).
  - Kiểm tra kết nối CSDL SQL Server Readiness (`/api/health/ready`).
  - Xem các cấu hình hệ thống toàn cục: Ngưỡng làm tròn tiền tối đa (`MAX_ROUNDING_AMOUNT`), Ngưỡng chênh lệch két tiền mặt (`CASH_OVER_SHORT_THRESHOLD`).

---

## 8. Quy trình Phối hợp Liên vai trò Mẫu (End-to-End Walkthrough)

Dưới đây là hành trình khép kín của một ca khám bệnh thực tế từ lúc bệnh nhân bước vào phòng khám đến khi ra về:

```
[BỆNH NHÂN ĐẾN]
       │
       ▼
[1. LỄ TÂN (RECEPTIONIST)]
  • Vào màn hình: /patients -> Kiểm tra / Tạo hồ sơ bệnh nhân mới (Check AT-05).
  • Chuyển màn hình: /visits -> Tiếp nhận lượt khám, phân công Bác sĩ và Ghế nha (Kích hoạt AT-17).
  • Trạng thái lượt: REGISTERED.
       │
       ▼
[2. BÁC SĨ (DOCTOR)]
  • Nhận thông báo tại: /visits -> Bấm "Mở Bệnh án (EMR)" -> Vào màn hình /visits/:visitId/emr.
  • Trạng thái lượt: IN_PROGRESS.
  • Thăm khám lâm sàng, ghi chẩn đoán, đánh dấu răng tổn thương trên Sơ đồ răng FDI 32 răng.
  • Lấy phiếu đồng thuận có chữ ký bệnh nhân (AT-06).
  • Chỉ định vật tư / Quét Serial Implant (AT-12 chống tái sử dụng).
  • Thực hiện thủ thuật, kê đơn thuốc ngoại trú.
  • Chốt hoàn thành dịch vụ (AT-18 chống tính trùng).
  • Ký số điện tử EMR SHA-256 (AT-13 mạng ổn định / AT-23 khóa bất biến).
  • Trạng thái lượt: CLINICAL_COMPLETED.
       │
       ▼
[3. THỦ KHO (WAREHOUSE)]
  • Hệ thống kho tự động xuất trừ vật tư/thuốc theo nguyên tắc FEFO (AT-07).
  • Cấp phát gói dụng cụ vô trùng đạt chuẩn (AT-22).
       │
       ▼
[4. THU NGÂN / LỄ TÂN (RECEPTIONIST / ACCOUNTANT)]
  • Chuyển màn hình: /billing -> Tab "Lập hóa đơn & Thanh toán".
  • Tự động kéo các dịch vụ bác sĩ đã chốt.
  • Cấn trừ cọc nếu có (AT-15), trừ phần BHTM bảo lãnh nếu có (AT-03/04).
  • Thu tiền phần còn lại (Tiền mặt / Chuyển khoản QR) -> Xuất hóa đơn (AT-01, AT-02).
  • In phiếu thu và hóa đơn bàn giao cho bệnh nhân.
       │
       ▼
[5. ĐÓNG LƯỢT KHÁM]
  • Chuyển màn hình: /visits -> Bấm "Đóng lượt khám" -> Trạng thái: CLOSED.
       │
       ▼
[6. CUỐI NGÀY - KẾ TOÁN TRƯỞNG & THU NGÂN]
  • Thu ngân đóng ca đếm tiền mặt tại /billing (AT-09).
  • Kế toán trưởng vào /reconciliation chạy đối soát 5 nguồn dữ liệu và kiểm tra toàn vẹn chữ ký SHA-256 (AT-19, AT-24).
```

---

## 9. Bảng Tra cứu Tiêu chí Nghiệm thu Nghiệp vụ (AT-01 đến AT-24)

| Mã tiêu chí | Tên tiêu chí nghiệp vụ | Màn hình ứng dụng | Vai trò chịu trách nhiệm | Cơ chế bảo vệ kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **AT-01** | Cấn cọc và Thu tiền hoàn tất dịch vụ | `/billing` | `RECEPTIONIST`, `ACCOUNTANT` | Doanh thu ghi nhận đúng 1 lần; Cọc không tạo doanh thu lần 2; Công nợ về 0. |
| **AT-02** | Chống thanh toán đè / Callback QR lặp | `/billing` | `RECEPTIONIST`, `ACCOUNTANT` | Khóa `IdempotencyKey` ngăn 2 thu ngân cùng thu 1 hóa đơn; Chống gọi lặp. |
| **AT-03** | BHTM duyệt nhưng chưa chuyển tiền | `/insurance` | `ACCOUNTANT` | Chỉ ghi tăng Phải thu BHTM (131); Tiền ngân hàng chưa tăng; Chưa `SETTLED`. |
| **AT-04** | BHTM duyệt thiếu, không thu lại BN | `/insurance` | `ACCOUNTANT` | Không tự chuyển nợ sang bệnh nhân; Bắt buộc lập Quyết định xử lý chênh lệch. |
| **AT-05** | Hai bệnh nhân dùng chung số điện thoại | `/patients` | `RECEPTIONIST` | Cảnh báo trùng SĐT, cho phép lưu sau khi nhân viên xác nhận người nhà. |
| **AT-06** | Rút đồng thuận điều trị giữa chừng | `/visits/:id/emr` | `DOCTOR` | Dừng phần chưa làm, giữ nguyên phần đã làm; Tuyệt đối không xóa EMR. |
| **AT-07** | Xuất kho theo hạn dùng FEFO | `/inventory` | `WAREHOUSE`, `DOCTOR` | Tự động ưu tiên lô hạn gần nhất; Chặn tuyệt đối xuất lô quá hạn/cách ly. |
| **AT-08** | Thu hồi lô và Truy vết bệnh nhân | `/inventory` | `WAREHOUSE` | Khóa cách ly lô thu hồi ngay lập tức; Xuất danh sách toàn bộ BN đã dùng. |
| **AT-09** | Xử lý chênh lệch két tiền ca thu ngân | `/billing`, `/accounting` | `RECEPTIONIST`, `ACCOUNTANT` | Ghi nhận chênh lệch treo; Kế toán trưởng duyệt phân xử; Không sửa đè chứng từ. |
| **AT-10** | Cấm ghi lùi vào kỳ kế toán đã khóa | `/accounting` | `ACCOUNTANT` | Sau khi kỳ đã đóng (CLOSED), từ chối mọi bút toán mới có ngày hạch toán kỳ cũ. |
| **AT-11** | Hoàn tiền sau khi kỳ kế toán đã khóa | `/reconciliation` | `ACCOUNTANT` | Ghi nhận bút toán điều chỉnh vào kỳ đang MỞ hiện tại; Giữ liên kết chứng từ gốc. |
| **AT-12** | Chống tái sử dụng mã Serial Implant | `/visits/:id/emr` | `DOCTOR`, `WAREHOUSE` | Quét toàn bộ CSDL; Từ chối với lỗi 409 Conflict nếu Serial đã từng được cấy ghép. |
| **AT-13** | Mất mạng khi ký số EMR | `/sign-queue` | `DOCTOR` | Không tạo chữ ký giả mạo; Tự động lưu vào hàng đợi ký để ký lại khi có mạng. |
| **AT-14** | Chống gửi lặp hồ sơ bồi thường BHTM | `/insurance` | `ACCOUNTANT` | Khóa duy nhất theo hồ sơ và phiên bản; Chặn gửi trùng lặp lên cổng bảo hiểm. |
| **AT-15** | Chống tranh chấp cấn cọc song song | `/billing` | `RECEPTIONIST` | Giao dịch nguyên tử; Ngăn 2 thu ngân cấn cùng một khoản cọc vượt quá số dư. |
| **AT-16** | Đổi giá dịch vụ không ảnh hưởng ca cũ | `/catalog/services` | `ADMIN`, `RECEPTIONIST` | Hóa đơn và báo giá cũ giữ nguyên đơn giá theo phiên bản hiệu lực tại thời điểm tạo. |
| **AT-17** | Kiểm soát Quan hệ điều trị xem EMR | `/visits/:id/emr` | `DOCTOR` | Bác sĩ chỉ xem được EMR của BN có phân công điều trị; Bác sĩ khác bị từ chối 403. |
| **AT-18** | Chống nhân đôi chốt dịch vụ hoàn thành | `/visits/:id/emr` | `DOCTOR` | Sinh mã `Service_Completion_Event_ID` duy nhất; Chống gọi lặp nhân đôi doanh thu. |
| **AT-19** | Toàn vẹn chữ ký số SHA-256 EMR | `/reconciliation` | `ACCOUNTANT`, `ADMIN` | Quét và kiểm tra định dạng mã băm SHA-256 64 ký tự hex trên toàn bộ bệnh án đã ký. |
| **AT-20** | Kiểm soát số học tiền tệ & Maker-Checker | `/billing`, `/accounting` | `ACCOUNTANT` | Chặn giá/số lượng âm, chiết khấu > 100%, hoàn tiền > thực thu; Người lập không tự duyệt. |
| **AT-21** | Chống chồng chéo phiên bản giá dịch vụ | `/catalog/services` | `ADMIN`, `ACCOUNTANT` | Cấm duyệt 2 phiên bản giá có hiệu lực trùng khoảng thời gian trong cùng chi nhánh. |
| **AT-22** | Kiểm soát gói tiệt trùng và lò hấp | `/operations` | `WAREHOUSE`, `DOCTOR` | Lò hấp quá hạn hoặc chỉ thị FAIL sẽ cách ly toàn bộ gói dụng cụ; Ngoại lệ cấp cứu. |
| **AT-23** | Tính bất biến của Bệnh án EMR đã ký | `/visits/:id/emr` | `DOCTOR` | Cấm sửa đè EMR sau khi đã ký số; Mọi bổ sung bắt buộc tạo Phụ lục đính chính (Addenda). |
| **AT-24** | Bút toán kép cân đối & Không lệch sổ | `/accounting` | `ACCOUNTANT` | Bắt buộc Nợ = Có; Khóa duy nhất chống ghi trùng; Báo cáo đối soát tổng hợp v14. |
