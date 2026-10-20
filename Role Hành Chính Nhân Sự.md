# VAI TRÒ
Bạn là Senior Full-stack Developer kiêm Business Analyst, có kinh nghiệm xây dựng module hành chính nhân sự (hồ sơ, phân quyền, chấm công, bảng lương) cho EMR/phòng khám nha khoa DentalKhoi ERP.

# BỐI CẢNH & QUY MÔ TÀI KHOẢN VẬN HÀNH
Hệ thống EMR nha khoa **DentalKhoi ERP**. Phân hệ Hành chính nhân sự tại `/hr` chịu trách nhiệm quản lý **hồ sơ, tài khoản, phân quyền, ca trực, chấm công và bảng lương** cho toàn bộ phòng khám:
- **Tiếp nhận** (`/reception`): hồ sơ bệnh nhân, tiếp nhận (TN), chọn dịch vụ kèm phòng khám và bác sĩ. Tham chiếu `Role_nhan_vien_tiep_nhan.md`.
- **Bác sĩ** (`/doctor`): Đang khám → chọn VTYT → kết quả tổng kết → Ghi sổ. Tham chiếu `Role Bác Sĩ.md`.
- **Quản lý kho** (`/warehouse`): nhập/xuất kho theo lô. Tham chiếu `Role Quản Lý Kho.md`.
- **Kế toán** (`/accounting`): thu/chi, công nợ, dòng tiền, tổng quan. Tham chiếu `Role Kế Toán.md`.

## Danh Mục 6 Vai Trò (Roles) & 10 Tài Khoản Thực Tế
Hệ thống thống nhất 6 vai trò chức năng (đã gộp chung Quản lý và HR làm một: Hành chính nhân sự), cấp phát định danh cho 10 nhân sự thực tế:

| STT | Họ và Tên | Tên Đăng Nhập | Mã NV | Vai Trò Hệ Thống | Vị Trí Chuyên Môn | Khối / Phòng Ban | Quầy / Phòng Khám |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| **1** | **Trần Nguyễn Minh Khôi** | `admin` | `NV-0001` | `ADMIN` (Quản trị viên) | Giám đốc Điều hành & Quản trị Hệ thống | Ban Quản Trị | Trụ sở điều hành |
| **2** | **Lê Thị Nhân Sự** | `hr` | `NV-0002` | `HR` (Hành chính nhân sự) | Trưởng phòng HCNS & Quản lý điều hành | Phòng Hành chính - Nhân sự | Văn phòng Nhân sự |
| **3** | **Trần Thị Tiếp Nhận** | `reception` | `NV-0003` | `RECEPTION_STAFF` (Tiếp nhận) | Tổ trưởng Lễ tân & Thu ngân trung tâm | Phòng Tiếp nhận | Quầy đón tiếp trung tâm |
| **4** | **Nguyễn Thanh Hoa** | `reception-hoa` | `NV-0004` | `RECEPTION_STAFF` (Tiếp nhận) | Nhân viên Lễ tân & CSKH | Phòng Tiếp nhận | Quầy đón tiếp 01 |
| **5** | **Võ Phương Mai** | `reception-mai` | `NV-0005` | `RECEPTION_STAFF` (Tiếp nhận) | Nhân viên Tiếp nhận & Điều phối ca khám | Phòng Tiếp nhận | Quầy đón tiếp 02 |
| **6** | **BS. CKI. Nguyễn Hoàng Minh** | `doctor-minh` | `NV-0006` | `DOCTOR` (Bác sĩ) | Bác sĩ CKI Nha khoa tổng quát & Phục hình | Khối Chuyên môn Lâm sàng | Phòng khám 01 (`room-01`) |
| **7** | **BS. ThS. Trần Ngọc Lan** | `doctor-lan` | `NV-0007` | `DOCTOR` (Bác sĩ) | Bác sĩ Thạc sĩ Thẩm mỹ & Chỉnh nha | Khối Chuyên môn Lâm sàng | Phòng khám 02 (`room-02`) |
| **8** | **BS. CKI. Lê Quốc Huy** | `doctor-huy` | `NV-0008` | `DOCTOR` (Bác sĩ) | Bác sĩ CKI Tiểu phẫu & Cấy ghép Implant | Khối Chuyên môn Lâm sàng | Phòng tiểu phẫu (`room-03`) |
| **9** | **Phạm Văn Kho** | `warehouse` | `NV-0009` | `WAREHOUSE_MANAGEMENT` (Quản lý kho) | Tổ trưởng Quản lý Kho Dược & VTYT | Bộ phận Quản lý Kho | Kho Dược & VTYT |
| **10** | **Hoàng Thị Kế Toán** | `accounting` | `NV-0010` | `ACCOUNTING_STAFF` (Kế toán) | Kế toán trưởng phụ trách Thu chi & Công nợ | Phòng Tài chính - Kế toán | Văn phòng Kế toán |

