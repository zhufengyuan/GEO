import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('数据查询');

    const els = {
      steps: document.querySelectorAll('.dq-step[data-step]'),
      stepPanels: document.querySelectorAll('[data-step-panel]'),
      models: document.querySelectorAll('.dq-model'),
      saveBtn: document.getElementById('saveBtn'),
      submitBtn: document.getElementById('submitBtn'),
      clearBtn: document.getElementById('clearBtn'),
      demoBtn: document.getElementById('demoBtn'),
      copyBtn: document.getElementById('copyBtn'),
      resultCount: document.getElementById('resultCount'),
      paramBtn: document.getElementById('paramBtn'),
      advancedBtn: document.getElementById('advancedBtn'),
      modal: document.getElementById('dqModal'),
      modalTitle: document.getElementById('dqModalTitle'),
      modalBody: document.getElementById('dqModalBody'),
      modalClose: document.getElementById('dqModalClose'),
      modalCancel: document.getElementById('dqModalCancel'),
      roleText: document.getElementById('roleText'),
      templateText: document.getElementById('templateText'),
      rulesText: document.getElementById('rulesText'),
      styleText: document.getElementById('styleText'),
      goodText: document.getElementById('goodText'),
      badText: document.getElementById('badText')
    };

    const openModal = (title, html) => {
      if (els.modalTitle) els.modalTitle.textContent = title;
      if (els.modalBody) els.modalBody.innerHTML = html;
      els.modal?.classList.add('show');
    };

    const closeModal = () => {
      els.modal?.classList.remove('show');
    };

    els.modalClose?.addEventListener('click', closeModal);
    els.modalCancel?.addEventListener('click', closeModal);
    els.modal?.addEventListener('click', (e) => {
      if (e.target === els.modal) closeModal();
    });

    const setActiveStep = (step) => {
      els.steps.forEach((b) => b.classList.toggle('active', b.getAttribute('data-step') === step));
      els.stepPanels.forEach((p) => {
        p.style.outline = p.getAttribute('data-step-panel') === step ? '2px solid rgba(47, 107, 216, 0.25)' : '';
      });
    };

    els.steps.forEach((b) => {
      b.addEventListener('click', () => {
        const step = b.getAttribute('data-step');
        if (!step) return;
        setActiveStep(step);
        const panel = document.querySelector(`[data-step-panel="${step}"]`);
        panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.geoConsume?.({ event_type: 'ui', page: 'data-query', action: `step_${step}`, units: 1, amount: 0 });
      });
    });

    let activeModel = 'deepseek';
    const setActiveModel = (m) => {
      activeModel = m;
      els.models.forEach((x) => x.classList.toggle('active', x.getAttribute('data-model') === m));
    };

    els.models.forEach((m) => {
      m.addEventListener('click', () => {
        const k = m.getAttribute('data-model');
        if (!k) return;
        setActiveModel(k);
        window.geoConsume?.({ event_type: 'ui', page: 'data-query', action: `model_${k}`, units: 1, amount: 0 });
      });
    });

    const getPayload = () => {
      return {
        role: els.roleText?.value || '',
        template: els.templateText?.value || '',
        rules: els.rulesText?.value || '',
        style: els.styleText?.value || '',
        good: els.goodText?.value || '',
        bad: els.badText?.value || '',
        model: activeModel
      };
    };

    const setPayload = (p) => {
      if (els.roleText) els.roleText.value = p.role || '';
      if (els.templateText) els.templateText.value = p.template || '';
      if (els.rulesText) els.rulesText.value = p.rules || '';
      if (els.styleText) els.styleText.value = p.style || '';
      if (els.goodText) els.goodText.value = p.good || '';
      if (els.badText) els.badText.value = p.bad || '';
      if (p.model) setActiveModel(p.model);
    };

    const buildCopyText = () => {
      const p = getPayload();
      const parts = [
        ['AI角色定位', p.role],
        ['模版内容设置', p.template],
        ['注意事项', p.rules],
        ['内容风格（选填）', p.style],
        ['正确示例（选填）', p.good],
        ['错误示例（选填）', p.bad]
      ];
      return parts
        .map(([k, v]) => `【${k}】\n${String(v || '').trim()}\n`)
        .join('\n')
        .trim();
    };

    const copyText = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand('copy');
          ta.remove();
          return ok;
        } catch {
          return false;
        }
      }
    };

    let count = 0;
    const setCount = (n) => {
      count = n;
      if (els.resultCount) els.resultCount.textContent = `${count}条结果`;
    };

    els.paramBtn?.addEventListener('click', () => {
      openModal(
        '参数参考',
        `<div class="page-muted">占位：后续接入参数说明（例如：长度、语气、禁用词、结构模板等）。</div>`
      );
      window.geoConsume?.({ event_type: 'ui', page: 'data-query', action: 'param', units: 1, amount: 0 });
    });

    els.advancedBtn?.addEventListener('click', () => {
      openModal(
        '高级设置',
        `<div class="page-muted">占位：后续接入高级设置（例如：温度、top_p、最大字数、去重策略等）。</div>`
      );
      window.geoConsume?.({ event_type: 'ui', page: 'data-query', action: 'advanced', units: 1, amount: 0 });
    });

    els.clearBtn?.addEventListener('click', () => {
      setPayload({ role: '', template: '', rules: '', style: '', good: '', bad: '', model: activeModel });
      setCount(0);
      window.geoConsume?.({ event_type: 'ui', page: 'data-query', action: 'clear', units: 1, amount: 0 });
    });

    els.demoBtn?.addEventListener('click', () => {
      setPayload({
        role: '资深新媒体编辑，语气专业但亲和。',
        template: '标题：\n小标题：\n正文要点：\n- 要点1\n- 要点2\n结尾CTA：',
        rules: '不得夸大宣传，不得冒充权威，不得涉黄暴恐，不得泄露隐私。',
        style: '专业、简洁、口语化',
        good: '示例：标题简洁有力度；正文分点；结尾有行动号召。',
        bad: '示例：堆砌形容词、虚假承诺、无数据来源、过度营销。',
        model: activeModel
      });
      window.geoConsume?.({ event_type: 'ui', page: 'data-query', action: 'demo', units: 1, amount: 0 });
    });

    els.copyBtn?.addEventListener('click', async () => {
      const ok = await copyText(buildCopyText());
      if (!ok) alert('复制失败，请手动复制。');
      window.geoConsume?.({ event_type: 'ui', page: 'data-query', action: 'copy', units: 1, amount: 0 });
    });

    els.saveBtn?.addEventListener('click', () => {
      window.geoSave?.({ page: 'data-query', section: 'template', data: getPayload(), ts: Date.now() });
      window.geoConsume?.({ event_type: 'save', page: 'data-query', action: 'save_template', units: 1, amount: 0 });
      alert('已保存（占位）。');
    });

    els.submitBtn?.addEventListener('click', () => {
      window.geoConsume?.({ event_type: 'ai_generate', page: 'data-query', action: 'submit', units: 1, amount: 0 });
      setCount(count + 1);
      alert('提交生成：后续接入真实生成接口。');
    });

    setActiveStep('role');
    setActiveModel('deepseek');
    setCount(0);
  },
  destroy() {
  }
};

export default Page;

