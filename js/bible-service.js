// Bible Backpack 多譯本聖經服務 (Multi-Translation Bible Service)
// 支援 和合本 (CUV 離線)、NIV、NIrV、CEV (透過 API.Bible 即時讀取與永久離線快取)

const BibleService = {
  bibleData: null,
  isLoading: false,
  loadPromise: null,
  pendingFetchKey: null,

  // 初始化並非同步加載全本和合本聖經 JSON
  async init() {
    if (this.bibleData) return this.bibleData;
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        const resp = await fetch("data/bible_cuv.json");
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        this.bibleData = await resp.json();
        console.log("✅ 全本聖經 (和合本 66 卷) 本地數據載入完畢！");
        return this.bibleData;
      } catch (err) {
        console.warn("未能加載 data/bible_cuv.json:", err);
        return null;
      } finally {
        this.isLoading = false;
      }
    })();

    return this.loadPromise;
  },

  // 輔助函式：根據中英文書名或 USFM ID 獲取書卷元數據
  getBookMeta(bookIdentifier) {
    if (typeof BIBLE_BOOKS === "undefined") return null;
    const idStr = String(bookIdentifier || "").trim().toLowerCase();
    return BIBLE_BOOKS.find(b => 
      b.name === bookIdentifier || 
      b.english.toLowerCase() === idStr || 
      b.id.toLowerCase() === idStr
    ) || BIBLE_BOOKS[0];
  },

  // 獲取指定書卷與章節的經文列表 (支援 CUV, NIV, NIrV, CEV)
  // 返回格式：[ { num: 1, text: "經文..." }, { num: 2, text: "..." } ]
  getChapterVerses(bookIdentifier, chapter, version = null) {
    const chapStr = String(chapter);
    const ver = (version || BackpackStore.getBibleVersion() || "cuv").toLowerCase();
    const bookMeta = this.getBookMeta(bookIdentifier);
    const bookNameZh = bookMeta ? bookMeta.name : bookIdentifier;
    const bookNameEn = bookMeta ? bookMeta.english : bookIdentifier;
    const usfmCode = bookMeta ? bookMeta.id.toUpperCase() : "GEN";

    // 1. 若選擇和合本 (CUV)
    if (ver === "cuv") {
      if (this.bibleData && this.bibleData[bookNameZh] && this.bibleData[bookNameZh][chapStr]) {
        const verseArray = this.bibleData[bookNameZh][chapStr];
        return verseArray.map((text, idx) => ({
          num: idx + 1,
          text: text.trim()
        }));
      }
      return [
        { num: 1, text: `（正在載入《${bookNameZh}》第 ${chapter} 章經文...）` }
      ];
    }

    // 2. 若選擇英文譯本 (NIV, NIrV, CEV)
    // 2.1 優先檢查本地永久快取 (0 毫秒極速載入)
    const cached = BackpackStore.getCachedChapterVerses(ver, usfmCode, chapter);
    if (cached && cached.length > 0) {
      return cached;
    }

    // 2.2 檢查是否有配置 API.Bible Key
    const apiKey = BackpackStore.getApiBibleKey();
    if (!apiKey) {
      const isEn = typeof I18n !== "undefined" && I18n.isEn();
      return [
        {
          num: 1,
          text: isEn 
            ? `[API Key Required] Please configure your free API.Bible Key in Settings (⚙️) to read ${ver.toUpperCase()} text, or switch to CUV (和合本).` 
            : `【需要 API Key】請點擊右上角「⚙️ 設置」填寫 API.Bible 金鑰以連線讀取 ${ver.toUpperCase()}，或切換為「和合本 (CUV)」。`,
          isNotice: true
        }
      ];
    }

    // 2.3 觸發非同步拉取
    const fetchKey = `${ver}_${usfmCode}_${chapter}`;
    if (this.pendingFetchKey !== fetchKey) {
      this.pendingFetchKey = fetchKey;
      this.fetchFromApiBible(ver, usfmCode, chapter, apiKey).then(verses => {
        this.pendingFetchKey = null;
        if (verses && verses.length > 0 && typeof renderScripture === "function") {
          renderScripture();
        }
      }).catch(err => {
        this.pendingFetchKey = null;
        console.error("API.Bible 讀取失敗:", err);
      });
    }

    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    return [
      { 
        num: 1, 
        text: isEn 
          ? `(Loading ${ver.toUpperCase()} ${bookNameEn} chapter ${chapter} from API.Bible...)` 
          : `(正在透過 API.Bible 載入 ${ver.toUpperCase()}《${bookNameZh}》第 ${chapter} 章...)` 
      }
    ];
  },

  // 向 API.Bible 發起請求讀取章節
  async fetchFromApiBible(version, usfmCode, chapter, apiKey) {
    const bibleId = BackpackStore.getApiBibleId(version);
    if (!bibleId) {
      console.warn(`未配置 ${version} 之 Bible ID`);
      return null;
    }

    const chapterId = `${usfmCode}.${chapter}`;
    const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=html&include-verse-numbers=true`;

    const resp = await fetch(url, {
      method: "GET",
      headers: { "api-key": apiKey }
    });

    if (!resp.ok) {
      throw new Error(`API.Bible HTTP ${resp.status} (${resp.statusText})`);
    }

    const json = await resp.json();
    const html = json.data?.content || "";
    const verses = this.parseVersesFromHtml(html);

    if (verses && verses.length > 0) {
      BackpackStore.saveCachedChapterVerses(version, usfmCode, chapter, verses);
      console.log(`✅ 已快取【${version.toUpperCase()} ${usfmCode} ${chapter}】共 ${verses.length} 節經文至本地！`);
      return verses;
    }
    return null;
  },

  // 從 API.Bible HTML 內容中精準萃取節數與經文
  parseVersesFromHtml(htmlContent) {
    if (!htmlContent) return [];
    try {
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        const versesMap = new Map();

        // 方法一：透過 data-usfm 屬性萃取 (標準 API.Bible 規範)
        const usfmElements = doc.querySelectorAll("[data-usfm]");
        if (usfmElements && usfmElements.length > 0) {
          usfmElements.forEach(el => {
            const usfm = el.getAttribute("data-usfm") || "";
            const parts = usfm.split(".");
            if (parts.length >= 3) {
              const verseNum = parseInt(parts[2], 10);
              if (!isNaN(verseNum)) {
                const clone = el.cloneNode(true);
                clone.querySelectorAll(".note, .f, .x, .v, .s, .s1, .r, .d").forEach(n => n.remove());
                const text = clone.textContent.trim().replace(/\s+/g, " ");
                if (text) {
                  if (versesMap.has(verseNum)) {
                    versesMap.set(verseNum, versesMap.get(verseNum) + " " + text);
                  } else {
                    versesMap.set(verseNum, text);
                  }
                }
              }
            }
          });
        }

        // 方法二：備用匹配 span.v (節數標籤)
        if (versesMap.size === 0) {
          doc.querySelectorAll(".p, p, .q, .q1, .q2").forEach(block => {
            const vSpans = block.querySelectorAll("span.v");
            vSpans.forEach(span => {
              const vNum = parseInt(span.textContent.trim(), 10);
              if (!isNaN(vNum)) {
                let text = "";
                let curr = span.nextSibling;
                while (curr && !(curr.nodeType === 1 && (curr.classList.contains("v") || curr.hasAttribute("data-usfm")))) {
                  if (curr.nodeType === 1) {
                    if (!curr.classList.contains("note") && !curr.classList.contains("f") && !curr.classList.contains("x")) {
                      text += curr.textContent;
                    }
                  } else if (curr.nodeType === 3) {
                    text += curr.textContent;
                  }
                  curr = curr.nextSibling;
                }
                text = text.trim().replace(/\s+/g, " ");
                if (text) {
                  versesMap.set(vNum, (versesMap.get(vNum) ? versesMap.get(vNum) + " " : "") + text);
                }
              }
            });
          });
        }

        if (versesMap.size > 0) {
          return Array.from(versesMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([num, text]) => ({ num, text }));
        }
      }
    } catch (e) {
      console.warn("DOMParser 出錯，嘗試正則表達式解析:", e);
    }

    // 正則表達式容錯備用解析 (Node.js 或極簡環境)
    try {
      const verses = [];
      const vRegex = /<span[^>]*class=["']v["'][^>]*>(\d+)<\/span>([^<]+)/gi;
      let match;
      while ((match = vRegex.exec(htmlContent)) !== null) {
        const num = parseInt(match[1], 10);
        const text = match[2].trim().replace(/\s+/g, " ");
        if (num && text) {
          verses.push({ num, text });
        }
      }
      return verses;
    } catch (reErr) {
      console.error("正則解析經文失敗:", reErr);
      return [];
    }
  },

  // 自動依 API Key 偵測可用之 NIV, NIrV, CEV Bible ID
  async detectBibleIds(apiKey) {
    if (!apiKey) throw new Error("請先提供 API.Bible Key");
    const resp = await fetch("https://api.scripture.api.bible/v1/bibles", {
      headers: { "api-key": apiKey }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: 驗證失敗，請檢查 API Key`);

    const json = await resp.json();
    const bibles = json.data || [];
    const detected = {};

    bibles.forEach(b => {
      const abbr = (b.abbreviation || "").toLowerCase();
      const name = (b.name || "").toLowerCase();

      if (!detected.niv && (abbr === "niv" || name.includes("new international version"))) {
        detected.niv = { id: b.id, name: b.name, abbr: b.abbreviation };
        BackpackStore.setApiBibleId("niv", b.id);
      }
      if (!detected.nirv && (abbr === "nirv" || name.includes("reader's") || name.includes("reader’s"))) {
        detected.nirv = { id: b.id, name: b.name, abbr: b.abbreviation };
        BackpackStore.setApiBibleId("nirv", b.id);
      }
      if (!detected.cev && (abbr === "cev" || name.includes("contemporary english version"))) {
        detected.cev = { id: b.id, name: b.name, abbr: b.abbreviation };
        BackpackStore.setApiBibleId("cev", b.id);
      }
    });

    return detected;
  },

  // 全經文關鍵字快速檢索 (和合本)
  search(keyword, maxResults = 30) {
    if (!this.bibleData || !keyword || !keyword.trim()) return [];
    const term = keyword.trim();
    const results = [];

    for (const [bookName, chapters] of Object.entries(this.bibleData)) {
      for (const [chapNum, verses] of Object.entries(chapters)) {
        verses.forEach((vText, vIdx) => {
          if (vText.includes(term) && results.length < maxResults) {
            results.push({
              book: bookName,
              chapter: parseInt(chapNum),
              verse: vIdx + 1,
              text: vText
            });
          }
        });
        if (results.length >= maxResults) break;
      }
      if (results.length >= maxResults) break;
    }

    return results;
  }
};

// 頁面加載時自動在背景初始化聖經數據庫
if (typeof window !== "undefined") {
  window.BibleService = BibleService;
  window.addEventListener("DOMContentLoaded", () => {
    BibleService.init().then(() => {
      if (typeof currentBook !== "undefined" && typeof currentChapter !== "undefined" && typeof renderScripture === "function") {
        renderScripture();
      }
    });
  });
}
if (typeof global !== "undefined") {
  global.BibleService = BibleService;
}
