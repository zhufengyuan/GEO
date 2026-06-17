const PAGES = {
  home: { title: '工作台', file: 'pages/home/home.html', script: 'pages/home/home.js' },
  'knowledge-base': { title: '企业知识库', file: 'pages/knowledge-base/page.html', script: 'pages/knowledge-base/page.js' },
  'original-data-diagnosis': { title: '基础数据诊断', file: 'pages/original-data-diagnosis/page.html', script: 'pages/original-data-diagnosis/page.js' },
  'website-diagnosis': { title: '企业官网诊断', file: 'pages/website-diagnosis/page.html', script: 'pages/website-diagnosis/page.js' },
  'competitor-analysis': { title: '竞争对手分析', file: 'pages/competitor-analysis/page.html', script: 'pages/competitor-analysis/page.js' },
  'diagnosis-report': { title: '企业诊断报告', file: 'pages/diagnosis-report/page.html', script: 'pages/diagnosis-report/page.js' },
  'optimization-plan': { title: '优化建议方案', file: 'pages/optimization-plan/page.html', script: 'pages/optimization-plan/page.js' },

  'image-library': { title: '企业图片库', file: 'pages/knowledge-base/page.html', script: 'pages/knowledge-base/page.js' },
  'product-library': { title: '产品库', file: 'pages/knowledge-base/page.html', script: 'pages/knowledge-base/page.js' },
  'import-urls': { title: '导入网址链接', file: 'pages/knowledge-base/page.html', script: 'pages/knowledge-base/page.js' },
  'import-files': { title: '导入文件', file: 'pages/knowledge-base/page.html', script: 'pages/knowledge-base/page.js' },
  'question-bank': { title: '创建问题词库', file: 'pages/question-bank/page.html', script: 'pages/question-bank/page.js' },
  'question-bank-manager': { title: '问题词库管理', file: 'pages/question-bank-manager/page.html', script: 'pages/question-bank-manager/page.js' },
  'article-writing': { title: '文章创作', file: 'pages/article-writing/page.html', script: 'pages/article-writing/page.js' },
  'article-manager': { title: '文章管理', file: 'pages/article-manager/page.html', script: 'pages/article-manager/page.js' },
  'media-publish': { title: '自媒体发布', file: 'pages/media-publish/page.html', script: 'pages/media-publish/page.js' },
  'official-publish': { title: '官媒发布', file: 'pages/official-publish/page.html', script: 'pages/official-publish/page.js' },
  'publish-manager': { title: '发布管理', file: 'pages/publish-manager/page.html', script: 'pages/publish-manager/page.js' },
  'data-statistics': { title: '数据统计', file: 'pages/data-statistics/page.html', script: 'pages/data-statistics/page.js' },
  'data-query': { title: '查询', file: 'pages/data-query/page.html', script: 'pages/data-query/page.js' },
  'public-opinion': { title: '舆情监控', file: 'pages/public-opinion/page.html', script: 'pages/public-opinion/page.js' },
  'public-opinion-report': { title: '舆情雷达分析报告', file: 'pages/public-opinion-report/page.html', script: 'pages/public-opinion-report/page.js' },
  config: { title: '消耗明细', file: 'pages/config/page.html', script: 'pages/config/page.js' },
  'ai-toolbox': { title: 'AI工具箱', file: 'pages/ai-toolbox/page.html', script: 'pages/ai-toolbox/page.js' },
  'real-name': { title: '实名认证', file: 'pages/real-name/page.html', script: 'pages/real-name/page.js' },
  contact: { title: '联系我们', file: 'pages/contact/page.html', script: 'pages/contact/page.js' }
};

let currentPage = null;
let currentModule = null;

let llmSvgManifest = { files: [], baseUrl: 'llm-svg' };

const GEO_BUILD_ID = '2026-06-04-reform-2';
try {
  window.__GEO_BUILD_ID__ = GEO_BUILD_ID;
} catch {
}

try {
  if (!String.prototype.replaceAll) {
    // eslint-disable-next-line no-extend-native
    String.prototype.replaceAll = function(search, replacement) {
      const s = String(this);
      if (search instanceof RegExp) return s.replace(search, replacement);
      return s.split(String(search)).join(String(replacement));
    };
  }
} catch {
}

const GEO_API_STORAGE_KEY = 'geo_api_base_url_v1';
let geoApiBaseUrl = '';
let geoLastApiError = null;

function setGeoApiBaseUrl(v) {
  const next = String(v || '').trim().replace(/\/+$/g, '');
  if (!next) return;
  geoApiBaseUrl = next;
  try {
    localStorage.setItem(GEO_API_STORAGE_KEY, next);
  } catch {
  }
}

