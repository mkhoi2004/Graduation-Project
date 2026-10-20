# VAI TRÒ
Bạn là Senior Full-stack Developer kiêm Business Analyst, có kinh nghiệm xây dựng module kế toán thu/chi và công nợ cho EMR/phòng khám nha khoa DentalKhoi ERP.

# BỐI CẢNH & TÀI KHOẢN VẬN HÀNH
Hệ thống EMR nha khoa **DentalKhoi ERP**. Phân hệ Kế toán tại `/accounting` là nơi **nhận dữ liệu tiền** từ các phân hệ còn lại:
- **Tài khoản Kế toán:** **Hoàng Thị Kế Toán** (`accounting`) — Kế toán trưởng phụ trách Tài chính - Thu chi (Văn phòng Kế toán).
- **Nút Check-in / Check-out trên Header chung:**
  - Nút Check-in / Check-out xuất hiện cố định ở thanh đầu trang (Header) của `/accounting`, hoạt động tốt trên máy tính và di động.
  - Giờ lấy từ máy chủ phòng khám (`Asia/Ho_Chi_Minh`), mỗi ngày 1 bản ghi duy nhất, giờ đầu tiên là gốc không bị ghi đè.
- **Nguyên tắc phân tách trách nhiệm (SoD):** Tài khoản `ACCOUNTING_STAFF` **tuyệt đối không được kiêm nhiệm Quản lý kho (`WAREHOUSE_MANAGEMENT`)** hoặc **Nhân viên tiếp nhận (`RECEPTION_STAFF`)** để ngăn ngừa rủi ro tự mua hàng/thu tiền và tự đối soát sổ quỹ.
- **Phân trang:** Cố định **10 dòng / trang** trên tất cả bảng biểu (Sổ quỹ, Hóa đơn nhà cung cấp, Công nợ, Kiểm kê quỹ, Kỳ khóa sổ).

Kết nối dữ liệu liên hoàn từ các phân hệ:
- **Tiếp nhận** (`/reception`): hồ sơ bệnh nhân (MBN), tiếp nhận (TN), thu tiền mặt & MoMo QR.
- **Bác sĩ** (`/doctor`): Đang khám → chọn VTYT → Ghi sổ (Hoàn thành hoặc Ngừng khám) chuyển doanh thu dịch vụ và giá vốn VTYT.
- **Quản lý kho** (`/warehouse`): nhập/xuất kho theo lô, chuyển công nợ phải trả NCC khi phiếu nhập kho MVT ghi sổ.
- **Hành chính nhân sự** (`/hr`): chuyển công nợ phải trả lương nhân viên khi bảng lương tháng được chốt khóa.

# NGUYÊN TẮC CỐT LÕI
1. Kế toán giữ **tiền và chứng từ**, **không đếm tồn**. Số lượng nhập/xuất lấy từ kho; kế toán chỉ ghi nhận tiền tương ứng. Không vẽ biểu đồ theo số lượng hộp/cái, số lượng thuộc màn kho.
2. **Ba góc nhìn tách bạch, không bao giờ cộng chung:**
   - **Dòng tiền**: tiền thực thu/thực chi.
   - **Hiệu quả**: doanh thu ghi nhận − giá vốn VTYT tiêu hao = lãi gộp theo ca/dịch vụ.
   - **Công nợ**: phần đã phát sinh nhưng chưa thanh toán (phải thu bệnh nhân, phải trả nhà cung cấp, labo và lương nhân viên).
3. Lý do tách: giá vốn VTYT (bác sĩ chuyển sang khi Ghi sổ) **không phải dòng chi**. Chi vật tư chỉ tính **một lần**, khi thanh toán nhà cung cấp; nếu tính thêm lúc tiêu hao thì bị chi hai lần.
4. Bản ghi **bất biến**: không sửa, không xóa; chỉ đảo (bút toán ngược) hoặc điều chỉnh có lý do và có audit log.
5. Mọi chứng từ liên kết **hai chiều** với bản ghi gốc ở role khác (TN, ca khám, phiếu kho, bảng lương).

