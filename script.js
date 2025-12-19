let POSTS = [];
let state = { q:'', tag:null, route:'home', articleId:null };
const $  = s => document.querySelector(s);
const $all = s => Array.from(document.querySelectorAll(s));
const uniq = a => Array.from(new Set(a));


// ===== Language (EN/JA) =====
const LANG_KEY = 'ae-lang';
function getLang(){ return localStorage.getItem(LANG_KEY) || 'en'; }
function setLang(v){ localStorage.setItem(LANG_KEY, v); }

async function fetchMarkdownSafe(url){
  if(!url) return null;
  try{
    const res = await fetch(url, { cache:'no-store' });
    if(!res.ok) return null;
    const text = await res.text();
    // Detect if it's actually an HTML 404 page instead of markdown
    if (/<!DOCTYPE|<html[\s>]/i.test(text)) return null;
    return text;
  }catch(_){ return null; }
}


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
    navAbout: 'About',
    navTags: 'Tags',
    searchPlaceholder: '検索：例）ドロープ，PWM，PI調整',
    clear: 'クリア',
    tipSlash: 'ヒント： / キーで検索にフォーカス。',
    essentials: '基礎トピック',
    heroTitle: 'パワエレ・制御・組込みを、PSIMデモと短い読みやすい解説で説明します。',
    heroLead: '各記事はミニ論文形式：実験内容／方法／結果／学びの要点をまとめています。',
    recent: '最近のプロジェクト',
    allPosts: 'すべての記事',
    loading: '読み込み中…',
    noPosts: 'まだ記事はありません。',
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
    tagNone: 'このタグの記事はありません。',
    clearTag: '解除',
    updated: '最終更新：2025年11月',
  },
    mn: {
    siteTitle: "Техникийн Судалгааны Тэмдэглэл",
    navHome: "Нүүр",
    navAbout: "Тухай",
    navTags: "Tags",
    searchPlaceholder: "Хайх: ж. droop, PWM, PI тохиргоо",
    clear: "Цэвэрлэх",
    tipSlash: " / товчоор хайлт руу орох.",
    essentials: "Товч ойлголтууд",
    heroTitle: "Power electronics, control, embedded системийн тухай туршилт, PSIM модел, товч тайлбаруудаар.",
    heroLead: "Пост бүрт хийсэн туршилт, гарсан үр дүн, ойлгосон зүйлсээ хураангуйлан нэгтгэн харуулна.",
    recent: "Сүүлийн судалгаанууд",
    allPosts: "Бүх судалгаа",
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
    tagNone: "Энэ тагийн судалгаа хараахан байхгүй.",
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

function wireLangToggle() {
  const toggle = document.getElementById('langToggle');
  const menu   = document.getElementById('langMenu');
  if (!toggle || !menu) return;

  // ASCII-only labels to avoid encoding issues
  const LABELS = {
    en: 'English',
    ja: '\u65E5\u672C\u8A9E',              // 日本語
    mn: '\u041C\u043E\u043D\u0433\u043E\u043B' // Монгол
  };
  const SHORT = { en: 'EN', ja: 'JP', mn: 'MN' };

  function refreshToggle(){
    const cur = getLang();
    toggle.textContent = SHORT[cur] || 'EN';
    toggle.setAttribute('aria-label', `Language: ${LABELS[cur] || 'English'}`);
  }

  // build dropdown
  menu.innerHTML = ['en','ja','mn']
    .map(code => `<button data-lang="${code}">${LABELS[code]}</button>`)
    .join('');

  // open/close
  toggle.onclick = (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  };

  // select language
  menu.querySelectorAll('button[data-lang]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      setLang(btn.dataset.lang);
      applyStaticTexts();
      renderNow();
      refreshToggle();
      menu.classList.add('hidden');
    };
  });

  // outside click closes
  document.addEventListener('click', () => menu.classList.add('hidden'));

  refreshToggle();
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
        <p><strong>Power electronics</strong> focuses on controlling and converting electrical energy so it can be used efficiently and safely.It takes raw electricity from sources like batteries or the grid and shapes it into the right form for machines, chargers, or motors to use.It is the bridge between electrical power and intelligent control systems.</p>
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
     <p><strong>Embedded control systems</strong> use small computers to operate machines and electronic circuits.  
        They constantly read sensor signals, make logical decisions, and adjust outputs in real time to keep the system stable and efficient.</p>
        <ul>
          <li><strong>Controllers:</strong> Microcontrollers or processors that handle timing, PWM signals, protection, and communication.</li>
          <li><strong>Software Logic:</strong> Code that reads inputs, processes conditions, and controls hardware behavior.</li>
          <li><strong>Connections:</strong> Sensors, switches, drivers, and communication lines that link everything together.</li>
          <li><strong>Focus:</strong> Achieve precise, reliable, and adaptive operation under changing conditions.</li>
        </ul>
        <p>Embedded control is the “brain” of every modern device it gives machines the ability to think, respond, and protect themselves.</p>

      `
    },
    {
      title: "Simulation and Modeling",
      body: `
       <p><strong>Simulation and modeling</strong> allow engineers to test and understand a system before building real hardware.  
        By recreating circuits and controls in software, you can visualize behavior, optimize parameters, and find problems safely.</p>
        <ul>
          <li><strong>Modeling:</strong> Build a digital version of a circuit to study how voltage, current, and power flow through it.</li>
          <li><strong>Testing:</strong> Change parameters, apply faults, and observe results without physical damage or cost.</li>
          <li><strong>Visualization:</strong> See transient responses, waveforms, and how components interact.</li>
          <li><strong>Goal:</strong> Understand the system deeply before moving to real-world testing.</li>
        </ul>
        <p>Simulation bridges theory and reality, turning equations into intuition and reducing mistakes in the lab.</p>

      `
    },
    {
      title: "Sensors and Measurement",
      body: `
        <p><strong>Sensors and measurement</strong> convert real-world quantities like voltage, current, and temperature into electrical signals that a system can understand.  
        They are the eyes and ears of every control system, ensuring safe and stable operation.</p>
        <ul>
          
  <li><strong>System Feedback:</strong> Measurement data is sent back to the controller to compare with the target value. This feedback loop keeps voltage, current, and speed within stable ranges even when the load changes.</li>
  <li><strong>Temperature:</strong> Monitored to protect power devices and ensure reliable operation. When heat rises, control logic can limit output, reduce switching losses, or activate cooling.</li>
  <li><strong>Signal Processing:</strong> Raw sensor signals are filtered, scaled, and converted to digital form so the controller can respond accurately in real time.</li>
  <li><strong>Focus:</strong> Turn physical behavior into trustworthy data — giving the system awareness to adjust, protect, and optimize itself automatically.</li>
