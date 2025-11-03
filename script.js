let POSTS = [];
let state = { q:'', tag:null, route:'home', articleId:null };
const $  = s => document.querySelector(s);
const $all = s => Array.from(document.querySelectorAll(s));
const uniq = a => Array.from(new Set(a));


// ===== Language (EN/JA) =====
const LANG_KEY = 'ae-lang';
function getLang(){ return localStorage.getItem(LANG_KEY) || 'en'; }
function setLang(v){ localStorage.setItem(LANG_KEY, v); }

const I18N = {
  en: {
    siteTitle: 'Tech Study Journal',
    navHome: 'Home',
    navAbout: 'About',
    navTags: 'Tags',
    searchPlaceholder: 'Search posts, e.g. droop, PWM, PI tuning',
    clear: 'Clear',
    tipSlash: 'Tip: press / to focus search.',
    essentials: 'Essential Basics',
    heroTitle: 'Power Electronics, Control, and Embedded explained with clean demos, PSIM models, and short, readable write-ups.',
    heroLead: 'Each post is a mini-paper: what I tested, how I tested it, results, and what I learned and more.',
    recent: 'Recent Projects',
    allPosts: 'All Posts',
    loading: 'Loading posts...',
    noPosts: 'No posts yet.',
    noMatch: 'No matches. Try clearing filters.',
    page: 'Page',
    prev: 'Prev',
    next: 'Next',
    minutes: 'min',
    back: 'Back',
    copyLink: 'Copy link',
    pdfPreview: 'PDF preview',
    openPdf: 'Open PDF →',
    tagsTitle: 'Tags',
    tagNone: 'No posts for this tag.',
    clearTag: 'Clear',
    updated: 'Last updated: November 2025',
  },
  ja: {
    siteTitle: 'Tech Study Journal',
    navHome: 'ホーム',
    navAbout: '概要',
    navTags: 'タグ',
    searchPlaceholder: '検索：例）ドロープ，PWM，PI調整',
    clear: 'クリア',
    tipSlash: 'ヒント： / キーで検索にフォーカス。',
    essentials: '基礎トピック',
    heroTitle: 'パワエレ・制御・組込みを、PSIMデモと短い読みやすい解説で説明します。',
    heroLead: '各投稿はミニ論文形式：実験内容／方法／結果／学びを簡潔にまとめます。',
    recent: '最近のプロジェクト',
    allPosts: 'すべての投稿',
    loading: '読み込み中…',
    noPosts: 'まだ投稿はありません。',
    noMatch: '一致がありません。フィルタを解除して試してください。',
    page: 'ページ',
    prev: '前へ',
    next: '次へ',
    minutes: '分',
    back: '戻る',
    copyLink: 'リンクをコピー',
    pdfPreview: 'PDFプレビュー',
    openPdf: 'PDFを開く →',
    tagsTitle: 'タグ',
    tagNone: 'このタグの投稿はありません。',
    clearTag: '解除',
    updated: '最終更新：2025年11月',
  },
    mn: {
    siteTitle: "Техникийн Судалгааны Тэмдэглэл",
    navHome: "Нүүр",
    navAbout: "Тухай",
    navTags: "Тагууд",
    searchPlaceholder: "Хайх: ж. droop, PWM, PI тохиргоо",
    clear: "Цэвэрлэх",
    tipSlash: "Зөвлөгөө: / товчоор хайлт руу орох.",
    essentials: "Үндсэн ойлголтууд",
    heroTitle: "Power electronics, control, embedded системийн тухай туршилт, PSIM модел, товч тайлбаруудаар.",
    heroLead: "Пост бүрт хийсэн туршилт, гарсан үр дүн, ойлгосон зүйлсээ хураангуйлан нэгтгэн харуулна.",
    recent: "Сүүлийн төслүүд",
    allPosts: "Бүх бичлэг",
    loading: "Ачааллаж байна…",
    noPosts: "Бичлэг алга.",
    noMatch: "Таарсан зүйл алга. Шүүлтүүрийг арилгаж үзээрэй.",
    page: "Хуудас",
    prev: "Өмнөх",
    next: "Дараах",
    minutes: "мин",
    back: "Буцах",
    copyLink: "Холбоос хуулах",
    pdfPreview: "PDF урьдчилан харах",
    openPdf: "PDF нээх →",
    tagsTitle: "Тагууд",
    tagNone: "Энэ тагийн бичлэг байхгүй.",
    clearTag: "Арилгах",
    updated: "Сүүлд шинэчлэгдсэн: 2025 он 11 сар",
  }
};
function t(key){ const L=getLang(); return (I18N[L]&&I18N[L][key]) || I18N.en[key] || key; }

function applyStaticTexts(){
  // Nav
  const navLinks = document.querySelectorAll('nav a[href^="#/"]');
  navLinks.forEach(a=>{
    const href=a.getAttribute('href');
    if(href==='#/home')  a.textContent = t('navHome');
    if(href==='#/about') a.textContent = t('navAbout');
    if(href==='#/tags')  a.textContent = t('navTags');
  });

  // Headings & hero
  const heroTitle = document.getElementById('heroTitle');
  const heroLead  = document.getElementById('heroLead');
  const essentialsTitle = document.getElementById('essentialsTitle');
  const recentTitle = document.getElementById('recentTitle');
  const allTitle = document.getElementById('allTitle');
  if(heroTitle)        heroTitle.textContent = t('heroTitle');
  if(heroLead)         heroLead.textContent  = t('heroLead');
  if(essentialsTitle)  essentialsTitle.textContent = t('essentials');
  if(recentTitle)      recentTitle.textContent = t('recent');
  if(allTitle)         allTitle.textContent    = t('allPosts');

  // Search UI
  const q = document.getElementById('q');
  if(q) q.placeholder = t('searchPlaceholder');
  const clr = document.getElementById('clearQ');
  if(clr) clr.textContent = t('clear');
  document.querySelector('.small.hint')?.replaceChildren(document.createTextNode(t('tipSlash')));

  // Brand title (if you ever localize it)
  document.title = t('siteTitle');
}