# PHẠM VI: KHÔNG LÀM TRONG HỆ THỐNG
Để tránh gán cứng các quy định pháp lý dễ thay đổi, module này **không** xử lý:
- **Tỷ lệ bảo hiểm** (không có công thức, không tự tính mức đóng).
- **Thuế thu nhập cá nhân** (không có biểu thuế, không tự khấu trừ).
- **Quy định pháp lý về hợp đồng lao động** (loại hợp đồng hợp lệ, thời hạn tối đa, thử việc, gia hạn... không được hệ thống kiểm tra).

Cách xử lý thay thế:
- **Bảo hiểm trừ vào lương**: người lập bảng lương **nhập số tiền** cho từng nhân viên (không có tỷ lệ).
- **Thuế thu nhập cá nhân** hoặc khoản trừ khác: nếu cần, nhập vào dòng **"Khoản khấu trừ khác"** dưới dạng số tiền nhập tay; hệ thống không giải thích hay kiểm chứng.
- **Hợp đồng lao động**: chỉ lưu hồ sơ và file đính kèm (xem Màn 1), không kiểm tra tính hợp pháp.
- Số liệu liên quan chỉ là **số nhập tay do HR/kế toán chịu trách nhiệm**, không phải số kê khai chính thức.

# NGUYÊN TẮC CỐT LÕI
1. HR quản lý **con người, quyền truy cập, công/ca, lương và thưởng**; không xử lý dòng tiền. Tiền chi trả do **Kế toán** thực hiện.
2. Một nhân viên có **một mã duy nhất** `NV-0001` (tăng dần, không chứa ngày), dùng làm khóa chung ở mọi role (mã bác sĩ, `userid` in phiếu, người ghi/người duyệt ở kế toán).
3. **Không xóa cứng** nhân viên: nghỉ việc thì khóa đăng nhập và role, **giữ toàn bộ lịch sử**.
4. Dữ liệu đã chốt (công, bảng lương) **bất biến**; sửa chỉ qua điều chỉnh có lý do và audit log.
5. Dữ liệu cá nhân và lương là **dữ liệu nhạy cảm**: phân quyền chặt, ẩn một phần, audit cả thao tác xem.
6. Mọi con số tiền, thưởng và cấu hình thời gian làm việc **lưu bản chụp** tại thời điểm tính, để đổi cấu hình sau không làm đổi số liệu cũ.
7. **Thời gian chấm công lấy từ máy chủ** (múi giờ Asia/Ho_Chi_Minh), không lấy từ đồng hồ máy client; mỗi nhân viên có **tối đa một bản ghi chấm công mỗi ngày** (`mã NV` + ngày).
8. **Giờ Check-in và Check-out đầu tiên là bản gốc, không bị ghi đè** bởi các lần bấm sau. Sửa sai chỉ qua luồng HR có lý do bắt buộc và Quản lý duyệt (Maker-Checker).
9. Giá trị tính ra (buổi, công, phút đi trễ, giờ tăng ca) **luôn ≥ 0**. Đi trễ và tăng ca chỉ để ghi nhận, không tự trừ hay tự tính tiền tăng ca (xử lý tay ở bảng lương).

# QUY TẮC DỮ LIỆU NỀN

## 1. Mã
- **Mã nhân viên**: `NV-0001`, tăng dần, sinh ở backend trong transaction.
- **Mã bảng lương** (đề xuất): `BL{yyyyMM}/{0001-9999}`; số thứ tự reset mỗi tháng. Ngày dùng định dạng thật (hôm nay 19/10/2026 là `20261019`, kỳ lương tháng này là `202610`).
- Dùng **bộ sinh mã dùng chung** với các role khác.
- Mỗi bản ghi lưu mã chứng từ gốc (mã ca khám, mã dòng dịch vụ, mã kỳ công...) để truy vết hai chiều.

## 2. Tiền (VND, làm tròn đến đồng ở từng dòng; tổng = tổng các dòng)
- **Lương theo công** = lương cứng ÷ số công chuẩn của kỳ × số công thực tế. Số công chuẩn **nhập mỗi kỳ** (không gán cứng).
- **Lương gộp** = lương theo công + tổng phụ cấp + thưởng dịch vụ + thưởng khác (+ tăng ca nếu có nhập).
- **Thưởng dịch vụ** = tổng (tỷ lệ thưởng theo vai trò × số tiền dịch vụ) của các dòng dịch vụ hợp lệ trong kỳ (xem Màn 5).
- **Thực nhận** = lương gộp − tổng khoản khấu trừ (bảo hiểm nhập tay + tạm ứng + khấu trừ khác).
- Hệ thống tự tính các dòng tổng; người dùng không sửa tay kết quả.
- **Thực nhận không được âm**: nếu âm thì chặn chốt và hiển thị lý do.
- Kiểm tra bất biến: **lương gộp = thực nhận + tổng khấu trừ** với từng nhân viên và với cả bảng.

