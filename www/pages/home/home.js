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
  },
  destroy() {
  }
};

export default HomePage;
