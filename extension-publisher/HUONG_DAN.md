# Sudowrite Adapter 0.5.0 (Xưởng × Sudowrite × Webnovel)

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