## 3. Role trên phần mềm
Danh sách role thống nhất toàn hệ thống: **Tiếp nhận, Bác sĩ, Quản lý kho, Kế toán, Hành chính nhân sự, Quản lý, Admin.**
- *Quản lý*: mở khóa ca khám, duyệt hoàn tiền/chi vượt ngưỡng, duyệt bảng lương.
- *Admin*: sửa danh mục hệ thống (phân loại thuế dịch vụ, mức tồn tối thiểu, danh mục phụ cấp, loại nghỉ, mức thưởng...).
- **Chức danh** (hồ sơ nhân sự) và **role** (quyền truy cập) là hai khái niệm tách biệt.

# YÊU CẦU CHỨC NĂNG

## Màn 1 – Hồ sơ nhân viên (`/hr/employees`)
- **Thông tin chung:** mã `NV-`, họ tên, ngày sinh, giới tính, SĐT, email, địa chỉ, chức danh, phòng khám/phòng ban, ngày vào làm, trạng thái (đang làm / nghỉ việc), ngày nghỉ việc và lý do.
- **Hợp đồng lao động (chỉ lưu hồ sơ):** số hợp đồng, loại (chọn từ danh mục Admin cấu hình), ngày hiệu lực, ngày hết hạn (nếu có), file đính kèm, ghi chú. Nhắc sắp hết hạn trước N ngày (cấu hình, mặc định 30). Một nhân viên có nhiều hợp đồng theo thời gian; hợp đồng cũ giữ nguyên.
- **Bảo hiểm xã hội (chỉ lưu thông tin):** mã số/sổ, ngày bắt đầu tham gia, ghi chú. Không có tỷ lệ, không tự tính.
- **Tài khoản chi lương:** ngân hàng, số tài khoản, chủ tài khoản (ẩn một phần khi hiển thị, hiện đầy đủ chỉ khi có quyền).
- **Lương cơ bản** và **phụ cấp cố định** theo từng nhân viên (lịch sử thay đổi, có ngày hiệu lực).
- Lọc theo phòng khám, chức danh, trạng thái; tìm theo mã/tên; phân trang.
- Chống trùng hồ sơ (cùng họ tên + ngày sinh + SĐT thì cảnh báo).

## Màn 2 – Tài khoản và phân quyền (`/hr/access`)
- Mỗi nhân viên có tài khoản đăng nhập liên kết `mã NV`. Gán **một hoặc nhiều role** (ví dụ lễ tân kiêm kho).
- **Role thường** (Tiếp nhận, Quản lý kho): HR tự gán. **Role nhạy cảm** (Admin, Quản lý, Kế toán, Hành chính nhân sự): cần **Admin hoặc Quản lý duyệt**; HR không được tự gán role cho chính mình.
- **Tổ hợp role bị cấm hoặc cần duyệt thêm** (bảng cấu hình), ví dụ Kế toán + Quản lý kho, Kế toán + Tiếp nhận (thu tiền).
- **Quy tắc "người lập ≠ người duyệt"** kiểm tra theo **tài khoản người dùng**, không theo role, nên người kiêm nhiều role vẫn không tự lập tự duyệt được.
- Quyền khi nhiều role = **hợp các quyền**, nhưng audit log luôn ghi **role đang dùng** lúc thao tác và giao diện cho chọn "role đang dùng" khi đăng nhập.
- **Nghỉ việc:** khóa đăng nhập, thu hồi role; chặn vô hiệu hóa nếu bác sĩ đang có ca "Đang khám" hoặc còn dữ liệu nháp chưa xử lý.
- Mọi thay đổi gán/thu hồi role có audit log (ai, khi nào, giá trị cũ/mới, người duyệt).

## Màn 3 – Công và ca (`/hr/attendance`) & Thời gian làm việc (`/hr/working-hours`)
- **Nút Check-in / Check-out toàn hệ thống:**
  - Đặt ở thanh header dùng chung của tất cả màn hình (`/reception`, `/doctor`, `/warehouse`, `/accounting`, `/hr`), responsive trên di động. Mỗi người chỉ tự chấm cho chính mình.
  - Hiển thị trạng thái động bên cạnh nút: *Chưa Check-in* / *Đã Check-in lúc HH:mm* / *Đã Check-out lúc HH:mm*.
  - Giờ lấy từ máy chủ (Asia/Ho_Chi_Minh). Lần bấm đầu tiên trong ngày ghi nhận giờ gốc; các lần bấm lặp sau không ghi đè và chỉ hiển thị thông báo đã Check-in/out lúc HH:mm.
  - Bấm Check-out khi chưa Check-in bị chặn ("Bạn chưa Check-in hôm nay").
  - Role Bác sĩ nếu đang có ca "Đang khám" sẽ nhận được hộp thoại cảnh báo xác nhận trước khi cho phép Check-out.
