# Rà soát thiết kế mục 07 · 23/10/2026

> **Trạng thái sau nâng cấp:** Các phát hiện dưới đây ghi lại bản trước khi sửa. Mục 07 hiện có 67 mẫu trong 21 nhóm; đã nâng cấp preview, prompt theo mẫu con, Popover neo trigger, Toast nổi, stepper, menu hiện hành và sửa ký tự 0. Lỗi focus khi Đặt lại panel phát hiện trong kiểm thử cũng đã sửa. Xem [đặc tả mới](ui-guidelines-basic-components.md) và [kiểm chứng](ui-guidelines-basic-components-qa.md). Không dùng phần hiện trạng cũ dưới đây để mô tả bản đang chạy.

## Kết luận

Mục 07 hiện đạt mức danh mục demo ban đầu. Chưa đủ chiều sâu để làm thư viện thiết kế tham chiếu: nhiều mẫu chỉ đổi nội dung hoặc cách điều khiển, phần xem trước ít thông tin, và còn sai khác giữa tên thành phần với cách hiển thị. Việc có 21 nhóm và 42 mẫu không chứng minh độ hoàn thiện thiết kế.

Đã đọc catalog của toàn bộ 21 nhóm và source, xem trực tiếp các vùng Accordion/Alerts, Carousel/Collapsible, Modal/Offcanvas và mở Popover trên trang LAN. Chưa kiểm tra viewport điện thoại trong lượt rà soát này. Chưa sửa hoặc triển khai lại giao diện; báo cáo này ghi nhận hiện trạng và yêu cầu nâng cấp.

## Skill phù hợp

