# Sudowrite Adapter — đã kiểm thật hay chỉ giả lập (0.7.2, 06/11/2026)

Nguồn sự thật cho từng chức năng. **Kiểm thật** = chạy trên editor.sudowrite.com thật, dự án thử "XUONG TEST Adapter", và kiểm lại sau khi tải lại trang. **Giả lập** = chỉ kiểm trên trang Sudowrite giả lập (`tests/fixtures/sudowrite-mock.html`, có nhãn MOCK) vì bước đó cần credit. Không có bước nào vượt qua giới hạn credit của Sudowrite.

## Story Bible (không tốn credit)

| Chức năng | Trạng thái | Bằng chứng |
|---|---|---|
| Braindump, Genre, Synopsis | **Kiểm thật** (05–06/11) | điền + đọc lại sau tải trang |
| Characters: thêm thẻ trống ("Blank Character") | **Kiểm thật** (06/11) | menu Radix: mở bằng pointerdown, chọn bằng di chuột vào mục rồi nhả |
| Characters: tên + 7 ô (Personality, Motivations, Internal Conflict, Strengths, Weaknesses, Character Arc, Physical Description) | **Kiểm thật** (06/11) | Elias Vane 7/7, Silas Reed 7/7, Mara Quinn 6/6 sau tải trang |
| Worldbuilding: thẻ trống + tên + mô tả | **Kiểm thật** (06/11) | 2 thẻ sau tải trang |
| Outline: thêm chương + tên + tóm tắt | **Kiểm thật** (05–06/11) | Chapter 2, 3 sau tải trang |
| Không bao giờ bấm Generate / Surprise Me trong menu thẻ | **Kiểm thật** + test tĩnh | chỉ chấp nhận mục bắt đầu bằng "Blank" trong menu vừa mở |
| Style | **Chưa tự động** (dán tay) | — |
| Đọc Story Bible từ Sudowrite về Xưởng | **Chưa xây** | — |

Lỗi tìm ra khi kiểm thật và đã sửa: menu chọn nhầm danh sách chương của nút Start; click giả không chọn được mục menu Radix; ô nhân vật chỉ hiện khi nhãn của chính ô đó cuộn vào màn hình (trước đây bị bỏ qua lặng lẽ); gõ nhanh làm mất ô chưa kịp lưu; danh sách Worldbuilding lặp lại nhân vật.

## Viết chương tự động

| Bước | Trạng thái | Ghi chú |
|---|---|---|
| Giao việc Xưởng → Adapter, bảng tiến trình, tạm dừng / tiếp tục / thử lại / bỏ | **Kiểm thật** (06/11) | |
| Thêm chương vào Outline | **Kiểm thật** (06/11) | |
| Start (nút chung dưới Outline + chọn chương) → tài liệu chương — chọn chương bằng click thường vào `PickerContainer .option`: **Kiểm thật** (06/11 chiều); engine 0.7.4 dùng cách này | **Kiểm thật** (06/11, bấm tay + engine mở tài liệu); chọn chương bằng engine: **Giả lập** | lần chạy thật Start được bấm tay vì engine 0.7.0 chưa biết nút chung |
| Mở Generate a Rough Draft | **Kiểm thật** (06/11, engine) | |
| Generate Scenes: bấm, nhận "đang chạy", chờ xong | **Kiểm thật** (06/11, engine) | tốn credit; cảnh được sinh |
| Hết credit → dừng, báo Xưởng, không thử lại | **Kiểm thật** (06/11) | "You've used all your credits…" |
| Tải lại tab sau khi Adapter cập nhật | **Kiểm thật** (06/11) | |
| Plan Draft → Generate Draft, nhận biết viết xong | **Giả lập** | cần credit |
| Đọc chương về Xưởng | **Giả lập** (mock) / **Kiểm thật** ở chế độ bán tự động (05/11) | |
| Vòng sửa: ghi việc cần sửa vào Outline, xóa bản nháp của Adapter, viết lại | **Giả lập** | cần credit |
| Tải lại trang giữa lúc Generate Draft → không bấm lại | **Giả lập** | |
| Nút Write (viết tiếp) | Kiểm thật thủ công (05/11), **chưa dùng trong engine** | |

## Xưởng

| Chức năng | Trạng thái |
|---|---|
| Tạo truyện thử, concept, Story Bible, nhân vật, dàn ý bằng ChatGPT (Bridge) | **Kiểm thật** (06/11) |
| ChatGPT chấm chương (7 tiêu chí) | **Kiểm thật** (06/11, 83/100) |
| Tự tạo yêu cầu sửa khi < 85 | **Kiểm thật** (06/11, 12 việc) |
| Vòng sửa qua Sudowrite tối đa 3 lần → "Cần bạn xem" | **Giả lập** (mock 15/15) |
| Popup chọn nơi viết (Xưởng / Sudowrite) khi tạo truyện | **Kiểm thật** trên production (06/11) |
| ChatGPT chấm Story Bible (REVIEW_BIBLE) | **Kiểm thật** (06/11): truyện TEST 75/100, 5 mâu thuẫn, 0 lỗi nghiêm trọng |
| Sudowrite hết credit → ChatGPT viết / sửa thay (mặc định bật, tắt được trong Cài đặt) | **Kiểm thật** (06/11 13:49–13:55, truyện TEST Chương 2): Adapter 0.7.4 dừng out_of_credits, không bấm nút tốn credit → Xưởng ghi nhận hết credit → ChatGPT viết 1.282 chữ → ChatGPT chấm 77 (2 lỗi nghiêm trọng) → ChatGPT sửa vòng 1 (1.640 chữ, bản cũ giữ trong lịch sử) → chấm lại tự động. Cũng có giả lập + 5 test đơn vị |
| Việc tự động tiếp theo đi thẳng sang ChatGPT khi đã biết hết credit; kiểm tra credit thật > 0 thì quay lại Sudowrite | **Giả lập** + test đơn vị |

## Khi nào cần mua credit

Chỉ để kiểm thật 4 dòng "Giả lập" của phần viết chương (Plan/Generate Draft, đọc chương về, vòng sửa, tải lại giữa chừng). Mọi phần còn lại đã chạy được hoặc kiểm được mà không cần credit.

## Ghi nhận thêm 06/11 (chiều)

- Khi hết credit, Sudowrite **ẩn** nút Generate Scenes (chỉ còn Add Scenes). Từ 0.7.4 Adapter kiểm tra thông báo hết credit trước khi tìm nút, nên dừng đúng mã out_of_credits (để Xưởng chuyển sang ChatGPT).
- "+ Thêm" chương trong truyện Sudowrite: **Kiểm thật** — thêm chương trống, 0 việc ChatGPT.
- Tạo tài liệu bằng Start + mở Rough Draft bằng engine: **Kiểm thật** (Chương 2 truyện TEST).

## Inkstone — điền chương (0.8.0, 06/11/2026)

| Chức năng | Trạng thái |
|---|---|
| Trang tạo chương `/novels/chapter/create/<mã truyện>`: ô "Title Here", TinyMCE trong iframe (cùng nguồn, đoạn `<p>`), nút save / publish | **Khảo sát thật, chỉ đọc** (truyện The Ashen Crown; không tạo nháp: Draft vẫn 0) |
| Adapter điền tiêu đề + nội dung qua TinyMCE của trang, không bấm save/publish | **Giả lập** (Chromium + extension thật + trang Inkstone giả lập, 6/6) + 5 test đơn vị |
| Hộp thoại publish / hẹn giờ của Inkstone | **Chưa khảo sát** — chỉ thấy được khi đăng một chương thật |
