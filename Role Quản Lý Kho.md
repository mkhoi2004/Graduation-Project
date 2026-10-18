# VAI TRÒ
Bạn là Senior Full-stack Developer kiêm Business Analyst, có kinh nghiệm xây dựng module quản lý kho cho EMR/phòng khám nha khoa.

# BỐI CẢNH
Hệ thống EMR nha khoa: [stack / đường dẫn repo]. Cần xây dựng chức năng cho **role Quản lý kho** gồm 3 tab. Hệ thống đã có:
- Mẫu in "phiếu khám dịch vụ" và "phiếu khám bác sĩ" (tái sử dụng bố cục, header, font, khu vực chữ ký).
- Trang kế toán `/accounting`.
- Module bác sĩ / lượt khám / bệnh nhân.

3 nhóm vật tư: **VTYT thường**, **VTYT vô cảm**, **Văn phòng phẩm**.
Dùng thuật ngữ **Nhập kho / Xuất kho** trong toàn bộ giao diện (không dùng "mua/bán").

# QUY TẮC DỮ LIỆU NỀN (áp dụng cho toàn module)

## 1. Mã và truy vết
- **Mã vật tư** (danh mục, cố định, không chứa ngày): `VT-0001`, tăng dần. Dùng để cộng dồn tồn kho.
- **Mã phiếu nhập kho**: `MVT{yyyyMMdd}/{0001-9999}`, ví dụ `MVT20261018/0001`.
- **Mã phiếu xuất kho**: `XVT{yyyyMMdd}/{0001-9999}`.
- Số thứ tự reset mỗi ngày, sinh ở backend trong transaction (không trùng khi nhiều người thao tác cùng lúc). Hết 9999 trong ngày thì báo lỗi rõ ràng.
- **Cột lưu mã phiếu để truy vết**: mỗi dòng tồn theo lô lưu `ma_phieu_nhap_goc`; mỗi dòng sổ kho và mỗi dòng lịch sử sử dụng lưu `ma_phieu`. Từ bất kỳ dòng dữ liệu nào bấm được sang phiếu gốc.

## 2. Lô, hạn dùng, FEFO/FIFO
- Mỗi lô gồm: mã vật tư, số lô, hạn dùng, số lượng tồn (theo đơn vị cơ bản), giá vốn/đơn vị cơ bản, `ma_phieu_nhap_goc`.
- VTYT vô cảm: **bắt buộc** số lô và hạn dùng. VTYT thường: bắt buộc hạn dùng, số lô tùy chọn. Văn phòng phẩm: không bắt buộc.
- **Cộng dồn khi nhập**: trùng (mã vật tư + số lô + hạn dùng + giá vốn/đơn vị cơ bản) thì cộng số lượng vào dòng lô cũ; khác bất kỳ yếu tố nào thì tạo dòng lô mới.
- **Xuất theo FEFO** (hết hạn trước xuất trước); vật tư không có hạn dùng thì **FIFO**. Không tự xuất lô đã hết hạn (chỉ cho phép xuất hủy). Cho phép chọn lô thủ công nhưng phải ghi lý do khi không theo FEFO.
- **Giá vốn theo từng lô**; khi xuất trừ đúng giá vốn lô đó. Giá vốn lưu 4 chữ số thập phân; giá trị tiền = round(số lượng × giá vốn) đến đồng.

## 3. Đơn vị và quy đổi
- Mỗi vật tư có **đơn vị cơ bản** (cái, ống, ml...); tồn kho luôn lưu theo đơn vị cơ bản.
- Mỗi dòng phiếu nhập có: số lượng nhập, đơn vị nhập (ví dụ hộp), và **số lượng quy đổi theo đơn vị cơ bản do người dùng nhập tay** (không cố định theo danh mục).
- **Hệ số quy đổi = số lượng quy đổi ÷ số lượng nhập**, hệ thống tự tính, chỉ đọc, lưu cùng dòng phiếu.
- Số lượng quy đổi > 0; nếu đơn vị cơ bản không chia nhỏ được thì phải là số nguyên.
- Hệ số khác lần nhập gần nhất của cùng vật tư thì **chỉ cảnh báo, không chặn**.

