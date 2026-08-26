/**
 * 注入插件样式(style#lite-agent-style)。
 * 球/面板用 position:absolute 而不是 fixed:ST 在 ≤1000px 视口把 body 设为
 * position:fixed,叠加 html 上的 -webkit-transform/-webkit-perspective,html 会
 * 成为 fixed 后代的包含块且高度为 0,right/bottom 定位会被推到视口外。
 * absolute 的包含块是 body(移动端 body=视口盒,桌面与 fixed 行为一致)。
 */
export function css() {
  if (document.getElementById('lite-agent-style')) return;
  const s = document.createElement('style');
  s.id = 'lite-agent-style';
  s.textContent = [
    '#lite-agent-ball { position: absolute; width: 46px; height: 46px; border-radius: 50%; background: rgba(13,20,30,0.85); border: 2px solid rgba(0,240,255,0.55); color: #00f0ff; font-size: 20px; line-height: 42px; text-align: center; cursor: pointer; z-index: 2147483647; user-select: none; touch-action: none; transform: translateZ(0); box-shadow: 0 0 12px rgba(0,240,255,0.25); }',
    '#lite-agent-panel { position: absolute; width: 520px; max-width: 94vw; height: 66vh; background: rgba(13,17,24,0.96); border: 1px solid rgba(0,240,255,0.35); border-radius: 10px; color: #c8d6e5; z-index: 2147483646; display: none; flex-direction: column; font-family: system-ui, sans-serif; transform: translateZ(0); box-shadow: 0 8px 30px rgba(0,0,0,0.6); }',
    '#lite-agent-panel.open { display: flex; }',
    '#lite-agent-head { padding: 8px 10px; border-bottom: 1px solid rgba(0,240,255,0.2); display: flex; flex-wrap: wrap; gap: 6px; align-items: center; cursor: move; touch-action: none; user-select: none; }',
    '#lite-agent-head input[type=text] { background: #101722; color: #c8d6e5; border: 1px solid rgba(0,240,255,0.3); border-radius: 4px; padding: 3px 6px; font-size: 12px; }',
    '#lite-agent-body { flex: 1; overflow-y: auto; padding: 8px 10px; }',
    '.la-group { margin-bottom: 12px; }',
    '.la-group-label { color: #5f7488; font-size: 11px; margin-bottom: 4px; }',
    '.la-card { background: rgba(13,20,30,0.88); border: 1px solid rgba(90,160,220,0.3); border-radius: 8px; padding: 8px 10px; position: relative; }',
    '.la-card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; color: #9bb8d0; font-size: 12px; }',
    '.la-copy { margin-left: auto; background: #16222f; color: #6fa8d8; border: 1px solid rgba(90,160,220,0.4); border-radius: 4px; font-size: 11px; padding: 1px 8px; cursor: pointer; }',
    '.la-pre { margin: 0; padding: 6px 8px; background: #0d1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; font-family: ui-monospace, Consolas, monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; max-height: 32vh; overflow-y: auto; color: #b8ccdd; }',
    '.la-pre blockquote { margin: 0; padding: 2px 0 2px 10px; border-left: 3px solid rgba(0,240,255,0.32); color: #a8cfe0; }',
    'details.la-reason { margin-bottom: 8px; }',
    'details.la-reason > summary { background: rgba(20,30,45,0.92); border: 1px solid rgba(90,160,220,0.35); border-radius: 8px; padding: 5px 10px; cursor: pointer; color: #9bb8d0; font-size: 12px; font-weight: bold; list-style: none; display: flex; align-items: center; gap: 6px; }',
    'details.la-reason > summary::before { content: \'▸\'; color: #5f7488; }',
    'details.la-reason[open] > summary::before { content: \'▾\'; }',
    'details.la-reason > .la-reason-body { background: rgba(10,16,24,0.9); border: 1px solid rgba(90,160,220,0.25); border-radius: 8px; padding: 8px 10px; margin-top: 6px; }',
    '.la-dim { color: #5f7488; font-size: 12px; padding: 10px; }',
    'details.la-out { margin-bottom: 0; }',
    'details.la-out > summary { background: rgba(20,30,45,0.92); border: 1px solid rgba(90,160,220,0.35); border-radius: 8px; padding: 5px 10px; cursor: pointer; color: #9bb8d0; font-size: 12px; font-weight: bold; list-style: none; display: flex; align-items: center; gap: 6px; }',
    'details.la-out > summary::before { content: \'▸\'; color: #5f7488; }',
    'details.la-out[open] > summary::before { content: \'▾\'; }',
    '.md-h1, .md-h2, .md-h { color: #7fd4ff; font-weight: bold; margin: 6px 0 2px; }',
    '.md-code { color: #9fe8c0; background: rgba(255,255,255,0.05); padding: 0 4px; border-radius: 3px; }',
    '#lite-agent-status { width: 8px; height: 8px; border-radius: 50%; background: #555; display: inline-block; }',
    '#lite-agent-status.ok { background: #2ecc71; }',
    '#lite-agent-status.err { background: #e74c3c; }',
    '@media (max-width: 768px) {',
    '  #lite-agent-ball { width: 54px; height: 54px; font-size: 24px; line-height: 50px; }',
    '  #lite-agent-panel { width: 100vw; max-width: 100vw; height: 82vh; border-radius: 12px 12px 0 0; }',
    '  #lite-agent-head { padding: 10px 12px; gap: 8px; }',
    '  #lite-agent-head input[type=text] { font-size: 14px; padding: 6px 8px; width: 120px; }',
    '  #lite-agent-head button { font-size: 13px; padding: 6px 10px; }',
    '  #lite-agent-body { padding: 10px 12px; }',
    '  .la-pre { font-size: 13px; line-height: 1.6; }',
    '  .la-card-head { font-size: 13px; }',
    '  details.la-reason > summary, details.la-out > summary { padding: 8px 12px; font-size: 13px; }',
    '  .la-copy { font-size: 12px; padding: 4px 12px; }',
    '}',
  ].join('\n');
  document.head.appendChild(s);
}
