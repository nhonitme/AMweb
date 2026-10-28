# AMnote UI Guidelines

## Bộ cấu hình Button và trường nhập · 27/10/2026

Mục 02/03 có cấu hình trực tiếp, xem trước và sao chép component React; button hỗ trợ màu semantic, icon trước/sau, mẫu thao tác; field hỗ trợ các loại nhập, trạng thái và chỉnh lựa chọn select. Xem [API, cách sử dụng và kiểm chứng](ui-guidelines-component-playground.md).

## Header bảng: ghim, sort và menu cột

Bảng chính mục 05 có icon Phosphor cho cột ghim và sort, menu chuột phải/nút ba chấm/Shift+F10, các tác vụ dùng chung trạng thái với Cài đặt cột. Mục 00 có prompt header riêng, mục 05 có source header/model/CSS sao chép. Xem [thay đổi và kiểm chứng header](ui-guidelines-table-header.md). Chưa đối chiếu trực quan menu Sale-order vì trình duyệt bị tắt.

## Cuộn trang Guidelines

Guidelines `.ug-page` là vùng cuộn cao 100dvh; sidebar dài có vùng cuộn riêng để giữ menu tiếp cận. Khóa cuộn html/body và đặt root 100% chỉ khi `.ug-page` được mount bằng selector `:has(.ug-page)`, tránh thanh cuộn document bên ngoài xuất hiện cạnh thanh nội dung. Không ẩn scrollbar sidebar hoặc scrollbar trong bảng/code. Build riêng và install local đã chạy; chưa xác minh hình ảnh live vì browser bị tắt, nên chưa kết luận hai thanh người dùng nhìn thấy là sidebar/main hay hai thanh sát phải.

## 08 · Thư viện icon

Mục 08 (`#icons`) có 1.512 icon Phosphor React 2.1.10, tìm kiếm tiếng Việt theo ý định, gợi ý có giải thích, lọc nhóm/phân trang 48 icon và dialog sao chép code/prompt. Mục 00 có lựa chọn Icon · Phosphor. Gợi ý chạy local bằng metadata và quy tắc, chưa tích hợp mô hình AI. Xem [hướng dẫn và kiểm chứng thư viện icon](ui-guidelines-icons.md).

## Typography · cập nhật 23/10/2026

Theo yêu cầu thống nhất font, toàn trang Guidelines `/ui-guidelines` cùng popup/menu/toast của trang dùng **Inter** từ font variable đã có trong shell v3. Button có chữ dùng **13px / weight 500 / line-height 20px**; input/label 13px/400. Tiêu đề giữ thang kích thước hiện có. Textarea và prompt/code trên trang cũng dùng Inter. Icon giữ font biểu tượng riêng. File `src/pages/UIGuidelines/guidelines-typography.css` scope theo `.ug-page` và overlay của trang; không đổi typography trang nghiệp vụ khác. Các phép đo Segoe UI/Noto Sans hoặc textarea monospace ở các mục lịch sử bên dưới mô tả bản trước thay đổi này.

## Các thành phần cơ bản

Alerts đã chuyển sang **Left icon / Block icon**: vùng icon semantic đặc bên trái, bốn icon Phosphor tĩnh và nút đóng riêng. Preview, catalog/prompt mục 00/07 và source sao chép đã đồng bộ. Xem [nguồn đối chiếu và kiểm tra Alerts](ui-guidelines-alerts-left-icon.md), gồm giới hạn chưa kiểm chứng browser.

Cập nhật SweetAlert ngày 23/10/2026: mục 07 hiện có **22 nhóm / 76 mẫu**, thêm **SweetAlert Notifications** với 9 mẫu. Menu và bộ chọn mục 00 cùng đọc catalog nên đồng bộ các mẫu mới. Adapter chung `src/components/amnote/ui/sweetalert.mjs`, CSS `sweetalert.css`, demo React `SweetAlertDemo.jsx`; dùng SweetAlert2 11.26.25, token AMnote và typography Inter hiện tại. Xem [hướng dẫn và kiểm chứng SweetAlert](ui-guidelines-sweetalert.md).

