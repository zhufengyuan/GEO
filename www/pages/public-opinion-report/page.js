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

    const GEO_BASE = window.GEO_BASE || '';

    const fetchStats = async () => {
      const kw = (els.kw?.value || '').trim();
      const params = new URLSearchParams({ keyword: kw });
      const url = `${GEO_BASE}/api/v1/public-opinion/stats?${params}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json.success || !json.data) throw new Error(json.error || 'API 返回异常');
      return json.data;
    };

    const refresh = async () => {
      try {
        const stats = await fetchStats();

        if (els.total) els.total.textContent = String(stats.total || 0);
        if (els.pos) els.pos.textContent = String(stats.positive || 0);
        if (els.neu) els.neu.textContent = String(stats.neutral || 0);
        if (els.neg) els.neg.textContent = String(stats.negative || 0);

        const days = (stats.trend_days && stats.trend_days.length > 0)
          ? stats.trend_days
          : buildLast7();
        const values = (stats.trend_values && stats.trend_values.length > 0)
          ? stats.trend_values
          : [0, 0, 0, 0, 0, 0, 0];
        renderTrend(days, values);

        const topicRows = (stats.topic_rows || []);
        renderTable(
          els.topicRows,
          topicRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.name || '未知'}</td><td>${r.count || 0}</td></tr>`),
          3
        );

        const sourceRows = (stats.source_rows || []);
        renderTable(
          els.sourceRows,
          sourceRows.map((r) => `<tr><td>${r.name || '未知'}</td><td>${r.count || 0}</td></tr>`),
          2
        );
      } catch (e) {
        if (els.total) els.total.textContent = '—';
        if (els.pos) els.pos.textContent = '—';
        if (els.neu) els.neu.textContent = '—';
        if (els.neg) els.neg.textContent = '—';
        if (els.trend) els.trend.innerHTML = `<div class="page-muted" style="padding:12px;">加载失败</div>`;
        console.error('fetchStats error:', e);
      }
    };

    els.refreshBtn?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ui', page: 'public-opinion-report', action: 'refresh', units: 1, amount: 0 });
      refresh();
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

    refresh();
  },
  destroy() {
  }
};

export default Page;