function getGeoApiBaseUrl() {
  if (geoApiBaseUrl) return geoApiBaseUrl;
  try {
    if (window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      const port = String(window.location.port || '').trim();
      const host = String(window.location.hostname || '').trim();
      const isLocal = host === '127.0.0.1' || host === 'localhost';
      if (isLocal && port && port !== '8000') {
        geoApiBaseUrl = `http://${host}:8000/api/v1`;
        try {
          localStorage.setItem(GEO_API_STORAGE_KEY, geoApiBaseUrl);
        } catch {
        }
        return geoApiBaseUrl;
      }
    }
  } catch {
  }
  try {
    const saved = String(localStorage.getItem(GEO_API_STORAGE_KEY) || '').trim();
    if (saved) {
      const cleaned = saved.replace(/\/+$/g, '');
      const port = String(window.location?.port || '').trim();
      const origin = String(window.location?.origin || '').trim().replace(/\/+$/g, '');
      if (port !== '4510' || !origin || cleaned !== `${origin}/api/v1`) {
        geoApiBaseUrl = cleaned;
        return geoApiBaseUrl;
      }
    }
  } catch {
  }
  try {
    if (window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      const port = String(window.location.port || '').trim();
      const host = String(window.location.hostname || '').trim();
      const isLocal = host === '127.0.0.1' || host === 'localhost';
      if (isLocal && port && port !== '8000') {
        geoApiBaseUrl = `http://${host}:8000/api/v1`;
      } else {
        geoApiBaseUrl = `${window.location.origin}/api/v1`;
      }
      return geoApiBaseUrl;
    }
  } catch {
  }
  try {
    if (window.location && String(window.location.protocol || '') === 'file:') {
      geoApiBaseUrl = 'http://127.0.0.1:8000/api/v1';
      return geoApiBaseUrl;
    }
  } catch {
  }
  return '';
}

function dispatchGeoMessage(type, payload) {
  try {
    window.postMessage({ type, payload }, '*');
    return;
  } catch {
  }
  try {
    window.dispatchEvent(new MessageEvent('message', { data: { type, payload } }));
  } catch {
  }
}

async function geoApiRequest(path, options, _retried) {
  const base = getGeoApiBaseUrl();
  if (!base) return null;
  const url = `${base}${path}`;
  const init = options ? { ...options } : {};
  init.credentials = init.credentials || 'omit';
  init.headers = init.headers || {};
  if (!init.headers['Content-Type'] && init.body != null) init.headers['Content-Type'] = 'application/json';
  try {
    geoLastApiError = null;
    const res = await fetch(url, init);
    const json = await res.json().catch(() => null);
    if (!json || typeof json !== 'object') throw new Error(`API 返回不是 JSON（${res.status || 0}）`);
    if (json.success !== true) {
      const msg = json?.error?.message || `请求失败（${res.status || 0}）`;
      throw new Error(msg);
    }
    return json;
  } catch (e) {
    let msg = String(e?.message || e || '请求失败');
    if (msg.toLowerCase().includes('failed to fetch')) {
      msg = `无法连接后端，请确认后端已启动（${url}）`;
    }
    geoLastApiError = { message: msg, url, ts: Date.now() };
    if (!_retried && msg.startsWith('无法连接后端')) {
      try {
        const saved = String(localStorage.getItem(GEO_API_STORAGE_KEY) || '').trim().replace(/\/+$/g, '');
        if (saved && saved === base) {
          localStorage.removeItem(GEO_API_STORAGE_KEY);
          geoApiBaseUrl = '';
          const nextBase = getGeoApiBaseUrl();
          if (nextBase && nextBase !== base) {
            return await geoApiRequest(path, options, true);
          }
        }
      } catch {
      }
    }
    alert(msg);
    return null;
  }
}

async function geoApiUpload(path, formData) {
  const base = getGeoApiBaseUrl();
  if (!base) return null;
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { method: 'POST', body: formData, credentials: 'omit' });
    const json = await res.json().catch(() => null);
    if (!json || typeof json !== 'object') throw new Error('API 返回不是 JSON');
    if (json.success !== true) {
      const msg = json?.error?.message || '请求失败';
      throw new Error(msg);
    }
    return json;
  } catch (e) {
    alert(String(e?.message || e || '请求失败'));
    return null;
  }
}

