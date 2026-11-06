# Sudowrite Adapter 0.7.4 (Xưởng × Sudowrite × Webnovel)

Trước đây tên là "Xưởng Webnovel Publisher". Nếu đã cài bản cũ: giải nén đè vào đúng thư mục cũ rồi bấm Tải lại, hoặc gỡ bản cũ rồi cài thư mục mới.

Extension riêng, chạy cạnh Xưởng ChatGPT Bridge. Nhiệm vụ: nối Xưởng với **Sudowrite** (Story Bible, lấy chương) và điền **hồ sơ truyện** vào form tạo truyện của Inkstone.

## Cài đặt (Chrome / Edge / Cốc Cốc)
1. Tải ZIP từ trang Tải của Xưởng, giải nén vào một thư mục cố định (ví dụ `Downloads\Xuong_Sudowrite_Adapter`).
2. Mở trang quản lý tiện ích, bật Chế độ nhà phát triển, bấm **Tải tiện ích đã giải nén**, chọn thư mục có `manifest.json`.
3. Tải lại (F5) trang Xưởng.

## Dùng
1. Đăng nhập Inkstone trong cùng trình duyệt.
2. Trong Xưởng: Xưởng Truyện → Kết nối đăng truyện → Hồ sơ truyện trên Webnovel → **Điền lên Inkstone**.
3. Extension mở `inkstone.webnovel.com/novels/create` và điền: tên truyện, Novel, Leading gender, Genre, Synopsis, Tag, Abbreviation, Length, Warning notice. Bảng báo cáo góc phải cho biết ô nào đã điền, ô nào cần chọn tay.
4. Ảnh bìa: bấm **UPLOAD** và chọn file bìa 600×800 đã tải từ Xưởng.
5. Kiểm tra lại rồi **tự bấm CREATE**. Extension không bao giờ tự tạo truyện hay đăng chương.

Extension không đọc và không lưu mật khẩu. Hồ sơ chờ điền tự hết hạn sau 15 phút.

## Sudowrite (từ 0.2.0)
- Xưởng → bước 2 → tab **Sudowrite** → **Điền vào Sudowrite**: mở dự án Sudowrite gần nhất, tự mở Story Bible và điền **Braindump, Genre, Synopsis**. Ô đã có nội dung được giữ nguyên, trừ khi bấm **Điền & ghi đè**. Style, Characters, Worldbuilding, Outline: dùng nút Sao chép trong Xưởng rồi dán (tự tạo thẻ đang tắt vì chưa ổn định).
- Xưởng → bước 3 → **Lấy từ Sudowrite**: đọc tài liệu đang mở trên Sudowrite và đưa vào chương đang chọn (bản cũ giữ trong lịch sử). Extension không bấm Write/Generate, không tiêu credit Sudowrite.

## Kết nối AI Manager (từ 0.5.0)
1. Mở AI Manager (MO_AI_MANAGER.bat), vào http://127.0.0.1:8765/story → **Tạo mã ghép đôi**.
2. Bấm biểu tượng Sudowrite Adapter → nhập mã 6 số → **Ghép đôi**.
3. Popup hiện trạng thái AI Manager, Xưởng, Sudowrite, Inkstone. Adapter hỏi Manager mỗi 30 giây; lệnh sản xuất mới hiện trong mục "Lệnh từ Manager".
4. Thu hồi: trong Manager bấm **Thu hồi kết nối** (hoặc Ngắt ghép đôi trong popup).

## Viết chương trên Sudowrite (từ 0.6.0, bán tự động)
1. Xưởng → bước 3 → chọn chương → **Viết trên Sudowrite**. Adapter mở dự án Sudowrite và hiện bảng ở góc phải dưới: dàn ý chương, cuối chương trước, lưu ý canon, số chữ mục tiêu.
2. Bạn viết bằng các nút của Sudowrite (New, First Draft, Write…). Adapter không bấm các nút tốn credit.
3. Xong bấm **Gửi chương về Xưởng** trên bảng. Chương thay bản nháp trong Xưởng (bản cũ giữ trong lịch sử). Nếu tab Xưởng đang đóng, chương được giữ lại và tự về khi mở Xưởng.
4. Bước 4: ChatGPT chấm 7 tiêu chí. Chưa đạt → **Sửa trên Sudowrite** gửi danh sách việc cần sửa sang bảng Sudowrite (nội dung chương hiện tại được chép sẵn vào bộ nhớ tạm).

## Tự viết chương trên Sudowrite (từ 0.7.0, tự động — tốn credit Sudowrite)
1. Cần tài khoản Sudowrite còn credit, và dự án Sudowrite của truyện đang mở trong một tab.
2. Xưởng → bước 3 → chọn chương → **Tự viết trên Sudowrite** → xác nhận.
3. Adapter tự làm trên Sudowrite: ghi tên + tóm tắt chương vào Outline → Start → Generate a Rough Draft → Generate Scenes → Plan Draft → Generate Draft → đợi Sudowrite viết xong → gửi chương về Xưởng. Bảng góc phải dưới hiện từng bước; có nút **Tạm dừng / Tiếp tục**, **Bỏ việc này**.
4. Xưởng nhờ ChatGPT chấm. Dưới 85 điểm: Adapter ghi việc cần sửa vào Outline và cho Sudowrite viết lại, tối đa 3 vòng. Vẫn chưa đạt thì chương chuyển sang **Cần bạn xem**. Đạt thì chờ bạn duyệt; Adapter không tự đăng.
5. Khi Sudowrite báo **hết credit** hoặc trang thay đổi, việc dừng lại, Xưởng ghi lý do ở chương. Không có gì tự thử lại: xử lý xong rồi bấm **Thử lại** trên bảng Sudowrite.
6. Đừng tải lại tab Sudowrite khi Adapter đang chạy. Nếu lỡ tải lại sau lúc Adapter bấm nút tốn credit, Adapter không bấm lần nữa mà hỏi bạn: chương xong rồi thì bấm **Gửi chương về Xưởng**, chưa xong thì xóa phần viết dở rồi bấm **Thử lại**.

## Khi Sudowrite hết credit (Xưởng, từ 06/11/2026)
- Mặc định **ChatGPT viết thay**: việc tự viết / tự sửa đang chạy mà Sudowrite báo hết credit sẽ chuyển sang ChatGPT. ChatGPT vẫn chấm; dưới 85 thì ChatGPT sửa, tối đa 3 vòng, rồi "Cần bạn xem".
- Khi đã biết Sudowrite hết credit, các việc tự động sau đi thẳng sang ChatGPT. Lần kiểm tra credit thật thấy còn credit (bước 2 → Kiểm tra lại), hoặc bạn bấm **Đã nạp credit** trong Cài đặt → Sudowrite Adapter, thì quay lại dùng Sudowrite.
- Tắt / bật trong Cài đặt → Sudowrite Adapter.
