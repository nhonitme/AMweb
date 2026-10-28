# Bảng và toolbar chứng từ

Mở `/demo/v3/ui-guidelines#table`, mục **05 · Bảng & toolbar**. Demo Phiếu thu có 12 bản ghi và chi tiết hạch toán, hoàn toàn trong bộ nhớ; tải lại trang hoặc “Khôi phục mẫu chứng từ” đưa về bộ ban đầu.

## Nguồn quan sát

- Receipt: https://app.amnote.com.vn/app/0001/gl/voucher/receipt — đã xem toolbar, bảng chính/chi tiết, chọn 1 và 2 dòng rồi bỏ chọn. Thứ tự: Từ ngày → Đến ngày → Tìm kiếm → Thêm mới → Tìm nhanh → Tải lại → Cài đặt cột → Xóa → Nhập Excel → Xuất PDF. Các nút vẫn hiện khi chọn dòng. Không thực hiện thao tác ghi/xóa hoặc xuất trên dữ liệu nghiệp vụ.
- Sale-order: https://app.amnote.com.vn/demo/xanh/production/sale-order — phiên quan sát có nhãn “Bản local”. Dùng cách trình bày control gọn, bảng trung tính và selection; chọn dòng vẫn giữ tìm kiếm/tải lại/xuất/cột. Không khẳng định đây là bản production gốc.
- `VoucherToolbar.tsx` trong workspace khác phiên bản đang quan sát. Demo dùng thứ tự thực tế trên trình duyệt; không thay adapter nghiệp vụ này.

## Toolbar một hàng · cập nhật 22/10/2026

Toolbar cao khoảng 49px desktop (control 32px, padding dọc 8px), không wrap. Từ/Đến dùng label ngắn cùng hàng, input ngày 126px; tìm nhanh rộng 150px (có thể co về 100px). Bộ lọc Từ → Đến → Tìm kiếm nằm trái. Nhóm từ Thêm mới đến tìm nhanh, các tác vụ và selection căn sát phải, giữ nguyên thứ tự. `margin-left:auto` chỉ đặt tại Thêm mới; tìm nhanh và selection không có auto margin nên khoảng trống linh hoạt chỉ nằm giữa hai nhóm. Thêm mới giữ icon và chữ. Tác vụ phụ dùng icon 32px có tooltip/tên truy cập; menu “Thêm” chứa phần cuối danh sách đúng thứ tự, giữ disabled và handler. ResizeObserver đo container nên phản ứng với sidebar hoặc vùng cha đổi rộng; không dựa riêng viewport. Khi container dưới 850px, ngày mở trong popup; dưới 700px, tìm nhanh mở popup. Dưới 380px, Tìm nhanh là mục đầu menu trước Tải lại, sau Thêm mới theo thứ tự thao tác. Selection có nút Bỏ chọn compact, ở khung rất hẹp gộp Đã chọn N và dấu đóng vào một nút Bỏ chọn. Các chức năng không bị mất khi chuyển menu.

Sidebar Guidelines không có nút thu/mở độc lập: kiểm tra trạng thái sidebar dọc ở desktop/tablet và menu ngang ở mobile, kèm các container thực tế khác nhau; chưa kiểm tra một sidebar nghiệp vụ có toggle vì ngoài phạm vi.

Đã đo bản một hàng trong Chrome với selection nhiều dòng: viewport 1280 / container 936px và viewport 768 / container 521px đều cao 49px; mobile 390 / container 341px, mobile 320 / container 271px cao 53px. `scrollWidth` bằng `clientWidth` ở cả bốn khung. Đã thử menu đúng thứ tự, disabled khi loading, Enter/End/Escape và trả focus, gọi PDF preview qua menu, tìm nhanh qua popup và Bỏ chọn compact. Ngày native đã thử bằng ArrowUp rồi áp dụng; thao tác fill ngày tự động không phát sinh change đáng tin cậy trong công cụ, không coi đây là phép thử nhập ngày hoàn chỉnh. Chưa thử thiết bị cảm ứng thật. Build/lint/model test và đối chiếu hash assets đang phục vụ đã đạt.

## Quy tắc mẫu

Lần căn nhóm phải: đã đo Chrome viewport 1280 (container 936px), 768 (521px), 390 (341px), 320 (271px), `scrollWidth` bằng `clientWidth`, không tràn. Ở desktop 1280, khoảng giữa hai nhóm khoảng 83px khi chọn 3 dòng; khoảng nội bộ nhóm phải 6px. Menu desktop giữ Xóa → Nhập Excel → Xuất PDF; menu mobile giữ Tìm nhanh trước các tác vụ gốc, nằm trọn viewport. Đã thử Enter/ArrowDown/Escape trả focus và Bỏ chọn; kiểm tra viewport mô phỏng, chưa thử touch trên thiết bị thật. Chỉ đổi ba quy tắc layout CSS và tài liệu/prompt, không đổi handler, selection hay bảng.


Bảng quy tắc đầy đủ nằm ngay dưới demo, theo đúng thứ tự từng thao tác, có cột không chọn/chọn một/chọn nhiều/disabled/phạm vi. Tất cả tác vụ toàn bảng vẫn hiện khi chọn dòng. Xóa chỉ bật khi có selection hợp lệ và phải xác nhận; PDF có selection dùng các dòng chọn, không chọn dùng toàn bộ kết quả lọc qua các trang. Đây là chính sách của demo; phạm vi xuất/xóa production chưa được xác minh bằng thao tác thực thi.

