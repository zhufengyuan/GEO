import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('数据统计');

    const kpiArticles = document.getElementById('kpiArticles');
    const kpiLinks = document.getElementById('kpiLinks');
    const kpiIndexed = document.getElementById('kpiIndexed');
    const kpiCited = document.getElementById('kpiCited');

    const els = {
      viewBtns: document.getElementById('dsViewBtns'),
      meta: document.getElementById('dsMeta'),
      tableWrap: document.getElementById('dsTableWrap'),
      cardGrid: document.getElementById('dsCardGrid'),
      thead: document.getElementById('dsThead'),
      tbody: document.getElementById('dsTbody'),
      trendPlot: document.getElementById('dsTrendPlot'),
      trendSvg: document.getElementById('dsTrendSvg'),
      tooltip: document.getElementById('dsTooltip'),
      timeFilters: document.getElementById('timeFilters'),
      kpiBadgeArticles: document.getElementById('kpiBadgeArticles'),
      kpiBadgeLinks: document.getElementById('kpiBadgeLinks'),
      kpiBadgeIndexed: document.getElementById('kpiBadgeIndexed'),
      kpiBadgeCited: document.getElementById('kpiBadgeCited')
    };

    const state = {
      data: null,
      view: 'summary',
      range: '7',
      sheet: ''
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

    const setMeta = (t) => {
      if (els.meta) els.meta.textContent = t;
    };

    const setKpis = () => {
      const d = state.data;
      const label =
        state.range === '7' ? '近7天' : state.range === '30' ? '近30天' : state.range === '90' ? '近90天' : '全部';
      if (els.kpiBadgeArticles) els.kpiBadgeArticles.textContent = label;
      if (els.kpiBadgeLinks) els.kpiBadgeLinks.textContent = label;
      if (els.kpiBadgeIndexed) els.kpiBadgeIndexed.textContent = label;
      if (els.kpiBadgeCited) els.kpiBadgeCited.textContent = label;

      const k = d?.kpi || {};
      const trend = filterTrendByRange(d?.trend || []);
      const sum = (arr) => arr.reduce((acc, x) => acc + Number(x || 0), 0);
      const aSum = sum(trend.map((x) => Number(x.articles || 0)));
      const iSum = sum(trend.map((x) => Number(x.indexed || 0)));

      if (kpiArticles) kpiArticles.textContent = String(Number.isFinite(aSum) ? aSum : Number(k.articles || 0));
      if (kpiIndexed) kpiIndexed.textContent = String(Number.isFinite(iSum) ? iSum : Number(k.indexed || 0));
      if (kpiLinks) kpiLinks.textContent = String(Number(k.links || 0));
      if (kpiCited) kpiCited.textContent = String(Number(k.cited || 0));
    };

    const renderTable = (columns, rows) => {
      if (!els.thead || !els.tbody) return;
      const cols = Array.isArray(columns) ? columns : [];
      const list = Array.isArray(rows) ? rows : [];
      els.thead.innerHTML = `<tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
      if (!list.length) {
        els.tbody.innerHTML = `<tr><td colspan="${Math.max(1, cols.length)}">${escapeHtml('暂无数据')}</td></tr>`;
        return;
      }
      els.tbody.innerHTML = list
        .map((r) => {
          return `<tr>${cols.map((c) => `<td>${escapeHtml(toText(r?.[c]))}</td>`).join('')}</tr>`;
        })
        .join('');
    };

    const PALETTE = ['#7c3aed', '#2563eb', '#6366f1', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#a855f7'];

    const showDashboard = (on) => {
      if (els.tableWrap) els.tableWrap.style.display = on ? 'none' : '';
      if (els.cardGrid) els.cardGrid.style.display = on ? '' : 'none';
    };

    const renderCards = (cards) => {
      if (!els.cardGrid) return;
      const list = Array.isArray(cards) ? cards : [];
      if (!list.length) {
        els.cardGrid.innerHTML = `<div class="ds-card" style="grid-column: 1 / -1; --ds-accent:#9ca3af;">
          <div class="ds-card-title">暂无指标</div>
          <div class="ds-card-sub">当前没有可展示的数据看板指标</div>
        </div>`;
        return;
      }
      els.cardGrid.innerHTML = list
        .map((c, i) => {
          const accent = c.accent || PALETTE[i % PALETTE.length];
          const title = c.title || '';
          const value = c.value ?? '';
          const sub = c.sub || '';
          const kvs = Array.isArray(c.kvs) ? c.kvs : [];
          return `<div class="ds-card" style="--ds-accent:${escapeHtml(accent)};">
            <div class="ds-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
            <div class="ds-card-value">${escapeHtml(String(value))}</div>
            ${sub ? `<div class="ds-card-sub">${escapeHtml(sub)}</div>` : ''}
            ${kvs.length ? `<div class="ds-card-kvs">${kvs
              .map((kv) => `<span class="ds-card-kv" title="${escapeHtml(`${kv.k}：${kv.v}`)}">${escapeHtml(kv.k)}：${escapeHtml(kv.v)}</span>`)
              .join('')}</div>` : ''}
          </div>`;
        })
        .join('');
    };

    const renderDashboardCards = () => {
      const d = state.data;
      if (!d) {
        renderCards([{ accent: '#9ca3af', title: '等待数据…', value: '—', sub: '请等待 R 端推送数据，或点击刷新' }]);
        return;
      }

      const label =
        state.range === '7' ? '近7天' : state.range === '30' ? '近30天' : state.range === '90' ? '近90天' : '全部';

      const trend = filterTrendByRange(d?.trend || []);
      const sum = (arr) => arr.reduce((acc, x) => acc + Number(x || 0), 0);
      const articles = sum(trend.map((x) => Number(x.articles || 0)));
      const indexed = sum(trend.map((x) => Number(x.indexed || 0)));
      const last = trend.length ? trend[trend.length - 1] : null;

      const k = d?.kpi || {};
      const sheets = Array.isArray(d?.sheets) ? d.sheets : [];
      const columnStats = Array.isArray(d?.column_stats) ? d.column_stats : [];

      renderCards([
        { accent: '#6366f1', title: '生成文章数', value: articles, sub: label, kvs: last ? [{ k: '最近日期', v: String(last.date || '') }] : [] },
        { accent: '#22c55e', title: '已收录数', value: indexed, sub: label, kvs: last ? [{ k: '最近日期', v: String(last.date || '') }] : [] },
        { accent: '#a855f7', title: '追踪链接数', value: Number(k.links || 0), sub: '全量', kvs: [{ k: 'Sheet', v: String(sheets.length) }] },
        { accent: '#f97316', title: 'AI引用次数', value: Number(k.cited || 0), sub: '全量' },
        { accent: '#2563eb', title: 'Sheet 数量', value: sheets.length, sub: '数据源结构' },
        { accent: '#06b6d4', title: '字段统计数', value: columnStats.length, sub: '字段行数' },
        {
          accent: '#ef4444',
          title: '最近一天文章',
          value: last ? Number(last.articles || 0) : 0,
          sub: last ? String(last.date || '') : label
        },
        {
          accent: '#7c3aed',
          title: '最近一天收录',
          value: last ? Number(last.indexed || 0) : 0,
          sub: last ? String(last.date || '') : label
        }
      ]);
    };

    const parseDate = (s) => {
      const t = String(s || '').trim();
      if (!t) return null;
      const d = new Date(t);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    };

    const filterTrendByRange = (items) => {
      const list = Array.isArray(items) ? items : [];
      if (state.range === 'all') return list;
      const days = Number(state.range);
      if (!Number.isFinite(days) || days <= 0) return list;
      const dated = list
        .map((x) => ({ ...x, __d: parseDate(x.date) }))
        .filter((x) => x.__d);
      if (!dated.length) return list;
      const max = dated.reduce((m, x) => (x.__d > m ? x.__d : m), dated[0].__d);
      const min = new Date(max.getTime() - (days - 1) * 86400000);
      return dated.filter((x) => x.__d >= min && x.__d <= max).map(({ __d, ...rest }) => rest);
    };

    const renderTrend = () => {
      if (!els.trendSvg || !els.trendPlot) return;
      const d = state.data;
      const trend0 = filterTrendByRange(d?.trend || []);
      const trend = Array.isArray(trend0) ? trend0 : [];
      if (!trend.length) {
        els.trendSvg.innerHTML = '';
        if (els.tooltip) els.tooltip.style.display = 'none';
        return;
      }

      const w = 1000;
      const h = 260;
      const pad = { l: 40, r: 18, t: 14, b: 26 };
      const innerW = w - pad.l - pad.r;
      const innerH = h - pad.t - pad.b;

      const a = trend.map((x) => Number(x.articles || 0));
      const b = trend.map((x) => Number(x.indexed || 0));
      const maxY = Math.max(1, ...a, ...b);
      const xStep = trend.length === 1 ? innerW : innerW / (trend.length - 1);

      const xAt = (i) => pad.l + i * xStep;
      const yAt = (v) => pad.t + (1 - v / maxY) * innerH;

      const ptsA = trend.map((x, i) => `${xAt(i)},${yAt(Number(x.articles || 0))}`).join(' ');
      const ptsB = trend.map((x, i) => `${xAt(i)},${yAt(Number(x.indexed || 0))}`).join(' ');

      const grid = [0.25, 0.5, 0.75]
        .map((p) => {
          const y = pad.t + innerH * p;
          return `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="rgba(15,23,42,0.08)" stroke-width="1" />`;
        })
        .join('');

      const idx = [0, Math.floor((trend.length - 1) / 2), trend.length - 1].filter((v, i, arr) => arr.indexOf(v) === i);
      const xLabels = idx
        .map((i) => {
          const t = String(trend[i]?.date || '');
          const d = parseDate(t);
          const label = d ? `${d.getMonth() + 1}-${d.getDate()}` : t;
          return `<text x="${xAt(i)}" y="${h - 8}" text-anchor="middle" fill="#6b7280" font-size="11">${escapeHtml(label)}</text>`;
        })
        .join('');

      els.trendSvg.innerHTML = `
        <g>
          ${grid}
          <polyline fill="none" stroke="#6366f1" stroke-width="2.5" points="${ptsA}" />
          <polyline fill="none" stroke="#22c55e" stroke-width="2.5" points="${ptsB}" />
          <line id="dsCross" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h - pad.b}" stroke="rgba(17,24,39,0.35)" stroke-width="1" opacity="0" />
          <circle id="dsDotA" r="4" fill="#6366f1" cx="${xAt(0)}" cy="${yAt(a[0])}" opacity="0" />
          <circle id="dsDotB" r="4" fill="#22c55e" cx="${xAt(0)}" cy="${yAt(b[0])}" opacity="0" />
          ${xLabels}
        </g>
      `;

      const cross = els.trendSvg.querySelector('#dsCross');
      const dotA = els.trendSvg.querySelector('#dsDotA');
      const dotB = els.trendSvg.querySelector('#dsDotB');

      const onMove = (ev) => {
        const rect = els.trendPlot.getBoundingClientRect();
        const px = ev.clientX - rect.left;
        const ratioX = px / rect.width;
        const sx = ratioX * w;
        const i = Math.max(0, Math.min(trend.length - 1, Math.round((sx - pad.l) / xStep)));
        const cx = xAt(i);
        const va = Number(trend[i]?.articles || 0);
        const vb = Number(trend[i]?.indexed || 0);
        const ya = yAt(va);
        const yb = yAt(vb);

        if (cross) {
          cross.setAttribute('x1', String(cx));
          cross.setAttribute('x2', String(cx));
          cross.setAttribute('opacity', '1');
        }
        if (dotA) {
          dotA.setAttribute('cx', String(cx));
          dotA.setAttribute('cy', String(ya));
          dotA.setAttribute('opacity', '1');
        }
        if (dotB) {
          dotB.setAttribute('cx', String(cx));
          dotB.setAttribute('cy', String(yb));
          dotB.setAttribute('opacity', '1');
        }

        if (els.tooltip) {
          els.tooltip.style.display = '';
          els.tooltip.innerHTML = `${escapeHtml(String(trend[i]?.date || ''))}<br/>文章：${escapeHtml(String(va))}<br/>收录：${escapeHtml(String(vb))}`;
          const tx = Math.min(rect.width - 10, Math.max(10, px + 12));
          const ty = 16;
          els.tooltip.style.left = `${tx}px`;
          els.tooltip.style.top = `${ty}px`;
        }
      };

      const onLeave = () => {
        if (cross) cross.setAttribute('opacity', '0');
        if (dotA) dotA.setAttribute('opacity', '0');
        if (dotB) dotB.setAttribute('opacity', '0');
        if (els.tooltip) els.tooltip.style.display = 'none';
      };

      els.trendPlot.onmousemove = onMove;
      els.trendPlot.onmouseleave = onLeave;
    };

    const render = () => {
      const d = state.data;
      if (!d) {
        setMeta('等待数据…');
        renderTable(['提示'], [{ 提示: '请等待 R 端推送数据，或点击刷新' }]);
        renderTrend();
        showDashboard(false);
        return;
      }

      setKpis();
      renderTrend();

      const file = d.file ? `来源：${d.file}` : '';
      const ts = d.ts ? `更新时间：${new Date(d.ts).toLocaleString()}` : '';
      setMeta([file, ts].filter(Boolean).join('｜') || '已加载');

      if (state.view === 'dashboard') {
        showDashboard(true);
        renderDashboardCards();
        return;
      }

      showDashboard(false);

      if (state.view === 'summary') {
        const rows = Array.isArray(d.summary) ? d.summary : [];
        renderTable(['sheet', 'rows', 'cols'], rows);
        return;
      }

      if (state.view === 'columns') {
        const rows = Array.isArray(d.column_stats) ? d.column_stats : [];
        renderTable(['sheet', 'column', 'non_empty', 'unique', 'example'], rows);
        return;
      }

      if (state.view === 'raw') {
        const sheets = Array.isArray(d.sheets) ? d.sheets : [];
        const sheet = sheets[0] || null;
        if (!sheet) {
          renderTable(['提示'], [{ 提示: '未找到原始数据' }]);
          return;
        }
        const preview = Array.isArray(sheet.preview) ? sheet.preview : [];
        const cols = Array.isArray(sheet.cols) ? sheet.cols : [];
        const dateFirst = cols.find((c) => /日期|时间|date/i.test(c));
        const articleCol = cols.find((c) => /文章|发文|生成/i.test(c));
        const indexedCol = cols.find((c) => /收录|索引|indexed/i.test(c));
        const front = [dateFirst, articleCol, indexedCol].filter(Boolean);
        const rest = cols.filter((c) => !front.includes(c));
        renderTable([...front, ...rest], preview);
        return;
      }

      const sheets = Array.isArray(d.sheets) ? d.sheets : [];
      renderTable(['提示'], [{ 提示: sheets.length ? '请选择一个视图' : '暂无原始数据' }]);
    };

    const renderViews = () => {
      if (!els.viewBtns) return;
      const d = state.data;
      const buttons = [
        { key: 'dashboard', label: '数据看板' },
        { key: 'summary', label: '总览' },
        { key: 'columns', label: '字段统计' },
        { key: 'raw', label: '原始数据' }
      ];
      els.viewBtns.innerHTML = buttons
        .map((b) => {
          const active = b.key === state.view ? 'active' : '';
          return `<button class="ds-view ${active}" data-view="${escapeHtml(b.key)}">${escapeHtml(b.label)}</button>`;
        })
        .join('');
    };

    const loadLocal = () => {
      const pre = window.__geoDataStatisticsData;
      if (pre && typeof pre === 'object' && Array.isArray(pre.sheets)) return pre;
      try {
        const raw = localStorage.getItem('geo_data_statistics_data_v1');
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && Array.isArray(obj.sheets)) return obj;
      } catch {
      }
      return null;
    };

    const requestFromR = () => {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'geo_request_data_statistics_data' }, '*');
        }
      } catch {
      }
    };

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'geo_data_statistics_data') return;
      const payload = d.payload || {};
      if (!payload || !Array.isArray(payload.sheets)) return;
      state.data = payload;
      renderViews();
      render();
    };
    Page._handler = onMessage;
    window.addEventListener('message', onMessage);

    state.data = loadLocal();
    renderViews();
    render();
    if (!state.data) requestFromR();

    const bindFilters = () => {
      const root = els.timeFilters;
      if (!root) return;
      root.addEventListener('click', (e) => {
        const btn = e.target instanceof HTMLElement ? e.target.closest('button[data-range]') : null;
        const range = btn?.getAttribute('data-range');
        if (!range) return;
        root.querySelectorAll('button[data-range]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.range = range;
      render();
        window.geoConsume?.({ event_type: 'ui', page: 'data-statistics', action: `time_${range}`, units: 1, amount: 0 });
      });
    };

    bindFilters();

    document.getElementById('exportBtn')?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ui', page: 'data-statistics', action: 'export', units: 1, amount: 0 });
      alert('导出报告：后续接入数据后实现。');
    });

    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ui', page: 'data-statistics', action: 'refresh', units: 1, amount: 0 });
      requestFromR();
      state.data = loadLocal();
      renderViews();
      render();
    });

    els.viewBtns?.addEventListener('click', (e) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      const btn = target.closest('button[data-view]');
      const view = btn?.getAttribute('data-view');
      if (!view) return;
      state.view = view;
      renderViews();
      render();
      window.geoConsume?.({ event_type: 'ui', page: 'data-statistics', action: `view_${view}`, units: 1, amount: 0 });
    });
  },
  destroy() {
    if (Page._handler) window.removeEventListener('message', Page._handler);
    Page._handler = null;
  }
};

export default Page;
