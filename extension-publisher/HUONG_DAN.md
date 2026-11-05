# Xưởng Publisher 0.3.1 (Webnovel + Sudowrite)

Extension riêng, chạy cạnh Xưởng ChatGPT Bridge. Nhiệm vụ: điền **hồ sơ truyện** từ Xưởng vào form tạo truyện của Inkstone.

## Cài đặt (Chrome / Edge / Cốc Cốc)
1. Tải ZIP từ trang Tải của Xưởng, giải nén vào một thư mục cố định (ví dụ `Downloads\Xuong_Webnovel_Publisher`).
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
- Xưởng → bước 2 → tab **Sudowrite** → **Điền vào Sudowrite**: chuyển sang dự án Sudowrite đang mở và điền **Braindump, Genre, Synopsis, Characters, Worldbuilding, Outline**. Thẻ nhân vật / thế giới / chương còn thiếu được tạo trống (Blank Character, Add Element, Add Chapter) rồi điền; không bấm Generate nên không tốn credit. Mục đã có nội dung được giữ nguyên, trừ khi bấm **Điền & ghi đè**. Style: bấm Sao chép trong Xưởng rồi dán vào Style → Custom.
- Xưởng → bước 3 → **Lấy từ Sudowrite**: đọc tài liệu đang mở trên Sudowrite và đưa vào chương đang chọn (bản cũ giữ trong lịch sử). Extension không bấm Write/Generate, không tiêu credit Sudowrite.
