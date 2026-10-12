# QUY TRÌNH QUẢN LÝ PHÒNG KHÁM NHA KHOA TÍCH HỢP ERP & EMR — V14

> **Tình trạng:** Đặc tả nghiệp vụ để thiết kế và nghiệm thu. Người phụ trách chuyên môn, kế toán và pháp chế của cơ sở phải phê duyệt các quy tắc thuộc thẩm quyền trước khi vận hành. Tài liệu không chứng nhận tuân thủ pháp luật hoặc mức sẵn sàng production.
>
> **Phạm vi:** Tiếp nhận, điều trị, EMR, đồng thuận, thanh toán bệnh nhân, bảo lãnh bảo hiểm thương mại (BHTM), kho, tiệt trùng, labo, thu ngân, kế toán, nhân sự, tài sản, bảo mật và đối soát. **Không triển khai tính quyền lợi, đồng chi trả, quyết toán hoặc kết xuất dữ liệu thanh toán BHYT.** Các khoản khấu trừ lương theo chế độ lao động, nếu có, thuộc cấu hình nhân sự riêng và không lấy dữ liệu từ lượt khám.
>
> **Quy tắc đọc:** Đây là bản đặc tả thống nhất của v14. Không áp dụng song song các quy tắc v13 cũ khi khác tài liệu này. Mã tài khoản và ví dụ định khoản chỉ là định hướng cấu hình, chưa phải bút toán tự động được phê duyệt.

## 1. Nguyên tắc chung

- `Visit_ID` là lượt khám; `Patient_ID` là định danh bệnh nhân; `Service_Line_ID` là dòng dịch vụ; `Service_Completion_Event_ID` là sự kiện hoàn thành dịch vụ; `Payment_Transaction_ID` là giao dịch tiền; `Cash_Shift_ID` là ca thu ngân. ID được sinh duy nhất tại máy chủ và không đổi.
- Tiền dùng số thập phân hoặc số nguyên đơn vị nhỏ nhất, không dùng số thực dấu phẩy động. Giá, thuế, quy tắc làm tròn và tài khoản kế toán có phiên bản, ngày hiệu lực, người duyệt.
- Mọi chuyển trạng thái, phép tính và ràng buộc phải được kiểm tra ở API/CSDL trong transaction. Giao diện chỉ hỗ trợ người dùng, không phải lớp kiểm soát duy nhất.
- Chốt dịch vụ, reserve/consume kho, callback, thu tiền, hoàn tiền, gửi hồ sơ BHTM và ghi sổ đều cần khóa chống lặp. Cùng khóa và nội dung trả cùng kết quả; cùng khóa nhưng nội dung khác bị từ chối và ghi audit.
- Báo giá khác doanh thu; yêu cầu thanh toán khác tiền đã nhận; duyệt bảo lãnh khác tiền đã chuyển; reserve khác tiêu hao. Không tự chuyển trạng thái dự kiến thành đã xác nhận.
- Bản ghi đã ký, đã chốt hoặc đã ghi sổ không sửa đè nội dung nghiệp vụ. Đính chính, đảo hoặc hoàn tạo bản ghi mới liên kết bản gốc. Việc lưu trữ/xóa hợp pháp theo chính sách được phê duyệt.

## 2. Phân quyền và tách nhiệm vụ

| Vai trò | Quyền chính | Giới hạn bắt buộc |
|---|---|---|
| Tiếp nhận/thu ngân | Hồ sơ hành chính, lượt khám, phiếu thu, mở/đóng ca | Không sửa EMR đã ký, không tự duyệt giảm giá/hoàn tiền của mình, không ghi sổ |
| Bác sĩ phụ trách | Khám, chẩn đoán, chỉ định, kế hoạch, ký EMR, chốt dịch vụ | Chỉ hồ sơ trong quan hệ điều trị; không xác nhận tiền đã nhận |
| Phụ tá | Sinh hiệu, hỗ trợ ghi vật tư, quét gói vô trùng, dặn dò theo phân công | Không kê đơn, đổi chẩn đoán, ký thay hoặc chốt dịch vụ |
| Kho/tiệt trùng | Nhập, reserve, xuất, kiểm kê, xử lý chu trình và gói | Không sửa doanh thu, chứng từ kế toán hoặc EMR lâm sàng |
| Kế toán viên | Kiểm chứng từ, đối soát, đề xuất ghi sổ | Không duyệt giao dịch do mình tạo; chỉ xem dữ liệu EMR tối thiểu cần cho chứng từ |
| Kế toán trưởng/người duyệt | Duyệt quy tắc, chứng từ, kỳ và đối soát | Không tự duyệt chứng từ mình lập; quyền EMR cấp riêng theo mục đích |
| Quản trị kỹ thuật | Tài khoản, tích hợp, tham số kỹ thuật, nhật ký vận hành | Không mặc định xem EMR hay định danh nhạy cảm, không tự phê duyệt tài chính |

