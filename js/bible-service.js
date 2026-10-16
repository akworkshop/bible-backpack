// Bible Backpack 全本聖經和合本 (CUV) 本地數據服務
// 支援 66 卷書、1189 章節、31,102 節經文的瞬間極速切換與離線檢索

const BibleService = {
  bibleData: null,
  isLoading: false,
  loadPromise: null,

  // 初始化並非同步加載全本聖經 JSON
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
        console.warn("未能加載 data/bible_cuv.json，將使用預載經典數據:", err);
        return null;
      } finally {
        this.isLoading = false;
      }
    })();

    return this.loadPromise;
  },

  // 獲取指定書卷與章節的經文列表
  // 返回格式：[ { num: 1, text: "經文..." }, { num: 2, text: "..." } ]
  getChapterVerses(bookName, chapter) {
    const chapStr = String(chapter);

    // 1. 若全本數據庫已就緒
    if (this.bibleData && this.bibleData[bookName] && this.bibleData[bookName][chapStr]) {
      const verseArray = this.bibleData[bookName][chapStr];
      return verseArray.map((text, idx) => ({
        num: idx + 1,
        text: text.trim()
      }));
    }

    // 2. 備用：若命中了四大預載經典包 (約書亞記 1, 創世記 1, 詩篇 23, 羅馬書 8)
    if (typeof getPresetPack === "function") {
      const preset = getPresetPack(bookName, chapter);
      if (preset && preset.verses) {
        return preset.verses;
      }
    }

    // 3. 正在異步加載時的臨時占位
    return [
      { num: 1, text: `（正在載入《${bookName}》第 ${chapter} 章經文...）` }
    ];
  },

  // 全經文關鍵字快速檢索
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
  window.addEventListener("DOMContentLoaded", () => {
    BibleService.init().then(() => {
      // 若當前有經文區，主動依本地經文庫刷新以呈現最完整和合本
      if (typeof currentBook !== "undefined" && typeof currentChapter !== "undefined" && typeof renderScripture === "function") {
        renderScripture();
      }
    });
  });
}