</ul>

        
        <p>Good measurement reveals what’s really happening inside a circuit, without it control becomes guesswork.</p>

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
        <p><strong>パワーエレクトロニクス</strong>は電気エネルギーを効率的で安全に使える形に制御・変換する技術です。バッテリーや電力網などからの生の電力を、モータや充電器、機器が使いやすい形に整えます。電力と知的な制御システムをつなぐ架け橋のような役割を持っています。</p>
        <ul>
          <li><strong>主な部品:</strong> トランジスタ、ダイオード、コンデンサ、インダクタ、センサ、制御基板。</li>
          <li><strong>代表的な回路:</strong> 降圧、昇圧コンバータ、ハーフブリッジ回路、フルブリッジ回路、インバータ回路。</li>
          <li><strong>用途例:</strong> 電気自動車、太陽光発電、充電システム、産業機器。</li>
          <li><strong>重視点:</strong> 電力をクリーンで効率よく、安全で信頼性の高いものにする。</li>
        </ul>
        <p>現代のエネルギーシステムの中心にある技術で、電気を「使えるエネルギー」へと変える重要な役割を果たしています。</p>
      `
    },
    {
      title: "組込み制御システム",
      body: `
        <p><strong>組込み制御</strong>は、組込みシステムは、特定の機能を持つ機器の中で動作するコンピュータシステムです。
家電、車、産業機器など、私たちの身の回りのほとんどの製品に使われています。
ハードウェアとソフトウェアが一体となって動き、機器を正確かつ効率的に動かします。</p>
        <ul>
          <li><strong>主な構成要素:</strong> マイコン（MCU）、メモリ、センサ、アクチュエータ、通信モジュール。</li>
          <li><strong>主な開発言語:</strong> C、C++、アセンブリなど。</li>
          <li><strong>代表的な分野:</strong> 自動車制御、家電、医療機器、産業用ロボット、IoTデバイス。</li>
          <li><strong>重視点:</strong> 限られたリソースの中で、高速・安定・省電力に動作させること。</li>
        </ul>
        <p>目立たない場所で動いていても、社会のあらゆる仕組みを支える“縁の下の力持ち”のような存在です。</p>
      `
    },
    {
      title: "シミュレーション",
      body: `
        <p><strong>PSIM</strong>シミュレーションは、実際の回路やシステムをコンピュータ上で再現し、動作を確認・分析するための技術です。