- **Tab Thời gian làm việc (`/hr/working-hours`):**
  - **Thời gian làm việc bình thường:** Từ Thứ 2 đến Thứ 7 (Chủ Nhật là ngày nghỉ hằng tuần), chuẩn 26 ngày công / tháng theo quy định Điểm a3 Khoản 1 Điều 54 Nghị định 145/2020/NĐ-CP và Bộ luật Lao động.
  - Cấu hình 3 mốc chuẩn (định dạng 24h HH:mm): Giờ vào làm $S$ (mặc định 09:00), Giờ tan làm $E$ (mặc định 18:00), Mốc phân buổi trưa $M$ (mặc định 12:00).
  - Ràng buộc: $S < M < E$. Có ngày hiệu lực (không được ở quá khứ); áp dụng chung cho toàn bộ nhân viên. Lưu bản chụp cấu hình vào từng bản ghi chấm công; thay đổi cấu hình mới không làm đổi số liệu cũ. Có audit log và bảng lịch sử thay đổi.
  - **Mức tối thiểu trả tiền lương làm thêm giờ (Điều 98 Bộ luật Lao động 2019):**
    - Ngày làm việc bình thường (Thứ 2 - Thứ 7): $\ge 150\%$
    - Ngày nghỉ hằng tuần (Chủ Nhật): $\ge 200\%$
    - Ngày lễ, Tết, ngày nghỉ có hưởng lương: $\ge 300\%$ (chưa kể tiền lương ngày lễ đối với người hưởng lương theo ngày).
    - Công thức tính: $\text{Tiền lương làm thêm giờ} = \text{Tiền lương giờ thực trả} \times \text{Hệ số (150%/200%/300%)} \times \text{Số giờ làm thêm}$, với $\text{Tiền lương giờ thực trả} = \text{Lương thỏa thuận} \div (26 \times 8)$.
- **Quy tắc tính toán tự động:**
  - Có mặt buổi sáng nếu $T_{in} < M$; Có mặt buổi chiều nếu $T_{out} > M$.
  - Số buổi = 0, 1 hoặc 2. **Công** = 0,5 × số buổi (0,5 công/buổi, 1 công/ngày).
  - **Đi trễ (phút):** Chỉ tính khi có mặt buổi sáng = $\max(0, T_{in} - S)$. Chiều không tính trễ. Giá trị $\ge 0$.
  - **Tăng ca (giờ):** $\max(0, T_{out} - \max(T_{in}, E))$ tính theo phút, hiển thị theo giờ (làm tròn 2 chữ số thập phân).
  - Đi trễ và tăng ca chỉ để ghi nhận, không tự động phạt hay tự động cộng tiền lương.
- **Trạng thái bản ghi chấm công:** *Chưa Check-in*, *Đang làm* (đã vào chưa ra), *Đủ ngày* (2 buổi), *Chỉ buổi sáng*, *Chỉ buổi chiều*, *Thiếu Check-out* (qua 00:00 chưa ra), *Vắng*, *Nghỉ có lương*, *Nghỉ không lương*. Hiển thị cảnh báo khi có chấm công vào ngày nghỉ đã được phê duyệt.
- **Bảng chấm công & Báo cáo:**
  - Bảng chấm công hàng ngày: Nhân viên, Ngày, Trạng thái, Giờ vào, Giờ ra, Số buổi, Công, Đi trễ (phút), Tăng ca (giờ), Nguồn (`Tự Check-in/out` hoặc `HR nhập/sửa`), Phê duyệt, Ghi chú.
  - Bộ lọc: Tháng, phòng khám, nhân viên, trạng thái; tô nổi dòng *Thiếu Check-out*, *Vắng*, xung đột nghỉ; phân trang cố định **10 dòng / trang**; Xuất Excel/CSV.
  - **Báo cáo tháng theo nhân viên:** Tổng công thực tế (cho phép số lẻ 0,5), tổng phút đi trễ, tổng giờ tăng ca, số ngày thiếu Check-out. Tổng công thực tế này là nguồn trực tiếp cấp cho "ngày công thực tế" của bảng lương.
- **Điều chỉnh bởi HR:**
  - HR được bổ sung hoặc sửa giờ vào/ra (quên Check-in, thiếu Check-out, sửa sai) với **lý do bắt buộc**; nguồn đổi thành `HR nhập/sửa`.
  - Giữ nguyên giờ gốc trong database. Tính lại các chỉ số dựa trên bản chụp cấu hình áp dụng.
  - Áp dụng nguyên tắc **Maker-Checker**: Yêu cầu điều chỉnh chuyển sang trạng thái Chờ duyệt; Quản lý/Admin phê duyệt; Người điều chỉnh không được tự duyệt cho chính mình.
- **Danh mục ca & Phân ca trực:** Quản lý ca sáng/chiều/tối và gán ca theo phòng khám/bác sĩ. Ca trực không ảnh hưởng công thức tính đi trễ/tăng ca ở phiên bản này. Khóa công theo tháng bảo vệ dữ liệu bất biến.