- Nhiều vai trò trên cùng tài khoản vẫn phải tuân thủ tách nhiệm vụ. Quyền được kiểm tra theo vai trò, chi nhánh, quan hệ điều trị, mục đích và trạng thái bản ghi.
- Truy cập khẩn cấp EMR cần lý do, phạm vi, thời hạn, phê duyệt độc lập hoặc quy trình ngoại lệ được duyệt; tự hết hạn và hậu kiểm. Không dùng tài khoản chung.
- Mọi lần xem, xuất, sửa, ký hoặc truy cập khẩn cấp dữ liệu nhạy cảm ghi người, vai trò, mục đích, thời gian, đối tượng, kết quả và nguồn truy cập. Người quản trị không được xóa vết của chính mình.

## 3. Bệnh nhân và lượt khám

### 3.1 Hồ sơ bệnh nhân

- `Patient_ID` không đổi. Lưu họ tên, ngày sinh hoặc năm sinh nếu chưa rõ ngày, liên hệ, người giám hộ khi cần, tiền sử dị ứng/bệnh nền/thuốc đang dùng cùng nguồn và thời điểm xác nhận. Giá trị chưa biết là `UNKNOWN`, không tự đổi thành “không có”.
- Số điện thoại có thể dùng chung trong gia đình: trùng chỉ cảnh báo. Số định danh có căn cứ xác thực được kiểm tra trùng theo chính sách, che bớt với vai trò không cần biết. Không bắt buộc dữ liệu chưa sẵn có để xử trí cấp cứu.
- Hợp nhất hồ sơ cần chứng cứ cùng người, người duyệt độc lập và biên bản. Giữ ID nguồn dưới dạng alias/lịch sử; không đổi khóa EMR/chứng từ đã ký. Chặn giao dịch mới trên hồ sơ nguồn và kiểm tra xung đột dị ứng.

### 3.2 Lượt khám

- Mỗi lượt có `Visit_ID`, bệnh nhân, chi nhánh, thời gian, người tiếp nhận, bác sĩ, ghế/phòng và loại lượt. Bác sĩ phải được phân công, đủ điều kiện thực hiện; ghế/thiết bị khả dụng. Kiểm tra xung đột tại lúc xác nhận, không chỉ lúc chọn.
- Loại thanh toán: tự thanh toán hoặc có bảo lãnh BHTM. Chưa xác minh hợp đồng/giấy bảo lãnh thì phần dự kiến bảo lãnh không được coi là đã trả.
- Trạng thái `REGISTERED → IN_PROGRESS → CLINICAL_COMPLETED → CLOSED`; các nhánh `ON_HOLD`, `CANCELLED`, `EMERGENCY_TRANSFER` cần lý do, người chịu trách nhiệm và công việc còn mở. Không hủy một lượt đã có can thiệp bằng cách xóa dữ liệu.
- `CLOSED` yêu cầu EMR đã hoàn tất/ký hoặc ngoại lệ ký có hạn xử lý; vật tư đã consume/release hoặc có phiếu sự cố; labo có trạng thái rõ; mọi khoản thanh toán/công nợ có đối tượng và trạng thái. Không bắt buộc tiền đã thu bằng doanh thu.

## 4. EMR, điều trị và đồng thuận

