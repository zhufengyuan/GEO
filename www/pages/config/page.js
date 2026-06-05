import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('消耗明细');

    const els = {
      tabs: document.getElementById('cmTabs'),
      kw: document.getElementById('kw'),
      date: document.getElementById('date'),
      rows: document.getElementById('rows'),
      summary: document.getElementById('summary'),
      checkAll: document.getElementById('checkAll'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      pageNo: document.getElementById('pageNo'),
      pageTotal: document.getElementById('pageTotal'),
      jumpInput: document.getElementById('jumpInput'),
      jumpBtn: document.getElementById('jumpBtn'),
      addBtn: document.getElementById('addBtn'),
      deleteBtn: document.getElementById('deleteBtn'),
      backBtn: document.getElementById('backBtn'),
      exportBtn: document.getElementById('exportBtn'),
      searchBtn: document.getElementById('searchBtn'),
      modal: document.getElementById('cmModal'),
      modalClose: document.getElementById('cmModalClose'),
      modalCancel: document.getElementById('cmCancel'),
      modalConfirm: document.getElementById('cmConfirm'),
      name: document.getElementById('cmName'),
      type: document.getElementById('cmType'),
      amount: document.getElementById('cmAmount'),
      time: document.getElementById('cmTime')
    };

    const escapeHtml = (s) => {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const fmtMoney = (n) => {
      const v = Number(n);
      return Number.isFinite(v) ? v.toFixed(2) : '0.00';
    };

    const toCsv = (list) => {
      const header = ['序号', '名称', '类型', '金额', '创建时间'];
      const lines = [header];
      (list || []).forEach((r, idx) => {
        lines.push([
          idx + 1,
          r.name || '',
          r.type || '',
          fmtMoney(r.amount),
          r.created_at || ''
        ]);
      });
      return lines
        .map((row) => row.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
        .join('\n');
    };

    const download = (name, content) => {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    const normalize = (raw, idx) => {
      const type = raw.event_type || raw.type || 'ui';
      const page = raw.page || raw.module || '';
      const action = raw.action || raw.note || '';
      const name = action || page || type;
      const amount = Number(raw.amount ?? 0);
      const created_at = raw.created_at || raw.time || '';
      return {
        id: raw.id ?? idx,
        name,
        type,
        amount: Number.isFinite(amount) ? amount : 0,
        created_at
      };
    };

    const state = {
      all: [],
      filtered: [],
      page: 1,
      pageSize: 10
    };

    const pad2 = (n) => String(n).padStart(2, '0');
    const formatTime = (d) => {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    };

    const toDatetimeLocal = (d) => {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    };

    const openModal = () => {
      if (!els.modal) return;
      const now = new Date();
      if (els.name) els.name.value = '';
      if (els.type) els.type.value = 'ai_generate';
      if (els.amount) els.amount.value = '';
      if (els.time) els.time.value = toDatetimeLocal(now);
      els.modal.classList.add('show');
    };

    const closeModal = () => {
      els.modal?.classList.remove('show');
    };

    els.modalClose?.addEventListener('click', closeModal);
    els.modalCancel?.addEventListener('click', closeModal);
    els.modal?.addEventListener('click', (e) => {
      if (e.target === els.modal) closeModal();
    });

    const makeDemoRows = () => {
      const now = new Date();
      const types = ['ai_generate', 'publish', 'save', 'ui'];
      const names = [
        { type: 'ai_generate', name: '提交生成' },
        { type: 'ai_generate', name: '生成标题' },
        { type: 'publish', name: '发布到平台' },
        { type: 'save', name: '保存模版' },
        { type: 'ui', name: '打开页面' },
        { type: 'ui', name: '点击按钮' },
        { type: 'ui', name: '筛选查询' }
      ];

      const list = [];

      list.push({
        id: 10001,
        event_type: 'ai_generate',
        page: 'ai-test',
        action: 'AI测试',
        amount: 0.99,
        created_at: formatTime(now)
      });
      list.push({
        id: 10002,
        event_type: 'publish',
        page: 'media-publish',
        action: '跳转平台发布',
        amount: 0.2,
        created_at: formatTime(now)
      });

      for (let i = 0; i < 22; i += 1) {
        const t = new Date(now);
        t.setMinutes(now.getMinutes() - i * 7);
        const pick = names[i % names.length];
        const type = pick.type || types[i % types.length];
        const amount = type === 'ai_generate' ? 0.6 : type === 'publish' ? 0.2 : 0;
        list.push({
          id: i + 1,
          event_type: type,
          page: type === 'ai_generate' ? 'data-query' : type === 'publish' ? 'media-publish' : 'config',
          action: pick.name,
          amount,
          created_at: formatTime(t)
        });
      }
      return list;
    };

    const applyFilters = () => {
      const kw = (els.kw?.value || '').trim();
      const date = (els.date?.value || '').trim();
      state.filtered = state.all.filter((r) => {
        if (kw) {
          const hay = `${r.name} ${r.type}`;
          if (!hay.includes(kw)) return false;
        }
        if (date) {
          if (!String(r.created_at || '').startsWith(date)) return false;
        }
        return true;
      });
      state.page = 1;
    };

    const getPageCount = () => Math.max(1, Math.ceil(state.filtered.length / state.pageSize));

    const render = () => {
      if (!els.rows) return;
      const total = state.filtered.length;
      const pages = getPageCount();
      const page = Math.min(Math.max(1, state.page), pages);
      state.page = page;
      const start = (page - 1) * state.pageSize;
      const end = Math.min(total, start + state.pageSize);
      const slice = state.filtered.slice(start, end);

      if (els.pageNo) els.pageNo.textContent = String(page);
      if (els.pageTotal) els.pageTotal.textContent = String(pages);
      if (els.summary) els.summary.textContent = `显示第 ${total ? start + 1 : 0} 到 ${end} 条记录，总共 ${total} 条记录`;
      if (els.checkAll) els.checkAll.checked = false;

      if (slice.length === 0) {
        els.rows.innerHTML = `<tr><td colspan="7" class="empty">没有找到匹配的记录</td></tr>`;
        return;
      }

      els.rows.innerHTML = slice
        .map((r, i) => {
          const idx = start + i + 1;
          return `<tr>
            <td><input type="checkbox" class="row-check" data-id="${escapeHtml(String(r.id))}" /></td>
            <td>${idx}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.type)}</td>
            <td>${escapeHtml(fmtMoney(r.amount))}</td>
            <td>${escapeHtml(r.created_at || '-')}</td>
            <td><button class="op op-danger" data-action="delete" data-id="${escapeHtml(String(r.id))}">🗑</button></td>
          </tr>`;
        })
        .join('');
    };

    const setActiveTab = (key) => {
      els.tabs?.querySelectorAll('.pill').forEach((p) => {
        p.classList.toggle('active', p.getAttribute('data-tab') === key);
      });
    };

    els.tabs?.addEventListener('click', (e) => {
      const el = e.target instanceof HTMLElement ? e.target.closest('.pill') : null;
      const tab = el?.getAttribute('data-tab');
      if (!tab) return;
      if (tab === 'add') {
        openModal();
        setActiveTab('list');
        window.geoConsume?.({ event_type: 'ui', page: 'config', action: 'open_add', units: 1, amount: 0 });
        return;
      }
      setActiveTab('list');
    });

    const requestData = () => {
      const payload = {
        kw: els.kw?.value || '',
        type: '',
        from: els.date?.value || '',
        to: els.date?.value || ''
      };
      if (window.geoQueryConsumption) {
        window.geoQueryConsumption(payload);
      } else {
        state.all = makeDemoRows().map(normalize);
        applyFilters();
        render();
      }
    };

    const onConsumptionData = (event) => {
      const d = event.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'geo_consumption_data') return;
      const payload = d.payload || {};
      const list = Array.isArray(payload.list) ? payload.list : [];
      state.all = (list.length ? list : makeDemoRows()).map(normalize);
      applyFilters();
      render();
    };

    window.addEventListener('message', onConsumptionData);
    Page._handler = onConsumptionData;

    els.searchBtn?.addEventListener('click', requestData);
    els.kw?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') requestData();
    });
    els.date?.addEventListener('change', requestData);

    els.prevBtn?.addEventListener('click', () => {
      state.page = Math.max(1, state.page - 1);
      render();
    });
    els.nextBtn?.addEventListener('click', () => {
      state.page = Math.min(getPageCount(), state.page + 1);
      render();
    });
    els.jumpBtn?.addEventListener('click', () => {
      const n = parseInt(String(els.jumpInput?.value || ''), 10);
      if (!Number.isFinite(n)) return;
      state.page = Math.min(getPageCount(), Math.max(1, n));
      render();
    });

    els.checkAll?.addEventListener('change', () => {
      const checked = Boolean(els.checkAll?.checked);
      document.querySelectorAll('input.row-check').forEach((c) => {
        c.checked = checked;
      });
    });

    els.rows?.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest('button[data-action="delete"]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      state.all = state.all.filter((x) => String(x.id) !== String(id));
      applyFilters();
      render();
      window.geoConsume?.({ event_type: 'ui', page: 'config', action: 'delete_row', units: 1, amount: 0 });
    });

    els.exportBtn?.addEventListener('click', () => {
      download(`消耗明细_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(state.filtered));
      window.geoConsume?.({ event_type: 'ui', page: 'config', action: 'export', units: 1, amount: 0 });
    });

    els.addBtn?.addEventListener('click', () => {
      openModal();
      window.geoConsume?.({ event_type: 'ui', page: 'config', action: 'open_add', units: 1, amount: 0 });
    });

    els.modalConfirm?.addEventListener('click', () => {
      const name = (els.name?.value || '').trim();
      const type = String(els.type?.value || 'ui');
      const amount = Number(els.amount?.value || 0);
      const timeRaw = String(els.time?.value || '').trim();

      if (!name) {
        alert('请填写名称');
        return;
      }

      const created_at = timeRaw ? timeRaw.replace('T', ' ') : formatTime(new Date());
      const id = `${Date.now()}`;
      state.all.unshift(
        normalize({
          id,
          event_type: type,
          page: 'config',
          action: name,
          amount: Number.isFinite(amount) ? amount : 0,
          created_at
        }, 0)
      );

      if (els.kw) els.kw.value = '';
      if (els.date) els.date.value = '';
      applyFilters();
      render();
      closeModal();

      window.geoSave?.({ page: 'config', section: 'consumption', data: { name, type, amount, created_at }, ts: Date.now() });
      window.geoConsume?.({ event_type: 'save', page: 'config', action: 'add_row', units: 1, amount: 0 });
    });

    els.deleteBtn?.addEventListener('click', () => {
      const selected = Array.from(document.querySelectorAll('input.row-check:checked')).map((c) => c.getAttribute('data-id'));
      if (selected.length === 0) {
        alert('请先勾选要删除的记录');
        return;
      }
      state.all = state.all.filter((x) => !selected.includes(String(x.id)));
      applyFilters();
      render();
      window.geoConsume?.({ event_type: 'ui', page: 'config', action: 'bulk_delete', units: selected.length, amount: 0 });
    });

    els.backBtn?.addEventListener('click', () => {
      window.navigateTo?.('data-statistics');
    });

    requestData();
  },
  destroy() {
    if (Page._handler) window.removeEventListener('message', Page._handler);
    Page._handler = null;
  }
};

export default Page;
