# Xưởng Nội Dung 0.3.0

Ứng dụng vận hành nội dung cá nhân, tiếng Việt, Arial, giao diện sáng/tối, chạy không cần cài thư viện.

## Chạy

Mở `dist/index.html` hoặc chạy `python -m http.server 8080 --directory dist`, rồi mở http://localhost:8080.
Vercel: Framework Other, không build, Output Directory `dist`.

## Có thể dùng

- Kênh: tạo/sửa/xóa, chủ đề, giọng văn, phong cách ảnh.
- Nội dung: bảng 5 trạng thái/danh sách, tìm kiếm, lọc kênh/trạng thái, trình soạn, liên kết bộ truyện.
- Duyệt trước khi xếp lịch; phải lưu Đã duyệt trước khi đánh dấu Đã đăng, có link xuất bản.
- Lịch tuần/tháng, bài trễ, bài đã duyệt chưa lên lịch. Lịch nội bộ, không tự đăng.
- Bộ truyện: dàn ý, nhân vật, độ dài chương, kế hoạch ra chương, độc quyền, chương liên kết.
- Câu lệnh có biến, 4 mẫu khởi tạo. Ghép ngữ cảnh kênh, truyện và chương trước khi sao chép.
- Số liệu nhập theo ngày: doanh thu, chi phí, lượt xem tăng thêm, người theo dõi mới, tiền đã nhận/ước tính; nguồn thu tùy chỉnh.
- Tổng quan tính từ dữ liệu thật, không có dữ liệu mẫu giả.
- Xuất/nhập JSON; xuất CSV có chặn công thức bảng tính.

## Giới hạn hiện tại

Lưu localStorage trên trình duyệt/nguồn trang đang dùng, không phải máy chủ; không tự đồng bộ giữa thiết bị hay giữa các tên miền. Xóa dữ liệu trình duyệt sẽ mất dữ liệu nếu không sao lưu. Sao lưu trước khi đổi tên miền hoặc chuyển môi trường.

Chưa có đăng nhập ứng dụng, database máy chủ, AI streaming, cron, OAuth hoặc API đăng bài. Không có nút giả thành công cho các kết nối này. Soạn prompt và sao chép sang ChatGPT/Claude thủ công, dán kết quả vào trình soạn. Không lưu khóa bí mật, mật khẩu hoặc thông tin ngân hàng trong bản này.

## Cấu trúc

- `dist/index.html`: khung giao diện
- `dist/style.css`: thiết kế responsive/sáng tối
- `dist/app.js`: dữ liệu, thao tác, kiểm tra trạng thái và báo cáo
- `.openai/hosting.json`: cấu hình triển khai Sites

Nguồn này là nền tảng hoạt động cho giai đoạn 1; các kết nối máy chủ và nền tảng cần triển khai tiếp.

## Cập nhật 0.2.0

- Đóng popup trực tiếp bằng X, Hủy hoặc Escape, giữ bản nháp chưa lưu trong phiên để mở lại. Không dùng window.confirm/window.prompt trong khung nhúng.
- Tab Đăng bài: hàng đợi duyệt, sao chép bài, mở kênh, ghi nhận link.
- Tab Theo dõi: bài chậm lịch, thống kê kênh và nhật ký xuất bản.
- Tab Tạo ảnh: lưu prompt, ghép ngữ cảnh, nhập JPG/PNG/WebP kết quả từ AI thủ công; ảnh lưu được thu nhỏ tối đa 1200 px, giữ bản gốc riêng.
- Pinterest: ghim, board, mô tả, link đích, ảnh, trạng thái duyệt, link xác nhận.
- Etsy: sản phẩm, giá, tiền tệ, loại sản phẩm, thông số, 13 tag và link listing. Kiểm tra 13 tag khi duyệt.
- Gói nội dung có thể sao chép hoặc tải JSON, mở trang nền tảng để đăng thủ công. Chưa có tự đăng, AI tạo ảnh tự động hoặc đồng bộ số liệu qua API.

## Cập nhật 0.3.0 — luồng vận hành liên kết

