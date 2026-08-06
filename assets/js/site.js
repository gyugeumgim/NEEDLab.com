/* ============================================================
   NEED Lab — 콘텐츠 로더
   화면에 보이는 내용은 전부 /content/*.json 에서 읽어옵니다.
   HTML을 건드리지 않고 JSON만 고치면 홈페이지가 바뀝니다.
   ============================================================ */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* 이미지가 없을 때 보여줄 연구실 앰블럼 */
const EMBLEM = 'assets/img/emblem.png';
const emblemImg = () => `<img class="emblemph" src="${EMBLEM}" alt="NEED Lab" loading="lazy">`;

async function load(name){
  // 웹 서버에 올라간 경우: content/*.json 을 직접 읽습니다 (수정 즉시 반영)
  if(location.protocol !== 'file:'){
    try{
      const r = await fetch(`content/${name}.json`, { cache:'no-store' });
      if(r.ok) return await r.json();
    }catch(_){ /* 아래 예비 데이터로 넘어감 */ }
  }
  // 파일을 더블클릭해서 열었을 때: 브라우저가 보안상 JSON 읽기를 막으므로
  // 미리 만들어 둔 assets/js/content-data.js 의 사본을 사용합니다.
  if(window.NEEDLAB_DATA && window.NEEDLAB_DATA[name]) return window.NEEDLAB_DATA[name];
  throw new Error(`${name} 데이터를 찾을 수 없습니다`);
}
const fail = (el, what) => { if(el) el.innerHTML =
  `<p class="empty">${esc(what)}을(를) 불러오지 못했습니다. 새로고침해 주세요.</p>`; };
const KIND = { award:'수상', press:'보도', event:'행사', paper:'논문' };
const ym = d => { const [y,m] = String(d).split('-'); return m ? `${y}.${m}` : y; };

/* ---------- 모바일 메뉴 ---------- */
function initNav(){
  const btn = document.querySelector('.navtoggle'), nav = document.getElementById('nav');
  if(!btn || !nav) return;
  const mq = matchMedia('(max-width:920px)');
  const sync = () => { nav.hidden = mq.matches; btn.setAttribute('aria-expanded','false'); };
  sync(); mq.addEventListener('change', sync);
  btn.addEventListener('click', () => {
    const open = !nav.hidden; nav.hidden = open;
    btn.setAttribute('aria-expanded', String(!open));
  });
  nav.addEventListener('click', e => {
    const top = e.target.closest('.navitem > a');
    if(top && mq.matches){          // 모바일: 첫 클릭은 하위 메뉴 펼치기
      const item = top.parentElement;
      if(!item.classList.contains('open')){ e.preventDefault(); item.classList.add('open'); return; }
    }
    if(e.target.tagName === 'A' && mq.matches) nav.hidden = true;
  });
}

/* ---------- 공통 텍스트 (연락처 등) ---------- */
async function initSite(){
  try{
    const s = await load('site');
    document.querySelectorAll('[data-site]').forEach(n => {
      const v = s[n.dataset.site]; if(v) n.textContent = v;
    });
    document.querySelectorAll('[data-mail]').forEach(n => {
      if(s.email) n.href = 'mailto:' + s.email;
    });
    // 히어로
    const tg = document.getElementById('hero-tags');
    if(tg && s.tags) tg.innerHTML = s.tags.map(t => `<li>${esc(t)}</li>`).join('');
    const ip = document.getElementById('hero-intro');
    if(ip && s.introEn) ip.innerHTML = s.introEn.map(p => `<p>${esc(p)}</p>`).join('');
    // 대표 이미지
    const sc = document.getElementById('showcase');
    if(sc) sc.innerHTML = s.heroPhoto ? `<img src="${esc(s.heroPhoto)}" alt="연구실 대표 이미지">` : emblemImg();
    const sh = document.getElementById('shots');
    if(sh){
      const ph = (s.labPhotos||[]).filter(p => p && p.image);
      sh.innerHTML = ph.length
        ? ph.map(p => `<figure><img src="${esc(p.image)}" alt="${esc(p.caption||'연구실 사진')}" loading="lazy"></figure>`).join('')
        : [1,2,3,4].map(() => `<figure>${emblemImg()}</figure>`).join('');
    }
    const rc = document.getElementById('recruit-text');
    if(rc && s.recruiting) rc.textContent = s.recruiting;
  }catch(e){ console.warn(e); }
}

/* ---------- 흐르는 하이라이트 배너 ---------- */
async function initTicker(){
  const host = document.getElementById('ticker-move');
  if(!host) return;
  try{
    const { items } = await load('highlights');
    if(!items || !items.length){ document.querySelector('.ticker')?.remove(); return; }
    const one = items.map(i => `<a href="${esc(i.link||'#')}">
      <span class="dot"></span><span class="tdate">${esc(i.date)}</span>
      <span class="tbadge">${esc(i.badge)}</span><span>${esc(i.text)}</span></a>`).join('');
    host.innerHTML = one + one;   // 끊김 없이 흐르도록 2벌
  }catch(e){ document.querySelector('.ticker')?.remove(); }
}