# DỮ LIỆU ĐỔ VÀO /ACCOUNTING

| Sự kiện | Nguồn | /accounting ghi gì | Loại |
|---|---|---|---|
| Bệnh nhân thanh toán / tạm ứng / cọc | Tiếp nhận | **Thu trước**: hình thức, số tiền, gắn TN/hợp đồng | Dòng tiền, ghi **ngay** lúc thu |
| Ca hoàn thành (Ghi sổ) | Bác sĩ | **Doanh thu** theo từng dòng dịch vụ + **giá vốn VTYT** tiêu hao; đối trừ thu trước | Hiệu quả |
| Ngừng khám (Ghi sổ) | Bác sĩ | Doanh thu 0 cho dòng dịch vụ chưa hoàn thành; giá vốn VTYT đã tiêu hao vẫn ghi; thu trước còn lại → hoàn tiền hoặc giữ trừ lần sau | Hiệu quả + dòng tiền nếu hoàn |
| Nhập kho đã ghi sổ | Kho | **Khoản phải trả nhà cung cấp** (mã phiếu MVT, NCC, tiền hàng, VAT, tổng) | Công nợ |
| Bảng lương tháng chốt khóa | Nhân sự (/hr) | **Khoản phải trả lương nhân viên** (mã bảng lương, kỳ, thực nhận từng người) | Công nợ |
| Thanh toán NCC / chi labo / chi hành chính / lương | Kế toán | Chi tiền | Dòng tiền |
| Xuất hủy đã ghi sổ | Kho | **Giá trị tổn thất** theo giá vốn lô | Không tiền |
| Xuất kho dùng cho bệnh nhân / cấp phát nội bộ | Kho | Chỉ để xem giá trị xuất; không tạo dòng tiền, không tạo công nợ | Không tiền |
| Mở khóa ca / hủy phiếu kho đã ghi sổ | Bác sĩ / Kho | **Bút toán đảo + bản điều chỉnh**, không ghi đè | Theo bản ghi gốc |

## Quy tắc đối trừ khi ca kết thúc
- D = doanh thu ghi nhận của ca, T = tổng thu trước của ca/hợp đồng.
- **T < D**: tạo **phải thu bệnh nhân** = D − T.
- **T > D**: phần thừa = T − D, chọn **hoàn tiền** (dòng hoàn tiền, có lý do, có người duyệt) hoặc **giữ làm thu trước** để trừ lần sau (gắn mã bệnh nhân).
- **T = D**: đóng, không phát sinh công nợ.
- Mỗi bước có bản ghi liên kết TNK để truy ngược.

# QUY TẮC DỮ LIỆU NỀN

## 1. Mã và truy vết
- Dùng **bộ sinh mã dùng chung** với các role khác, định dạng `{tiền tố}{yyyyMMdd}/{0001-9999}`, số thứ tự reset mỗi ngày, sinh ở backend trong transaction. Hôm nay (19/10/2026) là `20261019`, không phải `20261610`.
- Đề xuất tiền tố: **phiếu thu** `PT`, **phiếu chi** `PC`, **phiếu labo** `LB`. Mã MBN, TNK, MVT, XVT giữ như các role đã định nghĩa.
- Mỗi dòng ghi lưu `ma_chung_tu_goc` (TNK, mã ca, mã phiếu kho, số hóa đơn...) để bấm sang chứng từ gốc.
- Chống ghi trùng: nhận cùng một sự kiện hai lần **không** tạo dòng thứ hai (khóa theo `ma_chung_tu_goc` + loại sự kiện + idempotency key).

## 2. Công thức tiền (VND, làm tròn đến đồng ở từng dòng; tổng = tổng các dòng)
- Mỗi dòng có 4 trường: **tiền chưa thuế**, **% thuế**, **tiền thuế**, **tổng tiền**.
- **Tổng tiền = tiền chưa thuế + tiền thuế**, hệ thống tự tính, không sửa tay.
- Kế toán nhập **% thuế hoặc tiền thuế**, hệ thống tính phần còn lại (nhập % thì tiền thuế = tiền chưa thuế × %; nhập tiền thuế thì % tính ngược).
- % thuế trong 0–100 (cho phép số thập phân), tiền thuế ≥ 0. Mặc định để trống/0.

