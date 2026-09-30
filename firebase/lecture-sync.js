const $ = id => document.getElementById(id);
const deck = window.lectureDeck;
const params = new URLSearchParams(location.search);
const wantsAdmin = params.has('admin');
const review = params.has('view') && !wantsAdmin;
const screen = params.has('screen') && !wantsAdmin;
const cfg = window.FIREBASE_CONFIG;
const configured = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId']
  .every(key => typeof cfg?.[key] === 'string' && cfg[key].trim() && !cfg[key].includes('['));
let sync, admin = false, online = false, locked = true, pdf = true, ready = false;
let currentState, failure = '', viewers = null, stopViewers;
const canNavigate = () => !configured || review || (ready && (admin || (!screen && !locked)));
const canPrint = () => !configured || review || (ready && pdf);
function render() {
  document.documentElement.classList.toggle('sync-locked', !canNavigate());
  document.documentElement.classList.toggle('sync-no-pdf', !canPrint());
  $('navPrev').disabled = !canNavigate() || deck.current() === 0;
  $('navNext').disabled = !canNavigate() || deck.current() === deck.total - 1;
  $('printBtn').hidden = !canPrint();
  $('syncLock').hidden = $('syncPdf').hidden = $('syncLogout').hidden = !admin;
  $('syncLogin').hidden = !configured || !wantsAdmin || admin;
  $('syncLock').textContent = '잠금 ' + (locked ? 'ON' : 'OFF');
  $('syncPdf').textContent = 'PDF ' + (pdf ? 'ON' : 'OFF');
  $('syncLock').setAttribute('aria-checked', String(locked));
  $('syncPdf').setAttribute('aria-checked', String(pdf));
  $('syncStatus').textContent = !configured || review ? '자유 열람' : failure ||
    (!online ? '연결 대기 · 재연결 중' : !ready ? '강의 상태 확인 중' :
      admin ? '강사 연결' + (viewers === null ? '' : ' · 접속 ' + viewers + '명') :
      locked || screen ? '강사 화면 따라보기' : '자유 이동');
}
async function write(action) {
  if (!online) { failure = '연결 끊김 · 변경 미전송'; render(); return; }
  try { await action(); failure = ''; }
  catch { failure = '변경 저장 실패 · 연결·강사 권한 확인'; }
  render();
}
window.lectureSync = {
  canNavigate, canPrint,
  publish(n) { if (admin) void write(() => sync.setSlide(n)); render(); }
};
$('syncLogin').addEventListener('click', () => { $('syncDialog').showModal(); $('syncEmail').focus(); });
$('syncClose').addEventListener('click', () => $('syncDialog').close());
$('syncDialog').addEventListener('close', () => { $('syncPassword').value = ''; });
$('syncForm').addEventListener('submit', async event => {
  event.preventDefault();
  $('syncError').textContent = '';
  const submit = $('syncForm').querySelector('[type="submit"]');
  submit.disabled = true;
  try { await sync.login($('syncEmail').value.trim(), $('syncPassword').value); }
  catch { $('syncError').textContent = '로그인 실패 · 이메일·비밀번호 확인'; }
  finally { $('syncPassword').value = ''; submit.disabled = false; }
});
$('syncLock').addEventListener('click', () => void write(() => sync.setLock(!locked)));
$('syncPdf').addEventListener('click', () => void write(() => sync.setPdf(!pdf)));
$('syncLogout').addEventListener('click', () => void write(() => sync.logout()));
render();
if (configured && !review) {
  try {
    const { createSync } = await import('./firebase-sync.js');
    sync = createSync(cfg, window.DECK_ID);
    sync.onConnection(value => { online = value; render(); });
    sync.onState(state => {
      if (!state) { ready = false; failure = '상태 읽기 실패 · Firebase 규칙 확인'; render(); return; }
      ready = true; failure = ''; currentState = state;
      locked = !!state.locked; pdf = !!state.pdf;
      if (!admin && (locked || screen)) deck.show(state.slide);
      render();
    });
    sync.onAdmin((allowed, user) => {
      admin = wantsAdmin && allowed;
      if (admin) {
        $('syncDialog').close();
        if (currentState) deck.show(currentState.slide);
        if (!stopViewers) stopViewers = sync.onViewers(n => { viewers = n; render(); });
      } else {
        if (stopViewers) { stopViewers(); stopViewers = null; viewers = null; }
        if (currentState && (locked || screen)) deck.show(currentState.slide);
        if (wantsAdmin) {
          $('syncError').textContent = user ? '강사 권한 없음 · admins UID 확인' : '';
          if (!$('syncDialog').open) $('syncDialog').showModal();
        }
      }
      render();
    });
    if (!wantsAdmin && !screen) sync.joinViewers();
  } catch {
    failure = 'Firebase 연결 실패 · 설정·네트워크 확인';
    render();
  }
}
