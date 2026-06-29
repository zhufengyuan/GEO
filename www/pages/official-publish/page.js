import { initTemplate } from '../_shared/page-template.js';
import { initPublicOpinion } from '../public-opinion/app.js';

const Page = {
  async init() {
    initTemplate('官媒发布');

    const articleTable = document.getElementById('opPickArticleTable');
    const articlePreview = document.getElementById('opArticlePreview');
    const articleKeyword = document.getElementById('opArticleKeyword');
    const filterByDateBtn = document.getElementById('opFilterByDateBtn');
    const publishBtn = document.getElementById('opPublishBtn');
    const selectedMediaHint = document.getElementById('opSelectedMediaHint');

    const cleanups = [];
    const on = (el, evt, fn, options) => {
      if (!el) return;
      el.addEventListener(evt, fn, options);
      cleanups.push(() => el.removeEventListener(evt, fn, options));
    };

    const state = {
      items: [],
      details: {},
      selectedId: '',
      previewId: '',
      selectedMedia: null,
      keyword: '',
      dateStart: '',
      dateEnd: ''
    };

    const toDate = (v) => {
      const s = String(v || '').trim();
      if (!s) return '';
      return s.slice(0, 10);
    };

    const matchDate = (it) => {
      const d = toDate(it?.created_at || it?.date);
      if (!d) return false;
      if (state.dateStart && d < state.dateStart) return false;
      if (state.dateEnd && d > state.dateEnd) return false;
      return true;
    };

    const getVisibleItems = () => {
      const list = Array.isArray(state.items) ? state.items : [];
      if (!state.dateStart && !state.dateEnd) return list;
      return list.filter(matchDate);
    };

    const renderArticles = () => {
      if (!articleTable) return;
      const list = getVisibleItems();
      if (!list.length) {
        articleTable.innerHTML = `<tr><td colspan="4" class="empty">暂无数据</td></tr>`;
        if (articlePreview) articlePreview.textContent = '暂无文章可预览';
        return;
      }
      articleTable.innerHTML = list
        .map((it, idx) => {
          const id = String(it.id || '').trim();
          const checked = state.selectedId === id ? 'checked' : '';
          const date = toDate(it.created_at || it.date);
          const safeTitle = String(it.title || '').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
          return `<tr data-id="${id.replaceAll('"', '&quot;')}">
            <td>${idx + 1}</td>
            <td class="cell-wrap">${safeTitle}</td>
            <td>${date}</td>
            <td><input type="radio" name="opArticlePick" class="op-check" value="${id.replaceAll('"', '&quot;')}" ${checked} /></td>
          </tr>`;
        })
        .join('');
    };

    const setPreviewById = (id) => {
      const nextId = String(id || '').trim();
      state.previewId = nextId;
      if (!articlePreview) return;
      if (!nextId) {
        articlePreview.textContent = '请先在上方选择文章';
        return;
      }
      const detail = state.details[nextId] || null;
      if (!detail) {
        articlePreview.textContent = '加载中...';
        window.geoQueryArticleDetail?.({ id: nextId, ts: Date.now() });
        return;
      }
      const title = String(detail.title || '').trim();
      const createdAt = toDate(detail.created_at || '');
      const content = String(detail.content || '').trim();
      articlePreview.textContent = `${title || '文章'}\n${createdAt ? `生成日期：${createdAt}\n` : ''}\n${content || '（内容为空）'}`;
    };

    const ensureSelected = () => {
      const id = String(state.selectedId || '').trim();
      if (!id) return null;
      const detail = state.details[id] || null;
      if (!detail) {
        window.geoQueryArticleDetail?.({ id, ts: Date.now() });
        return null;
      }
      const title = String(detail.title || '').trim();
      const content = String(detail.content || '').trim();
      return { id, detail, text: `${title}\n\n${content}`.trim() };
    };

    const renderSelectedMedia = () => {
      if (!selectedMediaHint) return;
      const media = state.selectedMedia;
      if (!media) {
        selectedMediaHint.textContent = '请先在上方选择一个官媒';
        return;
      }
      const name = String(media.name || '').trim() || '未命名媒体';
      const platform = String(media.platform || media.region || '').trim();
      const price = String(media.price || '').trim();
      const note = String(media.note || media.rate || media.speed || '').trim();
      const parts = [`已选择官媒：${name}`];
      if (platform) parts.push(`平台/地区：${platform}`);
      if (price) parts.push(`价格：${price}`);
      if (note) parts.push(`说明：${note}`);
      selectedMediaHint.textContent = parts.join('｜');
    };

    const requestList = () => {
      window.geoQueryArticles?.({ limit: 200, keyword: state.keyword, ts: Date.now() });
    };

    on(articleTable, 'change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.classList.contains('op-check')) return;
      const id = String(target.value || '').trim();
      if (!id) return;
      state.selectedId = id;
      setPreviewById(id);
      renderArticles();
    });

    on(filterByDateBtn, 'click', () => {
      const start = prompt('请输入开始日期（YYYY-MM-DD），留空表示不限制：', state.dateStart || '');
      if (start === null) return;
      const end = prompt('请输入结束日期（YYYY-MM-DD），留空表示不限制：', state.dateEnd || '');
      if (end === null) return;
      state.dateStart = String(start || '').trim();
      state.dateEnd = String(end || '').trim();
      renderArticles();
      const visibleIds = getVisibleItems().map((x) => String(x.id || '').trim()).filter(Boolean);
      if (state.selectedId && !visibleIds.includes(state.selectedId)) {
        state.selectedId = '';
        setPreviewById('');
      }
    });

    let searchTimer = null;
    on(articleKeyword, 'input', () => {
      if (!(articleKeyword instanceof HTMLInputElement)) return;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.keyword = String(articleKeyword.value || '').trim();
        requestList();
      }, 300);
    });

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'geo_articles_data') {
        const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
        state.items = items;
        renderArticles();
        const pre = localStorage.getItem('op_prefill_article_id') || '';
        if (pre) {
          localStorage.removeItem('op_prefill_article_id');
          const id = String(pre).trim();
          if (id) {
            state.selectedId = id;
            renderArticles();
            setPreviewById(id);
          }
        }
        if (!state.selectedId) setPreviewById('');
        return;
      }
      if (d.type === 'geo_article_detail') {
        const payload = d.payload || {};
        const item = payload.item || null;
        const id = String(payload.id ?? item?.id ?? '').trim();
        if (!id || !item) return;
        state.details[id] = item;
        if (state.previewId === id) setPreviewById(id);
      }
    };
    window.addEventListener('message', onMessage);
    cleanups.push(() => window.removeEventListener('message', onMessage));

    const els = {
      root: document.getElementById('po2Root'),
      keyword: document.getElementById('po2Keyword'),
      searchBtn: document.getElementById('po2SearchBtn'),
      resetBtn: document.getElementById('po2ResetBtn'),
      crumbResetBtn: document.getElementById('po2CrumbResetBtn'),
      tabAll: document.getElementById('tab-all'),
      tabWebsite: document.getElementById('tab-website'),
      tabMedia: document.getElementById('tab-media'),
      cntAll: document.getElementById('cnt-all'),
      cntWebsite: document.getElementById('cnt-website'),
      cntMedia: document.getElementById('cnt-media'),
      crumbList: document.getElementById('crumb-list'),
      resultInfo: document.getElementById('result-info'),
      list: document.getElementById('media-list'),
      pagination: document.getElementById('pagination')
    };

    const poCleanup = initPublicOpinion(els, {
      dataSource: 'official_media_api',
      renderMode: 'select_table',
      pageSize: 10,
      onSelectItem: (item) => {
        state.selectedMedia = item || null;
        renderSelectedMedia();
      }
    });

    on(publishBtn, 'click', async () => {
      const sel = ensureSelected();
      if (!state.selectedMedia) {
        alert('请先选择要发布的官媒');
        return;
      }
      if (!sel) {
        alert('请先选择要发布的文案（文章）');
        return;
      }

      const platform = String(state.selectedMedia.platform || state.selectedMedia.region || '').trim();
      const mediaName = String(state.selectedMedia.name || '').trim();
      const platformCode = String(platform || mediaName || 'official_media').trim().slice(0, 50);

      const saveResult = await window.geoSaveOfficialPublishDraft?.({
        article_id: sel.id,
        article_title: String(sel.detail?.title || '').trim(),
        content: sel.text,
        platform,
        media_name: mediaName,
        price: String(state.selectedMedia.price || '').trim(),
        note: String(state.selectedMedia.note || state.selectedMedia.rate || state.selectedMedia.speed || '').trim(),
        ts: Date.now()
      });
      if (!saveResult) return;

      const submitResult = await window.geoSubmitOfficialPublish?.({
        article_id: sel.id,
        platform_code: platformCode,
        platform,
        media_name: mediaName,
        copy: sel.text,
        ts: Date.now()
      });
      if (!submitResult) return;

      const savedPath = String(saveResult?.data?.url || saveResult?.data?.path || '').trim();
      alert(savedPath ? `已保存到 upload 文件夹：${savedPath}` : '已保存到后台 upload 文件夹');
      window.geoConsume?.({ event_type: 'publish', page: 'official-publish', action: 'submit', units: 1, amount: 0 });
    });

    if (typeof poCleanup === 'function') cleanups.push(poCleanup);
    Page._cleanup = () => {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
        }
      });
    };

    renderArticles();
    requestList();
    setPreviewById('');
    renderSelectedMedia();
    return;
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