## 4. Công thức tiền (VND, làm tròn đến đồng ở từng dòng; tổng phiếu = tổng các dòng)
Áp dụng cho **phiếu nhập**:
- Đơn giá nhập là **giá chưa VAT**, tính theo đơn vị nhập.
- Tiền hàng = số lượng nhập × đơn giá.
- **VAT là % người dùng nhập** (0–100, cho phép số thập phân; có nút gợi ý nhanh 0/5/8/10).
- Tiền VAT = Tiền hàng × VAT%.
- **Thành tiền = Tiền hàng + Tiền VAT**, hệ thống tự tính, người dùng không sửa tay.
- Giá vốn/đơn vị cơ bản = Tiền hàng ÷ số lượng quy đổi (không gồm VAT; giả định VAT đầu vào được khấu trừ, chờ kế toán xác nhận).
- Cuối phiếu: tổng tiền hàng, tổng VAT, tổng thanh toán, số tiền bằng chữ.

Áp dụng cho **phiếu xuất**: không có VAT; đơn giá = giá vốn của lô (không nhập tay); thành tiền = round(số lượng × giá vốn).

# YÊU CẦU CHỨC NĂNG

## Tab 1 – Tổng quan tồn kho
- Số lượng tồn hiện tại và **giá trị tồn** của 3 nhóm: VTYT thường, VTYT vô cảm, Văn phòng phẩm.
- Cảnh báo: dưới **mức tồn tối thiểu** (cấu hình theo vật tư), **sắp hết hạn** (cấu hình số ngày, mặc định 90), **đã hết hạn**.
- Bấm vào một nhóm thì chuyển sang Tab 2 với nhóm đó đã chọn sẵn.

## Tab 2 – Quản lý chi tiết
- Chọn từng nhóm thì chỉ hiển thị dữ liệu của nhóm đó (ví dụ chọn VTYT thường thì không lẫn dữ liệu nhóm khác).
- **Phần trên**: danh sách vật tư và tồn theo lô (mã vật tư, tên, đơn vị cơ bản, tồn, số lô, hạn dùng, giá vốn, mã phiếu nhập gốc).
- **Phần dưới**: từng dòng lịch sử sử dụng từ các phòng khám: mã phiếu, mã vật tư, mã bác sĩ sử dụng, mã bệnh nhân/lượt khám, phòng khám/ghế, ngày giờ, số lô, số lượng, giá vốn, thành tiền.
- Lọc theo ngày, bác sĩ, phòng khám, mã vật tư, trạng thái hạn dùng; phân trang; xuất Excel.
- Dữ liệu chỉ đọc; dữ liệu này phát sinh từ các phiếu xuất đã ghi sổ ở Tab 3.

## Tab 3 – Nhập/Xuất kho
Hai nút chính: **Nhập kho** và **Xuất kho**. Bên dưới là danh sách phiếu (lọc theo loại, trạng thái, ngày, người lập).

### Nhập kho
- **Đầu phiếu**: chọn **nhà cung cấp** từ bảng danh mục riêng (mã NCC, tên, mã số thuế, địa chỉ, SĐT, người liên hệ); chọn xong tự điền các trường; có chức năng thêm NCC mới.
- **Mỗi dòng**: chọn vật tư từ danh mục (hoặc tạo mới, mã `VT-` tự sinh), tên, nhóm, số lượng nhập, đơn vị nhập, số lượng quy đổi, đơn vị cơ bản, hệ số (tự tính), số lô, hạn dùng, đơn giá, VAT%, thành tiền (tự tính).

