import { initTemplate } from '../_shared/page-template.js';
import { applyEnterprisePrefill, collectEnterprisePatch, queryKnowledgeBaseSection, renderReport, saveKnowledgeBaseMerge } from '../diag-common.js';

const Page = {
  async init() {
    initTemplate('企业官网诊断');

    const reportBody = document.getElementById('reportBody');
    const runBtn = document.getElementById('runBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    const prefillFields = [
      { id: 'wd_enterprise_full_name', kbKey: '企业全称' },
      { id: 'wd_enterprise_address', kbKey: '企业地址' },
      { id: 'wd_enterprise_short_name', kbKey: '企业简称' },
      { id: 'wd_founded_time', kbKey: '成立时间' },
      { id: 'wd_enterprise_contact', kbKey: '企业联系方式' },
      { id: 'wd_enterprise_website', kbKey: '企业官网' },
      { id: 'wd_main_products', kbKey: '主营产品' },
      { id: 'wd_honors', kbKey: '企业资质证书、荣誉证书' },
      { id: 'wd_company_profile', kbKey: '企业简介' },
    ];

    const saveFields = [
      { id: 'wd_enterprise_full_name', kbKey: '企业全称' },
      { id: 'wd_enterprise_address', kbKey: '企业地址' },
      { id: 'wd_enterprise_short_name', kbKey: '企业简称' },
      { id: 'wd_founded_time', kbKey: '成立时间' },
      { id: 'wd_enterprise_contact', kbKey: '企业联系方式' },
      { id: 'wd_enterprise_website', kbKey: '企业官网' },
      { id: 'wd_main_products', kbKey: '主营产品' },
      { id: 'wd_honors', kbKey: '企业资质证书、荣誉证书' },
      { id: 'wd_company_profile', kbKey: '企业简介' },
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

    const serviceLink = document.getElementById('serviceLink');
    serviceLink?.addEventListener('click', (e) => {
      e.preventDefault();
      window.navigateTo?.('contact');
    });

    let reqSeq = 0;
    runBtn?.addEventListener('click', async () => {
      reqSeq += 1;
      const req_id = `wd_${Date.now()}_${reqSeq}`;
      renderReport(reportBody, '生成中...', { placeholder: '点击诊断按钮后，结果将显示在此处' });

      const patch = collectEnterprisePatch(saveFields);
      await saveKnowledgeBaseMerge('企业基础信息', patch);
      const page_context = buildPageContext(saveFields);
      window.geoAiExecute?.({ task: 'website_diagnosis', req_id, model_name: '豆包', page_context });
    });

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'geo_ai_execute_result') return;
      if (String(d.payload?.task || '') !== 'website_diagnosis') return;
      const text = String(d.payload?.text || '');
      renderReport(reportBody, text, { placeholder: '点击诊断按钮后，结果将显示在此处' });
      window.geoDiagnosisFilesSave?.({ task: 'website_diagnosis', model: 'summary', content: text });
    };

    window.addEventListener('message', onMessage);
    Page._cleanup = () => window.removeEventListener('message', onMessage);

    downloadBtn?.addEventListener('click', () => {
      window.geoDiagnosisFilesDownloadWord?.({ task: 'website_diagnosis', model: 'summary' });
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