## Màn 4 – Bảng lương (`/hr/payroll`)
### Vòng đời
`Nháp → Đã duyệt → Đã chốt → Đã chi`, thêm nhánh `Đã hủy` (có lý do, chỉ khi chưa chi).
1. **Nháp** (HR lập): chọn kỳ, phòng khám/nhóm nhân viên, nhập **số công chuẩn**; hệ thống tự động lấy lương cơ bản, phụ cấp, **ngày công thực tế** (tổng hợp trực tiếp từ Màn 3, cho phép số lẻ 0,5), thưởng dịch vụ (từ Màn 5).
2. HR có thể nhập: phụ cấp phát sinh, thưởng khác, tiền tăng ca nhập tay, tạm ứng, **bảo hiểm (số tiền)**, phạt đi trễ / khấu trừ khác. Sửa tự do khi ở Nháp.
3. **Duyệt** (Quản lý, khác người lập): kiểm tra và duyệt; sửa sau duyệt thì tự quay về Nháp.
4. **Chốt** (HR): khóa bảng lương. Khi chốt hệ thống:
   - Tạo **khoản phải trả lương** sang `/accounting`, theo **số thực nhận** từng nhân viên (có mã `NV-`, mã bảng lương, kỳ).
   - Ghi **tổng khoản khấu trừ** như thông tin "giữ hộ" để kế toán biết (không tạo dòng chi tự động; nếu doanh nghiệp nộp khoản này ra ngoài thì kế toán ghi dòng chi riêng ở nhóm Chi hành chính khác).
   - Transaction toàn bộ, idempotency key chống chốt hai lần.
5. **Đã chi:** do Kế toán thanh toán ở `/accounting`; trạng thái cập nhật ngược về HR.
6. **Sau chốt không sửa được.** Sai sót xử lý bằng **khoản điều chỉnh ở kỳ sau** (cộng hoặc trừ, có lý do, người duyệt) hoặc hủy chốt khi chưa chi (sinh bút toán đảo bên kế toán).

### Giao diện
- Bảng theo nhân viên với các cột: lương cơ bản, công chuẩn, công thực tế, lương theo công, phụ cấp, thưởng dịch vụ, thưởng khác, tăng ca, lương gộp, khấu trừ (bảo hiểm, tạm ứng, khác), thực nhận.
- Bấm vào nhân viên để xem chi tiết từng khoản; bấm vào "Thưởng dịch vụ" để xem các dòng dịch vụ đã tính (mở Màn 5).
- **Phiếu lương** từng nhân viên (in/PDF A5), có người in, `userid`, thời gian in; nhân viên chỉ xem được phiếu của chính mình.
- Phân trang cố định **10 dòng / trang**. Xuất file chi trả (nhân viên, số tài khoản, thực nhận) chỉ cho role có quyền chi trả.

## Màn 5 – Thưởng theo dịch vụ (`/hr/incentive`)
**Công thức:** thưởng của một dòng dịch vụ cho mỗi người nhận = **tỷ lệ thưởng × số tiền dịch vụ của dòng đó**. Không đếm theo số lượng.

### Người nhận và tỷ lệ
- Mỗi dòng dịch vụ có **hai vai trò nhận thưởng**:
  1. **Người thực hiện thực tế** (bác sĩ; có thể khác bác sĩ được chỉ định ban đầu).
  2. **Nhân viên tiếp nhận**: tài khoản đã lập dòng dịch vụ đó ở `/reception`.
- Mỗi vai trò có **tỷ lệ riêng**, mặc định **5%**, tính **độc lập trên cùng số tiền dịch vụ** (không chia nhau một khoản 5%). Tỷ lệ từ 0 đến 100, cho phép số thập phân, do Admin hoặc HR cấu hình, có **ngày hiệu lực**.
- Nếu cùng một người giữ cả hai vai trò trên một dòng thì nhận cả hai khoản, hiển thị tách riêng.
- Không có bậc thang, không có mức riêng theo dịch vụ, không có người hỗ trợ (phụ tá/điều dưỡng).
- Mỗi bản ghi thưởng **lưu bản chụp** tỷ lệ và số tiền cơ sở tại thời điểm tính; đổi tỷ lệ sau không làm đổi thưởng cũ. Làm tròn đến đồng ở từng dòng; thưởng theo kỳ lương dựa trên **ngày hoàn thành**.

### Nguồn dữ liệu và thời điểm tính
- Lấy từ `/doctor` và `/reception`: mỗi dòng dịch vụ Hoàn thành gồm mã TNK, mã dòng dịch vụ, dịch vụ, số tiền dịch vụ, **mã NV người thực hiện thực tế**, **mã NV người lập dòng**, ngày hoàn thành.
- Thưởng chỉ được tính **sau khi bác sĩ Ghi sổ (Hoàn thành) và doanh thu của dòng dịch vụ đã được chuyển sang `/accounting`**. Chưa chuyển thành công thì chưa tính; có cơ chế thử lại.
- **Không chờ bệnh nhân thu đủ tiền**; công nợ bệnh nhân không ảnh hưởng thưởng.
- Dòng dịch vụ chưa hoàn thành (kể cả khi Ngừng khám) thì **không tính thưởng**.
- Chống tính trùng: cùng mã dòng dịch vụ + cùng vai trò nhận chỉ tạo một bản ghi thưởng (idempotency).
- HR chỉ nhận **số tiền dịch vụ phục vụ tính thưởng**, không xem dòng tiền của kế toán.

