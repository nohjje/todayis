// ===========================
// Today is... - 메인 앱
// ===========================

// ===========================
// 상태
// ===========================
const state = {
  memos:         [],       // 전체 메모 배열
  todos:         [],       // 오늘의 Todo 배열
  calYear:       0,        // 달력 표시 연도
  calMonth:      0,        // 달력 표시 월 (0-indexed)
  selectedDate:  '',       // 선택된 날짜 (YYYY-MM-DD)
  currentMemoId: null,     // 현재 상세보기 메모 ID
  isStarring:    false,    // 새 메모 중요 여부
  isStarFilter:  false,    // 즐겨찾기 필터 활성 여부
  searchQuery:   '',       // 검색어
  prevView:      'main-view', // 이전 화면 (뒤로가기용)
};

// ===========================
// 로컬스토리지 키
// ===========================
const KEY_MEMOS      = 'today-is-memos';
const KEY_TODOS      = 'today-is-todos';
const KEY_THEME      = 'today-is-theme';
const KEY_FONT       = 'today-is-font';
const KEY_TRANS_ON   = 'today-is-translate-on';
const KEY_TRANS_LANG = 'today-is-translate-lang';

// ===========================
// 날짜 유틸
// ===========================
function toDateKey(date) {
  // Date 객체 또는 타임스탬프 → 'YYYY-MM-DD'
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayKey() {
  return toDateKey(new Date());
}

function formatDateLabel(dateKey) {
  // 'YYYY-MM-DD' → '2026년 4월 3일 (금)'
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m-1, d);
  return date.toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' });
}

// ===========================
// 초기화
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadData();

  const now = new Date();
  state.calYear  = now.getFullYear();
  state.calMonth = now.getMonth();

  renderCalendar();
  renderTodos();
  bindEvents();
});

// ===========================
// 데이터 로드/저장
// ===========================
function loadData() {
  state.memos = JSON.parse(localStorage.getItem(KEY_MEMOS) || '[]');
  state.todos = JSON.parse(localStorage.getItem(KEY_TODOS) || '[]');
}

function saveMemos() { localStorage.setItem(KEY_MEMOS, JSON.stringify(state.memos)); }
function saveTodos() { localStorage.setItem(KEY_TODOS, JSON.stringify(state.todos)); }

// ===========================
// 설정 로드
// ===========================
function loadSettings() {
  const theme     = localStorage.getItem(KEY_THEME)      || 'light';
  const font      = localStorage.getItem(KEY_FONT)       || 'medium';
  const transOn   = localStorage.getItem(KEY_TRANS_ON)   !== 'false';
  const transLang = localStorage.getItem(KEY_TRANS_LANG) || 'en';
  applyTheme(theme);
  applyFont(font);
  // 번역 토글 초기 상태
  const transToggle = document.getElementById('translate-toggle');
  if (transToggle) transToggle.setAttribute('aria-checked', transOn ? 'true' : 'false');
  // 번역 언어 초기값
  const langSelect = document.getElementById('translate-lang');
  if (langSelect) langSelect.value = transLang;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // 설정 화면 토글 버튼 상태 반영
  const btn = document.getElementById('darkmode-toggle');
  if (btn) btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
}

function applyFont(font) {
  document.documentElement.setAttribute('data-font', font);
  document.querySelectorAll('.font-size-btns button').forEach(b => {
    b.classList.toggle('active', b.dataset.size === font);
  });
}

// ===========================
// 화면 전환
// ===========================
function showView(viewId, prev) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  if (prev) state.prevView = prev;
}

