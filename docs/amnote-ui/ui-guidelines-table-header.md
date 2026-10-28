# Header bảng chứng từ · 23/10/2026

Trang đích: http://192.168.1.49:8081/demo/v3/ui-guidelines#table

## Nguồn đối chiếu và giới hạn

Người dùng yêu cầu đối chiếu https://app.amnote.com.vn/demo/xanh/production/sale-order. Công cụ browser vẫn báo Local browser use bị tắt; công cụ web cũng không truy cập được URL. Chưa quan sát lại menu header Sale-order, chưa có ảnh trước/sau mới, không khẳng định danh sách/thứ tự/icon menu dưới đây khớp production. Menu được triển khai dựa trên khả năng thực tế và phạm vi người dùng yêu cầu, không mô tả là bản sao menu đã quan sát.

## Nguyên nhân trong source trước sửa

- ReceiptTableDemo.jsx đã có columnSettings.pinned và displayedColumns tính sticky offsets, nhưng header không render biểu tượng ghim.
- Sort trước đây chỉ thêm ký tự ↑/↓ cho cột hiện hành, cột khác không có dấu hiệu sort. Không có thao tác bỏ sort.
- Header dữ liệu chưa có onContextMenu hoặc nút menu tương đương. Không phải chỉ do icon bị CSS ẩn.
- Header th có overflow:hidden để ellipsis; menu đặt trực tiếp bên trong dễ bị cắt, vì vậy dùng portal vào body.

## Thay đổi

- AMTableColumnHeader.jsx: tên cột ellipsis, slot sort 14px, PushPin fill 14px khi ghim và nút ba chấm mở menu. Icon static Phosphor hiện có; không thêm package hoặc animation.
- Cột đang sort luôn hiện ArrowUp/ArrowDown; chưa sort có ArrowsDownUp khi hover/focus, giữ slot để không nhảy kích thước. Touch hiển thị nút menu và dấu sort thường trực. aria-sort cập nhật ascending/descending/none.
- Bấm tên cột chuyển tăng → giảm → bỏ sort. Bấm icon bỏ ghim hoặc nút menu không gọi sort vì các button là phần tử cùng cấp, không lồng trong trigger sort.
- Menu mở bằng chuột phải trên th, nút ba chấm, Shift+F10 hoặc phím ContextMenu. Menu portal có id nối aria-controls, role menu/menuitem/menuitemradio và selected sort state.
- Danh sách: Sắp xếp tăng dần, Sắp xếp giảm dần, Bỏ sắp xếp, Ghim cột bên trái/Bỏ ghim cột, Ẩn cột, Cài đặt cột. Bỏ sort bị khóa khi cột không phải cột hiện hành; Ẩn khóa với cột code bắt buộc.
- Menu kẹp viewport, max-height theo viewport và cuộn nội bộ; dùng cùng layer z-index 2000 với AMMenu hiện có. Có handler mũi tên/Home/End, Escape/Tab, click ngoài, scroll/resize. Escape/Tab và scroll/resize trả focus về trigger; click ngoài không cướp focus khỏi nơi người dùng vừa bấm.
- Khi ẩn cột, nếu trigger bị unmount thì trả focus về vùng bảng. Khi mở panel, focus về header trước khi panel tiếp quản, để Đóng panel có điểm trả focus đúng.
- Ghim/bỏ ghim/ẩn dùng chung columnSettings với panel. displayedColumns tiếp tục tính offset từ 40px checkbox và tổng độ rộng các cột ghim trước đó. Checkbox ghim trái, actions ghim phải, logic body/sticky giữ nguyên.
- sortDocumentRows xử lý số tiền theo số, ngày ISO theo thứ tự ngày và text locale vi/numeric, trước phân trang. Bỏ sort trả thứ tự dữ liệu gốc trong bộ lọc. Sort đổi đưa về trang 1, không xóa selection.
- Ẩn cột đang sort từ menu hoặc áp dụng panel sẽ bỏ sort. Khôi phục mẫu chứng từ đặt lại sort ngày giảm dần.
- Mục 05 có source header, model và CSS sao chép. Mục 00 thêm recipe Bảng · Header, ghim và menu cột, kèm giới hạn đối chiếu Sale-order.

## Source

- `src/components/amnote/ui/AMTableColumnHeader.jsx`
- `src/components/amnote/ui/table-header-model.mjs`
- `src/components/amnote/ui/table-header.css`
- `src/pages/UIGuidelines/ReceiptTableDemo.jsx`
- `src/pages/UIGuidelines/UIGuidelines.jsx`
- `src/pages/UIGuidelines/PromptGuide.jsx`

Không đổi token header, font Inter, height 36px, row density, toolbar, master/detail, API hoặc quyền. CSS chỉ scope header bảng chính chứng từ và body portal của menu.

## Kiểm tra đã chạy

`.demo-check/check-table-header.mjs` đã đạt:

- Chu kỳ sort tăng/giảm/bỏ và chuyển cột.
- Sort số tiền (gồm 0) và ngày ở hai hướng, trước cắt trang; dữ liệu đầu vào không bị mutate; bỏ sort trả thứ tự cũ.
- Hai cột ghim có offset đúng khi đổi width, đổi thứ tự và ẩn một cột.
- Cột bắt buộc không thể ẩn, mô hình cột vẫn hợp lệ.
- Trạng thái menu disabled/checked phù hợp với model.
- Hàm kẹp menu nằm trong viewport 390, 768, 1024 và 1440px, ở góc đầu/cuối màn hình. Đây là kiểm thử toán học, không đo browser.
- Render tĩnh header pinned/sorted có aria-sort, tên nút bỏ ghim, menu trigger và slot icon hiện hành.

ESLint bốn JSX liên quan và build riêng Guidelines đạt. Installer xác minh target/hash, sao lưu và đọc lại assets thành công: `deliverables/ui-guidelines/backups/install-1792737940739`. Không chạy Vite build mặc định.

## Chưa kiểm chứng trực tiếp

Ảnh và so sánh Sale-order; menu/hover/focus/sort click thật; thao tác chuột phải, keyboard, đóng menu và trả focus; clipping/z-index/scroll/width trên browser; clipboard; tablet/mobile 390px; screen reader. Code có các handler này nhưng không dùng kiểm tra source hoặc model để khẳng định tương tác browser đã đạt.