function wireLangToggle(){
  const btn = document.getElementById('langToggle');
  if(!btn) return;

  const cycle = ['en', 'ja', 'mn'];
  const labels = { en: 'JP', ja: 'MN', mn: 'EN' };

  const refresh = () => { btn.textContent = labels[getLang()] || 'JP'; };
  refresh();

  btn.onclick = () => {
    const current = getLang();
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    setLang(next);
    refresh();
    applyStaticTexts();
    renderNow();
  };
}




function matchesSearch(p,q){
  if(!q) return true;
  return (p.title + ' ' + p.summary + ' ' + p.tags.join(' ')).toLowerCase().includes(q.toLowerCase());
}
function matchesTag(p,t){ return !t || p.tags.includes(t); }


let titlePage = 1;
const TITLES_PER_PAGE = 8;
let tagsPage = 1;  

const BASICS_I18N = {
  en: [
    {
      title: "Power Electronics",
      body: `
        <p><strong>Power electronics</strong> Power electronics focuses on controlling and converting electrical energy so it can be used efficiently and safely.It takes raw electricity from sources like batteries or the grid and shapes it into the right form for machines, chargers, or motors to use.It is the bridge between electrical power and intelligent control systems.</p>
        <ul>
          <li><strong>Main Components:</strong> Transistors, diodes, capacitors, inductors, sensors, and control boards.</li>
          <li><strong>Common Circuits:</strong> Buck, Boost, Half-Bridge, Full-Bridge, and inverter types used for power conversion.</li>
          <li><strong>Where It’s Used:</strong> Electric vehicles, solar power, charging systems, and industrial machines.</li>
          <li><strong>Focus:</strong> Making power clean, efficient, safe, and reliable.</li>
        </ul>
        <p>It is the heart of modern energy systems, turning electricity into something that can be used and controlled.</p>
      `
    },
    {
      title: "Embedded Control Systems",
      body: `
        <p><strong>Embedded control</strong> uses small computers to control hardware. These systems read signals, make decisions, and adjust how the hardware behaves in real time.</p>
        <ul>
          <li><strong>Controllers:</strong> Microcontrollers or digital processors that handle timing, signals, and protection.</li>
          <li><strong>Software Logic:</strong> Programs that react to sensor data and adjust outputs to stay stable and safe.</li>
          <li><strong>Connections:</strong> Sensors, switches, and communication links that let parts work together.</li>
          <li><strong>Focus:</strong> Smooth, reliable behavior under changing conditions.</li>
        </ul>
        <p>It gives life and intelligence to machines that would otherwise be silent hardware.</p>
      `
    },
    {
      title: "Simulation and Modeling",
      body: `
        <p><strong>Simulation tools</strong> such as PSIM or MATLAB help test ideas before building real hardware. You can see how circuits behave without risk or cost.</p>
        <ul>
          <li><strong>Modeling:</strong> Build digital versions of circuits to understand current and voltage flow.</li>
          <li><strong>Testing Ideas:</strong> Try settings, see failures, and learn the cause without damage.</li>
          <li><strong>Visualization:</strong> Observe responses when load or input voltage changes.</li>
          <li><strong>Purpose:</strong> Learn faster, fail safely, and prepare for real experiments.</li>
        </ul>
        <p>Simulation turns theory into understanding and builds confidence for lab work.</p>
      `
    },
    {
      title: "Sensors and Measurement",
      body: `
        <p><strong>Sensing</strong> is how systems see the world. Accurate voltage, current, and temperature measurement makes every design more reliable.</p>
        <ul>
          <li><strong>Voltage and Current:</strong> Measured using dividers, amplifiers, or sensor chips.</li>
          <li><strong>Temperature:</strong> Checked with thermistors or built-in sensors.</li>
          <li><strong>Signal Processing:</strong> Filter and scale data so a controller can use it.</li>
          <li><strong>Purpose:</strong> Stable feedback and safer operation.</li>
        </ul>
        <p>Good sensing brings control and clarity. Without it, even a strong design can drift.</p>
      `
    },
    {
      title: "Thermal and Efficiency Design",
      body: `
        <p>Every circuit makes heat. Managing that heat decides lifetime and efficiency.</p>
        <ul>
          <li><strong>Heat Sources:</strong> Power switches, magnetic parts, and high-current paths.</li>
          <li><strong>Cooling:</strong> Heat sinks, airflow, and careful placement.</li>
          <li><strong>Efficiency:</strong> Reduce loss with smart design and suitable materials.</li>
          <li><strong>Goal:</strong> Keep systems cool, efficient, and dependable under stress.</li>
        </ul>
        <p>Thermal design is part of the foundation, not an afterthought.</p>
      `
    }
  ],

  ja: [
    {
      title: "パワーエレクトロニクス",
      body: `
        <p><strong>パワーエレクトロニクス</strong>は、パワーエレクトロニクスは、電気エネルギーを効率的かつ安全に使える形に制御・変換する技術です。バッテリーや電力網などからの生の電力を、機器やモータ、充電器が使える形に整えます。電力と知的な制御システムをつなぐ架け橋となる分野です。</p>
        <ul>
          <li><strong>主な部品:</strong> トランジスタ、ダイオード、コンデンサ、インダクタ、センサ、制御基板。</li>
          <li><strong>代表的な回路:</strong> バック、ブースト、ハーフブリッジ、フルブリッジ、インバータなど。</li>
          <li><strong>用途例:</strong> 電気自動車、太陽光発電、充電器、産業用機器。</li>
          <li><strong>重視点:</strong> クリーンで効率的、安全で信頼できる電力にすること。</li>
        </ul>
        <p>現代のエネルギーシステムの中心であり、電力を「使えるもの」に変えます。</p>
      `
    },
    {
      title: "組込み制御システム",
      body: `
        <p><strong>組込み制御</strong>は、小型コンピュータでハードウェアを制御することです。信号を読み取り、判断し、動作をリアルタイムに調整します。</p>
        <ul>
          <li><strong>コントローラ:</strong> マイコンやデジタルプロセッサがタイミング、信号、保護を担当。</li>
          <li><strong>ソフトウェアの役割:</strong> センサ値に反応し、出力を調整して安定と安全を保つ。</li>
          <li><strong>接続:</strong> センサ、スイッチ、通信で各部が連携。</li>
          <li><strong>重視点:</strong> 変動に強く、なめらかで信頼できる動作。</li>
        </ul>
        <p>ただのハードウェアに、動くための知性を与えます。</p>
      `
    },
    {
      title: "シミュレーションとモデリング",
      body: `
        <p><strong>PSIM</strong>や<strong>MATLAB</strong>などのシミュレーションは、実機を作る前にアイデアを試すための道具です。リスクやコストを抑えて回路のふるまいを確認できます。</p>
        <ul>
          <li><strong>モデリング:</strong> 回路をデジタルに再現して電流や電圧の流れを理解。</li>
          <li><strong>アイデア検証:</strong> 条件を変えて失敗の原因を安全に学ぶ。</li>
          <li><strong>可視化:</strong> 負荷や入力電圧の変化に対する応答を観察。</li>
          <li><strong>目的:</strong> 学習を加速し、安全に失敗し、実験に備える。</li>
        </ul>
        <p>理論を理解に変え、実機評価への自信を育てます。</p>
      `
    },
    {
      title: "センサと計測",
      body: `
        <p><strong>センシング</strong>はシステムの「目」です。電圧・電流・温度を正確に測ることで、設計はより信頼できます。</p>
        <ul>
          <li><strong>電圧・電流:</strong> 分圧、アンプ、センサICなどで測定。</li>
          <li><strong>温度:</strong> サーミスタや内蔵センサで監視。</li>
          <li><strong>信号処理:</strong> フィルタやスケーリングでコントローラが扱える形に整える。</li>
          <li><strong>目的:</strong> 安定したフィードバックと安全な動作。</li>
        </ul>
        <p>良いセンシングは制御に確かさを与えます。弱いセンシングは設計を不安定にします。</p>
      `
    },
    {
      title: "熱設計と効率",
      body: `
        <p>すべての回路は熱を出します。熱をどう管理するかで寿命と効率が決まります。</p>
        <ul>
          <li><strong>発熱源:</strong> 電力スイッチ、磁性部品、大電流パス。</li>
          <li><strong>冷却:</strong> ヒートシンク、風冷、レイアウト工夫。</li>
          <li><strong>効率:</strong> 損失を減らす設計と材料選定。</li>
          <li><strong>目標:</strong> 負荷変動下でも冷却と信頼性を維持。</li>
        </ul>
        <p>熱設計は最後の付け足しではありません。土台の一部です。</p>
      `
    }
  ],

  mn: [
    {
      title: "Цахилгаан хүчний электроник",
      body: `
        <p><strong>Power electronics</strong> нь цахилгаан энергийг үр ашигтай, найдвартай, аюулгүйгээр хувиргах, хянах ухаан юм. Энэ нь батерей эсвэл цахилгаан сүлжээнээс ирсэн түүхий хүчийг төхөөрөмж, моторт эсвэл цэнэглэгчид тохирох хэлбэрт оруулдаг. Өөрөөр хэлбэл, цахилгаан эрчим хүч ба ухаалаг удирдлагын системийн хоорондын холбогч гүүр юм.</p>
        <ul>
          <li><strong>Гол бүрдэл:</strong> Транзистор, диод, конденсатор, индукц, мэдрэгч, удирдлагын самбар.</li>
          <li><strong>Түгээмэл хэлхээ:</strong> Buck, Boost, Half-Bridge, Full-Bridge, инвертер төрлүүд.</li>
          <li><strong>Хаана ашиглагддаг:</strong> Цахилгаан машин, нарны эрчим хүч, цэнэглэгч, үйлдвэрийн тоног төхөөрөмж.</li>
          <li><strong>Анхаарах зүйл:</strong> Цэвэр, үр ашигтай, аюулгүй, найдвартай цахилгаан болгох.</li>
        </ul>
        <p>Орчин үеийн эрчим хүчний системийн зүрх нь бөгөөд цахилгааныг ашиглах боломжтой болгодог.</p>
      `
    },
    {
      title: "Суулгамал удирдлагын систем",
      body: `
        <p><strong>Embedded control</strong> буюу суулгамал удирдлага гэдэг нь жижиг компьютерээр төхөөрөмжийн ажиллагааг бодит цагт удирдах систем юм. Энэ нь оролтын дохиог уншиж, нөхцөл байдлыг үнэлж, тохирох шийдвэр гаргана.</p>
        <ul>
          <li><strong>Удирдлага:</strong> Микроконтроллер эсвэл дижитал процессор нь цаглал, дохио, хамгаалалтыг хариуцна.</li>
          <li><strong>Программ логик:</strong> Мэдрэгчийн өгөгдөл дээр үндэслэн гаралтыг тохируулж, тогтвортой ажиллагааг хангана.</li>
          <li><strong>Холболт:</strong> Мэдрэгч, унтраалга, холбооны интерфейсүүдийг нэгтгэн ажиллуулна.</li>
          <li><strong>Зорилт:</strong> Орчны өөрчлөлтөд хариу үйлдэл үзүүлж, системийг үргэлж найдвартай байлгах.</li>
        </ul>
        <p>Өөрөөр хэлбэл, суулгамал удирдлага нь төмөр эд ангид “ухаан” суулгаж, түүнийг өөрөө сэтгэдэг төхөөрөмж болгон хувиргадаг.</p>
      `
    },
    {
      title: "Симуляци ба моделчлол",
      body: `
        <p><strong>PSIM</strong>, <strong>MATLAB</strong> зэрэг <strong>симуляцийн хэрэгсэл</strong> нь бодит төхөөрөмж хийхээс өмнө санаагаа шалгах боломж өгдөг. Эрсдэл ба зардалгүйгээр хэлхээний аашийг харах боломжтой.</p>
        <ul>
          <li><strong>Моделчлол:</strong> Хэлхээг дижитал орчинд бүтээж гүйдэл, хүчдэлийн урсгалыг ойлгох.</li>
          <li><strong>Санаа шалгалт:</strong> Тохиргоо өөрчилж, алдааны шалтгааныг аюулгүйгээр олж сурах.</li>
          <li><strong>Харагдах байдал:</strong> Ачаалал эсвэл оролтын хүчдэл өөрчлөгдөхөд үзүүлэх хариуг ажиглах.</li>
          <li><strong>Зорилго:</strong> Илүү хурдан суралцах, аюулгүй алдах, бодит туршилтад бэлтгэх.</li>
        </ul>
        <p>Симуляци бол онолыг бодит ойлголт болгон хувиргадаг гүүр юм. Туршилтын өмнөх “аюулгүй сургалт” гэж хэлж болно.</p>
      `
    },
    {
      title: "Мэдрэгч ба хэмжилт",
      body: `
        <p><strong>Хэмжилт</strong> бол системийн нүд. Хүчдэл, гүйдэл, температурыг зөв хэмжих нь ямар ч загварыг найдвартай болгодог.</p>
        <ul>
          <li><strong>Хүчдэл ба гүйдэл:</strong> Хуваагч эсвэл өсгөгч хэлхээ, мэдрэгч IC ашиглан хэмжинэ.</li>
          <li><strong>Температур:</strong> Термистор эсвэл дотоод мэдрэгчээр хянах.</li>
          <li><strong>Дохио боловсруулалт:</strong> Өгөгийг шүүх, хэмжээг нь тааруулж контроллерт ойлгомжтой болгох.</li>
          <li><strong>Зорилго:</strong> Тогтвортой буцаан холбоо, аюулгүй ажиллагаа.</li>
        </ul>
        <p>Сайн хэмжилт нь хяналтыг тодорхой болгодог. Сул хэмжилт нь сайн загварыг ч замаас гаргаж чадна.</p>
      `
    },
    {
      title: "Дулаан ба ашиг",
      body: `
        <p>Бүх хэлхээ дулаан гаргадаг. Түүнийг хэрхэн удирдах нь ашиглалтын хугацаа ба ашгийг шийддэг.</p>
        <ul>
          <li><strong>Дулааны эх үүсвэр:</strong> Хүчний унтраалга, соронзон эд анги, их гүйдлийн зам.</li>
          <li><strong>Хөргөлт:</strong> Дулаан зөөгч радиатор, агаарын урсгал, зөв байрлуулалт.</li>
          <li><strong>Ашиг:</strong> Алдагдлыг бууруулсан ухаалаг загвар, зөв материал сонголт.</li>
          <li><strong>Зорилт:</strong> Ачааллын өөрчлөлтөнд ч сэрүүн, үр ашигтай, найдвартай байлгах.</li>
        </ul>
        <p>Дулааны дизайн бол төслийн төгсгөл биш харин анхны шатанд авч үзэх ёстой чухал суурь хэсэг юм.</p>
      `
    }
  ]
};

