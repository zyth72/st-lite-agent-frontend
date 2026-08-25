/**
 * st-lite-agent 前端插件:悬浮球 + 悬浮窗
 * 面板只显示最新一条:新请求一到,自动清空并从头流式显示(思维链在上可折叠,正文在下)。
 */
const IS_THIRD_PARTY = typeof location !== 'undefined' && location.pathname.includes('/extensions/third-party/');
const CORE_PATH = IS_THIRD_PARTY ? '../../../../../' : '../../../../';
const { eventSource, event_types } = await import(CORE_PATH + 'script.js');

const MODULE = 'st-lite-agent';
const LS_BASE = 'st-lite-agent-base';
const LS_FOLLOW = 'st-lite-agent-follow';

let base = localStorage.getItem(LS_BASE) || 'http://127.0.0.1:7890';
let followLatest = localStorage.getItem(LS_FOLLOW) !== '0';
let panelOpen = false;
let pollTimer = null;
let requests = [];
let stageTypes = {};
let cur = { reqId: null, out: 0, reason: 0 };
let reasonPre = null, outPre = null;

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
  if (document.getElementById('lite-agent-style')) return;
  const s = document.createElement('style');
  s.id = 'lite-agent-style';
  s.textContent = [
    '#lite-agent-ball { position: fixed; right: 18px; bottom: 18px; width: 46px; height: 46px; border-radius: 50%; background: rgba(13,20,30,0.85); border: 2px solid rgba(0,240,255,0.55); color: #00f0ff; font-size: 20px; line-height: 42px; text-align: center; cursor: pointer; z-index: 99999; user-select: none; box-shadow: 0 0 12px rgba(0,240,255,0.25); }',
    '#lite-agent-panel { position: fixed; right: 18px; bottom: 76px; width: 520px; max-width: 94vw; height: 66vh; background: rgba(13,17,24,0.96); border: 1px solid rgba(0,240,255,0.35); border-radius: 10px; color: #c8d6e5; z-index: 99998; display: none; flex-direction: column; font-family: system-ui, sans-serif; box-shadow: 0 8px 30px rgba(0,0,0,0.6); }',
    '#lite-agent-panel.open { display: flex; }',
    '#lite-agent-head { padding: 8px 10px; border-bottom: 1px solid rgba(0,240,255,0.2); display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }',
    '#lite-agent-head select, #lite-agent-head input[type=text] { background: #101722; color: #c8d6e5; border: 1px solid rgba(0,240,255,0.3); border-radius: 4px; padding: 3px 6px; font-size: 12px; }',
    '#lite-agent-body { flex: 1; overflow-y: auto; padding: 8px 10px; }',
    '.la-card { background: rgba(13,20,30,0.88); border: 1px solid rgba(90,160,220,0.3); border-radius: 8px; padding: 8px 10px; position: relative; }',
    '.la-card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; color: #9bb8d0; font-size: 12px; }',
    '.la-copy { margin-left: auto; background: #16222f; color: #6fa8d8; border: 1px solid rgba(90,160,220,0.4); border-radius: 4px; font-size: 11px; padding: 1px 8px; cursor: pointer; }',
    '.la-pre { margin: 0; padding: 6px 8px; background: #0d1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; font-family: ui-monospace, Consolas, monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; max-height: 36vh; overflow-y: auto; color: #b8ccdd; }',
    'details.la-reason { margin-bottom: 8px; }',
    'details.la-reason > summary { background: rgba(20,30,45,0.92); border: 1px solid rgba(90,160,220,0.35); border-radius: 8px; padding: 5px 10px; cursor: pointer; color: #9bb8d0; font-size: 12px; font-weight: bold; list-style: none; display: flex; align-items: center; gap: 6px; }',
    'details.la-reason > summary::before { content: \'▸\'; color: #5f7488; }',
    'details.la-reason[open] > summary::before { content: \'▾\'; }',
    'details.la-reason > .la-reason-body { background: rgba(10,16,24,0.9); border: 1px solid rgba(90,160,220,0.25); border-radius: 8px; padding: 8px 10px; margin-top: 6px; }',
    '.la-dim { color: #5f7488; font-size: 12px; padding: 10px; }',
    '#lite-agent-status { width: 8px; height: 8px; border-radius: 50%; background: #555; display: inline-block; }',
    '#lite-agent-status.ok { background: #2ecc71; }',
    '#lite-agent-status.err { background: #e74c3c; }',
  ].join('\n');
  document.head.appendChild(s);
}