Bản ban đầu của **07 · Các thành phần cơ bản** gồm 21 nhóm từ Accordion đến Tooltips, **67 mẫu thiết kế** với preview, tương tác và prompt theo đúng mẫu con. Mục **00 · Yêu cầu AI tạo giao diện** có các lựa chọn tương ứng. Kiểm chứng bản 67 mẫu về bố cục 1280px/390px, bàn phím/focus, dialog/panel và overlay được ghi trong [đặc tả thành phần cơ bản](ui-guidelines-basic-components.md) và [kết quả kiểm tra](ui-guidelines-basic-components-qa.md). Chín mẫu bổ sung được kiểm chứng riêng trong tài liệu SweetAlert bên trên.

## Cột hành động và mật độ bảng cập nhật 22/10/2026

Bổ sung sau rà soát: checkbox luôn ghim trái, không phụ thuộc cột dữ liệu nào được ghim. Cột thao tác rộng 90px, có nút xem và menu cùng handler thật, viền trái 1px thay cho bóng giả. Cả hai đầu header và body dùng nền đặc và cùng màu với dòng. Màu bảng chứng từ được đo lại từ sale-order: header #ecedef, chữ header #262626, chữ body #101828, dòng hiện hành #e5f4ef, hover #eaf7f2; font bảng 13px/20px theo font control hiện có. Những màu này nằm trong token --am-document-*; primary của ứng dụng vẫn xanh dương. Desktop hiện nhóm hành động khi hover/focus/dòng hiện hành/menu đang mở; touch hiện thường trực. Dòng desktop vẫn 24px, nút 22px theo yêu cầu compact.

Bảng mục 05 dùng dòng thân bảng 24px trên desktop, header 36px. Cột hành động có `am-actions-cell` ở cả th/td, luôn ghim phải (`position: sticky; right: 0`), nền đặc theo header/hover/selection; lớp header cao hơn các cột ghim trái. Cột này độc lập với cấu hình ẩn/hiện hoặc ghim cột dữ liệu. Đã đối chiếu sale-order và đo trên trình duyệt: mép phải ô hành động trùng mép phải vùng cuộn tại đầu và trong khi cuộn ngang, menu mở trong viewport; dòng vẫn 24px.

## Layout bảng chính–chi tiết mục 05

Vùng demo Phiếu thu dùng workspace giới hạn chiều cao: bảng chính trên, chi tiết dòng đang xem dưới; cuộn riêng, header sticky, tổng và phân trang ngoài vùng cuộn chính. Giữ toolbar một hàng hai nhóm và panel Cài đặt cột. Code/CSS và prompt **Bảng · Layout chính–chi tiết** có ngay trên trang. Xem [kiểm tra layout](ui-guidelines-document-workspace-qa.md); lần cập nhật này chưa kiểm tra browser vì công cụ đang tắt.

## Bảng và toolbar chứng từ

Mục **05 · Bảng & toolbar** có demo Phiếu thu đầy đủ, bảng chính/chi tiết, toolbar theo thứ tự Receipt, quy tắc selection/phạm vi, nhập Excel trong bộ nhớ và xem trước PDF. Có code/CSS dùng chung và prompt sao chép. Xem nguồn đối chiếu, cách triển khai và giới hạn kiểm tra tại [ui-guidelines-table-toolbar.md](ui-guidelines-table-toolbar.md).

## Popup nhiều section

Mục **04 · Form & popup** có nút **Mở popup nhiều section**, theo mẫu Khách hàng đã duyệt. Dùng `AMDialog size="sectioned"` (960px, giới hạn viewport), `SectionedPopupExample.jsx` và stylesheet chung `section-dialog.css`. Body `.am-section-form` gồm `section.am-form-section` với h3 có aria-labelledby. Section trắng, viền nhẹ/radius 8px, padding/gap 16px; header title và nút đóng tách riêng. Form hai cột về một dưới 600px; body cuộn, header/footer giữ riêng.

Có demo validation, loading, xác nhận bỏ thay đổi, code/CSS đầy đủ và lựa chọn **Popup · Nhiều section** trong trình tạo prompt. Năm nhóm chỉ là ví dụ: chung/khách hàng/liên hệ/ngân hàng/khác. Trang DevExtreme phải giữ editor/lookup/validation và scope adapter, không mang fixture demo vào trang thật.

## Dashboard mẫu

