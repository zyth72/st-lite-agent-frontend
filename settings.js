/**
 * ⚙️ 设置面板:读/写服务端 /agent/config(agent 段 / 上游 / 密钥)。
 * 进入设置模式替换面板内容,返回时恢复最近一次 llm 段分组。
 */
import { h } from './dom.js';
import { restoreGroups, rebindCollapse, flushRenderNow } from './render.js';

let settingsMode = false;
let cfgData = null;
let currentBase = '';
let savedBodyHTML = '';

export function toggleSettings(base) {
  currentBase = base;
  settingsMode = !settingsMode;
  if (settingsMode) {
    const bodyEl = document.getElementById('lite-agent-body');
    flushRenderNow();
    savedBodyHTML = bodyEl ? bodyEl.innerHTML : '';
    if (bodyEl) bodyEl.dataset.mode = 'settings';
    loadSettings(base);
  } else {
    const bodyEl = document.getElementById('lite-agent-body');
    if (bodyEl) bodyEl.removeAttribute('data-mode');
    if (bodyEl && savedBodyHTML) {
      bodyEl.innerHTML = savedBodyHTML;
      rebindCollapse();
    } else {
      restoreGroups();
    }
  }
}

async function loadSettings(base) {
  const bodyEl = document.getElementById('lite-agent-body');
  try {
    const resp = await fetch(base + '/agent/config');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    cfgData = await resp.json();
  } catch (e) {
    if (bodyEl) {
      bodyEl.innerHTML = '';
      bodyEl.appendChild(h('div', { class: 'la-dim', text: '读取配置失败: ' + e.message }));
    }
    return;
  }
  renderSettings();
}

function sRow(label, node) {
  return h('div', { class: 'la-set-row' }, [
    h('span', { class: 'la-set-label', text: label }), node,
  ]);
}

function toggleItem(id, label, checked) {
  return h('label', { class: 'la-set-toggle-item' }, [
    h('input', { type: 'checkbox', id: id, checked: checked ? 'checked' : null }),
    h('span', { text: label }),
  ]);
}

/** 内嵌模型管理:每行一个模型,可加/删,直接维护 cfgData.providers[i].models。 */
function fillModelRows(box, i) {
  const p = (cfgData.providers || [])[i];
  if (!p) return;
  box.innerHTML = '';
  const rows = (p.models || []).map((m, j) => h('div', { class: 'la-model-row' }, [
    h('span', { class: 'la-model-name', text: m }),
    h('button', { class: 'la-model-del', text: '删', title: '删除该模型', onclick: () => {
      p.models.splice(j, 1);
      fillModelRows(box, i);
    } }),
  ]));
  const addInput = h('input', { type: 'text', placeholder: '模型名,如 deepseek-v4-pro', class: 'la-set-input' });
  const addBtn = h('button', { class: 'la-model-add', text: '添加', onclick: () => {
    const v = addInput.value.trim();
    if (v && !(p.models || []).includes(v)) {
      p.models = p.models || [];
      p.models.push(v);
      addInput.value = '';
      fillModelRows(box, i);
    }
  } });
  const summary = box.closest('details') && box.closest('details').querySelector('.la-models-summary');
  if (summary) summary.textContent = '模型管理(' + (p.models || []).length + ')';
  if (rows.length) rows.forEach((r) => box.appendChild(r));
  else box.appendChild(h('div', { class: 'la-set-empty', text: '(暂无模型,留空 = 自动发现)' }));
  box.appendChild(h('div', { class: 'la-model-add-row' }, [addInput, addBtn]));
}

/** 段配置模型下拉:候选 = 各上游 provider/model;当前值不在候选则保留为一项。 */
function modelSelect(st, i, providers) {
  const all = [];
  (providers || []).forEach((p) => (p.models || []).forEach((m) => all.push(p.name + '/' + m)));
  if (st.model && !all.includes(st.model)) all.unshift(st.model);
  const sel = h('select', { id: 'cfg-model-' + i, class: 'la-set-input' });
  sel.appendChild(h('option', { value: '', text: '(继承外层)', selected: !st.model ? 'selected' : null }));
  all.forEach((x) => sel.appendChild(h('option', { value: x, text: x, selected: st.model === x ? 'selected' : null })));
  return sel;
}

function group(title, hint, rows) {
  const rowsArr = rows.length ? rows : [h('div', { class: 'la-set-empty', text: '(无)' })];
  return h('div', { class: 'la-set-group' }, [
    h('div', { class: 'la-set-group-title', text: title }),
    hint ? h('div', { class: 'la-set-hint', text: hint }) : null,
    ...rowsArr,
  ]);
}