// Simple renderer: call renderBasics('en'), renderBasics('ja'), or renderBasics('mn')
function renderBasics(lang = 'en') {
  const target = document.getElementById('basicsView') || document.querySelector('#basicsView');
  if (!target) return;
  const data = BASICS_I18N[lang] || BASICS_I18N.en;

  target.innerHTML = data.map(item => `
    <div class="card" style="padding:20px;margin-bottom:16px">
      <h3>${item.title}</h3>
      ${item.body}
    </div>
  `).join('');
}
function renderBasicsMini() {
  const el = document.getElementById('basicsMini');
  if (!el) return;

  const L = getLang();
  const data = BASICS_I18N[L] || BASICS_I18N.en;

  // Just show short clickable titles
  el.innerHTML = data.map((b, i) =>
    `<button class="mini-item" onclick="openBasic(${i})">${b.title}</button>`
  ).join('');

  // Make sure overlay uses the same language
  window.BASICS = data;
}


let basicIndex = 0;
function openBasic(i){
  basicIndex = (i + BASICS.length) % BASICS.length;

  const o   = document.getElementById('basicsOverlay');
  const ttl = document.getElementById('basicTitle');
  const bod = document.getElementById('basicBody');
  const nxt = document.getElementById('nextTitle');
  const prv = document.getElementById('prevTitle');
  const nextPeek = document.getElementById('nextPeek');
  const prevPeek = document.getElementById('prevPeek');
  if (!o || !ttl || !bod || !nxt || !prv) return;

  const cur = BASICS[basicIndex];
  const nx  = BASICS[(basicIndex + 1) % BASICS.length];
  const pv  = BASICS[(basicIndex - 1 + BASICS.length) % BASICS.length];

  ttl.textContent = cur.title;
  bod.innerHTML   = cur.body;
  nxt.textContent = nx.title;
  prv.textContent = pv.title;

  nextPeek?.classList.add('blurPersist');
  prevPeek?.classList.add('blurPersist');

  o.classList.remove('hidden');
  o.setAttribute('aria-hidden', 'false');
}