/* ---------- 소식 ---------- */
const newsCard = n => {
  const img = n.image
    ? `<img src="${esc(n.image)}" alt="${esc(n.title)}" loading="lazy">`
    : emblemImg();
  return `<li class="ncard">
    <span class="nc-img">${img}</span>
    <span class="nc-body">
      <span class="nc-top">
        <time datetime="${esc(n.date)}">${esc(ym(n.date))}</time>
        <span class="kind ${esc(n.category||'')}">${esc(KIND[n.category]||n.category||'')}</span>
      </span>
      <h3>${esc(n.title)}</h3><p>${esc(n.body)}</p>
    </span></li>`;
};

async function initNews(){
  const recent = document.getElementById('recent'), all = document.getElementById('news-all');
  if(!recent && !all) return;
  try{
    const { items } = await load('news');
    const sorted = [...items].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if(recent){ recent.classList.add('newsgrid'); recent.innerHTML = sorted.slice(0,4).map(newsCard).join(''); }
    if(all){ all.classList.add('newsgrid'); all.innerHTML = sorted.length ? sorted.map(newsCard).join('')
      : '<li class="empty">등록된 소식이 없습니다.</li>'; }
  }catch(e){ fail(recent||all,'소식'); }
}

/* ---------- 연구 ---------- */
function rcardHTML(r, link){
  const inner = `<div class="fig"><img src="${esc(r.icon)}" alt="${esc(r.title)}"></div>
      <div class="b"><p class="rnum">0${r.order}</p><h3>${esc(r.title)}</h3>
        <p class="en">${esc(r.titleEn)}</p><p>${esc(r.summary)}</p></div>`;
  return link ? `<a class="rcard" href="research-${esc(r.slug)}.html">${inner}</a>`
              : `<article class="rcard">${inner}</article>`;
}

async function initResearch(){
  const cards = document.getElementById('rcards');
  const linked = document.getElementById('rcards-link');
  const other = document.getElementById('rcards-other');
  const detail = document.getElementById('rdetail');
  if(!cards && !linked && !other && !detail) return;
  try{
    const { items } = await load('research');
    const sorted = [...items].sort((a,b)=>a.order-b.order);
    if(cards)  cards.innerHTML  = sorted.map(r=>rcardHTML(r,true)).join('');
    if(linked) linked.innerHTML = sorted.map(r=>rcardHTML(r,true)).join('');
    if(other){
      const ex = other.dataset.exclude;
      other.innerHTML = sorted.filter(r=>r.slug!==ex).map(r=>rcardHTML(r,true)).join('');
    }
    if(detail){
      const r = sorted.find(x=>x.slug===detail.dataset.slug);
      if(!r){ fail(detail,'연구 소개'); return; }
      const t = document.getElementById('rd-title'), e = document.getElementById('rd-en');
      if(t) t.textContent = r.title;
      if(e) e.textContent = r.titleEn;
      detail.innerHTML = `
        <div class="rd-top">
          <div class="rd-text">${(r.detail||r.body||[]).map(p=>`<p>${esc(p)}</p>`).join('')}</div>
          <div class="rd-fig"><img src="${esc(r.icon)}" alt="${esc(r.title)}"></div>
        </div>
        ${(r.points||[]).length ? `<div class="rd-points">${
          r.points.map(p=>`<div class="rd-pt"><h4>${esc(p.title)}</h4><p>${esc(p.body)}</p></div>`).join('')
        }</div>` : ''}
        ${r.ref ? `<p class="rd-ref">${esc(r.ref)}</p>` : ''}`;
    }
  }catch(e){ fail(cards||linked||detail,'연구 소개'); }
}

