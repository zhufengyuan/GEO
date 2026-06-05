import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('实名认证');

    const els = {
      status: document.getElementById('rnStatus'),
      card: document.getElementById('rnCard'),
      modal: document.getElementById('rnModal'),
      modalClose: document.getElementById('rnModalClose'),
      cancel: document.getElementById('rnCancel'),
      submit: document.getElementById('rnSubmit'),
      name: document.getElementById('rnName'),
      id: document.getElementById('rnId')
    };

    const open = () => els.modal?.classList.add('show');
    const close = () => els.modal?.classList.remove('show');

    els.card?.addEventListener('click', open);
    els.modalClose?.addEventListener('click', close);
    els.cancel?.addEventListener('click', close);
    els.modal?.addEventListener('click', (e) => {
      if (e.target === els.modal) close();
    });

    const setStatus = (text) => {
      if (els.status) els.status.textContent = text;
    };

    els.submit?.addEventListener('click', () => {
      const name = (els.name?.value || '').trim();
      const id = (els.id?.value || '').trim();
      if (!name || !id) {
        alert('请填写真实姓名和身份证号');
        return;
      }
      window.geoSave?.({ page: 'real-name', section: 'verify', data: { name, id }, ts: Date.now() });
      window.geoConsume?.({ event_type: 'save', page: 'real-name', action: 'submit', units: 1, amount: 0 });
      setStatus('已提交');
      close();
      alert('已提交认证（占位）。');
    });

    setStatus('未认证');
  },
  destroy() {
  }
};

export default Page;