Đã bổ sung **06 · Dashboard mẫu** và trang riêng `/demo/v3/ui-guidelines/dashboard`: bộ lọc, KPI, ba biểu đồ, bảng chi tiết, CSV, tùy chỉnh bố cục và bộ chọn trạng thái. Xem cách dùng, source và giới hạn xác minh tại [ui-guidelines-dashboard.md](ui-guidelines-dashboard.md). Dữ liệu minh họa độc lập, không gọi API nghiệp vụ.

## Hai kích thước popup

Trong mục **04 · Form & popup**, có hai mẫu mở trực tiếp:

- **Popup thường**: `AMDialog size="normal"`, rộng 640px, phù hợp danh mục ít trường. Form có mã, tên, ngày, khách hàng và diễn giải.
- **Popup toàn màn hình**: `AMDialog size="fullscreen"`, phủ 100vw × 100dvh, theo cấu trúc form thêm sale-order đã khảo sát: Thông tin chung / Thông tin khác, tab chi tiết, bảng nhập sản phẩm, tổng tiền; footer Hủy / Lưu và Thêm / Lưu.

Cả hai bọc `AMDialogPresence`, dùng token/input chung, Escape và focus của dialog native, body cuộn độc lập, header/footer không co, cảnh báo thay đổi chưa lưu và khóa gửi lặp. Fullscreen chuyển vùng thông tin sang một cột trên màn hình hẹp; bảng cuộn ngang trong vùng riêng.

Source đầy đủ đang render là `src/pages/UIGuidelines/PopupExamples.jsx`, có nút sao chép ngay trên trang. Style fullscreen và bố cục chứng từ dùng chung ở `src/components/amnote/ui/voucher-dialog.css`, được import qua controls.css. `popup-examples.css` chỉ bố trí hai bản xem trước trong tài liệu.

Demo dùng bộ nhớ: chọn sản phẩm tự điền đơn giá, sửa số lượng/giá tính lại tổng, thêm/xóa dòng, validation bắt buộc và số hợp lệ, Lưu và Thêm đặt lại form. Thuế 8% là quy ước dữ liệu minh họa được ghi rõ, không áp đặt vào nghiệp vụ thật. Tab mở rộng/tệp có empty state; không tải tệp hoặc ghi API.

Trình tạo prompt có hai lựa chọn **Popup · Thường** và **Popup · Toàn màn hình**, nêu component, kích thước, bố cục, footer và hành vi cần triển khai.

Lần bổ sung này công cụ trình duyệt bị tắt trong Work settings. Đối chiếu theo ảnh/phép đo đã thực hiện trước đó; chưa xác minh lại trực quan hoặc tương tác hai popup mới trên phiên trình duyệt. Build, lint, khai báo kiểu và kiểm tra render/cấu trúc được thực hiện riêng.

Trang chạy: http://127.0.0.1:8081/demo/v3/ui-guidelines

Truy cập từ menu **Trợ giúp & hỗ trợ → AMnote UI Guidelines**. Đây là tài liệu độc lập công ty, nằm trong router đã xác thực, trước luồng chuyển về trang công ty mặc định. Không thay đổi xác thực hoặc quyền của ứng dụng.

## Source và bản đang phục vụ

- Source workspace: `dashboard1/src`. React 18, React Router, Vite; DevExtreme và icon DevExtreme đã có sẵn.
- `/demo/v3/` được `scripts/preview-v3-8081.mjs` phục vụ từ `../api/wwwroot2`; máy chủ đọc bundle chính vào bộ nhớ khi khởi động.
- Vite mặc định có `base: /v1/`, `outDir: ../api/wwwroot`, `emptyOutDir: true`. **Không chạy build mặc định để triển khai nhiệm vụ này.**
- Source workspace không hoàn toàn khớp bản framework đã biên dịch trong wwwroot2. Đã thêm route và mục trợ giúp trong source; bản đang chạy được tích hợp bằng bản vá assets có kiểm tra cấu trúc và sao lưu. Không coi bundle đã biên dịch là source framework đầy đủ.
- `scripts/build-ui-guidelines.mjs` tạo gói riêng trong `deliverables/ui-guidelines`, không dọn webroot, không cài thư viện. Gói mới sử dụng cùng React singleton của bản đã phục vụ qua adapter `am-ui-react.js`.
- Route được thêm vào React Router thực tế; component được lazy load. Tất cả luồng demo chỉ dùng state trong bộ nhớ, không import API nghiệp vụ.