// ===========================
// 이벤트 바인딩
// ===========================
function bindEvents() {

  // 달력 네비게이션
  document.getElementById('prev-month').addEventListener('click', () => {
    state.calMonth--;
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    renderCalendar();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    state.calMonth++;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    renderCalendar();
  });

  // 설정 버튼
  document.getElementById('settings-btn').addEventListener('click', () => {
    showView('settings-view', 'main-view');
  });

  // 설정 뒤로가기
  document.getElementById('settings-back-btn').addEventListener('click', () => {
    showView('main-view');
  });

  // 날짜별 화면 — 설정 버튼
  document.getElementById('settings-day-btn').addEventListener('click', () => {
    showView('settings-view', 'day-view');
  });

  // 날짜별 화면 — 닫기(X) 버튼
  document.getElementById('day-back-btn').addEventListener('click', () => {
    showView('main-view');
    state.isStarFilter = false;
    state.searchQuery  = '';
    document.getElementById('filter-star-btn').classList.remove('active');
    document.getElementById('search-input').value = '';
    resetMemoEditor();
  });

  // 메모 저장
  document.getElementById('save-btn').addEventListener('click', createMemo);

  // 중요 토글 (에디터)
  document.getElementById('star-btn').addEventListener('click', () => {
    state.isStarring = !state.isStarring;
    document.getElementById('star-btn').classList.toggle('active', state.isStarring);
  });

  // 검색
  document.getElementById('search-input').addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();
    renderDayMemos();
  });

  // 즐겨찾기 필터
  document.getElementById('filter-star-btn').addEventListener('click', () => {
    state.isStarFilter = !state.isStarFilter;
    document.getElementById('filter-star-btn').classList.toggle('active', state.isStarFilter);
    renderDayMemos();
  });

  // 상세보기 뒤로가기 — 저장 후 메인으로
  document.getElementById('detail-back-btn').addEventListener('click', () => {
    const content = document.getElementById('detail-memo-input').value.trim();
    if (!content) {
      // 내용 없으면 빈 메모 삭제
      state.memos = state.memos.filter(m => m.id !== state.currentMemoId);
      saveMemos();
    } else {
      saveDetailChanges();
    }
    renderCalendar();
    showView('main-view');
  });

  // 저장 및 공유 버튼
  document.getElementById('save-share-btn').addEventListener('click', openSaveShareModal);

  // 상세보기 — 알림 토글
  document.getElementById('detail-alarm-toggle').addEventListener('click', () => {
    const btn   = document.getElementById('detail-alarm-toggle');
    const isOn  = btn.getAttribute('aria-checked') === 'true';
    btn.setAttribute('aria-checked', isOn ? 'false' : 'true');
    document.getElementById('detail-alarm-time').classList.toggle('hidden', isOn);
  });

  // 상세보기 — 컬러 피커
  document.getElementById('color-picker').addEventListener('click', e => {
    const dot = e.target.closest('.color-dot');
    if (!dot) return;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
  });

  // 첨부 — 사진
  document.getElementById('attach-photo').addEventListener('change', e => {
    handlePhotoAttach(e.target.files);
    e.target.value = '';
  });

  // 첨부 — 동영상
  document.getElementById('attach-video').addEventListener('change', e => {
    handleVideoAttach(e.target.files[0]);
    e.target.value = '';
  });

  // 첨부 — 녹음
  document.getElementById('attach-record-btn').addEventListener('click', startRecording);
  document.getElementById('record-stop-btn').addEventListener('click', stopRecording);

  // 하단 액션 — 수정
  document.getElementById('detail-edit-btn').addEventListener('click', confirmDetailEdit);

  // 하단 액션
  document.getElementById('detail-copy-btn').addEventListener('click', () => {
    const content = document.getElementById('detail-memo-input').value;
    copyMemo(content);
  });
  document.getElementById('detail-translate-btn').addEventListener('click', () => {
    const content = document.getElementById('detail-memo-input').value;
    translateMemo(content);
  });
  document.getElementById('detail-share-btn').addEventListener('click', () => {
    const memo = state.memos.find(m => m.id === state.currentMemoId);
    if (memo) shareMemo(memo);
  });
  document.getElementById('detail-delete-btn').addEventListener('click', () => {
    deleteMemo(state.currentMemoId);
  });

  // Todo 추가 버튼
  document.getElementById('add-todo-btn').addEventListener('click', () => {
    document.getElementById('todo-input-wrap').classList.remove('hidden');
    document.getElementById('todo-input').focus();
  });

  // Todo 저장
  document.getElementById('todo-save-btn').addEventListener('click', addTodo);
  document.getElementById('todo-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
  });

  // 설정: 번역 토글
  document.getElementById('translate-toggle').addEventListener('click', () => {
    const btn    = document.getElementById('translate-toggle');
    const isOn   = btn.getAttribute('aria-checked') === 'true';
    btn.setAttribute('aria-checked', isOn ? 'false' : 'true');
    localStorage.setItem(KEY_TRANS_ON, isOn ? 'false' : 'true');
  });

  // 설정: 번역 언어
  document.getElementById('translate-lang').addEventListener('change', e => {
    localStorage.setItem(KEY_TRANS_LANG, e.target.value);
  });

  // 설정: 다크모드
  document.getElementById('darkmode-toggle').addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(KEY_THEME, next);
  });

  // 설정: 글자 크기
  document.querySelectorAll('.font-size-btns button').forEach(btn => {
    btn.addEventListener('click', () => {
      applyFont(btn.dataset.size);
      localStorage.setItem(KEY_FONT, btn.dataset.size);
    });
  });

  // 설정: 내보내기/가져오기
  document.getElementById('export-btn').addEventListener('click', exportMemos);
  document.getElementById('import-file').addEventListener('change', importMemos);

  // 설정: 친구에게 앱 공유
  document.getElementById('share-app-btn').addEventListener('click', shareApp);

  // 설정: 전체 삭제
  document.getElementById('delete-all-btn').addEventListener('click', () => {
    if (!confirm('모든 메모를 삭제할까요? 복구할 수 없습니다.')) return;
    state.memos = [];
    saveMemos();
    renderCalendar();
    showToast('모든 메모가 삭제되었습니다.');
  });

  // 모달: 사이즈 선택
  document.getElementById('size-list').addEventListener('click', e => {
    const item = e.target.closest('.modal-size-item');
    if (!item) return;
    document.querySelectorAll('.modal-size-item').forEach(el => {
      el.classList.remove('selected');
      el.querySelector('.size-check').classList.add('hidden');
    });
    item.classList.add('selected');
    item.querySelector('.size-check').classList.remove('hidden');
  });

  document.getElementById('modal-cancel-btn').addEventListener('click', closeSaveShareModal);
  document.getElementById('modal-save-btn').addEventListener('click', () => saveAsImage('download'));
  document.getElementById('modal-share-btn').addEventListener('click', () => saveAsImage('share'));

  // PWA 설치 버튼
  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      installPromptEvent = null;
      document.getElementById('install-section').style.display = 'none';
    }
  });

  // 메모 입력창 focus → Wake Lock ON, blur → Wake Lock OFF
  const memoInput = document.getElementById('detail-memo-input');
  memoInput.addEventListener('focus', () => requestWakeLock());
  memoInput.addEventListener('blur',  () => releaseWakeLock());
}

