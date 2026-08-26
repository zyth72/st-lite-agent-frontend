/**
 * 面板内容渲染:markdown 渲染队列 + 各 llm 段分组(思维链/正文)与状态图标。
 * 显示策略:reset 只记录段清单并显示"等待执行"占位;收到某段的 stage 事件
 * 才创建该段卡片(未执行的一开始隐藏,执行到哪段出现哪段);正文默认折叠。
 * 不持有外部状态(除段清单/状态缓存);DOM 一律 getElementById 查找。
 */
import { marked } from './marked.esm.js';
import { h } from './dom.js';

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

let lastStages = [];
let stageStatus = {};
const STATUS_ICONS = { running: '⏳', done: '✅', failed: '❌' };

function applyStatus(group, stageId, status) {
  const dot = group.querySelector('#la-dot-' + stageId);
  const label = group.querySelector('#la-label-' + stageId);
  if (dot) dot.className = 'la-step-dot ' + status;
  if (label) label.textContent = (STATUS_ICONS[status] ? STATUS_ICONS[status] + ' ' : '') + stageId;
}

function showPlaceholder(bodyEl, text) {
  bodyEl.innerHTML = '';
  bodyEl.appendChild(h('div', { class: 'la-dim la-pending-placeholder', text: text }));
}

/** 懒创建某段的卡片;已存在则直接返回。卡片创建后按缓存状态补上色彩。 */
function ensureStage(stageId) {
  const bodyEl = document.getElementById('lite-agent-body');
  if (!bodyEl) return null;
  let group = document.getElementById('la-group-' + stageId);
  if (group) return group;
  const st = lastStages.find((s) => s.id === stageId) || { id: stageId, type: 'llm' };
  const placeholder = bodyEl.querySelector('.la-pending-placeholder');
  if (placeholder) placeholder.remove();

  const isWriter = st.id === 'writer';
  const head = h('div', { class: 'la-step-head' }, [
    h('span', { class: 'la-step-dot', id: 'la-dot-' + st.id }),
    h('span', { class: 'la-step-title', id: 'la-label-' + st.id, text: st.id }),
  ]);
  const reasonPre = h('pre', { class: 'la-pre', id: 'la-reason-' + st.id });
  reasonPre._raw = '';
  const reasonDet = h('details', { class: 'la-reason' });
  reasonDet.appendChild(h('summary', { text: '思维链' }));
  reasonDet.appendChild(h('div', { class: 'la-reason-body' }, [reasonPre]));
  const outPre = h('pre', { class: 'la-pre', id: 'la-out-' + st.id });
  outPre._raw = '';
  const copyBtn = h('button', { class: 'la-copy', text: '复制', onclick: () => {
    if (outPre) navigator.clipboard && navigator.clipboard.writeText(outPre._raw || '');
  } });
  // 正文默认折叠(用户要求:避免一开始全部铺开)
  const outDet = h('details', { class: isWriter ? 'la-out la-prose' : 'la-out' });
  outDet.appendChild(h('summary', { text: '正文' }));
  outDet.appendChild(h('div', { class: 'la-card' }, [
    h('div', { class: 'la-card-head' }, [h('span', { text: '正文' }), copyBtn]),
    outPre,
  ]));
  group = h('div', { class: 'la-group', id: 'la-group-' + st.id }, [head, reasonDet, outDet]);
  bodyEl.appendChild(group);
  if (stageStatus[st.id]) applyStatus(group, st.id, stageStatus[st.id]);
  return group;
}

/** reset:新请求到达,重置状态,只显示占位;每段卡片等 stage 事件再出现。 */
export function renderGroups(stages) {
  const bodyEl = document.getElementById('lite-agent-body');
  if (!bodyEl) return;
  lastStages = stages || [];
  stageStatus = {};
  showPlaceholder(bodyEl, lastStages.length ? '等待 agent 执行…' : '暂无 llm 步骤');
}

/** 从设置模式返回:恢复当前已出现的卡片(保留状态缓存)。 */
export function restoreGroups() {
  const bodyEl = document.getElementById('lite-agent-body');
  if (!bodyEl) return;
  const visible = Object.keys(stageStatus);
  if (!visible.length) {
    showPlaceholder(bodyEl, lastStages.length ? '等待 agent 执行…' : '暂无 llm 步骤');
    return;
  }
  bodyEl.innerHTML = '';
  visible.forEach((id) => ensureStage(id));
}

export function appendText(stage, kind, text) {
  if (!text) return;
  const id = (kind === 'reasoning' ? 'la-reason-' : 'la-out-') + stage;
  const el = document.getElementById(id);
  if (el) {
    el._raw = (el._raw || '') + text;
    scheduleRender(el);
  }
}

export function setStageStatus(stageId, status) {
  stageStatus[stageId] = status;
  const group = ensureStage(stageId);
  if (group) applyStatus(group, stageId, status);
}
