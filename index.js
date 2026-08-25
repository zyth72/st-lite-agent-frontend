/**
 * st-lite-agent 前端插件:悬浮球 + 可拖动悬浮窗(SSE 流式)
 * 位置记住在 localStorage;悬浮球点击开合、拖动需超过阈值才移动。
 */
import { marked } from './marked.esm.js';

const IS_THIRD_PARTY = typeof location !== 'undefined' && location.pathname.includes('/extensions/third-party/');
const CORE_PATH = IS_THIRD_PARTY ? '../../../../../' : '../../../../';
const { eventSource, event_types } = await import(CORE_PATH + 'script.js');

const MODULE = 'st-lite-agent';
const LS_BASE = 'st-lite-agent-base';
const LS_BALL = 'st-lite-agent-ball-pos';
const LS_PANEL = 'st-lite-agent-panel-pos';

let base = localStorage.getItem(LS_BASE) || 'http://127.0.0.1:7890';
let panelOpen = false;
let es = null;
let bodyEl = null;

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

function loadPos(key, def) {
  try { const p = JSON.parse(localStorage.getItem(key)); if (p && typeof p.right === 'number') return p; } catch (e) {}
  return def;
}

function clampPos(p, w, h) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const maxRight = Math.max(0, vw - w - 8);
  const maxBottom = Math.max(0, vh - h - 8);
  if (typeof p.right === 'number') p.right = Math.min(Math.max(0, p.right), maxRight);
  if (typeof p.bottom === 'number') p.bottom = Math.min(Math.max(0, p.bottom), maxBottom);
  return p;
}

let ballPos = clampPos(loadPos(LS_BALL, { right: 18, bottom: 18 }), 54, 54);
let panelPos = clampPos(loadPos(LS_PANEL, { right: 18, bottom: 76 }), 520, Math.round(window.innerHeight * 0.66));

function css() {
  if (document.getElementById('lite-agent-style')) return;
  const s = document.createElement('style');
  s.id = 'lite-agent-style';
  s.textContent = [
    '#lite-agent-ball { position: fixed; width: 46px; height: 46px; border-radius: 50%; background: rgba(13,20,30,0.85); border: 2px solid rgba(0,240,255,0.55); color: #00f0ff; font-size: 20px; line-height: 42px; text-align: center; cursor: pointer; z-index: 2147483647; user-select: none; touch-action: none; transform: translateZ(0); box-shadow: 0 0 12px rgba(0,240,255,0.25); }',
    '#lite-agent-panel { position: fixed; width: 520px; max-width: 94vw; height: 66vh; background: rgba(13,17,24,0.96); border: 1px solid rgba(0,240,255,0.35); border-radius: 10px; color: #c8d6e5; z-index: 2147483646; display: none; flex-direction: column; font-family: system-ui, sans-serif; transform: translateZ(0); box-shadow: 0 8px 30px rgba(0,0,0,0.6); }',
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

function makeDraggable(handle, target, pos, onSave) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('input, select, button, label, summary, .la-copy')) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startRight = pos.right, startBottom = pos.bottom;
    let dragged = false;
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged = true;
      if (dragged) {
        const maxRight = Math.max(0, window.innerWidth - target.offsetWidth - 8);
        const maxBottom = Math.max(0, window.innerHeight - target.offsetHeight - 8);
        pos.right = Math.min(Math.max(0, startRight - dx), maxRight);
        pos.bottom = Math.min(Math.max(0, startBottom - dy), maxBottom);
        target.style.right = pos.right + 'px';
        target.style.bottom = pos.bottom + 'px';
        target.style.left = 'auto';
        target.style.top = 'auto';
      }
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      if (dragged) onSave(pos);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}

function buildBall() {
  if (document.getElementById('lite-agent-ball')) return;
  if (window.innerWidth <= 768 && !localStorage.getItem(LS_BALL)) {
    ballPos = { right: 12, bottom: 12 };
  }
  const ball = h('div', { id: 'lite-agent-ball', title: 'st-lite-agent 面板', text: '⚡' });
  ball.style.right = ballPos.right + 'px';
  ball.style.bottom = ballPos.bottom + 'px';
  let down = false, moved = false, sx = 0, sy = 0, sr = 0, sb = 0;
  ball.addEventListener('pointerdown', (e) => {
    down = true; moved = false;
    sx = e.clientX; sy = e.clientY;
    sr = ballPos.right; sb = ballPos.bottom;
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
    if (moved) {
      const maxRight = Math.max(0, window.innerWidth - ball.offsetWidth - 8);
      const maxBottom = Math.max(0, window.innerHeight - ball.offsetHeight - 8);
      ballPos.right = Math.min(Math.max(0, sr - dx), maxRight);
      ballPos.bottom = Math.min(Math.max(0, sb - dy), maxBottom);
      ball.style.right = ballPos.right + 'px';
      ball.style.bottom = ballPos.bottom + 'px';
      ball.style.left = 'auto';
      ball.style.top = 'auto';
    }
  });
  window.addEventListener('pointerup', () => {
    if (down) {
      down = false;
      if (moved) localStorage.setItem(LS_BALL, JSON.stringify(ballPos));
    }
  });
  ball.addEventListener('click', () => {
    if (!moved) togglePanel();
    moved = false;
  });
  document.body.appendChild(ball);
}

