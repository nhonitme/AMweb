# Cài đặt cột — rà soát 22/10/2026

Mục 05 tại `/demo/v3/ui-guidelines#table` dùng `AMColumnSettings`, thay popup checkbox cũ bằng panel bên phải. Tham chiếu đã mở trong lượt trước tại Sale-order, có nhãn **Bản local**: header/nút đóng, tìm cột, tên dữ liệu/tên hiển thị/độ rộng/ghim, tay nắm kéo, footer. Không lưu thay đổi trên tham chiếu; không khẳng định đây là bản production gốc.

## Chức năng trong demo

- Bản nháp tách cấu hình áp dụng; Hủy/Đóng/Escape bỏ bản nháp. Mặc định chỉ đổi bản nháp. Áp dụng hợp lệ mới cập nhật bảng.
- Ẩn/hiện giữ Số chứng từ bắt buộc, tìm theo tên gốc/tên hiển thị không dấu.
- Tên 1–80 ký tự; rộng nguyên 80–600px; lỗi liên kết trường, focus trường lỗi.
- Ghim trái có offset cộng dồn; thứ tự bằng kéo thả, nút lên/xuống hoặc Alt + mũi tên tại tay nắm.
- GearSix light thay icon cột trên toolbar; MagnifyingGlass/X/PushPin/DotsSixVertical cùng thư viện Phosphor hiện có. Không thêm thư viện runtime.
- Desktop panel tối đa 760px; mobile toàn chiều rộng, field chia hàng, body cuộn độc lập; header/footer giữ riêng.
- State chỉ trong bộ nhớ, không có API ghi hoặc dữ liệu nghiệp vụ. Toolbar một hàng và nhóm trái/phải giữ nguyên.

Đã rà source và sửa min-width của bảng được cấu hình: giữ đúng tổng độ rộng pixel do người dùng áp dụng, tránh trình duyệt tự giãn cột khi container rộng hơn, làm lệch offset ghim. Thêm khai báo kiểu cho component dùng chung. Code/CSS/model và prompt **Bảng · Cài đặt cột** nằm ngay trong Guidelines.

## Kiểm tra và giới hạn lần này

Kiểm tra model gồm cách ly bản nháp, cột bắt buộc, biên tên/độ rộng, tìm kiếm, đổi thứ tự và offset ghim. Kiểm tra render tĩnh gồm cấu trúc panel, sáu dòng có tên truy cập, checkbox bắt buộc, nút ghim/đổi thứ tự, footer. Lint và build riêng Guidelines được kiểm tra trước cài; script cài đặt xác minh webroot `../api/wwwroot2`, kiểm tra hash và tạo backup trước ghi. HTTP/assets được đối chiếu bản build sau cài.

**Chưa xác minh trực tiếp lần này:** công cụ trình duyệt báo `Local browser use is disabled in Work settings`. Không tự đổi cài đặt này. Vì vậy chưa thử runtime desktop/tablet/mobile, focus trap/trả focus, Escape, thao tác kéo thả hoặc cuộn sticky trên bản panel mới. Các hành vi đó đã có trong source nhưng kiểm tra model/render không chứng minh chúng hoạt động trong trình duyệt. Chưa thử touch hoặc screen reader thật. Không dùng ảnh toolbar cũ làm bằng chứng cho panel mới.