- Menu nhóm Điều hành / Sản xuất / Phân phối / Kết quả / Hệ thống, bỏ số thứ tự.
- Xuất bản gom hàng đợi và lịch tuần/tháng; đường dẫn lịch cũ vẫn mở được.
- Kênh có đối tượng, ngôn ngữ, tần suất, khung giờ, quy tắc và mẫu mặc định.
- Bài viết có định dạng, nội dung gốc, số chương, ảnh đã duyệt; chuyển sang ảnh, phiên bản, Pinterest/Etsy từ nội dung đã lưu.
- Giữ 30 phiên bản chỉnh sửa gần nhất; có thể đưa bản cũ vào trình soạn rồi lưu.
- Bộ truyện có giới thiệu, thế giới, tóm tắt diễn biến, hồ sơ và chương.
- Hình ảnh có thư viện, duyệt ảnh, prompt hai lớp; không duyệt khi chưa có ảnh kết quả. Pinterest yêu cầu ảnh đã duyệt 2:3 khi duyệt gói.
- File ảnh gốc nhập từ bản này được giữ nguyên trong IndexedDB tại thiết bị, tải riêng bằng Tải ảnh gốc. JSON sao lưu chỉ gồm ảnh xem trước, không gồm file gốc.
- Theo dõi theo từng nội dung/gói: xem, thích, bình luận, chia sẻ, nhấp link, ngày ghi nhận. Dữ liệu là số tăng thêm do người dùng nhập, không phải đồng bộ API.
- Mẫu câu lệnh có form điền biến và xem trước kèm ngữ cảnh kênh.

### Kiểm tra thực tế bản 0.3.0

Đã kiểm tra bằng trình duyệt: menu nhóm; tạo teaser từ bài gốc và giữ liên kết; lưu chỉnh sửa; lịch trong Xuất bản; ghi 123 lượt xem, 10 lượt thích, 7 lượt nhấp theo bài rồi tải lại vẫn hiển thị đúng; điền biến mẫu teaser và chuyển câu lệnh vào bài mới. File JS được kiểm tra cú pháp với Node.

Các thao tác OAuth, đăng tự động và tạo ảnh AI tự động chưa triển khai. Không có dữ liệu mẫu khởi tạo. Đã kiểm tra nhập ảnh PNG 2:3, duyệt ảnh và tải file gốc về; đối chiếu SHA-256 để xác minh giữ nguyên byte.

## Cập nhật 0.4.0 — ChatGPT Bridge

Mã nguồn extension nằm trong `extension/`, bản ZIP có trong `dist/downloads/`. Hướng dẫn đầy đủ tại `extension/HUONG_DAN.md`.

- Chrome/Edge desktop, chọn tab ChatGPT cụ thể; không có API key, không gọi API tạo nội dung.
- Từ trình soạn bài/chương: Viết bằng ChatGPT. Từ Hình ảnh: Tạo ảnh bằng ChatGPT.
- Extension điền yêu cầu, người dùng tự bấm Gửi. Chờ kết quả hoàn tất đúng mã công việc để nhận về.
- Mỗi lần một công việc. Giữ kết quả trong extension đến khi Xưởng xác nhận đã lưu; chống nhận trùng, sai tab, sai hội thoại; khôi phục khi tải lại.
- Không ghi đè bài vừa chỉnh sửa hoặc đã duyệt/đã đăng: giữ kết quả riêng để người dùng áp dụng. Nội dung nhận về luôn chờ duyệt.
- Thử tải ảnh từ URL ảnh đang hiển thị trong câu trả lời; giới hạn 5 MB. Không hỗ trợ mọi URL/blob/redirect. Có đường nhập ảnh thủ công.
- Giới hạn của gói ChatGPT vẫn áp dụng. Không đăng nhập tự động, không lấy mật khẩu hoặc token, không chạy khi trình duyệt đóng.

14 kiểm thử tự động chạy bằng `node --test tests/bridge.test.cjs`; JavaScript đã kiểm tra cú pháp; giao diện tab ChatGPT đã kiểm tra trên preview. Chưa kiểm thử end-to-end với extension cài trên tài khoản ChatGPT thật. Selector giao diện ChatGPT có thể cần cập nhật sau một lượt thử trên máy người dùng.
