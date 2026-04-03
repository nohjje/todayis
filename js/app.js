// ===========================
// Today is... - 메인 앱
// ===========================

// ===========================
// 상태 관리
// ===========================
const state = {
  memos: [],        // 전체 메모 배열
  isStarFilter: false,  // 즐겨찾기 필터 활성 여부
  searchQuery: '',  // 검색어
  isStarring: false // 현재 입력 중인 메모의 중요 여부
};

// ===========================
// LocalStorage 키
// ===========================
const STORAGE_KEY = 'today-is-memos';
const THEME_KEY   = 'today-is-theme';
const FONT_KEY    = 'today-is-font';

// ===========================
// 초기화
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadMemos();
  renderDate();
  renderMemoList();
  bindEvents();
});

// ===========================
// 설정 불러오기 (다크모드, 글자크기)
// ===========================
function loadSettings() {
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  const font  = localStorage.getItem(FONT_KEY)  || 'medium';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-font', font);
  updateFontButtons(font);
}

// ===========================
// 메모 불러오기
// ===========================
function loadMemos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  state.memos = raw ? JSON.parse(raw) : [];
}

// ===========================
// 메모 저장
// ===========================
function saveMemos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.memos));
}

// ===========================
// 날짜 표시
// ===========================
function renderDate() {
  const el = document.getElementById('today-date');
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  el.textContent = now.toLocaleDateString('ko-KR', options);
}

// ===========================
// 메모 목록 렌더링
// ===========================
function renderMemoList() {
  const list = document.getElementById('memo-list');
  list.innerHTML = '';

  const filtered = getFilteredMemos();

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-msg" style="color:var(--text-secondary);font-size:13px;text-align:center;padding:30px 0;">메모가 없습니다.</li>';
    return;
  }

  filtered.forEach(memo => {
    const li = document.createElement('li');
    li.className = 'memo-card';
    li.dataset.id = memo.id;
    li.innerHTML = `
      <p class="memo-card-text">${escapeHtml(memo.content)}</p>
      <div class="memo-card-meta">
        <span class="memo-card-date">${formatDate(memo.createdAt)}</span>
        <span class="memo-card-star ${memo.starred ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="${memo.starred ? 'var(--star)' : 'none'}" stroke="${memo.starred ? 'var(--star)' : 'currentColor'}" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </span>
      </div>
    `;
    li.addEventListener('click', () => openDetail(memo.id));
    list.appendChild(li);
  });
}

// ===========================
// 필터링 로직
// ===========================
function getFilteredMemos() {
  return state.memos
    .filter(m => state.isStarFilter ? m.starred : true)
    .filter(m => state.searchQuery ? m.content.includes(state.searchQuery) : true)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ===========================
// 이벤트 바인딩
// ===========================
function bindEvents() {
  // 저장 버튼
  document.getElementById('save-btn').addEventListener('click', createMemo);

  // 중요 토글 버튼
  document.getElementById('star-btn').addEventListener('click', toggleStar);

  // 검색
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderMemoList();
  });

  // 즐겨찾기 필터
  document.getElementById('filter-star-btn').addEventListener('click', () => {
    state.isStarFilter = !state.isStarFilter;
    document.getElementById('filter-star-btn').classList.toggle('active', state.isStarFilter);
    renderMemoList();
  });

  // 더보기 메뉴
  document.getElementById('menu-btn').addEventListener('click', openMenu);
  document.getElementById('menu-overlay').addEventListener('click', closeMenu);

  // 더보기 메뉴 항목
  document.getElementById('export-btn').addEventListener('click', exportMemos);
  document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', importMemos);
  document.getElementById('darkmode-btn').addEventListener('click', toggleDarkmode);

  // 글자 크기
  document.querySelectorAll('.font-size-btns button').forEach(btn => {
    btn.addEventListener('click', () => setFontSize(btn.dataset.size));
  });
}