function buildBall() {
  if (document.getElementById('lite-agent-ball')) return;
  const ball = h('div', { id: 'lite-agent-ball', title: 'st-lite-agent 面板', text: '⚡' });
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = 0, suppress = false;
  ball.addEventListener('mousedown', (e) => {
    sx = e.clientX; sy = e.clientY; moved = 0; suppress = false;
    const r = ball.getBoundingClientRect();
    ox = r.left; oy = r.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (e.buttons !== 1) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    if (moved > 6) {
      suppress = true;
      ball.style.right = 'auto'; ball.style.bottom = 'auto';
      ball.style.left = (ox + dx) + 'px'; ball.style.top = (oy + dy) + 'px';
    }
  });
  ball.addEventListener('click', () => {
    if (suppress) { suppress = false; return; }
    togglePanel();
  });
  document.body.appendChild(ball);
}

function buildPanel() {
  if (document.getElementById('lite-agent-panel')) return;
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
    if (followLatest && requests.length) followTo(requests[0].id);
  });
  const status = h('span', { id: 'lite-agent-status' });
  reasonPre = h('pre', { class: 'la-pre', id: 'la-reason' });
  const det = h('details', { class: 'la-reason' });
  det.appendChild(h('summary', { text: '🧠 思维链' }));
  det.appendChild(h('div', { class: 'la-reason-body' }, [reasonPre]));
  outPre = h('pre', { class: 'la-pre', id: 'la-out' });
  const copyBtn = h('button', { class: 'la-copy', text: '复制', onclick: () => {
    if (outPre) navigator.clipboard && navigator.clipboard.writeText(outPre.textContent);
  } });
  const outCard = h('div', { class: 'la-card' }, [
    h('div', { class: 'la-card-head' }, [h('span', { text: '🖥️ 正文' }), copyBtn]),
    outPre,
  ]);
  const body = h('div', { id: 'lite-agent-body' }, [det, outCard]);
  const clearBtn = h('button', { text: '清空', onclick: () => resetView() });
  const head = h('div', { id: 'lite-agent-head' }, [
    h('span', { text: '⚡ st-lite-agent', style: 'color:#00f0ff;font-weight:bold' }),
    status, sel, baseInput,
    h('label', { style: 'font-size:12px;color:#8aa0b5' }, [follow, h('span', { text: '跟随最新' })]),
    clearBtn,
  ]);
  const panel = h('div', { id: 'lite-agent-panel' }, [head, body]);
  sel.addEventListener('change', () => followTo(sel.value, true));
  document.body.appendChild(panel);
}

function togglePanel() {
  panelOpen = !panelOpen;
  const panel = document.getElementById('lite-agent-panel');
  if (panel) panel.classList.toggle('open', panelOpen);
  if (panelOpen) pollOnce();
}

function resetView() {
  if (reasonPre) reasonPre.textContent = '';
  if (outPre) outPre.textContent = '';
  cur.out = 0;
  cur.reason = 0;
}

function followTo(id, manual) {
  if (cur.reqId !== id) {
    cur.reqId = id;
    resetView();
  }
  const sel = document.getElementById('lite-agent-req');
  if (sel && manual) sel.value = id;
  pollOnce();
}

async function pollFile(kind) {
  const file = kind === 'out' ? 'output.txt' : 'reasoning.txt';
  const el = kind === 'out' ? outPre : reasonPre;
  if (!el) return;
  const off = cur[kind] || 0;
  try {
    const res = await fetch(base + '/agent/steps/' + encodeURIComponent(cur.reqId) + '/writer.' + file + '?offset=' + off);
    const data = await res.json();
    if (data.exists === false) return;
    if (data.text) {
      el.textContent += data.text;
      el.scrollTop = el.scrollHeight;
      cur[kind] = data.offset;
    }
  } catch (e) {}
}

async function pollOnce() {
  if (!cur.reqId || !panelOpen) return;
  await pollFile('reason');
  await pollFile('out');
}

async function fetchRequests() {
  try {
    const res = await fetch(base + '/agent/requests');
    const data = await res.json();
    requests = data.requests || [];
    stageTypes = data.types || {};
    const sel = document.getElementById('lite-agent-req');
    if (sel) {
      const curId = cur.reqId;
      sel.innerHTML = '';
      requests.forEach((rq) => sel.appendChild(h('option', { value: rq.id, text: new Date(rq.mtime).toLocaleTimeString() + ' ' + rq.id })));
      if (curId) sel.value = curId;
    }
    if (followLatest && requests.length) followTo(requests[0].id);
    else if (!cur.reqId && requests.length) followTo(requests[0].id);
    setStatus(true);
  } catch (e) {
    setStatus(false);
  }
}

function setStatus(ok) {
  const st = document.getElementById('lite-agent-status');
  if (st) st.className = ok ? 'ok' : 'err';
}

function startPolling() {
  if (pollTimer) return;
  const tick = async () => {
    await fetchRequests();
    if (panelOpen) await pollOnce();
  };
  tick();
  pollTimer = setInterval(tick, 800);
}

jQuery(async () => {
  if (document.getElementById('lite-agent-ball')) return;
  css();
  buildBall();
  buildPanel();
  startPolling();
  console.log('[' + MODULE + '] 悬浮面板已就绪,接口基址 ' + base);
});

