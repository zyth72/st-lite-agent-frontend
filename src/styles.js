/**
 * 插件样式(style#lite-agent-style)。
 * 规范:Material 3(M3)暗色主题 token——surface/tonal 分层、状态层、
 * 大圆角卡片(12dp)、pill 按钮、filled 输入框;primary 采用蓝紫色调,
 * 观感接近 Miuix/MIUI 的圆润风格。
 *
 * 球/面板用 position:absolute 而不是 fixed:ST 在 ≤1000px 视口把 body 设为
 * position:fixed,叠加 html 上的 -webkit-transform/-webkit-perspective,html 会
 * 成为 fixed 后代的包含块且高度为 0,right/bottom 定位会被推到视口外。
 * 原生控件(input/button/checkbox/details/滚动条)全部用本文件规则覆盖
 * (!important 压过 ST 全局主题),否则会以浏览器默认样式渲染。
 */
export function css() {
  if (!document.getElementById('lite-agent-md-style')) {
    const link = document.createElement('link');
    link.id = 'lite-agent-md-style';
    link.rel = 'stylesheet';
    link.href = new URL('./lib/github-markdown-dark.min.css', import.meta.url).href;
    document.head.appendChild(link);
  }
  if (document.getElementById('lite-agent-style')) return;
  const s = document.createElement('style');
  s.id = 'lite-agent-style';
  s.textContent = `/* ===== M3 设计令牌(暗色/蓝紫 primary) ===== */
#lite-agent-panel {
  --md-surface: #141218;
  --md-surface-lowest: #0f0d13;
  --md-surface-low: #1d1b20;
  --md-surface-container: #211f26;
  --md-surface-high: #2b2930;
  --md-surface-highest: #36343b;
  --md-on-surface: #e6e1e5;
  --md-on-surface-variant: #cac4d0;
  --md-outline: #938f99;
  --md-outline-variant: #49454f;
  --md-primary: #a8c8ff;
  --md-on-primary: #102f5c;
  --md-primary-container: #3e4f78;
  --md-on-primary-container: #d9e3ff;
  --md-secondary-container: #4a4458;
  --md-on-secondary-container: #e8def8;
  --md-error: #f2b8b5;
  --md-ok: #7bdb9a;
  --md-run: #f5c77e;
  --md-state-hover: rgba(230, 225, 229, 0.08);
  --md-state-focus: rgba(230, 225, 229, 0.12);
  --md-state-pressed: rgba(230, 225, 229, 0.16);
  position: absolute;
  display: none;
  flex-direction: column;
  z-index: 2147483646;
  overflow: hidden;
  width: 440px;
  max-width: 440px;
  height: min(64vh, 680px);
  max-height: 92vh;
  background: rgba(20, 18, 24, 0.96);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(147, 143, 153, 0.14);
  border-radius: 28px;
  color: var(--md-on-surface);
  font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
}
#lite-agent-panel.open { display: flex; }
#lite-agent-panel ::selection { background: rgba(168, 200, 255, 0.28); }

/* ===== 悬浮球(M3 FAB 变体) ===== */
#lite-agent-ball {
  position: absolute;
  width: 48px; height: 48px;
  border-radius: 16px;
  background: var(--md-surface-high);
  border: none;
  color: var(--md-primary);
  font-size: 21px;
  line-height: 47px;
  text-align: center;
  cursor: pointer;
  z-index: 2147483647;
  user-select: none;
  touch-action: none;
  transform: translateZ(0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
}
#lite-agent-ball:hover { background: var(--md-surface-highest); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5); transform: translateZ(0) scale(1.05); }
#lite-agent-ball:active { transform: translateZ(0) scale(0.98); }

/* ===== 面板头 ===== */
#lite-agent-head {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(147, 143, 153, 0.16);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  cursor: move;
  touch-action: none;
  user-select: none;
}
#lite-agent-head .la-title { color: var(--md-on-surface); font-size: 14px; font-weight: 500; letter-spacing: .2px; }
#lite-agent-head .la-title::before { content: '⚡'; margin-right: 7px; color: var(--md-primary); }
#lite-agent-head button.la-stop { color: var(--md-error) !important; }
#lite-agent-status { width: 8px; height: 8px; border-radius: 50%; background: var(--md-outline-variant); display: inline-block; margin-right: 2px; }
#lite-agent-status.ok { background: var(--md-ok); box-shadow: 0 0 0 3px rgba(123, 219, 154, 0.14); }
#lite-agent-status.err { background: var(--md-error); box-shadow: 0 0 0 3px rgba(242, 184, 181, 0.14); }

/* ===== 原生控件覆盖(M3 filled / pill,!important 压过 ST 主题) ===== */
#lite-agent-panel input[type=text],
#lite-agent-panel input[type=password],
#lite-agent-panel input[type=number],
#lite-agent-panel select {
  background: var(--md-surface-highest) !important;
  border: 1px solid transparent !important;
  color: var(--md-on-surface) !important;
  border-radius: 12px !important;
  padding: 8px 12px !important;
  font-size: 13px !important;
  font-family: inherit !important;
  outline: none !important;
  box-shadow: none !important;
  transition: background .18s ease, border-color .18s ease, box-shadow .18s ease;
}
#lite-agent-panel input::placeholder { color: var(--md-outline) !important; }
#lite-agent-panel input[type=text]:hover,
#lite-agent-panel input[type=password]:hover,
#lite-agent-panel input[type=number]:hover,
#lite-agent-panel select:hover { background: #3b3942 !important; }
#lite-agent-panel input[type=text]:focus,
#lite-agent-panel input[type=password]:focus,
#lite-agent-panel input[type=number]:focus,
#lite-agent-panel select:focus {
  background: #3b3942 !important;
  border-color: var(--md-primary) !important;
  box-shadow: 0 0 0 1px var(--md-primary) !important;
}
#lite-agent-head input[type=text] { width: 120px !important; flex: 0 1 auto; }
#lite-agent-panel input[type=checkbox] {
  accent-color: var(--md-primary) !important;
  width: 16px !important; height: 16px !important; cursor: pointer; margin: 0;
}
#lite-agent-panel input[type=number] { width: 74px !important; }

/* 按钮:M3 text/tonal/filled 三档,统一 pill */
#lite-agent-panel button {
  background: transparent !important;
  border: none !important;
  color: var(--md-primary) !important;
  border-radius: 20px !important;
  padding: 7px 14px !important;
  font-size: 13px !important;
  font-family: inherit !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  cursor: pointer;
  text-shadow: none !important;
  box-shadow: none !important;
  transition: background .18s ease, color .18s ease;
}
#lite-agent-panel button:hover { background: var(--md-state-hover) !important; }
#lite-agent-panel button:focus-visible { background: var(--md-state-focus) !important; }
#lite-agent-panel button:active { background: var(--md-state-pressed) !important; }
#lite-agent-panel #lite-agent-head button { padding: 6px 12px !important; }
#lite-agent-body button { background: var(--md-primary) !important; color: var(--md-on-primary) !important; }
#lite-agent-body button:hover { background: #93b6f2 !important; box-shadow: 0 2px 8px rgba(168, 200, 255, 0.2) !important; }
#lite-agent-body button.la-btn-tonal { background: var(--md-secondary-container) !important; color: var(--md-on-secondary-container) !important; }
#lite-agent-body button.la-btn-tonal:hover { background: #544e63 !important; }

/* ===== 面板体与滚动条 ===== */
#lite-agent-body { flex: 1; overflow-y: auto; min-height: 0; padding: 12px 14px 20px; }
#lite-agent-body::-webkit-scrollbar { width: 8px; height: 8px; }
#lite-agent-body::-webkit-scrollbar-thumb { background: var(--md-outline-variant); border-radius: 4px; }
#lite-agent-body::-webkit-scrollbar-thumb:hover { background: #565266; }
#lite-agent-body::-webkit-scrollbar-track { background: transparent; }

/* ===== 步骤卡片(M3 filled card,圆角 12dp,无描边) ===== */
.la-group {
  background: rgba(43, 41, 48, 0.72);
  border: 1px solid rgba(147, 143, 153, 0.10);
  border-radius: 16px;
  padding: 12px 14px 14px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
  transition: border-color .2s ease, background .2s ease;
}
.la-group:hover { border-color: rgba(147, 143, 153, 0.22); }
.la-group:has(.la-step-dot.running) { border-color: rgba(245, 199, 126, 0.35); background: rgba(48, 43, 40, 0.72); }
.la-step-head { display: flex; align-items: center; gap: 9px; margin-bottom: 2px; cursor: pointer; user-select: none; border-radius: 10px; padding: 3px 4px; margin: -3px -4px; transition: background .18s ease; }
.la-step-head:hover { background: var(--md-state-hover); }
.la-step-head::after {
  content: '';
  margin-left: auto;
  width: 8px; height: 8px;
  border-right: 1.8px solid var(--md-outline);
  border-bottom: 1.8px solid var(--md-outline);
  transform: rotate(-135deg);
  transition: transform .2s ease;
}
.la-group.closed .la-step-head::after { transform: rotate(45deg); }
/* 单卡整体折叠:折叠后只留标题行 */
.la-group.closed > details { display: none; }
.la-step-title { font-size: 13.5px; font-weight: 600; color: var(--md-on-surface); letter-spacing: .2px; }
.la-stage-icon { font-size: 12.5px; width: 16px; text-align: center; color: var(--md-on-surface-variant); opacity: .9; }
.la-status-text {
  margin-left: 2px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .05em;
  padding: 1px 8px;
  border-radius: 999px;
}
.la-status-text.running { color: var(--md-run); background: rgba(245, 199, 126, 0.12); }
.la-status-text.done { color: var(--md-ok); background: rgba(123, 219, 154, 0.10); }
.la-status-text.failed { color: var(--md-error); background: rgba(242, 184, 181, 0.12); }
.la-step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--md-outline-variant); flex: none; }
.la-step-dot.running { background: var(--md-run); box-shadow: 0 0 0 3px rgba(245, 199, 126, 0.14); animation: la-pulse 1.6s ease-in-out infinite; }
.la-step-dot.done { background: var(--md-ok); box-shadow: 0 0 0 3px rgba(123, 219, 154, 0.14); }
.la-step-dot.failed { background: var(--md-error); box-shadow: 0 0 0 3px rgba(242, 184, 181, 0.14); }
@keyframes la-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(245, 199, 126, 0.14); }
  50% { box-shadow: 0 0 0 6px rgba(245, 199, 126, 0.05); }
}

/* ===== 折叠区(M3 化 details/summary) ===== */
.la-group details { margin-top: 6px; }
.la-group details[open] { margin-bottom: 2px; }
.la-group summary {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  margin: 0 -2px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  user-select: none;
  list-style: none;
  transition: background .18s ease, color .18s ease;
}
.la-group summary::-webkit-details-marker { display: none; }
.la-group summary:hover { background: var(--md-state-hover); color: var(--md-on-surface); }
.la-group summary::after {
  content: '';
  margin-left: auto;
  width: 8px; height: 8px;
  border-right: 1.8px solid var(--md-outline);
  border-bottom: 1.8px solid var(--md-outline);
  transform: rotate(45deg);
  transition: transform .2s ease;
}
.la-group details[open] > summary::after { transform: rotate(-135deg); }
.la-sum-icon { font-size: 12px; width: 16px; text-align: center; color: var(--md-outline); transition: color .18s ease; }
.la-group summary:hover .la-sum-icon { color: var(--md-primary); }
.la-sum-meta { color: var(--md-outline); font-size: 11px; font-weight: 400; letter-spacing: .02em; }
.la-group summary:hover .la-sum-meta { color: var(--md-on-surface-variant); }

/* ===== 内容块(嵌套 lower 层级) ===== */
.la-reason-body, .la-card {
  background: var(--md-surface-lowest);
  border: none;
  border-radius: 12px;
  padding: 10px 12px;
  margin-top: 5px;
}
.la-pre {
  margin: 0;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: 0;
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, 'Noto Sans Mono CJK SC', monospace;
  font-size: 12.5px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--md-on-surface-variant);
}
.la-pre blockquote { margin: 0; padding: 2px 0 2px 10px; border-left: 3px solid rgba(168, 200, 255, 0.3); color: var(--md-on-surface-variant); }

/* ===== markdown 主题适配(github-markdown-css dark,vendor 在 lib/)=====
 * 主题自身 scoped 在 .markdown-body;这里用 #lite-agent-panel 前缀压过它的
 * 默认字号/背景/大间距,融进 M3 面板(透明底、紧凑行距、主题强调色)。 */
#lite-agent-panel pre.markdown-body {
  background: transparent;
  margin: 0; padding: 0;
  font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--md-on-surface-variant);
  white-space: normal;
  word-break: break-word;
}
#lite-agent-panel .markdown-body p { margin: 0 0 6px; }
#lite-agent-panel .markdown-body p:last-child { margin-bottom: 0; }
#lite-agent-panel .markdown-body ul, #lite-agent-panel .markdown-body ol { margin: 2px 0 8px; padding-left: 20px; }
#lite-agent-panel .markdown-body li { margin: 2px 0; }
#lite-agent-panel .markdown-body li > p { margin: 0; }
#lite-agent-panel .markdown-body li::marker { color: var(--md-outline); }
#lite-agent-panel .markdown-body h1, #lite-agent-panel .markdown-body h2, #lite-agent-panel .markdown-body h3,
#lite-agent-panel .markdown-body h4, #lite-agent-panel .markdown-body h5, #lite-agent-panel .markdown-body h6 {
  margin: 8px 0 4px; padding: 0; border-bottom: none;
  font-size: 13px; color: var(--md-primary);
}
#lite-agent-panel .markdown-body strong { color: var(--md-on-surface); }
#lite-agent-panel .markdown-body a { color: var(--md-primary); }
#lite-agent-panel .markdown-body hr { margin: 8px 0; background: var(--md-outline-variant); height: 1px; }
#lite-agent-panel .markdown-body blockquote {
  color: var(--md-on-surface-variant);
  border-left: 3px solid rgba(168, 200, 255, 0.35);
}
#lite-agent-panel .markdown-body table { font-size: 12px; }
#lite-agent-panel .la-out.la-prose pre.markdown-body {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', Georgia, serif;
  font-size: 15.5px; line-height: 1.95; color: var(--md-on-surface);
}

/* 写作正文:小说排版(衬线 + 大行距) */
.la-out.la-prose .la-pre { font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', Georgia, serif; font-size: 15.5px; line-height: 1.95; color: var(--md-on-surface); }

.la-card-head { display: flex; align-items: center; gap: 8px; margin: 2px 0 6px; color: var(--md-outline); font-size: 11px; }
.la-card-head span { letter-spacing: .06em; }
#lite-agent-body button.la-copy {
  margin-left: auto;
  background: transparent !important;
  border: 1px solid var(--md-outline-variant) !important;
  color: var(--md-on-surface-variant) !important;
  border-radius: 10px !important;
  font-size: 11px !important;
  padding: 2px 10px !important;
  cursor: pointer;
  transition: background .18s ease, color .18s ease, border-color .18s ease;
}
#lite-agent-body button.la-copy:hover { background: var(--md-state-hover) !important; color: var(--md-on-surface) !important; border-color: var(--md-outline) !important; }
#lite-agent-body button.la-md-toggle {
  background: rgba(168, 200, 255, 0.12) !important;
  border: 1px solid rgba(168, 200, 255, 0.35) !important;
  color: var(--md-primary) !important;
  border-radius: 10px !important;
  font-size: 11px !important;
  padding: 2px 10px !important;
}
#lite-agent-body button.la-md-toggle:hover { background: rgba(168, 200, 255, 0.22) !important; border-color: var(--md-primary) !important; }

/* ===== 设置面板组件(M3 分组卡片) ===== */
.la-dim { color: var(--md-outline); font-size: 12px; padding: 12px; }
.la-settings { display: flex; flex-direction: column; gap: 12px; }
.la-set-group { background: var(--md-surface-high); border-radius: 16px; padding: 12px 14px; }
.la-set-group-title { font-size: 13px; font-weight: 600; color: var(--md-on-surface); }
.la-set-hint { font-size: 11px; color: var(--md-outline); margin: 2px 0 8px; }
.la-set-empty { color: var(--md-outline); font-size: 12px; padding: 6px 0; }
.la-set-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; }
.la-set-row + .la-set-row { border-top: 1px solid rgba(147, 143, 153, 0.10); }
.la-set-label { flex: 0 0 88px; color: var(--md-on-surface-variant); font-size: 12px; }
.la-set-input { flex: 1; min-width: 0; width: auto !important; background: var(--md-surface-highest) !important; color: var(--md-on-surface) !important; border: 1px solid transparent !important; }
/* ST 全局样式对 type=text 的输入框有高优先级覆盖,这里再拉起 */
#lite-agent-panel input.la-set-input[type=text],
#lite-agent-panel input.la-set-input:not([type]) {
  background: #36343b !important;
  color: #e6e1e5 !important;
  border: 1px solid transparent !important;
}
.la-set-stage { display: flex; align-items: center; gap: 8px; padding: 7px 0; }
.la-set-stage-name { flex: 0 0 88px; color: var(--md-on-surface); font-weight: 600; font-size: 12.5px; }
.la-set-toggle { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; align-items: center; padding: 4px 0 8px; }
.la-set-toggle-item { display: flex; align-items: center; gap: 6px; color: var(--md-on-surface-variant); font-size: 12px; cursor: pointer; user-select: none; }
.la-set-max { width: 74px !important; }
.la-set-actions { display: flex; gap: 10px; margin-top: 4px; }
.la-set-actions button { flex: 1; }
/* 上游卡 + 内嵌模型管理 */
.la-provider { background: var(--md-surface-low); border-radius: 12px; padding: 4px 12px 8px; margin-bottom: 8px; }
.la-models { margin-top: 2px; }
.la-models > summary { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 8px; font-size: 12px; font-weight: 500; color: var(--md-primary); cursor: pointer; user-select: none; list-style: none; transition: background .18s ease; }
.la-models > summary::-webkit-details-marker { display: none; }
.la-models > summary:hover { background: var(--md-state-hover); }
.la-models > summary::before { content: '▸'; font-size: 11px; transition: transform .18s ease; }
.la-models[open] > summary::before { transform: rotate(90deg); }
.la-model-row { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: 8px; }
.la-model-row:hover { background: var(--md-state-hover); }
.la-model-name { flex: 1; font-size: 12px; color: var(--md-on-surface-variant); word-break: break-all; }
#lite-agent-body button.la-model-del { background: transparent !important; border: 1px solid var(--md-outline-variant) !important; color: var(--md-error) !important; border-radius: 8px !important; font-size: 11px !important; padding: 1px 8px !important; }
#lite-agent-body button.la-model-del:hover { background: var(--md-state-hover) !important; border-color: var(--md-error) !important; }
.la-model-add-row { display: flex; gap: 8px; padding: 6px 8px 2px; }
.la-model-add-row input { flex: 1; min-width: 0; }
.la-model-tools { display: flex; align-items: center; gap: 8px; padding: 4px 0 0; }
#lite-agent-body button.la-model-load { background: var(--md-secondary-container) !important; border: none !important; color: var(--md-on-secondary-container) !important; border-radius: 8px !important; font-size: 12px !important; padding: 4px 12px !important; }
#lite-agent-body button.la-model-load:hover { background: #544e63 !important; }
.la-provider-actions { display: flex; justify-content: flex-end; padding: 2px 0; }
#lite-agent-body button.la-set-danger { background: transparent !important; border: none !important; color: var(--md-error) !important; font-size: 12px !important; padding: 4px 10px !important; }
#lite-agent-body button.la-set-danger:hover { background: var(--md-state-hover) !important; }
@media (max-width: 768px) {
  .la-set-label, .la-set-stage-name { flex-basis: 76px; }
  .la-set-toggle { gap: 4px; }
}

/* markdown 渲染的标题/代码 */
.md-h1, .md-h2, .md-h { color: var(--md-primary); font-weight: 600; margin: 6px 0 2px; }
.md-code { color: #bcd3ff; background: var(--md-state-hover); padding: 0 4px; border-radius: 5px; }

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  #lite-agent-ball { width: 54px; height: 54px; font-size: 24px; line-height: 53px; border-radius: 18px; }
  #lite-agent-panel { width: 100vw; max-width: 100vw; height: min(82vh, 720px); border-radius: 20px; }
  #lite-agent-head { padding: 12px 14px; gap: 8px; }
  #lite-agent-head input[type=text] { font-size: 14px; padding: 8px 12px; width: 136px; }
  #lite-agent-head button { font-size: 14px; padding: 8px 14px; }
  #lite-agent-body { padding: 12px 14px 20px; }
  .la-pre { font-size: 13.5px; line-height: 1.75; }
  .la-out.la-prose .la-pre { font-size: 16.5px; line-height: 2; }
  .la-card-head { font-size: 12px; }
  .la-group summary { font-size: 14px; padding: 8px 10px; }
  .la-copy { font-size: 12px; padding: 3px 12px; }
}

/* ===== 全屏配置界面(扩展菜单入口,M3 全屏抽屉) ===== */
#lite-agent-config {
  --md-surface: #141218;
  --md-surface-lowest: #0f0d13;
  --md-surface-low: #1d1b20;
  --md-surface-container: #211f26;
  --md-surface-high: #2b2930;
  --md-surface-highest: #36343b;
  --md-on-surface: #e6e1e5;
  --md-on-surface-variant: #cac4d0;
  --md-outline: #938f99;
  --md-outline-variant: #49454f;
  --md-primary: #a8c8ff;
  --md-on-primary: #102f5c;
  --md-primary-container: #3e4f78;
  --md-on-primary-container: #d9e3ff;
  --md-secondary-container: #4a4458;
  --md-on-secondary-container: #e8def8;
  --md-error: #f2b8b5;
  --md-ok: #7bdb9a;
  --md-state-hover: rgba(230, 225, 229, 0.08);
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: none;
  background: rgba(8, 7, 10, 0.7);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: var(--md-on-surface);
  font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
}
#lite-agent-config.open { display: block; }
#lite-agent-config .lcfg-shell {
  position: absolute;
  inset: 3vh 4vw;
  display: flex;
  flex-direction: column;
  background: rgba(20, 18, 24, 0.98);
  border: 1px solid rgba(147, 143, 153, 0.14);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}
#lite-agent-config .lcfg-head {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 22px;
  border-bottom: 1px solid rgba(147, 143, 153, 0.14);
}
#lite-agent-config .lcfg-brand { font-size: 15px; font-weight: 600; }
#lite-agent-config .lcfg-brand::before { content: '⚡'; margin-right: 8px; color: var(--md-primary); }
#lite-agent-config .lcfg-close { margin-left: auto; }
#lite-agent-config .lcfg-body { flex: 1; display: flex; min-height: 0; }
#lite-agent-config .lcfg-nav {
  width: 208px; flex: none;
  border-right: 1px solid rgba(147, 143, 153, 0.12);
  padding: 14px 10px;
  display: flex; flex-direction: column; gap: 4px;
}
#lite-agent-config .lcfg-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 12px;
  font-size: 13.5px; color: var(--md-on-surface-variant);
  cursor: pointer; user-select: none;
  transition: background .18s ease, color .18s ease;
}
#lite-agent-config .lcfg-nav-item:hover { background: var(--md-state-hover); color: var(--md-on-surface); }
#lite-agent-config .lcfg-nav-item.active {
  background: var(--md-primary-container); color: var(--md-on-primary-container); font-weight: 600;
}
#lite-agent-config .lcfg-nav-icon { width: 20px; text-align: center; }
#lite-agent-config .lcfg-content { flex: 1; overflow-y: auto; padding: 20px 26px 30px; }
#lite-agent-config .lcfg-content::-webkit-scrollbar { width: 8px; }
#lite-agent-config .lcfg-content::-webkit-scrollbar-thumb { background: var(--md-outline-variant); border-radius: 4px; }
#lite-agent-config .lcfg-section-title { font-size: 17px; font-weight: 600; }
#lite-agent-config .lcfg-section-hint { font-size: 12px; color: var(--md-outline); margin: 3px 0 16px; }

#lite-agent-config .lcfg-cards { display: flex; flex-direction: column; gap: 12px; }
#lite-agent-config .lcfg-card {
  background: var(--md-surface-high); border-radius: 16px; padding: 12px 18px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
}
#lite-agent-config .lcfg-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
#lite-agent-config .lcfg-card-icon { font-size: 15px; }
#lite-agent-config .lcfg-card-title { font-weight: 600; font-size: 13.5px; }
#lite-agent-config .lcfg-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
#lite-agent-config .lcfg-row + .lcfg-row { border-top: 1px solid rgba(147, 143, 153, 0.10); }
#lite-agent-config .lcfg-label { flex: 0 0 96px; color: var(--md-on-surface-variant); font-size: 12.5px; }
#lite-agent-config .lcfg-input { flex: 1; min-width: 0; width: auto !important; }
#lite-agent-config .lcfg-toggles { display: flex; gap: 16px; }
#lite-agent-config .lcfg-nums { display: flex; gap: 18px; flex-wrap: wrap; }
#lite-agent-config .lcfg-num { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--md-outline); }
#lite-agent-config .lcfg-num-input { width: 120px !important; }
#lite-agent-config .lcfg-actions { display: flex; gap: 10px; margin-top: 14px; }
#lite-agent-config .lcfg-hint { font-size: 11.5px; color: var(--md-outline); }
#lite-agent-config .lcfg-tip { margin-top: 14px; font-size: 12.5px; border-radius: 10px; padding: 9px 14px; }
#lite-agent-config .lcfg-tip.ok { background: rgba(123, 219, 154, 0.12); color: var(--md-ok); }
#lite-agent-config .lcfg-tip.err { background: rgba(242, 184, 181, 0.12); color: var(--md-error); }
#lite-agent-config .lcfg-models { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; flex: 1; }
#lite-agent-config .lcfg-chip {
  background: var(--md-surface-highest); border-radius: 8px; padding: 3px 9px;
  font-size: 12px; display: inline-flex; gap: 7px; align-items: center; color: var(--md-on-surface-variant);
}
#lite-agent-config .lcfg-chip-x { cursor: pointer; color: var(--md-error); font-style: normal; font-weight: 700; }
#lite-agent-config .lcfg-chip-x:hover { color: var(--md-on-surface); }
#lite-agent-config .lcfg-chip-input { width: 170px !important; font-size: 12px !important; }
#lite-agent-config .lcfg-danger { color: var(--md-error) !important; margin-left: auto; }
#lite-agent-config .lcfg-status { font-size: 12.5px; color: var(--md-outline); }
#lite-agent-config .lcfg-status.ok { color: var(--md-ok); font-weight: 600; }

/* 原生控件覆盖(config 根下,压过 ST 全局主题) */
#lite-agent-config input[type=text],
#lite-agent-config input[type=password],
#lite-agent-config input[type=number],
#lite-agent-config select {
  background: var(--md-surface-highest) !important;
  border: 1px solid transparent !important;
  color: var(--md-on-surface) !important;
  border-radius: 12px !important;
  padding: 8px 12px !important;
  font-size: 13px !important;
  font-family: inherit !important;
  outline: none !important;
  box-shadow: none !important;
}
#lite-agent-config input::placeholder { color: var(--md-outline) !important; }
#lite-agent-config input:focus, #lite-agent-config select:focus {
  border-color: var(--md-primary) !important;
  box-shadow: 0 0 0 1px var(--md-primary) !important;
}
#lite-agent-config input[type=number] { width: 120px !important; }
#lite-agent-config input[type=checkbox] { accent-color: var(--md-primary) !important; width: 16px !important; height: 16px !important; }
#lite-agent-config button {
  background: var(--md-primary) !important;
  color: var(--md-on-primary) !important;
  border: none !important;
  border-radius: 20px !important;
  padding: 7px 16px !important;
  font-size: 13px !important;
  font-family: inherit !important;
  font-weight: 500 !important;
  cursor: pointer;
  text-shadow: none !important;
  box-shadow: none !important;
}
#lite-agent-config button:hover { background: #93b6f2 !important; }
#lite-agent-config button.lcfg-tonal { background: var(--md-secondary-container) !important; color: var(--md-on-secondary-container) !important; }
#lite-agent-config button.lcfg-tonal:hover { background: #544e63 !important; }
#lite-agent-config button.lcfg-danger { background: transparent !important; color: var(--md-error) !important; }
#lite-agent-config button.lcfg-danger:hover { background: var(--md-state-hover) !important; }
#lite-agent-config button.lcfg-close {
  background: transparent !important; color: var(--md-on-surface-variant) !important;
  border: 1px solid var(--md-outline-variant) !important;
}
#lite-agent-config button.lcfg-close:hover { color: var(--md-on-surface) !important; background: var(--md-state-hover) !important; }

@media (max-width: 768px) {
  #lite-agent-config .lcfg-shell { inset: 0; border-radius: 0; }
  #lite-agent-config .lcfg-nav { width: 150px; }
}
`;
  document.head.appendChild(s);
}
