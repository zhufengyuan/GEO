import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('舆情雷达分析报告');

    const els = {
      from: document.getElementById('from'),
      to: document.getElementById('to'),
      kw: document.getElementById('kw'),
      refreshBtn: document.getElementById('refreshBtn'),
      exportPdfBtn: document.getElementById('exportPdfBtn'),
      exportExcelBtn: document.getElementById('exportExcelBtn'),
      total: document.getElementById('total'),
      pos: document.getElementById('pos'),
      neu: document.getElementById('neu'),
      neg: document.getElementById('neg'),
      trend: document.getElementById('trend'),
      topicRows: document.getElementById('topicRows'),
      sourceRows: document.getElementById('sourceRows')
    };

    const pad2 = (n) => String(n).padStart(2, '0');
    const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    const buildLast7 = () => {
      const days = [];
      const now = new Date();
      for (let i = 6; i >= 0; i -= 1) {
        const dd = new Date(now);
        dd.setDate(now.getDate() - i);
        days.push(dayKey(dd));
      }
      return days;
    };

    const renderTrend = (days, values) => {
      if (!els.trend) return;
      const max = Math.max(1, ...values);
      els.trend.innerHTML = days
        .map((k, idx) => {
          const val = values[idx];
          const h = Math.max(4, Math.round((val / max) * 120));
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="width:100%;height:${h}px;border-radius:10px;background:linear-gradient(180deg, rgba(47,107,216,0.75) 0%, rgba(124,58,237,0.55) 100%);border:1px solid rgba(37,99,235,0.18);"></div>
            <div class="page-muted" style="font-size:12px;">${k.slice(5)}</div>
          </div>`;
        })
        .join('');
    };

    const renderTable = (tbody, rows, cols) => {
      if (!tbody) return;
      if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${cols}" class="empty">暂无数据</td></tr>`;
        return;
      }
      tbody.innerHTML = rows.join('');
    };

    const mock = () => {
      const total = 80;
      const neg = 12;
      const pos = 28;
      const neu = total - neg - pos;
      if (els.total) els.total.textContent = String(total);
      if (els.neg) els.neg.textContent = String(neg);
      if (els.pos) els.pos.textContent = String(pos);
      if (els.neu) els.neu.textContent = String(neu);

      const days = buildLast7();
      const values = [18, 24, 20, 30, 28, 22, 26];
      renderTrend(days, values);

      renderTable(
        els.topicRows,
        [
          `<tr><td>1</td><td>口碑讨论</td><td>92</td></tr>`,
          `<tr><td>2</td><td>售后服务</td><td>81</td></tr>`,
          `<tr><td>3</td><td>交付时效</td><td>73</td></tr>`
        ],
        3
      );

      renderTable(
        els.sourceRows,
        [
          `<tr><td>今日头条</td><td>26</td></tr>`,
          `<tr><td>公众号</td><td>18</td></tr>`,
          `<tr><td>小红书</td><td>14</td></tr>`,
          `<tr><td>知乎</td><td>12</td></tr>`
        ],
        2
      );
    };

    els.refreshBtn?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion-report', action: 'refresh', units: 1, amount: 0 });
      mock();
    });

    els.exportPdfBtn?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion-report', action: 'export_pdf', units: 1, amount: 0 });
      alert('导出PDF：后续接入后端导出。');
    });

    els.exportExcelBtn?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion-report', action: 'export_excel', units: 1, amount: 0 });
      alert('导出Excel：后续接入后端导出。');
    });

    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    if (els.from) els.from.value = dayKey(from);
    if (els.to) els.to.value = dayKey(now);

    mock();
  },
  destroy() {
  }
};

export default Page;

