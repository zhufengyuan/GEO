import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('问题词库管理');

    const table = document.getElementById('tableBody');
    const addBtn = document.getElementById('addBtn');
    const exportBtn = document.getElementById('exportBtn');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const searchBtn = document.getElementById('searchBtn');
    const keywordInput = document.getElementById('keywordInput');
    const scopeSelect = document.getElementById('scopeSelect');
    const selectAll = document.getElementById('selectAll');
    const modal = document.getElementById('qbMgrModal');
    const modalClose = document.getElementById('qbMgrModalClose');
    const modalCancel = document.getElementById('qbMgrModalCancel');
    const modalSave = document.getElementById('qbMgrModalSave');
    const modalCompany = document.getElementById('qbMgrCompany');
    const modalKeyword = document.getElementById('qbMgrKeyword');
    const modalQuestionKeyword = document.getElementById('qbMgrQuestionKeyword');
    const modalStage = document.getElementById('qbMgrStage');
    const modalExpandWords = document.getElementById('qbMgrExpandWords');

    const state = {
      items: [],
      filtered: [],
      keyword: '',
      stage: 'all',
      selected: new Set(),
      currentPage: 1,
      pageSize: 12
    };

    const toText = (v) => String(v || '').replace(/\s+/g, ' ').trim();
    const fmtDate = (v) => {
      const s = String(v || '').trim();
      if (!s) return '';
      return s.slice(0, 10);
    };

    // 决策阶段英文值映射到中文显示
    const stageMap = {
      'awareness': '认知触发',
      'cognition': '认知触发',
      'cognitive': '认知触发',
      'comparison': '对比筛选',
      'compare': '对比筛选',
      'locking': '锁定意向',
      'lock': '锁定意向',
      'intention': '锁定意向',
      'verification': '求证决策',
      'verify': '求证决策',
      'decision': '求证决策',
      'risk': '风险权衡犹豫',
      'hesitation': '风险权衡犹豫',
      'order': '最终下单履约',
      'purchase': '最终下单履约'
    };
    const toStageCn = (v) => {
      const s = toText(v).toLowerCase();
      if (!s) return '-';
      // 如果已经是中文，直接返回
      if (/[\u4e00-\u9fa5]/.test(s)) return s;
      return stageMap[s] || s;
    };

    const toExpandWord = (words) => {
      const w = words && typeof words === 'object' ? words : {};
      const parts = [
        w.region,
        w.feature,
        w.attribute,
        w.scene,
        w.people,
        w.pain,
        w.price,
        w.other
      ]
        .map((x) => toText(x))
        .filter(Boolean);
      return parts.join('、');
    };

    const buildPreviewQuestion = (it) => {
      const kw = toText(it.industry_keyword);
      const stage = toStageCn(it.decision_stage);
      const company = toText(it.company);
      if (stage.includes('认知')) return `想买${kw}，应该怎么选？`;
      if (stage.includes('对比')) return `${company}的${kw}和同类相比优势在哪里？`;
      if (stage.includes('锁定')) return `已经看中${company}的${kw}，还需要确认哪些细节？`;
      if (stage.includes('求证')) return `${company}的${kw}值不值得买？`;
      return `${kw}怎么选？`;
    };

    const applyFilter = () => {
      const kw = toText(state.keyword);
      const stage = toText(state.stage);
      state.filtered = (state.items || []).filter((x) => {
        const xStage = toStageCn(x.decision_stage);
        if (stage && stage !== 'all' && xStage !== stage) return false;
        if (!kw) return true;
        const hay = `${toText(x.name)} ${toText(x.company)} ${toText(x.industry_keyword)} ${toText(x.expand_words)} ${xStage} ${toText(x.question_keyword)} ${toExpandWord(x.words)}`.toLowerCase();
        return hay.includes(kw.toLowerCase());
      });
      state.currentPage = 1;
    };

    const renderPagination = () => {
      const paginationEl = document.getElementById('qbPagination');
      if (!paginationEl) return;
      const total = state.filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
      const current = Math.min(state.currentPage, totalPages);
      state.currentPage = current;

      if (total <= state.pageSize) {
        paginationEl.innerHTML = '';
        return;
      }

      let html = `<div class="qb-pagination">`;
      html += `<span class="qb-page-info">共 ${total} 条，第 ${current}/${totalPages} 页</span>`;
      html += `<button class="qb-page-btn" data-page="prev" ${current <= 1 ? 'disabled' : ''}>上一页</button>`;
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
          html += `<button class="qb-page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === current - 3 || i === current + 3) {
          html += `<span class="qb-page-ellipsis">...</span>`;
        }
      }
      html += `<button class="qb-page-btn" data-page="next" ${current >= totalPages ? 'disabled' : ''}>下一页</button>`;
      html += `</div>`;
      paginationEl.innerHTML = html;
    };

    const render = () => {
      if (!table) return;
      const list = Array.isArray(state.filtered) ? state.filtered : [];
      if (!list.length) {
        table.innerHTML = `<tr><td colspan="11" class="empty">暂无数据</td></tr>`;
        if (selectAll) {
          selectAll.checked = false;
          selectAll.indeterminate = false;
        }
        renderPagination();
        return;
      }
      const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
      const current = Math.min(state.currentPage, totalPages);
      state.currentPage = current;
      const start = (current - 1) * state.pageSize;
      const pageItems = list.slice(start, start + state.pageSize);

      const visibleIds = new Set(pageItems.map((x) => String(x.id)));
      Array.from(state.selected).forEach((id) => {
        if (!visibleIds.has(String(id))) state.selected.delete(id);
      });
      table.innerHTML = pageItems
        .map((it, idx) => {
          const expandWord = toText(it.expand_words) || toExpandWord(it.words);
          const q = toText(it.question_keyword) || toText(it.industry_keyword);
          const checked = state.selected.has(String(it.id)) ? 'checked' : '';
          const globalIdx = start + idx + 1;
          return `<tr data-id="${it.id}">
            <td style="text-align:center;"><input type="checkbox" data-role="row-select" ${checked} /></td>
            <td style="text-align:center;">${globalIdx}</td>
            <td>${toText(it.industry_keyword)}</td>
            <td class="cell-wrap">${expandWord || '-'}</td>
            <td>${toStageCn(it.decision_stage)}</td>
            <td>${q}</td>
            <td>${fmtDate(it.created_at)}</td>
            <td>已保存</td>
            <td><button class="op" data-action="write">去创作</button></td>
            <td><button class="op" data-action="edit">编辑</button></td>
            <td><button class="op op-danger" data-action="delete">删除</button></td>
          </tr>`;
        })
        .join('');
      const selCount = Array.from(state.selected).length;
      if (selectAll) {
        selectAll.checked = selCount > 0 && selCount === pageItems.length;
        selectAll.indeterminate = selCount > 0 && selCount < pageItems.length;
      }
      renderPagination();
    };

    const requestList = () => {
      window.geoQueryQuestionLexicons?.({ limit: 200, ts: Date.now() });
    };

    const requestDelete = (ids) => {
      const idList = (Array.isArray(ids) ? ids : []).map((x) => String(x)).filter(Boolean);
      if (!idList.length) return;
      window.geoDeleteQuestionLexicons?.({ ids: idList, ts: Date.now() });
    };

    const loadXlsxLib = async () => {
      if (window.XLSX) return true;
      const loadScript = (src) => {
        return new Promise((resolve) => {
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          s.onload = () => resolve(true);
          s.onerror = () => resolve(false);
          document.head.appendChild(s);
        });
      };
      const okLocal = await loadScript('vendor/xlsx.full.min.js');
      if (okLocal && window.XLSX) return true;
      const okCdn = await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      return Boolean(okCdn && window.XLSX);
    };

    const exportExcel = async () => {
      const ok = await loadXlsxLib();
      if (!ok || !window.XLSX) {
        alert('未能加载 Excel 导出库。请检查网络，或将 xlsx.full.min.js 放到 www/vendor/ 目录下。');
        return;
      }
      const list = Array.isArray(state.filtered) ? state.filtered : [];
      const rows = list.map((it) => ({
        关键词: toText(it.industry_keyword),
        拓展词: toText(it.expand_words) || toExpandWord(it.words),
        决策阶段: toStageCn(it.decision_stage),
        问题关键词: toText(it.question_keyword) || toText(it.industry_keyword),
        创建时间: toText(it.created_at),
        状态: '已保存'
      }));
      const ws = window.XLSX.utils.json_to_sheet(rows, { header: ['关键词', '拓展词', '决策阶段', '问题关键词', '创建时间', '状态'] });
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, '问题词库');
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const fname = `问题词库管理_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xlsx`;
      window.XLSX.writeFile(wb, fname);
    };

    const openModal = () => modal?.classList.add('show');
    const closeModal = () => modal?.classList.remove('show');
    modalClose?.addEventListener('click', closeModal);
    modalCancel?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    const saveFromModal = () => {
      const keyword = toText(modalKeyword?.value || '');
      if (!keyword) {
        alert('请填写关键词。');
        return;
      }
      const company = toText(modalCompany?.value || '');
      const stage = toText(modalStage?.value || '') || '认知触发';
      const questionKeyword = toText(modalQuestionKeyword?.value || '') || keyword;
      const expandWords = toText(modalExpandWords?.value || '');
      window.geoSave?.({
        page: 'question-bank',
        action: 'create',
        data: {
          name: `${company || '未命名'}-${keyword}-${stage}`,
          company,
          industry_keyword: keyword,
          question_keyword: questionKeyword,
          decision_stage: stage,
          expand_words: expandWords,
          words: {}
        },
        ts: Date.now()
      });
      closeModal();
      setTimeout(requestList, 1200);
    };
    modalSave?.addEventListener('click', saveFromModal);

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'geo_question_lexicons_data') return;
      const items = Array.isArray(d.payload?.items) ? d.payload.items : [];
      state.items = items;
      applyFilter();
      render();
    };
    Page._handler = onMessage;
    window.addEventListener('message', onMessage);
    Page._cleanup = () => {
      if (Page._handler) window.removeEventListener('message', Page._handler);
      Page._handler = null;
    };

    addBtn?.addEventListener('click', () => {
      if (modalCompany) modalCompany.value = localStorage.getItem('qb_company') || '';
      if (modalKeyword) modalKeyword.value = '';
      if (modalQuestionKeyword) modalQuestionKeyword.value = localStorage.getItem('qb_industry_keyword') || '';
      if (modalStage) modalStage.value = localStorage.getItem('qb_decision_stage') || '认知触发';
      if (modalExpandWords) modalExpandWords.value = '';
      openModal();
    });

    exportBtn?.addEventListener('click', () => {
      exportExcel();
    });

    searchBtn?.addEventListener('click', () => {
      state.keyword = toText(keywordInput?.value || '');
      applyFilter();
      render();
    });

    selectAll?.addEventListener('change', () => {
      const list = Array.isArray(state.filtered) ? state.filtered : [];
      const start = (state.currentPage - 1) * state.pageSize;
      const pageItems = list.slice(start, start + state.pageSize);
      if (selectAll.checked) {
        pageItems.forEach((x) => state.selected.add(String(x.id)));
      } else {
        pageItems.forEach((x) => state.selected.delete(String(x.id)));
      }
      render();
    });

    // 分页控件点击事件（事件委托）
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const pageBtn = target.closest('.qb-page-btn');
      if (!pageBtn) return;
      const pageAttr = pageBtn.getAttribute('data-page');
      if (!pageAttr) return;
      const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
      let newPage = state.currentPage;
      if (pageAttr === 'prev') newPage = Math.max(1, state.currentPage - 1);
      else if (pageAttr === 'next') newPage = Math.min(totalPages, state.currentPage + 1);
      else newPage = parseInt(pageAttr, 10) || 1;
      if (newPage !== state.currentPage && newPage >= 1 && newPage <= totalPages) {
        state.currentPage = newPage;
        render();
      }
    });

    bulkDeleteBtn?.addEventListener('click', () => {
      const ids = Array.from(state.selected);
      if (!ids.length) {
        alert('请先勾选要删除的关键词行。');
        return;
      }
      if (!confirm(`确认删除已勾选的 ${ids.length} 行？`)) return;
      requestDelete(ids);
    });

    table?.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target instanceof HTMLInputElement && target.getAttribute('data-role') === 'row-select') return;
      const action = target.getAttribute('data-action');
      if (!action) return;
      if (action === 'write') {
        const tr = target.closest('tr');
        const id = tr?.getAttribute('data-id') || '';
        if (id) localStorage.setItem('aw_prefill_lexicon_id', id);
        window.navigateTo?.('article-writing');
      }
      if (action === 'edit') alert('编辑：后续打开编辑弹窗。');
      if (action === 'delete') {
        const tr = target.closest('tr');
        const id = tr?.getAttribute('data-id') || '';
        if (!id) return;
        if (!confirm('确认删除该行？')) return;
        requestDelete([id]);
      }
    });

    table?.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.getAttribute('data-role') !== 'row-select') return;
      const tr = target.closest('tr');
      const id = tr?.getAttribute('data-id') || '';
      if (!id) return;
      if (target.checked) state.selected.add(String(id));
      else state.selected.delete(String(id));
      render();
    });

    scopeSelect?.addEventListener('change', () => {
      state.stage = toText(scopeSelect?.value || 'all') || 'all';
      applyFilter();
      render();
    });
    keywordInput?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      state.keyword = toText(keywordInput?.value || '');
      applyFilter();
      render();
    });

    const onDeleteResult = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'geo_delete_question_lexicons_result') return;
      if (d.payload?.ok) {
        const ids = Array.isArray(d.payload?.ids) ? d.payload.ids : [];
        ids.forEach((x) => state.selected.delete(String(x)));
        requestList();
      } else {
        alert(d.payload?.error || '删除失败');
      }
    };
    window.addEventListener('message', onDeleteResult);
    const cleanupPrev = Page._cleanup;
    Page._cleanup = () => {
      if (cleanupPrev) cleanupPrev();
      window.removeEventListener('message', onDeleteResult);
    };

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
