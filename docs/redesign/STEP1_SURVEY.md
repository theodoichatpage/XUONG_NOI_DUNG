# Redesign Xưởng Truyện — Bước 1: Khảo sát (06/11/2026)

## Vì sao Chương 3 (78/100) hiện "Đã duyệt"

Dữ liệu thật (đọc, không sửa) của "The Ashen Crown":

| Chương | status | Điểm | Duyệt lúc | Chấm lúc | Ghi chú |
|---|---|---|---|---|---|
| 1 | live | chưa chấm | 04/11 06:26 | — | đã đăng 05/11, chưa từng chấm |
| 2 | live | chưa chấm | 04/11 06:42 | — | đã đăng 05/11, chưa từng chấm |
| 3 | approved | **78** | **05/11 02:59** | **05/11 06:49** | duyệt **trước** khi chấm 4 giờ |
| 4 | approved | chưa chấm | 05/11 02:59 | — | duyệt cùng phút với Ch.3, chưa từng chấm |
| 5–7 | review | chưa chấm | — | — | |

Nguyên nhân trong mã:

1. **Nút "✓ Duyệt chương" không kiểm điểm.** `uiChapterApprove` (dist/studio-ui.js) chỉ kiểm tra chương có nội dung và không có việc ChatGPT đang chạy, rồi đặt `status='approved'`. Không đòi điểm, không đòi đã chấm.
2. **Chấm điểm sau khi duyệt không đổi trạng thái.** Kết quả chấm ghi vào `c.aiReview`; không có gì so điểm với trạng thái đã duyệt. Vòng điều phối (`uiQaTick`) bỏ qua chương `approved`/`live`.
3. **Một trường `status` gánh hai nghĩa**: chất lượng và xuất bản (`idea, draft, review, approved, live`). "live" ngầm hiểu là đã duyệt.
4. **Cổng điểm khi đăng chỉ là hỏi xác nhận** (`uiScoreGate` → "Vẫn tiếp tục đăng?"), nên Ch.1–2 được đăng khi chưa chấm.

## Hiện trạng mã

- Ứng dụng tĩnh `dist/` (Vercel), không backend. Toàn bộ dữ liệu ở localStorage `xuong-noi-dung-v1` (một object `db`); `save()` ghi cả `db`. Có Sao lưu JSON (`backup()` trong app.js) và Nhập.
- `dist/studio-ui.js` (216 KB, ~190 hàm `ui*`): giao diện mới, Xưởng Truyện 4 bước (`uiStorySteps`, `uiStoryProduce`, `uiStoryReview`, `uiStoryBatch`…).
- `dist/story-longform-v2.js`: pipeline truyện, `lfSend` (việc ChatGPT), chấm v3 (`lfValidateChapterReview`, 7 tiêu chí, `critical_errors`).
- `dist/chatgpt-bridge.js`: Bridge ChatGPT (`bridgeConnectionState` kiểm tra thật).
- Sudowrite Adapter (extension riêng, 0.7.1): hợp đồng `shared/schemas/*` (brief, status, review…), Xưởng gọi qua `xpCall`.
- AI Manager (repo riêng): `/api/story/*`, Adapter nối qua mã ghép đôi.

## Dùng lại được

| Cần cho thiết kế mới | Có sẵn |
|---|---|
| Phân tích nguồn, Story Bible, nhân vật, dàn ý | pipeline bước 1–2 (`lfSend` GENERATE_*), tự duyệt (`uiAutoApproveTick`) |
| Hàng đợi chương, tạm dừng/tiếp tục/dừng | `s.uiBatch` + `uiBatchStart/Step` (ChatGPT), Adapter run (pause/resume/retry) |
| Chấm 85, sửa tối đa 3 vòng, "Cần bạn xem" | `uiQaTick`, `c.qa` (round, scores, status), `uiChapterScore` |
| Sudowrite viết/sửa tự động | `uiSudoSend(..,{auto})`, `uiSudoResult`, `uiSudoStatus` |
| Trạng thái kết nối | `uiStatusChips` (ChatGPT, Adapter), popup Adapter (Manager, Sudowrite health) |
| Lịch sử phiên bản | `c.history` (30 bản), `bodyRevision` |
| Đăng Webnovel | Inkstone fill qua Adapter (`XP_FILL_LISTING`), lịch đăng |

## Đề xuất cho các bước tiếp theo

- **Trạng thái mới** (thêm trường, không xóa `status` cũ để các màn hình cũ vẫn chạy):
  `quality_status`: draft · reviewing · revision_required · approved · human_review
  `publication_status`: unpublished · ready · publishing · published · publish_failed
- **Dữ liệu cũ** (không hạ cấp, không sửa nội dung): Ch.1–2 → `published` + cờ `legacy_unreviewed`; Ch.3 → giữ duyệt cũ nhưng gắn `recheck` (78 < 85); Ch.4 → `recheck` (chưa chấm). Sao lưu JSON tự động trước khi chuyển.
- **Cổng duyệt cứng**: chỉ duyệt khi chấm trên đúng phiên bản hiện tại, ≥ 85, không có lỗi nghiêm trọng. Duyệt = lưu bản bất biến + `publication_status=ready`. Đăng Webnovel luôn hỏi xác nhận.
- **Giao diện 3 khu vực** (Chuẩn bị · Sản xuất · Duyệt & đăng) thay 4 bước; màn hình chi tiết giữ các phần nâng cao hiện có.