安全でコストをかけずに、試作前の設計検証やチューニングができます。
実験では見えにくい信号の流れや、制御の反応も細かく観察できます。</p>
        <ul>
          <li><strong>主なツール:</strong> PSIM、MATLAB／Simulink、LTspice、PSpice、Typhoon HIL など。</li>
          <li><strong>主な用途:</strong> 電力変換回路の設計、制御パラメータの調整、安定性評価、効率解析。</li>
          <li><strong>利点:</strong> 安全・低コスト・再現性が高く、実機実験の前に問題を見つけられる。</li>
          <li><strong>ポイント:</strong> 現実の挙動をどれだけ正確に再現できるかが鍵。</li>
        </ul>
        <p>理論を理解に変え、実機評価への自信を育てます。</p>
      `
    },
    {
      title: "センサと計測",
      body: `
        <p><strong>センシング</strong>現実の物理量を電気信号として取り出し、システムが理解できる形に変える技術です。
温度、電流、電圧、位置、速度など、さまざまな情報を正確に測り、制御や分析に活かします。
パワーエレクトロニクスや組込みシステムでも欠かせない要素です。</p>
        <ul>
          <li><strong>主なセンサ:</strong>  電流センサ、電圧センサ、温度センサ、位置センサ、光センサ など。</li>
          <li><strong>主な計測機器:</strong> オシロスコープ、マルチメータ、データロガー、電力計 など。</li>
          <li><strong>用途例:</strong> 回路の動作確認、制御のチューニング、安全監視、性能評価。</li>
          <li><strong>ポイント:</strong> 正確さ（精度）と信頼性が最も重要。ノイズ対策やキャリブレーションも欠かせない。</li>
        </ul>
        <p>センサと計測は、見えない電気の世界を「見える化」する技術です。
正確な計測があってこそ、制御や設計の精度が生まれます。</p>
      `
    },
    {
      title: "熱設計と効率",
      body: `
        <p>電子機器の発熱をうまく抑え、エネルギーを無駄なく使うための技術です。
回路が発生する熱をどのように逃がすか、どれだけ効率よく電力を扱えるかは、信頼性と寿命を左右します。
パワーエレクトロニクスでは特に重要なテーマのひとつです。</p>
        <ul>
          <li><strong>関連要素:</strong> 放熱板（ヒートシンク）、ファン冷却、サーマルペースト、熱シミュレーション。</li>
          <li><strong>関連要素:</strong> 損失（導通損・スイッチング損）、温度上昇、効率（η）、熱抵抗（Rθ）。</li>
          <li><strong>用途例:</strong> コンバータやインバータの設計、モータドライバ、電源装置など。</li>
          <li><strong>ポイント:</strong> 熱を減らすことは、効率と信頼性を高めることにつながる。</li>
        </ul>
        <p>熱設計は「見えない熱」との戦いです。
効率を上げ、熱をコントロールすることが、安定した動作と長寿命を生む鍵になります。</p>
      `
    }
  ],

  mn: [
    {
      title: "Цахилгаан хүчний электроник",
      body: `
        <p><strong>Power electronics</strong> нь цахилгаан энергийг үр ашигтай, аюулгүй ашиглах хэлбэрт хувиргах технологи юм.
