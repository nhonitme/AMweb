# Dashboard 06 — Tổng quan kế toán

Mở `/demo/v3/ui-guidelines#dashboard`, chọn **Mở trang dashboard mẫu**, hoặc mở trực tiếp `/demo/v3/ui-guidelines/dashboard`.

## Bố cục tham chiếu

Cập nhật ngày 23/10/2026 theo `http://127.0.0.1:4185/v1/`, đã xem trực tiếp trong trình duyệt.

- Tiêu đề Tổng quan kế toán, bộ lọc gọn bên trái, nhóm làm mới / xuất CSV / tùy chỉnh bên phải.
- Ba KPI doanh thu, chi phí, lợi nhuận: cao tối thiểu 168px; gap 12px. Công nợ chuyển xuống widget, vẫn xem được chi tiết.
- Sáu widget mặc định, hai cột bằng nhau: doanh thu & chi phí; tiền & ngân hàng; công nợ; hóa đơn; tồn kho; công việc cần xử lý. Khung tối thiểu 388px, gap 12px, padding ngang 20px.
- Dưới 768px chuyển KPI và widget về một cột; bảng cuộn ngang trong vùng riêng.
- Đường lợi nhuận và donut cơ cấu chi phí vẫn có trong Tùy chỉnh. Chọn/ẩn/đổi thứ tự bằng checkbox và nút lên/xuống; Hủy không áp dụng, tải lại khôi phục mặc định.
- Bộ thử trạng thái đặt dưới lưới widget, trong phần mở rộng, tránh đẩy KPI xuống. Chọn lỗi từng phần tự bật widget cơ cấu chi phí để thấy và thử lại lỗi.

Theo yêu cầu cuối: chỉ lấy main content của `/v1/`, không sidebar/header ứng dụng. Liên kết về Guidelines đặt dưới lưới widget. Giữ primary xanh, font/control và token AMnote hiện có; không lấy bảng màu đỏ hoặc font riêng của mẫu. Ba KPI cao 168px, widget 388px, gap 12px. Đơn vị và Thời gian dùng control chung với label phía trên. Kỳ Tùy chọn mở form ngày có Áp dụng/Xóa lọc; chọn chi nhánh hoặc kỳ định sẵn cập nhật ngay. Không coi đây là bản sao dữ liệu hoặc khung điều hướng của `/v1/`.

## Dữ liệu và thao tác

Giữ fixture năm 2026 trong bộ nhớ, không gọi API hoặc thay dashboard nghiệp vụ. Khoảng ngày/chi nhánh có Áp dụng và Xóa lọc. KPI, biểu đồ, công nợ, công việc và CSV nhận cùng phạm vi. Kỳ so sánh là khoảng liền trước có cùng số ngày. Chi phí/phải thu giảm là tốt; kỳ trước bằng 0 không chia vô hạn; thiếu dữ liệu hiển thị “—”.

Phải thu là giao dịch doanh thu chưa thanh toán; phải trả là giao dịch chi phí chưa thanh toán. Công việc hiển thị số giao dịch chưa thanh toán của fixture. Tiền, hóa đơn và tồn kho không có nguồn trong fixture, nên hiển thị empty kèm giải thích, không tạo số liệu.

Bấm nút mũi tên của KPI hoặc mã giao dịch để xem popup. Bảng có tìm kiếm, sort, phân trang, tổng theo kết quả tìm. Xuất CSV lấy toàn bộ giao dịch theo bộ lọc, không giới hạn trang hoặc từ khóa bảng; có BOM và escape dấu nháy. Biểu đồ có bảng số liệu thay thế.

Thử trạng thái loading, empty, error, partial và denied trong phần **Thử trạng thái dữ liệu**. Làm mới/thử lại mô phỏng 650ms, giữ số liệu cũ khi cập nhật, không ghi dữ liệu nghiệp vụ. Prompt và source được cập nhật trong riêng mục 06.

## Source và preview

- Trang và CSS: `src/pages/UIGuidelines/DashboardExample.jsx`, `dashboard-example.css`, `dashboard-reference.css` (chỉ main content, dùng token chung).
- Fixture/bộ lọc/kỳ so sánh/CSV: `dashboard-model.mjs`, giữ nguyên.
- Tái sử dụng `AMKPICard`, `AMChartPanel`, `AMWidgetState` và `AMField`, `AMButton`, `AMDialog` hiện có; CSS mới scope trong `.am-dashboard-example`.
- Build riêng bằng `scripts/build-ui-guidelines.mjs`; cài bằng `scripts/install-ui-guidelines.mjs`, có backup/hash và xác minh ghi. Target `../api/wwwroot2`. Không chạy Vite build mặc định.

## Xác minh

Đã kiểm tra trực tiếp trên Chrome đang đăng nhập tại URL LAN: popup/Escape/trả focus, lọc chi nhánh, tùy chỉnh và đổi thứ tự, canvas, loading/empty/error/partial/denied và retry.

Kiểm thử Python Playwright headless trên cùng source trong harness fixture độc lập: viewport 1440/1024/768/390, không tràn ngang trang, KPI/widget chuyển cột đúng; bộ lọc, validation/focus, CSV 24 dòng, canvas, popup/focus, trạng thái, chart tùy chọn và tìm kiếm. Harness không bỏ qua xác thực của ứng dụng và không sử dụng profile người dùng. Chạy `node scripts/build-dashboard-06-check.mjs` rồi Python `scripts/check-dashboard-06.py`; dùng Playwright đã có trong `.demo-check/python-deps` và Chrome đã cài.

Ảnh và báo cáo trong `deliverables/dashboard-06-qa/`; phân biệt ảnh live với ảnh fixture. Lint riêng các JSX thay đổi và build Guidelines thành công. Các mục Guidelines khác không đổi nội dung.
