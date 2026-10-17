// Bible Backpack 本地數據存儲與狀態管理器 (Local State Management)

const BackpackStore = {
  // 默認研經口味標籤庫
  AVAILABLE_TASTES: [
    { id: "kids", name: "兒少校園", category: "年齡應用", icon: "🎒", desc: "學校生活比喻、同儕相處、勇氣挑戰與趣味互動" },
    { id: "archaeology", name: "古代考古", category: "學科視角", icon: "🏺", desc: "發掘現場、出土文物與古城實貌" },
    { id: "history", name: "歷史政經", category: "學科視角", icon: "🏛️", desc: "時代帝國背景與古代近東盟約法理" },
    { id: "science", name: "自然科學", category: "學科視角", icon: "🔬", desc: "水文地貌、生態環境與客觀規律" },
    { id: "math_logic", name: "數學邏輯", category: "學科視角", icon: "📐", desc: "經文對稱結構(Chiasm)與理性因果" },
    { id: "psychology", name: "心理認知", category: "學科視角", icon: "🧠", desc: "領袖抉擇、克服恐懼與認知行為" },
    { id: "teacher", name: "小組導師", category: "實用帶領", icon: "🎓", desc: "破冰提問、帶領節奏與難題備忘" },
    { id: "scifi", name: "科幻宏大", category: "閱讀偏好", icon: "🚀", desc: "跨時空維度、廣袤世界觀與開拓者視角" },
    { id: "mystery", name: "懸疑推論", category: "閱讀偏好", icon: "🔍", desc: "經文伏筆拆解與因果關聯推導" },
    { id: "meditation", name: "心靈默想", category: "靈修風格", icon: "🌿", desc: "安靜沉澱、禱告反思與生命共鳴" }
  ],

  // 獲取當前用戶勾選的口味
  getTastes() {
    try {
      const data = localStorage.getItem("bible_backpack_tastes");
      return data ? JSON.parse(data) : ["science", "math_logic", "archaeology", "teacher"];
    } catch (e) {
      return ["science", "math_logic", "archaeology", "teacher"];
    }
  },

  // 保存口味選擇
  saveTastes(tasteIds, customKeywords = "") {
    localStorage.setItem("bible_backpack_tastes", JSON.stringify(tasteIds));
    localStorage.setItem("bible_backpack_custom_taste", customKeywords);
  },

  getCustomTaste() {
    return localStorage.getItem("bible_backpack_custom_taste") || "";
  },

  // 獲取收藏的材料卡片列表
  getSavedItems() {
    try {
      const data = localStorage.getItem("bible_backpack_saved_items");
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // 收藏 / 取消收藏特定材料
  toggleSaveItem(item) {
    const items = this.getSavedItems();
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items.splice(index, 1);
      localStorage.setItem("bible_backpack_saved_items", JSON.stringify(items));
      return false; // 已移除
    } else {
      items.unshift({ ...item, savedAt: new Date().toISOString() });
      localStorage.setItem("bible_backpack_saved_items", JSON.stringify(items));
      return true; // 已添加
    }
  },

  isItemSaved(itemId) {
    const items = this.getSavedItems();
    return items.some(i => i.id === itemId);
  },

  // 自訂主題查經系列套裝 (Thematic Curriculum Study Packs)
  getStudyPacks() {
    try {
      const data = localStorage.getItem("bible_backpack_packs");
      if (data) return JSON.parse(data);
    } catch (e) {}

    // 內建兩套高質量示範主題課程套裝
    return [
      {
        id: "pack-workplace",
        title: "職場張力與得勝信靠",
        subtitle: "在競爭與高壓中活出基督徒的屬天呼召",
        target: "職場上班族 / 青年大專團契",
        sessionCount: 4,
        createdAt: "2026-10-15",
        overview: "針對現代職場的競爭、倦怠、暗室誘惑與人際張力，透過聖經歷史人物與神學真理，建立札實的職場事奉觀。",
        sessions: [
          {
            sessionNum: 1,
            title: "第 1 堂：荒蕪中的呼召與剛強承擔",
            bookName: "約書亞記",
            chapter: 1,
            passageRange: "約書亞記 1:1-9",
            coreMessage: "領袖交接與未知前途：在焦慮中抓住神的話語與同在應許",
            discussionTheme: "面對全新未知任務或交接，如何以神的應許代替內在恐懼",
            icebreaker: "分享你在工作中面臨過最迷茫的一次全新任務或交接？",
            lifeAction: "本週在開工前默想約書亞記 1:9，記錄一次克服擔憂的經歷。"
          },
          {
            sessionNum: 2,
            title: "第 2 堂：在暗室與不公中持守公義",
            bookName: "創世記",
            chapter: 39,
            passageRange: "創世記 39:1-23",
            coreMessage: "約瑟在波提乏家的試煉：如何面對職場中的不公對待與暗室誘惑",
            discussionTheme: "即使不為人看見，仍因敬畏神而守住誠實道德底線",
            icebreaker: "在職場或社會中，堅持原則是否曾讓你吃過虧？",
            lifeAction: "檢視自己工作中的一處灰色地帶，立志尊榮神行事光明。"
          },
          {
            sessionNum: 3,
            title: "第 3 堂：挫折失敗中的心理韌性",
            bookName: "羅馬書",
            chapter: 8,
            passageRange: "羅馬書 8:26-39",
            coreMessage: "聖靈的歎息代求與萬事互相效力：重塑面對挫折失敗的內心韌性",
            discussionTheme: "當業績或專案不如意時，深知基督的愛無可隔絕，得勝有餘",
            icebreaker: "當工作遭遇重大挫折時，你通常如何消化負面情緒？",
            lifeAction: "為一位在職場中遭遇低潮的同事或組員代禱並送上一句鼓勵。"
          },
          {
            sessionNum: 4,
            title: "第 4 堂：敵前筵席與好牧人的安歇",
            bookName: "詩篇",
            chapter: 23,
            passageRange: "詩篇 23:1-6",
            coreMessage: "從過度追求成就轉向好牧人的安歇：建立有界限與盼望的安息節奏",
            discussionTheme: "在忙碌節奏中劃出安息界限，享受神親自擺設的屬靈筵席",
            icebreaker: "如果能完全放空一整天，你最渴望神如何恢復你的力量？",
            lifeAction: "本週設定一個無手機干擾的 30 分鐘安靜水邊默想時光。"
          }
        ]
      },
      {
        id: "pack-valley",
        title: "走出情緒幽谷與生命重建",
        subtitle: "在耗竭困頓中經歷神微聲的同在與扶持",
        target: "全人關懷小組 / 弟兄姊妹互勉",
        sessionCount: 4,
        createdAt: "2026-10-15",
        overview: "引導組員正視內心的疲憊、抑鬱與孤獨，學習如先知大衛和以利亞般向神傾心吐意，重尋生命之錨。",
        sessions: [
          {
            sessionNum: 1,
            title: "第 1 堂：羅騰樹下的枯竭與微聲",
            bookName: "列王紀上",
            chapter: 19,
            passageRange: "列王紀上 19:1-18",
            coreMessage: "以利亞的耗竭與求死：神如何以飲食、睡眠與微小的聲音醫治疲憊的靈魂",
            discussionTheme: "接納自我的軟弱極限，在神面前卸下所有偽裝",
            icebreaker: "當你精力完全歸零時，身體最先出現的信號是什麼？",
            lifeAction: "今晚提早 1 小時就寢，向神做一個交託身體與擔子的禱告。"
          },
          {
            sessionNum: 2,
            title: "第 2 堂：向自己的靈魂對話",
            bookName: "詩篇",
            chapter: 42,
            passageRange: "詩篇 42:1-11",
            coreMessage: "『我的心哪，你為何憂悶？』以真理駁斥謊言，在乾渴中渴慕神",
            discussionTheme: "學習不被情緒牽著走，而是用神的話語引導情緒走向讚美",
            icebreaker: "最近腦海中最常重複出現的一句消極自我對話是什麼？",
            lifeAction: "抄寫詩篇 42:11 貼在鏡子或桌前，每天清晨向心靈朗讀一次。"
          },
          {
            sessionNum: 3,
            title: "第 3 堂：身上的刺與夠用的恩典",
            bookName: "哥林多後書",
            chapter: 12,
            passageRange: "哥林多後書 12:1-10",
            coreMessage: "保羅三次求刺離開：神的恩典是在人的軟弱上顯得完全",
            discussionTheme: "重新理解苦難與局限的價值，在不完美中誇耀基督的大能",
            icebreaker: "你生命中是否有過一個『神沒有按你所求挪去』的難處？",
            lifeAction: "為生活中那根難耐的『刺』獻上一次感恩，思想神要藉此教導你什麼。"
          },
          {
            sessionNum: 4,
            title: "第 4 堂：等候神必如鷹展翅上騰",
            bookName: "以賽亞書",
            chapter: 40,
            passageRange: "以賽亞書 40:27-31",
            coreMessage: "疲乏的祂賜能力，軟弱的祂加力量：等候耶和華的必重新得力",
            discussionTheme: "在安靜等候中經歷神聖的能量置換，奔跑卻不困倦",
            icebreaker: "用一個大自然的比喻形容你對『重新得力』的渴望？",
            lifeAction: "在小組中找一位同伴結成『守望同行對子』，每週互傳一條代禱短訊。"
          }
        ]
      }
    ];
  },

  saveStudyPack(pack) {
    const packs = this.getStudyPacks();
    const existingIdx = packs.findIndex(p => p.id === pack.id);
    if (existingIdx >= 0) {
      packs[existingIdx] = pack;
    } else {
      packs.unshift(pack);
    }
    localStorage.setItem("bible_backpack_packs", JSON.stringify(packs));
    return pack;
  },

  deleteStudyPack(id) {
    const packs = this.getStudyPacks().filter(p => p.id !== id);
    localStorage.setItem("bible_backpack_packs", JSON.stringify(packs));
  },

  createStudyPack(title) {
    const newPack = {
      id: "pack-" + Date.now(),
      title,
      sessionCount: 0,
      createdAt: new Date().toLocaleDateString(),
      sessions: []
    };
    return this.saveStudyPack(newPack);
  },

  // Gemini API Key 管理
  getApiKey() {
    return localStorage.getItem("bible_backpack_gemini_key") || "";
  },

  setApiKey(key) {
    localStorage.setItem("bible_backpack_gemini_key", (key || "").trim());
  },

  // 模型選擇（預設最新極速 gemini-3.8-flash）
  getModelName() {
    return localStorage.getItem("bible_backpack_model_name") || "gemini-3.8-flash";
  },

  setModelName(model) {
    localStorage.setItem("bible_backpack_model_name", (model || "gemini-3.8-flash").trim());
  },

  // 閱讀偏好（字體大小、主題模式）
  getTheme() {
    return localStorage.getItem("bible_backpack_theme") || "light";
  },

  setTheme(theme) {
    localStorage.setItem("bible_backpack_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  },

  getFontSize() {
    return localStorage.getItem("bible_backpack_font_size") || "base";
  },

  setFontSize(size) {
    localStorage.setItem("bible_backpack_font_size", size);
  },

  // 記錄與讀取用戶最後一次打開的書卷與章節（首次進入預設為《創世記》第 1 章）
  getLastLocation() {
    try {
      const saved = localStorage.getItem("bible_backpack_last_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.book && parsed.chapter) {
          return { book: parsed.book, chapter: parseInt(parsed.chapter) || 1 };
        }
      }
    } catch (e) {}
    return { book: "創世記", chapter: 1 };
  },

  setLastLocation(book, chapter) {
    try {
      localStorage.setItem("bible_backpack_last_location", JSON.stringify({
        book: book || "創世記",
        chapter: parseInt(chapter) || 1
      }));
    } catch (e) {}
  },

  // AI 供應商設定 ("gemini" 或 "groq" 或 "custom")
  getProvider() {
    return localStorage.getItem("bible_backpack_ai_provider") || "gemini";
  },

  setProvider(provider) {
    localStorage.setItem("bible_backpack_ai_provider", provider || "gemini");
  },

  getGroqKey() {
    return localStorage.getItem("bible_backpack_groq_key") || "";
  },

  setGroqKey(key) {
    localStorage.setItem("bible_backpack_groq_key", (key || "").trim());
  },

  getGroqModel() {
    return localStorage.getItem("bible_backpack_groq_model") || "llama-3.3-70b-versatile";
  },

  setGroqModel(model) {
    localStorage.setItem("bible_backpack_groq_model", (model || "llama-3.3-70b-versatile").trim());
  },

  // 本地離線 AI 設定 (Ollama / LM Studio)
  getLocalEndpoint() {
    return localStorage.getItem("bible_backpack_local_endpoint") || "http://localhost:11434/v1";
  },

  setLocalEndpoint(url) {
    localStorage.setItem("bible_backpack_local_endpoint", (url || "http://localhost:11434/v1").trim());
  },

  getLocalModel() {
    return localStorage.getItem("bible_backpack_local_model") || "qwen3.5:9b";
  },

  setLocalModel(model) {
    localStorage.setItem("bible_backpack_local_model", (model || "qwen3.5:9b").trim());
  },

  // 本地研經材料持久緩存 (避免重複調配消耗額度與等待)
  getCachedPack(book, chapter, tasteHash = "default") {
    try {
      const key = `bible_pack_cache_${book}_${chapter}_${tasteHash}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveCachedPack(book, chapter, tasteHash = "default", packData) {
    try {
      const key = `bible_pack_cache_${book}_${chapter}_${tasteHash}`;
      localStorage.setItem(key, JSON.stringify(packData));
    } catch (e) {}
  }
};
