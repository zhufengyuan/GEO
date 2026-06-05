import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('联系我们');

    const els = {
      name: document.getElementById('contactName'),
      phone: document.getElementById('contactPhone'),
      company: document.getElementById('contactCompany'),
      title: document.getElementById('contactTitle'),
      email: document.getElementById('contactEmail'),
      need: document.getElementById('contactNeed'),
      submit: document.getElementById('contactSubmit'),
      reset: document.getElementById('contactReset'),
      tipBox: document.getElementById('contactTipBox'),
      tip: document.getElementById('contactTip')
    };

    const showTip = (text) => {
      if (els.tip) els.tip.textContent = text;
      if (els.tipBox) els.tipBox.style.display = '';
    };

    const reset = () => {
      if (els.name) els.name.value = '';
      if (els.phone) els.phone.value = '';
      if (els.company) els.company.value = '';
      if (els.title) els.title.value = '';
      if (els.email) els.email.value = '';
      if (els.need) els.need.value = '';
      if (els.tipBox) els.tipBox.style.display = 'none';
    };

    els.reset?.addEventListener('click', reset);

    els.submit?.addEventListener('click', () => {
      const name = String(els.name?.value || '').trim();
      const phone = String(els.phone?.value || '').trim();
      const company = String(els.company?.value || '').trim();
      const title = String(els.title?.value || '').trim();
      const email = String(els.email?.value || '').trim();
      const need = String(els.need?.value || '').trim();

      if (!name || !phone) {
        showTip('请先填写姓名和手机号，工作人员将尽快联系您。');
        return;
      }

      showTip('提交成功，工作人员将尽快联系您。');
      window.geoSave?.({
        page: 'contact',
        section: 'contact_form',
        data: { name, phone, company, title, email, need },
        ts: Date.now()
      });
      window.geoConsume?.({ event_type: 'save', page: 'contact', action: 'submit', units: 1, amount: 0 });
    });
  },
  destroy() {
  }
};

export default Page;