## Tệp component và token

| Tệp | Vai trò |
| --- | --- |
| `src/components/amnote/ui/tokens.css` | Một nguồn token ba lớp primitive → semantic → component, scope `.am-ui` |
| `src/components/amnote/ui/controls.css` | Style dùng chung cho control, bảng, toolbar, dialog và menu |
| `src/components/amnote/ui/index.jsx` | AMButton, AMField, AMChoice, AMDialog, AMDialogPresence, AMMenu, AMToolbar, AMDataTable |
| `src/components/amnote/ui/index.d.ts` | Props cho các trang TypeScript của dự án |
| `src/pages/UIGuidelines/UIGuidelines.jsx` | Tài liệu tiếng Việt, preview, đặc tả và sao chép code |
| `src/pages/UIGuidelines/guidelines.css` | Chỉ bố cục trang tài liệu và vùng preview |
| `src/pages/UIGuidelines/ReceiptTableDemo.jsx` | Demo duy nhất tại mục 05: bảng chứng từ, chi tiết và thao tác trong bộ nhớ |

Catalog token trên trang được đọc trực tiếp từ `tokens.css`; phần mã nguồn demo sao chép được cũng lấy từ source đang build. Không có bộ token khác dành riêng cho preview. Style chỉ áp dụng `.am-ui`; không override tất cả `.dx-button` hay `.dx-texteditor`.

Các adapter DevExtreme hiện có `AMnoteGridToolbar`, `AMnoteRowActions`, `VoucherToolbar`, `FormModal` được khảo sát. Chúng gắn handler grid/API và cấu hình nghiệp vụ. Trang dữ liệu minh họa dùng các component trung tính mới bên trên để không giả lập instance grid hoặc gọi handler nghiệp vụ. Trang nghiệp vụ hiện có tiếp tục dùng adapter và quyền gốc. Không có icon library hoặc framework mới.

## Quy ước tích hợp

```tsx
import { AMButton, AMField } from '@/components/amnote/ui';

export function Example() {
  const [name, setName] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  return <form className="am-ui am-form-grid" onSubmit={event => {
    event.preventDefault();
    setSubmitted(true);
  }} noValidate>
    <AMField label="Tên" required value={name}
      onChange={event => setName(event.target.value)}
      error={submitted && !name.trim() ? 'Vui lòng nhập tên.' : undefined} />
    <AMButton type="submit">Kiểm tra</AMButton>
  </form>;
}
```

Đoạn trên giả định file đã import React, theo cấu trúc source hiện có. `AMField` nối label/id/helper/error; dùng controlled value và onChange khi xử lý dữ liệu. Native select có thể clear bằng option giá trị rỗng, hỗ trợ bàn phím, dropdown do trình duyệt quản lý. Lookup `list`/`datalist` chỉ dành danh sách nhỏ. Lookup lớn/API tiếp tục dùng component DevExtreme hiện có.

AMButton có variant `primary|secondary|outline|danger|soft|ghost`, size `compact|standard`, `loading`, `disabled`, `icon`; `color` tùy chọn `primary|danger|success|warning|neutral|teal|violet`. Soft là kiểu footer popup IO / chứng từ: nền tint + viền/chữ accent kèm icon như `EditorActionToolbar` — Lưu `save`, Lưu và Thêm `plus`, In `print` + teal, Sao chép `copy` + violet, Xóa `trash` + danger, Hủy `close` + neutral; Lưu chính vẫn `primary`.

### Title popup + đóng góc phải trên (chuẩn IO = OT)

Đã đối chiếu popup xuất kho (IO) với Phiếu khác (OT). Metrics bắt buộc:

| Phần | Giá trị |
| --- | --- |
| Title padding | `4px 8px` |
| Title chữ | 16px / 22px / 600 |
| DX toolbar items | cao **26px** (`min-height: 0`) |
| Card góc phải | nền trắng, radius 8px, shadow nhẹ, **không `p-1`** |
| Nút icon (Đóng / Cài đặt cột) | **26×26px** |