- [web-design-guidelines · Vercel](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines): chuyên kiểm tra UI, UX và accessibility. Trang danh mục lúc tra cứu hiển thị khoảng 773 nghìn lượt cài; [kho chính thức](https://github.com/vercel-labs/agent-skills) có khoảng 32,8 nghìn sao. Lệnh cài: `npx skills add vercel-labs/agent-skills --skill web-design-guidelines`. Đã đọc skill và [bộ quy tắc hiện tại](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) để đối chiếu trong lần rà soát này.
- `redesign-existing-projects` đã có trên máy: dùng phần audit về bố cục, trạng thái và độ khác biệt của component. Không áp dụng các đề xuất đổi font, màu hoặc hiệu ứng trang trí trái chuẩn AMnote.
- `design-system-amnote` đã có: giữ token, component và ngữ cảnh ứng dụng AMnote khi nâng cấp.

## Phát hiện ưu tiên

| Mức | Vị trí | Hiện trạng và tác động | Yêu cầu sửa |
| --- | --- | --- | --- |
| P2 | `src/pages/UIGuidelines/BasicComponents.jsx:28` | Alert thông tin hiện ký tự **0** thừa. `variant` là số 0/1; biểu thức `variant && <button>` trả về số 0 và React render ra chữ. Đã thấy trên ảnh và DOM. Cùng mẫu điều kiện xuất hiện ở Breadcrumbs dòng 30 và footer Modal dòng 37. | Đổi điều kiện sang boolean; kiểm tra cả ba vị trí. |
| P2 | `BasicComponents.jsx:41`; `basic-components.css:1` | Popover mở ở giữa viewport bởi `margin:auto`, không neo theo nút. Đã đo tâm panel khoảng (519,446), nút khoảng (365,446). Khi vị trí nút thay đổi, panel không đi theo. | Neo theo trigger, có hướng và khoảng cách rõ, tự đổi hướng/kẹp khi sát mép. |
| P2 | `BasicComponents.jsx:45` | Toast là một alert nằm trong dòng nội dung của thẻ. Không minh họa thông báo nổi, xếp chồng hay vị trí; người dùng không phân biệt được với Alerts. | Cho mẫu toast ở góc viewport hoặc vùng mô phỏng, có stack, đóng; biến thể tự ẩn phải có pause khi hover/focus. |
| P2 | `BasicComponents.jsx:50` | Prompt áp dụng cho cả nhóm và luôn yêu cầu cả hai biến thể. Không có lựa chọn mẫu con cụ thể, nhãn, hướng hay trạng thái theo mẫu người dùng đang xem. | Chọn biến thể và tùy chọn tương ứng; prompt nêu đúng mẫu đã chọn và liên kết nguồn/đặc tả. |
| P2 | `UIGuidelines.jsx:96`; `UIGuidelines.jsx:99` | Observer chỉ theo dõi các mục cấp 00–07; menu con không có active state hoặc aria-current. Trang dài khoảng 19.415px tại viewport kiểm tra. Khi cuộn khó biết đang ở nhóm nào. | Theo dõi mục con, đánh dấu vị trí hiện tại; thêm tìm kiếm/lọc và khả năng chỉ xem nhóm đang chọn nếu cần. |
| P3 | `BasicComponents.jsx:37`; `BasicComponents.jsx:58` | Modal và Offcanvas có vùng xem trước cao 136px nhưng chỉ chứa nút mở. Không nhìn được header/body/footer, tỷ lệ panel hay nội dung trước khi bấm. | Thêm bản xem trước cấu trúc thu nhỏ và nút thử thật; thể hiện rõ loại nội dung và kích thước. |
| P3 | `basic-components.mjs:3`; `BasicComponents.jsx:27` | Accordion chỉ có một mở/nhiều mở, gần như cùng hình thức. Thiếu mẫu đóng mặc định và mẫu flush/không khung để đối chiếu với tham chiếu. | Tách biến thể hành vi và biến thể hình thức; có ít nhất mẫu mặc định, flush và có metadata. |
| P3 | `BasicComponents.jsx:32`; `BasicComponents.jsx:36`; `BasicComponents.jsx:40` | Carousel chỉ là khối chữ; Media objects lặp avatar + đoạn ngắn; skeleton là các thanh ngang. Thiếu ví dụ có bố cục và nội dung phản ánh ứng dụng thật. | Thiết kế ví dụ dùng đúng ngữ cảnh: slide có hình/khối nội dung, hoạt động có thời gian và nhóm, skeleton khớp card/list thật. |
| P3 | `BasicComponents.jsx:42` | “Tiến độ theo bước” vẫn dùng cùng thanh progress, chỉ đổi câu chữ Bước 1/3. Chưa thể hiện các bước đã xong/đang làm/chưa tới. | Có stepper nhìn thấy các bước và trạng thái; giữ progress riêng cho phần trăm. |
| P3 | `basic-components.css:1` | Tất cả nhóm dùng cùng khung và chiều cao tối thiểu; nhiều ô ít nội dung còn trống. Tên biến thể cỡ 11px, mô tả lặp và viền nhiều tầng làm trang dàn trải. | Điều chỉnh khung theo loại component, làm rõ tên mẫu con, giảm khung lồng nhau, sắp phần thử/đặc tả/prompt thành cấu trúc dễ quét. |

## Đối chiếu tham chiếu

[Trang Accordion của Limitless](https://themes.kopyov.com/limitless/demo/template/html/layout_1/full/components_accordion.html) phân biệt trạng thái đóng, mở mặc định, mở nhiều và dạng bỏ khung trong container. Hai mẫu hiện tại của AMnote mới bao phủ một phần. Đối chiếu này nói về chiều sâu biến thể; không yêu cầu sao chép màu, CSS hoặc mã theme.

## Hướng nâng cấp theo 21 nhóm

Các mục dưới đây là đề xuất thiết kế, không phải khẳng định đã triển khai hoặc bắt buộc mỗi nhóm có cùng số mẫu.

| Nhóm | Mẫu cần ưu tiên |
| --- | --- |
| Accordion | Mặc định, flush, nhiều mục mở, header có metadata; chevron và trạng thái nhất quán. |
| Alerts | Info/success/warning/error; gọn, có tiêu đề, có tác vụ, có nút đóng. |
| Badges | Trạng thái, số lượng, có dot/icon; định nghĩa kích thước và tương phản. |
| Breadcrumbs | Phân cấp, có trang đầu, rút gọn khi hẹp; bỏ ký tự 0 thừa. |
| Buttons | Primary/secondary/outline/danger, icon, kích thước, loading/disabled; liên kết với mục 02. |
| Carousel | Slide có hình/khối nội dung, caption, chỉ báo và điều khiển; không ép autoplay. |
| Collapsible | Nút mở vùng độc lập, nội dung trong card, nhiều vùng; khác biệt rõ với Accordion. |
| Dropdown menus | Icon, separator, disabled, tác vụ nguy hiểm và vị trí mở; xem trước menu khi đang mở. |
| List group | Tĩnh, chọn một mục, có icon/badge, disabled; có ví dụ nội dung dài. |
| Media objects | Avatar, nội dung nhiều dòng, hoạt động có thời gian, căn đầu/giữa. |
| Modals | Bản xem trước cấu trúc, thông tin/xác nhận/form, nội dung dài và footer cố định; liên kết mục 04. |
| Offcanvas | Bản xem trước panel, bộ lọc/chi tiết, trái/phải; body cuộn và footer. |
| Pagination | Số trang, compact, trang nhiều có dấu …; phạm vi và số dòng mỗi trang. |
| Pills | Bộ lọc có số lượng, icon, disabled; phân biệt bộ lọc aria-pressed với tabs. |
| Placeholder | Skeleton card/list/bảng khớp bố cục thật, trạng thái tải xong giữ tỷ lệ. |
| Popovers | Neo đúng trigger, nhiều hướng, có tiêu đề/nội dung/tác vụ, sát mép viewport. |
| Progress | Phần trăm, nhiều segment, tiến độ chưa xác định; stepper riêng nếu cần. |
| Scrollspy | Nội dung đủ dài, marker hiện tại, ngang/dọc, kiểm tra cuộn tay và anchor. |
| Tabs | Gạch chân, khung, icon/badge, disabled, nội dung dài và overflow; giữ bàn phím. |
| Toasts | Thông báo nổi, stack, trạng thái thành công/lỗi; thời gian hiển thị và đóng. |
| Tooltips | Trên/dưới/trái/phải, focus/hover, nhiều dòng, sát mép; neo và không che trigger. |

## Tiêu chí bàn giao cho lượt nâng cấp

1. Mỗi mẫu con có khác biệt thiết kế/hành vi rõ và tên mô tả đúng, không chỉ thay câu chữ.
2. Có preview nhận biết ngay, nút thử thật, trạng thái cần thiết và prompt đúng biến thể.
3. Giữ token AMnote; không thêm font, framework, gradient hoặc hiệu ứng trang trí để che thiếu nội dung.
4. Sửa các sai khác Toast/Popover/Progress, ký tự 0 và active menu trước khi mở rộng số mẫu.
5. Kiểm tra lại desktop/mobile, bàn phím, focus, overlay sát mép, nội dung dài và reduced motion; ghi rõ phần chưa kiểm tra.

Ảnh bằng chứng: `deliverables/ui-guidelines/basic-components-audit-modals.png`.
