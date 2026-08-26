/**
 * 面板内容渲染:markdown 渲染队列 + 各 llm 段分组(思维链/正文)与状态图标。
 * 显示策略:
 *   - reset 只记录 llm 段清单(builtin 一律不展示)并显示"等待执行"占位;
 *   - 收到某段的 stage 事件才创建该段卡片(执行到哪段出现哪段);
 *   - 卡片初始只有标题行;思维链/正文哪个先有文本,哪个区块才出现;
 *   - 单卡可整体折叠(点标题行),折叠后只留标题;
 *   - 思维链/正文默认折叠,点开才看。
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

const RENDER_BASE = (typeof localStorage !== 'undefined' && localStorage.getItem('st-lite-agent-base')) || 'http://127.0.0.1:7890';

let lastStages = [];
let stageStatus = {};
const STATUS_ICONS = { running: '⏳', done: '✅', failed: '❌' };

function filterLlm(stages) {
  return (stages || []).filter((s) => s.type !== 'builtin');
}

function findStage(id) {
  return lastStages.find((s) => s.id === id);
}

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

// 单卡整体折叠:点标题行,只留标题;再点展开
function bindCollapse(head, group) {
  head.addEventListener('click', () => group.classList.toggle('closed'));
}

/** 同步渲染当前队列(进入设置拍快照前调用,避免快照里缺失待渲染文本)。 */
export function flushRenderNow() {
  if (renderScheduled) flushRenderQueue();
}

/** 设置返回(DOM 快照恢复)后重绑所有卡片的折叠监听。 */
export function rebindCollapse() {
  document.querySelectorAll('#lite-agent-body .la-group').forEach((group) => {
    const head = group.querySelector('.la-step-head');
    if (head && !head.__bound) {
      head.__bound = true;
      bindCollapse(head, group);
    }
  });
}

/** 设置模式(⚙️)下屏蔽 SSE 渲染,避免卡片写进设置表单。 */
function isSettingsMode() {
  const bodyEl = document.getElementById('lite-agent-body');
  return !!bodyEl && bodyEl.dataset.mode === 'settings';
}

function makeReasonSection(st) {
  const pre = h('pre', { class: 'la-pre', id: 'la-reason-' + st.id });
  pre._raw = '';
  const det = h('details', { class: 'la-reason' });
  det.appendChild(h('summary', { text: '思维链' }));
  det.appendChild(h('div', { class: 'la-reason-body' }, [pre]));
  return det;
}

/** json 段:正文默认显示 LLM 原始输出;点按钮懒加载后端渲染接口的 Markdown,来回切。 */
async function toggleJsonView(det, stageId) {
  const pre = det.querySelector('pre');
  const btn = det.querySelector('.la-md-toggle');
  if (!pre || !btn) return;
  const cur = btn.dataset.mode || 'json';
  if (cur === 'json') {
    btn.textContent = '…';
    try {
      if (pre.dataset.md == null) {
        const resp = await fetch(RENDER_BASE + '/agent/render-md', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: pre._raw || '' }),
        });
        const j = await resp.json();
        pre.dataset.md = j && j.md != null ? j.md : '';
      }
    } catch (e) {
      pre.dataset.md = '';
    }
    pre.innerHTML = mdRender(pre.dataset.md || '');
    btn.dataset.mode = 'md';
    btn.textContent = 'JSON';
  } else {
    pre.textContent = pre._raw || '';
    btn.dataset.mode = 'json';
    btn.textContent = 'MD';
  }
}

