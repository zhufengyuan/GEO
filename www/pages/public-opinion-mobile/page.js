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

    const mockList = (kw) => {
      const key = (kw || '品牌').trim();
      return [
        {
          title: `【讨论】${key} 相关话题热度上升，用户关注点集中在服务体验`,
          desc: `模拟数据：围绕 ${key} 的讨论主要来自多个平台，包含观点、体验与对比内容。`,
          meta: '今日头条 · 10:23'
        },
        {
          title: `【预警】${key} 出现负面关键词，建议及时响应`,
          desc: '模拟数据：建议跟进原帖、核实情况并准备回复口径。',
          meta: '微博 · 09:12'
        },
        {
          title: `【信息】${key} 新品相关内容被转发扩散`,
          desc: '模拟数据：可结合内容投放与评论互动提升正面曝光。',
          meta: '公众号 · 昨日'
        }
      ];
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

    const refresh = () => {
      const kw = els.mSearch?.value || '';
      render(mockList(kw));
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