### Số tiền cơ sở
- Là **số tiền dịch vụ do `/reception` lập** cho dòng đó (thành tiền của dòng dịch vụ).
- **Không dùng chiết khấu** và không phụ thuộc phần thuế kế toán nhập sau.

### Hoàn tiền và mở khóa
Thưởng chỉ phát sinh cho **dòng dịch vụ đã Hoàn thành**. Dòng không hoàn thành (Ngừng khám, bỏ trước khi Ghi sổ) **không có thưởng từ đầu**, nên không có gì để hoàn hay thu hồi.

Trạng thái bản ghi thưởng: `Hợp lệ`, `Tạm dừng`, `Bị loại`, `Cần xử lý`.
- Hoàn tiền được xử lý ở **mức dòng dịch vụ đã Hoàn thành**. **Hoàn toàn bộ dòng** → thưởng = 0, bản ghi `Bị loại`, **không được đưa vào bảng lương**.
- **Hoàn tiền một phần không ảnh hưởng thưởng** (thưởng giữ nguyên theo số tiền dịch vụ ban đầu).
- **Mở khóa ca** (Quản lý) → bản ghi `Tạm dừng`, không vào bảng lương cho đến khi ca Ghi sổ lại; Ghi sổ lại thì tính theo số mới.
- Các thay đổi trên chỉ cập nhật trực tiếp khi **kỳ lương chưa chốt**.
- **Nếu hoàn toàn bộ xảy ra sau khi kỳ lương đã chốt:** không sửa kỳ đã chốt và không tự thu hồi; hệ thống gắn `Cần xử lý` cho HR và Quản lý nhìn thấy, HR trừ tay ở khoản khấu trừ khác của kỳ sau.
- Hệ thống **không có chức năng hủy** dòng dịch vụ/ca đã Ghi sổ (ngoài phạm vi); vì vậy không có luồng "hủy" ảnh hưởng thưởng.
- Không có cờ "không tính thưởng" thủ công.

### Xem số liệu
- Bác sĩ và nhân viên tiếp nhận chỉ xem **các dòng dịch vụ và tiền thưởng của chính mình**; HR và Quản lý xem toàn bộ.
- Thưởng tổng hợp chuyển vào Màn 4, dòng "Thưởng dịch vụ".

# RÀNG BUỘC & VALIDATION (UI và backend đều phải kiểm tra)
- Số tiền ≥ 0 (dòng điều chỉnh dùng cờ riêng, không nhập số âm tự do); công thực tế ≥ 0 và không vượt số ngày của kỳ (trừ tăng ca đã duyệt); ngày hết hạn hợp đồng sau ngày hiệu lực; ngày nghỉ việc không trước ngày vào làm.
- Không xóa cứng; soft delete + audit log (ai, khi nào, giá trị cũ/mới), gồm cả **thao tác xem** lương và dữ liệu cá nhân.
- **Phân quyền:**
  - HR: quản lý hồ sơ, công/ca, lập và chốt bảng lương, nhập mức thưởng theo cấu hình; **không** xem dòng tiền kế toán.
  - Quản lý: duyệt bảng lương, duyệt gán role nhạy cảm, duyệt điều chỉnh.
  - Admin: cấu hình danh mục (loại nghỉ, loại hợp đồng, phụ cấp, ca, tổ hợp role cấm).
  - Kế toán: thấy **thực nhận từng người** để chi trả, không thấy chi tiết cấu phần; không sửa bảng lương.
  - Nhân viên (mọi role): chỉ xem hồ sơ, công, phiếu lương, thưởng của **chính mình**.
  - Mỗi người chỉ xem dữ liệu phòng khám được phép.
- **Dữ liệu nhạy cảm:** ẩn một phần số tài khoản, số giấy tờ, mã bảo hiểm; mã hóa khi lưu; không xuất file hàng loạt cho role không có quyền.
- Định dạng ngày dd/MM/yyyy, tiền VND có dấu phân cách hàng nghìn, múi giờ thống nhất.
- Dữ liệu test là dữ liệu giả, không dùng thông tin nhân sự thật.