AM native: `AMButton variant="ghost" icon="close"` trong `.am-title-actions` trên `.am-popup-title-bar` (có thể kèm `columnchooser`). DevExtreme: thêm class `.am-dx-popup-title` lên `wrapperAttr` của Popup và `.am-dx-title-actions` cho nhóm nút; dùng `Button stylingMode="text" icon="close"` (hint/aria-label/title = `Đóng form`). Không dùng primary/secondary có viền cho nút đóng title; không để DX toolbar mặc định 36px. Nút chỉ-icon cần `aria-label` và `title`. Loading giữ label/kích thước và chặn kích hoạt.

AMDialogPresence bọc điều kiện mở/đóng để giữ dialog trong animation thoát 160ms. Mở dùng trượt nhẹ + fade 220ms, tắt animation với reduced motion. AMDialog dùng dialog native để giữ focus, làm nền inert, hỗ trợ Escape, trả focus. Parent chịu trách nhiệm kiểm tra dirty state trong onClose. `busy` chặn Escape và nút đóng; parent cũng cần chặn Hủy, lock submit. Demo có kiểm tra mã bắt buộc/trùng, tên bắt buộc, ngày hợp lệ, số tiền >= 0 và luồng cảnh báo chưa lưu. Form hai cột chuyển một cột dưới 600px; tùy chọn một cột có sẵn.

AMMenu đưa menu vào body qua portal, kẹp vào viewport, tự lật lên trên khi thiếu chỗ. Hỗ trợ ↑/↓/Home/End, Escape trả focus; bấm ngoài/scroll/resize đóng. Chỉ truyền các thao tác được phép qua items.

AMToolbar nhận count/selectedCount và callback thật của màn hình. Chọn dòng ẩn search/refresh, hiện số lượng/Bỏ chọn/Xóa đã chọn. Không hiển thị Excel hoặc cài đặt cột khi chưa có handler.

AMDataTable hiện là bảng schema danh mục mẫu: `{id, code, name, date: YYYY-MM-DD, amount: number, status}`. Có sort, selection, phân trang, sticky actions, cuộn ngang và các trạng thái `normal|empty|loading|error`. `onDelete` nhận id[] và parent mở xác nhận. Chọn tất cả chỉ áp dụng trang hiện tại. Không dùng nó thay thế tùy tiện các grid nghiệp vụ đa dạng.

## Đối chiếu tham chiếu và phần tạm

Đã mở URL sale-order do người dùng cung cấp. Trình duyệt trả trang có tiêu đề “Đơn đặt hàng | AMIS Sản Xuất — Local” và nhãn “Bản local”. Đã quan sát toolbar, search, select, bảng chính/chi tiết, hành động mắt/ba chấm, menu, hộp xác nhận xóa, form thêm mới và sửa; hủy tất cả, không lưu/xóa dữ liệu trên trang tham chiếu. Đã mở popup sửa rồi hủy. Chưa xác nhận production gốc phía sau bản local.

| Đặc tính | Tham chiếu quan sát/đo | Trang mới |
| --- | --- | --- |
| Nút Lưu | 32px, radius 8px, xanh #0e9a62, 500 13px Inter/Arial | Compact 32px/radius 8px; Segoe UI có sẵn |
| Tương phản nút | Trắng trên #0e9a62: 3,61:1 | Primary #2563eb theo sidebar: 5,17:1; hover #1d4ed8, active #1e40af |
| Input/label | Đã đo: viền #d3d5d8, chữ #242a31, label #15191f, 400 13px, gap 7px; padding 5px 10px | Khớp các giá trị đo; focus một viền primary xanh dương thay xanh lá |
| Màu phụ, hover, selected | Quan sát phong cách xanh; chưa đo đầy đủ | Primary #2563eb và selected #eff6ff đã xác minh từ sidebar; hover/active theo thang xanh dương |
| Hàng bảng | Chưa đo tham chiếu | Thân bảng desktop 24px theo yêu cầu cập nhật; header 36px |
| Popup | Form chứng từ lớn đã quan sát | Danh mục 640px theo AMnote; đã đo trên trang mới |

Font bảng/toolbar 12px; control/label/menu 13px; popup 20px/18px; header bảng 36px; nút standard 36px. Khoảng cách dùng thang 4/6/8/12/16/20/24. Touch tăng hành động dòng lên 32px và hàng 40px. Có focus-visible và prefers-reduced-motion. Các phép đo tương phản chính không thay thế một chứng nhận WCAG toàn diện.

