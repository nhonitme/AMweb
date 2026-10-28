# Kết quả kiểm tra UI Guidelines — 21/10/2026

Trang thật: http://127.0.0.1:8081/demo/v3/ui-guidelines

## Kết quả đã xác minh

| Kiểm tra | Kết quả |
| --- | --- |
| Truy cập trực tiếp, reload | Đúng route, render đủ sáu nhóm; không chuyển về Công ty |
| Điều hướng từ ứng dụng | Trợ giúp & hỗ trợ → AMnote UI Guidelines mở đúng URL |
| Validation trống | Hiện lỗi mã/tên; focus về trường lỗi đầu tiên |
| Validation trùng mã | DM001 bị từ chối với thông báo mã đã tồn tại |
| Validation số tiền âm | -1 bị từ chối; giá trị 0 được thêm/sửa và hiển thị đúng |
| Thêm mẫu | QA008 được thêm vào state; tổng số tăng 7 → 8, tìm kiếm thấy bản ghi |
| Sửa mẫu | Tên bản ghi QA008 đổi thành “Đối tượng đã sửa” trong bảng |
| Loading | Nút Lưu, Hủy, Đóng disabled trong lúc lưu; không gửi lặp |
| Lỗi lưu mô phỏng | Thông báo lỗi ngay trong popup; dữ liệu không bị ghi; có thể thử lại |
| Xóa | Mở xác nhận, xác nhận xóa mẫu; tìm kiếm bản ghi đã xóa trả empty |
| Khôi phục | Khôi phục bộ 7 dòng gốc và bỏ chọn/search |
| Chọn dòng | Chọn tất cả trang hiện tại cho “Đã chọn 5”; search/refresh ẩn; bỏ chọn phục hồi toolbar |
| Phân trang | Trang 2 có DM006/DM007; quay lại trang 1 đúng |
| Sort số tiền | Tăng dần: 0, 8.640.000, 15.840.000, 18.500.000, 37.000.000 |
| Cảnh báo chưa lưu | Nhập mã rồi Hủy mở “Bỏ thay đổi chưa lưu?”; Bỏ thay đổi đóng cả hai popup |
| Menu | Menu mở ngoài khung cuộn, nằm trong viewport; Escape đóng và focus về trigger |
| Focus dialog | Mở focus nút Đóng; đóng trả focus về nút Thêm mới; không còn dialog mở |
| Clipboard | Code được sao chép; đọc clipboard xác nhận bắt đầu bằng import AMButton đúng source |
| Kích thước | Header 36px; 5 hàng đều 28px; 5 control popup đều 32px; popup 640px |
| Màu/border | Primary cập nhật rgb(37,99,235); viền input rgb(211,213,216); không viền kép |
| Tương phản chính | Trắng/primary 5,17:1; trắng/danger 5,80:1; trắng/text phụ 4,76:1 |
| Desktop | Viewport 1280×720; nội dung rộng 1265px bằng vùng chứa, không tràn ngang toàn trang; sidebar giữ vị trí khi cuộn |
| Màn hình hẹp | Ứng dụng thật trong iframe 390×844: mục lục cuộn ngang, toolbar wrap, form một cột, bảng cuộn trong khung |
| Console bản mới | Tab kiểm tra mới không có lỗi JavaScript; cảnh báo license DevExtreme vốn có thuộc ứng dụng gốc |
| Build riêng | Thành công; bundle router cũng parse thành công; không chạy build mặc định vào webroot khác |
| Lint | ESLint source JSX mới: đạt, exit 0 |
| TypeScript | Consumer TSX kiểm tra props/import của kit và page: đạt, exit 0 |
| Source integration | App.tsx và Header.tsx parse TSX thành công |

## Ảnh kiểm chứng

- `.demo-check/ui-guidelines-desktop.png`: bảng mẫu và mục lục trên desktop.
- `.demo-check/ui-guidelines-popup.png`: popup validation trên bản cuối.
- `.demo-check/ui-guidelines-narrow.png`: form trên viewport iframe 390px.

## Giới hạn

- Tham chiếu được trình duyệt trả về bản có nhãn “Bản local”; đã mở form thêm và sửa, menu, xác nhận xóa rồi hủy. Không kiểm chứng production gốc.
- Chưa đo toàn bộ màu/font/khoảng cách trên tham chiếu; token tạm và khác biệt được công bố trên trang.
- Responsive là iframe với viewport thật, không phải thiết bị cảm ứng vật lý. Chưa kiểm tra screen reader thật hoặc toàn bộ trình duyệt.
- Đã kiểm tra menu được kẹp trong viewport; chưa tự động kiểm tra mọi vị trí sát mép và mọi dropdown hệ điều hành.
- Chưa chứng nhận toàn bộ WCAG. Đã kiểm tra các cặp màu chính, focus và luồng bàn phím nêu trên.
- Không chạy toàn bộ test/build ứng dụng; source workspace không hoàn toàn trùng bản framework đang phục vụ. Chỉ kiểm tra phần thay đổi và tích hợp hiện tại.
- Không lưu/sửa/xóa dữ liệu nghiệp vụ; mọi thao tác ghi được thử trên state của demo.

## Đối chiếu input cập nhật

Đã đo lại trực tiếp form thêm mới sale-order rồi hủy. Text, number, date, select và lookup trên Guidelines có border 1px rgb(211,213,216), chữ rgb(36,42,49), padding 5px 10px, radius 8px, cao 32px, font 13px Inter/Arial. Label đo lại: weight 400, rgb(21,25,31), gap 7px. Textarea 13px monospace, cao 68px. Focus chuột và chuyển Tab đều hiện viền primary rgb(37,99,235), không outline/ring phụ; hover không ghi đè focus. Build riêng và cài đặt có sao lưu hoàn tất.

## Trình tạo prompt mẫu

Build riêng và ESLint đạt. Đã thử đổi từ nút Thêm mới sang Lưu, nhập vị trí footer popup; prompt cập nhật handler/validation/loading đúng loại. Đổi sang input số tiền, đặt nhãn Giá bán, vị trí popup thêm sản phẩm và yêu cầu bổ sung; preview type=number, min=0, value=0. Đã đọc clipboard và đối chiếu: toàn bộ nội dung sao chép khớp prompt hiển thị. Ảnh: .demo-check/ui-guidelines-prompts.png. Preview chỉ thao tác state, không gọi API ghi.
