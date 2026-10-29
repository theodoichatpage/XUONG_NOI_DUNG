# Xưởng Nội Dung 0.2.0

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
