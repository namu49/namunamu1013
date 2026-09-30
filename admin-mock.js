/* 서버 연결 지점: Firebase Auth 로그인·admins UID 검사로 데모 게이트 교체.
   localStorage 목업 전용. 실제 slides.html 및 Firebase 데이터에는 쓰지 않음. */
(() => {
  'use strict';
  const LS = 'namunamu1013_', KEY = LS + 'admin_prototype_v1';
  const $ = id => document.getElementById(id);
  const TITLES = JSON.parse($('slideTitles').textContent);
  const switchKey = id => id.replace(/^sw/, '').replace(/^./, c => c.toLowerCase());
  const switches = [ ['swAdmission','입장 허용'], ['swLock','청중 따라보기'],
    ['swPrompt','실습 프롬프트 공개'], ['swQuestions','질문 접수'], ['swPdf','PDF 저장 허용'],
    ['swFeedback','후기 접수'], ['swReview','종료 후 복습 허용'] ];
  const timer = () => ({remaining:600,endAt:null,running:false});
  const fresh = () => ({ slide:0,status:'준비',startedAt:null,endedAt:null,expectedAttendance:20,deliveryMode:'대면',
    practiceTitle:'생활 질문 만들기',practicePrompt:'내 상황에 맞는 생활 속 AI 활용법 3가지를 제안해줘.',
    practice:timer(),break:timer(),breakActive:false,returnSlide:0,connections:3,
    switches:Object.fromEntries(switches.map(([id])=>[switchKey(id),['swPdf','swLock'].includes(id)])),
    questions:[{id:'q1',name:'참가자 1',text:'음성 질문은 어디에서 시작하나요?',answered:false,approved:false}],
    feedback:[{id:'f1',name:'참가자 2',text:'직접 실습하며 익힌 질문 방법',rating:5,approved:false}],
    materials:[{id:'m1',title:'생활 질문 프롬프트',url:'',releaseMode:'비공개',publishedAt:null}],events:[] });
  let db = {version:1,current:'1',sessions:Object.fromEntries([1,2,3,4].map(n=>[n,fresh()]))};
  let storageFailed=false, authenticated=false;
  try {const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===1 && saved.sessions && [1,2,3,4].every(n=>saved.sessions[n]?.switches && saved.sessions[n]?.practice && saved.sessions[n]?.break && Array.isArray(saved.sessions[n]?.events))) db=saved;} catch {storageFailed=true;}
  const S = () => db.sessions[db.current];
  function save(){
    // 서버 연결 지점: sessions/{sessionId}에 인증된 강사만 저장, 서버 성공 응답 후 UI 확정.
    try {localStorage.setItem(KEY,JSON.stringify(db));storageFailed=false;} catch {storageFailed=true;}
    $('storageNote').textContent=storageFailed?'저장 불가 · 새로고침 시 변경 소실':'이 브라우저에 저장 · 실제 청중 화면과 연결 없음';
  }
  function log(text){S().events.push({at:new Date().toISOString(),text});S().events=S().events.slice(-200);}
  function commit(text){log(text);save();render();say(text);}
  function say(text){$('status').textContent=text;$('status').classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>$('status').classList.remove('show'),2200);}
  function button(id,text,ghost=false){return `<button type="button" class="btn${ghost?' ghost':''}" id="${id}">${text}</button>`;}
  function sw(id){const label=switches.find(x=>x[0]===id)[1];return `<div class="switchrow"><b id="${id}Label">${label}</b><div class="sw-wrap"><span class="sw-state" id="${id}State">OFF</span><button type="button" class="switch" id="${id}" role="switch" aria-checked="false" aria-labelledby="${id}Label"></button></div></div>`;}
  function card(n,title,content){return `<section class="card wide" aria-labelledby="card${n}"><h2 id="card${n}">${n}. ${title}</h2>${content}</section>`;}
  function timerUI(prefix){return `<div class="row"><output class="tdisp" id="${prefix}Time" role="timer">10:00</output><span id="${prefix}State"></span></div><div class="row">${button(prefix+'Start','시작·재개')}${button(prefix+'Pause','일시정지',true)}${button(prefix+'Add','1분 추가',true)}${button(prefix+'End','종료',true)}</div>`;}
  $('mockCards').innerHTML =
    card(1,'강사 로그인','<p>나무쌤 · 데모 강사</p><p class="note">입장 비밀번호: 1234 · 실제 인증 기능 없음</p>')+
    card(2,'수업 준비',`<form id="setupForm" class="field-grid"><label>회차<select id="sessionSelect"><option value="1">1회차</option><option value="2">2회차</option><option value="3">3회차</option><option value="4">4회차</option></select></label><label>진행 방식<select id="deliveryMode"><option>대면</option><option>온라인</option></select></label><label>예상 인원<input id="expectedAttendance" type="number" min="1" max="1000" required></label><button class="btn" type="submit">준비 저장</button></form><p class="note">초기값: 회차별 20명 · 대면 · 실습 포함 · 변경 가능</p>`)+
    card(3,'청중 입장 안내',`${sw('swAdmission')}<label>참여 주소<input id="audienceUrl" readonly></label><div class="row">${button('copyAudience','주소 복사')}${button('showQr','QR 확대',true)}${button('joinMock','모의 입장 +1',true)}${button('leaveMock','모의 퇴장 -1',true)}</div><p id="connectionCount"></p><p class="note">QR: 실제 청중 슬라이드 주소 · 접속 수: 목업 연결 수</p>`)+
    card(4,'수업 시작',`<p id="sessionStatus"></p><div class="row">${button('startSession','수업 시작')}${sw('swLock')}</div>`)+
    card(5,'슬라이드 진행',`<p class="now"><span class="num" id="curNum"></span><span class="ttl" id="curTitle"></span></p><label>슬라이드 선택<select id="slideSelect"></select></label><div class="row">${button('prevBtn','◀ 이전')}${button('nextBtn','다음 ▶')}</div><p id="audiencePreview" class="note"></p>`)+
    card(6,'실습 진행',`<form id="practiceForm"><label>실습 제목<input id="practiceTitle" maxlength="80" required></label><label>실습 프롬프트<textarea id="practicePrompt" maxlength="2000" required></textarea></label><button type="submit" class="btn">실습 저장</button></form>${sw('swPrompt')}${timerUI('practice')}<p id="promptPreview" class="note"></p>`)+
    card(7,'질문 확인',`${sw('swQuestions')}<form id="questionForm" class="row"><label class="grow">모의 질문<input id="questionText" maxlength="500" required></label><button type="submit" class="btn">질문 추가</button></form><div id="questionList" class="entries"></div><h3>공개 질문 미리보기</h3><div id="publicQuestions"></div>`)+
    card(8,'휴식 진행',`${timerUI('break')}<p class="note">휴식 시작: 해당 회차 휴식 장 이동 · 종료: 이전 슬라이드 복귀</p>`)+
    card(9,'자료 공개',`${sw('swPdf')}<div class="row">${button('printMock','PDF 미리보기')}${button('addMaterial','자료 추가',true)}</div><p class="note">PDF OFF: 관리자 포함 미리보기·P 단축키·인쇄 차단</p><div id="materialList" class="entries"></div><h3>공개 자료 미리보기</h3><div id="publicMaterials"></div>`)+
    card(10,'후기 수집',`${sw('swFeedback')}<form id="feedbackForm" class="field-grid"><label>만족도<select id="rating"><option value="5">5점</option><option value="4">4점</option><option value="3">3점</option><option value="2">2점</option><option value="1">1점</option></select></label><label>모의 후기<input id="feedbackText" maxlength="500" required></label><button type="submit" class="btn">후기 추가</button></form><div id="feedbackList" class="entries"></div><h3>공개 후기 미리보기</h3><div id="publicFeedback"></div><p class="note">질문·후기 공개 데이터: 이름 제외 · 건별 승인</p>`)+
    card(11,'수업 종료',`${sw('swReview')}<div class="row">${button('endSession','수업 종료')}</div><p class="note">종료 시 예약 자료 공개 · 실습·휴식 타이머 종료 · 입장·질문·후기 접수 종료</p>`)+
    card(12,'수업 기록',`<p>상단 회차 선택으로 이전 회차 기록 확인</p><div class="row">${button('downloadRecord','기록 내려받기')}</div><ol id="eventList"></ol>`);
  TITLES.forEach((title,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}. ${title}`;$('slideSelect').append(o);});
  // 서버 연결 지점: Auth 세션 및 admins 권한 확인. 데모 비밀번호를 서버로 전송하지 않음.
  $('gateForm').addEventListener('submit',e=>{e.preventDefault();if($('pw').value!=='1234'){$('gateErr').textContent='비밀번호 불일치';return;}authenticated=true;$('pw').value='';$('gate').hidden=true;$('panel').hidden=false;render();$('logout').focus();});
  $('logout').onclick=()=>{authenticated=false;$('panel').hidden=true;$('gate').hidden=false;$('pw').focus();};
  $('resetDemo').onclick=()=>{if(!confirm('현재 회차 목업 데이터 초기화?'))return;db.sessions[db.current]=fresh();commit('현재 회차 초기화');};
  $('sessionSelect').onchange=e=>{db.current=e.target.value;save();render();};
  $('setupForm').onsubmit=e=>{e.preventDefault();S().deliveryMode=$('deliveryMode').value;S().expectedAttendance=Number($('expectedAttendance').value);commit('수업 준비 저장');};
  // 서버 연결 지점: 스위치 id에서 만든 키를 sessions/{id}/policies에 저장.
  // PDF 등 정책 판단에는 관리자 권한 예외 없음. 공개·접수 정책도 동일 기준 적용.
  document.querySelectorAll('button[role="switch"]').forEach(el=>{el.onclick=()=>{const key=switchKey(el.id);S().switches[key]=!S().switches[key];if(key==='review'&&S().status==='종료')S().switches.lock=!S().switches.review;commit(el.getAttribute('aria-labelledby')?$(el.getAttribute('aria-labelledby')).textContent+' '+(S().switches[key]?'ON':'OFF'):'정책 변경');};});
  $('stickyLock').onclick=()=>$('swLock').click();
  const audienceUrl = 'https://namunamu1013.vercel.app/slides.html';
  $('audienceUrl').value=audienceUrl;
  $('copyAudience').onclick=async()=>{try{await navigator.clipboard.writeText(audienceUrl);say('주소 복사 완료');}catch{$('audienceUrl').select();say('주소 선택 완료 · 직접 복사');}};
  $('showQr').onclick=()=>{$('qrDialog').showModal();};
  $('qrClose').onclick=()=>$('qrDialog').close();
  $('joinMock').onclick=()=>{if(!S().switches.admission){say('입장 접수 OFF');return;}S().connections++;commit('모의 입장');};
  $('leaveMock').onclick=()=>{S().connections=Math.max(0,S().connections-1);commit('모의 퇴장');};
  $('startSession').onclick=()=>{S().status='진행';S().startedAt=new Date().toISOString();S().endedAt=null;S().slide=(Number(db.current)-1)*30;S().switches.lock=true;commit('수업 시작');};
  function move(n){S().slide=Math.max(0,Math.min(TITLES.length-1,n));commit((S().slide+1)+'장 이동');}
  $('prevBtn').onclick=()=>move(S().slide-1);$('nextBtn').onclick=()=>move(S().slide+1);
  $('stickyPrev').onclick=$('prevBtn').onclick;$('stickyNext').onclick=$('nextBtn').onclick;
  $('slideSelect').onchange=e=>move(Number(e.target.value));
  $('practiceForm').onsubmit=e=>{e.preventDefault();S().practiceTitle=$('practiceTitle').value;S().practicePrompt=$('practicePrompt').value;commit('실습 안내 저장');};
  const remaining=t=>t.running?Math.max(0,Math.ceil((t.endAt-Date.now())/1000)):t.remaining;
  // 서버 연결 지점: 서버 시각 기준 endsAt 저장·구독. 새로고침 후에도 종료 시각 유지.
  ['practice','break'].forEach(kind=>{
    $(kind+'Start').onclick=()=>{const t=S()[kind];if(t.running&&remaining(t)>0)return;if(kind==='break'&&!S().breakActive){S().returnSlide=S().slide;S().breakActive=true;S().slide=(Number(db.current)-1)*30+14;}t.remaining=remaining(t)||600;t.endAt=Date.now()+t.remaining*1000;t.running=true;commit(kind==='break'?'휴식 시작':'실습 시작');};
    $(kind+'Pause').onclick=()=>{const t=S()[kind];t.remaining=remaining(t);t.running=false;t.endAt=null;commit('타이머 일시정지');};
    $(kind+'Add').onclick=()=>{const t=S()[kind];if(t.running)t.endAt+=60000;else t.remaining+=60;commit('타이머 1분 추가');};
    $(kind+'End').onclick=()=>{S()[kind]={remaining:0,endAt:null,running:false};if(kind==='break'&&S().breakActive){S().slide=S().returnSlide;S().breakActive=false;}commit(kind==='break'?'휴식 종료':'실습 종료');};
  });
  function uid(){return crypto.randomUUID();}
  $('questionForm').onsubmit=e=>{e.preventDefault();if(!S().switches.questions){say('질문 접수 OFF');return;}S().questions.push({id:uid(),name:'모의 참가자',text:$('questionText').value,answered:false,approved:false});$('questionText').value='';commit('질문 접수');};
  $('feedbackForm').onsubmit=e=>{e.preventDefault();if(!S().switches.feedback){say('후기 접수 OFF');return;}S().feedback.push({id:uid(),name:'모의 참가자',text:$('feedbackText').value,rating:Number($('rating').value),approved:false});$('feedbackText').value='';commit('후기 접수');};
  function renderEntries(kind,container){$(container).replaceChildren();S()[kind].forEach(item=>{const row=document.createElement('article');row.className='entry';const p=document.createElement('p');p.textContent=item.name+' · '+(item.rating?item.rating+'점 · ':'')+item.text;row.append(p);const controls=document.createElement('div');controls.className='row';
    if(kind==='questions'){const b=document.createElement('button');b.className='btn ghost';b.textContent=item.answered?'답변 완료 취소':'답변 완료';b.onclick=()=>{item.answered=!item.answered;commit('답변 상태 변경');};controls.append(b);}
    const b=document.createElement('button');b.className='btn';b.textContent=item.approved?'공개 취소':'공개 승인';b.setAttribute('aria-pressed',String(item.approved));b.onclick=()=>{item.approved=!item.approved;commit('공개 승인 변경');};controls.append(b);row.append(controls);$(container).append(row);});}
  // 서버 연결 지점: 승인 후 publicQuestions/publicFeedback에 아래 투영 결과만 저장.
  // 이름을 CSS로 숨기는 대신 공개 데이터에서 제거.
  const publicData=items=>items.filter(x=>x.approved).map(x=>({text:x.text,...(x.rating?{rating:x.rating}:{})}));
  function publicPreview(id,items){$(id).replaceChildren();if(!items.length){$(id).textContent='공개 항목 없음';return;}items.forEach(item=>{const p=document.createElement('p');p.textContent=(item.rating?item.rating+'점 · ':'')+item.text;$(id).append(p);});}
  $('addMaterial').onclick=()=>{S().materials.push({id:uid(),title:'새 자료',url:'',releaseMode:'비공개',publishedAt:null});commit('자료 추가');};
  function renderMaterials(){$('materialList').replaceChildren();S().materials.forEach(item=>{const form=document.createElement('form');form.className='entry field-grid';
    const title=document.createElement('input');title.value=item.title;title.required=true;title.maxLength=100;const titleLabel=document.createElement('label');titleLabel.textContent='자료 제목';titleLabel.append(title);
    const url=document.createElement('input');url.type='url';url.value=item.url;url.placeholder='https://';const urlLabel=document.createElement('label');urlLabel.textContent='자료 주소';urlLabel.append(url);
    const select=document.createElement('select');['비공개','지금 공개','종료 후 공개'].forEach(v=>{const o=document.createElement('option');o.textContent=v;select.append(o);});select.value=item.releaseMode;const selectLabel=document.createElement('label');selectLabel.textContent='공개 시점';selectLabel.append(select);
    const b=document.createElement('button');b.type='submit';b.className='btn';b.textContent='자료 저장';form.append(titleLabel,urlLabel,selectLabel,b);
    form.onsubmit=e=>{e.preventDefault();if(url.value&&!/^https?:\/\//i.test(url.value)){say('http 또는 https 주소 필요');return;}item.title=title.value;item.url=url.value;item.releaseMode=select.value;item.publishedAt=select.value==='지금 공개'||select.value==='종료 후 공개'&&S().status==='종료'?new Date().toISOString():null;commit('자료 공개 설정 저장');};$('materialList').append(form);});
    publicPreview('publicMaterials',S().materials.filter(x=>x.publishedAt).map(x=>({text:x.title+(x.url?' · '+x.url:' · 주소 미등록')})));}
  function printPolicy(){return S().switches.pdf;}
  $('printMock').onclick=()=>{if(!printPolicy()){say('PDF 저장 OFF');return;}window.print();};
  document.addEventListener('keydown',e=>{if(!authenticated||e.target.closest('input,textarea,select'))return;if(e.key.toLowerCase()==='p'){e.preventDefault();$('printMock').onclick();}});
  // 인쇄 메뉴 직접 호출에도 관리자 예외 없이 같은 PDF 정책 적용.
  window.addEventListener('beforeprint',()=>document.documentElement.classList.toggle('pdf-blocked',!printPolicy()));
  $('endSession').onclick=()=>{if(!confirm('현재 회차 수업 종료?'))return;S().status='종료';S().endedAt=new Date().toISOString();if(S().breakActive){S().slide=S().returnSlide;S().breakActive=false;}['practice','break'].forEach(k=>{S()[k]={remaining:0,endAt:null,running:false};});['admission','questions','feedback'].forEach(k=>S().switches[k]=false);S().switches.lock=!S().switches.review;S().materials.forEach(m=>{if(m.releaseMode==='종료 후 공개')m.publishedAt=S().endedAt;});commit('수업 종료');};
  $('downloadRecord').onclick=()=>{const blob=new Blob([JSON.stringify({sessionId:db.current,...S()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ai-life-session-'+db.current+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);say('현재 회차 기록 내려받기');};
  function renderTimers(){['practice','break'].forEach(k=>{const t=S()[k],sec=remaining(t);$(k+'Time').textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');$(k+'State').textContent=sec===0?'종료':t.running?'진행':'정지';});}
  function render(){
    const s=S();$('sessionSelect').value=db.current;$('deliveryMode').value=s.deliveryMode;$('expectedAttendance').value=s.expectedAttendance;
    $('practiceTitle').value=s.practiceTitle;$('practicePrompt').value=s.practicePrompt;
    $('curNum').textContent=(s.slide+1)+' / '+TITLES.length;$('curTitle').textContent=TITLES[s.slide];$('slideSelect').value=s.slide;
    $('stickyStatus').textContent=db.current+'회차 · '+s.status+' · '+(s.slide+1)+'장 · 잠금 '+(s.switches.lock?'ON':'OFF');
    ['prevBtn','stickyPrev'].forEach(id=>$(id).disabled=s.slide===0);['nextBtn','stickyNext'].forEach(id=>$(id).disabled=s.slide===TITLES.length-1);
    switches.forEach(([id])=>{const on=!!s.switches[switchKey(id)];$(id).setAttribute('aria-checked',String(on));$(id+'State').textContent=on?'ON':'OFF';});
    $('printMock').disabled=!printPolicy();document.documentElement.classList.toggle('pdf-blocked',!printPolicy());
    $('startSession').disabled=s.status==='진행';$('endSession').disabled=s.status==='종료';
    $('connectionCount').textContent='모의 연결 '+s.connections+'개 · 예상 인원 '+s.expectedAttendance+'명';
    $('sessionStatus').textContent=s.status+(s.startedAt?' · 시작 '+new Date(s.startedAt).toLocaleTimeString('ko-KR'):'');
    $('audiencePreview').textContent=s.switches.lock?'청중 미리보기: '+(s.slide+1)+'장 · '+TITLES[s.slide]:'청중 미리보기: 자유 이동';
    $('promptPreview').textContent=s.switches.prompt?s.practicePrompt:'프롬프트 비공개';
    $('questionText').disabled=!s.switches.questions;$('feedbackText').disabled=!s.switches.feedback;
    renderEntries('questions','questionList');renderEntries('feedback','feedbackList');renderMaterials();
    publicPreview('publicQuestions',publicData(s.questions));publicPreview('publicFeedback',publicData(s.feedback));
    $('eventList').replaceChildren();s.events.slice(-12).reverse().forEach(e=>{const li=document.createElement('li');li.textContent=new Date(e.at).toLocaleTimeString('ko-KR')+' · '+e.text;$('eventList').append(li);});
    $('storageNote').textContent=storageFailed?'저장 불가 · 새로고침 시 변경 소실':'이 브라우저에 저장 · 실제 청중 화면과 연결 없음';renderTimers();
  }
  render();setInterval(renderTimers,500);
})();