function buildPanel() {
  if (document.getElementById('lite-agent-panel')) return;
  const baseInput = h('input', { type: 'text', id: 'lite-agent-base', value: base, style: 'width:150px' });
  baseInput.addEventListener('change', () => {
    base = baseInput.value.trim() || 'http://127.0.0.1:7890';
    localStorage.setItem(LS_BASE, base);
    reconnect();
  });
  const status = h('span', { id: 'lite-agent-status' });
  const clearBtn = h('button', { text: '清空', onclick: () => { if (bodyEl) bodyEl.innerHTML = ''; } });
  bodyEl = h('div', { id: 'lite-agent-body' });
  const head = h('div', { id: 'lite-agent-head' }, [
    h('span', { text: '⚡ st-lite-agent', style: 'color:#00f0ff;font-weight:bold' }),
    status, baseInput, clearBtn,
  ]);
  if (window.innerWidth <= 768) { panelPos.right = 0; panelPos.bottom = 0; }
  const panel = h('div', { id: 'lite-agent-panel' }, [head, bodyEl]);
  panel.style.right = panelPos.right + 'px';
  panel.style.bottom = panelPos.bottom + 'px';
  makeDraggable(head, panel, panelPos, (p) => localStorage.setItem(LS_PANEL, JSON.stringify(p)));
  document.body.appendChild(panel);
}

function togglePanel() {
  panelOpen = !panelOpen;
  const panel = document.getElementById('lite-agent-panel');
  if (panel) panel.classList.toggle('open', panelOpen);
}

marked.use({ gfm: true, breaks: true });
function mdRender(text) {
  return marked.parse(text || '', { gfm: true, breaks: true });
}

// 流式时按帧合并渲染:每个 chunk 只累加文本,下一帧统一重解析 markdown,
// 避免上千个小块每次都全量 marked.parse + innerHTML 导致页面卡顿。
const renderQueue = new Set();
let renderScheduled = false;
function flushRenderQueue() {
  renderScheduled = false;
  for (const el of renderQueue) {
    renderQueue.delete(el);
    el.innerHTML = mdRender(el._raw || '');
  }
}
function scheduleRender(el) {
  renderQueue.add(el);
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(flushRenderQueue);
  }
}

function renderGroups(stages) {
  if (!bodyEl) return;
  bodyEl.innerHTML = '';
  if (!stages || !stages.length) {
    bodyEl.appendChild(h('div', { class: 'la-dim', text: '暂无 llm 步骤' }));
    return;
  }
  stages.forEach((st) => {
    const reasonPre = h('pre', { class: 'la-pre', id: 'la-reason-' + st.id });
    reasonPre._raw = '';
    const det = h('details', { class: 'la-reason' });
    det.appendChild(h('summary', { text: '🧠 思维链 - ' + st.id }));
    det.appendChild(h('div', { class: 'la-reason-body' }, [reasonPre]));
    const outPre = h('pre', { class: 'la-pre', id: 'la-out-' + st.id });
    outPre._raw = '';
    const copyBtn = h('button', { class: 'la-copy', text: '复制', onclick: () => {
      if (outPre) navigator.clipboard && navigator.clipboard.writeText(outPre._raw || '');
    } });
    const outDet = h('details', { class: 'la-out', open: 'open' });
    outDet.appendChild(h('summary', { text: '🖥️ 正文 - ' + st.id }));
    outDet.appendChild(h('div', { class: 'la-card' }, [
      h('div', { class: 'la-card-head' }, [h('span', { text: '正文' }), copyBtn]),
      outPre,
    ]));
    bodyEl.appendChild(h('div', { class: 'la-group', id: 'la-group-' + st.id }, [
      h('div', { class: 'la-group-label', id: 'la-label-' + st.id, text: st.id }),
      det, outDet,
    ]));
  });
}

function appendText(stage, kind, text) {
  if (!text) return;
  const id = (kind === 'reasoning' ? 'la-reason-' : 'la-out-') + stage;
  const el = document.getElementById(id);
  if (el) {
    el._raw = (el._raw || '') + text;
    scheduleRender(el);
  }
}

function setStageStatus(stageId, status) {
  const label = document.getElementById('la-label-' + stageId);
  if (!label) return;
  const map = {
    running: { icon: '⏳', color: '#00f0ff' },
    done: { icon: '✅', color: '#2ecc71' },
    failed: { icon: '❌', color: '#e74c3c' },
  };
  const st = map[status];
  if (st) {
    label.textContent = st.icon + ' ' + stageId;
    label.style.color = st.color;
  }
}

function setStatus(ok) {
  const st = document.getElementById('lite-agent-status');
  if (st) st.className = ok ? 'ok' : 'err';
}

function connect() {
  if (es) es.close();
  es = new EventSource(base + '/agent/stream');
  es.onopen = () => setStatus(true);
  es.onerror = () => setStatus(false);
  es.addEventListener('reset', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      renderGroups(data.stages || []);
    } catch (e) {}
  });
  es.addEventListener('text', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      appendText(data.stage, data.kind, data.text);
    } catch (e) {}
  });
  es.addEventListener('stage', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      setStageStatus(data.stageId, data.status);
    } catch (e) {}
  });
}

function reconnect() { connect(); }

jQuery(async () => {
  if (document.getElementById('lite-agent-ball')) return;
  css();
  buildBall();
  buildPanel();
  connect();
  console.log('[' + MODULE + '] SSE 面板已就绪,接口基址 ' + base);

  window.addEventListener('resize', () => {
    const ball = document.getElementById('lite-agent-ball');
    const panel = document.getElementById('lite-agent-panel');
    if (ball) {
      clampPos(ballPos, ball.offsetWidth, ball.offsetHeight);
      ball.style.right = ballPos.right + 'px';
      ball.style.bottom = ballPos.bottom + 'px';
    }
    if (panel) {
      clampPos(panelPos, panel.offsetWidth, panel.offsetHeight);
      panel.style.right = panelPos.right + 'px';
      panel.style.bottom = panelPos.bottom + 'px';
    }
  });
});