function applyLlmSvgIcons(root) {
  const doc = root || document;
  const files = Array.isArray(llmSvgManifest.files) ? llmSvgManifest.files : [];
  const rawBaseUrl = llmSvgManifest.baseUrl || 'llm-svg';
  const iconAliasMap = {
    doubao: ['豆包.svg', 'doubao.svg'],
    qwen: ['千问.svg', 'qwen.svg'],
    yuanbao: ['元宝.svg', 'yuanbao.svg'],
    deepseek: ['deepseek.svg'],
    wenxin: ['文心一言.svg', 'wenxin.svg'],
    nami360: ['纳米.svg', '纳米360.svg', 'nami360.svg'],
    kimi: ['kimi.svg', 'KIMI.svg'],
    zhipu: ['智谱.svg', 'zhipu.svg']
  };
  const resolveSvgBaseUrl = () => {
    const base = String(rawBaseUrl || '').trim() || 'llm-svg';
    if (/^https?:\/\//i.test(base)) return base.replace(/\/+$/g, '');
    if (base.startsWith('/')) return base.replace(/\/+$/g, '');
    const apiBase = String(getGeoApiBaseUrl() || '').trim().replace(/\/+$/g, '');
    if (apiBase) {
      const originBase = apiBase.replace(/\/api\/v1$/i, '');
      if (originBase) return `${originBase}/${base}`.replace(/\/+$/g, '');
    }
    try {
      if (window.location?.origin && /^https?:/i.test(String(window.location.origin))) {
        return `${String(window.location.origin).replace(/\/+$/g, '')}/${base}`.replace(/\/+$/g, '');
      }
    } catch {
    }
    return base;
  };
  const baseUrl = resolveSvgBaseUrl();

  doc.querySelectorAll('img[data-llm-key]').forEach((img) => {
    const key = String(img.getAttribute('data-llm-key') || '').trim().toLowerCase();
    const fallback = img.parentElement?.querySelector('.llm-fallback');
    if (!key) {
      img.style.display = 'none';
      if (fallback) fallback.style.display = '';
      return;
    }

    const aliases = Array.isArray(iconAliasMap[key]) ? iconAliasMap[key] : [];
    const match = files.find((f) => {
      const name = String(f || '').trim();
      if (!name) return false;
      const lower = name.toLowerCase();
      if (aliases.some((alias) => lower === String(alias).toLowerCase())) return true;
      return lower.includes(key);
    });
    const srcName = match || aliases[0] || `${key}.svg`;
    const src = `${baseUrl}/${encodeURIComponent(srcName)}`;

    img.onerror = () => {
      img.style.display = 'none';
      if (fallback) fallback.style.display = '';
    };
    img.onload = () => {
      img.style.display = '';
      if (fallback) fallback.style.display = 'none';
    };
    img.setAttribute('src', src);
  });
}

window.navigateTo = async function(page) {
  await loadPage(page);
};

window.geoSave = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base && payload && payload.page === 'knowledge-base') {
      const section = String(payload.section || '').trim();
      if (!section) return;
      const body = { section, data: payload.data ?? null };
      geoApiRequest('/knowledge-base/save', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_knowledge_base_saved', { ok: Boolean(r?.data?.saved), section });
      });
      return;
    }
    if (base && payload && payload.page === 'question-bank' && payload.action === 'create') {
      const d = payload.data || {};
      const req = {
        name: String(d.name || ''),
        company: String(d.company || ''),
        industry_keyword: String(d.industry_keyword || ''),
        decision_stage: String(d.decision_stage || ''),
        question_keyword: String(d.question_keyword || d.industry_keyword || ''),
        words: d.words && typeof d.words === 'object' ? d.words : {},
        keywords: Array.isArray(d.keywords) ? d.keywords : (d.industry_keyword ? [String(d.industry_keyword)] : [])
      };
      geoApiRequest('/question-words', { method: 'POST', body: JSON.stringify(req) });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_save', payload }, '*');
  } catch {
  }
};

window.geoQueryKnowledgeBase = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const section = String(payload?.section || '').trim();
      if (!section) return;
      geoApiRequest(`/knowledge-base?section=${encodeURIComponent(section)}`).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_knowledge_base_data', { ...r.data, ok: true, api_base: base });
          return;
        }
        dispatchGeoMessage('geo_knowledge_base_data', {
          ok: false,
          api_base: base,
          section,
          data: null,
          error: geoLastApiError?.message || '请求失败'
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_knowledge_base', payload }, '*');
  } catch {
  }
};

window.geoGenerateKnowledgeGraph = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      return geoApiRequest('/knowledge-base/graph', { method: 'POST', body: JSON.stringify(payload || {}) }).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_knowledge_graph_result', { ok: true, ...(r.data || {}) });
          return r;
        }
        dispatchGeoMessage('geo_knowledge_graph_result', { ok: false, error: geoLastApiError?.message || '请求失败' });
        return null;
      });
    }
  } catch {
  }
  dispatchGeoMessage('geo_knowledge_graph_result', { ok: false, error: '当前环境暂不支持知识图谱接口' });
  return null;
};

window.geoConsume = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      geoApiRequest('/billing/consume', { method: 'POST', body: JSON.stringify(payload || {}) });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_consume', payload }, '*');
  } catch {
  }
};

window.geoRecordPublish = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      geoApiRequest('/publish-records', { method: 'POST', body: JSON.stringify(payload || {}) });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_record_publish', payload }, '*');
  } catch {
  }
};

window.geoSubmitOfficialPublish = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      return geoApiRequest('/official-publish/submit', { method: 'POST', body: JSON.stringify(payload || {}) }).then((r) => {
        dispatchGeoMessage('geo_official_publish_submit_result', { ok: Boolean(r?.data?.submitted), ...(r?.data || {}) });
        return r;
      });
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_submit_official_publish', payload }, '*');
  } catch {
  }
  return null;
};

window.geoQueryOfficialMedia = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const page = Number(payload?.page || 1) || 1;
      const pageSize = Number(payload?.page_size || payload?.pageSize || 50000) || 50000;
      const keyword = String(payload?.keyword || '').trim();
      const mediaType = String(payload?.media_type || payload?.mediaType || '').trim();
      const sheet = String(payload?.sheet || '').trim();
      const q1 = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
      const q2 = mediaType ? `&media_type=${encodeURIComponent(mediaType)}` : '';
      const q3 = sheet ? `&sheet=${encodeURIComponent(sheet)}` : '';
      geoApiRequest(`/official-media?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}${q1}${q2}${q3}`).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_official_media_data', r.data);
          return;
        }
        dispatchGeoMessage('geo_official_media_data', { items: [], total: 0, page, pageSize });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_official_media', payload }, '*');
  } catch {
  }
};

