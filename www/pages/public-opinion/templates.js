export function tplCreateMonitor(h) {
  return `<div class="page-muted" style="margin-bottom: 10px;">占位：后端接入后可保存到数据库。</div>
  <div style="display:flex; flex-direction:column; gap:10px;">
    <input class="input" id="po_m_name" placeholder="任务名称" />
    <input class="input" id="po_m_keywords" placeholder="关键词（逗号分隔）" />
    <input class="input" id="po_m_platforms" placeholder="平台（逗号分隔，如：微博,知乎,抖音）" />
    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 4px;">
      <button class="btn-primary" id="po_m_cancel">取消</button>
      <button class="btn-solid" id="po_m_create">创建</button>
    </div>
  </div>`;
}

export function tplAddKeyword(h, monitor) {
  return `<div class="page-muted" style="margin-bottom: 10px;">任务：<b>${h(monitor.name)}</b></div>
  <div style="display:flex; flex-direction:column; gap:10px;">
    <input class="input" id="po_kw" placeholder="输入关键词" />
    <div class="page-muted">现有：${h(monitor.keywords.join('、'))}</div>
    <div style="display:flex; justify-content:flex-end; gap:10px;">
      <button class="btn-primary" id="po_kw_cancel">取消</button>
      <button class="btn-solid" id="po_kw_add">添加</button>
    </div>
  </div>`;
}

export function tplMonitorDetail(h, monitor) {
  return `<div style="display:flex; flex-direction:column; gap:10px;">
    <div class="card" style="padding:12px;">
      <div class="page-muted">名称</div>
      <div style="font-weight:900; margin-top: 6px;">${h(monitor.name)}</div>
    </div>
    <div class="card" style="padding:12px;">
      <div class="page-muted">关键词</div>
      <div style="margin-top: 6px; font-weight:800;">${h(monitor.keywords.join('、'))}</div>
    </div>
    <div class="card" style="padding:12px;">
      <div class="page-muted">平台</div>
      <div style="margin-top: 6px; font-weight:800;">${h(monitor.platforms.join('、'))}</div>
    </div>
    <div class="page-muted">状态：${monitor.status === 'enabled' ? '启用' : '暂停'}，更新时间：${h(monitor.updated_at)}</div>
  </div>`;
}

export function tplEventDetail(h, event) {
  const badge = event.sentiment === 'positive'
    ? `<span class="badge badge-green">正面</span>`
    : event.sentiment === 'negative'
      ? `<span class="badge badge-red">负面</span>`
      : `<span class="badge badge-gray">中性</span>`;
  return `<div style="display:flex; flex-direction:column; gap:10px;">
    <div style="font-weight:900; font-size: 16px;">${h(event.title)}</div>
    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
      ${badge}
      <span class="badge badge-blue">热度 ${event.heat}</span>
      <span class="badge badge-gray">来源 ${h(event.source)}</span>
      <span class="badge badge-gray">时间 ${h(event.time)}</span>
    </div>
    <div class="card" style="padding:12px;">
      <div class="page-muted">摘要</div>
      <div style="margin-top: 6px; line-height: 1.8;">${h(event.summary)}</div>
    </div>
    <div style="display:flex; justify-content:flex-end; gap:10px;">
      <button class="btn-primary" id="po_copy_link">复制链接</button>
      <button class="btn-solid" id="po_open_link">打开链接</button>
    </div>
  </div>`;
}

export function tplAddRule(h) {
  return `<div class="page-muted" style="margin-bottom: 10px;">占位：后端接入后可保存并配置通知渠道。</div>
  <div style="display:flex; flex-direction:column; gap:10px;">
    <input class="input" id="po_r_name" placeholder="规则名称" />
    <input class="input" id="po_r_cond" placeholder="触发条件（示例：负面>=3 或 热度>=80）" />
    <select class="select" id="po_r_channel">
      <option value="站内通知">站内通知</option>
      <option value="企业微信">企业微信</option>
      <option value="邮件">邮件</option>
    </select>
    <div style="display:flex; justify-content:flex-end; gap:10px;">
      <button class="btn-primary" id="po_r_cancel">取消</button>
      <button class="btn-solid" id="po_r_add">添加</button>
    </div>
  </div>`;
}

export function tplRuleDetail(h, rule) {
  return `<div style="display:flex; flex-direction:column; gap:10px;">
    <div class="card" style="padding:12px;">
      <div class="page-muted">名称</div>
      <div style="font-weight:900; margin-top: 6px;">${h(rule.name)}</div>
    </div>
    <div class="card" style="padding:12px;">
      <div class="page-muted">触发条件</div>
      <div style="margin-top: 6px; line-height: 1.8;">${h(rule.condition)}</div>
    </div>
    <div class="page-muted">通知：${h(rule.channel)}；状态：${rule.enabled ? '启用' : '暂停'}</div>
  </div>`;
}
