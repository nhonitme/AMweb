# SweetAlert: rà soát layout ngày 23/10/2026

## Phạm vi và kết luận kiểm chứng

Chỉ nhóm 07.22, 9 mẫu, popup/toast, source mẫu và trình tạo prompt liên quan. Giữ Inter, token AMnote, primary xanh, semantic colors, radius và anchor. Không thay API, dữ liệu thật, phân quyền hoặc các nhóm còn lại.

Chưa thể chứng nhận khớp trực quan 100%. Công cụ trình duyệt trả `Local browser use is disabled in Work settings` trước khi sửa. Sau khi người dùng báo đã bật, đã thử lại và reset kết nối, công cụ vẫn trả cùng lỗi. Không có ảnh trước/sau mới trong đợt này. Không thay thế ảnh thật bằng bản dựng giả.

Nguồn tham khảo đã đọc qua công cụ web: https://themes.kopyov.com/limitless/demo/template/html/layout_1/full/extra_sweetalert.html. Nội dung tham khảo tổ chức ví dụ theo loại thông báo, ví dụ cơ bản, input, vị trí, toast và callback, mỗi ví dụ có nút Launch. Chưa quan sát trực quan bản tham khảo trong browser ở đợt này. Phạm vi AMnote vẫn là 9 mẫu đã được yêu cầu, không sao chép toàn bộ danh sách ví dụ của Limitless.

## Nguyên nhân tìm thấy trong source

1. SweetAlert dùng cùng `.bc-variants` với mẫu thành phần tổng quát: grid hai cột align-items:stretch. `.bc-example` là flex column, header min-height:85px, canvas flex:1. Khi code mở ở một card, hàng grid cao theo card đó và đẩy khoảng trắng vào canvas của card cạnh.
2. Chín preview đều lặp một khối phiếu thu, đối tượng, số tiền và ghi chú; hình thức chưa giúp nhận biết từng loại thông báo. Kết quả chưa thao tác vẫn chiếm min-height:40px.
3. Mỗi card có header, vùng demo, details code và footer riêng với nút prompt dài. Thông tin bị chia thành nhiều tầng cho một thao tác thử đơn giản.
4. Nút đóng thay width/height nhưng vẫn nhận margin-bottom âm theo em từ SweetAlert2. Font nút bị chuẩn hóa bởi typography Guidelines; giữ margin âm không còn tương xứng với hit area.
5. Icon dùng zoom thay vì kích thước theo font, khó kiểm soát nhất quán với icon toast.

Đây là kết luận cấu trúc/CSS. Chưa có phép đo kích thước live mới.

## Thay đổi

- `SweetAlertDemo.jsx`: thêm SweetAlertSamples và hàng mẫu riêng, chia 5 loại thông báo / 2 xác nhận và nhập liệu / 2 tự đóng và toast. Phosphor hiện có cung cấp icon semantic, kết hợp tên và mô tả bằng chữ.
- Hàng gồm tên/mô tả và Thử mẫu, Mã nguồn, Prompt; code mở dưới hàng, không có card bên cạnh bị kéo cao. Không lặp phiếu thu 9 lần; ngữ cảnh mẫu đặt một lần ở đầu nhóm.
- Preview trong builder vẫn dùng SweetAlertDemo, có tiêu đề tùy chỉnh, giữ handler gốc. Kết quả chỉ hiện sau tương tác.
- Code sao chép cho cả 9 mẫu là React component đầy đủ, có useState/useRef, xử lý confirmed/cancel/timer/close và thông báo kết quả trong bộ nhớ.
- `BasicComponents.jsx`: rẽ nhánh layout riêng cho id sweetalert; cấu trúc render các nhóm khác giữ nguyên. Shared catalog vẫn cung cấp 9 prompt và mục 00.
- `basic-components.css`: class bc-sweet riêng, không sửa grid/card chung. Dưới 1200px nhóm nút xuống hàng; dưới 768px spacing gọn và code chiếm cả chiều ngang, dùng minmax(0,1fr), wrap nội dung/code.
- `sweetalert.css`: nút đóng modal absolute 8px, bỏ margin âm; toast giữ close trong grid riêng. Icon modal dùng font-size:12px thay zoom, toast 13px. Các quy tắc focus, reduced motion, token và input giữ lại.

## Kiểm tra thực tế đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Build riêng Guidelines | Đạt |
| ESLint SweetAlertDemo, BasicComponents, UIGuidelines | Đạt |
| Server render cấu trúc 9 hàng / 3 nhóm / 9 vùng code | Đạt |
| 9 anchor sweetalert-1 đến sweetalert-9 | Đạt |
| 9 prompt trỏ đúng mẫu | Đạt |
| Parse JSX của cả 9 code snippet | Đạt |
| Input trống, khoảng trắng, 4 ký tự, 201 ký tự bị từ chối | Đạt ở mức hàm validation |
| 5 ký tự, nội dung trim, 200 ký tự hợp lệ | Đạt ở mức hàm validation |
| Xác nhận xóa có Hủy và focusCancel | Đạt ở mức cấu hình |
| Toast không truyền allowOutsideClick/returnFocus/heightAuto | Đạt ở mức adapter với mock engine |
| Hai mẫu timer có 8000ms và progress bar | Đạt ở mức cấu hình |
| CSS có breakpoint riêng, không còn zoom | Đạt ở mức source |
| Install local kiểm tra target/hash, backup và đọc lại assets | Đạt |

Script kiểm tra: `.demo-check/check-sweetalert-refinement.mjs`. Mock chỉ thay engine SweetAlert để kiểm tra cấu hình, không mô phỏng browser/focus hoặc đo layout.

Backup trước cài: `deliverables/ui-guidelines/backups/install-1792727992850`. Đã cập nhật `../api/wwwroot2` bằng pipeline riêng. Không dùng Vite build mặc định.

## Còn phải kiểm tra bằng trình duyệt

- 1440, 1024, 768, 390px: ảnh, cuộn ngang, hàng dài, mở code/prompt, vị trí popup và toast.
- Mở đủ 9 mẫu sau chỉnh CSS; trạng thái trong/sau animation, Tab/Shift+Tab/Enter/Escape và trả focus.
- Input rỗng/khoảng trắng/hợp lệ qua UI; Cancel và Confirm khác nhau.
- Timer tự đóng, pause hover/focus, toast không cướp focus.
- Console không có cảnh báo toast và đối chiếu các nhóm khác để phát hiện hồi quy.
- Đo tương phản, chiều cao control, screenshot trước/sau và xem lại cùng trang Limitless.

Các kiểm tra browser ở tài liệu SweetAlert trước đó là lịch sử, không thay thế kiểm chứng bản layout mới.
