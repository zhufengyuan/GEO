import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('创建问题词库');

    const companyInput = document.getElementById('companyInput');
    const companyAutoHint = document.getElementById('companyAutoHint');
    const industryKeyword = document.getElementById('industryKeyword');
    const createBtn = document.getElementById('createBtn');
    const regionWord = document.getElementById('regionWord');
    const featureWord = document.getElementById('featureWord');
    const attributeWord = document.getElementById('attributeWord');
    const sceneWord = document.getElementById('sceneWord');
    const peopleWord = document.getElementById('peopleWord');
    const painWord = document.getElementById('painWord');
    const priceWord = document.getElementById('priceWord');
    const otherWord = document.getElementById('otherWord');

    const savedCompany = localStorage.getItem('kb_company_name') || '';
    if (companyInput && savedCompany) {
      companyInput.value = savedCompany;
      companyInput.setAttribute('readonly', 'readonly');
      companyInput.style.background = 'rgba(243, 244, 246, 1)';
      companyInput.style.color = '#374151';
      if (companyAutoHint) companyAutoHint.textContent = '（已从企业知识库自动带出）';
    }

    const singleKeyword = (v) => {
      const s = String(v || '').trim();
      if (!s) return '';
      const parts = s
        .replaceAll('，', ',')
        .replaceAll('；', ';')
        .replaceAll('、', ',')
        .split(/[\s,;]+/)
        .map((x) => x.trim())
        .filter(Boolean);
      return parts[0] || '';
    };

    industryKeyword?.addEventListener('input', () => {
      const next = singleKeyword(industryKeyword.value);
      if (industryKeyword.value !== next) industryKeyword.value = next;
    });

    const bindSingle = (el) => {
      el?.addEventListener('input', () => {
        const next = singleKeyword(el.value);
        if (el.value !== next) el.value = next;
      });
    };
    bindSingle(regionWord);
    bindSingle(featureWord);
    bindSingle(attributeWord);
    bindSingle(sceneWord);
    bindSingle(peopleWord);
    bindSingle(painWord);
    bindSingle(priceWord);
    bindSingle(otherWord);

    document.getElementById('createBtn')?.addEventListener('click', () => {
      const company = (companyInput?.value || '').trim();
      const industry = (industryKeyword?.value || '').trim();
      const stage = (document.querySelector('input[name="decisionStage"]:checked')?.value || '').trim();

      if (!company || !industry) {
        alert('请先填写企业名称/简称与行业/产品关键词。');
        return;
      }

      localStorage.setItem('qb_company', company);
      localStorage.setItem('qb_industry_keyword', industry);
      localStorage.setItem('qb_decision_stage', stage || '认知触发');

      const words = {
        region: (regionWord?.value || '').trim(),
        feature: (featureWord?.value || '').trim(),
        attribute: (attributeWord?.value || '').trim(),
        scene: (sceneWord?.value || '').trim(),
        people: (peopleWord?.value || '').trim(),
        pain: (painWord?.value || '').trim(),
        price: (priceWord?.value || '').trim(),
        other: (otherWord?.value || '').trim()
      };

      const keywordList = [
        industry,
        words.region,
        words.feature,
        words.scene,
        words.people
      ]
        .map((x) => singleKeyword(x))
        .filter(Boolean);

      if (!keywordList.length) {
        alert('请至少填写一个关键词。');
        return;
      }

      const stageText = stage || '认知触发';
      keywordList.forEach((kw, i) => {
        const payload = {
          page: 'question-bank',
          action: 'create',
          data: {
            name: `${company}-${kw}-${stageText}-${i + 1}`,
            company,
            industry_keyword: kw,
            question_keyword: industry,
            decision_stage: stageText,
            words
          },
          ts: Date.now() + i
        };
        setTimeout(() => window.geoSave?.(payload), i * 120);
      });

      window.geoConsume?.({ event_type: 'ai_generate', page: 'question-bank', action: 'create', units: keywordList.length, amount: 0 });
      alert(`已生成 ${keywordList.length} 条关键词，正在同步到“问题词库管理”。`);
      setTimeout(() => window.navigateTo?.('question-bank-manager'), 900);
    });

    document.getElementById('toManagerBtn')?.addEventListener('click', () => {
      window.navigateTo?.('question-bank-manager');
    });
  },
  destroy() {
  }
};

export default Page;
