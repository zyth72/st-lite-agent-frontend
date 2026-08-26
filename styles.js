/**
 * 插件样式(style#lite-agent-style)。
 * 视觉基准:深色 Agent 工作流 UI(参考图配色):
 *   页面底 #121318 / 步骤卡片 #2a292f / 嵌套内容 #1f1e24 / 边框 #32313a
 *   正文 #d4d4d9 / 次要 #9a99a2 / 弱化 #6b6a73
 * 球/面板用 position:absolute 而不是 fixed:ST 在 ≤1000px 视口把 body 设为
 * position:fixed,叠加 html 上的 -webkit-transform/-webkit-perspective,html 会
 * 成为 fixed 后代的包含块且高度为 0,right/bottom 定位会被推到视口外。
 * 原生控件(input/button/checkbox/details/滚动条)全部用本文件的规则覆盖,
 * 否则会以浏览器默认样式渲染,与整体风格脱节。
 */
export function css() {
  if (document.getElementById('lite-agent-style')) return;
  const s = document.createElement('style');
  s.id = 'lite-agent-style';
  s.textContent = `/* ===== 设计变量 ===== */
#lite-agent-panel {
  --la-bg: #121318;
  --la-card: #1f1e24;
  --la-card2: #2a292f;
  --la-inner: #16151b;
  --la-border: #32313a;
  --la-border2: #26252c;
  --la-text: #d4d4d9;
  --la-dim: #9a99a2;
  --la-faint: #6b6a73;
  --la-accent: #8ab4ff;
  --la-ok: #4ec176;
  --la-err: #e2635a;
  --la-run: #e8b564;
  position: absolute;
  display: none;
  flex-direction: column;
  z-index: 2147483646;
  background: rgba(18, 19, 24, 0.97);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border: 1px solid var(--la-border);
  border-radius: 14px;
  color: var(--la-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.02) inset;
}
#lite-agent-panel.open { display: flex; }
#lite-agent-panel ::selection { background: rgba(138, 180, 255, 0.25); }

/* ===== 悬浮球 ===== */
#lite-agent-ball {
  position: absolute;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: #17181d;
  border: 1px solid var(--la-border);
  color: var(--la-accent);
  font-size: 19px; line-height: 41px;
  text-align: center;
  cursor: pointer;
  z-index: 2147483647;
  user-select: none;
  touch-action: none;
  transform: translateZ(0);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(138, 180, 255, 0.10);
  transition: background .15s ease, border-color .15s ease, transform .15s ease;
}
#lite-agent-ball:hover { background: #20222a; border-color: #45454f; transform: translateZ(0) scale(1.06); }

/* ===== 面板头 ===== */
#lite-agent-head {
  padding: 10px 12px;
  border-bottom: 1px solid var(--la-border2);
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  cursor: move;
  touch-action: none;
  user-select: none;
}
#lite-agent-head .la-title {
  color: var(--la-text);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .2px;
}
#lite-agent-head .la-title::before { content: '⚡'; margin-right: 6px; color: var(--la-accent); }
#lite-agent-status { width: 7px; height: 7px; border-radius: 50%; background: #3f3e46; display: inline-block; margin-right: 2px; }
#lite-agent-status.ok { background: var(--la-ok); box-shadow: 0 0 6px rgba(78, 193, 118, .6); }
#lite-agent-status.err { background: var(--la-err); box-shadow: 0 0 6px rgba(226, 99, 90, .6); }

/* ===== 原生控件覆盖(带 !important,压过 ST 全局主题样式) ===== */
#lite-agent-panel input[type=text],
#lite-agent-panel input[type=password],
#lite-agent-panel input[type=number],
#lite-agent-panel select {
  background: var(--la-inner) !important;
  border: 1px solid var(--la-border) !important;
  color: var(--la-text) !important;
  border-radius: 8px !important;
  padding: 5px 9px !important;
  font-size: 12px !important;
  font-family: inherit !important;
  outline: none !important;
  box-shadow: none !important;
  transition: border-color .15s ease, box-shadow .15s ease;
}
#lite-agent-panel input::placeholder { color: var(--la-faint) !important; }
#lite-agent-panel input[type=text]:focus,
#lite-agent-panel input[type=password]:focus,
#lite-agent-panel input[type=number]:focus,
#lite-agent-panel select:focus {
  border-color: var(--la-accent) !important;
  box-shadow: 0 0 0 2px rgba(138, 180, 255, .14) !important;
}
#lite-agent-head input[type=text] { width: 150px !important; flex: 0 1 auto; }
#lite-agent-panel input[type=checkbox] {
  accent-color: var(--la-accent) !important;
  width: 14px !important; height: 14px !important; cursor: pointer; margin: 0;
}
#lite-agent-panel input[type=number] { width: 74px !important; }
#lite-agent-panel button {
  background: #232229 !important;
  border: 1px solid var(--la-border) !important;
  color: var(--la-dim) !important;
  border-radius: 8px !important;
  padding: 5px 10px !important;
  font-size: 12px !important;
  font-family: inherit !important;
  line-height: 1.4 !important;
  cursor: pointer;
  text-shadow: none !important;
  transition: background .15s ease, color .15s ease, border-color .15s ease;
}
#lite-agent-panel button:hover { background: #2b2a31 !important; color: var(--la-text) !important; border-color: #45454f !important; }
#lite-agent-panel button:active { transform: translateY(1px); }

/* ===== 面板体与滚动条 ===== */
#lite-agent-body { flex: 1; overflow-y: auto; padding: 10px 12px; }
#lite-agent-body::-webkit-scrollbar { width: 8px; height: 8px; }
#lite-agent-body::-webkit-scrollbar-thumb { background: #30303a; border-radius: 4px; }
#lite-agent-body::-webkit-scrollbar-thumb:hover { background: #3c3c48; }
#lite-agent-body::-webkit-scrollbar-track { background: transparent; }

/* ===== 步骤卡片 ===== */
.la-group {
  background: var(--la-card);
  border: 1px solid var(--la-border2);
  border-radius: 12px;
  padding: 9px 12px 11px;
  margin-bottom: 10px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.02) inset;
}
.la-step-head { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.la-step-title { font-size: 13px; font-weight: 600; color: var(--la-text); }
.la-step-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--la-faint); flex: none; }
.la-step-dot.running { background: var(--la-run); box-shadow: 0 0 6px rgba(232, 181, 100, .55); }
.la-step-dot.done { background: var(--la-ok); box-shadow: 0 0 6px rgba(78, 193, 118, .5); }
.la-step-dot.failed { background: var(--la-err); box-shadow: 0 0 6px rgba(226, 99, 90, .5); }

/* ===== 折叠区(details/summary 原生化覆盖) ===== */
.la-group details { margin-top: 7px; }
.la-group details[open] { margin-bottom: 2px; }
.la-group summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  margin: 0 -4px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--la-dim);
  cursor: pointer;
  user-select: none;
  list-style: none;
  transition: background .15s ease, color .15s ease;
}
.la-group summary::-webkit-details-marker { display: none; }
.la-group summary:hover { background: rgba(255, 255, 255, 0.03); color: var(--la-text); }
.la-group summary::after {
  content: '';
  margin-left: auto;
  width: 7px; height: 7px;
  border-right: 1.6px solid var(--la-faint);
  border-bottom: 1.6px solid var(--la-faint);
  transform: rotate(45deg);
  transition: transform .18s ease;
}
.la-group details[open] > summary::after { transform: rotate(-135deg); }

/* ===== 内容块 ===== */
.la-reason-body, .la-card {
  background: var(--la-inner);
  border: 1px solid var(--la-border2);
  border-radius: 9px;
  padding: 8px 10px;
  margin-top: 5px;
}
.la-pre {
  margin: 0;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 0;
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, 'Noto Sans Mono CJK SC', monospace;
  font-size: 12px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 32vh;
  overflow-y: auto;
  color: #c4c4cb;
}
.la-pre::-webkit-scrollbar { width: 6px; }
.la-pre::-webkit-scrollbar-thumb { background: #2d2c34; border-radius: 3px; }
.la-pre blockquote { margin: 0; padding: 2px 0 2px 10px; border-left: 3px solid rgba(138, 180, 255, 0.28); color: var(--la-dim); }

/* 写作正文:小说排版(衬线 + 更大行距) */
.la-out.la-prose .la-pre { font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', Georgia, serif; font-size: 15px; line-height: 1.95; color: #dedee2; }

.la-card-head { display: flex; align-items: center; gap: 8px; margin: 2px 0 6px; color: var(--la-faint); font-size: 11px; }
.la-card-head span { letter-spacing: .06em; }
.la-copy {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--la-border);
  color: var(--la-dim);
  border-radius: 6px;
  font-size: 11px;
  padding: 1px 8px;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.la-copy:hover { background: #26252d; color: var(--la-text); border-color: #45454f; }

/* ===== 设置面板组件 ===== */
.la-dim { color: var(--la-faint); font-size: 12px; padding: 10px; }

/* markdown 渲染的标题/代码 */
.md-h1, .md-h2, .md-h { color: var(--la-accent); font-weight: 600; margin: 6px 0 2px; }
.md-code { color: #a9c7ff; background: rgba(255, 255, 255, 0.05); padding: 0 4px; border-radius: 3px; }

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  #lite-agent-ball { width: 52px; height: 52px; font-size: 23px; line-height: 49px; }
  #lite-agent-panel { width: 100vw; max-width: 100vw; height: 82vh; border-radius: 14px 14px 0 0; }
  #lite-agent-head { padding: 11px 13px; gap: 8px; }
  #lite-agent-head input[type=text] { font-size: 14px; padding: 6px 10px; width: 130px; }
  #lite-agent-head button { font-size: 13px; padding: 6px 10px; }
  #lite-agent-body { padding: 10px 12px; }
  .la-pre { font-size: 13px; line-height: 1.7; }
  .la-out.la-prose .la-pre { font-size: 16px; line-height: 2; }
  .la-card-head { font-size: 12px; }
  .la-group summary { font-size: 13px; padding: 6px 8px; }
  .la-copy { font-size: 12px; padding: 3px 12px; }
}
`;
  document.head.appendChild(s);
}
