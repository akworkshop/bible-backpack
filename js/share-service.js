// ==============================================================================
// Bible Backpack — 小組查經資料即時分享服務 (Share Service)
// 支援：
// 1. 6 位極速小組碼與高清晰 QR Code (45 字元極速掃描，手機相機 0.05 秒秒開)
// 2. 雙向零後端直讀 (ntfy.sh 公開即時中繼 + 本地 LZString 離線直鏈備援)
// 3. 一鍵 WhatsApp 群組轉發、手機原生分享 (AirDrop/LINE)、離線 .json 備份
// 4. 自動載入與雙層材料 (Tier 1 靈修單張 + Tier 2 深度行囊) 完整渲染
// ==============================================================================

const ShareService = {
  activeMode: "tier1", // "tier1", "tier2", "all"
  currentShareUrl: "",
  currentShareCode: "",
  qrcodeInstance: null,

  // 初始化：檢查網址中是否帶有小組長分享的查經資料
  init() {
    return this.checkUrlForSharedPack();
  },

  // 緊湊序列化研經資料 (同時保留 Tier 1 與 Tier 2 完整精華)
  compactStudyData(studyData, mode = "tier1") {
    if (!studyData) return null;

    const curContext = typeof activeCurriculumContext !== "undefined" ? activeCurriculumContext : null;

    const payload = {
      v: 2,
      b: studyData.bookName || currentBook,
      c: studyData.chapter || currentChapter,
      m: mode || "tier1",
      lang: typeof BackpackStore !== "undefined" ? BackpackStore.getLanguage() : "zh",
      ver: typeof BackpackStore !== "undefined" ? BackpackStore.getBibleVersion() : "cuv",
      ts: Date.now()
    };

    if (curContext) {
      payload.cur = {
        packTitle: curContext.packTitle,
        sessionNum: curContext.sessionNum,
        sessionTitle: curContext.sessionTitle,
        passageRange: curContext.passageRange
      };
    }

    // 1. 靈修單張 (Tier 1)
    if (studyData.tier1_sheet) {
      const t1 = studyData.tier1_sheet;
      payload.t1 = {
        t: t1.title,
        st: t1.subtitle,
        sn: t1.snapshot,
        ol: Array.isArray(t1.outline) ? t1.outline.map(o => [o.verses, o.theme]) : [],
        dq: Array.isArray(t1.discussionQuestions) ? t1.discussionQuestions.map(q => [
          q.id || "",
          q.tag || "",
          q.question || "",
          q.hint || "",
          q.answer || q.leaderAnswer || ""
        ]) : [],
        tk: t1.takeaway,
        pr: t1.prayer
      };
    }

    // 2. 深度行囊 (Tier 2)
    if (studyData.tier2_dossier) {
      const t2 = studyData.tier2_dossier;
      payload.t2 = {
        t: t2.title,
        st: t2.subtitle,
        ch: Array.isArray(t2.characters) ? t2.characters.map(c => [c.name, c.title, c.profile, c.psychologicalInsight || ""]) : [],
        geo: t2.geography ? {
          loc: t2.geography.location,
          ter: t2.geography.terrain,
          hyd: t2.geography.hydrologyInsight,
          pts: t2.geography.routePoints || []
        } : null,
        arc: t2.archaeology ? {
          era: t2.archaeology.era,
          ctx: t2.archaeology.canaaniteContext,
          try: t2.archaeology.treatyStructure,
          art: t2.archaeology.visualArtifacts || []
        } : null,
        dif: Array.isArray(t2.difficulties) ? t2.difficulties.map(d => [d.question, d.orthodoxAnswer || d.answer || ""]) : [],
        lg: t2.leaderGuide ? {
          ice: t2.leaderGuide.icebreaker,
          flow: t2.leaderGuide.flowTips,
          tb: t2.leaderGuide.timeBudget || "45-60 分鐘",
          conc: t2.leaderGuide.conclusionPrayer
        } : null
      };
    }

    return payload;
  },

  // 將緊湊資料還原為標準研經行囊結構
  expandPayload(payload) {
    if (!payload) return null;

    let tier1 = null;
    if (payload.t1) {
      const t1 = payload.t1;
      tier1 = {
        title: t1.t || `${payload.b} 第 ${payload.c} 章 靈修單張`,
        subtitle: t1.st || "",
        snapshot: t1.sn || "",
        outline: Array.isArray(t1.ol) ? t1.ol.map(item => ({ verses: item[0], theme: item[1] })) : [],
        discussionQuestions: Array.isArray(t1.dq) ? t1.dq.map(item => ({
          id: item[0] || "q",
          tag: item[1] || "",
          question: item[2] || "",
          hint: item[3] || "",
          answer: item[4] || "",
          leaderAnswer: item[4] || ""
        })) : [],
        takeaway: t1.tk || "",
        prayer: t1.pr || ""
      };
    }

    let tier2 = null;
    if (payload.t2) {
      const t2 = payload.t2;
      tier2 = {
        title: t2.t || `${payload.b} 第 ${payload.c} 章 深度研經行囊`,
        subtitle: t2.st || "",
        characters: Array.isArray(t2.ch) ? t2.ch.map(item => ({
          name: item[0] || "",
          title: item[1] || "",
          profile: item[2] || "",
          psychologicalInsight: item[3] || ""
        })) : [],
        geography: t2.geo ? {
          location: t2.geo.loc || "",
          terrain: t2.geo.ter || "",
          hydrologyInsight: t2.geo.hyd || "",
          routePoints: t2.geo.pts || []
        } : null,
        archaeology: t2.arc ? {
          era: t2.arc.era || "",
          canaaniteContext: t2.arc.ctx || "",
          treatyStructure: t2.arc.try || "",
          visualArtifacts: t2.arc.art || []
        } : null,
        difficulties: Array.isArray(t2.dif) ? t2.dif.map(item => ({
          question: item[0] || "",
          orthodoxAnswer: item[1] || "",
          answer: item[1] || ""
        })) : [],
        leaderGuide: t2.lg ? {
          icebreaker: t2.lg.ice || "",
          flowTips: t2.lg.flow || "",
          timeBudget: t2.lg.tb || "45-60 分鐘",
          conclusionPrayer: t2.lg.conc || ""
        } : null
      };
    }

    return {
      bookName: payload.b,
      chapter: payload.c,
      tier1_sheet: tier1,
      tier2_dossier: tier2,
      curriculum: payload.cur || null,
      mode: payload.m || "tier1"
    };
  },

  // 向公開高速中繼發布這份研經包 (生成 6 位極速代碼)
  async uploadToCloud(payload) {
    const code = Math.random().toString(36).slice(2, 8);
    const topic = `bb_pack_${code}`;
    const url = `https://ntfy.sh/${topic}`;

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        return code;
      }
    } catch (err) {
      console.warn("Cloud relay upload warning:", err);
    }
    return null;
  },

  // 從公開中繼下載分享的研經包
  async fetchFromCloud(code) {
    if (!code) return null;
    const cleanCode = String(code).trim().toLowerCase();
    const topic = `bb_pack_${cleanCode}`;
    const url = `https://ntfy.sh/${topic}/json?poll=1`;

    try {
      const resp = await fetch(url, { method: "GET" });
      if (!resp.ok) return null;
      const text = await resp.text();
      if (!text) return null;

      const lines = text.trim().split("\n");
      const lastLine = lines[lines.length - 1];
      const entry = JSON.parse(lastLine);

      // 若為大型附件，從 attachment.url 下載完整 JSON
      if (entry.attachment && entry.attachment.url) {
        const attResp = await fetch(entry.attachment.url);
        if (attResp.ok) {
          return await attResp.json();
        }
      }

      if (entry.message) {
        return JSON.parse(entry.message);
      }
    } catch (err) {
      console.error("Failed to fetch shared pack from cloud:", err);
    }
    return null;
  },

  // 打開分享彈窗
  async openShareModal(preferredMode = null) {
    if (typeof activeStudyData === "undefined" || !activeStudyData || (!activeStudyData.tier1_sheet && !activeStudyData.tier2_dossier)) {
      const isEn = typeof I18n !== "undefined" && I18n.isEn();
      showToast(isEn ? "Please select or generate a study pack first!" : "請先選擇章節或調配研經材料後再進行分享！");
      return;
    }

    const modal = document.getElementById("share-modal");
    if (!modal) return;

    this.activeMode = preferredMode || (typeof currentActiveTier !== "undefined" ? currentActiveTier : "tier1");

    // 顯示載入中動畫並打開彈窗
    modal.classList.remove("hidden");
    const qrContainer = document.getElementById("share-qrcode-container");
    if (qrContainer) {
      qrContainer.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center text-xs text-stone-500 gap-2">
          <div class="inline-block animate-spin text-2xl">⏳</div>
          <div>正在生成小組專屬 QR Code...</div>
        </div>
      `;
    }

    await this.updateShareModalContent();
  },

  closeShareModal() {
    const modal = document.getElementById("share-modal");
    if (modal) modal.classList.add("hidden");
  },

  // 切換分享內容範圍（靈修單張 vs 深度手冊 vs 完整雙層）
  async switchShareMode(mode) {
    this.activeMode = mode;
    await this.updateShareModalContent();
  },

  // 更新彈窗內的 QR Code、網址與按鈕狀態
  async updateShareModalContent() {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    const rawBook = activeStudyData?.bookName || currentBook;
    const bookName = typeof I18n !== "undefined" ? I18n.getBookName(rawBook) : rawBook;
    const chapNum = activeStudyData?.chapter || currentChapter;

    // 更新 Tab 切換鈕高亮
    ["tier1", "tier2", "all"].forEach(m => {
      const btn = document.getElementById(`share-mode-btn-${m}`);
      if (!btn) return;
      if (m === this.activeMode) {
        btn.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-white text-stone-900 shadow-sm border border-stone-200 transition-all text-center";
      } else {
        btn.className = "flex-1 py-1.5 px-2 rounded-lg text-xs text-stone-600 hover:text-stone-900 transition-all text-center";
      }
    });

    // 更新抬頭提示
    const metaEl = document.getElementById("share-modal-passage-meta");
    if (metaEl) {
      const modeLabel = this.activeMode === "tier1" 
        ? (isEn ? "Devotional Sheet (Member Edition)" : "靈修單張 (組員版)")
        : (this.activeMode === "tier2" 
            ? (isEn ? "In-Depth Dossier (Leader Guide)" : "深度行囊 (組長手冊)")
            : (isEn ? "Complete Study Pack (Both Tiers)" : "完整雙層研經包"));
      metaEl.textContent = `${bookName} Ch. ${chapNum} · ${modeLabel}`;
    }

    const payload = this.compactStudyData(activeStudyData, this.activeMode);
    const baseUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, "");

    // 優先上傳至高速中繼以生成 45 字元極簡 QR Code (可 0.05 秒秒掃)
    let code = await this.uploadToCloud(payload);
    let finalUrl = "";

    if (code) {
      this.currentShareCode = code;
      finalUrl = `${baseUrl}#code=${code}`;
    } else {
      // 離線備援：以 LZString 壓縮為直鏈
      let encoded = "";
      if (typeof LZString !== "undefined") {
        try {
          encoded = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
        } catch (e) {}
      }
      finalUrl = `${baseUrl}#share=${encoded}`;
      this.currentShareCode = "";
    }

    this.currentShareUrl = finalUrl;

    // 填充網址輸入框
    const inputEl = document.getElementById("share-url-input");
    if (inputEl) inputEl.value = this.currentShareUrl;

    // 顯示 6 位代碼
    const codeDisplay = document.getElementById("share-code-display");
    if (codeDisplay) {
      codeDisplay.textContent = this.currentShareCode || "DIRECT";
    }

    // 繪製極簡清晰 QR Code
    this.renderQrCode(this.currentShareUrl);

    // 手機原生分享按鈕
    const nativeBtn = document.getElementById("share-native-btn");
    if (nativeBtn) {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        nativeBtn.classList.remove("hidden");
      } else {
        nativeBtn.classList.add("hidden");
      }
    }
  },

  // 繪製清晰 QR Code
  renderQrCode(url) {
    const container = document.getElementById("share-qrcode-container");
    if (!container) return;
    container.innerHTML = "";

    if (typeof QRCode === "undefined") {
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-stone-400">
          QR Code 腳本載入中...
        </div>
      `;
      return;
    }

    try {
      this.qrcodeInstance = new QRCode(container, {
        text: url,
        width: 196,
        height: 196,
        colorDark: "#1c1917",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (err) {
      console.warn("QR code render fallback:", err);
      try {
        this.qrcodeInstance = new QRCode(container, {
          text: url,
          width: 196,
          height: 196,
          colorDark: "#1c1917",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.L
        });
      } catch (e2) {
        container.innerHTML = `
          <div class="p-6 text-center text-xs text-stone-500">
            請直接點擊下方「複製分享連結」發送至小組群
          </div>
        `;
      }
    }
  },

  // 一鍵複製分享連結
  async copyShareLink() {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    let textToCopy = this.currentShareUrl;

    let success = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      } catch (err) {}
    }

    if (!success) {
      const input = document.getElementById("share-url-input");
      if (input) {
        input.select();
        document.execCommand("copy");
        success = true;
      }
    }

    const copyBtn = document.getElementById("share-copy-btn");
    if (copyBtn) {
      const origText = copyBtn.innerHTML;
      copyBtn.innerHTML = `<span>✅</span> <span>${isEn ? "Copied!" : "已複製！"}</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = origText;
      }, 2500);
    }

    showToast(isEn ? "✅ Share link copied! Ready to paste into group chat." : "✅ 查經分享連結已複製！可直接貼至 WhatsApp / LINE 小組群！");
  },

  // 一鍵轉發至 WhatsApp
  shareToWhatsApp() {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    const rawBook = activeStudyData?.bookName || currentBook;
    const bookName = typeof I18n !== "undefined" ? I18n.getBookName(rawBook) : rawBook;
    const chapNum = activeStudyData?.chapter || currentChapter;
    const title = activeStudyData?.tier1_sheet?.title || `${bookName} 第 ${chapNum} 章 研經材料`;
    const codeText = this.currentShareCode ? ` (小組碼: ${this.currentShareCode})` : "";

    const text = isEn
      ? `🎒 Bible Backpack Small Group Study\n📖 Passage: ${bookName} Chapter ${chapNum}\n✦ Topic: ${title}\nClick the link to join our study on your mobile phone${codeText}:\n${this.currentShareUrl}`
      : `🎒 Bible Backpack 小組查經分享\n📖 經文：${bookName} 第 ${chapNum} 章\n✦ 主題：${title}\n點擊專屬連結立即在手機上同步查考${codeText}：\n${this.currentShareUrl}`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  },

  // 手機原生分享 (Web Share API)
  async shareViaNative() {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    const rawBook = activeStudyData?.bookName || currentBook;
    const bookName = typeof I18n !== "undefined" ? I18n.getBookName(rawBook) : rawBook;
    const chapNum = activeStudyData?.chapter || currentChapter;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bible Backpack · ${bookName} Ch. ${chapNum}`,
          text: isEn ? `Join our small group Bible study for ${bookName} Ch. ${chapNum}!` : `邀請您一起查考《${bookName}》第 ${chapNum} 章小組材料！`,
          url: this.currentShareUrl
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          this.copyShareLink();
        }
      }
    } else {
      this.copyShareLink();
    }
  },

  // 手動輸入 6 位小組碼載入
  async loadPackByCodeInput() {
    const input = document.getElementById("manual-share-code-input");
    const code = input ? input.value.trim() : "";
    if (!code) {
      showToast("請先輸入 6 位小組分享碼");
      return;
    }

    showToast(`正在載入小組材料【${code}】...`);
    const payload = await this.fetchFromCloud(code);
    if (!payload) {
      showToast(`❌ 找不到小組碼【${code}】的材料，請向組長確認！`);
      return;
    }

    this.applySharedPayload(payload);
    this.closeShareModal();
  },

  // 應用還原的研經包至介面
  applySharedPayload(payload) {
    const restored = this.expandPayload(payload);
    if (!restored) return false;

    currentBook = restored.bookName;
    currentChapter = restored.chapter;
    currentActiveTier = restored.mode === "tier2" ? "tier2" : "tier1";

    let t1 = restored.tier1_sheet;
    let t2 = restored.tier2_dossier;

    // 若有未完整包含但預載包有的內容，自動補全
    if (typeof getPresetPack === "function") {
      const preset = getPresetPack(currentBook, currentChapter);
      if (preset) {
        if (!t1 && preset.tier1_sheet) t1 = preset.tier1_sheet;
        if (!t2 && preset.tier2_dossier) t2 = preset.tier2_dossier;
      }
    }

    const bookMeta = typeof BIBLE_BOOKS !== "undefined" ? BIBLE_BOOKS.find(b => b.name === currentBook) : null;
    activeStudyData = {
      bookId: bookMeta ? bookMeta.id : "shared",
      bookName: currentBook,
      chapter: currentChapter,
      verses: [],
      tier1_sheet: t1,
      tier2_dossier: t2
    };

    // 記憶為用戶最後瀏覽章節，並存入離線快取
    if (typeof BackpackStore !== "undefined") {
      BackpackStore.setLastLocation(currentBook, currentChapter);

      const lang = BackpackStore.getLanguage() || "zh";
      const ver = BackpackStore.getBibleVersion() || "cuv";
      const selectedTasteIds = BackpackStore.getTastes();
      let standardHash = `${lang}-${ver}-` + (selectedTasteIds || []).sort().join("-") + (BackpackStore.getCustomTaste() ? `-${BackpackStore.getCustomTaste()}` : "");
      let sharedHash = `${lang}-${ver}-` + (selectedTasteIds || []).sort().join("-") + "-shared";
      BackpackStore.saveCachedPack(currentBook, currentChapter, activeStudyData, standardHash);
      BackpackStore.saveCachedPack(currentBook, currentChapter, activeStudyData, sharedHash);
    }

    // 同步頂部書卷選單與章節輸入框
    const bookSelect = document.getElementById("book-selector-select");
    if (bookSelect) bookSelect.value = currentBook;
    const chapInput = document.getElementById("chapter-selector-input");
    if (chapInput) chapInput.value = currentChapter;
    if (typeof renderChapterDropdown === "function") renderChapterDropdown();

    // 同步切換視圖標籤
    const btnTier1 = document.getElementById("tab-tier1");
    const btnTier2 = document.getElementById("tab-tier2");
    if (currentActiveTier === "tier2") {
      btnTier2?.classList.add("tab-active");
      btnTier1?.classList.remove("tab-active");
    } else {
      btnTier1?.classList.add("tab-active");
      btnTier2?.classList.remove("tab-active");
    }
    if (typeof updateMobileBottomNavState === "function") {
      updateMobileBottomNavState(currentActiveTier);
    }

    // ★ 關鍵：立即重新渲染經文與雙層材料！
    if (typeof renderScripture === "function") {
      renderScripture();
    }
    if (typeof renderActiveTierContent === "function") {
      renderActiveTierContent();
    }

    // 渲染頂部小組共學提示條
    setTimeout(() => {
      this.renderSharedPackBanner(restored);
      const isEn = typeof I18n !== "undefined" && I18n.isEn();
      showToast(isEn ? "🎉 Loaded study material shared by your group leader!" : "🎉 已載入組長分享的小組查經材料！", 4500);
    }, 120);

    return true;
  },

  // 檢查當前網址是否包含分享參數（支援 #code= / ?code= / #share= / ?share=）
  async checkUrlForSharedPack() {
    let shareCode = null;
    let shareParam = null;

    // 1. 檢查 Hash 參數
    if (window.location.hash) {
      const hash = window.location.hash.slice(1);
      const hashParams = new URLSearchParams(hash);
      shareCode = hashParams.get("code") || (hash.startsWith("code=") ? hash.slice(5) : null);
      shareParam = hashParams.get("share") || (hash.startsWith("share=") ? hash.slice(6) : null);
    }

    // 2. 檢查 Query 參數
    if (!shareCode && !shareParam && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      shareCode = searchParams.get("code");
      shareParam = searchParams.get("share");
    }

    // 若有 6 位小組分享碼 (優先)
    if (shareCode) {
      showToast(`正在載入小組查經材料...`, 2000);
      const payload = await this.fetchFromCloud(shareCode);
      if (payload) {
        return this.applySharedPayload(payload);
      }
    }

    // 若有直鏈壓縮參數
    if (shareParam) {
      try {
        let jsonStr = "";
        if (typeof LZString !== "undefined") {
          jsonStr = LZString.decompressFromEncodedURIComponent(shareParam);
        }
        if (!jsonStr) {
          try {
            jsonStr = decodeURIComponent(atob(shareParam));
          } catch (e) {}
        }

        if (jsonStr) {
          const payload = JSON.parse(jsonStr);
          return this.applySharedPayload(payload);
        }
      } catch (err) {
        console.error("Error decoding direct shareParam:", err);
      }
    }

    // 檢查純章節跳轉參數 (例如 ?b=約書亞記&c=1)
    const urlParams = new URLSearchParams(window.location.search || window.location.hash.slice(1));
    const b = urlParams.get("b");
    const c = parseInt(urlParams.get("c"), 10);
    const t = urlParams.get("t");
    if (b && c) {
      currentBook = b;
      currentChapter = c;
      if (t === "tier1" || t === "tier2") {
        currentActiveTier = t;
      }
    }

    return false;
  },

  // 渲染頂部共學橫幅
  renderSharedPackBanner(restored) {
    const banner = document.getElementById("shared-pack-banner");
    if (!banner) return;

    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    const rawBook = restored.bookName;
    const bookName = typeof I18n !== "undefined" ? I18n.getBookName(rawBook) : rawBook;
    const chapNum = restored.chapter;

    banner.innerHTML = `
      <div class="flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded-full bg-amber-800 text-white font-bold text-2xs uppercase tracking-wider">
            ${isEn ? "Group Study" : "小組共學"}
          </span>
          <span class="font-bold text-stone-900">
            ${isEn ? `You are viewing material shared by your group leader: 【${bookName} Ch. ${chapNum}】` : `您正在檢視組長分享的查經材料：【${bookName} 第 ${chapNum} 章】`}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button onclick="toggleSaveCurrentSheet()" class="px-2.5 py-1 bg-amber-800 text-white hover:bg-amber-900 text-2xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1">
            <span>🎒</span>
            <span>${isEn ? "Save to My Backpack" : "存入我的背包"}</span>
          </button>
          <button onclick="document.getElementById('shared-pack-banner').classList.add('hidden')" class="text-stone-400 hover:text-stone-700 p-1 text-xs">✕</button>
        </div>
      </div>
    `;

    banner.classList.remove("hidden");
  },

  // 下載這份小組查經包為離線檔案 (.json)
  downloadPackJson() {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    if (!activeStudyData) return;

    const exportData = {
      app: "Bible Backpack",
      type: "study_pack",
      exportedAt: new Date().toISOString(),
      bookName: activeStudyData.bookName || currentBook,
      chapter: activeStudyData.chapter || currentChapter,
      tier1_sheet: activeStudyData.tier1_sheet,
      tier2_dossier: activeStudyData.tier2_dossier,
      curriculum: typeof activeCurriculumContext !== "undefined" ? activeCurriculumContext : null
    };

    const fileName = `bible-backpack-${exportData.bookName}-ch${exportData.chapter}.json`;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(isEn ? `💾 Downloaded ${fileName}` : `💾 已下載【${fileName}】！`);
  }
};

// 全域掛載
if (typeof window !== "undefined") {
  window.ShareService = ShareService;
}
