# Bộ cấu hình Button và trường nhập

Ngày cập nhật: 27/10/2026. Route: `/demo/v3/ui-guidelines`, mục 02 và 03.

`ComponentPlayground.jsx` thêm cấu hình, xem trước và code vào bên cạnh các ví dụ hiện có. Dùng local state; không gọi API nghiệp vụ. Màn hình rộng chia cấu hình và kết quả thành hai vùng; dưới 1000px xếp dọc, dưới 600px cấu hình một cột. Code và danh sách icon cuộn trong vùng riêng.

## API dùng chung

`AMButton` giữ các variant và mặc định cũ, thêm:

- `variant` bổ sung `soft`: nền tint + viền/chữ accent theo footer popup IO / chứng từ (Lưu và Thêm, In, Sao chép, Hủy soft). Lưu chính vẫn `primary`.
- `color`: `primary | danger | success | warning | neutral | teal | violet`, tùy chọn. Teal cho In, violet cho Sao chép. Không truyền color giữ cách hiển thị trước đây; soft không color = soft primary.
- `iconPosition`: `before | after`, mặc định `before`; áp dụng cả icon và spinner để không đổi vị trí khi loading.
- `icon`: tên icon DevExtreme hiện có. Bộ chọn cung cấp icon thông dụng, tìm theo tên hoặc chức năng tiếng Việt, cùng lựa chọn không dùng icon. Không thay thư viện icon của ứng dụng.

Khai báo kiểu `AMField` bổ sung `rows` cho textarea. Select native không hỗ trợ readOnly: bộ cấu hình khóa bằng disabled và ghi chú lấy giá trị từ state khi lưu; không mô tả đây là readOnly native.

## Code sinh ra

Code là component React đầy đủ, có import, stylesheet chung và scope `.am-ui`. Alias `@` cần trỏ tới `src`. Icon cần stylesheet DevExtreme của shell hiện có. Button có handler thông báo minh họa, cần thay bằng handler nghiệp vụ. Field có state chuỗi, giữ giá trị số 0 và ghi chú nối validation/submit thật.

Chuỗi được mã hóa thành JavaScript literal trong biểu thức JSX, kể cả dấu nháy, dấu nhỏ hơn, dấu ngoặc và xuống dòng. Select cho sửa value/label, thêm/xóa lựa chọn; thay đổi danh sách chọn giá trị đầu tiên để state và preview không lệch nhau. Value trùng hiển thị lỗi để người cấu hình sửa.

Copy ưu tiên Clipboard API; nếu thiếu hoặc bị từ chối, dùng textarea tạm và `execCommand('copy')`, sau đó xóa textarea và khôi phục focus/selection. Nếu cả hai thất bại, hiện hướng dẫn chọn code và Ctrl+C. Thông báo đã sao chép ẩn khi code thay đổi.

## Kiểm chứng

- `node scripts/check-component-playground.mjs`: 20 ví dụ sinh ra được biên dịch và render React, gồm 15 tổ hợp màu/kiểu nút, 5 loại field, ký tự đặc biệt, icon sau chữ, rows và giá trị 0. Kiểm tra fallback copy thành công, Clipboard API bị từ chối và nhánh thất bại có dọn dẹp.
- ESLint riêng cho `ComponentPlayground.jsx` và component UI chung: đạt.
- Build riêng bằng `scripts/build-ui-guidelines.mjs`, cài bằng `scripts/install-ui-guidelines.mjs` có backup/kiểm tra hash; không dùng Vite build mặc định.
- Browser trên trang kiểm tra độc lập dùng cùng source (`scripts/preview-component-playground.mjs`): đổi preset, màu, vị trí icon, chữ chứa dấu nháy, loading khóa nút, đặt lại; thêm/sửa/xóa lựa chọn, required, select chỉ đọc, textarea 6 dòng, thông báo lỗi. Sao chép button/textarea và đọc lại clipboard khớp code. Đã xem bố cục desktop và iframe viewport 390px.
- Rà soát theo `design-taste-frontend-v1`: giữ token/font/icon AMnote theo yêu cầu; dùng hai vùng có thứ bậc rõ, không thêm hiệu ứng liên tục hoặc thư viện; layout mobile về một cột, focus kế thừa control chung.
- Giới hạn: URL LAN chuyển về đăng nhập trong phiên browser kiểm tra. Chưa xác minh bố cục của cả trang sau đăng nhập hoặc Clipboard API/fallback trên đúng origin LAN. Kiểm thử browser thực hiện trên trang độc lập localhost; fallback HTTP được kiểm tra bằng mô phỏng API. Không thay đổi xác thực để kiểm thử.
