'use strict';
/* Keep the Xưởng Truyện production workspace visible even before the first real series exists. */
(function(){
  function renderEmptyStoryWorkspace(){
    if((location.hash.slice(1)||'overview')!=='series'||!window.db||db.series.length)return;
    const main=document.querySelector('#main');
    if(!main)return;
    main.innerHTML=`<div class="u-workspace u-story-empty-reference">
      <aside class="u-library">
        <h2>Bộ truyện của tôi</h2>
        <button class="primary" data-new="series">＋ &nbsp;Tạo truyện mới</button>
        <div class="u-library-items"><div class="u-empty-library">Chưa có bộ truyện.</div></div>
        <div class="u-library-foot">▱ &nbsp; Chọn truyện để sản xuất tiếp</div>
      </aside>
      <section class="u-studio">
        <div class="u-page-heading"><div><h1>Xưởng Truyện</h1><p>Từ ý tưởng đến bộ truyện hoàn chỉnh, sản xuất từng đợt chương.</p></div><small>Bản thiết kế tham khảo • Dữ liệu của bạn</small></div>
        <div class="u-tabs"><button class="active">Sản xuất truyện</button><button>Kết nối đăng truyện</button></div>
        <div class="u-card u-book-panel u-empty-book-panel">
          <div class="u-card-head"><h2>Bộ truyện mới</h2><span class="u-badge muted">Chưa triển khai</span></div>
          <div class="u-steps"><span class="active"><b>1</b> 1. Ý tưởng & nguồn</span><i></i><span><b>2</b> 2. Cốt truyện & nhân vật</span><i></i><span><b>3</b> 3. Sản xuất chương</span></div>
          <section class="u-section u-source">
            <h3>Ý tưởng & nguồn tham khảo</h3>
            <div class="u-source-grid">
              <label>Ý tưởng chính của truyện<textarea id="uFirstStoryIdea" placeholder="Nhập chủ đề hoặc ý tưởng chính của bộ truyện..."></textarea></label>
              <div><label>Link truyện / YouTube tham khảo (tùy chọn)<input id="uFirstStoryLink" placeholder="Dán link tham khảo hoặc bổ sung transcript..."></label><label>Câu lệnh văn phong cá nhân (tùy chọn)<textarea id="uFirstStoryStyle" placeholder="Để trống để ChatGPT tự đề xuất văn phong phù hợp"></textarea></label></div>
            </div>
            <div class="u-spread"><button class="primary" data-new="series">Xây dựng / cập nhật cốt truyện</button><small>Nhập ý tưởng trước, sau đó tạo bộ truyện để bắt đầu xây dựng.</small></div>
          </section>
          <section class="u-section u-story-details u-empty-disabled">
            <div class="u-card-head"><h3>Cốt truyện & nhân vật</h3><button disabled>✎ &nbsp;Chỉnh sửa</button></div>
            <div class="u-detail-columns"><div><b>Cốt truyện tổng quan</b><div class="u-story-synopsis">Cốt truyện sẽ xuất hiện tại đây sau khi bạn tạo và xây dựng bộ truyện.</div><b>Twist & nút thắt</b><div class="u-twists"><p>□ &nbsp;Các nút thắt sẽ được ChatGPT đề xuất để bạn duyệt.</p><p>□ &nbsp;Các sự kiện đã duyệt sẽ được giữ nguyên.</p></div></div><div><b>Nhân vật</b><div class="u-empty-characters">Nhân vật sẽ xuất hiện tại đây sau khi xây dựng cốt truyện.</div></div></div>
            <div class="u-alert">● &nbsp; Tạo bộ truyện để bắt đầu xây dựng Story Bible, nhân vật và tuyến truyện.</div>
          </section>
          <section class="u-section u-empty-disabled">
            <h3>Sản xuất đợt tiếp theo</h3>
            <small>Chưa có chương • Hoàn thiện và duyệt cốt truyện trước khi sản xuất.</small>
            <div class="u-empty-batch"><label>Số chương đợt này<input value="10" disabled></label><label>Hướng phát triển<select disabled><option>Tiếp tục câu chuyện</option></select></label><button class="primary" disabled>Sản xuất 10 chương</button></div>
            <label>Yêu cầu bổ sung cho đợt này (tùy chọn)<input disabled placeholder="Ví dụ: đẩy mạnh xung đột giữa các nhân vật..."></label>
          </section>
        </div>
      </section>
    </div>`;
  }
  function apply(){setTimeout(renderEmptyStoryWorkspace,0)}
  addEventListener('hashchange',apply);
  addEventListener('load',apply);
  document.addEventListener('click',e=>{if(e.target.closest('[data-go],[data-ui-open],[data-new]'))setTimeout(renderEmptyStoryWorkspace,30)});
  apply();
})();