## Build, cài và khôi phục

1. Chạy `rtk proxy node scripts/build-ui-guidelines.mjs` trong workspace. Script phát hiện entry từ index hiện tại, kiểm tra cấu trúc React/router/menu, parse JS và tạo gói riêng.
2. `rtk proxy node scripts/install-ui-guidelines.mjs` kiểm tra hash bundle/HTML chưa đổi, xác minh target chính xác là wwwroot2, sao lưu từng tệp live và đọc lại kiểm tra trước khi ghi. Chỉ ghi 5 tệp trong manifest. Nếu có lỗi ghi, tự phục hồi các bản gốc.
3. Bản sao lưu nằm trong `deliverables/ui-guidelines/backups/install-*/`, kèm `restore.json`. Bản đầu tiên chứa bundle/index trước tích hợp; giữ các snapshot này.
4. Chỉ khi bundle router thay đổi mới cần khởi động lại đúng preview; script reload kiểm tra PID/lệnh khớp `preview-v3-8081.mjs` trước khi dừng. Các thay đổi component/CSS lazy-load không cần restart preview.
5. Khôi phục theo `restore.json`: copy lại các tệp existed=true; bỏ các tệp bổ sung existed=false nếu cần; restart đúng preview khi phục hồi bundle. Không xóa cả thư mục webroot.

## Kiểm tra

Build riêng parse/bundle thành công. ESLint cho source JSX mới chạy bằng `scripts/eslint-ui-guidelines.config.mjs` vì cấu hình lint hiện tại chỉ nhận TS/TSX.

Đã kiểm tra trên ứng dụng thật: route trực tiếp/reload; thêm với số tiền 0; validation bắt buộc; loading khóa Lưu/Hủy/Đóng; sửa cập nhật bảng; xóa qua xác nhận; khôi phục mẫu; tìm kiếm; chọn 5 dòng/bỏ chọn; cảnh báo chưa lưu; Escape menu trả focus; clipboard chứa code đúng; đo hàng 28px/control 32px/popup 640px. Các kiểm tra bổ sung được ghi trong `docs/ui-guidelines-qa.md`.

Viewport 390×844 được kiểm tra bằng ứng dụng thật trong iframe của fixture QA cục bộ, không phải phiên thiết bị cảm ứng thật. Chưa kiểm tra screen reader thật, mọi trình duyệt hay toàn bộ luồng nghiệp vụ ngoài phạm vi. Không chạy build toàn ứng dụng vì source và bundle đang phục vụ khác phiên bản.

## Cập nhật primary theo sidebar — 21/10/2026

Theo yêu cầu người dùng, hệ primary chuyển sang xanh dương #2563eb, nền chọn #eff6ff. Đã đọc computed token --am-sidebar-active-color và --am-sidebar-active-bg trên trang Công ty đang chạy. Toàn bộ button, focus, menu, badge và dòng chọn lấy cùng semantic token mới. Giữ màu đỏ cho lỗi/xóa.

## Cập nhật input theo phép đo sale-order — 21/10/2026

Đã mở lại form thêm mới, đo text/select/date/textarea và label, rồi hủy. Input cao 32px, radius 8px, border 1px #d3d5d8, padding 5px 10px, màu chữ #242a31; label 400 13px #15191f với gap 7px. Control tái sử dụng font shell qua --am-ui-font (Inter trên bản đang chạy); textarea tham chiếu dùng 13px monospace, cao tối thiểu 68px. Focus chỉ đổi viền sang primary #2563eb, không outline/ring phụ; forced-colors vẫn có outline hệ thống. Màu hover #9ca3af theo chuẩn AMnote, chưa đo riêng trên tham chiếu. Border nhạt được giữ để khớp yêu cầu tham chiếu; không coi đó là chứng nhận WCAG toàn diện. Button và các vùng khác giữ token cũ; thay đổi chỉ ở token/component input.

## Hướng dẫn dùng bằng prompt

