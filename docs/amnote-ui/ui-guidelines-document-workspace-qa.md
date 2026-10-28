# Layout bảng chính–chi tiết · 22/10/2026

Trang đích: `/demo/v3/ui-guidelines#table`. Source: `src/pages/UIGuidelines/ReceiptTableDemo.jsx`; layout riêng `src/components/amnote/ui/document-workspace.css`. Không sửa API hay thêm dữ liệu nghiệp vụ.

## Đối chiếu

Sale-order đã được quan sát trong các lượt trước: bảng chính trên có phân trang, vùng ngăn giữa hai bảng, phần dưới chứa nội dung chi tiết theo dòng; có splitter và tab nghiệp vụ sản xuất. Trang quan sát có nhãn **Bản local**, không coi đó là bản production gốc. Lượt này browser báo **Local browser use is disabled in Work settings** nên chưa xem lại trạng thái hiện tại của hai URL. Không tuyên bố khớp trực quan.

## Đã triển khai

- Workspace desktop cao `clamp(600px,76dvh,780px)`, mobile 700px. Toolbar cố định trong workspace; master flex còn lại, detail cao 210px. Guidelines vẫn cuộn trang bình thường, không biến tài liệu thành ứng dụng fullscreen.
- Hai vùng bảng cuộn ngang/dọc độc lập; header cột sticky. Cột ghim giữ offset cấu hình và header ghim nằm trên header thường.
- Tổng kết quả lọc và phân trang master nằm ngoài vùng cuộn. Detail có heading/mã chứng từ và tổng hạch toán ngoài vùng cuộn. Số tiền căn phải, số tabular; nội dung dài ellipsis có title, xem đầy đủ qua menu sẵn có.
- Dòng đang xem có vạch primary và số chứng từ đậm/gạch chân, `aria-current`; checkbox/`aria-selected` giữ selection hàng loạt riêng. Ban đầu xem chứng từ đầu danh sách hiển thị (127); đổi checkbox không đổi chi tiết.
- Không thêm splitter hoặc tab không có nội dung. Một vùng hạch toán dùng heading. Phân vùng bằng đường ngăn nhẹ, không có tay nắm giả.
- Toolbar một hàng, nhóm lọc trái và tác vụ phải, menu overflow và panel cài đặt cột giữ nguyên. Bộ thử, hướng dẫn, quy tắc và code ở ngoài workspace.
- Loading/rỗng/lỗi tiếp tục dùng state cũ; chi tiết có thông báo phù hợp khi chưa có dữ liệu. Dùng source token/control hiện có, không thêm thư viện.

## Kiểm tra

- Build riêng Guidelines và lint JSX liên quan.
- `scripts/check-document-workspace.mjs`: render tĩnh kiểm tra hai vùng cuộn, thứ tự master/phân trang/detail, một dòng active độc lập năm checkbox chưa chọn, tổng kết quả lọc 232.862.500 và chi tiết 12.840.000, không có tab giả, lớp header ghim. SSR cảnh báo hook layout không chạy trên server là giới hạn của phép render, không được xem là kiểm thử ResizeObserver.
- `scripts/check-column-settings.mjs`: giữ kiểm tra cách ly nháp, cột bắt buộc, tên/rộng hợp lệ, tìm kiếm, reorder và offset ghim.
- Cài bằng script riêng có kiểm tra hash/webroot `../api/wwwroot2` và backup trước ghi; đối chiếu JS/CSS đang phục vụ với bản build.

**Chưa xác minh trực tiếp:** desktop/tablet/mobile, nội dung dài sau đổi rộng, sticky khi cuộn, menu/focus/bàn phím, responsive và chuyển trạng thái trên runtime mới. Chưa thử touch hoặc screen reader. CSS và kiểm tra tĩnh không thay thế kiểm thử trình duyệt. Không tự bật browser hoặc dùng ảnh cũ làm bằng chứng bản layout mới.