- EMR gồm sinh hiệu khi cần, tiền sử, dị ứng, chẩn đoán, sơ đồ răng/vị trí, kế hoạch theo giai đoạn, đơn thuốc, cận lâm sàng, vật tư/implant, labo, kết quả, biến chứng, dặn dò và tái khám. Mỗi ghi nhận có tác giả, thời gian, phiên bản và liên kết lượt.
- Trước can thiệp xác nhận đúng người bệnh, thủ thuật, răng/vị trí, chống chỉ định, thiết bị, dụng cụ vô trùng và vật tư/thuốc hợp lệ. Thiếu điều kiện an toàn thì chặn bắt đầu; cấp cứu xử trí theo quy trình chuyên môn và ghi hồ sơ sau bằng ngoại lệ có dấu thời gian.
- Chỉ bác sĩ có quyền mới kê đơn, chỉ định, xác nhận thực hiện và chốt dịch vụ. Dữ liệu phụ tá nhập phải được bác sĩ xác nhận trước khi làm căn cứ lâm sàng.
- EMR chưa ký được sửa có lịch sử phiên bản. Sau ký chỉ dùng phụ lục/đính chính có tác giả, lý do, thời gian và liên kết bản gốc; không ghi đè chữ ký cũ.

### 4.1 Đồng thuận

- Danh mục thủ thuật cần đồng thuận được người phụ trách chuyên môn phê duyệt theo phiên bản. Bản đồng thuận gắn đúng người bệnh/người giám hộ, thủ thuật, vị trí, nguy cơ, lựa chọn và bản giải thích đã trình bày.
- Trạng thái `DRAFT → PRESENTED → SIGNED`; `REVOKED` là sự kiện có thời gian và phạm vi. Trước thủ thuật thuộc diện bắt buộc, API kiểm tra chữ ký/định danh phù hợp và bản đồng thuận còn hiệu lực. Chữ ký điện tử trên tablet không tự đồng nghĩa chữ ký số.
- Rút đồng thuận: dừng phần chưa thực hiện, giữ phần đã làm, bác sĩ đánh giá an toàn và ghi phương án tiếp tục/hủy/đổi. Không tự đảo lượt về trạng thái trước can thiệp. Bước mới cần đồng thuận mới hợp lệ.

### 4.2 Hoàn thành dịch vụ và ký

- Bác sĩ chốt từng `Service_Line_ID` với dịch vụ, số lượng đã thực hiện, giá/phiên bản giá đã duyệt, kết quả, vật tư thực dùng và người thực hiện. Dịch vụ chỉ trong kế hoạch không tạo doanh thu.
- Tạo `Service_Completion_Event_ID` một lần cho mỗi lần thực hiện hợp lệ; ràng buộc duy nhất theo dòng và phiên bản hoàn thành. Gọi lặp trả cùng kết quả. Thay đổi sau chốt dùng sự kiện điều chỉnh/đảo, không chốt lại để nhân đôi doanh thu hoặc tiêu hao.
- Mất mạng/ký lỗi: lưu nháp có thời gian và hàng đợi ký, không giả chữ ký. Ngoại lệ ký có lý do, người duyệt và hạn xử lý; quá hạn vào danh sách xử lý nhưng không ngăn ghi nhận cấp cứu.
- Lượt miễn phí/bảo hành vẫn cần EMR, đồng thuận nếu cần, vật tư, kết quả và dặn dò. Chỉ đóng khi đủ điều kiện; không sinh phiếu thu 0 đồng.

## 5. Giá, phân bổ và thanh toán

### 5.1 Công thức chuẩn

- Giá dòng lấy theo phiên bản hiệu lực tại lúc báo giá được chấp nhận; lưu ảnh chụp giá, thuế, chương trình, người duyệt. Giá/số lượng âm và tỷ lệ giảm ngoài 0–100% bị chặn; hoàn/điều chỉnh đi luồng riêng.
- `Gross = Σ(quantity × approved_unit_price)` cho dòng đã hoàn thành. `ApprovedDiscount ≤ Gross`; `Tax` theo cấu hình hiệu lực và chứng từ; `RoundingAdjustment` là khoản có dấu. `NetPayable = Gross - ApprovedDiscount + Tax + RoundingAdjustment ≥ 0`.
- `NetPayable = PatientAllocation + BHTMAllocation` tại phiên bản phân bổ đã chốt. Cọc là nguồn thanh toán của phần bệnh nhân, không phải một người chi trả hay doanh thu mới. Chưa có BHTM hợp lệ thì `BHTMAllocation = 0`.
- Với từng người chi trả tại cùng thời điểm đối soát: `Outstanding = Allocation - ConfirmedPayment - AppliedAdvance - PostedCredit + RefundedAmount`. Không cho công nợ âm; tiền thu dư được ghi nghĩa vụ trả lại/ứng trước. Điều chỉnh phân bổ phải giữ tổng `NetPayable` hoặc có chứng từ điều chỉnh giá/thuế.
- Doanh thu/thuế/phải thu phát sinh theo sự kiện hoàn thành và chính sách kế toán được duyệt; nhận tiền chỉ giảm phải thu hoặc tạo nghĩa vụ cọc. Không ghi doanh thu lần nữa khi cấn cọc, thu nợ hay nhận tiền BHTM.

