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
      closeBtn: "關閉",
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
      settings_provider_label: "AI 服務通道 (AI Engine Provider)：",
      settings_gemini_sub: "官方免費 · 多模型容錯",
      settings_groq_title: "⚡ Groq (推薦通道)",
      settings_groq_sub: "超極速 500t/s · 永不塞車",
      settings_local_title: "💻 本地離線 AI",
      settings_local_sub: "Ollama / LM Studio · 零依賴",
      settings_gemini_key_label: "Google Gemini API Key (免費)：",
      settings_test_btn: "測試連線",
      settings_gemini_help: "• 可在 <a href=\"https://aistudio.google.com/app/apikey\" target=\"_blank\" class=\"text-amber-800 underline font-semibold\">Google AI Studio</a> 免費申請。<br>• 系統已內建 <strong>5 款備用模型自動轉移機制</strong>（若單一模型繁忙，自動無縫切換備用模型）。",
      settings_primary_model: "調用首選模型 (Primary Model)：",
      model_gemini_25_flash: "gemini-2.5-flash (推薦 · 穩定高可用不易繁忙)",
      model_gemini_25_lite: "gemini-2.5-flash-lite (高吞吐輕量)",
      model_gemini_15_flash: "gemini-1.5-flash (備用)",
      model_gemini_38_flash: "gemini-3.8-flash (2026 最新)",
      settings_groq_key_label: "Groq API Key (100% 免費 · 絕無 High Demand)：",
      settings_groq_help: "• Groq 為世界領先的 LPU AI 推論引擎，速度達 <strong>500 tokens/秒 (1~2秒生成全篇)</strong>！<br>• 100% 免費（每天高達 14,400 次請求），完全不會遇到 Google 繁忙或 High Demand 限制。<br>• 可在 <a href=\"https://console.groq.com/keys\" target=\"_blank\" class=\"text-amber-800 underline font-semibold\">console.groq.com</a> 10秒免費免信用卡申請。",
      settings_groq_model: "Groq 推論模型選擇 (Groq Model)：",
      model_groq_llama70b: "llama-3.3-70b-versatile (推薦 · 旗艦 70B · 深度神學考證 · 穩定在線)",
      model_groq_gpt20b: "openai/gpt-oss-20b (Groq 官方指定 8B 替代模型 · 輕量極速秒出)",
      model_groq_mixtral: "mixtral-8x7b-32768 (MoE 專家架構 · 32K 長上下文)",
      model_groq_gemma: "gemma2-9b-it (Google Gemma 2 9B · 正統嚴謹)",
      settings_local_endpoint: "本地 API 服務端點 (Endpoint URL)：",
      settings_local_help: "• <strong>Ollama 預設端點</strong>：<code>http://localhost:11434/v1</code><br>• <strong>LM Studio 預設端點</strong>：<code>http://localhost:1234/v1</code><br>• <strong>重要跨域配置 (CORS)</strong>：Windows 終端啟動 Ollama 前請執行 <code>$env:OLLAMA_ORIGINS=\"*\" ; ollama serve</code>，允許瀏覽器直接通訊。",
      settings_local_model: "本地推論模型選擇 (Local Model)：",
      settings_local_model_help: "• 點擊上方「💻 測試連線」可自動掃描並載入您電腦 Ollama 已安裝的所有模型。<br>• 可在終端執行 <code>ollama pull qwen3.5:9b</code> 下載最新模型。",
      settings_lang_label: "介面語言 / Interface Language：",
      settings_apibible_title: "API.Bible 金鑰 (NIV, NIrV, CEV 英文經文授權)：",
      settings_apibible_signup: "免費申請 Key ↗",
      settings_apibible_detect: "驗證並偵測 Bible ID",
      settings_apibible_id_placeholder: "自動偵測或手動輸入",
      settings_apibible_desc: "• 填入 API.Bible Key 即可讀取 NIV、NIrV、CEV 等英文譯本，讀取後會自動快取至瀏覽器支援離線閱讀。<br>• 未設定金鑰時，系統仍可隨時使用和合本 (CUV) 全本經文與所有 AI 研經材料。",
      settings_theme_label: "閱讀主題顏色：",
      theme_light: "清新白",
      theme_sepia: "羊皮紙護眼",
      theme_dark: "暗黑模式",
      settings_backup_label: "跨裝置 / 換網址設定備份 (Save & Load API Config)：",
      settings_export_btn: "💾 儲存設定檔 (.json)",
      settings_import_btn: "📂 讀取設定檔 (.json)",
      settings_backup_desc: "• 點擊「保存設置」會自動儲存在當前瀏覽器，下次打開自動讀取。<br>• 若換到 Netlify 新網址、手機或另一台電腦，可先按「💾 儲存設定檔」下載備份，再到新裝置按「📂 讀取設定檔」一秒還原所有 API Key、譯本 ID 與個人口味！",
      settings_save_btn: "保存設置",
      backpackModalTitle: "我的研經背包 (My Backpack)",
      backpackModalDesc: "隨身收納的單張、人物卡與查經資料",
      backpackModalFooter: "本地安全儲存，隨時離線翻閱",
      curriculumModalTitle: "AI 小組主題查經企劃師 (Curriculum Studio)",
      curriculumModalDesc: "針對小組團契的特定牧養主題或生活痛點，由 AI 神學主管為您規劃系列課程：自動安排各堂閱讀經文、神學核心、破冰提問與生活操練。",
      curriculumTopicLabel: "查經主題名稱 (Topic)：",
      curriculumTopicPlaceholder: "例如：職場中的信仰張力與得勝、面對焦慮與情緒低谷...",
      curriculumInspireLabel: "熱門靈感：",
      curriculumSessionsLabel: "堂數規劃：",
      curriculumTargetLabel: "目標對象：",
      curriculumStartBtn: "✨ 立即 AI 生成多堂查經套裝",
      sess_opt_3: "3 堂課 (小專題/退修會)",
      sess_opt_4: "4 堂課 (1 個月小組系列)",
      sess_opt_6: "6 堂課 (半季度門徒造就)",
      sess_opt_8: "8 堂課 (全季度深度系列)",
      target_opt_work: "職場上班族 / 青年團契",
      target_opt_kids: "兒童主日學 / 兒少團契 (Kids & School)",
      target_opt_college: "大專學生 / 青年小組",
      target_opt_family: "家庭夫妻 / 父母團契",
      target_opt_new: "初信信徒 / 門徒班",
      target_opt_menwomen: "弟兄小組 / 姊妹小組",
      target_opt_senior: "長者團契 / 常規小組",
      navShare: "分享",
      shareBtn: "🔗 分享給組員",
      shareModalTitle: "小組查經即時分享 (Share Material)",
      shareScopeLabel: "選擇分享內容：",
      shareScopeTier1: "📄 靈修單張 (組員版)",
      shareScopeTier2: "📚 深度行囊 (組長版)",
      shareScopeAll: "🎒 完整雙層",
      shareQrTitle: "現場手機相機掃描 QR Code：",
      shareQrHint: "團契聚會現場可直接投影或讓組員以手機相機掃描，無需登入、即掃即讀！",
      shareLinkTitle: "分享專屬連結：",
      shareCopyBtn: "複製連結",
      shareCopiedToast: "✅ 查經分享連結已複製！可直接貼至 WhatsApp / LINE 小組群！",
      shareWhatsappBtn: "傳送到 WhatsApp 群組",
      shareNativeBtn: "手機原生分享 (LINE/AirDrop)",

      // 雲端帳號與同步中心 (Auth & Cloud Sync)
      authModalTitle: "雲端帳號與同步中心",
      authModalDesc: "跨設備自動同步您的研經背包與 API 設置",
      authGoogleSignIn: "使用 Google 帳號一鍵登入",
      authOrEmail: "或使用 Email 登入",
      authEmailLabel: "電子郵件 (Email):",
      authPasswordLabel: "設定密碼 (Password):",
      authSignInBtn: "登入帳號",
      authSignUpBtn: "註冊新帳號",
      authMagicLinkBtn: "✨ 免密碼快速登入 (Email 魔法連結)",
      authFreeNotice: "💡 免付費保證：Bible Backpack 堅持提供免費純文字研經儲存。未登入時系統自動使用手機 LocalStorage 離線保存；登入後享受跨手機、電腦自動雲端同步！",
      navAuthLogin: "登入",
      authSyncNowBtn: "立即雙向手動同步 (Sync Now)",
      authManageSettingsBtn: "管理我的 API Keys 與模型設置",
      authSignOutBtn: "🚪 登出帳號 (切換回本地訪客模式)"
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
      apiBibleKeyPlaceholder: "Paste API Key from scripture.api.bible...",
      apiBibleHelp: "Free signup at scripture.api.bible gives access to NIV, NIrV, CEV and more translations.",
      autoDetectBibleIds: "🔍 Auto-Detect Bible IDs",
      languageSelect: "Interface Language",
      langZh: "繁體中文 (Traditional Chinese)",
      langEn: "English",
      bibleVersion: "Bible Translation",
      versionCuv: "CUV (和合本)",
      versionNiv: "NIV (New International Version)",
      versionNirv: "NIrV (Reader's Version - Easy/Kids)",
      versionCev: "CEV (Contemporary English Version)",
      tabTier1: "Devotional Study Sheet",
      tabTier1Sub: "(1-2 Pages)",
      tabTier2: "In-Depth Study Dossier",
      tabTier2Sub: "(Leader Guide)",
      reGenerate: "✨ Re-generate",
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
      curriculumReturn: "📋 Back to Curriculum",
      curriculumExit: "✕ Exit Topic",
      exploreKeyGuideTitle: "Ready to Prepare Scripture",
      fontSizeSm: "S",
      fontSizeBase: "M",
      fontSizeLg: "L",
      tasteModalTitle: "Study Lenses & Taste Mixer",
      tasteModalDesc: "Tailor the theological perspective to your interests and life context naturally",
      tasteCategoryLabel: "Select Study Lenses (Multi-select):",
      customTasteLabel: "Custom Interest / Domain / Grade (Optional):",
      customTastePlaceholder: "e.g., 3rd Grade Sunday School, school friendships, software engineer, love astronomy...",
      customTasteHelp: "AI will incorporate these contexts into analogies, discussion questions, and life takeaways.",
      saveTasteSettings: "Save Preferences",
      cancel: "Cancel",
      closeBtn: "Close",
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
      settings_provider_label: "AI Engine Provider:",
      settings_gemini_sub: "Official Free · Multi-Model Failover",
      settings_groq_title: "⚡ Groq (Recommended)",
      settings_groq_sub: "Ultra-Fast 500t/s · No Queue",
      settings_local_title: "💻 Local Offline AI",
      settings_local_sub: "Ollama / LM Studio · Offline",
      settings_gemini_key_label: "Google Gemini API Key (Free):",
      settings_test_btn: "Test Connection",
      settings_gemini_help: "• Get a free API Key from <a href=\"https://aistudio.google.com/app/apikey\" target=\"_blank\" class=\"text-amber-800 underline font-semibold\">Google AI Studio</a>.<br>• Built-in <strong>5-model automatic failover</strong> seamlessly switches models if one is busy.",
      settings_primary_model: "Primary Gemini Model:",
      model_gemini_25_flash: "gemini-2.5-flash (Recommended · High Availability)",
      model_gemini_25_lite: "gemini-2.5-flash-lite (High-Throughput Lightweight)",
      model_gemini_15_flash: "gemini-1.5-flash (Fallback)",
      model_gemini_38_flash: "gemini-3.8-flash (Latest 2026)",
      settings_groq_key_label: "Groq API Key (100% Free · Zero High-Demand Blocks):",
      settings_groq_help: "• Groq LPU inference engine delivers <strong>500 tokens/sec (full study pack in 1–2s)</strong>!<br>• 100% free (up to 14,400 requests/day) with zero high-demand throttling.<br>• Get a free key in 10 seconds at <a href=\"https://console.groq.com/keys\" target=\"_blank\" class=\"text-amber-800 underline font-semibold\">console.groq.com</a> (no credit card required).",
      settings_groq_model: "Groq Inference Model:",
      model_groq_llama70b: "llama-3.3-70b-versatile (Recommended · Flagship 70B · Deep Exegesis)",
      model_groq_gpt20b: "openai/gpt-oss-20b (Ultra-Fast Lightweight Model)",
      model_groq_mixtral: "mixtral-8x7b-32768 (MoE Architecture · 32K Context)",
      model_groq_gemma: "gemma2-9b-it (Google Gemma 2 9B · Orthodox & Precise)",
      settings_local_endpoint: "Local API Endpoint URL:",
      settings_local_help: "• <strong>Ollama Default</strong>: <code>http://localhost:11434/v1</code><br>• <strong>LM Studio Default</strong>: <code>http://localhost:1234/v1</code><br>• <strong>CORS Setup</strong>: Before starting Ollama on Windows, run <code>$env:OLLAMA_ORIGINS=\"*\" ; ollama serve</code> to allow browser requests.",
      settings_local_model: "Local Inference Model:",
      settings_local_model_help: "• Click '💻 Test Connection' above to auto-scan all models installed in your local Ollama.<br>• Run <code>ollama pull qwen3.5:9b</code> in terminal to download.",
      settings_lang_label: "Interface Language:",
      settings_apibible_title: "API.Bible API Key (NIV / NIrV / CEV Scripture):",
      settings_apibible_signup: "Get Free Key ↗",
      settings_apibible_detect: "Verify & Detect Bible IDs",
      settings_apibible_id_placeholder: "Auto-detect or enter ID",
      settings_apibible_desc: "• Enter your API.Bible Key to read NIV, NIrV, CEV translations with instant offline caching.<br>• Without a key, Chinese Union Version (CUV) full Bible and all AI features remain completely accessible.",
      settings_theme_label: "Reading Theme:",
      theme_light: "Light",
      theme_sepia: "Sepia",
      theme_dark: "Dark",
      settings_backup_label: "Save & Load API Configuration File (Cross-Device / Netlify Sync):",
      settings_export_btn: "💾 Save Config File (.json)",
      settings_import_btn: "📂 Load Config File (.json)",
      settings_backup_desc: "• Clicking \"Save Settings\" automatically saves to this browser.<br>• Moving to Netlify, a phone, or another browser? Click \"💾 Save Config File\" to download your keys & preferences, then click \"📂 Load Config File\" on the new site to restore everything in 1 click!",
      settings_save_btn: "Save Settings",
      backpackModalTitle: "My Study Backpack",
      backpackModalDesc: "Saved study sheets, character cards & archaeological notes",
      backpackModalFooter: "Stored locally for offline access anytime",
      curriculumModalTitle: "AI Thematic Curriculum Studio",
      curriculumModalDesc: "Design a multi-session small group study series tailored to your fellowship's topic or life needs—complete with scripture progression, theological core, icebreakers, and life practices.",
      curriculumTopicLabel: "Curriculum Topic:",
      curriculumTopicPlaceholder: "e.g., Faith in the Workplace, Overcoming Anxiety & Fear, Courage at School...",
      curriculumInspireLabel: "Popular Ideas:",
      curriculumSessionsLabel: "Number of Sessions:",
      curriculumTargetLabel: "Target Group:",
      curriculumStartBtn: "✨ Generate Multi-Session Curriculum",
      sess_opt_3: "3 Sessions (Retreat / Mini-Series)",
      sess_opt_4: "4 Sessions (1-Month Small Group Series)",
      sess_opt_6: "6 Sessions (Half-Quarter Discipleship)",
      sess_opt_8: "8 Sessions (Full-Quarter In-Depth Series)",
      target_opt_work: "Working Professionals / Young Adults",
      target_opt_kids: "Sunday School / Kids & Youth (Kids & School)",
      target_opt_college: "College & University Fellowship",
      target_opt_family: "Couples & Parents Fellowship",
      target_opt_new: "New Believers / Discipleship Class",
      target_opt_menwomen: "Men's / Women's Small Group",
      target_opt_senior: "Senior Fellowship / General Group",
      navShare: "Share",
      shareBtn: "🔗 Share with Group",
      shareModalTitle: "Share Study Material (Zero-Server)",
      shareScopeLabel: "Select Content to Share:",
      shareScopeTier1: "📄 Devotional Sheet (Member)",
      shareScopeTier2: "📚 In-Depth Dossier (Leader)",
      shareScopeAll: "🎒 Complete (Both)",
      shareQrTitle: "Scan QR Code on Mobile Phone:",
      shareQrHint: "Group members can scan with their phone camera to load immediately—no registration needed!",
      shareLinkTitle: "Shareable Link:",
      shareCopyBtn: "Copy Link",
      shareCopiedToast: "✅ Share link copied! Ready to paste into group chat.",
      shareWhatsappBtn: "Send to WhatsApp Group",
      shareNativeBtn: "Share via Apps (AirDrop/LINE)",

      // Auth & Cloud Sync
      authModalTitle: "Cloud Account & Sync Center",
      authModalDesc: "Automatically sync your study backpack and API settings across devices",
      authGoogleSignIn: "Continue with Google",
      authOrEmail: "or sign in with Email",
      authEmailLabel: "Email Address:",
      authPasswordLabel: "Password:",
      authSignInBtn: "Sign In",
      authSignUpBtn: "Create Account",
      authMagicLinkBtn: "✨ Passwordless Sign-in (Magic Link)",
      authFreeNotice: "💡 Zero-Cost Guarantee: Bible Backpack provides free text-based study storage. Guest mode saves offline in LocalStorage; logging in syncs seamlessly across devices!",
      navAuthLogin: "Login",
      authSyncNowBtn: "Sync Now",
      authManageSettingsBtn: "Manage API Keys & AI Models",
      authSignOutBtn: "🚪 Log Out (Switch to Local Guest Mode)"
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

    // 更新具備 data-i18n 屬性的元素（若包含 HTML 標籤則使用 innerHTML）
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const trans = this.t(key);
      if (trans !== undefined && trans !== "") {
        if (trans.includes("<") && trans.includes(">")) {
          el.innerHTML = trans;
        } else {
          el.textContent = trans;
        }
      }
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

    // 重新渲染關鍵 UI 組件（書卷選擇器、章節下拉面板、經文區、口味標籤、口味彈窗列表、背包中心等）
    if (typeof renderBookSelector === "function") renderBookSelector();
    if (typeof renderTasteBadges === "function") renderTasteBadges();
    if (typeof renderTasteOptionsList === "function") renderTasteOptionsList();
    if (typeof updateBackpackBadge === "function") updateBackpackBadge();
    if (typeof renderBackpackHub === "function") renderBackpackHub();
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