function closeBasic(){
  const o = document.getElementById('basicsOverlay');
  o.classList.add('hidden');
  o.setAttribute('aria-hidden', 'true');
}

function nextBasic(dir){
  openBasic(basicIndex + (dir || 1));
}

function wireBasicsControls(){
  const o = document.getElementById('basicsOverlay');
  if (!o) return;

  const bg   = o.querySelector('.overlay-bg');
  const x    = document.getElementById('basicClose');
  const nTop = document.getElementById('nextBtn');         
  const nBot = document.getElementById('nextBtnBottom');   
  const pBtn = document.getElementById('prevBtn');         
  const nextPeek = document.getElementById('nextPeek');
  const prevPeek = document.getElementById('prevPeek');

  if (bg)  bg.onclick  = closeBasic;
  if (x)   x.onclick   = closeBasic;
  if (nTop) nTop.onclick = ()=> nextBasic(1);
  if (nBot) nBot.onclick = ()=> nextBasic(1);
  if (pBtn) pBtn.onclick = ()=> nextBasic(-1);

  if (nextPeek){
    nextPeek.onclick = ()=> nextBasic(1);
    nextPeek.onkeydown = (e)=>{ if(e.key==='Enter' || e.key===' ') nextBasic(1); };
  }
  if (prevPeek){
    prevPeek.onclick = ()=> nextBasic(-1);
    prevPeek.onkeydown = (e)=>{ if(e.key==='Enter' || e.key===' ') nextBasic(-1); };
  }

  document.addEventListener('keydown', e=>{
    if(!o || o.classList.contains('hidden')) return;
    if(e.key === 'Escape')     closeBasic();
    if(e.key === 'ArrowRight') nextBasic(1);
    if(e.key === 'ArrowLeft')  nextBasic(-1);
  });
}


