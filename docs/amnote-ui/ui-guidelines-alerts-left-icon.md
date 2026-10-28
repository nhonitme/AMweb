# Alerts Left icon · 23/10/2026

## Phạm vi và nguồn đối chiếu

Chỉ sửa bốn mẫu Alerts tại `/demo/v3/ui-guidelines#basic-alerts`. Giữ các anchor alerts-1 tới alerts-4, menu, role, liên kết và thao tác minh họa. Không sửa SweetAlert, API hoặc phân quyền nghiệp vụ.

Tham khảo: https://themes.kopyov.com/limitless/demo/template/html/layout_1/full/components_alerts.html

Đã tải HTML và CSS gốc để xác minh phần `Left icon` > `Block icon`: `.alert-icon-start` chứa `.alert-icon` riêng có nền semantic đặc, icon trắng; vùng icon kéo từ top:0 tới bottom:0, nội dung có padding tránh vùng icon, nút đóng tách riêng. Tệp tham khảo lưu trong `.demo-check/limitless-alerts-reference.html` và `.demo-check/limitless-alerts-reference.css`. Chỉ đọc source, không sao chép Bootstrap hoặc stylesheet Limitless vào ứng dụng.

Trình duyệt vẫn trả `Local browser use is disabled in Work settings`; không có ảnh trước/sau mới và chưa đối chiếu trực quan mẫu gốc. Không tuyên bố khớp pixel hoặc kiểm thử tương tác browser.

## Thiết kế và thay đổi

- `AlertsDemo.jsx`: AMInlineAlert với vùng icon trái, nội dung phải và nút đóng góc phải. Bốn icon Phosphor regular tĩnh: Info, CheckCircle, WarningCircle và XCircle, cùng 22px.
- `alerts-demo.css`: token info/success/warning/error cho nền nhạt và vùng icon đặc. Desktop vùng icon 48px, mobile 40px; padding nội dung 16px/12px. Grid minmax(0,1fr), wrap nội dung dài, nút đóng 32px có vùng riêng.
- Giữ Inter, radius và AMButton chung; không thêm animation, gradient, shadow hoặc thư viện mới. Các quy tắc về font và hiệu ứng của high-end-visual-design được thay bằng yêu cầu AMnote cụ thể của người dùng.
- Thông tin và thành công role=status; cảnh báo và lỗi role=alert. Nút đóng có aria-label chứa tiêu đề. Khi đóng, focus chuyển sang Hiện lại thông báo; khi hiện lại, focus tới nút đóng. Phần focus này đã viết trong source, chưa được thử trên browser.
- Giữ liên kết `#basic-modals` của mẫu thành công. Thử lại kết nối chỉ cập nhật bộ nhớ, báo kết quả và chặn bấm lặp trong phiên demo; không gọi máy chủ.
- BasicDesigns.jsx chuyển nhánh alerts sang component mới. Bỏ CSS bc-alert cũ, thay bằng class am-inline-alert riêng.
- Catalog mô tả và behavior mới cho cả bốn mẫu tự đồng bộ prompt tại mục 07 và bộ chọn mục 00. Có code React/CSS sao chép ở cuối mục 07, lấy trực tiếp từ source.

## Kiểm tra đã chạy

- Build riêng `scripts/build-ui-guidelines.mjs`: đạt. Không chạy Vite build mặc định.
- ESLint AlertsDemo.jsx, BasicDesigns.jsx, UIGuidelines.jsx: đạt.
- Script `.demo-check/check-left-icon-alerts.mjs`: render tĩnh đủ bốn mẫu, role đúng, SVG 22px, tên nút đóng, liên kết thành công, nút retry, nội dung dài và prompt anchor đúng.
- Tính từ token: icon trắng trên vùng semantic đạt 5.80 tới 6.70:1; title trên nền semantic nhạt đạt 5.25 tới 6.16:1; body đạt hơn 11:1. Đây là tính màu token, chưa đo computed styles live.
- Server render phát cảnh báo useLayoutEffect không chạy phía server. App là React client; script không kiểm chứng hiệu ứng focus.
- Installer kiểm tra hash/target, sao lưu và đọc lại assets thành công. Backup: `deliverables/ui-guidelines/backups/install-1792729507919`.

## Chưa xác minh

Ảnh trước/sau; layout desktop/mobile 390px trên browser; đóng/hiện lại và focus bằng bàn phím; link, retry và prompt clipboard trên bản live; computed contrast; trình đọc màn hình. CSS responsive và handler đã có nhưng không được dùng để thay thế bằng chứng kiểm thử giao diện.
