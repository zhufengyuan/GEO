export function randInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function createMockMonitors() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: 'm_brand',
      name: '品牌口碑监测',
      keywords: ['时代科技', '品牌', '口碑', '服务'],
      platforms: ['微博', '知乎', '新闻'],
      status: 'enabled',
      updated_at: today,
      today_mentions: randInt(20, 120)
    },
    {
      id: 'm_product',
      name: '产品反馈监测',
      keywords: ['产品', '质量', '售后', '体验'],
      platforms: ['小红书', '抖音', '新闻'],
      status: 'enabled',
      updated_at: today,
      today_mentions: randInt(10, 90)
    },
    {
      id: 'm_comp',
      name: '竞品对比监测',
      keywords: ['竞品A', '竞品B', '对比'],
      platforms: ['知乎', '论坛'],
      status: 'paused',
      updated_at: today,
      today_mentions: randInt(0, 30)
    }
  ];
}

export function createMockEvents() {
  const now = new Date();
  const mk = (daysAgo, title, source, sentiment, heat) => {
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    const time = `${d.toISOString().slice(0, 10)} ${String(randInt(9, 22)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}`;
    return {
      id: `e_${daysAgo}_${heat}_${Math.random().toString(16).slice(2, 8)}`,
      title,
      source,
      time,
      sentiment,
      heat,
      summary: '这里是事件摘要的占位内容，用于展示关键信息、传播范围与风险点。后端接入后会替换为真实摘要。',
      url: 'https://example.com/'
    };
  };
  return [
    mk(0, '用户反馈：交付响应速度明显提升', '知乎', 'positive', randInt(40, 78)),
    mk(0, '讨论：某功能使用门槛偏高，引发吐槽', '微博', 'negative', randInt(65, 95)),
    mk(1, '行业报告提及相关解决方案趋势', '新闻', 'neutral', randInt(30, 70)),
    mk(2, '测评：服务体验对比分析', '小红书', 'neutral', randInt(35, 80)),
    mk(3, '投诉：售后沟通不畅导致误解', '论坛', 'negative', randInt(55, 92)),
    mk(5, '案例分享：最佳实践与方法论整理', '新闻', 'positive', randInt(25, 60))
  ];
}

export function createMockRules() {
  return [
    { id: 'r1', name: '负面突增预警', condition: '同一任务在 2 小时内负面 >= 3', channel: '站内通知', enabled: true, triggered_today: randInt(0, 2) },
    { id: 'r2', name: '高热度事件预警', condition: '热度 >= 80 且情感=负面', channel: '企业微信', enabled: true, triggered_today: randInt(0, 1) },
    { id: 'r3', name: '重点词命中预警', condition: '命中关键词："投诉"、"维权"', channel: '邮件', enabled: false, triggered_today: 0 }
  ];
}

export function createMockSources() {
  return [
    { id: 's_weibo', name: '微博', enabled: true },
    { id: 's_zhihu', name: '知乎', enabled: true },
    { id: 's_xhs', name: '小红书', enabled: true },
    { id: 's_douyin', name: '抖音', enabled: false },
    { id: 's_news', name: '新闻', enabled: true },
    { id: 's_forum', name: '论坛', enabled: false }
  ];
}
