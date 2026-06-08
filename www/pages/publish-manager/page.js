import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('发布管理');

    const recordsTable = document.getElementById('publishTable');
    const recordsKeyword = document.getElementById('pmKeyword');
    const recordsFilterBtn = document.getElementById('filterByPublishDateBtn');
    const recordsView = document.getElementById('pmRecordsView');

    const articlesTable = document.getElementById('pmArticleTable');
    const articlesKeyword = document.getElementById('pmArticleKeyword');
    const articlesFilterBtn = document.getElementById('filterByArticleDateBtn');
    const articlesView = document.getElementById('pmArticlesView');

    const tabs = Array.from(document.querySelectorAll('.pm-tab[data-tab]'));

    const cleanups = [];
    const on = (el, evt, fn, options) => {
      if (!el) return;
      el.addEventListener(evt, fn, options);
      cleanups.push(() => el.removeEventListener(evt, fn, options));
    };

    const state = {
      view: 'records',
      records: {
        items: [],
        keyword: '',
        start: '',
        end: ''
      },
      articles: {
        items: [],
        keyword: '',
        start: '',
        end: '',
        publishByArticleId: {}
      }
    };

    const toDate = (v) => {
      const s = String(v || '').trim();
      return s ? s.slice(0, 10) : '';
    };

    const stripTypePrefix = (title) => {
      const s = String(title || '').trim();
      return s
        .replace(/^【\s*(产品宣传|企业品牌|主题活动创作)\s*】\s*/g, '')
        .replace(/^(产品宣传|企业品牌|主题活动创作)[——\-：]+\s*/g, '');
    };

    const normalizeUrl = (u) => {
      const s = String(u || '').trim();
      if (!s) return '';
      if (/^https?:\/\//i.test(s)) return s;
      return `https://${s}`;
    };

    const platformHomeUrl = (pcode) => {
      const s = String(pcode || '').trim();
      if (!s) return '';
      if (s.startsWith('wechat:') || s.startsWith('wechat_') || s === 'wechat') return 'https://mp.weixin.qq.com/';
      if (s === 'zhihu') return 'https://www.zhihu.com/';
      if (s === 'douyin') return 'https://www.douyin.com/';
      if (s === 'xiaohongshu') return 'https://www.xiaohongshu.com/';
      if (s === 'baijiahao') return 'https://baijiahao.baidu.com/';
      if (s === 'toutiao') return 'https://www.toutiao.com/';
      if (s === 'qyhao') return 'https://mp.weixin.qq.com/';
      if (s === 'bilibili') return 'https://www.bilibili.com/';
      if (s === 'sogou') return 'https://www.sogou.com/';
      if (s === 'wangyi') return 'https://www.163.com/';
      if (s === 'csdn') return 'https://www.csdn.net/';
      return '';
    };

    const renderRecords = () => {
      if (!recordsTable) return;
      const list = Array.isArray(state.records.items) ? state.records.items : [];
      if (!list.length) {
        recordsTable.innerHTML = `<tr><td colspan="10" class="empty">暂无发布记录</td></tr>`;
        return;
      }
      recordsTable.innerHTML = list
        .map((it, idx) => {
          const platformName = String(it.platform_name || it.platforms || '').trim() || '-';
          const platformCode = String(it.platform_code || '').trim();
          const linkUrlRaw = String(it.link_url || '').trim();
          const fallbackUrl = (Number(it.publish_count ?? 0) > 0) ? platformHomeUrl(platformCode) : '';
          const url = normalizeUrl(linkUrlRaw || fallbackUrl);
          const linkHtml = url
            ? (() => {
              const safeUrl = url.replaceAll('"', '&quot;');
              return `<a class="pm-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
            })()
            : ((Number(it.publish_count ?? 0) === 0 && platformCode) ? '<span class="pm-pending">待审核</span>' : '-');
          return `<tr>
            <td>${idx + 1}</td>
            <td><div class="pm-title" title="${stripTypePrefix(it.title || '').replaceAll('"', '&quot;')}">${stripTypePrefix(it.title || '')}</div></td>
            <td>${toDate(it.created_at)}</td>
            <td>${it.article_type || '-'}</td>
            <td>${toDate(it.publish_at)}</td>
            <td>${platformName}</td>
            <td>${linkHtml}</td>
            <td>${it.publish_count ?? 0}</td>
            <td>-</td>
            <td>-</td>
          </tr>`;
        })
        .join('');
    };

    const requestRecords = () => {
      window.geoQueryPublishRecords?.({
        keyword: state.records.keyword,
        start_date: state.records.start,
        end_date: state.records.end,
        limit: 200,
        flat: 1,
        ts: Date.now()
      });
    };

    const requestArticles = () => {
      window.geoQueryArticles?.({ limit: 200, keyword: state.articles.keyword, ts: Date.now() });
      window.geoQueryPublishRecordsAgg?.({ limit: 5000, keyword: state.articles.keyword, ts: Date.now() });
    };

    const matchArticleDate = (it) => {
      const d = toDate(it?.created_at || it?.date);
      if (!d) return false;
      if (state.articles.start && d < state.articles.start) return false;
      if (state.articles.end && d > state.articles.end) return false;
      return true;
    };

    const renderArticles = () => {
      if (!articlesTable) return;
      const list0 = Array.isArray(state.articles.items) ? state.articles.items : [];
      const list = state.articles.start || state.articles.end ? list0.filter(matchArticleDate) : list0;
      if (!list.length) {
        articlesTable.innerHTML = `<tr><td colspan="6" class="empty">暂无文章</td></tr>`;
        return;
      }

      articlesTable.innerHTML = list
        .map((it, idx) => {
          const aid = String(it.id || '').trim();
          const title = stripTypePrefix(it.title || '');
          const safeTitle = String(title).replaceAll('"', '&quot;');
          const pub = state.articles.publishByArticleId[aid] || null;
          const platformNum = Number(pub?.platform_num ?? 0) || 0;
          const publishCount = Number(pub?.publish_count ?? 0) || 0;
          const linkUrlRaw = String(pub?.link_url || '').trim();
          const url = normalizeUrl(linkUrlRaw);
          const statusParts = [];
          if (!pub) {
            statusParts.push('-');
          } else if (publishCount === 0) {
            statusParts.push('<span class="pm-pending">待审核</span>');
          } else {
            statusParts.push(`已发布(${platformNum})`);
          }
          if (pub?.platforms) statusParts.push(String(pub.platforms).trim());
          if (url) {
            const safeUrl = url.replaceAll('"', '&quot;');
            statusParts.push(`<a class="pm-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`);
          }
          const statusHtml = statusParts.filter(Boolean).join('<div style="height:4px"></div>');
          return `<tr>
            <td>${idx + 1}</td>
            <td><div class="pm-title" title="${safeTitle}">${title}</div></td>
            <td>${toDate(it.created_at)}</td>
            <td>${it.article_type || '-'}</td>
            <td>${statusHtml}</td>
            <td><button class="btn-primary pm-go" type="button" data-id="${aid.replaceAll('"', '&quot;')}">去官媒发布</button></td>
          </tr>`;
        })
        .join('');
    };

    let t1 = null;
    on(recordsKeyword, 'input', () => {
      if (!(recordsKeyword instanceof HTMLInputElement)) return;
      if (t1) clearTimeout(t1);
      t1 = setTimeout(() => {
        state.records.keyword = String(recordsKeyword.value || '').trim();
        requestRecords();
      }, 300);
    });

    on(recordsFilterBtn, 'click', () => {
      const start = prompt('请输入开始日期（YYYY-MM-DD），留空表示不限制：', state.records.start || '');
      if (start === null) return;
      const end = prompt('请输入结束日期（YYYY-MM-DD），留空表示不限制：', state.records.end || '');
      if (end === null) return;
      state.records.start = String(start || '').trim();
      state.records.end = String(end || '').trim();
      requestRecords();
    });

    let t2 = null;
    on(articlesKeyword, 'input', () => {
      if (!(articlesKeyword instanceof HTMLInputElement)) return;
      if (t2) clearTimeout(t2);
      t2 = setTimeout(() => {
        state.articles.keyword = String(articlesKeyword.value || '').trim();
        requestArticles();
      }, 300);
    });

    on(articlesFilterBtn, 'click', () => {
      const start = prompt('请输入开始日期（YYYY-MM-DD），留空表示不限制：', state.articles.start || '');
      if (start === null) return;
      const end = prompt('请输入结束日期（YYYY-MM-DD），留空表示不限制：', state.articles.end || '');
      if (end === null) return;
      state.articles.start = String(start || '').trim();
      state.articles.end = String(end || '').trim();
      renderArticles();
    });

    on(articlesTable, 'click', (e) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      const btn = t?.closest('button.pm-go[data-id]');
      const id = String(btn?.getAttribute('data-id') || '').trim();
      if (!id) return;
      try {
        localStorage.setItem('op_prefill_article_id', id);
      } catch {
      }
      window.navigateTo?.('official-publish');
    });

    const setView = (v) => {
      const next = v === 'articles' ? 'articles' : 'records';
      state.view = next;
      if (recordsView) recordsView.style.display = next === 'records' ? '' : 'none';
      if (articlesView) articlesView.style.display = next === 'articles' ? '' : 'none';
      tabs.forEach((b) => {
        const onState = b.getAttribute('data-tab') === next;
        b.classList.toggle('on', onState);
      });
      if (next === 'records') requestRecords();
      if (next === 'articles') requestArticles();
    };

    tabs.forEach((b) => {
      on(b, 'click', () => setView(b.getAttribute('data-tab') || 'records'));
    });

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'geo_publish_records_data') {
        const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
        state.records.items = items;
        renderRecords();
        return;
      }
      if (d.type === 'geo_publish_records_agg_data') {
        const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
        const m = {};
        items.forEach((it) => {
          const k = String(it?.article_id || '').trim();
          if (k) m[k] = it;
        });
        state.articles.publishByArticleId = m;
        renderArticles();
        return;
      }
      if (d.type === 'geo_articles_data') {
        const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
        state.articles.items = items;
        renderArticles();
      }
    };

    Page._handler = onMessage;
    window.addEventListener('message', onMessage);
    Page._cleanup = () => {
      if (Page._handler) window.removeEventListener('message', Page._handler);
      Page._handler = null;
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
        }
      });
    };

    setView('records');
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
