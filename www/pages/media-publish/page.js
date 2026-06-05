import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('自媒体发布');

    const table = document.getElementById('pickArticleTable');
    const preview = document.getElementById('articlePreview');
    const searchInput = document.querySelector('.mp-card .toolbar-left .input');
    const filterByDateBtn = document.getElementById('filterByDateBtn');
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

    const state = {
      items: [],
      details: {},
      selectedIds: [],
      previewId: '',
      keyword: '',
      dateStart: '',
      dateEnd: ''
    };

    const platformUrl = {
      douyin: 'https://creator.douyin.com/',
      zhihu: 'https://www.zhihu.com/signin',
      wechat: 'https://mp.weixin.qq.com/',
      xiaohongshu: 'https://creator.xiaohongshu.com/',
      baijiahao: 'https://baijiahao.baidu.com/',
      toutiao: 'https://mp.toutiao.com/',
      bilibili: 'https://member.bilibili.com/',
      csdn: 'https://passport.csdn.net/login'
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

    const render = () => {
      if (!table) return;
      const list = getVisibleItems();
      if (!list.length) {
        table.innerHTML = `<tr><td colspan="4" class="empty">暂无数据</td></tr>`;
        if (preview) preview.textContent = '暂无文章可预览';
        return;
      }
      table.innerHTML = list
        .map((it, idx) => {
          const id = String(it.id || '');
          const checked = state.selectedIds.includes(id) ? 'checked' : '';
          const date = toDate(it.created_at || it.date);
          return `<tr data-id="${it.id}">
            <td>${idx + 1}</td>
            <td class="cell-wrap">${it.title || ''}</td>
            <td>${date}</td>
            <td><input type="checkbox" class="mp-check" ${checked} /></td>
          </tr>`;
        })
        .join('');
    };

    const setPreviewById = (id) => {
      const nextId = String(id || '').trim();
      state.previewId = nextId;
      if (!preview) return;
      if (!nextId) {
        preview.textContent = '请先在上方勾选文章';
        return;
      }
      const detail = state.details[nextId] || null;
      if (!detail) {
        preview.textContent = '加载中...';
        window.geoQueryArticleDetail?.({ id: nextId, ts: Date.now() });
        return;
      }
      const title = String(detail.title || '').trim();
      const createdAt = toDate(detail.created_at || '');
      const content = String(detail.content || '').trim();
      preview.textContent = `${title || '文章'}\n${createdAt ? `生成日期：${createdAt}\n` : ''}\n${content || '（内容为空）'}`;
    };

    table?.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.classList.contains('mp-check')) return;
      const tr = target.closest('tr');
      const id = tr?.getAttribute('data-id');
      const rid = String(id || '').trim();
      if (!rid) return;
      if (target.checked) {
        if (!state.selectedIds.includes(rid)) state.selectedIds.push(rid);
        setPreviewById(rid);
        return;
      }
      state.selectedIds = state.selectedIds.filter((x) => x !== rid);
      if (state.previewId === rid) {
        setPreviewById(state.selectedIds[0] || '');
      }
    });

    filterByDateBtn?.addEventListener('click', () => {
      const start = prompt('请输入开始日期（YYYY-MM-DD），留空表示不限制：', state.dateStart || '');
      if (start === null) return;
      const end = prompt('请输入结束日期（YYYY-MM-DD），留空表示不限制：', state.dateEnd || '');
      if (end === null) return;
      state.dateStart = String(start || '').trim();
      state.dateEnd = String(end || '').trim();
      render();
      const visible = getVisibleItems().map((x) => String(x.id || ''));
      state.selectedIds = state.selectedIds.filter((x) => visible.includes(x));
      if (state.previewId && !state.selectedIds.includes(state.previewId)) {
        setPreviewById(state.selectedIds[0] || '');
      }
    });

    const ensureSelectedText = () => {
      const ids = Array.isArray(state.selectedIds) ? state.selectedIds : [];
      if (!ids.length) return null;
      const missing = ids.find((x) => !state.details[String(x)]);
      if (missing) {
        window.geoQueryArticleDetail?.({ id: missing, ts: Date.now() });
        return null;
      }
      const parts = ids
        .map((id) => state.details[String(id)])
        .filter(Boolean)
        .map((it) => {
          const title = String(it.title || '').trim();
          const content = String(it.content || '').trim();
          return `${title}\n\n${content}`.trim();
        })
        .filter(Boolean);
      return parts.join('\n\n----------------\n\n').trim();
    };

    const openPlatform = (platform) => {
      const url = platformUrl[String(platform || '')] || platformUrl.douyin;
      const w = window.open(url, '_blank');
      return Boolean(w);
    };

    const doPublishToPlatforms = async (platforms) => {
      const text = ensureSelectedText();
      if (!text) {
        alert('请先选择要发布的文章');
        return { copied: false, opened: [] };
      }
      const ok = await copyText(text);
      const ps = Array.isArray(platforms) ? platforms : [platforms];
      const opened = [];
      for (const p of ps) {
        if (openPlatform(p)) opened.push(String(p || '').trim());
      }

      return { copied: ok, opened };
    };

    document.getElementById('publishBtn')?.addEventListener('click', async () => {
      const checkedPlatforms = Array.from(document.querySelectorAll('.mp-platform input[type="checkbox"]:checked'))
        .map((x) => x instanceof HTMLInputElement ? x.value : '')
        .filter(Boolean);
      if (!checkedPlatforms.length) {
        alert('请先选择要发布的平台');
        return;
      }
      const ids = Array.isArray(state.selectedIds) ? state.selectedIds : [];
      if (!ids.length) {
        alert('请先选择要发布的文章');
        return;
      }
      const r = await doPublishToPlatforms(checkedPlatforms);
      const opened = Array.isArray(r?.opened) ? r.opened.filter(Boolean) : [];
      if (opened.length) {
        window.geoRecordPublish?.({ article_ids: ids, platforms: opened });
        window.geoConsume?.({ event_type: 'publish', page: 'media-publish', action: 'publish', units: opened.length, amount: 0 });
      }
      if (!opened.length) {
        alert('平台页面可能被浏览器拦截了弹窗，请允许弹窗后重试。');
        return;
      }
      if (r?.copied) {
        alert('已复制发布内容到剪贴板，请在打开的平台页面粘贴后发布。');
      } else {
        alert('已打开平台登录页，但复制失败，请手动复制内容后粘贴发布。');
      }
    });

    document.querySelector('.mp-platform')?.addEventListener('click', async (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.closest('input[type="checkbox"]')) return;
      const label = t.closest('.mp-item');
      if (!label) return;
      const input = label.querySelector('input[type="checkbox"]');
      const platform = input?.value || '';
      if (!platform) return;
      if (input) input.checked = true;
      const ids = Array.isArray(state.selectedIds) ? state.selectedIds : [];
      if (!ids.length) {
        alert('请先选择要发布的文章');
        return;
      }
      const r = await doPublishToPlatforms([platform]);
      const opened = Array.isArray(r?.opened) ? r.opened.filter(Boolean) : [];
      if (opened.length) {
        window.geoRecordPublish?.({ article_ids: ids, platforms: opened });
        window.geoConsume?.({ event_type: 'publish', page: 'media-publish', action: 'publish', units: opened.length, amount: 0 });
      }
      if (!opened.length) {
        alert('平台页面可能被浏览器拦截了弹窗，请允许弹窗后重试。');
        return;
      }
      if (r?.copied) {
        alert('已复制发布内容到剪贴板，请在打开的平台页面粘贴后发布。');
      } else {
        alert('已打开平台登录页，但复制失败，请手动复制内容后粘贴发布。');
      }
    });

    const requestList = () => {
      window.geoQueryArticles?.({ limit: 200, keyword: state.keyword, ts: Date.now() });
    };

    let searchTimer = null;
    const bindSearch = () => {
      if (!(searchInput instanceof HTMLInputElement)) return;
      searchInput.addEventListener('input', () => {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          state.keyword = String(searchInput.value || '').trim();
          requestList();
        }, 300);
      });
    };

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'geo_articles_data') {
        const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
        state.items = items;
        render();

        const pre = localStorage.getItem('mp_prefill_article_id') || '';
        if (pre) {
          localStorage.removeItem('mp_prefill_article_id');
          const id = String(pre).trim();
          if (id) {
            if (!state.selectedIds.includes(id)) state.selectedIds = [id];
            render();
            setPreviewById(id);
          }
        }
        if (!state.selectedIds.length) setPreviewById('');
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

    Page._handler = onMessage;
    window.addEventListener('message', onMessage);
    Page._cleanup = () => {
      if (Page._handler) window.removeEventListener('message', Page._handler);
      Page._handler = null;
    };

    render();
    bindSearch();
    requestList();
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
