// Bible Backpack 主應用控制器 (Main Application Controller)

let currentBook = "創世記";
let currentChapter = 1;
let currentActiveTier = "tier1"; // "tier1" (靈修單張) 或 "tier2" (深度行囊)
let activeStudyData = typeof GENESIS_1_DATA !== "undefined" ? GENESIS_1_DATA : JOSHUA_1_DATA;
let activeCurriculumContext = null; // 當前正在研讀的小組主題課程上下文（若非 null 則處於主題課程研讀模式）

// 渲染主題課程模式橫幅
function renderCurriculumBanner() {
  const banner = document.getElementById("curriculum-session-banner");
  if (!banner) return;
  if (!activeCurriculumContext) {
    banner.classList.add("hidden");
    return;
  }
  banner.classList.remove("hidden");
  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const titleEl = document.getElementById("curriculum-banner-title");
  const sessionEl = document.getElementById("curriculum-banner-session");
  const themeEl = document.getElementById("curriculum-banner-theme");
  if (titleEl) titleEl.textContent = activeCurriculumContext.packTitle || (isEn ? "Thematic Curriculum" : "小組主題課程");
  if (sessionEl) {
    sessionEl.textContent = isEn
      ? `Session ${activeCurriculumContext.sessionNum || 1} · ${activeCurriculumContext.sessionTitle || ""}`
      : `第 ${activeCurriculumContext.sessionNum || 1} 堂 · ${activeCurriculumContext.sessionTitle || ""}`;
  }
  if (themeEl) {
    const parts = [];
    if (activeCurriculumContext.passageRange) parts.push(`📖 ${activeCurriculumContext.passageRange}`);
    if (activeCurriculumContext.coreMessage) parts.push(`💡 ${activeCurriculumContext.coreMessage}`);
    if (activeCurriculumContext.discussionTheme) parts.push(`💬 ${activeCurriculumContext.discussionTheme}`);
    themeEl.textContent = parts.join("  |  ");
  }
}

// 退出主題課程模式
function exitCurriculumMode() {
  activeCurriculumContext = null;
  renderCurriculumBanner();
  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  showToast(isEn ? "Exited thematic curriculum mode, returned to general study." : "已退出小組主題模式，返回單章通用研經。");
  handleBookOrChapterChange(false);
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  // 讀取上次打開的書卷與章節（首次進入預設為《創世記》第 1 章）
  const lastLoc = BackpackStore.getLastLocation();
  currentBook = lastLoc.book || "創世記";
  currentChapter = lastLoc.chapter || 1;

  applyThemeAndFont();

  if (typeof I18n !== "undefined") {
    I18n.applyToDOM();
    const navLangLabel = document.getElementById("nav-lang-label");
    if (navLangLabel) {
      navLangLabel.textContent = BackpackStore.getLanguage() === "zh" ? "EN" : "繁中";
    }
  }

  renderTasteBadges();
  renderBookSelector();

  const chapInput = document.getElementById("chapter-selector-input");
  if (chapInput) chapInput.value = currentChapter;
  renderChapterDropdown();

  setupEventListeners();
  updateBackpackBadge();
  handleBookOrChapterChange(false, true);
}

// 應用主題與字體
function applyThemeAndFont() {
  const theme = BackpackStore.getTheme();
  document.documentElement.setAttribute("data-theme", theme);
  const fontSize = BackpackStore.getFontSize();
  document.body.className = `font-size-${fontSize}`;
}

// 介面語言切換 (zh 繁體中文 ⇄ en English)
function setLanguage(lang) {
  if (!lang || (lang !== "zh" && lang !== "en")) return;
  BackpackStore.setLanguage(lang);

  const btnZh = document.getElementById("lang-btn-zh");
  const btnEn = document.getElementById("lang-btn-en");
  if (btnZh && btnEn) {
    if (lang === "zh") {
      btnZh.className = "px-3 py-1.5 rounded border text-xs font-bold transition-all border-amber-700 bg-amber-50 text-amber-900";
      btnEn.className = "px-3 py-1.5 rounded border text-xs font-medium transition-all border-stone-300 bg-white hover:bg-stone-50 text-stone-700";
    } else {
      btnEn.className = "px-3 py-1.5 rounded border text-xs font-bold transition-all border-amber-700 bg-amber-50 text-amber-900";
      btnZh.className = "px-3 py-1.5 rounded border text-xs font-medium transition-all border-stone-300 bg-white hover:bg-stone-50 text-stone-700";
    }
  }

  const navLangLabel = document.getElementById("nav-lang-label");
  if (navLangLabel) {
    navLangLabel.textContent = lang === "zh" ? "EN" : "繁中";
  }

  if (typeof I18n !== "undefined") {
    I18n.applyToDOM();
  }

  // 英文介面時，若當前譯本為和合本，自動推薦切換至 NIV
  if (lang === "en" && BackpackStore.getBibleVersion() === "cuv") {
    BackpackStore.setBibleVersion("niv");
    const verSelect = document.getElementById("bible-version-select");
    if (verSelect) verSelect.value = "niv";
  }

  renderBookSelector();
  renderTasteBadges();
  renderScripture();
  handleBookOrChapterChange(false);
}

function toggleLanguage() {
  const current = BackpackStore.getLanguage();
  const next = current === "zh" ? "en" : "zh";
  setLanguage(next);
  showToast(next === "en" ? "Switched to English interface" : "已切換至繁體中文介面");
}

// 頂部當前口味標籤展示
function renderTasteBadges() {
  const container = document.getElementById("active-taste-badges");
  if (!container) return;

  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const selectedTasteIds = BackpackStore.getTastes();
  const allTastes = BackpackStore.AVAILABLE_TASTES;
  const activeTastes = allTastes.filter(t => selectedTasteIds.includes(t.id));
  const customKeyword = BackpackStore.getCustomTaste();

  let html = activeTastes.map(t => {
    const info = typeof I18n !== "undefined" ? I18n.getTasteInfo(t) : t;
    const name = info.name || t.name;
    return `
      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
        <span>${t.icon}</span>
        <span>${name}</span>
      </span>
    `;
  }).join("");

  if (customKeyword) {
    html += `
      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        <span>✨</span>
        <span>${escapeHtml(customKeyword)}</span>
      </span>
    `;
  }

  container.innerHTML = html;
}

// 渲染經文列表（支援 CUV 和合本、API.Bible NIV/NIrV/CEV 與本地快取）
function renderScripture() {
  const titleEl = document.getElementById("scripture-title");
  const container = document.getElementById("scripture-verses");
  const versionSelect = document.getElementById("bible-version-select");
  if (!container) return;

  const currentVer = (typeof BackpackStore !== "undefined" ? BackpackStore.getBibleVersion() : "cuv").toLowerCase();
  if (versionSelect && versionSelect.value !== currentVer) {
    versionSelect.value = currentVer;
  }

  const book = currentBook || (activeStudyData ? activeStudyData.bookName : "創世記");
  const chap = currentChapter || (activeStudyData ? activeStudyData.chapter : 1);
  const bookMeta = typeof BibleService !== "undefined" ? BibleService.getBookMeta(book) : null;
  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const displayName = isEn ? (bookMeta?.english || book) : (bookMeta?.name || book);

  if (titleEl) {
    titleEl.textContent = isEn 
      ? `${displayName} Chapter ${chap}` 
      : `${displayName} 第 ${chap} 章`;
  }

  // 1. 優先從 BibleService 讀取 (支援 cuv, niv, nirv, cev)
  let verses = null;
  if (typeof BibleService !== "undefined") {
    verses = BibleService.getChapterVerses(book, chap, currentVer);
  }

  // 2. 備用：若 CUV 本地全庫尚未完成載入，從 activeStudyData 或預載包讀取 (僅在 CUV 時相容備用)
  if (currentVer === "cuv" && (!verses || !verses.length || (verses.length === 1 && verses[0].text.includes("正在")))) {
    if (activeStudyData && activeStudyData.bookName === book && activeStudyData.chapter === chap && activeStudyData.verses) {
      verses = activeStudyData.verses;
    } else if (typeof getPresetPack === "function") {
      const preset = getPresetPack(book, chap);
      if (preset && preset.verses) verses = preset.verses;
    }
  }

  if (!verses || !verses.length) {
    container.innerHTML = `
      <div class="py-12 text-center text-xs text-stone-400">
        <div class="inline-block animate-spin text-2xl mb-2">📖</div>
        <div>${isEn ? `Loading ${displayName} ${chap}...` : `正在準備《${escapeHtml(displayName)}》第 ${chap} 章經文...`}</div>
      </div>
    `;
    return;
  }

  const versesHtml = verses.map(v => {
    if (v.isNotice) {
      return `
        <div class="p-3 my-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
          <div class="font-bold mb-1">📢 ${isEn ? "Notice" : "提示"}</div>
          <div>${escapeHtml(v.text)}</div>
          <div class="mt-2">
            <button onclick="openSettingsModal()" class="px-3 py-1 bg-amber-800 text-white text-2xs rounded hover:bg-amber-900">
              ${isEn ? "Open Settings (⚙️)" : "前往設置 (⚙️)"}
            </button>
            <button onclick="switchBibleVersion('cuv')" class="px-3 py-1 bg-stone-200 text-stone-800 text-2xs rounded hover:bg-stone-300 ml-1">
              ${isEn ? "Switch to CUV" : "切換至和合本"}
            </button>
          </div>
        </div>
      `;
    }
    return `
      <div class="verse-item flex items-baseline gap-2 py-1.5 px-2 rounded hover:bg-stone-50 transition-colors" id="verse-${v.num}">
        <span class="verse-num text-xs font-bold text-amber-800 w-6 flex-shrink-0 select-none">${v.num}</span>
        <span class="verse-text text-stone-800 leading-relaxed">${escapeHtml(v.text)}</span>
      </div>
    `;
  }).join("");

  container.innerHTML = versesHtml;
}

// 切換聖經譯本
function switchBibleVersion(ver) {
  if (!ver) return;
  BackpackStore.setBibleVersion(ver);
  
  if (ver !== "cuv" && !BackpackStore.getApiBibleKey()) {
    showToast(typeof I18n !== "undefined" && I18n.isEn() 
      ? `Please set your API.Bible Key in Settings (⚙️) to fetch ${ver.toUpperCase()} text!` 
      : `請在右上角「⚙️ 設置」填寫 API.Bible 金鑰以連線載入 ${ver.toUpperCase()}！`);
  } else {
    showToast(`切換譯本至 ${ver.toUpperCase()}`);
  }

  renderScripture();
}

// 渲染當前選中的研經層級 (Tier 1 vs Tier 2)
function renderActiveTierContent() {
  const container = document.getElementById("tier-content-container");
  if (!container) return;

  if (currentActiveTier === "tier1") {
    renderTier1Sheet(container);
  } else {
    renderTier2Dossier(container);
    setTimeout(() => {
      initRouteMap(activeStudyData.tier2_dossier?.geography?.routePoints);
    }, 150);
  }
}