### Xuất kho
Loại xuất:
- **Dùng cho bệnh nhân**: Quản lý kho lập phiếu, **thay nhà cung cấp bằng bệnh nhân**; bắt buộc chọn bệnh nhân, lượt khám, bác sĩ sử dụng, phòng khám (chọn từ danh mục có sẵn, không gõ tự do). Cảnh báo nếu cùng lượt khám + cùng vật tư đã có phiếu xuất ghi sổ (chống trừ kho trùng).
- **Xuất hủy** (hỏng/hết hạn/vỡ): bắt buộc lý do; chọn được lô hết hạn.
- **Cấp phát nội bộ** (chủ yếu văn phòng phẩm): chọn phòng ban/phòng khám nhận.

Các cột còn lại giống phiếu nhập (trừ VAT, xem mục 4). Không cho xuất vượt tồn.

### Vòng đời phiếu
`Nháp → Đã in → Đã ghi sổ`, thêm nhánh `Đã hủy` (có lý do).

1. **Nháp**: sửa tự do.
2. **In phiếu**: dựa trên mẫu phiếu khám hiện có; gồm tiêu đề phiếu, mã phiếu, ngày, NCC/đối tượng nhận, bảng dòng, tổng tiền (nhập: kèm bằng chữ), ô chữ ký (người lập, thủ kho, kế toán), và in kèm **họ tên + `userid` người in (tài khoản đang đăng nhập)** cùng thời gian in.
   - Lưu bảng `print_log`: mã phiếu, `userid`, thời gian, lần in thứ mấy, hash nội dung lúc in.
   - Từ lần in thứ 2 in chữ **"BẢN SAO"**.
   - "In thành công" = hệ thống sinh bản in/PDF và ghi `print_log`; khi đó phiếu chuyển sang `Đã in` và lưu hash nội dung.
3. **Sửa sau khi in**: nếu nội dung phiếu thay đổi (khác hash đã in) thì phiếu **tự quay về Nháp** và bắt buộc in lại.
4. **Ghi sổ**: chỉ thực hiện được khi trạng thái là `Đã in` **và** hash hiện tại trùng hash lúc in. **Kiểm tra ở backend**, không chỉ ẩn nút ở UI. Khi ghi sổ:
   - Nhập: cộng tồn / tạo lô mới theo quy tắc cộng dồn, lưu `ma_phieu_nhap_goc`.
   - Xuất: trừ tồn theo FEFO/FIFO hoặc theo lô đã chọn.
   - Ghi bút toán vào **sổ kho** (bảng chỉ thêm, không sửa/xóa).
   - Chuyển dữ liệu sang kế toán (mục dưới).
5. **Toàn bộ ghi sổ nằm trong một transaction** (xong hết hoặc không có gì); khóa dòng tồn khi cập nhật; chống bấm đúp/gửi lặp bằng idempotency key.
6. **Sau ghi sổ phiếu bị khóa.** Muốn sửa phải lập **phiếu điều chỉnh** (phiếu mới, tham chiếu phiếu gốc, có lý do) hoặc **hủy phiếu** (có lý do). Hủy phiếu đã ghi sổ sinh bút toán đảo, không xóa dữ liệu; chặn hủy nếu làm tồn âm hoặc lô đã bị xuất.
7. Chặn ghi sổ lại phiếu đã ghi sổ; chặn hủy phiếu đã hủy.

### Chuyển sang kế toán (`/accounting`)
- **Phiếu nhập đã ghi sổ**: tạo **khoản phải trả nhà cung cấp** gồm mã phiếu, NCC, tổng tiền hàng, VAT, tổng phải trả, hạn thanh toán (tùy chọn), trạng thái `Chưa thanh toán / Thanh toán một phần / Đã thanh toán`. Kế toán chỉ xử lý thanh toán, không sửa số tiền gốc.
- **Xuất hủy đã ghi sổ**: ghi nhận **giá trị tổn thất** (theo giá vốn lô), liên kết mã phiếu; không tạo công nợ, không phát sinh chi tiền.
- **Xuất dùng cho bệnh nhân / cấp phát nội bộ**: chỉ ghi nhận giá trị xuất kho để báo cáo; không tạo công nợ.
- Hủy phiếu nhập đã ghi sổ thì khoản phải trả liên kết bị đảo; nếu đã có thanh toán thì chặn hủy và yêu cầu kế toán xử lý trước.
- Liên kết hai chiều giữa phiếu kho và bản ghi kế toán.