/* ---------- 구성원 ---------- */
async function initMembers(){
  const pi = document.getElementById('pi'), g = document.getElementById('grad'),
        u = document.getElementById('ug'), al = document.getElementById('alumni-body');
  if(!pi && !g && !al) return;
  try{
    const m = await load('members');
    if(pi && m.professor){
      const p = m.professor;
      pi.innerHTML = `
        <div class="pi-photo">${p.photo?`<img src="${esc(p.photo)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover">`:emblemImg()}</div>
        <div>
          <h3>${esc(p.name)}</h3><p class="en">${esc(p.nameEn)}</p>
          <p class="role">${esc(p.role)}</p>
          <p style="margin:0 0 6px">${esc(p.office)}</p>
          <p style="margin:0 0 6px">Tel ${esc(p.tel)}</p>
          <p style="margin:0"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></p>
          <ul class="cv">${(p.cv||[]).map(c=>`<li><span class="yr">${esc(c.year)}</span>
            <span>${esc(c.title)}${c.note?`<br><span style="color:var(--muted);font-size:13px">${esc(c.note)}</span>`:''}</span></li>`).join('')}</ul>
        </div>`;
    }
    const card = s => `<div class="person">
      <div class="ph">${s.photo?`<img src="${esc(s.photo)}" alt="${esc(s.name)}">`:emblemImg()}</div>
      <h3>${esc(s.name)}</h3><p class="rl">${esc(s.nameEn)}</p>
      <p class="rl" style="color:var(--muted)">${esc(s.role)}</p></div>`;
    const st = m.students || [];
    if(g) g.innerHTML = st.filter(x=>x.degree==='graduate').map(card).join('');
    if(u) u.innerHTML = st.filter(x=>x.degree==='undergraduate').map(card).join('');
    if(al) al.innerHTML = (m.alumni||[]).map(a=>`<tr>
      <td><strong>${esc(a.name)}</strong></td><td>${esc(a.nameEn)}</td>
      <td class="deg">${esc(a.degree)}</td><td class="now">${esc(a.now||'—')}</td></tr>`).join('');
  }catch(e){ fail(g||pi||al,'구성원'); }
}

/* ---------- 논문 ---------- */
async function initPubs(){
  const host = document.getElementById('pubs');
  if(!host) return;
  try{
    const { items, patents } = await load('publications');
    const by = {};
    items.forEach(p => (by[p.year] ||= []).push(p));
    let html = Object.keys(by).sort((a,b)=>b.localeCompare(a)).map(y => `
      <p class="pyear">${esc(y)}</p>
      ${by[y].sort((a,b)=>b.no-a.no).map(p => `
        <article class="pitem haspic"><span class="pno">${p.no}</span>
          <span class="pfig">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`:emblemImg()}</span>
          <div>
          <p class="t">${p.link?`<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.title)}</a>`:esc(p.title)}</p>
          <p class="a">${esc(p.authors)}</p>
          <p class="j">${esc(p.journal)}</p>
          ${p.link?`<p class="pdoi"><a href="${esc(p.link)}" target="_blank" rel="noopener">doi: ${esc(p.link.replace('https://doi.org/',''))}</a></p>`:''}
          ${p.flag?`<span class="flag">${esc(p.flag)}</span>`:''}
        </div></article>`).join('')}`).join('');
    if(patents && patents.length){
      html += `<p class="pyear" style="margin-top:44px">PATENTS</p>` + patents.map(p=>`
        <article class="pitem"><span class="pno">${esc(p.region)}</span><div>
          <p class="t">${esc(p.title)}</p><p class="a">${esc(p.authors)}</p>
          <p class="j">${esc(p.no)}</p></div></article>`).join('');
    }
    host.innerHTML = html;
    const cnt = document.getElementById('pub-count');
    if(cnt) cnt.textContent = `논문 ${items.length}편 · 특허 ${(patents||[]).length}건`;
  }catch(e){ fail(host,'논문 목록'); }
}

/* ---------- 앨범 : 연도별 주제 카드 → 라이트박스 ---------- */
async function initAlbum(){
  const host = document.getElementById('album-list');
  if(!host) return;
  let DATA = [];
  try{
    const { items } = await load('album');
    DATA = [...items].sort((a,b)=>String(b.year).localeCompare(String(a.year)));
  }catch(e){ fail(host,'앨범'); return; }

  // 사진이 있는 연도만 표시
  const years = DATA.filter(y => (y.albums||[]).length);
  if(!years.length){ host.innerHTML = '<p class="empty">등록된 사진이 없습니다.</p>'; return; }

  const FLAT = [];   // 라이트박스에서 참조할 전체 주제 목록
  host.innerHTML = years.map(y => {
    const cards = (y.albums||[]).map(a => {
      const i = FLAT.push(a) - 1;
      const n = (a.photos||[]).length;
      const cover = a.cover || (a.photos && a.photos[0] && a.photos[0].image) || '';
      return `<button class="acard" type="button" data-i="${i}">
        <span class="ac-img">${cover?`<img src="${esc(cover)}" alt="${esc(a.title)}" loading="lazy">`
          :emblemImg()}</span>
        <span class="ac-meta"><span class="ac-title">${esc(a.title)}</span>
        <span class="ac-cnt">사진 ${n}장</span></span></button>`;
    }).join('');
    return `<section class="ayear">
      <div class="ay-head"><h3>${esc(y.year)}</h3>
        <span class="ay-cnt">${(y.albums||[]).length}개 앨범</span></div>
      <div class="acards">${cards}</div>
    </section>`;
  }).join('');

  const LB = document.getElementById('lb');
  const SL = document.getElementById('lb-slide'), CAP = document.getElementById('lb-cap'),
        CNT = document.getElementById('lb-cnt'), TT = document.getElementById('lb-year'),
        DOTS = document.getElementById('lb-dots');
  let shots = [], idx = 0, lastFocus = null;

  function draw(){
    const it = shots[idx];
    SL.innerHTML = it.image ? `<img src="${esc(it.image)}" alt="${esc(it.caption||'')}">`
                            : emblemImg();
    CAP.textContent = it.caption || '';
    CNT.textContent = `${idx+1} / ${shots.length}`;
    DOTS.innerHTML = shots.map((_,i)=>`<button type="button" data-i="${i}"
      aria-label="${i+1}번째 사진"${i===idx?' aria-current="true"':''}></button>`).join('');
  }
  function open(a){
    shots = (a.photos&&a.photos.length) ? a.photos : [{image:'',caption:a.title}];
    idx = 0; TT.textContent = a.title; draw();
    lastFocus = document.activeElement;
    LB.hidden = false; document.body.style.overflow = 'hidden';
    document.getElementById('lb-close').focus();
  }
  function close(){ LB.hidden = true; document.body.style.overflow=''; if(lastFocus) lastFocus.focus(); }
  function go(d){ idx = (idx+d+shots.length)%shots.length; draw(); }

  host.addEventListener('click', e => {
    const b = e.target.closest('.acard'); if(b) open(FLAT[+b.dataset.i]);
  });
  document.getElementById('lb-close').addEventListener('click', close);
  document.getElementById('lb-prev').addEventListener('click', ()=>go(-1));
  document.getElementById('lb-next').addEventListener('click', ()=>go(1));
  DOTS.addEventListener('click', e => { const t=e.target.closest('button'); if(t){ idx=+t.dataset.i; draw(); }});
  LB.addEventListener('click', e => { if(e.target===LB) close(); });
  document.addEventListener('keydown', e => {
    if(LB.hidden) return;
    if(e.key==='Escape') close();
    if(e.key==='ArrowLeft') go(-1);
    if(e.key==='ArrowRight') go(1);
  });
}

/* ---------- 문의 폼 ---------- */
function initForm(){
  const f = document.getElementById('mailform');
  if(!f) return;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const n = f.name.value.trim(), m = f.email.value.trim(), t = f.message.value.trim();
    const err = document.getElementById('mf-err');
    if(!n || !m || !t){ err.textContent = '이름, 이메일, 문의 내용을 모두 입력해 주세요.'; return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)){ err.textContent = '이메일 주소를 다시 확인해 주세요.'; return; }
    err.textContent = '';
    let to = 'dhha@cau.ac.kr';
    try{ const s = await load('site'); if(s.email) to = s.email; }catch(_){}
    const subj = `[NEED Lab 문의] ${n}`;
    const body = `${t}\n\n---\n보낸 사람: ${n}\n회신 주소: ${m}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  });
}