// 渲染類別一：靈修查經單張 (1~2頁，極簡清晰)
function renderTier1Sheet(container) {
  const data = activeStudyData?.tier1_sheet;
  if (!data) {
    renderEmptyChapterPrompt(currentBook, currentChapter);
    return;
  }

  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const bookName = typeof I18n !== "undefined" ? I18n.getBookName(activeStudyData.bookName || currentBook) : (activeStudyData.bookName || currentBook);
  const chapNum = activeStudyData.chapter || currentChapter;
  const isSavedSheet = BackpackStore.isItemSaved(`sheet-${activeStudyData.bookId}-${activeStudyData.chapter}`);

  container.innerHTML = `
    <!-- 打印抬頭（平時隱藏，打印時自動顯示） -->
    <div class="print-header">
      <div class="print-brand">
        <span>${isEn ? "🎒 Bible Backpack · Devotional Study Sheet" : "🎒 Bible Backpack · 靈修查經單張"}</span>
        <span style="font-weight: normal; font-size: 10pt;">${isEn ? `Passage: ${bookName} Ch. ${chapNum}` : `經文：${bookName} 第 ${chapNum} 章`}</span>
      </div>
      <div class="print-meta">
        <span>${isEn ? "Name / Group: ____________________" : "姓名/組別：____________________"}</span>
        <span>${isEn ? "Date: " : "日期："}${new Date().toLocaleDateString()}</span>
      </div>
    </div>

    <!-- 屏幕頂部操作欄 (No-Print) -->
    <div class="no-print flex items-center justify-between pb-4 mb-4 border-b border-stone-200">
      <div>
        <span class="inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100 rounded">
          ${isEn ? "Tier 1 · Devotional Study Sheet" : "類別一 · 靈修查經單張"}
        </span>
        <span class="text-xs text-stone-500 ml-2">${isEn ? "~1-2 pages A4, for personal & small group study" : "約 1~2 頁 A4，適合個人與團契"}</span>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="toggleSaveCurrentSheet()" class="action-btn px-3 py-1.5 text-xs rounded-md border ${isSavedSheet ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold' : 'border-stone-300 text-stone-700 hover:bg-stone-50'} transition-all flex items-center gap-1">
          <span>${isSavedSheet ? (isEn ? '⭐ Saved' : '⭐ 已在背包') : (isEn ? '🎒 Save to Backpack' : '🎒 存入背包')}</span>
        </button>
        <button onclick="triggerPrint()" class="action-btn px-3 py-1.5 text-xs bg-stone-900 text-white rounded-md hover:bg-stone-800 transition-colors flex items-center gap-1 font-medium">
          <span>${isEn ? "🖨️ Print / PDF" : "🖨️ 列印/PDF"}</span>
        </button>
      </div>
    </div>

    <!-- 單張主體內容 -->
    <div class="sheet-body space-y-5">
      <div>
        <h1 class="sheet-title text-xl font-bold text-stone-900">${escapeHtml(data.title)}</h1>
        <h2 class="sheet-subtitle text-sm text-stone-600 mt-0.5">${escapeHtml(data.subtitle)}</h2>
      </div>

      <!-- 章節精華快照 -->
      <div class="snapshot-box p-3.5 bg-stone-50 rounded-lg border-l-4 border-amber-700 text-sm text-stone-700 leading-relaxed">
        <span class="font-bold text-stone-900 block mb-1">${isEn ? "📖 Chapter Snapshot" : "📖 章節核心快照"}</span>
        ${escapeHtml(data.snapshot)}
      </div>

      <!-- 經文分段大綱 -->
      <div class="outline-section">
        <h3 class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">${isEn ? "✦ Passage Outline" : "✦ 經文脈絡分段"}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          ${data.outline.map(item => `
            <div class="p-2.5 bg-white border border-stone-200 rounded-md text-xs leading-relaxed">
              <span class="font-bold text-amber-800 mr-1.5">${escapeHtml(item.verses)}</span>
              <span class="text-stone-700">${escapeHtml(item.theme)}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- 啟發與小組討論題 (4-6題，依經文篇幅動態調配) -->
      <div class="questions-section pt-1">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-stone-500">${isEn ? `✦ Small Group Discussion & Life Questions (${(data.discussionQuestions || []).length} Questions)` : `✦ 小組討論與生活啟發（共 ${(data.discussionQuestions || []).length} 題 · 依經文篇幅動態調配）`}</h3>
          <span class="text-xs text-stone-400 no-print">${isEn ? "Standard Answers in Leader Guide (Tier 2)" : "組長標準參考答案詳見「深度研經行囊」"}</span>
        </div>
        
        <div class="space-y-3">
          ${data.discussionQuestions.map((q, idx) => `
            <div class="question-item p-3.5 bg-white border border-stone-200 rounded-lg">
              <div class="flex items-start justify-between gap-2">
                <div class="question-title text-sm font-semibold text-stone-900 leading-snug">
                  <span class="inline-block text-amber-800 font-bold mr-1">Q${idx + 1}.</span>
                  ${escapeHtml(q.question)}
                </div>
                <span class="no-print flex-shrink-0 px-2 py-0.5 text-xs rounded bg-stone-100 text-stone-600 border border-stone-200">
                  ${escapeHtml(q.tag)}
                </span>
              </div>
              <div class="question-hint text-xs text-stone-500 mt-2 bg-stone-50 p-2 rounded">
                💡 ${escapeHtml(q.hint)}
              </div>
              <!-- 打印時專用的手寫筆記橫線 -->
              <div class="note-lines"></div>
              <div class="note-lines"></div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- 默想總結與禱告 -->
      <div class="takeaway-box p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-sm">
        <div class="takeaway-title font-bold text-amber-950 mb-1">${isEn ? "🕊️ Today's Key Takeaway" : "🕊️ 今日默想結語"}</div>
        <p class="text-amber-900 leading-relaxed mb-3">${escapeHtml(data.takeaway)}</p>
        <div class="pt-2 border-t border-amber-200/80">
          <span class="font-bold text-amber-950 text-xs block mb-1">${isEn ? "🙏 Closing Prayer" : "🙏 總結禱告"}</span>
          <p class="text-xs text-amber-900/90 italic leading-relaxed">${escapeHtml(data.prayer)}</p>
        </div>
      </div>
    </div>
  `;
}

// 智慧解析與兜底聖經考古與出土實物照片庫（100% 本地高清無損與真實出土對應）
const BIBLICAL_ARCHAEOLOGY_POOL = [
  // 1. 迦百農會堂遺址與新約會堂建築
  { keywords: ["capernaum", "迦百農", "會堂", "synagogue", "百夫長", "彼得家"], url: "assets/images/capernaum-synagogue.jpg" },
  // 2. 加利利海古漁船（耶穌船）與古代漁業考證
  { keywords: ["boat", "galilee", "加利利", "船", "漁船", "網", "捕魚", "漁夫", "風浪", "湖"], url: "assets/images/galilee-boat.jpg" },
  // 3. 死海古卷（以賽亞書卷）與古代聖經手抄本
  { keywords: ["scroll", "qumran", "死海", "古卷", "羊皮紙", "手抄", "以賽亞", "詩卷", "經卷"], url: "assets/images/dead-sea-scrolls.jpg" },
  // 4. 聖殿西牆、聖殿山基石與耶路撒冷城防
  { keywords: ["temple", "jerusalem", "western wall", "聖殿", "耶路撒冷", "西牆", "所羅門", "基石", "城門", "廊子"], url: "assets/images/western-wall.jpg" },
  // 5. 希西家王印泥印（LMLK 皇家印璽）
  { keywords: ["hezekiah", "seal", "bulla", "希西家", "王印", "泥印", "印章", "印記", "封泥", "君王"], url: "assets/images/hezekiah-bulla.jpg" },
  // 6. 別是巴四角祭壇與舊約祭祀
  { keywords: ["altar", "beersheba", "祭壇", "角壇", "祭祀", "燔祭", "別是巴", "會幕", "利未"], url: "assets/images/beersheba-altar.jpg" },
  // 7. 但丘大衛家石碑與古代銘文考證
  { keywords: ["stele", "tel dan", "david", "石碑", "銘文", "但城", "但丘", "大衛家", "碑文", "摩押"], url: "assets/images/tel-dan-stele.jpg" },
  // 8. 本丟彼拉多銅幣與古代羅馬錢幣
  { keywords: ["coin", "pilate", "prutah", "錢幣", "彼拉多", "舍客勒", "銀幣", "銅幣", "小錢", "稅", "凱撒"], url: "assets/images/pilate-coin.jpg" },
  // 9. 耶利哥傾塌古城牆與城防考古
  { keywords: ["jericho", "wall", "城牆", "耶利哥", "斷代", "城防", "磚石", "傾塌", "倒塌"], url: "assets/images/jericho-walls.jpg" },
  // 10. 約旦河谷與猶太曠野乾溝地貌
  { keywords: ["jordan", "valley", "river", "約旦", "河谷", "水文", "曠野", "乾溝", "wadi", "幽谷", "地貌", "溪流", "平原"], url: "assets/images/jordan-valley.jpg" },
  // 11. 楔形文字創世泥板與古代律法
  { keywords: ["tablet", "cuneiform", "泥板", "楔形", "巴比倫", "恩奴瑪", "漢摩拉比", "法典", "契約", "文字", "盟約", "創始", "太初"], url: "assets/images/cuneiform-tablet.jpg" }
];

const OT_ARTIFACT_FALLBACKS = [
  "assets/images/dead-sea-scrolls.jpg",
  "assets/images/cuneiform-tablet.jpg",
  "assets/images/tel-dan-stele.jpg",
  "assets/images/hezekiah-bulla.jpg",
  "assets/images/beersheba-altar.jpg",
  "assets/images/western-wall.jpg",
  "assets/images/jericho-walls.jpg",
  "assets/images/jordan-valley.jpg"
];

const NT_ARTIFACT_FALLBACKS = [
  "assets/images/capernaum-synagogue.jpg",
  "assets/images/galilee-boat.jpg",
  "assets/images/pilate-coin.jpg",
  "assets/images/western-wall.jpg",
  "assets/images/dead-sea-scrolls.jpg"
];

function isNewTestamentBook(bookName) {
  if (typeof BIBLE_BOOKS !== "undefined") {
    const found = BIBLE_BOOKS.find(b => b.name === bookName);
    if (found) return found.testament === "NT";
  }
  const ntBooks = ["馬太福音","馬可福音","路加福音","約翰福音","使徒行傳","羅馬書","哥林多前書","哥林多後書","加拉太書","以弗所書","腓立比書","歌羅西書","帖撒羅尼迦前書","帖撒羅尼迦後書","提摩太前書","提摩太後書","提多書","腓利門書","希伯來書","雅各書","彼得前書","彼得後書","約翰一書","約翰二書","約翰三書","猶大書","啟示錄"];
  return ntBooks.includes(bookName);
}

function getArtifactImageSrc(art, index = 0) {
  if (art && art.imageUrl && art.imageUrl.startsWith("assets/images/")) {
    return art.imageUrl;
  }

  const textToMatch = `${art?.title || ""} ${art?.searchQuery || ""} ${art?.description || ""} ${art?.category || ""} ${art?.tag || ""}`.toLowerCase();
  for (const item of BIBLICAL_ARCHAEOLOGY_POOL) {
    if (item.keywords.some(kw => textToMatch.includes(kw.toLowerCase()))) {
      return item.url;
    }
  }

  const pool = isNewTestamentBook(currentBook) ? NT_ARTIFACT_FALLBACKS : OT_ARTIFACT_FALLBACKS;
  return pool[index % pool.length];
}

function handleArtifactImgError(imgEl, index = 0) {
  imgEl.onerror = null;
  const pool = isNewTestamentBook(currentBook) ? NT_ARTIFACT_FALLBACKS : OT_ARTIFACT_FALLBACKS;
  imgEl.src = pool[index % pool.length];
}

// 聖經歷史地理中英智慧對照字典
const BIBLICAL_GEO_DICT = {
  "迦百農": "Capernaum",
  "加利利海": "Sea of Galilee",
  "加利利": "Galilee",
  "耶利哥": "Jericho",
  "耶路撒冷": "Jerusalem",
  "錫安山": "Mount Zion",
  "摩利亞山": "Mount Moriah",
  "橄欖山": "Mount of Olives",
  "客西馬尼": "Gethsemane",
  "伯利恆": "Bethlehem",
  "拿撒勒": "Nazareth",
  "約旦河": "Jordan River",
  "死海": "Dead Sea",
  "猶太曠野": "Judean Wilderness",
  "隱基底": "Ein Gedi",
  "凱爾特旱谷": "Wadi Qelt",
  "什亭": "Shittim",
  "吉甲": "Gilgal",
  "示劍": "Shechem",
  "希伯崙": "Hebron",
  "別是巴": "Beersheba",
  "迦勒底吾珥": "Ur of the Chaldees",
  "吾珥": "Ur",
  "巴比倫": "Babylon",
  "哈蘭": "Haran",
  "西奈山": "Mount Sinai",
  "埃及": "Egypt",
  "紅海": "Red Sea",
  "尼羅河": "Nile River",
  "哥林多": "Corinth",
  "堅革哩": "Cenchreae",
  "亞比烏市集": "Forum of Appius",
  "古羅馬廣場": "Roman Forum",
  "羅馬": "Rome",
  "安提阿": "Antioch",
  "以弗所": "Ephesus",
  "腓立比": "Philippi",
  "帖撒羅尼迦": "Thessalonica",
  "雅典": "Athens",
  "大馬士革": "Damascus",
  "該撒利亞": "Caesarea",
  "約帕": "Joppa"
};

function getBilingualGeoName(name, lang = "zh") {
  if (!name) return lang === "en" ? "Historic Site" : "歷史地點";
  if (lang === "zh") return name;
  for (const [zh, en] of Object.entries(BIBLICAL_GEO_DICT)) {
    if (name.includes(zh)) {
      return en;
    }
  }
  return name;
}

// ================= 動態線上真實考古圖庫即時檢索服務 (Wikipedia PageImages + Wikimedia Commons) =================
const LiveArchaeologyService = {
  cache: {},
  cardCandidates: {}, // 儲存每張卡片的多組候選真品照片，支援用戶一鍵切換檢視

  // 根據文物名稱與描述智慧提取精準英文維基條目關鍵詞與中文條目詞
  deriveSearchQueries(art) {
    const title = art?.title || "";
    let enQuery = (art?.searchQuery || "").trim();

    // 1. 若標題內含括號且為英文（如：但丘大衛家石碑 (Tel Dan Stele)），提取括號內英文
    const enMatch = title.match(/\(([A-Za-z0-9\s,'\-\.]+)\)/);
    if (!enQuery && enMatch && enMatch[1].trim().length > 2) {
      enQuery = enMatch[1].trim();
    }

    // 2. 聖經博物館核心考證實物字典對照
    const termMap = [
      { zh: "迦百農", en: "Capernaum" },
      { zh: "加利利海", en: "Sea of Galilee Boat" },
      { zh: "漁船", en: "Sea of Galilee Boat" },
      { zh: "死海古卷", en: "Dead Sea Scrolls" },
      { zh: "以賽亞卷", en: "Isaiah Scroll" },
      { zh: "古卷", en: "Dead Sea Scrolls" },
      { zh: "希西家", en: "Hezekiah" },
      { zh: "拉吉", en: "Lachish reliefs" },
      { zh: "西羅亞", en: "Siloam inscription" },
      { zh: "畢士大", en: "Pool of Bethesda" },
      { zh: "祭壇", en: "Tel Be'er Sheva" },
      { zh: "別是巴", en: "Tel Be'er Sheva" },
      { zh: "大衛家", en: "Tel Dan stele" },
      { zh: "但丘", en: "Tel Dan stele" },
      { zh: "但城", en: "Tel Dan stele" },
      { zh: "彼拉多", en: "Pilate stone" },
      { zh: "該亞法", en: "Caiaphas ossuary" },
      { zh: "銀卷", en: "Ketef Hinnom scrolls" },
      { zh: "西牆", en: "Western Wall" },
      { zh: "聖殿", en: "Temple Mount" },
      { zh: "馬撒大", en: "Masada" },
      { zh: "客西馬尼", en: "Gethsemane" },
      { zh: "居魯士", en: "Cyrus Cylinder" },
      { zh: "古列", en: "Cyrus Cylinder" },
      { zh: "摩押", en: "Mesha Stele" },
      { zh: "米沙", en: "Mesha Stele" },
      { zh: "黑方尖碑", en: "Black Obelisk of Shalmaneser III" },
      { zh: "麥倫普塔", en: "Merneptah Stele" },
      { zh: "耶利哥", en: "Tell es-Sultan" },
      { zh: "漢摩拉比", en: "Code of Hammurabi" },
      { zh: "創世泥板", en: "Enuma Elish" },
      { zh: "洪水泥板", en: "Gilgamesh flood myth" },
      { zh: "吾珥", en: "Great Ziggurat of Ur" },
      { zh: "巴別", en: "Etemenanki" },
      { zh: "約旦河", en: "Jordan River" },
      { zh: "西奈", en: "Mount Sinai" },
      { zh: "會幕", en: "Tabernacle" },
      { zh: "約櫃", en: "Ark of the Covenant" }
    ];

    if (!enQuery) {
      for (const item of termMap) {
        if (title.includes(item.zh) || (art?.description && art.description.includes(item.zh))) {
          enQuery = item.en;
          break;
        }
      }
    }

    // 提取純中文標題（移除括號）供中文維基百科查詢
    const zhQuery = title.replace(/\([^)]*\)/g, "").replace(/（[^）]*）/g, "").trim();

    return {
      en: enQuery || zhQuery,
      zh: zhQuery
    };
  },

  isValidPhotoUrl(url, title = "") {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    const lowerTitle = title.toLowerCase();
    // 排除地圖、SVG 圖示、旗幟、標誌或無關插圖
    if (lowerUrl.endsWith(".svg") || lowerUrl.includes(".svg.png") || lowerUrl.includes("disallow") || lowerUrl.includes("icon")) return false;
    if (lowerTitle.includes("disambiguation") || lowerTitle.includes("logo") || lowerTitle.includes("flag of")) return false;
    return true;
  },

  async fetchWikipediaCandidates(query, lang = "en") {
    if (!query) return [];
    try {
      const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages|info&inprop=url&pithumbsize=800&format=json&origin=*`;
      const res = await fetch(endpoint);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data?.query?.pages) return [];

      // ★ 關鍵修正：必須依照 MediaWiki 的 index 相關度排序，而非預設的數字 pageid 順序！
      const sortedPages = Object.values(data.query.pages).sort((a, b) => (a.index || 99) - (b.index || 99));
      const results = [];

      for (const p of sortedPages) {
        const thumb = p.thumbnail?.source;
        if (thumb && this.isValidPhotoUrl(thumb, p.title)) {
          results.push({
            title: p.title,
            thumbUrl: thumb,
            originalUrl: thumb.replace(/\/\d+px-/, "/1200px-"),
            pageUrl: p.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
            sourceType: lang === "en" ? "Wikipedia 英文百科核驗" : "Wikipedia 中文百科核驗"
          });
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  },

  async fetchCommonsCandidates(query) {
    if (!query) return [];
    try {
      const q = `filetype:bitmap ${query}`;
      const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
      const res = await fetch(endpoint);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data?.query?.pages) return [];

      // ★ 關鍵修正：嚴格按相關度 index 排序！
      const sortedPages = Object.values(data.query.pages).sort((a, b) => (a.index || 99) - (b.index || 99));
      const results = [];

      for (const p of sortedPages) {
        const t = (p.title || "").toLowerCase();
        if (!(t.endsWith(".jpg") || t.endsWith(".jpeg") || t.endsWith(".png") || t.endsWith(".webp"))) continue;
        if (t.includes("map") || t.includes("diagram") || t.includes("plan") || t.includes("icon") || t.includes("logo")) continue;

        const info = p.imageinfo?.[0];
        if (info && info.thumburl) {
          const cleanTitle = p.title.replace(/^File:/, "").replace(/\.[^.]+$/, "");
          results.push({
            title: cleanTitle,
            thumbUrl: info.thumburl,
            originalUrl: info.url || info.thumburl,
            pageUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
            sourceType: "Wikimedia 博物館圖庫"
          });
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  },

  async fetchCandidatePhotos(art) {
    const queries = this.deriveSearchQueries(art);
    const cacheKey = `arch_v3_${(queries.en + "_" + queries.zh).toLowerCase()}`;

    if (this.cache[cacheKey]) return this.cache[cacheKey];
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cache[cacheKey] = parsed;
          return parsed;
        }
      }
    } catch (e) {}

    // 並行檢索：1. 英文維基百科標準條目圖（最權威） 2. 中文維基百科條目圖 3. 維基共享博物館圖庫
    const [enWiki, zhWiki, commons] = await Promise.all([
      this.fetchWikipediaCandidates(queries.en, "en"),
      queries.zh ? this.fetchWikipediaCandidates(queries.zh, "zh") : Promise.resolve([]),
      this.fetchCommonsCandidates(queries.en)
    ]);

    // 合併並去重（優先採用 Wikipedia 百科人工審核之首圖）
    const combined = [...enWiki, ...zhWiki, ...commons];
    const seenUrls = new Set();
    const uniqueCandidates = [];

    for (const item of combined) {
      // 以檔名核心部分去重
      const fileKey = item.thumbUrl.split("/").pop().replace(/^\d+px-/, "");
      if (!seenUrls.has(fileKey)) {
        seenUrls.add(fileKey);
        uniqueCandidates.push(item);
      }
      if (uniqueCandidates.length >= 5) break;
    }

    if (uniqueCandidates.length > 0) {
      this.cache[cacheKey] = uniqueCandidates;
      try { sessionStorage.setItem(cacheKey, JSON.stringify(uniqueCandidates)); } catch (e) {}
    }
    return uniqueCandidates;
  }
};

// 異步即時加載維基百科與博物館考證相片（支援多圖切換與百科條目名透明核驗）
function hydrateLiveArtifactImages(artifacts) {
  if (!artifacts || !artifacts.length) return;
  LiveArchaeologyService.cardCandidates = {};

  artifacts.forEach(async (art, idx) => {
    const imgEl = document.getElementById(`artifact-img-${idx}`);
    if (!imgEl) return;

    const candidates = await LiveArchaeologyService.fetchCandidatePhotos(art);
    if (candidates && candidates.length > 0) {
      LiveArchaeologyService.cardCandidates[idx] = {
        list: candidates,
        currentIndex: 0
      };
      applyArtifactCandidatePhoto(idx, 0);
    }
  });
}

function applyArtifactCandidatePhoto(idx, candidateIndex) {
  const entry = LiveArchaeologyService.cardCandidates[idx];
  if (!entry || !entry.list || !entry.list.length) return;

  const total = entry.list.length;
  const safeIdx = ((candidateIndex % total) + total) % total;
  entry.currentIndex = safeIdx;
  const photo = entry.list[safeIdx];

  const imgEl = document.getElementById(`artifact-img-${idx}`);
  if (!imgEl || !photo?.thumbUrl) return;

  const liveImg = new Image();
  liveImg.onload = () => {
    imgEl.src = photo.thumbUrl;
    imgEl.dataset.originalSrc = photo.originalUrl || photo.thumbUrl;
    imgEl.dataset.pageUrl = photo.pageUrl;
    imgEl.dataset.liveTitle = photo.title;

    const tagEl = document.getElementById(`artifact-source-tag-${idx}`);
    if (tagEl) {
      tagEl.classList.remove("hidden");
      tagEl.innerHTML = `<span>🏛️</span><span>${escapeHtml(photo.sourceType || "百科考證真跡")}</span>`;
    }

    const verifyBar = document.getElementById(`artifact-verify-bar-${idx}`);
    if (verifyBar) {
      verifyBar.classList.remove("hidden");
    }

    const matchedTitleEl = document.getElementById(`artifact-matched-wiki-${idx}`);
    if (matchedTitleEl) {
      matchedTitleEl.textContent = `📖 對應百科條目：${photo.title}`;
      matchedTitleEl.title = photo.title;
    }

    const cycleBtn = document.getElementById(`artifact-cycle-btn-${idx}`);
    if (cycleBtn) {
      if (total > 1) {
        cycleBtn.classList.remove("hidden");
        cycleBtn.textContent = `🔄 換圖 (${safeIdx + 1}/${total})`;
      } else {
        cycleBtn.classList.add("hidden");
      }
    }

    const linkEl = document.getElementById(`artifact-source-link-${idx}`);
    if (linkEl && photo.pageUrl) {
      linkEl.href = photo.pageUrl;
      linkEl.title = `前往維基百科核驗此實物條目：${photo.title}`;
      linkEl.innerHTML = `<span>🏛️ 查閱百科 ↗</span>`;
    }
  };
  liveImg.src = photo.thumbUrl;
}

function cycleArtifactPhoto(idx, event) {
  if (event) event.stopPropagation();
  const entry = LiveArchaeologyService.cardCandidates[idx];
  if (!entry || !entry.list || entry.list.length <= 1) return;
  applyArtifactCandidatePhoto(idx, entry.currentIndex + 1);
}

function openArtifactZoomModal(idx) {
  const imgEl = document.getElementById(`artifact-img-${idx}`);
  const titleEl = document.getElementById(`artifact-title-${idx}`);
  const descEl = document.getElementById(`artifact-desc-${idx}`);

  const activeSrc = imgEl ? (imgEl.dataset.originalSrc || imgEl.src) : "";
  const wikiTitle = imgEl?.dataset?.liveTitle ? `（維基百科條目：${imgEl.dataset.liveTitle}）` : "";
  const title = (titleEl ? titleEl.textContent : "考古實物詳情") + " " + wikiTitle;
  const desc = descEl ? descEl.textContent : "";
  const pageUrl = imgEl ? imgEl.dataset.pageUrl : null;

  openImageModal(activeSrc, title, desc, pageUrl);
}

// 過濾並驗證確鑿的聖經地理座標點（排除無效經緯度、0,0 或標明位置不確定之推測點）
function getValidRoutePoints(points) {
  if (!Array.isArray(points)) return [];
  const uncertainKeywords = ["位置不確定", "地點不確定", "位置不明", "無特定地點", "無法確定", "不詳", "unknown", "uncertain"];
  return points.filter(p => {
    if (!p) return false;
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1) return false;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
    const combinedText = `${p.name || ""} ${p.nameEn || ""} ${p.desc || ""}`.toLowerCase();
    if (uncertainKeywords.some(kw => combinedText.includes(kw))) return false;
    return true;
  });
}

// 判斷本章是否為「實際行軍、出埃及遷徙或宣教旅程動線」（只有動線才畫連線與顯示行軍模擬）
function isChapterJourneyRoute(geography, bookName = currentBook, chapter = currentChapter) {
  const validPts = getValidRoutePoints(geography?.routePoints);
  if (validPts.length < 2) return false;
  if (typeof geography?.isJourneyRoute === "boolean") {
    return geography.isJourneyRoute;
  }
  // 針對舊快取資料的智慧判斷：詩篇、箴言、書信、創世記創造篇等絕非行軍路線
  const nonJourneyBooks = ["詩篇", "箴言", "傳道書", "雅歌", "約伯記", "羅馬書", "哥林多前書", "哥林多後書", "加拉太書", "以弗所書", "腓立比書", "歌羅西書", "帖撒羅尼迦前書", "帖撒羅尼迦後書", "提摩太前書", "提摩太後書", "提多書", "腓利門書", "希伯來書", "雅各書", "彼得前書", "彼得後書", "約翰一書", "約翰二書", "約翰三書", "猶大書"];
  if (nonJourneyBooks.includes(bookName)) return false;
  if (bookName === "創世記" && chapter <= 11) return false;

  const geoText = `${geography?.location || ""} ${geography?.terrain || ""} ${geography?.hydrologyInsight || ""}`;
  return /行軍|拔營|渡河|遷徙|出埃及|宣教旅程|行程路線/.test(geoText);
}

// 渲染類別二：深度研經行囊 (Dossier，組長備課與深度鑽研)
function renderTier2Dossier(container) {
  const data = activeStudyData?.tier2_dossier;
  if (!data) {
    renderEmptyChapterPrompt(currentBook, currentChapter, "tier2");
    return;
  }

  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const validPoints = getValidRoutePoints(data.geography?.routePoints);
  const isJourney = isChapterJourneyRoute(data.geography, activeStudyData?.bookName || currentBook, activeStudyData?.chapter || currentChapter);
  const rawBook = activeStudyData?.bookName || currentBook;
  const bookName = typeof I18n !== "undefined" ? I18n.getBookName(rawBook) : rawBook;
  const chapNum = activeStudyData?.chapter || currentChapter;

  container.innerHTML = `
    <!-- 打印抬頭（平時隱藏，打印時自動顯示） -->
    <div class="print-header">
      <div class="print-brand">
        <span>${isEn ? "🎒 Bible Backpack · In-Depth Dossier (Leader Guide)" : "🎒 Bible Backpack · 深度研經行囊 (組長手冊)"}</span>
        <span style="font-weight: normal; font-size: 10pt;">${isEn ? `Passage: ${bookName} Ch. ${chapNum}` : `經文：${bookName} 第 ${chapNum} 章`}</span>
      </div>
      <div class="print-meta">
        <span>${isEn ? "Name / Group: ____________________" : "姓名/組別：____________________"}</span>
        <span>${isEn ? "Date: " : "日期："}${new Date().toLocaleDateString()}</span>
      </div>
    </div>

    <!-- 屏幕頂部操作欄 -->
    <div class="no-print flex items-center justify-between pb-4 mb-4 border-b border-stone-200">
      <div>
        <span class="inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-purple-900 bg-purple-100 rounded">
          ${isEn ? "Tier 2 · In-Depth Dossier (Leader Guide)" : "類別二 · 深度研經行囊 (Dossier)"}
        </span>
        <span class="text-xs text-stone-500 ml-2">${isEn ? "Leader Prep × Deep Theological Exploration" : "小組長備課 × 個人深入鑽研"}</span>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="triggerPrint()" class="action-btn px-3 py-1.5 text-xs bg-stone-900 text-white rounded-md hover:bg-stone-800 transition-colors flex items-center gap-1 font-medium">
          <span>${isEn ? "🖨️ Print Leader Dossier" : "🖨️ 列印深度行囊"}</span>
        </button>
      </div>
    </div>

    <div class="dossier-body space-y-6">
      <div>
        <h1 class="sheet-title text-xl font-bold text-stone-900">${escapeHtml(data.title)}</h1>
        <h2 class="sheet-subtitle text-sm text-stone-600 mt-0.5">${escapeHtml(data.subtitle)}</h2>
      </div>

      <!-- 模組 1: 人物深度檔案 -->
      <div class="dossier-card bg-white border border-stone-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
          <h3 class="font-bold text-stone-900 text-sm flex items-center gap-1.5">
            <span>👤</span>
            <span>${isEn ? "Character Dossier" : "人物深度檔案 (Character Dossier)"}</span>
          </h3>
          <button onclick="saveCardToBackpack('人物檔案', '${data.characters[0]?.name}')" class="text-xs text-amber-700 hover:underline">
            ${isEn ? "+ Save to Backpack" : "+ 存入背包"}
          </button>
        </div>
        <div class="space-y-3">
          ${data.characters.map(char => `
            <div class="p-3 bg-stone-50 rounded-md">
              <div class="flex items-baseline justify-between mb-1">
                <span class="font-bold text-stone-900 text-sm">${escapeHtml(char.name)}</span>
                <span class="text-xs text-stone-500">${escapeHtml(char.title)}</span>
              </div>
              <p class="text-xs text-stone-700 leading-relaxed mb-2">${escapeHtml(char.profile)}</p>
              ${char.psychologicalInsight ? `
                <div class="text-xs bg-purple-50 p-2 rounded text-purple-900 border border-purple-100 leading-relaxed">
                  ${escapeHtml(char.psychologicalInsight)}
                </div>
              ` : ''}
            </div>
          `).join("")}
        </div>
      </div>

      <!-- 模組 2: 地理、地貌與水文環境（依章節性質智慧切換：行軍路線連線 vs 歷史地標定點考證） -->
      <div class="dossier-card bg-white border border-stone-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
          <h3 class="font-bold text-stone-900 text-sm flex items-center gap-1.5">
            <span>🗺️</span>
            <span>${isJourney ? (isEn ? 'Geography & Route Simulation' : '地理水文與行軍路線 (Geography & Route Simulation)') : (isEn ? 'Historical Geography & Context' : '聖經歷史地理與水文環境 (Historical Geography & Context)')}</span>
          </h3>
          <div class="flex items-center gap-2">
            ${data.geography?.googleMapsUrl ? `
              <a href="${data.geography.googleMapsUrl}" target="_blank" class="text-xs text-blue-700 hover:underline flex items-center gap-1 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <span>${isEn ? "🌐 Google Maps Route" : "🌐 Google Maps 路線"}</span>
              </a>
            ` : ''}
            <button onclick="saveCardToBackpack('地理水文', '${data.geography?.location}')" class="text-xs text-amber-700 hover:underline">
              ${isEn ? "+ Save to Backpack" : "+ 存入背包"}
            </button>
          </div>
        </div>

        <div class="text-xs space-y-2.5">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-stone-800">${isEn ? "Key Location: " : "關鍵地點："}</span>
            <span class="text-stone-700 bg-stone-100 px-2 py-0.5 rounded font-mono">${escapeHtml(data.geography.location)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-stone-800">${isEn ? "Terrain: " : "地形特徵："}</span>
            <span class="text-stone-600">${escapeHtml(data.geography.terrain)}</span>
          </div>
          
          <div class="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-blue-950 leading-relaxed whitespace-pre-line">
            ${escapeHtml(data.geography.hydrologyInsight)}
          </div>

          ${validPoints.length > 0 ? `
            <!-- 地圖互動控制欄（支援中英文切換與衛星圖層） -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <span class="text-xs font-bold text-stone-700 flex items-center gap-1">
                <span>📍</span>
                <span id="map-heading-label">${isJourney ? (isEn ? `${bookName} Ch. ${chapNum} · March Route Map` : `《${escapeHtml(bookName)}》第 ${chapNum} 章 · 行軍與遷徙路線圖`) : (isEn ? `${bookName} Ch. ${chapNum} · Biblical Landmark Map` : `《${escapeHtml(bookName)}》第 ${chapNum} 章 · 聖經歷史地標考證圖（非行軍連線）`)}</span>
              </span>
              <div class="flex items-center gap-1.5 flex-wrap">
                <!-- 地圖文字語言切換 (Chinese / English) -->
                <div class="bg-stone-100 p-0.5 rounded-lg border border-stone-200 flex items-center text-2xs">
                  <button id="map-lang-zh" onclick="setMapLanguage('zh')" class="px-2 py-0.5 rounded font-bold bg-white text-stone-900 shadow-xs">中文標籤</button>
                  <button id="map-lang-en" onclick="setMapLanguage('en')" class="px-2 py-0.5 rounded text-stone-500 hover:text-stone-800">English</button>
                </div>
                <!-- 地圖底圖樣式 (Clear Base vs Satellite) -->
                <div class="bg-stone-100 p-0.5 rounded-lg border border-stone-200 flex items-center text-2xs">
                  <button id="map-type-voyager" onclick="setMapType('voyager')" class="px-2 py-0.5 rounded font-bold bg-white text-stone-900 shadow-xs">${isEn ? "Terrain" : "清晰地圖"}</button>
                  <button id="map-type-satellite" onclick="setMapType('satellite')" class="px-2 py-0.5 rounded text-stone-500 hover:text-stone-800">${isEn ? "🛰️ Satellite" : "🛰️ 衛星"}</button>
                </div>
                ${isJourney ? `
                  <button onclick="simulateMarchRoute()" class="px-2.5 py-1 text-2xs bg-amber-800 text-white rounded-md hover:bg-amber-900 font-medium transition-colors flex items-center gap-1 shadow-sm">
                    <span>${isEn ? "▶ Simulate March" : "▶ 模擬行徑"}</span>
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Leaflet 互動地圖容器 -->
            <div id="joshua-route-map" class="h-64 sm:h-72 w-full rounded-xl border border-stone-200 relative overflow-hidden shadow-sm" style="z-index: 1;"></div>

            <!-- 地理考證節點卡片 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2" id="route-step-cards-container">
              ${validPoints.map((pt, idx) => {
                const stepNum = pt.step || (idx + 1);
                const ptName = currentMapLang === 'en' ? (pt.nameEn || getBilingualGeoName(pt.name, 'en')) : pt.name;
                const ptDesc = currentMapLang === 'en' ? (pt.descEn || pt.desc) : pt.desc;
                return `
                <div onclick="flyToStepMarker(${idx})" class="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition-all">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-stone-900 flex items-center gap-1.5">
                      <span class="w-4 h-4 rounded-full ${isJourney ? 'bg-amber-800 text-white' : 'bg-stone-200 text-stone-700'} text-2xs inline-flex items-center justify-center font-bold">${isJourney ? stepNum : '📍'}</span>
                      <span class="step-card-name">${escapeHtml(ptName)}</span>
                    </span>
                    ${pt.elevation ? `<span class="text-2xs text-stone-500 font-mono">${escapeHtml(pt.elevation)}</span>` : ''}
                  </div>
                  <p class="text-2xs text-stone-600 leading-relaxed step-card-desc">${escapeHtml(ptDesc || '')}</p>
                </div>
                `;
              }).join("")}
            </div>
          ` : `
            <div class="p-3 bg-stone-50 border border-stone-200 rounded-lg text-2xs text-stone-500 flex items-center gap-2">
              <span>🧭</span>
              <span>${isEn ? "This chapter focuses on spiritual reflections or theological discourse. To preserve strict biblical integrity, speculative landmarks are not mapped." : "本章屬心靈默想、教義論述或無特定剛性地理座標，為持守嚴謹考證原則，不強行標註推測性地標。"}</span>
            </div>
          `}
        </div>
      </div>

      <!-- 模組 3: 歷史背景與古代近東考古（附帶真實出土實物與考古影像展示） -->
      <div class="dossier-card bg-white border border-stone-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
          <h3 class="font-bold text-stone-900 text-sm flex items-center gap-1.5">
            <span>🏺</span>
            <span>${isEn ? "History & Archaeology" : "歷史年代與考古考證 (History & Archaeology)"}</span>
          </h3>
          <button onclick="saveCardToBackpack('歷史考證', '${data.archaeology?.era}')" class="text-xs text-amber-700 hover:underline">
            ${isEn ? "+ Save to Backpack" : "+ 存入背包"}
          </button>
        </div>

        <div class="text-xs space-y-3 leading-relaxed">
          <div>
            <span class="font-semibold text-stone-800">${isEn ? "Historical Era: " : "歷史年代："}</span>
            <span class="text-stone-600 font-medium">${escapeHtml(data.archaeology.era)}</span>
          </div>
          <div>
            <span class="font-semibold text-stone-800">${isEn ? "Geopolitical Context: " : "地緣形勢："}</span>
            <span class="text-stone-600">${escapeHtml(data.archaeology.canaaniteContext)}</span>
          </div>
          <div class="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-950 whitespace-pre-line">
            ${escapeHtml(data.archaeology.treatyStructure)}
          </div>

          <!-- 考古與實物真實圖片/圖解展示區 -->
          ${data.archaeology.visualArtifacts ? `
            <div class="pt-2">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-stone-700">${isEn ? "✦ Visual Evidence & Artifacts" : "✦ 出土實物與考古圖解 (Visual Evidence)"}</span>
                <span class="text-2xs text-stone-400">${isEn ? "Click image to inspect" : "點擊圖片可放大細看"}</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                ${data.archaeology.visualArtifacts.map((art, idx) => {
                  const fallbackSrc = getArtifactImageSrc(art, idx);
                  return `
                  <div class="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between hover:border-amber-400 transition-all shadow-2xs group">
                    <div>
                      <!-- 出土實物/地質實景真實相片容器 -->
                      <div class="relative overflow-hidden rounded-lg mb-2.5 bg-stone-200 aspect-video cursor-pointer border border-stone-200/80" onclick="openArtifactZoomModal(${idx})">
                        <img id="artifact-img-${idx}" src="${fallbackSrc}" alt="${escapeHtml(art.title)}" onerror="handleArtifactImgError(this, ${idx})" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">
                        <div class="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors"></div>
                        <span class="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-2xs px-1.5 py-0.5 rounded flex items-center gap-0.5">${isEn ? "🔍 Inspect" : "🔍 放大檢視"}</span>
                        <span id="artifact-source-tag-${idx}" class="hidden absolute top-1 left-1 bg-emerald-800/90 backdrop-blur-xs text-white text-2xs px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 font-sans">
                          <span>🏛️</span>
                          <span>${isEn ? "Verified Artifact" : "百科考證真跡"}</span>
                        </span>
                      </div>

                      <!-- 維基百科條目核驗與多角度換圖列 -->
                      <div id="artifact-verify-bar-${idx}" class="hidden mb-2 px-2 py-1 bg-emerald-50/80 border border-emerald-200/80 rounded-md flex items-center justify-between gap-1">
                        <span id="artifact-matched-wiki-${idx}" class="text-2xs text-emerald-900 font-medium truncate">📖 ${isEn ? "Wikipedia Match" : "對應百科條目"}</span>
                        <button type="button" id="artifact-cycle-btn-${idx}" onclick="cycleArtifactPhoto(${idx}, event)" class="hidden text-2xs bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded whitespace-nowrap font-medium cursor-pointer transition-colors">
                          ${isEn ? "🔄 Switch" : "🔄 換圖"}
                        </button>
                      </div>

                      <div class="flex items-center justify-between mb-1.5">
                        <span class="text-2xs font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">${escapeHtml(art.imageBadge || (isEn ? '📜 Historical Text' : '📜 歷史文獻考證'))}</span>
                        <a id="artifact-source-link-${idx}" href="javascript:void(0)" target="_blank" class="text-2xs text-stone-500 hover:text-amber-800 underline font-mono flex items-center gap-0.5">
                          <span>${escapeHtml(art.tag || 'Archaeology')}</span>
                        </a>
                      </div>
                      <div class="font-bold text-stone-900 text-xs mb-1" id="artifact-title-${idx}">${escapeHtml(art.title)}</div>
                      <p class="text-2xs text-stone-600 leading-relaxed" id="artifact-desc-${idx}">${escapeHtml(art.description)}</p>
                    </div>
                  </div>
                `}).join("")}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 模組 4: 經文疑難與神學解答 -->
      <div class="dossier-card bg-white border border-stone-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
          <h3 class="font-bold text-stone-900 text-sm flex items-center gap-1.5">
            <span>🔍</span>
            <span>${isEn ? "Difficult Passages Q&A" : "經文疑難解答 (Difficult Passages Q&A)"}</span>
          </h3>
          <span class="text-xs text-stone-400">${isEn ? "Orthodox Hermeneutics" : "正統釋經守則"}</span>
        </div>
        <div class="space-y-3">
          ${data.difficulties.map(diff => `
            <div class="p-3 bg-stone-50 rounded-md text-xs">
              <div class="font-bold text-stone-900 mb-1">❓ ${escapeHtml(diff.question)}</div>
              <div class="text-stone-700 leading-relaxed pl-3 border-l-2 border-stone-300">
                ${escapeHtml(diff.answer)}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- 模組 5: 小組長備課與帶領指南（含查經問題標準參考答案） -->
      <div class="dossier-card bg-white border border-stone-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
          <h3 class="font-bold text-stone-900 text-sm flex items-center gap-1.5">
            <span>🎓</span>
            <span>${isEn ? "Leader's Facilitation Guide & Standard Answers" : "小組長備課手冊與查經標準答案 (Leader's Guide & Answer Key)"}</span>
          </h3>
          <span class="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded">${isEn ? "Leader Only" : "導師專用"}</span>
        </div>
        <div class="text-xs space-y-3 leading-relaxed">
          <div class="p-2.5 bg-emerald-50/50 rounded border border-emerald-100 text-emerald-950">
            <span class="font-bold text-emerald-900 block mb-0.5">${isEn ? "🧊 Group Icebreaker:" : "🧊 小組破冰提問："}</span>
            ${escapeHtml(data.leaderGuide.icebreaker)}
          </div>
          <div class="p-2.5 bg-stone-50 rounded text-stone-700 border border-stone-200/60">
            <span class="font-bold text-stone-900 block mb-0.5">${isEn ? "🧭 Pacing & Facilitation Mindset:" : "🧭 帶領節奏與牧養心態："}</span>
            ${escapeHtml(data.leaderGuide.flowTips)}
          </div>
          <div class="text-stone-500 pt-0.5 pb-1">
            ⏱️ <span class="font-medium text-stone-700">${isEn ? "Suggested Time Budget: " : "時間規劃建議："}</span> ${escapeHtml(data.leaderGuide.timeBudget)}
          </div>

          ${(activeStudyData?.tier1_sheet?.discussionQuestions && activeStudyData.tier1_sheet.discussionQuestions.length > 0) ? `
            <div class="pt-3 border-t border-stone-200 space-y-2.5">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>📋</span>
                  <span>${isEn ? `Discussion Questions · Model Answers & Leader Key (${activeStudyData.tier1_sheet.discussionQuestions.length} Questions)` : `查經討論題 · 組長標準參考答案與歸納要點（共 ${activeStudyData.tier1_sheet.discussionQuestions.length} 題）`}</span>
                </h4>
                <span class="text-2xs text-stone-400 no-print">${isEn ? "Synced with Tier 1 Study Sheet" : "與靈修查經單張題目同步"}</span>
              </div>
              <div class="space-y-3">
                ${activeStudyData.tier1_sheet.discussionQuestions.map((q, idx) => `
                  <div class="p-3 bg-stone-50/90 border border-stone-200 rounded-lg space-y-2">
                    <div class="flex items-start justify-between gap-2">
                      <div class="font-bold text-stone-900 text-xs sm:text-sm leading-snug">
                        <span class="text-amber-800 mr-1">Q${idx + 1}.</span>${escapeHtml(q.question)}
                      </div>
                      ${q.tag ? `<span class="flex-shrink-0 px-2 py-0.5 text-2xs rounded bg-white text-stone-600 border border-stone-200 font-medium">${escapeHtml(q.tag)}</span>` : ''}
                    </div>
                    <div class="p-2.5 bg-emerald-50/80 border-l-3 border-emerald-600 rounded-r text-emerald-950 text-xs leading-relaxed">
                      <span class="font-bold text-emerald-900 block mb-0.5">${isEn ? "✅ Standard Reference Answer & Key Synthesis:" : "✅ 標準參考答案與總結要點："}</span>
                      ${escapeHtml(q.answer || q.leaderAnswer || q.hint || '')}
                    </div>
                    ${(q.answer && q.hint && q.answer !== q.hint) ? `
                      <div class="text-2xs text-stone-500 pl-1">
                        <strong class="text-stone-600">${isEn ? "💡 Facilitation Prompt: " : "💡 組員引導提示："}</strong>${escapeHtml(q.hint)}
                      </div>
                    ` : ''}
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  if (data.archaeology?.visualArtifacts?.length) {
    setTimeout(() => {
      hydrateLiveArtifactImages(data.archaeology.visualArtifacts);
    }, 60);
  }
}

// 切換 Tier 標籤
function switchTier(tier) {
  currentActiveTier = tier;

  const btnTier1 = document.getElementById("tab-tier1");
  const btnTier2 = document.getElementById("tab-tier2");

  if (tier === "tier1") {
    btnTier1?.classList.add("tab-active");
    btnTier2?.classList.remove("tab-active");
  } else {
    btnTier2?.classList.add("tab-active");
    btnTier1?.classList.remove("tab-active");
  }

  renderActiveTierContent();
}

// 收藏整個單張
function toggleSaveCurrentSheet() {
  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const bName = typeof I18n !== "undefined" ? I18n.getBookName(activeStudyData.bookName) : activeStudyData.bookName;
  const item = {
    id: `sheet-${activeStudyData.bookId}-${activeStudyData.chapter}`,
    type: "靈修單張",
    title: isEn ? `${bName} Ch. ${activeStudyData.chapter} Study Sheet` : `${activeStudyData.bookName} 第 ${activeStudyData.chapter} 章 單張`,
    desc: activeStudyData.tier1_sheet.subtitle
  };

  const added = BackpackStore.toggleSaveItem(item);
  renderActiveTierContent();
  updateBackpackBadge();
  showToast(added ? (isEn ? "Saved to your Backpack!" : "已成功存入您的背包！") : (isEn ? "Removed from Backpack" : "已從背包中移除"));
}

// 收藏特定卡片到背包
function saveCardToBackpack(type, title) {
  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const bName = typeof I18n !== "undefined" ? I18n.getBookName(activeStudyData.bookName) : activeStudyData.bookName;
  const item = {
    id: `card-${Date.now()}`,
    type,
    title: `${bName} · ${title}`,
    desc: isEn ? `${bName} Chapter ${activeStudyData.chapter}` : `${activeStudyData.bookName} 第 ${activeStudyData.chapter} 章`
  };
  BackpackStore.toggleSaveItem(item);
  updateBackpackBadge();
  showToast(isEn ? `Saved to your Backpack!` : `已收藏【${type}】到背包！`);
}

function updateBackpackBadge() {
  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const items = BackpackStore.getSavedItems();
  const badge = document.getElementById("backpack-count-badge");
  const navCount = document.getElementById("nav-backpack-count");
  const hubTotal = document.getElementById("hub-total-badge");

  if (badge) {
    badge.textContent = items.length;
    badge.style.display = items.length > 0 ? "inline-flex" : "none";
  }
  if (navCount) {
    navCount.textContent = items.length;
  }
  if (hubTotal) {
    hubTotal.textContent = isEn ? `${items.length} items` : `${items.length} 個項目`;
  }
}

// 觸發列印
function triggerPrint() {
  window.print();
}

// 書卷選擇器渲染（支援雙語）
function renderBookSelector() {
  const select = document.getElementById("book-selector-select");
  if (!select || typeof BIBLE_BOOKS === "undefined") return;

  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const sectionEnMap = {
    "摩西五經": "Pentateuch (Law)",
    "歷史書": "Historical Books",
    "詩歌智慧書": "Poetry & Wisdom",
    "大先知書": "Major Prophets",
    "小先知書": "Minor Prophets",
    "四福音與使徒行傳": "Gospels & Acts",
    "福音書": "Gospels",
    "歷史": "History (Acts)",
    "保羅書信": "Pauline Epistles",
    "普通書信": "General Epistles",
    "普通書信與啟示錄": "General Epistles & Revelation",
    "預言書": "Prophecy (Revelation)"
  };

  let html = "";
  let currentSec = "";

  BIBLE_BOOKS.forEach(book => {
    if (book.section !== currentSec) {
      if (currentSec !== "") html += `</optgroup>`;
      currentSec = book.section;
      const enSec = sectionEnMap[currentSec] || currentSec;
      const secLabel = isEn 
        ? `${book.testament === 'OT' ? 'Old Testament' : 'New Testament'} · ${enSec}` 
        : `${book.testament === 'OT' ? '舊約' : '新約'} · ${currentSec}`;
      html += `<optgroup label="—— ${secLabel} ——">`;
    }
    const selected = book.name === currentBook ? "selected" : "";
    const bName = isEn ? book.english : book.name;
    const chapSuffix = isEn ? `(${book.chapters} ch)` : `(${book.chapters}章)`;
    html += `<option value="${book.name}" ${selected}>${bName} ${chapSuffix}</option>`;
  });
  html += `</optgroup>`;

  select.innerHTML = html;
}

let pendingGenerationBook = null;

// 渲染章節網格下拉選單 (Grid Dropdown)
function renderChapterDropdown() {
  const menu = document.getElementById("chapter-dropdown-menu");
  if (!menu) return;

  const bookMeta = typeof BIBLE_BOOKS !== "undefined" ? BIBLE_BOOKS.find(b => b.name === currentBook) : null;
  const maxChapters = bookMeta ? bookMeta.chapters : 50;

  let html = "";
  for (let i = 1; i <= maxChapters; i++) {
    const isActive = i === currentChapter;
    html += `
      <button type="button" onclick="selectChapterFromDropdown(${i})" data-chap="${i}" class="py-1.5 px-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
        isActive
          ? "bg-amber-800 text-white shadow-xs"
          : "bg-stone-50 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200/70"
      }">
        ${i}
      </button>
    `;
  }
  menu.innerHTML = html;
}

// 展開 / 收合章節下拉選單
function toggleChapterDropdown(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById("chapter-dropdown-menu");
  if (!menu) return;

  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    renderChapterDropdown();
    menu.classList.remove("hidden");
    // 自動滾動至當前章節按鈕
    setTimeout(() => {
      const activeBtn = menu.querySelector(`button[data-chap="${currentChapter}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: "nearest" });
      }
    }, 20);
  } else {
    menu.classList.add("hidden");
  }
}

// 從章節下拉選單點選章節
function selectChapterFromDropdown(chap) {
  currentChapter = parseInt(chap) || 1;
  const chapInput = document.getElementById("chapter-selector-input");
  if (chapInput) chapInput.value = currentChapter;
  const menu = document.getElementById("chapter-dropdown-menu");
  menu?.classList.add("hidden");
  handleBookOrChapterChange(false);
}

// 設置各項監聽器
function setupEventListeners() {
  // 書卷更換
  const bookSelect = document.getElementById("book-selector-select");
  bookSelect?.addEventListener("change", (e) => {
    currentBook = e.target.value;
    currentChapter = 1;
    const chapInput = document.getElementById("chapter-selector-input");
    if (chapInput) chapInput.value = 1;
    document.getElementById("chapter-dropdown-menu")?.classList.add("hidden");
    handleBookOrChapterChange(false);
  });

  // 章節輸入框：支援點擊全選直接輸入數字、按 Enter 立即跳轉、超出範圍自動校正
  const chapInput = document.getElementById("chapter-selector-input");
  if (chapInput) {
    chapInput.addEventListener("focus", (e) => {
      e.target.select();
    });

    chapInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.target.blur();
      } else if (e.key === "Escape") {
        document.getElementById("chapter-dropdown-menu")?.classList.add("hidden");
        e.target.blur();
      }
    });

    chapInput.addEventListener("change", (e) => {
      const bookMeta = typeof BIBLE_BOOKS !== "undefined" ? BIBLE_BOOKS.find(b => b.name === currentBook) : null;
      const maxChap = bookMeta ? bookMeta.chapters : 150;
      let val = parseInt(String(e.target.value).replace(/[^\d]/g, ""), 10);
      if (!val || val < 1) val = 1;
      if (val > maxChap) val = maxChap;
      currentChapter = val;
      e.target.value = val;
      document.getElementById("chapter-dropdown-menu")?.classList.add("hidden");
      handleBookOrChapterChange(false);
    });
  }

  // 點擊外部自動關閉章節下拉選單
  document.addEventListener("click", (e) => {
    const wrapper = document.getElementById("chapter-combo-wrapper");
    const menu = document.getElementById("chapter-dropdown-menu");
    if (menu && !menu.classList.contains("hidden") && wrapper && !wrapper.contains(e.target)) {
      menu.classList.add("hidden");
    }
  });
}

function handleBookOrChapterChange(forceRegenerate = false, isInitialLoad = false) {
  // 若切換了與當前主題課堂不同的書卷或章節，自動退出主題模式
  if (activeCurriculumContext && (activeCurriculumContext.bookName !== currentBook || activeCurriculumContext.chapter !== currentChapter)) {
    activeCurriculumContext = null;
  }
  renderCurriculumBanner();

  // 更新章節選擇器上限與合法範圍
  const bookMeta = typeof BIBLE_BOOKS !== "undefined" ? BIBLE_BOOKS.find(b => b.name === currentBook) : null;
  const chapInput = document.getElementById("chapter-selector-input");
  if (bookMeta) {
    if (currentChapter < 1) currentChapter = 1;
    if (currentChapter > bookMeta.chapters) {
      currentChapter = bookMeta.chapters;
    }
    if (chapInput) {
      chapInput.max = bookMeta.chapters;
      chapInput.value = currentChapter;
    }
  }

  // 同步更新頂部書卷選單與章節下拉面板
  const bookSelect = document.getElementById("book-selector-select");
  if (bookSelect && bookSelect.value !== currentBook) {
    bookSelect.value = currentBook;
  }
  renderChapterDropdown();

  // ★ 記憶用戶最後一次打開的書卷與章節 (Last Open)
  BackpackStore.setLastLocation(currentBook, currentChapter);

  // ★ 關鍵：無論如何立即依本地全本聖經庫渲染左側經文，實現 0 毫秒極速閱讀跳轉！
  renderScripture();

  const lang = typeof BackpackStore !== "undefined" ? BackpackStore.getLanguage() : "zh";
  const version = typeof BackpackStore !== "undefined" ? BackpackStore.getBibleVersion() : "cuv";

  // 1. 若非處於主題課程模式，優先檢查是否命中預載經典包 (僅在非英文時啟用；用戶明確要求英文版本不用預載包，現場調配)
  if (!activeCurriculumContext && lang !== "en") {
    const preset = typeof getPresetPack === "function" ? getPresetPack(currentBook, currentChapter) : null;
    if (preset && !forceRegenerate) {
      activeStudyData = preset;
      renderActiveTierContent();
      if (!isInitialLoad) {
        showToast(`✨ 已載入經典預載研經包：【${currentBook} 第 ${currentChapter} 章】！`);
      }
      return;
    }
  }

  // 2. 檢查本地持久快取中是否已有先前調配過的材料（若為主題課程，特徵 hash 包含語言、譯本、課程 ID 與課堂序號）
  const selectedTasteIds = BackpackStore.getTastes();
  let tasteHash = `${lang}-${version}-` + (selectedTasteIds || []).sort().join("-") + (BackpackStore.getCustomTaste() ? `-${BackpackStore.getCustomTaste()}` : "");
  if (activeCurriculumContext) {
    tasteHash += `-curriculum-${activeCurriculumContext.packId || 'pack'}-${activeCurriculumContext.sessionNum || 1}`;
  }
  const cached = BackpackStore.getCachedPack(currentBook, currentChapter, tasteHash);
  if (cached && !forceRegenerate) {
    activeStudyData = {
      bookId: bookMeta ? bookMeta.id : "custom",
      bookName: currentBook,
      chapter: currentChapter,
      verses: cached.verses || [],
      tier1_sheet: cached.tier1_sheet,
      tier2_dossier: cached.tier2_dossier
    };
    renderActiveTierContent();
    if (!isInitialLoad) {
      const isEn = typeof I18n !== "undefined" && I18n.isEn();
      showToast(isEn 
        ? `⚡ Loaded study pack from offline cache!` 
        : `⚡ 已從快取載入【${activeCurriculumContext ? activeCurriculumContext.sessionTitle : currentBook + ' 第 ' + currentChapter + ' 章'}】研經材料！`);
    }
    return;
  }

  // 3. 若尚未製作靈修材料：清空舊章節靈修內容，顯示「一鍵製作靈修材料」提示面板
  activeStudyData = {
    bookId: bookMeta ? bookMeta.id : "custom",
    bookName: currentBook,
    chapter: currentChapter,
    verses: [],
    tier1_sheet: null,
    tier2_dossier: null
  };
  renderEmptyChapterPrompt(currentBook, currentChapter);
}

// 渲染未製作靈修/研經材料時的空白提示面板與一鍵製作按鈕
function renderEmptyChapterPrompt(book = currentBook, chapter = currentChapter, tier = currentActiveTier) {
  const container = document.getElementById("tier-content-container");
  if (!container) return;

  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const bookName = typeof I18n !== "undefined" ? I18n.getBookName(book) : book;
  const selectedTasteIds = BackpackStore.getTastes();
  const selectedTastes = BackpackStore.AVAILABLE_TASTES.filter(t => selectedTasteIds.includes(t.id));
  const tastesLabel = selectedTastes.map(t => typeof I18n !== "undefined" ? I18n.getTasteInfo(t).name : t.name).join(isEn ? ", " : "、") || (isEn ? "General Study" : "綜合思考");

  const isCurriculum = !!activeCurriculumContext;
  const isTier1 = tier === "tier1";
  
  let title = "";
  let desc = "";
  let btnText = "";

  if (isEn) {
    title = isCurriculum
      ? `${activeCurriculumContext.packTitle} Session ${activeCurriculumContext.sessionNum} · Study Pack Not Yet Generated`
      : (isTier1
        ? `${bookName} Chapter ${chapter} · Devotional Study Sheet Not Yet Generated`
        : `${bookName} Chapter ${chapter} · In-Depth Dossier Not Yet Generated`);

    desc = isCurriculum
      ? `Session Topic: [${activeCurriculumContext.sessionTitle}] (Focus: ${activeCurriculumContext.passageRange || `${bookName} Ch. ${chapter}`}). Click below and our AI Theological Director will generate customized devotional and leader sheets centered on this core message and icebreaker!`
      : (isTier1
        ? `Scripture text is ready on the left. Click below and our AI Theological Director will tailor a Devotional Study Sheet (~1-2 pages A4) for personal devotionals and small group study.`
        : `Includes: historical geography maps, archaeological artifacts, theological Q&A, and small group leader facilitation guide.`);

    btnText = isCurriculum
      ? `Generate Group Material for [${activeCurriculumContext.sessionTitle}]`
      : `Generate Study Material for ${escapeHtml(bookName)} Ch. ${chapter}`;
  } else {
    title = isCurriculum
      ? `《${activeCurriculumContext.packTitle}》第 ${activeCurriculumContext.sessionNum} 堂 · 專屬材料尚未調配`
      : (isTier1
        ? `《${bookName}》第 ${chapter} 章 · 靈修材料尚未製作`
        : `《${bookName}》第 ${chapter} 章 · 深度研經行囊尚未製作`);

    desc = isCurriculum
      ? `本堂主題【${activeCurriculumContext.sessionTitle}】（焦點：${activeCurriculumContext.passageRange || `${bookName} 第 ${chapter} 章`}）。點擊下方按鈕，AI 神學主管將直接緊扣「${activeCurriculumContext.coreMessage || '本堂核心信息'}」與破冰焦點，專屬調配【靈修單張】與【組長手冊】！`
      : (isTier1
        ? `左側全本經文已就緒。隨時點擊下方按鈕，AI 神學主管將根據您設定的口味視角，為本章專屬調配【靈修查經單張】（約 1~2 頁 A4，適合個人靈修與小組聚會）。`
        : `包含：歷史地理考證地圖、出土文物考古圖解、神學難題解答與小組長破冰指南。`);

    btnText = isCurriculum
      ? `一鍵為【${activeCurriculumContext.sessionTitle}】調配專屬小組材料`
      : `一鍵製作《${escapeHtml(bookName)} 第 ${chapter} 章》靈修材料`;
  }

  container.innerHTML = `
    <div class="py-16 px-4 text-center space-y-4 max-w-lg mx-auto animate-fade-in my-auto">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shadow-sm">
        ${isCurriculum ? "🎯" : (isTier1 ? "🎒" : "📚")}
      </div>
      <div>
        <h2 class="font-bold text-stone-900 text-base md:text-lg">${escapeHtml(title)}</h2>
        <p class="text-xs text-stone-500 mt-1.5 leading-relaxed max-w-md mx-auto">
          ${escapeHtml(desc)}
        </p>
        ${isCurriculum && activeCurriculumContext.discussionTheme ? `
          <div class="mt-2 text-2xs text-amber-800 bg-amber-50/80 border border-amber-200/80 px-3 py-1.5 rounded-lg max-w-md mx-auto inline-block text-left">
            <strong>${isEn ? "💬 Discussion Theme: " : "💬 討論焦點預覽："}</strong>${escapeHtml(activeCurriculumContext.discussionTheme)}
          </div>
        ` : ''}
      </div>
      
      <!-- 當前口味標籤 -->
      <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-full text-2xs text-stone-700">
        <span>✨ ${isEn ? "Active Lenses: " : "當前口味："}<strong>${escapeHtml(tastesLabel)}</strong></span>
        <button onclick="openTasteModal()" class="text-amber-800 hover:text-amber-900 underline font-medium">${isEn ? "Change Lenses" : "切換口味"}</button>
      </div>

      <!-- 一鍵製作靈修材料按鈕 -->
      <div class="pt-2">
        <button onclick="generateWithCurrentTastes(true)" class="px-6 py-3 bg-amber-800 hover:bg-amber-900 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer">
          <span>✨</span>
          <span>${btnText}</span>
        </button>
      </div>

      <div class="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500">
        <button onclick="openSettingsModal()" class="hover:text-stone-800 underline flex items-center gap-1">
          <span>${isEn ? "⚙️ API Settings & Model Switch" : "⚙️ API 設置與模型切換"}</span>
        </button>
        ${isCurriculum ? `
          <span>·</span>
          <button onclick="exitCurriculumMode()" class="hover:text-stone-800 underline flex items-center gap-1">
            <span>${isEn ? "✕ Exit Topic Mode" : "✕ 退出主題模式"}</span>
          </button>
        ` : `
          <span>·</span>
          <button onclick="loadDefaultPreset()" class="hover:text-stone-800 underline flex items-center gap-1">
            <span>${isEn ? "📖 View Preset Pack (Genesis 1)" : "📖 查看經典預載書卷 (創世記 1)"}</span>
          </button>
        `}
      </div>
    </div>
  `;
}

// 彈出無 API Key 探索引導彈窗
function showOfflineOrKeyModal(book, chapter) {
  const modal = document.getElementById("explore-book-modal");
  const titleEl = document.getElementById("explore-modal-title");
  const descEl = document.getElementById("explore-modal-desc");

  if (titleEl) {
    titleEl.textContent = `準備調配：《${book}》第 ${chapter} 章`;
  }
  if (descEl) {
    descEl.innerHTML = `
      您選擇了<strong>《${book}》第 ${chapter} 章</strong>。<br>
      • 本系統已內建 <strong>4 部經典預載研經包</strong>，隨選即用，無需任何金鑰。<br>
      • 若要為聖經 66 卷書的任意章節動態調配個人口味雙層材料，可填入免費的 <strong>Groq / Gemini API Key</strong>，或直接啟用 <strong>💻 本地離線 AI (Ollama / LM Studio)</strong>！
    `;
  }
  pendingGenerationBook = { book, chapter };
  modal?.classList.remove("hidden");
}

function closeExploreModal() {
  document.getElementById("explore-book-modal")?.classList.add("hidden");
}

// 快捷選擇經典預載書卷
function selectPresetBook(bookName, chapter) {
  currentBook = bookName;
  currentChapter = chapter;
  
  const bookSelect = document.getElementById("book-selector-select");
  const chapInput = document.getElementById("chapter-selector-input");
  if (bookSelect) bookSelect.value = bookName;
  if (chapInput) chapInput.value = chapter;

  closeExploreModal();
  handleBookOrChapterChange(false);
}

function openSettingsForCurrentBook() {
  closeExploreModal();
  openSettingsModal(`設定 AI 通道後，將立即為《${currentBook}》第 ${currentChapter} 章調配專屬行囊！`);
}

function loadDefaultPreset() {
  selectPresetBook("創世記", 1);
}

// 依當前口味重新生成 (forceFresh: 是否強制跳過快取重新調配，預設為 true)
async function generateWithCurrentTastes(forceFresh = true) {
  const provider = BackpackStore.getProvider();
  const apiKey = provider === "groq" 
    ? BackpackStore.getGroqKey() 
    : (provider === "local" ? (BackpackStore.getLocalEndpoint() || "http://localhost:11434/v1") : BackpackStore.getApiKey());
  if (provider !== "local" && !apiKey) {
    // 無 API Key 時，提供示範模式說明或打開設置
    showOfflineOrKeyModal(currentBook, currentChapter);
    return;
  }

  const selectedTasteIds = BackpackStore.getTastes();
  const selectedTastes = BackpackStore.AVAILABLE_TASTES.filter(t => selectedTasteIds.includes(t.id));
  const customKeyword = BackpackStore.getCustomTaste();

  const container = document.getElementById("tier-content-container");
  if (!container) return;

  const isLocal = provider === "local";
  const timerLabel = isLocal ? "本地離線運算中（180 秒守護）" : "深度生成中（設定 90 秒超時保護）";

  const curriculumDesc = activeCurriculumContext
    ? `正在為《${escapeHtml(activeCurriculumContext.packTitle)}》第 ${activeCurriculumContext.sessionNum} 堂【${escapeHtml(activeCurriculumContext.sessionTitle)}】專屬調配小組主題研經材料...`
    : `正在調配《${currentBook}》第 ${currentChapter} 章 · 融入視角啟發 · 嚴守歷史正統神學 · 拒絕生硬強塞`;

  container.innerHTML = `
    <div class="py-16 text-center space-y-3">
      <div class="inline-block animate-spin text-4xl mb-2">${activeCurriculumContext ? "🎯" : "🎒"}</div>
      <div class="font-bold text-stone-900 text-base" id="ai-gen-status">${isLocal ? '本地離線 AI 正在運算調配行囊...' : (activeCurriculumContext ? 'AI 神學主管正在為主題課程調配專屬材料...' : 'AI 神學主管正在根據您的口味調配行囊...')}</div>
      <div class="text-2xs text-stone-500 font-mono" id="ai-gen-timer">已耗時 0 秒 · ${timerLabel}</div>
      <div class="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
        ${curriculumDesc}
      </div>
      <div class="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-2xs text-amber-800 font-medium">
        <span>✨ 當前口味：${selectedTastes.map(t => t.name).join("、") || "綜合思考"}</span>
      </div>
    </div>
  `;

  let elapsedSeconds = 0;
  const timerInterval = setInterval(() => {
    elapsedSeconds++;
    const timerEl = document.getElementById("ai-gen-timer");
    if (timerEl) {
      timerEl.textContent = `已耗時 ${elapsedSeconds} 秒 · ${timerLabel}`;
    }
  }, 1000);

  try {
    const onStatus = (statusText) => {
      const el = document.getElementById("ai-gen-status");
      if (el) el.textContent = statusText;
    };

    const generated = await AIService.generateStudyPack(currentBook, currentChapter, selectedTastes, customKeyword, onStatus, forceFresh, activeCurriculumContext);
    clearInterval(timerInterval);
    
    const bookMeta = typeof BIBLE_BOOKS !== "undefined" ? BIBLE_BOOKS.find(b => b.name === currentBook) : null;
    activeStudyData = {
      bookId: bookMeta ? bookMeta.id : "custom",
      bookName: currentBook,
      chapter: currentChapter,
      verses: (generated.verses && Array.isArray(generated.verses) && generated.verses.length > 0) 
        ? generated.verses 
        : (activeStudyData && activeStudyData.bookName === currentBook ? activeStudyData.verses : [{ num: 1, text: `（已載入 ${currentBook} 第 ${currentChapter} 章研經材料）` }]),
      tier1_sheet: generated.tier1_sheet,
      tier2_dossier: generated.tier2_dossier
    };

    // 同步更新左側經文區與右側材料區
    renderScripture();
    renderActiveTierContent();
    showToast(activeCurriculumContext ? `✨ 已生成【${activeCurriculumContext.sessionTitle}】專屬主題研經行囊！` : (forceFresh ? "✨ 已重新調配並生成最新研經行囊！" : "✨ 專屬研經行囊已就緒！"));
  } catch (err) {
    clearInterval(timerInterval);
    console.error("生成行囊出錯:", err);
    container.innerHTML = `
      <div class="p-8 bg-amber-50/70 border border-amber-200 rounded-2xl text-center space-y-3.5 my-4">
        <div class="text-3xl">⚠️</div>
        <div class="font-bold text-stone-900 text-sm">調配生成暫未能完成</div>
        <div class="text-xs text-amber-900 bg-white/80 p-3 rounded-xl font-mono leading-relaxed max-w-lg mx-auto border border-amber-200">
          ${escapeHtml(err.message)}
        </div>
        <p class="text-2xs text-stone-600 max-w-md mx-auto leading-relaxed">
          可能原因：API Key 輸入有誤、模型伺服器超載或連線逾時。您可以重試、檢查 API Key，或隨時切換體驗內建的 4 大經典書卷！
        </p>
        <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button onclick="generateWithCurrentTastes(true)" class="px-4 py-2 bg-amber-800 text-white text-xs rounded-lg font-medium hover:bg-amber-900 shadow-sm flex items-center gap-1.5">
            <span>🔄</span>
            <span>重新嘗試調配</span>
          </button>
          <button onclick="openSettingsModal()" class="px-3.5 py-2 bg-white border border-stone-300 text-stone-700 text-xs rounded-lg hover:bg-stone-50">
            <span>⚙️ 檢查 API Key 設置</span>
          </button>
          <button onclick="loadDefaultPreset()" class="px-3.5 py-2 bg-stone-100 text-stone-700 text-xs rounded-lg hover:bg-stone-200">
            <span>📖 切換為經典預載書卷</span>
          </button>
        </div>
      </div>
    `;
  }
}

// 彈窗模態框控制 (Modal Controls)
function renderTasteOptionsList() {
  const container = document.getElementById("taste-options-list");
  if (!container) return;
  const currentTastes = BackpackStore.getTastes();

  container.innerHTML = BackpackStore.AVAILABLE_TASTES.map(t => {
    const checked = currentTastes.includes(t.id) ? "checked" : "";
    const info = typeof I18n !== "undefined" ? I18n.getTasteInfo(t) : t;
    return `
      <label class="flex items-start gap-3 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer select-none transition-colors">
        <input type="checkbox" name="taste_opt" value="${t.id}" ${checked} class="mt-1 rounded text-amber-800 focus:ring-amber-800">
        <div>
          <div class="text-sm font-semibold text-stone-900 flex items-center gap-1.5 flex-wrap">
            <span>${t.icon}</span>
            <span>${escapeHtml(info.name)}</span>
            <span class="text-2xs text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-normal">${escapeHtml(info.category)}</span>
          </div>
          <p class="text-xs text-stone-600 mt-0.5">${escapeHtml(info.desc)}</p>
        </div>
      </label>
    `;
  }).join("");
}

function openTasteModal() {
  const modal = document.getElementById("taste-modal");
  if (!modal) return;

  renderTasteOptionsList();

  const customInput = document.getElementById("custom-taste-input");
  if (customInput) customInput.value = BackpackStore.getCustomTaste();
  modal.classList.remove("hidden");
}

function saveTasteModal() {
  const checkboxes = document.querySelectorAll("input[name='taste_opt']:checked");
  const selectedIds = Array.from(checkboxes).map(c => c.value);
  const customKeyword = document.getElementById("custom-taste-input").value.trim();
  const isEn = typeof I18n !== "undefined" && I18n.isEn();

  BackpackStore.saveTastes(selectedIds, customKeyword);
  closeTasteModal();
  renderTasteBadges();
  
  const provider = BackpackStore.getProvider();
  const apiKey = provider === "groq" ? BackpackStore.getGroqKey() : BackpackStore.getApiKey();
  if (apiKey || provider === "local") {
    showToast(isEn ? "Study taste preferences updated! Regenerating materials..." : "口味設定已更新，正在重新調配最新材料...");
    generateWithCurrentTastes(true);
  } else {
    showToast(isEn ? "Study taste preferences updated!" : "口味設定已更新！");
  }
}

function closeTasteModal() {
  document.getElementById("taste-modal")?.classList.add("hidden");
}

function openBackpackModal() {
  const modal = document.getElementById("backpack-modal");
  const container = document.getElementById("backpack-items-container");
  if (!modal || !container) return;

  const items = BackpackStore.getSavedItems();
  const isEn = typeof I18n !== "undefined" && I18n.isEn();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-stone-400">
        <div class="text-3xl mb-2">🎒</div>
        <p class="text-sm">${isEn ? "Your backpack is empty" : "背包還是空的"}</p>
        <p class="text-xs text-stone-400 mt-1">${isEn ? "Click \"Save to Backpack\" while studying to collect your favorite study sheets and cards" : "研經時隨時點擊「存入背包」，收納喜歡的單張與材料卡"}</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between pb-2 border-b border-stone-100">
        <span class="text-xs font-bold text-stone-600">${isEn ? `Saved Items (${items.length})` : `已收納材料 (${items.length})`}</span>
        <button onclick="clearBackpack()" class="text-xs text-red-600 hover:underline">${isEn ? "Clear All" : "清空背包"}</button>
      </div>
      <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
        ${items.map(item => `
          <div class="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between gap-3">
            <div>
              <span class="text-2xs font-semibold px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded">${escapeHtml(item.type)}</span>
              <div class="text-sm font-semibold text-stone-900 mt-1">${escapeHtml(item.title)}</div>
              <div class="text-xs text-stone-500">${escapeHtml(item.desc || '')}</div>
            </div>
            <button onclick="removeBackpackItem('${item.id}')" class="text-stone-400 hover:text-stone-700 text-xs p-1">✕</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  modal.classList.remove("hidden");
}

function closeBackpackModal() {
  document.getElementById("backpack-modal")?.classList.add("hidden");
}

function removeBackpackItem(id) {
  const items = BackpackStore.getSavedItems().filter(i => i.id !== id);
  localStorage.setItem("bible_backpack_saved_items", JSON.stringify(items));
  openBackpackModal();
  updateBackpackBadge();
}

function clearBackpack() {
  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  if (confirm(isEn ? "Are you sure you want to clear all saved items in your backpack?" : "確定要清空背包中已收藏的所有材料嗎？")) {
    localStorage.removeItem("bible_backpack_saved_items");
    openBackpackModal();
    updateBackpackBadge();
  }
}

// 自動偵測本機 Ollama 已安裝的模型並同步至下拉選單
async function syncLocalModelsDropdown(endpointUrl) {
  const selectEl = document.getElementById("local-model-input");
  if (!selectEl) return;

  const isEn = typeof I18n !== "undefined" && I18n.isEn();
  const installedPrefix = isEn ? "✅ [Installed]" : "✅ [本機已安裝]";

  const cleanEndpoint = (endpointUrl || BackpackStore.getLocalEndpoint() || "http://localhost:11434/v1").trim().replace(/\/+$/, "");
  const baseUrl = cleanEndpoint.replace(/\/v1$/i, "").replace(/\/api\/chat$/i, "").replace(/\/api$/i, "");
  const savedModel = BackpackStore.getLocalModel() || "qwen3.5:9b";

  try {
    let resp = await fetch(`${baseUrl}/api/tags`, { method: "GET" }).catch(() => null);
    if (!resp || !resp.ok) {
      resp = await fetch(`${baseUrl}/v1/models`, { method: "GET" });
    }
    if (!resp || !resp.ok) return;
    const data = await resp.json().catch(() => ({}));
    const installedIds = data.models
      ? data.models.map(m => m.name || m.model).filter(Boolean)
      : (data.data || []).map(m => m.id).filter(Boolean);
    if (!installedIds.length) return;

    // 確保本機已安裝的模型全部出現在下拉選單中，並標註「✅ 本機已安裝」
    const existingOptions = Array.from(selectEl.options);
    const existingValues = existingOptions.map(o => o.value);

    // 1. 為現有選項加上已安裝標記
    existingOptions.forEach(opt => {
      const baseText = opt.textContent.replace(/^✅ \[(本機已安裝|Installed)\]\s*/, "");
      if (installedIds.includes(opt.value)) {
        opt.textContent = `${installedPrefix} ${baseText}`;
      } else {
        opt.textContent = baseText;
      }
    });

    // 2. 若本機安裝了選單以外的自訂模型（例如不同 tag），自動置頂插入選單
    installedIds.forEach(id => {
      if (!existingValues.includes(id)) {
        const newOpt = document.createElement("option");
        newOpt.value = id;
        newOpt.textContent = `${installedPrefix} ${id}`;
        selectEl.insertBefore(newOpt, selectEl.firstChild);
      }
    });

    // 3. 優先選擇用戶已安裝的 qwen3.5:9b 或當前保存的模型
    if (installedIds.includes("qwen3.5:9b") && (!localStorage.getItem("bible_backpack_local_model") || savedModel === "qwen2.5:7b")) {
      selectEl.value = "qwen3.5:9b";
      BackpackStore.setLocalModel("qwen3.5:9b");
    } else if (installedIds.includes(savedModel)) {
      selectEl.value = savedModel;
    } else {
      selectEl.value = installedIds[0];
    }
  } catch (e) {
    // 離線或未啟動時保留預設選單
  }
}

// 設置彈窗
function openSettingsModal(notice = "") {
  const modal = document.getElementById("settings-modal");
  const keyInput = document.getElementById("api-key-input");
  const groqInput = document.getElementById("groq-key-input");
  const localEndpointInput = document.getElementById("local-endpoint-input");
  const localModelInput = document.getElementById("local-model-input");
  const noticeEl = document.getElementById("settings-notice");
  const statusEl = document.getElementById("api-test-status");
  const groqStatusEl = document.getElementById("groq-test-status");
  const localStatusEl = document.getElementById("local-test-status");

  const currentProvider = BackpackStore.getProvider();
  const providerRadios = document.querySelectorAll('input[name="ai_provider"]');
  providerRadios.forEach(radio => {
    radio.checked = (radio.value === currentProvider);
  });
  toggleProviderSettings(currentProvider);

  if (keyInput) keyInput.value = BackpackStore.getApiKey();
  if (groqInput) groqInput.value = BackpackStore.getGroqKey();
  const endpointVal = BackpackStore.getLocalEndpoint() || "http://localhost:11434/v1";
  if (localEndpointInput) localEndpointInput.value = endpointVal;
  if (localModelInput) localModelInput.value = BackpackStore.getLocalModel() || "qwen3.5:9b";

  // 自動掃描本機已安裝的 Ollama 模型（如 qwen3.5:9b）並更新下拉選單
  syncLocalModelsDropdown(endpointVal);

  const modelSelect = document.getElementById("model-select-input");
  if (modelSelect) modelSelect.value = BackpackStore.getModelName();

  const groqModelSelect = document.getElementById("groq-model-select-input");
  if (groqModelSelect) groqModelSelect.value = BackpackStore.getGroqModel();

  const apiBibleKeyInput = document.getElementById("api-bible-key-input");
  const apibibleIdNiv = document.getElementById("apibible-id-niv");
  const apibibleIdNirv = document.getElementById("apibible-id-nirv");
  const apibibleIdCev = document.getElementById("apibible-id-cev");
  const apibibleStatusEl = document.getElementById("apibible-test-status");

  if (apiBibleKeyInput) apiBibleKeyInput.value = BackpackStore.getApiBibleKey();
  if (apibibleIdNiv) apibibleIdNiv.value = BackpackStore.getApiBibleId("niv");
  if (apibibleIdNirv) apibibleIdNirv.value = BackpackStore.getApiBibleId("nirv");
  if (apibibleIdCev) apibibleIdCev.value = BackpackStore.getApiBibleId("cev");
  if (apibibleStatusEl) {
    apibibleStatusEl.className = "mt-1.5 text-2xs hidden";
    apibibleStatusEl.innerHTML = "";
  }

  // 更新語系按鈕樣式
  const currentLang = BackpackStore.getLanguage();
  const btnZh = document.getElementById("lang-btn-zh");
  const btnEn = document.getElementById("lang-btn-en");
  if (btnZh && btnEn) {
    if (currentLang === "zh") {
      btnZh.className = "px-3 py-1.5 rounded border text-xs font-bold transition-all border-amber-700 bg-amber-50 text-amber-900";
      btnEn.className = "px-3 py-1.5 rounded border text-xs font-medium transition-all border-stone-300 bg-white hover:bg-stone-50 text-stone-700";
    } else {
      btnEn.className = "px-3 py-1.5 rounded border text-xs font-bold transition-all border-amber-700 bg-amber-50 text-amber-900";
      btnZh.className = "px-3 py-1.5 rounded border text-xs font-medium transition-all border-stone-300 bg-white hover:bg-stone-50 text-stone-700";
    }
  }

  if (noticeEl) {
    noticeEl.textContent = notice;
    noticeEl.style.display = notice ? "block" : "none";
  }

  if (statusEl) {
    statusEl.className = "mt-1.5 text-2xs hidden";
    statusEl.innerHTML = "";
  }
  if (groqStatusEl) {
    groqStatusEl.className = "mt-1.5 text-2xs hidden";
    groqStatusEl.innerHTML = "";
  }
  if (localStatusEl) {
    localStatusEl.className = "mt-1.5 text-2xs hidden";
    localStatusEl.innerHTML = "";
  }

  modal?.classList.remove("hidden");
}

function toggleProviderSettings(provider) {
  const geminiBox = document.getElementById("provider-gemini-box");
  const groqBox = document.getElementById("provider-groq-box");
  const localBox = document.getElementById("provider-local-box");

  geminiBox?.classList.add("hidden");
  groqBox?.classList.add("hidden");
  localBox?.classList.add("hidden");

  if (provider === "groq") {
    groqBox?.classList.remove("hidden");
  } else if (provider === "local") {
    localBox?.classList.remove("hidden");
    const ep = document.getElementById("local-endpoint-input")?.value;
    syncLocalModelsDropdown(ep);
  } else {
    geminiBox?.classList.remove("hidden");
  }
}

async function testCurrentApiKey(targetProvider) {
  const currentProvider = BackpackStore.getProvider();
  const selectedProviderRadio = document.querySelector('input[name="ai_provider"]:checked');
  const provider = targetProvider || (selectedProviderRadio ? selectedProviderRadio.value : currentProvider);
  const isEn = typeof I18n !== "undefined" && I18n.isEn();

  if (provider === "local") {
    const localEndpointInput = document.getElementById("local-endpoint-input");
    const localModelInput = document.getElementById("local-model-input");
    const statusEl = document.getElementById("local-test-status");
    if (!statusEl) return;
    const endpoint = (localEndpointInput?.value || BackpackStore.getLocalEndpoint() || "http://localhost:11434/v1").trim();
    const model = (localModelInput?.value || BackpackStore.getLocalModel() || "qwen3.5:9b").trim();

    statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 block";
    statusEl.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> ${isEn ? `Testing connection to local endpoint (${escapeHtml(endpoint)})...` : `正在連線測試本地端點 (${escapeHtml(endpoint)})...`}`;

    await syncLocalModelsDropdown(endpoint);
    const result = await AIService.testApiKey("", localModelInput?.value || model, "local", endpoint);
    if (result.ok) {
      statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 block";
      statusEl.innerHTML = `<span>${escapeHtml(result.message)}</span>`;
    } else {
      statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-red-50 text-red-800 border border-red-200 block";
      statusEl.innerHTML = `<span>❌ ${escapeHtml(result.message)}</span>`;
    }
    return;
  }

  if (provider === "groq") {
    const groqInput = document.getElementById("groq-key-input");
    const groqModelSelect = document.getElementById("groq-model-select-input");
    const statusEl = document.getElementById("groq-test-status");
    if (!groqInput || !statusEl) return;
    const key = groqInput.value.trim();
    const model = groqModelSelect ? groqModelSelect.value : BackpackStore.getGroqModel();

    if (!key) {
      statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 block";
      statusEl.innerHTML = isEn
        ? "⚠️ Please enter a Groq API Key (e.g., gsk_...) before testing"
        : "⚠️ 請先輸入 Groq API Key (如 gsk_...) 再進行連線測試";
      return;
    }

    statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 block";
    statusEl.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> ${isEn ? `Testing Groq LPU API (${model})...` : `正在連線測試 Groq LPU API (${model})...`}`;

    const result = await AIService.testApiKey(key, model, "groq");
    if (result.ok) {
      statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 block";
      statusEl.innerHTML = `<span>${escapeHtml(result.message)}</span>`;
    } else {
      statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-red-50 text-red-800 border border-red-200 block";
      statusEl.innerHTML = `<span>❌ ${escapeHtml(result.message)}</span>`;
    }
    return;
  }

  // Google Gemini 測試
  const keyInput = document.getElementById("api-key-input");
  const modelSelect = document.getElementById("model-select-input");
  const statusEl = document.getElementById("api-test-status");
  if (!keyInput || !statusEl) return;

  const key = keyInput.value.trim();
  const model = modelSelect ? modelSelect.value : "gemini-2.5-flash";

  if (!key) {
    statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 block";
    statusEl.innerHTML = isEn
      ? "⚠️ Please enter a Google Gemini API Key before testing"
      : "⚠️ 請先輸入 Google Gemini API Key 再進行連線測試";
    return;
  }

  statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 block";
  statusEl.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> ${isEn ? `Testing Google Gemini API (${model})...` : `正在連線測試 Google Gemini API (${model})...`}`;

  const result = await AIService.testApiKey(key, model, "gemini");
  if (result.ok) {
    statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 block";
    statusEl.innerHTML = `<span>✅ ${escapeHtml(result.message)}</span>`;
    if (result.activeModel && modelSelect) {
      modelSelect.value = result.activeModel;
    }
  } else {
    statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-red-50 text-red-800 border border-red-200 block";
    statusEl.innerHTML = `<span>❌ ${escapeHtml(result.message)}</span>`;
  }
}

function saveSettingsModal() {
  const selectedProviderRadio = document.querySelector('input[name="ai_provider"]:checked');
  const provider = selectedProviderRadio ? selectedProviderRadio.value : "gemini";
  const geminiKey = document.getElementById("api-key-input")?.value;
  const groqKey = document.getElementById("groq-key-input")?.value;
  const localEndpoint = document.getElementById("local-endpoint-input")?.value;
  const localModel = document.getElementById("local-model-input")?.value;
  const geminiModel = document.getElementById("model-select-input")?.value;
  const groqModel = document.getElementById("groq-model-select-input")?.value;

  const apiBibleKey = document.getElementById("api-bible-key-input")?.value;
  const nivId = document.getElementById("apibible-id-niv")?.value;
  const nirvId = document.getElementById("apibible-id-nirv")?.value;
  const cevId = document.getElementById("apibible-id-cev")?.value;
  const isEn = typeof I18n !== "undefined" && I18n.isEn();

  BackpackStore.setProvider(provider);
  BackpackStore.setApiKey(geminiKey);
  BackpackStore.setGroqKey(groqKey);
  if (localEndpoint) BackpackStore.setLocalEndpoint(localEndpoint);
  if (localModel) BackpackStore.setLocalModel(localModel);
  if (geminiModel) BackpackStore.setModelName(geminiModel);
  if (groqModel) BackpackStore.setGroqModel(groqModel);

  if (typeof apiBibleKey !== "undefined") BackpackStore.setApiBibleKey(apiBibleKey);
  if (nivId) BackpackStore.setApiBibleId("niv", nivId);
  if (nirvId) BackpackStore.setApiBibleId("nirv", nirvId);
  if (cevId) BackpackStore.setApiBibleId("cev", cevId);

  closeSettingsModal();
  let activeDesc = "";
  let hasValidConfig = false;
  if (provider === "groq") {
    activeDesc = `⚡ Groq (${BackpackStore.getGroqModel()})`;
    hasValidConfig = !!groqKey;
  } else if (provider === "local") {
    activeDesc = `💻 ${isEn ? "Local AI" : "本地離線"} (${BackpackStore.getLocalModel()})`;
    hasValidConfig = !!BackpackStore.getLocalEndpoint();
  } else {
    activeDesc = `🌟 Google Gemini (${BackpackStore.getModelName()})`;
    hasValidConfig = !!geminiKey;
  }
  showToast(isEn ? `Settings saved! Active channel: ${activeDesc}` : `設置已保存！當前通道：${activeDesc}`);
  renderScripture();

  // 若先前有點選等待生成的書卷或用戶正要調配，立即自動觸發生成
  if (pendingGenerationBook && hasValidConfig) {
    const targetBook = pendingGenerationBook.book;
    const targetChap = pendingGenerationBook.chapter;
    pendingGenerationBook = null;
    currentBook = targetBook;
    currentChapter = targetChap;
    const bookSelect = document.getElementById("book-selector-select");
    const chapInput = document.getElementById("chapter-selector-input");
    if (bookSelect) bookSelect.value = currentBook;
    if (chapInput) chapInput.value = currentChapter;
    generateWithCurrentTastes();
  }
}

// 測試與驗證 API.Bible API Key
async function testApiBibleKey() {
  const keyInput = document.getElementById("api-bible-key-input");
  const statusEl = document.getElementById("apibible-test-status");
  const apiKey = (keyInput ? keyInput.value : "").trim();
  const isEn = typeof I18n !== "undefined" && I18n.isEn();

  if (!apiKey) {
    if (statusEl) {
      statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 block";
      statusEl.textContent = isEn ? "⚠️ Please enter an API.Bible API Key first." : "⚠️ 請先填寫 API.Bible API Key 再進行驗證。";
    }
    return;
  }

  if (statusEl) {
    statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 block";
    statusEl.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> ${isEn ? "Verifying API.Bible key & scanning translations (NIV, NIrV, CEV)..." : "正在向 API.Bible 驗證金鑰並掃描可用聖經譯本 (NIV, NIrV, CEV)..."}`;
  }

  try {
    const detected = await BibleService.detectBibleIds(apiKey);
    const nivId = detected.niv?.id || BackpackStore.getApiBibleId("niv");
    const nirvId = detected.nirv?.id || BackpackStore.getApiBibleId("nirv");
    const cevId = detected.cev?.id || BackpackStore.getApiBibleId("cev");

    const nivInput = document.getElementById("apibible-id-niv");
    const nirvInput = document.getElementById("apibible-id-nirv");
    const cevInput = document.getElementById("apibible-id-cev");

    if (nivInput && nivId) nivInput.value = nivId;
    if (nirvInput && nirvId) nirvInput.value = nirvId;
    if (cevInput && cevId) cevInput.value = cevId;

    const detectedNames = [];
    if (detected.niv) detectedNames.push(`NIV (${detected.niv.name})`);
    if (detected.nirv) detectedNames.push(`NIrV (${detected.nirv.name})`);
    if (detected.cev) detectedNames.push(`CEV (${detected.cev.name})`);

    if (statusEl) {
      statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 block font-medium";
      statusEl.innerHTML = `<span>✅ ${isEn ? `Verified! Auto-detected: ${detectedNames.join(", ") || "English Bible versions"}` : `驗證成功！已自動偵測：${detectedNames.join("、") || "相關英文譯本"}`}</span>`;
    }
    BackpackStore.setApiBibleKey(apiKey);
    renderScripture();
  } catch (err) {
    if (statusEl) {
      statusEl.className = "mt-1.5 text-2xs p-2 rounded bg-red-50 text-red-800 border border-red-200 block";
      statusEl.innerHTML = `<span>❌ ${isEn ? "Verification failed: " : "驗證失敗："}${escapeHtml(err.message)}</span>`;
    }
  }
}

function closeSettingsModal() {
  document.getElementById("settings-modal")?.classList.add("hidden");
}

// Toast 輕量提示條
function showToast(msg, duration = 2800) {
  const toast = document.getElementById("app-toast");
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("opacity-100");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, duration);
}

// 安全字元防禦
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ================= 全頁面視圖導航控制器 (Full-Page View Navigation) =================
let currentView = "study"; // "study" 或 "backpack"
let currentBackpackFilter = "all";
let currentBackpackSearch = "";
let routeMapInstance = null;
let marchAnimationTimeout = null;

function navigateTo(viewName) {
  currentView = viewName;

  const studyPage = document.getElementById("study-workspace-page");
  const backpackPage = document.getElementById("backpack-hub-page");
  const tabStudy = document.getElementById("view-tab-study");
  const tabBackpack = document.getElementById("view-tab-backpack");
  const tasteBar = document.getElementById("taste-bar-container");

  if (viewName === "study") {
    studyPage?.classList.remove("hidden");
    backpackPage?.classList.add("hidden");
    tasteBar?.classList.remove("hidden");

    tabStudy?.classList.add("bg-white", "text-stone-900", "shadow-sm", "font-bold");
    tabStudy?.classList.remove("text-stone-600");
    tabBackpack?.classList.remove("bg-white", "text-stone-900", "shadow-sm", "font-bold");
    tabBackpack?.classList.add("text-stone-600");

    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    studyPage?.classList.add("hidden");
    backpackPage?.classList.remove("hidden");
    tasteBar?.classList.add("hidden");

    tabBackpack?.classList.add("bg-white", "text-stone-900", "shadow-sm", "font-bold");
    tabBackpack?.classList.remove("text-stone-600");
    tabStudy?.classList.remove("bg-white", "text-stone-900", "shadow-sm", "font-bold");
    tabStudy?.classList.add("text-stone-600");

    renderBackpackHub();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ================= 背包中心大頁面渲染 (Backpack Hub Page Logic) =================
function renderBackpackHub() {
  updateBackpackBadge();
  renderStudyPacks();
  renderBackpackCards();
}

// 渲染自訂小組主題查經套裝 (Thematic Curriculum Study Packs)
function renderStudyPacks() {
  const container = document.getElementById("study-packs-container");
  if (!container) return;

  const packs = BackpackStore.getStudyPacks();
  const isEn = typeof I18n !== "undefined" && I18n.isEn();

  if (!packs || packs.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-8 text-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200 p-4">
        <p class="text-xs">${isEn ? "No thematic curriculum study packs yet" : "尚無主題查經課程套裝"}</p>
        <button onclick="openCurriculumStudioModal()" class="mt-2 text-xs text-amber-800 font-bold hover:underline">
          ${isEn ? "+ Click to design a 4–8 session small group study series with AI" : "+ 點擊由 AI 規劃一套 4~8 堂小組查經系列"}
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = packs.map(pack => {
    const sessions = pack.sessions || [];
    return `
      <div class="bg-stone-50/80 border border-stone-200 rounded-2xl p-4 sm:p-5 hover:border-amber-400 transition-all shadow-xs flex flex-col justify-between space-y-3.5">
        <div>
          <!-- 頭部資訊 -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  ${escapeHtml(pack.target || (isEn ? 'Small Group' : '小組團契'))}
                </span>
                <span class="text-2xs text-stone-500 font-medium">
                  ${isEn ? `${sessions.length || pack.sessionCount || 0} Sessions` : `共 ${sessions.length || pack.sessionCount || 0} 堂課`} · ${escapeHtml(pack.createdAt || '')}
                </span>
              </div>
              <h3 class="font-bold text-stone-900 text-sm sm:text-base mt-1.5 flex items-center gap-1.5">
                <span>📚</span>
                <span>${escapeHtml(pack.title)}</span>
              </h3>
              ${pack.subtitle ? `<p class="text-xs text-stone-600 mt-0.5">${escapeHtml(pack.subtitle)}</p>` : ''}
            </div>
            <button onclick="deleteCurriculumPack('${pack.id}')" class="text-stone-400 hover:text-red-600 text-xs p-1" title="${isEn ? 'Delete Pack' : '刪除套裝'}">✕</button>
          </div>

          ${pack.overview ? `
            <p class="text-2xs text-stone-600 leading-relaxed bg-white p-2.5 rounded-lg border border-stone-200/80 mb-3">
              ${escapeHtml(pack.overview)}
            </p>
          ` : ''}

          <!-- 各堂課程大綱列表 -->
          <div class="space-y-2">
            <span class="text-2xs font-bold text-stone-500 uppercase tracking-wider block">${isEn ? "✦ Session Syllabus & Passages" : "✦ 課堂章程與經文進度"}</span>
            ${sessions.map((s, idx) => {
              const sessionNum = s.sessionNum || (idx + 1);
              const selectedTasteIds = BackpackStore.getTastes();
              const tasteHash = (selectedTasteIds || []).sort().join("-") + (BackpackStore.getCustomTaste() ? `-${BackpackStore.getCustomTaste()}` : "") + `-curriculum-${pack.id}-${sessionNum}`;
              const isCached = !!BackpackStore.getCachedPack(s.bookName, s.chapter || 1, tasteHash);

              return `
              <div class="p-3 bg-white rounded-xl border border-stone-200/80 hover:border-amber-400 transition-all text-xs shadow-2xs">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex-1 min-w-0 cursor-pointer select-none" onclick="toggleCurriculumSessionDetails('${pack.id}', ${idx})" title="${isEn ? 'Click to toggle session details' : '點擊展開/收合本堂詳情'}">
                    <div class="font-bold text-stone-900 text-xs flex items-center gap-1.5 truncate">
                      <span class="w-5 h-5 rounded-full bg-stone-100 text-stone-700 text-2xs inline-flex items-center justify-center font-bold flex-shrink-0">${sessionNum}</span>
                      <span class="truncate">${escapeHtml(s.title || (isEn ? `Session ${sessionNum}` : `第 ${sessionNum} 堂`))}</span>
                      <span class="text-2xs text-stone-400 font-normal">${isEn ? "▼ Details" : "▼ 詳情"}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-1 text-2xs flex-wrap">
                      <span class="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 flex-shrink-0">${escapeHtml(s.passageRange || `${s.bookName} ${s.chapter || 1}`)}</span>
                      ${isCached ? `<span class="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-3xs">${isEn ? "✓ Ready" : "✓ 材料已就緒"}</span>` : ''}
                      <span class="text-stone-500 truncate">${escapeHtml(s.coreMessage || s.focus || '')}</span>
                    </div>
                  </div>
                  <button onclick="jumpToCurriculumSession('${pack.id}', ${sessionNum})" class="px-3 py-1.5 text-2xs ${isCached ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-800 hover:bg-amber-900'} text-white rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 flex-shrink-0 shadow-xs cursor-pointer" title="${isEn ? 'Open session in Study Desk' : '攜帶本堂主題進入研經工作台'}">
                    <span>📖</span>
                    <span>${isCached ? (isEn ? 'Study Now' : '即刻研讀') : (isEn ? 'Open Study' : '前往研讀')}</span>
                  </button>
                </div>

                <!-- 展開式課堂詳情 -->
                <div id="session-detail-${pack.id}-${idx}" class="hidden mt-2.5 pt-2.5 border-t border-stone-100 space-y-1.5 text-2xs text-stone-600 animate-fade-in">
                  ${s.coreMessage ? `<div class="leading-relaxed"><strong class="text-stone-800">💡 ${isEn ? 'Core Message: ' : '核心信息：'}</strong>${escapeHtml(s.coreMessage)}</div>` : ''}
                  ${s.discussionTheme ? `<div class="leading-relaxed"><strong class="text-stone-800">💬 ${isEn ? 'Discussion Focus: ' : '討論焦點：'}</strong>${escapeHtml(s.discussionTheme)}</div>` : ''}
                  ${s.icebreaker ? `<div class="leading-relaxed"><strong class="text-stone-800">🧊 ${isEn ? 'Icebreaker: ' : '小組破冰：'}</strong>${escapeHtml(s.icebreaker)}</div>` : ''}
                  ${s.lifeAction ? `<div class="leading-relaxed"><strong class="text-stone-800">🎯 ${isEn ? 'Weekly Action: ' : '本週操練：'}</strong>${escapeHtml(s.lifeAction)}</div>` : ''}
                </div>
              </div>
            `;
            }).join("")}
          </div>
        </div>

        <!-- 底部操作列 -->
        <div class="pt-3 border-t border-stone-200/80 flex items-center justify-between">
          <span class="text-2xs text-stone-500">${isEn ? "Great for group leaders & weekly fellowship handouts" : "適合組長備課與每週聚會分發"}</span>
          <div class="flex items-center gap-2">
            <button onclick="printCurriculumSyllabus('${pack.id}')" class="px-3 py-1.5 text-2xs bg-stone-900 hover:bg-black text-white rounded-lg font-medium flex items-center gap-1 shadow-sm transition-colors">
              <span>${isEn ? "🖨️ Print Syllabus" : "🖨️ 列印課程總表"}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// 渲染背包收納的所有材料卡片
function renderBackpackCards() {
  const grid = document.getElementById("backpack-hub-cards-grid");
  if (!grid) return;

  let items = BackpackStore.getSavedItems();
  const isEn = typeof I18n !== "undefined" && I18n.isEn();

  // 分類篩選
  if (currentBackpackFilter !== "all") {
    items = items.filter(i => i.type === currentBackpackFilter);
  }

  // 搜尋過濾
  if (currentBackpackSearch) {
    const q = currentBackpackSearch.toLowerCase();
    items = items.filter(i => 
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.desc && i.desc.toLowerCase().includes(q)) ||
      (i.type && i.type.toLowerCase().includes(q))
    );
  }

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-stone-400 bg-white rounded-2xl border border-dashed border-stone-200 p-8">
        <div class="text-4xl mb-3">🎒</div>
        <div class="font-bold text-stone-700 text-sm">${isEn ? "No saved materials in this category" : "目前此分類下沒有材料"}</div>
        <p class="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
          ${isEn ? "Click \"Save to Backpack\" in the Study Desk to bookmark character cards, geography routes, or devotional study sheets." : "在讀經工作台中點擊「存入背包」，或收藏任何一張人物卡、地理路線或靈修單張，便會在此永久保存。"}
        </p>
        <button onclick="navigateTo('study')" class="mt-4 px-4 py-2 text-xs bg-amber-800 text-white rounded-xl hover:bg-amber-900 transition-colors shadow-sm font-medium">
          ${isEn ? "Explore Study Desk" : "前往讀經工作台探索"}
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="bg-white border border-stone-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-2xs font-bold px-2 py-0.5 rounded-full ${getItemTypeBadgeClass(item.type)}">
            ${escapeHtml(item.type)}
          </span>
          <span class="text-2xs text-stone-400 font-mono">
            ${item.savedAt ? new Date(item.savedAt).toLocaleDateString() : (isEn ? 'Saved' : '已收藏')}
          </span>
        </div>
        <h3 class="font-bold text-stone-900 text-sm leading-snug mb-1">${escapeHtml(item.title)}</h3>
        <p class="text-xs text-stone-600 leading-relaxed">${escapeHtml(item.desc || '')}</p>
      </div>

      <div class="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between">
        <button onclick="navigateTo('study')" class="text-xs text-amber-800 font-medium hover:underline flex items-center gap-1">
          <span>${isEn ? "📖 Open in Study Desk" : "📖 進入查閱"}</span>
        </button>
        <div class="flex items-center gap-1.5">
          <button onclick="triggerPrint()" class="p-1.5 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100 text-xs" title="${isEn ? 'Print Sheet' : '列印此單張'}">
            🖨️
          </button>
          <button onclick="removeBackpackCardItem('${item.id}')" class="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 text-xs" title="${isEn ? 'Remove from Backpack' : '移出背包'}">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

function getItemTypeBadgeClass(type) {
  switch (type) {
    case "靈修單張":
    case "Study Sheet": return "bg-amber-100 text-amber-900 border border-amber-200";
    case "人物檔案":
    case "Characters": return "bg-purple-100 text-purple-900 border border-purple-200";
    case "地理水文":
    case "Geography": return "bg-blue-100 text-blue-900 border border-blue-200";
    case "歷史考證":
    case "Archaeology": return "bg-orange-100 text-orange-900 border border-orange-200";
    default: return "bg-stone-100 text-stone-700 border border-stone-200";
  }
}

function filterBackpackCategory(cat) {
  currentBackpackFilter = cat;
  const buttons = document.querySelectorAll(".cat-filter-btn");
  buttons.forEach(btn => {
    btn.classList.remove("bg-stone-900", "text-white");
    btn.classList.add("text-stone-600");
  });
  event?.target?.classList?.add("bg-stone-900", "text-white");
  event?.target?.classList?.remove("text-stone-600");
  renderBackpackCards();
}

function handleBackpackSearch(val) {
  currentBackpackSearch = val.trim();
  renderBackpackCards();
}

function removeBackpackCardItem(id) {
  const items = BackpackStore.getSavedItems().filter(i => i.id !== id);
  localStorage.setItem("bible_backpack_saved_items", JSON.stringify(items));
  renderBackpackHub();
  showToast("已從背包中移出！");
}

// ================= AI 小組主題查經企劃師控制器 (Thematic Curriculum Studio) =================
function openCurriculumStudioModal() {
  const modal = document.getElementById("curriculum-modal");
  const topicInput = document.getElementById("curriculum-topic-input");
  const statusEl = document.getElementById("curriculum-gen-status");
  if (topicInput) topicInput.value = "";
  if (statusEl) statusEl.classList.add("hidden");
  modal?.classList.remove("hidden");
}

function closeCurriculumModal() {
  document.getElementById("curriculum-modal")?.classList.add("hidden");
}

function setCurriculumTopic(t) {
  const input = document.getElementById("curriculum-topic-input");
  if (input) input.value = t;
}

async function startGenerateCurriculum() {
  const topic = document.getElementById("curriculum-topic-input")?.value?.trim();
  const sessions = parseInt(document.getElementById("curriculum-sessions-select")?.value) || 4;
  const target = document.getElementById("curriculum-target-select")?.value || "小組團契";

  if (!topic) {
    showToast("請輸入您想要企劃的查經主題名稱！");
    return;
  }

  const provider = BackpackStore.getProvider();
  const apiKey = provider === "groq" 
    ? BackpackStore.getGroqKey() 
    : (provider === "local" ? (BackpackStore.getLocalEndpoint() || "http://localhost:11434/v1") : BackpackStore.getApiKey());
  if (provider !== "local" && !apiKey) {
    closeCurriculumModal();
    openSettingsModal("請先在設置中填入免費 API Key，即可讓 AI 為您企劃多堂主題查經套裝！");
    return;
  }

  const statusEl = document.getElementById("curriculum-gen-status");
  const statusText = document.getElementById("curriculum-status-text");
  const btn = document.getElementById("btn-start-curriculum");

  if (statusEl) statusEl.classList.remove("hidden");
  if (btn) btn.disabled = true;

  try {
    const selectedTasteIds = BackpackStore.getTastes();
    const selectedTastes = BackpackStore.AVAILABLE_TASTES.filter(t => selectedTasteIds.includes(t.id));

    const onStatus = (msg) => {
      if (statusText) statusText.textContent = msg;
    };

    const newCurriculum = await AIService.generateCurriculum(topic, sessions, target, selectedTastes, onStatus);
    BackpackStore.saveStudyPack(newCurriculum);
    closeCurriculumModal();
    renderStudyPacks();
    showToast(`🎉 主題查經套裝【${newCurriculum.title}】(${newCurriculum.sessions.length}堂) 已企劃完成！`);
  } catch (err) {
    showToast(`企劃失敗: ${err.message}`, 4000);
    if (statusText) statusText.textContent = `生成出錯: ${err.message}`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 展開/收合主題課程特定堂數詳情
function toggleCurriculumSessionDetails(packId, idx) {
  const el = document.getElementById(`session-detail-${packId}-${idx}`);
  if (el) el.classList.toggle("hidden");
}

// 跳轉到特定課堂經文查經，並注入主題課程上下文
function jumpToCurriculumSession(packId, sessionNum) {
  const packs = BackpackStore.getStudyPacks();
  const pack = packs.find(p => p.id === packId);
  if (!pack) {
    showToast("查無該套裝課程");
    return;
  }
  const session = (pack.sessions || []).find(s => s.sessionNum === sessionNum) || (pack.sessions && pack.sessions[sessionNum - 1]);
  if (!session) {
    showToast("查無該堂課堂資訊");
    return;
  }

  activeCurriculumContext = {
    packId: pack.id,
    packTitle: pack.title,
    sessionNum: session.sessionNum || sessionNum,
    sessionTitle: session.title || `第 ${sessionNum} 堂`,
    bookName: session.bookName,
    chapter: session.chapter || 1,
    passageRange: session.passageRange || `${session.bookName} 第 ${session.chapter || 1} 章`,
    coreMessage: session.coreMessage || session.focus || "",
    discussionTheme: session.discussionTheme || "",
    icebreaker: session.icebreaker || "",
    lifeAction: session.lifeAction || ""
  };

  navigateTo('study');
  currentBook = session.bookName;
  currentChapter = session.chapter || 1;

  const bookSelect = document.getElementById("book-selector-select");
  const chapInput = document.getElementById("chapter-selector-input");
  if (bookSelect) bookSelect.value = currentBook;
  if (chapInput) chapInput.value = currentChapter;

  renderCurriculumBanner();
  handleBookOrChapterChange(false);
}

function deleteCurriculumPack(id) {
  if (confirm("確定要刪除這套主題查經課程嗎？")) {
    BackpackStore.deleteStudyPack(id);
    renderStudyPacks();
    showToast("已刪除該查經套裝");
  }
}

// 列印整套多堂課程總表 (A4 課程章程)
function printCurriculumSyllabus(id) {
  const packs = BackpackStore.getStudyPacks();
  const pack = packs.find(p => p.id === id);
  if (!pack) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("瀏覽器阻擋了列印視窗，請允許彈窗！");
    return;
  }

  const sessionsHtml = (pack.sessions || []).map((s, idx) => `
    <div style="border-bottom: 1px solid #e7e5e4; padding: 14px 0; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <h3 style="margin: 0; font-size: 13pt; color: #1c1917; font-weight: bold;">
          第 ${s.sessionNum || (idx+1)} 堂：${escapeHtml(s.title || '')}
        </h3>
        <span style="font-weight: bold; color: #92400e; font-size: 10.5pt; background: #fef3c7; padding: 2px 8px; border-radius: 4px;">
          ${escapeHtml(s.passageRange || `${s.bookName} 第 ${s.chapter} 章`)}
        </span>
      </div>
      <p style="margin: 6px 0 3px 0; font-size: 10pt; color: #44403c;"><strong>核心信息：</strong>${escapeHtml(s.coreMessage || s.focus || '')}</p>
      ${s.discussionTheme ? `<p style="margin: 3px 0; font-size: 9.5pt; color: #57534e;"><strong>討論焦點：</strong>${escapeHtml(s.discussionTheme)}</p>` : ''}
      ${s.icebreaker ? `<p style="margin: 3px 0; font-size: 9.5pt; color: #78716c;"><strong>小組破冰：</strong>${escapeHtml(s.icebreaker)}</p>` : ''}
      ${s.lifeAction ? `<p style="margin: 3px 0; font-size: 9.5pt; color: #047857;"><strong>本週操練：</strong>${escapeHtml(s.lifeAction)}</p>` : ''}
    </div>
  `).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(pack.title)} · 查經手冊</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang TC", "Microsoft JhengHei", sans-serif; line-height: 1.5; color: #1c1917; padding: 18mm; max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 2px solid #78350f; padding-bottom: 12px; margin-bottom: 16px; }
        .title { font-size: 18pt; font-weight: bold; margin: 0 0 6px 0; color: #78350f; }
        .subtitle { font-size: 11pt; color: #57534e; margin: 0 0 8px 0; }
        .meta { font-size: 9.5pt; color: #78716c; }
        .overview { background: #fafaf9; border-left: 3px solid #78350f; padding: 10px 14px; margin-bottom: 18px; font-size: 10pt; color: #292524; }
        @media print { body { padding: 0; max-width: 100%; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-size: 9pt; color: #92400e; font-weight: bold; margin-bottom: 4px;">🎒 BIBLE BACKPACK · 小組主題查經課程章程</div>
        <h1 class="title">${escapeHtml(pack.title)}</h1>
        ${pack.subtitle ? `<div class="subtitle">${escapeHtml(pack.subtitle)}</div>` : ''}
        <div class="meta">對象群體：${escapeHtml(pack.target || '小組團契')} · 堂數規劃：共 ${pack.sessions ? pack.sessions.length : 0} 堂 · 建立日期：${escapeHtml(pack.createdAt || '')}</div>
      </div>
      ${pack.overview ? `<div class="overview"><strong>課程總綱：</strong>${escapeHtml(pack.overview)}</div>` : ''}
      <div>${sessionsHtml}</div>
      <div style="margin-top: 24px; text-align: center; font-size: 8.5pt; color: #a8a29e; border-top: 1px solid #e7e5e4; padding-top: 10px;">
        Bible Backpack · 正統大公信仰 · 個人化研經行囊 · 基督徒小組事奉備課專用
      </div>
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ================= 地理路線模擬與互動地圖 (Interactive Map & Simulation) =================
function initRouteMap(points) {
  const mapContainer = document.getElementById("joshua-route-map");
  if (!mapContainer || typeof L === "undefined") return;

  // 嚴格過濾並驗證本章確鑿座標點，絕不強制套用其他書卷（如約書亞記）之預設座標
  const routePoints = getValidRoutePoints(points);
  if (!routePoints.length) return;

  // 清除舊地圖實例
  if (routeMapInstance) {
    routeMapInstance.remove();
    routeMapInstance = null;
  }

  const bookName = activeStudyData?.bookName || currentBook;
  const chapNum = activeStudyData?.chapter || currentChapter;
  const isJourney = isChapterJourneyRoute(activeStudyData?.tier2_dossier?.geography, bookName, chapNum);

  // 初始化 Leaflet 地圖，聚焦於第一個地標點
  routeMapInstance = L.map("joshua-route-map", {
    scrollWheelZoom: false
  }).setView([routePoints[0].lat, routePoints[0].lng], routePoints.length === 1 ? 10 : 8);

  // 100% 免費、無任何 API Key 限制與水印之高畫質底圖：
  // 1. Esri World Topo Map：高清晰地形地貌底圖，地名全球統一拉丁/英文標準拼寫，無希伯來/阿拉伯文干擾！
  // 2. Esri World Imagery：全球高清晰衛星航拍照
  const tileUrl = currentMapType === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';

  const tileAttribution = currentMapType === 'satellite'
    ? 'Tiles &copy; Esri, Maxar | Bible Backpack'
    : 'Tiles &copy; Esri, USGS, TomTom | Bible Backpack';

  L.tileLayer(tileUrl, {
    maxZoom: 18,
    attribution: tileAttribution
  }).addTo(routeMapInstance);

  const latLngs = routePoints.map(p => [p.lat, p.lng]);

  // ★ 核心守則：只有當本章確屬「實際行軍、出埃及或宣教旅程動線」時，才繪製虛線軌跡 (Polyline)！
  if (isJourney && routePoints.length > 1) {
    const polyline = L.polyline(latLngs, {
      color: "#b45309",
      weight: 4,
      dashArray: "6, 8",
      opacity: 0.9
    }).addTo(routeMapInstance);
    routeMapInstance.fitBounds(polyline.getBounds(), { padding: [55, 55], maxZoom: 13 });
  } else if (routePoints.length > 1) {
    // 非行軍路線的多個背景參照地標：只調整視野涵蓋各地標，不畫連線
    const bounds = L.latLngBounds(latLngs);
    routeMapInstance.fitBounds(bounds, { padding: [55, 55], maxZoom: 11 });
  } else {
    routeMapInstance.setView(latLngs[0], 10);
  }

  // 交錯方向配置（右、上、下、上、左），保證標籤錯落有致絕不重疊
  const staggeredOffsets = [
    { dir: "right", offset: [12, 0] },
    { dir: "top", offset: [0, -12] },
    { dir: "bottom", offset: [0, 12] },
    { dir: "top", offset: [0, -12] },
    { dir: "left", offset: [-12, 0] }
  ];

  window.routeMarkers = [];
  const isEn = currentMapLang === "en";
  const bookMeta = typeof BIBLE_BOOKS !== "undefined" ? BIBLE_BOOKS.find(b => b.name === bookName) : null;
  const bookEn = bookMeta?.en || bookName;

  const headingEl = document.getElementById("map-heading-label");
  if (headingEl) {
    if (isJourney) {
      headingEl.textContent = isEn
        ? `${bookEn} Chapter ${chapNum} · Journey & March Route`
        : `《${bookName}》第 ${chapNum} 章 · 行軍與遷徙路線圖`;
    } else {
      headingEl.textContent = isEn
        ? `${bookEn} Chapter ${chapNum} · Historical Landmarks (Reference Sites)`
        : `《${bookName}》第 ${chapNum} 章 · 聖經歷史地標考證圖（非行軍連線）`;
    }
  }

  routePoints.forEach((p, idx) => {
    const stepNum = p.step || (idx + 1);
    const cfg = staggeredOffsets[idx % staggeredOffsets.length];
    const ptNameZh = p.name || `地點 ${stepNum}`;
    const ptNameEn = p.nameEn || getBilingualGeoName(p.name, "en") || `Point ${stepNum}`;
    const badgeLabel = isJourney
      ? (isEn ? `${stepNum}. ${ptNameEn}` : `${stepNum}. ${ptNameZh}`)
      : (isEn ? `📍 ${ptNameEn}` : `📍 ${ptNameZh}`);
    const displayName = isEn ? ptNameEn : ptNameZh;
    const displayDesc = isEn ? (p.descEn || p.desc) : p.desc;

    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 9,
      fillColor: isJourney ? "#b45309" : "#0369a1",
      color: "#ffffff",
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.95
    }).addTo(routeMapInstance);

    // 錯開方向之文字標籤徽章，乾淨簡潔
    marker.bindTooltip(`<b>${escapeHtml(badgeLabel)}</b>`, {
      permanent: true,
      direction: cfg.dir,
      className: "map-marker-badge",
      offset: cfg.offset
    });

    const infoBadges = [p.elevation, p.status].filter(Boolean).map(escapeHtml).join(" · ");
    const popupHtml = `
      <div style="font-family: inherit; font-size: 11px; line-height: 1.4; max-width: 220px;">
        <strong style="color: #78350f; font-size: 12px; display: block; margin-bottom: 2px;">
          ${escapeHtml(displayName)}
        </strong>
        ${infoBadges ? `
          <span style="background: #f5efe4; color: #78503b; padding: 1px 4px; border-radius: 3px; font-size: 9px; display: inline-block; margin-bottom: 4px;">
            ${infoBadges}
          </span>
        ` : ''}
        <p style="margin: 0; color: #444;">${escapeHtml(displayDesc || '')}</p>
      </div>
    `;

    marker.bindPopup(popupHtml);
    window.routeMarkers.push(marker);
  });
}

function flyToStepMarker(index) {
  if (!window.routeMarkers || !window.routeMarkers[index] || !routeMapInstance) return;
  const marker = window.routeMarkers[index];
  routeMapInstance.panTo(marker.getLatLng(), { animate: true, duration: 0.6 });
  marker.openPopup();
}

// 切換地圖語言 (中文 / English)
let currentMapLang = "zh";
let currentMapType = "voyager";

function setMapLanguage(lang) {
  currentMapLang = lang;
  
  const btnZh = document.getElementById("map-lang-zh");
  const btnEn = document.getElementById("map-lang-en");
  const headingEl = document.getElementById("map-heading-label");

  if (lang === "zh") {
    btnZh?.classList.add("font-bold", "bg-white", "text-stone-900", "shadow-xs");
    btnZh?.classList.remove("text-stone-500");
    btnEn?.classList.remove("font-bold", "bg-white", "text-stone-900", "shadow-xs");
    btnEn?.classList.add("text-stone-500");
  } else {
    btnEn?.classList.add("font-bold", "bg-white", "text-stone-900", "shadow-xs");
    btnEn?.classList.remove("text-stone-500");
    btnZh?.classList.remove("font-bold", "bg-white", "text-stone-900", "shadow-xs");
    btnZh?.classList.add("text-stone-500");
  }

  const bookName = activeStudyData?.bookName || currentBook;
  const chapNum = activeStudyData?.chapter || currentChapter;
  const bookMeta = typeof BIBLE_BOOKS !== "undefined" ? BIBLE_BOOKS.find(b => b.name === bookName) : null;
  const bookEn = bookMeta?.en || bookName;
  const geography = activeStudyData?.tier2_dossier?.geography;
  const isJourney = isChapterJourneyRoute(geography, bookName, chapNum);

  if (headingEl) {
    if (isJourney) {
      headingEl.textContent = lang === "zh"
        ? `《${bookName}》第 ${chapNum} 章 · 行軍與遷徙路線圖`
        : `${bookEn} Chapter ${chapNum} · Journey & March Route`;
    } else {
      headingEl.textContent = lang === "zh"
        ? `《${bookName}》第 ${chapNum} 章 · 聖經歷史地標考證圖（非行軍連線）`
        : `${bookEn} Chapter ${chapNum} · Historical Landmarks (Reference Sites)`;
    }
  }

  const points = getValidRoutePoints(geography?.routePoints);
  initRouteMap(points);

  // 同步更新下方步驟卡片語言
  const cardsContainer = document.getElementById("route-step-cards-container");
  if (cardsContainer && points.length) {
    cardsContainer.innerHTML = points.map((pt, idx) => {
      const stepNum = pt.step || (idx + 1);
      const ptName = lang === "en" ? (pt.nameEn || getBilingualGeoName(pt.name, "en")) : pt.name;
      const ptDesc = lang === "en" ? (pt.descEn || pt.desc) : pt.desc;
      return `
        <div onclick="flyToStepMarker(${idx})" class="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition-all">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-stone-900 flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full ${isJourney ? 'bg-amber-800 text-white' : 'bg-stone-200 text-stone-700'} text-2xs inline-flex items-center justify-center font-bold">${isJourney ? stepNum : '📍'}</span>
              <span class="step-card-name">${escapeHtml(ptName)}</span>
            </span>
            ${pt.elevation ? `<span class="text-2xs text-stone-500 font-mono">${escapeHtml(pt.elevation)}</span>` : ''}
          </div>
          <p class="text-2xs text-stone-600 leading-relaxed step-card-desc">${escapeHtml(ptDesc || '')}</p>
        </div>
      `;
    }).join("");
  }
}

// 切換地圖底圖 (清晰 Latin 地圖 vs 衛星圖)
function setMapType(type) {
  currentMapType = type;
  const btnVoyager = document.getElementById("map-type-voyager");
  const btnSat = document.getElementById("map-type-satellite");

  if (type === "voyager") {
    btnVoyager?.classList.add("font-bold", "bg-white", "text-stone-900", "shadow-xs");
    btnVoyager?.classList.remove("text-stone-500");
    btnSat?.classList.remove("font-bold", "bg-white", "text-stone-900", "shadow-xs");
    btnSat?.classList.add("text-stone-500");
  } else {
    btnSat?.classList.add("font-bold", "bg-white", "text-stone-900", "shadow-xs");
    btnSat?.classList.remove("text-stone-500");
    btnVoyager?.classList.remove("font-bold", "bg-white", "text-stone-900", "shadow-xs");
    btnVoyager?.classList.add("text-stone-500");
  }

  initRouteMap(activeStudyData.tier2_dossier?.geography?.routePoints);
}

// 模擬行軍或遷徙前進動態（使用當前章節之實際路線節點）
function simulateMarchRoute() {
  const routePoints = getValidRoutePoints(activeStudyData?.tier2_dossier?.geography?.routePoints);
  if (!routeMapInstance || routePoints.length < 2) {
    showToast("本章無行軍或遷徙路線可模擬");
    return;
  }

  showToast(`▶ 正在模擬《${activeStudyData?.bookName || currentBook}》路線推進動態...`);

  let stepIndex = 0;
  if (marchAnimationTimeout) clearTimeout(marchAnimationTimeout);

  function stepAdvance() {
    if (stepIndex >= routePoints.length) {
      const lastPt = routePoints[routePoints.length - 1];
      showToast(`✓ 路線模擬抵達終點：${lastPt.name || "目標地點"}！`);
      return;
    }

    const pt = routePoints[stepIndex];
    routeMapInstance.panTo([pt.lat, pt.lng], { animate: true, duration: 0.8 });

    // 觸發該標記點的彈窗
    if (window.routeMarkers && window.routeMarkers[stepIndex]) {
      window.routeMarkers[stepIndex].openPopup();
    }

    stepIndex++;
    marchAnimationTimeout = setTimeout(stepAdvance, 2200);
  }

  stepAdvance();
}

// ================= 圖片高清預覽模態框 (Image Preview Modal) =================
function openImageModal(url, title, desc, pageUrl = null) {
  const modal = document.getElementById("image-preview-modal");
  const imgEl = document.getElementById("modal-preview-img");
  const titleEl = document.getElementById("modal-preview-title");
  const descEl = document.getElementById("modal-preview-desc");
  const sourceContainer = document.getElementById("modal-preview-source-container");
  const sourceLink = document.getElementById("modal-preview-source-link");

  if (!modal || !imgEl) return;

  imgEl.src = url;
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;

  if (sourceContainer && sourceLink) {
    if (pageUrl) {
      sourceLink.href = pageUrl;
      sourceContainer.classList.remove("hidden");
    } else {
      sourceContainer.classList.add("hidden");
    }
  }

  modal.classList.remove("hidden");
}

function closeImageModal() {
  document.getElementById("image-preview-modal")?.classList.add("hidden");
}

