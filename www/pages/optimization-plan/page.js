import { initTemplate } from '../_shared/page-template.js';

const Page = {
  async init() {
    initTemplate('优化建议方案');

    const blocks = Array.from(document.querySelectorAll('.plan-block'));
    const getBody = (idx) => blocks[idx]?.querySelector('.report-body') || null;
    const escapeHtml = (s) => {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const toTableHtml = (text) => {
      const lines = String(text || '')
        .split(/\r?\n+/)
        .map((x) => x.trim())
        .filter(Boolean);
      if (lines.length < 2) return '';
      const parsed = lines
        .map((line) => line.split(/[|｜]/).map((x) => x.trim()))
        .filter((cells) => cells.length >= 2);
      if (parsed.length < 2) return '';
      const colCount = Math.max(...parsed.map((x) => x.length));
      if (colCount < 2) return '';

      const bodyRows = parsed.map((cells) => {
        const tds = Array.from({ length: colCount }).map((_, i) => `<td>${escapeHtml(cells[i] ?? '')}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');

      return `<div class="table-wrap square" style="overflow:auto;">
        <table style="width:100%; table-layout:auto;">
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
    };

    const setText = (idx, text) => {
      const el = getBody(idx);
      if (!el) return;
      const t = String(text || '');
      el.style.whiteSpace = 'pre-wrap';
      el.textContent = t;
      if (t === '生成中...') {
        el.style.fontSize = '12px';
        el.style.color = '#6b7280';
      } else {
        el.style.fontSize = '';
        el.style.color = '';
      }
    };

    const setTableOrText = (idx, text) => {
      const el = getBody(idx);
      if (!el) return;
      const html = toTableHtml(text);
      if (html) {
        el.style.whiteSpace = 'normal';
        el.style.fontSize = '';
        el.style.color = '';
        el.innerHTML = html;
        return;
      }
      el.style.whiteSpace = 'pre-wrap';
      el.textContent = String(text || '');
      if (String(text || '') === '生成中...') {
        el.style.fontSize = '12px';
        el.style.color = '#6b7280';
      } else {
        el.style.fontSize = '';
        el.style.color = '';
      }
    };

    const bind = (btnId, task, idx) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', () => {
        setText(idx, '生成中...');
        window.geoAiExecute?.({ task, req_id: `${task}_${Date.now()}` });
      });
    };

    bind('genBtn1', 'optimization_plan', 0);
    bind('genBtn2', 'optimization_schedule', 1);
    bind('genBtn3', 'acceptance_score', 2);

    const getText = (idx) => {
      const el = getBody(idx);
      if (!el) return '';
      return String(el.textContent || '').trim();
    };

    const downloadWord = (idx, title) => {
      const text = getText(idx);
      if (!text) {
        alert('内容为空，无法下载');
        return;
      }
      window.geoDownloadWord?.({ title, text });
    };

    const downloadExcel = (idx, filename, sheet_name) => {
      const text = getText(idx);
      if (!text) {
        alert('内容为空，无法下载');
        return;
      }
      const looksLikeTable = /[|｜\t]/.test(text) && text.split(/\r?\n/).filter((x) => x.trim()).length >= 2;
      if (!looksLikeTable) {
        window.geoDownloadWord?.({ title: filename, text });
        return;
      }
      window.geoDownloadExcel?.({ filename, sheet_name, table_text: text });
    };

    document.getElementById('download1')?.addEventListener('click', () => downloadWord(0, '优化建议方案'));
    document.getElementById('download2')?.addEventListener('click', () => downloadExcel(1, '方案执行计划表', '计划表'));
    document.getElementById('download3')?.addEventListener('click', () => downloadExcel(2, '整改验收评分表', '评分表'));

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'geo_ai_execute_result') return;
      const task = String(d.payload?.task || '');
      const text = String(d.payload?.text || '');
      if (task === 'optimization_plan') setText(0, text);
      if (task === 'optimization_schedule') setTableOrText(1, text);
      if (task === 'acceptance_score') setTableOrText(2, text);
    };

    window.addEventListener('message', onMessage);
    Page._cleanup = () => window.removeEventListener('message', onMessage);
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
