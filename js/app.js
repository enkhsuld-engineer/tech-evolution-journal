// js/app.js
let POSTS = [];
let PROJECTS = [];
let I18N = {};
let state = { q:'', tag:null, route:'home', articleId:null };
let titlePage = 1;

const $ = s => document.querySelector(s);
const uniq = a => Array.from(new Set(a));
/* =========================
   Language 
   ========================= */
const LANG_KEY = 'dl-lang';
function getLang(){ return localStorage.getItem(LANG_KEY) || 'en'; }
function setLang(v){ localStorage.setItem(LANG_KEY, v); }

function t(key){
  const get = (obj, path) => path.split('.').reduce((o,k)=> (o && o[k] != null) ? o[k] : null, obj);
  const v = get(I18N, key);
  return (typeof v === 'string') ? v : key;
}

async function loadI18n(){
  const L = getLang();
  try{
    const res = await fetch(`i18n/${L}.json`, { cache:'no-store' });
    if(!res.ok) throw new Error('i18n load failed');
    I18N = await res.json();
  }catch(_){
    const res = await fetch(`i18n/en.json`, { cache:'no-store' });
    I18N = res.ok ? await res.json() : {};
  }
  document.documentElement.setAttribute('lang', getLang());
}

/* =========================
   Theme
   ========================= */