function renderPosts(){
  const featuredGrid = $('#featuredGrid');
  const titleList    = $('#titleList');

  // Filter by search + tag
  const filtered = POSTS
    .filter(p => matchesSearch(p, state.q))
    .filter(p => matchesTag(p, state.tag));

  // Empty index states
  if (!POSTS.length) {
    if (featuredGrid) featuredGrid.innerHTML =
      `<div class="card" style="grid-column:1/-1;padding:22px">${t('loading')}</div>`;
    if (titleList) titleList.innerHTML = '';
    return;
  }
  if (!filtered.length) {
    if (featuredGrid) featuredGrid.innerHTML =
      `<div class="card" style="grid-column:1/-1;padding:22px">${state.q||state.tag ? t('noMatch') : t('noPosts')}</div>`;
    if (titleList) titleList.innerHTML = '';
    return;
  }

  const L = (typeof getLang==='function'? getLang() : 'en');
  const sep = '<span class="dot">&middot;</span>';

  // Helper: choose per-language field with graceful fallback to EN
  const pick = (p, key) => {
    if (L==='ja' && p[`${key}_ja`]) return p[`${key}_ja`];
    if (L==='mn' && p[`${key}_mn`]) return p[`${key}_mn`];
    return p[key] || '';
  };

  // Build featured (first 3) cards
  const featured = filtered.slice(0, 3);
  if (featuredGrid) {
    featuredGrid.innerHTML = featured.map(p => {
      const title   = pick(p, 'title');
      const summary = pick(p, 'summary');
      const metaBits = [p.date];
      if (typeof p.minutes === 'number') metaBits.push(`${p.minutes} ${t('minutes')}`);
      const meta = metaBits.join(sep);
      const tagBadges = (p.tags||[]).map(tag => `<span class="badge">#${tag}</span>`).join(' ');
      const thumbHtml = p.hero ? `<img src="${p.hero}" alt="" loading="lazy">` : '';
      return `
        <article class="post" data-id="${p.id}" tabindex="0">
          <div class="thumb">${thumbHtml}</div>
          <div class="meta small">${meta}${tagBadges ? sep + tagBadges : ''}</div>
          <h3>${title}</h3>
          <p class="summary">${summary}</p>
        </article>`;
    }).join('');
  }

  // Remaining posts go to the right-side "All Posts" list with pagination
  const rest = filtered.slice(3);
  const per = TITLES_PER_PAGE;
  const totalPages = Math.ceil(rest.length / per) || 1;
  if (titlePage > totalPages) titlePage = totalPages;
  const start = (titlePage - 1) * per;
  const slice = rest.slice(start, start + per);

  if (titleList) {
    titleList.innerHTML = slice.map(p => {
      const title = pick(p, 'title');
      return `
        <div class="title-item" data-id="${p.id}" tabindex="0">
          <div class="title-text">${title}</div>
          <div class="title-date">${p.date}</div>
        </div>`;
    }).join('');

    if (totalPages > 1) {
      titleList.innerHTML += `
        <div style="display:flex;justify-content:center;gap:10px;padding:10px">
          <button class="btn" id="prevPage" ${titlePage===1 ? 'disabled' : ''}>${t('prev')}</button>
          <div class="small" style="align-self:center">${t('page')} ${titlePage} / ${totalPages}</div>
          <button class="btn" id="nextPage" ${titlePage===totalPages ? 'disabled' : ''}>${t('next')}</button>
        </div>`;
    }

    // Wire clicks/keyboard for both featured cards and title list rows
    document.querySelectorAll('#featuredGrid .post').forEach(card => {
      const id = card.getAttribute('data-id');
      card.addEventListener('click', () => go('article', id));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') go('article', id); });
    });
    document.querySelectorAll('#titleList .title-item').forEach(row => {
      const id = row.getAttribute('data-id');
      row.addEventListener('click', () => go('article', id));
      row.addEventListener('keydown', e => { if (e.key === 'Enter') go('article', id); });
    });

    const prev = document.getElementById('prevPage');
    const next = document.getElementById('nextPage');
    if (prev) prev.onclick = () => { titlePage--; renderPosts(); };
    if (next) next.onclick = () => { titlePage++; renderPosts(); };
  }
}


// render articluud ihsej bolno
function pickByLang(p, key){
  const L = getLang();
  if (L === 'ja' && p[`${key}_ja`]) return p[`${key}_ja`];
  if (L === 'mn' && p[`${key}_mn`]) return p[`${key}_mn`];
  return p[key] || '';
}