Батерей болон цахилгаан шугамаас ирэх түүхий хүчийг төхөөрөмж, мотор, цэнэглэгч зэрэгт тохирсон хэлбэрт оруулдаг.
Энэ нь цахилгаан ба ухаалаг удирдлагын системийг холбох гүүрийн үүрэгтэй..</p>
        <ul>
          <li><strong>Гол бүрдэл:</strong> Транзистор, диод, конденсатор, индукц, мэдрэгч, удирдлагын самбар.</li>
          <li><strong>Түгээмэл хэлхээ:</strong> Buck, Boost, Half-Bridge, Full-Bridge, инвертер төрлүүд.</li>
          <li><strong>Хаана ашиглагддаг:</strong> Цахилгаан машин, нарны эрчим хүч, цэнэглэгч, үйлдвэрийн тоног төхөөрөмж.</li>
          <li><strong>Анхаарах зүйл:</strong> Цэвэр, үр ашигтай, аюулгүй, найдвартай цахилгаан болгох.</li>
        </ul>
        <p>Орчин үеийн эрчим хүчний системийн зүрх нь бөгөөд цахилгааныг “ашиглагдах энерги” болгон хувиргадаг чухал технологи юм.</p>
      `
    },
    {
      title: "Embedded control систем",
      body: `
        <p><strong>Embedded control</strong> гэдэг нь жижиг компьютерээр төхөөрөмжийн ажиллагааг бодит цагт удирдах систем юм. Энэ нь оролтын дохиог уншиж, нөхцөл байдлыг үнэлж, тохирох шийдвэр гаргана.</p>
        <ul>
          <li><strong>Удирдлага:</strong> Микроконтроллер эсвэл дижитал процессор нь цаглал, дохио, хамгаалалтыг хариуцна.</li>
          <li><strong>Программ логик:</strong> Мэдрэгчийн өгөгдөл дээр үндэслэн гаралтыг тохируулж, тогтвортой ажиллагааг хангана.</li>
          <li><strong>Холболт:</strong> Мэдрэгч, унтраалга, холбооны интерфейсүүдийг нэгтгэн ажиллуулна.</li>
          <li><strong>Зорилт:</strong> Орчны өөрчлөлтөд хариу үйлдэл үзүүлж, системийг үргэлж найдвартай байлгах.</li>
        </ul>
        <p>Өөрөөр хэлбэл, embedded control  нь төмөр эд ангид “ухаан” суулгаж хувиргадаг.</p>
      `
    },
    {
      title: "Симуляци ба моделчлол",
      body: `
        <p><strong>PSIM</strong>, <strong>MATLAB</strong> зэрэг <strong>симуляцийн хэрэгсэл</strong> нь бодит төхөөрөмж хийхээс өмнө санаагаа шалгах боломж өгдөг. Эрсдэл ба зардалгүйгээр хэлхээг дэлгэрэнгүй ажиглаж болно.</p>
        <ul>
          <li><strong>Моделчлол:</strong> Хэлхээг дижитал орчинд загварчилж, гүйдэл ба хүчдэлийн өөрчлөлтийг ойлгох.</li>
          <li><strong>Хэрэглээ:</strong> Тохиргоо, параметрүүдийг туршиж, хэлхээний зан төлөвийг судлах.</li>
          <li><strong>Давуу тал:</strong> Аюулгүй, өртөг багатай, үр дүнг дахин шалгах боломжтой.</li>
          <li><strong>Зорилго:</strong> Туршилт хийхээс өмнө ойлголтоо гүнзгийрүүлж, системийн зан төлөвийг урьдчилан шинжлэх.</li>
        </ul>
        <p>Симуляци нь онолыг амьд жишээнд ойртуулж, туршилтын өмнө илүү гүнзгий ойлголт бий болгодог хэрэгсэл юм.</p>

      `
    },
    {
      title: "Мэдрэгч ба хэмжилт",
      body: `
        <p><strong>Мэдрэгч</strong><strong>Хэмжилт</strong> нь бодит орчны физик хэмжигдэхүүнийг цахилгаан дохио болгон хувиргах технологи юм.
Температур, гүйдэл, хүчдэл, байрлал, хурд зэрэг мэдээллийг нарийвчлалтай хэмжиж, хяналт болон дүн шинжилгээнд ашигладаг.
Энэ нь цахилгаан электроник болон Embedded control-ийн салшгүй хэсэг юм.</p>
        <ul>
          <li><strong>Гол мэдрэгчүүд:</strong> Гүйдэл, хүчдэл, температур, байрлал, гэрэл мэдрэгч гэх мэт.</li>
          <li><strong>Гол хэмжилтийн төхөөрөмж:</strong> Осциллоскоп, мультиметр, дата логгер, цахилгаан хүчний хэмжигч.</li>
          <li><strong>Хэрэглээ:</strong> Хэлхээний шалгалт, удирдлагын тохиргоо, аюулгүй ажиллагаа, гүйцэтгэлийн үнэлгээ.</li>
          <li><strong>Гол санаа:</strong>Нарийвчлал ба найдвартай байдал.</li>
        </ul>
        <p>Мэдрэгч ба хэмжилт нь “харагддаггүй цахилгааныг харагддаг болгодог” технологи юм.