function makeOutSection(st, isWriter) {
  const isJson = st.output === 'json';
  const pre = h('pre', { class: 'la-pre', id: 'la-out-' + st.id });
  pre._raw = '';
  const copyBtn = h('button', { class: 'la-copy', text: '复制', onclick: () => {
    if (pre) navigator.clipboard && navigator.clipboard.writeText(pre._raw || '');
  } });
  const headKids = [h('span', { text: '正文' })];
  let mdBtn = null;
  if (isJson) {
    mdBtn = h('button', { class: 'la-md-toggle', text: 'MD', title: '切换 原始 JSON / 渲染 MD', onclick: () => {} });
    headKids.push(mdBtn);
  }
  headKids.push(copyBtn);
  const det = h('details', { class: isWriter ? 'la-out la-prose' : 'la-out' });
  det.appendChild(h('summary', { text: '正文' }));
  det.appendChild(h('div', { class: 'la-card' }, [
    h('div', { class: 'la-card-head' }, headKids),
    pre,
  ]));
  if (mdBtn) mdBtn.addEventListener('click', () => toggleJsonView(det, st.id));
  return det;
}

/** 懒创建某段的卡片(仅 llm 段);已存在则返回。卡片初始只有标题行。 */
function ensureStage(stageId) {
  const bodyEl = document.getElementById('lite-agent-body');
  if (!bodyEl) return null;
  let group = document.getElementById('la-group-' + stageId);
  if (group) return group;
  const st = findStage(stageId);
  if (!st) return null; // 不在 llm 清单内(含 builtin)不展示
  const placeholder = bodyEl.querySelector('.la-pending-placeholder');
  if (placeholder) placeholder.remove();

  const head = h('div', { class: 'la-step-head' }, [
    h('span', { class: 'la-step-dot', id: 'la-dot-' + st.id }),
    h('span', { class: 'la-step-title', id: 'la-label-' + st.id, text: st.id }),
  ]);
  group = h('div', { class: 'la-group', id: 'la-group-' + st.id }, [head]);
  bindCollapse(head, group);
  bodyEl.appendChild(group);
  if (stageStatus[st.id]) applyStatus(group, st.id, stageStatus[st.id]);
  return group;
}

/** reset:新请求到达,重置状态,只显示占位;每段卡片等 stage 事件再出现。 */
export function renderGroups(stages) {
  if (isSettingsMode()) return;
  const bodyEl = document.getElementById('lite-agent-body');
  if (!bodyEl) return;
  lastStages = filterLlm(stages);
  stageStatus = {};
  showPlaceholder(bodyEl, lastStages.length ? '等待 agent 执行…' : '暂无 llm 步骤');
}

/** 从设置模式返回:恢复当前已出现的卡片(保留状态缓存)。 */
export function restoreGroups() {
  if (isSettingsMode()) return;
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

/** 文本流入:对应区块(思维链/正文/原始JSON)不存在时懒创建,哪个有文本哪个出现。 */
export function appendText(stage, kind, text) {
  if (!text || isSettingsMode()) return;
  const group = ensureStage(stage);
  if (!group) return;
  const isReason = kind === 'reasoning';
  const secId = (isReason ? 'la-reason-' : 'la-out-') + stage;
  let el = document.getElementById(secId);
  let stJson = false;
  if (!el) {
    const st = findStage(stage) || { id: stage, type: 'llm' };
    stJson = st.output === 'json';
    const det = isReason ? makeReasonSection(st) : makeOutSection(st, st.id === 'writer');
    group.appendChild(det);
    el = det.querySelector('pre');
  } else {
    const st = findStage(stage) || { id: stage, type: 'llm' };
    stJson = st.output === 'json';
  }
  // 快照/设置返回恢复的元素没有 _raw,用当前渲染文本兜底,避免流式覆盖清空旧内容
  if (el._raw == null) el._raw = el.textContent || '';
  el._raw = (el._raw || '') + text;
  // json 段正文=LLM 原始输出直显(不做 markdown 加工);MD 视图由切换按钮懒加载
  if (stJson) el.textContent = el._raw;
  else scheduleRender(el);
}

export function setStageStatus(stageId, status) {
  if (isSettingsMode()) return;
  if (!findStage(stageId)) return; // 忽略清单外的段(如 builtin)
  stageStatus[stageId] = status;
  const group = ensureStage(stageId);
  if (group) applyStatus(group, stageId, status);
}
