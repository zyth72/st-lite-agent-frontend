/**
 * st-lite-agent 前端插件:悬浮球 + 悬浮窗,实时查看 agent 各步日志(思维链/正文/结算/提示词)
 * 数据来源:proxy 的 /agent/requests 与 /agent/steps 接口(offset 增量轮询 = 流式)。
 */
import { eventSource, event_types } from '../../../../script.js';

const MODULE = 'st-lite-agent';
const LS_BASE = 'st-lite-agent-base';
const LS_FOLLOW = 'st-lite-agent-follow';

const TABS = [
  { label: '思维链', stage: 'writer', file: 'reasoning.txt' },
  { label: '正文', stage: 'writer', file: 'output.txt' },
  { label: '结算', stage: 'backstage', file: 'output.txt' },
  { label: '写作提示词', stage: 'writer', file: 'prompt.txt' },
];

let base = localStorage.getItem(LS_BASE) || 'http://127.0.0.1:7890';
let followLatest = localStorage.getItem(LS_FOLLOW) !== '0';
let panelOpen = false;
let pollTimer = null;
let current = { reqId: null, tab: 0, offset: 0 };
let requests = [];

function h(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
  }
  (children || []).forEach((c) => c && node.appendChild(c));
  return node;
}

function css() {
  const s = document.createElement('style');
  s.id = 'lite-agent-style';
  s.textContent = [
    '#lite-agent-ball { position: fixed; right: 18px; bottom: 18px; width: 46px; height: 46px; border-radius: 50%; background: rgba(13,20,30,0.85); border: 2px solid rgba(0,240,255,0.55); color: #00f0ff; font-size: 20px; line-height: 42px; text-align: center; cursor: pointer; z-index: 99999; user-select: none; box-shadow: 0 0 12px rgba(0,240,255,0.25); }',
    '#lite-agent-ball.busy { animation: liteAgentPulse 1.2s infinite; }',
    '@keyframes liteAgentPulse { 0%,100% { box-shadow: 0 0 8px rgba(0,240,255,0.25); } 50% { box-shadow: 0 0 18px rgba(0,240,255,0.7); } }',
    '#lite-agent-panel { position: fixed; right: 18px; bottom: 76px; width: 480px; max-width: 92vw; height: 62vh; background: rgba(13,17,24,0.96); border: 1px solid rgba(0,240,255,0.35); border-radius: 10px; color: #c8d6e5; z-index: 99998; display: none; flex-direction: column; font-family: system-ui, sans-serif; box-shadow: 0 8px 30px rgba(0,0,0,0.6); }',
    '#lite-agent-panel.open { display: flex; }',
    '#lite-agent-head { padding: 8px 10px; border-bottom: 1px solid rgba(0,240,255,0.2); display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }',
    '#lite-agent-head select, #lite-agent-head input[type=text] { background: #101722; color: #c8d6e5; border: 1px solid rgba(0,240,255,0.3); border-radius: 4px; padding: 3px 6px; font-size: 12px; }',
    '#lite-agent-tabs { padding: 6px 10px 0; display: flex; gap: 6px; }',
    '#lite-agent-tabs button { background: #101722; color: #8aa0b5; border: 1px solid rgba(0,240,255,0.25); border-radius: 6px 6px 0 0; padding: 4px 12px; cursor: pointer; font-size: 12px; }',
    '#lite-agent-tabs button.active { color: #00f0ff; border-color: rgba(0,240,255,0.7); background: #0c1a24; }',
    '#lite-agent-body { flex: 1; overflow-y: auto; margin: 0; padding: 10px 12px; font-family: ui-monospace, Consolas, monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; }',
  ].join('\n');
  document.head.appendChild(s);
}

function buildBall() {
  const ball = h('div', { id: 'lite-agent-ball', title: 'st-lite-agent 面板', text: '⚡' });
  let dragging = false, moved = 0, sx = 0, sy = 0, ox = 0, oy = 0;
  ball.addEventListener('mousedown', (e) => {
    dragging = true; moved = 0;
    sx = e.clientX; sy = e.clientY;
    const r = ball.getBoundingClientRect();
    ox = r.left; oy = r.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    if (moved > 6) {
      ball.style.right = 'auto'; ball.style.bottom = 'auto';
      ball.style.left = (ox + dx) + 'px'; ball.style.top = (oy + dy) + 'px';
    }
  });
  document.addEventListener('mouseup', () => {
    const wasDrag = moved > 6;
    dragging = false;
    if (!wasDrag) togglePanel();
  });
  document.body.appendChild(ball);
  return ball;
}

