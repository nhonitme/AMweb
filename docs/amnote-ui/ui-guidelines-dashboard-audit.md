# Rà soát Guidelines cho dashboard AMnote

Ngày: 21/10/2026. Phạm vi: mã nguồn Guidelines, bộ component AMnote và dashboard hiện có. Đây là rà soát source; chưa xác nhận trực quan bản đang phục vụ hoặc tương tác trình duyệt trong lần rà soát này. Source workspace và bundle đang phục vụ có thể khác nhau.

## Kết luận

Guidelines hiện đủ nền tảng cho màn hình danh mục/chứng từ, nhưng chưa đủ để hướng dẫn dựng dashboard nhất quán. Không cần xây lại dashboard từ đầu: nhiều hành vi đã có trong `DashboardOverview.tsx`; cần đưa chúng thành mẫu, quy tắc và component dùng chung.

Giữ primary xanh dương theo sidebar và phong cách AMnote đã thống nhất. Màu biểu đồ phân biệt chuỗi dữ liệu; màu trạng thái thể hiện ý nghĩa. Không dùng primary để thay tất cả màu cảnh báo/lỗi.

## Đã có

- Guidelines: token ba lớp, button, input, choice, toolbar/bảng, popup thường và toàn màn hình, demo CRUD, prompt cho control và popup.
- Dashboard nguồn: bộ lọc kỳ, KPI, Chart.js, bảng số liệu thay thế cho một số biểu đồ, xuất báo cáo, làm mới, thêm/xóa/đổi thứ tự/đổi độ rộng widget và lưu bố cục.
- Tải dữ liệu: hủy request, giữ `null` khi thiếu số liệu, lỗi riêng từng nguồn qua `Promise.allSettled`. Có trình bày loading/empty/error cục bộ.
- Có responsive và hỗ trợ bàn phím ở một số thao tác widget. Cần kiểm chứng và tài liệu hóa thành tiêu chuẩn, không xem như chưa triển khai.

## Phần còn thiếu trong Guidelines

| Ưu tiên | Nhóm | Mẫu và hướng dẫn cần bổ sung | Điều kiện hoàn thành |
| --- | --- | --- | --- |
| P1 | Trang dashboard hoàn chỉnh | Header, bộ lọc, KPI, biểu đồ, bảng chi tiết, liên kết xem sâu; mẫu desktop và mobile | Có một trang demo ghép được các thành phần, code đầy đủ, ghi rõ dữ liệu minh họa |
| P1 | KPI | Nhãn, giá trị, đơn vị, kỳ so sánh, xu hướng và ý nghĩa tốt/xấu; loading/empty/error | Phân biệt `0` với chưa có dữ liệu; chi phí tăng không tự động mang màu tốt; xử lý kỳ trước bằng 0 mà không sinh Infinity |
| P1 | Bộ lọc dashboard | Khoảng ngày, kỳ nhanh, đơn vị/chi nhánh khi nghiệp vụ cho phép, áp dụng/xóa lọc, hiển thị phạm vi đang áp dụng | Nêu rõ lọc toàn trang hay từng widget; tránh biểu đồ năm nhưng nhãn làm người dùng tưởng đang lọc tháng; quy định lưu bộ lọc nếu cần |
| P1 | Biểu đồ | Mẫu cột/đường/donut theo nhu cầu thực tế; series token, legend, tooltip, đơn vị trục, bảng thay thế | Có dữ liệu rỗng, toàn 0, số âm, một điểm, nhãn dài; không dùng màu làm dấu hiệu duy nhất; donut chỉ nhận dữ liệu phù hợp |
| P1 | Trạng thái widget | Skeleton đúng kích thước, chưa có dữ liệu, lỗi + thử lại, lỗi một phần, đang làm mới khi còn dữ liệu cũ, thời điểm cập nhật | Một nguồn lỗi không che các widget còn tốt; không hiển thị dữ liệu giả để lấp chỗ trống; phân biệt không có quyền với không có dữ liệu |
| P2 | Khung trang và điều hướng | Sidebar thu gọn, breadcrumb, tiêu đề/hành động trang, mobile drawer, widget một/hai cột | Có quy tắc overflow, breakpoint, thứ tự đọc và di chuyển bằng bàn phím; tài liệu hóa hành vi đã có trước khi tạo thêm |
| P2 | Bảng báo cáo | Bảng theo cột cấu hình, căn phải số, tổng cộng, sort/filter, xuất theo phạm vi và quyền | Không dùng schema danh mục cố định của AMDataTable làm bảng báo cáo tổng quát; ưu tiên adapter grid hiện có |
| P2 | Phản hồi và trạng thái | Badge, alert, toast, tooltip; success/info/warning/danger; lớp menu/dialog/toast | Có nhãn và icon ngoài màu; thứ tự lớp không che popup; thông báo được công nghệ hỗ trợ đọc phù hợp |
| P2 | Prompt và bàn giao | Prompt cho dashboard trọn trang, KPI, bộ lọc, biểu đồ và widget | Mỗi prompt chỉ ra mẫu/component thực sự tồn tại, props, nguồn dữ liệu, trạng thái, responsive và tiêu chí kiểm tra; không viện dẫn component chưa xây |

