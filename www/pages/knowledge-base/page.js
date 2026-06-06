import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('企业知识库');

    const root = document.querySelector('.page-center');
    if (!root) return;

    const tabs = root.querySelectorAll('.kb-tab');
    const panels = root.querySelectorAll('.kb-panel');

    const setPanel = (key) => {
      if (!key) return;
      const target = root.querySelector(`.kb-tab[data-tab="${key}"]`);
      if (!target) return;
      tabs.forEach((t) => t.classList.toggle('active', t === target));
      panels.forEach((p) => p.classList.toggle('hidden', p.getAttribute('data-panel') !== key));
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const key = tab.getAttribute('data-tab');
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        panels.forEach((p) => {
          p.classList.toggle('hidden', p.getAttribute('data-panel') !== key);
        });
      });
    });

    const pageKey = document.getElementById('contentBody')?.dataset?.page || '';
    const map = {
      'image-library': 'images',
      'product-library': 'products',
      'import-urls': 'website',
      'import-files': 'files'
    };
    setPanel(map[pageKey] || 'base');

    const pickerMode = String(localStorage.getItem('aw_picker_mode') || '').trim();
    const pickerReturn = String(localStorage.getItem('aw_picker_return') || 'article-writing').trim() || 'article-writing';
    const isProductPicker = pickerMode === 'product' && pageKey === 'product-library';
    const isImagePicker = pickerMode === 'images' && pageKey === 'image-library';

    const cleanupPicker = () => {
      try {
        localStorage.removeItem('aw_picker_mode');
        localStorage.removeItem('aw_picker_return');
      } catch {
      }
    };

    const imgCategoryWrap = document.getElementById('imgCategoryWrap');
    const imgListWrap = document.getElementById('imgListWrap');
    const backToCategoryBtn = document.getElementById('backToCategoryBtn');
    const editImageCategoryBtn = document.getElementById('editImageCategoryBtn');
    const deleteImageCategoryBtn = document.getElementById('deleteImageCategoryBtn');
    const addImageCategoryBtn = document.getElementById('addImageCategoryBtn');
    const imgCatCheckAll = document.getElementById('imgCatCheckAll');
    const imgCategoryTable = document.getElementById('imgCategoryTable');
    const imgListTable = document.getElementById('imgListTable');
    const imgFileInput = document.getElementById('imgFileInput');
    const ocrHintModal = document.getElementById('ocrHintModal');
    const importModal = document.getElementById('importModal');
    const openImportModal = () => importModal?.classList.add('show');
    const closeImportModal = () => importModal?.classList.remove('show');
    const openOcrHint = () => ocrHintModal?.classList.add('show');
    const closeOcrHint = () => ocrHintModal?.classList.remove('show');
    const withOcrHint = () => {
      return new Promise((resolve) => {
        const okBtn = document.getElementById('ocrHintOk');
        const cancelBtn = document.getElementById('ocrHintCancel');
        const closeBtn = document.getElementById('ocrHintClose');
        const cleanup = () => {
          okBtn?.removeEventListener('click', onOk);
          cancelBtn?.removeEventListener('click', onCancel);
          closeBtn?.removeEventListener('click', onCancel);
          ocrHintModal?.removeEventListener('click', onMask);
        };
        const onOk = () => {
          cleanup();
          closeOcrHint();
          resolve(true);
        };
        const onCancel = () => {
          cleanup();
          closeOcrHint();
          resolve(false);
        };
        const onMask = (e) => {
          if (e.target === ocrHintModal) onCancel();
        };
        okBtn?.addEventListener('click', onOk);
        cancelBtn?.addEventListener('click', onCancel);
        closeBtn?.addEventListener('click', onCancel);
        ocrHintModal?.addEventListener('click', onMask);
        openOcrHint();
      });
    };

    let importMode = '';
    const withImportModal = (mode) => {
      importMode = String(mode || '').trim();
      return new Promise((resolve) => {
        const title = document.getElementById('importModalTitle');
        const text = document.getElementById('importModalText');
        if (title) {
          title.textContent = importMode === 'website' ? '导入网址' : (importMode === 'files' ? '导入文件' : (importMode === 'product' ? '插入图片' : '添加图片'));
        }
        if (text) {
          text.textContent = '请选择方式继续';
        }

        const uploadBtn = document.getElementById('importUploadBtn');
        const importBtn = document.getElementById('importFromBtn');
        const cancelBtn = document.getElementById('importCancelBtn');
        const closeBtn = document.getElementById('importModalClose');

        const cleanup = () => {
          uploadBtn?.removeEventListener('click', onUpload);
          importBtn?.removeEventListener('click', onImport);
          cancelBtn?.removeEventListener('click', onCancel);
          closeBtn?.removeEventListener('click', onCancel);
          importModal?.removeEventListener('click', onMask);
        };
        const onUpload = () => {
          cleanup();
          closeImportModal();
          resolve('upload');
        };
        const onImport = () => {
          cleanup();
          closeImportModal();
          resolve('import');
        };
        const onCancel = () => {
          cleanup();
          closeImportModal();
          resolve('');
        };
        const onMask = (e) => {
          if (e.target === importModal) onCancel();
        };

        uploadBtn?.addEventListener('click', onUpload);
        importBtn?.addEventListener('click', onImport);
        cancelBtn?.addEventListener('click', onCancel);
        closeBtn?.addEventListener('click', onCancel);
        importModal?.addEventListener('click', onMask);
        openImportModal();
      });
    };

    const imgState = {
      categories: [
        { id: 'c1', name: '活动', remark: '', created_at: '2026-05-01 10:00' },
        { id: 'c2', name: '产品', remark: '', created_at: '2026-05-01 10:00' },
        { id: 'c3', name: '资质', remark: '', created_at: '2026-05-01 10:00' },
        { id: 'c4', name: '案例', remark: '', created_at: '2026-05-01 10:00' }
      ],
      selectedCategoryId: null,
      images: []
    };

    let imgPersistTimer = null;
    const persistImages = () => {
      window.geoSave?.({
        page: 'knowledge-base',
        section: 'images',
        data: { categories: imgState.categories, images: imgState.images },
        ts: Date.now()
      });
    };
    const schedulePersistImages = () => {
      try {
        if (imgPersistTimer) window.clearTimeout(imgPersistTimer);
        imgPersistTimer = window.setTimeout(() => {
          persistImages();
        }, 400);
      } catch {
      }
    };

    const getSelectedCategoryIds = () => {
      return Array.from(imgCategoryTable?.querySelectorAll('input[type="checkbox"][data-id]:checked') || [])
        .map((el) => el.getAttribute('data-id'))
        .filter(Boolean);
    };

    const syncCatCheckAll = () => {
      if (!(imgCatCheckAll instanceof HTMLInputElement)) return;
      const boxes = Array.from(imgCategoryTable?.querySelectorAll('input[type="checkbox"][data-id]') || []);
      const checked = boxes.filter((b) => b instanceof HTMLInputElement && b.checked).length;
      imgCatCheckAll.checked = boxes.length > 0 && checked === boxes.length;
      imgCatCheckAll.indeterminate = checked > 0 && checked < boxes.length;
    };

    const escapeHtml = (s) => {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const showCategoryView = () => {
      imgCategoryWrap?.classList.remove('hidden');
      imgListWrap?.classList.add('hidden');
      backToCategoryBtn?.classList.add('hidden');
      editImageCategoryBtn?.classList.remove('hidden');
      deleteImageCategoryBtn?.classList.remove('hidden');
      if (addImageCategoryBtn) addImageCategoryBtn.textContent = '添加分类+';
      imgState.selectedCategoryId = null;
    };

    const showListView = () => {
      imgCategoryWrap?.classList.add('hidden');
      imgListWrap?.classList.remove('hidden');
      backToCategoryBtn?.classList.remove('hidden');
      editImageCategoryBtn?.classList.add('hidden');
      deleteImageCategoryBtn?.classList.add('hidden');
      if (addImageCategoryBtn) addImageCategoryBtn.textContent = '添加图片+';
    };

    const renderCategories = () => {
      if (!imgCategoryTable) return;
      if (!imgState.categories.length) {
        imgCategoryTable.innerHTML = `<tr><td colspan="7" class="empty">请先添加分类</td></tr>`;
        syncCatCheckAll();
        return;
      }
      imgCategoryTable.innerHTML = imgState.categories
        .map((c, idx) => {
          const useCount = imgState.images
            .filter((x) => x.category_id === c.id)
            .reduce((sum, x) => sum + (Number(x.use_count) || 0), 0);
          return `<tr>
            <td><input type="checkbox" data-id="${escapeHtml(c.id)}" /></td>
            <td>${idx + 1}</td>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.created_at)}</td>
            <td><input class="kb-input" data-action="cat-remark" data-id="${escapeHtml(c.id)}" value="${escapeHtml(c.remark || '')}" placeholder="请输入备注" /></td>
            <td>
              ${useCount}
            </td>
            <td>
              <button class="op" data-action="browse" data-id="${escapeHtml(c.id)}">${isImagePicker ? '进入' : '添加图片'}</button>
            </td>
          </tr>`;
        })
        .join('');
      syncCatCheckAll();
    };

    const renderImageList = () => {
      if (!imgListTable) return;
      const catId = imgState.selectedCategoryId;
      const cat = imgState.categories.find((x) => x.id === catId);
      const list = imgState.images.filter((x) => x.category_id === catId);
      if (!cat) {
        imgListTable.innerHTML = `<tr><td colspan="8" class="empty">请先添加分类</td></tr>`;
        return;
      }
      if (!list.length) {
        imgListTable.innerHTML = `<tr><td colspan="8" class="empty">暂无图片</td></tr>`;
        return;
      }
      imgListTable.innerHTML = list
        .map((it, idx) => {
          const picked = it && String(it.id || '') && isImagePicker && pickedImageIds.has(String(it.id));
          return `<tr>
            <td><input type="checkbox" ${isImagePicker ? `data-id="${escapeHtml(it.id)}"` : ''} ${picked ? 'checked' : ''} /></td>
            <td>${idx + 1}</td>
            <td>${escapeHtml(cat.name)}</td>
            <td>${escapeHtml(it.name || '—')}</td>
            <td>${it.use_count || 0}</td>
            <td>${escapeHtml(it.created_at)}</td>
            <td><input class="kb-input" data-action="remark" data-id="${escapeHtml(it.id)}" value="${escapeHtml(it.remark || '')}" placeholder="请输入备注" /></td>
            <td>${isImagePicker ? '' : `<button class="op op-danger" data-action="delete-img" data-id="${escapeHtml(it.id)}">删除</button>`}</td>
          </tr>`;
        })
        .join('');
    };

    backToCategoryBtn?.addEventListener('click', () => {
      showCategoryView();
      renderCategories();
    });

    const collectBasePayload = () => {
      const data = {};

      const table = root.querySelector('.kb-table');
      if (table) {
        table.querySelectorAll('tr').forEach((tr) => {
          const tds = Array.from(tr.querySelectorAll('td'));
          for (let i = 0; i < tds.length; i += 2) {
            const labelTd = tds[i];
            const fieldTd = tds[i + 1];
            if (!labelTd || !fieldTd) continue;
            const input = fieldTd.querySelector('input, textarea, select');
            if (!input) continue;

            const keyAttr = labelTd.getAttribute?.('data-kb-key');
            const key = String(keyAttr || (labelTd.textContent || ''))
              .replace(/\s+/g, '')
              .replace(/[：:（）()]/g, '')
              .replace(/^\*+/, '');
            if (!key) continue;
            data[key] = input.value;
          }
        });
      }

      root.querySelectorAll('.kb-block').forEach((block) => {
        const title = (block.querySelector('.kb-block-title')?.textContent || '')
          .trim()
          .replace(/[：:]/g, '');
        const textarea = block.querySelector('textarea');
        if (!title || !textarea) return;
        data[title] = textarea.value;
      });

      return {
        page: 'knowledge-base',
        section: '企业基础信息',
        data,
        ts: Date.now()
      };
    };

    root.querySelectorAll('button.kb-save').forEach((btn) => {
      btn.addEventListener('click', () => {
        const payload = collectBasePayload();
        try {
          const company = String(payload?.data?.企业全称 || payload?.data?.企业简称 || '').trim();
          if (company) localStorage.setItem('kb_company_name', company);
        } catch {
        }
        window.geoSave?.(payload);
      });
    });

    document.getElementById('saveBaseBtn')?.addEventListener('click', () => {
      const payload = collectBasePayload();
      try {
        const company = String(payload?.data?.企业全称 || payload?.data?.企业简称 || '').trim();
        if (company) localStorage.setItem('kb_company_name', company);
      } catch {
      }
      window.geoSave?.(payload);
    });

    const modal = document.getElementById('imgModal');
    const imgModalTitle = document.getElementById('imgModalTitle');
    let imgModalMode = 'add';
    let imgEditingId = null;
    const openModal = () => modal?.classList.add('show');
    const closeModal = () => modal?.classList.remove('show');
    addImageCategoryBtn?.addEventListener('click', () => {
      if (imgState.selectedCategoryId) {
        withImportModal('images').then((action) => {
          if (action === 'upload') {
            withOcrHint().then((ok) => {
              if (ok) imgFileInput?.click();
            });
            return;
          }
          if (action === 'import') {
            alert('导入：后续接入。');
          }
        });
        return;
      }
      imgModalMode = 'add';
      imgEditingId = null;
      if (imgModalTitle) imgModalTitle.textContent = '添加分类';
      const input = document.getElementById('imgCategoryName');
      if (input) input.value = '';
      openModal();
    });
    document.getElementById('imgModalClose')?.addEventListener('click', closeModal);
    document.getElementById('imgCancelBtn')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    imgFileInput?.addEventListener('change', () => {
      const catId = imgState.selectedCategoryId;
      if (!catId) return;
      if (!(imgFileInput instanceof HTMLInputElement)) return;
      const files = Array.from(imgFileInput.files || []);
      if (!files.length) return;
      const now = new Date();
      files.forEach((f, i) => {
        imgState.images.push({
          id: `img_${Date.now()}_${i}`,
          category_id: catId,
          name: f.name,
          use_count: 0,
          remark: '',
          created_at: now.toISOString().slice(0, 16).replace('T', ' ')
        });
      });
      imgFileInput.value = '';
      renderImageList();
      renderCategories();
      schedulePersistImages();
      window.geoConsume?.({ event_type: 'save', page: 'knowledge-base', action: 'img_add', units: files.length, amount: 0 });
    });

    const savePanelPayload = (panel, extra = {}) => {
      const panelEl = root.querySelector(`.kb-panel[data-panel="${panel}"]`);
      if (!panelEl) return null;
      return {
        page: 'knowledge-base',
        section: panel,
        data: extra,
        ts: Date.now()
      };
    };

    document.getElementById('imgConfirmBtn')?.addEventListener('click', () => {
      const name = document.getElementById('imgCategoryName')?.value || '';
      const trimmed = name.trim();
      if (trimmed) {
        if (imgModalMode === 'edit' && imgEditingId) {
          const cat = imgState.categories.find((x) => x.id === imgEditingId);
          if (cat) cat.name = trimmed;
          schedulePersistImages();
          window.geoConsume?.({ event_type: 'ui', page: 'knowledge-base', action: 'img_cat_edit', units: 1, amount: 0 });
        } else {
          imgState.categories.push({
            id: `c_${Date.now()}`,
            name: trimmed,
            remark: '',
            created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
          });
          schedulePersistImages();
          window.geoConsume?.({ event_type: 'ui', page: 'knowledge-base', action: 'img_cat_add', units: 1, amount: 0 });
        }
        renderCategories();
      }
      closeModal();
    });

    editImageCategoryBtn?.addEventListener('click', () => {
      const ids = getSelectedCategoryIds();
      if (ids.length !== 1) {
        alert('请选择一条分类进行编辑');
        return;
      }
      const cat = imgState.categories.find((x) => x.id === ids[0]);
      if (!cat) return;
      imgModalMode = 'edit';
      imgEditingId = cat.id;
      if (imgModalTitle) imgModalTitle.textContent = '编辑分类';
      const input = document.getElementById('imgCategoryName');
      if (input) input.value = cat.name;
      openModal();
    });

    deleteImageCategoryBtn?.addEventListener('click', () => {
      const ids = getSelectedCategoryIds();
      if (!ids.length) {
        alert('请先勾选要删除的分类');
        return;
      }
      const ok = confirm(`确认删除选中的 ${ids.length} 个分类？`);
      if (!ok) return;
      imgState.categories = imgState.categories.filter((x) => !ids.includes(x.id));
      imgState.images = imgState.images.filter((x) => !ids.includes(x.category_id));
      if (ids.includes(imgState.selectedCategoryId)) {
        showCategoryView();
      }
      renderCategories();
      renderImageList();
      schedulePersistImages();
      window.geoConsume?.({ event_type: 'ui', page: 'knowledge-base', action: 'img_cat_delete', units: ids.length, amount: 0 });
    });

    imgCatCheckAll?.addEventListener('change', () => {
      const checked = Boolean(imgCatCheckAll.checked);
      imgCategoryTable?.querySelectorAll('input[type="checkbox"][data-id]').forEach((el) => {
        if (el instanceof HTMLInputElement) el.checked = checked;
      });
      syncCatCheckAll();
    });

    imgCategoryTable?.addEventListener('click', (e) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      const btn = target.closest('button[data-action]');
      const action = btn?.getAttribute('data-action');
      const id = btn?.getAttribute('data-id');
      if (!action || !id) return;
      const cat = imgState.categories.find((x) => x.id === id);
      if (!cat) return;
      if (action === 'browse') {
        imgState.selectedCategoryId = id;
        showListView();
        renderImageList();
      }
      window.geoConsume?.({ event_type: 'ui', page: 'knowledge-base', action: `img_cat_${action}`, units: 1, amount: 0 });
    });

    imgCategoryTable?.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches('input[type="checkbox"][data-id]')) return;
      syncCatCheckAll();
    });

    imgCategoryTable?.addEventListener('input', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.getAttribute('data-action') !== 'cat-remark') return;
      const id = target.getAttribute('data-id');
      const cat = imgState.categories.find((x) => x.id === id);
      if (!cat) return;
      cat.remark = target.value;
      schedulePersistImages();
    });

    imgListTable?.addEventListener('click', (e) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      const btn = target.closest('button[data-action="delete-img"]');
      const id = btn?.getAttribute('data-id');
      if (!id) return;
      imgState.images = imgState.images.filter((x) => x.id !== id);
      const cat = imgState.categories.find((x) => x.id === imgState.selectedCategoryId);
      if (cat) cat.count = imgState.images.filter((x) => x.category_id === cat.id).length;
      renderImageList();
      renderCategories();
      schedulePersistImages();
    });

    imgListTable?.addEventListener('input', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.getAttribute('data-action') !== 'remark') return;
      const id = target.getAttribute('data-id');
      const it = imgState.images.find((x) => x.id === id);
      if (!it) return;
      it.remark = target.value;
      schedulePersistImages();
    });

    renderCategories();

    const pickedImageIds = new Set();
    const pickedImageLimit = 3;
    let pickerDoneBtn = null;
    const refreshPickedCount = () => {
      if (!pickerDoneBtn) return;
      pickerDoneBtn.textContent = `完成选择（${pickedImageIds.size}/${pickedImageLimit}）`;
    };

    if (isImagePicker) {
      const panel = root.querySelector('.kb-panel[data-panel="images"]');
      const title = panel?.querySelector('.page-title');
      if (title) title.textContent = '选择图片';
      addImageCategoryBtn?.classList.add('hidden');
      editImageCategoryBtn?.classList.add('hidden');
      deleteImageCategoryBtn?.classList.add('hidden');
      imgCatCheckAll?.classList.add('hidden');

      const right = panel?.querySelector('.u-right');
      if (right) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-primary';
        cancelBtn.textContent = '返回';
        cancelBtn.addEventListener('click', () => {
          cleanupPicker();
          window.navigateTo?.(pickerReturn);
        });

        pickerDoneBtn = document.createElement('button');
        pickerDoneBtn.className = 'btn-solid';
        pickerDoneBtn.textContent = '完成选择（0/3）';
        pickerDoneBtn.addEventListener('click', () => {
          const ids = Array.from(pickedImageIds);
          const items = ids
            .map((id) => {
              const it = imgState.images.find((x) => String(x.id) === String(id));
              if (!it) return null;
              const cat = imgState.categories.find((c) => c.id === it.category_id);
              return {
                id: it.id,
                name: it.name || '',
                category: cat?.name || '',
                created_at: it.created_at || ''
              };
            })
            .filter(Boolean);
          try {
            localStorage.setItem('aw_selected_images_v1', JSON.stringify(items));
          } catch {
          }
          cleanupPicker();
          window.navigateTo?.(pickerReturn);
        });
        right.appendChild(pickerDoneBtn);
        right.appendChild(cancelBtn);
      }
      refreshPickedCount();
    }

    imgListTable?.addEventListener('change', (e) => {
      if (!isImagePicker) return;
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== 'checkbox') return;
      const id = String(target.getAttribute('data-id') || '').trim();
      if (!id) return;
      if (target.checked) {
        if (pickedImageIds.size >= pickedImageLimit) {
          target.checked = false;
          alert('最多只能选择3张图片');
          return;
        }
        pickedImageIds.add(id);
      } else {
        pickedImageIds.delete(id);
      }
      refreshPickedCount();
    });

    document.getElementById('saveProductBtn')?.addEventListener('click', () => {
      const rows = [];
      root.querySelectorAll('.kb-panel[data-panel="products"] tbody tr').forEach((tr) => {
        const tds = Array.from(tr.querySelectorAll('td'));
        if (tds.length < 13) return;
        const getInput = (i) => tds[i]?.querySelector('input')?.value || '';
        const seq = (tds[0]?.textContent || '').trim();
        const imgCell = tds[1]?.querySelector('.pimg-cell');
        const imgUrls = Array.from(imgCell?.querySelectorAll('.pimg-grid img') || [])
          .map((img) => String(img.getAttribute('src') || '').trim())
          .filter(Boolean)
          .slice(0, 9);
        const precise_product_name = getInput(2);
        const core_material = getInput(3);
        const core_features = getInput(4);
        const core_params = getInput(5);
        const use_scenarios = getInput(6);
        const core_advantages = getInput(7);
        const target_audience = getInput(8);
        const customization_capability = getInput(9);
        const target_market = getInput(10);
        rows.push({
          seq,
          images: imgUrls,
          precise_product_name,
          core_material,
          core_features,
          core_params,
          core_advantages,
          use_scenarios,
          target_audience,
          target_market,
          customization_capability,
          product_name: precise_product_name,
          material: core_material,
          specs: core_params,
          craft: core_features,
          advantages: core_advantages,
          core_function: '',
          use_scene: use_scenarios,
          target_group: target_audience,
          origin: target_market,
          delivery: customization_capability,
          others: ''
        });
      });
      window.geoSave?.(savePanelPayload('products', { action: 'save', rows }));
    });

    if (isProductPicker) {
      const panel = root.querySelector('.kb-panel[data-panel="products"]');
      const title = panel?.querySelector('.page-title');
      if (title) title.textContent = '选择产品';
      document.getElementById('importProductBtn')?.classList.add('hidden');
      document.getElementById('saveProductBtn')?.classList.add('hidden');

      const right = panel?.querySelector('.u-right');
      if (right) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-primary';
        cancelBtn.textContent = '返回';
        cancelBtn.addEventListener('click', () => {
          cleanupPicker();
          window.navigateTo?.(pickerReturn);
        });
        right.appendChild(cancelBtn);
      }

      const ths = panel?.querySelectorAll('thead th') || [];
      if (ths[11]) ths[11].textContent = '选择';
      if (ths[12]) ths[12].textContent = '';
    }

    const productImageInput = document.getElementById('productImageInput');
    let activeImgCell = null;

    const renderThumb = (cell, src) => {
      const grid = cell.querySelector('.pimg-grid');
      if (!grid) return;
      const img = document.createElement('img');
      img.className = 'pimg-thumb';
      img.src = src;
      img.style.width = '32px';
      img.style.height = '32px';
      img.style.borderRadius = '8px';
      img.style.objectFit = 'cover';
      img.style.border = '1px solid rgba(15, 23, 42, 0.12)';
      img.style.cursor = 'pointer';
      img.title = '点击移除';
      grid.appendChild(img);
      const count = grid.querySelectorAll('img').length;
      cell.setAttribute('data-img-count', String(count));
    };

    root.querySelector('.kb-panel[data-panel="products"]')?.addEventListener('click', (e) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      const img = target.closest('.pimg-grid img');
      if (img && !isProductPicker) {
        const cell = img.closest('.pimg-cell');
        const grid = img.closest('.pimg-grid');
        img.remove();
        const count = grid?.querySelectorAll('img').length || 0;
        cell?.setAttribute('data-img-count', String(count));
        return;
      }

      const btn = target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (!action) return;

      if (isProductPicker) {
        if (action !== 'pick-product') return;
        const tr = btn.closest('tr');
        if (!tr) return;
        const tds = Array.from(tr.querySelectorAll('td'));
        const getInput = (i) => tds[i]?.querySelector('input')?.value || '';
        const imgCell = tds[1]?.querySelector('.pimg-cell');
        const imgUrls = Array.from(imgCell?.querySelectorAll('.pimg-grid img') || [])
          .map((img) => String(img.getAttribute('src') || '').trim())
          .filter(Boolean)
          .slice(0, 9);
        const data = {
          images: imgUrls,
          precise_product_name: getInput(2),
          core_material: getInput(3),
          core_features: getInput(4),
          core_params: getInput(5),
          use_scenarios: getInput(6),
          core_advantages: getInput(7),
          target_audience: getInput(8),
          customization_capability: getInput(9),
          target_market: getInput(10)
        };
        try {
          localStorage.setItem('aw_selected_product_v1', JSON.stringify(data));
          localStorage.setItem('aw_active_tab', 'product');
        } catch {
        }
        cleanupPicker();
        window.navigateTo?.(pickerReturn);
        return;
      }

      if (action !== 'insert-image') return;
      const cell = btn.closest('.pimg-cell');
      if (!cell || !productImageInput) return;
      const current = parseInt(cell.getAttribute('data-img-count') || '0', 10) || 0;
      if (current >= 9) {
        alert('每个产品最多9张图片');
        return;
      }
      activeImgCell = cell;
      withImportModal('product').then((action2) => {
        if (action2 === 'upload') {
          withOcrHint().then((ok) => {
            if (!ok) return;
            productImageInput.value = '';
            productImageInput.click();
          });
          return;
        }
        if (action2 === 'import') {
          alert('导入：后续接入。');
        }
      });
    });

    const pendingProductImageUpload = new Map();

    const uploadOneImage = (file) => {
      const reqId = `pimg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          pendingProductImageUpload.delete(reqId);
          resolve(null);
        }, 30000);
        pendingProductImageUpload.set(reqId, (info) => {
          clearTimeout(timer);
          resolve(info || null);
        });
        window.geoUploadFile?.({ req_id: reqId, file });
      });
    };

    const uploadAndInsertImages = async (cell, files) => {
      if (!cell) return;
      const grid = cell.querySelector('.pimg-grid');
      if (!grid) return;
      const existing = grid.querySelectorAll('img').length;
      const allowed = Array.from(files || []).slice(0, Math.max(0, 9 - existing));
      for (const f of allowed) {
        const info = await uploadOneImage(f);
        const url = String(info?.url || '').trim();
        if (!url) continue;
        renderThumb(cell, url);
      }
      window.geoConsume?.({ event_type: 'ui', page: 'knowledge-base', action: 'product_insert_image', units: allowed.length, amount: 0 });
    };

    productImageInput?.addEventListener('change', async () => {
      if (!activeImgCell) return;
      await uploadAndInsertImages(activeImgCell, productImageInput.files);
    });

    const timelineTable = document.getElementById('timelineTable');
    const setTimelineRows = (rows) => {
      if (!timelineTable) return;
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) {
        timelineTable.innerHTML = `
          <tr>
            <td><input class="kb-input" placeholder="1981-04" /></td>
            <td><input class="kb-input" placeholder="公司正式成立" /></td>
            <td>
              <button class="op" data-action="add">新增</button>
              <button class="op op-danger" data-action="delete">删除</button>
            </td>
          </tr>
        `;
        return;
      }
      timelineTable.innerHTML = list
        .map((r) => {
          const t = String(r?.time || '').trim();
          const e = String(r?.event || '').trim();
          return `
            <tr>
              <td><input class="kb-input" placeholder="YYYY-MM" value="${escapeHtml(t)}" /></td>
              <td><input class="kb-input" placeholder="事件描述" value="${escapeHtml(e)}" /></td>
              <td>
                <button class="op" data-action="add">新增</button>
                <button class="op op-danger" data-action="delete">删除</button>
              </td>
            </tr>
          `;
        })
        .join('');
    };

    const parseTimelineText = (text) => {
      const out = [];
      const lines = String(text || '')
        .split(/\r?\n+/)
        .map((x) => x.trim())
        .filter(Boolean);
      for (const raw of lines) {
        const line = raw.replace(/^\d+[\.\、\)]\s*/, '').trim();
        if (!line) continue;
        let parts = line.split(/[|｜\t]/).map((x) => x.trim()).filter(Boolean);
        if (parts.length < 2) {
          const idx = line.search(/[：:\-—]/);
          if (idx > 0) {
            parts = [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
          }
        }
        if (parts.length < 2) continue;
        const time = parts[0];
        const event = parts.slice(1).join(' ');
        if (!time || !event) continue;
        out.push({ time, event });
      }
      return out.slice(0, 20);
    };

    let kbReqSeq = 0;
    document.getElementById('genTimelineBtn')?.addEventListener('click', () => {
      kbReqSeq += 1;
      const req_id = `kb_${Date.now()}_${kbReqSeq}`;
      setTimelineRows([{ time: '生成中...', event: '请稍候' }]);
      window.geoAiExecute?.({ task: 'generate_kb_timeline', req_id });
      window.geoConsume?.({ event_type: 'ai_generate', page: 'knowledge-base', action: 'gen_timeline', units: 1, amount: 0 });
    });
    document.getElementById('saveTimelineBtn')?.addEventListener('click', () => {
      const rows = [];
      document.querySelectorAll('#timelineTable tr').forEach((tr) => {
        const tds = tr.querySelectorAll('td');
        const t = tds[0]?.querySelector('input')?.value || '';
        const e = tds[1]?.querySelector('input')?.value || '';
        if (t || e) rows.push({ time: t, event: e });
      });
      const company_profile = document.getElementById('companyProfile')?.value || '';
      const enterprise_library = document.getElementById('enterpriseLibrary')?.value || '';
      window.geoSave?.(savePanelPayload('docs', { company_profile, enterprise_library, timeline_rows: rows }));
    });
    document.getElementById('timelineTable')?.addEventListener('click', (e) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      const btn = target?.closest('button[data-action]');
      const action = btn?.getAttribute('data-action');
      if (!action) return;
      if (action === 'add') {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input class="kb-input" placeholder="YYYY-MM" /></td>
          <td><input class="kb-input" placeholder="事件描述" /></td>
          <td>
            <button class="op" data-action="add">新增</button>
            <button class="op op-danger" data-action="delete">删除</button>
          </td>
        `;
        document.getElementById('timelineTable')?.appendChild(tr);
      }
      if (action === 'delete') {
        btn.closest('tr')?.remove();
      }
    });
    document.getElementById('genProfileBtn')?.addEventListener('click', () => {
      kbReqSeq += 1;
      const req_id = `kb_${Date.now()}_${kbReqSeq}`;
      const el = document.getElementById('companyProfile');
      if (el) el.value = '生成中...';
      window.geoAiExecute?.({ task: 'generate_kb_profile', req_id });
      window.geoConsume?.({ event_type: 'ai_generate', page: 'knowledge-base', action: 'gen_profile', units: 1, amount: 0 });
    });
    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
      const company_profile = document.getElementById('companyProfile')?.value || '';
      const enterprise_library = document.getElementById('enterpriseLibrary')?.value || '';
      const rows = [];
      document.querySelectorAll('#timelineTable tr').forEach((tr) => {
        const tds = tr.querySelectorAll('td');
        const t = tds[0]?.querySelector('input')?.value || '';
        const e = tds[1]?.querySelector('input')?.value || '';
        if (t || e) rows.push({ time: t, event: e });
      });
      window.geoSave?.(savePanelPayload('docs', { company_profile, enterprise_library, timeline_rows: rows }));
    });
    document.getElementById('genLibraryBtn')?.addEventListener('click', () => {
      kbReqSeq += 1;
      const req_id = `kb_${Date.now()}_${kbReqSeq}`;
      const el = document.getElementById('enterpriseLibrary');
      if (el) el.value = '生成中...';
      window.geoAiExecute?.({ task: 'generate_kb_library', req_id });
      window.geoConsume?.({ event_type: 'ai_generate', page: 'knowledge-base', action: 'gen_library', units: 1, amount: 0 });
    });
    document.getElementById('saveLibraryBtn')?.addEventListener('click', () => {
      const company_profile = document.getElementById('companyProfile')?.value || '';
      const enterprise_library = document.getElementById('enterpriseLibrary')?.value || '';
      const rows = [];
      document.querySelectorAll('#timelineTable tr').forEach((tr) => {
        const tds = tr.querySelectorAll('td');
        const t = tds[0]?.querySelector('input')?.value || '';
        const e = tds[1]?.querySelector('input')?.value || '';
        if (t || e) rows.push({ time: t, event: e });
      });
      window.geoSave?.(savePanelPayload('docs', { company_profile, enterprise_library, timeline_rows: rows }));
    });
    document.getElementById('downloadLibraryBtn')?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ui', page: 'knowledge-base', action: 'download_library', units: 1, amount: 0 });
      const company_profile = document.getElementById('companyProfile')?.value || '';
      const enterprise_library = document.getElementById('enterpriseLibrary')?.value || '';
      window.geoDownloadEnterpriseIntroWord?.({ company_profile, enterprise_library, filename: '企业介绍' });
    });

    document.getElementById('genMainPositioningBtn')?.addEventListener('click', () => {
      kbReqSeq += 1;
      const req_id = `kb_${Date.now()}_${kbReqSeq}`;
      const el = document.getElementById('mainPositioning');
      if (el) el.value = '生成中...';
      window.geoAiExecute?.({ task: 'generate_kb_positioning_main', req_id });
      window.geoConsume?.({ event_type: 'ai_generate', page: 'knowledge-base', action: 'gen_main_positioning', units: 1, amount: 0 });
    });
    document.getElementById('genSubPositioningBtn')?.addEventListener('click', () => {
      kbReqSeq += 1;
      const req_id = `kb_${Date.now()}_${kbReqSeq}`;
      const el = document.getElementById('subPositioning');
      if (el) el.value = '生成中...';
      window.geoAiExecute?.({ task: 'generate_kb_positioning_sub', req_id });
      window.geoConsume?.({ event_type: 'ai_generate', page: 'knowledge-base', action: 'gen_sub_positioning', units: 1, amount: 0 });
    });
    document.getElementById('savePositioningBtn')?.addEventListener('click', () => {
      const main_positioning = document.getElementById('mainPositioning')?.value || '';
      const sub_positioning = document.getElementById('subPositioning')?.value || '';
      window.geoSave?.(savePanelPayload('positioning', { main_positioning, sub_positioning }));
    });

    document.getElementById('saveWebsiteBtn')?.addEventListener('click', () => {
      const urls = [];
      root.querySelectorAll('.kb-panel[data-panel="website"] .kb-input').forEach((i) => {
        if (i.value) urls.push(i.value);
      });
      window.geoSave?.(savePanelPayload('website', { action: 'save', urls }));
    });

    const websiteFileInput = document.getElementById('websiteFileInput');
    const fillWebsiteInputs = (urls) => {
      const list = Array.isArray(urls) ? urls : [];
      const inputs = Array.from(root.querySelectorAll('.kb-panel[data-panel="website"] .kb-input'));
      for (let i = 0; i < inputs.length; i += 1) {
        const v = list[i] || '';
        inputs[i].value = v;
      }
    };

    document.getElementById('importWebsiteBtn')?.addEventListener('click', () => {
      withImportModal('website').then((action) => {
        if (action === 'upload') {
          withOcrHint().then((ok) => {
            if (!ok) return;
            if (websiteFileInput instanceof HTMLInputElement) {
              websiteFileInput.value = '';
              websiteFileInput.click();
            }
          });
          return;
        }
        if (action === 'import') {
          const v = prompt('请粘贴网址链接（多个用分号/换行分隔）：', '');
          if (v == null) return;
          const urls = String(v || '')
            .split(/[\n\r;；,，]+/)
            .map((x) => x.trim())
            .filter(Boolean);
          fillWebsiteInputs(urls);
          window.geoSave?.(savePanelPayload('website', { action: 'import', urls }));
        }
      });
    });

    websiteFileInput?.addEventListener('change', () => {
      if (!(websiteFileInput instanceof HTMLInputElement)) return;
      const f = websiteFileInput.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        const urls = text
          .split(/[\n\r;；,，]+/)
          .map((x) => x.trim())
          .filter(Boolean);
        fillWebsiteInputs(urls);
        window.geoSave?.(savePanelPayload('website', { action: 'import', urls }));
      };
      reader.readAsText(f);
    });

    const kbFileInput = document.getElementById('kbFileInput');
    const fileTable = document.getElementById('fileTable');
    const fileState = { files: [] };

    const renderFiles = () => {
      if (!fileTable) return;
      if (!fileState.files.length) {
        fileTable.innerHTML = `<tr><td colspan="4" class="empty">暂无文件</td></tr>`;
        return;
      }
      fileTable.innerHTML = fileState.files
        .map((f, idx) => {
          const st = String(f.status || '').trim();
          const name = `${escapeHtml(f.name)}${st === 'uploading' ? '（上传中）' : ''}`;
          return `<tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${name}</td>
            <td style="text-align:center;">${escapeHtml(f.created_at)}</td>
            <td style="text-align:center;"><button class="op op-danger" data-action="delete-file" data-id="${escapeHtml(f.id)}">删除</button></td>
          </tr>`;
        })
        .join('');
    };

    document.getElementById('importFileBtn')?.addEventListener('click', () => {
      if (!(kbFileInput instanceof HTMLInputElement)) {
        window.geoSave?.(savePanelPayload('files', { action: 'import' }));
        return;
      }
      withImportModal('files').then((action) => {
        if (action === 'upload') {
          withOcrHint().then((ok) => {
            if (!ok) return;
            kbFileInput.value = '';
            kbFileInput.click();
          });
          return;
        }
        if (action === 'import') {
          const v = prompt('请粘贴文件链接（多个用分号/换行分隔）：', '');
          if (v == null) return;
          const urls = String(v || '')
            .split(/[\n\r;；,，]+/)
            .map((x) => x.trim())
            .filter(Boolean);
          if (!urls.length) return;
          const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
          const added = urls.map((u) => ({ id: `ext_${Date.now()}_${Math.random().toString(16).slice(2)}`, name: u, url: u, created_at: now, status: 'ready' }));
          fileState.files.unshift(...added);
          renderFiles();
          window.geoSave?.(savePanelPayload('files', { action: 'import', files: fileState.files }));
        }
      });
    });

    kbFileInput?.addEventListener('change', () => {
      const input = kbFileInput;
      if (!(input instanceof HTMLInputElement)) return;
      const files = Array.from(input.files || []);
      if (!files.length) return;

      const now = new Date();
      const createdAt = now.toISOString().slice(0, 16).replace('T', ' ');
      files.forEach((f) => {
        const req_id = `upload_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        window.geoUploadFile?.({ file: f, req_id });
        fileState.files.unshift({
          id: req_id,
          name: f.name,
          created_at: createdAt,
          status: 'uploading'
        });
      });
      renderFiles();
    });

    fileTable?.addEventListener('click', (e) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      const btn = target.closest('button[data-action="delete-file"]');
      const id = btn?.getAttribute('data-id');
      if (!id) return;
      fileState.files = fileState.files.filter((x) => x.id !== id);
      renderFiles();
      window.geoSave?.(savePanelPayload('files', { action: 'delete', id }));
      window.geoConsume?.({ event_type: 'ui', page: 'knowledge-base', action: 'delete_file', units: 1, amount: 0 });
    });

    renderFiles();

    const buildProductImagesHtml = (r) => {
      const raw = r?.images;
      const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(/[,;\s]+/).filter(Boolean) : []);
      const urls = list.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 9);
      if (!urls.length) return { html: '', count: 0 };
      const html = urls
        .map((u) => {
          const src = escapeHtml(u);
          return `<img class="pimg-thumb" src="${src}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;border:1px solid rgba(15, 23, 42, 0.12);cursor:pointer;" title="点击移除" />`;
        })
        .join('');
      return { html, count: urls.length };
    };

    const renderProducts = (rows) => {
      const tbody = document.getElementById('productTable');
      if (!tbody) return;
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) return;
      tbody.innerHTML = list
        .slice(0, 50)
        .map((r, idx) => {
          const v = (...keys) => {
            for (let i = 0; i < keys.length; i += 1) {
              const k = keys[i];
              const raw = r?.[k];
              if (raw == null) continue;
              const s = String(raw);
              if (s.trim() !== '') return escapeHtml(s);
            }
            return '';
          };
          const imgs = buildProductImagesHtml(r);
          return `<tr>
              <td class="p-seq">${idx + 1}</td>
              <td>
                <div class="pimg-cell" data-img-count="${imgs.count}">
                  <div class="pimg-grid">${imgs.html}</div>
                  ${isProductPicker ? '' : '<button class="op" data-action="insert-image">插入图片</button>'}
                  ${isProductPicker ? '' : '<div class="page-muted" style="font-size:12px;">最多9张</div>'}
                </div>
              </td>
              <td><input class="kb-input kb-input-plain" value="${v('precise_product_name', 'product_name')}" /></td>
              <td><input class="kb-input kb-input-plain" value="${v('core_material', 'material')}" /></td>
              <td><input class="kb-input kb-input-plain" value="${v('core_features', 'craft', 'advantages')}" /></td>
              <td><input class="kb-input kb-input-plain" value="${v('core_params', 'specs')}" /></td>
              <td><input class="kb-input kb-input-plain" value="${v('use_scenarios', 'use_scene')}" /></td>
              <td><input class="kb-input kb-input-plain" value="${v('core_advantages', 'advantages', 'core_function')}" /></td>
              <td><input class="kb-input kb-input-plain" value="${v('target_audience', 'target_group')}" /></td>
              <td><input class="kb-input kb-input-plain" value="${v('customization_capability', 'delivery', 'others')}" /></td>
              <td><input class="kb-input kb-input-plain" value="${v('target_market', 'origin')}" /></td>
              <td><button class="op" data-action="${isProductPicker ? 'pick-product' : 'edit'}">${isProductPicker ? '选择' : '编辑'}</button></td>
              <td>${isProductPicker ? '' : '<button class="op op-danger" data-action="delete">删除</button>'}</td>
            </tr>`;
        })
        .join('');
    };

    const productExcelInput = document.getElementById('productExcelInput');
    document.getElementById('importProductBtn')?.addEventListener('click', () => {
      withImportModal('product').then((action) => {
        if (action === 'upload') {
          withOcrHint().then((ok) => {
            if (!ok) return;
            if (productExcelInput instanceof HTMLInputElement) {
              productExcelInput.value = '';
              productExcelInput.click();
            }
          });
          return;
        }
        if (action === 'import') {
          const v = prompt('请粘贴产品表格内容（每行一条；列用逗号/Tab 分隔）：', '');
          if (v == null) return;
          const lines = String(v || '').split(/\r?\n+/).map((x) => x.trim()).filter(Boolean);
          const rows = lines.map((line) => {
            const parts = line.split(/[\t,，]+/).map((x) => x.trim());
            const precise_product_name = parts[0] || '';
            const core_material = parts[1] || '';
            const core_features = parts[2] || '';
            const core_params = parts[3] || '';
            const use_scenarios = parts[4] || '';
            const core_advantages = parts[5] || '';
            const target_audience = parts[6] || '';
            const customization_capability = parts[7] || '';
            const target_market = parts[8] || '';
            return {
              images: [],
              precise_product_name,
              core_material,
              core_features,
              core_params,
              core_advantages,
              use_scenarios,
              target_audience,
              target_market,
              customization_capability,
              product_name: precise_product_name,
              material: core_material,
              specs: core_params,
              craft: core_features,
              advantages: core_advantages,
              core_function: '',
              use_scene: use_scenarios,
              target_group: target_audience,
              origin: target_market,
              delivery: customization_capability,
              others: ''
            };
          });
          renderProducts(rows);
          window.geoSave?.(savePanelPayload('products', { action: 'import', rows }));
        }
      });
    });

    productExcelInput?.addEventListener('change', () => {
      if (!(productExcelInput instanceof HTMLInputElement)) return;
      const f = productExcelInput.files?.[0];
      if (!f) return;
      const tbody = document.getElementById('productTable');
      if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="empty">导入中...</td></tr>`;
      const req_id = `prod_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      window.geoImportProducts?.({ file: f, req_id });
    });

    const fillBase = (data) => {
      if (!data || typeof data !== 'object') return;
      const table = root.querySelector('.kb-table');
      if (table) {
        table.querySelectorAll('tr').forEach((tr) => {
          const tds = Array.from(tr.querySelectorAll('td'));
          for (let i = 0; i < tds.length; i += 2) {
            const labelTd = tds[i];
            const fieldTd = tds[i + 1];
            if (!labelTd || !fieldTd) continue;
            const input = fieldTd.querySelector('input, textarea, select');
            if (!input) continue;
            const keyAttr = labelTd.getAttribute?.('data-kb-key');
            const key = String(keyAttr || (labelTd.textContent || ''))
              .replace(/\s+/g, '')
              .replace(/[：:（）()]/g, '')
              .replace(/^\*+/, '');
            if (!key) continue;
            if (Object.prototype.hasOwnProperty.call(data, key)) input.value = String(data[key] ?? '');
          }
        });
      }
      root.querySelectorAll('.kb-block').forEach((block) => {
        const title = (block.querySelector('.kb-block-title')?.textContent || '')
          .trim()
          .replace(/[：:]/g, '');
        const textarea = block.querySelector('textarea');
        if (!title || !textarea) return;
        if (Object.prototype.hasOwnProperty.call(data, title)) textarea.value = String(data[title] ?? '');
      });
    };

    const fillDocs = (data) => {
      if (!data || typeof data !== 'object') return;
      const p = document.getElementById('companyProfile');
      const l = document.getElementById('enterpriseLibrary');
      if (p) p.value = String(data.company_profile ?? '');
      if (l) l.value = String(data.enterprise_library ?? '');
      if (Array.isArray(data.timeline_rows)) setTimelineRows(data.timeline_rows);
    };

    const fillPositioning = (data) => {
      if (!data || typeof data !== 'object') return;
      const main = document.getElementById('mainPositioning');
      const sub = document.getElementById('subPositioning');
      if (main) main.value = String(data.main_positioning ?? '');
      if (sub) sub.value = String(data.sub_positioning ?? '');
    };

    const fillWebsite = (data) => {
      if (!data || typeof data !== 'object') return;
      if (Array.isArray(data.urls)) fillWebsiteInputs(data.urls);
    };

    const fillFiles = (data) => {
      if (!data || typeof data !== 'object') return;
      if (Array.isArray(data.files)) {
        fileState.files = data.files;
        renderFiles();
      }
    };

    const fillProducts = (data) => {
      if (!data || typeof data !== 'object') return;
      if (Array.isArray(data.rows)) renderProducts(data.rows);
    };

    const fillImages = (data) => {
      if (!data || typeof data !== 'object') return;
      const cats = Array.isArray(data.categories) ? data.categories : null;
      const imgs = Array.isArray(data.images) ? data.images : null;
      if (cats) imgState.categories = cats;
      if (imgs) imgState.images = imgs;
      renderCategories();
      renderImageList();
    };

    const onKbMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'geo_knowledge_base_data') return;
      const sec = String(d.payload?.section || '').trim();
      if (sec === '企业基础信息') {
        fillBase(d.payload?.data);
      }
      if (sec === 'images') {
        fillImages(d.payload?.data);
      }
      if (sec === 'docs') {
        fillDocs(d.payload?.data);
      }
      if (sec === 'positioning') {
        fillPositioning(d.payload?.data);
      }
      if (sec === 'website') {
        fillWebsite(d.payload?.data);
      }
      if (sec === 'files') {
        fillFiles(d.payload?.data);
      }
      if (sec === 'products') {
        fillProducts(d.payload?.data);
      }
    };
    window.addEventListener('message', onKbMessage);

    const onAiMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'geo_ai_execute_result') return;
      const task = String(d.payload?.task || '').trim();
      const text = String(d.payload?.text || '');
      if (!task) return;
      if (task === 'generate_kb_profile') {
        const el = document.getElementById('companyProfile');
        if (el) el.value = text || '';
        return;
      }
      if (task === 'generate_kb_library') {
        const el = document.getElementById('enterpriseLibrary');
        if (el) el.value = text || '';
        return;
      }
      if (task === 'generate_kb_positioning_main') {
        const el = document.getElementById('mainPositioning');
        if (el) el.value = text || '';
        return;
      }
      if (task === 'generate_kb_positioning_sub') {
        const el = document.getElementById('subPositioning');
        if (el) el.value = text || '';
        return;
      }
      if (task === 'generate_kb_timeline') {
        const rows = parseTimelineText(text);
        setTimelineRows(rows);
      }
    };
    window.addEventListener('message', onAiMessage);

    const onUploadMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'geo_import_products_result') {
        const rows = Array.isArray(d.payload?.rows) ? d.payload.rows : [];
        renderProducts(rows);
        window.geoSave?.(savePanelPayload('products', { action: 'import', rows }));
        return;
      }
      if (d.type === 'geo_upload_file_result') {
        const info = d.payload?.data || null;
        const reqId = String(d.payload?.req_id || '');
        if (!reqId) return;
        if (!info) return;
        const pending = pendingProductImageUpload.get(reqId);
        if (pending) {
          pendingProductImageUpload.delete(reqId);
          pending(info);
          return;
        }
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        fileState.files = fileState.files.map((x) => {
          if (String(x.id) !== reqId) return x;
          return {
            id: info.id || reqId,
            name: info.filename || x.name,
            url: info.url || '',
            created_at: x.created_at || now,
            status: 'ready'
          };
        });
        renderFiles();
        window.geoSave?.(savePanelPayload('files', { action: 'import', files: fileState.files }));
      }
    };
    window.addEventListener('message', onUploadMessage);
    const oldCleanup = Page._cleanup;
    Page._cleanup = () => {
      try {
        if (oldCleanup) oldCleanup();
      } catch {
      }
      window.removeEventListener('message', onKbMessage);
      window.removeEventListener('message', onAiMessage);
      window.removeEventListener('message', onUploadMessage);
    };

    window.geoQueryKnowledgeBase?.({ section: '企业基础信息', ts: Date.now() });
    window.geoQueryKnowledgeBase?.({ section: 'images', ts: Date.now() });
    window.geoQueryKnowledgeBase?.({ section: 'docs', ts: Date.now() });
    window.geoQueryKnowledgeBase?.({ section: 'positioning', ts: Date.now() });
    window.geoQueryKnowledgeBase?.({ section: 'products', ts: Date.now() });
    window.geoQueryKnowledgeBase?.({ section: 'website', ts: Date.now() });
    window.geoQueryKnowledgeBase?.({ section: 'files', ts: Date.now() });
  },
  destroy() {
  }
};

export default Page;