const root = document.documentElement;
const THEME_KEY='dl-theme';
function applyTheme(t){ root.classList.toggle('light', t==='light'); }
function getTheme(){
  return localStorage.getItem(THEME_KEY) ||
    (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}
document.addEventListener('click', e=>{
  if(e.target && (e.target.id==='darkToggle' || e.target.closest('#darkToggle'))){
    const t = getTheme()==='light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY,t);
    applyTheme(t);
  }
});
applyTheme(getTheme());

/* =========================
   Data loading
   ========================= */
async function loadPosts(){
  const res = await fetch('posts/index.json', { cache:'no-store' });
  POSTS = await res.json();

  POSTS = POSTS.map(p => ({
    ...p,
    tags: (p.tags || [])
      .flatMap(s => String(s).split(','))
      .map(s => s.trim())
      .filter(Boolean)
  }));

  POSTS.sort((a,b) => (a.date < b.date ? 1 : -1));
}
async function loadProjects(){

  PROJECTS = [
    {
      id:'inv-stack',
      pinned:true,
      title_key:'projects.pj.inv_stack.title',
      meta_key:'projects.pj.inv_stack.meta',
      desc_key:'projects.pj.inv_stack.desc',

      phase_key:'projects.phases.complete',
      progress: 100,
      last_update:'2026-04-13',

      content: {
        en: 'content/projects/inv-stack/en.md',
        ja: 'content/projects/inv-stack/ja.md',
        mn: 'content/projects/inv-stack/mn.md',
      },
    },
    {
      id:'dual-mcu',
      pinned:true,
      title_key:'projects.pj.dual_mcu.title',
      meta_key:'projects.pj.dual_mcu.meta',
      desc_key:'projects.pj.dual_mcu.desc',

      phase_key:'projects.phases.not_started',
      progress: 0,
      last_update:'2026-03-05',

      content: {
        en: 'content/projects/dual-mcu/en.md',
        ja: 'content/projects/dual-mcu/ja.md',
        mn: 'content/projects/dual-mcu/mn.md',
      },
    },
    {
      id:'buck-current',
      pinned:false,
      title_key:'projects.pj.buck_current.title',
      meta_key:'projects.pj.buck_current.meta',
      desc_key:'projects.pj.buck_current.desc',

      phase_key:'projects.phases.not_started',
      progress: 0,
      last_update:'2026-03-05',

      content: {
        en: 'content/projects/buck-current/en.md',
        ja: 'content/projects/buck-current/ja.md',
        mn: 'content/projects/buck-current/mn.md',
      },
    },
  ];
}

/* =========================
   Tag styling
   ========================= */
function tagClass(tag){
  const s = String(tag||'').toLowerCase();
  const isPower = ['power','pwr','inverter','buck','boost','dc','ac','pwm','sv','svm','sine','rectifier','chopper'].some(k=>s.includes(k));
  const isControl = ['control','pi','pid','dq','bode','loop','stability','margin','observer','pll','droop'].some(k=>s.includes(k));
  const isEmbedded = ['embedded','mcu','dsp','stm32','ti','c2000','firmware','interrupt','timer','adc','can'].some(k=>s.includes(k));
  const isTheory = ['theory','math','laplace','fourier','zoh','transfer','state','euler','complex'].some(k=>s.includes(k));

  if(isPower) return 'is-power';
  if(isControl) return 'is-control';
  if(isEmbedded) return 'is-embedded';
  if(isTheory) return 'is-theory';
  return '';
}

function tagPill(tag, clickable=true){
  const cls = tagClass(tag);
  const c = `tag ${cls} ${clickable ? '' : 'more'}`.trim();
  if(!clickable) return `<span class="${c}">#${escapeHtml(tag)}</span>`;
  return `<button class="${c}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`;
}

function tagsCompact(tags, max=3){
  const list = (tags||[]).slice();
  const shown = list.slice(0, max);
  const rest = list.slice(max);
  const shownHtml = shown.map(t=>tagPill(t,true)).join('');
  if(rest.length === 0) return shownHtml;

  const tooltip = rest.map(x=>`#${x}`).join('  ');
  return shownHtml + `<span class="tag more" title="${escapeAttr(tooltip)}">+${rest.length}</span>`;
}

/* =========================
   Basics (from i18n)
   ========================= */
let basicIndex = 0;
function renderBasicsMini(){
  const el = $('#basicsMini');
  if(!el) return;
  const list = (I18N.basics && Array.isArray(I18N.basics)) ? I18N.basics : [];
  el.innerHTML = list.map((b,i)=> `<button class="mini-item" data-basic="${i}">${escapeHtml(b.title)}</button>`).join('');
  el.querySelectorAll('[data-basic]').forEach(btn=>{
    btn.onclick = ()=> openBasic(Number(btn.dataset.basic));
  });
  window.__BASICS_LIST = list;
}

function openBasic(i){
  const list = window.__BASICS_LIST || [];
  if(!list.length) return;
  basicIndex = (i + list.length) % list.length;

  const o = $('#basicsOverlay');
  const ttl = $('#basicTitle');
  const bod = $('#basicBody');
  const nxt = $('#nextTitle');
  const prv = $('#prevTitle');
  if(!o || !ttl || !bod || !nxt || !prv) return;

  const cur = list[basicIndex];
  const nx  = list[(basicIndex + 1) % list.length];
  const pv  = list[(basicIndex - 1 + list.length) % list.length];

  ttl.textContent = cur.title;
  bod.innerHTML = cur.body || '';
  nxt.textContent = nx.title;
  prv.textContent = pv.title;

  o.classList.remove('hidden');
  o.setAttribute('aria-hidden','false');
}

function closeBasic(){
  const o = $('#basicsOverlay');
  if(!o) return;
  o.classList.add('hidden');
  o.setAttribute('aria-hidden','true');
}
function nextBasic(dir){ openBasic(basicIndex + (dir || 1)); }

function wireBasicsControls(){
  const o = $('#basicsOverlay');
  if(!o) return;
  const bg = o.querySelector('.overlay-bg');
  const x  = $('#basicClose');
  const nextPeek = $('#nextPeek');
  const prevPeek = $('#prevPeek');

  if(bg) bg.onclick = closeBasic;
  if(x) x.onclick = closeBasic;

  if(nextPeek){
    nextPeek.onclick = ()=> nextBasic(1);
    nextPeek.onkeydown = (e)=>{ if(e.key==='Enter' || e.key===' ') nextBasic(1); };
  }
  if(prevPeek){
    prevPeek.onclick = ()=> nextBasic(-1);
    prevPeek.onkeydown = (e)=>{ if(e.key==='Enter' || e.key===' ') nextBasic(-1); };
  }

  document.addEventListener('keydown', e=>{
    if(!o || o.classList.contains('hidden')) return;
    if(e.key==='Escape') closeBasic();
    if(e.key==='ArrowRight') nextBasic(1);
    if(e.key==='ArrowLeft') nextBasic(-1);
  });
}

/* =========================
   Posts helpers
   ========================= */
function pickByLang(p, key){
  const L = getLang();
  if (L === 'ja' && p[`${key}_ja`]) return p[`${key}_ja`];
  if (L === 'mn' && p[`${key}_mn`]) return p[`${key}_mn`];
  return p[key] || '';
}

function matchesSearch(p,q){
  if(!q) return true;
  const hay = (pickByLang(p,'title') + ' ' + (pickByLang(p,'summary')||'') + ' ' + (p.tags||[]).join(' '))
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}
function matchesTag(p,t){ return !t || (p.tags||[]).includes(t); }

const MD_CACHE = new Map();

async function fetchMarkdownSafe(url){
  if(!url) return null;

  if(MD_CACHE.has(url)){
    return MD_CACHE.get(url);
  }

  try{
    const res = await fetch(url, { cache:'default' });
    if(!res.ok) return null;

    const text = await res.text();
    if (/<!DOCTYPE|<html[\s>]/i.test(text)) return null;

    MD_CACHE.set(url, text);
    return text;
  }catch(_){
    return null;
  }
}
function todayTokyoISO(){
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function pickProjectMd(p){
  const L = getLang();
  const m = p.content || {};
  if(L === 'ja' && m.ja) return m.ja;
  if(L === 'mn' && m.mn) return m.mn;
  return m.en || m.ja || m.mn || null;
}

let __projDocToken = 0;

async function loadProjectDoc(p, host){
  if(!host) return;

  const token = ++__projDocToken;
  host.innerHTML = `<div class="muted">${escapeHtml(t('ui.loading'))}</div>`;

  const url = pickProjectMd(p);
  const md = await fetchMarkdownSafe(url);

  if(token !== __projDocToken) return;

  host.innerHTML = renderMarkdown(md);
}

/* =========================
   Home rendering
   ========================= */
function renderStats(){
  const posts = POSTS.length;
  const latest = POSTS[0]?.date || "-";
  const tools = 3;

  const a = $('#statPosts');
  if(a) a.textContent = String(posts);

  const b = $('#statLatest');
  if(b) b.textContent = latest;

  const c = $('#statTools');
  if(c) c.textContent = String(tools);
}

function renderPinnedProjects(){
  const el = $('#pinnedProjects');
  if(!el) return;
  const pins = PROJECTS.filter(p=>p.pinned).slice(0,3);

  el.innerHTML = pins.map(p=>`
    <div class="pinItem" data-proj="${escapeAttr(p.id)}" tabindex="0">
      <div class="pinName">${escapeHtml(t(p.title_key))}</div>
      <div class="pinMeta">${Math.max(0, Math.min(100, p.progress ?? 0))}%</div>
    </div>
  `).join('');

  el.querySelectorAll('[data-proj]').forEach(row=>{
    const id = row.getAttribute('data-proj');
    row.onclick = ()=> go('projects', id);
    row.onkeydown = (e)=>{ if(e.key==='Enter') go('projects', id); };
  });
}

function renderMarkdown(md){
  if (!md) return '<p class="muted">Soon.</p>';

  if (!window.marked || typeof window.marked.parse !== 'function') {
    return `<pre>${escapeHtml(md)}</pre>`;
  }

  return window.marked
    .parse(md)
    .replaceAll('<a href="','<a target="_blank" rel="noopener noreferrer" href="');
}

function renderHomePosts(){
  const featuredGrid = $('#featuredGrid');
  const titleList = $('#titleList');

  const filtered = POSTS
    .filter(p=> matchesSearch(p, state.q))
    .filter(p=> matchesTag(p, state.tag));

  if(!POSTS.length){
    if(featuredGrid) featuredGrid.innerHTML = `<div class="card" style="grid-column:1/-1;padding:22px">${escapeHtml(t('ui.loading'))}</div>`;
    if(titleList) titleList.innerHTML = '';
    return;
  }
  if(!filtered.length){
    if(featuredGrid) featuredGrid.innerHTML = `<div class="card" style="grid-column:1/-1;padding:22px">${escapeHtml(state.q||state.tag ? t('ui.noMatch') : t('ui.noPosts'))}</div>`;
    if(titleList) titleList.innerHTML = '';
    return;
  }

  const featured = filtered.slice(0,3);
  if(featuredGrid){
    featuredGrid.innerHTML = featured.map(p=>{
      const title = pickByLang(p,'title');
      const summary = pickByLang(p,'summary');
      const tags = tagsCompact(p.tags, 3);
      const thumb = p.hero ? `<img src="${escapeAttr(p.hero)}" alt="" loading="lazy">` : '';
      const fullSummary = summary || '';
      return `
        <article class="post" data-id="${escapeAttr(p.id)}" tabindex="0" title="${escapeAttr(fullSummary)}">
          <div class="thumb">${thumb}</div>
          <div class="post-body">
            <div class="meta">
              <div class="date">${escapeHtml(p.date || '')}</div>
            </div>

            <h3>${escapeHtml(title)}</h3>

            <p class="summary">${escapeHtml(summary)}</p>

            <div class="tagrow under-desc">
              ${tags}
            </div>
</div>
        </article>
      `;
    }).join('');

    featuredGrid.querySelectorAll('[data-id]').forEach(card=>{
      const id = card.getAttribute('data-id');
      card.onclick = ()=> go('article', id);
      card.onkeydown = (e)=>{ if(e.key==='Enter') go('article', id); };
    });

    featuredGrid.querySelectorAll('button[data-tag]').forEach(btn=>{
      btn.onclick = (e)=>{
        e.stopPropagation();
        const tag = btn.getAttribute('data-tag');
        state.tag = (state.tag===tag) ? null : tag;
        titlePage = 1;
        updateHash();
        renderHomePosts();
        buildTagBar();
      };
    });
  }

  const rest = filtered.slice(3);
  const per = 10;
  const totalPages = Math.ceil(rest.length / per) || 1;
  if(titlePage > totalPages) titlePage = totalPages;
  const start = (titlePage - 1) * per;
  const slice = rest.slice(start, start + per);

  if(titleList){
    titleList.innerHTML = slice.map(p=>{
      const title = pickByLang(p,'title');
      return `
        <div class="title-item" data-id="${escapeAttr(p.id)}" tabindex="0">
          <div class="title-text">${escapeHtml(title)}</div>
          <div class="title-date">${escapeHtml(p.date || '')}</div>
        </div>
      `;
    }).join('');

    if(totalPages > 1){
      titleList.innerHTML += `
        <div style="display:flex;justify-content:center;gap:10px;padding:10px">
          <button class="btn" id="prevPage" ${titlePage===1?'disabled':''}>${escapeHtml(t('ui.prev'))}</button>
          <div style="align-self:center;color:var(--muted);font-weight:900">${escapeHtml(t('ui.page'))} ${titlePage} / ${totalPages}</div>
          <button class="btn" id="nextPage" ${titlePage===totalPages?'disabled':''}>${escapeHtml(t('ui.next'))}</button>
        </div>
      `;
      const prev = $('#prevPage');
      const next = $('#nextPage');
      if(prev) prev.onclick = ()=>{ titlePage--; renderHomePosts(); };
      if(next) next.onclick = ()=>{ titlePage++; renderHomePosts(); };
    }

    titleList.querySelectorAll('[data-id]').forEach(row=>{
      const id = row.getAttribute('data-id');
      row.onclick = ()=> go('article', id);
      row.onkeydown = (e)=>{ if(e.key==='Enter') go('article', id); };
    });
  }
}

function buildTagBar(){
  const bar = $('#tagBar');
  if(!bar) return;

  const counts = {};
  POSTS.forEach(p => (p.tags||[]).forEach(tag => counts[tag] = (counts[tag]||0) + 1));

  const top = Object.keys(counts)
    .sort((a,b)=> counts[b]-counts[a] || a.localeCompare(b))
    .slice(0,4);

  bar.innerHTML = top.map(tag=>`
    <button class="tag ${tagClass(tag)} ${state.tag===tag?'active':''}" data-tag="${escapeAttr(tag)}">#${escapeHtml(tag)}</button>
  `).join('');

  bar.querySelectorAll('[data-tag]').forEach(btn=>{
    btn.onclick = ()=>{
      const tag = btn.getAttribute('data-tag');
      state.tag = (state.tag===tag) ? null : tag;
      titlePage = 1;
      updateHash();
      renderHomePosts();
      buildTagBar();
    };
  });
}

/* =========================
   Papers page
   ========================= */
function renderPapers(){
  const el = $('#papersView');
  if(!el) return;

  el.innerHTML = `
    <div class="card" style="padding:20px">
      <h2 style="margin:0 0 6px">${escapeHtml(t('papers.title'))}</h2>
      <p style="margin:0;color:var(--muted)">${escapeHtml(t('papers.lead'))}</p>

      <div class="search" style="margin-top:12px">
        <input id="qPapers" placeholder="${escapeAttr(t('ui.searchPlaceholder'))}" />
        <button id="clearQPapers" class="btn ghost smallbtn">${escapeHtml(t('ui.clear'))}</button>
      </div>

      <div class="tags" id="tagBarPapers" style="margin-top:10px"></div>
    </div>

    <div class="titles" id="papersList" style="margin-top:12px"></div>
  `;

  const all = uniq(POSTS.flatMap(p=>p.tags||[])).sort();
  const tagBar = $('#tagBarPapers');
  if(tagBar){
    const max = 12;
    tagBar.innerHTML =
      all.slice(0,max).map(tag=>`
        <button class="tag ${tagClass(tag)} ${state.tag===tag?'active':''}" data-tag="${escapeAttr(tag)}">#${escapeHtml(tag)}</button>
      `).join('') +
      (all.length>max ? `<span class="tag more" title="${escapeAttr(all.slice(max).map(x=>`#${x}`).join('  '))}">+${all.length-max}</span>` : '');

    tagBar.querySelectorAll('[data-tag]').forEach(btn=>{
      btn.onclick = ()=>{
        const tag = btn.getAttribute('data-tag');
        state.tag = (state.tag===tag) ? null : tag;
        updateHash();
        renderPapers();
      };
    });
  }

  const qIn = $('#qPapers');
  const clr = $('#clearQPapers');
  if(qIn){
    qIn.value = state.q;
    qIn.oninput = ()=>{
      state.q = qIn.value.trim();
      updateHash();
      renderPapers();
    };
  }
  if(clr){
    clr.onclick = ()=>{
      state.q = '';
      updateHash();
      renderPapers();
    };
  }

  const list = $('#papersList');
  const filtered = POSTS
    .filter(p=> matchesSearch(p, state.q))
    .filter(p=> matchesTag(p, state.tag));

  if(!POSTS.length){
    if(list) list.innerHTML = `<div class="card" style="padding:22px">${escapeHtml(t('ui.loading'))}</div>`;
    return;
  }
  if(!filtered.length){
    if(list) list.innerHTML = `<div class="card" style="padding:22px">${escapeHtml(t('ui.noMatch'))}</div>`;
    return;
  }

  list.innerHTML = filtered.map(p=>{
    const title = pickByLang(p,'title');
    const tags = tagsCompact(p.tags, 3);
    return `
      <div class="title-item" data-id="${escapeAttr(p.id)}" tabindex="0">
        <div class="title-text">${escapeHtml(title)}</div>
        <div class="title-date">${escapeHtml(p.date || '')} <span style="margin-left:8px">${tags}</span></div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-id]').forEach(row=>{
    const id = row.getAttribute('data-id');
    row.onclick = ()=> go('article', id);
    row.onkeydown = (e)=>{ if(e.key==='Enter') go('article', id); };
  });

  list.querySelectorAll('button[data-tag]').forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();
      const tag = btn.getAttribute('data-tag');
      state.tag = (state.tag===tag) ? null : tag;
      updateHash();
      renderPapers();
    };
  });
}

/* =========================
   Projects page
   ========================= */
let projectsState = { active: 'inv-stack' };

function renderProjects(activeId){
  const el = $('#projectsView');
  if(!el) return;

  if(activeId) projectsState.active = activeId;
  const active = PROJECTS.find(p=>p.id===projectsState.active) || PROJECTS[0];

  el.innerHTML = `
    <div class="card" style="padding:20px">
      <h2 style="margin:0 0 6px">${escapeHtml(t('projects.title'))}</h2>
      <p style="margin:0;color:var(--muted)">${escapeHtml(t('projects.lead'))}</p>
    </div>

    <div class="projWrap">
      <aside class="projSidebar">
        <div class="projNav">
          ${PROJECTS.map(p=>`
            <button class="projNavBtn ${p.id===active.id?'active':''}" data-proj="${escapeAttr(p.id)}">
              <span>${escapeHtml(t(p.title_key))}</span>
              <span style="color:var(--muted);font-weight:900;font-size:12px">
                ${Math.max(0, Math.min(100, p.progress ?? 0))}%
              </span>
            </button>
          `).join('')}
        </div>

        <div class="card" style="padding:14px;background:var(--card)">
          <div style="color:var(--muted);font-weight:900;font-size:12px;margin-bottom:8px">${escapeHtml(t('projects.howtoTitle'))}</div>
          <div style="color:var(--muted);font-size:13px;line-height:1.6">${escapeHtml(t('projects.howtoBody'))}</div>
        </div>
      </aside>

      <main class="projMain">
        ${renderProjectCard(active)}
      </main>
    </div>
  `;

  el.querySelectorAll('[data-proj]').forEach(btn=>{
    btn.onclick = ()=> go('projects', btn.getAttribute('data-proj'));
  });

  const host = el.querySelector('#projDoc');
  loadProjectDoc(active, host);
}

function renderProjectCard(p){
  const progress = Math.max(0, Math.min(100, p.progress ?? 0));
  const phase = p.phase_key ? t(p.phase_key) : '-';
  const last = p.last_update || '-';

  return `
    <div class="projCard">
      <div class="projTitle">${escapeHtml(t(p.title_key))}</div>
      <div class="projMeta">${escapeHtml(t(p.meta_key))}</div>
      <p class="projDesc">${escapeHtml(t(p.desc_key))}</p>

      <div class="projStatus">
        <div class="st">
          <div class="k">${escapeHtml(t('projects.status.phase'))}</div>
          <div class="v">${escapeHtml(phase)}</div>
        </div>
        <div class="st">
          <div class="k">${escapeHtml(t('projects.status.lastUpdate'))}</div>
          <div class="v">${escapeHtml(last)}</div>
        </div>
        <div class="st">
          <div class="k">${escapeHtml(t('projects.status.progress'))}</div>
          <div class="v">${progress}%</div>
        </div>
      </div>

      <div class="projDoc card" style="padding:16px;margin-top:12px">
        <div id="projDoc"></div>
      </div>

      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" onclick="go('papers')">${escapeHtml(t('ui.browsePapers'))}</button>
        <button class="btn ghost" onclick="go('home')">${escapeHtml(t('ui.back'))}</button>
      </div>
    </div>
  `;
}


/* =========================
   Article view
   ========================= */
async function renderArticle(id){
  const p = POSTS.find(x=>x.id===id);
  if(!p) return;

  const L = getLang();
  const title = pickByLang(p,'title');

  const localized =
    (L === 'ja' ? p.content_ja :
     L === 'mn' ? p.content_mn : null);

  const candidates = [localized, p.content].filter(Boolean).map(s=>String(s).trim()).filter(Boolean);

  let md = null;
  for(const url of candidates){
    md = await fetchMarkdownSafe(url);
    if(md) break;
  }

  let bodyHtml = '';
  if ((p.type || '').includes('md') && md){
    bodyHtml = renderMarkdown(md);
  } else {
    bodyHtml = `<p>${escapeHtml(pickByLang(p,'summary') || '')}</p>`;
  }

  const tags = (p.tags||[]).map(x=>tagPill(x,true)).join(' ');
  const meta = `
    <div class="meta" style="margin-top:0">
      <div class="date">${escapeHtml(p.date || '')}</div>
      <div class="tagrow">${tags}</div>
    </div>
  `;

  $('#articleView').innerHTML = `
    <div class="card" style="padding:18px">
      ${meta}
      <h1 style="margin:10px 0 0">${escapeHtml(title)}</h1>
      <div style="margin-top:10px;color:var(--muted);line-height:1.8">${bodyHtml}</div>

      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" onclick="go('papers')">⬅ ${escapeHtml(t('ui.back'))}</button>
        <button class="btn ghost" id="copyLinkBtn">${escapeHtml(t('ui.copyLink'))}</button>
      </div>
    </div>
  `;

  const copyBtn = $('#copyLinkBtn');
  if(copyBtn){
    copyBtn.onclick = async ()=>{
      try{ await navigator.clipboard.writeText(location.href); }catch(_){}
    };
  }

  // tag clicks
  $('#articleView').querySelectorAll('button[data-tag]').forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();
      const tag = btn.getAttribute('data-tag');
      state.tag = (state.tag===tag) ? null : tag;
      go('papers');
    };
  });
}

/* =========================
   About / Tags pages
   ========================= */
async function renderAbout(){
  const el = $('#aboutView');
  if(!el) return;

  const L = getLang();
  const url =
    (L === 'ja') ? 'content/about/ja.md' :
    (L === 'mn') ? 'content/about/mn.md' :
                  'content/about/en.md';

  let md = await fetchMarkdownSafe(url);
  if(!md) md = t('about.body') || ''; // fallback if md missing

  const bodyHtml = renderMarkdown(md);

  el.innerHTML = `
    <div class="card" style="padding:22px">
      <h2 style="margin:0 0 8px">${escapeHtml(t(''))}</h2>
      <div style="margin:0;color:var(--muted);line-height:1.7">${bodyHtml}</div>
      <div style="margin-top:14px">
        <button class="btn" onclick="go('home')">${escapeHtml(t('ui.back'))}</button>
      </div>
    </div>
  `;
}

function renderTags(){
  const el = $('#tagsView');
  if(!el) return;

  const all = uniq(POSTS.flatMap(p=>p.tags||[])).sort();
  el.innerHTML = `
    <div class="card" style="padding:20px">
      <h2 style="margin:0 0 8px">${escapeHtml(t('ui.tags'))}</h2>
      <div class="tags">
        ${all.map(tag=>`
          <button class="tag ${tagClass(tag)} ${state.tag===tag?'active':''}" data-tag="${escapeAttr(tag)}">#${escapeHtml(tag)}</button>
        `).join('')}
      </div>
      <div style="margin-top:14px">
        <button class="btn" onclick="go('papers')">${escapeHtml(t('ui.browsePapers'))}</button>
        <button class="btn ghost" onclick="go('home')">${escapeHtml(t('ui.back'))}</button>
      </div>
    </div>
  `;

  el.querySelectorAll('[data-tag]').forEach(btn=>{
    btn.onclick = ()=>{
      const tag = btn.getAttribute('data-tag');
      state.tag = (state.tag===tag) ? null : tag;
      updateHash();
      renderTags();
    };
  });
}

/* =========================
   Tools page (Bode + Laplace + Euler)
   ========================= */
let toolsState = { active:'bode' };
function ctxTools(){
  return { $, t, escapeHtml, escapeAttr, getLang };
}
function renderTools(){
  const el = $('#toolsView');
  if(!el) return;

  const active = toolsState.active;

  el.innerHTML = `
    <div class="card" style="padding:20px">
      <h2 style="margin:0 0 6px">${escapeHtml(t('tools.title'))}</h2>
      <p style="margin:0;color:var(--muted)">${escapeHtml(t('tools.lead'))}</p>
    </div>

    <div class="tools-wrap">
      <aside class="tools-sidebar">
        <button class="tool-item ${active==='cas'?'active':''}" data-tool="cas">
          <span>CAS</span>
          <span class="tool-status">Ready</span>
        </button>
      
        <button class="tool-item ${active==='bode'?'active':''}" data-tool="bode">
          <span>${escapeHtml(t('tools.bode'))}</span>
          <span class="tool-status">Ready</span>
        </button>

        <button class="tool-item ${active==='nyquist'?'active':''}" data-tool="nyquist">
          <span>${escapeHtml(t('tools.nyquist'))}</span>
          <span class="tool-status">Ready</span>
        </button>

        <button class="tool-item ${active==='laplace_helper'?'active':''}" data-tool="laplace_helper">
          <span>Laplace Helper</span>
          <span class="tool-status">Ready</span>
        </button>

        <button class="tool-item ${active==='euler'?'active':''}" data-tool="euler">
          <span>${escapeHtml(t('tools.euler'))}</span>
          <span class="tool-status">Ready</span>
        </button>
      </aside>

      <main class="tools-main">
        <div class="card" style="padding:16px">
         ${
            active === 'bode' ? window.DLTOOLS.bode.html(ctxTools()) :
            active === 'cas'  ? window.DLTOOLS.cas.html(ctxTools()) :
            active === 'nyquist' ? window.DLTOOLS.nyquist.html(ctxTools()) :
            active === 'laplace_helper' ? window.DLTOOLS.laplace_helper.html(ctxTools()) :
            active === 'euler' ? window.DLTOOLS.euler.html(ctxTools()) :
            ''
          }
        </div>
      </main>
    </div>
  `;

  el.querySelectorAll('[data-tool]').forEach(btn=>{
    btn.onclick = ()=>{
      toolsState.active = btn.dataset.tool;
      renderTools();
    };
  });
if(active === 'bode'){
  window.DLTOOLS.bode.wire(ctxTools());
}
if(active === 'laplace_helper'){
  window.DLTOOLS.laplace_helper.wire(ctxTools());
}
if(active === 'euler'){
  window.DLTOOLS.euler.wire(ctxTools());
}
if(active === 'nyquist'){
  window.DLTOOLS.nyquist.wire(ctxTools());
}
if(active === 'cas')  window.DLTOOLS.cas.wire(ctxTools());
}


/* =========================
   Routing
   ========================= */
function show(viewId){
  ['homeView','projectsView','papersView','articleView','aboutView','tagsView','toolsView']
    .forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.classList.toggle('hidden', id !== viewId);
    });
}

function parseHash(){
  const [path, query] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(query || '');
  const parts = (path || '/home').split('/').filter(Boolean);

  state.q = params.get('q') || '';
  state.tag = params.get('tag') || null;

  if(parts[0]==='home'){ state.route='home'; state.articleId=null; }
  else if(parts[0]==='projects'){ state.route='projects'; state.articleId=null; projectsState.active = parts[1] || projectsState.active; }
  else if(parts[0]==='papers'){ state.route='papers'; state.articleId=null; }
  else if(parts[0]==='about'){ state.route='about'; state.articleId=null; }
  else if(parts[0]==='tags'){ state.route='tags'; state.articleId=null; }
  else if(parts[0]==='tools'){ state.route='tools'; state.articleId=null; }
  else if(parts[0]==='post' && parts[1]){ state.route='article'; state.articleId=parts[1]; }
  else { state.route='home'; state.articleId=null; }
}

function updateHash(){
   
  const qs = new URLSearchParams();
  if(state.q) qs.set('q', state.q);
  if(state.tag) qs.set('tag', state.tag);

  let base = '#/home';
  if(state.route==='projects') base = '#/projects' + (projectsState.active ? `/${projectsState.active}` : '');
  else if(state.route==='papers') base = '#/papers';
  else if(state.route==='tools') base = '#/tools';
  else if(state.route==='tags') base = '#/tags';
  else if(state.route==='about') base = '#/about';
  else if(state.route==='article') base = `#/post/${state.articleId}`;

  const s = qs.toString();
  location.hash = s ? `${base}?${s}` : base;
}

function go(route, payload){
  state.route = route;
  if(route==='article') state.articleId = payload;
  if(route==='projects' && payload) projectsState.active = payload;
  updateHash();
}

function setActiveNav(){
  const r = state.route;
  document.querySelectorAll('nav a[href^="#/"]').forEach(a=>{
    const href = a.getAttribute('href');
    const hit =
      (r==='home' && href==='#/home') ||
      (r==='projects' && href==='#/projects') ||
      (r==='papers' && href==='#/papers') ||
      (r==='tools' && href==='#/tools') ||
      (r==='about' && href==='#/about');
    a.classList.toggle('active', hit);
  });
}

/* =========================
   Static texts (nav + hero)
   ========================= */
function applyStaticTexts(){
  document.querySelectorAll('nav a[href^="#/"]').forEach(a=>{
    const href = a.getAttribute('href');
    if(href==='#/home') a.textContent = t('nav.home');
    if(href==='#/projects') a.textContent = t('nav.projects');
    if(href==='#/papers') a.textContent = t('nav.papers');
    if(href==='#/tools') a.textContent = t('nav.tools');
    if(href==='#/about') a.textContent = t('nav.about');
  });

  $('#brandTag').textContent = t('brand.tag');
  $('#heroKicker').textContent = t('hero.kicker');
  $('#heroTitle').textContent = t('hero.title');
  $('#heroLead').textContent = t('hero.lead');

  $('#sideTitle').textContent = t('ui.quickSearch');
  $('#sideHint').textContent = t('ui.pressSlash');

  $('#qHome').placeholder = t('ui.searchPlaceholder');
  $('#clearQHome').textContent = t('ui.clear');

  $('#essentialsTitle').textContent = t('home.essentials');
  $('#pinnedTitle').textContent = t('home.pinned');
  $('#recentTitle').textContent = t('home.latest');
  $('#homeBrowseTitle').textContent = t('home.browse');

  $('#ctaProjects').textContent = t('ui.viewProjects');
  $('#ctaPapers').textContent = t('ui.browsePapers');
  $('#statPostsLbl').textContent = 'Posts';
  $('#statLatestLbl').textContent = 'Latest Update';
  $('#statToolsLbl').textContent = 'Tools';

  document.title = 'DLUSHKNE';
}

/* =========================
   Search wiring
   ========================= */
function wireSearchHome(){
  const input = $('#qHome');
  if(!input) return;

  input.value = state.q;

  input.oninput = ()=>{
    state.q = input.value.trim();
    titlePage = 1;
    updateHash();
    renderHomePosts();
  };

  document.addEventListener('keydown', (e)=>{
    const a = document.activeElement;
    const typing = a && (a.tagName==='INPUT' || a.tagName==='TEXTAREA' || a.isContentEditable);
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key==='/' || e.code==='Slash')){
      e.preventDefault();
      input.focus();
    }
  }, { capture: true });

  const clearBtn = $('#clearQHome');
  if(clearBtn){
    clearBtn.onclick = ()=>{
      state.q = '';
      input.value = '';
      titlePage = 1;
      updateHash();
      renderHomePosts();
    };
  }
}

/* =========================
   Language dropdown
   ========================= */
function wireLangToggle(){
  const toggle = $('#langToggle');
  const menu = $('#langMenu');
  if(!toggle || !menu) return;

  const LABELS = { en:'English', ja:'日本語', mn:'монгол' };
  const SHORT = { en:'EN', ja:'JP', mn:'MN' };

  function refresh(){
    const cur = getLang();
    toggle.textContent = SHORT[cur] || 'EN';
    toggle.setAttribute('aria-label', `Language: ${LABELS[cur] || 'English'}`);
  }

  menu.innerHTML = ['en','ja','mn'].map(code=> `<button data-lang="${code}">${LABELS[code]}</button>`).join('');

  toggle.onclick = (e)=>{
    e.stopPropagation();
    const open = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden', open);
    toggle.setAttribute('aria-expanded', String(!open));
  };

  menu.querySelectorAll('[data-lang]').forEach(btn=>{
    btn.onclick = async (e)=>{
      e.stopPropagation();
      setLang(btn.dataset.lang);
      await loadI18n();
      applyStaticTexts();
      renderNow();
      refresh();
      menu.classList.add('hidden');
      toggle.setAttribute('aria-expanded','false');
    };
  });

  document.addEventListener('click', ()=>{
    menu.classList.add('hidden');
    toggle.setAttribute('aria-expanded','false');
  });

  refresh();
}

/* =========================
   Render
   ========================= */
async function renderNow(){
  applyStaticTexts();
  setActiveNav();

  const year = $('#year');
  if(year) year.textContent = String(new Date().getFullYear());

  if(state.route==='home'){
    show('homeView');

    renderPinnedProjects();
    renderBasicsMini();
    wireSearchHome();
    renderStats();
    renderHomePosts();

    $('#ctaProjects').onclick = ()=> go('projects', PROJECTS.find(p=>p.pinned)?.id || PROJECTS[0]?.id);
    $('#ctaPapers').onclick = ()=> go('papers');
    return;
  }

  if(state.route==='projects'){
    show('projectsView');
    renderProjects(projectsState.active);
    return;
  }

  if(state.route==='papers'){
    show('papersView');
    renderPapers();
    return;
  }

  if(state.route==='article' && state.articleId){
    await renderArticle(state.articleId);
    show('articleView');
    return;
  }

  if(state.route==='about'){
    renderAbout();
    show('aboutView');
    return;
  }

  if(state.route==='tags'){
    renderTags();
    show('tagsView');
    return;
  }

  if(state.route==='tools'){
    renderTools();
    show('toolsView');
    return;
  }

  show('homeView');
}

/* =========================
   Init
   ========================= */
window.addEventListener('hashchange', ()=>{ parseHash(); renderNow(); });

document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && state.route==='article'){ go('papers'); }
});

(function boot(){
  (async ()=>{
    await loadI18n();
    await loadProjects();
    await loadPosts();

    parseHash();
    wireLangToggle();
    wireBasicsControls();
    applyStaticTexts();
    renderNow();
  })();
})();

/* =========================
   Utils
   ========================= */
function escapeHtml(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

function escapeAttr(s){ return escapeHtml(s).replaceAll('\n',' '); }