// ===========================
// 달력 렌더링
// ===========================
function renderCalendar() {
  const year  = state.calYear;
  const month = state.calMonth;

  // 제목
  document.getElementById('calendar-title').textContent =
    `${year}년 ${month+1}월`;

  const grid    = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const firstDay  = new Date(year, month, 1).getDay(); // 0=일
  const lastDate  = new Date(year, month+1, 0).getDate();
  const today     = todayKey();

  // 메모 있는 날짜 Set
  const memoDates = new Set(state.memos.map(m => m.date));

  // 앞 빈칸
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day empty';
    grid.appendChild(blank);
  }

  // 날짜 셀
  for (let d = 1; d <= lastDate; d++) {
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayOfWeek = new Date(year, month, d).getDay();

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    if (dateKey === today)   cell.classList.add('today');
    if (dayOfWeek === 0)     cell.classList.add('sunday');
    if (dayOfWeek === 6)     cell.classList.add('saturday');

    cell.innerHTML = `<span>${d}</span>`;

    // 메모 있으면 점 표시
    if (memoDates.has(dateKey)) {
      const dot = document.createElement('div');
      dot.className = 'memo-dot';
      cell.appendChild(dot);
    }

    cell.addEventListener('click', () => openNewMemo(dateKey));
    grid.appendChild(cell);
  }
}

// ===========================
// 날짜 클릭 → 새 메모 바로 작성
// ===========================
function openNewMemo(dateKey) {
  state.selectedDate = dateKey;

  // 빈 메모 생성
  const memo = {
    id:          Date.now().toString(),
    content:     '',
    title:       '',
    url:         '',
    alarm:       { enabled: false, time: '' },
    color:       '#5C8B6E',
    attachments: [],
    date:        dateKey,
    starred:     false,
    createdAt:   Date.now(),
    updatedAt:   Date.now(),
  };

  state.memos.push(memo);
  saveMemos();
  openDetail(memo.id);
}

// ===========================
// 날짜별 메모 화면 열기 (내부용 — 직접 접근 시)
// ===========================
function openDayView(dateKey) {
  state.selectedDate = dateKey;
  state.isStarFilter = false;
  state.searchQuery  = '';

  // 날짜 구분선 텍스트 업데이트
  document.getElementById('day-date-label').textContent = formatDateLabel(dateKey);
  document.getElementById('filter-star-btn').classList.remove('active');
  document.getElementById('search-input').value = '';

  resetMemoEditor();
  renderDayMemos();
  showView('day-view', 'main-view');
}