// ===========================
// 메모 생성 (Create)
// ===========================
function createMemo() {
  const input = document.getElementById('memo-input');
  const content = input.value.trim();
  if (!content) return;

  const memo = {
    id: Date.now().toString(),
    content,
    starred: state.isStarring,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  state.memos.push(memo);
  saveMemos();

  // 입력창 초기화
  input.value = '';
  state.isStarring = false;
  document.getElementById('star-btn').classList.remove('active');

  renderMemoList();
  showToast('메모가 저장되었습니다.');

  // 햅틱 피드백
  vibrate([100]);
}

// ===========================
// 중요 토글
// ===========================
function toggleStar() {
  state.isStarring = !state.isStarring;
  document.getElementById('star-btn').classList.toggle('active', state.isStarring);
}

// ===========================
// 상세보기 열기
// ===========================
function openDetail(id) {
  const memo = state.memos.find(m => m.id === id);
  if (!memo) return;

  const mainView   = document.getElementById('main-view');
  const detailView = document.getElementById('detail-view');

  // 제목: 본문 앞 7글자 자동생성
  const title = memo.content.slice(0, 7) + (memo.content.length > 7 ? '...' : '');

  detailView.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-left">
        <button class="btn-icon btn-back" id="back-btn" aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button class="btn-save-share" id="save-share-btn" aria-label="저장 및 공유">
          저장 및 공유
        </button>
      </div>
      <div class="detail-header-right">
        <button class="btn-icon btn-star-detail ${memo.starred ? 'active' : ''}" id="detail-star-btn" aria-label="중요 표시">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${memo.starred ? 'var(--star)' : 'none'}" stroke="${memo.starred ? 'var(--star)' : 'currentColor'}" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="detail-body" id="detail-body">
      <h2 class="detail-title">${escapeHtml(title)}</h2>
      <p class="detail-date">${formatDate(memo.createdAt)}</p>
      <div class="detail-content" id="detail-content-area">
        <p class="detail-text">${escapeHtml(memo.content)}</p>
      </div>
      <div class="detail-actions">
        <button class="btn-action" id="edit-btn">수정</button>
        <button class="btn-action" id="copy-btn">복사</button>
        <button class="btn-action" id="share-btn">공유</button>
        <button class="btn-action btn-danger" id="delete-btn">삭제</button>
      </div>
    </div>
  `;

  mainView.classList.remove('active');
  detailView.classList.add('active');

  // 상세보기 이벤트 바인딩
  document.getElementById('back-btn').addEventListener('click', closeDetail);
  document.getElementById('save-share-btn').addEventListener('click', () => openSaveShareModal(memo.id));
  document.getElementById('detail-star-btn').addEventListener('click', () => toggleMemoStar(memo.id));
  document.getElementById('edit-btn').addEventListener('click', () => startEdit(memo.id));
  document.getElementById('copy-btn').addEventListener('click', () => copyMemo(memo.content));
  document.getElementById('share-btn').addEventListener('click', () => shareMemo(memo));
  document.getElementById('delete-btn').addEventListener('click', () => deleteMemo(memo.id));
}

// ===========================
// 상세보기 닫기
// ===========================
function closeDetail() {
  document.getElementById('main-view').classList.add('active');
  document.getElementById('detail-view').classList.remove('active');
  renderMemoList();
}

// ===========================
// 메모 삭제 (Delete)
// ===========================
function deleteMemo(id) {
  if (!confirm('메모를 삭제할까요?')) return;
  state.memos = state.memos.filter(m => m.id !== id);
  saveMemos();
  closeDetail();
  showToast('메모가 삭제되었습니다.');
  vibrate([100, 50, 100]);
}

// ===========================
// 중요 토글 (메모 개별)
// ===========================
function toggleMemoStar(id) {
  const memo = state.memos.find(m => m.id === id);
  if (!memo) return;
  memo.starred = !memo.starred;
  saveMemos();
  openDetail(id);
}

// ===========================
// 메모 복사
// ===========================
function copyMemo(content) {
  navigator.clipboard.writeText(content).then(() => {
    showToast('클립보드에 복사되었습니다.');
  });
}

// ===========================
// 메모 공유 (Web Share API)
// ===========================
function shareMemo(memo) {
  if (navigator.share) {
    navigator.share({ title: 'Today is...', text: memo.content });
  } else {
    copyMemo(memo.content);
    showToast('공유 미지원 — 클립보드에 복사했습니다.');
  }
}

// ===========================
// 수정 (Update)
// ===========================
function startEdit(id) {
  const memo = state.memos.find(m => m.id === id);
  if (!memo) return;

  const contentArea = document.getElementById('detail-content-area');
  contentArea.innerHTML = `
    <textarea class="memo-input" id="edit-textarea" style="min-height:200px;">${escapeHtml(memo.content)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn-primary" id="confirm-edit-btn">저장</button>
      <button class="btn-action" id="cancel-edit-btn">취소</button>
    </div>
  `;

  document.getElementById('confirm-edit-btn').addEventListener('click', () => confirmEdit(id));
  document.getElementById('cancel-edit-btn').addEventListener('click', () => openDetail(id));
}

function confirmEdit(id) {
  const memo = state.memos.find(m => m.id === id);
  if (!memo) return;
  const newContent = document.getElementById('edit-textarea').value.trim();
  if (!newContent) return;
  memo.content = newContent;
  memo.updatedAt = Date.now();
  saveMemos();
  openDetail(id);
  showToast('메모가 수정되었습니다.');
}

// ===========================
// 저장 및 공유 모달 (인스타 사이즈)
// ===========================
function openSaveShareModal(id) {
  // 추후 5단계에서 구현
  showToast('저장 및 공유 기능은 준비 중입니다.');
}

// ===========================
// 더보기 메뉴
// ===========================
function openMenu() {
  document.getElementById('more-menu').classList.remove('hidden');
  document.getElementById('menu-overlay').classList.remove('hidden');
}

function closeMenu() {
  document.getElementById('more-menu').classList.add('hidden');
  document.getElementById('menu-overlay').classList.add('hidden');
}

// ===========================
// 다크모드 토글
// ===========================
function toggleDarkmode() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  closeMenu();
}

// ===========================
// 글자 크기
// ===========================
function setFontSize(size) {
  document.documentElement.setAttribute('data-font', size);
  localStorage.setItem(FONT_KEY, size);
  updateFontButtons(size);
}

function updateFontButtons(size) {
  document.querySelectorAll('.font-size-btns button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
}

// ===========================
// 메모 내보내기 (Export)
// ===========================
function exportMemos() {
  const data = JSON.stringify(state.memos, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `today-is-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  closeMenu();
  showToast('백업 파일을 저장했습니다.');
}

// ===========================
// 메모 가져오기 (Import)
// ===========================
function importMemos(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error('잘못된 형식');

      // ID 중복 제거 후 병합
      const existingIds = new Set(state.memos.map(m => m.id));
      const newMemos    = imported.filter(m => !existingIds.has(m.id));
      state.memos = [...state.memos, ...newMemos];
      saveMemos();
      renderMemoList();
      showToast(`${newMemos.length}개 메모를 가져왔습니다.`);
    } catch {
      showToast('올바른 백업 파일이 아닙니다.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
  closeMenu();
}

// ===========================
// 햅틱 피드백 (Vibration API)
// ===========================
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ===========================
// 토스트 알림
// ===========================
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// ===========================
// 유틸 — HTML 이스케이프
// ===========================
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// ===========================
// 유틸 — 날짜 포맷
// ===========================
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
