// ==============================================================================
// Bible Backpack — 用戶驗證與雲端資料庫雙向同步服務 (Auth & Cloud Sync Service)
// 架構：Local-First（本地 LocalStorage 極速讀取與離線使用 + Supabase 雲端跨裝置自動備份）
// 支援：Google 一鍵登入、Email / 密碼登入、Magic Link 免密碼登入
// ==============================================================================

const SUPABASE_CONFIG = {
  url: "https://rllyvqxnxfgnhqfiwijz.supabase.co",
  anonKey: "sb_publishable_Ey4Jetmbl7ZjkX8C135PAg_vwlm-gnB",
  // Google OAuth 2.0 Web Client ID (用於頁內 Google One Tap 原生免跳轉登入，徹底隱藏 supabase 網址)
  googleClientId: ""
};

const AuthService = {
  client: null,
  currentUser: null,
  isSyncing: false,

  // 初始化 Supabase 客戶端與監聽登入狀態
  init() {
    if (typeof supabase === "undefined") {
      console.warn("Supabase SDK not loaded yet.");
      return;
    }

    try {
      this.client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

      // 監聽使用者認證狀態變化 (登入、登出、Token 刷新)
      this.client.auth.onAuthStateChange(async (event, session) => {
        this.currentUser = session?.user || null;
        this.updateAuthUI();

        if (event === "SIGNED_IN" && this.currentUser) {
          const isEn = typeof I18n !== "undefined" && I18n.isEn();
          showToast(isEn ? `👋 Welcome, ${this.getUserDisplayName()}!` : `👋 歡迎回來，${this.getUserDisplayName()}！`);
          await this.syncDownFromCloud();
        } else if (event === "SIGNED_OUT") {
          this.currentUser = null;
          this.updateAuthUI();
        }
      });

      // 檢查目前 Session
      this.client.auth.getSession().then(({ data: { session } }) => {
        this.currentUser = session?.user || null;
        this.updateAuthUI();
        if (this.currentUser) {
          this.syncDownFromCloud();
        } else {
          // 未登入時嘗試初始化 Google One Tap 原生頁內驗證
          this.initGoogleOneTap();
        }
      });
    } catch (err) {
      console.error("Supabase client init error:", err);
    }
  },

  // 獲取使用者顯示名稱
  getUserDisplayName() {
    if (!this.currentUser) return "";
    const meta = this.currentUser.user_metadata || {};
    return meta.full_name || meta.name || this.currentUser.email?.split("@")[0] || "User";
  },

  getUserAvatar() {
    if (!this.currentUser) return "";
    const meta = this.currentUser.user_metadata || {};
    return meta.avatar_url || meta.picture || "";
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  // ================= 認證操作 (Authentication Actions) =================

  // 初始化 Google Identity Services (GIS) 原生頁內免跳轉登入
  initGoogleOneTap() {
    const clientId = (typeof BackpackStore !== "undefined" && BackpackStore.getGoogleClientId()) || SUPABASE_CONFIG.googleClientId;
    if (!clientId) return;

    const setupGIS = () => {
      if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
        setTimeout(setupGIS, 300);
        return;
      }

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            await this.handleGoogleCredentialResponse(response);
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // 渲染頁面內的 Google 原生登入按鈕
        const container = document.getElementById("google-onetap-btn-slot");
        const fallbackBtn = document.getElementById("google-fallback-btn");
        if (container) {
          container.innerHTML = "";
          google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            type: "standard",
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
            width: 300
          });
          container.classList.remove("hidden");
          if (fallbackBtn) fallbackBtn.classList.add("hidden");
        }

        // 若使用者尚未登入，且在主頁面停留，喚起 Google One Tap 浮動提示卡片
        if (!this.isLoggedIn()) {
          google.accounts.id.prompt();
        }
      } catch (e) {
        console.warn("Google Identity Services init error:", e);
      }
    };

    setupGIS();
  },

  // 處理 Google 原生 ID Token 登入 (零跳轉、完全不顯示 supabase 網址)
  async handleGoogleCredentialResponse(response) {
    if (!this.client || !response || !response.credential) return;
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    this.setSyncStatus(true);

    try {
      const { data, error } = await this.client.auth.signInWithIdToken({
        provider: "google",
        token: response.credential
      });

      if (error) throw error;
      this.currentUser = data.user;
      this.closeAuthModal();
      this.updateAuthUI();
      showToast(isEn ? `👋 Welcome, ${this.getUserDisplayName()}!` : `👋 歡迎回來，${this.getUserDisplayName()}！`);
      await this.syncDownFromCloud();
    } catch (err) {
      console.error("Google ID Token login error:", err);
      showToast(isEn ? `Login error: ${err.message}` : `Google 登入失敗：${err.message}`);
    } finally {
      this.setSyncStatus(false);
    }
  },

  // 1. Google 備用一鍵登入 (OAuth 轉址流程)
  async signInWithGoogle() {
    if (!this.client) return;
    const isEn = typeof I18n !== "undefined" && I18n.isEn();

    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await this.client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google login failed:", err);
      showToast(isEn ? `Google login failed: ${err.message}` : `Google 登入失敗：${err.message}`);
    }
  },

  // 2. Email + 密碼 登入
  async signInWithPassword(email, password) {
    if (!this.client) return false;
    const isEn = typeof I18n !== "undefined" && I18n.isEn();

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      if (error) throw error;
      this.closeAuthModal();
      return true;
    } catch (err) {
      showToast(isEn ? `Login failed: ${err.message}` : `登入失敗：${err.message}`);
      return false;
    }
  },

  // 3. Email + 密碼 註冊
  async signUpWithPassword(email, password) {
    if (!this.client) return false;
    const isEn = typeof I18n !== "undefined" && I18n.isEn();

    try {
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password: password
      });
      if (error) throw error;
      showToast(isEn ? "Registration successful! Please check your email if confirmation is needed." : "註冊成功！若有啟用郵件確認請至信箱點擊連結。");
      this.closeAuthModal();
      return true;
    } catch (err) {
      showToast(isEn ? `Sign up failed: ${err.message}` : `註冊失敗：${err.message}`);
      return false;
    }
  },

  // 4. Email 魔法連結登入 (Magic Link 免密碼)
  async signInWithMagicLink(email) {
    if (!this.client) return false;
    const isEn = typeof I18n !== "undefined" && I18n.isEn();

    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await this.client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo
        }
      });
      if (error) throw error;
      showToast(isEn ? "Magic link sent! Please check your email inbox." : "魔法登入連結已寄出！請至電子信箱查收點擊登入。");
      this.closeAuthModal();
      return true;
    } catch (err) {
      showToast(isEn ? `Failed to send link: ${err.message}` : `發送登入信失敗：${err.message}`);
      return false;
    }
  },

  // 5. 登出
  async signOut() {
    if (!this.client) return;
    const isEn = typeof I18n !== "undefined" && I18n.isEn();

    try {
      await this.client.auth.signOut();
      this.currentUser = null;
      this.updateAuthUI();
      showToast(isEn ? "Logged out. Switched to local offline mode." : "已登出帳號，切換回本地離線訪客模式。");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  },

  // ================= 雙向雲端同步機制 (Local-First Sync Engine) =================

  // 從 Supabase 下載使用者的個人設定與背包資料並同步到本地 LocalStorage
  async syncDownFromCloud() {
    if (!this.client || !this.currentUser || this.isSyncing) return;
    this.isSyncing = true;
    this.setSyncStatus(true);

    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    const userId = this.currentUser.id;

    try {
      // 1. 下載用戶個人設定檔 (user_profiles)
      const { data: profile, error: profileErr } = await this.client
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profileErr && profile) {
        if (profile.provider) BackpackStore.setProvider(profile.provider);
        if (profile.gemini_api_key) BackpackStore.setApiKey(profile.gemini_api_key);
        if (profile.gemini_model) BackpackStore.setModelName(profile.gemini_model);
        if (profile.groq_api_key) BackpackStore.setGroqKey(profile.groq_api_key);
        if (profile.groq_model) BackpackStore.setGroqModel(profile.groq_model);
        if (profile.local_endpoint) BackpackStore.setLocalEndpoint(profile.local_endpoint);
        if (profile.local_model) BackpackStore.setLocalModel(profile.local_model);
        if (profile.api_bible_key) BackpackStore.setApiBibleKey(profile.api_bible_key);

        if (profile.api_bible_ids && typeof profile.api_bible_ids === "object") {
          if (profile.api_bible_ids.niv) BackpackStore.setApiBibleId("niv", profile.api_bible_ids.niv);
          if (profile.api_bible_ids.nirv) BackpackStore.setApiBibleId("nirv", profile.api_bible_ids.nirv);
          if (profile.api_bible_ids.cev) BackpackStore.setApiBibleId("cev", profile.api_bible_ids.cev);
        }

        if (Array.isArray(profile.tastes)) {
          BackpackStore.saveTastes(profile.tastes, profile.custom_taste || "");
        }
        if (profile.theme) {
          BackpackStore.setTheme(profile.theme);
          applyThemeAndFont();
        }
        if (profile.language) {
          BackpackStore.setLanguage(profile.language);
          if (typeof I18n !== "undefined") I18n.applyToDOM();
        }
        if (profile.bible_version) {
          BackpackStore.setBibleVersion(profile.bible_version);
        }
      } else if (!profile) {
        // 若雲端尚無設定檔，將本地現有設定上傳作為初始設定
        await this.syncUpProfile();
      }

      // 2. 下載背包收藏項目 (user_saved_items)
      const { data: cloudItems, error: itemsErr } = await this.client
        .from("user_saved_items")
        .select("*")
        .eq("user_id", userId);

      if (!itemsErr && Array.isArray(cloudItems)) {
        if (cloudItems.length > 0) {
          const localItems = BackpackStore.getSavedItems();
          // 合併雲端與本地項目 (以 id 去重)
          const map = new Map();
          localItems.forEach(item => map.set(item.id, item));
          cloudItems.forEach(ci => {
            map.set(ci.id, {
              id: ci.id,
              type: ci.type,
              title: ci.title,
              desc: ci.description,
              content: ci.content,
              savedAt: ci.saved_at
            });
          });
          const merged = Array.from(map.values());
          localStorage.setItem("bible_backpack_saved_items", JSON.stringify(merged));
          updateBackpackBadge();
          if (typeof renderBackpackCards === "function") renderBackpackCards();
        } else {
          // 若雲端為空但本地有收藏，自動上傳至雲端備份
          await this.syncUpSavedItems();
        }
      }

      // 3. 下載主題查經課程套裝 (user_study_packs)
      const { data: cloudPacks, error: packsErr } = await this.client
        .from("user_study_packs")
        .select("*")
        .eq("user_id", userId);

      if (!packsErr && Array.isArray(cloudPacks)) {
        if (cloudPacks.length > 0) {
          const localPacks = BackpackStore.getStudyPacks();
          const packMap = new Map();
          localPacks.forEach(p => packMap.set(p.id, p));
          cloudPacks.forEach(cp => {
            packMap.set(cp.id, {
              id: cp.id,
              title: cp.title,
              subtitle: cp.subtitle,
              target: cp.target,
              overview: cp.overview,
              sessions: cp.sessions || [],
              createdAt: cp.created_at
            });
          });
          const mergedPacks = Array.from(packMap.values());
          localStorage.setItem("bible_backpack_packs", JSON.stringify(mergedPacks));
          if (typeof renderStudyPacks === "function") renderStudyPacks();
        } else {
          await this.syncUpStudyPacks();
        }
      }

      // 刷新設定面板中的輸入框欄位
      this.refreshSettingsFormFields();
      renderTasteBadges();
      renderScripture();
      showToast(isEn ? "☁️ Synced with cloud successfully!" : "☁️ 雲端設定與查經資料已同步就緒！", 2500);
    } catch (err) {
      console.error("Sync down error:", err);
    } finally {
      this.isSyncing = false;
      this.setSyncStatus(false);
    }
  },

  // 上傳本地設定至 Supabase
  async syncUpProfile() {
    if (!this.client || !this.currentUser) return;
    const userId = this.currentUser.id;

    const payload = {
      user_id: userId,
      provider: BackpackStore.getProvider(),
      gemini_api_key: BackpackStore.getApiKey(),
      gemini_model: BackpackStore.getModelName(),
      groq_api_key: BackpackStore.getGroqKey(),
      groq_model: BackpackStore.getGroqModel(),
      local_endpoint: BackpackStore.getLocalEndpoint(),
      local_model: BackpackStore.getLocalModel(),
      api_bible_key: BackpackStore.getApiBibleKey(),
      api_bible_ids: {
        niv: BackpackStore.getApiBibleId("niv"),
        nirv: BackpackStore.getApiBibleId("nirv"),
        cev: BackpackStore.getApiBibleId("cev")
      },
      language: BackpackStore.getLanguage(),
      bible_version: BackpackStore.getBibleVersion(),
      theme: BackpackStore.getTheme(),
      tastes: BackpackStore.getTastes(),
      custom_taste: BackpackStore.getCustomTaste(),
      updated_at: new Date().toISOString()
    };

    try {
      await this.client.from("user_profiles").upsert(payload);
    } catch (err) {
      console.warn("syncUpProfile error:", err);
    }
  },

  // 上傳本地所有背包收藏項目至 Supabase
  async syncUpSavedItems() {
    if (!this.client || !this.currentUser) return;
    const userId = this.currentUser.id;
    const items = BackpackStore.getSavedItems();
    if (!items || items.length === 0) return;

    const rows = items.map(item => ({
      id: item.id,
      user_id: userId,
      type: item.type || "靈修單張",
      title: item.title || "未命名",
      description: item.desc || "",
      content: item.content || {},
      saved_at: item.savedAt || new Date().toISOString()
    }));

    try {
      await this.client.from("user_saved_items").upsert(rows);
    } catch (err) {
      console.warn("syncUpSavedItems error:", err);
    }
  },

  // 上傳單一收藏項目（即時增量同步）
  async syncUpSingleItem(item) {
    if (!this.client || !this.currentUser || !item) return;
    try {
      await this.client.from("user_saved_items").upsert({
        id: item.id,
        user_id: this.currentUser.id,
        type: item.type || "靈修單張",
        title: item.title || "未命名",
        description: item.desc || "",
        content: item.content || {},
        saved_at: item.savedAt || new Date().toISOString()
      });
    } catch (err) {
      console.warn("syncUpSingleItem error:", err);
    }
  },

  // 刪除單一收藏項目（即時增量同步）
  async syncDeleteItem(itemId) {
    if (!this.client || !this.currentUser || !itemId) return;
    try {
      await this.client.from("user_saved_items").delete().eq("id", itemId).eq("user_id", this.currentUser.id);
    } catch (err) {
      console.warn("syncDeleteItem error:", err);
    }
  },

  // 上傳主題查經課程套裝
  async syncUpStudyPacks() {
    if (!this.client || !this.currentUser) return;
    const userId = this.currentUser.id;
    const packs = BackpackStore.getStudyPacks();
    if (!packs || packs.length === 0) return;

    const rows = packs.map(p => ({
      id: p.id,
      user_id: userId,
      title: p.title,
      subtitle: p.subtitle || "",
      target: p.target || "",
      overview: p.overview || "",
      sessions: p.sessions || [],
      created_at: p.createdAt || new Date().toISOString()
    }));

    try {
      await this.client.from("user_study_packs").upsert(rows);
    } catch (err) {
      console.warn("syncUpStudyPacks error:", err);
    }
  },

  // 刷新設置面板中的輸入框欄位 (當雲端設定下載後)
  refreshSettingsFormFields() {
    const geminiKeyInput = document.getElementById("api-key-input");
    const groqKeyInput = document.getElementById("groq-key-input");
    const localEndpointInput = document.getElementById("local-endpoint-input");
    const localModelInput = document.getElementById("local-model-input");
    const geminiModelSelect = document.getElementById("model-select-input");
    const groqModelSelect = document.getElementById("groq-model-select-input");
    const apiBibleKeyInput = document.getElementById("api-bible-key-input");
    const apibibleIdNiv = document.getElementById("apibible-id-niv");
    const apibibleIdNirv = document.getElementById("apibible-id-nirv");
    const apibibleIdCev = document.getElementById("apibible-id-cev");

    if (geminiKeyInput) geminiKeyInput.value = BackpackStore.getApiKey();
    if (groqKeyInput) groqKeyInput.value = BackpackStore.getGroqKey();
    if (localEndpointInput) localEndpointInput.value = BackpackStore.getLocalEndpoint();
    if (localModelInput) localModelInput.value = BackpackStore.getLocalModel();
    if (geminiModelSelect) geminiModelSelect.value = BackpackStore.getModelName();
    if (groqModelSelect) groqModelSelect.value = BackpackStore.getGroqModel();
    if (apiBibleKeyInput) apiBibleKeyInput.value = BackpackStore.getApiBibleKey();
    if (apibibleIdNiv) apibibleIdNiv.value = BackpackStore.getApiBibleId("niv");
    if (apibibleIdNirv) apibibleIdNirv.value = BackpackStore.getApiBibleId("nirv");
    if (apibibleIdCev) apibibleIdCev.value = BackpackStore.getApiBibleId("cev");

    // 切換 Provider 單選框
    const provider = BackpackStore.getProvider();
    const radio = document.querySelector(`input[name="ai_provider"][value="${provider}"]`);
    if (radio) {
      radio.checked = true;
      if (typeof toggleProviderSettings === "function") toggleProviderSettings(provider);
    }
  },

  // ================= UI 狀態與彈窗控制 =================

  // 更新頂部導航列的使用者登入/頭像狀態
  updateAuthUI() {
    const btn = document.getElementById("nav-auth-btn");
    const label = document.getElementById("nav-auth-label");
    const avatar = document.getElementById("nav-auth-avatar");
    const cloudIndicator = document.getElementById("nav-auth-cloud-badge");
    const isEn = typeof I18n !== "undefined" && I18n.isEn();

    if (!btn) return;

    if (this.isLoggedIn()) {
      const name = this.getUserDisplayName();
      const pic = this.getUserAvatar();

      if (label) {
        label.textContent = name;
        label.className = "truncate max-w-[90px] sm:max-w-[120px] font-semibold text-stone-900";
      }

      if (avatar) {
        if (pic) {
          avatar.innerHTML = `<img src="${pic}" alt="avatar" class="w-5 h-5 rounded-full object-cover">`;
        } else {
          avatar.innerHTML = `<span class="w-5 h-5 rounded-full bg-amber-700 text-white text-2xs inline-flex items-center justify-center font-bold">${name.charAt(0).toUpperCase()}</span>`;
        }
      }

      if (cloudIndicator) {
        cloudIndicator.classList.remove("hidden");
      }

      btn.title = isEn ? `Logged in as ${name} (Click to manage account)` : `已登入：${name} (點擊管理帳號與同步)`;
    } else {
      if (label) {
        label.textContent = isEn ? "Login" : "登入";
        label.className = "font-medium text-stone-700";
      }
      if (avatar) {
        avatar.innerHTML = "<span>👤</span>";
      }
      if (cloudIndicator) {
        cloudIndicator.classList.add("hidden");
      }
      btn.title = isEn ? "Login / Sign up (Cloud Sync)" : "登入 / 註冊帳號 (雲端跨設備同步)";
    }
  },

  setSyncStatus(syncing) {
    const cloudBadge = document.getElementById("nav-auth-cloud-badge");
    if (!cloudBadge) return;
    if (syncing) {
      cloudBadge.innerHTML = `<span class="inline-block animate-spin text-2xs">🔄</span>`;
      cloudBadge.className = "text-amber-600 inline-flex items-center";
    } else {
      cloudBadge.innerHTML = `<span>☁️</span>`;
      cloudBadge.className = "text-emerald-600 inline-flex items-center text-xs";
    }
  },

  // 開啟登入 / 帳號管理彈窗
  openAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    const loggedInView = document.getElementById("auth-modal-logged-in-view");
    const guestView = document.getElementById("auth-modal-guest-view");

    if (this.isLoggedIn()) {
      loggedInView?.classList.remove("hidden");
      guestView?.classList.add("hidden");
      this.renderLoggedInView();
    } else {
      loggedInView?.classList.add("hidden");
      guestView?.classList.remove("hidden");
      this.initGoogleOneTap();
    }

    modal.classList.remove("hidden");
  },

  closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.add("hidden");
  },

  // 渲染已登入時的管理面板資訊
  renderLoggedInView() {
    const nameEl = document.getElementById("auth-view-user-name");
    const emailEl = document.getElementById("auth-view-user-email");
    const avatarEl = document.getElementById("auth-view-user-avatar");
    const itemsCountEl = document.getElementById("auth-view-items-count");
    const isEn = typeof I18n !== "undefined" && I18n.isEn();

    if (nameEl) nameEl.textContent = this.getUserDisplayName();
    if (emailEl) emailEl.textContent = this.currentUser?.email || "";
    if (avatarEl) {
      const pic = this.getUserAvatar();
      if (pic) {
        avatarEl.innerHTML = `<img src="${pic}" class="w-12 h-12 rounded-full object-cover shadow-sm">`;
      } else {
        avatarEl.innerHTML = `<div class="w-12 h-12 rounded-full bg-amber-800 text-white text-lg font-bold flex items-center justify-center">${this.getUserDisplayName().charAt(0).toUpperCase()}</div>`;
      }
    }

    if (itemsCountEl) {
      const items = BackpackStore.getSavedItems();
      const packs = BackpackStore.getStudyPacks();
      itemsCountEl.textContent = isEn
        ? `${items.length} saved sheets & ${packs.length} curriculum series backed up`
        : `已雲端備份：${items.length} 份查經單張與卡片 · ${packs.length} 套系列課程`;
    }
  },

  // 立即手動同步
  async triggerManualSync() {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    showToast(isEn ? "Syncing data with cloud..." : "正在與雲端雙向同步資料...");
    await this.syncUpProfile();
    await this.syncUpSavedItems();
    await this.syncUpStudyPacks();
    await this.syncDownFromCloud();
  }
};

// 全域掛載
if (typeof window !== "undefined") {
  window.AuthService = AuthService;
}