## 3. Thuế (nhập tay, kế toán xác nhận)
- Hệ thống **không tự suy luận thuế**. Giá trị cuối cùng do kế toán nhập.
- Danh mục dịch vụ có cột **Phân loại thuế** (ví dụ: không chịu thuế / chịu thuế / khác) và cột tùy chọn **% thuế mặc định**. Chỉ **Admin hoặc kế toán** được đặt/sửa; người thu tiền ở /reception không chọn.
- Nhóm hiển thị của Tiếp nhận (Điều trị cơ bản / Thẩm mỹ và phục hình / Niềng và implant) **không đồng nghĩa** với phân loại thuế; niềng, implant, răng sứ phải được gán riêng.
- Khi tạo dòng thu (ví dụ từ bác sĩ Ghi sổ), hệ thống **điền sẵn** phân loại và % mặc định làm gợi ý; kế toán xác nhận hoặc sửa tay. Để % mặc định trống nếu muốn thuần nhập tay.
- Mỗi dòng đã ghi **lưu bản chụp** phân loại thuế tại thời điểm ghi; sửa danh mục sau không đổi số liệu cũ.
- Với dòng do role khác chuyển sang: số tiền gốc giữ nguyên, kế toán chỉ **bổ sung phần thuế**; có audit log và chỉ làm được **trước khi khóa kỳ**.
- Báo cáo chỉ hiển thị **tổng thuế đã nhập** theo kỳ, ghi rõ "theo số liệu nhập tay"; không phải số kê khai chính thức.
- Điều trị và thẩm mỹ vẫn tách riêng làm **loại dịch vụ để báo cáo**, không dùng để suy ra thuế.
- Giả định cần kế toán xác nhận: giá vốn ở kho đang **không gồm VAT** (mặc định của role Kho).

## 4. Danh mục nhóm (dùng chung cho mọi màn; tổng biểu đồ phải bằng tổng bảng)
- **Vào:** Thu dịch vụ điều trị; Thu dịch vụ thẩm mỹ; Thu bán lẻ; Thu cọc; Thu trả góp.
- **Ra:** Hoàn tiền (dòng đảo); Chi vật tư (VTYT thường, VTYT vô cảm, văn phòng phẩm); Chi labo; Chi hành chính (mặt bằng, điện nước, lương); Phí thanh toán thẻ.
- **Không tiền:** Tổn thất (xuất hủy).
- "Vật tư lâm sàng" = VTYT thường + VTYT vô cảm; văn phòng phẩm tách riêng, ánh xạ rõ với 3 nhóm của kho.

# YÊU CẦU CHỨC NĂNG

## Màn 1 – Thu/chi (`/accounting/cash`)
Mỗi dòng là **một khoản tiền**, không phải một mặt hàng.