### 5.2 Cọc, nhiều phương thức và công nợ

- Nhận cọc tạo `Deposit_ID`, người nộp, bệnh nhân/hợp đồng, số tiền, phương thức, chứng từ và số dư. Chỉ cấn cọc đã xác nhận, đúng quyền sử dụng, tối đa số dư và phần bệnh nhân còn phải trả. Reserve/cấn cọc nguyên tử để hai thu ngân không dùng cùng một khoản.
- Tiền mặt chỉ xác nhận khi thực nhận, gắn ca đang mở. Chuyển khoản/QR ở `PENDING` đến khi callback có xác thực hoặc sao kê được đối soát; callback lặp không sinh thêm thu/phiếu. Giao dịch thất bại không giảm công nợ.
- Trạng thái giao dịch tiền: `INITIATED → PENDING → CONFIRMED/FAILED`; hoàn tiền sau `CONFIRMED` là giao dịch hoàn độc lập có trạng thái `REQUESTED → APPROVED → SENT → CONFIRMED/FAILED`. Chỉ trạng thái `CONFIRMED` ảnh hưởng số đã thu/đã hoàn; sai lệch kết quả ngân hàng và hệ thống vào hàng đợi đối soát. Không chuyển `FAILED` thành `CONFIRMED` bằng cách sửa bản ghi cũ; tạo sự kiện xác minh/điều chỉnh có vết.
- Ghi nợ cần quyền, hạn mức, hạn thanh toán và người duyệt theo chính sách. Lượt chờ thu phải có đối tượng nợ, số tiền, hạn và bộ phận theo dõi.
- Thu vượt, hủy và hoàn cọc/tiền cần duyệt độc lập. Tổng hoàn lũy kế không vượt tiền đã xác nhận thực nhận còn khả dụng. Hóa đơn điều chỉnh và bút toán liên kết bản gốc; kỳ khóa chỉ điều chỉnh ở kỳ mở.

### 5.3 Chiết khấu, làm tròn và thuế

- Giảm giá cần lý do, chương trình hoặc `Discount_Approval_ID`, người yêu cầu/duyệt, hạn mức và phiên bản giá. Không chia một khoản giảm thành nhiều giao dịch để né ngưỡng; ngưỡng tính trên toàn hóa đơn/lượt theo chính sách.
- Làm tròn theo bước được cấu hình, `abs(RoundingAdjustment) ≤ MAX_ROUNDING_AMOUNT`; kiểm tra cả chiều tăng/giảm. Không dùng làm tròn thay giảm giá. Vượt ngưỡng chuyển luồng giảm giá/điều chỉnh có duyệt.
- Thuế/hóa đơn theo ngày hiệu lực và bản chất dịch vụ; không gán cứng thuế suất theo tên nhóm. Thay đổi sau phát hành hóa đơn dùng chứng từ điều chỉnh theo cấu hình đã được kế toán/pháp chế duyệt.

## 6. Bảo lãnh bảo hiểm thương mại (BHTM)