# YÊU CẦU ĐỒNG BỘ VỚI CÁC ROLE KHÁC
Khi đọc code, đối chiếu và **liệt kê phần còn thiếu**; nếu chưa có thì đề xuất bổ sung, không tự suy diễn:
- **Bác sĩ:** trạng thái và **người thực hiện theo từng dòng dịch vụ** (hiện đang theo cả TNK); khi Ghi sổ gửi đủ mã TNK, mã dòng dịch vụ, số tiền dịch vụ, mã NV người thực hiện, ngày hoàn thành; phát tín hiệu khi **mở khóa ca**. Khi bác sĩ bấm **Check-out** ở header, nếu đang có ca "Đang khám", hệ thống bật cảnh báo xác nhận trước khi cho phép Check-out.
- **Tiếp nhận:** lưu **mã NV người lập từng dòng dịch vụ** (để tính thưởng tiếp nhận); danh sách bác sĩ lấy từ HR (có ca trực), khác ca thì cảnh báo.
- **Kế toán:** thêm chiều **"Phải trả nhân viên (lương)"** ở màn Công nợ; nhóm chi "Chi hành chính – lương/thưởng" ghi theo thực nhận từng người, gắn mã bảng lương; cập nhật quy tắc "lương chỉ hiện tổng hợp" thành "thấy thực nhận từng người, không thấy cấu phần". Không có nhóm tự động cho nộp bảo hiểm/thuế (nếu có thì kế toán ghi tay ở Chi hành chính khác). Ghi nhận doanh thu theo **mã dòng dịch vụ** và phát tín hiệu "đã ghi nhận" để HR biết khi nào được tính thưởng. Gắn **hoàn tiền theo từng dòng dịch vụ**; phát tín hiệu sang HR khi **hoàn toàn bộ dòng** (hoàn một phần không phát tín hiệu thưởng).
- **Kho:** `userid` ở `print_log` và "người lập/ghi sổ" liên kết `mã NV`.
- **Toàn hệ thống:** 
  - Dùng bảng role chung (mục "Role trên phần mềm"); quy tắc người lập ≠ người duyệt theo tài khoản; "Quản lý" và "Admin" được định nghĩa trong bảng này.
  - **Nút Check-in / Check-out tích hợp trên thanh Header dùng chung của mọi role** (`/reception`, `/doctor`, `/warehouse`, `/accounting`, `/hr`), mobile-friendly, lấy giờ máy chủ Asia/Ho_Chi_Minh, chống bấm trùng, lưu giờ gốc.
  - **Phân trang:** Cố định **10 dòng / trang** trên tất cả bảng danh sách toàn hệ thống.

# QUY TRÌNH THỰC HIỆN
1. Đọc code hiện tại (xác thực, phân quyền, module reception/doctor/warehouse/accounting) và các file role tham chiếu; liệt kê phần tái sử dụng và phần còn thiếu.
2. Nếu có mâu thuẫn hoặc thiếu thông tin, **hỏi lại trước khi code** (tối đa 5 câu, gom một lần); còn lại ghi rõ giả định.
3. Thiết kế dữ liệu (nhân viên, hợp đồng lao động, bảo hiểm (chỉ thông tin), tài khoản/role/tổ hợp cấm, ca, ngày công, kỳ công, bảng lương và dòng lương, mức thưởng, bản ghi thưởng, điều chỉnh, audit log) và đưa sơ đồ để duyệt trước khi code.
4. Cài đặt theo từng màn, mỗi màn có test case đi kèm.
5. Chạy test thật và cập nhật kết quả vào `test.md` (chỉ ghi Pass khi đã chạy; chưa chạy được thì ghi "Not tested" kèm lý do).

# ĐẦU RA
- Mã nguồn + migration.
- Bảng test case gồm: happy path; trùng hồ sơ; tạo `NV-` đồng thời; gán nhiều role; HR tự gán role nhạy cảm (bị chặn); tổ hợp role bị cấm; người lập = người duyệt (bị chặn, kể cả khi một người kiêm nhiều role); nghỉ việc khóa đăng nhập nhưng giữ lịch sử; chặn nghỉ việc khi bác sĩ đang khám; ca chồng giờ; đi trễ chỉ ghi nhận; khóa công; công thức lương theo công và làm tròn; thực nhận âm (chặn chốt); lương gộp = thực nhận + khấu trừ; sửa sau duyệt quay về Nháp; chốt hai lần (idempotency); chuyển khoản phải trả sang kế toán đúng số thực nhận; sửa sau chốt chỉ qua điều chỉnh kỳ sau.
- Test chấm công & thời gian làm việc: Check-in lần đầu ghi giờ gốc; Check-in lặp chặn ghi đè; Check-out khi chưa Check-in bị chặn; Bác sĩ đang khám cảnh báo khi Check-out; Ràng buộc cấu hình $S < M < E$; Ngày hiệu lực không ở quá khứ; Maker-Checker điều chỉnh công (người sửa không được duyệt); Tính đúng công 0,5/1,0; Đi trễ chỉ tính sáng; Tăng ca tính từ $\max(T_{in}, E)$; Tổng công thực tế cấp sang Bảng lương.
- Test thưởng: thưởng bác sĩ = 5% × số tiền dịch vụ và làm tròn; thưởng nhân viên tiếp nhận tính độc lập trên cùng số tiền; một người giữ hai vai trò; thưởng chỉ tính sau Ghi sổ Hoàn thành và sau khi doanh thu đã chuyển sang /accounting; **không chờ thu đủ tiền**; Ngừng khám không thưởng; nhận trùng sự kiện dòng dịch vụ; đổi tỷ lệ sau (bản chụp không đổi); **hoàn toàn bộ dòng đã Hoàn thành → 0**; **hoàn một phần → thưởng không đổi**; dòng không hoàn thành không có thưởng; mở khóa ca → Tạm dừng rồi tính lại khi Ghi sổ lại; hoàn toàn bộ sau khi kỳ đã chốt → `Cần xử lý`, kỳ đã chốt không đổi; người thực hiện khác bác sĩ chỉ định; bác sĩ/nhân viên tiếp nhận chỉ xem thưởng của mình; kế toán chỉ thấy thực nhận; ẩn một phần dữ liệu nhạy cảm; audit log cả thao tác xem; phân quyền theo phòng khám.
- Tóm tắt ngắn (tối đa 15 dòng): đã làm gì, giả định nào, còn gì cần xác nhận.

