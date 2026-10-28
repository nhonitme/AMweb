# SweetAlert Notifications · 23/10/2026

**Icon tĩnh theo yêu cầu mới:** adapter dùng SVG Phosphor regular sinh từ thư viện hiện có trong `sweetalert-icons.mjs`; success CheckCircle và error XCircle có cùng viewBox, width/height 56px, cùng weight regular. Toast dùng cùng SVG ở 24px. Không còn icon ghép bằng vòng/nét CSS của SweetAlert2. `animation:false`, showClass/hideClass rỗng và CSS tắt animation/transition popup, icon, nút. Thanh thời gian tự đóng giữ hoạt động. Build, lint và kiểm tra cấu hình 9 mẫu đạt; có assertion SVG cùng kích thước/viewBox và animation tắt. Chưa kiểm chứng hình ảnh mới do công cụ browser vẫn báo Local browser use bị tắt.

**Layout đã chỉnh lại:** xem [báo cáo rà soát layout](ui-guidelines-sweetalert-layout-review.md). Bản mới dùng hàng mẫu gọn chia ba nhóm; các kiểm tra browser bên dưới mô tả bản card trước thay đổi này. Đợt chỉnh layout mới chưa kiểm chứng trực quan do công cụ browser vẫn báo bị tắt, kể cả sau khi người dùng đã bật cài đặt.

Mở `/demo/v3/ui-guidelines#basic-sweetalert`, nhóm 07.22. Catalog hiện có 22 nhóm / 76 mẫu. Nguồn tham khảo: https://themes.kopyov.com/limitless/demo/template/html/layout_1/full/extra_sweetalert.html

## Thành phần

- SweetAlert2 11.26.25, dependency trong package.json/package-lock.json.
- `src/components/amnote/ui/sweetalert.mjs`: adapter `fireAMAlert(options)` với titleText/text, nút tiếng Việt, class AMButton, trả focus và timer pause khi hover/focus.
- `src/components/amnote/ui/sweetalert.css`: theme token AMnote, scoped vào container `.am-ui.am-swal-container`, popup tối đa 480px, giới hạn viewport, reduced motion và focus-visible.
- `src/pages/UIGuidelines/SweetAlertDemo.jsx`: 9 cấu hình, demo trong bộ nhớ, mã mẫu từng biến thể. Cleanup chỉ đóng popup do instance đó sở hữu; chặn mở lặp.
- `basic-components.mjs`: catalog chung cho menu, prompt và mục 00. `BasicComponents.jsx`: preview, sao chép mã và chọn prompt từng mẫu. `UIGuidelines.jsx`: source adapter, CSS và demo có thể sao chép.

## Chín mẫu

Thông báo cơ bản, thành công, lỗi, cảnh báo, thông tin, xác nhận xóa, nhập lý do có validation, tự đóng có thanh tiến trình và toast top-end.

Xóa mặc định focus Hủy, chỉ result.isConfirmed mới được nối handler xóa thật. Cancel, close, esc và timer phân biệt với xác nhận. Input dùng inputValidator trim, 5–200 ký tự, maxlength 200. Timer 8 giây có pause khi hover/focus; toast role=status, aria-live=polite, không cướp focus. Tất cả demo không gọi API hoặc ghi/xóa dữ liệu nghiệp vụ.

Không gọi popup body-mounted này trên native dialog đang showModal: native top layer sẽ che overlay. Đóng hoặc chuyển giao dialog trước; tích hợp trong modal cần adapter target/focus riêng và kiểm chứng theo màn hình thật.

## Kiểm chứng

- Build riêng `scripts/build-ui-guidelines.mjs` thành công; không chạy Vite build mặc định vì outDir khác.
- ESLint bốn JSX liên quan thành công.
- Cài local bằng installer có kiểm tra hash, manifest và backup: `deliverables/ui-guidelines/backups/install-1792727225802`.
- Browser bản LAN: menu nhóm 22 và 9 lựa chọn SweetAlert mục 00 hiện đủ. Năm trạng thái mở đúng nội dung/icon. Xóa focus Hủy, kết quả Hủy và Xác nhận khác nhau. Input trống/khoảng trắng bị chặn với aria-invalid và thông báo lỗi; lý do hợp lệ được trả về. Escape đóng và focus về nút mở sau animation.
- Clipboard mã mẫu nhập liệu đã đọc lại, có inputValidator. Prompt nhóm chọn đúng sweetalert-7, mục 00 chọn đúng sweetalert-6, giữ các quy tắc AMnote/API/quyền.
- Toast role=status không chuyển focus khỏi nút mở, có progress bar và tự đóng. Popup tự đóng cũng đã hết thời gian và báo kết quả timer.
- Fixture source riêng `.demo-check/basic-components-preview/sweet-mobile.html` kiểm tra khung iframe 390 × 844: popup xác nhận vừa khung, nội dung xuống dòng, hai nút hiện đầy đủ. Đây là preview source, không phải kiểm thử thiết bị cảm ứng thật hay phiên LAN trên điện thoại.

Chưa xác minh screen reader thật, Firefox/Safari, bàn phím ảo hoặc tích hợp handler nghiệp vụ thật. Không chạy test ghi dữ liệu.

## Kiểm tra cuối

Đã sửa cảnh báo cấu hình toast: chỉ popup modal nhận allowOutsideClick, returnFocus và heightAuto; đối chiếu danh sách toastIncompatibleParams của SweetAlert2. Build lại thành công, cập nhật local có backup `deliverables/ui-guidelines/backups/install-1792727556506`. Lần thử trình duyệt sau cập nhật bị chặn vì Local browser use đã tắt trong Work settings, nên chưa xác minh lại console sau sửa. Bản trước đã xác minh timer vẫn giữ popup sau hơn 8 giây khi focus nằm ở nút Đóng, tức pause theo focus hoạt động.
