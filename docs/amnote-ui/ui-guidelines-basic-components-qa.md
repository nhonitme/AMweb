# Kiểm tra sau nâng cấp mục 07 · 23/10/2026

## Bổ sung kiểm tra typography Inter

Theo yêu cầu tiếp theo, đã thống nhất Inter trên toàn trang Guidelines và overlay của trang bằng `guidelines-typography.css`. Đã đo trên bản LAN sau khi cài: không còn phần tử chứa chữ trực tiếp nào trong `.ug-page` có font-family ngoài Inter (bỏ qua icon/SVG); mọi button và liên kết kiểu button có font-size 13px. Button weight 500, line-height 20px. Đã kiểm tra menu portal, popup, title và input của popup đều Inter. Không tràn ngang ở viewport kiểm tra. CSS Noto Sans cũ trên label checkbox/phân trang đã được ghi đè trong đúng scope. Không đổi font icon, không đổi API hoặc trang nghiệp vụ khác. Build và kiểm tra JSX/MJS đạt; backup bản typography cuối: `deliverables/ui-guidelines/backups/install-1792726589314`.

## Môi trường và phạm vi

Kiểm tra trên bản tích hợp đang chạy: `http://192.168.1.49:8081/demo/v3/ui-guidelines`, sau khi người dùng đăng nhập lại. Desktop viewport **1280 × 720**, thêm kiểm tra ở **551 × 672**. Mobile responsive dùng iframe cùng nguồn với viewport **390 × 844**, tải đúng bản tích hợp và cùng cơ chế xác thực; không giả token, không bỏ qua auth. Trang HTML đo responsive tạm được xóa khỏi webroot sau khi kiểm tra.

Đọc source/catalog đủ 21 nhóm. DOM có 21 article và 67 thẻ/anchor mẫu con. Các kiểm tra tương tác dưới đây dùng mẫu đại diện của nhóm; không khẳng định đã kiểm toán mọi tổ hợp trạng thái, mọi trình duyệt hoặc thiết bị cảm ứng thật.

## Kết quả

| Nội dung | Kiểm tra thực tế | Kết quả |
| --- | --- | --- |
| Layout | Desktop 1280px; mobile 390px, một cột | Không tràn ngang. Mobile: page clientWidth=360, scrollWidth=360, cột thẻ=328px (phần còn lại là padding/scrollbar của ứng dụng). |
| Danh mục | 21 nhóm, 67 thẻ/anchor | Đủ, không trùng ID. |
| Menu hiện hành | Đi tới Popovers/Modals, đọc aria-current | Đúng nhóm đang xem. |
| Tìm kiếm | Từ khóa không có kết quả; sau đó chọn nhóm từ sidebar | Có empty state, sidebar tự xóa bộ lọc để tới nhóm. |
| Accordion | Mở Thông tin rồi Thanh toán | Mẫu một mục mở đóng mục trước. |
| Alerts/Breadcrumbs | Đọc DOM sau render, thử Thử lại kết nối | Không còn text node 0 thừa; nút báo kết quả minh họa. |
| Carousel | Chuyển slide sau | Tiêu đề đổi sang Kiểm tra trước khi ghi sổ. |
| Collapsible | Mở vùng ngân hàng độc lập | Nội dung hiện đúng, có aria-expanded/controls. |
| Dropdown | Mở tác vụ nguy hiểm, End và Enter bằng bàn phím | Hiện xác nhận xóa; có thể Hủy. Không xóa dữ liệu nghiệp vụ. |
| List group | Checkbox Phiếu thu trong mẫu chọn nhiều | Tổng chọn đổi sang 1; mục thiếu quyền disabled. |
| Modal | Form dài, Hoàn tất khi tên rỗng | Báo lỗi, focus về trường tên, body cuộn độc lập; Escape đóng. |
| Modal mobile | Mở dialog trong viewport 390px | Khung vừa chiều rộng, bố cục không tràn. |
| Offcanvas | Panel trái: đổi trạng thái rồi Đặt lại | Trở về all, focus vẫn ở nút Đặt lại bên trong dialog; Tab tiếp tục ở trong panel; Escape đóng. |
| Pagination | Chọn trang 26 | Hiện PT000126–PT000128, phạm vi 126–128 / 128; biên trang đúng. |
| Pills | Chọn Chờ duyệt | Vùng kết quả đổi sang 8 chứng từ. |
| Placeholder | Bảng: Mô phỏng tải xong | aria-busy=false, xuất hiện dữ liệu. |
| Popover | Mở ở viewport 551px | Panel neo vào trigger với gap 10px; panel nằm trong viewport (left=8, width=300), không ở giữa màn hình mặc định. |
| Progress | Stepper Tiếp tục | Bước 1 complete, bước 2 current/aria-current=step, bước 3 pending. |
| Scrollspy | Chọn Ghi chú trong mẫu dọc | Container cuộn, aria-current=location đúng mục. |
| Tabs | ArrowRight trong mẫu icon/badge | Chuyển sang Chi tiết, aria-selected=true; tab thiếu quyền disabled. |
| Toast | Tạo stack ba toast, focus nút đóng | Có ba toast nổi; khi focus có trạng thái Đã tạm dừng tự ẩn và vẫn còn sau hơn 8 giây. |
| Tooltip | Focus bằng bàn phím, Escape | Hiện tooltip nhiều dòng ở top layer; Escape đóng (số tooltip mở về 0). |
| Prompt từng mẫu | Chọn Popovers/Có tác vụ, nhập nhãn dài, target và hướng left; sao chép | Prompt đúng mẫu popovers-4, đúng nhãn/target/hướng; sao chép báo thành công. |
| Prompt mục 00 | Chọn Cơ bản · Popovers · Có tác vụ | Có 67 lựa chọn cơ bản, liên kết #popovers-4. |
| Console | Đọc error/warn trên tab desktop sau kiểm tra | Không ghi nhận lỗi/cảnh báo. |

## Kiểm tra source và build

- `.demo-check/test-basic-catalog.mjs`: pass 21 nhóm, 67 ID duy nhất; mọi prompt bảo toàn mẫu được chọn, anchor, target, nhãn và yêu cầu thêm; không có undefined.
- `.demo-check/lint-basic-components.mjs`: 5 file JSX/MJS, 0 lỗi/0 cảnh báo (kiểm tra cú pháp và React hooks). ESLint mặc định dự án chỉ cấu hình TS/TSX nên dùng cấu hình JSX/MJS riêng.
- Build Guidelines riêng thành công. Cài local bằng script có kiểm tra hash, backup, xác minh sau ghi. Bản sửa cuối có backup `deliverables/ui-guidelines/backups/install-1792724175837`.
- Sửa lỗi focus phát hiện trong thử nghiệm: bỏ remount form khi reset, dùng native form.reset để giữ phần tử đang focus. Đã kiểm tra lại selected=all, focusInside=true.
- Không ghi/xóa dữ liệu nghiệp vụ; không đổi API, quyền hoặc auth.

## Ảnh bàn giao

- [Desktop](../deliverables/ui-guidelines/basic-components-redesign-desktop.png)
- [Mobile 390px](../deliverables/ui-guidelines/basic-components-redesign-mobile.png)

Giới hạn: chưa kiểm tra thiết bị iOS/Android thật hoặc mọi trình duyệt; các mẫu Popover và Accordion nhiều/độc quyền yêu cầu trình duyệt hiện đại. Đây không phải chứng nhận WCAG toàn bộ ứng dụng.