async function renderArticle(id){
  const p = POSTS.find(x => x.id === id);
  if(!p) return;

  // Pick content path per language (supports _ja and _mn)
  const contentUrl = pickByLang(p, 'content');

  let bodyHtml = '';
  if ((p.type || '').includes('md') && contentUrl){
    const res = await fetch(contentUrl, { cache:'no-store' });
    const md  = await res.text();
    bodyHtml  = marked.parse(md).replaceAll('<a href="','<a target="_blank" rel="noopener noreferrer" href="');
  } else {
    bodyHtml = `<p>${pickByLang(p, 'summary')}</p>`;
  }

  // Title per language
  const title = pickByLang(p, 'title');

  // Tags / meta
  const tagBadges = (p.tags || []).map(t => `<span class="badge">#${t}</span>`).join(' ');
  const metaBits  = [p.date];
  if (typeof p.minutes === 'number') metaBits.push(`${p.minutes} ${t('minutes')}`);
  const sep  = '<span class="dot">&middot;</span>';
  const meta = metaBits.join(sep);

  // PDF per language: pdf_en / pdf_ja / pdf_mn (fallback to pdfUrl/pdf_en)
  const L = getLang();
  let pdfUrl = p.pdfUrl || p.pdf_en || '';
  if (L === 'ja' && p.pdf_ja) pdfUrl = p.pdf_ja;
  if (L === 'mn' && p.pdf_mn) pdfUrl = p.pdf_mn;

  const heroBlock =  '';
  const pdfBlock  = pdfUrl ? `
    <div class="card" style="padding:0;margin-top:18px;overflow:hidden">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div class="small" style="color:var(--muted)">${t('pdfPreview')}</div>
        <a class="btn" href="${pdfUrl}" target="_blank" rel="noopener">${t('openPdf')}</a>
      </div>
      <div class="pdfwrap"><object data="${pdfUrl}" type="application/pdf"></object></div>
    </div>` : '';

  $('#articleView').innerHTML = `
    <div class="card">
      <div class="meta small" style="color:var(--muted)">${meta}${tagBadges ? sep + tagBadges : ''}</div>
      <h1 style="margin-top:8px">${title}</h1>
      ${heroBlock}
      ${bodyHtml}
      ${pdfBlock}
      <div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" onclick="go('home')">&#11013; ${t('back')}</button>
        <button class="btn" onclick="navigator.clipboard.writeText(location.href)">${t('copyLink')}</button>
      </div>
    </div>`;
  window.scrollTo({ top:0, behavior:'smooth' });
}


// render about taguud
function renderAbout() {
  const el = document.getElementById('aboutView') || document.querySelector('#aboutView');
  if (!el) return;

  const L = (typeof getLang === 'function' ? getLang() : 'en');
  const updated = (typeof t === 'function' ? t('updated') : 'Last updated');

  if (L === 'ja') {
    el.innerHTML = `
    <div class="card" style="padding:28px">
       <h2>このプロジェクトについて</h2>
  <p>このサイトは、私自身の学びを記録するためのオープン・ラーニングログです。エンジニアとして成長していく中で、学んだこと・作ったもの・気づいたことをまとめています。同じ道を歩む人、特に教科書ではなく「実際の仕組み」を知りたい人の役に立つことを目的としています。</p>

  <h3>目的</h3>
  <p>うまくいった実験も、失敗した試みも含めて、学びの過程そのものを共有することを目的としています。小さな実験や日々の積み重ねを、電子工学や制御、システム設計に興味を持つ人のための役立つ情報に変えていくことを目指しています。</p>

  <h3>内容</h3>
  <ul>
    <li>📘 <strong>ミニペーパー:</strong> 実験やテストを通じて得た学びを短くまとめた記録。</li>
    <li>🧠 <strong>基礎知識:</strong> 回路、シミュレーション、測定などの基本概念をわかりやすく解説。</li>
    <li>🧩 <strong>シミュレーションモデル:</strong> PSIMやMATLABで作成した、理論と現実をつなぐ可視化例。</li>
    <li>⚙️ <strong>ラボノート:</strong> デバッグ方法、セットアップ手順、実践的な問題解決の記録。</li>
  </ul>

  <h3>考え方</h3>
  <p>本当の学びは試行錯誤の中にあります。失敗も貴重な経験として記録することで、他の人がより早く理解できるようになります。</p>

  <h3>今後の計画</h3>
  <p>これからは次のような内容も追加していく予定です。</p>
  <ul>
    <li>より詳しいシミュレーションと比較分析</li>
    <li>実機テストや測定のノート</li>
    <li>職場で学んだ設計のヒント</li>
    <li>初心者にもわかりやすい複雑なテーマの解説</li>
  </ul>


        <p style="margin-top:20px;color:var(--muted)">${updated}</p>
        <div style="margin-top:16px">
          <button class="btn" onclick="go('home')">⬅ ${typeof t==='function' ? t('back') : 'Back'}</button>
        </div>
      </div>`;
    return;
  }

  if (L === 'mn') {
    el.innerHTML = `
      <div class="card" style="padding:28px">
        <h2>Энэ төслийн тухай</h2>
  <p>Энэ сайт нь миний хувийн нээлттэй суралцах тэмдэглэл юм. Инженерээр өсөж хөгжих явцдаа судалсан зүйлс, бүтээсэн зүйлс, ойлгосон зүйлсээ энд бичиж үлдээдэг. Энэ нь мөн адил замаар явж буй хүмүүст, ялангуяа сурах бичгээс гадна “жинхэнэ ажиллагаа”-г ойлгохыг хүсдэг хүмүүст туслах зорилготой.</p>
        <h3>Зорилго</h3>
  <p>Амжилттай туршилт ч бай, бүтэлгүй оролдлого ч бай — суралцах үйл явцыг тэр чигээр нь хуваалцах зорилготой. Өдөр бүрийн жижиг туршилт, ахиц дэвшлийг электроник, хяналтын систем, инженерийн сонирхолтой хүмүүст хэрэгтэй мэдээлэл болгохыг зорьж байна.</p>
        <h3>Агуулга</h3>
  <ul>
    <li>📘 <strong>Миний бичвэрүүд:</strong> Туршилт, шалгалт, суралцсан зүйлсийн товч тэмдэглэл.</li>
    <li>🧠 <strong>Үндсэн ойлголтууд:</strong> Цахилгаан хэлхээ, симуляци, хэмжилтийн энгийн тайлбарууд.</li>
    <li>🧩 <strong>Симуляцийн загварууд:</strong> PSIM эсвэл MATLAB ашиглан хийсэн онол ба бодит байдлыг холбосон жишээнүүд.</li>
    <li>⚙️ <strong>Лабораторийн тэмдэглэл:</strong> Алдаа засах арга, төхөөрөмжийн тохиргоо, бодит туршлага дээрх шийдлүүд.</li>
  </ul>

          <h3>Хандлага</h3>
         <p>Жинхэнэ суралцах үйл явц нь туршилт ба алдааны дунд оршдог. Алдаа бүр үнэ цэнэтэй бөгөөд үүнийг тэмдэглэснээр бусад хүн илүү хурдан суралцаж чадна.</p>

        <h3>Цаашдын төлөвлөгөө</h3>
        <p>Цаашдаа дараах чиглэлүүдийг хамруулан өргөжүүлэхээр төлөвлөж байна.</p>
        <ul>
          <li>Нарийвчилсан симуляци болон харьцуулалт</li>
          <li>Бодит төхөөрөмжийн туршилт ба хэмжилтийн тэмдэглэл</li>
          <li>Ажлын туршлага дээр суурилсан дизайны зөвлөгөө</li>
          <li>Энгийн бөгөөд ойлгомжтой байдлаар тайлбарласан нарийн сэдвүүд</li>
        </ul>

        <p style="margin-top:20px;color:var(--muted)">${updated}</p>
        <div style="margin-top:16px">
          <button class="btn" onclick="go('home')">⬅ ${typeof t==='function' ? t('back') : 'Back'}</button>
        </div>
      </div>`;
    return;
  }

  // EN (default)
  el.innerHTML = `
    <div class="card" style="padding:28px">
      <h2>About This Project</h2>
      <p>This site is my personal open-learning log. It is a place to record what I study, build, and discover as I grow as an engineer. It is written to help others who are walking the same path, especially those who want to understand how things actually work, not just how they look in textbooks.</p>
      <h3>Purpose</h3>
      <p>To share the real process of learning, including the tests that work, the ones that fail, and the lessons that come from trying. The goal is to turn small experiments and daily progress into something useful for anyone curious about electronics, control, and system design.</p>
      <h3>Contents</h3>
      <ul>
      <li>📘 <strong>Mini Papers:</strong> Short writeups of experiments, tests, and what I learned from them.</li>
      <li>🧠 <strong>Core Basics:</strong> Simple explanations of key concepts in circuits, simulation, and measurement.</li>
      <li>🧩 <strong>Simulation Models:</strong> Visual examples built in PSIM or MATLAB to help connect theory with reality.</li>
      <li>⚙️ <strong>Lab Notes:</strong> Practical notes about debugging, setup methods, and hands-on problem solving.</li>
    </ul>

       <h3>Future Plan</h3>
    <p>As I continue building, I plan to expand into:</p>
    <ul>
      <li>More detailed simulations and comparisons</li>
      <li>Real hardware testing and measurement notes</li>
      <li>Design tips learned from workplace experience</li>
      <li>Clear and beginner-friendly explanations of complex topics</li>
    </ul>

      <p style="margin-top:20px;color:var(--muted)">${updated}</p>
      <div style="margin-top:16px">
        <button class="btn" onclick="go('home')">⬅ ${typeof t==='function' ? t('back') : 'Back'}</button>
      </div>
    </div>`;
}


