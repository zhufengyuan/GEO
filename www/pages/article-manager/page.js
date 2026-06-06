import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('文章管理');

    const parseDateMs = (v) => {
      if (!v) return 0;
      const s = String(v).trim();
      const ms = Date.parse(s);
      return Number.isFinite(ms) ? ms : 0;
    };

    const state = {
      items: [],
      currentId: null,
      modalMode: '',
      page: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      hasMore: true,
      keyword: ''
    };

    const table = document.getElementById('articleTable');
    const tableWrap = table?.closest?.('.table-wrap') || null;
    const stripTypePrefix = (title) => {
      const s = String(title || '').trim();
      return s
        .replace(/^【\s*(产品宣传|企业品牌|活动关键词)\s*】\s*/g, '')
        .replace(/^(产品宣传|企业品牌|活动关键词)[——\-：]+\s*/g, '');
    };
    const typeByCreation = (creationType) => {
      const t = String(creationType || '').trim();
      if (t === 'product') return '产品宣传';
      if (t === 'brand') return '企业品牌';
      if (t === 'activity') return '活动关键词';
      return '';
    };
    let loadMoreObserver = null;
    const setupLoadMoreObserver = () => {
      if (!tableWrap) return;
      const sentinel = document.getElementById('amLoadMoreRow');
      if (!sentinel) return;
      if (loadMoreObserver) {
        try {
          loadMoreObserver.disconnect();
        } catch {
        }
      }
      try {
        loadMoreObserver = new IntersectionObserver(
          (entries) => {
            const e = entries?.[0];
            if (!e?.isIntersecting) return;
            if (state.loading) return;
            if (!state.hasMore) return;
            state.page += 1;
            requestList({ reset: false });
          },
          { root: tableWrap, threshold: 0.1 }
        );
        loadMoreObserver.observe(sentinel);
      } catch {
      }
    };
    const render = () => {
      if (!table) return;
      const list = Array.isArray(state.items) ? state.items : [];
      list.sort((a, b) => parseDateMs(b.created_at) - parseDateMs(a.created_at));
      if (!list.length && !state.loading) {
        table.innerHTML = `<tr><td colspan="6" class="empty">暂无数据</td></tr>`;
        return;
      }
      if (!list.length && state.loading) {
        table.innerHTML = `<tr><td colspan="6" class="empty">加载中...</td></tr>`;
        return;
      }
      const rows = list
        .map((it, idx) => {
          const defaultType = typeByCreation(it.creation_type);
          const currentType = defaultType || String(it.article_type || '').trim();
          const options = ['产品宣传', '企业品牌', '活动关键词']
            .map((t) => `<option ${t === currentType ? 'selected' : ''}>${t}</option>`)
            .join('');
          const reviewed = Number(it.review_status || 0) === 1;
          const reviewBtn = reviewed
            ? '<button class="op" data-action="review" disabled>已审核</button>'
            : '<button class="op" data-action="review">审核</button>';
          return `<tr data-id="${it.id}">
            <td><input type="checkbox" class="row-check" /></td>
            <td style="text-align:center;">${idx + 1}</td>
            <td><div class="am-title" title="${stripTypePrefix(it.title || '').replaceAll('"', '&quot;')}">${stripTypePrefix(it.title || '')}</div></td>
            <td>${it.created_at || ''}</td>
            <td><select class="select" style="height: 32px;">${options}</select></td>
            <td><div class="am-actions">
              <button class="op" data-action="edit">编辑</button>
              <button class="op op-danger" data-action="delete">删除</button>
              ${reviewBtn}
              <button class="op" data-action="publish">发布</button>
            </div></td>
          </tr>`;
        })
        .join('');
      const loadMoreText = state.loading ? '加载中...' : (state.hasMore ? '继续下滑加载更多' : '没有更多了');
      table.innerHTML = `${rows}<tr id="amLoadMoreRow"><td colspan="6" class="empty">${loadMoreText}</td></tr>`;
      setupLoadMoreObserver();
    };

    render();

    const modal = document.getElementById('articleModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('modalCancel');
    const formatSelect = document.getElementById('formatSelect');
    const output = document.getElementById('articleOutput');
    const copyBtn = document.getElementById('copyBtn');
    const approveBtn = document.getElementById('approveBtn');

    const openModal = () => modal?.classList.add('show');
    const closeModal = () => modal?.classList.remove('show');
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    let currentTitle = '';
    let currentContent = '';

    const asMarkdown = (title, content) => {
      const body = (content || '').trim();
      return `# ${title}\n\n${body || '（内容待生成）'}\n`;
    };

    const asTxt = (title, content) => {
      const body = (content || '').trim();
      return `${title}\n\n${body || '（内容待生成）'}\n`;
    };

    const refreshOutput = () => {
      if (!output) return;
      const fmt = formatSelect?.value || 'markdown';
      output.value = fmt === 'txt' ? asTxt(currentTitle, currentContent) : asMarkdown(currentTitle, currentContent);
    };

    const requestList = ({ reset } = {}) => {
      const isReset = reset === true;
      if (state.loading) return;
      if (!isReset && !state.hasMore) return;
      if (isReset) {
        state.page = 1;
        state.items = [];
        state.total = 0;
        state.hasMore = true;
      }
      state.loading = true;
      render();
      window.geoQueryArticles?.({ page: state.page, page_size: state.pageSize, keyword: state.keyword, ts: Date.now() });
    };

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'geo_articles_data') {
        const payload = d.payload || {};
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const page = Number(payload?.page || 1) || 1;
        const total = Number(payload?.total || 0) || 0;
        state.total = total;
        state.page = page;
        if (page <= 1) {
          state.items = items;
        } else {
          const map = new Map((state.items || []).map((x) => [String(x.id), x]));
          items.forEach((x) => map.set(String(x.id), x));
          state.items = Array.from(map.values());
        }
        state.loading = false;
        state.hasMore = total > 0 ? (state.items || []).length < total : items.length >= state.pageSize;
        render();
        return;
      }
      if (d.type === 'geo_article_detail') {
        const payload = d.payload || {};
        const item = payload.item || null;
        const id = payload.id ?? item?.id;
        if (!id || String(id) !== String(state.currentId || '')) return;
        currentTitle = stripTypePrefix(String(item?.title || '').trim()) || '文章输出';
        currentContent = String(item?.content || '');
        if (modalTitle) modalTitle.textContent = '';
        refreshOutput();
      }
      if (d.type === 'geo_article_review_result') {
        const id = String(d.payload?.id || '').trim();
        if (!id) return;
        const ok = d.payload?.ok === true;
        if (!ok) {
          alert('审核失败，请稍后重试。');
          return;
        }
        state.items = (state.items || []).map((x) => String(x.id) === id ? { ...x, review_status: 1, reviewed_at: new Date().toISOString() } : x);
        render();
        if (approveBtn) approveBtn.style.display = 'none';
        closeModal();
        localStorage.setItem('mp_prefill_article_id', String(id));
        window.navigateTo?.('media-publish');
      }
    };
    Page._handler = onMessage;
    window.addEventListener('message', onMessage);
    Page._cleanup = () => {
      if (Page._handler) window.removeEventListener('message', Page._handler);
      Page._handler = null;
      if (loadMoreObserver) {
        try {
          loadMoreObserver.disconnect();
        } catch {
        }
      }
      loadMoreObserver = null;
    };
    requestList({ reset: true });

    const keywordEl = document.getElementById('keyword');
    keywordEl?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      state.keyword = String(keywordEl.value || '').trim();
      requestList({ reset: true });
    });

    formatSelect?.addEventListener('change', refreshOutput);

    const copyText = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand('copy');
          ta.remove();
          return ok;
        } catch {
          return false;
        }
      }
    };

    copyBtn?.addEventListener('click', async () => {
      const text = output?.value || '';
      const ok = await copyText(text);
      if (!ok) alert('复制失败，请手动全选复制。');
    });

    document.getElementById('filterByDateBtn')?.addEventListener('click', () => {
      alert('按日期筛选：后续接入文章数据后实现。');
    });

    const checkAll = document.getElementById('checkAll');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    checkAll?.addEventListener('change', () => {
      const checked = Boolean(checkAll.checked);
      table?.querySelectorAll('input.row-check').forEach((c) => {
        c.checked = checked;
      });
    });

    bulkDeleteBtn?.addEventListener('click', () => {
      const selected = Array.from(table?.querySelectorAll('input.row-check:checked') || []);
      if (selected.length === 0) {
        alert('请先勾选要删除的文章');
        return;
      }
      const ids = selected.map((c) => c.closest('tr')?.getAttribute('data-id')).filter(Boolean);
      state.items = (state.items || []).filter((x) => !ids.includes(String(x.id)));
      render();
      if (checkAll) checkAll.checked = false;
      window.geoConsume?.({ event_type: 'ui', page: 'article-manager', action: 'bulk_delete', units: selected.length, amount: 0 });
    });

    document.getElementById('articleTable')?.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest('button');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (!action) return;
      const tr = btn.closest('tr');
      const id = tr?.getAttribute('data-id') || '';
      const rowItem = (state.items || []).find((x) => String(x.id) === String(id)) || null;
      if (action === 'edit') {
        state.currentId = id || null;
        state.modalMode = 'edit';
        if (approveBtn) approveBtn.style.display = 'none';
        currentTitle = stripTypePrefix(String(rowItem?.title || '').trim()) || '文章输出';
        currentContent = '加载中...';
        if (modalTitle) modalTitle.textContent = '';
        if (formatSelect) formatSelect.value = 'markdown';
        refreshOutput();
        openModal();
        if (id) window.geoQueryArticleDetail?.({ id, ts: Date.now() });
        window.geoConsume?.({ event_type: 'ui', page: 'article-manager', action: 'open_output', units: 1, amount: 0 });
      }
      if (action === 'review') {
        if (Number(rowItem?.review_status || 0) === 1) return;
        state.currentId = id || null;
        state.modalMode = 'review';
        if (approveBtn) approveBtn.style.display = '';
        currentTitle = stripTypePrefix(String(rowItem?.title || '').trim()) || '文章输出';
        currentContent = '加载中...';
        if (modalTitle) modalTitle.textContent = '';
        if (formatSelect) formatSelect.value = 'markdown';
        refreshOutput();
        openModal();
        if (id) window.geoQueryArticleDetail?.({ id, ts: Date.now() });
        window.geoConsume?.({ event_type: 'ui', page: 'article-manager', action: 'review_open', units: 1, amount: 0 });
      }
      if (action === 'delete') alert('删除：后续接入二次确认与删除接口。');
      if (action === 'publish') {
        if (Number(rowItem?.review_status || 0) !== 1) {
          alert('请先审核通过后再发布。');
          return;
        }
        if (id) localStorage.setItem('mp_prefill_article_id', String(id));
        window.navigateTo?.('media-publish');
      }
    });

    approveBtn?.addEventListener('click', () => {
      if (state.modalMode !== 'review') return;
      const id = String(state.currentId || '').trim();
      if (!id) return;
      window.geoReviewArticle?.({ id, ts: Date.now() });
      window.geoConsume?.({ event_type: 'ui', page: 'article-manager', action: 'review_approve', units: 1, amount: 0 });
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
