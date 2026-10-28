# 07 · Các thành phần cơ bản

Trang: http://192.168.1.49:8081/demo/v3/ui-guidelines#basic-components

Thư viện có **21 nhóm, 67 mẫu thiết kế**. Mỗi thẻ có tên, mô tả khác biệt, bản xem trước, tương tác phù hợp và nút **Yêu cầu AI tạo mẫu này**. Các nhóm có số mẫu tùy chức năng, không ép cùng hai ví dụ cho mọi loại.

Typography thống nhất Inter theo yêu cầu cập nhật; button 13px/500/20px. `guidelines-typography.css` áp dụng cho toàn tài liệu, control, textarea, code/prompt và overlay trong phiên Guidelines. Các icon giữ font biểu tượng riêng. Font Inter variable đã được phục vụ từ shell v3, không tải thêm từ dịch vụ ngoài.

| Nhóm | Số mẫu | Nội dung |
| --- | ---: | --- |
| Accordion | 4 | Mặc định, flush, nhiều mục mở, header có metadata |
| Alerts | 4 | Info, success, warning, error có tác vụ |
| Badges | 3 | Nhãn, dot và số lượng trong danh sách |
| Breadcrumbs | 3 | Phân cấp, trang đầu, rút gọn bằng menu |
| Buttons | 3 | Thứ bậc, icon/kích thước, loading/disabled |
| Carousel | 3 | Chứng từ HTML + nội dung, thẻ tính năng, điều khiển gọn |
| Collapsible | 3 | Nút mở, trong card, hai vùng độc lập |
| Dropdown menus | 3 | Tác vụ, xuất dữ liệu, nguy hiểm có xác nhận |
| List group | 3 | Số lượng, icon/mô tả, nhiều lựa chọn |
| Media objects | 3 | Avatar, timeline, tài liệu |
| Modals | 3 | Thông tin, xác nhận, form dài có validation |
| Offcanvas | 3 | Chi tiết phải, lọc trái, nội dung dài |
| Pagination | 3 | Số trang có dấu …, compact, số dòng/trang |
| Pills | 3 | Số lượng, icon, phân đoạn |
| Placeholder | 3 | Thẻ tổng quan, danh sách, bảng |
| Popovers | 4 | Dưới, trên, phải, có tác vụ |
| Progress | 4 | Phần trăm, phân đoạn, stepper, chưa xác định |
| Scrollspy | 2 | Ngang, dọc, nội dung cuộn riêng |
| Tabs | 3 | Gạch chân, khung, icon/badge/disabled |
| Toasts | 3 | Thành công tự ẩn, lỗi giữ, stack |
| Tooltips | 4 | Trên, dưới, trái, nhiều dòng |

## Tìm và tạo yêu cầu AI

Tìm theo tên, mô tả hoặc biến thể, có hỗ trợ không dấu. Không có kết quả có thông báo và nút xóa từ khóa. Chọn menu con để thoát bộ lọc và tới đúng nhóm. Sidebar đánh dấu nhóm đang xem khi cuộn. Mỗi mẫu có anchor riêng, ví dụ `#accordion-2` hoặc `#popovers-4`.

Nút **Yêu cầu AI tạo mẫu này** mở builder của nhóm và chọn đúng mẫu. Có thể đổi mẫu, nhãn, vị trí, yêu cầu bổ sung; trạng thái disabled/loading hoặc hướng mở được cung cấp khi phù hợp. Preview đi cùng mẫu/trạng thái/hướng đang chọn. Prompt ghi rõ một mẫu con, anchor tham chiếu và các yêu cầu bảo toàn nghiệp vụ. Nếu HTTP chặn clipboard, chọn prompt để sao chép thủ công.

Mục 00 có 67 lựa chọn theo từng mẫu con và liên kết trực tiếp tới thẻ tương ứng.

## Nguồn triển khai

- `src/pages/UIGuidelines/basic-components.mjs`: catalog, metadata, tên/ID của 67 mẫu và hàm tạo prompt.
- `BasicComponents.jsx`: gallery, tìm kiếm, builder theo nhóm, Scrollspy.
- `BasicDesigns.jsx`: các mẫu, hint neo trigger, preview dialog/panel, Toast nổi.
- `basic-components.css`: bố cục và component demo với token AMnote; không chứa bộ màu/font riêng.
- `UIGuidelines.jsx`: mục 07, menu hiện hành, source/CSS/catalog có thể sao chép trực tiếp.
- `PromptGuide.jsx`: các lựa chọn dùng AI ở mục 00.

Tái sử dụng AMButton, AMChoice, AMField, AMMenu, AMDialog và AMDialogPresence. Icon dùng bộ DevExtreme hiện có. Không thêm thư viện; không thay API, dữ liệu, validation hoặc quyền của trang nghiệp vụ. Các mẫu là tài liệu tương tác trong bộ nhớ, không tự trở thành API component chung.

## Hành vi overlay và trạng thái

Popover/Tooltip dùng top layer của HTML Popover API, đo trigger khi mở và cập nhật theo scroll/resize; ưu tiên hướng đã chọn, tự lật/kẹp vào viewport. Escape đóng; Popover có nút đóng trả focus. Tooltip hỗ trợ hover/focus, nội dung không chứa điều khiển.

Toast nổi góc phải, tối đa ba mục, mới nhất ở đầu. Thành công tự ẩn sau 8 giây, pause khi hover/focus; lỗi giữ đến khi đóng. Không cướp focus. Preview trong gallery là bản minh họa tĩnh có aria-hidden, nút thử mới tạo toast thật.

Dialog/Offcanvas dùng AMDialog: focus native, Escape và footer/header riêng. Form dài kiểm tra trường bắt buộc, focus lỗi đầu; loading khóa hành động đóng/submit lặp. Panel lọc dùng reset native để giữ DOM và focus. Stepper thể hiện đã hoàn tất/hiện tại/chưa tới, không dùng thanh progress đổi nhãn để giả stepper.

Số 0 hợp lệ trong dữ liệu vẫn được giữ; đã bỏ lỗi render số 0 từ điều kiện dùng chỉ số variant.

## Build và kiểm tra

Build riêng `scripts/build-ui-guidelines.mjs`, cài local qua `scripts/install-ui-guidelines.mjs`, có kiểm tra hash, backup và xác minh sau ghi. Không chạy Vite build mặc định (outDir khác v3). Không thay auth hoặc cấu hình LAN.

Xem [kết quả kiểm tra thực tế](ui-guidelines-basic-components-qa.md). Phân loại tham khảo [Limitless](https://themes.kopyov.com/limitless/demo/template/html/layout_1/full/components_accordion.html); thiết kế riêng theo token AMnote, không sao chép CSS hoặc mã thương mại.
