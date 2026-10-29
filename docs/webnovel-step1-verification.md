# Bước 1 v0.5.0 — kiểm tra ngày 2026-10-29

Base HEAD: a80be84f5ef1c486facbdb148e2cf93c34e5b7db.
Nhánh: integrate-xuong-truyen-v0.5.0. PR hiện có: #1.

## Kết quả tự động

Lệnh: `node --test tests/*.test.cjs`.

- A: PASS với JSON mô phỏng: topic → concept → Bible → cast → volume/arc/chapter/scene, duyệt đúng thứ tự.
- B: PASS với JSON mô phỏng: chia nguồn không mất ký tự → DNA từng phần → tổng hợp nhiều tầng → tác phẩm mới. Chặn tên riêng nhận diện, thay đổi nguồn khi đang chạy, schema thiếu trường. Kiểm tra khác biệt sáng tạo thực tế vẫn cần output ChatGPT thật và người duyệt.
- C: PASS với JSON mô phỏng: Chương 1, summary và memory đã xác nhận đi vào context Chương 2; loại memory của revision cũ. Context có giới hạn, không gửi toàn truyện.
- D: PASS: submit form thật lưu metadata mới/revision, khóa approved/live, chặn downgrade, cho approved → live, giữ nguyên bản nguồn.
- E: PASS với JSON round-trip: source/Bible/cast/outline/memory/chapter metadata không mất. Trình duyệt xác nhận bộ truyện, nguồn script và quan hệ cha Tập → Arc còn sau tải lại.
- F: PASS mô phỏng giao thức XN và nhận JSON: đúng job/series/giai đoạn, lưu trước ACK, không ghi DNA vào body; extension bảo vệ tab/conversation, chống trùng, recovery/ACK và ảnh không bị bỏ.
- Parse toàn bộ JavaScript dist: PASS. Sửa dấu `}` thừa có sẵn trong story-workbench.js.

## Kiểm tra trình duyệt

Preview cùng source của XUONG_NOI_DUNG, dữ liệu QA riêng trên terminal.local:

- Tạo bộ truyện từ chủ đề; nguồn và số chương được lưu.
- Chuyển sang nguồn script: đúng textarea hiện/ẩn.
- Script dài 9.600 ký tự chia 2 phần theo đoạn, không bắt dán một lần vào ChatGPT.
- Popup đóng được; mở lại sau tải lại vẫn đúng bộ truyện/nguồn.
- Thêm Tập rồi Arc: danh sách cấp cha thay theo loại, lưu được đường dẫn Tập 1 › Arc 1.
- Gửi job thật tại preview trả: “Chưa thấy extension. Cài Bridge 0.4.0 rồi tải lại trang Xưởng.”

## Chưa xác nhận / điều kiện chặn merge

Phiên trình duyệt kiểm thử chưa có Xưởng ChatGPT Bridge kết nối. Chưa chạy trọn A–F bằng kết quả sinh từ ChatGPT Plus thật; chưa đánh giá chất lượng sáng tạo thực tế. Không coi kiểm thử mô phỏng là vòng end-to-end thật.

Giữ PR mở, chưa merge main và chưa deploy web chính cho đến khi vòng này được xác nhận. Không chuyển sang Bước 2. Không tạo app, server hoặc extension khác. Không đổi dữ liệu localStorage của web chính.