- Chỉ nhận bảo lãnh khi hợp đồng/ủy quyền còn hiệu lực, dịch vụ được chấp nhận, hạn mức và chứng cứ xác minh đầy đủ. Giá trị dự kiến không vượt phần đủ điều kiện, hạn mức còn lại hoặc tổng phải trả. Không tự suy quyền lợi từ thẻ do bệnh nhân khai.
- `Insurance_Claim_ID` bất biến, liên kết một hoặc nhiều dòng dịch vụ và các phiên bản nộp/điều chỉnh. Một lượt có thể có nhiều hồ sơ theo điều khoản khác nhau. Chống gửi trùng theo hồ sơ + phiên bản + đích nhận.
- Trạng thái `DRAFT → VALIDATED → SUBMITTED → ACKNOWLEDGED → APPROVED/PARTIALLY_APPROVED/REJECTED/DISPUTED`. Phần được duyệt chỉ sang `SETTLED` sau đối soát tiền thực nhận hoặc chứng từ bù trừ hợp lệ; phần từ chối/tranh chấp chỉ sang `CLOSED` sau quyết định xử lý và tất toán công nợ/điều chỉnh tương ứng. Hồ sơ duyệt một phần chỉ đóng khi cả hai phần có kết cục. Mỗi chuyển trạng thái có bằng chứng, người/thời gian và giá trị; không tự tất toán ở `APPROVED`.
- Từ chối/duyệt thiếu không tự chuyển phần còn lại sang bệnh nhân. Đối chiếu hợp đồng, phân loại bệnh nhân chịu/cơ sở chịu/đang khiếu nại, thông báo và duyệt điều chỉnh phân bổ cùng chứng từ. Tranh chấp theo dõi tuổi nợ riêng; không tự xóa nợ.
- Tiền BHTM thực nhận đối soát mã giao dịch, hồ sơ và số tiền; thiếu/thừa ghi chênh lệch chờ xử lý. Không ghi tăng doanh thu khi nhận tiền.

## 7. Kho thuốc, vật tư và implant

- Mặt hàng có đơn vị, quy đổi, chi nhánh/vị trí, lô, hạn dùng và serial khi áp dụng. `OnHand` là tồn vật lý và bao gồm các phần `Reserved`, `Quarantined`, `Blocked`; ba phần bị trừ phải tách rời, không đếm một đơn vị hai lần. `Available = OnHand - Reserved - Quarantined - Blocked ≥ 0` theo kho/lô/serial.
- Nhập kho cần chứng từ, nhà cung cấp, kiểm nhận số lượng/chất lượng, lô/hạn, điều kiện bảo quản và trạng thái. Lô chưa giải phóng, hết hạn, thu hồi hoặc cách ly không reserve/consume được.
- FEFO chọn lô hợp lệ theo hạn dùng nếu phù hợp. FIFO/bình quân tính giá vốn là cấu hình kế toán độc lập. Nếu một lô không đủ, tách dòng xuất theo lô và giữ truy vết; cấm âm tồn.
- `Reserve → Consume` hoặc `Reserve → Release` dùng khóa chống lặp và transaction có khóa cạnh tranh. Một serial chỉ thuộc một ca sử dụng tại một thời điểm. Reserve hết hạn được giải phóng có kiểm soát; không giải phóng vật tư đã dùng.
- Thu hồi/hết hạn: chặn lô, truy vết bệnh nhân/lượt đã dùng, đánh giá nguy cơ lâm sàng, biên bản hủy/trả và chứng từ kho/kế toán. Không tự quy trách nhiệm chi phí trước kết luận.

## 8. Tiệt trùng, labo và bảo hành

- Dụng cụ tái sử dụng: nhận bẩn → làm sạch → kiểm tra/đóng gói → tiệt trùng → đọc chỉ thị/kiểm tra chất lượng → giải phóng gói → sử dụng. Chu trình lỗi hoặc gói quá hạn, rách, mất truy vết phải cách ly.
- `Sterilization_Cycle_ID` và `Instrument_Pack_ID` liên kết thiết bị, chu trình, người kiểm, chỉ thị, hạn hiệu lực theo loại gói và lượt/bệnh nhân sử dụng. Hạn vô trùng theo chính sách được duyệt, không mặc định một số ngày cho mọi gói.
- Phiếu labo có chỉ định, mẫu, hạn giao, người bàn giao/nhận, trạng thái QC và chi phí. Làm lại tạo lần rework riêng; nguyên nhân và bên chịu chi phí được duyệt, không ghi đè phiếu gốc.
- Bảo hành có điều kiện theo dịch vụ và hồ sơ gốc. Ca bảo hành miễn phí vẫn ghi EMR, vật tư/labo nếu có và kết quả; không có phiếu thu 0 đồng hoặc tự đóng trước hoàn tất lâm sàng.

## 9. Thu ngân, kế toán, hoa hồng

### 9.1 Ca thu ngân