// ===========================
// 날짜별 메모 목록 렌더링
// ===========================
function renderDayMemos() {
  const list = document.getElementById('memo-list');
  list.innerHTML = '';

  const filtered = state.memos
    .filter(m => m.date === state.selectedDate)
    .filter(m => state.isStarFilter ? m.starred : true)
    .filter(m => state.searchQuery  ? m.content.includes(state.searchQuery) : true)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (filtered.length === 0) {
    list.innerHTML = `<li class="empty-msg">이 날의 메모가 없습니다.</li>`;
    return;
  }

  filtered.forEach(memo => {
    const li = document.createElement('li');
    li.className = 'memo-card';
    li.innerHTML = `
      <p class="memo-card-text">${escapeHtml(memo.content)}</p>
      <div class="memo-card-meta">
        <span class="memo-card-time">${formatTime(memo.createdAt)}</span>
        <span class="memo-card-star ${memo.starred ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="${memo.starred ? 'var(--star)' : 'none'}"
               stroke="${memo.starred ? 'var(--star)' : 'currentColor'}" stroke-width="2">
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
// 메모 에디터 초기화
// ===========================
function resetMemoEditor() {
  document.getElementById('memo-input').value = '';
  state.isStarring = false;
  document.getElementById('star-btn').classList.remove('active');
}

// ===========================
// 메모 생성 (Create)
// ===========================
function createMemo() {
  const input   = document.getElementById('memo-input');
  const content = input.value.trim();
  if (!content) return;

  const memo = {
    id:        Date.now().toString(),
    content,
    date:      state.selectedDate,
    starred:   state.isStarring,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  state.memos.push(memo);
  saveMemos();
  resetMemoEditor();
  renderDayMemos();
  renderCalendar(); // 점 업데이트
  showToast('메모가 저장되었습니다.');
  vibrate([100]);
}

// ===========================
// 상세보기 열기 — 폼에 데이터 채우기
// ===========================
function openDetail(id) {
  const memo = state.memos.find(m => m.id === id);
  if (!memo) return;
  state.currentMemoId = id;

  // 제목 (저장된 title 또는 자동생성)
  const autoTitle = memo.content.slice(0, 7) + (memo.content.length > 7 ? '...' : '');
  document.getElementById('detail-title-input').value = memo.title || autoTitle;

  // URL
  document.getElementById('detail-url-input').value = memo.url || '';

  // 알림
  const alarmOn = !!(memo.alarm && memo.alarm.enabled);
  document.getElementById('detail-alarm-toggle').setAttribute('aria-checked', alarmOn ? 'true' : 'false');
  const alarmTimeEl = document.getElementById('detail-alarm-time');
  alarmTimeEl.classList.toggle('hidden', !alarmOn);
  if (memo.alarm && memo.alarm.time) alarmTimeEl.value = memo.alarm.time;

  // 캘린더 컬러
  const savedColor = memo.color || '#5C8B6E';
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.classList.toggle('selected', dot.dataset.color === savedColor);
  });

  // 첨부파일 미리보기
  renderAttachPreview(memo.attachments || []);

  // 메모 본문
  document.getElementById('detail-memo-input').value = memo.content || '';

  // 번역 결과 초기화
  document.getElementById('translate-result').classList.add('hidden');
  document.getElementById('detail-translate-btn').textContent = '번역';

  // 화면 전환 — 항상 메인에서 상세로 직접 이동
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('detail-view').classList.add('active');
  state.prevView = 'main-view';
}

// ===========================
// 수정 버튼 — 명시적 저장
// ===========================
function confirmDetailEdit() {
  const content = document.getElementById('detail-memo-input').value.trim();
  if (!content) { showToast('메모 내용을 입력해주세요.'); return; }
  saveDetailChanges();
  releaseWakeLock();
  showToast('수정되었습니다.');
  vibrate([100]);
}

// ===========================
// 상세보기 변경사항 저장
// ===========================
function saveDetailChanges() {
  const memo = state.memos.find(m => m.id === state.currentMemoId);
  if (!memo) return;

  const titleInput   = document.getElementById('detail-title-input').value.trim();
  const urlInput     = document.getElementById('detail-url-input').value.trim();
  const alarmOn      = document.getElementById('detail-alarm-toggle').getAttribute('aria-checked') === 'true';
  const alarmTime    = document.getElementById('detail-alarm-time').value;
  const selectedDot  = document.querySelector('.color-dot.selected');
  const content      = document.getElementById('detail-memo-input').value.trim();

  if (content) memo.content = content;
  memo.title     = titleInput;
  memo.url       = urlInput;
  memo.alarm     = { enabled: alarmOn, time: alarmTime };
  memo.color     = selectedDot ? selectedDot.dataset.color : '#5C8B6E';
  memo.updatedAt = Date.now();

  saveMemos();
}

// ===========================
// 메모 삭제 (Delete)
// ===========================
function deleteMemo(id) {
  if (!confirm('메모를 삭제할까요?')) return;
  state.memos = state.memos.filter(m => m.id !== id);
  saveMemos();
  renderCalendar();
  showView('main-view');
  showToast('메모가 삭제되었습니다.');
  vibrate([100, 50, 100]);
}

// ===========================
// 첨부파일 처리
// ===========================
function handlePhotoAttach(files) {
  const memo = state.memos.find(m => m.id === state.currentMemoId);
  if (!memo) return;
  if (!memo.attachments) memo.attachments = [];

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      memo.attachments.push({ type: 'image', data: e.target.result, name: file.name });
      saveMemos();
      renderAttachPreview(memo.attachments);
    };
    reader.readAsDataURL(file);
  });
}

function handleVideoAttach(file) {
  if (!file) return;
  const memo = state.memos.find(m => m.id === state.currentMemoId);
  if (!memo) return;
  if (!memo.attachments) memo.attachments = [];

  const reader = new FileReader();
  reader.onload = e => {
    memo.attachments.push({ type: 'video', data: e.target.result, name: file.name });
    saveMemos();
    renderAttachPreview(memo.attachments);
  };
  reader.readAsDataURL(file);
}

function renderAttachPreview(attachments) {
  const preview = document.getElementById('attach-preview');
  preview.innerHTML = '';
  attachments.forEach((att, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'attach-item';

    if (att.type === 'image') {
      wrap.innerHTML = `
        <img src="${att.data}" class="attach-thumb" alt="${att.name}">
        <button class="attach-del" data-idx="${idx}">×</button>
      `;
    } else if (att.type === 'video') {
      wrap.innerHTML = `
        <video src="${att.data}" class="attach-thumb" style="object-fit:cover;"></video>
        <button class="attach-del" data-idx="${idx}">×</button>
      `;
    } else if (att.type === 'audio') {
      wrap.className = 'audio-item';
      wrap.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        </svg>
        <audio controls src="${att.data}" style="height:28px;flex:1;"></audio>
        <button class="attach-del" data-idx="${idx}" style="position:static;background:var(--danger);">×</button>
      `;
    }

    wrap.querySelector('.attach-del').addEventListener('click', () => deleteAttachment(idx));
    preview.appendChild(wrap);
  });
}

