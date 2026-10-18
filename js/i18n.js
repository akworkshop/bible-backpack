// Bible Backpack 國際化語言管理器 (I18n Service)
// 支援繁體中文 (Traditional Chinese) 與 英文 (English) 雙語切換

const I18n = {
  currentLang: "zh",

  init() {
    this.currentLang = BackpackStore.getLanguage() || "zh";
  },

  getLang() {
    if (typeof BackpackStore !== "undefined" && typeof BackpackStore.getLanguage === "function") {
      return BackpackStore.getLanguage() || this.currentLang || "zh";
    }
    return this.currentLang || "zh";
  },

  isEn() {
    return this.getLang() === "en";
  },

  setLang(lang) {
    this.currentLang = lang === "en" ? "en" : "zh";
    BackpackStore.setLanguage(this.currentLang);
    this.applyToDOM();
  },

  translations: {
    zh: {
      appName: "Bible Backpack",
      appTagline: "行動基督徒的深度研經與小組行囊",
      chapterSelect: "章節選擇",
      bookSelectorTitle: "選擇經卷與章節",
      searchScripture: "檢索經文...",
      studyTastes: "研經口味",
      myBackpack: "我的背包",
      settings: "設置",
      settingsTitle: "系統與 AI 通道設置",
      apiBibleSettings: "API.Bible 聖經譯本通道 (NIV / NIrV / CEV)",
      apiBibleKeyLabel: "API.Bible 金鑰 (API Key)：",
      apiBibleKeyPlaceholder: "貼上 api.scripture.api.bible 之 API Key",
      apiBibleHelp: "可於 scripture.api.bible 免費註冊申請，授權存取 NIV、NIrV、CEV 等現代譯本。",
      autoDetectBibleIds: "🔍 自動偵測譯本 ID",
      languageSelect: "介面語言 (Interface Language)",
      langZh: "繁體中文 (Traditional Chinese)",
      langEn: "English",
      bibleVersion: "聖經譯本 (Bible Translation)",
      versionCuv: "和合本 (CUV)",
      versionNiv: "NIV (New International Version)",
      versionNirv: "NIrV (Reader's Version - 兒少易讀)",
      versionCev: "CEV (Contemporary English Version)",
      tabTier1: "靈修查經單張",
      tabTier1Sub: "(1~2頁)",
      tabTier2: "深度研經行囊",
      tabTier2Sub: "(組長手冊)",
      reGenerate: "重新調配",
      loadingScripture: "正在載入經文...",
      scriptureViewerHint: "點選經文可反思默想",
      saveToBackpack: "存入背包",
      savedInBackpack: "已在背包",
      printPdf: "列印/PDF",
      printLeaderDossier: "列印深度行囊",
      chapterEmptyTitle: "研經材料尚未製作",
      chapterEmptyDesc: "左側經文已就緒。隨時點擊下方按鈕，AI 神學主管將根據您設定的口味視角，專屬調配研經材料。",
      oneClickGenerate: "一鍵製作靈修材料",
      curriculumBannerTitle: "小組主題課程模式",
      curriculumReturn: "返回課程列表",
      curriculumExit: "退出主題",
      exploreKeyGuideTitle: "準備調配經文",
      fontSizeSm: "小",
      fontSizeBase: "中",
      fontSizeLg: "大",
      tasteModalTitle: "自選研經口味 (Study Taste Mixer)",
      tasteModalDesc: "配合您的思考習慣與興趣，啟發研經視角，自然不生硬",
      tasteCategoryLabel: "多維度視角選擇（可多選）：",
      customTasteLabel: "自訂興趣或專業領域（選填）：",
      customTastePlaceholder: "例如：國小三年級主日學、校園同儕相處、軟體工程師、喜歡天文學...",
      customTasteHelp: "AI 會在生成時作為背景參考，以引起共鳴的恰當視角作比喻（亦可填入孩子年級或學校情境）。",
      saveTasteSettings: "保存口味設定",
      cancel: "取消",
      backpackHubTitle: "研經背包中心",
      backpackHubSubtitle: "收納您調配儲存的所有靈修單張、歷史考證、人物檔案與多堂小組課程",
      allTastesBadge: "當前口味：",
      kidsModeTitleSuffix: "（兒少校園與家庭版）",
      taste_btn: "研經口味",
      viewStudy: "研經工作台",
      viewBackpack: "我的研經背包",
      adjustTasteBtn: "+ 調整偏好",
      chapterPrefix: "第",
      chapterSuffix: "章",
      scriptureCopyright: "和合本 (CUV) 公有領域",
      backToStudy: "← 返回讀經工作台",
      curriculumStudioBtn: "✨ AI 規劃多堂查經套裝",
      curriculumPacksTitle: "小組主題查經套裝 (Thematic Curriculum Packs)",
      curriculumPacksDesc: "針對職場、情緒、門徒造就等主題規劃的多堂完整查經課程，支援逐堂查經與整套列印",
      addCurriculumBtn: "+ 新增主題系列",
      catAll: "全部",
      catSheet: "📄 靈修單張",
      catCharacter: "👤 人物檔案",
      catGeo: "🗺️ 地理水文",
      catArch: "🏺 歷史考證",
      navScripture: "經文閱讀",
      searchBackpackPlaceholder: "🔍 搜尋背包內材料...",
      settings_lang_label: "介面語言 / Interface Language：",
      settings_apibible_title: "API.Bible 金鑰 (NIV, NIrV, CEV 英文經文授權)：",
      settings_apibible_detect: "驗證並偵測 Bible ID",
      settings_apibible_desc: "• 填入 API.Bible Key 即可讀取 NIV、NIrV、CEV 等英文譯本，讀取後會自動快取至瀏覽器支援離線閱讀。<br>• 未設定金鑰時，系統仍可隨時使用和合本 (CUV) 全本經文與所有 AI 研經材料。"
    },
    en: {
      appName: "Bible Backpack",
      appTagline: "Deep Scripture Study & Fellowship Guide for Christians on the Move",
      chapterSelect: "Chapter",
      bookSelectorTitle: "Select Book & Chapter",
      searchScripture: "Search scripture...",
      studyTastes: "Study Lenses",
      myBackpack: "My Backpack",
      settings: "Settings",
      settingsTitle: "System & AI Engine Settings",
      apiBibleSettings: "API.Bible Gateway (NIV / NIrV / CEV)",
      apiBibleKeyLabel: "API.Bible API Key:",
      apiBibleKeyPlaceholder: "Paste API Key from api.scripture.api.bible",
      apiBibleHelp: "Free signup at scripture.api.bible gives access to NIV, NIrV, CEV and more translations.",
      autoDetectBibleIds: "🔍 Auto-Detect Bible IDs",
      languageSelect: "Interface Language",
      langZh: "繁體中文 (Traditional Chinese)",
      langEn: "English",
      bibleVersion: "Bible Translation",
      versionCuv: "CUV (Chinese Union Version 和合本)",
      versionNiv: "NIV (New International Version)",
      versionNirv: "NIrV (Reader's Version - Easy/Kids)",
      versionCev: "CEV (Contemporary English Version)",
      tabTier1: "Devotional Study Sheet",
      tabTier1Sub: "(1-2 Pages)",
      tabTier2: "In-Depth Study Dossier",
      tabTier2Sub: "(Leader Guide)",
      reGenerate: "Re-generate",
      loadingScripture: "Loading scripture text...",
      scriptureViewerHint: "Click a verse to reflect and meditate",
      saveToBackpack: "Save to Backpack",
      savedInBackpack: "Saved",
      printPdf: "Print / PDF",
      printLeaderDossier: "Print Leader Dossier",
      chapterEmptyTitle: "Study Pack Not Yet Generated",
      chapterEmptyDesc: "Scripture is ready on the left. Click below and our AI Theological Director will tailor a study pack based on your chosen perspectives.",
      oneClickGenerate: "Generate Study Material Now",
      curriculumBannerTitle: "Thematic Curriculum Mode",
      curriculumReturn: "Back to Curriculum",
      curriculumExit: "Exit Topic",
      exploreKeyGuideTitle: "Ready to Prepare Scripture",
      fontSizeSm: "Small",
      fontSizeBase: "Medium",
      fontSizeLg: "Large",
      tasteModalTitle: "Study Taste Mixer",
      tasteModalDesc: "Tailor the theological perspective to your interests and life context naturally",
      tasteCategoryLabel: "Select Multiple Perspectives:",
      customTasteLabel: "Custom Interest / Domain / Grade (Optional):",
      customTastePlaceholder: "e.g., 4th Grade Sunday School, school friendships, software engineer, love astronomy...",
      customTasteHelp: "AI will incorporate these analogies into application questions and takeaways.",
      saveTasteSettings: "Save Preferences",
      cancel: "Cancel",
      backpackHubTitle: "My Backpack Hub",
      backpackHubSubtitle: "Manage your saved devotional sheets, character dossiers, archaeological insights, and multi-session curricula",
      allTastesBadge: "Active Lenses:",
      kidsModeTitleSuffix: " (Kids & Campus Edition)",
      taste_btn: "Study Lenses",
      viewStudy: "Study Workspace",
      viewBackpack: "My Backpack",
      adjustTasteBtn: "+ Adjust Lenses",
      chapterPrefix: "Ch.",
      chapterSuffix: "",
      scriptureCopyright: "CUV Public Domain / API.Bible Licensed",
      backToStudy: "← Back to Study Workspace",
      curriculumStudioBtn: "✨ AI Thematic Curriculum Studio",
      curriculumPacksTitle: "Thematic Curriculum Study Packs",
      curriculumPacksDesc: "Multi-session small group study series with progression, icebreakers, and printable guides",
      addCurriculumBtn: "+ New Topic Series",
      catAll: "All",
      catSheet: "📄 Study Sheets",
      catCharacter: "👤 Characters",
      catGeo: "🗺️ Geography",
      catArch: "🏺 Archaeology",
      navScripture: "Scripture",
      searchBackpackPlaceholder: "🔍 Search saved materials...",
      settings_lang_label: "Interface Language:",
      settings_apibible_title: "API.Bible API Key (NIV / NIrV / CEV Scripture):",
      settings_apibible_detect: "Verify & Detect Bible IDs",
      settings_apibible_desc: "• Enter your API.Bible Key to read NIV, NIrV, CEV translations with instant offline caching.<br>• Without a key, Chinese Union Version (CUV) full Bible and all AI features remain completely accessible."
    }
  },

  t(key, fallback = "") {
    const lang = this.getLang();
    const dict = this.translations[lang] || this.translations.zh;
    return dict[key] !== undefined ? dict[key] : (this.translations.zh[key] || fallback || key);
  },

  // 獲取書卷本地化名稱 (支援傳入書卷物件或中英文書名名稱字串)
  getBookName(bookInput, targetLang = null) {
    if (!bookInput) return "";
    const isEn = targetLang ? (targetLang === "en") : this.isEn();
    let bookObj = null;

    if (typeof bookInput === "object") {
      bookObj = bookInput;
    } else if (typeof BIBLE_BOOKS !== "undefined") {
      const q = String(bookInput).trim().toLowerCase();
      bookObj = BIBLE_BOOKS.find(b => 
        b.name === bookInput || 
        b.english.toLowerCase() === q || 
        b.id.toLowerCase() === q
      );
    }

    if (!bookObj) return String(bookInput);
    return isEn ? (bookObj.english || bookObj.name) : bookObj.name;
  },

  // 獲取口味標籤本地化資訊 (支援傳入物件或 ID 字串)
  getTasteInfo(tasteInput) {
    if (!tasteInput) return { name: "", desc: "", category: "" };
    const tasteId = typeof tasteInput === "object" ? tasteInput.id : tasteInput;
    const isObj = typeof tasteInput === "object";
    const baseName = isObj ? tasteInput.name : tasteInput;
    const baseDesc = isObj ? tasteInput.desc : "";
    const baseCat = isObj ? tasteInput.category : "";

    if (!this.isEn()) {
      return {
        id: tasteId,
        name: baseName,
        desc: baseDesc,
        category: baseCat
      };
    }
    const enMap = {
      kids: { name: "Kids & Campus", desc: "School analogies, peer courage, dynamic icebreakers", category: "Age Focus" },
      archaeology: { name: "Biblical Archaeology", desc: "Dig sites, museum artifacts & ancient ruins", category: "Academic" },
      history: { name: "Historical Context", desc: "Ancient Near Eastern treaty & imperial politics", category: "Academic" },
      science: { name: "Natural Science", desc: "Hydrology, ecology & physical observations", category: "Academic" },
      math_logic: { name: "Logic & Structure", desc: "Chiasm, cause-and-effect & reasoned analysis", category: "Academic" },
      psychology: { name: "Psychology & Decision", desc: "Overcoming fear, leadership choice & cognition", category: "Academic" },
      teacher: { name: "Group Leader", desc: "Icebreaker questions, pacing & leader reminders", category: "Practical" },
      scifi: { name: "Cosmic Grandeur", desc: "Cross-dimensional, vast worldviews & frontiers", category: "Reading" },
      mystery: { name: "Mystery & Clues", desc: "Textual foreshadowing & deductive reasoning", category: "Reading" },
      meditation: { name: "Contemplative", desc: "Quiet reflection, earnest prayer & spiritual resonance", category: "Spiritual" }
    };
    const mapped = enMap[tasteId];
    if (mapped) {
      return { id: tasteId, ...mapped };
    }
    return { id: tasteId, name: baseName, desc: baseDesc, category: baseCat };
  },

  // 應用翻譯至頁面標記了 data-i18n 的元素
  applyToDOM() {
    if (typeof document === "undefined") return;
    const lang = this.getLang();
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-Hant");

    // 更新具備 data-i18n 屬性的元素
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const trans = this.t(key);
      if (trans) el.textContent = trans;
    });

    // 更新具備 data-i18n-placeholder 屬性的輸入框
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      const trans = this.t(key);
      if (trans) el.setAttribute("placeholder", trans);
    });

    // 更新章節前後綴標籤
    const chapPrefix = document.getElementById("chapter-prefix-label");
    const chapSuffix = document.getElementById("chapter-suffix-label");
    if (chapPrefix) chapPrefix.textContent = this.isEn() ? "Ch." : "第";
    if (chapSuffix) chapSuffix.textContent = this.isEn() ? "" : "章";

    // 更新語言切換按鈕文字
    const navLangLabel = document.getElementById("nav-lang-label");
    if (navLangLabel) {
      navLangLabel.textContent = this.isEn() ? "繁中" : "EN";
    }

    // 重新渲染關鍵 UI 組件（書卷選擇器、章節下拉面板、經文區、口味標籤等）
    if (typeof renderBookSelector === "function") renderBookSelector();
    if (typeof renderTasteBadges === "function") renderTasteBadges();
    if (typeof renderScripture === "function") renderScripture();
    if (typeof renderActiveTierContent === "function") renderActiveTierContent();
    if (typeof renderCurriculumBanner === "function") renderCurriculumBanner();

    const langSelectSetting = document.getElementById("setting-language-select");
    if (langSelectSetting) {
      langSelectSetting.value = lang;
    }
  }
};

// 全域掛載
if (typeof window !== "undefined") {
  window.I18n = I18n;
  window.addEventListener("DOMContentLoaded", () => {
    I18n.init();
  });
}
if (typeof global !== "undefined") {
  global.I18n = I18n;
}
