[OPEN] graph-wheel-zoom

# Debug Session

- Session ID: `graph-wheel-zoom`
- Started: `2026-06-17`
- Symptom: 企业知识图谱弹窗页面滚轮缩放仍未生效。
- Expected: 鼠标悬停图谱区域滚轮可触发缩放。

# Hypotheses

1. 图谱区域没有收到 `wheel` 事件。
2. `wheel` 事件触发后被弹窗或页面滚动容器接管。
3. `kbGraphViewState` 已变化，但 `transform` 没应用到实际可见的 SVG 图层。
4. 图谱在缩放后被重绘，导致变换立即被覆盖。
5. 当前运行页面加载的不是最新 `knowledge-base/page.js`。

# Evidence Log

- Instrumentation added in `www/pages/knowledge-base/page.js`.
- Visual debug panel added in `www/pages/knowledge-base/page.html`.
- User feedback: graph rendered, `build=2026-06-04-reform-2`, `ready=true`, `viewport=true`, `wheelCount=0`, `scale=1`.
- Conclusion: rendered graph is current build and transform path works, but wheel event is not entering graph zoom handler in user environment.

# Next Step

- Retry with modal-level wheel routing and verify whether `wheelCount` starts increasing.