---

# QUYẾT ĐỊNH ĐÃ CHỐT
1. **Nguồn chấm công:** Nhân viên tự Check-in / Check-out ở header dùng chung của mọi màn hình (lấy giờ máy chủ Asia/Ho_Chi_Minh). Lần bấm đầu tiên là bản gốc không bị ghi đè. HR chỉ bổ sung hoặc sửa giờ vào/ra khi có sai sót với lý do bắt buộc; Quản lý/Admin duyệt theo nguyên tắc Maker-Checker (người lập ≠ người duyệt). Cấu hình thời gian làm việc có tab riêng (`/hr/working-hours`) với 3 mốc ($S < M < E$) và ngày hiệu lực.
2. **Thưởng tính khi dòng dịch vụ Hoàn thành**, sau khi Ghi sổ và doanh thu đã chuyển sang `/accounting`; **không chờ bệnh nhân thu đủ tiền**.
3. **Thưởng = tỷ lệ × số tiền dịch vụ**, mặc định **5%**, không đếm theo số lượng. **Không dùng chiết khấu.**
4. **Người nhận thưởng:** người thực hiện thực tế của dòng dịch vụ (bác sĩ) **và nhân viên tiếp nhận**, **mỗi bên 5% độc lập trên cùng số tiền dịch vụ** (tổng 10%, không chia chung).
5. **Thưởng chỉ có ở dòng dịch vụ đã Hoàn thành** (không hoàn thành thì không thưởng từ đầu). **Hoàn tiền toàn bộ dòng đã Hoàn thành thì không nhận thưởng**; hoàn một phần không ảnh hưởng thưởng.
6. **Bảo hiểm, thuế thu nhập cá nhân, quy định hợp đồng lao động nằm ngoài hệ thống**; chỉ nhập số tiền khấu trừ tay và lưu hồ sơ. Việc tính đúng, kê khai và tuân thủ do HR/kế toán chịu trách nhiệm.
7. **HR lập bảng lương, Quản lý duyệt, Kế toán chi trả**; người lập ≠ người duyệt.
8. **Không có người hỗ trợ** (phụ tá/điều dưỡng) hưởng thưởng; **không có cờ "không tính thưởng"** thủ công.
9. **Hoàn toàn bộ sau khi kỳ lương đã chốt:** chỉ cảnh báo `Cần xử lý`, HR trừ tay ở kỳ sau, không tự thu hồi.
10. **Không có chức năng hủy** dòng dịch vụ/ca đã Ghi sổ.
11. Tiền tố mã nhân viên là **`NV`** (`NV-0001`); mã bảng lương `BL` giữ như đề xuất.
12. **Tính công và ngày công thực tế:** Có mặt sáng nếu $T_{in} < 12:00$, có mặt chiều nếu $T_{out} > 12:00$. Số buổi có mặt (0, 1, 2) quy ra công (0, 0,5, 1,0 công). Tổng công thực tế tháng cho phép số lẻ 0,5 và là nguồn trực tiếp cấp cho ngày công thực tế của bảng lương.
13. **Đi trễ & Tăng ca:** Đi trễ (phút) và Tăng ca (giờ) chỉ được ghi nhận tự động để theo dõi; hệ thống không tự trừ tiền phạt hay tự cộng tiền làm thêm giờ (HR/kế toán nhập tay ở Bảng lương nếu có áp dụng).
14. **Cảnh báo Check-out Bác sĩ:** Bác sĩ đang có ca "Đang khám" khi bấm Check-out sẽ nhận được hộp thoại cảnh báo trước khi hoàn tất Check-out (không chặn cứng).
15. **Phân trang cố định:** Cố định 10 dòng/trang cho tất cả các bảng dữ liệu trong toàn bộ hệ thống.

# CÒN CẦN XÁC NHẬN
1. **Mở khóa ca khi thưởng đã tính:** prompt đang đặt bản ghi `Tạm dừng` đến khi Ghi sổ lại (do người soạn tự chọn, bạn chưa xác nhận).