function deleteAttachment(idx) {
  const memo = state.memos.find(m => m.id === state.currentMemoId);
  if (!memo || !memo.attachments) return;
  memo.attachments.splice(idx, 1);
  saveMemos();
  renderAttachPreview(memo.attachments);
}

// ===========================
// 녹음 (MediaRecorder API)
// ===========================
let mediaRecorder   = null;
let recordChunks    = [];
let recordTimerInt  = null;
let recordSeconds   = 0;

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder  = new MediaRecorder(stream);
      recordChunks   = [];
      recordSeconds  = 0;

      mediaRecorder.ondataavailable = e => recordChunks.push(e.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob   = new Blob(recordChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = ev => {
          const memo = state.memos.find(m => m.id === state.currentMemoId);
          if (!memo) return;
          if (!memo.attachments) memo.attachments = [];
          memo.attachments.push({ type: 'audio', data: ev.target.result, name: `녹음_${formatTime(Date.now())}` });
          saveMemos();
          renderAttachPreview(memo.attachments);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      document.getElementById('record-ui').classList.remove('hidden');

      recordTimerInt = setInterval(() => {
        recordSeconds++;
        const m = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
        const s = String(recordSeconds % 60).padStart(2, '0');
        document.getElementById('record-timer').textContent = `${m}:${s}`;
      }, 1000);
    })
    .catch(() => showToast('마이크 권한이 필요합니다.'));
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  clearInterval(recordTimerInt);
  document.getElementById('record-ui').classList.add('hidden');
  document.getElementById('record-timer').textContent = '00:00';
}