- Mở ca ghi quỹ đầu, người giữ két, chi nhánh, thời gian. Một phiếu tiền mặt gắn một ca đang mở; giao dịch ngân hàng không cộng vào tiền mặt thực đếm.
- `ExpectedCash = OpeningFloat + ConfirmedCashReceipts - ApprovedCashPayments ± ApprovedTransfers`. Đóng ca đối chiếu kiểm đếm theo mệnh giá; mọi chênh lệch cần biên bản. Vượt `CASH_OVER_SHORT_THRESHOLD` cần duyệt độc lập trước `RECONCILED`. Không sửa/xóa giao dịch đã hạch toán để ép khớp.
- Chênh lệch chưa rõ nguyên nhân treo chờ xử lý theo chính sách kế toán; chỉ ghi phải thu nhân viên sau kết luận trách nhiệm được duyệt. Ca `CLOSED/RECONCILED` chỉ sửa bằng điều chỉnh có vết.

### 9.2 Chứng từ và sổ cái

- Sự kiện nguồn, hóa đơn, phiếu thu/chi và bút toán là đối tượng riêng. Bút toán có `Source_Event_ID`, `Source_Document_ID`, phiên bản quy tắc, ngày chứng từ/hạch toán, kỳ, chi nhánh, đồng tiền, Nợ/Có, số tiền, người lập/duyệt, liên kết đảo và trạng thái.
- `DRAFT → SUBMITTED → APPROVED → POSTED`; sau `POSTED` chỉ đảo/điều chỉnh. Tổng Nợ bằng tổng Có theo chứng từ và đồng tiền; khóa duy nhất `Source_Event_ID + Accounting_Rule_Version + Event_Type` ngăn ghi trùng. Cấm ghi vào kỳ khóa.
- Sơ đồ gợi ý phải được kế toán trưởng phê duyệt: hoàn thành dịch vụ tạo doanh thu/phải thu khi đủ điều kiện; thu nợ giảm phải thu; nhận cọc tạo nghĩa vụ/chi tiết dư Có; cấn cọc chỉ bù trừ; xuất kho tạo giá vốn/chi phí phù hợp; hoàn tiền/giảm giá dùng chứng từ điều chỉnh. Không coi thu tiền là điều kiện duy nhất ghi doanh thu.
- Định khoản, thuế, hóa đơn và chế độ kế toán cần đối chiếu quy định hiệu lực tại cơ sở. Không tự mặc định 811 cho mọi thiệt hại, 1388 cho thiếu quỹ, 632 cho mọi vật tư hoặc một thuế suất cho mọi dịch vụ.

### 9.3 Hoa hồng và nhân sự

- Hoa hồng có phiên bản, tỷ lệ theo dịch vụ/người thực hiện và căn cứ tính được duyệt. Nếu dùng cơ sở tiền thực thu: chỉ khoản đã xác nhận và cọc đã áp dụng cho dịch vụ hoàn thành vào kỳ tính; một đồng tiền không tính hai lần.
- Hoàn tiền/đảo dịch vụ tạo `Commission_Adjustment_ID` liên kết khoản đã tính, có số âm và kỳ xử lý; không sửa bảng lương khóa. BHTM chỉ tính khi tiền thực nhận nếu chính sách áp dụng tương tự.
- Lương gồm lương cơ bản, phụ cấp, hoa hồng, các khoản khấu trừ theo cấu hình nhân sự và thuế áp dụng. Không tự trừ chênh lệch két vào lương khi thiếu căn cứ/phê duyệt.

## 10. Tài sản, bảo mật và dữ liệu

- Tài sản có `Asset_ID`, tình trạng, lịch bảo trì/hiệu chuẩn, chi nhánh và người phụ trách; thiết bị quá hạn điều kiện bắt buộc không được chọn cho thủ thuật liên quan.
- Dữ liệu nhạy cảm mã hóa khi truyền/lưu theo kiến trúc được duyệt; quản lý khóa tách quyền, sao lưu và thử khôi phục. Không ghi bệnh án hoặc số định danh đầy đủ vào log ứng dụng thông thường.
- Lịch lưu trữ theo loại hồ sơ và căn cứ hiện hành do pháp chế/y tế duyệt; không áp một thời hạn chung hoặc cấm xóa vật lý vô điều kiện. Truy cập/xuất/chỉnh sửa/xóa hợp pháp theo quy trình có kiểm chứng và audit.
- Sao lưu có RPO/RTO do cơ sở phê duyệt, giám sát thất bại, diễn tập khôi phục và kiểm tra khóa ngoại, tệp đính kèm, chữ ký, thứ tự sự kiện sau restore. Có lịch backup chưa phải bằng chứng đạt RPO/RTO.