window.geoSetPublishLink = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      geoApiRequest('/publish-records/link', { method: 'POST', body: JSON.stringify(payload || {}) }).then((r) => {
        dispatchGeoMessage('geo_publish_link_result', { ok: Boolean(r?.data?.updated), ...(r?.data || {}) });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_set_publish_link', payload }, '*');
  } catch {
  }
};

window.geoQueryPublishRecords = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const limit = Number(payload?.limit || 200) || 200;
      const keyword = String(payload?.keyword || '').trim();
      const start = String(payload?.start_date || '').trim();
      const end = String(payload?.end_date || '').trim();
      const flat = Number(payload?.flat || 0) === 1 ? 1 : 0;
      const q1 = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
      const q2 = start ? `&start_date=${encodeURIComponent(start)}` : '';
      const q3 = end ? `&end_date=${encodeURIComponent(end)}` : '';
      const q4 = flat ? `&flat=1` : '';
      geoApiRequest(`/publish-records?limit=${encodeURIComponent(limit)}${q1}${q2}${q3}${q4}`).then((r) => {
        if (r?.data) dispatchGeoMessage('geo_publish_records_data', r.data);
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_publish_records', payload }, '*');
  } catch {
  }
};

window.geoQueryPublishRecordsAgg = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const limit = Number(payload?.limit || 5000) || 5000;
      const keyword = String(payload?.keyword || '').trim();
      const q1 = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
      geoApiRequest(`/publish-records?limit=${encodeURIComponent(limit)}${q1}`).then((r) => {
        if (r?.data) dispatchGeoMessage('geo_publish_records_agg_data', r.data);
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_publish_records_agg', payload }, '*');
  } catch {
  }
};

window.geoDiagnosisFilesClear = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const task = String(payload?.task || '').trim();
      if (!task) return;
      geoApiRequest('/diagnosis-files/clear', { method: 'POST', body: JSON.stringify({ task }) }).then((r) => {
        dispatchGeoMessage('geo_diagnosis_files_cleared', { ok: Boolean(r?.data), task });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_diagnosis_files_clear', payload }, '*');
  } catch {
  }
};

window.geoDiagnosisFilesSave = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const task = String(payload?.task || '').trim();
      const model = String(payload?.model || '').trim();
      const content = String(payload?.content ?? '');
      if (!task || !model) return;
      geoApiRequest('/diagnosis-files/save', { method: 'POST', body: JSON.stringify({ task, model, content }) }).then((r) => {
        dispatchGeoMessage('geo_diagnosis_file_saved', { ok: Boolean(r?.data?.saved), task, model });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_diagnosis_files_save', payload }, '*');
  } catch {
  }
};

window.geoDiagnosisFilesGet = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const task = String(payload?.task || '').trim();
      const model = String(payload?.model || '').trim();
      if (!task || !model) return;
      geoApiRequest(`/diagnosis-files/get?task=${encodeURIComponent(task)}&model=${encodeURIComponent(model)}`).then((r) => {
        dispatchGeoMessage('geo_diagnosis_file_data', { ok: Boolean(r?.data), ...(r?.data || {}) });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_diagnosis_files_get', payload }, '*');
  } catch {
  }
};

window.geoDiagnosisFilesDownloadWord = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (!base) return;
    const task = String(payload?.task || '').trim();
    const model = String(payload?.model || '').trim();
    if (!task) return;
    const q = model ? `&model=${encodeURIComponent(model)}` : '';
    const url = `${base}/diagnosis-files/download?task=${encodeURIComponent(task)}${q}`;
    window.open(url, '_blank');
  } catch {
  }
};

window.geoQueryConsumption = function(payload) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'geo_query_consumption', payload }, '*');
    }
  } catch {
  }
};

window.geoQueryQuestionLexicons = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const limit = Number(payload?.limit || 200) || 200;
      geoApiRequest(`/question-words?page=1&page_size=${encodeURIComponent(limit)}`).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_question_lexicons_data', { ...r.data, ok: true, api_base: base });
          return;
        }
        dispatchGeoMessage('geo_question_lexicons_data', {
          ok: false,
          api_base: base,
          error: geoLastApiError?.message || '请求失败',
          items: [],
          total: 0
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'geo_query_question_lexicons', payload }, '*');
    }
  } catch {
  }
};

window.geoQueryQuestionWords = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const lexiconId = String(payload?.lexicon_id || payload?.lexiconId || '').trim();
      if (!lexiconId) return;
      geoApiRequest(`/question-words/by-lexicon?lexicon_id=${encodeURIComponent(lexiconId)}`).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_question_words_data', { ...r.data, ok: true, api_base: base });
          return;
        }
        dispatchGeoMessage('geo_question_words_data', {
          ok: false,
          api_base: base,
          lexicon_id: lexiconId,
          items: [],
          error: geoLastApiError?.message || '请求失败'
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_question_words', payload }, '*');
  } catch {
  }
};