P1: nên có trước khi xem Guidelines là đủ để giao người khác dựng dashboard. P2: hoàn thiện độ bao phủ và tái sử dụng.

## Các điểm trong source cần xử lý trước khi đưa vào mẫu chuẩn

1. `src/components/KPICard.tsx:16`: tăng luôn xanh, giảm luôn đỏ; dòng 36 cố định “so với tháng trước”. Cần tách hướng biến động khỏi tác động tốt/xấu và nhận kỳ so sánh qua props. Đây là component cũ, chưa kết luận mọi KPI đang chạy đều dùng nó.
2. `src/components/Chart.tsx:21`: chia cho giá trị lớn nhất; dòng 35 chia cho `data.length - 1`; dòng 94–95 chia cho tổng. Dữ liệu toàn 0 hoặc chỉ một điểm có thể sinh tọa độ/kích thước không hợp lệ. Không lấy component này làm mẫu chuẩn khi chưa xử lý các biên dữ liệu. Cần kiểm tra nơi sử dụng trước khi đánh giá ảnh hưởng thực tế.
3. `src/components/DashboardOverview.tsx`: biểu đồ doanh thu/lợi nhuận dùng màu đỏ viết trực tiếp. Cần quyết định bảng màu dữ liệu và ánh xạ token thống nhất với primary xanh; màu đỏ không nên mặc nhiên khiến doanh thu bị hiểu là lỗi.
4. `src/components/amnote/ui/tokens.css`: chưa có hệ token chuỗi biểu đồ, success/info, KPI và các lớp nổi có tên. Nên bổ sung theo primitive → semantic → component, tránh một bộ màu riêng chỉ dành cho preview.
5. `src/components/amnote/ui/index.jsx`: AMDataTable dùng schema danh mục mẫu. Chưa có API dùng chung cho KPI, chart frame, filter bar hoặc widget state.

## Thứ tự bổ sung đề xuất

1. Thêm mục Dashboard trong Guidelines, dùng một mẫu tổng quan kế toán với primary xanh; gồm KPI, bộ lọc, biểu đồ và bảng xem sâu.
2. Chuẩn hóa KPI, chart frame và widget state; ưu tiên tái sử dụng logic dashboard hiện có. Bổ sung token và mẫu dữ liệu biên.
3. Thêm chế độ thử loading/empty/error/partial error và màn hình hẹp; tài liệu hóa phạm vi bộ lọc và nguồn dữ liệu.
4. Bổ sung prompt sao chép cho từng thành phần và cả trang, trỏ đến source mẫu thực tế.
5. Hoàn thiện navigation, badge/alert/toast, bảng báo cáo và checklist kiểm tra khả năng truy cập.

## Nguồn đối chiếu

- `src/pages/UIGuidelines/UIGuidelines.jsx`: danh sách mục hiện có và đặc tả component.
- `src/pages/UIGuidelines/PromptGuide.jsx`: các loại prompt hiện có.
- `src/components/amnote/ui/index.jsx`, `tokens.css`: phạm vi kit và token dùng chung.
- `src/components/DashboardOverview.tsx`, `dashboard-overview.css`: dashboard nguồn, bố cục, biểu đồ, bộ lọc và widget.
- `src/components/dashboardData.ts`: dữ liệu nullable, request và lỗi từng nguồn.
- `src/components/KPICard.tsx`, `Chart.tsx`: component cũ có các giới hạn cần tránh kế thừa vào mẫu mới.

Lần rà soát này chỉ thêm tài liệu; không thay giao diện, nghiệp vụ hoặc bản triển khai. Không chạy build/test vì không thay mã thực thi. Các tình huống biên nêu trên được xác định qua công thức trong source, chưa là kết quả kiểm thử trình duyệt.