## 11. Bất biến dữ liệu và cạnh tranh

- Khóa chính của mọi thực thể bất biến; mã hiển thị không dùng làm khóa nếu có nguy cơ trùng/hết dải. Sinh ID trong transaction hoặc dùng UUID phù hợp; unique tại CSDL. Hết dải mã hiển thị không quay vòng mã.
- `Created_At`, `Created_By`, nguồn gốc và liên kết gốc là dữ liệu audit. Chỉ trường được phép theo trạng thái mới sửa trực tiếp; sau ký/chốt/ghi sổ dùng sự kiện mới. Dùng optimistic version hoặc khóa hàng khi hai người cùng sửa.
- Danh mục giá, thuế, quy tắc kế toán, hoa hồng và quyền có `Effective_From/To`, phiên bản, người duyệt. Không có hai phiên bản hiệu lực chồng nhau cùng phạm vi; giao dịch lưu phiên bản đã dùng.
- Lỗi một phần trong chuỗi chốt dịch vụ/tiêu hao/ghi nhận tiền phải rollback transaction nguyên tử hoặc tạo trạng thái chờ xử lý rõ ràng; không để hai lần trừ kho hay phiếu thu thiếu giao dịch tiền.

## 12. Đối soát và ngoại lệ

- Cuối ngày đối soát ca tiền mặt, sao kê/chuyển khoản chờ xác nhận, cọc, công nợ bệnh nhân/BHTM, doanh thu và hóa đơn, tồn kho theo lô, EMR chờ ký, gói tiệt trùng, labo quá hạn và hàng đợi tích hợp lỗi. Mỗi sai lệch có mã, mức độ, chủ xử lý, hạn, trạng thái.
- Báo cáo doanh thu, công nợ, tồn kho, chi phí ca và hoa hồng phải công bố rõ kỳ, chi nhánh, phiên bản quy tắc và thời điểm dữ liệu; tổng báo cáo đối chiếu được với sổ chi tiết/chứng từ nguồn. Chỉ người có quyền xem dữ liệu tổng hợp hoặc chi tiết theo mục đích mới được xuất báo cáo.
- Cuối kỳ khóa khi sai lệch trọng yếu được xử lý hoặc có quyết định treo được duyệt. Chứng từ đến muộn/hoàn sau khóa sổ ghi điều chỉnh ở kỳ mở và tham chiếu kỳ gốc.
- Từ chối điều trị, rút đồng thuận, biến chứng/cấp cứu, mất mạng, vật tư thiếu/cách ly, thanh toán chậm, BHTM từ chối và labo làm lại đều cần trạng thái treo, người chịu trách nhiệm, hạn và điều kiện đóng. Không có nhánh “bỏ qua rồi hoàn tất”.

## 13. Tiêu chí nghiệm thu bắt buộc