window.geoQuestionWordsSuggest = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const q = String(payload?.q || payload?.keyword || '').trim();
      const limit = Number(payload?.limit || 10) || 10;
      if (!q) {
        dispatchGeoMessage('geo_question_words_suggest_data', { ok: true, api_base: base, q, items: [] });
        return;
      }
      geoApiRequest(`/question-words/suggest?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_question_words_suggest_data', { ...r.data, ok: true, api_base: base, q });
          return;
        }
        dispatchGeoMessage('geo_question_words_suggest_data', {
          ok: false,
          api_base: base,
          q,
          items: [],
          error: geoLastApiError?.message || '请求失败'
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_question_words_suggest', payload }, '*');
  } catch {
  }
};

window.geoQueryProducts = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const page = Number(payload?.page || 1) || 1;
      const pageSize = Number(payload?.page_size || payload?.pageSize || 200) || 200;
      const keyword = String(payload?.keyword || '').trim();
      const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
      geoApiRequest(`/products?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}${q}`).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_products_data', { ...r.data, ok: true, api_base: base });
          return;
        }
        dispatchGeoMessage('geo_products_data', {
          ok: false,
          api_base: base,
          items: [],
          total: 0,
          error: geoLastApiError?.message || '请求失败'
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_products', payload }, '*');
  } catch {
  }
};

window.geoQueryEnterpriseImages = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const limit = Number(payload?.limit || 200) || 200;
      const category = String(payload?.category || '').trim();
      const q = category ? `&category=${encodeURIComponent(category)}` : '';
      geoApiRequest(`/enterprise-images?limit=${encodeURIComponent(limit)}${q}`).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_enterprise_images_data', { ...r.data, ok: true, api_base: base });
          return;
        }
        dispatchGeoMessage('geo_enterprise_images_data', {
          ok: false,
          api_base: base,
          categories: [],
          images: [],
          error: geoLastApiError?.message || '请求失败'
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_enterprise_images', payload }, '*');
  } catch {
  }
};

window.geoUiSavesGet = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const page = String(payload?.page || payload?.section || '').trim();
      if (!page) return;
      geoApiRequest(`/geo-ui-saves?page=${encodeURIComponent(page)}`).then((r) => {
        dispatchGeoMessage('geo_ui_saves_data', { ok: Boolean(r?.data), api_base: base, ...(r?.data || {}) });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_ui_saves_get', payload }, '*');
  } catch {
  }
};

window.geoUiSavesSave = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const page = String(payload?.page || payload?.section || '').trim();
      const data = payload?.payload ?? payload?.data ?? null;
      if (!page) return;
      geoApiRequest('/geo-ui-saves', { method: 'POST', body: JSON.stringify({ page, payload: data }) }).then((r) => {
        dispatchGeoMessage('geo_ui_saves_saved', { ok: Boolean(r?.data), api_base: base, ...(r?.data || {}), page });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_ui_saves_save', payload }, '*');
  } catch {
  }
};

window.geoArticleWritingInitChat = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const body = payload && typeof payload === 'object' ? { ...payload } : {};
      geoApiRequest('/article-writing/init-chat', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_article_writing_init_chat_result', {
          req_id: payload?.req_id,
          ok: Boolean(r?.data),
          api_base: base,
          error: r?.data ? '' : (geoLastApiError?.message || '请求失败'),
          text: String(r?.data?.text || '')
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_article_writing_init_chat', payload }, '*');
  } catch {
  }
};

window.geoArticleWritingChat = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const body = payload && typeof payload === 'object' ? { ...payload } : {};
      geoApiRequest('/article-writing/chat', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_article_writing_chat_result', {
          req_id: payload?.req_id,
          ok: Boolean(r?.data),
          api_base: base,
          error: r?.data ? '' : (geoLastApiError?.message || '请求失败'),
          text: String(r?.data?.text || '')
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_article_writing_chat', payload }, '*');
  } catch {
  }
};

window.geoArticleWritingGenerate = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const body = payload && typeof payload === 'object' ? { ...payload } : {};
      geoApiRequest('/article-writing/generate', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_article_writing_generate_result', {
          req_id: payload?.req_id,
          ok: Boolean(r?.data),
          api_base: base,
          error: r?.data ? '' : (geoLastApiError?.message || '请求失败'),
          text: String(r?.data?.text || '')
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_article_writing_generate', payload }, '*');
  } catch {
  }
};

window.geoArticleWritingOptimize = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const body = payload && typeof payload === 'object' ? { ...payload } : {};
      geoApiRequest('/article-writing/optimize', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_article_writing_optimize_result', {
          req_id: payload?.req_id,
          ok: Boolean(r?.data),
          api_base: base,
          error: r?.data ? '' : (geoLastApiError?.message || '请求失败'),
          text: String(r?.data?.text || ''),
          suggestions: String(r?.data?.suggestions || '')
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_article_writing_optimize', payload }, '*');
  } catch {
  }
};

window.geoArticleWritingSuggestions = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const body = payload && typeof payload === 'object' ? { ...payload } : {};
      geoApiRequest('/article-writing/suggestions', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_article_writing_suggestions_result', {
          req_id: payload?.req_id,
          ok: Boolean(r?.data),
          api_base: base,
          error: r?.data ? '' : (geoLastApiError?.message || '请求失败'),
          text: String(r?.data?.text || '')
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_article_writing_suggestions', payload }, '*');
  } catch {
  }
};

window.geoArticleWritingRewrite = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const body = payload && typeof payload === 'object' ? { ...payload } : {};
      geoApiRequest('/article-writing/rewrite', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_article_writing_rewrite_result', {
          req_id: payload?.req_id,
          ok: Boolean(r?.data),
          api_base: base,
          error: r?.data ? '' : (geoLastApiError?.message || '请求失败'),
          text: String(r?.data?.text || '')
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_article_writing_rewrite', payload }, '*');
  } catch {
  }
};

window.geoDeleteQuestionLexicons = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const ids = Array.isArray(payload?.ids) ? payload.ids : [];
      const idNums = ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
      if (!idNums.length) return;
      geoApiRequest('/question-words', { method: 'DELETE', body: JSON.stringify(idNums) }).then((r) => {
        dispatchGeoMessage('geo_delete_question_lexicons_result', { ok: Boolean(r?.data), ...(r?.data || {}) });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_delete_question_lexicons', payload }, '*');
  } catch {
  }
};

window.geoLlmGenerate = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const kind = String(payload?.kind || '').trim();
      const task = kind === 'title' ? 'generate_title' : (kind === 'activity_desc' ? 'generate_activity_desc' : '');
      if (!task) return;
      const lexiconId = String(payload?.lexicon_id || '').trim();
      const body = {
        task,
        lexicon_id: lexiconId ? Number(lexiconId) : null,
        keyword: String(payload?.keyword || ''),
        hint: String(payload?.hint || '')
      };
      geoApiRequest('/ai/execute', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_llm_generate_result', {
          kind,
          req_id: payload?.req_id,
          ok: Boolean(r?.data),
          api_base: base,
          error: r?.data ? '' : (geoLastApiError?.message || '请求失败'),
          text: String(r?.data?.text || '')
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_llm_generate', payload }, '*');
  } catch {
  }
};

window.geoAiExecute = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const body = payload && typeof payload === 'object' ? { ...payload } : {};
      geoApiRequest('/ai/execute', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
        dispatchGeoMessage('geo_ai_execute_result', {
          req_id: payload?.req_id,
          task: String(payload?.task || ''),
          ok: Boolean(r?.data),
          api_base: base,
          error: r?.data ? '' : (geoLastApiError?.message || '请求失败'),
          text: String(r?.data?.text || ''),
        });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_ai_execute', payload }, '*');
  } catch {
  }
};

window.geoUploadFile = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (!base) return;
    const f = payload?.file;
    if (!(f instanceof File)) return;
    const req_id = payload?.req_id;
    const fd = new FormData();
    fd.append('file', f, f.name);
    geoApiUpload('/files/upload', fd).then((r) => {
      dispatchGeoMessage('geo_upload_file_result', { req_id, data: r?.data || null });
    });
  } catch {
  }
};

window.geoImportProducts = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (!base) return;
    const f = payload?.file;
    if (!(f instanceof File)) return;
    const req_id = payload?.req_id;
    const fd = new FormData();
    fd.append('file', f, f.name);
    geoApiUpload('/knowledge-base/products/import', fd).then((r) => {
      dispatchGeoMessage('geo_import_products_result', { req_id, rows: r?.data?.rows || [] });
    });
  } catch {
  }
};

window.geoDownloadEnterpriseIntroWord = async function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (!base) return;
    const res = await fetch(`${base}/knowledge-base/docs/export-word`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const msg = json?.error?.message || json?.message || '下载失败';
      alert(String(msg));
      return;
    }
    const blob = await res.blob();
    const cd = String(res.headers.get('Content-Disposition') || '');
    let filename = '企业介绍.doc';
    const mStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (mStar && mStar[1]) {
      try {
        filename = decodeURIComponent(mStar[1]);
      } catch {
        filename = mStar[1];
      }
    } else {
      const m = cd.match(/filename\s*=\s*\"?([^\";]+)\"?/i);
      if (m && m[1]) filename = m[1];
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
      }
    }, 1000);
  } catch (e) {
    alert(String(e?.message || e || '下载失败'));
  }
};

window.geoDownloadWord = async function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (!base) return;
    const res = await fetch(`${base}/export/word`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const msg = json?.error?.message || json?.message || '下载失败';
      alert(String(msg));
      return;
    }
    const blob = await res.blob();
    const cd = String(res.headers.get('Content-Disposition') || '');
    let filename = '文档.doc';
    const mStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (mStar && mStar[1]) {
      try {
        filename = decodeURIComponent(mStar[1]);
      } catch {
        filename = mStar[1];
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
      }
    }, 1000);
  } catch (e) {
    alert(String(e?.message || e || '下载失败'));
  }
};

window.geoDownloadExcel = async function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (!base) return;
    const res = await fetch(`${base}/export/excel`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const msg = json?.error?.message || json?.message || '下载失败';
      alert(String(msg));
      return;
    }
    const blob = await res.blob();
    const cd = String(res.headers.get('Content-Disposition') || '');
    let filename = '表格.xlsx';
    const mStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (mStar && mStar[1]) {
      try {
        filename = decodeURIComponent(mStar[1]);
      } catch {
        filename = mStar[1];
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
      }
    }, 1000);
  } catch (e) {
    alert(String(e?.message || e || '下载失败'));
  }
};

window.geoSummarizeUrls = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (!base) return;
    const req_id = String(payload?.req_id || '').trim();
    const urls = payload?.urls;
    geoApiRequest('/tools/summarize-urls', { method: 'POST', body: JSON.stringify({ urls }) }).then((r) => {
      dispatchGeoMessage('geo_summarize_urls_result', { req_id, data: r?.data || null });
    });
  } catch {
  }
};

window.geoArticleGenerate = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      geoApiRequest('/articles', { method: 'POST', body: JSON.stringify(payload || {}) }).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_article_generate_result', { ok: true, ...(r.data || {}) });
        } else {
          dispatchGeoMessage('geo_article_generate_result', { ok: false, error: '生成失败' });
        }
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_article_generate', payload }, '*');
  } catch {
  }
};

window.geoQueryArticles = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const limit = Number(payload?.limit || 0) || 0;
      const page = Number(payload?.page || 1) || 1;
      const pageSize = Number(payload?.page_size || payload?.pageSize || (limit > 0 ? limit : 10)) || 10;
      const keyword = String(payload?.keyword || '').trim();
      const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
      geoApiRequest(`/articles?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}${q}`).then((r) => {
        if (r?.data) {
          dispatchGeoMessage('geo_articles_data', { ...(r.data || {}), page, pageSize });
          return;
        }
        dispatchGeoMessage('geo_articles_data', { items: [], total: 0, page, pageSize });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_articles', payload }, '*');
  } catch {
  }
};

window.geoQueryArticleDetail = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const id = String(payload?.id || '').trim();
      if (!id) return;
      geoApiRequest(`/articles/${encodeURIComponent(id)}`).then((r) => {
        if (r?.data) dispatchGeoMessage('geo_article_detail', { id, item: r.data });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_query_article_detail', payload }, '*');
  } catch {
  }
};

window.geoReviewArticle = function(payload) {
  try {
    const base = getGeoApiBaseUrl();
    if (base) {
      const id = String(payload?.id || '').trim();
      if (!id) return;
      geoApiRequest(`/articles/${encodeURIComponent(id)}/review`, { method: 'POST', body: '{}' }).then((r) => {
        dispatchGeoMessage('geo_article_review_result', { id, ok: !!r?.data?.reviewed });
      });
      return;
    }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'geo_review_article', payload }, '*');
  } catch {
  }
};

function setActiveMenu(page) {
  document.querySelectorAll('[data-page]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-page') === page);
  });
}

function normalizeInputPlaceholders(root) {
  const scope = root || document;
  scope.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
    const raw = String(el.getAttribute('placeholder') || '');
    if (!raw) return;
    const next = raw.replace(/^\s*请输入\s*/g, '').trim();
    if (!next) {
      el.removeAttribute('placeholder');
      return;
    }
    el.setAttribute('placeholder', next);
  });
}

function normalizeTables(root) {
  const scope = root || document;
  scope.querySelectorAll('table').forEach((table) => {
    const parent = table.parentElement;
    if (!parent) return;
    if (parent.classList.contains('table-wrap')) return;
    if (parent.classList.contains('table-scroll')) return;
    if (parent.classList.contains('table-shell')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    parent.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
}

async function loadPage(page) {
  const config = PAGES[page];
  if (!config) return;

  const contentBody = document.getElementById('contentBody');
  if (!contentBody) return;

  try {
    const main = document.querySelector('.main');
    if (main) {
      main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  } catch {
  }

  if (currentModule?.destroy) {
    try {
      currentModule.destroy();
    } catch {
    }
  }

  contentBody.innerHTML = `<div class="card"><div class="loading">加载中...</div></div>`;

  const v = encodeURIComponent(GEO_BUILD_ID);
  const htmlUrl = `${config.file}?v=${v}`;
  const res = await fetch(htmlUrl, { cache: 'no-store' });
  if (!res.ok) {
    contentBody.innerHTML = `<div class="card"><div class="empty">页面加载失败</div></div>`;
    return;
  }

  const html = await res.text();
  contentBody.innerHTML = page === 'home' ? html : `<div class="page-shell">${html}</div>`;
  contentBody.dataset.page = page;
  normalizeInputPlaceholders(contentBody);
  normalizeTables(contentBody);

  try {
    const mod = await import(`./${config.script}?v=${v}`);
    currentModule = mod.default;
    if (currentModule?.init) await currentModule.init();
  } catch (e) {
    const msg = String(e?.message || e || '页面脚本加载失败');
    try {
      contentBody.insertAdjacentHTML('afterbegin', `<div class="card" style="margin-bottom:12px;"><div class="empty">页面脚本加载失败：${msg.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</div></div>`);
    } catch {
    }
    try {
      alert(msg);
    } catch {
    }
  }

  applyLlmSvgIcons(contentBody);

  currentPage = page;
  setActiveMenu(page);
  document.title = `时代科技 - ${config.title}`;
}

window.addEventListener('message', (event) => {
  const d = event.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'geo_api_config') {
    const baseUrl = d.payload?.baseUrl;
    if (baseUrl) setGeoApiBaseUrl(baseUrl);
    return;
  }
  if (d.type === 'geo_llm_svg_manifest') {
    const payload = d.payload || {};
    llmSvgManifest = {
      files: Array.isArray(payload.files) ? payload.files : [],
      baseUrl: payload.baseUrl || 'llm-svg'
    };
    applyLlmSvgIcons(document);
    return;
  }

  if (d.type === 'geo_official_publish_data') {
    const payload = d.payload || {};
    if (!payload || !Array.isArray(payload.rows)) return;
    window.__geoOfficialPublishData = payload;
    try {
      localStorage.setItem('official_publish_xls_data_v1', JSON.stringify({ ts: payload.ts || Date.now(), rows: payload.rows }));
    } catch {
    }
    return;
  }

  if (d.type === 'geo_data_statistics_data') {
    const payload = d.payload || {};
    if (!payload || !Array.isArray(payload.sheets)) return;
    window.__geoDataStatisticsData = payload;
    try {
      localStorage.setItem('geo_data_statistics_data_v1', JSON.stringify(payload));
    } catch {
    }
    return;
  }

  if (d.type === 'geo_public_opinion_config') {
    const payload = d.payload || {};
    if (!payload || typeof payload !== 'object') return;
    window.__geoPublicOpinionConfig = payload;
    try {
      localStorage.setItem('geo_public_opinion_config_v1', JSON.stringify(payload));
    } catch {
    }
    return;
  }

  if (d.type === 'geo_question_lexicons_data') {
    window.__geoQuestionLexicons = d.payload || {};
    return;
  }

  if (d.type === 'geo_question_words_data') {
    window.__geoQuestionWords = d.payload || {};
    return;
  }

  if (d.type === 'geo_article_generate_result') {
    window.__geoLastArticleGenerate = d.payload || {};
    return;
  }

  if (d.type === 'geo_articles_data') {
    window.__geoArticlesData = d.payload || {};
    return;
  }

  if (d.type === 'geo_article_detail') {
    window.__geoArticleDetail = d.payload || {};
    return;
  }
});

function initSystemExpiry() {
  const el = document.getElementById('sysExpiry');
  if (!el) return;
  el.textContent = '系统到期时间：2026-12-31';
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  function syncNestedVisibility(parentToggle) {
    const parentOpen = sidebar.getAttribute(`data-open-${parentToggle}`) === 'true';
    sidebar.querySelectorAll(`[data-parent="${parentToggle}"][data-toggle]`).forEach((el) => {
      const childToggle = el.getAttribute('data-toggle');
      if (!childToggle) return;
      const childOpen = sidebar.getAttribute(`data-open-${childToggle}`) === 'true';
      sidebar.querySelectorAll(`[data-parent="${childToggle}"]`).forEach((sub) => {
        sub.classList.toggle('hidden', !parentOpen || !childOpen);
      });
    });
  }

  sidebar.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const node = target.closest('[data-page],[data-toggle]');
    if (!(node instanceof HTMLElement)) return;

    const toggle = node.getAttribute('data-toggle');
    if (toggle) {
      const opened = sidebar.getAttribute(`data-open-${toggle}`) === 'true';
      sidebar.setAttribute(`data-open-${toggle}`, opened ? 'false' : 'true');
      sidebar.querySelectorAll(`[data-parent="${toggle}"]`).forEach((el) => {
        el.classList.toggle('hidden', opened);
      });

      syncNestedVisibility(toggle);

      if (!opened && !node.getAttribute('data-page')) {
        const defaultPage = node.getAttribute('data-default-page');
        if (defaultPage) {
          loadPage(defaultPage);
        }
      }
    }

    const page = node.getAttribute('data-page');
    if (page) {
      loadPage(page);
    }
  });

  ['prepare', 'geo', 'analysis'].forEach((k) => {
    sidebar.setAttribute(`data-open-${k}`, 'true');
    sidebar.querySelectorAll(`[data-parent="${k}"]`).forEach((el) => el.classList.remove('hidden'));
  });

  sidebar.setAttribute('data-open-stats', 'false');

  syncNestedVisibility('analysis');
  syncNestedVisibility('stats');
}

initSystemExpiry();

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'geo_request_api_config' }, '*');
      window.parent.postMessage({ type: 'geo_request_official_publish_data' }, '*');
    }
  } catch {
  }
  await loadPage('home');
});

document.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest('button');
  if (!button) return;
  button.classList.toggle('btn-active');
});
