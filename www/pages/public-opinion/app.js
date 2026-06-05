export function initPublicOpinion(els, options = {}) {
  if (els?.createBtn && els?.taskList && els?.scanBtn && els?.reportBtn && els?.results) {
    const on = (el, evt, fn) => {
      if (!el) return;
      el.addEventListener(evt, fn);
    };

    const escapeHtml = (s) => {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const openModal = (title, html) => {
      if (els.modalTitle) els.modalTitle.textContent = title;
      if (els.modalBody) els.modalBody.innerHTML = html;
      els.modal?.classList.add('show');
    };

    const closeModal = () => {
      els.modal?.classList.remove('show');
    };

    on(els.modalClose, 'click', closeModal);
    on(els.modalCancel, 'click', closeModal);
    on(els.modal, 'click', (e) => {
      if (e.target === els.modal) closeModal();
    });

    const state = {
      tasks: [{ id: `t_${Date.now()}`, keyword: '任务 1', infoType: 'all', sentiment: 'all', freq: 'realtime' }],
      activeTaskId: null,
      resultsByTask: new Map(),
      compareMode: false,
      compareTaskIds: []
    };

    const hash32 = (s) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const makeRand = (seed) => {
      let x = seed >>> 0;
      return () => {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return (x >>> 0) / 4294967296;
      };
    };

    const pick = (r, arr) => {
      return arr[Math.floor(r() * arr.length)];
    };

    const pad2 = (n) => String(n).padStart(2, '0');
    const fmtTime = (d) => {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    };

    const genItems = (task) => {
      const kw = String(task.keyword || '').trim() || '关键词';
      const seed = hash32(`${task.id}_${kw}_${task.infoType}_${task.sentiment}_${task.freq}`);
      const r = makeRand(seed);

      const sources = {
        all: ['今日头条', '微信公众号', '小红书', '知乎', '微博', '百度', '抖音', '快手', 'B站'],
        news: ['今日头条', '百度', '腾讯新闻', '新浪新闻'],
        app: ['今日头条', '知乎', '小红书', '抖音'],
        forum: ['知乎', '微博', '贴吧', '社区论坛']
      };
      const tags = {
        all: ['APP', '公众号', '新闻', '论坛'],
        news: ['新闻'],
        app: ['APP'],
        forum: ['论坛']
      };

      const tone = {
        positive: ['好评', '推荐', '口碑', '认可', '点赞'],
        neutral: ['讨论', '观点', '信息', '对比', '分析'],
        negative: ['投诉', '质疑', '争议', '避雷', '曝光']
      };

      const industries = ['包装', '制造', '环保材料', '物流', '零售', '家居', '食品', '服装'];
      const aspects = ['质量', '交付', '售后', '价格', '合规', '环保', '服务', '体验'];

      const wantSent = task.sentiment || 'all';
      const sentiments = wantSent === 'all' ? ['positive', 'neutral', 'negative'] : [wantSent];

      const count = 6 + Math.floor(r() * 5);
      const list = [];
      for (let i = 0; i < count; i += 1) {
        const sentiment = pick(r, sentiments);
        const tag = pick(r, tags[task.infoType] || tags.all);
        const src = pick(r, sources[task.infoType] || sources.all);
        const heat = 40 + Math.floor(r() * 60) + (sentiment === 'negative' ? 10 : 0);

        const ind = pick(r, industries);
        const asp = pick(r, aspects);
        const keyTone = pick(r, tone[sentiment] || tone.neutral);

        const title = `${keyTone}｜${kw} 在${ind}领域的${asp}表现引发${sentiment === 'neutral' ? '关注' : sentiment === 'positive' ? '热议' : '争议'}`;
        const summary = `围绕“${kw}”的内容在${src}出现多条讨论，重点涉及${asp}、${pick(r, aspects)}与${pick(r, aspects)}等方面。该条为模拟数据，用于展示舆情扫描与分析流程。`;
        const now = new Date();
        now.setMinutes(now.getMinutes() - (i * 37 + Math.floor(r() * 20)));
        const url = `https://example.com/po/${task.id}/${i + 1}`;
        list.push({
          tag,
          title,
          snippet: summary,
          time: fmtTime(now),
          source: src,
          heat,
          sentiment,
          url
        });
      }

      return list.sort((a, b) => b.heat - a.heat);
    };

    const getRadioValue = (name) => {
      const el = document.querySelector(`input[name="${name}"]:checked`);
      return el ? String(el.value) : '';
    };

    const setActiveTask = (id) => {
      state.activeTaskId = id;
      renderTasks();
      renderTabs();
      renderMainTitle();
      renderResults();
    };

    const setCompareMode = (on) => {
      state.compareMode = Boolean(on);
      const wrap = document.querySelector('.po-wrap');
      wrap?.classList.toggle('compact', state.compareMode);
      if (state.compareMode) {
        state.compareTaskIds = state.tasks.slice(0, 3).map((t) => t.id);
      } else {
        state.compareTaskIds = [];
      }
      renderTabs();
      renderMainTitle();
      renderResults();
      if (els.enterBtn) els.enterBtn.textContent = state.compareMode ? '退出' : '进入';
    };

    const renderTasks = () => {
      if (!els.taskList) return;
      if (state.tasks.length === 0) {
        els.taskList.innerHTML = `<div class="page-muted" style="padding:12px;">暂无任务</div>`;
        return;
      }
      els.taskList.innerHTML = state.tasks
        .map((t) => {
          const active = t.id === state.activeTaskId ? 'active' : '';
          return `<div class="po-task ${active}" data-id="${t.id}">
          <div class="po-task-title">${escapeHtml(t.keyword || '任务')}</div>
        </div>`;
        })
        .join('');
    };

    const renderTabs = () => {
      if (!els.tabsBar) return;
      if (state.tasks.length <= 1) {
        els.tabsBar.innerHTML = '';
        return;
      }
      els.tabsBar.innerHTML = state.tasks
        .map((t) => {
          const active = t.id === state.activeTaskId ? 'active' : '';
          return `<button class="po-tab ${active}" data-id="${t.id}" type="button">${escapeHtml(t.keyword || '任务')}</button>`;
        })
        .join('');
    };

    const renderMainTitle = () => {
      if (!els.mainTitle) return;
      const task = state.tasks.find((x) => x.id === state.activeTaskId);
      if (!task) {
        els.mainTitle.textContent = '任务名称';
        return;
      }
      els.mainTitle.textContent = task.keyword || '任务';
    };

    const renderItemsHtml = (items) => {
      return (items || [])
        .map((r) => {
          return `<div class="po-item">
          <div class="po-item-title"><span class="tag">【${escapeHtml(r.tag)}】</span>${escapeHtml(r.title)}</div>
          <div class="po-item-desc">${escapeHtml(r.snippet)}</div>
          <div class="po-item-meta">
            <span>${escapeHtml(r.time)}</span>
            <span>·</span>
            <span>${escapeHtml(r.source)}</span>
            <span>·</span>
            <span>热度 ${Number(r.heat || 0)}</span>
            <span style="margin-left:auto;" class="link" data-action="forward" data-id="${escapeHtml(r.url)}">转发</span>
          </div>
        </div>`;
        })
        .join('');
    };

    const renderResults = () => {
      if (!els.results) return;
      if (!state.activeTaskId) {
        els.results.innerHTML = `<div class="page-muted" style="padding:12px;">请选择左侧任务</div>`;
        return;
      }

      if (state.compareMode) {
        const cols = state.compareTaskIds.slice(0, 3);
        els.results.classList.add('multi');
        els.results.style.setProperty('--po-cols', String(Math.max(1, cols.length)));
        els.results.innerHTML = cols
          .map((id) => {
            const task = state.tasks.find((x) => x.id === id);
            const items = state.resultsByTask.get(id) || [];
            const active = id === state.activeTaskId ? 'active' : '';
            const title = escapeHtml(task?.keyword || '任务');
            const body = items.length ? renderItemsHtml(items) : `<div class="page-muted" style="padding:12px;">点击“扫描”获取结果</div>`;
            return `<div class="po-col ${active}">
              <div class="po-col-head">
                <div class="po-col-title">${title}</div>
              </div>
              <div class="po-col-body">${body}</div>
            </div>`;
          })
          .join('');
        return;
      }

      els.results.classList.remove('multi');
      els.results.style.removeProperty('--po-cols');

      const items = state.resultsByTask.get(state.activeTaskId) || [];
      if (items.length === 0) {
        els.results.innerHTML = `<div class="page-muted" style="padding:12px;">点击“扫描”获取结果</div>`;
        return;
      }
      els.results.innerHTML = renderItemsHtml(items);
    };

    const mockScan = () => {
      const task = state.tasks.find((x) => x.id === state.activeTaskId);
      if (!task) return;
      state.resultsByTask.set(task.id, genItems(task));
      renderResults();
    };

    const showReport = () => {
      const task = state.tasks.find((x) => x.id === state.activeTaskId);
      if (!task) return;
      const sent = { positive: 0, neutral: 0, negative: 0 };
      const bySource = new Map();
      state.results.forEach((r) => {
        const s = r.sentiment || 'neutral';
        if (s in sent) sent[s] += 1;
        const src = r.source || '未知';
        bySource.set(src, (bySource.get(src) || 0) + 1);
      });
      const srcTop = Array.from(bySource.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${escapeHtml(k)}（${v}）`)
        .join('、');
      openModal(
        '分析报告',
        `<div class="card" style="padding:12px;">
        <div class="page-muted">任务</div>
        <div style="font-weight:900;margin-top:6px;">${escapeHtml(task.keyword)}</div>
      </div>
      <div class="card" style="padding:12px;margin-top:10px;">
        <div class="page-muted">结果数（Mock）</div>
        <div style="font-weight:900;margin-top:6px;">${state.results.length}</div>
      </div>
      <div class="card" style="padding:12px;margin-top:10px;">
        <div class="page-muted">情感分布（Mock）</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
          <span class="badge badge-green">正面 ${sent.positive}</span>
          <span class="badge badge-gray">中性 ${sent.neutral}</span>
          <span class="badge badge-red">负面 ${sent.negative}</span>
        </div>
        <div class="page-muted" style="margin-top:8px;">来源 TOP：${srcTop || '—'}</div>
      </div>`
      );
    };

    on(els.createBtn, 'click', () => {
      const keyword = String(els.keyword?.value || '').trim() || `任务 ${state.tasks.length + 1}`;
      const infoType = String(els.infoType?.value || 'all');
      const sentiment = getRadioValue('poSent') || 'all';
      const freq = getRadioValue('poFreq') || 'realtime';
      const id = `t_${Date.now()}`;
      state.tasks.unshift({ id, keyword, infoType, sentiment, freq });
      if (state.compareMode) state.compareTaskIds = state.tasks.slice(0, 3).map((t) => t.id);
      setActiveTask(id);
      renderResults();
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion', action: 'create_task', units: 1, amount: 0 });
    });

    on(els.taskList, 'click', (e) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      const id = target.closest('[data-id]')?.getAttribute('data-id');
      if (!id) return;
      setActiveTask(id);
      renderResults();
    });

    on(els.tools, 'click', (e) => {
      const btn = e.target instanceof HTMLElement ? e.target.closest('button.po-tool') : null;
      const tool = btn?.getAttribute('data-tool');
      if (!tool) return;
      els.tools?.querySelectorAll('button.po-tool').forEach((b) => b.classList.toggle('active', b === btn));
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion', action: `tool_${tool}`, units: 1, amount: 0 });
    });

    on(els.enterBtn, 'click', () => {
      if (state.tasks.length <= 1) return;
      setCompareMode(!state.compareMode);
    });

    on(els.scanBtn, 'click', () => {
      mockScan();
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion', action: 'scan', units: 1, amount: 0 });
    });

    on(els.reportBtn, 'click', () => {
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion', action: 'report_page', units: 1, amount: 0 });
      window.navigateTo?.('public-opinion-report');
    });

    on(els.results, 'click', (e) => {
      const btn = e.target instanceof HTMLElement ? e.target.closest('[data-action]') : null;
      const action = btn?.getAttribute('data-action');
      if (action === 'forward') {
        window.geoConsume?.({ event_type: 'ui', page: 'public-opinion', action: 'forward', units: 1, amount: 0 });
        alert('转发：后续接入分享/转发能力。');
      }
    });

    on(els.tabsBar, 'click', (e) => {
      const btn = e.target instanceof HTMLElement ? e.target.closest('button.po-tab[data-id]') : null;
      const id = btn?.getAttribute('data-id');
      if (!id) return;
      setActiveTask(id);
    });

    setActiveTask(state.tasks[0]?.id || null);
    renderTasks();
    renderTabs();
    renderMainTitle();
    renderResults();
    setCompareMode(false);

    return () => {
      closeModal();
    };
  }

  const cleanups = [];

  const on = (el, evt, fn, options) => {
    if (!el) return;
    el.addEventListener(evt, fn, options);
    cleanups.push(() => el.removeEventListener(evt, fn, options));
  };

  const escapeHtml = (s) => {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };

  const toText = (v) => String(v ?? '').trim();

  const FILTERS = {
    platform: ['不限', '今日头条', '百家号', '新浪', '网易', '腾讯', '凤凰', '快传号', '知乎', '搜狐', '一点资讯', '哔哩哔哩', '东方财富', '同花顺', '豆瓣', '雪球', 'UC', '汽车之家', '懂车帝', '太平洋汽车', '汽车头条', '易车号', '爱卡汽车', '网上车市', '搜狐头条', '其他'],
    industry: ['不限', '文化', '历史', '健康', '财经', '科技', 'IT科技', '体育', '汽车', '娱乐', '时尚', '三农', '教育', '母婴', '美食', '旅游', '公益', '游戏动漫', '社会', '房产', '新闻', '生活', '财经金融', '新闻资讯', '生活消费', '女性时尚', '健康医疗', '电商', '热门'],
    region: ['综合全国', '全国', '北京', '上海', '重庆', '天津', '海南', '广东', '广西', '湖南', '湖北', '福建', '江西', '浙江', '安徽', '江苏', '河南', '河北', '山西', '山东', '贵州', '四川', '青海', '西藏', '云南', '辽宁', '吉林', '黑龙江', '内蒙古', '宁夏', '新疆', '甘肃', '陕西', '台湾', '香港', '澳门', '海外资源'],
    fans: ['不限', '0-1000', '1001-5000', '5001-1万', '1万-5万', '5万-10万', '10万-100万', '100万以上'],
    cert: ['不限', '红V认证', '蓝V认证', '黄V认证', '未认证/其他'],
    extra: ['不限', '周末', '节假日', '秒出', 'GEO', '视频']
  };

  const filters = { platform: '', industry: '', region: '', fans: '', cert: '', mtype: '', extra: '' };
  const crumbHistory = [];
  let keyword = '';
  let currentTab = 'all';
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let allData = [];
  let filteredData = [];
  let isLoading = false;

  const loadXlsxLib = async () => {
    if (window.XLSX) return true;
    const loadScript = (src) => {
      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
      });
    };
    const okLocal = await loadScript('vendor/xlsx.full.min.js');
    if (okLocal && window.XLSX) return true;
    const okCdn = await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    return Boolean(okCdn && window.XLSX);
  };

  const normalizeSheetType = (name) => {
    const s = String(name || '').toLowerCase();
    if (s.includes('自媒体') || s.includes('官媒') || s.includes('官方')) return '官方自媒体';
    if (s.includes('全国') || s.includes('网站')) return '全国网站媒体';
    return '未知';
  };

  const normalizeRowType = (v) => {
    const s = String(v || '').toLowerCase();
    if (!s) return '';
    if (s.includes('自媒体') || s.includes('官媒') || s.includes('官方')) return '官方自媒体';
    if (s.includes('全国') || s.includes('网站')) return '全国网站媒体';
    return '';
  };

  const getValueByPatterns = (row, patterns) => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row).filter((k) => k && !String(k).startsWith('__'));
    for (const p of patterns || []) {
      const hit = keys.find((k) => String(k).includes(p));
      if (!hit) continue;
      const v = toText(row[hit]);
      if (v) return v;
    }
    return '';
  };

  const extractRowMeta = (row) => {
    const type = row.__type || '未知';
    const common = {
      name: getValueByPatterns(row, ['媒体名称', '账号名称', '媒体', '账号', '名称', '平台名称']),
      platform: getValueByPatterns(row, ['平台', '渠道', '站点']),
      industry: getValueByPatterns(row, ['行业', '领域']),
      region: getValueByPatterns(row, ['所在地区', '地区', '地域', '省', '市']),
      fans: getValueByPatterns(row, ['粉丝量', '粉丝数', '粉丝']),
      verify: getValueByPatterns(row, ['账号认证', '认证']),
      price: getValueByPatterns(row, ['报价', '价格', '费用', '单价', '刊例', '报价（元）', '报价(元)']),
      url: getValueByPatterns(row, ['链接', '网址', 'URL', 'url'])
    };

    row.__name = row.__name || common.name || '';
    row.__platform = row.__platform || common.platform || '';
    row.__industry = row.__industry || common.industry || '';
    row.__region = row.__region || common.region || '';
    row.__fans = row.__fans || common.fans || '';
    row.__verify = row.__verify || common.verify || '';
    row.__price = row.__price || common.price || '';
    row.__url = row.__url || common.url || '';

    if (type === '全国网站媒体') {
      row.__rate = row.__rate || getValueByPatterns(row, ['收录率', '收录', '收录情况']) || '';
      row.__speed = row.__speed || getValueByPatterns(row, ['出稿时效', '出稿时间', '出稿', '时效', '时长']) || '';
      row.__remark = row.__remark || getValueByPatterns(row, ['备注', '说明', '要求', '注意']) || '';
    } else if (type === '官方自媒体') {
      row.__rate = '';
      row.__speed = row.__speed || getValueByPatterns(row, ['出稿时效', '出稿时间', '出稿', '时效', '时长']) || '';
      row.__remark = row.__remark || getValueByPatterns(row, ['备注', '说明', '要求', '注意']) || '';
    } else {
      row.__rate = row.__rate || '';
      row.__speed = row.__speed || '';
      row.__remark = row.__remark || '';
    }
  };

  const inferType = (row, sheetType) => {
    if (sheetType === '全国网站媒体') return 'website';
    if (sheetType === '官方自媒体') return 'media';
    const hasFans = Boolean(toText(row.__fans));
    const hasPlatform = Boolean(toText(row.__platform));
    if (hasFans || hasPlatform) return 'media';
    return 'website';
  };

  const parseWorkbook = (wb) => {
    if (!wb || !wb.SheetNames) return [];
    const out = [];
    wb.SheetNames.forEach((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;
      const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      const sheetType = normalizeSheetType(sheetName);
      rows.forEach((row) => {
        const rowType = normalizeRowType(getValueByPatterns(row, ['媒体类型', '媒体形式', '媒体属性', '类型']));
        const typeName = rowType || sheetType || '未知';
        row.__sheet = sheetName;
        row.__type = typeName;
        extractRowMeta(row);
        const t = inferType(row, typeName);
        out.push({
          type: t,
          name: toText(row.__name),
          platform: toText(row.__platform),
          industry: toText(row.__industry),
          region: toText(row.__region),
          fans: toText(row.__fans),
          cert: toText(row.__verify),
          price: toText(row.__price),
          url: toText(row.__url),
          note: toText(row.__remark),
          speed: toText(row.__speed),
          rate: toText(row.__rate)
        });
      });
    });
    return out.filter((x) => x.name || x.platform || x.price || x.note);
  };

  const normalizeApiRows = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    const out = [];
    list.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const typeName = String(row.__type || '未知').trim() || '未知';
      extractRowMeta(row);
      const t = inferType(row, typeName);
      out.push({
        type: t,
        name: toText(row.__name),
        platform: toText(row.__platform),
        industry: toText(row.__industry),
        region: toText(row.__region),
        fans: toText(row.__fans),
        cert: toText(row.__verify),
        price: toText(row.__price),
        url: toText(row.__url),
        note: toText(row.__remark),
        speed: toText(row.__speed),
        rate: toText(row.__rate)
      });
    });
    return out.filter((x) => x.name || x.platform || x.price || x.note);
  };

  const setLoading = (v) => {
    isLoading = v;
    if (!els.list) return;
    if (v) {
      const ds = String(options?.dataSource || '').trim();
      const tip = ds === 'official_media_api' ? '数据加载中（官方媒体接口）…' : '数据加载中，请稍候…';
      els.list.innerHTML = `<div class="loading-tip">${tip}</div>`;
      if (els.pagination) els.pagination.innerHTML = '';
    }
  };

  const renderCrumb = () => {
    if (!els.crumbList) return;
    if (crumbHistory.length === 0) {
      els.crumbList.innerHTML = '<span class="crumb-empty" id="crumb-empty">暂未选择筛选条件</span>';
      return;
    }
    let html = '';
    crumbHistory.forEach((c, i) => {
      if (i > 0) html += '<span class="crumb-sep">›</span>';
      html += `<span class="crumb-item">${escapeHtml(c.display)}</span>`;
    });
    els.crumbList.innerHTML = html;
  };

  const updateTabCounts = (base = allData) => {
    const data = Array.isArray(base) ? base : allData;
    if (els.cntAll) els.cntAll.textContent = `(${data.length.toLocaleString()})`;
    if (els.cntWebsite) els.cntWebsite.textContent = `(${data.filter((d) => d.type === 'website').length.toLocaleString()})`;
    if (els.cntMedia) els.cntMedia.textContent = `(${data.filter((d) => d.type === 'media').length.toLocaleString()})`;
  };

  const renderPagination = (total, totalPages) => {
    if (!els.pagination) return;
    if (total <= 0) {
      els.pagination.innerHTML = '';
      return;
    }
    const makeBtn = (label, page, disabled, onState) => {
      const cls = `pg-btn${onState ? ' on' : ''}`;
      return `<button class="${cls}" data-page="${page}" ${disabled ? 'disabled' : ''} type="button">${label}</button>`;
    };

    const parts = [];
    parts.push(makeBtn('«', 1, currentPage === 1, false));
    parts.push(makeBtn('‹', Math.max(1, currentPage - 1), currentPage === 1, false));

    const maxButtons = 7;
    let start = Math.max(1, currentPage - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);

    if (start > 1) {
      parts.push(makeBtn('1', 1, false, currentPage === 1));
      if (start > 2) parts.push('<span class="pg-ellip">…</span>');
    }

    for (let p = start; p <= end; p += 1) {
      parts.push(makeBtn(String(p), p, false, p === currentPage));
    }

    if (end < totalPages) {
      if (end < totalPages - 1) parts.push('<span class="pg-ellip">…</span>');
      parts.push(makeBtn(String(totalPages), totalPages, false, currentPage === totalPages));
    }

    parts.push(makeBtn('›', Math.min(totalPages, currentPage + 1), currentPage === totalPages, false));
    parts.push(makeBtn('»', totalPages, currentPage === totalPages, false));
    parts.push(`<span class="pg-info">共 ${total.toLocaleString()} 条</span>`);
    parts.push(`<span class="pg-jump">跳转到 <input id="po2Jump" value="${currentPage}" /> <button id="po2JumpBtn" type="button">Go</button></span>`);
    els.pagination.innerHTML = parts.join('');
  };

  const renderList = () => {
    if (!els.list || !els.resultInfo) return;
    if (isLoading) return;

    const actionMode = String(options?.actionMode || '').trim() === 'publish' ? 'publish' : 'copy';
    const actionLabel = actionMode === 'publish' ? '去发布' : '复制';

    const total = filteredData.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = filteredData.slice(start, start + PAGE_SIZE);

    els.resultInfo.innerHTML = `共 <b>${total.toLocaleString()}</b> 条结果，第 ${currentPage} / ${Math.max(1, totalPages)} 页`;

    if (total === 0) {
      els.list.innerHTML = '<div class="empty-state">暂无匹配结果</div>';
      if (els.pagination) els.pagination.innerHTML = '';
      return;
    }

    const html = pageData
      .map((d) => {
        const certCls = d.cert.includes('红') ? 'cert-red' : d.cert.includes('蓝') ? 'cert-blue' : d.cert.includes('黄') ? 'cert-yellow' : '';
        const tags = [];
        if (d.type === 'media' && d.fans) tags.push(`<span class="c-tag">${escapeHtml(d.fans)}</span>`);
        if (d.cert) tags.push(`<span class="c-tag ${certCls}">${escapeHtml(d.cert)}</span>`);
        if (d.rate) tags.push(`<span class="c-tag">${escapeHtml(d.rate)}</span>`);
        if (d.speed) tags.push(`<span class="c-tag">${escapeHtml(d.speed)}</span>`);
        if (d.note) {
          ['周末', '节假日', '秒出', 'GEO', '视频'].forEach((k) => {
            if (d.note.includes(k)) tags.push(`<span class="c-tag">${escapeHtml(k)}</span>`);
          });
        }
        const meta1Label = d.type === 'media' ? '平台' : '地区';
        const meta1Value = d.type === 'media' ? (d.platform || '—') : (d.region || '—');
        const meta2Label = d.type === 'media' ? '行业' : '频道';
        const meta2Value = d.industry || '—';
        const meta3Label = d.type === 'media' ? '粉丝' : '收录';
        const meta3Value = d.type === 'media' ? (d.fans || '—') : (d.rate || '—');

        const price = d.price ? escapeHtml(d.price) : '—';
        const link = d.url ? `<a class="case-btn" href="${escapeHtml(d.url)}" target="_blank" rel="noopener">链接</a>` : '';
        const badgeCls = d.type === 'media' ? 'name-badge media-badge' : 'name-badge';
        const actionData = actionMode === 'publish'
          ? `data-platform="${escapeHtml(d.platform)}" data-media="${escapeHtml(d.name)}" data-mtype="${escapeHtml(d.type)}"`
          : `data-copy="${escapeHtml(d.name)}"`;
        return `<div class="media-card">
          <div class="card-main">
            <div class="col-name">
              <span class="${badgeCls}">${escapeHtml(d.name || '—')}</span>
              ${link}
            </div>
            <div class="col-meta">
              <div class="meta-item">
                <div class="meta-label">${meta1Label}</div>
                <div class="meta-value">${escapeHtml(meta1Value)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">${meta2Label}</div>
                <div class="meta-value">${escapeHtml(meta2Value)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">${meta3Label}</div>
                <div class="meta-value">${escapeHtml(meta3Value)}</div>
              </div>
            </div>
            <div class="col-price"><span class="price-box">${price}</span></div>
            <div class="col-action"><button class="btn-post" data-action="${actionMode}" ${actionData} type="button">${actionLabel}</button></div>
          </div>
          <div class="card-foot">
            <div class="card-tags-row">${tags.join('')}</div>
            <div class="card-note">${escapeHtml(d.note || '')}</div>
          </div>
        </div>`;
      })
      .join('');

    els.list.innerHTML = html;
    renderPagination(total, Math.max(1, totalPages));
  };

  const applyFilter = () => {
    let base = allData;
    if (filters.platform) {
      base = base.filter((d) => d.type === 'media' && (d.platform || '').includes(filters.platform));
    }
    if (filters.industry) {
      base = base.filter((d) => (d.industry || '').includes(filters.industry));
    }
    if (filters.region) {
      base = base.filter((d) => d.type !== 'website' || (d.region || '').includes(filters.region));
    }
    if (filters.fans) {
      base = base.filter((d) => d.type !== 'media' || (d.fans || '') === filters.fans);
    }
    if (filters.cert) {
      base = base.filter((d) => d.type !== 'media' || (d.cert || '') === filters.cert);
    }
    if (filters.mtype) {
      base = base.filter((d) => d.type === filters.mtype);
    }
    if (filters.extra) {
      base = base.filter((d) => (d.note || '').includes(filters.extra) || (d.speed || '').includes(filters.extra));
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      base = base.filter((d) => {
        const name = (d.name || '').toLowerCase();
        const note = (d.note || '').toLowerCase();
        const portal = (d.platform || '').toLowerCase();
        const ind = (d.industry || '').toLowerCase();
        return name.includes(kw) || note.includes(kw) || portal.includes(kw) || ind.includes(kw);
      });
    }

    updateTabCounts(base);

    let data = base;
    if (currentTab === 'website') data = data.filter((d) => d.type === 'website');
    if (currentTab === 'media') data = data.filter((d) => d.type === 'media');

    filteredData = data;
    renderList();
  };

  const selectTag = (area, tag) => {
    const key = area.dataset.key;
    const groupLabel = area.dataset.label;
    const val = tag.dataset.val || '';
    const display = (tag.textContent || '').trim();

    area.querySelectorAll('.tag').forEach((t) => t.classList.remove('active'));
    tag.classList.add('active');
    filters[key] = val;

    if (val === '') {
      const idx = crumbHistory.findIndex((c) => c.key === key);
      if (idx >= 0) crumbHistory.splice(idx, 1);
    } else {
      const existing = crumbHistory.find((c) => c.key === key);
      if (existing) {
        existing.val = val;
        existing.display = display;
      } else {
        crumbHistory.push({ key, label: groupLabel, val, display });
      }
    }
    renderCrumb();
    doSearch();
  };

  const renderFilterTags = () => {
    const build = (box, items, map) => {
      box.innerHTML = items
        .map((it, idx) => {
          const { label, value } = map(it, idx);
          const cls = idx === 0 ? 'tag def' : 'tag nor';
          return `<span class="${cls}" data-val="${escapeHtml(value)}">${escapeHtml(label)}</span>`;
        })
        .join('');
      box.querySelector('.tag.def')?.classList.add('active');
      box.querySelectorAll('.tag').forEach((t) => {
        on(t, 'click', () => selectTag(box, t));
      });
    };

    const p = document.getElementById('f-platform');
    if (p) build(p, FILTERS.platform, (v, i) => ({ label: v, value: i === 0 ? '' : v }));

    const ind = document.getElementById('f-industry');
    if (ind) build(ind, FILTERS.industry, (v, i) => ({ label: v, value: i === 0 ? '' : v }));

    const r = document.getElementById('f-region');
    if (r) build(r, FILTERS.region, (v, i) => ({ label: v, value: i === 0 ? '' : v }));

    const f = document.getElementById('f-fans');
    if (f) build(f, FILTERS.fans, (v, i) => ({ label: v, value: i === 0 ? '' : v }));

    const c = document.getElementById('f-cert');
    if (c) build(c, FILTERS.cert, (v, i) => ({ label: v, value: i === 0 ? '' : v }));

    const mt = document.getElementById('f-mtype');
    if (mt) {
      build(
        mt,
        ['不限', '全国网站媒体', '官方自媒体'],
        (v, i) => ({ label: v, value: i === 0 ? '' : i === 1 ? 'website' : 'media' })
      );
    }

    const ex = document.getElementById('f-extra');
    if (ex) build(ex, FILTERS.extra, (v, i) => ({ label: v, value: i === 0 ? '' : v }));
  };

  const doSearch = () => {
    keyword = toText(els.keyword?.value || '');
    currentPage = 1;
    applyFilter();
  };

  const doReset = () => {
    Object.keys(filters).forEach((k) => (filters[k] = ''));
    keyword = '';
    if (els.keyword) els.keyword.value = '';
    crumbHistory.length = 0;
    renderCrumb();
    document.querySelectorAll('.filter-panel .tags').forEach((area) => {
      area.querySelectorAll('.tag').forEach((t) => t.classList.remove('active'));
      area.querySelector('.tag.def')?.classList.add('active');
    });
    currentPage = 1;
    applyFilter();
  };

  const switchTab = (tab) => {
    currentTab = tab;
    currentPage = 1;
    [els.tabAll, els.tabWebsite, els.tabMedia].forEach((t) => t?.classList.remove('active'));
    if (tab === 'all') els.tabAll?.classList.add('active');
    if (tab === 'website') els.tabWebsite?.classList.add('active');
    if (tab === 'media') els.tabMedia?.classList.add('active');
    applyFilter();
  };

  on(els.searchBtn, 'click', doSearch);
  on(els.resetBtn, 'click', doReset);
  on(els.crumbResetBtn, 'click', doReset);
  on(els.keyword, 'keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  on(els.tabAll, 'click', () => switchTab('all'));
  on(els.tabWebsite, 'click', () => switchTab('website'));
  on(els.tabMedia, 'click', () => switchTab('media'));

  on(els.pagination, 'click', (e) => {
    const target = e.target instanceof HTMLElement ? e.target : null;
    const btn = target?.closest('button.pg-btn[data-page]');
    if (!btn) return;
    const p = parseInt(btn.getAttribute('data-page') || '1', 10);
    if (!Number.isFinite(p) || p <= 0) return;
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    currentPage = Math.max(1, Math.min(totalPages, p));
    renderList();
  });

  on(els.pagination, 'click', (e) => {
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (target?.id !== 'po2JumpBtn') return;
    const input = document.getElementById('po2Jump');
    const val = parseInt(input?.value || '1', 10);
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    currentPage = Math.max(1, Math.min(totalPages, Number.isFinite(val) ? val : 1));
    renderList();
  });

  on(els.list, 'click', async (e) => {
    const target = e.target instanceof HTMLElement ? e.target : null;
    const btn = target?.closest('button.btn-post[data-action]');
    const action = String(btn?.getAttribute('data-action') || '').trim();
    if (!btn || !action) return;
    if (action === 'publish') {
      const platform = btn.getAttribute('data-platform') || '';
      const media = btn.getAttribute('data-media') || '';
      const mtype = btn.getAttribute('data-mtype') || '';
      const fn = options?.onPublish;
      if (typeof fn !== 'function') return;
      await fn({ platform, media, mtype });
      return;
    }
    if (action !== 'copy') return;
    const text = btn.getAttribute('data-copy') || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    alert('已复制');
  });

  const applyPublicOpinionConfig = (cfg) => {
    if (!cfg || typeof cfg !== 'object') return;
    window.__geoPublicOpinionConfig = cfg;
    try {
      localStorage.setItem('geo_public_opinion_config_v1', JSON.stringify(cfg));
    } catch {
    }
  };

  const restorePublicOpinionConfig = () => {
    const pre = window.__geoPublicOpinionConfig;
    if (pre && typeof pre === 'object') return pre;
    try {
      const raw = localStorage.getItem('geo_public_opinion_config_v1');
      if (!raw) return null;
      const cfg = JSON.parse(raw);
      if (cfg && typeof cfg === 'object') {
        window.__geoPublicOpinionConfig = cfg;
        return cfg;
      }
    } catch {
    }
    return null;
  };

  const requestPublicOpinionConfigFromR = () => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'geo_request_public_opinion_config' }, '*');
      }
    } catch {
    }
  };

  const loadDefaultExcel = async () => {
    const cfg = restorePublicOpinionConfig();
    const key = toText(cfg?.default_excel || cfg?.defaultExcel || cfg?.excel || cfg?.url || cfg?.path);
    if (!key) {
      requestPublicOpinionConfigFromR();
      if (els.list) els.list.innerHTML = '<div class="empty-state">未找到默认Excel，请点击“导入Excel”</div>';
      return;
    }

    const ok = await loadXlsxLib();
    if (!ok) {
      if (els.list) els.list.innerHTML = '<div class="empty-state">Excel解析库加载失败，请点击“导入Excel”</div>';
      return;
    }

    setLoading(true);
    try {
      const url = new URL(`../../${key}`, import.meta.url).toString();
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const buf = await res.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: 'array' });
      allData = parseWorkbook(wb);
      updateTabCounts();
      renderCrumb();
      applyFilter();
    } catch {
      if (els.list) els.list.innerHTML = '<div class="empty-state">默认Excel读取失败，请点击“导入Excel”</div>';
    } finally {
      setLoading(false);
    }
  };

  let loadedFromApi = false;
  on(window, 'message', (event) => {
    const d = event?.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'geo_official_media_data') {
      const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
      allData = normalizeApiRows(items);
      loadedFromApi = true;
      updateTabCounts();
      renderCrumb();
      applyFilter();
      setLoading(false);
      return;
    }
    if (String(options?.dataSource || '').trim() === 'official_media_api' && d.type === 'geo_public_opinion_config') {
      return;
    }
    if (d.type !== 'geo_public_opinion_config') return;
    const payload = d.payload || {};
    applyPublicOpinionConfig(payload);
    if (!allData.length) loadDefaultExcel();
  });

  let fileInput = null;
  on(els.importBtn, 'click', () => {
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.xls,.xlsx';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      cleanups.push(() => fileInput?.remove());
      on(fileInput, 'change', async () => {
        const f = fileInput.files?.[0];
        if (!f) return;
        setLoading(true);
        try {
          const ok = await loadXlsxLib();
          if (!ok) {
            alert('Excel解析库加载失败');
            return;
          }
          const buf = await f.arrayBuffer();
          const wb = window.XLSX.read(buf, { type: 'array' });
          allData = parseWorkbook(wb);
          updateTabCounts();
          renderCrumb();
          applyFilter();
        } catch {
          alert('Excel解析失败');
        } finally {
          setLoading(false);
        }
      });
    }
    fileInput.value = '';
    fileInput.click();
  });

  renderFilterTags();
  renderCrumb();
  updateTabCounts();
  const dataSource = String(options?.dataSource || '').trim();
  if (dataSource === 'official_media_api') {
    setLoading(true);
    const queryFn = window.geoQueryOfficialMedia;
    let timeout = null;
    timeout = setTimeout(() => {
      if (loadedFromApi || allData.length) return;
      setLoading(false);
      if (els.list) els.list.innerHTML = '<div class="empty-state">官方媒体数据请求超时，请刷新页面重试。</div>';
    }, 6000);
    cleanups.push(() => timeout && clearTimeout(timeout));

    const inferApiBase = () => {
      try {
        const saved = String(localStorage.getItem('geo_api_base_url_v1') || '').trim().replace(/\/+$/g, '');
        if (saved) return saved;
      } catch {
      }
      try {
        const loc = window.location;
        if (loc && String(loc.protocol || '').startsWith('http')) {
          const host = String(loc.hostname || '').trim();
          const port = String(loc.port || '').trim();
          const isLocal = host === '127.0.0.1' || host === 'localhost';
          if (isLocal && port && port !== '8000') return `http://${host}:8000/api/v1`;
          return `${loc.origin}/api/v1`;
        }
      } catch {
      }
      return 'http://127.0.0.1:8000/api/v1';
    };

    const loadFromApi = async () => {
      const base = inferApiBase();
      const url = `${base}/official-media?page=1&page_size=50000`;
      if (els.resultInfo) {
        els.resultInfo.innerHTML = `<span class="page-muted">数据源：</span><b>${escapeHtml(url)}</b>`;
      }
      try {
        const res = await fetch(url, { credentials: 'omit', cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!json || typeof json !== 'object' || json.success !== true || !json.data) {
          throw new Error(json?.error?.message || `请求失败（${res.status || 0}）`);
        }
        const items = Array.isArray(json.data.items) ? json.data.items : [];
        allData = normalizeApiRows(items);
        loadedFromApi = true;
        updateTabCounts();
        renderCrumb();
        applyFilter();
        setLoading(false);
      } catch (e) {
        if (loadedFromApi || allData.length) return;
        setLoading(false);
        const msg = String(e?.message || e || '请求失败');
        if (els.list) {
          els.list.innerHTML = `<div class="empty-state">自动加载失败：${escapeHtml(msg)}<div class="page-muted" style="margin-top:8px;">请点击“导入Excel”手动导入。</div></div>`;
        }
      }
    };

    if (typeof queryFn === 'function') {
      queryFn({ page: 1, page_size: 50000, ts: Date.now() });
    }
    loadFromApi();
  } else {
    requestPublicOpinionConfigFromR();
    loadDefaultExcel();
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
      }
    });
  };
}