// ===========================
// 번역 (Google Translate 비공식 API)
// ===========================
async function translateMemo(content) {
  // 번역 기능 비활성화 확인
  const isOn = localStorage.getItem(KEY_TRANS_ON) !== 'false';
  if (!isOn) { showToast('설정에서 번역 기능이 꺼져 있습니다.'); return; }

  const resultBox    = document.getElementById('translate-result');
  const translateBtn = document.getElementById('detail-translate-btn');

  // 번역 결과가 이미 표시 중이면 숨기기 (토글)
  if (!resultBox.classList.contains('hidden')) {
    resultBox.classList.add('hidden');
    translateBtn.textContent = '번역';
    return;
  }

  translateBtn.textContent = '번역 중...';
  translateBtn.disabled = true;

  try {
    // 설정에서 선택한 언어로 번역 (한국어이면 설정 언어로, 외국어이면 한국어로)
    const savedLang = localStorage.getItem(KEY_TRANS_LANG) || 'en';
    const isKorean  = /[가-힣]/.test(content);
    const target    = isKorean ? savedLang : 'ko';
    const langLabel = { en:'영어', ja:'일본어', 'zh-CN':'중국어', es:'스페인어', fr:'프랑스어' };
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(content)}`;

    const res  = await fetch(url);
    const data = await res.json();
    const translated = data[0].map(seg => seg[0]).join('');

    const label = isKorean ? (langLabel[target] || target) + ' 번역' : '한국어 번역';
    resultBox.innerHTML = `
      <p class="translate-label">${label}</p>
      <p class="translate-text">${escapeHtml(translated)}</p>
    `;
    resultBox.classList.remove('hidden');
    translateBtn.textContent = '번역 닫기';
  } catch {
    showToast('번역에 실패했습니다. 네트워크를 확인해주세요.');
    translateBtn.textContent = '번역';
  } finally {
    if (translateBtn) translateBtn.disabled = false;
  }
}

// ===========================
// 복사 / 공유
// ===========================
function copyMemo(content) {
  navigator.clipboard.writeText(content)
    .then(() => showToast('클립보드에 복사되었습니다.'));
}

function shareMemo(memo) {
  if (navigator.share) {
    navigator.share({ title: 'Today is...', text: memo.content });
  } else {
    copyMemo(memo.content);
    showToast('공유 미지원 — 클립보드에 복사했습니다.');
  }
}

// ===========================
// 저장 및 공유 모달
// ===========================
function openSaveShareModal() {
  document.getElementById('save-share-modal').classList.remove('hidden');
}

function closeSaveShareModal() {
  document.getElementById('save-share-modal').classList.add('hidden');
}

function saveAsImage(action) {
  // 선택된 사이즈
  const selected = document.querySelector('.modal-size-item.selected');
  const w = parseInt(selected.dataset.w);
  const h = parseInt(selected.dataset.h);

  // html2canvas 미로드 시 안내
  if (typeof html2canvas === 'undefined') {
    showToast('이미지 저장 기능은 준비 중입니다.');
    closeSaveShareModal();
    return;
  }

  const target = document.getElementById('detail-body');
  html2canvas(target, { scale: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() })
    .then(canvas => {
      // 지정 사이즈 캔버스로 리사이즈
      const out = document.createElement('canvas');
      out.width  = w;
      out.height = h;
      const ctx = out.getContext('2d');
      // 배경
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
      ctx.fillRect(0, 0, w, h);
      // 메모 내용 중앙 배치
      const ratio   = Math.min(w / canvas.width, h / canvas.height) * 0.85;
      const dw      = canvas.width  * ratio;
      const dh      = canvas.height * ratio;
      const dx      = (w - dw) / 2;
      const dy      = (h - dh) / 2;
      ctx.drawImage(canvas, dx, dy, dw, dh);

      out.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        if (action === 'download') {
          const a = document.createElement('a');
          a.href     = url;
          a.download = `today-is-${state.currentMemoId}.png`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('이미지가 저장되었습니다.');
        } else if (action === 'share') {
          const file = new File([blob], 'today-is.png', { type: 'image/png' });
          if (navigator.share && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Today is...' });
          } else {
            const a = document.createElement('a');
            a.href     = url;
            a.download = 'today-is.png';
            a.click();
            URL.revokeObjectURL(url);
            showToast('공유 미지원 — 이미지로 저장됩니다.');
          }
        }
      }, 'image/png');
    });

  closeSaveShareModal();
}

// ===========================
// Todo
// ===========================
function addTodo() {
  const input = document.getElementById('todo-input');
  const text  = input.value.trim();
  if (!text) return;

  state.todos.push({ id: Date.now().toString(), text, done: false, date: todayKey() });
  saveTodos();
  input.value = '';
  document.getElementById('todo-input-wrap').classList.add('hidden');
  renderTodos();
}

function renderTodos() {
  const list  = document.getElementById('todo-list');
  const today = todayKey();
  const items = state.todos.filter(t => t.date === today);
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = `<li class="empty-msg" style="padding:16px 0;">오늘의 할 일을 추가해보세요.</li>`;
    return;
  }

  items.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.done ? 'done' : ''}`;
    li.innerHTML = `
      <input type="checkbox" id="todo-${todo.id}" ${todo.done ? 'checked' : ''}>
      <label class="todo-text" for="todo-${todo.id}">${escapeHtml(todo.text)}</label>
      <button class="todo-del" data-id="${todo.id}" aria-label="삭제">×</button>
    `;
    li.querySelector('input').addEventListener('change', () => toggleTodo(todo.id));
    li.querySelector('.todo-del').addEventListener('click', () => deleteTodo(todo.id));
    list.appendChild(li);
  });
}

