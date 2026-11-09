// js/app.js
let POSTS = [];
let PROJECTS = [];
let I18N = {};
let state = { q:'', tag:null, route:'home', articleId:null };
let titlePage = 1;
let archiveView = 'grid';
let refreshArchiveCarousel = null;
let bootReady = false;

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
  }catch(error){
    console.warn('The selected language could not load; trying English.', error);
    const res = await fetch(`i18n/en.json`, { cache:'no-store' });
    if(!res.ok) throw new Error('English translations could not load.');
    I18N = await res.json();
    document.documentElement.setAttribute('lang', 'en');
    return;
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
  return localStorage.getItem(THEME_KEY) || 'dark';
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
  if(!res.ok) throw new Error(`Posts could not load (${res.status}).`);
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
function loadProjects(){

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

      phase_key:'projects.phases.validation',
      progress: 75,
      last_update:'2026-04-21',

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
  clearMath(host);
  host.innerHTML = `<div class="muted">${escapeHtml(t('ui.loading'))}</div>`;

  const preferred = pickProjectMd(p);
  const candidates = uniq([preferred, p.content?.en].filter(Boolean));
  let md = null;
  let loadedUrl = null;
  for(const url of candidates){
    md = await fetchMarkdownSafe(url);
    if(token !== __projDocToken || !host.isConnected) return;
    if(md){
      loadedUrl = url;
      break;
    }
  }

  if(!md){
    console.error('Project documentation could not load.', candidates);
    host.innerHTML = `<p role="alert">${escapeHtml(t('projects.documentError'))}</p><button class="btn" type="button">${escapeHtml(t('entry.retry'))}</button>`;
    host.querySelector('button').onclick = ()=> loadProjectDoc(p, host).catch(reportAppError);
    return;
  }

  host.innerHTML = renderMarkdown(md);
  if(loadedUrl !== preferred){
    console.warn('The translated project document is unavailable; showing the English document.', preferred);
    host.insertAdjacentHTML('afterbegin', `<p class="doc-notice" role="status">${escapeHtml(t('projects.documentFallback'))}</p>`);
    host.setAttribute('lang', 'en');
  }else{
    host.setAttribute('lang', getLang());
  }
  buildProjectContents(host, p.id);
  host.querySelectorAll('img').forEach(image=>{
    image.loading = 'lazy';
    image.decoding = 'async';
    if(image.closest('a')) return;
    const link = document.createElement('a');
    link.href = image.getAttribute('src');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${t('projects.openFigure')}: ${image.alt}`);
    image.replaceWith(link);
    link.append(image);
  });
  await typesetMath(host);
}

function buildProjectContents(host, projectId){
  const contents = $('#projectToc');
  const links = $('#projectTocLinks');
  const headings = [...host.querySelectorAll('h2, h3')];
  contents.hidden = !headings.length;
  contents.open = matchMedia('(min-width: 981px)').matches;
  links.replaceChildren();
  headings.forEach((heading, index)=>{
    heading.id = `project-${projectId}-section-${index}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = heading.tagName === 'H3' ? 'toc-link toc-subsection' : 'toc-link';
    button.textContent = heading.textContent;
    button.onclick = ()=>{
      if(matchMedia('(max-width: 980px)').matches) contents.open = false;
      const headerHeight = document.querySelector('.topbar').getBoundingClientRect().height;
      heading.style.scrollMarginTop = `${headerHeight + 32}px`;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll:true });
      heading.scrollIntoView({
        block:'start',
        behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    };
    links.append(button);
  });
}

/* =========================
   Home rendering
   ========================= */
function renderStats(){
  const posts = POSTS.length;
  const tools = Object.keys(window.DLTOOLS).length;

  const latestPost = POSTS
    .map(p => p.date)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;

  const latestProject = PROJECTS
    .map(p => p.last_update)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;

  const latest = [latestPost, latestProject]
    .filter(Boolean)
    .sort()
    .reverse()[0] || "-";

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
    <a class="pinItem" href="#/projects/${escapeAttr(p.id)}">
      <span>
        <span class="pinName">${escapeHtml(t(p.title_key))}</span>
        <span class="pinDescription">${escapeHtml(t(p.meta_key))}</span>
      </span>
      <span class="pinMeta">${escapeHtml(t(p.phase_key))}</span>
    </a>
  `).join('');
}

let markdownMathConfigured = false;
let mathQueue = Promise.resolve();

function clearMath(host){
  if(window.MathJax?.typesetClear) window.MathJax.typesetClear([host]);
}

function typesetMath(host){
  mathQueue = mathQueue.then(async ()=>{
    if(!host.isConnected) return;
    if(!host.querySelector('.math-block, .math-inline')) return;
    try{
      if(!window.MathJax?.startup?.promise) throw new Error('MathJax is unavailable.');
      await window.MathJax.startup.promise;
      if(!host.isConnected) return;
      if(!window.MathJax.typesetPromise) throw new Error('MathJax did not initialize.');
      await window.MathJax.typesetPromise([host]);
    }catch(error){
      console.error('Mathematical notation could not be rendered.', error);
      if(host.isConnected){
        host.insertAdjacentHTML('afterbegin', `<p class="doc-notice" role="status">${escapeHtml(t('ui.mathError'))}</p>`);
      }
    }
  });
  return mathQueue;
}

function renderMarkdown(md){
  if (!md) return '<p class="muted">Soon.</p>';

  if (!window.marked || typeof window.marked.parse !== 'function') {
    return `<pre>${escapeHtml(md)}</pre>`;
  }

  if(!markdownMathConfigured){
    // Protect TeX from Markdown's underscore, backslash, and emphasis parsing.
    window.marked.use({
      extensions:[
        {
          name:'mathBlock',
          level:'block',
          start:src=> src.search(/\$\$|\\\[/),
          tokenizer(src){
            const match = /^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])(?:[ \t]*(?:\n|$))/.exec(src);
            if(match) return { type:'mathBlock', raw:match[0], text:match[0].trim() };
          },
          renderer:token=> `<div class="math-block">${escapeHtml(token.text)}</div>\n`,
        },
        {
          name:'mathInline',
          level:'inline',
          start:src=> src.search(/\$|\\\(/),
          tokenizer(src){
            const match = /^(?:\$(?!\$)((?:\\.|[^\\$\n])+?)\$(?!\$)|\\\(([\s\S]+?)\\\))/.exec(src);
            if(match) return { type:'mathInline', raw:match[0], text:match[0] };
          },
          renderer:token=> `<span class="math-inline">${escapeHtml(token.text)}</span>`,
        },
      ],
    });
    markdownMathConfigured = true;
  }

  return window.marked
    .parse(md)
    .replaceAll('<a href="','<a target="_blank" rel="noopener noreferrer" href="');
}

function getEnglishPdfFallbacks(href){
  const url = new URL(href, document.baseURI);
  if(url.origin !== location.origin || !url.pathname.includes('/documents/') || !/\.pdf$/i.test(url.pathname)){
    return [];
  }

  const localizedSuffix = /([_-]?(?:mn|ja|jp))(?=\.pdf$)/i;
  const match = localizedSuffix.exec(url.pathname);
  if(!match) return [];

  const paths = [];
  if(/^[_-]/.test(match[1])){
    paths.push(url.pathname.replace(localizedSuffix, `${match[1][0]}en`));
  }
  paths.push(url.pathname.replace(localizedSuffix, ''));

  return uniq(paths).map(path => `${path}${url.search}${url.hash}`);
}

async function resolveArticlePdfFallbacks(html){
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let usedFallback = false;

  await Promise.all([...doc.querySelectorAll('a[href]')].map(async link=>{
    const fallbacks = getEnglishPdfFallbacks(link.getAttribute('href'));
    if(!fallbacks.length) return;

    try{
      const current = await fetch(link.href, { method:'HEAD', cache:'no-store' });
      if(current.ok) return;

      for(const fallback of fallbacks){
        const response = await fetch(fallback, { method:'HEAD', cache:'no-store' });
        if(response.ok){
          link.href = fallback;
          usedFallback = true;
          return;
        }
      }

      console.warn('The localized PDF and its English fallbacks are unavailable.', link.href, fallbacks);
    }catch(error){
      console.error('Could not check localized PDF availability.', error);
    }
  }));

  return { html:doc.body.innerHTML, usedFallback };
}

function renderHomePosts(){
  const featuredGrid = $('#featuredGrid');

  const filtered = POSTS
    .filter(p => p.category === 'mini-paper')
    .filter(p => matchesSearch(p, state.q))
    .filter(p => matchesTag(p, state.tag));

  renderArchive(filtered.slice(2));

  if(!POSTS.length){
    if(featuredGrid) featuredGrid.innerHTML = `<div class="card" style="grid-column:1/-1;padding:22px">${escapeHtml(t('ui.loading'))}</div>`;
    return;
  }

  if(!filtered.length){
    if(featuredGrid) featuredGrid.innerHTML = `<div class="card" style="grid-column:1/-1;padding:22px">${escapeHtml(state.q||state.tag ? t('ui.noMatch') : t('ui.noPosts'))}</div>`;
    return;
  }

  const featured = filtered.slice(0,2);

  if(featuredGrid){
    featuredGrid.innerHTML = featured.map(p=>{
      const title = pickByLang(p,'title');
      const summary = pickByLang(p,'summary');
      const tags = tagsCompact(p.tags, 3);
      const fullSummary = summary || '';

      return `
        <article class="post" data-id="${escapeAttr(p.id)}" tabindex="0" title="${escapeAttr(fullSummary)}">
          <div class="post-body">
            <div class="meta">
              <div class="date">${escapeHtml(p.date || '')}</div>
            </div>

            <h3>${escapeHtml(title)}</h3>

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

}

function renderArchive(posts){
  const titleList = $('#titleList');
  if(!titleList) return;
  refreshArchiveCarousel = null;
  document.querySelectorAll('[data-archive-view]').forEach(button=>{
    button.setAttribute('aria-pressed', String(button.dataset.archiveView === archiveView));
  });
  if(!posts.length){
    titleList.innerHTML = `<p class="muted archive-empty">${escapeHtml(t('ui.noArchivePosts'))}</p>`;
    return;
  }

  if(archiveView === 'grid'){
    titleList.innerHTML = `
      <div class="archive-carousel" role="region" aria-roledescription="${escapeAttr(t('ui.carousel'))}" aria-label="${escapeAttr(t('home.browse'))}">
        <div id="archiveTrack" class="archive-track">
          ${posts.map(p=>`
            <a class="post archive-card" href="#/post/${escapeAttr(p.id)}">
              ${p.hero ? `<div class="thumb"><img src="${escapeAttr(p.hero)}" alt="" loading="lazy" decoding="async"></div>` : ''}
              <div class="post-body">
                <time class="title-date">${escapeHtml(p.date || '')}</time>
                <h3>${escapeHtml(pickByLang(p, 'title'))}</h3>
                <p class="summary">${escapeHtml(pickByLang(p, 'summary'))}</p>
              </div>
            </a>
          `).join('')}
        </div>
        <div class="archive-navigation">
          <button id="archivePrev" class="btn ghost smallbtn" type="button" aria-controls="archiveTrack">${escapeHtml(t('ui.prev'))}</button>
          <span id="archivePosition" class="muted" role="status" aria-live="polite"></span>
          <button id="archiveNext" class="btn ghost smallbtn" type="button" aria-controls="archiveTrack">${escapeHtml(t('ui.next'))}</button>
        </div>
      </div>
    `;
    const track = $('#archiveTrack');
    const previous = $('#archivePrev');
    const next = $('#archiveNext');
    const position = $('#archivePosition');
    const stepSize = ()=> track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
    const update = ()=>{
      if(state.route !== 'home' || !track.isConnected || !track.clientWidth) return;
      const step = stepSize();
      const first = Math.min(posts.length, Math.round(track.scrollLeft / step) + 1);
      const visible = Math.max(1, Math.round((track.clientWidth + parseFloat(getComputedStyle(track).columnGap)) / step));
      position.textContent = `${first} - ${Math.min(posts.length, first + visible - 1)} / ${posts.length}`;
      previous.disabled = next.disabled = track.scrollWidth <= track.clientWidth + 1;
    };
    const rotate = direction=>{
      const max = track.scrollWidth - track.clientWidth;
      const step = stepSize();
      const current = Math.round(track.scrollLeft / step);
      const last = Math.round(max / step);
      const target = (current + direction + last + 1) % (last + 1);
      track.scrollTo({
        left: Math.min(max, target * step),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    };
    previous.onclick = ()=> rotate(-1);
    next.onclick = ()=> rotate(1);
    track.addEventListener('scroll', update, { passive:true });
    refreshArchiveCarousel = update;
    requestAnimationFrame(update);
    return;
  }

  const per = 10;
  const totalPages = Math.ceil(posts.length / per) || 1;

  if(titlePage > totalPages) titlePage = totalPages;

  const start = (titlePage - 1) * per;
  const slice = posts.slice(start, start + per);

  titleList.innerHTML = slice.map(p=>{
      const title = pickByLang(p,'title');

      return `
        <a class="title-item" href="#/post/${escapeAttr(p.id)}">
          <div class="title-text">${escapeHtml(title)}</div>
          <div class="title-date">${escapeHtml(p.date || '')}</div>
        </a>
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

      if(prev) prev.onclick = ()=>{ titlePage--; renderArchive(posts); };
      if(next) next.onclick = ()=>{ titlePage++; renderArchive(posts); };
    }
}

function wireArchiveControls(){
  document.querySelectorAll('[data-archive-view]').forEach(button=>{
    button.onclick = ()=>{
      if(archiveView === button.dataset.archiveView) return;
      archiveView = button.dataset.archiveView;
      titlePage = 1;
      renderHomePosts();
    };
  });
  window.addEventListener('resize', ()=> refreshArchiveCarousel?.());
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

    </div>

    <div class="titles" id="papersList" style="margin-top:12px"></div>
  `;

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
      state.tag = null;
      updateHash();
      renderPapers();
    };
  }

  const list = $('#papersList');
  const filtered = POSTS
  .filter(p => p.category === 'mini-paper')
  .filter(p => matchesSearch(p, state.q))
  .filter(p => matchesTag(p, state.tag));

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
function renderResearchPapers(){
  const el = $('#researchPapersView');
  if(!el) return;

  const researchPosts = POSTS
    .filter(p => p.category === 'research-paper')
    .filter(p => matchesSearch(p, state.q))
    .filter(p => matchesTag(p, state.tag));

  el.innerHTML = `
    <div class="card" style="padding:20px">
      <h2 style="margin:0 0 6px">Research Papers</h2>
      <p style="margin:0;color:var(--muted)">
        Academic papers, IEEE publications, conference papers and journal articles.
      </p>
    </div>

    <div class="titles" style="margin-top:12px">
      ${researchPosts.map(p => `
        <div class="title-item" data-id="${escapeAttr(p.id)}" tabindex="0">
          <div class="title-text">${escapeHtml(pickByLang(p,'title'))}</div>
          <div class="title-date">${escapeHtml(p.date || '')}</div>
        </div>
      `).join('')}
    </div>
  `;

  el.querySelectorAll('[data-id]').forEach(row=>{
    row.onclick = ()=> go('article', row.dataset.id);
    row.onkeydown = (e)=>{ if(e.key==='Enter') go('article', row.dataset.id); };
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

  clearMath(el);
  el.innerHTML = `
    <header class="projects-intro">
      <h2>${escapeHtml(t('projects.title'))}</h2>
      <p>${escapeHtml(t('projects.lead'))}</p>
    </header>

    <div class="projWrap">
      <aside class="projSidebar">
        <nav class="projNav" aria-label="${escapeAttr(t('projects.title'))}">
          ${PROJECTS.map(p=>`
            <a class="projNavBtn ${p.id===active.id?'active':''}" href="#/projects/${escapeAttr(p.id)}" ${p.id===active.id ? 'aria-current="page"' : ''}>
              ${escapeHtml(t(p.title_key.replace('.title', '.shortTitle')))}
            </a>
          `).join('')}
        </nav>
        <details id="projectToc" class="projToc" hidden>
          <summary>${escapeHtml(t('projects.onThisPage'))}</summary>
          <nav id="projectTocLinks" aria-label="${escapeAttr(t('projects.onThisPage'))}"></nav>
        </details>
      </aside>

      <div class="projMain">
        ${renderProjectCard(active)}
      </div>
    </div>
  `;

  const host = el.querySelector('#projDoc');
  loadProjectDoc(active, host).catch(reportAppError);
}

function renderProjectCard(p){
  const progress = Math.max(0, Math.min(100, p.progress ?? 0));
  const phase = p.phase_key ? t(p.phase_key) : '-';
  const last = p.last_update || '-';

  return `
    <div class="projCard">
      <h1 class="projTitle">${escapeHtml(t(p.title_key))}</h1>
      <div class="projMeta">${escapeHtml(t(p.meta_key))}</div>
      <p class="projDesc">${escapeHtml(t(p.desc_key))}</p>

      <dl class="projStatus">
        <div>
          <dt>${escapeHtml(t('projects.status.phase'))}</dt>
          <dd class="project-phase">${escapeHtml(phase)}</dd>
        </div>
        <div>
          <dt>${escapeHtml(t('projects.status.lastUpdate'))}</dt>
          <dd><time>${escapeHtml(last)}</time></dd>
        </div>
        <div>
          <dt>${escapeHtml(t('projects.status.progress'))}</dt>
          <dd>${progress}%</dd>
        </div>
      </dl>

      <div id="projDoc" class="projDoc"></div>

      <div class="project-actions">
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
  if(state.route !== 'article' || state.articleId !== id || getLang() !== L) return;

  let bodyHtml = '';
  let pdfFallback = false;
  if ((p.type || '').includes('md') && md){
    bodyHtml = renderMarkdown(md);
    if(L !== 'en'){
      const resolved = await resolveArticlePdfFallbacks(bodyHtml);
      if(state.route !== 'article' || state.articleId !== id || getLang() !== L) return;
      bodyHtml = resolved.html;
      pdfFallback = resolved.usedFallback;
    }
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

  clearMath($('#articleView'));
  $('#articleView').innerHTML = `
    <div class="card" style="padding:18px">
      ${meta}
      <h1 style="margin:10px 0 0">${escapeHtml(title)}</h1>
      <div class="article-content" style="margin-top:10px;color:var(--muted);line-height:1.8">${bodyHtml}</div>

      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" onclick="go('papers')">⬅ ${escapeHtml(t('ui.back'))}</button>
        <button class="btn ghost" id="copyLinkBtn">${escapeHtml(t('ui.copyLink'))}</button>
      </div>
    </div>
  `;

  if(pdfFallback){
    $('#articleView .article-content').insertAdjacentHTML(
      'afterbegin',
      `<p class="doc-notice" role="status">${escapeHtml(t('documentFallback'))}</p>`
    );
  }

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
  if(state.route !== 'about' || getLang() !== L) return;
  if(!md) md = `# ${t('nav.about')}\n\n${t('about.body')}`; // fallback if md missing

  const bodyHtml = renderMarkdown(md);

  clearMath(el);
  el.innerHTML = `
    <div class="card about-card">
      <div class="about-layout">
        <div class="about-copy">${bodyHtml}</div>
      </div>
      <div class="about-actions">
        <a class="btn" href="#/projects">${escapeHtml(t('ui.viewProjects'))}</a>
      </div>
    </div>
  `;
  const copy = el.querySelector('.about-copy');
  const headings = copy.querySelectorAll('h2');
  const interestsHeading = headings[headings.length - 1];
  const interestsList = interestsHeading?.nextElementSibling;
  if(headings.length > 1 && interestsList?.tagName === 'UL'){
    const sidebar = document.createElement('aside');
    sidebar.className = 'about-interests';
    interestsHeading.id = 'aboutInterestsTitle';
    sidebar.setAttribute('aria-labelledby', interestsHeading.id);
    sidebar.append(interestsHeading, interestsList);
    const content = document.createElement('div');
    content.className = 'about-content';
    let node = headings[0];
    while(node){
      const next = node.nextSibling;
      content.append(node);
      node = next;
    }
    const details = document.createElement('div');
    details.className = 'about-details';
    details.append(content, sidebar);
    el.querySelector('.about-layout').append(details);
  }
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
let toolRenderVersion = 0;
const externalScripts = new Map();

function loadExternalScript(url, isReady){
  if(isReady()) return Promise.resolve();
  if(externalScripts.has(url)) return externalScripts.get(url);
  const pending = new Promise((resolve, reject)=>{
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = ()=>{
      if(isReady()) resolve();
      else reject(new Error(`Library did not initialize: ${url}`));
    };
    script.onerror = ()=> reject(new Error(`Library could not load: ${url}`));
    document.head.append(script);
  }).catch(error=>{
    externalScripts.delete(url);
    throw error;
  });
  externalScripts.set(url, pending);
  return pending;
}

function ensureToolRuntime(active){
  if(active === 'bode' || active === 'nyquist'){
    return loadExternalScript('https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.33.0/plotly.min.js', ()=> Boolean(window.Plotly));
  }
  if(active === 'cas'){
    return loadExternalScript('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js', ()=> typeof window.loadPyodide === 'function');
  }
  return Promise.resolve();
}

function toolMathHtml(tex){
  return `<div class="math-block">\\[${escapeHtml(tex)}\\]</div>`;
}

function setToolMath(host, tex){
  clearMath(host);
  host.removeAttribute('role');
  host.innerHTML = tex ? `<div>${toolMathHtml(tex)}</div>` : '';
  if(host.firstElementChild) return typesetMath(host.firstElementChild);
}

function showToolError(host, error){
  console.error('The calculation could not complete.', error);
  clearMath(host);
  host.setAttribute('role', 'alert');
  host.textContent = error.message || String(error);
}

function numberTex(value){
  if(!Number.isFinite(value)) throw new Error('Enter finite numbers.');
  const [mantissa, exponent] = String(value).split('e');
  return exponent ? `${mantissa}\\times 10^{${Number(exponent)}}` : mantissa;
}

function polynomialTex(coeffs){
  const terms = [];
  coeffs.forEach((coefficient, index)=>{
    if(coefficient === 0) return;
    const power = coeffs.length - index - 1;
    const magnitude = Math.abs(coefficient);
    const factor = power && magnitude === 1 ? '' : numberTex(magnitude);
    const variable = power ? (power === 1 ? 's' : `s^{${power}}`) : '';
    terms.push(`${coefficient < 0 ? '-' : (terms.length ? '+' : '')}${factor}${variable}`);
  });
  return terms.join(' ') || '0';
}

function transferFunctionTex(num, den, delay){
  if(!den.some(coefficient => coefficient !== 0)) throw new Error('The denominator cannot be zero.');
  return `G(s)=\\frac{${polynomialTex(num)}}{${polynomialTex(den)}}${delay ? `\\,e^{-${numberTex(delay)}s}` : ''}`;
}

function ctxTools(host){
  return {
    $: selector => host.querySelector(selector),
    t, escapeHtml, escapeAttr, getLang, typesetMath, clearMath,
    mathHtml: toolMathHtml, setMath: setToolMath, showError: showToolError,
    numberTex, transferFunctionTex,
  };
}
async function renderTools(){
  const el = $('#toolsView');
  if(!el) return;

  const active = toolsState.active;
  const version = ++toolRenderVersion;

  clearMath(el);
  el.innerHTML = `
    <div class="card" style="padding:20px">
      <h2 style="margin:0 0 6px">${escapeHtml(t('tools.title'))}</h2>
      <p style="margin:0;color:var(--muted)">${escapeHtml(t('tools.lead'))}</p>
    </div>

    <div class="tools-wrap">
      <aside class="tools-sidebar">
        <button class="tool-item ${active==='cas'?'active':''}" data-tool="cas">
          <span>CAS</span>
        </button>
      
        <button class="tool-item ${active==='bode'?'active':''}" data-tool="bode">
          <span>${escapeHtml(t('tools.bode'))}</span>
        </button>

        <button class="tool-item ${active==='nyquist'?'active':''}" data-tool="nyquist">
          <span>${escapeHtml(t('tools.nyquist'))}</span>
        </button>

        <button class="tool-item ${active==='laplace_helper'?'active':''}" data-tool="laplace_helper">
          <span>Laplace Helper</span>
        </button>

        <button class="tool-item ${active==='euler'?'active':''}" data-tool="euler">
          <span>${escapeHtml(t('tools.euler'))}</span>
        </button>
      </aside>

      <div class="tools-main">
        <div class="card tool-host">
          <p role="status">${escapeHtml(t('ui.loadingTool'))}</p>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('[data-tool]').forEach(btn=>{
    btn.setAttribute('aria-pressed', String(btn.dataset.tool === active));
    btn.onclick = ()=>{
      toolsState.active = btn.dataset.tool;
      renderTools().catch(reportAppError);
    };
  });
  const host = el.querySelector('.tool-host');
  try{
    await ensureToolRuntime(active);
    if(version !== toolRenderVersion || state.route !== 'tools') return;
    const tool = window.DLTOOLS[active];
    if(!tool) throw new Error(`Unknown engineering tool: ${active}`);
    const ctx = ctxTools(host);
    host.innerHTML = tool.html(ctx);
    await tool.wire(ctx);
    if(version !== toolRenderVersion || state.route !== 'tools') return;
    await typesetMath(host);
  }catch(error){
    console.error(`The ${active} tool could not initialize.`, error);
    if(version !== toolRenderVersion || state.route !== 'tools') return;
    host.innerHTML = `<p role="alert">${escapeHtml(t('ui.toolError'))}</p><button class="btn" type="button">${escapeHtml(t('entry.retry'))}</button>`;
    host.querySelector('button').onclick = ()=> renderTools().catch(reportAppError);
  }
}


/* =========================
   Routing
   ========================= */
function show(viewId){
  ['homeView','projectsView','papersView','researchPapersView','articleView','aboutView','tagsView','toolsView']
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
  else if(parts[0]==='research-papers'){state.route='research-papers';state.articleId=null;}
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
  else if(state.route==='research-papers') base = '#/research-papers';
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
      (r==='research-papers' && href==='#/research-papers') ||
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
    if(href==='#/research-papers') a.textContent = t('nav.research');
    if(href==='#/tools') a.textContent = t('nav.tools');
    if(href==='#/about') a.textContent = t('nav.about');
  });

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
  $('#archiveModes').setAttribute('aria-label', t('ui.archiveView'));
  $('#archiveListView').textContent = t('ui.listView');
  $('#archiveGridView').textContent = t('ui.gridView');

  $('#ctaProjects').textContent = t('ui.viewProjects');
  $('#ctaPapers').textContent = t('ui.browsePapers');
  $('#statPostsLbl').textContent = t('stats.posts');
  $('#replayIntroLabel').textContent = t('ui.replayIntro');
  $('#statLatestLbl').textContent = t('stats.updated');
  $('#statToolsLbl').textContent = t('stats.tools');
  $('#welcomeTitle').textContent = t('entry.welcome');
  $('#entryEnter').textContent = t('entry.enter');
  $('#entryHint').textContent = t('entry.hint');
  $('#entrySkip').textContent = t('entry.skip');

  document.title = 'PORTFOLIO | DLUSHKNE';
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
  };

  document.addEventListener('keydown', (e)=>{
    const a = document.activeElement;
    const typing = a && (a.tagName==='INPUT' || a.tagName==='TEXTAREA' || a.isContentEditable);
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key==='/' || e.code==='Slash')){
      e.preventDefault();
      if(state.route !== 'home') go('home');
      requestAnimationFrame(()=> input.focus());
    }
  }, { capture: true });

  const clearBtn = $('#clearQHome');
  if(clearBtn){
    clearBtn.onclick = ()=>{
      state.q = '';
      input.value = '';
      titlePage = 1;
      updateHash();
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

  let changingLanguage = false;
  menu.querySelectorAll('[data-lang]').forEach(btn=>{
    btn.onclick = async (e)=>{
      e.stopPropagation();
      if(changingLanguage) return;
      menu.classList.add('hidden');
      toggle.setAttribute('aria-expanded','false');
      const previousLanguage = getLang();
      if(btn.dataset.lang === previousLanguage) return;
      changingLanguage = true;
      toggle.disabled = true;
      try{
        setLang(btn.dataset.lang);
        await loadI18n();
        await renderNow();
        refresh();
        await window.PortfolioIntro.reveal(e.detail > 0 ? { x:e.clientX, y:e.clientY } : null);
      }catch(error){
        reportAppError(error);
        setLang(previousLanguage);
        refresh();
      }finally{
        changingLanguage = false;
        toggle.disabled = false;
      }
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
    $('#qHome').value = state.q;
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

  if(state.route==='research-papers'){
  show('researchPapersView');
  renderResearchPapers();
  return;
  }
  
  if(state.route==='article' && state.articleId){
    const id = state.articleId;
    await renderArticle(id);
    if(state.route !== 'article' || state.articleId !== id) return;
    show('articleView');
    await typesetMath($('#articleView'));
    return;
  }

  if(state.route==='about'){
    await renderAbout();
    if(state.route !== 'about') return;
    show('aboutView');
    await typesetMath($('#aboutView'));
    return;
  }

  if(state.route==='tags'){
    renderTags();
    show('tagsView');
    return;
  }

  if(state.route==='tools'){
    show('toolsView');
    await renderTools();
    return;
  }

  show('homeView');
}

/* =========================
   Init
   ========================= */
window.addEventListener('hashchange', ()=>{
  if(!bootReady) return;
  parseHash();
  renderNow().catch(reportAppError);
});

document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && state.route==='article'){ go('papers'); }
});

(async function boot(){
  try{
    loadProjects();
    await Promise.all([loadI18n(), loadPosts()]);
    parseHash();
    wireLangToggle();
    wireBasicsControls();
    wireSearchHome();
    wireArchiveControls();
    $('#replayIntro').onclick = ()=> window.PortfolioIntro.replay();
    renderStats();
    await renderNow();
    bootReady = true;
    window.PortfolioIntro.ready({
      loading: t('entry.loading'),
      error: t('entry.error'),
      retry: t('entry.retry'),
    });
  }catch(error){
    reportAppError(error);
    window.PortfolioIntro.fail(I18N.entry?.error);
  }
})();

function reportAppError(error){
  console.error('The portfolio could not render.', error);
  let notice = $('#appError');
  if(!notice){
    notice = document.createElement('div');
    notice.id = 'appError';
    notice.className = 'card app-error';
    notice.setAttribute('role', 'alert');
    document.querySelector('.shell').prepend(notice);
  }
  const message = t('entry.error');
  notice.textContent = message === 'entry.error' ? 'The portfolio could not load. Refresh to retry.' : message;
}

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