- **Cột:** ngày, phòng khám, nhóm, chiều (vào/ra), tiền chưa thuế, % thuế, tiền thuế, tổng tiền, hình thức (tiền mặt/chuyển khoản/thẻ), mã giao dịch (với chuyển khoản/thẻ), đối tượng (bệnh nhân/NCC/labo/nhân viên), chứng từ gốc (bấm xem), trạng thái thanh toán, trạng thái chứng từ, người ghi, người duyệt.
- **Bộ lọc:** khoảng ngày, phòng khám, nhóm, loại dịch vụ (điều trị/thẩm mỹ), loại vật tư, hình thức tiền.
- **Quy tắc:**
  - Xuất găng, kim tê, composite cho bệnh nhân **không** tạo dòng tiền; chi phí này nằm ở góc nhìn Hiệu quả.
  - Một hóa đơn nhà cung cấp gồm nhiều mặt hàng chỉ hiện **một dòng tiền**; bấm vào xem chi tiết kho (**chỉ đọc**).
  - **Chi mua có hai trạng thái độc lập:**
    - *Thanh toán*: chưa / một phần / đã.
    - *Chứng từ*: chờ hóa đơn / hóa đơn đúng / hóa đơn sai.
  - Tiền đã chi thì vẫn tính vào **tiền ra** dù chưa có hóa đơn (gắn cờ cảnh báo). **Chi phí hợp lệ** chỉ tính khi hóa đơn đúng; hai chỉ số hiển thị tách riêng.
  - **Hoàn tiền / hủy thu** là dòng đảo, có lý do và người duyệt; không sửa dòng cũ.
  - Chuyển quỹ tiền mặt ↔ ngân hàng không tính là thu hay chi.
  - Thanh toán thẻ: ghi **phí thanh toán** (khoản chi) và ngày tiền về; hỗ trợ đối soát với sao kê.
  - **Xuất hủy (tổn thất)** hiển thị ở **tab riêng "Tổn thất (không dòng tiền)"**; có cờ `anh_huong_tien = false` và luôn bị loại khỏi mọi tổng. Tổn thất loại "mất" cần người duyệt và lý do.

### Hóa đơn nhà cung cấp
- Trường nhập: số hóa đơn, ký hiệu, ngày, MST nhà cung cấp, tên và địa chỉ bên mua, tiền hàng, thuế, tổng, file đính kèm.
- **Hóa đơn đúng** = MST, tên, địa chỉ bên mua khớp thông tin đăng ký của phòng khám.
- **Chống trùng** theo số hóa đơn + ký hiệu + MST nhà cung cấp.
- Quan hệ **nhiều-nhiều** giữa hóa đơn và phiếu nhập kho (một hóa đơn nhiều phiếu, hoặc giao hàng nhiều đợt).
- **Lệch tiền** giữa hóa đơn và phiếu nhập vượt ngưỡng cấu hình thì bắt buộc ghi lý do.
- Phiếu nhập "chờ hóa đơn" quá N ngày (cấu hình, mặc định 7) thì nhắc.
- Nhờ kế toán xác nhận giới hạn thanh toán tiền mặt khi cần khấu trừ thuế đầu vào (nếu có).

### Kiểm quỹ / kết ca
- Cuối ngày nhập số dư tiền mặt thực tế, hệ thống so với số dư tính được, ghi **chênh lệch** kèm lý do và người xác nhận.

## Màn 2 – Công nợ (`/accounting/debts`)
- **Phải thu bệnh nhân** = doanh thu đã ghi nhận − tiền đã thu, theo TNK/hợp đồng.
- **Phải trả nhà cung cấp và labo**, theo phiếu nhập/phiếu labo, lấy từ khoản phải trả do kho tạo.
- **Bảng tuổi nợ:** 0–30, 31–60, 61–90, >90 ngày.
- Kế toán chỉ xử lý **thanh toán**; không sửa số tiền gốc do kho/bác sĩ chuyển sang.
- Hủy phiếu nhập đã ghi sổ thì khoản phải trả liên kết bị đảo; nếu đã có thanh toán thì **chặn hủy** và yêu cầu kế toán xử lý trước.

## Màn 3 – Tổng quan (`/accounting/overview`)
- **Bộ lọc chung** đặt trên cả trang: thời gian, phòng khám, loại dịch vụ, loại vật tư. Bộ lọc không áp dụng được cho một khối thì làm mờ và có chú thích (tránh số về 0 gây hiểu lầm).

### Khối Dòng tiền
- Bốn số: **tổng tiền vào, tổng tiền ra, dòng tiền thuần, số chứng từ trong kỳ** (đếm chứng từ gốc, không đếm dòng, loại chứng từ đã hủy); có so sánh kỳ trước. Không gọi "chênh lệch" là lợi nhuận.
- Biểu đồ tròn: **cơ cấu tiền vào** (điều trị, thẩm mỹ, bán lẻ, cọc/trả góp), **cơ cấu tiền ra** (vật tư lâm sàng, labo, văn phòng phẩm, mặt bằng và điện nước, lương), **hình thức thu** (và hình thức chi).
- Quá 6 lát thì gộp nhóm nhỏ thành "Khác". Bấm một lát cắt thì mở Màn 1 với bộ lọc tương ứng.
- Thêm chỉ số: số khoản "chờ hóa đơn", số cọc chưa đối trừ, **tổng thuế đã nhập** theo kỳ (lọc được theo phân loại thuế).

