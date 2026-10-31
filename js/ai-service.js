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

  // 解析經文範圍字串（例如："撒母耳記上 17:32-50"、"17:32-50"、"1:1-9"、"19:1-18"、"40:27-31"、"12:1-10"）
  parseVerseRange(rangeStr) {
    if (!rangeStr || typeof rangeStr !== "string") return null;
    const match = rangeStr.match(/(\d+)[:：](\d+)\s*[-~至到]\s*(\d+)/) || rangeStr.match(/(\d+)\s*[-~至到]\s*(\d+)/);
    if (match) {
      if (match.length === 4) {
        return { start: parseInt(match[2]), end: parseInt(match[3]) };
      } else if (match.length === 3) {
        return { start: parseInt(match[1]), end: parseInt(match[2]) };
      }
    }
    return null;
  },

  // 根據章節經文節數與內容篇幅動態計算建議問題數量 (4~6 題)
  getRecommendedQuestionCount(bookName, chapter, verses = null) {
    let count = Array.isArray(verses) ? verses.length : 0;
    if (!count && typeof BibleService !== "undefined") {
      const cuvVerses = BibleService.getChapterVerses(bookName, chapter, "cuv");
      if (Array.isArray(cuvVerses)) count = cuvVerses.length;
    }
    if (count > 0 && count <= 15) return { verseCount: count, qCount: 4 };
    if (count >= 29) return { verseCount: count, qCount: 6 };
    return { verseCount: count || 20, qCount: 5 };
  },

  // 構造單章研經材料 Prompt（注入本地 BibleService 完整經文上下文，支援注入小組主題課程之堂數、主題與討論核心）
  // 構造單章研經材料 Prompt（根據目前語系自動派發）
  buildPrompt(bookName, chapter, selectedTastes, customKeyword, curriculumContext = null, version = null) {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    if (isEn) {
      return this.buildEnglishPrompt(bookName, chapter, selectedTastes, customKeyword, curriculumContext, version);
    }
    return this.buildChinesePrompt(bookName, chapter, selectedTastes, customKeyword, curriculumContext, version);
  },

  // 構造中文研經 Prompt
  buildChinesePrompt(bookName, chapter, selectedTastes, customKeyword, curriculumContext = null, version = "cuv") {
    const tasteNames = (selectedTastes || []).map(t => `${t.name} (${t.desc || t.category})`).join("、");
    const activeTasteList = (selectedTastes || []).map(t => t.name);

    // 從本地和合本資料庫提取經文（若為主題系列課程且指定了節數範圍，例如 17:32-50，優先高亮並聚焦該範圍經文）
    let scriptureContext = "";
    let chapterVerses = [];
    let focusedVersesText = "";
    const parsedRange = curriculumContext ? this.parseVerseRange(curriculumContext.passageRange) : null;

    if (typeof BibleService !== "undefined") {
      const verses = BibleService.getChapterVerses(bookName, chapter, version || "cuv");
      if (verses && verses.length > 0 && !verses[0].text.includes("正在載入") && !verses[0].text.includes("Loading")) {
        chapterVerses = verses;
        const formattedVerses = verses.map(v => `${v.num}. ${v.text}`).join("\n");
        scriptureContext = `\n【《${bookName}》第 ${chapter} 章經文原文（共 ${verses.length} 節，請務必緊扣以下經文細節、節數、人名與地名進行深度剖析，嚴禁空泛敷衍）】：\n${formattedVerses}\n`;

        if (parsedRange) {
          const ranged = verses.filter(v => v.num >= parsedRange.start && v.num <= parsedRange.end);
          if (ranged.length > 0) {
            focusedVersesText = `\n【★本堂小組指定聚焦研讀經文範圍（第 ${parsedRange.start} 至 ${parsedRange.end} 節，共 ${ranged.length} 節，所有小組查經討論題目必須嚴格鎖定在這幾節內！嚴禁提問範圍外的事件！）：】\n` + 
              ranged.map(v => `${v.num}. ${v.text}`).join("\n") + "\n";
          }
        }
      }
    }

    const { verseCount, qCount } = this.getRecommendedQuestionCount(bookName, chapter, chapterVerses);

    let curriculumInstruction = "";
    if (curriculumContext) {
      const rangeNotice = parsedRange 
        ? `【★★最重要核心範圍限制★★】：本堂課經文範圍為「${curriculumContext.passageRange}」（第 ${parsedRange.start}～${parsedRange.end} 節）！所有討論題目 (discussionQuestions Q1~Q${qCount})、經文快照與大綱，【必須 100% 聚焦在第 ${parsedRange.start} 至 ${parsedRange.end} 節的經文細節、對話與人物互動上】！絕對不要去提問或考究本章範圍之外（例如 1~${parsedRange.start - 1} 節或 ${parsedRange.end + 1} 節之後）的枝節！`
        : `【範圍聚焦】：聚焦本堂課指定經文範圍「${curriculumContext.passageRange || `${bookName} 第 ${chapter} 章`}」！`;

      curriculumInstruction = `
【★★極重要指令：本單張為小組主題系列課程專屬研經材料★★】：
- 本套系列主題：《${curriculumContext.packTitle || "小組主題課程"}》
- 本次課堂：第 ${curriculumContext.sessionNum || 1} 堂「${curriculumContext.sessionTitle || ""}」（聚焦經文範圍：${curriculumContext.passageRange || `${bookName} 第 ${chapter} 章`}）
- 本堂核心信息主旨：${curriculumContext.coreMessage || "無"}
- 小組討論焦點方向：${curriculumContext.discussionTheme || "無"}
- 指定小組破冰方向：${curriculumContext.icebreaker || "無"}
- 指定生活實踐操練：${curriculumContext.lifeAction || "無"}

${rangeNotice}
${focusedVersesText}
【課程連貫性與深度整合要求】：
1. 標題與副標題：tier1_sheet.title 請標註為「《${curriculumContext.packTitle || "小組主題"}》第 ${curriculumContext.sessionNum || 1} 堂 · ${curriculumContext.sessionTitle || ""}」，副標題深刻點出本堂主題。
2. 核心聚焦：經文快照 (snapshot)、經文分段 (outline)、人物檔案與神學剖析，必須強烈圍繞本堂指定經文範圍（${curriculumContext.passageRange || `${bookName} 第 ${chapter} 章`}）與核心信息「${curriculumContext.coreMessage || ""}」進行深度釋經。
3. 討論問題專屬客製化（共 ${qCount} 題，依本章篇幅動態調配）：
   - 【範圍守則】：所有問題的經文依據必須出自指定範圍「${curriculumContext.passageRange || `${bookName} 第 ${chapter} 章`}」，嚴禁提問範圍外的經文！
   - Q1 (經文觀察與細讀)：直接考核本堂指定範圍（如 ${curriculumContext.passageRange}）內的關鍵字句、人物對話、動作或具體情節細節。
   - Q2 (主題深入探討)：必須精準對接本堂「小組討論焦點方向：${curriculumContext.discussionTheme || ""}」，結合指定範圍經文，tag 標註「主題探討」。
   - Q3 (生活具體應用)：必須緊扣本堂「指定生活實踐操練：${curriculumContext.lifeAction || ""}」，引導組員從這幾節經文中反思落地行動。
   - 後續題目：聚焦本段經文的神學轉折與同伴守望代禱。
4. 破冰與組長提示：tier2_dossier.leaderGuide.icebreaker 請直接融入或深化本課堂指定之破冰「${curriculumContext.icebreaker || ""}」；flowTips 提供組長帶領本主題時的控場與牧養叮嚀。
`;
    }

    let kidsInstruction = "";
    const isKidsFocus = (selectedTastes || []).some(t => t.id === "kids" || t.name.includes("兒少") || t.name.includes("兒童")) ||
                        (customKeyword && /兒少|兒童|孩子|小學|校園|主日學|幼童|小學生|中學|青少年|young|child|kid|school/i.test(customKeyword)) ||
                        (curriculumContext && /兒童|兒少|主日學|kids|child/i.test(`${curriculumContext.packTitle} ${curriculumContext.target || ""}`));

    if (isKidsFocus) {
      kidsInstruction = `
【★★★極關鍵牧養守則：本單張啟動【兒少校園與兒童主日學 (Kids & Campus)】牧養適應模式★★★】：
1. 【目標群體】：國小至國中青少年/主日學學童（約 8～14 歲）及帶領他們的家長、主日學老師、團契輔導。
2. 【語言與認知風格】：
   - 語調必須生動鮮活、親切有趣、充滿故事畫面感，嚴禁使用生硬晦澀的成人學術名詞或枯燥神學大話！
   - 比喻必須大量取材自孩子的現實日常校園世界：學校班級分組、操場下課遊戲、考試作業壓力、被同學嘲笑或起鬨、轉學或面對新環境的恐懼、誠實認錯的勇氣、零食與玩具分享、跟死黨吵架與和好、沉迷手遊時的節制等。
   - 保持歷史正統真理核心，但用孩子聽得懂、眼睛會發亮的鮮明譬喻表達。
3. 【單張欄位專屬要求 (Tier 1 兒童查經單張)】：
   - title：標題請副標註「（兒少校園與家庭版）」。
   - snapshot (聖經冒險快照)：以引人入勝的故事冒險語氣撰寫，像生動的電影開場，點出本章主角遇到的最大考驗與神的大能引領。
   - outline (故事三大場景)：每個段落使用適合孩子閱讀的情節標題與簡潔說明。
   - 討論問題 (discussionQuestions，共 ${qCount} 題)：
     * Q1 (故事小偵探)：引導孩子自己從經文找出關鍵動作、人名或有趣對比（tag: 經文小偵探）。
     * Q2 (換位思考題)：引導孩子想像自己是經文中的人物，那時會有多害怕、驚訝或興奮（tag: 換位思考）。
     * Q3 (★校園生活挑戰題)：必須精準切入學校或同儕真實情境（例如：班上有人被排擠時你敢不敢跟他做朋友、考試看到別人作弊你怎麼辦、分組沒人找你時如何倚靠神），提示 (hint) 明確指導老師/家長如何溫柔傾聽與引導孩子敞開分享（tag: 校園生活）。
     * 後續題目（勇氣小任務/感恩分享）：具體、簡單、本週就能在學校或家裡做的一件愛心或勇氣行動（tag: 勇氣任務）。
     * 每題的 answer（導師/家長標準參考答案）：提供老師與家長在孩子回答後，能用溫暖、正統且淺顯的語言作總結的標準答案。
   - takeaway (心靈金句與比喻)：給孩子一句好記又溫暖的校園信心力量金句。
   - prayer (出聲小禱告)：簡短、親切、真誠，讓孩子能一句一句跟著老師出聲朗讀的禱文。
4. 【深度手冊欄位專屬要求 (Tier 2 兒少導師與家長手冊)】：
   - leaderGuide.icebreaker (5分鐘動態破冰)：請設計一個不用複雜道具、能在教室或客廳進行的「趣味動態破冰小遊戲/肢體互動」，讓孩子瞬間打成一片！
   - difficulties (童言童語大哉問)：針對孩子最常問的天真卻深奧的提問（如：上帝創造世界前在做什麼？為什麼神允許壞事發生？），提供家長與老師可以直接用 10 歲孩子聽得懂的語言回答的明智解答。
   - archaeology.visualArtifacts：以「古代冷知識 / 探險家歷史實景」的生動角度介紹博物館真實文物，激發孩子探索聖經世界的好奇心！
`;
    }

    const extraQuestionsSchemaZh = [];
    if (qCount >= 5) {
      extraQuestionsSchemaZh.push(`      ,{
        "id": "q5",
        "type": "深度神學與轉折剖析",
        "tag": "經文深掘",
        "question": "第5題：針對本章中後段重要情節轉折、關鍵字詞或神學張力的進深探究題（40～70字）",
        "hint": "詳盡組長引導提示（60～100字：提供段落前後呼應線索與思考方向）",
        "answer": "組長手冊標準參考答案（80～140字：給出明確的經文節數依據、正統神學詮釋與總結歸納要點，供組長在組員發言後作完整總結）"
      }`);
    }
    if (qCount >= 6) {
      extraQuestionsSchemaZh.push(`      ,{
        "id": "q6",
        "type": "生命整全與救恩視野",
        "tag": "整全應用",
        "question": "第6題：貫穿全章首尾、連結基督救恩藍圖與信徒群體見證的總結性問題（40～70字）",
        "hint": "詳盡組長引導提示（60～100字：引導組員看見本章在整本聖經中的救贖意義與本週實踐）",
        "answer": "組長手冊標準參考答案（80～140字：給出全章神學主軸歸納、基督中心視角解答及具體牧養總結）"
      }`);
    }

    return `
你現在是「Bible Backpack（聖經行囊）」的【神學內容主管 (Theological Content Director)】。
請為聖經《${bookName}》第 ${chapter} 章生成一套內容極其豐富、具神學深度、符合正統基督信仰的雙層研經行囊材料。
${scriptureContext}
${curriculumInstruction}
${kidsInstruction}
【★用戶選定的個人研經口味與視角風格（必須在討論問題、心靈反思與結語比喻中展現鮮明辨識度，嚴禁千篇一律的公版套話！）】：
- 核心選定視角：${tasteNames || "自然理性、生活應用、正統研經"}
- 自訂興趣/專業背景備註：${customKeyword ? `「${customKeyword}」（★極重要指令：請在 Q3 生活反思題、Takeaway 結語與人物剖析中，直接運用此領域的思維模型、生活痛點或專業比喻作深刻呼應！）` : "無特定，請集中發揮上述選定之視角"}

【神學守則與個人化風格要求 (Depth, Orthodoxy & Taste Customization)】：
1. 【正統信仰底線】：完全遵循大公教會歷史正統信仰（使徒信經、尼西亞信經、唯獨恩典因信稱義）。嚴厲排斥任何異端、偏激或偏離聖經原意的曲解。
2. 【★動態查經題數（4～6 題）與組長標準答案要求】：
   - 查經討論題數量必須根據經文內容多寡動態設定為 **4 至 6 題**（短篇經文 ≤15節為 4 題；中等篇幅 16～28節為 5 題；長篇豐富經文 ≥29節為 6 題）。本章共 ${verseCount} 節，請為本章精準設計 **${qCount} 題**！
   - 每一道討論題除了給組員看的「組長引導提示 (hint，60～100字)」之外，**必須額外提供「組長手冊標準參考答案 (answer，80～140字)」**！
   - 「標準參考答案 (answer)」將顯示在【Tier 2 組長備課手冊】中，必須包含：(1) 明確的經文節數依據與客觀答案、(2) 歷史背景或神學核心剖析、(3) 組長在組員討論後可直接宣讀或歸納的總結要點。
3. 【★拒絕簡略敷衍，要求極高豐富度與神學深度】：
   - 無論使用哪一款模型，每個欄位的文字都必須**詳實飽滿、引經據典（明確標註第幾節）、具牧養溫度與神學洞察**，絕對不可只寫一兩句話帶過！
   - 經文分段（outline）必須涵蓋全章並分為 3 至 4 個詳細段落。
   - 人物檔案（characters）必須列出 2 至 3 位關鍵人物或群體，每位包含詳盡生平與 80～120 字的深度心理與屬靈掙扎洞察。
   - 疑難解答（difficulties）必須列出 2 至 3 個深具挑戰性的核心神學/釋經難題，每題解答（answer）必須達 120～180 字。
4. 【★個人化口味差異化滲透要求 (Making Tastes Feel Unmistakably Distinct)】：
   - 討論題第 2 題 (Q2)：必須直接聚焦於用戶選定的第 1 項口味（例如選「古代考古/歷史」則問當時條約法理與地緣統治；選「數學邏輯/自然科學」則問因果結構、對稱 Chiasm 與自然規律；選「心理認知」則深究恐懼防禦與認知重構；選「小組導師」則設計具備群體互動張力的切入點），tag 必須自訂反映該口味（如「歷史盟約」、「邏輯因果」、「心靈防禦」、「導師錦囊」）。
   - 討論題第 3 題 (Q3)：必須直接連結用戶填寫的「自訂背景」（如軟體工程師、管理者、教育、藝術等）或第 2 項口味，設計切中該領域日常痛點與思維模型的深度反思題，tag 標註「專業反思」或「職場應用」。
   - 今日默想結語 (takeaway)：必須生動融合該口味或自訂背景的鮮明比喻（例如：若用戶是工程師，比喻底層架構與神聖協議；若為心理，比喻卸下內在防衛；若為默想，比喻幽谷清泉），拒絕乾癟的道德教條！
5. 【★考古實物與維基百科精準驗證要求 (Visual Artifacts Rule)】：
   - visualArtifacts 必須列出 2 項真實存在的博物館館藏考古文物、古代銘文或真實聖經歷史遺址（嚴禁編造「信心之盾」、「恩典之泉」等抽象比喻詞！）。
   - title 格式必須為「中文名稱 (Official English Name)」，例如：「但丘大衛家石碑 (Tel Dan Stele)」、「居魯士圓柱 (Cyrus Cylinder)」、「死海古卷以賽亞卷 (Dead Sea Scrolls)」、「迦百農古代會堂遺址 (Capernaum Synagogue)」。
   - searchQuery 必須填寫該文物或遺址在 English Wikipedia (英文維基百科) 的精確標準條目名稱（純英文，如 "Tel Dan stele", "Cyrus Cylinder", "Dead Sea Scrolls"）。
6. 【★聖經地理與行軍路線嚴格守則 (Geography & Map Guardrail)】：
   - geography.isJourneyRoute：只有當本章經文明確記載「實際的行軍移動、出埃及遷徙、曠野行程或使徒宣教旅程」時才設為 true；若為定點事件或教導一律設為 false。
   - geography.routePoints：只標註真實聖經地點與座標。

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
        "hint": "詳盡組長引導提示（60～100字：指出應留意第幾節的關鍵字詞、人物動作對比與上下文線索）",
        "answer": "組長手冊標準參考答案（80～140字：提供明確的經文節數證據、客觀事實整理與組長總結陳詞）"
      },
      {
        "id": "q2",
        "type": "理解與洞察",
        "tag": "【依所選第1口味自訂標籤】",
        "question": "第2題：深度貫穿【${activeTasteList[0] || '神學視角'}】的經文洞察題（40～70字，視角鮮明、打破常規）",
        "hint": "詳盡組長引導提示（60～100字：解析經文背後的神學涵義、聖約意義與啟發切入點）",
        "answer": "組長手冊標準參考答案（80～140字：深入解答此視角下的神學深意、歷史/原文背景及核心真理歸納）"
      },
      {
        "id": "q3",
        "type": "生活與信心應用",
        "tag": "【依自訂背景或第2口味標籤】",
        "question": "第3題：緊密結合【${customKeyword || activeTasteList[1] || '生活反思'}】的深度應用題（40～70字，生動共鳴）",
        "hint": "詳盡組長引導提示（60～100字：引導組員從表面道德教訓進入內心偶像省察與恩典依靠）",
        "answer": "組長手冊標準參考答案（80～140字：提供從律法主義轉向福音恩典的牧養解答範例與生命轉化關鍵）"
      },
      {
        "id": "q4",
        "type": "小組同行互勉",
        "tag": "團契代禱",
        "question": "第4題：促進小組組員彼此敞開扶持、具體實踐與彼此代禱的行動題（40～70字）",
        "hint": "詳盡組長引導提示（60～100字：提供具體可落實的本週操練建議與小組代禱方向）",
        "answer": "組長手冊標準參考答案（80～140字：總結本題在團契生活與個人操練上的具體方向與牧養勉勵）"
      }${extraQuestionsSchemaZh.join("\n")}
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

  // 構造英文研經 Prompt
  buildEnglishPrompt(bookName, chapter, selectedTastes, customKeyword, curriculumContext = null, version = null) {
    const ver = version || (typeof BackpackStore !== "undefined" ? BackpackStore.getBibleVersion() : "niv");
    const engBook = typeof I18n !== "undefined" ? I18n.getBookName(bookName, "en") : bookName;
    const tasteNames = (selectedTastes || []).map(t => {
      const info = typeof I18n !== "undefined" ? I18n.getTasteInfo(t.id) : t;
      return `${info.nameEn || t.name} (${info.descEn || t.desc || ""})`;
    }).join(", ");
    const activeTasteList = (selectedTastes || []).map(t => {
      const info = typeof I18n !== "undefined" ? I18n.getTasteInfo(t.id) : t;
      return info.nameEn || t.name;
    });

    let scriptureContext = "";
    let chapterVerses = [];
    let focusedVersesText = "";
    const parsedRange = curriculumContext ? this.parseVerseRange(curriculumContext.passageRange) : null;

    if (typeof BibleService !== "undefined") {
      const verses = BibleService.getChapterVerses(bookName, chapter, ver);
      if (verses && verses.length > 0 && !verses[0].text.includes("Loading") && !verses[0].text.includes("正在載入")) {
        chapterVerses = verses;
        const formattedVerses = verses.map(v => `${v.num}. ${v.text}`).join("\n");
        scriptureContext = `\n[Scripture Passage (${ver.toUpperCase()}) for ${engBook} Chapter ${chapter} (${verses.length} verses - Strictly examine and quote from these verses below)]:\n${formattedVerses}\n`;

        if (parsedRange) {
          const ranged = verses.filter(v => v.num >= parsedRange.start && v.num <= parsedRange.end);
          if (ranged.length > 0) {
            focusedVersesText = `\n[MANDATORY FOCUS: Targeted Group Study Verses ${parsedRange.start}-${parsedRange.end} (${ranged.length} verses - All discussion questions and reflections MUST strictly focus within these verses)]:\n` +
              ranged.map(v => `${v.num}. ${v.text}`).join("\n") + "\n";
          }
        }
      }
    }

    const { verseCount, qCount } = this.getRecommendedQuestionCount(bookName, chapter, chapterVerses);

    let curriculumInstruction = "";
    if (curriculumContext) {
      const rangeNotice = parsedRange
        ? `[STRICT PASSAGE CONSTRAINT]: The designated scripture range for this session is "${curriculumContext.passageRange}" (Verses ${parsedRange.start}-${parsedRange.end})! All discussion questions (Q1~Q${qCount}), core snapshot, and outline MUST 100% focus on the text, dialogue, and narrative tension within verses ${parsedRange.start} through ${parsedRange.end}. DO NOT formulate questions on context outside this range!`
        : `[PASSAGE FOCUS]: Focus study questions and reflection on "${curriculumContext.passageRange || `${engBook} Chapter ${chapter}`}".`;

      curriculumInstruction = `
[CRITICAL INSTRUCTION: Dedicated Study Sheet for Thematic Curriculum Series]:
- Series Theme: "${curriculumContext.packTitle || "Thematic Study"}"
- Current Session: Session ${curriculumContext.sessionNum || 1}: "${curriculumContext.sessionTitle || ""}" (Passage: ${curriculumContext.passageRange || `${engBook} ${chapter}`})
- Core Message: ${curriculumContext.coreMessage || "None"}
- Discussion Focus: ${curriculumContext.discussionTheme || "None"}
- Icebreaker: ${curriculumContext.icebreaker || "None"}
- Action Step: ${curriculumContext.lifeAction || "None"}

${rangeNotice}
${focusedVersesText}
[Curriculum Continuity & Specificity Requirements]:
1. Title: tier1_sheet.title must be "${curriculumContext.packTitle || "Study Series"} · Session ${curriculumContext.sessionNum || 1}: ${curriculumContext.sessionTitle || ""}".
2. Core Focus: Snapshot, outline, and theology must closely align with the core passage (${curriculumContext.passageRange || `${engBook} ${chapter}`}) and theme "${curriculumContext.coreMessage || ""}".
3. Discussion Questions (${qCount} Questions):
   - Strict Constraint: Questions must examine details specifically within "${curriculumContext.passageRange || `${engBook} ${chapter}`}".
   - Q1 (Textual Observation): Inspect key dialogue, characters, and direct words within ${curriculumContext.passageRange || `${engBook} ${chapter}`}.
   - Q2 (Theme Deep-Dive): Must specifically intersect with "${curriculumContext.discussionTheme || ""}".
   - Q3 (Life Application): Must directly connect with actionable step "${curriculumContext.lifeAction || ""}".
   - Additional questions: Explore turning points within this passage and mutual prayer.
4. Leader Guide: leaderGuide.icebreaker should incorporate or build upon "${curriculumContext.icebreaker || ""}".
`;
    }

    let kidsInstruction = "";
    const isKidsFocus = (selectedTastes || []).some(t => t.id === "kids" || (t.name && (t.name.includes("兒少") || t.name.includes("Kids")))) ||
                        (customKeyword && /兒少|兒童|孩子|小學|校園|主日學|young|child|kid|school/i.test(customKeyword)) ||
                        (curriculumContext && /兒童|兒少|kids|child/i.test(`${curriculumContext.packTitle} ${curriculumContext.target || ""}`));

    if (isKidsFocus) {
      kidsInstruction = `
[CRITICAL PASTORAL GUIDELINE: Kids & Campus / Youth Ministry Mode Activated]:
1. Target Audience: Kids & Teens (Ages 8-14), Sunday School teachers, youth group counselors, and Christian parents.
2. Tone & Cognitive Style:
   - Engaging, story-driven, warm, and highly relatable. Avoid dense theological jargon.
   - Ground metaphors in real campus and kid life: group projects at school, playground games, peer pressure, exam anxiety, fear of being left out, courage to admit mistakes, sharing snacks, friendship reconciliation, balancing phone/video games with prayer.
3. Specific Field Guidance (Tier 1 Sheet):
   - title: Include subtitle "(Kids & Campus Edition)".
   - snapshot: Written like an exciting adventure movie opening, highlighting the hero's greatest test and God's mighty deliverance.
   - outline: 3 lively story scenes with kid-friendly titles.
   - discussionQuestions (${qCount} questions):
     * Q1 (Scripture Detective): Help kids spot key actions, names, or contrasts in the passage (tag: Scripture Detective).
     * Q2 (In Their Shoes): Help kids imagine walking in the shoes of biblical characters (tag: Empathy & Perspective).
     * Q3 (Campus Life Challenge): Address real school/peer dilemmas with practical hints for leaders/parents (tag: Campus Life).
     * Q4+ (Courage Mission / Reflection): Simple, actionable acts of kindness or courage to practice this week (tag: Courage Mission).
     * Each question's "answer" field must provide a warm, clear, kid-appropriate model answer for teachers/parents to summarize.
   - takeaway: A catchy, encouraging memory quote and confidence booster.
   - prayer: A short, heartfelt, sentence-by-sentence aloud prayer for kids to repeat.
4. Specific Field Guidance (Tier 2 Dossier):
   - leaderGuide.icebreaker: A 5-minute dynamic game or interactive icebreaker needing zero complex props.
   - difficulties: Kid-friendly answers to candid, tough questions (e.g., "What was God doing before creating the world? Why does God allow bad things?").
   - archaeology.visualArtifacts: Presented from a fascinating explorer perspective with authentic museum artifacts.
`;
    }

    const extraQuestionsSchemaEn = [];
    if (qCount >= 5) {
      extraQuestionsSchemaEn.push(`      ,{
        "id": "q5",
        "type": "Deep Exegesis & Turning Point",
        "tag": "Textual Depth",
        "question": "Question 5 exploring a key narrative turning point, literary contrast, or theological tension in the second half of the chapter (40-70 words)",
        "hint": "Leader's facilitation guide pointing out specific verses and structural connections (60-100 words)",
        "answer": "Leader's Model Answer & Key Synthesis (80-140 words: clear scriptural evidence, theological explanation, and key takeaway points for the leader)"
      }`);
    }
    if (qCount >= 6) {
      extraQuestionsSchemaEn.push(`      ,{
        "id": "q6",
        "type": "Redemptive Vision & Holistic Practice",
        "tag": "Gospel Synthesis",
        "question": "Question 6 connecting the whole chapter's arc to Christ's redemptive work and community witness (40-70 words)",
        "hint": "Leader's facilitation guide helping the group synthesize the chapter's gospel significance (60-100 words)",
        "answer": "Leader's Model Answer & Key Synthesis (80-140 words: comprehensive Christ-centered synthesis and pastoral conclusion for the group leader)"
      }`);
    }

    return `
You are the Theological Content Director of "Bible Backpack".
Please generate an exceptionally rich, theologically profound, and historically orthodox study pack in English for the Holy Bible: ${engBook} Chapter ${chapter} (using the ${ver.toUpperCase()} translation context).
${scriptureContext}
${curriculumInstruction}
${kidsInstruction}
[User's Chosen Study Lenses & Perspective]:
- Primary Lenses: ${tasteNames || "Expository, Pastoral & Practical Application"}
- Custom Background / Interest: ${customKeyword ? `"${customKeyword}" (Address this domain's mental models, real-world challenges, or professional metaphors in Q3 and Takeaway)` : "General, focus on the selected lenses above"}

[Theological Orthodoxy & Depth Guidelines]:
1. Historic Orthodoxy: Adhere strictly to historic Christian creedal orthodoxy (Nicene Creed, Apostles' Creed, Grace through Faith in Jesus Christ).
2. Dynamic Question Count (4-6 Questions) & Leader Model Answers:
   - Scale the number of discussionQuestions between 4 and 6 based on passage length and richness (short chapters <=15 verses: 4 questions; medium chapters 16-28 verses: 5 questions; long/rich chapters >=29 verses: 6 questions). Since this chapter has ${verseCount} verses, generate ${qCount} questions!
   - Every question in discussionQuestions MUST include BOTH a "hint" (for group members on Tier 1) AND an "answer" (80-140 words, the Leader's Model Answer & Theological Key displayed in the Tier 2 Leader's Guide, citing specific verses and key points to summarize after discussion).
3. Depth & Substance: Avoid superficial one-liners. Every outline section, character profile, and discussion hint/answer must be deeply substantive with chapter verse references.
4. Visual Artifacts: Cite 2 authentic museum artifacts or excavated biblical sites with their exact English Wikipedia title in "searchQuery".
5. Language Requirement: All fields in tier1_sheet and tier2_dossier MUST be in ENGLISH.

[Output strictly valid JSON only without markdown code fences or thinking blocks]:
{
  "tier1_sheet": {
    "title": "${engBook} Chapter ${chapter} · Small Group Study Sheet",
    "subtitle": "Subtitle capturing the theological essence and life message",
    "snapshot": "Chapter Core Snapshot (120-180 words: redemptive-historical turning point, core tension, and gospel focus)",
    "outline": [
      { "verses": "Verses 1-X", "theme": "Scene 1 theme and textual narrative context (25-40 words)" },
      { "verses": "Verses X-Y", "theme": "Scene 2 theme and textual narrative context (25-40 words)" },
      { "verses": "Verses Y-Z", "theme": "Scene 3 theme and textual narrative context (25-40 words)" }
    ],
    "discussionQuestions": [
      {
        "id": "q1",
        "type": "Observation & Flow",
        "tag": "Textual Reading",
        "question": "Question 1 examining specific verse details, context, and characters (40-70 words)",
        "hint": "Leader's facilitation guide with verse references and context clues (60-100 words)",
        "answer": "Leader's Model Answer & Key Synthesis (80-140 words: specific verse evidence, objective textual facts, and summary points for the leader)"
      },
      {
        "id": "q2",
        "type": "Theological Insight",
        "tag": "${activeTasteList[0] || 'Theological Lens'}",
        "question": "Question 2 deeply examining the text through the first selected lens (40-70 words)",
        "hint": "Leader's facilitation guide unpacking covenantal or spiritual depths (60-100 words)",
        "answer": "Leader's Model Answer & Key Synthesis (80-140 words: deep theological, historical, or covenantal explanation for the leader to synthesize)"
      },
      {
        "id": "q3",
        "type": "Faith & Real Life Application",
        "tag": "${customKeyword || activeTasteList[1] || 'Life Application'}",
        "question": "Question 3 connecting the text to real daily struggle, work, or custom background (40-70 words)",
        "hint": "Leader's facilitation guide moving beyond superficial moralism to gospel reliance (60-100 words)",
        "answer": "Leader's Model Answer & Key Synthesis (80-140 words: gospel-centered pastoral model answer showing how grace transforms real-life struggles)"
      },
      {
        "id": "q4",
        "type": "Fellowship & Action",
        "tag": "Prayer & Fellowship",
        "question": "Question 4 inviting mutual vulnerability, practical discipleship, and prayer (40-70 words)",
        "hint": "Leader's facilitation guide suggesting actionable steps and prayer directions (60-100 words)",
        "answer": "Leader's Model Answer & Key Synthesis (80-140 words: practical discipleship takeaways and group prayer focus for the leader)"
      }${extraQuestionsSchemaEn.join("\n")}
    ],
    "takeaway": "Core takeaway message with a memorable metaphor and gospel hope (80-120 words)",
    "prayer": "Concluding group prayer echoing the biblical truths of this chapter (80-120 words)"
  },
  "tier2_dossier": {
    "title": "${engBook} Chapter ${chapter} · In-Depth Field Dossier",
    "subtitle": "Historical Context · Geography · Character Profiles · Theological FAQ · Leader's Guide",
    "characters": [
      {
        "name": "Key Figure or Group 1",
        "title": "Role and Spiritual Significance",
        "profile": "Historical context and role in this chapter (60-100 words)",
        "psychologicalInsight": "Psychological struggle, fears, motives, and spiritual breakthrough (80-120 words)"
      },
      {
        "name": "Key Figure or Group 2",
        "title": "Role and Spiritual Significance",
        "profile": "Historical context and role in this chapter (60-100 words)",
        "psychologicalInsight": "Psychological struggle, fears, motives, and spiritual breakthrough (80-120 words)"
      }
    ],
    "geography": {
      "isJourneyRoute": false,
      "location": "Core biblical region or setting",
      "terrain": "Topography, climate, and strategic military/trade context (40-80 words)",
      "hydrologyInsight": "How the landscape, hydrology, or ecology shapes the narrative (120-180 words)",
      "routePoints": [
        { "lat": 31.7767, "lng": 35.2345, "name": "Biblical Site 1", "nameEn": "Biblical Site 1", "desc": "Historical significance in this chapter", "descEn": "Historical significance in this chapter" }
      ]
    },
    "archaeology": {
      "era": "Historical period (e.g. Late Bronze Age / 1st Century Roman Period)",
      "canaaniteContext": "Near Eastern / Greco-Roman religious, cultural, and political background (100-150 words)",
      "treatyStructure": "Ancient treaty form, covenant structure, or original language insights (120-180 words)",
      "visualArtifacts": [
        {
          "title": "Artifact 1 (e.g. Dead Sea Scrolls)",
          "searchQuery": "Dead Sea Scrolls",
          "category": "Museum Artifact / Archaeological Discovery",
          "tag": "Archaeology",
          "description": "Details on discovery, dating, museum location, and how it corroborates this passage (80-120 words)",
          "imageBadge": "🏛️ Verified Museum Artifact"
        },
        {
          "title": "Artifact 2 (e.g. Cyrus Cylinder)",
          "searchQuery": "Cyrus Cylinder",
          "category": "Historical Inscription / Site",
          "tag": "Biblical History",
          "description": "Details on discovery, museum location, and insight for this passage (80-120 words)",
          "imageBadge": "📜 Historical Archaeological Site"
        }
      ]
    },
    "difficulties": [
      {
        "question": "Theological FAQ 1: A challenging theological, ethical, or historical question often raised from this text",
        "answer": "Robust, orthodox, multi-layered explanation grounded in Scripture (120-180 words)"
      },
      {
        "question": "Theological FAQ 2: An exegetical tension or difficult phrasing in this chapter",
        "answer": "Robust, orthodox, multi-layered explanation with context and linguistic clarity (120-180 words)"
      }
    ],
    "leaderGuide": {
      "icebreaker": "5-minute engaging icebreaker prompt relevant to the chapter theme (50-80 words)",
      "flowTips": "Facilitation rhythm, pastoral sensitivity, and group discussion tips (80-120 words)",
      "timeBudget": "Recommended schedule (e.g. Icebreaker 10m · Reading 15m · Discussion 25m · Prayer 10m)"
    }
  }
}
/no_think`;
  },

  // 構造多堂主題查經套裝 (Thematic Curriculum) Prompt
  buildCurriculumPrompt(topic, sessionCount, audience, selectedTastes) {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    if (isEn) {
      return this.buildEnglishCurriculumPrompt(topic, sessionCount, audience, selectedTastes);
    }
    const tasteNames = (selectedTastes || []).map(t => t.name).join("、");

    let kidsCurriculumRule = "";
    if (/兒少|兒童|主日學|kids|child|school/i.test(`${audience} ${topic}`) || (selectedTastes || []).some(t => t.id === "kids")) {
      kidsCurriculumRule = `
4. 【兒少校園/主日學專屬守則】：
   - 本套課程針對國小至國中青少年學童，每堂的「單元標題」請具備故事性與冒險感（如：「約書亞過河：面對未知的勇氣小隊」）。
   - 核心信息、討論重點與生活操練必須大量結合校園日常情境（同儕相處、誠實、勇氣、分組合作、克服害怕、學校課業）。
   - 破冰提問（icebreaker）請設計為適合在教室或家中進行的趣味破冰遊戲或動態互動問答。
`;
    }

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
${kidsCurriculumRule}

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

  // 構造英文多堂主題查經套裝 Prompt
  buildEnglishCurriculumPrompt(topic, sessionCount, audience, selectedTastes) {
    const tasteNames = (selectedTastes || []).map(t => {
      const info = typeof I18n !== "undefined" ? I18n.getTasteInfo(t.id) : t;
      return info.nameEn || t.name;
    }).join(", ");

    let kidsRule = "";
    if (/兒少|兒童|kids|child|youth|school/i.test(`${audience} ${topic}`) || (selectedTastes || []).some(t => t.id === "kids")) {
      kidsRule = `
4. [Kids & Campus Guideline]:
   - Designed for children/teens (ages 8-14); make session titles adventure-themed and story-driven.
   - Core messages, discussion, and life action must address real school/peer experiences (peer pressure, honesty, courage, teamwork, overcoming fear).
   - Icebreaker: A 5-minute fun game or dynamic interactive question for classroom or living room.
`;
    }

    return `
You are the Theological Curriculum Director of "Bible Backpack".
Please design a complete ${sessionCount}-session thematic small group curriculum series in English.

[Parameters]:
- Series Topic: ${topic}
- Number of Sessions: ${sessionCount}
- Target Audience: ${audience || "Small Group Fellowship"}
- Study Lenses: ${tasteNames || "Expository, Practical Discipleship"}

[Planning Rules]:
1. Adhere strictly to historic orthodox Christian doctrine. Select 1 primary scripture passage for each session (balanced across Old and New Testaments).
2. Clear progression: Problem & Reality ➔ God's Word & Example ➔ Life Breakthrough ➔ Commissioned in Victory.
3. Each session must provide: session title, bookName (exact English Bible book name, e.g. "Genesis", "Joshua", "Romans"), chapter (number), passageRange (e.g. "Joshua 1:1-9"), coreMessage, discussionTheme, icebreaker, and lifeAction.
${kidsRule}

[Return strictly valid JSON only without markdown code fences]:
{
  "title": "${topic}: Group Study Series",
  "subtitle": "Subtitle highlighting the overarching spiritual hope",
  "target": "${audience || "Small Group Fellowship"}",
  "sessionCount": ${sessionCount},
  "overview": "Overview of the curriculum series and tips for group leaders (approx 120 words)",
  "sessions": [
    {
      "sessionNum": 1,
      "title": "Session 1 Title",
      "bookName": "Joshua",
      "chapter": 1,
      "passageRange": "Joshua 1:1-9",
      "coreMessage": "Core message summary",
      "discussionTheme": "Discussion focus and life intersection",
      "icebreaker": "5-minute fun icebreaker prompt or game",
      "lifeAction": "Actionable life practice for this week"
    }
  ]
}
/no_think`;
  },

  // 系統提示詞（嚴守歷史正統大公信經、要求完整且詳盡輸出 tier1 與 tier2 雙層架構之純 JSON）
  buildSystemPrompt() {
    const isEn = typeof I18n !== "undefined" && I18n.isEn();
    if (isEn) {
      return "You are a senior Christian theological curriculum director and biblical archaeologist adhering strictly to historic creedal orthodoxy (Nicene Creed, Apostles' Creed, classical Trinitarianism). CRITICAL REQUIREMENT: Return a single valid, deeply detailed, comprehensive JSON object in English containing BOTH 'tier1_sheet' AND 'tier2_dossier'. Never write brief or superficial one-sentence summaries; provide rich verse-by-verse exposition, thorough historical/archaeological analysis, and extensive leader hints. For 'visualArtifacts', ONLY cite real, Wikipedia-verifiable museum artifacts or archaeological sites with their exact English Wikipedia article title in 'searchQuery'. Output valid JSON only, without markdown backticks or thinking blocks. /no_think";
    }
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

  // 向 AI 發起單章研經請求（內建本地快取 + Groq/Gemini 雙通道 + 多模型自動故障轉移 + 支援小組主題課程上下文與多語言）
  async generateStudyPack(bookName, chapter, selectedTastes, customKeyword, onStatusUpdate = null, bypassCache = false, curriculumContext = null) {
    const lang = typeof BackpackStore !== "undefined" ? BackpackStore.getLanguage() : "zh";
    const version = typeof BackpackStore !== "undefined" ? BackpackStore.getBibleVersion() : "cuv";
    let tasteHash = `${lang}-${version}-` + (selectedTastes || []).map(t => t.id).sort().join("-") + (customKeyword ? `-${customKeyword}` : "");
    if (curriculumContext) {
      tasteHash += `-curriculum-${curriculumContext.packId || 'pack'}-${curriculumContext.sessionNum || 1}`;
    }
    
    // 1. 若非強制重新調配，優先檢查本地快取，0 毫秒極速載入
    if (!bypassCache) {
      const cached = BackpackStore.getCachedPack(bookName, chapter, tasteHash);
      if (cached) {
        console.log(`⚡ 從本地持久快取載入【${bookName} 第 ${chapter} 章 (${lang.toUpperCase()}/${version.toUpperCase()})】${curriculumContext ? '主題課程' : ''}研經材料！`);
        return cached;
      }
    }

    const provider = BackpackStore.getProvider();
    const promptText = this.buildPrompt(bookName, chapter, selectedTastes, customKeyword, curriculumContext, version);

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

if (typeof window !== "undefined") {
  window.AIService = AIService;
}
if (typeof global !== "undefined") {
  global.AIService = AIService;
}