function renderTags(){
  const all = uniq(POSTS.flatMap(p=>p.tags)).sort();
  const counts = Object.fromEntries(all.map(t => [t, POSTS.filter(p=>p.tags.includes(t)).length]));

  const filtered = state.tag ? POSTS.filter(p => p.tags.includes(state.tag)) : POSTS;

  const totalPages = Math.ceil(filtered.length / TITLES_PER_PAGE) || 1;
  if (tagsPage > totalPages) tagsPage = totalPages;
  const start = (tagsPage - 1) * TITLES_PER_PAGE;
  const slice = filtered.slice(start, start + TITLES_PER_PAGE);

  const listItems = slice.map(p => {
    const title = (getLang()==='ja' && p.title_ja) ? p.title_ja : p.title;
    return `
      <div class="title-item" data-id="${p.id}">
        <div class="title-text">${title}</div>
        <div class="title-date">${p.date}</div>
      </div>`;
  }).join('') || `<div class="card" style="padding:22px">${t('tagNone')}</div>`;

  $('#tagsView').innerHTML = `
    <div class="card" style="padding:20px">
      <h1>${t('tagsTitle')}</h1>
      <div class="tags" style="margin-top:10px">
        ${all.map(t=>`
          <button class="tag ${state.tag===t?'active':''}" data-tag="${t}">
            #${t} <span class="small" style="opacity:.7">(${counts[t]||0})</span>
          </button>
        `).join('')}
      </div>
    </div>

    <h2 class="section-title" style="margin-top:16px">${state.tag ? ('#'+state.tag) : t('tagsTitle')} — Posts</h2>
    <div class="titles" id="tagsResult">${listItems}</div>

    ${totalPages>1 ? `
    <div style="display:flex;justify-content:center;gap:10px;padding:10px">
      <button class="btn" id="prevTagPage" ${tagsPage===1?'disabled':''}>${t('prev')}</button>
      <div class="small" style="align-self:center">${t('page')} ${tagsPage} / ${totalPages}</div>
      <button class="btn" id="nextTagPage" ${tagsPage===totalPages?'disabled':''}>${t('next')}</button>
    </div>`:''}
  `;

  document.querySelectorAll('#tagsView .title-item').forEach(row=>{
    row.addEventListener('click',()=>go('article',row.dataset.id));
    row.addEventListener('keydown',e=>{if(e.key==='Enter')go('article',row.dataset.id);});
    row.tabIndex=0;
  });
  document.querySelectorAll('#tagsView .tag').forEach(btn=>{
    btn.onclick = ()=>{
      const t = btn.getAttribute('data-tag');
      state.tag = (state.tag===t) ? null : t;
      tagsPage=1;
      updateHash(); renderTags();
    };
  });

  const prev=document.getElementById('prevTagPage');
  const next=document.getElementById('nextTagPage');
  if(prev) prev.onclick=()=>{tagsPage--; renderTags();};
  if(next) next.onclick=()=>{tagsPage++; renderTags();};
}