# RÀNG BUỘC & VALIDATION (UI và backend đều phải kiểm tra)
- Số lượng > 0, đơn giá ≥ 0, số lượng quy đổi > 0, VAT trong 0–100, hạn dùng sau ngày nhập.
- Không cho tồn kho âm; không xóa cứng dữ liệu đã ghi sổ (soft delete + audit).
- **Phân quyền**: Quản lý kho lập/in/ghi sổ phiếu; chỉ Admin sửa danh mục vật tư và mức tồn tối thiểu; Kế toán chỉ xem phiếu và xử lý công nợ/tổn thất; Bác sĩ không truy cập module này.
- Audit log cho mọi thao tác tạo/sửa/in/ghi sổ/hủy (ai, khi nào, giá trị cũ/mới).
- Định dạng ngày dd/MM/yyyy, tiền VND có dấu phân cách hàng nghìn, múi giờ thống nhất.
- Dữ liệu test là dữ liệu giả, không dùng thông tin bệnh nhân thật.

# QUY TRÌNH THỰC HIỆN
1. Đọc code hiện tại (mẫu phiếu, `/accounting`, module bác sĩ/lượt khám/bệnh nhân) và liệt kê phần sẽ tái sử dụng.
2. Nếu có mâu thuẫn hoặc thiếu thông tin, **hỏi lại trước khi code** (tối đa 5 câu, gom một lần); còn lại ghi rõ giả định.
3. Thiết kế dữ liệu (vật tư, nhà cung cấp, lô tồn, phiếu, dòng phiếu, sổ kho, print_log, công nợ/tổn thất bên kế toán) và đưa sơ đồ để duyệt trước khi code.
4. Cài đặt theo từng tab, mỗi tab có test case đi kèm.
5. Chạy test thật và cập nhật kết quả vào `test.md` (chỉ ghi Pass khi đã chạy; chưa chạy được thì ghi "Not tested" kèm lý do).

# ĐẦU RA
- Mã nguồn + migration.
- Bảng test case gồm: happy path; dữ liệu biên; trùng mã/lô/hạn; cùng lô khác giá vốn; số lượng quy đổi thay đổi giữa các lần nhập; tính VAT và làm tròn; giá vốn số lẻ; FEFO và FIFO; xuất vượt tồn; xuất hủy lô hết hạn; xuất bệnh nhân trùng lượt khám; bấm đúp ghi sổ; ghi sổ khi chưa in; sửa sau khi in; in lần 2 ra "BẢN SAO"; hủy phiếu đã ghi sổ; phiếu điều chỉnh; chuyển kế toán; phân quyền.
- Tóm tắt ngắn (tối đa 15 dòng): đã làm gì, giả định nào, còn gì cần xác nhận.

---

# GIẢ ĐỊNH CẦN XÁC NHẬN
1. **MVT** là "Mua Vật Tư", dùng làm tiền tố mã phiếu nhập; mã vật tư trong danh mục là `VT-xxxx` riêng, cố định để cộng dồn tồn.
2. **Nguồn trừ kho cho bệnh nhân**: nếu module bác sĩ có hoặc sẽ có chức năng ghi vật tư sử dụng trong lúc khám, chỉ chọn một nguồn duy nhất để trừ kho, tránh trừ hai lần.
3. **Vật tư dùng cho bệnh nhân** chỉ trừ kho nội bộ, không tính tiền vào hóa đơn bệnh nhân.
4. **Người lập phiếu được tự ghi sổ**, không cần người thứ hai duyệt.
5. **VAT đầu vào được khấu trừ** nên giá vốn không gồm VAT (cần kế toán xác nhận).
