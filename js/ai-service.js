// Bible Backpack AI 引擎服務
// 支援調用 Google Gemini API (多模型智慧降級) 與 Groq API (零延遲極速通道)，徹底解決 High Demand 塞車問題

const AIService = {
  // 候選高可用模型池（優先度：2.5-flash 與 2.5-flash-lite 容量最充裕、最少出現 high demand）
  FALLBACK_MODELS: [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
    "gemini-3.8-flash",
    "gemini-2.0-flash"
  ],

  // 構造單章研經材料 Prompt（注入本地 BibleService 完整經文上下文，支援注入小組主題課程之堂數、主題與討論核心）
  buildPrompt(bookName, chapter, selectedTastes, customKeyword, curriculumContext = null) {
    const tasteNames = (selectedTastes || []).map(t => `${t.name} (${t.desc || t.category})`).join("、");
    const activeTasteList = (selectedTastes || []).map(t => t.name);

    // 從本地和合本資料庫提取本章完整經文，讓 AI 緊扣經文逐節深入剖析（不再空泛概括）
    let scriptureContext = "";
    if (typeof BibleService !== "undefined" && BibleService.bibleData) {
      const verses = BibleService.getChapterVerses(bookName, chapter);
      if (verses && verses.length > 0 && !verses[0].text.includes("正在載入")) {
        const formattedVerses = verses.map(v => `${v.num}. ${v.text}`).join("\n");
        scriptureContext = `\n【《${bookName}》第 ${chapter} 章和合本經文原文（請務必緊扣以下經文細節、節數、人名與地名進行深度剖析，嚴禁空泛敷衍）】：\n${formattedVerses}\n`;
      }
    }

    let curriculumInstruction = "";
    if (curriculumContext) {
      curriculumInstruction = `
【★★極重要指令：本單張為小組主題系列課程專屬研經材料★★】：
- 本套系列主題：《${curriculumContext.packTitle || "小組主題課程"}》
- 本次課堂：第 ${curriculumContext.sessionNum || 1} 堂「${curriculumContext.sessionTitle || ""}」（聚焦經文範圍：${curriculumContext.passageRange || `${bookName} 第 ${chapter} 章`}）
- 本堂核心信息主旨：${curriculumContext.coreMessage || "無"}
- 小組討論焦點方向：${curriculumContext.discussionTheme || "無"}
- 指定小組破冰方向：${curriculumContext.icebreaker || "無"}
- 指定生活實踐操練：${curriculumContext.lifeAction || "無"}

【課程連貫性與深度整合要求】：
1. 標題與副標題：tier1_sheet.title 請標註為「《${curriculumContext.packTitle || "小組主題"}》第 ${curriculumContext.sessionNum || 1} 堂 · ${curriculumContext.sessionTitle || ""}」，副標題深刻點出本堂主題。
2. 核心聚焦：經文快照 (snapshot)、經文分段 (outline)、人物檔案與神學剖析，必須強烈圍繞本堂核心信息「${curriculumContext.coreMessage || ""}」進行深度釋經。
3. 討論問題專屬客製化：
   - Q1 (經文細讀)：結合本堂聚焦經文細節。
   - Q2 (主題討論)：必須精準對接本堂「小組討論焦點方向：${curriculumContext.discussionTheme || ""}」，tag 標註「主題探討」。
   - Q3 (生活應用)：必須緊扣本堂「指定生活實踐操練：${curriculumContext.lifeAction || ""}」，引導組員具體落地。
   - Q4 (團契代禱)：結合本堂主題引導組員彼此代禱。
4. 破冰與組長提示：tier2_dossier.leaderGuide.icebreaker 請直接融入或深化本課堂指定之破冰「${curriculumContext.icebreaker || ""}」；flowTips 提供組長帶領本主題時的控場與牧養叮嚀。
`;
    }

    return `
你現在是「Bible Backpack（聖經行囊）」的【神學內容主管 (Theological Content Director)】。
請為聖經《${bookName}》第 ${chapter} 章生成一套內容極其豐富、具神學深度、符合正統基督信仰的雙層研經行囊材料。
${scriptureContext}
${curriculumInstruction}
【★用戶選定的個人研經口味與視角風格（必須在討論問題、心靈反思與結語比喻中展現鮮明辨識度，嚴禁千篇一律的公版套話！）】：
- 核心選定視角：${tasteNames || "自然理性、生活應用、正統研經"}
- 自訂興趣/專業背景備註：${customKeyword ? `「${customKeyword}」（★極重要指令：請在 Q3 生活反思題、Takeaway 結語與人物剖析中，直接運用此領域的思維模型、生活痛點或專業比喻作深刻呼應！）` : "無特定，請集中發揮上述選定之視角"}

【神學守則與個人化風格要求 (Depth, Orthodoxy & Taste Customization)】：
1. 【正統信仰底線】：完全遵循大公教會歷史正統信仰（使徒信經、尼西亞信經、唯獨恩典因信稱義）。嚴厲排斥任何異端、偏激或偏離聖經原意的曲解。
2. 【★拒絕簡略敷衍，要求極高豐富度與神學深度】：
   - 無論使用哪一款模型，每個欄位的文字都必須**詳實飽滿、引經據典（明確標註第幾節）、具牧養溫度與神學洞察**，絕對不可只寫一兩句話帶過！
   - 經文分段（outline）必須涵蓋全章並分為 3 至 4 個詳細段落。
   - 討論問題（discussionQuestions）共 4 題，每題的「組長引導提示 (hint)」必須寫滿 60～100 字，提供具體經文節數線索、原文或歷史背景切入點。
   - 人物檔案（characters）必須列出 2 至 3 位關鍵人物或群體，每位包含詳盡生平與 80～120 字的深度心理與屬靈掙扎洞察。
   - 疑難解答（difficulties）必須列出 2 至 3 個深具挑戰性的核心神學/釋經難題，每題解答（answer）必須達 120～180 字。
3. 【★個人化口味差異化滲透要求 (Making Tastes Feel Unmistakably Distinct)】：
   - 討論題第 2 題 (Q2)：必須直接聚焦於用戶選定的第 1 項口味（例如選「古代考古/歷史」則問當時條約法理與地緣統治；選「數學邏輯/自然科學」則問因果結構、對稱 Chiasm 與自然規律；選「心理認知」則深究恐懼防禦與認知重構；選「小組導師」則設計具備群體互動張力的切入點），tag 必須自訂反映該口味（如「歷史盟約」、「邏輯因果」、「心靈防禦」、「導師錦囊」）。
   - 討論題第 3 題 (Q3)：必須直接連結用戶填寫的「自訂背景」（如軟體工程師、管理者、教育、藝術等）或第 2 項口味，設計切中該領域日常痛點與思維模型的深度反思題，tag 標註「專業反思」或「職場應用」。
   - 今日默想結語 (takeaway)：必須生動融合該口味或自訂背景的鮮明比喻（例如：若用戶是工程師，比喻底層架構與神聖協議；若為心理，比喻卸下內在防衛；若為默想，比喻幽谷清泉），拒絕乾癟的道德教條！
4. 【★考古實物與維基百科精準驗證要求 (Visual Artifacts Rule)】：
   - visualArtifacts 必須列出 2 項真實存在的博物館館藏考古文物、古代銘文或真實聖經歷史遺址（嚴禁編造「信心之盾」、「恩典之泉」等抽象比喻詞！）。
   - title 格式必須為「中文名稱 (Official English Name)」，例如：「但丘大衛家石碑 (Tel Dan Stele)」、「居魯士圓柱 (Cyrus Cylinder)」、「死海古卷以賽亞卷 (Dead Sea Scrolls)」、「迦百農古代會堂遺址 (Capernaum Synagogue)」、「梅르內普塔赫石碑 (Merneptah Stele)」、「拉吉浮雕 (Lachish reliefs)」。
   - searchQuery 必須填寫該文物或遺址在 English Wikipedia (英文維基百科) 的精確標準條目名稱（純英文，如 "Tel Dan stele", "Cyrus Cylinder", "Dead Sea Scrolls", "Pool of Bethesda", "Ketef Hinnom scrolls", "Black Obelisk of Shalmaneser III"）。
5. 【★聖經地理與行軍路線嚴格守則 (Geography & Map Guardrail)】：
   - geography.isJourneyRoute：只有當本章經文明確記載「實際的行軍移動、出埃及遷徙、曠野行程或使徒宣教旅程」（有明確從 A 地前往 B 地的順序動線）時，才設為 true；若本章為定點事件、創造敘事、詩篇、智慧書或一般書信教導，一律設為 false。
   - geography.routePoints：只標註經文中明確提及或歷史考證確鑿的真實聖經地點（經緯度座標必須真實準確）；若地點位置在考古上極度不確定，或本章並無特定地點，切勿亂湊或憑空捏造座標（無特定地點時可僅列出 1 個核心歷史參照地標如耶路撒冷，或留空陣列 []）。

【請輸出嚴格合法的純 JSON 格式】：所有字串內部如有雙引號請使用 \\" 轉義，換行請使用 \\n，絕對禁止未轉義的原始換行或未閉合引號。JSON 結構如下：
{
  "tier1_sheet": {
    "title": "${bookName}第${chapter}章 · 小組查經與靈修單張",
    "subtitle": "副標題（深刻點出本章神學主題與生命信息）",
    "snapshot": "章節核心快照（120～180字：詳述本章在救恩歷史中的轉折位置、核心神學張力與信息焦點）",
    "outline": [
      { "verses": "第 1-X 節", "theme": "第一段主題與詳細經文脈絡說明（25～40字）" },
      { "verses": "第 X-Y 節", "theme": "第二段主題與詳細經文脈絡說明（25～40字）" },
      { "verses": "第 Y-Z 節", "theme": "第三段主題與詳細經文脈絡說明（25～40字）" }
    ],
    "discussionQuestions": [
      {
        "id": "q1",
        "type": "觀察與梳理",
        "tag": "經文細讀",
        "question": "第1題：結合本章具體節數與經文細節的客觀事實與脈絡梳理題（40～70字）",
        "hint": "詳盡組長引導提示（60～100字：指出應留意第幾節的關鍵字詞、人物動作對比與上下文線索）"
      },
      {
        "id": "q2",
        "type": "理解與洞察",
        "tag": "【依所選第1口味自訂標籤】",
        "question": "第2題：深度貫穿【${activeTasteList[0] || '神學視角'}】的經文洞察題（40～70字，視角鮮明、打破常規）",
        "hint": "詳盡組長引導提示（60～100字：解析經文背後的神學涵義、聖約意義與啟發切入點）"
      },
      {
        "id": "q3",
        "type": "生活與信心應用",
        "tag": "【依自訂背景或第2口味標籤】",
        "question": "第3題：緊密結合【${customKeyword || activeTasteList[1] || '生活反思'}】的深度應用題（40～70字，生動共鳴）",
        "hint": "詳盡組長引導提示（60～100字：引導組員從表面道德教訓進入內心偶像省察與恩典依靠）"
      },
      {
        "id": "q4",
        "type": "小組同行互勉",
        "tag": "團契代禱",
        "question": "第4題：促進小組組員彼此敞開扶持、具體實踐與彼此代禱的行動題（40～70字）",
        "hint": "詳盡組長引導提示（60～100字：提供具體可落實的本週操練建議與小組代禱方向）"
      }
    ],
    "takeaway": "今日核心默想結語（80～120字：融合所選口味之鮮活比喻、深刻、充滿福音盼望與牧養力量）",
    "prayer": "總結禱告詞（80～120字：呼應本章經文真理與所選視角之誠摯優美禱文）"
  },
  "tier2_dossier": {
    "title": "${bookName}第${chapter}章 · 深度研經行囊",
    "subtitle": "背景考證 · 地理環境 · 人物檔案 · 疑難解答 · 組長手冊",
    "characters": [
      {
        "name": "關鍵人物或群體1",
        "title": "角色身份與屬靈定位",
        "profile": "人物在本章的處境、歷史背景與行動脈絡（60～100字）",
        "psychologicalInsight": "深度心理剖析與屬靈心路歷程洞察（80～120字：剖析其內心恐懼、張力或信心突破）"
      },
      {
        "name": "關鍵人物或群體2",
        "title": "角色身份與屬靈定位",
        "profile": "人物在本章的處境、歷史背景與行動脈絡（60～100字）",
        "psychologicalInsight": "深度心理剖析與屬靈心路歷程洞察（80～120字：剖析其動機、軟弱或神恩典的介入）"
      }
    ],
    "geography": {
      "isJourneyRoute": false,
      "location": "本章核心地理區域（中英對照）",
      "terrain": "詳細地形、氣候與交通特徵（40～80字）",
      "hydrologyInsight": "地貌、水文、生態或軍事戰略環境對本章經文事件的深度影響解析（120～180字）",
      "routePoints": [
        { "lat": 31.7767, "lng": 35.2345, "name": "真實聖經地點1（僅列確鑿地點，不確定位置切勿亂放）", "nameEn": "English Biblical Place 1", "desc": "該地點在本章事件中的歷史與神學意義（40～60字）", "descEn": "Historical and biblical significance of this location" }
      ]
    },
    "archaeology": {
      "era": "精確歷史年代與考古分期（如：主前15世紀晚銅器時代 / 主後1世紀羅馬帝國時期）",
      "canaaniteContext": "當時近東或希羅世界的宗教、文化、政治與社會背景詳解（100～150字）",
      "treatyStructure": "本章涉及的古代盟約結構、律法禮儀、文學體裁或原文關鍵字詞深度考證（120～180字）",
      "visualArtifacts": [
        {
          "title": "真實出土文物或遺址1（格式：中文名稱 (Official English Name)，如：死海古卷 (Dead Sea Scrolls)）",
          "searchQuery": "英文維基百科精確條目名（如：Dead Sea Scrolls）",
          "category": "博物館館藏文物 / 考古遺址",
          "tag": "Archaeology",
          "description": "詳述該文物之出土年代、現藏博物館、銘文內容及如何印證本章經文歷史背景（80～120字）",
          "imageBadge": "🏛️ 維基百科實物考證"
        },
        {
          "title": "真實出土文物或遺址2（格式：中文名稱 (Official English Name)，如：希西家王印 (King Hezekiah bulla)）",
          "searchQuery": "英文維基百科精確條目名（如：Hezekiah）",
          "category": "歷史地理遺址 / 碑銘實物",
          "tag": "Biblical History",
          "description": "詳述該遺址或文物之考古發現過程與對理解本章經文的關鍵啟發（80～120字）",
          "imageBadge": "📜 歷史遺址實景"
        }
      ]
    },
    "difficulties": [
      {
        "question": "疑難問題1：針對本章經文最常被信徒或慕道友追問的核心神學/倫理/歷史難題",
        "answer": "扎實正統的多層次神學解答（120～180字：結合上下文、全本聖經整全啟示與正統教義深入剖析）"
      },
      {
        "question": "疑難問題2：針對本章特定經節字句或表面張力的釋經難題",
        "answer": "扎實正統的多層次神學解答（120～180字：釐清原文語境、歷史背景與福音核心應用）"
      }
    ],
    "leaderGuide": {
      "icebreaker": "5分鐘小組破冰提問（50～80字：貼近生活、輕鬆自然切入本章主題）",
      "flowTips": "小組帶領節奏與牧養引導秘訣（80～120字：提醒組長如何掌握討論深度、處理敏感問題與引導心靈分享）",
      "timeBudget": "建議時間分配（如：破冰 10分鐘 · 經文細讀 15分鐘 · 深度討論 25分鐘 · 彼此代禱 10分鐘）"
    }
  }
}
/no_think`;
  },

  // 構造多堂主題查經套裝 (Thematic Curriculum) Prompt
  buildCurriculumPrompt(topic, sessionCount, audience, selectedTastes) {
    const tasteNames = (selectedTastes || []).map(t => t.name).join("、");

    return `
你現在是「Bible Backpack（聖經行囊）」的【小組主題查經企劃主管】。
請為小組設計一套完整的【${sessionCount} 堂主題查經系列課程套裝】。

【課程基本參數】：
- 主題名稱：${topic}
- 預定堂數：共 ${sessionCount} 堂
- 目標群體：${audience || "小組團契"}
- 研經口味與視角：${tasteNames || "自然理性、生活應用、正統研經"}

【企劃守則】：
1. 嚴格遵守基督信仰正統大公教義，每堂選取 1 處最具代表性的聖經經文（舊約新約均衡搭配）。
2. 層次遞進：從「問題與現況」➔「神的話語與榜樣」➔「生命突破」➔「得勝同行與差遣」。
3. 每一堂課需包含：單元標題、推薦經卷及章節（書卷名稱必須完全符合標準中文和合本書名，如：創世記、約書亞記、羅馬書等）、核心信息、小組破冰提問及生活操練行動。

【請輸出嚴格合法的純 JSON 格式】：所有字串內部如有雙引號請使用 \\" 轉義，換行請使用 \\n，絕對禁止未轉義的原始換行或未閉合引號。JSON 結構如下：
{
  "title": "${topic}：小組查經系列",
  "subtitle": "副標題（點出這套課程的核心盼望）",
  "target": "${audience || "小組團契"}",
  "sessionCount": ${sessionCount},
  "overview": "全套課程總結與小組長帶領說明（約120字）",
  "sessions": [
    {
      "sessionNum": 1,
      "title": "第 1 堂標題",
      "bookName": "標準書卷名（如：約書亞記）",
      "chapter": 1,
      "passageRange": "如：約書亞記 1:1-9",
      "coreMessage": "核心信息概述",
      "discussionTheme": "討論重點與生命切入點",
      "icebreaker": "小組破冰提問（5分鐘趣味引導）",
      "lifeAction": "本週生活行動操練"
    }
  ]
}
/no_think`;
  },

  // 系統提示詞（嚴守歷史正統大公信經、要求完整且詳盡輸出 tier1 與 tier2 雙層架構之純 JSON）
  buildSystemPrompt() {
    return "You are a senior Christian theological curriculum director and biblical archaeologist adhering strictly to historic creedal orthodoxy (Nicene Creed, Apostles' Creed, classical Trinitarianism). CRITICAL REQUIREMENT: Return a single valid, deeply detailed, comprehensive JSON object in Traditional Chinese (繁體中文) containing BOTH 'tier1_sheet' AND 'tier2_dossier'. Never write brief or superficial one-sentence summaries; provide rich verse-by-verse exposition, thorough historical/archaeological analysis, and extensive leader hints. For 'visualArtifacts', ONLY cite real, Wikipedia-verifiable museum artifacts or archaeological sites with their exact English Wikipedia article title in 'searchQuery'. Output valid JSON only, without markdown backticks or thinking blocks. /no_think";
  },

  // 輔助函式：判斷錯誤是否屬於「暫時繁忙/可切換備用模型重試」之類型
  isRecoverableError(status, errMsg) {
    const msg = (errMsg || "").toLowerCase();
    return (
      status === 503 ||
      status === 429 ||
      status === 404 ||
      status === 500 ||
      msg.includes("demand") ||
      msg.includes("busy") ||
      msg.includes("overload") ||
      msg.includes("temporar") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("resource has been exhausted") ||
      msg.includes("not found") ||
      msg.includes("deprecated") ||
      msg.includes("unavailable") ||
      msg.includes("unterminated") ||
      msg.includes("syntaxerror") ||
      msg.includes("json") ||
      msg.includes("parse") ||
      msg.includes("abort") ||
      msg.includes("timeout")
    );
  },

  // 安全清潔並解析 AI 返回之 JSON，包含 Qwen3/3.5 <think> 標籤剝離、未閉合字串修復、未轉義換行過濾、截斷自動補全
  cleanAndParseJSON(rawText, bookName = "聖經", chapter = 1) {
    if (!rawText || typeof rawText !== "string") {
      throw new Error("AI 未返回有效文本內容");
    }

    let cleaned = rawText.trim();
    // 0. 剝離 Qwen 3 / Qwen 3.5 / DeepSeek R1 等推理模型的 <think>...</think> 思考區塊
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    // 若思考區塊未閉合但後方已有 JSON 大括號，截取最後一個 </think> 之後或第一個 { 之後的內容
    if (cleaned.startsWith("<think>")) {
      const firstJsonBrace = cleaned.indexOf("{");
      if (firstJsonBrace !== -1) {
        cleaned = cleaned.substring(firstJsonBrace).trim();
      }
    }

    // 移除 markdown 代碼標籤 (```json ... ```)
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

    let parsed = null;

    // 1. 嘗試直接原生解析
    try {
      parsed = JSON.parse(cleaned);
    } catch (e1) {
      console.warn("[Bible Backpack] 初次 JSON.parse 異常，嘗試多重容錯修復:", e1.message);
    }

    // 2. 提取最外層大括號 { ... }
    if (!parsed) {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const sub = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(sub);
        } catch (e2) {}
      }
    }

    // 3. 修復字串內部未轉義的原始換行符號 (Gemini 常見問題：造成 Unterminated string)
    if (!parsed) {
      try {
        let inString = false;
        let escaped = false;
        const chars = [];
        for (let i = 0; i < cleaned.length; i++) {
          const c = cleaned[i];
          if (c === '"' && !escaped) {
            inString = !inString;
            chars.push(c);
          } else if (inString && c === '\n') {
            chars.push('\\n');
          } else if (inString && c === '\r') {
            // 略過 \r
          } else if (inString && c === '\t') {
            chars.push('\\t');
          } else {
            chars.push(c);
          }
          escaped = (c === '\\' && !escaped);
        }
        parsed = JSON.parse(chars.join(""));
      } catch (e3) {}
    }

    // 4. 截斷修復 (若達到 token 上限在字串中間中斷，嘗試補全未閉合的引號與括號)
    if (!parsed) {
      try {
        parsed = this.repairTruncatedJSON(cleaned);
      } catch (e4) {
        console.warn("[Bible Backpack] 截斷修復嘗試:", e4.message);
      }
    }

    if (parsed) {
      // ★ 關鍵防護：若輕量模型（如 Groq GPTOSS）只生成了 tier1_sheet 而漏掉了 tier2_dossier
      // 自動補齊結構，確保使用者點擊「深度研經行囊」時永遠有完整的地貌、考證與組長指引！
      if (parsed.tier1_sheet && !parsed.tier2_dossier) {
        console.warn("[Bible Backpack] 模型漏發 tier2_dossier，自動補齊深度研經行囊！");
        parsed.tier2_dossier = this.buildDefaultTier2Dossier(bookName, chapter, parsed.tier1_sheet);
      }
      return parsed;
    }

    throw new Error(`AI 生成的數據格式未完整 (${cleaned.slice(-40)}...)，建議重新嘗試或切換模型通道。`);
  },

  // 當輕量模型漏發深度行囊時的自動合成兜底
  buildDefaultTier2Dossier(bookName, chapter, tier1) {
    return {
      title: `${bookName || '聖經'}第${chapter || 1}章 · 深度研經行囊`,
      subtitle: tier1?.subtitle || "背景考證 · 地理環境 · 人物檔案 · 疑難解答",
      characters: [
        { 
          name: "本章主要屬靈人物", 
          title: "聖經人物", 
          profile: "請詳見左側經文記載", 
          psychologicalInsight: "在信仰歷程與神的心意中展現的信靠、掙扎與突破。" 
        }
      ],
      geography: {
        isJourneyRoute: false,
        location: "古代聖地歷史現場",
        terrain: "聖經歷史地理與水文環境",
        hydrologyInsight: "地理環境反映了當時歷史救贖事件的客觀真實背景與地緣脈絡。",
        routePoints: [
          { lat: 31.7767, lng: 35.2345, name: "耶路撒冷與聖地歷史現場", nameEn: "Jerusalem & Biblical Historic Sites", desc: "相關地理脈絡考證", descEn: "Historical geographical context of the biblical events" }
        ]
      },
      archaeology: {
        era: "古代歷史時期",
        canaaniteContext: "當時古代近東社會地緣文化狀態",
        treatyStructure: "歷史文化考證與古代出土文物印證",
        visualArtifacts: [
          {
            title: "古代聖經文獻與歷史文物",
            searchQuery: "Jerusalem ancient archaeological excavations",
            category: "考古文物",
            tag: "Archaeology",
            imageUrl: "assets/images/cuneiform-tablet.jpg",
            description: "出土歷史文物印證了聖經記載的時代真實性與文化脈絡。",
            imageBadge: "📜 歷史文獻考證"
          }
        ]
      },
      difficulties: [
        { 
          question: "本章經文的核心神學意涵與屬靈焦點為何？", 
          answer: tier1?.snapshot || "回歸基督救恩焦點與大公教會正統教義解析，在信仰生活中活出真道。" 
        }
      ],
      leaderGuide: {
        icebreaker: tier1?.discussionQuestions?.[0]?.question || "請分享本章經文中最觸動你心的一處經文？",
        flowTips: "鼓勵組員從經文客觀事實出發，連結個人職場與生活應用。",
        timeBudget: "經文觀察 20 分鐘 · 深度討論 25 分鐘 · 總結禱告 15 分鐘"
      }
    };
  },

  // 截斷 JSON 自動閉合修復
  repairTruncatedJSON(str) {
    let cleanStr = str.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    let inString = false;
    let escaped = false;
    const stack = [];

    for (let i = 0; i < cleanStr.length; i++) {
      const char = cleanStr[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          if (stack.length && stack[stack.length - 1] === '{') stack.pop();
        } else if (char === ']') {
          if (stack.length && stack[stack.length - 1] === '[') stack.pop();
        }
      }
    }

    let repaired = cleanStr;
    // 若在引號內被截斷，先補閉合引號
    if (inString) {
      repaired += '"';
    }

    // 清理尾部未完成的鍵值對或逗號（例如: `,"key":` 或 `,"key": "` 或 `,`）
    repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*"?[^"]*$/g, "");
    repaired = repaired.replace(/,\s*$/g, "");

    // 補齊未閉合的括號
    while (stack.length > 0) {
      const open = stack.pop();
      repaired = repaired.replace(/,\s*$/g, "");
      if (open === '{') repaired += '}';
      else if (open === '[') repaired += ']';
    }

    return JSON.parse(repaired);
  },

  // 向 AI 發起單章研經請求（內建本地快取 + Groq/Gemini 雙通道 + 多模型自動故障轉移 + 支援小組主題課程上下文）
  async generateStudyPack(bookName, chapter, selectedTastes, customKeyword, onStatusUpdate = null, bypassCache = false, curriculumContext = null) {
    let tasteHash = (selectedTastes || []).map(t => t.id).sort().join("-") + (customKeyword ? `-${customKeyword}` : "");
    if (curriculumContext) {
      tasteHash += `-curriculum-${curriculumContext.packId || 'pack'}-${curriculumContext.sessionNum || 1}`;
    }
    
    // 1. 若非強制重新調配，優先檢查本地快取，0 毫秒極速載入
    if (!bypassCache) {
      const cached = BackpackStore.getCachedPack(bookName, chapter, tasteHash);
      if (cached) {
        console.log(`⚡ 從本地持久快取載入【${bookName} 第 ${chapter} 章】${curriculumContext ? '主題課程' : ''}研經材料！`);
        return cached;
      }
    }

    const provider = BackpackStore.getProvider();
    const promptText = this.buildPrompt(bookName, chapter, selectedTastes, customKeyword, curriculumContext);

    // 2. 若選擇本地離線 AI (Ollama / LM Studio)
    if (provider === "local") {
      const localEndpoint = BackpackStore.getLocalEndpoint();
      const localModel = BackpackStore.getLocalModel();
      const result = await this.generateWithLocalAI(promptText, onStatusUpdate, bookName, chapter, localEndpoint, localModel);
      BackpackStore.saveCachedPack(bookName, chapter, tasteHash, result);
      return result;
    }

    // 3. 若選擇 Groq 供應商（超高速 500 tokens/sec，永不 High Demand）
    if (provider === "groq") {
      const result = await this.generateWithGroq(promptText, onStatusUpdate, bookName, chapter);
      BackpackStore.saveCachedPack(bookName, chapter, tasteHash, result);
      return result;
    }

    // 4. 預設 Google Gemini 通道：具備多模型自動容錯與防 High Demand 輪替鏈
    const rawApiKey = BackpackStore.getApiKey();
    const apiKey = (rawApiKey || "").trim().replace(/^["']|["']$/g, '');
    if (!apiKey) {
      throw new Error("NO_API_KEY");
    }

    const preferredModel = BackpackStore.getModelName() || "gemini-2.5-flash";
    const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
    let lastError = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      if (onStatusUpdate) {
        onStatusUpdate(i === 0 ? `正在連接 ${model} 進行深度神學調配...` : `⚠️ 前通道連線逾時（>90秒），已自動無縫切換至備用通道 ${model}...`);
      }

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutMs = 90000; // 用戶要求：至少 90 秒充裕等待時間
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const generationConfig = {
          temperature: 0.45,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        };
        // 🚀 關鍵速度突破：Gemini 2.5 預設啟用動態思考（消耗 20 秒），設定 thinkingBudget: 0 關閉思考過程，速度提升 3~4 倍！
        if (model.includes("2.5")) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${response.status}`;
          
          if (this.isRecoverableError(response.status, errMsg)) {
            console.warn(`[Bible Backpack] 模型 ${model} 暫時繁忙 (${errMsg})，立即切換備用模型...`);
            lastError = new Error(`模型 ${model} 繁忙: ${errMsg}`);
            await new Promise(r => setTimeout(r, 600)); // 輕微防抖
            continue;
          }
          throw new Error(errMsg);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("未能從 AI 獲取生成文本");

        const parsed = this.cleanAndParseJSON(rawText, bookName, chapter);
        BackpackStore.setModelName(model); // 記錄當前通暢的模型
        BackpackStore.saveCachedPack(bookName, chapter, tasteHash, parsed); // 自動儲存快取
        return parsed;

      } catch (err) {
        lastError = err;
        const isRecoverable = err.name === "AbortError" || this.isRecoverableError(0, err.message);
        if (isRecoverable && i < modelsToTry.length - 1) {
          console.warn(`[Bible Backpack] 連線 ${model} 異常，嘗試下一備用模型:`, err.message);
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        if (!isRecoverable) throw err;
      }
    }

    throw lastError || new Error("Google Gemini 目前各模型線路均極度繁忙。建議在右上角設置切換為【Groq 免費極速通道】徹底避免塞車！");
  },

  // 生成多堂主題查經套裝 (Thematic Curriculum Planner)
  async generateCurriculum(topic, sessionCount = 4, audience = "小組團契", selectedTastes = [], onStatusUpdate = null) {
    const provider = BackpackStore.getProvider();
    const promptText = this.buildCurriculumPrompt(topic, sessionCount, audience, selectedTastes);

    if (provider === "local") {
      const localEndpoint = BackpackStore.getLocalEndpoint();
      const localModel = BackpackStore.getLocalModel();
      const parsed = await this.generateWithLocalAI(promptText, onStatusUpdate, topic, 1, localEndpoint, localModel);
      parsed.id = "pack-" + Date.now();
      parsed.createdAt = new Date().toLocaleDateString();
      return parsed;
    }

    if (provider === "groq") {
      const parsed = await this.generateWithGroq(promptText, onStatusUpdate);
      parsed.id = "pack-" + Date.now();
      parsed.createdAt = new Date().toLocaleDateString();
      return parsed;
    }

    const rawApiKey = BackpackStore.getApiKey();
    const apiKey = (rawApiKey || "").trim().replace(/^["']|["']$/g, '');
    if (!apiKey) throw new Error("NO_API_KEY");

    const preferredModel = BackpackStore.getModelName() || "gemini-2.5-flash";
    const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
    let lastError = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      if (onStatusUpdate) {
        onStatusUpdate(i === 0 ? `AI 神學主管正在使用 ${model} 規劃 ${sessionCount} 堂課程大綱...` : `⚠️ ${model} 繁忙，切換備用模型進行企劃...`);
      }

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutMs = 120000; // 課程規劃至少 120 秒充裕時間
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
              responseMimeType: "application/json"
            }
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${response.status}`;
          if (this.isRecoverableError(response.status, errMsg)) {
            lastError = new Error(errMsg);
            await new Promise(r => setTimeout(r, 600));
            continue;
          }
          throw new Error(errMsg);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("未能從 AI 獲取規劃內容");

        const parsed = this.cleanAndParseJSON(rawText);
        parsed.id = "pack-" + Date.now();
        parsed.createdAt = new Date().toLocaleDateString();
        return parsed;

      } catch (err) {
        lastError = err;
        const isRecoverable = err.name === "AbortError" || this.isRecoverableError(0, err.message);
        if (isRecoverable && i < modelsToTry.length - 1) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        if (!isRecoverable) throw err;
      }
    }

    throw lastError || new Error("未能成功生成主題查經套裝，請重試或切換至 Groq 通道。");
  },

  // 本地離線 AI 通道 (Ollama 原生 /api/chat 設定 think: false 極速推理，並相容 LM Studio /v1)
  async generateWithLocalAI(promptText, onStatusUpdate = null, bookName = "聖經", chapter = 1, endpoint = null, modelName = null) {
    const rawEndpoint = endpoint || BackpackStore.getLocalEndpoint() || "http://localhost:11434/v1";
    const cleanEndpoint = rawEndpoint.trim().replace(/\/+$/, '');
    const baseUrl = cleanEndpoint.replace(/\/v1$/i, '').replace(/\/api\/chat$/i, '').replace(/\/api$/i, '');
    const model = modelName || BackpackStore.getLocalModel() || "qwen3.5:9b";

    if (onStatusUpdate) {
      onStatusUpdate(`💻 正在透過本地離線 AI (${model} · 已關閉思考耗時) 極速生成中...`);
    }

    const sysPrompt = this.buildSystemPrompt();
    const messages = [
      { role: "system", content: sysPrompt },
      { role: "user", content: promptText }
    ];

    const controller = new AbortController();
    const timeoutMs = 180000; // 本地 CPU/GPU 推理給予 180 秒充裕運算保護
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let res = null;
      const isLMStudioPort = baseUrl.includes(":1234");

      // 優先使用 Ollama 原生 /api/chat 端點並強制設定 think: false，徹底關閉 Qwen3/3.5 漫長思考過程
      if (!isLMStudioPort) {
        const ollamaChatUrl = `${baseUrl}/api/chat`;
        const ollamaPayload = {
          model: model,
          messages: messages,
          think: false,
          format: "json",
          stream: false,
          options: {
            temperature: 0.45,
            num_ctx: 16384,
            num_predict: 8192
          }
        };

        res = await fetch(ollamaChatUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(ollamaPayload)
        });
      }

      // 若為 LM Studio (:1234) 或 /api/chat 返回 404，自動退回 OpenAI 相容端點 /v1/chat/completions
      if (!res || res.status === 404) {
        const v1ChatUrl = `${baseUrl}/v1/chat/completions`;
        const v1Payload = {
          model: model,
          messages: messages,
          think: false,
          temperature: 0.45,
          max_tokens: 8192,
          options: {
            num_ctx: 16384,
            num_predict: 8192
          },
          response_format: { type: "json_object" },
          stream: false
        };

        res = await fetch(v1ChatUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(v1Payload)
        });
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`本地 AI 響應異常 (HTTP ${res.status}): ${errText.slice(0, 160)}`);
      }

      const json = await res.json();
      const content = json.message?.content || json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("本地模型未返回有效文本內容");
      }

      return this.cleanAndParseJSON(content, bookName, chapter);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("本地 AI 運算逾時（>180秒）。建議使用參數量較小之模型（如 qwen2.5:7b 或 qwen3.5:9b），或確認顯卡加速已啟用。");
      }
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        throw new Error(`無法連接本地 AI 端點 (${baseUrl})。請確認 Ollama 或 LM Studio 是否已在本機啟動。`);
      }
      throw err;
    }
  },

  // Groq 超高速推論服務 (100% 免費、0 延遲、永無 High Demand 塞車)
  async generateWithGroq(promptText, onStatusUpdate = null, bookName = "", chapter = 1) {
    const rawKey = BackpackStore.getGroqKey();
    const apiKey = (rawKey || "").trim();
    if (!apiKey) {
      throw new Error("請先在右上角設置填入免費 Groq API Key！可在 console.groq.com 免費申請。");
    }

    const groqModel = BackpackStore.getGroqModel() || "llama-3.3-70b-versatile";

    if (onStatusUpdate) {
      onStatusUpdate(`⚡ 正在透過 Groq (${groqModel}) 進行超極速神學調配...`);
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { 
            role: "system", 
            content: this.buildSystemPrompt()
          },
          { role: "user", content: promptText }
        ],
        temperature: 0.45,
        max_tokens: 8000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Groq API 請求失敗 (HTTP ${response.status})`;
      
      // 若遇到模型退役或無權限（如 llama-3.1-8b-instant 已退役），自動平滑切換至旗艦 llama-3.3-70b-versatile
      if ((errMsg.includes("does not exist") || errMsg.includes("access") || response.status === 404) && groqModel !== "llama-3.3-70b-versatile") {
        console.warn(`[Groq] 模型 ${groqModel} 無效 (${errMsg})，自動平滑切換至旗艦通道 llama-3.3-70b-versatile...`);
        if (onStatusUpdate) {
          onStatusUpdate(`⚠️ 模型 ${groqModel} 在 Groq 已退役，已為您自動切換至穩定的旗艦通道 llama-3.3-70b-versatile 極速生成中...`);
        }
        BackpackStore.setGroqModel("llama-3.3-70b-versatile");
        return this.generateWithGroq(promptText, onStatusUpdate, bookName, chapter);
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) throw new Error("未能從 Groq 獲取生成文本");

    return this.cleanAndParseJSON(rawText, bookName, chapter);
  },

  // 測試 API Key 或本地端點有效性
  async testApiKey(apiKey, modelName = "gemini-2.5-flash", provider = "gemini", customEndpoint = "") {
    if (provider === "local") {
      const endpoint = (customEndpoint || BackpackStore.getLocalEndpoint() || "http://localhost:11434/v1").trim().replace(/\/+$/, "");
      const baseUrl = endpoint.replace(/\/v1$/i, "").replace(/\/api\/chat$/i, "").replace(/\/api$/i, "");
      const model = (modelName || BackpackStore.getLocalModel() || "qwen3.5:9b").trim();
      try {
        // 先嘗試 Ollama 原生 /api/tags，若 404 則嘗試 /v1/models
        let resp = await fetch(`${baseUrl}/api/tags`, { method: "GET" }).catch(() => null);
        if (!resp || !resp.ok) {
          resp = await fetch(`${baseUrl}/v1/models`, { method: "GET" });
        }
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          const availableModels = data.models
            ? data.models.map(m => m.name || m.model).filter(Boolean)
            : (data.data || []).map(m => m.id).filter(Boolean);
          let note = "";
          if (availableModels.length > 0) {
            note = `（本地模型列表：${availableModels.slice(0, 4).join(", ")}${availableModels.length > 4 ? "..." : ""}）`;
          }
          return { 
            ok: true, 
            activeModel: model, 
            availableModels: availableModels,
            message: `💻 本地離線 AI (/api/chat · think:false 加速) 連線成功！${note}` 
          };
        }
        return { ok: false, message: `本地端點響應異常 (HTTP ${resp.status})，請確認 Ollama 或 LM Studio 是否正常運行。` };
      } catch (e) {
        return { 
          ok: false, 
          message: `無法連接本地端點 (${baseUrl})。請確認本機已啟動 Ollama / LM Studio，並已設定環境變數 OLLAMA_ORIGINS="*" 允許瀏覽器通訊。` 
        };
      }
    }

    const cleanKey = (apiKey || "").trim().replace(/^["']|["']$/g, '');
    if (!cleanKey) return { ok: false, message: "請先輸入 API Key" };

    if (provider === "groq") {
      try {
        let groqModel = modelName || BackpackStore.getGroqModel() || "llama-3.3-70b-versatile";
        const resp = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { "Authorization": `Bearer ${cleanKey}` }
        });
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          const availableModels = (data.data || []).map(m => m.id);
          let note = "";
          if (availableModels.length > 0 && !availableModels.includes(groqModel)) {
            const fallback = availableModels.includes("llama-3.3-70b-versatile") 
              ? "llama-3.3-70b-versatile" 
              : (availableModels.find(m => m.includes("llama") || m.includes("gpt") || m.includes("mixtral")) || availableModels[0]);
            note = `（⚠️ 原選之 ${groqModel} 已退役，已為您自動修正為在線的 ${fallback}）`;
            groqModel = fallback;
            BackpackStore.setGroqModel(groqModel);
          }
          return { ok: true, activeModel: groqModel, message: `⚡ Groq 連線成功！當前模型：${groqModel} ${note}` };
        }
        return { ok: false, message: "Groq API Key 無效，請確認後重新輸入" };
      } catch (e) {
        return { ok: false, message: "無法連接 Groq 伺服器，請檢查網路狀況" };
      }
    }

    // Google Gemini 測試
    const models = [modelName, ...this.FALLBACK_MODELS.filter(m => m !== modelName)];
    let lastErrMsg = "";
    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello" }] }],
            generationConfig: { maxOutputTokens: 5 }
          })
        });

        if (response.ok) {
          return { ok: true, activeModel: model, message: `✅ Google Gemini 連線成功！有效通道：${model}` };
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${response.status}`;
          lastErrMsg = errMsg;
          if (response.status === 400 || errMsg.toLowerCase().includes("key") || errMsg.toLowerCase().includes("api_key")) {
            return { ok: false, message: `API Key 無效或未開通權限：${errMsg}` };
          }
        }
      } catch (e) {
        lastErrMsg = e.message;
      }
    }
    return { ok: false, message: `Google Gemini 連線失敗：${lastErrMsg || "請檢查 API Key 或網路連線"}` };
  }
};
