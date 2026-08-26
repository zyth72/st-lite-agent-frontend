/**
 * 面板内容渲染:markdown 渲染队列 + 各 llm 段分组(思维链/正文)与状态图标。
 * 不持有外部状态;DOM 一律 getElementById 查找。记住最近一次段清单,供设置面板返回时恢复。
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

export function renderGroups(stages) {
  const bodyEl = document.getElementById('lite-agent-body');
  if (!bodyEl) return;
  lastStages = stages || [];
  bodyEl.innerHTML = '';
  if (!stages || !stages.length) {
    bodyEl.appendChild(h('div', { class: 'la-dim', text: '暂无 llm 步骤' }));
    return;
  }
  stages.forEach((st) => {
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
    const outDet = h('details', { class: isWriter ? 'la-out la-prose' : 'la-out', open: 'open' });
    outDet.appendChild(h('summary', { text: '正文' }));
    outDet.appendChild(h('div', { class: 'la-card' }, [
      h('div', { class: 'la-card-head' }, [h('span', { text: '正文' }), copyBtn]),
      outPre,
    ]));
    bodyEl.appendChild(h('div', { class: 'la-group', id: 'la-group-' + st.id }, [head, reasonDet, outDet]));
  });
}

/** 用最近一次段清单重渲染(从设置模式返回时用)。 */
export function restoreGroups() {
  renderGroups(lastStages);
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
  const label = document.getElementById('la-label-' + stageId);
  const dot = document.getElementById('la-dot-' + stageId);
  if (dot) dot.className = 'la-step-dot ' + status;
  if (label) {
    const icons = { running: '⏳', done: '✅', failed: '❌' };
    label.textContent = (icons[status] ? icons[status] + ' ' : '') + stageId;
    label.style.color = '';
  }
}
