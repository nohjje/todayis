// ===========================
// Service Worker 등록
// ===========================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW 등록 완료:', reg.scope))
      .catch(err => console.log('SW 등록 실패:', err));
  });
}
