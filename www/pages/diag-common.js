function waitForGeoMessage(type, match, timeoutMs) {
  const timeout = Number(timeoutMs || 5000) || 5000;
  return new Promise((resolve) => {
    let done = false;
    let timer = null;

    const cleanup = (val) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(val);
    };

    const onMessage = (event) => {
      const d = event?.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== type) return;
      const payload = d.payload;
      if (match && !match(payload)) return;
      cleanup(payload);
    };

    window.addEventListener('message', onMessage);
    timer = setTimeout(() => cleanup(null), timeout);
  });
}

export async function queryKnowledgeBaseSection(section) {
  const sec = String(section || '').trim();
  if (!sec) return null;
  const waiter = waitForGeoMessage('geo_knowledge_base_data', (p) => String(p?.section || '').trim() === sec);
  window.geoQueryKnowledgeBase?.({ section: sec, ts: Date.now() });
  const payload = await waiter;
  return payload?.data ?? null;
}

export async function saveKnowledgeBaseMerge(section, patch) {
  const sec = String(section || '').trim();
  if (!sec) return false;
  if (!patch || typeof patch !== 'object') return true;
  const entries = Object.entries(patch).filter(([, v]) => String(v ?? '').trim() !== '');
  if (!entries.length) return true;

  const current = await queryKnowledgeBaseSection(sec);
  const base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
  const next = { ...base };
  entries.forEach(([k, v]) => {
    next[k] = String(v ?? '').trim();
  });

  const waiter = waitForGeoMessage('geo_knowledge_base_saved', (p) => String(p?.section || '').trim() === sec);
  window.geoSave?.({ page: 'knowledge-base', section: sec, data: next, ts: Date.now() });
  const res = await waiter;
  return Boolean(res?.ok);
}

export function applyEnterprisePrefill(fields, kbData) {
  const base = kbData && typeof kbData === 'object' && !Array.isArray(kbData) ? kbData : {};
  (Array.isArray(fields) ? fields : []).forEach((f) => {
    const id = String(f?.id || '').trim();
    if (!id) return;
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    const kbKey = String(f?.kbKey || '').trim();
    const v = kbKey ? String(base[kbKey] ?? '').trim() : '';

    el.classList.remove('prefilled');
    el.classList.remove('manual-input');
    if (v) {
      el.value = v;
      el.readOnly = true;
      el.classList.add('prefilled');
    } else {
      el.readOnly = false;
      el.classList.add('manual-input');
      if (String(el.value || '').trim() === '' && f?.placeholder) {
        el.setAttribute('placeholder', String(f.placeholder));
      }
    }
  });
}

export function collectEnterprisePatch(fields) {
  const patch = {};
  (Array.isArray(fields) ? fields : []).forEach((f) => {
    const kbKey = String(f?.kbKey || '').trim();
    if (!kbKey) return;
    const id = String(f?.id || '').trim();
    if (!id) return;
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if (!el.classList.contains('manual-input')) return;
    const v = String(el.value || '').trim();
    if (!v) return;
    patch[kbKey] = v;
  });
  return patch;
}

export function bindPills(options) {
  const root = options?.root || document;
  const multi = Boolean(options?.multi);
  let lastModelName = '';

  root.querySelectorAll('.pill[data-model]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!multi) {
        root.querySelectorAll('.pill[data-model]').forEach((p) => p.classList.remove('active'));
        el.classList.add('active');
      } else {
        el.classList.toggle('active');
        if (!root.querySelector('.pill[data-model].active')) el.classList.add('active');
      }
      lastModelName = String(el.querySelector('.pill-name')?.textContent || el.textContent || '').trim();
    });
  });

  const getSelected = () => {
    const names = Array.from(root.querySelectorAll('.pill[data-model].active')).map((p) => {
      return String(p.querySelector('.pill-name')?.textContent || p.textContent || '').trim();
    }).filter(Boolean);
    const primary = lastModelName || names[0] || '';
    return { names, primary };
  };

  return { getSelected };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toMarkdownTableHtml(text) {
  const rawLines = String(text || '').replaceAll('\r\n', '\n').split('\n');
  const lines = rawLines.map((l) => String(l || '').trim()).filter(Boolean);
  if (lines.length < 2) return '';
  const sepIdx = lines.findIndex((l) => /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(l));
  if (sepIdx <= 0) return '';

  const headLine = lines[sepIdx - 1];
  const bodyLines = lines.slice(sepIdx + 1);
  if (!bodyLines.length) return '';

  const splitCells = (line) => {
    let t = String(line || '');
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map((c) => String(c || '').trim());
  };

  const headers = splitCells(headLine).filter((c) => c !== '');
  if (!headers.length) return '';

  const rows = bodyLines
    .map(splitCells)
    .filter((cells) => cells.some((c) => String(c || '').trim() !== ''))
    .slice(0, 200);

  if (!rows.length) return '';

  const th = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const tbody = rows.map((r) => {
    const tds = headers.map((_, i) => `<td>${escapeHtml(r[i] ?? '')}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  return `<table><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table>`;
}

export function renderReport(el, text, options) {
  if (!(el instanceof HTMLElement)) return;
  const placeholder = String(options?.placeholder || '点击分析按钮后，结果将显示在此处');
  const t = String(text ?? '');
  el.style.whiteSpace = 'pre-wrap';

  if (t === '生成中...') {
    el.textContent = t;
    el.style.fontSize = '12px';
    el.style.color = '#6b7280';
    return;
  }

  el.style.fontSize = '';
  el.style.color = '';

  const trimmed = t.trim();
  if (!trimmed) {
    el.innerHTML = `<div class="report-placeholder">${escapeHtml(placeholder)}</div>`;
    return;
  }

  if (trimmed.includes('<table')) {
    el.innerHTML = trimmed;
    return;
  }

  const tableHtml = toMarkdownTableHtml(trimmed);
  if (tableHtml) {
    el.innerHTML = tableHtml;
    return;
  }

  el.textContent = t;
}
