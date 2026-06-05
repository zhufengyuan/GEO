import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('文章创作');

    const root = document.querySelector('.page-center');
    if (!root) return;
    const tabs = root.querySelectorAll('.tab-btn');
    const panels = root.querySelectorAll('[data-panel]');
    const lexiconSelect = document.getElementById('lexiconSelect');
    const refreshLexiconsBtn = document.getElementById('refreshLexiconsBtn');
    const lexiconKeywordEl = document.getElementById('awLexiconKeyword');
    const lexiconSearchBtn = document.getElementById('awLexiconSearchBtn');
    const lexiconDateSelect = document.getElementById('awLexiconDateSelect');
    const lexiconTbody = document.getElementById('awLexiconTbody');
    const startBtn = document.getElementById('startCreateBtn');
    const questionListBox = document.getElementById('questionListBox');
    const pickProductBtn = document.getElementById('awPickProductBtn');
    const pickImagesBtn = document.getElementById('awPickImagesBtn');
    const productPreview = document.getElementById('awProductPreview');
    const imagesPreview = document.getElementById('awImagesPreview');
    const productPickerBar = document.getElementById('awProductPickerBar');
    const imagePickerBar = document.getElementById('awImagePickerBar');
    const ruleStepTitle = document.getElementById('awRuleStepTitle');
    const brandTitleSelect = document.getElementById('brandTitleSelect');
    const brandUseSelectedBtn = document.getElementById('brandUseSelectedBtn');
    const brandTitleInput = document.getElementById('brandTitleInput');
    const brandTitleHint = document.getElementById('brandTitleHint');
    const brandTitleSuggest = document.getElementById('brandTitleSuggest');
    const genTitleBtn = document.getElementById('genTitleBtn');
    const activityDesc = document.getElementById('activityDesc');
    const genActivityDescBtn = document.getElementById('genActivityDescBtn');
    const insertActivityImgBtn = document.getElementById('insertActivityImg');
    const activityImgPreview = document.getElementById('activityImgPreview');
    const awImgModal = document.getElementById('awImgModal');
    const awImgClose = document.getElementById('awImgClose');
    const awImgCancel = document.getElementById('awImgCancel');
    const awImgFile = document.getElementById('awImgFile');
    const awImgModalPreview = document.getElementById('awImgModalPreview');
    const awImgInsertBtn = document.getElementById('awImgInsertBtn');
    const chatCard = root.querySelector('.aw-chat-card');
    const chatBox = document.getElementById('awChatBox');
    const chatInput = document.getElementById('awChatInput');
    const chatSendBtn = document.getElementById('awChatSendBtn');
    const copyConfirmBtn = document.getElementById('awCopyConfirmBtn');
    const copyReoptBtn = document.getElementById('awCopyReoptBtn');
    const chatHint = document.getElementById('awChatHint');

    const state = {
      activeTab: 'product',
      lexicons: [],
      lexiconKeyword: '',
      lexiconDate: '',
      generating: false,
      currentLexiconId: '',
      questions: [],
      selectedQuestion: '',
      selectedProducts: [],
      selectedImages: [],
      kbProducts: [],
      kbImages: [],
      productPickerOpen: false,
      imagePickerOpen: false,
      productPickerLoading: false,
      imagePickerLoading: false,
      productPickerBackup: null,
      imagePickerBackup: null,
      brandLexiconId: '',
      brandTitleReqId: '',
      activityDescReqId: '',
      activityImageDataUrl: '',
      chatHistory: [],
      chatContextKey: '',
      chatInitReqId: '',
      chatReqId: '',
      chatSending: false,
      draftGenerating: false,
      draftReqId: '',
      draftOptimizeReqId: '',
      draftTitle: '',
      draftContent: ''
    };

    const show = (key) => {
      state.activeTab = key;
      tabs.forEach((t) => t.classList.toggle('active', t.getAttribute('data-tab') === key));
      panels.forEach((p) => {
        const k = p.getAttribute('data-panel');
        p.classList.toggle('hidden', k !== key);
      });
      if (ruleStepTitle) {
        ruleStepTitle.textContent = key === 'product' ? '第四步：文章规则设置' : '第二步：文章规则设置';
      }
    };

    tabs.forEach((t) => {
      t.addEventListener('click', () => {
        const key = t.getAttribute('data-tab');
        if (!key) return;
        show(key);
        ensureChatReady();
      });
    });

    const normalizeLabel = (label) => String(label || '').replace(/\s+/g, ' ').trim();

    const escapeHtml = (s) => {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const safeParse = (raw) => {
      try {
        if (!raw) return null;
        return JSON.parse(String(raw));
      } catch {
        return null;
      }
    };

    const valueOrPlaceholder = (el) => {
      const v = String(el?.value || '').trim();
      if (v) return v;
      return String(el?.getAttribute?.('placeholder') || '').trim();
    };

    const getCheckedTexts = (scopeEl) => {
      if (!scopeEl) return [];
      return Array.from(scopeEl.querySelectorAll('input[type="checkbox"]'))
        .filter((x) => x.checked)
        .map((x) => normalizeLabel(x.parentElement?.textContent || ''))
        .filter(Boolean);
    };

    const firstCheckedText = (scopeEl) => getCheckedTexts(scopeEl)[0] || '';
    const mainArticleTypeByTab = (tab) => {
      if (tab === 'product') return '产品宣传';
      if (tab === 'brand') return '企业品牌';
      if (tab === 'activity') return '活动关键词';
      return '';
    };

    const setChatDisabled = (disabled) => {
      if (chatInput) chatInput.disabled = false;
      if (chatSendBtn) chatSendBtn.disabled = disabled;
    };

    const setCopyActionsEnabled = (enabled) => {
      const on = enabled === true;
      if (copyConfirmBtn) copyConfirmBtn.disabled = !on;
      if (copyReoptBtn) copyReoptBtn.disabled = !on;
    };

    const renderChat = () => {
      if (!chatBox) return;
      chatBox.innerHTML = '';
      const list = Array.isArray(state.chatHistory) ? state.chatHistory : [];
      if (!list.length) {
        chatBox.textContent = '对话尚未开始。';
        return;
      }
      list.forEach((m) => {
        const role = String(m?.role || '').trim() === 'user' ? 'user' : 'ai';
        const text = String(m?.text || '').trim();
        if (!text) return;
        const row = document.createElement('div');
        row.className = `aw-chat-msg ${role}`;
        const bubble = document.createElement('div');
        bubble.className = 'aw-chat-bubble';
        bubble.textContent = text;
        row.appendChild(bubble);
        chatBox.appendChild(row);
      });
      try {
        chatBox.scrollTop = chatBox.scrollHeight;
      } catch {
      }
    };

    const getProductChatContext = () => {
      const lexiconId = String(lexiconSelect?.value || '').trim();
      const questionText = String(state.selectedQuestion || state.questions?.[0] || '').trim();
      const products = Array.isArray(state.selectedProducts) ? state.selectedProducts.slice(0, 3) : [];
      const images = Array.isArray(state.selectedImages) ? state.selectedImages.slice(0, 3) : [];
      const prod = products[0] && typeof products[0] === 'object' ? products[0] : {};
      const prodName = normalizeLabel(prod?.precise_product_name || prod?.product_name || '');
      const missing = [];
      if (!lexiconId) missing.push('问题词库');
      if (!questionText) missing.push('问题词');
      if (!products.length) missing.push('产品');
      const ok = !missing.length;
      return {
        ok,
        lexiconId,
        questionText,
        products,
        images,
        prodName,
        hint: ok ? '' : `请先选择${missing.join('、')}后再开始对话。`
      };
    };

    const resetChat = () => {
      state.chatHistory = [];
      renderChat();
    };

    const ensureChatReady = () => {
      if (chatCard) chatCard.classList.toggle('hidden', state.activeTab !== 'product');
      if (state.activeTab !== 'product') {
        setChatDisabled(true);
        setCopyActionsEnabled(false);
        return;
      }

      const ctx = getProductChatContext();
      if (chatHint) chatHint.textContent = ctx.hint || '';
      if (!ctx.ok) {
        setChatDisabled(false);
        setCopyActionsEnabled(false);
        if (!state.chatHistory.length) {
          if (chatBox) chatBox.textContent = ctx.hint || '请先补齐必要信息后再开始对话。';
        } else {
          renderChat();
        }
        return;
      }

      setChatDisabled(false);
      setCopyActionsEnabled(Boolean(String(state.draftContent || '').trim()));
      const key = [ctx.lexiconId, ctx.questionText, ctx.prodName].join('|');
      if (key && key !== String(state.chatContextKey || '')) {
        state.chatContextKey = key;
        resetChat();
        state.draftTitle = '';
        state.draftContent = '';
        setCopyActionsEnabled(false);
        if (chatHint) chatHint.textContent = '对话初始化中...';
        const reqId = String(Date.now());
        state.chatInitReqId = reqId;
        invokeGeoAction(
          'geoArticleWritingInitChat',
          {
            req_id: reqId,
            lexicon_id: ctx.lexiconId,
            question_text: ctx.questionText,
            products: ctx.products,
            images: ctx.images,
            ts: Date.now()
          },
          '对话初始化接口尚未就绪，请刷新页面后重试。'
        );
      } else if (!state.chatHistory.length) {
        renderChat();
      }
    };

    show('product');
    ensureChatReady();

    const pushChatMessage = (role, text) => {
      const r = role === 'user' ? 'user' : 'ai';
      const t = String(text || '').trim();
      if (!t) return;
      const list = Array.isArray(state.chatHistory) ? state.chatHistory : [];
      state.chatHistory = list.concat([{ role: r, text: t }]).slice(-120);
    };

    const sendChatMessage = (text) => {
      const msg = String(text || '').trim();
      if (!msg) return;
      if (state.chatSending) return;
      const ctx = getProductChatContext();
      if (!ctx.ok) {
        alert(ctx.hint || '请先补齐必要信息后再开始对话。');
        return;
      }
      state.chatSending = true;
      setChatDisabled(true);
      pushChatMessage('user', msg);
      renderChat();
      if (chatInput) chatInput.value = '';
      const reqId = String(Date.now());
      state.chatReqId = reqId;
      invokeGeoAction(
        'geoArticleWritingChat',
        {
          req_id: reqId,
          lexicon_id: ctx.lexiconId,
          question_text: ctx.questionText,
          products: ctx.products,
          images: ctx.images,
          history: state.chatHistory,
          message: msg,
          ts: Date.now()
        },
        '对话接口尚未就绪，请刷新页面后重试。'
      );
    };

    const ruleGroups = Array.from(root.querySelectorAll('.right-col .rule-group'));
    const platformGroup = ruleGroups[0] || null;
    const typeGroup = ruleGroups[1] || null;
    const styleGroup = ruleGroups[2] || null;
    const toneGroup = ruleGroups[3] || null;
    const invokeGeoAction = (name, payload, message) => {
      const fn = window[name];
      if (typeof fn !== 'function') {
        alert(message || '页面接口尚未就绪，请刷新页面后重试。');
        return false;
      }
      fn(payload);
      return true;
    };

    const bindSingleChoice = (scopeEl) => {
      if (!scopeEl) return;
      scopeEl.addEventListener('change', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.type !== 'checkbox') return;
        if (!target.checked) return;
        scopeEl.querySelectorAll('input[type="checkbox"]').forEach((x) => {
          if (x !== target) x.checked = false;
        });
      });
    };
    bindSingleChoice(typeGroup);
    bindSingleChoice(styleGroup);
    bindSingleChoice(toneGroup);

    const renderBrandTitleSelect = () => {
      if (!brandTitleSelect) return;
      const list = Array.isArray(state.lexicons) ? state.lexicons : [];
      brandTitleSelect.innerHTML = '';
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = list.length ? '选择问题词库关键词' : '暂无词库，请先到“创建问题词库/马上生成”';
      brandTitleSelect.appendChild(empty);
      list.forEach((x) => {
        const kw = normalizeLabel(x.industry_keyword || '');
        if (!kw) return;
        const op = document.createElement('option');
        op.value = String(x.id || '');
        op.textContent = kw;
        brandTitleSelect.appendChild(op);
      });
    };

    const renderLexicons = () => {
      if (!lexiconSelect) return;
      const list = Array.isArray(state.lexicons) ? state.lexicons : [];
      lexiconSelect.innerHTML = '';
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = list.length ? '请选择已创建的词库' : '暂无词库，请先到“创建问题词库”保存';
      lexiconSelect.appendChild(empty);
      list.forEach((x) => {
        const op = document.createElement('option');
        op.value = String(x.id || '');
        op.textContent = normalizeLabel(x.name || `${x.company || ''}-${x.industry_keyword || ''}-${x.decision_stage || ''}`) || String(x.id || '');
        lexiconSelect.appendChild(op);
      });
    };

    const lexiconDisplayName = (x) => {
      return normalizeLabel(x?.name || `${x?.company || ''}-${x?.industry_keyword || ''}-${x?.decision_stage || ''}`) || String(x?.id || '');
    };

    const lexiconCreatedAt = (x) => normalizeLabel(x?.created_at || '');
    const lexiconCreatedDate = (x) => {
      const v = lexiconCreatedAt(x);
      return v ? v.slice(0, 10) : '';
    };

    const renderLexiconDateOptions = () => {
      if (!lexiconDateSelect) return;
      const list = Array.isArray(state.lexicons) ? state.lexicons : [];
      const dates = list
        .map((x) => lexiconCreatedDate(x))
        .filter(Boolean);
      const uniq = Array.from(new Set(dates)).sort((a, b) => (a < b ? 1 : -1));

      lexiconDateSelect.innerHTML = '';
      const all = document.createElement('option');
      all.value = '';
      all.textContent = '全部';
      lexiconDateSelect.appendChild(all);
      uniq.forEach((d) => {
        const op = document.createElement('option');
        op.value = d;
        op.textContent = d;
        lexiconDateSelect.appendChild(op);
      });

      if (state.lexiconDate && uniq.includes(state.lexiconDate)) {
        lexiconDateSelect.value = state.lexiconDate;
      } else {
        state.lexiconDate = '';
        lexiconDateSelect.value = '';
      }
    };

    const getFilteredLexicons = () => {
      const list = Array.isArray(state.lexicons) ? state.lexicons : [];
      const kw = normalizeLabel(state.lexiconKeyword || '').toLowerCase();
      const date = String(state.lexiconDate || '').trim();
      return list.filter((x) => {
        if (date && lexiconCreatedDate(x) !== date) return false;
        if (!kw) return true;
        const hay = [
          lexiconDisplayName(x),
          x?.company,
          x?.industry_keyword,
          x?.decision_stage,
          x?.question_keyword,
          x?.first_question,
          x?.expand_words
        ]
          .map((v) => normalizeLabel(v).toLowerCase())
          .join(' ');
        return hay.includes(kw);
      });
    };

    const renderLexiconTable = () => {
      if (!lexiconTbody) return;
      const list = getFilteredLexicons();
      if (!list.length) {
        lexiconTbody.innerHTML = `<tr><td colspan="4" class="empty">暂无符合条件的词库</td></tr>`;
        return;
      }
      lexiconTbody.innerHTML = list
        .map((x, idx) => {
          const id = String(x?.id || '').trim();
          const checked = id && id === String(state.currentLexiconId || '') ? 'checked' : '';
          return `<tr>
            <td><input type="radio" name="awLexiconPick" data-id="${escapeHtml(id)}" ${checked} /></td>
            <td>${idx + 1}</td>
            <td>${escapeHtml(lexiconDisplayName(x) || '—')}</td>
            <td>${escapeHtml(lexiconCreatedAt(x) || '—')}</td>
          </tr>`;
        })
        .join('');
    };

    const buildQuestions = (lex) => {
      const company = String(lex?.company || '').trim();
      const kw = String(lex?.industry_keyword || '').trim();
      const stage = String(lex?.decision_stage || '').trim();
      const words = lex?.words || {};
      const region = String(words.region || '').trim();
      const feature = String(words.feature || '').trim();
      const attr = String(words.attribute || '').trim();
      const scene = String(words.scene || '').trim();
      const people = String(words.people || '').trim();
      const pain = String(words.pain || '').trim();
      const price = String(words.price || '').trim();

      const tag = (x) => (x ? `（${x}）` : '');
      const lines = [];
      if (stage.includes('认知')) {
        lines.push(`想买${kw}${tag(scene)}，应该怎么选？`);
        lines.push(`${kw}${tag(feature)}有哪些核心指标需要关注？`);
        lines.push(`${company}的${kw}有什么优势？`);
      } else if (stage.includes('对比')) {
        lines.push(`${company}的${kw}和同类产品相比优势在哪里？`);
        lines.push(`${kw}${tag(feature)}有哪些常见坑？怎么避坑？`);
        lines.push(`${kw}${tag(attr)}适合${people || '哪些人群'}？`);
      } else if (stage.includes('锁定')) {
        lines.push(`已经看中${company}的${kw}，还需要重点确认哪些细节？`);
        lines.push(`${kw}${tag(attr)}怎么搭配使用场景${tag(scene)}？`);
        lines.push(`${kw}大概${price ? `多少钱（${price}）` : '多少钱'}比较合理？`);
      } else if (stage.includes('求证')) {
        lines.push(`${company}的${kw}${tag(attr)}值不值得买？`);
        lines.push(`${kw}${tag(feature)}使用寿命/维护要点有哪些？`);
        lines.push(`${pain ? `担心“${pain}”，` : ''}${kw}如何解决这些顾虑？`);
      } else if (stage.includes('风险') || stage.includes('犹豫')) {
        lines.push(`买${company}的${kw}之前，最需要确认哪些“兜底”信息？`);
        lines.push(`${kw}常见风险点有哪些？怎么判断是否踩坑？`);
        lines.push(`${company}在售后/质保/退换方面一般怎么做？需要注意什么？`);
      } else if (stage.includes('下单') || stage.includes('履约') || stage.includes('复购')) {
        lines.push(`${company}的${kw}怎么买更稳妥？线上线下渠道怎么选？`);
        lines.push(`${kw}交付/发货/安装需要注意哪些关键点？`);
        lines.push(`${kw}用了一段时间后如何维护保养，怎么提高长期复购可能？`);
      } else {
        lines.push(`${company}的${kw}有什么特点？`);
        lines.push(`${kw}怎么选？`);
        lines.push(`${kw}${tag(feature)}适合什么场景${tag(scene)}？`);
      }

      if (region) lines.push(`${region}地区有哪些靠谱的${kw}品牌/服务商推荐？`);
      if (pain) lines.push(`用户在选购${kw}时最常见的痛点“${pain}”如何解决？`);

      return lines
        .map((x) => normalizeLabel(x))
        .filter(Boolean)
        .slice(0, 12);
    };

    const renderQuestionsList = (qs) => {
      if (!questionListBox) return;
      state.selectedQuestion = qs[0] || '';
      if (!qs.length) {
        questionListBox.innerHTML = `<div class="empty">请选择问题词库后显示问题词</div>`;
        return;
      }
      questionListBox.innerHTML = qs
        .map((q, idx) => {
          const checked = idx === 0 ? 'checked' : '';
          return `<label class="pick"><input type="radio" name="q" value="${q.replaceAll('"', '&quot;')}" ${checked}/> <span>${idx + 1}</span> <span class="pick-text">${q}</span></label>`;
        })
        .join('');
    };

    const requestQuestions = () => {
      const lexiconId = String(lexiconSelect?.value || '').trim();
      state.currentLexiconId = lexiconId;
      state.questions = [];
      state.selectedQuestion = '';
      if (!questionListBox) return;
      if (!lexiconId) {
        questionListBox.innerHTML = `<div class="empty">请选择问题词库后显示问题词</div>`;
        return;
      }
      questionListBox.innerHTML = `<div class="loading">加载中...</div>`;
      window.geoQueryQuestionWords?.({ lexicon_id: lexiconId, ts: Date.now() });
    };

    const requestLexicons = () => {
      window.geoQueryQuestionLexicons?.({ limit: 200, ts: Date.now() });
    };

    const renderBrandTitleSuggest = (titles) => {
      if (!brandTitleSuggest) return;
      const list = (Array.isArray(titles) ? titles : []).map((x) => normalizeLabel(x)).filter(Boolean);
      if (!list.length) {
        brandTitleSuggest.innerHTML = `<div class="empty">暂无标题建议</div>`;
        return;
      }
      brandTitleSuggest.innerHTML = list
        .map((t, idx) => {
          const checked = idx === 0 ? 'checked' : '';
          return `<label class="pick"><input type="radio" name="brandTitlePick" value="${escapeHtml(t)}" ${checked}/> <span>${idx + 1}</span> <span class="pick-text">${escapeHtml(t)}</span></label>`;
        })
        .join('');
      if (brandTitleInput) brandTitleInput.value = list[0] || '';
    };

    const openImgModal = () => awImgModal?.classList.add('show');
    const closeImgModal = () => awImgModal?.classList.remove('show');
    awImgClose?.addEventListener('click', closeImgModal);
    awImgCancel?.addEventListener('click', closeImgModal);
    awImgModal?.addEventListener('click', (e) => {
      if (e.target === awImgModal) closeImgModal();
    });

    const refreshActivityImgPreview = () => {
      if (!activityImgPreview) return;
      if (!state.activityImageDataUrl) {
        activityImgPreview.textContent = '这里显示插入图片的预览图';
        return;
      }
      activityImgPreview.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;width:100%;height:100%;">
        <img src="${escapeHtml(state.activityImageDataUrl)}" style="max-width:100%;max-height:180px;object-fit:contain;" />
        <div class="page-muted" style="color:#ef4444;">点击图片可移除</div>
      </div>`;
    };
    activityImgPreview?.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const img = t.closest('img');
      if (!img) return;
      state.activityImageDataUrl = '';
      refreshActivityImgPreview();
    });

    const productKey = (p, idx) => {
      const name = normalizeLabel(p?.precise_product_name || p?.product_name || '');
      return name || String(idx);
    };

    const updateProductPickerBar = () => {
      if (!productPickerBar) return;
      if (!state.productPickerOpen) {
        productPickerBar.innerHTML = '';
        return;
      }
      const count = Array.isArray(state.selectedProducts) ? state.selectedProducts.length : 0;
      productPickerBar.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="btn-solid" data-action="aw-product-done">完成选择（${count}/3）</button>
          <button class="btn-primary" data-action="aw-product-cancel">取消</button>
        </div>
      `;
    };

    const updateImagePickerBar = () => {
      if (!imagePickerBar) return;
      if (!state.imagePickerOpen) {
        imagePickerBar.innerHTML = '';
        return;
      }
      const count = Array.isArray(state.selectedImages) ? state.selectedImages.length : 0;
      imagePickerBar.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="btn-solid" data-action="aw-image-done">完成选择（${count}/3）</button>
          <button class="btn-primary" data-action="aw-image-cancel">取消</button>
        </div>
      `;
    };

    const renderProductPicker = () => {
      if (!productPreview) return;
      const rows = Array.isArray(state.kbProducts) ? state.kbProducts : [];
      const picked = new Set(
        (Array.isArray(state.selectedProducts) ? state.selectedProducts : [])
          .map((p, idx) => productKey(p, idx))
          .filter(Boolean)
      );
      if (state.productPickerLoading) {
        productPreview.innerHTML = `<div class="loading">加载中...</div>`;
        updateProductPickerBar();
        return;
      }
      if (!rows.length) {
        productPreview.innerHTML = `<div class="empty">暂无产品，请先到“企业知识库-产品库”保存</div>`;
        updateProductPickerBar();
        return;
      }
      const table = `
        <div class="aw-picker-table" style="overflow-x:auto;overflow-y:visible;width:100%;">
          <table class="aw-table" style="min-width:860px;">
            <thead>
              <tr>
                <th style="width:60px;">选择</th>
                <th style="width:80px;">序号</th>
                <th style="width:220px;">精准产品名称</th>
                <th style="width:220px;">核心材质</th>
                <th>核心特点</th>
              </tr>
            </thead>
            <tbody>
              ${rows.slice(0, 50).map((r, idx) => {
                const checked = picked.has(productKey(r, idx)) ? 'checked' : '';
                const name = escapeHtml(r?.precise_product_name || r?.product_name || '—');
                const material = escapeHtml(r?.core_material || r?.material || '—');
                const feat = escapeHtml(r?.core_features || r?.craft || r?.advantages || '—');
                return `
                  <tr>
                    <td><input type="checkbox" data-idx="${idx}" ${checked} /></td>
                    <td>${idx + 1}</td>
                    <td>${name}</td>
                    <td>${material}</td>
                    <td>${feat}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      productPreview.innerHTML = table;
      updateProductPickerBar();
    };

    const renderImagesPicker = () => {
      if (!imagesPreview) return;
      const rows = Array.isArray(state.kbImages) ? state.kbImages : [];
      const picked = new Set((Array.isArray(state.selectedImages) ? state.selectedImages : []).map((x) => String(x?.id || '')).filter(Boolean));
      if (state.imagePickerLoading) {
        imagesPreview.innerHTML = `<div class="loading">加载中...</div>`;
        updateImagePickerBar();
        return;
      }
      if (!rows.length) {
        imagesPreview.innerHTML = `<div class="empty">暂无图片，请先到“企业知识库-图片库”保存</div>`;
        updateImagePickerBar();
        return;
      }
      const table = `
        <div class="aw-picker-table" style="overflow-x:auto;overflow-y:visible;width:100%;">
          <table class="aw-table" style="min-width:860px;">
            <thead>
              <tr>
                <th style="width:60px;">选择</th>
                <th style="width:80px;">序号</th>
                <th style="width:160px;">分类</th>
                <th>图片名称</th>
                <th style="width:120px;">使用次数</th>
                <th style="width:160px;">创建时间</th>
              </tr>
            </thead>
            <tbody>
              ${rows.slice(0, 100).map((r, idx) => {
                const id = escapeHtml(String(r?.id || ''));
                const checked = id && picked.has(String(r?.id || '')) ? 'checked' : '';
                const cat = escapeHtml(String(r?.category || ''));
                const name = escapeHtml(String(r?.name || '—'));
                const useCount = Number(r?.use_count || 0) || 0;
                const createdAt = escapeHtml(String(r?.created_at || ''));
                return `
                  <tr>
                    <td><input type="checkbox" data-id="${id}" ${checked} /></td>
                    <td>${idx + 1}</td>
                    <td>${cat}</td>
                    <td>${name}</td>
                    <td>${useCount}</td>
                    <td>${createdAt}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      imagesPreview.innerHTML = table;
      updateImagePickerBar();
    };

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'geo_question_lexicons_data') {
        const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
        state.lexicons = items;
        renderLexicons();
        renderBrandTitleSelect();
        renderLexiconDateOptions();
        const pre = localStorage.getItem('aw_prefill_lexicon_id') || '';
        if (pre && lexiconSelect) {
          lexiconSelect.value = pre;
          state.currentLexiconId = String(pre || '').trim();
          localStorage.removeItem('aw_prefill_lexicon_id');
        }
        renderLexiconTable();
        requestQuestions();
        return;
      }
      if (d.type === 'geo_question_words_data') {
        const lexiconId = String(d.payload?.lexicon_id || '').trim();
        if (!lexiconId || String(lexiconId) !== String(state.currentLexiconId || '')) return;
        const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
        const qsFromDb = items.map((x) => String(x?.question_text || '').trim()).filter(Boolean);
        const lex = (state.lexicons || []).find((x) => String(x.id) === lexiconId);
        const qsGen = buildQuestions(lex);
        const qs = qsGen.length ? qsGen : qsFromDb;
        state.questions = qs;
        renderQuestionsList(qs);
        ensureChatReady();
        return;
      }
      if (d.type === 'geo_knowledge_base_data') {
        const sec = String(d.payload?.section || '').trim();
        if (sec === 'products') {
          const rows = Array.isArray(d.payload?.data?.rows) ? d.payload.data.rows : [];
          state.kbProducts = rows.filter((x) => x && typeof x === 'object');
          state.productPickerLoading = false;
          if (state.productPickerOpen) renderProductPicker();
          return;
        }
        if (sec === 'images') {
          const cats = Array.isArray(d.payload?.data?.categories) ? d.payload.data.categories : [];
          const imgs = Array.isArray(d.payload?.data?.images) ? d.payload.data.images : [];
          const catMap = new Map(cats.map((c) => [String(c?.id || ''), String(c?.name || '')]));
          state.kbImages = imgs
            .filter((x) => x && typeof x === 'object')
            .map((it) => {
              const catName = catMap.get(String(it?.category_id || '')) || '';
              return {
                id: it.id,
                name: it.name || '',
                category: catName,
                created_at: it.created_at || '',
                use_count: it.use_count ?? 0
              };
            });
          state.imagePickerLoading = false;
          if (state.imagePickerOpen) renderImagesPicker();
          return;
        }
      }
      if (d.type === 'geo_article_writing_init_chat_result') {
        const payload = d.payload || {};
        const reqId = String(payload.req_id || '');
        if (reqId && reqId !== String(state.chatInitReqId || '')) return;
        const ok = payload && payload.ok === true;
        const text = String(payload.text || '').trim();
        state.chatSending = false;
        setChatDisabled(false);
        if (chatHint) chatHint.textContent = ok ? '' : (payload?.error || '对话初始化失败');
        if (text) {
          resetChat();
          pushChatMessage('ai', text);
          renderChat();
        }
        return;
      }
      if (d.type === 'geo_article_writing_chat_result') {
        const payload = d.payload || {};
        const reqId = String(payload.req_id || '');
        if (reqId && reqId !== String(state.chatReqId || '')) return;
        const ok = payload && payload.ok === true;
        const text = String(payload.text || '').trim();
        state.chatSending = false;
        setChatDisabled(false);
        if (chatHint) chatHint.textContent = ok ? '' : (payload?.error || '对话失败');
        if (text) {
          pushChatMessage('ai', text);
          renderChat();
        }
        return;
      }
      if (d.type === 'geo_article_writing_generate_result') {
        const payload = d.payload || {};
        const reqId = String(payload.req_id || '');
        if (reqId && reqId !== String(state.draftReqId || '')) return;
        state.draftGenerating = false;
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.textContent = '开启创作';
        }
        const ok = payload && payload.ok === true;
        const text = String(payload.text || '').trim();
        if (!ok || !text) {
          if (chatHint) chatHint.textContent = payload?.error || '文案生成失败';
          return;
        }
        state.draftContent = text;
        const firstLine = text.split(/\r?\n/g)[0] || '';
        const maybeTitle = firstLine.replace('标题：', '').replace('标题:', '').trim().slice(0, 120);
        state.draftTitle = maybeTitle;
        pushChatMessage('ai', `【生成文案】\n${text}`);
        renderChat();
        if (chatHint) chatHint.textContent = '如需保存到文章管理，请点击“确定”；如需改写提升，请点“重新优化”。';
        setCopyActionsEnabled(true);
        return;
      }
      if (d.type === 'geo_article_writing_optimize_result') {
        const payload = d.payload || {};
        const reqId = String(payload.req_id || '');
        if (reqId && reqId !== String(state.draftOptimizeReqId || '')) return;
        state.draftGenerating = false;
        const ok = payload && payload.ok === true;
        const text = String(payload.text || '').trim();
        const suggestions = String(payload.suggestions || '').trim();
        if (!ok || !text) {
          if (chatHint) chatHint.textContent = payload?.error || '重新优化失败';
          setCopyActionsEnabled(Boolean(String(state.draftContent || '').trim()));
          return;
        }
        state.draftContent = text;
        const firstLine = text.split(/\r?\n/g)[0] || '';
        const maybeTitle = firstLine.replace('标题：', '').replace('标题:', '').trim().slice(0, 120);
        state.draftTitle = maybeTitle;
        const block = suggestions ? `【重新优化建议】\n${suggestions}\n\n【优化后文案】\n${text}` : `【优化后文案】\n${text}`;
        pushChatMessage('ai', block);
        renderChat();
        if (chatHint) chatHint.textContent = '如已满意，请点击“确定”保存到文章管理；否则可继续“重新优化”。';
        setCopyActionsEnabled(true);
        return;
      }
      if (d.type === 'geo_article_generate_result') {
        const payload = d.payload || {};
        state.generating = false;
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.textContent = '开启创作';
        }
        if (copyConfirmBtn) copyConfirmBtn.disabled = false;
        if (copyReoptBtn) copyReoptBtn.disabled = !Boolean(String(state.draftContent || '').trim());
        const ok = payload && payload.ok === true;
        if (ok) {
          alert('文章已生成并写入文章管理。');
          window.navigateTo?.('article-manager');
        } else {
          alert(payload?.error || '生成失败，请稍后重试。');
        }
        return;
      }
      if (d.type === 'geo_llm_generate_result') {
        const payload = d.payload || {};
        const kind = String(payload.kind || '');
        const reqId = String(payload.req_id || '');
        if (kind === 'title' && reqId && reqId === String(state.brandTitleReqId || '')) {
          const text = String(payload.text || '').trim();
          const titles = text
            .split(/\r?\n/g)
            .map((x) => x.replace(/^\s*[\d\.\-、]+\s*/g, '').trim())
            .filter(Boolean)
            .slice(0, 10);
          renderBrandTitleSuggest(titles);
          return;
        }
        if (kind === 'activity_desc' && reqId && reqId === String(state.activityDescReqId || '')) {
          const text = String(payload.text || '').trim();
          if (activityDesc) activityDesc.value = text;
          return;
        }
      }
    };
    Page._handler = onMessage;
    window.addEventListener('message', onMessage);
    Page._cleanup = () => {
      if (Page._handler) window.removeEventListener('message', Page._handler);
      Page._handler = null;
    };

    renderLexicons();
    renderBrandTitleSelect();
    renderLexiconDateOptions();
    renderLexiconTable();
    requestLexicons();
    refreshLexiconsBtn?.addEventListener('click', requestLexicons);
    lexiconSelect?.addEventListener('change', requestQuestions);

    chatSendBtn?.addEventListener('click', () => {
      sendChatMessage(String(chatInput?.value || '').trim());
    });
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      sendChatMessage(String(chatInput?.value || '').trim());
    });

    copyConfirmBtn?.addEventListener('click', () => {
      const content = String(state.draftContent || '').trim();
      if (!content) {
        alert('请先点击“开启创作”生成文案草稿，再点击确定保存。');
        return;
      }
      const tab = 'product';
      const lexiconId = String(lexiconSelect?.value || '').trim();
      const questionText = String(state.selectedQuestion || state.questions?.[0] || '').trim();
      const selectedProducts = Array.isArray(state.selectedProducts) ? state.selectedProducts.slice(0, 3) : [];
      const selectedImages = Array.isArray(state.selectedImages) ? state.selectedImages.slice(0, 3) : [];

      const payload = {
        tab,
        lexicon_id: lexiconId,
        question_text: questionText,
        title: String(state.draftTitle || '').trim(),
        content,
        user_input: buildCreateUserInputFromChat(state.chatHistory),
        product: selectedProducts[0] || null,
        products: selectedProducts,
        images: selectedImages,
        platforms: getCheckedTexts(platformGroup),
        article_type: firstCheckedText(typeGroup) || mainArticleTypeByTab(tab),
        style: firstCheckedText(styleGroup),
        tone: firstCheckedText(toneGroup),
        ts: Date.now()
      };
      window.geoConsume?.({ event_type: 'ai_generate', page: 'article-writing', action: 'copy_confirm_save', units: 1, amount: 0 });
      state.generating = true;
      if (copyConfirmBtn) copyConfirmBtn.disabled = true;
      if (copyReoptBtn) copyReoptBtn.disabled = true;
      invokeGeoAction('geoArticleGenerate', payload, '文章保存接口尚未就绪，请刷新页面后重试。');
    });

    copyReoptBtn?.addEventListener('click', () => {
      const content = String(state.draftContent || '').trim();
      if (!content) {
        alert('请先点击“开启创作”生成文案草稿，再点击重新优化。');
        return;
      }
      if (state.draftGenerating) return;
      const ctx = getProductChatContext();
      if (!ctx.ok) {
        alert(ctx.hint || '请先补齐必要信息后再重新优化。');
        return;
      }
      const reqId = String(Date.now());
      state.draftOptimizeReqId = reqId;
      state.draftGenerating = true;
      if (copyConfirmBtn) copyConfirmBtn.disabled = true;
      if (copyReoptBtn) copyReoptBtn.disabled = true;
      if (chatHint) chatHint.textContent = '重新优化中...';
      invokeGeoAction(
        'geoArticleWritingOptimize',
        {
          req_id: reqId,
          lexicon_id: ctx.lexiconId,
          question_text: ctx.questionText,
          products: ctx.products,
          images: ctx.images,
          user_input: buildCreateUserInputFromChat(state.chatHistory),
          draft: content,
          ts: Date.now()
        },
        '重新优化接口尚未就绪，请刷新页面后重试。'
      );
    });

    lexiconSearchBtn?.addEventListener('click', () => {
      state.lexiconKeyword = String(lexiconKeywordEl?.value || '').trim();
      renderLexiconTable();
    });
    lexiconKeywordEl?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      state.lexiconKeyword = String(lexiconKeywordEl?.value || '').trim();
      renderLexiconTable();
    });
    lexiconDateSelect?.addEventListener('change', () => {
      state.lexiconDate = String(lexiconDateSelect?.value || '').trim();
      renderLexiconTable();
    });

    lexiconTbody?.addEventListener('change', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.type !== 'radio') return;
      const id = String(t.getAttribute('data-id') || '').trim();
      if (!id) return;
      state.currentLexiconId = id;
      if (lexiconSelect) lexiconSelect.value = id;
      requestQuestions();
    });

    questionListBox?.addEventListener('change', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.type !== 'radio') return;
      state.selectedQuestion = String(t.value || '').trim();
      ensureChatReady();
    });

    brandUseSelectedBtn?.addEventListener('click', () => {
      const id = String(brandTitleSelect?.value || '').trim();
      const kw = normalizeLabel(brandTitleSelect?.selectedOptions?.[0]?.textContent || '');
      if (id) state.brandLexiconId = id;
      if (kw && brandTitleInput) brandTitleInput.value = kw;
    });

    brandTitleSelect?.addEventListener('change', () => {
      const id = String(brandTitleSelect?.value || '').trim();
      if (id) state.brandLexiconId = id;
    });

    brandTitleSuggest?.addEventListener('change', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.type !== 'radio') return;
      if (brandTitleInput) brandTitleInput.value = String(t.value || '').trim();
    });

    genTitleBtn?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ai_generate', page: 'article-writing', action: 'gen_title', units: 1, amount: 0 });
      const reqId = String(Date.now());
      state.brandTitleReqId = reqId;
      if (brandTitleSuggest) brandTitleSuggest.innerHTML = `<div class="loading">生成中...</div>`;
      const lexiconId = String(state.brandLexiconId || '').trim();
      const keyword = normalizeLabel(brandTitleSelect?.selectedOptions?.[0]?.textContent || brandTitleInput?.value || '');
      const hint = valueOrPlaceholder(brandTitleHint);
      window.geoLlmGenerate?.({
        kind: 'title',
        req_id: reqId,
        lexicon_id: lexiconId,
        keyword,
        hint,
        ts: Date.now()
      });
    });

    genActivityDescBtn?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ai_generate', page: 'article-writing', action: 'gen_activity_desc', units: 1, amount: 0 });
      const reqId = String(Date.now());
      state.activityDescReqId = reqId;
      const lexiconId = String(state.brandLexiconId || lexiconSelect?.value || '').trim();
      const keyword = normalizeLabel(brandTitleSelect?.selectedOptions?.[0]?.textContent || '');
      const hint = valueOrPlaceholder(activityDesc);
      window.geoLlmGenerate?.({
        kind: 'activity_desc',
        req_id: reqId,
        lexicon_id: lexiconId,
        keyword,
        hint,
        ts: Date.now()
      });
    });

    insertActivityImgBtn?.addEventListener('click', () => {
      if (awImgFile) awImgFile.value = '';
      if (awImgModalPreview) awImgModalPreview.textContent = '未选择图片';
      openImgModal();
    });

    awImgFile?.addEventListener('change', () => {
      if (!(awImgFile instanceof HTMLInputElement)) return;
      const file = (awImgFile.files || [])[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        if (awImgModalPreview) {
          awImgModalPreview.innerHTML = `<img src="${escapeHtml(url)}" style="max-width:100%;max-height:200px;object-fit:contain;" />`;
        }
        state.activityImageDataUrl = url;
      };
      reader.readAsDataURL(file);
    });

    awImgInsertBtn?.addEventListener('click', () => {
      if (!state.activityImageDataUrl) {
        alert('请先选择图片。');
        return;
      }
      refreshActivityImgPreview();
      closeImgModal();
    });

    refreshActivityImgPreview();

    const renderProductPreview = () => {
      if (!productPreview) return;
      if (state.productPickerOpen) return;
      const list = Array.isArray(state.selectedProducts) ? state.selectedProducts : [];
      if (!list.length) {
        productPreview.textContent = '未选择产品';
        return;
      }
      const blocks = list.slice(0, 3).map((p, idx) => {
        const lines = [
          `【${idx + 1}】`,
          `精准产品名称：${p?.precise_product_name || p?.product_name || ''}`,
          `产品核心材质：${p?.core_material || p?.material || ''}`,
          `产品核心参数：${p?.core_params || p?.specs || ''}`,
          `产品核心特点：${p?.core_features || p?.craft || ''}`,
          `产品核心优势：${p?.core_advantages || p?.advantages || ''}`,
          `产品适用场景：${p?.use_scenarios || p?.use_scene || ''}`,
          `适配客户/人群：${p?.target_audience || p?.target_group || ''}`,
          `适配目标市场：${p?.target_market || p?.origin || ''}`,
          `定制服务能力：${p?.customization_capability || p?.delivery || ''}`
        ];
        return lines.join('\n');
      });
      productPreview.textContent = blocks.join('\n\n');
    };

    const renderImagesPreview = () => {
      if (!imagesPreview) return;
      if (state.imagePickerOpen) return;
      const imgs = Array.isArray(state.selectedImages) ? state.selectedImages : [];
      if (!imgs.length) {
        imagesPreview.textContent = '未选择图片';
        return;
      }
      imagesPreview.textContent = imgs.map((x, idx) => `${idx + 1}. ${x.name || x.file_name || x.filename || '—'}`).join('\n');
    };

    const hydrateSelections = () => {
      const ps = safeParse(localStorage.getItem('aw_selected_products_v1') || '');
      const p = safeParse(localStorage.getItem('aw_selected_product_v1') || '');
      const imgs = safeParse(localStorage.getItem('aw_selected_images_v1') || '');
      if (Array.isArray(ps)) {
        state.selectedProducts = ps.slice(0, 3).filter((x) => x && typeof x === 'object');
      } else if (p && typeof p === 'object') {
        state.selectedProducts = [p].slice(0, 3);
      } else {
        state.selectedProducts = [];
      }
      state.selectedImages = Array.isArray(imgs) ? imgs.slice(0, 3) : [];
      renderProductPreview();
      renderImagesPreview();
    };

    hydrateSelections();
    updateProductPickerBar();
    updateImagePickerBar();
    ensureChatReady();

    pickProductBtn?.addEventListener('click', () => {
      if (!productPreview) return;
      if (state.productPickerOpen) {
        state.productPickerOpen = false;
        state.productPickerLoading = false;
        state.productPickerBackup = null;
        productPreview.classList.remove('aw-picker-open');
        updateProductPickerBar();
        renderProductPreview();
        return;
      }
      state.productPickerBackup = JSON.stringify(Array.isArray(state.selectedProducts) ? state.selectedProducts : []);
      state.productPickerOpen = true;
      state.productPickerLoading = true;
      productPreview.classList.add('aw-picker-open');
      productPreview.innerHTML = `<div class="loading">加载中...</div>`;
      updateProductPickerBar();
      invokeGeoAction('geoQueryKnowledgeBase', { section: 'products', ts: Date.now() }, '产品库接口尚未就绪，请刷新页面后重试。');
    });

    pickImagesBtn?.addEventListener('click', () => {
      if (!imagesPreview) return;
      if (state.imagePickerOpen) {
        state.imagePickerOpen = false;
        state.imagePickerLoading = false;
        state.imagePickerBackup = null;
        imagesPreview.classList.remove('aw-picker-open');
        updateImagePickerBar();
        renderImagesPreview();
        return;
      }
      state.imagePickerBackup = JSON.stringify(Array.isArray(state.selectedImages) ? state.selectedImages : []);
      state.imagePickerOpen = true;
      state.imagePickerLoading = true;
      imagesPreview.classList.add('aw-picker-open');
      imagesPreview.innerHTML = `<div class="loading">加载中...</div>`;
      updateImagePickerBar();
      invokeGeoAction('geoQueryKnowledgeBase', { section: 'images', ts: Date.now() }, '图片库接口尚未就绪，请刷新页面后重试。');
    });

    productPreview?.addEventListener('change', (e) => {
      if (!state.productPickerOpen) return;
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.type !== 'checkbox') return;
      const idx = parseInt(String(t.getAttribute('data-idx') || ''), 10);
      if (!Number.isFinite(idx)) return;
      const row = (Array.isArray(state.kbProducts) ? state.kbProducts : [])[idx] || null;
      if (!row) return;
      const key = productKey(row, idx);
      const list = Array.isArray(state.selectedProducts) ? state.selectedProducts : [];
      const exists = list.some((p, i) => productKey(p, i) === key);
      if (t.checked) {
        if (list.length >= 3) {
          t.checked = false;
          alert('最多只能选择3个产品');
          return;
        }
        if (!exists) state.selectedProducts = list.concat([row]).slice(0, 3);
      } else {
        state.selectedProducts = list.filter((p, i) => productKey(p, i) !== key);
      }
      updateProductPickerBar();
      ensureChatReady();
    });

    productPickerBar?.addEventListener('click', (e) => {
      if (!state.productPickerOpen) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      const btn = t?.closest('button[data-action]');
      const action = btn?.getAttribute('data-action') || '';
      if (action === 'aw-product-cancel') {
        const back = safeParse(state.productPickerBackup || '');
        state.selectedProducts = Array.isArray(back) ? back.slice(0, 3) : [];
        state.productPickerOpen = false;
        state.productPickerBackup = null;
        productPreview?.classList.remove('aw-picker-open');
        updateProductPickerBar();
        renderProductPreview();
        ensureChatReady();
        return;
      }
      if (action === 'aw-product-done') {
        try {
          localStorage.setItem('aw_selected_products_v1', JSON.stringify((Array.isArray(state.selectedProducts) ? state.selectedProducts : []).slice(0, 3)));
        } catch {
        }
        state.productPickerOpen = false;
        state.productPickerBackup = null;
        productPreview?.classList.remove('aw-picker-open');
        updateProductPickerBar();
        renderProductPreview();
        ensureChatReady();
      }
    });

    imagesPreview?.addEventListener('change', (e) => {
      if (!state.imagePickerOpen) return;
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.type !== 'checkbox') return;
      const id = String(t.getAttribute('data-id') || '').trim();
      if (!id) return;
      const list = Array.isArray(state.selectedImages) ? state.selectedImages : [];
      const exists = list.some((x) => String(x?.id || '') === id);
      if (t.checked) {
        if (list.length >= 3) {
          t.checked = false;
          alert('最多只能选择3张图片');
          return;
        }
        if (!exists) {
          const it = (Array.isArray(state.kbImages) ? state.kbImages : []).find((x) => String(x?.id || '') === id);
          if (it) state.selectedImages = list.concat([it]).slice(0, 3);
        }
      } else {
        state.selectedImages = list.filter((x) => String(x?.id || '') !== id);
      }
      updateImagePickerBar();
    });

    imagePickerBar?.addEventListener('click', (e) => {
      if (!state.imagePickerOpen) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      const btn = t?.closest('button[data-action]');
      const action = btn?.getAttribute('data-action') || '';
      if (action === 'aw-image-cancel') {
        const back = safeParse(state.imagePickerBackup || '');
        state.selectedImages = Array.isArray(back) ? back.slice(0, 3) : [];
        state.imagePickerOpen = false;
        state.imagePickerBackup = null;
        imagesPreview?.classList.remove('aw-picker-open');
        updateImagePickerBar();
        renderImagesPreview();
        ensureChatReady();
        return;
      }
      if (action === 'aw-image-done') {
        try {
          localStorage.setItem('aw_selected_images_v1', JSON.stringify((Array.isArray(state.selectedImages) ? state.selectedImages : []).slice(0, 3)));
        } catch {
        }
        state.imagePickerOpen = false;
        state.imagePickerBackup = null;
        imagesPreview?.classList.remove('aw-picker-open');
        updateImagePickerBar();
        renderImagesPreview();
        ensureChatReady();
      }
    });

    const chatNoise = (s) => {
      const t = String(s || '').trim();
      if (!t) return true;
      if (t.length <= 2) return true;
      if (/^(你好|您好|在吗|谢谢|谢了|好的|ok|OK|嗯|嗯嗯|哈|哈哈|收到)$/.test(t)) return true;
      if (/^[\s\.\!\?\-_,，。！？；;:：]+$/.test(t)) return true;
      return false;
    };

    const chatRelevantKeywords = [
      '行业', '所属行业', '行业类型',
      '产品', '服务', '产品/服务', '产品类型', '服务类型',
      '用户', '人群', '客户', '目标用户', '目标人群', '用户群体', 'B端', 'C端', 'B2B', 'B2C', 'B+C',
      '卖点', '优势', '特点', '参数', '材质', '技术', '能力', '场景', '痛点', '案例',
      '价格', '预算', '交付', '售后', '质保',
      '平台', '风格', '语调', '长度', '字数', '标题'
    ];

    const shouldKeepChatMessage = (role, text) => {
      const t = String(text || '').trim();
      if (chatNoise(t)) return false;
      if (chatRelevantKeywords.some((k) => t.includes(k))) return true;
      if (role === 'user') return t.length >= 8;
      if (role === 'ai' && (t.includes('【提问】') || t.includes('？') || t.includes('?'))) return true;
      return false;
    };

    const buildCreateUserInputFromChat = (history) => {
      const items = Array.isArray(history) ? history : [];
      const parts = [];
      for (const m of items.slice(0, 120)) {
        const role = String(m?.role || '').trim() === 'user' ? 'user' : 'ai';
        const text = String(m?.text || '').trim();
        if (!shouldKeepChatMessage(role, text)) continue;
        parts.push(`${role === 'user' ? '用户' : 'AI'}：${text}`);
        if (parts.length >= 80) break;
      }
      return parts.join('\n').trim();
    };

    const extractIndustryInfoFromChat = (history) => {
      const items = Array.isArray(history) ? history : [];
      const userText = items.filter((m) => String(m?.role || '') === 'user').map((m) => String(m?.text || '')).join('\n');
      const allText = items.map((m) => String(m?.text || '')).join('\n');
      const info = { product_type: '', target_audience: '', industry: '' };
      const pick = (re, text) => {
        const m = String(text || '').match(re);
        return m && m[1] ? String(m[1]).trim() : '';
      };
      info.product_type = pick(/(?:产品\/服务类型|产品类型|服务类型)[:：]\s*([^\n。；;]{2,80})/i, userText);
      info.target_audience = pick(/(?:用户群体类型|目标用户|目标人群|客户群体|用户人群)[:：]\s*([^\n。；;]{2,80})/i, userText);
      info.industry = pick(/(?:行业类型|所属行业)[:：]\s*([^\n。；;]{2,80})/i, userText);

      const patterns = {
        industry: /(教育|医疗|金融|电商|零售|餐饮|旅游|科技|互联网|游戏|健康|美容|时尚|汽车|房地产|建筑|农业|食品|母婴|宠物|家居|家电|3C|数码|服装|运动|健身|法律|咨询|人力资源|物流|供应链|SaaS|AI|人工智能|直播|短视频|社交|政务|公益|环保|能源|化工|制造)/,
        target_audience: /(学生|白领|宝妈|老年人|年轻人|00后|90后|80后|女性|男性|创业者|企业主|中小企业|大企业|个人用户|B端|C端|政府|医生|律师|程序员|设计师|摄影师|运动爱好者|家长)/,
        product_type: /(App|软件|平台|课程|服务|商品|产品|工具|系统|方案|食品|饮料|化妆品|护肤品|服装|鞋包|数码|家电|保险|贷款|投资|理财|药品|健康品|教材|书籍|设备|机器)/i
      };
      if (!info.industry) info.industry = pick(patterns.industry, allText);
      if (!info.target_audience) info.target_audience = pick(patterns.target_audience, allText);
      if (!info.product_type) info.product_type = pick(patterns.product_type, allText);

      return info;
    };

    startBtn?.addEventListener('click', () => {
      if (state.generating) return;
      const tab = String(state.activeTab || 'product');
      const lexiconId =
        tab === 'product'
          ? String(lexiconSelect?.value || '').trim()
          : String(state.brandLexiconId || lexiconSelect?.value || '').trim();

      let userInput = '';
      let title = '';
      let questionText = '';
      let activityImage = '';

      if (tab === 'product') {
        if (!lexiconId) {
          alert('请先选择已创建的问题词库。');
          return;
        }
        questionText = String(state.selectedQuestion || state.questions?.[0] || '').trim();
        if (!questionText) {
          alert('请先从问题词列表选择一条问题词。');
          return;
        }
        const prods = Array.isArray(state.selectedProducts) ? state.selectedProducts.slice(0, 3) : [];
        if (!prods.length) {
          alert('请先在“第二步：选择产品”中至少选择1个产品。');
          return;
        }
        const createUserInput = buildCreateUserInputFromChat(state.chatHistory);
        if (!createUserInput) {
          alert('请先在“文案优化建议”区域补充与创作相关的信息，再开始创作。');
          return;
        }
        const industryInfo = extractIndustryInfoFromChat(state.chatHistory);
        const missing = [];
        if (!industryInfo.product_type) missing.push('产品/服务类型');
        if (!industryInfo.target_audience) missing.push('用户群体类型');
        if (!industryInfo.industry) missing.push('行业类型');
        if (missing.length) {
          alert(`请先在对话中确认：${missing.join('、')}。\n\n禁止强行猜测行业，确认后再开始生成文案。`);
          return;
        }
        userInput = createUserInput;
      } else if (tab === 'brand') {
        title = String(brandTitleInput?.value || '').trim();
        userInput = valueOrPlaceholder(brandTitleHint);
        questionText = normalizeLabel(brandTitleSelect?.selectedOptions?.[0]?.textContent || '') || title;
      } else if (tab === 'activity') {
        userInput = valueOrPlaceholder(activityDesc);
        activityImage = state.activityImageDataUrl;
        questionText = normalizeLabel(brandTitleSelect?.selectedOptions?.[0]?.textContent || '');
      }

      const selectedProducts = tab === 'product' && Array.isArray(state.selectedProducts)
        ? state.selectedProducts.slice(0, 3)
        : [];
      const selectedImages = tab === 'product' && Array.isArray(state.selectedImages)
        ? state.selectedImages.slice(0, 3)
        : [];

      const payload = {
        tab,
        lexicon_id: lexiconId,
        question_text: questionText,
        title,
        user_input: userInput,
        activity_image: activityImage,
        product: tab === 'product' ? (selectedProducts[0] || null) : null,
        products: selectedProducts,
        images: selectedImages,
        platforms: getCheckedTexts(platformGroup),
        article_type: firstCheckedText(typeGroup) || mainArticleTypeByTab(tab),
        style: firstCheckedText(styleGroup),
        tone: firstCheckedText(toneGroup),
        ts: Date.now()
      };
      window.geoConsume?.({ event_type: 'ai_generate', page: 'article-writing', action: 'start_create', units: 1, amount: 0 });
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = '生成中...';
      }
      if (tab === 'product') {
        if (state.draftGenerating) return;
        const reqId = String(Date.now());
        state.draftReqId = reqId;
        state.draftGenerating = true;
        setCopyActionsEnabled(false);
        invokeGeoAction(
          'geoArticleWritingGenerate',
          { ...payload, req_id: reqId, history: state.chatHistory },
          '文案生成接口尚未就绪，请刷新页面后重试。'
        );
        return;
      }
      state.generating = true;
      invokeGeoAction('geoArticleGenerate', payload, '文章生成接口尚未就绪，请刷新页面后重试。');
    });
  },
  destroy() {
    if (Page._cleanup) {
      try {
        Page._cleanup();
      } catch {
      }
    }
    Page._cleanup = null;
  }
};

export default Page;
