import { initTemplate } from '../_shared/page-template.js';
import { applyEnterprisePrefill, collectEnterprisePatch, queryKnowledgeBaseSection, renderReport, saveKnowledgeBaseMerge } from '../diag-common.js';

const Page = {
  async init() {
    initTemplate('企业诊断报告');

    const reportBodyModel = document.getElementById('reportBodyModel');
    const reportBodySummary = document.getElementById('reportBodySummary');
    const runBtn = document.getElementById('runBtn');
    const runSummaryBtn = document.getElementById('runSummaryBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    const TASK = 'diagnosis_report';
    const MODELS = [
      { id: 'doubao', name: '豆包' },
      { id: 'yuanbao', name: '元宝' },
      { id: 'qianwen', name: '千问' },
      { id: 'wenxin', name: '文心' }
    ];

    const prefillFields = [
      { id: 'dr_enterprise_full_name', kbKey: '企业全称' },
      { id: 'dr_enterprise_full_name_dup', kbKey: '企业全称' },
      { id: 'dr_main_products', kbKey: '主营产品' }
    ];

    const saveFields = [
      { id: 'dr_enterprise_full_name', kbKey: '企业全称' },
      { id: 'dr_main_products', kbKey: '主营产品' }
    ];

    const kb = await queryKnowledgeBaseSection('企业基础信息');
    applyEnterprisePrefill(prefillFields, kb);

    const buildPageContext = (fields) => {
      const lines = [];
      const seen = new Set();
      (fields || []).forEach((f) => {
        const key = String(f?.kbKey || '').trim();
        if (!key || seen.has(key)) return;
        const el = document.getElementById(String(f?.id || ''));
        if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLSelectElement)) return;
        const v = String(el.value || '').trim();
        if (!v) return;
        seen.add(key);
        lines.push(`- ${key}：${v}`);
      });
      return lines.join('\n');
    };

    const fullNameInput = document.getElementById('dr_enterprise_full_name');
    const fullNameDupInput = document.getElementById('dr_enterprise_full_name_dup');
    if (fullNameInput instanceof HTMLInputElement && fullNameDupInput instanceof HTMLInputElement) {
      const sync = () => {
        if (!fullNameDupInput.classList.contains('manual-input')) return;
        const v = String(fullNameInput.value || '');
        if (String(fullNameDupInput.value || '').trim() === '' || String(fullNameDupInput.value || '') === String(fullNameInput.value || '')) {
          fullNameDupInput.value = v;
        }
      };
      fullNameInput.addEventListener('input', sync);
      sync();
    }

    const pillsRoot = document.querySelector('.diag-model-block');
    const modelCache = {};
    let activeModel = MODELS[0].id;

    const setBusy = (busy) => {
      if (runBtn instanceof HTMLButtonElement) runBtn.disabled = busy;
      if (runSummaryBtn instanceof HTMLButtonElement) runSummaryBtn.disabled = busy;
      if (downloadBtn instanceof HTMLButtonElement) downloadBtn.disabled = busy;
    };

    const setActivePill = (modelId) => {
      activeModel = modelId;
      pillsRoot?.querySelectorAll?.('.pill[data-model]')?.forEach?.((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.classList.toggle('active', el.getAttribute('data-model') === modelId);
      });
    };

    const waitForAi = (reqId) => {
      const rid = String(reqId || '');
      if (!rid) return Promise.resolve('');
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          window.removeEventListener('message', onMsg);
          resolve('');
        }, 65000);
        const onMsg = (event) => {
          const d = event?.data;
          if (!d || typeof d !== 'object') return;
          if (d.type !== 'geo_ai_execute_result') return;
          if (String(d.payload?.task || '') !== TASK) return;
          if (String(d.payload?.req_id || '') !== rid) return;
          clearTimeout(timer);
          window.removeEventListener('message', onMsg);
          resolve(String(d.payload?.text || ''));
        };
        window.addEventListener('message', onMsg);
      });
    };

    const waitForFile = (modelId) => {
      const mid = String(modelId || '').trim();
      if (!mid) return Promise.resolve('');
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          window.removeEventListener('message', onMsg);
          resolve('');
        }, 8000);
        const onMsg = (event) => {
          const d = event?.data;
          if (!d || typeof d !== 'object') return;
          if (d.type !== 'geo_diagnosis_file_data') return;
          if (String(d.payload?.task || '') !== TASK) return;
          if (String(d.payload?.model || '') !== mid) return;
          clearTimeout(timer);
          window.removeEventListener('message', onMsg);
          resolve(String(d.payload?.content || ''));
        };
        window.addEventListener('message', onMsg);
        window.geoDiagnosisFilesGet?.({ task: TASK, model: mid });
      });
    };

    const clearFiles = () => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          window.removeEventListener('message', onMsg);
          resolve(false);
        }, 8000);
        const onMsg = (event) => {
          const d = event?.data;
          if (!d || typeof d !== 'object') return;
          if (d.type !== 'geo_diagnosis_files_cleared') return;
          if (String(d.payload?.task || '') !== TASK) return;
          clearTimeout(timer);
          window.removeEventListener('message', onMsg);
          resolve(Boolean(d.payload?.ok));
        };
        window.addEventListener('message', onMsg);
        try {
          window.geoDiagnosisFilesClear?.({ task: TASK });
        } catch {
          clearTimeout(timer);
          window.removeEventListener('message', onMsg);
          resolve(false);
        }
      });
    };

    const showModel = async (modelId) => {
      const mid = String(modelId || '').trim();
      if (!mid) return;
      setActivePill(mid);
      const cached = modelCache[mid];
      if (cached != null) {
        renderReport(reportBodyModel, cached, { placeholder: '点击分析按钮后，结果将显示在此处' });
        return;
      }
      renderReport(reportBodyModel, '生成中...', { placeholder: '点击分析按钮后，结果将显示在此处' });
      const content = await waitForFile(mid);
      modelCache[mid] = content;
      renderReport(reportBodyModel, content, { placeholder: '点击分析按钮后，结果将显示在此处' });
    };

    pillsRoot?.querySelectorAll?.('.pill[data-model]')?.forEach?.((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.addEventListener('click', () => {
        const mid = String(el.getAttribute('data-model') || '').trim();
        showModel(mid);
      });
    });

    await clearFiles();

    setActivePill(activeModel);
    renderReport(reportBodyModel, '', { placeholder: '点击分析按钮后，结果将显示在此处' });
    renderReport(reportBodySummary, '', { placeholder: '点击汇总分析按钮后，结果将显示在此处' });

    const runFourModels = async () => {
      setBusy(true);
      await clearFiles();
      MODELS.forEach((m) => {
        delete modelCache[m.id];
      });
      delete modelCache.summary;
      renderReport(reportBodySummary, '', { placeholder: '点击汇总分析按钮后，结果将显示在此处' });

      const patch = collectEnterprisePatch(saveFields);
      await saveKnowledgeBaseMerge('企业基础信息', patch);
      const page_context = buildPageContext(saveFields);

      const first = MODELS[0].id;
      setActivePill(first);
      renderReport(reportBodyModel, '生成中...', { placeholder: '点击分析按钮后，结果将显示在此处' });

      for (const m of MODELS) {
        const req_id = `dr_${m.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        window.geoAiExecute?.({ task: TASK, req_id, input: '', llm_name: m.name, page_context });
        const text = await waitForAi(req_id);
        modelCache[m.id] = text;
        window.geoDiagnosisFilesSave?.({ task: TASK, model: m.id, content: text });
        if (activeModel === m.id) {
          renderReport(reportBodyModel, text, { placeholder: '点击分析按钮后，结果将显示在此处' });
        }
      }

      setBusy(false);
    };

    const runSummary = async () => {
      setBusy(true);
      const patch = collectEnterprisePatch(saveFields);
      await saveKnowledgeBaseMerge('企业基础信息', patch);
      const page_context = buildPageContext(saveFields);

      const parts = [];
      for (const m of MODELS) {
        let t = modelCache[m.id];
        if (t == null) {
          t = await waitForFile(m.id);
          modelCache[m.id] = t;
        }
        parts.push(`【${m.name}】\n${String(t || '').trim()}\n`);
      }
      const combined = parts.join('\n');
      if (!combined.trim()) {
        alert('请先生成四个模型的分析结果');
        setBusy(false);
        return;
      }

      renderReport(reportBodySummary, '生成中...', { placeholder: '点击汇总分析按钮后，结果将显示在此处' });

      const req_id = `dr_summary_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const prompt =
        "请把下面四个大模型的企业诊断报告内容综合起来，去重汇总，生成一篇新的文章（结构清晰，可直接发布）。\n" +
        "要求：标题+正文；要点分段；尽量引用具体结论；避免重复。\n\n" +
        combined;
      window.geoAiExecute?.({ task: TASK, req_id, input: prompt, llm_name: '', page_context });
      const text = await waitForAi(req_id);
      window.geoDiagnosisFilesSave?.({ task: TASK, model: 'summary', content: text });
      modelCache.summary = text;
      renderReport(reportBodySummary, text, { placeholder: '点击汇总分析按钮后，结果将显示在此处' });
      setBusy(false);
    };

    runBtn?.addEventListener('click', runFourModels);
    runSummaryBtn?.addEventListener('click', runSummary);
    downloadBtn?.addEventListener('click', () => {
      window.geoDiagnosisFilesDownloadWord?.({ task: TASK, model: 'summary' });
    });
  },
  destroy() {
    try {
      if (Page._cleanup) Page._cleanup();
    } catch {
    }
    Page._cleanup = null;
  }
};

export default Page;