function renderSettings() {
  const bodyEl = document.getElementById('lite-agent-body');
  if (!bodyEl) return;
  bodyEl.innerHTML = '';
  const d = cfgData || { stages: [], providers: [], keys: [] };
  const L = [];

  const keyRows = (d.keys || []).map((k, i) =>
    sRow(k.name, h('input', { type: 'password', id: 'cfg-key-' + i, placeholder: '···' + k.hint, class: 'la-set-input' })));
  L.push(group('上游密钥', 'key 留空 = 删除该行', keyRows));

  // 上游卡片:baseurl + 内嵌模型管理(每行一个模型,可加/删)
  const provCards = [];
  (d.providers || []).forEach((p, i) => {
    const box = h('div', { class: 'la-model-list' });
    fillModelRows(box, i);
    provCards.push(h('div', { class: 'la-provider' }, [
      h('div', { class: 'la-set-row' }, [
        h('span', { class: 'la-set-label', text: p.name }),
        h('input', { type: 'text', id: 'cfg-purl-' + i, value: p.baseurl, class: 'la-set-input', title: 'baseurl' }),
      ]),
      h('details', { class: 'la-models' }, [
        h('summary', { class: 'la-models-summary', text: '模型管理(' + (p.models || []).length + ')' }),
        box,
      ]),
    ]));
  });
  L.push(group('上游', 'baseurl 与模型列表(每行一个,空 = 自动发现)', provCards));

  const stageRows = [];
  (d.stages || []).forEach((st, i) => {
    if (st.type !== 'llm') return;
    stageRows.push(h('div', { class: 'la-set-stage' }, [
      h('span', { class: 'la-set-stage-name', text: st.id }),
      modelSelect(st, i, d.providers),
    ]));
    stageRows.push(h('div', { class: 'la-set-toggle' }, [
      toggleItem('cfg-think-' + i, 'thinking', st.thinking === 'enabled'),
      toggleItem('cfg-stream-' + i, 'stream', !!st.stream),
      h('label', { class: 'la-set-toggle-item' }, [
        h('span', { text: 'max' }),
        h('input', { type: 'number', id: 'cfg-max-' + i, value: st.max_tokens || '', class: 'la-set-max' }),
      ]),
    ]));
  });
  L.push(group('agent 段配置', '模型 / thinking / 流式 / max_tokens', stageRows));

  const saveBtn = h('button', { text: '保存', onclick: () => saveSettings(currentBase) });
  const backBtn = h('button', { text: '返回', class: 'la-btn-tonal', onclick: () => toggleSettings(currentBase) });
  L.push(h('div', { class: 'la-set-actions' }, [saveBtn, backBtn]));

  bodyEl.appendChild(h('div', { class: 'la-settings' }, L));
}

async function saveSettings(base) {
  currentBase = base;
  const bodyEl = document.getElementById('lite-agent-body');
  try {
    const stages = (cfgData.stages || []).map((st, i) => ({
      id: st.id,
      model: document.getElementById('cfg-model-' + i) ? document.getElementById('cfg-model-' + i).value : st.model,
      thinking: document.getElementById('cfg-think-' + i) && document.getElementById('cfg-think-' + i).checked ? 'enabled' : 'disabled',
      stream: document.getElementById('cfg-stream-' + i) ? !!document.getElementById('cfg-stream-' + i).checked : st.stream,
      max_tokens: document.getElementById('cfg-max-' + i) ? Number(document.getElementById('cfg-max-' + i).value) || null : st.max_tokens,
    }));
    const providers = (cfgData.providers || []).map((p, i) => ({
      name: p.name,
      baseurl: document.getElementById('cfg-purl-' + i) ? document.getElementById('cfg-purl-' + i).value : p.baseurl,
      models: (p.models || []),
    }));
    const keys = (cfgData.keys || []).map((k, i) => ({
      name: k.name,
      key: document.getElementById('cfg-key-' + i) ? document.getElementById('cfg-key-' + i).value : '',
    }));
    const resp = await fetch(base + '/agent/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages, providers, keys }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    settingsMode = false;
    await loadSettings(base);
    const tip = h('div', { class: 'la-dim', text: '已保存并热生效(上游/段配置即读即用)' });
    if (bodyEl) bodyEl.insertBefore(tip, bodyEl.firstChild);
  } catch (e) {
    const tip = h('div', { class: 'la-dim', text: '保存失败: ' + e.message });
    if (bodyEl) bodyEl.insertBefore(tip, bodyEl.firstChild);
  }
}