Нарийн хэмжилт л сайн хяналт, найдвартай ажиллагааг бий болгодог.</p>
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
          <li><strong>Зорилт:</strong> Ачааллын өөрчлөлтөнд ч үр ашигтай, найдвартай байлгах.</li>
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

const CATEGORY_COLORS = {
  electric:  '#25364A', // amber
  control:   '#2E5B5B', // emerald 
  embedded:  '#2F4F43', // dark blue
  sim:       '#3B2F3F', // violet
  power:     '#ef4444', // red
  docs:      '#2B2E34', // gray
};

const CATEGORY_RULES = [
  { cat: 'electric', keys: [
    'electric','circuit','dc-dc','buck','boost','buck-boost',
    'inverter','rectifier','bridge','snubber','inductor','capacitor',
    'mosfet','igbt','diode','降圧','昇圧','昇降圧','インバータ','整流','回路','電源','トポロジ'
  ]},
  { cat: 'control', keys: [
    'control','pid','pi','pll','pwm','compensator','loop','bandwidth','droop',
    'stability','bode','nyquist','gain',
    '制御','補償','ゲイン','安定','位相','ボード','ドロープ','閉ループ','開ループ'
  ]},
  { cat: 'embedded', keys: [
    'embedded','mcu','dsp','c2000','stm32','adc','dac','timer','pwm-out',
    'firmware','driver','register','組込','組込み','マイコン','割り込み','レジスタ'
  ]},
  { cat: 'sim', keys: [
    'psim','typhoon','hil','matlab','simulink','spice','ltspice',
    'model','simulation','シミュレーション','モデル','解析','波形','仮想'
  ]},
  { cat: 'power', keys: [
    'power','hv','high-voltage','800v','50kw','isolation','current-share',
    'efficiency','thermal','heat','cooling','電力','高電圧','絶縁','効率','損失','熱','冷却','放熱'
  ]},
  { cat: 'theory', keys: [
    'paper','math','pdf','theory','post','doc','writeup','portfolio','github',
    'ドキュメント','報告','成績書','仕様書','記事','投稿','サイト','運用'
  ]},
];

const FALLBACK_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ec4899','#14b8a6','#a855f7','#ef4444','#10b981'];