function toggleTodo(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) { todo.done = !todo.done; saveTodos(); renderTodos(); }
}

function deleteTodo(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

// ===========================
// 친구에게 앱 공유
// ===========================
function shareApp() {
  const appUrl  = location.origin + location.pathname;
  const shareData = {
    title: 'Today is...',
    text:  '오늘의 메모를 기록하는 PWA 앱이에요. 한번 써봐요!',
    url:   appUrl,
  };

  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    // 공유 미지원 시 URL 복사
    navigator.clipboard.writeText(appUrl)
      .then(() => showToast('앱 주소가 클립보드에 복사되었습니다.'));
  }
}

// ===========================
// 내보내기 / 가져오기
// ===========================
function exportMemos() {
  const data = JSON.stringify(state.memos, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `today-is-backup-${toDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('백업 파일을 저장했습니다.');
}

function importMemos(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error();
      const existingIds = new Set(state.memos.map(m => m.id));
      const newMemos    = imported.filter(m => !existingIds.has(m.id));
      state.memos = [...state.memos, ...newMemos];
      saveMemos();
      renderCalendar();
      showToast(`${newMemos.length}개 메모를 가져왔습니다.`);
    } catch {
      showToast('올바른 백업 파일이 아닙니다.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ===========================
// 햅틱 피드백
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
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ===========================
// HTML 이스케이프
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
// Screen Wake Lock API
// ===========================
let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch {
    // 권한 거부 또는 미지원 — 조용히 무시
  }
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch {
    // 무시
  }
  wakeLock = null;
}

// 앱이 백그라운드에서 포그라운드로 돌아올 때 Wake Lock 재요청
document.addEventListener('visibilitychange', async () => {
  // 상세보기 화면이 활성화 상태이고 메모 입력창이 포커스된 경우 재요청
  if (document.visibilityState === 'hidden') {
    // 백그라운드 진입 — 현재 상세보기 중이면 자동저장
    const detailActive = document.getElementById('detail-view')?.classList.contains('active');
    if (detailActive && state.currentMemoId) {
      const content = document.getElementById('detail-memo-input').value.trim();
      if (content) {
        saveDetailChanges();
        showToast('자동 저장되었습니다.');
      }
    }
  } else if (document.visibilityState === 'visible') {
    // 포그라운드 복귀 — 입력창 포커스 중이면 Wake Lock 재요청
    if (document.activeElement === document.getElementById('detail-memo-input')) {
      await requestWakeLock();
    }
  }
});

// ===========================
// PWA 설치 배너 (beforeinstallprompt)
// ===========================
let installPromptEvent = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPromptEvent = e;

  // 설치 섹션 표시
  const section = document.getElementById('install-section');
  if (section) section.style.display = '';
});

window.addEventListener('appinstalled', () => {
  installPromptEvent = null;
  const section = document.getElementById('install-section');
  if (section) section.style.display = 'none';
  showToast('앱이 홈 화면에 추가되었습니다!');
});