### Khối Hiệu quả
- Doanh thu − giá vốn VTYT = **lãi gộp**, theo dịch vụ/bác sĩ/phòng khám.
- Ví dụ minh họa (từ role Bác sĩ): doanh thu 300.000, giá vốn 300.000, lãi gộp ca này 0.
- Giá vốn lấy theo **lô của kho** (chỉ đọc), phân bổ theo từng dòng dịch vụ.

### Khối Công nợ
- Hai số: **phải thu** và **phải trả**, cộng bảng tuổi nợ. **Không dùng biểu đồ tròn**, vì hai chiều ngược nhau không phải các phần của một tổng.

# RÀNG BUỘC & VALIDATION (UI và backend đều phải kiểm tra)
- Số tiền ≥ 0 (dòng đảo/hoàn dùng cờ riêng, không nhập số âm tự do), % thuế 0–100, ngày không ở tương lai.
- Không sửa/xóa dòng đã ghi; không xóa cứng (soft delete + audit log: ai, khi nào, giá trị cũ/mới).
- **Khóa kỳ**: sau khi chốt tháng không sửa dữ liệu kỳ cũ; điều chỉnh ở kỳ mới.
- **Phân quyền:**
  - Kế toán: xem và thanh toán công nợ, nhập hóa đơn và thuế, kiểm quỹ; chỉ **xem** phiếu kho.
  - Admin: sửa danh mục (phân loại thuế, ngưỡng, nhóm).
  - Quản lý: duyệt hoàn tiền, mở khóa ca, khoản chi vượt ngưỡng.
  - Tiếp nhận: chỉ tạo dòng thu trước của TNK mình xử lý; không xem báo cáo.
  - Bác sĩ, Quản lý kho: không truy cập /accounting.
  - **Tách người nhập và người duyệt** với khoản chi/hoàn tiền vượt ngưỡng (cấu hình).
  - Lương chỉ hiện tổng hợp, chi tiết từng người chỉ người có quyền xem.
  - Mỗi người chỉ xem dữ liệu phòng khám được phép.
- Mọi đảo/điều chỉnh có lý do bắt buộc.
- Định dạng ngày dd/MM/yyyy, tiền VND có dấu phân cách hàng nghìn, múi giờ thống nhất.
- Dữ liệu test là dữ liệu giả, không dùng thông tin bệnh nhân thật.

# YÊU CẦU ĐỒNG BỘ VỚI 3 ROLE CÒN LẠI
Chức năng ở /accounting chỉ chạy đúng nếu các role kia cung cấp đủ dữ liệu. Khi đọc code, đối chiếu và **liệt kê phần còn thiếu**; nếu chưa có thì đề xuất bổ sung, không tự suy diễn:
- **Tiếp nhận:**
  - Chức năng **thu tiền** (hình thức, tạm ứng, cọc, mã giao dịch).
  - Lưu **ngày sinh** thay vì tuổi.
  - Số lượng/răng và thành tiền cho dịch vụ tính theo chiếc.
  - Cấp STT và hủy tiếp nhận.
  - **Hợp đồng/kế hoạch điều trị** (số hợp đồng, tổng tiền, lịch trả) cho niềng, implant, trả góp.
  - Mã ví dụ phải theo định dạng ngày thật.
- **Bác sĩ:**
  - Trạng thái và doanh thu theo **từng dòng dịch vụ** (một TNK có thể nhiều bác sĩ), giá vốn gắn vào dòng dịch vụ.
  - Luồng "đề xuất bổ sung dịch vụ" (hiện bác sĩ không được thêm dịch vụ).
  - Thấy **tồn khả dụng** nhưng không thấy giá.
  - Khi Ghi sổ gửi sang /accounting đủ: mã TNK, mã dòng dịch vụ, doanh thu, giá vốn theo lô.
  - Mở khóa ca phải sinh bút toán đảo.
