# Xưởng tự động: sản xuất → kiểm duyệt → đăng → lịch 2 ngày/lần

Mục tiêu: bạn chỉ nhập nguồn, duyệt Story Bible một lần, bật "Tự động" cho truyện; sau đó chỉ nhìn **trạng thái** và **lỗi**.

## Đã có (06/11/2026)

| Khâu | Trạng thái |
|---|---|
| Dựng truyện: concept → cốt truyện → nhân vật → dàn ý (ChatGPT) | Chạy; có "Tự duyệt các bước" |
| ChatGPT chấm Story Bible | Chạy (kiểm thật) |
| Đưa Story Bible lên Sudowrite (trừ Style) | Chạy (kiểm thật) |
| Viết chương: Sudowrite tự động; hết credit → ChatGPT viết thay | Chạy (Generate Draft của Sudowrite mới giả lập) |
| Chấm chương 7 tiêu chí, sửa tối đa 3 vòng, rồi "Cần bạn xem" | Chạy (kiểm thật với ChatGPT) |
| Hồ sơ truyện Webnovel → điền form Inkstone | Chạy, bạn tự bấm CREATE |
| Đăng chương lên Webnovel | **Thủ công** (sao chép) |
| Lịch đăng | Chỉ ghi ngày dự kiến, **không tự chạy** |

## Còn thiếu — theo thứ tự nên làm

1. ✅ **Xong 06/11 (8c9c201)** — **Tách trạng thái chất lượng / xuất bản** (Bước 1 khảo sát đã chỉ lỗi Chương 3 = 78 vẫn "Đã duyệt"). Cổng duyệt cứng: ≥ 85, không lỗi nghiêm trọng, chấm đúng phiên bản. Đây là điều kiện để cho máy tự duyệt và tự đăng an toàn.
2. ✅ **Xong 06/11 (6d83272)**, kiểm thật trên truyện TEST: bật → ChatGPT viết Chương 3 (Sudowrite hết credit) → tự gửi chấm — **Chế độ Tự động cho từng truyện (Autopilot)**: chọn số chương mỗi đợt (vd. 2), giữ sẵn N chương đạt chuẩn trong kho (vd. 4); Xưởng tự viết → chấm → sửa → duyệt khi đạt; chương không đạt sau 3 vòng vào "Cần bạn xem" và đợt vẫn chạy tiếp chương sau (không chặn cả truyện).
3. **Đăng chương lên Webnovel qua Adapter**: khảo sát trang tạo chương của Inkstone (chưa làm), rồi Adapter điền tên + nội dung chương và dùng **lịch phát hành của chính Inkstone** (hẹn giờ đăng). Như vậy đến giờ đăng máy không cần mở. Bật theo từng truyện, lần đầu bạn xác nhận; sau đó tự đăng theo lịch.
4. **Bộ hẹn giờ 2 ngày/lần**: Xưởng là trang web nên chỉ chạy khi tab mở. Dùng **AI Manager** (luôn chạy trên máy) làm đồng hồ: đến hạn → Adapter mở tab Xưởng → Xưởng chạy Autopilot cho đợt đó → báo kết quả về Manager. Máy cần bật, Chrome mở (không cần mở tab Xưởng).
5. **Bảng trạng thái & lỗi** (trang Tổng quan): mỗi truyện một dòng — đang làm gì, đợt tiếp theo lúc nào, chương nào chờ bạn, lỗi gần nhất và cách xử lý (hết credit, mất kết nối ChatGPT, Webnovel đăng xuất…). Chuông thông báo dẫn thẳng tới lỗi.
6. **Style vào Sudowrite** và **Plan/Generate Draft thật**: cần credit Sudowrite để kiểm thật; không chặn các bước trên vì đã có ChatGPT viết thay.

## Rủi ro cần bạn biết

- Điều khoản Webnovel/Inkstone về đăng tự động: Adapter thao tác như người dùng trên trình duyệt của bạn, ở nhịp người; không dùng API nội bộ.
- ChatGPT Plus có giới hạn lượt; mỗi chương tốn ~2–4 lượt (viết, chấm, sửa). Autopilot sẽ tự giãn nhịp khi bị giới hạn.
- Máy và Chrome phải bật vào giờ chạy đợt; giờ đăng thì do Inkstone giữ.
