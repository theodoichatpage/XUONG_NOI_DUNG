# Xưởng ChatGPT Bridge 0.4.0

## Cài trên Chrome hoặc Microsoft Edge máy tính

1. Giải nén ZIP vào một thư mục cố định. Không chọn cả ZIP.
2. Chrome: mở `chrome://extensions`; Edge: `edge://extensions`.
3. Bật **Chế độ nhà phát triển** → **Tải tiện ích đã giải nén** → chọn thư mục chứa `manifest.json`.
4. Tải lại trang Xưởng và tab ChatGPT sau khi cài. Đăng nhập ChatGPT như bình thường.
5. Mở biểu tượng extension, chọn đúng tab ChatGPT → **Kết nối tab đã chọn**.
6. Xưởng → tab **ChatGPT** → **Kiểm tra kết nối**.

## Viết truyện

- Thêm kênh, tạo bộ truyện và chương trong Xưởng.
- Điền dàn ý, nhân vật, giọng văn và yêu cầu viết.
- Mở chương → **Viết bằng ChatGPT**. Xưởng lưu nội dung hiện tại trước khi chuyển.
- Ở ChatGPT, kiểm tra câu lệnh rồi **tự bấm Gửi**. Không xóa mã `[XUONG_JOB:...]`.
- Extension chờ câu trả lời hoàn tất và gửi về Xưởng. Mở tab ChatGPT trong lúc xử lý.
- Nếu bản nháp không thay đổi trong lúc chờ, kết quả vào bài và chuyển Chờ duyệt. Nếu đã chỉnh sửa hoặc bài đã duyệt/đã đăng, kết quả giữ riêng trong tab ChatGPT của Xưởng để bạn áp dụng.
- Không tự xuất bản nội dung.

## Tạo ảnh

- Xưởng → Hình ảnh → Chuẩn bị ảnh → nhập phong cách, nội dung và tỷ lệ.
- Bấm **Tạo ảnh bằng ChatGPT**, kiểm tra rồi tự bấm Gửi trong tab ChatGPT.
- Khi tìm được ảnh hoàn tất trong đúng câu trả lời, extension thử tải ảnh hiển thị về Xưởng, giữ bản gốc và tạo ảnh xem trước. Ảnh luôn Chưa duyệt.
- Ảnh trên 5 MB, URL ảnh không hỗ trợ, blob, giới hạn tài khoản hoặc giao diện mới có thể không nhận tự động. Khi đó tải ảnh trong ChatGPT rồi nhập vào đúng yêu cầu ảnh trong Xưởng.

## Khôi phục và xử lý lỗi

- ChatGPT đã hoàn tất nhưng Xưởng chưa nhận: bấm **Nhận kết quả hoàn tất** trên bảng nổi của extension; Xưởng → ChatGPT → **Nhận lại kết quả**.
- Tải lại ChatGPT: extension tiếp tục theo công việc và mã đã lưu; không tự gửi lại yêu cầu, tránh tạo trùng.
- Xưởng đóng/mở lại: kết quả lưu tạm trong extension; mở lại cùng nguồn trang và bấm Nhận lại. Giữ dữ liệu Xưởng; không xóa dữ liệu trình duyệt khi còn công việc.
- Ô nhập có chữ chưa gửi: extension không ghi đè. Gửi/xóa thủ công, dừng công việc rồi gửi lại từ Xưởng.
- Muốn đổi hội thoại: dừng đồng bộ trước, chọn tab mới trong popup.
- Dừng đồng bộ không bấm nút Dừng của ChatGPT. Dừng tại ChatGPT nếu cần.
- Chỉ một công việc tại một thời điểm; không có cron chạy khi trình duyệt đóng.

## Phạm vi và quyền

Dùng giao diện ChatGPT, không gọi API tạo văn bản/ảnh, không cần API key. Giới hạn của gói ChatGPT vẫn áp dụng. Đây là cầu nối trình duyệt tự xây dựng, không phải tích hợp chính thức của OpenAI và có thể cần sửa khi giao diện ChatGPT thay đổi.

Quyền `tabs` để chọn tab, `storage` để giữ công việc/kết quả, quyền trang ChatGPT và oaiusercontent để đọc/tải đúng ảnh trả lời. Không đọc mật khẩu, không lưu cookie/token, không gửi về máy chủ bên thứ ba. Không tự đăng nhập hoặc vượt giới hạn sử dụng. Chỉ thu nhận câu trả lời theo sau tin nhắn chứa đúng mã công việc.

Dữ liệu Xưởng và ảnh gốc vẫn nằm trên thiết bị. Sao lưu JSON không kèm file gốc trong IndexedDB; tải file gốc riêng. Extension có thể tạm giữ câu trả lời và một ảnh tối đa 5 MB cho đến khi Xưởng xác nhận nhận được.

## Kiểm tra đã thực hiện

14 kiểm thử tự động cho điều phối, chọn hội thoại, chặn nguồn lạ, công việc trùng, phục hồi kết quả, hủy, xử lý URL ảnh, parse truyện và bảo vệ bản nháp. Kiểm tra cú pháp JavaScript.

Chưa kiểm thử end-to-end trên tài khoản ChatGPT thật với extension được cài. Cần một lượt viết chương và tạo ảnh trên Chrome/Edge của người dùng để xác minh selector giao diện hiện tại; không cam kết nhận mọi định dạng ảnh tự động.
