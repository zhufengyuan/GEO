import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('舆情雷达手机版');

    const els = {
      refreshBtn: document.getElementById('refreshBtn'),
      mSearch: document.getElementById('mSearch'),
      mGo: document.getElementById('mGo'),
      mList: document.getElementById('mList')
    };

    const escapeHtml = (s) => {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const GEO_BASE = window.GEO_BASE || '';

    const fetchList = async (kw) => {
      const keyword = (kw || '').trim() || '品牌';
      const params = new URLSearchParams({
        keyword: keyword,
        info_type: 'all',
        sentiment: 'all',
        page: '1',
        page_size: '10'
      });
      const url = `${GEO_BASE}/api/v1/public-opinion/search?${params}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json.success || !json.data) throw new Error(json.error || 'API 返回异常');
      const items = json.data.items || [];
      return items.map((it) => ({
        title: it.title || '',
        desc: it.snippet || '',
        meta: `${it.source || '未知'} · ${it.time || ''}`
      }));
    };

    const render = (list) => {
      if (!els.mList) return;
      els.mList.innerHTML = list
        .map((it) => {
          return `<div class="m-item">
            <div class="m-title">${escapeHtml(it.title)}</div>
            <div class="m-desc">${escapeHtml(it.desc)}</div>
            <div class="m-meta">${escapeHtml(it.meta)}</div>
          </div>`;
        })
        .join('');
    };

    const refresh = async () => {
      const kw = els.mSearch?.value || '';
      els.mList && (els.mList.innerHTML = `<div class="page-muted" style="padding:12px;">正在搜索...</div>`);
      try {
        const list = await fetchList(kw);
        render(list);
      } catch (e) {
        els.mList && (els.mList.innerHTML = `<div class="page-muted" style="padding:12px;">搜索失败: ${escapeHtml(String(e.message || e))}</div>`);
      }
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion-mobile', action: 'refresh', units: 1, amount: 0 });
    };

    els.refreshBtn?.addEventListener('click', refresh);
    els.mGo?.addEventListener('click', refresh);

    document.querySelectorAll('.m-tab').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.m-tab').forEach((x) => x.classList.toggle('active', x === b));
        window.geoConsume?.({ event_type: 'ui', page: 'public-opinion-mobile', action: `tab_${b.getAttribute('data-tab')}`, units: 1, amount: 0 });
      });
    });

    refresh();
  },
  destroy() {
  }
};

export default Page;
