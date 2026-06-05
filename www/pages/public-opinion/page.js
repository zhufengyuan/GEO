import { initTemplate } from '../_shared/page-template.js';
import { initPublicOpinion } from './app.js';

const Page = {
  async init() {
    initTemplate('舆情监控');

    const els = {
      keyword: document.getElementById('poKeyword'),
      infoType: document.getElementById('poInfoType'),
      createBtn: document.getElementById('poCreateBtn'),
      taskList: document.getElementById('poTaskList'),
      tools: document.getElementById('poTools'),
      tabsBar: document.getElementById('poTabsBar'),
      enterBtn: document.getElementById('poEnterBtn'),
      mainTitle: document.getElementById('poMainTitle'),
      scanBtn: document.getElementById('poScanBtn'),
      reportBtn: document.getElementById('poReportBtn'),
      results: document.getElementById('poResults'),
      modal: document.getElementById('poModal'),
      modalTitle: document.getElementById('poModalTitle'),
      modalBody: document.getElementById('poModalBody'),
      modalClose: document.getElementById('poModalClose'),
      modalCancel: document.getElementById('poModalCancel')
    };

    Page._cleanup = initPublicOpinion(els);
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