function selectTag(t){
  state.tag = (state.tag === t) ? null : t; 
  updateHash();
  renderTags();
}


function show(viewId){
  ['homeView','articleView','aboutView','tagsView'].forEach(id=>{
    document.getElementById(id).classList.toggle('hidden', id !== viewId);
  });
}

function buildTagBar(){
  const bar = document.getElementById('tagBar');

  const counts = {};
  POSTS.forEach(p => (p.tags || []).forEach(t => {
    counts[t] = (counts[t] || 0) + 1;
  }));

  const top = Object.keys(counts)
    .sort((a,b) => counts[b] - counts[a] || a.localeCompare(b))
    .slice(0, 3);

  bar.innerHTML = top.map(t =>
    `<button class="tag ${state.tag===t?'active':''}" data-tag="${t}">#${t}</button>`
  ).join('');

  bar.querySelectorAll('.tag').forEach(btn=>{
    btn.onclick = ()=>{
      const t = btn.getAttribute('data-tag');
      state.tag = (state.tag===t) ? null : t;
      updateHash();
      renderPosts();
      buildTagBar();
    };
  });
}


function wireSearch(){
  const input = document.getElementById('q');
  if (!input) return;
  input.value = state.q;

  input.addEventListener('input', ()=>{
    state.q = input.value.trim();
    renderPosts();
    updateHash();
  });

  document.addEventListener('keydown', (e)=>{
    const a = document.activeElement;
    const typing = a && (a.tagName==='INPUT' || a.tagName==='TEXTAREA' || a.isContentEditable);
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key==='/' || e.code==='Slash')){
      e.preventDefault();
      input.focus();
    }
  }, { capture: true });
}




function setActiveNav(){
  const r = state.route;
  document.querySelectorAll('nav a[href^="#/"]').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href') === `#/${r}`);
  });
}

function parseHash(){
  const [path, query] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(query || '');
  const parts = (path || '/home').split('/').filter(Boolean);
  state.q = params.get('q') || '';
  state.tag = params.get('tag') || null;

  if(parts[0]==='home'){ state.route='home'; state.articleId=null; }
  else if(parts[0]==='about'){ state.route='about'; state.articleId=null; }
  else if(parts[0]==='tags'){ state.route='tags'; state.articleId=null; }
  else if(parts[0]==='post' && parts[1]){ state.route='article'; state.articleId=parts[1]; }
  else { state.route='home'; state.articleId=null; }
}

function updateHash(){
  const qs = new URLSearchParams();
  if(state.q) qs.set('q', state.q);
  if(state.tag) qs.set('tag', state.tag);
  const base = '#/' + (state.route==='article' ? `post/${state.articleId}` : state.route);
  const s = qs.toString();
  location.hash = s ? `${base}?${s}` : base;
}

function go(route, payload){
  state.route = route;
  if(route==='article') state.articleId = payload;
  updateHash(); renderNow();
}

function filterByTag(t){ state.tag = t; updateHash(); renderNow(); }
function clearTag(){ state.tag = null; updateHash(); renderNow(); }

async function renderNow(){
  buildTagBar();
  wireSearch();
  setActiveNav();
  if(state.route==='home'){
    renderPosts();
    show('homeView');
    renderBasicsMini();     
  }
  else if(state.route==='article' && state.articleId){ await renderArticle(state.articleId); show('articleView'); }
  else if(state.route==='about'){ renderAbout(); show('aboutView'); }
  else if(state.route==='tags'){ renderTags(); show('tagsView'); }
  else { renderPosts(); show('homeView'); renderBasicsMini(); }
}


document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && state.route==='article'){ go('home'); }
});

document.addEventListener('click', e=>{
  if(e.target && e.target.id==='clearQ'){
    state.q=''; const input = document.getElementById('q'); if(input) input.value='';
    updateHash(); renderPosts();
  }
});

const root = document.documentElement;
const KEY='ae-theme';
function applyTheme(t){ root.classList.toggle('light', t==='light'); }
function getTheme(){ return localStorage.getItem(KEY) || (matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'); }
document.addEventListener('click', e => {
  if(e.target && (e.target.id==='darkToggle' || e.target.closest('#darkToggle'))){
    const t=getTheme()==='light'?'dark':'light';
    localStorage.setItem(KEY,t); applyTheme(t);
  }
});
applyTheme(getTheme());

(async function init(){
  const fg = document.getElementById('featuredGrid');
  if (fg) fg.innerHTML = '<div class="card" style="grid-column:1/-1;padding:22px">Loading posts...</div>';
  await loadIndex();
  parseHash();
  await renderNow();

  // NEW: apply translations and wire the toggle
  applyStaticTexts();
  wireLangToggle();
  renderBasicsMini();
  wireBasicsControls();
  document.getElementById('homeLink').addEventListener('click', e => {
    e.preventDefault();
    go('home');
  });
})();




async function loadIndex(){
  const res = await fetch('posts/index.json', { cache: 'no-store' });
  POSTS = await res.json();

  
  POSTS = POSTS.map(p => ({
    ...p,
    tags: (p.tags || [])
      .flatMap(s => String(s).split(',')) 
      .map(s => s.trim())
      .filter(Boolean)
      
  }));

  POSTS.sort((a,b) => a.date < b.date ? 1 : -1);
}



window.addEventListener('hashchange', ()=>{ parseHash(); renderNow(); });