function hashStr(s){
  let h = 0; for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function guessCategory(tag){
  const t = String(tag||'').toLowerCase();
  for(const r of CATEGORY_RULES){
    if (r.keys.some(k => t.includes(k))) return r.cat;
  }
  return null;
}
function colorByCategory(tag){
  const cat = guessCategory(tag);
  if (cat && CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  return FALLBACK_COLORS[ hashStr(tag) % FALLBACK_COLORS.length ];
}
function tagBadge(tag){
  const bg = colorByCategory(tag);
  return `<span class="badge" style="background:${bg};color:#fff">${tag}</span>`;
}


function renderPosts(){
  const featuredGrid = $('#featuredGrid');
  const titleList    = $('#titleList');

  const filtered = POSTS
    .filter(p => matchesSearch(p, state.q))
    .filter(p => matchesTag(p, state.tag));

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

  const pick = (p, key) => {
    if (L==='ja' && p[`${key}_ja`]) return p[`${key}_ja`];
    if (L==='mn' && p[`${key}_mn`]) return p[`${key}_mn`];
    return p[key] || '';
  };

  const featured = filtered.slice(0, 3);
  if (featuredGrid) {
    featuredGrid.innerHTML = featured.map(p => {
      const title   = pick(p, 'title');
      const summary = pick(p, 'summary');
      const metaBits = [p.date];
      if (typeof p.minutes === 'number') metaBits.push(`${p.minutes} ${t('minutes')}`);
      const meta = metaBits.join(sep);
      
      const allTags     = p.tags || [];
      const visibleTags = allTags.slice(0, 3);
      const hiddenTags  = allTags.slice(3);
      
      let tagBadges = visibleTags.map(tag => tagBadge(tag)).join('');
      if (hiddenTags.length > 0) {
        tagBadges += `
          <span class="badge more-tags">
            +${hiddenTags.length}
            <span class="extra-tags">
              ${hiddenTags.map(tag => tagBadge(tag)).join('')}
            </span>
          </span>`;
      }
      
      const thumbHtml = p.hero ? `<img src="${p.hero}" alt="" loading="lazy">` : '';
      return `
        <article class="post" data-id="${p.id}" tabindex="0">
          <div class="thumb">${thumbHtml}</div>
          <div class="meta small">${meta}${(tagBadges ? sep + tagBadges : '')}</div>
          <h3>${title}</h3>
          <p class="summary">${summary}</p>
        </article>`;

    }).join('');
  }

  const rest = filtered.slice(3);
  const per = TITLES_PER_PAGE;
  const totalPages = Math.ceil(rest.length / per) || 1;
  if (titlePage > totalPages) titlePage = totalPages;
  const start = (titlePage - 1) * per;
  const slice = rest.slice(start, start + per);

  if (titleList) {
  titleList.innerHTML = slice.map(p => {
    const title = pick(p, 'title');
    const visibleTags = (p.tags || []).slice(0, 3);
    const tagBadges = visibleTags.map(tag => tagBadge(tag)).join(' ');
    return `
      <div class="title-item" data-id="${p.id}" tabindex="0">
        <div class="title-text">${title}</div>
        <div class="title-meta">
          <span class="title-date">${p.date}</span>
          <span class="title-tags">${tagBadges}</span>
        </div>
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

  const L = getLang();

  // 1) pick localized title
  const title = pickByLang(p, 'title');

  // 2) choose markdown file (ja/mn → en fallback)
  const localizedPath =
    (L === 'ja' ? p.content_ja :
     L === 'mn' ? p.content_mn : null);

  const candidates = [
    localizedPath && String(localizedPath).trim(),
    p.content && String(p.content).trim()
  ].filter(Boolean);

  // 3) fetch markdown safely
  let md = null;
  for(const url of candidates){
    md = await fetchMarkdownSafe(url);
    if(md) break;
  }

  // 4) render markdown or fallback summary
  let bodyHtml = '';
  if ((p.type || '').includes('md') && md){
    bodyHtml = marked.parse(md)
      .replaceAll('<a href="','<a target="_blank" rel="noopener noreferrer" href="');
  }else{
    bodyHtml = `<p>${pickByLang(p, 'summary') || ''}</p>`;
  }

  // 5) pdf fallback
  let pdfUrl = p.pdfUrl || p.pdf_en || '';
  if (L === 'ja' && p.pdf_ja) pdfUrl = p.pdf_ja;
  if (L === 'mn' && p.pdf_mn) pdfUrl = p.pdf_mn;

  const pdfBlock  = pdfUrl ? `
    <div class="card" style="padding:0;margin-top:18px;overflow:hidden">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div class="small" style="color:var(--muted)">${t('pdfPreview')}</div>
        <a class="btn" href="${pdfUrl}" target="_blank" rel="noopener">${t('openPdf')}</a>
      </div>
      <div class="pdfwrap"><object data="${pdfUrl}" type="application/pdf"></object></div>
    </div>` : '';

  // 6) build meta, hero, and final view
  const meta = `${p.date||''}`;
  const tagBadges = (p.tags || []).map(tag => tagBadge(tag)).join(' ');
  const sep = meta && tagBadges ? ' ・ ' : '';
  const theme = p.theme || 'electric';
  const heroBlock = '';

  $('#articleView').innerHTML = `
  <div class="card article" data-theme="${theme}">
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
}



// render about
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
        
        <a href="legal.html" target="_blank">これは趣味です、仕事じゃないです</a>
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
         <p>Алдаа бол суралцах үйл явцын салшгүй хэсэг.
үүнийг тэмдэглэж, хуваалцах тусам хүн бүр илүү хурдан урагшилна.</p>

        <h3>Цаашдын төлөвлөгөө</h3>
        <p>Цаашдаа дараах чиглэлүүдийг хамруулан өргөжүүлэхээр төлөвлөж байна.</p>
        <ul>
          <li>Нарийвчилсан симуляци болон харьцуулалт</li>
          <li>Бодит төхөөрөмжийн туршилт ба хэмжилтийн тэмдэглэл</li>
          <li>Ажлын туршлага дээр суурилсан дизайны зөвлөгөө</li>
          <li>Энгийн бөгөөд ойлгомжтой байдлаар тайлбарласан нарийн сэдвүүд</li>
        </ul>

        <p style="margin-top:20px;color:var(--muted)">${updated}</p>
        
        <a href="legal.html" target="_blank">Компаний нууц миний ноорогт ордоггүй.</a>
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
      <a href="legal.html" target="_blank">No NDAs Were Harmed</a>
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


