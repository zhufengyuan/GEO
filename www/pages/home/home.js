const HomePage = {
  async init() {
    const root = document.querySelector('.home-grid');
    if (!root) return;

    root.addEventListener('click', (e) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      const btn = target.closest('button[data-page]');
      if (!(btn instanceof HTMLButtonElement)) return;
      const page = btn.getAttribute('data-page');
      if (!page) return;
      window.geoConsume?.({ event_type: 'ui', page: 'home', action: `goto_${page}`, units: 1, amount: 0 });
      window.navigateTo?.(page);
    });

    // 拉取工作台数据并填充仪表台
    this.loadDashboardStats();
  },

  async loadDashboardStats() {
    try {
      const resp = await window.geoApiGet?.('/dashboard/stats');
      if (resp && resp.success && resp.data) {
        this.renderDashboard(resp.data);
      }
    } catch (err) {
      console.warn('[Home] Dashboard stats failed:', err);
    }
  },

  renderDashboard(data) {
    const llmStats = Array.isArray(data.llm_stats) ? data.llm_stats : [];
    const statsMap = {};
    llmStats.forEach(function (s) { statsMap[s.model] = s; });

    // 两个面板：第一个 = AI收录 (indexed)，第二个 = AI引用 (citations)
    const cols = document.querySelectorAll('.dashboard-grid .dashboard-col');
    if (cols.length >= 2) {
      // AI收录
      cols[0].querySelectorAll('.ai-metric-item').forEach(function (item) {
        var img = item.querySelector('[data-llm-key]');
        var key = img ? img.getAttribute('data-llm-key') : '';
        var valEl = item.querySelector('.ai-mm-v');
        if (key && valEl) {
          var stat = statsMap[key];
          if (stat) valEl.textContent = String(stat.indexed || 0);
        }
      });
      // AI引用
      cols[1].querySelectorAll('.ai-metric-item').forEach(function (item) {
        var img = item.querySelector('[data-llm-key]');
        var key = img ? img.getAttribute('data-llm-key') : '';
        var valEl = item.querySelector('.ai-mm-v');
        if (key && valEl) {
          var stat = statsMap[key];
          if (stat) valEl.textContent = String(stat.citations || 0);
        }
      });
    }

    // 文章发布统计 — 按平台名匹配
    var publishByPlatform = data.publish_by_platform || {};
    document.querySelectorAll('.pubstat-item').forEach(function (item) {
      var nameEl = item.querySelector('.pubstat-name');
      var valEl = item.querySelector('.pubstat-v');
      if (!nameEl || !valEl) return;
      var name = nameEl.textContent.trim();
      var cnt = publishByPlatform[name];
      if (cnt !== undefined) {
        valEl.textContent = String(cnt);
      }
    });
  },

  destroy() {
  }
};

export default HomePage;