- **Kho:**
  - Phiếu xuất "Dùng cho bệnh nhân" **tự sinh khi bác sĩ Ghi sổ** (tự ghi sổ, không cần in; nguồn trừ kho duy nhất), không lập tay.
  - Thêm **tồn khả dụng = tồn − giữ chỗ**.
  - Thêm nhóm hàng bán lẻ nếu phòng khám có bán.
  - Khoản phải trả gửi sang kế toán kèm trạng thái chứng từ.

# QUY TRÌNH THỰC HIỆN
1. Đọc code hiện tại (module reception, doctor, warehouse, mẫu in, bảng dữ liệu liên quan) và các file role tham chiếu; liệt kê phần tái sử dụng và phần còn thiếu.
2. Nếu có mâu thuẫn hoặc thiếu thông tin, **hỏi lại trước khi code** (tối đa 5 câu, gom một lần); còn lại ghi rõ giả định.
3. Thiết kế dữ liệu (dòng tiền, doanh thu/giá vốn, khoản phải thu/phải trả, hóa đơn nhà cung cấp, thanh toán, tổn thất, hợp đồng liên kết, kỳ khóa, kiểm quỹ, audit log) và đưa sơ đồ để duyệt trước khi code.
4. Cài đặt theo từng màn, mỗi màn có test case đi kèm.
5. Chạy test thật và cập nhật kết quả vào `test.md` (chỉ ghi Pass khi đã chạy; chưa chạy được thì ghi "Not tested" kèm lý do).

# ĐẦU RA
- Mã nguồn + migration.
- Bảng test case gồm: happy path; thu trước rồi ca hoàn thành (T < D, T = D, T > D); Ngừng khám có thu trước (hoàn / giữ trừ lần sau); nhận trùng sự kiện từ bác sĩ/kho (idempotency); giá vốn không tạo dòng chi, chi vật tư không bị tính hai lần; tổng biểu đồ = tổng bảng; chi mua chưa có hóa đơn (vẫn tính tiền ra, không tính chi phí hợp lệ); hóa đơn sai tên/MST; hóa đơn trùng; hóa đơn nhiều phiếu và ngược lại; lệch tiền vượt ngưỡng; nhập thuế theo % và theo tiền (tính ngược, làm tròn); bản chụp phân loại thuế khi sửa danh mục; hoàn tiền (dòng đảo); đảo do mở khóa ca hoặc hủy phiếu kho; hủy phiếu nhập đã thanh toán (bị chặn); xuất hủy không vào tổng chi; khóa kỳ; kiểm quỹ có chênh lệch; phân quyền (kể cả lương và phòng khám); bộ lọc làm mờ ở Tổng quan.
- Tóm tắt ngắn (tối đa 15 dòng): đã làm gì, giả định nào, còn gì cần xác nhận.

---

# GIẢ ĐỊNH CẦN XÁC NHẬN
1. **Tiền ghi ngay khi thu** ở /reception (thu trước), **doanh thu ghi khi ca hoàn thành**. Nếu muốn khác thì phải đổi cả role Tiếp nhận và Bác sĩ.
2. **Phân loại thuế từng dịch vụ** (đặc biệt niềng, implant, răng sứ) do kế toán/tư vấn thuế xác nhận; hệ thống chỉ lưu và hiển thị.
3. **Giá vốn kho không gồm VAT** (mặc định của role Kho), cần kế toán xác nhận.
4. Phòng khám **có bán lẻ, có làm labo, có hợp đồng trả góp** hay không; nếu không thì bỏ phần tương ứng.
5. Ai thu tiền thực tế: nhân viên Tiếp nhận (như đề xuất) hay kế toán trực tiếp.
6. Số nhóm tiền tố mã `PT`, `PC`, `LB` là đề xuất, có thể đổi.