function buildPanel() {
  const sel = h('select', { id: 'lite-agent-req' });
  const baseInput = h('input', { type: 'text', id: 'lite-agent-base', value: base, style: 'width:150px' });
  baseInput.addEventListener('change', () => {
    base = baseInput.value.trim() || 'http://127.0.0.1:7890';
    localStorage.setItem(LS_BASE, base);
  });
  const follow = h('input', { type: 'checkbox', id: 'lite-agent-follow' });
  follow.checked = followLatest;
  follow.addEventListener('change', () => {
    followLatest = follow.checked;
    localStorage.setItem(LS_FOLLOW, followLatest ? '1' : '0');
    if (followLatest && requests.length) selectRequest(requests[0].id);
  });
  const status = h('span', { id: 'lite-agent-status' });
  const clearBtn = h('button', { text: '清空', onclick: () => { const b = document.getElementById('lite-agent-body'); if (b) b.textContent = ''; current.offset = 0; } });
  const head = h('div', { id: 'lite-agent-head' }, [
    h('span', { text: '⚡ 思维链', style: 'color:#00f0ff;font-weight:bold' }),
    status,
    sel,
    baseInput,
    h('label', { style: 'font-size:12px;color:#8aa0b5' }, [follow, h('span', { text: '跟随最新' })]),
    clearBtn,
  ]);
  const tabs = h('div', { id: 'lite-agent-tabs' });
  const body = h('pre', { id: 'lite-agent-body' });
  const panel = h('div', { id: 'lite-agent-panel' }, [head, tabs, body]);
  TABS.forEach((t, i) => {
    const btn = h('button', { text: t.label, onclick: () => switchTab(i) });
    btn.dataset.idx = i;
    tabs.appendChild(btn);
  });
  sel.addEventListener('change', () => selectRequest(sel.value));
  document.body.appendChild(panel);
  return { sel, status, body, tabs };
}

function togglePanel() {
  panelOpen = !panelOpen;
  const panel = document.getElementById('lite-agent-panel');
  if (panel) panel.classList.toggle('open', panelOpen);
}

function renderTabs() {
  const tabs = document.querySelectorAll('#lite-agent-tabs button');
  tabs.forEach((b, i) => b.classList.toggle('active', i === current.tab));
}

function switchTab(i) {
  current.tab = i;
  current.offset = 0;
  const body = document.getElementById('lite-agent-body');
  if (body) body.textContent = '';
  renderTabs();
  if (current.reqId) pollOnce();
}

function selectRequest(id) {
  current.reqId = id;
  current.offset = 0;
  const body = document.getElementById('lite-agent-body');
  if (body) body.textContent = '';
  const sel = document.getElementById('lite-agent-req');
  if (sel) sel.value = id;
}

async function fetchRequests() {
  try {
    const res = await fetch(base + '/agent/requests');
    const data = await res.json();
    requests = data.requests || [];
    const sel = document.getElementById('lite-agent-req');
    if (sel) {
      const cur = current.reqId;
      sel.innerHTML = '';
      requests.forEach((rq) => {
        const opt = h('option', { value: rq.id, text: new Date(rq.mtime).toLocaleTimeString() + ' ' + rq.id });
        sel.appendChild(opt);
      });
      if (cur) sel.value = cur;
      if (followLatest && requests.length && cur !== requests[0].id) selectRequest(requests[0].id);
      if (!current.reqId && requests.length) selectRequest(requests[0].id);
    }
    setStatus(true);
  } catch (e) {
    setStatus(false);
  }
}

function setStatus(ok) {
  const st = document.getElementById('lite-agent-status');
  if (st) st.className = ok ? 'ok' : 'err';
}

async function pollOnce() {
  if (!current.reqId) return;
  const tab = TABS[current.tab];
  const url = base + '/agent/steps/' + encodeURIComponent(current.reqId) + '/' + tab.stage + '.' + tab.file + '?offset=' + current.offset;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.exists === false) return;
    if (data.text) {
      const body = document.getElementById('lite-agent-body');
      if (body) {
        body.textContent += data.text;
        body.scrollTop = body.scrollHeight;
      }
      current.offset = data.offset;
    }
  } catch (e) {}
}

function startPolling() {
  if (pollTimer) return;
  const tick = async () => {
    await fetchRequests();
    if (panelOpen && current.reqId) await pollOnce();
  };
  tick();
  pollTimer = setInterval(tick, 800);
}

jQuery(async () => {
  css();
  buildBall();
  buildPanel();
  renderTabs();
  startPolling();
  console.log('[' + MODULE + '] 悬浮面板已就绪,接口基址 ' + base);
});