| ID | Kịch bản | Kết quả quan sát được |
|---|---|---|
| AT-01 | Thu cọc 2 triệu, hoàn thành dịch vụ 5 triệu, cấn cọc, thu thêm 3 triệu | Doanh thu một lần 5 triệu; cọc không tạo doanh thu lần hai; công nợ 0 |
| AT-02 | Callback QR giống nhau ba lần; cùng key khác nội dung | Một giao dịch/phiếu thu; nội dung khác bị từ chối và có audit |
| AT-03 | BHTM duyệt 1 triệu nhưng chưa chuyển tiền | Phải thu BHTM còn 1 triệu; tiền ngân hàng chưa tăng; chưa `SETTLED` |
| AT-04 | BHTM duyệt thiếu, hợp đồng không cho thu lại bệnh nhân | Không tự chuyển nợ; tạo quyết định xử lý phần thiếu |
| AT-05 | Hai bệnh nhân dùng chung số điện thoại | Cảnh báo trùng, vẫn tạo riêng sau xác minh |
| AT-06 | Rút đồng thuận sau một phần thủ thuật | Giữ phần đã làm; dừng phần chưa làm; đánh giá an toàn; không xóa EMR |
| AT-07 | Hai bác sĩ cùng reserve một serial | Chỉ một reserve thành công; không âm tồn |
| AT-08 | Lô gần hết hạn đang cách ly | FEFO bỏ qua lô; không consume được |
| AT-09 | Ca miễn phí/bảo hành có dùng vật tư | Có EMR/tiêu hao; không phiếu thu 0 đồng; thiếu EMR thì không đóng |
| AT-10 | Đóng ca thiếu tiền chưa rõ nguyên nhân | Chênh lệch chờ xử lý, chưa ghi nợ nhân viên; vượt ngưỡng cần duyệt |
| AT-11 | Hoàn tiền sau khóa sổ | Có duyệt, không vượt tiền đã thu; điều chỉnh kỳ mở liên kết bản gốc |
| AT-12 | Thu hồi lô đã dùng nhiều ca | Chặn lô và lập danh sách lượt/bệnh nhân cần đánh giá |
| AT-13 | Mất mạng khi ký EMR | Không giả chữ ký; nháp/chờ ký có audit và hạn xử lý |
| AT-14 | Gửi lặp hồ sơ BHTM, duyệt một phần, nhận tiền thiếu | Không trùng hồ sơ/chứng từ; công nợ và sai lệch đúng từng lần |
| AT-15 | Hai thu ngân cấn cùng khoản cọc | Tổng cấn không vượt số dư; một giao dịch bị từ chối hoặc tính lại |
| AT-16 | Đổi giá/thuế sau khi báo giá và hoàn thành | Giao dịch cũ giữ phiên bản; bản mới áp dụng từ ngày hiệu lực |
| AT-17 | Người lập tự duyệt hoàn; gọi API đọc EMR không có quan hệ điều trị | API từ chối và có audit |
| AT-18 | Chia giảm giá để né duyệt; gọi lặp chốt dịch vụ | Không né duyệt, không tạo hai doanh thu hoặc hai lần trừ kho |
| AT-19 | Restore bản sao lưu thử | EMR, tệp, chữ ký, liên kết và thứ tự sự kiện đạt RPO/RTO đã duyệt |
| AT-20 | Nhập giá/số lượng âm, giảm giá vượt tổng, tiền hoàn vượt thực thu | API từ chối, không sinh chứng từ hoặc công nợ âm |
| AT-21 | Hai phiên bản giá/thuế cùng phạm vi và thời gian hiệu lực | Không được duyệt đồng thời; giao dịch cũ giữ phiên bản đã chốt |
| AT-22 | Gói tiệt trùng lỗi/quá hạn hoặc thiết bị không đủ điều kiện | Chặn chọn/sử dụng, tạo sự cố có chủ xử lý; cấp cứu vẫn ghi được diễn biến |
| AT-23 | Sửa ID, nội dung EMR đã ký, bút toán đã ghi sổ hoặc số đếm ca đã đối soát | API/CSDL từ chối sửa đè; chỉ cho phụ lục/đảo/điều chỉnh có tham chiếu |
| AT-24 | Ghi sổ lệch Nợ/Có, gọi lặp cùng sự kiện hoặc ghi vào kỳ khóa | Không tạo bút toán sai/trùng; kỳ khóa chỉ nhận chứng từ điều chỉnh ở kỳ mở |

## 14. Điểm phải phê duyệt trước triển khai

1. Phụ trách chuyên môn xác nhận thủ thuật, điều kiện đồng thuận, ngoại lệ cấp cứu, chính sách ký và lưu trữ EMR.
2. Kế toán trưởng xác nhận chế độ kế toán, sơ đồ tài khoản, thời điểm ghi doanh thu, cọc, giá vốn, thuế/hóa đơn, quỹ, giảm giá và hoàn tiền bằng ma trận quy tắc có phiên bản.
3. Quản lý vận hành xác nhận hạn mức giảm giá, bước/trần làm tròn, ngưỡng chênh lệch két, hạn xử lý ngoại lệ, bảo hành và RPO/RTO.
4. Pháp chế/đầu mối BHTM xác nhận hợp đồng bảo lãnh, trách nhiệm khi từ chối, chứng từ và phân bổ phần được/không được duyệt.
5. Nhóm kỹ thuật đối chiếu tài liệu với schema, API, giao diện, sơ đồ và test; chỉ tuyên bố sẵn sàng vận hành sau khi có bằng chứng AT-01 đến AT-24 và các phê duyệt trên.