Checkbox đầu bảng chỉ chọn trang hiện tại; selection có thể giữ qua phân trang. “Đã chọn N / Bỏ chọn” báo rõ số dòng ngay trên hàng toolbar, không có dải selection riêng. Đổi từ khóa hoặc áp dụng ngày/tải lại sẽ bỏ chọn để tránh tác động selection ngoài phạm vi. Bấm số chứng từ chỉ đổi chi tiết đang xem, độc lập checkbox. Không có nút toolbar chỉ dành đúng một dòng trong nguồn quan sát; không tự thêm chức năng để lấp trường hợp này.

Lọc nhanh hỗ trợ không phân biệt hoa/thường và dấu tiếng Việt. Ngày chỉ áp dụng khi nhấn Tìm kiếm; khoảng ngày sai có lỗi và giữ kết quả cũ. Tải lại mô phỏng độ trễ, giữ bộ lọc và dữ liệu đã sửa trong bộ nhớ. Bộ chọn trạng thái và các nút “Thử” nằm ngoài toolbar nghiệp vụ, chỉ dùng tài liệu.

Nhập Excel dùng thư viện `xlsx` đã có, trong popup fullscreen 4 bước theo sale-order: Chọn tệp → Ghép dữ liệu → Kiểm tra dữ liệu → Kết quả. Nhận .xlsx/.xls/.csv tối đa 5MB và 500 dòng dữ liệu. Chọn sheet, dòng tiêu đề (đánh số từ 1) và phương pháp Thêm mới; tải tệp mẫu thật. Ghép trường bắt buộc code/date/payer/amount, description tùy chọn; cấm ghép trùng cột. Ngày nhận ISO, DD/MM/YYYY hoặc số ngày Excel (cả hệ 1904); số tiền không âm, bao gồm 0 và định dạng Việt Nam. Kiểm tra tất cả dòng và hiện lỗi theo trường; trùng số chứng từ (không phân biệt hoa thường, bỏ khoảng trắng hai đầu) trong bảng hoặc trong tệp được bỏ qua. Chỉ nút xác nhận nhập dòng hợp lệ mới cập nhật bộ nhớ; không ghi đè dòng cũ, không gọi API nghiệp vụ. Kết quả tính lại theo dữ liệu bảng lúc xác nhận. Khóa tức thời chống bấm lặp; đóng/hủy trong lúc đọc tệp vô hiệu kết quả đọc muộn. Quay lại giữ ánh xạ nếu chưa đổi sheet/tiêu đề/tệp. Tải lại trang mất dữ liệu demo. PDF vẫn dùng bản xem trước và hộp thoại in của trình duyệt.

## Tái sử dụng

- `src/components/amnote/ui/AMDocumentToolbar.jsx` và `.d.ts`: toolbar một hàng, hai nhóm trái/phải, tác vụ phụ dùng icon và menu khi thiếu chỗ. Selection compact cùng hàng; giữ tìm kiếm/tải lại/xuất khi chọn dòng. Tác vụ không có callback không render.
- `src/components/amnote/ui/document-table.css`: token và layout scoped `.am-ui`; một hàng, overflow menu đúng thứ tự, bảng cuộn ngang riêng.
- `src/pages/UIGuidelines/ReceiptTableDemo.jsx`: handler bộ nhớ, selection, phân trang, cột, form thêm, xác nhận xóa, import, preview PDF.
- `src/pages/UIGuidelines/receipt-demo-model.mjs`: fixture/lọc/validation riêng cho tài liệu.

Trang có code đầy đủ cho component, CSS, demo và model, cùng recipe **Bảng · Toolbar chứng từ đầy đủ** trong mục 00 để sao chép prompt. Trang thật phải giữ API, validation, handler, phân quyền, schema và DevExtreme adapter hiện có; không mang fixture hoặc nút Thử sang trang thật.

## Kiểm tra và giới hạn


Đã build riêng Guidelines, lint các component liên quan và chạy kiểm tra model: khoảng ngày, tìm tiếng Việt, selection/output qua trang, số tiền 0, trùng mã, ngày/số tiền sai, thứ tự thao tác. Browser đã thử chọn nhiều/PDF preview, lọc bỏ chọn, loading/rỗng/lỗi/retry, ẩn cột, thêm mẫu/validation/số 0, xóa mẫu có xác nhận, cảnh báo chưa lưu, menu Enter/ArrowDown/Escape trả focus. Kiểm tra viewport desktop 1920, tablet 768 và mobile 390: trang không tràn ngang, bảng cuộn riêng; menu nằm trong viewport; popup mobile có footer tiếp cận được. Đây là viewport mô phỏng, chưa thử trên điện thoại cảm ứng thật.

Kiểm thử nhập Excel cập nhật ngày 22/10/2026: xem `deliverables/excel-import/browser-test-results.json` và `docs/excel-import-testing.md`. Các giới hạn PDF/in hệ điều hành trước đây vẫn giữ nguyên. Không kiểm thử ghi dữ liệu production.