/* ---------- 스크롤 등장 효과 ---------- */
function initMotion(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 등장시킬 요소에 표시 붙이기
  const targets = [];
  document.querySelectorAll('.sec .lab, .sec h2, .sec .sub').forEach(el => targets.push([el,0]));
  document.querySelectorAll('.rcard, .acard, .person, .rd-pt, .shots figure')
    .forEach((el,i) => targets.push([el, i % 6]));
  document.querySelectorAll('.log li, .pitem, .ayear, .layer, .showcase, .cta, .pi-row, .tbl')
    .forEach((el,i) => targets.push([el, i % 4]));

  targets.forEach(([el,d]) => {
    if(el.hasAttribute('data-rise')) return;
    el.setAttribute('data-rise','');
    if(d) el.classList.add('d'+d);
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); }
    });
  }, { threshold:0.08, rootMargin:'0px 0px -40px 0px' });

  document.querySelectorAll('[data-rise]').forEach(el => io.observe(el));

  // 헤더 그림자
  const head = document.querySelector('.head');
  if(head){
    const onScroll = () => head.classList.toggle('stuck', window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive:true });
  }
}

// 내용이 그려진 뒤에 다시 걸어주기 (JSON으로 그리는 부분)
function refreshMotion(){ setTimeout(initMotion, 60); }

document.addEventListener('DOMContentLoaded', () => {
  initNav(); initSite(); initTicker(); initNews();
  initResearch(); initMembers(); initPubs(); initAlbum(); initForm();
  const yr = document.getElementById('yr');
  if(yr) yr.textContent = new Date().getFullYear();
  initMotion();
  refreshMotion();           // JSON 렌더 직후 한 번 더
  setTimeout(initMotion, 400);
});