Trên trang Guidelines, chọn mục **00 · Dùng bằng prompt** hoặc nút **Tạo bằng prompt** ở đầu trang. Chọn thành phần (Thêm mới, Lưu, Hủy, Xóa, text, number, date, select, lookup, textarea, checkbox hoặc switch), nhập nhãn hiển thị, vị trí/trang cần đặt và yêu cầu bổ sung. Preview và prompt cập nhật theo lựa chọn. Bấm **Sao chép prompt**, dán vào cuộc trò chuyện AI đang mở đúng dự án AMnote rồi yêu cầu thực hiện. Prompt chỉ dẫn component thực tế, token, validation, trạng thái thao tác và giữ handler/API/quyền gốc. Preview không tự sửa ứng dụng hoặc gọi API nghiệp vụ. Các mục Button và Input có liên kết quay lại trình tạo prompt.


## Cài đặt cột mục 05 — 22/10/2026

Đã mở trực tiếp panel tại https://app.amnote.com.vn/demo/xanh/production/sale-order (trang có nhãn Bản local): header/nút đóng riêng, tìm kiếm, danh sách tên gốc/tên hiển thị/độ rộng/ghim/tay nắm kéo, footer mặc định/hủy/lưu. Đóng bằng Hủy, không lưu tham chiếu. Giữ primary xanh dương theo AMnote.

Source cũ ReceiptTableDemo chỉ có ẩn/hiện, Số chứng từ bắt buộc hiện. Thay popup checkbox bằng AMColumnSettings riêng; dùng Phosphor đã cài, đối chiếu qua Better Icons, không thêm thư viện runtime. Panel rộng tối đa 800px, cao 100dvh, mobile toàn chiều rộng; header/footer không co, body cuộn độc lập. Mỗi dòng có tên gốc, tên hiển thị, rộng, ghim, tay nắm và nút lên/xuống. Toolbar chỉ đổi icon Columns sang GearSix light, giữ cấu trúc/thứ tự/cách overflow hiện tại.

- Bản nháp được sao từ cấu hình hiện hành khi mở. Hủy/Đóng/Escape bỏ mọi thay đổi; Mặc định chỉ khôi phục bản nháp. Áp dụng validation rồi mới cập nhật bảng.
- Ẩn/hiện giữ cột bắt buộc; tìm kiếm theo tên gốc/tên hiển thị, không dấu. Hiển thị tất cả áp dụng toàn danh sách, không riêng kết quả tìm kiếm.
- Tên hiển thị trim, 1–80 ký tự; độ rộng nguyên 80–600px, có lỗi dưới dòng, focus về trường lỗi.
- Ghim thật bằng sticky trái; cột ghim đứng trước, giữ thứ tự tương đối trong mỗi nhóm; offset cộng độ rộng các cột ghim trước cộng 40px vùng chọn.
- Thứ tự bằng drag/drop hoặc nút lên/xuống và Alt + ↑/↓ trên tay nắm; vẫn dùng toàn danh sách khi đang tìm. Có thông báo live khi đổi thứ tự.
- Cấu hình chỉ sống trong state demo, reload trở lại mặc định; không ghi API hay dữ liệu nghiệp vụ. Trang thật phải kiểm tra/nối handler grid và phân quyền gốc.

Source: src/components/amnote/ui/AMColumnSettings.jsx, column-settings.css, column-settings-model.mjs; tích hợp ReceiptTableDemo.jsx. Source đầy đủ và prompt Bảng · Cài đặt cột nằm trong Guidelines. Báo cáo kiểm tra riêng: docs/ui-guidelines-column-settings-qa.md.


## Nhập Excel mục 05 (22/10/2026)

Popup fullscreen bốn bước dùng `ReceiptImportWizard.jsx`, `receipt-import-model.mjs`, `receipt-import.css`. Tham khảo bố cục và tương tác sale-order; xử lý Excel thật bằng xlsx có sẵn, chỉ ghi bộ nhớ Phiếu thu sau xác nhận. Giới hạn 5MB/500 dòng, chọn sheet/tiêu đề, ánh xạ bắt buộc, báo lỗi từng dòng và bỏ qua số chứng từ trùng. Kết quả phản ánh chính xác số đã nhập/bỏ qua/lỗi. Không gọi API nghiệp vụ. Source đầy đủ có trong các khối sao chép của mục 05. Xem `docs/excel-import-testing.md` để chạy kiểm thử và xem ảnh.
