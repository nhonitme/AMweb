# 08 · Thư viện icon · 23/10/2026

URL: http://192.168.1.49:8081/demo/v3/ui-guidelines#icons

## Chức năng

- Menu 08, anchor `#icons`, giữ nguyên mục 00–07.
- 1.512 icon Phosphor React 2.1.10, weight regular, SVG tĩnh được sinh trực tiếp từ component thực tế trong package đang cài. Không nhập icon của bộ khác.
- Tìm theo tên component, tên kebab-case/ph-prefix, tiếng Việt có dấu/không dấu và các câu nhu cầu có quy tắc hỗ trợ. Gợi ý tối đa 6 kết quả có giải thích, lựa chọn đầu có nhãn Đề xuất. Không dùng phần trăm tin cậy.
- Tách ý định thêm mới/thêm tài khoản/quản lý nhiều người, menu cá nhân, phân quyền, phiếu thu/chi, Excel, lưu/tải xuống và xóa/hủy. Từ khóa chung được chuẩn hóa, bỏ từ đệm và xếp hạng theo metadata; câu ngoài vốn quy tắc có thể không được hiểu đầy đủ.
- Nhóm icon: tác vụ, người dùng/quyền, chứng từ/tài chính, tệp/dữ liệu, điều hướng, thông báo, thiết bị, khác. Nhóm và nhãn phổ thông được gán theo từ khóa tên; các trường hợp nghiệp vụ phổ biến có mô tả được biên soạn riêng.
- 48 icon mỗi trang; không render toàn bộ danh mục cùng lúc. Icon có tên truy cập trên nút, focus-visible và responsive 2 cột ở mobile.
- Click mở dialog chi tiết: preview, tên component, nhãn/mục đích, cảnh báo dùng sai nghĩa, size 16/20/24/32, vị trí và nhãn tùy chỉnh, sao chép tên/code/prompt. Code là React component hoàn chỉnh dùng AMButton và handler do màn hình tích hợp cung cấp.
- Mục 00 có lựa chọn Icon · Phosphor, tìm nhu cầu, chọn icon, size và prompt riêng. Bộ chọn giữ icon hiện hành cùng tối đa 12 kết quả tìm kiếm mới, có liên kết tới thư viện đầy đủ.
- Clipboard bị chặn có thông báo chọn nội dung và Ctrl+C; code và prompt vẫn hiển thị dưới dạng văn bản.

## Phạm vi Gợi ý thông minh

Không phát hiện endpoint hoặc cấu hình AI trong source frontend/scripts đã kiểm tra. Thư mục api hiện chứa webroot đã build, không đủ source backend để khẳng định dịch vụ từ xa có hoặc không có AI.

Bản này dùng metadata, từ đồng nghĩa và quy tắc ngữ cảnh chạy trong trang. Không gửi truy vấn ra dịch vụ AI, không đặt khóa vào frontend, không gắn nhãn giả là mô hình AI. Mọi kết quả lấy từ catalog cho phép; không tạo tên component hoặc SVG từ đầu vào tìm kiếm.

Nếu bổ sung AI sau này, cần endpoint máy chủ thực tế được cấu hình, kiểm tra tên trả về theo catalog, giới hạn thời gian và fallback về searchIcons. Chưa thêm endpoint giả hoặc nút AI không có handler.

## Nguồn và khác biệt phiên bản

Tham khảo: https://themes.kopyov.com/limitless/demo/template/html/layout_1/full/icons_phosphor.html

Đã đọc trang và tải HTML để đối chiếu. Trang mô tả 1.047 icon; danh sách nhãn trích được từ HTML là 1.046 tên. Có 1.030 tên khớp slug của bộ React hiện tại và 16 tên cũ không khớp trực tiếp. Không tự coi tên cũ là export của bộ mới. Chi tiết: `ui-guidelines-icon-version-comparison.json`.

Catalog hiện tại được sinh từ 1.512 tệp csr thực tế và kiểm tra export tương ứng, nên có thêm icon so với tham khảo. Tất cả SVG sinh từ Phosphor với regular, không vẽ path thủ công. Chỉ markup từ catalog tĩnh được đưa vào preview; query/label không được đưa vào HTML.

## Source

| Tệp | Vai trò |
| --- | --- |
| `scripts/generate-guidelines-icons.mjs` | Tái tạo catalog sau khi thay package version |
| `src/pages/UIGuidelines/icon-catalog.json` | Tên, slug và SVG được xác minh từ package |
| `src/pages/UIGuidelines/icon-search.mjs` | Metadata, nhóm, chuẩn hóa, ý định, xếp hạng, code/prompt |
| `src/pages/UIGuidelines/IconLibrary.jsx` | Search, gợi ý, lưới, phân trang, dialog chi tiết |
| `src/pages/UIGuidelines/icon-library.css` | Layout riêng và breakpoint mobile theo token |
| `src/pages/UIGuidelines/PromptGuide.jsx` | Lựa chọn Icon tại mục 00 |
| `src/pages/UIGuidelines/UIGuidelines.jsx` | Menu/section 08 |

Giữ font Inter, primary xanh, token và control AMnote hiện có. Không thêm package hoặc animation riêng. Catalog khoảng 967KB trước minify; dữ liệu được bundle dùng local, không gọi Iconify runtime. Chỉ render tối đa 48 tile và 6 gợi ý nhưng bundle vẫn chứa danh mục đầy đủ, là giới hạn cần cân nhắc nếu mở rộng nhiều bộ icon.

## Kiểm tra đã chạy

- Build Guidelines riêng thành công. Không dùng Vite build mặc định.
- ESLint IconLibrary.jsx, PromptGuide.jsx, UIGuidelines.jsx thành công.
- `.demo-check/check-icon-library.mjs`: 1.512 tên duy nhất, có export thực tế, SVG đúng viewBox; metadata có nhóm, nhãn, từ khóa, mục đích và lưu ý.
- 17 câu truy vấn đã kiểm tra: thêm mới; tôi cần icon thêm khách hàng; thêm người dùng; menu người dùng; quản lý người dùng; icon cho menu quản lý người dùng; phân quyền; phiếu thu; xuất Excel; xóa; hủy; lưu; tải xuống; hai câu không dấu; ph-plus; UserCircle. Các kết quả đầu lần lượt đúng Plus/UserPlus/UserCircle/UsersThree/ShieldCheck/Receipt/FileXls/Trash/X/FloppyDisk/DownloadSimple theo ca tương ứng.
- Kết quả đều thuộc catalog, gợi ý các ca trên có 3–6 icon. Truy vấn không tồn tại trả rỗng; lọc nhóm loại trừ đúng kết quả.
- Kiểm tra code JSX parse được; prompt chứa đúng tên, regular, size, vị trí và nhãn tùy chỉnh.
- Render tĩnh ban đầu chỉ có 48 tile. Server render có cảnh báo useLayoutEffect từ AMDialogPresence vì app dùng React client; kiểm tra này không xác minh focus.
- Installer xác minh target/hash, backup và đọc lại assets thành công. Backup: `deliverables/ui-guidelines/backups/install-1792736674808`.

## Chưa xác minh

Công cụ trình duyệt báo Local browser use bị tắt. Chưa có ảnh giao diện, kiểm thử màn hình rộng/390px, thao tác bàn phím/focus, dialog/clipboard/phân trang thật hoặc console trên bản live. CSS và handler đã có, không được coi là bằng chứng tương tác browser. Chưa kiểm thử screen reader hoặc dịch vụ AI từ xa.
