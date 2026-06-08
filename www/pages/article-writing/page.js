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
    const questionListBox = document.getElementById('questionListBox');
    const pickProductBtn = document.getElementById('awPickProductBtn');
    const pickImagesBtn = document.getElementById('awPickImagesBtn');
    const productPreview = document.getElementById('awProductPreview');
    const imagesPreview = document.getElementById('awImagesPreview');
    const productPickerBar = document.getElementById('awProductPickerBar');
    const imagePickerBar = document.getElementById('awImagePickerBar');
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
    const insertBrandImgBtn = document.getElementById('insertBrandImg');
    const brandImgPreview = document.getElementById('brandImgPreview');
    const awImgModal = document.getElementById('awImgModal');
    const awImgModalTitle = document.getElementById('awImgModalTitle');
    const awImgClose = document.getElementById('awImgClose');
    const awImgCancel = document.getElementById('awImgCancel');
    const awImgFile = document.getElementById('awImgFile');
    const awImgModalPreview = document.getElementById('awImgModalPreview');
    const awImgInsertBtn = document.getElementById('awImgInsertBtn');
    const brandCompanyNameEl = document.getElementById('brand_company_name');
    const brandIndustryEl = document.getElementById('brand_industry');
    const brandMainProductsEl = document.getElementById('brand_main_products');
    const brandCustomerModeEl = document.getElementById('brand_customer_mode');
    const brandCoreCapabilityEl = document.getElementById('brand_core_capability');
    const brandEnterpriseAdvantageEl = document.getElementById('brand_enterprise_advantage');
    const brandServiceProcessEl = document.getElementById('brand_service_process');
    const brandCertificationsEl = document.getElementById('brand_certifications');
    const brandSuccessCasesEl = document.getElementById('brand_success_cases');
    const brandTargetMarketEl = document.getElementById('brand_target_market');
    const brandBrandPositioningEl = document.getElementById('brand_brand_positioning');
    const brandForbiddenContentEl = document.getElementById('brand_forbidden_content');
    const brandCopyTypeRoot = document.getElementById('brandCopyType');
    const suggestBox = document.getElementById('awSuggestBox');
    const copyConfirmBtn = document.getElementById('awCopyConfirmBtn');
    const copyReoptBtn = document.getElementById('awCopyReoptBtn');
    const suggestHint = document.getElementById('awSuggestHint');
    const viewArticleBtn = document.getElementById('awViewArticleBtn');
    const suggestSingle = document.getElementById('awSuggestSingle');
    const brandSuggestWrap = document.getElementById('awBrandSuggestWrap');
    const brandSuggestBoxes = [
      document.getElementById('awBrandSuggestBox0'),
      document.getElementById('awBrandSuggestBox1'),
      document.getElementById('awBrandSuggestBox2'),
    ];
    const brandViewBtns = Array.from(root.querySelectorAll('.aw-brand-view-btn'));
    const brandReoptBtns = Array.from(root.querySelectorAll('.aw-brand-reopt-btn'));
    const brandConfirmBtns = Array.from(root.querySelectorAll('.aw-brand-confirm-btn'));
    const brandSuggestHints = Array.from(root.querySelectorAll('.aw-brand-suggest-hint'));
    const startBtns = {
      product: root.querySelector('.aw-start-create[data-tab="product"]'),
      brand: root.querySelector('.aw-start-create[data-tab="brand"]'),
      activity: root.querySelector('.aw-start-create[data-tab="activity"]'),
    };
    const awArticleModal = document.getElementById('awArticleModal');
    const awArticleModalTitle = document.getElementById('awArticleModalTitle');
    const awArticleModalBody = document.getElementById('awArticleModalBody');
    const awArticleClose = document.getElementById('awArticleClose');
    const awArticleCancel = document.getElementById('awArticleCancel');
    const awArticleConfirmBtn = document.getElementById('awArticleConfirmBtn');

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
      brandImageDataUrl: '',
      imgModalTarget: '',
      articlesByTab: { product: [], brand: [], activity: [] },
      suggestionsByTab: { product: '', brand: ['', '', ''], activity: '' },
      lastTaskByTab: { product: null, brand: null, activity: null },
      generateQueue: [],
      generateMode: '',
      pendingGenerateItem: null,
      suggestReqId: '',
      suggestTab: '',
      suggestReqMap: {},
      rewriteQueue: [],
      pendingRewriteItem: null,
      rewriteReqId: '',
      rewriteTab: '',
      rewriteResults: [],
      pendingRewrite: null,
      saveQueue: [],
      pendingSaveItem: null,
      saveMode: '',
      saveNavAfter: false
    };

    const setStartBtnState = (tab, disabled, text) => {
      const key = String(tab || '').trim();
      const btn = startBtns?.[key];
      if (!(btn instanceof HTMLButtonElement)) return;
      btn.disabled = disabled === true;
      if (typeof text === 'string' && text) btn.textContent = text;
    };

    const show = (key) => {
      state.activeTab = key;
      tabs.forEach((t) => t.classList.toggle('active', t.getAttribute('data-tab') === key));
      panels.forEach((p) => {
        const k = p.getAttribute('data-panel');
        p.classList.toggle('hidden', k !== key);
      });
      syncSuggestUi();
    };

    tabs.forEach((t) => {
      t.addEventListener('click', () => {
        const key = t.getAttribute('data-tab');
        if (!key) return;
        show(key);
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
      if (tab === 'activity') return '主题活动创作';
      return '';
    };

    const setRewriteEnabled = (enabled) => {
      if (copyReoptBtn) copyReoptBtn.disabled = !enabled;
    };

    const setConfirmEnabled = (enabled) => {
      if (copyConfirmBtn) copyConfirmBtn.disabled = !enabled;
    };

    const getProductContext = () => {
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
        hint: ok ? '' : `请先选择${missing.join('、')}后再开启创作。`
      };
    };

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

    const getRuleGroupsForTab = (tab) => {
      const key = String(tab || '').trim();
      if (!key) return [];
      const safeKey = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') ? CSS.escape(key) : key;
      return Array.from(root.querySelectorAll(`.card[data-panel="${safeKey}"] .aw-rules .rule-group`));
    };

    ['product', 'brand', 'activity'].forEach((tab) => {
      const groups = getRuleGroupsForTab(tab);
      bindSingleChoice(groups[1] || null);
      bindSingleChoice(groups[2] || null);
      bindSingleChoice(groups[3] || null);
    });

    const getArticleListForTab = (tab) => {
      if (state.pendingRewrite && state.pendingRewrite.tab === tab) {
        return Array.isArray(state.pendingRewrite.contents) ? state.pendingRewrite.contents : [];
      }
      const v = state.articlesByTab?.[tab];
      return Array.isArray(v) ? v : [];
    };

    const renderSuggestBox = () => {
      if (!suggestBox) return;
      const tab = String(state.activeTab || 'product');
      if (tab === 'brand') return;
      const text = String(state.suggestionsByTab?.[tab] || '').trim();
      suggestBox.textContent = text || '暂无优化建议，请先点击“开启创作”。';
    };

    const renderBrandSuggestBoxes = () => {
      const texts = state.suggestionsByTab?.brand;
      const list = Array.isArray(texts) ? texts : ['', '', ''];
      brandSuggestBoxes.forEach((el, idx) => {
        if (!(el instanceof HTMLElement)) return;
        const t = String(list[idx] || '').trim();
        el.textContent = t || '暂无优化建议，请先点击“开启创作”。';
      });
    };

    const closeArticleModal = () => {
      if (awArticleModal) awArticleModal.style.display = 'none';
      if (awArticleModalBody) awArticleModalBody.textContent = '';
      if (awArticleConfirmBtn) awArticleConfirmBtn.style.display = 'none';
    };

    const openArticleModal = (title, body, allowConfirm) => {
      if (awArticleModalTitle) awArticleModalTitle.textContent = String(title || '文案预览');
      if (awArticleModalBody) awArticleModalBody.textContent = String(body || '').trim();
      if (awArticleConfirmBtn) awArticleConfirmBtn.style.display = allowConfirm ? '' : 'none';
      if (awArticleModal) awArticleModal.style.display = 'flex';
    };

    const buildCombinedBody = (items) => {
      const list = Array.isArray(items) ? items : [];
      if (!list.length) return '';
      if (list.length === 1) return String(list[0]?.content || '').trim();
      return list
        .map((it, idx) => {
          const t = String(it?.title || `文案${idx + 1}`).trim();
          const c = String(it?.content || '').trim();
          return `【${idx + 1}】${t}\n\n${c}`;
        })
        .join('\n\n------------------------------\n\n')
        .trim();
    };

    const openArticleByIndex = (idx) => {
      const tab = String(state.activeTab || 'product');
      const list = getArticleListForTab(tab);
      const it = list[idx] || null;
      if (!it) return;
      const canConfirm = Boolean(state.pendingRewrite && state.pendingRewrite.tab === tab);
      openArticleModal(it.title || '文案预览', it.content || '', canConfirm);
    };

    const openCombinedArticles = () => {
      const tab = String(state.activeTab || 'product');
      const list = getArticleListForTab(tab);
      if (!list.length) return;
      const canConfirm = Boolean(state.pendingRewrite && state.pendingRewrite.tab === tab);
      openArticleModal('文案预览', buildCombinedBody(list), canConfirm);
    };

    function syncSuggestUi() {
      const tab = String(state.activeTab || 'product');
      const list = getArticleListForTab(tab);
      const hasBase = Array.isArray(state.articlesByTab?.[tab]) && state.articlesByTab[tab].length > 0;
      const hasPendingRewrite = Boolean(state.pendingRewrite && state.pendingRewrite.tab === tab);

      if (suggestSingle instanceof HTMLElement) {
        suggestSingle.style.display = tab === 'brand' ? 'none' : '';
      }
      if (brandSuggestWrap instanceof HTMLElement) {
        brandSuggestWrap.style.display = tab === 'brand' ? '' : 'none';
      }

      if (tab !== 'brand') {
        if (viewArticleBtn instanceof HTMLElement) viewArticleBtn.disabled = list.length < 1;
      } else {
        brandViewBtns.forEach((btn) => {
          const idx = parseInt(String(btn.getAttribute('data-idx') || ''), 10);
          btn.disabled = !(Number.isFinite(idx) && list.length > idx);
        });
        brandReoptBtns.forEach((btn) => (btn.disabled = !(hasBase && !state.generating)));
        brandConfirmBtns.forEach((btn) => (btn.disabled = !(hasPendingRewrite && !state.generating)));
        brandSuggestHints.forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          el.textContent = hasPendingRewrite ? '已生成改稿版本，请点击“确定”写入文章管理。' : '';
        });
      }

      setRewriteEnabled(hasBase && !state.generating);
      setConfirmEnabled(hasPendingRewrite && !state.generating);
      renderSuggestBox();
      renderBrandSuggestBoxes();
      if (suggestHint) suggestHint.textContent = tab === 'brand' ? '' : (hasPendingRewrite ? '已生成改稿版本，请点击“确定”写入文章管理。' : '');
    }

    viewArticleBtn?.addEventListener('click', () => {
      openCombinedArticles();
    });
    brandViewBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(String(btn.getAttribute('data-idx') || ''), 10);
        if (!Number.isFinite(idx)) return;
        openArticleByIndex(idx);
      });
    });

    brandReoptBtns.forEach((btn) => {
      btn.addEventListener('click', () => startRewriteForActiveTab());
    });
    brandConfirmBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(String(btn.getAttribute('data-idx') || ''), 10);
        confirmRewriteSave(Number.isFinite(idx) ? idx : undefined);
      });
    });

    awArticleClose?.addEventListener('click', closeArticleModal);
    awArticleCancel?.addEventListener('click', closeArticleModal);
    awArticleModal?.addEventListener('click', (e) => {
      if (e.target === awArticleModal) closeArticleModal();
    });

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
          const name = lexiconDisplayName(x) || '—';
          return `<tr>
            <td><input type="radio" name="awLexiconPick" data-id="${escapeHtml(id)}" ${checked} /></td>
            <td>${idx + 1}</td>
            <td class="aw-lexicon-name-cell" title="${escapeHtml(name)}">${escapeHtml(name)}</td>
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

    const refreshBrandImgPreview = () => {
      if (!brandImgPreview) return;
      if (!state.brandImageDataUrl) {
        brandImgPreview.textContent = '这里显示插入图片的预览图';
        return;
      }
      brandImgPreview.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;width:100%;height:100%;">
        <img src="${escapeHtml(state.brandImageDataUrl)}" style="max-width:100%;max-height:180px;object-fit:contain;" />
        <div class="page-muted" style="color:#ef4444;">点击图片可移除</div>
      </div>`;
    };
    brandImgPreview?.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const img = t.closest('img');
      if (!img) return;
      state.brandImageDataUrl = '';
      refreshBrandImgPreview();
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
        syncSuggestUi();
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
      if (d.type === 'geo_article_writing_suggestions_result') {
        const payload = d.payload || {};
        const reqId = String(payload.req_id || '');
        const meta = reqId ? (state.suggestReqMap?.[reqId] || null) : null;
        if (reqId && !meta && reqId !== String(state.suggestReqId || '')) return;
        const tab = String((meta?.tab) || state.suggestTab || state.activeTab || 'product');
        const idx = typeof meta?.idx === 'number' ? meta.idx : null;
        if (reqId && meta && state.suggestReqMap) delete state.suggestReqMap[reqId];
        const ok = payload && payload.ok === true;
        const text = String(payload.text || '').trim();
        if (!ok || !text) {
          if (tab === 'brand') {
            brandSuggestHints.forEach((el) => {
              if (!(el instanceof HTMLElement)) return;
              el.textContent = payload?.error || '优化建议生成失败';
            });
          } else if (suggestHint) {
            suggestHint.textContent = payload?.error || '优化建议生成失败';
          }
          return;
        }
        if (tab === 'brand') {
          const arr = Array.isArray(state.suggestionsByTab.brand) ? state.suggestionsByTab.brand.slice(0, 3) : ['', '', ''];
          if (typeof idx === 'number' && idx >= 0 && idx < 3) arr[idx] = text;
          state.suggestionsByTab.brand = arr;
          renderBrandSuggestBoxes();
          brandSuggestHints.forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            el.textContent = '';
          });
        } else {
          state.suggestionsByTab[tab] = text;
          if (tab === state.activeTab) renderSuggestBox();
          if (suggestHint) suggestHint.textContent = '';
        }
        return;
      }
      if (d.type === 'geo_article_writing_rewrite_result') {
        const payload = d.payload || {};
        const reqId = String(payload.req_id || '');
        const item = state.pendingRewriteItem;
        if (!item || (reqId && reqId !== String(item.reqId || ''))) return;
        const ok = payload && payload.ok === true;
        const text = String(payload.text || '').trim();
        if (!ok || !text) {
          state.generating = false;
          state.rewriteQueue = [];
          state.pendingRewriteItem = null;
          state.rewriteResults = [];
          setStartBtnState(state.rewriteTab || state.activeTab, false, '开启创作');
          if (copyReoptBtn) copyReoptBtn.disabled = false;
          if (suggestHint) suggestHint.textContent = payload?.error || '重新优化失败';
          return;
        }
        state.rewriteResults = (Array.isArray(state.rewriteResults) ? state.rewriteResults : []).concat([{
          title: item.title || '',
          content: text
        }]);
        state.pendingRewriteItem = null;
        runNextRewrite();
        return;
      }
      if (d.type === 'geo_article_generate_result') {
        const payload = d.payload || {};
        const ok = payload && payload.ok === true;
        const item = state.pendingGenerateItem || state.pendingSaveItem;
        if (!item) return;
        if (!ok) {
          state.generating = false;
          state.generateQueue = [];
          state.saveQueue = [];
          state.pendingGenerateItem = null;
          state.pendingSaveItem = null;
          setStartBtnState(item.tab || state.activeTab, false, '开启创作');
          alert(payload?.error || '生成失败，请稍后重试。');
          syncSuggestUi();
          return;
        }
        const tab = String(item.tab || state.activeTab || 'product');
        const title = String(payload.title || item.title || '').trim();
        const content = String(payload.content || '').trim();
        const articleId = payload.article_id;
        if (state.pendingGenerateItem) {
          const list = Array.isArray(state.articlesByTab[tab]) ? state.articlesByTab[tab] : [];
          state.articlesByTab[tab] = list.concat([{ article_id: articleId, title, content }]);
          state.pendingGenerateItem = null;
          syncSuggestUi();
          runNextGenerate();
        } else {
          state.pendingSaveItem = null;
          runNextSave();
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
    show('product');

    function confirmRewriteSave(onlyIdx) {
      const tab = String(state.activeTab || 'product');
      const pending = state.pendingRewrite;
      if (!pending || pending.tab !== tab || !Array.isArray(pending.contents) || !pending.contents.length) {
        alert('请先点击“重新优化”生成改稿版本，再点击确定。');
        return;
      }
      const baseTask = state.lastTaskByTab?.[tab];
      if (!baseTask) {
        alert('缺少创作上下文，请先点击“开启创作”。');
        return;
      }
      state.saveMode = 'rewrite_save';
      state.saveNavAfter = true;
      const picked = (tab === 'brand' && Number.isFinite(onlyIdx))
        ? [pending.contents[onlyIdx]]
        : pending.contents;
      state.saveQueue = picked
        .filter((x) => x && typeof x === 'object')
        .map((it, idx) => {
        const originalIdx = (tab === 'brand' && Number.isFinite(onlyIdx)) ? Number(onlyIdx) : idx;
        const t = String(it?.title || '').trim();
        const c = String(it?.content || '').trim();
        const prefix = tab === 'brand' ? `【改稿${originalIdx + 1}】` : '【改稿】';
        return {
          tab,
          payload: {
            ...baseTask,
            title: `${prefix}${t || (baseTask.title || '')}`.slice(0, 120),
            content: c,
            ts: Date.now()
          }
        };
      });
      state.pendingRewrite = null;
      setConfirmEnabled(false);
      closeArticleModal();
      runNextSave();
    }

    copyConfirmBtn?.addEventListener('click', () => confirmRewriteSave());
    awArticleConfirmBtn?.addEventListener('click', () => confirmRewriteSave());

    copyReoptBtn?.addEventListener('click', () => startRewriteForActiveTab());

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
      syncSuggestUi();
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
      state.imgModalTarget = 'activity';
      if (awImgModalTitle) awImgModalTitle.textContent = '插入图片';
      openImgModal();
    });

    insertBrandImgBtn?.addEventListener('click', () => {
      if (awImgFile) awImgFile.value = '';
      if (awImgModalPreview) awImgModalPreview.textContent = '未选择图片';
      state.imgModalTarget = 'brand';
      if (awImgModalTitle) awImgModalTitle.textContent = '插入图片';
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
        if (state.imgModalTarget === 'brand') state.brandImageDataUrl = url;
        else state.activityImageDataUrl = url;
      };
      reader.readAsDataURL(file);
    });

    awImgInsertBtn?.addEventListener('click', () => {
      if (state.imgModalTarget === 'brand') {
        if (!state.brandImageDataUrl) {
          alert('请先选择图片。');
          return;
        }
        refreshBrandImgPreview();
        closeImgModal();
        return;
      }
      if (!state.activityImageDataUrl) {
        alert('请先选择图片。');
        return;
      }
      refreshActivityImgPreview();
      closeImgModal();
    });

    refreshActivityImgPreview();
    refreshBrandImgPreview();

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
    syncSuggestUi();

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
      syncSuggestUi();
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
        syncSuggestUi();
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
        syncSuggestUi();
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
        syncSuggestUi();
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
        syncSuggestUi();
      }
    });

    const buildBrandUserInput = (copyTypeText, variantNo) => {
      const rows = [
        ['企业名称', brandCompanyNameEl],
        ['所属行业', brandIndustryEl],
        ['主营产品/服务', brandMainProductsEl],
        ['客户模式', brandCustomerModeEl],
        ['核心能力', brandCoreCapabilityEl],
        ['企业优势', brandEnterpriseAdvantageEl],
        ['服务流程', brandServiceProcessEl],
        ['资质认证', brandCertificationsEl],
        ['成功案例', brandSuccessCasesEl],
        ['目标市场', brandTargetMarketEl],
        ['品牌定位', brandBrandPositioningEl],
        ['禁止出现的内容', brandForbiddenContentEl],
        ['文案类型', { value: copyTypeText }],
      ];
      let out = rows
        .map(([k, el]) => {
          const v = String(el?.value || '').trim();
          return v ? `- ${k}：${v}` : '';
        })
        .filter(Boolean)
        .join('\n');
      if (state.brandImageDataUrl) out = `${out}\n\n- 已插入图片：1张`;
      if (variantNo) {
        out = `${out}\n\n- 版本要求：输出第${variantNo}个版本，与其他版本标题/角度/表达尽量不同，但事实保持一致。`;
      }
      return out.trim();
    };

    const buildBaseTaskPayload = (tab) => {
      const groups = getRuleGroupsForTab(tab);
      const platforms = getCheckedTexts(groups[0] || null);
      const articleType = firstCheckedText(groups[1] || null) || mainArticleTypeByTab(tab);
      const style = firstCheckedText(groups[2] || null);
      const tone = firstCheckedText(groups[3] || null);
      return { platforms, article_type: articleType, style, tone };
    };

    function requestSuggestionsForTab(tab, overrideContents) {
      const baseTask = state.lastTaskByTab?.[tab];
      if (!baseTask) return;
      const items = Array.isArray(overrideContents) ? overrideContents : (Array.isArray(state.articlesByTab?.[tab]) ? state.articlesByTab[tab] : []);
      if (!items.length) return;

      const requestOne = (idx, content) => {
        const reqId = String(Date.now() + (idx || 0));
        state.suggestReqMap[reqId] = { tab, idx: typeof idx === 'number' ? idx : null };
        if (tab !== 'brand') {
          state.suggestReqId = reqId;
          state.suggestTab = tab;
        }
        invokeGeoAction(
          'geoArticleWritingSuggestions',
          { ...baseTask, req_id: reqId, content, ts: Date.now() },
          '优化建议接口尚未就绪，请刷新页面后重试。'
        );
      };

      if (tab === 'brand') {
        state.suggestionsByTab.brand = ['', '', ''];
        if (brandSuggestHints.length) {
          brandSuggestHints.forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            el.textContent = '优化建议生成中...';
          });
        }
        items.slice(0, 3).forEach((it, idx) => {
          const content = String(it?.content || '').trim();
          if (!content) return;
          requestOne(idx, content);
        });
        renderBrandSuggestBoxes();
        return;
      }

      state.suggestionsByTab[tab] = '';
      if (tab === state.activeTab) renderSuggestBox();
      if (suggestHint) suggestHint.textContent = '优化建议生成中...';
      requestOne(null, buildCombinedBody(items));
    }

    function runNextGenerate() {
      if (state.pendingGenerateItem) return;
      const item = Array.isArray(state.generateQueue) && state.generateQueue.length ? state.generateQueue.shift() : null;
      if (!item) {
        state.generating = false;
        const tab = String(state.generateMode || state.activeTab || 'product');
        state.generateMode = '';
        setStartBtnState(tab, false, '开启创作');
        syncSuggestUi();
        requestSuggestionsForTab(tab);
        return;
      }
      state.pendingGenerateItem = item;
      state.generating = true;
      setStartBtnState(state.generateMode || item.tab, true, '生成中...');
      invokeGeoAction('geoArticleGenerate', item.payload, '文章生成接口尚未就绪，请刷新页面后重试。');
    }

    function startRewriteForActiveTab() {
      if (state.generating) return;
      const tab = String(state.activeTab || 'product');
      const baseTask = state.lastTaskByTab?.[tab];
      const baseArticles = Array.isArray(state.articlesByTab?.[tab]) ? state.articlesByTab[tab] : [];
      if (!baseTask || !baseArticles.length) {
        alert('请先点击“开启创作”生成文章后再重新优化。');
        return;
      }
      state.pendingRewrite = null;
      state.rewriteResults = [];
      state.rewriteQueue = baseArticles.map((it, idx) => {
        const reqId = String(Date.now() + idx);
        const title = String(it?.title || `文案${idx + 1}`).trim();
        const content = String(it?.content || '').trim();
        const userInput = String(baseTask.user_input || '').trim();
        const enhancedUserInput = userInput
          ? `${userInput}\n\n- 改稿要求：输出第${idx + 1}个改稿版本，与原文差异明显，但事实保持一致。`
          : `- 改稿要求：输出第${idx + 1}个改稿版本，与原文差异明显，但事实保持一致。`;
        return {
          reqId,
          tab,
          title,
          payload: { ...baseTask, req_id: reqId, content, user_input: enhancedUserInput, ts: Date.now() }
        };
      });
      state.rewriteTab = tab;
      state.generating = true;
      if (copyReoptBtn) copyReoptBtn.disabled = true;
      if (suggestHint) suggestHint.textContent = '重新优化中...';
      runNextRewrite();
    }

    function runNextRewrite() {
      if (state.pendingRewriteItem) return;
      const item = Array.isArray(state.rewriteQueue) && state.rewriteQueue.length ? state.rewriteQueue.shift() : null;
      if (!item) {
        state.generating = false;
        if (copyReoptBtn) copyReoptBtn.disabled = false;
        const tab = String(state.rewriteTab || state.activeTab || 'product');
        const results = Array.isArray(state.rewriteResults) ? state.rewriteResults : [];
        if (results.length) {
          state.pendingRewrite = { tab, contents: results };
          requestSuggestionsForTab(tab, results);
          syncSuggestUi();
          if (tab !== 'brand') openCombinedArticles();
        } else {
          syncSuggestUi();
        }
        return;
      }
      state.pendingRewriteItem = item;
      invokeGeoAction('geoArticleWritingRewrite', item.payload, '重新优化接口尚未就绪，请刷新页面后重试。');
    }

    function runNextSave() {
      if (state.pendingSaveItem) return;
      const item = Array.isArray(state.saveQueue) && state.saveQueue.length ? state.saveQueue.shift() : null;
      if (!item) {
        state.generating = false;
        setStartBtnState(state.activeTab, false, '开启创作');
        syncSuggestUi();
        alert('已写入文章管理。');
        if (state.saveNavAfter) window.navigateTo?.('article-manager');
        state.saveNavAfter = false;
        state.saveMode = '';
        return;
      }
      state.pendingSaveItem = item;
      state.generating = true;
      setStartBtnState(item.tab || state.activeTab, true, '生成中...');
      invokeGeoAction('geoArticleGenerate', item.payload, '文章保存接口尚未就绪，请刷新页面后重试。');
    }

    const startCreateForTab = (tab) => {
      if (state.generating) return;
      tab = String(tab || state.activeTab || 'product');
      const base = buildBaseTaskPayload(tab);

      if (tab === 'product') {
        const ctx = getProductContext();
        if (!ctx.ok) {
          alert(ctx.hint || '请先补齐必要信息后再开启创作。');
          return;
        }
        state.articlesByTab.product = [];
        state.suggestionsByTab.product = '';
        state.pendingRewrite = null;
        const payload = {
          tab,
          lexicon_id: ctx.lexiconId,
          question_text: ctx.questionText,
          user_input: '',
          activity_image: '',
          product: ctx.products[0] || null,
          products: ctx.products,
          images: ctx.images,
          ...base,
          ts: Date.now()
        };
        state.lastTaskByTab.product = { ...payload, content: '', title: '' };
        state.generateMode = tab;
        state.generateQueue = [{ tab, payload }];
        window.geoConsume?.({ event_type: 'ai_generate', page: 'article-writing', action: 'start_create_product', units: 1, amount: 0 });
        runNextGenerate();
        return;
      }

      if (tab === 'brand') {
        const picked = brandCopyTypeRoot?.querySelector?.('input[type="radio"]:checked');
        const copyTypeText = normalizeLabel(picked?.value || '');
        if (!copyTypeText) {
          alert('请先在第二步选择文案类型（单选）。');
          return;
        }
        state.articlesByTab.brand = [];
        state.suggestionsByTab.brand = ['', '', ''];
        state.pendingRewrite = null;
        const basePayload = {
          tab,
          lexicon_id: '',
          question_text: copyTypeText,
          user_input: buildBrandUserInput(copyTypeText, ''),
          activity_image: state.brandImageDataUrl,
          product: null,
          products: [],
          images: [],
          ...base,
          ts: Date.now()
        };
        state.lastTaskByTab.brand = { ...basePayload, content: '', title: '' };
        state.generateMode = tab;
        state.generateQueue = [1, 2, 3].map((n) => ({
          tab,
          payload: { ...basePayload, user_input: buildBrandUserInput(copyTypeText, n), ts: Date.now() + n }
        }));
        window.geoConsume?.({ event_type: 'ai_generate', page: 'article-writing', action: 'start_create_brand_3', units: 3, amount: 0 });
        runNextGenerate();
        return;
      }

      if (tab === 'activity') {
        const desc = String(activityDesc?.value || '').trim() || valueOrPlaceholder(activityDesc);
        if (!desc) {
          alert('请先补充主题活动描述。');
          return;
        }
        state.articlesByTab.activity = [];
        state.suggestionsByTab.activity = '';
        state.pendingRewrite = null;
        const payload = {
          tab,
          lexicon_id: '',
          question_text: '',
          user_input: desc,
          activity_image: state.activityImageDataUrl,
          product: null,
          products: [],
          images: [],
          ...base,
          ts: Date.now()
        };
        state.lastTaskByTab.activity = { ...payload, content: '', title: '' };
        state.generateMode = tab;
        state.generateQueue = [{ tab, payload }];
        window.geoConsume?.({ event_type: 'ai_generate', page: 'article-writing', action: 'start_create_activity', units: 1, amount: 0 });
        runNextGenerate();
      }
    };

    Object.entries(startBtns).forEach(([tab, btn]) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      btn.addEventListener('click', () => startCreateForTab(tab));
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
